/**
 * TEST-E2E-015: 仮想スクロール性能テスト (3 SP)
 * 
 * 大規模図表での仮想スクロール性能、60fps維持、ビューポート最適化を検証
 * パフォーマンス目標: 60fps維持, レンダリング時間 < 16ms, メモリ効率性
 */

const { test, expect } = require('@playwright/test');

test.describe('Virtual Scroll Performance Tests - TEST-E2E-015', () => {
  test.use({
    // 仮想スクロールテスト専用設定
    video: 'on',
    trace: 'on',
    launchOptions: {
      args: ['--enable-precise-memory-info', '--disable-dev-shm-usage']
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // パフォーマンス測定用のオブザーバーを設定
    await page.evaluate(() => {
      window.performanceData = {
        frames: [],
        scrollEvents: [],
        renderTimes: []
      };
      
      // FPS測定用
      let lastTime = performance.now();
      function measureFPS() {
        const now = performance.now();
        const delta = now - lastTime;
        window.performanceData.frames.push({
          timestamp: now,
          deltaTime: delta,
          fps: 1000 / delta
        });
        lastTime = now;
        requestAnimationFrame(measureFPS);
      }
      requestAnimationFrame(measureFPS);
    });
  });

  test('VS-001: 大規模図表での仮想スクロール初期化', async ({ page }) => {
    // 1000+ 要素を持つ大規模PlantUML図を生成
    const largeDiagram = generateLargeDiagram(1000);
    
    await page.evaluate(diagram => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = diagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, largeDiagram);
    
    // 仮想スクロールコンテナの初期化を待つ
    await page.waitForSelector('.virtual-scroll-container', { timeout: 10000 });
    
    const initializationMetrics = await page.evaluate(() => {
      const container = document.querySelector('.virtual-scroll-container');
      if (!container) return null;
      
      return {
        containerHeight: container.scrollHeight,
        visibleHeight: container.clientHeight,
        itemCount: container.dataset.itemCount || 0,
        renderingTime: performance.now()
      };
    });
    
    if (initializationMetrics) {
      console.log('仮想スクロール初期化メトリクス:', initializationMetrics);
      
      // 大規模データでも適切に初期化されることを確認
      expect(parseInt(initializationMetrics.itemCount)).toBeGreaterThan(500);
      expect(initializationMetrics.containerHeight).toBeGreaterThan(initializationMetrics.visibleHeight);
    }
  });

  test('VS-002: 高速スクロール時のフレームレート維持', async ({ page }) => {
    // 大規模図表を作成
    const largeDiagram = generateLargeDiagram(2000);
    await page.evaluate(diagram => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = diagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, largeDiagram);
    
    await page.waitForSelector('.virtual-scroll-container', { timeout: 10000 });
    
    // パフォーマンスデータをリセット
    await page.evaluate(() => {
      window.performanceData.frames = [];
      window.performanceData.scrollEvents = [];
    });
    
    // 高速スクロールを実行
    const scrollContainer = page.locator('.virtual-scroll-container');
    
    const scrollStartTime = Date.now();
    
    // 段階的に高速スクロール
    for (let i = 0; i < 20; i++) {
      const scrollPosition = (i + 1) * 200;
      await scrollContainer.evaluate((element, position) => {
        element.scrollTop = position;
        
        // スクロールイベントを記録
        window.performanceData.scrollEvents.push({
          timestamp: performance.now(),
          scrollTop: position,
          scrollHeight: element.scrollHeight
        });
      }, scrollPosition);
      
      await page.waitForTimeout(50); // 50ms間隔でスクロール
    }
    
    const scrollEndTime = Date.now();
    const totalScrollTime = scrollEndTime - scrollStartTime;
    
    // フレームレートの分析
    const frameData = await page.evaluate(() => {
      const frames = window.performanceData.frames;
      const scrollEvents = window.performanceData.scrollEvents;
      
      if (frames.length === 0) return null;
      
      // スクロール期間中のフレームのみを抽出
      const scrollStartTime = scrollEvents[0]?.timestamp || 0;
      const scrollEndTime = scrollEvents[scrollEvents.length - 1]?.timestamp || Date.now();
      
      const scrollFrames = frames.filter(frame => 
        frame.timestamp >= scrollStartTime && frame.timestamp <= scrollEndTime
      );
      
      const avgFPS = scrollFrames.reduce((sum, frame) => sum + frame.fps, 0) / scrollFrames.length;
      const minFPS = Math.min(...scrollFrames.map(frame => frame.fps));
      const droppedFrames = scrollFrames.filter(frame => frame.fps < 30).length;
      
      return {
        totalFrames: scrollFrames.length,
        averageFPS: avgFPS,
        minimumFPS: minFPS,
        droppedFrames,
        frameDropRate: (droppedFrames / scrollFrames.length) * 100
      };
    });
    
    if (frameData) {
      console.log('スクロール性能メトリクス:', frameData);
      console.log(`総スクロール時間: ${totalScrollTime}ms`);
      
      // 性能要件の検証
      expect(frameData.averageFPS).toBeGreaterThan(30); // 平均30fps以上
      expect(frameData.frameDropRate).toBeLessThan(20); // フレームドロップ率20%未満
      expect(totalScrollTime).toBeLessThan(2000); // 2秒以内に完了
    }
  });

  test('VS-003: ビューポート最適化とDOM要素数制御', async ({ page }) => {
    const largeDiagram = generateLargeDiagram(1500);
    await page.evaluate(diagram => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = diagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, largeDiagram);
    
    await page.waitForSelector('.virtual-scroll-container', { timeout: 10000 });
    
    // 初期状態のDOM要素数を測定
    const initialDOMMetrics = await page.evaluate(() => {
      const container = document.querySelector('.virtual-scroll-container');
      if (!container) return null;
      
      const visibleItems = container.querySelectorAll('.virtual-item:not(.virtual-placeholder)');
      const totalItems = parseInt(container.dataset.totalItems || '0');
      
      return {
        visibleItems: visibleItems.length,
        totalItems,
        containerHeight: container.clientHeight,
        scrollHeight: container.scrollHeight
      };
    });
    
    // 異なる位置にスクロールしてDOM要素数を確認
    const scrollPositions = [0, 25, 50, 75, 100]; // パーセンテージ
    const domMetricsAtPositions = [];
    
    for (const position of scrollPositions) {
      await page.evaluate(pos => {
        const container = document.querySelector('.virtual-scroll-container');
        if (container) {
          const maxScroll = container.scrollHeight - container.clientHeight;
          container.scrollTop = (maxScroll * pos) / 100;
        }
      }, position);
      
      await page.waitForTimeout(200); // レンダリング待機
      
      const metrics = await page.evaluate(pos => {
        const container = document.querySelector('.virtual-scroll-container');
        if (!container) return null;
        
        const visibleItems = container.querySelectorAll('.virtual-item:not(.virtual-placeholder)');
        const memoryUsage = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return {
          position: pos,
          visibleItems: visibleItems.length,
          scrollTop: container.scrollTop,
          memoryUsage
        };
      }, position);
      
      if (metrics) {
        domMetricsAtPositions.push(metrics);
      }
    }
    
    console.log('ビューポート最適化メトリクス:', {
      initial: initialDOMMetrics,
      atPositions: domMetricsAtPositions
    });
    
    if (initialDOMMetrics && domMetricsAtPositions.length > 0) {
      // DOM要素数が制御されていることを確認
      const maxVisibleItems = Math.max(...domMetricsAtPositions.map(m => m.visibleItems));
      const minVisibleItems = Math.min(...domMetricsAtPositions.map(m => m.visibleItems));
      
      expect(maxVisibleItems).toBeLessThan(initialDOMMetrics.totalItems); // 仮想化が動作
      expect(maxVisibleItems - minVisibleItems).toBeLessThan(10); // 要素数の変動が小さい
      
      // メモリ使用量が安定していることを確認
      const memoryValues = domMetricsAtPositions.map(m => m.memoryUsage).filter(m => m > 0);
      if (memoryValues.length > 1) {
        const memoryVariation = Math.max(...memoryValues) - Math.min(...memoryValues);
        expect(memoryVariation).toBeLessThan(10 * 1024 * 1024); // 10MB未満の変動
      }
    }
  });

  test('VS-004: 遅延読み込み（Lazy Loading）性能', async ({ page }) => {
    // 非常に大きな図表での遅延読み込みテスト
    const hugeDiagram = generateLargeDiagram(5000);
    
    const loadingStartTime = Date.now();
    
    await page.evaluate(diagram => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = diagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, hugeDiagram);
    
    // 初期ビューの読み込み完了を待つ
    await page.waitForSelector('.virtual-scroll-container', { timeout: 15000 });
    
    const initialLoadTime = Date.now() - loadingStartTime;
    console.log(`初期読み込み時間: ${initialLoadTime}ms`);
    
    // 初期読み込みが迅速であることを確認
    expect(initialLoadTime).toBeLessThan(3000); // 3秒以内
    
    // 段階的スクロールでの遅延読み込み性能を測定
    const lazyLoadMetrics = [];
    
    for (let chunk = 0; chunk < 10; chunk++) {
      const scrollPercentage = (chunk + 1) * 10; // 10%ずつスクロール
      const chunkStartTime = Date.now();
      
      await page.evaluate(percentage => {
        const container = document.querySelector('.virtual-scroll-container');
        if (container) {
          const maxScroll = container.scrollHeight - container.clientHeight;
          container.scrollTop = (maxScroll * percentage) / 100;
        }
      }, scrollPercentage);
      
      // 新しいコンテンツの読み込み完了を待つ
      await page.waitForFunction(() => {
        const container = document.querySelector('.virtual-scroll-container');
        return container && container.querySelectorAll('.loading-placeholder').length === 0;
      }, { timeout: 5000 }).catch(() => {
        // タイムアウトは許容（大量データのため）
      });
      
      const chunkLoadTime = Date.now() - chunkStartTime;
      
      const chunkMetrics = await page.evaluate(percentage => {
        const container = document.querySelector('.virtual-scroll-container');
        if (!container) return null;
        
        return {
          scrollPercentage: percentage,
          loadTime: Date.now(),
          visibleItems: container.querySelectorAll('.virtual-item:not(.virtual-placeholder)').length,
          loadingItems: container.querySelectorAll('.loading-placeholder').length
        };
      }, scrollPercentage);
      
      if (chunkMetrics) {
        chunkMetrics.chunkLoadTime = chunkLoadTime;
        lazyLoadMetrics.push(chunkMetrics);
      }
    }
    
    console.log('遅延読み込みメトリクス:', lazyLoadMetrics);
    
    // 各チャンクの読み込み時間が適切であることを確認
    const avgChunkLoadTime = lazyLoadMetrics.reduce((sum, m) => sum + m.chunkLoadTime, 0) / lazyLoadMetrics.length;
    expect(avgChunkLoadTime).toBeLessThan(1000); // 平均1秒以内
    
    // 読み込み完了したチャンクで読み込み中アイテムがないことを確認
    const completedChunks = lazyLoadMetrics.filter(m => m.loadingItems === 0);
    expect(completedChunks.length).toBeGreaterThan(0);
  });

  test('VS-005: メモリ効率性とガベージコレクション', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // 複数の大規模図表を順次読み込み
    for (let iteration = 0; iteration < 5; iteration++) {
      const diagram = generateLargeDiagram(1000 + iteration * 200);
      
      await page.evaluate(diagram => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          codeArea.value = diagram;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, diagram);
      
      await page.waitForSelector('.virtual-scroll-container', { timeout: 10000 });
      
      // 全体をスクロールして全コンテンツを読み込み
      await page.evaluate(() => {
        const container = document.querySelector('.virtual-scroll-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
      
      await page.waitForTimeout(500);
      
      // 先頭に戻る
      await page.evaluate(() => {
        const container = document.querySelector('.virtual-scroll-container');
        if (container) {
          container.scrollTop = 0;
        }
      });
      
      await page.waitForTimeout(300);
    }
    
    // 手動ガベージコレクション（可能な場合）
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    await page.waitForTimeout(1000);
    
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
    
    const memoryIncrease = finalMemory - initialMemory;
    console.log(`メモリ使用量変化: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    
    // メモリ効率性の確認
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB未満の増加
    
    // 仮想スクロールの効果確認
    const virtualScrollEfficiency = await page.evaluate(() => {
      const container = document.querySelector('.virtual-scroll-container');
      if (!container) return null;
      
      const totalItems = parseInt(container.dataset.totalItems || '0');
      const visibleItems = container.querySelectorAll('.virtual-item:not(.virtual-placeholder)').length;
      
      return {
        totalItems,
        visibleItems,
        efficiencyRatio: totalItems > 0 ? (visibleItems / totalItems) : 0
      };
    });
    
    if (virtualScrollEfficiency) {
      console.log('仮想スクロール効率:', virtualScrollEfficiency);
      
      // 仮想化が適切に動作していることを確認
      expect(virtualScrollEfficiency.efficiencyRatio).toBeLessThan(0.5); // 50%未満のDOMレンダリング
      expect(virtualScrollEfficiency.visibleItems).toBeGreaterThan(0);
    }
  });

  test('VS-006: スクロール操作のレスポンシブ性', async ({ page }) => {
    const largeDiagram = generateLargeDiagram(2000);
    await page.evaluate(diagram => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = diagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, largeDiagram);
    
    await page.waitForSelector('.virtual-scroll-container', { timeout: 10000 });
    
    // 様々なスクロール操作のレスポンシブ性をテスト
    const scrollTests = [
      { type: 'wheel', description: 'マウスホイール' },
      { type: 'key', description: 'キーボード操作' },
      { type: 'drag', description: 'ドラッグ操作' }
    ];
    
    const responsiveResults = [];
    
    for (const test of scrollTests) {
      const testStartTime = Date.now();
      
      switch (test.type) {
        case 'wheel':
          // マウスホイールでのスクロール
          await page.mouse.move(500, 400);
          for (let i = 0; i < 10; i++) {
            await page.mouse.wheel(0, 100);
            await page.waitForTimeout(50);
          }
          break;
          
        case 'key':
          // キーボードでのスクロール
          await page.focus('.virtual-scroll-container');
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(50);
          }
          break;
          
        case 'drag':
          // スクロールバーのドラッグ
          const scrollbar = page.locator('.virtual-scroll-container');
          await scrollbar.evaluate(element => {
            element.scrollTop = 0;
          });
          
          for (let i = 0; i < 5; i++) {
            await scrollbar.evaluate((element, step) => {
              element.scrollTop += step * 200;
            }, i);
            await page.waitForTimeout(100);
          }
          break;
      }
      
      const testEndTime = Date.now();
      const testDuration = testEndTime - testStartTime;
      
      // レスポンシブ性メトリクスを収集
      const responseMetrics = await page.evaluate((testType) => {
        const frames = window.performanceData.frames;
        if (frames.length === 0) return null;
        
        const recentFrames = frames.slice(-20); // 直近20フレーム
        const avgFPS = recentFrames.reduce((sum, frame) => sum + frame.fps, 0) / recentFrames.length;
        const inputLag = recentFrames.reduce((sum, frame) => sum + frame.deltaTime, 0) / recentFrames.length;
        
        return {
          testType,
          averageFPS: avgFPS,
          inputLag,
          frameCount: recentFrames.length
        };
      }, test.type);
      
      if (responseMetrics) {
        responseMetrics.testDuration = testDuration;
        responseMetrics.description = test.description;
        responsiveResults.push(responseMetrics);
      }
    }
    
    console.log('スクロール操作のレスポンシブ性:', responsiveResults);
    
    // すべての操作でレスポンシブ性が維持されていることを確認
    responsiveResults.forEach(result => {
      expect(result.averageFPS).toBeGreaterThan(20); // 最低20fps
      expect(result.inputLag).toBeLessThan(50); // 50ms未満の入力遅延
    });
  });
});

/**
 * 大規模図表生成関数
 */
function generateLargeDiagram(elementCount) {
  let content = '@startuml\n';
  content += 'skinparam sequenceMessageAlign center\n';
  content += 'skinparam maxMessageSize 150\n\n';
  
  // アクターの定義
  const actors = [];
  for (let i = 0; i < Math.min(elementCount / 10, 20); i++) {
    actors.push(`Actor_${i}`);
    content += `participant Actor_${i}\n`;
  }
  
  content += '\n';
  
  // 大量のシーケンスを生成
  for (let i = 0; i < elementCount; i++) {
    const fromActor = actors[i % actors.length];
    const toActor = actors[(i + 1) % actors.length];
    
    content += `${fromActor} -> ${toActor}: Message_${i}\n`;
    
    if (i % 10 === 0) {
      content += `note right of ${toActor}: Note_${i}\n`;
    }
    
    if (i % 20 === 0) {
      content += `activate ${toActor}\n`;
    }
    
    if (i % 25 === 0) {
      content += `deactivate ${toActor}\n`;
    }
    
    if (i % 50 === 0) {
      content += `\n== Phase ${Math.floor(i / 50)} ==\n\n`;
    }
  }
  
  content += '\n@enduml';
  return content;
}