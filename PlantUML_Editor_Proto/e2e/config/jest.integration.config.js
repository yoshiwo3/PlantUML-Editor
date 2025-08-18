/**
 * Jest Configuration for Integration Testing
 * API and Service Integration Tests
 */

export default {
  // 基本設定
  displayName: 'PlantUML Editor Integration Tests',
  testEnvironment: 'node',
  
  // ルートディレクトリ
  rootDir: '../',
  roots: ['<rootDir>/tests/integration'],
  
  // テストマッチング
  testMatch: [
    '**/tests/integration/**/*.test.js'
  ],
  
  // 変換設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // セットアップファイル
  setupFilesAfterEnv: [
    '<rootDir>/setup/integration-setup.js'
  ],
  
  // モジュール設定
  moduleFileExtensions: ['js', 'json'],
  
  // カバレッジ設定
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage-integration',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'mocks/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],
  
  // テストタイムアウト
  testTimeout: 60000,
  
  // リポーター設定
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports/junit',
      outputName: 'integration-results.xml'
    }]
  ],
  
  // グローバル設定
  globals: {
    BASE_URL: 'http://localhost:8086',
    TEST_ENV: 'integration',
    API_TIMEOUT: 30000
  },
  
  // モック設定
  clearMocks: true,
  
  // 詳細出力
  verbose: true,
  
  // 並列実行無効化（統合テスト用）
  maxWorkers: 1,
  
  // ESM設定
  extensionsToTreatAsEsm: ['.js']
};