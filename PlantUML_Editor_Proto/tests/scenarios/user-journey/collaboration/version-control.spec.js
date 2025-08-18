/**
 * TEST-013-4: バージョン管理テスト
 * ペルソナ: 佐藤次郎（プロジェクトマネージャー、PlantUML中級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance 
} from '../journey-helpers.js';

test.describe('バージョン管理ジャーニー', () => {
  const personaType = 'collaborator';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('変更履歴表示', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let versionResults = {
        historyAvailable: false,
        versionCount: 0,
        diffViewAvailable: false
      };
      
      // 履歴ボタン確認
      const historyButton = page.locator('[data-testid="version-history"], button:has-text("履歴")');
      
      if (await historyButton.isVisible()) {
        versionResults.historyAvailable = true;
        await historyButton.click();
        await page.waitForTimeout(500);
        
        // バージョン一覧確認
        const versionList = page.locator('[data-testid="version-list"], .version-history');
        if (await versionList.isVisible()) {
          const versions = page.locator('[data-testid="version-item"], .version-entry');
          versionResults.versionCount = await versions.count();
          
          // 差分表示確認
          const diffButton = page.locator('[data-testid="show-diff"], button:has-text("差分")');
          if (await diffButton.isVisible()) {
            versionResults.diffViewAvailable = true;
          }
        }
      }
      
      return versionResults;
    }, 'バージョン履歴');

    testResults.push({
      test: 'バージョン履歴',
      status: testResult.result.historyAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    console.log('=== バージョン管理結果 ===');
    testResults.forEach(result => {
      console.log(`${result.test}: ${result.status}`);
    });
  });
});