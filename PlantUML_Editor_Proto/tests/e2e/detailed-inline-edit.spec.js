/**
 * インライン編集機能 詳細E2Eテスト
 * 
 * すべての操作を詳細に検証
 * 
 * @version 2.0.0
 * @date 2025-08-18
 */

import { test, expect } from '@playwright/test';

// テスト環境設定
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';

// テストデータ
const testActors = ['User', 'System', 'Database', 'API', 'Cache'];

// ヘルパー関数
async function setupTestEnvironment(page) {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // エディターインスタンスの初期化を待つ
    await page.waitForFunction(() => {
        return window.editor !== undefined && 
               window.editor.actors !== undefined &&
               window.editor.actions !== undefined;
    }, { timeout: 10000 });
    
    // アクターを設定
    await page.evaluate((actors) => {
        window.editor.actors = actors;
        window.editor.updateActorButtons();
    }, testActors);
    
    // 初期状態をクリア
    await page.evaluate(() => {
        window.editor.actions = [];
        window.editor.updateActionList();
    });
}

async function addTestCondition(page) {
    return await page.evaluate(() => {
        const action = {
            type: 'condition',
            conditionType: 'if-else',
            conditionName: 'ユーザー認証',
            trueBranch: [
                { from: 'System', to: 'Database', text: '認証情報確認', async: false, uncertain: false }
            ],
            falseBranch: [
                { from: 'System', to: 'User', text: '認証失敗', async: false, uncertain: false }
            ]
        };
        window.editor.actions.push(action);
        window.editor.updateActionList();
        return window.editor.actions.length - 1;
    });
}

async function addTestLoop(page) {
    return await page.evaluate(() => {
        const action = {
            type: 'loop',
            loopCondition: 'データが存在する間',
            loopActions: [
                { from: 'System', to: 'Database', text: '次のデータ取得', async: false, uncertain: false }
            ]
        };
        window.editor.actions.push(action);
        window.editor.updateActionList();
        return window.editor.actions.length - 1;
    });
}

async function addTestParallel(page) {
    return await page.evaluate(() => {
        const action = {
            type: 'parallel',
            branches: [
                [{ from: 'System', to: 'API', text: 'API呼び出し', async: true, uncertain: false }],
                [{ from: 'System', to: 'Database', text: 'DB更新', async: true, uncertain: false }]
            ]
        };
        window.editor.actions.push(action);
        window.editor.updateActionList();
        return window.editor.actions.length - 1;
    });
}

test.describe('詳細なインライン編集機能テスト', () => {
    
    test.beforeEach(async ({ page }) => {
        await setupTestEnvironment(page);
    });
    
    test.describe('条件分岐編集の詳細テスト', () => {
        
        test('条件分岐編集の完全な操作フロー', async ({ page }) => {
            console.log('=== 条件分岐編集テスト開始 ===');
            
            // STEP 1: 条件分岐を追加
            const conditionIndex = await addTestCondition(page);
            console.log(`条件分岐追加完了: index=${conditionIndex}`);
            
            // STEP 2: 編集ボタンをクリックしてモーダルを開く
            const editButton = await page.locator('.action-item').nth(conditionIndex).locator('.edit-btn');
            await editButton.click();
            console.log('編集モーダルを開きました');
            
            // モーダルが表示されるまで待つ
            await page.waitForSelector('.modal-overlay', { state: 'visible' });
            
            // STEP 3: 条件名を変更
            const conditionNameInput = await page.locator('#edit-condition-name');
            await conditionNameInput.clear();
            await conditionNameInput.fill('ログイン認証');
            console.log('条件名を変更: ログイン認証');
            
            // STEP 4: TRUE分岐のインライン編集
            console.log('TRUE分岐の編集開始');
            
            // 4.1: 既存アクションのFROMアクターを変更
            const trueBranchContainer = await page.locator('[data-branch-type="true"]');
            const firstActionFromSelect = await trueBranchContainer.locator('.actor-select-inline.from-actor').first();
            await firstActionFromSelect.selectOption('User');
            console.log('FROM アクターを User に変更');
            
            // 4.2: 矢印タイプを非同期に変更
            const arrowTypeSelect = await trueBranchContainer.locator('.arrow-type-inline').first();
            await arrowTypeSelect.selectOption('async');
            console.log('矢印タイプを非同期(⇢)に変更');
            
            // 4.3: TOアクターを変更
            const firstActionToSelect = await trueBranchContainer.locator('.actor-select-inline.to-actor').first();
            await firstActionToSelect.selectOption('API');
            console.log('TO アクターを API に変更');
            
            // 4.4: メッセージを変更
            const messageInput = await trueBranchContainer.locator('.message-input-inline').first();
            await messageInput.clear();
            await messageInput.fill('認証APIを呼び出す');
            console.log('メッセージを変更: 認証APIを呼び出す');
            
            // 4.5: ？ボタンをクリック（条件確認）
            const questionButton = await trueBranchContainer.locator('.btn-inline.question').first();
            await questionButton.click();
            const isQuestionActive = await questionButton.evaluate(el => el.classList.contains('active'));
            console.log(`？ボタンクリック: active=${isQuestionActive}`);
            
            // STEP 5: TRUE分岐に新しいアクションを追加
            const addActionButtonTrue = await trueBranchContainer.locator('.btn-add-action-inline');
            await addActionButtonTrue.click();
            console.log('TRUE分岐に新しいアクション追加');
            
            // 新しいアクションの設定
            const newActionIndex = await trueBranchContainer.locator('.action-item-inline').count() - 1;
            const newActionFromSelect = await trueBranchContainer.locator('.actor-select-inline.from-actor').nth(newActionIndex);
            await newActionFromSelect.selectOption('API');
            
            const newActionToSelect = await trueBranchContainer.locator('.actor-select-inline.to-actor').nth(newActionIndex);
            await newActionToSelect.selectOption('System');
            
            const newMessageInput = await trueBranchContainer.locator('.message-input-inline').nth(newActionIndex);
            await newMessageInput.fill('認証結果を返す');
            console.log('新しいアクション設定完了');
            
            // STEP 6: FALSE分岐にアクションを追加
            console.log('FALSE分岐の編集開始');
            const falseBranchContainer = await page.locator('[data-branch-type="false"]');
            const addActionButtonFalse = await falseBranchContainer.locator('.btn-add-action-inline');
            await addActionButtonFalse.click();
            
            const falseActionFromSelect = await falseBranchContainer.locator('.actor-select-inline.from-actor').last();
            await falseActionFromSelect.selectOption('System');
            
            const falseActionToSelect = await falseBranchContainer.locator('.actor-select-inline.to-actor').last();
            await falseActionToSelect.selectOption('Database');
            
            const falseMessageInput = await falseBranchContainer.locator('.message-input-inline').last();
            await falseMessageInput.fill('ログ記録');
            console.log('FALSE分岐にアクション追加完了');
            
            // STEP 7: 保存ボタンをクリック
            const saveButton = await page.locator('.btn-save-condition');
            await saveButton.click();
            console.log('変更を保存');
            
            // モーダルが閉じるまで待つ
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            
            // STEP 8: 変更が反映されていることを確認
            const plantUMLCode = await page.evaluate(() => window.editor.plantUMLCode);
            expect(plantUMLCode).toContain('alt ログイン認証');
            expect(plantUMLCode).toContain('User ->> API : 認証APIを呼び出す?');
            expect(plantUMLCode).toContain('API -> System : 認証結果を返す');
            expect(plantUMLCode).toContain('System -> Database : ログ記録');
            console.log('PlantUMLコードへの反映を確認');
            
            console.log('=== 条件分岐編集テスト完了 ===');
        });
        
        test('条件分岐のアクション削除テスト', async ({ page }) => {
            console.log('=== アクション削除テスト開始 ===');
            
            // 複数のアクションを持つ条件分岐を作成
            await page.evaluate(() => {
                window.editor.actions = [{
                    type: 'condition',
                    conditionType: 'if-else',
                    conditionName: 'テスト条件',
                    trueBranch: [
                        { from: 'User', to: 'System', text: 'アクション1', async: false },
                        { from: 'System', to: 'Database', text: 'アクション2', async: false },
                        { from: 'Database', to: 'System', text: 'アクション3', async: false }
                    ],
                    falseBranch: [
                        { from: 'System', to: 'User', text: 'エラー通知', async: false }
                    ]
                }];
                window.editor.updateActionList();
            });
            
            // 編集モーダルを開く
            await page.locator('.edit-btn').first().click();
            await page.waitForSelector('.modal-overlay');
            
            // TRUE分岐の2番目のアクションを削除
            const trueBranchContainer = await page.locator('[data-branch-type="true"]');
            const deleteButton = await trueBranchContainer.locator('.btn-inline.delete').nth(1);
            
            // 削除前のアクション数を確認
            const beforeCount = await trueBranchContainer.locator('.action-item-inline').count();
            console.log(`削除前のアクション数: ${beforeCount}`);
            
            // 削除ボタンをクリック
            page.on('dialog', async dialog => {
                console.log(`確認ダイアログ: ${dialog.message()}`);
                await dialog.accept();
            });
            await deleteButton.click();
            
            // アクションが削除されたことを確認
            await page.waitForTimeout(500); // DOM更新を待つ
            const afterCount = await trueBranchContainer.locator('.action-item-inline').count();
            console.log(`削除後のアクション数: ${afterCount}`);
            expect(afterCount).toBe(beforeCount - 1);
            
            console.log('=== アクション削除テスト完了 ===');
        });
    });
    
    test.describe('ループ編集の詳細テスト', () => {
        
        test('ループ編集の完全な操作フロー', async ({ page }) => {
            console.log('=== ループ編集テスト開始 ===');
            
            // STEP 1: ループを追加
            const loopIndex = await addTestLoop(page);
            console.log(`ループ追加完了: index=${loopIndex}`);
            
            // STEP 2: 編集モーダルを開く
            await page.locator('.action-item').nth(loopIndex).locator('.edit-btn').click();
            await page.waitForSelector('.modal-overlay');
            console.log('編集モーダルを開きました');
            
            // STEP 3: ループ条件を変更
            const loopConditionInput = await page.locator('#edit-loop-condition');
            await loopConditionInput.clear();
            await loopConditionInput.fill('10回繰り返す');
            console.log('ループ条件を変更: 10回繰り返す');
            
            // STEP 4: 既存アクションを編集
            const loopActionsContainer = await page.locator('[data-loop-actions]');
            
            // FROMアクターを変更
            const fromSelect = await loopActionsContainer.locator('.actor-select-inline.from-actor').first();
            await fromSelect.selectOption('API');
            console.log('FROM を API に変更');
            
            // 矢印タイプを変更
            const arrowSelect = await loopActionsContainer.locator('.arrow-type-inline').first();
            await arrowSelect.selectOption('return');
            console.log('矢印を戻り(⟵)に変更');
            
            // メッセージを変更
            const messageInput = await loopActionsContainer.locator('.message-input-inline').first();
            await messageInput.clear();
            await messageInput.fill('処理結果を返却');
            console.log('メッセージを変更');
            
            // STEP 5: 新しいアクションを追加
            const addButton = await loopActionsContainer.locator('.btn-add-action-inline');
            await addButton.click();
            console.log('新しいアクション追加');
            
            // 新しいアクションの設定
            const newActionIndex = await loopActionsContainer.locator('.action-item-inline').count() - 1;
            const newFromSelect = await loopActionsContainer.locator('.actor-select-inline.from-actor').nth(newActionIndex);
            await newFromSelect.selectOption('Database');
            
            const newToSelect = await loopActionsContainer.locator('.actor-select-inline.to-actor').nth(newActionIndex);
            await newToSelect.selectOption('Cache');
            
            const newMessageInput = await loopActionsContainer.locator('.message-input-inline').nth(newActionIndex);
            await newMessageInput.fill('キャッシュ更新');
            
            // ？ボタンをクリック
            const questionBtn = await loopActionsContainer.locator('.btn-inline.question').nth(newActionIndex);
            await questionBtn.click();
            console.log('？ボタンをクリック');
            
            // STEP 6: 保存
            await page.locator('.btn-save-loop').click();
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            console.log('変更を保存');
            
            // STEP 7: 変更確認
            const plantUMLCode = await page.evaluate(() => window.editor.plantUMLCode);
            expect(plantUMLCode).toContain('loop 10回繰り返す');
            expect(plantUMLCode).toContain('API <-- Database : 処理結果を返却');
            expect(plantUMLCode).toContain('Database -> Cache : キャッシュ更新?');
            console.log('PlantUMLコードへの反映を確認');
            
            console.log('=== ループ編集テスト完了 ===');
        });
    });
    
    test.describe('並行処理編集の詳細テスト', () => {
        
        test('並行処理編集の完全な操作フロー', async ({ page }) => {
            console.log('=== 並行処理編集テスト開始 ===');
            
            // STEP 1: 並行処理を追加
            const parallelIndex = await addTestParallel(page);
            console.log(`並行処理追加完了: index=${parallelIndex}`);
            
            // STEP 2: 編集モーダルを開く
            await page.locator('.action-item').nth(parallelIndex).locator('.edit-btn').click();
            await page.waitForSelector('.modal-overlay');
            console.log('編集モーダルを開きました');
            
            // モーダルサイズと見切れチェック
            const modalDialog = await page.locator('.modal-dialog');
            const boundingBox = await modalDialog.boundingBox();
            console.log(`モーダルサイズ: ${boundingBox.width}x${boundingBox.height}`);
            expect(boundingBox.width).toBeGreaterThanOrEqual(1000);
            
            // STEP 3: ブランチ1の編集
            console.log('ブランチ1の編集開始');
            const branch1Container = await page.locator('[data-parallel-branch="0"]');
            
            // 既存アクションを編集
            const branch1FromSelect = await branch1Container.locator('.actor-select-inline.from-actor').first();
            await branch1FromSelect.selectOption('User');
            
            const branch1MessageInput = await branch1Container.locator('.message-input-inline').first();
            await branch1MessageInput.clear();
            await branch1MessageInput.fill('外部サービス連携');
            
            // 新しいアクションを追加
            const branch1AddButton = await branch1Container.locator('.btn-add-action-inline');
            await branch1AddButton.click();
            
            const branch1NewFromSelect = await branch1Container.locator('.actor-select-inline.from-actor').last();
            await branch1NewFromSelect.selectOption('API');
            
            const branch1NewToSelect = await branch1Container.locator('.actor-select-inline.to-actor').last();
            await branch1NewToSelect.selectOption('System');
            
            const branch1NewMessageInput = await branch1Container.locator('.message-input-inline').last();
            await branch1NewMessageInput.fill('結果通知');
            console.log('ブランチ1編集完了');
            
            // STEP 4: ブランチ2の編集
            console.log('ブランチ2の編集開始');
            const branch2Container = await page.locator('[data-parallel-branch="1"]');
            
            // 既存アクションを編集
            const branch2ArrowSelect = await branch2Container.locator('.arrow-type-inline').first();
            await branch2ArrowSelect.selectOption('async-return');
            console.log('矢印タイプを非同期戻り(⟸)に変更');
            
            // STEP 5: 新しいブランチを追加
            const addBranchButton = await page.locator('.btn-add-parallel-branch');
            await addBranchButton.click();
            console.log('新しいブランチ追加');
            
            // ブランチ数の確認
            const branchCount = await page.locator('.parallel-branch').count();
            expect(branchCount).toBe(3);
            console.log(`ブランチ数: ${branchCount}`);
            
            // 新しいブランチにアクションを追加
            const branch3Container = await page.locator('[data-parallel-branch="2"]');
            const branch3AddButton = await branch3Container.locator('.btn-add-action-inline');
            await branch3AddButton.click();
            
            const branch3FromSelect = await branch3Container.locator('.actor-select-inline.from-actor').first();
            await branch3FromSelect.selectOption('System');
            
            const branch3ToSelect = await branch3Container.locator('.actor-select-inline.to-actor').first();
            await branch3ToSelect.selectOption('Cache');
            
            const branch3MessageInput = await branch3Container.locator('.message-input-inline').first();
            await branch3MessageInput.fill('キャッシュクリア');
            console.log('ブランチ3にアクション追加');
            
            // STEP 6: ブランチ削除テスト
            const removeBranchButton = await page.locator('.btn-remove-parallel-branch');
            await removeBranchButton.click();
            
            // ブランチ数が減ったことを確認
            await page.waitForTimeout(500);
            const newBranchCount = await page.locator('.parallel-branch').count();
            expect(newBranchCount).toBe(2);
            console.log(`ブランチ削除後: ${newBranchCount}ブランチ`);
            
            // STEP 7: 保存
            await page.locator('.btn-save-parallel').click();
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            console.log('変更を保存');
            
            // STEP 8: 変更確認
            const plantUMLCode = await page.evaluate(() => window.editor.plantUMLCode);
            expect(plantUMLCode).toContain('par');
            expect(plantUMLCode).toContain('User ->> API : 外部サービス連携');
            expect(plantUMLCode).toContain('API -> System : 結果通知');
            expect(plantUMLCode).toContain('System <<-- Database : DB更新');
            console.log('PlantUMLコードへの反映を確認');
            
            console.log('=== 並行処理編集テスト完了 ===');
        });
        
        test('並行処理の見切れ確認テスト', async ({ page }) => {
            console.log('=== 見切れ確認テスト開始 ===');
            
            // 多数のブランチを持つ並行処理を作成
            await page.evaluate(() => {
                const branches = [];
                for (let i = 0; i < 5; i++) {
                    branches.push([
                        { from: 'System', to: `Service${i}`, text: `処理${i}`, async: true }
                    ]);
                }
                window.editor.actions = [{
                    type: 'parallel',
                    branches: branches
                }];
                window.editor.updateActionList();
            });
            
            // 編集モーダルを開く
            await page.locator('.edit-btn').first().click();
            await page.waitForSelector('.modal-overlay');
            
            // すべてのブランチが表示されていることを確認
            const visibleBranches = await page.locator('.parallel-branch').count();
            expect(visibleBranches).toBe(5);
            console.log(`表示ブランチ数: ${visibleBranches}`);
            
            // 各ブランチが操作可能であることを確認
            for (let i = 0; i < 5; i++) {
                const branchContainer = await page.locator(`[data-parallel-branch="${i}"]`);
                const isVisible = await branchContainer.isVisible();
                expect(isVisible).toBe(true);
                
                // アクション追加ボタンが操作可能か確認
                const addButton = await branchContainer.locator('.btn-add-action-inline');
                const isEnabled = await addButton.isEnabled();
                expect(isEnabled).toBe(true);
                console.log(`ブランチ${i + 1}: 表示=${isVisible}, 操作可能=${isEnabled}`);
            }
            
            console.log('=== 見切れ確認テスト完了 ===');
        });
    });
    
    test.describe('エラーハンドリングと保存処理', () => {
        
        test('保存時のバリデーションエラー', async ({ page }) => {
            console.log('=== バリデーションエラーテスト開始 ===');
            
            // 条件分岐を追加
            await addTestCondition(page);
            
            // 編集モーダルを開く
            await page.locator('.edit-btn').first().click();
            await page.waitForSelector('.modal-overlay');
            
            // 条件名を空にする
            const conditionNameInput = await page.locator('#edit-condition-name');
            await conditionNameInput.clear();
            console.log('条件名を空にしました');
            
            // 保存を試みる
            await page.locator('.btn-save-condition').click();
            
            // エラーメッセージが表示されることを確認
            const errorNotification = await page.locator('.error-notification');
            await expect(errorNotification).toBeVisible({ timeout: 5000 });
            const errorText = await errorNotification.textContent();
            console.log(`エラーメッセージ: ${errorText}`);
            expect(errorText).toContain('条件名を入力してください');
            
            // モーダルが閉じていないことを確認
            const modalVisible = await page.locator('.modal-overlay').isVisible();
            expect(modalVisible).toBe(true);
            console.log('モーダルは開いたままです');
            
            console.log('=== バリデーションエラーテスト完了 ===');
        });
        
        test('正常な保存処理', async ({ page }) => {
            console.log('=== 正常な保存処理テスト開始 ===');
            
            // ループを追加
            await addTestLoop(page);
            
            // 編集モーダルを開く
            await page.locator('.edit-btn').first().click();
            await page.waitForSelector('.modal-overlay');
            
            // 正しい値を入力
            const loopConditionInput = await page.locator('#edit-loop-condition');
            await loopConditionInput.clear();
            await loopConditionInput.fill('有効なループ条件');
            
            // 保存
            await page.locator('.btn-save-loop').click();
            
            // モーダルが閉じることを確認
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            console.log('モーダルが正常に閉じました');
            
            // 成功メッセージが表示されることを確認
            const successNotification = await page.locator('.success-notification');
            const isSuccessVisible = await successNotification.isVisible();
            if (isSuccessVisible) {
                const successText = await successNotification.textContent();
                console.log(`成功メッセージ: ${successText}`);
            }
            
            // データが更新されていることを確認
            const updatedCondition = await page.evaluate(() => {
                return window.editor.actions[0].loopCondition;
            });
            expect(updatedCondition).toBe('有効なループ条件');
            console.log('データが正常に更新されました');
            
            console.log('=== 正常な保存処理テスト完了 ===');
        });
    });
    
    test.describe('統合シナリオテスト', () => {
        
        test('複雑な編集フローの統合テスト', async ({ page }) => {
            console.log('=== 統合シナリオテスト開始 ===');
            
            // 複数の要素を含むフローを作成
            await page.evaluate(() => {
                window.editor.actions = [
                    {
                        type: 'condition',
                        conditionType: 'if-else',
                        conditionName: '初期条件',
                        trueBranch: [
                            { from: 'User', to: 'System', text: 'リクエスト', async: false }
                        ],
                        falseBranch: []
                    },
                    {
                        type: 'loop',
                        loopCondition: '初期ループ',
                        loopActions: [
                            { from: 'System', to: 'Database', text: 'データ処理', async: false }
                        ]
                    },
                    {
                        type: 'parallel',
                        branches: [
                            [{ from: 'System', to: 'API', text: '並列処理1', async: true }],
                            [{ from: 'System', to: 'Cache', text: '並列処理2', async: true }]
                        ]
                    }
                ];
                window.editor.updateActionList();
            });
            
            // 各要素を順番に編集
            console.log('条件分岐を編集');
            await page.locator('.action-item').nth(0).locator('.edit-btn').click();
            await page.waitForSelector('.modal-overlay');
            const condNameInput = await page.locator('#edit-condition-name');
            await condNameInput.clear();
            await condNameInput.fill('更新された条件');
            await page.locator('.btn-save-condition').click();
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            
            console.log('ループを編集');
            await page.locator('.action-item').nth(1).locator('.edit-btn').click();
            await page.waitForSelector('.modal-overlay');
            const loopCondInput = await page.locator('#edit-loop-condition');
            await loopCondInput.clear();
            await loopCondInput.fill('更新されたループ');
            await page.locator('.btn-save-loop').click();
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            
            console.log('並行処理を編集');
            await page.locator('.action-item').nth(2).locator('.edit-btn').click();
            await page.waitForSelector('.modal-overlay');
            await page.locator('.btn-add-parallel-branch').click();
            await page.locator('.btn-save-parallel').click();
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            
            // 最終的なPlantUMLコードを確認
            const finalCode = await page.evaluate(() => window.editor.plantUMLCode);
            expect(finalCode).toContain('alt 更新された条件');
            expect(finalCode).toContain('loop 更新されたループ');
            expect(finalCode).toContain('par');
            console.log('すべての変更が反映されています');
            
            console.log('=== 統合シナリオテスト完了 ===');
        });
    });
});