#!/usr/bin/env node
/**
 * クリーンアップスクリプト
 * 生成ファイル、キャッシュ、ログファイルの削除
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * ディレクトリの再帰的削除
 */
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * ファイル削除
 */
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * ファイルパターンマッチング削除
 */
function removeFilesByPattern(dirPath, pattern) {
  if (!fs.existsSync(dirPath)) return 0;
  
  let count = 0;
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && pattern.test(file)) {
      removeFile(filePath);
      count++;
    }
  }
  
  return count;
}

/**
 * ビルドファイルをクリーンアップ
 */
function cleanBuildFiles() {
  console.log('🧹 Cleaning build files...');
  
  const distDir = path.join(PROJECT_ROOT, 'dist');
  if (removeDirectory(distDir)) {
    console.log('  ✅ Removed dist/ directory');
  }
  
  const bundleFiles = [
    'bundle.js',
    'bundle.css',
    'bundle.min.js',
    'bundle.min.css'
  ];
  
  let removed = 0;
  for (const file of bundleFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (removeFile(filePath)) {
      console.log(`  ✅ Removed ${file}`);
      removed++;
    }
  }
  
  console.log(`📦 Build files cleaned: ${removed} files`);
}

/**
 * ログファイルをクリーンアップ
 */
function cleanLogFiles() {
  console.log('📝 Cleaning log files...');
  
  const logPatterns = [
    { dir: PROJECT_ROOT, pattern: /\.log$/ },
    { dir: PROJECT_ROOT, pattern: /console_.*\.txt$/ },
    { dir: path.join(PROJECT_ROOT, 'log'), pattern: /.*/ }
  ];
  
  let totalRemoved = 0;
  
  for (const { dir, pattern } of logPatterns) {
    const removed = removeFilesByPattern(dir, pattern);
    totalRemoved += removed;
  }
  
  // log ディレクトリ自体も削除
  const logDir = path.join(PROJECT_ROOT, 'log');
  if (removeDirectory(logDir)) {
    console.log('  ✅ Removed log/ directory');
  }
  
  console.log(`📝 Log files cleaned: ${totalRemoved} files`);
}

/**
 * キャッシュファイルをクリーンアップ
 */
function cleanCacheFiles() {
  console.log('💾 Cleaning cache files...');
  
  const cachePatterns = [
    { dir: PROJECT_ROOT, pattern: /\.cache$/ },
    { dir: PROJECT_ROOT, pattern: /\.tmp$/ },
    { dir: PROJECT_ROOT, pattern: /temp_.*/ },
    { dir: PROJECT_ROOT, pattern: /\.backup$/ }
  ];
  
  let totalRemoved = 0;
  
  for (const { dir, pattern } of cachePatterns) {
    const removed = removeFilesByPattern(dir, pattern);
    totalRemoved += removed;
  }
  
  // node_modules/.cache も削除
  const nodeCacheDir = path.join(PROJECT_ROOT, 'node_modules', '.cache');
  if (removeDirectory(nodeCacheDir)) {
    console.log('  ✅ Removed node_modules/.cache');
  }
  
  console.log(`💾 Cache files cleaned: ${totalRemoved} files`);
}

/**
 * テストファイルをクリーンアップ
 */
function cleanTestFiles() {
  console.log('🧪 Cleaning test artifacts...');
  
  const testPatterns = [
    { dir: PROJECT_ROOT, pattern: /test-result.*\.html$/ },
    { dir: PROJECT_ROOT, pattern: /coverage\.html$/ },
    { dir: PROJECT_ROOT, pattern: /\.test\.log$/ }
  ];
  
  let totalRemoved = 0;
  
  for (const { dir, pattern } of testPatterns) {
    const removed = removeFilesByPattern(dir, pattern);
    totalRemoved += removed;
  }
  
  // coverage ディレクトリも削除
  const coverageDir = path.join(PROJECT_ROOT, 'coverage');
  if (removeDirectory(coverageDir)) {
    console.log('  ✅ Removed coverage/ directory');
  }
  
  console.log(`🧪 Test artifacts cleaned: ${totalRemoved} files`);
}

/**
 * スクリーンショットファイルをクリーンアップ
 */
function cleanScreenshots() {
  console.log('📸 Cleaning screenshots...');
  
  const screenshotPatterns = [
    { dir: PROJECT_ROOT, pattern: /スクリーンショット.*\.png$/ },
    { dir: PROJECT_ROOT, pattern: /screenshot.*\.png$/ }
  ];
  
  let totalRemoved = 0;
  
  for (const { dir, pattern } of screenshotPatterns) {
    const removed = removeFilesByPattern(dir, pattern);
    totalRemoved += removed;
  }
  
  console.log(`📸 Screenshots cleaned: ${totalRemoved} files`);
}

/**
 * 古いデバッグディレクトリをクリーンアップ
 */
function cleanDebugDirectories() {
  console.log('🐛 Cleaning debug directories...');
  
  const debugPatterns = [
    /^consoleエラー対応_\d{8}_\d{4}$/,
    /^debug_\d+$/,
    /^temp_debug_.*$/
  ];
  
  if (!fs.existsSync(PROJECT_ROOT)) return;
  
  const entries = fs.readdirSync(PROJECT_ROOT);
  let removedCount = 0;
  
  for (const entry of entries) {
    const entryPath = path.join(PROJECT_ROOT, entry);
    const stat = fs.statSync(entryPath);
    
    if (stat.isDirectory()) {
      for (const pattern of debugPatterns) {
        if (pattern.test(entry)) {
          // 7日以上古いディレクトリのみ削除
          const age = Date.now() - stat.mtime.getTime();
          const daysOld = age / (1000 * 60 * 60 * 24);
          
          if (daysOld > 7) {
            removeDirectory(entryPath);
            console.log(`  ✅ Removed old debug directory: ${entry}`);
            removedCount++;
          }
          break;
        }
      }
    }
  }
  
  console.log(`🐛 Debug directories cleaned: ${removedCount} directories`);
}

/**
 * 使用量レポート
 */
function reportUsage() {
  console.log('📊 Disk usage report...');
  
  const directories = ['dist', 'log', 'coverage', 'node_modules'];
  
  for (const dir of directories) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const stats = fs.statSync(dirPath);
        const size = getSizeRecursive(dirPath);
        console.log(`  📁 ${dir}: ${formatBytes(size)}`);
      } catch (error) {
        console.log(`  📁 ${dir}: <unable to calculate>`);
      }
    }
  }
}

/**
 * ディレクトリサイズを再帰計算
 */
function getSizeRecursive(dirPath) {
  let size = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        size += getSizeRecursive(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch (error) {
    // アクセス権限エラーなどをスキップ
  }
  
  return size;
}

/**
 * バイト数を人間が読める形式に変換
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * メインクリーンアップ処理
 */
function clean(options = {}) {
  console.log('🧹 Starting cleanup process...');
  console.log('=====================================');
  
  const {
    buildFiles = true,
    logFiles = true,
    cacheFiles = true,
    testFiles = true,
    screenshots = false,
    debugDirs = false,
    showUsage = true
  } = options;
  
  if (showUsage) {
    reportUsage();
    console.log('');
  }
  
  if (buildFiles) cleanBuildFiles();
  if (logFiles) cleanLogFiles();
  if (cacheFiles) cleanCacheFiles();
  if (testFiles) cleanTestFiles();
  if (screenshots) cleanScreenshots();
  if (debugDirs) cleanDebugDirectories();
  
  console.log('=====================================');
  console.log('✅ Cleanup completed!');
}

/**
 * コマンドライン引数処理
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  if (args.includes('--all')) {
    return { 
      buildFiles: true, 
      logFiles: true, 
      cacheFiles: true, 
      testFiles: true, 
      screenshots: true, 
      debugDirs: true 
    };
  }
  
  if (args.includes('--build-only')) {
    return { buildFiles: true, logFiles: false, cacheFiles: false, testFiles: false };
  }
  
  if (args.includes('--logs-only')) {
    return { buildFiles: false, logFiles: true, cacheFiles: false, testFiles: false };
  }
  
  return options;
}

// CLIから実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  clean(options);
}

export { clean, cleanBuildFiles, cleanLogFiles, cleanCacheFiles };