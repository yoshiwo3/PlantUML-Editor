#!/usr/bin/env node
/**
 * Playwright Test Runner - Node.js v22互換性問題回避版
 * CommonJS形式で実装し、child_processを使用して実行
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 実行するテストコマンドを環境変数から取得
const testCommand = process.argv[2] || 'test';
const testFile = process.argv[3] || '';

// Node.js v22の互換性問題を回避するための環境変数設定
const env = {
    ...process.env,
    NODE_NO_WARNINGS: '1',
    NODE_OPTIONS: '--no-deprecation --no-warnings'
};

// Playwrightの実行可能ファイルのパスを探す
function findPlaywrightExecutable() {
    const possiblePaths = [
        path.join(__dirname, 'node_modules', '.bin', 'playwright'),
        path.join(__dirname, '..', 'node_modules', '.bin', 'playwright'),
        path.join(__dirname, '..', '..', 'node_modules', '.bin', 'playwright')
    ];
    
    for (const execPath of possiblePaths) {
        if (fs.existsSync(execPath) || fs.existsSync(execPath + '.cmd')) {
            return execPath;
        }
    }
    
    // グローバルインストールされている場合
    return 'playwright';
}

// テストコマンドのマッピング
const commands = {
    'test': ['test'],
    'test:headed': ['test', '--headed'],
    'test:debug': ['test', '--debug'],
    'test:ui': ['test', '--ui'],
    'test:chromium': ['test', '--project=chromium'],
    'test:firefox': ['test', '--project=firefox'],
    'test:webkit': ['test', '--project=webkit'],
    'test:edge': ['test', '--project=edge'],
    'test:docker': ['test', '--project=docker'],
    'test:mobile': ['test', '--project=mobile-chrome', '--project=mobile-safari'],
    'test:critical': ['test', 'tests/critical-path.spec.js'],
    'test:performance': ['test', 'tests/performance.spec.js'],
    'show-report': ['show-report'],
    'codegen': ['codegen', 'http://localhost:8086']
};

// 実行するコマンドを決定
let args = commands[testCommand] || ['test'];
if (testFile) {
    args.push(testFile);
}

// Playwrightを実行
const playwrightPath = findPlaywrightExecutable();

console.log('========================================');
console.log('  Playwright Test Runner (Node.js v22 Compatible)');
console.log('========================================');
console.log(`実行コマンド: ${playwrightPath} ${args.join(' ')}`);
console.log('========================================\n');

const playwright = spawn(playwrightPath, args, {
    env: env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
});

// プロセスのエラーハンドリング
playwright.on('error', (error) => {
    console.error('Playwrightの実行に失敗しました:', error.message);
    
    if (error.code === 'ENOENT') {
        console.error('\nPlaywrightがインストールされていません。');
        console.error('以下のコマンドでインストールしてください:');
        console.error('  npm install -D @playwright/test');
        console.error('  npx playwright install');
    }
    
    process.exit(1);
});

// プロセスの終了処理
playwright.on('close', (code) => {
    if (code !== 0) {
        console.error(`\nテストが失敗しました (終了コード: ${code})`);
    } else {
        console.log('\n✅ テストが正常に完了しました');
    }
    process.exit(code);
});

// Ctrl+Cのハンドリング
process.on('SIGINT', () => {
    playwright.kill('SIGINT');
});