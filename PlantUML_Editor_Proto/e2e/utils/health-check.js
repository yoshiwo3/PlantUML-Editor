/**
 * E2Eテスト環境ヘルスチェックユーティリティ
 * アプリケーション、依存関係、外部サービスの状態確認
 */

import { chromium } from '@playwright/test';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export class HealthChecker {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8086',
      mockServiceUrl: config.mockServiceUrl || 'http://localhost:3001',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      ...config
    };
    
    this.results = {
      overall: 'pending',
      timestamp: new Date().toISOString(),
      checks: {},
      errors: [],
      warnings: []
    };
  }

  /**
   * 包括的ヘルスチェック実行
   */
  async runHealthCheck() {
    console.log('🏥 E2Eテスト環境ヘルスチェック開始...');
    
    try {
      // 各チェックを並列実行
      const checks = await Promise.allSettled([
        this.checkApplicationHealth(),
        this.checkBrowserCompatibility(),
        this.checkMockService(),
        this.checkFileSystem(),
        this.checkNetwork(),
        this.checkSystemResources()
      ]);
      
      // 結果の集約
      this.aggregateResults(checks);
      
      // 総合判定
      this.determineOverallHealth();
      
      // レポート出力
      await this.generateReport();
      
      console.log(`${this.getStatusIcon()} ヘルスチェック完了: ${this.results.overall}`);
      return this.results;
      
    } catch (error) {
      this.results.overall = 'error';
      this.results.errors.push(`ヘルスチェック実行エラー: ${error.message}`);
      console.error('❌ ヘルスチェックエラー:', error);
      throw error;
    }
  }

  /**
   * アプリケーション健全性チェック
   */
  async checkApplicationHealth() {
    const checkName = 'application';
    console.log('📱 アプリケーション健全性チェック...');
    
    try {
      // HTTP接続チェック
      const httpCheck = await this.checkHttpEndpoint(this.config.baseUrl);
      
      // ブラウザでの詳細チェック
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // コンソールエラーの監視
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // ページアクセス
      await page.goto(this.config.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });
      
      // 必須要素の存在確認
      const requiredElements = [
        '#japanese-input',
        '#plantuml-editor',
        '#preview-area'
      ];
      
      const elementChecks = {};
      for (const selector of requiredElements) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          elementChecks[selector] = 'found';
        } catch {
          elementChecks[selector] = 'missing';
        }
      }
      
      // JavaScriptエラーチェック
      const hasJsErrors = consoleErrors.length > 0;
      
      // パフォーマンスメトリクス取得
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return navigation ? {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          load: navigation.loadEventEnd - navigation.loadEventStart
        } : null;
      });
      
      await browser.close();
      
      this.results.checks[checkName] = {
        status: 'healthy',
        http: httpCheck,
        elements: elementChecks,
        consoleErrors: consoleErrors,
        hasJsErrors: hasJsErrors,
        performance: metrics,
        details: 'アプリケーションは正常に動作しています'
      };
      
      // 警告条件のチェック
      if (hasJsErrors) {
        this.results.warnings.push(`コンソールエラーが検出されました: ${consoleErrors.slice(0, 3).join(', ')}`);
      }
      
      const missingElements = Object.entries(elementChecks)
        .filter(([_, status]) => status === 'missing')
        .map(([selector, _]) => selector);
      
      if (missingElements.length > 0) {
        this.results.checks[checkName].status = 'warning';
        this.results.warnings.push(`必須要素が見つかりません: ${missingElements.join(', ')}`);
      }
      
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'error',
        error: error.message,
        details: 'アプリケーションへのアクセスに失敗しました'
      };
      this.results.errors.push(`アプリケーションチェック失敗: ${error.message}`);
    }
  }

  /**
   * ブラウザ互換性チェック
   */
  async checkBrowserCompatibility() {
    const checkName = 'browsers';
    console.log('🌐 ブラウザ互換性チェック...');
    
    const browsers = ['chromium', 'firefox', 'webkit'];
    const results = {};
    
    for (const browserName of browsers) {
      try {
        const { [browserName]: browserType } = await import('@playwright/test');
        const browser = await browserType.launch();
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // 基本的なページアクセステスト
        await page.goto(this.config.baseUrl, { timeout: 10000 });
        
        // ブラウザ固有の機能チェック
        const features = await page.evaluate(() => ({
          svg: !!document.createElementNS,
          canvas: !!document.createElement('canvas').getContext,
          localStorage: !!window.localStorage,
          sessionStorage: !!window.sessionStorage,
          websockets: !!window.WebSocket,
          fetch: !!window.fetch
        }));
        
        await browser.close();
        
        results[browserName] = {
          status: 'available',
          features: features
        };
        
      } catch (error) {
        results[browserName] = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    this.results.checks[checkName] = {
      status: 'healthy',
      browsers: results,
      details: 'ブラウザ互換性チェック完了'
    };
  }

  /**
   * モックサービスチェック
   */
  async checkMockService() {
    const checkName = 'mockService';
    console.log('🎭 モックサービスチェック...');
    
    try {
      const healthCheck = await this.checkHttpEndpoint(`${this.config.mockServiceUrl}/health`);
      
      // 主要エンドポイントのテスト
      const endpoints = [
        '/plantuml/png',
        '/plantuml/svg',
        '/files/save',
        '/auth/login'
      ];
      
      const endpointResults = {};
      for (const endpoint of endpoints) {
        try {
          const result = await this.checkHttpEndpoint(`${this.config.mockServiceUrl}${endpoint}`, {
            method: 'POST',
            timeout: 5000
          });
          endpointResults[endpoint] = result.status < 500 ? 'available' : 'error';
        } catch (error) {
          endpointResults[endpoint] = 'unreachable';
        }
      }
      
      this.results.checks[checkName] = {
        status: 'healthy',
        health: healthCheck,
        endpoints: endpointResults,
        details: 'モックサービスは正常に動作しています'
      };
      
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'warning',
        error: error.message,
        details: 'モックサービスに接続できません（テストは継続可能）'
      };
      this.results.warnings.push('モックサービスが利用できません');
    }
  }

  /**
   * ファイルシステムチェック
   */
  async checkFileSystem() {
    const checkName = 'fileSystem';
    console.log('📁 ファイルシステムチェック...');
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // 必要なディレクトリの存在確認
      const requiredDirs = [
        'test-results',
        'reports',
        'fixtures/data',
        'fixtures/files',
        'auth'
      ];
      
      const dirStatus = {};
      for (const dir of requiredDirs) {
        try {
          await fs.access(dir);
          dirStatus[dir] = 'exists';
        } catch {
          try {
            await fs.mkdir(dir, { recursive: true });
            dirStatus[dir] = 'created';
          } catch (error) {
            dirStatus[dir] = 'error';
          }
        }
      }
      
      // 書き込み権限テスト
      const testFile = 'test-results/health-check-test.txt';
      try {
        await fs.writeFile(testFile, 'test', 'utf8');
        await fs.unlink(testFile);
        var writePermission = true;
      } catch {
        var writePermission = false;
      }
      
      this.results.checks[checkName] = {
        status: 'healthy',
        directories: dirStatus,
        writePermission: writePermission,
        details: 'ファイルシステムは正常にアクセス可能です'
      };
      
      if (!writePermission) {
        this.results.checks[checkName].status = 'warning';
        this.results.warnings.push('ファイル書き込み権限に問題があります');
      }
      
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'error',
        error: error.message,
        details: 'ファイルシステムアクセスに失敗しました'
      };
      this.results.errors.push(`ファイルシステムエラー: ${error.message}`);
    }
  }

  /**
   * ネットワークチェック
   */
  async checkNetwork() {
    const checkName = 'network';
    console.log('🌐 ネットワークチェック...');
    
    try {
      // DNS解決テスト
      const dns = await import('dns').then(m => m.promises);
      await dns.lookup('localhost');
      
      // ポート可用性チェック
      const ports = [8086, 3001, 9090]; // app, mock, prometheus
      const portStatus = {};
      
      for (const port of ports) {
        portStatus[port] = await this.checkPortAvailability(port);
      }
      
      this.results.checks[checkName] = {
        status: 'healthy',
        dns: 'working',
        ports: portStatus,
        details: 'ネットワーク接続は正常です'
      };
      
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'warning',
        error: error.message,
        details: 'ネットワーク設定に問題がある可能性があります'
      };
      this.results.warnings.push(`ネットワーク警告: ${error.message}`);
    }
  }

  /**
   * システムリソースチェック
   */
  async checkSystemResources() {
    const checkName = 'system';
    console.log('💻 システムリソースチェック...');
    
    try {
      const os = await import('os');
      
      const memInfo = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };
      
      const cpuInfo = {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg()
      };
      
      // メモリ使用率チェック
      const memUsagePercent = (memInfo.used / memInfo.total) * 100;
      const memoryStatus = memUsagePercent > 90 ? 'warning' : 'good';
      
      // 利用可能メモリチェック（E2Eテストには最低2GB推奨）
      const availableGB = memInfo.free / (1024 * 1024 * 1024);
      const sufficientMemory = availableGB >= 2;
      
      this.results.checks[checkName] = {
        status: sufficientMemory && memoryStatus === 'good' ? 'healthy' : 'warning',
        memory: {
          total: Math.round(memInfo.total / (1024 * 1024 * 1024) * 100) / 100 + 'GB',
          free: Math.round(memInfo.free / (1024 * 1024 * 1024) * 100) / 100 + 'GB',
          usagePercent: Math.round(memUsagePercent),
          status: memoryStatus,
          sufficient: sufficientMemory
        },
        cpu: cpuInfo,
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        details: 'システムリソースチェック完了'
      };
      
      if (!sufficientMemory) {
        this.results.warnings.push(`利用可能メモリが不足しています: ${availableGB.toFixed(1)}GB (推奨: 2GB以上)`);
      }
      
      if (memoryStatus === 'warning') {
        this.results.warnings.push(`メモリ使用率が高くなっています: ${memUsagePercent.toFixed(1)}%`);
      }
      
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'error',
        error: error.message,
        details: 'システム情報の取得に失敗しました'
      };
      this.results.errors.push(`システムチェックエラー: ${error.message}`);
    }
  }

  /**
   * HTTPエンドポイントチェック
   */
  async checkHttpEndpoint(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        timeout: options.timeout || this.config.timeout,
        headers: options.headers || {}
      };
      
      const req = client.request(requestOptions, (res) => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * ポート可用性チェック
   */
  async checkPortAvailability(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(2000);
      socket.on('connect', () => {
        socket.destroy();
        resolve('in-use');
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve('available');
      });
      
      socket.on('error', () => {
        resolve('available');
      });
      
      socket.connect(port, 'localhost');
    });
  }

  /**
   * 結果の集約
   */
  aggregateResults(checks) {
    const checkNames = ['application', 'browsers', 'mockService', 'fileSystem', 'network', 'system'];
    
    checks.forEach((result, index) => {
      const checkName = checkNames[index];
      if (result.status === 'fulfilled') {
        // チェックが既に設定されていない場合のみ設定
        if (!this.results.checks[checkName]) {
          this.results.checks[checkName] = {
            status: 'completed',
            details: `${checkName} check completed successfully`
          };
        }
      } else {
        this.results.checks[checkName] = {
          status: 'error',
          error: result.reason?.message || 'Unknown error',
          details: `${checkName} check failed`
        };
        this.results.errors.push(`${checkName}: ${result.reason?.message}`);
      }
    });
  }

  /**
   * 総合健全性判定
   */
  determineOverallHealth() {
    const statuses = Object.values(this.results.checks).map(check => check.status);
    
    if (statuses.includes('error')) {
      this.results.overall = 'error';
    } else if (statuses.includes('warning')) {
      this.results.overall = 'warning';
    } else {
      this.results.overall = 'healthy';
    }
  }

  /**
   * ステータスアイコン取得
   */
  getStatusIcon() {
    switch (this.results.overall) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  /**
   * ヘルスレポート生成
   */
  async generateReport() {
    const fs = await import('fs/promises');
    
    const report = {
      ...this.results,
      summary: {
        total: Object.keys(this.results.checks).length,
        healthy: Object.values(this.results.checks).filter(c => c.status === 'healthy').length,
        warning: Object.values(this.results.checks).filter(c => c.status === 'warning').length,
        error: Object.values(this.results.checks).filter(c => c.status === 'error').length
      }
    };
    
    // JSON形式でレポート保存
    await fs.writeFile(
      'test-results/health-check-report.json',
      JSON.stringify(report, null, 2),
      'utf8'
    );
    
    // 人間が読みやすい形式のレポート生成
    const readableReport = this.generateReadableReport(report);
    await fs.writeFile(
      'test-results/health-check-report.md',
      readableReport,
      'utf8'
    );
  }

  /**
   * 読みやすいレポート生成
   */
  generateReadableReport(report) {
    let markdown = `# E2Eテスト環境ヘルスチェックレポート\n\n`;
    markdown += `**実行日時**: ${report.timestamp}\n`;
    markdown += `**総合ステータス**: ${this.getStatusIcon()} ${report.overall.toUpperCase()}\n\n`;
    
    markdown += `## 📊 サマリー\n\n`;
    markdown += `| ステータス | 件数 |\n`;
    markdown += `|-----------|------|\n`;
    markdown += `| 正常 | ${report.summary.healthy} |\n`;
    markdown += `| 警告 | ${report.summary.warning} |\n`;
    markdown += `| エラー | ${report.summary.error} |\n`;
    markdown += `| 合計 | ${report.summary.total} |\n\n`;
    
    if (report.errors.length > 0) {
      markdown += `## ❌ エラー\n\n`;
      report.errors.forEach(error => {
        markdown += `- ${error}\n`;
      });
      markdown += `\n`;
    }
    
    if (report.warnings.length > 0) {
      markdown += `## ⚠️ 警告\n\n`;
      report.warnings.forEach(warning => {
        markdown += `- ${warning}\n`;
      });
      markdown += `\n`;
    }
    
    markdown += `## 🔍 詳細チェック結果\n\n`;
    Object.entries(report.checks).forEach(([name, check]) => {
      const icon = check.status === 'healthy' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      markdown += `### ${icon} ${name}\n`;
      markdown += `**ステータス**: ${check.status}\n`;
      markdown += `**詳細**: ${check.details || 'N/A'}\n`;
      if (check.error) {
        markdown += `**エラー**: ${check.error}\n`;
      }
      markdown += `\n`;
    });
    
    return markdown;
  }
}

// CLI実行サポート
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  checker.runHealthCheck()
    .then((results) => {
      console.log('\n📋 ヘルスチェック結果:');
      console.log(`総合ステータス: ${checker.getStatusIcon()} ${results.overall}`);
      console.log(`詳細レポート: test-results/health-check-report.md`);
      
      process.exit(results.overall === 'error' ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ ヘルスチェック実行エラー:', error);
      process.exit(1);
    });
}

export default HealthChecker;