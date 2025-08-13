/**
 * Playwright設定ファイル
 * PlantUMLエディタのE2Eテスト用設定
 * @see https://playwright.dev/docs/test-configuration
 */

const { defineConfig, devices } = require('@playwright/test');

/**
 * 環境変数から設定を読み込み
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
const CI = process.env.CI === 'true';

module.exports = defineConfig({
  // テストディレクトリ
  testDir: './tests',
  
  // テストマッチパターン
  testMatch: [
    '**/*.spec.js',
    '**/*.test.js',
    '**/test-*.js'
  ],

  // タイムアウト設定
  timeout: 30 * 1000,        // 各テストのタイムアウト: 30秒
  expect: {
    timeout: 10 * 1000       // expect()のタイムアウト: 10秒
  },

  // 並列実行設定
  fullyParallel: true,       // テストを完全並列実行
  workers: CI ? 1 : undefined, // CI環境では1ワーカー、ローカルでは自動
  
  // リトライ設定
  retries: CI ? 2 : 0,       // CI環境では2回リトライ
  
  // レポーター設定
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],                 // コンソールにリスト形式で出力
    ['json', { outputFile: 'test-results/results.json' }],
    CI ? ['github'] : null    // CI環境ではGitHub Actions用レポーター
  ].filter(Boolean),

  // グローバル設定
  use: {
    // ベースURL
    baseURL: BASE_URL,
    
    // スクリーンショット設定
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // ビデオ録画設定
    video: CI ? 'retain-on-failure' : 'off',
    
    // トレース設定（デバッグ用）
    trace: CI ? 'on-first-retry' : 'off',
    
    // アクションのタイムアウト
    actionTimeout: 10 * 1000,
    
    // ナビゲーションのタイムアウト
    navigationTimeout: 30 * 1000,
    
    // ビューポート設定
    viewport: { width: 1920, height: 1080 },
    
    // ロケール設定
    locale: 'ja-JP',
    
    // タイムゾーン
    timezoneId: 'Asia/Tokyo',
    
    // HTTPSエラーを無視
    ignoreHTTPSErrors: true,
    
    // 権限設定
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // カラースキーム
    colorScheme: 'light',
    
    // オフラインモード
    offline: false,
    
    // JavaScriptを有効化
    javaScriptEnabled: true,
    
    // Accept-Language ヘッダー
    extraHTTPHeaders: {
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
    }
  },

  // プロジェクト設定（ブラウザ設定）
  projects: [
    // デスクトップブラウザ
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chromium固有の設定
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox固有の設定
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true
          }
        }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKit固有の設定
      },
    },

    // モバイルブラウザ
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // モバイルChrome設定
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        // モバイルSafari設定
      },
    },

    // Microsoft Edge
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        // Edge固有の設定
        launchOptions: {
          args: ['--no-sandbox']
        }
      },
    },

    // Docker環境用設定
    {
      name: 'docker',
      use: {
        ...devices['Desktop Chrome'],
        // Docker環境用の設定
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      }
    },

    // セーフモードテスト用
    {
      name: 'safe-mode',
      use: {
        ...devices['Desktop Chrome'],
        // セーフモード検証用
        javaScriptEnabled: false,
        offline: true
      }
    },

    // パフォーマンステスト用
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // パフォーマンス測定用
        video: 'on',
        trace: 'on',
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      }
    }
  ],

  // Webサーバー設定（開発サーバー自動起動）
  webServer: CI ? null : {
    command: 'npm run start:server',
    port: 8086,
    timeout: 120 * 1000,
    reuseExistingServer: !CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test'
    }
  },

  // 出力フォルダ設定
  outputDir: 'test-results',

  // グローバルセットアップ/ティアダウン
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),

  // メタデータ（レポート用）
  metadata: {
    project: 'PlantUML Editor',
    environment: CI ? 'CI' : 'Local',
    browser: 'Multiple',
    timestamp: new Date().toISOString()
  },

  // スナップショット設定
  snapshotDir: './snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

  // 更新モード設定
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',

  // エラー時の設定
  preserveOutput: 'failures-only',
  
  // 最大失敗数（これ以上失敗したらテスト中止）
  maxFailures: CI ? 10 : undefined,

  // カスタム設定（プロジェクト固有）
  use: {
    // PlantUMLエディタ固有の設定
    customSettings: {
      waitForPreview: 3000,      // プレビュー生成待機時間
      maxActors: 10,             // 最大アクター数
      maxProcesses: 20,          // 最大プロセス数
      animationDelay: 500,       // アニメーション待機時間
      apiTimeout: 10000,         // API呼び出しタイムアウト
      krokiApiUrl: 'https://kroki.io',
      defaultPattern: 'EC注文フロー'
    }
  }
});

/**
 * テスト実行前の環境チェック
 */
if (!CI) {
  console.log('='.repeat(60));
  console.log('  PlantUML Editor E2E Tests - Playwright Configuration');
  console.log('='.repeat(60));
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Test Directory: ./tests`);
  console.log(`  Workers: ${module.exports.workers || 'Auto'}`);
  console.log(`  Retries: ${module.exports.retries}`);
  console.log('='.repeat(60));
  console.log('');
}