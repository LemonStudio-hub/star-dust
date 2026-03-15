export interface PerformanceMetrics {
  fps: number
  frameTime: number
  status: 'good' | 'medium' | 'poor'
  statusText: string
  computeMode: 'CPU' | 'GPU'
  computeModeText: string
  memory: number
  memoryText: string
  gpuMemory: number
  gpuMemoryText: string
  drawCalls: number
  triangles: number
}