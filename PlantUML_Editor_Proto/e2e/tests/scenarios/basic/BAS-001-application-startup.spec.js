import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * BAS-001: アプリケーション起動テスト
 * 目的: アプリケーションが正常に起動し、基本UIが表示されることを確認
 * 期待結果: 3秒以内に起動完了、全要素の正常表示
 */

test.describe('BAS-001: アプリケーション起動テスト', () => {
  let editorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new PlantUMLEditorPage(page);
    
    // パフォーマンス監視開始
    await editorPage.startConsoleMonitoring();
    await editorPage.startNetworkMonitoring();
  });

  test.afterEach(async () => {
    // エラーチェック
    const consoleErrors = editorPage.getConsoleErrors();
    const networkErrors = editorPage.getNetworkErrors();
    
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }
    
    if (networkErrors.length > 0) {
      console.warn('Network errors detected:', networkErrors);
    }
    
    await editorPage.cleanup();
  });

  test('アプリケーション基本起動確認', async () => {
    const startTime = Date.now();
    
    // アプリケーションを開く
    await editorPage.open();
    
    const loadTime = Date.now() - startTime;
    
    // 起動時間の検証（3秒以内）
    expect(loadTime).toBeLessThan(3000);
    
    // ページタイトルの確認
    const title = await editorPage.getTitle();
    expect(title).toContain('PlantUML');
    
    // 基本要素の存在確認
    expect(await editorPage.isVisible(editorPage.selectors.japaneseInput)).toBe(true);
    expect(await editorPage.isVisible(editorPage.selectors.plantumlEditor)).toBe(true);
    expect(await editorPage.isVisible(editorPage.selectors.previewArea)).toBe(true);
    
    // ボタンの存在確認
    expect(await editorPage.isVisible(editorPage.selectors.convertButton)).toBe(true);
    expect(await editorPage.isVisible(editorPage.selectors.saveButton)).toBe(true);
    expect(await editorPage.isVisible(editorPage.selectors.loadButton)).toBe(true);
    
    // パフォーマンスメトリクスの取得
    const metrics = await editorPage.getPerformanceMetrics();
    
    // DOMContentLoadedが3秒以内
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    
    // First Paintが2秒以内
    if (metrics.firstPaint) {
      expect(metrics.firstPaint).toBeLessThan(2000);
    }
    
    console.log('起動パフォーマンス:', {
      loadTime,
      ...metrics
    });
  });

  test('UI要素の初期状態確認', async () => {
    await editorPage.open();
    
    // 入力エリアが空であることを確認
    const japaneseText = await editorPage.getJapaneseText();
    expect(japaneseText).toBe('');
    
    const plantumlCode = await editorPage.getPlantUMLCode();
    expect(plantumlCode).toBe('');
    
    // ボタンの有効状態確認
    expect(await editorPage.isEnabled(editorPage.selectors.convertButton)).toBe(true);
    expect(await editorPage.isEnabled(editorPage.selectors.clearButton)).toBe(true);
    
    // プレビューエリアの初期状態
    const previewContent = await editorPage.getPreviewContent();
    // 初期状態では空またはプレースホルダーが表示される
    expect(previewContent).toBeDefined();
  });

  test('レスポンシブデザイン確認', async ({ page }) => {
    // デスクトップサイズでの確認
    await page.setViewportSize({ width: 1920, height: 1080 });
    await editorPage.open();
    
    // 全要素が表示されることを確認
    expect(await editorPage.isVisible(editorPage.selectors.japaneseInput)).toBe(true);
    expect(await editorPage.isVisible(editorPage.selectors.plantumlEditor)).toBe(true);
    expect(await editorPage.isVisible(editorPage.selectors.previewArea)).toBe(true);
    
    // タブレットサイズでの確認
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // レイアウト調整待機
    
    // 主要要素が引き続き表示されることを確認
    expect(await editorPage.isVisible(editorPage.selectors.japaneseInput)).toBe(true);
    expect(await editorPage.isVisible(editorPage.selectors.plantumlEditor)).toBe(true);
    
    // モバイルサイズでの確認
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // レイアウト調整待機
    
    // モバイルでも基本機能が利用可能であることを確認
    expect(await editorPage.isVisible(editorPage.selectors.japaneseInput)).toBe(true);
  });

  test('ブラウザ互換性確認', async ({ browserName }) => {
    await editorPage.open();
    
    // ブラウザ固有の機能確認
    const compatibilityData = await editorPage.getBrowserCompatibilityData();
    
    // 必要な機能がサポートされていることを確認
    expect(compatibilityData.features.svg).toBe(true);
    expect(compatibilityData.features.canvas).toBe(true);
    expect(compatibilityData.features.localStorage).toBe(true);
    expect(compatibilityData.features.sessionStorage).toBe(true);
    
    // ブラウザ固有の確認
    switch (browserName) {
      case 'chromium':
        expect(compatibilityData.userAgent).toContain('Chrome');
        break;
      case 'firefox':
        expect(compatibilityData.userAgent).toContain('Firefox');
        break;
      case 'webkit':
        expect(compatibilityData.userAgent).toContain('Safari');
        break;
    }
    
    console.log(`${browserName} 互換性データ:`, compatibilityData);
  });

  test('エラーフリー起動確認', async () => {
    await editorPage.open();
    
    // コンソールエラーがないことを確認
    const consoleErrors = editorPage.getConsoleErrors();
    expect(consoleErrors).toHaveLength(0);
    
    // ネットワークエラーがないことを確認
    const networkErrors = editorPage.getNetworkErrors();
    expect(networkErrors).toHaveLength(0);
    
    // JavaScriptが正常に実行されていることを確認
    const isScriptLoaded = await editorPage.evaluate(() => {
      return typeof window.PlantUMLParser !== 'undefined' &&
             typeof window.RealtimeSyncManager !== 'undefined';
    });
    
    expect(isScriptLoaded).toBe(true);
  });

  test('メモリ使用量確認', async () => {
    await editorPage.open();
    
    const initialMemory = await editorPage.getMemoryUsage();
    
    if (initialMemory) {
      // 初期メモリ使用量が妥当であることを確認（100MB以下）
      expect(initialMemory.used).toBeLessThan(100 * 1024 * 1024);
      
      console.log('初期メモリ使用量:', {
        used: Math.round(initialMemory.used / 1024 / 1024) + 'MB',
        total: Math.round(initialMemory.total / 1024 / 1024) + 'MB'
      });
    }
  });

  test('初期設定読み込み確認', async () => {
    await editorPage.open();
    
    // ローカルストレージの設定確認
    const settings = await editorPage.evaluate(() => {
      return {
        testMode: localStorage.getItem('e2e-test-mode'),
        userPreferences: localStorage.getItem('user-preferences')
      };
    });
    
    expect(settings.testMode).toBe('true');
    expect(settings.userPreferences).toBeDefined();
    
    // セッションストレージの確認
    const sessionData = await editorPage.evaluate(() => {
      return sessionStorage.length;
    });
    
    expect(sessionData).toBeGreaterThanOrEqual(0);
  });

  test('アクセシビリティ基本確認', async ({ page }) => {
    await editorPage.open();
    
    // フォーカス可能な要素の確認
    const focusableElements = await page.locator('button, input, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();
    
    expect(count).toBeGreaterThan(0);
    
    // キーボードナビゲーションの基本確認
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(focusedElement).toBeDefined();
    
    // ARIA属性の基本確認
    const ariaLabels = await page.locator('[aria-label]');
    const ariaLabelCount = await ariaLabels.count();
    
    // 主要な入力要素にはaria-labelが設定されていることを期待
    expect(ariaLabelCount).toBeGreaterThan(0);
  });
});