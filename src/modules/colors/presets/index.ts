/**
 * 预设颜色主题
 * 
 * 导出所有可用的预设颜色主题
 * 
 * @module colors/presets
 */

import { ColorTheme } from '../ColorTheme'
import { CyberPunkTheme } from './CyberPunk'
import { NatureTheme } from './Nature'
import { CoolToneTheme } from './CoolTone'
import { WarmToneTheme } from './WarmTone'
import { RainbowTheme } from './Rainbow'

/**
 * 所有预设颜色主题列表
 * 
 * 可以通过索引或名称访问特定主题
 */
export const PRESET_THEMES: ColorTheme[] = [
  CyberPunkTheme,
  NatureTheme,
  CoolToneTheme,
  WarmToneTheme,
  RainbowTheme
]

/**
 * 根据名称获取预设主题
 * 
 * @param name - 主题名称
 * @returns 找到的主题，如果未找到则返回 undefined
 * 
 * @example
 * ```typescript
 * const theme = getPresetTheme('赛博朋克');
 * if (theme) {
 *   appManager.setColorTheme(theme);
 * }
 * ```
 */
export function getPresetTheme(name: string): ColorTheme | undefined {
  return PRESET_THEMES.find(theme => theme.name === name)
}

/**
 * 获取所有预设主题名称
 * 
 * @returns 所有预设主题的名称数组
 * 
 * @example
 * ```typescript
 * const names = getPresetThemeNames();
 * // ['赛博朋克', '自然', '冷色调', '暖色调', '彩虹']
 * ```
 */
export function getPresetThemeNames(): string[] {
  return PRESET_THEMES.map(theme => theme.name)
}

/**
 * 检查是否为预设主题
 * 
 * @param theme - 要检查的主题
 * @returns 是否为预设主题
 * 
 * @example
 * ```typescript
 * const isPreset = isPresetTheme(myTheme);
 * ```
 */
export function isPresetTheme(theme: ColorTheme): boolean {
  return PRESET_THEMES.some(preset => preset.name === theme.name)
}