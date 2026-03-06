/**
 * 粒子轨迹管理器
 *
 * 为粒子系统创建优雅的轨迹效果。
 * 轨迹会跟随粒子运动，产生流动的视觉体验。
 *
 * 设计理念：
 * - 简单：使用历史位置存储和 LineSegments 绘制
 * - 优雅：透明度渐变和颜色一致性
 * - 高效：只为部分粒子绘制轨迹，性能可控
 *
 * @module particles/TrailManager
 */

import * as THREE from 'three'

/**
 * 轨迹配置接口
 *
 * @interface TrailConfig
 */
export interface TrailConfig {
  /** 轨迹长度（历史位置数量） */
  length: number
  /** 轨迹透明度 */
  opacity: number
  /** 轨迹粒子比例（0-1，表示有多少百分比的粒子显示轨迹） */
  particleRatio: number
  /** 轨迹宽度 */
  width: number
  /** 轨迹颜色衰减因子（0-1，越小衰减越快） */
  colorDecay: number
}

/**
 * 默认轨迹配置
 */
export const DefaultTrailConfig: TrailConfig = {
  length: 6,           // 每个粒子存储 6 个历史位置
  opacity: 0.3,        // 轨迹透明度 30%
  particleRatio: 0.25, // 25% 的粒子显示轨迹（约 7500 条）
  width: 0.8,          // 轨迹宽度
  colorDecay: 0.85     // 颜色衰减因子
}

/**
 * 轨迹管理器类
 *
 * 管理粒子轨迹的创建、更新和渲染。
 *
 * @class TrailManager
 */
export class TrailManager {
  /** 轨迹线段对象 */
  public trailLines: THREE.LineSegments
  /** 历史位置数组 [particleCount * historyLength * 3] */
  private historyPositions: Float32Array
  /** 历史位置索引数组 [particleCount] */
  private historyIndices: Uint8Array
  /** 轨迹顶点位置数组 */
  private trailPositions: Float32Array
  /** 轨迹颜色数组 */
  private trailColors: Float32Array
  /** 轨迹配置 */
  private config: TrailConfig
  /** 粒子总数 */
  private particleCount: number
  /** 轨迹粒子数量 */
  private trailParticleCount: number
  /** 标记是否已释放资源 */
  private disposed: boolean = false

  /**
   * 构造函数，初始化轨迹管理器
   *
   * @param scene - Three.js 场景对象
   * @param particleCount - 粒子总数
   * @param config - 轨迹配置
   *
   * @example
   * ```typescript
   * const trailManager = new TrailManager(scene, 30000, DefaultTrailConfig);
   * ```
   */
  constructor(
    scene: THREE.Scene,
    particleCount: number,
    config: TrailConfig = DefaultTrailConfig
  ) {
    this.particleCount = particleCount
    this.config = { ...config }
    this.trailParticleCount = Math.floor(particleCount * config.particleRatio)

    // 初始化历史位置数组
    this.historyPositions = new Float32Array(this.trailParticleCount * config.length * 3)
    this.historyIndices = new Uint8Array(this.trailParticleCount)

    // 初始化轨迹顶点数组（每段 2 个顶点）
    const segmentsPerParticle = config.length - 1
    const segmentCount = this.trailParticleCount * segmentsPerParticle
    this.trailPositions = new Float32Array(segmentCount * 2 * 3)
    this.trailColors = new Float32Array(segmentCount * 2 * 3)

    // 创建轨迹几何体
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3))

    // 创建轨迹材质
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    // 创建轨迹线段对象
    this.trailLines = new THREE.LineSegments(geometry, material)
    this.trailLines.frustumCulled = false  // 禁用视锥体剔除，确保轨迹始终渲染

    // 添加到场景
    scene.add(this.trailLines)

    console.log(`TrailManager initialized: ${this.trailParticleCount} trails, ${segmentCount} segments`)
  }

  /**
   * 更新轨迹
   *
   * 根据当前粒子位置更新轨迹历史位置和渲染数据。
   *
   * @param currentPositions - 当前粒子位置数组
   * @param currentColors - 当前粒子颜色数组
   */
  update(currentPositions: Float32Array, currentColors: Float32Array): void {
    if (this.disposed) {
      return
    }

    try {
      const { length, colorDecay } = this.config
      const historyPositions = this.historyPositions
      const historyIndices = this.historyIndices
      const trailPositions = this.trailPositions
      const trailColors = this.trailColors

      // 更新每个轨迹粒子的历史位置
      for (let i = 0; i < this.trailParticleCount; i++) {
        // 获取粒子索引（均匀分布在所有粒子中）
        const particleIndex = Math.floor((i / this.trailParticleCount) * this.particleCount)
        const i3 = particleIndex * 3

        // 获取当前历史索引
        const historyIndex = historyIndices[i]

        // 存储当前历史位置
        const historyOffset = (i * length + historyIndex) * 3
        historyPositions[historyOffset] = currentPositions[i3]
        historyPositions[historyOffset + 1] = currentPositions[i3 + 1]
        historyPositions[historyOffset + 2] = currentPositions[i3 + 2]

        // 更新历史索引（环形缓冲区）
        historyIndices[i] = (historyIndex + 1) % length

        // 构建轨迹线段
        this.buildTrailSegments(
          i,
          currentColors[i3],
          currentColors[i3 + 1],
          currentColors[i3 + 2],
          historyPositions,
          trailPositions,
          trailColors,
          historyIndex,
          length,
          colorDecay
        )
      }

      // 标记属性需要更新
      this.trailLines.geometry.attributes.position.needsUpdate = true
      this.trailLines.geometry.attributes.color.needsUpdate = true
    } catch (error) {
      console.error('更新轨迹时发生错误:', error)
    }
  }

  /**
   * 构建轨迹线段
   *
   * 根据历史位置构建轨迹线段，并应用颜色衰减。
   *
   * @private
   */
  private buildTrailSegments(
    particleIndex: number,
    r: number,
    g: number,
    b: number,
    historyPositions: Float32Array,
    trailPositions: Float32Array,
    trailColors: Float32Array,
    currentHistoryIndex: number,
    length: number,
    colorDecay: number
  ): void {
    const segmentsPerParticle = length - 1
    let segmentOffset = particleIndex * segmentsPerParticle * 6  // 每段 2 个顶点，每个顶点 3 个坐标

    // 构建从旧到新的线段
    for (let s = 0; s < segmentsPerParticle; s++) {
      // 计算历史索引（从最老到最新）
      const age = (segmentsPerParticle - s) / segmentsPerParticle  // 0 (最新) 到 1 (最老)
      const historyIndex = (currentHistoryIndex - s + length) % length

      // 获取历史位置
      const historyOffset = (particleIndex * length + historyIndex) * 3
      const x = historyPositions[historyOffset]
      const y = historyPositions[historyOffset + 1]
      const z = historyPositions[historyOffset + 2]

      // 获取下一个历史位置
      const nextHistoryIndex = (currentHistoryIndex - s - 1 + length) % length
      const nextHistoryOffset = (particleIndex * length + nextHistoryIndex) * 3
      const nextX = historyPositions[nextHistoryOffset]
      const nextY = historyPositions[nextHistoryOffset + 1]
      const nextZ = historyPositions[nextHistoryOffset + 2]

      // 检查是否有效（避免重复点）
      if (x === nextX && y === nextY && z === nextZ) {
        // 使用当前值作为占位
        trailPositions[segmentOffset] = x
        trailPositions[segmentOffset + 1] = y
        trailPositions[segmentOffset + 2] = z
        trailPositions[segmentOffset + 3] = nextX
        trailPositions[segmentOffset + 4] = nextY
        trailPositions[segmentOffset + 5] = nextZ

        // 设置透明度为 0（不显示）
        trailColors[segmentOffset] = 0
        trailColors[segmentOffset + 1] = 0
        trailColors[segmentOffset + 2] = 0
        trailColors[segmentOffset + 3] = 0
        trailColors[segmentOffset + 4] = 0
        trailColors[segmentOffset + 5] = 0
      } else {
        // 设置顶点位置
        trailPositions[segmentOffset] = x
        trailPositions[segmentOffset + 1] = y
        trailPositions[segmentOffset + 2] = z
        trailPositions[segmentOffset + 3] = nextX
        trailPositions[segmentOffset + 4] = nextY
        trailPositions[segmentOffset + 5] = nextZ

        // 计算颜色衰减（越老的线段越透明）
        const opacity = Math.pow(colorDecay, age)
        trailColors[segmentOffset] = r * opacity
        trailColors[segmentOffset + 1] = g * opacity
        trailColors[segmentOffset + 2] = b * opacity
        trailColors[segmentOffset + 3] = r * opacity
        trailColors[segmentOffset + 4] = g * opacity
        trailColors[segmentOffset + 5] = b * opacity
      }

      segmentOffset += 6
    }
  }

  /**
   * 设置轨迹透明度
   *
   * @param opacity - 透明度 [0, 1]
   */
  setOpacity(opacity: number): void {
    this.config.opacity = Math.max(0, Math.min(1, opacity))
    if (this.trailLines.material instanceof THREE.LineBasicMaterial) {
      this.trailLines.material.opacity = this.config.opacity
    }
  }

  /**
   * 获取当前配置
   *
   * @returns 当前轨迹配置
   */
  getConfig(): TrailConfig {
    return { ...this.config }
  }

  /**
   * 释放轨迹管理器资源
   *
   * @param scene - Three.js 场景对象
   */
  dispose(scene: THREE.Scene): void {
    if (this.disposed) {
      return
    }

    try {
      scene.remove(this.trailLines)
      this.trailLines.geometry.dispose()
      this.trailLines.material.dispose()

      // 释放数组内存
      if (this.historyPositions) {
        this.historyPositions.fill(0)
        this.historyPositions = null as any
      }
      if (this.historyIndices) {
        this.historyIndices.fill(0)
        this.historyIndices = null as any
      }
      if (this.trailPositions) {
        this.trailPositions.fill(0)
        this.trailPositions = null as any
      }
      if (this.trailColors) {
        this.trailColors.fill(0)
        this.trailColors = null as any
      }

      this.disposed = true
    } catch (error) {
      console.error('释放轨迹管理器资源失败:', error)
    }
  }
}