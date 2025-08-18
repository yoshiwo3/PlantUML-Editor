/**
 * performance-setup.js - パフォーマンステスト用セットアップ
 * TEST-004対応: WebWorker、仮想スクロール、メモリ、レンダリング最適化
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

// 高精度タイマー設定
if (!performance.now) {
  let startTime = Date.now();
  performance.now = () => Date.now() - startTime;
}

// Performance Memory API Mock（詳細版）
if (!performance.memory) {
  let memoryUsage = {
    used: 50 * 1024 * 1024,    // 50MB 初期値
    total: 100 * 1024 * 1024,  // 100MB 初期値
    limit: 2 * 1024 * 1024 * 1024 // 2GB 上限
  };
  
  performance.memory = {
    get usedJSHeapSize() { return memoryUsage.used; },
    get totalJSHeapSize() { return memoryUsage.total; },
    get jsHeapSizeLimit() { return memoryUsage.limit; },
    
    // テスト用のメモリ使用量操作関数
    _setUsage: (used, total) => {
      memoryUsage.used = used;
      memoryUsage.total = total || memoryUsage.total;
    },
    
    _addUsage: (amount) => {
      memoryUsage.used += amount;
      if (memoryUsage.used > memoryUsage.total) {
        memoryUsage.total = memoryUsage.used * 1.5;
      }
    }
  };
}

// Performance Observer Mock
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// FinalizationRegistry Mock（ガベージコレクション追跡用）
if (!global.FinalizationRegistry) {
  global.FinalizationRegistry = jest.fn().mockImplementation((callback) => ({
    register: jest.fn((target, heldValue) => {
      // テスト用：短時間後にファイナライザーを呼び出し
      setTimeout(() => callback(heldValue), 100);
    }),
    unregister: jest.fn()
  }));
}

// WeakRef Mock
if (!global.WeakRef) {
  global.WeakRef = jest.fn().mockImplementation((target) => ({
    deref: jest.fn(() => target)
  }));
}

// 高性能なWebWorkerモック
class PerformanceWorker {
  constructor(scriptURL) {
    this.scriptURL = scriptURL;
    this.onmessage = null;
    this.onerror = null;
    this.messageQueue = [];
    this.isProcessing = false;
    this.processingTime = 0;
  }

  postMessage(data) {
    const startTime = performance.now();
    
    // リアルな処理時間をシミュレート
    const processingDelay = this.calculateProcessingDelay(data);
    
    setTimeout(() => {
      if (this.onmessage) {
        const result = this.processMessage(data);
        this.processingTime = performance.now() - startTime;
        
        this.onmessage({
          data: {
            ...result,
            processingTime: this.processingTime,
            workerPerformance: {
              cpuTime: processingDelay,
              memoryUsed: Math.random() * 1024 * 1024 // 最大1MB
            }
          }
        });
      }
    }, processingDelay);
  }

  calculateProcessingDelay(data) {
    // データサイズと複雑さに基づく処理時間計算
    const baseDelay = 5; // 基本遅延 5ms
    const dataSize = JSON.stringify(data).length;
    const complexityFactor = data.complexity || 1;
    
    return baseDelay + (dataSize / 1000) + (complexityFactor * 10);
  }

  processMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'HEAVY_COMPUTATION':
        return {
          type: 'COMPUTATION_RESULT',
          result: this.heavyComputation(payload.iterations || 1000)
        };
      
      case 'PARSE_JAPANESE':
        return {
          type: 'PARSE_RESULT',
          result: this.parseJapanese(payload.text || '')
        };
      
      case 'GENERATE_PLANTUML':
        return {
          type: 'PLANTUML_RESULT',
          result: this.generatePlantUML(payload.data || {})
        };
      
      default:
        return { type: 'UNKNOWN', error: 'Unknown message type' };
    }
  }

  heavyComputation(iterations) {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }
    return result;
  }

  parseJapanese(text) {
    const words = text.split(/\s+/);
    return {
      actors: words.filter(w => w.includes('システム') || w.includes('ユーザー')),
      actions: words.filter(w => w.includes('する') || w.includes('送信')),
      complexity: Math.min(words.length / 10, 5)
    };
  }

  generatePlantUML(data) {
    const lines = ['@startuml'];
    if (data.actors) {
      data.actors.forEach((actor, i) => {
        lines.push(`participant "${actor}" as actor${i}`);
      });
    }
    lines.push('@enduml');
    return lines.join('\n');
  }

  terminate() {
    this.onmessage = null;
    this.onerror = null;
    this.messageQueue = [];
  }
}

global.Worker = PerformanceWorker;

// 高性能requestAnimationFrame
let rafCallbacks = [];
let rafId = 0;
let lastFrameTime = 0;

global.requestAnimationFrame = jest.fn((callback) => {
  rafId++;
  const currentTime = performance.now();
  const targetTime = Math.max(lastFrameTime + 16.67, currentTime); // 60FPS
  
  const timeToNextFrame = Math.max(0, targetTime - currentTime);
  
  setTimeout(() => {
    lastFrameTime = performance.now();
    callback(lastFrameTime);
  }, timeToNextFrame);
  
  return rafId;
});

global.cancelAnimationFrame = jest.fn((id) => {
  rafCallbacks = rafCallbacks.filter(cb => cb.id !== id);
});

// Performance Marking & Measuring
const performanceEntries = [];

performance.mark = jest.fn((name) => {
  const entry = {
    name,
    entryType: 'mark',
    startTime: performance.now(),
    duration: 0
  };
  performanceEntries.push(entry);
  return entry;
});

performance.measure = jest.fn((name, startMark, endMark) => {
  const start = performanceEntries.find(e => e.name === startMark);
  const end = performanceEntries.find(e => e.name === endMark);
  
  const entry = {
    name,
    entryType: 'measure',
    startTime: start ? start.startTime : performance.now(),
    duration: end && start ? end.startTime - start.startTime : 0
  };
  
  performanceEntries.push(entry);
  return entry;
});

performance.getEntriesByType = jest.fn((type) => {
  return performanceEntries.filter(entry => entry.entryType === type);
});

performance.getEntriesByName = jest.fn((name) => {
  return performanceEntries.filter(entry => entry.name === name);
});

performance.clearMarks = jest.fn((name) => {
  if (name) {
    const index = performanceEntries.findIndex(e => e.name === name && e.entryType === 'mark');
    if (index > -1) performanceEntries.splice(index, 1);
  } else {
    performanceEntries.splice(0, performanceEntries.length);
  }
});

// Virtual Scroll Performance Helpers
global.virtualScrollUtils = {
  createLargeDataset: (size, itemGenerator) => {
    return Array.from({ length: size }, (_, index) => {
      return itemGenerator ? itemGenerator(index) : {
        id: index,
        content: `Item ${index}`,
        data: new Array(100).fill(`data-${index}`)
      };
    });
  },
  
  measureScrollPerformance: async (scrollFunction, iterations = 10) => {
    const measurements = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await scrollFunction(i);
      const end = performance.now();
      measurements.push(end - start);
    }
    
    return {
      measurements,
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements)
    };
  }
};

// Memory Leak Detection
global.memoryLeakDetector = {
  baseline: null,
  snapshots: [],
  
  takeBaseline: () => {
    global.memoryLeakDetector.baseline = {
      timestamp: Date.now(),
      memory: performance.memory.usedJSHeapSize,
      objects: global.memoryLeakDetector.countObjects()
    };
  },
  
  takeSnapshot: (label = '') => {
    const snapshot = {
      label,
      timestamp: Date.now(),
      memory: performance.memory.usedJSHeapSize,
      objects: global.memoryLeakDetector.countObjects()
    };
    
    global.memoryLeakDetector.snapshots.push(snapshot);
    return snapshot;
  },
  
  detectLeaks: () => {
    if (!global.memoryLeakDetector.baseline || global.memoryLeakDetector.snapshots.length === 0) {
      return { hasLeaks: false, message: 'Insufficient data for leak detection' };
    }
    
    const latest = global.memoryLeakDetector.snapshots[global.memoryLeakDetector.snapshots.length - 1];
    const memoryGrowth = latest.memory - global.memoryLeakDetector.baseline.memory;
    const objectGrowth = latest.objects - global.memoryLeakDetector.baseline.objects;
    
    const hasLeaks = memoryGrowth > 10 * 1024 * 1024; // 10MB threshold
    
    return {
      hasLeaks,
      memoryGrowth,
      objectGrowth,
      message: hasLeaks ? 'Potential memory leak detected' : 'No significant leaks detected'
    };
  },
  
  countObjects: () => {
    // Mock object counting
    return Math.floor(Math.random() * 1000) + 500;
  },
  
  reset: () => {
    global.memoryLeakDetector.baseline = null;
    global.memoryLeakDetector.snapshots = [];
  }
};

// Rendering Performance Monitor
global.renderingMonitor = {
  frameCount: 0,
  totalFrameTime: 0,
  frameTimes: [],
  
  startFrame: () => {
    return performance.now();
  },
  
  endFrame: (startTime) => {
    const frameTime = performance.now() - startTime;
    global.renderingMonitor.frameCount++;
    global.renderingMonitor.totalFrameTime += frameTime;
    global.renderingMonitor.frameTimes.push(frameTime);
    
    // Keep only last 100 frame times
    if (global.renderingMonitor.frameTimes.length > 100) {
      global.renderingMonitor.frameTimes.shift();
    }
    
    return frameTime;
  },
  
  getAverageFrameTime: () => {
    return global.renderingMonitor.frameCount > 0 
      ? global.renderingMonitor.totalFrameTime / global.renderingMonitor.frameCount 
      : 0;
  },
  
  getFPS: () => {
    const avgFrameTime = global.renderingMonitor.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  },
  
  reset: () => {
    global.renderingMonitor.frameCount = 0;
    global.renderingMonitor.totalFrameTime = 0;
    global.renderingMonitor.frameTimes = [];
  }
};

// CPU Usage Simulator
global.cpuMonitor = {
  usage: 0,
  
  simulateLoad: (duration, intensity = 0.5) => {
    const start = performance.now();
    const target = start + duration;
    
    while (performance.now() < target) {
      // Simulate CPU work
      for (let i = 0; i < intensity * 1000; i++) {
        Math.random();
      }
    }
    
    global.cpuMonitor.usage = intensity;
  },
  
  getCurrentUsage: () => global.cpuMonitor.usage,
  
  reset: () => {
    global.cpuMonitor.usage = 0;
  }
};

// パフォーマンステスト用ユーティリティ
global.perfTestUtils = {
  // 大量データ生成
  generateTestData: (count, dataSize = 1024) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      data: new Array(dataSize).fill(0).map(() => Math.random()),
      timestamp: Date.now() + i
    }));
  },
  
  // ベンチマーク実行
  benchmark: async (fn, iterations = 100) => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn(i);
      const end = performance.now();
      times.push(end - start);
    }
    
    return {
      times,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
    };
  },
  
  // メモリ使用量監視
  monitorMemory: (callback, interval = 100) => {
    const monitor = setInterval(() => {
      callback({
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        timestamp: performance.now()
      });
    }, interval);
    
    return () => clearInterval(monitor);
  }
};

// テスト前のセットアップ
beforeEach(() => {
  // パフォーマンスメトリクスをリセット
  global.renderingMonitor.reset();
  global.memoryLeakDetector.reset();
  global.cpuMonitor.reset();
  
  // パフォーマンスエントリをクリア
  performanceEntries.length = 0;
  
  // メモリベースラインを取得
  global.memoryLeakDetector.takeBaseline();
});

// テスト後のクリーンアップ
afterEach(() => {
  // メモリリーク検出
  const leakResult = global.memoryLeakDetector.detectLeaks();
  if (leakResult.hasLeaks) {
    console.warn(`⚠️ Potential memory leak detected: ${leakResult.memoryGrowth} bytes`);
  }
  
  // ガベージコレクション実行
  if (global.gc) {
    global.gc();
  }
});

// 環境変数設定
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = 'performance';

console.log('🚀 パフォーマンステスト環境セットアップ完了');