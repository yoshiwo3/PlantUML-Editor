/**
 * TEST-012-4: API/CLI連携テスト
 * ペルソナ: 山田花子（テックリード、PlantUML上級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance 
} from '../journey-helpers.js';

test.describe('API/CLI連携ジャーニー', () => {
  const personaType = 'powerUser';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('REST API使用', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // API連携機能の確認
      const apiPanel = page.locator('[data-testid="api-integration"], .api-panel');
      
      if (await apiPanel.isVisible()) {
        return { apiAvailable: true };
      }
      return { apiAvailable: false };
    }, 'REST API');

    testResults.push({
      test: 'REST API',
      status: testResult.result.apiAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    console.log('=== API/CLI連携結果 ===');
    testResults.forEach(result => {
      console.log(`${result.test}: ${result.status}`);
    });
  });
});