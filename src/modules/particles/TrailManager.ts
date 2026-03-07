/**
 * 轨迹管理器模块
 *
 * 使用顶点着色器实现粒子轨迹效果。
 * 轨迹会随着时间逐渐消失，产生流动的尾迹效果。
 *
 * @module particles/TrailManager
 */

import * as THREE from 'three'

/**
 * 轨迹配置接口
 *
 * @interface TrailConfig
 */
export interface TrailConfig {
  /** 轨迹长度（历史位置数量） */
  length: number
  /** 轨迹最大寿命（帧数） */
  maxAge: number
  /** 轨迹颜色（RGB，0-1） */
  color: [number, number, number]
  /** 轨迹透明度 */
  opacity: number
  /** 轨迹宽度 */
  lineWidth: number
}

/**
 * 轨迹历史数据接口
 *
 * @interface TrailHistory
 */
interface TrailHistory {
  /** 粒子索引 */
  particleIndex: number
  /** 历史位置数组 */
  positions: Float32Array
  /** 每个位置的年龄 */
  ages: Float32Array
  /** 当前写入索引 */
  writeIndex: number
  /** 是否已满 */
  isFull: boolean
}

/**
 * 顶点着色器
 *
 * 计算轨迹顶点的位置和透明度。
 * 根据年龄属性计算淡出效果。
 */
const VERTEX_SHADER = `
// 输入属性
attribute vec3 position;
attribute float age;  // 轨迹段年龄

// 统一变量
uniform float pointSize;

// 输出到片元着色器
varying float vAge;

void main() {
  // 输出年龄到片元着色器
  vAge = age;
  
  // 设置顶点位置
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  
  // 设置点大小
  gl_PointSize = pointSize;
}
`

/**
 * 片元着色器
 *
 * 根据年龄渲染轨迹颜色和透明度。
 * 年龄越大，透明度越低（逐渐消失）。
 */
const FRAGMENT_SHADER = `
// 统一变量
uniform vec3 color;
uniform float opacity;
uniform float maxAge;

// 从顶点着色器接收
varying float vAge;

void main() {
  // 计算基于年龄的透明度
  // 年龄越小（越新）越不透明，年龄越大（越旧）越透明
  float normalizedAge = clamp(vAge / maxAge, 0.0, 1.0);
  float ageOpacity = 1.0 - normalizedAge;  // 线性衰减
  ageOpacity = pow(ageOpacity, 1.5);      // 指数衰减，让消失更自然
  
  // 最终透明度 = 基础透明度 * 年龄透明度
  float finalOpacity = opacity * ageOpacity;
  
  // 丢弃完全透明的片段（优化性能）
  if (finalOpacity < 0.01) {
    discard;
  }
  
  // 输出最终颜色
  gl_FragColor = vec4(color, finalOpacity);
}
`

/**
 * 轨迹管理器类
 *
 * 使用顶点着色器实现高效的粒子轨迹效果。
 * 每个粒子维护一个位置历史队列，轨迹系统渲染这些历史位置。
 *
 * 主要功能：
 * - 管理粒子的位置历史
 * - 使用自定义着色器渲染轨迹
 * - 基于年龄的淡出效果
 * - 高效的 GPU 渲染
 *
 * @class TrailManager
 */
export class TrailManager {
  /** Three.js 线条对象 */
  public trailLines: THREE.Points
  /** 轨迹历史数据（每个粒子一个） */
  private trailHistories: TrailHistory[]
  /** 轨迹配置 */
  private config: TrailConfig
  /** 标记是否已释放资源 */
  private disposed: boolean = false
  /** 轨迹几何体 */
  private geometry: THREE.BufferGeometry
  /** 轨迹材质 */
  private material: THREE.ShaderMaterial
  /** 轨迹顶点位置数组 */
  private positions: Float32Array
  /** 轨迹顶点年龄数组 */
  private ages: Float32Array
  /** 粒子数量 */
  private particleCount: number

  /**
   * 构造函数，初始化轨迹管理器
   *
   * @param scene - Three.js 场景对象
   * @param particleCount - 粒子数量
   * @param config - 轨迹配置参数
   *
   * @example
   * ```typescript
   * const config = {
   *   length: 10,
   *   maxAge: 60,
   *   color: [0.5, 0.8, 1.0],
   *   opacity: 0.6,
   *   lineWidth: 2.0
   * };
   * const trailManager = new TrailManager(scene, 40000, config);
   * ```
   */
  constructor(
    scene: THREE.Scene,
    particleCount: number,
    config: TrailConfig
  ) {
    this.particleCount = particleCount
    this.config = config
    this.trailHistories = []
    
    // 初始化轨迹历史数据
    this.initializeTrailHistories()
    
    // 创建轨迹几何体和材质
    this.geometry = this.createGeometry()
    this.material = this.createMaterial()
    
    // 创建轨迹线条对象
    this.trailLines = new THREE.Points(this.geometry, this.material)
    
    // 添加到场景
    scene.add(this.trailLines)
  }

  /**
   * 初始化轨迹历史数据
   *
   * 为每个粒子创建一个位置历史队列。
   *
   * @private
   */
  private initializeTrailHistories(): void {
    this.trailHistories = []
    
    for (let i = 0; i < this.particleCount; i++) {
      this.trailHistories.push({
        particleIndex: i,
        positions: new Float32Array(this.config.length * 3),
        ages: new Float32Array(this.config.length),
        writeIndex: 0,
        isFull: false
      })
    }
  }

  /**
   * 创建轨迹几何体
   *
   * 创建 BufferGeometry 并设置顶点属性。
   *
   * @returns BufferGeometry 对象
   * @private
   */
  private createGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    
    // 计算总顶点数（粒子数 × 轨迹长度）
    const totalVertices = this.particleCount * this.config.length
    
    // 创建顶点属性数组
    this.positions = new Float32Array(totalVertices * 3)
    this.ages = new Float32Array(totalVertices)
    
    // 设置几何体属性
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('age', new THREE.BufferAttribute(this.ages, 1))
    
    return geometry
  }

  /**
   * 创建轨迹材质
   *
   * 创建自定义 ShaderMaterial，使用顶点着色器和片元着色器。
   *
   * @returns ShaderMaterial 对象
   * @private
   */
  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: {
          value: new THREE.Vector3(
            this.config.color[0],
            this.config.color[1],
            this.config.color[2]
          )
        },
        opacity: {
          value: this.config.opacity
        },
        maxAge: {
          value: this.config.maxAge
        },
        pointSize: {
          value: this.config.lineWidth
        }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    })
  }

  /**
   * 更新轨迹
   *
   * 添加新的粒子位置到轨迹历史，并更新几何体。
   *
   * @param particlePositions - 所有粒子的当前位置数组
   *
   * @example
   * ```typescript
   * const positions = particleSystem.points.geometry.attributes.position.array;
   * trailManager.update(positions);
   * ```
   */
  update(particlePositions: Float32Array): void {
    if (this.disposed) {
      return
    }

    try {
      // 更新每个粒子的轨迹历史
      for (let i = 0; i < this.particleCount; i++) {
        const history = this.trailHistories[i]
        const i3 = i * 3
        
        // 获取当前粒子位置
        const x = particlePositions[i3]
        const y = particlePositions[i3 + 1]
        const z = particlePositions[i3 + 2]
        
        // 写入新位置到历史
        const writeIdx = history.writeIndex
        const writeIdx3 = writeIdx * 3
        history.positions[writeIdx3] = x
        history.positions[writeIdx3 + 1] = y
        history.positions[writeIdx3 + 2] = z
        history.ages[writeIdx] = 0  // 新位置年龄为 0
        
        // 更新写入索引
        history.writeIndex++
        if (history.writeIndex >= this.config.length) {
          history.writeIndex = 0
          history.isFull = true
        }
      }
      
      // 更新几何体数据
      this.updateGeometry()
    } catch (error) {
      console.error('更新轨迹时发生错误:', error)
    }
  }

  /**
   * 更新几何体
   *
   * 将轨迹历史数据复制到几何体属性中。
   * 同时增加所有轨迹段的年龄。
   *
   * @private
   */
  private updateGeometry(): void {
    // 更新所有轨迹段的年龄
    for (let i = 0; i < this.ages.length; i++) {
      this.ages[i] += 1
    }
    
    // 复制位置数据
    let vertexIndex = 0
    for (let i = 0; i < this.particleCount; i++) {
      const history = this.trailHistories[i]
      const length = history.isFull ? this.config.length : history.writeIndex
      
      // 复制有效的历史位置
      for (let j = 0; j < length; j++) {
        const historyIdx3 = j * 3
        const vertexIdx3 = vertexIndex * 3
        
        this.positions[vertexIdx3] = history.positions[historyIdx3]
        this.positions[vertexIdx3 + 1] = history.positions[historyIdx3 + 1]
        this.positions[vertexIdx3 + 2] = history.positions[historyIdx3 + 2]
        this.ages[vertexIndex] = history.ages[j]
        
        vertexIndex++
      }
    }
    
    // 标记属性需要更新
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.age.needsUpdate = true
  }

  /**
   * 设置轨迹颜色
   *
   * @param color - RGB 颜色值（0-1）
   *
   * @example
   * ```typescript
   * trailManager.setColor([1.0, 0.5, 0.2]);
   * ```
   */
  setColor(color: [number, number, number]): void {
    this.config.color = color
    this.material.uniforms.color.value.set(
      color[0],
      color[1],
      color[2]
    )
  }

  /**
   * 设置轨迹透明度
   *
   * @param opacity - 透明度值（0-1）
   */
  setOpacity(opacity: number): void {
    this.config.opacity = opacity
    this.material.uniforms.opacity.value = opacity
  }

  /**
   * 设置轨迹最大寿命
   *
   * @param maxAge - 最大寿命（帧数）
   */
  setMaxAge(maxAge: number): void {
    this.config.maxAge = maxAge
    this.material.uniforms.maxAge.value = maxAge
  }

  /**
   * 设置轨迹宽度
   *
   * @param lineWidth - 宽度值
   */
  setLineWidth(lineWidth: number): void {
    this.config.lineWidth = lineWidth
    this.material.uniforms.pointSize.value = lineWidth
  }

  /**
   * 获取当前配置
   *
   * @returns 当前轨迹配置
   */
  getConfig(): TrailConfig {
    return { ...this.config }
  }

  /**
   * 释放轨迹管理器资源
   *
   * 从场景中移除轨迹对象，并释放几何体和材质资源。
   *
   * @param scene - Three.js 场景对象
   */
  dispose(scene: THREE.Scene): void {
    if (this.disposed) {
      return
    }

    try {
      scene.remove(this.trailLines)
      this.geometry.dispose()
      this.material.dispose()

      // 释放历史数据
      this.trailHistories = []
      
      // 释放数组内存
      this.positions.fill(0)
      this.ages.fill(0)

      this.disposed = true
    } catch (error) {
      console.error('释放轨迹管理器资源失败:', error)
    }
  }
}