import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// 添加全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue 应用错误:', err)
  console.error('错误信息:', info)
  console.error('组件实例:', instance)
  
  // 在生产环境中，可以发送错误到监控服务
  if (process.env.NODE_ENV === 'production') {
    // TODO: 发送错误到监控服务（如 Sentry）
  }
}

// 添加全局警告处理器
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue 警告:', msg)
  if (trace) {
    console.warn('组件追踪:', trace)
  }
}

app.mount('#app')