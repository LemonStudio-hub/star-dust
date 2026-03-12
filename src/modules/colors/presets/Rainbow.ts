/**
 * 彩虹主题
 * 
 * 彩虹般的七彩渐变
 * 
 * @module colors/presets/Rainbow
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 彩虹主题
 * 
 * 特点：红、橙、黄、绿、青、蓝、紫的七彩渐变
 * 动画：循环动画，产生彩虹流动效果
 */
export const RainbowTheme: ColorTheme = {
  name: '彩虹',
  description: '彩虹般的七彩渐变',
  colors: [
    { color: [1.0, 0.0, 0.0], position: 0.0 },   // 红
    { color: [1.0, 0.5, 0.0], position: 0.166 }, // 橙
    { color: [1.0, 1.0, 0.0], position: 0.333 }, // 黄
    { color: [0.0, 1.0, 0.0], position: 0.5 },   // 绿
    { color: [0.0, 1.0, 1.0], position: 0.666 }, // 青
    { color: [0.0, 0.0, 1.0], position: 0.833 }, // 蓝
    { color: [0.5, 0.0, 1.0], position: 1.0 },   // 紫
  ],
  gradientType: 'linear',
  animationType: 'cycle',
  animationSpeed: 0.6
}