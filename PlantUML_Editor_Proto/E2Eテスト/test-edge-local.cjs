/**
 * Microsoft Edge専用のローカルE2Eテストスクリプト
 * Node.js v22でも動作するように調整
 */

const { chromium } = require('playwright');

// テスト結果
const results = {
    passed: [],
    failed: [],
    startTime: Date.now()
};

// カラー出力
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, symbol, message) {
    console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

// テスト実行関数
async function runTest(name, testFn) {
    try {
        log('blue', 'ℹ', `実行中: ${name}`);
        const start = Date.now();
        await testFn();
        const duration = Date.now() - start;
        log('green', '✓', `${name} (${duration}ms)`);
        results.passed.push({ name, duration });
    } catch (error) {
        log('red', '✗', `${name}: ${error.message}`);
        results.failed.push({ name, error: error.message });
    }
}

// メインテスト
async function main() {
    console.log('\n' + colors.cyan + '=' .repeat(50));
    console.log('  Microsoft Edge E2Eテスト (ローカル環境)');
    console.log('=' .repeat(50) + colors.reset + '\n');
    
    let browser;
    
    try {
        // Microsoft Edgeを起動
        // 重要: channelオプションを使用してEdgeを指定
        browser = await chromium.launch({
            channel: 'msedge',  // Microsoft Edgeを使用
            headless: false,    // ヘッドレスモードを無効化（視覚的に確認可能）
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        log('green', '✓', 'Microsoft Edgeを起動しました');
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP',
            ignoreHTTPSErrors: true
        });
        
        const page = await context.newPage();
        
        // コンソールメッセージの記録
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`[Browser Error] ${msg.text()}`);
            }
        });
        
        // テストケース実行
        await runTest('CP-001: 初期画面表示', async () => {
            await page.goto('http://localhost:8086', { waitUntil: 'networkidle' });
            const title = await page.title();
            if (!title.includes('PlantUML')) {
                throw new Error(`タイトルが不正: ${title}`);
            }
        });
        
        await runTest('CP-002: 主要要素の存在確認', async () => {
            await page.goto('http://localhost:8086', { waitUntil: 'networkidle' });
            
            const selectors = [
                '.selected-actors',
                'h4',
                '#plantuml-code',
                'h3'
            ];
            
            for (const selector of selectors) {
                const exists = await page.locator(selector).count() > 0;
                if (!exists) {
                    throw new Error(`要素が見つかりません: ${selector}`);
                }
            }
        });
        
        await runTest('CP-003: アクター追加機能', async () => {
            await page.goto('http://localhost:8086', { waitUntil: 'networkidle' });
            
            // 顧客ボタンをクリック
            const customerBtn = page.locator('button:has-text("顧客")').first();
            const btnCount = await customerBtn.count();
            
            if (btnCount > 0) {
                await customerBtn.click();
                await page.waitForTimeout(1000);
                
                const code = await page.locator('#plantuml-code').inputValue();
                if (!code.includes('顧客')) {
                    throw new Error('アクターがコードに反映されていません');
                }
            } else {
                throw new Error('顧客ボタンが見つかりません');
            }
        });
        
        await runTest('CP-004: 複数アクター追加', async () => {
            await page.goto('http://localhost:8086', { waitUntil: 'networkidle' });
            
            // 複数のアクターを追加
            await page.click('button:has-text("顧客")');
            await page.waitForTimeout(500);
            await page.click('button:has-text("ECサイト")');
            await page.waitForTimeout(500);
            await page.click('button:has-text("決済サービス")');
            await page.waitForTimeout(500);
            
            const code = await page.locator('#plantuml-code').inputValue();
            if (!code.includes('顧客') || !code.includes('ECサイト') || !code.includes('決済サービス')) {
                throw new Error('複数アクターが正しく追加されていません');
            }
        });
        
        await runTest('CP-005: パターン選択機能', async () => {
            await page.goto('http://localhost:8086', { waitUntil: 'networkidle' });
            
            const patternBtn = page.locator('button:has-text("パターン選択")');
            if (await patternBtn.count() > 0) {
                await patternBtn.click();
                await page.waitForTimeout(1000);
                
                // パターン一覧が表示されているか確認
                const patterns = await page.locator('.pattern-card').count();
                if (patterns === 0) {
                    throw new Error('パターンが表示されていません');
                }
            } else {
                throw new Error('パターン選択ボタンが見つかりません');
            }
        });
        
        await runTest('PERF-001: ページ読み込み速度', async () => {
            const start = Date.now();
            await page.goto('http://localhost:8086', { waitUntil: 'networkidle' });
            const loadTime = Date.now() - start;
            
            log('blue', 'ℹ', `読み込み時間: ${loadTime}ms`);
            
            if (loadTime > 5000) {
                throw new Error(`読み込みが遅すぎます: ${loadTime}ms`);
            }
        });
        
        // スクリーンショットを撮影
        await page.screenshot({ 
            path: 'test-results/edge-test-final.png',
            fullPage: true 
        });
        log('blue', '📸', 'スクリーンショットを保存しました: test-results/edge-test-final.png');
        
        await browser.close();
        
    } catch (error) {
        log('red', '✗', `致命的エラー: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
    
    // 結果サマリー
    console.log('\n' + colors.cyan + '=' .repeat(50));
    console.log('  テスト結果');
    console.log('=' .repeat(50) + colors.reset + '\n');
    
    const total = results.passed.length + results.failed.length;
    const duration = Date.now() - results.startTime;
    
    console.log(`実行時間: ${(duration / 1000).toFixed(2)}秒`);
    console.log(`テスト数: ${total}`);
    log('green', '✓', `成功: ${results.passed.length}`);
    log('red', '✗', `失敗: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
        console.log('\n失敗したテスト:');
        results.failed.forEach(test => {
            log('red', '-', `${test.name}: ${test.error}`);
        });
    }
    
    // 終了コード
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    log('red', '✗', `未処理のエラー: ${error}`);
    process.exit(1);
});

// Edgeがインストールされているか確認
const { execSync } = require('child_process');
try {
    // Windowsの場合
    if (process.platform === 'win32') {
        execSync('where msedge', { stdio: 'ignore' });
    }
    log('green', '✓', 'Microsoft Edgeが検出されました');
} catch (error) {
    log('yellow', '⚠', 'Microsoft Edgeが見つかりません。インストールしてください。');
    process.exit(1);
}

// 実行
main().catch(error => {
    log('red', '✗', `実行エラー: ${error}`);
    process.exit(1);
});