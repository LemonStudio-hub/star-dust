/**
 * 粒子工具函数
 *
 * 提供粒子系统的公共工具函数，避免代码重复。
 *
 * @module particles/particleUtils
 */

import * as THREE from 'three'

/**
 * 粒子初始化配置
 */
export interface ParticleInitConfig {
  count: number
  boundsRadius: number
  isAttractorMode: boolean
}

/**
 * 初始化粒子位置（球体内随机分布）
 *
 * @param positions - 粒子位置数组
 * @param config - 初始化配置
 */
/**
 * 初始化粒子位置
 *
 * 根据模式在球体内随机分布粒子位置。
 * - 吸引子模式: 在中心附近小范围随机分布
 * - 噪声场模式: 在整个球体内随机分布
 *
 * @param positions - 粒子位置数组 (Float32Array, 长度为 count * 3)
 * @param config - 初始化配置
 * @param config.count - 粒子数量
 * @param config.boundsRadius - 边界半径
 * @param config.isAttractorMode - 是否为吸引子模式
 *
 * @example
 * ```typescript
 * const positions = new Float32Array(40000 * 3)
 * initializeParticlePositions(positions, {
 *   count: 40000,
 *   boundsRadius: 60,
 *   isAttractorMode: false
 * })
 * ```
 */
export function initializeParticlePositions(
  positions: Float32Array,
  config: ParticleInitConfig
): void {
  for (let i = 0; i < config.count; i++) {
    const i3 = i * 3

    if (config.isAttractorMode) {
      // 吸引子模式：初始化在中心附近
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 5
      positions[i3] = radius * Math.cos(angle)
      positions[i3 + 1] = radius * Math.sin(angle)
      positions[i3 + 2] = Math.random() * 2 - 1
    } else {
      // 噪声场模式：在球体内随机分布
      const radius = Math.random() * config.boundsRadius
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)
    }
  }
}

/**
 * 初始化粒子速度（随机初始速度）
 *
 * @param velocities - 粒子速度数组
 * @param count - 粒子数量
 */
export function initializeParticleVelocities(velocities: Float32Array, count: number): void {
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const angle = Math.random() * Math.PI * 2
    const speed = 0.01 + Math.random() * 0.03
    
    velocities[i3] = Math.cos(angle) * speed
    velocities[i3 + 1] = Math.sin(angle) * speed
    velocities[i3 + 2] = (Math.random() - 0.5) * speed
  }
}

/**
 * 重置粒子速度为零
 *
 * @param velocities - 粒子速度数组
 * @param startIdx - 起始索引
 */
export function resetParticleVelocity(velocities: Float32Array, startIdx: number): void {
  velocities[startIdx] = 0
  velocities[startIdx + 1] = 0
  velocities[startIdx + 2] = 0
}

/**
 * 重置粒子到中心附近
 *
 * @param positions - 粒子位置数组
 * @param i - 粒子索引
 */
export function resetParticleToCenter(positions: Float32Array, i: number): void {
  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * 5
  
  positions[i] = radius * Math.cos(angle)
  positions[i + 1] = radius * Math.sin(angle)
  positions[i + 2] = Math.random() * 2 - 1
}

/**
 * 重置粒子到中心并赋予随机速度
 *
 * @param positions - 粒子位置数组
 * @param velocities - 粒子速度数组
 * @param i - 粒子索引
 */
export function resetParticleWithRandomVelocity(
  positions: Float32Array,
  velocities: Float32Array,
  i: number
): void {
  positions[i] *= 0.1
  positions[i + 1] *= 0.1
  positions[i + 2] *= 0.1
  
  velocities[i] = (Math.random() - 0.5) * 0.05
  velocities[i + 1] = (Math.random() - 0.5) * 0.05
  velocities[i + 2] = (Math.random() - 0.5) * 0.05
}

/**
 * 限制粒子速度
 *
 * @param velocities - 粒子速度数组
 * @param i - 粒子索引
 * @param maxSpeed - 最大速度
 */
export function limitParticleVelocity(velocities: Float32Array, i: number, maxSpeed: number): void {
  const speed = Math.sqrt(
    velocities[i] ** 2 +
    velocities[i + 1] ** 2 +
    velocities[i + 2] ** 2
  )
  
  if (speed > maxSpeed) {
    const factor = maxSpeed / speed
    velocities[i] *= factor
    velocities[i + 1] *= factor
    velocities[i + 2] *= factor
  }
}

/**
 * 检查粒子是否超出边界
 *
 * @param positions - 粒子位置数组
 * @param i - 粒子索引
 * @param boundsRadius - 边界半径
 * @returns 是否超出边界
 */
export function isParticleOutOfBounds(
  positions: Float32Array,
  i: number,
  boundsRadius: number
): boolean {
  const x = positions[i]
  const y = positions[i + 1]
  const z = positions[i + 2]
  
  const dist = Math.sqrt(x * x + y * y + z * z)
  return dist > boundsRadius
}

/**
 * 创建圆形渐变纹理
 *
 * @returns Three.js Canvas 纹理
 */
export function createCircularTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('无法创建 Canvas 2D 上下文')
  }

  // 创建径向渐变
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)')
  gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  return texture
}

/**
 * 计算透视衰减系数
 *
 * @param fov - 相机视角（度）
 * @param distance - 相机距离
 * @param parallaxStrength - 视差强度
 * @returns 透视衰减系数
 */
export function calculatePerspectiveScale(
  fov: number,
  distance: number,
  parallaxStrength: number
): number {
  const fovRad = (fov * Math.PI) / 180
  return Math.tan(fovRad / 2) * distance * parallaxStrength
}