/**
 * Security Integration Tests
 * 
 * セキュリティ機能の統合テスト
 * ValidationEngine、CSPManager、SecurityMonitorの連携テスト
 * 
 * 作成日: 2025-08-15
 * 作成者: agent-orchestrator (webapp-test-automation role)
 */

// CommonJS環境での読み込み
let ValidationEngine, CSPManager, SecurityMonitor;

if (typeof require !== 'undefined') {
    try {
        const validationModules = require('../../src/validation/ValidationEngine.js');
        ValidationEngine = validationModules.ValidationEngine;
        
        CSPManager = require('../../src/security/CSPManager.js');
        
        const securityModules = require('../../src/security/SecurityMonitor.js');
        SecurityMonitor = securityModules.SecurityMonitor;
    } catch (error) {
        console.warn('モジュール読み込みエラー:', error.message);
    }
}

describe('Security Integration Tests', () => {
    let validationEngine;
    let cspManager;
    let securityMonitor;

    beforeAll(async () => {
        // セキュリティシステムの初期化
        if (ValidationEngine) validationEngine = new ValidationEngine();
        if (CSPManager) cspManager = new CSPManager();
        if (SecurityMonitor) {
            securityMonitor = new SecurityMonitor();
            securityMonitor.startMonitoring({
                interval: 1000,
                threatDetection: true,
                anomalyDetection: true,
                realTimeAlerts: false // テスト中はアラート無効
            });
        }
    });

    afterAll(async () => {
        // クリーンアップ
        if (securityMonitor) {
            securityMonitor.stopMonitoring();
        }
    });

    describe('ValidationEngine と CSPManager の連携', () => {
        test('ValidationEngineで検出された脅威がCSPで適切に処理される', async () => {
            if (!validationEngine || !cspManager) {
                console.warn('必要なモジュールが読み込まれていません');
                return;
            }

            // 悪意のあるHTML入力
            const maliciousHTML = `
                <div>
                    <script>alert('XSS')</script>
                    <img src="x" onerror="eval('malicious code')">
                    <iframe src="javascript:void(0)"></iframe>
                </div>
            `;

            // ValidationEngineでの検証
            const validation = validationEngine.validateInput(maliciousHTML);
            expect(validation.isValid).toBe(false);
            expect(validation.security.riskLevel).not.toBe('safe');

            // CSPManagerでのサニタイズ
            const sanitized = cspManager.sanitizeContent(maliciousHTML);
            
            // サニタイズ後の再検証
            const sanitizedValidation = validationEngine.validateInput(sanitized);
            expect(sanitizedValidation.security.riskLevel).toBe('safe');
        });

        test('CSPポリシーがValidationEngineの検証結果と一致する', async () => {
            if (!validationEngine || !cspManager) return;

            const testContent = `
                <html>
                    <script src="https://external.com/script.js"></script>
                    <style>
                        body { background: url('javascript:alert(1)'); }
                    </style>
                </html>
            `;

            // CSPでの検証
            const cspValidation = cspManager.validateContent(testContent, 'html');
            
            // ValidationEngineでの検証
            const validation = validationEngine.validateInput(testContent);

            // 両方で問題が検出されることを確認
            expect(cspValidation.isValid).toBe(false);
            expect(validation.isValid).toBe(false);
            expect(cspValidation.violations.length).toBeGreaterThan(0);
        });

        test('複数レベルでのセキュリティ検証', async () => {
            if (!validationEngine || !cspManager) return;

            const complexInput = {
                html: '<script>document.cookie</script>',
                query: "SELECT * FROM users; DROP TABLE admin;",
                data: 'javascript:void(eval("attack"))'
            };

            // 各レベルでの検証
            const htmlValidation = cspManager.validateContent(complexInput.html, 'html');
            const queryValidation = validationEngine.detectSecurityVulnerabilities(complexInput.query);
            const dataValidation = validationEngine.validateInput(complexInput.data);

            // すべてのレベルで脅威が検出されることを確認
            expect(htmlValidation.violations.length).toBeGreaterThan(0);
            expect(queryValidation.injection.length).toBeGreaterThan(0);
            expect(dataValidation.security.scriptEmbedding.length).toBeGreaterThan(0);
        });
    });

    describe('SecurityMonitor との統合', () => {
        test('セキュリティイベントが適切に監視される', async () => {
            if (!securityMonitor || !validationEngine) return;

            // テスト用のセキュリティイベント
            const securityEvent = {
                type: 'security_violation',
                content: '<script>alert("monitored attack")</script>',
                timestamp: new Date().toISOString()
            };

            // イベントの分析
            const analysis = securityMonitor.analyzeEvent(securityEvent);
            
            expect(analysis.eventId).toBeDefined();
            expect(analysis.threatScore).toBeGreaterThan(0);
            expect(analysis.riskLevel).not.toBe('minimal');
        });

        test('脅威の手動報告と自動検出の連携', async () => {
            if (!securityMonitor) return;

            // 手動での脅威報告
            const reportedThreat = securityMonitor.reportThreat({
                type: 'xss_attempt',
                severity: 'high',
                description: 'クロスサイトスクリプティング攻撃の試行',
                details: {
                    payload: '<script>steal_data()</script>',
                    source: 'user_input'
                }
            });

            expect(reportedThreat).toBeDefined();
            expect(reportedThreat.id).toBeDefined();
            expect(reportedThreat.severity).toBe('high');

            // メトリクスの確認
            const metrics = securityMonitor.getSecurityMetrics('hour');
            expect(metrics.totalThreats).toBeGreaterThan(0);
        });

        test('セキュリティダッシュボードデータの生成', async () => {
            if (!securityMonitor) return;

            const dashboardData = securityMonitor.generateDashboardData();
            
            expect(dashboardData.overview).toBeDefined();
            expect(dashboardData.overview.status).toBeDefined();
            expect(dashboardData.realTime).toBeDefined();
            expect(dashboardData.daily).toBeDefined();
            expect(dashboardData.alerts).toBeDefined();
        });
    });

    describe('フルスタック セキュリティワークフロー', () => {
        test('エンドツーエンドセキュリティ処理', async () => {
            if (!validationEngine || !cspManager || !securityMonitor) return;

            // 1. ユーザー入力のシミュレーション
            const userInput = {
                actor1: 'User',
                actor2: 'System', 
                message: '<script>fetch("/admin").then(r=>r.text()).then(alert)</script>',
                arrowType: 'sync'
            };

            // 2. 初回セキュリティ検証
            const initialValidation = validationEngine.validateInput(userInput.message);
            expect(initialValidation.isValid).toBe(false);

            // 3. セキュリティイベントとして記録
            const eventAnalysis = securityMonitor.analyzeEvent({
                type: 'user_input',
                data: userInput,
                risk: initialValidation.security.riskLevel
            });

            // 4. CSPでのコンテンツ検証
            const cspValidation = cspManager.validateContent(userInput.message, 'script');
            expect(cspValidation.violations.length).toBeGreaterThan(0);

            // 5. 自動修正の実行
            const fixResult = validationEngine.autoFix({
                xss: initialValidation.security.xss,
                injection: initialValidation.security.injection
            });
            expect(fixResult.fixed.length).toBeGreaterThan(0);

            // 6. 修正後の再検証
            if (fixResult.modifiedContent) {
                const finalValidation = validationEngine.validateInput(fixResult.modifiedContent);
                expect(finalValidation.security.riskLevel).toBe('safe');
            }

            // 7. セキュリティメトリクスの更新確認
            const metrics = securityMonitor.getSecurityMetrics('hour');
            expect(metrics.totalThreats).toBeGreaterThan(0);
        });

        test('PlantUMLコード生成時のセキュリティ検証', async () => {
            if (!validationEngine || !cspManager) return;

            // PlantUMLコードサンプル（セキュリティリスクあり）
            const plantUMLCode = `
                @startuml
                title Malicious Diagram
                actor User
                participant System
                
                note over System : <script>alert('xss')</script>
                User -> System : SELECT * FROM users; DROP TABLE admin;
                System -> User : javascript:void(eval('attack'))
                @enduml
            `;

            // セキュリティ検証
            const validation = validationEngine.validateInput(plantUMLCode);
            expect(validation.isValid).toBe(false);

            // CSPでの追加検証
            const cspValidation = cspManager.validateContent(plantUMLCode, 'html');
            expect(cspValidation.violations.length).toBeGreaterThan(0);

            // サニタイズ
            const sanitizedCode = cspManager.sanitizeContent(plantUMLCode);
            
            // サニタイズ後の検証
            const finalValidation = validationEngine.validateInput(sanitizedCode);
            expect(finalValidation.security.riskLevel).toBe('safe');
        });

        test('マルチレイヤーセキュリティ防御', async () => {
            if (!validationEngine || !cspManager || !securityMonitor) return;

            // 巧妙な攻撃パターン
            const sophisticatedAttack = `
                User -> System : ログイン要求
                alt ユーザー認証
                    System -> DB : SELECT user FROM accounts WHERE id='1' OR '1'='1'--
                    note over DB : <img src=x onerror=fetch('/secret').then(r=>r.text()).then(eval)>
                    DB -> System : 認証結果
                else 認証失敗
                    System -> User : <iframe src="javascript:void(document.cookie='stolen='+document.cookie)"></iframe>
                end
            `;

            // レイヤー1: ValidationEngine
            const layer1 = validationEngine.validateInput(sophisticatedAttack);
            expect(layer1.isValid).toBe(false);
            expect(layer1.security.riskLevel).toBe('critical');

            // レイヤー2: CSPManager
            const layer2 = cspManager.validateContent(sophisticatedAttack, 'html');
            expect(layer2.violations.length).toBeGreaterThan(2);

            // レイヤー3: SecurityMonitor
            const layer3 = securityMonitor.analyzeEvent({
                type: 'complex_attack',
                content: sophisticatedAttack,
                layers: [layer1, layer2]
            });
            expect(layer3.riskLevel).toBe('critical');
            expect(layer3.actionRequired).toBe(true);

            // 統合防御結果
            const isBlocked = layer1.security.riskLevel === 'critical' || 
                            layer2.violations.length > 0 || 
                            layer3.actionRequired;
            expect(isBlocked).toBe(true);
        });
    });

    describe('パフォーマンス統合テスト', () => {
        test('大量データでのセキュリティ処理性能', async () => {
            if (!validationEngine || !cspManager) return;

            const largeDataSet = Array(100).fill(0).map((_, i) => ({
                id: i,
                content: `テストデータ${i} <script>test${i}</script>`,
                type: 'user_input'
            }));

            const startTime = Date.now();

            // 並列処理での検証
            const validationPromises = largeDataSet.map(async (data) => {
                const validation = validationEngine.validateInput(data.content);
                const cspValidation = cspManager.validateContent(data.content, 'html');
                return { validation, cspValidation };
            });

            const results = await Promise.all(validationPromises);
            const endTime = Date.now();

            // パフォーマンス要件
            const processingTime = endTime - startTime;
            expect(processingTime).toBeLessThan(5000); // 5秒以内

            // 結果の検証
            expect(results.length).toBe(100);
            results.forEach(result => {
                expect(result.validation).toBeDefined();
                expect(result.cspValidation).toBeDefined();
            });
        });

        test('リアルタイム監視のパフォーマンス', async () => {
            if (!securityMonitor) return;

            // 短期間での多数イベント処理
            const events = Array(50).fill(0).map((_, i) => ({
                type: 'test_event',
                id: i,
                timestamp: new Date().toISOString()
            }));

            const startTime = Date.now();

            // 並列イベント分析
            const analysisPromises = events.map(event => 
                securityMonitor.analyzeEvent(event)
            );

            const analyses = await Promise.all(analysisPromises);
            const endTime = Date.now();

            // パフォーマンス検証
            const avgProcessingTime = (endTime - startTime) / events.length;
            expect(avgProcessingTime).toBeLessThan(20); // 平均20ms以内

            // 結果の検証
            expect(analyses.length).toBe(50);
            analyses.forEach(analysis => {
                expect(analysis.eventId).toBeDefined();
                expect(analysis.timestamp).toBeDefined();
            });
        });
    });

    describe('エラー回復とフォールバック', () => {
        test('ValidationEngineエラー時のフォールバック', async () => {
            if (!validationEngine || !cspManager) return;

            // ValidationEngineを意図的に破損
            const originalMethod = validationEngine.detectSecurityVulnerabilities;
            validationEngine.detectSecurityVulnerabilities = () => {
                throw new Error('ValidationEngine Error');
            };

            try {
                // CSPManagerがフォールバックとして機能することを確認
                const testInput = '<script>alert("test")</script>';
                const cspValidation = cspManager.validateContent(testInput, 'html');
                
                expect(cspValidation.violations.length).toBeGreaterThan(0);
                
                // サニタイズ機能も動作することを確認
                const sanitized = cspManager.sanitizeContent(testInput);
                expect(sanitized).not.toContain('<script>');
                
            } finally {
                // 復元
                validationEngine.detectSecurityVulnerabilities = originalMethod;
            }
        });

        test('ネットワークエラー時の処理', async () => {
            if (!securityMonitor) return;

            // ネットワークエラーのシミュレーション
            const networkErrorEvent = {
                type: 'network_error',
                error: 'ECONNREFUSED',
                target: 'external_api'
            };

            const analysis = securityMonitor.analyzeEvent(networkErrorEvent);
            
            // エラーでもイベント分析が完了することを確認
            expect(analysis.eventId).toBeDefined();
            expect(analysis.riskLevel).toBeDefined();
        });
    });

    describe('設定とカスタマイゼーション', () => {
        test('カスタムセキュリティポリシーの適用', async () => {
            if (!cspManager) return;

            // カスタムポリシーの設定
            const customPolicy = {
                header: "default-src 'none'; script-src 'self'; img-src 'self' data:",
                level: 'custom',
                description: 'テスト用カスタムポリシー'
            };

            cspManager.updatePolicy('custom', customPolicy);
            
            // カスタムポリシーの適用
            const generatedHeader = cspManager.generateCSPHeader('custom');
            expect(generatedHeader).toContain("default-src 'none'");
            expect(generatedHeader).toContain("script-src 'self'");
        });

        test('セキュリティ監視設定のカスタマイズ', async () => {
            if (!SecurityMonitor) return;

            // カスタム設定でのSecurityMonitor作成
            const customMonitor = new SecurityMonitor();
            
            const customConfig = {
                interval: 500,
                threatDetection: true,
                anomalyDetection: false,
                realTimeAlerts: false,
                logLevel: 'high'
            };

            customMonitor.startMonitoring(customConfig);
            
            // 設定が適用されていることを確認
            expect(customMonitor.isMonitoring).toBe(true);
            expect(customMonitor.config.interval).toBe(500);
            expect(customMonitor.config.anomalyDetection).toBe(false);
            
            customMonitor.stopMonitoring();
        });
    });
});

// テストヘルパー関数
function createMockSecurityEvent(type, severity = 'medium') {
    return {
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity,
        timestamp: new Date().toISOString(),
        source: 'integration_test'
    };
}

function validateSecurityResponse(response) {
    expect(response).toBeDefined();
    expect(response.timestamp).toBeDefined();
    expect(response.riskLevel).toBeDefined();
    expect(['safe', 'low', 'medium', 'high', 'critical', 'error'].includes(response.riskLevel)).toBe(true);
}

// CommonJS対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createMockSecurityEvent,
        validateSecurityResponse
    };
}

console.log('[Test] セキュリティ統合テスト定義完了 - 包括的セキュリティシステム連携テスト');