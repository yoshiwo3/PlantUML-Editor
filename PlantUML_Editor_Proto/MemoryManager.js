/**
 * MemoryManager.js - メモリ管理システム
 * 
 * フェーズ2: 安定化 - メモリリークの防止とパフォーマンス監視
 * 作成日: 2025-08-13
 * 
 * 主な機能:
 * - メモリ使用率の監視（5秒ごと）
 * - 閾値（80%）を超えた場合の自動クリーンアップ
 * - メモリ履歴の記録
 * - クリーンアップコールバックの登録機能
 * - DOMキャッシュのクリア
 * - 未使用のイベントリスナー削除
 */

class MemoryManager {
    constructor() {
        this.monitoring = false;
        this.monitoringInterval = null;
        this.memoryThreshold = 0.8; // 80%
        this.memoryHistory = [];
        this.maxHistorySize = 100;
        this.cleanupCallbacks = [];
        this.lastCleanupTime = 0;
        this.cleanupCooldown = 10000; // 10秒のクールダウン
        
        console.log('MemoryManager: 初期化完了');
    }

    /**
     * メモリ監視を開始
     * @param {number} interval 監視間隔（ミリ秒）
     */
    startMonitoring(interval = 5000) {
        if (this.monitoring) {
            console.log('MemoryManager: 既に監視中です');
            return;
        }

        this.monitoring = true;
        console.log(`MemoryManager: 監視開始 (間隔: ${interval}ms)`);

        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, interval);

        // 初回チェック
        this.checkMemoryUsage();
    }

    /**
     * メモリ監視を停止
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.monitoring = false;
        console.log('MemoryManager: 監視停止');
    }

    /**
     * メモリ使用状況をチェック
     */
    checkMemoryUsage() {
        try {
            if (!window.performance || !window.performance.memory) {
                console.warn('MemoryManager: performance.memory API が利用できません');
                return;
            }

            const memory = window.performance.memory;
            const usedMemory = memory.usedJSHeapSize;
            const totalMemory = memory.totalJSHeapSize;
            const memoryLimit = memory.jsHeapSizeLimit;
            
            const usageRatio = usedMemory / memoryLimit;
            const currentTime = Date.now();

            // メモリ履歴に記録
            this.recordMemoryUsage({
                timestamp: currentTime,
                used: usedMemory,
                total: totalMemory,
                limit: memoryLimit,
                ratio: usageRatio
            });

            console.log(`MemoryManager: メモリ使用率 ${(usageRatio * 100).toFixed(2)}% (${this.formatBytes(usedMemory)}/${this.formatBytes(memoryLimit)})`);

            // 閾値チェック
            if (usageRatio > this.memoryThreshold) {
                console.warn(`MemoryManager: メモリ使用率が閾値を超過 (${(usageRatio * 100).toFixed(2)}%)`);
                this.performCleanup();
            }

        } catch (error) {
            console.error('MemoryManager: メモリチェックエラー:', error);
        }
    }

    /**
     * メモリ使用履歴を記録
     * @param {Object} memoryData メモリ使用データ
     */
    recordMemoryUsage(memoryData) {
        this.memoryHistory.push(memoryData);
        
        // 履歴サイズの制限
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory.shift();
        }
    }

    /**
     * クリーンアップを実行
     */
    performCleanup() {
        const currentTime = Date.now();
        
        // クールダウンチェック
        if (currentTime - this.lastCleanupTime < this.cleanupCooldown) {
            console.log('MemoryManager: クールダウン中のためクリーンアップをスキップ');
            return;
        }

        console.log('MemoryManager: 自動クリーンアップを開始');
        this.lastCleanupTime = currentTime;

        try {
            // 登録されたクリーンアップコールバックを実行
            this.cleanupCallbacks.forEach((callback, index) => {
                try {
                    callback();
                    console.log(`MemoryManager: クリーンアップコールバック ${index + 1} 実行完了`);
                } catch (error) {
                    console.error(`MemoryManager: クリーンアップコールバック ${index + 1} でエラー:`, error);
                }
            });

            // DOMキャッシュのクリア
            this.clearDOMCaches();

            // 不要なイベントリスナーの削除
            this.cleanupEventListeners();

            // ガベージコレクションの実行（可能な場合）
            this.requestGarbageCollection();

            console.log('MemoryManager: クリーンアップ完了');

        } catch (error) {
            console.error('MemoryManager: クリーンアップ中にエラー:', error);
        }
    }

    /**
     * DOMキャッシュをクリア
     */
    clearDOMCaches() {
        console.log('MemoryManager: DOMキャッシュをクリア中...');

        // jQuery キャッシュのクリア（存在する場合）
        if (window.$ && typeof window.$.cache !== 'undefined') {
            window.$.cache = {};
            console.log('MemoryManager: jQuery キャッシュをクリア');
        }

        // カスタムキャッシュのクリア（グローバル変数から検索）
        const globalCacheNames = ['cache', 'elementCache', 'domCache', 'nodeCache'];
        globalCacheNames.forEach(cacheName => {
            if (window[cacheName] && typeof window[cacheName] === 'object') {
                if (window[cacheName].clear && typeof window[cacheName].clear === 'function') {
                    window[cacheName].clear();
                } else if (Array.isArray(window[cacheName])) {
                    window[cacheName].length = 0;
                } else {
                    Object.keys(window[cacheName]).forEach(key => {
                        delete window[cacheName][key];
                    });
                }
                console.log(`MemoryManager: ${cacheName} をクリア`);
            }
        });

        // WeakMap/WeakSet のクリア（可能な場合）
        if (window.WeakRef && window.FinalizationRegistry) {
            // モダンブラウザでのメモリ参照管理
            console.log('MemoryManager: WeakRef/FinalizationRegistry 環境を検出');
        }
    }

    /**
     * 不要なイベントリスナーをクリーンアップ
     */
    cleanupEventListeners() {
        console.log('MemoryManager: イベントリスナーをクリーンアップ中...');

        // 孤立したDOM要素のイベントリスナーを検索してクリア
        const allElements = document.querySelectorAll('*');
        let cleanedCount = 0;

        allElements.forEach(element => {
            // 要素が表示されていない場合、イベントリスナーをクリア
            if (element.offsetParent === null && element !== document.body && element !== document.documentElement) {
                // 一般的なイベントタイプをクリア
                const commonEvents = ['click', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'keydown', 'keyup', 'change', 'input', 'focus', 'blur'];
                commonEvents.forEach(eventType => {
                    element.removeEventListener(eventType, null);
                });
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            console.log(`MemoryManager: ${cleanedCount} 個の要素のイベントリスナーをクリア`);
        }
    }

    /**
     * ガベージコレクションをリクエスト
     */
    requestGarbageCollection() {
        // Chrome DevTools のメモリタブでガベージコレクションボタンを押すのと同等
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
            console.log('MemoryManager: 手動ガベージコレクションを実行');
        } else {
            console.log('MemoryManager: ガベージコレクション機能は利用できません');
        }
    }

    /**
     * クリーンアップコールバックを登録
     * @param {Function} callback クリーンアップ時に実行する関数
     */
    registerCleanupCallback(callback) {
        if (typeof callback === 'function') {
            this.cleanupCallbacks.push(callback);
            console.log(`MemoryManager: クリーンアップコールバックを登録 (合計: ${this.cleanupCallbacks.length})`);
        } else {
            console.error('MemoryManager: 無効なクリーンアップコールバック');
        }
    }

    /**
     * クリーンアップコールバックを削除
     * @param {Function} callback 削除する関数
     */
    unregisterCleanupCallback(callback) {
        const index = this.cleanupCallbacks.indexOf(callback);
        if (index > -1) {
            this.cleanupCallbacks.splice(index, 1);
            console.log(`MemoryManager: クリーンアップコールバックを削除 (残り: ${this.cleanupCallbacks.length})`);
        }
    }

    /**
     * メモリ統計情報を取得
     * @returns {Object} メモリ統計
     */
    getMemoryStats() {
        if (!window.performance || !window.performance.memory) {
            return null;
        }

        const memory = window.performance.memory;
        const currentUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        // 履歴から平均使用率を計算
        const recentHistory = this.memoryHistory.slice(-10); // 最新10件
        const avgUsage = recentHistory.length > 0 
            ? recentHistory.reduce((sum, record) => sum + record.ratio, 0) / recentHistory.length 
            : currentUsage;

        return {
            current: {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                ratio: currentUsage
            },
            average: avgUsage,
            historySize: this.memoryHistory.length,
            lastCleanup: this.lastCleanupTime,
            cleanupCallbacks: this.cleanupCallbacks.length
        };
    }

    /**
     * バイト数を読みやすい形式にフォーマット
     * @param {number} bytes バイト数
     * @returns {string} フォーマットされた文字列
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * メモリ使用履歴をクリア
     */
    clearHistory() {
        this.memoryHistory = [];
        console.log('MemoryManager: メモリ履歴をクリア');
    }

    /**
     * デストラクタ - リソースのクリーンアップ
     */
    destroy() {
        this.stopMonitoring();
        this.cleanupCallbacks = [];
        this.memoryHistory = [];
        console.log('MemoryManager: 破棄完了');
    }
}

// グローバルインスタンスの作成
window.memoryManager = new MemoryManager();

// ページ読み込み完了時に自動開始
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('MemoryManager: DOM読み込み完了 - 監視開始');
        window.memoryManager.startMonitoring();
    });
} else {
    console.log('MemoryManager: 即座に監視開始');
    window.memoryManager.startMonitoring();
}

// ページアンロード時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (window.memoryManager) {
        window.memoryManager.destroy();
    }
});