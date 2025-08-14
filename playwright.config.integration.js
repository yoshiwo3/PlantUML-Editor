/**
 * Playwright統合テスト設定 - PlantUMLプロジェクト
 * 
 * この設定ファイルは以下の機能を提供します:
 * - MCP統合対応のE2Eテスト
 * - 並行テスト実行（2ワーカー）
 * - 複数ブラウザ対応（Chromium, Firefox, Edge）
 * - 日本語テストレポート生成
 * - スクリーンショット・動画録画
 * - CI/CD環境対応
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * 環境変数から設定を取得
 */
const {
  BASE_URL = 'http://localhost:8086',
  CI = false,
  BROWSER = 'chromium',
  PARALLEL_WORKERS = '2',
  MCP_INTEGRATION = 'true',
  PERFORMANCE_THRESHOLD = '5000'
} = process.env;

export default defineConfig({
  // テストディレクトリ
  testDir: './tests',
  
  // テストファイルパターン
  testMatch: [
    '**/e2e/**/*.spec.js',
    '**/e2e/**/*.test.js',
    '**/playwright-mcp/**/*.spec.js',
    '**/integration/**/*.e2e.js'
  ],
  
  // フルパッケージモード（詳細レポート）
  fullyParallel: true,
  
  // 失敗時に他のテストを停止しない
  forbidOnly: !!CI,
  
  // リトライ設定
  retries: CI ? 2 : 0,
  
  // 並行実行ワーカー数
  workers: parseInt(PARALLEL_WORKERS),
  
  // 全体タイムアウト（30分）
  globalTimeout: 30 * 60 * 1000,
  
  // 個別テストタイムアウト（5分）
  timeout: 5 * 60 * 1000,
  
  // アクションタイムアウト（30秒）
  expect: {
    timeout: 30 * 1000,
    // スクリーンショット比較設定
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'pixel'
    },
    toMatchSnapshot: {
      threshold: 0.2
    }
  },
  
  // レポーター設定（日本語対応）
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: 'playwright-report',
      open: CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    [
      './test-utils/japanese-playwright-reporter.js',
      {
        outputFile: 'test-results/playwright-results-ja.json',
        open: false
      }
    ]
  ],
  
  // 出力ディレクトリ
  outputDir: 'test-results',
  
  // グローバル設定
  globalSetup: require.resolve('./test-utils/playwright-global-setup.js'),
  globalTeardown: require.resolve('./test-utils/playwright-global-teardown.js'),
  
  // 共通設定
  use: {
    // ベースURL
    baseURL: BASE_URL,
    
    // 追跡設定
    trace: CI ? 'retain-on-failure' : 'on-first-retry',
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    
    // 動画録画設定
    video: CI ? 'retain-on-failure' : 'on-first-retry',
    
    // ビューポート設定
    viewport: { width: 1280, height: 720 },
    
    // 無視するHTTPSエラー
    ignoreHTTPSErrors: true,
    
    // タイムアウト設定
    actionTimeout: 30 * 1000,
    navigationTimeout: 60 * 1000,
    
    // 日本語対応
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    
    // 追加のコンテキスト設定
    extraHTTPHeaders: {
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
    },
    
    // MCP統合設定
    ...(MCP_INTEGRATION === 'true' && {
      storageState: {
        cookies: [],
        origins: [
          {
            origin: BASE_URL,
            localStorage: [
              {
                name: 'mcp-enabled',
                value: 'true'
              }
            ]
          }
        ]
      }
    })
  },
  
  // プロジェクト設定（ブラウザ別）
  projects: [
    // スモークテスト（基本機能確認）
    {
      name: 'smoke-chromium',
      testDir: './tests/e2e/smoke',
      use: { ...devices['Desktop Chrome'] },
      dependencies: []
    },
    
    // クリティカルパステスト（重要機能）
    {
      name: 'critical-chromium',
      testDir: './tests/e2e/critical',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['smoke-chromium']
    },
    
    // 互換性テスト
    {
      name: 'compatibility-firefox',
      testDir: './tests/e2e/compatibility',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['critical-chromium']
    },
    
    {
      name: 'compatibility-edge',
      testDir: './tests/e2e/compatibility',
      use: { ...devices['Desktop Edge'] },
      dependencies: ['critical-chromium']
    },
    
    // MCP統合テスト
    {
      name: 'mcp-integration',
      testDir: './tests/playwright-mcp',
      use: { 
        ...devices['Desktop Chrome'],
        // MCP特有の設定
        extraHTTPHeaders: {
          'X-MCP-Integration': 'true',
          'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
        }
      },
      dependencies: ['smoke-chromium'],
      timeout: 2 * 60 * 1000 // MCPテストは時間がかかる可能性
    },
    
    // モバイルテスト
    {
      name: 'mobile-chrome',
      testDir: './tests/e2e/mobile',
      use: { ...devices['Pixel 5'] },
      dependencies: ['critical-chromium']
    },
    
    {
      name: 'mobile-safari',
      testDir: './tests/e2e/mobile',
      use: { ...devices['iPhone 12'] },
      dependencies: ['critical-chromium']
    },
    
    // パフォーマンステスト
    {
      name: 'performance',
      testDir: './tests/e2e/performance',
      use: { 
        ...devices['Desktop Chrome'],
        // パフォーマンス測定用の設定
        launchOptions: {
          args: ['--enable-precise-memory-info', '--enable-precise-timing']
        }
      },
      dependencies: ['critical-chromium'],
      timeout: parseInt(PERFORMANCE_THRESHOLD)
    }
  ],
  
  // ウェブサーバー設定（テスト実行時に自動起動）
  webServer: [
    {
      command: 'cd jp2plantuml && npm start',
      port: 8086,
      reuseExistingServer: !CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: 'test',
        PORT: '8086'
      }
    }
  ],
  
  // アーティファクト保存設定
  preserveOutput: 'failures-only',
  
  // 失敗時のアーティファクト
  artifacts: {
    mode: 'retain-on-failure',
    outputDir: './test-results/artifacts'
  },
  
  // テストファイル発見設定
  testIgnore: [
    '**/node_modules/**',
    '**/coverage/**',
    '**/debug/**',
    '**/.git/**'
  ],
  
  // 設定検証
  forbidOnly: !!CI,
  
  // 実験的機能
  experimental: {
    // 並行実行での依存関係管理
    testIdAttribute: 'data-testid'
  }
});

/**
 * プロジェクト固有の設定オーバーライド
 */
if (process.env.NODE_ENV === 'ci') {
  // CI環境での最適化
  module.exports.use.trace = 'retain-on-failure';
  module.exports.use.video = 'retain-on-failure';
  module.exports.retries = 3;
  module.exports.workers = 1; // CI環境では安定性を優先
}

/**
 * 開発環境での設定
 */
if (process.env.NODE_ENV === 'development') {
  module.exports.use.trace = 'on';
  module.exports.use.video = 'on';
  module.exports.use.screenshot = 'on';
  module.exports.workers = 1; // デバッグしやすくするため
}