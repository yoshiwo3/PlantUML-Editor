/**
 * WorkerInterface.js
 * 
 * Web Worker通信インターフェース
 * Phase 3: メインスレッドとWorkerの通信管理
 * 
 * @version 3.0.0
 * @date 2025-08-13
 */

class WorkerInterface {
    constructor(options = {}) {
        this.worker = null;
        this.requestQueue = new Map();
        this.requestId = 0;
        this.debugMode = options.debugMode || false;
        this.workerPath = options.workerPath || 'PlantUMLParserWorker.js';
        this.timeout = options.timeout || 30000; // 30秒
        this.retryLimit = options.retryLimit || 3;
        this.status = 'idle';
        this.listeners = new Map();
        this.performanceMetrics = [];
        this.maxMetrics = options.maxMetrics || 100;
        
        // 自動初期化
        if (options.autoInit !== false) {
            this.initialize();
        }
    }
    
    /**
     * デバッグログ
     */
    log(message, data = null) {
        if (this.debugMode || localStorage.getItem('debug_worker') === 'true') {
            console.group(`[WorkerInterface] ${message}`);
            if (data) console.log(data);
            console.groupEnd();
        }
    }
    
    /**
     * Worker初期化
     */
    async initialize(config = {}) {
        try {
            this.log('Initializing worker', { path: this.workerPath });
            
            // 既存Workerの終了
            if (this.worker) {
                this.terminate();
            }
            
            // 新しいWorkerの作成
            this.worker = new Worker(this.workerPath);
            this.status = 'initializing';
            
            // メッセージハンドラーの設定
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);
            
            // 初期化メッセージの送信
            const initResult = await this.sendMessage('INIT', {
                config: {
                    debugMode: this.debugMode,
                    performanceMode: config.performanceMode || 'balanced',
                    cacheLimit: config.cacheLimit || 50,
                    ...config
                }
            });
            
            this.status = 'ready';
            this.log('Worker initialized', initResult);
            
            // 初期化成功イベント
            this.emit('initialized', initResult);
            
            return initResult;
            
        } catch (error) {
            this.status = 'error';
            this.log('Worker initialization failed', error);
            throw error;
        }
    }
    
    /**
     * パース実行
     */
    async parse(code, options = {}) {
        if (this.status !== 'ready') {
            throw new Error(`Worker not ready: ${this.status}`);
        }
        
        const startTime = performance.now();
        
        try {
            const result = await this.sendMessage('PARSE', {
                code,
                options
            });
            
            // パフォーマンスメトリクスの記録
            this.recordMetric({
                operation: 'parse',
                duration: performance.now() - startTime,
                codeLength: code.length,
                cached: result.fromCache || false
            });
            
            return result;
            
        } catch (error) {
            this.log('Parse failed', error);
            
            // フォールバック処理
            if (options.fallback && window.PlantUMLParser) {
                this.log('Using fallback parser');
                const parser = new PlantUMLParser({ debugMode: this.debugMode });
                return parser.safeParse(code);
            }
            
            throw error;
        }
    }
    
    /**
     * バリデーション実行
     */
    async validate(code) {
        if (this.status !== 'ready') {
            throw new Error(`Worker not ready: ${this.status}`);
        }
        
        return await this.sendMessage('VALIDATE', { code });
    }
    
    /**
     * バッチパース実行
     */
    async batchParse(codes, options = {}) {
        if (this.status !== 'ready') {
            throw new Error(`Worker not ready: ${this.status}`);
        }
        
        // 進捗コールバックの設定
        const progressHandler = (data) => {
            if (options.onProgress) {
                options.onProgress(data);
            }
        };
        
        this.on('progress', progressHandler);
        
        try {
            const result = await this.sendMessage('BATCH_PARSE', {
                codes,
                options
            });
            
            this.off('progress', progressHandler);
            return result;
            
        } catch (error) {
            this.off('progress', progressHandler);
            throw error;
        }
    }
    
    /**
     * 設定更新
     */
    async updateConfig(config) {
        return await this.sendMessage('UPDATE_CONFIG', { config });
    }
    
    /**
     * ヘルスチェック
     */
    async healthCheck() {
        return await this.sendMessage('HEALTH_CHECK', {});
    }
    
    /**
     * キャッシュクリア
     */
    async clearCache() {
        return await this.sendMessage('CLEAR_CACHE', {});
    }
    
    /**
     * メッセージ送信
     */
    sendMessage(type, payload) {
        return new Promise((resolve, reject) => {
            const id = this.generateRequestId();
            
            // タイムアウト設定
            const timeoutId = setTimeout(() => {
                this.requestQueue.delete(id);
                reject(new Error(`Request timeout: ${type}`));
            }, this.timeout);
            
            // リクエストをキューに追加
            this.requestQueue.set(id, {
                resolve,
                reject,
                timeoutId,
                type,
                timestamp: Date.now(),
                retryCount: 0
            });
            
            // メッセージ送信
            this.worker.postMessage({
                type,
                payload,
                id
            });
            
            this.log('Message sent', { type, id });
        });
    }
    
    /**
     * Workerメッセージハンドラー
     */
    handleWorkerMessage(event) {
        const { type, payload, id } = event.data;
        
        this.log('Message received', { type, id });
        
        // 特殊なメッセージタイプの処理
        if (type === 'PROGRESS') {
            this.emit('progress', payload);
            return;
        }
        
        // リクエストキューから対応するリクエストを取得
        const request = this.requestQueue.get(id);
        if (!request) {
            this.log('No matching request found', { id });
            return;
        }
        
        // タイムアウトをクリア
        clearTimeout(request.timeoutId);
        
        // リクエストをキューから削除
        this.requestQueue.delete(id);
        
        // レスポンス処理
        if (type === 'SUCCESS') {
            request.resolve(payload);
        } else if (type === 'ERROR') {
            request.reject(new Error(payload.message));
        } else {
            request.reject(new Error(`Unknown response type: ${type}`));
        }
    }
    
    /**
     * Workerエラーハンドラー
     */
    handleWorkerError(error) {
        this.log('Worker error', error);
        this.status = 'error';
        
        // すべての保留中のリクエストを拒否
        this.requestQueue.forEach(request => {
            clearTimeout(request.timeoutId);
            request.reject(error);
        });
        this.requestQueue.clear();
        
        // エラーイベント発火
        this.emit('error', error);
        
        // 自動再起動
        if (this.autoRestart) {
            this.log('Attempting auto-restart');
            setTimeout(() => {
                this.initialize().catch(err => {
                    this.log('Auto-restart failed', err);
                });
            }, 1000);
        }
    }
    
    /**
     * リクエストID生成
     */
    generateRequestId() {
        return `req_${++this.requestId}_${Date.now()}`;
    }
    
    /**
     * パフォーマンスメトリクス記録
     */
    recordMetric(metric) {
        this.performanceMetrics.push({
            ...metric,
            timestamp: Date.now()
        });
        
        // 最大数を超えたら古いものを削除
        if (this.performanceMetrics.length > this.maxMetrics) {
            this.performanceMetrics.shift();
        }
    }
    
    /**
     * パフォーマンス統計取得
     */
    getPerformanceStats() {
        if (this.performanceMetrics.length === 0) {
            return null;
        }
        
        const durations = this.performanceMetrics.map(m => m.duration);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        const sorted = [...durations].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        return {
            count: this.performanceMetrics.length,
            average: avg.toFixed(2),
            median: median.toFixed(2),
            min: Math.min(...durations).toFixed(2),
            max: Math.max(...durations).toFixed(2),
            cacheHitRate: this.calculateCacheHitRate()
        };
    }
    
    /**
     * キャッシュヒット率計算
     */
    calculateCacheHitRate() {
        const cachedCount = this.performanceMetrics.filter(m => m.cached).length;
        const totalCount = this.performanceMetrics.length;
        
        if (totalCount === 0) return 0;
        
        return ((cachedCount / totalCount) * 100).toFixed(2);
    }
    
    /**
     * イベントリスナー登録
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * イベントリスナー解除
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * イベント発火
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }
    
    /**
     * Worker終了
     */
    terminate() {
        if (this.worker) {
            this.log('Terminating worker');
            
            // 保留中のリクエストをクリア
            this.requestQueue.forEach(request => {
                clearTimeout(request.timeoutId);
                request.reject(new Error('Worker terminated'));
            });
            this.requestQueue.clear();
            
            // Worker終了
            this.worker.terminate();
            this.worker = null;
            this.status = 'terminated';
            
            // 終了イベント
            this.emit('terminated');
        }
    }
    
    /**
     * 状態チェック
     */
    isReady() {
        return this.status === 'ready';
    }
    
    /**
     * 状態取得
     */
    getStatus() {
        return {
            status: this.status,
            queueSize: this.requestQueue.size,
            metrics: this.getPerformanceStats()
        };
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkerInterface;
}

if (typeof window !== 'undefined') {
    window.WorkerInterface = WorkerInterface;
}