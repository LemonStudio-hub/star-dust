<template>
  <div class="color-theme-panel">
    <div class="control-group">
      <label class="control-label">
        <span class="label-text">颜色主题</span>
        <span class="label-value">{{ currentThemeName }}</span>
      </label>
      <div class="theme-selector">
        <div
          v-for="theme in themes"
          :key="theme.name"
          class="theme-card"
          :class="{ active: currentThemeName === theme.name }"
          @click="selectTheme(theme.name)"
        >
          <div class="theme-preview">
            <div
              v-for="(stop, index) in theme.colors"
              :key="index"
              class="color-stop"
              :style="{
                background: 'rgb(' + stop.color[0] * 255 + ',' + stop.color[1] * 255 + ',' + stop.color[2] * 255 + ')',
                left: stop.position * 100 + '%'
              }"
            ></div>
          </div>
          <div class="theme-name">{{ theme.name }}</div>
          <div class="theme-animation" v-if="theme.animationType !== 'none'">
            <span class="animation-icon">🎬</span>
          </div>
        </div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">
        <span class="label-text">动画速度</span>
        <span class="label-value">{{ animationSpeed.toFixed(2) }}</span>
      </label>
      <input
        type="range"
        :value="animationSpeed"
        @input="updateAnimationSpeed"
        min="0"
        max="2"
        step="0.1"
        class="control-slider"
      >
    </div>

    <div class="control-group">
      <label class="control-label">
        <span class="label-text">颜色动画</span>
        <div class="toggle-switch" @click="toggleAnimation">
          <div class="toggle-slider" :class="{ active: animationEnabled }"></div>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PRESET_THEMES, getPresetTheme } from '../modules/colors/presets'
import type { ColorTheme } from '../modules/colors/ColorTheme'

interface Props {
  appManager: any
}

const props = defineProps<Props>()

const currentThemeName = ref('默认')
const animationEnabled = ref(true)
const animationSpeed = ref(0.5)

const themes = PRESET_THEMES

const selectTheme = (themeName: string): void => {
  const theme = getPresetTheme(themeName)
  if (theme && props.appManager) {
    props.appManager.setColorTheme(theme)
    currentThemeName.value = themeName
  }
}

const updateAnimationSpeed = (event: Event): void => {
  const target = event.target as HTMLInputElement
  animationSpeed.value = parseFloat(target.value)
  if (props.appManager) {
    props.appManager.setColorAnimationSpeed(animationSpeed.value)
  }
}

const toggleAnimation = (): void => {
  animationEnabled.value = !animationEnabled.value
  if (props.appManager) {
    props.appManager.setColorAnimationEnabled(animationEnabled.value)
  }
}
</script>

<style scoped>
.control-group {
  margin-bottom: 28px;
}

.control-group:last-child {
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(255, 255, 255, 0.1);
  margin-top: -7px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.control-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 6px rgba(255, 255, 255, 0.15);
}

.control-slider::-webkit-slider-thumb:active {
  transform: scale(0.95);
}

.theme-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.theme-card {
  position: relative;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  aspect-ratio: 1;
}

.theme-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.theme-card.active {
  border-color: rgba(99, 102, 241, 0.8);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

.theme-preview {
  position: relative;
  width: 100%;
  height: 60%;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1));
}

.color-stop {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  height: 100%;
  transform: translateX(-50%);
  border-radius: 4px;
}

.theme-name {
  padding: 6px 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-animation {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.animation-icon {
  display: block;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.toggle-switch:hover {
  background: rgba(255, 255, 255, 0.15);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-slider.active {
  left: 22px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}
</style>