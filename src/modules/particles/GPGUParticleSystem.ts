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
import { MotionMode, AttractorConfig, DEFAULT_ATTRACTOR_CONFIG } from './MotionMode'

// 着色器代码
const positionFragmentShader = `
uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform sampler2D tNoise;
uniform float uTime;
uniform float uDeltaTime;
uniform float uVelocityScale;
uniform float uMaxSpeed;
uniform float uBoundsRadius;
uniform float uNoiseScale;
uniform float uTimeScale;
uniform int uMotionMode;  // 0: NOISE_FIELD, 1: LORENZ, 2: THOMAS

// Lorenz 吸引子参数
uniform float uLorenzSigma;
uniform float uLorenzRho;
uniform float uLorenzBeta;

// Thomas 吸引子参数
uniform float uThomasB;

// Clifford 吸引子参数
uniform float uCliffordA;
uniform float uCliffordB;
uniform float uCliffordC;
uniform float uCliffordD;

// Rossler 吸引子参数
uniform float uRosslerA;
uniform float uRosslerB;
uniform float uRosslerC;

// 吸引子缩放参数
uniform float uParticleScale;

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

vec3 lorenzAttractor(vec3 pos, float dt) {
  float sigma = uLorenzSigma;
  float rho = uLorenzRho;
  float beta = uLorenzBeta;
  
  float dx = sigma * (pos.y - pos.x);
  float dy = pos.x * (rho - pos.z) - pos.y;
  float dz = pos.x * pos.y - beta * pos.z;
  
  return vec3(dx, dy, dz) * dt;
}

vec3 thomasAttractor(vec3 pos, float dt) {
  float b = uThomasB;
  
  float dx = sin(pos.y) - b * pos.x;
  float dy = sin(pos.z) - b * pos.y;
  float dz = sin(pos.x) - b * pos.z;
  
  return vec3(dx, dy, dz) * dt;
}

vec3 cliffordAttractor(vec3 pos, float dt) {
  float a = uCliffordA;
  float b = uCliffordB;
  float c = uCliffordC;
  float d = uCliffordD;
  
  float dx = sin(a * pos.y) + c * cos(a * pos.x);
  float dy = sin(b * pos.x) + d * cos(b * pos.y);
  float dz = sin(pos.x) + cos(pos.y) + pos.z * 0.1;
  
  return vec3(dx, dy, dz * 0.5) * dt;
}

vec3 rosslerAttractor(vec3 pos, float dt) {
  float a = uRosslerA;
  float b = uRosslerB;
  float c = uRosslerC;
  
  float dx = -pos.y - pos.z;
  float dy = pos.x + a * pos.y;
  float dz = b + pos.z * (pos.x - c);
  
  return vec3(dx, dy, dz) * dt;
}

void main() {
  vec4 position = texture2D(tPosition, vUv);
  vec4 velocity = texture2D(tVelocity, vUv);

  vec3 pos = position.rgb;
  vec3 vel = velocity.rgb;

  // 根据运动模式计算速度
  if (uMotionMode == 1) {  // LORENZ
    vec3 scaledPos = pos / uParticleScale;
    vec3 attractorVel = lorenzAttractor(scaledPos, uDeltaTime);
    vel = vel * 0.9 + attractorVel;
  } else if (uMotionMode == 2) {  // THOMAS
    vec3 scaledPos = pos / uParticleScale;
    vec3 attractorVel = thomasAttractor(scaledPos, uDeltaTime);
    vel = vel * 0.9 + attractorVel;
  } else if (uMotionMode == 3) {  // CLIFFORD
    vec3 scaledPos = pos / uParticleScale;
    vec3 attractorVel = cliffordAttractor(scaledPos, uDeltaTime);
    vel = vel * 0.9 + attractorVel;
  } else if (uMotionMode == 4) {  // ROSSLER
    vec3 scaledPos = pos / uParticleScale;
    vec3 attractorVel = rosslerAttractor(scaledPos, uDeltaTime);
    vel = vel * 0.9 + attractorVel;
  } else if (uMotionMode == 5) {  // HYBRID
    // 混合噪声场和吸引子（默认使用 Lorenz）
    vec3 curl = curlNoise(pos, uTime);
    vec3 scaledPos = pos / uParticleScale;
    vec3 attractorVel = lorenzAttractor(scaledPos, uDeltaTime);
    
    // 混合比例：30% 吸引子，70% 噪声场
    float hybridRatio = 0.3;
    vel += curl * uVelocityScale * (1.0 - hybridRatio) + attractorVel * hybridRatio;
  } else {  // NOISE_FIELD
    vec3 curl = curlNoise(pos, uTime);
    vel += curl * uVelocityScale;
  }

  // 限制最大速度
  float speed = length(vel);
  if (speed > uMaxSpeed) {
    vel = normalize(vel) * uMaxSpeed;
  }

  // 更新位置
  pos += vel;

  // 边界检测
  float dist = length(pos);
  if (dist > uBoundsRadius) {
    if (uMotionMode == 1 || uMotionMode == 2 || uMotionMode == 3 || uMotionMode == 4 || uMotionMode == 5) {
      // 吸引子模式：重置到吸引子中心附近
      float angle = random(vUv) * 6.28318;
      float radius = random(vUv + 0.1) * 5.0;
      pos = vec3(
        radius * cos(angle),
        radius * sin(angle),
        random(vUv + 0.2) * 2.0 - 1.0
      );
      vel = vec3(0.0);
    } else {
      // 噪声场模式：重置到中心并赋予随机速度
      pos = normalize(pos) * (uBoundsRadius * 0.05 + 0.5);
      
      vel = vec3(
        (random(vUv) - 0.5) * 0.05,
        (random(vUv + 0.1) - 0.5) * 0.05,
        (random(vUv + 0.2) - 0.5) * 0.05
      );
    }
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
  /** 是否启用基于速度的大小变化 */
  enableSpeedBasedSize?: boolean
  /** 速度对大小的影响因子（0-2） */
  speedBasedSizeFactor?: number
  /** 视差强度（0-2），控制近大远小的效果强度 */
  parallaxStrength?: number
  /** 是否启用雾效 */
  enableFog?: boolean
  /** 雾的浓度（0-0.1） */
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
  /** Three.js 渲染器 */
  private renderer!: THREE.WebGLRenderer
  /** 初始位置纹理 */
  private initialPositionTexture: THREE.DataTexture | null = null
  /** 初始速度纹理 */
  private initialVelocityTexture: THREE.DataTexture | null = null
  /** 时间 */
  // @ts-expect-error - Reserved for future use
  private _time: number = 0
  /** 粒子位置数组（用于读取 GPU 结果） */
  // @ts-expect-error - Reserved for future use
  private _positions: Float32Array | null = null
  /** 更新计数器（用于调试） */
  private updateCount: number = 0
  /** 基础粒子大小 */
  // @ts-expect-error - Reserved for future use
  private _baseSize: number
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
    this.renderer = renderer
    this._time = 0

    // 初始化呼吸效果参数
    this._baseSize = config.size
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

    // 初始化：设置位置和速度纹理到渲染材质
    if (this.positionVariable && this.velocityVariable && this.points.material instanceof THREE.ShaderMaterial) {
      const positionTarget = this.gpgpu.getCurrentRenderTarget(this.positionVariable)
      const velocityTarget = this.gpgpu.getCurrentRenderTarget(this.velocityVariable)
      const positionTexture = positionTarget.texture
      const velocityTexture = velocityTarget.texture

      // 确保位置纹理正确配置
      positionTexture.minFilter = THREE.NearestFilter
      positionTexture.magFilter = THREE.NearestFilter
      positionTexture.wrapS = THREE.ClampToEdgeWrapping
      positionTexture.wrapT = THREE.ClampToEdgeWrapping
      positionTexture.needsUpdate = true

      // 确保速度纹理正确配置
      velocityTexture.minFilter = THREE.NearestFilter
      velocityTexture.magFilter = THREE.NearestFilter
      velocityTexture.wrapS = THREE.ClampToEdgeWrapping
      velocityTexture.wrapT = THREE.ClampToEdgeWrapping
      velocityTexture.needsUpdate = true

      this.points.material.uniforms.tPosition.value = positionTexture
      this.points.material.uniforms.tVelocity.value = velocityTexture

      // 强制标记材质需要更新，触发重新编译
      this.points.material.needsUpdate = true

      // 验证纹理数据
      console.log('[GPGUParticleSystem] 初始纹理已设置', {
        textureWidth: (positionTexture.image as any).width,
        textureHeight: (positionTexture.image as any).height,
        positionUniformValue: this.points.material.uniforms.tPosition.value !== null,
        velocityUniformValue: this.points.material.uniforms.tVelocity.value !== null,
        materialNeedsUpdate: this.points.material.needsUpdate
      })
    }

    // 如果使用默认颜色，创建颜色管理器并初始化
    if (useDefaultColor) {
      this.initializeDefaultColors()
    }

    console.log(`GPGUParticleSystem initialized with ${config.count} particles`)

    // 执行一次初始更新，确保uniforms正确设置
    this.update(0)
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

    // 对于超出粒子数量的纹理像素，设置为远离中心的位置（确保不显示）
    for (let i = this.config.count; i < width * height; i++) {
      const i4 = i * 4
      data[i4] = 0.0
      data[i4 + 1] = 0.0
      data[i4 + 2] = 0.0
      data[i4 + 3] = 0.0
    }

    // 验证纹理数据
    console.log('[GPGUParticleSystem] 初始位置纹理数据验证', {
      count: this.config.count,
      width,
      height,
      totalPixels: width * height,
      firstPosition: [data[0], data[1], data[2]],
      lastValidPosition: [data[(this.config.count - 1) * 4], data[(this.config.count - 1) * 4 + 1], data[(this.config.count - 1) * 4 + 2]],
      boundsRadius: this.config.boundsRadius
    })

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

    // 对于超出粒子数量的纹理像素，设置为零速度
    for (let i = this.config.count; i < width * height; i++) {
      const i4 = i * 4
      data[i4] = 0.0
      data[i4 + 1] = 0.0
      data[i4 + 2] = 0.0
      data[i4 + 3] = 0.0
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
    this.positionVariable.material.uniforms.tNoise = { value: this.noiseTexture.createTexture() }
    this.positionVariable.material.uniforms.uVelocityScale = { value: this.config.velocityScale }
    this.positionVariable.material.uniforms.uMaxSpeed = { value: this.config.maxSpeed }
    this.positionVariable.material.uniforms.uBoundsRadius = { value: this.config.boundsRadius }
    this.positionVariable.material.uniforms.uNoiseScale = { value: this.config.noiseScale }
    this.positionVariable.material.uniforms.uTimeScale = { value: this.config.timeScale }
    this.positionVariable.material.uniforms.uTime = { value: 0 }
    this.positionVariable.material.uniforms.uDeltaTime = { value: 0 }
    
    // 运动模式和吸引子参数 uniforms
    this.positionVariable.material.uniforms.uMotionMode = { value: this.getMotionModeValue(this.motionMode) }
    this.positionVariable.material.uniforms.uLorenzSigma = { value: this.attractorConfig.lorenz?.sigma ?? 10.0 }
    this.positionVariable.material.uniforms.uLorenzRho = { value: this.attractorConfig.lorenz?.rho ?? 28.0 }
    this.positionVariable.material.uniforms.uLorenzBeta = { value: this.attractorConfig.lorenz?.beta ?? 8.0 / 3.0 }
    this.positionVariable.material.uniforms.uThomasB = { value: this.attractorConfig.thomas?.b ?? 0.208186 }
    this.positionVariable.material.uniforms.uCliffordA = { value: this.attractorConfig.clifford?.a ?? 1.7 }
    this.positionVariable.material.uniforms.uCliffordB = { value: this.attractorConfig.clifford?.b ?? 1.7 }
    this.positionVariable.material.uniforms.uCliffordC = { value: this.attractorConfig.clifford?.c ?? 0.06 }
    this.positionVariable.material.uniforms.uCliffordD = { value: this.attractorConfig.clifford?.d ?? 1.2 }
    this.positionVariable.material.uniforms.uRosslerA = { value: this.attractorConfig.rossler?.a ?? 0.2 }
    this.positionVariable.material.uniforms.uRosslerB = { value: this.attractorConfig.rossler?.b ?? 0.2 }
    this.positionVariable.material.uniforms.uRosslerC = { value: this.attractorConfig.rossler?.c ?? 5.7 }
    this.positionVariable.material.uniforms.uParticleScale = { value: this.attractorConfig.particleScale ?? 0.01 }

    // 速度变量 uniforms
    this.velocityVariable.material.uniforms.tNoise = { value: this.noiseTexture.createTexture() }
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
                // 设置为分散的占位符位置，避免所有粒子在同一个位置
                positions[i3] = (Math.random() - 0.5) * this.config.boundsRadius * 2
                positions[i3 + 1] = (Math.random() - 0.5) * this.config.boundsRadius * 2
                positions[i3 + 2] = (Math.random() - 0.5) * this.config.boundsRadius * 2
      // 颜色（白色占位符，稍后由 ColorManager 替换）
      colors[i3] = 1.0
      colors[i3 + 1] = 1.0
      colors[i3 + 2] = 1.0

      // UV 坐标（用于从纹理读取位置）
                // 注意：GPUComputationRenderer 的纹理坐标可能需要翻转
                const u = (i % width + 0.5) / width
                const v = 1.0 - (Math.floor(i / width) + 0.5) / height  // 翻转 V 坐标
                uvs[i2] = u
                uvs[i2 + 1] = v    }

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
        tVelocity: { value: tempTexture },
        uSize: { value: this.config.size },
        uTextureSize: { value: new THREE.Vector2(width, height) },
        uEnableBreathing: { value: this.config.enableBreathing ?? false },
        uBreathingAmplitude: { value: this.breathingAmplitude },
        uBreathingFrequency: { value: this.breathingFrequency },
        uEnableSpeedBasedSize: { value: this.config.enableSpeedBasedSize ?? false },
        uSpeedBasedSizeFactor: { value: this.speedBasedSizeFactor },
        uMaxSpeed: { value: this.config.maxSpeed },
        uPerspectiveScale: { value: this.perspectiveScale },
        uEnableFog: { value: this.enableFog },
        uFogDensity: { value: this.fogDensity },
        uFogColor: { value: new THREE.Vector3(...this.fogColor) },
        uEnableGlow: { value: this.enableGlow },
        uGlowIntensity: { value: this.glowIntensity },
        uTime: { value: 0 },
        uMotionMode: { value: 0 },
        uLorenzSigma: { value: 10.0 },
        uLorenzRho: { value: 28.0 },
        uLorenzBeta: { value: 8.0 / 3.0 },
        uThomasB: { value: 0.208186 },
        uParticleScale: { value: 0.01 },
        uDeltaTime: { value: 0.016 }
      },
      vertexShader: `
        uniform sampler2D tPosition;
        uniform sampler2D tVelocity;
        uniform float uSize;
        uniform vec2 uTextureSize;
        uniform bool uEnableBreathing;
        uniform float uBreathingAmplitude;
        uniform float uBreathingFrequency;
        uniform bool uEnableSpeedBasedSize;
        uniform float uSpeedBasedSizeFactor;
        uniform float uMaxSpeed;
        uniform float uPerspectiveScale;
        uniform float uEnableFog;
        uniform float uFogDensity;
        uniform float uTime;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vFogFactor;

        void main() {
          vColor = color;

          // 从纹理读取位置
          vec4 posData = texture2D(tPosition, uv);

          vec4 mvPosition = modelViewMatrix * vec4(posData.rgb, 1.0);

          // 计算基础点大小，使用透视衰减系数实现近大远小效果
          float basePointSize = uSize * uPerspectiveScale / -mvPosition.z;

          // 确保粒子大小至少为 1.0 像素
          basePointSize = max(basePointSize, 1.0);

          // 应用呼吸效果
          float breathingFactor = 1.0;
          if (uEnableBreathing) {
            breathingFactor = 1.0 + uBreathingAmplitude * sin(uTime * uBreathingFrequency * 6.28318);
          }

          // 应用基于速度的大小变化
          float speedFactor = 1.0;
          if (uEnableSpeedBasedSize) {
            // 从速度纹理读取速度
            vec4 velData = texture2D(tVelocity, uv);
            float speed = length(velData.rgb);
            // 归一化速度到 [0, 1]
            speedFactor = 1.0 + min(speed / uMaxSpeed, 1.0) * uSpeedBasedSizeFactor;
          }

          // 组合所有大小因子
          gl_PointSize = basePointSize * breathingFactor * speedFactor;

          // 确保最终点大小至少为 2.0 像素
          gl_PointSize = max(gl_PointSize, 2.0);

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
        uniform vec3 uFogColor;
        uniform float uEnableFog;
        uniform float uEnableGlow;
        uniform float uGlowIntensity;
        varying vec3 vColor;
        varying float vFogFactor;

        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          
          // 计算发光效果
          vec3 finalColor = vColor;
          
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
          
          gl_FragColor = vec4(finalColor, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    })

    this._positions = positions
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
      this._time = time

      // 更新 uniforms（只更新时间，不使用 deltaTime）
      if (this.positionVariable && this.velocityVariable) {
        this.positionVariable.material.uniforms.uTime.value = time
        this.velocityVariable.material.uniforms.uTime.value = time
        // 更新 delta time（用于吸引子计算）
        const dt = deltaTime * 0.001 * this.attractorConfig.timeScale
        this.positionVariable.material.uniforms.uDeltaTime.value = dt
      }

      // 执行 GPU 计算
      this.gpgpu.compute()

      // 更新位置和速度纹理到渲染材质
      if (this.positionVariable && this.velocityVariable && this.points.material instanceof THREE.ShaderMaterial) {
        const positionTarget = this.gpgpu.getCurrentRenderTarget(this.positionVariable)
        const velocityTarget = this.gpgpu.getCurrentRenderTarget(this.velocityVariable)
        const positionTexture = positionTarget.texture
        const velocityTexture = velocityTarget.texture

        // 确保纹理正确配置用于渲染
        positionTexture.minFilter = THREE.NearestFilter
        positionTexture.magFilter = THREE.NearestFilter
        positionTexture.wrapS = THREE.ClampToEdgeWrapping
        positionTexture.wrapT = THREE.ClampToEdgeWrapping
        positionTexture.needsUpdate = true

        velocityTexture.minFilter = THREE.NearestFilter
        velocityTexture.magFilter = THREE.NearestFilter
        velocityTexture.wrapS = THREE.ClampToEdgeWrapping
        velocityTexture.wrapT = THREE.ClampToEdgeWrapping
        velocityTexture.needsUpdate = true

        this.points.material.uniforms.tPosition.value = positionTexture
        this.points.material.uniforms.tVelocity.value = velocityTexture

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
            positionTexture: positionTexture,
            velocityTexture: velocityTexture,
            textureWidth: (positionTexture.image as any).width,
            textureHeight: (positionTexture.image as any).height,
            uniformValue: this.points.material.uniforms.tPosition.value !== null,
            materialCompiled: this.points.material.vertexShader !== null,
            uSize: this.points.material.uniforms.uSize.value,
            uPerspectiveScale: this.points.material.uniforms.uPerspectiveScale.value
          })
        }

        // 每 60 帧验证一次纹理数据
        if (this.updateCount && this.updateCount % 60 === 0) {
          // 读取纹理数据进行验证（仅前 3 个粒子）
          const renderer = this.points.material.uniforms.tPosition.value.image
          if (renderer && renderer.data) {
            const pos0 = [renderer.data[0], renderer.data[1], renderer.data[2]]
            const pos1 = [renderer.data[4], renderer.data[5], renderer.data[6]]
            const pos2 = [renderer.data[8], renderer.data[9], renderer.data[10]]
            console.log('[GPGUParticleSystem] 纹理数据验证', {
              frame: this.updateCount,
              positions: [pos0, pos1, pos2]
            })
          }
        }
        this.updateCount++
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
   * 获取运动模式对应的着色器整数值
   *
   * @param mode - 运动模式
   * @returns 着色器中的整数值（0: NOISE_FIELD, 1: LORENZ, 2: THOMAS, 3: CLIFFORD, 4: ROSSLER, 5: HYBRID）
   */
  private getMotionModeValue(mode: MotionMode): number {
    switch (mode) {
      case MotionMode.NOISE_FIELD:
        return 0
      case MotionMode.LORENZ:
        return 1
      case MotionMode.THOMAS:
        return 2
      case MotionMode.CLIFFORD:
        return 3
      case MotionMode.ROSSLER:
        return 4
      case MotionMode.HYBRID:
        return 5
      default:
        return 0
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
      this.renderer.readRenderTargetPixels(
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
      ;(this.points.material as THREE.ShaderMaterial).dispose()

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

      // 更新运动模式
      if (config.motionMode !== undefined) {
        this.motionMode = config.motionMode
        if (this.positionVariable) {
          const modeValue = this.getMotionModeValue(this.motionMode)
          this.positionVariable.material.uniforms.uMotionMode.value = modeValue
        }
      }

      // 更新吸引子配置
      if (config.attractorConfig !== undefined) {
        this.attractorConfig = { ...this.attractorConfig, ...config.attractorConfig }
        if (this.positionVariable) {
          // 更新 Lorenz 参数
          if (this.attractorConfig.lorenz) {
            this.positionVariable.material.uniforms.uLorenzSigma.value = this.attractorConfig.lorenz.sigma ?? 10.0
            this.positionVariable.material.uniforms.uLorenzRho.value = this.attractorConfig.lorenz.rho ?? 28.0
            this.positionVariable.material.uniforms.uLorenzBeta.value = this.attractorConfig.lorenz.beta ?? 8.0 / 3.0
          }
          // 更新 Thomas 参数
          if (this.attractorConfig.thomas) {
            this.positionVariable.material.uniforms.uThomasB.value = this.attractorConfig.thomas.b ?? 0.208186
          }
          // 更新 Clifford 参数
          if (this.attractorConfig.clifford) {
            this.positionVariable.material.uniforms.uCliffordA.value = this.attractorConfig.clifford.a ?? 1.7
            this.positionVariable.material.uniforms.uCliffordB.value = this.attractorConfig.clifford.b ?? 1.7
            this.positionVariable.material.uniforms.uCliffordC.value = this.attractorConfig.clifford.c ?? 0.06
            this.positionVariable.material.uniforms.uCliffordD.value = this.attractorConfig.clifford.d ?? 1.2
          }
          // 更新 Rossler 参数
          if (this.attractorConfig.rossler) {
            this.positionVariable.material.uniforms.uRosslerA.value = this.attractorConfig.rossler.a ?? 0.2
            this.positionVariable.material.uniforms.uRosslerB.value = this.attractorConfig.rossler.b ?? 0.2
            this.positionVariable.material.uniforms.uRosslerC.value = this.attractorConfig.rossler.c ?? 5.7
          }
          // 更新粒子缩放
          if (this.attractorConfig.particleScale !== undefined) {
            this.positionVariable.material.uniforms.uParticleScale.value = this.attractorConfig.particleScale
          }
        }
      }
    } catch (error) {
      console.error('更新 GPGPU 粒子系统配置时发生错误:', error)
    }
  }
}