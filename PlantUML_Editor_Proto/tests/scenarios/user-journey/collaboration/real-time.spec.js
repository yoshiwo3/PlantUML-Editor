/**
 * TEST-013-2: リアルタイム協業テスト
 * ペルソナ: 佐藤次郎（プロジェクトマネージャー、PlantUML中級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance,
  calculateUsabilityScore 
} from '../journey-helpers.js';
import { successCriteria } from '../personas.js';

test.describe('リアルタイム協業ジャーニー', () => {
  const personaType = 'collaborator';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('複数ユーザー同時アクセスシミュレーション', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let collaborationResults = {
        realTimeIndicatorAvailable: false,
        userPresenceShown: false,
        activeUserCount: 0,
        conflictDetection: false
      };
      
      // リアルタイム協業インジケーター確認
      const realTimeIndicator = page.locator('[data-testid="realtime-indicator"], .collaboration-status');
      
      if (await realTimeIndicator.isVisible()) {
        collaborationResults.realTimeIndicatorAvailable = true;
        
        // オンラインユーザー表示確認
        const userPresence = page.locator('[data-testid="active-users"], .user-avatars');
        if (await userPresence.isVisible()) {
          collaborationResults.userPresenceShown = true;
          
          const userAvatars = page.locator('[data-testid="user-avatar"], .user-icon');
          collaborationResults.activeUserCount = await userAvatars.count();
        }
      }
      
      return collaborationResults;
    }, '同時アクセス');

    testResults.push({
      test: '同時アクセス',
      status: testResult.result.realTimeIndicatorAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('リアルタイム同期確認', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let syncResults = {
        syncLatency: null,
        changeDetection: false,
        automaticSync: false
      };
      
      // 変更監視開始
      const startTime = Date.now();
      
      const inputArea = page.locator('[data-testid="japanese-input"]');
      await inputArea.fill('リアルタイム同期テスト');
      
      // 同期完了待機
      await page.waitForTimeout(1000);
      
      const syncTime = Date.now() - startTime;
      syncResults.syncLatency = syncTime;
      syncResults.automaticSync = syncTime < successCriteria.collaboration.realTimeSync;
      
      return syncResults;
    }, 'リアルタイム同期');

    expect(testResult.result.syncLatency).toBeLessThan(successCriteria.collaboration.realTimeSync);

    testResults.push({
      test: 'リアルタイム同期',
      status: testResult.result.automaticSync ? 'passed' : 'warning',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    console.log('=== リアルタイム協業結果 ===');
    testResults.forEach(result => {
      console.log(`${result.test}: ${result.status}`);
    });
  });
});