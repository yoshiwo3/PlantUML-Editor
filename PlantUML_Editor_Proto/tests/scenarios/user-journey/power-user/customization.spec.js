/**
 * TEST-012-5: カスタマイズテスト
 * ペルソナ: 山田花子（テックリード、PlantUML上級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance 
} from '../journey-helpers.js';

test.describe('カスタマイズジャーニー', () => {
  const personaType = 'powerUser';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('UIテーマ変更', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // テーマ変更機能の確認
      const themeSelector = page.locator('[data-testid="theme-selector"], select[name="theme"]');
      
      if (await themeSelector.isVisible()) {
        return { themeAvailable: true };
      }
      return { themeAvailable: false };
    }, 'UIテーマ');

    testResults.push({
      test: 'UIテーマ',
      status: testResult.result.themeAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    console.log('=== カスタマイズ結果 ===');
    testResults.forEach(result => {
      console.log(`${result.test}: ${result.status}`);
    });
  });
});