<template>
  <div class="control-group">
    <label class="control-label">
      <span class="label-text">{{ label }}</span>
      <span class="label-value">{{ displayValue }}</span>
    </label>
    <input
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      @input="handleInput"
      class="control-slider"
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  modelValue: number
  min: number
  max: number
  step: number
  precision?: number
}

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const props = withDefaults(defineProps<Props>(), {
  precision: 0
})

const emit = defineEmits<Emits>()

const displayValue = computed(() => {
  return props.modelValue.toFixed(props.precision)
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<style scoped>
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

.control-slider::-moz-range-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

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
</style>