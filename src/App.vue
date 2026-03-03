<template>
  <div ref="container" class="particle-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import Hammer from 'hammerjs'

const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let particles: THREE.Points
let particlePositions: Float32Array
let particleVelocities: Float32Array
let mouse = new THREE.Vector2()
let targetRotation = new THREE.Vector2()
let currentRotation = new THREE.Vector2()
let hammer: Hammer.Manager | null = null
let time = 0

const PARTICLE_COUNT = 30000
const PARTICLE_SIZE = 1.2

// Simplex Noise 实现
class SimplexNoise {
  constructor() {
    this.grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ]
    this.p = []
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(Math.random() * 256)
    }
    this.perm = []
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255]
    }
  }

  dot(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z
  }

  noise(xin: number, yin: number, zin: number): number {
    const F3 = 1.0 / 3.0
    const s = (xin + yin + zin) * F3
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const k = Math.floor(zin + s)
    const G3 = 1.0 / 6.0
    const t = (i + j + k) * G3
    const X0 = i - t
    const Y0 = j - t
    const Z0 = k - t
    const x0 = xin - X0
    const y0 = yin - Y0
    const z0 = zin - Z0

    let i1: number, j1: number, k1: number
    let i2: number, j2: number, k2: number

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0
        i2 = 1; j2 = 1; k2 = 0
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0
        i2 = 1; j2 = 0; k2 = 1
      } else {
        i1 = 0; j1 = 0; k1 = 1
        i2 = 1; j2 = 0; k2 = 1
      }
    } else {
      if (y0 < z0) {
        i1 = 0; j1 = 0; k1 = 1
        i2 = 0; j2 = 1; k2 = 1
      } else if (x0 < z0) {
        i1 = 0; j1 = 1; k1 = 0
        i2 = 0; j2 = 1; k2 = 1
      } else {
        i1 = 0; j1 = 1; k1 = 0
        i2 = 1; j2 = 1; k2 = 0
      }
    }

    const x1 = x0 - i1 + G3
    const y1 = y0 - j1 + G3
    const z1 = z0 - k1 + G3
    const x2 = x0 - i2 + 2.0 * G3
    const y2 = y0 - j2 + 2.0 * G3
    const z2 = z0 - k2 + 2.0 * G3
    const x3 = x0 - 1.0 + 3.0 * G3
    const y3 = y0 - 1.0 + 3.0 * G3
    const z3 = z0 - 1.0 + 3.0 * G3

    const ii = i & 255
    const jj = j & 255
    const kk = k & 255

    let n0: number, n1: number, n2: number, n3: number

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
    if (t0 < 0) {
      n0 = 0.0
    } else {
      t0 *= t0
      n0 = t0 * t0 * this.dot(this.grad3[this.perm[ii + this.perm[jj + this.perm[kk]]] % 12], x0, y0, z0)
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
    if (t1 < 0) {
      n1 = 0.0
    } else {
      t1 *= t1
      n1 = t1 * t1 * this.dot(this.grad3[this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12], x1, y1, z1)
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
    if (t2 < 0) {
      n2 = 0.0
    } else {
      t2 *= t2
      n2 = t2 * t2 * this.dot(this.grad3[this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12], x2, y2, z2)
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
    if (t3 < 0) {
      n3 = 0.0
    } else {
      t3 *= t3
      n3 = t3 * t3 * this.dot(this.grad3[this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12], x3, y3, z3)
    }

    return 32.0 * (n0 + n1 + n2 + n3)
  }
}

// 分形布朗运动（FBM）噪声场
class FBMNoise {
  private simplex: SimplexNoise
  private octaves: number
  private persistence: number
  private lacunarity: number

  constructor(octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0) {
    this.simplex = new SimplexNoise()
    this.octaves = octaves
    this.persistence = persistence
    this.lacunarity = lacunarity
  }

  // 3D FBM 噪声
  noise(x: number, y: number, z: number): number {
    let total = 0
    let frequency = 1
    let amplitude = 1
    let maxValue = 0

    for (let i = 0; i < this.octaves; i++) {
      total += this.simplex.noise(x * frequency, y * frequency, z * frequency) * amplitude
      maxValue += amplitude
      amplitude *= this.persistence
      frequency *= this.lacunarity
    }

    return total / maxValue
  }
}

const fbmNoise = new FBMNoise(4, 0.5, 2.0)

const createParticles = () => {
  const geometry = new THREE.BufferGeometry()
  particlePositions = new Float32Array(PARTICLE_COUNT * 3)
  particleVelocities = new Float32Array(PARTICLE_COUNT * 3)

  const colors = new Float32Array(PARTICLE_COUNT * 3)

  const colorPalettes = [
    [1.0, 0.2, 0.5],
    [0.2, 0.8, 1.0],
    [1.0, 0.9, 0.2],
    [0.3, 1.0, 0.5],
    [0.9, 0.2, 1.0],
    [1.0, 0.4, 0.1],
    [0.1, 0.9, 0.9],
    [1.0, 1.0, 1.0],
  ]

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3

    const radius = Math.random() * 50
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    particlePositions[i3 + 2] = radius * Math.cos(phi)

    const angle = Math.random() * Math.PI * 2
    const speed = 0.01 + Math.random() * 0.03
    particleVelocities[i3] = Math.cos(angle) * speed
    particleVelocities[i3 + 1] = Math.sin(angle) * speed
    particleVelocities[i3 + 2] = (Math.random() - 0.5) * speed

    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)]
    const brightness = 0.7 + Math.random() * 0.3
    colors[i3] = palette[0] * brightness
    colors[i3 + 1] = palette[1] * brightness
    colors[i3 + 2] = palette[2] * brightness
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

const updateParticles = () => {
  const positions = particles.geometry.attributes.position.array as Float32Array
  const len = positions.length

  // FBM 参数
  const scale = 0.008
  const timeScale = 0.00005
  const velocityScale = 0.08  // 降低速度系数

  for (let i = 0; i < len; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]

    // 使用 FBM 噪声计算 3D 向量场
    const noiseX = fbmNoise.noise(x * scale, y * scale, time * timeScale)
    const noiseY = fbmNoise.noise(x * scale + 100, y * scale + 100, time * timeScale + 100)
    const noiseZ = fbmNoise.noise(x * scale + 200, y * scale + 200, time * timeScale + 200)

    // 更新速度 - 使用降低的速度系数
    particleVelocities[i] += noiseX * velocityScale
    particleVelocities[i + 1] += noiseY * velocityScale
    particleVelocities[i + 2] += noiseZ * velocityScale

    // 限制速度
    const speed = Math.sqrt(
      particleVelocities[i] * particleVelocities[i] +
      particleVelocities[i + 1] * particleVelocities[i + 1] +
      particleVelocities[i + 2] * particleVelocities[i + 2]
    )

    const maxSpeed = 0.15  // 降低最大速度
    if (speed > maxSpeed) {
      const factor = maxSpeed / speed
      particleVelocities[i] *= factor
      particleVelocities[i + 1] *= factor
      particleVelocities[i + 2] *= factor
    }

    // 更新位置
    positions[i] += particleVelocities[i]
    positions[i + 1] += particleVelocities[i + 1]
    positions[i + 2] += particleVelocities[i + 2]

    // 边界检测
    const distSq = x * x + y * y + z * z
    if (distSq > 3600) {
      positions[i] *= 0.1
      positions[i + 1] *= 0.1
      positions[i + 2] *= 0.1

      particleVelocities[i] = (Math.random() - 0.5) * 0.05
      particleVelocities[i + 1] = (Math.random() - 0.5) * 0.05
      particleVelocities[i + 2] = (Math.random() - 0.5) * 0.05
    }
  }

  particles.geometry.attributes.position.needsUpdate = true
}

const animate = () => {
  requestAnimationFrame(animate)

  time += 16

  updateParticles()

  currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05
  currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05

  particles.rotation.x = currentRotation.x
  particles.rotation.y = currentRotation.y
  particles.rotation.y += 0.001

  renderer.render(scene, camera)
}

const onMouseMove = (event: MouseEvent) => {
  if (!container.value) return

  const rect = container.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  targetRotation.x = mouse.y * Math.PI * 0.5
  targetRotation.y = mouse.x * Math.PI * 0.5
}

const onTouchMove = (event: TouchEvent) => {
  if (!container.value) return

  const rect = container.value.getBoundingClientRect()
  const touch = event.touches[0]
  mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1

  targetRotation.x = mouse.y * Math.PI * 0.5
  targetRotation.y = mouse.x * Math.PI * 0.5
}

const setupHammer = () => {
  if (!container.value) return

  hammer = new Hammer.Manager(container.value)

  const pan = new Hammer.Pan()
  const pinch = new Hammer.Pinch()

  hammer.add(pan)
  hammer.add(pinch)

  let lastScale = 1

  hammer.on('pan', (e) => {
    const deltaX = e.deltaX * 0.005
    const deltaY = e.deltaY * 0.005

    targetRotation.y += deltaX
    targetRotation.x += deltaY
  })

  hammer.on('pinch', (e) => {
    const scale = e.scale / lastScale
    lastScale = e.scale

    particles.scale.multiplyScalar(scale)
  })

  hammer.on('pinchend', () => {
    lastScale = 1
  })
}

const onResize = () => {
  if (!container.value || !camera || !renderer) return

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
}

onMounted(() => {
  if (!container.value || !canvas.value) return

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    75,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    1000
  )
  camera.position.z = 80

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
    logarithmicDepthBuffer: true
  })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  createParticles()

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(50, 50, 50)
  scene.add(pointLight)

  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove, { passive: true })

  setupHammer()

  animate()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('touchmove', onTouchMove)

  if (hammer) {
    hammer.destroy()
  }

  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.particle-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000px;
  -webkit-perspective: 1000px;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
</style>