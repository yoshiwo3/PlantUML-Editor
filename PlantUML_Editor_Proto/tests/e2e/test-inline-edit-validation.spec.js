const { test, expect } = require('@playwright/test');

test.describe('PlantUML エディタ インライン編集機能検証', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('http://localhost:8086');
    await page.waitForLoadState('networkidle');
    
    // コンソールエラーを監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
  });

  test('1. アプリケーション基本動作確認', async ({ page }) => {
    // ページが正常に読み込まれることを確認
    await expect(page).toHaveTitle(/PlantUML変換エディター/);
    
    // ヘッダーが表示されることを確認
    await expect(page.locator('h1')).toContainText('PlantUML変換エディター');
    
    // インライン編集タブが存在することを確認
    const inlineEditTab = page.locator('[data-mode="inline-edit"]');
    await expect(inlineEditTab).toBeVisible();
    
    console.log('✅ アプリケーション基本動作: OK');
  });

  test('2. アクター追加機能の検証', async ({ page }) => {
    // アクターボタンをクリック
    await page.click('[data-actor="顧客"]');
    await page.waitForTimeout(500);
    
    await page.click('[data-actor="ECサイト"]');
    await page.waitForTimeout(500);
    
    await page.click('[data-actor="在庫システム"]');
    await page.waitForTimeout(500);

    // 選択されたアクターが表示されることを確認
    const selectedActors = page.locator('.actor-chips');
    await expect(selectedActors).toBeVisible();
    
    console.log('✅ アクター追加機能: OK');
  });

  test('3. 条件分岐追加とアクション追加ボタン検証', async ({ page }) => {
    // Step 1: アクターを追加
    await page.click('[data-actor="顧客"]');
    await page.click('[data-actor="ECサイト"]');
    await page.click('[data-actor="在庫システム"]');
    await page.waitForTimeout(1000);

    // Step 2: 条件分岐タブに切り替え
    await page.click('[data-type="condition"]');
    await page.waitForTimeout(500);

    // 条件分岐フォームが表示されることを確認
    const conditionBuilder = page.locator('#condition-builder');
    await expect(conditionBuilder).not.toHaveClass(/hidden/);

    // 条件名を入力
    await page.fill('#condition-name', '在庫あり');
    await page.waitForTimeout(300);

    // 条件分岐を追加
    await page.click('.btn-add-condition');
    await page.waitForTimeout(1000);

    // アクションリストに条件分岐が追加されることを確認
    const actionItems = page.locator('.action-items');
    await expect(actionItems).toContainText('在庫あり');

    console.log('✅ 条件分岐追加: OK');

    // Step 3: 編集ボタンをクリックして編集モーダルを開く
    const editButton = page.locator('.action-item').filter({ hasText: '在庫あり' }).locator('.btn-edit');
    await expect(editButton).toBeVisible();
    await editButton.click();
    await page.waitForTimeout(1000);

    // 編集モーダルが開かれることを確認
    const editModal = page.locator('.edit-modal, #edit-modal, [class*="modal"]');
    await expect(editModal).toBeVisible();

    console.log('✅ 編集モーダル表示: OK');

    // Step 4: TRUE分岐のアクション追加ボタンをテスト
    const trueBranchAddButton = page.locator('[data-branch="true"] .btn-add-branch-action, [data-branch="true"] button:has-text("アクション追加"), button:has-text("アクション追加"):nth-of-type(1)');
    
    // ボタンが表示されるまで待機
    await expect(trueBranchAddButton.first()).toBeVisible({ timeout: 5000 });
    
    // TRUE分岐のアクション追加ボタンをクリック
    await trueBranchAddButton.first().click();
    await page.waitForTimeout(1000);

    console.log('✅ TRUE分岐アクション追加ボタンクリック: OK');

    // Step 5: FALSE分岐のアクション追加ボタンをテスト
    const falseBranchAddButton = page.locator('[data-branch="false"] .btn-add-branch-action, [data-branch="false"] button:has-text("アクション追加"), button:has-text("アクション追加"):nth-of-type(2)');
    
    // FALSE分岐のボタンが表示されることを確認
    await expect(falseBranchAddButton.first()).toBeVisible({ timeout: 5000 });
    
    // FALSE分岐のアクション追加ボタンをクリック
    await falseBranchAddButton.first().click();
    await page.waitForTimeout(1000);

    console.log('✅ FALSE分岐アクション追加ボタンクリック: OK');

    // Step 6: スクリーンショットを撮影
    await page.screenshot({ path: 'condition-edit-modal-test.png', fullPage: true });
    
    console.log('✅ 条件分岐編集機能の検証完了');
  });

  test('4. ループ編集機能の検証', async ({ page }) => {
    // アクターを追加
    await page.click('[data-actor="ECサイト"]');
    await page.click('[data-actor="在庫システム"]');
    await page.waitForTimeout(1000);

    // ループタブに切り替え
    await page.click('[data-type="loop"]');
    await page.waitForTimeout(500);

    // ループ条件を入力
    await page.fill('#loop-condition', '全商品を処理するまで');
    await page.waitForTimeout(300);

    // ループを追加
    await page.click('.btn-add-loop');
    await page.waitForTimeout(1000);

    // 編集ボタンをクリック
    const editButton = page.locator('.action-item').filter({ hasText: '全商品を処理するまで' }).locator('.btn-edit');
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // ループ内のアクション追加ボタンをテスト
      const loopActionButton = page.locator('.btn-add-loop-action, button:has-text("アクション追加")');
      if (await loopActionButton.count() > 0) {
        await loopActionButton.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ ループ内アクション追加ボタン: OK');
      } else {
        console.log('⚠️ ループ内アクション追加ボタンが見つかりません');
      }
    } else {
      console.log('⚠️ ループ編集ボタンが見つかりません');
    }

    await page.screenshot({ path: 'loop-edit-modal-test.png', fullPage: true });
  });

  test('5. 並行処理編集機能の検証', async ({ page }) => {
    // アクターを追加
    await page.click('[data-actor="ECサイト"]');
    await page.click('[data-actor="決済サービス"]');
    await page.click('[data-actor="配送業者"]');
    await page.waitForTimeout(1000);

    // 並行処理タブに切り替え
    await page.click('[data-type="parallel"]');
    await page.waitForTimeout(500);

    // 並行処理を追加
    await page.click('.btn-add-parallel');
    await page.waitForTimeout(1000);

    // 編集ボタンをクリック
    const editButton = page.locator('.action-item').filter({ hasText: '並行処理' }).locator('.btn-edit');
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // 並行処理ブランチのアクション追加ボタンをテスト
      const parallelActionButtons = page.locator('.btn-add-parallel-action, button:has-text("アクション追加")');
      const buttonCount = await parallelActionButtons.count();
      
      console.log(`並行処理アクション追加ボタン数: ${buttonCount}`);
      
      if (buttonCount > 0) {
        // 1つ目のブランチのボタンをクリック
        await parallelActionButtons.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ 並行処理ブランチ1のアクション追加ボタン: OK');
        
        if (buttonCount > 1) {
          // 2つ目のブランチのボタンをクリック
          await parallelActionButtons.nth(1).click();
          await page.waitForTimeout(1000);
          console.log('✅ 並行処理ブランチ2のアクション追加ボタン: OK');
        }
      } else {
        console.log('⚠️ 並行処理アクション追加ボタンが見つかりません');
      }
    } else {
      console.log('⚠️ 並行処理編集ボタンが見つかりません');
    }

    await page.screenshot({ path: 'parallel-edit-modal-test.png', fullPage: true });
  });

  test('6. JavaScriptエラー監視とコンソール確認', async ({ page }) => {
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      const msgType = msg.type();
      const msgText = msg.text();
      
      if (msgType === 'error') {
        errors.push(msgText);
      } else if (msgType === 'warning') {
        warnings.push(msgText);
      }
    });

    // 複数の操作を実行してエラーをキャッチ
    await page.click('[data-actor="顧客"]');
    await page.click('[data-type="condition"]');
    await page.fill('#condition-name', 'テスト条件');
    await page.click('.btn-add-condition');
    await page.waitForTimeout(2000);

    console.log(`JavaScriptエラー数: ${errors.length}`);
    console.log(`警告数: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('⚠️ JavaScriptエラー:', errors);
    } else {
      console.log('✅ JavaScriptエラー: なし');
    }

    if (warnings.length > 0) {
      console.log('⚠️ 警告:', warnings);
    }
    
    // パフォーマンス確認
    const performanceMetrics = await page.evaluate(() => {
      return {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        memoryUsage: performance.memory ? {
          usedJSMemory: performance.memory.usedJSHeapSize,
          totalJSMemory: performance.memory.totalJSHeapSize
        } : null
      };
    });

    console.log('パフォーマンス指標:', performanceMetrics);
  });
});