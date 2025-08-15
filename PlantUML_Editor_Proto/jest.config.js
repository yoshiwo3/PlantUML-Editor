// Jest Configuration for PlantUML Editor - Sprint 1 Unit Test Environment
// CLAUDE.md標準テスト環境定義準拠版

module.exports = {
  // テスト環境: jsdom（DOM操作とブラウザAPI対応）
  testEnvironment: 'jsdom',
  
  // ルートディレクトリ
  roots: ['<rootDir>'],
  
  // テストファイルのパターン（標準化準拠）
  testMatch: [
    // 単体テスト
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.unit.test.js',
    // 統合テスト  
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.integration.test.js',
    // 従来のパターンも維持
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // テスト実行タイムアウト（CLAUDE.md基準: 単体テスト < 5秒）
  testTimeout: 5000,
  
  // カバレッジ設定（CLAUDE.md基準: 80%以上）
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // カバレッジ対象ファイル
  collectCoverageFrom: [
    // メインアプリケーションファイル
    'app.js',
    'PlantUMLParser.js',
    'EditModalManager.js', 
    'ActionEditor.js',
    'ErrorBoundary.js',
    // セキュリティ関連
    'ValidationEngine.js',
    'ErrorHandler.js',
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
    '!**/debug/**'
  ],
  
  // カバレッジ閾値（CLAUDE.md基準）
  coverageThreshold: {
    global: {
      branches: 80,      // 80%以上
      functions: 80,     // 80%以上  
      lines: 80,         // 80%以上
      statements: 80     // 80%以上
    },
    // 個別ファイル別基準
    './EditModalManager.js': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './ErrorBoundary.js': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  
  // モジュール解決
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // セットアップファイル（複数対応）
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // トランスフォーム設定（ES6+ + JSX対応）
  transform: {
    '^.+\\.js$': 'babel-jest'
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
    '<rootDir>/debug/'
  ],
  
  // テストレポート設定
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'PlantUML Editor - Sprint 1 Unit Test Report',
      outputPath: 'coverage/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }],
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      suiteName: 'PlantUML Editor Unit Tests'
    }]
  ],
  
  // グローバル変数設定
  globals: {
    'jest': true,
    'expect': true,
    'describe': true,
    'it': true,
    'test': true,
    'beforeAll': true,
    'afterAll': true,
    'beforeEach': true,
    'afterEach': true
  }
};