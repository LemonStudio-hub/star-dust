/**
 * 优雅的粒子轨迹管理器
 *
 * 创建真实、动态、优雅的粒子轨迹效果。
 *
 * 设计理念：
 * - 真实路径：轨迹是粒子实际走过的路径
 * - 动态长度：根据粒子速度动态调整轨迹长度
 * - 半透明渐变：从头部到尾部透明度逐渐降低
 * - 逐渐消失：轨迹会随着时间逐渐消失
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
  /** 轨迹粒子比例（0-1，表示有多少百分比的粒子显示轨迹） */
  particleRatio: number
  /** 最大轨迹长度（顶点数量） */
  maxLength: number
  /** 最小轨迹长度（顶点数量） */
  minLength: number
  /** 基础透明度 */
  baseOpacity: number
  /** 消失速度（每帧减少的透明度） */
  fadeSpeed: number
  /** 最小显示透明度（低于此值的轨迹不显示） */
  minVisibleOpacity: number
}

/**
 * 默认轨迹配置
 */
export const DefaultTrailConfig: TrailConfig = {
  particleRatio: 0.2,    // 20% 的粒子显示轨迹（约 6000 条）
  maxLength: 15,         // 最大 15 个顶点
  minLength: 5,          // 最小 5 个顶点
  baseOpacity: 0.6,      // 基础透明度 60%
  fadeSpeed: 0.008,      // 每帧减少 0.8% 的透明度
  minVisibleOpacity: 0.05 // 最小可见透明度 5%
}

/**
 * 粒子轨迹数据
 *
 * @interface ParticleTrail
 */
interface ParticleTrail {
  /** 历史位置数组 [x, y, z, x, y, z, ...] */
  history: Float32Array
  /** 当前历史索引（环形缓冲区） */
  index: number
  /** 当前轨迹长度 */
  length: number
  /** 轨迹透明度 */
  opacity: number
  /** 是否活跃 */
  active: boolean
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
  /** 粒子轨迹数据数组 */
  private particleTrails: ParticleTrail[]
  /** 轨迹配置 */
  private config: TrailConfig
  /** 粒子总数 */
  private particleCount: number
  /** 轨迹粒子数量 */
  private trailParticleCount: number
  /** 轨迹顶点位置数组 */
  private trailPositions: Float32Array
  /** 轨迹颜色数组 */
  private trailColors: Float32Array
  /** 标记是否已释放资源 */
  private disposed: boolean = false

  /**
   * 构造函数，初始化轨迹管理器
   *
   * @param scene - Three.js 场景对象
   * @param particleCount - 粒子总数
   * @param config - 轨迹配置
   */
  constructor(
    scene: THREE.Scene,
    particleCount: number,
    config: TrailConfig = DefaultTrailConfig
  ) {
    this.particleCount = particleCount
    this.config = { ...config }
    this.trailParticleCount = Math.floor(particleCount * config.particleRatio)

    // 初始化粒子轨迹数据
    this.particleTrails = []
    for (let i = 0; i < this.trailParticleCount; i++) {
      this.particleTrails.push({
        history: new Float32Array(config.maxLength * 3),
        index: 0,
        length: 0,
        opacity: config.baseOpacity,
        active: false
      })
    }

    // 计算最大线段数量
    const maxSegmentsPerTrail = config.maxLength - 1
    const maxSegments = this.trailParticleCount * maxSegmentsPerTrail

    // 初始化轨迹顶点数组（每段 2 个顶点）
    this.trailPositions = new Float32Array(maxSegments * 2 * 3)
    this.trailColors = new Float32Array(maxSegments * 2 * 3)

    // 创建轨迹几何体
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3))

    // 创建轨迹材质
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    // 创建轨迹线段对象
    this.trailLines = new THREE.LineSegments(geometry, material)
    this.trailLines.frustumCulled = false

    // 添加到场景
    scene.add(this.trailLines)

    console.log(`TrailManager initialized: ${this.trailParticleCount} trails, max ${maxSegments} segments`)
  }

  /**
   * 更新轨迹
   *
   * 根据当前粒子位置更新轨迹历史位置和渲染数据。
   *
   * @param currentPositions - 当前粒子位置数组
   * @param currentColors - 当前粒子颜色数组
   * @param velocities - 当前粒子速度数组
   * @param maxSpeed - 最大速度（用于计算动态轨迹长度）
   */
  update(
    currentPositions: Float32Array,
    currentColors: Float32Array,
    velocities: Float32Array,
    maxSpeed: number
  ): void {
    if (this.disposed) {
      return
    }

    try {
      const { maxLength, minLength, fadeSpeed, baseOpacity, minVisibleOpacity } = this.config
      const trailPositions = this.trailPositions
      const trailColors = this.trailColors

      let vertexOffset = 0

      // 更新每个轨迹粒子
      for (let i = 0; i < this.trailParticleCount; i++) {
        // 获取粒子索引（均匀分布在所有粒子中）
        const particleIndex = Math.floor((i / this.trailParticleCount) * this.particleCount)
        const i3 = particleIndex * 3

        const trail = this.particleTrails[i]
        const history = trail.history

        // 添加当前位置到历史记录
        history[trail.index * 3] = currentPositions[i3]
        history[trail.index * 3 + 1] = currentPositions[i3 + 1]
        history[trail.index * 3 + 2] = currentPositions[i3 + 2]

        // 更新索引（环形缓冲区）
        trail.index = (trail.index + 1) % maxLength

        // 计算当前轨迹长度（动态：根据速度）
        const speed = Math.sqrt(
          velocities[i3] * velocities[i3] +
          velocities[i3 + 1] * velocities[i3 + 1] +
          velocities[i3 + 2] * velocities[i3 + 2]
        )

        // 速度越快，轨迹越长
        const speedRatio = speed / maxSpeed
        const dynamicLength = Math.floor(
          minLength + (maxLength - minLength) * speedRatio
        )

        // 更新轨迹长度
        trail.length = Math.min(trail.length + 1, dynamicLength)

        // 更新透明度（逐渐消失）
        if (trail.active) {
          trail.opacity -= fadeSpeed
        }

        // 检查是否应该激活或停用轨迹
        if (!trail.active && speed > maxSpeed * 0.3) {
          // 速度足够快时激活轨迹
          trail.active = true
          trail.opacity = baseOpacity
        } else if (trail.opacity < minVisibleOpacity) {
          // 透明度太低时停用轨迹
          trail.active = false
          trail.length = 0
        }

        // 渲染轨迹
        if (trail.active && trail.length >= 2) {
          this.renderTrail(
            trail,
            currentColors[i3],
            currentColors[i3 + 1],
            currentColors[i3 + 2],
            trailPositions,
            trailColors,
            vertexOffset
          )

          vertexOffset += (trail.length - 1) * 6
        }
      }

      // 清理未使用的顶点
      while (vertexOffset < trailPositions.length) {
        trailPositions[vertexOffset] = 0
        trailPositions[vertexOffset + 1] = 0
        trailPositions[vertexOffset + 2] = 0
        trailPositions[vertexOffset + 3] = 0
        trailPositions[vertexOffset + 4] = 0
        trailPositions[vertexOffset + 5] = 0
        trailColors[vertexOffset] = 0
        trailColors[vertexOffset + 1] = 0
        trailColors[vertexOffset + 2] = 0
        trailColors[vertexOffset + 3] = 0
        trailColors[vertexOffset + 4] = 0
        trailColors[vertexOffset + 5] = 0
        vertexOffset += 6
      }

      // 标记属性需要更新
      this.trailLines.geometry.attributes.position.needsUpdate = true
      this.trailLines.geometry.attributes.color.needsUpdate = true
    } catch (error) {
      console.error('更新轨迹时发生错误:', error)
    }
  }

  /**
   * 渲染轨迹
   *
   * 根据历史位置构建轨迹线段，并应用透明度渐变。
   *
   * @private
   */
  private renderTrail(
    trail: ParticleTrail,
    r: number,
    g: number,
    b: number,
    positions: Float32Array,
    colors: Float32Array,
    offset: number
  ): void {
    const { maxLength, baseOpacity } = this.config
    const history = trail.history
    const length = trail.length
    const index = trail.index

    // 从最老的位置开始
    const startIndex = (index - length + maxLength) % maxLength

    for (let i = 0; i < length - 1; i++) {
      // 当前段的位置索引
      const currentIdx = (startIndex + i) % maxLength
      const nextIdx = (startIndex + i + 1) % maxLength

      // 获取当前位置和下一个位置
      const currentOffset = currentIdx * 3
      const nextOffset = nextIdx * 3

      const x1 = history[currentOffset]
      const y1 = history[currentOffset + 1]
      const z1 = history[currentOffset + 2]

      const x2 = history[nextOffset]
      const y2 = history[nextOffset + 1]
      const z2 = history[nextOffset + 2]

      // 检查是否有效（避免重复点）
      if (x1 === x2 && y1 === y2 && z1 === z2) {
        // 使用当前值作为占位
        positions[offset + i * 6] = x1
        positions[offset + i * 6 + 1] = y1
        positions[offset + i * 6 + 2] = z1
        positions[offset + i * 6 + 3] = x2
        positions[offset + i * 6 + 4] = y2
        positions[offset + i * 6 + 5] = z2

        // 设置透明度为 0（不显示）
        colors[offset + i * 6] = 0
        colors[offset + i * 6 + 1] = 0
        colors[offset + i * 6 + 2] = 0
        colors[offset + i * 6 + 3] = 0
        colors[offset + i * 6 + 4] = 0
        colors[offset + i * 6 + 5] = 0
      } else {
        // 设置顶点位置
        positions[offset + i * 6] = x1
        positions[offset + i * 6 + 1] = y1
        positions[offset + i * 6 + 2] = z1
        positions[offset + i * 6 + 3] = x2
        positions[offset + i * 6 + 4] = y2
        positions[offset + i * 6 + 5] = z2

        // 计算透明度渐变（头部 = 最新位置，尾部 = 最老位置）
        const headRatio = (i + 1) / (length - 1) // 0 (最老) 到 1 (最新)
        const opacity = trail.opacity * (0.2 + headRatio * 0.8) // 最小 20%，最大 100%

        // 设置颜色（带透明度）
        colors[offset + i * 6] = r * opacity
        colors[offset + i * 6 + 1] = g * opacity
        colors[offset + i * 6 + 2] = b * opacity
        colors[offset + i * 6 + 3] = r * opacity
        colors[offset + i * 6 + 4] = g * opacity
        colors[offset + i * 6 + 5] = b * opacity
      }
    }
  }

  /**
   * 设置基础透明度
   *
   * @param opacity - 基础透明度 [0, 1]
   */
  setBaseOpacity(opacity: number): void {
    this.config.baseOpacity = Math.max(0, Math.min(1, opacity))
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
      if (this.trailPositions) {
        this.trailPositions.fill(0)
        this.trailPositions = null as any
      }
      if (this.trailColors) {
        this.trailColors.fill(0)
        this.trailColors = null as any
      }

      // 释放轨迹数据
      for (const trail of this.particleTrails) {
        if (trail.history) {
          trail.history.fill(0)
        }
      }
      this.particleTrails = []

      this.disposed = true
    } catch (error) {
      console.error('释放轨迹管理器资源失败:', error)
    }
  }
}