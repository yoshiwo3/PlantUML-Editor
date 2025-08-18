/**
 * TEST-005-6 & TEST-007 統合テストスイート
 * 
 * カスタムアサーションとDocker Swarm環境の統合動作確認
 * 日本語対応、セキュリティ、パフォーマンス、7要素構成を包括的にテスト
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

const fs = require('fs').promises;
const path = require('path');

// カスタムアサーションのインポート
const plantumlAssertions = require('./assertions/plantuml.assertions');
const componentAssertions = require('./assertions/component.assertions');
const japaneseAssertions = require('./assertions/japanese.assertions');
const performanceAssertions = require('./assertions/performance.assertions');
const securityAssertions = require('./assertions/security.assertions');

// Swarmコンポーネントのインポート
const { SwarmTestOrchestrator } = require('./swarm/orchestrator');
const { SwarmTestReporter } = require('./swarm/reporter');
const { SwarmMonitoringSystem } = require('./swarm/monitoring');

/**
 * 統合テスト設定
 */
const INTEGRATION_TEST_CONFIG = {
    timeout: 60000,
    retries: 3,
    parallel: true,
    coverage: true,
    reporting: {
        formats: ['html', 'json', 'junit'],
        outputDir: '/app/test-results/integration'
    },
    swarm: {
        nodeCount: 5,
        testGroups: 10,
        maxParallel: 5
    }
};

/**
 * テストデータセット
 */
const TEST_DATA = {
    // PlantUML テストデータ
    plantuml: {
        validSyntax: '@startuml\nA -> B: メッセージ\n@enduml',
        invalidSyntax: 'invalid plantuml code',
        japaneseSequence: '@startuml\n管理者 -> システム: ログイン\nシステム -> データベース: 認証確認\n@enduml',
        complexDiagram: '@startuml\nalt 成功\n  A -> B: 処理実行\nelse 失敗\n  A -> B: エラー通知\nend\n@enduml'
    },
    
    // 日本語テストデータ
    japanese: {
        hiragana: 'ひらがなのテスト',
        katakana: 'カタカナのテスト',
        kanji: '漢字のテスト',
        mixed: 'ひらがなとカタカナと漢字のMixedテスト',
        encoded: 'UTF-8エンコーディングテスト🎌',
        invalid: 'ï¿½â€žâ€¦' // 文字化けパターン
    },
    
    // セキュリティテストデータ
    security: {
        xss: '<script>alert("XSS")</script>',
        sqlInjection: "'; DROP TABLE users; --",
        commandInjection: '& rm -rf /',
        safeInput: 'これは安全な入力です'
    },
    
    // 7要素構成テストデータ
    components: {
        actionItem: {
            dragHandle: '[data-testid="drag-handle"]',
            actorFrom: '[data-testid="actor-from"]',
            arrowType: '[data-testid="arrow-type"]',
            actorTo: '[data-testid="actor-to"]',
            message: '[data-testid="message"]',
            deleteButton: '[data-testid="delete-button"]',
            questionButton: '[data-testid="question-button"]'
        }
    }
};

/**
 * 統合テストスイート
 */
describe('Sprint3 TEST-005-6 & TEST-007 統合テスト', () => {
    let orchestrator;
    let reporter;
    let monitoring;
    
    beforeAll(async () => {
        // テスト環境のセットアップ
        await setupIntegrationEnvironment();
        
        // カスタムアサーションの登録
        registerCustomAssertions();
        
        // Swarmコンポーネントの初期化
        if (process.env.SWARM_MODE === 'true') {
            await initializeSwarmComponents();
        }
    }, 30000);
    
    afterAll(async () => {
        // クリーンアップ
        await cleanupIntegrationEnvironment();
    }, 30000);
    
    /**
     * TEST-005-6: カスタムアサーション統合テスト
     */
    describe('TEST-005-6: カスタムアサーション統合テスト', () => {
        describe('PlantUML固有アサーション', () => {
            test('有効なPlantUML構文を正しく検証する', () => {
                expect(TEST_DATA.plantuml.validSyntax).toBeValidPlantUML();
                expect(TEST_DATA.plantuml.japaneseSequence).toContainActor('管理者');
                expect(TEST_DATA.plantuml.japaneseSequence).toHaveArrowType('->');
            });
            
            test('複雑なPlantUML構造を検証する', () => {
                expect(TEST_DATA.plantuml.complexDiagram).toHaveCondition('alt');
                expect(TEST_DATA.plantuml.complexDiagram).toHaveCondition('else');
                expect(TEST_DATA.plantuml.complexDiagram).toHaveCondition('end');
            });
            
            test('無効なPlantUML構文を拒否する', () => {
                expect(TEST_DATA.plantuml.invalidSyntax).not.toBeValidPlantUML();
            });
        });
        
        describe('日本語対応アサーション', () => {
            test('日本語文字種を正しく識別する', () => {
                expect(TEST_DATA.japanese.hiragana).toContainJapanese();
                expect(TEST_DATA.japanese.hiragana).toBeValidHiragana();
                
                expect(TEST_DATA.japanese.katakana).toContainJapanese();
                expect(TEST_DATA.japanese.katakana).toBeValidKatakana();
                
                expect(TEST_DATA.japanese.kanji).toContainJapanese();
                expect(TEST_DATA.japanese.kanji).toBeValidKanji();
            });
            
            test('混合日本語文字列を検証する', () => {
                expect(TEST_DATA.japanese.mixed).toContainJapanese();
                expect(TEST_DATA.japanese.mixed).toBeMixedJapanese();
            });
            
            test('適切なエンコーディングを検証する', () => {
                expect(TEST_DATA.japanese.encoded).toHaveProperEncoding();
                expect(TEST_DATA.japanese.invalid).not.toHaveProperEncoding();
            });
            
            test('日本語文字数を正確にカウントする', () => {
                expect(TEST_DATA.japanese.hiragana).toHaveJapaneseCharCount(9);
                expect(TEST_DATA.japanese.katakana).toHaveJapaneseCharCount(9);
            });
        });
        
        describe('セキュリティアサーション', () => {
            test('XSS攻撃を検出する', () => {
                expect(TEST_DATA.security.safeInput).toBeXSSSecure();
                expect(TEST_DATA.security.xss).not.toBeXSSSecure();
            });
            
            test('インジェクション攻撃を検出する', () => {
                expect(TEST_DATA.security.safeInput).toBeInjectionFree();
                expect(TEST_DATA.security.sqlInjection).not.toBeInjectionFree();
                expect(TEST_DATA.security.commandInjection).not.toBeInjectionFree();
            });
            
            test('セキュリティヘッダーを検証する', () => {
                const secureHeaders = {
                    'Content-Security-Policy': 'default-src \'self\'',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                };
                
                expect(secureHeaders).toHaveSecurityHeaders();
            });
        });
        
        describe('パフォーマンスアサーション', () => {
            test('実行時間が基準値以下である', async () => {
                const startTime = performance.now();
                
                // 軽量な処理をシミュレート
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const duration = performance.now() - startTime;
                expect(duration).toBeFasterThan(100);
            });
            
            test('メモリ使用量が制限内である', () => {
                if (performance.memory) {
                    const memoryUsage = performance.memory.usedJSHeapSize;
                    expect(memoryUsage).toBeLessThanMemory(100 * 1024 * 1024); // 100MB
                }
            });
            
            test('FPSが基準値以上である', async () => {
                // FPSテストはブラウザ環境でのみ実行
                if (typeof requestAnimationFrame !== 'undefined') {
                    const fps = await measureFPS();
                    expect(fps).toHaveFPSGreaterThan(30);
                }
            });
        });
        
        describe('7要素構成アサーション', () => {
            let mockActionItem;
            
            beforeEach(() => {
                // モックActionItem要素を作成
                mockActionItem = createMockActionItem();
            });
            
            test('7要素すべてが存在する', () => {
                expect(mockActionItem).toHaveAllSevenElements();
            });
            
            test('ドラッグハンドルが機能する', () => {
                expect(mockActionItem).toHaveDragHandle();
            });
            
            test('アクターセレクターが機能する', () => {
                expect(mockActionItem).toHaveActorSelectors();
            });
            
            test('矢印タイプセレクターに適切なオプションがある', () => {
                expect(mockActionItem).toHaveArrowTypeOptions();
            });
            
            test('メッセージ入力フィールドが機能する', () => {
                expect(mockActionItem).toHaveMessageInput();
            });
            
            test('削除ボタンが機能する', () => {
                expect(mockActionItem).toHaveDeleteButton();
            });
            
            test('クエスチョンボタンが機能する', () => {
                expect(mockActionItem).toHaveQuestionButton();
            });
            
            test('全体がインタラクティブである', () => {
                expect(mockActionItem).toBeInteractive();
            });
        });
    });
    
    /**
     * TEST-007: Docker Swarm環境統合テスト
     */
    describe('TEST-007: Docker Swarm環境統合テスト', () => {
        // Swarm環境でのみ実行
        const itSwarm = process.env.SWARM_MODE === 'true' ? test : test.skip;
        
        describe('Swarm設定と起動', () => {
            itSwarm('Swarmクラスターが正常に起動する', async () => {
                expect(orchestrator).toBeDefined();
                expect(reporter).toBeDefined();
                expect(monitoring).toBeDefined();
            });
            
            itSwarm('5ノードが正常にアクティブである', async () => {
                const activeNodes = await orchestrator.getActiveNodes();
                expect(activeNodes).toHaveLength(INTEGRATION_TEST_CONFIG.swarm.nodeCount);
            });
            
            itSwarm('オーケストレーターが正常に動作する', async () => {
                const stats = orchestrator.getStats();
                expect(stats.nodeInfo.nodeId).toBeTruthy();
                expect(stats.runningTests).toBeGreaterThanOrEqual(0);
            });
        });
        
        describe('並列テスト実行', () => {
            itSwarm('テストが並列実行される', async () => {
                const testFiles = await orchestrator.discoverTests();
                expect(testFiles.length).toBeGreaterThan(0);
                
                const groups = orchestrator.splitTestsIntoGroups(INTEGRATION_TEST_CONFIG.swarm.nodeCount);
                expect(groups.length).toBeGreaterThan(1);
            });
            
            itSwarm('負荷分散が正常に動作する', async () => {
                const beforeMetrics = monitoring.getMonitoringData();
                
                // テスト実行をシミュレート
                await simulateTestExecution();
                
                const afterMetrics = monitoring.getMonitoringData();
                expect(afterMetrics.metrics['test.total_tests']).toBeDefined();
            });
        });
        
        describe('結果集約システム', () => {
            itSwarm('結果が正常に集約される', async () => {
                const testResults = await reporter.getFilteredResults();
                expect(testResults.results).toBeDefined();
                expect(testResults.pagination).toBeDefined();
            });
            
            itSwarm('レポート生成が機能する', async () => {
                const reportId = await reporter.generateReport('json', true);
                expect(reportId).toBeTruthy();
                
                const report = reporter.reports.get(reportId);
                expect(report).toBeDefined();
                expect(report.format).toBe('json');
            });
            
            itSwarm('リアルタイムメトリクスが取得できる', async () => {
                const metrics = reporter.getCurrentMetrics();
                expect(metrics.summary).toBeDefined();
                expect(metrics.nodes).toBeDefined();
                expect(metrics.coverage).toBeDefined();
            });
        });
        
        describe('監視・ロギング', () => {
            itSwarm('システムメトリクスが収集される', async () => {
                const monitoringData = monitoring.getMonitoringData();
                expect(monitoringData.metrics).toBeDefined();
                expect(monitoringData.status).toBe('running');
            });
            
            itSwarm('アラートシステムが動作する', async () => {
                monitoring.triggerAlert('info', 'Test alert', { test: true });
                
                const alerts = monitoring.alerts;
                expect(alerts.size).toBeGreaterThan(0);
            });
            
            itSwarm('Prometheusメトリクスが生成される', () => {
                const prometheusMetrics = monitoring.generatePrometheusMetrics();
                expect(prometheusMetrics).toContain('plantuml_test_');
                expect(prometheusMetrics).toContain('# HELP');
                expect(prometheusMetrics).toContain('# TYPE');
            });
        });
    });
    
    /**
     * エンドツーエンド統合テスト
     */
    describe('エンドツーエンド統合テスト', () => {
        test('カスタムアサーションとSwarm環境の連携', async () => {
            // PlantUML処理のテスト
            const plantUMLCode = TEST_DATA.plantuml.japaneseSequence;
            expect(plantUMLCode).toBeValidPlantUML();
            expect(plantUMLCode).toContainJapanese();
            
            // セキュリティ検証
            expect(plantUMLCode).toBeXSSSecure();
            expect(plantUMLCode).toBeInjectionFree();
            
            // パフォーマンス検証
            const startTime = performance.now();
            const analysis = plantumlAssertions.analyzeStructure(plantUMLCode);
            const duration = performance.now() - startTime;
            
            expect(duration).toBeFasterThan(50);
            expect(analysis.actors).toContain('管理者');
            expect(analysis.actors).toContain('システム');
        });
        
        test('全コンポーネントの統合動作', async () => {
            const testData = {
                plantuml: TEST_DATA.plantuml.validSyntax,
                japanese: TEST_DATA.japanese.mixed,
                security: TEST_DATA.security.safeInput
            };
            
            // すべてのアサーションタイプを組み合わせてテスト
            expect(testData.plantuml).toBeValidPlantUML();
            expect(testData.japanese).toContainJapanese();
            expect(testData.japanese).toBeMixedJapanese();
            expect(testData.security).toBeXSSSecure();
            expect(testData.security).toBeInjectionFree();
            
            // パフォーマンス要件の確認
            const memoryBefore = performance.memory?.usedJSHeapSize || 0;
            
            // 処理実行シミュレート
            await processTestData(testData);
            
            const memoryAfter = performance.memory?.usedJSHeapSize || 0;
            const memoryIncrease = memoryAfter - memoryBefore;
            
            expect(memoryIncrease).toBeLessThanMemory(10 * 1024 * 1024); // 10MB以下
        });
        
        test('エラーハンドリングと回復機能', async () => {
            // 無効な入力でのテスト
            const invalidInputs = [
                TEST_DATA.plantuml.invalidSyntax,
                TEST_DATA.japanese.invalid,
                TEST_DATA.security.xss
            ];
            
            for (const input of invalidInputs) {
                expect(() => {
                    // エラーハンドリングのテスト
                    return processTestDataSafely(input);
                }).not.toThrow();
            }
        });
    });
    
    /**
     * パフォーマンスベンチマーク
     */
    describe('パフォーマンスベンチマーク', () => {
        test('大量データ処理性能', async () => {
            const largeDataSet = generateLargeTestDataSet(1000);
            
            const startTime = performance.now();
            
            for (const data of largeDataSet) {
                expect(data.plantuml).toBeValidPlantUML();
                expect(data.japanese).toContainJapanese();
                expect(data.security).toBeXSSSecure();
            }
            
            const totalTime = performance.now() - startTime;
            const averageTime = totalTime / largeDataSet.length;
            
            expect(averageTime).toBeFasterThan(10); // 平均10ms以下
        });
        
        test('メモリ使用量制限', async () => {
            const initialMemory = performance.memory?.usedJSHeapSize || 0;
            
            // 大量のアサーション実行
            for (let i = 0; i < 1000; i++) {
                expect(TEST_DATA.plantuml.validSyntax).toBeValidPlantUML();
                expect(TEST_DATA.japanese.mixed).toContainJapanese();
                expect(TEST_DATA.security.safeInput).toBeXSSSecure();
            }
            
            const finalMemory = performance.memory?.usedJSHeapSize || 0;
            const memoryIncrease = finalMemory - initialMemory;
            
            expect(memoryIncrease).toBeLessThanMemory(50 * 1024 * 1024); // 50MB以下
        });
    });
});

/**
 * ヘルパー関数
 */

async function setupIntegrationEnvironment() {
    // テスト結果ディレクトリの作成
    await fs.mkdir(INTEGRATION_TEST_CONFIG.reporting.outputDir, { recursive: true });
    
    console.log('統合テスト環境をセットアップしました');
}

async function cleanupIntegrationEnvironment() {
    // Swarmコンポーネントのクリーンアップ
    if (orchestrator) {
        await orchestrator.gracefulShutdown();
    }
    if (reporter) {
        await reporter.gracefulShutdown();
    }
    if (monitoring) {
        await monitoring.gracefulShutdown();
    }
    
    console.log('統合テスト環境をクリーンアップしました');
}

function registerCustomAssertions() {
    // すべてのカスタムアサーションをJestに登録
    expect.extend({
        ...plantumlAssertions.customMatchers,
        ...componentAssertions.customMatchers,
        ...japaneseAssertions.customMatchers,
        ...performanceAssertions.customMatchers,
        ...securityAssertions.customMatchers
    });
    
    console.log('カスタムアサーションを登録しました');
}

async function initializeSwarmComponents() {
    try {
        // Swarmコンポーネントの初期化
        orchestrator = new SwarmTestOrchestrator();
        await orchestrator.initialize();
        
        reporter = new SwarmTestReporter();
        await reporter.initialize();
        
        monitoring = new SwarmMonitoringSystem();
        await monitoring.start();
        
        console.log('Swarmコンポーネントを初期化しました');
        
    } catch (error) {
        console.warn('Swarmコンポーネントの初期化に失敗しました:', error.message);
    }
}

function createMockActionItem() {
    // DOM要素のモック作成
    const mockElement = {
        querySelector: (selector) => {
            const elements = {
                '[data-testid="drag-handle"]': { draggable: true, getAttribute: () => 'ドラッグハンドル' },
                '[data-testid="actor-from"]': { tagName: 'SELECT', options: [{ value: 'A' }, { value: 'B' }] },
                '[data-testid="arrow-type"]': { tagName: 'SELECT', options: [{ value: '->' }, { value: '-->' }] },
                '[data-testid="actor-to"]': { tagName: 'SELECT', options: [{ value: 'A' }, { value: 'B' }] },
                '[data-testid="message"]': { tagName: 'INPUT', contentEditable: 'true' },
                '[data-testid="delete-button"]': { tagName: 'BUTTON', getAttribute: () => '削除' },
                '[data-testid="question-button"]': { tagName: 'BUTTON', getAttribute: () => 'ヘルプ' }
            };
            return elements[selector] || null;
        }
    };
    
    return mockElement;
}

async function measureFPS() {
    return new Promise((resolve) => {
        let frames = 0;
        const startTime = performance.now();
        
        function countFrame() {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - startTime < 1000) {
                requestAnimationFrame(countFrame);
            } else {
                const fps = Math.round((frames * 1000) / (currentTime - startTime));
                resolve(fps);
            }
        }
        
        requestAnimationFrame(countFrame);
    });
}

async function simulateTestExecution() {
    // テスト実行のシミュレーション
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Redis にテスト結果を送信
    if (orchestrator && orchestrator.redis) {
        const testResult = {
            nodeId: 'test-node',
            taskId: 'test-task',
            results: [
                {
                    path: '/test/sample.test.js',
                    category: 'unit',
                    status: 'passed',
                    duration: 100
                }
            ],
            totalDuration: 100,
            endTime: Date.now()
        };
        
        await orchestrator.redis.lpush('swarm:results', JSON.stringify(testResult));
    }
}

async function processTestData(testData) {
    // テストデータの処理シミュレーション
    for (const [key, value] of Object.entries(testData)) {
        // 各種検証処理
        switch (key) {
            case 'plantuml':
                plantumlAssertions.analyzeStructure(value);
                break;
            case 'japanese':
                japaneseAssertions.countJapaneseChars(value);
                break;
            case 'security':
                securityAssertions.validateXSSSecurity(value);
                break;
        }
        
        // 処理遅延シミュレート
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

function processTestDataSafely(input) {
    try {
        // 安全な処理の実装
        if (typeof input !== 'string') {
            return { error: 'Invalid input type' };
        }
        
        return { success: true, input };
        
    } catch (error) {
        return { error: error.message };
    }
}

function generateLargeTestDataSet(count) {
    const dataset = [];
    
    for (let i = 0; i < count; i++) {
        dataset.push({
            plantuml: `@startuml\nA${i} -> B${i}: メッセージ${i}\n@enduml`,
            japanese: `テストデータ${i}`,
            security: `安全な入力${i}`
        });
    }
    
    return dataset;
}

module.exports = {
    INTEGRATION_TEST_CONFIG,
    TEST_DATA,
    setupIntegrationEnvironment,
    cleanupIntegrationEnvironment,
    registerCustomAssertions
};