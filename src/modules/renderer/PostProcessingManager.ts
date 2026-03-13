/**
 * 后处理效果管理器
 * 
 * 管理所有后处理效果，包括泛光、景深、色差等。
 * 提供统一的接口来控制后处理效果的启用、禁用和参数调整。
 * 
 * @module renderer/PostProcessingManager
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

/**
 * 泛光效果配置接口
 * 
 * @interface BloomConfig
 */
export interface BloomConfig {
  /** 是否启用泛光 */
  enabled: boolean
  /** 泛光强度 */
  strength: number
  /** 泛光半径 */
  radius: number
  /** 泛光阈值 */
  threshold: number
}

/**
 * 后处理管理器类
 * 
 * 管理所有后处理效果的创建、更新和渲染。
 * 
 * 主要功能：
 * - 创建 EffectComposer
 * - 添加基础渲染通道（RenderPass）
 * - 添加泛光效果通道（UnrealBloomPass）
 * - 控制后处理效果的启用/禁用
 * - 调整后处理效果参数
 * 
 * @class PostProcessingManager
 */
export class PostProcessingManager {
  /** 效果组合器 */
  private composer: EffectComposer
  /** 基础渲染通道 */
  private renderPass: RenderPass
  /** 泛光通道 */
  private bloomPass: UnrealBloomPass | null = null
  /** 泛光配置 */
  private bloomConfig: BloomConfig
  /** 后处理是否启用 */
  private enabled: boolean = true

  /**
   * 构造函数，初始化后处理管理器
   * 
   * @param renderer - WebGL 渲染器
   * @param scene - Three.js 场景
   * @param camera - 相机
   * @param width - 画布宽度
   * @param height - 画布高度
   * 
   * @example
   * ```typescript
   * const postProcessing = new PostProcessingManager(
   *   renderer,
   *   scene,
   *   camera,
   *   window.innerWidth,
   *   window.innerHeight
   * );
   * ```
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number
  ) {
    // 创建效果组合器
    this.composer = new EffectComposer(renderer)
    this.composer.setSize(width, height)
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 3))

    // 创建基础渲染通道
    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)

    // 初始化泛光配置
    this.bloomConfig = {
      enabled: true,
      strength: 1.5,    // 泛光强度
      radius: 0.4,      // 泛光半径
      threshold: 0.85   // 泛光阈值（只对亮度超过此值的像素产生泛光）
    }

    // 创建泛光通道
    this.createBloomPass(width, height)
  }

  /**
   * 创建泛光通道
   * 
   * @param width - 画布宽度
   * @param height - 画布高度
   * @private
   */
  private createBloomPass(width: number, height: number): void {
    if (this.bloomConfig.enabled) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        this.bloomConfig.strength,
        this.bloomConfig.radius,
        this.bloomConfig.threshold
      )
      this.composer.addPass(this.bloomPass)
    }
  }

  /**
   * 设置泛光配置
   * 
   * @param config - 泛光配置
   * 
   * @example
   * ```typescript
   * postProcessing.setBloomConfig({
   *   enabled: true,
   *   strength: 2.0,
   *   radius: 0.5,
   *   threshold: 0.8
   * });
   * ```
   */
  setBloomConfig(config: Partial<BloomConfig>): void {
    // 更新配置
    this.bloomConfig = { ...this.bloomConfig, ...config }

    // 如果泛光启用状态改变，重新创建通道
    if (config.enabled !== undefined && config.enabled !== (this.bloomPass !== null)) {
      this.recreateBloomPass()
    }

    // 如果泛光通道存在，更新参数
    if (this.bloomPass) {
      if (config.strength !== undefined) {
        this.bloomPass.strength = config.strength
      }
      if (config.radius !== undefined) {
        this.bloomPass.radius = config.radius
      }
      if (config.threshold !== undefined) {
        this.bloomPass.threshold = config.threshold
      }
    }
  }

  /**
   * 获取泛光配置
   * 
   * @returns 当前泛光配置
   */
  getBloomConfig(): BloomConfig {
    return { ...this.bloomConfig }
  }

  /**
   * 重新创建泛光通道
   * 
   * 当泛光启用状态改变时调用。
   * 
   * @private
   */
  private recreateBloomPass(): void {
    // 移除旧的泛光通道
    if (this.bloomPass) {
      this.composer.removePass(this.bloomPass)
      this.bloomPass.dispose()
      this.bloomPass = null
    }

    // 如果启用，创建新的泛光通道
    if (this.bloomConfig.enabled) {
      const width = this.composer.renderer.domElement.width
      const height = this.composer.renderer.domElement.height
      this.createBloomPass(width, height)
    }
  }

  /**
   * 启用后处理
   * 
   * @example
   * ```typescript
   * postProcessing.enable();
   * ```
   */
  enable(): void {
    this.enabled = true
  }

  /**
   * 禁用后处理
   * 
   * @example
   * ```typescript
   * postProcessing.disable();
   * ```
   */
  disable(): void {
    this.enabled = false
  }

  /**
   * 检查后处理是否启用
   * 
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 渲染场景（使用后处理效果）
   * 
   * 如果后处理被禁用，将直接使用基础渲染器渲染。
   * 
   * @example
   * ```typescript
   * postProcessing.render();
   * ```
   */
  render(): void {
    if (this.enabled) {
      this.composer.render()
    }
  }

  /**
   * 处理窗口大小调整
   * 
   * 当窗口大小改变时，更新效果组合器大小。
   * 
   * @param width - 新的宽度
   * @param height - 新的高度
   * 
   * @example
   * ```typescript
   * postProcessing.resize(window.innerWidth, window.innerHeight);
   * ```
   */
  resize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  /**
   * 获取效果组合器
   * 
   * @returns EffectComposer 实例
   */
  getComposer(): EffectComposer {
    return this.composer
  }

  /**
   * 释放后处理管理器资源
   * 
   * 释放所有后处理通道和效果组合器。
   * 
   * @example
   * ```typescript
   * postProcessing.dispose();
   * ```
   */
  dispose(): void {
    if (this.bloomPass) {
      this.bloomPass.dispose()
    }
    this.composer.dispose()
  }
}