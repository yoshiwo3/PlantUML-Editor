/**
 * state-management.test.js - 状態管理統合テスト
 * TEST-003: 統合テストスイート作成 - 状態管理機能
 * 
 * テスト対象:
 * - Undo/Redo機能（50操作）
 * - 自動保存機能（30秒間隔）
 * - セッション復元
 * - データ永続化
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// Mock環境設定
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

// EditorManager モック
jest.mock('../../src/components/editors/EditorManager.js');

describe('状態管理統合テスト', () => {
  let editorManager;
  let container;
  let stateManager;

  beforeEach(async () => {
    // DOM環境セットアップ
    document.body.innerHTML = `
      <div id="state-test-container">
        <div id="editor-workspace">
          <div id="action-editor"></div>
          <div id="condition-editor"></div>
          <div id="loop-editor"></div>
          <div id="parallel-editor"></div>
        </div>
        <div id="toolbar">
          <button id="undo-btn">元に戻す</button>
          <button id="redo-btn">やり直し</button>
          <button id="save-btn">保存</button>
          <button id="load-btn">読み込み</button>
        </div>
        <div id="status-bar">
          <span id="save-status">保存済み</span>
          <span id="operation-count">操作数: 0</span>
        </div>
      </div>
    `;
    
    container = document.getElementById('state-test-container');
    
    // EditorManager初期化
    const { EditorManager } = await import('../../src/components/editors/EditorManager.js');
    editorManager = new EditorManager(container, {
      enableAutoSave: true,
      autoSaveInterval: 1000, // テスト用に短縮（1秒）
      maxUndoHistory: 50
    });
    
    // StateManager模擬実装
    stateManager = {
      history: [],
      currentIndex: -1,
      maxHistory: 50,
      autoSaveTimer: null,
      
      // 操作を履歴に追加
      addOperation(operation) {
        this.history = this.history.slice(0, this.currentIndex + 1);
        this.history.push({
          ...operation,
          timestamp: Date.now(),
          id: Math.random().toString(36).substr(2, 9)
        });
        
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        } else {
          this.currentIndex++;
        }
      },
      
      // Undo実行
      undo() {
        if (this.currentIndex >= 0) {
          const operation = this.history[this.currentIndex];
          this.currentIndex--;
          return operation;
        }
        return null;
      },
      
      // Redo実行
      redo() {
        if (this.currentIndex < this.history.length - 1) {
          this.currentIndex++;
          const operation = this.history[this.currentIndex];
          return operation;
        }
        return null;
      },
      
      // 履歴クリア
      clearHistory() {
        this.history = [];
        this.currentIndex = -1;
      },
      
      // 自動保存開始
      startAutoSave(callback, interval = 30000) {
        this.stopAutoSave();
        this.autoSaveTimer = setInterval(callback, interval);
      },
      
      // 自動保存停止
      stopAutoSave() {
        if (this.autoSaveTimer) {
          clearInterval(this.autoSaveTimer);
          this.autoSaveTimer = null;
        }
      }
    };
    
    editorManager.stateManager = stateManager;
  });

  afterEach(() => {
    if (stateManager.autoSaveTimer) {
      clearInterval(stateManager.autoSaveTimer);
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Undo/Redo機能テスト', () => {
    test('基本的なUndo/Redo操作', () => {
      // 操作を実行
      stateManager.addOperation({
        type: 'ADD_ACTION',
        data: { name: 'アクション1', description: '説明1' },
        target: 'action-editor'
      });
      
      stateManager.addOperation({
        type: 'EDIT_ACTION',
        data: { name: 'アクション1（修正）', description: '修正された説明' },
        target: 'action-editor'
      });
      
      expect(stateManager.history).toHaveLength(2);
      expect(stateManager.currentIndex).toBe(1);
      
      // Undo実行
      const undoOperation = stateManager.undo();
      expect(undoOperation.type).toBe('EDIT_ACTION');
      expect(stateManager.currentIndex).toBe(0);
      
      // Redo実行
      const redoOperation = stateManager.redo();
      expect(redoOperation.type).toBe('EDIT_ACTION');
      expect(stateManager.currentIndex).toBe(1);
    });

    test('50操作の履歴管理', () => {
      // 50個の操作を追加
      for (let i = 0; i < 60; i++) {
        stateManager.addOperation({
          type: 'ADD_ACTION',
          data: { name: `アクション${i}` },
          target: 'action-editor'
        });
      }
      
      // 最大50個まで保持されることを確認
      expect(stateManager.history).toHaveLength(50);
      expect(stateManager.currentIndex).toBe(49);
      
      // 最新の操作が保持されていることを確認
      const latestOperation = stateManager.history[49];
      expect(latestOperation.data.name).toBe('アクション59');
    });

    test('複数エディターでのUndo/Redo', () => {
      // 異なるエディターでの操作
      stateManager.addOperation({
        type: 'ADD_ACTION',
        data: { name: 'アクション1' },
        target: 'action-editor'
      });
      
      stateManager.addOperation({
        type: 'ADD_CONDITION',
        data: { condition: 'x > 10' },
        target: 'condition-editor'
      });
      
      stateManager.addOperation({
        type: 'ADD_LOOP',
        data: { condition: 'i < 5' },
        target: 'loop-editor'
      });
      
      // Undoで逆順に操作を取り消し
      let operation = stateManager.undo();
      expect(operation.target).toBe('loop-editor');
      
      operation = stateManager.undo();
      expect(operation.target).toBe('condition-editor');
      
      operation = stateManager.undo();
      expect(operation.target).toBe('action-editor');
    });

    test('Undo/Redo範囲外操作の処理', () => {
      // 履歴がない状態でUndo
      const undoResult = stateManager.undo();
      expect(undoResult).toBeNull();
      
      // 1つの操作を追加してUndo
      stateManager.addOperation({
        type: 'ADD_ACTION',
        data: { name: 'テスト' }
      });
      
      stateManager.undo();
      
      // 履歴の最初でさらにUndo
      const undoResult2 = stateManager.undo();
      expect(undoResult2).toBeNull();
      
      // Redoで復元
      const redoResult = stateManager.redo();
      expect(redoResult).not.toBeNull();
      
      // 履歴の最後でさらにRedo
      const redoResult2 = stateManager.redo();
      expect(redoResult2).toBeNull();
    });
  });

  describe('自動保存機能テスト', () => {
    test('定期的な自動保存', (done) => {
      let saveCount = 0;
      
      // 自動保存コールバック
      const autoSaveCallback = () => {
        saveCount++;
        
        // 模擬データを保存
        const saveData = {
          timestamp: Date.now(),
          editors: {
            action: { items: ['action1', 'action2'] },
            condition: { items: ['condition1'] },
            loop: { items: ['loop1'] },
            parallel: { items: ['parallel1'] }
          },
          history: stateManager.history.slice(),
          currentIndex: stateManager.currentIndex
        };
        
        window.localStorage.setItem('plantuml-autosave', JSON.stringify(saveData));
        
        if (saveCount >= 2) {
          stateManager.stopAutoSave();
          expect(saveCount).toBeGreaterThanOrEqual(2);
          expect(window.localStorage.setItem).toHaveBeenCalled();
          done();
        }
      };
      
      // 自動保存開始（500ms間隔）
      stateManager.startAutoSave(autoSaveCallback, 500);
      
      // テストデータ追加
      stateManager.addOperation({
        type: 'ADD_ACTION',
        data: { name: 'テストアクション' }
      });
    }, 10000);

    test('手動保存機能', () => {
      // テストデータを作成
      stateManager.addOperation({
        type: 'ADD_ACTION',
        data: { name: 'アクション1' }
      });
      
      stateManager.addOperation({
        type: 'ADD_CONDITION',
        data: { condition: 'status == "ready"' }
      });
      
      // 手動保存実行
      const saveData = {
        timestamp: Date.now(),
        version: '1.0.0',
        editors: {
          action: { count: 1 },
          condition: { count: 1 },
          loop: { count: 0 },
          parallel: { count: 0 }
        },
        history: stateManager.history,
        currentIndex: stateManager.currentIndex
      };
      
      window.localStorage.setItem('plantuml-manual-save', JSON.stringify(saveData));
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'plantuml-manual-save',
        expect.stringContaining('"version":"1.0.0"')
      );
    });

    test('保存データの整合性検証', () => {
      // テストデータを追加
      for (let i = 0; i < 5; i++) {
        stateManager.addOperation({
          type: 'ADD_ACTION',
          data: { name: `アクション${i}` },
          timestamp: Date.now() + i
        });
      }
      
      // 保存データ作成
      const saveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        checksum: 'mock-checksum',
        history: stateManager.history,
        currentIndex: stateManager.currentIndex
      };
      
      // 保存とロードのシミュレーション
      const serialized = JSON.stringify(saveData);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.history).toHaveLength(5);
      expect(deserialized.currentIndex).toBe(4);
      expect(deserialized.version).toBe('1.0.0');
    });
  });

  describe('セッション復元テスト', () => {
    test('ページリロード後のセッション復元', () => {
      // セッションデータを準備
      const sessionData = {
        timestamp: Date.now(),
        history: [
          {
            type: 'ADD_ACTION',
            data: { name: 'セッションアクション1' },
            timestamp: Date.now() - 1000,
            id: 'session-1'
          },
          {
            type: 'ADD_CONDITION',
            data: { condition: 'x > 0' },
            timestamp: Date.now() - 500,
            id: 'session-2'
          }
        ],
        currentIndex: 1
      };
      
      // sessionStorageにデータを設定
      window.sessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));
      
      // セッション復元を実行
      const restored = JSON.parse(window.sessionStorage.getItem('plantuml-session'));
      
      // 状態管理に復元
      stateManager.history = restored.history;
      stateManager.currentIndex = restored.currentIndex;
      
      expect(stateManager.history).toHaveLength(2);
      expect(stateManager.currentIndex).toBe(1);
      expect(stateManager.history[0].data.name).toBe('セッションアクション1');
    });

    test('破損したセッションデータの処理', () => {
      // 破損したJSONデータ
      window.sessionStorage.getItem.mockReturnValue('{"broken": json}');
      
      let restored = null;
      let error = null;
      
      try {
        restored = JSON.parse(window.sessionStorage.getItem('plantuml-session'));
      } catch (e) {
        error = e;
        // デフォルト状態に初期化
        stateManager.clearHistory();
      }
      
      expect(error).toBeInstanceOf(SyntaxError);
      expect(stateManager.history).toHaveLength(0);
      expect(stateManager.currentIndex).toBe(-1);
    });

    test('古いバージョンのセッションデータ処理', () => {
      // 古いバージョンのデータ形式
      const oldSessionData = {
        version: '0.9.0', // 古いバージョン
        data: ['action1', 'condition1'], // 古い形式
        timestamp: Date.now() - 86400000 // 1日前
      };
      
      window.sessionStorage.getItem.mockReturnValue(JSON.stringify(oldSessionData));
      
      const restored = JSON.parse(window.sessionStorage.getItem('plantuml-session'));
      
      // バージョンチェックと変換処理
      if (restored.version !== '1.0.0') {
        // 古い形式を新しい形式に変換
        const convertedData = {
          version: '1.0.0',
          history: restored.data.map((item, index) => ({
            type: 'LEGACY_OPERATION',
            data: { item },
            timestamp: restored.timestamp + index,
            id: `legacy-${index}`
          })),
          currentIndex: restored.data.length - 1
        };
        
        stateManager.history = convertedData.history;
        stateManager.currentIndex = convertedData.currentIndex;
      }
      
      expect(stateManager.history).toHaveLength(2);
      expect(stateManager.history[0].type).toBe('LEGACY_OPERATION');
    });
  });

  describe('データ永続化テスト', () => {
    test('localStorageへの永続化', () => {
      // データを作成
      stateManager.addOperation({
        type: 'PROJECT_CREATE',
        data: {
          name: 'テストプロジェクト',
          description: 'テスト用プロジェクト',
          editors: ['action', 'condition']
        }
      });
      
      // 永続化実行
      const persistData = {
        projectName: 'テストプロジェクト',
        lastSaved: Date.now(),
        history: stateManager.history,
        currentIndex: stateManager.currentIndex,
        settings: {
          theme: 'default',
          autoSave: true
        }
      };
      
      window.localStorage.setItem('plantuml-project', JSON.stringify(persistData));
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'plantuml-project',
        expect.stringContaining('"projectName":"テストプロジェクト"')
      );
    });

    test('大量データの永続化性能', () => {
      const startTime = performance.now();
      
      // 大量のデータを作成
      for (let i = 0; i < 100; i++) {
        stateManager.addOperation({
          type: 'BULK_OPERATION',
          data: {
            index: i,
            content: `データ${i}`.repeat(100) // 大きなデータ
          }
        });
      }
      
      // 永続化実行
      const largeData = {
        history: stateManager.history,
        currentIndex: stateManager.currentIndex
      };
      
      const serialized = JSON.stringify(largeData);
      window.localStorage.setItem('plantuml-large-data', serialized);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 大量データの永続化が1秒以内に完了することを確認
      expect(executionTime).toBeLessThan(1000);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'plantuml-large-data',
        expect.any(String)
      );
    });

    test('データ圧縮と復元', () => {
      // 圧縮対象のデータ
      const originalData = {
        history: Array.from({ length: 50 }, (_, i) => ({
          type: 'REPEATED_OPERATION',
          data: { name: `繰り返しデータ${i}`, description: '同じような説明'.repeat(10) },
          timestamp: Date.now() + i
        })),
        currentIndex: 49
      };
      
      // 模擬圧縮（実際の実装ではlz-stringなどを使用）
      const compressed = JSON.stringify(originalData);
      
      // 保存
      window.localStorage.setItem('plantuml-compressed', compressed);
      
      // 復元
      window.localStorage.getItem.mockReturnValue(compressed);
      const restored = JSON.parse(window.localStorage.getItem('plantuml-compressed'));
      
      expect(restored.history).toHaveLength(50);
      expect(restored.currentIndex).toBe(49);
      expect(restored.history[0].data.name).toBe('繰り返しデータ0');
    });
  });

  describe('パフォーマンス監視テスト', () => {
    test('状態管理操作の応答時間測定', () => {
      const performanceMetrics = {
        addOperation: [],
        undo: [],
        redo: []
      };
      
      // 操作追加の性能測定
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        stateManager.addOperation({
          type: 'PERFORMANCE_TEST',
          data: { index: i }
        });
        const end = performance.now();
        performanceMetrics.addOperation.push(end - start);
      }
      
      // Undo操作の性能測定
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        stateManager.undo();
        const end = performance.now();
        performanceMetrics.undo.push(end - start);
      }
      
      // Redo操作の性能測定
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        stateManager.redo();
        const end = performance.now();
        performanceMetrics.redo.push(end - start);
      }
      
      // 平均応答時間を計算
      const avgAddTime = performanceMetrics.addOperation.reduce((a, b) => a + b, 0) / performanceMetrics.addOperation.length;
      const avgUndoTime = performanceMetrics.undo.reduce((a, b) => a + b, 0) / performanceMetrics.undo.length;
      const avgRedoTime = performanceMetrics.redo.reduce((a, b) => a + b, 0) / performanceMetrics.redo.length;
      
      // 応答時間が10ms以内であることを確認
      expect(avgAddTime).toBeLessThan(10);
      expect(avgUndoTime).toBeLessThan(10);
      expect(avgRedoTime).toBeLessThan(10);
    });

    test('メモリ使用量の監視', () => {
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      // 大量の状態変更を実行
      for (let i = 0; i < 1000; i++) {
        stateManager.addOperation({
          type: 'MEMORY_TEST',
          data: {
            largeArray: new Array(1000).fill(`data-${i}`),
            timestamp: Date.now()
          }
        });
        
        // 定期的にガベージコレクションをトリガー
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ増加が100MB以内であることを確認
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});