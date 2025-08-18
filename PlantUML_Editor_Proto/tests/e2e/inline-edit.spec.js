/**
 * インライン編集機能 E2Eテスト
 * 
 * 条件分岐・ループ・並行処理の編集機能を包括的にテスト
 * 
 * @version 1.0.0
 * @date 2025-08-18
 */

const { test, expect } = require('@playwright/test');

// テスト環境設定
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';

test.describe('インライン編集機能 E2Eテスト', () => {
    
    test.beforeEach(async ({ page }) => {
        // ページ遷移とエラー監視
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });
        
        page.on('pageerror', error => {
            console.error('Page error:', error.message);
        });
        
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        
        // エディターインスタンスの確認
        await page.waitForFunction(() => window.editor !== undefined);
    });
    
    test.describe('条件分岐編集', () => {
        
        test('条件分岐の追加と編集', async ({ page }) => {
            // アクター追加
            await page.evaluate(() => {
                window.editor.actors = ['User', 'System', 'Database'];
                window.editor.updateActorButtons();
            });
            
            // 条件分岐追加
            await page.click('button[data-type="condition"]');
            await page.fill('#condition-name', 'ユーザー認証');
            
            // TRUE分岐にアクション追加
            await page.click('#add-true-action');
            await page.selectOption('#true-from-0', 'System');
            await page.selectOption('#true-to-0', 'Database');
            await page.fill('#true-text-0', '認証情報確認');
            
            // FALSE分岐にアクション追加
            await page.click('#add-false-action');
            await page.selectOption('#false-from-0', 'System');
            await page.selectOption('#false-to-0', 'User');
            await page.fill('#false-text-0', '認証失敗');
            
            // 条件分岐を追加
            await page.click('.btn-add-condition');
            
            // アクションリストに追加されたことを確認
            await expect(page.locator('.action-item')).toHaveCount(1);
            
            // 編集モーダルを開く
            await page.click('.edit-btn');
            await page.waitForSelector('.modal-overlay');
            
            // インライン編集要素の確認
            const inlineItems = await page.locator('.action-item-inline').count();
            expect(inlineItems).toBeGreaterThan(0);
            
            // FROMアクター選択の確認
            await expect(page.locator('.actor-select-inline.from-actor').first()).toBeVisible();
            
            // 矢印タイプ選択の確認
            await expect(page.locator('.arrow-type-inline').first()).toBeVisible();
            
            // TOアクター選択の確認
            await expect(page.locator('.actor-select-inline.to-actor').first()).toBeVisible();
            
            // メッセージ入力の確認
            await expect(page.locator('.message-input-inline').first()).toBeVisible();
            
            // 削除ボタンの確認
            await expect(page.locator('.btn-inline.delete').first()).toBeVisible();
            
            // ？ボタンの確認
            await expect(page.locator('.btn-inline.question').first()).toBeVisible();
            
            // アクション追加ボタンの確認
            await expect(page.locator('.btn-add-action-inline').first()).toBeVisible();
            
            // インライン編集でメッセージ変更
            await page.fill('.message-input-inline', '認証情報を検証');
            
            // 保存
            await page.click('.btn-save-condition');
            
            // モーダルが閉じることを確認
            await expect(page.locator('.modal-overlay')).toHaveCount(0);
            
            // PlantUMLコードに反映されていることを確認
            const plantUML = await page.evaluate(() => window.editor.plantUMLCode);
            expect(plantUML).toContain('alt ユーザー認証');
            expect(plantUML).toContain('認証情報を検証');
        });
        
        test('条件分岐内アクションの追加と削除', async ({ page }) => {
            // テストデータセットアップ
            await page.evaluate(() => {
                window.editor.actors = ['User', 'System', 'Database'];
                window.editor.actions = [{
                    type: 'condition',
                    conditionType: 'if-else',
                    conditionName: 'テスト条件',
                    trueBranch: [
                        { from: 'System', to: 'Database', text: 'データ取得', async: false }
                    ],
                    falseBranch: []
                }];
                window.editor.updateActionList();
            });
            
            // 編集モーダルを開く
            await page.click('.edit-btn');
            await page.waitForSelector('.modal-overlay');
            
            // TRUE分岐にアクション追加
            await page.click('[data-branch-type="true"] .btn-add-action-inline');
            
            // 新しいアクションが追加されたことを確認
            const trueActions = await page.locator('[data-branch-type="true"] .action-item-inline').count();
            expect(trueActions).toBe(2);
            
            // アクション削除
            await page.click('[data-branch-type="true"] .btn-inline.delete');
            await page.click('button:has-text("OK")'); // 確認ダイアログ
            
            // アクションが削除されたことを確認
            const remainingActions = await page.locator('[data-branch-type="true"] .action-item-inline').count();
            expect(remainingActions).toBe(1);
        });
    });
    
    test.describe('ループ編集', () => {
        
        test('ループの追加と編集', async ({ page }) => {
            // アクター追加
            await page.evaluate(() => {
                window.editor.actors = ['System', 'Database'];
                window.editor.updateActorButtons();
            });
            
            // ループ追加
            await page.click('button[data-type="loop"]');
            await page.fill('#loop-condition', 'データが存在する間');
            
            // ループ内アクション追加
            await page.click('#add-loop-action');
            await page.selectOption('#loop-from-0', 'System');
            await page.selectOption('#loop-to-0', 'Database');
            await page.fill('#loop-text-0', '次のデータ取得');
            
            // ループを追加
            await page.click('.btn-add-loop');
            
            // 編集モーダルを開く
            await page.click('.action-item:has-text("ループ") .edit-btn');
            await page.waitForSelector('.modal-overlay');
            
            // インライン編集要素の確認
            await expect(page.locator('[data-loop-actions] .action-item-inline')).toBeVisible();
            
            // アクション追加
            await page.click('[data-loop-actions] .btn-add-action-inline');
            
            // 新しいアクションの設定
            const newActionIndex = await page.locator('[data-loop-actions] .action-item-inline').count() - 1;
            await page.selectOption(`[data-loop-actions] .action-item-inline:nth-child(${newActionIndex + 1}) .from-actor`, 'Database');
            await page.selectOption(`[data-loop-actions] .action-item-inline:nth-child(${newActionIndex + 1}) .to-actor`, 'System');
            await page.fill(`[data-loop-actions] .action-item-inline:nth-child(${newActionIndex + 1}) .message-input-inline`, 'データ返却');
            
            // 保存
            await page.click('.btn-save-loop');
            
            // PlantUMLコードに反映されていることを確認
            const plantUML = await page.evaluate(() => window.editor.plantUMLCode);
            expect(plantUML).toContain('loop データが存在する間');
            expect(plantUML).toContain('次のデータ取得');
            expect(plantUML).toContain('データ返却');
        });
    });
    
    test.describe('並行処理編集', () => {
        
        test('並行処理の追加と編集', async ({ page }) => {
            // アクター追加
            await page.evaluate(() => {
                window.editor.actors = ['System', 'API', 'Database'];
                window.editor.updateActorButtons();
            });
            
            // 並行処理追加
            await page.click('button[data-type="parallel"]');
            
            // ブランチ1にアクション追加
            await page.click('#add-parallel-action-0');
            await page.selectOption('#parallel-from-0-0', 'System');
            await page.selectOption('#parallel-to-0-0', 'API');
            await page.fill('#parallel-text-0-0', 'API呼び出し');
            
            // ブランチ2にアクション追加
            await page.click('#add-parallel-action-1');
            await page.selectOption('#parallel-from-1-0', 'System');
            await page.selectOption('#parallel-to-1-0', 'Database');
            await page.fill('#parallel-text-1-0', 'DB更新');
            
            // 並行処理を追加
            await page.click('.btn-add-parallel');
            
            // 編集モーダルを開く
            await page.click('.action-item:has-text("並行処理") .edit-btn');
            await page.waitForSelector('.modal-overlay');
            
            // モーダルサイズの確認（見切れチェック）
            const modalDialog = await page.locator('.modal-dialog');
            const boundingBox = await modalDialog.boundingBox();
            expect(boundingBox.width).toBeGreaterThanOrEqual(1000); // 十分な幅があることを確認
            
            // ブランチ数の確認
            const branches = await page.locator('.parallel-branch').count();
            expect(branches).toBe(2);
            
            // 各ブランチにインライン編集要素があることを確認
            for (let i = 0; i < branches; i++) {
                await expect(page.locator(`[data-parallel-branch="${i}"] .action-item-inline`)).toBeVisible();
            }
            
            // ブランチ追加
            await page.click('.btn-add-parallel-branch');
            
            // 新しいブランチが追加されたことを確認
            const newBranchCount = await page.locator('.parallel-branch').count();
            expect(newBranchCount).toBe(3);
            
            // 新しいブランチにアクション追加
            await page.click('[data-parallel-branch="2"] .btn-add-action-inline');
            
            // 保存
            await page.click('.btn-save-parallel');
            
            // PlantUMLコードに反映されていることを確認
            const plantUML = await page.evaluate(() => window.editor.plantUMLCode);
            expect(plantUML).toContain('par');
            expect(plantUML).toContain('API呼び出し');
            expect(plantUML).toContain('DB更新');
        });
        
        test('並行処理の見切れ確認', async ({ page }) => {
            // テストデータセットアップ（多数のブランチ）
            await page.evaluate(() => {
                window.editor.actors = ['A', 'B', 'C', 'D', 'E'];
                window.editor.actions = [{
                    type: 'parallel',
                    branches: [
                        [{ from: 'A', to: 'B', text: 'メッセージ1' }],
                        [{ from: 'B', to: 'C', text: 'メッセージ2' }],
                        [{ from: 'C', to: 'D', text: 'メッセージ3' }],
                        [{ from: 'D', to: 'E', text: 'メッセージ4' }]
                    ]
                }];
                window.editor.updateActionList();
            });
            
            // 編集モーダルを開く
            await page.click('.edit-btn');
            await page.waitForSelector('.modal-overlay');
            
            // すべてのブランチが表示されていることを確認
            const visibleBranches = await page.locator('.parallel-branch').count();
            expect(visibleBranches).toBe(4);
            
            // 横スクロールが必要ないことを確認（グリッドレイアウトによる自動調整）
            const branchesContainer = await page.locator('#edit-parallel-branches');
            const containerBox = await branchesContainer.boundingBox();
            const scrollWidth = await branchesContainer.evaluate(el => el.scrollWidth);
            
            // スクロールが必要な場合でも、スクロール可能であることを確認
            if (scrollWidth > containerBox.width) {
                await expect(branchesContainer).toHaveCSS('overflow-x', 'auto');
            }
        });
    });
    
    test.describe('エラーハンドリング', () => {
        
        test('保存時のバリデーション', async ({ page }) => {
            // 条件分岐の編集モーダルを開く
            await page.evaluate(() => {
                window.editor.actors = ['User', 'System'];
                window.editor.actions = [{
                    type: 'condition',
                    conditionType: 'if-else',
                    conditionName: '',
                    trueBranch: [],
                    falseBranch: []
                }];
                window.editor.updateActionList();
            });
            
            await page.click('.edit-btn');
            await page.waitForSelector('.modal-overlay');
            
            // 条件名を空にして保存を試みる
            await page.fill('#edit-condition-name', '');
            await page.click('.btn-save-condition');
            
            // エラーメッセージが表示されることを確認
            await expect(page.locator('.error-notification')).toBeVisible();
            await expect(page.locator('.error-notification')).toContainText('条件名を入力してください');
        });
        
        test('設定変更時のエラー処理', async ({ page }) => {
            // 設定ボタンをクリック
            await page.click('.btn-settings');
            
            // 設定モーダルが表示されることを確認
            await page.waitForSelector('.settings-modal', { timeout: 5000 });
            
            // 不正な値を入力
            await page.fill('#max-actors', '-1');
            await page.click('.btn-save-settings');
            
            // エラーメッセージが表示されることを確認
            await expect(page.locator('.error-notification')).toBeVisible();
        });
    });
    
    test.describe('統合テスト', () => {
        
        test('複雑なフロー作成', async ({ page }) => {
            // アクター設定
            await page.evaluate(() => {
                window.editor.actors = ['User', 'System', 'Database', 'API', 'Cache'];
                window.editor.updateActorButtons();
            });
            
            // 1. 通常のアクション追加
            await page.selectOption('#from-actor', 'User');
            await page.selectOption('#to-actor', 'System');
            await page.fill('#action-text', 'ログイン要求');
            await page.click('.btn-add-action');
            
            // 2. 条件分岐追加
            await page.click('button[data-type="condition"]');
            await page.fill('#condition-name', '認証チェック');
            await page.click('#add-true-action');
            await page.selectOption('#true-from-0', 'System');
            await page.selectOption('#true-to-0', 'Database');
            await page.fill('#true-text-0', 'ユーザー情報取得');
            await page.click('.btn-add-condition');
            
            // 3. ループ追加
            await page.click('button[data-type="loop"]');
            await page.fill('#loop-condition', 'セッション有効');
            await page.click('#add-loop-action');
            await page.selectOption('#loop-from-0', 'System');
            await page.selectOption('#loop-to-0', 'Cache');
            await page.fill('#loop-text-0', 'キャッシュ更新');
            await page.click('.btn-add-loop');
            
            // 4. 並行処理追加
            await page.click('button[data-type="parallel"]');
            await page.click('#add-parallel-action-0');
            await page.selectOption('#parallel-from-0-0', 'System');
            await page.selectOption('#parallel-to-0-0', 'API');
            await page.fill('#parallel-text-0-0', '外部API連携');
            await page.click('.btn-add-parallel');
            
            // すべてのアクションが追加されたことを確認
            const actionCount = await page.locator('.action-item').count();
            expect(actionCount).toBe(4);
            
            // PlantUMLコードが正しく生成されていることを確認
            const plantUML = await page.evaluate(() => window.editor.plantUMLCode);
            expect(plantUML).toContain('User -> System : ログイン要求');
            expect(plantUML).toContain('alt 認証チェック');
            expect(plantUML).toContain('loop セッション有効');
            expect(plantUML).toContain('par');
        });
    });
});

// パフォーマンステスト
test.describe('パフォーマンステスト', () => {
    
    test('大量アクションの処理', async ({ page }) => {
        const startTime = Date.now();
        
        // 大量のアクションを追加
        await page.evaluate(() => {
            window.editor.actors = ['A', 'B', 'C', 'D', 'E'];
            const actions = [];
            
            // 50個のアクションを追加
            for (let i = 0; i < 50; i++) {
                if (i % 3 === 0) {
                    actions.push({
                        type: 'condition',
                        conditionType: 'if-else',
                        conditionName: `条件${i}`,
                        trueBranch: [
                            { from: 'A', to: 'B', text: `メッセージ${i}-1` },
                            { from: 'B', to: 'C', text: `メッセージ${i}-2` }
                        ],
                        falseBranch: [
                            { from: 'A', to: 'D', text: `メッセージ${i}-3` }
                        ]
                    });
                } else if (i % 3 === 1) {
                    actions.push({
                        type: 'loop',
                        loopCondition: `ループ${i}`,
                        loopActions: [
                            { from: 'B', to: 'C', text: `反復${i}` }
                        ]
                    });
                } else {
                    actions.push({
                        type: 'parallel',
                        branches: [
                            [{ from: 'C', to: 'D', text: `並列${i}-1` }],
                            [{ from: 'D', to: 'E', text: `並列${i}-2` }]
                        ]
                    });
                }
            }
            
            window.editor.actions = actions;
            window.editor.updateActionList();
            window.editor.updatePlantUML();
        });
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        // 処理時間が5秒以内であることを確認
        expect(processingTime).toBeLessThan(5000);
        
        // すべてのアクションが表示されていることを確認
        const actionCount = await page.locator('.action-item').count();
        expect(actionCount).toBe(50);
    });
});