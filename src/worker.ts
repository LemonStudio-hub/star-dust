// 粒子数量和参数
const PARTICLE_COUNT = 30000
const NEIGHBOR_RADIUS = 8.0
const SEPARATION_RADIUS = 3.0
const MAX_SPEED = 0.15
const MAX_FORCE = 0.02
const CELL_SIZE = NEIGHBOR_RADIUS

// 空间划分网格
interface SpatialGrid {
  cells: Map<string, number[]>
}

// 创建空间网格
function createSpatialGrid(positions: Float32Array): SpatialGrid {
  const grid: Map<string, number[]> = new Map()

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3
    const x = positions[i3]
    const y = positions[i3 + 1]
    const z = positions[i3 + 2]

    // 计算网格坐标
    const cellX = Math.floor(x / CELL_SIZE)
    const cellY = Math.floor(y / CELL_SIZE)
    const cellZ = Math.floor(z / CELL_SIZE)

    const cellKey = `${cellX},${cellY},${cellZ}`

    if (!grid.has(cellKey)) {
      grid.set(cellKey, [])
    }
    grid.get(cellKey)!.push(i)
  }

  return { cells: grid }
}

// 获取邻近粒子
function getNeighborParticles(
  grid: SpatialGrid,
  idx: number,
  positions: Float32Array,
  radius: number
): number[] {
  const i3 = idx * 3
  const x = positions[i3]
  const y = positions[i3 + 1]
  const z = positions[i3 + 2]

  const cellX = Math.floor(x / CELL_SIZE)
  const cellY = Math.floor(y / CELL_SIZE)
  const cellZ = Math.floor(z / CELL_SIZE)

  const neighbors: number[] = []
  const cellRadius = Math.ceil(radius / CELL_SIZE)

  // 检查周围 3x3x3 的网格
  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const cellKey = `${cellX + dx},${cellY + dy},${cellZ + dz}`
        const cellParticles = grid.cells.get(cellKey)

        if (cellParticles) {
          neighbors.push(...cellParticles)
        }
      }
    }
  }

  return neighbors
}

// 分离规则
function applySeparation(
  idx: number,
  positions: Float32Array,
  velocities: Float32Array,
  grid: SpatialGrid
): [number, number, number] {
  const i3 = idx * 3
  const x = positions[i3]
  const y = positions[i3 + 1]
  const z = positions[i3 + 2]

  let steerX = 0, steerY = 0, steerZ = 0
  let count = 0

  const neighbors = getNeighborParticles(grid, idx, positions, SEPARATION_RADIUS)

  for (const j of neighbors) {
    if (idx === j) continue

    const j3 = j * 3
    const dx = x - positions[j3]
    const dy = y - positions[j3 + 1]
    const dz = z - positions[j3 + 2]

    const distSq = dx * dx + dy * dy + dz * dz
    const minDistSq = SEPARATION_RADIUS * SEPARATION_RADIUS

    if (distSq > 0 && distSq < minDistSq) {
      const dist = Math.sqrt(distSq)
      const factor = 1.0 - dist / SEPARATION_RADIUS
      steerX += dx / dist * factor
      steerY += dy / dist * factor
      steerZ += dz / dist * factor
      count++
    }
  }

  if (count > 0) {
    steerX /= count
    steerY /= count
    steerZ /= count

    const len = Math.sqrt(steerX * steerX + steerY * steerY + steerZ * steerZ)
    if (len > 0) {
      steerX = (steerX / len) * MAX_SPEED - velocities[i3]
      steerY = (steerY / len) * MAX_SPEED - velocities[i3 + 1]
      steerZ = (steerZ / len) * MAX_SPEED - velocities[i3 + 2]

      const steerLen = Math.sqrt(steerX * steerX + steerY * steerY + steerZ * steerZ)
      if (steerLen > MAX_FORCE) {
        steerX = (steerX / steerLen) * MAX_FORCE
        steerY = (steerY / steerLen) * MAX_FORCE
        steerZ = (steerZ / steerLen) * MAX_FORCE
      }
    }
  }

  return [steerX, steerY, steerZ]
}

// 对齐规则
function applyAlignment(
  idx: number,
  positions: Float32Array,
  velocities: Float32Array,
  grid: SpatialGrid
): [number, number, number] {
  const i3 = idx * 3
  let avgVelX = 0, avgVelY = 0, avgVelZ = 0
  let count = 0

  const neighbors = getNeighborParticles(grid, idx, positions, NEIGHBOR_RADIUS)

  for (const j of neighbors) {
    if (idx === j) continue

    const j3 = j * 3
    const dx = positions[i3] - positions[j3]
    const dy = positions[i3 + 1] - positions[j3 + 1]
    const dz = positions[i3 + 2] - positions[j3 + 2]

    const distSq = dx * dx + dy * dy + dz * dz

    if (distSq < NEIGHBOR_RADIUS * NEIGHBOR_RADIUS) {
      avgVelX += velocities[j3]
      avgVelY += velocities[j3 + 1]
      avgVelZ += velocities[j3 + 2]
      count++
    }
  }

  if (count > 0) {
    avgVelX /= count
    avgVelY /= count
    avgVelZ /= count

    const len = Math.sqrt(avgVelX * avgVelX + avgVelY * avgVelY + avgVelZ * avgVelZ)
    if (len > 0) {
      avgVelX = (avgVelX / len) * MAX_SPEED
      avgVelY = (avgVelY / len) * MAX_SPEED
      avgVelZ = (avgVelZ / len) * MAX_SPEED

      avgVelX -= velocities[i3]
      avgVelY -= velocities[i3 + 1]
      avgVelZ -= velocities[i3 + 2]

      const steerLen = Math.sqrt(avgVelX * avgVelX + avgVelY * avgVelY + avgVelZ * avgVelZ)
      if (steerLen > MAX_FORCE) {
        avgVelX = (avgVelX / steerLen) * MAX_FORCE
        avgVelY = (avgVelY / steerLen) * MAX_FORCE
        avgVelZ = (avgVelZ / steerLen) * MAX_FORCE
      }
    }

    return [avgVelX, avgVelY, avgVelZ]
  }

  return [0, 0, 0]
}

// 凝聚规则
function applyCohesion(
  idx: number,
  positions: Float32Array,
  velocities: Float32Array,
  grid: SpatialGrid
): [number, number, number] {
  const i3 = idx * 3
  let centerX = 0, centerY = 0, centerZ = 0
  let count = 0

  const neighbors = getNeighborParticles(grid, idx, positions, NEIGHBOR_RADIUS)

  for (const j of neighbors) {
    if (idx === j) continue

    const j3 = j * 3
    const dx = positions[i3] - positions[j3]
    const dy = positions[i3 + 1] - positions[j3 + 1]
    const dz = positions[i3 + 2] - positions[j3 + 2]

    const distSq = dx * dx + dy * dy + dz * dz

    if (distSq < NEIGHBOR_RADIUS * NEIGHBOR_RADIUS) {
      centerX += positions[j3]
      centerY += positions[j3 + 1]
      centerZ += positions[j3 + 2]
      count++
    }
  }

  if (count > 0) {
    centerX /= count
    centerY /= count
    centerZ /= count

    let dirX = centerX - positions[i3]
    let dirY = centerY - positions[i3 + 1]
    let dirZ = centerZ - positions[i3 + 2]

    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
    if (len > 0) {
      dirX = (dirX / len) * MAX_SPEED
      dirY = (dirY / len) * MAX_SPEED
      dirZ = (dirZ / len) * MAX_SPEED

      dirX -= velocities[i3]
      dirY -= velocities[i3 + 1]
      dirZ -= velocities[i3 + 2]

      const steerLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
      if (steerLen > MAX_FORCE) {
        dirX = (dirX / steerLen) * MAX_FORCE
        dirY = (dirY / steerLen) * MAX_FORCE
        dirZ = (dirZ / steerLen) * MAX_FORCE
      }
    }

    return [dirX, dirY, dirZ]
  }

  return [0, 0, 0]
}

// 更新粒子
function updateParticles(
  positions: Float32Array,
  velocities: Float32Array
): Float32Array {
  // 创建空间网格
  const grid = createSpatialGrid(positions)

  const separationWeight = 1.5
  const alignmentWeight = 1.0
  const cohesionWeight = 1.0

  const len = positions.length

  for (let i = 0; i < len; i += 3) {
    const idx = i / 3

    // 应用三条规则
    const [sepX, sepY, sepZ] = applySeparation(idx, positions, velocities, grid)
    const [aliX, aliY, aliZ] = applyAlignment(idx, positions, velocities, grid)
    const [cohX, cohY, cohZ] = applyCohesion(idx, positions, velocities, grid)

    // 组合所有力
    const forceX = sepX * separationWeight + aliX * alignmentWeight + cohX * cohesionWeight
    const forceY = sepY * separationWeight + aliY * alignmentWeight + cohY * cohesionWeight
    const forceZ = sepZ * separationWeight + aliZ * alignmentWeight + cohZ * cohesionWeight

    // 更新速度
    velocities[i] += forceX
    velocities[i + 1] += forceY
    velocities[i + 2] += forceZ

    // 限制最大速度
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

    // 更新位置
    positions[i] += velocities[i]
    positions[i + 1] += velocities[i + 1]
    positions[i + 2] += velocities[i + 2]

    // 边界检测
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]

    const distanceSquared = x * x + y * y + z * z
    const maxDistanceSquared = 3600

    if (distanceSquared > maxDistanceSquared) {
      const scale = 0.05 + Math.random() * 0.2
      positions[i] *= scale
      positions[i + 1] *= scale
      positions[i + 2] *= scale

      const angle = Math.random() * Math.PI * 2
      const newSpeed = 0.02 + Math.random() * 0.08
      velocities[i] = Math.cos(angle) * newSpeed
      velocities[i + 1] = Math.sin(angle) * newSpeed
      velocities[i + 2] = (Math.random() - 0.5) * newSpeed
    }
  }

  return positions
}

// 监听主线程消息
self.onmessage = (event: MessageEvent) => {
  const { positions, velocities } = event.data

  // 更新粒子
  const newPositions = updateParticles(positions, velocities)

  // 发送结果回主线程
  self.postMessage({ positions: newPositions, velocities })
}