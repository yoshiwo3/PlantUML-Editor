/**
 * Playwrightグローバルセットアップ
 * テスト実行前の環境準備
 */

const fs = require('fs');
const path = require('path');

module.exports = async config => {
  console.log('\n📦 グローバルセットアップ開始...\n');
  
  // テスト結果ディレクトリの作成
  const dirs = [
    'test-results',
    'playwright-report',
    'snapshots',
    'videos',
    'traces'
  ];
  
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  ✅ ディレクトリ作成: ${dir}/`);
    } else {
      console.log(`  📁 ディレクトリ存在: ${dir}/`);
    }
  }
  
  // 環境情報の記録
  const envInfo = {
    timestamp: new Date().toISOString(),
    baseUrl: process.env.BASE_URL || 'http://localhost:8086',
    ci: process.env.CI === 'true',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    workers: config.workers,
    projects: config.projects.map(p => p.name)
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'test-results', 'environment.json'),
    JSON.stringify(envInfo, null, 2)
  );
  
  console.log('\n📊 環境情報:');
  console.log(`  - Node.js: ${envInfo.nodeVersion}`);
  console.log(`  - Platform: ${envInfo.platform} (${envInfo.arch})`);
  console.log(`  - Base URL: ${envInfo.baseUrl}`);
  console.log(`  - CI Mode: ${envInfo.ci ? 'Yes' : 'No'}`);
  console.log(`  - Workers: ${envInfo.workers || 'Auto'}`);
  console.log(`  - Projects: ${envInfo.projects.join(', ')}`);
  
  // テスト用の一時ファイルクリーンアップ
  const tempFiles = [
    'test-results/results.json',
    'test-results/failures.json'
  ];
  
  for (const file of tempFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  🗑️ 削除: ${file}`);
    }
  }
  
  // カスタム設定の検証
  if (fs.existsSync(path.join(__dirname, 'custom-config.json'))) {
    const customConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'custom-config.json'), 'utf8')
    );
    console.log('\n⚙️ カスタム設定を読み込みました');
    global.customConfig = customConfig;
  }
  
  // メモリ使用量の記録開始
  if (!process.env.CI) {
    global.memoryUsageStart = process.memoryUsage();
    console.log('\n💾 メモリ使用量の記録を開始');
  }
  
  console.log('\n✅ グローバルセットアップ完了\n');
  console.log('='.repeat(60));
};