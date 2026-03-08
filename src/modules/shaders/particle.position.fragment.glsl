/**
 * 粒子位置更新片段着色器
 *
 * 在 GPU 上更新粒子的位置和速度。
 * 使用 FBM 噪声和 Curl 旋度场模拟有机流动。
 */

uniform sampler2D tPosition;       // 当前位置纹理 (RGB = xyz)
uniform sampler2D tVelocity;       // 当前速度纹理 (RGB = xyz)
uniform sampler2D tNoise;          // 噪声纹理 (RGB = curl)
uniform float uTime;               // 时间
uniform float uDeltaTime;          // 时间增量
uniform float uVelocityScale;      // 速度缩放因子
uniform float uMaxSpeed;           // 最大速度
uniform float uBoundsRadius;       // 边界半径
uniform float uNoiseScale;         // 噪声缩放
uniform float uTimeScale;          // 时间缩放

varying vec2 vUv;

// 随机函数
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 3D 噪声采样函数
vec3 sampleNoise(vec3 pos, float time) {
  // 将位置映射到噪声纹理坐标 [0, 1]
  vec3 noisePos = (pos + 100.0) * uNoiseScale;
  vec3 timePos = vec3(time * uTimeScale);

  // 采样三个通道（分别代表 x, y, z 的噪声值）
  float noiseX = texture2D(tNoise, noisePos.xy + timePos.xy).r;
  float noiseY = texture2D(tNoise, noisePos.yz + timePos.yz).g;
  float noiseZ = texture2D(tNoise, noisePos.xz + timePos.xz).b;

  return vec3(noiseX, noiseY, noiseZ);
}

// Curl 旋度场计算
vec3 curlNoise(vec3 pos, float time) {
  float eps = 0.01;

  // 有限差分法计算旋度
  vec3 n1 = sampleNoise(pos + vec3(eps, 0, 0), time);
  vec3 n2 = sampleNoise(pos - vec3(eps, 0, 0), time);
  vec3 n3 = sampleNoise(pos + vec3(0, eps, 0), time);
  vec3 n4 = sampleNoise(pos - vec3(0, eps, 0), time);
  vec3 n5 = sampleNoise(pos + vec3(0, 0, eps), time);
  vec3 n6 = sampleNoise(pos - vec3(0, 0, eps), time);

  // Curl = (∂Fz/∂y - ∂Fy/∂z, ∂Fx/∂z - ∂Fz/∂x, ∂Fy/∂x - ∂Fx/∂y)
  float x = (n5.y - n6.y) - (n3.z - n4.z);
  float y = (n1.z - n2.z) - (n5.x - n6.x);
  float z = (n3.x - n4.x) - (n1.y - n2.y);

  return vec3(x, y, z) / eps;
}

void main() {
  // 读取当前位置和速度
  vec4 position = texture2D(tPosition, vUv);
  vec4 velocity = texture2D(tVelocity, vUv);

  vec3 pos = position.rgb;
  vec3 vel = velocity.rgb;

  // 计算噪声力场
  vec3 curl = curlNoise(pos, uTime);

  // 根据噪声场更新速度
  vel += curl * uVelocityScale * uDeltaTime;

  // 限制最大速度
  float speed = length(vel);
  if (speed > uMaxSpeed) {
    vel = normalize(vel) * uMaxSpeed;
  }

  // 更新位置
  pos += vel * uDeltaTime;

  // 边界检测和重置
  float dist = length(pos);
  if (dist > uBoundsRadius) {
    // 重置到中心附近
    pos *= 0.1;

    // 重置速度（使用随机值）
    float angle = random(vUv) * 6.28318;
    float newSpeed = 0.01 + random(vUv + 0.1) * 0.03;
    vel = vec3(cos(angle), sin(angle), (random(vUv + 0.2) - 0.5)) * newSpeed;
  }

  // 输出新的位置
  gl_FragColor = vec4(pos, 1.0);
}