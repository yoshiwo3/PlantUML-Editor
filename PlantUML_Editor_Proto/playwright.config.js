// Playwright Configuration for E2E Testing
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',
  
  // タイムアウト設定
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  
  // 並列実行
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  
  // レポート設定
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],
  
  // 共通設定
  use: {
    // ベースURL
    baseURL: 'http://localhost:8080',
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // トレース設定
    trace: 'on-first-retry',
    
    // アクションタイムアウト
    actionTimeout: 10000,
    
    // ナビゲーションタイムアウト
    navigationTimeout: 30000
  },
  
  // プロジェクト設定（ブラウザ別）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'] }
    },
    // モバイルテスト
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  
  // 開発サーバー設定
  webServer: {
    command: 'npm run start:node',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  
  // リトライ設定
  retries: process.env.CI ? 2 : 0,
  
  // 出力ディレクトリ
  outputDir: 'test-results/'
});