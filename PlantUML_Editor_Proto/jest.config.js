// Jest Configuration for PlantUML Editor
module.exports = {
  // テスト環境
  testEnvironment: 'jsdom',
  
  // ルートディレクトリ
  roots: ['<rootDir>'],
  
  // テストファイルのパターン
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // カバレッジ設定
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // カバレッジ対象
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/E2Eテスト/**'
  ],
  
  // カバレッジ閾値
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // モジュール解決
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // トランスフォーム設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 詳細表示
  verbose: true,
  
  // エラー時の詳細
  bail: false,
  
  // タイムアウト設定
  testTimeout: 10000
};