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

// 简单的噪声函数
function noise(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return (n - Math.floor(n)) * 2 - 1
}

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
    const speed = 0.02 + Math.random() * 0.08
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

  for (let i = 0; i < len; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]

    // 使用噪声计算力
    const noiseX = noise(x * 0.01, y * 0.01, time * 0.0001)
    const noiseY = noise(x * 0.01 + 100, y * 0.01 + 100, time * 0.0001 + 100)
    const noiseZ = noise(x * 0.01 + 200, y * 0.01 + 200, time * 0.0001 + 200)

    // 更新速度
    particleVelocities[i] += noiseX * 0.5
    particleVelocities[i + 1] += noiseY * 0.5
    particleVelocities[i + 2] += noiseZ * 0.5

    // 限制速度
    const speed = Math.sqrt(
      particleVelocities[i] * particleVelocities[i] +
      particleVelocities[i + 1] * particleVelocities[i + 1] +
      particleVelocities[i + 2] * particleVelocities[i + 2]
    )

    const maxSpeed = 0.5
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

      particleVelocities[i] = (Math.random() - 0.5) * 0.1
      particleVelocities[i + 1] = (Math.random() - 0.5) * 0.1
      particleVelocities[i + 2] = (Math.random() - 0.5) * 0.1
    }
  }

  particles.geometry.attributes.position.needsUpdate = true
}

const animate = () => {
  requestAnimationFrame(animate)

  // 更新时间
  time += 16

  // 更新粒子
  updateParticles()

  // 平滑旋转
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