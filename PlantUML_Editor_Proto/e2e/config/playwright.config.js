// TEST-E2E-001: E2Eテストフレームワーク構築
// Playwright設定ファイル - エンタープライズレベル設定
import { defineConfig, devices } from '@playwright/test';

const config = defineConfig({
  // テスト設定
  testDir: '../tests',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,
  
  // レポート設定
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // 出力設定
  outputDir: 'test-results/',
  use: {
    // 基本設定
    baseURL: process.env.BASE_URL || 'http://localhost:8086',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // ブラウザ設定
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // パフォーマンス設定
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // セキュリティ設定
    extraHTTPHeaders: {
      'X-Test-Run': 'true',
      'User-Agent': 'PlaywrightE2E/1.0'
    }
  },
  
  // プロジェクト別設定
  projects: [
    // デスクトップブラウザ
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true
          }
        }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        launchOptions: {
          args: ['--disable-web-security']
        }
      },
    },
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge'
      },
    },
    
    // モバイルブラウザ
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // セットアップ・ティアダウン
    {
      name: 'setup',
      testMatch: '**/setup.spec.js',
      teardown: 'cleanup'
    },
    {
      name: 'cleanup',
      testMatch: '**/cleanup.spec.js'
    }
  ],
  
  // Webサーバー設定（開発用）
  webServer: process.env.CI ? undefined : {
    command: 'npm start',
    port: 8086,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test'
    }
  },
  
  // グローバルセットアップ
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),
});

export default config;