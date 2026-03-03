// 粒子数量和参数
const PARTICLE_COUNT = 30000

// 简单的 3D 噪声函数
class SimpleNoise {
  constructor() {
    this.seed = Math.random() * 1000
  }

  // 简化的噪声函数
  noise(x: number, y: number, z: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + this.seed) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
  }
}

const noiseGen = new SimpleNoise()

// 更新粒子 - 最简单版本
function updateParticles(
  positions: Float32Array,
  velocities: Float32Array,
  time: number
): Float32Array {
  const len = positions.length

  for (let i = 0; i < len; i += 3) {
    const i3 = i

    // 获取当前位置
    const x = positions[i3]
    const y = positions[i3 + 1]
    const z = positions[i3 + 2]

    // 计算噪声值
    const noiseX = noiseGen.noise(x * 0.01, y * 0.01, time * 0.0001)
    const noiseY = noiseGen.noise(x * 0.01 + 100, y * 0.01 + 100, time * 0.0001 + 100)
    const noiseZ = noiseGen.noise(x * 0.01 + 200, y * 0.01 + 200, time * 0.0001 + 200)

    // 更新速度 - 增大系数让运动更明显
    velocities[i3] += noiseX * 0.5
    velocities[i3 + 1] += noiseY * 0.5
    velocities[i3 + 2] += noiseZ * 0.5

    // 限制速度
    const speed = Math.sqrt(
      velocities[i3] * velocities[i3] +
      velocities[i3 + 1] * velocities[i3 + 1] +
      velocities[i3 + 2] * velocities[i3 + 2]
    )

    const maxSpeed = 0.5
    if (speed > maxSpeed) {
      const factor = maxSpeed / speed
      velocities[i3] *= factor
      velocities[i3 + 1] *= factor
      velocities[i3 + 2] *= factor
    }

    // 更新位置
    positions[i3] += velocities[i3]
    positions[i3 + 1] += velocities[i3 + 1]
    positions[i3 + 2] += velocities[i3 + 2]

    // 边界检测
    const distSq = x * x + y * y + z * z
    const maxDistSq = 3600

    if (distSq > maxDistSq) {
      // 重置到中心附近
      positions[i3] *= 0.1
      positions[i3 + 1] *= 0.1
      positions[i3 + 2] *= 0.1

      // 重新随机速度
      velocities[i3] = (Math.random() - 0.5) * 0.1
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.1
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1
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