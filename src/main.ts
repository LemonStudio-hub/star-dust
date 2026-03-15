import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// 添加全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue 全局错误]', {
    error: err,
    info: info,
    instance: instance,
    timestamp: new Date().toISOString()
  })
  
  // 在生产环境中，可以发送错误到监控服务
  if (process.env.NODE_ENV === 'production') {
    // TODO: 发送错误到监控服务（如 Sentry）
  }
}

// 添加全局警告处理器
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('[Vue 警告]', {
    message: msg,
    instance: instance,
    trace: trace,
    timestamp: new Date().toISOString()
  })
}

// 存储事件监听器引用，便于后续移除
const eventListeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = []

// 全局错误监听器（合并所有错误类型）
const handleGlobalError = (event: Event) => {
  const errorEvent = event as ErrorEvent
  
  // 检查是否是资源加载错误
  if (errorEvent.target && (errorEvent.target as HTMLElement).tagName) {
    console.error('[资源加载错误]', {
      element: (errorEvent.target as HTMLElement).tagName,
      source: (errorEvent.target as HTMLElement).getAttribute('src'),
      timestamp: new Date().toISOString()
    })
  } else {
    console.error('[全局错误]', {
      message: errorEvent.message,
      filename: errorEvent.filename,
      lineno: errorEvent.lineno,
      colno: errorEvent.colno,
      error: errorEvent.error,
      timestamp: new Date().toISOString()
    })
  }
}

// 全局未捕获的 Promise 拒绝监听器
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.error('[未捕获的 Promise 拒绝]', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  })
  
  // 阻止默认的控制台输出
  event.preventDefault()
}

// 注册全局事件监听器
window.addEventListener('error', handleGlobalError)
eventListeners.push({ target: window, type: 'error', listener: handleGlobalError })

// 使用类型断言来解决 TypeScript 类型限制
window.addEventListener('unhandledrejection', handleUnhandledRejection as EventListener)
eventListeners.push({ target: window, type: 'unhandledrejection', listener: handleUnhandledRejection as EventListener })

app.mount('#app')

console.log('[应用初始化] 错误处理系统已启动')
console.log('[应用初始化] 应用程序已挂载')

// 在应用卸载时清理事件监听器
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('[应用卸载] 清理事件监听器...')
    eventListeners.forEach(({ target, type, listener }) => {
      target.removeEventListener(type, listener)
    })
    console.log('[应用卸载] 事件监听器已清理')
  })
}