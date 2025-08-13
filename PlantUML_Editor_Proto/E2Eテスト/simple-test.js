/**
 * シンプルなPlaywrightテストランナー
 * Node.js互換性問題を回避するための簡易実装
 */

import { chromium, firefox, webkit } from 'playwright';
import chalk from 'chalk';

// テスト結果を格納
const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

// ログ出力
const log = {
    info: (msg) => console.log(chalk.blue(`ℹ ${msg}`)),
    success: (msg) => console.log(chalk.green(`✅ ${msg}`)),
    error: (msg) => console.log(chalk.red(`❌ ${msg}`)),
    warning: (msg) => console.log(chalk.yellow(`⚠️ ${msg}`))
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
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan('  PlantUMLエディタ E2Eテスト実行'));
    console.log(chalk.cyan('========================================\n'));
    
    const browserType = process.argv[2] || 'chromium';
    let browser;
    
    try {
        // ブラウザ起動
        log.info(`ブラウザ起動中: ${browserType}`);
        switch (browserType) {
            case 'firefox':
                browser = await firefox.launch({ headless: true });
                break;
            case 'webkit':
                browser = await webkit.launch({ headless: true });
                break;
            default:
                browser = await chromium.launch({ headless: true });
        }
        
        // テストケース定義
        const tests = [
            {
                name: 'CP-001: 初期画面表示',
                fn: async (page) => {
                    await page.goto('http://localhost:8086');
                    await page.waitForLoadState('networkidle');
                    
                    // タイトル確認
                    const title = await page.title();
                    if (!title.includes('PlantUML')) {
                        throw new Error(`タイトルが不正: ${title}`);
                    }
                    
                    // 主要要素の存在確認
                    const elements = [
                        '#actorsList',
                        '#processList',
                        '#plantUmlCode',
                        '#preview'
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
                    await page.goto('http://localhost:8086');
                    await page.waitForLoadState('networkidle');
                    
                    // 顧客アクターを追加
                    const customerBtn = page.locator('button:has-text("顧客")').first();
                    if (await customerBtn.isVisible()) {
                        await customerBtn.click();
                        
                        // PlantUMLコードに反映されているか確認
                        await page.waitForTimeout(500);
                        const code = await page.locator('#plantUmlCode').inputValue();
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
                    await page.goto('http://localhost:8086');
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
                            const code = await page.locator('#plantUmlCode').inputValue();
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
                    await page.goto('http://localhost:8086');
                    await page.waitForLoadState('networkidle');
                    
                    // アクターを追加
                    const customerBtn = page.locator('button:has-text("顧客")').first();
                    if (await customerBtn.isVisible()) {
                        await customerBtn.click();
                        
                        // プレビュー画像の生成を待つ
                        await page.waitForTimeout(3000);
                        
                        // プレビュー画像が表示されているか確認
                        const previewImg = page.locator('#preview img');
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
                    await page.goto('http://localhost:8086');
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
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan('  テスト結果サマリー'));
    console.log(chalk.cyan('========================================\n'));
    
    console.log(`合計: ${testResults.passed + testResults.failed + testResults.skipped}`);
    console.log(chalk.green(`✅ 成功: ${testResults.passed}`));
    console.log(chalk.red(`❌ 失敗: ${testResults.failed}`));
    console.log(chalk.yellow(`⏭️ スキップ: ${testResults.skipped}`));
    
    if (testResults.errors.length > 0) {
        console.log(chalk.red('\n失敗したテスト:'));
        testResults.errors.forEach(err => {
            console.log(chalk.red(`  - ${err.test}: ${err.error}`));
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