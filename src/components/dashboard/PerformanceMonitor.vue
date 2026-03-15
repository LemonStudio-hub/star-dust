<template>
  <div class="performance-section">
    <div class="performance-title">性能监控</div>
    <div class="performance-grid">
      <div class="performance-item">
        <span class="performance-label">FPS</span>
        <span class="performance-value" :class="fpsClass">{{ metrics.fps }}</span>
      </div>
      <div class="performance-item">
        <span class="performance-label">帧时间</span>
        <span class="performance-value">{{ metrics.frameTime.toFixed(1) }} ms</span>
      </div>
      <div class="performance-item">
        <span class="performance-label">内存</span>
        <span class="performance-value">{{ metrics.memoryText }}</span>
      </div>
      <div class="performance-item">
        <span class="performance-label">GPU 内存</span>
        <span class="performance-value">{{ metrics.gpuMemoryText }}</span>
      </div>
      <div class="performance-item">
        <span class="performance-label">粒子数量</span>
        <span class="performance-value">{{ particleCount.toLocaleString() }}</span>
      </div>
      <div class="performance-item">
        <span class="performance-label">状态</span>
        <span class="performance-value status-badge" :class="metrics.status">
          {{ metrics.statusText }}
        </span>
      </div>
      <div class="performance-item">
        <span class="performance-label">计算模式</span>
        <span class="performance-value mode-badge" :class="metrics.computeMode">
          {{ metrics.computeModeText }}
        </span>
      </div>
      <div class="performance-item">
        <span class="performance-label">Draw Calls</span>
        <span class="performance-value">{{ metrics.drawCalls }}</span>
      </div>
    </div>

    <!-- 模式切换按钮 -->
    <div class="mode-switch-container" v-if="supportsGPGPU">
      <button
        class="mode-switch-button"
        @click="$emit('toggleMode')"
        :disabled="isSwitching"
      >
        <span v-if="!isSwitching">{{ modeButtonText }}</span>
        <span v-else>切换中...</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PerformanceMetrics } from '../../types/performance'

interface Props {
  metrics: PerformanceMetrics
  particleCount: number
  supportsGPGPU: boolean
  isSwitching: boolean
}

interface Emits {
  (e: 'toggleMode'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const fpsClass = computed(() => {
  if (props.metrics.fps >= 50) return 'fps-good'
  if (props.metrics.fps >= 30) return 'fps-medium'
  return 'fps-poor'
})

const modeButtonText = computed(() => {
  return props.metrics.computeMode === 'CPU' ? '切换到 GPU' : '切换到 CPU'
})
</script>

<style scoped>
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

.performance-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
  letter-spacing: 0.3px;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

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

.performance-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  letter-spacing: 0.2px;
}

.performance-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  font-feature-settings: 'tnum' 1;
  letter-spacing: -0.3px;
}

.fps-good {
  color: #10b981;
}

.fps-medium {
  color: #f59e0b;
}

.fps-poor {
  color: #ef4444;
}

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

.mode-switch-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

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
</style>