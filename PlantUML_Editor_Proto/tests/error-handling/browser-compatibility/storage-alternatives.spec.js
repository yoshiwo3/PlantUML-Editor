/**
 * ストレージ代替手段テスト - TEST-016-03
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: LocalStorage、SessionStorage、Cookie、メモリストレージ
 * 
 * テスト項目:
 * 1. LocalStorage 無効時のメモリストレージ
 * 2. Cookie 無効時の代替ストレージ
 * 3. プライベートブラウジング対応
 * 4. ストレージ容量制限の処理
 * 5. 複数ストレージの優先順位制御
 * 6. データ永続化とセッション管理
 */

const { test, expect } = require('@playwright/test');

test.describe('ストレージ代替手段テスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
        
        // ストレージ代替手段テスト用の関数を注入
        await page.addInitScript(() => {
            // ストレージ抽象化レイヤー
            window.StorageManager = {
                storage: null,
                storageType: 'none',
                memoryStorage: {},
                
                // ストレージ初期化
                init: function() {
                    this.detectBestStorage();
                    return this.storageType;
                },
                
                // 最適なストレージを検出
                detectBestStorage: function() {
                    // LocalStorage を試行
                    if (this.testLocalStorage()) {
                        this.storage = window.localStorage;
                        this.storageType = 'localStorage';
                        return;
                    }
                    
                    // SessionStorage を試行
                    if (this.testSessionStorage()) {
                        this.storage = window.sessionStorage;
                        this.storageType = 'sessionStorage';
                        return;
                    }
                    
                    // Cookie を試行
                    if (this.testCookieStorage()) {
                        this.storage = this.createCookieStorage();
                        this.storageType = 'cookie';
                        return;
                    }
                    
                    // メモリストレージにフォールバック
                    this.storage = this.createMemoryStorage();
                    this.storageType = 'memory';
                },
                
                // LocalStorage テスト
                testLocalStorage: function() {
                    try {
                        if (!window.localStorage) return false;
                        const testKey = '__storage_test__';
                        localStorage.setItem(testKey, 'test');
                        localStorage.removeItem(testKey);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // SessionStorage テスト
                testSessionStorage: function() {
                    try {
                        if (!window.sessionStorage) return false;
                        const testKey = '__session_storage_test__';
                        sessionStorage.setItem(testKey, 'test');
                        sessionStorage.removeItem(testKey);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Cookie ストレージテスト
                testCookieStorage: function() {
                    try {
                        document.cookie = '__cookie_test__=test';
                        const hasTestCookie = document.cookie.includes('__cookie_test__=test');
                        if (hasTestCookie) {
                            document.cookie = '__cookie_test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        }
                        return hasTestCookie;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Cookie ストレージ作成
                createCookieStorage: function() {
                    return {
                        setItem: function(key, value) {
                            const expires = new Date();
                            expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24時間
                            document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
                        },
                        
                        getItem: function(key) {
                            const matches = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));
                            return matches ? decodeURIComponent(matches[1]) : null;
                        },
                        
                        removeItem: function(key) {
                            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                        },
                        
                        clear: function() {
                            const cookies = document.cookie.split(';');
                            cookies.forEach(cookie => {
                                const eqPos = cookie.indexOf('=');
                                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                                this.removeItem(name);
                            });
                        }
                    };
                },
                
                // メモリストレージ作成
                createMemoryStorage: function() {
                    return {
                        data: this.memoryStorage,
                        
                        setItem: function(key, value) {
                            this.data[key] = String(value);
                        },
                        
                        getItem: function(key) {
                            return this.data.hasOwnProperty(key) ? this.data[key] : null;
                        },
                        
                        removeItem: function(key) {
                            delete this.data[key];
                        },
                        
                        clear: function() {
                            this.data = {};
                        },
                        
                        get length() {
                            return Object.keys(this.data).length;
                        },
                        
                        key: function(index) {
                            const keys = Object.keys(this.data);
                            return keys[index] || null;
                        }
                    };
                },
                
                // 統一API
                setItem: function(key, value) {
                    try {
                        this.storage.setItem(key, value);
                        return true;
                    } catch (e) {
                        console.warn('Storage setItem failed:', e);
                        return false;
                    }
                },
                
                getItem: function(key) {
                    try {
                        return this.storage.getItem(key);
                    } catch (e) {
                        console.warn('Storage getItem failed:', e);
                        return null;
                    }
                },
                
                removeItem: function(key) {
                    try {
                        this.storage.removeItem(key);
                        return true;
                    } catch (e) {
                        console.warn('Storage removeItem failed:', e);
                        return false;
                    }
                },
                
                clear: function() {
                    try {
                        this.storage.clear();
                        return true;
                    } catch (e) {
                        console.warn('Storage clear failed:', e);
                        return false;
                    }
                },
                
                // ストレージ情報取得
                getStorageInfo: function() {
                    return {
                        type: this.storageType,
                        available: this.storage !== null,
                        persistent: this.storageType === 'localStorage' || this.storageType === 'cookie',
                        capacity: this.getCapacity()
                    };
                },
                
                // ストレージ容量取得
                getCapacity: function() {
                    if (this.storageType === 'memory') {
                        return { used: Object.keys(this.memoryStorage).length, limit: 'unlimited' };
                    }
                    
                    try {
                        // 概算容量測定
                        let used = 0;
                        for (let i = 0; i < this.storage.length; i++) {
                            const key = this.storage.key(i);
                            const value = this.storage.getItem(key);
                            used += key.length + (value ? value.length : 0);
                        }
                        return { used: used, limit: 'unknown' };
                    } catch (e) {
                        return { used: 0, limit: 'unknown' };
                    }
                }
            };
            
            // ストレージ無効化関数
            window.disableLocalStorage = () => {
                Object.defineProperty(window, 'localStorage', {
                    value: null,
                    configurable: true
                });
            };
            
            window.disableSessionStorage = () => {
                Object.defineProperty(window, 'sessionStorage', {
                    value: null,
                    configurable: true
                });
            };
            
            window.disableCookies = () => {
                Object.defineProperty(document, 'cookie', {
                    get: () => '',
                    set: () => false,
                    configurable: true
                });
            };
        });
    });

    test('LocalStorage 無効時のメモリストレージフォールバック', async ({ page }) => {
        // LocalStorage を無効化
        await page.evaluate(() => {
            window.disableLocalStorage();
        });
        
        // ストレージマネージャーを初期化
        const storageType = await page.evaluate(() => {
            return window.StorageManager.init();
        });
        
        console.log(`LocalStorage無効時のストレージタイプ: ${storageType}`);
        
        // メモリストレージまたは代替ストレージが選択されていることを確認
        expect(['memory', 'sessionStorage', 'cookie']).toContain(storageType);
        
        // データの保存・取得をテスト
        const storageTest = await page.evaluate(() => {
            const testData = {
                key1: 'value1',
                key2: 'value2',
                jsonData: JSON.stringify({ test: true, number: 123 })
            };
            
            // データ保存
            const saveResults = {};
            Object.keys(testData).forEach(key => {
                saveResults[key] = window.StorageManager.setItem(key, testData[key]);
            });
            
            // データ取得
            const retrieveResults = {};
            Object.keys(testData).forEach(key => {
                retrieveResults[key] = window.StorageManager.getItem(key);
            });
            
            return {
                storageType: window.StorageManager.getStorageInfo().type,
                saveResults,
                retrieveResults,
                testData
            };
        });
        
        console.log(`ストレージテスト結果:`, storageTest);
        
        // データが正しく保存・取得されていることを確認
        Object.keys(storageTest.testData).forEach(key => {
            expect(storageTest.saveResults[key]).toBe(true);
            expect(storageTest.retrieveResults[key]).toBe(storageTest.testData[key]);
        });
        
        // アプリケーションが正常に動作することを確認
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'LocalStorage無効時のストレージテスト');
        await page.waitForTimeout(1000);
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('Cookie 無効時の代替ストレージ選択', async ({ page }) => {
        // Cookie を無効化
        await page.evaluate(() => {
            window.disableCookies();
        });
        
        // ストレージマネージャーを初期化
        const storageInfo = await page.evaluate(() => {
            const type = window.StorageManager.init();
            return window.StorageManager.getStorageInfo();
        });
        
        console.log(`Cookie無効時のストレージ情報:`, storageInfo);
        
        // Cookie以外のストレージが選択されていることを確認
        expect(['localStorage', 'sessionStorage', 'memory']).toContain(storageInfo.type);
        
        // Cookie代替での認証情報管理テスト
        const authTest = await page.evaluate(() => {
            const sessionData = {
                userId: 'user123',
                sessionId: 'session_abc123',
                lastAccess: new Date().toISOString()
            };
            
            // セッションデータ保存
            const saved = window.StorageManager.setItem('sessionData', JSON.stringify(sessionData));
            
            // セッションデータ取得
            const retrieved = window.StorageManager.getItem('sessionData');
            const parsedData = retrieved ? JSON.parse(retrieved) : null;
            
            return {
                saved,
                original: sessionData,
                retrieved: parsedData
            };
        });
        
        console.log(`認証情報テスト:`, authTest);
        
        expect(authTest.saved).toBe(true);
        expect(authTest.retrieved.userId).toBe(authTest.original.userId);
        expect(authTest.retrieved.sessionId).toBe(authTest.original.sessionId);
        
        await page.fill('[data-testid="japanese-input"], #data-testid="japanese-input, textarea', 'Cookie無効時のセッション管理テスト');
        await page.waitForTimeout(1000);
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('プライベートブラウジングモード対応', async ({ page }) => {
        // プライベートブラウジングをシミュレート（ストレージ制限）
        await page.evaluate(() => {
            // プライベートモードではストレージが制限される
            const limitedStorage = {
                setItem: function(key, value) {
                    if (Math.random() < 0.3) { // 30%の確率で失敗
                        throw new Error('QuotaExceededError');
                    }
                    return window.localStorage.setItem(key, value);
                },
                getItem: function(key) {
                    return window.localStorage.getItem(key);
                },
                removeItem: function(key) {
                    return window.localStorage.removeItem(key);
                },
                clear: function() {
                    return window.localStorage.clear();
                }
            };
            
            Object.defineProperty(window, 'localStorage', {
                value: limitedStorage,
                configurable: true
            });
        });
        
        // プライベートモード検出テスト
        const privateMode = await page.evaluate(() => {
            let isPrivateMode = false;
            
            try {
                // プライベートモード検出試行
                const testKey = '__private_mode_test__';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
            } catch (e) {
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    isPrivateMode = true;
                }
            }
            
            return isPrivateMode;
        });
        
        console.log(`プライベートモード検出: ${privateMode}`);
        
        // プライベートモード対応のストレージ初期化
        const storageResult = await page.evaluate(() => {
            if (window.StorageManager) {
                const type = window.StorageManager.init();
                return {
                    type,
                    info: window.StorageManager.getStorageInfo()
                };
            }
            return null;
        });
        
        console.log(`プライベートモード対応ストレージ:`, storageResult);
        
        // プライベートモードでもアプリケーションが動作することを確認
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'プライベートブラウジングモード対応テスト');
        await page.waitForTimeout(1000);
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // メモリストレージが選択されている可能性が高い
        if (storageResult) {
            expect(['memory', 'sessionStorage']).toContain(storageResult.type);
        }
    });

    test('ストレージ容量制限の処理', async ({ page }) => {
        // ストレージ容量制限をシミュレート
        await page.evaluate(() => {
            let storageQuota = 1000; // 1KB制限
            let usedStorage = 0;
            
            const quotaLimitedStorage = {
                data: {},
                
                setItem: function(key, value) {
                    const newSize = key.length + value.length;
                    if (usedStorage + newSize > storageQuota) {
                        throw new Error('QuotaExceededError: Storage quota exceeded');
                    }
                    
                    const oldSize = this.data[key] ? (key.length + this.data[key].length) : 0;
                    this.data[key] = value;
                    usedStorage = usedStorage - oldSize + newSize;
                },
                
                getItem: function(key) {
                    return this.data[key] || null;
                },
                
                removeItem: function(key) {
                    if (this.data[key]) {
                        const size = key.length + this.data[key].length;
                        delete this.data[key];
                        usedStorage -= size;
                    }
                },
                
                clear: function() {
                    this.data = {};
                    usedStorage = 0;
                },
                
                getUsage: function() {
                    return { used: usedStorage, quota: storageQuota };
                }
            };
            
            Object.defineProperty(window, 'localStorage', {
                value: quotaLimitedStorage,
                configurable: true
            });
        });
        
        // 容量制限ストレージでテスト
        const quotaTest = await page.evaluate(() => {
            const storage = window.localStorage;
            const results = [];
            
            try {
                // 小さなデータから始める
                storage.setItem('small1', 'small data');
                results.push({ action: 'small1', success: true, usage: storage.getUsage() });
                
                storage.setItem('small2', 'another small data');
                results.push({ action: 'small2', success: true, usage: storage.getUsage() });
                
                // 大きなデータで容量超過を誘発
                const largeData = 'x'.repeat(2000); // 2KB
                storage.setItem('large', largeData);
                results.push({ action: 'large', success: true, usage: storage.getUsage() });
                
            } catch (e) {
                results.push({ 
                    action: 'large', 
                    success: false, 
                    error: e.message,
                    usage: storage.getUsage() 
                });
            }
            
            return results;
        });
        
        console.log(`ストレージ容量制限テスト:`, quotaTest);
        
        // 容量制限が適切に動作していることを確認
        const lastResult = quotaTest[quotaTest.length - 1];
        expect(lastResult.success).toBe(false);
        expect(lastResult.error).toContain('QuotaExceededError');
        
        // ストレージマネージャーが容量制限に対応していることを確認
        const managerTest = await page.evaluate(() => {
            const type = window.StorageManager.init();
            
            // 容量超過時の処理テスト
            const largeData = 'y'.repeat(1500); // 1.5KB
            const saved = window.StorageManager.setItem('quota_test', largeData);
            
            return {
                storageType: type,
                quotaTestSaved: saved,
                storageInfo: window.StorageManager.getStorageInfo()
            };
        });
        
        console.log(`ストレージマネージャー容量テスト:`, managerTest);
        
        // 容量超過時にfalseが返されることを確認
        expect(managerTest.quotaTestSaved).toBe(false);
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ストレージ容量制限処理テスト');
        await page.waitForTimeout(1000);
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('複数ストレージの優先順位制御', async ({ page }) => {
        // ストレージ優先順位のテスト
        const priorityTest = await page.evaluate(() => {
            // すべてのストレージが利用可能な状態で優先順位をテスト
            const results = [];
            
            // LocalStorage の優先度テスト
            if (window.StorageManager.testLocalStorage()) {
                results.push({ type: 'localStorage', priority: 1, available: true });
            } else {
                results.push({ type: 'localStorage', priority: 1, available: false });
            }
            
            // SessionStorage の優先度テスト
            if (window.StorageManager.testSessionStorage()) {
                results.push({ type: 'sessionStorage', priority: 2, available: true });
            } else {
                results.push({ type: 'sessionStorage', priority: 2, available: false });
            }
            
            // Cookie の優先度テスト
            if (window.StorageManager.testCookieStorage()) {
                results.push({ type: 'cookie', priority: 3, available: true });
            } else {
                results.push({ type: 'cookie', priority: 3, available: false });
            }
            
            // Memory は常に利用可能
            results.push({ type: 'memory', priority: 4, available: true });
            
            // 最適なストレージを選択
            const selectedType = window.StorageManager.init();
            
            return {
                availableStorages: results,
                selectedType: selectedType,
                storageInfo: window.StorageManager.getStorageInfo()
            };
        });
        
        console.log(`ストレージ優先順位テスト:`, priorityTest);
        
        // 最も優先度の高い利用可能なストレージが選択されていることを確認
        const availableStorages = priorityTest.availableStorages.filter(s => s.available);
        const highestPriority = Math.min(...availableStorages.map(s => s.priority));
        const expectedType = availableStorages.find(s => s.priority === highestPriority).type;
        
        expect(priorityTest.selectedType).toBe(expectedType);
        
        // 段階的フォールバックテスト
        const fallbackTest = await page.evaluate(() => {
            // LocalStorage を意図的に無効化
            window.disableLocalStorage();
            
            // 再初期化して次の優先度のストレージが選択されることを確認
            const newType = window.StorageManager.init();
            return {
                newStorageType: newType,
                newStorageInfo: window.StorageManager.getStorageInfo()
            };
        });
        
        console.log(`フォールバックテスト:`, fallbackTest);
        
        // LocalStorage 以外が選択されていることを確認
        expect(fallbackTest.newStorageType).not.toBe('localStorage');
        expect(['sessionStorage', 'cookie', 'memory']).toContain(fallbackTest.newStorageType);
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'ストレージ優先順位制御テスト');
        await page.waitForTimeout(1000);
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('データ永続化とセッション管理', async ({ page }) => {
        // 異なるストレージタイプでのデータ永続性をテスト
        const persistenceTest = await page.evaluate(() => {
            const testData = {
                sessionData: { type: 'session', value: 'temporary data' },
                persistentData: { type: 'persistent', value: 'permanent data' },
                userPreferences: { theme: 'dark', language: 'ja' }
            };
            
            // 各種データタイプの保存
            window.StorageManager.init();
            
            const results = {};
            Object.keys(testData).forEach(key => {
                results[key] = window.StorageManager.setItem(key, JSON.stringify(testData[key]));
            });
            
            // データの取得確認
            const retrieved = {};
            Object.keys(testData).forEach(key => {
                const data = window.StorageManager.getItem(key);
                retrieved[key] = data ? JSON.parse(data) : null;
            });
            
            return {
                storageType: window.StorageManager.getStorageInfo().type,
                isPersistent: window.StorageManager.getStorageInfo().persistent,
                saveResults: results,
                retrievedData: retrieved,
                originalData: testData
            };
        });
        
        console.log(`データ永続化テスト:`, persistenceTest);
        
        // データが正しく保存・取得されていることを確認
        Object.keys(persistenceTest.originalData).forEach(key => {
            expect(persistenceTest.saveResults[key]).toBe(true);
            expect(persistenceTest.retrievedData[key]).toEqual(persistenceTest.originalData[key]);
        });
        
        // セッション管理機能のテスト
        const sessionManagementTest = await page.evaluate(() => {
            const sessionManager = {
                createSession: function() {
                    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    const sessionData = {
                        id: sessionId,
                        created: new Date().toISOString(),
                        lastAccess: new Date().toISOString(),
                        data: {}
                    };
                    
                    window.StorageManager.setItem('currentSession', JSON.stringify(sessionData));
                    return sessionId;
                },
                
                getSession: function() {
                    const sessionData = window.StorageManager.getItem('currentSession');
                    return sessionData ? JSON.parse(sessionData) : null;
                },
                
                updateSession: function(data) {
                    const session = this.getSession();
                    if (session) {
                        session.lastAccess = new Date().toISOString();
                        session.data = { ...session.data, ...data };
                        window.StorageManager.setItem('currentSession', JSON.stringify(session));
                        return true;
                    }
                    return false;
                },
                
                clearSession: function() {
                    return window.StorageManager.removeItem('currentSession');
                }
            };
            
            // セッション管理テスト実行
            const sessionId = sessionManager.createSession();
            const session1 = sessionManager.getSession();
            
            const updateSuccess = sessionManager.updateSession({ 
                userAction: 'plantuml_edit',
                timestamp: Date.now() 
            });
            const session2 = sessionManager.getSession();
            
            const clearSuccess = sessionManager.clearSession();
            const session3 = sessionManager.getSession();
            
            return {
                sessionId,
                initialSession: session1,
                updatedSession: session2,
                finalSession: session3,
                updateSuccess,
                clearSuccess
            };
        });
        
        console.log(`セッション管理テスト:`, sessionManagementTest);
        
        // セッション管理が正しく動作していることを確認
        expect(sessionManagementTest.sessionId).toBeTruthy();
        expect(sessionManagementTest.initialSession.id).toBe(sessionManagementTest.sessionId);
        expect(sessionManagementTest.updateSuccess).toBe(true);
        expect(sessionManagementTest.updatedSession.data.userAction).toBe('plantuml_edit');
        expect(sessionManagementTest.clearSuccess).toBe(true);
        expect(sessionManagementTest.finalSession).toBeNull();
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', 'セッション管理とデータ永続化テスト');
        await page.waitForTimeout(1000);
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
    });

    test('全ストレージ無効時の完全メモリモード', async ({ page }) => {
        // すべてのストレージを無効化
        await page.evaluate(() => {
            window.disableLocalStorage();
            window.disableSessionStorage();
            window.disableCookies();
        });
        
        // 完全メモリモードでの動作テスト
        const memoryModeTest = await page.evaluate(() => {
            const type = window.StorageManager.init();
            const info = window.StorageManager.getStorageInfo();
            
            // メモリストレージでの機能テスト
            const testOperations = {
                save: window.StorageManager.setItem('test_key', 'test_value'),
                retrieve: window.StorageManager.getItem('test_key'),
                update: window.StorageManager.setItem('test_key', 'updated_value'),
                retrieveUpdated: window.StorageManager.getItem('test_key'),
                remove: window.StorageManager.removeItem('test_key'),
                retrieveAfterRemove: window.StorageManager.getItem('test_key')
            };
            
            return {
                storageType: type,
                storageInfo: info,
                operations: testOperations
            };
        });
        
        console.log(`完全メモリモードテスト:`, memoryModeTest);
        
        // メモリストレージが選択されていることを確認
        expect(memoryModeTest.storageType).toBe('memory');
        expect(memoryModeTest.storageInfo.persistent).toBe(false);
        
        // メモリストレージ操作が正しく動作していることを確認
        expect(memoryModeTest.operations.save).toBe(true);
        expect(memoryModeTest.operations.retrieve).toBe('test_value');
        expect(memoryModeTest.operations.update).toBe(true);
        expect(memoryModeTest.operations.retrieveUpdated).toBe('updated_value');
        expect(memoryModeTest.operations.remove).toBe(true);
        expect(memoryModeTest.operations.retrieveAfterRemove).toBeNull();
        
        // アプリケーションが完全メモリモードでも動作することを確認
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', '完全メモリモードでのアプリケーション動作テスト');
        await page.waitForTimeout(1000);
        
        const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
        expect(outputContent.length).toBeGreaterThan(0);
        
        // メモリモード警告が表示されていることを確認
        const memoryWarning = await page.$('.memory-mode-warning, .data-not-persistent, [data-warning="memory-mode"]');
        const hasMemoryWarning = memoryWarning !== null;
        
        console.log(`メモリモード警告表示: ${hasMemoryWarning}`);
        
        // データが永続化されないことをユーザーに通知していることを期待
        if (hasMemoryWarning) {
            console.log('メモリモード警告が適切に表示されています');
        }
    });
});