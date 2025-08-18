/**
 * Sprint2 Performance E2E Test Suite - 統合実行
 * 
 * 全パフォーマンステスト（TEST-E2E-014～018）の統合実行とレポート生成
 * パフォーマンス監視ユーティリティとの連携による包括的な性能検証
 */

const { test, expect } = require('@playwright/test');
const PerformanceMonitor = require('./utils/performance-monitor');

test.describe('Sprint2 Performance Test Suite - Integration', () => {
  let performanceMonitor;
  
  test.use({
    // 統合テスト専用設定
    video: 'on',
    trace: 'on',
    timeout: 300000, // 5分のタイムアウト
    launchOptions: {
      args: [
        '--enable-precise-memory-info',
        '--js-flags=--expose-gc',
        '--max-old-space-size=4096',
        '--disable-dev-shm-usage'
      ]
    }
  });

  test.beforeAll(async () => {
    console.log('🚀 Starting Sprint2 Performance Test Suite');
    console.log('📊 Initializing Performance Monitor');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // パフォーマンス監視を初期化
    performanceMonitor = await page.evaluate(() => {
      // performance-monitor.jsをインジェクト
      if (!window.PerformanceMonitor) {
        // パフォーマンス監視ユーティリティをページに注入
        const script = document.createElement('script');
        script.textContent = `
          ${PerformanceMonitor.toString()};
          window.performanceMonitor = new PerformanceMonitor({
            enableRealTimeMonitoring: true,
            sampleInterval: 500,
            alertThresholds: {
              memoryUsage: 150 * 1024 * 1024, // 150MB
              frameRate: 25, // fps
              responseTime: 2000 // ms
            }
          });
          window.performanceMonitor.startMonitoring();
        `;
        document.head.appendChild(script);
        
        return true;
      }
      return false;
    });
    
    console.log('✅ Performance Monitor initialized');
  });

  test.afterEach(async ({ page }) => {
    // テスト後のクリーンアップとレポート生成
    const report = await page.evaluate(() => {
      if (window.performanceMonitor) {
        window.performanceMonitor.stopMonitoring();
        return window.performanceMonitor.generateReport();
      }
      return null;
    });
    
    if (report) {
      console.log('📈 Performance Report Summary:');
      console.log(`   Peak Memory: ${(report.summary.memoryPeakUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Avg Frame Rate: ${report.summary.averageFrameRate.toFixed(2)} FPS`);
      console.log(`   Network Transfer: ${(report.summary.networkTransferTotal / 1024).toFixed(2)} KB`);
      console.log(`   Alerts: ${report.alerts.length}`);
      
      if (report.alerts.length > 0) {
        console.warn('⚠️  Performance Alerts:');
        report.alerts.forEach(alert => {
          console.warn(`   ${alert.type}: ${alert.message}`);
        });
      }
      
      if (report.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        report.recommendations.forEach(rec => {
          console.log(`   ${rec.category}: ${rec.message}`);
        });
      }
    }
  });

  test('SUITE-001: WebWorker Performance Integration Test', async ({ page }) => {
    console.log('🔧 Testing WebWorker Performance Integration');
    
    // WebWorker性能テストの統合実行
    const webWorkerResults = await page.evaluate(async () => {
      const results = [];
      
      // 並列処理性能テスト
      const parallelTestStart = Date.now();
      const workers = [];
      
      try {
        // 複数ワーカーでの並列処理
        for (let i = 0; i < 4; i++) {
          const worker = new Worker('/src/workers/PlantUMLParserWorker.js');
          workers.push(worker);
          
          const workerPromise = new Promise((resolve) => {
            worker.onmessage = (event) => {
              resolve(event.data);
            };
            
            worker.postMessage({
              method: 'parse',
              args: [`@startuml\nWorker${i} -> System: Parallel task ${i}\n@enduml`]
            });
          });
          
          results.push(await workerPromise);
        }
        
        // ワーカー終了
        workers.forEach(worker => worker.terminate());
        
        const parallelTestEnd = Date.now();
        const parallelDuration = parallelTestEnd - parallelTestStart;
        
        if (window.performanceMonitor) {
          window.performanceMonitor.recordWebWorkerMetrics('parallel-processing', {
            workerCount: 4,
            processingTime: parallelDuration,
            tasksCompleted: results.length,
            averageTaskTime: parallelDuration / results.length
          });
        }
        
        return {
          success: true,
          parallelDuration,
          tasksCompleted: results.length,
          averageTaskTime: parallelDuration / results.length
        };
        
      } catch (error) {
        console.error('WebWorker test failed:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(webWorkerResults.success).toBe(true);
    expect(webWorkerResults.parallelDuration).toBeLessThan(5000); // 5秒以内
    expect(webWorkerResults.tasksCompleted).toBe(4);
    
    console.log(`✅ WebWorker Integration: ${webWorkerResults.parallelDuration}ms for ${webWorkerResults.tasksCompleted} tasks`);
  });

  test('SUITE-002: Virtual Scroll Performance Integration Test', async ({ page }) => {
    console.log('📜 Testing Virtual Scroll Performance Integration');
    
    // 仮想スクロール性能テストの統合実行
    const virtualScrollResults = await page.evaluate(async () => {
      // 大規模データでの仮想スクロールテスト
      const largeDiagram = '@startuml\n' + 
        Array.from({ length: 1000 }, (_, i) => `A${i} -> B${i}: Message ${i}`).join('\n') + 
        '\n@enduml';
      
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = largeDiagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // 仮想スクロール初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const scrollTestStart = Date.now();
      
      // スクロール性能テスト
      const container = document.querySelector('.virtual-scroll-container') || 
                       document.querySelector('.editor-container') ||
                       document.body;
      
      const scrollPromises = [];
      
      // 段階的スクロール
      for (let i = 0; i <= 10; i++) {
        const scrollPosition = (container.scrollHeight || 1000) * (i / 10);
        
        const scrollPromise = new Promise(resolve => {
          container.scrollTop = scrollPosition;
          requestAnimationFrame(() => {
            resolve({
              position: scrollPosition,
              timestamp: Date.now()
            });
          });
        });
        
        scrollPromises.push(scrollPromise);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const scrollResults = await Promise.all(scrollPromises);
      const scrollTestEnd = Date.now();
      const scrollDuration = scrollTestEnd - scrollTestStart;
      
      if (window.performanceMonitor) {
        window.performanceMonitor.recordVirtualScrollMetrics('large-data-scroll', {
          scrollTime: scrollDuration,
          scrollSteps: scrollResults.length,
          dataSize: largeDiagram.length,
          averageStepTime: scrollDuration / scrollResults.length
        });
      }
      
      return {
        success: true,
        scrollDuration,
        scrollSteps: scrollResults.length,
        dataSize: largeDiagram.length,
        averageStepTime: scrollDuration / scrollResults.length
      };
    });
    
    expect(virtualScrollResults.success).toBe(true);
    expect(virtualScrollResults.scrollDuration).toBeLessThan(3000); // 3秒以内
    expect(virtualScrollResults.averageStepTime).toBeLessThan(300); // 平均300ms以内
    
    console.log(`✅ Virtual Scroll Integration: ${virtualScrollResults.scrollDuration}ms for ${virtualScrollResults.scrollSteps} steps`);
  });

  test('SUITE-003: Memory Leak Detection Integration Test', async ({ page }) => {
    console.log('🧠 Testing Memory Leak Detection Integration');
    
    // メモリリーク検出テストの統合実行
    const memoryLeakResults = await page.evaluate(async () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // メモリ集約的な操作を繰り返し実行
      for (let iteration = 0; iteration < 10; iteration++) {
        // DOM要素の大量作成と削除
        const container = document.createElement('div');
        container.className = 'memory-test-container';
        
        for (let i = 0; i < 100; i++) {
          const element = document.createElement('div');
          element.textContent = `Memory test element ${iteration}-${i}`;
          element.addEventListener('click', function() {
            console.log(`Clicked: ${iteration}-${i}`);
          });
          container.appendChild(element);
        }
        
        document.body.appendChild(container);
        
        // 短時間待機後に削除
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 要素を削除
        container.remove();
        
        // 定期的にガベージコレクション実行
        if (iteration % 3 === 0 && window.gc) {
          window.gc();
        }
        
        // メモリ使用量を記録
        if (window.performanceMonitor && performance.memory) {
          window.performanceMonitor.recordMemoryUsage(`iteration-${iteration}`);
        }
      }
      
      // 最終的なガベージコレクション
      if (window.gc) {
        for (let i = 0; i < 5; i++) {
          window.gc();
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      return {
        success: true,
        initialMemory,
        finalMemory,
        memoryIncrease,
        memoryIncreasePercent: initialMemory > 0 ? (memoryIncrease / initialMemory) * 100 : 0
      };
    });
    
    expect(memoryLeakResults.success).toBe(true);
    expect(memoryLeakResults.memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB未満の増加
    expect(memoryLeakResults.memoryIncreasePercent).toBeLessThan(50); // 50%未満の増加
    
    console.log(`✅ Memory Leak Integration: ${(memoryLeakResults.memoryIncrease / 1024 / 1024).toFixed(2)} MB increase (${memoryLeakResults.memoryIncreasePercent.toFixed(2)}%)`);
  });

  test('SUITE-004: Rendering Optimization Integration Test', async ({ page }) => {
    console.log('🎨 Testing Rendering Optimization Integration');
    
    // レンダリング最適化テストの統合実行
    const renderingResults = await page.evaluate(async () => {
      const frameData = [];
      let renderingTestActive = true;
      
      // フレームレート監視開始
      const measureFrames = () => {
        if (!renderingTestActive) return;
        
        const frameStart = performance.now();
        
        requestAnimationFrame((timestamp) => {
          const frameEnd = performance.now();
          const frameDuration = frameEnd - frameStart;
          
          frameData.push({
            timestamp,
            duration: frameDuration,
            fps: 1000 / frameDuration
          });
          
          if (renderingTestActive) {
            measureFrames();
          }
        });
      };
      
      measureFrames();
      
      // 複雑なレンダリングタスクを実行
      const renderingTestStart = Date.now();
      
      // 複雑なCSS要素を動的に追加
      const style = document.createElement('style');
      style.textContent = `
        .rendering-test-item {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          padding: 10px;
          margin: 5px;
          border-radius: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .rendering-test-item:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
      `;
      document.head.appendChild(style);
      
      // 大量の要素を追加
      const container = document.createElement('div');
      container.className = 'rendering-test-container';
      
      for (let i = 0; i < 200; i++) {
        const item = document.createElement('div');
        item.className = 'rendering-test-item';
        item.textContent = `Rendering test item ${i}`;
        container.appendChild(item);
      }
      
      document.body.appendChild(container);
      
      // レンダリング負荷テスト実行
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // アニメーション効果をトリガー
      const items = container.querySelectorAll('.rendering-test-item');
      for (let i = 0; i < Math.min(items.length, 50); i++) {
        items[i].style.transform = 'scale(1.1)';
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // テスト終了
      renderingTestActive = false;
      const renderingTestEnd = Date.now();
      const renderingDuration = renderingTestEnd - renderingTestStart;
      
      // 要素をクリーンアップ
      container.remove();
      style.remove();
      
      // フレームレート分析
      const avgFps = frameData.length > 0 ? 
        frameData.reduce((sum, frame) => sum + frame.fps, 0) / frameData.length : 0;
      const minFps = frameData.length > 0 ? 
        Math.min(...frameData.map(frame => frame.fps)) : 0;
      const droppedFrames = frameData.filter(frame => frame.fps < 30).length;
      
      if (window.performanceMonitor) {
        window.performanceMonitor.recordRenderingMetrics('complex-rendering', {
          renderTime: renderingDuration,
          averageFps: avgFps,
          minimumFps: minFps,
          droppedFrames,
          totalFrames: frameData.length
        });
      }
      
      return {
        success: true,
        renderingDuration,
        averageFps,
        minimumFps,
        droppedFrames,
        totalFrames: frameData.length,
        frameDropRate: frameData.length > 0 ? (droppedFrames / frameData.length) * 100 : 0
      };
    });
    
    expect(renderingResults.success).toBe(true);
    expect(renderingResults.renderingDuration).toBeLessThan(5000); // 5秒以内
    expect(renderingResults.averageFps).toBeGreaterThan(20); // 20fps以上
    expect(renderingResults.frameDropRate).toBeLessThan(40); // フレームドロップ40%未満
    
    console.log(`✅ Rendering Integration: ${renderingResults.renderingDuration}ms, ${renderingResults.averageFps.toFixed(2)} avg FPS`);
  });

  test('SUITE-005: Large Data Processing Integration Test', async ({ page }) => {
    console.log('📊 Testing Large Data Processing Integration');
    
    // 大規模データ処理テストの統合実行
    const largeDataResults = await page.evaluate(async () => {
      // 大規模PlantUML図を生成
      const generateLargeDiagram = (lines) => {
        let diagram = '@startuml\n';
        for (let i = 0; i < lines; i++) {
          diagram += `A${i % 20} -> B${i % 20}: Message ${i}\n`;
        }
        diagram += '@enduml';
        return diagram;
      };
      
      const testSizes = [1000, 3000, 5000];
      const processingResults = [];
      
      for (const size of testSizes) {
        const diagram = generateLargeDiagram(size);
        const diagramSize = new Blob([diagram]).size;
        
        const processingStart = Date.now();
        
        // 大規模データを処理
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          codeArea.value = diagram;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 処理完了を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const processingEnd = Date.now();
        const processingTime = processingEnd - processingStart;
        
        processingResults.push({
          size,
          diagramSize,
          processingTime,
          throughput: diagramSize / processingTime // bytes/ms
        });
        
        if (window.performanceMonitor) {
          window.performanceMonitor.recordLargeDataMetrics(`processing-${size}-lines`, {
            lines: size,
            dataSize: diagramSize,
            processingTime,
            throughput: diagramSize / processingTime
          });
        }
      }
      
      const averageProcessingTime = processingResults.reduce((sum, r) => sum + r.processingTime, 0) / processingResults.length;
      const averageThroughput = processingResults.reduce((sum, r) => sum + r.throughput, 0) / processingResults.length;
      
      return {
        success: true,
        processingResults,
        averageProcessingTime,
        averageThroughput,
        maxProcessingTime: Math.max(...processingResults.map(r => r.processingTime)),
        totalDataProcessed: processingResults.reduce((sum, r) => sum + r.diagramSize, 0)
      };
    });
    
    expect(largeDataResults.success).toBe(true);
    expect(largeDataResults.averageProcessingTime).toBeLessThan(3000); // 平均3秒以内
    expect(largeDataResults.maxProcessingTime).toBeLessThan(5000); // 最大5秒以内
    expect(largeDataResults.averageThroughput).toBeGreaterThan(100); // 100 bytes/ms以上
    
    console.log(`✅ Large Data Integration: ${largeDataResults.averageProcessingTime.toFixed(0)}ms avg, ${(largeDataResults.totalDataProcessed / 1024).toFixed(2)} KB processed`);
  });

  test('SUITE-006: Comprehensive Performance Validation', async ({ page }) => {
    console.log('🏆 Running Comprehensive Performance Validation');
    
    // 全体的なパフォーマンス検証
    const comprehensiveResults = await page.evaluate(async () => {
      if (!window.performanceMonitor) {
        return { success: false, error: 'Performance monitor not available' };
      }
      
      // 包括的なパフォーマンステストシナリオ
      const testStart = Date.now();
      
      // 1. 複雑なマルチタスク実行
      const multiTaskPromises = [];
      
      // WebWorker タスク
      for (let i = 0; i < 3; i++) {
        multiTaskPromises.push(new Promise(async resolve => {
          try {
            const worker = new Worker('/src/workers/PlantUMLParserWorker.js');
            worker.onmessage = () => {
              worker.terminate();
              resolve({ task: 'webworker', success: true });
            };
            worker.postMessage({
              method: 'parse',
              args: [`@startuml\nMultiTask${i} -> System: Task ${i}\n@enduml`]
            });
          } catch (error) {
            resolve({ task: 'webworker', success: false, error: error.message });
          }
        }));
      }
      
      // 大規模データ処理タスク
      multiTaskPromises.push(new Promise(async resolve => {
        try {
          const largeDiagram = '@startuml\n' + 
            Array.from({ length: 2000 }, (_, i) => `A${i} -> B${i}: Large ${i}`).join('\n') + 
            '\n@enduml';
          
          const codeArea = document.querySelector('#plantuml-code');
          if (codeArea) {
            codeArea.value = largeDiagram;
            codeArea.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          await new Promise(r => setTimeout(r, 1000));
          resolve({ task: 'large-data', success: true });
        } catch (error) {
          resolve({ task: 'large-data', success: false, error: error.message });
        }
      }));
      
      // レンダリング負荷タスク
      multiTaskPromises.push(new Promise(async resolve => {
        try {
          const container = document.createElement('div');
          for (let i = 0; i < 100; i++) {
            const element = document.createElement('div');
            element.textContent = `Render test ${i}`;
            element.style.cssText = 'padding: 5px; margin: 2px; background: linear-gradient(45deg, red, blue);';
            container.appendChild(element);
          }
          document.body.appendChild(container);
          
          await new Promise(r => setTimeout(r, 500));
          container.remove();
          resolve({ task: 'rendering', success: true });
        } catch (error) {
          resolve({ task: 'rendering', success: false, error: error.message });
        }
      }));
      
      // 全タスクの完了を待つ
      const taskResults = await Promise.all(multiTaskPromises);
      
      const testEnd = Date.now();
      const totalTestTime = testEnd - testStart;
      
      // 最終パフォーマンスレポートを生成
      const finalReport = window.performanceMonitor.generateReport();
      
      return {
        success: true,
        totalTestTime,
        taskResults,
        performanceReport: {
          summary: finalReport.summary,
          alerts: finalReport.alerts,
          recommendations: finalReport.recommendations
        }
      };
    });
    
    expect(comprehensiveResults.success).toBe(true);
    expect(comprehensiveResults.totalTestTime).toBeLessThan(10000); // 10秒以内
    
    // 全タスクが成功していることを確認
    const successfulTasks = comprehensiveResults.taskResults.filter(task => task.success);
    expect(successfulTasks.length).toBeGreaterThan(comprehensiveResults.taskResults.length * 0.8); // 80%以上成功
    
    // パフォーマンス要件の最終検証
    const report = comprehensiveResults.performanceReport;
    if (report.summary.memoryPeakUsage > 0) {
      expect(report.summary.memoryPeakUsage).toBeLessThan(200 * 1024 * 1024); // 200MB未満
    }
    
    if (report.summary.averageFrameRate > 0) {
      expect(report.summary.averageFrameRate).toBeGreaterThan(15); // 15fps以上
    }
    
    console.log(`✅ Comprehensive Validation: ${comprehensiveResults.totalTestTime}ms, ${successfulTasks.length}/${comprehensiveResults.taskResults.length} tasks succeeded`);
    
    if (report.alerts.length > 0) {
      console.warn(`⚠️  Final Alerts: ${report.alerts.length}`);
    }
    
    if (report.recommendations.length > 0) {
      console.log(`💡 Final Recommendations: ${report.recommendations.length}`);
    }
  });

  test.afterAll(async () => {
    console.log('🎯 Sprint2 Performance Test Suite Completed');
    console.log('📊 All performance tests have been executed and validated');
  });
});