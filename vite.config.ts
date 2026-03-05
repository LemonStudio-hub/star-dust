import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// 着色器构建插件
function shaderBuildPlugin() {
  return {
    name: 'shader-build',
    buildStart() {
      console.log('🎨 开始构建着色器...')
      
      try {
        // 运行 Rust 构建脚本生成 TypeScript 类型
        console.log('  📦 运行 cargo build...')
        execSync('cargo build', { stdio: 'inherit' })
        
        // 运行 tgpu-gen 生成 TypeGPU 类型
        console.log('  ⚡ 运行 tgpu-gen...')
        const shaderDir = path.join(process.cwd(), 'src/modules/shaders')
        const outputDir = path.join(shaderDir, 'gen')
        
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }
        
        // 为每个 WGSL 文件运行 tgpu-gen
        const wgslFiles = fs.readdirSync(shaderDir)
          .filter(file => file.endsWith('.wgsl'))
        
        for (const file of wgslFiles) {
          const inputFile = path.join(shaderDir, file)
          const outputFile = path.join(outputDir, file.replace('.wgsl', '.ts'))
          
          console.log(`    处理: ${file}`)
          execSync(`npx tgpu-gen "${inputFile}" --output "${outputFile}" --overwrite`, { 
            stdio: 'inherit' 
          })
        }
        
        console.log('✅ 着色器构建完成！')
      } catch (error) {
        console.error('❌ 着色器构建失败:', error)
        throw error
      }
    }
  }
}

export default defineConfig({
  plugins: [vue(), shaderBuildPlugin()],
})