// Jest Configuration for PlantUML Editor - Sprint2 Comprehensive Test Environment
// CLAUDE.md標準テスト環境定義準拠版 + Sprint2拡張

export default {
  // テスト環境: jsdom（DOM操作とブラウザAPI対応）
  testEnvironment: 'jsdom',
  
  // ルートディレクトリ
  roots: ['<rootDir>'],
  
  // テストファイルのパターン（統合・パフォーマンステスト対応）
  testMatch: [
    // 単体テスト
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.unit.test.js',
    // 統合テスト（Sprint2追加）
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.integration.test.js',
    // パフォーマンステスト（Sprint2追加）
    '**/tests/performance/**/*.perf.test.js',
    '**/tests/performance/**/*.performance.test.js',
    // 従来のパターンも維持
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // テスト実行タイムアウト（パフォーマンステスト考慮）
  testTimeout: 30000, // 統合・パフォーマンステスト用に延長
  
  // カバレッジ設定（CLAUDE.md基準: 80%以上）
  collectCoverage: true, // Sprint2で有効化
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'text-summary'],
  
  // カバレッジ対象ファイル（Sprint2実装コンポーネント追加）
  collectCoverageFrom: [
    // メインアプリケーションファイル
    'app.js',
    'PlantUMLParser.js',
    'EditModalManager.js', 
    'ActionEditor.js',
    'ErrorBoundary.js',
    // Sprint2追加コンポーネント
    'src/components/editors/ActionEditor.js',
    'src/components/editors/ConditionEditor.js',
    'src/components/editors/LoopEditor.js',
    'src/components/editors/ParallelEditor.js',
    'src/components/editors/EditorManager.js',
    // パフォーマンス最適化コンポーネント
    'src/performance/WorkerManager.js',
    // セキュリティ関連
    'ValidationEngine.js',
    'ErrorHandler.js',
    'src/security/**/*.js',
    // ユーティリティ
    'IDManager.js',
    'TokenTypes.js',
    // 除外パターン
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/E2Eテスト/**',
    '!**/tests/**',
    '!**/scripts/**',
    '!**/*.backup*',
    '!**/debug/**',
    '!**/docs/**',
    '!**/docker/**'
  ],
  
  // カバレッジ閾値（CLAUDE.md基準）
  coverageThreshold: {
    global: {
      branches: 80,      // 80%以上
      functions: 80,     // 80%以上  
      lines: 80,         // 80%以上
      statements: 80     // 80%以上
    },
    // 個別ファイル閾値（重要コンポーネント）
    'src/components/editors/EditorManager.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/performance/WorkerManager.js': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // モジュール解決
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@performance/(.*)$': '<rootDir>/src/performance/$1',
    '^@security/(.*)$': '<rootDir>/src/security/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // セットアップファイル（複数対応）
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js',
    '<rootDir>/tests/helpers/test-helpers.js'
  ],
  
  // トランスフォーム設定（ES6+ 対応）
  transform: {
    '^.+\\.js$': ['babel-jest', { 
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }]
  },
  
  // モジュールファイル拡張子
  moduleFileExtensions: ['js', 'json'],
  
  // 詳細表示（個別テスト結果表示）
  verbose: true,
  
  // エラー時の継続実行（全テスト実行）
  bail: false,
  
  // 並列実行設定（パフォーマンス最適化）
  maxWorkers: '50%',
  
  // キャッシュ有効化（高速実行）
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // ウォッチモード除外
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/E2Eテスト/',
    '<rootDir>/debug/',
    '<rootDir>/docs/',
    '<rootDir>/docker/'
  ],
  
  // テストレポート設定（Sprint2拡張）
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'PlantUML Editor Sprint2 Test Report',
      outputPath: 'coverage/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }],
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit-report.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],
  
  // グローバル変数設定（テスト用）
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.TEST_TYPE': 'sprint2'
  },
  
  // 並行実行制御（リソース管理）
  maxConcurrency: 5,
  
  // 失敗したテストのみ再実行設定
  onlyFailures: false,
  
  // カバレッジ収集の詳細設定
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    '/debug/',
    '/docs/',
    '/__tests__/',
    '\\.config\\.js$',
    '\\.backup\\.',
    '/E2Eテスト/'
  ]
};