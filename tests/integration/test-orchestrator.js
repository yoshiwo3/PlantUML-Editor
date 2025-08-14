/**
 * PlantUML統合テストオーケストレーター
 * 全テストスイートの統合実行と管理
 * 
 * @version 1.0.0
 * @description ClaudeCodeActionsとGitHub Issues統合対応
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const FRAMEWORK_CONFIG = require('./test-framework.config');

class TestOrchestrator {
  constructor() {
    this.config = FRAMEWORK_CONFIG;
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      claudeCodeActions: null,
      githubIssues: null,
      worktree: null,
      performance: null,
      security: null
    };
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * 全テストスイートの実行
   */
  async runAllTests(options = {}) {
    this.startTime = Date.now();
    console.log('🚀 PlantUML統合テストスイート実行開始');
    console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
    
    try {
      // 環境準備
      await this.setupEnvironment();
      
      // 並列実行可能なテストグループ
      const parallelTests = [];
      const sequentialTests = [];
      
      if (options.unit !== false) {
        parallelTests.push(this.runUnitTests());
      }
      
      if (options.integration !== false) {
        sequentialTests.push(() => this.runIntegrationTests());
      }
      
      if (options.e2e !== false) {
        sequentialTests.push(() => this.runE2ETests());
      }
      
      if (options.claudeCodeActions !== false && this.config.claudeCodeActions.enabled) {
        sequentialTests.push(() => this.runClaudeCodeActionsTests());
      }
      
      if (options.githubIssues !== false && this.config.githubIntegration.enabled) {
        parallelTests.push(this.runGitHubIssuesTests());
      }
      
      if (options.worktree !== false && this.config.worktreeConfig.enabled) {
        parallelTests.push(this.runWorktreeTests());
      }
      
      if (options.performance !== false) {
        sequentialTests.push(() => this.runPerformanceTests());
      }
      
      if (options.security !== false) {
        parallelTests.push(this.runSecurityTests());
      }
      
      // 並列テスト実行
      console.log('🔄 並列テスト実行中...');
      const parallelResults = await Promise.allSettled(parallelTests);
      this.processParallelResults(parallelResults);
      
      // 順次テスト実行
      console.log('🔄 順次テスト実行中...');
      for (const testFn of sequentialTests) {
        try {
          await testFn();
        } catch (error) {
          console.error(`順次テスト実行エラー: ${error.message}`);
        }
      }
      
      // 結果の統合と分析
      await this.analyzeResults();
      
      // レポート生成
      await this.generateReports();
      
      // 通知送信
      await this.sendNotifications();
      
      this.endTime = Date.now();
      console.log(`✅ 全テスト完了 (${this.getExecutionTime()})`);
      
      return this.getFinalResults();
      
    } catch (error) {
      console.error('❌ テストスイート実行エラー:', error);
      await this.handleTestFailure(error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 環境準備
   */
  async setupEnvironment() {
    console.log('🔧 テスト環境準備中...');
    
    // レポートディレクトリ作成
    const reportDir = this.config.reporting.outputDirectory;
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // カバレッジディレクトリ作成
    const coverageDir = this.config.reporting.coverage.directory;
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }
    
    // DockerまたはローカルサーバーStartup確認
    const environment = process.env.TEST_ENVIRONMENT || 'local';
    if (environment === 'docker') {
      await this.ensureDockerEnvironment();
    } else {
      await this.ensureLocalEnvironment();
    }
    
    console.log('✅ テスト環境準備完了');
  }

  /**
   * Docker環境確認
   */
  async ensureDockerEnvironment() {
    return new Promise((resolve, reject) => {
      const checkDocker = spawn('docker', ['ps', '--filter', 'name=jp2plantuml-app'], {
        stdio: 'pipe'
      });
      
      checkDocker.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Docker環境確認完了');
          resolve();
        } else {
          console.log('🐳 Docker環境起動中...');
          this.startDockerEnvironment().then(resolve).catch(reject);
        }
      });
    });
  }

  /**
   * ローカル環境確認
   */
  async ensureLocalEnvironment() {
    // ローカルサーバーの起動確認または起動
    return new Promise((resolve, reject) => {
      const healthCheck = spawn('curl', ['-f', `${this.config.environments.local.baseUrl}/health`], {
        stdio: 'pipe'
      });
      
      healthCheck.on('close', (code) => {
        if (code === 0) {
          console.log('✅ ローカル環境確認完了');
          resolve();
        } else {
          console.log('🚀 ローカルサーバー起動中...');
          this.startLocalServer().then(resolve).catch(reject);
        }
      });
    });
  }

  /**
   * 単体テスト実行
   */
  async runUnitTests() {
    console.log('📋 単体テスト実行中...');
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npm', ['run', 'test:coverage'], {
        cwd: path.resolve(this.config.projectRoot, 'jp2plantuml'),
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      jestProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      jestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });
      
      jestProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.results.unit = {
          success: code === 0,
          duration,
          output,
          errorOutput,
          exitCode: code,
          coverage: this.parseCoverageFromOutput(output)
        };
        
        if (code === 0) {
          console.log(`✅ 単体テスト完了 (${duration}ms)`);
          resolve(this.results.unit);
        } else {
          console.error(`❌ 単体テスト失敗 (${duration}ms)`);
          reject(new Error(`Unit tests failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * 統合テスト実行
   */
  async runIntegrationTests() {
    console.log('🔗 統合テスト実行中...');
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npm', ['run', 'test:integration'], {
        cwd: path.resolve(this.config.projectRoot, 'jp2plantuml'),
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      jestProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      jestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      jestProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.results.integration = {
          success: code === 0,
          duration,
          output,
          errorOutput,
          exitCode: code
        };
        
        if (code === 0) {
          console.log(`✅ 統合テスト完了 (${duration}ms)`);
          resolve(this.results.integration);
        } else {
          console.error(`❌ 統合テスト失敗 (${duration}ms)`);
          reject(new Error(`Integration tests failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * E2Eテスト実行
   */
  async runE2ETests() {
    console.log('🌐 E2Eテスト実行中...');
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const playwrightProcess = spawn('npx', ['playwright', 'test', '--reporter=json'], {
        cwd: this.config.testSuites.e2e.directory,
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      playwrightProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      playwrightProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      playwrightProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.results.e2e = {
          success: code === 0,
          duration,
          output,
          errorOutput,
          exitCode: code,
          testResults: this.parsePlaywrightOutput(output)
        };
        
        if (code === 0) {
          console.log(`✅ E2Eテスト完了 (${duration}ms)`);
          resolve(this.results.e2e);
        } else {
          console.error(`❌ E2Eテスト失敗 (${duration}ms)`);
          reject(new Error(`E2E tests failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * ClaudeCodeActionsテスト実行
   */
  async runClaudeCodeActionsTests() {
    console.log('🤖 ClaudeCodeActionsテスト実行中...');
    const startTime = Date.now();
    
    try {
      // AI統合品質チェック
      const codeQualityResult = await this.runCodeQualityValidation();
      
      // セキュリティスキャン
      const securityResult = await this.runSecurityValidation();
      
      // パフォーマンス検証
      const performanceResult = await this.runPerformanceValidation();
      
      // Claude API統合テスト
      const apiIntegrationResult = await this.runClaudeAPIIntegration();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.claudeCodeActions = {
        success: codeQualityResult.success && 
                securityResult.success && 
                performanceResult.success && 
                apiIntegrationResult.success,
        duration,
        results: {
          codeQuality: codeQualityResult,
          security: securityResult,
          performance: performanceResult,
          apiIntegration: apiIntegrationResult
        }
      };
      
      console.log(`✅ ClaudeCodeActionsテスト完了 (${duration}ms)`);
      return this.results.claudeCodeActions;
      
    } catch (error) {
      console.error(`❌ ClaudeCodeActionsテスト失敗:`, error);
      this.results.claudeCodeActions = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }

  /**
   * GitHub Issuesテスト実行
   */
  async runGitHubIssuesTests() {
    console.log('🐙 GitHub Issuesテスト実行中...');
    const startTime = Date.now();
    
    try {
      // Issue自動作成テスト
      const issueCreationResult = await this.testIssueCreation();
      
      // Webhook統合テスト
      const webhookResult = await this.testWebhookIntegration();
      
      // ラベル自動付与テスト
      const labelingResult = await this.testAutoLabeling();
      
      // コメント自動化テスト
      const commentingResult = await this.testAutoCommenting();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.githubIssues = {
        success: issueCreationResult.success && 
                webhookResult.success && 
                labelingResult.success && 
                commentingResult.success,
        duration,
        results: {
          issueCreation: issueCreationResult,
          webhook: webhookResult,
          labeling: labelingResult,
          commenting: commentingResult
        }
      };
      
      console.log(`✅ GitHub Issuesテスト完了 (${duration}ms)`);
      return this.results.githubIssues;
      
    } catch (error) {
      console.error(`❌ GitHub Issuesテスト失敗:`, error);
      this.results.githubIssues = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }

  /**
   * Worktreeテスト実行
   */
  async runWorktreeTests() {
    console.log('🌳 Worktreeテスト実行中...');
    const startTime = Date.now();
    
    try {
      // 複数ブランチでの並行テスト実行
      const branches = ['main', 'develop', 'feature/test'];
      const worktreeResults = [];
      
      for (const branch of branches) {
        if (await this.branchExists(branch)) {
          const result = await this.runTestInWorktree(branch);
          worktreeResults.push({ branch, ...result });
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.worktree = {
        success: worktreeResults.every(r => r.success),
        duration,
        results: worktreeResults
      };
      
      console.log(`✅ Worktreeテスト完了 (${duration}ms)`);
      return this.results.worktree;
      
    } catch (error) {
      console.error(`❌ Worktreeテスト失敗:`, error);
      this.results.worktree = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }

  /**
   * パフォーマンステスト実行
   */
  async runPerformanceTests() {
    console.log('⚡ パフォーマンステスト実行中...');
    const startTime = Date.now();
    
    try {
      // 負荷テスト
      const loadTestResult = await this.runLoadTest();
      
      // メモリ使用量テスト
      const memoryTestResult = await this.runMemoryTest();
      
      // レスポンス時間テスト
      const responseTimeResult = await this.runResponseTimeTest();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.performance = {
        success: loadTestResult.success && 
                memoryTestResult.success && 
                responseTimeResult.success,
        duration,
        results: {
          loadTest: loadTestResult,
          memoryTest: memoryTestResult,
          responseTime: responseTimeResult
        }
      };
      
      console.log(`✅ パフォーマンステスト完了 (${duration}ms)`);
      return this.results.performance;
      
    } catch (error) {
      console.error(`❌ パフォーマンステスト失敗:`, error);
      this.results.performance = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }

  /**
   * セキュリティテスト実行
   */
  async runSecurityTests() {
    console.log('🔒 セキュリティテスト実行中...');
    const startTime = Date.now();
    
    try {
      // 脆弱性スキャン
      const vulnerabilityResult = await this.runVulnerabilityTest();
      
      // 依存関係チェック
      const dependencyResult = await this.runDependencyCheck();
      
      // コードセキュリティスキャン
      const codeSecurityResult = await this.runCodeSecurityScan();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.security = {
        success: vulnerabilityResult.success && 
                dependencyResult.success && 
                codeSecurityResult.success,
        duration,
        results: {
          vulnerability: vulnerabilityResult,
          dependency: dependencyResult,
          codeSecurity: codeSecurityResult
        }
      };
      
      console.log(`✅ セキュリティテスト完了 (${duration}ms)`);
      return this.results.security;
      
    } catch (error) {
      console.error(`❌ セキュリティテスト失敗:`, error);
      this.results.security = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }

  /**
   * 結果分析
   */
  async analyzeResults() {
    console.log('📊 テスト結果分析中...');
    
    const analysis = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      executionTime: this.getExecutionTime(),
      coverage: this.calculateOverallCoverage(),
      performance: this.analyzePerformanceMetrics(),
      security: this.analyzeSecurityResults(),
      recommendations: []
    };
    
    // 各テストスイートの結果分析
    Object.entries(this.results).forEach(([suite, result]) => {
      if (result) {
        analysis.totalTests++;
        if (result.success) {
          analysis.passedTests++;
        } else {
          analysis.failedTests++;
          analysis.recommendations.push(`${suite}テストの修正が必要です`);
        }
      }
    });
    
    this.analysis = analysis;
    console.log('✅ テスト結果分析完了');
  }

  /**
   * レポート生成
   */
  async generateReports() {
    console.log('📄 レポート生成中...');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      analysis: this.analysis,
      configuration: this.config
    };
    
    // HTML レポート生成
    await this.generateHTMLReport(reportData);
    
    // JSON レポート生成
    await this.generateJSONReport(reportData);
    
    // JUnit XML レポート生成
    await this.generateJUnitReport(reportData);
    
    console.log('✅ レポート生成完了');
  }

  /**
   * 通知送信
   */
  async sendNotifications() {
    console.log('📢 通知送信中...');
    
    const overallSuccess = this.analysis.failedTests === 0;
    
    if (this.config.notifications.slack.enabled) {
      await this.sendSlackNotification(overallSuccess);
    }
    
    if (this.config.notifications.github.enabled) {
      await this.sendGitHubNotification(overallSuccess);
    }
    
    console.log('✅ 通知送信完了');
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    console.log('🧹 クリーンアップ中...');
    // 一時ファイル削除、リソース解放など
    console.log('✅ クリーンアップ完了');
  }

  // ヘルパーメソッド
  getExecutionTime() {
    if (this.startTime && this.endTime) {
      return `${((this.endTime - this.startTime) / 1000).toFixed(2)}秒`;
    }
    return '計測不可';
  }

  getFinalResults() {
    return {
      success: this.analysis ? this.analysis.failedTests === 0 : false,
      results: this.results,
      analysis: this.analysis,
      executionTime: this.getExecutionTime()
    };
  }
  
  // 追加のヘルパーメソッドは実装予定...
}

module.exports = TestOrchestrator;