#!/usr/bin/env node
/**
 * パフォーマンステストスクリプト - PlantUMLプロジェクト
 * 
 * このスクリプトは以下の機能を提供します:
 * - API応答時間の測定
 * - 変換処理パフォーマンステスト
 * - 負荷テスト（並行リクエスト）
 * - メモリ使用量監視
 * - パフォーマンスレポート生成
 */

const { performance } = require('perf_hooks');
const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * パフォーマンステストクラス
 */
class PerformanceTester {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:8086';
    this.threshold = parseInt(process.env.PERFORMANCE_THRESHOLD || '5000'); // 5秒
    this.config = this.loadConfig();
    this.results = {
      api: [],
      conversion: [],
      load: [],
      memory: [],
      summary: {}
    };
    this.server = null;
  }

  /**
   * 設定を読み込み
   */
  loadConfig() {
    return {
      threshold: this.threshold,
      baseUrl: this.baseUrl,
      concurrency: parseInt(process.env.PERF_CONCURRENCY || '5'),
      iterations: parseInt(process.env.PERF_ITERATIONS || '100'),
      warmupIterations: parseInt(process.env.PERF_WARMUP || '10'),
      memoryInterval: parseInt(process.env.PERF_MEMORY_INTERVAL || '1000'),
      ci: process.env.CI === 'true',
      debug: process.env.DEBUG === 'true'
    };
  }

  /**
   * メインの実行関数
   */
  async run() {
    try {
      console.log('🚀 パフォーマンステストを開始します...');
      console.log(`🎯 パフォーマンス閾値: ${this.threshold}ms`);
      console.log(`🔧 設定: ${JSON.stringify(this.config, null, 2)}`);
      
      // 1. 環境準備
      await this.prepareEnvironment();
      
      // 2. サーバー起動
      await this.startServer();
      
      // 3. ウォームアップ
      await this.warmup();
      
      // 4. API パフォーマンステスト
      await this.testApiPerformance();
      
      // 5. 変換処理パフォーマンステスト
      await this.testConversionPerformance();
      
      // 6. 負荷テスト
      await this.testLoadPerformance();
      
      // 7. メモリ使用量テスト
      await this.testMemoryUsage();
      
      // 8. 結果分析
      await this.analyzeResults();
      
      // 9. レポート生成
      await this.generateReports();
      
      // 10. 結果表示
      this.displayResults();
      
      // 11. サーバー停止
      await this.stopServer();
      
      const success = this.checkPerformanceThreshold();
      console.log(`\n${success ? '✅' : '❌'} パフォーマンステストが${success ? '成功' : '失敗'}しました`);
      
      return { success, results: this.results };
      
    } catch (error) {
      console.error('🚨 パフォーマンステスト中にエラーが発生しました:', error);
      await this.stopServer();
      throw error;
    }
  }

  /**
   * 環境準備
   */
  async prepareEnvironment() {
    console.log('🔧 パフォーマンステスト環境を準備中...');
    
    // 結果ディレクトリを作成
    const resultsDir = path.join(this.projectRoot, 'test-results', 'performance');
    await fs.mkdir(resultsDir, { recursive: true });
    
    // 必要なモジュールの確認
    try {
      await import('node-fetch');
    } catch (error) {
      console.log('📦 node-fetchをインストール中...');
      execSync('npm install node-fetch', { cwd: this.projectRoot });
    }
    
    console.log('✅ 環境準備完了');
  }

  /**
   * サーバーを起動
   */
  async startServer() {
    console.log('🖥️ テストサーバーを起動中...');
    
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['server.js'], {
        cwd: path.join(this.projectRoot, 'jp2plantuml'),
        stdio: this.config.debug ? 'inherit' : 'pipe',
        env: { 
          ...process.env, 
          NODE_ENV: 'performance',
          PORT: '8086'
        }
      });
      
      let output = '';
      
      if (this.server.stdout) {
        this.server.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes('Server running') || output.includes('localhost:8086')) {
            console.log('✅ テストサーバーが起動しました');
            // サーバーが完全に起動するまで少し待機
            setTimeout(resolve, 2000);
          }
        });
      }
      
      if (this.server.stderr) {
        this.server.stderr.on('data', (data) => {
          output += data.toString();
        });
      }
      
      this.server.on('error', (error) => {
        reject(error);
      });
      
      // タイムアウト処理
      setTimeout(() => {
        reject(new Error('サーバー起動がタイムアウトしました'));
      }, 30000);
    });
  }

  /**
   * サーバーを停止
   */
  async stopServer() {
    if (this.server) {
      console.log('🛑 テストサーバーを停止中...');
      this.server.kill();
      this.server = null;
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ テストサーバーを停止しました');
    }
  }

  /**
   * ウォームアップ
   */
  async warmup() {
    console.log('🔥 ウォームアップを実行中...');
    
    const fetch = (await import('node-fetch')).default;
    
    for (let i = 0; i < this.config.warmupIterations; i++) {
      try {
        await fetch(`${this.baseUrl}/health`);
        if (i % 5 === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        console.warn(`ウォームアップリクエスト ${i + 1} に失敗:`, error.message);
      }
    }
    
    console.log('\n✅ ウォームアップ完了');
  }

  /**
   * API パフォーマンステスト
   */
  async testApiPerformance() {
    console.log('📡 API パフォーマンステストを実行中...');
    
    const fetch = (await import('node-fetch')).default;
    const endpoints = [
      { name: 'ヘルスチェック', path: '/health', method: 'GET' },
      { name: 'ルートページ', path: '/', method: 'GET' },
      { name: '変換API', path: '/api/convert', method: 'POST', body: { text: 'ユーザーがログインします' } }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`  📊 ${endpoint.name}をテスト中...`);
      
      const endpointResults = [];
      
      for (let i = 0; i < this.config.iterations; i++) {
        const startTime = performance.now();
        
        try {
          const options = {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json'
            }
          };
          
          if (endpoint.body) {
            options.body = JSON.stringify(endpoint.body);
          }
          
          const response = await fetch(`${this.baseUrl}${endpoint.path}`, options);
          const endTime = performance.now();
          
          const result = {
            iteration: i + 1,
            responseTime: endTime - startTime,
            status: response.status,
            success: response.ok,
            timestamp: new Date().toISOString()
          };
          
          endpointResults.push(result);
          
          if (i % 20 === 0) {
            process.stdout.write('.');
          }
          
        } catch (error) {
          const endTime = performance.now();
          endpointResults.push({
            iteration: i + 1,
            responseTime: endTime - startTime,
            status: 0,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      this.results.api.push({
        endpoint: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        results: endpointResults,
        stats: this.calculateStats(endpointResults.map(r => r.responseTime))
      });
      
      console.log(`\n    平均応答時間: ${this.results.api[this.results.api.length - 1].stats.average.toFixed(2)}ms`);
    }
    
    console.log('✅ API パフォーマンステスト完了');
  }

  /**
   * 変換処理パフォーマンステスト
   */
  async testConversionPerformance() {
    console.log('🔄 変換処理パフォーマンステストを実行中...');
    
    const fetch = (await import('node-fetch')).default;
    const testCases = [
      {
        name: '単純テキスト',
        text: 'ユーザーがログインします'
      },
      {
        name: '複雑なアクティビティ図',
        text: `開始
タスク1を実行
条件分岐:
  条件Aの場合:
    処理Aを実行
    データベースに保存
  それ以外:
    処理Bを実行
    ファイルに出力
並行処理:
  並行タスク1:
    API呼び出し
    結果を処理
  並行タスク2:
    メール送信
    ログ記録
終了`
      },
      {
        name: 'シーケンス図',
        text: `ユーザー -> システム: ログイン要求
システム -> データベース: 認証情報確認
データベース -> システム: 認証結果
alt 認証成功
  システム -> ユーザー: ログイン成功
  システム -> ログサーバー: ログイン記録
else 認証失敗
  システム -> ユーザー: エラーメッセージ
  システム -> ログサーバー: 失敗記録
end`
      },
      {
        name: '大きなユースケース図',
        text: `(ユーザー登録) as UC1
(ログイン) as UC2
(データ閲覧) as UC3
(データ編集) as UC4
(データ削除) as UC5
(レポート生成) as UC6
(設定変更) as UC7
(ユーザー管理) as UC8

:一般ユーザー: --> UC1
:一般ユーザー: --> UC2
:一般ユーザー: --> UC3
:認証ユーザー: --> UC4
:認証ユーザー: --> UC5
:認証ユーザー: --> UC6
:管理者: --> UC7
:管理者: --> UC8`
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`  🔄 ${testCase.name}をテスト中...`);
      
      const conversionResults = [];
      
      for (let i = 0; i < Math.min(this.config.iterations, 50); i++) {
        const startTime = performance.now();
        
        try {
          const response = await fetch(`${this.baseUrl}/api/convert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: testCase.text })
          });
          
          const result = await response.json();
          const endTime = performance.now();
          
          conversionResults.push({
            iteration: i + 1,
            responseTime: endTime - startTime,
            textLength: testCase.text.length,
            success: response.ok,
            outputLength: result.plantuml ? result.plantuml.length : 0,
            timestamp: new Date().toISOString()
          });
          
          if (i % 10 === 0) {
            process.stdout.write('.');
          }
          
        } catch (error) {
          const endTime = performance.now();
          conversionResults.push({
            iteration: i + 1,
            responseTime: endTime - startTime,
            textLength: testCase.text.length,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      this.results.conversion.push({
        testCase: testCase.name,
        inputLength: testCase.text.length,
        results: conversionResults,
        stats: this.calculateStats(conversionResults.map(r => r.responseTime))
      });
      
      console.log(`\n    平均変換時間: ${this.results.conversion[this.results.conversion.length - 1].stats.average.toFixed(2)}ms`);
    }
    
    console.log('✅ 変換処理パフォーマンステスト完了');
  }

  /**
   * 負荷テスト
   */
  async testLoadPerformance() {
    console.log('⚡ 負荷テストを実行中...');
    
    const fetch = (await import('node-fetch')).default;
    const concurrentRequests = this.config.concurrency;
    const requestsPerWorker = Math.floor(this.config.iterations / concurrentRequests);
    
    console.log(`  並行度: ${concurrentRequests}, ワーカーあたり: ${requestsPerWorker}リクエスト`);
    
    const startTime = performance.now();
    
    // 並行リクエストを実行
    const workers = Array.from({ length: concurrentRequests }, (_, workerId) => 
      this.runLoadWorker(workerId, requestsPerWorker, fetch)
    );
    
    const workerResults = await Promise.allSettled(workers);
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    const allResults = [];
    let successCount = 0;
    let errorCount = 0;
    
    workerResults.forEach((workerResult, index) => {
      if (workerResult.status === 'fulfilled') {
        allResults.push(...workerResult.value.results);
        successCount += workerResult.value.successCount;
        errorCount += workerResult.value.errorCount;
      } else {
        console.warn(`ワーカー ${index} が失敗:`, workerResult.reason.message);
        errorCount += requestsPerWorker;
      }
    });
    
    const totalRequests = successCount + errorCount;
    const throughput = totalRequests / (totalTime / 1000); // requests per second
    
    this.results.load.push({
      concurrency: concurrentRequests,
      totalRequests,
      successCount,
      errorCount,
      totalTime,
      throughput,
      responseTimes: allResults.map(r => r.responseTime),
      stats: this.calculateStats(allResults.map(r => r.responseTime))
    });
    
    console.log(`\n  スループット: ${throughput.toFixed(2)} req/sec`);
    console.log(`  成功率: ${((successCount / totalRequests) * 100).toFixed(2)}%`);
    console.log('✅ 負荷テスト完了');
  }

  /**
   * 負荷テストワーカー
   */
  async runLoadWorker(workerId, requestCount, fetch) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < requestCount; i++) {
      const startTime = performance.now();
      
      try {
        const response = await fetch(`${this.baseUrl}/api/convert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: 'ユーザーがログインします' })
        });
        
        const endTime = performance.now();
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
        
        results.push({
          workerId,
          iteration: i + 1,
          responseTime: endTime - startTime,
          status: response.status,
          success: response.ok,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        const endTime = performance.now();
        errorCount++;
        
        results.push({
          workerId,
          iteration: i + 1,
          responseTime: endTime - startTime,
          status: 0,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return { results, successCount, errorCount };
  }

  /**
   * メモリ使用量テスト
   */
  async testMemoryUsage() {
    console.log('💾 メモリ使用量テストを実行中...');
    
    const memorySnapshots = [];
    const monitoringDuration = 30000; // 30秒
    const interval = this.config.memoryInterval;
    
    const monitoringPromise = new Promise((resolve) => {
      const startTime = Date.now();
      
      const monitor = setInterval(() => {
        const memUsage = process.memoryUsage();
        const systemMem = {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        };
        
        memorySnapshots.push({
          timestamp: new Date().toISOString(),
          elapsedTime: Date.now() - startTime,
          process: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
          },
          system: systemMem
        });
        
        if (Date.now() - startTime >= monitoringDuration) {
          clearInterval(monitor);
          resolve();
        }
      }, interval);
    });
    
    // メモリ監視中に負荷をかける
    const fetch = (await import('node-fetch')).default;
    const loadPromise = this.runMemoryLoadTest(fetch);
    
    await Promise.all([monitoringPromise, loadPromise]);
    
    this.results.memory = {
      snapshots: memorySnapshots,
      stats: this.calculateMemoryStats(memorySnapshots),
      duration: monitoringDuration
    };
    
    console.log(`  最大ヒープ使用量: ${(Math.max(...memorySnapshots.map(s => s.process.heapUsed)) / 1024 / 1024).toFixed(2)} MB`);
    console.log('✅ メモリ使用量テスト完了');
  }

  /**
   * メモリ負荷テスト
   */
  async runMemoryLoadTest(fetch) {
    const requests = 50;
    const promises = [];
    
    for (let i = 0; i < requests; i++) {
      const promise = fetch(`${this.baseUrl}/api/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text: `大きなテキスト`.repeat(100) + `要求${i}`
        })
      }).catch(() => {}); // エラーは無視
      
      promises.push(promise);
      
      // リクエスト間隔を調整
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    await Promise.allSettled(promises);
  }

  /**
   * 統計を計算
   */
  calculateStats(values) {
    if (values.length === 0) return { average: 0, min: 0, max: 0, median: 0, p95: 0, p99: 0 };
    
    const sorted = values.slice().sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      count: values.length
    };
  }

  /**
   * パーセンタイルを計算
   */
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * メモリ統計を計算
   */
  calculateMemoryStats(snapshots) {
    const heapUsed = snapshots.map(s => s.process.heapUsed);
    const rss = snapshots.map(s => s.process.rss);
    
    return {
      heapUsed: this.calculateStats(heapUsed),
      rss: this.calculateStats(rss),
      peakHeap: Math.max(...heapUsed),
      peakRss: Math.max(...rss)
    };
  }

  /**
   * 結果を分析
   */
  async analyzeResults() {
    console.log('📊 パフォーマンス結果を分析中...');
    
    this.results.summary = {
      overallPerformance: 'good', // good, warning, poor
      apiPerformance: this.analyzeApiPerformance(),
      conversionPerformance: this.analyzeConversionPerformance(),
      loadPerformance: this.analyzeLoadPerformance(),
      memoryPerformance: this.analyzeMemoryPerformance(),
      recommendations: []
    };
    
    // 全体的な評価を決定
    const performances = [
      this.results.summary.apiPerformance.status,
      this.results.summary.conversionPerformance.status,
      this.results.summary.loadPerformance.status,
      this.results.summary.memoryPerformance.status
    ];
    
    if (performances.includes('poor')) {
      this.results.summary.overallPerformance = 'poor';
    } else if (performances.includes('warning')) {
      this.results.summary.overallPerformance = 'warning';
    }
    
    // 推奨事項を生成
    this.generateRecommendations();
    
    console.log('✅ 結果分析完了');
  }

  /**
   * API パフォーマンスを分析
   */
  analyzeApiPerformance() {
    const apiResults = this.results.api;
    const averageResponseTimes = apiResults.map(api => api.stats.average);
    const maxResponseTime = Math.max(...averageResponseTimes);
    
    let status = 'good';
    if (maxResponseTime > this.threshold) {
      status = 'poor';
    } else if (maxResponseTime > this.threshold * 0.7) {
      status = 'warning';
    }
    
    return {
      status,
      maxResponseTime,
      averageResponseTime: averageResponseTimes.reduce((a, b) => a + b, 0) / averageResponseTimes.length,
      details: apiResults
    };
  }

  /**
   * 変換パフォーマンスを分析
   */
  analyzeConversionPerformance() {
    const conversionResults = this.results.conversion;
    const averageConversionTimes = conversionResults.map(conv => conv.stats.average);
    const maxConversionTime = Math.max(...averageConversionTimes);
    
    let status = 'good';
    if (maxConversionTime > this.threshold * 2) {
      status = 'poor';
    } else if (maxConversionTime > this.threshold) {
      status = 'warning';
    }
    
    return {
      status,
      maxConversionTime,
      averageConversionTime: averageConversionTimes.reduce((a, b) => a + b, 0) / averageConversionTimes.length,
      details: conversionResults
    };
  }

  /**
   * 負荷パフォーマンスを分析
   */
  analyzeLoadPerformance() {
    const loadResult = this.results.load[0];
    const successRate = (loadResult.successCount / loadResult.totalRequests) * 100;
    const avgResponseTime = loadResult.stats.average;
    
    let status = 'good';
    if (successRate < 95 || avgResponseTime > this.threshold * 2) {
      status = 'poor';
    } else if (successRate < 98 || avgResponseTime > this.threshold) {
      status = 'warning';
    }
    
    return {
      status,
      throughput: loadResult.throughput,
      successRate,
      averageResponseTime: avgResponseTime,
      details: loadResult
    };
  }

  /**
   * メモリパフォーマンスを分析
   */
  analyzeMemoryPerformance() {
    const memoryResult = this.results.memory;
    const peakHeapMB = memoryResult.stats.peakHeap / 1024 / 1024;
    const peakRssMB = memoryResult.stats.peakRss / 1024 / 1024;
    
    let status = 'good';
    if (peakHeapMB > 512 || peakRssMB > 1024) {
      status = 'poor';
    } else if (peakHeapMB > 256 || peakRssMB > 512) {
      status = 'warning';
    }
    
    return {
      status,
      peakHeapMB,
      peakRssMB,
      details: memoryResult
    };
  }

  /**
   * 推奨事項を生成
   */
  generateRecommendations() {
    const recs = this.results.summary.recommendations;
    
    if (this.results.summary.apiPerformance.status !== 'good') {
      recs.push('APIのレスポンス時間を改善するため、データベースクエリの最適化を検討してください。');
    }
    
    if (this.results.summary.conversionPerformance.status !== 'good') {
      recs.push('変換処理の最適化のため、パーサーアルゴリズムの見直しやキャッシュ機能の追加を検討してください。');
    }
    
    if (this.results.summary.loadPerformance.status !== 'good') {
      recs.push('負荷処理能力の向上のため、コネクションプールの調整や並行処理の最適化を検討してください。');
    }
    
    if (this.results.summary.memoryPerformance.status !== 'good') {
      recs.push('メモリ使用量の削減のため、不要なオブジェクトの削除やガベージコレクションの最適化を検討してください。');
    }
    
    if (recs.length === 0) {
      recs.push('全体的なパフォーマンスは良好です。現在の設定を維持してください。');
    }
  }

  /**
   * レポートを生成
   */
  async generateReports() {
    console.log('📋 パフォーマンスレポートを生成中...');
    
    const reportDir = path.join(this.projectRoot, 'test-results', 'performance');
    
    // JSON レポート
    await fs.writeFile(
      path.join(reportDir, 'performance-report.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    // マークダウンレポート
    const markdownReport = this.generateMarkdownReport();
    await fs.writeFile(
      path.join(reportDir, 'performance-report.md'),
      markdownReport
    );
    
    // CSV データ（API結果）
    const csvData = this.generateCSVData();
    await fs.writeFile(
      path.join(reportDir, 'performance-data.csv'),
      csvData
    );
    
    console.log('✅ レポート生成完了');
  }

  /**
   * マークダウンレポートを生成
   */
  generateMarkdownReport() {
    return `# PlantUML パフォーマンステストレポート

## 実行概要

- **実行日時**: ${new Date().toLocaleString('ja-JP')}
- **パフォーマンス閾値**: ${this.threshold}ms
- **テスト対象**: ${this.baseUrl}
- **並行度**: ${this.config.concurrency}
- **反復回数**: ${this.config.iterations}

## 総合評価: ${this.getStatusIcon(this.results.summary.overallPerformance)} ${this.results.summary.overallPerformance.toUpperCase()}

## 詳細結果

### API パフォーマンス ${this.getStatusIcon(this.results.summary.apiPerformance.status)}

| エンドポイント | 平均応答時間 | 最小時間 | 最大時間 | P95 | P99 |
|----------------|--------------|----------|----------|-----|-----|
${this.results.api.map(api => 
  `| ${api.endpoint} | ${api.stats.average.toFixed(2)}ms | ${api.stats.min.toFixed(2)}ms | ${api.stats.max.toFixed(2)}ms | ${api.stats.p95.toFixed(2)}ms | ${api.stats.p99.toFixed(2)}ms |`
).join('\n')}

### 変換処理パフォーマンス ${this.getStatusIcon(this.results.summary.conversionPerformance.status)}

| テストケース | 入力長 | 平均変換時間 | 最小時間 | 最大時間 | P95 | P99 |
|--------------|--------|--------------|----------|----------|-----|-----|
${this.results.conversion.map(conv => 
  `| ${conv.testCase} | ${conv.inputLength} | ${conv.stats.average.toFixed(2)}ms | ${conv.stats.min.toFixed(2)}ms | ${conv.stats.max.toFixed(2)}ms | ${conv.stats.p95.toFixed(2)}ms | ${conv.stats.p99.toFixed(2)}ms |`
).join('\n')}

### 負荷テスト結果 ${this.getStatusIcon(this.results.summary.loadPerformance.status)}

- **並行度**: ${this.results.load[0].concurrency}
- **総リクエスト数**: ${this.results.load[0].totalRequests}
- **成功率**: ${((this.results.load[0].successCount / this.results.load[0].totalRequests) * 100).toFixed(2)}%
- **スループット**: ${this.results.load[0].throughput.toFixed(2)} req/sec
- **平均応答時間**: ${this.results.load[0].stats.average.toFixed(2)}ms
- **95パーセンタイル**: ${this.results.load[0].stats.p95.toFixed(2)}ms

### メモリ使用量 ${this.getStatusIcon(this.results.summary.memoryPerformance.status)}

- **最大ヒープ使用量**: ${(this.results.memory.stats.peakHeap / 1024 / 1024).toFixed(2)} MB
- **最大RSS**: ${(this.results.memory.stats.peakRss / 1024 / 1024).toFixed(2)} MB
- **平均ヒープ使用量**: ${(this.results.memory.stats.heapUsed.average / 1024 / 1024).toFixed(2)} MB

## 推奨事項

${this.results.summary.recommendations.map(rec => `- ${rec}`).join('\n')}

## 結論

${this.getPerformanceConclusion()}

---
*このレポートは自動生成されました: ${new Date().toLocaleString('ja-JP')}*
`;
  }

  /**
   * CSVデータを生成
   */
  generateCSVData() {
    const lines = ['Endpoint,Method,Iteration,ResponseTime,Status,Success,Timestamp'];
    
    this.results.api.forEach(api => {
      api.results.forEach(result => {
        lines.push([
          api.endpoint,
          api.method,
          result.iteration,
          result.responseTime,
          result.status,
          result.success,
          result.timestamp
        ].join(','));
      });
    });
    
    return lines.join('\n');
  }

  /**
   * ステータスアイコンを取得
   */
  getStatusIcon(status) {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  }

  /**
   * パフォーマンス結論を取得
   */
  getPerformanceConclusion() {
    switch (this.results.summary.overallPerformance) {
      case 'good':
        return '✅ アプリケーションのパフォーマンスは優秀です。すべての指標が期待値を満たしています。';
      case 'warning':
        return '⚠️ パフォーマンスに改善の余地があります。上記の推奨事項を検討してください。';
      case 'poor':
        return '❌ パフォーマンスに重大な問題があります。緊急に最適化が必要です。';
      default:
        return '❓ パフォーマンス評価を完了できませんでした。';
    }
  }

  /**
   * パフォーマンス閾値をチェック
   */
  checkPerformanceThreshold() {
    return this.results.summary.overallPerformance !== 'poor';
  }

  /**
   * 結果を表示
   */
  displayResults() {
    console.log('\n📊 パフォーマンステスト結果:');
    console.log('=====================================');
    
    console.log(`総合評価: ${this.getStatusIcon(this.results.summary.overallPerformance)} ${this.results.summary.overallPerformance.toUpperCase()}`);
    
    console.log('\n詳細:');
    console.log(`  API: ${this.getStatusIcon(this.results.summary.apiPerformance.status)} 平均 ${this.results.summary.apiPerformance.averageResponseTime.toFixed(2)}ms`);
    console.log(`  変換: ${this.getStatusIcon(this.results.summary.conversionPerformance.status)} 平均 ${this.results.summary.conversionPerformance.averageConversionTime.toFixed(2)}ms`);
    console.log(`  負荷: ${this.getStatusIcon(this.results.summary.loadPerformance.status)} ${this.results.summary.loadPerformance.throughput.toFixed(2)} req/sec`);
    console.log(`  メモリ: ${this.getStatusIcon(this.results.summary.memoryPerformance.status)} 最大 ${this.results.summary.memoryPerformance.peakHeapMB.toFixed(2)} MB`);
    
    console.log(`\n📁 レポート保存先: ${path.join(this.projectRoot, 'test-results', 'performance')}`);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
PlantUML パフォーマンステストツール

使用方法:
  node scripts/performance-test.js [オプション]

環境変数:
  PERFORMANCE_THRESHOLD    パフォーマンス閾値（ms）(デフォルト: 5000)
  PERF_CONCURRENCY         並行度 (デフォルト: 5)
  PERF_ITERATIONS          反復回数 (デフォルト: 100)
  PERF_WARMUP              ウォームアップ反復回数 (デフォルト: 10)
  PERF_MEMORY_INTERVAL     メモリ監視間隔（ms）(デフォルト: 1000)
  BASE_URL                 テスト対象URL
  CI                       CI環境フラグ
  DEBUG                    デバッグモード

出力ファイル:
  - test-results/performance/performance-report.json  詳細結果
  - test-results/performance/performance-report.md    レポート
  - test-results/performance/performance-data.csv     生データ
    `);
    process.exit(0);
  }
  
  const tester = new PerformanceTester();
  tester.run()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('パフォーマンステストに失敗:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTester;