/**
 * 基本フローE2Eテスト - PlantUMLプロジェクト
 * 
 * このテストファイルは以下の基本機能を検証します:
 * - アプリケーションの起動と基本画面表示
 * - 基本的なテキスト入力と変換機能
 * - ナビゲーションとUIの基本操作
 * - エラーハンドリングの基本動作
 */

const { test, expect } = require('@playwright/test');

/**
 * 基本フローテストスイート
 */
test.describe('基本フロー - スモークテスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // 基本的なセットアップ
    await page.goto('/');
    
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // 各テスト後のクリーンアップ
    await page.evaluate(() => {
      // ローカルストレージをクリア
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('アプリケーションが正常に起動する', async ({ page }) => {
    // メタ情報の確認
    await expect(page).toHaveTitle(/PlantUML/);
    
    // 基本要素の存在確認
    await expect(page.locator('body')).toBeVisible();
    
    // メインコンテナの表示確認
    const mainContainer = page.locator('[data-testid="app-container"]').first();
    if (await mainContainer.count() > 0) {
      await expect(mainContainer).toBeVisible();
    }
    
    // コンソールエラーがないことを確認
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // ページの再読み込みでエラーチェック
    await page.reload({ waitUntil: 'networkidle' });
    
    // 重大なコンソールエラーがないことを確認（警告は許容）
    const criticalErrors = logs.filter(log => 
      !log.includes('Warning') && 
      !log.includes('DevTools') &&
      !log.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('メイン画面の基本要素が表示される', async ({ page }) => {
    // ヘッダーエリアの確認
    const possibleHeaders = [
      'header',
      '[data-testid="header"]',
      '.header',
      'h1',
      '.title'
    ];
    
    let headerFound = false;
    for (const headerSelector of possibleHeaders) {
      const header = page.locator(headerSelector).first();
      if (await header.count() > 0 && await header.isVisible()) {
        await expect(header).toBeVisible();
        headerFound = true;
        break;
      }
    }
    
    // ヘッダーが見つからない場合は警告のみ
    if (!headerFound) {
      console.warn('⚠️ ヘッダー要素が見つかりませんでした');
    }
    
    // テキスト入力エリアの確認
    const possibleInputs = [
      'textarea',
      'input[type="text"]',
      '[data-testid="text-input"]',
      '[data-testid="japanese-input"]',
      '.text-input',
      '#textInput'
    ];
    
    let inputFound = false;
    for (const inputSelector of possibleInputs) {
      const input = page.locator(inputSelector).first();
      if (await input.count() > 0 && await input.isVisible()) {
        await expect(input).toBeVisible();
        inputFound = true;
        break;
      }
    }
    
    // 入力フィールドの存在は必須
    expect(inputFound).toBeTruthy();
    
    // 変換ボタンの確認
    const possibleButtons = [
      'button:has-text("変換")',
      'button:has-text("Convert")',
      '[data-testid="convert-button"]',
      '.convert-button',
      '#convertButton'
    ];
    
    let buttonFound = false;
    for (const buttonSelector of possibleButtons) {
      const button = page.locator(buttonSelector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        await expect(button).toBeVisible();
        buttonFound = true;
        break;
      }
    }
    
    expect(buttonFound).toBeTruthy();
  });

  test('基本的なテキスト入力が機能する', async ({ page }) => {
    // テキスト入力フィールドを見つける
    const inputSelectors = [
      'textarea',
      'input[type="text"]',
      '[data-testid="text-input"]',
      '[data-testid="japanese-input"]'
    ];
    
    let inputField = null;
    for (const selector of inputSelectors) {
      const field = page.locator(selector).first();
      if (await field.count() > 0 && await field.isVisible()) {
        inputField = field;
        break;
      }
    }
    
    expect(inputField).not.toBeNull();
    
    // テストテキストの入力
    const testText = 'ユーザーがログインします';
    await inputField.fill(testText);
    
    // 入力値の確認
    await expect(inputField).toHaveValue(testText);
    
    // 日本語入力の確認
    const japaneseText = 'システムが応答を送信します';
    await inputField.fill(japaneseText);
    await expect(inputField).toHaveValue(japaneseText);
    
    // 特殊文字の入力テスト
    const specialText = 'テスト: データベースへ保存 -> 完了';
    await inputField.fill(specialText);
    await expect(inputField).toHaveValue(specialText);
  });

  test('基本的な変換機能が動作する', async ({ page }) => {
    // テキスト入力フィールドを取得
    const inputField = await this.getInputField(page);
    const convertButton = await this.getConvertButton(page);
    
    // テストデータの入力
    const testInput = 'ユーザーがログインします';
    await inputField.fill(testInput);
    
    // 変換ボタンをクリック
    await convertButton.click();
    
    // 結果の表示を待機（最大10秒）
    await page.waitForTimeout(2000);
    
    // 結果表示エリアの確認
    const possibleOutputs = [
      '[data-testid="output"]',
      '[data-testid="result"]',
      '[data-testid="plantuml-output"]',
      '.output',
      '.result',
      'pre',
      'code'
    ];
    
    let outputFound = false;
    for (const outputSelector of possibleOutputs) {
      const output = page.locator(outputSelector);
      if (await output.count() > 0) {
        const outputText = await output.textContent();
        if (outputText && outputText.trim().length > 0) {
          // PlantUML形式の基本確認
          expect(outputText).toContain('@start');
          outputFound = true;
          break;
        }
      }
    }
    
    // 変換結果が生成されたことを確認
    expect(outputFound).toBeTruthy();
  });

  test('エラーハンドリングが正常に動作する', async ({ page }) => {
    const inputField = await this.getInputField(page);
    const convertButton = await this.getConvertButton(page);
    
    // 空の入力でのテスト
    await inputField.fill('');
    await convertButton.click();
    
    // エラーメッセージまたは適切なハンドリングの確認
    await page.waitForTimeout(1000);
    
    // エラー表示エリアの確認
    const possibleErrorSelectors = [
      '[data-testid="error"]',
      '.error',
      '.error-message',
      '.alert-error',
      '[role="alert"]'
    ];
    
    let errorHandled = false;
    for (const selector of possibleErrorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.count() > 0 && await errorElement.isVisible()) {
        errorHandled = true;
        break;
      }
    }
    
    // 無効な入力でのテスト
    await inputField.fill('###無効な入力データ###');
    await convertButton.click();
    await page.waitForTimeout(1000);
    
    // アプリケーションがクラッシュしていないことを確認
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    // ページが応答することを確認
    await expect(inputField).toBeVisible();
    await expect(convertButton).toBeVisible();
  });

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // デスクトップサイズでのテスト
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.reload({ waitUntil: 'networkidle' });
    
    const inputField = await this.getInputField(page);
    await expect(inputField).toBeVisible();
    
    // タブレットサイズでのテスト
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(inputField).toBeVisible();
    
    // モバイルサイズでのテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(inputField).toBeVisible();
    
    // レスポンシブ要素の確認
    const bodyElement = page.locator('body');
    const bodyStyles = await bodyElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        overflow: styles.overflow
      };
    });
    
    // 基本的なレスポンシブ動作の確認
    expect(bodyStyles.display).not.toBe('none');
  });

  test('ページナビゲーションが機能する', async ({ page }) => {
    // ページの基本リンクテスト
    const possibleLinks = [
      'a[href]',
      '[data-testid="nav-link"]',
      '.nav-link',
      'nav a'
    ];
    
    for (const linkSelector of possibleLinks) {
      const links = page.locator(linkSelector);
      const linkCount = await links.count();
      
      if (linkCount > 0) {
        // 最初のリンクをテスト
        const firstLink = links.first();
        const href = await firstLink.getAttribute('href');
        
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          // 外部リンクの場合は新しいタブで開くかチェック
          const target = await firstLink.getAttribute('target');
          if (target === '_blank') {
            // 新しいタブで開くリンクの場合
            const [newPage] = await Promise.all([
              page.context().waitForEvent('page'),
              firstLink.click()
            ]);
            await newPage.waitForLoadState();
            await newPage.close();
          }
        }
        break;
      }
    }
    
    // ブラウザの戻る・進むボタンのテスト
    await page.goBack();
    await page.waitForTimeout(500);
    await page.goForward();
    await page.waitForTimeout(500);
    
    // ページが正常に動作することを確認
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  // ヘルパーメソッド
  async getInputField(page) {
    const selectors = [
      'textarea',
      'input[type="text"]',
      '[data-testid="text-input"]',
      '[data-testid="japanese-input"]'
    ];
    
    for (const selector of selectors) {
      const field = page.locator(selector).first();
      if (await field.count() > 0 && await field.isVisible()) {
        return field;
      }
    }
    
    throw new Error('入力フィールドが見つかりません');
  }

  async getConvertButton(page) {
    const selectors = [
      'button:has-text("変換")',
      'button:has-text("Convert")',
      '[data-testid="convert-button"]',
      '.convert-button',
      '#convertButton',
      'button[type="submit"]'
    ];
    
    for (const selector of selectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        return button;
      }
    }
    
    throw new Error('変換ボタンが見つかりません');
  }
});

// テストグループの設定
test.describe.configure({ mode: 'serial' });

// タイムアウト設定
test.setTimeout(30000);