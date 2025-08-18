/**
 * virtual-scroll.perf.test.js - 仮想スクロールパフォーマンステスト
 * TEST-004: パフォーマンステスト - 仮想スクロール性能
 * 
 * 測定項目:
 * - FPS測定（スクロール中）
 * - メモリ使用量
 * - レンダリング時間
 * - DOM要素管理効率
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// Mock DOM environment
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn((callback) => setTimeout(callback, 16)) // 60FPS シミュレート
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: jest.fn()
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// 仮想スクロール実装のモック
class VirtualScrollManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: 50,
      bufferSize: 5,
      visibleCount: 10,
      ...options
    };
    
    this.items = [];
    this.visibleItems = new Map();
    this.scrollTop = 0;
    this.isScrolling = false;
    this.renderQueue = [];
    this.performanceMetrics = {
      fps: [],
      renderTimes: [],
      memoryUsage: []
    };
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.container) {
      this.container.addEventListener('scroll', this.onScroll.bind(this));
    }
  }

  setItems(items) {
    this.items = items;
    this.updateVisibleRange();
  }

  onScroll(event) {
    this.scrollTop = event.target.scrollTop;
    this.isScrolling = true;
    
    // フレームレート測定開始
    this.measureFPS();
    
    // 仮想スクロール更新をスケジュール
    this.scheduleUpdate();
  }

  scheduleUpdate() {
    if (this.updateScheduled) return;
    
    this.updateScheduled = true;
    requestAnimationFrame(() => {
      const startTime = performance.now();
      
      this.updateVisibleRange();
      this.renderVisibleItems();
      
      const endTime = performance.now();
      this.performanceMetrics.renderTimes.push(endTime - startTime);
      
      this.updateScheduled = false;
      this.isScrolling = false;
    });
  }

  updateVisibleRange() {
    const startIndex = Math.floor(this.scrollTop / this.options.itemHeight);
    const endIndex = Math.min(
      startIndex + this.options.visibleCount + this.options.bufferSize * 2,
      this.items.length
    );
    
    this.visibleStartIndex = Math.max(0, startIndex - this.options.bufferSize);
    this.visibleEndIndex = endIndex;
  }

  renderVisibleItems() {
    // 既存の要素をクリア
    const currentItems = new Set(this.visibleItems.keys());
    
    // 新しい可視範囲の要素を作成
    for (let i = this.visibleStartIndex; i < this.visibleEndIndex; i++) {
      if (i >= this.items.length) break;
      
      if (!this.visibleItems.has(i)) {
        this.createItemElement(i);
      }
      currentItems.delete(i);
    }
    
    // 範囲外の要素を削除
    currentItems.forEach(index => {
      this.removeItemElement(index);
    });
  }

  createItemElement(index) {
    const item = this.items[index];
    const element = {
      index,
      data: item,
      top: index * this.options.itemHeight,
      height: this.options.itemHeight,
      rendered: true
    };
    
    this.visibleItems.set(index, element);
    return element;
  }

  removeItemElement(index) {
    this.visibleItems.delete(index);
  }

  measureFPS() {
    const now = performance.now();
    
    if (this.lastFrameTime) {
      const frameDuration = now - this.lastFrameTime;
      const fps = 1000 / frameDuration;
      this.performanceMetrics.fps.push(fps);
    }
    
    this.lastFrameTime = now;
  }

  measureMemoryUsage() {
    if (performance.memory) {
      this.performanceMetrics.memoryUsage.push({
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        timestamp: performance.now()
      });
    }
  }

  getPerformanceMetrics() {
    const avgFPS = this.performanceMetrics.fps.length > 0 
      ? this.performanceMetrics.fps.reduce((a, b) => a + b, 0) / this.performanceMetrics.fps.length
      : 0;
    
    const avgRenderTime = this.performanceMetrics.renderTimes.length > 0
      ? this.performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.renderTimes.length
      : 0;
    
    return {
      averageFPS: avgFPS,
      averageRenderTime: avgRenderTime,
      visibleItemCount: this.visibleItems.size,
      totalItemCount: this.items.length,
      memoryUsage: this.performanceMetrics.memoryUsage
    };
  }

  destroy() {
    if (this.container) {
      this.container.removeEventListener('scroll', this.onScroll.bind(this));
    }
    this.visibleItems.clear();
  }
}

describe('仮想スクロールパフォーマンステスト', () => {
  let container;
  let virtualScroll;
  let performanceMonitor;

  beforeEach(() => {
    // DOM環境セットアップ
    document.body.innerHTML = `
      <div id="virtual-scroll-container" style="height: 500px; overflow-y: auto;">
        <div id="virtual-scroll-content"></div>
      </div>
    `;
    
    container = document.getElementById('virtual-scroll-container');
    
    // パフォーマンスモニター
    performanceMonitor = {
      startTime: null,
      endTime: null,
      measurements: [],
      
      start() {
        this.startTime = performance.now();
      },
      
      end() {
        this.endTime = performance.now();
        const duration = this.endTime - this.startTime;
        this.measurements.push(duration);
        return duration;
      },
      
      average() {
        return this.measurements.length > 0
          ? this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length
          : 0;
      },
      
      reset() {
        this.measurements = [];
      }
    };
  });

  afterEach(() => {
    if (virtualScroll) {
      virtualScroll.destroy();
    }
    document.body.innerHTML = '';
    performanceMonitor.reset();
  });

  describe('FPS測定テスト', () => {
    test('軽量データでのスクロールFPS', async () => {
      // 100個の軽量アイテムを作成
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `アイテム${i}`,
        description: `説明${i}`
      }));
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 50,
        visibleCount: 10,
        bufferSize: 5
      });
      
      virtualScroll.setItems(items);
      
      // スクロールイベントをシミュレート
      const scrollPromises = [];
      for (let scrollTop = 0; scrollTop <= 2000; scrollTop += 100) {
        scrollPromises.push(new Promise(resolve => {
          setTimeout(() => {
            const scrollEvent = new Event('scroll');
            Object.defineProperty(scrollEvent, 'target', {
              value: { scrollTop }
            });
            container.dispatchEvent(scrollEvent);
            resolve();
          }, 16); // 60FPS間隔
        }));
      }
      
      await Promise.all(scrollPromises);
      
      // FPS測定結果を確認
      await new Promise(resolve => setTimeout(resolve, 100)); // 測定完了を待機
      
      const metrics = virtualScroll.getPerformanceMetrics();
      
      // 平均FPSが45以上であることを確認（60FPSの75%）
      expect(metrics.averageFPS).toBeGreaterThan(45);
      expect(metrics.visibleItemCount).toBeLessThanOrEqual(20); // 表示中のアイテム数
    });

    test('大量データでのスクロールFPS', async () => {
      // 10,000個の大量アイテムを作成
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `大量アイテム${i}`,
        description: `説明文${i}`.repeat(5), // 長めの説明
        data: new Array(10).fill(`データ${i}`)
      }));
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 80,
        visibleCount: 8,
        bufferSize: 3
      });
      
      virtualScroll.setItems(items);
      
      // 高速スクロールをシミュレート
      const fastScrollPromises = [];
      for (let scrollTop = 0; scrollTop <= 50000; scrollTop += 500) {
        fastScrollPromises.push(new Promise(resolve => {
          setTimeout(() => {
            const scrollEvent = new Event('scroll');
            Object.defineProperty(scrollEvent, 'target', {
              value: { scrollTop }
            });
            container.dispatchEvent(scrollEvent);
            resolve();
          }, 8); // 120FPS間隔での高速スクロール
        }));
      }
      
      await Promise.all(fastScrollPromises);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const metrics = virtualScroll.getPerformanceMetrics();
      
      // 大量データでも30FPS以上を維持
      expect(metrics.averageFPS).toBeGreaterThan(30);
      expect(metrics.totalItemCount).toBe(10000);
      expect(metrics.visibleItemCount).toBeLessThanOrEqual(14); // 可視+バッファ
    });

    test('連続スクロールでのFPS安定性', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        complexData: {
          nested: Array.from({ length: 50 }, (_, j) => `データ${i}-${j}`)
        }
      }));
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 60,
        visibleCount: 12,
        bufferSize: 4
      });
      
      virtualScroll.setItems(items);
      
      // 連続的なスクロール（上下）
      const continuousScrollPromises = [];
      
      // 下向きスクロール
      for (let i = 0; i < 100; i++) {
        continuousScrollPromises.push(new Promise(resolve => {
          setTimeout(() => {
            const scrollEvent = new Event('scroll');
            Object.defineProperty(scrollEvent, 'target', {
              value: { scrollTop: i * 60 }
            });
            container.dispatchEvent(scrollEvent);
            resolve();
          }, i * 16);
        }));
      }
      
      // 上向きスクロール
      for (let i = 100; i >= 0; i--) {
        continuousScrollPromises.push(new Promise(resolve => {
          setTimeout(() => {
            const scrollEvent = new Event('scroll');
            Object.defineProperty(scrollEvent, 'target', {
              value: { scrollTop: i * 60 }
            });
            container.dispatchEvent(scrollEvent);
            resolve();
          }, (200 - i) * 16);
        }));
      }
      
      await Promise.all(continuousScrollPromises);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const metrics = virtualScroll.getPerformanceMetrics();
      const fpsData = virtualScroll.performanceMetrics.fps;
      
      // FPSの変動が安定していることを確認
      if (fpsData.length > 0) {
        const fpsVariance = this.calculateVariance(fpsData);
        expect(fpsVariance).toBeLessThan(400); // FPSの変動が小さい
      }
      
      expect(metrics.averageFPS).toBeGreaterThan(40);
    });

    // ヘルパー関数: 分散計算
    calculateVariance(numbers) {
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const variance = numbers.reduce((sum, num) => {
        return sum + Math.pow(num - mean, 2);
      }, 0) / numbers.length;
      return variance;
    }
  });

  describe('メモリ使用量テスト', () => {
    test('DOM要素管理効率', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // 大量アイテムでメモリ効率をテスト
      const items = Array.from({ length: 50000 }, (_, i) => ({
        id: i,
        title: `タイトル${i}`,
        content: `コンテンツ${i}`.repeat(20)
      }));
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 100,
        visibleCount: 5,
        bufferSize: 2
      });
      
      virtualScroll.setItems(items);
      
      // メモリ測定しながらスクロール
      const memoryMeasurementInterval = setInterval(() => {
        virtualScroll.measureMemoryUsage();
      }, 100);
      
      // 全体をスクロール
      const scrollPromises = [];
      for (let i = 0; i < 100; i++) {
        scrollPromises.push(new Promise(resolve => {
          setTimeout(() => {
            const scrollTop = (i / 100) * (items.length * virtualScroll.options.itemHeight);
            const scrollEvent = new Event('scroll');
            Object.defineProperty(scrollEvent, 'target', {
              value: { scrollTop }
            });
            container.dispatchEvent(scrollEvent);
            resolve();
          }, i * 50);
        }));
      }
      
      await Promise.all(scrollPromises);
      
      clearInterval(memoryMeasurementInterval);
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      const metrics = virtualScroll.getPerformanceMetrics();
      
      // DOM要素が効率的に管理されていることを確認
      expect(metrics.visibleItemCount).toBeLessThanOrEqual(9); // 5 + 2*2 buffer
      
      // メモリ増加が50MB以内であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('メモリリーク検出', async () => {
      const memorySnapshots = [];
      
      // 複数回の仮想スクロール作成・破棄サイクル
      for (let cycle = 0; cycle < 5; cycle++) {
        const cycleItems = Array.from({ length: 1000 }, (_, i) => ({
          id: `${cycle}-${i}`,
          data: new Array(100).fill(`cycle${cycle}-item${i}`)
        }));
        
        const cycleVirtualScroll = new VirtualScrollManager(container, {
          itemHeight: 75,
          visibleCount: 8,
          bufferSize: 3
        });
        
        cycleVirtualScroll.setItems(cycleItems);
        
        // スクロール操作
        for (let scroll = 0; scroll < 20; scroll++) {
          const scrollEvent = new Event('scroll');
          Object.defineProperty(scrollEvent, 'target', {
            value: { scrollTop: scroll * 150 }
          });
          container.dispatchEvent(scrollEvent);
          
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // メモリスナップショット
        if (performance.memory) {
          memorySnapshots.push(performance.memory.usedJSHeapSize);
        }
        
        // 仮想スクロールを破棄
        cycleVirtualScroll.destroy();
        
        // ガベージコレクションをトリガー
        if (global.gc) {
          global.gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // メモリ使用量が安定していることを確認
      if (memorySnapshots.length >= 2) {
        const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
        const maxAcceptableGrowth = 20 * 1024 * 1024; // 20MB
        
        expect(memoryGrowth).toBeLessThan(maxAcceptableGrowth);
      }
    });
  });

  describe('レンダリング時間テスト', () => {
    test('初期レンダリング性能', async () => {
      const items = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        complex: {
          data: Array.from({ length: 10 }, (_, j) => ({ key: j, value: `値${i}-${j}` }))
        }
      }));
      
      performanceMonitor.start();
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 90,
        visibleCount: 6,
        bufferSize: 2
      });
      
      virtualScroll.setItems(items);
      
      const initialRenderTime = performanceMonitor.end();
      
      // 初期レンダリングが100ms以内であることを確認
      expect(initialRenderTime).toBeLessThan(100);
      
      const metrics = virtualScroll.getPerformanceMetrics();
      expect(metrics.visibleItemCount).toBeGreaterThan(0);
    });

    test('スクロール時のレンダリング性能', async () => {
      const items = Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        rendering: {
          heavy: new Array(50).fill().map((_, j) => `重いデータ${i}-${j}`)
        }
      }));
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 120,
        visibleCount: 4,
        bufferSize: 1
      });
      
      virtualScroll.setItems(items);
      
      // スクロール時のレンダリング時間を測定
      const renderingTimes = [];
      
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        
        const scrollEvent = new Event('scroll');
        Object.defineProperty(scrollEvent, 'target', {
          value: { scrollTop: i * 120 }
        });
        container.dispatchEvent(scrollEvent);
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const renderTime = performance.now() - startTime;
        renderingTimes.push(renderTime);
      }
      
      const averageRenderTime = renderingTimes.reduce((a, b) => a + b, 0) / renderingTimes.length;
      const maxRenderTime = Math.max(...renderingTimes);
      
      // 平均レンダリング時間が16ms以下（60FPS）であることを確認
      expect(averageRenderTime).toBeLessThan(16);
      
      // 最大レンダリング時間が33ms以下（30FPS）であることを確認
      expect(maxRenderTime).toBeLessThan(33);
    });

    test('動的アイテム追加時のレンダリング性能', async () => {
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 80,
        visibleCount: 7,
        bufferSize: 2
      });
      
      // 初期アイテム
      let items = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        initial: true
      }));
      
      virtualScroll.setItems(items);
      
      // 動的追加のパフォーマンス測定
      const additionTimes = [];
      
      for (let batch = 0; batch < 10; batch++) {
        const startTime = performance.now();
        
        // 100個ずつ追加
        const newItems = Array.from({ length: 100 }, (_, i) => ({
          id: items.length + i,
          batch,
          dynamic: true
        }));
        
        items = [...items, ...newItems];
        virtualScroll.setItems(items);
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const additionTime = performance.now() - startTime;
        additionTimes.push(additionTime);
      }
      
      const averageAdditionTime = additionTimes.reduce((a, b) => a + b, 0) / additionTimes.length;
      
      // 動的追加が10ms以内で完了することを確認
      expect(averageAdditionTime).toBeLessThan(10);
      expect(items.length).toBe(1100); // 100 + 10 * 100
    });
  });

  describe('レスポンシブ性能テスト', () => {
    test('ウィンドウリサイズ時の応答性', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        responsive: true
      }));
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 70,
        visibleCount: 8,
        bufferSize: 2
      });
      
      virtualScroll.setItems(items);
      
      // リサイズイベントをシミュレート
      const resizeTimes = [];
      
      for (let width = 300; width <= 800; width += 100) {
        const startTime = performance.now();
        
        // コンテナサイズを変更
        container.style.width = `${width}px`;
        
        // リサイズ処理をシミュレート
        virtualScroll.options.visibleCount = Math.floor(width / 80);
        virtualScroll.updateVisibleRange();
        virtualScroll.renderVisibleItems();
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const resizeTime = performance.now() - startTime;
        resizeTimes.push(resizeTime);
      }
      
      const averageResizeTime = resizeTimes.reduce((a, b) => a + b, 0) / resizeTimes.length;
      
      // リサイズ応答が20ms以内であることを確認
      expect(averageResizeTime).toBeLessThan(20);
    });

    test('デバイス向き変更時の性能', async () => {
      const items = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        orientation: 'portrait'
      }));
      
      virtualScroll = new VirtualScrollManager(container, {
        itemHeight: 100,
        visibleCount: 5,
        bufferSize: 1
      });
      
      virtualScroll.setItems(items);
      
      // 縦向き → 横向き変更をシミュレート
      const orientationChangeTime = await new Promise(resolve => {
        const startTime = performance.now();
        
        // 画面向き変更シミュレート
        container.style.height = '300px';
        container.style.width = '800px';
        
        virtualScroll.options.visibleCount = 3; // 横向きで表示数変更
        virtualScroll.options.itemHeight = 150; // アイテム高さも変更
        
        virtualScroll.updateVisibleRange();
        virtualScroll.renderVisibleItems();
        
        requestAnimationFrame(() => {
          const endTime = performance.now();
          resolve(endTime - startTime);
        });
      });
      
      // 画面向き変更が50ms以内で処理されることを確認
      expect(orientationChangeTime).toBeLessThan(50);
    });
  });
});