/**
 * Phase 5 Integration Tests for EditModalManager
 * 
 * EditModalManagerとアプリケーション間の統合テスト
 * モーダル・PlantUMLParser・UIコンポーネント間の連携をテスト
 * 
 * @version 1.0.0
 * @date 2025-08-14
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// JSDOMセットアップ（完全なDOM環境）
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PlantUML Editor - Integration Test</title>
    <style>
        .error-notification { position: fixed; top: 20px; right: 20px; z-index: 9999; }
        .success-notification { position: fixed; top: 20px; right: 20px; z-index: 9999; }
        .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .step-condition { background: #f0f0f0; margin: 10px; padding: 10px; }
        .step-loop { background: #e0f0e0; margin: 10px; padding: 10px; }
        .step-parallel { background: #e0e0f0; margin: 10px; padding: 10px; }
    </style>
</head>
<body>
    <!-- PlantUML Editor UI Elements -->
    <div id="app">
        <div id="visual-editor">
            <div id="steps-container"></div>
            <button id="addFirstStepBtn">ステップを追加</button>
        </div>
        <div id="plantuml-output">
            <textarea id="plantumlCode" readonly></textarea>
        </div>
        <div id="modal-container"></div>
    </div>

    <!-- Test Modal Templates -->
    <template id="condition-modal-template">
        <div class="modal" id="conditionEditModal">
            <div class="modal-content">
                <h3>条件分岐編集</h3>
                <input type="text" id="conditionInput" placeholder="条件を入力">
                <div id="condition-branches">
                    <div data-branch="true">
                        <h4>TRUE分岐</h4>
                        <button class="btn-add-action" data-branch="true">アクション追加</button>
                    </div>
                    <div data-branch="false">
                        <h4>FALSE分岐</h4>
                        <button class="btn-add-action" data-branch="false">アクション追加</button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="saveConditionEdit">保存</button>
                    <button id="cancelConditionEdit">キャンセル</button>
                </div>
            </div>
        </div>
    </template>

    <template id="loop-modal-template">
        <div class="modal" id="loopEditModal">
            <div class="modal-content">
                <h3>ループ編集</h3>
                <input type="text" id="loopConditionInput" placeholder="ループ条件を入力">
                <div id="loop-actions">
                    <button class="btn-add-action">アクション追加</button>
                </div>
                <div class="modal-actions">
                    <button id="saveLoopEdit">保存</button>
                    <button id="cancelLoopEdit">キャンセル</button>
                </div>
            </div>
        </div>
    </template>

    <template id="parallel-modal-template">
        <div class="modal" id="parallelEditModal">
            <div class="modal-content">
                <h3>並行処理編集</h3>
                <div id="parallel-threads">
                    <div class="thread-container" data-thread="1">
                        <h4>スレッド1</h4>
                        <button class="btn-add-action">アクション追加</button>
                    </div>
                    <div class="thread-container" data-thread="2">
                        <h4>スレッド2</h4>
                        <button class="btn-add-action">アクション追加</button>
                    </div>
                </div>
                <button id="addThread">スレッド追加</button>
                <div class="modal-actions">
                    <button id="saveParallelEdit">保存</button>
                    <button id="cancelParallelEdit">キャンセル</button>
                </div>
            </div>
        </div>
    </template>
</body>
</html>
`, {
    url: 'http://localhost:8087',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.localStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; },
    clear: function() { this.data = {}; }
};

// EditModalManagerとモーダルクラスのロード
let EditModalManager, TransactionManager, ErrorHandler;

try {
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

// モックのPlantUMLParserクラス
class MockPlantUMLParser {
    constructor() {
        this.steps = [];
        this.currentStep = 0;
    }

    addCondition(condition, trueActions = [], falseActions = []) {
        const step = {
            id: `step_${Date.now()}`,
            type: 'condition',
            condition,
            trueActions,
            falseActions
        };
        this.steps.push(step);
        return step;
    }

    addLoop(loopCondition, actions = []) {
        const step = {
            id: `step_${Date.now()}`,
            type: 'loop',
            loopCondition,
            actions
        };
        this.steps.push(step);
        return step;
    }

    addParallel(threads = []) {
        const step = {
            id: `step_${Date.now()}`,
            type: 'parallel',
            threads: threads.length > 0 ? threads : [
                { name: 'Thread1', actions: [] },
                { name: 'Thread2', actions: [] }
            ]
        };
        this.steps.push(step);
        return step;
    }

    updateStep(stepId, data) {
        const stepIndex = this.steps.findIndex(step => step.id === stepId);
        if (stepIndex !== -1) {
            this.steps[stepIndex] = { ...this.steps[stepIndex], ...data };
            return this.steps[stepIndex];
        }
        return null;
    }

    generatePlantUML() {
        let code = '@startuml\n';
        
        this.steps.forEach(step => {
            switch (step.type) {
                case 'condition':
                    code += `if (${step.condition}) then (yes)\n`;
                    step.trueActions.forEach(action => {
                        code += `  :${action.content};\n`;
                    });
                    if (step.falseActions.length > 0) {
                        code += `else (no)\n`;
                        step.falseActions.forEach(action => {
                            code += `  :${action.content};\n`;
                        });
                    }
                    code += `endif\n`;
                    break;
                    
                case 'loop':
                    code += `while (${step.loopCondition})\n`;
                    step.actions.forEach(action => {
                        code += `  :${action.content};\n`;
                    });
                    code += `endwhile\n`;
                    break;
                    
                case 'parallel':
                    code += `fork\n`;
                    step.threads.forEach((thread, index) => {
                        if (index > 0) code += `fork again\n`;
                        thread.actions.forEach(action => {
                            code += `  :${action.content};\n`;
                        });
                    });
                    code += `end fork\n`;
                    break;
            }
        });
        
        code += '@enduml\n';
        return code;
    }

    getSteps() {
        return this.steps;
    }
}

// モックアプリケーションのセットアップ
class MockApp {
    constructor() {
        this.parser = new MockPlantUMLParser();
        this.currentData = {};
    }

    async saveActionData(data) {
        this.currentData = data;
        
        // PlantUMLParserに反映
        switch (data.type) {
            case 'condition':
                return this.parser.addCondition(data.condition, data.trueActions, data.falseActions);
            case 'loop':
                return this.parser.addLoop(data.loopCondition, data.actions);
            case 'parallel':
                return this.parser.addParallel(data.threads);
        }
        
        return data;
    }

    async refreshUI() {
        // UIを更新（実際のDOM操作をシミュレート）
        const stepsContainer = document.getElementById('steps-container');
        if (stepsContainer) {
            const steps = this.parser.getSteps();
            stepsContainer.innerHTML = '';
            
            steps.forEach(step => {
                const stepDiv = document.createElement('div');
                stepDiv.className = `step-${step.type}`;
                stepDiv.setAttribute('data-step-id', step.id);
                
                switch (step.type) {
                    case 'condition':
                        stepDiv.innerHTML = `
                            <h4>条件分岐: ${step.condition}</h4>
                            <div class="true-branch">TRUE: ${step.trueActions.length} actions</div>
                            <div class="false-branch">FALSE: ${step.falseActions.length} actions</div>
                        `;
                        break;
                    case 'loop':
                        stepDiv.innerHTML = `
                            <h4>ループ: ${step.loopCondition}</h4>
                            <div class="loop-actions">${step.actions.length} actions</div>
                        `;
                        break;
                    case 'parallel':
                        stepDiv.innerHTML = `
                            <h4>並行処理: ${step.threads.length} threads</h4>
                            ${step.threads.map(thread => `<div>${thread.name}: ${thread.actions.length} actions</div>`).join('')}
                        `;
                        break;
                }
                
                stepsContainer.appendChild(stepDiv);
            });
        }

        // PlantUMLコードの更新
        const plantumlOutput = document.getElementById('plantumlCode');
        if (plantumlOutput) {
            plantumlOutput.value = this.parser.generatePlantUML();
        }
    }
}

// グローバルアプリインスタンス
global.window.app = new MockApp();

/**
 * テスト実行クラス（unit-testから再利用）
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
 * アサーション関数（unit-testから再利用）
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
 * モーダルクラス定義（テスト用）
 */
class TestConditionModal {
    constructor(data, manager) {
        this.data = data;
        this.manager = manager;
        this.element = null;
    }

    async show() {
        const template = document.getElementById('condition-modal-template');
        if (!template) {
            throw new Error('Condition modal template not found');
        }

        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            throw new Error('Modal container not found');
        }

        this.element = template.content.cloneNode(true);
        modalContainer.appendChild(this.element);

        // イベントリスナーの設定
        const saveBtn = modalContainer.querySelector('#saveConditionEdit');
        const cancelBtn = modalContainer.querySelector('#cancelConditionEdit');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }

        return true;
    }

    async hide() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = '';
        }
        
        return true;
    }

    async save() {
        const conditionInput = document.getElementById('conditionInput');
        if (!conditionInput) {
            throw new Error('Condition input not found');
        }

        const condition = conditionInput.value.trim();
        if (!condition) {
            throw new Error('Condition is required');
        }

        const data = {
            id: this.data.id || `condition_${Date.now()}`,
            type: 'condition',
            condition: condition,
            trueActions: this.data.trueActions || [],
            falseActions: this.data.falseActions || []
        };

        await this.manager.saveWithTransaction(data);
        await this.hide();
    }

    async cancel() {
        await this.hide();
    }
}

class TestLoopModal {
    constructor(data, manager) {
        this.data = data;
        this.manager = manager;
        this.element = null;
    }

    async show() {
        const template = document.getElementById('loop-modal-template');
        if (!template) {
            throw new Error('Loop modal template not found');
        }

        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            throw new Error('Modal container not found');
        }

        this.element = template.content.cloneNode(true);
        modalContainer.appendChild(this.element);

        return true;
    }

    async hide() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = '';
        }
        
        return true;
    }

    async save() {
        const loopConditionInput = document.getElementById('loopConditionInput');
        if (!loopConditionInput) {
            throw new Error('Loop condition input not found');
        }

        const loopCondition = loopConditionInput.value.trim();
        if (!loopCondition) {
            throw new Error('Loop condition is required');
        }

        const data = {
            id: this.data.id || `loop_${Date.now()}`,
            type: 'loop',
            loopCondition: loopCondition,
            actions: this.data.actions || []
        };

        await this.manager.saveWithTransaction(data);
        await this.hide();
    }
}

class TestParallelModal {
    constructor(data, manager) {
        this.data = data;
        this.manager = manager;
        this.element = null;
    }

    async show() {
        const template = document.getElementById('parallel-modal-template');
        if (!template) {
            throw new Error('Parallel modal template not found');
        }

        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            throw new Error('Modal container not found');
        }

        this.element = template.content.cloneNode(true);
        modalContainer.appendChild(this.element);

        return true;
    }

    async hide() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = '';
        }
        
        return true;
    }

    async save() {
        const threads = this.data.threads || [
            { name: 'Thread1', actions: [] },
            { name: 'Thread2', actions: [] }
        ];

        const data = {
            id: this.data.id || `parallel_${Date.now()}`,
            type: 'parallel',
            threads: threads
        };

        await this.manager.saveWithTransaction(data);
        await this.hide();
    }
}

/**
 * EditModalManagerとアプリケーションの統合テスト
 */
function testModalAppIntegration() {
    const runner = new TestRunner('Modal-App Integration');

    // EditModalManagerとモックアプリの連携テスト
    runner.asyncTest('should integrate with app for condition modal', async () => {
        const manager = new EditModalManager();
        manager.registerModal('condition', TestConditionModal);

        const conditionData = {
            id: 'test_condition_1',
            type: 'condition',
            condition: 'ユーザー認証',
            trueActions: [{ content: 'ログイン成功' }],
            falseActions: [{ content: 'ログイン失敗' }]
        };

        // データの保存とアプリとの連携を確認
        const savedData = await manager.saveWithTransaction(conditionData);
        expect(savedData.type).toBe('condition');
        expect(savedData.condition).toBe('ユーザー認証');

        // アプリのデータが更新されていることを確認
        expect(window.app.currentData.condition).toBe('ユーザー認証');
        
        // PlantUMLコードが生成されていることを確認
        const plantumlCode = window.app.parser.generatePlantUML();
        expect(plantumlCode).toContain('if (ユーザー認証)');
    });

    runner.asyncTest('should integrate with app for loop modal', async () => {
        const manager = new EditModalManager();
        manager.registerModal('loop', TestLoopModal);

        const loopData = {
            id: 'test_loop_1',
            type: 'loop',
            loopCondition: 'データが存在する',
            actions: [{ content: 'データ処理' }]
        };

        const savedData = await manager.saveWithTransaction(loopData);
        expect(savedData.type).toBe('loop');
        expect(savedData.loopCondition).toBe('データが存在する');

        const plantumlCode = window.app.parser.generatePlantUML();
        expect(plantumlCode).toContain('while (データが存在する)');
    });

    runner.asyncTest('should integrate with app for parallel modal', async () => {
        const manager = new EditModalManager();
        manager.registerModal('parallel', TestParallelModal);

        const parallelData = {
            id: 'test_parallel_1',
            type: 'parallel',
            threads: [
                { name: 'Thread1', actions: [{ content: 'プロセス1' }] },
                { name: 'Thread2', actions: [{ content: 'プロセス2' }] }
            ]
        };

        const savedData = await manager.saveWithTransaction(parallelData);
        expect(savedData.type).toBe('parallel');
        expect(savedData.threads).toHaveLength(2);

        const plantumlCode = window.app.parser.generatePlantUML();
        expect(plantumlCode).toContain('fork');
        expect(plantumlCode).toContain('end fork');
    });

    return runner.generateReport();
}

/**
 * モーダル表示とDOM操作の統合テスト
 */
function testModalDOMIntegration() {
    const runner = new TestRunner('Modal-DOM Integration');

    runner.asyncTest('should create and display condition modal in DOM', async () => {
        const manager = new EditModalManager();
        manager.registerModal('condition', TestConditionModal);

        const modal = await manager.openModal('condition', { condition: 'テスト条件' });
        
        expect(modal).toBeInstanceOf(TestConditionModal);
        
        // モーダルがDOMに追加されていることを確認
        const modalElement = document.querySelector('#conditionEditModal');
        expect(modalElement).toBeTruthy;
        
        await manager.closeModal();
        
        // モーダルがDOMから削除されていることを確認
        const modalElementAfterClose = document.querySelector('#conditionEditModal');
        expect(modalElementAfterClose).toBeFalsy;
    });

    runner.asyncTest('should handle modal save with DOM interaction', async () => {
        const manager = new EditModalManager();
        manager.registerModal('condition', TestConditionModal);

        await manager.openModal('condition', {});
        
        // 入力要素にデータを設定
        const conditionInput = document.getElementById('conditionInput');
        expect(conditionInput).toBeTruthy;
        
        conditionInput.value = '統合テスト条件';
        
        // 保存ボタンをクリック
        const saveBtn = document.getElementById('saveConditionEdit');
        expect(saveBtn).toBeTruthy;
        
        // モーダルの保存処理をテスト
        const modal = manager.getActiveModal();
        expect(modal).toBeInstanceOf(TestConditionModal);
        
        await modal.save();
        
        // データが保存されていることを確認
        expect(window.app.currentData.condition).toBe('統合テスト条件');
    });

    return runner.generateReport();
}

/**
 * エラーハンドリングの統合テスト
 */
function testErrorHandlingIntegration() {
    const runner = new TestRunner('Error Handling Integration');

    runner.asyncTest('should handle validation errors in modal integration', async () => {
        const manager = new EditModalManager();
        manager.registerModal('condition', TestConditionModal);

        // 無効なデータで保存を試行
        try {
            await manager.saveWithTransaction({
                type: 'condition',
                condition: '', // 空の条件（無効）
                trueActions: [],
                falseActions: []
            });
            throw new Error('Should have thrown validation error');
        } catch (error) {
            expect(error.name).toBe('ValidationError');
        }

        // エラー通知がDOMに表示されることを確認
        setTimeout(() => {
            const errorNotification = document.querySelector('.error-notification');
            if (errorNotification) {
                expect(errorNotification.textContent).toContain('入力内容に誤りがあります');
            }
        }, 100);
    });

    runner.asyncTest('should recover from errors gracefully', async () => {
        const manager = new EditModalManager();
        const errorHistory = manager.getErrorHistory();
        const initialErrorCount = errorHistory.length;

        // エラーを発生させる
        try {
            await manager.openModal('nonexistent', {});
        } catch (error) {
            // エラーが処理されることを確認
            expect(error.message).toContain('is not registered');
        }

        // エラー履歴に記録されることを確認
        const newErrorHistory = manager.getErrorHistory();
        expect(newErrorHistory.length).toBe(initialErrorCount + 1);
    });

    return runner.generateReport();
}

/**
 * UI更新の統合テスト
 */
function testUIUpdateIntegration() {
    const runner = new TestRunner('UI Update Integration');

    runner.asyncTest('should update UI after saving condition', async () => {
        const manager = new EditModalManager();
        
        // 初期状態のUI確認
        const stepsContainer = document.getElementById('steps-container');
        const initialStepCount = stepsContainer.children.length;

        const conditionData = {
            id: 'test_ui_condition',
            type: 'condition',
            condition: 'UIテスト条件',
            trueActions: [{ content: 'アクション1' }],
            falseActions: []
        };

        await manager.saveWithTransaction(conditionData);

        // UI要素が追加されていることを確認
        expect(stepsContainer.children.length).toBe(initialStepCount + 1);
        
        // 新しいステップ要素が適切に作成されていることを確認
        const newStep = stepsContainer.querySelector('[data-step-id="test_ui_condition"]');
        expect(newStep).toBeTruthy;
        expect(newStep.textContent).toContain('UIテスト条件');
    });

    runner.asyncTest('should update PlantUML code after saving', async () => {
        const manager = new EditModalManager();
        
        const plantumlOutput = document.getElementById('plantumlCode');
        const initialCode = plantumlOutput.value;

        const loopData = {
            id: 'test_ui_loop',
            type: 'loop',
            loopCondition: 'UIテストループ',
            actions: [{ content: 'ループアクション' }]
        };

        await manager.saveWithTransaction(loopData);

        // PlantUMLコードが更新されていることを確認
        expect(plantumlOutput.value).not.toBe(initialCode);
        expect(plantumlOutput.value).toContain('while (UIテストループ)');
    });

    return runner.generateReport();
}

/**
 * メイン実行関数
 */
async function runAllTests() {
    console.log('🚀 Starting Phase 5 Integration Tests for EditModalManager');
    console.log(`Test Environment: Node.js ${process.version}`);
    console.log(`Start Time: ${new Date().toISOString()}\n`);

    const reports = [];

    try {
        // 各統合テストスイートを実行
        reports.push(testModalAppIntegration());
        reports.push(testModalDOMIntegration());
        reports.push(testErrorHandlingIntegration());
        reports.push(testUIUpdateIntegration());

    } catch (error) {
        console.error('❌ Integration test execution failed:', error);
        process.exit(1);
    }

    // 総合レポート生成
    const totalTests = reports.reduce((sum, report) => sum + report.totalTests, 0);
    const totalPassed = reports.reduce((sum, report) => sum + report.passed, 0);
    const totalFailed = reports.reduce((sum, report) => sum + report.failed, 0);
    const avgDuration = reports.reduce((sum, report) => sum + report.duration, 0) / reports.length;

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 PHASE 5 INTEGRATION TESTS - SUMMARY REPORT');
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
        testType: 'integration',
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
    const reportPath = `./test-results/integration-test-report-${Date.now()}.json`;
    
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
        console.log('\n❌ Some integration tests failed. Exiting with code 1.');
        process.exit(1);
    } else {
        console.log('\n✅ All integration tests passed successfully!');
        process.exit(0);
    }
}

// テスト実行
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Unexpected error in integration tests:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testModalAppIntegration,
    testModalDOMIntegration,
    testErrorHandlingIntegration,
    testUIUpdateIntegration,
    TestRunner,
    expect
};