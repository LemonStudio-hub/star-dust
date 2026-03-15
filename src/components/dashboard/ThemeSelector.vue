<template>
  <div class="theme-section">
    <div class="theme-title">颜色主题</div>
    <div class="theme-grid">
      <button
        v-for="theme in themes"
        :key="theme.name"
        :class="['theme-button', { active: currentTheme.name === theme.name }]"
        @click="$emit('changeTheme', theme)"
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
</template>

<script setup lang="ts">
import type { ColorTheme } from '../../modules/colors/ColorTheme'

interface Props {
  themes: ColorTheme[]
  currentTheme: ColorTheme
}

interface Emits {
  (e: 'changeTheme', theme: ColorTheme): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
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

.theme-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
  letter-spacing: 0.3px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

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

.theme-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  text-align: center;
  letter-spacing: 0.2px;
}

@media (max-width: 480px) {
  .theme-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>