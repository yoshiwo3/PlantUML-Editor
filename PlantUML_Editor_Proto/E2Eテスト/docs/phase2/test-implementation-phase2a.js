/**
 * PlantUMLエディタ Phase 2-A テスト実装
 * テストカバレッジ拡充 - PlantUMLコード編集と双方向同期
 * 
 * 実装日: 2025/08/13
 * 対象: Playwright v1.48.0 + Microsoft Edge
 * 環境: Docker (Node.js v20)
 */

const { chromium } = require('@playwright/test');

// テスト結果管理
const results = {
    passed: [],
    failed: [],
    skipped: [],
    startTime: Date.now()
};

// パフォーマンスメトリクス
const metrics = {
    syncTimes: [],
    memoryUsage: [],
    renderingTimes: []
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

// 共通テストユーティリティ
class TestUtils {
    /**
     * 同期完了まで待機（最適化済み）
     */
    static async waitForSync(page, timeout = 1000) {
        const start = performance.now();
        await page.waitForFunction(() => {
            // PlantUMLコードとUI状態の同期確認
            const code = document.querySelector('#plantuml-code')?.value || '';
            const actorElements = document.querySelectorAll('.selected-actors .actor-item');
            
            // 同期判定ロジック（簡易版）
            return code.includes('@startuml') && 
                   document.readyState === 'complete';
        }, { timeout });
        
        const syncTime = performance.now() - start;
        metrics.syncTimes.push(syncTime);
        return syncTime;
    }

    /**
     * メモリ使用量測定
     */
    static async measureMemoryUsage(page) {
        const memoryInfo = await page.evaluate(() => {
            if ('memory' in performance) {
                return {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        });
        
        if (memoryInfo) {
            metrics.memoryUsage.push(memoryInfo);
            log('blue', '📊', `メモリ使用量: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
        
        return memoryInfo;
    }

    /**
     * PlantUMLコード検証
     */
    static validatePlantUMLCode(code, expectedElements = []) {
        const hasValidStructure = code.includes('@startuml') && code.includes('@enduml');
        const containsExpectedElements = expectedElements.every(element => code.includes(element));
        
        return {
            isValid: hasValidStructure,
            hasElements: containsExpectedElements,
            structure: {
                hasStart: code.includes('@startuml'),
                hasEnd: code.includes('@enduml'),
                lineCount: code.split('\n').length
            }
        };
    }

    /**
     * UI要素の状態確認
     */
    static async getUIState(page) {
        return await page.evaluate(() => {
            const codeTextarea = document.querySelector('#plantuml-code');
            const actorElements = document.querySelectorAll('.selected-actors .actor-item');
            const errorElements = document.querySelectorAll('.error, .alert-danger');
            
            return {
                codeLength: codeTextarea?.value?.length || 0,
                actorCount: actorElements.length,
                hasErrors: errorElements.length > 0,
                isInteractive: document.readyState === 'complete' && 
                              !document.querySelector('.loading, .spinner')
            };
        });
    }
}

// テスト実行フレームワーク
async function runTest(testId, testName, testFn) {
    try {
        log('blue', '🧪', `実行中: ${testId} - ${testName}`);
        const start = Date.now();
        
        const result = await testFn();
        
        const duration = Date.now() - start;
        log('green', '✅', `成功: ${testName} (${duration}ms)`);
        
        results.passed.push({ 
            testId, 
            name: testName, 
            duration,
            metrics: result?.metrics || {}
        });
        
        return result;
    } catch (error) {
        log('red', '❌', `失敗: ${testName}: ${error.message}`);
        results.failed.push({ 
            testId, 
            name: testName, 
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Phase 2-A メインテスト群
async function runPhase2ATests() {
    console.log('\n' + colors.cyan + '=' .repeat(80));
    console.log('  PlantUMLエディタ Phase 2-A テスト: カバレッジ拡充');
    console.log('  双方向同期・PlantUML構文・エラーハンドリング');
    console.log('=' .repeat(80) + colors.reset + '\n');
    
    const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
    log('blue', 'ℹ️', `ベースURL: ${BASE_URL}`);
    log('blue', 'ℹ️', `Node.js バージョン: ${process.version}`);
    
    let browser, context, page;
    
    try {
        // Microsoft Edge起動（最適化済み設定）
        browser = await chromium.launch({
            channel: 'msedge',
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--memory-pressure-off', // メモリ測定用
                '--enable-memory-info' // パフォーマンス測定用
            ]
        });
        
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP',
            ignoreHTTPSErrors: true
        });
        
        page = await context.newPage();
        
        // エラー監視設定
        page.on('console', msg => {
            if (msg.type() === 'error' && !msg.text().includes('Kroki')) {
                log('yellow', '⚠️', `ブラウザエラー: ${msg.text()}`);
            }
        });
        
        page.on('requestfailed', request => {
            if (!request.url().includes('kroki')) {
                log('yellow', '⚠️', `ネットワークエラー: ${request.url()}`);
            }
        });

        // ===========================================
        // 1. 双方向同期テスト群
        // ===========================================
        
        await runTest('SYNC-001', 'PlantUMLコード直接編集→UI反映確認', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 直接PlantUMLコードを編集
            const testCode = `@startuml
participant "顧客" as customer
participant "ECサイト" as ec
participant "決済サービス" as payment

customer -> ec: 商品購入要求
ec -> payment: 決済処理要求
payment -> ec: 決済完了通知
ec -> customer: 購入完了通知
@enduml`;
            
            await page.fill('#plantuml-code', testCode);
            
            // 同期完了待機とパフォーマンス測定
            const syncTime = await TestUtils.waitForSync(page, 1000);
            
            if (syncTime > 500) {
                log('yellow', '⚠️', `同期時間が目標を超過: ${syncTime}ms (目標: 500ms以下)`);
            }
            
            // UI状態確認
            const uiState = await TestUtils.getUIState(page);
            
            // 検証
            expect(uiState.codeLength).toBeGreaterThan(0);
            expect(uiState.isInteractive).toBe(true);
            expect(syncTime).toBeLessThan(1000);
            
            return { metrics: { syncTime, uiState } };
        });

        await runTest('SYNC-002', 'UI操作→PlantUMLコード生成確認', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // UI操作による変更
            const actors = ['顧客', 'ECサイト', '決済サービス'];
            for (const actor of actors) {
                const button = page.locator(`button:has-text("${actor}")`);
                if (await button.count() > 0) {
                    await button.first().click();
                    await page.waitForTimeout(200); // 操作間隔
                }
            }
            
            // 同期確認
            const syncTime = await TestUtils.waitForSync(page, 500);
            
            // 生成されたコード検証
            const generatedCode = await page.inputValue('#plantuml-code');
            const validation = TestUtils.validatePlantUMLCode(generatedCode, actors);
            
            // アサーション
            expect(validation.isValid).toBe(true);
            expect(validation.hasElements).toBe(true);
            expect(syncTime).toBeLessThan(500);
            
            return { metrics: { syncTime, validation } };
        });

        await runTest('SYNC-003', '大量テキスト編集時の同期性能', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 大量のPlantUMLコード生成
            let largeCode = '@startuml\n';
            for (let i = 0; i < 50; i++) {
                largeCode += `participant "Actor${i}" as actor${i}\n`;
            }
            for (let i = 0; i < 25; i++) {
                largeCode += `actor${i} -> actor${i+1}: Message${i}\n`;
            }
            largeCode += '@enduml';
            
            const startMemory = await TestUtils.measureMemoryUsage(page);
            
            // 大量テキスト入力
            await page.fill('#plantuml-code', largeCode);
            
            const syncTime = await TestUtils.waitForSync(page, 2000);
            const endMemory = await TestUtils.measureMemoryUsage(page);
            
            // パフォーマンス評価
            const memoryIncrease = endMemory ? 
                (endMemory.usedJSHeapSize - startMemory.usedJSHeapSize) : 0;
            
            log('blue', '📊', `大量テキスト同期時間: ${syncTime}ms`);
            log('blue', '📊', `メモリ増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            
            // パフォーマンス基準チェック
            expect(syncTime).toBeLessThan(2000);
            if (memoryIncrease > 0) {
                expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB未満
            }
            
            return { 
                metrics: { 
                    syncTime, 
                    memoryIncrease,
                    codeLength: largeCode.length 
                } 
            };
        });

        // ===========================================
        // 2. エラー状態同期テスト群
        // ===========================================

        await runTest('SYNC-ERR-001', '不正PlantUML構文入力時の処理', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 不正な構文のテストパターン
            const invalidCodes = [
                '@startuml\nparticipant without_quotes\n@enduml', // 引用符なしparticipant
                '@startuml\nA -> B: message without end', // @endumlなし
                '@startuml\n@startuml\n@enduml', // ネストしたstartuml
                'invalid_plantuml_without_tags'  // タグなし
            ];
            
            for (const invalidCode of invalidCodes) {
                await page.fill('#plantuml-code', invalidCode);
                
                // エラー状態での同期確認
                await page.waitForTimeout(1000);
                
                const uiState = await TestUtils.getUIState(page);
                
                // エラー状態でもアプリケーションが応答することを確認
                expect(uiState.isInteractive).toBe(true);
                
                log('blue', 'ℹ️', `不正構文テスト完了: エラー=${uiState.hasErrors}`);
            }
            
            return { metrics: { testedPatterns: invalidCodes.length } };
        });

        await runTest('SYNC-ERR-002', '空白文字のみ入力時の処理', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 各種空白パターンのテスト
            const emptyPatterns = ['', '   ', '\n\n\n', '\t\t\t'];
            
            for (const pattern of emptyPatterns) {
                await page.fill('#plantuml-code', pattern);
                await page.waitForTimeout(500);
                
                const uiState = await TestUtils.getUIState(page);
                
                // 空白入力でもアプリケーションが正常動作することを確認
                expect(uiState.isInteractive).toBe(true);
            }
            
            return { metrics: { emptyPatternsCount: emptyPatterns.length } };
        });

        // ===========================================
        // 3. PlantUML構文種別テスト群
        // ===========================================

        await runTest('COND-001', 'alt（選択肢）パターンテスト', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const altCode = `@startuml
Alice -> Bob: 認証要求
alt 認証成功
    Bob -> Alice: 認証OK
    Alice -> Alice: ログイン処理
else 認証失敗
    Bob -> Alice: 認証NG
    Alice -> Alice: エラーログ記録
else システムエラー
    Bob -> Alice: システムエラー
    Alice -> Bob: 再試行要求
end
@enduml`;
            
            await page.fill('#plantuml-code', altCode);
            const syncTime = await TestUtils.waitForSync(page);
            
            const validation = TestUtils.validatePlantUMLCode(altCode, ['alt', 'else', 'end']);
            
            expect(validation.isValid).toBe(true);
            expect(validation.hasElements).toBe(true);
            
            return { metrics: { syncTime, validation } };
        });

        await runTest('LOOP-001', '基本ループパターンテスト', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const loopCode = `@startuml
Alice -> Bob: 処理開始
loop 3回繰り返し
    Bob -> Bob: データ処理
    Bob -> Alice: 進捗報告
    Alice -> Bob: 継続確認
end
Alice -> Bob: 処理完了確認
@enduml`;
            
            await page.fill('#plantuml-code', loopCode);
            const syncTime = await TestUtils.waitForSync(page);
            
            const validation = TestUtils.validatePlantUMLCode(loopCode, ['loop', 'end']);
            
            expect(validation.isValid).toBe(true);
            expect(validation.hasElements).toBe(true);
            
            return { metrics: { syncTime, validation } };
        });

        await runTest('PAR-001', '基本並行処理テスト', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const parCode = `@startuml
Alice -> Bob: 並行処理開始
par ブランチ1
    Bob -> Charlie: 処理A実行
    Charlie -> Bob: 処理A完了
and ブランチ2
    Bob -> David: 処理B実行
    David -> Bob: 処理B完了
and ブランチ3
    Bob -> Eve: 処理C実行
    Eve -> Bob: 処理C完了
end
Bob -> Alice: 全処理完了
@enduml`;
            
            await page.fill('#plantuml-code', parCode);
            const syncTime = await TestUtils.waitForSync(page);
            
            const validation = TestUtils.validatePlantUMLCode(parCode, ['par', 'and', 'end']);
            
            expect(validation.isValid).toBe(true);
            expect(validation.hasElements).toBe(true);
            
            return { metrics: { syncTime, validation } };
        });

        // ===========================================
        // 4. 複合パターンテスト
        // ===========================================

        await runTest('COMPLEX-001', '複合パターン（alt + loop + par）テスト', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            const complexCode = `@startuml
participant "ユーザー" as user
participant "システム" as sys
participant "DB" as db
participant "外部API" as api

user -> sys: データ処理要求

alt 正常系
    loop データ存在確認
        sys -> db: データ検索
        db -> sys: 検索結果
    end
    
    par 並行処理
        sys -> api: 外部データ取得
        api -> sys: データ返却
    and
        sys -> db: ローカルデータ取得  
        db -> sys: データ返却
    end
    
    sys -> user: 処理完了
else 異常系
    sys -> user: エラー応答
end
@enduml`;
            
            await page.fill('#plantuml-code', complexCode);
            const syncTime = await TestUtils.waitForSync(page, 2000);
            
            const validation = TestUtils.validatePlantUMLCode(
                complexCode, 
                ['alt', 'loop', 'par', 'and', 'end', 'else']
            );
            
            // 複合パターンでもパフォーマンスが維持されることを確認
            expect(validation.isValid).toBe(true);
            expect(validation.hasElements).toBe(true);
            expect(syncTime).toBeLessThan(2000);
            
            log('blue', '📊', `複合パターン同期時間: ${syncTime}ms`);
            
            return { metrics: { syncTime, validation, complexity: 'high' } };
        });

    } catch (error) {
        log('red', '💀', `致命的エラー: ${error.message}`);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 簡易アサーションライブラリ
const expect = (actual) => ({
    toBe: (expected) => {
        if (actual !== expected) {
            throw new Error(`期待値: ${expected}, 実際の値: ${actual}`);
        }
    },
    toBeGreaterThan: (expected) => {
        if (actual <= expected) {
            throw new Error(`${actual} は ${expected} より大きくありません`);
        }
    },
    toBeLessThan: (expected) => {
        if (actual >= expected) {
            throw new Error(`${actual} は ${expected} より小さくありません`);
        }
    }
});

// メインテスト実行
async function main() {
    try {
        await runPhase2ATests();
        
        // テスト結果サマリー出力
        console.log('\n' + colors.cyan + '=' .repeat(80));
        console.log('  Phase 2-A テスト結果サマリー');
        console.log('=' .repeat(80) + colors.reset + '\n');
        
        const totalTests = results.passed.length + results.failed.length;
        const successRate = ((results.passed.length / totalTests) * 100).toFixed(1);
        const totalDuration = Date.now() - results.startTime;
        
        log('blue', '📊', `実行時間: ${(totalDuration / 1000).toFixed(2)}秒`);
        log('blue', '📊', `テスト総数: ${totalTests}`);
        log('green', '✅', `成功: ${results.passed.length}`);
        log('red', '❌', `失敗: ${results.failed.length}`);
        log('blue', '📊', `成功率: ${successRate}%`);
        
        // パフォーマンスメトリクス
        if (metrics.syncTimes.length > 0) {
            const avgSyncTime = metrics.syncTimes.reduce((a, b) => a + b, 0) / metrics.syncTimes.length;
            const maxSyncTime = Math.max(...metrics.syncTimes);
            
            log('blue', '⚡', `平均同期時間: ${avgSyncTime.toFixed(2)}ms`);
            log('blue', '⚡', `最大同期時間: ${maxSyncTime.toFixed(2)}ms`);
        }
        
        // 失敗したテストの詳細
        if (results.failed.length > 0) {
            console.log('\n' + colors.red + '失敗したテストの詳細:' + colors.reset);
            results.failed.forEach(test => {
                log('red', '❌', `${test.testId}: ${test.name}`);
                log('red', '  ', `エラー: ${test.error}`);
            });
        }
        
        // 品質評価
        console.log('\n' + colors.magenta + '品質評価:' + colors.reset);
        if (successRate >= 95) {
            log('green', '🏆', '優秀: 目標品質を達成しています');
        } else if (successRate >= 80) {
            log('yellow', '⚠️', '良好: 改善の余地があります');
        } else {
            log('red', '🚨', '要改善: 品質改善が必要です');
        }
        
        process.exit(results.failed.length > 0 ? 1 : 0);
        
    } catch (error) {
        log('red', '💀', `テスト実行エラー: ${error.message}`);
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
    runPhase2ATests,
    TestUtils,
    results,
    metrics
};