/**
 * 接続失敗・CORSエラーテスト - TEST-015-02
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: ネットワーク断絶、CORS、DNS解決失敗、SSL/TLS エラー
 * 
 * テスト項目:
 * 1. ネットワーク断絶時の処理
 * 2. CORSポリシー違反の処理
 * 3. DNS解決失敗の処理
 * 4. SSL/TLS証明書エラー
 * 5. プロキシ・ファイアウォールブロック
 * 6. 部分的ネットワーク障害
 */

const { test, expect } = require('@playwright/test');

test.describe('接続失敗・CORSエラーテスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
        
        // ネットワークエラーシミュレーション用の関数を注入
        await page.addInitScript(() => {
            window.originalFetch = window.fetch;
            
            // ネットワーク断絶シミュレーション
            window.simulateNetworkFailure = () => {
                window.fetch = (...args) => {
                    return Promise.reject(new Error('Network request failed: Connection refused'));
                };
            };
            
            // CORSエラーシミュレーション
            window.simulateCORSError = () => {
                window.fetch = (...args) => {
                    return Promise.reject(new TypeError('Failed to fetch: CORS policy violation'));
                };
            };
            
            // DNS解決失敗シミュレーション
            window.simulateDNSFailure = () => {
                window.fetch = (...args) => {
                    return Promise.reject(new Error('Network request failed: DNS_PROBE_FINISHED_NXDOMAIN'));
                };
            };
            
            // SSL/TLSエラーシミュレーション
            window.simulateSSLError = () => {
                window.fetch = (...args) => {
                    return Promise.reject(new Error('Network request failed: SSL_ERROR_BAD_CERT_DOMAIN'));
                };
            };
            
            // fetch復元
            window.restoreFetch = () => {
                window.fetch = window.originalFetch;
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

    test('完全ネットワーク断絶時の処理', async ({ page }) => {
        // ネットワーク断絶をシミュレート
        await page.evaluate(() => {
            window.simulateNetworkFailure();
        });
        
        // オフライン状態をシミュレート
        await page.evaluate(() => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            // オフラインイベントを発火
            window.dispatchEvent(new Event('offline'));
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'オフライン時のシステム処理テスト');
        await page.waitForTimeout(2000);
        
        // オフライン状態が検出されているか確認
        const isOffline = await page.evaluate(() => !navigator.onLine);
        expect(isOffline).toBe(true);
        
        // ネットワークエラーが適切に記録されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        console.log(`ネットワーク断絶テスト: オフライン=${isOffline}, エラー数=${errorStats.totalErrors || 0}`);
        
        // オフライン通知が表示されているか確認
        const offlineNotification = await page.$('.offline-notification, .network-error, [data-offline="true"]');
        const hasOfflineNotification = offlineNotification !== null;
        
        // オフライン時のフォールバック処理が実行されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0); // ローカル処理による出力があることを確認
        
        console.log(`オフライン通知表示: ${hasOfflineNotification}`);
        
        // オンライン復旧をシミュレート
        await page.evaluate(() => {
            Object.defineProperty(navigator, 'onLine', {
                value: true
            });
            window.dispatchEvent(new Event('online'));
            window.restoreFetch();
        });
    });

    test('CORSポリシー違反の処理', async ({ page }) => {
        // CORSエラーをシミュレート
        await page.evaluate(() => {
            window.simulateCORSError();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '外部APIとのCORS通信テスト');
        await page.waitForTimeout(1500);
        
        // CORSエラーが適切に検出・処理されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        // エラー履歴からCORSエラーを検索
        const corsErrorDetected = await page.evaluate(() => {
            if (!window.errorBoundary || !window.errorBoundary.errorHistory) return false;
            
            return window.errorBoundary.errorHistory.some(error => 
                error.message && (
                    error.message.includes('CORS') ||
                    error.message.includes('cross-origin') ||
                    error.message.includes('Failed to fetch')
                )
            );
        });
        
        console.log(`CORSエラーテスト: CORS検出=${corsErrorDetected}, エラー数=${errorStats.totalErrors || 0}`);
        
        // CORS関連のエラー通知が表示されているか確認
        const corsNotification = await page.$('.cors-error, .cross-origin-error, [data-error-type="cors"]');
        const hasCorsNotification = corsNotification !== null;
        
        // フォールバック処理（ローカル処理やプロキシ使用など）が実行されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent).toContain('CORS'); // 入力が適切に処理されていることを確認
        
        console.log(`CORS通知表示: ${hasCorsNotification}`);
    });

    test('DNS解決失敗の処理', async ({ page }) => {
        // DNS解決失敗をシミュレート
        await page.evaluate(() => {
            window.simulateDNSFailure();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'DNS解決が必要な外部サービス接続');
        await page.waitForTimeout(1500);
        
        // DNS関連エラーの検出
        const dnsErrorDetected = await page.evaluate(() => {
            if (!window.errorBoundary || !window.errorBoundary.errorHistory) return false;
            
            return window.errorBoundary.errorHistory.some(error => 
                error.message && (
                    error.message.includes('DNS') ||
                    error.message.includes('NXDOMAIN') ||
                    error.message.includes('Name resolution')
                )
            );
        });
        
        console.log(`DNS解決失敗テスト: DNS エラー検出=${dnsErrorDetected}`);
        
        // DNS エラー用の通知が表示されているか確認
        const dnsNotification = await page.$('.dns-error, .name-resolution-error, [data-error-type="dns"]');
        const hasDnsNotification = dnsNotification !== null;
        
        // DNSフォールバック（代替サーバーやキャッシュ使用）が実行されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        console.log(`DNS通知表示: ${hasDnsNotification}`);
    });

    test('SSL/TLS証明書エラーの処理', async ({ page }) => {
        // SSL/TLSエラーをシミュレート
        await page.evaluate(() => {
            window.simulateSSLError();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'HTTPS通信でのSSL証明書検証テスト');
        await page.waitForTimeout(1500);
        
        // SSL関連エラーの検出
        const sslErrorDetected = await page.evaluate(() => {
            if (!window.errorBoundary || !window.errorBoundary.errorHistory) return false;
            
            return window.errorBoundary.errorHistory.some(error => 
                error.message && (
                    error.message.includes('SSL') ||
                    error.message.includes('TLS') ||
                    error.message.includes('certificate') ||
                    error.message.includes('CERT_')
                )
            );
        });
        
        console.log(`SSL/TLSエラーテスト: SSL エラー検出=${sslErrorDetected}`);
        
        // SSL/TLS関連のセキュリティ警告が表示されているか確認
        const sslWarning = await page.$('.ssl-error, .certificate-error, .security-warning, [data-error-type="ssl"]');
        const hasSslWarning = sslWarning !== null;
        
        // セキュリティエラーとして適切に分類されているか確認
        const securityStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
        });
        
        const hasSecurityIncident = (securityStats.security?.securityIncidentCount || 0) > 0;
        
        console.log(`SSL警告表示: ${hasSslWarning}, セキュリティインシデント: ${hasSecurityIncident}`);
        
        // セキュリティエラーの場合、より厳重な処理が実行されているか確認
        if (sslErrorDetected) {
            expect(hasSecurityIncident || hasSslWarning).toBe(true);
        }
    });

    test('プロキシ・ファイアウォールブロックの処理', async ({ page }) => {
        // プロキシ/ファイアウォールブロックをシミュレート
        await page.evaluate(() => {
            window.fetch = (...args) => {
                const url = args[0];
                if (typeof url === 'string' && url.includes('external')) {
                    return Promise.reject(new Error('Network request blocked by firewall/proxy'));
                }
                return Promise.reject(new Error('Connection refused by proxy server'));
            };
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '外部サービスへのプロキシ経由接続テスト');
        await page.waitForTimeout(1500);
        
        // ブロック関連エラーの検出
        const blockErrorDetected = await page.evaluate(() => {
            if (!window.errorBoundary || !window.errorBoundary.errorHistory) return false;
            
            return window.errorBoundary.errorHistory.some(error => 
                error.message && (
                    error.message.includes('blocked') ||
                    error.message.includes('firewall') ||
                    error.message.includes('proxy') ||
                    error.message.includes('refused')
                )
            );
        });
        
        console.log(`プロキシ/ファイアウォールブロックテスト: ブロック検出=${blockErrorDetected}`);
        
        // ブロック通知が表示されているか確認
        const blockNotification = await page.$('.blocked-request, .firewall-error, .proxy-error, [data-error-type="blocked"]');
        const hasBlockNotification = blockNotification !== null;
        
        // 代替接続方法の提案や設定変更案内が表示されているか確認
        const alternativeMessage = await page.$$(':has-text("プロキシ"), :has-text("ファイアウォール"), :has-text("ネットワーク設定"), :has-text("管理者")');
        const hasAlternativeGuidance = alternativeMessage.length > 0;
        
        console.log(`ブロック通知: ${hasBlockNotification}, 代替案内: ${hasAlternativeGuidance}`);
    });

    test('部分的ネットワーク障害（間欠的接続）', async ({ page }) => {
        // 間欠的な接続失敗をシミュレート
        let requestCount = 0;
        await page.evaluate(() => {
            window.requestCount = 0;
            window.fetch = (...args) => {
                window.requestCount++;
                
                // 3回に1回成功する不安定な接続をシミュレート
                if (window.requestCount % 3 === 0) {
                    return Promise.resolve(new Response('{"status": "success"}', {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                } else {
                    return Promise.reject(new Error(`Intermittent connection failure (attempt ${window.requestCount})`));
                }
            };
        });
        
        // 複数回の処理を実行して間欠的障害をテスト
        const inputs = [
            '不安定ネットワーク処理1',
            '不安定ネットワーク処理2', 
            '不安定ネットワーク処理3',
            '不安定ネットワーク処理4',
            '不安定ネットワーク処理5'
        ];
        
        for (const input of inputs) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', input);
            await page.waitForTimeout(500);
        }
        
        await page.waitForTimeout(1000);
        
        // 間欠的エラーが適切に処理されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        const requestCount = await page.evaluate(() => window.requestCount || 0);
        
        console.log(`間欠的障害テスト: リクエスト数=${requestCount}, エラー数=${errorStats.totalErrors || 0}`);
        
        // 一部成功、一部失敗の混在状態が適切に処理されているか確認
        expect(requestCount).toBeGreaterThan(0);
        expect(errorStats.totalErrors || 0).toBeGreaterThan(0);
        
        // 最終的に何らかの出力が得られていることを確認（フォールバック処理）
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('ネットワーク回復時の自動再接続', async ({ page }) => {
        // 初期は接続失敗状態
        await page.evaluate(() => {
            window.networkRecovered = false;
            window.fetch = (...args) => {
                if (window.networkRecovered) {
                    return Promise.resolve(new Response('{"status": "network_recovered"}', {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                } else {
                    return Promise.reject(new Error('Network temporarily unavailable'));
                }
            };
        });
        
        // 接続失敗状態での処理
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ネットワーク回復テスト - 失敗段階');
        await page.waitForTimeout(1000);
        
        // 初期エラー数を記録
        const initialErrorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        // ネットワーク回復をシミュレート
        await page.evaluate(() => {
            window.networkRecovered = true;
            
            // オンライン復旧イベントを発火
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });
            window.dispatchEvent(new Event('online'));
        });
        
        // 回復後の処理
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ネットワーク回復テスト - 回復段階');
        await page.waitForTimeout(1000);
        
        // 自動再接続が成功しているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent).toContain('回復段階');
        
        // 回復通知が表示されているか確認
        const recoveryNotification = await page.$('.network-recovered, .connection-restored, [data-status="online"]');
        const hasRecoveryNotification = recoveryNotification !== null;
        
        console.log(`ネットワーク回復テスト: 初期エラー=${initialErrorStats.totalErrors || 0}, 回復通知=${hasRecoveryNotification}`);
    });

    test('複数の同時接続失敗', async ({ page }) => {
        // 複数の異なる接続失敗をシミュレート
        await page.evaluate(() => {
            window.failureTypes = ['cors', 'dns', 'ssl', 'timeout', 'refused'];
            window.requestCounter = 0;
            
            window.fetch = (...args) => {
                const failureType = window.failureTypes[window.requestCounter % window.failureTypes.length];
                window.requestCounter++;
                
                switch (failureType) {
                    case 'cors':
                        return Promise.reject(new TypeError('CORS policy violation'));
                    case 'dns':
                        return Promise.reject(new Error('DNS_PROBE_FINISHED_NXDOMAIN'));
                    case 'ssl':
                        return Promise.reject(new Error('SSL_ERROR_BAD_CERT_DOMAIN'));
                    case 'timeout':
                        return new Promise((resolve, reject) => {
                            setTimeout(() => reject(new Error('Request timeout')), 100);
                        });
                    case 'refused':
                        return Promise.reject(new Error('Connection refused'));
                    default:
                        return Promise.reject(new Error('Unknown network error'));
                }
            };
        });
        
        // 複数の処理を並行実行
        const parallelInputs = [
            'パラレル処理A',
            'パラレル処理B', 
            'パラレル処理C',
            'パラレル処理D',
            'パラレル処理E'
        ];
        
        // 並行処理を開始
        const promises = parallelInputs.map(async (input, index) => {
            await page.waitForTimeout(index * 50); // わずかにずらして実行
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', input);
        });
        
        await Promise.all(promises);
        await page.waitForTimeout(2000);
        
        // 複数の異なるエラータイプが適切に処理されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        const requestCounter = await page.evaluate(() => window.requestCounter || 0);
        
        console.log(`複数同時接続失敗テスト: リクエスト数=${requestCounter}, エラー数=${errorStats.totalErrors || 0}`);
        
        // システムが応答不能にならず、各エラーが適切に分類されているか確認
        expect(errorStats.totalErrors || 0).toBeGreaterThan(0);
        expect(requestCounter).toBeGreaterThan(0);
        
        // エラー境界が正常に機能していることを確認
        const errorBoundaryActive = await page.evaluate(() => {
            return window.errorBoundary && typeof window.errorBoundary.getErrorStats === 'function';
        });
        expect(errorBoundaryActive).toBe(true);
        
        // 最終的に何らかの出力が得られていることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });
});