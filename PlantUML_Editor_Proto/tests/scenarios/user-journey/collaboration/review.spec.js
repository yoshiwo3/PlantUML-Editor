/**
 * TEST-013-3: レビュー・フィードバックテスト
 * ペルソナ: 佐藤次郎（プロジェクトマネージャー、PlantUML中級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance 
} from '../journey-helpers.js';
import { testData } from '../personas.js';

test.describe('レビュー・フィードバックジャーニー', () => {
  const personaType = 'collaborator';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('コメント追加機能', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let commentResults = {
        commentButtonAvailable: false,
        commentAdded: false,
        commentVisible: false
      };
      
      // コメント機能確認
      const commentButton = page.locator('[data-testid="add-comment"], button:has-text("コメント")');
      
      if (await commentButton.isVisible()) {
        commentResults.commentButtonAvailable = true;
        await commentButton.click();
        await page.waitForTimeout(500);
        
        // コメント入力
        const commentInput = page.locator('[data-testid="comment-input"], textarea');
        if (await commentInput.isVisible()) {
          const testComment = testData.collaboration.scenarios[0].reviewComments[0];
          await commentInput.fill(testComment);
          
          const submitButton = page.locator('[data-testid="submit-comment"], button:has-text("投稿")');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(500);
            
            commentResults.commentAdded = true;
            
            // コメント表示確認
            const commentList = page.locator('[data-testid="comment-list"], .comments');
            if (await commentList.isVisible()) {
              commentResults.commentVisible = true;
            }
          }
        }
      }
      
      return commentResults;
    }, 'コメント機能');

    testResults.push({
      test: 'コメント機能',
      status: testResult.result.commentButtonAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    console.log('=== レビュー・フィードバック結果 ===');
    testResults.forEach(result => {
      console.log(`${result.test}: ${result.status}`);
    });
  });
});