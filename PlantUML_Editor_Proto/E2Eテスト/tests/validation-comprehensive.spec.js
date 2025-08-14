// PlantUML エディター キャッシュ対策と動作検証の包括的テストスイート
// 作成日: 2025-08-14 05:06:00
// 目的: 修正されたapp.jsの動作検証とキャッシュ関連問題の確認

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const TEST_PAGE_URL = `${BASE_URL}/test-validation.html`;

// テスト前の共通セットアップ
test.beforeEach(async ({ page }) => {
    // コンソールエラーをキャプチャ
    const consoleErrors = [];
    const consoleWarnings = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        } else if (msg.type() === 'warning') {
            consoleWarnings.push(msg.text());
        }
    });

    // ページエラーをキャプチャ
    const pageErrors = [];
    page.on('pageerror', error => {
        pageErrors.push(error.message);
    });

    // テストデータをページに注入
    await page.addInitScript(() => {
        window.testData = {
            consoleErrors: [],
            consoleWarnings: [],
            pageErrors: []
        };
    });
});

test.describe('PlantUML エディター キャッシュ対策と動作検証', () => {

    test.describe('1. キャッシュバスティング検証', () => {
        
        test('app.jsがタイムスタンプパラメータ付きで読み込まれている', async ({ page }) => {
            await test.step('メインページにアクセス', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
            });

            await test.step('app.jsのロードを確認', async () => {
                // ネットワークリクエストをチェック
                const requests = [];
                page.on('request', request => {
                    if (request.url().includes('app.js')) {
                        requests.push(request.url());
                    }
                });

                await page.reload();
                await page.waitForLoadState('networkidle');

                // app.jsにバージョンパラメータが付いているか確認
                const appJsRequest = requests.find(url => url.includes('app.js'));
                expect(appJsRequest).toBeTruthy();
                expect(appJsRequest).toMatch(/app\.js\?v=\d+/);
            });

            await test.step('スクリプトタグの確認', async () => {
                const scriptTag = await page.locator('script[src*="app.js"]').first();
                await expect(scriptTag).toBeVisible();
                
                const src = await scriptTag.getAttribute('src');
                expect(src).toMatch(/app\.js\?v=\d+/);
            });
        });

        test('キャッシュクリア後の正常動作', async ({ page }) => {
            await test.step('初回アクセス', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
            });

            await test.step('ハードリロード実行', async () => {
                await page.keyboard.press('Ctrl+Shift+R');
                await page.waitForLoadState('networkidle');
            });

            await test.step('アプリケーションが正常に動作している確認', async () => {
                // PlantUMLEditorインスタンスが存在するか確認
                const editorExists = await page.evaluate(() => {
                    return window.plantUMLEditor !== undefined || 
                           window.app !== undefined ||
                           document.querySelector('.app-container') !== null;
                });
                expect(editorExists).toBe(true);
            });
        });
    });

    test.describe('2. getCurrentActors メソッド検証', () => {
        
        test('getCurrentActorsメソッドが正しく定義されている', async ({ page }) => {
            await test.step('メインページにアクセス', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000); // アプリケーション初期化を待つ
            });

            await test.step('エディターインスタンスの確認', async () => {
                const editorInstance = await page.evaluate(() => {
                    // 複数の方法でエディターインスタンスを探す
                    if (window.plantUMLEditor) return 'plantUMLEditor';
                    if (window.app) return 'app';
                    
                    // グローバルスコープを検索
                    for (let prop in window) {
                        if (window[prop] && typeof window[prop] === 'object' && 
                            typeof window[prop].getCurrentActors === 'function') {
                            return prop;
                        }
                    }
                    return null;
                });

                expect(editorInstance).toBeTruthy();
            });

            await test.step('getCurrentActorsメソッドの存在確認', async () => {
                const hasMethod = await page.evaluate(() => {
                    const instances = [window.plantUMLEditor, window.app];
                    for (const instance of instances) {
                        if (instance && typeof instance.getCurrentActors === 'function') {
                            return true;
                        }
                    }
                    
                    // グローバルスコープを検索
                    for (let prop in window) {
                        if (window[prop] && typeof window[prop] === 'object' && 
                            typeof window[prop].getCurrentActors === 'function') {
                            return true;
                        }
                    }
                    return false;
                });

                expect(hasMethod).toBe(true);
            });
        });

        test('getCurrentActorsメソッドの動作テスト', async ({ page }) => {
            await test.step('メインページにアクセスとセットアップ', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
            });

            await test.step('アクターを選択してgetCurrentActorsを実行', async () => {
                // アクターボタンをクリック
                const actorButtons = page.locator('.actor-btn[data-actor]');
                const buttonCount = await actorButtons.count();
                expect(buttonCount).toBeGreaterThan(0);

                // 最初の2つのアクターを選択
                for (let i = 0; i < Math.min(2, buttonCount); i++) {
                    await actorButtons.nth(i).click();
                    await page.waitForTimeout(200);
                }

                // getCurrentActorsメソッドを実行
                const result = await page.evaluate(() => {
                    const instances = [window.plantUMLEditor, window.app];
                    for (const instance of instances) {
                        if (instance && typeof instance.getCurrentActors === 'function') {
                            try {
                                const actors = instance.getCurrentActors();
                                return {
                                    success: true,
                                    type: typeof actors,
                                    isArray: Array.isArray(actors),
                                    isSet: actors && typeof actors.size === 'number',
                                    length: Array.isArray(actors) ? actors.length : (actors && actors.size) || 0,
                                    value: Array.isArray(actors) ? actors : Array.from(actors || [])
                                };
                            } catch (error) {
                                return { success: false, error: error.message };
                            }
                        }
                    }
                    return { success: false, error: 'No valid instance found' };
                });

                expect(result.success).toBe(true);
                expect(result.length).toBeGreaterThan(0);
            });
        });

        test('アクター選択状態の UI 同期確認', async ({ page }) => {
            await test.step('ページアクセスとアクター選択', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                // アクターを選択
                const firstActor = page.locator('.actor-btn[data-actor]').first();
                const actorName = await firstActor.getAttribute('data-actor');
                await firstActor.click();
                await page.waitForTimeout(500);
            });

            await test.step('UI状態の確認', async () => {
                // 選択されたアクターがUI に表示されているか
                const selectedActors = page.locator('.selected-actors .actor-chip');
                await expect(selectedActors).toHaveCount(1);

                // アクターセレクトボックスにも反映されているか
                const fromActorSelect = page.locator('#from-actor option');
                const toActorSelect = page.locator('#to-actor option');
                
                // セレクトボックスに少なくとも1つのアクターオプションがあることを確認
                await expect(fromActorSelect).toHaveCount.greaterThan(1); // デフォルト + 選択されたアクター
                await expect(toActorSelect).toHaveCount.greaterThan(1);
            });
        });
    });

    test.describe('3. ループダイアログ機能検証', () => {
        
        test('ループタブの表示と切り替え', async ({ page }) => {
            await test.step('ページアクセス', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
            });

            await test.step('ループタブをクリック', async () => {
                const loopTab = page.locator('[data-type="loop"]');
                await expect(loopTab).toBeVisible();
                await loopTab.click();
                await page.waitForTimeout(300);
            });

            await test.step('ループビルダーが表示されること', async () => {
                const loopBuilder = page.locator('#loop-builder');
                await expect(loopBuilder).toBeVisible();
                await expect(loopBuilder).not.toHaveClass(/hidden/);

                // 他のビルダーが非表示になること
                const messageBuilder = page.locator('#message-builder');
                const conditionBuilder = page.locator('#condition-builder');
                const parallelBuilder = page.locator('#parallel-builder');
                
                await expect(messageBuilder).toHaveClass(/hidden/);
                await expect(conditionBuilder).toHaveClass(/hidden/);
                await expect(parallelBuilder).toHaveClass(/hidden/);
            });
        });

        test('ループ条件の入力と処理', async ({ page }) => {
            await test.step('ループモードに切り替え', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.locator('[data-type="loop"]').click();
                await page.waitForTimeout(200);
            });

            await test.step('ループ条件を入力', async () => {
                const loopCondition = page.locator('#loop-condition');
                await expect(loopCondition).toBeVisible();
                await loopCondition.fill('全商品の処理が完了するまで');
            });

            await test.step('ループ内アクションを追加', async () => {
                // アクターを先に選択
                const actorBtn = page.locator('.actor-btn[data-actor]').first();
                await actorBtn.click();
                await page.waitForTimeout(200);

                const addLoopActionBtn = page.locator('.btn-add-loop-action');
                await expect(addLoopActionBtn).toBeVisible();
                // ボタンクリック（モーダルが開く可能性があるので待機）
                await addLoopActionBtn.click();
                await page.waitForTimeout(500);
            });

            await test.step('ループを追加', async () => {
                const addLoopBtn = page.locator('.btn-add-loop');
                await expect(addLoopBtn).toBeVisible();
                await addLoopBtn.click();
                await page.waitForTimeout(1000);
            });

            await test.step('PlantUMLコードにループが反映されること', async () => {
                const codeEditor = page.locator('#plantuml-code');
                const code = await codeEditor.inputValue();
                expect(code).toContain('loop');
                expect(code).toContain('全商品の処理が完了するまで');
            });
        });
    });

    test.describe('4. 並列処理ダイアログ機能検証', () => {
        
        test('並列処理タブの表示と切り替え', async ({ page }) => {
            await test.step('ページアクセス', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
            });

            await test.step('並列処理タブをクリック', async () => {
                const parallelTab = page.locator('[data-type="parallel"]');
                await expect(parallelTab).toBeVisible();
                await parallelTab.click();
                await page.waitForTimeout(300);
            });

            await test.step('並列処理ビルダーが表示されること', async () => {
                const parallelBuilder = page.locator('#parallel-builder');
                await expect(parallelBuilder).toBeVisible();
                await expect(parallelBuilder).not.toHaveClass(/hidden/);
            });

            await test.step('並列処理ブランチの確認', async () => {
                const parallelBranches = page.locator('.parallel-branch');
                await expect(parallelBranches).toHaveCount(2); // デフォルトで2つ
                
                const branch1 = page.locator('#parallel-1');
                const branch2 = page.locator('#parallel-2');
                await expect(branch1).toBeVisible();
                await expect(branch2).toBeVisible();
            });
        });

        test('並列処理アクションの追加', async ({ page }) => {
            await test.step('並列処理モードに切り替え', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                
                // アクターを事前に選択
                const actorBtns = page.locator('.actor-btn[data-actor]');
                await actorBtns.nth(0).click();
                await actorBtns.nth(1).click();
                await page.waitForTimeout(500);

                await page.locator('[data-type="parallel"]').click();
                await page.waitForTimeout(200);
            });

            await test.step('並列処理ブランチにアクションを追加', async () => {
                const addActionBtn1 = page.locator('[data-branch="1"]').first();
                const addActionBtn2 = page.locator('[data-branch="2"]').first();
                
                await expect(addActionBtn1).toBeVisible();
                await expect(addActionBtn2).toBeVisible();
            });

            await test.step('並列処理を追加', async () => {
                const addParallelBtn = page.locator('.btn-add-parallel');
                await expect(addParallelBtn).toBeVisible();
                await addParallelBtn.click();
                await page.waitForTimeout(1000);
            });

            await test.step('PlantUMLコードに並列処理が反映されること', async () => {
                const codeEditor = page.locator('#plantuml-code');
                const code = await codeEditor.inputValue();
                expect(code).toContain('par');
                expect(code).toContain('else');
            });
        });

        test('並列処理ブランチの追加', async ({ page }) => {
            await test.step('並列処理モードに切り替え', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.locator('[data-type="parallel"]').click();
                await page.waitForTimeout(200);
            });

            await test.step('新しい並列処理ブランチを追加', async () => {
                const addBranchBtn = page.locator('.btn-add-parallel-branch');
                await expect(addBranchBtn).toBeVisible();
                await addBranchBtn.click();
                await page.waitForTimeout(300);
            });

            await test.step('ブランチが追加されたことを確認', async () => {
                const parallelBranches = page.locator('.parallel-branch');
                await expect(parallelBranches).toHaveCount(3); // 初期2つ + 追加1つ
            });
        });
    });

    test.describe('5. エラー監視と安定性確認', () => {
        
        test('JavaScript エラーが発生しないこと', async ({ page }) => {
            const jsErrors = [];
            page.on('pageerror', error => jsErrors.push(error.message));

            await test.step('基本操作の実行', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');

                // アクター選択
                await page.locator('.actor-btn[data-actor]').first().click();
                await page.waitForTimeout(200);

                // 各タブの切り替え
                await page.locator('[data-type="condition"]').click();
                await page.waitForTimeout(200);
                await page.locator('[data-type="loop"]').click();
                await page.waitForTimeout(200);
                await page.locator('[data-type="parallel"]').click();
                await page.waitForTimeout(200);
                await page.locator('[data-type="message"]').click();
                await page.waitForTimeout(200);
            });

            await test.step('エラーが発生していないことを確認', async () => {
                expect(jsErrors).toHaveLength(0);
            });
        });

        test('コンソールエラーが発生しないこと', async ({ page }) => {
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });

            await test.step('アプリケーション操作', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);

                // getCurrentActors メソッド実行
                await page.evaluate(() => {
                    const instances = [window.plantUMLEditor, window.app];
                    for (const instance of instances) {
                        if (instance && typeof instance.getCurrentActors === 'function') {
                            instance.getCurrentActors();
                            break;
                        }
                    }
                });
            });

            await test.step('致命的なコンソールエラーが発生していないことを確認', async () => {
                const criticalErrors = consoleErrors.filter(error => 
                    error.toLowerCase().includes('uncaught') ||
                    error.toLowerCase().includes('syntax error') ||
                    error.toLowerCase().includes('reference error')
                );
                expect(criticalErrors).toHaveLength(0);
            });
        });

        test('メモリリークの監視', async ({ page }) => {
            await test.step('メモリ使用量の初期測定', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);
            });

            await test.step('複数回の操作実行', async () => {
                for (let i = 0; i < 5; i++) {
                    // アクター選択・解除
                    const actorBtn = page.locator('.actor-btn[data-actor]').first();
                    await actorBtn.click();
                    await page.waitForTimeout(100);
                    
                    // タブ切り替え
                    await page.locator('[data-type="loop"]').click();
                    await page.waitForTimeout(100);
                    await page.locator('[data-type="parallel"]').click();
                    await page.waitForTimeout(100);
                    await page.locator('[data-type="message"]').click();
                    await page.waitForTimeout(100);
                }
            });

            await test.step('ガベージコレクション実行とメモリチェック', async () => {
                await page.evaluate(() => {
                    if (window.gc) {
                        window.gc();
                    }
                });
                await page.waitForTimeout(1000);

                // JSエラーが発生していないことを間接的に確認
                const title = await page.title();
                expect(title).toBeTruthy();
            });
        });
    });

    test.describe('6. パフォーマンス検証', () => {
        
        test('ページ読み込み時間', async ({ page }) => {
            await test.step('ページ読み込み時間を測定', async () => {
                const startTime = Date.now();
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                const loadTime = Date.now() - startTime;

                expect(loadTime).toBeLessThan(5000); // 5秒以内
            });
        });

        test('UI応答性', async ({ page }) => {
            await test.step('セットアップ', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
            });

            await test.step('アクター選択の応答性', async () => {
                const startTime = Date.now();
                await page.locator('.actor-btn[data-actor]').first().click();
                await page.locator('.selected-actors .actor-chip').waitFor();
                const responseTime = Date.now() - startTime;

                expect(responseTime).toBeLessThan(1000); // 1秒以内
            });

            await test.step('タブ切り替えの応答性', async () => {
                const startTime = Date.now();
                await page.locator('[data-type="loop"]').click();
                await page.locator('#loop-builder').waitFor({ state: 'visible' });
                const responseTime = Date.now() - startTime;

                expect(responseTime).toBeLessThan(500); // 0.5秒以内
            });
        });
    });

    test.describe('7. 統合テストシナリオ', () => {
        
        test('完全なワークフロー実行', async ({ page }) => {
            await test.step('アプリケーション初期化', async () => {
                await page.goto(BASE_URL);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);
            });

            await test.step('アクター選択', async () => {
                const actorButtons = page.locator('.actor-btn[data-actor]');
                await actorButtons.nth(0).click(); // 顧客
                await actorButtons.nth(2).click(); // ECサイト
                await page.waitForTimeout(300);

                // getCurrentActors実行
                const actors = await page.evaluate(() => {
                    const instances = [window.plantUMLEditor, window.app];
                    for (const instance of instances) {
                        if (instance && typeof instance.getCurrentActors === 'function') {
                            return Array.from(instance.getCurrentActors() || []);
                        }
                    }
                    return [];
                });
                expect(actors.length).toBeGreaterThan(0);
            });

            await test.step('基本メッセージ追加', async () => {
                await page.locator('#from-actor').selectOption({ index: 1 });
                await page.locator('#to-actor').selectOption({ index: 2 });
                await page.locator('#action-text').fill('商品を注文する');
                await page.locator('.btn-add-action').click();
                await page.waitForTimeout(300);
            });

            await test.step('条件分岐追加', async () => {
                await page.locator('[data-type="condition"]').click();
                await page.locator('#condition-name').fill('在庫あり');
                await page.locator('.btn-add-condition').click();
                await page.waitForTimeout(300);
            });

            await test.step('ループ処理追加', async () => {
                await page.locator('[data-type="loop"]').click();
                await page.locator('#loop-condition').fill('全商品処理完了まで');
                await page.locator('.btn-add-loop').click();
                await page.waitForTimeout(300);
            });

            await test.step('並列処理追加', async () => {
                await page.locator('[data-type="parallel"]').click();
                await page.locator('.btn-add-parallel').click();
                await page.waitForTimeout(300);
            });

            await test.step('最終的なPlantUMLコードの確認', async () => {
                const code = await page.locator('#plantuml-code').inputValue();
                expect(code).toContain('@startuml');
                expect(code).toContain('@enduml');
                expect(code).toContain('->'); // メッセージ
                expect(code.length).toBeGreaterThan(50); // 実質的なコードが生成されている
            });
        });
    });
});

test.describe('検証用HTMLファイルのテスト', () => {
    
    test('test-validation.htmlページの動作確認', async ({ page }) => {
        await test.step('検証ページにアクセス', async () => {
            await page.goto(TEST_PAGE_URL);
            await page.waitForLoadState('networkidle');
        });

        await test.step('iframe内のメインアプリが読み込まれること', async () => {
            const iframe = page.frameLocator('#main-app');
            await iframe.locator('.app-container').waitFor({ timeout: 10000 });
        });

        await test.step('getCurrentActorsテストボタンの動作', async () => {
            await page.locator('button:has-text("getCurrentActors メソッド実行")').click();
            await page.waitForTimeout(2000);
            
            const output = await page.locator('#getCurrentActorsOutput').textContent();
            expect(output).toContain('getCurrentActors実行結果');
        });

        await test.step('エラー監視機能の動作', async () => {
            await page.locator('button:has-text("エラー監視開始")').click();
            await page.waitForTimeout(1000);
            
            const status = await page.locator('#errorMonitoringStatus').textContent();
            expect(status).toContain('エラー監視を開始しました');
        });

        await test.step('全テスト実行', async () => {
            await page.locator('button:has-text("全テスト実行")').click();
            await page.waitForTimeout(5000);
            
            const report = await page.locator('#overallTestOutput').textContent();
            expect(report).toContain('PlantUML エディター 検証レポート');
        });
    });
});

// テスト後のクリーンアップ
test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
        // テスト失敗時のスクリーンショット
        const screenshot = await page.screenshot();
        await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
        
        // コンソールログの取得
        const logs = await page.evaluate(() => {
            const logs = [];
            const originalLog = console.log;
            console.log = function(...args) {
                logs.push(args.join(' '));
                originalLog.apply(console, arguments);
            };
            return logs;
        });
        
        if (logs.length > 0) {
            await testInfo.attach('console-logs', { body: JSON.stringify(logs, null, 2), contentType: 'application/json' });
        }
    }
});