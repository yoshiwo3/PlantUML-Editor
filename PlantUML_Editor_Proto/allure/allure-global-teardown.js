/**
 * Allure Global Teardown
 * テスト実行後のレポート生成と結果処理
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function globalTeardown(config) {
  console.log('🏁 Allure Global Teardown開始');

  const allureResultsDir = path.join(process.cwd(), 'allure-results');
  const allureReportDir = path.join(process.cwd(), 'allure-report');

  try {
    // テスト終了時刻の記録
    await updateTestRunInfo(allureResultsDir);

    // 統計情報の生成
    await generateTestStatistics(allureResultsDir);

    // Allureレポートの生成
    await generateAllureReport(allureResultsDir, allureReportDir);

    // 履歴データの保存
    await saveHistoryData(allureReportDir);

    // GitHub Pagesへの公開準備
    await prepareForGitHubPages(allureReportDir);

    console.log('✅ Allure Global Teardown完了');
    console.log(`📊 Report generated: ${allureReportDir}/index.html`);

  } catch (error) {
    console.error('❌ Allure Teardown中にエラー:', error.message);
    // エラーが発生してもテスト結果は保持する
  }
}

/**
 * テスト実行情報の更新
 */
async function updateTestRunInfo(resultsDir) {
  const testRunPath = path.join(resultsDir, 'test-run.json');
  
  if (fs.existsSync(testRunPath)) {
    try {
      const testRun = JSON.parse(fs.readFileSync(testRunPath, 'utf8'));
      testRun.end = new Date().getTime();
      testRun.duration = testRun.end - testRun.start;
      
      fs.writeFileSync(testRunPath, JSON.stringify(testRun, null, 2));
      console.log(`⏱️  テスト実行時間: ${Math.round(testRun.duration / 1000)}秒`);
    } catch (error) {
      console.warn('テスト実行情報の更新に失敗:', error.message);
    }
  }
}

/**
 * テスト統計情報の生成
 */
async function generateTestStatistics(resultsDir) {
  try {
    const testResults = await collectTestResults(resultsDir);
    const statistics = calculateStatistics(testResults);
    
    const statisticsPath = path.join(resultsDir, 'statistics.json');
    fs.writeFileSync(statisticsPath, JSON.stringify(statistics, null, 2));
    
    console.log('📈 テスト統計情報:');
    console.log(`   総テスト数: ${statistics.total}`);
    console.log(`   成功: ${statistics.passed} (${statistics.passRate}%)`);
    console.log(`   失敗: ${statistics.failed}`);
    console.log(`   スキップ: ${statistics.skipped}`);
    
  } catch (error) {
    console.warn('統計情報の生成に失敗:', error.message);
  }
}

/**
 * テスト結果の収集
 */
async function collectTestResults(resultsDir) {
  const results = [];
  
  if (!fs.existsSync(resultsDir)) return results;
  
  const files = fs.readdirSync(resultsDir);
  
  for (const file of files) {
    if (file.endsWith('-result.json')) {
      try {
        const filePath = path.join(resultsDir, file);
        const result = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        results.push(result);
      } catch (error) {
        console.warn(`結果ファイル読み取り失敗: ${file}`, error.message);
      }
    }
  }
  
  return results;
}

/**
 * 統計情報の計算
 */
function calculateStatistics(results) {
  const stats = {
    total: results.length,
    passed: 0,
    failed: 0,
    broken: 0,
    skipped: 0,
    unknown: 0
  };
  
  results.forEach(result => {
    switch (result.status) {
      case 'passed':
        stats.passed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'broken':
        stats.broken++;
        break;
      case 'skipped':
        stats.skipped++;
        break;
      default:
        stats.unknown++;
    }
  });
  
  stats.passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
  
  return stats;
}

/**
 * Allureレポートの生成
 */
async function generateAllureReport(resultsDir, reportDir) {
  try {
    // Allure CLIがインストールされているかチェック
    try {
      execSync('allure --version', { stdio: 'ignore' });
    } catch (error) {
      console.warn('⚠️  Allure CLIが見つかりません。レポート生成をスキップします。');
      console.log('   インストール: npm install -g allure-commandline');
      return;
    }

    // 履歴データをコピー（存在する場合）
    const historySource = path.join(reportDir, 'history');
    const historyTarget = path.join(resultsDir, 'history');
    
    if (fs.existsSync(historySource)) {
      fs.cpSync(historySource, historyTarget, { recursive: true });
    }

    // Allureレポートを生成
    const command = `allure generate "${resultsDir}" --output "${reportDir}" --clean`;
    console.log('📊 Allureレポートを生成中...');
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ Allureレポート生成完了');
    
  } catch (error) {
    console.error('❌ Allureレポート生成失敗:', error.message);
    throw error;
  }
}

/**
 * 履歴データの保存
 */
async function saveHistoryData(reportDir) {
  try {
    const historyDir = path.join(reportDir, 'history');
    const archiveDir = path.join(process.cwd(), 'allure-history');
    
    if (fs.existsSync(historyDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
      
      // 現在の履歴をアーカイブにコピー
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(archiveDir, `history-${timestamp}`);
      
      fs.cpSync(historyDir, archivePath, { recursive: true });
      
      // 古い履歴を削除（最新20個を保持）
      const archives = fs.readdirSync(archiveDir)
        .filter(name => name.startsWith('history-'))
        .sort()
        .reverse();
        
      if (archives.length > 20) {
        archives.slice(20).forEach(archive => {
          fs.rmSync(path.join(archiveDir, archive), { recursive: true, force: true });
        });
      }
      
      console.log('💾 履歴データを保存しました');
    }
    
  } catch (error) {
    console.warn('履歴データの保存に失敗:', error.message);
  }
}

/**
 * GitHub Pages公開の準備
 */
async function prepareForGitHubPages(reportDir) {
  try {
    // .nojekyllファイルを作成（GitHub Pagesで静的サイトとして扱うため）
    const nojekyllPath = path.join(reportDir, '.nojekyll');
    fs.writeFileSync(nojekyllPath, '');
    
    // READMEファイルを作成
    const readmePath = path.join(reportDir, 'README.md');
    const readmeContent = `# PlantUML Editor E2E Test Report

このディレクトリには、PlantUMLエディタのE2Eテスト結果が含まれています。

## レポート表示

[テストレポートを表示](./index.html)

## 更新日時

${new Date().toLocaleString('ja-JP')}

## テスト環境

- Framework: Playwright + Allure
- Browser: Chromium, Firefox, WebKit, Edge
- Docker Image: plantuml-e2e-permanent:latest
- Node.js: 20.18.0
`;
    
    fs.writeFileSync(readmePath, readmeContent);
    
    console.log('🌐 GitHub Pages公開の準備完了');
    
  } catch (error) {
    console.warn('GitHub Pages準備に失敗:', error.message);
  }
}

module.exports = globalTeardown;