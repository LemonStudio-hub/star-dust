/**
 * 运动模式枚举
 * 
 * 定义粒子系统的不同运动模式，包括噪声场和混沌吸引子。
 * 
 * @module particles/MotionMode
 */

/**
 * 运动模式枚举
 * 
 * @enum {string}
 */
export enum MotionMode {
  /** 噪声场模式（默认）- 使用 FBM + Curl 噪声产生有机流动 */
  NOISE_FIELD = 'noise_field',
  /** Lorenz 吸引子 - 经典的蝴蝶形状混沌系统 */
  LORENZ = 'lorenz',
  /** Thomas 吸引子 - 三个对称螺旋臂的循环对称系统 */
  THOMAS = 'thomas',
  /** Clifford 吸引子 - 2D 平面上的复杂图案系统 */
  CLIFFORD = 'clifford',
  /** Rossler 吸引子 - 螺旋状混沌系统 */
  ROSSLER = 'rossler',
  /** 混合模式 - 噪声场与吸引子结合 */
  HYBRID = 'hybrid'
}

/**
 * Lorenz 吸引子参数配置
 * 
 * @interface LorenzConfig
 */
export interface LorenzConfig {
  /** σ 参数（普朗特数），控制对流强度，默认 10 */
  sigma: number
  /** ρ 参数（瑞利数），控制温度差，默认 28 */
  rho: number
  /** β 参数（几何因子），控制纵横比，默认 8/3 */
  beta: number
}

/**
 * Thomas 吸引子参数配置
 * 
 * @interface ThomasConfig
 */
export interface ThomasConfig {
  /** b 参数，默认 0.208186 */
  b: number
}

/**
 * Clifford 吸引子参数配置
 * 
 * @interface CliffordConfig
 */
export interface CliffordConfig {
  /** a 参数，默认 1.7 */
  a: number
  /** b 参数，默认 1.7 */
  b: number
  /** c 参数，默认 0.06 */
  c: number
  /** d 参数，默认 1.2 */
  d: number
}

/**
 * Rossler 吸引子参数配置
 * 
 * @interface RosslerConfig
 */
export interface RosslerConfig {
  /** a 参数，默认 0.2 */
  a: number
  /** b 参数，默认 0.2 */
  b: number
  /** c 参数，默认 5.7 */
  c: number
}

/**
 * 吸引子配置接口
 * 
 * @interface AttractorConfig
 */
export interface AttractorConfig {
  /** 运动模式 */
  motionMode: MotionMode
  /** Lorenz 吸引子参数 */
  lorenz?: LorenzConfig
  /** Thomas 吸引子参数 */
  thomas?: ThomasConfig
  /** Clifford 吸引子参数 */
  clifford?: CliffordConfig
  /** Rossler 吸引子参数 */
  rossler?: RosslerConfig
  /** 时间缩放因子，默认 0.001 */
  timeScale: number
  /** 粒子位置缩放因子，默认 0.01 */
  particleScale: number
}

/**
 * 默认 Lorenz 吸引子配置
 */
export const DEFAULT_LORENZ_CONFIG: LorenzConfig = {
  sigma: 10.0,
  rho: 28.0,
  beta: 8.0 / 3.0
}

/**
 * 默认 Thomas 吸引子配置
 */
export const DEFAULT_THOMAS_CONFIG: ThomasConfig = {
  b: 0.208186
}

/**
 * 默认 Clifford 吸引子配置
 */
export const DEFAULT_CLIFFORD_CONFIG: CliffordConfig = {
  a: 1.7,
  b: 1.7,
  c: 0.06,
  d: 1.2
}

/**
 * 默认 Rossler 吸引子配置
 */
export const DEFAULT_ROSSLER_CONFIG: RosslerConfig = {
  a: 0.2,
  b: 0.2,
  c: 5.7
}

/**
 * 默认吸引子配置
 */
export const DEFAULT_ATTRACTOR_CONFIG: AttractorConfig = {
  motionMode: MotionMode.NOISE_FIELD,
  lorenz: DEFAULT_LORENZ_CONFIG,
  thomas: DEFAULT_THOMAS_CONFIG,
  clifford: DEFAULT_CLIFFORD_CONFIG,
  rossler: DEFAULT_ROSSLER_CONFIG,
  timeScale: 0.001,
  particleScale: 0.01
}

/**
 * Lorenz 吸引子预设参数
 */
export const LORENZ_PRESETS: Record<string, LorenzConfig> = {
  '经典 Lorenz': {
    sigma: 10.0,
    rho: 28.0,
    beta: 8.0 / 3.0
  },
  '高混沌': {
    sigma: 10.0,
    rho: 40.0,
    beta: 8.0 / 3.0
  },
  '稳定模式': {
    sigma: 10.0,
    rho: 20.0,
    beta: 8.0 / 3.0
  }
}

/**
 * Clifford 吸引子预设参数
 */
export const CLIFFORD_PRESETS: Record<string, CliffordConfig> = {
  '经典 Clifford': {
    a: 1.7,
    b: 1.7,
    c: 0.06,
    d: 1.2
  },
  '复杂图案': {
    a: 1.468,
    b: 2.407,
    c: 0.194,
    d: 1.438
  },
  '细密纹理': {
    a: 1.4,
    b: -2.3,
    c: 2.4,
    d: -2.1
  }
}