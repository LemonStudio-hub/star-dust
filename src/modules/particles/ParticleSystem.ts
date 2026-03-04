/**
 * 粒子系统模块
 * 
 * 管理粒子的创建、更新和渲染。
 * 粒子在 3D 空间中根据噪声场运动，产生有机的流动效果。
 * 
 * @module particles/ParticleSystem
 */

import * as THREE from 'three'
import { NoiseTexture, NoiseVector } from '../noise/NoiseTexture'

/**
 * 粒子系统配置接口
 * 
 * @interface ParticleConfig
 */
export interface ParticleConfig {
  /** 粒子数量 */
  count: number
  /** 粒子大小 */
  size: number
  /** 粒子边界半径 */
  boundsRadius: number
  /** 速度缩放因子 */
  velocityScale: number
  /** 最大速度限制 */
  maxSpeed: number
}

/**
 * 粒子系统类
 * 
 * 负责管理所有粒子的创建、更新和渲染。
 * 粒子在 3D 空间中根据预计算的噪声场运动，
 * 当超出边界时会被重置到中心区域。
 * 
 * 主要功能：
 * - 初始化粒子位置和速度
 * - 根据噪声场更新粒子运动
 * - 处理边界条件
 * - 渲染彩色粒子
 * 
 * @class ParticleSystem
 */
export class ParticleSystem {
  /** Three.js 点云对象 */
  public points: THREE.Points
  /** 粒子位置数组 */
  private positions: Float32Array | null = null
  /** 粒子速度数组 */
  private velocities: Float32Array | null = null
  /** 粒子系统配置 */
  private config: ParticleConfig
  /** 噪声纹理引用 */
  private noiseTexture: NoiseTexture
  /** 标记是否已释放资源 */
  private disposed: boolean = false

  /**
   * 构造函数，初始化粒子系统
   * 
   * @param scene - Three.js 场景对象
   * @param config - 粒子配置参数
   * @param noiseTexture - 噪声纹理，用于粒子运动
   * 
   * @example
   * ```typescript
   * const config = {
   *   count: 30000,
   *   size: 1.2,
   *   boundsRadius: 50,
   *   velocityScale: 0.08,
   *   maxSpeed: 0.15
   * };
   * const particleSystem = new ParticleSystem(scene, config, noiseTexture);
   * ```
   */
  constructor(scene: THREE.Scene, config: ParticleConfig, noiseTexture: NoiseTexture) {
    this.config = config
    this.noiseTexture = noiseTexture
    this.points = this.create()
    scene.add(this.points)
  }

  /**
   * 创建粒子系统
   * 
   * 初始化粒子的位置、速度和颜色。
   * 粒子在球体内随机分布，具有随机速度和颜色。
   * 
   * @returns Three.js 点云对象
   * @private
   */
  private create(): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(this.config.count * 3)
    this.velocities = new Float32Array(this.config.count * 3)
    const colors = new Float32Array(this.config.count * 3)

    // 预定义的颜色调色板
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

    // 初始化每个粒子
    for (let i = 0; i < this.config.count; i++) {
      const i3 = i * 3

      // 在球体内随机分布
      const radius = Math.random() * this.config.boundsRadius
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      // 球坐标转笛卡尔坐标
      this.positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      this.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      this.positions[i3 + 2] = radius * Math.cos(phi)

      // 随机初始速度
      const angle = Math.random() * Math.PI * 2
      const speed = 0.01 + Math.random() * 0.03
      this.velocities[i3] = Math.cos(angle) * speed
      this.velocities[i3 + 1] = Math.sin(angle) * speed
      this.velocities[i3 + 2] = (Math.random() - 0.5) * speed

      // 随机颜色
      const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)]
      const brightness = 0.7 + Math.random() * 0.3
      colors[i3] = palette[0] * brightness
      colors[i3 + 1] = palette[1] * brightness
      colors[i3 + 2] = palette[2] * brightness
    }

    // 设置几何体属性
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // 创建材质
    const material = new THREE.PointsMaterial({
      size: this.config.size,
      vertexColors: true,  // 使用顶点颜色
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,  // 启用透视大小衰减
      blending: THREE.AdditiveBlending,  // 加法混合，产生发光效果
      depthWrite: false,
      depthTest: true
    })

    return new THREE.Points(geometry, material)
  }

  /**
   * 更新粒子系统
   * 
   * 根据噪声场更新所有粒子的位置和速度。
   * 当粒子超出边界时，重置到中心区域。
   * 
   * 更新逻辑：
   * 1. 采样当前位置的噪声向量
   * 2. 根据噪声向量更新速度
   * 3. 限制最大速度
   * 4. 更新位置
   * 5. 检查边界条件
   * 
   * @param time - 当前时间，用于噪声采样
   * 
   * @example
   * ```typescript
   * particleSystem.update(currentTime);
   * ```
   */
  update(time: number): void {
    if (this.disposed || !this.positions || !this.velocities) {
      return
    }

    try {
      const positions = this.points.geometry.attributes.position.array as Float32Array
      const len = positions.length

      // 更新每个粒子
      for (let i = 0; i < len; i += 3) {
        const x = positions[i]
        const y = positions[i + 1]
        const z = positions[i + 2]

        // 从噪声纹理采样速度向量
        const curl = this.noiseTexture.sample(x, y, z, time)

        // 根据噪声向量更新速度
        this.velocities[i] += curl.x * this.config.velocityScale
        this.velocities[i + 1] += curl.y * this.config.velocityScale
        this.velocities[i + 2] += curl.z * this.config.velocityScale

        // 计算当前速度
        const speed = Math.sqrt(
          this.velocities[i] * this.velocities[i] +
          this.velocities[i + 1] * this.velocities[i + 1] +
          this.velocities[i + 2] * this.velocities[i + 2]
        )

        // 限制最大速度
        if (speed > this.config.maxSpeed) {
          const factor = this.config.maxSpeed / speed
          this.velocities[i] *= factor
          this.velocities[i + 1] *= factor
          this.velocities[i + 2] *= factor
        }

        // 更新位置
        positions[i] += this.velocities[i]
        positions[i + 1] += this.velocities[i + 1]
        positions[i + 2] += this.velocities[i + 2]

        // 检查边界条件
        const distSq = x * x + y * y + z * z
        const boundsRadiusSq = this.config.boundsRadius * this.config.boundsRadius
        if (distSq > boundsRadiusSq) {
          // 重置到中心附近
          positions[i] *= 0.1
          positions[i + 1] *= 0.1
          positions[i + 2] *= 0.1

          // 重置速度
          this.velocities[i] = (Math.random() - 0.5) * 0.05
          this.velocities[i + 1] = (Math.random() - 0.5) * 0.05
          this.velocities[i + 2] = (Math.random() - 0.5) * 0.05
      }
    }

    // 标记位置属性需要更新
    this.points.geometry.attributes.position.needsUpdate = true
    } catch (error) {
      console.error('更新粒子系统时发生错误:', error)
    }
  }

  /**
   * 释放粒子系统资源
   * 
   * 从场景中移除粒子系统，并释放几何体和材质资源。
   * 
   * @param scene - Three.js 场景对象
   */
  dispose(scene: THREE.Scene): void {
    if (this.disposed) {
      return
    }
    
    try {
      scene.remove(this.points)
      this.points.geometry.dispose()
      this.points.material.dispose()
      this.positions = null
      this.velocities = null
      this.disposed = true
    } catch (error) {
      console.error('释放粒子系统资源失败:', error)
    }
  }
}