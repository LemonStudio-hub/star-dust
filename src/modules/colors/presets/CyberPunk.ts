/**
 * 赛博朋克主题
 * 
 * 霓虹灯效果的未来主义色彩
 * 
 * @module colors/presets/CyberPunk
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 赛博朋克主题
 * 
 * 特点：粉红、青色、紫色的高对比度霓虹色
 * 动画：循环动画，产生流动的霓虹灯效果
 */
export const CyberPunkTheme: ColorTheme = {
  name: '赛博朋克',
  description: '霓虹灯效果的未来主义色彩',
  colors: [
    { color: [1.0, 0.0, 0.5], position: 0.0 },  // 粉红
    { color: [0.0, 1.0, 1.0], position: 0.5 },  // 青色
    { color: [0.5, 0.0, 1.0], position: 1.0 },  // 紫色
  ],
  gradientType: 'cycle',
  animationType: 'cycle',
  animationSpeed: 0.5
}