/**
 * 应用统一配置
 *
 * 集中管理所有应用级别的配置，确保配置一致性和可维护性。
 *
 * @module config/AppConfig
 */

/**
 * 粒子配置默认值
 */
/**
 * 统一应用配置模块
 *
 * 集中管理所有应用级别的配置常量。
 * 使用这些常量可以确保配置的一致性和可维护性。
 *
 * @module config/AppConfig
 *
 * @example
 * ```typescript
 * import { PARTICLE_CONFIG, RENDERER_CONFIG, PERFORMANCE_CONFIG } from '@/config/AppConfig'
 *
 * // 使用粒子配置
 * const particleCount = PARTICLE_CONFIG.COUNT
 * const particleSize = PARTICLE_CONFIG.SIZE
 *
 * // 使用渲染器配置
 * const maxPixelRatio = RENDERER_CONFIG.MAX_PIXEL_RATIO
 * const fov = RENDERER_CONFIG.FIELD_OF_VIEW
 * ```
 */

/**
 * 粒子配置常量
 *
 * 控制粒子的数量、大小、边界等基本属性。
 */
export const PARTICLE_CONFIG = {
  /** 粒子数量 */
  COUNT: 40000,
  /** 粒子大小 */
  SIZE: 1.0,
  /** 边界半径 */
  BOUNDS_RADIUS: 60,
  /** 速度缩放因子 */
  VELOCITY_SCALE: 0.1,
  /** 最大速度 */
  MAX_SPEED: 0.18,
  /** 最小粒子数 */
  MIN_COUNT: 1000,
  /** 最大粒子数 */
  MAX_COUNT: 200000,
  /** 最小粒子大小 */
  MIN_SIZE: 0.1,
  /** 最大粒子大小 */
  MAX_SIZE: 10.0
} as const

/**
 * 渲染配置
 */
export const RENDERER_CONFIG = {
  /** 像素比上限 */
  MAX_PIXEL_RATIO: 3,
  /** 相机距离 */
  CAMERA_DISTANCE: 80,
  /** 相机视角（度） */
  FIELD_OF_VIEW: 75,
  /** 相机近裁剪面 */
  NEAR_PLANE: 0.1,
  /** 相机远裁剪面 */
  FAR_PLANE: 1000
} as const

/**
 * 性能配置
 */
export const PERFORMANCE_CONFIG = {
  /** 性能更新间隔（毫秒） */
  UPDATE_INTERVAL: 500,
  /** 优秀 FPS 阈值 */
  GOOD_FPS: 50,
  /** 一般 FPS 阈值 */
  MEDIUM_FPS: 30,
  /** 低 FPS 阈值 */
  POOR_FPS: 30
} as const

/**
 * 交互配置
 */
export const INTERACTION_CONFIG = {
  /** 缩放范围最小值 */
  SCALE_MIN: 0.1,
  /** 缩放范围最大值 */
  SCALE_MAX: 10.0,
  /** 三连击时间阈值（毫秒） */
  TRIPLE_CLICK_THRESHOLD: 500,
  /** 三连击所需次数 */
  TRIPLE_CLICK_COUNT: 3,
  /** 平滑插值因子（0-1，越小越平滑） */
  ROTATION_SMOOTHING: 0.05,
  /** 自动旋转速度（弧度/帧） */
  AUTO_ROTATION_SPEED: 0.001,
  /** 旋转范围（弧度） */
  ROTATION_RANGE: Math.PI * 0.5
} as const

/**
 * 噪声配置
 */
export const NOISE_CONFIG = {
  /** 噪声缩放因子 */
  SCALE: 0.008,
  /** 时间缩放因子 */
  TIME_SCALE: 0.0001,
  /** 噪声频率 */
  FREQUENCY: 4.0,
  /** 噪声纹理尺寸 */
  TEXTURE_SIZE: 64
} as const

/**
 * 边界配置
 */
export const BOUNDS_CONFIG = {
  /** 边界重置因子（0-1，越小粒子越接近中心） */
  RESET_FACTOR: 0.1,
  /** 速度重置大小 */
  VELOCITY_RESET_MAGNITUDE: 0.05,
  /** 边界距离平方的最小值 */
  MIN_DISTANCE_SQ: 0.0001
} as const

/**
 * 速度配置
 */
export const VELOCITY_CONFIG = {
  /** 初始速度最小值 */
  MIN_INITIAL: 0.01,
  /** 初始速度最大值 */
  MAX_INITIAL: 0.04,
  /** Z 轴速度范围 */
  Z_RANGE: 0.05
} as const

/**
 * 时间步长配置
 */
export const TIME_STEP_CONFIG = {
  /** 默认时间步长（秒） */
  DEFAULT: 0.001,
  /** 时间转换因子 */
  SCALE: 1000
} as const

/**
 * 混合模式配置
 */
export const HYBRID_CONFIG = {
  /** 吸引子影响比例（0-1） */
  ATTRACTOR_RATIO: 0.3,
  /** 噪声场影响比例（0-1） */
  NOISE_RATIO: 0.7
} as const

/**
 * 吸引子重置配置
 */
export const ATTRACTOR_RESET_CONFIG = {
  /** 重置半径 */
  RADIUS: 5,
  /** Z 轴重置范围 */
  Z_RANGE: 2
} as const

/**
 * 颜色配置
 */
export const COLOR_CONFIG = {
  /** 亮度因子最小值 */
  BRIGHTNESS_MIN: 0.7,
  /** 亮度因子最大值 */
  BRIGHTNESS_MAX: 1.0,
  /** 亮度随机范围 */
  BRIGHTNESS_RANGE: 0.3
} as const

/**
 * 泛光配置
 */
export const BLOOM_CONFIG = {
  /** 默认启用 */
  ENABLED: true,
  /** 默认强度 */
  STRENGTH: 0.8,
  /** 默认半径 */
  RADIUS: 0.3,
  /** 默认阈值 */
  THRESHOLD: 0.9
} as const

/**
 * 发光配置
 */
export const GLOW_CONFIG = {
  /** 默认禁用 */
  ENABLED: false,
  /** 默认强度 */
  INTENSITY: 0.2
} as const

/**
 * 轨迹配置
 */
export const TRAIL_CONFIG = {
  /** 启用轨迹 */
  ENABLED: true,
  /** 轨迹长度（历史位置数量） */
  LENGTH: 8,
  /** 轨迹最大寿命（帧数） */
  MAX_AGE: 45,
  /** 轨迹颜色（RGB，0-1） */
  COLOR: [0.5, 0.8, 1.0],
  /** 轨迹透明度 */
  OPACITY: 0.4,
  /** 轨迹宽度 */
  LINE_WIDTH: 1.2
} as const

/**
 * 呼吸效果配置
 */
export const BREATHING_CONFIG = {
  /** 默认启用 */
  ENABLED: true,
  /** 呼吸振幅（0-1） */
  AMPLITUDE: 0.3,
  /** 呼吸频率（Hz） */
  FREQUENCY: 0.5
} as const

/**
 * 雾效配置
 */
export const FOG_CONFIG = {
  /** 默认启用 */
  ENABLED: true,
  /** 雾的浓度（0-1） */
  DENSITY: 0.01,
  /** 雾的颜色（RGB，0-1） */
  COLOR: [0.0, 0.0, 0.1]
} as const

/**
 * 粒子大小配置
 */
export const PARTICLE_SIZE_CONFIG = {
  /** 默认启用基于速度的大小变化 */
  ENABLE_SPEED_BASED: true,
  /** 速度对大小的影响因子（0-2） */
  SPEED_FACTOR: 1.0,
  /** 视差强度（0-2） */
  PARALLAX_STRENGTH: 1.0
} as const

/**
 * 应用名称
 */
export const APP_NAME = '星辰'

/**
 * 应用版本
 */
export const APP_VERSION = '2.0.0'

/**
 * 应用描述
 */
export const APP_DESCRIPTION = '基于 Three.js 的 3D 粒子动画系统，使用数学混沌算法创造有机流动效果'