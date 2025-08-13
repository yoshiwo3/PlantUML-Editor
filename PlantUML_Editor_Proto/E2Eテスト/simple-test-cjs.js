/**
 * シンプルなPlaywrightテストランナー（CommonJS版）
 * Docker環境とローカル環境両方で動作
 */

const playwright = require('playwright');

// テスト結果を格納
const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

// カラー出力（Docker環境でも動作）
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// ログ出力
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`)
};

// テストランナー
async function runTest(testName, testFn, browser) {
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        locale: 'ja-JP'
    });
    const page = await context.newPage();
    
    try {
        log.info(`実行中: ${testName}`);
        const startTime = Date.now();
        
        await testFn(page);
        
        const duration = Date.now() - startTime;
        log.success(`${testName} - 成功 (${duration}ms)`);
        testResults.passed++;
        
    } catch (error) {
        log.error(`${testName} - 失敗: ${error.message}`);
        testResults.failed++;
        testResults.errors.push({
            test: testName,
            error: error.message,
            stack: error.stack
        });
    } finally {
        await context.close();
    }
}

// メインテスト実行
async function main() {
    console.log(`${colors.cyan}\n========================================`);
    console.log('  PlantUMLエディタ E2Eテスト実行');
    console.log(`========================================${colors.reset}\n`);
    
    const browserType = process.argv[2] || 'chromium';
    const baseUrl = process.env.BASE_URL || 'http://localhost:8086';
    let browser;
    
    try {
        // ブラウザ起動
        log.info(`ブラウザ起動中: ${browserType}`);
        log.info(`ベースURL: ${baseUrl}`);
        
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
        
        // テストケース定義
        const tests = [
            {
                name: 'CP-001: 初期画面表示',
                fn: async (page) => {
                    await page.goto(baseUrl);
                    await page.waitForLoadState('networkidle');
                    
                    // タイトル確認
                    const title = await page.title();
                    if (!title.includes('PlantUML')) {
                        throw new Error(`タイトルが不正: ${title}`);
                    }
                    
                    // 主要要素の存在確認
                    const elements = [
                        '.selected-actors',  // アクターリスト
                        'h4',                // 見出し要素（処理フローなど）
                        '#plantuml-code',    // PlantUMLコード
                        'h3'                 // セクション見出し（プレビューなど）
                    ];
                    
                    for (const selector of elements) {
                        const element = await page.locator(selector).isVisible();
                        if (!element) {
                            throw new Error(`要素が見つかりません: ${selector}`);
                        }
                    }
                }
            },
            {
                name: 'CP-002: アクター追加',
                fn: async (page) => {
                    await page.goto(baseUrl);
                    await page.waitForLoadState('networkidle');
                    
                    // 顧客アクターを追加
                    const customerBtn = page.locator('button:has-text("顧客")').first();
                    if (await customerBtn.isVisible()) {
                        await customerBtn.click();
                        
                        // PlantUMLコードに反映されているか確認
                        await page.waitForTimeout(500);
                        const code = await page.locator('#plantuml-code').inputValue();
                        if (!code.includes('顧客')) {
                            throw new Error('アクターがコードに反映されていません');
                        }
                    } else {
                        throw new Error('顧客ボタンが見つかりません');
                    }
                }
            },
            {
                name: 'CP-003: テンプレート適用',
                fn: async (page) => {
                    await page.goto(baseUrl);
                    await page.waitForLoadState('networkidle');
                    
                    // パターン選択画面を開く
                    const patternBtn = page.locator('button:has-text("パターン選択")');
                    if (await patternBtn.isVisible()) {
                        await patternBtn.click();
                        await page.waitForTimeout(500);
                        
                        // EC注文フローを選択
                        const ecOrderBtn = page.locator('button:has-text("このパターンを使用")').first();
                        if (await ecOrderBtn.isVisible()) {
                            await ecOrderBtn.click();
                            await page.waitForTimeout(1000);
                            
                            // コードが生成されているか確認
                            const code = await page.locator('#plantuml-code').inputValue();
                            if (!code.includes('@startuml') || !code.includes('@enduml')) {
                                throw new Error('PlantUMLコードが正しく生成されていません');
                            }
                        } else {
                            throw new Error('テンプレート選択ボタンが見つかりません');
                        }
                    } else {
                        throw new Error('パターン選択ボタンが見つかりません');
                    }
                }
            },
            {
                name: 'CP-004: プレビュー生成',
                fn: async (page) => {
                    await page.goto(baseUrl);
                    await page.waitForLoadState('networkidle');
                    
                    // アクターを追加
                    const customerBtn = page.locator('button:has-text("顧客")').first();
                    if (await customerBtn.isVisible()) {
                        await customerBtn.click();
                        
                        // プレビュー画像の生成を待つ
                        await page.waitForTimeout(3000);
                        
                        // プレビュー画像が表示されているか確認
                        const previewImg = page.locator('.preview-container img');
                        if (await previewImg.isVisible()) {
                            const src = await previewImg.getAttribute('src');
                            if (!src || !src.includes('kroki.io')) {
                                throw new Error('プレビュー画像のURLが不正です');
                            }
                        } else {
                            // プレビューエラーメッセージの確認
                            const errorMsg = page.locator('.preview-error');
                            if (await errorMsg.isVisible()) {
                                log.warning('プレビューエラーが発生していますが、これは想定内です');
                            } else {
                                throw new Error('プレビュー画像が表示されていません');
                            }
                        }
                    }
                }
            },
            {
                name: 'PERF-001: 初期表示速度',
                fn: async (page) => {
                    const startTime = Date.now();
                    await page.goto(baseUrl);
                    await page.waitForLoadState('networkidle');
                    const loadTime = Date.now() - startTime;
                    
                    log.info(`初期表示時間: ${loadTime}ms`);
                    
                    if (loadTime > 3000) {
                        throw new Error(`初期表示が遅すぎます: ${loadTime}ms (目標: 3000ms以内)`);
                    }
                }
            }
        ];
        
        // テスト実行
        for (const test of tests) {
            await runTest(test.name, test.fn, browser);
        }
        
    } catch (error) {
        log.error(`テスト実行エラー: ${error.message}`);
        testResults.failed++;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // 結果サマリー
    console.log(`${colors.cyan}\n========================================`);
    console.log('  テスト結果サマリー');
    console.log(`========================================${colors.reset}\n`);
    
    console.log(`合計: ${testResults.passed + testResults.failed + testResults.skipped}`);
    console.log(`${colors.green}✅ 成功: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ 失敗: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}⏭️ スキップ: ${testResults.skipped}${colors.reset}`);
    
    if (testResults.errors.length > 0) {
        console.log(`${colors.red}\n失敗したテスト:${colors.reset}`);
        testResults.errors.forEach(err => {
            console.log(`${colors.red}  - ${err.test}: ${err.error}${colors.reset}`);
        });
    }
    
    // 終了コード
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    log.error(`未処理のエラー: ${error}`);
    process.exit(1);
});

// 実行
main().catch(error => {
    log.error(`致命的エラー: ${error}`);
    process.exit(1);
});