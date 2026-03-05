/**
 * WebGPU 渲染器
 * 
 * 基于 WebGPU API 的高性能渲染器实现。
 * 支持计算着色器和双缓冲机制。
 * 
 * @module renderer/WebGPURenderer
 */

import * as THREE from 'three'
import { IRenderer, RendererConfig } from './IRenderer'
import { GPUParticleBuffer } from '../particles/GPUParticleBuffer'
import { ComputeShader } from '../particles/ComputeShader'
import { RenderPipeline } from '../particles/RenderPipeline'
import { GPUNoiseTexture } from '../noise/GPUNoiseTexture'

/**
 * WebGPU 渲染器类
 * 
 * 实现基于 WebGPU 的渲染功能。
 * 
 * @class WebGPURenderer
 * @implements IRenderer
 */
export class WebGPURenderer implements IRenderer {
  /** WebGPU 设备 */
  public device: GPUDevice | null = null
  /** WebGPU 队列 */
  public queue: GPUQueue | null = null
  /** WebGPU 上下文 */
  public context: GPUCanvasContext | null = null
  /** Three.js 场景实例 */
  public scene: THREE.Scene
  /** Three.js 相机实例 */
  public camera: THREE.PerspectiveCamera
  /** Three.js 渲染器实例（用于兼容性） */
  public renderer: any = null
  /** Canvas 元素 */
  private canvas: HTMLCanvasElement
  /** 配置 */
  private config: RendererConfig
  /** 初始化状态 */
  private initialized = false
  /** 适配器 */
  private adapter: GPUAdapter | null = null
  /** 深度纹理 */
  private depthTexture: GPUTexture | null = null
  /** 粒子缓冲区 */
  private particleBuffer: GPUParticleBuffer | null = null
  /** 计算着色器 */
  private computeShader: ComputeShader | null = null
  /** 渲染管线 */
  private renderPipeline: RenderPipeline | null = null
  /** 噪声纹理 */
  private noiseTexture: GPUNoiseTexture | null = null
  /** 粒子数量 */
  private particleCount: number = 30000
  /** 粒子大小 */
  private particleSize: number = 1.2
  /** 边界半径 */
  private boundsRadius: number = 50
  /** 速度缩放因子 */
  private velocityScale: number = 0.08
  /** 最大速度限制 */
  private maxSpeed: number = 0.15

  /**
   * 构造函数，初始化 WebGPU 渲染器
   * 
   * @param config - 渲染器配置
   * 
   * @example
   * ```typescript
   * const config = {
   *   canvas: canvasElement,
   *   width: window.innerWidth,
   *   height: window.innerHeight,
   *   type: 'webgpu'
   * };
   * const webgpuRenderer = new WebGPURenderer(config);
   * await webgpuRenderer.init();
   * ```
   */
  constructor(config: RendererConfig) {
    this.config = config
    this.canvas = config.canvas
    this.scene = new THREE.Scene()
    this.camera = this.createCamera(config.width, config.height)
    
    console.log('WebGPU 渲染器已创建，等待初始化...')
  }

  /**
   * 初始化 WebGPU 设备和渲染器
   * 
   * @throws {Error} 当 WebGPU 不可用时抛出错误
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.warn('WebGPU 渲染器已经初始化')
      return
    }

    try {
      // 检查 WebGPU 支持
      if (!navigator.gpu) {
        throw new Error('WebGPU 不受此浏览器支持')
      }

      console.log('正在请求 WebGPU 适配器...')
      
      // 请求适配器
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: this.config.powerPreference || 'high-performance'
      })

      if (!this.adapter) {
        throw new Error('无法获取 WebGPU 适配器')
      }

      console.log('WebGPU 适配器已获取')
      console.log('适配器信息:', {
        vendor: this.adapter.info.vendor,
        architecture: this.adapter.info.architecture,
        device: this.adapter.info.device,
        description: this.adapter.info.description
      })

      // 请求设备
      console.log('正在请求 WebGPU 设备...')
      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxBufferSize: this.adapter.limits.maxBufferSize,
          maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize,
          maxComputeWorkgroupStorageSize: this.adapter.limits.maxComputeWorkgroupStorageSize,
        }
      })

      if (!this.device) {
        throw new Error('无法获取 WebGPU 设备')
      }

      console.log('WebGPU 设备已获取')
      this.queue = this.device.queue

      // 获取 Canvas 上下文
      console.log('正在获取 Canvas 上下文...')
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext

      if (!this.context) {
        throw new Error('无法获取 WebGPU Canvas 上下文')
      }

      // 配置 Canvas
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
      
      this.context.configure({
        device: this.device,
        format: presentationFormat,
        alphaMode: this.config.alpha ? 'premultiplied' : 'opaque',
        colorSpace: 'srgb'
      })

      console.log('WebGPU Canvas 已配置')
      console.log(`演示格式: ${presentationFormat}`)

      // 设置 Three.js 渲染器（如果使用 Three.js WebGPU 后端）
      // 注意：Three.js 0.160.0 的 WebGPU 支持仍处于实验阶段
      // 这里我们使用原生 WebGPU API 以获得更好的控制
      
      // 添加光照
      this.setupLights()

      // 初始化 WebGPU 粒子系统
      await this.initParticleSystem()

      this.initialized = true
      console.log('✓ WebGPU 渲染器初始化完成')
    } catch (error) {
      console.error('WebGPU 初始化失败:', error)
      throw new Error(`WebGPU 初始化失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 创建透视相机
   * 
   * @param width - 视口宽度
   * @param height - 视口高度
   * @returns 透视相机实例
   * @private
   */
  private createCamera(width: number, height: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 80
    return camera
  }

  /**
   * 设置场景光照
   * 
   * @private
   */
  private setupLights(): void {
    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    // 添加点光源
    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(50, 50, 50)
    this.scene.add(pointLight)
  }

  /**
   * 初始化 WebGPU 粒子系统
   * 
   * 创建粒子缓冲区、计算着色器、渲染管线和噪声纹理。
   * 
   * @private
   */
  private async initParticleSystem(): Promise<void> {
    if (!this.device) {
      throw new Error('WebGPU 设备未初始化')
    }

    console.log('初始化 WebGPU 粒子系统...')

    // 创建 CPU 噪声纹理
    const { NoiseTexture } = await import('../noise/NoiseTexture')
    console.log('创建 CPU 噪声纹理...')
    const cpuNoiseTexture = new NoiseTexture()

    // 创建 GPU 噪声纹理
    console.log('创建 GPU 噪声纹理...')
    this.noiseTexture = new GPUNoiseTexture(this.device, cpuNoiseTexture)

    // 创建粒子缓冲区
    console.log('创建粒子缓冲区...')
    this.particleBuffer = new GPUParticleBuffer(this.device, this.particleCount, this.boundsRadius)

    // 创建计算着色器
    console.log('创建计算着色器...')
    this.computeShader = new ComputeShader(this.device, {
      particleBuffer: this.particleBuffer,
      velocityScale: this.velocityScale,
      maxSpeed: this.maxSpeed,
      boundsRadius: this.boundsRadius,
      deltaTime: 0.016,
      noiseTexture: {
        textureView: this.noiseTexture.textureView,
        sampler: this.noiseTexture.sampler
      }
    })

    // 创建渲染管线
    console.log('创建渲染管线...')
    this.renderPipeline = new RenderPipeline({
      device: this.device,
      particleBuffer: this.particleBuffer,
      particleSize: this.particleSize,
      format: navigator.gpu.getPreferredCanvasFormat()
    })

    console.log('✓ WebGPU 粒子系统初始化完成')
  }

  /**
   * 渲染场景
   * 
   * @param scene - 要渲染的场景
   * @param camera - 相机
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.initialized || !this.device || !this.context) {
      console.error('WebGPU 渲染器未初始化')
      return
    }

    if (!this.computeShader || !this.renderPipeline || !this.particleBuffer) {
      console.error('WebGPU 粒子系统未初始化')
      return
    }

    // 更新相机参数
    this.renderPipeline.updateCamera(camera as THREE.PerspectiveCamera)

    // 创建命令编码器
    const commandEncoder = this.device.createCommandEncoder()

    // 执行计算着色器（更新粒子位置）
    this.computeShader.dispatch(commandEncoder, performance.now() / 1000)

    // 创建渲染通道
    const textureView = this.context.getCurrentTexture().createView()
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ],
      depthStencilAttachment: this.createDepthAttachment()
    }

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor)

    // 设置渲染管线并绘制粒子
    this.renderPipeline.render(renderPass)

    renderPass.end()

    // 提交命令
    this.device.queue.submit([commandEncoder.finish()])
  }

/**
   * 创建深度模板附件
   * 
   * @returns 深度模板附件描述符
   * @private
   */
  private createDepthAttachment(): GPURenderPassDepthStencilAttachment {
    if (!this.device || !this.canvas) {
      return {
        view: null as any,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    }

    // 如果深度纹理不存在或尺寸不匹配，则创建新的深度纹理
    if (!this.depthTexture) {
      this.depthTexture = this.device.createTexture({
        size: [this.canvas.width, this.canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      })
    }

    return {
      view: this.depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store'
    }
  }

  /**
   * 调整渲染器大小
   * 
   * @param width - 新的宽度
   * @param height - 新的高度
   */
  resize(width: number, height: number): void {
    // 更新相机宽高比
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    // 销毁旧的深度纹理
    if (this.depthTexture) {
      this.depthTexture.destroy()
      this.depthTexture = null
    }
  }

  /**
   * 释放渲染器资源
   */
  dispose(): void {
    if (!this.initialized) {
      return
    }

    console.log('正在释放 WebGPU 渲染器资源...')

    // 清理计算着色器
    if (this.computeShader) {
      this.computeShader.dispose()
      this.computeShader = null
    }

    // 清理渲染管线
    if (this.renderPipeline) {
      this.renderPipeline.dispose()
      this.renderPipeline = null
    }

    // 清理粒子缓冲区
    if (this.particleBuffer) {
      this.particleBuffer.dispose()
      this.particleBuffer = null
    }

    // 清理噪声纹理
    if (this.noiseTexture) {
      this.noiseTexture.dispose()
      this.noiseTexture = null
    }

    // 清理深度纹理
    if (this.depthTexture) {
      this.depthTexture.destroy()
      this.depthTexture = null
    }

    // 注意：WebGPU 资源会在设备销毁时自动释放
    // 但我们应该手动清理所有创建的缓冲区、纹理等

    this.device = null
    this.queue = null
    this.context = null
    this.adapter = null
    this.initialized = false

    console.log('✓ WebGPU 渲染器资源已释放')
  }

  /**
   * 获取渲染器类型
   * 
   * @returns 'webgpu'
   */
  getType(): 'webgl' | 'webgpu' {
    return 'webgpu'
  }

  /**
   * 检查渲染器是否已初始化
   * 
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 获取 WebGPU 设备信息
   * 
   * @returns 设备信息对象
   */
  getDeviceInfo(): Record<string, any> | null {
    if (!this.adapter) {
      return null
    }

    return {
      vendor: this.adapter.info.vendor,
      architecture: this.adapter.info.architecture,
      device: this.adapter.info.device,
      description: this.adapter.info.description
    }
  }
}

/**
 * 检查 WebGPU 支持
 * 
 * @returns 是否支持 WebGPU
 */
export async function isWebGPUSupported(): Promise<boolean> {
  if (!navigator.gpu) {
    return false
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch (error) {
    console.warn('WebGPU 支持检查失败:', error)
    return false
  }
}

/**
 * 创建 WebGPU 渲染器工厂函数
 * 
 * @param config - 渲染器配置
 * @returns WebGPU 渲染器实例
 * @throws {Error} 当 WebGPU 不可用时抛出错误
 */
export async function createWebGPURenderer(config: RendererConfig): Promise<WebGPURenderer> {
  const renderer = new WebGPURenderer(config)
  await renderer.init()
  return renderer
}