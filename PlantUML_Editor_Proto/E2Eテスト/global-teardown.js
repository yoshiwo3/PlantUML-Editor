/**
 * Playwrightグローバルティアダウン
 * テスト実行後のクリーンアップ
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('\n🧹 グローバルティアダウン開始...\n');
  
  // テスト結果の集計
  const resultsPath = path.join(__dirname, 'test-results', 'results.json');
  let summary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  };
  
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      // 結果の集計
      if (results.suites) {
        results.suites.forEach(suite => {
          suite.specs.forEach(spec => {
            summary.total++;
            if (spec.ok) summary.passed++;
            else summary.failed++;
          });
        });
      }
      
      summary.duration = results.duration || 0;
      
      console.log('📊 テスト結果サマリー:');
      console.log(`  - 合計: ${summary.total}`);
      console.log(`  - ✅ 成功: ${summary.passed}`);
      console.log(`  - ❌ 失敗: ${summary.failed}`);
      console.log(`  - ⏭️ スキップ: ${summary.skipped}`);
      console.log(`  - ⏱️ 実行時間: ${(summary.duration / 1000).toFixed(2)}秒`);
      
      // サマリーファイルの作成
      fs.writeFileSync(
        path.join(__dirname, 'test-results', 'summary.json'),
        JSON.stringify(summary, null, 2)
      );
      
    } catch (error) {
      console.log('  ⚠️ テスト結果の読み込みに失敗しました');
    }
  }
  
  // メモリ使用量の記録終了
  if (global.memoryUsageStart && !process.env.CI) {
    const memoryUsageEnd = process.memoryUsage();
    const memoryDiff = {
      rss: memoryUsageEnd.rss - global.memoryUsageStart.rss,
      heapTotal: memoryUsageEnd.heapTotal - global.memoryUsageStart.heapTotal,
      heapUsed: memoryUsageEnd.heapUsed - global.memoryUsageStart.heapUsed,
      external: memoryUsageEnd.external - global.memoryUsageStart.external
    };
    
    console.log('\n💾 メモリ使用量の変化:');
    console.log(`  - RSS: ${(memoryDiff.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Total: ${(memoryDiff.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Used: ${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - External: ${(memoryDiff.external / 1024 / 1024).toFixed(2)} MB`);
    
    fs.writeFileSync(
      path.join(__dirname, 'test-results', 'memory-usage.json'),
      JSON.stringify({
        start: global.memoryUsageStart,
        end: memoryUsageEnd,
        diff: memoryDiff
      }, null, 2)
    );
  }
  
  // 失敗したテストのスクリーンショットを整理
  const screenshotsDir = path.join(__dirname, 'test-results');
  if (fs.existsSync(screenshotsDir)) {
    const files = fs.readdirSync(screenshotsDir);
    const screenshots = files.filter(f => f.endsWith('.png'));
    
    if (screenshots.length > 0) {
      console.log(`\n📸 スクリーンショット: ${screenshots.length}枚`);
      
      // スクリーンショット専用フォルダに移動
      const screenshotTargetDir = path.join(__dirname, 'test-results', 'screenshots');
      if (!fs.existsSync(screenshotTargetDir)) {
        fs.mkdirSync(screenshotTargetDir, { recursive: true });
      }
      
      screenshots.forEach(file => {
        const source = path.join(screenshotsDir, file);
        const target = path.join(screenshotTargetDir, file);
        fs.renameSync(source, target);
      });
      
      console.log(`  → screenshots/ フォルダに移動しました`);
    }
  }
  
  // レポートの生成通知
  const reportPath = path.join(__dirname, 'playwright-report', 'index.html');
  if (fs.existsSync(reportPath)) {
    console.log('\n📄 HTMLレポート生成完了:');
    console.log(`  → ${reportPath}`);
    
    if (!process.env.CI) {
      console.log('\n  レポートを開くには:');
      console.log('  npx playwright show-report');
    }
  }
  
  // テスト完了時刻の記録
  const completionInfo = {
    timestamp: new Date().toISOString(),
    summary: summary,
    environment: process.env.CI ? 'CI' : 'Local',
    exitCode: summary.failed > 0 ? 1 : 0
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'test-results', 'completion.json'),
    JSON.stringify(completionInfo, null, 2)
  );
  
  // 最終メッセージ
  console.log('\n' + '='.repeat(60));
  if (summary.failed === 0 && summary.total > 0) {
    console.log('  🎉 すべてのテストが成功しました！');
  } else if (summary.failed > 0) {
    console.log(`  ⚠️ ${summary.failed}個のテストが失敗しました`);
  }
  console.log('='.repeat(60));
  
  console.log('\n✅ グローバルティアダウン完了\n');
  
  // 失敗がある場合は終了コードを設定
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
};