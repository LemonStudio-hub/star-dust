/**
 * 速度流主题
 * 
 * 根据粒子速度动态改变颜色
 * 慢速粒子显示冷色调，快速粒子显示暖色调
 * 
 * @module colors/presets/SpeedFlow
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 速度流主题
 * 
 * 特点：从蓝色（慢速）到红色（快速）的渐变
 * 映射类型：speed
 * 动画：无（颜色由粒子速度决定）
 */
export const SpeedFlowTheme: ColorTheme = {
  name: '速度流',
  description: '根据粒子速度动态改变颜色，慢速冷色调，快速暖色调',
  colors: [
    { color: [0.1, 0.3, 0.9], position: 0.0 },  // 深蓝（慢速）
    { color: [0.0, 0.8, 0.9], position: 0.3 },  // 青色（中速）
    { color: [0.5, 0.2, 0.9], position: 0.6 },  // 紫色（较快）
    { color: [1.0, 0.1, 0.1], position: 1.0 }   // 红色（快速）
  ],
  gradientType: 'speed',
  animationType: 'none'
}