<template>
  <div class="color-theme-panel">
    <!-- 颜色主题选择 -->
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

    <!-- 自定义颜色编辑器 -->
    <div class="control-group">
      <label class="control-label">
        <span class="label-text">自定义颜色</span>
        <button class="action-button" @click="toggleColorEditor">
          {{ showColorEditor ? '收起' : '展开' }}
        </button>
      </label>
      <transition name="expand">
        <div v-if="showColorEditor" class="color-editor">
          <div class="color-stop-editor" v-for="(stop, index) in customColorStops" :key="index">
            <div class="color-stop-header">
              <span class="color-stop-index">{{ index + 1 }}</span>
              <button class="color-stop-remove" @click="removeColorStop(index)" v-if="customColorStops.length > 2">
                ×
              </button>
            </div>
            <div class="color-stop-controls">
              <input
                type="color"
                :value="rgbToHex(stop.color)"
                @input="updateColorStop(index, $event)"
                class="color-input"
              >
              <input
                type="range"
                :value="stop.position"
                @input="updateColorPosition(index, $event)"
                min="0"
                max="1"
                step="0.01"
                class="position-input"
              >
            </div>
          </div>
          <button class="add-color-stop" @click="addColorStop">
            + 添加颜色
          </button>
          <button class="apply-custom-theme" @click="applyCustomTheme">
            应用自定义主题
          </button>
        </div>
      </transition>
    </div>

    <!-- 动画速度 -->
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

    <!-- 颜色动画开关 -->
    <div class="control-group">
      <label class="control-label">
        <span class="label-text">颜色动画</span>
        <div class="toggle-switch" @click="toggleAnimation">
          <div class="toggle-slider" :class="{ active: animationEnabled }"></div>
        </div>
      </label>
    </div>

    <!-- 泛光效果控制 -->
    <div class="control-group">
      <label class="control-label">
        <span class="label-text">泛光效果</span>
        <div class="toggle-switch" @click="toggleBloom">
          <div class="toggle-slider" :class="{ active: bloomEnabled }"></div>
        </div>
      </label>
      <transition name="expand">
        <div v-if="bloomEnabled" class="bloom-controls">
          <!-- 泛光强度 -->
          <div class="bloom-control-item">
            <div class="bloom-control-label">
              <span class="bloom-label-text">强度</span>
              <span class="bloom-label-value">{{ bloomStrength.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              :value="bloomStrength"
              @input="updateBloomStrength"
              min="0"
              max="3"
              step="0.1"
              class="control-slider"
            >
          </div>
          <!-- 泛光半径 -->
          <div class="bloom-control-item">
            <div class="bloom-control-label">
              <span class="bloom-label-text">半径</span>
              <span class="bloom-label-value">{{ bloomRadius.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              :value="bloomRadius"
              @input="updateBloomRadius"
              min="0"
              max="1"
              step="0.05"
              class="control-slider"
            >
          </div>
          <!-- 泛光阈值 -->
          <div class="bloom-control-item">
            <div class="bloom-control-label">
              <span class="bloom-label-text">阈值</span>
              <span class="bloom-label-value">{{ bloomThreshold.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              :value="bloomThreshold"
              @input="updateBloomThreshold"
              min="0"
              max="1"
              step="0.05"
              class="control-slider"
            >
          </div>
        </div>
      </transition>
    </div>

    <!-- 配置导入/导出 -->
    <div class="control-group">
      <label class="control-label">
        <span class="label-text">配置管理</span>
      </label>
      <div class="config-actions">
        <button class="config-button" @click="exportConfig">
          📥 导出配置
        </button>
        <label class="config-button import-button">
          📤 导入配置
          <input
            type="file"
            accept=".json"
            @change="importConfig"
            class="config-file-input"
          >
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PRESET_THEMES, getPresetTheme } from '../modules/colors/presets'
import type { ColorTheme, ColorStop } from '../modules/colors/ColorTheme'

/**
 * AppManager 接口定义
 */
interface AppManager {
  setColorTheme(theme: ColorTheme): void
  setColorAnimationSpeedMultiplier(multiplier: number): void
  setColorAnimationEnabled(enabled: boolean): void
  setBloomConfig(config: { enabled?: boolean; strength?: number; radius?: number; threshold?: number }): void
  getBloomConfig(): { enabled: boolean; strength: number; radius: number; threshold: number }
  exportConfig(): string
  importConfig(configJson: string): boolean
}

interface Props {
  appManager: AppManager
}

const props = defineProps<Props>()

const currentThemeName = ref('默认')
const animationEnabled = ref(true)
const animationSpeed = ref(0.5)
const showColorEditor = ref(false)

// 泛光效果状态
const bloomEnabled = ref(true)
const bloomStrength = ref(1.5)
const bloomRadius = ref(0.4)
const bloomThreshold = ref(0.85)

const themes = PRESET_THEMES

// 自定义颜色主题
const customColorStops = ref<ColorStop[]>([
  { color: [1.0, 0.2, 0.5], position: 0.0 },
  { color: [0.2, 0.8, 1.0], position: 0.5 },
  { color: [0.9, 0.2, 1.0], position: 1.0 }
])

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

// 泛光效果控制方法
const toggleBloom = (): void => {
  bloomEnabled.value = !bloomEnabled.value
  if (props.appManager) {
    props.appManager.setBloomConfig({ enabled: bloomEnabled.value })
  }
}

const updateBloomStrength = (event: Event): void => {
  const target = event.target as HTMLInputElement
  bloomStrength.value = parseFloat(target.value)
  if (props.appManager) {
    props.appManager.setBloomConfig({ strength: bloomStrength.value })
  }
}

const updateBloomRadius = (event: Event): void => {
  const target = event.target as HTMLInputElement
  bloomRadius.value = parseFloat(target.value)
  if (props.appManager) {
    props.appManager.setBloomConfig({ radius: bloomRadius.value })
  }
}

const updateBloomThreshold = (event: Event): void => {
  const target = event.target as HTMLInputElement
  bloomThreshold.value = parseFloat(target.value)
  if (props.appManager) {
    props.appManager.setBloomConfig({ threshold: bloomThreshold.value })
  }
}

const toggleColorEditor = (): void => {
  showColorEditor.value = !showColorEditor.value
}

const addColorStop = (): void => {
  if (customColorStops.value.length < 10) {
    customColorStops.value.push({
      color: [1.0, 1.0, 1.0],
      position: 0.5
    })
  }
}

const removeColorStop = (index: number): void => {
  if (customColorStops.value.length > 2) {
    customColorStops.value.splice(index, 1)
  }
}

const updateColorStop = (index: number, event: Event): void => {
  const target = event.target as HTMLInputElement
  const hex = target.value
  const rgb = hexToRgb(hex)
  customColorStops.value[index].color = rgb
}

const updateColorPosition = (index: number, event: Event): void => {
  const target = event.target as HTMLInputElement
  customColorStops.value[index].position = parseFloat(target.value)
}

const applyCustomTheme = (): void => {
  const customTheme: ColorTheme = {
    name: '自定义',
    description: '用户自定义的颜色主题',
    colors: [...customColorStops.value],
    gradientType: 'linear',
    animationType: 'none'
  }
  
  if (props.appManager) {
    props.appManager.setColorTheme(customTheme)
    currentThemeName.value = '自定义'
  }
}

const exportConfig = (): void => {
  if (props.appManager) {
    const configJson = props.appManager.exportConfig()
    const blob = new Blob([configJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xingchen-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}

const importConfig = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files[0]
  
  if (file && props.appManager) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const configJson = e.target?.result as string
      const success = props.appManager.importConfig(configJson)
      if (success) {
        alert('配置导入成功！')
      } else {
        alert('配置导入失败，请检查文件格式。')
      }
    }
    reader.readAsText(file)
  }
  
  // 清空文件输入
  target.value = ''
}

const rgbToHex = (rgb: [number, number, number]): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [1, 1, 1]
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

.action-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
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

.color-editor {
  margin-top: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.color-stop-editor {
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.color-stop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.color-stop-index {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.color-stop-remove {
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 100, 100, 0.9);
  cursor: pointer;
  transition: all 0.3s ease;
}

.color-stop-remove:hover {
  background: rgba(255, 100, 100, 0.3);
  border-color: rgba(255, 100, 100, 0.5);
}

.color-stop-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-input {
  flex: 1;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.color-input:hover {
  border-color: rgba(255, 255, 255, 0.3);
}

.position-input {
  flex: 2;
}

.add-color-stop,
.apply-custom-theme {
  width: 100%;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(168, 85, 247, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 8px;
}

.add-color-stop:hover,
.apply-custom-theme:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.add-color-stop:active,
.apply-custom-theme:active {
  transform: translateY(0);
}

.config-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.config-button {
  flex: 1;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}

.config-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.config-button:active {
  transform: translateY(0);
}

.import-button {
  position: relative;
  overflow: hidden;
}

.config-file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
  opacity: 1;
}

.bloom-controls {
  margin-top: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.bloom-control-item {
  margin-bottom: 16px;
}

.bloom-control-item:last-child {
  margin-bottom: 0;
}

.bloom-control-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.bloom-label-text {
  letter-spacing: 0.2px;
}

.bloom-label-value {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.8) 0%, rgba(168, 85, 247, 0.8) 100%);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  min-width: 40px;
  text-align: center;
  font-feature-settings: 'tnum' 1;
}
</style>