import fs from 'fs/promises';
import path from 'path';

/**
 * グローバルティアダウン
 * テスト実行後のクリーンアップを行う
 */
async function globalTeardown(config) {
  console.log('🧹 E2Eテストクリーンアップ開始...');
  
  try {
    // テスト結果の集計
    await aggregateTestResults();
    
    // レポートの生成
    await generateSummaryReport();
    
    // 一時ファイルのクリーンアップ
    await cleanupTemporaryFiles();
    
    // パフォーマンスデータの保存
    await savePerformanceData();
    
    console.log('✅ E2Eテストクリーンアップ完了');
  } catch (error) {
    console.error('❌ E2Eテストクリーンアップエラー:', error);
    // クリーンアップエラーはテスト結果に影響しないように
    // エラーを投げずにログ出力のみ
  }
}

/**
 * テスト結果の集計
 */
async function aggregateTestResults() {
  try {
    // Playwrightのテスト結果JSONを読み込み
    const resultFiles = await findTestResultFiles();
    const aggregatedResults = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        duration: 0
      },
      categories: {},
      browsers: {},
      scenarios: []
    };
    
    for (const file of resultFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const result = JSON.parse(content);
        
        // 結果を集計
        if (result.stats) {
          aggregatedResults.summary.total += result.stats.total || 0;
          aggregatedResults.summary.passed += result.stats.passed || 0;
          aggregatedResults.summary.failed += result.stats.failed || 0;
          aggregatedResults.summary.skipped += result.stats.skipped || 0;
          aggregatedResults.summary.duration += result.stats.duration || 0;
        }
        
        // ブラウザ別集計
        if (result.suites) {
          aggregateBrowserResults(result.suites, aggregatedResults);
        }
      } catch (parseError) {
        console.warn(`⚠️ テスト結果ファイル解析エラー (${file}):`, parseError.message);
      }
    }
    
    // 集計結果を保存
    await fs.writeFile(
      'reports/json/aggregated-results.json',
      JSON.stringify(aggregatedResults, null, 2),
      'utf8'
    );
    
    console.log('📊 テスト結果集計完了:', aggregatedResults.summary);
  } catch (error) {
    console.error('❌ テスト結果集計エラー:', error);
  }
}

/**
 * テスト結果ファイルの検索
 */
async function findTestResultFiles() {
  const resultFiles = [];
  const searchDirs = ['test-results', 'reports/json'];
  
  for (const dir of searchDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json') && file.includes('result')) {
          resultFiles.push(path.join(dir, file));
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  }
  
  return resultFiles;
}

/**
 * ブラウザ別結果の集計
 */
function aggregateBrowserResults(suites, aggregatedResults) {
  suites.forEach(suite => {
    if (suite.specs) {
      suite.specs.forEach(spec => {
        if (spec.tests) {
          spec.tests.forEach(test => {
            if (test.results) {
              test.results.forEach(result => {
                const projectName = result.workerIndex ? 
                  `worker-${result.workerIndex}` : 
                  'unknown';
                
                if (!aggregatedResults.browsers[projectName]) {
                  aggregatedResults.browsers[projectName] = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    duration: 0
                  };
                }
                
                aggregatedResults.browsers[projectName].total++;
                aggregatedResults.browsers[projectName].duration += result.duration || 0;
                
                if (result.status === 'passed') {
                  aggregatedResults.browsers[projectName].passed++;
                } else if (result.status === 'failed') {
                  aggregatedResults.browsers[projectName].failed++;
                }
              });
            }
          });
        }
      });
    }
  });
}

/**
 * サマリーレポートの生成
 */
async function generateSummaryReport() {
  try {
    const aggregatedResults = JSON.parse(
      await fs.readFile('reports/json/aggregated-results.json', 'utf8')
    );
    
    const timestamp = new Date().toISOString();
    const report = `
# E2Eテスト実行サマリーレポート

**実行日時**: ${timestamp}
**テストフレームワーク**: Playwright
**テストスイート**: Sprint2 E2E Test Framework

## 📊 テスト結果サマリー

| 項目 | 件数 |
|------|------|
| 総テスト数 | ${aggregatedResults.summary.total} |
| 成功 | ${aggregatedResults.summary.passed} |
| 失敗 | ${aggregatedResults.summary.failed} |
| スキップ | ${aggregatedResults.summary.skipped} |
| 実行時間 | ${Math.round(aggregatedResults.summary.duration / 1000)}秒 |

## 📈 成功率

**成功率**: ${aggregatedResults.summary.total > 0 
  ? Math.round((aggregatedResults.summary.passed / aggregatedResults.summary.total) * 100)
  : 0}%

## 🌐 ブラウザ別結果

${Object.entries(aggregatedResults.browsers).map(([browser, stats]) => `
### ${browser}
- 総数: ${stats.total}
- 成功: ${stats.passed}
- 失敗: ${stats.failed}
- 成功率: ${stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%
- 実行時間: ${Math.round(stats.duration / 1000)}秒
`).join('\n')}

## 🎯 品質メトリクス

### 目標達成状況
- [ ] テストカバレッジ: 80%以上
- [ ] 成功率: 95%以上
- [ ] 実行時間: 30分以内
- [ ] フレーキーテスト率: 5%以下

### 推奨事項
${generateRecommendations(aggregatedResults)}

---
*このレポートは自動生成されました*
`;
    
    await fs.writeFile('reports/summary-report.md', report, 'utf8');
    console.log('📝 サマリーレポート生成完了');
  } catch (error) {
    console.error('❌ サマリーレポート生成エラー:', error);
  }
}

/**
 * 推奨事項の生成
 */
function generateRecommendations(results) {
  const recommendations = [];
  
  if (results.summary.total === 0) {
    recommendations.push('- テストが実行されていません。設定を確認してください。');
  } else {
    const successRate = (results.summary.passed / results.summary.total) * 100;
    
    if (successRate < 95) {
      recommendations.push('- 成功率が目標を下回っています。失敗したテストの原因を調査してください。');
    }
    
    if (results.summary.duration > 1800000) { // 30分
      recommendations.push('- 実行時間が目標を超過しています。並列実行の最適化を検討してください。');
    }
    
    if (results.summary.failed > 0) {
      recommendations.push('- 失敗したテストがあります。詳細ログを確認し、修正を行ってください。');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- 全ての品質メトリクスが目標を達成しています。');
    }
  }
  
  return recommendations.join('\n');
}

/**
 * 一時ファイルのクリーンアップ
 */
async function cleanupTemporaryFiles() {
  const tempDirs = [
    'test-results/temp',
    'test-results/downloads',
    'auth'
  ];
  
  for (const dir of tempDirs) {
    try {
      await fs.rmdir(dir, { recursive: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  }
  
  console.log('🗑️ 一時ファイルクリーンアップ完了');
}

/**
 * パフォーマンスデータの保存
 */
async function savePerformanceData() {
  try {
    const performanceData = {
      timestamp: new Date().toISOString(),
      testRunId: `e2e-${Date.now()}`,
      metrics: {
        totalDuration: 0,
        averageTestDuration: 0,
        browserStartupTime: 0,
        networkRequests: 0,
        memoryUsage: {
          peak: 0,
          average: 0
        }
      }
    };
    
    // パフォーマンステストの結果があれば集計
    const perfFiles = await findPerformanceFiles();
    if (perfFiles.length > 0) {
      await aggregatePerformanceData(perfFiles, performanceData);
    }
    
    await fs.writeFile(
      'reports/performance-data.json',
      JSON.stringify(performanceData, null, 2),
      'utf8'
    );
    
    console.log('⚡ パフォーマンスデータ保存完了');
  } catch (error) {
    console.error('❌ パフォーマンスデータ保存エラー:', error);
  }
}

/**
 * パフォーマンスファイルの検索
 */
async function findPerformanceFiles() {
  const perfFiles = [];
  
  try {
    const files = await fs.readdir('test-results');
    for (const file of files) {
      if (file.includes('performance') && file.endsWith('.json')) {
        perfFiles.push(path.join('test-results', file));
      }
    }
  } catch (error) {
    // ディレクトリが存在しない場合は無視
  }
  
  return perfFiles;
}

/**
 * パフォーマンスデータの集計
 */
async function aggregatePerformanceData(files, performanceData) {
  let totalDuration = 0;
  let testCount = 0;
  let peakMemory = 0;
  let totalMemory = 0;
  let memoryCount = 0;
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const data = JSON.parse(content);
      
      if (data.duration) {
        totalDuration += data.duration;
        testCount++;
      }
      
      if (data.memory) {
        if (data.memory.peak && data.memory.peak > peakMemory) {
          peakMemory = data.memory.peak;
        }
        if (data.memory.used) {
          totalMemory += data.memory.used;
          memoryCount++;
        }
      }
    } catch (error) {
      console.warn(`⚠️ パフォーマンスファイル解析エラー (${file}):`, error.message);
    }
  }
  
  performanceData.metrics.totalDuration = totalDuration;
  performanceData.metrics.averageTestDuration = testCount > 0 ? totalDuration / testCount : 0;
  performanceData.metrics.memoryUsage.peak = peakMemory;
  performanceData.metrics.memoryUsage.average = memoryCount > 0 ? totalMemory / memoryCount : 0;
}

/**
 * CI/CD用のエクスポート
 */
async function exportCIData() {
  try {
    const aggregatedResults = JSON.parse(
      await fs.readFile('reports/json/aggregated-results.json', 'utf8')
    );
    
    // JUnit XML形式でのエクスポート（CI/CDシステム用）
    const junitXml = generateJUnitXML(aggregatedResults);
    await fs.writeFile('reports/junit/junit.xml', junitXml, 'utf8');
    
    // GitHub Actions用の出力
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=test-results::${JSON.stringify(aggregatedResults.summary)}`);
    }
    
    console.log('📤 CI/CDデータエクスポート完了');
  } catch (error) {
    console.error('❌ CI/CDデータエクスポートエラー:', error);
  }
}

/**
 * JUnit XML形式の生成
 */
function generateJUnitXML(results) {
  const { summary } = results;
  const timestamp = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="E2E Tests" tests="${summary.total}" failures="${summary.failed}" time="${summary.duration / 1000}">
  <testsuite name="PlantUML Editor E2E" tests="${summary.total}" failures="${summary.failed}" time="${summary.duration / 1000}" timestamp="${timestamp}">
    ${generateTestCases(summary)}
  </testsuite>
</testsuites>`;
}

/**
 * テストケースXMLの生成
 */
function generateTestCases(summary) {
  let testCases = '';
  
  // サマリー情報からテストケースを生成
  for (let i = 0; i < summary.passed; i++) {
    testCases += `    <testcase name="Test Case ${i + 1}" classname="E2E.Passed" time="0" />\n`;
  }
  
  for (let i = 0; i < summary.failed; i++) {
    testCases += `    <testcase name="Failed Test ${i + 1}" classname="E2E.Failed" time="0">
      <failure message="Test failed" type="AssertionError">Test execution failed</failure>
    </testcase>\n`;
  }
  
  return testCases;
}

export default globalTeardown;