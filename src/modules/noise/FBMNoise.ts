/**
 * 分形布朗运动（Fractal Brownian Motion）噪声算法
 * 
 * FBM 通过叠加多个不同频率和振幅的噪声层来创建更复杂、更自然的纹理。
 * 每个连续的层（倍频程）频率更高但振幅更低，产生细节和纹理效果。
 * 
 * @module noise/FBMNoise
 */

import { SimplexNoise } from './SimplexNoise'

/**
 * FBM 噪声生成器
 * 
 * 使用多层 Simplex 噪声叠加来创建复杂的分形纹理。
 * 这种技术常用于生成自然现象，如地形、云层、火焰等。
 * 
 * 算法原理：
 * - 将多个噪声层叠加在一起
 * - 每层具有不同的频率和振幅
 * - 频率按 lacunarity 因子增长
 * - 振幅按 persistence 因子衰减
 * 
 * @class FBMNoise
 */
export class FBMNoise {
  /** 底层的 Simplex 噪声生成器 */
  private simplex: SimplexNoise
  /** 倍频程数量（叠加的噪声层数） */
  private octaves: number
  /** 持续度（振幅衰减因子），值越小振幅衰减越快 */
  private persistence: number
  /** 间隙度（频率增长因子），值越大频率增长越快 */
  private lacunarity: number

  /**
   * 构造函数，初始化 FBM 噪声生成器
   * 
   * @param octaves - 倍频程数量，默认 6。值越大纹理越详细，但计算成本越高
   * @param persistence - 持续度，默认 0.65。范围 0-1，控制高频细节的强度
   * @param lacunarity - 间隙度，默认 2.5。通常在 1.5-3.0 之间
   */
  constructor(octaves: number = 6, persistence: number = 0.65, lacunarity: number = 2.5) {
    this.simplex = new SimplexNoise()
    this.octaves = octaves
    this.persistence = persistence
    this.lacunarity = lacunarity
  }

  /**
   * 计算三维 FBM 噪声值
   * 
   * 该方法通过叠加多个倍频程的噪声来创建复杂的纹理效果。
   * 每个倍频程具有更高的频率和更低的振幅，逐渐增加细节。
   * 
   * 计算过程：
   * 1. 从低频噪声开始（基础层）
   * 2. 逐层叠加更高频率的噪声
   * 3. 每层的振幅按 persistence 衰减
   * 4. 每层的频率按 lacunarity 增长
   * 5. 归一化结果以保持在合理范围内
   * 
   * @param x - 输入 X 坐标
   * @param y - 输入 Y 坐标
   * @param z - 输入 Z 坐标
   * @returns FBM 噪声值，范围约为 -1 到 1
   * 
   * @example
   * ```typescript
   * const fbm = new FBMNoise(6, 0.65, 2.5);
   * const value = fbm.noise(0.5, 0.5, 0.5);
   * ```
   */
  noise(x: number, y: number, z: number): number {
    let total = 0        // 累计噪声值
    let frequency = 1    // 当前层的频率
    let amplitude = 1    // 当前层的振幅
    let maxValue = 0     // 最大可能值，用于归一化

    // 叠加所有倍频程
    for (let i = 0; i < this.octaves; i++) {
      // 计算当前层的噪声贡献
      total += this.simplex.noise(x * frequency, y * frequency, z * frequency) * amplitude
      
      // 累计最大可能值
      maxValue += amplitude
      
      // 更新频率和振幅
      amplitude *= this.persistence  // 振幅衰减
      frequency *= this.lacunarity   // 频率增长
    }

    // 归一化结果
    return total / maxValue
  }
}