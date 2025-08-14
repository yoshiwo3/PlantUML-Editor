/**
 * Jest統合テスト グローバルティアダウン
 * 全テストスイート実行後のクリーンアップ
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * グローバルティアダウン処理
 */
module.exports = async () => {
  console.log('\n🧹 PlantUML統合テスト環境 - グローバルティアダウン開始');
  
  // 1. テスト実行時間の計算
  const testEndTime = Date.now();
  const testStartTime = global.__TEST_START_TIME__ || testEndTime;
  const testDuration = testEndTime - testStartTime;
  
  console.log(`⏱ テスト実行時間: ${Math.round(testDuration / 1000)}秒`);
  
  // 2. メモリ使用量の確認
  const memUsage = process.memoryUsage();
  console.log(`💾 最終メモリ使用量: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  
  // 3. カバレッジレポートの統合処理
  try {
    await integrateCoverageReports();
  } catch (error) {
    console.error(`❌ カバレッジレポート統合エラー: ${error.message}`);
  }
  
  // 4. テスト結果の集計
  try {
    await generateTestSummary();
  } catch (error) {
    console.error(`❌ テスト結果集計エラー: ${error.message}`);
  }
  
  // 5. 一時ファイルのクリーンアップ
  try {
    cleanupTempFiles();
  } catch (error) {
    console.error(`❌ 一時ファイルクリーンアップエラー: ${error.message}`);
  }
  
  // 6. プロセスのクリーンアップ
  try {
    await cleanupProcesses();
  } catch (error) {
    console.error(`❌ プロセスクリーンアップエラー: ${error.message}`);
  }
  
  console.log('✅ グローバルティアダウン完了');
};

/**
 * カバレッジレポートの統合
 */
async function integrateCoverageReports() {
  console.log('📊 カバレッジレポート統合処理開始...');
  
  const coverageDir = path.join(process.cwd(), 'coverage');
  const combinedDir = path.join(coverageDir, 'combined');
  
  if (!fs.existsSync(combinedDir)) {
    fs.mkdirSync(combinedDir, { recursive: true });
  }
  
  // 各プロジェクトのカバレッジデータを統合
  const projects = ['jp2plantuml', 'plantuml-editor', 'integration'];
  const coverageData = {};
  
  projects.forEach(project => {
    const projectCoverageFile = path.join(coverageDir, project, 'coverage-final.json');
    if (fs.existsSync(projectCoverageFile)) {
      try {
        const projectCoverage = JSON.parse(fs.readFileSync(projectCoverageFile, 'utf8'));
        Object.assign(coverageData, projectCoverage);
        console.log(`✓ ${project} カバレッジデータ統合済み`);
      } catch (error) {
        console.warn(`⚠ ${project} カバレッジデータ読み込みエラー: ${error.message}`);
      }
    }
  });
  
  // 統合カバレッジデータの保存
  if (Object.keys(coverageData).length > 0) {
    const combinedCoverageFile = path.join(combinedDir, 'coverage-final.json');
    fs.writeFileSync(combinedCoverageFile, JSON.stringify(coverageData, null, 2));
    console.log('✓ 統合カバレッジデータ保存完了');
  }
}

/**
 * テスト結果の集計
 */
async function generateTestSummary() {
  console.log('📋 テスト結果集計処理開始...');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    duration: Date.now() - (global.__TEST_START_TIME__ || Date.now()),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd()
    },
    memory: process.memoryUsage(),
    projects: []
  };
  
  // 各プロジェクトの結果を収集
  const coverageDir = path.join(process.cwd(), 'coverage');
  const projects = ['jp2plantuml', 'plantuml-editor', 'integration'];
  
  projects.forEach(project => {
    const projectDir = path.join(coverageDir, project);
    if (fs.existsSync(projectDir)) {
      const projectResult = {
        name: project,
        coverageAvailable: fs.existsSync(path.join(projectDir, 'coverage-final.json'))
      };
      
      // HTML レポートの確認
      if (fs.existsSync(path.join(projectDir, 'lcov-report', 'index.html'))) {
        projectResult.htmlReportAvailable = true;
      }
      
      testResults.projects.push(projectResult);
    }
  });
  
  // テスト結果サマリーの保存
  const summaryFile = path.join(process.cwd(), 'test-results', 'test-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(testResults, null, 2));
  console.log('✓ テスト結果集計完了');
  
  // コンソールでのサマリー表示
  console.log('\n📊 テスト実行サマリー:');
  console.log(`   実行時間: ${Math.round(testResults.duration / 1000)}秒`);
  console.log(`   プロジェクト数: ${testResults.projects.length}`);
  testResults.projects.forEach(project => {
    console.log(`   - ${project.name}: ${project.coverageAvailable ? '✓' : '✗'} カバレッジ`);
  });
}

/**
 * 一時ファイルのクリーンアップ
 */
function cleanupTempFiles() {
  console.log('🗑 一時ファイルクリーンアップ開始...');
  
  const tempPatterns = [
    'coverage/.nyc_output',
    'coverage/tmp',
    'test-results/.tmp',
    '.temp'
  ];
  
  tempPatterns.forEach(pattern => {
    const tempPath = path.join(process.cwd(), pattern);
    if (fs.existsSync(tempPath)) {
      try {
        fs.rmSync(tempPath, { recursive: true, force: true });
        console.log(`✓ 削除: ${pattern}`);
      } catch (error) {
        console.warn(`⚠ 削除失敗: ${pattern} - ${error.message}`);
      }
    }
  });
}

/**
 * プロセスのクリーンアップ
 */
async function cleanupProcesses() {
  console.log('🔄 プロセスクリーンアップ開始...');
  
  // ガベージコレクションの実行
  if (global.gc) {
    global.gc();
    console.log('✓ ガベージコレクション実行');
  }
  
  // プロセス終了の準備
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  
  console.log('✓ プロセスクリーンアップ完了');
}