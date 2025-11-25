import * as esbuild from 'esbuild';
import { readFileSync, copyFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 輸出目錄
const outDir = join(__dirname, 'dist');

// 確保輸出目錄存在
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const isWatch = process.argv.includes('--watch');
const useOriginal = process.argv.includes('--original');

// 如果使用 --original，直接複製原始檔案
if (useOriginal) {
  console.log('\n📦 使用原始檔案模式（完整功能版）');
  console.log('🔨 複製 telegram.work.js 到 dist/...\n');
  
  const source = join(__dirname, 'telegram.work.js');
  const dest = join(__dirname, 'dist', 'telegram.work.js');
  
  try {
    copyFileSync(source, dest);
    
    const stats = statSync(dest);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const content = readFileSync(dest, 'utf-8');
    const lines = content.split('\n').length;
    
    console.log('✅ 複製完成！');
    console.log(`📦 檔案大小: ${sizeKB} KB`);
    console.log(`📝 行數: ${lines} 行`);
    console.log('📌 部署此檔案即可使用完整功能\n');
  } catch (error) {
    console.error('❌ 複製失敗:', error);
    process.exit(1);
  }
  process.exit(0);
}

// 模組化開發模式
const buildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/telegram.work.modular.js',
  format: 'esm',
  target: 'esnext',
  platform: 'browser',
  minify: false,
  sourcemap: false,
  banner: {
    js: `// Built: ${new Date().toISOString()}\n// Auto-generated from src/ (模組化開發版)\n`
  },
  logLevel: 'info',
};

async function build() {
  try {
    if (isWatch) {
      console.log('👀 監聽模式啟動（模組化開發版）...');
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('✅ 正在監聽檔案變更...\n');
    } else {
      console.log('\n🔨 開始打包（模組化開發版）...');
      await esbuild.build(buildOptions);
      const stats = readFileSync('dist/telegram.work.modular.js', 'utf-8');
      console.log('✅ 打包完成！輸出: dist/telegram.work.modular.js');
      console.log(`📦 檔案大小: ${(stats.length / 1024).toFixed(2)} KB`);
      console.log(`📝 行數: ${stats.split('\n').length} 行\n`);
    }
  } catch (error) {
    console.error('❌ 打包失敗:', error);
    process.exit(1);
  }
}

build();
