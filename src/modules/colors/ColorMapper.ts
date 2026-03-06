/**
 * 颜色映射器
 * 
 * 根据粒子的属性（速度、位置、生命周期）动态计算颜色
 * 
 * @module colors/ColorMapper
 */

import * as THREE from 'three'
import { ColorStop, ColorTheme } from './ColorTheme'

/**
 * 颜色映射类型
 */
export type ColorMappingType = 'speed' | 'position' | 'lifetime'

/**
 * 颜色映射器类
 * 
 * 根据不同的映射规则动态计算粒子颜色
 */
export class ColorMapper {
  /** 映射类型 */
  private mappingType: ColorMappingType
  /** 颜色主题 */
  private theme: ColorTheme
  /** 边界半径（用于位置映射） */
  private boundsRadius: number
  /** 最大速度（用于速度映射） */
  private maxSpeed: number
  /** 最大生命周期（用于生命周期映射） */
  private maxLifetime: number

  constructor(
    mappingType: ColorMappingType,
    theme: ColorTheme,
    boundsRadius: number,
    maxSpeed: number,
    maxLifetime: number = 1000
  ) {
    this.mappingType = mappingType
    this.theme = theme
    this.boundsRadius = boundsRadius
    this.maxSpeed = maxSpeed
    this.maxLifetime = maxLifetime
  }

  /**
   * 根据速度映射颜色
   * 
   * 粒子速度越快，颜色越接近主题中位置较高的颜色
   * 
   * @param velocity - 粒子速度向量
   * @returns RGB 颜色值 [0-1]
   */
  mapBySpeed(velocity: THREE.Vector3): [number, number, number] {
    const speed = velocity.length()
    const t = Math.min(speed / this.maxSpeed, 1.0)
    return this.interpolateColor(t)
  }

  /**
   * 根据位置映射颜色
   * 
   * 粒子距离中心越远，颜色越接近主题中位置较高的颜色
   * 
   * @param position - 粒子位置向量
   * @returns RGB 颜色值 [0-1]
   */
  mapByPosition(position: THREE.Vector3): [number, number, number] {
    const distance = position.length()
    const t = Math.min(distance / this.boundsRadius, 1.0)
    return this.interpolateColor(t)
  }

  /**
   * 根据生命周期映射颜色
   * 
   * 粒子生命周期越接近结束，颜色越接近主题中位置较高的颜色
   * 
   * @param lifetime - 粒子当前生命周期
   * @returns RGB 颜色值 [0-1]
   */
  mapByLifetime(lifetime: number): [number, number, number] {
    const t = Math.min(lifetime / this.maxLifetime, 1.0)
    return this.interpolateColor(t)
  }

  /**
   * 根据速度和位置混合映射颜色
   * 
   * 综合考虑速度和位置，计算混合后的颜色
   * 
   * @param velocity - 粒子速度向量
   * @param position - 粒子位置向量
   * @param speedWeight - 速度映射权重 [0-1]
   * @returns RGB 颜色值 [0-1]
   */
  mapBySpeedAndPosition(
    velocity: THREE.Vector3,
    position: THREE.Vector3,
    speedWeight: number = 0.5
  ): [number, number, number] {
    const speedColor = this.mapBySpeed(velocity)
    const positionColor = this.mapByPosition(position)

    // 混合两种颜色
    return [
      speedColor[0] * speedWeight + positionColor[0] * (1 - speedWeight),
      speedColor[1] * speedWeight + positionColor[1] * (1 - speedWeight),
      speedColor[2] * speedWeight + positionColor[2] * (1 - speedWeight)
    ]
  }

  /**
   * 插值颜色
   * 
   * 根据给定的 t 值（0-1）在主题的颜色停止点之间插值
   * 
   * @param t - 插值参数 [0-1]
   * @returns RGB 颜色值 [0-1]
   * @private
   */
  private interpolateColor(t: number): [number, number, number] {
    const colors = this.theme.colors
    
    // 如果只有一个颜色停止点，直接返回
    if (colors.length === 1) {
      return [...colors[0].color]
    }

    // 找到 t 所在的区间
    let startStop = colors[0]
    let endStop = colors[colors.length - 1]

    for (let i = 0; i < colors.length - 1; i++) {
      if (t >= colors[i].position && t <= colors[i + 1].position) {
        startStop = colors[i]
        endStop = colors[i + 1]
        break
      }
    }

    // 计算插值参数
    const range = endStop.position - startStop.position
    const normalizedT = range > 0 ? (t - startStop.position) / range : 0

    // 线性插值
    return [
      this.lerp(startStop.color[0], endStop.color[0], normalizedT),
      this.lerp(startStop.color[1], endStop.color[1], normalizedT),
      this.lerp(startStop.color[2], endStop.color[2], normalizedT)
    ]
  }

  /**
   * 线性插值
   * 
   * @param a - 起始值
   * @param b - 结束值
   * @param t - 插值参数 [0-1]
   * @returns 插值结果
   * @private
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * 设置最大速度
   * 
   * @param maxSpeed - 新的最大速度
   */
  setMaxSpeed(maxSpeed: number): void {
    this.maxSpeed = maxSpeed
  }

  /**
   * 设置边界半径
   * 
   * @param boundsRadius - 新的边界半径
   */
  setBoundsRadius(boundsRadius: number): void {
    this.boundsRadius = boundsRadius
  }

  /**
   * 设置最大生命周期
   * 
   * @param maxLifetime - 新的最大生命周期
   */
  setMaxLifetime(maxLifetime: number): void {
    this.maxLifetime = maxLifetime
  }

  /**
   * 获取映射类型
   * 
   * @returns 当前映射类型
   */
  getMappingType(): ColorMappingType {
    return this.mappingType
  }

  /**
   * 设置映射类型
   * 
   * @param mappingType - 新的映射类型
   */
  setMappingType(mappingType: ColorMappingType): void {
    this.mappingType = mappingType
  }
}