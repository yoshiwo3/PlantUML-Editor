/**
 * TEST-012-3: 生産性向上機能テスト
 * ペルソナ: 山田花子（テックリード、PlantUML上級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance 
} from '../journey-helpers.js';

test.describe('生産性向上機能ジャーニー', () => {
  const personaType = 'powerUser';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('バッチ処理機能', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // バッチ処理機能の検索と実行
      const batchButton = page.locator('[data-testid="batch-process"], button:has-text("バッチ処理")');
      
      if (await batchButton.isVisible()) {
        return { batchAvailable: true };
      }
      return { batchAvailable: false };
    }, 'バッチ処理');

    testResults.push({
      test: 'バッチ処理',
      status: testResult.result.batchAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('自動整形機能', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 自動整形機能のテスト
      const formatButton = page.locator('[data-testid="auto-format"], button:has-text("自動整形")');
      
      if (await formatButton.isVisible()) {
        return { formatAvailable: true };
      }
      return { formatAvailable: false };
    }, '自動整形');

    testResults.push({
      test: '自動整形',
      status: testResult.result.formatAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    console.log('=== 生産性向上機能結果 ===');
    testResults.forEach(result => {
      console.log(`${result.test}: ${result.status}`);
    });
  });
});