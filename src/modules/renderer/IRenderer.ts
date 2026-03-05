/**
 * 渲染器接口
 * 
 * 定义了所有渲染器必须实现的基础接口。
 * 支持 WebGL 和 WebGPU 两种后端实现。
 * 
 * @module renderer/IRenderer
 */

import * as THREE from 'three'

/**
 * 渲染器接口
 * 
 * 所有渲染器实现（WebGLRenderer、WebGPURenderer）必须实现此接口。
 * 
 * @interface IRenderer
 */
export interface IRenderer {
  /** Three.js 渲染器实例（兼容性） */
  renderer: any
  
  /** Three.js 场景实例 */
  scene: THREE.Scene
  
  /** Three.js 相机实例 */
  camera: THREE.Camera
  
  /** 初始化渲染器 */
  init(): Promise<void>
  
  /**
   * 渲染场景
   * 
   * @param scene - 要渲染的场景
   * @param camera - 相机
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void
  
  /**
   * 调整渲染器大小
   * 
   * @param width - 新的宽度
   * @param height - 新的高度
   */
  resize(width: number, height: number): void
  
  /**
   * 释放渲染器资源
   */
  dispose(): void
  
  /**
   * 获取渲染器类型
   * 
   * @returns 'webgl' 或 'webgpu'
   */
  getType(): 'webgl' | 'webgpu'
  
  /**
   * 检查渲染器是否已初始化
   * 
   * @returns 是否已初始化
   */
  isInitialized(): boolean
}

/**
 * 渲染器配置接口
 * 
 * @interface RendererConfig
 */
export interface RendererConfig {
  /** Canvas 元素 */
  canvas: HTMLCanvasElement
  /** 画布宽度 */
  width: number
  /** 画布高度 */
  height: number
  /** 渲染器类型（可选，默认自动检测） */
  type?: 'webgl' | 'webgpu' | 'auto'
  /** 是否启用抗锯齿 */
  antialias?: boolean
  /** 是否启用透明背景 */
  alpha?: boolean
  /** 性能偏好 */
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}