/**
 * 粒子顶点着色器
 * 
 * 功能：
 * - 读取粒子位置和颜色
 * - 应用模型-视图-投影变换
 * - 计算点大小（基于距离衰减）
 * - 输出到片段着色器
 */

struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  color: vec3<f32>,
  _padding: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) pointSize: f32>,
}

struct CameraUniform {
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  _padding: f32,
}

struct RenderUniform {
  particleSize: f32,
  _padding0: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> camera: CameraUniform;
@group(0) @binding(2) var<uniform> render: RenderUniform;

/**
 * 顶点着色器主函数
 */
@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;
  
  let particle = particles[vertexIndex];
  
  // 计算世界空间位置
  let worldPosition = vec4<f32>(particle.position, 1.0);
  
  // 应用视图变换
  let viewPosition = camera.viewMatrix * worldPosition;
  
  // 应用投影变换
  output.position = camera.projectionMatrix * viewPosition;
  
  // 计算距离相机的距离
  let distance = length(viewPosition.xyz);
  
  // 点大小衰减（透视效果）
  let attenuation = 1000.0 / max(distance, 1.0);
  output.pointSize = render.particleSize * attenuation;
  
  // 限制点大小范围
  output.pointSize = clamp(output.pointSize, 1.0, 10.0);
  
  // 传递颜色
  output.color = particle.color;
  
  return output;
}