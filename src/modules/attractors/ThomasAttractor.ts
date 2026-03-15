import type { IAttractorCalculator, ThomasConfig, AttractorVelocity } from './types'

/**
 * Thomas 吸引子计算器
 * 
 * Thomas 吸引子产生三个对称的螺旋臂，视觉效果优雅。
 * 
 * 方程：
 * dx/dt = sin(y) - bx
 * dy/dt = sin(z) - by
 * dz/dt = sin(x) - bz
 */
export class ThomasAttractor implements IAttractorCalculator {
  private config: ThomasConfig

  constructor(config: ThomasConfig) {
    this.config = config
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ThomasConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 计算 Thomas 吸引子速度
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   */
  calculate(x: number, y: number, z: number, dt: number): AttractorVelocity {
    const { b } = this.config
    
    return {
      dx: (Math.sin(y) - b * x) * dt,
      dy: (Math.sin(z) - b * y) * dt,
      dz: (Math.sin(x) - b * z) * dt
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ThomasConfig {
    return { ...this.config }
  }
}