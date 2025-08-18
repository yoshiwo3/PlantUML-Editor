/**
 * Jest Test Setup Configuration - Sprint 2 Enhanced
 * 
 * Jest実行前の環境設定とモック設定
 * セキュリティテスト用の初期化処理
 * CLAUDE.md標準テスト環境定義準拠
 * Node.js v20対応版
 * 
 * 作成日: 2025-08-15
 * 更新日: 2025-08-16 (Sprint 2 Node.js v20対応)
 * 作成者: webapp-test-automation
 */

// Node.js v20対応: TextEncoder/TextDecoderが存在しない場合のみ設定
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// DOM環境のセットアップ（jsdom）- TextEncoder設定後に実行
require('jsdom-global')();

// URL polyfill for older Node.js versions
if (typeof global.URL === 'undefined') {
  global.URL = require('url').URL;
}

// セキュリティテスト用の拡張カスタムマッチャー
expect.extend({
  // 既存のマッチャー
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
  },

  // Sprint 1 追加マッチャー - PlantUMLアクション検証
  toBeValidPlantUMLAction(received) {
    const isValid = received &&
                   typeof received === 'object' &&
                   ['message', 'condition', 'loop', 'parallel'].includes(received.type) &&
                   typeof received.content === 'string' &&
                   received.content.trim().length > 0;

    return {
      pass: isValid,
      message: () => isValid
        ? `Expected ${JSON.stringify(received)} not to be a valid PlantUML action`
        : `Expected ${JSON.stringify(received)} to be a valid PlantUML action with type and content`
    };
  },

  // Sprint 1 追加マッチャー - EditModalManager状態検証
  toBeValidModalState(received) {
    const isValid = received &&
                   typeof received === 'object' &&
                   typeof received.isOpen === 'boolean' &&
                   received.hasOwnProperty('currentAction') &&
                   Array.isArray(received.listeners);

    return {
      pass: isValid,
      message: () => isValid
        ? `Expected ${JSON.stringify(received)} not to be a valid modal state`
        : `Expected ${JSON.stringify(received)} to be a valid modal state with isOpen, currentAction, and listeners properties`
    };
  },

  // Sprint 1 追加マッチャー - ErrorBoundary状態検証
  toBeInErrorState(received) {
    const isInErrorState = received &&
                          (received.hasError === true ||
                           received.error !== null ||
                           received.errorMessage);

    return {
      pass: isInErrorState,
      message: () => isInErrorState
        ? `Expected object not to be in error state`
        : `Expected object to be in error state, but it was clean`
    };
  },

  // Sprint 1 追加マッチャー - DOMPurifyサニタイズ検証
  toBeSanitized(received, original) {
    const isClean = received !== original &&
                   !received.includes('<script>') &&
                   !received.includes('onerror=') &&
                   !received.includes('javascript:');

    return {
      pass: isClean,
      message: () => isClean
        ? `Expected "${received}" to NOT be sanitized from "${original}"`
        : `Expected "${received}" to be properly sanitized from "${original}"`
    };
  },

  // Sprint 1 追加マッチャー - CSP準拠検証
  toComplyWithCSP(received) {
    const violations = [];
    
    // 基本的なCSP違反チェック
    if (received.includes('<script>')) violations.push('inline script');
    if (received.includes('javascript:')) violations.push('javascript: protocol');
    if (received.includes('eval(')) violations.push('eval usage');
    if (received.includes('onclick=')) violations.push('inline event handler');
    
    const isCompliant = violations.length === 0;

    return {
      pass: isCompliant,
      message: () => isCompliant
        ? `Expected content to NOT comply with CSP`
        : `Expected content to comply with CSP, but found violations: ${violations.join(', ')}`
    };
  }
});

// コンソール制御の改善（CLAUDE.md準拠）
const originalConsole = { ...console };
global.originalConsole = originalConsole;

// 詳細ログモード制御
const isVerboseMode = process.env.JEST_VERBOSE === 'true';
const isCIMode = process.env.CI === 'true';

if (!isVerboseMode && isCIMode) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn, // 警告は表示
    error: console.error, // エラーは表示
  };
} else {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: console.error,
  };
}

// ブラウザAPI のモック（機能拡張）
global.alert = jest.fn();
global.confirm = jest.fn(() => true);
global.prompt = jest.fn(() => 'test input');

// Navigator API のモック
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'PlantUML-Editor-Test-Agent/2.0 (Sprint2)',
  writable: true,
});

Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('test clipboard content')),
  },
  writable: true,
});

Object.defineProperty(global.navigator, 'language', {
  value: 'ja-JP',
  writable: true,
});

// Performance API のモック（CLAUDE.md 5秒基準対応）
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
    getEntriesByName: jest.fn(() => []),
  },
  writable: true,
});

// パフォーマンス測定ヘルパー（CLAUDE.md基準：5秒以内）
global.measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  const duration = end - start;
  
  if (!isCIMode) {
    console.log(`⏱️ Performance [${name}]: ${duration.toFixed(2)}ms`);
  }
  
  // 5秒以上の処理は警告（CLAUDE.md基準）
  if (duration > 5000) {
    console.warn(`⚠️ Performance Warning: ${name} took ${duration.toFixed(2)}ms (> 5s threshold)`);
  }
  
  return result;
};

// URL API のモック
if (typeof global.URL === 'undefined') {
  Object.defineProperty(global, 'URL', {
    value: class URL {
      constructor(url) {
        this.href = url;
        this.origin = 'http://localhost:8086';
        this.protocol = 'http:';
        this.hostname = 'localhost';
        this.port = '8086';
      }
      static createObjectURL() {
        return 'blob:test-url';
      }
      static revokeObjectURL() {}
    },
    writable: true,
  });
}

// Fetch API のモック（PlantUMLエディター特化）
global.fetch = jest.fn((url, options = {}) => {
  // URL別のモックレスポンス
  let responseData = {};
  let status = 200;
  let ok = true;

  if (url.includes('/api/plantuml/parse')) {
    responseData = { success: true, result: '@startuml\nA -> B: テストメッセージ\n@enduml' };
  } else if (url.includes('/api/security/validate')) {
    responseData = { isValid: true, sanitized: 'これは安全な内容です', threats: [] };
  } else if (url.includes('/api/modal/save')) {
    responseData = { success: true, actionId: 'test-action-001' };
  } else if (url.includes('/error-test')) {
    status = 500;
    ok = false;
    responseData = { error: 'Test error for error boundary' };
  } else {
    responseData = { message: 'Mock response' };
  }

  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    headers: new Map([
      ['content-type', 'application/json'],
      ['content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-hashes'"]
    ]),
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(responseData)])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: function() { return this; }
  });
});

// WebSocket のモック
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Timer関連のモック設定
jest.useFakeTimers();

// HTMLElement プロトタイプの拡張
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView = jest.fn();
  HTMLElement.prototype.animate = jest.fn(() => ({
    finished: Promise.resolve(),
    cancel: jest.fn(),
    play: jest.fn(),
    pause: jest.fn()
  }));
}

// Observer系API のモック
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '0px',
  thresholds: [0]
}));

global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// File API のモック（PlantUML ファイル対応）
global.File = jest.fn((fileBits, fileName, options) => ({
  name: fileName || 'test.puml',
  size: 1024,
  type: options?.type || 'text/plain',
  lastModified: Date.now(),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  text: () => Promise.resolve(Array.isArray(fileBits) ? fileBits.join('') : String(fileBits))
}));

global.FileReader = jest.fn(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: null,
  error: null,
  readyState: 0,
  EMPTY: 0,
  LOADING: 1,
  DONE: 2
}));

// Blob のモック
global.Blob = jest.fn((blobParts, options) => ({
  size: blobParts ? blobParts.join('').length : 1024,
  type: options?.type || 'text/plain',
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  text: () => Promise.resolve(blobParts ? blobParts.join('') : 'test content'),
  slice: jest.fn()
}));

// Storage API のモック（機能拡張）
const createMockStorage = () => {
  const store = new Map();
  
  return {
    getItem: jest.fn((key) => store.get(key) || null),
    setItem: jest.fn((key, value) => {
      store.set(key, String(value));
      // storage イベント発火シミュレーション
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new Event('storage');
        event.key = key;
        event.newValue = String(value);
        event.storageArea = this;
        window.dispatchEvent(event);
      }
    }),
    removeItem: jest.fn((key) => {
      const oldValue = store.get(key);
      store.delete(key);
      // storage イベント発火シミュレーション
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new Event('storage');
        event.key = key;
        event.oldValue = oldValue || null;
        event.newValue = null;
        event.storageArea = this;
        window.dispatchEvent(event);
      }
    }),
    clear: jest.fn(() => {
      store.clear();
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new Event('storage');
        window.dispatchEvent(event);
      }
    }),
    key: jest.fn((index) => {
      const keys = Array.from(store.keys());
      return keys[index] || null;
    }),
    get length() {
      return store.size;
    }
  };
};

Object.defineProperty(global, 'localStorage', {
  value: createMockStorage(),
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: createMockStorage(),
  writable: true,
});

// CSS関連のモック
if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 100,
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    value: 100,
  });
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'getComputedStyle', {
    value: jest.fn(() => ({
      getPropertyValue: jest.fn((prop) => {
        // よくあるCSS プロパティの デフォルト値を返す
        const defaults = {
          'display': 'block',
          'visibility': 'visible',
          'opacity': '1',
          'width': '100px',
          'height': '100px'
        };
        return defaults[prop] || '';
      }),
      display: 'block',
      visibility: 'visible',
      opacity: '1'
    })),
    writable: true
  });
}

// イベント関連のヘルパー（機能拡張）
global.createMockEvent = (type, properties = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
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

// PlantUMLエディター用カスタムイベント
global.createPlantUMLEvent = (type, detail = {}) => {
  return new CustomEvent(type, {
    bubbles: true,
    cancelable: true,
    detail: {
      timestamp: Date.now(),
      ...detail
    }
  });
};

// セキュリティテスト用のヘルパー関数（拡張）
global.createMaliciousPayload = (type) => {
  const payloads = {
    xss: '<script>alert("XSS")</script>',
    xss_img: '<img src="x" onerror="alert(\'XSS\')">',
    xss_svg: '<svg onload="alert(\'XSS\')">',
    xss_iframe: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    injection: "'; DROP TABLE users; --",
    javascript: 'javascript:void(eval("malicious"))',
    iframe: '<iframe src="javascript:void(0)"></iframe>',
    eval: 'eval("malicious code")',
    cookie: 'document.cookie',
    prototype_pollution: '{"__proto__":{"isAdmin":true}}',
    html_injection: '<div onclick="alert(1)">Click me</div>',
    css_injection: '<style>body{background:red !important;}</style>',
  };
  
  return payloads[type] || payloads.xss;
};

global.createSafePayload = (type = 'basic') => {
  const payloads = {
    basic: 'これは安全なテストデータです',
    japanese: 'ユーザーがシステムにログインする処理',
    plantuml: 'A -> B: 正常なメッセージ',
    html_safe: '<p>安全なHTMLコンテンツ</p>',
    markdown: '## 見出し\n\n安全なマークダウンテキスト'
  };
  
  return payloads[type] || payloads.basic;
};

// 非同期テスト用ヘルパー
global.waitForAsync = async (conditionFn, timeout = 1000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  throw new Error(`Async condition not met within ${timeout}ms`);
};

// DOM操作テスト用ヘルパー
global.createTestDOM = () => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = `
      <div id="plantuml-editor">
        <textarea id="japanese-input" placeholder="日本語でシーケンス図を記述"></textarea>
        <textarea id="plantuml-output" readonly></textarea>
        <button id="add-action-btn">アクション追加</button>
        <div id="modal-container"></div>
        <div id="error-display" style="display: none;"></div>
      </div>
    `;
    
    return document.getElementById('plantuml-editor');
  }
  return null;
};

global.cleanupTestDOM = () => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
    
    // 残留イベントリスナーのクリーンアップ
    const events = ['click', 'input', 'change', 'keydown', 'keyup', 'submit'];
    events.forEach(eventType => {
      try {
        document.removeEventListener(eventType, () => {});
        if (typeof window !== 'undefined') {
          window.removeEventListener(eventType, () => {});
        }
      } catch (e) {
        // イベントリスナーが存在しない場合は無視
      }
    });
  }
};

// テスト実行前の初期化
beforeAll(() => {
  if (!isCIMode) {
    console.log('🧪 [Test Setup] Jest環境初期化完了 (Sprint 2)');
    console.log('🔒 [Test Setup] セキュリティテスト用モック設定完了');
    console.log('📊 [Test Setup] パフォーマンス測定機能有効化');
    console.log('🚀 [Test Setup] Node.js v20対応完了');
  }
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
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Storage のクリア
  if (global.localStorage) {
    global.localStorage.clear();
  }
  if (global.sessionStorage) {
    global.sessionStorage.clear();
  }
  
  // イベントリスナーのクリーンアップ
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const events = ['error', 'unhandledrejection', 'securitypolicyviolation'];
    events.forEach(event => {
      try {
        document.removeEventListener(event, () => {});
        window.removeEventListener(event, () => {});
      } catch (e) {
        // イベントリスナーが存在しない場合は無視
      }
    });
  }

  // パフォーマンス測定リセット
  if (performance.mark && performance.mark.mockClear) {
    performance.mark.mockClear();
  }
  if (performance.measure && performance.measure.mockClear) {
    performance.measure.mockClear();
  }
});

// 各テスト実行後のクリーンアップ
afterEach(() => {
  // DOM クリーンアップ
  cleanupTestDOM();

  // メモリリークの防止
  if (global.gc) {
    global.gc();
  }
  
  // 非同期処理の完了待機
  return new Promise(resolve => setTimeout(resolve, 0));
});

// 全テスト完了後の処理
afterAll(() => {
  if (!isCIMode) {
    console.log('🧹 [Test Setup] Jest環境クリーンアップ完了');
  }
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
global.__SPRINT_2_TEST__ = true;

if (!isCIMode) {
  console.log('✅ [Test Setup] Jest Setup完了 - Sprint 2 統合・パフォーマンステスト環境準備済み');
}