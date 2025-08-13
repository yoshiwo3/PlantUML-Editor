/**
 * Docker環境用Playwrightテストスクリプト
 * Node.js 20環境で実行
 */

const playwright = require('playwright');

// 環境変数からベースURLを取得
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';

// テスト結果
const results = {
    passed: [],
    failed: [],
    startTime: Date.now()
};

// カラー出力用のヘルパー（Docker環境でも動作）
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
    console.log('  PlantUMLエディタ E2Eテスト (Docker環境)');
    console.log('=' .repeat(50) + colors.reset + '\n');
    
    log('blue', 'ℹ', `ベースURL: ${BASE_URL}`);
    
    // ブラウザタイプの選択
    const browserType = process.argv[2] || 'chromium';
    log('blue', 'ℹ', `ブラウザ: ${browserType}`);
    
    let browser;
    
    try {
        // ブラウザ起動
        switch (browserType) {
            case 'firefox':
                browser = await playwright.firefox.launch({ 
                    headless: true,
                    args: ['--no-sandbox']
                });
                break;
            case 'webkit':
                browser = await playwright.webkit.launch({ 
                    headless: true,
                    args: ['--no-sandbox']
                });
                break;
            default:
                browser = await playwright.chromium.launch({ 
                    headless: true,
                    args: ['--no-sandbox', '--disable-dev-shm-usage']
                });
        }
        
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
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            const title = await page.title();
            if (!title.includes('PlantUML')) {
                throw new Error(`タイトルが不正: ${title}`);
            }
        });
        
        await runTest('CP-002: 主要要素の存在確認', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const selectors = [
                '.selected-actors',  // アクターリスト
                'h4',                // 見出し要素（処理フローなど）
                '#plantuml-code',    // PlantUMLコード
                'h3'                 // セクション見出し（プレビューなど）
            ];
            
            for (const selector of selectors) {
                const exists = await page.locator(selector).count() > 0;
                if (!exists) {
                    throw new Error(`要素が見つかりません: ${selector}`);
                }
            }
        });
        
        await runTest('CP-003: アクター追加機能', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 顧客ボタンを探す
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
        
        await runTest('CP-004: パターン選択機能', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
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
        
        await runTest('CP-005: PlantUMLコード生成', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 何かアクションを行う
            const btn = page.locator('button').first();
            if (await btn.count() > 0) {
                await btn.click();
                await page.waitForTimeout(500);
            }
            
            const code = await page.locator('#plantuml-code').inputValue();
            if (!code.includes('@startuml')) {
                throw new Error('PlantUMLコードが生成されていません');
            }
        });
        
        await runTest('PERF-001: ページ読み込み速度', async () => {
            const start = Date.now();
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            const loadTime = Date.now() - start;
            
            log('blue', 'ℹ', `読み込み時間: ${loadTime}ms`);
            
            if (loadTime > 5000) {
                throw new Error(`読み込みが遅すぎます: ${loadTime}ms`);
            }
        });
        
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

// 実行
main().catch(error => {
    log('red', '✗', `実行エラー: ${error}`);
    process.exit(1);
});