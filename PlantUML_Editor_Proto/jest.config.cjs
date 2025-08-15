// Jest Configuration for PlantUML Editor - Sprint 1 Unit Test Environment
// Simplified version for basic testing

module.exports = {
  // テスト環境: jsdom（DOM操作とブラウザAPI対応）
  testEnvironment: 'jsdom',
  
  // テストファイルのパターン（単体テストのみ）
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.unit.test.js'
  ],
  
  // テスト実行タイムアウト（CLAUDE.md基準: 単体テスト < 5秒）
  testTimeout: 5000,
  
  // カバレッジ設定
  collectCoverage: false, // 手動で有効化
  coverageDirectory: 'coverage',
  
  // セットアップファイル（基本のみ）
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // トランスフォーム無効化（純粋なJSのみテスト）
  transform: {},
  
  // 詳細表示
  verbose: true,
  
  // エラー時の継続実行
  bail: false
};