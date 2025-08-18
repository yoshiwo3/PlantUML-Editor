#!/usr/bin/env node

/**
 * Performance Gate Check Script
 * CI/CD パフォーマンスゲート検証スクリプト
 * 
 * 機能:
 * - テスト結果の品質ゲート検証
 * - パフォーマンス基準値との比較
 * - CI/CD失敗判定とレポート出力
 */

const fs = require('fs-extra');
const path = require('path');

// パフォーマンス基準値設定
const PERFORMANCE_THRESHOLDS = {
  // WebWorker パフォーマンス基準
  webworker: {
    parallelProcessingTime: 5000, // ms
    messageResponseTime: 50, // ms
    workerPoolInitTime: 1000, // ms
    cpuUsageMax: 50, // %
  },
  
  // 仮想スクロール パフォーマンス基準
  virtualScroll: {
    averageFps: 30, // fps
    scrollLatency: 100, // ms
    memoryEfficiency: 0.5, // 50%以下のDOM要素
    initializationTime: 3000, // ms
  },
  
  // メモリリーク 基準
  memoryLeak: {
    maxMemoryIncrease: 10 * 1024 * 1024, // 10MB
    hourlyLeakRate: 5 * 1024 * 1024, // 5MB/hour
    domNodeGrowth: 1000, // elements
    garbageCollectionEfficiency: 0.8, // 80%
  },
  
  // レンダリング パフォーマンス基準
  rendering: {
    initialRenderTime: 100, // ms
    reRenderTime: 16, // ms
    averageFps: 25, // fps
    frameDropRate: 30, // %
  },
  
  // 大規模データ処理 基準
  largeData: {
    maxProcessingTime: 10000, // ms
    maxPayloadSize: 500 * 1024, // 500KB
    syncLatency: 200, // ms
    compressionEfficiency: 0.7, // 70%
  },
  
  // Core Web Vitals 基準
  coreWebVitals: {
    fcp: 1000, // ms
    lcp: 2500, // ms
    fid: 100, // ms
    cls: 0.1, // score
  },
  
  // 全体システム基準
  system: {
    peakMemoryUsage: 200 * 1024 * 1024, // 200MB
    averageFrameRate: 20, // fps
    networkTransferMax: 1024 * 1024, // 1MB
    testSuccessRate: 0.8, // 80%
  }
};

class PerformanceGateChecker {
  constructor() {
    this.results = {
      passed: true,
      violations: [],
      warnings: [],
      summary: {},
      timestamp: new Date().toISOString()
    };
  }

  async checkPerformanceGates() {
    console.log('🚦 Starting Performance Gate Check...');
    
    try {
      // テスト結果ファイルを読み込み
      const testResults = await this.loadTestResults();
      
      if (!testResults) {
        this.fail('No test results found. Run performance tests first.');
        return this.results;
      }
      
      // 各カテゴリの性能チェック
      await this.checkWebWorkerPerformance(testResults);
      await this.checkVirtualScrollPerformance(testResults);
      await this.checkMemoryLeakPerformance(testResults);
      await this.checkRenderingPerformance(testResults);
      await this.checkLargeDataPerformance(testResults);
      await this.checkSystemPerformance(testResults);
      
      // 最終判定
      this.generateSummary();
      
      console.log(this.results.passed ? '✅ Performance Gate: PASSED' : '❌ Performance Gate: FAILED');
      
      return this.results;
      
    } catch (error) {
      console.error('🔥 Performance Gate Check Error:', error);
      this.fail(`Gate check failed: ${error.message}`);
      return this.results;
    }
  }

  async loadTestResults() {
    const possiblePaths = [
      path.join(process.cwd(), 'test-results/results.json'),
      path.join(process.cwd(), 'playwright-report/results.json'),
      path.join(process.cwd(), 'test-results.json')
    ];
    
    for (const filePath of possiblePaths) {
      if (await fs.pathExists(filePath)) {
        console.log(`📊 Loading test results from: ${filePath}`);
        return await fs.readJson(filePath);
      }
    }
    
    console.warn('⚠️  No test results file found. Expected locations:');
    possiblePaths.forEach(p => console.warn(`   - ${p}`));
    return null;
  }

  async checkWebWorkerPerformance(testResults) {
    console.log('🔧 Checking WebWorker Performance...');
    
    const webWorkerTests = this.findTestsByPattern(testResults, /webworker|WebWorker|WW-\d+/i);
    
    if (webWorkerTests.length === 0) {
      this.warn('WebWorker tests not found in results');
      return;
    }
    
    // 並列処理時間チェック
    const parallelTests = webWorkerTests.filter(t => t.title?.includes('並列') || t.title?.includes('parallel'));
    parallelTests.forEach(test => {
      const duration = test.duration || 0;
      if (duration > PERFORMANCE_THRESHOLDS.webworker.parallelProcessingTime) {
        this.violate(
          'WebWorker Parallel Processing',
          `Parallel processing took ${duration}ms (limit: ${PERFORMANCE_THRESHOLDS.webworker.parallelProcessingTime}ms)`,
          { test: test.title, duration, limit: PERFORMANCE_THRESHOLDS.webworker.parallelProcessingTime }
        );
      }
    });
    
    // メッセージ通信チェック
    const messageTests = webWorkerTests.filter(t => t.title?.includes('メッセージ') || t.title?.includes('message'));
    messageTests.forEach(test => {
      // テスト結果から平均レスポンス時間を抽出（カスタム実装が必要）
      const avgResponseTime = this.extractMetric(test, 'averageResponseTime', 0);
      if (avgResponseTime > PERFORMANCE_THRESHOLDS.webworker.messageResponseTime) {
        this.violate(
          'WebWorker Message Response',
          `Message response time ${avgResponseTime}ms (limit: ${PERFORMANCE_THRESHOLDS.webworker.messageResponseTime}ms)`,
          { test: test.title, avgResponseTime, limit: PERFORMANCE_THRESHOLDS.webworker.messageResponseTime }
        );
      }
    });
  }

  async checkVirtualScrollPerformance(testResults) {
    console.log('📜 Checking Virtual Scroll Performance...');
    
    const virtualScrollTests = this.findTestsByPattern(testResults, /virtual.*scroll|VS-\d+/i);
    
    if (virtualScrollTests.length === 0) {
      this.warn('Virtual Scroll tests not found in results');
      return;
    }
    
    virtualScrollTests.forEach(test => {
      // フレームレートチェック
      const avgFps = this.extractMetric(test, 'averageFPS', 0);
      if (avgFps > 0 && avgFps < PERFORMANCE_THRESHOLDS.virtualScroll.averageFps) {
        this.violate(
          'Virtual Scroll FPS',
          `Average FPS ${avgFps} (minimum: ${PERFORMANCE_THRESHOLDS.virtualScroll.averageFps})`,
          { test: test.title, avgFps, minimum: PERFORMANCE_THRESHOLDS.virtualScroll.averageFps }
        );
      }
      
      // スクロール遅延チェック
      const scrollLatency = this.extractMetric(test, 'scrollLatency', 0);
      if (scrollLatency > PERFORMANCE_THRESHOLDS.virtualScroll.scrollLatency) {
        this.violate(
          'Virtual Scroll Latency',
          `Scroll latency ${scrollLatency}ms (limit: ${PERFORMANCE_THRESHOLDS.virtualScroll.scrollLatency}ms)`,
          { test: test.title, scrollLatency, limit: PERFORMANCE_THRESHOLDS.virtualScroll.scrollLatency }
        );
      }
    });
  }

  async checkMemoryLeakPerformance(testResults) {
    console.log('🧠 Checking Memory Leak Performance...');
    
    const memoryTests = this.findTestsByPattern(testResults, /memory.*leak|ML-\d+/i);
    
    if (memoryTests.length === 0) {
      this.warn('Memory Leak tests not found in results');
      return;
    }
    
    memoryTests.forEach(test => {
      // メモリ増加量チェック
      const memoryIncrease = this.extractMetric(test, 'memoryIncrease', 0);
      if (memoryIncrease > PERFORMANCE_THRESHOLDS.memoryLeak.maxMemoryIncrease) {
        this.violate(
          'Memory Leak Detection',
          `Memory increase ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (limit: ${(PERFORMANCE_THRESHOLDS.memoryLeak.maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB)`,
          { test: test.title, memoryIncrease, limit: PERFORMANCE_THRESHOLDS.memoryLeak.maxMemoryIncrease }
        );
      }
      
      // リーク率チェック
      const leakRate = this.extractMetric(test, 'leakRate', 0);
      if (leakRate > PERFORMANCE_THRESHOLDS.memoryLeak.hourlyLeakRate) {
        this.violate(
          'Memory Leak Rate',
          `Hourly leak rate ${(leakRate / 1024 / 1024).toFixed(2)}MB/hour (limit: ${(PERFORMANCE_THRESHOLDS.memoryLeak.hourlyLeakRate / 1024 / 1024).toFixed(2)}MB/hour)`,
          { test: test.title, leakRate, limit: PERFORMANCE_THRESHOLDS.memoryLeak.hourlyLeakRate }
        );
      }
    });
  }

  async checkRenderingPerformance(testResults) {
    console.log('🎨 Checking Rendering Performance...');
    
    const renderingTests = this.findTestsByPattern(testResults, /rendering|render|RO-\d+/i);
    
    if (renderingTests.length === 0) {
      this.warn('Rendering tests not found in results');
      return;
    }
    
    renderingTests.forEach(test => {
      // 初期レンダリング時間チェック
      if (test.title?.includes('初期') || test.title?.includes('initial')) {
        const renderTime = test.duration || 0;
        if (renderTime > PERFORMANCE_THRESHOLDS.rendering.initialRenderTime) {
          this.violate(
            'Initial Rendering Time',
            `Initial render took ${renderTime}ms (limit: ${PERFORMANCE_THRESHOLDS.rendering.initialRenderTime}ms)`,
            { test: test.title, renderTime, limit: PERFORMANCE_THRESHOLDS.rendering.initialRenderTime }
          );
        }
      }
      
      // フレームレートチェック
      const avgFps = this.extractMetric(test, 'averageFps', 0);
      if (avgFps > 0 && avgFps < PERFORMANCE_THRESHOLDS.rendering.averageFps) {
        this.violate(
          'Rendering FPS',
          `Average FPS ${avgFps} (minimum: ${PERFORMANCE_THRESHOLDS.rendering.averageFps})`,
          { test: test.title, avgFps, minimum: PERFORMANCE_THRESHOLDS.rendering.averageFps }
        );
      }
    });
  }

  async checkLargeDataPerformance(testResults) {
    console.log('📊 Checking Large Data Performance...');
    
    const largeDataTests = this.findTestsByPattern(testResults, /large.*data|LD-\d+/i);
    
    if (largeDataTests.length === 0) {
      this.warn('Large Data tests not found in results');
      return;
    }
    
    largeDataTests.forEach(test => {
      // 処理時間チェック
      const processingTime = test.duration || 0;
      if (processingTime > PERFORMANCE_THRESHOLDS.largeData.maxProcessingTime) {
        this.violate(
          'Large Data Processing Time',
          `Processing took ${processingTime}ms (limit: ${PERFORMANCE_THRESHOLDS.largeData.maxProcessingTime}ms)`,
          { test: test.title, processingTime, limit: PERFORMANCE_THRESHOLDS.largeData.maxProcessingTime }
        );
      }
      
      // ペイロードサイズチェック
      const payloadSize = this.extractMetric(test, 'payloadSize', 0);
      if (payloadSize > PERFORMANCE_THRESHOLDS.largeData.maxPayloadSize) {
        this.violate(
          'Large Data Payload Size',
          `Payload size ${(payloadSize / 1024).toFixed(2)}KB (limit: ${(PERFORMANCE_THRESHOLDS.largeData.maxPayloadSize / 1024).toFixed(2)}KB)`,
          { test: test.title, payloadSize, limit: PERFORMANCE_THRESHOLDS.largeData.maxPayloadSize }
        );
      }
    });
  }

  async checkSystemPerformance(testResults) {
    console.log('⚙️ Checking System Performance...');
    
    // 全体テスト成功率
    const allTests = this.getAllTests(testResults);
    const passedTests = allTests.filter(test => test.status === 'passed' || test.outcome === 'passed');
    const successRate = allTests.length > 0 ? passedTests.length / allTests.length : 0;
    
    if (successRate < PERFORMANCE_THRESHOLDS.system.testSuccessRate) {
      this.violate(
        'Test Success Rate',
        `Success rate ${(successRate * 100).toFixed(1)}% (minimum: ${(PERFORMANCE_THRESHOLDS.system.testSuccessRate * 100).toFixed(1)}%)`,
        { successRate, minimum: PERFORMANCE_THRESHOLDS.system.testSuccessRate, passed: passedTests.length, total: allTests.length }
      );
    }
    
    // システム全体のメトリクス検証
    const systemTests = this.findTestsByPattern(testResults, /comprehensive|system|suite/i);
    systemTests.forEach(test => {
      const peakMemory = this.extractMetric(test, 'peakMemoryUsage', 0);
      if (peakMemory > PERFORMANCE_THRESHOLDS.system.peakMemoryUsage) {
        this.violate(
          'System Peak Memory',
          `Peak memory ${(peakMemory / 1024 / 1024).toFixed(2)}MB (limit: ${(PERFORMANCE_THRESHOLDS.system.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB)`,
          { test: test.title, peakMemory, limit: PERFORMANCE_THRESHOLDS.system.peakMemoryUsage }
        );
      }
    });
  }

  findTestsByPattern(testResults, pattern) {
    const tests = this.getAllTests(testResults);
    return tests.filter(test => {
      const title = test.title || test.name || '';
      return pattern.test(title);
    });
  }

  getAllTests(testResults) {
    if (!testResults) return [];
    
    // Playwright結果形式の処理
    if (testResults.suites) {
      const tests = [];
      const extractTests = (suites) => {
        suites.forEach(suite => {
          if (suite.tests) {
            tests.push(...suite.tests);
          }
          if (suite.suites) {
            extractTests(suite.suites);
          }
        });
      };
      extractTests(testResults.suites);
      return tests;
    }
    
    // その他の形式
    if (Array.isArray(testResults.tests)) {
      return testResults.tests;
    }
    
    if (Array.isArray(testResults)) {
      return testResults;
    }
    
    return [];
  }

  extractMetric(test, metricName, defaultValue) {
    // テスト結果からメトリクスを抽出
    // 実際の実装では、テスト内でsetしたメトリクスを抽出する
    if (test.metadata && test.metadata[metricName] !== undefined) {
      return test.metadata[metricName];
    }
    
    if (test.attachments) {
      // Performance attachments from Playwright
      const perfAttachment = test.attachments.find(a => a.name?.includes('performance'));
      if (perfAttachment && perfAttachment.body) {
        try {
          const perfData = JSON.parse(perfAttachment.body);
          return perfData[metricName] || defaultValue;
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return defaultValue;
  }

  violate(category, message, details = {}) {
    this.results.passed = false;
    this.results.violations.push({
      category,
      message,
      details,
      timestamp: new Date().toISOString()
    });
    console.error(`❌ VIOLATION [${category}]: ${message}`);
  }

  warn(message, details = {}) {
    this.results.warnings.push({
      message,
      details,
      timestamp: new Date().toISOString()
    });
    console.warn(`⚠️  WARNING: ${message}`);
  }

  fail(message) {
    this.results.passed = false;
    this.results.violations.push({
      category: 'System',
      message,
      details: {},
      timestamp: new Date().toISOString()
    });
    console.error(`🔥 FAILURE: ${message}`);
  }

  generateSummary() {
    this.results.summary = {
      totalViolations: this.results.violations.length,
      totalWarnings: this.results.warnings.length,
      passed: this.results.passed,
      categories: this.groupViolationsByCategory(),
      thresholds: PERFORMANCE_THRESHOLDS
    };
  }

  groupViolationsByCategory() {
    const categories = {};
    this.results.violations.forEach(violation => {
      if (!categories[violation.category]) {
        categories[violation.category] = [];
      }
      categories[violation.category].push(violation);
    });
    return categories;
  }

  async saveResults() {
    const outputPath = path.join(process.cwd(), 'performance-gate-results.json');
    await fs.writeJson(outputPath, this.results, { spaces: 2 });
    console.log(`📄 Performance gate results saved to: ${outputPath}`);
  }

  async generateReport() {
    const report = `
# Performance Gate Check Report

**Date**: ${new Date().toISOString()}
**Status**: ${this.results.passed ? '✅ PASSED' : '❌ FAILED'}

## Summary
- **Total Violations**: ${this.results.summary.totalViolations}
- **Total Warnings**: ${this.results.summary.totalWarnings}
- **Overall Result**: ${this.results.passed ? 'PASSED' : 'FAILED'}

## Violations
${this.results.violations.map(v => `
### ${v.category}
- **Message**: ${v.message}
- **Details**: ${JSON.stringify(v.details, null, 2)}
- **Time**: ${v.timestamp}
`).join('\n')}

## Warnings
${this.results.warnings.map(w => `
- ${w.message}
`).join('\n')}

## Thresholds Used
${Object.entries(PERFORMANCE_THRESHOLDS).map(([category, thresholds]) => `
### ${category}
${Object.entries(thresholds).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}
`).join('\n')}
`;

    const reportPath = path.join(process.cwd(), 'performance-gate-report.md');
    await fs.writeFile(reportPath, report);
    console.log(`📋 Performance gate report saved to: ${reportPath}`);
  }
}

// CLI実行
async function main() {
  const checker = new PerformanceGateChecker();
  
  try {
    const results = await checker.checkPerformanceGates();
    await checker.saveResults();
    await checker.generateReport();
    
    // CI/CDでの終了コード設定
    process.exit(results.passed ? 0 : 1);
    
  } catch (error) {
    console.error('🔥 Performance Gate Check Failed:', error);
    process.exit(2);
  }
}

// スクリプトとして直接実行された場合
if (require.main === module) {
  main();
}

module.exports = PerformanceGateChecker;