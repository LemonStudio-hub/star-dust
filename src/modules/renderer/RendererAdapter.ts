/**
 * 渲染器适配器
 * 
 * 自动选择最佳的渲染器后端（WebGPU 或 WebGL）。
 * 支持 WebGPU 到 WebGL 的自动降级。
 * 
 * @module renderer/RendererAdapter
 */

import { IRenderer, RendererConfig } from './IRenderer'
import { Renderer } from './Renderer'
import { WebGPURenderer } from './WebGPURenderer'

/**
 * 渲染器类型枚举
 * 
 * @enum RendererType
 */
enum RendererType {
  WebGL = 'webgl',
  WebGPU = 'webgpu'
}

/**
 * 渲染器适配器类
 * 
 * 自动检测并选择最佳渲染器后端。
 * 如果 WebGPU 不可用，自动降级到 WebGL。
 * 
 * 主要功能：
 * - 检测 WebGPU 支持情况
 * - 创建 WebGPU 或 WebGL 渲染器
 * - 提供统一的渲染器接口
 * - 处理降级逻辑
 * 
 * @class RendererAdapter
 */
export class RendererAdapter implements IRenderer {
  /** 实际使用的渲染器实例 */
  private renderer: IRenderer | null = null
  /** 渲染器类型 */
  private rendererType: RendererType = RendererType.WebGL
  /** 配置 */
  private config: RendererConfig
  /** Canvas 元素 */
  private canvas: HTMLCanvasElement
  /** 标记是否已释放资源 */
  private disposed = false

  /**
   * 构造函数，初始化渲染器适配器
   * 
   * @param config - 渲染器配置参数
   * 
   * @example
   * ```typescript
   * const config = {
   *   canvas: canvasElement,
   *   width: window.innerWidth,
   *   height: window.innerHeight,
   *   type: 'auto'  // 自动选择最佳渲染器
   * };
   * const adapter = new RendererAdapter(config);
   * await adapter.init();
   * ```
   */
  constructor(config: RendererConfig) {
    this.config = config
    this.canvas = config.canvas
  }

  /**
   * 初始化渲染器
   * 
   * 根据配置和浏览器支持情况，自动选择最佳渲染器。
   * 
   * @returns Promise，在初始化完成后解析
   */
  async init(): Promise<void> {
    if (this.disposed) {
      throw new Error('渲染器适配器已释放')
    }

    try {
      // 如果指定了渲染器类型，直接使用
      if (this.config.type === 'webgl') {
        this.initWebGL()
        return
      } else if (this.config.type === 'webgpu') {
        await this.initWebGPU()
        return
      }

      // 否则自动检测并选择最佳渲染器
      await this.initAuto()
    } catch (error) {
      console.error('渲染器初始化失败:', error)
      // 如果 WebGPU 初始化失败，降级到 WebGL
      if (this.rendererType === RendererType.WebGPU) {
        console.warn('WebGPU 初始化失败，降级到 WebGL...')
        this.initWebGL()
      } else {
        throw new Error(`渲染器初始化失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  /**
   * 自动检测并选择最佳渲染器
   * 
   * 策略：优先使用 WebGPU，只在以下情况降级到 WebGL：
   * 1. WebGPU API 不支持
   * 2. WebGPU 初始化失败
   * 3. 移动设备且 WebGPU 支持不完善（可选）
   * 
   * @private
   */
  private async initAuto(): Promise<void> {
    const webgpuSupported = this.isWebGPUSupported()
    const isMobileDevice = this.isMobileDevice()
    
    console.log('渲染器自动选择策略：')
    console.log(`  - WebGPU 支持: ${webgpuSupported ? '是' : '否'}`)
    console.log(`  - 移动设备: ${isMobileDevice ? '是' : '否'}`)
    
    // 优先尝试 WebGPU
    if (webgpuSupported) {
      try {
        console.log('正在尝试初始化 WebGPU 渲染器...')
        await this.initWebGPU()
        console.log('✓ WebGPU 渲染器已启用（高性能模式）')
        return
      } catch (error) {
        console.warn('WebGPU 渲染器初始化失败，降级到 WebGL:', error)
        console.log('降级原因：WebGPU 初始化失败')
        this.initWebGL()
      }
    } else {
      console.log('WebGPU 不支持，使用 WebGL 渲染器')
      this.initWebGL()
    }
  }

  /**
   * 初始化 WebGPU 渲染器
   * 
   * @private
   */
  private async initWebGPU(): Promise<void> {
    try {
      this.renderer = new WebGPURenderer(this.config)
      await this.renderer.init()
      this.rendererType = RendererType.WebGPU
      console.log('✓ WebGPU 渲染器已初始化')
    } catch (error) {
      console.error('WebGPU 渲染器初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化 WebGL 渲染器
   * 
   * @private
   */
  private initWebGL(): void {
    try {
      this.renderer = new Renderer(this.config)
      this.rendererType = RendererType.WebGL
      console.log('✓ WebGL 渲染器已初始化')
    } catch (error) {
      console.error('WebGL 渲染器初始化失败:', error)
      throw error
    }
  }

  /**
   * 检测 WebGPU 是否支持
   * 
   * @returns 是否支持 WebGPU
   * @private
   */
  private isWebGPUSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'gpu' in navigator &&
      (navigator as any).gpu !== null
    )
  }

  /**
   * 检测是否为移动设备
   * 
   * @returns 是否为移动设备
   * @private
   */
  private isMobileDevice(): boolean {
    // 检测用户代理字符串
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = [
      'android', 'iphone', 'ipad', 'ipod',
      'mobile', 'touch', 'tablet',
      'windows phone', 'blackberry'
    ]
    
    const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword))
    
    // 检查触摸支持
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // 检查屏幕尺寸（小屏幕通常是移动设备）
    const isSmallScreen = window.innerWidth <= 768
    
    return isMobileUA || (hasTouchSupport && isSmallScreen)
  }

  /**
   * 获取渲染器实例
   * 
   * @returns 渲染器实例
   */
  get renderer(): IRenderer {
    if (!this.renderer) {
      throw new Error('渲染器未初始化')
    }
    return this.renderer
  }

  /**
   * 获取 Three.js 场景实例
   * 
   * @returns 场景实例
   */
  get scene(): THREE.Scene {
    if (!this.renderer) {
      throw new Error('渲染器未初始化')
    }
    return this.renderer.scene
  }

  /**
   * 获取 Three.js 相机实例
   * 
   * @returns 相机实例
   */
  get camera(): THREE.Camera {
    if (!this.renderer) {
      throw new Error('渲染器未初始化')
    }
    return this.renderer.camera
  }

  /**
   * 渲染场景
   * 
   * @param scene - 要渲染的场景
   * @param camera - 相机
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.renderer) {
      console.error('渲染器未初始化')
      return
    }

    try {
      this.renderer.render(scene, camera)
    } catch (error) {
      console.error('渲染失败:', error)
      // 如果是 WebGPU 渲染失败，尝试降级到 WebGL
      if (this.rendererType === RendererType.WebGPU) {
        console.warn('WebGPU 渲染失败，降级到 WebGL...')
        this.renderer.dispose()
        this.initWebGL()
        // 重新渲染
        this.renderer.render(scene, camera)
      }
    }
  }

  /**
   * 调整渲染器大小
   * 
   * @param width - 新的宽度
   * @param height - 新的高度
   */
  resize(width: number, height: number): void {
    if (!this.renderer) {
      console.error('渲染器未初始化')
      return
    }

    this.renderer.resize(width, height)
  }

  /**
   * 释放渲染器资源
   * 
   * 清理所有资源，防止内存泄漏。
   * 重复调用此方法是安全的。
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    try {
      if (this.renderer) {
        this.renderer.dispose()
        this.renderer = null
      }
      this.disposed = true
      console.log('✓ 渲染器适配器资源已释放')
    } catch (error) {
      console.error('释放渲染器适配器资源失败:', error)
    }
  }

  /**
   * 获取渲染器类型
   * 
   * @returns 'webgl' 或 'webgpu'
   */
  getType(): 'webgl' | 'webgpu' {
    return this.rendererType
  }

  /**
   * 检查渲染器是否已初始化
   * 
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.renderer !== null && this.renderer.isInitialized()
  }

  /**
   * 获取当前渲染器信息
   * 
   * @returns 渲染器信息对象
   */
  getInfo(): {
    type: 'webgl' | 'webgpu'
    initialized: boolean
    webgpuSupported: boolean
    isMobile: boolean
    wasDowngraded: boolean
  } {
    return {
      type: this.rendererType,
      initialized: this.isInitialized(),
      webgpuSupported: this.isWebGPUSupported(),
      isMobile: this.isMobileDevice(),
      wasDowngraded: this.isWebGPUSupported() && this.rendererType === RendererType.WebGL
    }
  }
}