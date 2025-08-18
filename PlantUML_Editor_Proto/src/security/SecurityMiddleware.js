/**
 * PlantUMLエディター セキュリティ統合システム
 * セキュリティミドルウェア - SEC-006対応
 * 
 * 機能:
 * - 全セキュリティ機能の統合管理
 * - リアルタイム脅威検知
 * - セキュリティポリシー適用
 * - インシデント記録・報告
 * - パフォーマンス監視
 */

// セキュリティコンポーネントのインポート
import CommandInjectionProtector from './CommandInjectionProtector.js';
import SQLInjectionProtector from './SQLInjectionProtector.js';
import InputValidator from './InputValidator.js';
import OutputEscaper from './OutputEscaper.js';

/**
 * セキュリティミドルウェア統合クラス
 */
class SecurityMiddleware {
    constructor(config = {}) {
        this.config = {
            // 基本設定
            enableRealTimeProtection: config.enableRealTimeProtection !== false,
            enableThreatLogging: config.enableThreatLogging !== false,
            enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
            
            // セキュリティレベル設定
            securityLevel: config.securityLevel || 'high', // 'low', 'medium', 'high', 'maximum'
            strictMode: config.strictMode || false,
            quarantineMode: config.quarantineMode || false,
            
            // 閾値設定
            maxProcessingTime: config.maxProcessingTime || 5000, // 5秒
            maxThreatScore: config.maxThreatScore || 75,
            alertThreshold: config.alertThreshold || 85,
            
            // ロギング設定
            logLevel: config.logLevel || 'warn', // 'debug', 'info', 'warn', 'error'
            maxLogEntries: config.maxLogEntries || 10000,
            enableDetailedLogging: config.enableDetailedLogging || false,
            
            ...config
        };

        // セキュリティコンポーネントの初期化
        this.commandProtector = new CommandInjectionProtector({
            strictSandboxMode: this.config.securityLevel === 'maximum',
            quarantineMode: this.config.quarantineMode
        });

        this.sqlProtector = new SQLInjectionProtector({
            strictMode: this.config.strictMode,
            enableDangerousPatternDetection: true
        });

        this.inputValidator = new InputValidator({
            strictMode: this.config.strictMode,
            enableRealTimeValidation: this.config.enableRealTimeProtection
        });

        this.outputEscaper = new OutputEscaper({
            strictMode: this.config.strictMode,
            autoDetectContext: true
        });

        // 内部状態管理
        this.threatLog = [];
        this.performanceMetrics = [];
        this.securityIncidents = [];
        this.lastThreatCheck = null;

        // イベントハンドラー
        this.eventHandlers = new Map();

        this.initializeMiddleware();
    }

    /**
     * ミドルウェア初期化
     */
    initializeMiddleware() {
        console.log('[SecurityMiddleware] セキュリティミドルウェア初期化中...');
        
        // パフォーマンス監視開始
        if (this.config.enablePerformanceMonitoring) {
            this.startPerformanceMonitoring();
        }

        // リアルタイム保護開始
        if (this.config.enableRealTimeProtection) {
            this.startRealTimeProtection();
        }

        console.log('[SecurityMiddleware] セキュリティミドルウェア初期化完了');
    }

    /**
     * 包括的セキュリティ処理
     * @param {string} input - 処理対象の入力
     * @param {string} inputType - 入力タイプ ('plantuml', 'actor', 'action', 'query', 'command')
     * @param {string} outputContext - 出力コンテキスト ('html', 'js', 'css', 'url', 'xml')
     * @returns {Object} セキュリティ処理結果
     */
    async processSecurely(input, inputType = 'general', outputContext = 'auto') {
        const startTime = performance.now();
        
        const result = {
            // 処理結果
            processedInput: input,
            processedOutput: null,
            isSecure: true,
            
            // セキュリティ評価
            threatScore: 0,
            securityLevel: 'safe',
            riskFactors: [],
            
            // 各コンポーネントの結果
            validationResult: null,
            commandCheckResult: null,
            sqlCheckResult: null,
            escapeResult: null,
            
            // メタデータ
            processingTime: 0,
            timestamp: new Date().toISOString(),
            inputType: inputType,
            outputContext: outputContext,
            
            // 警告とエラー
            warnings: [],
            errors: [],
            recommendations: []
        };

        try {
            // 1. 入力検証フェーズ
            result.validationResult = this.inputValidator.validate(input, inputType);
            this.mergeResults(result, result.validationResult);

            // 2. コマンドインジェクション検査
            if (this.shouldCheckCommands(inputType)) {
                result.commandCheckResult = this.commandProtector.validateCommand(input, inputType);
                this.mergeResults(result, result.commandCheckResult);
            }

            // 3. SQLインジェクション検査
            if (this.shouldCheckSQL(inputType)) {
                result.sqlCheckResult = this.sqlProtector.validateQuery(input);
                this.mergeResults(result, result.sqlCheckResult);
            }

            // 4. 出力エスケープ処理
            result.escapeResult = this.outputEscaper.escape(
                result.validationResult ? result.validationResult.sanitizedInput : input, 
                outputContext
            );
            result.processedOutput = result.escapeResult.escaped;

            // 5. 脅威スコア計算
            result.threatScore = this.calculateThreatScore(result);
            
            // 6. 総合セキュリティ評価
            this.evaluateOverallSecurity(result);

            // 7. セキュリティポリシー適用
            this.applySecurityPolicy(result);

            // 8. パフォーマンス記録
            result.processingTime = performance.now() - startTime;
            this.recordPerformanceMetrics(result);

            // 9. 脅威ログ記録
            if (this.shouldLogThreat(result)) {
                this.logThreat(result);
            }

            // 10. インシデント処理
            if (result.threatScore >= this.config.alertThreshold) {
                this.handleSecurityIncident(result);
            }

        } catch (error) {
            console.error('[SecurityMiddleware] セキュリティ処理エラー:', error);
            result.isSecure = false;
            result.errors.push({
                type: 'MIDDLEWARE_ERROR',
                message: `セキュリティ処理でエラーが発生しました: ${error.message}`,
                severity: 'critical'
            });
        }

        return result;
    }

    /**
     * 結果のマージ
     */
    mergeResults(mainResult, componentResult) {
        if (!componentResult) return;

        // エラーとワーニングをマージ
        if (componentResult.errors) {
            mainResult.errors.push(...componentResult.errors);
        }
        if (componentResult.warnings) {
            mainResult.warnings.push(...componentResult.warnings);
        }

        // セキュリティレベルの更新
        if (componentResult.securityLevel) {
            const currentLevel = this.getSecurityLevelWeight(mainResult.securityLevel);
            const newLevel = this.getSecurityLevelWeight(componentResult.securityLevel);
            if (newLevel > currentLevel) {
                mainResult.securityLevel = componentResult.securityLevel;
            }
        }

        // セキュリティ状態の更新
        if (componentResult.isSafe === false || componentResult.isValid === false) {
            mainResult.isSecure = false;
        }

        // 処理済み入力の更新
        if (componentResult.sanitizedInput) {
            mainResult.processedInput = componentResult.sanitizedInput;
        }
    }

    /**
     * セキュリティレベルの重み取得
     */
    getSecurityLevelWeight(level) {
        const weights = {
            'safe': 0,
            'moderate': 1,
            'risky': 2,
            'dangerous': 3,
            'critical': 4
        };
        return weights[level] || 0;
    }

    /**
     * コマンド検査の必要性判定
     */
    shouldCheckCommands(inputType) {
        const commandCheckTypes = ['command', 'plantuml', 'general'];
        return commandCheckTypes.includes(inputType);
    }

    /**
     * SQL検査の必要性判定
     */
    shouldCheckSQL(inputType) {
        const sqlCheckTypes = ['query', 'general'];
        return sqlCheckTypes.includes(inputType);
    }

    /**
     * 脅威スコア計算
     */
    calculateThreatScore(result) {
        let score = 0;

        // エラーによるスコア加算
        const criticalErrors = result.errors.filter(e => e.severity === 'critical');
        const highErrors = result.errors.filter(e => e.severity === 'high');
        const mediumErrors = result.errors.filter(e => e.severity === 'medium');

        score += criticalErrors.length * 30;
        score += highErrors.length * 20;
        score += mediumErrors.length * 10;

        // 検出パターンによるスコア加算
        if (result.commandCheckResult && result.commandCheckResult.detectedPatterns) {
            score += result.commandCheckResult.detectedPatterns.length * 15;
        }
        if (result.sqlCheckResult && result.sqlCheckResult.detectedPatterns) {
            score += result.sqlCheckResult.detectedPatterns.length * 15;
        }

        // セキュリティレベルによる基本スコア
        const levelScores = {
            'safe': 0,
            'moderate': 20,
            'risky': 50,
            'dangerous': 80,
            'critical': 100
        };
        score += levelScores[result.securityLevel] || 0;

        return Math.min(score, 100); // 最大100点
    }

    /**
     * 総合セキュリティ評価
     */
    evaluateOverallSecurity(result) {
        // 脅威スコアに基づく評価
        if (result.threatScore >= 80) {
            result.securityLevel = 'critical';
            result.isSecure = false;
        } else if (result.threatScore >= 60) {
            result.securityLevel = 'dangerous';
            result.isSecure = false;
        } else if (result.threatScore >= 40) {
            result.securityLevel = 'risky';
        } else if (result.threatScore >= 20) {
            result.securityLevel = 'moderate';
        } else {
            result.securityLevel = 'safe';
        }

        // リスク要因の特定
        this.identifyRiskFactors(result);

        // 推奨事項の生成
        this.generateRecommendations(result);
    }

    /**
     * リスク要因の特定
     */
    identifyRiskFactors(result) {
        result.riskFactors = [];

        if (result.errors.some(e => e.type === 'XSS_DETECTED')) {
            result.riskFactors.push('Cross-Site Scripting (XSS) 攻撃の可能性');
        }
        if (result.errors.some(e => e.type === 'INJECTION_DETECTED')) {
            result.riskFactors.push('インジェクション攻撃の可能性');
        }
        if (result.errors.some(e => e.type === 'COMMAND_INJECTION')) {
            result.riskFactors.push('コマンドインジェクション攻撃の可能性');
        }
        if (result.threatScore > 50) {
            result.riskFactors.push('高い脅威スコア');
        }
    }

    /**
     * 推奨事項の生成
     */
    generateRecommendations(result) {
        result.recommendations = [];

        if (!result.isSecure) {
            result.recommendations.push('入力内容を見直し、安全な形式で再入力してください');
        }
        if (result.threatScore > 30) {
            result.recommendations.push('セキュリティ設定をより厳密にすることを推奨します');
        }
        if (result.errors.length > 5) {
            result.recommendations.push('複数のセキュリティ問題が検出されました。管理者に連絡してください');
        }
    }

    /**
     * セキュリティポリシー適用
     */
    applySecurityPolicy(result) {
        // クアランティンモード
        if (this.config.quarantineMode && result.threatScore >= this.config.maxThreatScore) {
            result.quarantined = true;
            result.processedOutput = '';
            result.errors.push({
                type: 'QUARANTINED',
                message: 'セキュリティ脅威により処理が隔離されました',
                severity: 'critical'
            });
        }

        // 厳格モード
        if (this.config.strictMode && result.securityLevel !== 'safe') {
            result.isSecure = false;
            result.errors.push({
                type: 'STRICT_MODE_VIOLATION',
                message: '厳格モードにより処理が拒否されました',
                severity: 'high'
            });
        }
    }

    /**
     * 脅威ログ記録の必要性判定
     */
    shouldLogThreat(result) {
        if (!this.config.enableThreatLogging) return false;
        return result.threatScore > 0 || result.errors.length > 0;
    }

    /**
     * 脅威ログ記録
     */
    logThreat(result) {
        const logEntry = {
            timestamp: result.timestamp,
            threatScore: result.threatScore,
            securityLevel: result.securityLevel,
            inputType: result.inputType,
            outputContext: result.outputContext,
            riskFactors: result.riskFactors,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
            processingTime: result.processingTime
        };

        this.threatLog.push(logEntry);

        // ログサイズ管理
        if (this.threatLog.length > this.config.maxLogEntries) {
            this.threatLog = this.threatLog.slice(-this.config.maxLogEntries);
        }

        // 詳細ログ出力
        if (this.config.enableDetailedLogging) {
            console.warn('[SecurityMiddleware] 脅威検出:', logEntry);
        }
    }

    /**
     * セキュリティインシデント処理
     */
    handleSecurityIncident(result) {
        const incident = {
            id: this.generateIncidentId(),
            timestamp: result.timestamp,
            severity: this.getIncidentSeverity(result.threatScore),
            threatScore: result.threatScore,
            securityLevel: result.securityLevel,
            inputType: result.inputType,
            riskFactors: result.riskFactors,
            details: {
                errors: result.errors.filter(e => e.severity === 'critical' || e.severity === 'high'),
                commandThreats: result.commandCheckResult?.detectedPatterns || [],
                sqlThreats: result.sqlCheckResult?.detectedPatterns || []
            }
        };

        this.securityIncidents.push(incident);

        // アラート生成
        console.error('[SecurityMiddleware] セキュリティインシデント発生:', incident);

        // イベント発火
        this.emitEvent('securityIncident', incident);
    }

    /**
     * インシデント重要度判定
     */
    getIncidentSeverity(threatScore) {
        if (threatScore >= 95) return 'critical';
        if (threatScore >= 85) return 'high';
        if (threatScore >= 70) return 'medium';
        return 'low';
    }

    /**
     * インシデントID生成
     */
    generateIncidentId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `SEC-${timestamp}-${random}`;
    }

    /**
     * パフォーマンス監視開始
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            this.collectPerformanceMetrics();
        }, 60000); // 1分間隔
    }

    /**
     * パフォーマンスメトリクス収集
     */
    collectPerformanceMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            averageProcessingTime: this.calculateAverageProcessingTime(),
            threatLogSize: this.threatLog.length,
            incidentCount: this.securityIncidents.length,
            memoryUsage: this.getMemoryUsage()
        };

        this.performanceMetrics.push(metrics);

        // メトリクス履歴管理
        if (this.performanceMetrics.length > 1440) { // 24時間分
            this.performanceMetrics = this.performanceMetrics.slice(-1440);
        }
    }

    /**
     * 平均処理時間計算
     */
    calculateAverageProcessingTime() {
        if (this.threatLog.length === 0) return 0;
        
        const recentLogs = this.threatLog.slice(-100); // 直近100件
        const totalTime = recentLogs.reduce((sum, log) => sum + (log.processingTime || 0), 0);
        return totalTime / recentLogs.length;
    }

    /**
     * メモリ使用量取得
     */
    getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * リアルタイム保護開始
     */
    startRealTimeProtection() {
        // DOM変更監視
        if (typeof MutationObserver !== 'undefined') {
            this.setupDOMMonitoring();
        }

        // イベント監視
        this.setupEventMonitoring();
    }

    /**
     * DOM変更監視設定
     */
    setupDOMMonitoring() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    this.checkNewNodes(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 新規ノードのセキュリティチェック
     */
    checkNewNodes(nodes) {
        nodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // スクリプトタグのチェック
                if (node.tagName === 'SCRIPT') {
                    this.handleSuspiciousNode(node, 'Suspicious script tag detected');
                }
                
                // イベントハンドラーのチェック
                const attributes = node.attributes;
                if (attributes) {
                    for (let attr of attributes) {
                        if (attr.name.startsWith('on')) {
                            this.handleSuspiciousNode(node, 'Suspicious event handler detected');
                        }
                    }
                }
            }
        });
    }

    /**
     * 疑わしいノードの処理
     */
    handleSuspiciousNode(node, reason) {
        console.warn('[SecurityMiddleware] 疑わしいDOM変更:', reason, node);
        
        // 必要に応じてノードを除去
        if (this.config.strictMode) {
            node.remove();
        }
    }

    /**
     * イベント監視設定
     */
    setupEventMonitoring() {
        // フォーム送信監視
        document.addEventListener('submit', (event) => {
            this.validateFormSubmission(event);
        });

        // 入力イベント監視
        document.addEventListener('input', (event) => {
            this.validateUserInput(event);
        });
    }

    /**
     * フォーム送信検証
     */
    async validateFormSubmission(event) {
        const form = event.target;
        const formData = new FormData(form);
        
        for (let [key, value] of formData.entries()) {
            const result = await this.processSecurely(value, 'general', 'html');
            if (!result.isSecure) {
                event.preventDefault();
                console.warn('[SecurityMiddleware] フォーム送信をブロック:', result);
                break;
            }
        }
    }

    /**
     * ユーザー入力検証
     */
    validateUserInput(event) {
        const input = event.target.value;
        if (input && input.length > 10) { // 短い入力はスキップ
            this.inputValidator.validateRealTime(input, 'general', (result) => {
                if (!result.isValid) {
                    this.highlightInsecureInput(event.target);
                }
            });
        }
    }

    /**
     * 安全でない入力のハイライト
     */
    highlightInsecureInput(element) {
        element.style.borderColor = '#ff6b6b';
        element.style.backgroundColor = '#ffe6e6';
        
        // 一定時間後に元に戻す
        setTimeout(() => {
            element.style.borderColor = '';
            element.style.backgroundColor = '';
        }, 3000);
    }

    /**
     * イベントハンドラー登録
     */
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);
    }

    /**
     * イベント発火
     */
    emitEvent(eventName, data) {
        if (this.eventHandlers.has(eventName)) {
            this.eventHandlers.get(eventName).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('[SecurityMiddleware] イベントハンドラーエラー:', error);
                }
            });
        }
    }

    /**
     * セキュリティレポート生成
     */
    generateSecurityReport() {
        return {
            timestamp: new Date().toISOString(),
            configuration: this.config,
            statistics: {
                totalThreats: this.threatLog.length,
                totalIncidents: this.securityIncidents.length,
                averageThreatScore: this.calculateAverageThreatScore(),
                performanceMetrics: this.performanceMetrics.slice(-24) // 直近24時間
            },
            recentThreats: this.threatLog.slice(-20),
            recentIncidents: this.securityIncidents.slice(-5),
            securityHealth: this.assessSecurityHealth()
        };
    }

    /**
     * 平均脅威スコア計算
     */
    calculateAverageThreatScore() {
        if (this.threatLog.length === 0) return 0;
        
        const totalScore = this.threatLog.reduce((sum, log) => sum + log.threatScore, 0);
        return totalScore / this.threatLog.length;
    }

    /**
     * セキュリティ健全性評価
     */
    assessSecurityHealth() {
        const avgThreatScore = this.calculateAverageThreatScore();
        const recentIncidents = this.securityIncidents.filter(
            incident => new Date(incident.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;

        if (avgThreatScore > 70 || recentIncidents > 5) {
            return 'poor';
        } else if (avgThreatScore > 40 || recentIncidents > 2) {
            return 'fair';
        } else if (avgThreatScore > 20 || recentIncidents > 0) {
            return 'good';
        } else {
            return 'excellent';
        }
    }

    /**
     * 設定更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // 各コンポーネントの設定更新
        this.commandProtector.updateConfig({
            strictSandboxMode: this.config.securityLevel === 'maximum',
            quarantineMode: this.config.quarantineMode
        });
        
        this.sqlProtector.updateConfig({
            strictMode: this.config.strictMode
        });
        
        this.inputValidator.updateConfig({
            strictMode: this.config.strictMode
        });
        
        this.outputEscaper.updateConfig({
            strictMode: this.config.strictMode
        });

        console.log('[SecurityMiddleware] 設定が更新されました');
    }

    /**
     * ミドルウェアのクリーンアップ
     */
    cleanup() {
        // ログのクリア
        this.threatLog = [];
        this.performanceMetrics = [];
        this.securityIncidents = [];

        // イベントハンドラーのクリア
        this.eventHandlers.clear();

        console.log('[SecurityMiddleware] ミドルウェアがクリーンアップされました');
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityMiddleware;
} else if (typeof window !== 'undefined') {
    window.SecurityMiddleware = SecurityMiddleware;
}

console.log('[SecurityMiddleware] セキュリティミドルウェアが読み込まれました');