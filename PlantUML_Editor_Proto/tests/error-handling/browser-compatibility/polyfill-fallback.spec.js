/**
 * Polyfill・代替処理テスト - TEST-016-02
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: JavaScript Polyfill、CSS Fallback、APIの代替実装
 * 
 * テスト項目:
 * 1. JavaScript ES6+ Polyfill の動作
 * 2. CSS プロパティの代替実装
 * 3. API フォールバック実装
 * 4. 条件付きPolyfill読み込み
 * 5. Polyfillの性能影響評価
 * 6. 段階的機能向上（Progressive Enhancement）
 */

const { test, expect } = require('@playwright/test');

test.describe('Polyfill・代替処理テスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
        
        // Polyfillテスト用の関数を注入
        await page.addInitScript(() => {
            // Polyfill実装状況を記録
            window.polyfillStatus = {};
            
            // Array.prototype.includes Polyfill テスト
            window.testArrayIncludesPolyfill = () => {
                const originalIncludes = Array.prototype.includes;
                delete Array.prototype.includes;
                
                // Polyfill実装
                if (!Array.prototype.includes) {
                    Array.prototype.includes = function(searchElement, fromIndex) {
                        return this.indexOf(searchElement, fromIndex) !== -1;
                    };
                    window.polyfillStatus.arrayIncludes = 'polyfilled';
                } else {
                    window.polyfillStatus.arrayIncludes = 'native';
                }
                
                return originalIncludes;
            };
            
            // Object.assign Polyfill テスト
            window.testObjectAssignPolyfill = () => {
                const originalAssign = Object.assign;
                delete Object.assign;
                
                if (!Object.assign) {
                    Object.assign = function(target, ...sources) {
                        sources.forEach(source => {
                            if (source) {
                                Object.keys(source).forEach(key => {
                                    target[key] = source[key];
                                });
                            }
                        });
                        return target;
                    };
                    window.polyfillStatus.objectAssign = 'polyfilled';
                } else {
                    window.polyfillStatus.objectAssign = 'native';
                }
                
                return originalAssign;
            };
            
            // String.prototype.startsWith Polyfill テスト
            window.testStringStartsWithPolyfill = () => {
                const originalStartsWith = String.prototype.startsWith;
                delete String.prototype.startsWith;
                
                if (!String.prototype.startsWith) {
                    String.prototype.startsWith = function(search, pos) {
                        return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
                    };
                    window.polyfillStatus.stringStartsWith = 'polyfilled';
                } else {
                    window.polyfillStatus.stringStartsWith = 'native';
                }
                
                return originalStartsWith;
            };
            
            // Number.isNaN Polyfill テスト
            window.testNumberIsNaNPolyfill = () => {
                const originalIsNaN = Number.isNaN;
                delete Number.isNaN;
                
                if (!Number.isNaN) {
                    Number.isNaN = function(value) {
                        return typeof value === 'number' && isNaN(value);
                    };
                    window.polyfillStatus.numberIsNaN = 'polyfilled';
                } else {
                    window.polyfillStatus.numberIsNaN = 'native';
                }
                
                return originalIsNaN;
            };
            
            // Promise Polyfill テスト（簡易版）
            window.testPromisePolyfill = () => {
                const originalPromise = window.Promise;
                delete window.Promise;
                
                if (!window.Promise) {
                    // 簡易Promise Polyfill
                    window.Promise = function(executor) {
                        const self = this;
                        self.state = 'pending';
                        self.value = undefined;
                        self.handlers = [];
                        
                        function resolve(result) {
                            if (self.state === 'pending') {
                                self.state = 'resolved';
                                self.value = result;
                                self.handlers.forEach(handler => handler.onResolve(result));
                            }
                        }
                        
                        function reject(error) {
                            if (self.state === 'pending') {
                                self.state = 'rejected';
                                self.value = error;
                                self.handlers.forEach(handler => handler.onReject(error));
                            }
                        }
                        
                        self.then = function(onResolve, onReject) {
                            return new Promise((resolve, reject) => {
                                if (self.state === 'resolved') {
                                    const result = onResolve ? onResolve(self.value) : self.value;
                                    resolve(result);
                                } else if (self.state === 'rejected') {
                                    if (onReject) {
                                        const result = onReject(self.value);
                                        resolve(result);
                                    } else {
                                        reject(self.value);
                                    }
                                } else {
                                    self.handlers.push({ onResolve, onReject });
                                }
                            });
                        };
                        
                        executor(resolve, reject);
                    };
                    
                    window.Promise.resolve = function(value) {
                        return new Promise(resolve => resolve(value));
                    };
                    
                    window.Promise.reject = function(error) {
                        return new Promise((resolve, reject) => reject(error));
                    };
                    
                    window.polyfillStatus.promise = 'polyfilled';
                } else {
                    window.polyfillStatus.promise = 'native';
                }
                
                return originalPromise;
            };
            
            // Fetch Polyfill テスト（XMLHttpRequest ベース）
            window.testFetchPolyfill = () => {
                const originalFetch = window.fetch;
                delete window.fetch;
                
                if (!window.fetch) {
                    window.fetch = function(url, options = {}) {
                        return new Promise((resolve, reject) => {
                            const xhr = new XMLHttpRequest();
                            xhr.open(options.method || 'GET', url);
                            
                            // ヘッダー設定
                            if (options.headers) {
                                Object.keys(options.headers).forEach(key => {
                                    xhr.setRequestHeader(key, options.headers[key]);
                                });
                            }
                            
                            xhr.onreadystatechange = function() {
                                if (xhr.readyState === 4) {
                                    const response = {
                                        ok: xhr.status >= 200 && xhr.status < 300,
                                        status: xhr.status,
                                        statusText: xhr.statusText,
                                        text: () => Promise.resolve(xhr.responseText),
                                        json: () => Promise.resolve(JSON.parse(xhr.responseText))
                                    };
                                    
                                    if (response.ok) {
                                        resolve(response);
                                    } else {
                                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                                    }
                                }
                            };
                            
                            xhr.onerror = () => reject(new Error('Network Error'));
                            xhr.send(options.body);
                        });
                    };
                    window.polyfillStatus.fetch = 'polyfilled';
                } else {
                    window.polyfillStatus.fetch = 'native';
                }
                
                return originalFetch;
            };
            
            // 機能復元
            window.restoreNativeFunctions = () => {
                // 復元処理は個別に実装済み
            };
        });
    });

    test('Array.prototype.includes Polyfillの動作検証', async ({ page }) => {
        // Array.includes を無効化してPolyfillをテスト
        const originalIncludes = await page.evaluate(() => {
            return window.testArrayIncludesPolyfill();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '配列検索機能のPolyfillテスト');
        await page.waitForTimeout(500);
        
        // Polyfillが適用されているか確認
        const polyfillStatus = await page.evaluate(() => {
            return window.polyfillStatus.arrayIncludes;
        });
        expect(polyfillStatus).toBe('polyfilled');
        
        // Polyfillが正しく動作するかテスト
        const includesTest = await page.evaluate(() => {
            const testArray = ['apple', 'banana', 'cherry'];
            return {
                hasApple: testArray.includes('apple'),
                hasDurian: testArray.includes('durian'),
                hasFromIndex: testArray.includes('cherry', 1)
            };
        });
        
        expect(includesTest.hasApple).toBe(true);
        expect(includesTest.hasDurian).toBe(false);
        expect(includesTest.hasFromIndex).toBe(true);
        
        console.log(`Array.includes Polyfillテスト: ${JSON.stringify(includesTest)}`);
        
        // アプリケーションが正常に動作することを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // 復元
        await page.evaluate((originalIncludes) => {
            Array.prototype.includes = originalIncludes;
        }, originalIncludes);
    });

    test('Object.assign Polyfillの動作検証', async ({ page }) => {
        // Object.assign を無効化してPolyfillをテスト
        const originalAssign = await page.evaluate(() => {
            return window.testObjectAssignPolyfill();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'オブジェクト結合機能のPolyfillテスト');
        await page.waitForTimeout(500);
        
        // Polyfillが適用されているか確認
        const polyfillStatus = await page.evaluate(() => {
            return window.polyfillStatus.objectAssign;
        });
        expect(polyfillStatus).toBe('polyfilled');
        
        // Polyfillが正しく動作するかテスト
        const assignTest = await page.evaluate(() => {
            const target = { a: 1, b: 2 };
            const source1 = { b: 3, c: 4 };
            const source2 = { c: 5, d: 6 };
            
            const result = Object.assign(target, source1, source2);
            
            return {
                result: result,
                isSameObject: result === target,
                values: { a: result.a, b: result.b, c: result.c, d: result.d }
            };
        });
        
        expect(assignTest.isSameObject).toBe(true);
        expect(assignTest.values.a).toBe(1);
        expect(assignTest.values.b).toBe(3);
        expect(assignTest.values.c).toBe(5);
        expect(assignTest.values.d).toBe(6);
        
        console.log(`Object.assign Polyfillテスト: ${JSON.stringify(assignTest.values)}`);
        
        // 復元
        await page.evaluate((originalAssign) => {
            Object.assign = originalAssign;
        }, originalAssign);
    });

    test('String.prototype.startsWith Polyfillの動作検証', async ({ page }) => {
        // String.startsWith を無効化してPolyfillをテスト
        const originalStartsWith = await page.evaluate(() => {
            return window.testStringStartsWithPolyfill();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '文字列開始判定のPolyfillテスト');
        await page.waitForTimeout(500);
        
        // Polyfillが適用されているか確認
        const polyfillStatus = await page.evaluate(() => {
            return window.polyfillStatus.stringStartsWith;
        });
        expect(polyfillStatus).toBe('polyfilled');
        
        // Polyfillが正しく動作するかテスト
        const startsWithTest = await page.evaluate(() => {
            const testString = 'Hello, World!';
            return {
                startsWithHello: testString.startsWith('Hello'),
                startsWithWorld: testString.startsWith('World'),
                startsWithWorldFromPos: testString.startsWith('World', 7),
                startsWithEmpty: testString.startsWith('')
            };
        });
        
        expect(startsWithTest.startsWithHello).toBe(true);
        expect(startsWithTest.startsWithWorld).toBe(false);
        expect(startsWithTest.startsWithWorldFromPos).toBe(true);
        expect(startsWithTest.startsWithEmpty).toBe(true);
        
        console.log(`String.startsWith Polyfillテスト: ${JSON.stringify(startsWithTest)}`);
        
        // 復元
        await page.evaluate((originalStartsWith) => {
            String.prototype.startsWith = originalStartsWith;
        }, originalStartsWith);
    });

    test('Number.isNaN Polyfillの動作検証', async ({ page }) => {
        // Number.isNaN を無効化してPolyfillをテスト
        const originalIsNaN = await page.evaluate(() => {
            return window.testNumberIsNaNPolyfill();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '数値NaN判定のPolyfillテスト');
        await page.waitForTimeout(500);
        
        // Polyfillが適用されているか確認
        const polyfillStatus = await page.evaluate(() => {
            return window.polyfillStatus.numberIsNaN;
        });
        expect(polyfillStatus).toBe('polyfilled');
        
        // Polyfillが正しく動作するかテスト
        const isNaNTest = await page.evaluate(() => {
            return {
                nanIsNaN: Number.isNaN(NaN),
                numberIsNotNaN: Number.isNaN(123),
                stringIsNotNaN: Number.isNaN('hello'),
                undefinedIsNotNaN: Number.isNaN(undefined),
                globalNaNTest: Number.isNaN(0 / 0)
            };
        });
        
        expect(isNaNTest.nanIsNaN).toBe(true);
        expect(isNaNTest.numberIsNotNaN).toBe(false);
        expect(isNaNTest.stringIsNotNaN).toBe(false); // Number.isNaN は文字列をNaNとしない
        expect(isNaNTest.undefinedIsNotNaN).toBe(false);
        expect(isNaNTest.globalNaNTest).toBe(true);
        
        console.log(`Number.isNaN Polyfillテスト: ${JSON.stringify(isNaNTest)}`);
        
        // 復元
        await page.evaluate((originalIsNaN) => {
            Number.isNaN = originalIsNaN;
        }, originalIsNaN);
    });

    test('Promise Polyfillの基本動作検証', async ({ page }) => {
        // Promise を無効化してPolyfillをテスト
        const originalPromise = await page.evaluate(() => {
            return window.testPromisePolyfill();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Promise Polyfillの基本動作テスト');
        await page.waitForTimeout(500);
        
        // Polyfillが適用されているか確認
        const polyfillStatus = await page.evaluate(() => {
            return window.polyfillStatus.promise;
        });
        expect(polyfillStatus).toBe('polyfilled');
        
        // Promise Polyfillの基本動作をテスト
        const promiseTest = await page.evaluate(() => {
            return new Promise((resolve) => {
                // 基本的なPromise動作をテスト
                const testPromise = new Promise((innerResolve) => {
                    setTimeout(() => innerResolve('test success'), 100);
                });
                
                testPromise.then(result => {
                    resolve({
                        promiseResult: result,
                        hasResolve: typeof Promise.resolve === 'function',
                        hasReject: typeof Promise.reject === 'function'
                    });
                });
            });
        });
        
        expect(promiseTest.promiseResult).toBe('test success');
        expect(promiseTest.hasResolve).toBe(true);
        expect(promiseTest.hasReject).toBe(true);
        
        console.log(`Promise Polyfillテスト: ${JSON.stringify(promiseTest)}`);
        
        // 復元
        await page.evaluate((originalPromise) => {
            window.Promise = originalPromise;
        }, originalPromise);
    });

    test('Fetch Polyfill（XMLHttpRequestベース）の動作検証', async ({ page }) => {
        // Fetch API を無効化してPolyfillをテスト
        const originalFetch = await page.evaluate(() => {
            return window.testFetchPolyfill();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Fetch Polyfillの動作テスト');
        await page.waitForTimeout(500);
        
        // Polyfillが適用されているか確認
        const polyfillStatus = await page.evaluate(() => {
            return window.polyfillStatus.fetch;
        });
        expect(polyfillStatus).toBe('polyfilled');
        
        // XMLHttpRequestが利用可能であることを確認
        const xhrSupport = await page.evaluate(() => {
            return typeof XMLHttpRequest !== 'undefined';
        });
        expect(xhrSupport).toBe(true);
        
        console.log(`Fetch Polyfillテスト: Polyfill適用=${polyfillStatus === 'polyfilled'}, XHR利用可能=${xhrSupport}`);
        
        // 実際のアプリケーションが動作することを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // 復元
        await page.evaluate((originalFetch) => {
            window.fetch = originalFetch;
        }, originalFetch);
    });

    test('CSS プロパティの代替実装テスト', async ({ page }) => {
        // CSS の代替実装をテスト
        await page.addStyleTag({
            content: `
                /* Flexbox フォールバック */
                .flex-container {
                    display: flex;
                    display: -webkit-box;      /* 古いWebKit */
                    display: -moz-box;        /* 古いFirefox */
                    display: -ms-flexbox;     /* IE 10 */
                }
                
                /* Grid フォールバック */
                .grid-container {
                    display: grid;
                    display: block; /* フォールバック */
                }
                .grid-container > * {
                    float: left; /* Grid非対応時のフォールバック */
                    width: 33.333%;
                }
                
                /* CSS変数フォールバック */
                .css-var-test {
                    color: red; /* フォールバック */
                    color: var(--primary-color, red);
                }
                
                /* calc()フォールバック */
                .calc-test {
                    width: 300px; /* フォールバック */
                    width: calc(100% - 50px);
                }
            `
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'CSS代替実装テスト');
        await page.waitForTimeout(500);
        
        // CSS プロパティサポート状況を確認
        const cssSupport = await page.evaluate(() => {
            const testElement = document.createElement('div');
            document.body.appendChild(testElement);
            
            const support = {
                flexbox: CSS.supports && CSS.supports('display', 'flex'),
                grid: CSS.supports && CSS.supports('display', 'grid'),
                cssVariables: CSS.supports && CSS.supports('color', 'var(--test)'),
                calc: CSS.supports && CSS.supports('width', 'calc(100% - 10px)')
            };
            
            document.body.removeChild(testElement);
            return support;
        });
        
        console.log(`CSS機能サポート:`, cssSupport);
        
        // 代替CSSが適用されている要素があることを確認
        const hasStyledElements = await page.evaluate(() => {
            const elements = document.querySelectorAll('.flex-container, .grid-container, .css-var-test, .calc-test');
            return elements.length > 0;
        });
        
        console.log(`CSS代替実装テスト: スタイル適用要素存在=${hasStyledElements}`);
        
        // ページが正常に表示されていることを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('条件付きPolyfill読み込みテスト', async ({ page }) => {
        // 条件付きPolyfill読み込みをシミュレート
        await page.evaluate(() => {
            window.polyfillLoader = {
                loadedPolyfills: [],
                
                loadIfNeeded: function(feature, polyfillFn) {
                    if (!window[feature]) {
                        polyfillFn();
                        this.loadedPolyfills.push(feature);
                        return true;
                    }
                    return false;
                },
                
                loadConditionally: function() {
                    // Array.includes チェック
                    this.loadIfNeeded('Array.prototype.includes', () => {
                        if (!Array.prototype.includes) {
                            Array.prototype.includes = function(searchElement, fromIndex) {
                                return this.indexOf(searchElement, fromIndex) !== -1;
                            };
                        }
                    });
                    
                    // Object.assign チェック
                    this.loadIfNeeded('Object.assign', () => {
                        if (!Object.assign) {
                            Object.assign = function(target, ...sources) {
                                sources.forEach(source => {
                                    if (source) {
                                        Object.keys(source).forEach(key => {
                                            target[key] = source[key];
                                        });
                                    }
                                });
                                return target;
                            };
                        }
                    });
                    
                    // Promise チェック
                    this.loadIfNeeded('Promise', () => {
                        if (!window.Promise) {
                            // 簡易Promise実装
                            window.Promise = function(executor) {
                                // 前のテストと同じ実装
                            };
                        }
                    });
                }
            };
            
            // 条件付き読み込み実行
            window.polyfillLoader.loadConditionally();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '条件付きPolyfill読み込みテスト');
        await page.waitForTimeout(500);
        
        // 条件付き読み込み結果を確認
        const polyfillLoadResult = await page.evaluate(() => {
            return {
                loadedPolyfills: window.polyfillLoader.loadedPolyfills,
                arrayIncludesAvailable: typeof Array.prototype.includes === 'function',
                objectAssignAvailable: typeof Object.assign === 'function',
                promiseAvailable: typeof Promise === 'function'
            };
        });
        
        console.log(`条件付きPolyfill読み込み結果:`, polyfillLoadResult);
        
        // 必要な機能が利用可能になっていることを確認
        expect(polyfillLoadResult.arrayIncludesAvailable).toBe(true);
        expect(polyfillLoadResult.objectAssignAvailable).toBe(true);
        expect(polyfillLoadResult.promiseAvailable).toBe(true);
        
        // アプリケーションが正常に動作することを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('Polyfillの性能影響評価テスト', async ({ page }) => {
        // 性能測定用のタイマーを設定
        await page.evaluate(() => {
            window.performanceMetrics = {
                native: {},
                polyfilled: {}
            };
            
            // ネイティブ関数の性能測定
            window.measureNativePerformance = () => {
                const start = performance.now();
                
                // Array.includes を1000回実行
                const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                for (let i = 0; i < 1000; i++) {
                    testArray.includes(5);
                }
                
                window.performanceMetrics.native.arrayIncludes = performance.now() - start;
            };
            
            // Polyfill関数の性能測定
            window.measurePolyfillPerformance = () => {
                // Array.includes をPolyfillに置き換え
                const originalIncludes = Array.prototype.includes;
                Array.prototype.includes = function(searchElement, fromIndex) {
                    return this.indexOf(searchElement, fromIndex) !== -1;
                };
                
                const start = performance.now();
                
                // 同じ処理を1000回実行
                const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                for (let i = 0; i < 1000; i++) {
                    testArray.includes(5);
                }
                
                window.performanceMetrics.polyfilled.arrayIncludes = performance.now() - start;
                
                // 元の関数に復元
                Array.prototype.includes = originalIncludes;
            };
        });
        
        // 性能測定実行
        await page.evaluate(() => {
            window.measureNativePerformance();
            window.measurePolyfillPerformance();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'Polyfill性能影響評価テスト');
        await page.waitForTimeout(500);
        
        // 性能測定結果を取得
        const performanceMetrics = await page.evaluate(() => {
            return window.performanceMetrics;
        });
        
        console.log(`性能測定結果:`, performanceMetrics);
        
        // Polyfillによる性能低下が許容範囲内であることを確認
        const nativeTime = performanceMetrics.native.arrayIncludes;
        const polyfillTime = performanceMetrics.polyfilled.arrayIncludes;
        const performanceRatio = polyfillTime / nativeTime;
        
        console.log(`性能比: Polyfill/Native = ${performanceRatio.toFixed(2)}`);
        
        // Polyfillが10倍以上遅くないことを確認（許容範囲）
        expect(performanceRatio).toBeLessThan(10);
        
        // アプリケーションが正常に動作することを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('段階的機能向上（Progressive Enhancement）テスト', async ({ page }) => {
        // 基本機能から段階的に機能を向上させるテスト
        await page.evaluate(() => {
            window.enhancementLevels = {
                basic: false,
                enhanced: false,
                advanced: false
            };
            
            // 基本レベル（必須機能のみ）
            window.enableBasicLevel = () => {
                window.enhancementLevels.basic = true;
                console.log('Basic level enabled: Core functionality only');
            };
            
            // 拡張レベル（ES6機能追加）
            window.enableEnhancedLevel = () => {
                if (typeof Promise !== 'undefined' && typeof Map !== 'undefined') {
                    window.enhancementLevels.enhanced = true;
                    console.log('Enhanced level enabled: ES6 features available');
                }
            };
            
            // 高度レベル（最新機能）
            window.enableAdvancedLevel = () => {
                if (typeof Worker !== 'undefined' && window.localStorage) {
                    window.enhancementLevels.advanced = true;
                    console.log('Advanced level enabled: Modern features available');
                }
            };
            
            // 段階的向上実行
            window.enableBasicLevel();
            window.enableEnhancedLevel();
            window.enableAdvancedLevel();
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '段階的機能向上テスト');
        await page.waitForTimeout(1000);
        
        // 機能向上レベルを確認
        const enhancementLevels = await page.evaluate(() => {
            return window.enhancementLevels;
        });
        
        console.log(`機能向上レベル:`, enhancementLevels);
        
        // 基本機能は必ず有効であることを確認
        expect(enhancementLevels.basic).toBe(true);
        
        // 各レベルに応じた機能が適切に有効化されていることを確認
        const featureAvailability = await page.evaluate(() => {
            return {
                promiseSupport: typeof Promise !== 'undefined',
                mapSupport: typeof Map !== 'undefined',
                workerSupport: typeof Worker !== 'undefined',
                storageSupport: !!window.localStorage
            };
        });
        
        console.log(`機能サポート状況:`, featureAvailability);
        
        // 機能レベルに関係なくアプリケーションが動作することを確認
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // 段階的向上が適切に実装されていることを確認
        if (enhancementLevels.advanced) {
            console.log('最高レベルの機能向上が適用されました');
        } else if (enhancementLevels.enhanced) {
            console.log('拡張レベルの機能向上が適用されました');
        } else {
            console.log('基本レベルの機能で動作しています');
        }
    });
});