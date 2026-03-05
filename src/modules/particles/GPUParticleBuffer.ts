/**
 * GPU 粒子缓冲区
 * 
 * 管理 GPU 端的粒子数据缓冲区。
 * 提供数据的上传、下载和访问接口。
 * 
 * @module particles/GPUParticleBuffer
 */

/**
 * 粒子数据结构（GPU 端）
 * 
 * 在 GPU 中，粒子数据使用 16 字节对齐的结构（std140 布局）：
 * - position: vec3<f32> (12 bytes) + 4 bytes padding = 16 bytes (offset 0)
 * - velocity: vec3<f32> (12 bytes) + 4 bytes padding = 16 bytes (offset 16)
 * - color: vec3<f32> (12 bytes) + 4 bytes padding = 16 bytes (offset 32)
 * 总计: 48 bytes
 * 
 * @interface GPUParticle
 */
export interface GPUParticle {
  /** 位置 (x, y, z) */
  position: [number, number, number]
  /** 速度 (vx, vy, vz) */
  velocity: [number, number, number]
  /** 颜色 (r, g, b) */
  color: [number, number, number]
}

/**
 * GPU 粒子缓冲区配置接口
 * 
 * @interface GPUParticleBufferConfig
 */
export interface GPUParticleBufferConfig {
  /** 粒子数量 */
  count: number
  /** 粒子数据 */
  particles: GPUParticle[]
  /** 是否使用双缓冲 */
  doubleBuffer?: boolean
}

/**
 * GPU 粒子缓冲区类
 * 
 * 管理粒子数据在 GPU 上的存储。
 * 
 * @class GPUParticleBuffer
 */
export class GPUParticleBuffer {
  /** GPU 设备 */
  private device: GPUDevice
  /** 粒子数量 */
  public readonly count: number
  /** 粒子数据大小（字节） */
  private readonly particleSize: number = 48 // 16 字节对齐
  /** 总缓冲区大小 */
  private readonly bufferSize: number
  /** 主缓冲区 */
  public readonly buffer: GPUBuffer
  /** 双缓冲中的第二个缓冲区（可选） */
  private readonly bufferB: GPUBuffer | null = null
  /** 是否使用双缓冲 */
  private readonly doubleBuffer: boolean
  /** 当前缓冲区索引（用于双缓冲） */
  private currentBufferIndex = 0
  /** 是否已释放 */
  private disposed = false

  /**
   * 构造函数，初始化 GPU 粒子缓冲区
   * 
   * @param device - WebGPU 设备
   * @param config - 缓冲区配置
   * 
   * @example
   * ```typescript
   * const particles = [
   *   { position: [0, 0, 0], velocity: [0.1, 0, 0], color: [1, 0, 0] },
   *   // ... 更多粒子
   * ];
   * const config = { count: particles.length, particles, doubleBuffer: true };
   * const buffer = new GPUParticleBuffer(device, config);
   * ```
   */
  constructor(device: GPUDevice, config: GPUParticleBufferConfig) {
    this.device = device
    this.count = config.count
    this.doubleBuffer = config.doubleBuffer || false
    this.bufferSize = this.count * this.particleSize

    console.log(`创建 GPU 粒子缓冲区，粒子数量: ${this.count}`)
    console.log(`缓冲区大小: ${this.bufferSize} bytes (${(this.bufferSize / 1024).toFixed(2)} KB)`)

    // 创建主缓冲区
    this.buffer = this.createBuffer(config.particles)

    // 如果使用双缓冲，创建第二个缓冲区
    if (this.doubleBuffer) {
      this.bufferB = this.createBuffer(config.particles)
      console.log('✓ 双缓冲已创建')
    }

    console.log('✓ GPU 粒子缓冲区创建完成')
  }

  /**
   * 创建 GPU 缓冲区
   * 
   * @param particles - 粒子数据
   * @returns GPU 缓冲区
   * @private
   */
  private createBuffer(particles: GPUParticle[]): GPUBuffer {
    // 创建缓冲区
    const buffer = this.device.createBuffer({
      size: this.bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    })

    // 填充数据
    const mappedData = new Float32Array(buffer.getMappedRange())

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i]
      const offset = i * 12 // 每个粒子 12 个 float32 (48 字节 / 4)

      // Position (3 floats) + Padding (1 float) - offset 0-3
      mappedData[offset + 0] = particle.position[0]
      mappedData[offset + 1] = particle.position[1]
      mappedData[offset + 2] = particle.position[2]
      mappedData[offset + 3] = 0.0 // padding

      // Velocity (3 floats) + Padding (1 float) - offset 4-7
      mappedData[offset + 4] = particle.velocity[0]
      mappedData[offset + 5] = particle.velocity[1]
      mappedData[offset + 6] = particle.velocity[2]
      mappedData[offset + 7] = 0.0 // padding

      // Color (3 floats) + Padding (1 float) - offset 8-11
      mappedData[offset + 8] = particle.color[0]
      mappedData[offset + 9] = particle.color[1]
      mappedData[offset + 10] = particle.color[2]
      mappedData[offset + 11] = 0.0 // padding
    }

    // 取消映射
    buffer.unmap()

    return buffer
  }

  /**
   * 获取输入缓冲区
   * 
   * @returns 输入缓冲区
   */
  getInputBuffer(): GPUBuffer {
    if (this.disposed) {
      throw new Error('缓冲区已释放')
    }

    return this.currentBufferIndex === 0 ? this.buffer : (this.bufferB || this.buffer)
  }

  /**
   * 获取输出缓冲区
   * 
   * @returns 输出缓冲区
   */
  getOutputBuffer(): GPUBuffer {
    if (this.disposed) {
      throw new Error('缓冲区已释放')
    }

    return this.currentBufferIndex === 0 ? (this.bufferB || this.buffer) : this.buffer
  }

  /**
   * 交换缓冲区（用于双缓冲）
   * 
   * 必须在每次渲染循环后调用。
   */
  swapBuffers(): void {
    if (!this.doubleBuffer) {
      console.warn('未启用双缓冲，无法交换')
      return
    }

    this.currentBufferIndex = 1 - this.currentBufferIndex
  }

  /**
   * 读取粒子数据
   * 
   * 从 GPU 读取粒子数据到 CPU。
   * 注意：这是一个昂贵的操作，应该谨慎使用。
   * 
   * @returns 粒子数据数组
   */
  async readParticles(): Promise<GPUParticle[]> {
    if (this.disposed) {
      throw new Error('缓冲区已释放')
    }

    // 创建临时缓冲区用于读取
    const stagingBuffer = this.device.createBuffer({
      size: this.bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    })

    // 复制数据
    const encoder = this.device.createCommandEncoder()
    encoder.copyBufferToBuffer(
      this.buffer,
      0,
      stagingBuffer,
      0,
      this.bufferSize
    )
    this.device.queue.submit([encoder.finish()])

    // 映射并读取数据
    await stagingBuffer.mapAsync(GPUMapMode.READ)
    const mappedData = new Float32Array(stagingBuffer.getMappedRange())
    
    // 转换为粒子数组
    const particles: GPUParticle[] = []
    for (let i = 0; i < this.count; i++) {
      const offset = i * 12
      particles.push({
        position: [mappedData[offset + 0], mappedData[offset + 1], mappedData[offset + 2]],
        velocity: [mappedData[offset + 4], mappedData[offset + 5], mappedData[offset + 6]],
        color: [mappedData[offset + 8], mappedData[offset + 9], mappedData[offset + 10]]
      })
    }

    // 清理
    stagingBuffer.unmap()
    stagingBuffer.destroy()

    return particles
  }

  /**
   * 更新粒子数据
   * 
   * 将 CPU 端的粒子数据上传到 GPU。
   * 
   * @param particles - 新的粒子数据
   * @param bufferIndex - 要更新的缓冲区索引（0 或 1，默认当前缓冲区）
   */
  updateParticles(particles: GPUParticle[], bufferIndex?: number): void {
    if (this.disposed) {
      throw new Error('缓冲区已释放')
    }

    if (particles.length !== this.count) {
      throw new Error(`粒子数量不匹配：期望 ${this.count}，实际 ${particles.length}`)
    }

    // 创建临时数据数组
    const data = new Float32Array(this.count * 12)

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i]
      const offset = i * 12

      // Position (3 floats) + Padding (1 float) - offset 0-3
      data[offset + 0] = particle.position[0]
      data[offset + 1] = particle.position[1]
      data[offset + 2] = particle.position[2]
      data[offset + 3] = 0.0 // padding

      // Velocity (3 floats) + Padding (1 float) - offset 4-7
      data[offset + 4] = particle.velocity[0]
      data[offset + 5] = particle.velocity[1]
      data[offset + 6] = particle.velocity[2]
      data[offset + 7] = 0.0 // padding

      // Color (3 floats) + Padding (1 float) - offset 8-11
      data[offset + 8] = particle.color[0]
      data[offset + 9] = particle.color[1]
      data[offset + 10] = particle.color[2]
      data[offset + 11] = 0.0 // padding
    }

    // 写入到指定缓冲区
    const targetBuffer = bufferIndex === 1 ? (this.bufferB || this.buffer) : this.buffer
    this.device.queue.writeBuffer(targetBuffer, 0, data)
  }

  /**
   * 获取缓冲区绑定组布局条目
   * 
   * 用于创建绑定组布局。
   * 
   * @returns 绑定组布局条目
   */
  getBindGroupLayoutEntries(): GPUBindGroupLayoutEntry[] {
    return [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
        buffer: {
          type: 'read-only-storage'
        }
      }
    ]
  }

  /**
   * 获取绑定组条目
   * 
   * 用于创建绑定组。
   * 
   * @param binding - 绑定点索引
   * @param bufferIndex - 缓冲区索引（0 或 1，默认当前缓冲区）
   * @returns 绑定组条目
   */
  getBindGroupEntry(binding: number, bufferIndex?: number): GPUBindGroupEntry {
    const buffer = bufferIndex === 1 ? (this.bufferB || this.buffer) : this.buffer
    
    return {
      binding,
      resource: {
        buffer,
        offset: 0,
        size: this.bufferSize
      }
    }
  }

  /**
   * 释放缓冲区资源
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    console.log('正在释放 GPU 粒子缓冲区...')
    
    this.buffer.destroy()
    
    if (this.bufferB) {
      this.bufferB.destroy()
    }

    this.disposed = true
    console.log('✓ GPU 粒子缓冲区已释放')
  }

  /**
   * 检查是否已释放
   * 
   * @returns 是否已释放
   */
  isDisposed(): boolean {
    return this.disposed
  }

  /**
   * 获取缓冲区大小
   * 
   * @returns 缓冲区大小（字节）
   */
  getBufferSize(): number {
    return this.bufferSize
  }

  /**
   * 获取粒子大小
   * 
   * @returns 单个粒子的大小（字节）
   */
  getParticleSize(): number {
    return this.particleSize
  }
}

/**
 * 生成随机粒子数据
 * 
 * @param count - 粒子数量
 * @param boundsRadius - 边界半径
 * @returns 粒子数据数组
 */
export function generateRandomParticles(count: number, boundsRadius: number = 50): GPUParticle[] {
  const particles: GPUParticle[] = []

  // 颜色调色板
  const colorPalettes = [
    [1.0, 0.2, 0.5], // 粉色
    [0.2, 0.8, 1.0], // 蓝色
    [1.0, 0.9, 0.2], // 黄色
    [0.3, 1.0, 0.5], // 绿色
    [0.9, 0.2, 1.0], // 紫色
    [1.0, 0.4, 0.1], // 橙色
    [0.1, 0.9, 0.9], // 青色
    [1.0, 1.0, 1.0], // 白色
  ]

  for (let i = 0; i < count; i++) {
    // 在球体内随机分布
    const radius = Math.random() * boundsRadius
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    // 球坐标转笛卡尔坐标
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    // 随机初始速度
    const angle = Math.random() * Math.PI * 2
    const speed = 0.01 + Math.random() * 0.03
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const vz = (Math.random() - 0.5) * speed

    // 随机颜色
    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)]
    const brightness = 0.7 + Math.random() * 0.3
    const color = [
      palette[0] * brightness,
      palette[1] * brightness,
      palette[2] * brightness
    ] as [number, number, number]

    particles.push({
      position: [x, y, z],
      velocity: [vx, vy, vz],
      color
    })
  }

  return particles
}