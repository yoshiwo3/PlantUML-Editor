/**
 * Jest Configuration for E2E Test Framework
 * Unit Testing and Integration Testing Setup
 */

export default {
  // 基本設定
  displayName: 'PlantUML Editor E2E Framework',
  testEnvironment: 'jsdom',
  
  // ルートディレクトリ
  rootDir: '../',
  roots: ['<rootDir>/tests/unit', '<rootDir>/tests/integration'],
  
  // テストマッチング
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  
  // 変換設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // セットアップファイル
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest-setup.js'
  ],
  
  // モジュール設定
  moduleFileExtensions: ['js', 'json'],
  
  // カバレッジ設定
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'helpers/**/*.js',
    'page-objects/**/*.js',
    'utils/**/*.js',
    'fixtures/**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/reports/**'
  ],
  
  // カバレッジ閾値
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // テストタイムアウト
  testTimeout: 30000,
  
  // リポーター設定
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports/junit',
      outputName: 'jest-results.xml'
    }]
  ],
  
  // グローバル設定
  globals: {
    BASE_URL: 'http://localhost:8086',
    TEST_ENV: 'jest',
    E2E_MODE: 'enabled'
  },
  
  // クリアモック
  clearMocks: true,
  restoreMocks: true,
  
  // 詳細出力
  verbose: true,
  
  // 並列実行
  maxWorkers: '50%',
  
  // ESM設定
  extensionsToTreatAsEsm: ['.js'],
  
  // モジュール解決
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@helpers/(.*)$': '<rootDir>/helpers/$1',
    '^@fixtures/(.*)$': '<rootDir>/fixtures/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  }
};