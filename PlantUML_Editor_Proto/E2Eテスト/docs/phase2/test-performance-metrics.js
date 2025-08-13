/**
 * Phase2-B: パフォーマンステスト
 * TTI, メモリ使用量, CPU使用率, Core Web Vitals測定
 */

const playwright = require('playwright');

// 環境変数からベースURLを取得
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';

// テスト結果
const results = {
    passed: [],
    failed: [],
    startTime: Date.now(),
    metrics: {}
};

// カラー出力用のヘルパー
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
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

// Performance API を使用したメトリクス収集
async function collectPerformanceMetrics(page) {
    const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        const lcp = paint.find(entry => entry.name === 'largest-contentful-paint');
        
        return {
            // Navigation Timing メトリクス
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
            loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart),
            domComplete: Math.round(navigation.domComplete - navigation.navigationStart),
            
            // Paint メトリクス
            firstContentfulPaint: fcp ? Math.round(fcp.startTime) : null,
            largestContentfulPaint: lcp ? Math.round(lcp.startTime) : null,
            
            // Resource timing
            resourceCount: performance.getEntriesByType('resource').length,
            totalTransferSize: performance.getEntriesByType('resource')
                .reduce((total, entry) => total + (entry.transferSize || 0), 0)
        };
    });
    
    return performanceMetrics;
}

// Playwright のメトリクス収集
async function collectPlaywrightMetrics(page) {
    // CDP (Chrome DevTools Protocol) メトリクス
    let cdpMetrics = null;
    try {
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Performance.enable');
        const metricsData = await cdpSession.send('Performance.getMetrics');
        
        cdpMetrics = {
            jsHeapUsedSize: metricsData.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0,
            jsHeapTotalSize: metricsData.metrics.find(m => m.name === 'JSHeapTotalSize')?.value || 0,
            nodes: metricsData.metrics.find(m => m.name === 'Nodes')?.value || 0,
            documents: metricsData.metrics.find(m => m.name === 'Documents')?.value || 0
        };
    } catch (error) {
        log('yellow', '⚠', `CDP メトリクス取得エラー: ${error.message}`);
    }
    
    return cdpMetrics;
}

// TTI (Time to Interactive) 測定
async function measureTimeToInteractive(page) {
    const start = Date.now();
    
    // ページ読み込み完了まで待機
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // メインのUI要素が操作可能になるまで待機
    const selectors = [
        '#plantuml-code',
        'button:has-text("顧客")',
        'button:has-text("システム")',
        'button:has-text("パターン選択")'
    ];
    
    for (const selector of selectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
            await element.waitFor({ state: 'visible', timeout: 10000 });
        }
    }
    
    // 実際にインタラクション可能か確認
    const customerBtn = page.locator('button:has-text("顧客")').first();
    if (await customerBtn.count() > 0) {
        await customerBtn.click();
        await page.waitForTimeout(500);
        
        const codeTextarea = page.locator('#plantuml-code');
        const code = await codeTextarea.inputValue();
        if (!code.includes('顧客')) {
            throw new Error('インタラクション失敗: UIが応答しません');
        }
    }
    
    const tti = Date.now() - start;
    return tti;
}

// Core Web Vitals 測定
async function measureCoreWebVitals(page) {
    // Web Vitals の測定スクリプトを注入
    await page.addInitScript(`
        window.webVitalsResults = {};
        
        // FCP, LCP の測定
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    window.webVitalsResults.fcp = Math.round(entry.startTime);
                }
                if (entry.name === 'largest-contentful-paint') {
                    window.webVitalsResults.lcp = Math.round(entry.startTime);
                }
            }
        }).observe({ entryTypes: ['paint'] });
        
        // CLS (Cumulative Layout Shift) 測定
        let clsValue = 0;
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            window.webVitalsResults.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // FID (First Input Delay) 測定準備
        window.webVitalsResults.fid = null;
        let fidMeasured = false;
        
        function measureFID(event) {
            if (!fidMeasured) {
                const fid = performance.now() - event.timeStamp;
                window.webVitalsResults.fid = Math.round(fid);
                fidMeasured = true;
            }
        }
        
        ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart'].forEach(type => {
            document.addEventListener(type, measureFID, { once: true, passive: true });
        });
    `);
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // インタラクションを実行してFIDを測定
    const customerBtn = page.locator('button:has-text("顧客")').first();
    if (await customerBtn.count() > 0) {
        await customerBtn.click();
        await page.waitForTimeout(1000);
    }
    
    // 結果を取得
    const webVitals = await page.evaluate(() => window.webVitalsResults);
    
    return webVitals;
}

// 負荷テスト用の重い操作実行
async function performHeavyOperations(page) {
    const operations = [];
    
    // 複数のアクターを連続追加
    const actors = ['顧客', 'システム', 'サービス', '管理者'];
    for (const actor of actors) {
        const btn = page.locator(`button:has-text("${actor}")`).first();
        if (await btn.count() > 0) {
            const start = Date.now();
            await btn.click();
            await page.waitForTimeout(100);
            const duration = Date.now() - start;
            operations.push({ action: `${actor}追加`, duration });
        }
    }
    
    // パターン選択操作
    const patternBtn = page.locator('button:has-text("パターン選択")');
    if (await patternBtn.count() > 0) {
        const start = Date.now();
        await patternBtn.click();
        await page.waitForTimeout(500);
        await patternBtn.click(); // 閉じる
        const duration = Date.now() - start;
        operations.push({ action: 'パターン選択操作', duration });
    }
    
    // PlantUMLコードの大量編集
    const largeCode = `@startuml
${Array.from({length: 50}, (_, i) => `participant "Actor${i}" as A${i}`).join('\n')}
${Array.from({length: 100}, (_, i) => `A${i % 10} -> A${(i+1) % 10}: Message ${i}`).join('\n')}
@enduml`;
    
    const codeTextarea = page.locator('#plantuml-code');
    const start = Date.now();
    await codeTextarea.clear();
    await codeTextarea.fill(largeCode);
    await codeTextarea.blur();
    await page.waitForTimeout(1000);
    const duration = Date.now() - start;
    operations.push({ action: '大量コード編集', duration });
    
    return operations;
}

// メインテスト
async function main() {
    console.log('\n' + colors.magenta + '=' .repeat(65));
    console.log('  PlantUMLエディタ E2Eテスト Phase2-B: パフォーマンステスト');
    console.log('=' .repeat(65) + colors.reset + '\n');
    
    log('blue', 'ℹ', `ベースURL: ${BASE_URL}`);
    
    // ブラウザタイプの選択
    const browserType = process.argv[2] || 'chromium';
    log('blue', 'ℹ', `ブラウザ: ${browserType}`);
    
    let browser;
    
    try {
        // ブラウザ起動（パフォーマンス測定用の設定）
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
            case 'msedge':
            case 'edge':
                browser = await playwright.chromium.launch({ 
                    headless: true,
                    channel: 'msedge',
                    args: ['--no-sandbox', '--disable-dev-shm-usage']
                });
                break;
            default:
                browser = await playwright.chromium.launch({ 
                    headless: true,
                    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-timer-throttling']
                });
        }
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP',
            ignoreHTTPSErrors: true,
            // パフォーマンス測定のための設定
            recordVideo: { dir: 'test-results/videos/' },
            recordHar: { path: 'test-results/performance.har' }
        });
        
        const page = await context.newPage();
        
        // Phase2-B パフォーマンステストケース実行
        
        await runTest('PERF-001: ページ読み込み速度測定', async () => {
            const start = Date.now();
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            const loadTime = Date.now() - start;
            
            log('cyan', '📊', `ページ読み込み時間: ${loadTime}ms`);
            results.metrics.pageLoadTime = loadTime;
            
            // 目標: 3秒以内
            if (loadTime > 3000) {
                throw new Error(`ページ読み込みが遅すぎます: ${loadTime}ms (目標: <3000ms)`);
            }
            
            // パフォーマンスメトリクス収集
            const perfMetrics = await collectPerformanceMetrics(page);
            results.metrics.performanceAPI = perfMetrics;
            
            log('cyan', '→', `DOMContentLoaded: ${perfMetrics.domContentLoaded}ms`);
            log('cyan', '→', `LoadComplete: ${perfMetrics.loadComplete}ms`);
            log('cyan', '→', `リソース数: ${perfMetrics.resourceCount}`);
        });

        await runTest('PERF-002: Time to Interactive (TTI) 測定', async () => {
            const tti = await measureTimeToInteractive(page);
            
            log('cyan', '📊', `TTI (Time to Interactive): ${tti}ms`);
            results.metrics.tti = tti;
            
            // 目標: 5秒以内
            if (tti > 5000) {
                throw new Error(`TTIが遅すぎます: ${tti}ms (目標: <5000ms)`);
            }
        });

        await runTest('PERF-003: Core Web Vitals測定', async () => {
            const webVitals = await measureCoreWebVitals(page);
            
            results.metrics.coreWebVitals = webVitals;
            
            log('cyan', '📊', `FCP (First Contentful Paint): ${webVitals.fcp || 'N/A'}ms`);
            log('cyan', '📊', `LCP (Largest Contentful Paint): ${webVitals.lcp || 'N/A'}ms`);
            log('cyan', '📊', `CLS (Cumulative Layout Shift): ${webVitals.cls || 'N/A'}`);
            log('cyan', '📊', `FID (First Input Delay): ${webVitals.fid || 'N/A'}ms`);
            
            // Core Web Vitals の閾値チェック
            if (webVitals.fcp && webVitals.fcp > 1800) {
                log('yellow', '⚠', `FCP が推奨値を超えています: ${webVitals.fcp}ms (推奨: <1800ms)`);
            }
            
            if (webVitals.lcp && webVitals.lcp > 2500) {
                log('yellow', '⚠', `LCP が推奨値を超えています: ${webVitals.lcp}ms (推奨: <2500ms)`);
            }
            
            if (webVitals.cls && webVitals.cls > 0.1) {
                log('yellow', '⚠', `CLS が推奨値を超えています: ${webVitals.cls} (推奨: <0.1)`);
            }
        });

        await runTest('PERF-004: メモリ使用量測定', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const playwrightMetrics = await collectPlaywrightMetrics(page);
            
            if (playwrightMetrics) {
                results.metrics.memory = playwrightMetrics;
                
                const heapUsedMB = Math.round(playwrightMetrics.jsHeapUsedSize / 1024 / 1024 * 100) / 100;
                const heapTotalMB = Math.round(playwrightMetrics.jsHeapTotalSize / 1024 / 1024 * 100) / 100;
                
                log('cyan', '📊', `JSヒープ使用量: ${heapUsedMB}MB / ${heapTotalMB}MB`);
                log('cyan', '📊', `DOM ノード数: ${playwrightMetrics.nodes}`);
                log('cyan', '📊', `ドキュメント数: ${playwrightMetrics.documents}`);
                
                // メモリ使用量の閾値チェック（50MB）
                if (heapUsedMB > 50) {
                    log('yellow', '⚠', `メモリ使用量が多いです: ${heapUsedMB}MB (推奨: <50MB)`);
                }
            } else {
                log('yellow', '⚠', 'メモリメトリクスを取得できませんでした（ブラウザタイプの制限）');
            }
        });

        await runTest('PERF-005: UI応答速度測定', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const responseTimes = [];
            const uiActions = [
                { name: '顧客追加', selector: 'button:has-text("顧客")' },
                { name: 'システム追加', selector: 'button:has-text("システム")' },
                { name: 'パターン選択', selector: 'button:has-text("パターン選択")' }
            ];
            
            for (const action of uiActions) {
                const btn = page.locator(action.selector).first();
                if (await btn.count() > 0) {
                    const start = Date.now();
                    await btn.click();
                    await page.waitForTimeout(100); // 最小限の待機
                    const responseTime = Date.now() - start;
                    
                    responseTimes.push({ action: action.name, time: responseTime });
                    log('cyan', '→', `${action.name}: ${responseTime}ms`);
                }
            }
            
            results.metrics.uiResponseTimes = responseTimes;
            
            const averageResponse = responseTimes.reduce((sum, r) => sum + r.time, 0) / responseTimes.length;
            log('cyan', '📊', `UI平均応答時間: ${Math.round(averageResponse)}ms`);
            
            // 目標: 平均500ms以内
            if (averageResponse > 500) {
                throw new Error(`UI応答が遅すぎます: ${Math.round(averageResponse)}ms (目標: <500ms)`);
            }
        });

        await runTest('PERF-006: 負荷耐性テスト', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const beforeMemory = await collectPlaywrightMetrics(page);
            const startTime = Date.now();
            
            // 重い操作を実行
            const operations = await performHeavyOperations(page);
            
            const afterMemory = await collectPlaywrightMetrics(page);
            const totalTime = Date.now() - startTime;
            
            log('cyan', '📊', `負荷テスト総実行時間: ${totalTime}ms`);
            
            // 各操作の実行時間
            operations.forEach(op => {
                log('cyan', '→', `${op.action}: ${op.duration}ms`);
            });
            
            // メモリリーク検証
            if (beforeMemory && afterMemory) {
                const memoryIncrease = afterMemory.jsHeapUsedSize - beforeMemory.jsHeapUsedSize;
                const memoryIncreaseMB = Math.round(memoryIncrease / 1024 / 1024 * 100) / 100;
                
                log('cyan', '📊', `メモリ増加量: ${memoryIncreaseMB}MB`);
                
                // 極端なメモリ増加の検出（20MB以上）
                if (memoryIncreaseMB > 20) {
                    log('yellow', '⚠', `メモリ使用量が大幅に増加しています: ${memoryIncreaseMB}MB`);
                }
            }
            
            results.metrics.loadTest = {
                totalTime,
                operations,
                memoryBefore: beforeMemory,
                memoryAfter: afterMemory
            };
            
            // 負荷テストの目標: 30秒以内
            if (totalTime > 30000) {
                throw new Error(`負荷テストが遅すぎます: ${totalTime}ms (目標: <30000ms)`);
            }
        });

        await runTest('PERF-007: レンダリング性能測定', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // フレームレート測定の準備
            await page.evaluate(() => {
                window.renderingMetrics = {
                    frameCount: 0,
                    startTime: performance.now(),
                    frames: []
                };
                
                function countFrame(timestamp) {
                    window.renderingMetrics.frameCount++;
                    window.renderingMetrics.frames.push(timestamp);
                    if (window.renderingMetrics.frameCount < 60) {
                        requestAnimationFrame(countFrame);
                    }
                }
                
                requestAnimationFrame(countFrame);
            });
            
            // アニメーションやUI更新を発生させる操作
            const actions = ['顧客', 'システム', 'サービス'];
            for (const action of actions) {
                const btn = page.locator(`button:has-text("${action}")`).first();
                if (await btn.count() > 0) {
                    await btn.click();
                    await page.waitForTimeout(200);
                }
            }
            
            await page.waitForTimeout(2000); // レンダリング測定完了まで待機
            
            const renderingMetrics = await page.evaluate(() => window.renderingMetrics);
            
            if (renderingMetrics.frameCount > 0) {
                const duration = renderingMetrics.frames[renderingMetrics.frameCount - 1] - renderingMetrics.startTime;
                const fps = (renderingMetrics.frameCount / duration) * 1000;
                
                log('cyan', '📊', `レンダリング性能: ${Math.round(fps)}FPS`);
                log('cyan', '→', `測定フレーム数: ${renderingMetrics.frameCount}`);
                log('cyan', '→', `測定時間: ${Math.round(duration)}ms`);
                
                results.metrics.rendering = {
                    fps: Math.round(fps),
                    frameCount: renderingMetrics.frameCount,
                    duration: Math.round(duration)
                };
                
                // FPS の目標: 30FPS以上
                if (fps < 30) {
                    log('yellow', '⚠', `フレームレートが低いです: ${Math.round(fps)}FPS (推奨: ≥30FPS)`);
                }
            } else {
                log('yellow', '⚠', 'レンダリングメトリクスを取得できませんでした');
            }
        });
        
        await browser.close();
        
    } catch (error) {
        log('red', '✗', `致命的エラー: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
    
    // 結果サマリー
    console.log('\n' + colors.magenta + '=' .repeat(65));
    console.log('  Phase2-B パフォーマンステスト結果');
    console.log('=' .repeat(65) + colors.reset + '\n');
    
    const total = results.passed.length + results.failed.length;
    const duration = Date.now() - results.startTime;
    
    console.log(`実行時間: ${(duration / 1000).toFixed(2)}秒`);
    console.log(`テスト数: ${total}`);
    log('green', '✓', `成功: ${results.passed.length}`);
    log('red', '✗', `失敗: ${results.failed.length}`);
    
    // パフォーマンスメトリクスサマリー
    if (Object.keys(results.metrics).length > 0) {
        console.log('\n' + colors.cyan + 'パフォーマンスメトリクス要約:' + colors.reset);
        
        if (results.metrics.pageLoadTime) {
            log('cyan', '📊', `ページ読み込み: ${results.metrics.pageLoadTime}ms`);
        }
        if (results.metrics.tti) {
            log('cyan', '📊', `TTI: ${results.metrics.tti}ms`);
        }
        if (results.metrics.coreWebVitals) {
            const cwv = results.metrics.coreWebVitals;
            log('cyan', '📊', `FCP: ${cwv.fcp || 'N/A'}ms, LCP: ${cwv.lcp || 'N/A'}ms, CLS: ${cwv.cls || 'N/A'}`);
        }
        if (results.metrics.memory) {
            const heapUsedMB = Math.round(results.metrics.memory.jsHeapUsedSize / 1024 / 1024 * 100) / 100;
            log('cyan', '📊', `メモリ使用量: ${heapUsedMB}MB`);
        }
        if (results.metrics.rendering) {
            log('cyan', '📊', `レンダリング: ${results.metrics.rendering.fps}FPS`);
        }
    }
    
    if (results.passed.length > 0) {
        console.log('\n成功したテスト:');
        results.passed.forEach(test => {
            log('green', '+', `${test.name} (${test.duration}ms)`);
        });
    }
    
    if (results.failed.length > 0) {
        console.log('\n失敗したテスト:');
        results.failed.forEach(test => {
            log('red', '-', `${test.name}: ${test.error}`);
        });
    }
    
    // メトリクス詳細をファイルに出力
    const fs = require('fs');
    const path = require('path');
    
    const resultsDir = path.join(__dirname, '../../test-results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const metricsFile = path.join(resultsDir, `performance-metrics-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        browser: browserType,
        baseUrl: BASE_URL,
        testResults: results,
        summary: {
            totalTests: total,
            passed: results.passed.length,
            failed: results.failed.length,
            duration: duration
        }
    }, null, 2));
    
    log('blue', 'ℹ', `パフォーマンスメトリクス保存: ${metricsFile}`);
    
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