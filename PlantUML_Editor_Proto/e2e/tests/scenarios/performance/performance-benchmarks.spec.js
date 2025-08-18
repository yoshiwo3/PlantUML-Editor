import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../page-objects/PlantUMLEditorPage.js';

/**
 * パフォーマンス・ベンチマークテスト
 * 目的: システム全体の性能指標測定、ボトルネック特定、最適化効果検証
 * カバレッジ: レスポンス時間、スループット、メモリ効率、CPU使用率
 */

test.describe('Performance Benchmark Tests', () => {
  let editorPage;
  let performanceData = {
    testResults: [],
    memoryUsage: [],
    renderTimes: [],
    processingTimes: []
  };

  test.beforeAll(async () => {
    // パフォーマンステスト用の設定
    console.log('パフォーマンステスト開始 - ベンチマーク環境準備');
  });

  test.beforeEach(async ({ page }) => {
    editorPage = new PlantUMLEditorPage(page);
    await editorPage.open();
    await editorPage.enableTestMode();
    await editorPage.clearAllData();
    
    // パフォーマンス監視開始
    await page.evaluate(() => {
      window.performanceMonitor = {
        startTime: performance.now(),
        markers: [],
        memory: []
      };
    });
  });

  test.afterEach(async ({ page }) => {
    // パフォーマンスデータ収集
    const sessionData = await page.evaluate(() => {
      const monitor = window.performanceMonitor;
      return {
        totalTime: performance.now() - monitor.startTime,
        markers: monitor.markers,
        memory: monitor.memory,
        navigation: performance.getEntriesByType('navigation')[0],
        resources: performance.getEntriesByType('resource').length
      };
    });
    
    performanceData.testResults.push(sessionData);
    await editorPage.cleanup();
  });

  test.afterAll(async () => {
    // 総合パフォーマンスレポート出力
    console.log('=== パフォーマンステスト総合レポート ===');
    console.log('テスト実行回数:', performanceData.testResults.length);
    
    if (performanceData.testResults.length > 0) {
      const avgTotalTime = performanceData.testResults.reduce((sum, result) => sum + result.totalTime, 0) / performanceData.testResults.length;
      console.log('平均セッション時間:', `${avgTotalTime.toFixed(2)}ms`);
      
      const avgResources = performanceData.testResults.reduce((sum, result) => sum + result.resources, 0) / performanceData.testResults.length;
      console.log('平均リソース読み込み数:', Math.round(avgResources));
    }
  });

  test.describe('レスポンス時間ベンチマーク', () => {
    
    test('アプリケーション起動時間測定', async ({ page }) => {
      const startTime = Date.now();
      
      // ページ読み込み完了まで測定
      await page.waitForFunction(() => {
        return document.readyState === 'complete' && 
               window.PlantUMLParser && 
               document.querySelector('#japanese-input');
      }, { timeout: 30000 });
      
      const loadTime = Date.now() - startTime;
      
      // 起動時間をマーク
      await page.evaluate((time) => {
        window.performanceMonitor.markers.push({
          name: 'applicationStartup',
          time: time,
          timestamp: Date.now()
        });
      }, loadTime);
      
      console.log(`アプリケーション起動時間: ${loadTime}ms`);
      
      // パフォーマンス基準
      expect(loadTime).toBeLessThan(3000); // 3秒以内
      
      // 詳細な読み込み情報取得
      const navigationTiming = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
          loadComplete: nav.loadEventEnd - nav.loadEventStart,
          totalTime: nav.loadEventEnd - nav.fetchStart
        };
      });
      
      console.log('詳細タイミング:', navigationTiming);
      expect(navigationTiming.domContentLoaded).toBeLessThan(1500);
      expect(navigationTiming.loadComplete).toBeLessThan(500);
    });

    test('日本語変換レスポンス時間測定', async ({ page }) => {
      const testCases = [
        { text: 'A -> B: シンプルメッセージ', expectedTime: 200 },
        { text: 'ユーザー -> システム -> データベース: 複数ステップ処理', expectedTime: 300 },
        { text: '管理者が認証システムを通じてユーザーデータベースにアクセスし、新規ユーザーを作成する', expectedTime: 500 },
        { text: Array(10).fill('プロセス -> システム: 繰り返し処理').join('\n'), expectedTime: 800 }
      ];
      
      const responseMetrics = [];
      
      for (const [index, testCase] of testCases.entries()) {
        const startTime = performance.now();
        
        await page.fill('#japanese-input', testCase.text);
        
        // PlantUMLコード生成完了を待機
        await page.waitForFunction((expectedLength) => {
          const editor = document.querySelector('#plantuml-editor');
          return editor && editor.value.length > expectedLength;
        }, testCase.text.length * 0.5);
        
        const responseTime = performance.now() - startTime;
        responseMetrics.push({
          testCase: index + 1,
          inputLength: testCase.text.length,
          responseTime: responseTime,
          expected: testCase.expectedTime
        });
        
        console.log(`変換テスト${index + 1}: ${responseTime.toFixed(2)}ms (期待値: ${testCase.expectedTime}ms)`);
        expect(responseTime).toBeLessThan(testCase.expectedTime);
        
        // テストケース間のクリーンアップ
        await page.fill('#japanese-input', '');
        await page.waitForTimeout(100);
      }
      
      // レスポンス時間の統計
      const avgResponseTime = responseMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / responseMetrics.length;
      const maxResponseTime = Math.max(...responseMetrics.map(m => m.responseTime));
      
      console.log('日本語変換パフォーマンス統計:', {
        average: `${avgResponseTime.toFixed(2)}ms`,
        maximum: `${maxResponseTime.toFixed(2)}ms`,
        testCount: responseMetrics.length
      });
      
      expect(avgResponseTime).toBeLessThan(350);
      expect(maxResponseTime).toBeLessThan(800);
    });

    test('プレビュー生成時間測定', async ({ page }) => {
      const testScenarios = [
        {
          name: '単純シーケンス',
          input: 'A -> B: メッセージ',
          expectedTime: 300
        },
        {
          name: '複雑シーケンス',
          input: `
            User -> Frontend: ログイン要求
            Frontend -> Backend: 認証リクエスト
            Backend -> Database: ユーザー検索
            Database -> Backend: ユーザー情報
            Backend -> Frontend: 認証結果
            Frontend -> User: ログイン完了
          `,
          expectedTime: 800
        },
        {
          name: '条件分岐付き',
          input: `
            User -> System: リクエスト
            alt 認証成功
              System -> User: 正常応答
            else 認証失敗
              System -> User: エラー応答
            end
          `,
          expectedTime: 1000
        }
      ];
      
      const previewMetrics = [];
      
      for (const scenario of testScenarios) {
        const startTime = performance.now();
        
        await page.fill('#japanese-input', scenario.input);
        
        // プレビュー(SVG)生成完了を待機
        await page.waitForFunction(() => {
          const preview = document.querySelector('#preview-area svg');
          return preview && preview.querySelector('rect, circle, path');
        }, { timeout: 15000 });
        
        const previewTime = performance.now() - startTime;
        previewMetrics.push({
          scenario: scenario.name,
          time: previewTime,
          expected: scenario.expectedTime
        });
        
        console.log(`${scenario.name}プレビュー生成: ${previewTime.toFixed(2)}ms`);
        expect(previewTime).toBeLessThan(scenario.expectedTime);
        
        // SVG品質確認
        const svgElements = await page.evaluate(() => {
          const svg = document.querySelector('#preview-area svg');
          return svg ? {
            width: svg.width.baseVal.value,
            height: svg.height.baseVal.value,
            elementCount: svg.querySelectorAll('*').length
          } : null;
        });
        
        expect(svgElements).toBeTruthy();
        expect(svgElements.width).toBeGreaterThan(100);
        expect(svgElements.height).toBeGreaterThan(100);
        expect(svgElements.elementCount).toBeGreaterThan(5);
      }
      
      const avgPreviewTime = previewMetrics.reduce((sum, metric) => sum + metric.time, 0) / previewMetrics.length;
      console.log(`プレビュー生成平均時間: ${avgPreviewTime.toFixed(2)}ms`);
      expect(avgPreviewTime).toBeLessThan(700);
    });
  });

  test.describe('スループットベンチマーク', () => {
    
    test('連続処理性能測定', async ({ page }) => {
      const batchSize = 50;
      const startTime = Date.now();
      const throughputMetrics = [];
      
      for (let i = 1; i <= batchSize; i++) {
        const iterationStart = performance.now();
        
        const testInput = `プロセス${i} -> システム${i}: 処理${i}`;
        await page.fill('#japanese-input', testInput);
        
        // 処理完了を短時間で確認
        await page.waitForFunction((input) => {
          const editor = document.querySelector('#plantuml-editor');
          return editor && editor.value.includes(input.split(':')[0]);
        }, testInput, { timeout: 2000 });
        
        const iterationTime = performance.now() - iterationStart;
        throughputMetrics.push(iterationTime);
        
        // 10回ごとに進捗レポート
        if (i % 10 === 0) {
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          const throughput = i / (elapsedTime / 1000); // 秒あたりの処理数
          
          console.log(`${i}回処理完了 - スループット: ${throughput.toFixed(2)} 処理/秒`);
        }
      }
      
      const totalTime = Date.now() - startTime;
      const finalThroughput = batchSize / (totalTime / 1000);
      const avgIterationTime = throughputMetrics.reduce((a, b) => a + b, 0) / throughputMetrics.length;
      
      console.log('連続処理性能レポート:', {
        totalTime: `${totalTime}ms`,
        throughput: `${finalThroughput.toFixed(2)} 処理/秒`,
        avgIterationTime: `${avgIterationTime.toFixed(2)}ms`,
        minTime: `${Math.min(...throughputMetrics).toFixed(2)}ms`,
        maxTime: `${Math.max(...throughputMetrics).toFixed(2)}ms`
      });
      
      // スループット基準
      expect(finalThroughput).toBeGreaterThan(2); // 最低2処理/秒
      expect(avgIterationTime).toBeLessThan(400); // 平均400ms以下
      expect(totalTime).toBeLessThan(30000); // 30秒以内で完了
    });

    test('並行編集操作性能', async ({ page }) => {
      const operationCount = 20;
      const startTime = Date.now();
      
      for (let i = 1; i <= operationCount; i++) {
        const operationStart = performance.now();
        
        // アクション追加
        await page.click('[data-testid="add-action"]');
        await page.selectOption('[data-testid="actor-from"]', 'User');
        await page.selectOption('[data-testid="actor-to"]', 'System');
        await page.fill('[data-testid="message"]', `操作${i}`);
        await page.click('[data-testid="save-action"]');
        
        // 条件分岐追加
        await page.click('[data-testid="add-condition"]');
        await page.fill('[data-testid="condition-expression"]', `条件${i}`);
        await page.click('[data-testid="add-action-if-branch"]');
        await page.fill('[data-testid="if-message"]', `分岐処理${i}`);
        await page.click('[data-testid="save-condition"]');
        
        const operationTime = performance.now() - operationStart;
        
        if (i % 5 === 0) {
          console.log(`${i}回の編集操作完了: ${operationTime.toFixed(2)}ms`);
        }
        
        // 操作時間が過度に長くないことを確認
        expect(operationTime).toBeLessThan(2000);
      }
      
      const totalOperationTime = Date.now() - startTime;
      const operationsPerSecond = operationCount / (totalOperationTime / 1000);
      
      console.log('並行編集操作パフォーマンス:', {
        totalTime: `${totalOperationTime}ms`,
        operationsPerSecond: `${operationsPerSecond.toFixed(2)} ops/秒`,
        avgTimePerOperation: `${(totalOperationTime / operationCount).toFixed(2)}ms`
      });
      
      expect(operationsPerSecond).toBeGreaterThan(1); // 最低1操作/秒
      expect(totalOperationTime).toBeLessThan(40000); // 40秒以内
    });

    test('大量データ処理スループット', async ({ page }) => {
      const dataSize = 1000; // 1000行のデータ
      const batchSize = 100; // 100行ずつ処理
      
      let totalProcessed = 0;
      const startTime = Date.now();
      
      for (let batch = 0; batch < dataSize / batchSize; batch++) {
        const batchStart = performance.now();
        
        // バッチデータ生成
        const batchData = Array(batchSize).fill(0).map((_, i) => {
          const lineNumber = batch * batchSize + i + 1;
          return `プロセス${lineNumber} -> システム: 大量データ処理${lineNumber}`;
        }).join('\n');
        
        await page.fill('#japanese-input', batchData);
        
        // バッチ処理完了を待機
        await page.waitForFunction((expectedLines) => {
          const editor = document.querySelector('#plantuml-editor');
          if (!editor) return false;
          
          const lineCount = (editor.value.match(/\n/g) || []).length + 1;
          return lineCount >= expectedLines;
        }, batchSize);
        
        const batchTime = performance.now() - batchStart;
        totalProcessed += batchSize;
        
        const currentThroughput = totalProcessed / ((Date.now() - startTime) / 1000);
        
        console.log(`バッチ${batch + 1}完了: ${batchSize}行 / ${batchTime.toFixed(2)}ms - 累計スループット: ${currentThroughput.toFixed(2)} 行/秒`);
        
        // バッチ処理時間制限
        expect(batchTime).toBeLessThan(5000); // 5秒以内
      }
      
      const totalTime = Date.now() - startTime;
      const finalThroughput = totalProcessed / (totalTime / 1000);
      
      console.log('大量データ処理結果:', {
        totalLines: totalProcessed,
        totalTime: `${totalTime}ms`,
        throughput: `${finalThroughput.toFixed(2)} 行/秒`,
        avgTimePerLine: `${(totalTime / totalProcessed).toFixed(2)}ms`
      });
      
      expect(finalThroughput).toBeGreaterThan(50); // 最低50行/秒
      expect(totalTime).toBeLessThan(30000); // 30秒以内
    });
  });

  test.describe('メモリ効率ベンチマーク', () => {
    
    test('メモリ使用量監視', async ({ page }) => {
      // 初期メモリ使用量
      let initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null;
      });
      
      if (!initialMemory) {
        console.log('メモリ測定機能が利用できません（Chrome以外のブラウザ）');
        return;
      }
      
      console.log('初期メモリ使用量:', `${Math.round(initialMemory.used / 1024 / 1024)}MB`);
      
      const memorySnapshots = [initialMemory];
      
      // 段階的にデータを追加してメモリ使用量を監視
      const dataSteps = [100, 300, 500, 800, 1000];
      
      for (const step of dataSteps) {
        // データ生成
        const data = Array(step).fill(0).map((_, i) => 
          `Actor${i} -> System${i}: メモリテスト${i}`
        ).join('\n');
        
        await page.fill('#japanese-input', data);
        await page.waitForTimeout(1000);
        
        // メモリ使用量測定
        const currentMemory = await page.evaluate(() => {
          return performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
          } : null;
        });
        
        if (currentMemory) {
          memorySnapshots.push(currentMemory);
          const memoryIncrease = currentMemory.used - initialMemory.used;
          const memoryPerLine = memoryIncrease / step;
          
          console.log(`${step}行処理後:`, {
            totalMemory: `${Math.round(currentMemory.used / 1024 / 1024)}MB`,
            increase: `${Math.round(memoryIncrease / 1024 / 1024)}MB`,
            perLine: `${Math.round(memoryPerLine / 1024)}KB/行`
          });
          
          // メモリ効率基準
          expect(currentMemory.used).toBeLessThan(200 * 1024 * 1024); // 200MB以下
          expect(memoryPerLine).toBeLessThan(10 * 1024); // 1行あたり10KB以下
        }
      }
      
      // メモリ増加率の分析
      if (memorySnapshots.length > 1) {
        const totalIncrease = memorySnapshots[memorySnapshots.length - 1].used - memorySnapshots[0].used;
        const totalLines = dataSteps[dataSteps.length - 1];
        const avgMemoryPerLine = totalIncrease / totalLines;
        
        console.log('メモリ効率サマリー:', {
          totalIncrease: `${Math.round(totalIncrease / 1024 / 1024)}MB`,
          totalLines: totalLines,
          efficiency: `${Math.round(avgMemoryPerLine / 1024)}KB/行`
        });
        
        expect(avgMemoryPerLine).toBeLessThan(8 * 1024); // 平均8KB/行以下
      }
    });

    test('メモリリーク検出', async ({ page }) => {
      let initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      if (initialMemory === 0) {
        console.log('メモリリーク検出テストをスキップ（Chrome以外のブラウザ）');
        return;
      }
      
      const leakTestCycles = 10;
      const memoryMeasurements = [];
      
      for (let cycle = 1; cycle <= leakTestCycles; cycle++) {
        // 大量データを作成・削除するサイクル
        const largeData = Array(500).fill(0).map((_, i) => 
          `プロセス${cycle}_${i} -> システム: リークテスト${i}`
        ).join('\n');
        
        await page.fill('#japanese-input', largeData);
        await page.waitForTimeout(500);
        
        // データをクリア
        await page.fill('#japanese-input', '');
        await page.waitForTimeout(500);
        
        // 強制ガベージコレクション（可能な場合）
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
        
        await page.waitForTimeout(1000);
        
        // メモリ使用量測定
        const currentMemory = await page.evaluate(() => {
          return performance.memory ? performance.memory.usedJSHeapSize : 0;
        });
        
        memoryMeasurements.push(currentMemory);
        
        const memoryDiff = currentMemory - initialMemory;
        console.log(`サイクル${cycle}: メモリ使用量 ${Math.round(currentMemory / 1024 / 1024)}MB (初期値との差: ${Math.round(memoryDiff / 1024 / 1024)}MB)`);
        
        // 大幅なメモリ増加がないことを確認
        expect(memoryDiff).toBeLessThan(50 * 1024 * 1024); // 50MB以上の増加はNG
      }
      
      // メモリリーク分析
      const memoryTrend = [];
      for (let i = 1; i < memoryMeasurements.length; i++) {
        memoryTrend.push(memoryMeasurements[i] - memoryMeasurements[i-1]);
      }
      
      const avgMemoryChange = memoryTrend.reduce((sum, change) => sum + change, 0) / memoryTrend.length;
      const positiveChanges = memoryTrend.filter(change => change > 0).length;
      const memoryGrowthRatio = positiveChanges / memoryTrend.length;
      
      console.log('メモリリーク分析:', {
        avgChange: `${Math.round(avgMemoryChange / 1024)}KB`,
        growthRatio: `${(memoryGrowthRatio * 100).toFixed(1)}%`,
        finalIncrease: `${Math.round((memoryMeasurements[memoryMeasurements.length - 1] - initialMemory) / 1024 / 1024)}MB`
      });
      
      // リーク基準
      expect(Math.abs(avgMemoryChange)).toBeLessThan(1024 * 1024); // 平均変化量1MB以下
      expect(memoryGrowthRatio).toBeLessThan(0.7); // 70%未満の増加サイクル
    });

    test('ガベージコレクション効率', async ({ page }) => {
      let initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      if (initialMemory === 0) {
        console.log('GC効率テストをスキップ（Chrome以外のブラウザ）');
        return;
      }
      
      // 大量のオブジェクトを作成
      const heavyData = Array(1000).fill(0).map((_, i) => 
        `重いオブジェクト${i} -> メモリ消費${i}: 大量データ処理テスト${Array(100).fill('x').join('')}`
      ).join('\n');
      
      await page.fill('#japanese-input', heavyData);
      await page.waitForTimeout(2000);
      
      const peakMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      console.log(`ピークメモリ使用量: ${Math.round(peakMemory / 1024 / 1024)}MB`);
      
      // データをクリア
      await page.fill('#japanese-input', '');
      await page.waitForTimeout(1000);
      
      // 手動GC実行（可能な場合）
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(2000);
      
      const postGCMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      const memoryReclaimed = peakMemory - postGCMemory;
      const gcEfficiency = (memoryReclaimed / (peakMemory - initialMemory)) * 100;
      
      console.log('ガベージコレクション効率:', {
        peakMemory: `${Math.round(peakMemory / 1024 / 1024)}MB`,
        postGCMemory: `${Math.round(postGCMemory / 1024 / 1024)}MB`,
        memoryReclaimed: `${Math.round(memoryReclaimed / 1024 / 1024)}MB`,
        efficiency: `${gcEfficiency.toFixed(1)}%`
      });
      
      // GC効率基準
      expect(gcEfficiency).toBeGreaterThan(60); // 60%以上のメモリ回収
      expect(postGCMemory).toBeLessThan(peakMemory * 0.6); // ピーク時の60%以下まで削減
    });
  });

  test.describe('CPU使用率ベンチマーク', () => {
    
    test('CPU集約的処理性能', async ({ page }) => {
      const cpuTestStart = Date.now();
      
      // 複雑な処理を要求するデータを生成
      const complexData = [];
      for (let i = 0; i < 200; i++) {
        complexData.push(`
          User${i} -> Frontend${i}: リクエスト${i}
          Frontend${i} -> Backend${i}: API呼び出し${i}
          Backend${i} -> Database${i}: クエリ実行${i}
          Database${i} -> Backend${i}: 結果返却${i}
          Backend${i} -> Frontend${i}: レスポンス${i}
          Frontend${i} -> User${i}: 画面更新${i}
        `);
      }
      
      const inputData = complexData.join('\n');
      
      await page.fill('#japanese-input', inputData);
      
      // 処理完了を待機
      await page.waitForFunction(() => {
        const editor = document.querySelector('#plantuml-editor');
        const preview = document.querySelector('#preview-area svg');
        return editor && editor.value.length > 10000 && preview;
      }, { timeout: 60000 });
      
      const processingTime = Date.now() - cpuTestStart;
      
      // CPU使用率推定（処理時間ベース）
      const dataComplexity = complexData.length * 6; // 各アイテム6行
      const processingRate = dataComplexity / (processingTime / 1000); // 行/秒
      
      console.log('CPU集約的処理結果:', {
        totalLines: dataComplexity,
        processingTime: `${processingTime}ms`,
        processingRate: `${processingRate.toFixed(2)} 行/秒`,
        avgTimePerLine: `${(processingTime / dataComplexity).toFixed(2)}ms`
      });
      
      // CPU性能基準
      expect(processingTime).toBeLessThan(30000); // 30秒以内
      expect(processingRate).toBeGreaterThan(20); // 最低20行/秒
      
      // 結果の品質確認
      const plantumlCode = await page.inputValue('#plantuml-editor');
      expect(plantumlCode.length).toBeGreaterThan(10000);
      expect(plantumlCode).toContain('User0');
      expect(plantumlCode).toContain('User199');
    });

    test('リアルタイム処理性能', async ({ page }) => {
      const realtimeTests = [];
      const testDuration = 10000; // 10秒間のテスト
      const testStart = Date.now();
      
      let operationCount = 0;
      
      while (Date.now() - testStart < testDuration) {
        const operationStart = performance.now();
        
        // リアルタイム入力をシミュレート
        const inputText = `リアルタイム${operationCount} -> システム: 処理${Date.now()}`;
        await page.fill('#japanese-input', inputText);
        
        // 即座に結果が反映されることを確認
        await page.waitForFunction((expected) => {
          const editor = document.querySelector('#plantuml-editor');
          return editor && editor.value.includes(expected);
        }, `リアルタイム${operationCount}`, { timeout: 1000 });
        
        const operationTime = performance.now() - operationStart;
        realtimeTests.push(operationTime);
        
        operationCount++;
        
        // 次の操作まで短い間隔
        await page.waitForTimeout(50);
      }
      
      const actualDuration = Date.now() - testStart;
      const operationsPerSecond = operationCount / (actualDuration / 1000);
      const avgResponseTime = realtimeTests.reduce((sum, time) => sum + time, 0) / realtimeTests.length;
      const maxResponseTime = Math.max(...realtimeTests);
      
      console.log('リアルタイム処理性能:', {
        duration: `${actualDuration}ms`,
        totalOperations: operationCount,
        operationsPerSecond: `${operationsPerSecond.toFixed(2)} ops/秒`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime.toFixed(2)}ms`
      });
      
      // リアルタイム性能基準
      expect(operationsPerSecond).toBeGreaterThan(5); // 最低5操作/秒
      expect(avgResponseTime).toBeLessThan(300); // 平均300ms以下
      expect(maxResponseTime).toBeLessThan(1000); // 最大1秒以下
      
      // 95パーセンタイル応答時間
      const sortedTimes = realtimeTests.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95ResponseTime = sortedTimes[p95Index];
      
      console.log(`95パーセンタイル応答時間: ${p95ResponseTime.toFixed(2)}ms`);
      expect(p95ResponseTime).toBeLessThan(500);
    });

    test('マルチタスク処理性能', async ({ page }) => {
      // 複数の同時処理をシミュレート
      const tasks = [
        {
          name: 'アクション編集',
          action: async () => {
            await page.click('[data-testid="add-action"]');
            await page.selectOption('[data-testid="actor-from"]', 'User');
            await page.selectOption('[data-testid="actor-to"]', 'System');
            await page.fill('[data-testid="message"]', `マルチタスク${Date.now()}`);
            await page.click('[data-testid="save-action"]');
          }
        },
        {
          name: '条件分岐編集',
          action: async () => {
            await page.click('[data-testid="add-condition"]');
            await page.fill('[data-testid="condition-expression"]', `条件${Date.now()}`);
            await page.click('[data-testid="add-action-if-branch"]');
            await page.fill('[data-testid="if-message"]', `条件処理${Date.now()}`);
            await page.click('[data-testid="save-condition"]');
          }
        },
        {
          name: 'テキスト入力',
          action: async () => {
            const text = `並行処理${Date.now()} -> システム: マルチタスクテスト`;
            await page.fill('#japanese-input', text);
            await page.waitForTimeout(100);
          }
        }
      ];
      
      const multitaskStart = Date.now();
      const taskResults = [];
      
      // 20サイクルのマルチタスク処理
      for (let cycle = 0; cycle < 20; cycle++) {
        const cycleStart = performance.now();
        
        // 3つのタスクを順次実行
        for (const task of tasks) {
          const taskStart = performance.now();
          
          try {
            await task.action();
            const taskTime = performance.now() - taskStart;
            taskResults.push({
              cycle: cycle,
              task: task.name,
              time: taskTime
            });
          } catch (error) {
            console.error(`タスク ${task.name} でエラー:`, error);
          }
        }
        
        const cycleTime = performance.now() - cycleStart;
        
        if (cycle % 5 === 0) {
          console.log(`サイクル${cycle}完了: ${cycleTime.toFixed(2)}ms`);
        }
        
        // サイクル時間制限
        expect(cycleTime).toBeLessThan(3000);
      }
      
      const totalMultitaskTime = Date.now() - multitaskStart;
      const tasksByType = {};
      
      // タスク種別ごとの統計
      taskResults.forEach(result => {
        if (!tasksByType[result.task]) {
          tasksByType[result.task] = [];
        }
        tasksByType[result.task].push(result.time);
      });
      
      console.log('マルチタスク処理結果:');
      for (const [taskName, times] of Object.entries(tasksByType)) {
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        
        console.log(`  ${taskName}: 平均${avgTime.toFixed(2)}ms, 最大${maxTime.toFixed(2)}ms`);
        expect(avgTime).toBeLessThan(1000);
        expect(maxTime).toBeLessThan(2000);
      }
      
      const overallThroughput = taskResults.length / (totalMultitaskTime / 1000);
      console.log(`総合スループット: ${overallThroughput.toFixed(2)} タスク/秒`);
      
      expect(overallThroughput).toBeGreaterThan(1); // 最低1タスク/秒
      expect(totalMultitaskTime).toBeLessThan(60000); // 60秒以内
    });
  });
});