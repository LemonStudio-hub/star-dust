import { reactive } from 'vue'
import { MotionMode } from '../modules/particles/MotionMode'
import type { ColorTheme } from '../modules/colors/ColorTheme'

/**
 * 默认配置
 */
export const defaultConfig = {
  particleCount: 40000,
  particleSize: 1.0,
  boundsRadius: 60,
  velocityScale: 0.1,
  maxSpeed: 0.18,
  enableSpeedBasedSize: true,
  speedBasedSizeFactor: 1.0,
  parallaxStrength: 1.0,
  enableFog: true,
  fogDensity: 0.01
}

/**
 * 配置存储接口
 */
export interface StoredConfig {
  particleCount?: number
  particleSize?: number
  boundsRadius?: number
  velocityScale?: number
  maxSpeed?: number
  enableSpeedBasedSize?: boolean
  speedBasedSizeFactor?: number
  parallaxStrength?: number
  enableFog?: boolean
  fogDensity?: number
  bloom?: {
    enabled?: boolean
    strength?: number
    radius?: number
    threshold?: number
  }
  glow?: {
    enabled?: boolean
    intensity?: number
  }
  motion?: {
    mode?: string
    lorenz?: { sigma?: number; rho?: number; beta?: number }
    thomas?: { b?: number }
    clifford?: { a?: number; b?: number; c?: number; d?: number }
    rossler?: { a?: number; b?: number; c?: number }
    timeScale?: number
    particleScale?: number
  }
  themeName?: string
  savedAt?: string
}

/**
 * localStorage 键名
 */
const STORAGE_KEY = 'xingchen-particle-config'

/**
 * 配置存储管理 Hook
 */
export function useConfigStorage() {
  /**
   * 保存配置到 localStorage
   */
  const saveConfigToStorage = (
    particleConfig: any,
    bloomConfig: any,
    glowConfig: any,
    motionConfig: any,
    currentTheme: ColorTheme
  ): void => {
    try {
      const configToSave: StoredConfig = {
        ...particleConfig,
        bloom: { ...bloomConfig },
        glow: { ...glowConfig },
        motion: { ...motionConfig },
        themeName: currentTheme.name,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave))
      console.log('[useConfigStorage] 配置已保存到 localStorage')
    } catch (error) {
      console.error('[useConfigStorage] 保存配置到 localStorage 失败:', error)
    }
  }

  /**
   * 从 localStorage 加载配置
   */
  const loadConfigFromStorage = (
    particleConfig: any,
    bloomConfig: any,
    glowConfig: any,
    motionConfig: any,
    presetThemes: ColorTheme[]
  ): { success: boolean } => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY)
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        console.log('[useConfigStorage] 从 localStorage 加载配置:', config)

        // 恢复粒子配置
        Object.keys(particleConfig).forEach(key => {
          if (config[key] !== undefined) {
            (particleConfig as any)[key] = config[key]
          }
        })

        // 恢复泛光配置
        if (config.bloom) {
          Object.keys(bloomConfig).forEach(key => {
            if (config.bloom[key] !== undefined) {
              (bloomConfig as any)[key] = config.bloom[key]
            }
          })
        }

        // 恢复发光配置
        if (config.glow) {
          Object.keys(glowConfig).forEach(key => {
            if (config.glow[key] !== undefined) {
              (glowConfig as any)[key] = config.glow[key]
            }
          })
        }

        // 恢复运动模式配置
        if (config.motion) {
          Object.keys(motionConfig).forEach(key => {
            if (config.motion[key] !== undefined) {
              if (key === 'mode') {
                // 将字符串转换为 MotionMode 枚举
                const modeValue = config.motion[key]
                if (Object.values(MotionMode).includes(modeValue)) {
                  motionConfig[key] = modeValue as MotionMode
                }
              } else {
                (motionConfig as any)[key] = config.motion[key]
              }
            }
          })
        }

        // 恢复主题配置
        if (config.themeName) {
          const theme = presetThemes.find(t => t.name === config.themeName)
          if (theme) {
            return { success: true, theme }
          }
        }

        console.log('[useConfigStorage] 配置加载成功')
      }
      return { success: false }
    } catch (error) {
      console.error('[useConfigStorage] 从 localStorage 加载配置失败:', error)
      return { success: false }
    }
  }

  /**
   * 清除 localStorage 中的配置
   */
  const clearConfigStorage = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('[useConfigStorage] 配置已从 localStorage 清除')
    } catch (error) {
      console.error('[useConfigStorage] 清除 localStorage 配置失败:', error)
    }
  }

  return {
    saveConfigToStorage,
    loadConfigFromStorage,
    clearConfigStorage
  }
}