/**
 * 渲染器适配器
 * 
 * 自动检测并选择最佳渲染器后端（WebGL 或 WebGPU）。
 * 提供统一的接口，隐藏底层实现细节。
 * 
 * @module renderer/RendererAdapter
 */

import * as THREE from 'three'
import { IRenderer, RendererConfig } from './IRenderer'
import { WebGPURenderer, isWebGPUSupported, createWebGPURenderer } from './WebGPURenderer'
import { Renderer } from './Renderer'

/**
 * 渲染器类型枚举
 * 
 * @enum RendererType
 */
export enum RendererType {
  WebGL = 'webgl',
  WebGPU = 'webgpu',
  Auto = 'auto'
}

/**
 * 渲染器适配器类
 * 
 * 根据配置和浏览器支持自动选择最佳渲染器。
 * 
 * @class RendererAdapter
 * @implements IRenderer
 */
export class RendererAdapter implements IRenderer {
  /** 当前渲染器实例 */
  private renderer: IRenderer | null = null
  /** 渲染器类型 */
  private rendererType: RendererType = RendererType.Auto
  /** 配置 */
  private config: RendererConfig

  /**
   * 构造函数，初始化渲染器适配器
   * 
   * @param config - 渲染器配置
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
    console.log('渲染器适配器已创建')
  }

  /**
   * 初始化渲染器
   * 
   * 根据 type 配置选择渲染器：
   * - 'auto': 自动检测并选择最佳渲染器（优先 WebGPU）
   * - 'webgpu': 强制使用 WebGPU
   * - 'webgl': 强制使用 WebGL
   * 
   * @throws {Error} 当初始化失败时抛出错误
   */
  async init(): Promise<void> {
    const type = this.config.type || RendererType.Auto

    console.log(`正在初始化渲染器，类型: ${type}`)

    if (type === RendererType.WebGPU) {
      // 强制使用 WebGPU
      await this.initWebGPU()
    } else if (type === RendererType.WebGL) {
      // 强制使用 WebGL
      this.initWebGL()
    } else {
      // 自动选择
      await this.autoSelectRenderer()
    }

    console.log(`✓ 渲染器初始化完成，使用: ${this.rendererType}`)
  }

  /**
   * 自动选择渲染器
   * 
   * 优先尝试 WebGPU，如果不可用则降级到 WebGL。
   * 
   * @private
   */
  private async autoSelectRenderer(): Promise<void> {
    console.log('正在检测 WebGPU 支持...')

    const webgpuSupported = await isWebGPUSupported()

    if (webgpuSupported) {
      console.log('✓ WebGPU 受支持，将使用 WebGPU 渲染器')
      await this.initWebGPU()
    } else {
      console.warn('⚠ WebGPU 不受支持，将降级到 WebGL 渲染器')
      this.initWebGL()
    }
  }

  /**
   * 初始化 WebGPU 渲染器
   * 
   * @throws {Error} 当 WebGPU 初始化失败时抛出错误
   * @private
   */
  private async initWebGPU(): Promise<void> {
    try {
      this.renderer = await createWebGPURenderer(this.config)
      this.rendererType = RendererType.WebGPU
    } catch (error) {
      console.error('WebGPU 初始化失败:', error)
      console.warn('尝试降级到 WebGL...')
      
      // 降级到 WebGL
      this.initWebGL()
      this.rendererType = RendererType.WebGL
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
    } catch (error) {
      console.error('WebGL 初始化失败:', error)
      throw new Error(`所有渲染器初始化失败: ${error instanceof Error ? error.message : String(error)}`)
    }
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

    this.renderer.render(scene, camera)
  }

  /**
   * 调整渲染器大小
   * 
   * @param width - 新的宽度
   * @param height - 新的高度
   */
  resize(width: number, height: number): void {
    if (!this.renderer) {
      return
    }

    this.renderer.resize(width, height)
  }

  /**
   * 释放渲染器资源
   */
  dispose(): void {
    if (!this.renderer) {
      return
    }

    console.log(`正在释放 ${this.rendererType} 渲染器资源...`)
    this.renderer.dispose()
    this.renderer = null
  }

  /**
   * 获取渲染器类型
   * 
   * @returns 当前渲染器类型
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
   * 获取 Three.js 渲染器实例
   * 
   * @returns Three.js 渲染器实例
   */
  get renderer(): THREE.WebRenderer {
    return (this.renderer as any)?.renderer
  }

  /**
   * 获取 Three.js 场景实例
   * 
   * @returns Three.js 场景实例
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
   * @returns Three.js 相机实例
   */
  get camera(): THREE.Camera {
    if (!this.renderer) {
      throw new Error('渲染器未初始化')
    }
    return this.renderer.camera
  }

  /**
   * 获取底层渲染器实例
   * 
   * @returns 底层渲染器实例（WebGLRenderer 或 WebGPURenderer）
   */
  get underlyingRenderer(): IRenderer {
    if (!this.renderer) {
      throw new Error('渲染器未初始化')
    }
    return this.renderer
  }
}

/**
 * 创建渲染器适配器工厂函数
 * 
 * @param config - 渲染器配置
 * @returns 渲染器适配器实例
 */
export async function createRendererAdapter(config: RendererConfig): Promise<RendererAdapter> {
  const adapter = new RendererAdapter(config)
  await adapter.init()
  return adapter
}