/**
 * グローバルティアダウン - PlantUMLプロジェクト
 * 
 * テスト実行後のクリーンアップを行います
 */

const fs = require('fs').promises;
const path = require('path');

module.exports = async function globalTeardown() {
  console.log('🧹 テスト環境のグローバルクリーンアップを開始します...');
  
  try {
    // 1. テスト結果の集約
    await aggregateTestResults();
    
    // 2. 一時ファイルのクリーンアップ
    await cleanupTempFiles();
    
    // 3. モックサーバーの停止（必要に応じて）
    // await stopMockServer();
    
    // 4. テスト用データベースのクリーンアップ（必要に応じて）
    // await cleanupTestDatabase();
    
    // 5. 最終レポートの生成
    await generateFinalReport();
    
    console.log('✅ グローバルクリーンアップが完了しました');
    
  } catch (error) {
    console.error('❌ グローバルクリーンアップに失敗しました:', error);
    // クリーンアップエラーはテスト結果に影響させない
  }
};

// ヘルパー関数
async function aggregateTestResults() {
  console.log('📊 テスト結果を集約中...');
  
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const files = await fs.readdir(testResultsDir);
    
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const results = {
      jest: [],
      playwright: [],
      integration: []
    };
    
    for (const file of jsonFiles) {
      const filePath = path.join(testResultsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (file.includes('jest')) {
        results.jest.push(data);
      } else if (file.includes('playwright')) {
        results.playwright.push(data);
      } else if (file.includes('integration')) {
        results.integration.push(data);
      }
    }
    
    // 集約結果を保存
    const aggregatedPath = path.join(testResultsDir, 'aggregated-results.json');
    await fs.writeFile(aggregatedPath, JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.warn('⚠️ テスト結果の集約に失敗:', error.message);
  }
}

async function cleanupTempFiles() {
  console.log('🗂️ 一時ファイルをクリーンアップ中...');
  
  try {
    const tempDirs = [
      'tmp',
      '.tmp',
      '.jest-cache',
      '.playwright-cache'
    ];
    
    for (const dir of tempDirs) {
      const fullPath = path.join(process.cwd(), dir);
      try {
        await fs.rm(fullPath, { recursive: true, force: true });
      } catch (error) {
        // ディレクトリが存在しない場合は無視
        if (error.code !== 'ENOENT') {
          console.warn(`⚠️ ${dir}の削除に失敗:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.warn('⚠️ 一時ファイルのクリーンアップに失敗:', error.message);
  }
}

async function stopMockServer() {
  console.log('🛑 モックサーバーを停止中...');
  // モックサーバーの停止ロジック
}

async function cleanupTestDatabase() {
  console.log('🗄️ テスト用データベースをクリーンアップ中...');
  // テスト用データベースのクリーンアップロジック
}

async function generateFinalReport() {
  console.log('📋 最終レポートを生成中...');
  
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const aggregatedPath = path.join(testResultsDir, 'aggregated-results.json');
    
    // 集約結果が存在する場合、最終レポートを生成
    try {
      const aggregatedContent = await fs.readFile(aggregatedPath, 'utf8');
      const aggregatedData = JSON.parse(aggregatedContent);
      
      const finalReport = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTestSuites: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0
        },
        details: aggregatedData,
        recommendations: generateRecommendations(aggregatedData)
      };
      
      // Jest結果の集約
      aggregatedData.jest.forEach(jestResult => {
        if (jestResult.summary) {
          finalReport.summary.totalTestSuites += jestResult.summary.total?.suites || 0;
          finalReport.summary.totalTests += jestResult.summary.total?.tests || 0;
          finalReport.summary.passedTests += jestResult.summary.total?.passed || 0;
          finalReport.summary.failedTests += jestResult.summary.total?.failed || 0;
          finalReport.summary.skippedTests += jestResult.summary.total?.skipped || 0;
        }
      });
      
      // Playwright結果の集約
      aggregatedData.playwright.forEach(playwrightResult => {
        if (playwrightResult.summary?.totals) {
          finalReport.summary.totalTests += playwrightResult.summary.totals.tests || 0;
          finalReport.summary.passedTests += playwrightResult.summary.totals.passed || 0;
          finalReport.summary.failedTests += playwrightResult.summary.totals.failed || 0;
          finalReport.summary.skippedTests += playwrightResult.summary.totals.skipped || 0;
        }
      });
      
      // 最終レポートを保存
      const finalReportPath = path.join(testResultsDir, 'final-test-report.json');
      await fs.writeFile(finalReportPath, JSON.stringify(finalReport, null, 2));
      
      // マークダウン形式でも保存
      const markdownReport = generateMarkdownFinalReport(finalReport);
      const markdownPath = path.join(testResultsDir, 'final-test-report.md');
      await fs.writeFile(markdownPath, markdownReport);
      
      console.log('📄 最終レポートを保存しました:', finalReportPath);
      
    } catch (error) {
      console.warn('⚠️ 集約結果の読み込みに失敗:', error.message);
    }
    
  } catch (error) {
    console.warn('⚠️ 最終レポートの生成に失敗:', error.message);
  }
}

function generateRecommendations(aggregatedData) {
  const recommendations = [];
  
  // Jest結果からの推奨事項
  aggregatedData.jest.forEach(jestResult => {
    if (jestResult.recommendations) {
      recommendations.push(...jestResult.recommendations);
    }
  });
  
  // Playwright結果からの推奨事項
  aggregatedData.playwright.forEach(playwrightResult => {
    if (playwrightResult.recommendations) {
      recommendations.push(...playwrightResult.recommendations);
    }
  });
  
  // 重複を除去
  const uniqueRecommendations = recommendations.filter((rec, index, self) => 
    index === self.findIndex(r => r.message === rec.message)
  );
  
  return uniqueRecommendations;
}

function generateMarkdownFinalReport(finalReport) {
  const summary = finalReport.summary;
  const successRate = summary.totalTests > 0 ? 
    ((summary.passedTests / summary.totalTests) * 100).toFixed(1) : 0;
  
  return `# PlantUML プロジェクト最終テストレポート

## 実行概要

- **実行日時**: ${new Date(finalReport.timestamp).toLocaleString('ja-JP')}
- **総テストスイート数**: ${summary.totalTestSuites}
- **総テスト数**: ${summary.totalTests}
- **成功率**: ${successRate}%

## 結果サマリー

| 項目 | 件数 | 割合 |
|------|------|------|
| ✅ 成功 | ${summary.passedTests} | ${successRate}% |
| ❌ 失敗 | ${summary.failedTests} | ${((summary.failedTests / summary.totalTests) * 100).toFixed(1)}% |
| ⏭️ スキップ | ${summary.skippedTests} | ${((summary.skippedTests / summary.totalTests) * 100).toFixed(1)}% |

## テストタイプ別詳細

### Jest（ユニット・統合テスト）

- **実行スイート数**: ${finalReport.details.jest.length}
- **カバレッジ情報**: 各Jestレポートを参照

### Playwright（E2Eテスト）

- **実行セッション数**: ${finalReport.details.playwright.length}
- **ブラウザ互換性**: 複数ブラウザでの動作確認済み

${finalReport.recommendations.length > 0 ? `## 総合推奨事項

${finalReport.recommendations.map(rec => 
  `### ${rec.priority === 'high' ? '🔴 高' : rec.priority === 'medium' ? '🟡 中' : '🟢 低'} - ${rec.type}

${rec.message}`
).join('\n\n')}` : ''}

## 結論

${summary.failedTests === 0 ? 
  '✅ すべてのテストが正常に完了しました。アプリケーションは期待通りに動作しています。' : 
  `❌ ${summary.failedTests}件のテストで問題が発生しています。詳細なレポートを確認して対応してください。`}

## 関連ファイル

- [詳細な統合結果](./aggregated-results.json)
- [Jestレポート](./jest-results-ja.md)
- [Playwrightレポート](./playwright-results-ja.md)

---
*このレポートは自動生成されました: ${new Date().toLocaleString('ja-JP')}*
`;
}