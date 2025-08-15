/**
 * PlantUML Editor Security E2E Tests
 * 
 * セキュリティ強化版PlantUMLエディターのエンドツーエンドテスト
 * ユーザー視点での包括的なセキュリティ機能テスト
 * 
 * 作成日: 2025-08-15
 * 作成者: agent-orchestrator (webapp-test-automation role)
 */

const { test, expect } = require('@playwright/test');

// テスト対象URL（環境に応じて変更）
const BASE_URL = process.env.BASE_URL || 'http://localhost:8087';
const APP_PATH = '/inline-edit-prototype-enhanced.html';
const FULL_URL = BASE_URL + APP_PATH;

test.describe('PlantUML Editor Security E2E Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // セキュリティ強化版エディターへのナビゲーション
        await page.goto(FULL_URL);
        
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');
        
        // セキュリティシステムの初期化を待機
        await page.waitForFunction(() => {
            return window.validationEngine && window.cspManager && window.securityMonitor;
        }, { timeout: 10000 });
        
        // コンソールエラーの監視開始
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`Console Error: ${msg.text()}`);
            }
        });
    });

    test.describe('セキュリティ基盤機能', () => {
        
        test('セキュリティステータスバーが正常に表示される', async ({ page }) => {
            // セキュリティステータスバーの存在確認
            const statusBar = page.locator('#security-status');
            await expect(statusBar).toBeVisible();
            
            // 初期状態では正常ステータス
            await expect(statusBar).toHaveClass(/security-status-bar$/);
            
            // セキュリティスコアの表示確認
            const scoreElement = page.locator('#security-score');
            await expect(scoreElement).toContainText('スコア:');
            
            // セキュリティ状態テキストの確認
            const statusText = page.locator('#security-status-text');
            await expect(statusText).toContainText('システム正常');
        });

        test('セキュリティダッシュボードの表示と操作', async ({ page }) => {
            // ダッシュボードボタンをクリック
            await page.click('button:has-text("詳細")');
            
            // ダッシュボードが表示されることを確認
            const dashboard = page.locator('#security-dashboard');
            await expect(dashboard).toBeVisible();
            
            // ダッシュボード内容の確認
            await expect(dashboard).toContainText('セキュリティダッシュボード');
            await expect(dashboard).toContainText('検出された脅威:');
            await expect(dashboard).toContainText('実行されたスキャン:');
            await expect(dashboard).toContainText('最終スキャン:');
            
            // 再度クリックで非表示になることを確認
            await page.click('button:has-text("詳細")');
            await expect(dashboard).not.toBeVisible();
        });

        test('セキュリティスキャンボタンの動作', async ({ page }) => {
            // セキュリティスキャンボタンをクリック
            await page.click('button:has-text("セキュリティスキャン")');
            
            // アラートダイアログの確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('セキュリティスキャン完了');
                await dialog.accept();
            });
            
            // スキャン後のステータス更新確認
            await page.waitForTimeout(1000);
            const scoreElement = page.locator('#security-score');
            await expect(scoreElement).toBeVisible();
        });
    });

    test.describe('入力検証とリアルタイムセキュリティ', () => {
        
        test('安全な入力での正常動作', async ({ page }) => {
            // 安全なメッセージの入力
            const safeMessage = 'ユーザーがシステムにログインする';
            const messageInput = page.locator('.message-input-inline').first();
            
            await messageInput.fill(safeMessage);
            
            // セキュリティチェックボタンをクリック
            await page.click('.btn-inline.security').first();
            
            // 成功メッセージの確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('セキュリティチェック: 問題なし');
                await dialog.accept();
            });
            
            // 入力フィールドが安全状態であることを確認
            await expect(messageInput).not.toHaveClass('security-risk');
        });

        test('XSS攻撃パターンの検出', async ({ page }) => {
            // XSS攻撃パターンを入力
            const xssPayload = '<script>alert("XSS Attack")</script>';
            const messageInput = page.locator('.message-input-inline').first();
            
            await messageInput.fill(xssPayload);
            
            // セキュリティチェックボタンをクリック
            await page.click('.btn-inline.security').first();
            
            // 警告メッセージの確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('セキュリティリスク検出');
                expect(dialog.message()).toContain('XSS');
                await dialog.accept();
            });
            
            // 入力フィールドがリスク状態であることを確認
            await expect(messageInput).toHaveClass('security-risk');
            
            // セキュリティボタンが危険状態になることを確認
            const securityButton = page.locator('.btn-inline.security').first();
            await expect(securityButton).toHaveClass(/danger/);
        });

        test('SQLインジェクション攻撃の検出', async ({ page }) => {
            // SQLインジェクション攻撃パターンを入力
            const sqlInjection = "'; DROP TABLE users; --";
            const messageInput = page.locator('.message-input-inline').first();
            
            await messageInput.fill(sqlInjection);
            
            // セキュリティチェックボタンをクリック
            await page.click('.btn-inline.security').first();
            
            // 警告メッセージの確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('セキュリティリスク検出');
                await dialog.accept();
            });
            
            // リスク状態の確認
            await expect(messageInput).toHaveClass('security-risk');
        });

        test('条件入力のリアルタイム検証', async ({ page }) => {
            // 条件分岐を展開
            await page.click('.process-block-header:has-text("条件分岐:")');
            
            // 危険な条件を入力
            const conditionInput = page.locator('.process-condition-input').first();
            await conditionInput.fill('<script>malicious()</script>');
            
            // 入力時にリアルタイム検証が動作することを確認
            await page.waitForTimeout(500);
            await expect(conditionInput).toHaveCSS('border-color', 'rgb(244, 67, 54)');
            await expect(conditionInput).toHaveCSS('background-color', 'rgb(255, 235, 238)');
        });
    });

    test.describe('アクション管理とセキュリティ', () => {
        
        test('安全なアクションの追加', async ({ page }) => {
            // アクション追加ボタンをクリック
            await page.click('.btn-add-action-inline').first();
            
            // 新しいアクション項目が追加されることを確認
            const actionItems = page.locator('.action-item-inline');
            const initialCount = await actionItems.count();
            
            await page.waitForTimeout(500);
            const newCount = await actionItems.count();
            expect(newCount).toBe(initialCount + 1);
            
            // 新しいアクションに安全なデータを入力
            const newAction = actionItems.last();
            const messageInput = newAction.locator('.message-input-inline');
            await messageInput.fill('システムが処理を実行');
            
            // セキュリティチェック
            await newAction.locator('.btn-inline.security').click();
            
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('問題なし');
                await dialog.accept();
            });
        });

        test('危険なアクションの追加と検出', async ({ page }) => {
            // アクション追加
            await page.click('.btn-add-action-inline').first();
            
            const actionItems = page.locator('.action-item-inline');
            const newAction = actionItems.last();
            
            // 危険なペイロードを入力
            const messageInput = newAction.locator('.message-input-inline');
            await messageInput.fill('javascript:void(eval("malicious"))');
            
            // セキュリティチェック
            await newAction.locator('.btn-inline.security').click();
            
            // 脅威検出の確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('セキュリティリスク検出');
                await dialog.accept();
            });
            
            // アクション項目がリスク状態になることを確認
            await expect(newAction).toHaveClass('security-risk');
        });

        test('アクションの削除機能', async ({ page }) => {
            const actionItems = page.locator('.action-item-inline');
            const initialCount = await actionItems.count();
            
            // 削除ボタンをクリック
            await actionItems.first().locator('.btn-inline.delete').click();
            
            // 確認ダイアログで承認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('削除しますか');
                await dialog.accept();
            });
            
            // アニメーション待機
            await page.waitForTimeout(500);
            
            // アクション数が減ることを確認
            const newCount = await actionItems.count();
            expect(newCount).toBe(initialCount - 1);
        });
    });

    test.describe('PlantUMLコード生成とセキュリティ', () => {
        
        test('安全なPlantUMLコードの生成', async ({ page }) => {
            // PlantUML生成ボタンをクリック
            await page.click('button:has-text("PlantUML生成")');
            
            // 生成完了のアラート確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('PlantUMLコード生成完了');
                expect(dialog.message()).toContain('セキュリティ検証: 合格');
                await dialog.accept();
            });
            
            // 生成されたコードの確認
            const codeEditor = page.locator('#plantuml-code');
            const generatedCode = await codeEditor.textContent();
            
            expect(generatedCode).toContain('@startuml');
            expect(generatedCode).toContain('@enduml');
            expect(generatedCode).toContain('セキュリティ監視有効');
        });

        test('PlantUMLコードの検証機能', async ({ page }) => {
            // コード検証ボタンをクリック
            await page.click('button:has-text("コード検証")');
            
            // 検証結果の確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('PlantUMLコード検証: 問題なし');
                await dialog.accept();
            });
        });

        test('安全なダウンロード機能', async ({ page }) => {
            // ダウンロード処理の開始
            const downloadPromise = page.waitForEvent('download');
            await page.click('button:has-text("安全なダウンロード")');
            
            // ダウンロードファイルの確認
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(/plantuml_secure_\d{4}-\d{2}-\d{2}\.puml/);
        });

        test('クリップボードコピー機能', async ({ page }) => {
            // クリップボードアクセス許可（テスト環境）
            await page.evaluate(() => {
                navigator.clipboard = {
                    writeText: async (text) => {
                        window._clipboardContent = text;
                        return Promise.resolve();
                    }
                };
            });
            
            // コピーボタンをクリック
            await page.click('button:has-text("コピー")');
            
            // 成功メッセージの確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('クリップボードにコピーしました');
                await dialog.accept();
            });
        });
    });

    test.describe('スレッド管理（並行処理）', () => {
        
        test('新しいスレッドの追加', async ({ page }) => {
            // 並行処理ブロックを展開
            await page.click('.process-block-header:has-text("並行処理")');
            
            // 現在のスレッド数を確認
            const threadTabs = page.locator('.thread-tab');
            const initialCount = await threadTabs.count();
            
            // スレッド追加ボタンをクリック
            await page.click('.thread-add-btn');
            
            // 新しいスレッドが追加されることを確認
            const newCount = await threadTabs.count();
            expect(newCount).toBe(initialCount + 1);
            
            // 新しいスレッドがアクティブになることを確認
            const newThread = threadTabs.last();
            await expect(newThread).toHaveClass(/active/);
        });

        test('スレッドの切り替え', async ({ page }) => {
            // 並行処理ブロックを展開
            await page.click('.process-block-header:has-text("並行処理")');
            
            // スレッド1をクリック
            await page.click('.thread-tab[data-thread="1"]');
            
            // スレッド1がアクティブになることを確認
            const thread1 = page.locator('.thread-tab[data-thread="1"]');
            await expect(thread1).toHaveClass(/active/);
            
            // 対応するコンテンツが表示されることを確認
            const content1 = page.locator('.thread-content[data-thread-content="1"]');
            await expect(content1).toHaveClass(/active/);
            
            // スレッド2に切り替え
            await page.click('.thread-tab[data-thread="2"]');
            
            // スレッド2がアクティブになることを確認
            const thread2 = page.locator('.thread-tab[data-thread="2"]');
            await expect(thread2).toHaveClass(/active/);
        });

        test('スレッドの削除', async ({ page }) => {
            // 並行処理ブロックを展開
            await page.click('.process-block-header:has-text("並行処理")');
            
            // スレッド追加（削除するため）
            await page.click('.thread-add-btn');
            
            const threadTabs = page.locator('.thread-tab');
            const countBeforeDelete = await threadTabs.count();
            
            // 最後のスレッドにホバー
            await threadTabs.last().hover();
            
            // 削除ボタンをクリック
            await threadTabs.last().locator('.thread-tab-delete').click();
            
            // 確認ダイアログで承認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('削除しますか');
                await dialog.accept();
            });
            
            // スレッドが削除されることを確認
            const countAfterDelete = await threadTabs.count();
            expect(countAfterDelete).toBe(countBeforeDelete - 1);
        });

        test('最後のスレッド削除の防止', async ({ page }) => {
            // 並行処理ブロックを展開
            await page.click('.process-block-header:has-text("並行処理")');
            
            // すべてのスレッドを削除（最後の1つまで）
            const threadTabs = page.locator('.thread-tab');
            const initialCount = await threadTabs.count();
            
            // 最後のスレッドを除いてすべて削除
            for (let i = initialCount - 1; i > 1; i--) {
                await threadTabs.nth(i - 1).hover();
                await threadTabs.nth(i - 1).locator('.thread-tab-delete').click();
                
                page.on('dialog', async dialog => {
                    await dialog.accept();
                });
                
                await page.waitForTimeout(100);
            }
            
            // 最後のスレッドの削除を試行
            await threadTabs.first().hover();
            await threadTabs.first().locator('.thread-tab-delete').click();
            
            // 削除が拒否されることを確認
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('最低1つのスレッドが必要です');
                await dialog.accept();
            });
        });
    });

    test.describe('UI操作とユーザビリティ', () => {
        
        test('展開・折りたたみ機能', async ({ page }) => {
            // すべて展開ボタンをクリック
            await page.click('button:has-text("すべて展開")');
            
            // すべてのブロックが展開されることを確認
            const blocks = page.locator('.process-block');
            const blockCount = await blocks.count();
            
            for (let i = 0; i < blockCount; i++) {
                await expect(blocks.nth(i)).toHaveClass(/expanded/);
            }
            
            // すべて折りたたみボタンをクリック
            await page.click('button:has-text("すべて折りたたむ")');
            
            // すべてのブロックが折りたたまれることを確認
            for (let i = 0; i < blockCount; i++) {
                await expect(blocks.nth(i)).not.toHaveClass(/expanded/);
            }
        });

        test('個別ブロックの展開・折りたたみ', async ({ page }) => {
            // 条件分岐ブロックのヘッダーをクリック
            const conditionBlock = page.locator('.process-block:has-text("条件分岐:")');
            await conditionBlock.locator('.process-block-header').click();
            
            // ブロックの展開状態をトグル
            await expect(conditionBlock).not.toHaveClass(/expanded/);
            
            // 再度クリックで展開
            await conditionBlock.locator('.process-block-header').click();
            await expect(conditionBlock).toHaveClass(/expanded/);
        });

        test('？ボタンの動作', async ({ page }) => {
            // ？ボタンをクリック
            const questionButton = page.locator('.btn-inline.question').first();
            await questionButton.click();
            
            // アクティブ状態になることを確認
            await expect(questionButton).toHaveClass(/active/);
            
            // 再度クリックで非アクティブ
            await questionButton.click();
            await expect(questionButton).not.toHaveClass(/active/);
        });
    });

    test.describe('エラーハンドリングと回復', () => {
        
        test('JavaScriptエラーの適切な処理', async ({ page }) => {
            // 意図的にエラーを発生させる
            await page.evaluate(() => {
                throw new Error('Test JavaScript Error');
            });
            
            // エラー後もアプリケーションが動作することを確認
            await page.waitForTimeout(1000);
            const statusBar = page.locator('#security-status');
            await expect(statusBar).toBeVisible();
            
            // セキュリティステータスが警告状態になることを確認
            await expect(statusBar).toHaveClass(/warning/);
        });

        test('不正な入力データの処理', async ({ page }) => {
            // 非常に長い文字列を入力
            const veryLongString = 'A'.repeat(10000);
            const messageInput = page.locator('.message-input-inline').first();
            
            await messageInput.fill(veryLongString);
            
            // アプリケーションがクラッシュしないことを確認
            await page.waitForTimeout(1000);
            const statusBar = page.locator('#security-status');
            await expect(statusBar).toBeVisible();
        });

        test('ネットワーク障害時の動作', async ({ page }) => {
            // ネットワークを無効化
            await page.route('**/*', route => route.abort());
            
            // セキュリティスキャンを実行
            await page.click('button:has-text("セキュリティスキャン")');
            
            // エラーハンドリングが動作することを確認
            page.on('dialog', async dialog => {
                await dialog.accept();
            });
            
            await page.waitForTimeout(1000);
            
            // ページが応答することを確認
            const statusBar = page.locator('#security-status');
            await expect(statusBar).toBeVisible();
        });
    });

    test.describe('パフォーマンステスト', () => {
        
        test('大量データでのパフォーマンス', async ({ page }) => {
            const startTime = Date.now();
            
            // 複数のアクションを高速で追加
            for (let i = 0; i < 20; i++) {
                await page.click('.btn-add-action-inline').first();
                
                const actionItems = page.locator('.action-item-inline');
                const newAction = actionItems.last();
                await newAction.locator('.message-input-inline').fill(`テストアクション${i}`);
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // 処理時間が妥当であることを確認（10秒以内）
            expect(duration).toBeLessThan(10000);
            
            // すべてのアクションが表示されることを確認
            const actionItems = page.locator('.action-item-inline');
            const finalCount = await actionItems.count();
            expect(finalCount).toBeGreaterThan(20);
        });

        test('リアルタイム検証のパフォーマンス', async ({ page }) => {
            const messageInput = page.locator('.message-input-inline').first();
            
            const startTime = Date.now();
            
            // 高速で文字を入力
            for (let i = 0; i < 100; i++) {
                await messageInput.fill(`テスト${i}`);
                await page.waitForTimeout(10); // 10ms間隔
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // パフォーマンスが妥当であることを確認
            expect(duration).toBeLessThan(5000);
            
            // 最終的に正常状態であることを確認
            await expect(messageInput).toBeVisible();
        });
    });

    test.describe('クロスブラウザ互換性', () => {
        
        test('基本機能のクロスブラウザ動作', async ({ page, browserName }) => {
            console.log(`Testing on ${browserName}`);
            
            // セキュリティステータスバーの表示確認
            const statusBar = page.locator('#security-status');
            await expect(statusBar).toBeVisible();
            
            // アクション追加の動作確認
            await page.click('.btn-add-action-inline').first();
            
            const actionItems = page.locator('.action-item-inline');
            const count = await actionItems.count();
            expect(count).toBeGreaterThan(3);
            
            // PlantUML生成の動作確認
            await page.click('button:has-text("PlantUML生成")');
            
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('PlantUMLコード生成完了');
                await dialog.accept();
            });
        });
    });
});

// テスト設定とヘルパー関数
test.describe.configure({ mode: 'parallel' });

// グローバルセットアップ
test.beforeAll(async () => {
    console.log('PlantUML Editor Security E2E Tests 開始');
    console.log(`Target URL: ${FULL_URL}`);
});

test.afterAll(async () => {
    console.log('PlantUML Editor Security E2E Tests 完了');
});

// エラーハンドリング
test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
        // テスト失敗時のスクリーンショット
        const screenshot = await page.screenshot();
        await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
        
        // コンソールログの記録
        const logs = await page.evaluate(() => {
            return window.console._logs || [];
        });
        
        if (logs.length > 0) {
            await testInfo.attach('console-logs', { 
                body: JSON.stringify(logs, null, 2), 
                contentType: 'application/json' 
            });
        }
    }
});

console.log('[Test] PlantUML Editor Security E2E テスト定義完了 - 包括的ユーザー視点セキュリティテスト');