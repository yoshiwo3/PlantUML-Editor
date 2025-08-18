/**
 * パフォーマンス監視ユーティリティ
 * Sprint2 Performance E2E Tests 統合監視システム
 * 
 * 機能:
 * - 包括的なパフォーマンスメトリクス収集
 * - リアルタイム監視とアラート
 * - ベンチマーク比較と傾向分析
 * - 詳細レポート生成
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableRealTimeMonitoring: true,
      enableMemoryTracking: true,
      enableNetworkTracking: true,
      enableFrameRateTracking: true,
      sampleInterval: 1000, // ms
      alertThresholds: {
        memoryUsage: 100 * 1024 * 1024, // 100MB
        frameRate: 30, // fps
        responseTime: 1000, // ms
        cpuUsage: 70 // %
      },
      ...options
    };
    
    this.metrics = {
      performance: [],
      memory: [],
      network: [],
      frameRate: [],
      webWorker: [],
      virtualScroll: [],
      rendering: [],
      largeData: []
    };
    
    this.benchmarks = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.startTime = null;
    
    this.init();
  }
  
  /**
   * 監視システムを初期化
   */
  init() {
    if (typeof window !== 'undefined') {
      this.setupBrowserMonitoring();
    }
  }
  
  /**
   * ブラウザ環境での監視を設定
   */
  setupBrowserMonitoring() {
    // Performance Observer を設定
    if (window.PerformanceObserver) {
      this.setupPerformanceObserver();
    }
    
    // Memory monitoring
    if (this.options.enableMemoryTracking && performance.memory) {
      this.setupMemoryMonitoring();
    }
    
    // Frame rate monitoring
    if (this.options.enableFrameRateTracking) {
      this.setupFrameRateMonitoring();
    }
    
    // Network monitoring
    if (this.options.enableNetworkTracking) {
      this.setupNetworkMonitoring();
    }
  }
  
  /**
   * Performance Observer を設定
   */
  setupPerformanceObserver() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordPerformanceEntry(entry);
      }
    });
    
    try {
      observer.observe({ entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint'] });
    } catch (error) {
      console.warn('Performance Observer setup failed:', error);
    }
  }
  
  /**
   * メモリ監視を設定
   */
  setupMemoryMonitoring() {
    if (!this.options.enableMemoryTracking) return;
    
    const collectMemoryData = () => {
      if (!performance.memory) return;
      
      const memoryData = {
        timestamp: Date.now(),
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
      
      this.metrics.memory.push(memoryData);
      
      // メモリアラートチェック
      if (memoryData.used > this.options.alertThresholds.memoryUsage) {
        this.triggerAlert('memory', `High memory usage: ${(memoryData.used / 1024 / 1024).toFixed(2)} MB`);
      }
    };
    
    setInterval(collectMemoryData, this.options.sampleInterval);
  }
  
  /**
   * フレームレート監視を設定
   */
  setupFrameRateMonitoring() {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFrameRate = (currentTime) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) { // 1秒間隔
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        this.metrics.frameRate.push({
          timestamp: currentTime,
          fps,
          frameCount
        });
        
        // フレームレートアラートチェック
        if (fps < this.options.alertThresholds.frameRate) {
          this.triggerAlert('framerate', `Low frame rate: ${fps} FPS`);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFrameRate);
      }
    };
    
    if (this.options.enableFrameRateTracking) {
      requestAnimationFrame(measureFrameRate);
    }
  }
  
  /**
   * ネットワーク監視を設定
   */
  setupNetworkMonitoring() {
    // Resource Timing API を使用
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.recordNetworkEntry(entry);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Network monitoring setup failed:', error);
    }
  }
  
  /**
   * 監視を開始
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.startTime = Date.now();
    console.log('Performance monitoring started');
  }
  
  /**
   * 監視を停止
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }
  
  /**
   * パフォーマンスエントリを記録
   */
  recordPerformanceEntry(entry) {
    const performanceData = {
      timestamp: Date.now(),
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      ...this.extractSpecificMetrics(entry)
    };
    
    this.metrics.performance.push(performanceData);
  }
  
  /**
   * ネットワークエントリを記録
   */
  recordNetworkEntry(entry) {
    const networkData = {
      timestamp: Date.now(),
      name: entry.name,
      duration: entry.duration,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      compressionRatio: entry.encodedBodySize && entry.decodedBodySize ? 
        entry.encodedBodySize / entry.decodedBodySize : 1
    };
    
    this.metrics.network.push(networkData);
  }
  
  /**
   * 特定のメトリクスを抽出
   */
  extractSpecificMetrics(entry) {
    const metrics = {};
    
    switch (entry.entryType) {
      case 'navigation':
        metrics.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
        metrics.loadComplete = entry.loadEventEnd - entry.loadEventStart;
        metrics.domInteractive = entry.domInteractive - entry.domLoading;
        break;
        
      case 'paint':
        metrics.paintType = entry.name;
        metrics.paintTime = entry.startTime;
        break;
        
      case 'largest-contentful-paint':
        metrics.lcpTime = entry.startTime;
        metrics.element = entry.element?.tagName || 'unknown';
        break;
    }
    
    return metrics;
  }
  
  /**
   * WebWorker性能メトリクスを記録
   */
  recordWebWorkerMetrics(operation, metrics) {
    this.metrics.webWorker.push({
      timestamp: Date.now(),
      operation,
      ...metrics
    });
  }
  
  /**
   * 仮想スクロール性能メトリクスを記録
   */
  recordVirtualScrollMetrics(operation, metrics) {
    this.metrics.virtualScroll.push({
      timestamp: Date.now(),
      operation,
      ...metrics
    });
  }
  
  /**
   * レンダリング性能メトリクスを記録
   */
  recordRenderingMetrics(operation, metrics) {
    this.metrics.rendering.push({
      timestamp: Date.now(),
      operation,
      ...metrics
    });
  }
  
  /**
   * 大規模データ処理メトリクスを記録
   */
  recordLargeDataMetrics(operation, metrics) {
    this.metrics.largeData.push({
      timestamp: Date.now(),
      operation,
      ...metrics
    });
  }
  
  /**
   * ベンチマークを設定
   */
  setBenchmark(name, value, unit = 'ms') {
    this.benchmarks.set(name, {
      value,
      unit,
      timestamp: Date.now()
    });
  }
  
  /**
   * ベンチマークと比較
   */
  compareToBenchmark(name, currentValue) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) return null;
    
    const difference = currentValue - benchmark.value;
    const percentChange = ((difference / benchmark.value) * 100);
    
    return {
      benchmark: benchmark.value,
      current: currentValue,
      difference,
      percentChange,
      improvement: difference < 0,
      unit: benchmark.unit
    };
  }
  
  /**
   * アラートをトリガー
   */
  triggerAlert(type, message) {
    const alert = {
      timestamp: Date.now(),
      type,
      message,
      severity: this.determineAlertSeverity(type, message)
    };
    
    this.alerts.push(alert);
    console.warn(`Performance Alert [${type}]:`, message);
  }
  
  /**
   * アラートの重要度を決定
   */
  determineAlertSeverity(type, message) {
    const severityMap = {
      memory: 'high',
      framerate: 'medium',
      network: 'low',
      processing: 'medium'
    };
    
    return severityMap[type] || 'medium';
  }
  
  /**
   * 統計を計算
   */
  calculateStatistics(data, valueKey = 'value') {
    if (!data || data.length === 0) return null;
    
    const values = data.map(item => 
      typeof item === 'object' ? item[valueKey] : item
    ).filter(val => typeof val === 'number' && !isNaN(val));
    
    if (values.length === 0) return null;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: this.calculateStandardDeviation(values, sum / values.length)
    };
  }
  
  /**
   * 標準偏差を計算
   */
  calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }
  
  /**
   * 包括的なレポートを生成
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      monitoringDuration: this.startTime ? Date.now() - this.startTime : 0,
      summary: this.generateSummary(),
      detailed: this.generateDetailedMetrics(),
      alerts: this.alerts,
      benchmarks: Object.fromEntries(this.benchmarks),
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }
  
  /**
   * サマリーを生成
   */
  generateSummary() {
    return {
      totalMetrics: Object.values(this.metrics).reduce((sum, arr) => sum + arr.length, 0),
      memoryPeakUsage: this.getMemoryPeakUsage(),
      averageFrameRate: this.getAverageFrameRate(),
      networkTransferTotal: this.getNetworkTransferTotal(),
      alertCount: this.alerts.length,
      monitoringStatus: this.isMonitoring ? 'active' : 'stopped'
    };
  }
  
  /**
   * 詳細メトリクスを生成
   */
  generateDetailedMetrics() {
    return {
      performance: {
        statistics: this.calculateStatistics(this.metrics.performance, 'duration'),
        entries: this.metrics.performance.slice(-50) // 最新50件
      },
      memory: {
        statistics: this.calculateStatistics(this.metrics.memory, 'used'),
        trend: this.calculateMemoryTrend(),
        entries: this.metrics.memory.slice(-50)
      },
      network: {
        statistics: this.calculateStatistics(this.metrics.network, 'duration'),
        transferStats: this.calculateStatistics(this.metrics.network, 'transferSize'),
        entries: this.metrics.network.slice(-50)
      },
      frameRate: {
        statistics: this.calculateStatistics(this.metrics.frameRate, 'fps'),
        entries: this.metrics.frameRate.slice(-50)
      },
      webWorker: {
        statistics: this.calculateStatistics(this.metrics.webWorker, 'processingTime'),
        entries: this.metrics.webWorker.slice(-20)
      },
      virtualScroll: {
        statistics: this.calculateStatistics(this.metrics.virtualScroll, 'scrollTime'),
        entries: this.metrics.virtualScroll.slice(-20)
      },
      rendering: {
        statistics: this.calculateStatistics(this.metrics.rendering, 'renderTime'),
        entries: this.metrics.rendering.slice(-20)
      },
      largeData: {
        statistics: this.calculateStatistics(this.metrics.largeData, 'processingTime'),
        entries: this.metrics.largeData.slice(-20)
      }
    };
  }
  
  /**
   * メモリピーク使用量を取得
   */
  getMemoryPeakUsage() {
    if (this.metrics.memory.length === 0) return 0;
    return Math.max(...this.metrics.memory.map(m => m.used));
  }
  
  /**
   * 平均フレームレートを取得
   */
  getAverageFrameRate() {
    if (this.metrics.frameRate.length === 0) return 0;
    const totalFps = this.metrics.frameRate.reduce((sum, f) => sum + f.fps, 0);
    return totalFps / this.metrics.frameRate.length;
  }
  
  /**
   * ネットワーク転送総量を取得
   */
  getNetworkTransferTotal() {
    return this.metrics.network.reduce((sum, n) => sum + (n.transferSize || 0), 0);
  }
  
  /**
   * メモリ使用傾向を計算
   */
  calculateMemoryTrend() {
    if (this.metrics.memory.length < 2) return 'insufficient-data';
    
    const first = this.metrics.memory[0];
    const last = this.metrics.memory[this.metrics.memory.length - 1];
    const timeSpan = last.timestamp - first.timestamp;
    const memoryChange = last.used - first.used;
    
    if (timeSpan === 0) return 'no-change';
    
    const changeRate = memoryChange / timeSpan; // bytes/ms
    
    if (changeRate > 1000) return 'increasing-rapidly';
    if (changeRate > 100) return 'increasing';
    if (changeRate > -100) return 'stable';
    if (changeRate > -1000) return 'decreasing';
    return 'decreasing-rapidly';
  }
  
  /**
   * 推奨事項を生成
   */
  generateRecommendations() {
    const recommendations = [];
    
    // メモリ使用量の推奨事項
    const memoryPeak = this.getMemoryPeakUsage();
    if (memoryPeak > 150 * 1024 * 1024) { // 150MB
      recommendations.push({
        category: 'memory',
        priority: 'high',
        message: 'High memory usage detected. Consider implementing memory optimization strategies.',
        value: memoryPeak,
        threshold: 150 * 1024 * 1024
      });
    }
    
    // フレームレートの推奨事項
    const avgFps = this.getAverageFrameRate();
    if (avgFps < 30) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        message: 'Low frame rate detected. Consider optimizing rendering performance.',
        value: avgFps,
        threshold: 30
      });
    }
    
    // ネットワークの推奨事項
    const networkStats = this.calculateStatistics(this.metrics.network, 'transferSize');
    if (networkStats && networkStats.mean > 500 * 1024) { // 500KB
      recommendations.push({
        category: 'network',
        priority: 'medium',
        message: 'Large network transfers detected. Consider implementing compression or optimization.',
        value: networkStats.mean,
        threshold: 500 * 1024
      });
    }
    
    return recommendations;
  }
  
  /**
   * レポートをJSON形式でエクスポート
   */
  exportReport(format = 'json') {
    const report = this.generateReport();
    
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.convertToCSV(report);
      case 'html':
        return this.convertToHTML(report);
      default:
        return report;
    }
  }
  
  /**
   * CSV形式に変換
   */
  convertToCSV(report) {
    // 簡略化されたCSV出力
    let csv = 'Category,Metric,Value,Unit,Timestamp\n';
    
    // パフォーマンスメトリクス
    report.detailed.performance.entries.forEach(entry => {
      csv += `performance,${entry.name},${entry.duration},ms,${entry.timestamp}\n`;
    });
    
    // メモリメトリクス
    report.detailed.memory.entries.forEach(entry => {
      csv += `memory,used,${entry.used},bytes,${entry.timestamp}\n`;
    });
    
    return csv;
  }
  
  /**
   * HTML形式に変換
   */
  convertToHTML(report) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Performance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
          .alert { color: red; font-weight: bold; }
          .recommendation { background: #f0f8ff; padding: 10px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <h1>Performance Monitoring Report</h1>
        <h2>Summary</h2>
        <div class="metric">
          <strong>Peak Memory Usage:</strong> ${(report.summary.memoryPeakUsage / 1024 / 1024).toFixed(2)} MB
        </div>
        <div class="metric">
          <strong>Average Frame Rate:</strong> ${report.summary.averageFrameRate.toFixed(2)} FPS
        </div>
        <div class="metric">
          <strong>Total Network Transfer:</strong> ${(report.summary.networkTransferTotal / 1024).toFixed(2)} KB
        </div>
        
        <h2>Alerts</h2>
        ${report.alerts.map(alert => 
          `<div class="alert">[${alert.type}] ${alert.message}</div>`
        ).join('')}
        
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => 
          `<div class="recommendation"><strong>${rec.category}:</strong> ${rec.message}</div>`
        ).join('')}
      </body>
      </html>
    `;
  }
  
  /**
   * メトリクスをクリア
   */
  clearMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
    this.alerts = [];
    console.log('Performance metrics cleared');
  }
  
  /**
   * 設定を更新
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    console.log('Performance monitor options updated');
  }
}

// ブラウザ環境での使用のためのグローバル化
if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}

// Node.js環境での使用のためのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}

// Playwright テストでの使用のためのデフォルトインスタンス作成関数
function createPerformanceMonitor(options = {}) {
  return new PerformanceMonitor(options);
}

if (typeof window !== 'undefined') {
  window.createPerformanceMonitor = createPerformanceMonitor;
}