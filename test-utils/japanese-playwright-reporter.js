/**
 * 日本語対応Playwrightカスタムレポーター - PlantUMLプロジェクト
 * 
 * このレポーターは以下の機能を提供します:
 * - 日本語でのE2Eテスト結果表示
 * - ブラウザ別の詳細な実行結果
 * - スクリーンショットとビデオの情報
 * - パフォーマンス分析と推奨事項
 */

const fs = require('fs');
const path = require('path');

/**
 * 日本語Playwrightレポータークラス
 */
class JapanesePlaywrightReporter {
  constructor(options = {}) {
    this.options = options;
    this.outputFile = options.outputFile || './test-results/playwright-results-ja.json';
    this.startTime = Date.now();
    this.results = {
      summary: {},
      projects: [],
      tests: [],
      errors: [],
      artifacts: [],
      performance: {},
      recommendations: []
    };
    this.currentSuite = null;
  }

  /**
   * テスト開始時
   */
  onBegin(config, suite) {
    this.startTime = Date.now();
    this.config = config;
    
    console.log('\n🎭 Playwright E2Eテストを開始します...');
    console.log(`🌐 プロジェクト数: ${config.projects.length}`);
    console.log(`🧪 総テスト数: ${suite.allTests().length}`);
    
    // プロジェクト情報の初期化
    config.projects.forEach(project => {
      this.results.projects.push({
        name: project.name,
        testDir: project.testDir,
        use: project.use,
        timeout: project.timeout,
        tests: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          flaky: 0
        }
      });
    });
  }

  /**
   * テストケース開始時
   */
  onTestBegin(test, result) {
    const projectName = test.parent.project().name;
    const testInfo = {
      title: test.title,
      file: this.getRelativePath(test.location.file),
      line: test.location.line,
      project: projectName,
      browser: this.extractBrowserName(projectName),
      startTime: Date.now(),
      status: 'running'
    };

    console.log(`🔄 [${projectName}] ${test.title} を実行中...`);
    this.currentTest = testInfo;
  }

  /**
   * テストケース完了時
   */
  onTestEnd(test, result) {
    const endTime = Date.now();
    const duration = endTime - this.currentTest.startTime;
    
    const testResult = {
      ...this.currentTest,
      endTime,
      duration,
      status: this.translateStatus(result.status),
      retry: result.retry,
      errors: result.errors.map(error => this.processError(error)),
      attachments: result.attachments.map(att => this.processAttachment(att)),
      stdout: result.stdout,
      stderr: result.stderr
    };

    // プロジェクト別の集計を更新
    const project = this.results.projects.find(p => p.name === testResult.project);
    if (project) {
      project.tests.push(testResult);
      project.summary.total++;
      project.summary[result.status === 'passed' ? 'passed' : 
                      result.status === 'failed' ? 'failed' :
                      result.status === 'skipped' ? 'skipped' : 'flaky']++;
    }

    this.results.tests.push(testResult);

    // 結果表示
    this.displayTestResult(testResult);
  }

  /**
   * テスト完了時
   */
  onEnd(result) {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    // サマリー情報の作成
    this.results.summary = {
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: totalDuration,
      status: result.status,
      totals: {
        tests: this.results.tests.length,
        passed: this.results.tests.filter(t => t.status === '成功').length,
        failed: this.results.tests.filter(t => t.status === '失敗').length,
        skipped: this.results.tests.filter(t => t.status === 'スキップ').length,
        flaky: this.results.tests.filter(t => t.status === '不安定').length
      },
      workers: this.config.workers,
      shards: result.shards
    };

    // パフォーマンス分析
    this.analyzePerformance();

    // 推奨事項の生成
    this.generateRecommendations();

    // 結果の表示と保存
    this.displayFinalResults();
    this.saveResults();
  }

  /**
   * ステータスを日本語に変換
   */
  translateStatus(status) {
    const statusMap = {
      'passed': '成功',
      'failed': '失敗',
      'timedOut': 'タイムアウト',
      'skipped': 'スキップ',
      'interrupted': '中断',
      'flaky': '不安定'
    };
    return statusMap[status] || status;
  }

  /**
   * ブラウザ名を抽出
   */
  extractBrowserName(projectName) {
    if (projectName.includes('chromium')) return 'Chromium';
    if (projectName.includes('firefox')) return 'Firefox';
    if (projectName.includes('webkit') || projectName.includes('safari')) return 'Safari';
    if (projectName.includes('edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * 相対パスを取得
   */
  getRelativePath(filePath) {
    const cwd = process.cwd();
    return path.relative(cwd, filePath);
  }

  /**
   * エラー情報を処理
   */
  processError(error) {
    return {
      message: this.translateErrorMessage(error.message),
      location: error.location,
      snippet: error.snippet,
      suggestion: this.generateErrorSuggestion(error.message)
    };
  }

  /**
   * エラーメッセージを日本語化
   */
  translateErrorMessage(message) {
    const translations = {
      'Test timeout': 'テストタイムアウト',
      'Page crashed': 'ページクラッシュ',
      'Navigation timeout': 'ナビゲーションタイムアウト',
      'Selector not found': 'セレクターが見つかりません',
      'Element not visible': '要素が表示されていません',
      'Element not enabled': '要素が有効ではありません',
      'Network error': 'ネットワークエラー',
      'Screenshot comparison failed': 'スクリーンショット比較失敗',
      'Assertion failed': 'アサーション失敗'
    };

    let translatedMessage = message;
    Object.entries(translations).forEach(([english, japanese]) => {
      const regex = new RegExp(english, 'gi');
      translatedMessage = translatedMessage.replace(regex, japanese);
    });

    return translatedMessage;
  }

  /**
   * エラーに対する修正提案を生成
   */
  generateErrorSuggestion(message) {
    const suggestions = {
      'timeout': '💡 タイムアウト時間を延長するか、要素の表示/読み込みを適切に待機してください。',
      'selector': '💡 セレクターが正しいか確認し、要素が存在することを確認してください。',
      'visible': '💡 要素が画面に表示されているか、CSSで非表示になっていないか確認してください。',
      'network': '💡 ネットワーク接続とサーバーの状態を確認してください。',
      'crashed': '💡 ページの JavaScript エラーやメモリ不足を確認してください。',
      'screenshot': '💡 スクリーンショットの閾値を調整するか、要素の状態を安定化してください。',
      'assertion': '💡 期待値と実際の値を再確認し、テストロジックを見直してください。'
    };

    for (const [keyword, suggestion] of Object.entries(suggestions)) {
      if (message.toLowerCase().includes(keyword)) {
        return suggestion;
      }
    }

    return '💡 推奨事項: エラーメッセージの詳細を確認し、テストコードを見直してください。';
  }

  /**
   * アタッチメント情報を処理
   */
  processAttachment(attachment) {
    return {
      name: attachment.name,
      contentType: attachment.contentType,
      path: attachment.path,
      size: attachment.body ? attachment.body.length : 0,
      description: this.getAttachmentDescription(attachment.name, attachment.contentType)
    };
  }

  /**
   * アタッチメントの説明を生成
   */
  getAttachmentDescription(name, contentType) {
    if (contentType === 'image/png' || contentType === 'image/jpeg') {
      return `スクリーンショット: ${name}`;
    } else if (contentType === 'video/webm') {
      return `実行ビデオ: ${name}`;
    } else if (contentType === 'application/zip') {
      return `トレースファイル: ${name}`;
    } else {
      return `添付ファイル: ${name}`;
    }
  }

  /**
   * テスト結果を表示
   */
  displayTestResult(testResult) {
    const statusIcon = this.getStatusIcon(testResult.status);
    const duration = `${testResult.duration}ms`;
    const browser = testResult.browser;

    console.log(`${statusIcon} [${browser}] ${testResult.title} (${duration})`);

    if (testResult.errors.length > 0) {
      testResult.errors.forEach(error => {
        console.log(`   ❌ ${error.message}`);
      });
    }

    if (testResult.attachments.length > 0) {
      const screenshots = testResult.attachments.filter(att => 
        att.contentType.startsWith('image/')
      ).length;
      const videos = testResult.attachments.filter(att => 
        att.contentType.startsWith('video/')
      ).length;
      
      if (screenshots > 0) console.log(`   📸 スクリーンショット: ${screenshots}枚`);
      if (videos > 0) console.log(`   🎥 ビデオ: ${videos}個`);
    }
  }

  /**
   * ステータスアイコンを取得
   */
  getStatusIcon(status) {
    const icons = {
      '成功': '✅',
      '失敗': '❌',
      'タイムアウト': '⏰',
      'スキップ': '⏭️',
      '中断': '⏹️',
      '不安定': '⚠️'
    };
    return icons[status] || '❓';
  }

  /**
   * パフォーマンス分析
   */
  analyzePerformance() {
    const testDurations = this.results.tests.map(t => t.duration);
    const totalDuration = testDurations.reduce((sum, duration) => sum + duration, 0);
    const avgDuration = totalDuration / testDurations.length;

    // ブラウザ別パフォーマンス
    const browserPerformance = {};
    this.results.projects.forEach(project => {
      const projectDurations = project.tests.map(t => t.duration);
      if (projectDurations.length > 0) {
        browserPerformance[project.name] = {
          tests: projectDurations.length,
          total: projectDurations.reduce((sum, d) => sum + d, 0),
          average: projectDurations.reduce((sum, d) => sum + d, 0) / projectDurations.length,
          max: Math.max(...projectDurations),
          min: Math.min(...projectDurations)
        };
      }
    });

    // 遅いテストの特定
    const slowTests = this.results.tests
      .filter(test => test.duration > avgDuration * 2)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    this.results.performance = {
      total: {
        duration: this.results.summary.duration,
        tests: testDurations.length,
        average: avgDuration,
        max: Math.max(...testDurations),
        min: Math.min(...testDurations)
      },
      browsers: browserPerformance,
      slowTests,
      parallelization: {
        workers: this.config.workers,
        efficiency: this.calculateParallelizationEfficiency()
      }
    };
  }

  /**
   * 並列化効率を計算
   */
  calculateParallelizationEfficiency() {
    const totalTestTime = this.results.tests.reduce((sum, test) => sum + test.duration, 0);
    const actualWallTime = this.results.summary.duration;
    const theoreticalOptimalTime = totalTestTime / this.config.workers;
    
    return {
      theoretical: theoreticalOptimalTime,
      actual: actualWallTime,
      efficiency: (theoreticalOptimalTime / actualWallTime) * 100
    };
  }

  /**
   * 推奨事項を生成
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.results.summary;
    const performance = this.results.performance;

    // 失敗率に基づく推奨事項
    const failureRate = (summary.totals.failed / summary.totals.tests) * 100;
    if (failureRate > 10) {
      recommendations.push({
        type: 'テスト品質',
        priority: 'high',
        message: `失敗率が${failureRate.toFixed(1)}%と高いです。テストの安定性向上を検討してください。`
      });
    }

    // パフォーマンスに基づく推奨事項
    if (performance.slowTests.length > 0) {
      recommendations.push({
        type: 'パフォーマンス',
        priority: 'medium',
        message: `実行時間の長いテストが${performance.slowTests.length}個あります。最適化を検討してください。`
      });
    }

    // 並列化効率に基づく推奨事項
    if (performance.parallelization.efficiency < 70) {
      recommendations.push({
        type: '並列化',
        priority: 'medium',
        message: `並列化効率が${performance.parallelization.efficiency.toFixed(1)}%です。ワーカー数やテスト分散を調整してください。`
      });
    }

    // ブラウザ別の問題
    Object.entries(performance.browsers).forEach(([browserName, browserData]) => {
      const browserTests = this.results.tests.filter(t => t.project === browserName);
      const browserFailureRate = (browserTests.filter(t => t.status === '失敗').length / browserTests.length) * 100;
      
      if (browserFailureRate > 20) {
        recommendations.push({
          type: 'ブラウザ互換性',
          priority: 'medium',
          message: `${browserName}での失敗率が${browserFailureRate.toFixed(1)}%と高いです。ブラウザ固有の問題を確認してください。`
        });
      }
    });

    // 不安定なテスト（Flaky）
    const flakyTests = this.results.tests.filter(t => t.status === '不安定');
    if (flakyTests.length > 0) {
      recommendations.push({
        type: 'テスト安定性',
        priority: 'high',
        message: `${flakyTests.length}個の不安定なテストがあります。待機条件やセレクターを見直してください。`
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

    console.log('\n🎭 Playwright E2Eテスト結果サマリー');
    console.log('=====================================');
    console.log(`⏱️  実行時間: ${duration}秒`);
    console.log(`🧪 総テスト数: ${summary.totals.tests}個`);
    console.log(`✅ 成功: ${summary.totals.passed}個`);
    console.log(`❌ 失敗: ${summary.totals.failed}個`);
    console.log(`⏭️ スキップ: ${summary.totals.skipped}個`);
    
    if (summary.totals.flaky > 0) {
      console.log(`⚠️ 不安定: ${summary.totals.flaky}個`);
    }

    // ブラウザ別結果
    console.log('\n🌐 ブラウザ別結果');
    console.log('------------------');
    this.results.projects.forEach(project => {
      if (project.tests.length > 0) {
        const browser = this.extractBrowserName(project.name);
        const successRate = ((project.summary.passed / project.summary.total) * 100).toFixed(1);
        console.log(`${browser}: ${project.summary.passed}/${project.summary.total} (${successRate}%)`);
      }
    });

    // パフォーマンス情報
    if (this.results.performance.slowTests.length > 0) {
      console.log('\n⚡ 実行時間の長いテスト（上位5位）');
      console.log('--------------------------------');
      this.results.performance.slowTests.slice(0, 5).forEach((test, index) => {
        console.log(`${index + 1}. ${test.title} (${test.duration}ms) - ${test.browser}`);
      });
    }

    // 推奨事項
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 推奨事項');
      console.log('----------');
      this.results.recommendations.forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${icon} [${rec.type}] ${rec.message}`);
      });
    }

    // 最終判定
    const successIcon = summary.status === 'passed' ? '🎉' : '💥';
    const successMessage = summary.status === 'passed' ? 
      'すべてのE2Eテストが正常に完了しました！' : 
      'E2Eテストに失敗があります。上記の詳細を確認してください。';
    console.log(`\n${successIcon} ${successMessage}`);
  }

  /**
   * 結果をファイルに保存
   */
  saveResults() {
    try {
      // 出力ディレクトリを作成
      const outputDir = path.dirname(this.outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // JSON結果を保存
      fs.writeFileSync(this.outputFile, JSON.stringify(this.results, null, 2), 'utf8');
      console.log(`\n📄 詳細結果を保存しました: ${this.outputFile}`);

      // マークダウンレポートを生成
      this.generateMarkdownReport();

    } catch (error) {
      console.warn(`⚠️ 結果ファイルの保存に失敗しました: ${error.message}`);
    }
  }

  /**
   * マークダウンレポートを生成
   */
  generateMarkdownReport() {
    const summary = this.results.summary;
    const reportPath = this.outputFile.replace('.json', '.md');

    const markdown = `# Playwright E2Eテスト実行レポート

## 実行概要

- **実行日時**: ${summary.endTime}
- **実行時間**: ${(summary.duration / 1000).toFixed(2)}秒
- **並列ワーカー数**: ${summary.workers}
- **総テスト数**: ${summary.totals.tests}個

## 結果サマリー

| 項目 | 件数 | 割合 |
|------|------|------|
| ✅ 成功 | ${summary.totals.passed} | ${((summary.totals.passed / summary.totals.tests) * 100).toFixed(1)}% |
| ❌ 失敗 | ${summary.totals.failed} | ${((summary.totals.failed / summary.totals.tests) * 100).toFixed(1)}% |
| ⏭️ スキップ | ${summary.totals.skipped} | ${((summary.totals.skipped / summary.totals.tests) * 100).toFixed(1)}% |
${summary.totals.flaky > 0 ? `| ⚠️ 不安定 | ${summary.totals.flaky} | ${((summary.totals.flaky / summary.totals.tests) * 100).toFixed(1)}% |` : ''}

## ブラウザ別結果

${this.results.projects.map(project => {
  if (project.tests.length === 0) return '';
  const browser = this.extractBrowserName(project.name);
  const successRate = ((project.summary.passed / project.summary.total) * 100).toFixed(1);
  return `### ${browser}

- **総テスト数**: ${project.summary.total}個
- **成功率**: ${successRate}%
- **平均実行時間**: ${this.results.performance.browsers[project.name] ? 
    `${this.results.performance.browsers[project.name].average.toFixed(0)}ms` : 'N/A'}

| 結果 | 件数 |
|------|------|
| 成功 | ${project.summary.passed} |
| 失敗 | ${project.summary.failed} |
| スキップ | ${project.summary.skipped} |
${project.summary.flaky > 0 ? `| 不安定 | ${project.summary.flaky} |` : ''}`;
}).filter(Boolean).join('\n\n')}

## パフォーマンス分析

### 実行時間統計

- **総実行時間**: ${(this.results.performance.total.duration / 1000).toFixed(2)}秒
- **平均テスト時間**: ${this.results.performance.total.average.toFixed(0)}ms
- **最長テスト時間**: ${this.results.performance.total.max.toFixed(0)}ms
- **最短テスト時間**: ${this.results.performance.total.min.toFixed(0)}ms

### 並列化効率

- **理論最適時間**: ${(this.results.performance.parallelization.theoretical / 1000).toFixed(2)}秒
- **実際の実行時間**: ${(this.results.performance.parallelization.actual / 1000).toFixed(2)}秒
- **並列化効率**: ${this.results.performance.parallelization.efficiency.toFixed(1)}%

${this.results.performance.slowTests.length > 0 ? `### 実行時間の長いテスト

| テスト名 | ブラウザ | 実行時間 |
|----------|----------|----------|
${this.results.performance.slowTests.slice(0, 10).map(test => 
  `| ${test.title} | ${test.browser} | ${test.duration}ms |`
).join('\n')}` : ''}

${this.results.tests.filter(t => t.status === '失敗').length > 0 ? `## 失敗したテスト

${this.results.tests.filter(t => t.status === '失敗').map(test => `
### ${test.title}

- **ファイル**: ${test.file}:${test.line}
- **ブラウザ**: ${test.browser}
- **実行時間**: ${test.duration}ms
- **リトライ回数**: ${test.retry}

${test.errors.length > 0 ? `#### エラー詳細

${test.errors.map(error => `
**エラーメッセージ**:
\`\`\`
${error.message}
\`\`\`

${error.suggestion}
`).join('\n')}` : ''}

${test.attachments.length > 0 ? `#### 添付ファイル

${test.attachments.map(att => `- ${att.description}`).join('\n')}` : ''}
`).join('\n')} ` : ''}

${this.results.recommendations.length > 0 ? `## 推奨事項

${this.results.recommendations.map(rec => 
  `### ${rec.priority === 'high' ? '🔴 高' : rec.priority === 'medium' ? '🟡 中' : '🟢 低'} - ${rec.type}

${rec.message}`
).join('\n\n')}` : ''}

## 結論

${summary.status === 'passed' ? 
  '✅ すべてのE2Eテストが正常に完了しました。アプリケーションは期待通りに動作しています。' : 
  '❌ 一部のE2Eテストで問題が発生しています。上記の失敗詳細とエラー情報を確認して対応してください。'}

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

module.exports = JapanesePlaywrightReporter;