/**
 * テストファイルの構文エラー修正スクリプト
 * .cjsファイル内の不適切なrequire文とplaywright参照を修正
 */

const fs = require('fs');
const path = require('path');

// 修正対象ファイル
const testFiles = [
    'test-sync-functionality.cjs',
    'test-complex-flows.cjs',
    'test-performance-metrics.cjs',
    'test-runner-phase2.cjs'
];

console.log('テストファイルの構文エラー修正を開始...\n');

// test-sync-functionality.cjs の修正
const syncFile = path.join(__dirname, 'test-sync-functionality.cjs');
if (fs.existsSync(syncFile)) {
    let content = fs.readFileSync(syncFile, 'utf8');
    
    // playwright の import を修正
    if (content.includes("const { chromium } = require('playwright');")) {
        content = content.replace(
            "const { chromium } = require('playwright');",
            "const playwright = require('playwright');"
        );
        console.log('✓ test-sync-functionality.cjs - playwright import修正');
    }
    
    fs.writeFileSync(syncFile, content);
    console.log('✅ test-sync-functionality.cjs 修正完了\n');
}

// test-runner-phase2.cjs のファイル拡張子参照修正
const runnerFile = path.join(__dirname, 'test-runner-phase2.cjs');
if (fs.existsSync(runnerFile)) {
    let content = fs.readFileSync(runnerFile, 'utf8');
    let modified = false;
    
    if (content.includes("'test-sync-functionality.js'")) {
        content = content.replace(
            "'test-sync-functionality.js'",
            "'test-sync-functionality.cjs'"
        );
        modified = true;
        console.log('✓ test-runner-phase2.cjs - sync test file extension修正');
    }
    
    if (content.includes("'test-complex-flows.js'")) {
        content = content.replace(
            "'test-complex-flows.js'",
            "'test-complex-flows.cjs'"
        );
        modified = true;
        console.log('✓ test-runner-phase2.cjs - complex flows file extension修正');
    }
    
    if (content.includes("'test-performance-metrics.js'")) {
        content = content.replace(
            "'test-performance-metrics.js'",
            "'test-performance-metrics.cjs'"
        );
        modified = true;
        console.log('✓ test-runner-phase2.cjs - performance test file extension修正');
    }
    
    if (modified) {
        fs.writeFileSync(runnerFile, content);
        console.log('✅ test-runner-phase2.cjs 修正完了\n');
    } else {
        console.log('ℹ️  test-runner-phase2.cjs - 修正不要\n');
    }
}

console.log('すべての修正が完了しました。');

// fetch関数の追加（Node.js v17以下では必要な場合）
const nodeVersion = parseInt(process.version.split('.')[0].substring(1));
if (nodeVersion < 18) {
    console.log('⚠️  Node.js v18未満のため、fetchポリフィルが必要な場合があります。');
    console.log('   必要に応じて node-fetch をインストールしてください。');
}