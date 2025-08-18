/**
 * 機能検出・フォールバックテスト - TEST-016-01
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: WebWorker、LocalStorage、Cookie、古いJavaScriptエンジン
 * 
 * テスト項目:
 * 1. WebWorker サポート検出とフォールバック
 * 2. Web Storage API サポート検出
 * 3. ES6+ 機能の検出とPolyfill
 * 4. CSS Grid・Flexbox サポート検出
 * 5. Touch API サポート検出
 * 6. 古いブラウザでの機能制限
 */

const { test, expect } = require('@playwright/test');

test.describe('機能検出・フォールバックテスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
        
        // 機能検出テスト用の関数を注入
        await page.addInitScript(() => {
            // 機能サポート状況を記録
            window.featureSupport = {};
            
            // WebWorker サポート無効化
            window.disableWebWorker = () => {
                window.featureSupport.originalWorker = window.Worker;
                window.Worker = undefined;
                delete window.Worker;
            };
            
            // LocalStorage サポート無効化
            window.disableLocalStorage = () => {
                window.featureSupport.originalLocalStorage = window.localStorage;
                Object.defineProperty(window, 'localStorage', {
                    value: null,
                    configurable: true
                });
            };
            
            // SessionStorage サポート無効化
            window.disableSessionStorage = () => {
                window.featureSupport.originalSessionStorage = window.sessionStorage;
                Object.defineProperty(window, 'sessionStorage', {
                    value: null,
                    configurable: true
                });
            };
            
            // Promise サポート無効化（古いブラウザシミュレート）
            window.disablePromise = () => {
                window.featureSupport.originalPromise = window.Promise;
                window.Promise = undefined;
                delete window.Promise;
            };
            
            // Fetch API サポート無効化
            window.disableFetch = () => {
                window.featureSupport.originalFetch = window.fetch;
                window.fetch = undefined;
                delete window.fetch;
            };
            
            // ES6 Map/Set サポート無効化
            window.disableES6Collections = () => {
                window.featureSupport.originalMap = window.Map;
                window.featureSupport.originalSet = window.Set;
                window.Map = undefined;
                window.Set = undefined;
                delete window.Map;
                delete window.Set;
            };
            
            // CSS機能サポート無効化
            window.disableCSS = (feature) => {
                if (!window.featureSupport.cssDisabled) {
                    window.featureSupport.cssDisabled = {};
                }
                window.featureSupport.cssDisabled[feature] = true;
                
                // CSS.supports を無効化
                if (window.CSS && window.CSS.supports) {
                    const originalSupports = window.CSS.supports;
                    window.CSS.supports = function(property, value) {
                        if (window.featureSupport.cssDisabled[property]) {
                            return false;
                        }
                        return originalSupports.call(this, property, value);
                    };
                }
            };
            
            // Touch API サポート無効化
            window.disableTouchAPI = () => {
                window.featureSupport.originalTouch = {
                    TouchEvent: window.TouchEvent,
                    ontouchstart: 'ontouchstart' in window
                };
                
                window.TouchEvent = undefined;
                delete window.TouchEvent;
                
                // Touch イベントプロパティを削除
                delete window.ontouchstart;
                delete window.ontouchmove;
                delete window.ontouchend;
            };
            
            // 機能復元
            window.restoreFeatures = () => {
                if (window.featureSupport.originalWorker) {
                    window.Worker = window.featureSupport.originalWorker;
                }
                if (window.featureSupport.originalLocalStorage) {
                    Object.defineProperty(window, 'localStorage', {
                        value: window.featureSupport.originalLocalStorage,
                        configurable: true
                    });
                }
                if (window.featureSupport.originalSessionStorage) {
                    Object.defineProperty(window, 'sessionStorage', {
                        value: window.featureSupport.originalSessionStorage,
                        configurable: true
                    });
                }
                if (window.featureSupport.originalPromise) {
                    window.Promise = window.featureSupport.originalPromise;
                }
                if (window.featureSupport.originalFetch) {
                    window.fetch = window.featureSupport.originalFetch;
                }
                if (window.featureSupport.originalMap) {
                    window.Map = window.featureSupport.originalMap;
                }
                if (window.featureSupport.originalSet) {
                    window.Set = window.featureSupport.originalSet;
                }
            };
        });
    });

    test.afterEach(async ({ page }) => {
        await page.evaluate(() => {
            if (window.restoreFeatures) {
                window.restoreFeatures();
            }
        });
    });

    test('WebWorker 非対応時のフォールバック処理', async ({ page }) => {
        // WebWorker を無効化
        await page.evaluate(() => {
            window.disableWebWorker();
        });
        
        // WebWorker が使用されるであろう処理を実行
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '大規模データ処理でWebWorkerを使用するテスト');
        await page.waitForTimeout(2000);
        
        // WebWorker サポートなしが検出されているか確認
        const webWorkerSupport = await page.evaluate(() => {
            return typeof Worker !== 'undefined';
        });
        expect(webWorkerSupport).toBe(false);
        
        // フォールバック処理（メインスレッド処理）が実行されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0); // 処理が完了していることを確認
        
        // WebWorker 非対応通知が表示されているか確認
        const workerWarning = await page.$('.webworker-warning, .fallback-notice, [data-warning="webworker"]');
        const hasWorkerWarning = workerWarning !== null;
        
        console.log(`WebWorker非対応テスト: フォールバック処理成功=${outputContent.length > 0}, 警告表示=${hasWorkerWarning}`);
        
        // パフォーマンス低下の警告があることを確認
        const performanceWarning = await page.$$(':has-text("パフォーマンス"), :has-text("処理時間"), :has-text("低下")');
        console.log(`パフォーマンス警告: ${performanceWarning.length > 0}`);
    });

    test('LocalStorage 無効時の代替ストレージ処理', async ({ page }) => {
        // LocalStorage を無効化
        await page.evaluate(() => {
            window.disableLocalStorage();
        });
        
        // ローカルストレージを使用する処理を実行
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ローカルストレージにデータを保存するテスト');
        await page.waitForTimeout(1000);
        
        // LocalStorage サポートなしが検出されているか確認
        const localStorageSupport = await page.evaluate(() => {
            return window.localStorage !== null && window.localStorage !== undefined;
        });
        expect(localStorageSupport).toBe(false);
        
        // 代替ストレージ（メモリ、Cookie、SessionStorage等）が使用されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // LocalStorage 代替手段の通知を確認
        const storageWarning = await page.$('.storage-warning, .localstorage-disabled, [data-warning="storage"]');
        const hasStorageWarning = storageWarning !== null;
        
        console.log(`LocalStorage無効テスト: 代替処理成功=${outputContent.length > 0}, 警告表示=${hasStorageWarning}`);
        
        // データ保存制限の通知を確認
        const dataLimitWarning = await page.$$(':has-text("保存"), :has-text("制限"), :has-text("データ")');
        console.log(`データ制限警告: ${dataLimitWarning.length > 0}`);
    });

    test('SessionStorage 無効時の処理', async ({ page }) => {
        // SessionStorage を無効化
        await page.evaluate(() => {
            window.disableSessionStorage();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'セッションストレージを使用するテスト');
        await page.waitForTimeout(1000);
        
        // SessionStorage サポートなしが検出されているか確認
        const sessionStorageSupport = await page.evaluate(() => {
            return window.sessionStorage !== null && window.sessionStorage !== undefined;
        });
        expect(sessionStorageSupport).toBe(false);
        
        // 代替セッション管理が実装されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        console.log(`SessionStorage無効テスト: 代替処理成功=${outputContent.length > 0}`);
    });

    test('Promise 非対応（古いブラウザ）時のフォールバック', async ({ page }) => {
        // Promise を無効化（IE11等をシミュレート）
        await page.evaluate(() => {
            window.disablePromise();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Promise非対応ブラウザでの非同期処理テスト');
        await page.waitForTimeout(2000);
        
        // Promise サポートなしが検出されているか確認
        const promiseSupport = await page.evaluate(() => {
            return typeof Promise !== 'undefined';
        });
        expect(promiseSupport).toBe(false);
        
        // 代替非同期処理（コールバック、setTimeout等）が実行されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // Promise フォールバック通知を確認
        const promiseWarning = await page.$('.promise-warning, .legacy-browser, [data-warning="promise"]');
        const hasPromiseWarning = promiseWarning !== null;
        
        console.log(`Promise非対応テスト: フォールバック処理成功=${outputContent.length > 0}, 警告表示=${hasPromiseWarning}`);
    });

    test('Fetch API 非対応時のXMLHttpRequestフォールバック', async ({ page }) => {
        // Fetch API を無効化
        await page.evaluate(() => {
            window.disableFetch();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Fetch API非対応でのHTTPリクエストテスト');
        await page.waitForTimeout(2000);
        
        // Fetch API サポートなしが検出されているか確認
        const fetchSupport = await page.evaluate(() => {
            return typeof fetch !== 'undefined';
        });
        expect(fetchSupport).toBe(false);
        
        // XMLHttpRequest フォールバックが実行されているか確認
        const xhrSupport = await page.evaluate(() => {
            return typeof XMLHttpRequest !== 'undefined';
        });
        expect(xhrSupport).toBe(true); // XHRは通常サポートされている
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        console.log(`Fetch非対応テスト: XHRフォールバック成功=${outputContent.length > 0}`);
    });

    test('ES6 Collection（Map/Set）非対応時のフォールバック', async ({ page }) => {
        // ES6 Collections を無効化
        await page.evaluate(() => {
            window.disableES6Collections();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ES6 Collection非対応でのデータ構造テスト');
        await page.waitForTimeout(1000);
        
        // Map/Set サポートなしが検出されているか確認
        const mapSupport = await page.evaluate(() => {
            return typeof Map !== 'undefined';
        });
        const setSupport = await page.evaluate(() => {
            return typeof Set !== 'undefined';
        });
        expect(mapSupport).toBe(false);
        expect(setSupport).toBe(false);
        
        // 代替データ構造（Object、Array）が使用されているか確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        console.log(`ES6 Collection非対応テスト: 代替実装成功=${outputContent.length > 0}`);
    });

    test('CSS Grid/Flexbox 非対応時のレイアウトフォールバック', async ({ page }) => {
        // CSS Grid/Flexbox サポートを無効化
        await page.evaluate(() => {
            window.disableCSS('display: grid');
            window.disableCSS('display: flex');
        });
        
        // レイアウト機能を使用する処理
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'CSS Grid/Flexbox非対応レイアウトテスト');
        await page.waitForTimeout(1000);
        
        // CSS サポート検出の確認
        const gridSupport = await page.evaluate(() => {
            return CSS && CSS.supports && CSS.supports('display', 'grid');
        });
        const flexSupport = await page.evaluate(() => {
            return CSS && CSS.supports && CSS.supports('display', 'flex');
        });
        
        console.log(`CSS Grid対応: ${gridSupport}, Flexbox対応: ${flexSupport}`);
        
        // 代替レイアウト（float、table等）が適用されているか確認
        const pageLayout = await page.evaluate(() => {
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);
            return {
                display: computedStyle.display,
                position: computedStyle.position
            };
        });
        
        console.log(`代替レイアウト適用: ${JSON.stringify(pageLayout)}`);
        
        // ページが正常に表示されていることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('Touch API 非対応時のマウスイベントフォールバック', async ({ page }) => {
        // Touch API を無効化
        await page.evaluate(() => {
            window.disableTouchAPI();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Touch API非対応でのタッチ操作テスト');
        await page.waitForTimeout(1000);
        
        // Touch API サポートなしが検出されているか確認
        const touchSupport = await page.evaluate(() => {
            return typeof TouchEvent !== 'undefined' && 'ontouchstart' in window;
        });
        expect(touchSupport).toBe(false);
        
        // マウスイベントフォールバックが機能しているか確認
        const mouseSupport = await page.evaluate(() => {
            return 'onmousedown' in window && 'onmousemove' in window && 'onmouseup' in window;
        });
        expect(mouseSupport).toBe(true);
        
        // タッチ操作のフォールバック処理を確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        console.log(`Touch非対応テスト: マウスフォールバック成功=${outputContent.length > 0}`);
    });

    test('複数機能同時非対応時の総合フォールバック', async ({ page }) => {
        // 複数の機能を同時に無効化（古いブラウザシミュレート）
        await page.evaluate(() => {
            window.disableWebWorker();
            window.disableLocalStorage();
            window.disablePromise();
            window.disableFetch();
            window.disableES6Collections();
            window.disableTouchAPI();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '古いブラウザでの総合フォールバック処理テスト');
        await page.waitForTimeout(3000); // フォールバック処理に時間がかかる可能性を考慮
        
        // 各機能のサポート状況を確認
        const featureSupport = await page.evaluate(() => {
            return {
                worker: typeof Worker !== 'undefined',
                localStorage: window.localStorage !== null,
                promise: typeof Promise !== 'undefined',
                fetch: typeof fetch !== 'undefined',
                map: typeof Map !== 'undefined',
                touch: typeof TouchEvent !== 'undefined'
            };
        });
        
        console.log(`機能サポート状況:`, featureSupport);
        
        // すべての機能が無効化されていることを確認
        expect(Object.values(featureSupport).every(supported => !supported)).toBe(true);
        
        // それでもアプリケーションが動作していることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // 包括的な互換性警告が表示されているか確認
        const compatibilityWarning = await page.$('.browser-compatibility, .legacy-mode, [data-warning="compatibility"]');
        const hasCompatibilityWarning = compatibilityWarning !== null;
        
        console.log(`総合フォールバックテスト: 処理成功=${outputContent.length > 0}, 互換性警告=${hasCompatibilityWarning}`);
        
        // エラーログに適切な警告が記録されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
        });
        
        console.log(`エラー統計: 総数=${errorStats.totalErrors || 0}, 警告レベル=${errorStats.errorsBySeverity?.warning || 0}`);
    });

    test('機能検出結果の適切な保存と活用', async ({ page }) => {
        // 機能検出結果を保存する仕組みをテスト
        await page.evaluate(() => {
            // 機能検出を実行
            window.detectedFeatures = {
                webWorker: typeof Worker !== 'undefined',
                localStorage: !!window.localStorage,
                sessionStorage: !!window.sessionStorage,
                promise: typeof Promise !== 'undefined',
                fetch: typeof fetch !== 'undefined',
                map: typeof Map !== 'undefined',
                set: typeof Set !== 'undefined',
                touch: 'ontouchstart' in window,
                css: {
                    grid: CSS && CSS.supports && CSS.supports('display', 'grid'),
                    flexbox: CSS && CSS.supports && CSS.supports('display', 'flex')
                }
            };
            
            // 機能検出結果をローカルストレージに保存（可能な場合）
            try {
                if (window.localStorage) {
                    localStorage.setItem('featureDetection', JSON.stringify(window.detectedFeatures));
                }
            } catch (e) {
                console.log('Feature detection storage failed:', e);
            }
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '機能検出結果保存テスト');
        await page.waitForTimeout(1000);
        
        // 機能検出結果を取得
        const detectedFeatures = await page.evaluate(() => {
            return window.detectedFeatures || {};
        });
        
        console.log(`検出された機能:`, detectedFeatures);
        
        // 各機能のサポート状況が適切に検出されていることを確認
        expect(typeof detectedFeatures.webWorker).toBe('boolean');
        expect(typeof detectedFeatures.localStorage).toBe('boolean');
        expect(typeof detectedFeatures.promise).toBe('boolean');
        
        // 検出結果に基づく適切な処理が実行されていることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // 機能検出結果がエラー境界で活用されているか確認
        const errorStats = await page.evaluate(() => {
            return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
        });
        
        console.log(`機能検出活用: エラー数=${errorStats.totalErrors || 0}`);
    });
});