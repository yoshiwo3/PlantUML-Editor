import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * TEST-E2E-009: ConditionEditor UI操作テスト
 * 目的: ConditionEditorのUI操作、ドラッグ&ドロップ、視覚的編集機能をテスト
 * カバレッジ: ドラッグ&ドロップ、折りたたみ、エラー状態、リアルタイムプレビュー
 */

test.describe('TEST-E2E-009: ConditionEditor UI Operations Tests', () => {
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

  test.describe('ドラッグ&ドロップ機能テスト', () => {
    
    test('条件ブロックのドラッグ&ドロップ順序変更', async ({ page }) => {
      // 複数の条件分岐を作成
      const conditions = [
        { expression: '条件A', message: 'アクションA' },
        { expression: '条件B', message: 'アクションB' },
        { expression: '条件C', message: 'アクションC' }
      ];

      for (const condition of conditions) {
        await page.click('[data-testid="add-condition"]');
        await page.fill('[data-testid="condition-expression"]', condition.expression);
        await page.click('[data-testid="add-action-if-branch"]');
        await page.fill('[data-testid="if-message"]', condition.message);
        await page.click('[data-testid="save-condition"]');
      }

      // 最初の条件を3番目の位置にドラッグ
      const firstCondition = page.locator('[data-testid="condition-item-0"]');
      const thirdCondition = page.locator('[data-testid="condition-item-2"]');
      
      await firstCondition.dragTo(thirdCondition);
      
      // 順序が変更されたことを確認
      const reorderedCode = await editorPage.getPlantUMLCode();
      const lines = reorderedCode.split('\n').filter(line => line.trim());
      
      // 新しい順序: B, C, A
      expect(reorderedCode.indexOf('条件B')).toBeLessThan(reorderedCode.indexOf('条件C'));
      expect(reorderedCode.indexOf('条件C')).toBeLessThan(reorderedCode.indexOf('条件A'));
    });

    test('条件分岐内アクションのドラッグ&ドロップ', async ({ page }) => {
      // 条件分岐を作成し、複数のアクションを追加
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', 'メイン条件');
      
      // IF分岐内に複数のアクションを追加
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', 'アクション1');
      
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message-2"]', 'アクション2');
      
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message-3"]', 'アクション3');
      
      await page.click('[data-testid="save-condition"]');
      
      // アクションの順序を変更
      const action1 = page.locator('[data-testid="if-action-item-0"]');
      const action3 = page.locator('[data-testid="if-action-item-2"]');
      
      await action1.dragTo(action3);
      
      // 順序変更が反映されることを確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode.indexOf('アクション2')).toBeLessThan(updatedCode.indexOf('アクション3'));
      expect(updatedCode.indexOf('アクション3')).toBeLessThan(updatedCode.indexOf('アクション1'));
    });

    test('ネスト条件ブロックのドラッグ&ドロップ', async ({ page }) => {
      // 外側の条件を作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '外部条件');
      await page.click('[data-testid="save-condition"]');
      
      // 内側に複数のネスト条件を追加
      await page.click('[data-testid="condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="nested-condition-expression"]', 'ネスト条件1');
      await page.click('[data-testid="save-nested-condition"]');
      
      await page.click('[data-testid="condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="nested-condition-expression-2"]', 'ネスト条件2');
      await page.click('[data-testid="save-nested-condition"]');
      
      // ネスト条件の順序を変更
      const nestedCondition1 = page.locator('[data-testid="nested-condition-item-0"]');
      const nestedCondition2 = page.locator('[data-testid="nested-condition-item-1"]');
      
      await nestedCondition2.dragTo(nestedCondition1);
      
      // 順序変更が反映されることを確認
      const code = await editorPage.getPlantUMLCode();
      expect(code.indexOf('ネスト条件2')).toBeLessThan(code.indexOf('ネスト条件1'));
    });

    test('異なる条件分岐間でのアクション移動', async ({ page }) => {
      // 2つの条件分岐を作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '条件A');
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', '移動するアクション');
      await page.click('[data-testid="save-condition"]');
      
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '条件B');
      await page.click('[data-testid="save-condition"]');
      
      // 条件Aのアクションを条件Bに移動
      const actionToMove = page.locator('[data-testid="condition-0-if-action-0"]');
      const targetCondition = page.locator('[data-testid="condition-item-1"] [data-testid="if-branch-area"]');
      
      await actionToMove.dragTo(targetCondition);
      
      // 移動が完了したことを確認
      const code = await editorPage.getPlantUMLCode();
      const conditionAIndex = code.indexOf('alt 条件A');
      const conditionBIndex = code.indexOf('alt 条件B');
      const actionIndex = code.indexOf('移動するアクション');
      
      // アクションが条件Bの範囲内にあることを確認
      expect(actionIndex).toBeGreaterThan(conditionBIndex);
    });
  });

  test.describe('視覚的分岐編集機能テスト', () => {
    
    test('分岐パスの視覚的表示確認', async ({ page }) => {
      // IF-ELSE条件分岐を作成
      await page.click('[data-testid="add-condition"]');
      await page.selectOption('[data-testid="condition-type"]', 'if-else');
      await page.fill('[data-testid="condition-expression"]', 'ステータス確認');
      
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', '正常処理');
      
      await page.click('[data-testid="add-action-else-branch"]');
      await page.fill('[data-testid="else-message"]', 'エラー処理');
      
      await page.click('[data-testid="save-condition"]');
      
      // 分岐パスが視覚的に表示されることを確認
      await expect(page.locator('[data-testid="branch-path-if"]')).toBeVisible();
      await expect(page.locator('[data-testid="branch-path-else"]')).toBeVisible();
      
      // 分岐パスにホバーした時のハイライト効果
      await page.hover('[data-testid="branch-path-if"]');
      await expect(page.locator('[data-testid="branch-path-if"]')).toHaveClass(/highlighted/);
      
      // 分岐パスクリックで編集モードに入る
      await page.click('[data-testid="branch-path-if"]');
      await expect(page.locator('[data-testid="branch-edit-panel"]')).toBeVisible();
    });

    test('条件分岐フローチャート表示', async ({ page }) => {
      // 複雑な分岐構造を作成
      await page.click('[data-testid="add-condition"]');
      await page.selectOption('[data-testid="condition-type"]', 'if-elseif-else');
      await page.fill('[data-testid="condition-expression"]', 'ユーザータイプチェック');
      
      // IF分岐
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', '管理者権限確認');
      
      // ELSEIF分岐
      await page.click('[data-testid="add-elseif-branch"]');
      await page.fill('[data-testid="elseif-condition-1"]', '一般ユーザー');
      await page.click('[data-testid="add-action-elseif-branch-1"]');
      await page.fill('[data-testid="elseif-message-1"]', '標準機能提供');
      
      // ELSE分岐
      await page.click('[data-testid="add-action-else-branch"]');
      await page.fill('[data-testid="else-message"]', 'ゲストモード');
      
      await page.click('[data-testid="save-condition"]');
      
      // フローチャート表示ボタンをクリック
      await page.click('[data-testid="show-flowchart"]');
      
      // フローチャートが表示されることを確認
      await expect(page.locator('[data-testid="flowchart-viewer"]')).toBeVisible();
      
      // 各分岐ノードが表示されることを確認
      await expect(page.locator('[data-testid="flowchart-if-node"]')).toBeVisible();
      await expect(page.locator('[data-testid="flowchart-elseif-node"]')).toBeVisible();
      await expect(page.locator('[data-testid="flowchart-else-node"]')).toBeVisible();
      
      // 分岐の接続線が表示されることを確認
      await expect(page.locator('[data-testid="flowchart-connection-lines"]')).toBeVisible();
    });

    test('インラインテキスト編集機能', async ({ page }) => {
      // 条件分岐を作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '編集前の条件');
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', '編集前のメッセージ');
      await page.click('[data-testid="save-condition"]');
      
      // 条件式をダブルクリックしてインライン編集
      await page.dblclick('[data-testid="condition-expression-display"]');
      
      // インライン編集フィールドが表示されることを確認
      await expect(page.locator('[data-testid="inline-edit-condition"]')).toBeVisible();
      
      // テキストを編集
      await page.fill('[data-testid="inline-edit-condition"]', '編集後の条件');
      await page.keyboard.press('Enter');
      
      // 編集が反映されることを確認
      const updatedText = await page.textContent('[data-testid="condition-expression-display"]');
      expect(updatedText).toBe('編集後の条件');
      
      // PlantUMLコードも更新されることを確認
      const code = await editorPage.getPlantUMLCode();
      expect(code).toContain('編集後の条件');
      expect(code).not.toContain('編集前の条件');
    });
  });

  test.describe('折りたたみ機能テスト', () => {
    
    test('条件分岐ブロックの折りたたみ', async ({ page }) => {
      // 大きな条件分岐を作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '折りたたみテスト条件');
      
      // 複数のアクションを追加
      for (let i = 1; i <= 5; i++) {
        await page.click('[data-testid="add-action-if-branch"]');
        await page.fill(`[data-testid="if-message-${i}"]`, `アクション${i}`);
      }
      
      await page.click('[data-testid="save-condition"]');
      
      // すべてのアクションが表示されていることを確認
      for (let i = 1; i <= 5; i++) {
        await expect(page.locator(`[data-testid="if-action-${i}"]`)).toBeVisible();
      }
      
      // 折りたたみボタンをクリック
      await page.click('[data-testid="collapse-condition-0"]');
      
      // アクションが非表示になることを確認
      for (let i = 1; i <= 5; i++) {
        await expect(page.locator(`[data-testid="if-action-${i}"]`)).not.toBeVisible();
      }
      
      // 条件式は表示されたままであることを確認
      await expect(page.locator('[data-testid="condition-expression-display"]')).toBeVisible();
      
      // 展開ボタンをクリック
      await page.click('[data-testid="expand-condition-0"]');
      
      // アクションが再表示されることを確認
      for (let i = 1; i <= 5; i++) {
        await expect(page.locator(`[data-testid="if-action-${i}"]`)).toBeVisible();
      }
    });

    test('ネスト条件の部分的折りたたみ', async ({ page }) => {
      // 外側の条件を作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '外部条件');
      await page.click('[data-testid="save-condition"]');
      
      // 内側に複数のネスト条件を追加
      await page.click('[data-testid="condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="nested-condition-expression"]', 'ネスト条件1');
      await page.click('[data-testid="add-action-nested-if"]');
      await page.fill('[data-testid="nested-if-message"]', 'ネストアクション1');
      await page.click('[data-testid="save-nested-condition"]');
      
      await page.click('[data-testid="condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="nested-condition-expression-2"]', 'ネスト条件2');
      await page.click('[data-testid="add-action-nested-if-2"]');
      await page.fill('[data-testid="nested-if-message-2"]', 'ネストアクション2');
      await page.click('[data-testid="save-nested-condition"]');
      
      // 最初のネスト条件だけを折りたたみ
      await page.click('[data-testid="collapse-nested-condition-0"]');
      
      // 最初のネスト条件のアクションが非表示になることを確認
      await expect(page.locator('[data-testid="nested-action-1"]')).not.toBeVisible();
      
      // 2番目のネスト条件は表示されたままであることを確認
      await expect(page.locator('[data-testid="nested-action-2"]')).toBeVisible();
      
      // 外部条件全体を折りたたみ
      await page.click('[data-testid="collapse-condition-0"]');
      
      // すべてのネスト条件が非表示になることを確認
      await expect(page.locator('[data-testid="nested-condition-1"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nested-condition-2"]')).not.toBeVisible();
    });

    test('全体折りたたみ機能', async ({ page }) => {
      // 複数の条件分岐を作成
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="add-condition"]');
        await page.fill('[data-testid="condition-expression"]', `条件${i}`);
        await page.click('[data-testid="add-action-if-branch"]');
        await page.fill('[data-testid="if-message"]', `アクション${i}`);
        await page.click('[data-testid="save-condition"]');
      }
      
      // 全ての条件分岐が展開されていることを確認
      for (let i = 1; i <= 3; i++) {
        await expect(page.locator(`[data-testid="if-action-${i}"]`)).toBeVisible();
      }
      
      // 全体折りたたみボタンをクリック
      await page.click('[data-testid="collapse-all-conditions"]');
      
      // 全てのアクションが非表示になることを確認
      for (let i = 1; i <= 3; i++) {
        await expect(page.locator(`[data-testid="if-action-${i}"]`)).not.toBeVisible();
      }
      
      // 条件式は表示されたままであることを確認
      for (let i = 1; i <= 3; i++) {
        await expect(page.locator(`[data-testid="condition-expression-${i}"]`)).toBeVisible();
      }
      
      // 全体展開ボタンをクリック
      await page.click('[data-testid="expand-all-conditions"]');
      
      // 全てのアクションが再表示されることを確認
      for (let i = 1; i <= 3; i++) {
        await expect(page.locator(`[data-testid="if-action-${i}"]`)).toBeVisible();
      }
    });
  });

  test.describe('エラー状態ハンドリングテスト', () => {
    
    test('無効な条件式のエラー表示', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      
      // 無効な条件式を入力
      await page.fill('[data-testid="condition-expression"]', 'invalid condition {syntax}');
      await page.click('[data-testid="save-condition"]');
      
      // エラーアイコンが表示されることを確認
      await expect(page.locator('[data-testid="condition-error-icon"]')).toBeVisible();
      
      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="condition-error-message"]')).toBeVisible();
      const errorText = await page.textContent('[data-testid="condition-error-message"]');
      expect(errorText).toContain('無効な条件式');
      
      // エラー状態では保存ができないことを確認
      const saveButton = page.locator('[data-testid="save-condition"]');
      await expect(saveButton).toBeDisabled();
    });

    test('循環参照エラーの検出', async ({ page }) => {
      // 条件Aを作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '条件A');
      await page.click('[data-testid="save-condition"]');
      
      // 条件Aの中にネスト条件Bを作成
      await page.click('[data-testid="condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="nested-condition-expression"]', '条件B');
      await page.click('[data-testid="save-nested-condition"]');
      
      // 条件Bの中に条件Aを参照しようとする（循環参照）
      await page.click('[data-testid="nested-condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="deep-nested-condition-expression"]', '条件A参照');
      await page.click('[data-testid="save-deep-nested-condition"]');
      
      // 循環参照エラーが表示されることを確認
      await expect(page.locator('[data-testid="circular-reference-error"]')).toBeVisible();
      const errorText = await page.textContent('[data-testid="circular-reference-error"]');
      expect(errorText).toContain('循環参照');
    });

    test('分岐内アクションなしエラー', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '有効な条件');
      
      // アクションを追加せずに保存しようとする
      await page.click('[data-testid="save-condition"]');
      
      // 警告メッセージが表示されることを確認
      await expect(page.locator('[data-testid="no-action-warning"]')).toBeVisible();
      const warningText = await page.textContent('[data-testid="no-action-warning"]');
      expect(warningText).toContain('分岐内にアクションがありません');
      
      // 警告を無視して保存することも可能であることを確認
      await page.click('[data-testid="save-anyway"]');
      await expect(page.locator('.condition-item')).toBeVisible();
    });

    test('エラー状態からの回復テスト', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      
      // 無効な条件式を入力してエラー状態にする
      await page.fill('[data-testid="condition-expression"]', '<script>alert("xss")</script>');
      await page.click('[data-testid="save-condition"]');
      
      // エラー状態であることを確認
      await expect(page.locator('[data-testid="condition-error-icon"]')).toBeVisible();
      
      // 条件式を有効なものに修正
      await page.fill('[data-testid="condition-expression"]', '有効な条件式');
      
      // エラー状態が解除されることを確認
      await expect(page.locator('[data-testid="condition-error-icon"]')).not.toBeVisible();
      
      // 保存ボタンが有効になることを確認
      const saveButton = page.locator('[data-testid="save-condition"]');
      await expect(saveButton).toBeEnabled();
      
      // 正常に保存できることを確認
      await page.click('[data-testid="save-condition"]');
      await expect(page.locator('.condition-item')).toBeVisible();
    });
  });

  test.describe('リアルタイムプレビュー更新テスト', () => {
    
    test('条件入力時のリアルタイムプレビュー', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      
      // リアルタイムプレビューが有効であることを確認
      await page.check('[data-testid="enable-realtime-preview"]');
      
      // 条件式を入力しながらプレビューが更新されることを確認
      await page.fill('[data-testid="condition-expression"]', 'リアルタイム');
      
      // プレビューエリアに内容が表示されることを確認
      await expect(page.locator('[data-testid="condition-preview"]')).toBeVisible();
      const previewText = await page.textContent('[data-testid="condition-preview"]');
      expect(previewText).toContain('リアルタイム');
      
      // 条件式を変更してプレビューが更新されることを確認
      await page.fill('[data-testid="condition-expression"]', 'リアルタイム更新テスト');
      await page.waitForTimeout(500); // リアルタイム更新の待機
      
      const updatedPreviewText = await page.textContent('[data-testid="condition-preview"]');
      expect(updatedPreviewText).toContain('リアルタイム更新テスト');
    });

    test('アクション追加時のプレビュー更新', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      await page.check('[data-testid="enable-realtime-preview"]');
      await page.fill('[data-testid="condition-expression"]', 'プレビューテスト条件');
      
      // アクションを追加
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', '新しいアクション');
      
      // プレビューにアクションが反映されることを確認
      const previewCode = await page.textContent('[data-testid="plantuml-preview"]');
      expect(previewCode).toContain('alt プレビューテスト条件');
      expect(previewCode).toContain('新しいアクション');
    });

    test('プレビュー更新パフォーマンステスト', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      await page.check('[data-testid="enable-realtime-preview"]');
      
      const updateTimes = [];
      
      // 50回の条件式更新を行い、更新時間を測定
      for (let i = 1; i <= 50; i++) {
        const startTime = Date.now();
        
        await page.fill('[data-testid="condition-expression"]', `条件${i}`);
        
        // プレビューの更新を待機
        await page.waitForFunction((expectedText) => {
          const preview = document.querySelector('[data-testid="condition-preview"]');
          return preview && preview.textContent.includes(expectedText);
        }, `条件${i}`);
        
        const updateTime = Date.now() - startTime;
        updateTimes.push(updateTime);
        
        // 更新時間が200ms以内であることを確認
        expect(updateTime).toBeLessThan(200);
      }
      
      // 平均更新時間を計算
      const averageTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      console.log(`平均プレビュー更新時間: ${averageTime}ms`);
      
      // 平均更新時間が100ms以内であることを確認
      expect(averageTime).toBeLessThan(100);
    });

    test('複雑な条件構造のプレビュー更新', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      await page.check('[data-testid="enable-realtime-preview"]');
      
      // 複雑な条件構造を段階的に構築
      await page.selectOption('[data-testid="condition-type"]', 'if-elseif-else');
      await page.fill('[data-testid="condition-expression"]', 'メインの条件');
      
      // IF分岐
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', 'IF分岐アクション');
      
      // ELSEIF分岐追加
      await page.click('[data-testid="add-elseif-branch"]');
      await page.fill('[data-testid="elseif-condition-1"]', 'ELSEIF条件');
      await page.click('[data-testid="add-action-elseif-branch-1"]');
      await page.fill('[data-testid="elseif-message-1"]', 'ELSEIF分岐アクション');
      
      // ELSE分岐
      await page.click('[data-testid="add-action-else-branch"]');
      await page.fill('[data-testid="else-message"]', 'ELSE分岐アクション');
      
      // 各段階でプレビューが正しく更新されることを確認
      const finalPreview = await page.textContent('[data-testid="plantuml-preview"]');
      expect(finalPreview).toContain('alt メインの条件');
      expect(finalPreview).toContain('IF分岐アクション');
      expect(finalPreview).toContain('else ELSEIF条件');
      expect(finalPreview).toContain('ELSEIF分岐アクション');
      expect(finalPreview).toContain('else');
      expect(finalPreview).toContain('ELSE分岐アクション');
      expect(finalPreview).toContain('end');
    });
  });

  test.describe('条件エディターアクセシビリティテスト', () => {
    
    test('キーボードナビゲーションテスト', async ({ page }) => {
      // 条件分岐を作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', 'キーボードテスト');
      await page.click('[data-testid="save-condition"]');
      
      // Tabキーで要素間を移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="condition-item-0"]')).toBeFocused();
      
      // Enterキーで編集モードに入る
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="condition-editor-modal"]')).toBeVisible();
      
      // Escapeキーでモーダルを閉じる
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="condition-editor-modal"]')).not.toBeVisible();
      
      // 矢印キーで条件分岐間を移動
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
    });

    test('スクリーンリーダー対応テスト', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', 'アクセシビリティテスト');
      await page.click('[data-testid="save-condition"]');
      
      // ARIA属性が適切に設定されているかを確認
      const conditionItem = page.locator('[data-testid="condition-item-0"]');
      await expect(conditionItem).toHaveAttribute('role', 'treeitem');
      await expect(conditionItem).toHaveAttribute('aria-label');
      
      // 条件式にaria-describedbyが設定されているかを確認
      const expressionElement = page.locator('[data-testid="condition-expression-display"]');
      await expect(expressionElement).toHaveAttribute('aria-describedby');
      
      // ボタンにアクセシブルな名前が設定されているかを確認
      const editButton = page.locator('[data-testid="edit-condition-0"]');
      await expect(editButton).toHaveAttribute('aria-label');
    });

    test('高コントラストモード対応テスト', async ({ page }) => {
      // 高コントラストモードを有効にする
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            .condition-item { border: 2px solid #000; }
            .condition-expression { background: #fff; color: #000; }
          }
        `
      });
      
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '高コントラストテスト');
      await page.click('[data-testid="save-condition"]');
      
      // 高コントラストモードでの表示を確認
      const conditionItem = page.locator('[data-testid="condition-item-0"]');
      const borderStyle = await conditionItem.evaluate(el => getComputedStyle(el).border);
      
      // 適切なコントラストが適用されていることを確認
      expect(borderStyle).toContain('2px');
      expect(borderStyle).toContain('solid');
    });
  });
});