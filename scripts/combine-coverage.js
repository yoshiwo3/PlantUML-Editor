/**
 * カバレッジレポート統合スクリプト
 * 複数のテストスイートからのカバレッジデータを統合
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * カバレッジ統合の設定
 */
const CONFIG = {
  inputDirs: [
    'coverage/jp2plantuml',
    'coverage/plantuml-editor', 
    'coverage/integration'
  ],
  outputDir: 'coverage/combined',
  thresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },
  reportFormats: ['html', 'lcov', 'json', 'text-summary']
};

/**
 * メイン処理
 */
async function main() {
  console.log('🔄 カバレッジレポート統合開始...');
  
  try {
    // 1. 出力ディレクトリの準備
    await prepareOutputDirectory();
    
    // 2. カバレッジデータの収集
    const coverageData = await collectCoverageData();
    
    // 3. データの統合
    const combinedData = await combineCoverageData(coverageData);
    
    // 4. 統合カバレッジファイルの生成
    await generateCombinedFiles(combinedData);
    
    // 5. HTMLレポートの生成
    await generateReports();
    
    // 6. カバレッジ閾値のチェック
    await checkCoverageThresholds(combinedData);
    
    // 7. サマリーの表示
    displaySummary(combinedData);
    
    console.log('✅ カバレッジレポート統合完了');
    
  } catch (error) {
    console.error('❌ カバレッジレポート統合失敗:', error.message);
    process.exit(1);
  }
}

/**
 * 出力ディレクトリの準備
 */
async function prepareOutputDirectory() {
  const outputDir = CONFIG.outputDir;
  
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'lcov-report'), { recursive: true });
  
  console.log(`✓ 出力ディレクトリ準備完了: ${outputDir}`);
}

/**
 * カバレッジデータの収集
 */
async function collectCoverageData() {
  console.log('📊 カバレッジデータ収集中...');
  
  const coverageData = {};
  
  for (const inputDir of CONFIG.inputDirs) {
    const coverageFile = path.join(inputDir, 'coverage-final.json');
    
    if (fs.existsSync(coverageFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        Object.assign(coverageData, data);
        console.log(`✓ データ収集: ${inputDir}`);
      } catch (error) {
        console.warn(`⚠ データ収集失敗: ${inputDir} - ${error.message}`);
      }
    } else {
      console.warn(`⚠ カバレッジファイル未発見: ${coverageFile}`);
    }
  }
  
  console.log(`✓ 収集完了: ${Object.keys(coverageData).length} ファイル`);
  return coverageData;
}

/**
 * カバレッジデータの統合
 */
async function combineCoverageData(coverageData) {
  console.log('🔄 カバレッジデータ統合中...');
  
  const combinedStats = {
    statements: { total: 0, covered: 0, pct: 0 },
    branches: { total: 0, covered: 0, pct: 0 },
    functions: { total: 0, covered: 0, pct: 0 },
    lines: { total: 0, covered: 0, pct: 0 }
  };
  
  // 各ファイルの統計を集計
  Object.values(coverageData).forEach(fileData => {
    if (fileData.s) { // statements
      Object.values(fileData.s).forEach(count => {
        combinedStats.statements.total++;
        if (count > 0) combinedStats.statements.covered++;
      });
    }
    
    if (fileData.b) { // branches
      Object.values(fileData.b).forEach(branches => {
        branches.forEach(count => {
          combinedStats.branches.total++;
          if (count > 0) combinedStats.branches.covered++;
        });
      });
    }
    
    if (fileData.f) { // functions
      Object.values(fileData.f).forEach(count => {
        combinedStats.functions.total++;
        if (count > 0) combinedStats.functions.covered++;
      });
    }
  });
  
  // パーセンテージの計算
  Object.keys(combinedStats).forEach(key => {
    const stats = combinedStats[key];
    stats.pct = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100 * 100) / 100 : 0;
  });
  
  console.log('✓ データ統合完了');
  return { files: coverageData, summary: combinedStats };
}

/**
 * 統合カバレッジファイルの生成
 */
async function generateCombinedFiles(combinedData) {
  console.log('📄 統合ファイル生成中...');
  
  // coverage-final.json の生成
  const coverageFinalPath = path.join(CONFIG.outputDir, 'coverage-final.json');
  fs.writeFileSync(coverageFinalPath, JSON.stringify(combinedData.files, null, 2));
  
  // coverage-summary.json の生成
  const coverageSummaryPath = path.join(CONFIG.outputDir, 'coverage-summary.json');
  const summaryData = {
    total: combinedData.summary,
    timestamp: new Date().toISOString(),
    files: Object.keys(combinedData.files).length
  };
  fs.writeFileSync(coverageSummaryPath, JSON.stringify(summaryData, null, 2));
  
  // lcov.info の生成
  await generateLcovFile(combinedData.files);
  
  console.log('✓ 統合ファイル生成完了');
}

/**
 * LCOV形式ファイルの生成
 */
async function generateLcovFile(filesData) {
  const lcovPath = path.join(CONFIG.outputDir, 'lcov.info');
  let lcovContent = '';
  
  Object.entries(filesData).forEach(([filePath, fileData]) => {
    lcovContent += `TN:\n`;
    lcovContent += `SF:${filePath}\n`;
    
    // 関数情報
    if (fileData.fnMap) {
      Object.entries(fileData.fnMap).forEach(([key, func]) => {
        lcovContent += `FN:${func.decl.start.line},${func.name}\n`;
      });
      
      Object.entries(fileData.f).forEach(([key, count]) => {
        const func = fileData.fnMap[key];
        if (func) {
          lcovContent += `FNDA:${count},${func.name}\n`;
        }
      });
      
      lcovContent += `FNF:${Object.keys(fileData.fnMap).length}\n`;
      lcovContent += `FNH:${Object.values(fileData.f).filter(c => c > 0).length}\n`;
    }
    
    // 分岐情報
    if (fileData.branchMap) {
      Object.entries(fileData.branchMap).forEach(([key, branch]) => {
        lcovContent += `BA:${key},${branch.locations.length}\n`;
      });
      
      Object.entries(fileData.b).forEach(([key, branches]) => {
        branches.forEach((count, index) => {
          lcovContent += `BDA:${key},${index},${count}\n`;
        });
      });
      
      const totalBranches = Object.values(fileData.b).reduce((sum, branches) => sum + branches.length, 0);
      const coveredBranches = Object.values(fileData.b).reduce((sum, branches) => 
        sum + branches.filter(c => c > 0).length, 0);
      
      lcovContent += `BRF:${totalBranches}\n`;
      lcovContent += `BRH:${coveredBranches}\n`;
    }
    
    // 行情報
    if (fileData.statementMap) {
      Object.entries(fileData.statementMap).forEach(([key, stmt]) => {
        lcovContent += `DA:${stmt.start.line},${fileData.s[key] || 0}\n`;
      });
      
      const totalLines = Object.keys(fileData.statementMap).length;
      const coveredLines = Object.values(fileData.s).filter(c => c > 0).length;
      
      lcovContent += `LF:${totalLines}\n`;
      lcovContent += `LH:${coveredLines}\n`;
    }
    
    lcovContent += 'end_of_record\n';
  });
  
  fs.writeFileSync(lcovPath, lcovContent);
  console.log('✓ LCOV ファイル生成完了');
}

/**
 * HTMLレポートの生成
 */
async function generateReports() {
  console.log('📊 HTMLレポート生成中...');
  
  try {
    // genhtml コマンドが利用可能かチェック
    try {
      execSync('genhtml --version', { stdio: 'pipe' });
      
      // genhtml を使ってHTMLレポート生成
      const lcovFile = path.join(CONFIG.outputDir, 'lcov.info');
      const htmlOutputDir = path.join(CONFIG.outputDir, 'lcov-report');
      
      execSync(`genhtml ${lcovFile} --output-directory ${htmlOutputDir} --title "PlantUML 統合カバレッジレポート"`, {
        stdio: 'pipe'
      });
      
      console.log('✓ HTMLレポート生成完了 (genhtml)');
      
    } catch (error) {
      // genhtml が利用できない場合は独自のHTMLレポート生成
      await generateCustomHtmlReport();
    }
    
  } catch (error) {
    console.warn(`⚠ HTMLレポート生成エラー: ${error.message}`);
  }
}

/**
 * カスタムHTMLレポートの生成
 */
async function generateCustomHtmlReport() {
  const summaryFile = path.join(CONFIG.outputDir, 'coverage-summary.json');
  const summaryData = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>PlantUML 統合カバレッジレポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .high { background-color: #d4edda; }
        .medium { background-color: #fff3cd; }
        .low { background-color: #f8d7da; }
        .percentage { font-size: 2em; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PlantUML プロジェクト統合カバレッジレポート</h1>
        <p>生成日時: ${summaryData.timestamp}</p>
        <p>対象ファイル数: ${summaryData.files}</p>
    </div>
    
    <div class="stats">
        <div class="stat ${getColorClass(summaryData.total.statements.pct)}">
            <h3>文 (Statements)</h3>
            <div class="percentage">${summaryData.total.statements.pct}%</div>
            <p>${summaryData.total.statements.covered} / ${summaryData.total.statements.total}</p>
        </div>
        
        <div class="stat ${getColorClass(summaryData.total.branches.pct)}">
            <h3>分岐 (Branches)</h3>
            <div class="percentage">${summaryData.total.branches.pct}%</div>
            <p>${summaryData.total.branches.covered} / ${summaryData.total.branches.total}</p>
        </div>
        
        <div class="stat ${getColorClass(summaryData.total.functions.pct)}">
            <h3>関数 (Functions)</h3>
            <div class="percentage">${summaryData.total.functions.pct}%</div>
            <p>${summaryData.total.functions.covered} / ${summaryData.total.functions.total}</p>
        </div>
        
        <div class="stat ${getColorClass(summaryData.total.lines.pct)}">
            <h3>行 (Lines)</h3>
            <div class="percentage">${summaryData.total.lines.pct}%</div>
            <p>${summaryData.total.lines.covered} / ${summaryData.total.lines.total}</p>
        </div>
    </div>
</body>
</html>
`;

  function getColorClass(percentage) {
    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';
    return 'low';
  }

  const htmlFile = path.join(CONFIG.outputDir, 'lcov-report', 'index.html');
  fs.writeFileSync(htmlFile, htmlContent);
  console.log('✓ カスタムHTMLレポート生成完了');
}

/**
 * カバレッジ閾値のチェック
 */
async function checkCoverageThresholds(combinedData) {
  console.log('🎯 カバレッジ閾値チェック中...');
  
  const thresholds = CONFIG.thresholds.global;
  const actual = combinedData.summary;
  const results = {};
  
  Object.keys(thresholds).forEach(metric => {
    const threshold = thresholds[metric];
    const actualValue = actual[metric].pct;
    const passed = actualValue >= threshold;
    
    results[metric] = {
      threshold,
      actual: actualValue,
      passed,
      diff: actualValue - threshold
    };
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${metric}: ${actualValue}% (閾値: ${threshold}%)`);
  });
  
  // 結果ファイルの保存
  const resultsFile = path.join(CONFIG.outputDir, 'threshold-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  // 全体的な成功/失敗の判定
  const allPassed = Object.values(results).every(r => r.passed);
  if (!allPassed) {
    console.warn('⚠ 一部のカバレッジ閾値が満たされていません');
  } else {
    console.log('✅ すべてのカバレッジ閾値をクリアしました');
  }
  
  return allPassed;
}

/**
 * サマリーの表示
 */
function displaySummary(combinedData) {
  console.log('\n📊 統合カバレッジサマリー:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const summary = combinedData.summary;
  Object.entries(summary).forEach(([metric, data]) => {
    console.log(`${metric.padEnd(12)}: ${data.pct.toString().padStart(6)}% (${data.covered}/${data.total})`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`対象ファイル数: ${Object.keys(combinedData.files).length}`);
  console.log(`レポート場所  : ${CONFIG.outputDir}/lcov-report/index.html`);
  console.log('');
}

// スクリプトの実行
if (require.main === module) {
  main();
}

module.exports = {
  main,
  CONFIG
};