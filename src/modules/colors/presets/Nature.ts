/**
 * 自然主题
 * 
 * 大自然中的绿色和棕色
 * 
 * @module colors/presets/Nature
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 自然主题
 * 
 * 特点：绿色、金色、棕色的大自然色彩
 * 动画：无动画，静态分布
 */
export const NatureTheme: ColorTheme = {
  name: '自然',
  description: '大自然中的绿色和棕色',
  colors: [
    { color: [0.2, 0.8, 0.3], position: 0.0 },  // 绿色
    { color: [0.9, 0.7, 0.2], position: 0.5 },  // 金色
    { color: [0.4, 0.2, 0.1], position: 1.0 },  // 棕色
  ],
  gradientType: 'random',
  animationType: 'none'
}