<template>
  <div ref="container" class="particle-container">
    <!-- 加载指示器 -->
    <transition name="loader-fade">
      <div v-if="isLoading" class="loader">
        <div class="loader-ring"></div>
      </div>
    </transition>
    
    <canvas ref="canvas"></canvas>

    <!-- 设置按钮（齿轮图标） -->
    <button class="settings-button" @click="openDashboard" title="打开设置">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </button>

    <!-- 仪表盘遮罩 -->
    <transition name="fade">
      <div v-if="showDashboard" class="dashboard-overlay" @click="closeDashboard">
        <div class="dashboard-content" @click.stop>
          <div class="dashboard-header">
            <h2 class="dashboard-title">粒子参数控制</h2>
            <button class="close-button" @click="closeDashboard">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="dashboard-body">
            <!-- 性能监控 -->
            <div class="performance-section">
              <div class="performance-title">性能监控</div>
              <div class="performance-grid">
                <div class="performance-item">
                  <span class="performance-label">FPS</span>
                  <span class="performance-value" :class="fpsClass">{{ perfMetrics.fps }}</span>
                </div>
                <div class="performance-item">
                  <span class="performance-label">帧时间</span>
                  <span class="performance-value">{{ perfMetrics.frameTime.toFixed(1) }} ms</span>
                </div>
                <div class="performance-item">
                  <span class="performance-label">粒子数量</span>
                  <span class="performance-value">{{ particleConfig.count.toLocaleString() }}</span>
                </div>
                <div class="performance-item">
                  <span class="performance-label">状态</span>
                  <span class="performance-value status-badge" :class="perfMetrics.status">
                    {{ perfMetrics.statusText }}
                  </span>
                </div>
                <div class="performance-item">
                  <span class="performance-label">计算模式</span>
                  <span class="performance-value mode-badge" :class="perfMetrics.computeMode">
                    {{ perfMetrics.computeModeText }}
                  </span>
                </div>
              </div>

              <!-- 模式切换按钮 -->
              <div class="mode-switch-container" v-if="supportsGPGPU">
                <button
                  class="mode-switch-button"
                  @click="toggleComputeMode"
                  :disabled="isSwitchingMode"
                >
                  <span v-if="!isSwitchingMode">{{ getModeButtonText }}</span>
                  <span v-else>切换中...</span>
                </button>
              </div>
            </div>

            <!-- 颜色主题 -->
            <div class="theme-section">
              <div class="theme-title">颜色主题</div>
              <div class="theme-grid">
                <button
                  v-for="theme in presetThemes"
                  :key="theme.name"
                  :class="['theme-button', { active: currentTheme.name === theme.name }]"
                  @click="changeTheme(theme)"
                  :title="theme.description"
                >
                  <div class="theme-preview">
                    <div
                      v-for="(color, index) in theme.colors"
                      :key="index"
                      class="theme-color"
                      :style="{ background: `rgb(${color.color[0] * 255}, ${color.color[1] * 255}, ${color.color[2] * 255})` }"
                    ></div>
                  </div>
                  <div class="theme-name">{{ theme.name }}</div>
                </button>
              </div>
            </div>

            <!-- 粒子数量 -->
            <div class="control-group">
              <label class="control-label">
                <span class="label-text">粒子数量</span>
                <span class="label-value">{{ particleConfig.count }}</span>
              </label>
              <input 
                type="range" 
                v-model.number="particleConfig.count" 
                min="1000" 
                max="100000" 
                step="1000"
                @input="updateParticleConfig"
                class="control-slider"
              >
            </div>

            <!-- 粒子大小 -->
            <div class="control-group">
              <label class="control-label">
                <span class="label-text">粒子大小</span>
                <span class="label-value">{{ particleConfig.size.toFixed(2) }}</span>
              </label>
              <input 
                type="range" 
                v-model.number="particleConfig.size" 
                min="0.1" 
                max="5" 
                step="0.1"
                @input="updateParticleConfig"
                class="control-slider"
              >
            </div>

            <!-- 边界半径 -->
            <div class="control-group">
              <label class="control-label">
                <span class="label-text">边界半径</span>
                <span class="label-value">{{ particleConfig.boundsRadius }}</span>
              </label>
              <input 
                type="range" 
                v-model.number="particleConfig.boundsRadius" 
                min="10" 
                max="200" 
                step="5"
                @input="updateParticleConfig"
                class="control-slider"
              >
            </div>

            <!-- 速度缩放 -->
            <div class="control-group">
              <label class="control-label">
                <span class="label-text">速度缩放</span>
                <span class="label-value">{{ particleConfig.velocityScale.toFixed(3) }}</span>
              </label>
              <input 
                type="range" 
                v-model.number="particleConfig.velocityScale" 
                min="0.01" 
                max="0.5" 
                step="0.01"
                @input="updateParticleConfig"
                class="control-slider"
              >
            </div>

            <!-- 最大速度 -->
            <div class="control-group">
              <label class="control-label">
                <span class="label-text">最大速度</span>
                <span class="label-value">{{ particleConfig.maxSpeed.toFixed(3) }}</span>
              </label>
              <input 
                type="range" 
                v-model.number="particleConfig.maxSpeed" 
                min="0.01" 
                max="1" 
                step="0.01"
                @input="updateParticleConfig"
                class="control-slider"
              >
            </div>
          </div>

          <div class="dashboard-footer">
            <button class="reset-button" @click="resetConfig">重置参数</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { AppManager, ParticleComputeMode } from './modules/AppManager'
import { PRESET_THEMES } from './modules/colors/presets'
import type { ColorTheme } from './modules/colors/ColorTheme'

/**
 * 容器元素引用
 * 用于获取 DOM 元素的尺寸和位置信息
 */
const container = ref<HTMLDivElement>()

/**
 * Canvas 元素引用
 * 用于 WebGL 渲染
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
 * 三连击检测相关变量
 */
const clickTimestamps = ref<number[]>([])
const CLICK_THRESHOLD = 500 // 三连击时间阈值（毫秒）
const CLICK_COUNT = 3 // 需要的点击次数

/**
 * 粒子配置参数
 */
const particleConfig = reactive({
  count: 40000,
  size: 1.0,
  boundsRadius: 60,
  velocityScale: 0.1,
  maxSpeed: 0.18
})

/**
 * 默认配置（用于重置）
 */
const defaultConfig = { ...particleConfig }

/**
 * 性能监控数据
 */
const perfMetrics = reactive({
  fps: 60,
  frameTime: 16.67,
  status: 'good',
  statusText: '流畅',
  computeMode: ParticleComputeMode.CPU,
  computeModeText: 'CPU'
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
 * FPS 状态类名
 */
const fpsClass = computed(() => {
  if (perfMetrics.fps >= 50) return 'fps-good'
  if (perfMetrics.fps >= 30) return 'fps-medium'
  return 'fps-poor'
})

/**
 * 当前选中的颜色主题
 */
const currentTheme = ref<ColorTheme>(PRESET_THEMES[0])

/**
 * 所有预设主题
 */
const presetThemes = PRESET_THEMES

/**
 * 切换颜色主题
 *
 * @param theme - 要切换的主题
 */
const changeTheme = (theme: ColorTheme): void => {
  if (appManager) {
    currentTheme.value = theme
    appManager.setColorTheme(theme)
  }
}

/**
 * 应用管理器实例
 * 负责管理整个应用的生命周期和所有子系统
 */
let appManager: AppManager | null = null

/**
 * 处理点击事件（检测三连击）
 */
const handleClick = (): void => {
  const now = Date.now()
  
  // 添加当前点击时间戳
  clickTimestamps.value.push(now)
  
  // 移除超过阈值的旧点击
  clickTimestamps.value = clickTimestamps.value.filter(
    timestamp => now - timestamp < CLICK_THRESHOLD
  )
  
  // 检测是否达到三连击
  if (clickTimestamps.value.length >= CLICK_COUNT) {
    // 清空点击记录
    clickTimestamps.value = []
    // 切换仪表盘显示
    showDashboard.value = !showDashboard.value
  }
}

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
 * 更新粒子配置
 */
const updateParticleConfig = (): void => {
  if (appManager) {
    appManager.updateConfig(particleConfig)
  }
}

/**
 * 重置配置为默认值
 */
const resetConfig = (): void => {
  Object.assign(particleConfig, defaultConfig)
  updateParticleConfig()
}

/**
 * 切换计算模式
 */
const toggleComputeMode = async (): Promise<void> => {
  if (isSwitchingMode.value || !appManager) {
    return
  }

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
 * 获取模式按钮文本
 */
const getModeButtonText = computed(() => {
  return perfMetrics.computeMode === ParticleComputeMode.CPU ? '切换到 GPU' : '切换到 CPU'
})

/**
 * 组件挂载时的初始化
 *
 * 创建并初始化应用管理器，启动 3D 粒子动画。
 */
onMounted(() => {
  if (!container.value || !canvas.value) {
    console.error('Container or canvas element not found')
    isLoading.value = false
    return
  }

  try {
    // 初始化应用配置
    const config = {
      particleCount: 40000,    // 粒子数量
      particleSize: 1.0,        // 粒子大小
      boundsRadius: 60,         // 边界半径
      velocityScale: 0.1,       // 速度缩放因子
      maxSpeed: 0.18,           // 最大速度限制
      enableTrails: true,       // 启用粒子轨迹
      trailConfig: {            // 轨迹配置
        length: 8,              // 轨迹长度（历史位置数量）
        maxAge: 45,             // 轨迹最大寿命（帧数）
        color: [0.5, 0.8, 1.0], // 轨迹颜色（RGB，0-1）
        opacity: 0.4,           // 轨迹透明度
        lineWidth: 1.2          // 轨迹宽度
      }
    }

    // 创建并启动应用管理器
    console.log('[App.vue] 开始创建 AppManager...')
    appManager = new AppManager(container.value, canvas.value, config)
    console.log('[App.vue] AppManager 创建成功')

    // 设置默认颜色主题
    if (appManager) {
      try {
        appManager.setColorTheme(currentTheme.value)
        console.log('[App.vue] 默认主题设置成功:', currentTheme.value.name)
      } catch (themeError) {
        console.error('[App.vue] 设置主题失败:', themeError)
      }
    }

    // 添加点击事件监听
    if (container.value) {
      container.value.addEventListener('click', handleClick)
      container.value.addEventListener('touchend', handleClick)
    }

    // 设置性能监控回调
    if (appManager) {
      appManager.setPerformanceCallback((fps, frameTime) => {
        perfMetrics.fps = fps
        perfMetrics.frameTime = frameTime

        // 更新状态
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
      })

      // 获取计算模式信息
      perfMetrics.computeMode = appManager.getComputeMode()
      perfMetrics.computeModeText = perfMetrics.computeMode === ParticleComputeMode.GPU ? 'GPU' : 'CPU'
      supportsGPGPU.value = appManager.isGPGPUSupported()
    }

    console.log('[App.vue] 应用初始化完成')
  } catch (error) {
    console.error('[App.vue] 应用初始化失败:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[App.vue] 错误详情:', errorMessage)

    // 隐藏加载指示器
    isLoading.value = false

    // 可以在这里显示错误信息给用户
    alert(`应用初始化失败: ${errorMessage}\n\n请刷新页面重试。`)
  } finally {
    // 确保加载指示器被隐藏
    isLoading.value = false
    console.log('[App.vue] 加载指示器已隐藏')
  }
})

/**
 * 组件卸载时的清理
 *
 * 释放应用管理器的所有资源，防止内存泄漏。
 */
onUnmounted(() => {
  if (appManager) {
    console.log('Disposing application...')
    appManager.removePerformanceCallback()
    appManager.dispose()
    appManager = null
  }

  // 移除事件监听
  if (container.value) {
    container.value.removeEventListener('click', handleClick)
    container.value.removeEventListener('touchend', handleClick)
  }
})
</script>

<style scoped>
/**
 * 加载指示器样式
 */
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

/**
 * 粒子容器样式
 * 
 * 使用 CSS 硬件加速优化渲染性能
 * 启用 GPU 加速和透视效果
 */
.particle-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  /* GPU 加速优化 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  
  /* 性能优化提示 */
  will-change: transform;
  
  /* 3D 透视设置 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000px;
  -webkit-perspective: 1000px;
}

/**
 * Canvas 元素样式
 * 
 * 确保 Canvas 正确填充容器并启用硬件加速
 */
canvas {
  display: block;
  width: 100%;
  height: 100%;
  
  /* GPU 加速优化 */
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  
  /* 性能优化提示 */
  will-change: transform;
  
  /* 3D 透视设置 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/**
 * 设置按钮（齿轮图标）
 */
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

/**
 * 仪表盘遮罩层
 */
.dashboard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/**
 * 仪表盘内容卡片
 */
.dashboard-content {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/**
 * 仪表盘头部
 */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/**
 * 仪表盘标题
 */
.dashboard-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #ffffff 0%, #a8a8a8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/**
 * 关闭按钮
 */
.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  transform: scale(1.05);
}

.close-button:active {
  transform: scale(0.95);
}

/**
 * 仪表盘主体内容
 */
.dashboard-body {
  padding: 28px;
  max-height: 60vh;
  overflow-y: auto;
}

/**
 * 性能监控部分
 */
.performance-section {
  margin-bottom: 28px;
  padding: 20px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(168, 85, 247, 0.15) 50%,
    rgba(236, 72, 153, 0.15) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

/**
 * 性能监控标题
 */
.performance-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
  letter-spacing: 0.3px;
}

/**
 * 性能监控网格
 */
.performance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/**
 * 性能监控项
 */
.performance-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.performance-item:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.15);
}

/**
 * 性能监控标签
 */
.performance-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  letter-spacing: 0.2px;
}

/**
 * 性能监控值
 */
.performance-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  font-feature-settings: 'tnum' 1;
  letter-spacing: -0.3px;
}

/**
 * FPS 状态样式 - 流畅
 */
.fps-good {
  color: #10b981;
}

/**
 * FPS 状态样式 - 一般
 */
.fps-medium {
  color: #f59e0b;
}

/**
 * FPS 状态样式 - 卡顿
 */
.fps-poor {
  color: #ef4444;
}

/**
 * 状态徽章
 */
.status-badge {
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.status-badge.good {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.status-badge.medium {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.status-badge.poor {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/**
 * 模式徽章
 */
.mode-badge {
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.mode-badge.CPU {
  background: rgba(99, 102, 241, 0.2);
  color: #6366f1;
}

.mode-badge.GPU {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

/**
 * 模式切换容器
 */
.mode-switch-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/**
 * 模式切换按钮
 */
.mode-switch-button {
  width: 100%;
  padding: 10px 20px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.6) 0%,
    rgba(168, 85, 247, 0.6) 50%,
    rgba(236, 72, 153, 0.6) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.2px;
}

.mode-switch-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 6px 16px rgba(99, 102, 241, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.3);
}

.mode-switch-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    0 3px 8px rgba(99, 102, 241, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.2);
}

.mode-switch-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/**
 * 主题选择器部分
 */
.theme-section {
  margin-bottom: 28px;
  padding: 20px;
  background: linear-gradient(
    135deg,
    rgba(16, 185, 129, 0.15) 0%,
    rgba(6, 182, 212, 0.15) 50%,
    rgba(59, 130, 246, 0.15) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

/**
 * 主题选择器标题
 */
.theme-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
  letter-spacing: 0.3px;
}

/**
 * 主题网格布局
 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/**
 * 主题按钮
 */
.theme-button {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.theme-button:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.theme-button:active {
  transform: translateY(0);
}

.theme-button.active {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

/**
 * 主题预览
 */
.theme-preview {
  width: 100%;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}

.theme-color {
  flex: 1;
  height: 100%;
  transition: all 0.3s ease;
}

/**
 * 主题名称
 */
.theme-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  text-align: center;
  letter-spacing: 0.2px;
}

/**
 * 响应式设计 - 主题网格
 */
@media (max-width: 480px) {
  .theme-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/**
 * 控制组
 */
.control-group {
  margin-bottom: 28px;
}

.control-group:last-child {
  margin-bottom: 0;
}

/**
 * 控制标签
 */
.control-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/**
 * 标签文本
 */
.label-text {
  letter-spacing: 0.2px;
}

/**
 * 标签值显示
 */
.label-value {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  min-width: 50px;
  text-align: center;
  font-feature-settings: 'tnum' 1;
}

/**
 * 滑块控件
 */
.control-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-slider:hover {
  background: rgba(255, 255, 255, 0.15);
}

/**
 * 滑块轨道 - Webkit
 */
.control-slider::-webkit-slider-runnable-track {
  height: 6px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.8) 0%,
    rgba(168, 85, 247, 0.8) 50%,
    rgba(236, 72, 153, 0.8) 100%
  );
  border-radius: 3px;
}

/**
 * 滑块滑块 - Webkit
 */
.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 4px rgba(255, 255, 255, 0.1);
  margin-top: -7px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.control-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 0 0 6px rgba(255, 255, 255, 0.15);
}

.control-slider::-webkit-slider-thumb:active {
  transform: scale(0.95);
}

/**
 * 滑块轨道 - Firefox
 */
.control-slider::-moz-range-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

/**
 * 滑块滑块 - Firefox
 */
.control-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 4px rgba(255, 255, 255, 0.1);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.control-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
}

/**
 * 仪表盘底部
 */
.dashboard-footer {
  padding: 20px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
}

/**
 * 重置按钮
 */
.reset-button {
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.8) 0%,
    rgba(168, 85, 247, 0.8) 50%,
    rgba(236, 72, 153, 0.8) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.3px;
}

.reset-button:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(99, 102, 241, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.3);
}

.reset-button:active {
  transform: translateY(0);
  box-shadow: 
    0 4px 12px rgba(99, 102, 241, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.2);
}

/**
 * 滚动条样式
 */
.dashboard-body::-webkit-scrollbar {
  width: 6px;
}

.dashboard-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.dashboard-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.dashboard-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/**
 * 动画 - 淡入淡出
 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/**
 * 动画 - 滑入
 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/**
 * 响应式设计
 */
@media (max-width: 480px) {
  .dashboard-content {
    max-width: 100%;
    border-radius: 20px;
  }
  
  .dashboard-header,
  .dashboard-body,
  .dashboard-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
  
  .dashboard-title {
    font-size: 18px;
  }
}
</style>