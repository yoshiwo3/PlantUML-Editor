/**
 * パフォーマンステスト環境セットアップ
 * パフォーマンス測定とベンチマーク用の環境初期化
 * @version 1.0.0
 */

const { performance, PerformanceObserver } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

/**
 * パフォーマンステストセットアップ処理
 */
beforeAll(async () => {
  console.log('⚡ パフォーマンステスト環境セットアップ開始...');
  
  // タイムアウトを大幅に延長（パフォーマンステストは時間がかかる）
  jest.setTimeout(120000); // 2分
  
  // 1. 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.TEST_TYPE = 'performance';
  process.env.PERFORMANCE_MODE = 'true';
  
  // 2. パフォーマンス監視の開始
  setupPerformanceMonitoring();
  
  // 3. システム情報の記録
  recordSystemInfo();
  
  // 4. ベースライン測定の実行
  await measureBaseline();
  
  // 5. ガベージコレクションの設定
  setupGarbageCollection();
  
  console.log('✅ パフォーマンステスト環境セットアップ完了');
}, 180000); // 3分のタイムアウト

/**
 * パフォーマンステストクリーンアップ処理
 */
afterAll(async () => {
  console.log('📊 パフォーマンステスト結果集計開始...');
  
  // 1. パフォーマンスデータの集計
  await aggregatePerformanceData();
  
  // 2. レポート生成
  await generatePerformanceReport();
  
  // 3. リソースのクリーンアップ
  cleanupPerformanceResources();
  
  console.log('✅ パフォーマンステスト完了');
});

/**
 * 各テスト前の共通処理
 */
beforeEach(async () => {
  // ガベージコレクションの実行
  if (global.gc) {
    global.gc();
  }
  
  // ベースラインメモリ使用量の記録
  global.__PERF_TEST_START__ = {
    time: process.hrtime.bigint(),
    memory: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };
  
  // パフォーマンスマークの設定
  performance.mark(`test-start-${expect.getState().currentTestName || 'unknown'}`);
});

/**
 * 各テスト後の共通処理
 */
afterEach(async () => {
  const testName = expect.getState().currentTestName || 'unknown';
  
  // パフォーマンスマークの終了
  performance.mark(`test-end-${testName}`);
  performance.measure(`test-duration-${testName}`, `test-start-${testName}`, `test-end-${testName}`);
  
  // パフォーマンスデータの記録
  if (global.__PERF_TEST_START__) {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const endCpuUsage = process.cpuUsage(global.__PERF_TEST_START__.cpuUsage);
    
    const metrics = {
      testName,
      duration: Number(endTime - global.__PERF_TEST_START__.time) / 1000000, // ms
      memory: {
        start: global.__PERF_TEST_START__.memory,
        end: endMemory,
        diff: {
          heapUsed: (endMemory.heapUsed - global.__PERF_TEST_START__.memory.heapUsed) / 1024 / 1024,
          heapTotal: (endMemory.heapTotal - global.__PERF_TEST_START__.memory.heapTotal) / 1024 / 1024,
          external: (endMemory.external - global.__PERF_TEST_START__.memory.external) / 1024 / 1024
        }
      },
      cpu: {
        user: endCpuUsage.user / 1000, // microseconds to milliseconds
        system: endCpuUsage.system / 1000
      }
    };
    
    // パフォーマンスデータを保存
    global.__PERFORMANCE_METRICS__ = global.__PERFORMANCE_METRICS__ || [];
    global.__PERFORMANCE_METRICS__.push(metrics);
    
    // 閾値チェック
    checkPerformanceThresholds(metrics);
  }
});

/**
 * パフォーマンス監視の設定
 */
function setupPerformanceMonitoring() {
  global.__PERFORMANCE_OBSERVER__ = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    global.__PERFORMANCE_ENTRIES__ = global.__PERFORMANCE_ENTRIES__ || [];
    global.__PERFORMANCE_ENTRIES__.push(...entries);
  });
  
  global.__PERFORMANCE_OBSERVER__.observe({ entryTypes: ['measure', 'mark'] });
  
  console.log('✓ パフォーマンス監視開始');
}

/**
 * システム情報の記録
 */
function recordSystemInfo() {
  global.__SYSTEM_INFO__ = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: require('os').cpus().length,
    totalMemory: require('os').totalmem() / 1024 / 1024 / 1024, // GB
    freeMemory: require('os').freemem() / 1024 / 1024 / 1024, // GB
    loadAverage: require('os').loadavg(),
    timestamp: new Date().toISOString()
  };
  
  console.log('✓ システム情報記録:', {
    Node: global.__SYSTEM_INFO__.node,
    Platform: global.__SYSTEM_INFO__.platform,
    CPUs: global.__SYSTEM_INFO__.cpus,
    Memory: `${global.__SYSTEM_INFO__.totalMemory.toFixed(1)}GB`
  });
}

/**
 * ベースライン測定の実行
 */
async function measureBaseline() {
  console.log('📏 ベースライン測定実行中...');
  
  const iterations = 10;
  const baselineResults = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    // 軽量な操作でベースライン測定
    await new Promise(resolve => {
      const data = JSON.stringify({ test: 'baseline', iteration: i });
      const parsed = JSON.parse(data);
      setTimeout(resolve, 10);
    });
    
    const end = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    baselineResults.push({
      duration: Number(end - start) / 1000000, // ms
      memoryDiff: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024 // MB
    });
  }
  
  global.__BASELINE_METRICS__ = {
    averageDuration: baselineResults.reduce((sum, r) => sum + r.duration, 0) / iterations,
    averageMemory: baselineResults.reduce((sum, r) => sum + r.memoryDiff, 0) / iterations,
    minDuration: Math.min(...baselineResults.map(r => r.duration)),
    maxDuration: Math.max(...baselineResults.map(r => r.duration))
  };
  
  console.log('✓ ベースライン測定完了:', {
    avgDuration: `${global.__BASELINE_METRICS__.averageDuration.toFixed(2)}ms`,
    avgMemory: `${global.__BASELINE_METRICS__.averageMemory.toFixed(2)}MB`
  });
}

/**
 * ガベージコレクションの設定
 */
function setupGarbageCollection() {
  // V8フラグでガベージコレクションを有効化する必要がある
  // --expose-gc フラグが必要
  
  if (global.gc) {
    console.log('✓ ガベージコレクション利用可能');
    
    // 定期的なガベージコレクション実行の設定
    global.__GC_INTERVAL__ = setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, 30000); // 30秒間隔
    
  } else {
    console.warn('⚠ ガベージコレクション利用不可（--expose-gc フラグが必要）');
  }
}

/**
 * パフォーマンス閾値のチェック
 */
function checkPerformanceThresholds(metrics) {
  const thresholds = {
    maxDuration: 10000, // 10秒
    maxMemoryIncrease: 100, // 100MB
    maxCpuTime: 5000 // 5秒
  };
  
  const warnings = [];
  
  if (metrics.duration > thresholds.maxDuration) {
    warnings.push(`実行時間超過: ${metrics.duration.toFixed(2)}ms > ${thresholds.maxDuration}ms`);
  }
  
  if (metrics.memory.diff.heapUsed > thresholds.maxMemoryIncrease) {
    warnings.push(`メモリ使用量超過: ${metrics.memory.diff.heapUsed.toFixed(2)}MB > ${thresholds.maxMemoryIncrease}MB`);
  }
  
  const totalCpuTime = metrics.cpu.user + metrics.cpu.system;
  if (totalCpuTime > thresholds.maxCpuTime) {
    warnings.push(`CPU時間超過: ${totalCpuTime.toFixed(2)}ms > ${thresholds.maxCpuTime}ms`);
  }
  
  if (warnings.length > 0) {
    console.warn(`⚠ パフォーマンス警告 [${metrics.testName}]:`, warnings);
  }
}

/**
 * パフォーマンスデータの集計
 */
async function aggregatePerformanceData() {
  const metrics = global.__PERFORMANCE_METRICS__ || [];
  const entries = global.__PERFORMANCE_ENTRIES__ || [];
  
  if (metrics.length === 0) {
    console.log('パフォーマンスデータがありません');
    return;
  }
  
  // 統計の計算
  const aggregated = {
    totalTests: metrics.length,
    totalDuration: metrics.reduce((sum, m) => sum + m.duration, 0),
    averageDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
    maxDuration: Math.max(...metrics.map(m => m.duration)),
    minDuration: Math.min(...metrics.map(m => m.duration)),
    
    totalMemoryIncrease: metrics.reduce((sum, m) => sum + m.memory.diff.heapUsed, 0),
    averageMemoryIncrease: metrics.reduce((sum, m) => sum + m.memory.diff.heapUsed, 0) / metrics.length,
    maxMemoryIncrease: Math.max(...metrics.map(m => m.memory.diff.heapUsed)),
    
    totalCpuTime: metrics.reduce((sum, m) => sum + m.cpu.user + m.cpu.system, 0),
    averageCpuTime: metrics.reduce((sum, m) => sum + m.cpu.user + m.cpu.system, 0) / metrics.length
  };
  
  global.__AGGREGATED_PERFORMANCE__ = aggregated;
  
  console.log('📊 パフォーマンスデータ集計完了:', {
    テスト数: aggregated.totalTests,
    平均実行時間: `${aggregated.averageDuration.toFixed(2)}ms`,
    平均メモリ増加: `${aggregated.averageMemoryIncrease.toFixed(2)}MB`,
    平均CPU時間: `${aggregated.averageCpuTime.toFixed(2)}ms`
  });
}

/**
 * パフォーマンスレポートの生成
 */
async function generatePerformanceReport() {
  const reportDir = path.join(process.cwd(), 'test-results', 'performance');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportData = {
    timestamp: new Date().toISOString(),
    systemInfo: global.__SYSTEM_INFO__,
    baseline: global.__BASELINE_METRICS__,
    aggregated: global.__AGGREGATED_PERFORMANCE__,
    detailed: global.__PERFORMANCE_METRICS__,
    performanceEntries: global.__PERFORMANCE_ENTRIES__
  };
  
  // JSON レポート
  const jsonReportPath = path.join(reportDir, 'performance-report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
  
  // テキストレポート
  const textReportPath = path.join(reportDir, 'performance-summary.txt');
  const textReport = generateTextReport(reportData);
  fs.writeFileSync(textReportPath, textReport);
  
  console.log('✓ パフォーマンスレポート生成完了:', reportDir);
}

/**
 * テキストレポートの生成
 */
function generateTextReport(data) {
  const { systemInfo, baseline, aggregated } = data;
  
  return `
PlantUML プロジェクト パフォーマンステストレポート
=====================================================

実行日時: ${data.timestamp}

システム情報:
  Node.js: ${systemInfo.node}
  プラットフォーム: ${systemInfo.platform}
  アーキテクチャ: ${systemInfo.arch}
  CPU数: ${systemInfo.cpus}
  総メモリ: ${systemInfo.totalMemory.toFixed(1)}GB
  空きメモリ: ${systemInfo.freeMemory.toFixed(1)}GB

ベースライン測定:
  平均実行時間: ${baseline.averageDuration.toFixed(2)}ms
  最小実行時間: ${baseline.minDuration.toFixed(2)}ms
  最大実行時間: ${baseline.maxDuration.toFixed(2)}ms
  平均メモリ使用量: ${baseline.averageMemory.toFixed(2)}MB

テスト結果サマリー:
  実行テスト数: ${aggregated.totalTests}
  総実行時間: ${aggregated.totalDuration.toFixed(2)}ms
  平均実行時間: ${aggregated.averageDuration.toFixed(2)}ms
  最大実行時間: ${aggregated.maxDuration.toFixed(2)}ms
  最小実行時間: ${aggregated.minDuration.toFixed(2)}ms
  
  総メモリ増加: ${aggregated.totalMemoryIncrease.toFixed(2)}MB
  平均メモリ増加: ${aggregated.averageMemoryIncrease.toFixed(2)}MB
  最大メモリ増加: ${aggregated.maxMemoryIncrease.toFixed(2)}MB
  
  総CPU時間: ${aggregated.totalCpuTime.toFixed(2)}ms
  平均CPU時間: ${aggregated.averageCpuTime.toFixed(2)}ms

詳細データ: performance-report.json を参照
`;
}

/**
 * リソースのクリーンアップ
 */
function cleanupPerformanceResources() {
  // パフォーマンス監視の停止
  if (global.__PERFORMANCE_OBSERVER__) {
    global.__PERFORMANCE_OBSERVER__.disconnect();
  }
  
  // 定期的なガベージコレクションの停止
  if (global.__GC_INTERVAL__) {
    clearInterval(global.__GC_INTERVAL__);
  }
  
  // 最終ガベージコレクション
  if (global.gc) {
    global.gc();
  }
  
  console.log('✓ パフォーマンステストリソースクリーンアップ完了');
}

/**
 * パフォーマンステスト用のヘルパー関数
 */
global.performanceHelpers = {
  /**
   * 関数の実行時間を測定
   */
  async measureFunction(fn, iterations = 1) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      const startMemory = process.memoryUsage();
      
      const result = await fn();
      
      const end = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      results.push({
        result,
        duration: Number(end - start) / 1000000, // ms
        memoryDiff: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024 // MB
      });
    }
    
    return {
      results,
      average: {
        duration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        memory: results.reduce((sum, r) => sum + r.memoryDiff, 0) / results.length
      },
      min: {
        duration: Math.min(...results.map(r => r.duration)),
        memory: Math.min(...results.map(r => r.memoryDiff))
      },
      max: {
        duration: Math.max(...results.map(r => r.duration)),
        memory: Math.max(...results.map(r => r.memoryDiff))
      }
    };
  },
  
  /**
   * CPU集約的処理の負荷テスト
   */
  async cpuLoadTest(duration = 1000) {
    const endTime = Date.now() + duration;
    let operations = 0;
    
    while (Date.now() < endTime) {
      // 軽量なCPU処理
      Math.sqrt(Math.random() * 1000000);
      operations++;
    }
    
    return {
      operations,
      operationsPerSecond: operations / (duration / 1000)
    };
  },
  
  /**
   * メモリ負荷テスト
   */
  async memoryLoadTest(sizeInMB = 10) {
    const arraySize = (sizeInMB * 1024 * 1024) / 8; // 8 bytes per number
    const testArray = new Array(arraySize);
    
    const startMemory = process.memoryUsage();
    
    // 配列に値を代入
    for (let i = 0; i < arraySize; i++) {
      testArray[i] = Math.random();
    }
    
    const endMemory = process.memoryUsage();
    
    // メモリ解放
    testArray.length = 0;
    
    return {
      requestedSize: sizeInMB,
      actualIncrease: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024
    };
  }
};

console.log('⚡ パフォーマンステストセットアップ設定完了');