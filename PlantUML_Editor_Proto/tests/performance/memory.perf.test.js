/**
 * memory.perf.test.js - メモリ管理パフォーマンステスト
 * TEST-004: パフォーマンステスト - メモリ最適化効果
 * 
 * 測定項目:
 * - メモリリーク検出
 * - ガベージコレクション頻度
 * - 長時間使用時の安定性
 * - メモリ使用量最適化
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// Performance Memory API Mock
if (!performance.memory) {
  performance.memory = {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  };
}

// WeakMap/WeakSet for memory leak detection
global.FinalizationRegistry = global.FinalizationRegistry || class {
  constructor(callback) {
    this.callback = callback;
    this.refs = new Set();
  }
  
  register(target, heldValue) {
    this.refs.add({ target, heldValue });
    
    // Simulate cleanup after some time for testing
    setTimeout(() => {
      this.callback(heldValue);
      this.refs.delete({ target, heldValue });
    }, 1000);
  }
  
  unregister(unregisterToken) {
    // Implementation for unregister
  }
};

// メモリマネージャーの実装
class MemoryManager {
  constructor() {
    this.allocatedObjects = new Map();
    this.objectPool = new Map();
    this.gcCallbacks = new Set();
    this.memoryMetrics = {
      allocations: 0,
      deallocations: 0,
      peakMemory: 0,
      gcCount: 0
    };
    this.monitoringInterval = null;
    this.finalizer = new FinalizationRegistry((heldValue) => {
      this.onObjectFinalized(heldValue);
    });
  }

  allocate(type, size = 1024) {
    const objectId = Math.random().toString(36).substr(2, 9);
    const memoryObject = {
      id: objectId,
      type,
      size,
      data: new ArrayBuffer(size),
      timestamp: Date.now(),
      refs: 0
    };
    
    this.allocatedObjects.set(objectId, memoryObject);
    this.memoryMetrics.allocations++;
    
    // Register for finalization tracking
    this.finalizer.register(memoryObject, objectId);
    
    this.updatePeakMemory();
    return memoryObject;
  }

  deallocate(objectId) {
    const obj = this.allocatedObjects.get(objectId);
    if (obj) {
      this.allocatedObjects.delete(objectId);
      this.memoryMetrics.deallocations++;
      
      // Return to object pool for reuse
      if (obj.type && obj.size <= 8192) { // Pool objects up to 8KB
        this.returnToPool(obj.type, obj);
      }
      
      return true;
    }
    return false;
  }

  getFromPool(type, size) {
    const poolKey = `${type}-${size}`;
    const pool = this.objectPool.get(poolKey);
    
    if (pool && pool.length > 0) {
      const obj = pool.pop();
      obj.refs = 0;
      obj.timestamp = Date.now();
      return obj;
    }
    
    return null;
  }

  returnToPool(type, obj) {
    const poolKey = `${type}-${obj.size}`;
    let pool = this.objectPool.get(poolKey);
    
    if (!pool) {
      pool = [];
      this.objectPool.set(poolKey, pool);
    }
    
    // Limit pool size to prevent memory bloat
    if (pool.length < 100) {
      // Clear object data
      obj.refs = 0;
      obj.data = new ArrayBuffer(obj.size);
      pool.push(obj);
    }
  }

  forceGC() {
    if (global.gc) {
      global.gc();
    }
    this.memoryMetrics.gcCount++;
    
    // Notify GC callbacks
    this.gcCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('GC callback error:', error);
      }
    });
  }

  onObjectFinalized(objectId) {
    // Object was garbage collected
    this.memoryMetrics.deallocations++;
  }

  addGCCallback(callback) {
    this.gcCallbacks.add(callback);
  }

  removeGCCallback(callback) {
    this.gcCallbacks.delete(callback);
  }

  updatePeakMemory() {
    const currentMemory = performance.memory.usedJSHeapSize;
    if (currentMemory > this.memoryMetrics.peakMemory) {
      this.memoryMetrics.peakMemory = currentMemory;
    }
  }

  startMemoryMonitoring(interval = 1000) {
    this.stopMemoryMonitoring();
    
    this.monitoringInterval = setInterval(() => {
      this.updatePeakMemory();
      
      // Auto GC when memory usage is high
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
      if (memoryUsage > 0.8) {
        this.forceGC();
      }
    }, interval);
  }

  stopMemoryMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  getMemoryStats() {
    return {
      ...this.memoryMetrics,
      currentMemory: performance.memory.usedJSHeapSize,
      totalMemory: performance.memory.totalJSHeapSize,
      allocatedObjectCount: this.allocatedObjects.size,
      pooledObjectCount: Array.from(this.objectPool.values()).reduce((sum, pool) => sum + pool.length, 0),
      memoryEfficiency: this.memoryMetrics.deallocations / Math.max(this.memoryMetrics.allocations, 1)
    };
  }

  cleanup() {
    this.stopMemoryMonitoring();
    this.allocatedObjects.clear();
    this.objectPool.clear();
    this.gcCallbacks.clear();
  }
}

describe('メモリ管理パフォーマンステスト', () => {
  let memoryManager;
  let performanceMonitor;

  beforeEach(() => {
    memoryManager = new MemoryManager();
    
    performanceMonitor = {
      snapshots: [],
      
      takeSnapshot() {
        const snapshot = {
          timestamp: Date.now(),
          memory: {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
          },
          stats: memoryManager.getMemoryStats()
        };
        
        this.snapshots.push(snapshot);
        return snapshot;
      },
      
      getMemoryGrowth() {
        if (this.snapshots.length < 2) return 0;
        
        const first = this.snapshots[0];
        const last = this.snapshots[this.snapshots.length - 1];
        
        return last.memory.used - first.memory.used;
      },
      
      detectMemoryLeaks() {
        const leaks = [];
        
        for (let i = 1; i < this.snapshots.length; i++) {
          const prev = this.snapshots[i - 1];
          const curr = this.snapshots[i];
          
          const growth = curr.memory.used - prev.memory.used;
          const timeSpan = curr.timestamp - prev.timestamp;
          
          // 連続的なメモリ増加を検出
          if (growth > 1024 * 1024 && timeSpan < 5000) { // 5秒で1MB以上増加
            leaks.push({
              timespan: timeSpan,
              growth,
              timestamp: curr.timestamp
            });
          }
        }
        
        return leaks;
      },
      
      reset() {
        this.snapshots = [];
      }
    };
  });

  afterEach(() => {
    memoryManager.cleanup();
    performanceMonitor.reset();
  });

  describe('メモリリーク検出テスト', () => {
    test('オブジェクト作成・削除サイクルでのメモリリーク', async () => {
      performanceMonitor.takeSnapshot();
      
      // 大量のオブジェクトを作成・削除
      const objectIds = [];
      
      for (let cycle = 0; cycle < 10; cycle++) {
        // 作成フェーズ
        for (let i = 0; i < 100; i++) {
          const obj = memoryManager.allocate('testObject', 1024);
          objectIds.push(obj.id);
        }
        
        performanceMonitor.takeSnapshot();
        
        // 削除フェーズ
        for (let i = 0; i < 50; i++) { // 半分だけ削除
          const objectId = objectIds.shift();
          if (objectId) {
            memoryManager.deallocate(objectId);
          }
        }
        
        // 強制ガベージコレクション
        memoryManager.forceGC();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        performanceMonitor.takeSnapshot();
      }
      
      const finalSnapshot = performanceMonitor.takeSnapshot();
      const memoryGrowth = performanceMonitor.getMemoryGrowth();
      const detectedLeaks = performanceMonitor.detectMemoryLeaks();
      
      // メモリ増加が50MB以下であることを確認
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
      
      // 大きなメモリリークが検出されないことを確認
      const significantLeaks = detectedLeaks.filter(leak => leak.growth > 10 * 1024 * 1024);
      expect(significantLeaks).toHaveLength(0);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.memoryEfficiency).toBeGreaterThan(0.3); // 30%以上の削除効率
    });

    test('DOM要素関連のメモリリーク', async () => {
      // DOM要素を模擬するオブジェクト
      const domElements = [];
      
      performanceMonitor.takeSnapshot();
      
      for (let i = 0; i < 50; i++) {
        // DOM要素風オブジェクトを作成
        const element = {
          id: `element-${i}`,
          children: [],
          listeners: new Map(),
          data: memoryManager.allocate('domElement', 2048)
        };
        
        // 子要素を追加
        for (let j = 0; j < 10; j++) {
          const child = {
            id: `child-${i}-${j}`,
            parent: element, // 循環参照
            data: memoryManager.allocate('childElement', 512)
          };
          
          element.children.push(child);
        }
        
        // イベントリスナーを追加
        element.listeners.set('click', () => {
          console.log(`Clicked ${element.id}`);
        });
        
        domElements.push(element);
        
        if (i % 10 === 0) {
          performanceMonitor.takeSnapshot();
        }
      }
      
      // DOM要素を削除（循環参照を解決）
      for (const element of domElements) {
        // 子要素の親参照を削除
        element.children.forEach(child => {
          child.parent = null;
          memoryManager.deallocate(child.data.id);
        });
        
        // イベントリスナーをクリア
        element.listeners.clear();
        
        // 要素データを削除
        memoryManager.deallocate(element.data.id);
      }
      
      domElements.length = 0; // 配列をクリア
      
      // 複数回ガベージコレクションを実行
      for (let i = 0; i < 3; i++) {
        memoryManager.forceGC();
        await new Promise(resolve => setTimeout(resolve, 200));
        performanceMonitor.takeSnapshot();
      }
      
      const finalStats = memoryManager.getMemoryStats();
      const memoryGrowth = performanceMonitor.getMemoryGrowth();
      
      // DOM要素削除後のメモリ増加が20MB以下
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
      
      // オブジェクトプールが適切に機能していることを確認
      expect(finalStats.pooledObjectCount).toBeGreaterThan(0);
    });

    test('長時間動作でのメモリ安定性', async () => {
      memoryManager.startMemoryMonitoring(500);
      
      const longRunningTask = async () => {
        const taskData = [];
        
        for (let hour = 0; hour < 5; hour++) { // 5時間シミュレート
          performanceMonitor.takeSnapshot();
          
          // 1時間分の処理をシミュレート
          for (let minute = 0; minute < 60; minute++) {
            // データを作成
            const data = {
              timestamp: Date.now(),
              memory: memoryManager.allocate('hourlyData', 4096),
              processing: new Array(100).fill(0).map(() => Math.random())
            };
            
            taskData.push(data);
            
            // 古いデータを削除（10分以上古い）
            const cutoffTime = Date.now() - (10 * 60 * 1000);
            const toRemove = taskData.filter(item => item.timestamp < cutoffTime);
            
            toRemove.forEach(item => {
              memoryManager.deallocate(item.memory.id);
              const index = taskData.indexOf(item);
              if (index > -1) {
                taskData.splice(index, 1);
              }
            });
            
            // 模擬的な時間経過（実際は1ms）
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // 1時間ごとに強制GC
          memoryManager.forceGC();
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // 残りのデータをクリーンアップ
        taskData.forEach(item => {
          memoryManager.deallocate(item.memory.id);
        });
        
        return taskData.length;
      };
      
      await longRunningTask();
      
      memoryManager.stopMemoryMonitoring();
      
      const finalSnapshot = performanceMonitor.takeSnapshot();
      const stats = memoryManager.getMemoryStats();
      
      // 長時間動作後のメモリ効率性を確認
      expect(stats.memoryEfficiency).toBeGreaterThan(0.8); // 80%以上の効率
      expect(stats.gcCount).toBeGreaterThan(5); // 適切にGCが実行された
      
      // メモリ増加が100MB以下
      const memoryGrowth = performanceMonitor.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
    }, 10000); // 10秒のタイムアウト
  });

  describe('ガベージコレクション最適化テスト', () => {
    test('自動GCトリガーの効果', async () => {
      let gcTriggered = false;
      
      memoryManager.addGCCallback(() => {
        gcTriggered = true;
      });
      
      // メモリを大量に消費してGCをトリガー
      const largeObjects = [];
      
      for (let i = 0; i < 100; i++) {
        const obj = memoryManager.allocate('largeObject', 1024 * 1024); // 1MB each
        largeObjects.push(obj);
        
        // メモリ使用量をシミュレート更新
        performance.memory.usedJSHeapSize += 1024 * 1024;
        
        if (performance.memory.usedJSHeapSize > performance.memory.totalJSHeapSize * 0.8) {
          memoryManager.forceGC();
          break;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(gcTriggered).toBe(true);
      
      // オブジェクトを削除
      largeObjects.forEach(obj => {
        memoryManager.deallocate(obj.id);
      });
    });

    test('GC頻度の最適化', async () => {
      const gcEvents = [];
      
      memoryManager.addGCCallback(() => {
        gcEvents.push(Date.now());
      });
      
      memoryManager.startMemoryMonitoring(100); // 100ms間隔
      
      // 負荷変動パターンをシミュレート
      const loadPatterns = [
        { duration: 500, allocationsPerMs: 2 },   // 低負荷
        { duration: 200, allocationsPerMs: 10 },  // 高負荷
        { duration: 300, allocationsPerMs: 1 },   // 極低負荷
        { duration: 400, allocationsPerMs: 15 }   // 極高負荷
      ];
      
      for (const pattern of loadPatterns) {
        const startTime = Date.now();
        const allocated = [];
        
        while (Date.now() - startTime < pattern.duration) {
          for (let i = 0; i < pattern.allocationsPerMs; i++) {
            const obj = memoryManager.allocate('loadTest', 2048);
            allocated.push(obj.id);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        // 半分のオブジェクトを削除
        for (let i = 0; i < allocated.length / 2; i++) {
          memoryManager.deallocate(allocated[i]);
        }
      }
      
      memoryManager.stopMemoryMonitoring();
      
      // GC間隔の分析
      const gcIntervals = [];
      for (let i = 1; i < gcEvents.length; i++) {
        gcIntervals.push(gcEvents[i] - gcEvents[i - 1]);
      }
      
      if (gcIntervals.length > 0) {
        const avgInterval = gcIntervals.reduce((a, b) => a + b, 0) / gcIntervals.length;
        
        // GCが適切な間隔で実行されることを確認
        expect(avgInterval).toBeGreaterThan(50); // 最低50ms間隔
        expect(avgInterval).toBeLessThan(5000);  // 最大5秒間隔
      }
    });
  });

  describe('オブジェクトプール最適化テスト', () => {
    test('プール再利用効率', () => {
      const poolTestObjects = [];
      
      // 初期オブジェクト作成
      for (let i = 0; i < 50; i++) {
        const obj = memoryManager.allocate('poolTest', 1024);
        poolTestObjects.push(obj.id);
      }
      
      // オブジェクトを削除してプールに戻す
      poolTestObjects.forEach(id => {
        memoryManager.deallocate(id);
      });
      
      const statsAfterDeallocation = memoryManager.getMemoryStats();
      const pooledCount = statsAfterDeallocation.pooledObjectCount;
      
      // 新しいオブジェクトを作成（プールから再利用される）
      const reusedObjects = [];
      for (let i = 0; i < 30; i++) {
        const obj = memoryManager.getFromPool('poolTest', 1024) || 
                   memoryManager.allocate('poolTest', 1024);
        reusedObjects.push(obj);
      }
      
      const statsAfterReuse = memoryManager.getMemoryStats();
      
      // プールからの再利用が発生していることを確認
      expect(pooledCount).toBeGreaterThan(0);
      expect(statsAfterReuse.pooledObjectCount).toBeLessThan(pooledCount);
      
      // 新規作成数が削減されていることを確認
      const newAllocations = statsAfterReuse.allocations - statsAfterDeallocation.allocations;
      expect(newAllocations).toBeLessThan(30); // 全て新規作成ではない
    });

    test('プールサイズ制限の効果', () => {
      // プール限界を超える数のオブジェクトを作成・削除
      for (let batch = 0; batch < 5; batch++) {
        const batchObjects = [];
        
        // 150個作成（プール限界100を超える）
        for (let i = 0; i < 150; i++) {
          const obj = memoryManager.allocate('limitTest', 512);
          batchObjects.push(obj.id);
        }
        
        // 全て削除
        batchObjects.forEach(id => {
          memoryManager.deallocate(id);
        });
      }
      
      const stats = memoryManager.getMemoryStats();
      
      // プールサイズが制限内に収まっていることを確認
      const pooledObjects = Array.from(memoryManager.objectPool.values())
        .reduce((sum, pool) => sum + pool.length, 0);
      
      expect(pooledObjects).toBeLessThanOrEqual(100); // プール限界
    });
  });

  describe('メモリ使用パターン分析テスト', () => {
    test('ピークメモリ使用量の監視', async () => {
      const initialPeak = memoryManager.getMemoryStats().peakMemory;
      
      // 段階的にメモリ使用量を増やす
      const memoryLevels = [
        { count: 100, size: 1024 },     // 100KB
        { count: 500, size: 2048 },     // 1MB
        { count: 200, size: 5120 },     // 1MB
        { count: 100, size: 10240 }     // 1MB
      ];
      
      const allocatedIds = [];
      
      for (const level of memoryLevels) {
        for (let i = 0; i < level.count; i++) {
          const obj = memoryManager.allocate('peakTest', level.size);
          allocatedIds.push(obj.id);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
        memoryManager.updatePeakMemory();
      }
      
      const peakStats = memoryManager.getMemoryStats();
      
      // 段階的削除
      for (let i = 0; i < allocatedIds.length; i += 100) {
        const batch = allocatedIds.slice(i, i + 100);
        batch.forEach(id => memoryManager.deallocate(id));
        
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      const finalStats = memoryManager.getMemoryStats();
      
      // ピークメモリが適切に記録されていることを確認
      expect(peakStats.peakMemory).toBeGreaterThan(initialPeak);
      expect(finalStats.peakMemory).toBe(peakStats.peakMemory); // ピークは保持される
    });

    test('メモリ効率指標の算出', () => {
      const operations = [
        { type: 'allocate', count: 100, size: 1024 },
        { type: 'deallocate', count: 50 },
        { type: 'allocate', count: 200, size: 2048 },
        { type: 'deallocate', count: 150 },
        { type: 'allocate', count: 75, size: 512 },
        { type: 'deallocate', count: 75 }
      ];
      
      const allocatedIds = [];
      
      for (const op of operations) {
        if (op.type === 'allocate') {
          for (let i = 0; i < op.count; i++) {
            const obj = memoryManager.allocate('efficiencyTest', op.size);
            allocatedIds.push(obj.id);
          }
        } else if (op.type === 'deallocate') {
          for (let i = 0; i < op.count && allocatedIds.length > 0; i++) {
            const id = allocatedIds.shift();
            memoryManager.deallocate(id);
          }
        }
      }
      
      const stats = memoryManager.getMemoryStats();
      
      // メモリ効率指標を確認
      expect(stats.allocations).toBe(375); // 100 + 200 + 75
      expect(stats.deallocations).toBe(275); // 50 + 150 + 75
      expect(stats.memoryEfficiency).toBeCloseTo(275 / 375, 2); // 約73%
      
      // 残りオブジェクトをクリーンアップ
      allocatedIds.forEach(id => memoryManager.deallocate(id));
    });
  });
});