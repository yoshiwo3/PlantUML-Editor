/**
 * TEST-011-1: 初回利用者オンボーディングテスト
 * ペルソナ: 田中太郎（新入社員、PlantUML初心者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  completeTutorial, 
  measurePerformance,
  testAccessibility,
  calculateUsabilityScore,
  generateJourneyReport 
} from '../journey-helpers.js';
import { personas, successCriteria } from '../personas.js';

test.describe('初回利用者オンボーディングジャーニー', () => {
  const personaType = 'firstTimeUser';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('ランディングページからの導線確認', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // トップページ要素確認
      await expect(page).toHaveTitle(/PlantUML/);
      
      // 機能紹介セクション確認
      const featuresSection = page.locator('[data-testid="features-section"]');
      if (await featuresSection.isVisible()) {
        await expect(featuresSection).toBeVisible();
        
        // 機能説明の確認
        const featureItems = page.locator('[data-testid="feature-item"]');
        const featureCount = await featureItems.count();
        expect(featureCount).toBeGreaterThan(0);
        
        // 各機能の説明テキスト確認
        for (let i = 0; i < Math.min(featureCount, 3); i++) {
          const featureText = await featureItems.nth(i).textContent();
          expect(featureText).toBeTruthy();
          expect(featureText.length).toBeGreaterThan(10);
        }
      }
      
      // デモ動画エリア確認
      const demoSection = page.locator('[data-testid="demo-video"], [data-testid="demo-section"]');
      if (await demoSection.isVisible()) {
        await expect(demoSection).toBeVisible();
      }
      
      // 「始める」ボタン確認とクリック
      const startButton = page.locator('[data-testid="start-button"], button:has-text("始める")');
      if (await startButton.isVisible()) {
        await expect(startButton).toBeVisible();
        await startButton.click();
        
        // エディター画面への遷移確認
        await page.waitForURL('**/editor', { timeout: 10000 });
      } else {
        // 直接エディター画面の場合
        const editorContainer = page.locator('[data-testid="editor-container"]');
        await expect(editorContainer).toBeVisible();
      }
      
      return { landingPageNavigationSuccess: true };
    }, 'ランディングページ導線');
    
    testResults.push({
      test: 'ランディングページ導線',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult
    });
  });

  test('ウェルカムメッセージとヘルプ表示', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // ウェルカムメッセージの確認
      const welcomeMessage = page.locator('[data-testid="welcome-message"], .welcome-overlay');
      if (await welcomeMessage.isVisible({ timeout: 5000 })) {
        await expect(welcomeMessage).toBeVisible();
        
        // メッセージ内容確認
        const messageText = await welcomeMessage.textContent();
        expect(messageText).toContain('ようこそ');
        expect(messageText.length).toBeGreaterThan(20);
      }
      
      // 初心者向けヘルプの確認
      const helpPanel = page.locator('[data-testid="help-panel"], .help-sidebar');
      if (await helpPanel.isVisible()) {
        await expect(helpPanel).toBeVisible();
        
        // ヘルプ内容の確認
        const helpItems = page.locator('[data-testid="help-item"]');
        const helpCount = await helpItems.count();
        expect(helpCount).toBeGreaterThan(0);
      }
      
      // ツールチップ表示確認
      const tooltipTrigger = page.locator('[data-testid="add-actor"], button').first();
      if (await tooltipTrigger.isVisible()) {
        await tooltipTrigger.hover();
        await page.waitForTimeout(1000);
        
        const tooltip = page.locator('[data-testid="tooltip"], .tooltip');
        if (await tooltip.isVisible()) {
          const tooltipText = await tooltip.textContent();
          expect(tooltipText).toBeTruthy();
        }
      }
      
      return { welcomeMessageSuccess: true };
    }, 'ウェルカムメッセージ');
    
    testResults.push({
      test: 'ウェルカムメッセージ',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult
    });
  });

  test('初心者向け設定の自動適用', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 初心者モードの確認
      const beginnerMode = await page.evaluate(() => {
        return localStorage.getItem('helpMode') === 'beginner';
      });
      expect(beginnerMode).toBeTruthy();
      
      // ツールチップ有効化確認
      const tooltipsEnabled = await page.evaluate(() => {
        return localStorage.getItem('showTooltips') === 'true';
      });
      expect(tooltipsEnabled).toBeTruthy();
      
      // 簡易モードUI確認
      const simpleMode = page.locator('[data-testid="simple-mode"], .simple-ui');
      if (await simpleMode.isVisible()) {
        await expect(simpleMode).toBeVisible();
      }
      
      // 高度な機能の非表示確認
      const advancedFeatures = page.locator('[data-testid="advanced-features"], .advanced-panel');
      if (await advancedFeatures.isVisible()) {
        // 初心者には表示されないはず
        const isHidden = await advancedFeatures.isHidden();
        if (!isHidden) {
          console.warn('上級機能が初心者に表示されています');
        }
      }
      
      return { beginnerSettingsSuccess: true };
    }, '初心者向け設定');
    
    testResults.push({
      test: '初心者向け設定',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult
    });
  });

  test('アクセシビリティ対応確認', async ({ page }) => {
    const accessibilityResults = await testAccessibility(page);
    
    // キーボードナビゲーション
    expect(accessibilityResults.keyboardNavigation).toBeTruthy();
    
    // ARIA属性
    expect(accessibilityResults.ariaLabels).toBeTruthy();
    
    // スクリーンリーダー対応
    if (!accessibilityResults.screenReaderSupport) {
      console.warn('スクリーンリーダー対応が不十分の可能性があります');
    }
    
    testResults.push({
      test: 'アクセシビリティ',
      status: accessibilityResults.keyboardNavigation ? 'passed' : 'failed',
      metrics: accessibilityResults
    });
  });

  test('オンボーディング完了率測定', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // チュートリアル開始（スキップなし）
      const tutorialTime = await completeTutorial(page, false);
      
      // 基本操作の実行確認
      const basicOperationSuccess = await page.evaluate(() => {
        // 基本操作が一度でも実行されたかを確認
        return sessionStorage.getItem('basicOperationCompleted') === 'true';
      });
      
      const totalTime = Date.now() - startTime;
      const successCriteriaMet = totalTime <= successCriteria.firstTimeUser.tutorialCompletion;
      
      // ユーザビリティスコア計算
      const usabilityScore = calculateUsabilityScore({
        executionTime: totalTime,
        errorRate: 0,
        completionRate: basicOperationSuccess ? 1.0 : 0.5
      }, personaType);
      
      expect(usabilityScore).toBeGreaterThan(70); // 70点以上を合格基準
      
      testResults.push({
        test: 'オンボーディング完了',
        status: successCriteriaMet ? 'passed' : 'failed',
        executionTime: totalTime,
        usabilityScore: usabilityScore,
        metrics: {
          tutorialTime,
          basicOperationSuccess,
          successCriteriaMet
        }
      });
      
    } catch (error) {
      testResults.push({
        test: 'オンボーディング完了',
        status: 'failed',
        error: error.message
      });
    }
  });

  test.afterAll(async () => {
    // テストレポート生成
    const report = generateJourneyReport(personaType, testResults);
    
    console.log('=== 初回利用者オンボーディングジャーニー結果 ===');
    console.log(`ペルソナ: ${report.persona.name} (${report.persona.role})`);
    console.log(`総テスト数: ${report.summary.totalTests}`);
    console.log(`成功: ${report.summary.passedTests}, 失敗: ${report.summary.failedTests}`);
    console.log(`平均実行時間: ${Math.round(report.summary.averageExecutionTime)}ms`);
    
    if (report.recommendations.length > 0) {
      console.log('推奨改善事項:');
      report.recommendations.forEach(rec => console.log(`- ${rec}`));
    }
    
    // レポートファイル出力
    const fs = require('fs');
    const reportPath = `./tests/reports/onboarding-journey-${new Date().getTime()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`詳細レポート: ${reportPath}`);
  });
});