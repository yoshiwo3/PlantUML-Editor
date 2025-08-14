/**
 * PlantUML プロジェクト統合 Playwright設定
 * Playwright MCPとの統合、並行テスト実行、パフォーマンステスト対応
 * @version 2.0.0
 * @author AI-Driven Test Integration System
 */

const { defineConfig, devices } = require('@playwright/test');

/**
 * 環境変数から設定を読み込み
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
const CI = process.env.CI === 'true';
const PARALLEL_WORKERS = process.env.PARALLEL_WORKERS || (CI ? 2 : 4);
const MCP_INTEGRATION = process.env.MCP_INTEGRATION !== 'false';

module.exports = defineConfig({
  // テストディレクトリ（統合）
  testDir: './tests/e2e',
  
  // 追加テストディレクトリ
  testMatch: [
    '**/tests/e2e/**/*.spec.js',
    '**/tests/e2e/**/*.test.js',
    '**/PlantUML_Editor_Proto/E2Eテスト/tests/**/*.spec.js',
    '**/tests/playwright-mcp/**/*.spec.js'
  ],

  // タイムアウト設定（統合環境用に調整）
  timeout: 45 * 1000,        // 各テストのタイムアウト: 45秒
  expect: {
    timeout: 15 * 1000       // expect()のタイムアウト: 15秒
  },

  // 並列実行設定（最適化）
  fullyParallel: true,
  workers: PARALLEL_WORKERS,
  
  // リトライ設定
  retries: CI ? 3 : 1,       // CI環境では3回リトライ
  
  // レポーター設定（統合レポート）
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report/integrated', 
      open: 'never',
      host: 'localhost',
      port: 9323
    }],
    ['list'],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    // MCP統合レポーター
    MCP_INTEGRATION ? ['./tests/reporters/mcp-reporter.js'] : null,
    CI ? ['github'] : null
  ].filter(Boolean),

  // グローバル設定
  use: {
    // ベースURL
    baseURL: BASE_URL,
    
    // スクリーンショット設定（詳細化）
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // ビデオ録画設定
    video: {
      mode: CI ? 'retain-on-failure' : 'off',
      size: { width: 1920, height: 1080 }
    },
    
    // トレース設定（デバッグ用強化）
    trace: {
      mode: CI ? 'on-first-retry' : 'retain-on-failure',
      screenshots: true,
      snapshots: true,
      sources: true
    },
    
    // アクションのタイムアウト
    actionTimeout: 15 * 1000,
    
    // ナビゲーションのタイムアウト
    navigationTimeout: 45 * 1000,
    
    // ビューポート設定
    viewport: { width: 1920, height: 1080 },
    
    // ロケール設定
    locale: 'ja-JP',
    
    // タイムゾーン
    timezoneId: 'Asia/Tokyo',
    
    // HTTPSエラーを無視
    ignoreHTTPSErrors: true,
    
    // 権限設定
    permissions: ['clipboard-read', 'clipboard-write', 'camera', 'microphone'],
    
    // カラースキーム
    colorScheme: 'light',
    
    // オフラインモード
    offline: false,
    
    // JavaScriptを有効化
    javaScriptEnabled: true,
    
    // Accept-Language ヘッダー
    extraHTTPHeaders: {
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
      'X-Test-Environment': 'playwright-integration'
    },

    // MCP統合設定
    ...(MCP_INTEGRATION && {
      contextOptions: {
        recordVideo: {
          dir: 'test-results/videos/',
          size: { width: 1920, height: 1080 }
        },
        recordHar: {
          path: 'test-results/network.har'
        }
      }
    })
  },

  // プロジェクト設定（拡張ブラウザテスト）
  projects: [
    // デスクトップブラウザ（優先度順）
    {
      name: 'chromium-primary',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--enable-features=NetworkService',
            '--enable-precise-memory-info'
          ]
        }
      },
      testMatch: [
        '**/tests/e2e/critical/**/*.spec.js',
        '**/tests/e2e/smoke/**/*.spec.js'
      ]
    },

    {
      name: 'firefox-secondary',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
            'network.cookie.cookieBehavior': 0
          }
        }
      },
      testMatch: [
        '**/tests/e2e/compatibility/**/*.spec.js'
      ]
    },

    {
      name: 'edge-compatibility',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        launchOptions: {
          args: ['--no-sandbox', '--disable-web-security']
        }
      },
      testMatch: [
        '**/tests/e2e/edge-specific/**/*.spec.js'
      ]
    },

    // モバイルブラウザ
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true
      },
      testMatch: [
        '**/tests/e2e/mobile/**/*.spec.js'
      ]
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true
      },
      testMatch: [
        '**/tests/e2e/mobile/**/*.spec.js'
      ]
    },

    // パフォーマンステスト専用
    {
      name: 'performance-testing',
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        trace: 'on',
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-memory-info',
            '--memory-pressure-off',
            '--max_old_space_size=4096'
          ]
        }
      },
      testMatch: [
        '**/tests/e2e/performance/**/*.spec.js',
        '**/tests/performance/**/*.spec.js'
      ],
      testDir: './tests/performance',
      timeout: 120 * 1000
    },

    // セキュリティテスト
    {
      name: 'security-testing',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
      testMatch: [
        '**/tests/e2e/security/**/*.spec.js',
        '**/tests/security/**/*.spec.js'
      ],
      testDir: './tests/security'
    },

    // アクセシビリティテスト
    {
      name: 'accessibility-testing',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--force-renderer-accessibility']
        }
      },
      testMatch: [
        '**/tests/e2e/accessibility/**/*.spec.js'
      ]
    },

    // Docker環境用設定（CI/CD統合）
    {
      name: 'docker-integration',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--single-process'
          ]
        }
      },
      testMatch: CI ? ['**/tests/e2e/**/*.spec.js'] : []
    },

    // MCP統合テスト専用プロジェクト
    ...(MCP_INTEGRATION ? [{
      name: 'mcp-integration',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--enable-automation']
        }
      },
      testMatch: [
        '**/tests/playwright-mcp/**/*.spec.js'
      ],
      testDir: './tests/playwright-mcp'
    }] : [])
  ],

  // Webサーバー設定（統合）
  webServer: CI ? null : [
    // メインアプリケーション
    {
      command: 'cd jp2plantuml && npm start',
      port: 8086,
      timeout: 120 * 1000,
      reuseExistingServer: !CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        PORT: '8086'
      }
    },
    // テスト用モックサーバー（必要に応じて）
    {
      command: 'cd tests/mock-server && npm start',
      port: 3001,
      timeout: 60 * 1000,
      reuseExistingServer: !CI,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],

  // 出力フォルダ設定
  outputDir: 'test-results/playwright',

  // グローバルセットアップ/ティアダウン（統合）
  globalSetup: require.resolve('./tests/setup/playwright-global-setup.js'),
  globalTeardown: require.resolve('./tests/setup/playwright-global-teardown.js'),

  // メタデータ（詳細レポート用）
  metadata: {
    project: 'PlantUML Editor Integration Tests',
    environment: CI ? 'CI' : 'Local',
    browser: 'Multiple',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    node_version: process.version,
    playwright_version: require('@playwright/test/package.json').version,
    mcp_integration: MCP_INTEGRATION
  },

  // スナップショット設定
  snapshotDir: './tests/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

  // 更新モード設定
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',

  // エラー時の設定
  preserveOutput: 'failures-only',
  
  // 最大失敗数（これ以上失敗したらテスト中止）
  maxFailures: CI ? 20 : undefined,

  // テスト並列実行の詳細設定
  forbidOnly: CI,
  
  // カスタム設定（PlantUMLエディタ & MCP統合）
  use: {
    ...module.exports.use,
    
    // PlantUMLエディタ固有の設定
    customSettings: {
      waitForPreview: 5000,        // プレビュー生成待機時間（統合環境用）
      maxActors: 15,               // 最大アクター数
      maxProcesses: 25,            // 最大プロセス数
      animationDelay: 1000,        // アニメーション待機時間
      apiTimeout: 15000,           // API呼び出しタイムアウト
      krokiApiUrl: process.env.KROKI_API_URL || 'https://kroki.io',
      defaultPattern: 'EC注文フロー統合テスト',
      
      // MCP統合設定
      mcpIntegration: {
        enabled: MCP_INTEGRATION,
        endpoint: process.env.MCP_ENDPOINT || 'http://localhost:3000/mcp',
        timeout: 30000,
        retries: 3
      },
      
      // パフォーマンス測定設定
      performance: {
        memoryThreshold: 100 * 1024 * 1024, // 100MB
        loadTimeThreshold: 5000,             // 5秒
        renderTimeThreshold: 3000            // 3秒
      }
    }
  },

  // ファイルウォッチャー設定
  watchFiles: [
    'jp2plantuml/**/*.js',
    'PlantUML_Editor_Proto/**/*.js',
    'tests/**/*.js'
  ],

  // 実験的機能
  experimentalCTSSupport: true
});

/**
 * テスト実行前の環境チェック（拡張）
 */
if (!CI) {
  console.log('='.repeat(80));
  console.log('  PlantUML プロジェクト統合E2Eテスト - Playwright Configuration v2.0');
  console.log('='.repeat(80));
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Test Directory: ./tests/e2e (統合)`);
  console.log(`  Workers: ${PARALLEL_WORKERS}`);
  console.log(`  Retries: ${module.exports.retries}`);
  console.log(`  MCP Integration: ${MCP_INTEGRATION ? '✓ Enabled' : '✗ Disabled'}`);
  console.log(`  Performance Testing: ✓ Enabled`);
  console.log(`  Security Testing: ✓ Enabled`);
  console.log(`  Mobile Testing: ✓ Enabled`);
  console.log('='.repeat(80));
  console.log('');
}

// MCP統合時の追加ログ
if (MCP_INTEGRATION && !CI) {
  console.log('🔧 MCP統合モード有効:');
  console.log(`   - MCP Endpoint: ${process.env.MCP_ENDPOINT || 'Default'}`);
  console.log(`   - 追加レポーター: MCP Reporter`);
  console.log(`   - テスト範囲: 統合MCPテスト含む`);
  console.log('');
}