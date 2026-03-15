/**
 * Hammer.js 类型定义
 * 用于手势识别库的类型安全
 */

declare module 'hammerjs' {
  export interface HammerInput {
    type: string
    center: {
      x: number
      y: number
    }
    deltaX: number
    deltaY: number
    velocityX: number
    velocityY: number
    direction: number
    scale: number
    rotation: number
  }

  export interface HammerListener {
    (event: HammerInput): void
  }

  export interface Manager {
    on(type: string, listener: HammerListener): void
    off(type: string, listener: HammerListener): void
    get(type: string): any
    set(options: object): void
    destroy(): void
  }

  export interface HammerStatic {
    (element: HTMLElement | SVGElement, options?: object): Manager
  }
}

declare const Hammer: Hammer.HammerStatic
export default Hammer