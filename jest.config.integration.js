/**
 * Jest統合テスト設定 - PlantUMLプロジェクト
 * 
 * この設定ファイルは以下の機能を提供します:
 * - 統合テスト専用の設定
 * - 80%以上のテストカバレッジ閾値
 * - 並行テスト実行（2ワーカー）
 * - 日本語対応のテストレポート
 * - MCP統合テスト対応
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: {
    name: '統合テスト',
    color: 'cyan'
  },
  
  // 統合テスト用のテストパターン
  testMatch: [
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.spec.js',
    '**/__tests__/integration/**/*.test.js',
    '**/__tests__/integration/**/*.spec.js'
  ],
  
  // 並行実行設定（2ワーカー）
  maxWorkers: 2,
  maxConcurrency: 4,
  
  // テスト環境設定
  testEnvironment: 'node',
  
  // タイムアウト設定（統合テストは時間がかかる可能性があるため）
  testTimeout: 30000,
  
  // セットアップファイル
  setupFilesAfterEnv: [
    '<rootDir>/test-utils/setup.js',
    '<rootDir>/jp2plantuml/jest.setup.js'
  ],
  
  // カバレッジ設定（80%以上の閾値）
  collectCoverage: true,
  collectCoverageFrom: [
    'jp2plantuml/src/**/*.js',
    'jp2plantuml/server.js',
    'PlantUML_Editor_Proto/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/test-utils/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/debug/**',
    '!**/scripts/**',
    '!**/*.config.js',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],
  
  coverageDirectory: '<rootDir>/coverage/integration',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  
  // カバレッジ閾値（80%以上）
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // jp2plantumlコアモジュール
    'jp2plantuml/src/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // サーバーモジュール
    'jp2plantuml/server.js': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // レポーター設定（日本語対応）
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/integration/html-report',
        filename: 'integration-test-report.html',
        pageTitle: 'PlantUML統合テストレポート',
        logoImgPath: './assets/logo.png',
        hideIcon: false,
        expand: true,
        openReport: false,
        darkTheme: false,
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ],
    [
      './test-utils/japanese-reporter.js',
      {
        outputFile: './coverage/integration/test-results-ja.json'
      }
    ]
  ],
  
  // モジュール解決設定
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/jp2plantuml/src/$1',
    '^@proto/(.*)$': '<rootDir>/PlantUML_Editor_Proto/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@utils/(.*)$': '<rootDir>/test-utils/$1'
  },
  
  // テスト実行前のグローバルセットアップ
  globalSetup: '<rootDir>/test-utils/global-setup.js',
  globalTeardown: '<rootDir>/test-utils/global-teardown.js',
  
  // 変更ファイル検出設定
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/',
    '<rootDir>/debug/'
  ],
  
  // 統合テスト用の環境変数
  setupFiles: ['<rootDir>/test-utils/env-setup.js'],
  
  // テスト結果出力設定
  verbose: true,
  silent: false,
  
  // エラーハンドリング
  bail: false,
  errorOnDeprecated: true,
  
  // キャッシュ設定
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/integration',
  
  // 変換設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 無視パターン
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/debug/',
    '<rootDir>/PlantUML_Editor_Proto/E2Eテスト/'
  ],
  
  // ファイル変換の無視パターン
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)/)'
  ],
  
  // 統合テスト固有の設定
  testSequencer: '<rootDir>/test-utils/integration-sequencer.js',
  
  // リソース制限
  workerIdleMemoryLimit: '512MB',
  
  // 通知設定
  notify: false,
  notifyMode: 'failure-change',
  
  // プロジェクト固有の設定
  projects: [
    {
      displayName: 'jp2plantuml統合テスト',
      testMatch: ['<rootDir>/jp2plantuml/__tests__/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/jp2plantuml/jest.setup.js']
    },
    {
      displayName: 'プロトタイプ統合テスト',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test-utils/setup.js']
    },
    {
      displayName: 'MCP統合テスト',
      testMatch: ['<rootDir>/tests/playwright-mcp/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test-utils/mcp-setup.js']
    }
  ]
};