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
let worker: Worker | null = null

const PARTICLE_COUNT = 30000
const PARTICLE_SIZE = 1.2

const createParticles = () => {
  const geometry = new THREE.BufferGeometry()
  particlePositions = new Float32Array(PARTICLE_COUNT * 3)
  particleVelocities = new Float32Array(PARTICLE_COUNT * 3)

  const colors = new Float32Array(PARTICLE_COUNT * 3)

  // 颜色调色板
  const colorPalettes = [
    [1.0, 0.2, 0.5],  // 玫红
    [0.2, 0.8, 1.0],  // 天蓝
    [1.0, 0.9, 0.2],  // 金黄
    [0.3, 1.0, 0.5],  // 翠绿
    [0.9, 0.2, 1.0],  // 紫色
    [1.0, 0.4, 0.1],  // 橙红
    [0.1, 0.9, 0.9],  // 青色
    [1.0, 1.0, 1.0],  // 白色
  ]

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3

    // 随机分布在球形空间内
    const radius = Math.random() * 50
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    particlePositions[i3 + 2] = radius * Math.cos(phi)

    // 随机初始速度
    const angle = Math.random() * Math.PI * 2
    const speed = 0.02 + Math.random() * 0.08
    particleVelocities[i3] = Math.cos(angle) * speed
    particleVelocities[i3 + 1] = Math.sin(angle) * speed
    particleVelocities[i3 + 2] = (Math.random() - 0.5) * speed

    // 随机选择颜色
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

const animate = () => {
  requestAnimationFrame(animate)

  // 平滑旋转
  currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05
  currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05

  particles.rotation.x = currentRotation.x
  particles.rotation.y = currentRotation.y

  // 添加轻微的自动旋转
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

  // 创建场景
  scene = new THREE.Scene()

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    1000
  )
  camera.position.z = 80

  // 创建渲染器 - 启用GPU加速
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

  // 创建粒子
  createParticles()

  // 创建 Worker
  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

    // 监听 Worker 消息
    worker.onmessage = (event: MessageEvent) => {
      const { positions: newPositions, velocities: newVelocities } = event.data

      // 更新粒子位置
      const positionAttribute = particles.geometry.attributes.position
      positionAttribute.set(newPositions)
      positionAttribute.needsUpdate = true

      // 更新速度
      particleVelocities.set(newVelocities)
    }

    // 发送初始数据到 Worker
    worker.postMessage({
      positions: particlePositions,
      velocities: particleVelocities
    })

    // 每帧向 Worker 发送数据
    const updateWorker = () => {
      if (worker && particlePositions) {
        worker.postMessage({
          positions: particlePositions,
          velocities: particleVelocities
        })
      }
      requestAnimationFrame(updateWorker)
    }

    // 开始 Worker 更新循环
    updateWorker()

  } catch (error) {
    console.error('Failed to create worker:', error)
    // 如果 Worker 创建失败，使用备用方案
  }

  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  // 添加点光源
  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(50, 50, 50)
  scene.add(pointLight)

  // 事件监听
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove, { passive: true })

  // 设置手势
  setupHammer()

  // 开始动画
  animate()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('touchmove', onTouchMove)

  if (hammer) {
    hammer.destroy()
  }

  if (worker) {
    worker.terminate()
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