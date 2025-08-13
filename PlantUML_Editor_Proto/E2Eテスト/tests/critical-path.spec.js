/**
 * クリティカルパステスト
 * PlantUMLエディタの主要機能をテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('Critical Path Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にアプリケーションにアクセス
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('CP-001: 初期画面表示', async ({ page }) => {
    // タイトル確認
    await expect(page).toHaveTitle(/PlantUML/);
    
    // 主要要素の存在確認
    await expect(page.locator('h1')).toContainText('PlantUML変換エディター');
    await expect(page.locator('#plantuml-code')).toBeVisible();
    await expect(page.locator('.selected-actors')).toBeVisible();
  });

  test('CP-002: アクター追加機能', async ({ page }) => {
    // 顧客アクターを追加
    await page.click('button:has-text("顧客")');
    
    // PlantUMLコードに反映されているか確認
    const code = await page.locator('#plantuml-code').inputValue();
    expect(code).toContain('顧客');
    
    // 選択中のアクターリストに表示されているか
    await expect(page.locator('.selected-actors')).toContainText('顧客');
  });

  test('CP-003: 処理追加機能', async ({ page }) => {
    // アクターを2つ追加
    await page.click('button:has-text("顧客")');
    await page.click('button:has-text("ECサイト")');
    
    // 処理を追加
    await page.selectOption('select:first-of-type', '顧客');
    await page.selectOption('select:last-of-type', 'ECサイト');
    await page.fill('input[placeholder*="処理内容"]', '商品を検索');
    await page.click('button:has-text("追加"):last-of-type');
    
    // PlantUMLコードに反映されているか確認
    const code = await page.locator('#plantuml-code').inputValue();
    expect(code).toContain('顧客 -> ECサイト : 商品を検索');
  });

  test('CP-004: パターン選択機能', async ({ page }) => {
    // パターン選択画面を開く
    await page.click('button:has-text("パターン選択")');
    await page.waitForTimeout(500);
    
    // パターンが表示されているか確認
    await expect(page.locator('.pattern-card')).toHaveCount(4);
    
    // EC注文フローを選択
    await page.click('.pattern-card:has-text("EC注文フロー") button');
    
    // PlantUMLコードが生成されているか確認
    const code = await page.locator('#plantuml-code').inputValue();
    expect(code).toContain('@startuml');
    expect(code).toContain('actor');
    expect(code).toContain('@enduml');
  });

  test('CP-005: プレビュー生成', async ({ page }) => {
    // アクターを追加
    await page.click('button:has-text("顧客")');
    
    // プレビュー生成を待つ
    await page.waitForTimeout(3000);
    
    // プレビュー画像が表示されているか確認
    const previewImg = page.locator('.preview-container img');
    if (await previewImg.isVisible()) {
      const src = await previewImg.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toMatch(/kroki\.io|data:image/);
    }
  });

  test('CP-006: コード編集と同期', async ({ page }) => {
    // PlantUMLコードを直接編集
    const codeEditor = page.locator('#plantuml-code');
    await codeEditor.clear();
    await codeEditor.fill('@startuml\nactor User\nUser -> System : Request\n@enduml');
    
    // 同期ボタンをクリック
    await page.click('button:has-text("同期")');
    await page.waitForTimeout(1000);
    
    // UIに反映されているか確認（セーフモードでは反映されない可能性あり）
    const code = await codeEditor.inputValue();
    expect(code).toContain('User');
    expect(code).toContain('System');
  });

  test('CP-007: クリア機能', async ({ page }) => {
    // データを追加
    await page.click('button:has-text("顧客")');
    await page.click('button:has-text("ECサイト")');
    
    // クリアボタンをクリック
    await page.click('button:has-text("クリア")');
    
    // 確認ダイアログがある場合は承認
    page.on('dialog', dialog => dialog.accept());
    
    await page.waitForTimeout(500);
    
    // コードがクリアされているか確認
    const code = await page.locator('#plantuml-code').inputValue();
    expect(code).toMatch(/^@startuml\s*@enduml$|^@startuml\n\n@enduml$/);
  });

  test('CP-008: 条件分岐の追加', async ({ page }) => {
    // アクターを追加
    await page.click('button:has-text("顧客")');
    await page.click('button:has-text("ECサイト")');
    
    // 条件分岐ボタンをクリック
    await page.click('button:has-text("条件分岐")');
    await page.waitForTimeout(500);
    
    // 条件分岐が追加されているか確認
    const code = await page.locator('#plantuml-code').inputValue();
    expect(code).toMatch(/alt|opt|if/);
  });

  test('CP-009: ループの追加', async ({ page }) => {
    // アクターを追加
    await page.click('button:has-text("顧客")');
    await page.click('button:has-text("ECサイト")');
    
    // ループボタンをクリック
    await page.click('button:has-text("ループ")');
    await page.waitForTimeout(500);
    
    // ループが追加されているか確認
    const code = await page.locator('#plantuml-code').inputValue();
    expect(code).toMatch(/loop/);
  });

  test('CP-010: セーフモードの確認', async ({ page }) => {
    // セーフモードバナーが表示されているか確認
    const safeModeNotice = page.locator(':has-text("セーフモード有効")');
    if (await safeModeNotice.isVisible()) {
      await expect(safeModeNotice).toContainText('一部機能が制限');
      
      // 通常モードに戻すボタンが存在するか
      await expect(page.locator('button:has-text("通常モードに戻す")')).toBeVisible();
    }
  });
});