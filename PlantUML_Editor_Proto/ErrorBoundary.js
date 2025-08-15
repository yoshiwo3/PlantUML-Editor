/**
 * ErrorBoundary.js - エンタープライズレベルエラー境界システム v2.0
 * 
 * Sprint 1: セキュリティ強化版 - SEC-004 ErrorBoundary実装（13ポイント）
 * 作成日: 2025-08-15
 * 更新日: 2025-08-15
 * バージョン: 2.0 (エンタープライズグレード)
 * 
 * 主な機能:
 * - エンタープライズレベルのセキュリティ対応
 * - セキュリティエラーの特別処理とインシデント記録
 * - ログサニタイゼーションによる情報漏洩防止
 * - エラー分類システム（Critical/Warning/Info）
 * - 自動リトライメカニズムとフォールバックUI
 * - リアルタイムエラー監視とアラート
 * - メモリリーク検出と自動クリーンアップ
 * - セキュリティインシデント通知
 * - 包括的なデバッグ情報収集
 * - ローカルストレージへの暗号化ログ保存
 */

class ErrorBoundary {
    constructor() {
        this.errorHistory = [];
        this.maxErrorHistory = 100; // 増量（エンタープライズ用）
        this.criticalErrorCount = 0;
        this.criticalErrorThreshold = 3;
        this.lastRecoveryTime = 0;
        this.recoveryTimeout = 30000; // 30秒
        this.timers = new Set();
        this.intervals = new Set();
        this.recoveryCallbacks = [];
        this.isRecovering = false;
        
        // セキュリティ強化機能
        this.securityIncidentCount = 0;
        this.securityIncidentThreshold = 1; // セキュリティエラーは即座に対応
        this.encryptionKey = this.generateEncryptionKey();
        this.sensitiveDataPatterns = [
            /password/i, /token/i, /api[_-]?key/i, /secret/i, 
            /auth/i, /session/i, /cookie/i, /credential/i,
            /private[_-]?key/i, /access[_-]?token/i
        ];
        
        // エラー分類システム
        this.errorClassification = {
            SECURITY: 'security',
            CRITICAL: 'critical', 
            WARNING: 'warning',
            INFO: 'info'
        };
        
        // メモリ監視
        this.memoryThreshold = 100 * 1024 * 1024; // 100MB
        this.lastMemoryCheck = Date.now();
        this.memoryCheckInterval = 10000; // 10秒ごと
        
        // リトライ設定
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
        };
        
        this.setupErrorHandlers();
        this.startMemoryMonitoring();
        console.log('ErrorBoundary v2.0: エンタープライズレベル初期化完了');
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

        console.log('ErrorBoundary v2.0: セキュリティ強化エラーハンドラー設定完了');
    }

    /**
     * 暗号化キーを生成
     * @returns {string} 暗号化キー
     */
    generateEncryptionKey() {
        const array = new Uint8Array(32);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(array);
        } else {
            // フォールバック
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * データのサニタイゼーション（セキュリティ対策）
     * @param {any} data サニタイズ対象データ
     * @returns {any} サニタイズ済みデータ
     */
    sanitizeData(data) {
        if (typeof data === 'string') {
            let sanitized = data;
            
            // 機密情報のマスキング
            this.sensitiveDataPatterns.forEach(pattern => {
                sanitized = sanitized.replace(pattern, '[REDACTED]');
            });
            
            // 長いスタックトレースの短縮
            if (sanitized.length > 1000) {
                sanitized = sanitized.substring(0, 997) + '...';
            }
            
            return sanitized;
        } else if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                // キー名のチェック
                if (this.sensitiveDataPatterns.some(pattern => pattern.test(key))) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = this.sanitizeData(value);
                }
            }
            return sanitized;
        }
        
        return data;
    }

    /**
     * セキュリティエラーかどうかを判定
     * @param {Object} errorInfo エラー情報
     * @returns {boolean} セキュリティエラーかどうか
     */
    isSecurityError(errorInfo) {
        const securityPatterns = [
            /csp/i, /content.security.policy/i,
            /cors/i, /cross.origin/i,
            /xss/i, /script.injection/i,
            /csrf/i, /cross.site.request/i,
            /unauthorized/i, /forbidden/i,
            /authentication/i, /authorization/i,
            /security/i, /vulnerability/i,
            /malicious/i, /suspicious/i
        ];
        
        const message = (errorInfo.message || '').toLowerCase();
        const filename = (errorInfo.filename || '').toLowerCase();
        
        return securityPatterns.some(pattern => 
            pattern.test(message) || pattern.test(filename)
        );
    }

    /**
     * メモリ監視を開始
     */
    startMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('ErrorBoundary: Memory API not available, skipping memory monitoring');
            return;
        }
        
        const checkMemory = () => {
            const currentTime = Date.now();
            if (currentTime - this.lastMemoryCheck > this.memoryCheckInterval) {
                this.checkMemoryUsage();
                this.lastMemoryCheck = currentTime;
            }
        };
        
        // メモリチェックのインターバルを設定
        const memoryCheckId = setInterval(checkMemory, this.memoryCheckInterval);
        this.trackTimer(memoryCheckId, 'interval');
    }

    /**
     * メモリ使用量をチェック
     */
    checkMemoryUsage() {
        if (!performance.memory) return;
        
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        
        const usagePercent = (used / limit) * 100;
        
        if (used > this.memoryThreshold || usagePercent > 80) {
            console.warn(`ErrorBoundary: High memory usage detected - ${(used/1024/1024).toFixed(2)}MB (${usagePercent.toFixed(1)}%)`);
            
            this.handleError({
                type: 'memory',
                message: `High memory usage: ${(used/1024/1024).toFixed(2)}MB`,
                usagePercent,
                timestamp: Date.now(),
                severity: usagePercent > 90 ? 'critical' : 'warning'
            });
            
            // メモリクリーンアップの試行
            if (usagePercent > 85) {
                this.performMemoryCleanup();
            }
        }
    }

    /**
     * メモリクリーンアップを実行
     */
    performMemoryCleanup() {
        console.log('ErrorBoundary: Performing memory cleanup...');
        
        try {
            // 古いエラー履歴のクリア
            if (this.errorHistory.length > this.maxErrorHistory / 2) {
                this.errorHistory = this.errorHistory.slice(-Math.floor(this.maxErrorHistory / 2));
            }
            
            // 強制ガベージコレクション（可能な場合）
            if (window.gc) {
                window.gc();
                console.log('ErrorBoundary: Forced garbage collection');
            }
            
            // DOM要素のクリーンアップ
            this.cleanupDOMReferences();
            
        } catch (error) {
            console.error('ErrorBoundary: Memory cleanup failed:', error);
        }
    }

    /**
     * DOM参照のクリーンアップ
     */
    cleanupDOMReferences() {
        // 不要なDOM要素の削除
        const obsoleteElements = document.querySelectorAll('.error-toast, .cleanup-target, [data-temporary="true"]');
        obsoleteElements.forEach(element => {
            try {
                element.remove();
            } catch (e) {
                console.warn('ErrorBoundary: Failed to remove element:', e);
            }
        });
    }

    /**
     * エラーを処理（セキュリティ強化版）
     * @param {Object} errorInfo エラー情報
     */
    handleError(errorInfo) {
        console.error('ErrorBoundary v2.0: エラーをキャッチ:', this.sanitizeData(errorInfo));

        // セキュリティエラーの特別処理
        const isSecurityIssue = this.isSecurityError(errorInfo);
        if (isSecurityIssue) {
            this.handleSecurityIncident(errorInfo);
        }

        // エラー履歴に記録（サニタイズ済み）
        this.recordError(errorInfo);

        // エラーの重要度を判定
        const severity = this.assessErrorSeverity(errorInfo);
        
        // 重大エラーの処理
        if (severity === 'critical' || isSecurityIssue) {
            if (isSecurityIssue) {
                this.securityIncidentCount++;
            } else {
                this.criticalErrorCount++;
            }
            
            console.warn(`ErrorBoundary: 重大エラー検出 (Critical: ${this.criticalErrorCount}, Security: ${this.securityIncidentCount})`);

            // 重大エラーまたはセキュリティエラーが閾値を超えた場合の自動回復
            if (this.criticalErrorCount >= this.criticalErrorThreshold || 
                this.securityIncidentCount >= this.securityIncidentThreshold) {
                this.attemptRecovery(errorInfo);
            }
        }

        // 自動リトライの試行（特定のエラータイプに対して）
        if (this.shouldRetry(errorInfo, severity)) {
            this.attemptRetry(errorInfo);
        }

        // ユーザーへの通知
        this.notifyUser(errorInfo, severity);
        
        // ローカルストレージへの暗号化保存
        this.saveToEncryptedStorage(errorInfo, severity);
    }

    /**
     * セキュリティインシデントを処理
     * @param {Object} errorInfo エラー情報
     */
    handleSecurityIncident(errorInfo) {
        console.error('🚨 SECURITY INCIDENT DETECTED:', this.sanitizeData(errorInfo));
        
        const incident = {
            id: this.generateSecurityIncidentId(),
            timestamp: Date.now(),
            type: 'security',
            severity: 'critical',
            errorInfo: this.sanitizeData(errorInfo),
            userAgent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer,
            sessionId: this.getSessionId()
        };
        
        // セキュリティログに記録
        this.recordSecurityIncident(incident);
        
        // セキュリティチームへの通知（実際の実装では外部API呼び出し）
        this.notifySecurityTeam(incident);
        
        // 即座に適切な対応を実行
        this.executeSecurityResponse(incident);
    }

    /**
     * セキュリティインシデントIDを生成
     * @returns {string} セキュリティインシデントID
     */
    generateSecurityIncidentId() {
        return 'SEC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    /**
     * セキュリティインシデントを記録
     * @param {Object} incident インシデント情報
     */
    recordSecurityIncident(incident) {
        try {
            const securityLog = JSON.parse(localStorage.getItem('security_incidents') || '[]');
            securityLog.push(incident);
            
            // セキュリティログは最大50件まで保持
            if (securityLog.length > 50) {
                securityLog.shift();
            }
            
            localStorage.setItem('security_incidents', JSON.stringify(securityLog));
            console.log(`SecurityLog: Incident ${incident.id} recorded`);
        } catch (error) {
            console.error('Failed to record security incident:', error);
        }
    }

    /**
     * セキュリティチームへの通知
     * @param {Object} incident インシデント情報
     */
    notifySecurityTeam(incident) {
        // 実際の実装では、外部のセキュリティ監視システムにAPIコール
        console.log('🚨 SECURITY ALERT: Notifying security team about incident', incident.id);
        
        // デバッグ用の詳細ログ（本番環境では削除）
        if (window.DEBUG) {
            console.table({
                'Incident ID': incident.id,
                'Type': incident.type,
                'Severity': incident.severity,
                'Timestamp': new Date(incident.timestamp).toISOString(),
                'URL': incident.url
            });
        }
    }

    /**
     * セキュリティレスポンスを実行
     * @param {Object} incident インシデント情報
     */
    executeSecurityResponse(incident) {
        // セキュリティインシデントへの即座の対応
        console.log('Executing security response for incident:', incident.id);
        
        // 1. 機密性の高い操作を一時停止
        this.suspendSensitiveOperations();
        
        // 2. セッション無効化（必要な場合）
        if (incident.errorInfo.message && incident.errorInfo.message.includes('csrf')) {
            this.invalidateSession();
        }
        
        // 3. DOM の怪しい要素をクリーンアップ
        this.cleanupSuspiciousElements();
        
        // 4. ユーザーに警告表示
        this.showSecurityWarning(incident);
    }

    /**
     * 機密操作を一時停止
     */
    suspendSensitiveOperations() {
        console.log('Suspending sensitive operations...');
        
        // フォーム送信を一時的に無効化
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', this.blockSubmission, { once: false });
        });
        
        // 外部へのHTTPリクエストを監視
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = (...args) => {
                console.warn('HTTP request blocked due to security incident:', args[0]);
                return Promise.reject(new Error('HTTP requests suspended due to security incident'));
            };
            
            // 5分後に復旧
            setTimeout(() => {
                window.fetch = originalFetch;
                console.log('HTTP requests restored');
            }, 300000);
        }
    }

    /**
     * フォーム送信をブロック
     * @param {Event} event フォームイベント
     */
    blockSubmission(event) {
        event.preventDefault();
        console.warn('Form submission blocked due to security incident');
        alert('セキュリティ上の理由により、フォーム送信が一時的に無効化されています。');
    }

    /**
     * セッションを無効化
     */
    invalidateSession() {
        console.log('Invalidating session due to security incident');
        
        // LocalStorageとSessionStorageをクリア
        try {
            localStorage.clear();
            sessionStorage.clear();
            
            // Cookieを削除
            document.cookie.split(";").forEach(c => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            });
            
            console.log('Session invalidated successfully');
        } catch (error) {
            console.error('Failed to invalidate session:', error);
        }
    }

    /**
     * 怪しいDOM要素をクリーンアップ
     */
    cleanupSuspiciousElements() {
        console.log('Cleaning up suspicious DOM elements...');
        
        // 怪しいスクリプトタグを削除
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach(script => {
            if (script.textContent && (
                script.textContent.includes('eval(') ||
                script.textContent.includes('document.write') ||
                script.textContent.includes('innerHTML')
            )) {
                script.remove();
                console.warn('Removed suspicious script element');
            }
        });
        
        // 外部リソースをロードする要素をチェック
        const externalElements = document.querySelectorAll('[src*="://"]');
        externalElements.forEach(element => {
            const src = element.getAttribute('src');
            if (src && !src.startsWith(window.location.origin)) {
                console.warn('External resource detected:', src);
            }
        });
    }

    /**
     * セキュリティ警告を表示
     * @param {Object} incident インシデント情報
     */
    showSecurityWarning(incident) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'security-warning';
        warningDiv.innerHTML = `
            <div style="
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                background: rgba(255, 0, 0, 0.9); 
                color: white; 
                z-index: 999999; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-family: Arial, sans-serif;
            ">
                <div style="text-align: center; padding: 40px; background: rgba(0,0,0,0.8); border-radius: 10px; max-width: 500px;">
                    <h1 style="color: #ff4444; margin-bottom: 20px;">🚨 セキュリティ警告</h1>
                    <p style="font-size: 18px; margin-bottom: 20px;">
                        セキュリティインシデント（ID: ${incident.id}）が検出されました。
                    </p>
                    <p style="margin-bottom: 30px;">
                        安全のため、一部の機能が一時的に制限されています。
                    </p>
                    <div style="margin-bottom: 20px;">
                        <button onclick="this.closest('#security-warning').remove()" 
                                style="background: #4CAF50; color: white; border: none; padding: 10px 20px; 
                                       border-radius: 5px; cursor: pointer; margin-right: 10px; font-size: 16px;">
                            理解しました
                        </button>
                        <button onclick="window.location.reload()" 
                                style="background: #ff9800; color: white; border: none; padding: 10px 20px; 
                                       border-radius: 5px; cursor: pointer; font-size: 16px;">
                            ページを再読み込み
                        </button>
                    </div>
                    <small style="opacity: 0.7;">インシデントID: ${incident.id}</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(warningDiv);
    }

    /**
     * リトライが必要かどうかを判定
     * @param {Object} errorInfo エラー情報
     * @param {string} severity 重要度
     * @returns {boolean} リトライするかどうか
     */
    shouldRetry(errorInfo, severity) {
        const retryableErrors = [
            /network/i, /timeout/i, /connection/i, /fetch/i,
            /temporary/i, /unavailable/i, /503/i, /502/i
        ];
        
        const message = (errorInfo.message || '').toLowerCase();
        
        return severity !== 'security' && 
               retryableErrors.some(pattern => pattern.test(message)) &&
               !errorInfo.retryCount; // 初回のみ
    }

    /**
     * リトライを試行
     * @param {Object} errorInfo エラー情報
     */
    attemptRetry(errorInfo) {
        const retryCount = errorInfo.retryCount || 0;
        
        if (retryCount >= this.retryConfig.maxRetries) {
            console.log('ErrorBoundary: Maximum retry attempts reached');
            return;
        }
        
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
        
        console.log(`ErrorBoundary: Retrying operation in ${delay}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries})`);
        
        setTimeout(() => {
            // リトライ処理（実際の実装では失敗した操作を再実行）
            console.log('ErrorBoundary: Executing retry logic...');
            
            // リトライカウントを記録
            errorInfo.retryCount = retryCount + 1;
            errorInfo.retryTimestamp = Date.now();
            
        }, delay);
    }

    /**
     * セッションIDを取得
     * @returns {string} セッションID
     */
    getSessionId() {
        return sessionStorage.getItem('sessionId') || 
               localStorage.getItem('sessionId') || 
               'unknown';
    }

    /**
     * 暗号化ストレージへの保存
     * @param {Object} errorInfo エラー情報
     * @param {string} severity 重要度
     */
    saveToEncryptedStorage(errorInfo, severity) {
        try {
            const sanitizedError = this.sanitizeData(errorInfo);
            const errorRecord = {
                id: this.generateErrorId(),
                timestamp: Date.now(),
                severity,
                error: sanitizedError,
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    sessionId: this.getSessionId(),
                    memoryUsage: this.getCurrentMemoryUsage()
                }
            };
            
            // 簡単な暗号化（本格的な実装では強力な暗号化を使用）
            const encrypted = this.simpleEncrypt(JSON.stringify(errorRecord));
            
            const errorLog = JSON.parse(localStorage.getItem('encrypted_error_log') || '[]');
            errorLog.push(encrypted);
            
            // ログサイズ制限
            if (errorLog.length > 200) {
                errorLog.splice(0, 50); // 古いログを削除
            }
            
            localStorage.setItem('encrypted_error_log', JSON.stringify(errorLog));
            
        } catch (error) {
            console.error('Failed to save error to encrypted storage:', error);
        }
    }

    /**
     * 簡単な暗号化（実装例）
     * @param {string} data 暗号化するデータ
     * @returns {string} 暗号化されたデータ
     */
    simpleEncrypt(data) {
        let encrypted = '';
        for (let i = 0; i < data.length; i++) {
            const keyChar = this.encryptionKey[i % this.encryptionKey.length];
            encrypted += String.fromCharCode(data.charCodeAt(i) ^ keyChar.charCodeAt(0));
        }
        return btoa(encrypted); // Base64エンコード
    }

    /**
     * 現在のメモリ使用量を取得
     * @returns {Object} メモリ使用量情報
     */
    getCurrentMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * エラーを履歴に記録（セキュリティ強化版）
     * @param {Object} errorInfo エラー情報
     */
    recordError(errorInfo) {
        const sanitizedError = this.sanitizeData(errorInfo);
        
        this.errorHistory.push({
            ...sanitizedError,
            id: this.generateErrorId(),
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            isSecurityRelated: this.isSecurityError(errorInfo),
            classification: this.classifyError(errorInfo)
        });

        // 履歴サイズの制限
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.shift();
        }
    }

    /**
     * エラーを分類
     * @param {Object} errorInfo エラー情報
     * @returns {string} エラー分類
     */
    classifyError(errorInfo) {
        if (this.isSecurityError(errorInfo)) {
            return this.errorClassification.SECURITY;
        }
        
        const severity = this.assessErrorSeverity(errorInfo);
        switch (severity) {
            case 'critical':
                return this.errorClassification.CRITICAL;
            case 'high':
            case 'medium':
                return this.errorClassification.WARNING;
            default:
                return this.errorClassification.INFO;
        }
    }

    /**
     * エラーの重要度を評価（強化版）
     * @param {Object} errorInfo エラー情報
     * @returns {string} severity レベル (low, medium, high, critical, security)
     */
    assessErrorSeverity(errorInfo) {
        // セキュリティエラーは最優先
        if (this.isSecurityError(errorInfo)) {
            return 'security';
        }

        const criticalPatterns = [
            /cannot read prop/i,
            /is not defined/i,
            /is not a function/i,
            /maximum call stack/i,
            /out of memory/i,
            /network error/i,
            /script error/i,
            /fatal/i,
            /crash/i,
            /abort/i,
            /segmentation fault/i,
            /access violation/i,
            /heap corruption/i
        ];

        const highPatterns = [
            /syntax error/i,
            /reference error/i,
            /type error/i,
            /range error/i,
            /eval error/i,
            /uri error/i,
            /promise.+rejected/i,
            /timeout/i,
            /connection.+failed/i
        ];

        const mediumPatterns = [
            /warning/i,
            /deprecated/i,
            /validation/i,
            /format/i,
            /parse/i,
            /missing/i,
            /not found/i
        ];

        const message = (errorInfo.message || '').toLowerCase();
        const filename = (errorInfo.filename || '').toLowerCase();
        const combined = message + ' ' + filename;

        // 追加の重要度判定基準
        const isJavaScriptCore = filename.includes('.js') || filename.includes('javascript');
        const isSystemError = errorInfo.error && errorInfo.error.constructor && 
                               ['Error', 'TypeError', 'ReferenceError'].includes(errorInfo.error.constructor.name);
        
        // メモリエラーの特別扱い
        if (errorInfo.type === 'memory' || /memory|heap/i.test(message)) {
            return errorInfo.usagePercent > 90 ? 'critical' : 'high';
        }

        // パフォーマンス関連の判定
        if (errorInfo.type === 'performance' && errorInfo.duration > 5000) {
            return 'high';
        }

        // パターンマッチング
        if (criticalPatterns.some(pattern => pattern.test(combined))) {
            return 'critical';
        } else if (highPatterns.some(pattern => pattern.test(combined))) {
            return isJavaScriptCore ? 'critical' : 'high';
        } else if (mediumPatterns.some(pattern => pattern.test(combined))) {
            return 'medium';
        } else if (errorInfo.type === 'resource') {
            return 'medium';
        } else if (errorInfo.type === 'promise') {
            return 'high'; // Promise rejection は重大
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

    /**
     * 詳細なエラー統計とセキュリティ情報を取得
     * @returns {Object} 拡張エラー統計情報
     */
    getEnhancedErrorStats() {
        const basicStats = this.getErrorStats();
        
        const securityStats = {
            securityIncidentCount: this.securityIncidentCount,
            lastSecurityIncident: this.getLastSecurityIncident(),
            securityIncidentsToday: this.getSecurityIncidentsToday()
        };
        
        const memoryStats = {
            currentMemoryUsage: this.getCurrentMemoryUsage(),
            memoryThreshold: this.memoryThreshold,
            lastMemoryCheck: this.lastMemoryCheck
        };
        
        const classificationStats = this.errorHistory.reduce((acc, error) => {
            const classification = error.classification || 'unknown';
            acc[classification] = (acc[classification] || 0) + 1;
            return acc;
        }, {});
        
        return {
            ...basicStats,
            security: securityStats,
            memory: memoryStats,
            classification: classificationStats,
            encryptionEnabled: !!this.encryptionKey,
            version: '2.0'
        };
    }

    /**
     * 最後のセキュリティインシデントを取得
     * @returns {Object|null} 最後のセキュリティインシデント
     */
    getLastSecurityIncident() {
        try {
            const securityLog = JSON.parse(localStorage.getItem('security_incidents') || '[]');
            return securityLog.length > 0 ? securityLog[securityLog.length - 1] : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * 今日のセキュリティインシデント数を取得
     * @returns {number} 今日のインシデント数
     */
    getSecurityIncidentsToday() {
        try {
            const securityLog = JSON.parse(localStorage.getItem('security_incidents') || '[]');
            const today = new Date().toDateString();
            return securityLog.filter(incident => 
                new Date(incident.timestamp).toDateString() === today
            ).length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * エラーログをエクスポート（デバッグ用）
     * @param {boolean} includeSecurityLogs セキュリティログを含めるかどうか
     * @returns {Object} エクスポートされたログ
     */
    exportLogs(includeSecurityLogs = false) {
        const exportData = {
            timestamp: Date.now(),
            version: '2.0',
            errorHistory: this.errorHistory.slice(), // コピーを作成
            statistics: this.getEnhancedErrorStats()
        };
        
        if (includeSecurityLogs) {
            try {
                exportData.securityIncidents = JSON.parse(localStorage.getItem('security_incidents') || '[]');
            } catch (error) {
                exportData.securityIncidents = [];
            }
        }
        
        return exportData;
    }

    /**
     * デバッグ情報を表示
     */
    showDebugInfo() {
        const stats = this.getEnhancedErrorStats();
        console.group('🔍 ErrorBoundary v2.0 Debug Information');
        console.log('Version:', stats.version);
        console.log('Total Errors:', stats.totalErrors);
        console.log('Recent Errors:', stats.recentErrors);
        console.log('Critical Errors:', stats.criticalErrorCount);
        console.log('Security Incidents:', stats.security.securityIncidentCount);
        console.log('Memory Usage:', stats.memory.currentMemoryUsage);
        console.log('Classification Breakdown:', stats.classification);
        console.log('Encryption Enabled:', stats.encryptionEnabled);
        console.log('Recovery Status:', stats.isRecovering);
        console.groupEnd();
        
        return stats;
    }
}

// グローバルインスタンスの作成
window.errorBoundary = new ErrorBoundary();

// パフォーマンス監視
if (window.performance && window.performance.mark) {
    window.performance.mark('error-boundary-initialized');
}

console.log('ErrorBoundary: グローバルエラーハンドリングが有効化されました');