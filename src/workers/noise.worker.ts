/**
 * 噪声纹理计算 Web Worker
 *
 * 在 Web Worker 中预计算 3D 噪声纹理，避免阻塞主线程。
 *
 * @module workers/noise.worker
 */

// Worker 内部实现 FBM 噪声
class FBMNoise {
  private octaves: number
  private persistence: number
  private lacunarity: number

  constructor(octaves: number = 6, persistence: number = 0.65, lacunarity: number = 2.5) {
    this.octaves = octaves
    this.persistence = persistence
    this.lacunarity = lacunarity
  }

  // 简化的 Simplex 噪声实现
  private noise(x: number, y: number, z: number): number {
    // 简单的伪随机噪声
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    return n - Math.floor(n)
  }

  private fractalBrownianMotion(x: number, y: number, z: number): number {
    let total = 0
    let frequency = 1
    let amplitude = 1
    let maxValue = 0

    for (let i = 0; i < this.octaves; i++) {
      total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude
      maxValue += amplitude
      amplitude *= this.persistence
      frequency *= this.lacunarity
    }

    return total / maxValue
  }

  compute(x: number, y: number, z: number): number {
    return this.fractalBrownianMotion(x, y, z)
  }
}

/**
 * 预计算 3D 噪声纹理
 */
function precomputeNoise(size: number): Float32Array {
  const volume = size * size * size
  const fbm = new FBMNoise(6, 0.65, 2.5)

  // 存储三个标量噪声场
  const data1 = new Float32Array(volume)
  const data2 = new Float32Array(volume)
  const data3 = new Float32Array(volume)

  // 步骤 1：生成三个独立的噪声场
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = x + y * size + z * size * size

        // 归一化坐标到 [0, 1] 范围
        const nx = x / size
        const ny = y / size
        const nz = z / size

        // 生成三个独立的噪声层
        data1[idx] = fbm.compute(nx * 4, ny * 4, nz * 4)
        data2[idx] = fbm.compute(nx * 4 + 100, ny * 4 + 100, nz * 4 + 100)
        data3[idx] = fbm.compute(nx * 4 + 200, ny * 4 + 200, nz * 4 + 200)
      }
    }
  }

  // 步骤 2：计算 Curl 旋度场
  const curlData = new Float32Array(volume * 3)
  const epsilon = 1

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = x + y * size + z * size * size

        // 处理边界条件
        const xp1 = Math.min(x + 1, size - 1)
        const xm1 = Math.max(x - 1, 0)
        const yp1 = Math.min(y + 1, size - 1)
        const ym1 = Math.max(y - 1, 0)
        const zp1 = Math.min(z + 1, size - 1)
        const zm1 = Math.max(z - 1, 0)

        // 计算邻居的索引
        const idx_xp1 = xp1 + y * size + z * size * size
        const idx_xm1 = xm1 + y * size + z * size * size
        const idx_yp1 = x + yp1 * size + z * size * size
        const idx_ym1 = x + ym1 * size + z * size * size
        const idx_zp1 = x + y * size + zp1 * size * size
        const idx_zm1 = x + y * size + zm1 * size * size

        // 计算 Curl 分量
        const curlX = (data3[idx_yp1] - data3[idx_ym1]) / (2 * epsilon) -
                      (data2[idx_zp1] - data2[idx_zm1]) / (2 * epsilon)
        const curlY = (data1[idx_zp1] - data1[idx_zm1]) / (2 * epsilon) -
                      (data3[idx_xp1] - data3[idx_xm1]) / (2 * epsilon)
        const curlZ = (data2[idx_xp1] - data2[idx_xm1]) / (2 * epsilon) -
                      (data1[idx_yp1] - data1[idx_ym1]) / (2 * epsilon)

        // 存储结果
        curlData[idx] = curlX
        curlData[idx + volume] = curlY
        curlData[idx + volume * 2] = curlZ
      }
    }
  }

  return curlData
}

// 监听主线程消息
self.addEventListener('message', (event) => {
  const { size } = event.data

  try {
    console.log(`[Worker] 开始预计算 ${size}³ 噪声纹理...`)
    const startTime = performance.now()

    const data = precomputeNoise(size)

    const elapsed = performance.now() - startTime
    console.log(`[Worker] 噪声纹理预计算完成，耗时: ${elapsed.toFixed(2)}ms`)

    // 发送结果回主线程
    self.postMessage({
      success: true,
      data: data.buffer,
      elapsed: elapsed
    }, [data.buffer])
  } catch (error) {
    console.error('[Worker] 预计算失败:', error)
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
})