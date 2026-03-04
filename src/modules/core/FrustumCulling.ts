/**
 * 视锥体剔除管理器
 * 
 * 计算视锥体裁剪平面，剔除不在视锥体内的粒子。
 * 
 * @module core/FrustumCulling
 */

import * as THREE from 'three'

/**
 * 裁剪平面接口
 * 
 * @interface FrustumPlane
 */
export interface FrustumPlane {
  /** 平面法向量 */
  normal: THREE.Vector3
  /** 平面常数（距离原点的距离） */
  constant: number
}

/**
 * 视锥体剔除管理器配置接口
 * 
 * @interface FrustumCullingConfig
 */
export interface FrustumCullingConfig {
  /** 是否启用视锥体剔除 */
  enabled?: boolean
  /** 裁剪边界扩展（向外扩展，避免边缘裁剪） */
  margin?: number
}

/**
 * 视锥体剔除管理器类
 * 
 * 计算和管理视锥体裁剪平面，用于剔除不在视锥体内的粒子。
 * 
 * 主要功能：
 * - 计算视锥体的 6 个裁剪平面
 * - 检测点是否在视锥体内
 * - 提供视锥体可视化（调试用）
 * - 统计剔除率
 * 
 * @class FrustumCulling
 */
export class FrustumCulling {
  /** 是否启用视锥体剔除 */
  private enabled: boolean
  /** 裁剪边界扩展 */
  private margin: number
  
  /** 视锥体的 6 个裁剪平面 */
  private planes: FrustumPlane[]
  /** 视锥体角点 */
  private corners: THREE.Vector3[]
  /** 标记是否已释放资源 */
  private disposed: boolean = false

  /** 统计信息 */
  private stats = {
    totalChecked: 0,
    visibleCount: 0,
    culledCount: 0
  }

  /**
   * 构造函数，初始化视锥体剔除管理器
   * 
   * @param config - 视锥体剔除配置参数
   * 
   * @example
   * ```typescript
   * const frustumCulling = new FrustumCulling({
   *   enabled: true,
   *   margin: 1.0
   * });
   * ```
   */
  constructor(config: FrustumCullingConfig = {}) {
    this.enabled = config.enabled !== undefined ? config.enabled : true
    this.margin = config.margin || 0

    // 初始化裁剪平面
    this.planes = [
      { normal: new THREE.Vector3(), constant: 0 }, // 左
      { normal: new THREE.Vector3(), constant: 0 }, // 右
      { normal: new THREE.Vector3(), constant: 0 }, // 上
      { normal: new THREE.Vector3(), constant: 0 }, // 下
      { normal: new THREE.Vector3(), constant: 0 }, // 近
      { normal: new THREE.Vector3(), constant: 0 }  // 远
    ]

    // 初始化角点
    this.corners = Array(8).fill(0).map(() => new THREE.Vector3())

    console.log('✓ 视锥体剔除管理器已初始化')
  }

  /**
   * 更新视锥体裁剪平面
   * 
   * @param viewMatrix - 视图矩阵
   * @param projectionMatrix - 投影矩阵
   */
  update(viewMatrix: THREE.Matrix4, projectionMatrix: THREE.Matrix4): void {
    if (!this.enabled || this.disposed) {
      return
    }

    // 计算视图-投影矩阵
    const viewProjectionMatrix = new THREE.Matrix4()
    viewProjectionMatrix.multiplyMatrices(projectionMatrix, viewMatrix)

    // 提取裁剪平面
    this.extractPlanes(viewProjectionMatrix)

    // 计算角点
    this.calculateCorners(projectionMatrix, viewMatrix)
  }

  /**
   * 从视图-投影矩阵提取裁剪平面
   * 
   * @param viewProjectionMatrix - 视图-投影矩阵
   * @private
   */
  private extractPlanes(viewProjectionMatrix: THREE.Matrix4): void {
    const m = viewProjectionMatrix.elements

    // 左平面: m[3] + m[0]
    this.planes[0].normal.set(m[3] + m[0], m[7] + m[4], m[11] + m[8])
    this.planes[0].constant = -(m[15] + m[12])

    // 右平面: m[3] - m[0]
    this.planes[1].normal.set(m[3] - m[0], m[7] - m[4], m[11] - m[8])
    this.planes[1].constant = -(m[15] - m[12])

    // 下平面: m[3] + m[1]
    this.planes[2].normal.set(m[3] + m[1], m[7] + m[5], m[11] + m[9])
    this.planes[2].constant = -(m[15] + m[13])

    // 上平面: m[3] - m[1]
    this.planes[3].normal.set(m[3] - m[1], m[7] - m[5], m[11] - m[9])
    this.planes[3].constant = -(m[15] - m[13])

    // 近平面: m[3] + m[2]
    this.planes[4].normal.set(m[3] + m[2], m[7] + m[6], m[11] + m[10])
    this.planes[4].constant = -(m[15] + m[14])

    // 远平面: m[3] - m[2]
    this.planes[5].normal.set(m[3] - m[2], m[7] - m[6], m[11] - m[10])
    this.planes[5].constant = -(m[15] - m[14])

    // 归一化平面
    for (let i = 0; i < 6; i++) {
      const length = this.planes[i].normal.length()
      if (length > 0) {
        this.planes[i].normal.divideScalar(length)
        this.planes[i].constant /= length
      }
    }
  }

  /**
   * 计算视锥体角点
   * 
   * @param projectionMatrix - 投影矩阵
   * @param viewMatrix - 视图矩阵
   * @private
   */
  private calculateCorners(projectionMatrix: THREE.Matrix4, viewMatrix: THREE.Matrix4): void {
    const inverseProjection = new THREE.Matrix4()
    inverseProjection.copy(projectionMatrix).invert()

    const inverseView = new THREE.Matrix4()
    inverseView.copy(viewMatrix).invert()

    const inverseViewProjection = new THREE.Matrix4()
    inverseViewProjection.multiplyMatrices(inverseView, inverseProjection)

    // 归一化设备坐标（NDC）的角点
    const ndcCorners: [number, number, number][] = [
      [-1, -1, -1], // 近左下
      [1, -1, -1],  // 近右下
      [1, 1, -1],   // 近右上
      [-1, 1, -1],  // 近左上
      [-1, -1, 1],  // 远左下
      [1, -1, 1],   // 远右下
      [1, 1, 1],    // 远右上
      [-1, 1, 1]    // 远左上
    ]

    // 转换到世界坐标
    for (let i = 0; i < 8; i++) {
      this.corners[i].set(ndcCorners[i][0], ndcCorners[i][1], ndcCorners[i][2])
      this.corners[i].applyMatrix4(inverseViewProjection)
    }
  }

  /**
   * 检测点是否在视锥体内
   * 
   * @param point - 要检测的点
   * @returns 是否在视锥体内
   */
  containsPoint(point: THREE.Vector3): boolean {
    if (!this.enabled || this.disposed) {
      return true
    }

    this.stats.totalChecked++

    // 检查点是否在所有裁剪平面的正面
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i]
      const distance = plane.normal.dot(point) + plane.constant - this.margin

      if (distance < 0) {
        this.stats.culledCount++
        return false
      }
    }

    this.stats.visibleCount++
    return true
  }

  /**
   * 检测球体是否与视锥体相交
   * 
   * @param center - 球体中心
   * @param radius - 球体半径
   * @returns 是否与视锥体相交
   */
  intersectsSphere(center: THREE.Vector3, radius: number): boolean {
    if (!this.enabled || this.disposed) {
      return true
    }

    this.stats.totalChecked++

    // 检查球体是否在所有裁剪平面的正面（考虑半径）
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i]
      const distance = plane.normal.dot(center) + plane.constant

      if (distance < -radius) {
        this.stats.culledCount++
        return false
      }
    }

    this.stats.visibleCount++
    return true
  }

  /**
   * 检测轴对齐包围盒（AABB）是否与视锥体相交
   * 
   * @param min - AABB 最小角
   * @param max - AABB 最大角
   * @returns 是否与视锥体相交
   */
  intersectsBox(min: THREE.Vector3, max: THREE.Vector3): boolean {
    if (!this.enabled || this.disposed) {
      return true
    }

    this.stats.totalChecked++

    // 对于每个裁剪平面，找到 AABB 的最远点
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i]
      const normal = plane.normal

      // 找到 AABB 在平面法向量方向上的最远点
      const p = new THREE.Vector3(
        normal.x > 0 ? max.x : min.x,
        normal.y > 0 ? max.y : min.y,
        normal.z > 0 ? max.z : min.z
      )

      // 检查最远点是否在平面正面
      const distance = plane.normal.dot(p) + plane.constant
      if (distance < 0) {
        this.stats.culledCount++
        return false
      }
    }

    this.stats.visibleCount++
    return true
  }

  /**
   * 获取裁剪平面
   * 
   * @returns 裁剪平面数组
   */
  getPlanes(): FrustumPlane[] {
    return [...this.planes]
  }

  /**
   * 获取视锥体角点
   * 
   * @returns 角点数组
   */
  getCorners(): THREE.Vector3[] {
    return [...this.corners]
  }

  /**
   * 获取剔除统计信息
   * 
   * @returns 统计信息对象
   */
  getStats(): {
    totalChecked: number
    visibleCount: number
    culledCount: number
    cullRate: number
  } {
    const cullRate = this.stats.totalChecked > 0
      ? (this.stats.culledCount / this.stats.totalChecked) * 100
      : 0

    return {
      totalChecked: this.stats.totalChecked,
      visibleCount: this.stats.visibleCount,
      culledCount: this.stats.culledCount,
      cullRate
    }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.totalChecked = 0
    this.stats.visibleCount = 0
    this.stats.culledCount = 0
  }

  /**
   * 启用或禁用视锥体剔除
   * 
   * @param enabled - 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * 检查是否启用
   * 
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 设置裁剪边界扩展
   * 
   * @param margin - 边界扩展值
   */
  setMargin(margin: number): void {
    this.margin = margin
  }

  /**
   * 获取裁剪边界扩展
   * 
   * @returns 边界扩展值
   */
  getMargin(): number {
    return this.margin
  }

  /**
   * 释放视锥体剔除管理器资源
   * 
   * 清理所有资源，防止内存泄漏。
   * 重复调用此方法是安全的。
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    console.log('✓ 视锥体剔除管理器资源已释放')
  }
}