/**
 * 物理模拟常量
 *
 * 定义粒子系统中的物理常量和配置参数。
 *
 * @module constants/PhysicsConstants
 */

/**
 * 旋转相关常量
 */
export const ROTATION = {
  /** 平滑插值因子（0-1，越小越平滑） */
  SMOOTHING: 0.05,
  /** 自动旋转速度（弧度/帧） */
  AUTO_SPEED: 0.001,
  /** 旋转范围（弧度） */
  RANGE: Math.PI * 0.5
} as const

/**
 * 噪声相关常量
 */
export const NOISE = {
  /** 噪声缩放因子 */
  SCALE: 0.008,
  /** 时间缩放因子 */
  TIME_SCALE: 0.0001,
  /** 噪声频率 */
  FREQUENCY: 4.0
} as const

/**
 * 粒子边界相关常量
 */
export const BOUNDS = {
  /** 边界重置因子（0-1，越小粒子越接近中心） */
  RESET_FACTOR: 0.1,
  /** 速度重置大小 */
  VELOCITY_RESET_MAGNITUDE: 0.05,
  /** 边界距离平方的最小值 */
  MIN_DISTANCE_SQ: 0.0001
} as const

/**
 * 速度相关常量
 */
export const VELOCITY = {
  /** 初始速度最小值 */
  MIN_INITIAL: 0.01,
  /** 初始速度最大值 */
  MAX_INITIAL: 0.04,
  /** Z 轴速度范围 */
  Z_RANGE: 0.05
} as const

/**
 * 性能监控相关常量
 */
export const PERFORMANCE = {
  /** 性能更新间隔（毫秒） */
  UPDATE_INTERVAL: 500,
  /** 优秀 FPS 阈值 */
  GOOD_FPS: 50,
  /** 一般 FPS 阈值 */
  MEDIUM_FPS: 30
} as const

/**
 * 交互相关常量
 */
export const INTERACTION = {
  /** 缩放范围最小值 */
  SCALE_MIN: 0.1,
  /** 缩放范围最大值 */
  SCALE_MAX: 10.0,
  /** 三连击时间阈值（毫秒） */
  TRIPLE_CLICK_THRESHOLD: 500,
  /** 三连击所需次数 */
  TRIPLE_CLICK_COUNT: 3
} as const

/**
 * 渲染相关常量
 */
export const RENDERER = {
  /** 像素比上限 */
  MAX_PIXEL_RATIO: 3,
  /** 相机距离 */
  CAMERA_DISTANCE: 80,
  /** 透视相机视角（度） */
  FIELD_OF_VIEW: 75,
  /** 相机近裁剪面 */
  NEAR_PLANE: 0.1,
  /** 相机远裁剪面 */
  FAR_PLANE: 1000
} as const

/**
 * 颜色相关常量
 */
export const COLOR = {
  /** 亮度因子最小值 */
  BRIGHTNESS_MIN: 0.7,
  /** 亮度因子最大值 */
  BRIGHTNESS_MAX: 1.0,
  /** 亮度随机范围 */
  BRIGHTNESS_RANGE: 0.3
} as const

/**
 * 粒子相关常量
 */
export const PARTICLE = {
  /** 粒子最小数量 */
  MIN_COUNT: 1000,
  /** 粒子最大数量 */
  MAX_COUNT: 200000,
  /** 粒子最小大小 */
  MIN_SIZE: 0.1,
  /** 粒子最大大小 */
  MAX_SIZE: 10.0,
  /** 粒子材质透明度 */
  OPACITY: 0.9
} as const
/**
 * 时间步长相关常量
 */
export const TIME_STEP = {
  /** 默认时间步长（秒） */
  DEFAULT: 0.001,
  /** 时间转换因子 */
  SCALE: 1000
} as const

/**
 * 混合模式相关常量
 */
export const HYBRID = {
  /** 吸引子影响比例（0-1） */
  ATTRACTOR_RATIO: 0.3,
  /** 噪声场影响比例（0-1） */
  NOISE_RATIO: 0.7
} as const

/**
 * 速度初始化相关常量
 */
export const VELOCITY_INIT = {
  /** 最小初始速度 */
  MIN: 0.01,
  /** 最大初始速度 */
  MAX: 0.04,
  /** Z 轴速度范围 */
  Z_RANGE: 0.05
} as const

/**
 * 吸引子重置相关常量
 */
export const ATTRACTOR_RESET = {
  /** 重置半径 */
  RADIUS: 5,
  /** Z 轴重置范围 */
  Z_RANGE: 2
} as const

/**
 * 颜色亮度相关常量
 */
export const COLOR_BRIGHTNESS = {
  /** 最小亮度因子 */
  MIN: 0.7,
  /** 最大亮度因子 */
  MAX: 1.0,
  /** 亮度随机范围 */
  RANGE: 0.3
} as const
