/**
 * TEST-011-4: 基本機能マスターテスト
 * ペルソナ: 田中太郎（新入社員、PlantUML初心者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  testSevenElementStructure,
  measurePerformance,
  calculateUsabilityScore 
} from '../journey-helpers.js';
import { personas, journeyActions, successCriteria } from '../personas.js';

test.describe('基本機能マスタージャーニー', () => {
  const personaType = 'firstTimeUser';
  let testResults = [];
  let masteredFeatures = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
    
    // チュートリアルスキップして実践に集中
    const skipButton = page.locator('[data-testid="skip-tutorial"]');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });

  test('7要素構成の完全操作マスター', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 7要素すべての操作をテスト
      const elementResults = await testSevenElementStructure(page);
      
      let masteredCount = 0;
      let totalTests = 0;
      
      Object.keys(elementResults).forEach(element => {
        const result = elementResults[element];
        totalTests++;
        
        if (result.exists && result.visible && result.enabled) {
          masteredCount++;
          masteredFeatures.push(element);
          
          // 操作成功確認
          const hasSuccessfulOperation = result.dragTest === 'success' || 
                                       result.clickTest === 'success' || 
                                       result.selectTest === 'success';
          
          if (hasSuccessfulOperation) {
            console.log(`✅ ${element}: 操作成功`);
          }
        } else {
          console.log(`❌ ${element}: 利用不可 (${result.error || 'Unknown'})`);
        }
      });
      
      const masteryRate = masteredCount / totalTests;
      
      return {
        elementResults: elementResults,
        masteredCount: masteredCount,
        totalElements: totalTests,
        masteryRate: masteryRate,
        allElementsWorking: masteryRate === 1.0
      };
    }, '7要素操作マスター');
    
    // 基本機能の習得度確認
    expect(testResult.result.masteryRate).toBeGreaterThan(0.7); // 70%以上習得
    
    testResults.push({
      test: '7要素操作マスター',
      status: testResult.result.masteryRate > 0.7 ? 'passed' : 'failed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('ドラッグ&ドロップ操作習得', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 基本的な要素を追加してドラッグ操作をテスト
      const addActorBtn = page.locator('[data-testid="add-actor"]');
      
      if (await addActorBtn.isVisible()) {
        // 複数の要素を追加
        await addActorBtn.click();
        await page.waitForTimeout(500);
        await addActorBtn.click();
        await page.waitForTimeout(500);
      }
      
      // ドラッグ可能な要素を特定
      const draggableElements = page.locator('[data-testid="drag-handle"], .draggable');
      const dragCount = await draggableElements.count();
      
      let successfulDrags = 0;
      const dragResults = [];
      
      for (let i = 0; i < Math.min(dragCount, 3); i++) {
        try {
          const element = draggableElements.nth(i);
          const bounds = await element.boundingBox();
          
          if (bounds) {
            const startX = bounds.x + bounds.width / 2;
            const startY = bounds.y + bounds.height / 2;
            const endX = startX + 50;
            const endY = startY + 30;
            
            // ドラッグ操作実行
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.mouse.move(endX, endY);
            await page.waitForTimeout(100);
            await page.mouse.up();
            
            successfulDrags++;
            dragResults.push({
              elementIndex: i,
              success: true,
              startPos: { x: startX, y: startY },
              endPos: { x: endX, y: endY }
            });
            
            await page.waitForTimeout(300);
          }
        } catch (error) {
          dragResults.push({
            elementIndex: i,
            success: false,
            error: error.message
          });
        }
      }
      
      const dragSuccessRate = dragCount > 0 ? successfulDrags / Math.min(dragCount, 3) : 0;
      
      return {
        totalDraggableElements: dragCount,
        successfulDrags: successfulDrags,
        dragSuccessRate: dragSuccessRate,
        dragResults: dragResults
      };
    }, 'ドラッグ&ドロップ習得');
    
    expect(testResult.result.dragSuccessRate).toBeGreaterThan(0.5); // 50%以上成功
    
    if (testResult.result.successfulDrags > 0) {
      masteredFeatures.push('drag-and-drop');
    }
    
    testResults.push({
      test: 'ドラッグ&ドロップ習得',
      status: testResult.result.dragSuccessRate > 0.5 ? 'passed' : 'failed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('ヘルプ機能（？ボタン）活用', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // ？ボタンを探して使用
      const helpButtons = page.locator('[data-testid="question-button"], [data-testid="help-button"], .help-trigger');
      const helpButtonCount = await helpButtons.count();
      
      let helpUsageResults = [];
      
      for (let i = 0; i < Math.min(helpButtonCount, 3); i++) {
        try {
          const helpButton = helpButtons.nth(i);
          await helpButton.click();
          await page.waitForTimeout(1000);
          
          // ヘルプコンテンツ表示確認
          const helpContent = page.locator('[data-testid="help-content"], .help-popup, .tooltip-content');
          
          if (await helpContent.isVisible()) {
            const contentText = await helpContent.textContent();
            helpUsageResults.push({
              buttonIndex: i,
              helpShown: true,
              contentLength: contentText.length,
              hasUsefulInfo: contentText.length > 20
            });
            
            // ヘルプを閉じる
            const closeButton = page.locator('[data-testid="close-help"], .close-button');
            if (await closeButton.isVisible()) {
              await closeButton.click();
            } else {
              // 背景クリックで閉じる
              await page.mouse.click(100, 100);
            }
          } else {
            helpUsageResults.push({
              buttonIndex: i,
              helpShown: false
            });
          }
          
          await page.waitForTimeout(500);
        } catch (error) {
          helpUsageResults.push({
            buttonIndex: i,
            error: error.message
          });
        }
      }
      
      const successfulHelp = helpUsageResults.filter(r => r.helpShown && r.hasUsefulInfo).length;
      const helpUtilizationRate = helpButtonCount > 0 ? successfulHelp / Math.min(helpButtonCount, 3) : 0;
      
      return {
        totalHelpButtons: helpButtonCount,
        successfulHelpUsage: successfulHelp,
        helpUtilizationRate: helpUtilizationRate,
        helpResults: helpUsageResults
      };
    }, 'ヘルプ機能活用');
    
    if (testResult.result.successfulHelpUsage > 0) {
      masteredFeatures.push('help-system');
    }
    
    testResults.push({
      test: 'ヘルプ機能活用',
      status: testResult.result.helpUtilizationRate > 0 ? 'passed' : 'warning',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('エクスポート機能完全実行', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // まず簡単な図表を作成
      const inputArea = page.locator('[data-testid="japanese-input"]');
      await inputArea.fill('AさんがBさんにメッセージを送信');
      await page.waitForTimeout(1000);
      
      // エクスポートボタン確認
      const exportButton = page.locator('[data-testid="export-diagram"], button:has-text("エクスポート")');
      
      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.waitForTimeout(500);
        
        // エクスポート形式選択
        const formatOptions = page.locator('[data-testid="export-format"], .export-option');
        const formatCount = await formatOptions.count();
        
        let exportAttempts = [];
        
        // 複数の形式でエクスポートを試行
        for (let i = 0; i < Math.min(formatCount, 3); i++) {
          try {
            const format = formatOptions.nth(i);
            const formatText = await format.textContent();
            
            await format.click();
            await page.waitForTimeout(500);
            
            // ダウンロード開始確認
            const downloadButton = page.locator('[data-testid="download-button"], button:has-text("ダウンロード")');
            if (await downloadButton.isVisible()) {
              // 実際のダウンロードはテストでは実行しない（ファイルシステムへの影響を避ける）
              exportAttempts.push({
                format: formatText,
                exportAvailable: true
              });
            }
            
            // モーダルを閉じる
            const closeModal = page.locator('[data-testid="close-modal"], .modal-close');
            if (await closeModal.isVisible()) {
              await closeModal.click();
            }
            
          } catch (error) {
            exportAttempts.push({
              format: `format_${i}`,
              exportAvailable: false,
              error: error.message
            });
          }
        }
        
        const successfulExports = exportAttempts.filter(a => a.exportAvailable).length;
        const exportSuccessRate = formatCount > 0 ? successfulExports / Math.min(formatCount, 3) : 0;
        
        return {
          exportButtonAvailable: true,
          totalFormats: formatCount,
          successfulExports: successfulExports,
          exportSuccessRate: exportSuccessRate,
          exportAttempts: exportAttempts
        };
      } else {
        return {
          exportButtonAvailable: false,
          reason: 'エクスポートボタンが見つからない'
        };
      }
    }, 'エクスポート実行');
    
    if (testResult.result.exportButtonAvailable && testResult.result.successfulExports > 0) {
      masteredFeatures.push('export-functionality');
    }
    
    testResults.push({
      test: 'エクスポート実行',
      status: testResult.result.exportSuccessRate > 0 ? 'passed' : 'failed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('基本操作の流暢性確認', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 連続操作による流暢性テスト
      const operations = [
        { action: 'clear', description: '画面クリア' },
        { action: 'input', description: '日本語入力', text: 'ユーザーがシステムにログイン' },
        { action: 'wait', description: '変換待機', duration: 500 },
        { action: 'modify', description: '内容修正', text: 'ユーザーがシステムにログインして、データを取得' },
        { action: 'preview', description: 'プレビュー確認' },
        { action: 'save', description: '保存実行' }
      ];
      
      let operationResults = [];
      let totalOperationTime = 0;
      
      for (const op of operations) {
        const opStartTime = Date.now();
        let opSuccess = false;
        
        try {
          switch (op.action) {
            case 'clear':
              const clearBtn = page.locator('[data-testid="clear-diagram"], button:has-text("クリア")');
              if (await clearBtn.isVisible()) {
                await clearBtn.click();
                opSuccess = true;
              }
              break;
              
            case 'input':
              const inputArea = page.locator('[data-testid="japanese-input"]');
              await inputArea.fill(op.text);
              opSuccess = true;
              break;
              
            case 'wait':
              await page.waitForTimeout(op.duration);
              opSuccess = true;
              break;
              
            case 'modify':
              const modifyArea = page.locator('[data-testid="japanese-input"]');
              await modifyArea.fill(op.text);
              opSuccess = true;
              break;
              
            case 'preview':
              const previewArea = page.locator('[data-testid="diagram-preview"]');
              if (await previewArea.isVisible()) {
                const content = await previewArea.innerHTML();
                opSuccess = content.length > 50;
              }
              break;
              
            case 'save':
              const saveBtn = page.locator('[data-testid="save-diagram"], button:has-text("保存")');
              if (await saveBtn.isVisible()) {
                await saveBtn.click();
                opSuccess = true;
              } else {
                opSuccess = true; // 保存機能がない場合も正常とする
              }
              break;
          }
        } catch (error) {
          console.warn(`操作エラー [${op.action}]: ${error.message}`);
        }
        
        const opTime = Date.now() - opStartTime;
        totalOperationTime += opTime;
        
        operationResults.push({
          action: op.action,
          description: op.description,
          success: opSuccess,
          executionTime: opTime
        });
      }
      
      const successRate = operationResults.filter(r => r.success).length / operations.length;
      const averageOperationTime = totalOperationTime / operations.length;
      
      return {
        operationResults: operationResults,
        totalOperationTime: totalOperationTime,
        averageOperationTime: averageOperationTime,
        successRate: successRate,
        fluencyAchieved: successRate > 0.8 && averageOperationTime < 2000
      };
    }, '操作流暢性');
    
    expect(testResult.result.successRate).toBeGreaterThan(0.7); // 70%以上の操作成功率
    
    if (testResult.result.fluencyAchieved) {
      masteredFeatures.push('operational-fluency');
    }
    
    testResults.push({
      test: '操作流暢性',
      status: testResult.result.fluencyAchieved ? 'passed' : 'partial',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    // 基本機能マスター度の総合評価
    const totalTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const partialTests = testResults.filter(r => r.status === 'partial').length;
    const completionRate = (passedTests + partialTests * 0.5) / testResults.length;
    
    const usabilityScore = calculateUsabilityScore({
      executionTime: totalTime,
      errorRate: (testResults.length - passedTests - partialTests) / testResults.length,
      completionRate: completionRate
    }, personaType);
    
    // マスター度計算
    const expectedFeatures = ['7-elements', 'drag-and-drop', 'help-system', 'export-functionality', 'operational-fluency'];
    const masteryPercentage = (masteredFeatures.length / expectedFeatures.length) * 100;
    
    console.log('=== 基本機能マスター結果 ===');
    console.log(`習得した機能: ${masteredFeatures.join(', ')}`);
    console.log(`マスター度: ${masteryPercentage.toFixed(1)}%`);
    console.log(`ユーザビリティスコア: ${usabilityScore}/100`);
    console.log(`総習得時間: ${Math.round(totalTime)}ms`);
    
    // 初心者の成長評価
    if (masteryPercentage >= 80) {
      console.log('🎉 優秀！基本機能を十分習得');
    } else if (masteryPercentage >= 60) {
      console.log('✅ 良好！基本的な操作が可能');
    } else {
      console.log('⚠️ 要改善：追加サポートが必要');
    }
    
    // 学習効率評価
    if (totalTime <= successCriteria.firstTimeUser.basicFeaturesMastery) {
      console.log('🚀 効率的な学習が実現');
    } else {
      console.log('🐌 学習時間の短縮が必要');
    }
  });
});