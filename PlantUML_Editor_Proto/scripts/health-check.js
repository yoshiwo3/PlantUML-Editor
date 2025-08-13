#!/usr/bin/env node
/**
 * ヘルスチェックスクリプト
 * サーバー、依存関係、設定の健全性をチェック
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

const HEALTH_CHECK_CONFIG = {
  timeouts: {
    http: 5000,
    command: 10000
  },
  endpoints: [
    { url: 'http://localhost:8080', name: 'Local Development Server' },
    { url: 'http://localhost:3000', name: 'Alternative Port 3000' },
    { url: 'https://kroki.io', name: 'Kroki API Service' }
  ],
  requiredFiles: [
    'index.html',
    'app.js',
    'styles.css',
    'package.json'
  ],
  optionalFiles: [
    'README.md',
    'test_checklist.md'
  ]
};

/**
 * カラー出力用のANSIコード
 */
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * ログ出力関数
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * HTTPエンドポイントの健全性チェック
 */
function checkEndpoint(url, timeout = 5000) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https:');
    const httpModule = isHttps ? https : http;
    
    const timer = setTimeout(() => {
      resolve({ status: 'timeout', url, message: 'Request timeout' });
    }, timeout);
    
    const req = httpModule.get(url, (res) => {
      clearTimeout(timer);
      resolve({
        status: res.statusCode < 400 ? 'healthy' : 'error',
        url,
        statusCode: res.statusCode,
        message: `HTTP ${res.statusCode}`
      });
    });
    
    req.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        status: 'error',
        url,
        message: error.message
      });
    });
  });
}

/**
 * ファイル存在チェック
 */
function checkFiles() {
  log('📁 Checking required files...', 'blue');
  
  const results = { required: [], optional: [], missing: [] };
  
  // 必須ファイルチェック
  for (const file of HEALTH_CHECK_CONFIG.requiredFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const stats = fs.statSync(filePath);
      results.required.push({
        file,
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
      log(`  ✅ ${file} (${formatBytes(stats.size)})`, 'green');
    } else {
      results.missing.push(file);
      log(`  ❌ ${file} - Missing`, 'red');
    }
  }
  
  // オプションファイルチェック
  for (const file of HEALTH_CHECK_CONFIG.optionalFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const stats = fs.statSync(filePath);
      results.optional.push({
        file,
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
      log(`  ✅ ${file} (optional)`, 'cyan');
    } else {
      log(`  ⚠️ ${file} - Optional file missing`, 'yellow');
    }
  }
  
  return results;
}

/**
 * コマンド実行チェック
 */
function checkCommand(command, args = [], timeout = 10000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ status: 'timeout', command, message: 'Command timeout' });
    }, timeout);
    
    const process = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        status: code === 0 ? 'success' : 'error',
        command,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    
    process.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        status: 'error',
        command,
        message: error.message
      });
    });
  });
}

/**
 * 依存関係チェック
 */
async function checkDependencies() {
  log('📦 Checking dependencies...', 'blue');
  
  const results = {};
  
  // Node.js チェック
  const nodeCheck = await checkCommand('node', ['--version']);
  if (nodeCheck.status === 'success') {
    log(`  ✅ Node.js: ${nodeCheck.stdout}`, 'green');
    results.node = { version: nodeCheck.stdout, status: 'available' };
  } else {
    log(`  ❌ Node.js: ${nodeCheck.message || 'Not available'}`, 'red');
    results.node = { status: 'unavailable', error: nodeCheck.message };
  }
  
  // Python チェック
  const pythonCheck = await checkCommand('python', ['--version']);
  if (pythonCheck.status === 'success') {
    log(`  ✅ Python: ${pythonCheck.stdout}`, 'green');
    results.python = { version: pythonCheck.stdout, status: 'available' };
  } else {
    log(`  ❌ Python: ${pythonCheck.message || 'Not available'}`, 'red');
    results.python = { status: 'unavailable', error: pythonCheck.message };
  }
  
  // npm パッケージチェック
  const npmCheck = await checkCommand('npm', ['list', '--depth=0']);
  if (npmCheck.status === 'success') {
    log(`  ✅ npm packages: Installed`, 'green');
    results.npm = { status: 'installed' };
  } else {
    log(`  ⚠️ npm packages: ${npmCheck.stderr || 'Issues detected'}`, 'yellow');
    results.npm = { status: 'issues', error: npmCheck.stderr };
  }
  
  return results;
}

/**
 * エンドポイントチェック
 */
async function checkEndpoints() {
  log('🌐 Checking endpoints...', 'blue');
  
  const results = [];
  
  for (const endpoint of HEALTH_CHECK_CONFIG.endpoints) {
    const result = await checkEndpoint(endpoint.url, HEALTH_CHECK_CONFIG.timeouts.http);
    
    if (result.status === 'healthy') {
      log(`  ✅ ${endpoint.name}: ${result.message}`, 'green');
    } else if (result.status === 'timeout') {
      log(`  ⏱️ ${endpoint.name}: Timeout`, 'yellow');
    } else {
      log(`  ❌ ${endpoint.name}: ${result.message}`, 'red');
    }
    
    results.push({ ...result, name: endpoint.name });
  }
  
  return results;
}

/**
 * システム情報取得
 */
async function getSystemInfo() {
  log('💻 System information...', 'blue');
  
  const info = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cwd: process.cwd()
  };
  
  log(`  🖥️ Platform: ${info.platform} (${info.arch})`, 'cyan');
  log(`  ⚡ Node.js: ${info.nodeVersion}`, 'cyan');
  log(`  ⏱️ Process uptime: ${Math.round(info.uptime)}s`, 'cyan');
  log(`  💾 Memory usage: ${formatBytes(info.memory.rss)}`, 'cyan');
  log(`  📁 Working directory: ${info.cwd}`, 'cyan');
  
  return info;
}

/**
 * プロジェクト構成チェック
 */
function checkProjectStructure() {
  log('🏗️ Checking project structure...', 'blue');
  
  const expectedDirs = ['scripts'];
  const actualDirs = [];
  const missingDirs = [];
  
  for (const dir of expectedDirs) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(dirPath)) {
      actualDirs.push(dir);
      log(`  ✅ Directory: ${dir}/`, 'green');
    } else {
      missingDirs.push(dir);
      log(`  ❌ Directory: ${dir}/ - Missing`, 'red');
    }
  }
  
  // package.json の内容チェック
  const packagePath = path.join(PROJECT_ROOT, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      log(`  ✅ package.json: Valid (${pkg.name}@${pkg.version})`, 'green');
      
      const scriptCount = Object.keys(pkg.scripts || {}).length;
      log(`  📜 NPM scripts: ${scriptCount} defined`, 'cyan');
      
    } catch (error) {
      log(`  ❌ package.json: Invalid JSON`, 'red');
    }
  }
  
  return { actualDirs, missingDirs };
}

/**
 * バイト数フォーマット
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 総合スコア計算
 */
function calculateHealthScore(results) {
  let score = 0;
  let maxScore = 0;
  
  // ファイルチェック (30点)
  maxScore += 30;
  const missingRequired = results.files.missing.length;
  if (missingRequired === 0) {
    score += 30;
  } else {
    score += Math.max(0, 30 - (missingRequired * 10));
  }
  
  // 依存関係チェック (30点)
  maxScore += 30;
  if (results.dependencies.node?.status === 'available') score += 15;
  if (results.dependencies.python?.status === 'available') score += 10;
  if (results.dependencies.npm?.status === 'installed') score += 5;
  
  // エンドポイントチェック (25点)
  maxScore += 25;
  const healthyEndpoints = results.endpoints.filter(e => e.status === 'healthy').length;
  score += (healthyEndpoints / results.endpoints.length) * 25;
  
  // プロジェクト構成 (15点)
  maxScore += 15;
  if (results.structure.missingDirs.length === 0) score += 15;
  
  return Math.round((score / maxScore) * 100);
}

/**
 * メインヘルスチェック関数
 */
async function runHealthCheck() {
  log(`${colors.bold}🏥 PlantUML Editor Proto - Health Check${colors.reset}`, 'cyan');
  log('=====================================', 'cyan');
  
  const results = {
    timestamp: new Date().toISOString(),
    files: {},
    dependencies: {},
    endpoints: [],
    system: {},
    structure: {}
  };
  
  try {
    // システム情報
    results.system = await getSystemInfo();
    console.log('');
    
    // ファイルチェック
    results.files = checkFiles();
    console.log('');
    
    // プロジェクト構成
    results.structure = checkProjectStructure();
    console.log('');
    
    // 依存関係チェック
    results.dependencies = await checkDependencies();
    console.log('');
    
    // エンドポイントチェック
    results.endpoints = await checkEndpoints();
    console.log('');
    
    // 総合評価
    const healthScore = calculateHealthScore(results);
    
    log('=====================================', 'cyan');
    log(`📊 Overall Health Score: ${healthScore}%`, healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red');
    
    if (healthScore >= 80) {
      log('✅ System is healthy!', 'green');
    } else if (healthScore >= 60) {
      log('⚠️ System has some issues but is functional', 'yellow');
    } else {
      log('❌ System has significant issues', 'red');
    }
    
    // レポート保存
    const reportPath = path.join(PROJECT_ROOT, 'health-check-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log(`📄 Detailed report saved: health-check-report.json`, 'cyan');
    
    return results;
    
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// CLIから実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck();
}

export { runHealthCheck, checkEndpoint, checkFiles, checkDependencies };