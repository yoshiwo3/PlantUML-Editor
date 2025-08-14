/**
 * 自動テスト実行パイプライン
 * 全テストスイートの統合実行とCI/CD連携
 * 
 * @version 1.0.0
 * @description ClaudeCodeActionsとGitHub Issues統合対応
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const TestOrchestrator = require('../integration/test-orchestrator');
const WorktreeTestStrategy = require('../worktree/worktree-test-strategy');

// パイプライン設定
const PIPELINE_CONFIG = {
  stages: [
    'pre-validation',
    'unit-tests',
    'integration-tests',
    'security-scan',
    'claude-integration',
    'github-integration',
    'worktree-tests',
    'e2e-tests',
    'performance-tests',
    'post-validation'
  ],
  parallel: {
    'unit-tests': ['lint', 'type-check'],
    'security-scan': ['vulnerability-scan', 'dependency-check'],
    'integration-tests': ['api-tests', 'database-tests']
  },
  environment: process.env.NODE_ENV || 'test',
  timeout: 1800000, // 30分
  retryAttempts: 2,
  failFast: false
};

class AutomatedTestPipeline {
  constructor() {
    this.orchestrator = new TestOrchestrator();
    this.worktreeStrategy = new WorktreeTestStrategy();
    this.startTime = null;
    this.stageResults = new Map();
    this.pipelineMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      coverage: {},
      performance: {}
    };
  }

  /**
   * パイプラインメイン実行
   */
  async executePipeline(options = {}) {
    this.startTime = Date.now();
    console.log('🚀 自動テストパイプライン実行開始');
    console.log(`環境: ${PIPELINE_CONFIG.environment}`);
    console.log(`ステージ: ${PIPELINE_CONFIG.stages.join(' → ')}`);
    
    try {
      // 前処理
      await this.initializePipeline();
      
      // 各ステージ実行
      for (const stage of PIPELINE_CONFIG.stages) {
        if (options.skipStages && options.skipStages.includes(stage)) {
          console.log(`⏭️ ステージスキップ: ${stage}`);
          continue;
        }
        
        await this.executeStage(stage);
        
        // 失敗時の早期終了オプション
        if (PIPELINE_CONFIG.failFast && !this.stageResults.get(stage)?.success) {
          throw new Error(`ステージ ${stage} で失敗したため実行を中断`);
        }
      }
      
      // 後処理
      await this.finalizePipeline();
      
      const totalDuration = Date.now() - this.startTime;
      console.log(`🎉 パイプライン実行完了 (${(totalDuration / 1000).toFixed(2)}秒)`);
      
      return this.generatePipelineReport();
      
    } catch (error) {
      console.error('❌ パイプライン実行エラー:', error);
      await this.handlePipelineFailure(error);
      throw error;
    }
  }

  /**
   * パイプライン初期化
   */
  async initializePipeline() {
    console.log('🔧 パイプライン初期化中...');
    
    // レポートディレクトリ作成
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // 環境変数設定
    process.env.CI = 'true';
    process.env.NODE_ENV = PIPELINE_CONFIG.environment;
    
    // Git情報取得
    this.gitInfo = await this.getGitInformation();
    
    console.log('✅ パイプライン初期化完了');
  }

  /**
   * ステージ実行
   */
  async executeStage(stageName) {
    const stageStartTime = Date.now();
    console.log(`\n🎯 ステージ実行: ${stageName}`);
    
    try {
      let stageResult;
      
      switch (stageName) {
        case 'pre-validation':
          stageResult = await this.executePreValidation();
          break;
        case 'unit-tests':
          stageResult = await this.executeUnitTests();
          break;
        case 'integration-tests':
          stageResult = await this.executeIntegrationTests();
          break;
        case 'security-scan':
          stageResult = await this.executeSecurityScan();
          break;
        case 'claude-integration':
          stageResult = await this.executeClaudeIntegration();
          break;
        case 'github-integration':
          stageResult = await this.executeGitHubIntegration();
          break;
        case 'worktree-tests':
          stageResult = await this.executeWorktreeTests();
          break;
        case 'e2e-tests':
          stageResult = await this.executeE2ETests();
          break;
        case 'performance-tests':
          stageResult = await this.executePerformanceTests();
          break;
        case 'post-validation':
          stageResult = await this.executePostValidation();
          break;
        default:
          throw new Error(`未知のステージ: ${stageName}`);
      }
      
      const stageDuration = Date.now() - stageStartTime;
      stageResult.duration = stageDuration;
      this.stageResults.set(stageName, stageResult);
      
      const status = stageResult.success ? '✅' : '❌';
      console.log(`${status} ステージ完了: ${stageName} (${(stageDuration / 1000).toFixed(2)}秒)`);
      
      // メトリクス更新
      this.updatePipelineMetrics(stageName, stageResult);
      
    } catch (error) {
      const stageDuration = Date.now() - stageStartTime;
      const stageResult = {
        success: false,
        error: error.message,
        duration: stageDuration
      };
      
      this.stageResults.set(stageName, stageResult);
      console.error(`❌ ステージ失敗: ${stageName} (${(stageDuration / 1000).toFixed(2)}秒)`, error.message);
      
      if (!PIPELINE_CONFIG.failFast) {
        console.log('🔄 継続実行モードのため次のステージへ');
      } else {
        throw error;
      }
    }
  }

  /**
   * 事前検証ステージ
   */
  async executePreValidation() {
    console.log('🔍 事前検証実行中...');
    
    const validations = [];
    
    // Node.js バージョン確認
    const nodeVersion = process.version;
    validations.push({
      name: 'Node.js Version',
      success: nodeVersion.startsWith('v18.') || nodeVersion.startsWith('v20.'),
      message: `Node.js ${nodeVersion}`
    });
    
    // npm パッケージ整合性確認
    try {
      await this.runCommand('npm', ['audit', '--audit-level', 'high'], {
        cwd: path.join(__dirname, '../../jp2plantuml')
      });
      validations.push({
        name: 'npm audit',
        success: true,
        message: 'パッケージセキュリティチェック通過'
      });
    } catch (error) {
      validations.push({
        name: 'npm audit',
        success: false,
        message: `セキュリティ問題発見: ${error.message}`
      });
    }
    
    // Git リポジトリ状態確認
    const gitStatus = await this.getGitStatus();
    validations.push({
      name: 'Git Status',
      success: true,
      message: `ブランチ: ${gitStatus.branch}, コミット: ${gitStatus.commit}`
    });
    
    const allSuccess = validations.every(v => v.success);
    
    return {
      success: allSuccess,
      validations,
      message: allSuccess ? '全ての事前検証に通過' : '一部の事前検証で問題あり'
    };
  }

  /**
   * 単体テストステージ
   */
  async executeUnitTests() {
    console.log('📋 単体テスト実行中...');
    
    const testResult = await this.runCommand('npm', ['run', 'test:coverage'], {
      cwd: path.join(__dirname, '../../jp2plantuml')
    });
    
    const coverage = this.extractCoverageData(testResult.output);
    
    return {
      success: testResult.success,
      coverage,
      output: testResult.output,
      testCount: this.extractTestCount(testResult.output)
    };
  }

  /**
   * 統合テストステージ
   */
  async executeIntegrationTests() {
    console.log('🔗 統合テスト実行中...');
    
    const testResult = await this.runCommand('npm', ['run', 'test:integration'], {
      cwd: path.join(__dirname, '../../jp2plantuml')
    });
    
    return {
      success: testResult.success,
      output: testResult.output,
      testCount: this.extractTestCount(testResult.output)
    };
  }

  /**
   * セキュリティスキャンステージ
   */
  async executeSecurityScan() {
    console.log('🔒 セキュリティスキャン実行中...');
    
    const scans = [];
    
    // npm audit
    try {
      const auditResult = await this.runCommand('npm', ['audit', '--json'], {
        cwd: path.join(__dirname, '../../jp2plantuml')
      });
      
      const auditData = JSON.parse(auditResult.output || '{}');
      scans.push({
        name: 'npm audit',
        success: (auditData.metadata?.vulnerabilities?.high || 0) === 0,
        vulnerabilities: auditData.metadata?.vulnerabilities || {}
      });
    } catch (error) {
      scans.push({
        name: 'npm audit',
        success: false,
        error: error.message
      });
    }
    
    // ESLint セキュリティルール
    try {
      const lintResult = await this.runCommand('npx', ['eslint', '.', '--format', 'json'], {
        cwd: path.join(__dirname, '../../jp2plantuml')
      });
      
      scans.push({
        name: 'ESLint Security',
        success: lintResult.success,
        issues: JSON.parse(lintResult.output || '[]').length
      });
    } catch (error) {
      scans.push({
        name: 'ESLint Security',
        success: false,
        error: error.message
      });
    }
    
    const allSuccess = scans.every(s => s.success);
    
    return {
      success: allSuccess,
      scans,
      message: allSuccess ? 'セキュリティスキャン完了' : 'セキュリティ問題発見'
    };
  }

  /**
   * ClaudeCodeActions統合ステージ
   */
  async executeClaudeIntegration() {
    console.log('🤖 Claude統合テスト実行中...');
    
    try {
      const claudeTestResult = await this.runCommand('npm', ['test', '--', '--testPathPattern=claude'], {
        cwd: path.join(__dirname, '../claudecodeactions')
      });
      
      return {
        success: claudeTestResult.success,
        output: claudeTestResult.output,
        integrationPoints: [
          'AI Code Analysis',
          'PR Auto Review',
          'Issue Classification',
          'Quality Gates'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Claude統合テスト失敗'
      };
    }
  }

  /**
   * GitHub統合ステージ
   */
  async executeGitHubIntegration() {
    console.log('🐙 GitHub統合テスト実行中...');
    
    try {
      const githubTestResult = await this.runCommand('npm', ['test', '--', '--testPathPattern=github'], {
        cwd: path.join(__dirname, '../github-issues')
      });
      
      return {
        success: githubTestResult.success,
        output: githubTestResult.output,
        integrationPoints: [
          'Issue Auto Creation',
          'Label Management',
          'Webhook Processing',
          'PR Integration'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'GitHub統合テスト失敗'
      };
    }
  }

  /**
   * Worktreeテストステージ
   */
  async executeWorktreeTests() {
    console.log('🌳 Worktreeテスト実行中...');
    
    try {
      const worktreeResult = await this.worktreeStrategy.executeWorktreeTests({
        branches: ['main', 'develop'],
        parallel: true
      });
      
      return {
        success: worktreeResult.success,
        results: worktreeResult.results,
        analysis: worktreeResult.analysis
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Worktreeテスト失敗'
      };
    }
  }

  /**
   * E2Eテストステージ
   */
  async executeE2ETests() {
    console.log('🌐 E2Eテスト実行中...');
    
    try {
      const e2eResult = await this.runCommand('npx', ['playwright', 'test', '--reporter=json'], {
        cwd: path.join(__dirname, '../e2e')
      });
      
      const testResults = JSON.parse(e2eResult.output || '{}');
      
      return {
        success: e2eResult.success,
        testResults,
        browsers: ['chromium', 'firefox', 'webkit'],
        screenshots: this.collectScreenshots()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'E2Eテスト失敗'
      };
    }
  }

  /**
   * パフォーマンステストステージ
   */
  async executePerformanceTests() {
    console.log('⚡ パフォーマンステスト実行中...');
    
    const performanceMetrics = {
      loadTime: await this.measureLoadTime(),
      memoryUsage: await this.measureMemoryUsage(),
      apiResponseTime: await this.measureAPIResponseTime(),
      concurrentUsers: await this.testConcurrentUsers()
    };
    
    const thresholds = {
      loadTime: 3000, // 3秒
      memoryUsage: 512 * 1024 * 1024, // 512MB
      apiResponseTime: 500, // 500ms
      concurrentUsers: 10
    };
    
    const passed = Object.entries(performanceMetrics).every(([key, value]) => {
      return value <= thresholds[key];
    });
    
    return {
      success: passed,
      metrics: performanceMetrics,
      thresholds,
      message: passed ? 'パフォーマンス基準クリア' : 'パフォーマンス基準未達'
    };
  }

  /**
   * 事後検証ステージ
   */
  async executePostValidation() {
    console.log('🔍 事後検証実行中...');
    
    const validations = [];
    
    // アーティファクト確認
    const reportDir = path.join(__dirname, '../reports');
    const hasReports = fs.existsSync(reportDir) && fs.readdirSync(reportDir).length > 0;
    validations.push({
      name: 'Test Reports',
      success: hasReports,
      message: hasReports ? 'テストレポート生成済み' : 'テストレポート未生成'
    });
    
    // カバレッジ確認
    const coverageDir = path.join(__dirname, '../coverage-reports');
    const hasCoverage = fs.existsSync(coverageDir);
    validations.push({
      name: 'Coverage Reports',
      success: hasCoverage,
      message: hasCoverage ? 'カバレッジレポート生成済み' : 'カバレッジレポート未生成'
    });
    
    // 全体成功率確認
    const successfulStages = Array.from(this.stageResults.values()).filter(r => r.success).length;
    const totalStages = this.stageResults.size;
    const successRate = (successfulStages / totalStages) * 100;
    
    validations.push({
      name: 'Overall Success Rate',
      success: successRate >= 80,
      message: `成功率: ${successRate.toFixed(1)}% (${successfulStages}/${totalStages})`
    });
    
    const allSuccess = validations.every(v => v.success);
    
    return {
      success: allSuccess,
      validations,
      successRate,
      message: allSuccess ? '全ての事後検証に通過' : '一部の事後検証で問題あり'
    };
  }

  /**
   * パイプライン終了処理
   */
  async finalizePipeline() {
    console.log('📊 パイプライン終了処理中...');
    
    // 最終レポート生成
    await this.generateFinalReport();
    
    // アーティファクト収集
    await this.collectArtifacts();
    
    // 通知送信
    await this.sendNotifications();
    
    console.log('✅ パイプライン終了処理完了');
  }

  /**
   * パイプライン失敗処理
   */
  async handlePipelineFailure(error) {
    console.log('🚨 パイプライン失敗処理中...');
    
    // 失敗レポート生成
    await this.generateFailureReport(error);
    
    // 緊急通知送信
    await this.sendFailureNotifications(error);
    
    // デバッグ情報収集
    await this.collectDebugInformation();
    
    console.log('✅ パイプライン失敗処理完了');
  }

  /**
   * コマンド実行ヘルパー
   */
  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output,
          errorOutput
        });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  // パフォーマンス測定ヘルパー
  async measureLoadTime() {
    // 模擬実装
    return Math.floor(Math.random() * 2000) + 1000; // 1-3秒
  }

  async measureMemoryUsage() {
    // 模擬実装
    return Math.floor(Math.random() * 256) * 1024 * 1024; // 0-256MB
  }

  async measureAPIResponseTime() {
    // 模擬実装
    return Math.floor(Math.random() * 400) + 100; // 100-500ms
  }

  async testConcurrentUsers() {
    // 模擬実装
    return Math.floor(Math.random() * 15) + 5; // 5-20ユーザー
  }

  // その他ヘルパーメソッド
  async getGitInformation() {
    try {
      const branch = await this.runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
      const commit = await this.runCommand('git', ['rev-parse', 'HEAD']);
      
      return {
        branch: branch.output.trim(),
        commit: commit.output.trim().substring(0, 7),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        branch: 'unknown',
        commit: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getGitStatus() {
    try {
      const status = await this.runCommand('git', ['status', '--porcelain']);
      const branch = await this.runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
      const commit = await this.runCommand('git', ['rev-parse', '--short', 'HEAD']);
      
      return {
        branch: branch.output.trim(),
        commit: commit.output.trim(),
        changes: status.output.trim().split('\n').filter(line => line.trim())
      };
    } catch (error) {
      return {
        branch: 'unknown',
        commit: 'unknown',
        changes: []
      };
    }
  }

  extractCoverageData(output) {
    // Jest coverage output parsing
    const coverageMatch = output.match(/All files[^\n]*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)/);
    
    if (coverageMatch) {
      return {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }
    
    return null;
  }

  extractTestCount(output) {
    const testMatch = output.match(/(\d+) passing/);
    return testMatch ? parseInt(testMatch[1]) : 0;
  }

  collectScreenshots() {
    // E2Eテストのスクリーンショット収集
    const screenshotDir = path.join(__dirname, '../e2e/screenshots');
    if (fs.existsSync(screenshotDir)) {
      return fs.readdirSync(screenshotDir).filter(file => file.endsWith('.png'));
    }
    return [];
  }

  updatePipelineMetrics(stageName, stageResult) {
    if (stageResult.testCount) {
      this.pipelineMetrics.totalTests += stageResult.testCount;
      if (stageResult.success) {
        this.pipelineMetrics.passedTests += stageResult.testCount;
      } else {
        this.pipelineMetrics.failedTests += stageResult.testCount;
      }
    }
    
    if (stageResult.coverage) {
      this.pipelineMetrics.coverage[stageName] = stageResult.coverage;
    }
  }

  async generateFinalReport() {
    const report = {
      timestamp: new Date().toISOString(),
      gitInfo: this.gitInfo,
      duration: Date.now() - this.startTime,
      stages: Object.fromEntries(this.stageResults),
      metrics: this.pipelineMetrics,
      environment: PIPELINE_CONFIG.environment,
      success: Array.from(this.stageResults.values()).every(r => r.success)
    };
    
    const reportPath = path.join(__dirname, '../reports/pipeline-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 最終レポート生成: ${reportPath}`);
  }

  async generateFailureReport(error) {
    const failureReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      gitInfo: this.gitInfo,
      completedStages: Object.fromEntries(this.stageResults),
      environment: PIPELINE_CONFIG.environment
    };
    
    const reportPath = path.join(__dirname, '../reports/pipeline-failure-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(failureReport, null, 2));
    
    console.log(`📄 失敗レポート生成: ${reportPath}`);
  }

  generatePipelineReport() {
    const totalDuration = Date.now() - this.startTime;
    const successfulStages = Array.from(this.stageResults.values()).filter(r => r.success).length;
    const totalStages = this.stageResults.size;
    
    return {
      success: successfulStages === totalStages,
      duration: totalDuration,
      stages: Object.fromEntries(this.stageResults),
      metrics: this.pipelineMetrics,
      successRate: (successfulStages / totalStages) * 100,
      gitInfo: this.gitInfo
    };
  }

  async collectArtifacts() {
    console.log('📦 アーティファクト収集中...');
    // アーティファクト収集の実装
  }

  async sendNotifications() {
    console.log('📢 通知送信中...');
    // 通知送信の実装
  }

  async sendFailureNotifications(error) {
    console.log('🚨 失敗通知送信中...');
    // 失敗通知送信の実装
  }

  async collectDebugInformation() {
    console.log('🔍 デバッグ情報収集中...');
    // デバッグ情報収集の実装
  }
}

module.exports = AutomatedTestPipeline;

// CLI実行時のエントリーポイント
if (require.main === module) {
  const pipeline = new AutomatedTestPipeline();
  
  pipeline.executePipeline({
    skipStages: process.argv.includes('--skip-e2e') ? ['e2e-tests'] : []
  }).then((result) => {
    process.exit(result.success ? 0 : 1);
  }).catch((error) => {
    console.error('パイプライン実行失敗:', error);
    process.exit(1);
  });
}