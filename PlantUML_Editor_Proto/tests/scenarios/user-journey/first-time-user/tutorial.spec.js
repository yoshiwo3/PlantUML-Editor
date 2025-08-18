/**
 * TEST-011-2: インタラクティブチュートリアルテスト
 * ペルソナ: 田中太郎（新入社員、PlantUML初心者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  completeTutorial, 
  testSevenElementStructure,
  measurePerformance,
  calculateUsabilityScore 
} from '../journey-helpers.js';
import { personas, testData, successCriteria } from '../personas.js';

test.describe('インタラクティブチュートリアルジャーニー', () => {
  const personaType = 'firstTimeUser';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('チュートリアル開始とナビゲーション', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // チュートリアル開始ボタン確認
      const startTutorialBtn = page.locator('[data-testid="start-tutorial"]');
      await expect(startTutorialBtn).toBeVisible({ timeout: 10000 });
      await startTutorialBtn.click();
      
      // チュートリアルオーバーレイ表示確認
      const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"], .tutorial-modal');
      await expect(tutorialOverlay).toBeVisible();
      
      // ナビゲーション要素確認
      const nextButton = page.locator('[data-testid="tutorial-next"]');
      const prevButton = page.locator('[data-testid="tutorial-prev"]');
      const stepIndicator = page.locator('[data-testid="tutorial-step-indicator"]');
      
      await expect(nextButton).toBeVisible();
      
      // 進捗インジケーター確認
      if (await stepIndicator.isVisible()) {
        const stepText = await stepIndicator.textContent();
        expect(stepText).toMatch(/1.*\d+/); // "1 / N" のような形式
      }
      
      return { tutorialStartSuccess: true };
    }, 'チュートリアル開始');
    
    testResults.push({
      test: 'チュートリアル開始',
      status: 'passed',
      executionTime: testResult.executionTime
    });
  });

  test('ステップバイステップガイダンス', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // チュートリアル開始
      if (await page.locator('[data-testid="start-tutorial"]').isVisible()) {
        await page.click('[data-testid="start-tutorial"]');
      }
      
      let currentStep = 1;
      let maxSteps = 10; // 最大ステップ数（無限ループ防止）
      const stepContents = [];
      
      while (currentStep <= maxSteps) {
        // 現在のステップ内容を記録
        const stepContent = page.locator('[data-testid="tutorial-content"], .tutorial-step-content');
        if (await stepContent.isVisible()) {
          const content = await stepContent.textContent();
          stepContents.push({
            step: currentStep,
            content: content,
            hasInstructions: content.length > 20
          });
          
          // ステップ内容の品質確認
          expect(content).toBeTruthy();
          expect(content.length).toBeGreaterThan(20); // 十分な説明があるか
        }
        
        // ハイライト要素確認
        const highlightedElement = page.locator('[data-testid="tutorial-highlight"], .tutorial-highlight');
        if (await highlightedElement.isVisible()) {
          await expect(highlightedElement).toBeVisible();
        }
        
        // インタラクション要求確認
        const interactionPrompt = page.locator('[data-testid="tutorial-interaction"], .tutorial-try-it');
        if (await interactionPrompt.isVisible()) {
          // 実際にインタラクションを実行
          const targetElement = page.locator('[data-testid="add-actor"], button').first();
          if (await targetElement.isVisible()) {
            await targetElement.click();
            await page.waitForTimeout(1000);
          }
        }
        
        // 次のステップへ
        const nextButton = page.locator('[data-testid="tutorial-next"]');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(1500); // ステップ間の待機
          currentStep++;
        } else {
          // 最終ステップに到達
          break;
        }
      }
      
      // チュートリアル完了確認
      const completeButton = page.locator('[data-testid="tutorial-complete"]');
      if (await completeButton.isVisible()) {
        await completeButton.click();
      }
      
      return { 
        totalSteps: stepContents.length,
        stepContents: stepContents,
        allStepsHaveContent: stepContents.every(s => s.hasInstructions)
      };
    }, 'ステップバイステップガイダンス');
    
    // 品質基準確認
    expect(testResult.result.totalSteps).toBeGreaterThan(3); // 最低3ステップ
    expect(testResult.result.allStepsHaveContent).toBeTruthy();
    
    testResults.push({
      test: 'ステップバイステップガイダンス',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('7要素構成の学習プロセス', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // チュートリアル内で7要素を順番に学習
      const elementsToLearn = [
        'dragHandle',      // ドラッグハンドル
        'actorFrom',       // 送信者アクター
        'arrowType',       // 矢印タイプ
        'actorTo',         // 受信者アクター
        'message',         // メッセージ
        'deleteButton',    // 削除ボタン
        'questionButton'   // ヘルプボタン
      ];
      
      const learningResults = [];
      
      for (const element of elementsToLearn) {
        // 要素の説明確認
        const elementGuide = page.locator(`[data-testid="tutorial-${element}"], .tutorial-element-${element}`);
        if (await elementGuide.isVisible()) {
          const guideText = await elementGuide.textContent();
          learningResults.push({
            element: element,
            hasGuide: true,
            guideLength: guideText.length
          });
          
          // 説明の品質確認
          expect(guideText.length).toBeGreaterThan(15);
        } else {
          learningResults.push({
            element: element,
            hasGuide: false
          });
        }
        
        // 実際の要素操作体験
        const actualElement = page.locator(`[data-testid="${element}"]`);
        if (await actualElement.isVisible()) {
          if (element.includes('Button')) {
            await actualElement.click();
          } else if (element === 'dragHandle') {
            const bounds = await actualElement.boundingBox();
            if (bounds) {
              await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
              await page.mouse.down();
              await page.mouse.move(bounds.x + 20, bounds.y + 20);
              await page.mouse.up();
            }
          }
          await page.waitForTimeout(500);
        }
      }
      
      return { learningResults: learningResults };
    }, '7要素学習プロセス');
    
    // 学習完了度確認
    const guidedElements = testResult.result.learningResults.filter(r => r.hasGuide).length;
    expect(guidedElements).toBeGreaterThan(4); // 最低5要素はガイドがあることを期待
    
    testResults.push({
      test: '7要素学習プロセス',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('進捗トラッキングと達成感', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 進捗バー確認
      const progressBar = page.locator('[data-testid="tutorial-progress"], .progress-bar');
      let progressValues = [];
      
      if (await progressBar.isVisible()) {
        // 初期進捗値
        const initialProgress = await progressBar.getAttribute('value') || 
                               await progressBar.getAttribute('aria-valuenow') ||
                               '0';
        progressValues.push(parseFloat(initialProgress));
      }
      
      // チュートリアル実行
      await completeTutorial(page, false);
      
      // 最終進捗値
      if (await progressBar.isVisible()) {
        const finalProgress = await progressBar.getAttribute('value') || 
                             await progressBar.getAttribute('aria-valuenow') ||
                             '100';
        progressValues.push(parseFloat(finalProgress));
      }
      
      // 達成バッジ・メッセージ確認
      const achievementMessage = page.locator('[data-testid="achievement"], .tutorial-completion');
      let hasAchievement = false;
      if (await achievementMessage.isVisible()) {
        hasAchievement = true;
        const achievementText = await achievementMessage.textContent();
        expect(achievementText).toContain('完了');
      }
      
      // スキル習得確認メッセージ
      const skillsLearned = page.locator('[data-testid="skills-learned"], .skills-summary');
      let skillsSummary = '';
      if (await skillsLearned.isVisible()) {
        skillsSummary = await skillsLearned.textContent();
      }
      
      return { 
        progressTracking: progressValues.length > 1,
        progressIncrease: progressValues.length > 1 ? progressValues[1] > progressValues[0] : false,
        hasAchievement: hasAchievement,
        skillsSummary: skillsSummary
      };
    }, '進捗トラッキング');
    
    expect(testResult.result.progressTracking || testResult.result.hasAchievement).toBeTruthy();
    
    testResults.push({
      test: '進捗トラッキング',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('チュートリアルスキップ機能', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // ページリロードしてチュートリアルを再表示
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // スキップボタン確認
      const skipButton = page.locator('[data-testid="skip-tutorial"]');
      if (await skipButton.isVisible()) {
        await expect(skipButton).toBeVisible();
        
        // スキップ実行
        await skipButton.click();
        
        // チュートリアルが閉じられることを確認
        const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"]');
        await expect(tutorialOverlay).not.toBeVisible({ timeout: 5000 });
        
        // エディターが使用可能状態になることを確認
        const editorInput = page.locator('[data-testid="japanese-input"]');
        await expect(editorInput).toBeVisible();
        
        return { skipSuccess: true };
      } else {
        return { skipSuccess: false, reason: 'スキップボタンが見つからない' };
      }
    }, 'チュートリアルスキップ');
    
    testResults.push({
      test: 'チュートリアルスキップ',
      status: testResult.result.skipSuccess ? 'passed' : 'failed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    // チュートリアル全体の品質評価
    const totalTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const completionRate = passedTests / testResults.length;
    
    const usabilityScore = calculateUsabilityScore({
      executionTime: totalTime,
      errorRate: (testResults.length - passedTests) / testResults.length,
      completionRate: completionRate
    }, personaType);
    
    console.log('=== インタラクティブチュートリアル結果 ===');
    console.log(`ユーザビリティスコア: ${usabilityScore}/100`);
    console.log(`完了率: ${(completionRate * 100).toFixed(1)}%`);
    console.log(`総所要時間: ${Math.round(totalTime)}ms`);
    
    // 成功基準との比較
    if (totalTime <= successCriteria.firstTimeUser.tutorialCompletion) {
      console.log('✅ 時間基準クリア');
    } else {
      console.log('⚠️ 時間基準未達成');
    }
  });
});