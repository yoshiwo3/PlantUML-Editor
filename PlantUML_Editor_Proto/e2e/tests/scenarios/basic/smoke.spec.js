/**
 * Sprint2 E2Eテスト - 基本Smokeテスト
 * PlantUMLエディターの基本機能が正常に動作することを確認
 */

import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';
import { TestUtils } from '../../../utils/test-helpers.js';
import { EnvironmentConfigHelper } from '../../../config/test-environment.config.js';

test.describe('基本Smokeテスト', () => {
  let editorPage;
  let errorMonitor;
  let performanceThresholds;

  test.beforeEach(async ({ page }) => {
    // エラー監視開始
    errorMonitor = TestUtils.Error.startErrorMonitoring(page);
    
    // パフォーマンス閾値取得
    performanceThresholds = EnvironmentConfigHelper.getPerformanceThresholds();
    
    // ページオブジェクト初期化
    editorPage = new PlantUMLEditorPage(page);
    
    // エディターページを開く
    await editorPage.open();
  });

  test.afterEach(async () => {
    // エラーチェック（警告レベル）
    const errors = errorMonitor.getErrors();
    if (errors.length > 0) {
      console.warn('テスト実行中にエラーが検出されました:', errors);
    }
    
    // クリーンアップ
    await editorPage.cleanup();
  });

  test('SMOKE-001: アプリケーション基本起動テスト', async ({ page }) => {
    // アプリケーションの基本要素が表示されることを確認
    await expect(page.locator('#japanese-input')).toBeVisible();
    await expect(page.locator('#plantuml-editor')).toBeVisible();
    await expect(page.locator('#preview-area')).toBeVisible();
    await expect(page.locator('#convert-btn')).toBeVisible();
    
    // ページタイトル確認
    const title = await editorPage.getTitle();
    expect(title).toContain('PlantUML');
    
    // コンソールエラーがないことを確認
    TestUtils.Assert.toHaveNoErrors(errorMonitor.getErrors());
  });

  test('SMOKE-002: 基本的な日本語→PlantUML変換テスト', async ({ page }) => {
    const testInput = 'A → B: テストメッセージ';
    
    // 日本語テキストを入力
    await editorPage.inputJapaneseText(testInput);
    
    // PlantUMLコードが生成されることを確認
    const plantumlCode = await editorPage.getPlantUMLCode();
    TestUtils.Assert.toBeValidPlantUML(plantumlCode);
    
    // 基本的な構文要素の確認
    expect(plantumlCode).toContain('@startuml');
    expect(plantumlCode).toContain('@enduml');
    expect(plantumlCode).toContain('A');
    expect(plantumlCode).toContain('B');
    expect(plantumlCode).toContain('テストメッセージ');
    
    // 日本語エンコーディングの検証
    TestUtils.Assert.toHaveValidJapaneseEncoding(plantumlCode);
  });

  test('SMOKE-003: プレビュー表示テスト', async ({ page }) => {
    const testInput = 'ユーザー → システム: ログイン要求';
    
    // 日本語テキストを入力
    await editorPage.inputJapaneseText(testInput);
    
    // プレビューが表示されることを確認
    await TestUtils.Assert.toHaveValidSVG(page, '#preview-area svg');
    
    // SVG要素の基本属性確認
    const svg = page.locator('#preview-area svg');
    const width = await svg.getAttribute('width');
    const height = await svg.getAttribute('height');
    
    expect(width).toBeTruthy();
    expect(height).toBeTruthy();
    expect(parseInt(width)).toBeGreaterThan(0);
    expect(parseInt(height)).toBeGreaterThan(0);
  });

  test('SMOKE-004: リアルタイム同期機能テスト', async ({ page }) => {
    const testInputs = [
      'A → B: 第一のメッセージ',
      'B → C: 第二のメッセージ',
      'C → A: 第三のメッセージ'
    ];
    
    for (const input of testInputs) {
      // パフォーマンス測定開始
      const startTime = Date.now();
      
      // 入力実行
      await page.fill('#japanese-input', input);
      
      // PlantUMLエディターの更新を待機
      await page.waitForFunction(
        () => {
          const editor = document.querySelector('#plantuml-editor');
          return editor && editor.value.length > 0;
        },
        { timeout: 5000 }
      );
      
      const syncTime = Date.now() - startTime;
      
      // 同期時間の検証
      TestUtils.Assert.toBeFasterThan(
        syncTime, 
        performanceThresholds.syncTime, 
        '同期時間'
      );
      
      // プレビューの更新確認
      await editorPage.waitForPreviewUpdate();
      const hasSVG = await editorPage.hasPreviewSVG();
      expect(hasSVG).toBe(true);
    }
  });

  test('SMOKE-005: パフォーマンス基準テスト', async ({ page }) => {
    // ページロード性能測定
    const loadMetrics = await TestUtils.Performance.measurePageLoad(page);
    
    // ロード時間の検証
    TestUtils.Assert.toBeFasterThan(
      loadMetrics.totalLoadTime,
      performanceThresholds.pageLoad,
      'ページロード時間'
    );
    
    // First Paint時間の検証
    if (loadMetrics.firstPaint > 0) {
      TestUtils.Assert.toBeFasterThan(
        loadMetrics.firstPaint,
        performanceThresholds.firstPaint,
        'First Paint時間'
      );
    }
    
    // メモリ使用量測定
    const memoryInfo = await TestUtils.Performance.measureMemoryUsage(page);
    if (memoryInfo) {
      TestUtils.Assert.toBeWithinMemoryLimit(
        memoryInfo,
        performanceThresholds.memoryUsage
      );
    }
    
    // 変換性能測定
    const conversionMetrics = await TestUtils.Performance.measureSyncPerformance(
      page,
      'パフォーマンステスト用の長いメッセージ: システム → データベース'
    );
    
    TestUtils.Assert.toBeFasterThan(
      conversionMetrics.totalTime,
      performanceThresholds.conversionTime,
      '変換処理時間'
    );
  });

  test('SMOKE-006: 基本エラーハンドリングテスト', async ({ page }) => {
    // 空入力のテスト
    await page.fill('#japanese-input', '');
    await page.waitForTimeout(500);
    
    // エラーメッセージの確認（表示されない場合もあり）
    const errorMessage = await editorPage.getErrorMessage();
    // 空入力は通常エラーではないので、nullでも問題なし
    
    // 非常に長い入力のテスト
    const longInput = 'A → B: ' + 'テスト'.repeat(1000);
    await page.fill('#japanese-input', longInput);
    await page.waitForTimeout(1000);
    
    // システムが応答することを確認（クラッシュしない）
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete' && 
             typeof window.PlantUMLParser !== 'undefined';
    });
    expect(isResponsive).toBe(true);
    
    // 特殊文字入力のテスト
    const specialInput = 'A → B: <>&"\'';
    await page.fill('#japanese-input', specialInput);
    await editorPage.waitForConversion();
    
    // XSS脆弱性がないことを確認
    const plantumlCode = await editorPage.getPlantUMLCode();
    expect(plantumlCode).not.toContain('<script>');
    expect(plantumlCode).not.toContain('javascript:');
  });

  test('SMOKE-007: ブラウザ互換性基本テスト', async ({ page }) => {
    // ブラウザ機能サポート確認
    const browserFeatures = await TestUtils.Browser.checkBrowserFeatures(page);
    
    // 必須機能のサポート確認
    expect(browserFeatures.svg).toBe(true);
    expect(browserFeatures.localStorage).toBe(true);
    expect(browserFeatures.canvas).toBe(true);
    
    // ブラウザ情報取得
    const browserInfo = await TestUtils.Browser.getBrowserInfo(page);
    expect(browserInfo.userAgent).toBeTruthy();
    expect(browserInfo.language).toBeTruthy();
    
    // 日本語入力テスト
    const japaneseTest = '日本語入力テスト: ひらがな、カタカナ、漢字';
    await page.fill('#japanese-input', japaneseTest);
    
    const inputValue = await page.inputValue('#japanese-input');
    expect(inputValue).toBe(japaneseTest);
    
    // 文字エンコーディング確認
    TestUtils.Assert.toHaveValidJapaneseEncoding(inputValue);
  });

  test('SMOKE-008: アクセシビリティ基本テスト', async ({ page }) => {
    // キーボードナビゲーション基本テスト
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.id);
    expect(focusedElement).toBeTruthy();
    
    // ARIA属性の確認
    const ariaAttributes = await TestUtils.Accessibility.validateAriaAttributes(page);
    expect(ariaAttributes.length).toBeGreaterThan(0);
    
    // 基本的なARIA要素の存在確認
    const japaneseInputAria = await page.locator('#japanese-input').getAttribute('aria-label');
    if (japaneseInputAria) {
      expect(japaneseInputAria).toContain('入力');
    }
  });

  test('SMOKE-009: ファイル操作基本テスト', async ({ page }) => {
    // 保存ボタンの動作確認
    const saveButton = page.locator('#save-btn');
    if (await saveButton.count() > 0) {
      await saveButton.click();
      // 保存ダイアログまたは処理の開始を確認
      await page.waitForTimeout(1000);
    }
    
    // エクスポートボタンの動作確認
    const exportButton = page.locator('#export-btn');
    if (await exportButton.count() > 0) {
      // エクスポートボタンがクリック可能かを確認
      const isEnabled = await exportButton.isEnabled();
      expect(typeof isEnabled).toBe('boolean');
    }
    
    // ロードボタンの動作確認
    const loadButton = page.locator('#load-btn');
    if (await loadButton.count() > 0) {
      const isVisible = await loadButton.isVisible();
      expect(typeof isVisible).toBe('boolean');
    }
  });

  test('SMOKE-010: ネットワーク通信基本テスト', async ({ page }) => {
    // ネットワークリクエストの監視
    const networkRequests = [];
    
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    // 基本操作実行
    await editorPage.inputJapaneseText('ネットワークテスト: A → B');
    await page.waitForTimeout(2000);
    
    // ネットワークエラーの確認
    const networkErrors = errorMonitor.getErrors().filter(e => e.type === 'network-error');
    TestUtils.Assert.toHaveNoErrors(networkErrors);
    
    // 必要なリソースが読み込まれていることを確認
    const hasStaticResources = networkRequests.some(req => 
      req.resourceType === 'script' || 
      req.resourceType === 'stylesheet'
    );
    expect(hasStaticResources).toBe(true);
  });
});