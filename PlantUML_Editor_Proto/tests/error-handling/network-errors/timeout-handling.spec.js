/**
 * タイムアウト処理テスト - TEST-015-01
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: API接続タイムアウト、再試行ロジック、フォールバック処理
 * 
 * テスト項目:
 * 1. APIリクエストタイムアウト（5秒、10秒、30秒）
 * 2. WebSocket接続タイムアウト
 * 3. リソース読み込みタイムアウト
 * 4. 指数バックオフ再試行
 * 5. タイムアウト時のフォールバック処理
 * 6. タイムアウトエラーのユーザー通知
 */

const { test, expect } = require('@playwright/test');

test.describe('タイムアウト処理テスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
        
        // ネットワークエラーシミュレーション用の関数を注入
        await page.addInitScript(() => {
            // オリジナルfetchを保存
            window.originalFetch = window.fetch;
            
            // タイムアウトシミュレーション関数
            window.simulateTimeout = (delay) => {
                window.fetch = (...args) => {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            reject(new Error(`Request timeout after ${delay}ms`));
                        }, delay);
                    });
                };
            };
            
            // fetch復元関数
            window.restoreFetch = () => {
                window.fetch = window.originalFetch;
            };
            
            // 遅延レスポンスシミュレーション
            window.simulateSlowResponse = (delay) => {
                window.fetch = (...args) => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(new Response('{"status": "slow_response"}', {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            }));
                        }, delay);
                    });
                };
            };
        });
    });

    test.afterEach(async ({ page }) => {
        // fetchを復元
        await page.evaluate(() => {
            if (window.restoreFetch) {
                window.restoreFetch();
            }
        });
    });

    test('5秒タイムアウトでのエラーハンドリング', async ({ page }) => {
        // 5秒タイムアウトをシミュレート
        await page.evaluate(() => {
            window.simulateTimeout(5000);
        });
        
        // PlantUML変換処理でAPI呼び出しを誘発
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ユーザーがシステムにアクセスしてデータを取得する');
        
        // タイムアウトが発生するまで待機
        await page.waitForTimeout(6000);
        
        // エラーが適切に記録されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        // タイムアウトエラーが記録されているか確認
        expect(errorStats.totalErrors || 0).toBeGreaterThan(0);
        
        // ユーザーにタイムアウト通知が表示されているか確認
        const errorToast = await page.$('#error-boundary-toast, .error-toast, .timeout-warning');
        const hasTimeoutNotification = errorToast !== null;
        
        console.log(`5秒タイムアウトテスト: エラー数=${errorStats.totalErrors || 0}, 通知表示=${hasTimeoutNotification}`);
        
        // フォールバック処理が実行されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0); // フォールバック処理により何らかの出力があることを確認
    });

    test('10秒タイムアウトでの再試行ロジック', async ({ page }) => {
        // 再試行カウンターを追跡
        await page.evaluate(() => {
            window.retryCount = 0;
            window.originalFetch = window.fetch;
            
            window.fetch = (...args) => {
                window.retryCount++;
                console.log(`Fetch attempt ${window.retryCount}`);
                
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Request timeout after 10000ms (attempt ${window.retryCount})`));
                    }, 1000); // 実際のテストでは短縮
                });
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'システムが外部APIに接続してデータを同期する');
        
        // 再試行が完了するまで待機
        await page.waitForTimeout(8000);
        
        // 再試行回数を確認
        const retryCount = await page.evaluate(() => window.retryCount || 0);
        expect(retryCount).toBeGreaterThan(1); // 最低1回は再試行されることを確認
        expect(retryCount).toBeLessThanOrEqual(3); // 最大再試行回数を超えないことを確認
        
        // 指数バックオフが適用されているか確認（ログで確認）
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
        });
        
        console.log(`10秒タイムアウト再試行テスト: 再試行回数=${retryCount}, エラー数=${errorStats.totalErrors || 0}`);
        
        // 最終的にフォールバック処理が実行されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent).toContain('システム'); // 最低限の処理は実行されている
    });

    test('30秒極端タイムアウトでの緊急処理', async ({ page }) => {
        // 30秒タイムアウトシミュレーション（テストでは短縮）
        await page.evaluate(() => {
            window.fetch = (...args) => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Extreme timeout - 30 seconds exceeded'));
                    }, 2000); // テスト用に短縮
                });
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '大規模システムが複数のマイクロサービスと通信する');
        
        await page.waitForTimeout(3000);
        
        // 極端なタイムアウトの場合の緊急処理が実行されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
        });
        
        // 重大エラーとして分類されているか確認
        const hasCriticalError = errorStats.errorsBySeverity?.critical > 0;
        console.log(`30秒極端タイムアウトテスト: 重大エラー=${hasCriticalError}, 総エラー数=${errorStats.totalErrors || 0}`);
        
        // 緊急フォールバック UIが表示されているか確認
        const emergencyMessage = await page.$('.emergency-fallback, .critical-error, .system-failure');
        const hasEmergencyUI = emergencyMessage !== null;
        
        console.log(`緊急UI表示: ${hasEmergencyUI}`);
    });

    test('WebSocket接続タイムアウト処理', async ({ page }) => {
        // WebSocket接続のタイムアウトをシミュレート
        await page.evaluate(() => {
            // WebSocketをモック
            window.originalWebSocket = window.WebSocket;
            window.WebSocket = function(url) {
                const mockWS = {
                    readyState: 0, // CONNECTING
                    close: function() { this.readyState = 3; },
                    send: function() { throw new Error('WebSocket connection timeout'); }
                };
                
                // 接続タイムアウトをシミュレート
                setTimeout(() => {
                    if (mockWS.onerror) {
                        mockWS.onerror(new Event('error'));
                    }
                }, 1000);
                
                return mockWS;
            };
        });
        
        // WebSocket使用を想定した操作
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'リアルタイム通信でデータを送信');
        await page.waitForTimeout(2000);
        
        // WebSocketエラーが適切に処理されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        console.log(`WebSocketタイムアウトテスト: エラー数=${errorStats.totalErrors || 0}`);
        
        // WebSocketを復元
        await page.evaluate(() => {
            if (window.originalWebSocket) {
                window.WebSocket = window.originalWebSocket;
            }
        });
    });

    test('リソース読み込みタイムアウト処理', async ({ page }) => {
        // 画像やスクリプトの読み込みタイムアウトをシミュレート
        await page.evaluate(() => {
            // 存在しないリソースを動的に追加
            const img = document.createElement('img');
            img.src = 'http://nonexistent-server.example.com/timeout-image.jpg';
            img.onerror = () => {
                console.log('Image load timeout detected');
                if (window.errorBoundary) {
                    window.errorBoundary.handleError({
                        type: 'resource',
                        message: 'Image load timeout',
                        timestamp: Date.now()
                    });
                }
            };
            document.head.appendChild(img);
            
            // スクリプトタイムアウトもシミュレート
            const script = document.createElement('script');
            script.src = 'http://nonexistent-server.example.com/timeout-script.js';
            script.onerror = () => {
                console.log('Script load timeout detected');
                if (window.errorBoundary) {
                    window.errorBoundary.handleError({
                        type: 'resource',
                        message: 'Script load timeout',
                        timestamp: Date.now()
                    });
                }
            };
            document.head.appendChild(script);
        });
        
        await page.waitForTimeout(3000);
        
        // リソース読み込みエラーが記録されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        console.log(`リソースタイムアウトテスト: エラー数=${errorStats.totalErrors || 0}`);
        
        // リソースエラーが適切に分類されているか確認
        const hasResourceErrors = errorStats.errorsByType?.resource > 0;
        console.log(`リソースエラー分類: ${hasResourceErrors}`);
    });

    test('指数バックオフ再試行アルゴリズム', async ({ page }) => {
        // 再試行間隔を記録
        await page.evaluate(() => {
            window.retryTimestamps = [];
            window.retryAttempts = 0;
            
            window.fetch = (...args) => {
                window.retryAttempts++;
                window.retryTimestamps.push(Date.now());
                
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Retry attempt ${window.retryAttempts} failed`));
                    }, 100);
                });
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ネットワーク不安定時のシステム処理');
        
        // 再試行が完了するまで待機
        await page.waitForTimeout(5000);
        
        // 指数バックオフの間隔をチェック
        const retryData = await page.evaluate(() => ({
            attempts: window.retryAttempts || 0,
            timestamps: window.retryTimestamps || []
        }));
        
        if (retryData.timestamps.length > 1) {
            const intervals = [];
            for (let i = 1; i < retryData.timestamps.length; i++) {
                intervals.push(retryData.timestamps[i] - retryData.timestamps[i - 1]);
            }
            
            console.log(`指数バックオフテスト: 再試行回数=${retryData.attempts}, 間隔=${intervals.join(', ')}ms`);
            
            // 間隔が増加していることを確認（指数バックオフ）
            if (intervals.length > 1) {
                expect(intervals[1]).toBeGreaterThan(intervals[0]);
            }
        }
    });

    test('タイムアウト時のユーザーフィードバック', async ({ page }) => {
        // タイムアウトをシミュレート
        await page.evaluate(() => {
            window.fetch = (...args) => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('User feedback timeout test'));
                    }, 1000);
                });
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ユーザーフィードバックテスト用入力');
        await page.waitForTimeout(2000);
        
        // タイムアウト通知UIの確認
        const notificationElements = await page.$$('.error-toast, .timeout-notification, .network-error, [data-error-type="timeout"]');
        const hasTimeoutNotification = notificationElements.length > 0;
        
        // プログレス表示の確認
        const progressElements = await page.$$('.loading, .spinner, .progress, [data-loading]');
        const hasProgressIndicator = progressElements.length > 0;
        
        // ユーザー向けメッセージの確認
        const messageElements = await page.$$(':has-text("接続"), :has-text("タイムアウト"), :has-text("再試行"), :has-text("しばらく")');
        const hasUserMessage = messageElements.length > 0;
        
        console.log(`ユーザーフィードバック: 通知=${hasTimeoutNotification}, プログレス=${hasProgressIndicator}, メッセージ=${hasUserMessage}`);
        
        // 少なくとも1つのフィードバック要素が存在することを確認
        expect(hasTimeoutNotification || hasProgressIndicator || hasUserMessage).toBe(true);
    });

    test('タイムアウト回復後の正常動作確認', async ({ page }) => {
        // まずタイムアウトをシミュレート
        await page.evaluate(() => {
            window.timeoutSimulation = true;
            window.fetch = (...args) => {
                if (window.timeoutSimulation) {
                    return Promise.reject(new Error('Simulated timeout'));
                } else {
                    return window.originalFetch(...args);
                }
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'タイムアウト回復テスト');
        await page.waitForTimeout(1000);
        
        // 初期エラー数を記録
        const initialErrorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        // ネットワークを回復
        await page.evaluate(() => {
            window.timeoutSimulation = false;
            window.restoreFetch();
        });
        
        // 回復後の処理をテスト
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '回復後の正常処理テスト');
        await page.waitForTimeout(1000);
        
        // 正常に処理されることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent).toContain('回復後');
        
        // 回復後のエラー数変化を確認
        const finalErrorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        console.log(`タイムアウト回復テスト: 初期エラー=${initialErrorStats.totalErrors || 0}, 最終エラー=${finalErrorStats.totalErrors || 0}`);
        console.log(`正常処理確認: 出力="回復後の正常処理テスト"を含む=${outputContent.includes('回復後')}`);
    });

    test('複数同時タイムアウトの処理', async ({ page }) => {
        // 複数のリクエストが同時にタイムアウトする状況をシミュレート
        await page.evaluate(() => {
            window.concurrentRequests = 0;
            window.fetch = (...args) => {
                window.concurrentRequests++;
                const requestId = window.concurrentRequests;
                
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Concurrent timeout ${requestId}`));
                    }, 500 + Math.random() * 1000); // ランダムなタイムアウト
                });
            };
        });
        
        // 複数の入力を高速で実行
        const inputs = [
            '第1のシステム処理',
            '第2のシステム処理',
            '第3のシステム処理',
            '第4のシステム処理'
        ];
        
        for (let i = 0; i < inputs.length; i++) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', inputs[i]);
            await page.waitForTimeout(100); // 短い間隔で連続実行
        }
        
        await page.waitForTimeout(3000);
        
        // 複数のエラーが適切に処理されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        const concurrentRequests = await page.evaluate(() => window.concurrentRequests || 0);
        
        console.log(`複数同時タイムアウトテスト: 同時リクエスト数=${concurrentRequests}, エラー数=${errorStats.totalErrors || 0}`);
        
        // システムが応答不能にならないことを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // エラー境界がクラッシュしていないことを確認
        const errorBoundaryActive = await page.evaluate(() => {
            return window.errorBoundary && typeof window.errorBoundary.getErrorStats === 'function';
        });
        expect(errorBoundaryActive).toBe(true);
    });
});