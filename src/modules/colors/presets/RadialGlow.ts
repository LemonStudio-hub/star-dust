/**
 * 径向光晕主题
 * 
 * 根据粒子到中心的距离动态改变颜色
 * 中心区域显示亮色，边缘区域显示暗色
 * 
 * @module colors/presets/RadialGlow
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 径向光晕主题
 * 
 * 特点：从中心（亮色）到边缘（暗色）的径向渐变
 * 映射类型：position
 * 动画：无（颜色由粒子位置决定）
 */
export const RadialGlowTheme: ColorTheme = {
  name: '径向光晕',
  description: '根据粒子到中心的距离动态改变颜色，中心亮色，边缘暗色',
  colors: [
    { color: [1.0, 1.0, 0.9], position: 0.0 },  // 白色（中心）
    { color: [1.0, 0.8, 0.4], position: 0.25 }, // 金色（内圈）
    { color: [1.0, 0.4, 0.2], position: 0.5 },  // 橙色（中圈）
    { color: [0.8, 0.2, 0.2], position: 0.75 }, // 红色（外圈）
    { color: [0.2, 0.1, 0.3], position: 1.0 }   // 深紫（边缘）
  ],
  gradientType: 'position',
  animationType: 'none'
}