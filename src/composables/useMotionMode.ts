import { reactive } from 'vue'
import { MotionMode } from '../modules/particles/MotionMode'
import type { AppManager } from '../modules/AppManager'

/**
 * 运动模式配置接口
 */
export interface MotionConfig {
  mode: MotionMode
  lorenz: { sigma: number; rho: number; beta: number }
  thomas: { b: number }
  clifford: { a: number; b: number; c: number; d: number }
  rossler: { a: number; b: number; c: number }
  timeScale: number
  particleScale: number
}

/**
 * 运动模式描述
 */
export interface MotionModeInfo {
  value: MotionMode
  name: string
  description: string
}

/**
 * 运动模式管理 Hook
 */
export function useMotionMode() {
  /**
   * 运动模式配置
   */
  const motionConfig = reactive<MotionConfig>({
    mode: MotionMode.NOISE_FIELD,
    lorenz: { sigma: 10.0, rho: 28.0, beta: 8.0 / 3.0 },
    thomas: { b: 0.208186 },
    clifford: { a: 1.7, b: 1.7, c: 0.06, d: 1.2 },
    rossler: { a: 0.2, b: 0.2, c: 5.7 },
    timeScale: 0.001,
    particleScale: 0.01
  })

  /**
   * 运动模式列表
   */
  const motionModes: MotionModeInfo[] = [
    { value: MotionMode.NOISE_FIELD, name: '噪声场', description: '基于噪声场的随机运动' },
    { value: MotionMode.LORENZ, name: 'Lorenz', description: 'Lorenz 吸引子（蝴蝶形状）' },
    { value: MotionMode.THOMAS, name: 'Thomas', description: 'Thomas 吸引子（三螺旋）' },
    { value: MotionMode.CLIFFORD, name: 'Clifford', description: 'Clifford 吸引子（复杂图案）' },
    { value: MotionMode.ROSSLER, name: 'Rossler', description: 'Rossler 吸引子（螺旋结构）' },
    { value: MotionMode.HYBRID, name: '混合', description: '噪声场与吸引子混合' }
  ]

  /**
   * 获取运动模式名称
   */
  const getMotionModeName = (mode: MotionMode): string => {
    const modeObj = motionModes.find(m => m.value === mode)
    return modeObj?.name || mode
  }

  /**
   * 更改运动模式
   */
  const changeMotionMode = (
    mode: MotionMode,
    appManager: AppManager | null,
    saveCallback?: () => void
  ): void => {
    if (appManager) {
      motionConfig.mode = mode
      // 更新粒子系统的运动模式
      appManager.setMotionMode(mode)
      // 更新吸引子参数
      appManager.setAttractorParams({
        lorenz: motionConfig.lorenz,
        thomas: motionConfig.thomas,
        clifford: motionConfig.clifford,
        rossler: motionConfig.rossler,
        timeScale: motionConfig.timeScale,
        particleScale: motionConfig.particleScale
      })
      // 保存配置
      saveCallback?.()
    }
  }

  /**
   * 重置运动模式配置
   */
  const resetMotionConfig = (): void => {
    motionConfig.mode = MotionMode.NOISE_FIELD
    motionConfig.lorenz = { sigma: 10.0, rho: 28.0, beta: 8.0 / 3.0 }
    motionConfig.thomas = { b: 0.208186 }
    motionConfig.clifford = { a: 1.7, b: 1.7, c: 0.06, d: 1.2 }
    motionConfig.rossler = { a: 0.2, b: 0.2, c: 5.7 }
    motionConfig.timeScale = 0.001
    motionConfig.particleScale = 0.01
  }

  /**
   * 更新吸引子参数
   */
  const updateAttractorParams = (
    appManager: AppManager | null,
    saveCallback?: () => void
  ): void => {
    if (appManager) {
      appManager.setAttractorParams({
        lorenz: motionConfig.lorenz,
        thomas: motionConfig.thomas,
        clifford: motionConfig.clifford,
        rossler: motionConfig.rossler,
        timeScale: motionConfig.timeScale,
        particleScale: motionConfig.particleScale
      })
      saveCallback?.()
    }
  }

  return {
    motionConfig,
    motionModes,
    getMotionModeName,
    changeMotionMode,
    resetMotionConfig,
    updateAttractorParams
  }
}