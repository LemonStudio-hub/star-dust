<template>
  <div class="attractor-params">
    <!-- Lorenz 吸引子参数 -->
    <template v-if="motionMode === MotionMode.LORENZ">
      <ControlSlider
        label="Lorenz Sigma (σ)"
        v-model="config.lorenz.sigma"
        :min="1"
        :max="20"
        :step="0.5"
        :precision="2"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="Lorenz Rho (ρ)"
        v-model="config.lorenz.rho"
        :min="10"
        :max="50"
        :step="1"
        :precision="2"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="Lorenz Beta (β)"
        v-model="config.lorenz.beta"
        :min="1"
        :max="5"
        :step="0.1"
        :precision="3"
        @update:modelValue="emitUpdate"
      />
    </template>

    <!-- Thomas 吸引子参数 -->
    <ControlSlider
      v-if="motionMode === MotionMode.THOMAS"
      label="Thomas B"
      v-model="config.thomas.b"
      :min="0.01"
      :max="0.5"
      :step="0.01"
      :precision="4"
      @update:modelValue="emitUpdate"
    />

    <!-- Clifford 吸引子参数 -->
    <template v-if="motionMode === MotionMode.CLIFFORD">
      <ControlSlider
        label="Clifford A"
        v-model="config.clifford.a"
        :min="0.5"
        :max="3"
        :step="0.1"
        :precision="2"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="Clifford B"
        v-model="config.clifford.b"
        :min="0.5"
        :max="3"
        :step="0.1"
        :precision="2"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="Clifford C"
        v-model="config.clifford.c"
        :min="0.01"
        :max="0.5"
        :step="0.01"
        :precision="3"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="Clifford D"
        v-model="config.clifford.d"
        :min="0.5"
        :max="3"
        :step="0.1"
        :precision="2"
        @update:modelValue="emitUpdate"
      />
    </template>

    <!-- Rossler 吸引子参数 -->
    <template v-if="motionMode === MotionMode.ROSSLER">
      <ControlSlider
        label="Rossler A"
        v-model="config.rossler.a"
        :min="0.01"
        :max="0.5"
        :step="0.01"
        :precision="3"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="Rossler B"
        v-model="config.rossler.b"
        :min="0.01"
        :max="0.5"
        :step="0.01"
        :precision="3"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="Rossler C"
        v-model="config.rossler.c"
        :min="1"
        :max="10"
        :step="0.5"
        :precision="2"
        @update:modelValue="emitUpdate"
      />
    </template>

    <!-- 时间和粒子缩放 -->
    <template v-if="motionMode !== MotionMode.NOISE_FIELD">
      <ControlSlider
        label="时间缩放"
        v-model="config.timeScale"
        :min="0.0001"
        :max="0.01"
        :step="0.0001"
        :precision="4"
        @update:modelValue="emitUpdate"
      />
      <ControlSlider
        label="粒子缩放"
        v-model="config.particleScale"
        :min="0.001"
        :max="0.1"
        :step="0.001"
        :precision="4"
        @update:modelValue="emitUpdate"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { MotionMode } from '../../modules/particles/MotionMode'
import ControlSlider from './ControlSlider.vue'

interface AttractorConfig {
  lorenz: { sigma: number; rho: number; beta: number }
  thomas: { b: number }
  clifford: { a: number; b: number; c: number; d: number }
  rossler: { a: number; b: number; c: number }
  timeScale: number
  particleScale: number
}

interface Props {
  motionMode: MotionMode
  attractorConfig: AttractorConfig
}

interface Emits {
  (e: 'update', config: AttractorConfig): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const config = props.attractorConfig

const emitUpdate = () => {
  emit('update', config)
}
</script>

<style scoped>
.attractor-params {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>