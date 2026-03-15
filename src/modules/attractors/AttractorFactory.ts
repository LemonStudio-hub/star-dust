import { LorenzAttractor } from './LorenzAttractor'
import { ThomasAttractor } from './ThomasAttractor'
import { CliffordAttractor } from './CliffordAttractor'
import { RosslerAttractor } from './RosslerAttractor'
import type { IAttractorCalculator } from './types'
import type { LorenzConfig, ThomasConfig, CliffordConfig, RosslerConfig } from './types'
import { MotionMode } from '../particles/MotionMode'

/**
 * 吸引子工厂
 * 用于创建和管理不同类型的吸引子计算器
 */
export class AttractorFactory {
  /**
   * 创建吸引子计算器
   * 
   * @param mode - 运动模式
   * @param lorenzConfig - Lorenz 配置
   * @param thomasConfig - Thomas 配置
   * @param cliffordConfig - Clifford 配置
   * @param rosslerConfig - Rossler 配置
   * @returns 吸引子计算器或 null
   */
  static create(
    mode: MotionMode,
    lorenzConfig: LorenzConfig,
    thomasConfig: ThomasConfig,
    cliffordConfig: CliffordConfig,
    rosslerConfig: RosslerConfig
  ): IAttractorCalculator | null {
    switch (mode) {
      case MotionMode.LORENZ:
        return new LorenzAttractor(lorenzConfig)
      case MotionMode.THOMAS:
        return new ThomasAttractor(thomasConfig)
      case MotionMode.CLIFFORD:
        return new CliffordAttractor(cliffordConfig)
      case MotionMode.ROSSLER:
        return new RosslerAttractor(rosslerConfig)
      default:
        return null
    }
  }

  /**
   * 更新吸引子配置
   * 
   * @param calculator - 吸引子计算器
   * @param config - 新配置
   */
  static updateConfig(
    calculator: IAttractorCalculator,
    config: LorenzConfig | ThomasConfig | CliffordConfig | RosslerConfig
  ): void {
    if ('updateConfig' in calculator) {
      (calculator as any).updateConfig(config)
    }
  }
}