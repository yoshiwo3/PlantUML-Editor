/**
 * test-helpers.js - テストヘルパーユーティリティ
 * 統合・パフォーマンステスト共通ヘルパー関数
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

// DOM要素作成ヘルパー
export const createTestElement = (tag = 'div', attributes = {}, content = '') => {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  if (content) {
    element.innerHTML = content;
  }
  
  return element;
};

// テスト用DOM構造セットアップ
export const setupTestDOM = (structure) => {
  document.body.innerHTML = '';
  
  if (typeof structure === 'string') {
    document.body.innerHTML = structure;
  } else if (structure instanceof HTMLElement) {
    document.body.appendChild(structure);
  }
  
  return document.body;
};

// 非同期待機ユーティリティ
export const waitFor = (condition, timeout = 5000, interval = 50) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout: condition not met within ${timeout}ms`));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
};

// イベント発火ヘルパー
export const fireEvent = {
  click: (element, options = {}) => {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...options
    });
    element.dispatchEvent(event);
    return event;
  },
  
  input: (element, value, options = {}) => {
    element.value = value;
    const event = new Event('input', {
      bubbles: true,
      ...options
    });
    element.dispatchEvent(event);
    return event;
  },
  
  change: (element, value, options = {}) => {
    if (value !== undefined) {
      element.value = value;
    }
    const event = new Event('change', {
      bubbles: true,
      ...options
    });
    element.dispatchEvent(event);
    return event;
  },
  
  scroll: (element, scrollTop, options = {}) => {
    element.scrollTop = scrollTop;
    const event = new Event('scroll', {
      bubbles: true,
      ...options
    });
    element.dispatchEvent(event);
    return event;
  },
  
  custom: (element, eventType, detail = {}, options = {}) => {
    const event = new CustomEvent(eventType, {
      bubbles: true,
      detail,
      ...options
    });
    element.dispatchEvent(event);
    return event;
  }
};

// モック作成ヘルパー
export const createMockComponent = (name, methods = {}) => {
  const defaultMethods = {
    initialize: jest.fn().mockResolvedValue(true),
    render: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };
  
  return {
    name,
    ...defaultMethods,
    ...methods
  };
};

// エディターモック作成
export const createMockEditor = (type = 'action', data = {}) => {
  const defaultData = {
    action: { name: 'テストアクション', description: '説明' },
    condition: { condition: 'test === true', trueAction: 'action1', falseAction: 'action2' },
    loop: { condition: 'i < 10', actions: ['action1'] },
    parallel: { branches: [{ name: 'branch1', actions: ['action1'] }] }
  };
  
  return createMockComponent(`${type}Editor`, {
    getComponentData: jest.fn().mockReturnValue({
      type,
      ...defaultData[type],
      ...data
    }),
    setComponentData: jest.fn(),
    generatePlantUML: jest.fn().mockReturnValue(`mock-plantuml-${type}`),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] })
  });
};

// パフォーマンス測定ヘルパー
export const measurePerformance = async (fn, iterations = 1) => {
  const measurements = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn(i);
    const end = performance.now();
    measurements.push(end - start);
  }
  
  return {
    measurements,
    average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
    min: Math.min(...measurements),
    max: Math.max(...measurements),
    total: measurements.reduce((a, b) => a + b, 0)
  };
};

// メモリ使用量測定
export const measureMemoryUsage = (fn) => {
  const before = performance.memory?.usedJSHeapSize || 0;
  
  return Promise.resolve(fn()).then(result => {
    const after = performance.memory?.usedJSHeapSize || 0;
    
    return {
      result,
      memoryUsed: after - before,
      before,
      after
    };
  });
};

// テストデータ生成
export const generateTestData = {
  japaneseText: (complexity = 'simple') => {
    const templates = {
      simple: 'ユーザーがシステムにアクセスする',
      medium: 'ユーザーがシステムにログインし、データを取得して結果を表示する',
      complex: `
        管理者がシステムにアクセスする
        もし認証が成功した場合：
          データベースから情報を取得する
          各データに対して繰り返し：
            データを検証する
            結果をログに記録する
          繰り返し終了
          結果をユーザーに返す
        そうでなければ：
          エラーメッセージを表示する
      `
    };
    
    return templates[complexity] || templates.simple;
  },
  
  largeDataset: (size, itemFactory) => {
    return Array.from({ length: size }, (_, index) => {
      return itemFactory ? itemFactory(index) : {
        id: index,
        name: `アイテム${index}`,
        description: `説明${index}`,
        timestamp: Date.now() + index
      };
    });
  },
  
  editorData: (type, count = 1) => {
    const generators = {
      action: (i) => ({
        type: 'action',
        name: `アクション${i}`,
        description: `アクション${i}の説明`,
        target: `ターゲット${i}`
      }),
      condition: (i) => ({
        type: 'condition',
        condition: `条件${i} === true`,
        trueAction: `真の場合のアクション${i}`,
        falseAction: `偽の場合のアクション${i}`
      }),
      loop: (i) => ({
        type: 'loop',
        condition: `i < ${i + 10}`,
        actions: [`ループアクション${i}`]
      }),
      parallel: (i) => ({
        type: 'parallel',
        branches: [
          { name: `ブランチ${i}A`, actions: [`アクション${i}A`] },
          { name: `ブランチ${i}B`, actions: [`アクション${i}B`] }
        ]
      })
    };
    
    const generator = generators[type] || generators.action;
    return Array.from({ length: count }, (_, i) => generator(i));
  }
};

// テスト状態管理
export const testStateManager = {
  states: new Map(),
  
  save: (key, value) => {
    testStateManager.states.set(key, value);
  },
  
  load: (key, defaultValue = null) => {
    return testStateManager.states.get(key) || defaultValue;
  },
  
  clear: (key) => {
    if (key) {
      testStateManager.states.delete(key);
    } else {
      testStateManager.states.clear();
    }
  }
};

// アサーションヘルパー
export const customMatchers = {
  toBeWithinRange: (received, min, max) => {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${received} not to be within range ${min}-${max}`
          : `Expected ${received} to be within range ${min}-${max}`
    };
  },
  
  toHaveValidPlantUML: (received) => {
    const hasStart = received.includes('@startuml');
    const hasEnd = received.includes('@enduml');
    const pass = hasStart && hasEnd;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected PlantUML code not to be valid`
          : `Expected PlantUML code to have @startuml and @enduml tags`
    };
  },
  
  toBePerformant: (received, threshold = 100) => {
    const pass = received < threshold;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received}ms not to be performant (< ${threshold}ms)`
          : `Expected ${received}ms to be performant (< ${threshold}ms)`
    };
  }
};

// カスタムマッチャーを Jest に追加
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend(customMatchers);
}

// デバッグヘルパー
export const debugHelpers = {
  logDOM: (element = document.body) => {
    console.log('DOM Structure:', element.outerHTML);
  },
  
  logPerformance: (metrics) => {
    console.log('Performance Metrics:', {
      average: `${metrics.average.toFixed(2)}ms`,
      min: `${metrics.min.toFixed(2)}ms`,
      max: `${metrics.max.toFixed(2)}ms`,
      total: `${metrics.total.toFixed(2)}ms`
    });
  },
  
  logMemory: () => {
    if (performance.memory) {
      console.log('Memory Usage:', {
        used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
      });
    }
  },
  
  screenshot: (element = document.body) => {
    // テスト用スクリーンショット（HTML文字列として保存）
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Screenshot</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .editor-panel { border: 1px solid #ccc; padding: 10px; margin: 10px; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
      </html>
    `;
    
    console.log('Screenshot HTML saved to test output');
    return html;
  }
};

// エクスポート（CommonJS対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTestElement,
    setupTestDOM,
    waitFor,
    fireEvent,
    createMockComponent,
    createMockEditor,
    measurePerformance,
    measureMemoryUsage,
    generateTestData,
    testStateManager,
    customMatchers,
    debugHelpers
  };
}