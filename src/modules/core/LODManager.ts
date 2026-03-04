/**
 * 动态 LOD（细节层次）管理器
 * 
 * 根据摄像机距离动态调整粒子数量和渲染质量。
 * 
 * @module core/LODManager
 */

import * as THREE from 'three'

/**
 * LOD 等级配置接口
 * 
 * @interface LODLevel
 */
export interface LODLevel {
  /** LOD 等级索引 */
  level: number
  /** 最大距离 */
  maxDistance: number
  /** 粒子数量 */
  particleCount: number
  /** 更新频率（每 N 帧更新一次） */
  updateFrequency: number
  /** 点大小缩放 */
  sizeScale: number
}

/**
 * LOD 管理器配置接口
 * 
 * @interface LODManagerConfig
 */
export interface LODManagerConfig {
  /** 最大粒子数量 */
  maxParticleCount: number
  /** 摄像机位置更新阈值 */
  cameraThreshold?: number
  /** 是否启用平滑过渡 */
  enableTransition?: boolean
  /** 过渡持续时间（帧数） */
  transitionDuration?: number
}

/**
 * 动态 LOD 管理器类
 * 
 * 根据摄像机距离自动调整粒子数量和渲染质量，
 * 以提高性能并保持视觉质量。
 * 
 * 主要功能：
 * - 计算摄像机到粒子系统的平均距离
 * - 根据距离选择合适的 LOD 等级
 * - 动态调整渲染粒子数量
 * - 实现平滑过渡（可选）
 * - 提供性能统计数据
 * 
 * @class LODManager
 */
export class LODManager {
  /** 最大粒子数量 */
  private maxParticleCount: number
  /** 摄像机位置更新阈值 */
  private cameraThreshold: number
  /** 是否启用平滑过渡 */
  private enableTransition: boolean
  /** 过渡持续时间（帧数） */
  private transitionDuration: number
  
  /** 当前 LOD 等级 */
  private currentLOD: number = 0
  /** 目标 LOD 等级 */
  private targetLOD: number = 0
  /** 当前渲染粒子数量 */
  private currentParticleCount: number
  /** 目标粒子数量 */
  private targetParticleCount: number
  /** 过渡进度（0-1） */
  private transitionProgress: number = 0
  /** 摄像机位置 */
  private cameraPosition: THREE.Vector3
  /** 上一帧摄像机位置 */
  private lastCameraPosition: THREE.Vector3
  /** 帧计数器 */
  private frameCounter: number = 0
  /** 标记是否已释放资源 */
  private disposed: boolean = false

  /** LOD 等级配置 */
  private lodLevels: LODLevel[]

  /**
   * 构造函数，初始化 LOD 管理器
   * 
   * @param config - LOD 管理器配置参数
   * 
   * @example
   * ```typescript
   * const lodManager = new LODManager({
   *   maxParticleCount: 100000,
   *   cameraThreshold: 5.0,
   *   enableTransition: true,
   *   transitionDuration: 30
   * });
   * ```
   */
  constructor(config: LODManagerConfig) {
    this.maxParticleCount = config.maxParticleCount
    this.cameraThreshold = config.cameraThreshold || 5.0
    this.enableTransition = config.enableTransition !== undefined ? config.enableTransition : true
    this.transitionDuration = config.transitionDuration || 30

    this.currentParticleCount = this.maxParticleCount
    this.targetParticleCount = this.maxParticleCount

    this.cameraPosition = new THREE.Vector3()
    this.lastCameraPosition = new THREE.Vector3()

    // 初始化 LOD 等级
    this.initLODLevels()
    
    console.log('✓ LOD 管理器已初始化')
  }

  /**
   * 初始化 LOD 等级配置
   * 
   * @private
   */
  private initLODLevels(): void {
    const baseCount = this.maxParticleCount

    this.lodLevels = [
      // LOD 0: 最高质量，最近距离
      {
        level: 0,
        maxDistance: 50,
        particleCount: baseCount,
        updateFrequency: 1,
        sizeScale: 1.0
      },
      // LOD 1: 高质量
      {
        level: 1,
        maxDistance: 100,
        particleCount: Math.floor(baseCount * 0.7),
        updateFrequency: 1,
        sizeScale: 1.0
      },
      // LOD 2: 中等质量
      {
        level: 2,
        maxDistance: 200,
        particleCount: Math.floor(baseCount * 0.4),
        updateFrequency: 2,
        sizeScale: 0.8
      },
      // LOD 3: 低质量，远距离
      {
        level: 3,
        maxDistance: 500,
        particleCount: Math.floor(baseCount * 0.2),
        updateFrequency: 3,
        sizeScale: 0.6
      },
      // LOD 4: 最低质量，极远距离
      {
        level: 4,
        maxDistance: Infinity,
        particleCount: Math.floor(baseCount * 0.1),
        updateFrequency: 4,
        sizeScale: 0.5
      }
    ]
  }

  /**
   * 更新 LOD 状态
   * 
   * @param cameraPosition - 摄像机位置
   * @param boundsRadius - 粒子系统边界半径
   * @returns 当前渲染粒子数量
   */
  update(cameraPosition: THREE.Vector3, boundsRadius: number): number {
    if (this.disposed) {
      return this.currentParticleCount
    }

    // 总是更新上一帧位置
    this.lastCameraPosition.copy(cameraPosition)

    // 检查摄像机是否移动超过阈值
    const distanceMoved = cameraPosition.distanceTo(this.lastCameraPosition)
    if (distanceMoved < this.cameraThreshold) {
      // 摄像机未移动，继续当前过渡
      this.updateTransition()
      return this.currentParticleCount
    }

    // 计算平均距离
    const averageDistance = this.calculateAverageDistance(cameraPosition, boundsRadius)

    // 确定目标 LOD 等级
    this.targetLOD = this.determineLODLevel(averageDistance)
    this.targetParticleCount = this.lodLevels[this.targetLOD].particleCount

    // 检查是否需要切换 LOD
    if (this.targetLOD !== this.currentLOD) {
      this.startTransition()
    }

    // 更新过渡
    this.updateTransition()

    // 增加帧计数器
    this.frameCounter++

    return this.currentParticleCount
  }

  /**
   * 计算平均距离
   * 
   * 假设粒子均匀分布在球体内，计算摄像机到球心的距离。
   * 
   * @param cameraPosition - 摄像机位置
   * @param boundsRadius - 粒子系统边界半径
   * @returns 平均距离
   * @private
   */
  private calculateAverageDistance(cameraPosition: THREE.Vector3, boundsRadius: number): number {
    // 计算摄像机到原点（球心）的距离
    const distanceToCenter = cameraPosition.length()

    // 考虑粒子分布，平均距离大约是到球心的距离
    return distanceToCenter
  }

  /**
   * 确定 LOD 等级
   * 
   * @param distance - 摄像机距离
   * @returns LOD 等级索引
   * @private
   */
  private determineLODLevel(distance: number): number {
    for (let i = 0; i < this.lodLevels.length; i++) {
      if (distance < this.lodLevels[i].maxDistance) {
        return i
      }
    }
    return this.lodLevels.length - 1
  }

  /**
   * 开始 LOD 过渡
   * 
   * @private
   */
  private startTransition(): void {
    if (!this.enableTransition) {
      // 立即切换
      this.currentLOD = this.targetLOD
      this.currentParticleCount = this.targetParticleCount
      return
    }

    // 开始平滑过渡
    this.transitionProgress = 0
    console.log(`LOD 切换: ${this.currentLOD} → ${this.targetLOD}`)
  }

  /**
   * 更新过渡状态
   * 
   * @private
   */
  private updateTransition(): void {
    if (!this.enableTransition || this.currentLOD === this.targetLOD) {
      return
    }

    // 增加过渡进度
    this.transitionProgress += 1 / this.transitionDuration

    // 使用缓动函数（ease-out）
    const easedProgress = 1 - Math.pow(1 - this.transitionProgress, 3)

    // 插值计算当前粒子数量
    const startCount = this.lodLevels[this.currentLOD].particleCount
    const endCount = this.targetParticleCount
    this.currentParticleCount = Math.floor(
      startCount + (endCount - startCount) * easedProgress
    )

    // 检查过渡是否完成
    if (this.transitionProgress >= 1.0) {
      this.currentLOD = this.targetLOD
      this.currentParticleCount = this.targetParticleCount
      this.transitionProgress = 0
    }
  }

  /**
   * 获取当前 LOD 等级
   * 
   * @returns 当前 LOD 等级索引
   */
  getCurrentLOD(): number {
    return this.currentLOD
  }

  /**
   * 获取当前渲染粒子数量
   * 
   * @returns 当前粒子数量
   */
  getCurrentParticleCount(): number {
    return this.currentParticleCount
  }

  /**
   * 获取 LOD 等级配置
   * 
   * @param level - LOD 等级索引
   * @returns LOD 等级配置
   */
  getLODLevel(level: number): LODLevel | undefined {
    return this.lodLevels[level]
  }

  /**
   * 获取所有 LOD 等级配置
   * 
   * @returns LOD 等级配置数组
   */
  getAllLODLevels(): LODLevel[] {
    return [...this.lodLevels]
  }

  /**
   * 获取是否应该更新粒子
   * 
   * 根据当前 LOD 等级决定是否更新粒子。
   * 
   * @returns 是否应该更新
   */
  shouldUpdateParticles(): boolean {
    if (this.currentLOD >= this.lodLevels.length) {
      return false
    }
    const frequency = this.lodLevels[this.currentLOD].updateFrequency
    return this.frameCounter % frequency === 0
  }

  /**
   * 获取点大小缩放因子
   * 
   * @returns 点大小缩放因子
   */
  getSizeScale(): number {
    if (this.currentLOD >= this.lodLevels.length) {
      return 1.0
    }
    return this.lodLevels[this.currentLOD].sizeScale
  }

  /**
   * 获取性能统计信息
   * 
   * @returns 性能统计对象
   */
  getStats(): {
    currentLOD: number
    currentParticleCount: number
    targetLOD: number
    targetParticleCount: number
    transitionProgress: number
    efficiency: number
  } {
    const efficiency = (this.currentParticleCount / this.maxParticleCount) * 100

    return {
      currentLOD: this.currentLOD,
      currentParticleCount: this.currentParticleCount,
      targetLOD: this.targetLOD,
      targetParticleCount: this.targetParticleCount,
      transitionProgress: this.transitionProgress,
      efficiency
    }
  }

  /**
   * 强制设置 LOD 等级
   * 
   * @param level - LOD 等级索引
   */
  forceLOD(level: number): void {
    if (level < 0 || level >= this.lodLevels.length) {
      console.warn(`无效的 LOD 等级: ${level}`)
      return
    }

    this.targetLOD = level
    this.targetParticleCount = this.lodLevels[level].particleCount

    if (!this.enableTransition) {
      this.currentLOD = level
      this.currentParticleCount = this.targetParticleCount
    } else {
      this.startTransition()
    }

    console.log(`强制设置 LOD: ${level}`)
  }

  /**
   * 释放 LOD 管理器资源
   * 
   * 清理所有资源，防止内存泄漏。
   * 重复调用此方法是安全的。
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    console.log('✓ LOD 管理器资源已释放')
  }
}