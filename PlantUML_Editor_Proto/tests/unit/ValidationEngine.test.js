/**
 * ValidationEngine Unit Tests
 * 
 * ValidationEngineの単体テスト
 * セキュリティ機能の包括的テスト
 * 
 * 作成日: 2025-08-15
 * 作成者: agent-orchestrator (webapp-test-automation role)
 */

// CommonJS環境での読み込み
let ValidationEngine, SecurityRuleEngine, JapaneseValidator, XSSProtector;

if (typeof require !== 'undefined') {
    const modules = require('../../src/validation/ValidationEngine.js');
    ValidationEngine = modules.ValidationEngine;
    SecurityRuleEngine = modules.SecurityRuleEngine;
    JapaneseValidator = modules.JapaneseValidator;
    XSSProtector = modules.XSSProtector;
} else {
    // ブラウザ環境ではグローバル変数から取得
    ValidationEngine = window.ValidationEngine;
    SecurityRuleEngine = window.SecurityRuleEngine;
    JapaneseValidator = window.JapaneseValidator;
    XSSProtector = window.XSSProtector;
}

describe('ValidationEngine Unit Tests', () => {
    let validationEngine;

    beforeEach(() => {
        validationEngine = new ValidationEngine();
    });

    afterEach(() => {
        validationEngine = null;
    });

    describe('基本初期化テスト', () => {
        test('ValidationEngineが正常に初期化される', () => {
            expect(validationEngine).toBeDefined();
            expect(validationEngine.securityRules).toBeDefined();
            expect(validationEngine.japaneseValidator).toBeDefined();
            expect(validationEngine.xssProtector).toBeDefined();
            expect(validationEngine.dataProtectionManager).toBeDefined();
            expect(validationEngine.errorTracker).toBeDefined();
        });

        test('初期化時にコンソールログが出力される', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            new ValidationEngine();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[ValidationEngine] 初期化完了')
            );
            consoleSpy.mockRestore();
        });
    });

    describe('detectSecurityVulnerabilities メソッドテスト', () => {
        test('安全なテキストは脆弱性なしと判定される', () => {
            const safeText = 'これは安全なテキストです';
            const result = validationEngine.detectSecurityVulnerabilities(safeText);
            
            expect(result).toBeDefined();
            expect(result.riskLevel).toBe('safe');
            expect(result.xss).toEqual([]);
            expect(result.injection).toEqual([]);
            expect(result.scriptEmbedding).toEqual([]);
        });

        test('XSS攻撃パターンが検出される', () => {
            const xssText = '<script>alert("XSS")</script>';
            const result = validationEngine.detectSecurityVulnerabilities(xssText);
            
            expect(result.riskLevel).not.toBe('safe');
            expect(result.xss.length).toBeGreaterThan(0);
        });

        test('SQLインジェクション攻撃が検出される', () => {
            const sqlText = "SELECT * FROM users WHERE id = 1; DROP TABLE users;";
            const result = validationEngine.detectSecurityVulnerabilities(sqlText);
            
            expect(result.riskLevel).not.toBe('safe');
            expect(result.injection.length).toBeGreaterThan(0);
        });

        test('JavaScript URLが検出される', () => {
            const jsUrl = 'javascript:alert("attack")';
            const result = validationEngine.detectSecurityVulnerabilities(jsUrl);
            
            expect(result.riskLevel).not.toBe('safe');
            expect(result.scriptEmbedding.length).toBeGreaterThan(0);
        });

        test('複数の脅威が同時に検出される', () => {
            const maliciousText = '<script>alert("XSS")</script> SELECT * FROM users; javascript:alert("JS")';
            const result = validationEngine.detectSecurityVulnerabilities(maliciousText);
            
            expect(result.riskLevel).toBe('critical');
            expect(result.xss.length).toBeGreaterThan(0);
            expect(result.injection.length).toBeGreaterThan(0);
            expect(result.scriptEmbedding.length).toBeGreaterThan(0);
        });

        test('オブジェクト入力でも正常に動作する', () => {
            const inputObject = {
                message: '<script>alert("test")</script>',
                actor: 'User'
            };
            const result = validationEngine.detectSecurityVulnerabilities(inputObject);
            
            expect(result).toBeDefined();
            expect(result.riskLevel).not.toBe('safe');
        });

        test('エラー発生時に適切にハンドリングされる', () => {
            // モックでエラーを発生させる
            jest.spyOn(validationEngine.xssProtector, 'detectXSSPatterns').mockImplementation(() => {
                throw new Error('テストエラー');
            });

            const result = validationEngine.detectSecurityVulnerabilities('test');
            
            expect(result.riskLevel).toBe('error');
            expect(result.error).toBeDefined();
        });
    });

    describe('validateJapanese メソッドテスト', () => {
        test('正常な日本語テキストが検証される', () => {
            const japaneseText = 'これは正常な日本語のテキストです。';
            const result = validationEngine.validateJapanese(japaneseText);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.encoding).toBe('UTF-8');
        });

        test('文法エラーが検出される', () => {
            const badGrammarText = 'これは文法。。エラーです、、テスト';
            const result = validationEngine.validateJapanese(badGrammarText);
            
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        test('空文字列の処理', () => {
            const result = validationEngine.validateJapanese('');
            
            expect(result).toBeDefined();
            expect(result.isValid).toBe(true);
        });

        test('非常に長いテキストで警告が生成される', () => {
            const longText = 'あ'.repeat(1001);
            const result = validationEngine.validateJapanese(longText);
            
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions[0]).toContain('長すぎます');
        });

        test('エンコーディングエラーのシミュレーション', () => {
            // URLエンコード/デコードエラーをシミュレート
            jest.spyOn(global, 'decodeURIComponent').mockImplementation(() => {
                throw new Error('エンコーディングエラー');
            });

            const result = validationEngine.validateJapanese('テスト');
            
            expect(result.encoding).toBe('unknown');
            expect(result.charset).toBe('invalid');
            
            global.decodeURIComponent.mockRestore();
        });
    });

    describe('autoFix メソッドテスト', () => {
        test('XSS脆弱性の自動修正', () => {
            const xssErrors = {
                xss: [
                    { pattern: '<script>', matches: ['<script>alert("test")</script>'] }
                ]
            };
            
            const result = validationEngine.autoFix(xssErrors);
            
            expect(result.fixed.length).toBeGreaterThan(0);
            expect(result.fixed[0].action).toBe('sanitized');
        });

        test('日本語エラーの自動修正', () => {
            const japaneseErrors = {
                japanese: { errors: ['連続した句点'] }
            };
            
            const result = validationEngine.autoFix(japaneseErrors);
            
            expect(result.suggestions.length).toBeGreaterThan(0);
        });

        test('インジェクション攻撃の無効化', () => {
            const injectionErrors = {
                injection: [
                    { pattern: 'SELECT', matches: ['SELECT * FROM users'] }
                ]
            };
            
            const result = validationEngine.autoFix(injectionErrors);
            
            expect(result.fixed.length).toBeGreaterThan(0);
        });

        test('エラー時の処理', () => {
            jest.spyOn(validationEngine.xssProtector, 'autoFixXSS').mockImplementation(() => {
                throw new Error('修正エラー');
            });

            const result = validationEngine.autoFix({ xss: [{}] });
            
            expect(result.error).toBeDefined();
        });
    });

    describe('validateInput メソッドテスト', () => {
        test('包括的な入力検証が実行される', () => {
            const inputData = 'これは安全なテストデータです';
            const result = validationEngine.validateInput(inputData);
            
            expect(result.isValid).toBe(true);
            expect(result.security).toBeDefined();
            expect(result.japanese).toBeDefined();
            expect(result.general).toBeDefined();
            expect(result.timestamp).toBeDefined();
        });

        test('オブジェクト入力での検証', () => {
            const inputData = {
                message: 'テストメッセージ',
                actor: 'User'
            };
            const result = validationEngine.validateInput(inputData);
            
            expect(result.isValid).toBe(true);
            expect(result.japanese).toBeDefined();
        });

        test('危険な入力での検証失敗', () => {
            const dangerousInput = '<script>alert("XSS")</script>';
            const result = validationEngine.validateInput(dangerousInput);
            
            expect(result.isValid).toBe(false);
            expect(result.security.riskLevel).not.toBe('safe');
        });

        test('エラー時の処理', () => {
            jest.spyOn(validationEngine, 'detectSecurityVulnerabilities').mockImplementation(() => {
                throw new Error('検証エラー');
            });

            const result = validationEngine.validateInput('test');
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('プライベートメソッドテスト', () => {
        test('リスクレベル計算の正確性', () => {
            const vulnerabilities = {
                xss: [1, 2, 3],           // 3 * 3 = 9
                injection: [1, 2],        // 2 * 4 = 8
                scriptEmbedding: [1],     // 1 * 5 = 5
                maliciousPatterns: [1, 2] // 2 * 2 = 4
            };
            
            // calculateRiskLevel は private だが、テストのために一時的にアクセス
            const riskLevel = validationEngine.calculateRiskLevel(vulnerabilities);
            
            expect(riskLevel).toBe('critical'); // 9+8+5+4 = 26 > 15
        });

        test('安全スコアでのリスクレベル', () => {
            const safeVulnerabilities = {
                xss: [],
                injection: [],
                scriptEmbedding: [],
                maliciousPatterns: []
            };
            
            const riskLevel = validationEngine.calculateRiskLevel(safeVulnerabilities);
            expect(riskLevel).toBe('safe');
        });
    });

    describe('エラートラッキングテスト', () => {
        test('エラーが適切に記録される', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            validationEngine.errorTracker.logError('testMethod', new Error('テストエラー'));
            
            expect(consoleSpy).toHaveBeenCalled();
            expect(validationEngine.errorTracker.errors.length).toBeGreaterThan(0);
            
            consoleSpy.mockRestore();
        });

        test('セキュリティチェックが記録される', () => {
            const input = 'テスト入力';
            const result = { riskLevel: 'safe' };
            
            validationEngine.errorTracker.logSecurityCheck(input, result);
            
            expect(validationEngine.errorTracker.securityLogs.length).toBeGreaterThan(0);
        });
    });

    describe('パフォーマンステスト', () => {
        test('大量データの処理が適切な時間内に完了する', () => {
            const largeInput = 'あ'.repeat(10000);
            const startTime = Date.now();
            
            const result = validationEngine.validateInput(largeInput);
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // 1秒以内
            expect(result).toBeDefined();
        });

        test('繰り返し処理のパフォーマンス', () => {
            const testData = 'テストデータ';
            const iterations = 100;
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                validationEngine.validateInput(testData);
            }
            
            const duration = Date.now() - startTime;
            const avgTime = duration / iterations;
            expect(avgTime).toBeLessThan(10); // 平均10ms以内
        });
    });

    describe('境界値テスト', () => {
        test('null 入力の処理', () => {
            const result = validationEngine.validateInput(null);
            expect(result).toBeDefined();
        });

        test('undefined 入力の処理', () => {
            const result = validationEngine.validateInput(undefined);
            expect(result).toBeDefined();
        });

        test('数値入力の処理', () => {
            const result = validationEngine.validateInput(12345);
            expect(result).toBeDefined();
        });

        test('配列入力の処理', () => {
            const result = validationEngine.validateInput(['test', 'array']);
            expect(result).toBeDefined();
        });

        test('深いネストオブジェクトの処理', () => {
            const deepObject = {
                level1: {
                    level2: {
                        level3: {
                            message: 'deep test'
                        }
                    }
                }
            };
            
            const result = validationEngine.validateInput(deepObject);
            expect(result).toBeDefined();
        });
    });

    describe('セキュリティ統合テスト', () => {
        test('複合攻撃パターンの検出', () => {
            const complexAttack = `
                <script>
                    eval('SELECT * FROM users; DROP TABLE users;');
                    location.href = 'javascript:alert("XSS")';
                    document.write('<iframe src="evil.com"></iframe>');
                </script>
            `;
            
            const result = validationEngine.validateInput(complexAttack);
            
            expect(result.isValid).toBe(false);
            expect(result.security.riskLevel).toBe('critical');
            expect(result.security.xss.length).toBeGreaterThan(0);
            expect(result.security.injection.length).toBeGreaterThan(0);
            expect(result.security.scriptEmbedding.length).toBeGreaterThan(0);
        });

        test('偽装攻撃の検出', () => {
            const disguisedAttack = 'javascript:void(0);alert(document.cookie)';
            const result = validationEngine.validateInput(disguisedAttack);
            
            expect(result.isValid).toBe(false);
            expect(result.security.riskLevel).not.toBe('safe');
        });

        test('エンコードされた攻撃の検出', () => {
            const encodedAttack = '%3Cscript%3Ealert%28%27XSS%27%29%3C%2Fscript%3E';
            const result = validationEngine.validateInput(decodeURIComponent(encodedAttack));
            
            expect(result.isValid).toBe(false);
        });
    });
});

describe('SecurityRuleEngine Unit Tests', () => {
    let securityRules;

    beforeEach(() => {
        securityRules = new SecurityRuleEngine();
    });

    test('SQLインジェクション検出', () => {
        const sqlAttack = "SELECT * FROM users WHERE id = 1' OR '1'='1";
        const result = securityRules.detectInjectionAttempts(sqlAttack);
        
        expect(result.attempts.length).toBeGreaterThan(0);
    });

    test('インジェクション無効化', () => {
        const attempts = [{ pattern: 'SELECT', type: 'SQL Injection' }];
        const result = securityRules.neutralizeInjection(attempts);
        
        expect(result.neutralized.length).toBe(1);
        expect(result.dangerous.length).toBe(0);
    });
});

describe('JapaneseValidator Unit Tests', () => {
    let japaneseValidator;

    beforeEach(() => {
        japaneseValidator = new JapaneseValidator();
    });

    test('UTF-8エンコーディング検証', () => {
        const result = japaneseValidator.validateEncoding('日本語テスト');
        
        expect(result.encoding).toBe('UTF-8');
        expect(result.isValid).toBe(true);
    });

    test('文法チェック', () => {
        const result = japaneseValidator.checkGrammar('連続した。。句点');
        
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('制御文字検出', () => {
        const textWithControl = 'テスト\x00制御文字';
        const result = japaneseValidator.detectInvalidCharacters(textWithControl);
        
        expect(result.invalidChars.length).toBeGreaterThan(0);
    });
});

describe('XSSProtector Unit Tests', () => {
    let xssProtector;

    beforeEach(() => {
        xssProtector = new XSSProtector();
    });

    test('基本XSSパターン検出', () => {
        const xssInput = '<script>alert("XSS")</script>';
        const result = xssProtector.detectXSSPatterns(xssInput);
        
        expect(result.patterns.length).toBeGreaterThan(0);
    });

    test('画像XSS検出', () => {
        const imgXss = '<img src="x" onerror="alert(1)">';
        const result = xssProtector.detectXSSPatterns(imgXss);
        
        expect(result.patterns.length).toBeGreaterThan(0);
    });

    test('JavaScript URL検出', () => {
        const jsUrl = 'javascript:alert("attack")';
        const result = xssProtector.detectXSSPatterns(jsUrl);
        
        expect(result.patterns.length).toBeGreaterThan(0);
    });

    test('XSS自動修正', () => {
        const xssErrors = [{ pattern: '<script>', severity: 'high' }];
        const result = xssProtector.autoFixXSS(xssErrors);
        
        expect(result.fixed.length).toBeGreaterThan(0);
        expect(result.unfixed.length).toBe(0);
    });
});

// Jest設定でのモジュール定義（CommonJS環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ValidationEngine,
        SecurityRuleEngine,
        JapaneseValidator,
        XSSProtector
    };
}

console.log('[Test] ValidationEngine単体テスト定義完了 - 包括的セキュリティテストスイート');