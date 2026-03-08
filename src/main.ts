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

// 全局未捕获错误监听
window.addEventListener('error', (event) => {
  console.error('[全局错误]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    timestamp: new Date().toISOString()
  })
})

// 全局未捕获的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('[未捕获的 Promise 拒绝]', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  })
  
  // 阻止默认的控制台输出
  event.preventDefault()
})

// 全局资源加载错误监听
window.addEventListener('error', (event) => {
  if (event.target && (event.target as HTMLElement).tagName) {
    console.error('[资源加载错误]', {
      element: (event.target as HTMLElement).tagName,
      source: (event.target as HTMLElement).getAttribute('src'),
      timestamp: new Date().toISOString()
    })
  }
}, true)

app.mount('#app')

console.log('[应用初始化] 错误处理系统已启动')
console.log('[应用初始化] 应用程序已挂载')