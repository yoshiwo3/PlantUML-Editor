// E2E Test for Edit Function - Playwright
const { test, expect } = require('@playwright/test');

test.describe('PlantUML Editor Edit Functions', () => {
  test.beforeEach(async ({ page }) => {
    // テストサーバーにアクセス
    await page.goto('http://localhost:8080');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
  });

  test('should open condition edit modal', async ({ page }) => {
    // STEP1: アクターを追加
    await page.fill('#actor1', 'ユーザー');
    await page.fill('#actor2', 'システム');
    await page.click('#add-actors-btn');
    
    // STEP2: 条件分岐を追加
    await page.click('#add-condition-btn');
    await page.fill('#condition-name', 'ログイン確認');
    await page.fill('#condition-type', 'if-else');
    
    // 真の場合のアクション追加
    await page.click('#add-true-action');
    await page.fill('#true-action-1', 'ユーザー → システム: ログイン成功');
    
    // 偽の場合のアクション追加
    await page.click('#add-false-action');
    await page.fill('#false-action-1', 'システム → ユーザー: エラー表示');
    
    // 条件追加を完了
    await page.click('#complete-condition-btn');
    
    // 追加された条件分岐をクリックして編集モーダルを開く
    await page.click('.flow-item.condition');
    
    // 編集モーダルが表示されることを確認
    await expect(page.locator('.edit-modal')).toBeVisible();
    await expect(page.locator('.edit-modal h3')).toContainText('条件分岐の編集');
  });

  test('should edit condition branch actions', async ({ page }) => {
    // 既存の条件分岐があると仮定
    await page.click('.flow-item.condition');
    
    // 編集モーダル内で内部アクションを編集
    const trueActionEditor = page.locator('#true-branch-actions');
    await expect(trueActionEditor).toBeVisible();
    
    // アクション追加ボタンの存在確認
    const addActionBtn = page.locator('.btn-add-action[data-branch="true"]');
    await expect(addActionBtn).toBeVisible();
    
    // アクション追加
    await addActionBtn.click();
    await page.fill('.action-content', 'ユーザー → システム: 追加アクション');
    
    // 保存
    await page.click('.btn-save');
    
    // モーダルが閉じることを確認
    await expect(page.locator('.edit-modal')).not.toBeVisible();
  });

  test('should open loop edit modal', async ({ page }) => {
    // ループ追加
    await page.click('#add-loop-btn');
    await page.fill('#loop-condition', '全データ処理完了まで');
    
    // ループ内アクション追加
    await page.click('#add-loop-action');
    await page.fill('#loop-action-1', 'システム → DB: データ取得');
    
    // ループ追加完了
    await page.click('#complete-loop-btn');
    
    // 追加されたループをクリック
    await page.click('.flow-item.loop');
    
    // 編集モーダル確認
    await expect(page.locator('.edit-modal')).toBeVisible();
    await expect(page.locator('.edit-modal h3')).toContainText('ループの編集');
  });

  test('should open parallel edit modal', async ({ page }) => {
    // 並行処理追加
    await page.click('#add-parallel-btn');
    
    // ブランチ1のアクション
    await page.click('#add-branch1-action');
    await page.fill('#branch1-action-1', 'ユーザー → API1: リクエスト');
    
    // ブランチ2のアクション
    await page.click('#add-branch2-action');
    await page.fill('#branch2-action-1', 'ユーザー → API2: リクエスト');
    
    // 並行処理追加完了
    await page.click('#complete-parallel-btn');
    
    // 追加された並行処理をクリック
    await page.click('.flow-item.parallel');
    
    // 編集モーダル確認
    await expect(page.locator('.edit-modal')).toBeVisible();
    await expect(page.locator('.edit-modal h3')).toContainText('並行処理の編集');
  });

  test('should validate UI design consistency', async ({ page }) => {
    // 各編集モーダルのUIデザイン一貫性を確認
    const modalTypes = ['condition', 'loop', 'parallel'];
    
    for (const type of modalTypes) {
      await page.click(`.flow-item.${type}`);
      
      // 共通UIコンポーネントの確認
      await expect(page.locator('.edit-modal')).toBeVisible();
      await expect(page.locator('.modal-header')).toBeVisible();
      await expect(page.locator('.modal-body')).toBeVisible();
      await expect(page.locator('.modal-footer')).toBeVisible();
      await expect(page.locator('.btn-save')).toBeVisible();
      await expect(page.locator('.btn-cancel')).toBeVisible();
      
      // カラーパレットの確認（CSS変数）
      const primaryColor = await page.evaluate(() => 
        getComputedStyle(document.documentElement).getPropertyValue('--primary')
      );
      expect(primaryColor).toBe('#007bff');
      
      // 閉じる
      await page.click('.btn-cancel');
    }
  });

  test('should measure response performance', async ({ page }) => {
    const startTime = Date.now();
    
    // 条件分岐編集モーダルを開く
    await page.click('.flow-item.condition');
    await page.waitForSelector('.edit-modal');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // レスポンス時間が100ms以内であることを確認
    expect(responseTime).toBeLessThan(100);
  });
});