/**
 * state-management.perf.test.js - 状態管理パフォーマンステスト
 * TEST-004: パフォーマンステスト - 状態管理最適化
 * 
 * 測定項目:
 * - 状態変更の応答時間
 * - Undo/Redo操作の効率
 * - 大量データ状態の管理性能
 * - 状態同期とメモリ効率
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// 状態管理システムのモック実装
class StateManager {
  constructor(options = {}) {
    this.options = {
      maxHistorySize: 50,
      enableDeepClone: true,
      enableCompression: false,
      enableDiffing: true,
      ...options
    };
    
    this.currentState = {};
    this.history = [];
    this.redoStack = [];
    this.subscribers = new Map();
    this.middleware = [];
    
    this.performanceMetrics = {
      stateChanges: 0,
      subscriptionNotifications: 0,
      totalStateChangeTime: 0,
      totalSerializationTime: 0,
      memoryUsage: {
        current: 0,
        peak: 0,
        history: 0
      }
    };
    
    this.compressionCache = new Map();
    this.diffCache = new Map();
  }

  // 状態の設定
  setState(newState, actionType = 'SET_STATE') {
    const startTime = performance.now();
    
    // 履歴に現在の状態を保存
    this.saveToHistory(actionType);
    
    // 状態の更新
    const previousState = this.currentState;
    this.currentState = this.options.enableDeepClone 
      ? this.deepClone(newState) 
      : { ...newState };
    
    // 差分計算（オプション）
    let diff = null;
    if (this.options.enableDiffing) {
      diff = this.calculateDiff(previousState, this.currentState);
      this.diffCache.set(this.history.length - 1, diff);
    }
    
    // サブスクライバーへの通知
    this.notifySubscribers(this.currentState, previousState, actionType, diff);
    
    // メトリクス更新
    const endTime = performance.now();
    this.performanceMetrics.stateChanges++;
    this.performanceMetrics.totalStateChangeTime += (endTime - startTime);
    this.updateMemoryMetrics();
    
    // Redoスタックをクリア
    this.redoStack = [];
    
    return this.currentState;
  }

  // 部分的な状態更新
  updateState(partialState, actionType = 'UPDATE_STATE') {
    const newState = { ...this.currentState, ...partialState };
    return this.setState(newState, actionType);
  }

  // 深いパスでの状態更新
  setStateByPath(path, value, actionType = 'SET_PATH') {
    const newState = this.deepClone(this.currentState);
    this.setValueByPath(newState, path, value);
    return this.setState(newState, actionType);
  }

  // 配列状態の操作
  pushToArray(path, item, actionType = 'PUSH_ARRAY') {
    const currentArray = this.getValueByPath(this.currentState, path) || [];
    const newArray = [...currentArray, item];
    return this.setStateByPath(path, newArray, actionType);
  }

  removeFromArray(path, index, actionType = 'REMOVE_ARRAY') {
    const currentArray = this.getValueByPath(this.currentState, path) || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    return this.setStateByPath(path, newArray, actionType);
  }

  // Undo操作
  undo() {
    if (this.history.length === 0) return false;
    
    const startTime = performance.now();
    
    const historyEntry = this.history.pop();
    this.redoStack.push({
      state: this.deepClone(this.currentState),
      action: 'UNDO_RESTORE',
      timestamp: Date.now()
    });
    
    const previousState = this.currentState;
    this.currentState = historyEntry.state;
    
    this.notifySubscribers(this.currentState, previousState, 'UNDO');
    
    const endTime = performance.now();
    this.performanceMetrics.totalStateChangeTime += (endTime - startTime);
    this.updateMemoryMetrics();
    
    return true;
  }

  // Redo操作
  redo() {
    if (this.redoStack.length === 0) return false;
    
    const startTime = performance.now();
    
    const redoEntry = this.redoStack.pop();
    this.saveToHistory('REDO');
    
    const previousState = this.currentState;
    this.currentState = redoEntry.state;
    
    this.notifySubscribers(this.currentState, previousState, 'REDO');
    
    const endTime = performance.now();
    this.performanceMetrics.totalStateChangeTime += (endTime - startTime);
    this.updateMemoryMetrics();
    
    return true;
  }

  // 履歴管理
  saveToHistory(actionType) {
    const historyEntry = {
      state: this.deepClone(this.currentState),
      action: actionType,
      timestamp: Date.now()
    };
    
    // 圧縮（オプション）
    if (this.options.enableCompression) {
      historyEntry.compressed = this.compressState(historyEntry.state);
      delete historyEntry.state;
    }
    
    this.history.push(historyEntry);
    
    // 履歴サイズ制限
    if (this.history.length > this.options.maxHistorySize) {
      this.history.shift();
    }
  }

  // サブスクリプション管理
  subscribe(id, callback, options = {}) {
    const subscription = {
      id,
      callback,
      options: {
        immediate: false,
        filter: null,
        throttle: 0,
        ...options
      },
      lastNotification: 0
    };
    
    this.subscribers.set(id, subscription);
    
    // 即座に現在の状態を通知
    if (subscription.options.immediate) {
      this.notifySubscriber(subscription, this.currentState, null, 'SUBSCRIBE');
    }
    
    return () => this.unsubscribe(id);
  }

  unsubscribe(id) {
    return this.subscribers.delete(id);
  }

  // サブスクライバーへの通知
  notifySubscribers(currentState, previousState, actionType, diff = null) {
    const startTime = performance.now();
    
    this.subscribers.forEach(subscription => {
      this.notifySubscriber(subscription, currentState, previousState, actionType, diff);
    });
    
    const endTime = performance.now();
    this.performanceMetrics.subscriptionNotifications++;
    this.performanceMetrics.totalStateChangeTime += (endTime - startTime);
  }

  notifySubscriber(subscription, currentState, previousState, actionType, diff) {
    const now = Date.now();
    
    // スロットリング
    if (subscription.options.throttle > 0) {
      if (now - subscription.lastNotification < subscription.options.throttle) {
        return;
      }
    }
    
    // フィルタリング
    if (subscription.options.filter) {
      if (!subscription.options.filter(currentState, previousState, actionType)) {
        return;
      }
    }
    
    try {
      subscription.callback(currentState, previousState, actionType, diff);
      subscription.lastNotification = now;
    } catch (error) {
      console.error(`Subscriber ${subscription.id} error:`, error);
    }
  }

  // 状態の取得
  getState() {
    return this.currentState;
  }

  getStateByPath(path) {
    return this.getValueByPath(this.currentState, path);
  }

  // 履歴とメタデータ
  getHistory() {
    return this.history.map(entry => ({
      action: entry.action,
      timestamp: entry.timestamp,
      hasState: !!entry.state || !!entry.compressed
    }));
  }

  getRedoStack() {
    return this.redoStack.map(entry => ({
      action: entry.action,
      timestamp: entry.timestamp
    }));
  }

  // パフォーマンス最適化
  batchUpdates(updates) {
    const startTime = performance.now();
    
    // バッチ開始を通知
    this.notifySubscribers(this.currentState, null, 'BATCH_START');
    
    let finalState = this.currentState;
    
    updates.forEach((update, index) => {
      if (typeof update === 'function') {
        finalState = update(finalState);
      } else if (update.type === 'SET') {
        finalState = { ...finalState, ...update.payload };
      } else if (update.type === 'SET_PATH') {
        finalState = this.deepClone(finalState);
        this.setValueByPath(finalState, update.path, update.value);
      }
    });
    
    // 一括で状態を設定
    this.saveToHistory('BATCH_UPDATE');
    const previousState = this.currentState;
    this.currentState = finalState;
    
    // バッチ完了を通知
    this.notifySubscribers(this.currentState, previousState, 'BATCH_END');
    
    const endTime = performance.now();
    this.performanceMetrics.totalStateChangeTime += (endTime - startTime);
    this.updateMemoryMetrics();
    
    return this.currentState;
  }

  // 状態の圧縮
  compressState(state) {
    const serialized = JSON.stringify(state);
    this.performanceMetrics.totalSerializationTime += 1; // 模擬
    
    // シンプルな圧縮模擬（実際のプロジェクトではLZ4やgzipを使用）
    const compressed = {
      data: serialized,
      originalSize: serialized.length,
      compressedSize: Math.floor(serialized.length * 0.6) // 40%圧縮と仮定
    };
    
    return compressed;
  }

  decompressState(compressed) {
    // 実際のプロジェクトでは対応する解凍処理
    return JSON.parse(compressed.data);
  }

  // 差分計算
  calculateDiff(oldState, newState) {
    const diff = {
      added: {},
      modified: {},
      removed: {}
    };
    
    // 新規・変更の検出
    for (const key in newState) {
      if (!(key in oldState)) {
        diff.added[key] = newState[key];
      } else if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        diff.modified[key] = {
          old: oldState[key],
          new: newState[key]
        };
      }
    }
    
    // 削除の検出
    for (const key in oldState) {
      if (!(key in newState)) {
        diff.removed[key] = oldState[key];
      }
    }
    
    return diff;
  }

  // ユーティリティメソッド
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  updateMemoryMetrics() {
    if (performance.memory) {
      const currentMemory = performance.memory.usedJSHeapSize;
      this.performanceMetrics.memoryUsage.current = currentMemory;
      
      if (currentMemory > this.performanceMetrics.memoryUsage.peak) {
        this.performanceMetrics.memoryUsage.peak = currentMemory;
      }
      
      // 履歴のメモリ使用量推定
      this.performanceMetrics.memoryUsage.history = 
        this.history.length * 1000 + this.redoStack.length * 1000; // 1KB per entry estimate
    }
  }

  getPerformanceMetrics() {
    const avgStateChangeTime = this.performanceMetrics.stateChanges > 0
      ? this.performanceMetrics.totalStateChangeTime / this.performanceMetrics.stateChanges
      : 0;
    
    return {
      ...this.performanceMetrics,
      avgStateChangeTime,
      historySize: this.history.length,
      redoStackSize: this.redoStack.length,
      subscriberCount: this.subscribers.size,
      cacheSize: this.diffCache.size + this.compressionCache.size
    };
  }

  // リソースクリーンアップ
  destroy() {
    this.history = [];
    this.redoStack = [];
    this.subscribers.clear();
    this.diffCache.clear();
    this.compressionCache.clear();
    this.currentState = {};
    this.performanceMetrics = {
      stateChanges: 0,
      subscriptionNotifications: 0,
      totalStateChangeTime: 0,
      totalSerializationTime: 0,
      memoryUsage: { current: 0, peak: 0, history: 0 }
    };
  }
}

describe('状態管理パフォーマンステスト', () => {
  let stateManager;
  let performanceMonitor;

  beforeEach(() => {
    stateManager = new StateManager({
      maxHistorySize: 50,
      enableDeepClone: true,
      enableDiffing: true
    });
    
    performanceMonitor = {
      measurements: new Map(),
      
      startMeasurement(name) {
        this.measurements.set(name, {
          startTime: performance.now(),
          startMemory: performance.memory?.usedJSHeapSize || 0
        });
      },
      
      endMeasurement(name) {
        const measurement = this.measurements.get(name);
        if (measurement) {
          measurement.endTime = performance.now();
          measurement.endMemory = performance.memory?.usedJSHeapSize || 0;
          measurement.duration = measurement.endTime - measurement.startTime;
          measurement.memoryUsed = measurement.endMemory - measurement.startMemory;
        }
        return measurement;
      }
    };
  });

  afterEach(() => {
    stateManager.destroy();
  });

  describe('基本的な状態変更性能テスト', () => {
    test('シンプルな状態設定の応答時間', () => {
      const testState = {
        user: { name: 'テストユーザー', id: 1 },
        settings: { theme: 'dark', language: 'ja' }
      };

      performanceMonitor.startMeasurement('simpleStateSet');
      
      stateManager.setState(testState);
      
      const measurement = performanceMonitor.endMeasurement('simpleStateSet');

      // シンプルな状態設定は3ms以内
      expect(measurement.duration).toBeLessThan(3);
      
      const metrics = stateManager.getPerformanceMetrics();
      expect(metrics.stateChanges).toBe(1);
      expect(metrics.avgStateChangeTime).toBeLessThan(3);
      
      // メモリ使用量が500KB以下
      expect(measurement.memoryUsed).toBeLessThan(500 * 1024);
    });

    test('部分的状態更新の効率', () => {
      // 初期状態を設定
      const initialState = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `ユーザー${i}`,
          active: true
        })),
        settings: { theme: 'light' },
        cache: {}
      };
      
      stateManager.setState(initialState);

      performanceMonitor.startMeasurement('partialUpdate');
      
      // 一部のユーザーのみ更新
      stateManager.updateState({
        settings: { theme: 'dark', notifications: true }
      });
      
      const measurement = performanceMonitor.endMeasurement('partialUpdate');

      // 部分更新は5ms以内
      expect(measurement.duration).toBeLessThan(5);
      
      const finalState = stateManager.getState();
      expect(finalState.settings.theme).toBe('dark');
      expect(finalState.users.length).toBe(100); // 既存データは保持
    });

    test('深いパス指定での状態更新', () => {
      const nestedState = {
        application: {
          modules: {
            editor: {
              config: {
                syntax: 'plantuml',
                theme: 'default'
              }
            }
          }
        }
      };
      
      stateManager.setState(nestedState);

      performanceMonitor.startMeasurement('deepPathUpdate');
      
      stateManager.setStateByPath('application.modules.editor.config.theme', 'dark');
      
      const measurement = performanceMonitor.endMeasurement('deepPathUpdate');

      // 深いパス更新は5ms以内
      expect(measurement.duration).toBeLessThan(5);
      
      const updatedValue = stateManager.getStateByPath('application.modules.editor.config.theme');
      expect(updatedValue).toBe('dark');
    });

    test('配列操作の性能', () => {
      const stateWithArray = {
        items: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `item${i}` }))
      };
      
      stateManager.setState(stateWithArray);

      performanceMonitor.startMeasurement('arrayOperations');
      
      // 複数の配列操作
      for (let i = 0; i < 10; i++) {
        stateManager.pushToArray('items', { id: 50 + i, value: `newItem${i}` });
      }
      
      for (let i = 0; i < 5; i++) {
        stateManager.removeFromArray('items', 0); // 先頭から削除
      }
      
      const measurement = performanceMonitor.endMeasurement('arrayOperations');

      // 15回の配列操作が50ms以内
      expect(measurement.duration).toBeLessThan(50);
      
      const finalItems = stateManager.getStateByPath('items');
      expect(finalItems.length).toBe(55); // 50 + 10 - 5
    });
  });

  describe('大量データ処理性能テスト', () => {
    test('大規模オブジェクトの状態設定', () => {
      // 10,000個のアイテムを含む大規模状態
      const largeState = {
        bigDataSet: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `データ${i}`,
          description: `説明文${i}`.repeat(5),
          metadata: {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            tags: [`tag${i % 10}`, `category${i % 5}`],
            properties: {
              type: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
              priority: Math.floor(Math.random() * 5),
              active: i % 2 === 0
            }
          }
        })),
        summary: {
          total: 10000,
          lastUpdated: new Date().toISOString()
        }
      };

      performanceMonitor.startMeasurement('largeStateSet');
      
      stateManager.setState(largeState);
      
      const measurement = performanceMonitor.endMeasurement('largeStateSet');

      // 大規模状態設定は500ms以内
      expect(measurement.duration).toBeLessThan(500);
      
      const metrics = stateManager.getPerformanceMetrics();
      expect(metrics.stateChanges).toBe(1);
      
      // メモリ使用量が50MB以下
      expect(measurement.memoryUsed).toBeLessThan(50 * 1024 * 1024);
    });

    test('大量の連続状態変更', () => {
      // 初期状態
      stateManager.setState({ counter: 0, items: [] });

      performanceMonitor.startMeasurement('massiveUpdates');
      
      // 1000回の連続更新
      for (let i = 0; i < 1000; i++) {
        stateManager.updateState({
          counter: i,
          lastUpdate: Date.now()
        });
      }
      
      const measurement = performanceMonitor.endMeasurement('massiveUpdates');

      // 1000回の更新が2秒以内
      expect(measurement.duration).toBeLessThan(2000);
      
      const metrics = stateManager.getPerformanceMetrics();
      expect(metrics.stateChanges).toBe(1001); // 初期設定 + 1000回更新
      expect(metrics.avgStateChangeTime).toBeLessThan(2); // 平均2ms以下
      
      const finalState = stateManager.getState();
      expect(finalState.counter).toBe(999);
    });

    test('バッチ更新の効率性', () => {
      stateManager.setState({ data: {} });

      // 個別更新のベンチマーク
      performanceMonitor.startMeasurement('individualUpdates');
      
      for (let i = 0; i < 100; i++) {
        stateManager.setStateByPath(`data.item${i}`, { value: i, processed: true });
      }
      
      const individualMeasurement = performanceMonitor.endMeasurement('individualUpdates');

      // 状態をリセット
      stateManager.setState({ data: {} });

      // バッチ更新のベンチマーク
      performanceMonitor.startMeasurement('batchUpdates');
      
      const batchUpdates = Array.from({ length: 100 }, (_, i) => ({
        type: 'SET_PATH',
        path: `data.item${i}`,
        value: { value: i, processed: true }
      }));
      
      stateManager.batchUpdates(batchUpdates);
      
      const batchMeasurement = performanceMonitor.endMeasurement('batchUpdates');

      // バッチ更新が個別更新より効率的
      expect(batchMeasurement.duration).toBeLessThan(individualMeasurement.duration * 0.5);
      
      const finalState = stateManager.getState();
      expect(Object.keys(finalState.data)).toHaveLength(100);
    });
  });

  describe('履歴管理性能テスト', () => {
    test('Undo/Redo操作の応答時間', () => {
      // 履歴を作成するための連続操作
      for (let i = 0; i < 20; i++) {
        stateManager.setState({ step: i, data: `step${i}` });
      }

      performanceMonitor.startMeasurement('undoOperations');
      
      // 10回のUndo操作
      for (let i = 0; i < 10; i++) {
        stateManager.undo();
      }
      
      const undoMeasurement = performanceMonitor.endMeasurement('undoOperations');

      performanceMonitor.startMeasurement('redoOperations');
      
      // 10回のRedo操作
      for (let i = 0; i < 10; i++) {
        stateManager.redo();
      }
      
      const redoMeasurement = performanceMonitor.endMeasurement('redoOperations');

      // Undo操作は30ms以内
      expect(undoMeasurement.duration).toBeLessThan(30);
      
      // Redo操作は30ms以内
      expect(redoMeasurement.duration).toBeLessThan(30);
      
      const finalState = stateManager.getState();
      expect(finalState.step).toBe(19); // 元に戻っている
    });

    test('大量履歴での性能劣化確認', () => {
      // 履歴限界まで操作を実行
      for (let i = 0; i < 60; i++) { // maxHistorySize(50)を超える
        stateManager.setState({ 
          iteration: i, 
          data: Array.from({ length: 100 }, (_, j) => `data${i}_${j}`)
        });
      }

      performanceMonitor.startMeasurement('historyLimitedUndo');
      
      // 履歴限界後のUndo操作
      for (let i = 0; i < 20; i++) {
        stateManager.undo();
      }
      
      const measurement = performanceMonitor.endMeasurement('historyLimitedUndo');

      // 履歴制限後でも効率的な操作
      expect(measurement.duration).toBeLessThan(60);
      
      const metrics = stateManager.getPerformanceMetrics();
      expect(metrics.historySize).toBeLessThanOrEqual(50); // 制限が適用されている
    });

    test('履歴圧縮機能の効果', () => {
      const compressedStateManager = new StateManager({
        enableCompression: true,
        maxHistorySize: 30
      });

      const largeStateData = {
        largeArray: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          content: `Large content ${i} `.repeat(50) // 大きなコンテンツ
        }))
      };

      performanceMonitor.startMeasurement('compressedHistory');
      
      // 大きなデータで複数回の状態変更
      for (let i = 0; i < 20; i++) {
        const modifiedData = { 
          ...largeStateData, 
          version: i,
          timestamp: Date.now()
        };
        compressedStateManager.setState(modifiedData);
      }
      
      const measurement = performanceMonitor.endMeasurement('compressedHistory');

      // 圧縮ありでも合理的な時間で処理
      expect(measurement.duration).toBeLessThan(300);
      
      const metrics = compressedStateManager.getPerformanceMetrics();
      expect(metrics.totalSerializationTime).toBeGreaterThan(0); // 圧縮処理が実行された
      
      compressedStateManager.destroy();
    });
  });

  describe('サブスクリプション性能テスト', () => {
    test('大量サブスクライバーへの通知性能', () => {
      const notifications = [];
      
      // 100個のサブスクライバーを登録
      for (let i = 0; i < 100; i++) {
        stateManager.subscribe(`subscriber${i}`, (state, prevState, action) => {
          notifications.push({ id: i, action, timestamp: Date.now() });
        });
      }

      performanceMonitor.startMeasurement('massiveNotifications');
      
      // 状態変更を実行
      stateManager.setState({
        broadcast: 'massUpdate',
        timestamp: Date.now(),
        data: Array.from({ length: 50 }, (_, i) => `item${i}`)
      });
      
      const measurement = performanceMonitor.endMeasurement('massiveNotifications');

      // 100サブスクライバーへの通知が50ms以内
      expect(measurement.duration).toBeLessThan(50);
      
      // 全サブスクライバーが通知を受信
      expect(notifications).toHaveLength(100);
      
      const metrics = stateManager.getPerformanceMetrics();
      expect(metrics.subscriptionNotifications).toBe(1);
    });

    test('フィルタ付きサブスクリプションの効率', () => {
      let userNotifications = 0;
      let systemNotifications = 0;
      
      // ユーザー関連の変更のみを監視
      stateManager.subscribe('userWatcher', () => {
        userNotifications++;
      }, {
        filter: (state, prevState, action) => action.includes('USER')
      });
      
      // システム関連の変更のみを監視
      stateManager.subscribe('systemWatcher', () => {
        systemNotifications++;
      }, {
        filter: (state, prevState, action) => action.includes('SYSTEM')
      });

      performanceMonitor.startMeasurement('filteredNotifications');
      
      // 異なるタイプの状態変更を実行
      stateManager.setState({ user: { name: 'test' } }, 'USER_UPDATE');
      stateManager.setState({ system: { status: 'ok' } }, 'SYSTEM_UPDATE');
      stateManager.setState({ other: { data: 'misc' } }, 'OTHER_UPDATE');
      
      const measurement = performanceMonitor.endMeasurement('filteredNotifications');

      // フィルタ処理込みで15ms以内
      expect(measurement.duration).toBeLessThan(15);
      
      // フィルタが正しく動作
      expect(userNotifications).toBe(1);
      expect(systemNotifications).toBe(1);
    });

    test('スロットリング機能の効果', () => {
      let throttledNotifications = 0;
      let regularNotifications = 0;
      
      // スロットリング付きサブスクライバー
      stateManager.subscribe('throttledSubscriber', () => {
        throttledNotifications++;
      }, {
        throttle: 50 // 50ms間隔
      });
      
      // 通常のサブスクライバー
      stateManager.subscribe('regularSubscriber', () => {
        regularNotifications++;
      });

      performanceMonitor.startMeasurement('throttledUpdates');
      
      // 高頻度で状態変更
      for (let i = 0; i < 20; i++) {
        stateManager.setState({ counter: i }, `UPDATE_${i}`);
        // 実際のシナリオでは短い間隔で変更が発生する
      }
      
      const measurement = performanceMonitor.endMeasurement('throttledUpdates');

      // スロットリングにより通知回数が削減されている
      expect(throttledNotifications).toBeLessThan(regularNotifications);
      expect(regularNotifications).toBe(20);
      
      // 全体的な処理時間も改善されている
      expect(measurement.duration).toBeLessThan(100);
    });
  });

  describe('メモリ効率性テスト', () => {
    test('状態変更によるメモリ増加の監視', () => {
      const initialMetrics = stateManager.getPerformanceMetrics();
      const baseMemory = initialMetrics.memoryUsage.current;

      performanceMonitor.startMeasurement('memoryGrowthTest');
      
      // 段階的にメモリ使用量を増やす
      for (let i = 0; i < 50; i++) {
        const largeData = {
          iteration: i,
          largeContent: Array.from({ length: 100 }, (_, j) => ({
            id: j,
            content: `Large content item ${i}-${j} `.repeat(20)
          }))
        };
        
        stateManager.setState(largeData);
        
        if (i % 10 === 0) {
          stateManager.updateMemoryMetrics();
        }
      }
      
      const measurement = performanceMonitor.endMeasurement('memoryGrowthTest');
      const finalMetrics = stateManager.getPerformanceMetrics();

      // メモリ増加が合理的な範囲内
      expect(finalMetrics.memoryUsage.peak).toBeGreaterThan(baseMemory);
      expect(finalMetrics.memoryUsage.history).toBeLessThan(10 * 1024 * 1024); // 10MB以下
      
      // 処理時間も合理的
      expect(measurement.duration).toBeLessThan(1000);
    });

    test('深いクローンとシャローコピーの性能比較', () => {
      const testState = {
        level1: {
          level2: {
            level3: {
              level4: Array.from({ length: 100 }, (_, i) => ({
                id: i,
                data: `item${i}`,
                nested: { value: i * 2 }
              }))
            }
          }
        }
      };

      // 深いクローン有効
      const deepCloneManager = new StateManager({ enableDeepClone: true });
      
      performanceMonitor.startMeasurement('deepCloneUpdates');
      
      for (let i = 0; i < 10; i++) {
        deepCloneManager.setState({ ...testState, version: i });
      }
      
      const deepCloneMeasurement = performanceMonitor.endMeasurement('deepCloneUpdates');

      // 深いクローン無効（シャローコピー）
      const shallowCopyManager = new StateManager({ enableDeepClone: false });
      
      performanceMonitor.startMeasurement('shallowCopyUpdates');
      
      for (let i = 0; i < 10; i++) {
        shallowCopyManager.setState({ ...testState, version: i });
      }
      
      const shallowCopyMeasurement = performanceMonitor.endMeasurement('shallowCopyUpdates');

      // シャローコピーの方が高速
      expect(shallowCopyMeasurement.duration).toBeLessThan(deepCloneMeasurement.duration);
      
      // ただし、深いクローンでも合理的な時間
      expect(deepCloneMeasurement.duration).toBeLessThan(200);
      
      deepCloneManager.destroy();
      shallowCopyManager.destroy();
    });

    test('差分計算機能のメモリ効率', () => {
      const diffManager = new StateManager({ enableDiffing: true });
      const noDiffManager = new StateManager({ enableDiffing: false });
      
      const baseState = { data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: i })) };
      
      // 差分計算ありの場合
      performanceMonitor.startMeasurement('withDiffCalculation');
      
      diffManager.setState(baseState);
      for (let i = 0; i < 20; i++) {
        const modifiedState = { 
          ...baseState, 
          data: baseState.data.map(item => 
            item.id === i ? { ...item, value: item.value * 2 } : item
          )
        };
        diffManager.setState(modifiedState);
      }
      
      const diffMeasurement = performanceMonitor.endMeasurement('withDiffCalculation');
      const diffMetrics = diffManager.getPerformanceMetrics();

      // 差分計算なしの場合
      performanceMonitor.startMeasurement('withoutDiffCalculation');
      
      noDiffManager.setState(baseState);
      for (let i = 0; i < 20; i++) {
        const modifiedState = { 
          ...baseState, 
          data: baseState.data.map(item => 
            item.id === i ? { ...item, value: item.value * 2 } : item
          )
        };
        noDiffManager.setState(modifiedState);
      }
      
      const noDiffMeasurement = performanceMonitor.endMeasurement('withoutDiffCalculation');

      // 差分計算のオーバーヘッドが許容範囲内
      expect(diffMeasurement.duration).toBeLessThan(noDiffMeasurement.duration * 1.5);
      
      // 差分キャッシュが適切に機能
      expect(diffMetrics.cacheSize).toBeGreaterThan(0);
      
      diffManager.destroy();
      noDiffManager.destroy();
    });
  });

  describe('実世界シナリオ性能テスト', () => {
    test('PlantUMLエディター状態管理シミュレーション', () => {
      // PlantUMLエディターの典型的な状態構造
      const editorState = {
        project: {
          id: 'project-1',
          title: 'Sample PlantUML Project',
          lastModified: Date.now()
        },
        editors: {
          action: {
            actions: [],
            activeActionId: null
          },
          condition: {
            conditions: [],
            activeConditionId: null
          },
          loop: {
            loops: [],
            activeLoopId: null
          },
          parallel: {
            parallelBlocks: [],
            activeBlockId: null
          }
        },
        output: {
          plantUMLCode: '',
          previewImage: null,
          errors: []
        },
        ui: {
          activeTab: 'action',
          sidebarVisible: true,
          previewVisible: true
        }
      };

      stateManager.setState(editorState);

      performanceMonitor.startMeasurement('editorSimulation');
      
      // エディター操作のシミュレーション
      for (let i = 0; i < 30; i++) {
        // アクション追加
        stateManager.pushToArray('editors.action.actions', {
          id: `action-${i}`,
          name: `アクション${i}`,
          description: `説明${i}`
        });
        
        // タブ切り替え
        const tabs = ['action', 'condition', 'loop', 'parallel'];
        stateManager.setStateByPath('ui.activeTab', tabs[i % 4]);
        
        // PlantUMLコード更新
        stateManager.setStateByPath('output.plantUMLCode', `@startuml\n... code ${i} ...\n@enduml`);
      }
      
      const measurement = performanceMonitor.endMeasurement('editorSimulation');

      // エディター操作シミュレーションが150ms以内
      expect(measurement.duration).toBeLessThan(150);
      
      const finalState = stateManager.getState();
      expect(finalState.editors.action.actions).toHaveLength(30);
      expect(finalState.ui.activeTab).toBe('condition'); // 29 % 4 = 1
    });

    test('リアルタイム協調編集シミュレーション', () => {
      // 複数ユーザーからの同時編集をシミュレート
      const collaborativeUpdates = [];
      
      for (let user = 0; user < 5; user++) {
        for (let edit = 0; edit < 10; edit++) {
          collaborativeUpdates.push({
            type: 'SET_PATH',
            path: `users.user${user}.edits.edit${edit}`,
            value: {
              timestamp: Date.now() + user * 100 + edit * 10,
              content: `Edit ${edit} by user ${user}`,
              userId: user
            }
          });
        }
      }

      performanceMonitor.startMeasurement('collaborativeEditing');
      
      // バッチで協調編集を処理
      stateManager.batchUpdates(collaborativeUpdates);
      
      const measurement = performanceMonitor.endMeasurement('collaborativeEditing');

      // 50個の協調編集が80ms以内で処理
      expect(measurement.duration).toBeLessThan(80);
      
      const finalState = stateManager.getState();
      expect(Object.keys(finalState.users)).toHaveLength(5);
    });

    test('ライブプレビュー更新の性能', () => {
      let previewUpdateCount = 0;
      
      // プレビュー更新を監視するサブスクライバー
      stateManager.subscribe('previewUpdater', (state, prevState, action) => {
        if (action.includes('PREVIEW') || state.output?.plantUMLCode !== prevState?.output?.plantUMLCode) {
          previewUpdateCount++;
        }
      }, {
        throttle: 100 // 100ms間隔でスロットリング
      });

      // 初期状態
      stateManager.setState({
        output: { plantUMLCode: '', previewImage: null },
        editing: true
      });

      performanceMonitor.startMeasurement('livePreviewUpdates');
      
      // 高頻度でのコード変更（ユーザーのタイピングをシミュレート）
      const codeFragments = [
        '@startuml',
        '@startuml\nparticipant User',
        '@startuml\nparticipant User\nparticipant System',
        '@startuml\nparticipant User\nparticipant System\nUser -> System : request',
        '@startuml\nparticipant User\nparticipant System\nUser -> System : request\nSystem -> User : response',
        '@startuml\nparticipant User\nparticipant System\nUser -> System : request\nSystem -> User : response\n@enduml'
      ];
      
      for (let i = 0; i < codeFragments.length; i++) {
        stateManager.setStateByPath('output.plantUMLCode', codeFragments[i], 'PREVIEW_UPDATE');
        
        // タイピング間隔をシミュレート
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const measurement = performanceMonitor.endMeasurement('livePreviewUpdates');

      // ライブプレビュー更新が合理的な時間で処理
      expect(measurement.duration).toBeLessThan(400);
      
      // スロットリングにより更新回数が制御されている
      expect(previewUpdateCount).toBeLessThan(codeFragments.length);
    });
  });
});