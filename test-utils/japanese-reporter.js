/**
 * 日本語対応Jestカスタムレポーター - PlantUMLプロジェクト
 * 
 * このレポーターは以下の機能を提供します:
 * - 日本語でのテスト結果表示
 * - 詳細なエラー情報と推奨事項
 * - カバレッジ情報の日本語表示
 * - CI/CD環境での適切な出力形式
 */

const fs = require('fs');
const path = require('path');

/**
 * 日本語Jestレポータークラス
 */
class JapaneseReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options || {};
    this.outputFile = this.options.outputFile || './test-results/jest-results-ja.json';
    this.startTime = Date.now();
    this.results = {
      summary: {},
      suites: [],
      coverage: {},
      recommendations: []
    };
  }

  /**
   * テストラン開始時
   */
  onRunStart(aggregatedResults, options) {
    this.startTime = Date.now();
    console.log('\n🧪 Jest テストスイートを開始します...');
    console.log(`📊 実行予定テスト数: ${aggregatedResults.numTotalTestSuites} スイート`);
  }

  /**
   * 個別テストスイート完了時
   */
  onTestSuiteResult(test, testResult, aggregatedResults) {
    const suiteName = this.getRelativePath(testResult.testFilePath);
    const duration = testResult.perfStats.end - testResult.perfStats.start;
    
    // スイート結果の日本語化
    const suiteResult = {
      name: suiteName,
      duration,
      status: this.getSuiteStatus(testResult),
      tests: {
        total: testResult.numTotalTests,
        passed: testResult.numPassingTests,
        failed: testResult.numFailingTests,
        skipped: testResult.numPendingTests,
        todo: testResult.numTodoTests
      },
      coverage: this.extractCoverage(testResult),
      errors: this.processErrors(testResult.testResults),
      timestamp: new Date().toISOString()
    };

    this.results.suites.push(suiteResult);

    // 進行状況の表示
    this.displaySuiteProgress(suiteResult, aggregatedResults);
  }

  /**
   * テストラン完了時
   */
  onRunComplete(contexts, aggregatedResults) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // 最終結果の集計
    this.results.summary = {
      duration,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      total: {
        suites: aggregatedResults.numTotalTestSuites,
        tests: aggregatedResults.numTotalTests,
        passed: aggregatedResults.numPassedTests,
        failed: aggregatedResults.numFailedTests,
        skipped: aggregatedResults.numPendingTests,
        todo: aggregatedResults.numTodoTests
      },
      success: aggregatedResults.success,
      coverage: this.processCoverage(aggregatedResults.coverageMap),
      performance: this.analyzePerformance()
    };

    // 推奨事項の生成
    this.generateRecommendations();

    // 結果の表示
    this.displayFinalResults();

    // JSONファイルに結果を保存
    this.saveResults();
  }

  /**
   * スイートの状態を日本語で取得
   */
  getSuiteStatus(testResult) {
    if (testResult.numFailingTests > 0) {
      return '失敗';
    } else if (testResult.numPendingTests > 0) {
      return 'スキップあり';
    } else if (testResult.numTodoTests > 0) {
      return 'TODO含む';
    } else {
      return '成功';
    }
  }

  /**
   * 相対パスを取得
   */
  getRelativePath(filePath) {
    const cwd = process.cwd();
    return path.relative(cwd, filePath);
  }

  /**
   * カバレッジ情報を抽出
   */
  extractCoverage(testResult) {
    if (!testResult.coverage) return null;

    return {
      statements: this.formatCoverageMetric(testResult.coverage.statements),
      branches: this.formatCoverageMetric(testResult.coverage.branches),
      functions: this.formatCoverageMetric(testResult.coverage.functions),
      lines: this.formatCoverageMetric(testResult.coverage.lines)
    };
  }

  /**
   * カバレッジメトリクスをフォーマット
   */
  formatCoverageMetric(metric) {
    if (!metric) return null;
    
    return {
      total: metric.total,
      covered: metric.covered,
      percentage: metric.pct
    };
  }

  /**
   * エラー情報を処理
   */
  processErrors(testResults) {
    const errors = [];

    testResults.forEach(test => {
      if (test.status === 'failed') {
        test.failureMessages.forEach(message => {
          errors.push({
            testName: test.fullName,
            message: this.translateErrorMessage(message),
            location: this.extractErrorLocation(message),
            suggestion: this.generateErrorSuggestion(message)
          });
        });
      }
    });

    return errors;
  }

  /**
   * エラーメッセージを日本語化
   */
  translateErrorMessage(message) {
    // 一般的なJestエラーメッセージの日本語化
    const translations = {
      'Expected': '期待値',
      'Received': '実際の値',
      'toBe': 'と等しいこと',
      'toEqual': 'と等価であること',
      'toContain': 'を含むこと',
      'toMatch': 'とマッチすること',
      'toBeTruthy': '真の値であること',
      'toBeFalsy': '偽の値であること',
      'toBeNull': 'nullであること',
      'toBeUndefined': 'undefinedであること',
      'toThrow': '例外が投げられること',
      'Timeout': 'タイムアウト',
      'Network Error': 'ネットワークエラー',
      'Test suite failed to run': 'テストスイートの実行に失敗'
    };

    let translatedMessage = message;
    Object.entries(translations).forEach(([english, japanese]) => {
      const regex = new RegExp(english, 'g');
      translatedMessage = translatedMessage.replace(regex, japanese);
    });

    return translatedMessage;
  }

  /**
   * エラー発生場所を抽出
   */
  extractErrorLocation(message) {
    const locationMatch = message.match(/at (.+):(\d+):(\d+)/);
    if (locationMatch) {
      return {
        file: locationMatch[1],
        line: parseInt(locationMatch[2]),
        column: parseInt(locationMatch[3])
      };
    }
    return null;
  }

  /**
   * エラーに対する修正提案を生成
   */
  generateErrorSuggestion(message) {
    const suggestions = {
      'toBe': 'strict equality (===) を確認してください。オブジェクトの比較には toEqual() を使用してください。',
      'toEqual': 'オブジェクトや配列の内容を確認してください。深い比較が行われます。',
      'timeout': 'テストのタイムアウト時間を延長するか、非同期処理の完了を適切に待機してください。',
      'network': 'ネットワーク接続とモックの設定を確認してください。',
      'undefined': '変数やプロパティが正しく定義されているか確認してください。',
      'null': 'null チェックを追加し、適切な初期化を行ってください。'
    };

    for (const [keyword, suggestion] of Object.entries(suggestions)) {
      if (message.toLowerCase().includes(keyword)) {
        return `💡 推奨事項: ${suggestion}`;
      }
    }

    return '💡 推奨事項: エラーメッセージの詳細を確認し、テストコードと実装を見直してください。';
  }

  /**
   * スイート進行状況を表示
   */
  displaySuiteProgress(suiteResult, aggregatedResults) {
    const progress = `${aggregatedResults.numCompletedTestSuites}/${aggregatedResults.numTotalTestSuites}`;
    const status = this.getStatusIcon(suiteResult.status);
    const duration = `${suiteResult.duration}ms`;

    console.log(`${status} [${progress}] ${suiteResult.name} (${duration})`);

    if (suiteResult.tests.failed > 0) {
      console.log(`   ❌ 失敗: ${suiteResult.tests.failed}件`);
    }
    if (suiteResult.tests.skipped > 0) {
      console.log(`   ⏭️ スキップ: ${suiteResult.tests.skipped}件`);
    }
  }

  /**
   * ステータスアイコンを取得
   */
  getStatusIcon(status) {
    const icons = {
      '成功': '✅',
      '失敗': '❌',
      'スキップあり': '⚠️',
      'TODO含む': '📝'
    };
    return icons[status] || '❓';
  }

  /**
   * カバレッジ情報を処理
   */
  processCoverage(coverageMap) {
    if (!coverageMap) return null;

    const summary = coverageMap.getCoverageSummary();
    return {
      statements: {
        total: summary.statements.total,
        covered: summary.statements.covered,
        percentage: summary.statements.pct
      },
      branches: {
        total: summary.branches.total,
        covered: summary.branches.covered,
        percentage: summary.branches.pct
      },
      functions: {
        total: summary.functions.total,
        covered: summary.functions.covered,
        percentage: summary.functions.pct
      },
      lines: {
        total: summary.lines.total,
        covered: summary.lines.covered,
        percentage: summary.lines.pct
      }
    };
  }

  /**
   * パフォーマンス分析
   */
  analyzePerformance() {
    const suiteDurations = this.results.suites.map(suite => suite.duration);
    const totalDuration = suiteDurations.reduce((sum, duration) => sum + duration, 0);
    const avgDuration = totalDuration / suiteDurations.length;
    const maxDuration = Math.max(...suiteDurations);
    const minDuration = Math.min(...suiteDurations);

    return {
      total: totalDuration,
      average: avgDuration,
      max: maxDuration,
      min: minDuration,
      slowSuites: this.results.suites
        .filter(suite => suite.duration > avgDuration * 2)
        .map(suite => ({ name: suite.name, duration: suite.duration }))
    };
  }

  /**
   * 推奨事項を生成
   */
  generateRecommendations() {
    const recommendations = [];

    // カバレッジに基づく推奨事項
    if (this.results.summary.coverage) {
      const coverage = this.results.summary.coverage;
      if (coverage.statements.percentage < 80) {
        recommendations.push({
          type: 'カバレッジ',
          priority: 'high',
          message: `ステートメントカバレッジが${coverage.statements.percentage.toFixed(1)}%です。80%以上を目標にしてテストを追加してください。`
        });
      }
      if (coverage.branches.percentage < 70) {
        recommendations.push({
          type: 'カバレッジ',
          priority: 'medium',
          message: `ブランチカバレッジが${coverage.branches.percentage.toFixed(1)}%です。条件分岐のテストを追加してください。`
        });
      }
    }

    // パフォーマンスに基づく推奨事項
    const slowSuites = this.results.summary.performance.slowSuites;
    if (slowSuites.length > 0) {
      recommendations.push({
        type: 'パフォーマンス',
        priority: 'medium',
        message: `実行時間が長いテストスイートがあります: ${slowSuites.map(s => s.name).join(', ')}`
      });
    }

    // 失敗テストに基づく推奨事項
    const failedSuites = this.results.suites.filter(suite => suite.status === '失敗');
    if (failedSuites.length > 0) {
      recommendations.push({
        type: 'テスト失敗',
        priority: 'high',
        message: `${failedSuites.length}個のテストスイートが失敗しています。詳細なエラー情報を確認してください。`
      });
    }

    this.results.recommendations = recommendations;
  }

  /**
   * 最終結果を表示
   */
  displayFinalResults() {
    const summary = this.results.summary;
    const duration = (summary.duration / 1000).toFixed(2);

    console.log('\n📋 テスト実行結果サマリー');
    console.log('================================');
    console.log(`⏱️  実行時間: ${duration}秒`);
    console.log(`📁 テストスイート: ${summary.total.suites}個`);
    console.log(`🧪 総テスト数: ${summary.total.tests}個`);
    console.log(`✅ 成功: ${summary.total.passed}個`);
    console.log(`❌ 失敗: ${summary.total.failed}個`);
    console.log(`⏭️ スキップ: ${summary.total.skipped}個`);
    
    if (summary.total.todo > 0) {
      console.log(`📝 TODO: ${summary.total.todo}個`);
    }

    // カバレッジ情報の表示
    if (summary.coverage) {
      console.log('\n📊 カバレッジ情報');
      console.log('------------------');
      console.log(`ステートメント: ${summary.coverage.statements.percentage.toFixed(2)}% (${summary.coverage.statements.covered}/${summary.coverage.statements.total})`);
      console.log(`ブランチ: ${summary.coverage.branches.percentage.toFixed(2)}% (${summary.coverage.branches.covered}/${summary.coverage.branches.total})`);
      console.log(`関数: ${summary.coverage.functions.percentage.toFixed(2)}% (${summary.coverage.functions.covered}/${summary.coverage.functions.total})`);
      console.log(`行: ${summary.coverage.lines.percentage.toFixed(2)}% (${summary.coverage.lines.covered}/${summary.coverage.lines.total})`);
    }

    // パフォーマンス情報の表示
    if (summary.performance.slowSuites.length > 0) {
      console.log('\n⚡ パフォーマンス注意');
      console.log('------------------');
      summary.performance.slowSuites.forEach(suite => {
        console.log(`⏰ ${suite.name}: ${suite.duration}ms`);
      });
    }

    // 推奨事項の表示
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 推奨事項');
      console.log('----------');
      this.results.recommendations.forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${icon} [${rec.type}] ${rec.message}`);
      });
    }

    // 最終判定
    const successIcon = summary.success ? '🎉' : '💥';
    const successMessage = summary.success ? 'テストが正常に完了しました！' : 'テストに失敗があります。上記の詳細を確認してください。';
    console.log(`\n${successIcon} ${successMessage}`);
  }

  /**
   * 結果をJSONファイルに保存
   */
  saveResults() {
    try {
      // 出力ディレクトリを作成
      const outputDir = path.dirname(this.outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 結果をファイルに保存
      fs.writeFileSync(this.outputFile, JSON.stringify(this.results, null, 2), 'utf8');
      console.log(`\n📄 詳細結果を保存しました: ${this.outputFile}`);

      // マークダウン形式のレポートも生成
      this.generateMarkdownReport();

    } catch (error) {
      console.warn(`⚠️ 結果ファイルの保存に失敗しました: ${error.message}`);
    }
  }

  /**
   * マークダウン形式のレポートを生成
   */
  generateMarkdownReport() {
    const summary = this.results.summary;
    const reportPath = this.outputFile.replace('.json', '.md');

    const markdown = `# Jest テスト実行レポート

## 実行概要

- **実行日時**: ${summary.endTime}
- **実行時間**: ${(summary.duration / 1000).toFixed(2)}秒
- **テストスイート数**: ${summary.total.suites}個
- **総テスト数**: ${summary.total.tests}個

## 結果サマリー

| 項目 | 件数 | 割合 |
|------|------|------|
| ✅ 成功 | ${summary.total.passed} | ${((summary.total.passed / summary.total.tests) * 100).toFixed(1)}% |
| ❌ 失敗 | ${summary.total.failed} | ${((summary.total.failed / summary.total.tests) * 100).toFixed(1)}% |
| ⏭️ スキップ | ${summary.total.skipped} | ${((summary.total.skipped / summary.total.tests) * 100).toFixed(1)}% |
${summary.total.todo > 0 ? `| 📝 TODO | ${summary.total.todo} | ${((summary.total.todo / summary.total.tests) * 100).toFixed(1)}% |` : ''}

${summary.coverage ? `## カバレッジ情報

| メトリクス | カバレッジ | カバー済み/総数 |
|------------|------------|----------------|
| ステートメント | ${summary.coverage.statements.percentage.toFixed(2)}% | ${summary.coverage.statements.covered}/${summary.coverage.statements.total} |
| ブランチ | ${summary.coverage.branches.percentage.toFixed(2)}% | ${summary.coverage.branches.covered}/${summary.coverage.branches.total} |
| 関数 | ${summary.coverage.functions.percentage.toFixed(2)}% | ${summary.coverage.functions.covered}/${summary.coverage.functions.total} |
| 行 | ${summary.coverage.lines.percentage.toFixed(2)}% | ${summary.coverage.lines.covered}/${summary.coverage.lines.total} |` : ''}

## スイート別結果

${this.results.suites.map(suite => `
### ${suite.name}

- **ステータス**: ${this.getStatusIcon(suite.status)} ${suite.status}
- **実行時間**: ${suite.duration}ms
- **テスト結果**: 成功${suite.tests.passed}件、失敗${suite.tests.failed}件、スキップ${suite.tests.skipped}件

${suite.errors.length > 0 ? `
#### エラー詳細

${suite.errors.map(error => `
**${error.testName}**

\`\`\`
${error.message}
\`\`\`

${error.suggestion}
`).join('\n')}` : ''}
`).join('\n')}

${this.results.recommendations.length > 0 ? `## 推奨事項

${this.results.recommendations.map(rec => 
  `### ${rec.priority === 'high' ? '🔴 高' : rec.priority === 'medium' ? '🟡 中' : '🟢 低'} - ${rec.type}

${rec.message}`
).join('\n\n')}` : ''}

## 結論

${summary.success ? 
  '✅ すべてのテストが正常に完了しました。' : 
  '❌ 一部のテストで問題が発生しています。上記の詳細とエラー情報を確認して対応してください。'}

---
*このレポートは自動生成されました: ${new Date().toLocaleString('ja-JP')}*
`;

    try {
      fs.writeFileSync(reportPath, markdown, 'utf8');
      console.log(`📄 マークダウンレポートを保存しました: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️ マークダウンレポートの保存に失敗しました: ${error.message}`);
    }
  }
}

module.exports = JapaneseReporter;