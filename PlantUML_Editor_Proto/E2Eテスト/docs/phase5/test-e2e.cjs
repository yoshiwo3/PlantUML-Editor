/**
 * Phase 5 End-to-End Tests for PlantUML Editor
 * 
 * 完全なユーザーワークフローをPlaywrightで実行
 * 編集機能の実際のブラウザでの動作をテスト
 * 
 * @version 1.0.0
 * @date 2025-08-14
 */

const { chromium, firefox, webkit } = require('playwright');

/**
 * テスト設定
 */
const TEST_CONFIG = {
    baseURL: process.env.BASE_URL || 'http://localhost:8087',
    headless: process.env.HEADLESS !== 'false',
    timeout: parseInt(process.env.TIMEOUT) || 30000,
    viewport: { width: 1280, height: 720 },
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    browsers: {
        chromium: process.env.BROWSER === 'chromium' || !process.env.BROWSER,
        firefox: process.env.BROWSER === 'firefox',
        webkit: process.env.BROWSER === 'webkit',
        msedge: process.env.BROWSER === 'msedge'
    }
};

/**
 * テスト結果記録用クラス
 */
class E2ETestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passedTests = 0;
        this.failedTests = 0;
        this.startTime = Date.now();
        this.screenshots = [];
        this.videos = [];
    }

    async test(testName, testFn) {
        console.log(`\n  Running E2E: ${testName}`);
        
        try {
            await testFn();
            this.tests.push({ name: testName, status: 'PASS', error: null });
            this.passedTests++;
            console.log(`  ✅ ${testName}`);
        } catch (error) {
            this.tests.push({ name: testName, status: 'FAIL', error: error.message, stack: error.stack });
            this.failedTests++;
            console.log(`  ❌ ${testName}: ${error.message}`);
        }
    }

    addScreenshot(path) {
        this.screenshots.push(path);
    }

    addVideo(path) {
        this.videos.push(path);
    }

    generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`E2E Test Suite: ${this.suiteName}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.failedTests}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Screenshots: ${this.screenshots.length}`);
        console.log(`Videos: ${this.videos.length}`);
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
            screenshots: this.screenshots,
            videos: this.videos,
            successRate: (this.passedTests / this.tests.length) * 100,
            tests: this.tests
        };
    }
}

/**
 * ブラウザ設定とユーティリティ
 */
class BrowserManager {
    constructor() {
        this.browsers = new Map();
        this.contexts = new Map();
        this.pages = new Map();
    }

    async launchBrowser(browserName) {
        let browserType;
        
        switch (browserName) {
            case 'chromium':
                browserType = chromium;
                break;
            case 'firefox':
                browserType = firefox;
                break;
            case 'webkit':
                browserType = webkit;
                break;
            case 'msedge':
                browserType = chromium;
                break;
            default:
                throw new Error(`Unsupported browser: ${browserName}`);
        }

        const browser = await browserType.launch({
            headless: TEST_CONFIG.headless,
            args: browserName === 'msedge' ? ['--use-chromium-edge'] : undefined
        });

        this.browsers.set(browserName, browser);
        
        const context = await browser.newContext({
            viewport: TEST_CONFIG.viewport,
            ignoreHTTPSErrors: true,
            recordVideo: {
                dir: './test-results/videos/',
                size: TEST_CONFIG.viewport
            }
        });

        this.contexts.set(browserName, context);
        
        const page = await context.newPage();
        this.pages.set(browserName, page);
        
        return { browser, context, page };
    }

    async closeBrowser(browserName) {
        const browser = this.browsers.get(browserName);
        if (browser) {
            await browser.close();
            this.browsers.delete(browserName);
            this.contexts.delete(browserName);
            this.pages.delete(browserName);
        }
    }

    async closeAllBrowsers() {
        for (const browserName of this.browsers.keys()) {
            await this.closeBrowser(browserName);
        }
    }

    getPage(browserName) {
        return this.pages.get(browserName);
    }
}

/**
 * PlantUML Editor用のページオブジェクト
 */
class PlantUMLEditorPage {
    constructor(page) {
        this.page = page;
    }

    async navigateToEditor() {
        await this.page.goto(TEST_CONFIG.baseURL);
        await this.page.waitForSelector('#app', { timeout: TEST_CONFIG.timeout });
    }

    async waitForPageLoad() {
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForSelector('#visual-editor');
        await this.page.waitForSelector('#plantuml-output');
        
        // EditModalManagerの読み込み待機
        await this.page.waitForFunction(() => {
            return typeof window.EditModalManager !== 'undefined';
        }, { timeout: 10000 });
    }

    async clickAddFirstStep() {
        await this.page.click('#addFirstStepBtn');
        await this.page.waitForTimeout(500); // アニメーション待ち
    }

    async selectStepType(stepType) {
        const selector = `[data-type="${stepType}"]`;
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.click(selector);
    }

    async fillConditionModal(condition, trueAction, falseAction) {
        await this.page.waitForSelector('#conditionEditModal', { timeout: 5000 });
        
        // 条件入力
        await this.page.fill('#conditionInput', condition);
        
        // TRUE分岐のアクション追加
        if (trueAction) {
            await this.page.click('[data-branch="true"] .btn-add-action');
            await this.page.waitForSelector('.action-content');
            await this.page.fill('.action-content', trueAction);
        }
        
        // FALSE分岐のアクション追加
        if (falseAction) {
            await this.page.click('[data-branch="false"] .btn-add-action');
            const falseActionInputs = await this.page.$$('.action-content');
            if (falseActionInputs.length > 1) {
                await falseActionInputs[1].fill(falseAction);
            }
        }
    }

    async fillLoopModal(loopCondition, action) {
        await this.page.waitForSelector('#loopEditModal', { timeout: 5000 });
        
        // ループ条件入力
        await this.page.fill('#loopConditionInput', loopCondition);
        
        // アクション追加
        if (action) {
            await this.page.click('.btn-add-action');
            await this.page.waitForSelector('.action-content');
            await this.page.fill('.action-content', action);
        }
    }

    async fillParallelModal(thread1Action, thread2Action) {
        await this.page.waitForSelector('#parallelEditModal', { timeout: 5000 });
        
        // スレッド1のアクション
        if (thread1Action) {
            const thread1Container = await this.page.$('[data-thread="1"]');
            await thread1Container.$('.btn-add-action').then(btn => btn.click());
            await this.page.waitForSelector('.action-content');
            const actionInputs = await this.page.$$('.action-content');
            if (actionInputs.length > 0) {
                await actionInputs[0].fill(thread1Action);
            }
        }
        
        // スレッド2のアクション
        if (thread2Action) {
            const thread2Container = await this.page.$('[data-thread="2"]');
            await thread2Container.$('.btn-add-action').then(btn => btn.click());
            await this.page.waitForTimeout(500);
            const actionInputs = await this.page.$$('.action-content');
            if (actionInputs.length > 1) {
                await actionInputs[1].fill(thread2Action);
            }
        }
    }

    async saveModal() {
        const saveButtons = [
            '#saveConditionEdit',
            '#saveLoopEdit', 
            '#saveParallelEdit'
        ];
        
        for (const buttonSelector of saveButtons) {
            const button = await this.page.$(buttonSelector);
            if (button) {
                await button.click();
                await this.page.waitForTimeout(1000); // 保存処理待ち
                break;
            }
        }
    }

    async cancelModal() {
        const cancelButtons = [
            '#cancelConditionEdit',
            '#cancelLoopEdit',
            '#cancelParallelEdit'
        ];
        
        for (const buttonSelector of cancelButtons) {
            const button = await this.page.$(buttonSelector);
            if (button) {
                await button.click();
                break;
            }
        }
    }

    async getPlantUMLCode() {
        const textarea = await this.page.$('#plantumlCode');
        if (textarea) {
            return await textarea.inputValue();
        }
        return '';
    }

    async getStepsCount() {
        const steps = await this.page.$$('#steps-container > div');
        return steps.length;
    }

    async hasErrorNotification() {
        const errorNotification = await this.page.$('.error-notification');
        return !!errorNotification;
    }

    async hasSuccessNotification() {
        const successNotification = await this.page.$('.success-notification');
        return !!successNotification;
    }

    async getConsoleErrors() {
        const errors = [];
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        return errors;
    }

    async takeScreenshot(name) {
        const timestamp = Date.now();
        const path = `./test-results/screenshots/${name}_${timestamp}.png`;
        await this.page.screenshot({ path, fullPage: true });
        return path;
    }
}

/**
 * 条件分岐編集のE2Eテスト
 */
async function testConditionEditingWorkflow(browserManager, browserName) {
    const runner = new E2ETestRunner(`Condition Editing - ${browserName}`);
    
    const { page } = await browserManager.launchBrowser(browserName);
    const editorPage = new PlantUMLEditorPage(page);

    await runner.test('should navigate to PlantUML Editor', async () => {
        await editorPage.navigateToEditor();
        await editorPage.waitForPageLoad();
        
        // ページタイトルの確認
        const title = await page.title();
        if (!title.includes('PlantUML')) {
            throw new Error(`Expected title to contain 'PlantUML', got: ${title}`);
        }
    });

    await runner.test('should add condition step via modal', async () => {
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('condition');
        
        await editorPage.fillConditionModal(
            'ユーザー認証', 
            'ログイン成功処理', 
            'エラーページ表示'
        );
        
        await editorPage.saveModal();
        
        // ステップが追加されたことを確認
        const stepsCount = await editorPage.getStepsCount();
        if (stepsCount !== 1) {
            throw new Error(`Expected 1 step, got ${stepsCount}`);
        }
        
        // PlantUMLコードが生成されたことを確認
        const code = await editorPage.getPlantUMLCode();
        if (!code.includes('if (ユーザー認証)')) {
            throw new Error('PlantUML code should contain condition');
        }
    });

    await runner.test('should handle validation errors', async () => {
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('condition');
        
        // 空の条件で保存を試行
        await editorPage.fillConditionModal('', '', '');
        await editorPage.saveModal();
        
        // エラー通知が表示されることを確認
        await page.waitForTimeout(1000);
        const hasError = await editorPage.hasErrorNotification();
        if (!hasError) {
            throw new Error('Expected validation error notification');
        }
    });

    await runner.test('should cancel modal correctly', async () => {
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('condition');
        
        await editorPage.fillConditionModal('テストキャンセル', 'アクション', '');
        await editorPage.cancelModal();
        
        // モーダルが閉じられることを確認
        const modal = await page.$('#conditionEditModal');
        if (modal) {
            throw new Error('Modal should be closed');
        }
    });

    return runner.generateReport();
}

/**
 * ループ編集のE2Eテスト
 */
async function testLoopEditingWorkflow(browserManager, browserName) {
    const runner = new E2ETestRunner(`Loop Editing - ${browserName}`);
    
    const { page } = await browserManager.launchBrowser(browserName);
    const editorPage = new PlantUMLEditorPage(page);

    await runner.test('should navigate to PlantUML Editor', async () => {
        await editorPage.navigateToEditor();
        await editorPage.waitForPageLoad();
    });

    await runner.test('should add loop step via modal', async () => {
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('loop');
        
        await editorPage.fillLoopModal('データが存在する', 'データ処理');
        await editorPage.saveModal();
        
        // ステップが追加されたことを確認
        const stepsCount = await editorPage.getStepsCount();
        if (stepsCount !== 1) {
            throw new Error(`Expected 1 step, got ${stepsCount}`);
        }
        
        // PlantUMLコードが生成されたことを確認
        const code = await editorPage.getPlantUMLCode();
        if (!code.includes('while (データが存在する)')) {
            throw new Error('PlantUML code should contain loop');
        }
    });

    await runner.test('should validate loop condition requirement', async () => {
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('loop');
        
        // 空のループ条件で保存を試行
        await editorPage.fillLoopModal('', 'アクション');
        await editorPage.saveModal();
        
        // エラー通知が表示されることを確認
        await page.waitForTimeout(1000);
        const hasError = await editorPage.hasErrorNotification();
        if (!hasError) {
            throw new Error('Expected validation error for empty loop condition');
        }
    });

    return runner.generateReport();
}

/**
 * 並行処理編集のE2Eテスト
 */
async function testParallelEditingWorkflow(browserManager, browserName) {
    const runner = new E2ETestRunner(`Parallel Editing - ${browserName}`);
    
    const { page } = await browserManager.launchBrowser(browserName);
    const editorPage = new PlantUMLEditorPage(page);

    await runner.test('should navigate to PlantUML Editor', async () => {
        await editorPage.navigateToEditor();
        await editorPage.waitForPageLoad();
    });

    await runner.test('should add parallel step via modal', async () => {
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('parallel');
        
        await editorPage.fillParallelModal('プロセス1実行', 'プロセス2実行');
        await editorPage.saveModal();
        
        // ステップが追加されたことを確認
        const stepsCount = await editorPage.getStepsCount();
        if (stepsCount !== 1) {
            throw new Error(`Expected 1 step, got ${stepsCount}`);
        }
        
        // PlantUMLコードが生成されたことを確認
        const code = await editorPage.getPlantUMLCode();
        if (!code.includes('fork')) {
            throw new Error('PlantUML code should contain parallel processing');
        }
    });

    return runner.generateReport();
}

/**
 * 複合ワークフローのE2Eテスト
 */
async function testComplexWorkflow(browserManager, browserName) {
    const runner = new E2ETestRunner(`Complex Workflow - ${browserName}`);
    
    const { page } = await browserManager.launchBrowser(browserName);
    const editorPage = new PlantUMLEditorPage(page);

    await runner.test('should create complex workflow with multiple steps', async () => {
        await editorPage.navigateToEditor();
        await editorPage.waitForPageLoad();
        
        // 1. 条件分岐ステップ追加
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('condition');
        await editorPage.fillConditionModal('認証確認', 'ログイン成功', 'ログイン失敗');
        await editorPage.saveModal();
        
        await page.waitForTimeout(1000);
        
        // 2. ループステップ追加
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('loop');
        await editorPage.fillLoopModal('データ処理継続', 'データ変換');
        await editorPage.saveModal();
        
        await page.waitForTimeout(1000);
        
        // 3. 並行処理ステップ追加
        await editorPage.clickAddFirstStep();
        await editorPage.selectStepType('parallel');
        await editorPage.fillParallelModal('バックアップ処理', '通知処理');
        await editorPage.saveModal();
        
        await page.waitForTimeout(2000);
        
        // 全てのステップが追加されたことを確認
        const stepsCount = await editorPage.getStepsCount();
        if (stepsCount !== 3) {
            throw new Error(`Expected 3 steps, got ${stepsCount}`);
        }
        
        // PlantUMLコードが適切に生成されたことを確認
        const code = await editorPage.getPlantUMLCode();
        if (!code.includes('if (認証確認)') || 
            !code.includes('while (データ処理継続)') || 
            !code.includes('fork')) {
            throw new Error('PlantUML code should contain all step types');
        }
        
        // スクリーンショット撮影
        const screenshotPath = await editorPage.takeScreenshot('complex_workflow_complete');
        runner.addScreenshot(screenshotPath);
    });

    return runner.generateReport();
}

/**
 * メイン実行関数
 */
async function runAllE2ETests() {
    console.log('🚀 Starting Phase 5 E2E Tests for PlantUML Editor');
    console.log(`Test Environment: Playwright`);
    console.log(`Base URL: ${TEST_CONFIG.baseURL}`);
    console.log(`Start Time: ${new Date().toISOString()}\n`);

    const browserManager = new BrowserManager();
    const reports = [];

    // テスト結果ディレクトリの作成
    const fs = require('fs');
    const dirs = ['./test-results', './test-results/screenshots', './test-results/videos'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    try {
        // 実行するブラウザを決定
        const browsersToTest = [];
        Object.keys(TEST_CONFIG.browsers).forEach(browser => {
            if (TEST_CONFIG.browsers[browser]) {
                browsersToTest.push(browser);
            }
        });

        if (browsersToTest.length === 0) {
            browsersToTest.push('chromium'); // デフォルト
        }

        console.log(`Testing with browsers: ${browsersToTest.join(', ')}`);

        // 各ブラウザでテストを実行
        for (const browserName of browsersToTest) {
            console.log(`\n🌐 Starting tests for ${browserName.toUpperCase()}`);
            
            try {
                // 条件分岐編集テスト
                const conditionReport = await testConditionEditingWorkflow(browserManager, browserName);
                reports.push(conditionReport);
                
                // ループ編集テスト
                const loopReport = await testLoopEditingWorkflow(browserManager, browserName);
                reports.push(loopReport);
                
                // 並行処理編集テスト
                const parallelReport = await testParallelEditingWorkflow(browserManager, browserName);
                reports.push(parallelReport);
                
                // 複合ワークフローテスト
                const complexReport = await testComplexWorkflow(browserManager, browserName);
                reports.push(complexReport);
                
            } catch (error) {
                console.error(`❌ Error testing with ${browserName}:`, error);
            }
            
            await browserManager.closeBrowser(browserName);
        }

    } catch (error) {
        console.error('❌ E2E test execution failed:', error);
        process.exit(1);
    } finally {
        await browserManager.closeAllBrowsers();
    }

    // 総合レポート生成
    const totalTests = reports.reduce((sum, report) => sum + report.totalTests, 0);
    const totalPassed = reports.reduce((sum, report) => sum + report.passed, 0);
    const totalFailed = reports.reduce((sum, report) => sum + report.failed, 0);
    const avgDuration = reports.reduce((sum, report) => sum + report.duration, 0) / reports.length;
    const totalScreenshots = reports.reduce((sum, report) => sum + report.screenshots.length, 0);
    const totalVideos = reports.reduce((sum, report) => sum + report.videos.length, 0);

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 PHASE 5 E2E TESTS - SUMMARY REPORT');
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Test Suites: ${reports.length}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Total Passed: ${totalPassed}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Screenshots Captured: ${totalScreenshots}`);
    console.log(`Videos Recorded: ${totalVideos}`);
    console.log(`Completion Time: ${new Date().toISOString()}`);

    // 詳細レポートをファイルに保存
    const detailedReport = {
        timestamp: new Date().toISOString(),
        testType: 'e2e',
        phase: 5,
        config: TEST_CONFIG,
        summary: {
            totalSuites: reports.length,
            totalTests,
            totalPassed,
            totalFailed,
            successRate: (totalPassed / totalTests) * 100,
            avgDuration,
            totalScreenshots,
            totalVideos
        },
        suites: reports
    };

    // レポートファイル出力
    const reportPath = `./test-results/e2e-test-report-${Date.now()}.json`;
    
    try {
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`\n📄 Detailed E2E report saved to: ${reportPath}`);
    } catch (error) {
        console.log(`\n⚠️  Could not save E2E report file: ${error.message}`);
    }

    // 終了コード設定
    if (totalFailed > 0) {
        console.log('\n❌ Some E2E tests failed. Exiting with code 1.');
        process.exit(1);
    } else {
        console.log('\n✅ All E2E tests passed successfully!');
        process.exit(0);
    }
}

// テスト実行
if (require.main === module) {
    runAllE2ETests().catch(error => {
        console.error('❌ Unexpected error in E2E tests:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllE2ETests,
    testConditionEditingWorkflow,
    testLoopEditingWorkflow,
    testParallelEditingWorkflow,
    testComplexWorkflow,
    BrowserManager,
    PlantUMLEditorPage,
    E2ETestRunner
};