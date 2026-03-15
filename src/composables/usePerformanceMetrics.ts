import { reactive } from 'vue'
import { ParticleComputeMode } from '../modules/AppManager'

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  status: 'good' | 'medium' | 'poor'
  statusText: string
  computeMode: ParticleComputeMode
  computeModeText: string
  memory: number
  memoryText: string
  gpuMemory: number
  gpuMemoryText: string
  drawCalls: number
  triangles: number
}

/**
 * 性能监控 Hook
 */
export function usePerformanceMetrics() {
  /**
   * 性能监控数据
   */
  const perfMetrics = reactive<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    status: 'good',
    statusText: '流畅',
    computeMode: ParticleComputeMode.CPU,
    computeModeText: 'CPU',
    memory: 0,
    memoryText: 'N/A',
    gpuMemory: 0,
    gpuMemoryText: 'N/A',
    drawCalls: 0,
    triangles: 0
  })

  /**
   * 更新性能指标
   */
  const updatePerfMetrics = (fps: number, frameTime: number): void => {
    perfMetrics.fps = fps
    perfMetrics.frameTime = frameTime

    // 更新状态
    if (fps >= 50) {
      perfMetrics.status = 'good'
      perfMetrics.statusText = '流畅'
    } else if (fps >= 30) {
      perfMetrics.status = 'medium'
      perfMetrics.statusText = '一般'
    } else {
      perfMetrics.status = 'poor'
      perfMetrics.statusText = '卡顿'
    }
  }

  /**
   * 更新高级性能指标
   */
  const updateAdvancedMetrics = (): void => {
    // 更新内存使用
    const perfMemory = (performance as any).memory
    if (perfMemory) {
      const memoryMB = Math.round(perfMemory.usedJSHeapSize / 1024 / 1024)
      perfMetrics.memory = memoryMB
      perfMetrics.memoryText = `${memoryMB} MB`
    } else {
      perfMetrics.memory = 0
      perfMetrics.memoryText = 'N/A'
    }

    // GPU 内存和渲染统计需要从 WebGL 上下文获取
    // 这里留空，具体实现需要在渲染器中添加相关 API
    perfMetrics.gpuMemory = 0
    perfMetrics.gpuMemoryText = 'N/A'
    perfMetrics.drawCalls = 0
    perfMetrics.triangles = 0
  }

  /**
   * 设置计算模式
   */
  const setComputeMode = (mode: ParticleComputeMode): void => {
    perfMetrics.computeMode = mode
    perfMetrics.computeModeText = mode === ParticleComputeMode.GPU ? 'GPU' : 'CPU'
  }

  return {
    perfMetrics,
    updatePerfMetrics,
    updateAdvancedMetrics,
    setComputeMode
  }
}