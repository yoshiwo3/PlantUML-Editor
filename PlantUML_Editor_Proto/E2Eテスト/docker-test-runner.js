/**
 * Docker環境でのE2Eテスト実行ランナー
 * Phase 2計画書に基づく拡張テストの実行
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DockerTestRunner {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:8086';
    this.dockerImage = 'mcr.microsoft.com/playwright:v1.48.0-jammy';
    this.projectRoot = path.resolve(__dirname, '..');
    this.resultsDir = path.join(__dirname, 'test-results');
    this.reportsDir = path.join(__dirname, 'playwright-report');
  }

  /**
   * テスト環境の準備
   */
  async setupTestEnvironment() {
    console.log('🔧 テスト環境を準備中...');

    // 結果ディレクトリの作成
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    console.log('✅ テスト環境準備完了');
  }

  /**
   * アプリケーションサーバーの起動確認
   */
  async checkApplicationServer() {
    console.log('🌐 アプリケーションサーバーの確認中...');
    
    return new Promise((resolve) => {
      const checkServer = () => {
        const http = require('http');
        const url = new URL(this.baseUrl);
        
        const req = http.request({
          hostname: url.hostname,
          port: url.port,
          path: '/',
          method: 'GET',
          timeout: 5000
        }, (res) => {
          if (res.statusCode === 200) {
            console.log('✅ アプリケーションサーバー確認済み');
            resolve(true);
          } else {
            console.log(`⚠️  サーバー応答: ${res.statusCode}`);
            setTimeout(checkServer, 2000);
          }
        });

        req.on('error', (err) => {
          console.log('⏳ サーバー起動待機中...');
          setTimeout(checkServer, 2000);
        });

        req.on('timeout', () => {
          req.destroy();
          setTimeout(checkServer, 2000);
        });

        req.end();
      };

      checkServer();
    });
  }

  /**
   * Dockerコンテナでテストを実行
   */
  async runDockerTests(testSuite = 'all', browser = 'chromium') {
    console.log(`🐳 Docker環境でテスト実行開始: ${testSuite} (${browser})`);

    const dockerArgs = [
      'run',
      '--rm',
      '-v', `${__dirname}:/app/tests`,
      '-v', `${this.resultsDir}:/app/test-results`,
      '-v', `${this.reportsDir}:/app/playwright-report`,
      '--network', 'host',
      '-e', `BASE_URL=${this.baseUrl}`,
      '-e', 'CI=true',
      '--workdir', '/app/tests',
      this.dockerImage
    ];

    // テストスイートに応じてコマンドを調整
    const testCommand = this.buildTestCommand(testSuite, browser);
    dockerArgs.push('sh', '-c', testCommand);

    return new Promise((resolve, reject) => {
      console.log('Docker実行コマンド:', 'docker', dockerArgs.join(' '));
      
      const docker = spawn('docker', dockerArgs, {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      docker.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(output);
      });

      docker.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(output);
      });

      docker.on('close', (code) => {
        const result = {
          exitCode: code,
          stdout,
          stderr,
          timestamp: new Date().toISOString()
        };

        if (code === 0) {
          console.log('✅ Dockerテスト実行完了');
          resolve(result);
        } else {
          console.log(`❌ Dockerテスト実行失敗 (exit code: ${code})`);
          reject(new Error(`Docker test failed with exit code ${code}`));
        }
      });

      docker.on('error', (error) => {
        console.error('Docker実行エラー:', error);
        reject(error);
      });
    });
  }

  /**
   * テストコマンドの構築
   */
  buildTestCommand(testSuite, browser) {
    const baseCommand = 'npm ci && npx playwright install --with-deps';
    
    let testCmd;
    switch (testSuite) {
      case 'critical':
        testCmd = 'npx playwright test critical-path.spec.js critical-path-enhanced.spec.js';
        break;
      case 'enhanced':
        testCmd = 'npx playwright test critical-path-enhanced.spec.js';
        break;
      case 'performance':
        testCmd = 'npx playwright test performance.spec.js';
        break;
      case 'all':
        testCmd = 'npx playwright test';
        break;
      default:
        testCmd = `npx playwright test ${testSuite}`;
    }

    if (browser && browser !== 'all') {
      testCmd += ` --project=${browser}`;
    }

    testCmd += ' --reporter=html,list,json';

    return `${baseCommand} && ${testCmd}`;
  }

  /**
   * ローカル環境でのテスト実行
   */
  async runLocalTests(testSuite = 'enhanced', browser = 'chromium') {
    console.log(`💻 ローカル環境でテスト実行: ${testSuite} (${browser})`);

    const testCommand = this.buildLocalTestCommand(testSuite, browser);
    
    return new Promise((resolve, reject) => {
      console.log('実行コマンド:', testCommand);
      
      exec(testCommand, {
        cwd: __dirname,
        env: {
          ...process.env,
          BASE_URL: this.baseUrl,
          NODE_ENV: 'test'
        }
      }, (error, stdout, stderr) => {
        const result = {
          exitCode: error ? error.code : 0,
          stdout,
          stderr,
          timestamp: new Date().toISOString()
        };

        console.log('STDOUT:', stdout);
        if (stderr) console.error('STDERR:', stderr);

        if (error) {
          console.log(`❌ ローカルテスト実行失敗: ${error.message}`);
          reject(error);
        } else {
          console.log('✅ ローカルテスト実行完了');
          resolve(result);
        }
      });
    });
  }

  /**
   * ローカル用テストコマンドの構築
   */
  buildLocalTestCommand(testSuite, browser) {
    let testCmd;
    switch (testSuite) {
      case 'critical':
        testCmd = 'npx playwright test critical-path.spec.js critical-path-enhanced.spec.js';
        break;
      case 'enhanced':
        testCmd = 'npx playwright test critical-path-enhanced.spec.js';
        break;
      case 'performance':
        testCmd = 'npx playwright test performance.spec.js';
        break;
      case 'all':
        testCmd = 'npx playwright test';
        break;
      default:
        testCmd = `npx playwright test ${testSuite}`;
    }

    if (browser && browser !== 'all') {
      testCmd += ` --project=${browser}`;
    }

    return testCmd;
  }

  /**
   * テスト結果の生成
   */
  async generateTestReport() {
    console.log('📊 テストレポート生成中...');

    const reportData = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        dockerImage: this.dockerImage,
        baseUrl: this.baseUrl
      },
      testSuites: {
        critical: await this.getTestResults('critical-path.spec.js'),
        enhanced: await this.getTestResults('critical-path-enhanced.spec.js'),
        performance: await this.getTestResults('performance.spec.js')
      }
    };

    const reportPath = path.join(this.resultsDir, 'phase2-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`✅ テストレポート生成完了: ${reportPath}`);
    return reportData;
  }

  /**
   * 特定のテストファイルの結果を取得
   */
  async getTestResults(testFile) {
    try {
      const resultsFile = path.join(this.resultsDir, 'results.json');
      if (fs.existsSync(resultsFile)) {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        return results.suites?.filter(suite => suite.file?.includes(testFile)) || [];
      }
    } catch (error) {
      console.warn(`テスト結果ファイルの読み込み失敗: ${error.message}`);
    }
    return [];
  }

  /**
   * メインの実行関数
   */
  async run(options = {}) {
    const {
      mode = 'docker',        // 'docker' または 'local'
      testSuite = 'enhanced',  // 'all', 'critical', 'enhanced', 'performance'
      browser = 'chromium'     // 'chromium', 'firefox', 'webkit', 'edge'
    } = options;

    try {
      await this.setupTestEnvironment();
      await this.checkApplicationServer();

      let result;
      if (mode === 'docker') {
        result = await this.runDockerTests(testSuite, browser);
      } else {
        result = await this.runLocalTests(testSuite, browser);
      }

      const report = await this.generateTestReport();

      console.log('🎉 Phase 2 E2Eテスト実行完了!');
      console.log(`📁 結果ディレクトリ: ${this.resultsDir}`);
      console.log(`📊 レポートディレクトリ: ${this.reportsDir}`);

      return {
        success: true,
        result,
        report
      };
    } catch (error) {
      console.error('❌ テスト実行エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// コマンドライン実行
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'docker';
  const testSuite = args[1] || 'enhanced';
  const browser = args[2] || 'chromium';

  const runner = new DockerTestRunner();
  runner.run({ mode, testSuite, browser })
    .then((result) => {
      if (result.success) {
        console.log('✅ All tests completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Tests failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = DockerTestRunner;