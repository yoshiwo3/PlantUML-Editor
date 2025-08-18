/**
 * WorkerManager.js
 * 
 * PERF-001: WebWorker統合の強化版
 * 高性能な処理管理とメモリ最適化を実装
 * 
 * @version 4.0.0
 * @date 2025-08-16
 */

export class WorkerManager {
    constructor(options = {}) {
        this.workerPool = [];
        this.poolSize = options.poolSize || navigator.hardwareConcurrency || 4;
        this.maxPoolSize = Math.min(this.poolSize * 2, 8); // 最大8ワーカー
        this.currentWorker = 0;
        this.taskQueue = [];
        this.processingTasks = new Map();
        this.performanceMonitor = new PerformanceMonitor();
        this.memoryManager = new WorkerMemoryManager();
        
        // 設定
        this.config = {
            debugMode: options.debugMode || false,
            enablePooling: options.enablePooling !== false,
            adaptivePooling: options.adaptivePooling !== false,
            memoryThreshold: options.memoryThreshold || 100 * 1024 * 1024, // 100MB
            maxTaskQueueSize: options.maxTaskQueueSize || 1000,
            workerTimeout: options.workerTimeout || 30000,
            ...options
        };
        
        this.initialized = false;
        this.stats = {
            tasksCompleted: 0,
            tasksQueued: 0,
            averageTaskTime: 0,
            memoryUsage: 0,
            poolUtilization: 0
        };
        
        this.initializeWorkerPool();
    }
    
    /**
     * ワーカープールの初期化
     */
    async initializeWorkerPool() {
        try {
            this.log('Initializing worker pool', { size: this.poolSize });
            
            // 初期ワーカーを作成
            const initPromises = [];
            for (let i = 0; i < this.poolSize; i++) {
                initPromises.push(this.createWorker(i));
            }
            
            await Promise.all(initPromises);
            
            this.initialized = true;
            this.log('Worker pool initialized successfully');
            
            // パフォーマンス監視開始
            this.startMonitoring();
            
        } catch (error) {
            this.log('Worker pool initialization failed', error);
            throw error;
        }
    }
    
    /**
     * 新しいワーカーの作成
     */
    async createWorker(id) {
        const worker = new Worker('PlantUMLParserWorker.js');
        const workerWrapper = {
            id,
            worker,
            busy: false,
            taskCount: 0,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            memoryUsage: 0,
            interface: null
        };
        
        // WorkerInterfaceのラッピング
        workerWrapper.interface = new WorkerInterface({
            worker: worker,
            debugMode: this.config.debugMode,
            autoInit: false
        });
        
        // ワーカー初期化
        await workerWrapper.interface.initialize({
            performanceMode: 'balanced',
            cacheLimit: 25, // プール全体で共有
            enableMetrics: true
        });
        
        // メッセージハンドリング
        worker.onmessage = (event) => {
            this.handleWorkerMessage(workerWrapper, event);
        };
        
        worker.onerror = (error) => {
            this.handleWorkerError(workerWrapper, error);
        };
        
        this.workerPool.push(workerWrapper);
        this.log(`Worker ${id} created and initialized`);
        
        return workerWrapper;
    }
    
    /**
     * タスクの実行
     */
    async executeTask(type, payload, options = {}) {
        if (!this.initialized) {
            throw new Error('WorkerManager not initialized');
        }
        
        const task = {
            id: this.generateTaskId(),
            type,
            payload,
            options,
            priority: options.priority || 'normal',
            createdAt: Date.now(),
            timeout: options.timeout || this.config.workerTimeout
        };
        
        // キューサイズチェック
        if (this.taskQueue.length >= this.config.maxTaskQueueSize) {
            throw new Error('Task queue is full');
        }
        
        return new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;
            
            // 優先度に基づいてキューに追加
            this.addTaskToQueue(task);
            
            // すぐに実行可能な場合は実行
            this.processQueue();
        });
    }
    
    /**
     * タスクをキューに追加
     */
    addTaskToQueue(task) {
        if (task.priority === 'high') {
            // 高優先度タスクをキューの先頭に追加
            this.taskQueue.unshift(task);
        } else {
            this.taskQueue.push(task);
        }
        
        this.stats.tasksQueued++;
        this.log(`Task ${task.id} added to queue`, { queueSize: this.taskQueue.length });
    }
    
    /**
     * キューの処理
     */
    async processQueue() {
        while (this.taskQueue.length > 0) {
            const availableWorker = this.getAvailableWorker();
            
            if (!availableWorker) {
                // 利用可能なワーカーがない場合、適応的プーリングを試行
                if (this.config.adaptivePooling && this.canExpandPool()) {
                    await this.expandPool();
                    continue;
                } else {
                    break; // ワーカーが利用可能になるまで待機
                }
            }
            
            const task = this.taskQueue.shift();
            await this.executeTaskOnWorker(availableWorker, task);
        }
    }
    
    /**
     * 特定のワーカーでタスクを実行
     */
    async executeTaskOnWorker(workerWrapper, task) {
        workerWrapper.busy = true;
        workerWrapper.taskCount++;
        workerWrapper.lastUsed = Date.now();
        
        this.processingTasks.set(task.id, { workerWrapper, task });
        
        const startTime = performance.now();
        
        try {
            this.log(`Executing task ${task.id} on worker ${workerWrapper.id}`);
            
            // タイムアウト設定
            const timeoutId = setTimeout(() => {
                this.handleTaskTimeout(task);
            }, task.timeout);
            
            // タスク実行
            let result;
            switch (task.type) {
                case 'PARSE':
                    result = await workerWrapper.interface.parse(task.payload.code, task.payload.options);
                    break;
                case 'VALIDATE':
                    result = await workerWrapper.interface.validate(task.payload.code);
                    break;
                case 'BATCH_PARSE':
                    result = await workerWrapper.interface.batchParse(task.payload.codes, task.payload.options);
                    break;
                default:
                    throw new Error(`Unknown task type: ${task.type}`);
            }
            
            clearTimeout(timeoutId);
            
            // パフォーマンス記録
            const duration = performance.now() - startTime;
            this.performanceMonitor.recordTask({
                taskId: task.id,
                type: task.type,
                duration,
                workerId: workerWrapper.id,
                success: true
            });
            
            // 統計更新
            this.updateStats(duration, true);
            
            task.resolve(result);
            
        } catch (error) {
            this.log(`Task ${task.id} failed`, error);
            
            // エラー記録
            this.performanceMonitor.recordTask({
                taskId: task.id,
                type: task.type,
                duration: performance.now() - startTime,
                workerId: workerWrapper.id,
                success: false,
                error: error.message
            });
            
            this.updateStats(performance.now() - startTime, false);
            
            task.reject(error);
        } finally {
            // ワーカーを解放
            workerWrapper.busy = false;
            this.processingTasks.delete(task.id);
            
            // 次のタスクを処理
            this.processQueue();
        }
    }
    
    /**
     * 利用可能なワーカーを取得
     */
    getAvailableWorker() {
        // ラウンドロビン方式で最適なワーカーを選択
        const availableWorkers = this.workerPool.filter(w => !w.busy);
        
        if (availableWorkers.length === 0) {
            return null;
        }
        
        // 負荷分散: タスク数が最も少ないワーカーを選択
        return availableWorkers.reduce((best, current) => {
            if (current.taskCount < best.taskCount) {
                return current;
            }
            if (current.taskCount === best.taskCount && current.lastUsed < best.lastUsed) {
                return current;
            }
            return best;
        });
    }
    
    /**
     * プールの拡張が可能かチェック
     */
    canExpandPool() {
        return this.workerPool.length < this.maxPoolSize && 
               this.taskQueue.length > this.workerPool.length &&
               this.memoryManager.isMemoryAvailable();
    }
    
    /**
     * プールの拡張
     */
    async expandPool() {
        if (!this.canExpandPool()) {
            return false;
        }
        
        try {
            const newWorkerId = this.workerPool.length;
            await this.createWorker(newWorkerId);
            
            this.log(`Pool expanded to ${this.workerPool.length} workers`);
            return true;
            
        } catch (error) {
            this.log('Failed to expand pool', error);
            return false;
        }
    }
    
    /**
     * プールの縮小
     */
    shrinkPool() {
        if (this.workerPool.length <= this.poolSize) {
            return;
        }
        
        // 使用されていない古いワーカーを特定
        const idleWorkers = this.workerPool
            .filter(w => !w.busy)
            .sort((a, b) => a.lastUsed - b.lastUsed);
        
        if (idleWorkers.length > 0) {
            const workerToRemove = idleWorkers[0];
            this.removeWorker(workerToRemove);
        }
    }
    
    /**
     * ワーカーの削除
     */
    removeWorker(workerWrapper) {
        const index = this.workerPool.indexOf(workerWrapper);
        if (index > -1) {
            workerWrapper.interface.terminate();
            this.workerPool.splice(index, 1);
            this.log(`Worker ${workerWrapper.id} removed from pool`);
        }
    }
    
    /**
     * パフォーマンス監視の開始
     */
    startMonitoring() {
        // 定期的なメモリチェック (30秒間隔)
        setInterval(() => {
            this.memoryManager.checkMemoryUsage();
            this.updatePoolUtilization();
            
            // 必要に応じてプール調整
            if (this.config.adaptivePooling) {
                this.adaptivePoolManagement();
            }
        }, 30000);
        
        // パフォーマンスレポート (5分間隔)
        setInterval(() => {
            this.generatePerformanceReport();
        }, 300000);
    }
    
    /**
     * 適応的プール管理
     */
    adaptivePoolManagement() {
        const utilization = this.stats.poolUtilization;
        const queueLength = this.taskQueue.length;
        
        // 高負荷時の拡張
        if (utilization > 80 && queueLength > 5 && this.canExpandPool()) {
            this.expandPool();
        }
        
        // 低負荷時の縮小
        if (utilization < 20 && queueLength === 0 && this.workerPool.length > this.poolSize) {
            this.shrinkPool();
        }
    }
    
    /**
     * 統計情報の更新
     */
    updateStats(duration, success) {
        this.stats.tasksCompleted++;
        
        if (success) {
            // 移動平均でタスク時間を更新
            const alpha = 0.1;
            this.stats.averageTaskTime = this.stats.averageTaskTime * (1 - alpha) + duration * alpha;
        }
        
        this.updatePoolUtilization();
    }
    
    /**
     * プール使用率の更新
     */
    updatePoolUtilization() {
        const busyWorkers = this.workerPool.filter(w => w.busy).length;
        this.stats.poolUtilization = (busyWorkers / this.workerPool.length) * 100;
    }
    
    /**
     * パフォーマンスレポートの生成
     */
    generatePerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            poolSize: this.workerPool.length,
            stats: { ...this.stats },
            memory: this.memoryManager.getMemoryStats(),
            performance: this.performanceMonitor.getReport()
        };
        
        this.log('Performance Report', report);
        
        // デバッグモードの場合、詳細をコンソールに出力
        if (this.config.debugMode) {
            console.table([
                ['Pool Size', this.workerPool.length],
                ['Tasks Completed', this.stats.tasksCompleted],
                ['Queue Length', this.taskQueue.length],
                ['Pool Utilization', `${this.stats.poolUtilization.toFixed(1)}%`],
                ['Avg Task Time', `${this.stats.averageTaskTime.toFixed(2)}ms`]
            ]);
        }
        
        return report;
    }
    
    /**
     * タスクタイムアウト処理
     */
    handleTaskTimeout(task) {
        this.log(`Task ${task.id} timed out`);
        
        const processingTask = this.processingTasks.get(task.id);
        if (processingTask) {
            // ワーカーを強制終了して再作成
            this.restartWorker(processingTask.workerWrapper);
            this.processingTasks.delete(task.id);
            
            task.reject(new Error('Task timeout'));
        }
    }
    
    /**
     * ワーカーの再起動
     */
    async restartWorker(workerWrapper) {
        this.log(`Restarting worker ${workerWrapper.id}`);
        
        // 古いワーカーを終了
        workerWrapper.interface.terminate();
        
        // 新しいワーカーを作成
        try {
            const newWorker = await this.createWorker(workerWrapper.id);
            const index = this.workerPool.indexOf(workerWrapper);
            this.workerPool[index] = newWorker;
            
        } catch (error) {
            this.log(`Failed to restart worker ${workerWrapper.id}`, error);
            // プールからワーカーを削除
            this.removeWorker(workerWrapper);
        }
    }
    
    /**
     * ワーカーメッセージハンドラー
     */
    handleWorkerMessage(workerWrapper, event) {
        // メッセージの詳細処理は WorkerInterface に委譲
        this.log(`Message from worker ${workerWrapper.id}`, event.data.type);
    }
    
    /**
     * ワーカーエラーハンドラー
     */
    handleWorkerError(workerWrapper, error) {
        this.log(`Worker ${workerWrapper.id} error`, error);
        
        // エラーが発生したワーカーを再起動
        this.restartWorker(workerWrapper);
    }
    
    /**
     * タスクID生成
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * ログ出力
     */
    log(message, data = null) {
        if (this.config.debugMode || localStorage.getItem('debug_worker_manager') === 'true') {
            console.group(`[WorkerManager] ${message}`);
            if (data) console.log(data);
            console.groupEnd();
        }
    }
    
    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.stats,
            poolSize: this.workerPool.length,
            queueLength: this.taskQueue.length,
            busyWorkers: this.workerPool.filter(w => w.busy).length,
            memory: this.memoryManager.getMemoryStats()
        };
    }
    
    /**
     * 終了処理
     */
    async shutdown() {
        this.log('Shutting down WorkerManager');
        
        // すべてのワーカーを終了
        const terminatePromises = this.workerPool.map(w => 
            Promise.resolve(w.interface.terminate())
        );
        
        await Promise.all(terminatePromises);
        
        // キューをクリア
        this.taskQueue.forEach(task => {
            task.reject(new Error('WorkerManager shutdown'));
        });
        this.taskQueue.length = 0;
        
        this.initialized = false;
        this.log('WorkerManager shutdown complete');
    }
}

/**
 * パフォーマンス監視クラス
 */
class PerformanceMonitor {
    constructor() {
        this.tasks = [];
        this.maxTasks = 1000;
    }
    
    recordTask(taskData) {
        this.tasks.push({
            ...taskData,
            timestamp: Date.now()
        });
        
        if (this.tasks.length > this.maxTasks) {
            this.tasks.shift();
        }
    }
    
    getReport() {
        if (this.tasks.length === 0) return null;
        
        const successful = this.tasks.filter(t => t.success);
        const failed = this.tasks.filter(t => !t.success);
        
        const durations = successful.map(t => t.duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        
        return {
            totalTasks: this.tasks.length,
            successRate: (successful.length / this.tasks.length) * 100,
            averageDuration: avg,
            failureRate: (failed.length / this.tasks.length) * 100
        };
    }
}

/**
 * ワーカーメモリ管理クラス
 */
class WorkerMemoryManager {
    constructor(options = {}) {
        this.memoryThreshold = options.memoryThreshold || 100 * 1024 * 1024; // 100MB
        this.monitoringEnabled = typeof performance !== 'undefined' && performance.memory;
    }
    
    checkMemoryUsage() {
        if (!this.monitoringEnabled) return true;
        
        const memInfo = performance.memory;
        const usedMemory = memInfo.usedJSHeapSize;
        const totalMemory = memInfo.totalJSHeapSize;
        const limit = memInfo.jsHeapSizeLimit;
        
        // メモリ使用率が90%を超えた場合は警告
        if (usedMemory / limit > 0.9) {
            console.warn('[WorkerManager] High memory usage detected', {
                used: `${(usedMemory / 1024 / 1024).toFixed(2)}MB`,
                total: `${(totalMemory / 1024 / 1024).toFixed(2)}MB`,
                limit: `${(limit / 1024 / 1024).toFixed(2)}MB`
            });
            return false;
        }
        
        return true;
    }
    
    isMemoryAvailable() {
        return this.checkMemoryUsage();
    }
    
    getMemoryStats() {
        if (!this.monitoringEnabled) {
            return { supported: false };
        }
        
        const memInfo = performance.memory;
        return {
            supported: true,
            used: memInfo.usedJSHeapSize,
            total: memInfo.totalJSHeapSize,
            limit: memInfo.jsHeapSizeLimit,
            usagePercentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
        };
    }
}

// シングルトンインスタンス
let workerManagerInstance = null;

/**
 * WorkerManagerのシングルトンインスタンスを取得
 */
export function getWorkerManager(options = {}) {
    if (!workerManagerInstance) {
        workerManagerInstance = new WorkerManager(options);
    }
    return workerManagerInstance;
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.WorkerManager = WorkerManager;
    window.getWorkerManager = getWorkerManager;
}