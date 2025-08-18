/**
 * PerformanceTestFramework - Lighthouse 90+ パフォーマンステストフレームワーク
 * 
 * Sprint3 Hybrid Object Model Framework
 * Web Vitals、Lighthouse、カスタムメトリクス監視を提供
 */

import { BasePage } from '../base/BasePage.js';
import { expect } from '@playwright/test';

export class PerformanceTestFramework {
  constructor(page, context = null) {
    this.page = page;
    this.context = context;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8086';
    
    // パフォーマンス閾値設定
    this.thresholds = {
      lighthouse: {
        performance: 90,
        accessibility: 100,
        bestPractices: 90,
        seo: 90
      },
      webVitals: {
        FCP: 1800,  // First Contentful Paint (ms)
        LCP: 2500,  // Largest Contentful Paint (ms)
        FID: 100,   // First Input Delay (ms)
        CLS: 0.1,   // Cumulative Layout Shift
        TTFB: 800   // Time to First Byte (ms)
      },
      customMetrics: {
        pageLoadTime: 3000,      // ページ読み込み時間 (ms)
        domContentLoaded: 2000,  // DOM読み込み完了 (ms)
        memoryUsage: 100,        // メモリ使用量 (MB)
        domNodes: 5000,          // DOM ノード数
        jsExecutionTime: 1000,   // JavaScript実行時間 (ms)
        imageLoadTime: 2000,     // 画像読み込み時間 (ms)
        apiResponseTime: 500,    // API レスポンス時間 (ms)
        renderTime: 1000,        // レンダリング時間 (ms)
        interactionTime: 200     // インタラクション応答時間 (ms)
      }
    };
    
    // メトリクス収集結果
    this.metrics = {
      lighthouse: {},
      webVitals: {},
      custom: {},
      errors: []
    };
  }

  /**
   * 包括的パフォーマンステスト実行
   */
  async runComprehensivePerformanceTests() {
    console.log('Starting comprehensive performance tests...');
    
    const results = {};
    
    try {
      // Web Vitals 測定
      results.webVitals = await this.measureWebVitals();
      
      // カスタムメトリクス測定
      results.customMetrics = await this.measureCustomMetrics();
      
      // リソース使用量測定
      results.resourceUsage = await this.measureResourceUsage();
      
      // ネットワークパフォーマンス測定
      results.networkPerformance = await this.measureNetworkPerformance();
      
      // JavaScript パフォーマンス測定
      results.javascriptPerformance = await this.measureJavaScriptPerformance();
      
      // レンダリングパフォーマンス測定
      results.renderingPerformance = await this.measureRenderingPerformance();
      
      // インタラクションパフォーマンス測定
      results.interactionPerformance = await this.measureInteractionPerformance();
      
      // メモリリークテスト
      results.memoryLeakTest = await this.runMemoryLeakTest();
      
      // 負荷テスト
      results.loadTest = await this.runLoadTest();
      
      // Lighthouse テスト（可能な場合）
      if (process.env.LIGHTHOUSE_ENABLED === 'true') {
        results.lighthouse = await this.runLighthouseTest();
      }
      
    } catch (error) {
      results.error = {
        message: error.message,
        stack: error.stack
      };
    }
    
    return this.generatePerformanceReport(results);
  }

  /**
   * Web Vitals 測定
   */
  async measureWebVitals() {
    const metrics = {};
    
    try {
      await this.page.goto(this.baseURL, { waitUntil: 'networkidle' });
      
      // Web Vitals 計測スクリプト注入
      await this.page.addScriptTag({
        content: `
          // Web Vitals 計測
          window.__webVitals = {};
          
          // FCP (First Contentful Paint)
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                window.__webVitals.FCP = entry.startTime;
              }
            }
          }).observe({ type: 'paint', buffered: true });
          
          // LCP (Largest Contentful Paint)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            window.__webVitals.LCP = lastEntry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // FID (First Input Delay)
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__webVitals.FID = entry.processingStart - entry.startTime;
            }
          }).observe({ type: 'first-input', buffered: true });
          
          // CLS (Cumulative Layout Shift)
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            window.__webVitals.CLS = clsValue;
          }).observe({ type: 'layout-shift', buffered: true });
          
          // TTFB (Time to First Byte)
          const navTiming = performance.getEntriesByType('navigation')[0];
          if (navTiming) {
            window.__webVitals.TTFB = navTiming.responseStart - navTiming.requestStart;
          }
        `
      });
      
      // メトリクス収集まで待機
      await this.page.waitForTimeout(3000);
      
      // Web Vitals 取得
      const webVitals = await this.page.evaluate(() => window.__webVitals || {});
      
      // 閾値チェック
      Object.entries(webVitals).forEach(([metric, value]) => {
        metrics[metric] = {
          value,
          threshold: this.thresholds.webVitals[metric],
          passed: value <= this.thresholds.webVitals[metric],
          score: this.calculateScore(metric, value)
        };
      });
      
    } catch (error) {
      metrics.error = error.message;
    }
    
    return metrics;
  }

  /**
   * カスタムメトリクス測定
   */
  async measureCustomMetrics() {
    const metrics = {};
    
    try {
      // ページ読み込み時間測定
      const loadStartTime = Date.now();
      await this.page.goto(this.baseURL, { waitUntil: 'load' });
      const pageLoadTime = Date.now() - loadStartTime;
      
      metrics.pageLoadTime = {
        value: pageLoadTime,
        threshold: this.thresholds.customMetrics.pageLoadTime,
        passed: pageLoadTime <= this.thresholds.customMetrics.pageLoadTime
      };
      
      // DOM Content Loaded 時間
      const domMetrics = await this.page.evaluate(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        return navTiming ? {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          domComplete: navTiming.domComplete - navTiming.navigationStart
        } : {};
      });
      
      metrics.domContentLoaded = {
        value: domMetrics.domContentLoaded || 0,
        threshold: this.thresholds.customMetrics.domContentLoaded,
        passed: (domMetrics.domContentLoaded || 0) <= this.thresholds.customMetrics.domContentLoaded
      };
      
      // DOM ノード数
      const domNodes = await this.page.evaluate(() => document.querySelectorAll('*').length);
      metrics.domNodes = {
        value: domNodes,
        threshold: this.thresholds.customMetrics.domNodes,
        passed: domNodes <= this.thresholds.customMetrics.domNodes
      };
      
      // JavaScript 実行時間
      const jsExecutionTime = await this.measureJSExecutionTime();
      metrics.jsExecutionTime = {
        value: jsExecutionTime,
        threshold: this.thresholds.customMetrics.jsExecutionTime,
        passed: jsExecutionTime <= this.thresholds.customMetrics.jsExecutionTime
      };
      
      // レンダリング時間
      const renderTime = await this.measureRenderTime();
      metrics.renderTime = {
        value: renderTime,
        threshold: this.thresholds.customMetrics.renderTime,
        passed: renderTime <= this.thresholds.customMetrics.renderTime
      };
      
    } catch (error) {
      metrics.error = error.message;
    }
    
    return metrics;
  }

  /**
   * JavaScript 実行時間測定
   */
  async measureJSExecutionTime() {
    return await this.page.evaluate(() => {
      const startTime = performance.now();
      
      // JavaScript実行時間測定のためのベンチマーク
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      
      return performance.now() - startTime;
    });
  }

  /**
   * レンダリング時間測定
   */
  async measureRenderTime() {
    const startTime = Date.now();
    
    // 大きな DOM 変更をシミュレート
    await this.page.evaluate(() => {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.textContent = `Test element ${i}`;
        container.appendChild(div);
      }
      
      document.body.appendChild(container);
      
      // 強制リフロー
      container.offsetHeight;
      
      // クリーンアップ
      document.body.removeChild(container);
    });
    
    return Date.now() - startTime;
  }

  /**
   * リソース使用量測定
   */
  async measureResourceUsage() {
    const usage = {};
    
    try {
      // メモリ使用量
      const memoryInfo = await this.page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (memoryInfo) {
        const memoryMB = memoryInfo.used / (1024 * 1024);
        usage.memory = {
          value: memoryMB,
          threshold: this.thresholds.customMetrics.memoryUsage,
          passed: memoryMB <= this.thresholds.customMetrics.memoryUsage,
          details: memoryInfo
        };
      }
      
      // CPU 使用時間（タスク実行時間で近似）
      const cpuStartTime = Date.now();
      await this.page.evaluate(() => {
        // CPU集約的タスクをシミュレート
        const start = performance.now();
        while (performance.now() - start < 100) {
          Math.sqrt(Math.random());
        }
      });
      const cpuTime = Date.now() - cpuStartTime;
      
      usage.cpu = {
        value: cpuTime,
        threshold: 200, // 200ms 閾値
        passed: cpuTime <= 200
      };
      
      // ネットワーク使用量
      const networkMetrics = await this.page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        let totalSize = 0;
        let totalRequests = resources.length;
        
        resources.forEach(resource => {
          if (resource.transferSize) {
            totalSize += resource.transferSize;
          }
        });
        
        return {
          totalSize: totalSize,
          totalRequests: totalRequests,
          averageSize: totalRequests > 0 ? totalSize / totalRequests : 0
        };
      });
      
      usage.network = {
        value: networkMetrics.totalSize,
        requests: networkMetrics.totalRequests,
        averageSize: networkMetrics.averageSize,
        threshold: 5 * 1024 * 1024, // 5MB 閾値
        passed: networkMetrics.totalSize <= 5 * 1024 * 1024
      };
      
    } catch (error) {
      usage.error = error.message;
    }
    
    return usage;
  }

  /**
   * ネットワークパフォーマンス測定
   */
  async measureNetworkPerformance() {
    const network = {};
    
    try {
      await this.page.goto(this.baseURL);
      
      // ネットワークタイミング取得
      const networkTimings = await this.page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const navigation = performance.getEntriesByType('navigation')[0];
        
        const resourceTimings = resources.map(resource => ({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize || 0,
          type: resource.initiatorType
        }));
        
        return {
          navigation: navigation ? {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            ssl: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
            ttfb: navigation.responseStart - navigation.requestStart,
            download: navigation.responseEnd - navigation.responseStart
          } : {},
          resources: resourceTimings
        };
      });
      
      network.navigation = networkTimings.navigation;
      network.resources = networkTimings.resources;
      
      // API レスポンス時間テスト
      if (networkTimings.resources.length > 0) {
        const apiRequests = networkTimings.resources.filter(r => r.name.includes('/api/'));
        if (apiRequests.length > 0) {
          const avgApiTime = apiRequests.reduce((sum, req) => sum + req.duration, 0) / apiRequests.length;
          network.apiResponseTime = {
            value: avgApiTime,
            threshold: this.thresholds.customMetrics.apiResponseTime,
            passed: avgApiTime <= this.thresholds.customMetrics.apiResponseTime
          };
        }
      }
      
      // 画像読み込み時間
      const imageRequests = networkTimings.resources.filter(r => r.type === 'img');
      if (imageRequests.length > 0) {
        const avgImageTime = imageRequests.reduce((sum, req) => sum + req.duration, 0) / imageRequests.length;
        network.imageLoadTime = {
          value: avgImageTime,
          threshold: this.thresholds.customMetrics.imageLoadTime,
          passed: avgImageTime <= this.thresholds.customMetrics.imageLoadTime
        };
      }
      
    } catch (error) {
      network.error = error.message;
    }
    
    return network;
  }

  /**
   * JavaScript パフォーマンス測定
   */
  async measureJavaScriptPerformance() {
    const jsPerformance = {};
    
    try {
      // JavaScript エラー監視
      const jsErrors = [];
      this.page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      // コンソールエラー監視
      const consoleErrors = [];
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await this.page.goto(this.baseURL);
      await this.page.waitForTimeout(2000);
      
      // JavaScript パフォーマンスメトリクス
      const jsMetrics = await this.page.evaluate(() => {
        const marks = performance.getEntriesByType('mark');
        const measures = performance.getEntriesByType('measure');
        
        return {
          marks: marks.map(mark => ({ name: mark.name, startTime: mark.startTime })),
          measures: measures.map(measure => ({ 
            name: measure.name, 
            duration: measure.duration 
          })),
          scriptCount: document.scripts.length,
          eventListenerCount: Object.keys(window).filter(key => key.startsWith('on')).length
        };
      });
      
      jsPerformance.metrics = jsMetrics;
      jsPerformance.errors = jsErrors;
      jsPerformance.consoleErrors = consoleErrors;
      jsPerformance.errorCount = jsErrors.length + consoleErrors.length;
      jsPerformance.passed = jsPerformance.errorCount === 0;
      
    } catch (error) {
      jsPerformance.error = error.message;
    }
    
    return jsPerformance;
  }

  /**
   * レンダリングパフォーマンス測定
   */
  async measureRenderingPerformance() {
    const rendering = {};
    
    try {
      await this.page.goto(this.baseURL);
      
      // フレームレート測定
      const frameRate = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          let frames = 0;
          const startTime = performance.now();
          
          function countFrame() {
            frames++;
            if (performance.now() - startTime < 1000) {
              requestAnimationFrame(countFrame);
            } else {
              resolve(frames);
            }
          }
          
          requestAnimationFrame(countFrame);
        });
      });
      
      rendering.frameRate = {
        value: frameRate,
        threshold: 60,
        passed: frameRate >= 30 // 最低30fpsを期待
      };
      
      // レンダーブロッキングリソース確認
      const blockingResources = await this.page.evaluate(() => {
        const stylesheets = Array.from(document.stylesheets).length;
        const scripts = Array.from(document.scripts).filter(script => 
          !script.async && !script.defer
        ).length;
        
        return {
          stylesheets,
          blockingScripts: scripts
        };
      });
      
      rendering.blockingResources = blockingResources;
      rendering.hasBlockingResources = blockingResources.blockingScripts > 0;
      
      // Layout Shift 測定
      const layoutShifts = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          let shifts = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              shifts.push({
                value: entry.value,
                hadRecentInput: entry.hadRecentInput
              });
            }
          }).observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => resolve(shifts), 2000);
        });
      });
      
      const totalShift = layoutShifts.reduce((sum, shift) => sum + shift.value, 0);
      rendering.layoutShift = {
        value: totalShift,
        threshold: this.thresholds.webVitals.CLS,
        passed: totalShift <= this.thresholds.webVitals.CLS,
        shifts: layoutShifts
      };
      
    } catch (error) {
      rendering.error = error.message;
    }
    
    return rendering;
  }

  /**
   * インタラクションパフォーマンス測定
   */
  async measureInteractionPerformance() {
    const interaction = {};
    
    try {
      await this.page.goto(this.baseURL);
      await this.page.waitForLoadState('domcontentloaded');
      
      // クリック応答時間測定
      const clickableElements = await this.page.$$('button, a, [onclick]');
      if (clickableElements.length > 0) {
        const clickStartTime = Date.now();
        await clickableElements[0].click();
        await this.page.waitForTimeout(100);
        const clickResponseTime = Date.now() - clickStartTime;
        
        interaction.clickResponse = {
          value: clickResponseTime,
          threshold: this.thresholds.customMetrics.interactionTime,
          passed: clickResponseTime <= this.thresholds.customMetrics.interactionTime
        };
      }
      
      // スクロール応答性測定
      const scrollStartTime = Date.now();
      await this.page.mouse.wheel(0, 500);
      await this.page.waitForTimeout(100);
      const scrollResponseTime = Date.now() - scrollStartTime;
      
      interaction.scrollResponse = {
        value: scrollResponseTime,
        threshold: 50, // 50ms閾値
        passed: scrollResponseTime <= 50
      };
      
      // フォーム入力応答時間
      const inputElements = await this.page.$$('input, textarea');
      if (inputElements.length > 0) {
        const inputStartTime = Date.now();
        await inputElements[0].fill('test');
        await this.page.waitForTimeout(100);
        const inputResponseTime = Date.now() - inputStartTime;
        
        interaction.inputResponse = {
          value: inputResponseTime,
          threshold: this.thresholds.customMetrics.interactionTime,
          passed: inputResponseTime <= this.thresholds.customMetrics.interactionTime
        };
      }
      
    } catch (error) {
      interaction.error = error.message;
    }
    
    return interaction;
  }

  /**
   * メモリリークテスト
   */
  async runMemoryLeakTest() {
    const memoryTest = {};
    
    try {
      await this.page.goto(this.baseURL);
      
      // 初期メモリ使用量
      const initialMemory = await this.page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      // 大量の DOM 操作実行
      for (let i = 0; i < 10; i++) {
        await this.page.evaluate(() => {
          // DOM 要素大量作成・削除
          const container = document.createElement('div');
          for (let j = 0; j < 1000; j++) {
            const elem = document.createElement('div');
            elem.textContent = `Element ${j}`;
            container.appendChild(elem);
          }
          document.body.appendChild(container);
          document.body.removeChild(container);
        });
        
        // ガベージコレクション強制実行（可能な場合）
        await this.page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
        
        await this.page.waitForTimeout(100);
      }
      
      // 最終メモリ使用量
      const finalMemory = await this.page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      memoryTest.initialMemory = initialMemory;
      memoryTest.finalMemory = finalMemory;
      memoryTest.memoryGrowth = memoryGrowth;
      memoryTest.memoryGrowthMB = memoryGrowthMB;
      memoryTest.hasMemoryLeak = memoryGrowthMB > 10; // 10MB以上の増加でリーク疑い
      memoryTest.passed = !memoryTest.hasMemoryLeak;
      
    } catch (error) {
      memoryTest.error = error.message;
    }
    
    return memoryTest;
  }

  /**
   * 負荷テスト
   */
  async runLoadTest() {
    const loadTest = {};
    
    try {
      const iterations = 20;
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await this.page.goto(this.baseURL, { waitUntil: 'load' });
        
        const loadTime = Date.now() - startTime;
        results.push(loadTime);
        
        // 短い待機でサーバー負荷分散
        await this.page.waitForTimeout(100);
      }
      
      const avgLoadTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const minLoadTime = Math.min(...results);
      const maxLoadTime = Math.max(...results);
      const stdDev = Math.sqrt(
        results.reduce((sum, time) => sum + Math.pow(time - avgLoadTime, 2), 0) / results.length
      );
      
      loadTest.iterations = iterations;
      loadTest.results = results;
      loadTest.averageLoadTime = avgLoadTime;
      loadTest.minLoadTime = minLoadTime;
      loadTest.maxLoadTime = maxLoadTime;
      loadTest.standardDeviation = stdDev;
      loadTest.consistency = stdDev < avgLoadTime * 0.3; // 30%以下の変動で一貫性あり
      loadTest.passed = avgLoadTime <= this.thresholds.customMetrics.pageLoadTime;
      
    } catch (error) {
      loadTest.error = error.message;
    }
    
    return loadTest;
  }

  /**
   * Lighthouse テスト実行
   */
  async runLighthouseTest() {
    const lighthouse = {};
    
    try {
      // Lighthouse CLI実行（環境設定済みの場合）
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      const command = `lighthouse ${this.baseURL} --output json --quiet --chrome-flags="--headless"`;
      
      const { stdout } = await execAsync(command);
      const lighthouseResults = JSON.parse(stdout);
      
      lighthouse.performance = lighthouseResults.lhr.categories.performance.score * 100;
      lighthouse.accessibility = lighthouseResults.lhr.categories.accessibility.score * 100;
      lighthouse.bestPractices = lighthouseResults.lhr.categories['best-practices'].score * 100;
      lighthouse.seo = lighthouseResults.lhr.categories.seo.score * 100;
      
      lighthouse.passed = {
        performance: lighthouse.performance >= this.thresholds.lighthouse.performance,
        accessibility: lighthouse.accessibility >= this.thresholds.lighthouse.accessibility,
        bestPractices: lighthouse.bestPractices >= this.thresholds.lighthouse.bestPractices,
        seo: lighthouse.seo >= this.thresholds.lighthouse.seo
      };
      
      lighthouse.overallPassed = Object.values(lighthouse.passed).every(passed => passed);
      
    } catch (error) {
      lighthouse.error = error.message;
      lighthouse.available = false;
    }
    
    return lighthouse;
  }

  /**
   * スコア計算
   */
  calculateScore(metric, value) {
    const threshold = this.thresholds.webVitals[metric];
    if (!threshold) return 0;
    
    // 閾値以下なら100点、超過すると減点
    if (value <= threshold) {
      return 100;
    } else {
      return Math.max(0, 100 - ((value - threshold) / threshold) * 50);
    }
  }

  /**
   * パフォーマンスレポート生成
   */
  generatePerformanceReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      target: this.baseURL,
      summary: {
        overallScore: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        total: 0
      },
      categories: {},
      metrics: testResults,
      recommendations: []
    };
    
    // 各カテゴリのスコア計算
    let totalScore = 0;
    let categoryCount = 0;
    
    Object.entries(testResults).forEach(([category, results]) => {
      if (results && typeof results === 'object' && !results.error) {
        const categoryScore = this.calculateCategoryScore(results);
        report.categories[category] = {
          score: categoryScore,
          passed: categoryScore >= 80
        };
        
        totalScore += categoryScore;
        categoryCount++;
        
        if (categoryScore >= 80) {
          report.summary.passed++;
        } else if (categoryScore >= 60) {
          report.summary.warnings++;
        } else {
          report.summary.failed++;
        }
        
        report.summary.total++;
      }
    });
    
    report.summary.overallScore = categoryCount > 0 ? Math.round(totalScore / categoryCount) : 0;
    
    // 推奨事項生成
    report.recommendations = this.generatePerformanceRecommendations(testResults);
    
    return report;
  }

  /**
   * カテゴリスコア計算
   */
  calculateCategoryScore(results) {
    const scores = [];
    
    Object.values(results).forEach(result => {
      if (result && typeof result === 'object' && result.passed !== undefined) {
        scores.push(result.passed ? 100 : 0);
      }
    });
    
    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  /**
   * パフォーマンス推奨事項生成
   */
  generatePerformanceRecommendations(testResults) {
    const recommendations = [];
    
    // Web Vitals 推奨事項
    if (testResults.webVitals) {
      Object.entries(testResults.webVitals).forEach(([metric, result]) => {
        if (result && !result.passed) {
          switch (metric) {
            case 'FCP':
              recommendations.push('Optimize First Contentful Paint by reducing server response time and eliminating render-blocking resources');
              break;
            case 'LCP':
              recommendations.push('Improve Largest Contentful Paint by optimizing images and critical resource loading');
              break;
            case 'FID':
              recommendations.push('Reduce First Input Delay by minimizing JavaScript execution time and breaking up long tasks');
              break;
            case 'CLS':
              recommendations.push('Minimize Cumulative Layout Shift by setting dimensions for images and ads');
              break;
            case 'TTFB':
              recommendations.push('Improve Time to First Byte by optimizing server performance and using CDN');
              break;
          }
        }
      });
    }
    
    // メモリ使用量推奨事項
    if (testResults.resourceUsage && testResults.resourceUsage.memory && !testResults.resourceUsage.memory.passed) {
      recommendations.push('Reduce memory usage by optimizing JavaScript and DOM manipulation');
    }
    
    // ネットワーク推奨事項
    if (testResults.networkPerformance && testResults.networkPerformance.network && !testResults.networkPerformance.network.passed) {
      recommendations.push('Optimize network performance by compressing resources and implementing caching');
    }
    
    // JavaScript 推奨事項
    if (testResults.javascriptPerformance && testResults.javascriptPerformance.errorCount > 0) {
      recommendations.push('Fix JavaScript errors to improve performance and user experience');
    }
    
    // メモリリーク推奨事項
    if (testResults.memoryLeakTest && testResults.memoryLeakTest.hasMemoryLeak) {
      recommendations.push('Investigate and fix memory leaks by properly cleaning up event listeners and DOM references');
    }
    
    return [...new Set(recommendations)]; // 重複除去
  }
}

export default PerformanceTestFramework;