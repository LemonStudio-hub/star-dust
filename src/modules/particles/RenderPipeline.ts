/**
 * 粒子渲染管线
 * 
 * 管理 WebGPU 渲染管线，包括顶点着色器、片段着色器和渲染状态。
 * 
 * @module particles/RenderPipeline
 */

import { GPUDevice, GPUBuffer } from 'webgpu'
import { GPUParticleBuffer } from './GPUParticleBuffer'

/**
 * 渲染管线配置接口
 * 
 * @interface RenderPipelineConfig
 */
export interface RenderPipelineConfig {
  /** WebGPU 设备 */
  device: GPUDevice
  /** 粒子缓冲区 */
  particleBuffer: GPUParticleBuffer
  /** 粒子大小 */
  particleSize?: number
  /** 渲染格式 */
  format?: GPUTextureFormat
}

/**
 * 摄像机统一缓冲区数据结构
 * 
 * viewMatrix: mat4x4<f32> (64 bytes)
 * projectionMatrix: mat4x4<f32> (64 bytes)
 * cameraPosition: vec3<f32> (12 bytes)
 * _padding: f32 (4 bytes)
 * 总计: 144 bytes
 */
interface CameraUniform {
  viewMatrix: Float32Array
  projectionMatrix: Float32Array
  cameraPosition: Float32Array
}

/**
 * 渲染统一缓冲区数据结构
 * 
 * particleSize: f32 (4 bytes)
 * _padding0: f32 (4 bytes)
 * _padding1: f32 (4 bytes)
 * _padding2: f32 (4 bytes)
 * 总计: 16 bytes
 */
interface RenderUniform {
  particleSize: number
}

/**
 * 粒子渲染管线类
 * 
 * 管理 WebGPU 渲染管线的创建、配置和执行。
 * 
 * 主要功能：
 * - 加载着色器代码
 * - 创建渲染管线
 * - 管理统一缓冲区
 * - 更新摄像机参数
 * - 执行渲染命令
 * 
 * @class RenderPipeline
 */
export class RenderPipeline {
  /** WebGPU 设备 */
  private device: GPUDevice
  /** 粒子缓冲区 */
  private particleBuffer: GPUParticleBuffer
  /** 渲染管线 */
  private pipeline: GPURenderPipeline
  /** 绑定组布局 */
  private bindGroupLayout: GPUBindGroupLayout
  /** 绑定组 */
  private bindGroup: GPUBindGroup
  /** 摄像机统一缓冲区 */
  private cameraUniformBuffer: GPUBuffer
  /** 渲染统一缓冲区 */
  private renderUniformBuffer: GPUBuffer
  /** 摄像机参数 */
  private cameraUniform: CameraUniform
  /** 渲染参数 */
  private renderUniform: RenderUniform
  /** 标记是否已释放资源 */
  private disposed: boolean = false

  /**
   * 构造函数，初始化渲染管线
   * 
   * @param config - 渲染管线配置参数
   * 
   * @example
   * ```typescript
   * const renderPipeline = new RenderPipeline({
   *   device: device,
   *   particleBuffer: particleBuffer,
   *   particleSize: 1.2,
   *   format: 'bgra8unorm'
   * });
   * ```
   */
  constructor(config: RenderPipelineConfig) {
    this.device = config.device
    this.particleBuffer = config.particleBuffer

    // 初始化参数
    this.renderUniform = {
      particleSize: config.particleSize || 1.2
    }

    this.cameraUniform = {
      viewMatrix: new Float32Array(16),
      projectionMatrix: new Float32Array(16),
      cameraPosition: new Float32Array(3)
    }

    // 初始化摄像机矩阵（单位矩阵）
    this.cameraUniform.viewMatrix.fill(0)
    this.cameraUniform.viewMatrix[0] = 1
    this.cameraUniform.viewMatrix[5] = 1
    this.cameraUniform.viewMatrix[10] = 1
    this.cameraUniform.viewMatrix[15] = 1

    this.cameraUniform.projectionMatrix.fill(0)
    this.cameraUniform.projectionMatrix[0] = 1
    this.cameraUniform.projectionMatrix[5] = 1
    this.cameraUniform.projectionMatrix[10] = 1
    this.cameraUniform.projectionMatrix[15] = 1

    try {
      this.createRenderPipeline(config.format || 'bgra8unorm')
      this.createUniformBuffers()
      this.createBindGroup()

      console.log('✓ 渲染管线已创建')
    } catch (error) {
      console.error('创建渲染管线失败:', error)
      throw new Error(`渲染管线创建失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 加载着色器代码
   * 
   * @param shaderName - 着色器名称（不含扩展名）
   * @returns 着色器代码字符串
   * @private
   */
  private loadShaderCode(shaderName: string): string {
    // 这里使用内联着色器代码，避免文件 I/O
    if (shaderName === 'vertex') {
      return this.getVertexShaderCode()
    } else if (shaderName === 'fragment') {
      return this.getFragmentShaderCode()
    }
    throw new Error(`未知的着色器类型: ${shaderName}`)
  }

  /**
   * 获取顶点着色器代码
   * 
   * @returns WGSL 顶点着色器代码
   * @private
   */
  private getVertexShaderCode(): string {
    return `
struct Particle {
  position: vec3<f32>,   // offset 0,  12 bytes
  _p0: f32,              // offset 12, 4 bytes padding
  velocity: vec3<f32>,   // offset 16, 12 bytes
  _p1: f32,              // offset 28, 4 bytes padding
  color: vec3<f32>,      // offset 32, 12 bytes
  _p2: f32               // offset 44, 4 bytes padding
}  // 总计: 48 bytes

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) pointSize: f32,
}

struct CameraUniform {
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  _padding: f32,
}

struct RenderUniform {
  particleSize: f32,
  _padding0: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> camera: CameraUniform;
@group(0) @binding(2) var<uniform> render: RenderUniform;

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;
  
  let particle = particles[vertexIndex];
  
  let worldPosition = vec4<f32>(particle.position, 1.0);
  let viewPosition = camera.viewMatrix * worldPosition;
  output.position = camera.projectionMatrix * viewPosition;
  
  let distance = length(viewPosition.xyz);
  let attenuation = 1000.0 / max(distance, 1.0);
  output.pointSize = render.particleSize * attenuation;
  output.pointSize = clamp(output.pointSize, 1.0, 10.0);
  
  output.color = particle.color;
  
  return output;
}
`
  }

  /**
   * 获取片段着色器代码
   * 
   * @returns WGSL 片段着色器代码
   * @private
   */
  private getFragmentShaderCode(): string {
    return `
struct FragmentInput {
  @location(0) color: vec3<f32>,
  @location(1) pointSize: f32,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  return vec4<f32>(input.color, 0.9);
}
`
  }

  /**
   * 创建渲染管线
   * 
   * @param format - 颜色格式
   * @private
   */
  private createRenderPipeline(format: GPUTextureFormat): void {
    // 加载着色器代码
    const vertexShaderCode = this.loadShaderCode('vertex')
    const fragmentShaderCode = this.loadShaderCode('fragment')

    // 创建着色器模块
    const vertexShaderModule = this.device.createShaderModule({
      code: vertexShaderCode
    })

    const fragmentShaderModule = this.device.createShaderModule({
      code: fragmentShaderCode
    })

    // 创建绑定组布局
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        // 粒子缓冲区
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'read-only-storage'
          }
        },
        // 摄像机统一缓冲区
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        },
        // 渲染统一缓冲区
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        }
      ]
    })

    // 创建渲染管线
    this.pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout]
      }),
      vertex: {
        module: vertexShaderModule,
        entryPoint: 'main'
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: 'main',
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one',
                operation: 'add'
              }
            }
          }
        ]
      },
      primitive: {
        topology: 'point-list'
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    })

    console.log('✓ 渲染管线已创建')
  }

  /**
   * 创建统一缓冲区
   * 
   * @private
   */
  private createUniformBuffers(): void {
    // 摄像机统一缓冲区：144 bytes
    this.cameraUniformBuffer = this.device.createBuffer({
      size: 144,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    // 渲染统一缓冲区：16 bytes
    this.renderUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    // 上传初始数据
    this.updateCameraUniforms()
    this.updateRenderUniforms()

    console.log('✓ 统一缓冲区已创建')
  }

  /**
   * 创建绑定组
   * 
   * @private
   */
  private createBindGroup(): void {
    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.particleBuffer.getOutputBuffer()
          }
        },
        {
          binding: 1,
          resource: {
            buffer: this.cameraUniformBuffer
          }
        },
        {
          binding: 2,
          resource: {
            buffer: this.renderUniformBuffer
          }
        }
      ]
    })

    console.log('✓ 绑定组已创建')
  }

  /**
   * 更新摄像机统一缓冲区
   * 
   * @param viewMatrix - 视图矩阵
   * @param projectionMatrix - 投影矩阵
   * @param cameraPosition - 摄像机位置
   */
  updateCameraUniforms(
    viewMatrix?: Float32Array,
    projectionMatrix?: Float32Array,
    cameraPosition?: Float32Array
  ): void {
    if (viewMatrix) {
      this.cameraUniform.viewMatrix.set(viewMatrix)
    }
    if (projectionMatrix) {
      this.cameraUniform.projectionMatrix.set(projectionMatrix)
    }
    if (cameraPosition) {
      this.cameraUniform.cameraPosition.set(cameraPosition)
    }

// 上传到 GPU
    const data = new Float32Array(36)
    data.set(this.cameraUniform.viewMatrix, 0)      // 16 floats
    data.set(this.cameraUniform.projectionMatrix, 16) // 16 floats
    data.set(this.cameraUniform.cameraPosition, 32)   // 3 floats
    data[35] = 0  // padding，总共 36 floats = 144 bytes

    this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, data)
  }

  /**
   * 更新渲染统一缓冲区
   * 
   * @param particleSize - 粒子大小
   */
  updateRenderUniforms(particleSize?: number): void {
    if (particleSize !== undefined) {
      this.renderUniform.particleSize = particleSize
    }

    const data = new Float32Array([this.renderUniform.particleSize, 0, 0, 0])
    this.device.queue.writeBuffer(this.renderUniformBuffer, 0, data)
  }

  /**
   * 执行渲染命令
   * 
   * @param passEncoder - 渲染通道编码器
   * @param particleCount - 粒子数量
   */
  render(passEncoder: GPURenderPassEncoder, particleCount: number): void {
    if (this.disposed) {
      return
    }

    passEncoder.setPipeline(this.pipeline)
    passEncoder.setBindGroup(0, this.bindGroup)
    passEncoder.draw(particleCount)
  }

  /**
   * 释放渲染管线资源
   * 
   * 清理所有 GPU 资源，防止内存泄漏。
   * 重复调用此方法是安全的。
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    try {
      this.cameraUniformBuffer.destroy()
      this.renderUniformBuffer.destroy()
      
      // 注意：pipeline 和 bindGroupLayout 不需要显式销毁
      // 它们会在 device 销毁时自动清理
      // 但我们可以设置为 null 以便垃圾回收
      this.pipeline = null as any
      this.bindGroupLayout = null
      this.bindGroup = null
      
      this.disposed = true
      console.log('✓ 渲染管线资源已释放')
    } catch (error) {
      console.error('释放渲染管线资源失败:', error)
    }
  }
}