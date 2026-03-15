import type { IAttractorCalculator, RosslerConfig, AttractorVelocity } from './types'

/**
 * Rossler 吸引子计算器
 * 
 * Rossler 吸引子产生螺旋状结构，具有独特的混沌特性。
 * 
 * 方程：
 * dx/dt = -y - z
 * dy/dt = x + a*y
 * dz/dt = b + z*(x - c)
 */
export class RosslerAttractor implements IAttractorCalculator {
  private config: RosslerConfig

  constructor(config: RosslerConfig) {
    this.config = config
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RosslerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 计算 Rossler 吸引子速度
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   */
  calculate(x: number, y: number, z: number, dt: number): AttractorVelocity {
    const { a, b, c } = this.config
    
    return {
      dx: (-y - z) * dt,
      dy: (x + a * y) * dt,
      dz: (b + z * (x - c)) * dt
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): RosslerConfig {
    return { ...this.config }
  }
}