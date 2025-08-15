// Playwright Configuration for E2E Testing
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',
  
  // グローバル設定
  globalSetup: require.resolve('./tests/setup/global.setup.js'),
  globalTeardown: require.resolve('./tests/setup/global.teardown.js'),
  
  // タイムアウト設定
  timeout: 60000, // セキュリティテストは時間がかかる可能性
  expect: {
    timeout: 10000 // セキュリティ検証のタイムアウト延長
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
    baseURL: 'http://localhost:8087', // セキュリティ強化版ポート
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // トレース設定
    trace: 'on-first-retry',
    
    // アクションタイムアウト
    actionTimeout: 15000, // セキュリティチェック処理時間考慮
    
    // ナビゲーションタイムアウト
    navigationTimeout: 45000, // セキュリティシステム初期化時間考慮
    
    // セキュリティテスト固有設定
    ignoreHTTPSErrors: true,
    
    // コンソールログ取得（セキュリティ監視用）
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    },
    
    // 追加のコンテキストオプション
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo'
  },
  
  // プロジェクト設定（セキュリティテスト対応）
  projects: [
    // デスクトップブラウザ（セキュリティテスト優先）
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chromiumセキュリティ設定
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-logging=stderr',
            '--v=1'
          ]
        }
      }
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefoxセキュリティ設定
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'localhost',
            'devtools.console.stdout.content': true
          }
        }
      }
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKitセキュリティ設定
        launchOptions: {
          args: [
            '--disable-web-security'
          ]
        }
      }
    },
    {
      name: 'msedge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        // Edgeセキュリティ設定
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      }
    },
    
    // セキュリティ特化テスト（ヘッドレス）
    {
      name: 'security-chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-logging=stderr',
            '--v=1',
            '--disable-extensions',
            '--disable-plugins'
          ]
        }
      },
      testMatch: '**/*security*.spec.js'
    },
    
    // モバイルテスト（基本的なセキュリティ確認のみ）
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: '**/*security*.spec.js' // セキュリティテストは除外
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testIgnore: '**/*security*.spec.js' // セキュリティテストは除外
    }
  ],
  
  // 開発サーバー設定（セキュリティ強化版）
  webServer: {
    command: 'npx http-server -p 8087 -c-1 --cors',
    url: 'http://localhost:8087',
    port: 8087,
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // セキュリティシステム初期化時間考慮
    
    // ヘルスチェック
    stdout: 'pipe',
    stderr: 'pipe',
    
    // 環境変数
    env: {
      NODE_ENV: 'test',
      SECURITY_MODE: 'enabled',
      TEST_ENV: 'playwright'
    }
  },
  
  // リトライ設定（セキュリティテストは安定性重視）
  retries: process.env.CI ? 3 : 1,
  
  // 出力ディレクトリ
  outputDir: 'test-results/',
  
  // セキュリティテスト固有設定
  metadata: {
    testType: 'security-e2e',
    securityLevel: 'enhanced',
    validationEngine: 'enabled',
    cspManager: 'enabled',
    securityMonitor: 'enabled'
  },
  
  // テストマッチング
  testMatch: [
    '**/*.spec.js',
    '**/*.test.js'
  ],
  
  // テスト無視パターン
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ]
});