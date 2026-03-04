/**
 * 3D 噪声纹理预计算和采样系统
 * 
 * 该模块负责预计算 3D 空间中的噪声场，并提供高效的采样接口。
 * 通过预计算噪声纹理，可以显著提高运行时性能。
 * 
 * @module noise/NoiseTexture
 */

import { FBMNoise } from './FBMNoise'

/**
 * 三维向量接口
 * 
 * @interface NoiseVector
 */
export interface NoiseVector {
  /** X 分量 */
  x: number
  /** Y 分量 */
  y: number
  /** Z 分量 */
  z: number
}

/**
 * 3D 噪声纹理管理器
 * 
 * 预计算并存储 3D 空间中的 Curl 旋度噪声场。
 * 通过预计算避免了运行时的重复噪声计算，大幅提升性能。
 * 
 * 预计算内容：
 * - 三个独立的 FBM 噪声场
 * - 基于噪声场计算的 Curl 旋度场
 * - 旋度场用于生成无散度的流体运动
 * 
 * @class NoiseTexture
 */
export class NoiseTexture {
  /** 存储预计算的噪声数据（XYZ 三个分量） */
  private data: Float32Array | null = null
  /** 纹理尺寸（立方体边长） */
  public readonly size: number
  /** 纹理体积（总像素数） */
  public readonly volume: number
  /** 标记是否已释放资源 */
  private disposed: boolean = false

  /**
   * 构造函数，初始化并预计算噪声纹理
   * 
   * @param size - 纹理尺寸，默认 64。64³ = 262,144 个体素
   * 
   * @example
   * ```typescript
   * const noiseTexture = new NoiseTexture(64);
   * const curl = noiseTexture.sample(x, y, z, time);
   * ```
   */
  constructor(size: number = 64) {
    this.size = size
    this.volume = size * size * size
    this.data = this.precompute()
  }

  /**
   * 预计算 3D 噪声纹理
   * 
   * 该方法执行以下步骤：
   * 1. 生成三个独立的 FBM 噪声场
   * 2. 使用有限差分法计算 Curl 旋度场
   * 3. 存储结果为紧凑的 Float32Array
   * 
   * 预计算时间：约 200-500ms（取决于硬件）
   * 
   * @returns 包含 Curl 向量场的 Float32Array
   * @private
   */
  private precompute(): Float32Array {
    try {
      console.log('开始预计算3D噪声纹理...')
      const startTime = performance.now()
      
      // 创建 FBM 噪声生成器
      const fbm = new FBMNoise(6, 0.65, 2.5)
    
    // 存储三个标量噪声场
    const data1 = new Float32Array(this.volume)
    const data2 = new Float32Array(this.volume)
    const data3 = new Float32Array(this.volume)
    
    // 步骤 1：生成三个独立的噪声场
    // 每个场使用不同的偏移量以产生不同的噪声模式
    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          const idx = x + y * this.size + z * this.size * this.size
          
          // 归一化坐标到 [0, 1] 范围
          const nx = x / this.size
          const ny = y / this.size
          const nz = z / this.size
          
          // 生成三个独立的噪声层，使用不同偏移
          data1[idx] = fbm.noise(nx * 4, ny * 4, nz * 4)
          data2[idx] = fbm.noise(nx * 4 + 100, ny * 4 + 100, nz * 4 + 100)
          data3[idx] = fbm.noise(nx * 4 + 200, ny * 4 + 200, nz * 4 + 200)
        }
      }
    }
    
    // 步骤 2：计算 Curl 旋度场
    // Curl 产生无散度的向量场，适合模拟流体运动
    const curlData = new Float32Array(this.volume * 3)
    const epsilon = 1  // 有限差分的步长
    
    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          const idx = x + y * this.size + z * this.size * this.size
          
          // 处理边界条件（避免越界）
          const xp1 = Math.min(x + 1, this.size - 1)
          const xm1 = Math.max(x - 1, 0)
          const yp1 = Math.min(y + 1, this.size - 1)
          const ym1 = Math.max(y - 1, 0)
          const zp1 = Math.min(z + 1, this.size - 1)
          const zm1 = Math.max(z - 1, 0)
          
          // 计算邻居的索引
          const idx_xp1 = xp1 + y * this.size + z * this.size * this.size
          const idx_xm1 = xm1 + y * this.size + z * this.size * this.size
          const idx_yp1 = x + yp1 * this.size + z * this.size * this.size
          const idx_ym1 = x + ym1 * this.size + z * this.size * this.size
          const idx_zp1 = x + y * this.size + zp1 * this.size * this.size
          const idx_zm1 = x + y * this.size + zm1 * this.size * this.size
          
          // 计算 Curl 分量（有限差分法）
          // Curl X = ∂Fz/∂y - ∂Fy/∂z
          const curlX = (data3[idx_yp1] - data3[idx_ym1]) / (2 * epsilon) -
                        (data2[idx_zp1] - data2[idx_zm1]) / (2 * epsilon)
          // Curl Y = ∂Fx/∂z - ∂Fz/∂x
          const curlY = (data1[idx_zp1] - data1[idx_zm1]) / (2 * epsilon) -
                        (data3[idx_xp1] - data3[idx_xm1]) / (2 * epsilon)
          // Curl Z = ∂Fy/∂x - ∂Fx/∂y
          const curlZ = (data2[idx_xp1] - data2[idx_xm1]) / (2 * epsilon) -
                        (data1[idx_yp1] - data1[idx_ym1]) / (2 * epsilon)
          
          // 存储结果
          curlData[idx] = curlX
          curlData[idx + this.volume] = curlY
          curlData[idx + this.volume * 2] = curlZ
        }
      }
    }
    
    const elapsed = performance.now() - startTime
      console.log(`3D噪声纹理预计算完成，耗时: ${elapsed.toFixed(2)}ms`)
      
      return curlData
    } catch (error) {
      console.error('预计算3D噪声纹理失败:', error)
      throw new Error(`噪声纹理预计算失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 从预计算纹理中采样噪声向量
   * 
   * 该方法将世界坐标映射到纹理坐标，然后返回对应的噪声向量。
   * 
   * 映射方式：
   * - 世界坐标按比例缩放到 [0, 1] 范围
   * - 时间维度提供时变效果
   * - 使用最近邻采样（可通过插值改进）
   * 
   * @param x - 世界空间 X 坐标
   * @param y - 世界空间 Y 坐标
   * @param z - 世界空间 Z 坐标
   * @param time - 时间参数，用于动画效果
   * @param scale - 空间缩放因子，默认 0.008
   * @param timeScale - 时间缩放因子，默认 0.0001
   * @returns 噪声向量，包含 X、Y、Z 三个分量
   * 
   * @example
   * ```typescript
   * const curl = noiseTexture.sample(
   *   particle.x,
   *   particle.y,
   *   particle.z,
   *   currentTime
   * );
   * particle.velocity.x += curl.x * velocityScale;
   * ```
   */
  sample(x: number, y: number, z: number, time: number, scale: number = 0.008, timeScale: number = 0.0001): NoiseVector {
    if (this.disposed || !this.data) {
      console.warn('尝试采样已释放的噪声纹理')
      return { x: 0, y: 0, z: 0 }
    }
    
    // 将世界坐标归一化到 [0, 1] 范围
    const nx = ((x * scale) % 1 + 1) % 1
    const ny = ((y * scale) % 1 + 1) % 1
    const nz = ((z * scale + time * timeScale) % 1 + 1) % 1
    
    // 映射到纹理坐标
    const tx = Math.floor(nx * (this.size - 1))
    const ty = Math.floor(ny * (this.size - 1))
    const tz = Math.floor(nz * (this.size - 1))
    
    // 计算线性索引
    const idx = tx + ty * this.size + tz * this.size * this.size
    
    // 返回噪声向量
    return {
      x: this.data[idx],
      y: this.data[idx + this.volume],
      z: this.data[idx + this.volume * 2]
    }
  }

  /**
   * 释放纹理数据内存
   * 
   * 当不再需要噪声纹理时调用此方法释放内存。
   * 重复调用此方法是安全的。
   */
  dispose(): void {
    if (this.disposed) {
      return
    }
    
    this.data = null
    this.disposed = true
  }
}