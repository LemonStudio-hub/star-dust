<template>
  <div class="error-boundary">
    <slot v-if="!hasError" />
    <div v-else class="error-container">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">应用程序遇到错误</h2>
      <p class="error-message">{{ error.message }}</p>
      <div class="error-stack" v-if="showDetails">
        <pre>{{ error.stack }}</pre>
      </div>
      <div class="error-actions">
        <button class="error-button" @click="reload">重新加载</button>
        <button class="error-button secondary" @click="toggleDetails">
          {{ showDetails ? '隐藏详情' : '显示详情' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, type ErrorCaptured } from 'vue'

const hasError = ref(false)
const error = ref<Error>(new Error('未知错误'))
const showDetails = ref(false)

/**
 * 捕获子组件错误
 */
onErrorCaptured((err: unknown, instance, info) => {
  console.error('[ErrorBoundary] 捕获到错误:', err, info)
  
  hasError.value = true
  error.value = err instanceof Error ? err : new Error(String(err))
  
  // 阻止错误继续传播
  return false
})

/**
 * 重新加载页面
 */
const reload = () => {
  window.location.reload()
}

/**
 * 切换错误详情显示
 */
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #ffffff;
}

.error-message {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 24px;
  text-align: center;
  max-width: 600px;
}

.error-stack {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  max-width: 800px;
  max-height: 300px;
  overflow: auto;
}

.error-stack pre {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-actions {
  display: flex;
  gap: 12px;
}

.error-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.error-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.error-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error-button.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}
</style>