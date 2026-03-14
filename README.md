# Xingchen (星辰) - 3D 粒子动画系统

一个基于 Vue 3、Three.js 和数学混沌算法的交互式 3D 粒子动画系统。粒子在 3D 空间中根据多种运动模式（噪声场、混沌吸引子）产生有机的流动效果，支持多种交互方式和丰富的视觉效果。

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Vue](https://img.shields.io/badge/Vue-3.4.0-brightgreen)
![Three.js](https://img.shields.io/badge/Three.js-0.160.0-orange)

## ✨ 特性

### 核心功能
- 🌟 **40,000 个粒子** - 高性能粒子系统
- 🎨 **动态颜色** - 8 种调色板随机分配
- 🌊 **FBM 噪声场** - 分形布朗运动算法产生自然流动
- 🔮 **Curl 旋度场** - 无散度的流体运动模拟
- 🌀 **混沌吸引子** - Lorenz、Thomas、Clifford、Rossler 四种数学模型
- 🎭 **混合模式** - 噪声场与吸引子结合，产生更复杂的视觉效果
- 🎯 **多种交互** - 鼠标、触摸、手势支持
- ⚡ **性能优化** - CPU/GPU 双模式，GPU 加速计算
- 🎬 **电影级渲染** - 泛光效果、发光粒子、雾效
- 📱 **响应式设计** - 自适应窗口大小

### 视觉效果
- ✨ **泛光效果（Bloom）** - 美丽的发光晕染
- 💫 **发光粒子（Glow）** - 着色器渲染的柔和发光
- 🌫️ **体积雾** - 深度感和距离感
- 🔄 **呼吸效果** - 粒子大小的周期性变化
- 📊 **速度影响大小** - 基于速度的动态大小调整
- 🎭 **粒子轨迹** - 可选的运动轨迹渲染

### 运动模式
- 🌊 **噪声场（NOISE_FIELD）** - 基于 FBM + Curl 噪声的有机流动
- 🦋 **Lorenz 吸引子** - 经典的蝴蝶形状混沌系统
- 🌀 **Thomas 吸引子** - 三个对称螺旋臂的循环对称系统
- 🔷 **Clifford 吸引子** - 2D 平面上的复杂图案系统
- 🌀 **Rossler 吸引子** - 螺旋状混沌系统
- 🎭 **混合模式（HYBRID）** - 噪声场与吸引子混合，产生独特视觉效果

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 现代浏览器（支持 WebGL 2.0）

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
│   │   │   ├── ParticleSystem.ts      # CPU 粒子系统
│   │   │   ├── GPGUParticleSystem.ts  # GPU 粒子系统
│   │   │   ├── MotionMode.ts          # 运动模式定义
│   │   │   └── TrailManager.ts        # 轨迹管理
│   │   ├── colors/           # 颜色管理模块
│   │   │   ├── ColorManager.ts
│   │   │   ├── ColorTheme.ts
│   │   │   └── presets/               # 预设主题
│   │   ├── interaction/      # 交互系统模块
│   │   │   └── index.ts
│   │   ├── renderer/         # 渲染系统模块
│   │   │   ├── Renderer.ts
│   │   │   └── PostProcessingManager.ts
│   │   ├── shaders/          # GPU 着色器
│   │   │   ├── particle.position.vertex.glsl
│   │   │   ├── particle.position.fragment.glsl
│   │   │   └── particle.velocity.fragment.glsl
│   │   └── AppManager.ts     # 应用管理器
│   ├── components/           # Vue 组件
│   │   ├── ColorThemePanel.vue
│   │   └── ErrorBoundary.vue
│   ├── constants/            # 常量定义
│   │   └── PhysicsConstants.ts
│   ├── utils/                # 工具函数
│   │   └── Logger.ts
│   ├── workers/              # Web Workers
│   │   └── noise.worker.ts
│   ├── App.vue               # 主组件
│   ├── main.ts               # 应用入口
│   └── style.css             # 全局样式
├── public/                   # 静态资源
├── dist/                     # 构建输出（git ignore）
├── index.html                # HTML 入口
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
├── README.md                 # 项目文档
└── COLOR_THEME_INTEGRATION.md # 颜色主题集成文档
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

- **ParticleSystem** - CPU 模式粒子系统，适用于小规模粒子
- **GPGUParticleSystem** - GPU 模式粒子系统，支持大规模粒子计算
- **MotionMode** - 运动模式枚举和配置接口
- **TrailManager** - 粒子轨迹管理器

#### 3. 颜色管理模块 (`modules/colors/`)

- **ColorManager** - 颜色管理器，支持动态颜色更新
- **ColorTheme** - 颜色主题接口
- **presets/** - 8 种预设颜色主题（冷色调、暖色调、赛博朋克、彩虹等）

#### 4. 交互系统模块 (`modules/interaction/`)

- **MouseInteraction** - 鼠标交互处理
- **TouchInteraction** - 触摸交互处理
- **GestureHandler** - 手势识别（拖拽、缩放）

#### 5. 渲染系统模块 (`modules/renderer/`)

- **Renderer** - WebGL 渲染器管理
- **PostProcessingManager** - 后处理效果管理（泛光、发光等）
- 相机控制、场景管理、光照设置

#### 6. 应用管理器 (`modules/AppManager.ts`)

- 协调所有子系统
- 管理应用生命周期
- 主渲染循环控制
- 配置管理

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

### 混沌吸引子

项目实现了四种经典混沌吸引子：

#### Lorenz 吸引子

**数学模型**：
```
dx/dt = σ(y - x)
dy/dt = x(ρ - z) - y
dz/dt = xy - βz
```

**典型参数**：σ=10, ρ=28, β=8/3  
**视觉效果**：经典的蝴蝶形状，双翼结构

#### Thomas 吸引子

**数学模型**：
```
dx/dt = sin(y) - bx
dy/dt = sin(z) - by
dz/dt = sin(x) - bz
```

**典型参数**：b=0.208186  
**视觉效果**：三个对称的螺旋臂，循环对称

#### Clifford 吸引子

**数学模型**：
```
dx/dt = sin(a*y) + c*cos(a*x)
dy/dt = sin(b*x) + d*cos(b*y)
dz/dt = sin(x) + cos(y) + z*0.1
```

**典型参数**：a=1.7, b=1.7, c=0.06, d=1.2  
**视觉效果**：2D 平面上的复杂图案，纹理丰富

#### Rossler 吸引子

**数学模型**：
```
dx/dt = -y - z
dy/dt = x + a*y
dz/dt = b + z*(x - c)
```

**典型参数**：a=0.2, b=0.2, c=5.7  
**视觉效果**：螺旋状混沌系统，单翼结构

### 混合模式

混合模式结合噪声场和吸引子的特点：
- 混合比例：30% 吸引子 + 70% 噪声场
- 保持噪声场的随机性和有机流动感
- 叠加吸引子的结构性和方向性
- 产生更加复杂和有趣的视觉效果

### 预计算优化

为避免运行时的重复噪声计算，系统在初始化时预计算 64³ 的噪声纹理：
- 计算三个独立的 FBM 噪声场
- 使用有限差分法计算 Curl 旋度场
- 存储为紧凑的 Float32Array

**性能提升**：预计算使运行时性能提升约 10 倍。

### GPU 计算

GPU 模式使用 GPUComputationRenderer 进行大规模粒子计算：
- 使用 WebGL 2.0 浮点纹理
- 着色器并行计算所有粒子的位置和速度
- 支持 100,000+ 粒子的流畅渲染

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

### 参数调节

点击设置按钮（齿轮图标）打开设置面板：
- 粒子数量、大小、边界半径
- 速度缩放、最大速度
- 运动模式选择
- 吸引子参数调节
- 颜色主题切换
- 视觉效果开关（泛光、发光、雾效）
- 配置导入/导出

## ⚙️ 配置参数

### 粒子系统配置

```typescript
interface ParticleConfig {
  count: number          // 粒子数量，默认 40000
  size: number           // 粒子大小，默认 1.0
  boundsRadius: number   // 边界半径，默认 60
  velocityScale: number  // 速度缩放因子，默认 0.1
  maxSpeed: number       // 最大速度限制，默认 0.18
  enableTrails?: boolean // 启用轨迹
  trailConfig?: TrailConfig  // 轨迹配置
  enableBreathing?: boolean  // 启用呼吸效果
  breathingAmplitude?: number  // 呼吸振幅
  breathingFrequency?: number  // 呼吸频率
  enableSpeedBasedSize?: boolean  // 启用速度影响大小
  speedBasedSizeFactor?: number  // 速度影响因子
  parallaxStrength?: number  // 视差强度
  enableFog?: boolean  // 启用雾效
  fogDensity?: number  // 雾效浓度
  fogColor?: [number, number, number]  // 雾效颜色
  enableGlow?: boolean  // 启用发光效果
  glowIntensity?: number  // 发光强度
  motionMode?: MotionMode  // 运动模式
  attractorConfig?: AttractorConfig  // 吸引子配置
}
```

### 吸引子配置

```typescript
interface AttractorConfig {
  motionMode: MotionMode  // 运动模式
  lorenz?: {
    sigma: number  // Lorenz σ 参数
    rho: number    // Lorenz ρ 参数
    beta: number   // Lorenz β 参数
  }
  thomas?: {
    b: number  // Thomas b 参数
  }
  clifford?: {
    a: number  // Clifford a 参数
    b: number  // Clifford b 参数
    c: number  // Clifford c 参数
    d: number  // Clifford d 参数
  }
  rossler?: {
    a: number  // Rossler a 参数
    b: number  // Rossler b 参数
    c: number  // Rossler c 参数
  }
  timeScale: number      // 时间缩放因子
  particleScale: number  // 粒子位置缩放因子
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

### 泛光效果配置

```typescript
interface BloomConfig {
  enabled: boolean   // 是否启用
  strength: number   // 强度（0-3）
  radius: number     // 半径（0-1）
  threshold: number  // 阈值（0-1）
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
2. **GPU 加速计算** - GPUComputationRenderer 并行计算
3. **高效数据结构** - 使用 Float32Array 存储粒子数据
4. **条件渲染** - 仅更新变化的属性
5. **像素比限制** - 限制最大像素比为 3
6. **对数深度缓冲** - 提高深度精度
7. **Web Worker** - 异步噪声预计算，避免阻塞主线程
8. **着色器优化** - GPU 粒子计算，减少 CPU-GPU 数据传输

### 性能指标

#### CPU 模式
- **粒子数量**：1,000 - 10,000
- **帧率**：30-60 FPS
- **内存占用**：~20-50 MB

#### GPU 模式
- **粒子数量**：10,000 - 100,000+
- **帧率**：60 FPS（稳定）
- **内存占用**：~100-200 MB
- **GPU 内存**：~50-100 MB

#### 初始化性能
- **噪声预计算**：~300-500ms
- **粒子系统初始化**：~100-200ms
- **总初始化时间**：~500-800ms

## 🎨 颜色主题

系统提供 8 种预设颜色主题：

1. **位置动态（PositionBased）** - 根据粒子位置动态着色
2. **速度流（SpeedFlow）** - 根据粒子速度着色
3. **冷色调（CoolTone）** - 蓝色和紫色为主
4. **暖色调（WarmTone）** - 红色和橙色为主
5. **赛博朋克（CyberPunk）** - 霓虹色和对比色
6. **彩虹（Rainbow）** - 全光谱颜色
7. **自然（Nature）** - 绿色和大地色
8. **径向发光（RadialGlow）** - 从中心向外的渐变

## 📝 代码规范

### TypeScript 规范

- 使用 TypeScript 进行类型检查
- 所有公共 API 都有完整的类型定义
- 使用 JSDoc 注释提供文档
- 启用严格模式（strict: true）

### 命名规范

- **类名**：PascalCase（如 `SimplexNoise`）
- **函数/方法**：camelCase（如 `updateParticles`）
- **常量**：UPPER_SNAKE_CASE（如 `PARTICLE_COUNT`）
- **私有成员**：使用 `private` 关键字
- **接口**：PascalCase，以 `I` 开头（可选）

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
   * @param deltaTime - 时间增量（毫秒）
   * @example
   * ```typescript
   * particleSystem.update(currentTime, 16.67);
   * ```
   */
  update(time: number, deltaTime: number = 16): void {
    // 实现代码...
  }
}
```

## 🐛 故障排除

### 粒子不显示

1. 检查 WebGL 支持（需要 WebGL 2.0）
2. 检查控制台错误信息
3. 确认 Canvas 元素正确初始化
4. 尝试切换计算模式（CPU/GPU）

### 性能问题

1. 减少粒子数量（在设置面板中调整）
2. 切换到 GPU 模式（如果可用）
3. 降低视觉效果（关闭泛光、发光等）
4. 检查浏览器是否启用了硬件加速

### 交互不响应

1. 检查事件监听器是否正确注册
2. 确认容器元素正确获取
3. 检查手势库是否正确初始化
4. 尝试点击三连击打开设置面板

### GPU 模式不可用

1. 检查浏览器是否支持 WebGL 2.0
2. 检查是否支持浮点纹理渲染
3. 查看控制台是否有 WebGL 相关错误
4. 使用 CPU 模式作为替代

### 参数调节不生效

1. 检查是否在正确的运动模式下
2. 确认参数范围是否合理
3. 查看控制台是否有错误信息
4. 尝试重置参数

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

贡献指南：
1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'feat: Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

## 📮 联系方式

- 项目地址：[GitHub](https://github.com/LemonStudio-hub/star-dust)
- 作者：Lemon Studio

## 🙏 致谢

- [Three.js](https://threejs.org/) - 3D 渲染引擎
- [Vue.js](https://vuejs.org/) - 前端框架
- [Hammer.js](https://hammerjs.github.io/) - 手势识别库
- [Simplex Noise](https://github.com/jwagner/simplex-noise.js) - 噪声算法参考
- [Vite](https://vitejs.dev/) - 构建工具

## 📚 参考资源

### 混沌理论
- [Lorenz Attractor](https://en.wikipedia.org/wiki/Lorenz_system)
- [Thomas Attractor](https://en.wikipedia.org/wiki/Thomas%27_cyclically_symmetric_attractor)
- [Clifford Attractor](https://en.wikipedia.org/wiki/Clifford_attractor)
- [Rossler Attractor](https://en.wikipedia.org/wiki/R%C3%B6ssler_attractor)

### 噪声算法
- [Simplex Noise](https://en.wikipedia.org/wiki/Simplex_noise)
- [Fractal Brownian Motion](https://en.wikipedia.org/wiki/Fractional_Brownian_motion)
- [Curl Noise](https://www.cs.ubc.ca/~rbridson/docs/curlnoise.pdf)

### WebGL
- [WebGL 2.0 Specification](https://www.khronos.org/registry/webgl/specs/latest/2.0/)
- [Three.js Documentation](https://threejs.org/docs/)
- [GPUComputationRenderer](https://threejs.org/examples/#misc_gpucompute)

---

**Xingchen (星辰)** - 让粒子在 3D 空间中绽放光芒 ✨

**版本**: 2.0.0  
**更新日期**: 2026-03-14  
**代码行数**: 10,800+  
**支持粒子数**: 100,000+（GPU 模式）