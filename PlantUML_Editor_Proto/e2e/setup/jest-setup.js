/**
 * Jest Setup for E2E Test Framework
 * Sprint2 Foundation Implementation
 */

// Jest環境の拡張
import 'jest-environment-jsdom';

// グローバル設定
global.BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
global.TEST_ENV = 'jest';
global.E2E_MODE = 'enabled';

// テストタイムアウトの設定
jest.setTimeout(30000);

// コンソールエラーの監視
const originalConsoleError = console.error;
const consoleErrors = [];

console.error = (...args) => {
  consoleErrors.push(args.join(' '));
  originalConsoleError(...args);
};

// テスト前の共通セットアップ
beforeEach(() => {
  // コンソールエラーのリセット
  consoleErrors.length = 0;
  
  // DOMの初期化（必要に応じて）
  document.body.innerHTML = '';
  
  // ローカルストレージのクリア
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  
  // セッションストレージのクリア
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
});

// テスト後のクリーンアップ
afterEach(() => {
  // メモリリークの防止
  if (typeof window !== 'undefined') {
    // イベントリスナーの削除
    const events = ['resize', 'scroll', 'click', 'keydown', 'keyup'];
    events.forEach(event => {
      window.removeEventListener(event, () => {});
    });
  }
  
  // コンソールエラーの確認
  if (consoleErrors.length > 0) {
    console.warn(`Test completed with ${consoleErrors.length} console errors:`, consoleErrors);
  }
});

// 全テスト後のクリーンアップ
afterAll(() => {
  // コンソールエラーの復元
  console.error = originalConsoleError;
});

// カスタムマッチャーの追加
expect.extend({
  toContainPlantUMLStructure(received) {
    const hasStart = received.includes('@startuml');
    const hasEnd = received.includes('@enduml');
    
    const pass = hasStart && hasEnd;
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to contain PlantUML structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to contain PlantUML structure (@startuml and @enduml)`,
        pass: false,
      };
    }
  },
  
  toBeWithinPerformanceThreshold(received, threshold) {
    const pass = received <= threshold;
    
    if (pass) {
      return {
        message: () => `Expected ${received}ms not to be within performance threshold of ${threshold}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be within performance threshold of ${threshold}ms`,
        pass: false,
      };
    }
  },
  
  toContainJapaneseCharacters(received) {
    // ひらがな、カタカナ、漢字の範囲をチェック
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    const pass = japaneseRegex.test(received);
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to contain Japanese characters`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to contain Japanese characters`,
        pass: false,
      };
    }
  }
});

// ユーティリティ関数
global.testUtils = {
  /**
   * 指定時間の待機
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * 日本語文字種の判定
   */
  getJapaneseCharacterType: (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x3040 && code <= 0x309F) return 'hiragana';
    if (code >= 0x30A0 && code <= 0x30FF) return 'katakana';
    if (code >= 0x4E00 && code <= 0x9FAF) return 'kanji';
    return 'other';
  },
  
  /**
   * PlantUML構造の検証
   */
  validatePlantUMLStructure: (text) => {
    return {
      hasStart: text.includes('@startuml'),
      hasEnd: text.includes('@enduml'),
      isValid: text.includes('@startuml') && text.includes('@enduml')
    };
  },
  
  /**
   * パフォーマンス測定
   */
  measurePerformance: async (fn) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },
  
  /**
   * メモリ使用量取得（ブラウザ環境で利用可能な場合）
   */
  getMemoryUsage: () => {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
};