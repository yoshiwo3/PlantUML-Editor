/**
 * PlantUML プロジェクト統合テスト設定
 * ユニットテスト、統合テスト、パフォーマンステストを統合管理
 * @version 1.0.0
 * @author AI-Driven Test Integration System
 */

const { defaults } = require('jest-config');

module.exports = {
  // プロジェクト構成（複数モジュールの統合）
  projects: [
    // jp2plantuml ユニットテスト・統合テスト
    {
      displayName: 'jp2plantuml',
      rootDir: './jp2plantuml',
      testEnvironment: 'node',
      testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
      ],
      collectCoverageFrom: [
        'src/**/*.js',
        'server.js',
        '!**/node_modules/**',
        '!**/coverage/**'
      ],
      coverageDirectory: '../coverage/jp2plantuml',
      coverageReporters: ['text', 'lcov', 'html', 'json'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      coverageThreshold: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },

    // PlantUML_Editor_Proto E2Eテスト統合
    {
      displayName: 'plantuml-editor-e2e',
      rootDir: './PlantUML_Editor_Proto',
      testEnvironment: 'node',
      testMatch: [
        '**/tests/**/*.test.js',
        '**/?(*.)+(spec|test).js'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/E2Eテスト/tests/',  // Playwrightテストは除外
      ],
      collectCoverageFrom: [
        '*.js',
        '!app.js.backup*',
        '!simple-server.js',
        '!**/node_modules/**',
        '!**/debug/**',
        '!**/E2Eテスト/**'
      ],
      coverageDirectory: '../coverage/plantuml-editor',
      setupFiles: ['<rootDir>/../tests/setup/editor-test-setup.js']
    },

    // 統合テストスイート
    {
      displayName: 'integration',
      rootDir: './tests',
      testEnvironment: 'node',
      testMatch: [
        '**/integration/**/*.test.js',
        '**/claudecodeactions/**/*.test.js',
        '**/github-issues/**/*.test.js'
      ],
      collectCoverageFrom: [
        '../jp2plantuml/src/**/*.js',
        '../PlantUML_Editor_Proto/*.js',
        '!**/node_modules/**'
      ],
      coverageDirectory: '../coverage/integration',
      setupFilesAfterEnv: ['<rootDir>/setup/integration-setup.js'],
      testTimeout: 30000,
      maxWorkers: 2
    },

    // パフォーマンステスト
    {
      displayName: 'performance',
      rootDir: './tests',
      testEnvironment: 'node',
      testMatch: [
        '**/performance/**/*.test.js'
      ],
      setupFilesAfterEnv: ['<rootDir>/setup/performance-setup.js'],
      testTimeout: 60000,
      maxWorkers: 1,
      collectCoverage: false
    }
  ],

  // グローバル設定
  coverageDirectory: './coverage/combined',
  collectCoverageFrom: [
    'jp2plantuml/src/**/*.js',
    'jp2plantuml/server.js',
    'PlantUML_Editor_Proto/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/debug/**',
    '!**/*.config.js',
    '!**/*.setup.js'
  ],

  // 統合カバレッジ設定
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],

  // 統合カバレッジ閾値（プロジェクト全体）
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // モジュール別閾値
    './jp2plantuml/src/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './PlantUML_Editor_Proto/': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // ウォッチ設定
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/playwright-report/',
    '/test-results/',
    '/debug/'
  ],

  // 並列実行設定
  maxWorkers: process.env.CI ? 2 : '50%',

  // エラー時の動作
  bail: false,
  verbose: true,
  
  // グローバルセットアップ/ティアダウン
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',

  // 追加設定
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // タイムアウト設定
  testTimeout: 15000,

  // レポーター設定
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'PlantUML プロジェクト統合テストレポート',
      outputPath: './coverage/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      suiteName: 'PlantUML Integration Tests',
      usePathForSuiteName: true
    }]
  ],

  // カスタム設定
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/jp2plantuml/src/$1',
    '^@editor/(.*)$': '<rootDir>/PlantUML_Editor_Proto/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // 環境変数
  setupFiles: ['<rootDir>/tests/setup/env-setup.js'],

  // 変換設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // 無視パターン
  testPathIgnorePatterns: [
    '/node_modules/',
    '/PlantUML_Editor_Proto/E2Eテスト/',
    '/debug/',
    '/coverage/',
    '\\.backup\\.'
  ],

  // ファイル拡張子
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'js', 'json'],

  // 環境変数設定
  testEnvironmentOptions: {
    url: 'http://localhost:8086'
  },

  // カスタム環境変数
  globals: {
    __TEST_ENV__: 'jest',
    __PROJECT_ROOT__: '<rootDir>',
    __API_BASE_URL__: 'http://localhost:8086'
  }
};