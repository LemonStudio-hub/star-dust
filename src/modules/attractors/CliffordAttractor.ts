import type { IAttractorCalculator, CliffordConfig, AttractorVelocity } from './types'

/**
 * Clifford 吸引子计算器
 * 
 * Clifford 吸引子在 2D 平面上产生复杂的分形图案，扩展到 3D 后产生独特的空间结构。
 * 
 * 方程（2D原版）：
 * dx/dt = sin(a*y) + c*cos(a*x)
 * dy/dt = sin(b*x) + d*cos(b*y)
 * 
 * 3D扩展（添加 Z 轴）：
 * dz/dt = sin(x) + cos(y) + z*0.1
 */
export class CliffordAttractor implements IAttractorCalculator {
  private config: CliffordConfig

  constructor(config: CliffordConfig) {
    this.config = config
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CliffordConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 计算 Clifford 吸引子速度
   * 
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @param dt - 时间步长
   * @returns {dx, dy, dz} 速度增量
   */
  calculate(x: number, y: number, z: number, dt: number): AttractorVelocity {
    const { a, b, c, d } = this.config
    
    return {
      dx: (Math.sin(a * y) + c * Math.cos(a * x)) * dt,
      dy: (Math.sin(b * x) + d * Math.cos(b * y)) * dt,
      dz: (Math.sin(x) + Math.cos(y) + z * 0.1) * dt * 0.5  // Z 轴较慢以保持 2D 图案特征
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): CliffordConfig {
    return { ...this.config }
  }
}