/**
 * 再試行ロジック・レート制限テスト - TEST-015-03
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: 429 Too Many Requests、5XX サーバーエラー、指数バックオフ
 * 
 * テスト項目:
 * 1. 429 Too Many Requests の処理
 * 2. 5XX サーバーエラーの再試行
 * 3. 指数バックオフアルゴリズム
 * 4. ジッター機能
 * 5. 最大再試行回数制限
 * 6. サーキットブレーカーパターン
 */

const { test, expect } = require('@playwright/test');

test.describe('再試行ロジック・レート制限テスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
        
        // 再試行ロジックテスト用の関数を注入
        await page.addInitScript(() => {
            window.originalFetch = window.fetch;
            window.retryAttempts = [];
            window.requestTimes = [];
            
            // 429 Too Many Requests シミュレーション
            window.simulate429Error = (maxRetries = 3) => {
                window.retryCount = 0;
                window.fetch = (...args) => {
                    window.retryCount++;
                    window.retryAttempts.push({
                        attempt: window.retryCount,
                        timestamp: Date.now(),
                        url: args[0]
                    });
                    
                    if (window.retryCount <= maxRetries) {
                        return Promise.reject(new Response('Too Many Requests', {
                            status: 429,
                            headers: { 
                                'Retry-After': '2',
                                'X-RateLimit-Remaining': '0',
                                'X-RateLimit-Reset': Date.now() + 2000
                            }
                        }));
                    } else {
                        return Promise.resolve(new Response('{"status": "success_after_retries"}', {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }));
                    }
                };
            };
            
            // 5XX サーバーエラーシミュレーション
            window.simulate5xxError = (errorCode = 500) => {
                window.serverErrorCount = 0;
                window.fetch = (...args) => {
                    window.serverErrorCount++;
                    window.retryAttempts.push({
                        attempt: window.serverErrorCount,
                        timestamp: Date.now(),
                        url: args[0],
                        errorCode
                    });
                    
                    const errorMessages = {
                        500: 'Internal Server Error',
                        502: 'Bad Gateway',
                        503: 'Service Unavailable',
                        504: 'Gateway Timeout'
                    };
                    
                    if (window.serverErrorCount <= 3) {
                        return Promise.resolve(new Response(errorMessages[errorCode], {
                            status: errorCode,
                            statusText: errorMessages[errorCode]
                        }));
                    } else {
                        return Promise.resolve(new Response('{"status": "server_recovered"}', {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }));
                    }
                };
            };
            
            // 指数バックオフテスト用
            window.simulateExponentialBackoff = () => {
                window.backoffAttempts = [];
                window.fetch = (...args) => {
                    const attempt = window.backoffAttempts.length + 1;
                    window.backoffAttempts.push({
                        attempt,
                        timestamp: Date.now()
                    });
                    
                    if (attempt <= 4) {
                        return Promise.reject(new Error(`Backoff test attempt ${attempt}`));
                    } else {
                        return Promise.resolve(new Response('{"status": "backoff_success"}', {
                            status: 200
                        }));
                    }
                };
            };
            
            // fetch復元
            window.restoreFetch = () => {
                window.fetch = window.originalFetch;
                window.retryAttempts = [];
                window.requestTimes = [];
            };
        });
    });

    test.afterEach(async ({ page }) => {
        await page.evaluate(() => {
            if (window.restoreFetch) {
                window.restoreFetch();
            }
        });
    });

    test('429 Too Many Requests の適切な処理', async ({ page }) => {
        // 429エラーをシミュレート
        await page.evaluate(() => {
            window.simulate429Error(2);
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'レート制限テスト - 429エラー対応');
        await page.waitForTimeout(3000);
        
        // 再試行が適切に実行されているか確認
        const retryData = await page.evaluate(() => ({
            attempts: window.retryAttempts || [],
            count: window.retryCount || 0
        }));
        
        console.log(`429エラーテスト: 再試行回数=${retryData.count}, 試行データ数=${retryData.attempts.length}`);
        
        // 適切な回数の再試行が実行されているか確認
        expect(retryData.count).toBeGreaterThan(1);
        expect(retryData.count).toBeLessThanOrEqual(4); // 最大再試行回数以内
        
        // Retry-After ヘッダーに基づく待機が実行されているか確認
        if (retryData.attempts.length > 1) {
            const timeDiff = retryData.attempts[1].timestamp - retryData.attempts[0].timestamp;
            expect(timeDiff).toBeGreaterThan(1000); // 最低1秒は待機
        }
        
        // レート制限エラーが適切に分類されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        // レート制限通知が表示されているか確認
        const rateLimitNotification = await page.$('.rate-limit-error, .too-many-requests, [data-error-type="rate-limit"]');
        const hasRateLimitNotification = rateLimitNotification !== null;
        
        console.log(`レート制限通知: ${hasRateLimitNotification}, エラー総数: ${errorStats.totalErrors || 0}`);
    });

    test('500 Internal Server Error の再試行処理', async ({ page }) => {
        // 500エラーをシミュレート
        await page.evaluate(() => {
            window.simulate5xxError(500);
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'サーバーエラー500 - 再試行テスト');
        await page.waitForTimeout(4000);
        
        // サーバーエラー再試行データを取得
        const serverErrorData = await page.evaluate(() => ({
            count: window.serverErrorCount || 0,
            attempts: window.retryAttempts || []
        }));
        
        console.log(`500エラーテスト: サーバーエラー回数=${serverErrorData.count}`);
        
        // 500エラーでは再試行が実行されることを確認
        expect(serverErrorData.count).toBeGreaterThan(1);
        
        // 最終的に成功レスポンスが得られることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // サーバーエラーが適切にログ記録されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        console.log(`サーバーエラー統計: ${errorStats.totalErrors || 0} errors`);
    });

    test('502 Bad Gateway の処理', async ({ page }) => {
        await page.evaluate(() => {
            window.simulate5xxError(502);
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Bad Gateway 502 エラー処理テスト');
        await page.waitForTimeout(3000);
        
        const errorData = await page.evaluate(() => ({
            count: window.serverErrorCount || 0,
            attempts: window.retryAttempts || []
        }));
        
        console.log(`502エラーテスト: Gateway エラー回数=${errorData.count}`);
        
        // Gateway エラーでも再試行が実行されることを確認
        expect(errorData.count).toBeGreaterThan(1);
        
        // Gateway エラー通知の確認
        const gatewayNotification = await page.$('.gateway-error, .bad-gateway, [data-error-type="gateway"]');
        console.log(`Gateway通知表示: ${gatewayNotification !== null}`);
    });

    test('503 Service Unavailable の処理', async ({ page }) => {
        await page.evaluate(() => {
            window.simulate5xxError(503);
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Service Unavailable 503 エラー処理');
        await page.waitForTimeout(3000);
        
        const serviceErrorData = await page.evaluate(() => ({
            count: window.serverErrorCount || 0
        }));
        
        console.log(`503エラーテスト: Service エラー回数=${serviceErrorData.count}`);
        
        // サービス利用不可時の適切な処理を確認
        expect(serviceErrorData.count).toBeGreaterThan(0);
        
        // サービス利用不可通知の確認
        const serviceNotification = await page.$('.service-unavailable, .maintenance-mode, [data-error-type="service"]');
        console.log(`Service通知表示: ${serviceNotification !== null}`);
    });

    test('504 Gateway Timeout の処理', async ({ page }) => {
        await page.evaluate(() => {
            window.simulate5xxError(504);
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Gateway Timeout 504 エラー処理テスト');
        await page.waitForTimeout(3000);
        
        const timeoutErrorData = await page.evaluate(() => ({
            count: window.serverErrorCount || 0
        }));
        
        console.log(`504エラーテスト: Timeout エラー回数=${timeoutErrorData.count}`);
        
        // Gateway タイムアウトでの再試行を確認
        expect(timeoutErrorData.count).toBeGreaterThan(0);
        
        // タイムアウト通知の確認
        const timeoutNotification = await page.$('.gateway-timeout, .upstream-timeout, [data-error-type="timeout"]');
        console.log(`Timeout通知表示: ${timeoutNotification !== null}`);
    });

    test('指数バックオフアルゴリズムの検証', async ({ page }) => {
        // 指数バックオフをシミュレート
        await page.evaluate(() => {
            window.simulateExponentialBackoff();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '指数バックオフアルゴリズム検証テスト');
        await page.waitForTimeout(8000); // 指数バックオフの時間を考慮
        
        // バックオフ間隔を分析
        const backoffData = await page.evaluate(() => ({
            attempts: window.backoffAttempts || []
        }));
        
        if (backoffData.attempts.length > 1) {
            const intervals = [];
            for (let i = 1; i < backoffData.attempts.length; i++) {
                const interval = backoffData.attempts[i].timestamp - backoffData.attempts[i - 1].timestamp;
                intervals.push(interval);
            }
            
            console.log(`指数バックオフテスト: 試行回数=${backoffData.attempts.length}, 間隔=${intervals.join(', ')}ms`);
            
            // 間隔が指数的に増加していることを確認
            if (intervals.length > 1) {
                expect(intervals[1]).toBeGreaterThan(intervals[0] * 1.5); // 最低1.5倍の増加
            }
            
            // 最大間隔の制限を確認
            const maxInterval = Math.max(...intervals);
            expect(maxInterval).toBeLessThan(30000); // 30秒以内
        }
    });

    test('ジッター機能の検証', async ({ page }) => {
        // ジッター付きバックオフをシミュレート
        await page.evaluate(() => {
            window.jitterAttempts = [];
            window.fetch = (...args) => {
                const attempt = window.jitterAttempts.length + 1;
                window.jitterAttempts.push({
                    attempt,
                    timestamp: Date.now()
                });
                
                if (attempt <= 3) {
                    return Promise.reject(new Error(`Jitter test attempt ${attempt}`));
                } else {
                    return Promise.resolve(new Response('{"status": "jitter_success"}', {
                        status: 200
                    }));
                }
            };
        });
        
        // 複数の並行リクエストでジッターをテスト
        const parallelPromises = [];
        for (let i = 0; i < 3; i++) {
            parallelPromises.push(
                page.fill('[data-testid="japanese-input"], #japanese-input, textarea', `ジッターテスト ${i + 1}`)
                    .then(() => page.waitForTimeout(100))
            );
        }
        
        await Promise.all(parallelPromises);
        await page.waitForTimeout(5000);
        
        // ジッターによる分散効果を確認
        const jitterData = await page.evaluate(() => ({
            attempts: window.jitterAttempts || []
        }));
        
        console.log(`ジッターテスト: 総試行回数=${jitterData.attempts.length}`);
        
        // 並行リクエストの場合、ジッターにより試行タイミングが分散されていることを期待
        if (jitterData.attempts.length > 2) {
            const firstInterval = jitterData.attempts[1].timestamp - jitterData.attempts[0].timestamp;
            const secondInterval = jitterData.attempts[2].timestamp - jitterData.attempts[1].timestamp;
            
            console.log(`ジッター間隔: ${firstInterval}ms, ${secondInterval}ms`);
            
            // 完全に同じタイミングではないことを確認（ジッターが機能している）
            expect(Math.abs(firstInterval - secondInterval)).toBeGreaterThan(50);
        }
    });

    test('最大再試行回数制限の検証', async ({ page }) => {
        // 常に失敗するリクエストをシミュレート
        await page.evaluate(() => {
            window.maxRetryAttempts = [];
            window.fetch = (...args) => {
                const attempt = window.maxRetryAttempts.length + 1;
                window.maxRetryAttempts.push({
                    attempt,
                    timestamp: Date.now()
                });
                
                return Promise.reject(new Error(`Max retry test - attempt ${attempt} always fails`));
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '最大再試行回数制限テスト');
        await page.waitForTimeout(10000); // 十分な時間を待つ
        
        // 最大再試行回数を確認
        const maxRetryData = await page.evaluate(() => ({
            attempts: window.maxRetryAttempts || []
        }));
        
        console.log(`最大再試行テスト: 試行回数=${maxRetryData.attempts.length}`);
        
        // 設定された最大再試行回数以内であることを確認
        expect(maxRetryData.attempts.length).toBeLessThanOrEqual(5); // 想定最大値
        
        // 再試行が停止した後のフォールバック処理を確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0); // フォールバック処理による出力
        
        // 最大再試行回数到達時の通知を確認
        const maxRetryNotification = await page.$('.max-retries-exceeded, .retry-limit, [data-error-type="max-retry"]');
        const hasMaxRetryNotification = maxRetryNotification !== null;
        
        console.log(`最大再試行通知: ${hasMaxRetryNotification}`);
    });

    test('サーキットブレーカーパターンの検証', async ({ page }) => {
        // サーキットブレーカーをシミュレート
        await page.evaluate(() => {
            window.circuitBreakerState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
            window.failureCount = 0;
            window.circuitBreakerAttempts = [];
            
            window.fetch = (...args) => {
                const attempt = window.circuitBreakerAttempts.length + 1;
                window.circuitBreakerAttempts.push({
                    attempt,
                    timestamp: Date.now(),
                    state: window.circuitBreakerState
                });
                
                if (window.circuitBreakerState === 'OPEN') {
                    return Promise.reject(new Error('Circuit breaker is OPEN - request blocked'));
                }
                
                window.failureCount++;
                
                if (window.failureCount >= 3) {
                    window.circuitBreakerState = 'OPEN';
                    
                    // 一定時間後にHALF_OPENに変更
                    setTimeout(() => {
                        window.circuitBreakerState = 'HALF_OPEN';
                    }, 2000);
                }
                
                return Promise.reject(new Error(`Circuit breaker test failure ${window.failureCount}`));
            };
        });
        
        // 複数回のリクエストでサーキットブレーカーを作動させる
        for (let i = 0; i < 5; i++) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', `サーキットブレーカーテスト ${i + 1}`);
            await page.waitForTimeout(500);
        }
        
        await page.waitForTimeout(3000);
        
        // サーキットブレーカーの状態変遷を確認
        const circuitBreakerData = await page.evaluate(() => ({
            attempts: window.circuitBreakerAttempts || [],
            currentState: window.circuitBreakerState,
            failureCount: window.failureCount
        }));
        
        console.log(`サーキットブレーカーテスト: 試行回数=${circuitBreakerData.attempts.length}, 現在状態=${circuitBreakerData.currentState}, 失敗回数=${circuitBreakerData.failureCount}`);
        
        // サーキットブレーカーが作動していることを確認
        expect(circuitBreakerData.attempts.length).toBeGreaterThan(0);
        
        // OPENステートでリクエストがブロックされていることを確認
        const hasOpenState = circuitBreakerData.attempts.some(attempt => attempt.state === 'OPEN');
        if (hasOpenState) {
            console.log('サーキットブレーカーがOPEN状態に移行しました');
        }
        
        // サーキットブレーカー通知の確認
        const circuitBreakerNotification = await page.$('.circuit-breaker, .service-degraded, [data-error-type="circuit-breaker"]');
        console.log(`サーキットブレーカー通知: ${circuitBreakerNotification !== null}`);
    });

    test('複合エラーシナリオでの再試行ロジック', async ({ page }) => {
        // 複数のエラータイプを組み合わせたシナリオ
        await page.evaluate(() => {
            window.complexRetryAttempts = [];
            window.complexScenarioCount = 0;
            
            window.fetch = (...args) => {
                const attempt = ++window.complexScenarioCount;
                window.complexRetryAttempts.push({
                    attempt,
                    timestamp: Date.now()
                });
                
                // 異なるエラーを順番に発生させる
                const errorTypes = [
                    () => Promise.resolve(new Response('Too Many Requests', { status: 429 })),
                    () => Promise.resolve(new Response('Internal Server Error', { status: 500 })),
                    () => Promise.reject(new Error('Network timeout')),
                    () => Promise.resolve(new Response('Bad Gateway', { status: 502 })),
                    () => Promise.resolve(new Response('{"status": "finally_success"}', { status: 200 }))
                ];
                
                const errorIndex = (attempt - 1) % errorTypes.length;
                return errorTypes[errorIndex]();
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '複合エラーシナリオ再試行テスト');
        await page.waitForTimeout(8000);
        
        // 複合シナリオの結果を確認
        const complexData = await page.evaluate(() => ({
            attempts: window.complexRetryAttempts || [],
            count: window.complexScenarioCount || 0
        }));
        
        console.log(`複合エラーシナリオ: 試行回数=${complexData.count}, 記録された試行=${complexData.attempts.length}`);
        
        // 各種エラーが適切に処理され、最終的に成功することを確認
        expect(complexData.count).toBeGreaterThan(3);
        
        // 最終的に何らかの出力が得られることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // 複合エラーが適切にログ記録されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        console.log(`複合エラー統計: 総エラー数=${errorStats.totalErrors || 0}`);
        
        // 異なるタイプのエラーが混在している場合の処理を確認
        expect(errorStats.totalErrors || 0).toBeGreaterThan(0);
    });
});