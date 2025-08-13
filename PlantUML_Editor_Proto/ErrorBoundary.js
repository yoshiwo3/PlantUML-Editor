/**
 * ErrorBoundary.js - エラー境界システム
 * 
 * フェーズ2: 安定化 - アプリケーション全体のエラーハンドリングと回復
 * 作成日: 2025-08-13
 * 
 * 主な機能:
 * - グローバルエラーハンドラーの設定
 * - Promise拒否ハンドラーの設定
 * - エラー履歴の管理
 * - 重大エラーの検出と自動回復
 * - タイマーのクリア機能
 * - イベントリスナーのリセット
 * - アプリケーション状態のリセット
 * - UIの再初期化
 * - ユーザーへの通知機能
 */

class ErrorBoundary {
    constructor() {
        this.errorHistory = [];
        this.maxErrorHistory = 50;
        this.criticalErrorCount = 0;
        this.criticalErrorThreshold = 3;
        this.lastRecoveryTime = 0;
        this.recoveryTimeout = 30000; // 30秒
        this.timers = new Set();
        this.intervals = new Set();
        this.recoveryCallbacks = [];
        this.isRecovering = false;
        
        this.setupErrorHandlers();
        console.log('ErrorBoundary: 初期化完了');
    }

    /**
     * エラーハンドラーを設定
     */
    setupErrorHandlers() {
        // グローバルエラーハンドラー
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'script',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: Date.now()
            });
        });

        // Promise拒否ハンドラー
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled Promise Rejection',
                error: event.reason,
                timestamp: Date.now()
            });
        });

        // リソース読み込みエラー
        window.addEventListener('error', (event) => {
            if (event.target && event.target !== window) {
                this.handleError({
                    type: 'resource',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    target: event.target.tagName,
                    timestamp: Date.now()
                });
            }
        }, true);

        console.log('ErrorBoundary: エラーハンドラーを設定完了');
    }

    /**
     * エラーを処理
     * @param {Object} errorInfo エラー情報
     */
    handleError(errorInfo) {
        console.error('ErrorBoundary: エラーをキャッチ:', errorInfo);

        // エラー履歴に記録
        this.recordError(errorInfo);

        // エラーの重要度を判定
        const severity = this.assessErrorSeverity(errorInfo);
        
        if (severity === 'critical') {
            this.criticalErrorCount++;
            console.warn(`ErrorBoundary: 重大エラー検出 (累計: ${this.criticalErrorCount})`);

            // 重大エラーが閾値を超えた場合の自動回復
            if (this.criticalErrorCount >= this.criticalErrorThreshold) {
                this.attemptRecovery(errorInfo);
            }
        }

        // ユーザーへの通知
        this.notifyUser(errorInfo, severity);
    }

    /**
     * エラーを履歴に記録
     * @param {Object} errorInfo エラー情報
     */
    recordError(errorInfo) {
        this.errorHistory.push({
            ...errorInfo,
            id: this.generateErrorId(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });

        // 履歴サイズの制限
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.shift();
        }
    }

    /**
     * エラーの重要度を評価
     * @param {Object} errorInfo エラー情報
     * @returns {string} severity レベル (low, medium, high, critical)
     */
    assessErrorSeverity(errorInfo) {
        const criticalPatterns = [
            /cannot read prop/i,
            /is not defined/i,
            /is not a function/i,
            /maximum call stack/i,
            /out of memory/i,
            /network error/i,
            /script error/i
        ];

        const highPatterns = [
            /syntax error/i,
            /reference error/i,
            /type error/i,
            /range error/i
        ];

        const message = errorInfo.message || '';

        if (criticalPatterns.some(pattern => pattern.test(message))) {
            return 'critical';
        } else if (highPatterns.some(pattern => pattern.test(message))) {
            return 'high';
        } else if (errorInfo.type === 'resource') {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * 自動回復を試行
     * @param {Object} triggerError 回復のきっかけとなったエラー
     */
    attemptRecovery(triggerError) {
        const currentTime = Date.now();

        // 回復試行のクールダウンチェック
        if (currentTime - this.lastRecoveryTime < this.recoveryTimeout) {
            console.log('ErrorBoundary: 回復試行がクールダウン中');
            return;
        }

        if (this.isRecovering) {
            console.log('ErrorBoundary: 既に回復処理中');
            return;
        }

        console.warn('ErrorBoundary: 自動回復を開始');
        this.isRecovering = true;
        this.lastRecoveryTime = currentTime;

        try {
            // 1. タイマーとインターバルのクリア
            this.clearAllTimers();

            // 2. イベントリスナーのリセット
            this.resetEventListeners();

            // 3. アプリケーション状態のリセット
            this.resetApplicationState();

            // 4. UIの再初期化
            this.reinitializeUI();

            // 5. 登録されたリカバリコールバックの実行
            this.executeRecoveryCallbacks();

            // 6. メモリのクリーンアップ
            if (window.memoryManager) {
                window.memoryManager.performCleanup();
            }

            // 重大エラーカウンターをリセット
            this.criticalErrorCount = 0;

            console.log('ErrorBoundary: 自動回復完了');
            this.notifyUser({ 
                type: 'recovery', 
                message: 'アプリケーションが自動回復されました' 
            }, 'info');

        } catch (recoveryError) {
            console.error('ErrorBoundary: 自動回復中にエラー:', recoveryError);
            this.handleUnrecoverableError(triggerError, recoveryError);
        } finally {
            this.isRecovering = false;
        }
    }

    /**
     * すべてのタイマーとインターバルをクリア
     */
    clearAllTimers() {
        console.log('ErrorBoundary: タイマーとインターバルをクリア中...');

        // 記録されたタイマーをクリア
        this.timers.forEach(id => {
            clearTimeout(id);
        });
        this.intervals.forEach(id => {
            clearInterval(id);
        });

        this.timers.clear();
        this.intervals.clear();

        // グローバルなタイマーIDをクリア（危険な処理だが、回復のため）
        for (let i = 1; i <= 10000; i++) {
            clearTimeout(i);
            clearInterval(i);
        }

        console.log('ErrorBoundary: タイマーとインターバルのクリア完了');
    }

    /**
     * イベントリスナーをリセット
     */
    resetEventListeners() {
        console.log('ErrorBoundary: イベントリスナーをリセット中...');

        try {
            // body要素の子要素のイベントリスナーをクリア
            const allElements = document.body.querySelectorAll('*');
            const commonEvents = ['click', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 
                                'keydown', 'keyup', 'change', 'input', 'focus', 'blur',
                                'submit', 'load', 'resize', 'scroll'];

            allElements.forEach(element => {
                commonEvents.forEach(eventType => {
                    const newElement = element.cloneNode(true);
                    if (element.parentNode) {
                        element.parentNode.replaceChild(newElement, element);
                    }
                });
            });

            console.log(`ErrorBoundary: ${allElements.length} 要素のイベントリスナーをリセット`);
        } catch (error) {
            console.error('ErrorBoundary: イベントリスナーリセット中にエラー:', error);
        }
    }

    /**
     * アプリケーション状態をリセット
     */
    resetApplicationState() {
        console.log('ErrorBoundary: アプリケーション状態をリセット中...');

        // よく知られたグローバル状態変数をリセット
        const stateVariables = ['app', 'appState', 'globalState', 'state', 'data'];
        
        stateVariables.forEach(varName => {
            if (window[varName] && typeof window[varName] === 'object') {
                try {
                    if (window[varName].reset && typeof window[varName].reset === 'function') {
                        window[varName].reset();
                        console.log(`ErrorBoundary: ${varName}.reset() を実行`);
                    } else {
                        // オブジェクトのプロパティをクリア
                        Object.keys(window[varName]).forEach(key => {
                            if (typeof window[varName][key] !== 'function') {
                                delete window[varName][key];
                            }
                        });
                        console.log(`ErrorBoundary: ${varName} のプロパティをクリア`);
                    }
                } catch (error) {
                    console.error(`ErrorBoundary: ${varName} のリセット中にエラー:`, error);
                }
            }
        });

        // LocalStorage のアプリ固有データをクリア
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('app_') || key.startsWith('plantuml_')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('ErrorBoundary: LocalStorage のアプリデータをクリア');
        } catch (error) {
            console.error('ErrorBoundary: LocalStorage クリア中にエラー:', error);
        }
    }

    /**
     * UIを再初期化
     */
    reinitializeUI() {
        console.log('ErrorBoundary: UI再初期化中...');

        try {
            // 既知のUI初期化関数を呼び出し
            const initFunctions = ['init', 'initialize', 'startup', 'setup', 'main'];
            
            initFunctions.forEach(funcName => {
                if (window[funcName] && typeof window[funcName] === 'function') {
                    try {
                        window[funcName]();
                        console.log(`ErrorBoundary: ${funcName}() を実行`);
                    } catch (error) {
                        console.error(`ErrorBoundary: ${funcName}() でエラー:`, error);
                    }
                }
            });

            // DOM要素の可視性を復元
            document.body.style.display = '';
            document.body.style.visibility = 'visible';

            // loading状態の要素があれば非表示
            const loadingElements = document.querySelectorAll('.loading, .spinner, [data-loading]');
            loadingElements.forEach(element => {
                element.style.display = 'none';
            });

            console.log('ErrorBoundary: UI再初期化完了');
        } catch (error) {
            console.error('ErrorBoundary: UI再初期化中にエラー:', error);
        }
    }

    /**
     * 登録されたリカバリコールバックを実行
     */
    executeRecoveryCallbacks() {
        console.log(`ErrorBoundary: ${this.recoveryCallbacks.length} 個のリカバリコールバックを実行中...`);

        this.recoveryCallbacks.forEach((callback, index) => {
            try {
                callback();
                console.log(`ErrorBoundary: リカバリコールバック ${index + 1} 実行完了`);
            } catch (error) {
                console.error(`ErrorBoundary: リカバリコールバック ${index + 1} でエラー:`, error);
            }
        });
    }

    /**
     * 回復不可能なエラーの処理
     * @param {Object} originalError 元のエラー
     * @param {Object} recoveryError 回復中のエラー
     */
    handleUnrecoverableError(originalError, recoveryError) {
        console.error('ErrorBoundary: 回復不可能なエラー状態');
        
        // 最後の手段：ページリロード
        const shouldReload = confirm(
            'アプリケーションで回復不可能なエラーが発生しました。\n' +
            'ページを再読み込みしますか？\n\n' +
            '「OK」でリロード、「キャンセル」で継続'
        );

        if (shouldReload) {
            console.log('ErrorBoundary: ページリロードを実行');
            window.location.reload();
        } else {
            // UIに永続的なエラーメッセージを表示
            this.showPersistentErrorMessage(originalError, recoveryError);
        }
    }

    /**
     * 永続的なエラーメッセージを表示
     * @param {Object} originalError 元のエラー
     * @param {Object} recoveryError 回復中のエラー
     */
    showPersistentErrorMessage(originalError, recoveryError) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; background: #ff4444; color: white; padding: 10px; z-index: 9999; font-family: monospace;">
                <h3>🚨 アプリケーションエラー</h3>
                <p>回復不可能なエラーが発生しました。ページの再読み込みを推奨します。</p>
                <button onclick="window.location.reload()" style="background: white; color: #ff4444; border: none; padding: 5px 10px; margin-right: 10px; cursor: pointer;">
                    再読み込み
                </button>
                <button onclick="this.parentElement.remove()" style="background: transparent; color: white; border: 1px solid white; padding: 5px 10px; cursor: pointer;">
                    閉じる
                </button>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer;">エラー詳細</summary>
                    <pre style="background: rgba(0,0,0,0.3); padding: 10px; margin-top: 5px; font-size: 12px; white-space: pre-wrap;">
                        元のエラー: ${JSON.stringify(originalError, null, 2)}
                        回復エラー: ${JSON.stringify(recoveryError, null, 2)}
                    </pre>
                </details>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * ユーザーへの通知
     * @param {Object} errorInfo エラー情報
     * @param {string} severity 重要度
     */
    notifyUser(errorInfo, severity) {
        // コンソールでのログ出力は常に行う
        const logMessage = `ErrorBoundary: ${severity.toUpperCase()} - ${errorInfo.message}`;
        
        switch (severity) {
            case 'critical':
                console.error(logMessage);
                break;
            case 'high':
                console.warn(logMessage);
                break;
            case 'info':
                console.info(logMessage);
                break;
            default:
                console.log(logMessage);
        }

        // UIでの通知（重大エラーのみ）
        if (severity === 'critical' || errorInfo.type === 'recovery') {
            this.showToastNotification(errorInfo, severity);
        }
    }

    /**
     * トースト通知を表示
     * @param {Object} errorInfo エラー情報
     * @param {string} severity 重要度
     */
    showToastNotification(errorInfo, severity) {
        const existing = document.getElementById('error-boundary-toast');
        if (existing) {
            existing.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'error-boundary-toast';
        
        const isRecovery = errorInfo.type === 'recovery';
        const backgroundColor = isRecovery ? '#4CAF50' : '#f44336';
        const icon = isRecovery ? '✅' : '⚠️';
        
        toast.innerHTML = `
            <div style="
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: ${backgroundColor}; 
                color: white; 
                padding: 15px; 
                border-radius: 5px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: Arial, sans-serif;
                max-width: 300px;
                font-size: 14px;
                line-height: 1.4;
            ">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
                    <strong>${isRecovery ? '回復完了' : 'エラー発生'}</strong>
                </div>
                <div style="margin-bottom: 10px;">
                    ${errorInfo.message}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    閉じる
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // 5秒後に自動で消去
        setTimeout(() => {
            if (toast && toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    /**
     * リカバリコールバックを登録
     * @param {Function} callback 回復時に実行する関数
     */
    registerRecoveryCallback(callback) {
        if (typeof callback === 'function') {
            this.recoveryCallbacks.push(callback);
            console.log(`ErrorBoundary: リカバリコールバックを登録 (合計: ${this.recoveryCallbacks.length})`);
        }
    }

    /**
     * タイマーを記録（自動クリア用）
     * @param {number} id タイマーID
     * @param {string} type 'timeout' または 'interval'
     */
    trackTimer(id, type = 'timeout') {
        if (type === 'timeout') {
            this.timers.add(id);
        } else if (type === 'interval') {
            this.intervals.add(id);
        }
    }

    /**
     * エラー統計を取得
     * @returns {Object} エラー統計情報
     */
    getErrorStats() {
        const now = Date.now();
        const recentErrors = this.errorHistory.filter(error => 
            now - error.timestamp < 300000 // 5分以内
        );

        const errorsByType = this.errorHistory.reduce((acc, error) => {
            acc[error.type] = (acc[error.type] || 0) + 1;
            return acc;
        }, {});

        const errorsBySeverity = this.errorHistory.reduce((acc, error) => {
            const severity = this.assessErrorSeverity(error);
            acc[severity] = (acc[severity] || 0) + 1;
            return acc;
        }, {});

        return {
            totalErrors: this.errorHistory.length,
            recentErrors: recentErrors.length,
            criticalErrorCount: this.criticalErrorCount,
            lastRecovery: this.lastRecoveryTime,
            isRecovering: this.isRecovering,
            errorsByType,
            errorsBySeverity,
            trackedTimers: this.timers.size,
            trackedIntervals: this.intervals.size,
            recoveryCallbacks: this.recoveryCallbacks.length
        };
    }

    /**
     * エラーIDを生成
     * @returns {string} ユニークなエラーID
     */
    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * エラー履歴をクリア
     */
    clearErrorHistory() {
        this.errorHistory = [];
        this.criticalErrorCount = 0;
        console.log('ErrorBoundary: エラー履歴をクリア');
    }

    /**
     * デストラクタ - リソースのクリーンアップ
     */
    destroy() {
        this.clearAllTimers();
        this.errorHistory = [];
        this.recoveryCallbacks = [];
        this.criticalErrorCount = 0;
        console.log('ErrorBoundary: 破棄完了');
    }
}

// グローバルインスタンスの作成
window.errorBoundary = new ErrorBoundary();

// パフォーマンス監視
if (window.performance && window.performance.mark) {
    window.performance.mark('error-boundary-initialized');
}

console.log('ErrorBoundary: グローバルエラーハンドリングが有効化されました');