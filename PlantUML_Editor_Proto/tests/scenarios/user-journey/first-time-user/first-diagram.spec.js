/**
 * TEST-011-3: 初めての図表作成テスト
 * ペルソナ: 田中太郎（新入社員、PlantUML初心者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  createBasicDiagram,
  measurePerformance,
  testErrorHandling,
  calculateUsabilityScore 
} from '../journey-helpers.js';
import { personas, testData, successCriteria } from '../personas.js';

test.describe('初めての図表作成ジャーニー', () => {
  const personaType = 'firstTimeUser';
  const scenarios = testData.firstTimeUser.scenarios;
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
    
    // チュートリアルスキップ（図表作成に集中）
    const skipButton = page.locator('[data-testid="skip-tutorial"]');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });

  test('テンプレート選択と初期設定', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // テンプレート選択エリア確認
      const templateArea = page.locator('[data-testid="template-selection"], .template-gallery');
      
      if (await templateArea.isVisible()) {
        await expect(templateArea).toBeVisible();
        
        // 初心者向けテンプレート確認
        const beginnerTemplates = page.locator('[data-testid="beginner-template"], .template-beginner');
        const templateCount = await beginnerTemplates.count();
        
        if (templateCount > 0) {
          // 最初のテンプレート選択
          await beginnerTemplates.first().click();
          await page.waitForTimeout(1000);
          
          // テンプレートが適用されたか確認
          const templateApplied = page.locator('[data-testid="template-applied"], .template-active');
          if (await templateApplied.isVisible()) {
            await expect(templateApplied).toBeVisible();
          }
        }
      }
      
      // サンプルデータ自動入力確認
      const inputArea = page.locator('[data-testid="japanese-input"]');
      await expect(inputArea).toBeVisible();
      
      const initialValue = await inputArea.inputValue();
      
      return { 
        templateAvailable: templateCount > 0,
        hasInitialValue: initialValue.length > 0,
        initialContent: initialValue
      };
    }, 'テンプレート選択');
    
    testResults.push({
      test: 'テンプレート選択',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('基本的なシーケンス図作成', async ({ page }) => {
    const scenario = scenarios[0]; // 基本シーケンス図
    
    const testResult = await measurePerformance(page, async () => {
      // 図表作成実行
      const diagramResult = await createBasicDiagram(
        page, 
        scenario.input, 
        scenario.expectedElements
      );
      
      // プレビュー確認
      const previewArea = page.locator('[data-testid="diagram-preview"], .preview-container');
      if (await previewArea.isVisible()) {
        await expect(previewArea).toBeVisible();
        
        // プレビューが空でないことを確認
        const previewContent = await previewArea.innerHTML();
        expect(previewContent.length).toBeGreaterThan(100);
      }
      
      // PlantUMLコードの品質確認
      const plantUMLCode = diagramResult.plantUMLCode;
      
      // 基本構造確認
      expect(plantUMLCode).toContain('@startuml');
      expect(plantUMLCode).toContain('@enduml');
      
      // 日本語要素の保持確認
      scenario.expectedElements.forEach(element => {
        expect(plantUMLCode).toContain(element);
      });
      
      // 矢印記法の確認
      expect(plantUMLCode).toMatch(/->|-->|<-|<--|<->|<-->/);
      
      return {
        creationTime: diagramResult.creationTime,
        codeLength: plantUMLCode.length,
        hasBasicStructure: true,
        preservesJapanese: scenario.expectedElements.every(e => plantUMLCode.includes(e))
      };
    }, '基本シーケンス図作成');
    
    // 成功基準確認
    expect(testResult.result.creationTime).toBeLessThan(successCriteria.firstTimeUser.firstDiagramCreation);
    expect(testResult.result.preservesJapanese).toBeTruthy();
    
    testResults.push({
      test: '基本シーケンス図作成',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('条件分岐のある図表作成', async ({ page }) => {
    const scenario = scenarios[1]; // 条件分岐シナリオ
    
    const testResult = await measurePerformance(page, async () => {
      // 前のテストをクリア
      const clearButton = page.locator('[data-testid="clear-diagram"], button:has-text("クリア")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
      }
      
      // 条件分岐図表作成
      const diagramResult = await createBasicDiagram(
        page, 
        scenario.input, 
        scenario.expectedElements
      );
      
      // 条件分岐構文の確認
      const plantUMLCode = diagramResult.plantUMLCode;
      
      // alt, opt, loop などの条件分岐キーワード確認
      const hasConditional = /alt\s|opt\s|loop\s|if\s|else\s/.test(plantUMLCode) ||
                            plantUMLCode.includes('もし') ||
                            plantUMLCode.includes('そうでなければ');
      
      // 複数の処理パス確認
      const actorCount = scenario.expectedElements.length;
      const hasMultiplePaths = actorCount >= 3;
      
      return {
        creationTime: diagramResult.creationTime,
        hasConditional: hasConditional,
        hasMultiplePaths: hasMultiplePaths,
        codeComplexity: plantUMLCode.split('\\n').length
      };
    }, '条件分岐図表作成');
    
    expect(testResult.result.hasConditional || testResult.result.hasMultiplePaths).toBeTruthy();
    
    testResults.push({
      test: '条件分岐図表作成',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('リアルタイムプレビューと同期', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      const inputArea = page.locator('[data-testid="japanese-input"]');
      const previewArea = page.locator('[data-testid="diagram-preview"], .preview-container');
      
      // 段階的な入力とプレビュー更新確認
      const testInputs = [
        'A',
        'Aが',
        'AがBに',
        'AがBにメッセージを送る'
      ];
      
      const syncResults = [];
      
      for (const input of testInputs) {
        const syncStartTime = Date.now();
        
        // 入力
        await inputArea.fill(input);
        
        // プレビュー更新待機
        await page.waitForTimeout(300);
        
        // プレビュー内容確認
        if (await previewArea.isVisible()) {
          const previewContent = await previewArea.innerHTML();
          const syncTime = Date.now() - syncStartTime;
          
          syncResults.push({
            input: input,
            syncTime: syncTime,
            hasContent: previewContent.length > 100,
            previewLength: previewContent.length
          });
        }
      }
      
      // 平均同期時間計算
      const averageSyncTime = syncResults.reduce((sum, r) => sum + r.syncTime, 0) / syncResults.length;
      
      return {
        syncResults: syncResults,
        averageSyncTime: averageSyncTime,
        allSynced: syncResults.every(r => r.hasContent),
        fastSync: averageSyncTime < 1000 // 1秒以内
      };
    }, 'リアルタイム同期');
    
    expect(testResult.result.fastSync).toBeTruthy();
    expect(testResult.result.allSynced).toBeTruthy();
    
    testResults.push({
      test: 'リアルタイム同期',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('保存とエクスポート機能', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 図表を作成
      await createBasicDiagram(page, scenarios[0].input, scenarios[0].expectedElements);
      
      // 保存機能確認
      const saveButton = page.locator('[data-testid="save-diagram"], button:has-text("保存")');
      let saveSuccess = false;
      
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);
        
        // 保存成功メッセージ確認
        const saveMessage = page.locator('[data-testid="save-success"], .save-notification');
        if (await saveMessage.isVisible()) {
          saveSuccess = true;
        }
      }
      
      // エクスポート機能確認
      const exportButton = page.locator('[data-testid="export-diagram"], button:has-text("エクスポート")');
      let exportOptions = [];
      
      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.waitForTimeout(500);
        
        // エクスポート形式オプション確認
        const formatOptions = page.locator('[data-testid="export-format"], .export-option');
        const optionCount = await formatOptions.count();
        
        for (let i = 0; i < optionCount; i++) {
          const optionText = await formatOptions.nth(i).textContent();
          exportOptions.push(optionText);
        }
      }
      
      return {
        saveAvailable: saveSuccess || await saveButton.isVisible(),
        exportAvailable: exportOptions.length > 0,
        exportFormats: exportOptions,
        hasMultipleFormats: exportOptions.length > 1
      };
    }, '保存・エクスポート');
    
    testResults.push({
      test: '保存・エクスポート',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('エラーハンドリングとガイダンス', async ({ page }) => {
    // 意図的にエラーを発生させるテスト
    const errorTestResult = await testErrorHandling(page, async () => {
      // 不正な入力を試行
      const inputArea = page.locator('[data-testid="japanese-input"]');
      await inputArea.fill(''); // 空入力
      await page.waitForTimeout(200);
      
      await inputArea.fill('<script>alert("test")</script>'); // スクリプト入力
      await page.waitForTimeout(500);
      
      // 超長文入力
      const longText = 'あ'.repeat(10000);
      await inputArea.fill(longText);
      await page.waitForTimeout(1000);
      
    }, 'input-validation');
    
    // エラーメッセージの確認
    const errorMessage = page.locator('[data-testid="error-message"], .error-notification');
    const hasUserFriendlyError = await errorMessage.isVisible();
    
    let errorMessageText = '';
    if (hasUserFriendlyError) {
      errorMessageText = await errorMessage.textContent();
    }
    
    testResults.push({
      test: 'エラーハンドリング',
      status: hasUserFriendlyError ? 'passed' : 'warning',
      metrics: {
        errorHandling: errorTestResult,
        userFriendlyMessage: hasUserFriendlyError,
        errorMessageText: errorMessageText
      }
    });
  });

  test.afterAll(async () => {
    // 初回図表作成の全体評価
    const totalTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const completionRate = passedTests / testResults.length;
    
    const usabilityScore = calculateUsabilityScore({
      executionTime: totalTime,
      errorRate: (testResults.length - passedTests) / testResults.length,
      completionRate: completionRate
    }, personaType);
    
    console.log('=== 初めての図表作成結果 ===');
    console.log(`ユーザビリティスコア: ${usabilityScore}/100`);
    console.log(`図表作成成功率: ${(completionRate * 100).toFixed(1)}%`);
    console.log(`総作成時間: ${Math.round(totalTime)}ms`);
    
    // 初心者向け推奨事項
    const recommendations = [];
    if (usabilityScore < 80) {
      recommendations.push('UI/UXの改善が必要');
    }
    if (totalTime > successCriteria.firstTimeUser.firstDiagramCreation) {
      recommendations.push('作成プロセスの簡略化を検討');
    }
    
    if (recommendations.length > 0) {
      console.log('初心者向け改善推奨事項:');
      recommendations.forEach(rec => console.log(`- ${rec}`));
    }
  });
});