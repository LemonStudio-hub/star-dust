/**
 * 粒子更新计算着色器
 * 
 * 在 GPU 上更新粒子位置、速度，实现边界检测和重置。
 * 使用噪声纹理驱动粒子运动。
 * 
 * @module shaders/ParticleCompute
 */

// 粒子数据结构
struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  color: vec3<f32>,
  _padding: f32,
}

// 配置统一缓冲区
struct ConfigUniform {
  velocityScale: f32,     // 速度缩放因子
  maxSpeed: f32,          // 最大速度限制
  boundsRadius: f32,      // 边界半径
  time: f32,              // 当前时间
  deltaTime: f32,         // 帧间隔时间
  particleCount: u32,     // 粒子数量
  _padding0: f32,
  _padding1: f32,
}

// 输入粒子缓冲区（绑定点 0）
@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;

// 输出粒子缓冲区（绑定点 1）
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;

// 配置统一缓冲区（绑定点 2）
@group(0) @binding(2) var<uniform> config: ConfigUniform;

// 噪声纹理（绑定点 3）
@group(0) @binding(3) var noiseTexture: texture_3d<f32>;
@group(0) @binding(4) var noiseSampler: sampler;

// 简单的哈希函数，用于生成随机数
fn hash(index: u32) -> u32 {
  var state = index;
  state = (state ^ 2747636419u) * 2654435761u;
  state = (state ^ (state >> 16u)) * 2654435761u;
  state = (state ^ (state >> 16u)) * 2654435761u;
  return state;
}

// 将哈希值转换为 [0, 1] 范围的浮点数
fn hashToFloat(index: u32) -> f32 {
  return f32(hash(index)) / 4294967296.0;
}

// 从噪声纹理采样
fn sampleNoiseTexture(position: vec3<f32>, time: f32) -> vec3<f32> {
  let texSize = vec3<f32>(64.0, 64.0, 64.0);
  let scale = 0.008;
  let timeScale = 0.0001;
  
  // 归一化到 [0, 1]
  let nx = ((position.x * scale) % 1.0 + 1.0) % 1.0;
  let ny = ((position.y * scale) % 1.0 + 1.0) % 1.0;
  let nz = ((position.z * scale + time * timeScale) % 1.0 + 1.0) % 1.0;
  
  // 采样纹理
  let coord = vec3<f32>(nx, ny, nz);
  let noise = textureSample(noiseTexture, noiseSampler, coord);
  
  return noise * 2.0 - 1.0; // 归一化到 [-1, 1]
}

// 重置粒子到中心
fn resetParticle(index: u32) -> Particle {
  // 使用哈希函数生成伪随机位置
  let h = hash(index + u32(config.time * 1000.0));
  let theta = hashToFloat(index) * 6.283185; // 2 * PI
  let phi = acos(2.0 * hashToFloat(index + 1u) - 1.0);
  let radius = hashToFloat(index + 2u) * config.boundsRadius * 0.2;

  // 球坐标转笛卡尔坐标
  let position = vec3<f32>(
    radius * sin(phi) * cos(theta),
    radius * sin(phi) * sin(theta),
    radius * cos(phi)
  );

  // 随机速度
  let angle = hashToFloat(index + 3u) * 6.283185;
  let speed = 0.01 + hashToFloat(index + 4u) * 0.03;
  let velocity = vec3<f32>(
    cos(angle) * speed,
    sin(angle) * speed,
    (hashToFloat(index + 5u) - 0.5) * speed
  );

  // 随机颜色（8 种调色板）
  let paletteIndex = hash(index) % 8u;
  var color = vec3<f32>(1.0, 1.0, 1.0);
  
  if (paletteIndex == 0u) {
    color = vec3<f32>(1.0, 0.2, 0.5); // 粉色
  } else if (paletteIndex == 1u) {
    color = vec3<f32>(0.2, 0.8, 1.0); // 蓝色
  } else if (paletteIndex == 2u) {
    color = vec3<f32>(1.0, 0.9, 0.2); // 黄色
  } else if (paletteIndex == 3u) {
    color = vec3<f32>(0.3, 1.0, 0.5); // 绿色
  } else if (paletteIndex == 4u) {
    color = vec3<f32>(0.9, 0.2, 1.0); // 紫色
  } else if (paletteIndex == 5u) {
    color = vec3<f32>(1.0, 0.4, 0.1); // 橙色
  } else if (paletteIndex == 6u) {
    color = vec3<f32>(0.1, 0.9, 0.9); // 青色
  } else {
    color = vec3<f32>(1.0, 1.0, 1.0); // 白色
  }

  return Particle(position, velocity, color, 0.0);
}

// 计算着色器入口点
@compute @workgroup_size(256)
fn updateParticles(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let index = globalId.x;
  
  // 检查索引是否有效
  if (index >= config.particleCount) {
    return;
  }

  // 读取输入粒子
  var particle = particlesIn[index];

  // 采样噪声纹理
  let curl = sampleNoiseTexture(particle.position, config.time);

  // 更新速度
  particle.velocity += curl * config.velocityScale * config.deltaTime;

  // 限制最大速度
  let speed = length(particle.velocity);
  if (speed > config.maxSpeed) {
    particle.velocity = normalize(particle.velocity) * config.maxSpeed;
  }

  // 更新位置
  particle.position += particle.velocity * config.deltaTime;

  // 边界检测
  let distSq = dot(particle.position, particle.position);
  let boundsRadiusSq = config.boundsRadius * config.boundsRadius;

  if (distSq > boundsRadiusSq) {
    // 重置粒子
    particle = resetParticle(index);
  }

  // 写入输出缓冲区
  particlesOut[index] = particle;
}

// 未来版本：使用噪声纹理采样
// fn sampleNoiseTexture(position: vec3<f32>, time: f32) -> vec3<f32> {
//   let texSize = vec3<f32>(64.0, 64.0, 64.0);
//   let scale = 0.008;
//   let timeScale = 0.0001;
//   
//   // 归一化到 [0, 1]
//   let nx = ((position.x * scale) % 1.0 + 1.0) % 1.0;
//   let ny = ((position.y * scale) % 1.0 + 1.0) % 1.0;
//   let nz = ((position.z * scale + time * timeScale) % 1.0 + 1.0) % 1.0;
//   
//   // 采样纹理
//   let coord = vec3<f32>(nx, ny, nz);
//   let noise = textureSample(noiseTexture, noiseSampler, coord);
//   
//   return noise * 2.0 - 1.0; // 归一化到 [-1, 1]
// }