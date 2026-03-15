import { reactive, ref } from 'vue'
import { MotionMode } from '../modules/particles/MotionMode'
import { PRESET_THEMES } from '../modules/colors/presets'
import type { ColorTheme } from '../modules/colors/ColorTheme'

const STORAGE_KEY = 'xingchen-particle-config'

const defaultConfig = {
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
 * 应用配置管理 Composable
 *
 * 提供统一的应用配置管理功能，包括：
 * - 粒子配置（数量、大小、边界等）
 * - 泛光效果配置
 * - 发光效果配置
 * - 运动模式配置
 * - 颜色主题管理
 * - localStorage 持久化
 *
 * @returns 配置管理对象
 *
 * @example
 * ```typescript
 * const {
 *   particleConfig,
 *   bloomConfig,
 *   glowConfig,
 *   motionConfig,
 *   currentTheme,
 *   presetThemes,
 *   saveConfigToStorage,
 *   loadConfigFromStorage,
 *   clearConfigStorage,
 *   resetConfig,
 *   updateTheme
 * } = useAppConfig()
 *
 * // 更新粒子数量
 * particleConfig.particleCount = 50000
 * saveConfigToStorage()
 *
 * // 切换主题
 * updateTheme(presetThemes[1])
 * ```
 */
export function useAppConfig() {
  const particleConfig = reactive({ ...defaultConfig })

  const bloomConfig = reactive({
    enabled: true,
    strength: 0.8,
    radius: 0.3,
    threshold: 0.9
  })

  const glowConfig = reactive({
    enabled: false,
    intensity: 0.2
  })

  const motionConfig = reactive({
    mode: MotionMode.NOISE_FIELD,
    lorenz: { sigma: 10.0, rho: 28.0, beta: 8.0 / 3.0 },
    thomas: { b: 0.208186 },
    clifford: { a: 1.7, b: 1.7, c: 0.06, d: 1.2 },
    rossler: { a: 0.2, b: 0.2, c: 5.7 },
    timeScale: 0.001,
    particleScale: 0.01
  })

  const currentTheme = ref<ColorTheme>(PRESET_THEMES[0])
  const presetThemes = PRESET_THEMES

  /**
   * 保存配置到 localStorage
   */
  const saveConfigToStorage = (): void => {
    try {
      const configToSave = {
        ...particleConfig,
        bloom: { ...bloomConfig },
        glow: { ...glowConfig },
        motion: { ...motionConfig },
        themeName: currentTheme.value.name,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave))
      console.log('[useAppConfig] 配置已保存到 localStorage')
    } catch (error) {
      console.error('[useAppConfig] 保存配置到 localStorage 失败:', error)
    }
  }

  /**
   * 从 localStorage 加载配置
   */
  const loadConfigFromStorage = (): void => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY)
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        console.log('[useAppConfig] 从 localStorage 加载配置:', config)

        // 恢复粒子配置
        Object.keys(particleConfig).forEach(key => {
          if (config[key] !== undefined) {
            (particleConfig as Record<string, unknown>)[key] = config[key]
          }
        })

        // 恢复泛光配置
        if (config.bloom) {
          Object.keys(bloomConfig).forEach(key => {
            if (config.bloom[key] !== undefined) {
              (bloomConfig as Record<string, unknown>)[key] = config.bloom[key]
            }
          })
        }

        // 恢复发光配置
        if (config.glow) {
          Object.keys(glowConfig).forEach(key => {
            if (config.glow[key] !== undefined) {
              (glowConfig as Record<string, unknown>)[key] = config.glow[key]
            }
          })
        }

        // 恢复运动模式配置
        if (config.motion) {
          Object.keys(motionConfig).forEach(key => {
            if (config.motion[key] !== undefined) {
              if (key === 'mode') {
                const modeValue = config.motion[key]
                if (Object.values(MotionMode).includes(modeValue)) {
                  motionConfig[key] = modeValue as MotionMode
                }
              } else {
                (motionConfig as Record<string, unknown>)[key] = config.motion[key]
              }
            }
          })
        }

        // 恢复主题配置
        if (config.themeName) {
          const theme = presetThemes.find(t => t.name === config.themeName)
          if (theme) {
            currentTheme.value = theme
          }
        }

        console.log('[useAppConfig] 配置加载成功')
      }
    } catch (error) {
      console.error('[useAppConfig] 从 localStorage 加载配置失败:', error)
    }
  }

  /**
   * 清除 localStorage 中的配置
   */
  const clearConfigStorage = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('[useAppConfig] 配置已从 localStorage 清除')
    } catch (error) {
      console.error('[useAppConfig] 清除 localStorage 配置失败:', error)
    }
  }

  /**
   * 重置配置为默认值
   */
  const resetConfig = (): void => {
    Object.assign(particleConfig, defaultConfig)
    bloomConfig.enabled = true
    bloomConfig.strength = 1.5
    bloomConfig.radius = 0.4
    bloomConfig.threshold = 0.85
    glowConfig.enabled = true
    glowConfig.intensity = 0.5
    motionConfig.mode = MotionMode.NOISE_FIELD
    motionConfig.lorenz = { sigma: 10.0, rho: 28.0, beta: 8.0 / 3.0 }
    motionConfig.thomas = { b: 0.208186 }
    motionConfig.clifford = { a: 1.7, b: 1.7, c: 0.06, d: 1.2 }
    motionConfig.rossler = { a: 0.2, b: 0.2, c: 5.7 }
    motionConfig.timeScale = 0.001
    motionConfig.particleScale = 0.01
    currentTheme.value = presetThemes[0]
    clearConfigStorage()
  }

  /**
   * 更新主题
   */
  const updateTheme = (theme: ColorTheme): void => {
    currentTheme.value = theme
    saveConfigToStorage()
  }

  return {
    particleConfig,
    bloomConfig,
    glowConfig,
    motionConfig,
    currentTheme,
    presetThemes,
    saveConfigToStorage,
    loadConfigFromStorage,
    clearConfigStorage,
    resetConfig,
    updateTheme
  }
}