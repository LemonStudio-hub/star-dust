/**
 * 双缓冲管理器
 * 
 * 管理双缓冲机制的完整工作流程，包括缓冲区交换和同步。
 * 
 * @module core/DoubleBufferManager
 */

import { GPUParticleBuffer } from '../particles/GPUParticleBuffer'
import { ComputeShader } from '../particles/ComputeShader'

/**
 * 双缓冲管理器类
 * 
 * 协调计算着色器和渲染管线之间的数据流。
 * 
 * @class DoubleBufferManager
 */
export class DoubleBufferManager {
  /** GPU 设备 */
  private device: GPUDevice
  /** 粒子缓冲区 */
  private particleBuffer: GPUParticleBuffer
  /** 计算着色器 */
  private computeShader: ComputeShader
  /** 当前缓冲区索引 */
  private currentBufferIndex = 0
  /** 是否已释放 */
  private disposed = false

  /**
   * 构造函数，初始化双缓冲管理器
   * 
   * @param device - WebGPU 设备
   * @param particleBuffer - 粒子缓冲区（必须启用双缓冲）
   * @param computeShader - 计算着色器
   * 
   * @example
   * ```typescript
   * const particleBuffer = new GPUParticleBuffer(device, { 
   *   count: 30000, 
   *   particles, 
   *   doubleBuffer: true 
   * });
   * const computeShader = new ComputeShader(device, config);
   * const manager = new DoubleBufferManager(device, particleBuffer, computeShader);
   * ```
   */
  constructor(
    device: GPUDevice,
    particleBuffer: GPUParticleBuffer,
    computeShader: ComputeShader
  ) {
    this.device = device
    this.particleBuffer = particleBuffer
    this.computeShader = computeShader

    // 验证双缓冲已启用
    if (!particleBuffer['doubleBuffer']) {
      console.warn('粒子缓冲区未启用双缓冲，将使用单缓冲模式')
    }

    console.log('✓ 双缓冲管理器已创建')
  }

  /**
   * 执行一帧的计算和渲染流程
   * 
   * @param time - 当前时间
   * @param renderCallback - 渲染回调函数
   * @returns Promise，在渲染完成后解析
   */
  async executeFrame(time: number, renderCallback: (encoder: GPUCommandEncoder) => void): Promise<void> {
    if (this.disposed) {
      throw new Error('双缓冲管理器已释放')
    }

    // 创建命令编码器
    const encoder = this.device.createCommandEncoder()

    // 阶段 1: 计算着色器更新粒子
    this.computeShader.dispatch(encoder, time)

    // 阶段 2: 渲染（使用计算着色器的输出作为输入）
    renderCallback(encoder)

    // 提交命令
    const commandBuffer = encoder.finish()
    this.device.queue.submit([commandBuffer])

    // 等待 GPU 完成当前帧
    try {
      await this.device.queue.onSubmittedWorkDone()
    } catch (error) {
      console.warn('等待 GPU 完成失败:', error)
    }

    // 交换缓冲区
    this.swapBuffers()
  }

  /**
   * 交换缓冲区
   * 
   * @private
   */
  private swapBuffers(): void {
    // 交换粒子缓冲区
    this.particleBuffer.swapBuffers()
    
    // 更新索引
    this.currentBufferIndex = 1 - this.currentBufferIndex
  }

  /**
   * 获取当前输入缓冲区
   * 
   * @returns 输入缓冲区
   */
  getInputBuffer(): GPUBuffer {
    return this.particleBuffer.getInputBuffer()
  }

  /**
   * 获取当前输出缓冲区
   * 
   * @returns 输出缓冲区
   */
  getOutputBuffer(): GPUBuffer {
    return this.particleBuffer.getOutputBuffer()
  }

  /**
   * 获取当前缓冲区索引
   * 
   * @returns 当前缓冲区索引（0 或 1）
   */
  getCurrentBufferIndex(): number {
    return this.currentBufferIndex
  }

  /**
   * 更新计算着色器配置
   * 
   * @param config - 新的配置
   */
  updateComputeConfig(config: Partial<{
    velocityScale: number
    maxSpeed: number
    boundsRadius: number
    deltaTime: number
  }>): void {
    this.computeShader.updateConfig(config)
  }

  /**
   * 获取双缓冲状态信息
   * 
   * @returns 状态信息对象
   */
  getStatus(): {
    currentBufferIndex: number
    isDoubleBuffer: boolean
    particleCount: number
  } {
    return {
      currentBufferIndex: this.currentBufferIndex,
      isDoubleBuffer: this.particleBuffer['doubleBuffer'] || false,
      particleCount: this.particleBuffer.count
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    console.log('正在释放双缓冲管理器资源...')

    this.disposed = true
    console.log('✓ 双缓冲管理器资源已释放')
  }

  /**
   * 检查是否已释放
   * 
   * @returns 是否已释放
   */
  isDisposed(): boolean {
    return this.disposed
  }
}

/**
 * 创建双缓冲管理器工厂函数
 * 
 * @param device - WebGPU 设备
 * @param particleBuffer - 粒子缓冲区
 * @param computeConfig - 计算着色器配置
 * @returns 双缓冲管理器实例
 */
export async function createDoubleBufferManager(
  device: GPUDevice,
  particleBuffer: GPUParticleBuffer,
  computeConfig: {
    velocityScale: number
    maxSpeed: number
    boundsRadius: number
    deltaTime: number
  }
): Promise<DoubleBufferManager> {
  const computeShader = new ComputeShader(device, {
    particleBuffer,
    ...computeConfig
  })

  return new DoubleBufferManager(device, particleBuffer, computeShader)
}