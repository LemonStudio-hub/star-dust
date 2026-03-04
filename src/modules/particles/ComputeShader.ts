/**
 * 计算着色器管理类
 * 
 * 管理 WebGPU 计算着色器的创建、配置和执行。
 * 
 * @module particles/ComputeShader
 */

import { GPUParticleBuffer } from './GPUParticleBuffer'

/**
 * 计算着色器配置接口
 * 
 * @interface ComputeShaderConfig
 */
export interface ComputeShaderConfig {
  /** 粒子缓冲区 */
  particleBuffer: GPUParticleBuffer
  /** 速度缩放因子 */
  velocityScale: number
  /** 最大速度限制 */
  maxSpeed: number
  /** 边界半径 */
  boundsRadius: number
  /** 帧间隔时间（秒） */
  deltaTime: number
  /** 噪声纹理（可选） */
  noiseTexture?: {
    textureView: GPUTextureView
    sampler: GPUSampler
  }
}

/**
 * 计算着色器类
 * 
 * 管理粒子更新的计算着色器。
 * 
 * @class ComputeShader
 */
export class ComputeShader {
  /** GPU 设备 */
  private device: GPUDevice
  /** 计算管线 */
  public pipeline: GPUComputePipeline
  /** 绑定组布局 */
  public bindGroupLayout: GPUBindGroupLayout
  /** 绑定组 */
  private bindGroup: GPUBindGroup
  /** 统一缓冲区 */
  private uniformBuffer: GPUBuffer
  /** 粒子缓冲区 */
  private particleBuffer: GPUParticleBuffer
  /** 配置 */
  private config: ComputeShaderConfig
  /** 是否已释放 */
  private disposed = false

  /**
   * 构造函数，初始化计算着色器
   * 
   * @param device - WebGPU 设备
   * @param config - 计算着色器配置
   * 
   * @example
   * ```typescript
   * const config = {
   *   particleBuffer: particleBuffer,
   *   velocityScale: 0.08,
   *   maxSpeed: 0.15,
   *   boundsRadius: 50,
   *   deltaTime: 0.016
   * };
   * const computeShader = new ComputeShader(device, config);
   * ```
   */
  constructor(device: GPUDevice, config: ComputeShaderConfig) {
    this.device = device
    this.config = config
    this.particleBuffer = config.particleBuffer

    console.log('创建计算着色器...')

    // 创建计算管线
    this.createPipeline()

    // 创建统一缓冲区
    this.createUniformBuffer()

    // 创建绑定组
    this.createBindGroup()

    console.log('✓ 计算着色器创建完成')
  }

  /**
   * 创建计算管线
   * 
   * @private
   */
  private createPipeline(): void {
    // 加载 WGSL 着色器代码
    const shaderCode = this.loadShaderCode()

    // 创建着色器模块
    const shaderModule = this.device.createShaderModule({
      code: shaderCode
    })

    // 创建绑定组布局条目
    const entries: GPUBindGroupLayoutEntry[] = [
      // 输入粒子缓冲区
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage'
        }
      },
      // 输出粒子缓冲区
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage'
        }
      },
      // 配置统一缓冲区
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'uniform'
        }
      }
    ]

    // 添加噪声纹理绑定（如果可用）
    if (this.config.noiseTexture) {
      entries.push(
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          texture: {
            sampleType: 'float',
            viewDimension: '3d',
            multisampled: false
          }
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          sampler: {}
        }
      )
    }

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries
    })

    // 创建计算管线
    this.pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout]
      }),
      compute: {
        module: shaderModule,
        entryPoint: 'updateParticles'
      }
    })

    console.log('✓ 计算管线已创建')
  }

  /**
   * 创建统一缓冲区
   * 
   * @private
   */
  private createUniformBuffer(): void {
    // ConfigUniform 结构体大小：
    // velocityScale: f32 (4 bytes)
    // maxSpeed: f32 (4 bytes)
    // boundsRadius: f32 (4 bytes)
    // time: f32 (4 bytes)
    // deltaTime: f32 (4 bytes)
    // particleCount: u32 (4 bytes)
    // _padding0: f32 (4 bytes)
    // _padding1: f32 (4 bytes)
    // 总计: 32 bytes (16 字节对齐)
    const uniformSize = 32

    this.uniformBuffer = this.device.createBuffer({
      size: uniformSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    // 初始化配置
    this.updateUniforms(0)
  }

  /**
   * 创建绑定组
   * 
   * @private
   */
  private createBindGroup(): void {
    const entries: GPUBindGroupEntry[] = [
      {
        binding: 0,
        resource: {
          buffer: this.particleBuffer.getInputBuffer()
        }
      },
      {
        binding: 1,
        resource: {
          buffer: this.particleBuffer.getOutputBuffer()
        }
      },
      {
        binding: 2,
        resource: {
          buffer: this.uniformBuffer
        }
      }
    ]

    // 添加噪声纹理绑定（如果可用）
    if (this.config.noiseTexture) {
      entries.push(
        {
          binding: 3,
          resource: this.config.noiseTexture.textureView
        },
        {
          binding: 4,
          resource: this.config.noiseTexture.sampler
        }
      )
    }

    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries
    })

    console.log('✓ 绑定组已创建')
  }

  /**
   * 更新统一缓冲区
   * 
   * @param time - 当前时间
   */
  updateUniforms(time: number): void {
    const uniformData = new Float32Array(8) // 32 bytes / 4 = 8 floats

    uniformData[0] = this.config.velocityScale
    uniformData[1] = this.config.maxSpeed
    uniformData[2] = this.config.boundsRadius
    uniformData[3] = time
    uniformData[4] = this.config.deltaTime
    uniformData[5] = this.particleBuffer.count
    uniformData[6] = 0.0 // padding
    uniformData[7] = 0.0 // padding

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData)
  }

  /**
   * 更新配置
   * 
   * @param config - 新的配置
   */
  updateConfig(config: Partial<ComputeShaderConfig>): void {
    if (config.velocityScale !== undefined) {
      this.config.velocityScale = config.velocityScale
    }
    if (config.maxSpeed !== undefined) {
      this.config.maxSpeed = config.maxSpeed
    }
    if (config.boundsRadius !== undefined) {
      this.config.boundsRadius = config.boundsRadius
    }
    if (config.deltaTime !== undefined) {
      this.config.deltaTime = config.deltaTime
    }
  }

  /**
   * 执行计算着色器
   * 
   * @param encoder - 命令编码器
   * @param time - 当前时间
   */
  dispatch(encoder: GPUCommandEncoder, time: number): void {
    if (this.disposed) {
      throw new Error('计算着色器已释放')
    }

    // 更新统一缓冲区
    this.updateUniforms(time)

    // 创建计算通道
    const computePass = encoder.beginComputePass()
    computePass.setPipeline(this.pipeline)
    computePass.setBindGroup(0, this.bindGroup)

    // 计算工作组数量
    // 每个工作组处理 256 个粒子
    const workgroupCount = Math.ceil(this.particleBuffer.count / 256)
    computePass.dispatchWorkgroups(workgroupCount)
    computePass.end()
  }

  /**
   * 加载着色器代码
   * 
   * @returns WGSL 着色器代码
   * @private
   */
  private loadShaderCode(): string {
    // 这里直接返回着色器代码
    // 在实际项目中，可以通过 import 或 fetch 加载
    return `
struct Particle {
  position: vec3<f32>,   // offset 0,  12 bytes
  _p0: f32,              // offset 12, 4 bytes padding
  velocity: vec3<f32>,   // offset 16, 12 bytes
  _p1: f32,              // offset 28, 4 bytes padding
  color: vec3<f32>,      // offset 32, 12 bytes
  _p2: f32               // offset 44, 4 bytes padding
}  // 总计: 48 bytes

struct ConfigUniform {
  velocityScale: f32,
  maxSpeed: f32,
  boundsRadius: f32,
  time: f32,
  deltaTime: f32,
  particleCount: u32,
  _padding0: f32,
  _padding1: f32,
}

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> config: ConfigUniform;
@group(0) @binding(3) var noiseTexture: texture_3d<f32>;
@group(0) @binding(4) var noiseSampler: sampler;

fn hash(index: u32) -> u32 {
  var state = index;
  state = (state ^ 2747636419u) * 2654435761u;
  state = (state ^ (state >> 16u)) * 2654435761u;
  state = (state ^ (state >> 16u)) * 2654435761u;
  return state;
}

fn hashToFloat(index: u32) -> f32 {
  return f32(hash(index)) / 4294967296.0;
}

fn sampleNoiseTexture(position: vec3<f32>, time: f32) -> vec3<f32> {
  let texSize = vec3<f32>(64.0, 64.0, 64.0);
  let scale = 0.008;
  let timeScale = 0.0001;
  
  let nx = ((position.x * scale) % 1.0 + 1.0) % 1.0;
  let ny = ((position.y * scale) % 1.0 + 1.0) % 1.0;
  let nz = ((position.z * scale + time * timeScale) % 1.0 + 1.0) % 1.0;
  
  let coord = vec3<f32>(nx, ny, nz);
  let noise = textureSample(noiseTexture, noiseSampler, coord);
  
  return noise * 2.0 - 1.0;
}

fn pseudoNoise(position: vec3<f32>, time: f32) -> vec3<f32> {
  let scale = 0.01;
  let x = sin(position.x * scale + time * 0.0001);
  let y = cos(position.y * scale + time * 0.0002);
  let z = sin(position.z * scale + time * 0.0003);
  return vec3<f32>(x, y, z);
}

fn resetParticle(index: u32) -> Particle {
  let h = hash(index + u32(config.time * 1000.0));
  let theta = hashToFloat(index) * 6.283185;
  let phi = acos(2.0 * hashToFloat(index + 1u) - 1.0);
  let radius = hashToFloat(index + 2u) * config.boundsRadius * 0.2;

  let position = vec3<f32>(
    radius * sin(phi) * cos(theta),
    radius * sin(phi) * sin(theta),
    radius * cos(phi)
  );

  let angle = hashToFloat(index + 3u) * 6.283185;
  let speed = 0.01 + hashToFloat(index + 4u) * 0.03;
  let velocity = vec3<f32>(
    cos(angle) * speed,
    sin(angle) * speed,
    (hashToFloat(index + 5u) - 0.5) * speed
  );

  let paletteIndex = hash(index) % 8u;
  var color = vec3<f32>(1.0, 1.0, 1.0);
  
  if (paletteIndex == 0u) {
    color = vec3<f32>(1.0, 0.2, 0.5);
  } else if (paletteIndex == 1u) {
    color = vec3<f32>(0.2, 0.8, 1.0);
  } else if (paletteIndex == 2u) {
    color = vec3<f32>(1.0, 0.9, 0.2);
  } else if (paletteIndex == 3u) {
    color = vec3<f32>(0.3, 1.0, 0.5);
  } else if (paletteIndex == 4u) {
    color = vec3<f32>(0.9, 0.2, 1.0);
  } else if (paletteIndex == 5u) {
    color = vec3<f32>(1.0, 0.4, 0.1);
  } else if (paletteIndex == 6u) {
    color = vec3<f32>(0.1, 0.9, 0.9);
  } else {
    color = vec3<f32>(1.0, 1.0, 1.0);
  }

  return Particle(position, velocity, color, 0.0);
}

@compute @workgroup_size(256)
fn updateParticles(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let index = globalId.x;
  
  if (index >= config.particleCount) {
    return;
  }

  var particle = particlesIn[index];

  let curl = sampleNoiseTexture(particle.position, config.time);

  particle.velocity += curl * config.velocityScale * config.deltaTime;

  let speed = length(particle.velocity);
  if (speed > config.maxSpeed) {
    particle.velocity = normalize(particle.velocity) * config.maxSpeed;
  }

  particle.position += particle.velocity * config.deltaTime;

  let distSq = dot(particle.position, particle.position);
  let boundsRadiusSq = config.boundsRadius * config.boundsRadius;

  if (distSq > boundsRadiusSq) {
    particle = resetParticle(index);
  }

  particlesOut[index] = particle;
}
`
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    console.log('正在释放计算着色器资源...')

    this.uniformBuffer.destroy()
    
    // 注意：pipeline 和 bindGroupLayout 不需要显式销毁
    // 它们会在 device 销毁时自动清理
    this.pipeline = null as any
    this.bindGroupLayout = null
    this.bindGroup = null
    
    this.disposed = true

    console.log('✓ 计算着色器资源已释放')
  }

  /**
   * 检查是否已释放
   * 
   * @returns 是否已释放
   */
  isDisposed(): boolean {
    return this.disposed
  }
}