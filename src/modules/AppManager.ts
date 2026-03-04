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
import { MouseInteraction, TouchInteraction, GestureHandler } from './interaction'
import { Renderer, RendererConfig } from './renderer/Renderer'

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
  /** 动画帧 ID */
  private animationFrameId: number

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
    this.container = container
    this.canvas = canvas
    this.targetRotation = new THREE.Vector2()
    this.currentRotation = new THREE.Vector2()
    this.time = 0

    this.initialize(config)
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
    // 步骤 1：初始化渲染器
    const rendererConfig: RendererConfig = {
      canvas: this.canvas,
      width: this.container.clientWidth,
      height: this.container.clientHeight
    }
    this.renderer = new Renderer(rendererConfig)

    // 步骤 2：预计算噪声纹理
    console.log('初始化噪声纹理...')
    this.noiseTexture = new NoiseTexture()

    // 步骤 3：创建粒子系统
    console.log('创建粒子系统...')
    const particleConfig: ParticleConfig = {
      count: config.particleCount,
      size: config.particleSize,
      boundsRadius: config.boundsRadius,
      velocityScale: config.velocityScale,
      maxSpeed: config.maxSpeed
    }
    this.particleSystem = new ParticleSystem(this.renderer.scene, particleConfig, this.noiseTexture)

    // 步骤 4：初始化交互系统
    console.log('初始化交互系统...')
    this.initializeInteractions()

    // 步骤 5：启动主循环
    console.log('启动应用...')
    this.animate()
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
        this.particleSystem.points.scale.multiplyScalar(scale)
      }
    )

    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize)
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
   * 主渲染循环
   * 
   * 每帧执行以下操作：
   * 1. 更新时间
   * 2. 更新粒子系统
   * 3. 更新旋转角度（平滑插值）
   * 4. 渲染场景
   * 
   * @private
   */
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate)

    // 更新时间
    this.time += 16

    // 更新粒子系统
    this.particleSystem.update(this.time)

    // 平滑插值更新旋转角度
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.05
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.05

    // 应用旋转
    this.particleSystem.points.rotation.x = this.currentRotation.x
    this.particleSystem.points.rotation.y = this.currentRotation.y
    this.particleSystem.points.rotation.y += 0.001  // 自动旋转

    // 渲染场景
    this.renderer.render()
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
    // 停止动画循环
    cancelAnimationFrame(this.animationFrameId)

    // 移除事件监听器
    window.removeEventListener('resize', this.handleResize)

    // 清理交互系统
    this.mouseInteraction.dispose()
    this.touchInteraction.dispose()
    this.gestureHandler.dispose()

    // 清理粒子系统
    this.particleSystem.dispose(this.renderer.scene)

    // 清理噪声纹理
    this.noiseTexture.dispose()

    // 清理渲染器
    this.renderer.dispose()
  }
}