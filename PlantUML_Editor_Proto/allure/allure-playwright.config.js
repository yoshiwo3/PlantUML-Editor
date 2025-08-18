/**
 * Playwright向けAllure統合設定
 * 詳細なテスト実行情報とスクリーンショット、ビデオを含むレポート生成
 */

const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: '../E2Eテスト/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Allureレポーター設定
  reporter: [
    // Allureレポーター（メイン）
    ['allure-playwright', {
      outputFolder: 'allure-results',
      suiteTitle: 'PlantUML Editor E2E Tests',
      categories: './allure/categories.json',
      environmentInfo: './allure/environment.properties',
      detail: true,
      
      // リンク設定
      links: [
        {
          name: 'GitHub Repository',
          url: 'https://github.com/your-org/plantuml-editor-proto',
          type: 'vcs'
        },
        {
          name: 'Test Documentation', 
          url: 'https://docs.example.com/testing',
          type: 'tms'
        },
        {
          name: 'Bug Tracker',
          url: 'https://github.com/your-org/plantuml-editor-proto/issues',
          type: 'issue'
        }
      ],

      // スクリーンショット設定
      attachScreenshotOnFailure: true,
      attachScreenshotOnSuccess: false,
      
      // ビデオ設定
      attachVideoOnFailure: true,
      attachVideoOnSuccess: false,
      
      // トレース設定
      attachTraceOnFailure: true,
      attachTraceOnSuccess: false,
      
      // ログ設定
      attachConsoleLogsOnFailure: true,
      
      // ステップ詳細設定
      includeSteps: true,
      includeSubSteps: true,
      
      // カスタムラベル
      defaultLabels: {
        framework: 'playwright',
        language: 'javascript',
        testType: 'e2e'
      }
    }],
    
    // HTMLレポーター（補助）
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    
    // JUnitレポーター（CI統合用）
    ['junit', { 
      outputFile: 'test-results/junit.xml'
    }],
    
    // JSONレポーター（データ分析用）
    ['json', { 
      outputFile: 'test-results/results.json'
    }],
    
    // ライン出力（コンソール表示）
    ['line']
  ],

  use: {
    // グローバル設定
    baseURL: process.env.BASE_URL || 'http://localhost:8086',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Allure用メタデータ
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // ヘッダー設定
    extraHTTPHeaders: {
      'X-Test-Framework': 'Playwright-Allure',
      'X-Test-Environment': process.env.TEST_ENV || 'docker'
    }
  },

  // プロジェクト設定（各ブラウザ）
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1280, height: 720 }
      },
    },
    
    // モバイル設定
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // パフォーマンステスト専用
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
      testMatch: '**/performance-*.spec.js'
    }
  ],

  // ローカル開発サーバー設定
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:server',
    port: 8086,
    reuseExistingServer: !process.env.CI,
    cwd: '..'
  },

  // テスト結果ディレクトリ
  outputDir: 'test-results/',
  
  // グローバルセットアップ
  globalSetup: './allure/allure-global-setup.js',
  globalTeardown: './allure/allure-global-teardown.js'
});