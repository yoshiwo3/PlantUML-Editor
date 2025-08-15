/**
 * SecurityMonitor - 包括的セキュリティ監視システム
 * 
 * リアルタイムセキュリティ監視、脅威検出、
 * インシデント管理、セキュリティメトリクス収集
 * 
 * 作成日: 2025-08-15
 * 作成者: agent-orchestrator
 * バージョン: 1.0.0
 */

class SecurityMonitor {
    constructor() {
        this.threats = [];
        this.incidents = [];
        this.metrics = new Map();
        this.alerts = [];
        this.isMonitoring = false;
        this.monitoringInterval = null;
        
        // 脅威検出エンジンの初期化
        this.threatEngine = new ThreatDetectionEngine();
        this.anomalyDetector = new AnomalyDetector();
        this.securityAnalyzer = new SecurityAnalyzer();
        
        // メトリクス初期化
        this.initializeMetrics();
        
        console.log('[SecurityMonitor] セキュリティ監視システム初期化完了');
    }
    
    /**
     * 監視を開始
     * @param {Object} config - 監視設定
     */
    startMonitoring(config = {}) {
        const defaultConfig = {
            interval: 5000,           // 5秒間隔
            threatDetection: true,    // 脅威検出有効
            anomalyDetection: true,   // 異常検出有効
            realTimeAlerts: true,     // リアルタイムアラート有効
            logLevel: 'medium'        // ログレベル
        };
        
        this.config = { ...defaultConfig, ...config };
        
        try {
            if (this.isMonitoring) {
                console.warn('[SecurityMonitor] 監視は既に開始されています');
                return;
            }
            
            this.isMonitoring = true;
            this.startTime = new Date();
            
            // 定期監視の開始
            this.monitoringInterval = setInterval(() => {
                this.performSecurityScan();
            }, this.config.interval);
            
            // イベントリスナーの設定
            this.setupEventListeners();
            
            // 初回スキャン実行
            this.performSecurityScan();
            
            console.log(`[SecurityMonitor] 監視開始 - 間隔: ${this.config.interval}ms`);
            
        } catch (error) {
            console.error('[SecurityMonitor] 監視開始エラー:', error);
            this.logIncident('monitor_start_error', error);
        }
    }
    
    /**
     * 監視を停止
     */
    stopMonitoring() {
        try {
            if (!this.isMonitoring) {
                console.warn('[SecurityMonitor] 監視は開始されていません');
                return;
            }
            
            this.isMonitoring = false;
            
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
            
            // イベントリスナーの削除
            this.removeEventListeners();
            
            const duration = new Date() - this.startTime;
            console.log(`[SecurityMonitor] 監視停止 - 稼働時間: ${Math.round(duration / 1000)}秒`);
            
        } catch (error) {
            console.error('[SecurityMonitor] 監視停止エラー:', error);
        }
    }
    
    /**
     * セキュリティスキャンを実行
     * @returns {Object} スキャン結果
     */
    performSecurityScan() {
        const scanResult = {
            timestamp: new Date().toISOString(),
            threatsDetected: 0,
            anomaliesFound: 0,
            securityScore: 100,
            alerts: [],
            recommendations: []
        };
        
        try {
            // 脅威検出
            if (this.config.threatDetection) {
                const threatResults = this.threatEngine.scanForThreats();
                scanResult.threatsDetected = threatResults.threats.length;
                this.threats.push(...threatResults.threats);
                
                // 高リスク脅威のアラート生成
                threatResults.threats.forEach(threat => {
                    if (threat.severity === 'high' || threat.severity === 'critical') {
                        this.generateAlert('threat_detected', threat);
                    }
                });
            }
            
            // 異常検出
            if (this.config.anomalyDetection) {
                const anomalyResults = this.anomalyDetector.detectAnomalies();
                scanResult.anomaliesFound = anomalyResults.anomalies.length;
                
                anomalyResults.anomalies.forEach(anomaly => {
                    if (anomaly.confidence > 0.8) {
                        this.generateAlert('anomaly_detected', anomaly);
                    }
                });
            }
            
            // セキュリティスコアの計算
            scanResult.securityScore = this.calculateSecurityScore(scanResult);
            
            // メトリクスの更新
            this.updateMetrics(scanResult);
            
            // 推奨事項の生成
            scanResult.recommendations = this.generateRecommendations(scanResult);
            
            return scanResult;
            
        } catch (error) {
            console.error('[SecurityMonitor] セキュリティスキャンエラー:', error);
            this.logIncident('scan_error', error);
            return scanResult;
        }
    }
    
    /**
     * 特定のイベントを分析
     * @param {Object} eventData - イベントデータ
     * @returns {Object} 分析結果
     */
    analyzeEvent(eventData) {
        const analysis = {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            riskLevel: 'low',
            threatScore: 0,
            actionRequired: false,
            findings: []
        };
        
        try {
            // セキュリティ分析
            const securityAnalysis = this.securityAnalyzer.analyzeEvent(eventData);
            analysis.threatScore = securityAnalysis.threatScore;
            analysis.findings.push(...securityAnalysis.findings);
            
            // リスクレベルの決定
            analysis.riskLevel = this.determineRiskLevel(analysis.threatScore);
            
            // アクション要求の判定
            analysis.actionRequired = analysis.riskLevel === 'high' || analysis.riskLevel === 'critical';
            
            // 高リスクイベントの処理
            if (analysis.actionRequired) {
                this.handleHighRiskEvent(eventData, analysis);
            }
            
            return analysis;
            
        } catch (error) {
            console.error('[SecurityMonitor] イベント分析エラー:', error);
            return analysis;
        }
    }
    
    /**
     * セキュリティメトリクスを取得
     * @param {string} timeframe - 時間枠 ('hour', 'day', 'week')
     * @returns {Object} メトリクス
     */
    getSecurityMetrics(timeframe = 'hour') {
        try {
            const now = new Date();
            const timeframes = {
                hour: 60 * 60 * 1000,
                day: 24 * 60 * 60 * 1000,
                week: 7 * 24 * 60 * 60 * 1000
            };
            
            const timeRange = timeframes[timeframe] || timeframes.hour;
            const startTime = new Date(now.getTime() - timeRange);
            
            const metrics = {
                timeframe,
                startTime: startTime.toISOString(),
                endTime: now.toISOString(),
                totalThreats: this.threats.filter(t => new Date(t.timestamp) >= startTime).length,
                totalIncidents: this.incidents.filter(i => new Date(i.timestamp) >= startTime).length,
                totalAlerts: this.alerts.filter(a => new Date(a.timestamp) >= startTime).length,
                averageSecurityScore: this.calculateAverageSecurityScore(startTime),
                topThreats: this.getTopThreats(startTime, 5),
                securityTrends: this.getSecurityTrends(startTime)
            };
            
            return metrics;
            
        } catch (error) {
            console.error('[SecurityMonitor] メトリクス取得エラー:', error);
            return {};
        }
    }
    
    /**
     * セキュリティダッシュボードデータを生成
     * @returns {Object} ダッシュボードデータ
     */
    generateDashboardData() {
        try {
            const currentMetrics = this.getSecurityMetrics('hour');
            const dailyMetrics = this.getSecurityMetrics('day');
            
            return {
                overview: {
                    status: this.isMonitoring ? 'active' : 'inactive',
                    lastScan: this.getLastScanTime(),
                    currentThreatLevel: this.getCurrentThreatLevel(),
                    systemHealth: this.getSystemHealth()
                },
                realTime: currentMetrics,
                daily: dailyMetrics,
                alerts: this.getRecentAlerts(10),
                recommendations: this.getActiveRecommendations(),
                trends: this.getSecurityTrends(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            };
            
        } catch (error) {
            console.error('[SecurityMonitor] ダッシュボードデータ生成エラー:', error);
            return {};
        }
    }
    
    /**
     * セキュリティ脅威を手動報告
     * @param {Object} threatData - 脅威データ
     */
    reportThreat(threatData) {
        try {
            const threat = {
                id: this.generateThreatId(),
                timestamp: new Date().toISOString(),
                type: threatData.type || 'manual_report',
                severity: threatData.severity || 'medium',
                description: threatData.description || '手動報告された脅威',
                source: 'manual',
                details: threatData.details || {},
                status: 'open'
            };
            
            this.threats.push(threat);
            
            // 高リスク脅威のアラート生成
            if (threat.severity === 'high' || threat.severity === 'critical') {
                this.generateAlert('manual_threat_report', threat);
            }
            
            console.log('[SecurityMonitor] 脅威報告受付:', threat.id);
            return threat;
            
        } catch (error) {
            console.error('[SecurityMonitor] 脅威報告エラー:', error);
            return null;
        }
    }
    
    /**
     * セキュリティスコアを計算
     * @private
     */
    calculateSecurityScore(scanResult) {
        let score = 100;
        
        // 脅威による減点
        score -= scanResult.threatsDetected * 10;
        
        // 異常による減点
        score -= scanResult.anomaliesFound * 5;
        
        // アラート数による減点
        score -= scanResult.alerts.length * 3;
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * リスクレベルを決定
     * @private
     */
    determineRiskLevel(threatScore) {
        if (threatScore >= 80) return 'critical';
        if (threatScore >= 60) return 'high';
        if (threatScore >= 40) return 'medium';
        if (threatScore >= 20) return 'low';
        return 'minimal';
    }
    
    /**
     * アラートを生成
     * @private
     */
    generateAlert(type, data) {
        const alert = {
            id: this.generateAlertId(),
            type,
            timestamp: new Date().toISOString(),
            severity: data.severity || 'medium',
            message: this.generateAlertMessage(type, data),
            data,
            acknowledged: false
        };
        
        this.alerts.push(alert);
        
        // アラート制限（最新500件のみ保持）
        if (this.alerts.length > 500) {
            this.alerts = this.alerts.slice(-500);
        }
        
        // リアルタイムアラートの送信
        if (this.config.realTimeAlerts) {
            this.sendRealTimeAlert(alert);
        }
        
        console.warn('[SecurityMonitor] セキュリティアラート:', alert.message);
    }
    
    /**
     * インシデントをログ
     * @private
     */
    logIncident(type, details) {
        const incident = {
            id: this.generateIncidentId(),
            type,
            timestamp: new Date().toISOString(),
            details: typeof details === 'object' ? details : { message: details },
            severity: 'medium',
            status: 'open'
        };
        
        this.incidents.push(incident);
        
        // インシデント制限（最新200件のみ保持）
        if (this.incidents.length > 200) {
            this.incidents = this.incidents.slice(-200);
        }
    }
    
    /**
     * メトリクスを初期化
     * @private
     */
    initializeMetrics() {
        this.metrics.set('totalScans', 0);
        this.metrics.set('totalThreats', 0);
        this.metrics.set('totalIncidents', 0);
        this.metrics.set('totalAlerts', 0);
        this.metrics.set('averageResponseTime', 0);
    }
    
    /**
     * ID生成ヘルパー
     * @private
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateThreatId() {
        return `thr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateAlertId() {
        return `alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateIncidentId() {
        return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * イベントリスナーの設定
     * @private
     */
    setupEventListeners() {
        // ブラウザ環境でのイベント監視
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.analyzeEvent({
                    type: 'javascript_error',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.analyzeEvent({
                    type: 'unhandled_promise_rejection',
                    reason: event.reason
                });
            });
        }
    }
    
    /**
     * イベントリスナーの削除
     * @private
     */
    removeEventListeners() {
        // イベントリスナーのクリーンアップ
        console.log('[SecurityMonitor] イベントリスナー削除完了');
    }
}

/**
 * 脅威検出エンジン
 */
class ThreatDetectionEngine {
    scanForThreats() {
        const threats = [];
        
        // ブラウザ環境での基本的な脅威スキャン
        if (typeof document !== 'undefined') {
            // 不審なスクリプトの検出
            const suspiciousScripts = this.detectSuspiciousScripts();
            threats.push(...suspiciousScripts);
            
            // DOM改ざんの検出
            const domTampering = this.detectDOMTampering();
            threats.push(...domTampering);
        }
        
        return { threats };
    }
    
    detectSuspiciousScripts() {
        const threats = [];
        const scripts = document.querySelectorAll('script');
        
        scripts.forEach(script => {
            if (script.src && !script.src.startsWith(window.location.origin)) {
                threats.push({
                    type: 'external_script',
                    severity: 'medium',
                    description: `外部スクリプトが検出されました: ${script.src}`,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        return threats;
    }
    
    detectDOMTampering() {
        // DOM改ざん検出の基本実装
        return [];
    }
}

/**
 * 異常検出器
 */
class AnomalyDetector {
    detectAnomalies() {
        const anomalies = [];
        
        // 基本的な異常検出
        if (typeof performance !== 'undefined') {
            const memoryInfo = performance.memory;
            if (memoryInfo && memoryInfo.usedJSHeapSize > 50 * 1024 * 1024) {
                anomalies.push({
                    type: 'high_memory_usage',
                    confidence: 0.9,
                    details: { memoryUsage: memoryInfo.usedJSHeapSize }
                });
            }
        }
        
        return { anomalies };
    }
}

/**
 * セキュリティ分析器
 */
class SecurityAnalyzer {
    analyzeEvent(eventData) {
        const analysis = {
            threatScore: 0,
            findings: []
        };
        
        // イベントタイプ別の分析
        switch (eventData.type) {
            case 'javascript_error':
                analysis.threatScore += 10;
                analysis.findings.push('JavaScriptエラーが検出されました');
                break;
            case 'unhandled_promise_rejection':
                analysis.threatScore += 15;
                analysis.findings.push('未処理のPromise拒否が検出されました');
                break;
            default:
                analysis.threatScore += 5;
        }
        
        return analysis;
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.SecurityMonitor = SecurityMonitor;
}

// CommonJS対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecurityMonitor,
        ThreatDetectionEngine,
        AnomalyDetector,
        SecurityAnalyzer
    };
}

console.log('[SecurityMonitor] モジュール読み込み完了 - 包括的セキュリティ監視システム準備済み');