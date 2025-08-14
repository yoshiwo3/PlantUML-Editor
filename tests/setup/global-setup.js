/**
 * Jest統合テスト グローバルセットアップ
 * 全テストスイート実行前の環境準備
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * グローバルセットアップ処理
 */
module.exports = async () => {
  console.log('🚀 PlantUML統合テスト環境 - グローバルセットアップ開始');
  
  // 1. 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.TEST_MODE = 'integration';
  process.env.API_BASE_URL = 'http://localhost:8086';
  
  // 2. テスト用ディレクトリの作成
  const testDirs = [
    'coverage',
    'coverage/jp2plantuml',
    'coverage/plantuml-editor',
    'coverage/integration',
    'coverage/combined',
    'test-results',
    'test-results/reports',
    'test-results/artifacts'
  ];
  
  testDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ ディレクトリ作成: ${dir}`);
    }
  });
  
  // 3. テスト用設定ファイルの確認
  const configFiles = [
    'jest.config.js',
    'jp2plantuml/jest.setup.js',
    'tests/setup/integration-setup.js'
  ];
  
  configFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✓ 設定ファイル確認: ${file}`);
    } else {
      console.warn(`⚠ 設定ファイル未発見: ${file}`);
    }
  });
  
  // 4. 依存関係の確認
  try {
    // jp2plantuml の依存関係確認
    const jp2plantumlPackage = require('../../jp2plantuml/package.json');
    console.log(`✓ jp2plantuml v${jp2plantumlPackage.version} 確認済み`);
    
    // 必要なパッケージの確認
    const requiredPackages = ['jest', 'supertest'];
    requiredPackages.forEach(pkg => {
      try {
        require.resolve(pkg);
        console.log(`✓ パッケージ確認: ${pkg}`);
      } catch (error) {
        console.error(`❌ パッケージ未発見: ${pkg}`);
      }
    });
  } catch (error) {
    console.warn(`⚠ パッケージ確認でエラー: ${error.message}`);
  }
  
  // 5. サーバーの起動確認（テスト用）
  try {
    // ポート使用状況の確認
    const { spawn } = require('child_process');
    console.log('🔍 ポート8086の使用状況確認中...');
    
    // Windows環境での確認
    if (process.platform === 'win32') {
      try {
        execSync('netstat -an | findstr :8086', { encoding: 'utf8' });
        console.log('⚠ ポート8086は既に使用中です');
      } catch (error) {
        console.log('✓ ポート8086は利用可能です');
      }
    }
  } catch (error) {
    console.warn(`⚠ ポート確認でエラー: ${error.message}`);
  }
  
  // 6. テスト実行前のクリーンアップ
  try {
    // 既存のカバレッジファイルを削除
    const coverageFiles = [
      'coverage/lcov.info',
      'coverage/coverage-final.json'
    ];
    
    coverageFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✓ クリーンアップ: ${file}`);
      }
    });
  } catch (error) {
    console.warn(`⚠ クリーンアップエラー: ${error.message}`);
  }
  
  // 7. テスト環境情報の出力
  console.log('\n📊 テスト環境情報:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   プラットフォーム: ${process.platform}`);
  console.log(`   作業ディレクトリ: ${process.cwd()}`);
  console.log(`   テストモード: ${process.env.TEST_MODE}`);
  console.log(`   API Base URL: ${process.env.API_BASE_URL}`);
  
  // 8. パフォーマンス監視の開始
  if (global.gc) {
    global.gc();
    console.log('✓ ガベージコレクション実行');
  }
  
  const memUsage = process.memoryUsage();
  console.log(`   メモリ使用量: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  
  // 9. テスト開始時刻の記録
  global.__TEST_START_TIME__ = Date.now();
  
  console.log('✅ グローバルセットアップ完了\n');
};