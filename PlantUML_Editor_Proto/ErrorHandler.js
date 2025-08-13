/**
 * ErrorHandler.js - 統合エラーハンドリングシステム
 * プロダクションレベルの品質保証を提供
 */

// エラータイプの定義
window.ERROR_TYPES = {
    VALIDATION: 'validation',
    RENDER: 'render',
    NETWORK: 'network',
    PERFORMANCE: 'performance',
    SYNTAX: 'syntax',
    MEMORY: 'memory',
    TIMEOUT: 'timeout',
    UNKNOWN: 'unknown'
};

window.ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

window.ErrorHandler = class ErrorHandler {
    constructor() {
        this.errors = [];
        this.errorListeners = new Map();
        this.recoveryStrategies = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.errorReports = [];
        
        // エラーメトリクス
        this.metrics = {
            totalErrors: 0,
            errorsByType: Object.keys(window.ERROR_TYPES).reduce((acc, type) => {
                acc[window.ERROR_TYPES[type]] = 0;
                return acc;
            }, {}),
            recoverableErrors: 0,
            fatalErrors: 0
        };
        
        this.initializeErrorHandling();
        this.setupRecoveryStrategies();
    }

    /**
     * グローバルエラーハンドリングの初期化
     */
    initializeErrorHandling() {
        // 未捕捉のエラーを処理
        window.addEventListener('error', (event) => {
            this.handleGlobalError({
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error,
                type: window.ERROR_TYPES.UNKNOWN,
                severity: window.ERROR_SEVERITY.HIGH
            });
        });

        // Promise拒否エラーを処理
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                message: event.reason?.message || 'Promise rejection',
                error: event.reason,
                type: window.ERROR_TYPES.UNKNOWN,
                severity: window.ERROR_SEVERITY.HIGH
            });
        });

        // コンソールエラーを拡張
        const originalError = console.error;
        console.error = (...args) => {
            this.handleConsoleError(args);
            originalError.apply(console, args);
        };
    }

    /**
     * 復旧戦略の設定
     */
    setupRecoveryStrategies() {
        // レンダリングエラーの復旧
        this.recoveryStrategies.set(window.ERROR_TYPES.RENDER, {
            strategy: this.recoverRenderError.bind(this),
            maxAttempts: 3,
            delay: 1000
        });

        // ネットワークエラーの復旧
        this.recoveryStrategies.set(window.ERROR_TYPES.NETWORK, {
            strategy: this.recoverNetworkError.bind(this),
            maxAttempts: 5,
            delay: 2000,
            backoffMultiplier: 2
        });

        // メモリエラーの復旧
        this.recoveryStrategies.set(window.ERROR_TYPES.MEMORY, {
            strategy: this.recoverMemoryError.bind(this),
            maxAttempts: 1,
            delay: 500
        });

        // パフォーマンスエラーの復旧
        this.recoveryStrategies.set(window.ERROR_TYPES.PERFORMANCE, {
            strategy: this.recoverPerformanceError.bind(this),
            maxAttempts: 2,
            delay: 1500
        });
    }

    /**
     * エラーの処理
     */
    async handleError(errorData) {
        try {
            const processedError = this.processError(errorData);
            this.logError(processedError);
            this.updateMetrics(processedError);
            
            // 自動復旧を試行
            const recovered = await this.attemptRecovery(processedError);
            
            if (!recovered && processedError.severity === window.ERROR_SEVERITY.CRITICAL) {
                this.handleCriticalError(processedError);
            }
            
            // エラーレポートの生成
            this.generateErrorReport(processedError);
            
            // リスナーへの通知
            this.notifyListeners(processedError);
            
            return processedError;
        } catch (handlingError) {
            console.error('Error handling failed:', handlingError);
            this.handleFatalError(handlingError);
        }
    }

    /**
     * エラーの処理と正規化
     */
    processError(errorData) {
        const timestamp = new Date().toISOString();
        const errorId = this.generateErrorId();
        
        const processedError = {
            id: errorId,
            timestamp,
            message: this.sanitizeErrorMessage(errorData.message || 'Unknown error'),
            type: errorData.type || window.ERROR_TYPES.UNKNOWN,
            severity: errorData.severity || this.determineSeverity(errorData),
            source: errorData.source || 'unknown',
            stack: errorData.error?.stack || new Error().stack,
            context: this.gatherContext(errorData),
            userAgent: navigator.userAgent,
            url: window.location.href,
            recovered: false,
            retryCount: 0
        };

        return processedError;
    }

    /**
     * エラーメッセージのサニタイズ
     */
    sanitizeErrorMessage(message) {
        if (typeof message !== 'string') {
            message = String(message);
        }
        
        // 機密情報の除去
        return message
            .replace(/password[=:]\s*\w+/gi, 'password=***')
            .replace(/token[=:]\s*[\w-]+/gi, 'token=***')
            .replace(/key[=:]\s*[\w-]+/gi, 'key=***')
            .substring(0, 500); // 長すぎるメッセージを制限
    }

    /**
     * エラー重要度の判定
     */
    determineSeverity(errorData) {
        const message = errorData.message || '';
        const errorType = errorData.error;
        
        // 致命的なエラーの検出
        if (message.includes('Maximum call stack') ||
            message.includes('out of memory') ||
            errorType instanceof RangeError) {
            return window.ERROR_SEVERITY.CRITICAL;
        }
        
        // 高重要度エラーの検出
        if (message.includes('TypeError') ||
            message.includes('ReferenceError') ||
            errorData.type === window.ERROR_TYPES.RENDER) {
            return window.ERROR_SEVERITY.HIGH;
        }
        
        // 中重要度エラーの検出
        if (errorData.type === window.ERROR_TYPES.VALIDATION ||
            errorData.type === window.ERROR_TYPES.NETWORK) {
            return window.ERROR_SEVERITY.MEDIUM;
        }
        
        return window.ERROR_SEVERITY.LOW;
    }

    /**
     * コンテキスト情報の収集
     */
    gatherContext(errorData) {
        const context = {
            memoryUsage: this.getMemoryInfo(),
            performanceMetrics: this.getPerformanceMetrics(),
            activeFeatures: this.getActiveFeatures(),
            userActions: this.getRecentUserActions(),
            systemState: this.getSystemState()
        };
        
        return context;
    }

    /**
     * メモリ使用量情報の取得
     */
    getMemoryInfo() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * パフォーマンスメトリクスの取得
     */
    getPerformanceMetrics() {
        const entries = performance.getEntriesByType('measure');
        return {
            renderTime: entries.find(e => e.name === 'render')?.duration || 0,
            validationTime: entries.find(e => e.name === 'validation')?.duration || 0,
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
        };
    }

    /**
     * アクティブな機能の取得
     */
    getActiveFeatures() {
        const features = [];
        
        if (window.PlantUMLEditor) {
            if (window.PlantUMLEditor.isRealTimeEnabled) features.push('realtime');
            if (window.PlantUMLEditor.isAutoSaveEnabled) features.push('autosave');
            if (window.PlantUMLEditor.isAdvancedMode) features.push('advanced');
        }
        
        return features;
    }

    /**
     * 最近のユーザーアクションの取得
     */
    getRecentUserActions() {
        // userActionHistory があると仮定（実装は他のモジュールで）
        if (window.userActionHistory) {
            return window.userActionHistory.slice(-10);
        }
        return [];
    }

    /**
     * システム状態の取得
     */
    getSystemState() {
        return {
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            language: navigator.language,
            platform: navigator.platform,
            windowSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    /**
     * 自動復旧の試行
     */
    async attemptRecovery(error) {
        const strategy = this.recoveryStrategies.get(error.type);
        if (!strategy) return false;
        
        const retryKey = `${error.type}_${error.source}`;
        const currentRetries = this.retryAttempts.get(retryKey) || 0;
        
        if (currentRetries >= strategy.maxAttempts) {
            console.warn(`Max retry attempts reached for error type: ${error.type}`);
            return false;
        }
        
        try {
            // 復旧戦略の実行
            const delay = strategy.delay * Math.pow(strategy.backoffMultiplier || 1, currentRetries);
            await this.sleep(delay);
            
            const recovered = await strategy.strategy(error);
            
            if (recovered) {
                error.recovered = true;
                error.retryCount = currentRetries + 1;
                this.metrics.recoverableErrors++;
                console.log(`Successfully recovered from error: ${error.type}`);
                return true;
            } else {
                this.retryAttempts.set(retryKey, currentRetries + 1);
                return await this.attemptRecovery(error);
            }
        } catch (recoveryError) {
            console.error('Recovery strategy failed:', recoveryError);
            this.retryAttempts.set(retryKey, currentRetries + 1);
            return false;
        }
    }

    /**
     * レンダリングエラーの復旧
     */
    async recoverRenderError(error) {
        try {
            // キャッシュクリア
            if (window.PlantUMLEditor && window.PlantUMLEditor.clearCache) {
                await window.PlantUMLEditor.clearCache();
            }
            
            // レンダラーの再初期化
            if (window.PlantUMLRenderer && window.PlantUMLRenderer.reinitialize) {
                await window.PlantUMLRenderer.reinitialize();
            }
            
            // 簡単なテストレンダリング
            const testInput = '@startuml\nA -> B\n@enduml';
            if (window.PlantUMLRenderer && window.PlantUMLRenderer.render) {
                await window.PlantUMLRenderer.render(testInput);
                return true;
            }
            
            return false;
        } catch (e) {
            console.error('Render recovery failed:', e);
            return false;
        }
    }

    /**
     * ネットワークエラーの復旧
     */
    async recoverNetworkError(error) {
        try {
            // 接続性チェック
            if (!navigator.onLine) {
                return false;
            }
            
            // 簡単な接続テスト
            const response = await fetch(window.location.origin, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * メモリエラーの復旧
     */
    async recoverMemoryError(error) {
        try {
            // ガベージコレクションの強制（可能な場合）
            if (window.gc) {
                window.gc();
            }
            
            // キャッシュクリア
            if (window.PlantUMLEditor && window.PlantUMLEditor.clearAllCaches) {
                await window.PlantUMLEditor.clearAllCaches();
            }
            
            // パフォーマンス最適化の実行
            if (window.PerformanceOptimizer && window.PerformanceOptimizer.optimizeMemory) {
                await window.PerformanceOptimizer.optimizeMemory();
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * パフォーマンスエラーの復旧
     */
    async recoverPerformanceError(error) {
        try {
            // パフォーマンス最適化の実行
            if (window.PerformanceOptimizer && window.PerformanceOptimizer.optimize) {
                await window.PerformanceOptimizer.optimize();
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 致命的エラーの処理
     */
    handleCriticalError(error) {
        this.metrics.fatalErrors++;
        
        // 緊急時のデータ保存
        this.saveEmergencyData();
        
        // ユーザーへの通知
        this.showCriticalErrorDialog(error);
        
        // エラーレポートの送信（本番環境では外部サービスに送信）
        this.sendCriticalErrorReport(error);
    }

    /**
     * 緊急時データの保存
     */
    saveEmergencyData() {
        try {
            const emergencyData = {
                timestamp: new Date().toISOString(),
                errors: this.errors.slice(-10),
                userInput: document.getElementById('plantuml-input')?.value || '',
                appState: this.getCurrentAppState()
            };
            
            localStorage.setItem('emergency_data', JSON.stringify(emergencyData));
        } catch (e) {
            console.error('Failed to save emergency data:', e);
        }
    }

    /**
     * 現在のアプリケーション状態の取得
     */
    getCurrentAppState() {
        const state = {};
        
        try {
            if (window.PlantUMLEditor) {
                state.editor = {
                    hasContent: !!document.getElementById('plantuml-input')?.value,
                    mode: window.PlantUMLEditor.currentMode || 'normal'
                };
            }
            
            if (window.PlantUMLRenderer) {
                state.renderer = {
                    lastRenderTime: window.PlantUMLRenderer.lastRenderTime || null,
                    renderCount: window.PlantUMLRenderer.renderCount || 0
                };
            }
        } catch (e) {
            // 状態取得エラーは無視
        }
        
        return state;
    }

    /**
     * 致命的エラーダイアログの表示
     */
    showCriticalErrorDialog(error) {
        const dialog = document.createElement('div');
        dialog.className = 'error-dialog critical';
        dialog.innerHTML = `
            <div class="error-dialog-content">
                <h3>⚠️ 致命的なエラーが発生しました</h3>
                <p>申し訳ございません。アプリケーションで重大な問題が発生しました。</p>
                <p>データは自動的に保存されました。ページを再読み込みしてください。</p>
                <div class="error-details">
                    <strong>エラーID:</strong> ${error.id}<br>
                    <strong>時刻:</strong> ${new Date(error.timestamp).toLocaleString()}
                </div>
                <div class="error-actions">
                    <button onclick="location.reload()">ページを再読み込み</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">閉じる</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 自動削除
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.remove();
            }
        }, 30000);
    }

    /**
     * グローバルエラーの処理
     */
    handleGlobalError(errorData) {
        const error = this.processError(errorData);
        this.handleError(error);
    }

    /**
     * コンソールエラーの処理
     */
    handleConsoleError(args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        this.handleError({
            message,
            type: window.ERROR_TYPES.UNKNOWN,
            severity: window.ERROR_SEVERITY.MEDIUM,
            source: 'console'
        });
    }

    /**
     * エラーレポートの生成
     */
    generateErrorReport(error) {
        const report = {
            id: error.id,
            timestamp: error.timestamp,
            summary: {
                type: error.type,
                severity: error.severity,
                message: error.message.substring(0, 100),
                recovered: error.recovered
            },
            details: error,
            recommendations: this.generateRecommendations(error)
        };
        
        this.errorReports.push(report);
        
        // レポート数の制限
        if (this.errorReports.length > 100) {
            this.errorReports.shift();
        }
    }

    /**
     * エラー対処法の推奨
     */
    generateRecommendations(error) {
        const recommendations = [];
        
        switch (error.type) {
            case window.ERROR_TYPES.RENDER:
                recommendations.push('入力内容を確認してください');
                recommendations.push('ブラウザの更新を試してください');
                break;
            case window.ERROR_TYPES.NETWORK:
                recommendations.push('インターネット接続を確認してください');
                recommendations.push('しばらく待ってから再試行してください');
                break;
            case window.ERROR_TYPES.MEMORY:
                recommendations.push('他のタブを閉じてください');
                recommendations.push('入力内容を分割してください');
                break;
            case window.ERROR_TYPES.PERFORMANCE:
                recommendations.push('入力内容を簡素化してください');
                recommendations.push('ブラウザを再起動してください');
                break;
        }
        
        return recommendations;
    }

    /**
     * メトリクスの更新
     */
    updateMetrics(error) {
        this.metrics.totalErrors++;
        this.metrics.errorsByType[error.type] = (this.metrics.errorsByType[error.type] || 0) + 1;
        this.errors.push(error);
        
        // エラー履歴の制限
        if (this.errors.length > 1000) {
            this.errors.shift();
        }
    }

    /**
     * エラーリスナーの追加
     */
    addErrorListener(callback) {
        const id = Date.now().toString();
        this.errorListeners.set(id, callback);
        return id;
    }

    /**
     * エラーリスナーの削除
     */
    removeErrorListener(id) {
        return this.errorListeners.delete(id);
    }

    /**
     * リスナーへの通知
     */
    notifyListeners(error) {
        this.errorListeners.forEach(callback => {
            try {
                callback(error);
            } catch (e) {
                console.error('Error listener failed:', e);
            }
        });
    }

    /**
     * ユーティリティメソッド
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logError(error) {
        const logLevel = error.severity === window.ERROR_SEVERITY.CRITICAL ? 'error' : 
                        error.severity === window.ERROR_SEVERITY.HIGH ? 'warn' : 'log';
        console[logLevel](`[ErrorHandler] ${error.type}: ${error.message}`, error);
    }

    sendCriticalErrorReport(error) {
        // 本番環境では外部監視サービス（Sentry、Bugsnag等）に送信
        console.error('CRITICAL ERROR REPORT:', error);
    }

    /**
     * 公開メソッド
     */
    getMetrics() {
        return { ...this.metrics };
    }

    getErrors(type = null, limit = 50) {
        let errors = this.errors;
        
        if (type) {
            errors = errors.filter(e => e.type === type);
        }
        
        return errors.slice(-limit);
    }

    getErrorReports(limit = 20) {
        return this.errorReports.slice(-limit);
    }

    clearErrors() {
        this.errors = [];
        this.errorReports = [];
        this.retryAttempts.clear();
    }
}

// グローバルスコープで管理
let errorHandlerInstance = null;

window.createErrorHandler = function createErrorHandler() {
    if (!errorHandlerInstance) {
        errorHandlerInstance = new window.ErrorHandler();
    }
    return errorHandlerInstance;
};

// 自動初期化
if (!window.globalErrorHandler) {
    window.globalErrorHandler = window.createErrorHandler();
}