/**
 * Playwright Global Setup
 * Sprint2 E2E Test Foundation Framework
 */

import { chromium, firefox, webkit } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalSetup() {
  console.log('🚀 Starting E2E Test Foundation Global Setup...');
  
  try {
    // ブラウザの事前インストール確認
    await ensureBrowsersInstalled();
    
    // テスト環境の準備
    await prepareTestEnvironment();
    
    // 認証状態の設定
    await setupAuthentication();
    
    // テストデータの準備
    await prepareTestData();
    
    // アプリケーションサーバーの起動確認
    await verifyApplicationServer();
    
    console.log('✅ Global Setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global Setup failed:', error);
    throw error;
  }
}

/**
 * ブラウザインストール確認
 */
async function ensureBrowsersInstalled() {
  console.log('🔍 Checking browser installations...');
  
  const browsers = [
    { name: 'Chromium', launcher: chromium },
    { name: 'Firefox', launcher: firefox },
    { name: 'WebKit', launcher: webkit }
  ];
  
  for (const browser of browsers) {
    try {
      const browserInstance = await browser.launcher.launch();
      await browserInstance.close();
      console.log(`✅ ${browser.name} is ready`);
    } catch (error) {
      console.error(`❌ ${browser.name} is not available:`, error.message);
      throw new Error(`Browser ${browser.name} is not properly installed`);
    }
  }
}

/**
 * テスト環境の準備
 */
async function prepareTestEnvironment() {
  console.log('🛠️  Preparing test environment...');
  
  // テスト結果ディレクトリの作成
  const fs = await import('fs/promises');
  const directories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'reports',
    'reports/html',
    'reports/json',
    'reports/junit',
    'reports/allure-results',
    'reports/coverage'
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(path.resolve(__dirname, '..', dir), { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
  }
  
  // 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.E2E_MODE = 'enabled';
  process.env.TEST_ENV = 'playwright';
  
  console.log('✅ Test environment prepared');
}

/**
 * 認証状態の設定
 */
async function setupAuthentication() {
  console.log('🔐 Setting up authentication...');
  
  try {
    // 認証が必要な場合のセットアップ（現在は基本認証なしのため簡略化）
    const authDir = path.resolve(__dirname, '..', 'auth');
    const fs = await import('fs/promises');
    
    try {
      await fs.mkdir(authDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
    
    // ダミーユーザー状態の作成
    const userState = {
      cookies: [],
      origins: [
        {
          origin: process.env.BASE_URL || 'http://localhost:8086',
          localStorage: []
        }
      ]
    };
    
    await fs.writeFile(
      path.resolve(authDir, 'user.json'),
      JSON.stringify(userState, null, 2)
    );
    
    console.log('✅ Authentication setup completed');
  } catch (error) {
    console.warn('⚠️  Authentication setup skipped:', error.message);
  }
}

/**
 * テストデータの準備
 */
async function prepareTestData() {
  console.log('📊 Preparing test data...');
  
  try {
    // テストデータの検証
    const { TestData } = await import('../fixtures/testData.js');
    
    // 基本データの検証
    const requiredDataSets = [
      'basicConversions',
      'characterTypes',
      'diagramTypes',
      'performance'
    ];
    
    for (const dataSet of requiredDataSets) {
      if (!TestData[dataSet]) {
        throw new Error(`Required test data set '${dataSet}' is missing`);
      }
    }
    
    console.log('✅ Test data validation completed');
  } catch (error) {
    console.error('❌ Test data preparation failed:', error);
    throw error;
  }
}

/**
 * アプリケーションサーバーの起動確認
 */
async function verifyApplicationServer() {
  console.log('🌐 Verifying application server...');
  
  const baseURL = process.env.BASE_URL || 'http://localhost:8086';
  const maxRetries = 30; // 30秒間リトライ
  const retryDelay = 1000; // 1秒間隔
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        console.log(`✅ Application server is running at ${baseURL}`);
        return;
      }
    } catch (error) {
      // サーバーがまだ起動していない場合
    }
    
    console.log(`⏳ Waiting for server... (attempt ${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  
  throw new Error(`Application server is not responding at ${baseURL}`);
}

/**
 * ヘルスチェック
 */
async function performHealthCheck() {
  console.log('🏥 Performing health check...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    const baseURL = process.env.BASE_URL || 'http://localhost:8086';
    await page.goto(baseURL);
    
    // 基本要素の存在確認
    await page.waitForSelector('#japaneseInput', { timeout: 10000 });
    await page.waitForSelector('#plantUMLOutput', { timeout: 10000 });
    
    // JavaScript初期化の確認
    await page.waitForFunction(() => {
      return window.PlantUMLParser && window.RealtimeSyncManager;
    }, { timeout: 5000 });
    
    console.log('✅ Health check passed');
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;