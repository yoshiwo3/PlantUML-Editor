/**
 * integration-setup.js - 統合テスト用セットアップ
 * TEST-003対応: エディター間連携、状態管理、PlantUML変換
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

// DOM操作拡張
import 'jest-extended';

// DOMPurifyモック（グローバル設定）
const mockDOMPurify = {
  sanitize: jest.fn((input) => input),
  isSupported: true,
  addHook: jest.fn(),
  removeHook: jest.fn(),
  removeHooks: jest.fn(),
  removeAllHooks: jest.fn()
};

global.DOMPurify = mockDOMPurify;

// WebWorkerモック（統合テスト用）
class MockWorker {
  constructor(scriptURL) {
    this.scriptURL = scriptURL;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }

  postMessage(data) {
    // 統合テスト用の簡単な応答シミュレート
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            type: 'INTEGRATION_RESPONSE',
            originalData: data,
            timestamp: Date.now(),
            result: 'mock-processed'
          }
        });
      }
    }, 10);
  }

  terminate() {
    this.onmessage = null;
    this.onerror = null;
  }
}

global.Worker = MockWorker;

// IntersectionObserverモック
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// ResizeObserverモック
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// MutationObserverモック
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// Performance API拡張
if (!performance.mark) {
  performance.mark = jest.fn();
}

if (!performance.measure) {
  performance.measure = jest.fn();
}

if (!performance.getEntriesByType) {
  performance.getEntriesByType = jest.fn().mockReturnValue([]);
}

if (!performance.getEntriesByName) {
  performance.getEntriesByName = jest.fn().mockReturnValue([]);
}

// Custom Eventsサポート
if (typeof CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  };
}

// localStorage/sessionStorageモック（統合テスト用）
const createStorageMock = () => {
  let store = {};
  
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null)
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
  writable: true
});

// fetch APIモック
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('mock response'),
    headers: new Headers(),
    clone: jest.fn()
  })
);

// URL APIモック
if (typeof URL === 'undefined') {
  global.URL = class URL {
    constructor(url, base) {
      this.href = url;
      this.protocol = 'http:';
      this.host = 'localhost';
      this.hostname = 'localhost';
      this.port = '8086';
      this.pathname = '/';
      this.search = '';
      this.hash = '';
      this.origin = 'http://localhost:8086';
    }
  };
}

// requestAnimationFrameモック（統合テスト用）
let rafId = 0;
global.requestAnimationFrame = jest.fn((callback) => {
  rafId++;
  return setTimeout(callback, 16);
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Document.createRange モック
if (!document.createRange) {
  document.createRange = () => ({
    setStart: jest.fn(),
    setEnd: jest.fn(),
    commonAncestorContainer: document.body,
    collapsed: true,
    startContainer: document.body,
    startOffset: 0,
    endContainer: document.body,
    endOffset: 0,
    getBoundingClientRect: jest.fn(() => ({
      x: 0, y: 0, width: 0, height: 0,
      top: 0, right: 0, bottom: 0, left: 0
    })),
    cloneContents: jest.fn(() => document.createDocumentFragment()),
    selectNode: jest.fn(),
    selectNodeContents: jest.fn()
  });
}

// getSelection モック
if (!window.getSelection) {
  window.getSelection = () => ({
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
    toString: jest.fn(() => ''),
    rangeCount: 0,
    isCollapsed: true
  });
}

// エラーハンドリング拡張
const originalConsoleError = console.error;
console.error = (...args) => {
  // 統合テストでは特定のエラーを抑制
  const message = args[0]?.toString() || '';
  
  if (
    message.includes('Warning: React') ||
    message.includes('Warning: validateDOMNesting') ||
    message.includes('Not implemented: HTMLCanvasElement')
  ) {
    return; // 無害な警告は抑制
  }
  
  originalConsoleError.apply(console, args);
};

// テストユーティリティ関数
global.testUtils = {
  // 非同期処理の完了待ち
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // DOM要素の準備
  setupTestDOM: (html) => {
    document.body.innerHTML = html;
    return document.body;
  },
  
  // イベント発火ヘルパー
  fireEvent: (element, eventType, options = {}) => {
    const event = new Event(eventType, { bubbles: true, ...options });
    element.dispatchEvent(event);
    return event;
  },
  
  // モック関数のリセット
  resetAllMocks: () => {
    jest.clearAllMocks();
    mockDOMPurify.sanitize.mockImplementation((input) => input);
    global.fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve('mock response')
      })
    );
  },
  
  // パフォーマンス測定ヘルパー
  measurePerformance: async (fn) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  }
};

// 各テスト前のクリーンアップ
beforeEach(() => {
  // DOMをクリア
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // モックをリセット
  jest.clearAllMocks();
  
  // ローカルストレージをクリア
  window.localStorage.clear();
  window.sessionStorage.clear();
  
  // グローバル変数をリセット
  delete window.PlantUMLEditor;
  delete window.EditorManager;
});

// 各テスト後のクリーンアップ
afterEach(() => {
  // タイマーをクリア
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  
  // イベントリスナーをクリア
  document.removeAllListeners?.();
  
  // メモリリークを防ぐ
  if (global.gc) {
    global.gc();
  }
});

// 統合テスト固有の設定
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = 'integration';

console.log('✅ 統合テスト環境セットアップ完了');