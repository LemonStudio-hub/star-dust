/**
 * 3D 噪声纹理预计算和采样系统
 *
 * 该模块负责预计算 3D 空间中的噪声场，并提供高效的采样接口。
 * 通过预计算噪声纹理，可以显著提高运行时性能。
 * 使用 Web Worker 进行异步预计算，避免阻塞主线程。
 *
 * @module noise/NoiseTexture
 */

import * as THREE from 'three'

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
 * 使用 Web Worker 进行异步预计算，避免阻塞主线程。
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
  /** Web Worker 实例 */
  private worker: Worker | null = null
  /** 预计算完成回调 */
  private readyCallback: (() => void) | null = null
  /** 标记是否已准备好 */
  private ready: boolean = false

  /**
   * 构造函数，初始化并预计算噪声纹理
   *
   * @param size - 纹理尺寸，默认 64。64³ = 262,144 个体素
   * @param callback - 预计算完成回调（可选）
   *
   * @example
   * ```typescript
   * const noiseTexture = new NoiseTexture(64, () => {
   *   console.log('噪声纹理已就绪');
   * });
   * const curl = noiseTexture.sample(x, y, z, time);
   * ```
   */
  constructor(size: number = 64, callback?: () => void) {
    this.size = size
    this.volume = size * size * size
    this.readyCallback = callback || null

    // 使用 Web Worker 异步预计算
    this.initializeWorker()
  }

  /**
   * 初始化 Web Worker
   *
   * 创建 Worker 并发送预计算请求。
   *
   * @private
   */
  private initializeWorker(): void {
    try {
      console.log('[主线程] 初始化 Web Worker 用于噪声纹理预计算...')

      // 使用 Blob URL 创建 Worker
      const workerCode = `
        // Worker 内部实现 FBM 噪声
        class SimplexNoise {
          constructor() {
            this.perm = new Uint8Array(512)
            const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]
            for (let i = 0; i < 256; i++) {
              this.perm[i] = p[i]
              this.perm[i + 256] = p[i]
            }
          }
          
          noise(x, y, z) {
            const X = Math.floor(x) & 255
            const Y = Math.floor(y) & 255
            const Z = Math.floor(z) & 255
            x -= Math.floor(x)
            y -= Math.floor(y)
            z -= Math.floor(z)
            const u = x * x * x * (x * (x * 6 - 15) + 10)
            const v = y * y * y * (y * (y * 6 - 15) + 10)
            const w = z * z * z * (z * (z * 6 - 15) + 10)
            const A = this.perm[X] + Y, AA = this.perm[A] + Z, AB = this.perm[A + 1] + Z
            const B = this.perm[X + 1] + Y, BA = this.perm[B] + Z, BB = this.perm[B + 1] + Z
            return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z)), this.lerp(u, this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z))), this.lerp(v, this.lerp(u, this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1)), this.lerp(u, this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1))))
          }
          
          grad(hash, x, y, z) {
            const h = hash & 15
            const u = h < 8 ? x : y
            const v = h < 4 ? y : h === 12 || h === 14 ? x : z
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
          }
          
          lerp(t, a, b) { return a + t * (b - a) }
        }

        class FBMNoise {
          constructor(octaves = 6, persistence = 0.65, lacunarity = 2.5) {
            this.octaves = octaves
            this.persistence = persistence
            this.lacunarity = lacunarity
            this.simplex = new SimplexNoise()
          }
          
          compute(x, y, z) {
            let total = 0, frequency = 1, amplitude = 1, maxValue = 0
            for (let i = 0; i < this.octaves; i++) {
              total += this.simplex.noise(x * frequency, y * frequency, z * frequency) * amplitude
              maxValue += amplitude
              amplitude *= this.persistence
              frequency *= this.lacunarity
            }
            return total / maxValue
          }
        }

        function precomputeNoise(size) {
          const volume = size * size * size
          const fbm = new FBMNoise(6, 0.65, 2.5)
          const data1 = new Float32Array(volume)
          const data2 = new Float32Array(volume)
          const data3 = new Float32Array(volume)
          
          for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) {
              for (let x = 0; x < size; x++) {
                const idx = x + y * size + z * size * size
                const nx = x / size, ny = y / size, nz = z / size
                data1[idx] = fbm.compute(nx * 4, ny * 4, nz * 4)
                data2[idx] = fbm.compute(nx * 4 + 100, ny * 4 + 100, nz * 4 + 100)
                data3[idx] = fbm.compute(nx * 4 + 200, ny * 4 + 200, nz * 4 + 200)
              }
            }
          }
          
          const curlData = new Float32Array(volume * 3)
          const epsilon = 1
          
          for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) {
              for (let x = 0; x < size; x++) {
                const idx = x + y * size + z * size * size
                const xp1 = Math.min(x + 1, size - 1), xm1 = Math.max(x - 1, 0)
                const yp1 = Math.min(y + 1, size - 1), ym1 = Math.max(y - 1, 0)
                const zp1 = Math.min(z + 1, size - 1), zm1 = Math.max(z - 1, 0)
                const idx_xp1 = xp1 + y * size + z * size * size
                const idx_xm1 = xm1 + y * size + z * size * size
                const idx_yp1 = x + yp1 * size + z * size * size
                const idx_ym1 = x + ym1 * size + z * size * size
                const idx_zp1 = x + y * size + zp1 * size * size
                const idx_zm1 = x + y * size + zm1 * size * size
                const curlX = (data3[idx_yp1] - data3[idx_ym1]) / (2 * epsilon) - (data2[idx_zp1] - data2[idx_zm1]) / (2 * epsilon)
                const curlY = (data1[idx_zp1] - data1[idx_zm1]) / (2 * epsilon) - (data3[idx_xp1] - data3[idx_xm1]) / (2 * epsilon)
                const curlZ = (data2[idx_xp1] - data2[idx_xm1]) / (2 * epsilon) - (data1[idx_yp1] - data1[idx_ym1]) / (2 * epsilon)
                curlData[idx] = curlX
                curlData[idx + volume] = curlY
                curlData[idx + volume * 2] = curlZ
              }
            }
          }
          
          return curlData
        }

        self.addEventListener('message', (event) => {
          const { size } = event.data
          try {
            console.log('[Worker] 开始预计算', size, '³ 噪声纹理...')
            const startTime = performance.now()
            const data = precomputeNoise(size)
            const elapsed = performance.now() - startTime
            console.log('[Worker] 噪声纹理预计算完成，耗时:', elapsed.toFixed(2), 'ms')
            self.postMessage({ success: true, data: data.buffer, elapsed: elapsed }, [data.buffer])
          } catch (error) {
            console.error('[Worker] 预计算失败:', error)
            self.postMessage({ success: false, error: String(error) })
          }
        })
      `
      
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      this.worker = new Worker(workerUrl, { type: 'module' })

      // 清理 Blob URL
      this.worker.addEventListener('terminate', () => {
        URL.revokeObjectURL(workerUrl)
      })

      // 监听 Worker 消息
      this.worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(event)
      })

      // 监听 Worker 错误
      this.worker.addEventListener('error', (error) => {
        console.error('[主线程] Web Worker 错误:', error)
        this.dispose()
      })

      // 发送预计算请求
      this.worker.postMessage({ size: this.size })
    } catch (error) {
      console.error('[主线程] 初始化 Web Worker 失败:', error)
      // 回退到同步预计算
      this.data = this.precomputeFallback()
      this.ready = true
      if (this.readyCallback) {
        this.readyCallback()
      }
    }
  }

  /**
   * 处理 Worker 消息
   *
   * @private
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { success, data, error, elapsed } = event.data

    if (success) {
      // 接收预计算的数据
      this.data = new Float32Array(data)
      this.ready = true
      console.log(`[主线程] 噪声纹理预计算完成，耗时: ${elapsed.toFixed(2)}ms`)

      // 调用回调
      if (this.readyCallback) {
        this.readyCallback()
        this.readyCallback = null
      }
    } else {
      console.error('[主线程] Worker 预计算失败:', error)
      this.dispose()
    }
  }

  /**
   * 回退到同步预计算（当 Worker 不可用时）
   *
   * @private
   */
  private precomputeFallback(): Float32Array {
    console.warn('[主线程] 使用同步预计算作为回退方案')
    
    // 动态导入 FBMNoise（避免循环依赖）
    import('./FBMNoise').then(({ FBMNoise }) => {
      const fbm = new FBMNoise(6, 0.65, 2.5)
      
      // 存储三个标量噪声场
      const data1 = new Float32Array(this.volume)
      const data2 = new Float32Array(this.volume)
      const data3 = new Float32Array(this.volume)
      
      // 步骤 1：生成三个独立的噪声场
      for (let z = 0; z < this.size; z++) {
        for (let y = 0; y < this.size; y++) {
          for (let x = 0; x < this.size; x++) {
            const idx = x + y * this.size + z * this.size * this.size
            
            // 归一化坐标到 [0, 1] 范围
            const nx = x / this.size
            const ny = y / this.size
            const nz = z / this.size
            
            // 生成三个独立的噪声层
            data1[idx] = fbm.noise(nx * 4, ny * 4, nz * 4)
            data2[idx] = fbm.noise(nx * 4 + 100, ny * 4 + 100, nz * 4 + 100)
            data3[idx] = fbm.noise(nx * 4 + 200, ny * 4 + 200, nz * 4 + 200)
          }
        }
      }
      
      // 步骤 2：计算 Curl 旋度场
      const curlData = new Float32Array(this.volume * 3)
      const epsilon = 1
      
      for (let z = 0; z < this.size; z++) {
        for (let y = 0; y < this.size; y++) {
          for (let x = 0; x < this.size; x++) {
            const idx = x + y * this.size + z * this.size * this.size
            
            // 处理边界条件
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
            
            // 计算 Curl 分量
            const curlX = (data3[idx_yp1] - data3[idx_ym1]) / (2 * epsilon) -
                          (data2[idx_zp1] - data2[idx_zm1]) / (2 * epsilon)
            const curlY = (data1[idx_zp1] - data1[idx_zm1]) / (2 * epsilon) -
                          (data3[idx_xp1] - data3[idx_xm1]) / (2 * epsilon)
            const curlZ = (data2[idx_xp1] - data2[idx_xm1]) / (2 * epsilon) -
                          (data1[idx_yp1] - data1[idx_ym1]) / (2 * epsilon)
            
            // 存储结果
            curlData[idx] = curlX
            curlData[idx + this.volume] = curlY
            curlData[idx + this.volume * 2] = curlZ
          }
        }
      }
      
      // 设置数据并标记为就绪
      this.data = curlData
      this.ready = true
      console.log('[主线程] 同步预计算完成')
      
      // 调用回调
      if (this.readyCallback) {
        this.readyCallback()
        this.readyCallback = null
      }
    }).catch((error) => {
      console.error('[主线程] 同步预计算失败:', error)
      // 创建空数据避免崩溃
      this.data = new Float32Array(this.volume * 3)
      this.ready = true
      if (this.readyCallback) {
        this.readyCallback()
        this.readyCallback = null
      }
    })
    
    // 返回空数组（数据会在异步中设置）
    return new Float32Array(this.volume * 3)
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
      console.warn('[主线程] 尝试采样已释放的噪声纹理')
      return { x: 0, y: 0, z: 0 }
    }

    if (!this.ready) {
      console.warn('[主线程] 噪声纹理尚未就绪')
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
   * 检查噪声纹理是否已准备好
   *
   * @returns 是否已准备好
   */
  isReady(): boolean {
    return this.ready && this.data !== null
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

    // 终止 Worker
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    // 释放数据
    this.data = null
    this.ready = false
    this.disposed = true
  }

  /**
   * 创建 Three.js 纹理对象
   *
   * 将预计算的噪声数据转换为 Three.js 纹理格式。
   * 用于 GPU 计算和渲染。
   *
   * @returns Three.js DataTexture 对象
   */
  createTexture(): THREE.DataTexture {
    if (!this.data || !this.ready) {
      console.warn('[NoiseTexture] 噪声数据尚未就绪，返回空纹理')
      return new THREE.DataTexture(
        new Float32Array(1),
        1,
        1,
        THREE.RGBAFormat,
        THREE.FloatType
      )
    }

    // 创建包含 XYZ 三个通道的纹理数据
    const size = this.size
    const textureData = new Float32Array(size * size * size * 4)

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = x + y * size + z * size * size
          const texIdx = (x + y * size + z * size * size) * 4

          textureData[texIdx] = this.data[idx]           // X
          textureData[texIdx + 1] = this.data[idx + this.volume]    // Y
          textureData[texIdx + 2] = this.data[idx + this.volume * 2]  // Z
          textureData[texIdx + 3] = 1.0
        }
      }
    }

    const texture = new THREE.DataTexture(
      textureData,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    )

    texture.needsUpdate = true
    return texture
  }
}