/**
 * Phase 5 Unit Tests for EditModalManager
 * 
 * EditModalManager、TransactionManager、ErrorHandler の単体テスト
 * 
 * @version 1.0.0
 * @date 2025-08-14
 */

const { JSDOM } = require('jsdom');

// JSDOMセットアップ
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8087',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.console = console;

// EditModalManagerのロード
let EditModalManager, TransactionManager, ErrorHandler;

try {
    // ファイルの内容を読み込んで実行
    const fs = require('fs');
    const path = require('path');
    const editModalManagerPath = path.resolve('../../../EditModalManager.js');
    const editModalManagerCode = fs.readFileSync(editModalManagerPath, 'utf8');
    eval(editModalManagerCode);
    
    EditModalManager = global.EditModalManager || window.EditModalManager;
    TransactionManager = global.TransactionManager || window.TransactionManager;
    ErrorHandler = global.ErrorHandler || window.ErrorHandler;
} catch (error) {
    console.error('Failed to load EditModalManager:', error);
    process.exit(1);
}

/**
 * テスト結果記録用クラス
 */
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passedTests = 0;
        this.failedTests = 0;
        this.startTime = Date.now();
    }

    test(testName, testFn) {
        console.log(`\n  Running: ${testName}`);
        
        try {
            testFn();
            this.tests.push({ name: testName, status: 'PASS', error: null });
            this.passedTests++;
            console.log(`  ✅ ${testName}`);
        } catch (error) {
            this.tests.push({ name: testName, status: 'FAIL', error: error.message });
            this.failedTests++;
            console.log(`  ❌ ${testName}: ${error.message}`);
        }
    }

    async asyncTest(testName, testFn) {
        console.log(`\n  Running: ${testName}`);
        
        try {
            await testFn();
            this.tests.push({ name: testName, status: 'PASS', error: null });
            this.passedTests++;
            console.log(`  ✅ ${testName}`);
        } catch (error) {
            this.tests.push({ name: testName, status: 'FAIL', error: error.message });
            this.failedTests++;
            console.log(`  ❌ ${testName}: ${error.message}`);
        }
    }

    generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Test Suite: ${this.suiteName}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.failedTests}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Success Rate: ${((this.passedTests / this.tests.length) * 100).toFixed(2)}%`);

        if (this.failedTests > 0) {
            console.log(`\nFailed Tests:`);
            this.tests.filter(t => t.status === 'FAIL').forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
        }

        return {
            suiteName: this.suiteName,
            totalTests: this.tests.length,
            passed: this.passedTests,
            failed: this.failedTests,
            duration,
            successRate: (this.passedTests / this.tests.length) * 100,
            tests: this.tests
        };
    }
}

/**
 * アサーション関数
 */
function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, but got ${actual}`);
            }
        },
        toBeTrue: () => {
            if (actual !== true) {
                throw new Error(`Expected true, but got ${actual}`);
            }
        },
        toBeFalse: () => {
            if (actual !== false) {
                throw new Error(`Expected false, but got ${actual}`);
            }
        },
        toBeNull: () => {
            if (actual !== null) {
                throw new Error(`Expected null, but got ${actual}`);
            }
        },
        toBeUndefined: () => {
            if (actual !== undefined) {
                throw new Error(`Expected undefined, but got ${actual}`);
            }
        },
        toThrow: (expectedError) => {
            try {
                if (typeof actual === 'function') {
                    actual();
                }
                throw new Error('Function did not throw');
            } catch (error) {
                if (expectedError && !error.message.includes(expectedError)) {
                    throw new Error(`Expected error containing "${expectedError}", but got "${error.message}"`);
                }
            }
        },
        toHaveLength: (expectedLength) => {
            if (!actual || typeof actual.length === 'undefined') {
                throw new Error(`Expected object with length property`);
            }
            if (actual.length !== expectedLength) {
                throw new Error(`Expected length ${expectedLength}, but got ${actual.length}`);
            }
        },
        toContain: (expectedItem) => {
            if (!actual || typeof actual.includes !== 'function') {
                throw new Error(`Expected array or string with includes method`);
            }
            if (!actual.includes(expectedItem)) {
                throw new Error(`Expected to contain ${expectedItem}`);
            }
        },
        toBeInstanceOf: (expectedClass) => {
            if (!(actual instanceof expectedClass)) {
                throw new Error(`Expected instance of ${expectedClass.name}`);
            }
        }
    };
}

/**
 * TransactionManagerのテスト
 */
function testTransactionManager() {
    const runner = new TestRunner('TransactionManager');

    // 基本的なインスタンス化テスト
    runner.test('should create TransactionManager instance', () => {
        const tm = new TransactionManager();
        expect(tm).toBeInstanceOf(TransactionManager);
        expect(tm.transactionStack).toHaveLength(0);
    });

    // トランザクションID生成テスト
    runner.test('should generate unique transaction IDs', () => {
        const tm = new TransactionManager();
        const id1 = tm.generateTransactionId();
        const id2 = tm.generateTransactionId();
        
        expect(id1).toContain('tx_');
        expect(id2).toContain('tx_');
        expect(id1 !== id2).toBeTrue();
    });

    // 成功ケースの実行テスト
    runner.asyncTest('should execute successful operation', async () => {
        const tm = new TransactionManager();
        let executed = false;
        
        const result = await tm.execute(async () => {
            executed = true;
            return 'success';
        });
        
        expect(executed).toBeTrue();
        expect(result).toBe('success');
        expect(tm.transactionStack).toHaveLength(0);
    });

    // エラーケースの実行テスト
    runner.asyncTest('should handle failed operations with rollback', async () => {
        const tm = new TransactionManager();
        let rollbackExecuted = false;
        
        try {
            await tm.execute(async () => {
                const txId = tm.transactionStack[tm.transactionStack.length - 1];
                tm.registerRollbackHandler(txId, async () => {
                    rollbackExecuted = true;
                });
                throw new Error('Test error');
            });
        } catch (error) {
            expect(error.message).toBe('Test error');
            expect(rollbackExecuted).toBeTrue();
            expect(tm.transactionStack).toHaveLength(0);
        }
    });

    return runner.generateReport();
}

/**
 * ErrorHandlerのテスト
 */
function testErrorHandler() {
    const runner = new TestRunner('ErrorHandler');

    // 基本的なインスタンス化テスト
    runner.test('should create ErrorHandler instance', () => {
        const eh = new ErrorHandler();
        expect(eh).toBeInstanceOf(ErrorHandler);
        expect(eh.errorHistory).toHaveLength(0);
    });

    // エラー分類テスト
    runner.test('should classify validation errors', () => {
        const eh = new ErrorHandler();
        const error = new Error('Test validation error');
        error.name = 'ValidationError';
        
        const errorType = eh.classifyError(error);
        expect(errorType).toBe(eh.errorTypes.VALIDATION);
    });

    runner.test('should classify syntax errors', () => {
        const eh = new ErrorHandler();
        const error = new SyntaxError('Test syntax error');
        
        const errorType = eh.classifyError(error);
        expect(errorType).toBe(eh.errorTypes.SYNTAX);
    });

    runner.test('should classify unknown errors', () => {
        const eh = new ErrorHandler();
        const error = new Error('Unknown error');
        
        const errorType = eh.classifyError(error);
        expect(errorType).toBe(eh.errorTypes.UNKNOWN);
    });

    // エラー情報作成テスト
    runner.test('should create error info with all required fields', () => {
        const eh = new ErrorHandler();
        const error = new Error('Test error');
        const context = { operation: 'test' };
        
        const errorInfo = eh.createErrorInfo(error, eh.errorTypes.UNKNOWN, context);
        
        expect(errorInfo.message).toBe('Test error');
        expect(errorInfo.type).toBe(eh.errorTypes.UNKNOWN);
        expect(errorInfo.context.operation).toBe('test');
        expect(errorInfo.timestamp).toContain('T');
    });

    // エラーハンドリング統合テスト
    runner.test('should handle error and add to history', () => {
        const eh = new ErrorHandler();
        const error = new Error('Test error');
        
        eh.handleError(error, { operation: 'test' });
        
        expect(eh.errorHistory).toHaveLength(1);
        expect(eh.errorHistory[0].message).toBe('Test error');
    });

    // 回復可能性判定テスト
    runner.test('should identify recoverable errors', () => {
        const eh = new ErrorHandler();
        
        expect(eh.isRecoverable(eh.errorTypes.VALIDATION)).toBeTrue();
        expect(eh.isRecoverable(eh.errorTypes.NETWORK)).toBeTrue();
        expect(eh.isRecoverable(eh.errorTypes.UNKNOWN)).toBeFalse();
    });

    return runner.generateReport();
}

/**
 * EditModalManagerのテスト
 */
function testEditModalManager() {
    const runner = new TestRunner('EditModalManager');

    // 基本的なインスタンス化テスト
    runner.test('should create EditModalManager instance', () => {
        const emm = new EditModalManager();
        expect(emm).toBeInstanceOf(EditModalManager);
        expect(emm.modals).toBeInstanceOf(Map);
        expect(emm.activeModal).toBeNull();
    });

    // モーダル登録テスト
    runner.test('should register modal type', () => {
        const emm = new EditModalManager();
        const mockModalClass = class MockModal {};
        
        emm.registerModal('test', mockModalClass);
        
        expect(emm.modals.has('test')).toBeTrue();
        expect(emm.modals.get('test')).toBe(mockModalClass);
    });

    // モーダル登録エラーテスト
    runner.test('should throw error for invalid modal registration', () => {
        const emm = new EditModalManager();
        
        expect(() => emm.registerModal()).toThrow('Modal type and class are required');
        expect(() => emm.registerModal('test')).toThrow('Modal type and class are required');
        expect(() => emm.registerModal(null, class {})).toThrow('Modal type and class are required');
    });

    // バリデーションルールテスト
    runner.test('should have validation rules for different modal types', () => {
        const emm = new EditModalManager();
        
        expect(emm.validationRules.has('condition')).toBeTrue();
        expect(emm.validationRules.has('loop')).toBeTrue();
        expect(emm.validationRules.has('parallel')).toBeTrue();
    });

    // データ検証テスト
    runner.asyncTest('should validate condition data correctly', async () => {
        const emm = new EditModalManager();
        
        // 有効なデータ
        const validData = { id: '1', type: 'condition', condition: 'user authenticated' };
        const result = await emm.validateData(validData);
        expect(result).toBe(true);
    });

    runner.asyncTest('should reject invalid condition data', async () => {
        const emm = new EditModalManager();
        
        // 無効なデータ（条件が空）
        const invalidData = { id: '1', type: 'condition', condition: '' };
        
        try {
            await emm.validateData(invalidData);
            throw new Error('Should have thrown validation error');
        } catch (error) {
            expect(error.name).toBe('ValidationError');
        }
    });

    // イベントリスナーテスト
    runner.test('should manage event listeners correctly', () => {
        const emm = new EditModalManager();
        let callbackExecuted = false;
        
        const callback = () => { callbackExecuted = true; };
        
        emm.addEventListener('test', callback);
        emm.triggerEvent('test', {});
        
        expect(callbackExecuted).toBeTrue();
    });

    runner.test('should remove event listeners correctly', () => {
        const emm = new EditModalManager();
        let callbackExecuted = false;
        
        const callback = () => { callbackExecuted = true; };
        
        emm.addEventListener('test', callback);
        emm.removeEventListener('test', callback);
        emm.triggerEvent('test', {});
        
        expect(callbackExecuted).toBeFalse();
    });

    // クリーンアップテスト
    runner.test('should cleanup resources properly', () => {
        const emm = new EditModalManager();
        emm.registerModal('test', class {});
        emm.addEventListener('test', () => {});
        
        emm.destroy();
        
        expect(emm.modals.size).toBe(0);
        expect(emm.listeners.size).toBe(0);
    });

    return runner.generateReport();
}

/**
 * モーダルクラスの基本テスト
 */
function testModalClasses() {
    const runner = new TestRunner('Modal Classes Base');

    // 基本的なモーダルクラス定義テスト
    runner.test('should have required modal class structure', () => {
        // モーダルクラスの基本構造を検証
        class TestModal {
            constructor(data, manager) {
                this.data = data;
                this.manager = manager;
            }
            
            async show() {
                return true;
            }
            
            async hide() {
                return true;
            }
        }
        
        const manager = new EditModalManager();
        const modal = new TestModal({ test: 'data' }, manager);
        
        expect(modal.data.test).toBe('data');
        expect(modal.manager).toBe(manager);
        expect(typeof modal.show).toBe('function');
        expect(typeof modal.hide).toBe('function');
    });

    return runner.generateReport();
}

/**
 * メイン実行関数
 */
async function runAllTests() {
    console.log('🚀 Starting Phase 5 Unit Tests for EditModalManager');
    console.log(`Test Environment: Node.js ${process.version}`);
    console.log(`Start Time: ${new Date().toISOString()}\n`);

    const reports = [];

    try {
        // 各テストスイートを実行
        reports.push(testTransactionManager());
        reports.push(testErrorHandler());
        reports.push(testEditModalManager());
        reports.push(testModalClasses());

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }

    // 総合レポート生成
    const totalTests = reports.reduce((sum, report) => sum + report.totalTests, 0);
    const totalPassed = reports.reduce((sum, report) => sum + report.passed, 0);
    const totalFailed = reports.reduce((sum, report) => sum + report.failed, 0);
    const avgDuration = reports.reduce((sum, report) => sum + report.duration, 0) / reports.length;

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 PHASE 5 UNIT TESTS - SUMMARY REPORT');
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Test Suites: ${reports.length}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Total Passed: ${totalPassed}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Completion Time: ${new Date().toISOString()}`);

    // 詳細レポートをファイルに保存
    const detailedReport = {
        timestamp: new Date().toISOString(),
        testType: 'unit',
        phase: 5,
        summary: {
            totalSuites: reports.length,
            totalTests,
            totalPassed,
            totalFailed,
            successRate: (totalPassed / totalTests) * 100,
            avgDuration
        },
        suites: reports
    };

    // レポートファイル出力
    const fs = require('fs');
    const reportPath = `./test-results/unit-test-report-${Date.now()}.json`;
    
    try {
        if (!fs.existsSync('./test-results')) {
            fs.mkdirSync('./test-results', { recursive: true });
        }
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
        console.log(`\n⚠️  Could not save report file: ${error.message}`);
    }

    // 終了コード設定
    if (totalFailed > 0) {
        console.log('\n❌ Some tests failed. Exiting with code 1.');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed successfully!');
        process.exit(0);
    }
}

// テスト実行
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testTransactionManager,
    testErrorHandler,
    testEditModalManager,
    testModalClasses,
    TestRunner,
    expect
};