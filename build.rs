use std::env;
use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=src/modules/shaders");
    
    // 确保输出目录存在
    let out_dir = Path::new("src/modules/shaders/gen");
    fs::create_dir_all(out_dir).expect("Failed to create output directory");

    // 处理每个 WGSL 文件
    let shader_dir = Path::new("src/modules/shaders");
    
    for entry in fs::read_dir(shader_dir).expect("Failed to read shader directory") {
        let entry = entry.expect("Failed to read directory entry");
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "wgsl") {
            if let Some(file_stem) = path.file_stem() {
                let input_path = path.to_string_lossy().to_string();
                let output_path = out_dir.join(format!("{}.ts", file_stem.to_string_lossy()));
                
                // 读取 WGSL 文件
                let wgsl_code = fs::read_to_string(&input_path)
                    .expect(&format!("Failed to read WGSL file: {}", input_path));
                
                // 生成 TypeScript 定义
                let ts_code = generate_ts_types(&wgsl_code, file_stem.to_string_lossy().as_ref());
                
                // 写入 TypeScript 文件
                fs::write(&output_path, ts_code)
                    .expect(&format!("Failed to write TypeScript file: {:?}", output_path));
                
                println!("cargo:warning=Generated TypeScript types for: {}", file_stem.to_string_lossy());
            }
        }
    }
}

fn generate_ts_types(wgsl_code: &str, module_name: &str) -> String {
    let mut ts_code = String::new();
    
    // 文件头注释
    ts_code.push_str("/**\n");
    ts_code.push_str(&format!(" * 自动生成的着色器类型定义\n"));
    ts_code.push_str(&format!(" * 源文件: {}.wgsl\n", module_name));
    ts_code.push_str(" * \n");
    ts_code.push_str(" * 警告：此文件由构建工具自动生成，请勿手动修改！\n");
    ts_code.push_str(" */\n\n");
    
    // 导出着色器代码
    ts_code.push_str(&format!("export const {}ShaderCode = `\\n", module_name));
    ts_code.push_str(wgsl_code);
    ts_code.push_str("\\n`;\n\n");
    
    // 解析结构体
    let structs = parse_structs(wgsl_code);
    
    // 生成 TypeScript 接口
    for (struct_name, fields) in &structs {
        ts_code.push_str(&format!("/**\n * {} 结构体\n */\n", struct_name));
        ts_code.push_str(&format!("export interface {} {{\n", struct_name));
        
        for (field_name, field_type) in fields {
            let ts_type = wgsl_to_ts_type(field_type);
            ts_code.push_str(&format!("  /** {} */\n", field_name));
            ts_code.push_str(&format!("  {}: {};\n", field_name, ts_type));
        }
        
        ts_code.push_str("}\n\n");
    }
    
    // 解析统一变量（uniform）
    let uniforms = parse_uniforms(wgsl_code);
    
    if !uniforms.is_empty() {
        ts_code.push_str("/**\n * Uniform 绑定点\n */\n");
        ts_code.push_str(&format!("export const {}UniformBindings = {{\n", module_name));
        for (binding, name) in &uniforms {
            ts_code.push_str(&format!("  {}:'{}',\n", binding, name));
        }
        ts_code.push_str("} as const;\n\n");
    }
    
    ts_code
}

fn parse_structs(wgsl_code: &str) -> Vec<(String, Vec<(String, String)>)> {
    let mut structs = Vec::new();
    let mut lines: Vec<&str> = wgsl_code.lines().collect();
    let mut i = 0;
    
    while i < lines.len() {
        let line = lines[i].trim();
        
        // 检测结构体定义
        if line.starts_with("struct ") {
            let struct_name = line
                .strip_prefix("struct ")
                .unwrap()
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim_end_matches('{')
                .trim();
            
            let mut fields = Vec::new();
            i += 1;
            
            // 解析结构体字段
            while i < lines.len() {
                let field_line = lines[i].trim();
                
                if field_line == "}" {
                    i += 1;
                    break;
                }
                
                if !field_line.is_empty() && !field_line.starts_with("//") {
                    if let Some((field_part, comment_part)) = field_line.split_once("//") {
                        let field_part = field_part.trim();
                        if let Some((field_name_type, _)) = field_part.split_once(':') {
                            let parts: Vec<&str> = field_name_type.split_whitespace().collect();
                            if parts.len() >= 2 {
                                let field_name = parts[0].trim_end_matches(',');
                                let field_type = parts[1].trim_end_matches(',');
                                fields.push((field_name.to_string(), field_type.to_string()));
                            }
                        }
                    } else {
                        if let Some((field_name_type, _)) = field_line.split_once(':') {
                            let parts: Vec<&str> = field_name_type.split_whitespace().collect();
                            if parts.len() >= 2 {
                                let field_name = parts[0].trim_end_matches(',');
                                let field_type = parts[1].trim_end_matches(',');
                                fields.push((field_name.to_string(), field_type.to_string()));
                            }
                        }
                    }
                }
                
                i += 1;
            }
            
            if !struct_name.is_empty() && !fields.is_empty() {
                structs.push((struct_name.to_string(), fields));
            }
        } else {
            i += 1;
        }
    }
    
    structs
}

fn parse_uniforms(wgsl_code: &str) -> Vec<(String, String)> {
    let mut uniforms = Vec::new();
    
    for line in wgsl_code.lines() {
        let line = line.trim();
        
        // 检测 uniform 绑定
        if line.contains("@binding(") && line.contains("var<uniform>") {
            if let Some(binding_start) = line.find("@binding(") {
                if let Some(binding_end) = line[binding_start..].find(')') {
                    let binding = line[binding_start + 9..binding_start + binding_end].trim();
                    
                    if let Some(var_start) = line.find("var<uniform>") {
                        let var_part = line[var_start + 13..].trim();
                        if let Some(var_end) = var_part.find(':') {
                            let var_name = var_part[..var_end].trim();
                            uniforms.push((binding.to_string(), var_name.to_string()));
                        }
                    }
                }
            }
        }
    }
    
    uniforms
}

fn wgsl_to_ts_type(wgsl_type: &str) -> &'static str {
    match wgsl_type {
        "f32" => "number",
        "f64" => "number",
        "i32" => "number",
        "u32" => "number",
        "bool" => "boolean",
        "vec2<f32>" => "[number, number]",
        "vec3<f32>" => "[number, number, number]",
        "vec4<f32>" => "[number, number, number, number]",
        "mat4x4<f32>" => "Float32Array",
        "mat3x3<f32>" => "Float32Array",
        "texture_2d<f32>" => "GPUTextureView",
        "texture_3d<f32>" => "GPUTextureView",
        "sampler" => "GPUSampler",
        _ => "any",
    }
}
