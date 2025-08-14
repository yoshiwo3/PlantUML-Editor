/**
 * グローバルセットアップ - PlantUMLプロジェクト
 * 
 * テスト実行前の環境準備を行います
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

module.exports = async function globalSetup() {
  console.log('🔧 テスト環境のグローバルセットアップを開始します...');
  
  try {
    // 1. 必要なディレクトリの作成
    const directories = [
      'test-results',
      'test-results/screenshots',
      'test-results/artifacts',
      'coverage/combined',
      'coverage/integration'
    ];
    
    for (const dir of directories) {
      const fullPath = path.join(process.cwd(), dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
    
    // 2. 環境変数の設定
    process.env.NODE_ENV = 'test';
    process.env.TZ = 'Asia/Tokyo';
    
    // 3. テスト用データベースの準備（必要に応じて）
    // await setupTestDatabase();
    
    // 4. モックサーバーの起動（必要に応じて）
    // await startMockServer();
    
    console.log('✅ グローバルセットアップが完了しました');
    
  } catch (error) {
    console.error('❌ グローバルセットアップに失敗しました:', error);
    throw error;
  }
};

// ヘルパー関数
async function setupTestDatabase() {
  // テスト用データベースの初期化ロジック
  console.log('📊 テスト用データベースを準備中...');
}

async function startMockServer() {
  // モックサーバーの起動ロジック
  console.log('🖥️ モックサーバーを起動中...');
}