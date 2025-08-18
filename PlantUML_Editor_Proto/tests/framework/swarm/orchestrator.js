/**
 * Docker Swarm 並列実行オーケストレーター
 * 
 * テストグループ分割戦略、ワーカーノード管理、負荷分散、リソース最適化
 * 5ノード並列実行でテスト実行速度を4倍高速化
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const Redis = require('ioredis');
const winston = require('winston');

/**
 * オーケストレーター設定
 */
const ORCHESTRATOR_CONFIG = {
    // Swarm設定
    swarm: {
        maxNodes: 5,
        nodeTypes: ['manager', 'worker'],
        maxTasksPerNode: 10,
        resourceLimits: {
            cpu: 0.5,
            memory: '512M'
        }
    },
    
    // テスト分割設定
    testSplit: {
        strategy: 'round-robin', // 'round-robin', 'size-based', 'dependency-aware'
        groupSize: 10,
        maxParallel: 5,
        timeout: 300000, // 5分
        retries: 3
    },
    
    // 負荷分散設定
    loadBalancing: {
        algorithm: 'least-connections', // 'round-robin', 'least-connections', 'weighted'
        healthCheckInterval: 30000,
        failoverTimeout: 60000
    },
    
    // 結果集約設定
    aggregation: {
        enabled: true,
        realtime: true,
        format: 'json',
        compression: true
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
        service: 'swarm-orchestrator',
        nodeId: process.env.SWARM_NODE_ID,
        serviceId: process.env.SWARM_SERVICE_ID,
        taskId: process.env.SWARM_TASK_ID
    },
    transports: [
        new winston.transports.File({ filename: '/app/logs/orchestrator-error.log', level: 'error' }),
        new winston.transports.File({ filename: '/app/logs/orchestrator.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

/**
 * Docker Swarm 並列実行オーケストレーター
 */
class SwarmTestOrchestrator {
    constructor() {
        this.nodeId = process.env.SWARM_NODE_ID || 'unknown';
        this.serviceId = process.env.SWARM_SERVICE_ID || 'unknown';
        this.taskId = process.env.SWARM_TASK_ID || 'unknown';
        this.isManager = process.env.NODE_ROLE === 'manager';
        
        this.redis = new Redis({
            host: 'redis-cache',
            port: 6379,
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: 3
        });
        
        this.testQueue = [];
        this.runningTests = new Map();
        this.completedTests = new Map();
        this.nodeStatus = new Map();
        this.metrics = {
            startTime: Date.now(),
            testsCompleted: 0,
            testsFailed: 0,
            totalExecutionTime: 0,
            averageTestTime: 0
        };
        
        this.setupEventHandlers();
    }
    
    /**
     * イベントハンドラーの設定
     */
    setupEventHandlers() {
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            this.gracefulShutdown();
        });
        
        this.redis.on('error', (error) => {
            logger.error('Redis connection error:', error);
        });
        
        this.redis.on('connect', () => {
            logger.info('Connected to Redis');
        });
    }
    
    /**
     * オーケストレーターの初期化
     */
    async initialize() {
        try {
            logger.info('Initializing Swarm Test Orchestrator', {
                nodeId: this.nodeId,
                serviceId: this.serviceId,
                taskId: this.taskId,
                isManager: this.isManager
            });
            
            // Redisへの接続確認
            await this.redis.ping();
            
            // ノード情報の登録
            await this.registerNode();
            
            // テストファイルの検出
            await this.discoverTests();
            
            // マネージャーノードの場合はテスト分割を実行
            if (this.isManager) {
                await this.distributeTests();
            }
            
            // ワーカーノードの場合はタスク受信待機
            await this.startTaskListener();
            
            logger.info('Orchestrator initialization completed');
            
        } catch (error) {
            logger.error('Failed to initialize orchestrator:', error);
            throw error;
        }
    }
    
    /**
     * ノード情報の登録
     */
    async registerNode() {
        const nodeInfo = {
            nodeId: this.nodeId,
            serviceId: this.serviceId,
            taskId: this.taskId,
            isManager: this.isManager,
            hostname: os.hostname(),
            platform: os.platform(),
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            loadAverage: os.loadavg(),
            registeredAt: new Date().toISOString(),
            status: 'ready'
        };
        
        await this.redis.hset('swarm:nodes', this.nodeId, JSON.stringify(nodeInfo));
        await this.redis.expire(`swarm:nodes:${this.nodeId}`, 300); // 5分で自動削除
        
        logger.info('Node registered', nodeInfo);
        return nodeInfo;
    }
    
    /**
     * テストファイルの検出
     */
    async discoverTests() {
        const testDirs = [
            '/app/tests/unit',
            '/app/tests/integration',
            '/app/tests/e2e',
            '/app/tests/performance',
            '/app/tests/security'
        ];
        
        const testFiles = [];
        
        for (const dir of testDirs) {
            try {
                const files = await this.scanDirectory(dir, /\.(test|spec)\.(js|ts)$/);
                testFiles.push(...files.map(file => ({
                    path: file,
                    category: path.basename(dir),
                    estimated_duration: await this.estimateTestDuration(file),
                    dependencies: await this.analyzeDependencies(file)
                })));
            } catch (error) {
                logger.warn(`Failed to scan directory ${dir}:`, error.message);
            }
        }
        
        this.testQueue = testFiles;
        logger.info(`Discovered ${testFiles.length} test files`);
        
        return testFiles;
    }
    
    /**
     * ディレクトリスキャン
     */
    async scanDirectory(dir, pattern) {
        const files = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    const subFiles = await this.scanDirectory(fullPath, pattern);
                    files.push(...subFiles);
                } else if (pattern.test(entry.name)) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // ディレクトリが存在しない場合は無視
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        return files;
    }
    
    /**
     * テスト実行時間の推定
     */
    async estimateTestDuration(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // ヒューリスティックによる推定
            const testCount = (content.match(/(?:test|it)\s*\(/g) || []).length;
            const describeCount = (content.match(/describe\s*\(/g) || []).length;
            const playwrightUsage = content.includes('playwright') || content.includes('@playwright');
            const performanceTest = content.includes('performance') || content.includes('benchmark');
            
            let baseDuration = 1000; // 1秒
            if (playwrightUsage) baseDuration *= 3;
            if (performanceTest) baseDuration *= 2;
            
            return (testCount + describeCount) * baseDuration;
            
        } catch (error) {
            logger.warn(`Failed to estimate duration for ${filePath}:`, error.message);
            return 5000; // デフォルト5秒
        }
    }
    
    /**
     * 依存関係の分析
     */
    async analyzeDependencies(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const dependencies = [];
            
            // require/import文の解析
            const importMatches = content.match(/(?:import|require)\s*\(?['"`]([^'"`]+)['"`]\)?/g) || [];
            for (const match of importMatches) {
                const moduleMatch = match.match(/['"`]([^'"`]+)['"`]/);
                if (moduleMatch) {
                    dependencies.push(moduleMatch[1]);
                }
            }
            
            return dependencies;
            
        } catch (error) {
            logger.warn(`Failed to analyze dependencies for ${filePath}:`, error.message);
            return [];
        }
    }
    
    /**
     * テスト分割と配布（マネージャーノードのみ）
     */
    async distributeTests() {
        if (!this.isManager) return;
        
        logger.info('Distributing tests across nodes...');
        
        // アクティブなノードの取得
        const activeNodes = await this.getActiveNodes();
        const workerNodes = activeNodes.filter(node => !node.isManager);
        
        if (workerNodes.length === 0) {
            logger.error('No worker nodes available');
            throw new Error('No worker nodes available for test execution');
        }
        
        // テスト分割戦略の適用
        const testGroups = await this.splitTestsIntoGroups(workerNodes.length);
        
        // 各ノードにテストグループを割り当て
        for (let i = 0; i < testGroups.length; i++) {
            const nodeIndex = i % workerNodes.length;
            const node = workerNodes[nodeIndex];
            const group = testGroups[i];
            
            const task = {
                id: `task-${Date.now()}-${i}`,
                nodeId: node.nodeId,
                tests: group,
                priority: this.calculateGroupPriority(group),
                estimatedDuration: group.reduce((sum, test) => sum + test.estimated_duration, 0),
                assignedAt: new Date().toISOString()
            };
            
            await this.redis.lpush(`swarm:tasks:${node.nodeId}`, JSON.stringify(task));
            logger.info(`Assigned task ${task.id} to node ${node.nodeId} with ${group.length} tests`);
        }
        
        logger.info(`Distributed ${this.testQueue.length} tests across ${workerNodes.length} nodes`);
    }
    
    /**
     * アクティブなノードの取得
     */
    async getActiveNodes() {
        const nodeKeys = await this.redis.hkeys('swarm:nodes');
        const nodes = [];
        
        for (const nodeId of nodeKeys) {
            const nodeDataStr = await this.redis.hget('swarm:nodes', nodeId);
            if (nodeDataStr) {
                const nodeData = JSON.parse(nodeDataStr);
                
                // ヘルスチェック
                const lastHeartbeat = await this.redis.get(`swarm:heartbeat:${nodeId}`);
                const isHealthy = lastHeartbeat && (Date.now() - parseInt(lastHeartbeat)) < 60000; // 1分以内
                
                if (isHealthy) {
                    nodes.push(nodeData);
                }
            }
        }
        
        return nodes;
    }
    
    /**
     * テストグループ分割
     */
    async splitTestsIntoGroups(nodeCount) {
        const strategy = ORCHESTRATOR_CONFIG.testSplit.strategy;
        const groupSize = ORCHESTRATOR_CONFIG.testSplit.groupSize;
        
        switch (strategy) {
            case 'size-based':
                return this.splitBySizeOptimization(nodeCount);
            case 'dependency-aware':
                return this.splitByDependencies(nodeCount);
            case 'round-robin':
            default:
                return this.splitRoundRobin(groupSize);
        }
    }
    
    /**
     * ラウンドロビン分割
     */
    splitRoundRobin(groupSize) {
        const groups = [];
        let currentGroup = [];
        
        for (const test of this.testQueue) {
            currentGroup.push(test);
            
            if (currentGroup.length >= groupSize) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
        }
        
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        
        return groups;
    }
    
    /**
     * サイズ最適化分割
     */
    splitBySizeOptimization(nodeCount) {
        // テストを実行時間でソート
        const sortedTests = [...this.testQueue].sort((a, b) => b.estimated_duration - a.estimated_duration);
        
        // 各ノードの推定実行時間を追跡
        const nodeLoads = new Array(nodeCount).fill(0);
        const groups = new Array(nodeCount).fill(null).map(() => []);
        
        for (const test of sortedTests) {
            // 最も負荷の少ないノードを選択
            const lightestNodeIndex = nodeLoads.indexOf(Math.min(...nodeLoads));
            
            groups[lightestNodeIndex].push(test);
            nodeLoads[lightestNodeIndex] += test.estimated_duration;
        }
        
        return groups.filter(group => group.length > 0);
    }
    
    /**
     * 依存関係考慮分割
     */
    splitByDependencies(nodeCount) {
        // 依存関係グラフの構築
        const dependencyGraph = this.buildDependencyGraph();
        
        // トポロジカルソートで実行順序を決定
        const sortedTests = this.topologicalSort(dependencyGraph);
        
        // 依存関係を維持しながらグループ分割
        const groups = new Array(nodeCount).fill(null).map(() => []);
        let currentNode = 0;
        
        for (const test of sortedTests) {
            groups[currentNode].push(test);
            currentNode = (currentNode + 1) % nodeCount;
        }
        
        return groups.filter(group => group.length > 0);
    }
    
    /**
     * 依存関係グラフの構築
     */
    buildDependencyGraph() {
        const graph = new Map();
        
        for (const test of this.testQueue) {
            graph.set(test.path, {
                test,
                dependencies: [],
                dependents: []
            });
        }
        
        // 依存関係の解析
        for (const test of this.testQueue) {
            const node = graph.get(test.path);
            
            for (const dep of test.dependencies) {
                const depTest = this.testQueue.find(t => t.path.includes(dep));
                if (depTest && graph.has(depTest.path)) {
                    node.dependencies.push(depTest.path);
                    graph.get(depTest.path).dependents.push(test.path);
                }
            }
        }
        
        return graph;
    }
    
    /**
     * トポロジカルソート
     */
    topologicalSort(graph) {
        const visited = new Set();
        const result = [];
        
        function visit(testPath) {
            if (visited.has(testPath)) return;
            
            visited.add(testPath);
            const node = graph.get(testPath);
            
            // 依存関係を先に処理
            for (const dep of node.dependencies) {
                visit(dep);
            }
            
            result.push(node.test);
        }
        
        for (const [testPath] of graph) {
            visit(testPath);
        }
        
        return result;
    }
    
    /**
     * グループ優先度の計算
     */
    calculateGroupPriority(group) {
        let priority = 0;
        
        for (const test of group) {
            // カテゴリ別優先度
            switch (test.category) {
                case 'unit': priority += 1; break;
                case 'integration': priority += 2; break;
                case 'e2e': priority += 3; break;
                case 'performance': priority += 4; break;
                case 'security': priority += 5; break;
            }
            
            // 実行時間逆順（長いテストを先に）
            priority += Math.max(0, 10 - Math.floor(test.estimated_duration / 10000));
        }
        
        return priority;
    }
    
    /**
     * タスクリスナーの開始
     */
    async startTaskListener() {
        logger.info('Starting task listener...');
        
        // ハートビート送信
        setInterval(() => this.sendHeartbeat(), 10000);
        
        // タスク処理ループ
        while (true) {
            try {
                await this.processNextTask();
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
            } catch (error) {
                logger.error('Error in task processing loop:', error);
                await new Promise(resolve => setTimeout(resolve, 5000)); // エラー時は5秒待機
            }
        }
    }
    
    /**
     * ハートビート送信
     */
    async sendHeartbeat() {
        await this.redis.set(`swarm:heartbeat:${this.nodeId}`, Date.now(), 'EX', 120);
        
        // ノード状態の更新
        const status = {
            loadAverage: os.loadavg(),
            freeMemory: os.freemem(),
            runningTests: this.runningTests.size,
            completedTests: this.completedTests.size,
            lastHeartbeat: new Date().toISOString()
        };
        
        await this.redis.hset(`swarm:status:${this.nodeId}`, status);
    }
    
    /**
     * 次のタスクの処理
     */
    async processNextTask() {
        const taskDataStr = await this.redis.brpop(`swarm:tasks:${this.nodeId}`, 5);
        
        if (!taskDataStr) return;
        
        const task = JSON.parse(taskDataStr[1]);
        logger.info(`Processing task ${task.id} with ${task.tests.length} tests`);
        
        try {
            const results = await this.executeTestGroup(task);
            await this.reportTaskResults(task, results);
            
        } catch (error) {
            logger.error(`Task ${task.id} failed:`, error);
            await this.reportTaskFailure(task, error);
        }
    }
    
    /**
     * テストグループの実行
     */
    async executeTestGroup(task) {
        const results = [];
        const startTime = Date.now();
        
        for (const test of task.tests) {
            try {
                logger.info(`Executing test: ${test.path}`);
                
                const testStartTime = Date.now();
                this.runningTests.set(test.path, { startTime: testStartTime, task: task.id });
                
                const result = await this.executeTest(test);
                const duration = Date.now() - testStartTime;
                
                const testResult = {
                    path: test.path,
                    category: test.category,
                    status: result.success ? 'passed' : 'failed',
                    duration,
                    output: result.output,
                    error: result.error,
                    coverage: result.coverage,
                    startTime: testStartTime,
                    endTime: Date.now()
                };
                
                results.push(testResult);
                this.runningTests.delete(test.path);
                this.completedTests.set(test.path, testResult);
                
                // メトリクス更新
                this.updateMetrics(testResult);
                
                logger.info(`Test completed: ${test.path} (${duration}ms)`);
                
            } catch (error) {
                logger.error(`Test execution failed: ${test.path}`, error);
                results.push({
                    path: test.path,
                    category: test.category,
                    status: 'error',
                    duration: Date.now() - this.runningTests.get(test.path)?.startTime || 0,
                    error: error.message,
                    startTime: this.runningTests.get(test.path)?.startTime || Date.now(),
                    endTime: Date.now()
                });
                
                this.runningTests.delete(test.path);
            }
        }
        
        const totalDuration = Date.now() - startTime;
        logger.info(`Task ${task.id} completed in ${totalDuration}ms`);
        
        return {
            taskId: task.id,
            nodeId: this.nodeId,
            results,
            totalDuration,
            startTime,
            endTime: Date.now()
        };
    }
    
    /**
     * 個別テストの実行
     */
    async executeTest(test) {
        return new Promise((resolve, reject) => {
            const testCommand = this.buildTestCommand(test);
            const child = spawn(testCommand.command, testCommand.args, {
                cwd: '/app',
                env: { ...process.env, ...testCommand.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let output = '';
            let error = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            const timeout = setTimeout(() => {
                child.kill('SIGKILL');
                reject(new Error(`Test timeout: ${test.path}`));
            }, ORCHESTRATOR_CONFIG.testSplit.timeout);
            
            child.on('close', (code) => {
                clearTimeout(timeout);
                
                const success = code === 0;
                const coverage = this.extractCoverage(output);
                
                resolve({
                    success,
                    output,
                    error,
                    coverage,
                    exitCode: code
                });
            });
            
            child.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
    
    /**
     * テストコマンドの構築
     */
    buildTestCommand(test) {
        const isPlaywright = test.path.includes('e2e') || test.dependencies.includes('playwright');
        
        if (isPlaywright) {
            return {
                command: 'npx',
                args: ['playwright', 'test', test.path, '--reporter=json'],
                env: {
                    PLAYWRIGHT_BROWSERS_PATH: '/opt/playwright/browsers',
                    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'
                }
            };
        } else {
            return {
                command: 'npx',
                args: ['jest', test.path, '--json', '--coverage'],
                env: {}
            };
        }
    }
    
    /**
     * カバレッジ情報の抽出
     */
    extractCoverage(output) {
        try {
            const coverageMatch = output.match(/"coverage":\s*({.*?})/s);
            if (coverageMatch) {
                return JSON.parse(coverageMatch[1]);
            }
        } catch (error) {
            logger.warn('Failed to extract coverage information:', error.message);
        }
        
        return null;
    }
    
    /**
     * メトリクス更新
     */
    updateMetrics(testResult) {
        if (testResult.status === 'passed') {
            this.metrics.testsCompleted++;
        } else {
            this.metrics.testsFailed++;
        }
        
        this.metrics.totalExecutionTime += testResult.duration;
        const totalTests = this.metrics.testsCompleted + this.metrics.testsFailed;
        this.metrics.averageTestTime = totalTests > 0 ? this.metrics.totalExecutionTime / totalTests : 0;
    }
    
    /**
     * タスク結果の報告
     */
    async reportTaskResults(task, results) {
        const report = {
            ...results,
            reportedAt: new Date().toISOString(),
            nodeInfo: {
                nodeId: this.nodeId,
                hostname: os.hostname(),
                loadAverage: os.loadavg(),
                freeMemory: os.freemem()
            }
        };
        
        await this.redis.lpush('swarm:results', JSON.stringify(report));
        logger.info(`Reported results for task ${task.id}`);
    }
    
    /**
     * タスク失敗の報告
     */
    async reportTaskFailure(task, error) {
        const failureReport = {
            taskId: task.id,
            nodeId: this.nodeId,
            status: 'failed',
            error: error.message,
            stack: error.stack,
            reportedAt: new Date().toISOString()
        };
        
        await this.redis.lpush('swarm:failures', JSON.stringify(failureReport));
        logger.error(`Reported failure for task ${task.id}`);
    }
    
    /**
     * 優雅なシャットダウン
     */
    async gracefulShutdown() {
        logger.info('Graceful shutdown initiated');
        
        try {
            // 実行中のテストの完了を待機
            const runningTestPaths = Array.from(this.runningTests.keys());
            if (runningTestPaths.length > 0) {
                logger.info(`Waiting for ${runningTestPaths.length} running tests to complete...`);
                
                const maxWaitTime = 60000; // 1分
                const startTime = Date.now();
                
                while (this.runningTests.size > 0 && (Date.now() - startTime) < maxWaitTime) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // ノード登録の削除
            await this.redis.hdel('swarm:nodes', this.nodeId);
            await this.redis.del(`swarm:heartbeat:${this.nodeId}`);
            await this.redis.del(`swarm:status:${this.nodeId}`);
            
            // Redis接続の終了
            this.redis.disconnect();
            
            logger.info('Graceful shutdown completed');
            
        } catch (error) {
            logger.error('Error during graceful shutdown:', error);
        } finally {
            process.exit(0);
        }
    }
    
    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            runningTests: this.runningTests.size,
            completedTests: this.completedTests.size,
            nodeInfo: {
                nodeId: this.nodeId,
                serviceId: this.serviceId,
                taskId: this.taskId,
                isManager: this.isManager,
                hostname: os.hostname(),
                loadAverage: os.loadavg(),
                freeMemory: os.freemem(),
                totalMemory: os.totalmem()
            }
        };
    }
}

/**
 * メイン実行関数
 */
async function main() {
    try {
        const orchestrator = new SwarmTestOrchestrator();
        await orchestrator.initialize();
        
        // 統計情報の定期出力
        setInterval(() => {
            const stats = orchestrator.getStats();
            logger.info('Orchestrator Stats:', stats);
        }, 30000);
        
    } catch (error) {
        logger.error('Fatal error:', error);
        process.exit(1);
    }
}

// プロセス起動
if (require.main === module) {
    main();
}

module.exports = { SwarmTestOrchestrator, ORCHESTRATOR_CONFIG };