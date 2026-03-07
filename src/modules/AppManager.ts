/**
 * 应用管理器
 *
 * 协调所有模块，管理应用的生命周期和主循环。
 * 这是应用的中心控制点，负责初始化、更新和清理。
 *
 * @modules AppManager
 */

import * as THREE from 'three'
import { NoiseTexture } from './noise/NoiseTexture'
import { ParticleSystem, ParticleConfig } from './particles/ParticleSystem'
import { TrailConfig } from './particles/TrailManager'
import { MouseInteraction, TouchInteraction, GestureHandler } from './interaction'
import { Renderer, RendererConfig } from './renderer/Renderer'
import { ColorManager, ColorTheme } from './colors/ColorTheme'

/**
 * 应用配置接口
 *
 * @interface AppConfig
 */
export interface AppConfig {
  /** 粒子数量 */
  particleCount: number
  /** 粒子大小 */
  particleSize: number
  /** 边界半径 */
  boundsRadius: number
  /** 速度缩放因子 */
  velocityScale: number
  /** 最大速度 */
  maxSpeed: number
  /** 是否启用轨迹 */
  enableTrails?: boolean
  /** 轨迹配置（仅当 enableTrails 为 true 时生效） */
  trailConfig?: TrailConfig
}

/**
 * 配置验证规则接口
 * 
 * @interface ValidationRule
 */
interface ValidationRule {
  min: number
  max: number
  name: string
}

/**
 * 配置验证规则
 */
const VALIDATION_RULES: Record<keyof AppConfig, ValidationRule> = {
  particleCount: { min: 1000, max: 200000, name: '粒子数量' },
  particleSize: { min: 0.1, max: 10, name: '粒子大小' },
  boundsRadius: { min: 5, max: 500, name: '边界半径' },
  velocityScale: { min: 0.001, max: 2, name: '速度缩放' },
  maxSpeed: { min: 0.001, max: 5, name: '最大速度' }
}

/**
 * 应用管理器类
 * 
 * 协调所有模块，管理应用的生命周期和主循环。
 * 
 * 主要职责：
 * - 初始化所有子系统
 * - 管理主渲染循环
 * - 处理用户交互
 * - 协调模块间的通信
 * - 管理资源清理
 * 
 * @class AppManager
 */
export class AppManager {
  /** 噪声纹理 */
  private noiseTexture: NoiseTexture
  /** 粒子系统 */
  private particleSystem: ParticleSystem
  /** 鼠标交互 */
  private mouseInteraction: MouseInteraction
  /** 触摸交互 */
  private touchInteraction: TouchInteraction
  /** 手势处理器 */
  private gestureHandler: GestureHandler
  /** 渲染器 */
  private renderer: Renderer
  /** 容器元素 */
  private container: HTMLElement
  /** Canvas 元素 */
  private canvas: HTMLCanvasElement

  /** 目标旋转角度 */
  private targetRotation: THREE.Vector2
  /** 当前旋转角度 */
  private currentRotation: THREE.Vector2
  /** 时间参数 */
  private time: number
  /** 上一帧的时间戳 */
  private lastFrameTime: number = 0
  /** 性能回调函数 */
  private perfCallback?: (fps: number, frameTime: number) => void
  /** 性能监控状态 */
  private lastPerfUpdate: number = 0
  private perfFrameCount: number = 0
  /** 性能更新间隔（毫秒） */
  private perfUpdateInterval: number = 500
  /** 动画帧 ID */
  private animationFrameId: number
  /** 保存的配置（用于上下文恢复） */
  private savedConfig: AppConfig | null = null

  /**
   * 构造函数，初始化应用
   * 
   * @param container - 容器元素
   * @param canvas - Canvas 元素
   * @param config - 应用配置
   * 
   * @example
   * ```typescript
   * const config = {
   *   particleCount: 30000,
   *   particleSize: 1.2,
   *   boundsRadius: 50,
   *   velocityScale: 0.08,
   *   maxSpeed: 0.15
   * };
   * const appManager = new AppManager(container, canvas, config);
   * ```
   */
  constructor(container: HTMLElement, canvas: HTMLCanvasElement, config: AppConfig) {
    try {
      // 验证配置参数
      this.validateConfig(config)

      // 保存配置用于上下文恢复
      this.savedConfig = { ...config }

      this.container = container
      this.canvas = canvas
      this.targetRotation = new THREE.Vector2()
      this.currentRotation = new THREE.Vector2()
      this.time = 0

      this.initialize(config)
      this.setupContextHandlers()
    } catch (error) {
      console.error('应用初始化失败:', error)
      throw new Error(`应用初始化失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 验证配置参数
   * 
   * 检查所有配置参数是否在有效范围内。
   * 如果参数超出范围，会抛出错误。
   * 
   * @param config - 待验证的配置参数
   * @throws {Error} 当配置参数无效时抛出错误
   * @private
   */
  private validateConfig(config: AppConfig): void {
    for (const [key, value] of Object.entries(config)) {
      const rule = VALIDATION_RULES[key as keyof AppConfig]
      
      if (!rule) {
        console.warn(`未知的配置参数: ${key}`)
        continue
      }

      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`${rule.name} 必须是有效的数字，当前值: ${value}`)
      }

      if (value < rule.min || value > rule.max) {
        throw new Error(
          `${rule.name} 超出有效范围 [${rule.min}, ${rule.max}]，当前值: ${value}`
        )
      }
    }
  }

  /**
   * 初始化应用
   * 
   * 按顺序初始化所有子系统：
   * 1. 渲染器
   * 2. 噪声纹理
   * 3. 粒子系统
   * 4. 交互系统
   * 5. 启动主循环
   * 
   * @param config - 应用配置
   * @private
   */
  private initialize(config: AppConfig): void {
    try {
      // 步骤 1：初始化渲染器
      const rendererConfig: RendererConfig = {
        canvas: this.canvas,
        width: this.container.clientWidth,
        height: this.container.clientHeight
      }
      this.renderer = new Renderer(rendererConfig)

      // 步骤 2：预计算噪声纹理（使用 Web Worker）
      console.log('初始化噪声纹理（Web Worker）...')
      this.noiseTexture = new NoiseTexture(64, () => {
        // 噪声纹理准备好后继续初始化
        this.continueInitialization(config)
      })
    } catch (error) {
      console.error('应用初始化过程中发生错误:', error)
      // 尝试清理已初始化的资源
      try {
        this.dispose()
      } catch (cleanupError) {
        console.error('清理资源时发生错误:', cleanupError)
      }
      throw error
    }
  }

  /**
   * 初始化交互系统
   * 
   * 创建鼠标、触摸和手势交互处理器。
   * 
   * @private
   */
  private initializeInteractions(): void {
    // 鼠标交互
    this.mouseInteraction = new MouseInteraction(this.container, (x, y) => {
      this.targetRotation.x = x
      this.targetRotation.y = y
    })

    // 触摸交互
    this.touchInteraction = new TouchInteraction(this.container, (x, y) => {
      this.targetRotation.x = x
      this.targetRotation.y = y
    })

    // 手势交互
    this.gestureHandler = new GestureHandler(
      this.container,
      (x, y) => {
        this.targetRotation.x = x
        this.targetRotation.y = y
      },
      (scale) => {
        // 限制缩放范围在 [0.1, 10] 之间，防止指数增长
        const currentScale = this.particleSystem.points.scale.x
        const newScale = currentScale * scale
        const clampedScale = Math.max(0.1, Math.min(10, newScale))
        this.particleSystem.points.scale.set(clampedScale, clampedScale, clampedScale)
      }
    )

    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize)
  }

  /**
   * 继续初始化应用（噪声纹理准备好后调用）
   *
   * @param config - 应用配置
   * @private
   */
  private continueInitialization(config: AppConfig): void {
    try {
      // 步骤 3：创建粒子系统
      console.log('创建粒子系统...')
      const particleConfig: ParticleConfig = {
        count: config.particleCount,
        size: config.particleSize,
        boundsRadius: config.boundsRadius,
        velocityScale: config.velocityScale,
        maxSpeed: config.maxSpeed,
        enableTrails: config.enableTrails || false,
        trailConfig: config.trailConfig
      }
      this.particleSystem = new ParticleSystem(this.renderer.scene, particleConfig, this.noiseTexture)

      // 步骤 4：初始化交互系统
      console.log('初始化交互系统...')
      this.initializeInteractions()
    
          // 步骤 5：启动主循环
          // 步骤 5：启动主循环
      console.log('启动应用...')
      this.lastFrameTime = performance.now()
      this.animate(this.lastFrameTime)
    } catch (error) {
      console.error('应用继续初始化过程中发生错误:', error)
      // 尝试清理已初始化的资源
      try {
        this.dispose()
      } catch (cleanupError) {
        console.error('清理资源时发生错误:', cleanupError)
      }
      throw error
    }
  }

  /**
   * 设置 WebGL 上下文事件处理器
   * 
   * @private
   */
  private setupContextHandlers(): void {
    // 设置上下文丢失回调
    this.renderer.setContextLostCallback(() => {
      console.warn('WebGL 上下文丢失，停止渲染循环')
      cancelAnimationFrame(this.animationFrameId)
    })

    // 设置上下文恢复回调
    this.renderer.setContextRestoredCallback(() => {
      this.handleContextRestored()
    })
  }

  /**
   * 处理 WebGL 上下文恢复
   * 
   * 重新初始化所有资源以恢复渲染。
   * 
   * @private
   */
  private handleContextRestored(): void {
    try {
      if (!this.savedConfig) {
        console.error('没有保存的配置，无法恢复上下文')
        return
      }

      console.info('开始重新初始化应用资源...')

      // 停止当前的渲染循环
      cancelAnimationFrame(this.animationFrameId)

      // 清理旧资源（但不释放交互系统）
      this.particleSystem.dispose(this.renderer.scene)
      this.noiseTexture.dispose()
      this.renderer.dispose()

      // 重新初始化
      this.initialize(this.savedConfig)

      console.info('应用资源重新初始化完成')
    } catch (error) {
      console.error('上下文恢复失败:', error)
      // 尝试恢复到最小配置
      this.tryRecovery()
    }
  }

  /**
   * 尝试恢复到最小配置
   * 
   * @private
   */
  private tryRecovery(): void {
    try {
      console.warn('尝试使用最小配置恢复...')
      const minConfig: AppConfig = {
        particleCount: 5000,
        particleSize: 1.0,
        boundsRadius: 30,
        velocityScale: 0.05,
        maxSpeed: 0.1
      }
      this.savedConfig = minConfig

      // 清理资源
      this.particleSystem.dispose(this.renderer.scene)
      this.noiseTexture.dispose()
      this.renderer.dispose()

      // 重新初始化
      this.initialize(minConfig)
      console.info('使用最小配置恢复成功')
    } catch (error) {
      console.error('恢复失败，应用无法继续运行:', error)
    }
  }

  /**
   * 处理窗口大小调整
   *
   * @private
   */
  private handleResize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.renderer.resize(width, height)
  }

  /**
   * 设置性能回调函数
   *
   * 每帧渲染时会调用此回调，传入 FPS 和帧时间数据。
   *
   * @param callback - 性能回调函数，接收 fps 和 frameTime 参数
   */
  setPerformanceCallback(callback: (fps: number, frameTime: number) => void): void {
    this.perfCallback = callback
    this.lastPerfUpdate = performance.now()
    this.perfFrameCount = 0
  }

  /**
   * 移除性能回调函数
   */
  removePerformanceCallback(): void {
    this.perfCallback = undefined
  }

  /**
   * 设置性能更新间隔
   *
   * @param interval - 更新间隔（毫秒）
   */
  setPerformanceUpdateInterval(interval: number): void {
    this.perfUpdateInterval = Math.max(100, interval) // 最小 100ms
  }

  /**
   * 设置颜色管理器
   *
   * 为粒子系统设置颜色管理器，用于动态颜色主题。
   *
   * @param manager - 颜色管理器
   */
  setColorManager(manager: ColorManager): void {
    this.particleSystem.setColorManager(manager)
  }

  /**
   * 获取颜色管理器
   *
   * @returns 当前颜色管理器，如果没有则返回 null
   */
  getColorManager(): ColorManager | null {
    return this.particleSystem.getColorManager()
  }

  /**
   * 切换颜色主题
   *
   * 快捷方法：直接切换颜色主题。
   *
   * @param theme - 新的颜色主题
   */
  setColorTheme(theme: ColorTheme): void {
    this.particleSystem.setColorTheme(theme)
  }

  /**
   * 设置颜色动画速度乘数
   *
   * @param multiplier - 速度乘数
   */
  setColorAnimationSpeedMultiplier(multiplier: number): void {
    const colorManager = this.particleSystem.getColorManager()
    if (colorManager) {
      colorManager.setAnimationSpeedMultiplier(multiplier)
    }
  }

  /**
   * 启用/禁用颜色动画
   *
   * @param enabled - 是否启用动画
   */
  setColorAnimationEnabled(enabled: boolean): void {
    const colorManager = this.particleSystem.getColorManager()
    if (colorManager) {
      colorManager.setAnimationEnabled(enabled)
    }
  }

  /**
   * 主渲染循环
   *
   * 每帧执行以下操作：
   * 1. 计算真实帧时间
   * 2. 更新时间
   * 3. 更新粒子系统（传递 deltaTime 用于颜色动画）
   * 4. 更新旋转角度（平滑插值）
   * 5. 计算性能指标（如果设置了回调）
   * 6. 渲染场景
   *
   * @private
   */
  private animate = (timestamp: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate)

    try {
      // 计算真实帧时间
      const deltaTime = this.lastFrameTime === 0 ? 16 : timestamp - this.lastFrameTime
      this.lastFrameTime = timestamp

      // 更新时间（使用真实帧时间）
      this.time += deltaTime

      // 更新粒子系统（传递 deltaTime 用于颜色动画）
      this.particleSystem.update(this.time, deltaTime)

      // 平滑插值更新旋转角度
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.05
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.05

      // 应用旋转
      this.particleSystem.points.rotation.x = this.currentRotation.x
      this.particleSystem.points.rotation.y = this.currentRotation.y
      this.particleSystem.points.rotation.y += 0.001  // 自动旋转

      // 计算性能指标（如果设置了回调）
      if (this.perfCallback) {
        this.perfFrameCount++

        if (timestamp - this.lastPerfUpdate >= this.perfUpdateInterval) {
          const fps = Math.round((this.perfFrameCount * 1000) / (timestamp - this.lastPerfUpdate))
          this.perfCallback(fps, deltaTime)
          this.perfFrameCount = 0
          this.lastPerfUpdate = timestamp
        }
      }

      // 渲染场景
      this.renderer.render()
    } catch (error) {
      console.error('渲染循环中发生错误:', error)
      // 停止动画循环以防止错误持续发生
      cancelAnimationFrame(this.animationFrameId)
    }
  }

  /**
   * 释放应用资源
   * 
   * 清理所有子系统，释放内存和资源。
   * 
   * @example
   * ```typescript
   * appManager.dispose();
   * ```
   */
  dispose(): void {
    try {
      // 停止动画循环
      if (this.animationFrameId !== undefined) {
        cancelAnimationFrame(this.animationFrameId)
      }

      // 移除事件监听器
      if (this.handleResize) {
        window.removeEventListener('resize', this.handleResize)
      }

      // 清理交互系统（添加空值检查）
      if (this.mouseInteraction) {
        this.mouseInteraction.dispose()
      }
      if (this.touchInteraction) {
        this.touchInteraction.dispose()
      }
      if (this.gestureHandler) {
        this.gestureHandler.dispose()
      }

      // 清理粒子系统
      if (this.particleSystem && this.renderer) {
        this.particleSystem.dispose(this.renderer.scene)
      }

      // 清理噪声纹理
      if (this.noiseTexture) {
        this.noiseTexture.dispose()
      }

      // 清理渲染器
      if (this.renderer) {
        this.renderer.dispose()
      }
    } catch (error) {
      console.error('释放应用资源时发生错误:', error)
    }
  }

  /**
   * 更新粒子系统配置
   * 
   * 动态更新粒子系统的参数，实现实时调整。
   * 
   * @param config - 新的配置参数
   * 
   * @example
   * ```typescript
   * appManager.updateConfig({
   *   particleCount: 50000,
   *   particleSize: 2.0,
   *   boundsRadius: 80,
   *   velocityScale: 0.1,
   *   maxSpeed: 0.2
   * });
   * ```
   */
  updateConfig(config: AppConfig): void {
    try {
      // 更新粒子数量 - 需要重建粒子系统
      if (config.particleCount !== undefined && config.particleCount !== this.particleSystem.getConfig().count) {
        console.log('更新粒子数量:', config.particleCount)
        // 清理旧的粒子系统
        this.particleSystem.dispose(this.renderer.scene)
        // 创建新的粒子系统
        const particleConfig: ParticleConfig = {
          count: config.particleCount,
          size: config.particleSize,
          boundsRadius: config.boundsRadius,
          velocityScale: config.velocityScale,
          maxSpeed: config.maxSpeed
        }
        this.particleSystem = new ParticleSystem(this.renderer.scene, particleConfig, this.noiseTexture)
      } else {
        // 更新其他参数 - 无需重建
        this.particleSystem.updateConfig({
          size: config.particleSize,
          boundsRadius: config.boundsRadius,
          velocityScale: config.velocityScale,
          maxSpeed: config.maxSpeed
        })
      }
    } catch (error) {
      console.error('更新配置时发生错误:', error)
    }
  }

  /**
   * 导出当前配置
   * 
   * 将当前的粒子配置和颜色主题导出为 JSON 字符串。
   * 
   * @returns JSON 格式的配置字符串
   * 
   * @example
   * ```typescript
   * const configJson = appManager.exportConfig();
   * // 下载配置文件
   * const blob = new Blob([configJson], { type: 'application/json' });
   * const url = URL.createObjectURL(blob);
   * const a = document.createElement('a');
   * a.href = url;
   * a.download = 'xingchen-config.json';
   * a.click();
   * ```
   */
  exportConfig(): string {
    try {
      const config = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        particle: this.particleSystem.getConfig(),
        theme: this.particleSystem.getColorManager()?.getCurrentTheme(),
        performance: {
          updateInterval: this.perfUpdateInterval
        }
      }
      return JSON.stringify(config, null, 2)
    } catch (error) {
      console.error('导出配置时发生错误:', error)
      throw new Error(`导出配置失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 导入配置
   * 
   * 从 JSON 字符串导入配置并应用到应用中。
   * 
   * @param configJson - JSON 格式的配置字符串
   * @returns 导入是否成功
   * 
   * @example
   * ```typescript
   * const success = appManager.importConfig(configJson);
   * if (success) {
   *   console.log('配置导入成功');
   * }
   * ```
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson)
      
      // 验证配置版本
      if (!config.version) {
        console.warn('配置缺少版本信息')
      }

      // 导入粒子配置
      if (config.particle) {
        this.updateConfig(config.particle)
      }

      // 导入颜色主题
      if (config.theme) {
        this.setColorTheme(config.theme)
      }

      // 导入性能配置
      if (config.performance?.updateInterval) {
        this.setPerformanceUpdateInterval(config.performance.updateInterval)
      }

      console.log('配置导入成功')
      return true
    } catch (error) {
      console.error('导入配置时发生错误:', error)
      return false
    }
  }
}