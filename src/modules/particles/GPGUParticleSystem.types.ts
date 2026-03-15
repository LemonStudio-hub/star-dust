/**
 * GPUComputationRenderer 的类型定义
 * 由于库中未导出，在此定义必要的类型
 */

import * as THREE from 'three'

export interface GPGPUVariable {
  name: string
  renderTargets: THREE.WebGLRenderTarget[]
  material: THREE.ShaderMaterial
  uniforms: Record<string, THREE.IUniform>
}