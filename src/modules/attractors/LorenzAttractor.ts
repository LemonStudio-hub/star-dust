import type { IAttractorCalculator, LorenzConfig, AttractorVelocity } from './types'

/**
 * Lorenz 吸引子计算器
 * 
 * Lorenz 吸引子是最著名的混沌系统之一，产生经典的"蝴蝶形状"。
 * 
 * 方程：
 * dx/dt = σ(y - x)
 * dy/dt = x(ρ - z) - y
 * dz/dt = xy - βz
 */
export class LorenzAttractor implements IAttractorCalculator {
  private config: LorenzConfig

  constructor(config: LorenzConfig) {
    this.config = config
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LorenzConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 计算 Lorenz 吸引子速度
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   */
  calculate(x: number, y: number, z: number, dt: number): AttractorVelocity {
    const { sigma, rho, beta } = this.config
    
    return {
      dx: sigma * (y - x) * dt,
      dy: (x * (rho - z) - y) * dt,
      dz: (x * y - beta * z) * dt
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LorenzConfig {
    return { ...this.config }
  }
}