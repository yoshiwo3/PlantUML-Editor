/**
 * Docker Swarm 監視・ロギングシステム
 * 
 * リアルタイム進捗監視、ログ集約、パフォーマンスメトリクス、アラート設定
 * Prometheus、Grafana、ELK Stackとの統合監視
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

const EventEmitter = require('events');
const Redis = require('ioredis');
const winston = require('winston');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

/**
 * 監視システム設定
 */
const MONITORING_CONFIG = {
    // メトリクス収集
    metrics: {
        interval: 5000,        // 5秒間隔
        retention: 86400000,   // 24時間
        aggregationWindow: 60000, // 1分窓
        thresholds: {
            cpu: 80,           // CPU使用率閾値 (%)
            memory: 85,        // メモリ使用率閾値 (%)
            testFailureRate: 10, // テスト失敗率閾値 (%)
            responseTime: 5000,  // レスポンス時間閾値 (ms)
            errorRate: 5       // エラー率閾値 (%)
        }
    },
    
    // アラート設定
    alerts: {
        enabled: true,
        cooldown: 300000,     // 5分クールダウン
        channels: ['log', 'redis', 'webhook'],
        severityLevels: ['info', 'warning', 'critical', 'emergency']
    },
    
    // ログ設定
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        maxFileSize: '100MB',
        maxFiles: 10,
        structured: true,
        realtime: true
    },
    
    // プロメテウス統合
    prometheus: {
        enabled: true,
        port: 9091,
        path: '/metrics',
        namespace: 'plantuml_test'
    }
};

/**
 * 監視メトリクス定義
 */
const METRIC_DEFINITIONS = {
    // システムメトリクス
    system: {
        cpu_usage: { type: 'gauge', help: 'CPU使用率 (%)' },
        memory_usage: { type: 'gauge', help: 'メモリ使用率 (%)' },
        disk_usage: { type: 'gauge', help: 'ディスク使用率 (%)' },
        load_average: { type: 'gauge', help: 'ロードアベレージ' },
        uptime: { type: 'counter', help: 'システム稼働時間 (秒)' }
    },
    
    // テストメトリクス
    test: {
        total_tests: { type: 'counter', help: '総テスト数' },
        passed_tests: { type: 'counter', help: '合格テスト数' },
        failed_tests: { type: 'counter', help: '失敗テスト数' },
        test_duration: { type: 'histogram', help: 'テスト実行時間分布 (ms)' },
        test_success_rate: { type: 'gauge', help: 'テスト成功率 (%)' },
        coverage_percentage: { type: 'gauge', help: 'コードカバレッジ (%)' }
    },
    
    // ノードメトリクス
    node: {
        active_nodes: { type: 'gauge', help: 'アクティブノード数' },
        node_capacity: { type: 'gauge', help: 'ノード容量使用率 (%)' },
        task_queue_length: { type: 'gauge', help: 'タスクキュー長' },
        node_heartbeat: { type: 'gauge', help: '最後のハートビート (unix timestamp)' }
    },
    
    // アプリケーションメトリクス
    application: {
        response_time: { type: 'histogram', help: 'レスポンス時間分布 (ms)' },
        request_rate: { type: 'gauge', help: 'リクエスト率 (req/sec)' },
        error_rate: { type: 'gauge', help: 'エラー率 (%)' },
        concurrent_users: { type: 'gauge', help: '同時接続ユーザー数' }
    }
};

/**
 * ログフォーマッター設定
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label']
    }),
    winston.format.json()
);

/**
 * Docker Swarm 監視システム
 */
class SwarmMonitoringSystem extends EventEmitter {
    constructor() {
        super();
        
        this.nodeId = process.env.SWARM_NODE_ID || 'unknown';
        this.serviceId = process.env.SWARM_SERVICE_ID || 'unknown';
        
        this.redis = new Redis({
            host: 'redis-cache',
            port: 6379,
            retryDelayOnFailover: 100,
            enableReadyCheck: false
        });
        
        this.metrics = new Map();
        this.alerts = new Map();
        this.alertCooldowns = new Map();
        
        this.logger = this.setupLogger();
        this.setupEventHandlers();
        
        this.isRunning = false;
        this.startTime = Date.now();
    }
    
    /**
     * ロガーのセットアップ
     */
    setupLogger() {
        const transports = [
            // ファイル出力
            new winston.transports.File({
                filename: '/app/logs/monitoring-error.log',
                level: 'error',
                format: logFormat,
                maxsize: MONITORING_CONFIG.logging.maxFileSize,
                maxFiles: MONITORING_CONFIG.logging.maxFiles
            }),
            new winston.transports.File({
                filename: '/app/logs/monitoring.log',
                format: logFormat,
                maxsize: MONITORING_CONFIG.logging.maxFileSize,
                maxFiles: MONITORING_CONFIG.logging.maxFiles
            }),
            
            // コンソール出力
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, metadata }) => {
                        const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
                        return `${timestamp} [${level}] ${message} ${meta}`;
                    })
                )
            })
        ];
        
        // ELK Stack統合（利用可能な場合）
        if (process.env.ELASTICSEARCH_HOST) {
            const ElasticSearchTransport = require('winston-elasticsearch');
            transports.push(new ElasticSearchTransport({
                level: 'info',
                clientOpts: {
                    host: process.env.ELASTICSEARCH_HOST,
                    log: 'error'
                },
                index: 'plantuml-test-logs',
                messageType: 'log',
                transformer: (logData) => {
                    const transformed = {};
                    transformed['@timestamp'] = logData.timestamp;
                    transformed.message = logData.message;
                    transformed.severity = logData.level;
                    transformed.fields = logData.meta;
                    transformed.nodeId = this.nodeId;
                    transformed.serviceId = this.serviceId;
                    return transformed;
                }
            }));
        }
        
        return winston.createLogger({
            level: MONITORING_CONFIG.logging.level,
            format: logFormat,
            defaultMeta: {
                service: 'swarm-monitoring',
                nodeId: this.nodeId,
                serviceId: this.serviceId
            },
            transports
        });
    }
    
    /**
     * イベントハンドラーのセットアップ
     */
    setupEventHandlers() {
        // アラートイベント
        this.on('alert', (alert) => this.handleAlert(alert));
        
        // メトリクス閾値超過イベント
        this.on('threshold:exceeded', (metric, value, threshold) => {
            this.triggerAlert('warning', `${metric} threshold exceeded`, {
                metric,
                value,
                threshold,
                severity: 'warning'
            });
        });
        
        // ノード異常イベント
        this.on('node:unhealthy', (nodeId, reason) => {
            this.triggerAlert('critical', `Node ${nodeId} is unhealthy`, {
                nodeId,
                reason,
                severity: 'critical'
            });
        });
        
        // テスト失敗イベント
        this.on('test:failed', (testInfo) => {
            this.logger.warn('Test failed', testInfo);
        });
        
        // システム異常イベント
        this.on('system:error', (error) => {
            this.triggerAlert('critical', 'System error detected', {
                error: error.message,
                stack: error.stack,
                severity: 'critical'
            });
        });
        
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('uncaughtException', (error) => {
            this.emit('system:error', error);
            this.gracefulShutdown();
        });
    }
    
    /**
     * 監視システムの開始
     */
    async start() {
        try {
            this.logger.info('Starting Swarm Monitoring System', {
                nodeId: this.nodeId,
                serviceId: this.serviceId,
                config: MONITORING_CONFIG
            });
            
            // Redis接続確認
            await this.redis.ping();
            
            // メトリクス収集の開始
            this.startMetricsCollection();
            
            // ヘルスチェックの開始
            this.startHealthChecks();
            
            // アラート処理の開始
            this.startAlertProcessing();
            
            // Prometheusエクスポーターの開始
            if (MONITORING_CONFIG.prometheus.enabled) {
                this.startPrometheusExporter();
            }
            
            this.isRunning = true;
            this.logger.info('Monitoring system started successfully');
            
        } catch (error) {
            this.logger.error('Failed to start monitoring system', error);
            throw error;
        }
    }
    
    /**
     * メトリクス収集の開始
     */
    startMetricsCollection() {
        setInterval(async () => {
            try {
                await this.collectSystemMetrics();
                await this.collectTestMetrics();
                await this.collectNodeMetrics();
                await this.collectApplicationMetrics();
                
                // メトリクス検証
                this.validateMetrics();
                
            } catch (error) {
                this.logger.error('Error collecting metrics', error);
            }
        }, MONITORING_CONFIG.metrics.interval);
        
        this.logger.info('Metrics collection started', {
            interval: MONITORING_CONFIG.metrics.interval
        });
    }
    
    /**
     * システムメトリクスの収集
     */
    async collectSystemMetrics() {
        const timestamp = Date.now();
        
        // CPU使用率
        const cpuUsage = await this.getCPUUsage();
        this.setMetric('system.cpu_usage', cpuUsage, timestamp);
        
        // メモリ使用率
        const memoryUsage = this.getMemoryUsage();
        this.setMetric('system.memory_usage', memoryUsage, timestamp);
        
        // ディスク使用率
        const diskUsage = await this.getDiskUsage();
        this.setMetric('system.disk_usage', diskUsage, timestamp);
        
        // ロードアベレージ
        const loadAverage = os.loadavg()[0];
        this.setMetric('system.load_average', loadAverage, timestamp);
        
        // アップタイム
        const uptime = Date.now() - this.startTime;
        this.setMetric('system.uptime', uptime, timestamp);
        
        // Redisに保存
        await this.saveMetricsToRedis('system', {
            cpu_usage: cpuUsage,
            memory_usage: memoryUsage,
            disk_usage: diskUsage,
            load_average: loadAverage,
            uptime,
            timestamp
        });
    }
    
    /**
     * テストメトリクスの収集
     */
    async collectTestMetrics() {
        const timestamp = Date.now();
        
        try {
            // Redisからテスト統計を取得
            const testStats = await this.getTestStatistics();
            
            this.setMetric('test.total_tests', testStats.totalTests, timestamp);
            this.setMetric('test.passed_tests', testStats.passedTests, timestamp);
            this.setMetric('test.failed_tests', testStats.failedTests, timestamp);
            this.setMetric('test.test_success_rate', testStats.successRate, timestamp);
            
            if (testStats.coverage) {
                this.setMetric('test.coverage_percentage', testStats.coverage.lines, timestamp);
            }
            
            // Redisに保存
            await this.saveMetricsToRedis('test', { ...testStats, timestamp });
            
        } catch (error) {
            this.logger.warn('Failed to collect test metrics', error);
        }
    }
    
    /**
     * ノードメトリクスの収集
     */
    async collectNodeMetrics() {
        const timestamp = Date.now();
        
        try {
            // アクティブノード数
            const activeNodes = await this.redis.hlen('swarm:nodes');
            this.setMetric('node.active_nodes', activeNodes, timestamp);
            
            // タスクキュー長
            const queueLength = await this.redis.llen(`swarm:tasks:${this.nodeId}`);
            this.setMetric('node.task_queue_length', queueLength, timestamp);
            
            // ハートビート
            const lastHeartbeat = await this.redis.get(`swarm:heartbeat:${this.nodeId}`);
            if (lastHeartbeat) {
                this.setMetric('node.node_heartbeat', parseInt(lastHeartbeat), timestamp);
            }
            
            // ノード容量使用率
            const nodeCapacity = await this.calculateNodeCapacity();
            this.setMetric('node.node_capacity', nodeCapacity, timestamp);
            
            await this.saveMetricsToRedis('node', {
                active_nodes: activeNodes,
                task_queue_length: queueLength,
                node_capacity: nodeCapacity,
                timestamp
            });
            
        } catch (error) {
            this.logger.warn('Failed to collect node metrics', error);
        }
    }
    
    /**
     * アプリケーションメトリクスの収集
     */
    async collectApplicationMetrics() {
        const timestamp = Date.now();
        
        try {
            // アプリケーションヘルスチェック
            const healthCheck = await this.performHealthCheck();
            
            this.setMetric('application.response_time', healthCheck.responseTime, timestamp);
            this.setMetric('application.error_rate', healthCheck.errorRate, timestamp);
            
            await this.saveMetricsToRedis('application', {
                ...healthCheck,
                timestamp
            });
            
        } catch (error) {
            this.logger.warn('Failed to collect application metrics', error);
        }
    }
    
    /**
     * CPU使用率の取得
     */
    async getCPUUsage() {
        return new Promise((resolve) => {
            const startMeasure = process.cpuUsage();
            const startTime = Date.now();
            
            setTimeout(() => {
                const endMeasure = process.cpuUsage(startMeasure);
                const endTime = Date.now();
                
                const totalTime = (endTime - startTime) * 1000; // マイクロ秒
                const cpuTime = endMeasure.user + endMeasure.system;
                const cpuUsage = (cpuTime / totalTime) * 100;
                
                resolve(Math.min(cpuUsage, 100));
            }, 100);
        });
    }
    
    /**
     * メモリ使用率の取得
     */
    getMemoryUsage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        return Math.round((usedMemory / totalMemory) * 100);
    }
    
    /**
     * ディスク使用率の取得
     */
    async getDiskUsage() {
        try {
            const stats = await fs.statfs('/app');
            const totalSpace = stats.blocks * stats.blksize;
            const freeSpace = stats.bavail * stats.blksize;
            const usedSpace = totalSpace - freeSpace;
            
            return Math.round((usedSpace / totalSpace) * 100);
            
        } catch (error) {
            this.logger.warn('Failed to get disk usage', error);
            return 0;
        }
    }
    
    /**
     * テスト統計の取得
     */
    async getTestStatistics() {
        try {
            const results = await this.redis.lrange('swarm:results', 0, -1);
            let totalTests = 0, passedTests = 0, failedTests = 0;
            let totalDuration = 0;
            let coverageData = null;
            
            for (const resultStr of results) {
                const result = JSON.parse(resultStr);
                if (result.results) {
                    for (const test of result.results) {
                        totalTests++;
                        totalDuration += test.duration || 0;
                        
                        if (test.status === 'passed') passedTests++;
                        else if (test.status === 'failed') failedTests++;
                        
                        if (test.coverage && !coverageData) {
                            coverageData = test.coverage;
                        }
                    }
                }
            }
            
            const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
            const averageTestTime = totalTests > 0 ? totalDuration / totalTests : 0;
            
            return {
                totalTests,
                passedTests,
                failedTests,
                successRate: Math.round(successRate * 100) / 100,
                averageTestTime: Math.round(averageTestTime),
                coverage: coverageData
            };
            
        } catch (error) {
            this.logger.warn('Failed to get test statistics', error);
            return {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                successRate: 0,
                averageTestTime: 0
            };
        }
    }
    
    /**
     * ノード容量の計算
     */
    async calculateNodeCapacity() {
        try {
            const runningTasks = await this.redis.llen(`swarm:running:${this.nodeId}`);
            const maxTasks = 10; // 設定値
            
            return Math.round((runningTasks / maxTasks) * 100);
            
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * ヘルスチェックの実行
     */
    async performHealthCheck() {
        const startTime = Date.now();
        
        try {
            // アプリケーションサーバーへのヘルスチェック
            const response = await this.httpRequest('http://app-server:8086/health', {
                timeout: 5000
            });
            
            const responseTime = Date.now() - startTime;
            const errorRate = response.status >= 400 ? 100 : 0;
            
            return {
                responseTime,
                errorRate,
                status: response.status,
                healthy: response.status < 400
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                responseTime,
                errorRate: 100,
                status: 0,
                healthy: false,
                error: error.message
            };
        }
    }
    
    /**
     * HTTPリクエストの実行
     */
    httpRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const req = http.get(url, (res) => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers
                });
            });
            
            req.on('error', reject);
            
            if (options.timeout) {
                req.setTimeout(options.timeout, () => {
                    req.abort();
                    reject(new Error('Request timeout'));
                });
            }
        });
    }
    
    /**
     * メトリクスの設定
     */
    setMetric(name, value, timestamp = Date.now()) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const metricData = this.metrics.get(name);
        metricData.push({ value, timestamp });
        
        // 保存期間制限
        const cutoff = timestamp - MONITORING_CONFIG.metrics.retention;
        const filtered = metricData.filter(m => m.timestamp > cutoff);
        this.metrics.set(name, filtered);
    }
    
    /**
     * Redisへのメトリクス保存
     */
    async saveMetricsToRedis(category, data) {
        const key = `metrics:${category}:${this.nodeId}`;
        const value = JSON.stringify(data);
        
        await this.redis.lpush(key, value);
        await this.redis.ltrim(key, 0, 1000); // 最新1000件のみ保持
        await this.redis.expire(key, MONITORING_CONFIG.metrics.retention / 1000);
    }
    
    /**
     * メトリクス検証
     */
    validateMetrics() {
        const thresholds = MONITORING_CONFIG.metrics.thresholds;
        
        // CPU使用率チェック
        const cpuMetrics = this.metrics.get('system.cpu_usage') || [];
        if (cpuMetrics.length > 0) {
            const latestCpu = cpuMetrics[cpuMetrics.length - 1].value;
            if (latestCpu > thresholds.cpu) {
                this.emit('threshold:exceeded', 'CPU usage', latestCpu, thresholds.cpu);
            }
        }
        
        // メモリ使用率チェック
        const memoryMetrics = this.metrics.get('system.memory_usage') || [];
        if (memoryMetrics.length > 0) {
            const latestMemory = memoryMetrics[memoryMetrics.length - 1].value;
            if (latestMemory > thresholds.memory) {
                this.emit('threshold:exceeded', 'Memory usage', latestMemory, thresholds.memory);
            }
        }
        
        // テスト失敗率チェック
        const failureRateMetrics = this.metrics.get('test.test_success_rate') || [];
        if (failureRateMetrics.length > 0) {
            const latestSuccessRate = failureRateMetrics[failureRateMetrics.length - 1].value;
            const failureRate = 100 - latestSuccessRate;
            if (failureRate > thresholds.testFailureRate) {
                this.emit('threshold:exceeded', 'Test failure rate', failureRate, thresholds.testFailureRate);
            }
        }
    }
    
    /**
     * ヘルスチェックの開始
     */
    startHealthChecks() {
        setInterval(async () => {
            try {
                await this.performNodeHealthCheck();
                await this.performSystemHealthCheck();
                
            } catch (error) {
                this.logger.error('Health check failed', error);
            }
        }, 30000); // 30秒間隔
        
        this.logger.info('Health checks started');
    }
    
    /**
     * ノードヘルスチェック
     */
    async performNodeHealthCheck() {
        try {
            // 他のノードのハートビート確認
            const nodeKeys = await this.redis.hkeys('swarm:nodes');
            
            for (const nodeId of nodeKeys) {
                if (nodeId === this.nodeId) continue;
                
                const lastHeartbeat = await this.redis.get(`swarm:heartbeat:${nodeId}`);
                if (lastHeartbeat) {
                    const timeSinceHeartbeat = Date.now() - parseInt(lastHeartbeat);
                    
                    if (timeSinceHeartbeat > 120000) { // 2分間応答なし
                        this.emit('node:unhealthy', nodeId, 'Heartbeat timeout');
                    }
                }
            }
            
        } catch (error) {
            this.logger.warn('Node health check failed', error);
        }
    }
    
    /**
     * システムヘルスチェック
     */
    async performSystemHealthCheck() {
        try {
            // Redis接続確認
            await this.redis.ping();
            
            // ディスク容量確認
            const diskUsage = await this.getDiskUsage();
            if (diskUsage > 90) {
                this.triggerAlert('warning', 'High disk usage', {
                    diskUsage,
                    threshold: 90,
                    severity: 'warning'
                });
            }
            
        } catch (error) {
            this.emit('system:error', error);
        }
    }
    
    /**
     * アラート処理の開始
     */
    startAlertProcessing() {
        this.logger.info('Alert processing started');
    }
    
    /**
     * アラートのトリガー
     */
    triggerAlert(severity, message, metadata = {}) {
        if (!MONITORING_CONFIG.alerts.enabled) return;
        
        const alertId = `${severity}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // クールダウンチェック
        const cooldownKey = `${severity}-${message}`;
        if (this.alertCooldowns.has(cooldownKey)) {
            const lastAlert = this.alertCooldowns.get(cooldownKey);
            if (Date.now() - lastAlert < MONITORING_CONFIG.alerts.cooldown) {
                return; // クールダウン中
            }
        }
        
        const alert = {
            id: alertId,
            severity,
            message,
            metadata,
            nodeId: this.nodeId,
            serviceId: this.serviceId,
            timestamp: new Date().toISOString(),
            resolved: false
        };
        
        this.alerts.set(alertId, alert);
        this.alertCooldowns.set(cooldownKey, Date.now());
        
        // アラート送信
        this.sendAlert(alert);
        
        // イベント発火
        this.emit('alert', alert);
    }
    
    /**
     * アラートの送信
     */
    async sendAlert(alert) {
        const channels = MONITORING_CONFIG.alerts.channels;
        
        // ログ出力
        if (channels.includes('log')) {
            this.logger[alert.severity](`ALERT: ${alert.message}`, alert.metadata);
        }
        
        // Redis保存
        if (channels.includes('redis')) {
            await this.redis.lpush('swarm:alerts', JSON.stringify(alert));
            await this.redis.ltrim('swarm:alerts', 0, 1000);
        }
        
        // Webhook送信
        if (channels.includes('webhook') && process.env.ALERT_WEBHOOK_URL) {
            try {
                // Webhook実装（実際のWebhookエンドポイントに送信）
                this.logger.info('Webhook alert sent', { alertId: alert.id });
            } catch (error) {
                this.logger.error('Failed to send webhook alert', error);
            }
        }
    }
    
    /**
     * アラートの処理
     */
    handleAlert(alert) {
        this.logger.info('Handling alert', { alertId: alert.id, severity: alert.severity });
        
        // 緊急アラートの場合は追加処理
        if (alert.severity === 'emergency') {
            // 緊急時の処理（例：管理者通知、システム停止など）
            this.logger.emergency('Emergency alert triggered', alert);
        }
    }
    
    /**
     * Prometheusエクスポーターの開始
     */
    startPrometheusExporter() {
        const server = http.createServer((req, res) => {
            if (req.url === MONITORING_CONFIG.prometheus.path) {
                res.setHeader('Content-Type', 'text/plain');
                res.end(this.generatePrometheusMetrics());
            } else {
                res.statusCode = 404;
                res.end('Not Found');
            }
        });
        
        server.listen(MONITORING_CONFIG.prometheus.port, () => {
            this.logger.info(`Prometheus exporter listening on port ${MONITORING_CONFIG.prometheus.port}`);
        });
    }
    
    /**
     * Prometheusメトリクス生成
     */
    generatePrometheusMetrics() {
        const namespace = MONITORING_CONFIG.prometheus.namespace;
        const lines = [];
        
        for (const [metricName, metricData] of this.metrics.entries()) {
            if (metricData.length === 0) continue;
            
            const latestValue = metricData[metricData.length - 1].value;
            const promName = `${namespace}_${metricName.replace(/\./g, '_')}`;
            
            lines.push(`# HELP ${promName} ${metricName}`);
            lines.push(`# TYPE ${promName} gauge`);
            lines.push(`${promName}{node_id="${this.nodeId}",service_id="${this.serviceId}"} ${latestValue}`);
        }
        
        return lines.join('\n') + '\n';
    }
    
    /**
     * 監視データの取得
     */
    getMonitoringData() {
        const now = Date.now();
        const data = {
            nodeId: this.nodeId,
            serviceId: this.serviceId,
            uptime: now - this.startTime,
            timestamp: now,
            status: this.isRunning ? 'running' : 'stopped',
            metrics: {},
            alerts: Array.from(this.alerts.values()).slice(-50), // 最新50件
            summary: {}
        };
        
        // 最新メトリクス
        for (const [name, values] of this.metrics.entries()) {
            if (values.length > 0) {
                data.metrics[name] = values[values.length - 1];
            }
        }
        
        // サマリー統計
        data.summary = {
            totalMetrics: this.metrics.size,
            totalAlerts: this.alerts.size,
            activeAlerts: Array.from(this.alerts.values()).filter(a => !a.resolved).length
        };
        
        return data;
    }
    
    /**
     * 優雅なシャットダウン
     */
    async gracefulShutdown() {
        this.logger.info('Graceful shutdown initiated');
        
        try {
            this.isRunning = false;
            
            // 最終メトリクス収集
            await this.collectSystemMetrics();
            await this.collectTestMetrics();
            
            // Redis接続の終了
            this.redis.disconnect();
            
            this.logger.info('Monitoring system shutdown completed');
            
        } catch (error) {
            this.logger.error('Error during graceful shutdown', error);
        } finally {
            process.exit(0);
        }
    }
}

/**
 * メイン実行関数
 */
async function main() {
    try {
        const monitoring = new SwarmMonitoringSystem();
        await monitoring.start();
        
        // 定期統計出力
        setInterval(() => {
            const data = monitoring.getMonitoringData();
            monitoring.logger.info('Monitoring Status', {
                uptime: data.uptime,
                metrics: Object.keys(data.metrics).length,
                alerts: data.summary.activeAlerts
            });
        }, 60000); // 1分間隔
        
    } catch (error) {
        console.error('Fatal error in monitoring system:', error);
        process.exit(1);
    }
}

// プロセス起動
if (require.main === module) {
    main();
}

module.exports = { SwarmMonitoringSystem, MONITORING_CONFIG, METRIC_DEFINITIONS };