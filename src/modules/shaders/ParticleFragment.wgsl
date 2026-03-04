/**
 * 粒子片段着色器
 * 
 * 功能：
 * - 接收顶点颜色和点大小
 * - 渲染圆形粒子
 * - 应用加法混合
 * - 输出最终颜色
 */

struct FragmentInput {
  @location(0) color: vec3<f32>,
  @location(1) pointSize: f32>,
}

/**
 * 片段着色器主函数
 */
@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  // 直接输出颜色，不透明度 0.9
  // 加法混合在渲染管线中配置
  return vec4<f32>(input.color, 0.9);
}