#!/usr/bin/env node
/**
 * 統合テストランナー - PlantUMLプロジェクト
 * 
 * このスクリプトは以下の機能を提供します:
 * - 統合テストの自動実行
 * - 並行テスト実行（2ワーカー）
 * - テスト結果の集約
 * - 日本語対応のレポート生成
 * - CI/CD環境対応
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const util = require('util');

const execAsync = util.promisify(exec);

/**
 * テストランナークラス
 */
class TestRunner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.results = {
      unit: { passed: 0, failed: 0, skipped: 0, coverage: 0 },
      integration: { passed: 0, failed: 0, skipped: 0, coverage: 0 },
      e2e: { passed: 0, failed: 0, skipped: 0 },
      performance: { passed: 0, failed: 0, metrics: {} }
    };
    this.startTime = new Date();
    this.config = this.loadConfig();
  }

  /**
   * 設定を読み込み
   */
  loadConfig() {
    return {
      parallel: process.env.PARALLEL_WORKERS || '2',
      coverage: process.env.COVERAGE_THRESHOLD || '80',
      baseUrl: process.env.BASE_URL || 'http://localhost:8086',
      mcpEnabled: process.env.MCP_INTEGRATION === 'true',
      ci: process.env.CI === 'true',
      debug: process.env.DEBUG === 'true',
      testTypes: process.env.TEST_TYPES?.split(',') || ['unit', 'integration', 'e2e']
    };
  }

  /**
   * メインの実行関数
   */
  async run(options = {}) {
    try {
      console.log('🚀 PlantUML統合テストランナーを開始します...');
      console.log(`📋 設定: ${JSON.stringify(this.config, null, 2)}`);
      
      // 1. 環境準備
      await this.prepareEnvironment();
      
      // 2. テスト実行
      const testResults = await this.executeTests(options);
      
      // 3. 結果の集約
      await this.aggregateResults(testResults);
      
      // 4. レポート生成
      await this.generateReports();
      
      // 5. 結果表示
      this.displayResults();
      
      // 6. 終了処理
      const success = this.checkOverallSuccess();
      
      console.log(`\n${success ? '✅' : '❌'} テスト実行が${success ? '成功' : '失敗'}しました`);
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('🚨 テスト実行中にエラーが発生しました:', error);
      process.exit(1);
    }
  }

  /**
   * 環境準備
   */
  async prepareEnvironment() {
    console.log('🔧 テスト環境を準備中...');
    
    // 必要なディレクトリを作成
    const directories = [
      'test-results',
      'coverage/combined',
      'coverage/integration',
      'playwright-report'
    ];
    
    for (const dir of directories) {
      await fs.mkdir(path.join(this.projectRoot, dir), { recursive: true });
    }
    
    // 既存の結果をクリアアップ
    if (!this.config.ci) {
      await this.cleanupPreviousResults();
    }
    
    console.log('✅ 環境準備完了');
  }

  /**
   * 以前のテスト結果をクリーンアップ
   */
  async cleanupPreviousResults() {
    const cleanupPaths = [
      'coverage',
      'test-results',
      'playwright-report'
    ];
    
    for (const cleanupPath of cleanupPaths) {
      try {
        const fullPath = path.join(this.projectRoot, cleanupPath);
        await fs.rm(fullPath, { recursive: true, force: true });
        await fs.mkdir(fullPath, { recursive: true });
      } catch (error) {
        console.warn(`⚠️ クリーンアップ警告 (${cleanupPath}):`, error.message);
      }
    }
  }

  /**
   * テストを実行
   */
  async executeTests(options) {
    const results = {};
    const testTypes = options.types || this.config.testTypes;
    
    console.log(`📝 実行するテストタイプ: ${testTypes.join(', ')}`);
    
    // 並行実行可能なテストと順次実行が必要なテストを分ける
    const parallelTests = ['unit'];
    const sequentialTests = ['integration', 'e2e', 'performance'];
    
    // 並行実行
    if (parallelTests.some(type => testTypes.includes(type))) {
      console.log('🔄 並行テストを実行中...');
      const parallelPromises = parallelTests
        .filter(type => testTypes.includes(type))
        .map(type => this.runTestType(type));
      
      const parallelResults = await Promise.allSettled(parallelPromises);
      parallelResults.forEach((result, index) => {
        const testType = parallelTests[index];
        results[testType] = result.status === 'fulfilled' ? result.value : { error: result.reason };
      });
    }
    
    // 順次実行
    for (const testType of sequentialTests) {
      if (testTypes.includes(testType)) {
        console.log(`🔄 ${testType}テストを実行中...`);
        try {
          results[testType] = await this.runTestType(testType);
        } catch (error) {
          results[testType] = { error };
        }
      }
    }
    
    return results;
  }

  /**
   * 特定のテストタイプを実行
   */
  async runTestType(type) {
    const startTime = Date.now();
    
    try {
      let command, args, options;
      
      switch (type) {
        case 'unit':
          command = 'npm';
          args = ['run', 'test:unit:coverage'];
          options = { cwd: this.projectRoot };
          break;
          
        case 'integration':
          command = 'npm';
          args = ['run', 'test:integration'];
          options = { cwd: this.projectRoot };
          break;
          
        case 'e2e':
          // サーバーを起動してからE2Eテストを実行
          await this.startTestServer();
          command = 'npm';
          args = ['run', 'test:e2e'];
          options = { cwd: this.projectRoot };
          break;
          
        case 'performance':
          command = 'npm';
          args = ['run', 'test:performance'];
          options = { cwd: this.projectRoot };
          break;
          
        default:
          throw new Error(`未知のテストタイプ: ${type}`);
      }
      
      const result = await this.executeCommand(command, args, options);
      const duration = Date.now() - startTime;
      
      return {
        success: result.exitCode === 0,
        duration,
        output: result.output,
        exitCode: result.exitCode
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        exitCode: 1
      };
    }
  }

  /**
   * コマンドを実行
   */
  executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: this.config.debug ? 'inherit' : 'pipe',
        ...options
      });
      
      let output = '';
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          output += data.toString();
          if (this.config.debug) {
            process.stdout.write(data);
          }
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          output += data.toString();
          if (this.config.debug) {
            process.stderr.write(data);
          }
        });
      }
      
      child.on('close', (code) => {
        resolve({
          exitCode: code,
          output
        });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * テストサーバーを起動
   */
  async startTestServer() {
    console.log('🖥️ テストサーバーを起動中...');
    
    return new Promise((resolve, reject) => {
      const server = spawn('npm', ['start'], {
        cwd: path.join(this.projectRoot, 'jp2plantuml'),
        stdio: this.config.debug ? 'inherit' : 'pipe',
        env: { ...process.env, NODE_ENV: 'test', PORT: '8086' }
      });
      
      let output = '';
      
      if (server.stdout) {
        server.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes('Server running') || output.includes('localhost:8086')) {
            console.log('✅ テストサーバーが起動しました');
            resolve(server);
          }
        });
      }
      
      if (server.stderr) {
        server.stderr.on('data', (data) => {
          output += data.toString();
        });
      }
      
      server.on('error', (error) => {
        reject(error);
      });
      
      // タイムアウト処理
      setTimeout(() => {
        reject(new Error('サーバー起動がタイムアウトしました'));
      }, 30000);
    });
  }

  /**
   * 結果を集約
   */
  async aggregateResults(testResults) {
    console.log('📊 テスト結果を集約中...');
    
    for (const [type, result] of Object.entries(testResults)) {
      if (result.error) {
        this.results[type] = { failed: 1, error: result.error };
        continue;
      }
      
      // 結果を解析して統計を作成
      this.results[type] = await this.parseTestResults(type, result);
    }
  }

  /**
   * テスト結果を解析
   */
  async parseTestResults(type, result) {
    try {
      const parsed = {
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: result.duration,
        success: result.success
      };
      
      // 出力から統計を抽出（Jest/Playwrightの出力形式に基づく）
      const output = result.output || '';
      
      // Jestの結果解析
      if (type === 'unit' || type === 'integration') {
        const passMatch = output.match(/(\d+) passing/);
        const failMatch = output.match(/(\d+) failing/);
        const skipMatch = output.match(/(\d+) pending/);
        const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
        
        if (passMatch) parsed.passed = parseInt(passMatch[1]);
        if (failMatch) parsed.failed = parseInt(failMatch[1]);
        if (skipMatch) parsed.skipped = parseInt(skipMatch[1]);
        if (coverageMatch) parsed.coverage = parseFloat(coverageMatch[1]);
      }
      
      // Playwrightの結果解析
      if (type === 'e2e') {
        const passMatch = output.match(/(\d+) passed/);
        const failMatch = output.match(/(\d+) failed/);
        const skipMatch = output.match(/(\d+) skipped/);
        
        if (passMatch) parsed.passed = parseInt(passMatch[1]);
        if (failMatch) parsed.failed = parseInt(failMatch[1]);
        if (skipMatch) parsed.skipped = parseInt(skipMatch[1]);
      }
      
      return parsed;
      
    } catch (error) {
      console.warn(`⚠️ ${type}テストの結果解析に失敗:`, error.message);
      return { passed: 0, failed: 1, skipped: 0, error: error.message };
    }
  }

  /**
   * レポートを生成
   */
  async generateReports() {
    console.log('📋 テストレポートを生成中...');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime.getTime(),
      config: this.config,
      results: this.results,
      summary: this.generateSummary()
    };
    
    // JSON形式のレポート
    await fs.writeFile(
      path.join(this.projectRoot, 'test-results', 'integration-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // 日本語のマークダウンレポート
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile(
      path.join(this.projectRoot, 'test-results', 'integration-test-report.md'),
      markdownReport
    );
    
    console.log('✅ レポート生成完了');
  }

  /**
   * サマリーを生成
   */
  generateSummary() {
    const total = {
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: 0
    };
    
    Object.values(this.results).forEach(result => {
      total.passed += result.passed || 0;
      total.failed += result.failed || 0;
      total.skipped += result.skipped || 0;
    });
    
    // 平均カバレッジを計算
    const coverageResults = Object.values(this.results)
      .filter(result => result.coverage !== undefined)
      .map(result => result.coverage);
    
    if (coverageResults.length > 0) {
      total.coverage = coverageResults.reduce((sum, coverage) => sum + coverage, 0) / coverageResults.length;
    }
    
    return total;
  }

  /**
   * マークダウンレポートを生成
   */
  generateMarkdownReport(report) {
    return `# PlantUML統合テストレポート

## 実行概要

- **実行日時**: ${new Date(report.timestamp).toLocaleString('ja-JP')}
- **実行時間**: ${Math.round(report.duration / 1000)}秒
- **環境**: ${this.config.ci ? 'CI/CD' : 'ローカル'}
- **ベースURL**: ${this.config.baseUrl}
- **MCP統合**: ${this.config.mcpEnabled ? '有効' : '無効'}

## テスト結果サマリー

| メトリクス | 値 |
|------------|------|
| 成功テスト | ${report.summary.passed} |
| 失敗テスト | ${report.summary.failed} |
| スキップテスト | ${report.summary.skipped} |
| 平均カバレッジ | ${report.summary.coverage.toFixed(2)}% |

## 詳細結果

${Object.entries(report.results).map(([type, result]) => `
### ${type}テスト

- **成功**: ${result.passed || 0}
- **失敗**: ${result.failed || 0}
- **スキップ**: ${result.skipped || 0}
${result.coverage !== undefined ? `- **カバレッジ**: ${result.coverage.toFixed(2)}%` : ''}
${result.duration ? `- **実行時間**: ${Math.round(result.duration / 1000)}秒` : ''}
${result.error ? `- **エラー**: ${result.error}` : ''}
`).join('\n')}

## 結論

${this.checkOverallSuccess() ? 
  '✅ すべてのテストが正常に完了しました。' : 
  '❌ テストの実行中に問題が発生しました。上記の詳細を確認してください。'}

---
*このレポートは自動生成されました: ${new Date().toLocaleString('ja-JP')}*
`;
  }

  /**
   * 結果を表示
   */
  displayResults() {
    console.log('\n📊 テスト実行結果:');
    console.log('====================');
    
    Object.entries(this.results).forEach(([type, result]) => {
      const status = result.failed > 0 || result.error ? '❌' : '✅';
      console.log(`${status} ${type}: ${result.passed || 0}成功, ${result.failed || 0}失敗, ${result.skipped || 0}スキップ`);
      
      if (result.coverage !== undefined) {
        console.log(`   カバレッジ: ${result.coverage.toFixed(2)}%`);
      }
      
      if (result.error) {
        console.log(`   エラー: ${result.error}`);
      }
    });
    
    const summary = this.generateSummary();
    console.log(`\n合計: ${summary.passed}成功, ${summary.failed}失敗, ${summary.skipped}スキップ`);
    console.log(`平均カバレッジ: ${summary.coverage.toFixed(2)}%`);
    console.log(`実行時間: ${Math.round((Date.now() - this.startTime.getTime()) / 1000)}秒`);
  }

  /**
   * 全体的な成功判定
   */
  checkOverallSuccess() {
    return Object.values(this.results).every(result => 
      !result.error && (result.failed === 0 || result.failed === undefined)
    );
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // コマンドライン引数を解析
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--types' && args[i + 1]) {
      options.types = args[i + 1].split(',');
      i++;
    } else if (arg === '--coverage-only') {
      options.types = ['unit'];
    } else if (arg === '--e2e-only') {
      options.types = ['e2e'];
    } else if (arg === '--help') {
      console.log(`
PlantUML統合テストランナー

使用方法:
  node scripts/run-tests.js [オプション]

オプション:
  --types <types>     実行するテストタイプ (unit,integration,e2e,performance)
  --coverage-only     ユニットテストとカバレッジのみ実行
  --e2e-only          E2Eテストのみ実行
  --help              このヘルプを表示

環境変数:
  PARALLEL_WORKERS    並行ワーカー数 (デフォルト: 2)
  COVERAGE_THRESHOLD  カバレッジ閾値 (デフォルト: 80)
  BASE_URL           テスト対象のベースURL
  MCP_INTEGRATION    MCP統合を有効にする (true/false)
  CI                 CI環境フラグ
  DEBUG              デバッグモード
      `);
      process.exit(0);
    }
  }
  
  const runner = new TestRunner();
  runner.run(options);
}

module.exports = TestRunner;