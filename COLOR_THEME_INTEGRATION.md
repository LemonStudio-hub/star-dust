# 颜色主题控制面板集成说明

## 概述

`ColorThemePanel.vue` 是一个独立的颜色主题控制组件，提供以下功能：

- 颜色主题选择器（5 个预设主题）
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

1. **赛博朋克** - 粉红、青色、紫色的霓虹效果，循环动画
2. **自然** - 绿色、金色、棕色的大自然色彩，静态分布
3. **冷色调** - 蓝色、青色、紫色的清凉色彩，脉冲动画
4. **暖色调** - 红色、橙色、黄色的温暖色彩，波浪动画
5. **彩虹** - 红、橙、黄、绿、青、蓝、紫的七彩渐变，循环动画

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