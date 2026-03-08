/**
 * 粒子位置更新顶点着色器
 *
 * 用于 GPU 粒子系统的位置更新计算。
 * 将粒子索引映射到纹理坐标，并传递给片段着色器。
 */

varying vec2 vUv;
uniform float iTime;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}