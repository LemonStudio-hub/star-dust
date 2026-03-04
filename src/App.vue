<template>
  <div ref="container" class="particle-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { AppManager } from './modules/AppManager'

/**
 * 容器元素引用
 * 用于获取 DOM 元素的尺寸和位置信息
 */
const container = ref<HTMLDivElement>()

/**
 * Canvas 元素引用
 * 用于 WebGL 渲染
 */
const canvas = ref<HTMLCanvasElement>()

/**
 * 应用管理器实例
 * 负责管理整个应用的生命周期和所有子系统
 */
let appManager: AppManager | null = null

/**
 * 组件挂载时的初始化
 * 
 * 创建并初始化应用管理器，启动 3D 粒子动画。
 */
onMounted(() => {
  if (!container.value || !canvas.value) {
    console.error('Container or canvas element not found')
    return
  }

  // 初始化应用配置
  const config = {
    particleCount: 30000,    // 粒子数量
    particleSize: 1.2,        // 粒子大小
    boundsRadius: 50,         // 边界半径
    velocityScale: 0.08,      // 速度缩放因子
    maxSpeed: 0.15            // 最大速度限制
  }

  // 创建并启动应用管理器
  appManager = new AppManager(container.value, canvas.value, config)
  console.log('Application initialized successfully')
})

/**
 * 组件卸载时的清理
 * 
 * 释放应用管理器的所有资源，防止内存泄漏。
 */
onUnmounted(() => {
  if (appManager) {
    console.log('Disposing application...')
    appManager.dispose()
    appManager = null
  }
})
</script>

<style scoped>
/**
 * 粒子容器样式
 * 
 * 使用 CSS 硬件加速优化渲染性能
 * 启用 GPU 加速和透视效果
 */
.particle-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  /* GPU 加速优化 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  
  /* 性能优化提示 */
  will-change: transform;
  
  /* 3D 透视设置 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000px;
  -webkit-perspective: 1000px;
}

/**
 * Canvas 元素样式
 * 
 * 确保 Canvas 正确填充容器并启用硬件加速
 */
canvas {
  display: block;
  width: 100%;
  height: 100%;
  
  /* GPU 加速优化 */
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  
  /* 性能优化提示 */
  will-change: transform;
  
  /* 3D 透视设置 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
</style>