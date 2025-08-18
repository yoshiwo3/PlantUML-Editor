/**
 * TEST-012-1: 大規模図表作成テスト
 * ペルソナ: 山田花子（テックリード、PlantUML上級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance,
  calculateUsabilityScore 
} from '../journey-helpers.js';
import { personas, testData, successCriteria } from '../personas.js';

test.describe('大規模図表作成ジャーニー', () => {
  const personaType = 'powerUser';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('100要素以上の複雑な図表作成', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      const complexScenario = testData.powerUser.scenarios[0];
      
      // 大規模な日本語シナリオ入力
      const inputArea = page.locator('[data-testid="japanese-input"]');
      await inputArea.fill(complexScenario.input);
      
      // 処理完了を待機（大規模なので時間がかかる可能性）
      await page.waitForTimeout(3000);
      
      // PlantUMLコード生成確認
      const plantUMLOutput = page.locator('[data-testid="plantuml-output"]');
      await expect(plantUMLOutput).toBeVisible();
      
      const plantUMLCode = await plantUMLOutput.textContent();
      expect(plantUMLCode).toContain('@startuml');
      expect(plantUMLCode).toContain('@enduml');
      
      // 複雑さの指標確認
      const codeLines = plantUMLCode.split('\\n').filter(line => line.trim().length > 0);
      const actorCount = complexScenario.expectedElements.length;
      const arrowCount = (plantUMLCode.match(/->/g) || []).length;
      
      // 期待される要素の存在確認
      const foundElements = complexScenario.expectedElements.filter(element => 
        plantUMLCode.includes(element)
      );
      const elementCoverage = foundElements.length / complexScenario.expectedElements.length;
      
      // パフォーマンス指標
      const memoryUsage = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        } : null;
      });
      
      return {
        codeLines: codeLines.length,
        actorCount: actorCount,
        arrowCount: arrowCount,
        elementCoverage: elementCoverage,
        complexityMet: codeLines.length >= 100 || actorCount >= 7,
        memoryUsage: memoryUsage,
        generatedCode: plantUMLCode
      };
    }, '大規模図表作成');
    
    // 複雑さ基準確認
    expect(testResult.result.complexityMet).toBeTruthy();
    expect(testResult.result.elementCoverage).toBeGreaterThan(0.8); // 80%以上の要素をカバー
    
    // パフォーマンス基準確認
    expect(testResult.executionTime).toBeLessThan(successCriteria.powerUser.largeScaleDiagram);
    
    testResults.push({
      test: '大規模図表作成',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('大量データインポートシミュレーション', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 大量データの模擬的な入力処理
      const bulkData = [
        '認証サービスがユーザー情報を検証',
        'データベースサービスがユーザープロファイルを取得',
        'キャッシュサービスがセッション情報を保存',
        'ログサービスがアクセス履歴を記録',
        'メール通知サービスがログイン通知を送信',
        'セキュリティサービスが不正アクセスを監視',
        '分析サービスがユーザー行動を追跡',
        'バックアップサービスがデータを複製',
        'モニタリングサービスがシステム状態を監視',
        '外部APIサービスが第三者システムと連携'
      ];
      
      let processingResults = [];
      const startTime = Date.now();
      
      // インポート機能の確認
      const importButton = page.locator('[data-testid="import-data"], button:has-text("インポート")');
      
      if (await importButton.isVisible()) {
        // 実際のインポート機能がある場合
        await importButton.click();
        await page.waitForTimeout(500);
        
        // ファイル入力またはテキストエリア
        const importArea = page.locator('[data-testid="import-textarea"], textarea');
        if (await importArea.isVisible()) {
          await importArea.fill(bulkData.join('\\n'));
          
          const processButton = page.locator('[data-testid="process-import"], button:has-text("処理")');
          if (await processButton.isVisible()) {
            await processButton.click();
            await page.waitForTimeout(2000); // 処理待機
          }
        }
      } else {
        // インポート機能がない場合は手動で段階的入力
        const inputArea = page.locator('[data-testid="japanese-input"]');
        
        for (let i = 0; i < bulkData.length; i++) {
          const currentTime = Date.now();
          const currentData = bulkData.slice(0, i + 1).join('。');
          
          await inputArea.fill(currentData);
          await page.waitForTimeout(300); // リアルタイム処理待機
          
          // 処理状況確認
          const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
          const processedLines = plantUMLOutput.split('\\n').length;
          
          processingResults.push({
            dataPoint: i + 1,
            inputLength: currentData.length,
            outputLines: processedLines,
            processingTime: Date.now() - currentTime
          });
        }
      }
      
      const totalProcessingTime = Date.now() - startTime;
      
      // 最終結果確認
      const finalOutput = await page.textContent('[data-testid="plantuml-output"]');
      const finalComplexity = finalOutput.split('\\n').length;
      
      return {
        bulkDataProcessed: bulkData.length,
        totalProcessingTime: totalProcessingTime,
        processingResults: processingResults,
        finalComplexity: finalComplexity,
        averageProcessingTime: processingResults.length > 0 ? 
          processingResults.reduce((sum, r) => sum + r.processingTime, 0) / processingResults.length : 0,
        throughputPerSecond: bulkData.length / (totalProcessingTime / 1000)
      };
    }, '大量データインポート');
    
    // パフォーマンス評価
    expect(testResult.result.averageProcessingTime).toBeLessThan(1000); // 平均1秒以内
    expect(testResult.result.throughputPerSecond).toBeGreaterThan(1); // 秒間1件以上
    
    testResults.push({
      test: '大量データインポート',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('一括編集操作テスト', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // まず複数の要素を作成
      const inputArea = page.locator('[data-testid="japanese-input"]');
      await inputArea.fill('サービスAがサービスBに接続、サービスBがサービスCに接続、サービスCがサービスDに接続');
      await page.waitForTimeout(1000);
      
      let bulkEditResults = {
        selectAllAvailable: false,
        bulkDeleteAvailable: false,
        bulkFormatAvailable: false,
        multiSelectCount: 0
      };
      
      // 全選択機能確認
      const selectAllButton = page.locator('[data-testid="select-all"], button:has-text("全選択")');
      if (await selectAllButton.isVisible()) {
        await selectAllButton.click();
        bulkEditResults.selectAllAvailable = true;
        await page.waitForTimeout(500);
      } else {
        // Ctrl+A による全選択
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(500);
      }
      
      // 選択されたアイテム数確認
      const selectedItems = page.locator('.selected, [data-selected="true"]');
      bulkEditResults.multiSelectCount = await selectedItems.count();
      
      // 一括削除機能確認
      const bulkDeleteButton = page.locator('[data-testid="bulk-delete"], button:has-text("一括削除")');
      if (await bulkDeleteButton.isVisible()) {
        bulkEditResults.bulkDeleteAvailable = true;
        // 実際の削除は行わない（テストデータ保持のため）
      }
      
      // 一括書式設定確認
      const formatButton = page.locator('[data-testid="bulk-format"], [data-testid="format-all"]');
      if (await formatButton.isVisible()) {
        await formatButton.click();
        bulkEditResults.bulkFormatAvailable = true;
        await page.waitForTimeout(1000);
        
        // 書式設定後のコード確認
        const formattedCode = await page.textContent('[data-testid="plantuml-output"]');
        bulkEditResults.codeFormatted = formattedCode.includes('@startuml') && formattedCode.includes('@enduml');
      }
      
      // Find & Replace 機能確認
      const findReplaceButton = page.locator('[data-testid="find-replace"], button:has-text("置換")');
      if (await findReplaceButton.isVisible()) {
        await findReplaceButton.click();
        await page.waitForTimeout(500);
        
        const findInput = page.locator('[data-testid="find-input"], input[placeholder*="検索"]');
        const replaceInput = page.locator('[data-testid="replace-input"], input[placeholder*="置換"]');
        
        if (await findInput.isVisible() && await replaceInput.isVisible()) {
          await findInput.fill('サービス');
          await replaceInput.fill('システム');
          
          const replaceAllButton = page.locator('[data-testid="replace-all"], button:has-text("全て置換")');
          if (await replaceAllButton.isVisible()) {
            await replaceAllButton.click();
            await page.waitForTimeout(1000);
            
            const replacedCode = await page.textContent('[data-testid="plantuml-output"]');
            bulkEditResults.findReplaceWorking = replacedCode.includes('システム') && !replacedCode.includes('サービス');
          }
        }
      }
      
      return bulkEditResults;
    }, '一括編集操作');
    
    // 一括編集機能の評価
    const editFeaturesCount = Object.values(testResult.result).filter(v => v === true).length;
    expect(editFeaturesCount).toBeGreaterThan(1); // 少なくとも2つの一括編集機能が利用可能
    
    testResults.push({
      test: '一括編集操作',
      status: editFeaturesCount > 1 ? 'passed' : 'partial',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('パフォーマンス監視と最適化', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // パフォーマンス監視ツールの確認
      const perfPanel = page.locator('[data-testid="performance-panel"], .perf-monitor');
      let performanceMetrics = {
        monitoringAvailable: false,
        memoryUsage: null,
        renderingTime: null,
        optimizationSuggestions: []
      };
      
      if (await perfPanel.isVisible()) {
        performanceMetrics.monitoringAvailable = true;
        
        // メモリ使用量表示確認
        const memoryDisplay = page.locator('[data-testid="memory-usage"], .memory-indicator');
        if (await memoryDisplay.isVisible()) {
          const memoryText = await memoryDisplay.textContent();
          performanceMetrics.memoryUsage = memoryText;
        }
        
        // レンダリング時間表示確認
        const renderTimeDisplay = page.locator('[data-testid="render-time"], .render-time-indicator');
        if (await renderTimeDisplay.isVisible()) {
          const renderTimeText = await renderTimeDisplay.textContent();
          performanceMetrics.renderingTime = renderTimeText;
        }
      }
      
      // 大規模データでのパフォーマンステスト
      const heavyInput = '大規模システム'.repeat(100) + 'の処理フローを示すマイクロサービス連携図';
      const inputArea = page.locator('[data-testid="japanese-input"]');
      
      const renderStartTime = Date.now();
      await inputArea.fill(heavyInput);
      
      // レンダリング完了待機
      await page.waitForFunction(() => {
        const output = document.querySelector('[data-testid="plantuml-output"]');
        return output && output.textContent.includes('@enduml');
      }, { timeout: 10000 });
      
      const renderEndTime = Date.now();
      const actualRenderTime = renderEndTime - renderStartTime;
      
      // メモリ使用量測定
      const memoryInfo = await page.evaluate(() => {
        return performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) // MB
        } : null;
      });
      
      // 最適化提案確認
      const optimizationSuggestions = page.locator('[data-testid="optimization-suggestion"], .perf-suggestion');
      const suggestionCount = await optimizationSuggestions.count();
      
      for (let i = 0; i < suggestionCount; i++) {
        const suggestion = await optimizationSuggestions.nth(i).textContent();
        performanceMetrics.optimizationSuggestions.push(suggestion);
      }
      
      return {
        ...performanceMetrics,
        actualRenderTime: actualRenderTime,
        memoryInfo: memoryInfo,
        performanceAcceptable: actualRenderTime < 5000 && (!memoryInfo || memoryInfo.used < 100)
      };
    }, 'パフォーマンス監視');
    
    // パフォーマンス基準確認
    expect(testResult.result.actualRenderTime).toBeLessThan(5000); // 5秒以内
    
    if (testResult.result.memoryInfo) {
      expect(testResult.result.memoryInfo.used).toBeLessThan(100); // 100MB以内
    }
    
    testResults.push({
      test: 'パフォーマンス監視',
      status: testResult.result.performanceAcceptable ? 'passed' : 'warning',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('メモリ使用量とスケーラビリティ', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let scalabilityResults = {
        baselineMemory: null,
        peakMemory: null,
        memoryEfficiency: null,
        scalabilityRating: 'unknown'
      };
      
      // ベースラインメモリ測定
      scalabilityResults.baselineMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : null;
      });
      
      // 段階的に負荷を増加
      const loadLevels = [
        { level: 1, input: 'システムAがシステムBと通信' },
        { level: 2, input: 'システムAがシステムB、システムC、システムDと複雑な通信を行う' },
        { level: 3, input: 'マイクロサービスアーキテクチャで10個のサービスが相互に通信し、データベースクラスターと外部APIを使用する複雑なシステム' }
      ];
      
      const inputArea = page.locator('[data-testid="japanese-input"]');
      let memoryProgression = [];
      
      for (const load of loadLevels) {
        await inputArea.fill(load.input);
        await page.waitForTimeout(1000);
        
        const currentMemory = await page.evaluate(() => {
          return performance.memory ? performance.memory.usedJSHeapSize : null;
        });
        
        memoryProgression.push({
          level: load.level,
          memoryUsed: currentMemory,
          inputLength: load.input.length
        });
      }
      
      // ピークメモリ特定
      scalabilityResults.peakMemory = Math.max(...memoryProgression.map(p => p.memoryUsed || 0));
      
      // メモリ効率計算
      if (scalabilityResults.baselineMemory && scalabilityResults.peakMemory) {
        const memoryIncrease = scalabilityResults.peakMemory - scalabilityResults.baselineMemory;
        const memoryIncreasePercent = (memoryIncrease / scalabilityResults.baselineMemory) * 100;
        
        scalabilityResults.memoryEfficiency = memoryIncreasePercent;
        
        // スケーラビリティ評価
        if (memoryIncreasePercent < 50) {
          scalabilityResults.scalabilityRating = 'excellent';
        } else if (memoryIncreasePercent < 100) {
          scalabilityResults.scalabilityRating = 'good';
        } else if (memoryIncreasePercent < 200) {
          scalabilityResults.scalabilityRating = 'acceptable';
        } else {
          scalabilityResults.scalabilityRating = 'poor';
        }
      }
      
      return {
        ...scalabilityResults,
        memoryProgression: memoryProgression
      };
    }, 'スケーラビリティ評価');
    
    // スケーラビリティ基準確認
    expect(testResult.result.scalabilityRating).not.toBe('poor');
    
    testResults.push({
      test: 'スケーラビリティ評価',
      status: ['excellent', 'good', 'acceptable'].includes(testResult.result.scalabilityRating) ? 'passed' : 'warning',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    // パワーユーザー大規模図表作成の総合評価
    const totalTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const warningTests = testResults.filter(r => r.status === 'warning').length;
    const completionRate = (passedTests + warningTests * 0.7) / testResults.length;
    
    const usabilityScore = calculateUsabilityScore({
      executionTime: totalTime,
      errorRate: (testResults.length - passedTests - warningTests) / testResults.length,
      completionRate: completionRate
    }, personaType);
    
    console.log('=== パワーユーザー大規模図表作成結果 ===');
    console.log(`ユーザビリティスコア: ${usabilityScore}/100`);
    console.log(`成功率: ${(completionRate * 100).toFixed(1)}%`);
    console.log(`総処理時間: ${Math.round(totalTime)}ms`);
    
    // パワーユーザー向け評価
    if (totalTime <= successCriteria.powerUser.largeScaleDiagram) {
      console.log('🚀 エキスパートレベルのパフォーマンス達成');
    } else {
      console.log('⚠️ パフォーマンス最適化が必要');
    }
    
    if (usabilityScore >= 90) {
      console.log('🏆 パワーユーザーのニーズを完全に満たしている');
    } else if (usabilityScore >= 80) {
      console.log('✅ パワーユーザーにとって十分実用的');
    } else {
      console.log('🔧 上級機能の強化が必要');
    }
  });
});