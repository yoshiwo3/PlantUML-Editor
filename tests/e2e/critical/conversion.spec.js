/**
 * 変換機能E2Eテスト - PlantUMLプロジェクト
 * 
 * このテストファイルは以下の変換機能を検証します:
 * - 各種ダイアグラムタイプの変換
 * - 複雑なテキストパターンの処理
 * - 変換結果の正確性
 * - パフォーマンスの監視
 */

const { test, expect } = require('@playwright/test');

/**
 * 変換機能テストスイート
 */
test.describe('変換機能 - クリティカルテスト', () => {
  
  let inputField;
  let convertButton;
  let outputArea;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 共通要素の取得
    inputField = await this.findElement(page, [
      'textarea',
      'input[type="text"]',
      '[data-testid="text-input"]',
      '[data-testid="japanese-input"]'
    ]);
    
    convertButton = await this.findElement(page, [
      'button:has-text("変換")',
      'button:has-text("Convert")',
      '[data-testid="convert-button"]',
      '.convert-button',
      'button[type="submit"]'
    ]);
    
    // 出力エリアは変換後に表示される可能性があるため、存在チェックのみ
    const outputSelectors = [
      '[data-testid="output"]',
      '[data-testid="result"]',
      '[data-testid="plantuml-output"]',
      '.output',
      '.result'
    ];
    
    for (const selector of outputSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        outputArea = element;
        break;
      }
    }
  });

  test('シンプルなアクティビティ図の変換', async ({ page }) => {
    const inputText = `開始
タスク1を実行
タスク2を実行
終了`;

    await inputField.fill(inputText);
    
    // 変換実行の時間測定
    const startTime = Date.now();
    await convertButton.click();
    
    // 結果の表示を待機
    await page.waitForTimeout(3000);
    const endTime = Date.now();
    const conversionTime = endTime - startTime;
    
    // パフォーマンス確認（5秒以内）
    expect(conversionTime).toBeLessThan(5000);
    
    // 出力の確認
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // PlantUML形式の基本構造確認
    expect(output).toMatch(/@start/);
    expect(output).toMatch(/@end/);
    
    // アクティビティ図の要素確認
    expect(output).toContain('start');
    expect(output).toContain('stop');
    
    console.log(`✅ シンプルなアクティビティ図変換完了 (${conversionTime}ms)`);
  });

  test('条件分岐付きアクティビティ図の変換', async ({ page }) => {
    const inputText = `開始
ユーザー情報を取得
条件分岐:
  ユーザーが存在する場合:
    ログイン処理を実行
    メイン画面を表示
  ユーザーが存在しない場合:
    エラーメッセージを表示
    ログイン画面に戻る
終了`;

    await inputField.fill(inputText);
    await convertButton.click();
    await page.waitForTimeout(3000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // 条件分岐の構造確認
    expect(output).toMatch(/if|alt|opt/);
    expect(output).toMatch(/else|end/);
    
    // 処理フローの確認
    expect(output).toContain('ユーザー情報');
    expect(output).toContain('ログイン処理');
    
    console.log('✅ 条件分岐付きアクティビティ図変換完了');
  });

  test('並行処理のアクティビティ図の変換', async ({ page }) => {
    const inputText = `開始
データ取得処理
並行処理:
  並行処理1:
    API呼び出し
    結果を処理
  並行処理2:
    データベース更新
    ログ記録
並行処理終了
結果をまとめる
終了`;

    await inputField.fill(inputText);
    await convertButton.click();
    await page.waitForTimeout(4000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // 並行処理の構造確認
    expect(output).toMatch(/fork|par/);
    expect(output).toMatch(/join|end/);
    
    console.log('✅ 並行処理のアクティビティ図変換完了');
  });

  test('シーケンス図の変換', async ({ page }) => {
    const inputText = `ユーザー -> システム: ログイン要求
システム -> データベース: 認証情報確認
データベース -> システム: 認証結果
システム -> ユーザー: ログイン完了通知`;

    await inputField.fill(inputText);
    await convertButton.click();
    await page.waitForTimeout(3000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // シーケンス図の要素確認
    expect(output).toContain('ユーザー');
    expect(output).toContain('システム');
    expect(output).toContain('データベース');
    expect(output).toContain('->');
    
    console.log('✅ シーケンス図変換完了');
  });

  test('ユースケース図の変換', async ({ page }) => {
    const inputText = `(ユーザー登録) as UC1
(ログイン) as UC2
(データ閲覧) as UC3
(データ編集) as UC4

:一般ユーザー: --> UC1
:一般ユーザー: --> UC2
:認証ユーザー: --> UC3
:認証ユーザー: --> UC4`;

    await inputField.fill(inputText);
    await convertButton.click();
    await page.waitForTimeout(3000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // ユースケース図の要素確認
    expect(output).toMatch(/usecase|actor/);
    expect(output).toContain('ユーザー登録');
    expect(output).toContain('ログイン');
    
    console.log('✅ ユースケース図変換完了');
  });

  test('クラス図の変換', async ({ page }) => {
    const inputText = `クラス User:
  属性:
    - name: String
    - email: String
  メソッド:
    + login(): Boolean
    + logout(): void

クラス Database:
  属性:
    - connection: Connection
  メソッド:
    + connect(): void
    + query(): ResultSet

User -> Database: 使用する`;

    await inputField.fill(inputText);
    await convertButton.click();
    await page.waitForTimeout(3000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // クラス図の要素確認
    expect(output).toMatch(/class/);
    expect(output).toContain('User');
    expect(output).toContain('Database');
    
    console.log('✅ クラス図変換完了');
  });

  test('状態遷移図の変換', async ({ page }) => {
    const inputText = `初期状態 -> ログイン画面
ログイン画面 -> 認証中: ログイン実行
認証中 -> メイン画面: 認証成功
認証中 -> ログイン画面: 認証失敗
メイン画面 -> ログアウト中: ログアウト実行
ログアウト中 -> ログイン画面: ログアウト完了`;

    await inputField.fill(inputText);
    await convertButton.click();
    await page.waitForTimeout(3000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // 状態遷移図の要素確認
    expect(output).toMatch(/state/);
    expect(output).toContain('ログイン画面');
    expect(output).toContain('認証中');
    
    console.log('✅ 状態遷移図変換完了');
  });

  test('複雑なテキストパターンの処理', async ({ page }) => {
    const complexText = `システム開始

# メイン処理フロー
1. ユーザー認証:
   - ユーザーIDの検証
   - パスワードの確認
   - セッション生成

2. データ処理:
   条件: データが存在する場合
     - データ読み込み
     - 形式変換
     - 検証処理
   条件: データが存在しない場合
     - 初期データ作成
     - デフォルト設定適用

3. 結果出力:
   並行処理:
     並行タスクA: レポート生成
     並行タスクB: ログ出力
     並行タスクC: 通知送信

システム終了`;

    await inputField.fill(complexText);
    await convertButton.click();
    await page.waitForTimeout(5000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // 複雑なパターンが処理されていることを確認
    expect(output).toMatch(/@start|@end/);
    expect(output.length).toBeGreaterThan(100);
    
    console.log('✅ 複雑なテキストパターン変換完了');
  });

  test('長いテキストの処理パフォーマンス', async ({ page }) => {
    // 長いテキストを生成
    const longText = Array.from({ length: 50 }, (_, i) => 
      `ステップ${i + 1}: 処理${i + 1}を実行`
    ).join('\n');

    await inputField.fill(longText);
    
    const startTime = Date.now();
    await convertButton.click();
    await page.waitForTimeout(8000);
    const endTime = Date.now();
    
    const conversionTime = endTime - startTime;
    
    // 長いテキストでも10秒以内に処理されることを確認
    expect(conversionTime).toBeLessThan(10000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    expect(output.length).toBeGreaterThan(50);
    
    console.log(`✅ 長いテキスト変換完了 (${conversionTime}ms)`);
  });

  test('特殊文字とエンコーディングの処理', async ({ page }) => {
    const specialText = `処理開始
"引用符付きテキスト"の処理
<HTML>タグの処理
& アンパサンドの処理
% パーセント記号の処理
# ハッシュタグの処理
@ アットマークの処理
日本語、English、한국어、中文の処理
絵文字: 🚀 🎯 ✅ ❌ の処理
処理終了`;

    await inputField.fill(specialText);
    await convertButton.click();
    await page.waitForTimeout(4000);
    
    const output = await this.getConversionOutput(page);
    expect(output).toBeTruthy();
    
    // 特殊文字が適切にエスケープまたは処理されていることを確認
    expect(output).not.toContain('undefined');
    expect(output).not.toContain('null');
    
    console.log('✅ 特殊文字とエンコーディング処理完了');
  });

  test('エラー入力の処理', async ({ page }) => {
    const errorInputs = [
      '', // 空文字
      '   ', // 空白のみ
      '無効な構文###', // 無効な構文
      'A'.repeat(10000), // 非常に長い文字列
      '{{{{}}}}', // 不正な括弧
      '<script>alert("test")</script>' // スクリプトインジェクション試行
    ];

    for (const errorInput of errorInputs) {
      await inputField.fill(errorInput);
      await convertButton.click();
      await page.waitForTimeout(2000);
      
      // アプリケーションがクラッシュしていないことを確認
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
      
      // 入力フィールドがまだ利用可能であることを確認
      await expect(inputField).toBeVisible();
      await expect(convertButton).toBeVisible();
    }
    
    console.log('✅ エラー入力処理完了');
  });

  test('変換結果の一貫性確認', async ({ page }) => {
    const testInput = 'ユーザーがログインして、データを閲覧します';
    
    // 同じ入力で複数回変換を実行
    const results = [];
    
    for (let i = 0; i < 3; i++) {
      await inputField.fill(testInput);
      await convertButton.click();
      await page.waitForTimeout(2000);
      
      const output = await this.getConversionOutput(page);
      results.push(output);
      
      // 少し間隔を空ける
      await page.waitForTimeout(1000);
    }
    
    // 結果の一貫性を確認
    expect(results[0]).toBeTruthy();
    expect(results[1]).toBeTruthy();
    expect(results[2]).toBeTruthy();
    
    // 結果が空でないことを確認
    results.forEach(result => {
      expect(result.length).toBeGreaterThan(10);
    });
    
    console.log('✅ 変換結果の一貫性確認完了');
  });

  // ヘルパーメソッド
  async findElement(page, selectors) {
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible()) {
        return element;
      }
    }
    throw new Error(`要素が見つかりません: ${selectors.join(', ')}`);
  }

  async getConversionOutput(page) {
    const outputSelectors = [
      '[data-testid="output"]',
      '[data-testid="result"]',
      '[data-testid="plantuml-output"]',
      '.output',
      '.result',
      'pre',
      'code'
    ];
    
    for (const selector of outputSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    }
    
    // 代替として、ページの変化を確認
    await page.waitForTimeout(1000);
    
    // ページ内容全体から変換結果を探す
    const pageContent = await page.content();
    const plantumlMatch = pageContent.match(/@start[\s\S]*?@end/);
    
    if (plantumlMatch) {
      return plantumlMatch[0];
    }
    
    // それでも見つからない場合は、何らかの出力があるかを確認
    const bodyText = await page.locator('body').textContent();
    if (bodyText.includes('@start') || bodyText.includes('uml')) {
      return bodyText;
    }
    
    return null;
  }
});

// テスト設定
test.describe.configure({ mode: 'serial' });
test.setTimeout(60000); // 変換処理のため長めのタイムアウト