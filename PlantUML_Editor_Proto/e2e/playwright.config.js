// Playwright Configuration for Sprint2 E2E Test Framework
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sprint2 E2Eテストフレームワーク設定
 * 55シナリオ対応、Docker最適化、CI/CD統合
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './tests',
  
  // グローバル設定
  globalSetup: path.resolve(__dirname, './setup/global-setup.js'),
  globalTeardown: path.resolve(__dirname, './setup/global-teardown.js'),
  
  // タイムアウト設定
  timeout: 90000, // E2Eテスト包括実行のため延長
  expect: {
    timeout: 15000 // アサーション待機時間
  },
  
  // 並列実行設定
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4, // CI環境では控えめに
  
  // レポート設定
  reporter: [
    ['html', { 
      outputFolder: 'reports/html',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'reports/json/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'reports/junit/results.xml' 
    }],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'reports/allure-results',
      suiteTitle: 'PlantUML Editor E2E Tests'
    }],
    ['list']
  ],
  
  // 共通設定
  use: {
    // ベースURL
    baseURL: process.env.BASE_URL || 'http://localhost:8086',
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // トレース設定
    trace: 'on-first-retry',
    
    // アクションタイムアウト
    actionTimeout: 20000,
    
    // ナビゲーションタイムアウト
    navigationTimeout: 60000,
    
    // ロケール設定
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    
    // 追加設定
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    
    // ビューポート設定
    viewport: { width: 1920, height: 1080 }
  },
  
  // プロジェクト設定（55シナリオ対応）
  projects: [
    // デスクトップブラウザ - 基本機能テスト
    {
      name: 'chromium-basic',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'auth/user.json'
      },
      testMatch: 'scenarios/basic/*.spec.js'
    },
    {
      name: 'firefox-basic',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'auth/user.json'
      },
      testMatch: 'scenarios/basic/*.spec.js'
    },
    {
      name: 'webkit-basic',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'auth/user.json'
      },
      testMatch: 'scenarios/basic/*.spec.js'
    },
    {
      name: 'edge-basic',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: 'auth/user.json'
      },
      testMatch: 'scenarios/basic/*.spec.js'
    },

    // エディター機能テスト（最重要）
    {
      name: 'chromium-editor',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/editor/*.spec.js'
    },
    {
      name: 'firefox-editor',
      use: { ...devices['Desktop Firefox'] },
      testMatch: 'scenarios/editor/*.spec.js'
    },

    // 図表タイプテスト
    {
      name: 'chromium-diagrams',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/diagrams/*.spec.js'
    },

    // インライン編集テスト
    {
      name: 'chromium-inline',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/inline/*.spec.js'
    },

    // エラーハンドリングテスト
    {
      name: 'chromium-error',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/error/*.spec.js'
    },

    // パフォーマンステスト
    {
      name: 'chromium-performance',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
      testMatch: 'scenarios/performance/*.spec.js'
    },

    // セキュリティテスト
    {
      name: 'chromium-security',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
      testMatch: 'scenarios/security/*.spec.js'
    },

    // アクセシビリティテスト
    {
      name: 'chromium-accessibility',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/accessibility/*.spec.js'
    },

    // 統合テスト
    {
      name: 'chromium-integration',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/integration/*.spec.js'
    },

    // 回帰テスト
    {
      name: 'chromium-regression',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/regression/*.spec.js'
    },

    // ストレステスト
    {
      name: 'chromium-stress',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--max-old-space-size=4096']
        }
      },
      testMatch: 'scenarios/stress/*.spec.js'
    },

    // クロスブラウザテスト
    {
      name: 'cross-browser',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'scenarios/cross-browser/*.spec.js'
    },

    // モバイルテスト（基本機能のみ）
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: 'scenarios/basic/mobile-*.spec.js'
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: 'scenarios/basic/mobile-*.spec.js'
    }
  ],
  
  // 開発サーバー設定
  webServer: {
    command: process.env.CI 
      ? 'npm run start:ci'
      : 'npm run start:node',
    url: 'http://localhost:8086',
    port: 8086,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    
    // ヘルスチェック
    stdout: 'pipe',
    stderr: 'pipe',
    
    // 環境変数
    env: {
      NODE_ENV: 'test',
      E2E_MODE: 'enabled',
      TEST_ENV: 'playwright'
    }
  },
  
  // リトライ設定
  retries: process.env.CI ? 2 : 1,
  
  // 出力ディレクトリ
  outputDir: 'test-results/',
  
  // メタデータ
  metadata: {
    testFramework: 'playwright',
    version: '2.0.0',
    sprint: 'Sprint2',
    totalScenarios: 55,
    categories: [
      'basic', 'editor', 'diagrams', 'inline', 'error',
      'performance', 'security', 'accessibility', 'integration',
      'regression', 'stress', 'cross-browser'
    ]
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
    '**/build/**',
    '**/reports/**',
    '**/temp/**'
  ],

  // 依存関係設定
  dependencies: [
    'chromium-basic',
    'firefox-basic',
    'webkit-basic'
  ]
});