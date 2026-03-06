/**
 * 暖色调主题
 * 
 * 火焰般的温暖色彩
 * 
 * @module colors/presets/WarmTone
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 暖色调主题
 * 
 * 特点：红色、橙色、黄色的温暖色彩
 * 动画：波浪动画，产生流动效果
 */
export const WarmToneTheme: ColorTheme = {
  name: '暖色调',
  description: '火焰般的温暖色彩',
  colors: [
    { color: [1.0, 0.1, 0.1], position: 0.0 },  // 红色
    { color: [1.0, 0.5, 0.1], position: 0.5 },  // 橙色
    { color: [1.0, 0.9, 0.2], position: 1.0 },  // 黄色
  ],
  gradientType: 'linear',
  animationType: 'wave',
  animationSpeed: 0.4
}