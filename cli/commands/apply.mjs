/**
 * apply 命令 - 应用汉化补丁
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { 
  loadMainConfig, 
  loadAllTranslations, 
  applyTranslation,
  applyCopyFiles,
  printStats,
  ROOT_DIR 
} from '../utils/i18n-engine.mjs';
import { log, colors } from '../utils/logger.mjs';

/**
 * 查找 OpenClaw 目录
 */
async function findOpenClawDir() {
  const candidates = [
    path.resolve(ROOT_DIR, 'sakura-openclaw'),
    path.resolve(ROOT_DIR, 'openclaw'),
    path.resolve(ROOT_DIR, 'upstream'),
  ];
  
  // 尝试从 npm 找到全局安装位置
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
        return dir;
      }
    } catch {}
  }
  
  return null;
}

export async function applyCommand(args) {
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const verify = args.includes('--verify');
  const targetArg = args.find(a => a.startsWith('--target='));
  
  console.log(`\n🦞 ${colors.bold}OpenClaw 汉化工具${colors.reset}\n`);
  
  if (dryRun) {
    log.warn('模式: 预览 (--dry-run)');
  } else if (verify) {
    log.warn('模式: 验证 (--verify)');
  } else {
    log.success('模式: 应用');
  }
  
  // 确定目标目录（支持 Windows 绝对路径）
  let targetDir = targetArg ? path.resolve(targetArg.split('=')[1]) : null;
  
  if (!targetDir) {
    targetDir = await findOpenClawDir();
  }
  
  if (!targetDir) {
    log.error('找不到 OpenClaw 目录');
    console.log(`请使用 ${colors.cyan}--target=/path/to/openclaw${colors.reset} 指定目录`);
    console.log(`或将 OpenClaw 克隆到 ${colors.dim}../openclaw${colors.reset}`);
    process.exit(1);
  }
  
  // 检查目标目录
  try {
    await fs.access(targetDir);
  } catch {
    log.error(`目标目录不存在: ${targetDir}`);
    process.exit(1);
  }
  
  log.info(`目标目录: ${targetDir}`);
  
  // 加载配置
  const mainConfig = await loadMainConfig();
  const translations = await loadAllTranslations(mainConfig, verbose);
  
  log.info(`已加载 ${translations.length} 个翻译配置`);
  
  // 应用翻译
  const allStats = [];
  for (const translation of translations) {
    // 区分 copyFiles 类型和 replacements 类型
    if (translation.copyFiles && Array.isArray(translation.copyFiles)) {
      const stats = await applyCopyFiles(translation, targetDir, {
        dryRun,
        verify,
        verbose
      });
      allStats.push(stats);
    } else if (translation.replacements) {
      const stats = await applyTranslation(translation, targetDir, {
        dryRun,
        verify,
        verbose
      });
      allStats.push(stats);
    }
  }
  
  // 打印统计
  printStats(allStats, { dryRun, verify });
}
