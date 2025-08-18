/**
 * Docker Swarm テスト結果集約レポーター
 * 
 * リアルタイム結果収集、レポート統合、メトリクス集計、多形式エクスポート
 * Swarmノードからの結果を統合して包括的なテストレポートを生成
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

const express = require('express');
const Redis = require('ioredis');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const zlib = require('zlib');
const gzip = promisify(zlib.gzip);

/**
 * レポーター設定
 */
const REPORTER_CONFIG = {
    // サーバー設定
    server: {
        port: process.env.REPORT_PORT || 8087,
        host: '0.0.0.0'
    },
    
    // 集約設定
    aggregation: {
        mode: process.env.AGGREGATION_MODE || 'realtime', // 'realtime', 'batch'
        batchInterval: 10000, // 10秒
        maxBatchSize: 100,
        retentionTime: 86400000 // 24時間
    },
    
    // エクスポート設定
    export: {
        formats: (process.env.EXPORT_FORMATS || 'html,json,xml,csv').split(','),
        compression: true,
        timestampFormat: 'YYYY-MM-DD_HH-mm-ss'
    },
    
    // メトリクス設定
    metrics: {
        enabled: process.env.METRICS_COLLECTION === 'enabled',
        sampleRate: 1000, // 1秒
        historyLength: 3600 // 1時間分
    }
};

/**
 * ロガー設定
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { 
        service: 'swarm-reporter',
        version: '1.0.0'
    },
    transports: [
        new winston.transports.File({ filename: '/app/logs/reporter-error.log', level: 'error' }),
        new winston.transports.File({ filename: '/app/logs/reporter.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

/**
 * テスト結果集約レポーター
 */
class SwarmTestReporter {
    constructor() {
        this.redis = new Redis({
            host: 'redis-cache',
            port: 6379,
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: 3
        });
        
        this.app = express();
        this.setupExpress();
        
        this.results = new Map();
        this.failures = new Map();
        this.metrics = {
            startTime: Date.now(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errorTests: 0,
            totalDuration: 0,
            nodeMetrics: new Map(),
            coverageData: new Map(),
            performanceMetrics: []
        };
        
        this.reports = new Map();
        this.isProcessing = false;
    }
    
    /**
     * Express サーバーの設定
     */
    setupExpress() {
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.static('/app/reports'));
        
        // CORS設定
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            next();
        });
        
        // ルートの設定
        this.setupRoutes();
        
        // エラーハンドリング
        this.app.use((error, req, res, next) => {
            logger.error('Express error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
    }
    
    /**
     * APIルートの設定
     */
    setupRoutes() {
        // ヘルスチェック
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                uptime: Date.now() - this.metrics.startTime,
                redis: this.redis.status,
                processing: this.isProcessing
            });
        });
        
        // 現在のメトリクス取得
        this.app.get('/api/metrics', (req, res) => {
            res.json(this.getCurrentMetrics());
        });
        
        // テスト結果一覧
        this.app.get('/api/results', (req, res) => {
            const { page = 1, limit = 50, status, category } = req.query;
            const results = this.getFilteredResults(status, category, page, limit);
            res.json(results);
        });
        
        // 特定テスト結果の詳細
        this.app.get('/api/results/:id', (req, res) => {
            const result = this.results.get(req.params.id);
            if (!result) {
                return res.status(404).json({ error: 'Result not found' });
            }
            res.json(result);
        });
        
        // レポート生成
        this.app.post('/api/reports/generate', async (req, res) => {
            try {
                const { format = 'html', includeDetails = true } = req.body;
                const reportId = await this.generateReport(format, includeDetails);
                res.json({ reportId, downloadUrl: `/api/reports/${reportId}/download` });
            } catch (error) {
                logger.error('Report generation failed:', error);
                res.status(500).json({ error: 'Report generation failed' });
            }
        });
        
        // レポートダウンロード
        this.app.get('/api/reports/:id/download', async (req, res) => {
            try {
                const report = this.reports.get(req.params.id);
                if (!report) {
                    return res.status(404).json({ error: 'Report not found' });
                }
                
                const filePath = path.join('/app/reports', report.filename);
                res.download(filePath, report.originalName);
                
            } catch (error) {
                logger.error('Report download failed:', error);
                res.status(500).json({ error: 'Report download failed' });
            }
        });
        
        // リアルタイム統計（WebSocket風のポーリング）
        this.app.get('/api/stats/realtime', (req, res) => {
            res.json({
                timestamp: Date.now(),
                metrics: this.getCurrentMetrics(),
                activeNodes: this.getActiveNodes(),
                recentResults: this.getRecentResults(10)
            });
        });
        
        // カバレッジレポート
        this.app.get('/api/coverage', (req, res) => {
            res.json(this.generateCoverageReport());
        });
        
        // パフォーマンス統計
        this.app.get('/api/performance', (req, res) => {
            res.json(this.getPerformanceStatistics());
        });
        
        // メイン管理画面
        this.app.get('/', (req, res) => {
            res.send(this.generateDashboardHTML());
        });
    }
    
    /**
     * レポーターの初期化
     */
    async initialize() {
        try {
            logger.info('Initializing Swarm Test Reporter...');
            
            // Redis接続確認
            await this.redis.ping();
            
            // 結果ディレクトリの作成
            await this.ensureDirectories();
            
            // 結果処理の開始
            this.startResultProcessing();
            
            // メトリクス収集の開始
            if (REPORTER_CONFIG.metrics.enabled) {
                this.startMetricsCollection();
            }
            
            // Express サーバーの開始
            this.server = this.app.listen(REPORTER_CONFIG.server.port, REPORTER_CONFIG.server.host, () => {
                logger.info(`Reporter server listening on ${REPORTER_CONFIG.server.host}:${REPORTER_CONFIG.server.port}`);
            });
            
            logger.info('Reporter initialization completed');
            
        } catch (error) {
            logger.error('Failed to initialize reporter:', error);
            throw error;
        }
    }
    
    /**
     * 必要なディレクトリの作成
     */
    async ensureDirectories() {
        const dirs = ['/app/reports', '/app/coverage', '/app/logs'];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }
    
    /**
     * 結果処理の開始
     */
    startResultProcessing() {
        logger.info('Starting result processing...');
        
        if (REPORTER_CONFIG.aggregation.mode === 'realtime') {
            this.startRealtimeProcessing();
        } else {
            this.startBatchProcessing();
        }
    }
    
    /**
     * リアルタイム結果処理
     */
    async startRealtimeProcessing() {
        while (true) {
            try {
                this.isProcessing = true;
                
                // テスト結果の処理
                const resultData = await this.redis.brpop('swarm:results', 5);
                if (resultData) {
                    await this.processTestResult(JSON.parse(resultData[1]));
                }
                
                // 失敗の処理
                const failureData = await this.redis.brpop('swarm:failures', 1);
                if (failureData) {
                    await this.processTestFailure(JSON.parse(failureData[1]));
                }
                
                this.isProcessing = false;
                
            } catch (error) {
                logger.error('Error in realtime processing:', error);
                this.isProcessing = false;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    
    /**
     * バッチ結果処理
     */
    async startBatchProcessing() {
        setInterval(async () => {
            try {
                this.isProcessing = true;
                
                const batchSize = REPORTER_CONFIG.aggregation.maxBatchSize;
                
                // バッチ結果処理
                for (let i = 0; i < batchSize; i++) {
                    const resultData = await this.redis.rpop('swarm:results');
                    if (!resultData) break;
                    
                    await this.processTestResult(JSON.parse(resultData));
                }
                
                // バッチ失敗処理
                for (let i = 0; i < batchSize; i++) {
                    const failureData = await this.redis.rpop('swarm:failures');
                    if (!failureData) break;
                    
                    await this.processTestFailure(JSON.parse(failureData));
                }
                
                this.isProcessing = false;
                
            } catch (error) {
                logger.error('Error in batch processing:', error);
                this.isProcessing = false;
            }
        }, REPORTER_CONFIG.aggregation.batchInterval);
    }
    
    /**
     * テスト結果の処理
     */
    async processTestResult(resultData) {
        const resultId = `${resultData.nodeId}-${resultData.taskId}-${Date.now()}`;
        this.results.set(resultId, resultData);
        
        // メトリクス更新
        this.updateMetrics(resultData);
        
        // カバレッジデータの保存
        if (resultData.results) {
            for (const testResult of resultData.results) {
                if (testResult.coverage) {
                    this.mergeCoverageData(testResult.coverage);
                }
            }
        }
        
        logger.info(`Processed test result: ${resultId} from node ${resultData.nodeId}`);
    }
    
    /**
     * テスト失敗の処理
     */
    async processTestFailure(failureData) {
        const failureId = `failure-${failureData.nodeId}-${failureData.taskId}-${Date.now()}`;
        this.failures.set(failureId, failureData);
        
        logger.warn(`Processed test failure: ${failureId} from node ${failureData.nodeId}`);
    }
    
    /**
     * メトリクスの更新
     */
    updateMetrics(resultData) {
        if (!resultData.results) return;
        
        for (const testResult of resultData.results) {
            this.metrics.totalTests++;
            this.metrics.totalDuration += testResult.duration;
            
            switch (testResult.status) {
                case 'passed':
                    this.metrics.passedTests++;
                    break;
                case 'failed':
                    this.metrics.failedTests++;
                    break;
                case 'error':
                    this.metrics.errorTests++;
                    break;
            }
        }
        
        // ノード別メトリクス
        if (!this.metrics.nodeMetrics.has(resultData.nodeId)) {
            this.metrics.nodeMetrics.set(resultData.nodeId, {
                tests: 0,
                duration: 0,
                passed: 0,
                failed: 0,
                errors: 0
            });
        }
        
        const nodeMetrics = this.metrics.nodeMetrics.get(resultData.nodeId);
        nodeMetrics.tests += resultData.results.length;
        nodeMetrics.duration += resultData.totalDuration;
        
        for (const testResult of resultData.results) {
            switch (testResult.status) {
                case 'passed': nodeMetrics.passed++; break;
                case 'failed': nodeMetrics.failed++; break;
                case 'error': nodeMetrics.errors++; break;
            }
        }
    }
    
    /**
     * カバレッジデータのマージ
     */
    mergeCoverageData(coverage) {
        if (!coverage || typeof coverage !== 'object') return;
        
        // ファイル別カバレッジの統合
        for (const [file, fileCoverage] of Object.entries(coverage)) {
            if (!this.metrics.coverageData.has(file)) {
                this.metrics.coverageData.set(file, {
                    lines: { covered: 0, total: 0 },
                    functions: { covered: 0, total: 0 },
                    branches: { covered: 0, total: 0 },
                    statements: { covered: 0, total: 0 }
                });
            }
            
            const existing = this.metrics.coverageData.get(file);
            
            // 各メトリクスの統合
            ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
                if (fileCoverage[metric]) {
                    existing[metric].covered = Math.max(existing[metric].covered, fileCoverage[metric].covered || 0);
                    existing[metric].total = Math.max(existing[metric].total, fileCoverage[metric].total || 0);
                }
            });
        }
    }
    
    /**
     * メトリクス収集の開始
     */
    startMetricsCollection() {
        setInterval(() => {
            const currentMetrics = {
                timestamp: Date.now(),
                ...this.getCurrentMetrics()
            };
            
            this.metrics.performanceMetrics.push(currentMetrics);
            
            // 履歴長制限
            if (this.metrics.performanceMetrics.length > REPORTER_CONFIG.metrics.historyLength) {
                this.metrics.performanceMetrics.shift();
            }
            
        }, REPORTER_CONFIG.metrics.sampleRate);
    }
    
    /**
     * 現在のメトリクス取得
     */
    getCurrentMetrics() {
        const totalTests = this.metrics.totalTests;
        const successRate = totalTests > 0 ? (this.metrics.passedTests / totalTests) * 100 : 0;
        const averageTestTime = totalTests > 0 ? this.metrics.totalDuration / totalTests : 0;
        
        return {
            summary: {
                totalTests,
                passedTests: this.metrics.passedTests,
                failedTests: this.metrics.failedTests,
                errorTests: this.metrics.errorTests,
                successRate: Math.round(successRate * 100) / 100,
                totalDuration: this.metrics.totalDuration,
                averageTestTime: Math.round(averageTestTime * 100) / 100
            },
            nodes: Object.fromEntries(this.metrics.nodeMetrics),
            coverage: this.calculateOverallCoverage(),
            uptime: Date.now() - this.metrics.startTime
        };
    }
    
    /**
     * 全体カバレッジの計算
     */
    calculateOverallCoverage() {
        let totalLines = 0, coveredLines = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalBranches = 0, coveredBranches = 0;
        let totalStatements = 0, coveredStatements = 0;
        
        for (const fileCoverage of this.metrics.coverageData.values()) {
            totalLines += fileCoverage.lines.total;
            coveredLines += fileCoverage.lines.covered;
            totalFunctions += fileCoverage.functions.total;
            coveredFunctions += fileCoverage.functions.covered;
            totalBranches += fileCoverage.branches.total;
            coveredBranches += fileCoverage.branches.covered;
            totalStatements += fileCoverage.statements.total;
            coveredStatements += fileCoverage.statements.covered;
        }
        
        return {
            lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 10000) / 100 : 0,
            functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 10000) / 100 : 0,
            branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 10000) / 100 : 0,
            statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 10000) / 100 : 0
        };
    }
    
    /**
     * フィルタリングされた結果取得
     */
    getFilteredResults(status, category, page, limit) {
        let results = Array.from(this.results.values());
        
        // フィルタリング
        if (status) {
            results = results.filter(r => 
                r.results && r.results.some(test => test.status === status)
            );
        }
        
        if (category) {
            results = results.filter(r => 
                r.results && r.results.some(test => test.category === category)
            );
        }
        
        // ページネーション
        const offset = (page - 1) * limit;
        const paginatedResults = results.slice(offset, offset + limit);
        
        return {
            results: paginatedResults,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: results.length,
                pages: Math.ceil(results.length / limit)
            }
        };
    }
    
    /**
     * アクティブノード取得
     */
    getActiveNodes() {
        const nodes = Array.from(this.metrics.nodeMetrics.entries()).map(([nodeId, metrics]) => ({
            nodeId,
            ...metrics,
            status: 'active' // 実際のステータス確認は別途実装
        }));
        
        return nodes;
    }
    
    /**
     * 最近の結果取得
     */
    getRecentResults(limit) {
        const results = Array.from(this.results.values())
            .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
            .slice(0, limit);
        
        return results;
    }
    
    /**
     * カバレッジレポート生成
     */
    generateCoverageReport() {
        const fileReports = Array.from(this.metrics.coverageData.entries()).map(([file, coverage]) => ({
            file,
            coverage
        }));
        
        return {
            overall: this.calculateOverallCoverage(),
            files: fileReports,
            generatedAt: new Date().toISOString()
        };
    }
    
    /**
     * パフォーマンス統計取得
     */
    getPerformanceStatistics() {
        const recentMetrics = this.metrics.performanceMetrics.slice(-100); // 最新100件
        
        return {
            current: this.getCurrentMetrics(),
            history: recentMetrics,
            trends: this.calculateTrends(recentMetrics)
        };
    }
    
    /**
     * トレンド計算
     */
    calculateTrends(metrics) {
        if (metrics.length < 2) return null;
        
        const latest = metrics[metrics.length - 1];
        const previous = metrics[metrics.length - 2];
        
        return {
            testRate: latest.summary.totalTests - previous.summary.totalTests,
            successRateChange: latest.summary.successRate - previous.summary.successRate,
            averageTimeChange: latest.summary.averageTestTime - previous.summary.averageTestTime
        };
    }
    
    /**
     * レポート生成
     */
    async generateReport(format, includeDetails) {
        const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        let content, filename, mimeType;
        
        switch (format.toLowerCase()) {
            case 'html':
                content = await this.generateHTMLReport(includeDetails);
                filename = `test-report-${timestamp}.html`;
                mimeType = 'text/html';
                break;
                
            case 'json':
                content = JSON.stringify(this.generateJSONReport(includeDetails), null, 2);
                filename = `test-report-${timestamp}.json`;
                mimeType = 'application/json';
                break;
                
            case 'xml':
                content = await this.generateXMLReport(includeDetails);
                filename = `test-report-${timestamp}.xml`;
                mimeType = 'application/xml';
                break;
                
            case 'csv':
                content = await this.generateCSVReport(includeDetails);
                filename = `test-report-${timestamp}.csv`;
                mimeType = 'text/csv';
                break;
                
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        
        // ファイル保存
        const filePath = path.join('/app/reports', filename);
        
        if (REPORTER_CONFIG.export.compression) {
            const compressed = await gzip(content);
            await fs.writeFile(filePath + '.gz', compressed);
            filename += '.gz';
            mimeType = 'application/gzip';
        } else {
            await fs.writeFile(filePath, content);
        }
        
        // レポート情報保存
        this.reports.set(reportId, {
            id: reportId,
            format,
            filename,
            originalName: filename,
            mimeType,
            size: content.length,
            createdAt: new Date().toISOString(),
            includeDetails
        });
        
        logger.info(`Generated report: ${reportId} (${format})`);
        
        return reportId;
    }
    
    /**
     * HTMLレポート生成
     */
    async generateHTMLReport(includeDetails) {
        const metrics = this.getCurrentMetrics();
        const coverage = this.generateCoverageReport();
        
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML Editor - テスト結果レポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f5f5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; }
        .success { border-left-color: #4CAF50; }
        .error { border-left-color: #f44336; }
        .coverage-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { background: #4CAF50; height: 100%; transition: width 0.3s; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .status-passed { color: #4CAF50; font-weight: bold; }
        .status-failed { color: #f44336; font-weight: bold; }
        .status-error { color: #ff9800; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PlantUML Editor - テスト結果レポート</h1>
        <p>実行時間: ${new Date().toLocaleString('ja-JP')}</p>
        <p>テスト実行環境: Docker Swarm (${this.getActiveNodes().length} ノード)</p>
    </div>
    
    <div class="metrics">
        <div class="metric-card success">
            <h3>成功率</h3>
            <h2>${metrics.summary.successRate}%</h2>
            <p>${metrics.summary.passedTests}/${metrics.summary.totalTests} テスト</p>
        </div>
        
        <div class="metric-card">
            <h3>実行時間</h3>
            <h2>${Math.round(metrics.summary.totalDuration / 1000)}秒</h2>
            <p>平均: ${Math.round(metrics.summary.averageTestTime)}ms/テスト</p>
        </div>
        
        <div class="metric-card ${metrics.summary.failedTests > 0 ? 'error' : ''}">
            <h3>失敗テスト</h3>
            <h2>${metrics.summary.failedTests}</h2>
            <p>エラー: ${metrics.summary.errorTests}</p>
        </div>
        
        <div class="metric-card">
            <h3>カバレッジ</h3>
            <h2>${coverage.overall.lines}%</h2>
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${coverage.overall.lines}%"></div>
            </div>
        </div>
    </div>
    
    ${includeDetails ? this.generateDetailedHTMLSection() : ''}
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p>Generated by PlantUML Editor Test Reporter v1.0.0</p>
        <p>Docker Swarm Test Environment - ${new Date().toISOString()}</p>
    </footer>
</body>
</html>`;
    }
    
    /**
     * 詳細HTMLセクション生成
     */
    generateDetailedHTMLSection() {
        // 実装省略（詳細なテスト結果表示）
        return '<h2>詳細結果</h2><p>詳細結果が表示されます...</p>';
    }
    
    /**
     * JSONレポート生成
     */
    generateJSONReport(includeDetails) {
        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                version: '1.0.0',
                environment: 'Docker Swarm',
                includeDetails
            },
            metrics: this.getCurrentMetrics(),
            coverage: this.generateCoverageReport(),
            nodes: this.getActiveNodes()
        };
        
        if (includeDetails) {
            report.results = Array.from(this.results.values());
            report.failures = Array.from(this.failures.values());
        }
        
        return report;
    }
    
    /**
     * XMLレポート生成
     */
    async generateXMLReport(includeDetails) {
        const metrics = this.getCurrentMetrics();
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<testReport>
    <metadata>
        <generatedAt>${new Date().toISOString()}</generatedAt>
        <version>1.0.0</version>
        <environment>Docker Swarm</environment>
    </metadata>
    <summary>
        <totalTests>${metrics.summary.totalTests}</totalTests>
        <passedTests>${metrics.summary.passedTests}</passedTests>
        <failedTests>${metrics.summary.failedTests}</failedTests>
        <errorTests>${metrics.summary.errorTests}</errorTests>
        <successRate>${metrics.summary.successRate}</successRate>
        <totalDuration>${metrics.summary.totalDuration}</totalDuration>
    </summary>
</testReport>`;
    }
    
    /**
     * CSVレポート生成
     */
    async generateCSVReport(includeDetails) {
        const headers = ['Test Path', 'Category', 'Status', 'Duration (ms)', 'Node ID', 'Start Time', 'End Time'];
        const rows = [headers.join(',')];
        
        for (const result of this.results.values()) {
            if (result.results) {
                for (const test of result.results) {
                    const row = [
                        `"${test.path}"`,
                        test.category,
                        test.status,
                        test.duration,
                        result.nodeId,
                        test.startTime,
                        test.endTime
                    ];
                    rows.push(row.join(','));
                }
            }
        }
        
        return rows.join('\n');
    }
    
    /**
     * ダッシュボードHTML生成
     */
    generateDashboardHTML() {
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML Editor - テスト監視ダッシュボード</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .status-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .refresh-btn { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #45a049; }
    </style>
    <script>
        function refreshData() {
            location.reload();
        }
        
        function autoRefresh() {
            setInterval(refreshData, 30000); // 30秒ごと
        }
        
        window.onload = autoRefresh;
    </script>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>PlantUML Editor - リアルタイムテスト監視</h1>
            <button class="refresh-btn" onclick="refreshData()">データ更新</button>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <h3>システム状態</h3>
                <p>Status: <strong>Running</strong></p>
                <p>Active Nodes: <strong>${this.getActiveNodes().length}</strong></p>
                <p>Processing: <strong>${this.isProcessing ? 'Yes' : 'No'}</strong></p>
            </div>
            
            <div class="status-card">
                <h3>テスト統計</h3>
                <p>Total: <strong>${this.metrics.totalTests}</strong></p>
                <p>Passed: <strong>${this.metrics.passedTests}</strong></p>
                <p>Failed: <strong>${this.metrics.failedTests}</strong></p>
            </div>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3>API エンドポイント</h3>
            <ul>
                <li><a href="/api/metrics">リアルタイムメトリクス</a></li>
                <li><a href="/api/results">テスト結果一覧</a></li>
                <li><a href="/api/coverage">カバレッジレポート</a></li>
                <li><a href="/api/performance">パフォーマンス統計</a></li>
            </ul>
        </div>
    </div>
</body>
</html>`;
    }
    
    /**
     * 優雅なシャットダウン
     */
    async gracefulShutdown() {
        logger.info('Graceful shutdown initiated');
        
        try {
            // サーバーの停止
            if (this.server) {
                this.server.close();
            }
            
            // 最終レポート生成
            await this.generateReport('json', true);
            
            // Redis接続の終了
            this.redis.disconnect();
            
            logger.info('Graceful shutdown completed');
            
        } catch (error) {
            logger.error('Error during graceful shutdown:', error);
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
        const reporter = new SwarmTestReporter();
        await reporter.initialize();
        
        // シャットダウンハンドラー
        process.on('SIGTERM', () => reporter.gracefulShutdown());
        process.on('SIGINT', () => reporter.gracefulShutdown());
        
        logger.info('Swarm Test Reporter started successfully');
        
    } catch (error) {
        logger.error('Fatal error:', error);
        process.exit(1);
    }
}

// プロセス起動
if (require.main === module) {
    main();
}

module.exports = { SwarmTestReporter, REPORTER_CONFIG };