# 颜色主题控制面板集成说明

## 概述

`ColorThemePanel.vue` 是一个独立的颜色主题控制组件，提供以下功能：

- 颜色主题选择器（8 个预设主题）
- 动画速度控制
- 动画开关

## 集成方法

### 步骤 1：在 App.vue 中导入组件

在 `<script setup>` 部分添加：

```typescript
import ColorThemePanel from './components/ColorThemePanel.vue'
```

### 步骤 2：在仪表盘中添加组件

在仪表盘内容区域（最大速度控制组之后）添加：

```vue
<!-- 颜色主题控制 -->
<ColorThemePanel v-if="appManager" :appManager="appManager" />
```

### 步骤 3：更新重置按钮（可选）

如果需要在重置参数时也重置颜色主题，可以在 `resetConfig` 函数中添加：

```typescript
const resetConfig = (): void => {
  Object.assign(particleConfig, defaultConfig)
  updateParticleConfig()
  // 重置颜色配置
  if (appManager) {
    appManager.setColorAnimationEnabled(true)
    appManager.setColorAnimationSpeed(0.5)
  }
}
```

## 预设主题

1. **位置动态（PositionBased）** - 根据粒子位置动态着色，循环动画
2. **速度流（SpeedFlow）** - 根据粒子速度着色，脉冲动画
3. **冷色调（CoolTone）** - 蓝色、青色、紫色的清凉色彩，静态分布
4. **暖色调（WarmTone）** - 红色、橙色、黄色的温暖色彩，静态分布
5. **赛博朋克（CyberPunk）** - 粉红、青色、紫色的霓虹效果，循环动画
6. **彩虹（Rainbow）** - 红、橙、黄、绿、青、蓝、紫的七彩渐变，循环动画
7. **自然（Nature）** - 绿色、金色、棕色的大自然色彩，静态分布
8. **径向发光（RadialGlow）** - 从中心向外的渐变，径向动画

## Props

```typescript
interface Props {
  appManager: any // AppManager 实例
}
```

## 功能

### 选择主题

点击任意主题卡片即可切换到该主题。

### 调整动画速度

拖动动画速度滑块，范围 0-2。

### 启用/禁用动画

点击颜色动画开关，启用或禁用颜色动画。

## 样式

组件使用与主仪表盘一致的玻璃拟态风格，包括：

- 半透明背景
- 渐变按钮
- 柔和的动画效果
- 悬停状态反馈
- 激活状态高亮

## 注意事项

- 组件需要传入有效的 `appManager` 实例
- 确保在 appManager 初始化完成后才渲染组件
- 组件会自动调用 appManager 的颜色主题相关方法

## 主题详细说明

### 位置动态（PositionBased）

根据粒子在 3D 空间中的位置动态计算颜色：
- 使用位置坐标作为颜色输入
- 产生平滑的空间渐变效果
- 支持循环动画，颜色随时间变化

### 速度流（SpeedFlow）

根据粒子的运动速度动态着色：
- 快速粒子显示暖色调
- 慢速粒子显示冷色调
- 脉冲动画效果

### 冷色调（CoolTone）

蓝色、青色、紫色为主的清凉色彩：
- 适合表现冷静、科技感的视觉效果
- 静态分布，不随时间变化

### 暖色调（WarmTone）

红色、橙色、黄色为主的温暖色彩：
- 适合表现活力、热情的视觉效果
- 静态分布，不随时间变化

### 赛博朋克（CyberPunk）

粉红、青色、紫色的霓虹效果：
- 高对比度，强烈的视觉冲击
- 循环动画，颜色不断变化
- 适合表现未来主义风格

### 彩虹（Rainbow）

红、橙、黄、绿、青、蓝、紫的七彩渐变：
- 全光谱色彩覆盖
- 循环动画，彩虹效果
- 非常鲜艳和多彩

### 自然（Nature）

绿色、金色、棕色的大自然色彩：
- 适合表现自然、有机的视觉效果
- 静态分布，不随时间变化

### 径向发光（RadialGlow）

从中心向外的渐变效果：
- 中心区域明亮，边缘区域暗淡
- 径向动画，产生脉动效果
- 适合表现能量辐射效果

## 性能优化

- 颜色计算在 GPU 端完成（GPU 模式）
- 使用预计算的颜色映射表
- 批量更新颜色属性
- 条件更新，仅在必要时更新

## 自定义主题

可以通过创建新的主题类来添加自定义颜色主题：

```typescript
import { ColorTheme } from './ColorTheme'

export class CustomTheme implements ColorTheme {
  name = '自定义主题'
  description = '我的自定义颜色主题'
  colors = [
    { color: [1.0, 0.0, 0.0], position: 0.0 },   // 红色
    { color: [0.0, 1.0, 0.0], position: 0.5 },   // 绿色
    { color: [0.0, 0.0, 1.0], position: 1.0 }    // 蓝色
  ]
  
  // 可选：实现自定义颜色计算逻辑
  getColor(position: THREE.Vector3, time: number): THREE.Color {
    // 自定义颜色计算
    return new THREE.Color()
  }
}
```

然后在 `presets/index.ts` 中导出新主题即可。