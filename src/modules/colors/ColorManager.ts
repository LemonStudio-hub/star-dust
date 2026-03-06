/**
 * 颜色管理器
 * 
 * 负责管理粒子系统的颜色，支持多种颜色主题、渐变类型和动画效果。
 * 
 * 主要功能：
 * - 根据主题类型初始化颜色
 * - 更新颜色动画
 * - 应用颜色到粒子系统
 * - 切换颜色主题
 * 
 * @module colors/ColorManager
 */

import {
  ColorTheme,
  ColorStop,
  GradientType,
  AnimationType,
  ColorConfig,
  DefaultColorTheme
} from './ColorTheme'

/**
 * 颜色管理器类
 * 
 * 管理粒子系统的颜色分配和动画。
 * 
 * @class ColorManager
 */
export class ColorManager {
  /** 颜色数组（RGB 格式，每个粒子 3 个值） */
  private colors: Float32Array
  /** 当前颜色主题 */
  private currentTheme: ColorTheme
  /** 粒子数量 */
  private particleCount: number
  /** 动画时间 */
  private time: number = 0
  /** 是否已初始化 */
  private initialized: boolean = false
  /** 颜色配置 */
  private config: ColorConfig
  /** 亮度因子（随机变化） */
  private brightnessFactors: Float32Array

  /**
   * 构造函数，初始化颜色管理器
   * 
   * @param theme - 颜色主题
   * @param particleCount - 粒子数量
   * 
   * @example
   * ```typescript
   * const manager = new ColorManager(DefaultColorTheme, 30000);
   * manager.initialize();
   * ```
   */
  constructor(theme: ColorTheme, particleCount: number) {
    this.currentTheme = theme
    this.particleCount = particleCount
    this.colors = new Float32Array(particleCount * 3)
    this.brightnessFactors = new Float32Array(particleCount)

    // 初始化配置
    this.config = {
      theme: theme,
      enableAnimation: theme.animationType !== 'none',
      animationSpeedMultiplier: 1.0
    }
  }

  /**
   * 初始化颜色
   * 
   * 根据当前主题的渐变类型初始化所有粒子的颜色。
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('ColorManager already initialized')
      return
    }

    try {
      switch (this.currentTheme.gradientType) {
        case 'random':
          this.initializeRandom()
          break
        case 'linear':
          this.initializeLinear()
          break
        case 'radial':
          this.initializeRadial()
          break
        default:
          console.warn(`Unknown gradient type: ${this.currentTheme.gradientType}, falling back to random`)
          this.initializeRandom()
      }

      this.initialized = true
      console.log(`ColorManager initialized with ${this.currentTheme.name} theme`)
    } catch (error) {
      console.error('Failed to initialize ColorManager:', error)
      throw error
    }
  }

  /**
   * 初始化随机分布的颜色
   * 
   * 每个粒子随机分配一个颜色，并添加随机亮度变化。
   * 
   * @private
   */
  private initializeRandom(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // 随机选择一个颜色停止点
      const colorStop = this.currentTheme.colors[
        Math.floor(Math.random() * this.currentTheme.colors.length)
      ]

      // 随机亮度 [0.7, 1.0]
      const brightness = 0.7 + Math.random() * 0.3
      this.brightnessFactors[i] = brightness

      // 应用颜色
      this.colors[i3] = colorStop.color[0] * brightness
      this.colors[i3 + 1] = colorStop.color[1] * brightness
      this.colors[i3 + 2] = colorStop.color[2] * brightness
    }
  }

  /**
   * 初始化线性渐变的颜色
   * 
   * 根据粒子索引进行线性渐变。
   * 
   * @private
   */
  private initializeLinear(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const t = i / this.particleCount

      // 插值颜色
      const color = this.interpolateColor(this.currentTheme.colors, t)

      // 随机亮度
      const brightness = 0.7 + Math.random() * 0.3
      this.brightnessFactors[i] = brightness

      // 应用颜色
      this.colors[i3] = color[0] * brightness
      this.colors[i3 + 1] = color[1] * brightness
      this.colors[i3 + 2] = color[2] * brightness
    }
  }

  /**
   * 初始化径向渐变的颜色
   * 
   * 根据粒子到中心的距离进行径向渐变。
   * 注意：此方法需要粒子位置信息，暂时使用随机分布作为占位。
   * 
   * @private
   */
  private initializeRadial(): void {
    // 暂时使用随机分布，径向渐变需要粒子位置信息
    this.initializeRandom()
  }

  /**
   * 更新颜色
   * 
   * 根据动画类型更新颜色。每帧调用一次。
   * 
   * @param deltaTime - 时间增量（毫秒）
   * 
   * @example
   * ```typescript
   * colorManager.update(16.67); // 每帧调用
   * ```
   */
  update(deltaTime: number): void {
    if (!this.initialized || !this.config.enableAnimation) {
      return
    }

    this.time += deltaTime

    switch (this.currentTheme.animationType) {
      case 'cycle':
        this.animateCycle()
        break
      case 'pulse':
        this.animatePulse()
        break
      case 'wave':
        this.animateWave()
        break
      case 'none':
        // 无动画，不更新
        break
    }
  }

  /**
   * 循环动画
   * 
   * 颜色随时间循环变化，产生彩虹效果。
   * 
   * @private
   */
  private animateCycle(): void {
    const speed = this.currentTheme.animationSpeed || 1.0
    const multiplier = this.config.animationSpeedMultiplier

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // 计算动画参数
      const phase = (i / this.particleCount) * Math.PI * 2
      const offset = (this.time * speed * 0.001 * multiplier) % (Math.PI * 2)
      const t = (Math.sin(phase + offset) + 1) / 2

      // 插值颜色
      const color = this.interpolateColor(this.currentTheme.colors, t)
      const brightness = this.brightnessFactors[i]

      // 更新颜色
      this.colors[i3] = color[0] * brightness
      this.colors[i3 + 1] = color[1] * brightness
      this.colors[i3 + 2] = color[2] * brightness
    }
  }

  /**
   * 脉冲动画
   * 
   * 颜色随时间脉冲变化，产生呼吸效果。
   * 
   * @private
   */
  private animatePulse(): void {
    const speed = this.currentTheme.animationSpeed || 1.0
    const multiplier = this.config.animationSpeedMultiplier

    // 计算全局脉冲因子
    const pulse = (Math.sin(this.time * speed * 0.001 * multiplier) + 1) / 2

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // 获取原始颜色
      const colorStop = this.currentTheme.colors[i % this.currentTheme.colors.length]
      const brightness = this.brightnessFactors[i]

      // 应用脉冲
      const pulseBrightness = brightness * (0.5 + pulse * 0.5)

      // 更新颜色
      this.colors[i3] = colorStop.color[0] * pulseBrightness
      this.colors[i3 + 1] = colorStop.color[1] * pulseBrightness
      this.colors[i3 + 2] = colorStop.color[2] * pulseBrightness
    }
  }

  /**
   * 波浪动画
   * 
   * 颜色随时间和位置波浪变化。
   * 
   * @private
   */
  private animateWave(): void {
    const speed = this.currentTheme.animationSpeed || 1.0
    const multiplier = this.config.animationSpeedMultiplier

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // 计算波浪参数
      const offset = (i / this.particleCount) * Math.PI * 4
      const t = (Math.sin(this.time * speed * 0.001 * multiplier + offset) + 1) / 2

      // 插值颜色
      const color = this.interpolateColor(this.currentTheme.colors, t)
      const brightness = this.brightnessFactors[i]

      // 更新颜色
      this.colors[i3] = color[0] * brightness
      this.colors[i3 + 1] = color[1] * brightness
      this.colors[i3 + 2] = color[2] * brightness
    }
  }

  /**
   * 插值颜色
   * 
   * 在颜色停止点之间进行线性插值。
   * 
   * @param stops - 颜色停止点数组
   * @param t - 插值参数 [0, 1]
   * @returns 插值后的颜色
   * 
   * @private
   */
  private interpolateColor(stops: ColorStop[], t: number): [number, number, number] {
    // 确保范围在 [0, 1]
    t = Math.max(0, Math.min(1, t))

    // 找到相邻的颜色停止点
    let start = stops[0]
    let end = stops[stops.length - 1]

    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].position && t <= stops[i + 1].position) {
        start = stops[i]
        end = stops[i + 1]
        break
      }
    }

    // 计算局部插值参数
    const range = end.position - start.position
    const localT = range === 0 ? 0 : (t - start.position) / range

    // 线性插值
    return [
      start.color[0] + (end.color[0] - start.color[0]) * localT,
      start.color[1] + (end.color[1] - start.color[1]) * localT,
      start.color[2] + (end.color[2] - start.color[2]) * localT
    ]
  }

  /**
   * 切换颜色主题
   * 
   * 切换到新的颜色主题并重新初始化颜色。
   * 
   * @param theme - 新的颜色主题
   * 
   * @example
   * ```typescript
   * colorManager.setTheme(newTheme);
   * ```
   */
  setTheme(theme: ColorTheme): void {
    if (this.currentTheme === theme) {
      return
    }

    this.currentTheme = theme
    this.config.theme = theme
    this.config.enableAnimation = theme.animationType !== 'none'
    this.time = 0
    this.initialized = false

    this.initialize()
  }

  /**
   * 设置动画速度乘数
   * 
   * @param multiplier - 速度乘数
   */
  setAnimationSpeedMultiplier(multiplier: number): void {
    this.config.animationSpeedMultiplier = Math.max(0, Math.min(2, multiplier))
  }

  /**
   * 启用/禁用动画
   * 
   * @param enabled - 是否启用动画
   */
  setAnimationEnabled(enabled: boolean): void {
    this.config.enableAnimation = enabled
  }

  /**
   * 获取颜色数组
   * 
   * @returns 颜色数组（Float32Array）
   */
  getColors(): Float32Array {
    return this.colors
  }

  /**
   * 获取当前主题
   * 
   * @returns 当前颜色主题
   */
  getCurrentTheme(): ColorTheme {
    return this.currentTheme
  }

  /**
   * 检查是否已初始化
   * 
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 释放资源
   * 
   * 清理颜色数组，防止内存泄漏。
   */
  dispose(): void {
    if (this.colors) {
      this.colors.fill(0)
    }
    if (this.brightnessFactors) {
      this.brightnessFactors.fill(0)
    }
    this.initialized = false
  }
}