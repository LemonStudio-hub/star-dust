<template>
  <ErrorBoundary>
    <ParticleErrorBoundary @error="handleParticleError">
      <div ref="container" class="particle-container">
      <!-- 加载指示器 -->
      <transition name="loader-fade">
        <div v-if="isLoading" class="loader">
          <div class="loader-ring"></div>
        </div>
      </transition>

      <canvas ref="canvas"></canvas>

      <!-- 设置按钮 -->
      <button class="settings-button" @click="openDashboard" title="打开设置">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <!-- 仪表盘 -->
      <Dashboard
        :show="showDashboard"
        :metrics="perfMetrics"
        :particleCount="config.particleConfig.particleCount"
        :particleConfig="config.particleConfig"
        :bloomConfig="config.bloomConfig"
        :glowConfig="config.glowConfig"
        :attractorConfig="config.motionConfig"
        :motionMode="config.motionConfig.mode"
        :themes="config.presetThemes"
        :currentTheme="config.currentTheme"
        :supportsGPGPU="supportsGPGPU"
        :isSwitchingMode="isSwitchingMode"
        @close="closeDashboard"
        @toggleMode="toggleComputeMode"
        @changeTheme="changeTheme"
        @update="updateParticleConfig"
        @updateBloom="updateBloomConfig"
        @updateGlow="updateGlowConfig"
        @changeMotionMode="changeMotionMode"
        @updateAttractor="updateAttractorParams"
        @export="exportConfig"
        @import="importConfig"
        @reset="resetConfig"
      />
    </div>
    </ParticleErrorBoundary>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { AppManager, ParticleComputeMode } from './modules/AppManager'
import { MotionMode } from './modules/particles/MotionMode'
import ErrorBoundary from './components/ErrorBoundary.vue'
import ParticleErrorBoundary from './components/ParticleErrorBoundary.vue'
import Dashboard from './components/dashboard/Dashboard.vue'
import { useAppConfig } from './composables/useAppConfig'
import type { PerformanceMetrics } from './types/performance'

/**
 * 容器元素引用
 */
const container = ref<HTMLDivElement>()

/**
 * Canvas 元素引用
 */
const canvas = ref<HTMLCanvasElement>()

/**
 * 仪表盘显示状态
 */
const showDashboard = ref(false)

/**
 * 加载状态
 */
const isLoading = ref(true)

/**
 * 应用配置
 */
const config = useAppConfig()

/**
 * 应用管理器实例
 */
let appManager: AppManager | null = null

/**
 * 性能监控数据
 */
const perfMetrics = reactive<PerformanceMetrics>({
  fps: 60,
  frameTime: 16.67,
  status: 'good',
  statusText: '流畅',
  computeMode: 'CPU',
  computeModeText: 'CPU',
  memory: 0,
  memoryText: '0 MB',
  gpuMemory: 0,
  gpuMemoryText: '0 MB',
  drawCalls: 0,
  triangles: 0
})

/**
 * 是否支持 GPGPU
 */
const supportsGPGPU = ref(false)

/**
 * 是否正在切换模式
 */
const isSwitchingMode = ref(false)

/**
 * 打开仪表盘
 */
const openDashboard = (): void => {
  showDashboard.value = true
}

/**
 * 关闭仪表盘
 */
const closeDashboard = (): void => {
  showDashboard.value = false
}

/**
 * 切换颜色主题
 */
const changeTheme = (theme: typeof config.currentTheme.value): void => {
  if (appManager) {
    config.updateTheme(theme)
    appManager.setColorTheme(theme)
  }
}

/**
 * 切换运动模式
 */
const changeMotionMode = (mode: MotionMode): void => {
  if (appManager) {
    config.motionConfig.mode = mode
    appManager.setMotionMode(mode)
    appManager.setAttractorParams({
      lorenz: config.motionConfig.lorenz,
      thomas: config.motionConfig.thomas,
      clifford: config.motionConfig.clifford,
      rossler: config.motionConfig.rossler,
      timeScale: config.motionConfig.timeScale,
      particleScale: config.motionConfig.particleScale
    })
    config.saveConfigToStorage()
  }
}

/**
 * 更新粒子配置
 */
const updateParticleConfig = (): void => {
  if (appManager) {
    appManager.updateConfig(config.particleConfig)
    config.saveConfigToStorage()
  }
}

/**
 * 更新泛光配置
 */
const updateBloomConfig = (): void => {
  if (appManager) {
    appManager.setBloomConfig({
      enabled: config.bloomConfig.enabled,
      strength: config.bloomConfig.strength,
      radius: config.bloomConfig.radius,
      threshold: config.bloomConfig.threshold
    })
    config.saveConfigToStorage()
  }
}

/**
 * 更新发光配置
 */
const updateGlowConfig = (): void => {
  if (appManager) {
    appManager.setGlowConfig({
      enabled: config.glowConfig.enabled,
      intensity: config.glowConfig.intensity
    })
    config.saveConfigToStorage()
  }
}

/**
 * 更新吸引子参数
 */
const updateAttractorParams = (): void => {
  if (appManager) {
    appManager.setAttractorParams({
      lorenz: config.motionConfig.lorenz,
      thomas: config.motionConfig.thomas,
      clifford: config.motionConfig.clifford,
      rossler: config.motionConfig.rossler,
      timeScale: config.motionConfig.timeScale,
      particleScale: config.motionConfig.particleScale
    })
    config.saveConfigToStorage()
  }
}

/**
 * 重置配置
 */
const resetConfig = (): void => {
  config.resetConfig()
  updateParticleConfig()
  updateBloomConfig()
  updateGlowConfig()
  changeMotionMode(MotionMode.NOISE_FIELD)
  if (appManager) {
    appManager.setColorTheme(config.currentTheme)
  }
}

/**
 * 更新高级性能指标
 */
const updateAdvancedMetrics = (): void => {
  if (performance.memory) {
    const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
    perfMetrics.memory = memoryMB
    perfMetrics.memoryText = `${memoryMB} MB`
  }

  if (appManager && appManager.renderer) {
    const gpuMemoryMB = Math.round(
      (config.particleConfig.particleCount * 4 * 4 +
      config.particleConfig.particleCount * 4 * 4 +
      config.particleConfig.particleCount * 3 * 4) /
      1024 / 1024
    )
    perfMetrics.gpuMemory = gpuMemoryMB
    perfMetrics.gpuMemoryText = `${gpuMemoryMB} MB`
    perfMetrics.drawCalls = appManager.renderer.renderer.info.render.calls
    perfMetrics.triangles = appManager.renderer.renderer.info.render.triangles
  }
}

/**
 * 导出配置
 */
const exportConfig = (): void => {
  try {
    if (!appManager) {
      alert('导出配置失败: AppManager 未初始化')
      return
    }

    const configJson = appManager.exportConfig()
    const blob = new Blob([configJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xingchen-config-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    alert('配置导出成功！')
  } catch (error) {
    alert(`导出配置失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 导入配置
 */
const importConfig = (): void => {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()

        if (!appManager) {
          alert('导入配置失败: AppManager 未初始化')
          return
        }

        const success = appManager.importConfig(text)

        if (success) {
          config.saveConfigToStorage()
          alert('配置导入成功！')
        } else {
          alert('配置导入失败！请检查配置文件格式。')
        }
      } catch (error) {
        alert(`读取配置文件失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    input.click()
  } catch (error) {
    alert(`导入配置失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 处理粒子系统错误
 */
const handleParticleError = (error: Error): void => {
  console.error('[App.vue] 粒子系统错误:', error)
}

/**
 * 切换计算模式
 */
const toggleComputeMode = async (): Promise<void> => {
  if (isSwitchingMode.value || !appManager) return

  const currentMode = appManager.getComputeMode()
  const targetMode = currentMode === ParticleComputeMode.CPU
    ? ParticleComputeMode.GPU
    : ParticleComputeMode.CPU

  isSwitchingMode.value = true

  try {
    const success = await appManager.switchComputeMode(targetMode)
    if (success) {
      perfMetrics.computeMode = targetMode
      perfMetrics.computeModeText = targetMode === ParticleComputeMode.GPU ? 'GPU' : 'CPU'
    }
  } catch (error) {
    console.error('切换计算模式失败:', error)
  } finally {
    isSwitchingMode.value = false
  }
}

/**
 * 组件挂载时的初始化
 */
onMounted(() => {
  if (!container.value || !canvas.value) {
    console.error('Container or canvas element not found')
    isLoading.value = false
    return
  }

  try {
    config.loadConfigFromStorage()

    const initConfig = {
      particleCount: config.particleConfig.particleCount,
      particleSize: config.particleConfig.particleSize,
      boundsRadius: config.particleConfig.boundsRadius,
      velocityScale: config.particleConfig.velocityScale,
      maxSpeed: config.particleConfig.maxSpeed,
      enableTrails: true,
      trailConfig: {
        length: 8,
        maxAge: 45,
        color: [0.5, 0.8, 1.0],
        opacity: 0.4,
        lineWidth: 1.2
      },
      enableParticleBreathing: true,
      breathingAmplitude: 0.3,
      breathingFrequency: 0.5,
      enableSpeedBasedSize: config.particleConfig.enableSpeedBasedSize,
      speedBasedSizeFactor: config.particleConfig.speedBasedSizeFactor,
      parallaxStrength: config.particleConfig.parallaxStrength,
      enableFog: config.particleConfig.enableFog,
      fogDensity: config.particleConfig.fogDensity,
      enableGlow: config.glowConfig.enabled,
      glowIntensity: config.glowConfig.intensity
    }

    console.log('[App.vue] 开始创建 AppManager...')
    appManager = new AppManager(container.value, canvas.value, initConfig)
    console.log('[App.vue] AppManager 创建成功')

    if (appManager) {
      try {
        appManager.setColorTheme(config.currentTheme)
        console.log('[App.vue] 默认主题设置成功:', config.currentTheme.name)
      } catch (themeError) {
        console.error('[App.vue] 设置主题失败:', themeError)
      }

      try {
        appManager.setMotionMode(config.motionConfig.mode)
        appManager.setAttractorParams({
          lorenz: config.motionConfig.lorenz,
          thomas: config.motionConfig.thomas,
          clifford: config.motionConfig.clifford,
          rossler: config.motionConfig.rossler,
          timeScale: config.motionConfig.timeScale,
          particleScale: config.motionConfig.particleScale
        })
        console.log('[App.vue] 运动模式初始化成功:', config.motionConfig.mode)
      } catch (motionError) {
        console.error('[App.vue] 设置运动模式失败:', motionError)
      }
    }

    if (appManager) {
      appManager.setPerformanceCallback((fps, frameTime) => {
        perfMetrics.fps = fps
        perfMetrics.frameTime = frameTime

        if (fps >= 50) {
          perfMetrics.status = 'good'
          perfMetrics.statusText = '流畅'
        } else if (fps >= 30) {
          perfMetrics.status = 'medium'
          perfMetrics.statusText = '一般'
        } else {
          perfMetrics.status = 'poor'
          perfMetrics.statusText = '卡顿'
        }

        updateAdvancedMetrics()
      })

      perfMetrics.computeMode = appManager.getComputeMode()
      perfMetrics.computeModeText = perfMetrics.computeMode === ParticleComputeMode.GPU ? 'GPU' : 'CPU'
      supportsGPGPU.value = appManager.isGPGPUSupported()
    }

    const metricsInterval = setInterval(updateAdvancedMetrics, 2000)

    onUnmounted(() => {
      clearInterval(metricsInterval)
    })

    console.log('[App.vue] 应用初始化完成')
  } catch (error) {
    console.error('[App.vue] 应用初始化失败:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    alert(`应用初始化失败: ${errorMessage}\n\n请刷新页面重试。`)
  } finally {
    isLoading.value = false
    console.log('[App.vue] 加载指示器已隐藏')
  }
})

/**
 * 组件卸载时的清理
 */
onUnmounted(() => {
  if (appManager) {
    console.log('Disposing application...')
    appManager.removePerformanceCallback()
    appManager.dispose()
    appManager = null
  }
})
</script>

<style scoped>
.loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
  z-index: 9999;
}

.loader-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: rgba(99, 102, 241, 0.8);
  border-right-color: rgba(168, 85, 247, 0.8);
  border-bottom-color: rgba(236, 72, 153, 0.8);
  border-left-color: rgba(99, 102, 241, 0.3);
  animation: loader-spin 1s linear infinite;
}

@keyframes loader-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loader-fade-enter-active,
.loader-fade-leave-active {
  transition: opacity 0.5s ease;
}

.loader-fade-enter-from,
.loader-fade-leave-to {
  opacity: 0;
}

.particle-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000px;
  -webkit-perspective: 1000px;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.settings-button {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  padding: 0;
  background: transparent;
}

.settings-button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  transform: rotate(90deg) scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.settings-button:active {
  transform: rotate(90deg) scale(0.95);
}

.settings-button svg {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>