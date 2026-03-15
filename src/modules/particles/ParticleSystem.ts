/**
 * 粒子系统模块
 *
 * 管理粒子的创建、更新和渲染。
 * 粒子在 3D 空间中根据噪声场运动，产生有机的流动效果。
 *
 * @module particles/ParticleSystem
 */

import * as THREE from 'three'
import { NoiseTexture } from '../noise/NoiseTexture'
import { ColorManager } from '../colors/ColorManager'
import { ColorTheme, DefaultColorTheme } from '../colors/ColorTheme'
import { TrailManager, TrailConfig } from './TrailManager'
import { MotionMode, AttractorConfig, DEFAULT_ATTRACTOR_CONFIG } from './MotionMode'

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
  /** 是否启用轨迹 */
  enableTrails?: boolean
  /** 轨迹配置（仅当 enableTrails 为 true 时生效） */
  trailConfig?: TrailConfig
  /** 是否启用呼吸效果 */
  enableBreathing?: boolean
  /** 呼吸效果的振幅（0-1） */
  breathingAmplitude?: number
  /** 呼吸效果的频率（Hz） */
  breathingFrequency?: number
  /** 是否启用基于速度的大小变化 */
  enableSpeedBasedSize?: boolean
  /** 速度对大小的影响因子（0-2） */
  speedBasedSizeFactor?: number
  /** 视差强度（0-2），控制近大远小的效果强度 */
  parallaxStrength?: number
  /** 是否启用景深雾效 */
  enableFog?: boolean
  /** 雾的浓度（0-1），控制淡化的程度 */
  fogDensity?: number
  /** 雾的颜色（RGB，0-1） */
  fogColor?: [number, number, number]
  /** 是否启用发光效果 */
  enableGlow?: boolean
  /** 发光强度（0-2） */
  glowIntensity?: number
  /** 运动模式 */
  motionMode?: MotionMode
  /** 吸引子配置 */
  attractorConfig?: AttractorConfig
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
 * - 支持动态颜色主题
 *
 * @class ParticleSystem
 */
export class ParticleSystem {
  /** Three.js 点云对象 */
  public points: THREE.Points
  /** 轨迹管理器（可选） */
  public trailManager: TrailManager | null = null
  /** 粒子位置数组 */
  private positions: Float32Array | null = null
  /** 粒子速度数组 */
  private velocities: Float32Array | null = null
  /** 粒子大小数组 */
  private sizes: Float32Array | null = null
  /** 粒子系统配置 */
  private config: ParticleConfig
  /** 噪声纹理引用 */
  private noiseTexture: NoiseTexture
  /** 颜色管理器（可选） */
  private colorManager: ColorManager | null = null
  /** 标记是否已释放资源 */
  private disposed: boolean = false
  /** 基础粒子大小 */
  private baseSize: number
  /** 呼吸效果：振幅 */
  private breathingAmplitude: number
  /** 呼吸效果：频率 */
  private breathingFrequency: number
  /** 速度对大小的影响因子 */
  private speedBasedSizeFactor: number
  /** 视差强度 */
  private parallaxStrength: number
  /** 透视衰减系数（根据相机 FOV 和距离计算） */
  private perspectiveScale: number
  /** 是否启用雾效 */
  private enableFog: boolean
  /** 雾的浓度 */
  private fogDensity: number
  /** 雾的颜色 */
  private fogColor: [number, number, number]
  /** 是否启用发光效果 */
  private enableGlow: boolean
  /** 发光强度 */
  private glowIntensity: number
  /** 运动模式 */
  private motionMode: MotionMode
  /** 吸引子配置 */
  private attractorConfig: AttractorConfig
  /** 累计时间（用于呼吸效果） */
  private accumulatedTime: number = 0
  /** 当前呼吸因子 */
  private currentBreathingFactor: number = 1.0

  /**
   * 构造函数，初始化粒子系统
   *
   * @param scene - Three.js 场景对象
   * @param config - 粒子配置参数
   * @param noiseTexture - 噪声纹理，用于粒子运动
   * @param useDefaultColor - 是否使用默认颜色（默认 true）
   *
   * @example
   * ```typescript
   * const config = {
   *   count: 30000,
   *   size: 1.2,
   *   boundsRadius: 50,
   *   velocityScale: 0.08,
   *   maxSpeed: 0.15,
   *   enableTrails: true,
   *   trailConfig: {
   *     length: 8,
   *     maxAge: 45,
   *     color: [0.5, 0.8, 1.0],
   *     opacity: 0.5,
   *     lineWidth: 1.5
   *   }
   * };
   * const particleSystem = new ParticleSystem(scene, config, noiseTexture, true);
   * ```
   */
  constructor(
    scene: THREE.Scene,
    config: ParticleConfig,
    noiseTexture: NoiseTexture,
    useDefaultColor: boolean = true
  ) {
    this.config = config
    this.noiseTexture = noiseTexture

    // 初始化呼吸效果参数
    this.baseSize = config.size
    this.breathingAmplitude = config.breathingAmplitude ?? 0.3
    this.breathingFrequency = config.breathingFrequency ?? 0.5
    this.speedBasedSizeFactor = config.speedBasedSizeFactor ?? 1.0
    this.parallaxStrength = config.parallaxStrength ?? 1.0

    // 计算透视衰减系数
    // 根据相机 FOV (75度) 和距离 (80) 计算
    // 公式: tan(FOV/2) * distance
    const fovRad = (75 * Math.PI) / 180
    this.perspectiveScale = Math.tan(fovRad / 2) * 80 * this.parallaxStrength

    // 初始化雾效参数
    this.enableFog = config.enableFog ?? true
    this.fogDensity = config.fogDensity ?? 0.01
    this.fogColor = config.fogColor ?? [0.0, 0.0, 0.1]  // 默认深蓝色雾

    // 初始化发光参数
    this.enableGlow = config.enableGlow ?? true
    this.glowIntensity = config.glowIntensity ?? 0.5

    // 初始化运动模式和吸引子配置
    this.motionMode = config.motionMode ?? MotionMode.NOISE_FIELD
    this.attractorConfig = config.attractorConfig ?? DEFAULT_ATTRACTOR_CONFIG

    // 同步更新 config 中的运动模式和吸引子配置
    this.config.motionMode = this.motionMode
    this.config.attractorConfig = this.attractorConfig

    this.points = this.create(useDefaultColor)
    scene.add(this.points)

    // 如果启用了轨迹，初始化轨迹管理器
    if (config.enableTrails && config.trailConfig) {
      this.trailManager = new TrailManager(scene, config.count, config.trailConfig)
    }
  }

  /**
   * 创建圆形渐变纹理
   *
   * 生成一个柔和的圆形渐变纹理，用于粒子渲染。
   * 中心最亮，边缘透明，产生柔和的发光效果。
   *
   * @returns Three.js Canvas 纹理
   * @private
   */
  private createCircularTexture(): THREE.CanvasTexture {
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

    // 渐变：从中心的白色到边缘的透明
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')     // 中心：完全不透明
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')  // 30%：80% 透明度
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)')  // 60%：40% 透明度
    gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.1)') // 85%：10% 透明度
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')      // 边缘：完全透明

    // 绘制渐变圆
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    return texture
  }

  /**
   * 创建粒子系统
   *
   * 初始化粒子的位置、速度、颜色和大小。
   * 粒子在球体内随机分布，具有随机速度。
   *
   * @param useDefaultColor - 是否使用默认颜色
   * @returns Three.js 点云对象
   * @private
   */
  private create(useDefaultColor: boolean = true): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(this.config.count * 3)
    this.velocities = new Float32Array(this.config.count * 3)
    this.sizes = new Float32Array(this.config.count)
    const colors = new Float32Array(this.config.count * 3)

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

      // 初始化大小（默认为 1.0，后续会根据速度更新）
      this.sizes[i] = 1.0

      // 初始化颜色（白色占位符，稍后由 ColorManager 替换）
      colors[i3] = 1.0
      colors[i3 + 1] = 1.0
      colors[i3 + 2] = 1.0
    }

    // 设置几何体属性
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    // 如果使用默认颜色，创建颜色管理器并初始化
    if (useDefaultColor) {
      this.initializeDefaultColors()
    }

    // 创建圆形渐变纹理
    const particleTexture = this.createCircularTexture()

    // 检查是否启用基于速度的大小变化
    const useCustomShader = this.config.enableSpeedBasedSize === true

    // 创建材质
    let material: THREE.Material
    if (useCustomShader) {
      // 使用自定义 Shader 以支持逐粒子大小
      material = new THREE.ShaderMaterial({
        uniforms: {
          uBaseSize: { value: this.config.size },
          uTexture: { value: particleTexture },
          uPerspectiveScale: { value: this.perspectiveScale },
          uEnableFog: { value: this.enableFog },
          uFogDensity: { value: this.fogDensity },
          uFogColor: { value: new THREE.Vector3(...this.fogColor) },
          uEnableGlow: { value: this.enableGlow },
          uGlowIntensity: { value: this.glowIntensity }
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          varying float vFogFactor;
          uniform float uBaseSize;
          uniform float uPerspectiveScale;
          uniform float uEnableFog;
          uniform float uFogDensity;

          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // 使用透视衰减系数实现近大远小效果
            gl_PointSize = uBaseSize * size * uPerspectiveScale / -mvPosition.z;
            
            // 计算雾效因子
            if (uEnableFog > 0.5) {
              float distance = length(mvPosition.xyz);
              vFogFactor = 1.0 - exp(-uFogDensity * distance);
            } else {
              vFogFactor = 0.0;
            }
            
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform vec3 uFogColor;
          uniform float uEnableFog;
          uniform float uEnableGlow;
          uniform float uGlowIntensity;
          varying vec3 vColor;
          varying float vFogFactor;

          void main() {
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            if (texColor.a < 0.1) discard;
            
            // 计算发光效果
            vec3 finalColor = vColor;
            float alpha = texColor.a * 0.9;
            
            if (uEnableGlow > 0.5 && uGlowIntensity > 0.0) {
              // 计算从中心到边缘的距离
              vec2 center = vec2(0.5, 0.5);
              float dist = distance(gl_PointCoord, center);
              
              // 创建光晕效果：中心亮，边缘柔和
              // 使用更平缓的曲线，减少发光范围
              float glowFactor = smoothstep(0.4, 0.0, dist) * uGlowIntensity * 0.3;
              
              // 修复发光计算：使用混合而不是叠加，避免颜色超过 1.0
              finalColor = mix(finalColor, finalColor * 1.5, glowFactor);
              
              // 确保颜色值不超过 1.0
              finalColor = clamp(finalColor, 0.0, 1.0);
              
              // 发光也会影响透明度（减少透明度影响）
              alpha += glowFactor * 0.15;
              alpha = min(alpha, 1.0);
            }
            
            // 应用雾效
            if (uEnableFog > 0.5) {
              // 混合粒子颜色和雾的颜色
              finalColor = mix(finalColor, uFogColor, vFogFactor);
              // 根据距离衰减透明度
              alpha *= (1.0 - vFogFactor * 0.7);
            }
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      })
    } else {
      // 使用标准材质
      material = new THREE.PointsMaterial({
        size: this.config.size,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        map: particleTexture,
        alphaMap: particleTexture
      })
    }

    return new THREE.Points(geometry, material)
  }

  /**
   * 初始化默认颜色
   * 
   * 使用默认颜色主题初始化粒子颜色。
   * 
   * @private
   */
  private initializeDefaultColors(): void {
    this.colorManager = new ColorManager(DefaultColorTheme, this.config.count)
    this.colorManager.initialize()
    this.updateColors()
  }

  /**
   * 计算 Lorenz 吸引子
   * 
   * Lorenz 吸引子是最著名的混沌系统之一，产生经典的"蝴蝶形状"。
   * 
   * 方程：
   * dx/dt = σ(y - x)
   * dy/dt = x(ρ - z) - y
   * dz/dt = xy - βz
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   * @private
   */
  private calculateLorenz(x: number, y: number, z: number, dt: number): {dx: number, dy: number, dz: number} {
    const sigma = this.attractorConfig.lorenz?.sigma ?? 10.0
    const rho = this.attractorConfig.lorenz?.rho ?? 28.0
    const beta = this.attractorConfig.lorenz?.beta ?? 8.0 / 3.0
    
    return {
      dx: sigma * (y - x) * dt,
      dy: (x * (rho - z) - y) * dt,
      dz: (x * y - beta * z) * dt
    }
  }

  /**
   * 计算 Thomas 吸引子
   * 
   * Thomas 吸引子产生三个对称的螺旋臂，视觉效果优雅。
   * 
   * 方程：
   * dx/dt = sin(y) - bx
   * dy/dt = sin(z) - by
   * dz/dt = sin(x) - bz
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   * @private
   */
  private calculateThomas(x: number, y: number, z: number, dt: number): {dx: number, dy: number, dz: number} {
    const b = this.attractorConfig.thomas?.b ?? 0.208186
    
    return {
      dx: (Math.sin(y) - b * x) * dt,
      dy: (Math.sin(z) - b * y) * dt,
      dz: (Math.sin(x) - b * z) * dt
    }
  }

  /**
   * 计算 Clifford 吸引子
   * 
   * Clifford 吸引子在 2D 平面上产生复杂的分形图案，扩展到 3D 后产生独特的空间结构。
   * 
   * 方程（2D原版）：
   * dx/dt = sin(a*y) + c*cos(a*x)
   * dy/dt = sin(b*x) + d*cos(b*y)
   * 
   * 3D扩展（添加 Z 轴）：
   * dz/dt = sin(x) + cos(y) + z*0.1
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   * @private
   */
  private calculateClifford(x: number, y: number, z: number, dt: number): {dx: number, dy: number, dz: number} {
    const a = this.attractorConfig.clifford?.a ?? 1.7
    const b = this.attractorConfig.clifford?.b ?? 1.7
    const c = this.attractorConfig.clifford?.c ?? 0.06
    const d = this.attractorConfig.clifford?.d ?? 1.2
    
    return {
      dx: (Math.sin(a * y) + c * Math.cos(a * x)) * dt,
      dy: (Math.sin(b * x) + d * Math.cos(b * y)) * dt,
      dz: (Math.sin(x) + Math.cos(y) + z * 0.1) * dt * 0.5  // Z 轴较慢以保持 2D 图案特征
    }
  }

  /**
   * 计算 Rossler 吸引子
   * 
   * Rossler 吸引子产生螺旋状结构，具有独特的混沌特性。
   * 
   * 方程：
   * dx/dt = -y - z
   * dy/dt = x + a*y
   * dz/dt = b + z*(x - c)
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   * @private
   */
  private calculateRossler(x: number, y: number, z: number, dt: number): {dx: number, dy: number, dz: number} {
    const a = this.attractorConfig.rossler?.a ?? 0.2
    const b = this.attractorConfig.rossler?.b ?? 0.2
    const c = this.attractorConfig.rossler?.c ?? 5.7
    
    return {
      dx: (-y - z) * dt,
      dy: (x + a * y) * dt,
      dz: (b + z * (x - c)) * dt
    }
  }

  /**
   * 更新粒子系统（噪声场模式）
   * 
   * 使用 FBM + Curl 噪声场更新粒子位置。
   * 
   * @param positions - 粒子位置数组
   * @param time - 当前时间
   * @private
   */
  private updateWithNoiseField(positions: Float32Array, time: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      // 从噪声纹理采样速度向量
      const curl = this.noiseTexture.sample(x, y, z, time)
      
      // 根据噪声向量更新速度
      this.velocities![i] += curl.x * this.config.velocityScale
      this.velocities![i + 1] += curl.y * this.config.velocityScale
      this.velocities![i + 2] += curl.z * this.config.velocityScale
      
      // 限制最大速度
      this.limitVelocity(i)
      
      // 更新位置
      positions[i] += this.velocities![i]
      positions[i + 1] += this.velocities![i + 1]
      positions[i + 2] += this.velocities![i + 2]
      
      // 边界检测
      this.checkBoundary(i)
    }
  }

  /**
   * 更新粒子系统（Lorenz 吸引子模式）
   * 
   * 使用 Lorenz 吸引子更新粒子位置。
   * 
   * @param positions - 粒子位置数组
   * @param dt - 时间步长
   * @private
   */
  private updateWithLorenz(positions: Float32Array, dt: number): void {
    const scale = this.attractorConfig.particleScale
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] / scale
      const y = positions[i + 1] / scale
      const z = positions[i + 2] / scale
      
      // 计算 Lorenz 吸引子速度
      const delta = this.calculateLorenz(x, y, z, dt)
      
      // 更新速度（使用惯性）
      this.velocities![i] = this.velocities![i] * 0.9 + delta.dx
      this.velocities![i + 1] = this.velocities![i + 1] * 0.9 + delta.dy
      this.velocities![i + 2] = this.velocities![i + 2] * 0.9 + delta.dz
      
      // 更新位置
      positions[i] += this.velocities![i] * scale
      positions[i + 1] += this.velocities![i + 1] * scale
      positions[i + 2] += this.velocities![i + 2] * scale
      
      // 边界检测
      this.checkBoundary(i)
    }
  }

  /**
   * 更新粒子系统（Thomas 吸引子模式）
   * 
   * 使用 Thomas 吸引子更新粒子位置。
   * 
   * @param positions - 粒子位置数组
   * @param dt - 时间步长
   * @private
   */
  private updateWithThomas(positions: Float32Array, dt: number): void {
    const scale = this.attractorConfig.particleScale
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] / scale
      const y = positions[i + 1] / scale
      const z = positions[i + 2] / scale
      
      // 计算 Thomas 吸引子速度
      const delta = this.calculateThomas(x, y, z, dt)
      
      // 更新速度（使用惯性）
      this.velocities![i] = this.velocities![i] * 0.9 + delta.dx
      this.velocities![i + 1] = this.velocities![i + 1] * 0.9 + delta.dy
      this.velocities![i + 2] = this.velocities![i + 2] * 0.9 + delta.dz
      
      // 更新位置
      positions[i] += this.velocities![i] * scale
      positions[i + 1] += this.velocities![i + 1] * scale
      positions[i + 2] += this.velocities![i + 2] * scale
      
      // 边界检测
      this.checkBoundary(i)
    }
  }

  /**
   * 更新粒子系统（Clifford 吸引子模式）
   * 
   * 使用 Clifford 吸引子更新粒子位置。
   * 
   * @param positions - 粒子位置数组
   * @param dt - 时间步长
   * @private
   */
  private updateWithClifford(positions: Float32Array, dt: number): void {
    const scale = this.attractorConfig.particleScale
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] / scale
      const y = positions[i + 1] / scale
      const z = positions[i + 2] / scale
      
      // 计算 Clifford 吸引子速度
      const delta = this.calculateClifford(x, y, z, dt)
      
      // 更新速度（使用惯性）
      this.velocities![i] = this.velocities![i] * 0.9 + delta.dx
      this.velocities![i + 1] = this.velocities![i + 1] * 0.9 + delta.dy
      this.velocities![i + 2] = this.velocities![i + 2] * 0.9 + delta.dz
      
      // 更新位置
      positions[i] += this.velocities![i] * scale
      positions[i + 1] += this.velocities![i + 1] * scale
      positions[i + 2] += this.velocities![i + 2] * scale
      
      // 边界检测
      this.checkBoundary(i)
    }
  }

  /**
   * 更新粒子系统（Rossler 吸引子模式）
   * 
   * 使用 Rossler 吸引子更新粒子位置。
   * 
   * @param positions - 粒子位置数组
   * @param dt - 时间步长
   * @private
   */
  private updateWithRossler(positions: Float32Array, dt: number): void {
    const scale = this.attractorConfig.particleScale
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] / scale
      const y = positions[i + 1] / scale
      const z = positions[i + 2] / scale
      
      // 计算 Rossler 吸引子速度
      const delta = this.calculateRossler(x, y, z, dt)
      
      // 更新速度（使用惯性）
      this.velocities![i] = this.velocities![i] * 0.9 + delta.dx
      this.velocities![i + 1] = this.velocities![i + 1] * 0.9 + delta.dy
      this.velocities![i + 2] = this.velocities![i + 2] * 0.9 + delta.dz
      
      // 更新位置
      positions[i] += this.velocities![i] * scale
      positions[i + 1] += this.velocities![i + 1] * scale
      positions[i + 2] += this.velocities![i + 2] * scale
      
      // 边界检测
      this.checkBoundary(i)
    }
  }

  /**
   * 更新粒子系统（混合模式）
   * 
   * 混合噪声场和吸引子，产生更复杂的运动效果。
   * 
   * @param positions - 粒子位置数组
   * @param time - 当前时间
   * @private
   */
  private updateWithHybrid(positions: Float32Array, time: number): void {
    const dt = 0.001 * this.attractorConfig.timeScale  // 使用固定的时间步长
    const scale = this.attractorConfig.particleScale
    const hybridRatio = 0.3  // 吸引子影响比例，0.3表示30%吸引子，70%噪声场
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      // 从噪声纹理采样速度向量
      const curl = this.noiseTexture.sample(x, y, z, time)
      
      // 计算吸引子速度（默认使用 Lorenz）
      const scaledX = x / scale
      const scaledY = y / scale
      const scaledZ = z / scale
      
      let attractorVel: {dx: number, dy: number, dz: number}
      
      // 根据 motionMode 选择吸引子类型
      switch (this.attractorConfig.motionMode) {
        case MotionMode.LORENZ:
          attractorVel = this.calculateLorenz(scaledX, scaledY, scaledZ, dt)
          break
        case MotionMode.THOMAS:
          attractorVel = this.calculateThomas(scaledX, scaledY, scaledZ, dt)
          break
        case MotionMode.CLIFFORD:
          attractorVel = this.calculateClifford(scaledX, scaledY, scaledZ, dt)
          break
        case MotionMode.ROSSLER:
          attractorVel = this.calculateRossler(scaledX, scaledY, scaledZ, dt)
          break
        default:
          // 默认使用 Lorenz
          attractorVel = this.calculateLorenz(scaledX, scaledY, scaledZ, dt)
          break
      }
      
      // 混合噪声场和吸引子速度
      this.velocities![i] += curl.x * this.config.velocityScale * (1 - hybridRatio) + attractorVel.dx * hybridRatio
      this.velocities![i + 1] += curl.y * this.config.velocityScale * (1 - hybridRatio) + attractorVel.dy * hybridRatio
      this.velocities![i + 2] += curl.z * this.config.velocityScale * (1 - hybridRatio) + attractorVel.dz * hybridRatio
      
      // 限制最大速度
      this.limitVelocity(i)
      
      // 更新位置
      positions[i] += this.velocities![i]
      positions[i + 1] += this.velocities![i + 1]
      positions[i + 2] += this.velocities![i + 2]
      
      // 边界检测
      this.checkBoundary(i)
    }
  }

  /**
   * 限制速度
   * 
   * @param i - 粒子索引（起始位置）
   * @private
   */
  private limitVelocity(i: number): void {
    const speed = Math.sqrt(
      this.velocities![i] ** 2 +
      this.velocities![i + 1] ** 2 +
      this.velocities![i + 2] ** 2
    )
    
    if (speed > this.config.maxSpeed) {
      const factor = this.config.maxSpeed / speed
      this.velocities![i] *= factor
      this.velocities![i + 1] *= factor
      this.velocities![i + 2] *= factor
    }
  }

  /**
   * 重新初始化粒子位置
   *
   * 根据当前运动模式重新初始化所有粒子的位置和速度。
   * 吸引子模式初始化在中心附近，噪声场模式在球体内随机分布。
   *
   * @private
   */
  private reinitializeParticles(): void {
    if (!this.positions || !this.velocities) {
      return
    }

    const isAttractorMode = this.motionMode === MotionMode.LORENZ ||
                            this.motionMode === MotionMode.THOMAS ||
                            this.motionMode === MotionMode.CLIFFORD ||
                            this.motionMode === MotionMode.ROSSLER ||
                            this.motionMode === MotionMode.HYBRID

    for (let i = 0; i < this.config.count; i++) {
      const i3 = i * 3

      if (isAttractorMode) {
        // 吸引子模式：初始化在中心附近
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * 5
        this.positions[i3] = radius * Math.cos(angle)
        this.positions[i3 + 1] = radius * Math.sin(angle)
        this.positions[i3 + 2] = Math.random() * 2 - 1

        // 重置速度
        this.velocities[i3] = 0
        this.velocities[i3 + 1] = 0
        this.velocities[i3 + 2] = 0
      } else {
        // 噪声场模式：在球体内随机分布
        const radius = Math.random() * this.config.boundsRadius
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        this.positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
        this.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        this.positions[i3 + 2] = radius * Math.cos(phi)

        // 随机初始速度
        const angle = Math.random() * Math.PI * 2
        const speed = 0.01 + Math.random() * 0.03
        this.velocities[i3] = Math.cos(angle) * speed
        this.velocities[i3 + 1] = Math.sin(angle) * speed
        this.velocities[i3 + 2] = (Math.random() - 0.5) * speed
      }
    }

    // 标记位置属性需要更新
    this.points.geometry.attributes.position.needsUpdate = true
  }

  /**
   * 检查边界条件
   *
   * 当粒子超出边界时，重置到中心区域。
   *
   * @param i - 粒子索引（起始位置）
   * @private
   */
  private checkBoundary(i: number): void {
    const x = this.positions![i]
    const y = this.positions![i + 1]
    const z = this.positions![i + 2]
    
    const dist = Math.sqrt(x * x + y * y + z * z)
    
    if (dist > this.config.boundsRadius) {
      // 重置到中心附近（吸引子模式）
      if (this.motionMode === MotionMode.LORENZ || 
          this.motionMode === MotionMode.THOMAS ||
          this.motionMode === MotionMode.CLIFFORD ||
          this.motionMode === MotionMode.ROSSLER) {
        // 重置到吸引子中心附近
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * 5
        this.positions![i] = radius * Math.cos(angle)
        this.positions![i + 1] = radius * Math.sin(angle)
        this.positions![i + 2] = Math.random() * 2 - 1
        
        // 重置速度
        this.velocities![i] = 0
        this.velocities![i + 1] = 0
        this.velocities![i + 2] = 0
      } else {
        // 噪声场模式：重置到中心并赋予随机速度
        this.positions![i] *= 0.1
        
        this.velocities![i] = (Math.random() - 0.5) * 0.05
        this.velocities![i + 1] = (Math.random() - 0.5) * 0.05
        this.velocities![i + 2] = (Math.random() - 0.5) * 0.05
      }
    }
  }

  /**
       * 更新粒子系统
       *
       * 根据运动模式更新所有粒子的位置和速度。
       * 支持多种运动模式：噪声场、Lorenz 吸引子、Thomas 吸引子等。
       *
       * 更新逻辑：
       * 1. 根据运动模式选择更新方法
       * 2. 更新粒子位置和速度
       * 3. 更新颜色（如果有颜色管理器）
       * 4. 更新轨迹（如果启用了轨迹）
       *
       * @param time - 当前时间，用于噪声采样
       * @param deltaTime - 时间增量（毫秒），用于颜色动画
       *
       * @example
       * ```typescript
       * particleSystem.update(currentTime, 16.67);
       * ```
       */
    update(time: number, deltaTime: number = 16): void {
        if (this.disposed || !this.positions || !this.velocities) {
          return
        }
    
        try {
          const positions = this.points.geometry.attributes.position.array as Float32Array
          const dt = deltaTime * this.attractorConfig.timeScale  // 转换为秒
          
          // 根据运动模式选择更新方法
          switch (this.motionMode) {
            case MotionMode.LORENZ:
              this.updateWithLorenz(positions, dt)
              break
            case MotionMode.THOMAS:
              this.updateWithThomas(positions, dt)
              break
            case MotionMode.CLIFFORD:
              this.updateWithClifford(positions, dt)
              break
            case MotionMode.ROSSLER:
              this.updateWithRossler(positions, dt)
              break
            case MotionMode.HYBRID:
              this.updateWithHybrid(positions, time)
              break
            case MotionMode.NOISE_FIELD:
            default:
              this.updateWithNoiseField(positions, time)
              break
          }
    
          // 标记位置属性需要更新
          this.points.geometry.attributes.position.needsUpdate = true

          // 更新呼吸效果（如果启用）
          if (this.config.enableBreathing) {
            this.updateBreathing(deltaTime)
          }

          // 更新粒子大小（如果启用基于速度的大小变化）
          if (this.config.enableSpeedBasedSize && this.sizes) {
            this.updateParticleSizes()
          }

          // 更新颜色（如果有颜色管理器）
          if (this.colorManager) {
            this.colorManager.update(deltaTime)
            this.updateColors()
          }

          // 更新轨迹（如果启用了轨迹）
          if (this.trailManager) {
            this.trailManager.update(positions)
          }
        } catch (error) {
          console.error('更新粒子系统时发生错误:', error)
        }
      }
  
  /**
   * 更新粒子颜色
     *
     * 从颜色管理器获取颜色并应用到粒子系统。
     * 使用批量复制优化性能。
     *
     * @private
     */
    private updateColors(): void {
      if (!this.colorManager) {
        return
      }

      try {
        // 如果颜色管理器需要粒子位置，先设置位置
        if (this.colorManager.getParticlePositions() === null && this.positions) {
          this.colorManager.setParticlePositions(this.positions, this.config.boundsRadius)
        }

        const colors = this.colorManager.getColors()
        const colorAttribute = this.points.geometry.attributes.color
        const array = colorAttribute.array as Float32Array

        // 使用批量复制优化性能（比逐个元素复制快 10-20 倍）
        array.set(colors)

        // 标记颜色属性需要更新
        colorAttribute.needsUpdate = true
      } catch (error) {
        console.error('更新粒子颜色时发生错误:', error)
      }
    }
  
    /**
     * 设置颜色管理器
     * 
     * 为粒子系统设置颜色管理器，用于动态颜色主题。
     * 
     * @param manager - 颜色管理器
     * 
     * @example
     * ```typescript
     * const colorManager = new ColorManager(newTheme, particleCount);
     * particleSystem.setColorManager(colorManager);
     * ```
     */
    setColorManager(manager: ColorManager): void {
      if (this.colorManager) {
        this.colorManager.dispose()
      }
  
      this.colorManager = manager
      this.colorManager.initialize()
      this.updateColors()
    }
  
    /**
     * 获取颜色管理器
     * 
     * @returns 当前颜色管理器，如果没有则返回 null
     */
    getColorManager(): ColorManager | null {
      return this.colorManager
    }
  
    /**
       * 切换颜色主题
       *
       * 快捷方法：直接切换颜色主题。
       *
       * @param theme - 新的颜色主题
       *
       * @example
       * ```typescript
       * particleSystem.setColorTheme(newTheme);
       * ```
       */
      setColorTheme(theme: ColorTheme): void {
        if (!this.colorManager) {
          this.colorManager = new ColorManager(theme, this.config.count)
        } else {
          this.colorManager.setTheme(theme)
        }
        this.updateColors()
      }
    
      /**
       * 更新呼吸效果
       *
       * 根据时间动态调整粒子大小，产生呼吸效果。
       * 使用正弦波函数实现平滑的大小变化。
       *
       * @param deltaTime - 时间增量（毫秒）
       * @private
       */
      private updateBreathing(deltaTime: number): void {
        // 累计时间（转换为秒）
        this.accumulatedTime += deltaTime / 1000

        // 使用正弦波计算大小变化
        // 大小范围：baseSize * (1 - amplitude) 到 baseSize * (1 + amplitude)
        const breathingFactor = Math.sin(this.accumulatedTime * this.breathingFrequency * Math.PI * 2)
        this.currentBreathingFactor = 1 + this.breathingAmplitude * breathingFactor

        // 如果没有启用基于速度的大小变化，直接更新材质大小
        if (!this.config.enableSpeedBasedSize) {
          const currentSize = this.baseSize * this.currentBreathingFactor
          if (this.points.material instanceof THREE.PointsMaterial) {
            this.points.material.size = currentSize
          } else if (this.points.material instanceof THREE.ShaderMaterial) {
            this.points.material.uniforms.uBaseSize.value = currentSize
          }
        }
      }

      /**
       * 更新粒子大小
       *
       * 根据呼吸效果和粒子速度计算每个粒子的大小。
       * 速度越快的粒子越大。
       *
       * @private
       */
      private updateParticleSizes(): void {
        if (!this.sizes || !this.velocities) {
          return
        }

        const len = this.sizes.length

        for (let i = 0; i < len; i++) {
          const i3 = i * 3

          // 计算粒子速度
          const speed = Math.sqrt(
            this.velocities[i3] * this.velocities[i3] +
            this.velocities[i3 + 1] * this.velocities[i3 + 1] +
            this.velocities[i3 + 2] * this.velocities[i3 + 2]
          )

          // 计算速度因子（归一化到 [0, 1]）
          const speedFactor = Math.min(speed / this.config.maxSpeed, 1.0)

          // 计算粒子大小：基础大小 * 呼吸因子 * (1 + 速度因子 * 影响因子)
          this.sizes[i] = this.baseSize * this.currentBreathingFactor * (1 + speedFactor * this.speedBasedSizeFactor)
        }

        // 标记大小属性需要更新
        const sizeAttribute = this.points.geometry.attributes.size
        if (sizeAttribute) {
          sizeAttribute.needsUpdate = true
        }
      }
    
      /**
       * 启用/禁用呼吸效果
       *
       * @param enabled - 是否启用呼吸效果
       */
      setBreathingEnabled(enabled: boolean): void {
        this.config.enableBreathing = enabled
    
        // 如果禁用，重置到基础大小
        if (!enabled) {
          if (this.points.material instanceof THREE.PointsMaterial) {
            this.points.material.size = this.baseSize
          }
        }
      }
    
      /**
       * 设置呼吸效果的振幅
       *
       * @param amplitude - 振幅（0-1），控制粒子大小的变化范围
       */
      setBreathingAmplitude(amplitude: number): void {
        this.breathingAmplitude = Math.max(0, Math.min(1, amplitude))
      }
    
      /**
       * 设置呼吸效果的频率
       *
       * @param frequency - 频率（Hz），控制呼吸速度
       */
      setBreathingFrequency(frequency: number): void {
        this.breathingFrequency = Math.max(0.1, frequency)
      }
    
      /**
       * 获取呼吸效果状态
       *
       * @returns 呼吸效果配置
       */
      getBreathingConfig(): { enabled: boolean; amplitude: number; frequency: number } {
        return {
          enabled: this.config.enableBreathing ?? false,
          amplitude: this.breathingAmplitude,
          frequency: this.breathingFrequency
        }
      }  /**
   * 释放粒子系统资源
   *
   * 从场景中移除粒子系统，并释放几何体和材质资源。
   * 显式释放数组的内存，防止内存泄漏。
   *
   * @param scene - Three.js 场景对象
   */
  dispose(scene: THREE.Scene): void {
    if (this.disposed) {
      return
    }

    try {
      // 释放轨迹管理器
      if (this.trailManager) {
        this.trailManager.dispose(scene)
        this.trailManager = null
      }

      scene.remove(this.points)
      this.points.geometry.dispose()
      ;(this.points.material as THREE.Material).dispose()

      // 显式释放内存
      if (this.positions) {
        this.positions.fill(0)
        this.positions = null
      }
      if (this.velocities) {
        this.velocities.fill(0)
        this.velocities = null
      }

      // 释放颜色管理器
      if (this.colorManager) {
        this.colorManager.dispose()
        this.colorManager = null
      }

      this.disposed = true
    } catch (error) {
      console.error('释放粒子系统资源失败:', error)
    }
  }

  /**
   * 获取当前配置
   * 
   * @returns 当前粒子系统配置
   */
  getConfig(): ParticleConfig {
    return { ...this.config }
  }

  /**
   * 获取发光效果配置
   * 
   * @returns 发光效果配置
   */
  getGlowConfig(): { enabled: boolean; intensity: number } {
    return {
      enabled: this.enableGlow,
      intensity: this.glowIntensity
    }
  }

  /**
   * 设置发光效果启用状态
   * 
   * @param enabled - 是否启用发光
   */
  setGlowEnabled(enabled: boolean): void {
    this.enableGlow = enabled
    if (this.points.material instanceof THREE.ShaderMaterial) {
      this.points.material.uniforms.uEnableGlow.value = enabled ? 1.0 : 0.0
    }
  }

  /**
   * 设置发光强度
   * 
   * @param intensity - 发光强度（0-2）
   */
  setGlowIntensity(intensity: number): void {
    this.glowIntensity = intensity
    if (this.points.material instanceof THREE.ShaderMaterial) {
      this.points.material.uniforms.uGlowIntensity.value = intensity
    }
  }

  /**
   * 更新粒子系统配置
   * 
   * 动态更新粒子系统的参数，无需重建整个系统。
   * 
   * @param config - 新的配置参数（部分更新）
   * 
   * @example
   * ```typescript
   * particleSystem.updateConfig({
   *   size: 2.0,
   *   velocityScale: 0.1
   * });
   * ```
   */
  updateConfig(config: Partial<ParticleConfig>): void {
    if (this.disposed) {
      return
    }

    try {
      // 更新粒子大小
      if (config.size !== undefined) {
        this.config.size = config.size
        this.baseSize = config.size
        if (this.points.material instanceof THREE.PointsMaterial) {
          this.points.material.size = config.size
        }
      }

      // 更新边界半径
      if (config.boundsRadius !== undefined) {
        this.config.boundsRadius = config.boundsRadius
      }

      // 更新速度缩放因子
      if (config.velocityScale !== undefined) {
        this.config.velocityScale = config.velocityScale
      }

      // 更新最大速度
      if (config.maxSpeed !== undefined) {
        this.config.maxSpeed = config.maxSpeed
      }

      // 更新轨迹配置
      if (config.trailConfig !== undefined && this.trailManager) {
        if (config.trailConfig.color !== undefined) {
          this.trailManager.setColor(config.trailConfig.color)
        }
        if (config.trailConfig.opacity !== undefined) {
          this.trailManager.setOpacity(config.trailConfig.opacity)
        }
        if (config.trailConfig.maxAge !== undefined) {
          this.trailManager.setMaxAge(config.trailConfig.maxAge)
        }
        if (config.trailConfig.lineWidth !== undefined) {
          this.trailManager.setLineWidth(config.trailConfig.lineWidth)
        }
      }

      // 更新发光效果配置
      if (config.enableGlow !== undefined) {
        this.enableGlow = config.enableGlow
        if (this.points.material instanceof THREE.ShaderMaterial) {
          this.points.material.uniforms.uEnableGlow.value = this.enableGlow ? 1.0 : 0.0
        }
      }

      if (config.glowIntensity !== undefined) {
        this.glowIntensity = config.glowIntensity
        if (this.points.material instanceof THREE.ShaderMaterial) {
          this.points.material.uniforms.uGlowIntensity.value = this.glowIntensity
        }
      }

      // 保存原始运动模式，用于后续比较
      const originalMotionMode = this.motionMode

      // 更新运动模式
      if (config.motionMode !== undefined) {
        this.motionMode = config.motionMode
        // 同步更新 attractorConfig 中的 motionMode
        this.attractorConfig.motionMode = config.motionMode
        // 同步更新 config 中的 motionMode
        this.config.motionMode = config.motionMode
      }

      // 更新吸引子配置
      if (config.attractorConfig !== undefined) {
        // 深度合并，避免覆盖嵌套对象
        this.attractorConfig = {
          motionMode: config.attractorConfig.motionMode ?? this.attractorConfig.motionMode,
          lorenz: config.attractorConfig.lorenz ? { ...this.attractorConfig.lorenz, ...config.attractorConfig.lorenz } : this.attractorConfig.lorenz,
          thomas: config.attractorConfig.thomas ? { ...this.attractorConfig.thomas, ...config.attractorConfig.thomas } : this.attractorConfig.thomas,
          clifford: config.attractorConfig.clifford ? { ...this.attractorConfig.clifford, ...config.attractorConfig.clifford } : this.attractorConfig.clifford,
          rossler: config.attractorConfig.rossler ? { ...this.attractorConfig.rossler, ...config.attractorConfig.rossler } : this.attractorConfig.rossler,
          timeScale: config.attractorConfig.timeScale ?? this.attractorConfig.timeScale,
          particleScale: config.attractorConfig.particleScale ?? this.attractorConfig.particleScale
        }
        // 同步更新 config 中的 attractorConfig
        this.config.attractorConfig = this.attractorConfig
        // 更新运动模式（如果 attractorConfig 中包含 motionMode）
        if (config.attractorConfig.motionMode !== undefined) {
          this.motionMode = config.attractorConfig.motionMode
          this.config.motionMode = config.attractorConfig.motionMode
        }
      }

      // 如果运动模式改变了，重新初始化粒子位置
      if (originalMotionMode !== this.motionMode && this.positions && this.velocities) {
        this.reinitializeParticles()
      }
    } catch (error) {
      console.error('更新粒子系统配置时发生错误:', error)
    }
  }

  /**
   * 设置轨迹颜色
   * 
   * @param color - RGB 颜色值（0-1）
   */
  setTrailColor(color: [number, number, number]): void {
    if (this.trailManager) {
      this.trailManager.setColor(color)
    }
  }

  /**
   * 设置轨迹透明度
   * 
   * @param opacity - 透明度值（0-1）
   */
  setTrailOpacity(opacity: number): void {
    if (this.trailManager) {
      this.trailManager.setOpacity(opacity)
    }
  }

  /**
   * 设置轨迹最大寿命
   * 
   * @param maxAge - 最大寿命（帧数）
   */
  setTrailMaxAge(maxAge: number): void {
    if (this.trailManager) {
      this.trailManager.setMaxAge(maxAge)
    }
  }

  /**
   * 设置轨迹宽度
   * 
   * @param lineWidth - 宽度值
   */
  setTrailLineWidth(lineWidth: number): void {
    if (this.trailManager) {
      this.trailManager.setLineWidth(lineWidth)
    }
  }

  /**
   * 获取轨迹管理器
   * 
   * @returns 轨迹管理器实例，如果没有启用轨迹则返回 null
   */
  getTrailManager(): TrailManager | null {
    return this.trailManager
  }
}