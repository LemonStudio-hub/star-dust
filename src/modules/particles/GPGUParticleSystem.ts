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
  /** 是否启用呼吸效果 */
  enableBreathing?: boolean
  /** 呼吸效果的振幅（0-1） */
  breathingAmplitude?: number
  /** 呼吸效果的频率（Hz） */
  breathingFrequency?: number
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
  /** 首次渲染标记 */
  private firstRender: boolean = true
  /** 更新计数器（用于调试） */
  private updateCount: number = 0
  /** 基础粒子大小 */
  private baseSize: number
  /** 呼吸效果：振幅 */
  private breathingAmplitude: number
  /** 呼吸效果：频率 */
  private breathingFrequency: number

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

    // 初始化呼吸效果参数
    this.baseSize = config.size
    this.breathingAmplitude = config.breathingAmplitude ?? 0.3
    this.breathingFrequency = config.breathingFrequency ?? 0.5

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

    // 执行两次初始计算，确保渲染目标正确初始化
    // 第一次：将初始数据写入渲染目标
    this.gpgpu.compute()
    console.log('[GPGUParticleSystem] 第一次 GPU 计算已完成')

    // 第二次：从第一个渲染目标读取数据并写入第二个
    this.gpgpu.compute()
    console.log('[GPGUParticleSystem] 第二次 GPU 计算已完成')

    // 创建粒子系统
    this.points = this.create(textureWidth, textureHeight)
    scene.add(this.points)

    // 初始化：设置位置纹理到渲染材质
    if (this.positionVariable && this.points.material instanceof THREE.ShaderMaterial) {
      const positionTarget = this.gpgpu.getCurrentRenderTarget(this.positionVariable)
      const texture = positionTarget.texture

      // 确保纹理正确配置
      texture.minFilter = THREE.NearestFilter
      texture.magFilter = THREE.NearestFilter
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.needsUpdate = true

      this.points.material.uniforms.tPosition.value = texture

      // 强制标记材质需要更新，触发重新编译
      this.points.material.needsUpdate = true

      // 验证纹理数据
      console.log('[GPGUParticleSystem] 初始位置纹理已设置', {
        textureWidth: texture.image.width,
        textureHeight: texture.image.height,
        uniformValue: this.points.material.uniforms.tPosition.value !== null,
        uniformName: Object.keys(this.points.material.uniforms)[0],
        materialNeedsUpdate: this.points.material.needsUpdate
      })
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

      // 位置（占位符，设置为非零值，确保几何体有效）
      // 虽然最终从 GPU 纹理读取位置，但 Three.js 需要有效的几何体数据
      positions[i3] = (Math.random() - 0.5) * 0.01
      positions[i3 + 1] = (Math.random() - 0.5) * 0.01
      positions[i3 + 2] = (Math.random() - 0.5) * 0.01

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

    // 创建一个临时纹理作为初始值（稍后会被替换）
    const tempTexture = new THREE.DataTexture(
      new Float32Array(width * height * 4),
      width,
      height,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    tempTexture.minFilter = THREE.NearestFilter
    tempTexture.magFilter = THREE.NearestFilter
    tempTexture.needsUpdate = true

    // 创建材质（使用自定义着色器从纹理读取位置）
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: tempTexture },
        uSize: { value: this.config.size },
        uTextureSize: { value: new THREE.Vector2(width, height) },
        uEnableBreathing: { value: this.config.enableBreathing ?? false },
        uBreathingAmplitude: { value: this.breathingAmplitude },
        uBreathingFrequency: { value: this.breathingFrequency },
        uTime: { value: 0 }
      },
      vertexShader: `
        uniform sampler2D tPosition;
        uniform float uSize;
        uniform vec2 uTextureSize;
        uniform bool uEnableBreathing;
        uniform float uBreathingAmplitude;
        uniform float uBreathingFrequency;
        uniform float uTime;
        attribute vec3 color;
        varying vec3 vColor;

        void main() {
          vColor = color;

          // 从纹理读取位置
          vec4 posData = texture2D(tPosition, uv);

          // 检查位置数据是否有效
          if (length(posData.rgb) < 0.001) {
            // 如果位置数据无效，跳过这个粒子
            gl_Position = vec4(0.0);
            gl_PointSize = 0.0;
            return;
          }

          vec4 mvPosition = modelViewMatrix * vec4(posData.rgb, 1.0);

          // 计算基础点大小，随距离衰减
          float basePointSize = uSize * (300.0 / -mvPosition.z);

          // 如果启用呼吸效果，应用正弦波变化
          if (uEnableBreathing) {
            float breathingFactor = sin(uTime * uBreathingFrequency * 6.28318);
            gl_PointSize = basePointSize * (1.0 + uBreathingAmplitude * breathingFactor);
          } else {
            gl_PointSize = basePointSize;
          }

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
      colorCount: geometry.attributes.color.count,
      positionBounds: {
        min: new THREE.Vector3().fromArray(positions.slice(0, 3)),
        max: new THREE.Vector3().fromArray(positions.slice(-3))
      }
    })
    return points
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
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.needsUpdate = true

        this.points.material.uniforms.tPosition.value = texture

        // 更新呼吸效果 uniforms
        if (this.config.enableBreathing) {
          this.points.material.uniforms.uTime.value = time
        }
        
        // 强制标记材质需要更新
        this.points.material.needsUpdate = true

        // 首次更新时添加详细日志
        if (!this.updateCount) {
          this.updateCount = 1
          console.log('[GPGUParticleSystem] 首次更新完成', {
            texture: texture,
            textureWidth: texture.image.width,
            textureHeight: texture.image.height,
            uniformValue: this.points.material.uniforms.tPosition.value !== null,
            materialCompiled: this.points.material.vertexShader !== null
          })
        }

        // 首次渲染时记录日志
        if (this.firstRender) {
          console.log('[GPGUParticleSystem] 首次渲染更新', {
            hasTexture: texture !== null,
            uniformSet: this.points.material.uniforms.tPosition.value !== null,
            textureSize: { width: texture.image.width, height: texture.image.height }
          })
          this.firstRender = false
        }
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
      // 如果颜色管理器需要粒子位置，从 GPU 读取位置数据
      if (this.colorManager.getParticlePositions() === null) {
        const positions = this.readGPUPositions()
        if (positions) {
          this.colorManager.setParticlePositions(positions, this.config.boundsRadius)
        }
      }

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
   * 从 GPU 读取粒子位置数据
   *
   * 这是一个开销较大的操作，仅在需要时调用。
   *
   * @returns 粒子位置数组，失败则返回 null
   * @private
   */
  private readGPUPositions(): Float32Array | null {
    try {
      if (!this.positionVariable) {
        return null
      }

      const renderTarget = this.gpgpu.getCurrentRenderTarget(this.positionVariable)
      if (!renderTarget) {
        return null
      }

      // 创建临时缓冲区读取 GPU 数据
      const textureWidth = renderTarget.width
      const textureHeight = renderTarget.height
      const bufferSize = this.config.count * 4
      const buffer = new Float32Array(bufferSize)

      // 从 GPU 读取数据
      this.renderer.renderer.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        textureWidth,
        textureHeight,
        buffer
      )

      // 提取位置数据（只取 RGB，忽略 A）
      const positions = new Float32Array(this.config.count * 3)
      for (let i = 0; i < this.config.count; i++) {
        const i4 = i * 4
        const i3 = i * 3
        positions[i3] = buffer[i4]
        positions[i3 + 1] = buffer[i4 + 1]
        positions[i3 + 2] = buffer[i4 + 2]
      }

      return positions
    } catch (error) {
      console.error('从 GPU 读取位置数据失败:', error)
      return null
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
   * 启用/禁用呼吸效果
   *
   * @param enabled - 是否启用呼吸效果
   */
  setBreathingEnabled(enabled: boolean): void {
    this.config.enableBreathing = enabled

    // 更新 shader uniform
    if (this.points.material instanceof THREE.ShaderMaterial) {
      this.points.material.uniforms.uEnableBreathing.value = enabled
    }
  }

  /**
   * 设置呼吸效果的振幅
   *
   * @param amplitude - 振幅（0-1），控制粒子大小的变化范围
   */
  setBreathingAmplitude(amplitude: number): void {
    this.breathingAmplitude = Math.max(0, Math.min(1, amplitude))

    // 更新 shader uniform
    if (this.points.material instanceof THREE.ShaderMaterial) {
      this.points.material.uniforms.uBreathingAmplitude.value = this.breathingAmplitude
    }
  }

  /**
   * 设置呼吸效果的频率
   *
   * @param frequency - 频率（Hz），控制呼吸速度
   */
  setBreathingFrequency(frequency: number): void {
    this.breathingFrequency = Math.max(0.1, frequency)

    // 更新 shader uniform
    if (this.points.material instanceof THREE.ShaderMaterial) {
      this.points.material.uniforms.uBreathingFrequency.value = this.breathingFrequency
    }
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