/**
 * status 命令 - 查看当前状态
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadMainConfig, ROOT_DIR } from '../utils/i18n-engine.mjs';
import { log, colors } from '../utils/logger.mjs';

const LOGO = `
${colors.cyan}╔═══════════════════════════════════════════════╗
║  ${colors.bold}🦞 OpenClaw 中文版 CLI${colors.reset}${colors.cyan}                        ║
║     汉化管理工具                              ║
╚═══════════════════════════════════════════════╝${colors.reset}
`;

async function findOpenClawDir() {
  const candidates = [
    path.resolve(ROOT_DIR, 'sakura-openclaw'),
    path.resolve(ROOT_DIR, 'openclaw'),
    path.resolve(ROOT_DIR, 'upstream'),
  ];
  
  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
    candidates.push(path.join(npmRoot, 'openclaw'));
    candidates.push(path.join(npmRoot, 'openclaw-zh'));
  } catch {}
  
  for (const dir of candidates) {
    try {
      const pkgPath = path.join(dir, 'package.json');
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.name === 'openclaw' || pkg.name === 'openclaw-zh') {
        return { dir, pkg };
      }
    } catch {}
  }
  
  return null;
}

export async function statusCommand(args) {
  console.log(LOGO);
  
  log.title('📋 状态检查');
  
  // 检查 OpenClaw
  const openclaw = await findOpenClawDir();
  
  if (openclaw) {
    log.success(`OpenClaw 目录: ${openclaw.dir}`);
    console.log(`   版本: ${colors.cyan}${openclaw.pkg.version}${colors.reset}`);
    console.log(`   名称: ${openclaw.pkg.name}`);
    
    // 检查是否已汉化
    try {
      const bannerPath = path.join(openclaw.dir, 'src/cli/banner.ts');
      const bannerContent = await fs.readFile(bannerPath, 'utf-8');
      
      if (bannerContent.includes('中文版')) {
        console.log(`   汉化: ${colors.green}✓ 已应用${colors.reset}`);
      } else {
        console.log(`   汉化: ${colors.yellow}✗ 未应用${colors.reset}`);
      }
    } catch {
      console.log(`   汉化: ${colors.dim}无法检测${colors.reset}`);
    }
  } else {
    log.warn('未找到 OpenClaw 安装');
    console.log(`   ${colors.dim}提示: 将 OpenClaw 克隆到 ../openclaw${colors.reset}`);
  }
  
  // 检查翻译配置
  log.title('🌐 翻译配置');
  
  try {
    const mainConfig = await loadMainConfig();
    
    let totalFiles = 0;
    let totalRules = 0;
    
    for (const [category, files] of Object.entries(mainConfig.modules)) {
      totalFiles += files.length;
      console.log(`   ${colors.cyan}${category}/${colors.reset}: ${files.length} 个文件`);
    }
    
    log.success(`配置正常: ${totalFiles} 个翻译文件`);
  } catch (err) {
    log.error(`配置加载失败: ${err.message}`);
  }
  
  // 项目信息
  log.title('📦 项目信息');
  
  try {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    
    console.log(`   版本: ${colors.cyan}${pkg.version}${colors.reset}`);
    console.log(`   目录: ${ROOT_DIR}`);
  } catch {}
  
  console.log('');
}
