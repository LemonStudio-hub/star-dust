# Xingchen (星辰) - 3D 粒子动画系统

一个基于 Vue 3、Three.js 和 FBM 噪声算法的交互式 3D 粒子动画系统。粒子在 3D 空间中根据预计算的噪声场产生有机的流动效果，支持多种交互方式。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Vue](https://img.shields.io/badge/Vue-3.4.0-brightgreen)
![Three.js](https://img.shields.io/badge/Three.js-0.160.0-orange)

## ✨ 特性

- 🌟 **30,000 个粒子** - 高性能粒子系统
- 🎨 **动态颜色** - 8 种调色板随机分配
- 🌊 **FBM 噪声场** - 分形布朗运动算法产生自然流动
- 🔮 **Curl 旋度场** - 无散度的流体运动模拟
- 🎯 **多种交互** - 鼠标、触摸、手势支持
- ⚡ **性能优化** - 预计算噪声纹理，GPU 加速
- 🎬 **电影级渲染** - ACES Filmic 色调映射
- 📱 **响应式设计** - 自适应窗口大小

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:5173` 查看效果。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

## 📁 项目结构

```
xingchen/
├── src/
│   ├── modules/              # 核心模块
│   │   ├── noise/            # 噪声算法模块
│   │   │   ├── SimplexNoise.ts
│   │   │   ├── FBMNoise.ts
│   │   │   └── NoiseTexture.ts
│   │   ├── particles/        # 粒子系统模块
│   │   │   └── ParticleSystem.ts
│   │   ├── interaction/      # 交互系统模块
│   │   │   └── index.ts
│   │   ├── renderer/         # 渲染系统模块
│   │   │   └── Renderer.ts
│   │   └── AppManager.ts     # 应用管理器
│   ├── App.vue               # 主组件
│   ├── main.ts               # 应用入口
│   └── style.css             # 全局样式
├── public/                   # 静态资源
├── dist/                     # 构建输出（git ignore）
├── index.html                # HTML 入口
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
└── README.md                 # 项目文档
```

## 🏗️ 技术架构

### 核心技术栈

- **Vue 3.4.0** - 前端框架，使用 Composition API
- **Three.js 0.160.0** - 3D 渲染引擎
- **Vite 5.0.0** - 构建工具和开发服务器
- **TypeScript 5.3.0** - 类型安全的开发体验
- **Hammer.js 2.0.8** - 手势识别库

### 模块化架构

项目采用高度模块化的架构设计，各模块职责清晰：

#### 1. 噪声算法模块 (`modules/noise/`)

- **SimplexNoise** - 经典的 Simplex 噪声算法实现
- **FBMNoise** - 分形布朗运动噪声，通过叠加多层噪声创建复杂纹理
- **NoiseTexture** - 预计算 3D 噪声纹理，提供高效的采样接口

#### 2. 粒子系统模块 (`modules/particles/`)

- **ParticleSystem** - 管理粒子的创建、更新和渲染
- 粒子在 3D 空间中根据噪声场运动
- 边界检测和重置机制

#### 3. 交互系统模块 (`modules/interaction/`)

- **MouseInteraction** - 鼠标交互处理
- **TouchInteraction** - 触摸交互处理
- **GestureHandler** - 手势识别（拖拽、缩放）

#### 4. 渲染系统模块 (`modules/renderer/`)

- **Renderer** - WebGL 渲染器管理
- 相机控制、场景管理、光照设置
- 渲染优化和配置

#### 5. 应用管理器 (`modules/AppManager.ts`)

- 协调所有子系统
- 管理应用生命周期
- 主渲染循环控制

## 🎨 算法原理

### FBM 噪声场

分形布朗运动（Fractal Brownian Motion）通过叠加多个不同频率和振幅的噪声层来创建复杂的纹理效果。

**算法公式**：
```
FBM(x, y, z) = Σ (fⁱ * pⁱ * noise(x * lⁱ, y * lⁱ, z * lⁱ)) / Σ (fⁱ * pⁱ)
```

其中：
- `f` - 持续度（persistence），控制振幅衰减
- `p` - 间隙度（lacunarity），控制频率增长
- `i` - 倍频程索引

### Curl 旋度场

Curl 旋度场产生无散度的向量场，适合模拟流体运动。

**计算公式**：
```
Curl(F) = (∂Fz/∂y - ∂Fy/∂z, ∂Fx/∂z - ∂Fz/∂x, ∂Fy/∂x - ∂Fx/∂y)
```

### 预计算优化

为避免运行时的重复噪声计算，系统在初始化时预计算 64³ 的噪声纹理：
- 计算三个独立的 FBM 噪声场
- 使用有限差分法计算 Curl 旋度场
- 存储为紧凑的 Float32Array

**性能提升**：预计算使运行时性能提升约 10 倍。

## 🎮 交互方式

### 鼠标交互

- 移动鼠标：旋转粒子系统视角
- 旋转范围：[-90°, 90°]

### 触摸交互

- 单指滑动：旋转视角
- 双指捏合：缩放粒子系统

### 手势交互

- Pan（拖拽）：旋转视角
- Pinch（缩放）：调整粒子大小

## ⚙️ 配置参数

### 粒子系统配置

```typescript
interface ParticleConfig {
  count: number          // 粒子数量，默认 30000
  size: number           // 粒子大小，默认 1.2
  boundsRadius: number   // 边界半径，默认 50
  velocityScale: number  // 速度缩放因子，默认 0.08
  maxSpeed: number       // 最大速度限制，默认 0.15
}
```

### 渲染器配置

```typescript
interface RendererConfig {
  canvas: HTMLCanvasElement
  width: number
  height: number
}
```

### FBM 噪声配置

```typescript
{
  octaves: 6,           // 倍频程数量
  persistence: 0.65,    // 持续度（振幅衰减）
  lacunarity: 2.5       // 间隙度（频率增长）
}
```

### 噪声纹理配置

```typescript
{
  size: 64,              // 纹理尺寸（64³ 体素）
  scale: 0.008,          // 空间缩放因子
  timeScale: 0.0001      // 时间缩放因子
}
```

## 🔧 性能优化

### 已实现的优化

1. **预计算噪声纹理** - 避免运行时重复计算
2. **GPU 加速** - CSS 硬件加速优化
3. **高效数据结构** - 使用 Float32Array 存储粒子数据
4. **条件渲染** - 仅更新变化的属性
5. **像素比限制** - 限制最大像素比为 3
6. **对数深度缓冲** - 提高深度精度

### 性能指标

- **初始化时间**：~300-500ms（噪声预计算）
- **帧率**：60 FPS（30,000 粒子）
- **内存占用**：~50-100 MB
- **CPU 使用率**：~30-50%（单核）

## 📝 代码规范

### TypeScript 规范

- 使用 TypeScript 进行类型检查
- 所有公共 API 都有完整的类型定义
- 使用 JSDoc 注释提供文档

### 命名规范

- **类名**：PascalCase（如 `SimplexNoise`）
- **函数/方法**：camelCase（如 `updateParticles`）
- **常量**：UPPER_SNAKE_CASE（如 `PARTICLE_COUNT`）
- **私有成员**：使用 `private` 关键字

### 注释规范

- **模块注释**：描述模块的职责和功能
- **类注释**：描述类的用途和主要功能
- **方法注释**：包含参数说明、返回值和使用示例
- **行内注释**：解释复杂的算法逻辑

### 示例

```typescript
/**
 * 粒子系统类
 * 
 * 负责管理所有粒子的创建、更新和渲染。
 * 
 * @class ParticleSystem
 */
export class ParticleSystem {
  /**
   * 更新粒子系统
   * 
   * @param time - 当前时间，用于噪声采样
   * @example
   * ```typescript
   * particleSystem.update(currentTime);
   * ```
   */
  update(time: number): void {
    // 实现代码...
  }
}
```

## 🐛 故障排除

### 粒子不显示

1. 检查 WebGL 支持
2. 检查控制台错误信息
3. 确认 Canvas 元素正确初始化

### 性能问题

1. 减少粒子数量（修改 `PARTICLE_COUNT`）
2. 降低噪声纹理尺寸（修改 `TEXTURE_SIZE`）
3. 禁用抗锯齿（修改 `antialias: false`）

### 交互不响应

1. 检查事件监听器是否正确注册
2. 确认容器元素正确获取
3. 检查手势库是否正确初始化

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- 项目地址：[GitHub](https://github.com/LemonStudio-hub/star-dust)
- 作者：Lemon Studio

## 🙏 致谢

- [Three.js](https://threejs.org/) - 3D 渲染引擎
- [Vue.js](https://vuejs.org/) - 前端框架
- [Hammer.js](https://hammerjs.github.io/) - 手势识别库
- [Simplex Noise](https://github.com/jwagner/simplex-noise.js) - 噪声算法参考

---

**Xingchen (星辰)** - 让粒子在 3D 空间中绽放光芒 ✨