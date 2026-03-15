<template>
  <div class="control-group">
    <label class="control-label">
      <span class="label-text">{{ label }}</span>
      <span class="label-value">{{ modelValue ? '开启' : '关闭' }}</span>
    </label>
    <div class="toggle-switch">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="handleChange"
        class="toggle-checkbox"
      >
      <span class="toggle-slider"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
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

.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
}

.toggle-checkbox {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-checkbox:checked + .toggle-slider {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.8) 0%,
    rgba(168, 85, 247, 0.8) 100%
  );
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(24px);
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.toggle-checkbox:hover + .toggle-slider {
  background: rgba(255, 255, 255, 0.25);
}

.toggle-checkbox:checked:hover + .toggle-slider {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.9) 0%,
    rgba(168, 85, 247, 0.9) 100%
  );
}
</style>