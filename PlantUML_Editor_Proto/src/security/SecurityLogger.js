/**
 * SecurityLogger.js
 * 
 * セキュリティログ機能
 * - ログレベル管理（DEBUG, INFO, WARN, ERROR, CRITICAL）
 * - ログ保存（LocalStorage/IndexedDB）
 * - ログローテーション（1000件上限）
 * - セキュリティイベント追跡
 * 
 * @version 1.0.0
 * @date 2025-08-15
 */

/**
 * セキュリティログレベル定義
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
};

/**
 * セキュリティイベントタイプ定義
 */
const SECURITY_EVENT_TYPES = {
    XSS_ATTEMPT: 'xss_attempt',
    INVALID_INPUT: 'invalid_input',
    CSP_VIOLATION: 'csp_violation',
    ERROR_OCCURRED: 'error_occurred',
    AUTH_EVENT: 'auth_event',
    PERMISSION_DENIED: 'permission_denied',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

/**
 * SecurityLogger - セキュリティログ管理クラス
 * 
 * 機能:
 * - 階層化されたログレベル管理
 * - 効率的なログ保存（IndexedDB優先、LocalStorage フォールバック）
 * - 自動ログローテーション
 * - セキュリティイベントの分類・追跡
 * - パフォーマンス最適化（バッチ処理、非同期処理）
 */
class SecurityLogger {
    constructor(options = {}) {
        // 設定
        this.logLevel = options.logLevel || LOG_LEVELS.INFO;
        this.maxLogs = options.maxLogs || 1000;
        this.batchSize = options.batchSize || 10;
        this.flushInterval = options.flushInterval || 5000; // 5秒
        
        // ログバッファ
        this.logBuffer = [];
        this.isFlushingLogs = false;
        
        // ストレージ管理
        this.useIndexedDB = this.isIndexedDBSupported();
        this.dbName = 'SecurityLogDB';
        this.dbVersion = 1;
        this.storeName = 'security_logs';
        
        // 統計情報
        this.stats = {
            totalLogs: 0,
            logsByLevel: Object.keys(LOG_LEVELS).reduce((acc, level) => ({ ...acc, [level]: 0 }), {}),
            logsByEventType: Object.keys(SECURITY_EVENT_TYPES).reduce((acc, type) => ({ ...acc, [type]: 0 }), {}),
            lastRotation: null
        };
        
        // 初期化
        this.initialize();
        
        console.log('[SecurityLogger] Initialized with configuration:', {
            logLevel: this.getLogLevelName(this.logLevel),
            maxLogs: this.maxLogs,
            useIndexedDB: this.useIndexedDB,
            batchSize: this.batchSize
        });
    }

    /**
     * 初期化処理
     */
    async initialize() {
        try {
            // IndexedDB初期化
            if (this.useIndexedDB) {
                await this.initializeIndexedDB();
            }
            
            // 既存ログの統計計算
            await this.calculateStats();
            
            // 定期フラッシュの開始
            this.startPeriodicFlush();
            
            // CSP違反監視の設定
            this.setupCSPViolationListener();
            
            // ページ終了時のクリーンアップ
            this.setupUnloadHandler();
            
        } catch (error) {
            console.error('[SecurityLogger] Initialization failed:', error);
            // フォールバックモードで動作継続
            this.useIndexedDB = false;
        }
    }

    /**
     * IndexedDBサポート確認
     */
    isIndexedDBSupported() {
        return typeof window !== 'undefined' && 
               'indexedDB' in window && 
               window.indexedDB !== null;
    }

    /**
     * IndexedDB初期化
     */
    initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('IndexedDB initialization failed'));
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // ログストア作成
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    // インデックス作成
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('level', 'level');
                    store.createIndex('eventType', 'eventType');
                }
            };
        });
    }

    /**
     * ログメソッド - レベル別
     */
    debug(message, eventType = null, metadata = {}) {
        this.log(LOG_LEVELS.DEBUG, message, eventType, metadata);
    }

    info(message, eventType = null, metadata = {}) {
        this.log(LOG_LEVELS.INFO, message, eventType, metadata);
    }

    warn(message, eventType = null, metadata = {}) {
        this.log(LOG_LEVELS.WARN, message, eventType, metadata);
    }

    error(message, eventType = null, metadata = {}) {
        this.log(LOG_LEVELS.ERROR, message, eventType, metadata);
    }

    critical(message, eventType = null, metadata = {}) {
        this.log(LOG_LEVELS.CRITICAL, message, eventType, metadata);
    }

    /**
     * セキュリティイベント専用ログメソッド
     */
    logSecurityEvent(eventType, message, metadata = {}) {
        const level = this.getSecurityEventLevel(eventType);
        this.log(level, message, eventType, {
            ...metadata,
            securityEvent: true,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * XSS攻撃試行ログ
     */
    logXSSAttempt(input, source, metadata = {}) {
        this.logSecurityEvent(SECURITY_EVENT_TYPES.XSS_ATTEMPT, 
            `XSS attack attempt detected from ${source}`, {
            input: this.sanitizeForLog(input),
            source,
            ...metadata
        });
    }

    /**
     * 不正入力検出ログ
     */
    logInvalidInput(input, fieldName, validationError, metadata = {}) {
        this.logSecurityEvent(SECURITY_EVENT_TYPES.INVALID_INPUT, 
            `Invalid input detected in field: ${fieldName}`, {
            input: this.sanitizeForLog(input),
            fieldName,
            validationError,
            ...metadata
        });
    }

    /**
     * CSP違反ログ
     */
    logCSPViolation(violationReport, metadata = {}) {
        this.logSecurityEvent(SECURITY_EVENT_TYPES.CSP_VIOLATION, 
            `CSP violation detected: ${violationReport['violated-directive']}`, {
            violatedDirective: violationReport['violated-directive'],
            blockedURI: violationReport['blocked-uri'],
            sourceFile: violationReport['source-file'],
            ...metadata
        });
    }

    /**
     * エラー発生ログ
     */
    logError(error, context = '', metadata = {}) {
        this.logSecurityEvent(SECURITY_EVENT_TYPES.ERROR_OCCURRED, 
            `Error occurred: ${error.message}`, {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            context,
            ...metadata
        });
    }

    /**
     * 認証・認可イベントログ
     */
    logAuthEvent(eventType, userId = null, metadata = {}) {
        this.logSecurityEvent(SECURITY_EVENT_TYPES.AUTH_EVENT, 
            `Authentication event: ${eventType}`, {
            authEventType: eventType,
            userId,
            ...metadata
        });
    }

    /**
     * メインログメソッド
     */
    log(level, message, eventType = null, metadata = {}) {
        // ログレベルフィルタ
        if (level < this.logLevel) {
            return;
        }

        const logEntry = {
            timestamp: Date.now(),
            dateString: new Date().toISOString(),
            level: level,
            levelName: this.getLogLevelName(level),
            message: message,
            eventType: eventType,
            metadata: metadata,
            sessionId: this.getSessionId(),
            sequence: this.stats.totalLogs++
        };

        // 統計更新
        this.updateStats(level, eventType);

        // バッファに追加
        this.logBuffer.push(logEntry);

        // コンソール出力
        this.outputToConsole(logEntry);

        // バッチサイズに達したら即座にフラッシュ
        if (this.logBuffer.length >= this.batchSize) {
            this.flushLogs();
        }
    }

    /**
     * ログレベル名取得
     */
    getLogLevelName(level) {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
    }

    /**
     * セキュリティイベントレベル判定
     */
    getSecurityEventLevel(eventType) {
        const criticalEvents = [SECURITY_EVENT_TYPES.XSS_ATTEMPT, SECURITY_EVENT_TYPES.CSP_VIOLATION];
        const errorEvents = [SECURITY_EVENT_TYPES.ERROR_OCCURRED, SECURITY_EVENT_TYPES.PERMISSION_DENIED];
        
        if (criticalEvents.includes(eventType)) return LOG_LEVELS.CRITICAL;
        if (errorEvents.includes(eventType)) return LOG_LEVELS.ERROR;
        return LOG_LEVELS.WARN;
    }

    /**
     * 統計情報更新
     */
    updateStats(level, eventType) {
        const levelName = this.getLogLevelName(level);
        this.stats.logsByLevel[levelName]++;
        
        if (eventType && this.stats.logsByEventType.hasOwnProperty(eventType)) {
            this.stats.logsByEventType[eventType]++;
        }
    }

    /**
     * コンソール出力
     */
    outputToConsole(logEntry) {
        const prefix = `[SecurityLogger:${logEntry.levelName}]`;
        const output = `${prefix} ${logEntry.message}`;
        
        switch (logEntry.level) {
            case LOG_LEVELS.DEBUG:
                console.debug(output, logEntry.metadata);
                break;
            case LOG_LEVELS.INFO:
                console.info(output, logEntry.metadata);
                break;
            case LOG_LEVELS.WARN:
                console.warn(output, logEntry.metadata);
                break;
            case LOG_LEVELS.ERROR:
            case LOG_LEVELS.CRITICAL:
                console.error(output, logEntry.metadata);
                break;
        }
    }

    /**
     * ログフラッシュ（永続化）
     */
    async flushLogs() {
        if (this.isFlushingLogs || this.logBuffer.length === 0) {
            return;
        }

        this.isFlushingLogs = true;
        const logsToFlush = [...this.logBuffer];
        this.logBuffer = [];

        try {
            if (this.useIndexedDB) {
                await this.saveToIndexedDB(logsToFlush);
            } else {
                await this.saveToLocalStorage(logsToFlush);
            }

            // ログローテーション確認
            await this.checkLogRotation();

        } catch (error) {
            console.error('[SecurityLogger] Failed to flush logs:', error);
            // フラッシュに失敗したログを戻す
            this.logBuffer.unshift(...logsToFlush);
        } finally {
            this.isFlushingLogs = false;
        }
    }

    /**
     * IndexedDBに保存
     */
    saveToIndexedDB(logs) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            logs.forEach(log => {
                store.add(log);
            });
        });
    }

    /**
     * LocalStorageに保存
     */
    async saveToLocalStorage(logs) {
        try {
            const existingLogs = this.getLogsFromLocalStorage();
            const updatedLogs = [...existingLogs, ...logs];
            
            // サイズ制限チェック
            const updatedLogsString = JSON.stringify(updatedLogs);
            if (updatedLogsString.length > 5 * 1024 * 1024) { // 5MB制限
                // 古いログを削除
                const reducedLogs = updatedLogs.slice(-this.maxLogs / 2);
                localStorage.setItem('security_logs', JSON.stringify(reducedLogs));
            } else {
                localStorage.setItem('security_logs', updatedLogsString);
            }
        } catch (error) {
            console.error('[SecurityLogger] LocalStorage save failed:', error);
            throw error;
        }
    }

    /**
     * LocalStorageからログ取得
     */
    getLogsFromLocalStorage() {
        try {
            const logs = localStorage.getItem('security_logs');
            return logs ? JSON.parse(logs) : [];
        } catch (error) {
            console.error('[SecurityLogger] LocalStorage read failed:', error);
            return [];
        }
    }

    /**
     * ログローテーション確認
     */
    async checkLogRotation() {
        const currentLogCount = await this.getLogCount();
        
        if (currentLogCount > this.maxLogs) {
            await this.rotatelogs();
            this.stats.lastRotation = new Date().toISOString();
        }
    }

    /**
     * ログ数取得
     */
    async getLogCount() {
        if (this.useIndexedDB) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.count();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } else {
            return this.getLogsFromLocalStorage().length;
        }
    }

    /**
     * ログローテーション実行
     */
    async rotateLog() {
        const logsToKeep = Math.floor(this.maxLogs * 0.8); // 80%残す
        
        if (this.useIndexedDB) {
            await this.rotateIndexedDBLogs(logsToKeep);
        } else {
            await this.rotateLocalStorageLogs(logsToKeep);
        }
    }

    /**
     * IndexedDBログローテーション
     */
    rotateIndexedDBLogs(logsToKeep) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            const request = index.openCursor();
            
            let deleteCount = 0;
            const maxDelete = Math.floor(this.maxLogs * 0.2);
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && deleteCount < maxDelete) {
                    cursor.delete();
                    deleteCount++;
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * LocalStorageログローテーション
     */
    async rotateLocalStorageLogs(logsToKeep) {
        const logs = this.getLogsFromLocalStorage();
        const rotatedLogs = logs.slice(-logsToKeep);
        localStorage.setItem('security_logs', JSON.stringify(rotatedLogs));
    }

    /**
     * ログ検索
     */
    async searchLogs(criteria = {}) {
        if (this.useIndexedDB) {
            return await this.searchIndexedDBLogs(criteria);
        } else {
            return this.searchLocalStorageLogs(criteria);
        }
    }

    /**
     * IndexedDBログ検索
     */
    searchIndexedDBLogs(criteria) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const logs = request.result;
                const filteredLogs = this.filterLogs(logs, criteria);
                resolve(filteredLogs);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * LocalStorageログ検索
     */
    searchLocalStorageLogs(criteria) {
        const logs = this.getLogsFromLocalStorage();
        return this.filterLogs(logs, criteria);
    }

    /**
     * ログフィルタ処理
     */
    filterLogs(logs, criteria) {
        return logs.filter(log => {
            // レベルフィルタ
            if (criteria.level !== undefined && log.level !== criteria.level) {
                return false;
            }
            
            // イベントタイプフィルタ
            if (criteria.eventType && log.eventType !== criteria.eventType) {
                return false;
            }
            
            // 時間範囲フィルタ
            if (criteria.startTime && log.timestamp < criteria.startTime) {
                return false;
            }
            if (criteria.endTime && log.timestamp > criteria.endTime) {
                return false;
            }
            
            // メッセージ検索
            if (criteria.searchText && !log.message.toLowerCase().includes(criteria.searchText.toLowerCase())) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * ログエクスポート
     */
    async exportLogs(format = 'json') {
        const logs = await this.searchLogs();
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(logs, null, 2);
            case 'csv':
                return this.convertToCSV(logs);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * CSV変換
     */
    convertToCSV(logs) {
        if (logs.length === 0) return '';
        
        const headers = ['timestamp', 'dateString', 'levelName', 'message', 'eventType'];
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const row = headers.map(header => {
                let value = log[header] || '';
                // CSVエスケープ処理
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    /**
     * 統計情報計算
     */
    async calculateStats() {
        const logs = await this.searchLogs();
        
        // 統計リセット
        this.stats.totalLogs = logs.length;
        Object.keys(this.stats.logsByLevel).forEach(level => {
            this.stats.logsByLevel[level] = 0;
        });
        Object.keys(this.stats.logsByEventType).forEach(type => {
            this.stats.logsByEventType[type] = 0;
        });
        
        // 統計計算
        logs.forEach(log => {
            this.stats.logsByLevel[log.levelName]++;
            if (log.eventType && this.stats.logsByEventType.hasOwnProperty(log.eventType)) {
                this.stats.logsByEventType[log.eventType]++;
            }
        });
    }

    /**
     * 定期フラッシュ開始
     */
    startPeriodicFlush() {
        this.flushTimer = setInterval(() => {
            this.flushLogs();
        }, this.flushInterval);
    }

    /**
     * 定期フラッシュ停止
     */
    stopPeriodicFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * CSP違反リスナー設定
     */
    setupCSPViolationListener() {
        document.addEventListener('securitypolicyviolation', (event) => {
            this.logCSPViolation({
                'violated-directive': event.violatedDirective,
                'blocked-uri': event.blockedURI,
                'source-file': event.sourceFile,
                'line-number': event.lineNumber,
                'column-number': event.columnNumber
            });
        });
    }

    /**
     * ページ終了時ハンドラー
     */
    setupUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            // 残りのログをフラッシュ
            if (this.logBuffer.length > 0) {
                // 同期的に実行（beforeunloadでは非同期処理は保証されない）
                try {
                    const logs = JSON.stringify(this.logBuffer);
                    localStorage.setItem('security_logs_pending', logs);
                } catch (error) {
                    console.error('[SecurityLogger] Failed to save pending logs:', error);
                }
            }
        });
        
        // ページ読み込み時に未処理ログを復元
        window.addEventListener('load', () => {
            try {
                const pendingLogs = localStorage.getItem('security_logs_pending');
                if (pendingLogs) {
                    const logs = JSON.parse(pendingLogs);
                    this.logBuffer.unshift(...logs);
                    localStorage.removeItem('security_logs_pending');
                    this.flushLogs();
                }
            } catch (error) {
                console.error('[SecurityLogger] Failed to restore pending logs:', error);
            }
        });
    }

    /**
     * セッションID取得
     */
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.sessionId;
    }

    /**
     * ログ出力用サニタイズ
     */
    sanitizeForLog(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        // 潜在的に危険な文字列を削除/エスケープ
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .substring(0, 1000); // 長さ制限
    }

    /**
     * 統計情報取得
     */
    getStats() {
        return {
            ...this.stats,
            bufferSize: this.logBuffer.length,
            isFlushingLogs: this.isFlushingLogs,
            storageType: this.useIndexedDB ? 'IndexedDB' : 'LocalStorage'
        };
    }

    /**
     * ログレベル設定
     */
    setLogLevel(level) {
        if (typeof level === 'string') {
            level = LOG_LEVELS[level.toUpperCase()];
        }
        
        if (level !== undefined && level >= 0 && level <= 4) {
            this.logLevel = level;
            this.info(`Log level changed to: ${this.getLogLevelName(level)}`);
        } else {
            throw new Error('Invalid log level');
        }
    }

    /**
     * クリーンアップ
     */
    async cleanup() {
        // 定期フラッシュ停止
        this.stopPeriodicFlush();
        
        // 残りのログをフラッシュ
        await this.flushLogs();
        
        // IndexedDB接続クローズ
        if (this.db) {
            this.db.close();
        }
        
        console.log('[SecurityLogger] Cleanup completed');
    }
}

// グローバル公開
if (typeof window !== 'undefined') {
    window.SecurityLogger = SecurityLogger;
    window.LOG_LEVELS = LOG_LEVELS;
    window.SECURITY_EVENT_TYPES = SECURITY_EVENT_TYPES;
}

// ES6モジュールエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecurityLogger,
        LOG_LEVELS,
        SECURITY_EVENT_TYPES
    };
}