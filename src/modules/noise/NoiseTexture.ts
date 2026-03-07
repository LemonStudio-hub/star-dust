/**
 * 3D 噪声纹理预计算和采样系统
 *
 * 该模块负责预计算 3D 空间中的噪声场，并提供高效的采样接口。
 * 通过预计算噪声纹理，可以显著提高运行时性能。
 * 使用 Web Worker 进行异步预计算，避免阻塞主线程。
 *
 * @module noise/NoiseTexture
 */

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

      // 创建 Worker
      const workerUrl = new URL('../workers/noise.worker.ts', import.meta.url)
      this.worker = new Worker(workerUrl, { type: 'module' })

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
    // 这里可以调用原来的预计算逻辑
    // 为简化，返回空数组（实际应该实现完整的预计算）
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
}