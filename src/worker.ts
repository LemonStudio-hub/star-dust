// 粒子数量和参数
const PARTICLE_COUNT = 30000
const NOISE_SCALE = 0.02
const TIME_SCALE = 0.001
const MAX_SPEED = 0.1
const NOISE_OCTAVES = 4
const NOISE_PERSISTENCE = 0.5

// 简单的 3D 噪声函数（基于梯度噪声）
class SimplexNoise {
  private perm: number[] = []
  private grad3: number[][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ]

  constructor(seed: number = Math.random() * 10000) {
    // 初始化排列表
    this.perm = new Array(512)
    const p = new Array(256)
    for (let i = 0; i < 256; i++) {
      p[i] = i
    }

    // Fisher-Yates 洗牌
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((seed * i) % (i + 1))
      seed = (seed * 1664525 + 1013904223) % 4294967296
      const temp = p[i]
      p[i] = p[j]
      p[j] = temp
    }

    // 复制两次以避免模运算
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]
    }
  }

  private fastFloor(x: number): number {
    return x >= 0 ? Math.floor(x) : Math.floor(x) - 1
  }

  private dot(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z
  }

  private mix(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  // 3D 噪声函数
  noise3D(x: number, y: number, z: number): number {
    const X = this.fastFloor(x) & 255
    const Y = this.fastFloor(y) & 255
    const Z = this.fastFloor(z) & 255

    x -= this.fastFloor(x)
    y -= this.fastFloor(y)
    z -= this.fastFloor(z)

    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)

    const A = this.perm[X] + Y
    const AA = this.perm[A] + Z
    const AB = this.perm[A + 1] + Z
    const B = this.perm[X + 1] + Y
    const BA = this.perm[B] + Z
    const BB = this.perm[B + 1] + Z

    return this.mix(
      this.mix(
        this.mix(this.dot(this.grad3[this.perm[AA] & 15], x, y, z),
          this.dot(this.grad3[this.perm[BA] & 15], x - 1, y, z),
          u),
        this.mix(this.dot(this.grad3[this.perm[AB] & 15], x, y - 1, z),
          this.dot(this.grad3[this.perm[BB] & 15], x - 1, y - 1, z),
          u),
      v),
      this.mix(
        this.mix(this.dot(this.grad3[this.perm[AA + 1] & 15], x, y, z - 1),
          this.dot(this.grad3[this.perm[BA + 1] & 15], x - 1, y, z - 1),
          u),
        this.mix(this.dot(this.grad3[this.perm[AB + 1] & 15], x, y - 1, z - 1),
          this.dot(this.grad3[this.perm[BB + 1] & 15], x - 1, y - 1, z - 1),
          u),
      v),
      w
    )
  }
}

// 创建噪声生成器
const noise = new SimplexNoise()

// 分形布朗运动（FBM）
function fractalBrownianMotion(x: number, y: number, z: number, octaves: number, persistence: number): number {
  let total = 0
  let frequency = 1
  let amplitude = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    total += noise.noise3D(x * frequency, y * frequency, z * frequency) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= 2
  }

  return total / maxValue
}

// 更新粒子
function updateParticles(
  positions: Float32Array,
  velocities: Float32Array,
  time: number
): Float32Array {
  const len = positions.length

  for (let i = 0; i < len; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]

    // 使用 FBM 噪声场计算每个粒子的力
    const noiseX = fractalBrownianMotion(
      x * NOISE_SCALE,
      y * NOISE_SCALE,
      time * TIME_SCALE,
      NOISE_OCTAVES,
      NOISE_PERSISTENCE
    )

    const noiseY = fractalBrownianMotion(
      x * NOISE_SCALE + 1000,
      y * NOISE_SCALE + 1000,
      time * TIME_SCALE + 1000,
      NOISE_OCTAVES,
      NOISE_PERSISTENCE
    )

    const noiseZ = fractalBrownianMotion(
      x * NOISE_SCALE + 2000,
      y * NOISE_SCALE + 2000,
      time * TIME_SCALE + 2000,
      NOISE_OCTAVES,
      NOISE_PERSISTENCE
    )

    // 将噪声值转换为速度变化
    velocities[i] += noiseX * MAX_SPEED * 0.1
    velocities[i + 1] += noiseY * MAX_SPEED * 0.1
    velocities[i + 2] += noiseZ * MAX_SPEED * 0.1

    // 添加轻微的向心漂移（可选）
    const dist = Math.sqrt(x * x + y * y + z * z)
    if (dist > 30) {
      const factor = 0.0001
      velocities[i] -= x * factor
      velocities[i + 1] -= y * factor
      velocities[i + 2] -= z * factor
    }

    // 添加轻微的旋转分量
    velocities[i] += -z * 0.0005
    velocities[i + 1] += 0
    velocities[i + 2] += x * 0.0005

    // 限制速度
    const speed = Math.sqrt(
      velocities[i] * velocities[i] +
      velocities[i + 1] * velocities[i + 1] +
      velocities[i + 2] * velocities[i + 2]
    )

    if (speed > MAX_SPEED) {
      const factor = MAX_SPEED / speed
      velocities[i] *= factor
      velocities[i + 1] *= factor
      velocities[i + 2] *= factor
    }

    // 确保有最小速度，避免粒子静止
    if (speed < 0.01) {
      const angle = Math.random() * Math.PI * 2
      const minSpeed = 0.02
      velocities[i] += Math.cos(angle) * minSpeed
      velocities[i + 1] += Math.sin(angle) * minSpeed
      velocities[i + 2] += (Math.random() - 0.5) * minSpeed
    }

    // 更新位置
    positions[i] += velocities[i]
    positions[i + 1] += velocities[i + 1]
    positions[i + 2] += velocities[i + 2]

    // 边界检测
    const distanceSquared = x * x + y * y + z * z
    const maxDistanceSquared = 3600

    if (distanceSquared > maxDistanceSquared) {
      const scale = 0.02 + Math.random() * 0.15
      positions[i] *= scale
      positions[i + 1] *= scale
      positions[i + 2] *= scale

      // 重新随机速度，但保留噪声场的影响
      velocities[i] *= 0.5
      velocities[i + 1] *= 0.5
      velocities[i + 2] *= 0.5
    }
  }

  return positions
}

// 监听主线程消息
self.onmessage = (event: MessageEvent) => {
  const { positions, velocities, time } = event.data

  // 更新粒子
  const newPositions = updateParticles(positions, velocities, time)

  // 发送结果回主线程
  self.postMessage({ positions: newPositions, velocities })
}