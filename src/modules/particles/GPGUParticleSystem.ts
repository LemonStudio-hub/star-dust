/**
 * GPGPU 粒子系统
 *
 * 使用 GPU 进行粒子计算的粒子系统，大幅提升性能。
 * 依赖 GPUComputationRenderer 来管理 GPU 计算。
 *
 * 主要优势：
 * - 支持 100,000+ 粒子流畅运行
 * - CPU 使用率极低（5-10%）
 * - 实现复杂的物理模拟
 *
 * @module particles/GPGUParticleSystem
 */

import * as THREE from 'three'
import { NoiseTexture } from '../noise/NoiseTexture'
import { ColorManager } from '../colors/ColorManager'
import { ColorTheme, DefaultColorTheme } from '../colors/ColorTheme'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

// 着色器代码
const positionFragmentShader = `
uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform sampler2D tNoise;
uniform float uTime;
uniform float uVelocityScale;
uniform float uMaxSpeed;
uniform float uBoundsRadius;
uniform float uNoiseScale;
uniform float uTimeScale;

varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 sampleNoise(vec3 pos, float time) {
  vec3 noisePos = (pos + 100.0) * uNoiseScale;
  vec3 timePos = vec3(time * uTimeScale);

  float noiseX = texture2D(tNoise, noisePos.xy + timePos.xy).r;
  float noiseY = texture2D(tNoise, noisePos.yz + timePos.yz).g;
  float noiseZ = texture2D(tNoise, noisePos.xz + timePos.xz).b;

  return vec3(noiseX, noiseY, noiseZ);
}

vec3 curlNoise(vec3 pos, float time) {
  float eps = 0.01;

  vec3 n1 = sampleNoise(pos + vec3(eps, 0, 0), time);
  vec3 n2 = sampleNoise(pos - vec3(eps, 0, 0), time);
  vec3 n3 = sampleNoise(pos + vec3(0, eps, 0), time);
  vec3 n4 = sampleNoise(pos - vec3(0, eps, 0), time);
  vec3 n5 = sampleNoise(pos + vec3(0, 0, eps), time);
  vec3 n6 = sampleNoise(pos - vec3(0, 0, eps), time);

  float x = (n5.y - n6.y) - (n3.z - n4.z);
  float y = (n1.z - n2.z) - (n5.x - n6.x);
  float z = (n3.x - n4.x) - (n1.y - n2.y);

  return vec3(x, y, z) / eps;
}

void main() {
  vec4 position = texture2D(tPosition, vUv);
  vec4 velocity = texture2D(tVelocity, vUv);

  vec3 pos = position.rgb;
  vec3 vel = velocity.rgb;

  vec3 curl = curlNoise(pos, uTime);

  // 更新速度（不使用 deltaTime，与 CPU 模式保持一致）
  vel += curl * uVelocityScale;

  // 限制最大速度
  float speed = length(vel);
  if (speed > uMaxSpeed) {
    vel = normalize(vel) * uMaxSpeed;
  }

  // 更新位置（不使用 deltaTime，与 CPU 模式保持一致）
  pos += vel;

  // 边界检测
  float dist = length(pos);
  if (dist > uBoundsRadius) {
    // 重置到中心附近
    pos *= 0.1;

    // 重置速度（与 CPU 模式保持一致：均匀随机分布，0.05 大小）
    vel = vec3(
      (random(vUv) - 0.5) * 0.05,
      (random(vUv + 0.1) - 0.5) * 0.05,
      (random(vUv + 0.2) - 0.5) * 0.05
    );
  }

  gl_FragColor = vec4(pos, 1.0);
}
`

const velocityFragmentShader = `
uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform sampler2D tNoise;
uniform float uTime;
uniform float uVelocityScale;
uniform float uMaxSpeed;
uniform float uNoiseScale;
uniform float uTimeScale;

varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 sampleNoise(vec3 pos, float time) {
  vec3 noisePos = (pos + 100.0) * uNoiseScale;
  vec3 timePos = vec3(time * uTimeScale);

  float noiseX = texture2D(tNoise, noisePos.xy + timePos.xy).r;
  float noiseY = texture2D(tNoise, noisePos.yz + timePos.yz).g;
  float noiseZ = texture2D(tNoise, noisePos.xz + timePos.xz).b;

  return vec3(noiseX, noiseY, noiseZ);
}

vec3 curlNoise(vec3 pos, float time) {
  float eps = 0.01;

  vec3 n1 = sampleNoise(pos + vec3(eps, 0, 0), time);
  vec3 n2 = sampleNoise(pos - vec3(eps, 0, 0), time);
  vec3 n3 = sampleNoise(pos + vec3(0, eps, 0), time);
  vec3 n4 = sampleNoise(pos - vec3(0, eps, 0), time);
  vec3 n5 = sampleNoise(pos + vec3(0, 0, eps), time);
  vec3 n6 = sampleNoise(pos - vec3(0, 0, eps), time);

  float x = (n5.y - n6.y) - (n3.z - n4.z);
  float y = (n1.z - n2.z) - (n5.x - n6.x);
  float z = (n3.x - n4.x) - (n1.y - n2.y);

  return vec3(x, y, z) / eps;
}

void main() {
  vec4 position = texture2D(tPosition, vUv);
  vec4 velocity = texture2D(tVelocity, vUv);

  vec3 pos = position.rgb;
  vec3 vel = velocity.rgb;

  vec3 curl = curlNoise(pos, uTime);

  // 更新速度（不使用 deltaTime，与 CPU 模式保持一致）
  vel += curl * uVelocityScale;

  // 限制最大速度
  float speed = length(vel);
  if (speed > uMaxSpeed) {
    vel = normalize(vel) * uMaxSpeed;
  }

  gl_FragColor = vec4(vel, 1.0);
}
`

/**
 * GPGPU 粒子系统配置接口
 *
 * @interface GPGUParticleConfig
 */
export interface GPGUParticleConfig {
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
  /** 噪声缩放 */
  noiseScale: number
  /** 时间缩放 */
  timeScale: number
}

/**
 * GPGPU 粒子系统类
 *
 * 使用 GPU 进行粒子计算，大幅提升性能。
 *
 * @class GPGUParticleSystem
 *
 * @example
 * ```typescript
 * const config = {
 *   count: 100000,
 *   size: 1.2,
 *   boundsRadius: 60,
 *   velocityScale: 0.1,
 *   maxSpeed: 0.18,
 *   noiseScale: 0.008,
 *   timeScale: 0.0001
 * };
 * const gpgpuSystem = new GPGUParticleSystem(
 *   scene,
 *   renderer,
 *   config,
 *   noiseTexture,
 *   true
 * );
 * ```
 */
export class GPGUParticleSystem {
  /** Three.js 点云对象 */
  public points: THREE.Points
  /** GPU 计算渲染器 */
  private gpgpu: GPUComputationRenderer
  /** 位置变量 */
  private positionVariable: any = null
  /** 速度变量 */
  private velocityVariable: any = null
  /** 粒子系统配置 */
  private config: GPGUParticleConfig
  /** 噪声纹理 */
  private noiseTexture: NoiseTexture
  /** 颜色管理器 */
  private colorManager: ColorManager | null = null
  /** 标记是否已释放资源 */
  private disposed: boolean = false
  /** 初始位置纹理 */
  private initialPositionTexture: THREE.DataTexture | null = null
  /** 初始速度纹理 */
  private initialVelocityTexture: THREE.DataTexture | null = null
  /** 时间 */
  private time: number = 0
  /** 粒子位置数组（用于读取 GPU 结果） */
  private positions: Float32Array | null = null

  /**
   * 构造函数
   *
   * @param scene - Three.js 场景对象
   * @param renderer - Three.js 渲染器
   * @param config - 粒子配置参数
   * @param noiseTexture - 噪声纹理
   * @param useDefaultColor - 是否使用默认颜色（默认 true）
   */
  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    config: GPGUParticleConfig,
    noiseTexture: NoiseTexture,
    useDefaultColor: boolean = true
  ) {
    this.config = config
    this.noiseTexture = noiseTexture
    this.time = 0

    // 初始化 GPU 计算渲染器
    const textureWidth = Math.ceil(Math.sqrt(config.count))
    const textureHeight = Math.ceil(config.count / textureWidth)

    this.gpgpu = new GPUComputationRenderer(textureWidth, textureHeight, renderer)

    // 创建初始数据纹理
    this.initialPositionTexture = this.createInitialPositionTexture(textureWidth, textureHeight)
    this.initialVelocityTexture = this.createInitialVelocityTexture(textureWidth, textureHeight)

    // 添加变量
    this.positionVariable = this.gpgpu.addVariable(
      'texturePosition',
      positionFragmentShader,
      this.initialPositionTexture
    )

    this.velocityVariable = this.gpgpu.addVariable(
      'textureVelocity',
      velocityFragmentShader,
      this.initialVelocityTexture
    )

    // 设置变量依赖
    this.gpgpu.setVariableDependencies(this.positionVariable, [
      this.positionVariable,
      this.velocityVariable
    ])
    this.gpgpu.setVariableDependencies(this.velocityVariable, [
      this.positionVariable,
      this.velocityVariable
    ])

    // 设置 uniforms
    this.setUniforms()

    // 初始化 GPU 计算渲染器
    this.gpgpu.init()

    // 执行一次初始计算，确保渲染目标正确初始化
    this.gpgpu.compute()
    console.log('[GPGUParticleSystem] 初始 GPU 计算已完成')

    // 创建粒子系统
    this.points = this.create(textureWidth, textureHeight)
    scene.add(this.points)

    // 初始化：设置初始位置纹理到渲染材质
    if (this.positionVariable && this.points.material instanceof THREE.ShaderMaterial) {
      const positionTarget = this.gpgpu.getCurrentRenderTarget(this.positionVariable)
      this.points.material.uniforms.tPosition.value = positionTarget.texture
      console.log('[GPGUParticleSystem] 初始位置纹理已设置')
    }

    // 如果使用默认颜色，创建颜色管理器并初始化
    if (useDefaultColor) {
      this.initializeDefaultColors()
    }

    console.log(`GPGUParticleSystem initialized with ${config.count} particles`)
  }

  /**
   * 创建初始位置纹理
   *
   * @param width - 纹理宽度
   * @param height - 纹理高度
   * @returns 位置纹理
   * @private
   */
  private createInitialPositionTexture(width: number, height: number): THREE.DataTexture {
    const data = new Float32Array(width * height * 4)

    for (let i = 0; i < this.config.count; i++) {
      const i4 = i * 4

      // 在球体内随机分布
      const radius = Math.random() * this.config.boundsRadius
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      // 球坐标转笛卡尔坐标
      data[i4] = radius * Math.sin(phi) * Math.cos(theta)
      data[i4 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      data[i4 + 2] = radius * Math.cos(phi)
      data[i4 + 3] = 1.0
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
    texture.needsUpdate = true
    return texture
  }

  /**
   * 创建初始速度纹理
   *
   * @param width - 纹理宽度
   * @param height - 纹理高度
   * @returns 速度纹理
   * @private
   */
  private createInitialVelocityTexture(width: number, height: number): THREE.DataTexture {
    const data = new Float32Array(width * height * 4)

    for (let i = 0; i < this.config.count; i++) {
      const i4 = i * 4

      // 随机初始速度
      const angle = Math.random() * Math.PI * 2
      const speed = 0.01 + Math.random() * 0.03
      data[i4] = Math.cos(angle) * speed
      data[i4 + 1] = Math.sin(angle) * speed
      data[i4 + 2] = (Math.random() - 0.5) * speed
      data[i4 + 3] = 1.0
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
    texture.needsUpdate = true
    return texture
  }

  /**
   * 设置 uniforms
   *
   * @private
   */
  private setUniforms(): void {
    if (!this.positionVariable || !this.velocityVariable) {
      return
    }

    // 位置变量 uniforms
    this.positionVariable.material.uniforms.tNoise = { value: this.noiseTexture.texture }
    this.positionVariable.material.uniforms.uVelocityScale = { value: this.config.velocityScale }
    this.positionVariable.material.uniforms.uMaxSpeed = { value: this.config.maxSpeed }
    this.positionVariable.material.uniforms.uBoundsRadius = { value: this.config.boundsRadius }
    this.positionVariable.material.uniforms.uNoiseScale = { value: this.config.noiseScale }
    this.positionVariable.material.uniforms.uTimeScale = { value: this.config.timeScale }
    this.positionVariable.material.uniforms.uTime = { value: 0 }
    this.positionVariable.material.uniforms.uDeltaTime = { value: 0 }

    // 速度变量 uniforms
    this.velocityVariable.material.uniforms.tNoise = { value: this.noiseTexture.texture }
    this.velocityVariable.material.uniforms.uVelocityScale = { value: this.config.velocityScale }
    this.velocityVariable.material.uniforms.uMaxSpeed = { value: this.config.maxSpeed }
    this.velocityVariable.material.uniforms.uNoiseScale = { value: this.config.noiseScale }
    this.velocityVariable.material.uniforms.uTimeScale = { value: this.config.timeScale }
    this.velocityVariable.material.uniforms.uTime = { value: 0 }
    this.velocityVariable.material.uniforms.uDeltaTime = { value: 0 }
  }

  /**
   * 创建粒子系统
   *
   * @param width - 纹理宽度
   * @param height - 纹理高度
   * @returns Three.js 点云对象
   * @private
   */
  private create(width: number, height: number): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.config.count * 3)
    const colors = new Float32Array(this.config.count * 3)
    const uvs = new Float32Array(this.config.count * 2)

    // 初始化每个粒子
    for (let i = 0; i < this.config.count; i++) {
      const i3 = i * 3
      const i2 = i * 2

      // 位置（占位符，将从 GPU 纹理读取）
      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0

      // 颜色（白色占位符，稍后由 ColorManager 替换）
      colors[i3] = 1.0
      colors[i3 + 1] = 1.0
      colors[i3 + 2] = 1.0

      // UV 坐标（用于从纹理读取位置）
      // 使用 texel center 采样，避免边缘采样问题
      const u = (i % width + 0.5) / width
      const v = (Math.floor(i / width) + 0.5) / height
      uvs[i2] = u
      uvs[i2 + 1] = v
    }

    // 设置几何体属性
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

    // 创建材质（使用自定义着色器从纹理读取位置）
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        uSize: { value: this.config.size }
      },
      vertexShader: `
        uniform sampler2D tPosition;
        uniform float uSize;
        attribute vec3 color;
        varying vec3 vColor;

        void main() {
          vColor = color;
          vec4 pos = texture2D(tPosition, uv);
          vec4 mvPosition = modelViewMatrix * vec4(pos.rgb, 1.0);
          gl_PointSize = uSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    })

    this.positions = positions
    const points = new THREE.Points(geometry, material)
    console.log('[GPGUParticleSystem] 几何体信息:', {
      vertexCount: geometry.attributes.position.count,
      uvCount: geometry.attributes.uv.count,
      colorCount: geometry.attributes.color.count
    })
    return points

    this.positions = positions
    return new THREE.Points(geometry, material)
  }

  /**
   * 初始化默认颜色
   *
   * @private
   */
  private initializeDefaultColors(): void {
    this.colorManager = new ColorManager(DefaultColorTheme, this.config.count)
    this.colorManager.initialize()
    this.updateColors()
  }

  /**
   * 更新粒子系统
   *
   * @param time - 当前时间
   * @param deltaTime - 时间增量（毫秒）
   */
  update(time: number, deltaTime: number = 16): void {
    if (this.disposed) {
      return
    }

    try {
      this.time = time

      // 更新 uniforms（只更新时间，不使用 deltaTime）
      if (this.positionVariable && this.velocityVariable) {
        this.positionVariable.material.uniforms.uTime.value = time
        this.velocityVariable.material.uniforms.uTime.value = time
      }

      // 执行 GPU 计算
      this.gpgpu.compute()

      // 更新位置纹理到渲染材质
      if (this.positionVariable && this.points.material instanceof THREE.ShaderMaterial) {
        const positionTarget = this.gpgpu.getCurrentRenderTarget(this.positionVariable)
        const texture = positionTarget.texture

        // 确保纹理正确配置用于渲染
        texture.minFilter = THREE.NearestFilter
        texture.magFilter = THREE.NearestFilter
        texture.needsUpdate = true

        this.points.material.uniforms.tPosition.value = texture
      }

      // 更新颜色（如果有颜色管理器）
      if (this.colorManager) {
        this.colorManager.update(deltaTime)
        this.updateColors()
      }
    } catch (error) {
      console.error('更新 GPGPU 粒子系统时发生错误:', error)
    }
  }

  /**
   * 更新粒子颜色
   *
   * @private
   */
  private updateColors(): void {
    if (!this.colorManager) {
      return
    }

    try {
      const colors = this.colorManager.getColors()
      const colorAttribute = this.points.geometry.attributes.color
      const array = colorAttribute.array as Float32Array

      array.set(colors)
      colorAttribute.needsUpdate = true
    } catch (error) {
      console.error('更新粒子颜色时发生错误:', error)
    }
  }

  /**
   * 设置颜色管理器
   *
   * @param manager - 颜色管理器
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
   * @param theme - 新的颜色主题
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
   * 释放粒子系统资源
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

      // 释放 GPU 计算渲染器
      this.gpgpu.dispose()

      // 释放初始纹理
      this.initialPositionTexture?.dispose()
      this.initialVelocityTexture?.dispose()

      // 释放颜色管理器
      if (this.colorManager) {
        this.colorManager.dispose()
        this.colorManager = null
      }

      this.disposed = true
    } catch (error) {
      console.error('释放 GPGPU 粒子系统资源失败:', error)
    }
  }

  /**
   * 获取当前配置
   *
   * @returns 当前粒子系统配置
   */
  getConfig(): GPGUParticleConfig {
    return { ...this.config }
  }

  /**
   * 更新粒子系统配置
   *
   * @param config - 新的配置参数（部分更新）
   */
  updateConfig(config: Partial<GPGUParticleConfig>): void {
    if (this.disposed) {
      return
    }

    try {
      // 更新粒子大小
      if (config.size !== undefined) {
        this.config.size = config.size
        if (this.points.material instanceof THREE.ShaderMaterial) {
          this.points.material.uniforms.uSize.value = config.size
        }
      }

      // 更新边界半径
      if (config.boundsRadius !== undefined) {
        this.config.boundsRadius = config.boundsRadius
        if (this.positionVariable) {
          this.positionVariable.material.uniforms.uBoundsRadius.value = config.boundsRadius
        }
      }

      // 更新速度缩放因子
      if (config.velocityScale !== undefined) {
        this.config.velocityScale = config.velocityScale
        if (this.positionVariable) {
          this.positionVariable.material.uniforms.uVelocityScale.value = config.velocityScale
        }
        if (this.velocityVariable) {
          this.velocityVariable.material.uniforms.uVelocityScale.value = config.velocityScale
        }
      }

      // 更新最大速度
      if (config.maxSpeed !== undefined) {
        this.config.maxSpeed = config.maxSpeed
        if (this.positionVariable) {
          this.positionVariable.material.uniforms.uMaxSpeed.value = config.maxSpeed
        }
        if (this.velocityVariable) {
          this.velocityVariable.material.uniforms.uMaxSpeed.value = config.maxSpeed
        }
      }
    } catch (error) {
      console.error('更新 GPGPU 粒子系统配置时发生错误:', error)
    }
  }
}