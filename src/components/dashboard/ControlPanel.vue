<template>
  <div class="control-panel">
    <!-- 粒子数量 -->
    <ControlSlider
      label="粒子数量"
      v-model="config.particleCount"
      :min="1000"
      :max="100000"
      :step="1000"
      @update:modelValue="$emit('update')"
    />

    <!-- 粒子大小 -->
    <ControlSlider
      label="粒子大小"
      v-model="config.particleSize"
      :min="0.1"
      :max="5"
      :step="0.1"
      :precision="2"
      @update:modelValue="$emit('update')"
    />

    <!-- 边界半径 -->
    <ControlSlider
      label="边界半径"
      v-model="config.boundsRadius"
      :min="10"
      :max="200"
      :step="5"
      @update:modelValue="$emit('update')"
    />

    <!-- 速度缩放 -->
    <ControlSlider
      label="速度缩放"
      v-model="config.velocityScale"
      :min="0.01"
      :max="0.5"
      :step="0.01"
      :precision="3"
      @update:modelValue="$emit('update')"
    />

    <!-- 最大速度 -->
    <ControlSlider
      label="最大速度"
      v-model="config.maxSpeed"
      :min="0.01"
      :max="1"
      :step="0.01"
      :precision="3"
      @update:modelValue="$emit('update')"
    />

    <!-- 速度影响大小开关 -->
    <ControlToggle
      label="速度影响大小"
      v-model="config.enableSpeedBasedSize"
      @update:modelValue="$emit('update')"
    />

    <!-- 速度影响因子 -->
    <ControlSlider
      v-if="config.enableSpeedBasedSize"
      label="速度影响因子"
      v-model="config.speedBasedSizeFactor"
      :min="0"
      :max="2"
      :step="0.1"
      :precision="2"
      @update:modelValue="$emit('update')"
    />

    <!-- 视差强度 -->
    <ControlSlider
      label="视差强度"
      v-model="config.parallaxStrength"
      :min="0"
      :max="2"
      :step="0.1"
      :precision="2"
      @update:modelValue="$emit('update')"
    />

    <!-- 雾效开关 -->
    <ControlToggle
      label="雾效"
      v-model="config.enableFog"
      @update:modelValue="$emit('update')"
    />

    <!-- 雾效浓度 -->
    <ControlSlider
      v-if="config.enableFog"
      label="雾效浓度"
      v-model="config.fogDensity"
      :min="0.001"
      :max="0.1"
      :step="0.001"
      :precision="3"
      @update:modelValue="$emit('update')"
    />

    <!-- 运动模式选择 -->
    <div class="control-group">
      <label class="control-label">
        <span class="label-text">运动模式</span>
        <span class="label-value">{{ getMotionModeName(motionMode) }}</span>
      </label>
      <div class="mode-buttons">
        <button
          v-for="mode in motionModes"
          :key="mode.value"
          :class="['mode-button', { active: motionMode === mode.value }]"
          @click="$emit('changeMotionMode', mode.value)"
          :title="mode.description"
        >
          {{ mode.name }}
        </button>
      </div>
    </div>

    <!-- 泛光效果 -->
    <ControlToggle
      label="泛光效果"
      v-model="bloomConfig.enabled"
      @update:modelValue="$emit('updateBloom')"
    />

    <template v-if="bloomConfig.enabled">
      <ControlSlider
        label="泛光强度"
        v-model="bloomConfig.strength"
        :min="0"
        :max="3"
        :step="0.1"
        :precision="2"
        @update:modelValue="$emit('updateBloom')"
      />

      <ControlSlider
        label="泛光半径"
        v-model="bloomConfig.radius"
        :min="0"
        :max="1"
        :step="0.05"
        :precision="2"
        @update:modelValue="$emit('updateBloom')"
      />

      <ControlSlider
        label="泛光阈值"
        v-model="bloomConfig.threshold"
        :min="0"
        :max="1"
        :step="0.05"
        :precision="2"
        @update:modelValue="$emit('updateBloom')"
      />
    </template>

    <!-- 发光粒子 -->
    <ControlToggle
      label="发光粒子"
      v-model="glowConfig.enabled"
      @update:modelValue="$emit('updateGlow')"
    />

    <ControlSlider
      v-if="glowConfig.enabled"
      label="发光强度"
      v-model="glowConfig.intensity"
      :min="0"
      :max="1"
      :step="0.05"
      :precision="2"
      @update:modelValue="$emit('updateGlow')"
    />

    <!-- 吸引子参数 -->
    <AttractorParams
      :motionMode="motionMode"
      :attractorConfig="attractorConfig"
      @update="$emit('updateAttractor', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MotionMode } from '../../modules/particles/MotionMode'
import ControlSlider from './ControlSlider.vue'
import ControlToggle from './ControlToggle.vue'
import AttractorParams from './AttractorParams.vue'

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
  config: ParticleConfig
  bloomConfig: BloomConfig
  glowConfig: GlowConfig
  attractorConfig: AttractorConfig
  motionMode: MotionMode
}

interface Emits {
  (e: 'update'): void
  (e: 'updateBloom'): void
  (e: 'updateGlow'): void
  (e: 'changeMotionMode', mode: MotionMode): void
  (e: 'updateAttractor', config: AttractorConfig): void
}

defineProps<Props>()
defineEmits<Emits>()

const motionModes = [
  { value: MotionMode.NOISE_FIELD, name: '噪声场', description: '基于噪声场的随机运动' },
  { value: MotionMode.LORENZ, name: 'Lorenz', description: 'Lorenz 吸引子（蝴蝶形状）' },
  { value: MotionMode.THOMAS, name: 'Thomas', description: 'Thomas 吸引子（三螺旋）' },
  { value: MotionMode.CLIFFORD, name: 'Clifford', description: 'Clifford 吸引子（复杂图案）' },
  { value: MotionMode.ROSSLER, name: 'Rossler', description: 'Rossler 吸引子（螺旋结构）' },
  { value: MotionMode.HYBRID, name: '混合', description: '噪声场与吸引子混合' }
]

const getMotionModeName = (mode: MotionMode): string => {
  const modeObj = motionModes.find(m => m.value === mode)
  return modeObj ? modeObj.name : mode
}
</script>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.control-group {
  margin-bottom: 0;
}

.control-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.label-text {
  letter-spacing: 0.2px;
}

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

.mode-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.mode-button {
  flex: 1;
  min-width: 80px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.1px;
}

.mode-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.mode-button.active {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.8) 0%,
    rgba(168, 85, 247, 0.8) 100%
  );
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  box-shadow:
    0 2px 8px rgba(99, 102, 241, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.2);
}

.mode-button:active {
  transform: translateY(0);
}
</style>