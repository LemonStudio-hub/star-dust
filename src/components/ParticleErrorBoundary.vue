<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 class="error-title">粒子系统错误</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <button class="retry-button" @click="handleRetry">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          重试
        </button>
        <button class="report-button" @click="handleReport">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          报告错误
        </button>
      </div>
      <details class="error-details">
        <summary>错误详情</summary>
        <pre class="error-stack">{{ errorStack }}</pre>
      </details>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const errorMessage = ref('')
const errorStack = ref('')

const emit = defineEmits<{
  (e: 'error', error: Error): void
}>()

onErrorCaptured((error: Error) => {
  console.error('[ParticleErrorBoundary] 捕获到错误:', error)
  hasError.value = true
  errorMessage.value = error.message || '未知错误'
  errorStack.value = error.stack || '无堆栈信息'
  emit('error', error)
  return false
})

const handleRetry = () => {
  hasError.value = false
  errorMessage.value = ''
  errorStack.value = ''
  window.location.reload()
}

const handleReport = () => {
  const errorReport = {
    message: errorMessage.value,
    stack: errorStack.value,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(errorReport, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `error-report-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  z-index: 10000;
}

.error-content {
  text-align: center;
  color: #ffffff;
  max-width: 500px;
  padding: 40px;
}

.error-icon {
  margin-bottom: 24px;
  color: #ef4444;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #ffffff;
}

.error-message {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 32px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.retry-button,
.report-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.retry-button {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #ffffff;
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.report-button {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.report-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.error-details {
  text-align: left;
  margin-top: 24px;
}

.error-details summary {
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.error-details summary:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
}

.error-stack {
  margin-top: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.error-stack::-webkit-scrollbar {
  width: 6px;
}

.error-stack::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.error-stack::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.error-stack::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>