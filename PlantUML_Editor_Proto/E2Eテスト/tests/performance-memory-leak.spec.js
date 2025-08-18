/**
 * TEST-E2E-016: メモリリーク検出テスト (5 SP)
 * 
 * 長時間実行セッション、メモリ配置追跡、ガベージコレクション検証、DOM・イベントリスナー管理を検証
 * パフォーマンス目標: メモリ増加率 < 5MB/時間, リークしきい値 < 10MB
 */

const { test, expect } = require('@playwright/test');

test.describe('Memory Leak Detection Tests - TEST-E2E-016', () => {
  test.use({
    // メモリリーク検出テスト専用設定
    video: 'on',
    trace: 'on',
    launchOptions: {
      args: [
        '--enable-precise-memory-info',
        '--js-flags=--expose-gc',
        '--disable-dev-shm-usage'
      ]
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // メモリ監視システムを初期化
    await page.evaluate(() => {
      window.memoryMonitor = {
        baseline: null,
        samples: [],
        eventListeners: new Set(),
        domNodes: new Set(),
        intervals: new Set(),
        
        // ベースラインメモリを記録
        recordBaseline() {
          if (performance.memory) {
            this.baseline = {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              limit: performance.memory.jsHeapSizeLimit,
              timestamp: Date.now()
            };
          }
        },
        
        // メモリサンプルを収集
        collectSample(label = '') {
          if (performance.memory) {
            const sample = {
              label,
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              timestamp: Date.now(),
              domNodeCount: document.querySelectorAll('*').length,
              eventListenerCount: this.eventListeners.size
            };
            this.samples.push(sample);
            return sample;
          }
          return null;
        },
        
        // イベントリスナーを追跡
        trackEventListener(target, event, listener) {
          const id = `${target.constructor.name}-${event}-${Date.now()}`;
          this.eventListeners.add(id);
          return id;
        },
        
        // DOMノードを追跡
        trackDOMNode(node) {
          const id = `${node.tagName}-${Date.now()}`;
          this.domNodes.add(id);
          return id;
        },
        
        // インターバルを追跡
        trackInterval(intervalId) {
          this.intervals.add(intervalId);
        },
        
        // メモリリークを分析
        analyzeLeaks() {
          if (this.samples.length < 2) return null;
          
          const first = this.samples[0];
          const last = this.samples[this.samples.length - 1];
          const timeDiff = last.timestamp - first.timestamp;
          const memoryDiff = last.used - first.used;
          
          return {
            totalSamples: this.samples.length,
            timespan: timeDiff,
            memoryIncrease: memoryDiff,
            leakRate: memoryDiff / (timeDiff / (1000 * 60 * 60)), // MB/hour
            averageMemory: this.samples.reduce((sum, s) => sum + s.used, 0) / this.samples.length,
            peakMemory: Math.max(...this.samples.map(s => s.used)),
            domNodeGrowth: last.domNodeCount - first.domNodeCount,
            samples: this.samples
          };
        }
      };
      
      window.memoryMonitor.recordBaseline();
    });
  });

  test('ML-001: 基本的なメモリリーク検出（30分間セッション）', async ({ page }) => {
    // 30分間の長時間セッションをシミュレート（テスト用に短縮）
    const sessionDuration = 60000; // 1分間（実際のテストでは30分）
    const sampleInterval = 5000; // 5秒間隔
    const samples = sessionDuration / sampleInterval;
    
    console.log(`メモリリーク検出テスト開始 - ${samples}サンプル`);
    
    // 初期メモリ状態を記録
    await page.evaluate(() => {
      window.memoryMonitor.collectSample('session-start');
    });
    
    // 定期的な操作とメモリ測定
    for (let i = 0; i < samples; i++) {
      const iterationStart = Date.now();
      
      // 様々な操作を実行
      await simulateUserActions(page, i);
      
      // メモリサンプルを収集
      const sample = await page.evaluate((iteration) => {
        if (window.gc) window.gc(); // 強制ガベージコレクション
        return window.memoryMonitor.collectSample(`iteration-${iteration}`);
      }, i);
      
      if (sample) {
        console.log(`Sample ${i}: ${(sample.used / 1024 / 1024).toFixed(2)} MB, DOM: ${sample.domNodeCount}`);
      }
      
      // 一定間隔を保つ
      const elapsed = Date.now() - iterationStart;
      const remaining = sampleInterval - elapsed;
      if (remaining > 0) {
        await page.waitForTimeout(remaining);
      }
    }
    
    // 最終メモリ状態を記録
    await page.evaluate(() => {
      window.memoryMonitor.collectSample('session-end');
    });
    
    // メモリリーク分析
    const leakAnalysis = await page.evaluate(() => {
      return window.memoryMonitor.analyzeLeaks();
    });
    
    console.log('メモリリーク分析結果:', leakAnalysis);
    
    if (leakAnalysis) {
      // メモリリーク閾値の検証
      expect(leakAnalysis.memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB未満
      expect(leakAnalysis.leakRate).toBeLessThan(5 * 1024 * 1024); // 5MB/時間未満
      expect(leakAnalysis.domNodeGrowth).toBeLessThan(1000); // DOM要素1000個未満の増加
    }
  });

  test('ML-002: DOM要素の適切な解放', async ({ page }) => {
    // DOM要素の作成と削除の繰り返し
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      // 大量のDOM要素を作成
      await page.evaluate((iteration) => {
        // コンテナを作成
        const container = document.createElement('div');
        container.id = `test-container-${iteration}`;
        container.className = 'memory-test-container';
        
        // 子要素を大量追加
        for (let j = 0; j < 100; j++) {
          const element = document.createElement('div');
          element.textContent = `Element ${iteration}-${j}`;
          element.dataset.iteration = iteration;
          element.dataset.index = j;
          
          // イベントリスナーを追加
          element.addEventListener('click', function() {
            console.log(`Clicked: ${iteration}-${j}`);
          });
          
          container.appendChild(element);
          window.memoryMonitor.trackDOMNode(element);
        }
        
        document.body.appendChild(container);
        window.memoryMonitor.trackDOMNode(container);
        
        // メモリサンプル収集
        window.memoryMonitor.collectSample(`dom-create-${iteration}`);
      }, i);
      
      await page.waitForTimeout(100);
      
      // DOM要素を削除
      await page.evaluate((iteration) => {
        const container = document.getElementById(`test-container-${iteration}`);
        if (container) {
          // イベントリスナーを手動で削除（テスト用）
          const elements = container.querySelectorAll('div');
          elements.forEach(element => {
            element.removeEventListener('click', element.clickHandler);
          });
          
          container.remove();
        }
        
        // ガベージコレクション実行
        if (window.gc) window.gc();
        
        // メモリサンプル収集
        window.memoryMonitor.collectSample(`dom-remove-${iteration}`);
      }, i);
      
      await page.waitForTimeout(100);
    }
    
    // 最終的なメモリ使用量をチェック
    const finalAnalysis = await page.evaluate(() => {
      // 強制的にガベージコレクション
      if (window.gc) {
        for (let i = 0; i < 5; i++) {
          window.gc();
        }
      }
      
      return window.memoryMonitor.analyzeLeaks();
    });
    
    console.log('DOM要素解放テスト結果:', finalAnalysis);
    
    if (finalAnalysis) {
      // DOM要素が適切に解放されていることを確認
      const memoryGrowthRate = finalAnalysis.memoryIncrease / finalAnalysis.timespan;
      expect(memoryGrowthRate).toBeLessThan(0.1); // 非常に小さな増加率
      
      // DOM要素数が初期状態に近いことを確認
      expect(Math.abs(finalAnalysis.domNodeGrowth)).toBeLessThan(200);
    }
  });

  test('ML-003: イベントリスナーのメモリリーク検出', async ({ page }) => {
    const listenerIterations = 100;
    
    // 大量のイベントリスナーを追加・削除
    for (let i = 0; i < listenerIterations; i++) {
      await page.evaluate((iteration) => {
        // テスト用要素を作成
        const element = document.createElement('button');
        element.id = `listener-test-${iteration}`;
        element.textContent = `Button ${iteration}`;
        document.body.appendChild(element);
        
        // 複数種類のイベントリスナーを追加
        const events = ['click', 'mouseover', 'mouseout', 'focus', 'blur'];
        const listeners = [];
        
        events.forEach(eventType => {
          const listener = function(e) {
            console.log(`${eventType} on button ${iteration}`);
          };
          
          element.addEventListener(eventType, listener);
          listeners.push({ type: eventType, listener });
          
          window.memoryMonitor.trackEventListener(element, eventType, listener);
        });
        
        // 要素にリスナー情報を保存
        element._testListeners = listeners;
        
        window.memoryMonitor.collectSample(`listeners-add-${iteration}`);
      }, i);
      
      await page.waitForTimeout(50);
      
      // イベントリスナーを削除
      await page.evaluate((iteration) => {
        const element = document.getElementById(`listener-test-${iteration}`);
        if (element && element._testListeners) {
          // リスナーを個別に削除
          element._testListeners.forEach(({ type, listener }) => {
            element.removeEventListener(type, listener);
          });
          
          // 要素を削除
          element.remove();
        }
        
        window.memoryMonitor.collectSample(`listeners-remove-${iteration}`);
      }, i);
      
      await page.waitForTimeout(50);
    }
    
    // 強制ガベージコレクション
    await page.evaluate(() => {
      if (window.gc) {
        for (let i = 0; i < 10; i++) {
          window.gc();
        }
      }
    });
    
    const listenerAnalysis = await page.evaluate(() => {
      return window.memoryMonitor.analyzeLeaks();
    });
    
    console.log('イベントリスナーメモリリーク分析:', listenerAnalysis);
    
    if (listenerAnalysis) {
      // イベントリスナーが適切に解放されていることを確認
      expect(listenerAnalysis.memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB未満
      
      // メモリ使用量の増加が線形でないことを確認（リークがない場合）
      const samples = listenerAnalysis.samples;
      if (samples.length > 10) {
        const midPoint = Math.floor(samples.length / 2);
        const firstHalf = samples.slice(0, midPoint);
        const secondHalf = samples.slice(midPoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.used, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.used, 0) / secondHalf.length;
        
        const growthRate = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
        expect(growthRate).toBeLessThan(0.5); // 50%未満の増加
      }
    }
  });

  test('ML-004: タイマーとインターバルのリーク検出', async ({ page }) => {
    const timerCount = 50;
    
    // 大量のタイマーを作成
    const timerIds = await page.evaluate((count) => {
      const intervals = [];
      const timeouts = [];
      
      // インターバルを作成
      for (let i = 0; i < count; i++) {
        const intervalId = setInterval(() => {
          // 軽い処理
          const dummy = new Date().getTime();
        }, 100);
        
        intervals.push(intervalId);
        window.memoryMonitor.trackInterval(intervalId);
      }
      
      // タイムアウトを作成
      for (let i = 0; i < count; i++) {
        const timeoutId = setTimeout(() => {
          // 軽い処理
          const dummy = new Date().getTime();
        }, 1000 + i * 100);
        
        timeouts.push(timeoutId);
      }
      
      window.memoryMonitor.collectSample('timers-created');
      
      return { intervals, timeouts };
    }, timerCount);
    
    // タイマーが動作している間のメモリ使用量を監視
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);
      
      await page.evaluate((iteration) => {
        window.memoryMonitor.collectSample(`timers-running-${iteration}`);
      }, i);
    }
    
    // タイマーをクリア
    await page.evaluate((timerIds) => {
      // インターバルをクリア
      timerIds.intervals.forEach(id => {
        clearInterval(id);
      });
      
      // タイムアウトをクリア
      timerIds.timeouts.forEach(id => {
        clearTimeout(id);
      });
      
      window.memoryMonitor.collectSample('timers-cleared');
      
      // ガベージコレクション
      if (window.gc) window.gc();
    }, timerIds);
    
    // クリア後のメモリ状態を確認
    await page.waitForTimeout(2000); // タイマーが完全に停止するのを待つ
    
    const timerAnalysis = await page.evaluate(() => {
      return window.memoryMonitor.analyzeLeaks();
    });
    
    console.log('タイマーメモリリーク分析:', timerAnalysis);
    
    if (timerAnalysis) {
      // タイマーが適切にクリアされていることを確認
      expect(timerAnalysis.memoryIncrease).toBeLessThan(3 * 1024 * 1024); // 3MB未満
      
      // 最後のサンプルが中間のサンプルより大幅に大きくないことを確認
      const samples = timerAnalysis.samples;
      if (samples.length > 5) {
        const lastSample = samples[samples.length - 1];
        const midSamples = samples.slice(2, -2);
        const midAverage = midSamples.reduce((sum, s) => sum + s.used, 0) / midSamples.length;
        
        const growthFromMid = (lastSample.used - midAverage) / midAverage;
        expect(growthFromMid).toBeLessThan(0.3); // 30%未満の増加
      }
    }
  });

  test('ML-005: WebWorkerメモリ管理', async ({ page }) => {
    const workerCount = 10;
    const taskPerWorker = 20;
    
    // WebWorkerを使用したメモリ管理テスト
    const workerMemoryTest = await page.evaluate(async (workerCount, taskCount) => {
      const workers = [];
      const results = [];
      
      // 初期メモリ状態
      window.memoryMonitor.collectSample('workers-init');
      
      // WebWorkerを作成
      for (let i = 0; i < workerCount; i++) {
        try {
          const worker = new Worker('/src/workers/PlantUMLParserWorker.js');
          workers.push(worker);
          
          // 各ワーカーで複数のタスクを実行
          for (let j = 0; j < taskCount; j++) {
            const taskPromise = new Promise((resolve) => {
              worker.onmessage = (event) => {
                resolve(event.data);
              };
              
              worker.postMessage({
                method: 'parse',
                args: [`@startuml\nA${i}_${j} -> B${i}_${j}: Task ${i}-${j}\n@enduml`]
              });
            });
            
            results.push(await taskPromise);
          }
          
          window.memoryMonitor.collectSample(`worker-${i}-completed`);
          
        } catch (error) {
          console.log(`Worker ${i} error:`, error.message);
        }
      }
      
      // すべてのワーカーを終了
      workers.forEach((worker, index) => {
        worker.terminate();
        window.memoryMonitor.collectSample(`worker-${index}-terminated`);
      });
      
      // ガベージコレクション
      if (window.gc) {
        for (let i = 0; i < 5; i++) {
          window.gc();
        }
      }
      
      window.memoryMonitor.collectSample('workers-cleanup');
      
      return {
        workerCount,
        taskCount,
        completedTasks: results.length
      };
    }, workerCount, taskPerWorker);
    
    const workerAnalysis = await page.evaluate(() => {
      return window.memoryMonitor.analyzeLeaks();
    });
    
    console.log('WebWorkerメモリテスト結果:', workerMemoryTest);
    console.log('WebWorkerメモリ分析:', workerAnalysis);
    
    if (workerAnalysis) {
      // WebWorkerが適切に終了してメモリが解放されていることを確認
      expect(workerAnalysis.memoryIncrease).toBeLessThan(15 * 1024 * 1024); // 15MB未満
      
      // タスク完了率の確認
      const expectedTasks = workerCount * taskPerWorker;
      expect(workerMemoryTest.completedTasks).toBeGreaterThan(expectedTasks * 0.8); // 80%以上完了
    }
  });

  test('ML-006: 長時間実行耐久テスト', async ({ page }) => {
    // 長時間実行をシミュレート（実際の4時間を短縮）
    const testDuration = 120000; // 2分間（実際は4時間）
    const actionInterval = 5000; // 5秒間隔
    const actions = testDuration / actionInterval;
    
    console.log(`長時間実行耐久テスト開始 - ${actions}アクション`);
    
    let memoryTrend = [];
    
    for (let i = 0; i < actions; i++) {
      const actionStart = Date.now();
      
      // 多様な操作を実行
      await performExtensiveUserSimulation(page, i);
      
      // メモリ状態を記録
      const memoryState = await page.evaluate((actionIndex) => {
        // 強制ガベージコレクション（定期的に）
        if (actionIndex % 5 === 0 && window.gc) {
          window.gc();
        }
        
        const sample = window.memoryMonitor.collectSample(`endurance-${actionIndex}`);
        
        return {
          actionIndex,
          memory: sample,
          timestamp: Date.now()
        };
      }, i);
      
      if (memoryState.memory) {
        memoryTrend.push(memoryState);
        
        const memoryMB = (memoryState.memory.used / 1024 / 1024).toFixed(2);
        console.log(`Action ${i}: ${memoryMB} MB, DOM: ${memoryState.memory.domNodeCount}`);
      }
      
      // メモリ使用量が危険レベルに達していないかチェック
      if (memoryState.memory && memoryState.memory.used > 200 * 1024 * 1024) { // 200MB
        console.warn(`高いメモリ使用量を検出: ${(memoryState.memory.used / 1024 / 1024).toFixed(2)} MB`);
      }
      
      // 一定間隔を保つ
      const elapsed = Date.now() - actionStart;
      const remaining = actionInterval - elapsed;
      if (remaining > 0) {
        await page.waitForTimeout(remaining);
      }
    }
    
    // 耐久テスト分析
    const enduranceAnalysis = await page.evaluate(() => {
      return window.memoryMonitor.analyzeLeaks();
    });
    
    console.log('長時間実行耐久テスト分析:', enduranceAnalysis);
    
    if (enduranceAnalysis) {
      // 長時間実行でのメモリ安定性を確認
      expect(enduranceAnalysis.memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB未満
      expect(enduranceAnalysis.leakRate).toBeLessThan(10 * 1024 * 1024); // 10MB/時間未満
      
      // メモリ使用量の変動パターンを分析
      if (memoryTrend.length > 10) {
        const memoryValues = memoryTrend.map(t => t.memory.used);
        const maxMemory = Math.max(...memoryValues);
        const minMemory = Math.min(...memoryValues);
        const memoryVariance = maxMemory - minMemory;
        
        console.log(`メモリ使用量の変動: ${(memoryVariance / 1024 / 1024).toFixed(2)} MB`);
        
        // 過度な変動がないことを確認
        expect(memoryVariance).toBeLessThan(100 * 1024 * 1024); // 100MB未満の変動
      }
    }
  });
});

/**
 * ユーザーアクションのシミュレーション
 */
async function simulateUserActions(page, iteration) {
  const actions = [
    // PlantUMLコードの編集
    async () => {
      await page.evaluate((iter) => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          codeArea.value = `@startuml\nA${iter} -> B${iter}: Message ${iter}\n@enduml`;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, iteration);
    },
    
    // アクターの追加
    async () => {
      const actors = ['顧客', '管理者', 'システム', 'データベース'];
      const actor = actors[iteration % actors.length];
      await page.click(`button:has-text("${actor}")`, { timeout: 5000 }).catch(() => {});
    },
    
    // プレビューの更新
    async () => {
      await page.click('button:has-text("プレビュー更新")', { timeout: 5000 }).catch(() => {});
    },
    
    // クリア操作
    async () => {
      if (iteration % 10 === 0) {
        await page.click('button:has-text("クリア")', { timeout: 5000 }).catch(() => {});
        page.on('dialog', dialog => dialog.accept());
      }
    }
  ];
  
  // ランダムにアクションを実行
  const action = actions[iteration % actions.length];
  try {
    await action();
  } catch (error) {
    console.log(`Action ${iteration} failed:`, error.message);
  }
}

/**
 * 包括的なユーザーシミュレーション
 */
async function performExtensiveUserSimulation(page, iteration) {
  const simulations = [
    // 大規模図表の作成
    async () => {
      const largeDiagram = generateComplexDiagram(iteration);
      await page.evaluate(diagram => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          codeArea.value = diagram;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, largeDiagram);
    },
    
    // 多重操作
    async () => {
      for (let i = 0; i < 5; i++) {
        await simulateUserActions(page, iteration * 5 + i);
        await page.waitForTimeout(100);
      }
    },
    
    // パターン選択
    async () => {
      await page.click('button:has-text("パターン選択")', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
      await page.click('.pattern-card button', { timeout: 5000 }).catch(() => {});
    }
  ];
  
  const simulation = simulations[iteration % simulations.length];
  try {
    await simulation();
  } catch (error) {
    console.log(`Simulation ${iteration} failed:`, error.message);
  }
}

/**
 * 複雑な図表生成
 */
function generateComplexDiagram(seed) {
  const actors = [`A${seed}`, `B${seed}`, `C${seed}`, `D${seed}`];
  let diagram = '@startuml\n';
  
  actors.forEach(actor => {
    diagram += `participant ${actor}\n`;
  });
  
  for (let i = 0; i < 20; i++) {
    const from = actors[i % actors.length];
    const to = actors[(i + 1) % actors.length];
    diagram += `${from} -> ${to}: Action ${seed}-${i}\n`;
  }
  
  diagram += '@enduml';
  return diagram;
}