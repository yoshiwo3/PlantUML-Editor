/**
 * ユーザージャーニーテスト用ヘルパー関数
 */

import { expect } from '@playwright/test';
import { personas, testData, journeyActions, successCriteria } from './personas.js';

/**
 * ペルソナベースのページ初期化
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} personaType - ペルソナタイプ (firstTimeUser, powerUser, collaborator)
 */
export async function initializeForPersona(page, personaType) {
  const persona = personas[personaType];
  
  // ページアクセス
  await page.goto('http://localhost:8086');
  
  // ペルソナ固有の初期設定
  if (personaType === 'firstTimeUser') {
    // 初心者向けヘルプモード有効化
    await page.evaluate(() => {
      localStorage.setItem('helpMode', 'beginner');
      localStorage.setItem('showTooltips', 'true');
    });
  } else if (personaType === 'powerUser') {
    // 上級者向け設定
    await page.evaluate(() => {
      localStorage.setItem('helpMode', 'expert');
      localStorage.setItem('showShortcuts', 'true');
      localStorage.setItem('enableAdvancedFeatures', 'true');
    });
  } else if (personaType === 'collaborator') {
    // チーム作業向け設定
    await page.evaluate(() => {
      localStorage.setItem('collaborationMode', 'true');
      localStorage.setItem('showComments', 'true');
    });
  }
  
  // ページリロードで設定反映
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  console.log(`初期化完了: ${persona.name} (${persona.role})`);
}

/**
 * チュートリアル完了フロー
 * @param {Page} page - Playwrightページオブジェクト
 * @param {boolean} skipTutorial - チュートリアルをスキップするか
 */
export async function completeTutorial(page, skipTutorial = false) {
  const startTime = Date.now();
  
  if (skipTutorial) {
    // チュートリアルスキップ
    if (await page.locator(journeyActions.onboarding.skipTutorial).isVisible()) {
      await page.click(journeyActions.onboarding.skipTutorial);
    }
  } else {
    // チュートリアル実行
    if (await page.locator(journeyActions.onboarding.startTutorial).isVisible()) {
      await page.click(journeyActions.onboarding.startTutorial);
      
      // チュートリアルステップを順番に実行
      let stepCount = 0;
      while (await page.locator(journeyActions.onboarding.nextStep).isVisible() && stepCount < 10) {
        await page.click(journeyActions.onboarding.nextStep);
        await page.waitForTimeout(1000); // ステップ間の待機
        stepCount++;
      }
      
      // チュートリアル完了
      if (await page.locator(journeyActions.onboarding.completeTutorial).isVisible()) {
        await page.click(journeyActions.onboarding.completeTutorial);
      }
    }
  }
  
  const completionTime = Date.now() - startTime;
  console.log(`チュートリアル完了時間: ${completionTime}ms`);
  
  return completionTime;
}

/**
 * 基本的な図表作成フロー
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} inputText - 入力テキスト
 * @param {Array} expectedElements - 期待される要素
 */
export async function createBasicDiagram(page, inputText, expectedElements = []) {
  const startTime = Date.now();
  
  // 日本語入力
  const inputSelector = '[data-testid="japanese-input"]';
  await page.waitForSelector(inputSelector);
  await page.fill(inputSelector, inputText);
  
  // リアルタイム変換待機
  await page.waitForTimeout(500);
  
  // PlantUMLコード確認
  const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
  expect(plantUMLOutput).toContain('@startuml');
  expect(plantUMLOutput).toContain('@enduml');
  
  // 期待される要素の確認
  for (const element of expectedElements) {
    expect(plantUMLOutput).toContain(element);
  }
  
  const creationTime = Date.now() - startTime;
  console.log(`図表作成時間: ${creationTime}ms`);
  
  return {
    creationTime,
    plantUMLCode: plantUMLOutput
  };
}

/**
 * 7要素構成の操作テスト
 * @param {Page} page - Playwrightページオブジェクト
 */
export async function testSevenElementStructure(page) {
  const elements = [
    'dragHandle',
    'actorFrom', 
    'arrowType',
    'actorTo',
    'message',
    'deleteButton',
    'questionButton'
  ];
  
  const results = {};
  
  for (const element of elements) {
    const selector = journeyActions.basicActions[element] || `[data-testid="${element}"]`;
    
    try {
      // 要素の存在確認
      await page.waitForSelector(selector, { timeout: 5000 });
      const isVisible = await page.isVisible(selector);
      const isEnabled = await page.isEnabled(selector);
      
      results[element] = {
        exists: true,
        visible: isVisible,
        enabled: isEnabled
      };
      
      // 基本操作テスト
      if (isEnabled && isVisible) {
        if (element === 'dragHandle') {
          // ドラッグ操作テスト
          const bounds = await page.locator(selector).boundingBox();
          if (bounds) {
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(bounds.x + 50, bounds.y + 50);
            await page.mouse.up();
            results[element].dragTest = 'success';
          }
        } else if (element.includes('Button')) {
          // ボタンクリックテスト
          await page.click(selector);
          results[element].clickTest = 'success';
        } else if (element.includes('SELECT')) {
          // 選択操作テスト
          await page.click(selector);
          results[element].selectTest = 'success';
        }
      }
    } catch (error) {
      results[element] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  return results;
}

/**
 * パフォーマンス測定
 * @param {Page} page - Playwrightページオブジェクト
 * @param {Function} testFunction - 測定対象の関数
 * @param {string} testName - テスト名
 */
export async function measurePerformance(page, testFunction, testName) {
  const startTime = Date.now();
  
  // メモリ使用量測定開始
  const initialMemory = await page.evaluate(() => {
    return performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null;
  });
  
  // テスト実行
  const result = await testFunction();
  
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  
  // メモリ使用量測定終了
  const finalMemory = await page.evaluate(() => {
    return performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null;
  });
  
  const performanceMetrics = {
    testName,
    executionTime,
    initialMemory,
    finalMemory,
    memoryDelta: finalMemory ? (finalMemory.used - initialMemory.used) : null,
    result
  };
  
  console.log(`パフォーマンス測定 - ${testName}:`, performanceMetrics);
  
  return performanceMetrics;
}

/**
 * エラーハンドリングテスト
 * @param {Page} page - Playwrightページオブジェクト
 * @param {Function} errorProducingAction - エラーを発生させるアクション
 * @param {string} expectedErrorType - 期待されるエラータイプ
 */
export async function testErrorHandling(page, errorProducingAction, expectedErrorType) {
  let errorCaught = false;
  let errorMessage = '';
  
  // コンソールエラー監視
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errorCaught = true;
      errorMessage = msg.text();
    }
  });
  
  // ページエラー監視
  page.on('pageerror', error => {
    errorCaught = true;
    errorMessage = error.message;
  });
  
  try {
    await errorProducingAction();
  } catch (error) {
    errorCaught = true;
    errorMessage = error.message;
  }
  
  // エラーメッセージ表示の確認
  const errorNotification = await page.locator('[data-testid="error-notification"]').isVisible();
  
  return {
    errorCaught,
    errorMessage,
    errorNotificationShown: errorNotification,
    expectedErrorType
  };
}

/**
 * アクセシビリティテスト
 * @param {Page} page - Playwrightページオブジェクト
 */
export async function testAccessibility(page) {
  const accessibilityResults = {
    keyboardNavigation: false,
    ariaLabels: false,
    colorContrast: false,
    screenReaderSupport: false
  };
  
  // キーボードナビゲーションテスト
  try {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    if (focusedElement) {
      accessibilityResults.keyboardNavigation = true;
    }
  } catch (error) {
    console.warn('キーボードナビゲーションテストでエラー:', error.message);
  }
  
  // ARIA属性確認
  const ariaElements = await page.locator('[aria-label], [aria-describedby], [role]').count();
  accessibilityResults.ariaLabels = ariaElements > 0;
  
  // スクリーンリーダー対応確認
  const screenReaderElements = await page.locator('[data-testid*="sr-"], .sr-only').count();
  accessibilityResults.screenReaderSupport = screenReaderElements > 0;
  
  return accessibilityResults;
}

/**
 * ユーザビリティスコア計算
 * @param {Object} metrics - 測定メトリクス
 * @param {string} personaType - ペルソナタイプ
 */
export function calculateUsabilityScore(metrics, personaType) {
  const criteria = successCriteria[personaType];
  let score = 0;
  let maxScore = 100;
  
  // 実行時間評価 (40点満点)
  if (metrics.executionTime) {
    const timeRatio = metrics.executionTime / criteria.tutorialCompletion;
    if (timeRatio <= 1.0) {
      score += 40;
    } else if (timeRatio <= 1.5) {
      score += 30;
    } else if (timeRatio <= 2.0) {
      score += 20;
    } else {
      score += 10;
    }
  }
  
  // エラー率評価 (30点満点)
  if (metrics.errorRate !== undefined) {
    if (metrics.errorRate <= criteria.errorRate) {
      score += 30;
    } else if (metrics.errorRate <= criteria.errorRate * 2) {
      score += 20;
    } else {
      score += 10;
    }
  }
  
  // 機能完了率評価 (30点満点)
  if (metrics.completionRate !== undefined) {
    score += Math.round(metrics.completionRate * 30);
  }
  
  return Math.min(score, maxScore);
}

/**
 * ジャーニーテストレポート生成
 * @param {string} personaType - ペルソナタイプ
 * @param {Array} testResults - テスト結果配列
 */
export function generateJourneyReport(personaType, testResults) {
  const persona = personas[personaType];
  const report = {
    persona: persona,
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.status === 'passed').length,
      failedTests: testResults.filter(r => r.status === 'failed').length,
      averageExecutionTime: testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) / testResults.length
    },
    details: testResults,
    recommendations: []
  };
  
  // ペルソナ別推奨事項
  if (personaType === 'firstTimeUser') {
    if (report.summary.averageExecutionTime > successCriteria.firstTimeUser.tutorialCompletion) {
      report.recommendations.push('チュートリアルの簡略化を検討');
    }
  } else if (personaType === 'powerUser') {
    if (report.summary.failedTests > 0) {
      report.recommendations.push('高度な機能の安定性向上が必要');
    }
  } else if (personaType === 'collaborator') {
    if (report.summary.averageExecutionTime > successCriteria.collaboration.sharing) {
      report.recommendations.push('共有機能のパフォーマンス改善が必要');
    }
  }
  
  return report;
}

export default {
  initializeForPersona,
  completeTutorial,
  createBasicDiagram,
  testSevenElementStructure,
  measurePerformance,
  testErrorHandling,
  testAccessibility,
  calculateUsabilityScore,
  generateJourneyReport
};