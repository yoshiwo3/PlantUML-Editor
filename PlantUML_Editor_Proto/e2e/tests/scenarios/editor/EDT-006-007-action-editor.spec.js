import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * TEST-E2E-006～007: ActionEditor テストスイート
 * 目的: ActionEditorの作成、編集、削除機能を包括的にテスト
 * カバレッジ: アクション作成、編集、削除、バリデーション、UI操作
 */

test.describe('EDT-006-007: ActionEditor E2E Tests', () => {
  let editorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new PlantUMLEditorPage(page);
    await editorPage.open();
    await editorPage.enableTestMode();
    await editorPage.clearAllData();
  });

  test.afterEach(async () => {
    await editorPage.cleanup();
  });

  test.describe('TEST-E2E-006: ActionEditor基本機能テスト', () => {
    
    test('アクション作成機能の基本テスト', async ({ page }) => {
      // STEP1: アクション追加ボタンクリック
      await page.click('[data-testid="add-action"]');
      
      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="action-editor-modal"]')).toBeVisible();
      
      // STEP2: アクター選択
      await page.selectOption('[data-testid="actor-from"]', 'User');
      await page.selectOption('[data-testid="actor-to"]', 'System');
      
      // STEP3: メッセージ入力
      const testMessage = 'ログイン要求を送信';
      await page.fill('[data-testid="message"]', testMessage);
      
      // STEP4: アクション保存
      await page.click('[data-testid="save-action"]');
      
      // STEP5: 結果検証
      // アクションアイテムが表示されることを確認
      await expect(page.locator('.action-item')).toBeVisible();
      
      // PlantUMLコードが生成されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('User -> System: ログイン要求を送信');
      
      // モーダルが閉じられることを確認
      await expect(page.locator('[data-testid="action-editor-modal"]')).not.toBeVisible();
    });

    test('複数アクション作成テスト', async ({ page }) => {
      const actions = [
        { from: 'User', to: 'System', message: 'ログイン要求' },
        { from: 'System', to: 'Database', message: 'ユーザー認証' },
        { from: 'Database', to: 'System', message: '認証結果返却' },
        { from: 'System', to: 'User', message: 'ログイン完了通知' }
      ];

      for (const [index, action] of actions.entries()) {
        // アクション追加
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', action.from);
        await page.selectOption('[data-testid="actor-to"]', action.to);
        await page.fill('[data-testid="message"]', action.message);
        await page.click('[data-testid="save-action"]');
        
        // 作成されたアクションの数を確認
        const actionItems = page.locator('.action-item');
        await expect(actionItems).toHaveCount(index + 1);
      }

      // 最終的なPlantUMLコードを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('User -> System: ログイン要求');
      expect(plantumlCode).toContain('System -> Database: ユーザー認証');
      expect(plantumlCode).toContain('Database -> System: 認証結果返却');
      expect(plantumlCode).toContain('System -> User: ログイン完了通知');
    });

    test('アクション編集機能テスト', async ({ page }) => {
      // まずアクションを作成
      await page.click('[data-testid="add-action"]');
      await page.selectOption('[data-testid="actor-from"]', 'User');
      await page.selectOption('[data-testid="actor-to"]', 'System');
      await page.fill('[data-testid="message"]', '元のメッセージ');
      await page.click('[data-testid="save-action"]');

      // 編集ボタンをクリック
      await page.click('[data-testid="edit-action-0"]');
      
      // モーダルが再表示されることを確認
      await expect(page.locator('[data-testid="action-editor-modal"]')).toBeVisible();
      
      // 既存の値が設定されていることを確認
      const currentFrom = await page.inputValue('[data-testid="actor-from"]');
      const currentTo = await page.inputValue('[data-testid="actor-to"]');
      const currentMessage = await page.inputValue('[data-testid="message"]');
      
      expect(currentFrom).toBe('User');
      expect(currentTo).toBe('System');
      expect(currentMessage).toBe('元のメッセージ');
      
      // 値を変更
      await page.selectOption('[data-testid="actor-to"]', 'Database');
      await page.fill('[data-testid="message"]', '更新されたメッセージ');
      await page.click('[data-testid="save-action"]');
      
      // 更新された内容を確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('User -> Database: 更新されたメッセージ');
      expect(updatedCode).not.toContain('元のメッセージ');
    });

    test('アクション削除機能テスト', async ({ page }) => {
      // 複数のアクションを作成
      const actions = [
        { from: 'User', to: 'System', message: 'アクション1' },
        { from: 'System', to: 'Database', message: 'アクション2' },
        { from: 'Database', to: 'System', message: 'アクション3' }
      ];

      for (const action of actions) {
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', action.from);
        await page.selectOption('[data-testid="actor-to"]', action.to);
        await page.fill('[data-testid="message"]', action.message);
        await page.click('[data-testid="save-action"]');
      }

      // 中間のアクションを削除
      await page.click('[data-testid="delete-action-1"]');
      
      // 確認ダイアログが表示される場合の処理
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      // アクション数が減ったことを確認
      const remainingActions = page.locator('.action-item');
      await expect(remainingActions).toHaveCount(2);
      
      // PlantUMLコードから削除されたアクションが消えていることを確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('アクション1');
      expect(updatedCode).not.toContain('アクション2');
      expect(updatedCode).toContain('アクション3');
    });

    test('アクションバリデーションテスト', async ({ page }) => {
      await page.click('[data-testid="add-action"]');
      
      // 必須フィールドが空の場合のテスト
      await page.click('[data-testid="save-action"]');
      
      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // アクターからが選択されていない場合
      await page.selectOption('[data-testid="actor-to"]', 'System');
      await page.fill('[data-testid="message"]', 'テストメッセージ');
      await page.click('[data-testid="save-action"]');
      
      await expect(page.locator('[data-testid="actor-from-error"]')).toBeVisible();
      
      // アクター宛先が選択されていない場合
      await page.selectOption('[data-testid="actor-from"]', 'User');
      await page.selectOption('[data-testid="actor-to"]', '');
      await page.click('[data-testid="save-action"]');
      
      await expect(page.locator('[data-testid="actor-to-error"]')).toBeVisible();
      
      // メッセージが空の場合
      await page.selectOption('[data-testid="actor-to"]', 'System');
      await page.fill('[data-testid="message"]', '');
      await page.click('[data-testid="save-action"]');
      
      await expect(page.locator('[data-testid="message-error"]')).toBeVisible();
    });
  });

  test.describe('TEST-E2E-007: ActionEditor高度機能テスト', () => {
    
    test('ドラッグ&ドロップによる順序変更テスト', async ({ page }) => {
      // 複数のアクションを作成
      const actions = [
        { from: 'User', to: 'System', message: 'アクション1' },
        { from: 'System', to: 'Database', message: 'アクション2' },
        { from: 'Database', to: 'System', message: 'アクション3' }
      ];

      for (const action of actions) {
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', action.from);
        await page.selectOption('[data-testid="actor-to"]', action.to);
        await page.fill('[data-testid="message"]', action.message);
        await page.click('[data-testid="save-action"]');
      }

      // 最初のアクションを3番目の位置にドラッグ
      const firstAction = page.locator('[data-testid="action-item-0"]');
      const thirdAction = page.locator('[data-testid="action-item-2"]');
      
      await firstAction.dragTo(thirdAction);
      
      // 順序が変更されたことを確認
      const reorderedCode = await editorPage.getPlantUMLCode();
      const lines = reorderedCode.split('\n').filter(line => line.trim());
      
      expect(lines[0]).toContain('アクション2');
      expect(lines[1]).toContain('アクション3');
      expect(lines[2]).toContain('アクション1');
    });

    test('アクション一括操作テスト', async ({ page }) => {
      // 複数のアクションを作成
      for (let i = 1; i <= 5; i++) {
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', 'User');
        await page.selectOption('[data-testid="actor-to"]', 'System');
        await page.fill('[data-testid="message"]', `アクション${i}`);
        await page.click('[data-testid="save-action"]');
      }

      // 全選択チェックボックスをクリック
      await page.click('[data-testid="select-all-actions"]');
      
      // 全てのアクションが選択されることを確認
      const selectedActions = page.locator('[data-testid^="action-checkbox"]:checked');
      await expect(selectedActions).toHaveCount(5);
      
      // 一括削除
      await page.click('[data-testid="bulk-delete-actions"]');
      
      // 確認ダイアログで承認
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      // 全てのアクションが削除されることを確認
      const remainingActions = page.locator('.action-item');
      await expect(remainingActions).toHaveCount(0);
      
      // PlantUMLコードが空になることを確認
      const finalCode = await editorPage.getPlantUMLCode();
      expect(finalCode.trim()).toBe('');
    });

    test('アクションテンプレート機能テスト', async ({ page }) => {
      // テンプレート選択ボタンをクリック
      await page.click('[data-testid="action-template-button"]');
      
      // テンプレート選択ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="template-selection-modal"]')).toBeVisible();
      
      // ログインシーケンステンプレートを選択
      await page.click('[data-testid="template-login-sequence"]');
      
      // テンプレートが適用されることを確認
      const templateCode = await editorPage.getPlantUMLCode();
      expect(templateCode).toContain('User -> System: ログイン要求');
      expect(templateCode).toContain('System -> Database: 認証情報確認');
      expect(templateCode).toContain('Database -> System: 認証結果');
      expect(templateCode).toContain('System -> User: ログイン結果');
      
      // アクションアイテムが作成されることを確認
      const actionItems = page.locator('.action-item');
      await expect(actionItems).toHaveCount(4);
    });

    test('アクション検索・フィルタ機能テスト', async ({ page }) => {
      // 異なるアクターを含む複数のアクションを作成
      const actions = [
        { from: 'User', to: 'System', message: 'ユーザー操作' },
        { from: 'System', to: 'Database', message: 'データベース操作' },
        { from: 'Admin', to: 'System', message: '管理者操作' },
        { from: 'System', to: 'Email', message: 'メール送信' }
      ];

      for (const action of actions) {
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', action.from);
        await page.selectOption('[data-testid="actor-to"]', action.to);
        await page.fill('[data-testid="message"]', action.message);
        await page.click('[data-testid="save-action"]');
      }

      // アクター検索テスト
      await page.fill('[data-testid="action-search"]', 'User');
      
      // User関連のアクションのみが表示されることを確認
      const visibleActions = page.locator('.action-item:visible');
      await expect(visibleActions).toHaveCount(1);
      
      // 検索クリア
      await page.fill('[data-testid="action-search"]', '');
      await expect(page.locator('.action-item')).toHaveCount(4);
      
      // メッセージ検索テスト
      await page.fill('[data-testid="action-search"]', 'データベース');
      await expect(page.locator('.action-item:visible')).toHaveCount(1);
    });

    test('アクション入力値の特殊文字処理テスト', async ({ page }) => {
      const specialMessages = [
        'メッセージに<script>alert("XSS")</script>を含む',
        'SQL注入\'テスト"; DROP TABLE users; --',
        'Unicode文字：🚀 ⭐ 💡 こんにちは',
        '改行\nを含む\nメッセージ',
        'very long message that exceeds normal length limitations and might cause layout issues or overflow problems in the user interface'
      ];

      for (const [index, message] of specialMessages.entries()) {
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', 'User');
        await page.selectOption('[data-testid="actor-to"]', 'System');
        await page.fill('[data-testid="message"]', message);
        await page.click('[data-testid="save-action"]');
        
        // メッセージが適切にエスケープされて表示されることを確認
        const actionItem = page.locator(`[data-testid="action-item-${index}"]`);
        await expect(actionItem).toBeVisible();
      }

      // PlantUMLコードが適切に生成されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).not.toContain('<script>');
      expect(plantumlCode).not.toContain('DROP TABLE');
    });

    test('アクションエディター性能テスト', async ({ page }) => {
      const startTime = Date.now();
      
      // 大量のアクションを作成（50個）
      for (let i = 1; i <= 50; i++) {
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', 'User');
        await page.selectOption('[data-testid="actor-to"]', 'System');
        await page.fill('[data-testid="message"]', `パフォーマンステスト${i}`);
        await page.click('[data-testid="save-action"]');
        
        // 10個ごとに進捗を確認
        if (i % 10 === 0) {
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          console.log(`${i}個のアクション作成完了: ${elapsed}ms`);
          
          // 10個作成するのに10秒以内であることを確認
          expect(elapsed).toBeLessThan(10000);
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`50個のアクション作成にかかった時間: ${totalTime}ms`);
      
      // 50個のアクション作成が30秒以内に完了することを確認
      expect(totalTime).toBeLessThan(30000);
      
      // メモリ使用量の確認
      const memoryUsage = await editorPage.getMemoryUsage();
      if (memoryUsage) {
        // メモリ使用量が500MB以下であることを確認
        expect(memoryUsage.used).toBeLessThan(500 * 1024 * 1024);
      }
    });

    test('アクションエディターエラー回復テスト', async ({ page }) => {
      // 無効なデータでアクションを作成しようとする
      await page.click('[data-testid="add-action"]');
      
      // JavaScriptエラーを意図的に発生させる
      await page.evaluate(() => {
        // 無効な操作を実行
        throw new Error('テスト用エラー');
      });
      
      // エラーが発生してもアプリケーションが継続動作することを確認
      await page.waitForTimeout(1000);
      
      // アクション追加が引き続き可能であることを確認
      await page.selectOption('[data-testid="actor-from"]', 'User');
      await page.selectOption('[data-testid="actor-to"]', 'System');
      await page.fill('[data-testid="message"]', 'エラー回復テスト');
      await page.click('[data-testid="save-action"]');
      
      // アクションが正常に作成されることを確認
      await expect(page.locator('.action-item')).toBeVisible();
    });
  });

  test.describe('ActionEditor Integration Tests', () => {
    
    test('他のエディターとの連携テスト', async ({ page }) => {
      // アクションを作成
      await page.click('[data-testid="add-action"]');
      await page.selectOption('[data-testid="actor-from"]', 'User');
      await page.selectOption('[data-testid="actor-to"]', 'System');
      await page.fill('[data-testid="message"]', 'システムログイン');
      await page.click('[data-testid="save-action"]');
      
      // 条件分岐エディターを開く
      await page.click('[data-testid="add-condition"]');
      
      // 条件分岐とアクションが統合されたPlantUMLコードが生成されることを確認
      const integratedCode = await editorPage.getPlantUMLCode();
      expect(integratedCode).toContain('User -> System: システムログイン');
      expect(integratedCode).toContain('alt'); // 条件分岐の構文
    });

    test('リアルタイム同期テスト', async ({ page }) => {
      // リアルタイム同期モードを有効化
      await page.click('[data-testid="enable-realtime-sync"]');
      
      // アクションを作成
      await page.click('[data-testid="add-action"]');
      await page.selectOption('[data-testid="actor-from"]', 'User');
      await page.selectOption('[data-testid="actor-to"]', 'System');
      await page.fill('[data-testid="message"]', 'リアルタイムテスト');
      
      // 保存ボタンを押す前にPlantUMLコードが更新されることを確認
      const realtimeCode = await editorPage.getPlantUMLCode();
      expect(realtimeCode).toContain('User -> System: リアルタイムテスト');
    });
  });
});