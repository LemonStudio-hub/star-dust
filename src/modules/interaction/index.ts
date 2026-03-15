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
 * 监听鼠标移动事件，将鼠标移动转换为旋转增量。
 *
 * @class MouseInteraction
 */
export class MouseInteraction {
  /** 容器元素 */
  private container: HTMLElement
  /** 上一次的鼠标位置 */
  private lastPosition: { x: number; y: number } | null = null
  /** 旋转角度回调函数 */
  private callback: (x: number, y: number) => void
  /** 移动灵敏度 */
  private sensitivity: number = 0.005

  /**
   * 构造函数，初始化鼠标交互
   *
   * @param container - 容器元素
   * @param callback - 旋转角度变化时的回调函数
   *
   * @example
   * ```typescript
   * const mouseInteraction = new MouseInteraction(container, (x, y) => {
   *   particleSystem.rotation.x += x;
   *   particleSystem.rotation.y += y;
   * });
   * ```
   */
  constructor(container: HTMLElement, callback: (x: number, y: number) => void) {
    this.container = container
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
   * 计算鼠标移动的增量，并将增量作为旋转角度传递给回调函数。
   * 这样可以实现平滑的旋转效果，而不是根据绝对位置跳转。
   *
   * @param event - 鼠标移动事件
   * @private
   */
  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.lastPosition) {
      this.lastPosition = { x: event.clientX, y: event.clientY }
      return
    }

    // 计算移动增量
    const deltaX = event.clientX - this.lastPosition.x
    const deltaY = event.clientY - this.lastPosition.y

    // 更新上一次的位置
    this.lastPosition = { x: event.clientX, y: event.clientY }

    // 将增量转换为旋转角度（Y 轴移动影响 X 轴旋转，X 轴移动影响 Y 轴旋转）
    const rotationDeltaX = deltaY * this.sensitivity
    const rotationDeltaY = deltaX * this.sensitivity

    // 调用回调函数传递旋转增量
    this.callback(rotationDeltaX, rotationDeltaY)
  }

  /**
   * 释放资源
   *
   * 移除事件监听器。
   */
  dispose(): void {
    this.container.removeEventListener('mousemove', this.handleMouseMove)
    this.lastPosition = null
  }
}

/**
 * 触摸交互处理器
 *
 * 监听触摸移动事件，将触摸移动转换为旋转增量。
 *
 * @class TouchInteraction
 */
export class TouchInteraction {
  /** 容器元素 */
  private container: HTMLElement
  /** 上一次的触摸位置 */
  private lastPosition: { x: number; y: number } | null = null
  /** 旋转角度回调函数 */
  private callback: (x: number, y: number) => void
  /** 移动灵敏度 */
  private sensitivity: number = 0.005

  /**
   * 构造函数，初始化触摸交互
   *
   * @param container - 容器元素
   * @param callback - 旋转角度变化时的回调函数
   *
   * @example
   * ```typescript
   * const touchInteraction = new TouchInteraction(container, (x, y) => {
   *   particleSystem.rotation.x += x;
   *   particleSystem.rotation.y += y;
   * });
   * ```
   */
  constructor(container: HTMLElement, callback: (x: number, y: number) => void) {
    this.container = container
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
    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    this.container.addEventListener('touchend', this.handleTouchEnd, { passive: true })
  }

  /**
   * 处理触摸开始事件
   *
   * @param event - 触摸事件
   * @private
   */
  private handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      this.lastPosition = { x: touch.clientX, y: touch.clientY }
    }
  }

  /**
   * 处理触摸结束事件
   *
   * @param event - 触摸事件
   * @private
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    if (event.touches.length === 0) {
      this.lastPosition = null
    }
  }

  /**
   * 处理触摸移动事件
   *
   * 计算触摸移动的增量，并将增量作为旋转角度传递给回调函数。
   * 只有单指滑动时才会触发旋转，多指手势由 GestureHandler 处理。
   *
   * @param event - 触摸移动事件
   * @private
   */
  private handleTouchMove = (event: TouchEvent): void => {
    // 只处理单指滑动
    if (event.touches.length !== 1 || !this.lastPosition) {
      return
    }

    const touch = event.touches[0]

    // 计算移动增量
    const deltaX = touch.clientX - this.lastPosition.x
    const deltaY = touch.clientY - this.lastPosition.y

    // 更新上一次的位置
    this.lastPosition = { x: touch.clientX, y: touch.clientY }

    // 将增量转换为旋转角度（Y 轴移动影响 X 轴旋转，X 轴移动影响 Y 轴旋转）
    const rotationDeltaX = deltaY * this.sensitivity
    const rotationDeltaY = deltaX * this.sensitivity

    // 调用回调函数传递旋转增量
    this.callback(rotationDeltaX, rotationDeltaY)
  }

  /**
   * 释放资源
   *
   * 移除事件监听器。
   */
  dispose(): void {
    this.container.removeEventListener('touchmove', this.handleTouchMove)
    this.container.removeEventListener('touchstart', this.handleTouchStart)
    this.container.removeEventListener('touchend', this.handleTouchEnd)
    this.lastPosition = null
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
  private hammer!: Hammer.Manager
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
    const pan = new (Hammer as any).Pan()
    const pinch = new (Hammer as any).Pinch()

    // 添加到管理器
    this.hammer.add(pan)
    this.hammer.add(pinch)

    let lastScale = 1

    // 处理拖拽手势
    this.hammer.on('pan', (e: any) => {
      const deltaX = e.deltaX * 0.005
      const deltaY = e.deltaY * 0.005

      this.targetRotation.y += deltaX
      this.targetRotation.x += deltaY

      this.onRotateCallback(this.targetRotation.x, this.targetRotation.y)
    })

    // 处理缩放手势
    this.hammer.on('pinch', (e: any) => {
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