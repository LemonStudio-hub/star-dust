/**
 * Simplex Noise 噪声算法实现
 * 
 * Simplex Noise 是一种改进的梯度噪声算法，比 Perlin Noise 计算效率更高，
 * 且在多个维度上能产生更自然的噪声效果。
 * 
 * @module noise/SimplexNoise
 */

/**
 * Simplex Noise 3D 噪声生成器
 * 
 * 实现了经典的三维 Simplex 噪声算法，用于生成连续、平滑的随机噪声值。
 * 该算法使用 12 个梯度向量和预计算的排列表来生成噪声。
 * 
 * @class SimplexNoise
 */
export class SimplexNoise {
  /** 12 个梯度向量，用于噪声计算 */
  private grad3: number[][]
  /** 0-255 的随机排列表 */
  private p: number[]
  /** 扩展的排列表（512个元素），用于快速索引 */
  private perm: number[]

  /**
   * 构造函数，初始化 Simplex Noise
   * 
   * 生成随机的梯度向量和排列表，这些值用于后续的噪声计算。
   */
  constructor() {
    // 12 个单位立方体的梯度向量
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ]
    
    // 生成 0-255 的随机排列表
    this.p = []
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(Math.random() * 256)
    }
    
    // 扩展排列表到 512 个元素，方便按位与运算
    this.perm = []
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255]
    }
  }

  /**
   * 计算向量点积
   * 
   * @param g - 梯度向量
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @returns 点积结果
   * @private
   */
  private dot(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z
  }

  /**
   * 计算三维 Simplex 噪声值
   * 
   * 该方法通过将三维空间分割为多个 Simplex（单纯形），
   * 然后对每个角点计算梯度贡献，最后插值得到最终的噪声值。
   * 
   * 算法步骤：
   * 1. 将输入坐标扭曲到 Simplex 网格空间
   * 2. 确定当前 Simplex 的角点
   * 3. 对每个角点计算噪声贡献
   * 4. 使用平滑函数混合各角点的贡献
   * 
   * @param xin - 输入 X 坐标
   * @param yin - 输入 Y 坐标
   * @param zin - 输入 Z 坐标
   * @returns 噪声值，范围约为 -32 到 32
   */
  noise(xin: number, yin: number, zin: number): number {
    // Simplex 网格扭曲因子
    const F3 = 1.0 / 3.0
    // Simplex 网格反扭曲因子
    const G3 = 1.0 / 6.0

    // 步骤 1：扭曲坐标到 Simplex 网格空间
    const s = (xin + yin + zin) * F3
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const k = Math.floor(zin + s)
    
    // 步骤 2：反扭曲，得到未扭曲的角点坐标
    const t = (i + j + k) * G3
    const X0 = i - t
    const Y0 = j - t
    const Z0 = k - t
    const x0 = xin - X0
    const y0 = yin - Y0
    const z0 = zin - Z0

    // 步骤 3：确定 Simplex 的另外两个角点
    let i1: number, j1: number, k1: number
    let i2: number, j2: number, k2: number

    // 根据坐标关系确定角点顺序
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0
        i2 = 1; j2 = 1; k2 = 0
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0
        i2 = 1; j2 = 0; k2 = 1
      } else {
        i1 = 0; j1 = 0; k1 = 1
        i2 = 1; j2 = 0; k2 = 1
      }
    } else {
      if (y0 < z0) {
        i1 = 0; j1 = 0; k1 = 1
        i2 = 0; j2 = 1; k2 = 1
      } else if (x0 < z0) {
        i1 = 0; j1 = 1; k1 = 0
        i2 = 0; j2 = 1; k2 = 1
      } else {
        i1 = 0; j1 = 1; k1 = 0
        i2 = 1; j2 = 1; k2 = 0
      }
    }

    // 步骤 4：计算各角点到原点的距离
    const x1 = x0 - i1 + G3
    const y1 = y0 - j1 + G3
    const z1 = z0 - k1 + G3
    const x2 = x0 - i2 + 2.0 * G3
    const y2 = y0 - j2 + 2.0 * G3
    const z2 = z0 - k2 + 2.0 * G3
    const x3 = x0 - 1.0 + 3.0 * G3
    const y3 = y0 - 1.0 + 3.0 * G3
    const z3 = z0 - 1.0 + 3.0 * G3

    // 步骤 5：计算各角点的噪声贡献
    const ii = i & 255
    const jj = j & 255
    const kk = k & 255

    let n0: number, n1: number, n2: number, n3: number

    // 角点 0 的贡献
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
    if (t0 < 0) {
      n0 = 0.0
    } else {
      t0 *= t0
      n0 = t0 * t0 * this.dot(this.grad3[this.perm[ii + this.perm[jj + this.perm[kk]]] % 12], x0, y0, z0)
    }

    // 角点 1 的贡献
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
    if (t1 < 0) {
      n1 = 0.0
    } else {
      t1 *= t1
      n1 = t1 * t1 * this.dot(this.grad3[this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12], x1, y1, z1)
    }

    // 角点 2 的贡献
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
    if (t2 < 0) {
      n2 = 0.0
    } else {
      t2 *= t2
      n2 = t2 * t2 * this.dot(this.grad3[this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12], x2, y2, z2)
    }

    // 角点 3 的贡献
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
    if (t3 < 0) {
      n3 = 0.0
    } else {
      t3 *= t3
      n3 = t3 * t3 * this.dot(this.grad3[this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12], x3, y3, z3)
    }

    // 返回归一化的噪声值
    return 32.0 * (n0 + n1 + n2 + n3)
  }
}