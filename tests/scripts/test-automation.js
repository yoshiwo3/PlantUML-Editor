#!/usr/bin/env node

/**
 * 統合テスト自動化スクリプト
 * Jest + Playwright + MCP統合の自動実行・レポート生成
 * PlantUMLプロジェクト全体のテスト戦略を統合管理
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 設定定数
const CONFIG = {
  // テスト種別
  TEST_TYPES: {
    UNIT: 'unit',
    INTEGRATION: 'integration',
    E2E: 'e2e',
    PERFORMANCE: 'performance',
    ALL: 'all'
  },
  
  // 環境設定
  ENVIRONMENTS: {
    DEVELOPMENT: 'development',
    CI: 'ci',
    PRODUCTION: 'production'
  },
  
  // ディレクトリ構造
  DIRS: {
    ROOT: process.cwd(),
    COVERAGE: './coverage',
    REPORTS: './coverage/reports',
    LOGS: './coverage/logs',
    TEMP: './temp'
  },
  
  // タイムアウト設定（秒）
  TIMEOUTS: {
    UNIT: 120,
    INTEGRATION: 300,
    E2E: 600,
    PERFORMANCE: 900
  },
  
  // 並列実行設定
  PARALLEL: {
    DEFAULT: Math.max(1, os.cpus().length / 2),
    CI: 1,
    MAX: os.cpus().length
  }
};

/**
 * メインクラス - テスト自動化オーケストレーター
 */
class TestAutomation {
  constructor(options = {}) {
    this.options = {
      type: options.type || CONFIG.TEST_TYPES.ALL,
      environment: options.environment || this.detectEnvironment(),
      parallel: options.parallel || this.calculateParallelWorkers(),
      coverage: options.coverage !== false,
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      mcpIntegration: options.mcpIntegration !== false,
      reportFormat: options.reportFormat || ['html', 'json', 'lcov'],
      retries: options.retries || (this.isCI() ? 3 : 1),
      timeout: options.timeout || CONFIG.TIMEOUTS[options.type?.toUpperCase()] || 300
    };
    
    this.startTime = Date.now();
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null
    };
    
    this.setupDirectories();
    this.logInfo('統合テスト自動化システムを初期化しました', this.options);
  }

  /**
   * 環境検出
   */
  detectEnvironment() {
    if (process.env.CI === 'true') return CONFIG.ENVIRONMENTS.CI;
    if (process.env.NODE_ENV === 'production') return CONFIG.ENVIRONMENTS.PRODUCTION;
    return CONFIG.ENVIRONMENTS.DEVELOPMENT;
  }

  /**
   * CI環境判定
   */
  isCI() {
    return this.options.environment === CONFIG.ENVIRONMENTS.CI;
  }

  /**
   * 並列ワーカー数計算
   */
  calculateParallelWorkers() {
    if (this.isCI()) return CONFIG.PARALLEL.CI;
    return Math.min(CONFIG.PARALLEL.DEFAULT, CONFIG.PARALLEL.MAX);
  }

  /**
   * 必要なディレクトリを作成
   */
  setupDirectories() {
    Object.values(CONFIG.DIRS).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * ログ出力
   */
  logInfo(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ℹ️  ${message}`;
    console.log(logMessage);
    if (data && this.options.verbose) {
      console.log(JSON.stringify(data, null, 2));
    }
    
    // ログファイルに記録
    const logFile = path.join(CONFIG.DIRS.LOGS, 'test-automation.log');
    fs.appendFileSync(logFile, `${logMessage}${data ? '\\n' + JSON.stringify(data, null, 2) : ''}\\n`);
  }

  /**
   * エラーログ
   */
  logError(message, error = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ❌ ${message}`;
    console.error(logMessage);
    if (error) {
      console.error(error);
    }
    
    // エラーログファイルに記録
    const errorFile = path.join(CONFIG.DIRS.LOGS, 'test-errors.log');
    fs.appendFileSync(errorFile, `${logMessage}${error ? '\\n' + error.toString() : ''}\\n`);
  }

  /**
   * 成功ログ
   */
  logSuccess(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ✅ ${message}`;
    console.log(logMessage);
    if (data && this.options.verbose) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * コマンド実行（同期）
   */
  executeCommand(command, options = {}) {
    this.logInfo(`コマンド実行: ${command}`);
    
    if (this.options.dryRun) {
      this.logInfo('ドライランモード: コマンドをスキップしました');
      return { stdout: '', stderr: '', status: 0 };
    }

    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: (options.timeout || this.options.timeout) * 1000,
        ...options
      });
      
      return { stdout: result, stderr: '', status: 0 };
    } catch (error) {
      this.logError(`コマンド実行エラー: ${command}`, error);
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || '', 
        status: error.status || 1 
      };
    }
  }

  /**
   * 非同期コマンド実行
   */
  async executeCommandAsync(command, options = {}) {
    return new Promise((resolve, reject) => {
      this.logInfo(`非同期コマンド実行: ${command}`);
      
      if (this.options.dryRun) {
        this.logInfo('ドライランモード: コマンドをスキップしました');
        resolve({ stdout: '', stderr: '', code: 0 });
        return;
      }

      const child = spawn(command, [], {
        shell: true,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`コマンドタイムアウト: ${command}`));
      }, (options.timeout || this.options.timeout) * 1000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`コマンドエラー (code: ${code}): ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * 単体テスト実行
   */
  async runUnitTests() {
    this.logInfo('📦 単体テストを開始します');
    
    const command = [
      'npx jest',
      '--config=jest.config.integration.js',
      '--selectProjects=backend-unit,frontend-integration',
      this.options.coverage ? '--coverage' : '',
      `--maxWorkers=${this.options.parallel}`,
      this.options.verbose ? '--verbose' : '',
      '--passWithNoTests'
    ].filter(Boolean).join(' ');

    try {
      const result = await this.executeCommandAsync(command, {
        timeout: CONFIG.TIMEOUTS.UNIT
      });
      
      this.results.unit = {
        success: result.code === 0,
        duration: Date.now() - this.startTime,
        coverage: this.extractCoverageData('backend-unit')
      };
      
      this.logSuccess('✅ 単体テストが完了しました', this.results.unit);
      return this.results.unit;
    } catch (error) {
      this.logError('❌ 単体テストが失敗しました', error);
      this.results.unit = { success: false, error: error.message };
      throw error;
    }
  }

  /**
   * 統合テスト実行
   */
  async runIntegrationTests() {
    this.logInfo('🔗 統合テストを開始します');
    
    const command = [
      'npx jest',
      '--config=jest.config.integration.js',
      '--selectProjects=backend-integration',
      this.options.coverage ? '--coverage' : '',
      `--maxWorkers=${Math.min(this.options.parallel, 2)}`,  // 統合テストは制限
      this.options.verbose ? '--verbose' : '',
      '--runInBand',  // 統合テストは順次実行
      '--passWithNoTests'
    ].filter(Boolean).join(' ');

    try {
      const result = await this.executeCommandAsync(command, {
        timeout: CONFIG.TIMEOUTS.INTEGRATION
      });
      
      this.results.integration = {
        success: result.code === 0,
        duration: Date.now() - this.startTime,
        coverage: this.extractCoverageData('backend-integration')
      };
      
      this.logSuccess('✅ 統合テストが完了しました', this.results.integration);
      return this.results.integration;
    } catch (error) {
      this.logError('❌ 統合テストが失敗しました', error);
      this.results.integration = { success: false, error: error.message };
      throw error;
    }
  }

  /**
   * E2Eテスト実行（Playwright MCP統合）
   */
  async runE2ETests() {
    this.logInfo('🎭 E2Eテストを開始します（Playwright MCP統合）');
    
    // サーバー起動確認
    await this.ensureServerRunning();
    
    const command = [
      'npx playwright test',
      '--config=playwright.config.integration.js',
      `--workers=${this.options.parallel}`,
      this.options.verbose ? '--reporter=list' : '--reporter=html',
      this.isCI() ? '--reporter=github' : '',
      `--retries=${this.options.retries}`,
      '--pass-with-no-tests'
    ].filter(Boolean).join(' ');

    // MCP統合環境変数設定
    const env = {
      ...process.env,
      MCP_INTEGRATION: this.options.mcpIntegration ? 'true' : 'false',
      PERFORMANCE_TEST: this.options.type === CONFIG.TEST_TYPES.PERFORMANCE ? 'true' : 'false',
      BASE_URL: 'http://localhost:8086',
      CI: this.isCI() ? 'true' : 'false'
    };

    try {
      const result = await this.executeCommandAsync(command, {
        timeout: CONFIG.TIMEOUTS.E2E,
        env
      });
      
      this.results.e2e = {
        success: result.code === 0,
        duration: Date.now() - this.startTime,
        screenshots: this.countScreenshots(),
        videos: this.countVideos(),
        traces: this.countTraces()
      };
      
      this.logSuccess('✅ E2Eテストが完了しました', this.results.e2e);
      return this.results.e2e;
    } catch (error) {
      this.logError('❌ E2Eテストが失敗しました', error);
      this.results.e2e = { success: false, error: error.message };
      throw error;
    }
  }

  /**
   * パフォーマンステスト実行
   */
  async runPerformanceTests() {
    this.logInfo('🚀 パフォーマンステストを開始します');
    
    const command = [
      'npx jest',
      '--config=jest.config.integration.js',
      '--selectProjects=performance',
      '--runInBand',  // パフォーマンステストは単一実行
      this.options.verbose ? '--verbose' : '',
      '--passWithNoTests'
    ].filter(Boolean).join(' ');

    const env = {
      ...process.env,
      PERFORMANCE_TEST: 'true',
      NODE_ENV: 'test'
    };

    try {
      const result = await this.executeCommandAsync(command, {
        timeout: CONFIG.TIMEOUTS.PERFORMANCE,
        env
      });
      
      this.results.performance = {
        success: result.code === 0,
        duration: Date.now() - this.startTime,
        metrics: this.extractPerformanceMetrics()
      };
      
      this.logSuccess('✅ パフォーマンステストが完了しました', this.results.performance);
      return this.results.performance;
    } catch (error) {
      this.logError('❌ パフォーマンステストが失敗しました', error);
      this.results.performance = { success: false, error: error.message };
      throw error;
    }
  }

  /**
   * サーバー起動確認
   */
  async ensureServerRunning() {
    this.logInfo('🌐 アプリケーションサーバーの起動を確認します');
    
    try {
      const { execSync } = require('child_process');
      execSync('curl -f http://localhost:8086 > /dev/null 2>&1', { timeout: 5000 });
      this.logSuccess('✅ サーバーが既に起動しています');
    } catch (error) {
      this.logInfo('⏳ サーバーを起動します...');
      
      // バックグラウンドでサーバー起動
      const serverCommand = 'cd jp2plantuml && npm start';
      spawn(serverCommand, [], {
        shell: true,
        detached: true,
        stdio: 'ignore'
      });
      
      // 起動待機
      await this.waitForServer('http://localhost:8086', 60000);
      this.logSuccess('✅ サーバーの起動が完了しました');
    }
  }

  /**
   * サーバー起動待機
   */
  async waitForServer(url, timeout = 30000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const { execSync } = require('child_process');
        execSync(`curl -f ${url} > /dev/null 2>&1`, { timeout: 2000 });
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error(`サーバー起動タイムアウト: ${url}`);
  }

  /**
   * カバレッジデータ抽出
   */
  extractCoverageData(project) {
    try {
      const coverageFile = path.join(CONFIG.DIRS.COVERAGE, project, 'coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        return {
          lines: data.total?.lines?.pct || 0,
          functions: data.total?.functions?.pct || 0,
          branches: data.total?.branches?.pct || 0,
          statements: data.total?.statements?.pct || 0
        };
      }
    } catch (error) {
      this.logError('カバレッジデータの抽出に失敗しました', error);
    }
    
    return null;
  }

  /**
   * パフォーマンスメトリクス抽出
   */
  extractPerformanceMetrics() {
    // パフォーマンステスト結果の解析実装
    return {
      loadTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkRequests: 0
    };
  }

  /**
   * スクリーンショット数カウント
   */
  countScreenshots() {
    try {
      const screenshotDir = path.join(CONFIG.DIRS.COVERAGE, 'playwright-results');
      if (fs.existsSync(screenshotDir)) {
        const files = fs.readdirSync(screenshotDir, { recursive: true });
        return files.filter(file => file.endsWith('.png')).length;
      }
    } catch (error) {
      this.logError('スクリーンショット数の取得に失敗しました', error);
    }
    return 0;
  }

  /**
   * ビデオ数カウント
   */
  countVideos() {
    try {
      const videoDir = path.join(CONFIG.DIRS.COVERAGE, 'playwright-results');
      if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir, { recursive: true });
        return files.filter(file => file.endsWith('.webm')).length;
      }
    } catch (error) {
      this.logError('ビデオ数の取得に失敗しました', error);
    }
    return 0;
  }

  /**
   * トレース数カウント
   */
  countTraces() {
    try {
      const traceDir = path.join(CONFIG.DIRS.COVERAGE, 'playwright-results');
      if (fs.existsSync(traceDir)) {
        const files = fs.readdirSync(traceDir, { recursive: true });
        return files.filter(file => file.endsWith('.zip')).length;
      }
    } catch (error) {
      this.logError('トレース数の取得に失敗しました', error);
    }
    return 0;
  }

  /**
   * 統合レポート生成
   */
  generateIntegratedReport() {
    this.logInfo('📊 統合レポートを生成します');
    
    const totalDuration = Date.now() - this.startTime;
    const report = {
      meta: {
        project: 'PlantUML Converter',
        version: require('../package.json').version || '1.0.0',
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        environment: this.options.environment,
        parallel: this.options.parallel,
        mcpIntegration: this.options.mcpIntegration
      },
      summary: {
        totalTests: this.calculateTotalTests(),
        passed: this.calculatePassedTests(),
        failed: this.calculateFailedTests(),
        skipped: this.calculateSkippedTests(),
        coverage: this.calculateOverallCoverage(),
        success: this.isOverallSuccess()
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // JSON形式で保存
    const reportFile = path.join(CONFIG.DIRS.REPORTS, 'integration-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // HTML形式で保存
    this.generateHTMLReport(report);

    // Markdown形式で保存  
    this.generateMarkdownReport(report);

    this.logSuccess('✅ 統合レポートを生成しました', { file: reportFile });
    return report;
  }

  /**
   * HTML形式レポート生成
   */
  generateHTMLReport(report) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML 統合テストレポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; border-left: 4px solid #4CAF50; }
        .metric.failed { border-left-color: #f44336; }
        .metric.warning { border-left-color: #ff9800; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .test-result { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .test-result.success { border-left: 4px solid #4CAF50; }
        .test-result.error { border-left: 4px solid #f44336; }
        .coverage-bar { width: 100%; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #f44336 0%, #ff9800 50%, #4CAF50 80%); }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 PlantUML 統合テストレポート</h1>
            <p class="timestamp">生成日時: ${report.meta.timestamp}</p>
            <p>実行環境: ${report.meta.environment} | 並列数: ${report.meta.parallel} | 実行時間: ${Math.round(report.meta.duration / 1000)}秒</p>
        </div>
        
        <div class="summary">
            <div class="metric ${report.summary.success ? '' : 'failed'}">
                <h3>総合結果</h3>
                <div style="font-size: 2em;">${report.summary.success ? '✅' : '❌'}</div>
                <p>${report.summary.success ? '成功' : '失敗'}</p>
            </div>
            <div class="metric">
                <h3>総テスト数</h3>
                <div style="font-size: 2em;">${report.summary.totalTests}</div>
                <p>実行されたテスト</p>
            </div>
            <div class="metric">
                <h3>成功数</h3>
                <div style="font-size: 2em; color: #4CAF50;">${report.summary.passed}</div>
                <p>成功したテスト</p>
            </div>
            <div class="metric ${report.summary.failed > 0 ? 'failed' : ''}">
                <h3>失敗数</h3>
                <div style="font-size: 2em; color: #f44336;">${report.summary.failed}</div>
                <p>失敗したテスト</p>
            </div>
            <div class="metric">
                <h3>カバレッジ</h3>
                <div style="font-size: 2em;">${report.summary.coverage}%</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${report.summary.coverage}%;"></div>
                </div>
            </div>
        </div>

        ${Object.entries(report.results).map(([type, result]) => 
          result ? `
          <div class="section">
              <h2>${this.getTestTypeDisplayName(type)}</h2>
              <div class="test-result ${result.success ? 'success' : 'error'}">
                  <strong>結果:</strong> ${result.success ? '✅ 成功' : '❌ 失敗'}<br>
                  <strong>実行時間:</strong> ${Math.round(result.duration / 1000)}秒<br>
                  ${result.coverage ? `<strong>カバレッジ:</strong> ${JSON.stringify(result.coverage)}<br>` : ''}
                  ${result.error ? `<strong>エラー:</strong> ${result.error}<br>` : ''}
              </div>
          </div>
          ` : ''
        ).join('')}

        <div class="section">
            <h2>📋 推奨事項</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;

    const htmlFile = path.join(CONFIG.DIRS.REPORTS, 'integration-report.html');
    fs.writeFileSync(htmlFile, htmlTemplate);
  }

  /**
   * Markdown形式レポート生成
   */
  generateMarkdownReport(report) {
    const markdown = `# 🧪 PlantUML 統合テストレポート

## 📊 実行サマリー

- **生成日時**: ${report.meta.timestamp}
- **実行環境**: ${report.meta.environment}
- **並列実行数**: ${report.meta.parallel}
- **実行時間**: ${Math.round(report.meta.duration / 1000)}秒
- **MCP統合**: ${report.meta.mcpIntegration ? '有効' : '無効'}

## 🎯 総合結果

| 項目 | 結果 |
|------|------|
| 総合判定 | ${report.summary.success ? '✅ 成功' : '❌ 失敗'} |
| 総テスト数 | ${report.summary.totalTests} |
| 成功数 | ${report.summary.passed} |
| 失敗数 | ${report.summary.failed} |
| 全体カバレッジ | ${report.summary.coverage}% |

## 📋 詳細結果

${Object.entries(report.results).map(([type, result]) => 
  result ? `
### ${this.getTestTypeDisplayName(type)}

- **結果**: ${result.success ? '✅ 成功' : '❌ 失敗'}
- **実行時間**: ${Math.round(result.duration / 1000)}秒
${result.coverage ? `- **カバレッジ**: ${JSON.stringify(result.coverage, null, 2)}` : ''}
${result.error ? `- **エラー**: ${result.error}` : ''}
` : ''
).join('')}

## 💡 推奨事項

${report.recommendations.map(rec => `- ${rec}`).join('\\n')}

---
*このレポートは自動生成されました - PlantUML Test Automation System*`;

    const markdownFile = path.join(CONFIG.DIRS.REPORTS, 'integration-report.md');
    fs.writeFileSync(markdownFile, markdown);
  }

  /**
   * テスト種別の表示名取得
   */
  getTestTypeDisplayName(type) {
    const names = {
      unit: '📦 単体テスト',
      integration: '🔗 統合テスト',
      e2e: '🎭 E2Eテスト',
      performance: '🚀 パフォーマンステスト'
    };
    return names[type] || type;
  }

  /**
   * 総テスト数計算
   */
  calculateTotalTests() {
    // 実装: 各テスト結果から総数を計算
    return Object.values(this.results).reduce((total, result) => {
      return total + (result?.tests || 0);
    }, 0);
  }

  /**
   * 成功テスト数計算
   */
  calculatePassedTests() {
    return Object.values(this.results).reduce((total, result) => {
      return total + (result?.success ? 1 : 0);
    }, 0);
  }

  /**
   * 失敗テスト数計算
   */
  calculateFailedTests() {
    return Object.values(this.results).reduce((total, result) => {
      return total + (!result?.success ? 1 : 0);
    }, 0);
  }

  /**
   * スキップテスト数計算
   */
  calculateSkippedTests() {
    return 0; // 実装が必要
  }

  /**
   * 全体カバレッジ計算
   */
  calculateOverallCoverage() {
    const coverages = Object.values(this.results)
      .filter(result => result?.coverage?.lines)
      .map(result => result.coverage.lines);
    
    if (coverages.length === 0) return 0;
    
    return Math.round(coverages.reduce((sum, cov) => sum + cov, 0) / coverages.length);
  }

  /**
   * 全体成功判定
   */
  isOverallSuccess() {
    return Object.values(this.results).every(result => result?.success !== false);
  }

  /**
   * 推奨事項生成
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.calculateOverallCoverage() < 80) {
      recommendations.push('カバレッジが80%を下回っています。追加のテストケースを作成してください。');
    }
    
    if (this.calculateFailedTests() > 0) {
      recommendations.push('失敗したテストがあります。エラー内容を確認して修正してください。');
    }
    
    if (this.results.performance && !this.results.performance.success) {
      recommendations.push('パフォーマンステストが失敗しています。アプリケーションの最適化を検討してください。');
    }
    
    if (!this.options.mcpIntegration) {
      recommendations.push('MCP統合を有効化することで、より高度な自動テストが実行できます。');
    }
    
    return recommendations;
  }

  /**
   * メイン実行メソッド
   */
  async run() {
    try {
      this.logInfo('🚀 統合テスト自動化を開始します', this.options);
      
      // テスト種別に応じた実行
      switch (this.options.type) {
        case CONFIG.TEST_TYPES.UNIT:
          await this.runUnitTests();
          break;
          
        case CONFIG.TEST_TYPES.INTEGRATION:
          await this.runIntegrationTests();
          break;
          
        case CONFIG.TEST_TYPES.E2E:
          await this.runE2ETests();
          break;
          
        case CONFIG.TEST_TYPES.PERFORMANCE:
          await this.runPerformanceTests();
          break;
          
        case CONFIG.TEST_TYPES.ALL:
        default:
          // 全テストを順次実行
          await this.runUnitTests();
          await this.runIntegrationTests();
          await this.runE2ETests();
          
          if (this.options.performance !== false) {
            await this.runPerformanceTests();
          }
          break;
      }
      
      // 統合レポート生成
      const report = this.generateIntegratedReport();
      
      this.logSuccess('🎉 統合テスト自動化が完了しました', {
        duration: Date.now() - this.startTime,
        success: report.summary.success
      });
      
      return report;
      
    } catch (error) {
      this.logError('💥 統合テスト自動化でエラーが発生しました', error);
      throw error;
    }
  }
}

// CLI実行サポート
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // コマンドライン引数パース
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--type':
        options.type = args[++i];
        break;
      case '--environment':
        options.environment = args[++i];
        break;
      case '--parallel':
        options.parallel = parseInt(args[++i], 10);
        break;
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-mcp':
        options.mcpIntegration = false;
        break;
      case '--help':
        console.log(`
PlantUML 統合テスト自動化システム

使用法:
  node test-automation.js [オプション]

オプション:
  --type <type>         テスト種別 (unit|integration|e2e|performance|all)
  --environment <env>   実行環境 (development|ci|production)
  --parallel <num>      並列実行数
  --no-coverage         カバレッジ収集を無効化
  --verbose             詳細出力を有効化
  --dry-run             ドライランモード
  --no-mcp              MCP統合を無効化
  --help                このヘルプを表示

例:
  node test-automation.js --type=all --verbose
  node test-automation.js --type=e2e --parallel=2
  node test-automation.js --type=unit --no-coverage
        `);
        process.exit(0);
        break;
    }
  }
  
  // 実行
  const automation = new TestAutomation(options);
  automation.run()
    .then(report => {
      console.log('\\n✅ 統合テスト自動化が正常に完了しました');
      process.exit(report.summary.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\\n❌ 統合テスト自動化でエラーが発生しました:', error.message);
      process.exit(1);
    });
}

module.exports = TestAutomation;