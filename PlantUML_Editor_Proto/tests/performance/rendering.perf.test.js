/**
 * rendering.perf.test.js - レンダリング最適化パフォーマンステスト
 * TEST-004: パフォーマンステスト - レンダリング最適化
 * 
 * 測定項目:
 * - 初期ロード時間
 * - ユーザー操作応答時間
 * - バッチ更新効率
 * - DOM操作最適化
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// Mock requestAnimationFrame and related APIs
let rafId = 0;
global.requestAnimationFrame = jest.fn((callback) => {
  rafId++;
  setTimeout(callback, 16.67); // 60FPS
  return rafId;
});

global.cancelAnimationFrame = jest.fn();

// Mock performance APIs
if (!global.performance.mark) {
  global.performance.mark = jest.fn();
}

if (!global.performance.measure) {
  global.performance.measure = jest.fn();
}

if (!global.performance.getEntriesByType) {
  global.performance.getEntriesByType = jest.fn().mockReturnValue([]);
}

// レンダリングマネージャーの実装
class RenderingManager {
  constructor(container) {
    this.container = container;
    this.renderQueue = [];
    this.batchQueue = [];
    this.isRendering = false;
    this.frameScheduled = false;
    this.renderingMetrics = {
      frameCount: 0,
      totalRenderTime: 0,
      batchCount: 0,
      domUpdates: 0
    };
    this.performanceObserver = null;
    this.setupPerformanceObserver();
  }

  setupPerformanceObserver() {
    // Simulate performance observer
    this.performanceObserver = {
      observe: jest.fn(),
      disconnect: jest.fn()
    };
  }

  scheduleRender(renderFunction, priority = 'normal') {
    const renderTask = {
      id: Math.random().toString(36).substr(2, 9),
      function: renderFunction,
      priority,
      timestamp: performance.now(),
      executed: false
    };

    this.renderQueue.push(renderTask);
    this.scheduleFrame();
    
    return renderTask.id;
  }

  scheduleFrame() {
    if (this.frameScheduled) return;

    this.frameScheduled = true;
    requestAnimationFrame(() => {
      this.executeRenderFrame();
      this.frameScheduled = false;
    });
  }

  executeRenderFrame() {
    const frameStartTime = performance.now();
    this.isRendering = true;

    // Sort by priority
    this.renderQueue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    // Execute render tasks within frame budget (16ms)
    const frameBudget = 16;
    let usedTime = 0;

    while (this.renderQueue.length > 0 && usedTime < frameBudget) {
      const task = this.renderQueue.shift();
      const taskStartTime = performance.now();

      try {
        task.function();
        task.executed = true;
        this.renderingMetrics.domUpdates++;
      } catch (error) {
        console.error('Render task error:', error);
      }

      usedTime += performance.now() - taskStartTime;
    }

    const frameEndTime = performance.now();
    const frameTime = frameEndTime - frameStartTime;
    
    this.renderingMetrics.frameCount++;
    this.renderingMetrics.totalRenderTime += frameTime;
    this.isRendering = false;

    // Schedule next frame if queue not empty
    if (this.renderQueue.length > 0) {
      this.scheduleFrame();
    }
  }

  batchUpdate(updates) {
    const batchId = Math.random().toString(36).substr(2, 9);
    const batchStartTime = performance.now();

    this.batchQueue.push({
      id: batchId,
      updates,
      timestamp: batchStartTime
    });

    this.scheduleRender(() => {
      this.executeBatch(batchId);
    }, 'high');

    return batchId;
  }

  executeBatch(batchId) {
    const batch = this.batchQueue.find(b => b.id === batchId);
    if (!batch) return;

    const batchStartTime = performance.now();

    // Group updates by type for optimization
    const groupedUpdates = this.groupUpdatesByType(batch.updates);

    // Execute grouped updates
    Object.entries(groupedUpdates).forEach(([type, updates]) => {
      this.executeGroupedUpdates(type, updates);
    });

    const batchEndTime = performance.now();
    this.renderingMetrics.batchCount++;

    // Remove executed batch
    const batchIndex = this.batchQueue.findIndex(b => b.id === batchId);
    if (batchIndex > -1) {
      this.batchQueue.splice(batchIndex, 1);
    }
  }

  groupUpdatesByType(updates) {
    const grouped = {};
    
    updates.forEach(update => {
      if (!grouped[update.type]) {
        grouped[update.type] = [];
      }
      grouped[update.type].push(update);
    });

    return grouped;
  }

  executeGroupedUpdates(type, updates) {
    switch (type) {
      case 'style':
        this.executeStyleUpdates(updates);
        break;
      case 'content':
        this.executeContentUpdates(updates);
        break;
      case 'attribute':
        this.executeAttributeUpdates(updates);
        break;
      case 'class':
        this.executeClassUpdates(updates);
        break;
      default:
        updates.forEach(update => this.executeGenericUpdate(update));
    }
  }

  executeStyleUpdates(updates) {
    // Batch style updates to minimize reflows
    updates.forEach(update => {
      const element = this.container.querySelector(update.selector);
      if (element && update.styles) {
        Object.assign(element.style, update.styles);
      }
    });
  }

  executeContentUpdates(updates) {
    // Use DocumentFragment for efficient DOM updates
    const fragment = document.createDocumentFragment();
    
    updates.forEach(update => {
      const element = this.container.querySelector(update.selector);
      if (element) {
        if (update.content) {
          element.textContent = update.content;
        }
        if (update.html) {
          element.innerHTML = update.html;
        }
      }
    });
  }

  executeAttributeUpdates(updates) {
    updates.forEach(update => {
      const element = this.container.querySelector(update.selector);
      if (element && update.attributes) {
        Object.entries(update.attributes).forEach(([attr, value]) => {
          element.setAttribute(attr, value);
        });
      }
    });
  }

  executeClassUpdates(updates) {
    updates.forEach(update => {
      const element = this.container.querySelector(update.selector);
      if (element) {
        if (update.add) {
          element.classList.add(...update.add);
        }
        if (update.remove) {
          element.classList.remove(...update.remove);
        }
        if (update.toggle) {
          update.toggle.forEach(cls => element.classList.toggle(cls));
        }
      }
    });
  }

  executeGenericUpdate(update) {
    // Fallback for custom updates
    if (update.execute && typeof update.execute === 'function') {
      update.execute();
    }
  }

  measureRenderingPerformance() {
    const avgFrameTime = this.renderingMetrics.frameCount > 0
      ? this.renderingMetrics.totalRenderTime / this.renderingMetrics.frameCount
      : 0;

    return {
      ...this.renderingMetrics,
      averageFrameTime: avgFrameTime,
      fps: avgFrameTime > 0 ? 1000 / avgFrameTime : 0,
      queueLength: this.renderQueue.length,
      batchQueueLength: this.batchQueue.length
    };
  }

  optimizeRendering() {
    // Remove duplicate render tasks
    const uniqueTasks = new Map();
    this.renderQueue = this.renderQueue.filter(task => {
      const key = task.function.toString();
      if (uniqueTasks.has(key)) {
        return false;
      }
      uniqueTasks.set(key, true);
      return true;
    });

    // Merge similar batch updates
    this.mergeSimilarBatches();
  }

  mergeSimilarBatches() {
    const mergedBatches = new Map();
    
    this.batchQueue.forEach(batch => {
      const key = this.generateBatchKey(batch.updates);
      if (mergedBatches.has(key)) {
        const existingBatch = mergedBatches.get(key);
        existingBatch.updates.push(...batch.updates);
      } else {
        mergedBatches.set(key, { ...batch });
      }
    });

    this.batchQueue = Array.from(mergedBatches.values());
  }

  generateBatchKey(updates) {
    // Generate key based on update types and selectors
    const types = updates.map(u => u.type).sort();
    const selectors = updates.map(u => u.selector).sort();
    return `${types.join(',')}-${selectors.join(',')}`;
  }

  destroy() {
    this.renderQueue = [];
    this.batchQueue = [];
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

describe('レンダリング最適化パフォーマンステスト', () => {
  let container;
  let renderingManager;
  let performanceMonitor;

  beforeEach(() => {
    // DOM環境セットアップ
    document.body.innerHTML = `
      <div id="rendering-test-container">
        <div id="editor-area">
          <div class="editor-panel" id="action-panel">
            <div class="editor-content"></div>
            <div class="editor-toolbar"></div>
          </div>
          <div class="editor-panel" id="condition-panel">
            <div class="editor-content"></div>
            <div class="editor-toolbar"></div>
          </div>
        </div>
        <div id="output-area">
          <div id="plantuml-output"></div>
          <div id="preview-panel"></div>
        </div>
        <div id="status-bar">
          <span id="status-text">Ready</span>
          <div id="progress-bar"></div>
        </div>
      </div>
    `;

    container = document.getElementById('rendering-test-container');
    renderingManager = new RenderingManager(container);

    performanceMonitor = {
      measurements: new Map(),
      
      startMeasurement(name) {
        this.measurements.set(name, {
          startTime: performance.now(),
          endTime: null,
          duration: null
        });
      },
      
      endMeasurement(name) {
        const measurement = this.measurements.get(name);
        if (measurement) {
          measurement.endTime = performance.now();
          measurement.duration = measurement.endTime - measurement.startTime;
        }
        return measurement?.duration || 0;
      },
      
      getMeasurement(name) {
        return this.measurements.get(name);
      },
      
      getAllMeasurements() {
        return Array.from(this.measurements.entries()).map(([name, data]) => ({
          name,
          ...data
        }));
      },
      
      reset() {
        this.measurements.clear();
      }
    };
  });

  afterEach(() => {
    renderingManager.destroy();
    document.body.innerHTML = '';
    performanceMonitor.reset();
  });

  describe('初期ロード時間テスト', () => {
    test('基本UIコンポーネントの初期レンダリング', async () => {
      performanceMonitor.startMeasurement('initialRender');

      // エディターパネルの初期化
      const editorPanels = container.querySelectorAll('.editor-panel');
      
      const renderTasks = Array.from(editorPanels).map((panel, index) => {
        return () => {
          // エディターコンテンツを作成
          const content = panel.querySelector('.editor-content');
          content.innerHTML = `
            <div class="editor-header">エディター ${index + 1}</div>
            <div class="editor-body">
              <textarea class="editor-input" placeholder="入力してください"></textarea>
              <div class="editor-output"></div>
            </div>
          `;

          // ツールバーを作成
          const toolbar = panel.querySelector('.editor-toolbar');
          toolbar.innerHTML = `
            <button class="btn-save">保存</button>
            <button class="btn-clear">クリア</button>
            <button class="btn-export">エクスポート</button>
          `;
        };
      });

      // 出力エリアの初期化
      renderTasks.push(() => {
        const output = container.querySelector('#plantuml-output');
        output.innerHTML = `
          <div class="output-header">PlantUML出力</div>
          <textarea class="plantuml-code" readonly></textarea>
        `;

        const preview = container.querySelector('#preview-panel');
        preview.innerHTML = `
          <div class="preview-header">プレビュー</div>
          <div class="preview-content">
            <canvas id="preview-canvas" width="400" height="300"></canvas>
          </div>
        `;
      });

      // ステータスバーの初期化
      renderTasks.push(() => {
        const statusText = container.querySelector('#status-text');
        statusText.textContent = '初期化完了';

        const progressBar = container.querySelector('#progress-bar');
        progressBar.innerHTML = '<div class="progress-fill" style="width: 100%"></div>';
      });

      // 全てのレンダリングタスクをスケジュール
      const taskPromises = renderTasks.map(task => {
        return new Promise(resolve => {
          renderingManager.scheduleRender(() => {
            task();
            resolve();
          }, 'high');
        });
      });

      await Promise.all(taskPromises);
      
      // レンダリング完了まで待機
      await new Promise(resolve => setTimeout(resolve, 100));

      const initialRenderTime = performanceMonitor.endMeasurement('initialRender');

      // 初期レンダリングが500ms以内であることを確認
      expect(initialRenderTime).toBeLessThan(500);

      const metrics = renderingManager.measureRenderingPerformance();
      expect(metrics.domUpdates).toBeGreaterThan(0);
      expect(metrics.averageFrameTime).toBeLessThan(16); // 60FPS target
    });

    test('大量データを含む初期レンダリング', async () => {
      performanceMonitor.startMeasurement('heavyInitialRender');

      // 大量のダミーデータを作成
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `アイテム${i}`,
        description: `説明文${i}`.repeat(10),
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          tags: [`tag1-${i}`, `tag2-${i}`, `tag3-${i}`]
        }
      }));

      // 仮想スクロールリストのレンダリング
      const renderLargeList = () => {
        const editorContent = container.querySelector('#action-panel .editor-content');
        
        // ヘッダー作成
        const header = document.createElement('div');
        header.className = 'large-list-header';
        header.innerHTML = `
          <h3>大量データリスト (${largeDataset.length}件)</h3>
          <div class="list-controls">
            <input type="text" placeholder="検索..." class="search-input">
            <select class="filter-select">
              <option value="">全て</option>
              <option value="recent">最近の項目</option>
            </select>
          </div>
        `;

        // 仮想スクロールコンテナ作成
        const virtualContainer = document.createElement('div');
        virtualContainer.className = 'virtual-scroll-container';
        virtualContainer.style.height = '400px';
        virtualContainer.style.overflow = 'auto';

        // 最初の50件のみレンダリング（仮想スクロール）
        const visibleItems = largeDataset.slice(0, 50);
        const listContent = document.createElement('div');
        listContent.className = 'virtual-list-content';

        visibleItems.forEach(item => {
          const itemElement = document.createElement('div');
          itemElement.className = 'list-item';
          itemElement.innerHTML = `
            <div class="item-header">
              <span class="item-name">${item.name}</span>
              <span class="item-id">#${item.id}</span>
            </div>
            <div class="item-description">${item.description}</div>
            <div class="item-tags">
              ${item.metadata.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          `;
          listContent.appendChild(itemElement);
        });

        virtualContainer.appendChild(listContent);
        editorContent.innerHTML = '';
        editorContent.appendChild(header);
        editorContent.appendChild(virtualContainer);
      };

      renderingManager.scheduleRender(renderLargeList, 'high');

      // レンダリング完了まで待機
      await new Promise(resolve => setTimeout(resolve, 200));

      const heavyRenderTime = performanceMonitor.endMeasurement('heavyInitialRender');

      // 大量データでも1秒以内でレンダリング完了
      expect(heavyRenderTime).toBeLessThan(1000);

      const metrics = renderingManager.measureRenderingPerformance();
      expect(metrics.fps).toBeGreaterThan(30); // 最低30FPS維持
    });
  });

  describe('ユーザー操作応答時間テスト', () => {
    test('テキスト入力時の応答性', async () => {
      // テキストエリアを準備
      const textarea = container.querySelector('.editor-input') || 
                      container.appendChild(document.createElement('textarea'));
      textarea.className = 'editor-input';

      const inputResponses = [];

      // 連続入力をシミュレート
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();

        // 入力イベントをシミュレート
        const inputValue = `テスト入力${i}：システムがユーザーに応答する`;
        
        renderingManager.scheduleRender(() => {
          textarea.value = inputValue;
          
          // リアルタイム変換処理をシミュレート
          const outputArea = container.querySelector('#plantuml-output .plantuml-code');
          if (outputArea) {
            outputArea.value = `@startuml\nparticipant User\nparticipant System\nUser -> System : ${inputValue}\n@enduml`;
          }

          // 文字数カウンター更新
          const statusText = container.querySelector('#status-text');
          if (statusText) {
            statusText.textContent = `文字数: ${inputValue.length}`;
          }
        }, 'high');

        await new Promise(resolve => requestAnimationFrame(resolve));

        const endTime = performance.now();
        inputResponses.push(endTime - startTime);
      }

      const averageResponseTime = inputResponses.reduce((a, b) => a + b, 0) / inputResponses.length;
      const maxResponseTime = Math.max(...inputResponses);

      // 平均応答時間が20ms以下
      expect(averageResponseTime).toBeLessThan(20);
      
      // 最大応答時間が50ms以下
      expect(maxResponseTime).toBeLessThan(50);
    });

    test('ボタンクリック操作の応答性', async () => {
      // ボタンを準備
      const buttonsContainer = container.querySelector('.editor-toolbar') ||
                              container.appendChild(document.createElement('div'));
      buttonsContainer.className = 'editor-toolbar';
      buttonsContainer.innerHTML = `
        <button id="btn-save" class="toolbar-btn">保存</button>
        <button id="btn-clear" class="toolbar-btn">クリア</button>
        <button id="btn-export" class="toolbar-btn">エクスポート</button>
        <button id="btn-import" class="toolbar-btn">インポート</button>
      `;

      const clickResponses = [];

      // 各ボタンのクリック処理をテスト
      const buttons = buttonsContainer.querySelectorAll('.toolbar-btn');
      
      for (const button of buttons) {
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();

          // クリック処理をシミュレート
          renderingManager.scheduleRender(() => {
            // ボタンの視覚的フィードバック
            button.classList.add('clicked');
            setTimeout(() => button.classList.remove('clicked'), 100);

            // ボタン固有の処理
            switch (button.id) {
              case 'btn-save':
                container.querySelector('#status-text').textContent = '保存中...';
                break;
              case 'btn-clear':
                const textarea = container.querySelector('.editor-input');
                if (textarea) textarea.value = '';
                break;
              case 'btn-export':
                container.querySelector('#status-text').textContent = 'エクスポート中...';
                break;
              case 'btn-import':
                container.querySelector('#status-text').textContent = 'インポート中...';
                break;
            }
          }, 'high');

          await new Promise(resolve => requestAnimationFrame(resolve));

          const endTime = performance.now();
          clickResponses.push(endTime - startTime);
        }
      }

      const averageClickResponse = clickResponses.reduce((a, b) => a + b, 0) / clickResponses.length;

      // クリック応答時間が15ms以下
      expect(averageClickResponse).toBeLessThan(15);
    });

    test('スクロール操作の滑らかさ', async () => {
      // スクロール可能なコンテンツを作成
      const scrollContainer = container.querySelector('#editor-area') ||
                             container.appendChild(document.createElement('div'));
      scrollContainer.style.height = '300px';
      scrollContainer.style.overflow = 'auto';

      // 大量のコンテンツを追加
      const scrollContent = document.createElement('div');
      scrollContent.style.height = '2000px';
      
      for (let i = 0; i < 100; i++) {
        const item = document.createElement('div');
        item.className = 'scroll-item';
        item.style.height = '20px';
        item.textContent = `スクロールアイテム ${i}`;
        scrollContent.appendChild(item);
      }
      
      scrollContainer.appendChild(scrollContent);

      const scrollFrames = [];

      // スクロールイベントをシミュレート
      for (let scrollTop = 0; scrollTop <= 1000; scrollTop += 50) {
        const frameStart = performance.now();

        renderingManager.scheduleRender(() => {
          scrollContainer.scrollTop = scrollTop;
          
          // スクロール位置に応じた追加処理
          const visibleItems = scrollContainer.querySelectorAll('.scroll-item');
          visibleItems.forEach((item, index) => {
            const itemTop = index * 20;
            const isVisible = itemTop >= scrollTop && itemTop <= scrollTop + 300;
            
            if (isVisible) {
              item.style.backgroundColor = '#f0f0f0';
            } else {
              item.style.backgroundColor = 'transparent';
            }
          });
        }, 'normal');

        await new Promise(resolve => requestAnimationFrame(resolve));

        const frameEnd = performance.now();
        scrollFrames.push(frameEnd - frameStart);
      }

      const averageScrollFrame = scrollFrames.reduce((a, b) => a + b, 0) / scrollFrames.length;

      // スクロールフレーム時間が16ms以下（60FPS）
      expect(averageScrollFrame).toBeLessThan(16);
    });
  });

  describe('バッチ更新効率テスト', () => {
    test('複数要素の同時スタイル更新', async () => {
      // テスト用要素を作成
      const testElements = [];
      for (let i = 0; i < 100; i++) {
        const element = document.createElement('div');
        element.id = `test-element-${i}`;
        element.className = 'test-element';
        element.textContent = `テスト要素 ${i}`;
        container.appendChild(element);
        testElements.push(element);
      }

      performanceMonitor.startMeasurement('batchStyleUpdate');

      // バッチ更新を実行
      const styleUpdates = testElements.map((element, index) => ({
        type: 'style',
        selector: `#test-element-${index}`,
        styles: {
          backgroundColor: index % 2 === 0 ? '#ffeeee' : '#eeffee',
          color: index % 3 === 0 ? '#333' : '#666',
          padding: '5px',
          margin: '2px',
          borderRadius: '3px'
        }
      }));

      const batchId = renderingManager.batchUpdate(styleUpdates);

      // バッチ更新完了まで待機
      await new Promise(resolve => {
        const checkBatch = () => {
          const metrics = renderingManager.measureRenderingPerformance();
          if (metrics.batchCount > 0) {
            resolve();
          } else {
            setTimeout(checkBatch, 10);
          }
        };
        checkBatch();
      });

      const batchUpdateTime = performanceMonitor.endMeasurement('batchStyleUpdate');

      // 100要素のスタイル更新が100ms以内
      expect(batchUpdateTime).toBeLessThan(100);

      // クリーンアップ
      testElements.forEach(element => element.remove());
    });

    test('大量のDOM要素追加のバッチ処理', async () => {
      const targetContainer = container.querySelector('#editor-area') ||
                             container.appendChild(document.createElement('div'));

      performanceMonitor.startMeasurement('batchDOMAddition');

      // 500個の要素を追加するバッチ更新
      const additionUpdates = Array.from({ length: 500 }, (_, index) => ({
        type: 'content',
        selector: '#editor-area',
        execute: () => {
          const newElement = document.createElement('div');
          newElement.className = 'batch-added-element';
          newElement.innerHTML = `
            <div class="element-header">要素 ${index}</div>
            <div class="element-content">
              <span class="element-text">バッチ追加された要素です</span>
              <button class="element-btn">アクション</button>
            </div>
          `;
          targetContainer.appendChild(newElement);
        }
      }));

      renderingManager.batchUpdate(additionUpdates);

      // バッチ処理完了まで待機
      await new Promise(resolve => setTimeout(resolve, 300));

      const batchAdditionTime = performanceMonitor.endMeasurement('batchDOMAddition');

      // 500要素の追加が500ms以内
      expect(batchAdditionTime).toBeLessThan(500);

      const addedElements = targetContainer.querySelectorAll('.batch-added-element');
      expect(addedElements.length).toBe(500);
    });

    test('混合更新タイプのバッチ最適化', async () => {
      // 様々なタイプの更新を混合
      const mixedUpdates = [
        // スタイル更新
        ...Array.from({ length: 20 }, (_, i) => ({
          type: 'style',
          selector: `.editor-panel:nth-child(${(i % 2) + 1})`,
          styles: { opacity: (i % 10) / 10 }
        })),
        
        // コンテンツ更新
        ...Array.from({ length: 15 }, (_, i) => ({
          type: 'content',
          selector: '#status-text',
          content: `ステータス更新 ${i}`
        })),
        
        // 属性更新
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'attribute',
          selector: '.editor-input',
          attributes: { placeholder: `入力${i}...` }
        })),
        
        // クラス更新
        ...Array.from({ length: 25 }, (_, i) => ({
          type: 'class',
          selector: '.toolbar-btn',
          add: i % 2 === 0 ? ['active'] : [],
          remove: i % 2 === 1 ? ['active'] : []
        }))
      ];

      performanceMonitor.startMeasurement('mixedBatchUpdate');

      renderingManager.batchUpdate(mixedUpdates);

      await new Promise(resolve => setTimeout(resolve, 200));

      const mixedUpdateTime = performanceMonitor.endMeasurement('mixedBatchUpdate');

      // 混合バッチ更新が200ms以内
      expect(mixedUpdateTime).toBeLessThan(200);

      const metrics = renderingManager.measureRenderingPerformance();
      expect(metrics.batchCount).toBeGreaterThan(0);
    });
  });

  describe('レンダリング最適化効果テスト', () => {
    test('重複レンダリングタスクの除去', async () => {
      // 同じ処理を複数回スケジュール
      const duplicateTask = () => {
        const statusText = container.querySelector('#status-text');
        if (statusText) {
          statusText.textContent = '重複タスク実行';
        }
      };

      // 同じタスクを10回スケジュール
      const taskIds = [];
      for (let i = 0; i < 10; i++) {
        const taskId = renderingManager.scheduleRender(duplicateTask, 'normal');
        taskIds.push(taskId);
      }

      // 最適化実行
      renderingManager.optimizeRendering();

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = renderingManager.measureRenderingPerformance();
      
      // 重複除去により実行回数が減少していることを確認
      expect(metrics.domUpdates).toBeLessThan(10);
      expect(metrics.queueLength).toBeLessThan(10);
    });

    test('フレーム予算内でのタスク実行制御', async () => {
      // フレーム予算を超える大量のタスクをスケジュール
      const heavyTasks = Array.from({ length: 100 }, (_, index) => () => {
        // 重い処理をシミュレート
        const start = performance.now();
        while (performance.now() - start < 5) {
          // 5ms の重い処理
          Math.random();
        }
        
        const element = container.querySelector('#status-text');
        if (element) {
          element.textContent = `重いタスク ${index} 完了`;
        }
      });

      const taskStartTime = performance.now();

      heavyTasks.forEach(task => {
        renderingManager.scheduleRender(task, 'low');
      });

      // 複数フレームでタスクが分散実行されることを確認
      let frameCount = 0;
      const frameObserver = () => {
        frameCount++;
        const metrics = renderingManager.measureRenderingPerformance();
        
        if (metrics.queueLength > 0 && frameCount < 20) {
          requestAnimationFrame(frameObserver);
        }
      };

      requestAnimationFrame(frameObserver);

      // 全タスク完了まで待機（最大5秒）
      const waitForCompletion = () => {
        return new Promise(resolve => {
          const check = () => {
            const metrics = renderingManager.measureRenderingPerformance();
            if (metrics.queueLength === 0 || performance.now() - taskStartTime > 5000) {
              resolve();
            } else {
              setTimeout(check, 50);
            }
          };
          check();
        });
      };

      await waitForCompletion();

      const finalMetrics = renderingManager.measureRenderingPerformance();
      
      // フレーム予算管理により平均フレーム時間が制御されていることを確認
      expect(finalMetrics.averageFrameTime).toBeLessThan(20); // 20ms以下
      expect(frameCount).toBeGreaterThan(1); // 複数フレームに分散
    });

    test('動的優先度調整の効果', async () => {
      const priorityTestResults = [];

      // 異なる優先度のタスクを混合してスケジュール
      const tasks = [
        { priority: 'high', content: 'HIGH', expectedOrder: 1 },
        { priority: 'low', content: 'LOW1', expectedOrder: 4 },
        { priority: 'normal', content: 'NORMAL1', expectedOrder: 2 },
        { priority: 'high', content: 'HIGH2', expectedOrder: 1 },
        { priority: 'low', content: 'LOW2', expectedOrder: 4 },
        { priority: 'normal', content: 'NORMAL2', expectedOrder: 3 }
      ];

      tasks.forEach((taskInfo, index) => {
        renderingManager.scheduleRender(() => {
          priorityTestResults.push({
            content: taskInfo.content,
            priority: taskInfo.priority,
            executionOrder: priorityTestResults.length + 1,
            timestamp: performance.now()
          });
        }, taskInfo.priority);
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // 高優先度タスクが先に実行されていることを確認
      const highPriorityTasks = priorityTestResults.filter(r => r.priority === 'high');
      const normalPriorityTasks = priorityTestResults.filter(r => r.priority === 'normal');
      const lowPriorityTasks = priorityTestResults.filter(r => r.priority === 'low');

      if (highPriorityTasks.length > 0 && normalPriorityTasks.length > 0) {
        expect(highPriorityTasks[0].executionOrder).toBeLessThan(normalPriorityTasks[0].executionOrder);
      }

      if (normalPriorityTasks.length > 0 && lowPriorityTasks.length > 0) {
        expect(normalPriorityTasks[0].executionOrder).toBeLessThan(lowPriorityTasks[0].executionOrder);
      }
    });
  });
});