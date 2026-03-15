<template>
  <transition name="fade">
    <div v-if="show" class="dashboard-overlay" @click="$emit('close')">
      <div class="dashboard-content" @click.stop>
        <div class="dashboard-header">
          <h2 class="dashboard-title">粒子参数控制</h2>
          <button class="close-button" @click="$emit('close')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="dashboard-body">
          <!-- 性能监控 -->
          <PerformanceMonitor
            :metrics="metrics"
            :particleCount="particleCount"
            :supportsGPGPU="supportsGPGPU"
            :isSwitching="isSwitchingMode"
            @toggleMode="$emit('toggleMode')"
          />

          <!-- 颜色主题 -->
          <ThemeSelector
            :themes="themes"
            :currentTheme="currentTheme"
            @changeTheme="$emit('changeTheme', $event)"
          />

          <!-- 控制面板 -->
          <ControlPanel
            :config="particleConfig"
            :bloomConfig="bloomConfig"
            :glowConfig="glowConfig"
            :attractorConfig="attractorConfig"
            :motionMode="motionMode"
            @update="$emit('update')"
            @updateBloom="$emit('updateBloom')"
            @updateGlow="$emit('updateGlow')"
            @changeMotionMode="$emit('changeMotionMode', $event)"
            @updateAttractor="$emit('updateAttractor', $event)"
          />
        </div>

        <div class="dashboard-footer">
          <div class="footer-buttons">
            <button class="footer-button export-button" @click="$emit('export')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              导出配置
            </button>
            <button class="footer-button import-button" @click="$emit('import')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              导入配置
            </button>
          </div>
          <button class="reset-button" @click="$emit('reset')">重置参数</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { MotionMode } from '../../modules/particles/MotionMode'
import type { ColorTheme } from '../../modules/colors/ColorTheme'
import type { PerformanceMetrics } from '../../types/performance'
import PerformanceMonitor from './PerformanceMonitor.vue'
import ThemeSelector from './ThemeSelector.vue'
import ControlPanel from './ControlPanel.vue'

interface ParticleConfig {
  particleCount: number
  particleSize: number
  boundsRadius: number
  velocityScale: number
  maxSpeed: number
  enableSpeedBasedSize: boolean
  speedBasedSizeFactor: number
  parallaxStrength: number
  enableFog: boolean
  fogDensity: number
}

interface BloomConfig {
  enabled: boolean
  strength: number
  radius: number
  threshold: number
}

interface GlowConfig {
  enabled: boolean
  intensity: number
}

interface AttractorConfig {
  lorenz: { sigma: number; rho: number; beta: number }
  thomas: { b: number }
  clifford: { a: number; b: number; c: number; d: number }
  rossler: { a: number; b: number; c: number }
  timeScale: number
  particleScale: number
}

interface Props {
  show: boolean
  metrics: PerformanceMetrics
  particleCount: number
  particleConfig: ParticleConfig
  bloomConfig: BloomConfig
  glowConfig: GlowConfig
  attractorConfig: AttractorConfig
  motionMode: MotionMode
  themes: ColorTheme[]
  currentTheme: ColorTheme
  supportsGPGPU: boolean
  isSwitchingMode: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'toggleMode'): void
  (e: 'changeTheme', theme: ColorTheme): void
  (e: 'update'): void
  (e: 'updateBloom'): void
  (e: 'updateGlow'): void
  (e: 'changeMotionMode', mode: MotionMode): void
  (e: 'updateAttractor', config: AttractorConfig): void
  (e: 'export'): void
  (e: 'import'): void
  (e: 'reset'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
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

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

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

.dashboard-body {
  padding: 28px;
  max-height: 60vh;
  overflow-y: auto;
}

.dashboard-footer {
  padding: 20px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
}

.footer-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.footer-button {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.2px;
}

.footer-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.footer-button:active {
  transform: translateY(0);
}

.footer-button svg {
  flex-shrink: 0;
}

.export-button:hover {
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(16, 185, 129, 0.3);
}

.import-button:hover {
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(59, 130, 246, 0.3);
}

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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