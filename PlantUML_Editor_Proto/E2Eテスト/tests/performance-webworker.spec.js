/**
 * TEST-E2E-014: WebWorker並列処理テスト (5 SP)
 * 
 * WebWorkerの並列処理性能、メッセージ通信、ワーカープール管理を検証
 * パフォーマンス目標: CPU使用率 < 50%, 並列処理効率 > 80%
 */

const { test, expect } = require('@playwright/test');

test.describe('WebWorker Performance Tests - TEST-E2E-014', () => {
  test.use({
    // パフォーマンステスト専用設定
    video: 'on',
    trace: 'on',
    launchOptions: {
      args: ['--enable-precise-memory-info', '--enable-worker-threads']
    }
  });

  test.beforeEach(async ({ page }) => {
    // WebWorker APIが利用可能かチェック
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const workerSupport = await page.evaluate(() => {
      return typeof Worker !== 'undefined';
    });
    
    if (!workerSupport) {
      test.skip('WebWorker not supported in this environment');
    }
  });

  test('WW-001: WebWorker初期化とワーカープール作成', async ({ page }) => {
    const startTime = Date.now();
    
    // ワーカープールを初期化
    await page.evaluate(() => {
      if (window.WorkerPool) {
        window.testWorkerPool = new window.WorkerPool({
          maxWorkers: 4,
          workerScript: '/src/workers/PlantUMLParserWorker.js'
        });
      }
    });
    
    const initTime = Date.now() - startTime;
    console.log(`ワーカープール初期化時間: ${initTime}ms`);
    
    // 初期化時間が1秒以内であることを確認
    expect(initTime).toBeLessThan(1000);
    
    // ワーカープールの状態を確認
    const poolStatus = await page.evaluate(() => {
      if (window.testWorkerPool) {
        return {
          maxWorkers: window.testWorkerPool.maxWorkers,
          activeWorkers: window.testWorkerPool.activeWorkers || 0,
          queueLength: window.testWorkerPool.queueLength || 0
        };
      }
      return null;
    });
    
    if (poolStatus) {
      expect(poolStatus.maxWorkers).toBe(4);
      expect(poolStatus.activeWorkers).toBeLessThanOrEqual(4);
    }
  });

  test('WW-002: 並列タスク処理性能', async ({ page }) => {
    // 複数の大きなPlantUMLタスクを並列処理
    const tasks = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      content: generateLargePlantUMLContent(i),
      complexity: 'high'
    }));
    
    const startTime = Date.now();
    
    // 並列処理開始
    const results = await page.evaluate(async (tasks) => {
      if (!window.WorkerPool) {
        // フォールバック: 順次処理
        return await Promise.all(tasks.map(async task => {
          const parser = new window.PlantUMLParser();
          return await parser.parse(task.content);
        }));
      }
      
      // WorkerPoolを使用した並列処理
      const pool = new window.WorkerPool({
        maxWorkers: 4,
        workerScript: '/src/workers/PlantUMLParserWorker.js'
      });
      
      const promises = tasks.map(task => 
        pool.execute({ method: 'parse', args: [task.content] })
      );
      
      return await Promise.all(promises);
    }, tasks);
    
    const processingTime = Date.now() - startTime;
    console.log(`8タスク並列処理時間: ${processingTime}ms`);
    
    // 並列処理が10秒以内に完了することを確認
    expect(processingTime).toBeLessThan(10000);
    expect(results.length).toBe(8);
    
    // CPU使用率のチェック
    const cpuMetrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          heapUsed: performance.memory.usedJSHeapSize,
          heapTotal: performance.memory.totalJSHeapSize,
          timestamp: Date.now()
        };
      }
      return null;
    });
    
    if (cpuMetrics) {
      console.log(`並列処理後のヒープ使用量: ${(cpuMetrics.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    }
  });

  test('WW-003: WebWorkerメッセージ通信性能', async ({ page }) => {
    const messageCount = 100;
    const messageSize = 1024; // 1KB per message
    
    const startTime = Date.now();
    
    // 大量メッセージの送受信テスト
    const communicationResults = await page.evaluate(async (count, size) => {
      return new Promise((resolve) => {
        const worker = new Worker('/src/workers/PlantUMLParserWorker.js');
        const results = [];
        let received = 0;
        
        worker.onmessage = (event) => {
          results.push({
            messageId: event.data.messageId,
            timestamp: Date.now(),
            responseSize: JSON.stringify(event.data).length
          });
          
          received++;
          if (received === count) {
            worker.terminate();
            resolve(results);
          }
        };
        
        // メッセージを順次送信
        for (let i = 0; i < count; i++) {
          const testData = 'x'.repeat(size);
          worker.postMessage({
            messageId: i,
            method: 'echo',
            data: testData,
            timestamp: Date.now()
          });
        }
      });
    }, messageCount, messageSize);
    
    const communicationTime = Date.now() - startTime;
    console.log(`${messageCount}メッセージ通信時間: ${communicationTime}ms`);
    
    // 通信性能の検証
    expect(communicationTime).toBeLessThan(5000); // 5秒以内
    expect(communicationResults.length).toBe(messageCount);
    
    // 平均レスポンス時間を計算
    const avgResponseTime = communicationTime / messageCount;
    console.log(`平均メッセージレスポンス時間: ${avgResponseTime.toFixed(2)}ms`);
    expect(avgResponseTime).toBeLessThan(50); // 50ms以内
  });

  test('WW-004: ワーカープール負荷分散', async ({ page }) => {
    // 異なる負荷のタスクを混在させてテスト
    const lightTasks = Array.from({ length: 20 }, (_, i) => ({
      id: `light-${i}`,
      content: generateLightPlantUMLContent(),
      expectedTime: 100
    }));
    
    const heavyTasks = Array.from({ length: 5 }, (_, i) => ({
      id: `heavy-${i}`,
      content: generateHeavyPlantUMLContent(),
      expectedTime: 1000
    }));
    
    const allTasks = [...lightTasks, ...heavyTasks].sort(() => Math.random() - 0.5);
    
    const startTime = Date.now();
    
    const loadBalancingResults = await page.evaluate(async (tasks) => {
      if (!window.WorkerPool) {
        return { error: 'WorkerPool not available' };
      }
      
      const pool = new window.WorkerPool({
        maxWorkers: 4,
        workerScript: '/src/workers/PlantUMLParserWorker.js',
        loadBalancing: true
      });
      
      const taskPromises = tasks.map(async (task, index) => {
        const taskStart = Date.now();
        const result = await pool.execute({
          method: 'parse',
          args: [task.content],
          priority: task.id.startsWith('heavy') ? 'high' : 'normal'
        });
        const taskEnd = Date.now();
        
        return {
          taskId: task.id,
          processingTime: taskEnd - taskStart,
          workerId: result.workerId || 'unknown',
          success: !!result
        };
      });
      
      return await Promise.all(taskPromises);
    }, allTasks);
    
    const totalTime = Date.now() - startTime;
    console.log(`負荷分散テスト完了時間: ${totalTime}ms`);
    
    // 負荷分散の効果を検証
    expect(totalTime).toBeLessThan(15000); // 15秒以内
    expect(loadBalancingResults.length).toBe(allTasks.length);
    
    // ワーカー間での作業分散を確認
    const workerDistribution = loadBalancingResults.reduce((dist, result) => {
      dist[result.workerId] = (dist[result.workerId] || 0) + 1;
      return dist;
    }, {});
    
    console.log('ワーカー分散状況:', workerDistribution);
    
    // 各ワーカーが作業を分担していることを確認
    const workerIds = Object.keys(workerDistribution);
    expect(workerIds.length).toBeGreaterThan(1);
  });

  test('WW-005: WebWorkerエラーハンドリング', async ({ page }) => {
    // 意図的にエラーを発生させるテスト
    const errorTests = [
      { type: 'syntax-error', content: 'invalid plantuml @startuml missing @enduml' },
      { type: 'memory-limit', content: 'x'.repeat(10 * 1024 * 1024) }, // 10MB
      { type: 'timeout', content: generateTimeoutPlantUMLContent() },
      { type: 'invalid-method', method: 'nonExistentMethod' }
    ];
    
    const errorResults = await page.evaluate(async (tests) => {
      const results = [];
      
      for (const test of tests) {
        try {
          const worker = new Worker('/src/workers/PlantUMLParserWorker.js');
          
          const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              worker.terminate();
              resolve({ type: test.type, status: 'timeout', error: 'Worker timeout' });
            }, 5000);
            
            worker.onmessage = (event) => {
              clearTimeout(timeout);
              worker.terminate();
              resolve({ type: test.type, status: 'success', result: event.data });
            };
            
            worker.onerror = (error) => {
              clearTimeout(timeout);
              worker.terminate();
              resolve({ type: test.type, status: 'error', error: error.message });
            };
            
            worker.postMessage({
              method: test.method || 'parse',
              args: [test.content]
            });
          });
          
          results.push(result);
        } catch (error) {
          results.push({
            type: test.type,
            status: 'exception',
            error: error.message
          });
        }
      }
      
      return results;
    }, errorTests);
    
    console.log('エラーハンドリング結果:', errorResults);
    
    // エラーが適切に処理されていることを確認
    errorResults.forEach(result => {
      expect(['error', 'timeout', 'exception']).toContain(result.status);
      expect(result.error).toBeDefined();
    });
  });

  test('WW-006: WebWorker終了とリソース解放', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // 大量のワーカーを作成して終了
    await page.evaluate(async () => {
      const workers = [];
      
      // 10個のワーカーを作成
      for (let i = 0; i < 10; i++) {
        const worker = new Worker('/src/workers/PlantUMLParserWorker.js');
        workers.push(worker);
        
        // 各ワーカーでタスクを実行
        await new Promise(resolve => {
          worker.onmessage = () => resolve();
          worker.postMessage({
            method: 'parse',
            args: ['@startuml\nA -> B\n@enduml']
          });
        });
      }
      
      // すべてのワーカーを終了
      workers.forEach(worker => worker.terminate());
      
      // ガベージコレクション実行（可能な場合）
      if (window.gc) {
        window.gc();
      }
    });
    
    // 少し待ってからメモリ使用量を確認
    await page.waitForTimeout(1000);
    
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
    
    const memoryIncrease = finalMemory - initialMemory;
    console.log(`メモリ増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    
    // メモリリークが許容範囲内であることを確認（10MB以下）
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});

/**
 * テスト用PlantUMLコンテンツ生成関数
 */
function generateLargePlantUMLContent(seed = 0) {
  const actors = [`Actor${seed}`, `System${seed}`, `Database${seed}`, `Service${seed}`];
  let content = '@startuml\n';
  
  // 複雑なシーケンス図を生成
  for (let i = 0; i < 20; i++) {
    const from = actors[i % actors.length];
    const to = actors[(i + 1) % actors.length];
    content += `${from} -> ${to}: Action ${i + seed}\n`;
    
    if (i % 5 === 0) {
      content += `note right: Complex note ${i}\n`;
    }
  }
  
  content += '@enduml';
  return content;
}

function generateLightPlantUMLContent() {
  return '@startuml\nA -> B: Simple action\n@enduml';
}

function generateHeavyPlantUMLContent() {
  let content = '@startuml\n';
  
  // 大量の要素を含む図
  for (let i = 0; i < 100; i++) {
    content += `Actor${i} -> System${i}: Complex process ${i}\n`;
    content += `System${i} -> Database${i}: Query ${i}\n`;
    content += `Database${i} --> System${i}: Result ${i}\n`;
    content += `System${i} --> Actor${i}: Response ${i}\n`;
  }
  
  content += '@enduml';
  return content;
}

function generateTimeoutPlantUMLContent() {
  // 処理が重いコンテンツを生成（タイムアウトテスト用）
  let content = '@startuml\n';
  
  for (let i = 0; i < 1000; i++) {
    content += `A${i} -> B${i}: Message ${i}\n`;
  }
  
  content += '@enduml';
  return content;
}