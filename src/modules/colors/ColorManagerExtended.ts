/**
 * 扩展的颜色管理器
 * 
 * 支持动态颜色映射（基于速度、位置、生命周期）
 * 
 * @module colors/ColorManagerExtended
 */

import * as THREE from 'three'
import { ColorManager } from './ColorManager'
import { ColorMapper, ColorMappingType } from './ColorMapper'
import { ColorTheme } from './ColorTheme'

/**
 * 扩展的颜色管理器类
 * 
 * 在 ColorManager 的基础上添加动态颜色映射功能
 */
export class ColorManagerExtended extends ColorManager {
  /** 颜色映射器 */
  private colorMapper: ColorMapper | null = null
  /** 边界半径（用于位置映射） */
  private boundsRadius: number = 50
  /** 最大速度（用于速度映射） */
  private maxSpeed: number = 0.15
  /** 粒子位置数组 */
  private positions: Float32Array | null = null
  /** 粒子速度数组 */
  private velocities: Float32Array | null = null
  /** 是否启用动态映射 */
  private enableDynamicMapping: boolean = false

  /**
   * 构造函数
   * 
   * @param theme - 颜色主题
   * @param particleCount - 粒子数量
   * @param boundsRadius - 边界半径
   * @param maxSpeed - 最大速度
   */
  constructor(
    theme: ColorTheme,
    particleCount: number,
    boundsRadius: number = 50,
    maxSpeed: number = 0.15
  ) {
    super(theme, particleCount)
    this.boundsRadius = boundsRadius
    this.maxSpeed = maxSpeed
  }

  /**
   * 初始化动态颜色映射
   * 
   * @param positions - 粒子位置数组
   * @param velocities - 粒子速度数组
   * @param mappingType - 映射类型
   */
  initializeDynamicMapping(
    positions: Float32Array,
    velocities: Float32Array,
    mappingType: ColorMappingType = 'speed'
  ): void {
    this.positions = positions
    this.velocities = velocities
    this.enableDynamicMapping = true

    // 创建颜色映射器
    this.colorMapper = new ColorMapper(
      mappingType,
      this.getTheme(),
      this.boundsRadius,
      this.maxSpeed
    )

    console.log(`Dynamic mapping initialized: ${mappingType}`)
  }

  /**
   * 更新动态映射颜色
   * 
   * 根据映射类型动态更新所有粒子的颜色
   */
  updateDynamicColors(): void {
    if (!this.enableDynamicMapping || !this.colorMapper || !this.positions || !this.velocities) {
      return
    }

    const colors = this.getColors()
    const len = colors.length

    for (let i = 0; i < len; i += 3) {
      const i3 = i / 3

      // 根据映射类型计算颜色
      let rgb: [number, number, number]

      switch (this.colorMapper.getMappingType()) {
        case 'speed':
          const velocity = new THREE.Vector3(
            this.velocities[i3],
            this.velocities[i3 + 1],
            this.velocities[i3 + 2]
          )
          rgb = this.colorMapper.mapBySpeed(velocity)
          break

        case 'position':
          const position = new THREE.Vector3(
            this.positions[i3],
            this.positions[i3 + 1],
            this.positions[i3 + 2]
          )
          rgb = this.colorMapper.mapByPosition(position)
          break

        case 'lifetime':
          // 简化版：使用位置作为生命周期的代理
          const pos = new THREE.Vector3(
            this.positions[i3],
            this.positions[i3 + 1],
            this.positions[i3 + 2]
          )
          rgb = this.colorMapper.mapByPosition(pos)
          break
      }

      // 应用亮度因子
      const brightnessFactor = 0.7 + Math.random() * 0.3
      colors[i] = rgb[0] * brightnessFactor
      colors[i + 1] = rgb[1] * brightnessFactor
      colors[i + 2] = rgb[2] * brightnessFactor
    }

    // 标记需要更新
    this.markNeedsUpdate()
  }

  /**
   * 更新方法 - 扩展支持动态映射
   * 
   * @param deltaTime - 时间增量
   */
  update(deltaTime: number): void {
    super.update(deltaTime)

    // 如果启用了动态映射，每帧更新颜色
    if (this.enableDynamicMapping) {
      this.updateDynamicColors()
    }
  }

  /**
   * 设置动态映射类型
   * 
   * @param mappingType - 映射类型
   */
  setMappingType(mappingType: ColorMappingType): void {
    if (this.colorMapper) {
      this.colorMapper.setMappingType(mappingType)
      console.log(`Mapping type changed to: ${mappingType}`)
    }
  }

  /**
   * 启用动态映射
   */
  enableDynamicMapping(): void {
    this.enableDynamicMapping = true
    console.log('Dynamic mapping enabled')
  }

  /**
   * 禁用动态映射
   */
  disableDynamicMapping(): void {
    this.enableDynamicMapping = false
    console.log('Dynamic mapping disabled')
  }

  /**
   * 设置边界半径
   * 
   * @param boundsRadius - 边界半径
   */
  setBoundsRadius(boundsRadius: number): void {
    this.boundsRadius = boundsRadius
    if (this.colorMapper) {
      this.colorMapper.setBoundsRadius(boundsRadius)
    }
  }

  /**
   * 设置最大速度
   * 
   * @param maxSpeed - 最大速度
   */
  setMaxSpeed(maxSpeed: number): void {
    this.maxSpeed = maxSpeed
    if (this.colorMapper) {
      this.colorMapper.setMaxSpeed(maxSpeed)
    }
  }

  /**
   * 标记需要更新
   * 
   * @protected
   */
  protected markNeedsUpdate(): void {
    // 这个方法会在子类中被覆盖，用于标记颜色需要更新
    // 实际更新逻辑由 ColorManager 处理
  }

  /**
   * 释放资源
   */
  dispose(): void {
    super.dispose()
    if (this.positions) {
      this.positions.fill(0)
      this.positions = null
    }
    if (this.velocities) {
      this.velocities.fill(0)
      this.velocities = null
    }
    this.colorMapper = null
    this.enableDynamicMapping = false
  }
}