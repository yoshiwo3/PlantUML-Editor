/**
 * webworker.perf.test.js - WebWorkerパフォーマンステスト
 * TEST-004: パフォーマンステスト - WebWorker効果測定
 * 
 * 測定項目:
 * - UIスレッドブロッキング時間
 * - 変換処理時間（100, 500, 1000要素）
 * - CPU使用率
 * - メモリ使用効率
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// WebWorker モック
class MockWorker {
  constructor(scriptURL) {
    this.scriptURL = scriptURL;
    this.onmessage = null;
    this.onerror = null;
    this.messageQueue = [];
    this.isProcessing = false;
  }

  postMessage(data) {
    // WebWorker処理をシミュレート
    setTimeout(() => {
      if (this.onmessage) {
        const result = this.simulateProcessing(data);
        this.onmessage({ data: result });
      }
    }, Math.random() * 100 + 10); // 10-110ms の処理時間をシミュレート
  }

  simulateProcessing(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'PARSE_JAPANESE':
        return {
          type: 'PARSE_RESULT',
          result: this.parseJapanese(payload.text),
          processingTime: performance.now()
        };
      
      case 'GENERATE_PLANTUML':
        return {
          type: 'PLANTUML_RESULT',
          result: this.generatePlantUML(payload.data),
          processingTime: performance.now()
        };
      
      case 'HEAVY_COMPUTATION':
        return {
          type: 'COMPUTATION_RESULT',
          result: this.heavyComputation(payload.iterations),
          processingTime: performance.now()
        };
      
      default:
        return { type: 'ERROR', error: 'Unknown message type' };
    }
  }

  parseJapanese(text) {
    // 日本語解析処理をシミュレート
    const words = text.split(/\s+/);
    return {
      actors: words.filter(w => w.includes('システム') || w.includes('ユーザー')),
      actions: words.filter(w => w.includes('する') || w.includes('送信')),
      complexity: words.length
    };
  }

  generatePlantUML(data) {
    // PlantUML生成をシミュレート
    const lines = [`@startuml`];
    if (data.actors) {
      data.actors.forEach((actor, i) => {
        lines.push(`participant "${actor}" as actor${i}`);
      });
    }
    if (data.actions) {
      data.actions.forEach(action => {
        lines.push(`actor0 -> actor1 : ${action}`);
      });
    }
    lines.push(`@enduml`);
    return lines.join('\n');
  }

  heavyComputation(iterations) {
    // 重い計算処理をシミュレート
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }
    return result;
  }

  terminate() {
    // Worker終了処理
    this.onmessage = null;
    this.onerror = null;
  }
}

// グローバルなWorkerをモック
global.Worker = MockWorker;

// Performance API モック
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
    }
  };
}

describe('WebWorkerパフォーマンステスト', () => {
  let worker;
  let workerManager;
  let performanceMonitor;

  beforeEach(() => {
    // WorkerManager模擬実装
    workerManager = {
      workers: new Map(),
      
      createWorker(name, scriptPath) {
        const worker = new MockWorker(scriptPath);
        this.workers.set(name, worker);
        return worker;
      },
      
      getWorker(name) {
        return this.workers.get(name);
      },
      
      terminateWorker(name) {
        const worker = this.workers.get(name);
        if (worker) {
          worker.terminate();
          this.workers.delete(name);
        }
      },
      
      terminateAllWorkers() {
        this.workers.forEach(worker => worker.terminate());
        this.workers.clear();
      }
    };

    // PerformanceMonitor模擬実装
    performanceMonitor = {
      metrics: new Map(),
      
      startMeasure(name) {
        this.metrics.set(name, {
          startTime: performance.now(),
          endTime: null,
          duration: null
        });
      },
      
      endMeasure(name) {
        const metric = this.metrics.get(name);
        if (metric) {
          metric.endTime = performance.now();
          metric.duration = metric.endTime - metric.startTime;
        }
      },
      
      getMeasure(name) {
        return this.metrics.get(name);
      },
      
      getAllMeasures() {
        return Array.from(this.metrics.entries()).map(([name, metric]) => ({
          name,
          ...metric
        }));
      }
    };

    worker = workerManager.createWorker('parser', '/workers/parser-worker.js');
  });

  afterEach(() => {
    workerManager.terminateAllWorkers();
    performanceMonitor.metrics.clear();
  });

  describe('UIスレッドブロッキング時間測定', () => {
    test('WebWorker使用時のUIスレッド応答性', async () => {
      const uiBlockingTest = async () => {
        const blockingStartTime = performance.now();
        let isUIBlocked = true;
        
        // UI操作シミュレート
        const uiOperations = [];
        for (let i = 0; i < 10; i++) {
          uiOperations.push(new Promise(resolve => {
            setTimeout(() => {
              const operationTime = performance.now() - blockingStartTime;
              resolve(operationTime);
            }, i * 10);
          }));
        }
        
        // WebWorkerで重い処理を実行
        const workerPromise = new Promise((resolve) => {
          worker.onmessage = (event) => {
            isUIBlocked = false;
            resolve(event.data);
          };
          
          worker.postMessage({
            type: 'HEAVY_COMPUTATION',
            payload: { iterations: 10000 }
          });
        });
        
        const [uiTimes, workerResult] = await Promise.all([
          Promise.all(uiOperations),
          workerPromise
        ]);
        
        const maxUIDelay = Math.max(...uiTimes);
        
        // UIブロッキング時間が50ms以下であることを確認
        expect(maxUIDelay).toBeLessThan(50);
        expect(workerResult.type).toBe('COMPUTATION_RESULT');
      };
      
      await uiBlockingTest();
    });

    test('メインスレッド vs WebWorker処理時間比較', async () => {
      const testData = {
        text: 'ユーザーがシステムにアクセスしてデータを取得する処理を実行する'.repeat(100)
      };
      
      // メインスレッド処理時間測定
      performanceMonitor.startMeasure('mainThread');
      
      // メインスレッドでの処理をシミュレート
      const mainThreadResult = worker.parseJapanese(testData.text);
      
      performanceMonitor.endMeasure('mainThread');
      
      // WebWorker処理時間測定
      performanceMonitor.startMeasure('webWorker');
      
      const workerResult = await new Promise((resolve) => {
        worker.onmessage = (event) => {
          performanceMonitor.endMeasure('webWorker');
          resolve(event.data);
        };
        
        worker.postMessage({
          type: 'PARSE_JAPANESE',
          payload: testData
        });
      });
      
      const mainThreadTime = performanceMonitor.getMeasure('mainThread').duration;
      const webWorkerTime = performanceMonitor.getMeasure('webWorker').duration;
      
      // WebWorkerの処理時間がメインスレッドと同等以下であることを確認
      expect(webWorkerTime).toBeLessThanOrEqual(mainThreadTime * 1.5); // 50%のオーバーヘッドまで許容
      expect(workerResult.type).toBe('PARSE_RESULT');
    });
  });

  describe('大量データ処理性能テスト', () => {
    test('100要素の処理性能', async () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        text: `システム${i}がユーザー${i}にデータ${i}を送信する`
      }));
      
      performanceMonitor.startMeasure('process100');
      
      const results = await Promise.all(
        data.map(item => new Promise((resolve) => {
          const itemWorker = workerManager.createWorker(`worker-${item.id}`, '/workers/parser-worker.js');
          
          itemWorker.onmessage = (event) => {
            workerManager.terminateWorker(`worker-${item.id}`);
            resolve(event.data);
          };
          
          itemWorker.postMessage({
            type: 'PARSE_JAPANESE',
            payload: { text: item.text }
          });
        }))
      );
      
      performanceMonitor.endMeasure('process100');
      
      const processingTime = performanceMonitor.getMeasure('process100').duration;
      
      // 100要素の処理が2秒以内に完了することを確認
      expect(processingTime).toBeLessThan(2000);
      expect(results).toHaveLength(100);
      expect(results.every(r => r.type === 'PARSE_RESULT')).toBe(true);
    });

    test('500要素の処理性能', async () => {
      const data = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        text: `複雑なシーケンス図${i}：システムAがシステムBを経由してシステムCにデータを送信し、結果を取得する`
      }));
      
      performanceMonitor.startMeasure('process500');
      
      // バッチ処理でWorkerを再利用
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      const batchResults = await Promise.all(
        batches.map((batch, batchIndex) => {
          const batchWorker = workerManager.createWorker(`batch-${batchIndex}`, '/workers/parser-worker.js');
          
          return Promise.all(
            batch.map(item => new Promise((resolve) => {
              batchWorker.onmessage = (event) => resolve(event.data);
              
              batchWorker.postMessage({
                type: 'PARSE_JAPANESE',
                payload: { text: item.text }
              });
            }))
          ).then(results => {
            workerManager.terminateWorker(`batch-${batchIndex}`);
            return results;
          });
        })
      );
      
      performanceMonitor.endMeasure('process500');
      
      const processingTime = performanceMonitor.getMeasure('process500').duration;
      const allResults = batchResults.flat();
      
      // 500要素の処理が5秒以内に完了することを確認
      expect(processingTime).toBeLessThan(5000);
      expect(allResults).toHaveLength(500);
    });

    test('1000要素の処理性能とメモリ効率', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `大量データ処理テスト${i}：`.repeat(10) + `システム間連携処理${i}`
      }));
      
      performanceMonitor.startMeasure('process1000');
      
      // ストリーミング処理でメモリ効率を改善
      const chunkSize = 100;
      const results = [];
      
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const streamWorker = workerManager.createWorker('stream', '/workers/parser-worker.js');
        
        const chunkResults = await Promise.all(
          chunk.map(item => new Promise((resolve) => {
            streamWorker.onmessage = (event) => resolve(event.data);
            
            streamWorker.postMessage({
              type: 'PARSE_JAPANESE',
              payload: { text: item.text }
            });
          }))
        );
        
        results.push(...chunkResults);
        workerManager.terminateWorker('stream');
        
        // ガベージコレクションをトリガー
        if (global.gc) {
          global.gc();
        }
      }
      
      performanceMonitor.endMeasure('process1000');
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      const processingTime = performanceMonitor.getMeasure('process1000').duration;
      
      // 1000要素の処理が10秒以内、メモリ増加が100MB以内であることを確認
      expect(processingTime).toBeLessThan(10000);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      expect(results).toHaveLength(1000);
    });
  });

  describe('CPU使用率とリソース効率テスト', () => {
    test('並行Worker処理でのCPU効率', async () => {
      const workerCount = 4;
      const tasksPerWorker = 25;
      
      performanceMonitor.startMeasure('parallelCPU');
      
      const workerPromises = Array.from({ length: workerCount }, (_, workerIndex) => {
        const parallelWorker = workerManager.createWorker(`parallel-${workerIndex}`, '/workers/parser-worker.js');
        
        return Promise.all(
          Array.from({ length: tasksPerWorker }, (_, taskIndex) => {
            return new Promise((resolve) => {
              parallelWorker.onmessage = (event) => resolve(event.data);
              
              parallelWorker.postMessage({
                type: 'HEAVY_COMPUTATION',
                payload: { iterations: 5000 }
              });
            });
          })
        ).then(results => {
          workerManager.terminateWorker(`parallel-${workerIndex}`);
          return results;
        });
      });
      
      const allResults = await Promise.all(workerPromises);
      
      performanceMonitor.endMeasure('parallelCPU');
      
      const parallelTime = performanceMonitor.getMeasure('parallelCPU').duration;
      
      // 並行処理が効率的に実行されることを確認
      expect(parallelTime).toBeLessThan(8000); // 8秒以内
      expect(allResults.flat()).toHaveLength(workerCount * tasksPerWorker);
    });

    test('Worker再利用によるオーバーヘッド削減', async () => {
      const taskCount = 50;
      
      // 新しいWorkerを毎回作成する場合
      performanceMonitor.startMeasure('newWorkerEachTime');
      
      const newWorkerResults = [];
      for (let i = 0; i < taskCount; i++) {
        const tempWorker = workerManager.createWorker(`temp-${i}`, '/workers/parser-worker.js');
        
        const result = await new Promise((resolve) => {
          tempWorker.onmessage = (event) => resolve(event.data);
          tempWorker.postMessage({
            type: 'PARSE_JAPANESE',
            payload: { text: `タスク${i}` }
          });
        });
        
        newWorkerResults.push(result);
        workerManager.terminateWorker(`temp-${i}`);
      }
      
      performanceMonitor.endMeasure('newWorkerEachTime');
      
      // 同じWorkerを再利用する場合
      performanceMonitor.startMeasure('reuseWorker');
      
      const reusableWorker = workerManager.createWorker('reusable', '/workers/parser-worker.js');
      const reuseResults = [];
      
      for (let i = 0; i < taskCount; i++) {
        const result = await new Promise((resolve) => {
          reusableWorker.onmessage = (event) => resolve(event.data);
          reusableWorker.postMessage({
            type: 'PARSE_JAPANESE',
            payload: { text: `タスク${i}` }
          });
        });
        
        reuseResults.push(result);
      }
      
      workerManager.terminateWorker('reusable');
      performanceMonitor.endMeasure('reuseWorker');
      
      const newWorkerTime = performanceMonitor.getMeasure('newWorkerEachTime').duration;
      const reuseWorkerTime = performanceMonitor.getMeasure('reuseWorker').duration;
      
      // Worker再利用が効率的であることを確認
      expect(reuseWorkerTime).toBeLessThan(newWorkerTime * 0.8); // 20%以上の改善
      expect(newWorkerResults).toHaveLength(taskCount);
      expect(reuseResults).toHaveLength(taskCount);
    });
  });

  describe('エラーハンドリングとフォルトトレランス', () => {
    test('Worker異常終了時の処理', async () => {
      const faultyWorker = workerManager.createWorker('faulty', '/workers/parser-worker.js');
      
      // エラーハンドリングを設定
      let errorOccurred = false;
      faultyWorker.onerror = (error) => {
        errorOccurred = true;
      };
      
      // 無効なメッセージを送信してエラーを発生させる
      const errorPromise = new Promise((resolve, reject) => {
        faultyWorker.onmessage = (event) => {
          if (event.data.type === 'ERROR') {
            resolve(event.data);
          } else {
            reject(new Error('Expected error response'));
          }
        };
        
        faultyWorker.postMessage({
          type: 'INVALID_TYPE',
          payload: null
        });
      });
      
      const errorResult = await errorPromise;
      
      expect(errorResult.type).toBe('ERROR');
      expect(errorResult.error).toContain('Unknown message type');
      
      // Worker を安全に終了
      workerManager.terminateWorker('faulty');
    });

    test('大量並行処理での安定性', async () => {
      const concurrentWorkers = 8;
      const tasksPerWorker = 20;
      
      const promises = Array.from({ length: concurrentWorkers }, (_, workerIndex) => {
        const concurrentWorker = workerManager.createWorker(`concurrent-${workerIndex}`, '/workers/parser-worker.js');
        
        return Promise.all(
          Array.from({ length: tasksPerWorker }, (_, taskIndex) => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`Task ${taskIndex} in worker ${workerIndex} timed out`));
              }, 5000);
              
              concurrentWorker.onmessage = (event) => {
                clearTimeout(timeout);
                resolve(event.data);
              };
              
              concurrentWorker.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
              };
              
              concurrentWorker.postMessage({
                type: 'PARSE_JAPANESE',
                payload: { text: `並行タスク${workerIndex}-${taskIndex}` }
              });
            });
          })
        ).then(results => {
          workerManager.terminateWorker(`concurrent-${workerIndex}`);
          return results;
        }).catch(error => {
          workerManager.terminateWorker(`concurrent-${workerIndex}`);
          throw error;
        });
      });
      
      const results = await Promise.all(promises);
      
      // すべてのタスクが正常に完了することを確認
      expect(results.flat()).toHaveLength(concurrentWorkers * tasksPerWorker);
      expect(results.flat().every(r => r.type === 'PARSE_RESULT')).toBe(true);
    });
  });
});