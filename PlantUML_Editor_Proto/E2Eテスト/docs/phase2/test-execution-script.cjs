/**
 * Docker環境でのテスト実行確認スクリプト
 * 各テストファイルを個別に実行して動作確認
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 実行環境チェック
const isDocker = fs.existsSync('/.dockerenv');
const baseUrl = process.env.BASE_URL || 'http://localhost:8086';

console.log(`===========================================`);
console.log(`  Phase2 テスト実行環境確認`);
console.log(`===========================================`);
console.log(`実行環境: ${isDocker ? 'Docker' : 'Local'}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`作業ディレクトリ: ${__dirname}`);
console.log(`===========================================\n`);

// テストファイルの構文チェック
async function checkSyntax(filename) {
    return new Promise((resolve) => {
        const child = spawn('node', ['--check', filename], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stderr = '';
        child.stderr.on('data', (data) => {
            stderr += data;
        });
        
        child.on('close', (code) => {
            resolve({
                filename,
                valid: code === 0,
                error: stderr
            });
        });
    });
}

// 依存関係チェック
async function checkDependencies() {
    console.log('📦 依存関係チェック...');
    
    try {
        const packagePath = path.join(__dirname, 'package.json');
        if (!fs.existsSync(packagePath)) {
            console.log('❌ package.json が見つかりません');
            return false;
        }
        
        const nodeModulesPath = path.join(__dirname, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('❌ node_modules が見つかりません');
            return false;
        }
        
        // playwright の確認
        const playwrightPath = path.join(__dirname, 'node_modules', 'playwright');
        if (!fs.existsSync(playwrightPath)) {
            console.log('❌ playwright が見つかりません');
            return false;
        }
        
        console.log('✅ 依存関係チェック完了');
        return true;
    } catch (error) {
        console.log(`❌ 依存関係チェック失敗: ${error.message}`);
        return false;
    }
}

// アプリケーション接続テスト
async function testConnection() {
    console.log('🌐 アプリケーション接続テスト...');
    
    try {
        // Node.js v18以降のfetch、v17以下では失敗する可能性がある
        let response;
        if (typeof fetch !== 'undefined') {
            response = await fetch(baseUrl);
        } else {
            console.log('⚠️  fetch API が利用できません（Node.js v18未満）');
            return false;
        }
        
        if (response.ok) {
            console.log('✅ アプリケーション接続成功');
            return true;
        } else {
            console.log(`⚠️  アプリケーション応答エラー: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`⚠️  アプリケーション接続失敗: ${error.message}`);
        return false;
    }
}

// メイン実行
async function main() {
    const testFiles = [
        'test-sync-functionality.cjs',
        'test-complex-flows.cjs',
        'test-performance-metrics.cjs',
        'test-runner-phase2.cjs'
    ];
    
    // 1. 依存関係チェック
    const depsOk = await checkDependencies();
    if (!depsOk) {
        console.log('❌ 依存関係の問題により実行を中断します\n');
        return;
    }
    
    // 2. 構文チェック
    console.log('\n📝 テストファイル構文チェック...');
    const syntaxResults = [];
    
    for (const file of testFiles) {
        const result = await checkSyntax(file);
        syntaxResults.push(result);
        
        if (result.valid) {
            console.log(`✅ ${file}: 構文OK`);
        } else {
            console.log(`❌ ${file}: 構文エラー`);
            console.log(`   ${result.error.trim()}`);
        }
    }
    
    const allValid = syntaxResults.every(r => r.valid);
    
    // 3. アプリケーション接続テスト
    console.log('\n');
    const connectionOk = await testConnection();
    
    // 4. サマリーレポート
    console.log('\n===========================================');
    console.log('  実行確認結果サマリー');
    console.log('===========================================');
    console.log(`依存関係: ${depsOk ? '✅ OK' : '❌ NG'}`);
    console.log(`構文チェック: ${allValid ? '✅ OK' : '❌ NG'}`);
    console.log(`アプリケーション接続: ${connectionOk ? '✅ OK' : '⚠️  接続できません'}`);
    
    if (depsOk && allValid) {
        console.log('\n🎉 すべてのテストファイルが実行可能です！');
        
        if (connectionOk) {
            console.log('\n📋 推奨実行コマンド:');
            console.log('├─ 全体実行: node test-runner-phase2.cjs');
            console.log('├─ 同期テスト: node test-sync-functionality.cjs');
            console.log('├─ 複雑フロー: node test-complex-flows.cjs');
            console.log('└─ パフォーマンス: node test-performance-metrics.cjs');
        } else {
            console.log('\n⚠️  アプリケーションが起動していない可能性があります');
            console.log('   http://localhost:8086 でアプリケーションを起動してください');
        }
        
        console.log('\n🐳 Docker実行コマンド:');
        console.log('├─ ビルド: docker-compose build');
        console.log('├─ 全実行: docker-compose run --rm playwright npm run test:all');
        console.log('└─ シェル: docker-compose run --rm playwright bash');
        
    } else {
        console.log('\n❌ 問題が見つかりました。上記エラーを修正してください。');
    }
    
    console.log('\n===========================================\n');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    console.error('❌ 未処理エラー:', error);
});

// 実行
main().catch(error => {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
});