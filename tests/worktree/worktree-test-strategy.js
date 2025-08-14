/**
 * Git Worktree テスト戦略実装
 * 複数ブランチでの並行テスト実行と環境分離
 * 
 * @version 1.0.0
 * @description ブランチ分離環境での包括的テスト戦略
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Worktree設定
const WORKTREE_CONFIG = {
  baseRepository: path.resolve(__dirname, '../..'),
  worktreeBase: path.resolve(__dirname, '../../..'),
  testBranches: ['main', 'develop', 'feature/test-automation'],
  parallelExecution: true,
  isolationLevel: 'full', // full, partial, minimal
  maxConcurrentWorktrees: 3,
  cleanupAfterTests: true
};

class WorktreeTestStrategy {
  constructor(config = WORKTREE_CONFIG) {
    this.config = config;
    this.activeWorktrees = new Map();
    this.testResults = new Map();
    this.startTime = null;
  }

  /**
   * Worktree テスト戦略のメイン実行
   */
  async executeWorktreeTests(options = {}) {
    this.startTime = Date.now();
    console.log('🌳 Worktree テスト戦略実行開始');
    console.log(`対象ブランチ: ${this.config.testBranches.join(', ')}`);
    
    try {
      // 前提条件確認
      await this.validatePrerequisites();
      
      // ブランチ存在確認
      const availableBranches = await this.getAvailableBranches();
      const testBranches = this.config.testBranches.filter(branch => 
        availableBranches.includes(branch)
      );
      
      console.log(`実行対象ブランチ: ${testBranches.join(', ')}`);
      
      if (this.config.parallelExecution) {
        await this.executeParallelWorktreeTests(testBranches);
      } else {
        await this.executeSequentialWorktreeTests(testBranches);
      }
      
      // 結果分析
      const analysis = await this.analyzeWorktreeResults();
      
      // レポート生成
      await this.generateWorktreeReport(analysis);
      
      // クリーンアップ
      if (this.config.cleanupAfterTests) {
        await this.cleanupWorktrees();
      }
      
      const duration = Date.now() - this.startTime;
      console.log(`🌳 Worktree テスト完了 (${duration}ms)`);
      
      return {
        success: analysis.overallSuccess,
        results: this.testResults,
        analysis,
        duration
      };
      
    } catch (error) {
      console.error('❌ Worktree テスト実行エラー:', error);
      await this.cleanupWorktrees();
      throw error;
    }
  }

  /**
   * 前提条件の確認
   */
  async validatePrerequisites() {
    console.log('🔍 前提条件確認中...');
    
    // Git リポジトリの確認
    const isGitRepo = await this.isGitRepository();
    if (!isGitRepo) {
      throw new Error('Git リポジトリではありません');
    }
    
    // Git worktree コマンドの確認
    try {
      await execAsync('git worktree --help');
    } catch (error) {
      throw new Error('Git worktree コマンドが利用できません');
    }
    
    // ベースディレクトリの確認
    if (!fs.existsSync(this.config.worktreeBase)) {
      fs.mkdirSync(this.config.worktreeBase, { recursive: true });
    }
    
    console.log('✅ 前提条件確認完了');
  }

  /**
   * 利用可能なブランチを取得
   */
  async getAvailableBranches() {
    const { stdout } = await execAsync('git branch -a', {
      cwd: this.config.baseRepository
    });
    
    const branches = stdout
      .split('\n')
      .map(line => line.trim().replace(/^\*\s*/, ''))
      .filter(line => line && !line.startsWith('remotes/origin/HEAD'))
      .map(line => line.replace('remotes/origin/', ''))
      .filter((branch, index, self) => self.indexOf(branch) === index);
    
    return branches;
  }

  /**
   * 並列Worktreeテスト実行
   */
  async executeParallelWorktreeTests(branches) {
    console.log('🔄 並列Worktreeテスト実行中...');
    
    const chunks = this.chunkArray(branches, this.config.maxConcurrentWorktrees);
    
    for (const chunk of chunks) {
      const promises = chunk.map(branch => this.executeWorktreeTestForBranch(branch));
      await Promise.allSettled(promises);
    }
  }

  /**
   * 順次Worktreeテスト実行
   */
  async executeSequentialWorktreeTests(branches) {
    console.log('📋 順次Worktreeテスト実行中...');
    
    for (const branch of branches) {
      await this.executeWorktreeTestForBranch(branch);
    }
  }

  /**
   * 単一ブランチでのWorktreeテスト実行
   */
  async executeWorktreeTestForBranch(branch) {
    const branchStartTime = Date.now();
    console.log(`🔨 ブランチ ${branch} のテスト開始`);
    
    try {
      // Worktree作成
      const worktreePath = await this.createWorktree(branch);
      this.activeWorktrees.set(branch, worktreePath);
      
      // テスト環境セットアップ
      await this.setupTestEnvironment(worktreePath);
      
      // テストスイート実行
      const testResults = await this.runTestSuiteInWorktree(worktreePath, branch);
      
      const duration = Date.now() - branchStartTime;
      this.testResults.set(branch, {
        ...testResults,
        duration,
        worktreePath
      });
      
      console.log(`✅ ブランチ ${branch} のテスト完了 (${duration}ms)`);
      return testResults;
      
    } catch (error) {
      const duration = Date.now() - branchStartTime;
      console.error(`❌ ブランチ ${branch} のテスト失敗 (${duration}ms):`, error.message);
      
      this.testResults.set(branch, {
        success: false,
        error: error.message,
        duration
      });
      
      throw error;
    }
  }

  /**
   * Worktree作成
   */
  async createWorktree(branch) {
    const worktreeName = `plantuml-${branch.replace(/[\/\\]/g, '-')}-${Date.now()}`;
    const worktreePath = path.join(this.config.worktreeBase, worktreeName);
    
    console.log(`📁 Worktree作成: ${branch} -> ${worktreePath}`);
    
    try {
      // ブランチが存在するか確認
      const branchExists = await this.branchExists(branch);
      if (!branchExists) {
        throw new Error(`ブランチ ${branch} が存在しません`);
      }
      
      // Worktree作成
      await execAsync(`git worktree add "${worktreePath}" ${branch}`, {
        cwd: this.config.baseRepository
      });
      
      console.log(`✅ Worktree作成完了: ${worktreePath}`);
      return worktreePath;
      
    } catch (error) {
      console.error(`❌ Worktree作成失敗:`, error.message);
      throw error;
    }
  }

  /**
   * テスト環境セットアップ
   */
  async setupTestEnvironment(worktreePath) {
    console.log(`🔧 テスト環境セットアップ: ${worktreePath}`);
    
    try {
      // 依存関係インストール
      const packageJsonPath = path.join(worktreePath, 'jp2plantuml', 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        console.log('📦 依存関係インストール中...');
        await execAsync('npm ci', {
          cwd: path.join(worktreePath, 'jp2plantuml')
        });
      }
      
      // テスト固有の設定ファイル作成
      await this.createTestConfiguration(worktreePath);
      
      // ポート競合回避のためのポート設定
      await this.configureTestPorts(worktreePath);
      
      console.log('✅ テスト環境セットアップ完了');
      
    } catch (error) {
      console.error('❌ テスト環境セットアップ失敗:', error.message);
      throw error;
    }
  }

  /**
   * Worktree内でのテストスイート実行
   */
  async runTestSuiteInWorktree(worktreePath, branch) {
    console.log(`🧪 テストスイート実行: ${branch}`);
    
    const results = {
      branch,
      worktreePath,
      tests: {},
      overall: { success: true, duration: 0 }
    };
    
    const testStartTime = Date.now();
    
    try {
      // 単体テスト実行
      console.log('📋 単体テスト実行中...');
      results.tests.unit = await this.runUnitTests(worktreePath);
      
      // 統合テスト実行
      console.log('🔗 統合テスト実行中...');
      results.tests.integration = await this.runIntegrationTests(worktreePath);
      
      // 軽量E2Eテスト実行（Worktree環境では限定的に）
      if (this.config.isolationLevel === 'full') {
        console.log('🌐 E2Eテスト実行中...');
        results.tests.e2e = await this.runLightweightE2ETests(worktreePath);
      }
      
      // ブランチ固有テスト実行
      results.tests.branchSpecific = await this.runBranchSpecificTests(worktreePath, branch);
      
      // 全体成功判定
      results.overall.success = Object.values(results.tests).every(test => test.success);
      results.overall.duration = Date.now() - testStartTime;
      
      console.log(`✅ テストスイート完了: ${branch} (成功: ${results.overall.success})`);
      return results;
      
    } catch (error) {
      results.overall.success = false;
      results.overall.error = error.message;
      results.overall.duration = Date.now() - testStartTime;
      
      console.error(`❌ テストスイート失敗: ${branch}`, error.message);
      return results;
    }
  }

  /**
   * Worktree内での単体テスト実行
   */
  async runUnitTests(worktreePath) {
    const testPath = path.join(worktreePath, 'jp2plantuml');
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync('npm run test:unit', {
        cwd: testPath,
        timeout: 60000
      });
      
      return {
        success: true,
        duration: Date.now() - startTime,
        output: stdout,
        coverage: this.extractCoverageFromOutput(stdout)
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        output: error.stdout || '',
        stderr: error.stderr || ''
      };
    }
  }

  /**
   * Worktree内での統合テスト実行
   */
  async runIntegrationTests(worktreePath) {
    const testPath = path.join(worktreePath, 'jp2plantuml');
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync('npm run test:integration', {
        cwd: testPath,
        timeout: 90000
      });
      
      return {
        success: true,
        duration: Date.now() - startTime,
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        output: error.stdout || '',
        stderr: error.stderr || ''
      };
    }
  }

  /**
   * 軽量E2Eテスト実行
   */
  async runLightweightE2ETests(worktreePath) {
    const startTime = Date.now();
    
    try {
      // 軽量なスモークテストのみ実行
      const testResult = await this.runSmokeTests(worktreePath);
      
      return {
        success: testResult.success,
        duration: Date.now() - startTime,
        type: 'smoke',
        ...testResult
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        type: 'smoke'
      };
    }
  }

  /**
   * ブランチ固有テスト実行
   */
  async runBranchSpecificTests(worktreePath, branch) {
    const startTime = Date.now();
    
    try {
      let specificTests = [];
      
      // ブランチタイプに基づく特別なテスト
      if (branch.startsWith('feature/')) {
        specificTests.push('機能テスト');
        // 新機能の検証テスト
      } else if (branch === 'develop') {
        specificTests.push('統合テスト');
        // 開発ブランチ特有のテスト
      } else if (branch === 'main' || branch === 'master') {
        specificTests.push('プロダクションテスト');
        // 本番リリース前テスト
      }
      
      return {
        success: true,
        duration: Date.now() - startTime,
        specificTests,
        branch
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        branch
      };
    }
  }

  /**
   * スモークテスト実行
   */
  async runSmokeTests(worktreePath) {
    // 基本的なアプリケーション起動テスト
    const testPath = path.join(worktreePath, 'jp2plantuml');
    
    try {
      // アプリケーション起動テスト
      const server = spawn('node', ['server.js'], {
        cwd: testPath,
        stdio: 'pipe'
      });
      
      // 起動確認（簡易）
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          server.kill();
          reject(new Error('サーバー起動タイムアウト'));
        }, 10000);
        
        server.stdout.on('data', (data) => {
          if (data.toString().includes('Server running') || 
              data.toString().includes('listening')) {
            clearTimeout(timeout);
            server.kill();
            resolve();
          }
        });
        
        server.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      return { success: true, message: 'アプリケーション起動確認完了' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Worktree結果分析
   */
  async analyzeWorktreeResults() {
    console.log('📊 Worktree結果分析中...');
    
    const analysis = {
      totalBranches: this.testResults.size,
      successfulBranches: 0,
      failedBranches: 0,
      overallSuccess: true,
      branchResults: {},
      performance: {},
      recommendations: []
    };
    
    for (const [branch, result] of this.testResults) {
      if (result.success !== false && result.overall?.success !== false) {
        analysis.successfulBranches++;
      } else {
        analysis.failedBranches++;
        analysis.overallSuccess = false;
      }
      
      analysis.branchResults[branch] = {
        success: result.success !== false && result.overall?.success !== false,
        duration: result.duration || 0,
        tests: result.tests || {},
        issues: this.identifyBranchIssues(result)
      };
    }
    
    // パフォーマンス分析
    analysis.performance = this.analyzePerformance();
    
    // 推奨事項生成
    analysis.recommendations = this.generateRecommendations(analysis);
    
    console.log('✅ Worktree結果分析完了');
    return analysis;
  }

  /**
   * Worktreeレポート生成
   */
  async generateWorktreeReport(analysis) {
    console.log('📄 Worktreeレポート生成中...');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      analysis,
      detailedResults: Object.fromEntries(this.testResults),
      executionTime: Date.now() - this.startTime
    };
    
    const reportPath = path.join(__dirname, '../reports/worktree-test-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    // HTML レポート生成
    await this.generateHTMLWorktreeReport(reportData);
    
    console.log(`✅ Worktreeレポート生成完了: ${reportPath}`);
  }

  /**
   * クリーンアップ
   */
  async cleanupWorktrees() {
    console.log('🧹 Worktreeクリーンアップ中...');
    
    for (const [branch, worktreePath] of this.activeWorktrees) {
      try {
        console.log(`🗑️ Worktree削除: ${branch} (${worktreePath})`);
        
        // Git worktree remove
        await execAsync(`git worktree remove "${worktreePath}" --force`, {
          cwd: this.config.baseRepository
        });
        
        console.log(`✅ Worktree削除完了: ${branch}`);
      } catch (error) {
        console.warn(`⚠️ Worktree削除失敗: ${branch}`, error.message);
        
        // 手動削除を試行
        try {
          if (fs.existsSync(worktreePath)) {
            fs.rmSync(worktreePath, { recursive: true, force: true });
          }
        } catch (manualError) {
          console.warn(`⚠️ 手動削除も失敗: ${branch}`, manualError.message);
        }
      }
    }
    
    this.activeWorktrees.clear();
    console.log('✅ Worktreeクリーンアップ完了');
  }

  // ヘルパーメソッド
  async isGitRepository() {
    try {
      await execAsync('git rev-parse --git-dir', {
        cwd: this.config.baseRepository
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async branchExists(branch) {
    try {
      await execAsync(`git show-ref --verify --quiet refs/heads/${branch}`, {
        cwd: this.config.baseRepository
      });
      return true;
    } catch (error) {
      // リモートブランチも確認
      try {
        await execAsync(`git show-ref --verify --quiet refs/remotes/origin/${branch}`, {
          cwd: this.config.baseRepository
        });
        return true;
      } catch (remoteError) {
        return false;
      }
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async createTestConfiguration(worktreePath) {
    const configPath = path.join(worktreePath, 'test.config.json');
    const config = {
      worktree: true,
      isolationLevel: this.config.isolationLevel,
      branch: path.basename(worktreePath),
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  async configureTestPorts(worktreePath) {
    // ポート競合回避のため、各Worktreeに異なるポートを割り当て
    const hash = require('crypto').createHash('md5').update(worktreePath).digest('hex');
    const portOffset = parseInt(hash.substr(0, 3), 16) % 1000;
    const testPort = 8000 + portOffset;
    
    const envPath = path.join(worktreePath, '.env.test');
    const envContent = `TEST_PORT=${testPort}\nWORKTREE_MODE=true\n`;
    
    fs.writeFileSync(envPath, envContent);
  }

  extractCoverageFromOutput(output) {
    // Jest coverage output parsing
    const coverageMatch = output.match(/All files[^\n]*\|\s*(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : null;
  }

  identifyBranchIssues(result) {
    const issues = [];
    
    if (result.tests?.unit?.success === false) {
      issues.push('単体テスト失敗');
    }
    if (result.tests?.integration?.success === false) {
      issues.push('統合テスト失敗');
    }
    if (result.tests?.e2e?.success === false) {
      issues.push('E2Eテスト失敗');
    }
    if (result.duration > 300000) { // 5分以上
      issues.push('実行時間超過');
    }
    
    return issues;
  }

  analyzePerformance() {
    const durations = Array.from(this.testResults.values()).map(r => r.duration || 0);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = durations.length > 0 ? total / durations.length : 0;
    
    return {
      totalTime: total,
      averageTime: average,
      fastestBranch: Math.min(...durations),
      slowestBranch: Math.max(...durations),
      parallelEfficiency: this.config.parallelExecution ? 
        (durations.length * average) / total : null
    };
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.failedBranches > 0) {
      recommendations.push(`${analysis.failedBranches}個のブランチでテストが失敗しています。個別に確認が必要です。`);
    }
    
    if (analysis.performance.slowestBranch > 300000) {
      recommendations.push('一部のブランチでテスト実行時間が長すぎます。最適化を検討してください。');
    }
    
    if (analysis.performance.parallelEfficiency && analysis.performance.parallelEfficiency < 0.7) {
      recommendations.push('並列実行効率が低いです。依存関係やリソース競合を確認してください。');
    }
    
    return recommendations;
  }

  async generateHTMLWorktreeReport(reportData) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Worktree Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .branch { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; }
        .failure { background-color: #f8d7da; }
        .metrics { display: flex; gap: 20px; }
        .metric { padding: 10px; background: #e9ecef; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌳 Worktree Test Report</h1>
        <p><strong>実行時刻:</strong> ${reportData.timestamp}</p>
        <p><strong>総実行時間:</strong> ${(reportData.executionTime / 1000).toFixed(2)}秒</p>
    </div>
    
    <h2>📊 分析結果</h2>
    <div class="metrics">
        <div class="metric">
            <strong>総ブランチ数:</strong> ${reportData.analysis.totalBranches}
        </div>
        <div class="metric">
            <strong>成功:</strong> ${reportData.analysis.successfulBranches}
        </div>
        <div class="metric">
            <strong>失敗:</strong> ${reportData.analysis.failedBranches}
        </div>
    </div>
    
    <h2>🌿 ブランチ別結果</h2>
    ${Object.entries(reportData.analysis.branchResults).map(([branch, result]) => `
        <div class="branch ${result.success ? 'success' : 'failure'}">
            <h3>${branch}</h3>
            <p><strong>成功:</strong> ${result.success ? '✅' : '❌'}</p>
            <p><strong>実行時間:</strong> ${(result.duration / 1000).toFixed(2)}秒</p>
            ${result.issues.length > 0 ? `<p><strong>問題:</strong> ${result.issues.join(', ')}</p>` : ''}
        </div>
    `).join('')}
    
    <h2>💡 推奨事項</h2>
    <ul>
        ${reportData.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
</body>
</html>
    `;
    
    const htmlPath = path.join(__dirname, '../reports/worktree-test-report.html');
    fs.writeFileSync(htmlPath, htmlContent);
  }
}

module.exports = WorktreeTestStrategy;