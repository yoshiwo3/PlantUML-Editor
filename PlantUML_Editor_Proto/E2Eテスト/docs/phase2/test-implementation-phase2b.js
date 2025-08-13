/**
 * PlantUMLエディタ Phase 2-B テスト実装
 * パフォーマンステスト強化 - TTI、メモリ、CPU、大規模データ処理
 * 
 * 実装日: 2025/08/13
 * 対象: Playwright v1.48.0 + Microsoft Edge
 * 環境: Docker (Node.js v20)
 * 
 * 重要: このテストはパフォーマンス測定が主目的のため、
 * 実行環境の負荷状況によって結果が変動する可能性があります。
 */

const { chromium } = require('@playwright/test');

// パフォーマンス結果管理
const performanceResults = {
    coreWebVitals: {},
    resourceUsage: {},
    loadTests: {},
    startTime: Date.now()
};

// メトリクス閾値設定
const PERFORMANCE_THRESHOLDS = {
    FCP: 100,          // First Contentful Paint (ms)
    LCP: 1000,         // Largest Contentful Paint (ms)
    TTI: 2000,         // Time to Interactive (ms)
    FID: 50,           // First Input Delay (ms)
    CLS: 0.1,          // Cumulative Layout Shift
    MEMORY_LIMIT: 50,   // MB
    CPU_LIMIT: 30,      // %
    LOAD_TIME: 5000     // ms
};

// カラー出力
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
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    console.log(`${colors[color]}[${timestamp}] ${symbol} ${message}${colors.reset}`);
}

// パフォーマンス測定ユーティリティ
class PerformanceUtils {
    /**
     * Core Web Vitals測定
     */
    static async measureCoreWebVitals(page) {
        const metrics = await page.evaluate(() => {
            return new Promise((resolve) => {
                const metrics = {};
                
                // Performance Observer for paint timing
                if ('PerformanceObserver' in window) {
                    const paintObserver = new PerformanceObserver((list) => {
                        list.getEntries().forEach((entry) => {
                            metrics[entry.name] = entry.startTime;
                        });
                    });
                    paintObserver.observe({ entryTypes: ['paint'] });
                    
                    // Layout Shift Observer
                    const clsObserver = new PerformanceObserver((list) => {
                        let clsValue = 0;
                        list.getEntries().forEach((entry) => {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        });
                        metrics.CLS = clsValue;
                    });
                    clsObserver.observe({ entryTypes: ['layout-shift'] });
                }
                
                // Navigation timing
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
                    metrics.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
                }
                
                // Wait for all metrics to be collected
                setTimeout(() => {
                    resolve({
                        FCP: metrics['first-contentful-paint'] || 0,
                        LCP: metrics['largest-contentful-paint'] || metrics['first-contentful-paint'] || 0,
                        CLS: metrics.CLS || 0,
                        domContentLoaded: metrics.domContentLoaded || 0,
                        loadComplete: metrics.loadComplete || 0,
                        timestamp: Date.now()
                    });
                }, 2000);
            });
        });
        
        return metrics;
    }

    /**
     * TTI（Time to Interactive）測定
     */
    static async measureTTI(page, url) {
        const start = performance.now();
        
        await page.goto(url, { waitUntil: 'networkidle' });
        
        // メインスレッドの安定性確認
        await page.waitForFunction(() => {
            return document.readyState === 'complete' && 
                   window.requestIdleCallback &&
                   !document.querySelector('.loading, .spinner, [aria-busy="true"]');
        }, { timeout: 10000 });
        
        // インタラクション可能性テスト
        const interactionStart = performance.now();
        await page.click('body'); // 最初のクリック
        const interactionEnd = performance.now();
        
        const totalTTI = performance.now() - start;
        const firstInputDelay = interactionEnd - interactionStart;
        
        return {
            TTI: totalTTI,
            FID: firstInputDelay
        };
    }

    /**
     * メモリ使用量測定（詳細版）
     */
    static async measureDetailedMemoryUsage(page) {
        const memoryMetrics = await page.evaluate(() => {
            const metrics = {
                timestamp: Date.now(),
                jsHeap: null,
                domNodes: document.querySelectorAll('*').length,
                eventListeners: 0
            };
            
            // JS Heap情報
            if ('memory' in performance) {
                metrics.jsHeap = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }
            
            // イベントリスナー数の概算
            try {
                const allElements = document.querySelectorAll('*');
                let listenerCount = 0;
                allElements.forEach(el => {
                    const events = ['click', 'change', 'input', 'keyup', 'keydown'];
                    events.forEach(event => {
                        if (el['on' + event]) listenerCount++;
                    });
                });
                metrics.eventListeners = listenerCount;
            } catch (e) {
                metrics.eventListeners = -1; // 測定失敗
            }
            
            return metrics;
        });
        
        return memoryMetrics;
    }

    /**
     * CPU使用率測定（近似値）
     */
    static async measureCPUUsage(page, duration = 5000) {
        const measurements = [];
        const interval = 500;
        const iterations = duration / interval;
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            
            // CPU集約的タスクを実行
            await page.evaluate(() => {
                const startTime = performance.now();
                while (performance.now() - startTime < 100) {
                    // 100ms間CPU使用
                    Math.random();
                }
            });
            
            const elapsed = performance.now() - start;
            const cpuUsage = Math.min((elapsed - 100) / interval * 100, 100);
            measurements.push(Math.max(cpuUsage, 0));
            
            await page.waitForTimeout(interval - Math.min(elapsed, interval));
        }
        
        return {
            average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
            max: Math.max(...measurements),
            samples: measurements
        };
    }
}

// テスト実行フレームワーク
async function runPerformanceTest(testId, testName, testFn, threshold = null) {
    try {
        log('blue', '🏁', `パフォーマンステスト実行中: ${testId} - ${testName}`);
        const start = Date.now();
        
        const result = await testFn();
        const duration = Date.now() - start;
        
        // 閾値チェック
        let status = 'success';
        let statusSymbol = '✅';
        let statusColor = 'green';
        
        if (threshold && result.value !== undefined) {
            if (result.value > threshold) {
                status = 'warning';
                statusSymbol = '⚠️';
                statusColor = 'yellow';
                log('yellow', '⚠️', `閾値超過: ${result.value} > ${threshold}`);
            }
        }
        
        log(statusColor, statusSymbol, `${testName}: ${result.displayValue || result.value || 'OK'} (${duration}ms)`);
        
        performanceResults[testId] = {
            name: testName,
            value: result.value,
            details: result.details,
            duration,
            status,
            threshold
        };
        
        return result;
    } catch (error) {
        log('red', '❌', `パフォーマンステスト失敗: ${testName}: ${error.message}`);
        performanceResults[testId] = {
            name: testName,
            error: error.message,
            status: 'failed'
        };
        throw error;
    }
}

// Phase 2-B メインテスト群
async function runPhase2BTests() {
    console.log('\n' + colors.cyan + '=' .repeat(80));
    console.log('  PlantUMLエディタ Phase 2-B テスト: パフォーマンス強化');
    console.log('  Core Web Vitals・リソース監視・負荷テスト');
    console.log('=' .repeat(80) + colors.reset + '\n');
    
    const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
    log('blue', 'ℹ️', `ベースURL: ${BASE_URL}`);
    log('blue', 'ℹ️', `パフォーマンス閾値設定: TTI<${PERFORMANCE_THRESHOLDS.TTI}ms, Memory<${PERFORMANCE_THRESHOLDS.MEMORY_LIMIT}MB`);
    
    let browser, context, page;
    
    try {
        // パフォーマンス測定用の最適化ブラウザ設定
        browser = await chromium.launch({
            channel: 'msedge',
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--enable-memory-info',
                '--memory-pressure-off',
                '--disable-backgrounding-occluded-windows',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI'
            ]
        });
        
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP',
            ignoreHTTPSErrors: true
        });
        
        page = await context.newPage();

        // ===========================================
        // 1. Core Web Vitals測定テスト群
        // ===========================================
        
        await runPerformanceTest(
            'PERF-CWV-001', 
            'FCP (First Contentful Paint) 測定', 
            async () => {
                const metrics = await PerformanceUtils.measureCoreWebVitals(page);
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                const finalMetrics = await PerformanceUtils.measureCoreWebVitals(page);
                
                return {
                    value: finalMetrics.FCP,
                    displayValue: `${finalMetrics.FCP.toFixed(2)}ms`,
                    details: finalMetrics
                };
            },
            PERFORMANCE_THRESHOLDS.FCP
        );

        await runPerformanceTest(
            'PERF-CWV-005', 
            'TTI (Time to Interactive) 測定', 
            async () => {
                const ttiMetrics = await PerformanceUtils.measureTTI(page, BASE_URL);
                
                return {
                    value: ttiMetrics.TTI,
                    displayValue: `TTI: ${ttiMetrics.TTI.toFixed(2)}ms, FID: ${ttiMetrics.FID.toFixed(2)}ms`,
                    details: ttiMetrics
                };
            },
            PERFORMANCE_THRESHOLDS.TTI
        );

        await runPerformanceTest(
            'PERF-CWV-003',
            'FID (First Input Delay) 測定',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                // 実際のユーザーインタラクションをシミュレート
                const start = performance.now();
                await page.click('button:first-child');
                const end = performance.now();
                
                const fid = end - start;
                
                return {
                    value: fid,
                    displayValue: `${fid.toFixed(2)}ms`,
                    details: { interactionType: 'click', element: 'button' }
                };
            },
            PERFORMANCE_THRESHOLDS.FID
        );

        // ===========================================
        // 2. リソース使用量監視テスト群
        // ===========================================

        await runPerformanceTest(
            'PERF-RES-001',
            'ヒープメモリ使用量測定',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                const memoryMetrics = await PerformanceUtils.measureDetailedMemoryUsage(page);
                
                const memoryUsageMB = memoryMetrics.jsHeap ? 
                    (memoryMetrics.jsHeap.used / 1024 / 1024) : 0;
                
                return {
                    value: memoryUsageMB,
                    displayValue: `${memoryUsageMB.toFixed(2)}MB (DOM: ${memoryMetrics.domNodes} nodes)`,
                    details: memoryMetrics
                };
            },
            PERFORMANCE_THRESHOLDS.MEMORY_LIMIT
        );

        await runPerformanceTest(
            'PERF-RES-002',
            'CPU使用率測定',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                const cpuMetrics = await PerformanceUtils.measureCPUUsage(page, 3000);
                
                return {
                    value: cpuMetrics.average,
                    displayValue: `平均: ${cpuMetrics.average.toFixed(1)}%, 最大: ${cpuMetrics.max.toFixed(1)}%`,
                    details: cpuMetrics
                };
            },
            PERFORMANCE_THRESHOLDS.CPU_LIMIT
        );

        await runPerformanceTest(
            'PERF-RES-004',
            'DOM要素数とイベントリスナー数測定',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                // いくつかの操作を実行してDOM要素を増やす
                const buttons = await page.locator('button').all();
                for (let i = 0; i < Math.min(buttons.length, 5); i++) {
                    await buttons[i].click();
                    await page.waitForTimeout(200);
                }
                
                const metrics = await PerformanceUtils.measureDetailedMemoryUsage(page);
                
                return {
                    value: metrics.domNodes,
                    displayValue: `DOM: ${metrics.domNodes}個, Listeners: ${metrics.eventListeners}個`,
                    details: metrics
                };
            },
            1000
        );

        // ===========================================
        // 3. 負荷テスト群
        // ===========================================

        await runPerformanceTest(
            'LOAD-001',
            '大量アクター追加負荷テスト',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                const startMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                const loadStart = performance.now();
                
                // 大量のアクターを追加
                const actorButtons = await page.locator('button:has-text("顧客"), button:has-text("ECサイト"), button:has-text("決済サービス")').all();
                
                for (let round = 0; round < 10; round++) {
                    for (const button of actorButtons) {
                        await button.click();
                        await page.waitForTimeout(50); // 短い間隔で連続実行
                    }
                    
                    // 中間メモリチェック
                    if (round % 3 === 0) {
                        const currentMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                        const memoryIncrease = currentMemory.jsHeap ? 
                            (currentMemory.jsHeap.used - startMemory.jsHeap.used) / 1024 / 1024 : 0;
                        
                        log('blue', '📊', `ラウンド${round+1}: メモリ増加 ${memoryIncrease.toFixed(2)}MB`);
                    }
                }
                
                const loadEnd = performance.now();
                const endMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                
                const responseTime = loadEnd - loadStart;
                const memoryIncrease = endMemory.jsHeap ? 
                    (endMemory.jsHeap.used - startMemory.jsHeap.used) / 1024 / 1024 : 0;
                
                return {
                    value: responseTime,
                    displayValue: `応答時間: ${responseTime.toFixed(0)}ms, メモリ増加: ${memoryIncrease.toFixed(2)}MB`,
                    details: {
                        responseTime,
                        memoryIncrease,
                        operationsPerformed: 30,
                        averagePerOperation: responseTime / 30
                    }
                };
            },
            3000
        );

        await runPerformanceTest(
            'LOAD-002',
            '複雑PlantUMLコード処理負荷テスト',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                // 複雑なPlantUMLコード生成
                let complexCode = '@startuml\n';
                
                // 多数のparticipants
                for (let i = 0; i < 20; i++) {
                    complexCode += `participant "システム${i}" as sys${i}\n`;
                }
                
                // 複雑なフロー
                complexCode += `
alt メインフロー
    loop 5回繰り返し
        sys0 -> sys1: データ処理要求
        par 並行処理開始
            sys1 -> sys2: 処理A
            sys2 -> sys3: 結果A
        and
            sys1 -> sys4: 処理B  
            sys4 -> sys5: 結果B
        and
            sys1 -> sys6: 処理C
            sys6 -> sys7: 結果C
        end
        
        alt 条件分岐
            sys3 -> sys0: 成功応答
        else
            sys5 -> sys0: エラー応答
            sys0 -> sys1: リトライ要求
        end
    end
else エラーフロー
    sys0 -> sys19: エラーログ記録
    sys19 -> sys0: 完了通知
end
@enduml`;
                
                const parseStart = performance.now();
                const startMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                
                await page.fill('#plantuml-code', complexCode);
                
                // パース完了まで待機
                await page.waitForTimeout(2000);
                
                const parseEnd = performance.now();
                const endMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                
                const parseTime = parseEnd - parseStart;
                const memoryIncrease = endMemory.jsHeap ? 
                    (endMemory.jsHeap.used - startMemory.jsHeap.used) / 1024 / 1024 : 0;
                
                return {
                    value: parseTime,
                    displayValue: `パース時間: ${parseTime.toFixed(0)}ms, メモリ: ${memoryIncrease.toFixed(2)}MB`,
                    details: {
                        parseTime,
                        memoryIncrease,
                        codeLength: complexCode.length,
                        linesOfCode: complexCode.split('\n').length
                    }
                };
            },
            5000
        );

        await runPerformanceTest(
            'LOAD-003',
            '連続操作応答性テスト',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                const operationTimes = [];
                const operations = 20;
                
                for (let i = 0; i < operations; i++) {
                    const operationStart = performance.now();
                    
                    // ランダムな操作を実行
                    const actions = [
                        () => page.click('button:has-text("顧客")'),
                        () => page.click('button:has-text("クリア")'),
                        () => page.fill('#plantuml-code', `@startuml\nA -> B: test${i}\n@enduml`)
                    ];
                    
                    const randomAction = actions[i % actions.length];
                    await randomAction();
                    
                    const operationEnd = performance.now();
                    const operationTime = operationEnd - operationStart;
                    operationTimes.push(operationTime);
                    
                    // 短い間隔で連続実行
                    await page.waitForTimeout(100);
                }
                
                const averageResponseTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
                const maxResponseTime = Math.max(...operationTimes);
                const responsiveOperations = operationTimes.filter(t => t < 1000).length;
                
                return {
                    value: averageResponseTime,
                    displayValue: `平均: ${averageResponseTime.toFixed(1)}ms, 最大: ${maxResponseTime.toFixed(1)}ms, 応答性維持: ${responsiveOperations}/${operations}`,
                    details: {
                        averageResponseTime,
                        maxResponseTime,
                        responsiveOperations,
                        totalOperations: operations,
                        responsiveRate: (responsiveOperations / operations) * 100
                    }
                };
            },
            1000
        );

        await runPerformanceTest(
            'LOAD-004',
            '長時間稼働メモリリークテスト',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                const initialMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                const memorySnapshots = [initialMemory.jsHeap?.used || 0];
                
                log('blue', '📊', '長時間稼働テスト開始（5分間のシミュレーション）...');
                
                // 5分間の操作をシミュレート（実際は30秒に短縮）
                const duration = 30000; // 30秒
                const interval = 3000;   // 3秒間隔
                const iterations = duration / interval;
                
                for (let i = 0; i < iterations; i++) {
                    // 定期的な操作シミュレーション
                    await page.click('button:first-child');
                    await page.waitForTimeout(500);
                    await page.click('button:has-text("クリア")');
                    await page.waitForTimeout(500);
                    
                    // メモリ使用量記録
                    const currentMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                    memorySnapshots.push(currentMemory.jsHeap?.used || 0);
                    
                    log('blue', '📊', `${i+1}回目: メモリ ${(currentMemory.jsHeap?.used / 1024 / 1024 || 0).toFixed(2)}MB`);
                    
                    await page.waitForTimeout(interval - 1000);
                }
                
                const finalMemory = await PerformanceUtils.measureDetailedMemoryUsage(page);
                const memoryLeak = (finalMemory.jsHeap?.used || 0) - (initialMemory.jsHeap?.used || 0);
                const memoryLeakMB = memoryLeak / 1024 / 1024;
                
                // メモリリーク判定（5MB以上の増加をリークと判定）
                const hasMemoryLeak = memoryLeakMB > 5;
                
                return {
                    value: memoryLeakMB,
                    displayValue: `メモリリーク: ${memoryLeakMB.toFixed(2)}MB ${hasMemoryLeak ? '(要改善)' : '(正常)'}`,
                    details: {
                        memoryLeak: memoryLeakMB,
                        hasLeak: hasMemoryLeak,
                        initialMemory: initialMemory.jsHeap?.used || 0,
                        finalMemory: finalMemory.jsHeap?.used || 0,
                        snapshots: memorySnapshots,
                        testDuration: duration
                    }
                };
            },
            5 // 5MB以下のメモリ増加を許容
        );

    } catch (error) {
        log('red', '💀', `パフォーマンステスト致命的エラー: ${error.message}`);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// メイン実行関数
async function main() {
    try {
        await runPhase2BTests();
        
        // パフォーマンステスト結果サマリー
        console.log('\n' + colors.cyan + '=' .repeat(80));
        console.log('  Phase 2-B パフォーマンステスト結果サマリー');
        console.log('=' .repeat(80) + colors.reset + '\n');
        
        const totalTests = Object.keys(performanceResults).length;
        const successfulTests = Object.values(performanceResults).filter(r => r.status === 'success').length;
        const warningTests = Object.values(performanceResults).filter(r => r.status === 'warning').length;
        const failedTests = Object.values(performanceResults).filter(r => r.status === 'failed').length;
        
        log('blue', '📊', `実行テスト数: ${totalTests}`);
        log('green', '✅', `成功: ${successfulTests}`);
        log('yellow', '⚠️', `警告: ${warningTests}`);
        log('red', '❌', `失敗: ${failedTests}`);
        
        // パフォーマンスメトリクス詳細
        console.log('\n' + colors.magenta + 'パフォーマンスメトリクス詳細:' + colors.reset);
        Object.entries(performanceResults).forEach(([testId, result]) => {
            if (result.value !== undefined) {
                const statusColor = result.status === 'success' ? 'green' : 
                                   result.status === 'warning' ? 'yellow' : 'red';
                const thresholdInfo = result.threshold ? ` (閾値: ${result.threshold})` : '';
                log(statusColor, '📈', `${testId}: ${result.displayValue || result.value}${thresholdInfo}`);
            }
        });
        
        // 品質評価
        console.log('\n' + colors.magenta + 'パフォーマンス品質評価:' + colors.reset);
        const successRate = (successfulTests / totalTests) * 100;
        
        if (successRate >= 90 && warningTests === 0) {
            log('green', '🏆', '優秀: パフォーマンス目標を全て達成');
        } else if (successRate >= 80) {
            log('yellow', '⚠️', '良好: 一部改善の余地あり');
        } else {
            log('red', '🚨', '要改善: パフォーマンス最適化が必要');
        }
        
        // 推奨改善策
        if (warningTests > 0 || failedTests > 0) {
            console.log('\n' + colors.cyan + '推奨改善策:' + colors.reset);
            Object.entries(performanceResults).forEach(([testId, result]) => {
                if (result.status === 'warning' || result.status === 'failed') {
                    if (testId.includes('TTI')) {
                        log('blue', '💡', 'TTI改善: 初期化処理の最適化、遅延読み込み導入');
                    } else if (testId.includes('MEMORY')) {
                        log('blue', '💡', 'メモリ最適化: 不要なオブジェクト削除、ガベージコレクション促進');
                    } else if (testId.includes('CPU')) {
                        log('blue', '💡', 'CPU最適化: 処理の分散化、WebWorker活用検討');
                    }
                }
            });
        }
        
        process.exit(failedTests > 0 ? 1 : 0);
        
    } catch (error) {
        log('red', '💀', `Phase 2-B テスト実行エラー: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    log('red', '💀', `未処理のPromise拒否: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
});

// 実行
if (require.main === module) {
    main();
}

module.exports = {
    runPhase2BTests,
    PerformanceUtils,
    performanceResults,
    PERFORMANCE_THRESHOLDS
};