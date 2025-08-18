/**
 * パフォーマンスカスタムアサーション
 * 
 * WebVitals、レンダリング時間、メモリ使用量、FPS、ネットワーク、リソース読み込み時間の包括的検証
 * Core Web Vitals (LCP, FID, CLS) と独自のパフォーマンスメトリクスをテスト
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

/**
 * パフォーマンス基準値定義
 */
const PERFORMANCE_THRESHOLDS = {
    // Core Web Vitals
    LCP: {
        GOOD: 2500,        // 2.5秒以下
        NEEDS_IMPROVEMENT: 4000,  // 4秒以下
        POOR: Infinity     // 4秒超
    },
    FID: {
        GOOD: 100,         // 100ms以下
        NEEDS_IMPROVEMENT: 300,   // 300ms以下
        POOR: Infinity     // 300ms超
    },
    CLS: {
        GOOD: 0.1,         // 0.1以下
        NEEDS_IMPROVEMENT: 0.25,  // 0.25以下
        POOR: Infinity     // 0.25超
    },
    
    // レンダリング
    RENDER_TIME: {
        EXCELLENT: 16,     // 60fps相当
        GOOD: 33,          // 30fps相当
        ACCEPTABLE: 100,   // 10fps相当
        POOR: Infinity
    },
    
    // メモリ使用量 (MB)
    MEMORY: {
        LOW: 50,
        MODERATE: 100,
        HIGH: 200,
        EXCESSIVE: Infinity
    },
    
    // FPS
    FPS: {
        SMOOTH: 60,
        GOOD: 30,
        ACCEPTABLE: 15,
        POOR: 0
    },
    
    // ネットワーク (ms)
    NETWORK: {
        FAST: 100,
        MODERATE: 500,
        SLOW: 1000,
        VERY_SLOW: Infinity
    },
    
    // リソース読み込み (ms)
    RESOURCE_LOAD: {
        FAST: 500,
        MODERATE: 1000,
        SLOW: 3000,
        VERY_SLOW: Infinity
    }
};

/**
 * Performance Observer によるメトリクス収集
 */
class PerformanceMetricsCollector {
    constructor() {
        this.metrics = {
            lcp: null,
            fid: null,
            cls: null,
            renderTimes: [],
            memoryInfo: null,
            resourceTimings: [],
            paintTimings: {}
        };
        
        this.observers = [];
        this.setupObservers();
    }
    
    /**
     * Performance Observerのセットアップ
     */
    setupObservers() {
        // LCP Observer
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.lcp = lastEntry.startTime;
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.push(lcpObserver);
            } catch (e) {
                console.warn('LCP Observer not supported:', e);
            }
            
            // FID Observer
            try {
                const fidObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach(entry => {
                        if (entry.name === 'first-input') {
                            this.metrics.fid = entry.processingStart - entry.startTime;
                        }
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.push(fidObserver);
            } catch (e) {
                console.warn('FID Observer not supported:', e);
            }
            
            // CLS Observer
            try {
                const clsObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    let clsValue = 0;
                    entries.forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    this.metrics.cls = clsValue;
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.push(clsObserver);
            } catch (e) {
                console.warn('CLS Observer not supported:', e);
            }
            
            // Paint Timing Observer
            try {
                const paintObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach(entry => {
                        this.metrics.paintTimings[entry.name] = entry.startTime;
                    });
                });
                paintObserver.observe({ entryTypes: ['paint'] });
                this.observers.push(paintObserver);
            } catch (e) {
                console.warn('Paint Observer not supported:', e);
            }
            
            // Resource Timing Observer
            try {
                const resourceObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    this.metrics.resourceTimings.push(...entries);
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.push(resourceObserver);
            } catch (e) {
                console.warn('Resource Observer not supported:', e);
            }
        }
    }
    
    /**
     * メモリ情報の取得
     */
    updateMemoryInfo() {
        if (performance.memory) {
            this.metrics.memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: performance.now()
            };
        }
    }
    
    /**
     * レンダリング時間の測定開始
     */
    startRenderMeasurement() {
        return performance.now();
    }
    
    /**
     * レンダリング時間の測定終了
     */
    endRenderMeasurement(startTime) {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        this.metrics.renderTimes.push({
            duration: renderTime,
            timestamp: endTime
        });
        return renderTime;
    }
    
    /**
     * FPS測定の開始
     */
    startFPSMeasurement(duration = 1000) {
        return new Promise((resolve) => {
            let frames = 0;
            const startTime = performance.now();
            
            function countFrame() {
                frames++;
                const currentTime = performance.now();
                
                if (currentTime - startTime < duration) {
                    requestAnimationFrame(countFrame);
                } else {
                    const fps = Math.round((frames * 1000) / (currentTime - startTime));
                    resolve(fps);
                }
            }
            
            requestAnimationFrame(countFrame);
        });
    }
    
    /**
     * Observerの停止
     */
    disconnect() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
    
    /**
     * すべてのメトリクスの取得
     */
    getAllMetrics() {
        this.updateMemoryInfo();
        return { ...this.metrics };
    }
}

/**
 * パフォーマンステストユーティリティ
 */
class PerformanceTestUtils {
    /**
     * 非同期処理の実行時間測定
     */
    static async measureAsyncOperation(operation) {
        const startTime = performance.now();
        const result = await operation();
        const endTime = performance.now();
        
        return {
            result,
            duration: endTime - startTime,
            startTime,
            endTime
        };
    }
    
    /**
     * 同期処理の実行時間測定
     */
    static measureSyncOperation(operation) {
        const startTime = performance.now();
        const result = operation();
        const endTime = performance.now();
        
        return {
            result,
            duration: endTime - startTime,
            startTime,
            endTime
        };
    }
    
    /**
     * DOM操作の測定
     */
    static measureDOMOperation(operation) {
        const startTime = performance.now();
        
        // Forced reflow/repaint
        document.body.offsetHeight;
        
        const result = operation();
        
        // Forced reflow/repaint
        document.body.offsetHeight;
        
        const endTime = performance.now();
        
        return {
            result,
            duration: endTime - startTime,
            startTime,
            endTime
        };
    }
    
    /**
     * ネットワーク遅延のシミュレーション
     */
    static simulateNetworkDelay(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }
    
    /**
     * CPU集約的タスクのシミュレーション
     */
    static simulateCPUIntensiveTask(duration) {
        const startTime = performance.now();
        while (performance.now() - startTime < duration) {
            // 空のループでCPUを占有
        }
        return performance.now() - startTime;
    }
    
    /**
     * メモリリークの検出
     */
    static detectMemoryLeak(beforeMemory, afterMemory, threshold = 10 * 1024 * 1024) {
        if (!beforeMemory || !afterMemory) {
            return { hasLeak: false, diff: 0, message: 'メモリ情報が利用できません' };
        }
        
        const diff = afterMemory.used - beforeMemory.used;
        const hasLeak = diff > threshold;
        
        return {
            hasLeak,
            diff,
            message: hasLeak ? 
                `メモリリークの可能性: ${Math.round(diff / 1024 / 1024)}MB増加` :
                `メモリ使用量正常: ${Math.round(diff / 1024 / 1024)}MB変化`
        };
    }
}

/**
 * Core Web Vitalsの評価
 * @param {number} value - 測定値
 * @param {Object} thresholds - 基準値
 * @returns {string} 評価 ('good', 'needs-improvement', 'poor')
 */
function evaluateWebVital(value, thresholds) {
    if (value <= thresholds.GOOD) return 'good';
    if (value <= thresholds.NEEDS_IMPROVEMENT) return 'needs-improvement';
    return 'poor';
}

/**
 * Web Vitalsが基準を満たしているかを検証
 * @param {Object} metrics - メトリクス
 * @returns {Object} 検証結果
 */
function validateWebVitals(metrics) {
    const results = {
        lcp: { value: metrics.lcp, evaluation: null },
        fid: { value: metrics.fid, evaluation: null },
        cls: { value: metrics.cls, evaluation: null },
        overall: 'good'
    };
    
    if (metrics.lcp !== null) {
        results.lcp.evaluation = evaluateWebVital(metrics.lcp, PERFORMANCE_THRESHOLDS.LCP);
    }
    
    if (metrics.fid !== null) {
        results.fid.evaluation = evaluateWebVital(metrics.fid, PERFORMANCE_THRESHOLDS.FID);
    }
    
    if (metrics.cls !== null) {
        results.cls.evaluation = evaluateWebVital(metrics.cls, PERFORMANCE_THRESHOLDS.CLS);
    }
    
    // 全体評価の決定
    const evaluations = Object.values(results)
        .filter(r => r.evaluation)
        .map(r => r.evaluation);
    
    if (evaluations.includes('poor')) {
        results.overall = 'poor';
    } else if (evaluations.includes('needs-improvement')) {
        results.overall = 'needs-improvement';
    }
    
    return results;
}

/**
 * メモリ使用量の検証
 * @param {Object} memoryInfo - メモリ情報
 * @returns {Object} 検証結果
 */
function validateMemoryUsage(memoryInfo) {
    if (!memoryInfo) {
        return { valid: false, message: 'メモリ情報が利用できません' };
    }
    
    const usedMB = memoryInfo.used / 1024 / 1024;
    const totalMB = memoryInfo.total / 1024 / 1024;
    const limitMB = memoryInfo.limit / 1024 / 1024;
    
    let level = 'low';
    if (usedMB > PERFORMANCE_THRESHOLDS.MEMORY.HIGH) {
        level = 'excessive';
    } else if (usedMB > PERFORMANCE_THRESHOLDS.MEMORY.MODERATE) {
        level = 'high';
    } else if (usedMB > PERFORMANCE_THRESHOLDS.MEMORY.LOW) {
        level = 'moderate';
    }
    
    return {
        valid: level !== 'excessive',
        level,
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        utilization: (usedMB / totalMB) * 100
    };
}

/**
 * FPSの検証
 * @param {number} fps - FPS値
 * @returns {Object} 検証結果
 */
function validateFPS(fps) {
    let level = 'poor';
    if (fps >= PERFORMANCE_THRESHOLDS.FPS.SMOOTH) {
        level = 'smooth';
    } else if (fps >= PERFORMANCE_THRESHOLDS.FPS.GOOD) {
        level = 'good';
    } else if (fps >= PERFORMANCE_THRESHOLDS.FPS.ACCEPTABLE) {
        level = 'acceptable';
    }
    
    return {
        valid: fps >= PERFORMANCE_THRESHOLDS.FPS.ACCEPTABLE,
        level,
        fps,
        message: `FPS: ${fps} (${level})`
    };
}

/**
 * Jest カスタムマッチャーの定義
 */
const customMatchers = {
    /**
     * Web Vitalsが基準を満たしているかをテスト
     */
    toMeetWebVitals(received) {
        const validation = validateWebVitals(received);
        const pass = validation.overall === 'good';
        
        if (pass) {
            return {
                message: () => `期待: Web Vitals基準を満たさないこと\n受信: すべてのWeb Vitals基準を満たしています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: Web Vitals基準を満たすこと\n受信: ${JSON.stringify(validation)}`,
                pass: false
            };
        }
    },

    /**
     * 指定時間より高速かをテスト
     */
    toBeFasterThan(received, threshold) {
        const pass = received < threshold;
        
        if (pass) {
            return {
                message: () => `期待: ${threshold}ms以上の実行時間\n受信: ${received}ms (高速です)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${threshold}ms未満の実行時間\n受信: ${received}ms (遅すぎます)`,
                pass: false
            };
        }
    },

    /**
     * メモリ使用量が基準値以下かをテスト
     */
    toBeLessThanMemory(received, thresholdBytes) {
        const pass = received < thresholdBytes;
        const receivedMB = Math.round(received / 1024 / 1024);
        const thresholdMB = Math.round(thresholdBytes / 1024 / 1024);
        
        if (pass) {
            return {
                message: () => `期待: ${thresholdMB}MB以上のメモリ使用量\n受信: ${receivedMB}MB (効率的です)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${thresholdMB}MB未満のメモリ使用量\n受信: ${receivedMB}MB (メモリ使用量が多すぎます)`,
                pass: false
            };
        }
    },

    /**
     * FPSが基準値以上かをテスト
     */
    toHaveFPSGreaterThan(received, threshold) {
        const pass = received > threshold;
        
        if (pass) {
            return {
                message: () => `期待: ${threshold}fps以下\n受信: ${received}fps (スムーズです)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${threshold}fps超\n受信: ${received}fps (フレームレートが低すぎます)`,
                pass: false
            };
        }
    },

    /**
     * レンダリング時間が許容範囲内かをテスト
     */
    toHaveAcceptableRenderTime(received, threshold = PERFORMANCE_THRESHOLDS.RENDER_TIME.ACCEPTABLE) {
        const pass = received <= threshold;
        
        if (pass) {
            return {
                message: () => `期待: ${threshold}ms超のレンダリング時間\n受信: ${received}ms (許容範囲内です)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${threshold}ms以下のレンダリング時間\n受信: ${received}ms (レンダリングが遅すぎます)`,
                pass: false
            };
        }
    },

    /**
     * LCPが基準値以下かをテスト
     */
    toHaveGoodLCP(received, threshold = PERFORMANCE_THRESHOLDS.LCP.GOOD) {
        const pass = received <= threshold;
        
        if (pass) {
            return {
                message: () => `期待: ${threshold}ms超のLCP\n受信: ${received}ms (良好です)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${threshold}ms以下のLCP\n受信: ${received}ms (改善が必要です)`,
                pass: false
            };
        }
    },

    /**
     * FIDが基準値以下かをテスト
     */
    toHaveGoodFID(received, threshold = PERFORMANCE_THRESHOLDS.FID.GOOD) {
        const pass = received <= threshold;
        
        if (pass) {
            return {
                message: () => `期待: ${threshold}ms超のFID\n受信: ${received}ms (良好です)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${threshold}ms以下のFID\n受信: ${received}ms (改善が必要です)`,
                pass: false
            };
        }
    },

    /**
     * CLSが基準値以下かをテスト
     */
    toHaveGoodCLS(received, threshold = PERFORMANCE_THRESHOLDS.CLS.GOOD) {
        const pass = received <= threshold;
        
        if (pass) {
            return {
                message: () => `期待: ${threshold}超のCLS\n受信: ${received} (良好です)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${threshold}以下のCLS\n受信: ${received} (改善が必要です)`,
                pass: false
            };
        }
    },

    /**
     * メモリリークがないかをテスト
     */
    toHaveNoMemoryLeak(received) {
        const { beforeMemory, afterMemory } = received;
        const leakInfo = PerformanceTestUtils.detectMemoryLeak(beforeMemory, afterMemory);
        const pass = !leakInfo.hasLeak;
        
        if (pass) {
            return {
                message: () => `期待: メモリリークがあること\n受信: ${leakInfo.message}`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: メモリリークがないこと\n受信: ${leakInfo.message}`,
                pass: false
            };
        }
    }
};

// Jestに追加
if (typeof expect !== 'undefined') {
    expect.extend(customMatchers);
}

// グローバルなパフォーマンスコレクターのインスタンス
let globalMetricsCollector = null;

/**
 * パフォーマンステストの初期化
 */
function initializePerformanceTest() {
    if (typeof window !== 'undefined') {
        globalMetricsCollector = new PerformanceMetricsCollector();
    }
    return globalMetricsCollector;
}

/**
 * パフォーマンステストのクリーンアップ
 */
function cleanupPerformanceTest() {
    if (globalMetricsCollector) {
        globalMetricsCollector.disconnect();
        globalMetricsCollector = null;
    }
}

module.exports = {
    // 定数
    PERFORMANCE_THRESHOLDS,
    
    // クラス
    PerformanceMetricsCollector,
    PerformanceTestUtils,
    
    // バリデーション関数
    evaluateWebVital,
    validateWebVitals,
    validateMemoryUsage,
    validateFPS,
    
    // ユーティリティ関数
    initializePerformanceTest,
    cleanupPerformanceTest,
    
    // カスタムマッチャー
    customMatchers,
    
    // グローバルアクセス
    getGlobalMetricsCollector: () => globalMetricsCollector
};