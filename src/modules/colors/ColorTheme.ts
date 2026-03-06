/**
 * 颜色主题系统接口定义
 * 
 * 定义了颜色主题、颜色停止点、渐变类型和动画类型的核心接口。
 * 
 * @module colors/ColorTheme
 */

/**
 * 颜色停止点
 * 
 * 定义渐变中的一个颜色位置。
 * 
 * @interface ColorStop
 */
export interface ColorStop {
  /** RGB 颜色值，范围 [0, 1] */
  color: [number, number, number]
  /** 颜色在渐变中的位置，范围 [0, 1] */
  position: number
}

/**
 * 渐变类型
 * 
 * 定义如何将颜色应用到粒子上。
 * 
 * @type GradientType
 */
export type GradientType =
  | 'linear'    /** 线性渐变 - 基于索引的线性插值 */
  | 'radial'    /** 径向渐变 - 基于到中心的距离 */
  | 'random'    /** 随机分布 - 每个粒子随机分配颜色 */
  | 'speed'     /** 基于速度 - 根据粒子速度动态变化 */
  | 'position'  /** 基于位置 - 根据粒子在空间中的位置变化 */

/**
 * 动画类型
 * 
 * 定义颜色的动画效果。
 * 
 * @type AnimationType
 */
export type AnimationType =
  | 'none'      /** 无动画 - 颜色保持静态 */
  | 'cycle'     /** 循环动画 - 颜色随时间循环变化 */
  | 'pulse'     /** 脉冲动画 - 颜色随时间脉冲变化 */
  | 'wave'      /** 波浪动画 - 颜色随时间和位置波浪变化 */

/**
 * 颜色主题
 * 
 * 定义完整的颜色主题配置，包括颜色、渐变类型和动画类型。
 * 
 * @interface ColorTheme
 */
export interface ColorTheme {
  /** 主题名称 */
  name: string
  /** 主题描述 */
  description: string
  /** 颜色停止点数组 */
  colors: ColorStop[]
  /** 渐变类型 */
  gradientType: GradientType
  /** 动画类型（可选） */
  animationType?: AnimationType
  /** 动画速度（可选），范围 [0, 2] */
  animationSpeed?: number
}

/**
 * 颜色配置
 * 
 * 定义颜色管理器的配置参数。
 * 
 * @interface ColorConfig
 */
export interface ColorConfig {
  /** 当前颜色主题 */
  theme: ColorTheme
  /** 是否启用颜色动画 */
  enableAnimation: boolean
  /** 动画速度乘数 */
  animationSpeedMultiplier: number
}

/**
 * 默认颜色主题
 * 
 * 使用现有的 8 种颜色调色板作为默认主题。
 */
export const DefaultColorTheme: ColorTheme = {
  name: '默认',
  description: '经典的 8 色调色板',
  colors: [
    { color: [1.0, 0.2, 0.5], position: 0.0 }, // 粉色
    { color: [0.2, 0.8, 1.0], position: 0.14 }, // 蓝色
    { color: [1.0, 0.9, 0.2], position: 0.28 }, // 黄色
    { color: [0.3, 1.0, 0.5], position: 0.42 }, // 绿色
    { color: [0.9, 0.2, 1.0], position: 0.57 }, // 紫色
    { color: [1.0, 0.4, 0.1], position: 0.71 }, // 橙色
    { color: [0.1, 0.9, 0.9], position: 0.85 }, // 青色
    { color: [1.0, 1.0, 1.0], position: 1.0 }, // 白色
  ],
  gradientType: 'random',
  animationType: 'none'
}