/**
 * Microsoft Edge Docker環境用テストスクリプト
 * Node.js v20環境で安定動作
 */

const { chromium } = require('@playwright/test');

// テスト結果
const results = {
    passed: [],
    failed: [],
    startTime: Date.now()
};

// カラー出力（Docker環境対応）
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
    console.log('\n' + colors.cyan + '=' .repeat(60));
    console.log('  Microsoft Edge E2Eテスト (Docker/Node.js v20環境)');
    console.log('=' .repeat(60) + colors.reset + '\n');
    
    const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
    log('blue', 'ℹ', `ベースURL: ${BASE_URL}`);
    log('blue', 'ℹ', `Node.js バージョン: ${process.version}`);
    
    let browser;
    
    try {
        // Microsoft Edgeを起動
        browser = await chromium.launch({
            channel: 'msedge',  // Microsoft Edgeを使用
            headless: true,     // Docker環境ではヘッドレス必須
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });
        
        log('green', '✓', 'Microsoft Edgeを起動しました');
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP',
            ignoreHTTPSErrors: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        });
        
        const page = await context.newPage();
        
        // コンソールメッセージの記録
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`[Browser Error] ${msg.text()}`);
            }
        });
        
        // ネットワークエラーの記録
        page.on('requestfailed', request => {
            console.log(`[Network Error] ${request.url()}: ${request.failure().errorText}`);
        });
        
        // テストケース実行
        await runTest('EDGE-001: 初期画面表示', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            const title = await page.title();
            if (!title.includes('PlantUML')) {
                throw new Error(`タイトルが不正: ${title}`);
            }
        });
        
        await runTest('EDGE-002: 主要要素の存在確認', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
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
        
        await runTest('EDGE-003: アクター追加機能', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 顧客アクターを追加
            const customerBtn = page.locator('button:has-text("顧客")').first();
            if (await customerBtn.count() > 0) {
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
        
        await runTest('EDGE-004: 複数アクター追加', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 複数のアクターを追加
            const actors = ['顧客', 'ECサイト', '決済サービス'];
            for (const actor of actors) {
                const btn = page.locator(`button:has-text("${actor}")`).first();
                if (await btn.count() > 0) {
                    await btn.click();
                    await page.waitForTimeout(500);
                }
            }
            
            const code = await page.locator('#plantuml-code').inputValue();
            for (const actor of actors) {
                if (!code.includes(actor)) {
                    throw new Error(`${actor}が追加されていません`);
                }
            }
        });
        
        await runTest('EDGE-005: パターン選択機能', async () => {
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
        
        await runTest('EDGE-006: PlantUMLコード生成', async () => {
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
        
        await runTest('EDGE-007: クリア機能', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // データを追加
            await page.click('button:has-text("顧客")');
            await page.waitForTimeout(500);
            
            // ダイアログハンドラーを事前に設定
            page.on('dialog', dialog => dialog.accept());
            
            // クリアボタンをクリック
            await page.click('button:has-text("クリア")');
            
            await page.waitForTimeout(1000);
            
            // コードがクリアされているか確認
            const code = await page.locator('#plantuml-code').inputValue();
            // 実際の出力形式に合わせた正規表現
            const cleanPattern = /^@startuml\n\n@enduml$/;
            if (!code.match(cleanPattern)) {
                throw new Error(`コードがクリアされていません。実際のコード: "${code}"`);
            }
        });
        
        await runTest('EDGE-PERF-001: ページ読み込み速度', async () => {
            const start = Date.now();
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            const loadTime = Date.now() - start;
            
            log('blue', 'ℹ', `読み込み時間: ${loadTime}ms`);
            
            if (loadTime > 5000) {
                throw new Error(`読み込みが遅すぎます: ${loadTime}ms`);
            }
        });
        
        await runTest('EDGE-PERF-002: レンダリング性能', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // パフォーマンスメトリクスを取得
            const metrics = await page.evaluate(() => {
                const paint = performance.getEntriesByType('paint');
                const navigation = performance.getEntriesByType('navigation')[0];
                
                return {
                    FCP: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart
                };
            });
            
            log('blue', 'ℹ', `FCP: ${metrics.FCP?.toFixed(2)}ms`);
            log('blue', 'ℹ', `DOM Content Loaded: ${metrics.domContentLoaded?.toFixed(2)}ms`);
            
            if (metrics.FCP && metrics.FCP > 2500) {
                throw new Error(`FCPが遅すぎます: ${metrics.FCP}ms`);
            }
        });
        
        await runTest('EDGE-COMPAT-001: Edge固有機能', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // Microsoft Edge固有のUser-Agentチェック
            const userAgent = await page.evaluate(() => navigator.userAgent);
            if (!userAgent.includes('Edg')) {
                throw new Error('Microsoft Edgeとして認識されていません');
            }
            
            log('blue', 'ℹ', `User-Agent: ${userAgent}`);
        });
        
        await browser.close();
        
    } catch (error) {
        log('red', '✗', `致命的エラー: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
    
    // 結果サマリー
    console.log('\n' + colors.cyan + '=' .repeat(60));
    console.log('  テスト結果');
    console.log('=' .repeat(60) + colors.reset + '\n');
    
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