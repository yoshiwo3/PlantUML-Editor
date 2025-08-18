// グローバルセットアップ - テスト実行前準備
import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup(config) {
  console.log('🚀 E2E テストグローバルセットアップ開始');

  // テスト結果ディレクトリ作成
  const testDirs = [
    'test-results',
    'playwright-report',
    'allure-results',
    'coverage',
    'screenshots'
  ];

  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.warn(`ディレクトリ作成警告 ${dir}:`, error.message);
    }
  }

  // アプリケーション起動確認
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('📡 アプリケーション接続確認中...');
    await page.goto(config.use.baseURL, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // ヘルスチェック
    const title = await page.title();
    console.log(`✅ アプリケーション確認完了: ${title}`);
    
    // 初期データセットアップ
    await setupTestData();
    
    // パフォーマンスベンチマーク取得
    await collectBaseline(page);
    
  } catch (error) {
    console.error('❌ セットアップエラー:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ グローバルセットアップ完了');
}

async function setupTestData() {
  const testData = {
    timestamp: new Date().toISOString(),
    users: [
      { id: 'test-user-1', name: 'テストユーザー1' },
      { id: 'test-user-2', name: 'テストユーザー2' }
    ],
    diagrams: [
      {
        id: 'sample-sequence',
        name: 'サンプルシーケンス図',
        content: 'ユーザー -> システム: ログイン要求\nシステム -> データベース: 認証確認\nデータベース -> システム: 認証結果\nシステム -> ユーザー: ログイン完了'
      },
      {
        id: 'sample-class',
        name: 'サンプルクラス図',
        content: 'クラス User {\n  - id: string\n  - name: string\n  + login(): boolean\n}'
      }
    ],
    testCases: {
      performance: {
        baseline: {
          loadTime: 3000,
          renderTime: 1000,
          memoryUsage: 50 * 1024 * 1024
        }
      }
    }
  };

  await fs.writeFile(
    'test-results/test-data.json', 
    JSON.stringify(testData, null, 2)
  );
}

async function collectBaseline(page) {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };
  });

  await fs.writeFile(
    'test-results/baseline-metrics.json',
    JSON.stringify(metrics, null, 2)
  );
  
  console.log('📊 ベースラインメトリクス記録完了');
}

export default globalSetup;