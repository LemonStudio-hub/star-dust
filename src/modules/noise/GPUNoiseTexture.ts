/**
 * GPU 噪声纹理
 * 
 * 将预计算的 3D 噪声纹理上传到 GPU。
 * 支持在计算着色器中采样。
 * 
 * @module noise/GPUNoiseTexture
 */

import { NoiseTexture } from './NoiseTexture'

/**
 * GPU 噪声纹理类
 * 
 * 管理 3D 噪声纹理在 GPU 上的存储和采样。
 * 
 * @class GPUNoiseTexture
 */
export class GPUNoiseTexture {
  /** GPU 设备 */
  private device: GPUDevice
  /** 3D GPU 纹理 */
  public texture: GPUTexture
  /** GPU 纹理视图 */
  public textureView: GPUTextureView
  /** GPU 采样器 */
  public sampler: GPUSampler
  /** 纹理尺寸 */
  public readonly size: number
  /** 是否已释放 */
  private disposed = false

  /**
   * 构造函数，初始化 GPU 噪声纹理
   * 
   * @param device - WebGPU 设备
   * @param noiseTexture - CPU 端的噪声纹理
   * 
   * @example
   * ```typescript
   * const cpuNoiseTexture = new NoiseTexture();
   * const gpuNoiseTexture = new GPUNoiseTexture(device, cpuNoiseTexture);
   * ```
   */
  constructor(device: GPUDevice, noiseTexture: NoiseTexture) {
    this.device = device
    this.size = noiseTexture.size

    console.log(`创建 GPU 3D 噪声纹理，尺寸: ${this.size}x${this.size}x${this.size}`)

    // 创建 3D GPU 纹理
    this.texture = this.createTexture()
    
    // 上传噪声数据
    this.uploadData(noiseTexture)
    
    // 创建纹理视图
    this.textureView = this.texture.createView()
    
    // 创建采样器
    this.sampler = this.createSampler()

    console.log('✓ GPU 3D 噪声纹理创建完成')
  }

  /**
   * 创建 3D GPU 纹理
   * 
   * @returns GPU 纹理
   * @private
   */
  private createTexture(): GPUTexture {
    const texture = this.device.createTexture({
      size: [this.size, this.size, this.size],
      format: 'rgb32float', // 3 个 float32 通道
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      dimension: '3d',
      mipLevelCount: 1
    })

    console.log(`纹理格式: rgb32float, 大小: ${this.size * this.size * this.size * 3 * 4} bytes`)
    
    return texture
  }

  /**
   * 上传噪声数据到 GPU
   * 
   * @param noiseTexture - CPU 端的噪声纹理
   * @private
   */
  private uploadData(noiseTexture: NoiseTexture): void {
    // 获取预计算的噪声数据
    const data = noiseTexture.getData()
    
    if (!data) {
      throw new Error('噪声纹理数据为空')
    }

    // 计算每行的字节数
    const bytesPerRow = this.size * 3 * 4 // width * 3 channels * 4 bytes
    
    // 上传整个 3D 纹理
    this.device.queue.writeTexture(
      {
        texture: this.texture
      },
      data,
      {
        bytesPerRow: bytesPerRow,
        rowsPerImage: this.size
      },
      [this.size, this.size, this.size]
    )

    console.log('✓ 噪声数据已上传到 GPU')
  }

  /**
   * 创建 GPU 采样器
   * 
   * @returns GPU 采样器
   * @private
   */
  private createSampler(): GPUSampler {
    const sampler = this.device.createSampler({
      magFilter: 'linear',  // 纹理放大时使用线性插值
      minFilter: 'linear',  // 纹理缩小时使用线性插值
      mipmapFilter: 'linear',
      addressModeU: 'repeat', // U 方向重复
      addressModeV: 'repeat', // V 方向重复
      addressModeW: 'repeat', // W 方向重复
      maxAnisotropy: 1
    })

    console.log('✓ 采样器已创建')

    return sampler
  }

  /**
   * 获取绑定组布局条目
   * 
   * 用于创建绑定组布局。
   * 
   * @returns 绑定组布局条目数组
   */
  getBindGroupLayoutEntries(): GPUBindGroupLayoutEntry[] {
    return [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          sampleType: 'float',
          viewDimension: '3d',
          multisampled: false
        }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        sampler: {}
      }
    ]
  }

  /**
   * 获取绑定组条目
   * 
   * 用于创建绑定组。
   * 
   * @param textureBinding - 纹理绑定点索引
   * @param samplerBinding - 采样器绑定点索引
   * @returns 绑定组条目数组
   */
  getBindGroupEntries(textureBinding: number, samplerBinding: number): GPUBindGroupEntry[] {
    return [
      {
        binding: textureBinding,
        resource: this.textureView
      },
      {
        binding: samplerBinding,
        resource: this.sampler
      }
    ]
  }

  /**
   * 释放纹理资源
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    console.log('正在释放 GPU 噪声纹理资源...')

    this.texture.destroy()
    this.disposed = true

    console.log('✓ GPU 噪声纹理资源已释放')
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
   * 获取纹理信息
   * 
   * @returns 纹理信息对象
   */
  getTextureInfo(): {
    size: number
    format: string
    dimensions: string
    memorySize: number
  } {
    return {
      size: this.size,
      format: 'rgb32float',
      dimensions: '3d',
      memorySize: this.size * this.size * this.size * 3 * 4
    }
  }
}

/**
 * 创建 GPU 噪声纹理工厂函数
 * 
 * @param device - WebGPU 设备
 * @param size - 纹理尺寸（默认 64）
 * @returns GPU 噪声纹理实例
 */
export async function createGPUNoiseTexture(
  device: GPUDevice,
  size: number = 64
): Promise<GPUNoiseTexture> {
  console.log(`正在预计算 3D 噪声纹理（${size}x${size}x${size}）...`)
  
  // 创建 CPU 端噪声纹理（预计算）
  const cpuNoiseTexture = new NoiseTexture(size)
  
  // 创建 GPU 端噪声纹理
  const gpuNoiseTexture = new GPUNoiseTexture(device, cpuNoiseTexture)
  
  return gpuNoiseTexture
}