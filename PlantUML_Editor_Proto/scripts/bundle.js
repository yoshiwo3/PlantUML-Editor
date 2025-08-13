#!/usr/bin/env node
/**
 * バンドル・ビルドスクリプト
 * JavaScriptファイルの結合、最適化、圧縮を実行
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * ファイル読み込み
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`⚠️ Could not read file: ${filePath}`);
    return '';
  }
}

/**
 * ディレクトリ作成
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * JavaScriptファイルをバンドル
 */
function bundleJavaScript() {
  console.log('📦 Bundling JavaScript files...');
  
  const jsFiles = [
    'TokenTypes.js',
    'ASTTypes.js',
    'PlantUMLASTParser.js',
    'ErrorHandler.js',
    'ValidationEngine.js',
    'IDManager.js',
    'ASTToGUIConverter.js',
    'CursorStateManager.js',
    'DiffCalculator.js',
    'RealtimeSyncManager.js',
    'PerformanceOptimizer.js',
    'drawio-converter.js',
    'app.js'
  ];
  
  let bundled = '';
  bundled += '// PlantUML Editor Proto - Bundled Version\n';
  bundled += `// Generated: ${new Date().toISOString()}\n\n`;
  
  for (const file of jsFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(filePath)) {
      console.log(`  📄 Adding: ${file}`);
      bundled += `// === ${file} ===\n`;
      bundled += readFile(filePath);
      bundled += '\n\n';
    }
  }
  
  // 出力ディレクトリ作成
  const distDir = path.join(PROJECT_ROOT, 'dist');
  ensureDir(distDir);
  
  // バンドルファイル出力
  const bundlePath = path.join(distDir, 'bundle.js');
  fs.writeFileSync(bundlePath, bundled);
  
  console.log(`✅ Bundle created: ${bundlePath}`);
  console.log(`📊 Bundle size: ${Math.round(bundled.length / 1024)} KB`);
}

/**
 * CSSファイルをバンドル
 */
function bundleCSS() {
  console.log('🎨 Bundling CSS files...');
  
  const cssFiles = ['styles.css'];
  let bundled = '';
  bundled += '/* PlantUML Editor Proto - CSS Bundle */\n';
  bundled += `/* Generated: ${new Date().toISOString()} */\n\n`;
  
  for (const file of cssFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(filePath)) {
      console.log(`  🎨 Adding: ${file}`);
      bundled += `/* === ${file} === */\n`;
      bundled += readFile(filePath);
      bundled += '\n\n';
    }
  }
  
  const distDir = path.join(PROJECT_ROOT, 'dist');
  ensureDir(distDir);
  
  const bundlePath = path.join(distDir, 'bundle.css');
  fs.writeFileSync(bundlePath, bundled);
  
  console.log(`✅ CSS Bundle created: ${bundlePath}`);
}

/**
 * HTMLファイルを最適化
 */
function optimizeHTML() {
  console.log('📝 Optimizing HTML...');
  
  const htmlPath = path.join(PROJECT_ROOT, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.warn('⚠️ index.html not found');
    return;
  }
  
  let html = readFile(htmlPath);
  
  // バンドルファイルへの参照に置換
  html = html.replace(
    /<!-- Script includes start -->[\s\S]*?<!-- Script includes end -->/,
    '<script type="module" src="dist/bundle.js"></script>'
  );
  
  html = html.replace(
    /<link rel="stylesheet" href="styles\.css">/,
    '<link rel="stylesheet" href="dist/bundle.css">'
  );
  
  const distDir = path.join(PROJECT_ROOT, 'dist');
  ensureDir(distDir);
  
  const outputPath = path.join(distDir, 'index.html');
  fs.writeFileSync(outputPath, html);
  
  console.log(`✅ Optimized HTML created: ${outputPath}`);
}

/**
 * 依存関係チェック
 */
function checkDependencies() {
  console.log('🔍 Checking dependencies...');
  
  const packagePath = path.join(PROJECT_ROOT, 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.warn('⚠️ package.json not found');
    return;
  }
  
  const pkg = JSON.parse(readFile(packagePath));
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  
  console.log(`📦 Dependencies: ${deps.length}`);
  console.log(`🔧 DevDependencies: ${devDeps.length}`);
  
  return true;
}

/**
 * メインビルド処理
 */
async function build() {
  console.log('🔨 Starting build process...');
  console.log('=====================================');
  
  try {
    checkDependencies();
    bundleJavaScript();
    bundleCSS();
    optimizeHTML();
    
    console.log('=====================================');
    console.log('✅ Build completed successfully!');
    console.log('📁 Output directory: dist/');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// CLIから実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export { build, bundleJavaScript, bundleCSS, optimizeHTML };