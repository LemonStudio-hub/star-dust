/**
 * 吸引子计算结果接口
 */
export interface AttractorVelocity {
  dx: number
  dy: number
  dz: number
}

/**
 * Lorenz 吸引子参数配置
 */
export interface LorenzConfig {
  sigma: number
  rho: number
  beta: number
}

/**
 * Thomas 吸引子参数配置
 */
export interface ThomasConfig {
  b: number
}

/**
 * Clifford 吸引子参数配置
 */
export interface CliffordConfig {
  a: number
  b: number
  c: number
  d: number
}

/**
 * Rossler 吸引子参数配置
 */
export interface RosslerConfig {
  a: number
  b: number
  c: number
}

/**
 * 吸引子计算器接口
 */
export interface IAttractorCalculator {
  calculate(x: number, y: number, z: number, dt: number): AttractorVelocity
}