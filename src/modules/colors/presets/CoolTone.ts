/**
 * 冷色调主题
 * 
 * 冰雪世界的清凉色彩
 * 
 * @module colors/presets/CoolTone
 */

import { ColorTheme } from '../ColorTheme'

/**
 * 冷色调主题
 * 
 * 特点：蓝色、青色、紫色的清凉色彩
 * 动画：脉冲动画，产生呼吸效果
 */
export const CoolToneTheme: ColorTheme = {
  name: '冷色调',
  description: '冰雪世界的清凉色彩',
  colors: [
    { color: [0.1, 0.3, 0.9], position: 0.0 },  // 深蓝
    { color: [0.0, 0.8, 0.9], position: 0.5 },  // 青色
    { color: [0.5, 0.2, 0.9], position: 1.0 },  // 紫色
  ],
  gradientType: 'radial',
  animationType: 'pulse',
  animationSpeed: 0.3
}