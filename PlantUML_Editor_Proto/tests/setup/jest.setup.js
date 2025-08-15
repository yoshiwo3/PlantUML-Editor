/**
 * Jest Test Setup Configuration
 * 
 * Jest実行前の環境設定とモック設定
 * セキュリティテスト用の初期化処理
 * 
 * 作成日: 2025-08-15
 * 作成者: agent-orchestrator (webapp-test-automation role)
 */

// DOM環境のセットアップ
require('jsdom-global')();

// カスタムマッチャーの追加
expect.extend({
  toBeSecure(received) {
    const pass = received && received.isValid && received.security && received.security.riskLevel === 'safe';
    if (pass) {
      return {
        message: () => `expected ${received} not to be secure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be secure`,
        pass: false,
      };
    }
  },
  
  toHaveSecurityRisk(received, expectedRiskLevel) {
    const actualRiskLevel = received && received.security && received.security.riskLevel;
    const pass = actualRiskLevel === expectedRiskLevel;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have security risk level ${expectedRiskLevel}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have security risk level ${expectedRiskLevel}, but got ${actualRiskLevel}`,
        pass: false,
      };
    }
  },
  
  toHaveDetectedThreats(received, expectedCount) {
    const actualCount = received && received.security ? 
      (received.security.xss.length + received.security.injection.length + received.security.scriptEmbedding.length) : 0;
    const pass = actualCount === expectedCount;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have ${expectedCount} threats`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have ${expectedCount} threats, but got ${actualCount}`,
        pass: false,
      };
    }
  }
});

// グローバル変数の設定
global.console = {
  ...console,
  // 一部のログレベルを抑制（テスト中のノイズ減少）
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// ブラウザAPI のモック
global.alert = jest.fn();
global.confirm = jest.fn(() => true);
global.prompt = jest.fn(() => 'test input');

// Navigator API のモック
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'PlantUML-Editor-Test-Agent/1.0',
  writable: true,
});

Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('test clipboard content')),
  },
  writable: true,
});

// Performance API のモック
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024, // 1MB
      totalJSHeapSize: 2 * 1024 * 1024, // 2MB
      jsHeapSizeLimit: 4 * 1024 * 1024, // 4MB
    },
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
  },
  writable: true,
});

// URL API のモック
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'blob:test-url'),
    revokeObjectURL: jest.fn(),
  },
  writable: true,
});

// Fetch API のモック
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);

// WebSocket のモック
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
}));

// setTimeout/setInterval のモック改善
jest.useFakeTimers();

// HTMLElement プロトタイプの拡張
HTMLElement.prototype.scrollIntoView = jest.fn();
HTMLElement.prototype.animate = jest.fn(() => ({
  finished: Promise.resolve(),
  cancel: jest.fn(),
}));

// IntersectionObserver のモック
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// MutationObserver のモック
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
}));

// ResizeObserver のモック
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// File API のモック
global.File = jest.fn(() => ({
  name: 'test.puml',
  size: 1024,
  type: 'text/plain',
  lastModified: Date.now(),
}));

global.FileReader = jest.fn(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Blob のモック
global.Blob = jest.fn(() => ({
  size: 1024,
  type: 'text/plain',
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  text: () => Promise.resolve('test content'),
}));

// Storage API のモック
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockStorage,
  writable: true,
});

// CSS関連のモック
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  value: 100,
});

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  value: 100,
});

Object.defineProperty(HTMLElement.prototype, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// イベント関連のヘルパー
global.createMockEvent = (type, properties = {}) => {
  const event = new Event(type);
  Object.assign(event, properties);
  return event;
};

global.createMockMouseEvent = (type, properties = {}) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...properties,
  });
  return event;
};

global.createMockKeyboardEvent = (type, properties = {}) => {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    ...properties,
  });
  return event;
};

// セキュリティテスト用のヘルパー関数
global.createMaliciousPayload = (type) => {
  const payloads = {
    xss: '<script>alert("XSS")</script>',
    injection: "'; DROP TABLE users; --",
    javascript: 'javascript:void(eval("malicious"))',
    iframe: '<iframe src="javascript:void(0)"></iframe>',
    img: '<img src="x" onerror="alert(1)">',
    eval: 'eval("malicious code")',
    cookie: 'document.cookie',
  };
  
  return payloads[type] || payloads.xss;
};

global.createSafePayload = () => {
  return 'これは安全なテストデータです';
};

// テスト実行前の初期化
beforeAll(() => {
  console.log('[Test Setup] Jest環境初期化完了');
  console.log('[Test Setup] セキュリティテスト用モック設定完了');
});

// 各テスト実行前のクリーンアップ
beforeEach(() => {
  // モックの初期化
  jest.clearAllMocks();
  
  // タイマーのリセット
  jest.clearAllTimers();
  
  // コンソールログのクリア
  if (global.console._logs) {
    global.console._logs = [];
  }
  
  // DOM の初期化
  document.body.innerHTML = '';
  
  // イベントリスナーのクリーンアップ
  const events = ['error', 'unhandledrejection', 'securitypolicyviolation'];
  events.forEach(event => {
    document.removeEventListener(event, () => {});
    window.removeEventListener(event, () => {});
  });
});

// 各テスト実行後のクリーンアップ
afterEach(() => {
  // メモリリークの防止
  if (global.gc) {
    global.gc();
  }
  
  // 非同期処理の完了待機
  return new Promise(resolve => setTimeout(resolve, 0));
});

// 全テスト完了後の処理
afterAll(() => {
  console.log('[Test Setup] Jest環境クリーンアップ完了');
});

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Test Setup] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Test Setup] Uncaught Exception:', error);
});

// テスト環境識別用
global.__TEST_ENV__ = true;
global.__JEST_SETUP_COMPLETE__ = true;

console.log('[Test Setup] Jest Setup完了 - セキュリティテスト環境準備済み');