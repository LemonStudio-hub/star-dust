/**
 * 渲染系统模块
 * 
 * 管理 WebGL 渲染器、场景和相机的创建与配置。
 * 提供高性能的 3D 渲染环境。
 * 
 * @module renderer/Renderer
 */

import * as THREE from 'three'

/**
 * 渲染器配置接口
 * 
 * @interface RendererConfig
 */
export interface RendererConfig {
  /** Canvas 元素 */
  canvas: HTMLCanvasElement
  /** 画布宽度 */
  width: number
  /** 画布高度 */
  height: number
}

/**
   * 渲染器类
 * 
 * 管理 WebGL 渲染器、场景和相机的创建与配置。
 * 提供高性能的 3D 渲染环境，支持各种渲染优化。
 * 
 * 主要功能：
 * - 创建和配置 WebGL 渲染器
 * - 创建和配置透视相机
 * - 创建和配置 3D 场景
 * - 添加光照
 * - 处理窗口大小调整
 * - 处理 WebGL 上下文丢失和恢复
 * 
 * @class Renderer
 */
export class Renderer {
  /** WebGL 渲染器实例 */
  public renderer: THREE.WebGLRenderer
  /** Three.js 场景实例 */
  public scene: THREE.Scene
  /** 透视相机实例 */
  public camera: THREE.PerspectiveCamera
  /** 上下文丢失回调 */
  private onContextLostCallback: (() => void) | null = null
  /** 上下文恢复回调 */
  private onContextRestoredCallback: (() => void) | null = null
  /**
   * 构造函数，初始化渲染器
   * 
   * @param config - 渲染器配置参数
   * 
   * @example
   * ```typescript
   * const config = {
   *   canvas: canvasElement,
   *   width: window.innerWidth,
   *   height: window.innerHeight
   * };
   * const renderer = new Renderer(config);
   * ```
   */
  constructor(config: RendererConfig) {
    this.scene = new THREE.Scene()
    this.camera = this.createCamera(config.width, config.height)
    this.renderer = this.createRenderer(config)
    this.setupLights()
    this.setupContextHandlers()
  }

  /**
   * 设置 WebGL 上下文事件处理器
   * 
   * @private
   */
  private setupContextHandlers(): void {
    const canvas = this.renderer.domElement

    // 监听上下文丢失事件
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      console.warn('WebGL 上下文丢失')
      if (this.onContextLostCallback) {
        this.onContextLostCallback()
      }
    }, false)

    // 监听上下文恢复事件
    canvas.addEventListener('webglcontextrestored', () => {
      console.info('WebGL 上下文已恢复，正在重新初始化...')
      if (this.onContextRestoredCallback) {
        this.onContextRestoredCallback()
      }
    }, false)
  }

  /**
   * 设置上下文丢失回调
   * 
   * @param callback - 上下文丢失时的回调函数
   */
  setContextLostCallback(callback: () => void): void {
    this.onContextLostCallback = callback
  }

  /**
   * 设置上下文恢复回调
   * 
   * @param callback - 上下文恢复时的回调函数
   */
  setContextRestoredCallback(callback: () => void): void {
    this.onContextRestoredCallback = callback
  }

  /**
   * 创建透视相机
   * 
   * 创建具有指定宽高比的透视相机，用于 3D 场景的视角控制。
   * 
   * @param width - 视口宽度
   * @param height - 视口高度
   * @returns 透视相机实例
   * @private
   */
  private createCamera(width: number, height: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 80  // 相机距离
    return camera
  }

  /**
   * 创建 WebGL 渲染器
   * 
   * 创建并配置 WebGL 渲染器，启用各种优化和渲染特性。
   * 
   * 渲染器配置：
   * - 抗锯齿（antialias）
   * - 透明背景（alpha）
   * - 高性能模式（powerPreference）
   * - 对数深度缓冲（logarithmicDepthBuffer）
   * - 电影级色调映射（ACES Filmic Tone Mapping）
   * 
   * @param config - 渲染器配置参数
   * @returns WebGL 渲染器实例
   * @private
   */
  private createRenderer(config: RendererConfig): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: true,                    // 启用抗锯齿
      alpha: true,                        // 启用透明背景
      powerPreference: 'high-performance', // 优先使用高性能 GPU
      stencil: false,                     // 禁用模板缓冲
      depth: true,                        // 启用深度缓冲
      logarithmicDepthBuffer: true        // 启用对数深度缓冲
    })

    // 设置渲染器大小
    renderer.setSize(config.width, config.height)
    
    // 设置像素比（限制最大值为 3）
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3))
    
    // 设置清除颜色为透明
    renderer.setClearColor(0x000000, 0)
    
    // 设置输出色彩空间为 sRGB
    renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // 设置色调映射为 ACES Filmic
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    
    // 设置色调映射曝光度
    renderer.toneMappingExposure = 1.0

    return renderer
  }

  /**
   * 设置场景光照
   * 
   * 添加环境光和点光源，为场景提供适当的照明。
   * 
   * @private
   */
  private setupLights(): void {
    // 添加环境光（提供基础照明）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    // 添加点光源（提供方向性照明）
    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(50, 50, 50)
    this.scene.add(pointLight)
  }

  /**
   * 处理窗口大小调整
   * 
   * 当窗口大小改变时，更新相机宽高比和渲染器大小。
   * 
   * @param width - 新的宽度
   * @param height - 新的高度
   * 
   * @example
   * ```typescript
   * renderer.resize(window.innerWidth, window.innerHeight);
   * ```
   */
  resize(width: number, height: number): void {
    // 更新相机宽高比
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    
    // 更新渲染器大小
    this.renderer.setSize(width, height)
  }

  /**
   * 渲染场景
   * 
   * 渲染当前场景和相机视角。
   * 
   * @example
   * ```typescript
   * renderer.render();
   * ```
   */
  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * 释放渲染器资源
   * 
   * 释放渲染器相关的资源，包括上下文和缓冲区。
   */
  dispose(): void {
    this.renderer.dispose()
  }
}