/**
 * Foundation Basic Tests
 * Sprint2 E2E Test Framework Foundation
 */

import { test, expect } from '@playwright/test';
import { EditorPage } from '../../../page-objects/EditorPage.js';
import { TestHelper } from '../../../helpers/test-helper.js';
import { TestData } from '../../../fixtures/testData.js';

test.describe('Foundation Framework Tests', () => {
  let editorPage;
  let testHelper;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    testHelper = new TestHelper(page);
    
    await testHelper.startErrorMonitoring();
    await editorPage.navigateToEditor();
  });

  test.afterEach(async ({ page }) => {
    const errors = testHelper.getErrors();
    if (errors.console.length > 0 || errors.javascript.length > 0) {
      console.warn('Test completed with errors:', errors);
    }
    
    await editorPage.cleanupEditor();
  });

  test('should load PlantUML Editor successfully', async () => {
    // ページタイトルの確認
    await expect(editorPage.page).toHaveTitle(/PlantUML/);
    
    // 基本要素の存在確認
    await editorPage.assertElementExists(editorPage.selectors.japaneseInput);
    await editorPage.assertElementExists(editorPage.selectors.plantUMLOutput);
    
    // JavaScriptオブジェクトの初期化確認
    const isInitialized = await editorPage.page.evaluate(() => {
      return window.PlantUMLParser && window.RealtimeSyncManager;
    });
    expect(isInitialized).toBeTruthy();
  });

  test('should perform basic Japanese to PlantUML conversion', async () => {
    const testCase = TestData.basicConversions.simple;
    
    const output = await editorPage.testJapaneseToPlantUMLConversion(
      testCase.japanese,
      testCase.expectedContains
    );
    
    // PlantUML構造の確認
    expect(output).toContain('@startuml');
    expect(output).toContain('@enduml');
    
    // 入力内容の保持確認
    expect(output).toContain(testCase.japanese);
  });

  test('should handle different Japanese character types', async () => {
    const characterResults = await editorPage.testCharacterTypeHandling();
    
    // すべての文字種別が正常に処理されることを確認
    for (const result of characterResults) {
      expect(result.preserved).toBeTruthy();
      expect(result.hasStructure).toBeTruthy();
    }
  });

  test('should meet realtime sync performance requirements', async () => {
    const performanceTest = await editorPage.measureSyncPerformance(
      'パフォーマンステスト用の入力文字列'
    );
    
    // 100ms以下の同期時間を要求
    expect(performanceTest.syncTime).toBeLessThan(100);
    expect(performanceTest.acceptable).toBeTruthy();
  });

  test('should handle multiple diagram types correctly', async () => {
    const diagramResults = await editorPage.testDiagramTypes();
    
    // すべての図表タイプが正常に処理されることを確認
    for (const result of diagramResults) {
      expect(result.success).toBeTruthy();
      if (result.output) {
        expect(result.output).toContain('@startuml');
        expect(result.output).toContain('@enduml');
      }
    }
  });

  test('should preserve Japanese text in output', async () => {
    const testCases = [
      TestData.characterTypes.hiragana,
      TestData.characterTypes.katakana,
      TestData.characterTypes.kanji,
      TestData.characterTypes.mixed
    ];
    
    for (const testCase of testCases) {
      const output = await testHelper.testJapaneseToPlantUMLConversion(
        testCase.input,
        [testCase.input]
      );
      
      // 日本語文字が保持されていることを確認
      expect(output).toContain(testCase.input);
    }
  });

  test('should handle empty input gracefully', async () => {
    await editorPage.inputJapaneseText('');
    await editorPage.wait(500);
    
    const output = await editorPage.getPlantUMLOutput();
    
    // 空入力でもエラーが発生しないことを確認
    const errors = testHelper.getErrors();
    expect(errors.console.length).toBe(0);
    expect(errors.javascript.length).toBe(0);
  });

  test('should maintain sync consistency under rapid input changes', async () => {
    const rapidInputs = [
      'テスト1',
      'テスト2',
      'テスト3',
      'テスト4',
      'テスト5'
    ];
    
    // 高速連続入力
    for (const input of rapidInputs) {
      await editorPage.inputJapaneseText(input);
      await editorPage.wait(50); // 50ms間隔
    }
    
    // 最終同期の待機
    await editorPage.wait(500);
    
    const finalOutput = await editorPage.getPlantUMLOutput();
    
    // 最後の入力が反映されていることを確認
    expect(finalOutput).toContain('テスト5');
    expect(finalOutput).toContain('@startuml');
    expect(finalOutput).toContain('@enduml');
  });

  test('should work across different screen sizes', async () => {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 },  // Laptop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await editorPage.page.setViewportSize(viewport);
      
      // エディターが適切に表示されることを確認
      await editorPage.assertElementExists(editorPage.selectors.japaneseInput);
      await editorPage.assertElementExists(editorPage.selectors.plantUMLOutput);
      
      // 基本的な変換機能が動作することを確認
      const output = await editorPage.testRealtimeSync('レスポンシブテスト');
      expect(output).toContain('@startuml');
      expect(output).toContain('レスポンシブテスト');
    }
  });

  test('should handle browser refresh gracefully', async () => {
    // 初期入力
    await editorPage.inputJapaneseText('ブラウザリフレッシュテスト');
    
    // ページリフレッシュ
    await editorPage.page.reload();
    await editorPage.waitForEditorInitialization();
    
    // エディターが正常に再初期化されることを確認
    await editorPage.assertElementExists(editorPage.selectors.japaneseInput);
    await editorPage.assertElementExists(editorPage.selectors.plantUMLOutput);
    
    // 機能が正常に動作することを確認
    const output = await editorPage.testRealtimeSync('リフレッシュ後テスト');
    expect(output).toContain('@startuml');
    expect(output).toContain('リフレッシュ後テスト');
  });
});

test.describe('Framework Integration Tests', () => {
  let editorPage;
  let testHelper;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    testHelper = new TestHelper(page);
    
    await editorPage.navigateToEditor();
  });

  test('should integrate with test data factory correctly', async () => {
    const { TestDataFactory } = await import('../../../fixtures/testData.js');
    
    // ランダムテストデータの生成
    const randomText = TestDataFactory.generateRandomJapaneseText(10);
    expect(randomText).toHaveLength(10);
    
    // 生成されたデータでのテスト
    const output = await editorPage.testRealtimeSync(randomText);
    expect(output).toContain('@startuml');
    expect(output).toContain(randomText);
  });

  test('should work with test helper utilities', async () => {
    // パフォーマンス測定のテスト
    const performanceTime = await testHelper.measurePerformance(async () => {
      await editorPage.inputJapaneseText('パフォーマンステスト');
      await editorPage.wait(100);
    });
    
    expect(typeof performanceTime).toBe('number');
    expect(performanceTime).toBeGreaterThan(0);
  });

  test('should support screenshot capture', async () => {
    await editorPage.inputJapaneseText('スクリーンショットテスト');
    
    // スクリーンショット取得
    const screenshot = await testHelper.takeScreenshot('foundation-test');
    expect(screenshot).toBeTruthy();
  });

  test('should validate page object model functionality', async () => {
    // BasePage機能のテスト
    const browserInfo = await editorPage.getBrowserInfo();
    expect(browserInfo).toHaveProperty('userAgent');
    expect(browserInfo).toHaveProperty('platform');
    
    // EditorPage固有機能のテスト
    await editorPage.inputJapaneseText('POMLテスト');
    const output = await editorPage.getPlantUMLOutput();
    expect(output).toContain('POMLテスト');
  });
});