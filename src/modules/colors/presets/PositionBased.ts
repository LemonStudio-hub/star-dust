/**
 * 基于位置的动态颜色主题
 *
 * 粒子颜色随空间位置动态变化，产生炫酷的 3D 彩虹效果。
 * 结合空间渐变和时间动画，让整个粒子系统充满生命力。
 *
 * @module colors/presets/PositionBased
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 基于位置的动态颜色主题
 *
 * 颜色根据粒子在 3D 空间中的位置进行计算：
 * - X 轴影响红色分量
 * - Y 轴影响绿色分量
 * - Z 轴影响蓝色分量
 *
 * 配合时间循环动画，颜色会随时间缓慢流动。
 */
export const PositionBasedTheme: ColorTheme = {
  name: '位置动态',
  description: '粒子颜色随空间位置和时间变化，产生流动的 3D 彩虹效果',
  colors: [
    { color: [1.0, 0.0, 0.5], position: 0.0 }, // 洋红
    { color: [0.0, 1.0, 1.0], position: 0.25 }, // 青色
    { color: [1.0, 1.0, 0.0], position: 0.5 },  // 黄色
    { color: [0.0, 1.0, 0.5], position: 0.75 }, // 绿色
    { color: [1.0, 0.5, 0.0], position: 1.0 },  // 橙色
  ],
  gradientType: 'position',
  animationType: 'cycle',
  animationSpeed: 0.5
}