/**
 * 交互系统模块
 * 
 * 处理用户的鼠标、触摸和手势交互。
 * 支持多种输入方式，实现流畅的视角控制。
 * 
 * @module interaction
 */

import * as THREE from 'three'
import Hammer from 'hammerjs'

/**
 * 鼠标交互处理器
 * 
 * 监听鼠标移动事件，将鼠标位置转换为旋转角度。
 * 
 * @class MouseInteraction
 */
export class MouseInteraction {
  /** 容器元素 */
  private container: HTMLElement
  /** 目标旋转角度 */
  private targetRotation: THREE.Vector2
  /** 旋转角度回调函数 */
  private callback: (x: number, y: number) => void

  /**
   * 构造函数，初始化鼠标交互
   * 
   * @param container - 容器元素
   * @param callback - 旋转角度变化时的回调函数
   * 
   * @example
   * ```typescript
   * const mouseInteraction = new MouseInteraction(container, (x, y) => {
   *   particleSystem.rotation.x = x;
   *   particleSystem.rotation.y = y;
   * });
   * ```
   */
  constructor(container: HTMLElement, callback: (x: number, y: number) => void) {
    this.container = container
    this.targetRotation = new THREE.Vector2()
    this.callback = callback
    this.setup()
  }

  /**
   * 设置事件监听器
   * 
   * @private
   */
  private setup(): void {
    this.container.addEventListener('mousemove', this.handleMouseMove)
  }

  /**
   * 处理鼠标移动事件
   * 
   * 将鼠标在容器中的位置转换为归一化坐标 [-1, 1]，
   * 然后映射到旋转角度 [-π/2, π/2]。
   * 只有当鼠标在容器内时才会触发。
   * 
   * @param event - 鼠标移动事件
   * @private
   */
  private handleMouseMove = (event: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect()
    
    // 归一化到 [-1, 1] 范围
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // 映射到旋转角度
    this.targetRotation.x = y * Math.PI * 0.5
    this.targetRotation.y = x * Math.PI * 0.5

    // 调用回调函数
    this.callback(this.targetRotation.x, this.targetRotation.y)
  }

  /**
   * 释放资源
   * 
   * 移除事件监听器。
   */
  dispose(): void {
    this.container.removeEventListener('mousemove', this.handleMouseMove)
  }
}

/**
 * 触摸交互处理器
 * 
 * 监听触摸移动事件，将触摸位置转换为旋转角度。
 * 
 * @class TouchInteraction
 */
export class TouchInteraction {
  /** 容器元素 */
  private container: HTMLElement
  /** 目标旋转角度 */
  private targetRotation: THREE.Vector2
  /** 旋转角度回调函数 */
  private callback: (x: number, y: number) => void

  /**
   * 构造函数，初始化触摸交互
   * 
   * @param container - 容器元素
   * @param callback - 旋转角度变化时的回调函数
   * 
   * @example
   * ```typescript
   * const touchInteraction = new TouchInteraction(container, (x, y) => {
   *   particleSystem.rotation.x = x;
   *   particleSystem.rotation.y = y;
   * });
   * ```
   */
  constructor(container: HTMLElement, callback: (x: number, y: number) => void) {
    this.container = container
    this.targetRotation = new THREE.Vector2()
    this.callback = callback
    this.setup()
  }

  /**
   * 设置事件监听器
   * 
   * @private
   */
  private setup(): void {
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: true })
  }

  /**
   * 处理触摸移动事件
   * 
   * 将触摸点在容器中的位置转换为归一化坐标 [-1, 1]，
   * 然后映射到旋转角度 [-π/2, π/2]。
   * 只有当触摸在容器内时才会触发。
   * 
   * @param event - 触摸移动事件
   * @private
   */
  private handleTouchMove = (event: TouchEvent): void => {
    // 检查是否有触摸点
    if (event.touches.length === 0) {
      return
    }

    const rect = this.container.getBoundingClientRect()
    const touch = event.touches[0]
    
    // 归一化到 [-1, 1] 范围
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1

    // 映射到旋转角度
    this.targetRotation.x = y * Math.PI * 0.5
    this.targetRotation.y = x * Math.PI * 0.5

    // 调用回调函数
    this.callback(this.targetRotation.x, this.targetRotation.y)
  }

  /**
   * 释放资源
   * 
   * 移除事件监听器。
   */
  dispose(): void {
    this.container.removeEventListener('touchmove', this.handleTouchMove)
  }
}

/**
 * 手势处理器
 * 
 * 使用 Hammer.js 库处理复杂的手势操作，
 * 包括拖拽（pan）和缩放（pinch）手势。
 * 
 * @class GestureHandler
 */
export class GestureHandler {
  /** Hammer.js 手势管理器 */
  private hammer: Hammer.Manager
  /** 目标旋转角度 */
  private targetRotation: THREE.Vector2
  /** 旋转回调函数 */
  private onRotateCallback: (x: number, y: number) => void
  /** 缩放回调函数 */
  private onScaleCallback: (scale: number) => void

  /**
   * 构造函数，初始化手势处理器
   * 
   * @param element - 目标元素
   * @param onRotate - 旋转手势回调
   * @param onScale - 缩放手势回调
   * 
   * @example
   * ```typescript
   * const gestureHandler = new GestureHandler(
   *   container,
   *   (x, y) => { /* 更新旋转 * / },
   *   (scale) => { /* 更新缩放 * / }
   * );
   * ```
   */
  constructor(
    element: HTMLElement,
    onRotate: (x: number, y: number) => void,
    onScale: (scale: number) => void
  ) {
    this.hammer = new Hammer.Manager(element)
    this.targetRotation = new THREE.Vector2()
    this.onRotateCallback = onRotate
    this.onScaleCallback = onScale
    this.setup()
  }

  /**
   * 设置手势识别器
   * 
   * 配置 pan（拖拽）和 pinch（缩放）手势。
   * 
   * @private
   */
  private setup(): void {
    // 创建手势识别器
    const pan = new Hammer.Pan()
    const pinch = new Hammer.Pinch()

    // 添加到管理器
    this.hammer.add(pan)
    this.hammer.add(pinch)

    let lastScale = 1

    // 处理拖拽手势
    this.hammer.on('pan', (e) => {
      const deltaX = e.deltaX * 0.005
      const deltaY = e.deltaY * 0.005

      this.targetRotation.y += deltaX
      this.targetRotation.x += deltaY

      this.onRotateCallback(this.targetRotation.x, this.targetRotation.y)
    })

    // 处理缩放手势
    this.hammer.on('pinch', (e) => {
      const scale = e.scale / lastScale
      lastScale = e.scale

      this.onScaleCallback(scale)
    })

    // 缩放结束时重置
    this.hammer.on('pinchend', () => {
      lastScale = 1
    })
  }

  /**
   * 释放资源
   * 
   * 销毁手势管理器。
   */
  dispose(): void {
    this.hammer.destroy()
  }
}