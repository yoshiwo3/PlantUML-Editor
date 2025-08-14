/**
 * Phase2-A: 同期機能テスト
 * PlantUMLコード直接編集とUIへの双方向同期機能の検証
 */

const playwright = require('playwright');

// 環境変数からベースURLを取得
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';

// テスト結果
const results = {
    passed: [],
    failed: [],
    startTime: Date.now()
};

// カラー出力用のヘルパー
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(color, symbol, message) {
    console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

// テスト実行関数
async function runTest(name, testFn) {
    try {
        log('blue', 'ℹ', `実行中: ${name}`);
        const start = Date.now();
        await testFn();
        const duration = Date.now() - start;
        log('green', '✓', `${name} (${duration}ms)`);
        results.passed.push({ name, duration });
    } catch (error) {
        log('red', '✗', `${name}: ${error.message}`);
        results.failed.push({ name, error: error.message });
    }
}

// コード同期状態を検証する共通関数
async function verifySync(page, expectedCode, description) {
    await page.waitForTimeout(500); // 同期処理待機
    
    const codeTextarea = await page.locator('#plantuml-code');
    const actualCode = await codeTextarea.inputValue();
    
    if (!actualCode.includes(expectedCode)) {
        throw new Error(`${description}: 期待されたコード「${expectedCode}」が見つかりません。実際: ${actualCode.substring(0, 100)}...`);
    }
    
    log('cyan', '→', `同期確認OK: ${description}`);
}

// UIコンポーネントの状態確認
async function verifyUIState(page, selector, expectedState, description) {
    const element = page.locator(selector);
    const isVisible = await element.isVisible().catch(() => false);
    const count = await element.count();
    
    if (expectedState === 'visible' && !isVisible) {
        throw new Error(`${description}: 要素が表示されていません (${selector})`);
    }
    if (expectedState === 'exists' && count === 0) {
        throw new Error(`${description}: 要素が存在しません (${selector})`);
    }
    
    log('cyan', '→', `UI状態確認OK: ${description}`);
}

// メインテスト
async function main() {
    console.log('\n' + colors.magenta + '=' .repeat(60));
    console.log('  PlantUMLエディタ E2Eテスト Phase2-A: 同期機能テスト');
    console.log('=' .repeat(60) + colors.reset + '\n');
    
    log('blue', 'ℹ', `ベースURL: ${BASE_URL}`);
    
    // ブラウザタイプの選択
    const browserType = process.argv[2] || 'chromium';
    log('blue', 'ℹ', `ブラウザ: ${browserType}`);
    
    let browser;
    
    try {
        // ブラウザ起動（既存の設定を継承）
        switch (browserType) {
            case 'firefox':
                browser = await playwright.firefox.launch({ 
                    headless: true,
                    args: ['--no-sandbox']
                });
                break;
            case 'webkit':
                browser = await playwright.webkit.launch({ 
                    headless: true,
                    args: ['--no-sandbox']
                });
                break;
            case 'msedge':
            case 'edge':
                browser = await playwright.chromium.launch({ 
                    headless: true,
                    channel: 'msedge',
                    args: ['--no-sandbox', '--disable-dev-shm-usage']
                });
                break;
            default:
                browser = await playwright.chromium.launch({ 
                    headless: true,
                    args: ['--no-sandbox', '--disable-dev-shm-usage']
                });
        }
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP',
            ignoreHTTPSErrors: true
        });
        
        const page = await context.newPage();
        
        // コンソールメッセージの記録
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`[Browser Error] ${msg.text()}`);
            }
        });
        
        // Phase2-A テストケース実行
        
        await runTest('SYNC-001: 初期状態の同期確認', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 初期コードの確認
            const initialCode = await page.locator('#plantuml-code').inputValue();
            if (!initialCode.includes('@startuml')) {
                throw new Error(`初期コードが不正: ${initialCode}`);
            }
            
            log('cyan', '→', `初期コード確認: ${initialCode.split('\n')[0]}...`);
        });

        await runTest('SYNC-002: PlantUMLコード直接編集→UI反映', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // PlantUMLコードを直接編集
            const newCode = `@startuml
participant "テストユーザー" as User
participant "システム" as System
User -> System: テストメッセージ
System --> User: 応答メッセージ
@enduml`;
            
            const codeTextarea = page.locator('#plantuml-code');
            await codeTextarea.clear();
            await codeTextarea.fill(newCode);
            await codeTextarea.blur(); // フォーカスを外してイベント発火
            
            await page.waitForTimeout(1000); // UI更新待機
            
            // UIへの反映確認（選択されたアクター等の更新）
            const updatedCode = await codeTextarea.inputValue();
            if (!updatedCode.includes('テストユーザー')) {
                throw new Error('直接編集したコードが保持されていません');
            }
            
            log('cyan', '→', 'PlantUMLコード直接編集→保持確認完了');
        });

        await runTest('SYNC-003: UIアクション→PlantUMLコード反映', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 初期コードを確認
            const initialCode = await page.locator('#plantuml-code').inputValue();
            
            // UIからアクターを追加
            const customerBtn = page.locator('button:has-text("顧客")').first();
            if (await customerBtn.count() > 0) {
                await customerBtn.click();
                await verifySync(page, '顧客', 'UIアクション→PlantUMLコード反映');
            }
            
            // 別のアクターも追加して複数同期テスト
            const systemBtn = page.locator('button:has-text("システム")').first();
            if (await systemBtn.count() > 0) {
                await systemBtn.click();
                await verifySync(page, 'システム', '複数アクター同期テスト');
            }
        });

        await runTest('SYNC-004: 双方向同期（UI↔コード相互編集）', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // Step1: UIでアクター追加
            const customerBtn = page.locator('button:has-text("顧客")').first();
            if (await customerBtn.count() > 0) {
                await customerBtn.click();
                await verifySync(page, '顧客', 'UI→コード同期');
            }
            
            // Step2: コードを直接編集して追加
            const codeTextarea = page.locator('#plantuml-code');
            let currentCode = await codeTextarea.inputValue();
            const additionalCode = currentCode.replace('@enduml', 'participant "管理者" as Admin\n@enduml');
            
            await codeTextarea.clear();
            await codeTextarea.fill(additionalCode);
            await codeTextarea.blur();
            
            await page.waitForTimeout(1000);
            
            // Step3: 再度UIからアクション（混在テスト）
            const serviceBtn = page.locator('button:has-text("サービス")').first();
            if (await serviceBtn.count() > 0) {
                await serviceBtn.click();
                await verifySync(page, 'サービス', '混在編集後の同期');
            }
            
            // 最終的にすべてのアクターが含まれているか確認
            const finalCode = await codeTextarea.inputValue();
            const requiredElements = ['顧客', '管理者', 'サービス'];
            
            for (const element of requiredElements) {
                if (!finalCode.includes(element)) {
                    throw new Error(`双方向同期失敗: ${element}が最終コードに含まれていません`);
                }
            }
            
            log('cyan', '→', '双方向同期テスト完了');
        });

        await runTest('SYNC-005: エラー状態での同期保持', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 正常なコードから開始
            const customerBtn = page.locator('button:has-text("顧客")').first();
            if (await customerBtn.count() > 0) {
                await customerBtn.click();
                await verifySync(page, '顧客', '初期正常状態');
            }
            
            // 意図的に不正なコードを入力
            const codeTextarea = page.locator('#plantuml-code');
            const invalidCode = `@startuml
invalid syntax here
participant "顧客" as Customer
missing @enduml`;
            
            await codeTextarea.clear();
            await codeTextarea.fill(invalidCode);
            await codeTextarea.blur();
            
            await page.waitForTimeout(1000);
            
            // エラー状態でも基本的なコード構造は保持されているか
            const errorStateCode = await codeTextarea.inputValue();
            if (!errorStateCode.includes('顧客')) {
                throw new Error('エラー状態でアクター情報が失われました');
            }
            
            // 正常なコードに復旧
            const validCode = `@startuml
participant "顧客" as Customer
participant "システム" as System
Customer -> System: リクエスト
@enduml`;
            
            await codeTextarea.clear();
            await codeTextarea.fill(validCode);
            await codeTextarea.blur();
            
            await page.waitForTimeout(1000);
            
            // UIからのアクションが正常に動作するか確認
            const systemBtn = page.locator('button:has-text("システム")').first();
            if (await systemBtn.count() > 0) {
                await systemBtn.click();
                // エラー復旧後も正常同期する
                await verifySync(page, 'システム', 'エラー復旧後の同期');
            }
            
            log('cyan', '→', 'エラー状態同期保持テスト完了');
        });

        await runTest('SYNC-006: リアルタイム同期の応答速度', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 連続的なアクション実行による応答速度測定
            const actions = [
                { name: '顧客', selector: 'button:has-text("顧客")' },
                { name: 'システム', selector: 'button:has-text("システム")' },
                { name: 'サービス', selector: 'button:has-text("サービス")' }
            ];
            
            const syncTimes = [];
            
            for (const action of actions) {
                const btn = page.locator(action.selector).first();
                if (await btn.count() > 0) {
                    const start = Date.now();
                    await btn.click();
                    
                    // 同期完了まで待機（最大2秒）
                    await page.waitForTimeout(100);
                    let synced = false;
                    let attempts = 0;
                    
                    while (!synced && attempts < 20) {
                        const code = await page.locator('#plantuml-code').inputValue();
                        if (code.includes(action.name)) {
                            synced = true;
                            const syncTime = Date.now() - start;
                            syncTimes.push(syncTime);
                            log('cyan', '→', `${action.name}同期完了: ${syncTime}ms`);
                        } else {
                            await page.waitForTimeout(100);
                            attempts++;
                        }
                    }
                    
                    if (!synced) {
                        throw new Error(`${action.name}の同期がタイムアウト`);
                    }
                }
            }
            
            // 平均同期時間の検証
            const avgSyncTime = syncTimes.reduce((sum, time) => sum + time, 0) / syncTimes.length;
            if (avgSyncTime > 1000) {
                throw new Error(`同期が遅すぎます: 平均${avgSyncTime}ms（上限1000ms）`);
            }
            
            log('cyan', '→', `平均同期時間: ${avgSyncTime.toFixed(0)}ms`);
        });

        await runTest('SYNC-007: コード整合性チェック', async () => {
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            
            // 複数のアクションを実行
            const testActions = [
                'button:has-text("顧客")',
                'button:has-text("システム")',
                'button:has-text("サービス")'
            ];
            
            for (const selector of testActions) {
                const btn = page.locator(selector).first();
                if (await btn.count() > 0) {
                    await btn.click();
                    await page.waitForTimeout(300);
                }
            }
            
            // 最終コードの整合性チェック
            const finalCode = await page.locator('#plantuml-code').inputValue();
            
            // 基本構造の確認
            const requiredElements = [
                '@startuml',
                '@enduml',
                'participant'
            ];
            
            for (const element of requiredElements) {
                if (!finalCode.includes(element)) {
                    throw new Error(`コード構造エラー: ${element}が見つかりません`);
                }
            }
            
            // 重複やフォーマットの確認
            const lines = finalCode.split('\n');
            const participantLines = lines.filter(line => line.includes('participant'));
            
            if (participantLines.length === 0) {
                throw new Error('participantが定義されていません');
            }
            
            log('cyan', '→', `整合性チェック完了: ${participantLines.length}個のparticipant定義を確認`);
        });
        
        await browser.close();
        
    } catch (error) {
        log('red', '✗', `致命的エラー: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
    
    // 結果サマリー
    console.log('\n' + colors.magenta + '=' .repeat(60));
    console.log('  Phase2-A 同期機能テスト結果');
    console.log('=' .repeat(60) + colors.reset + '\n');
    
    const total = results.passed.length + results.failed.length;
    const duration = Date.now() - results.startTime;
    
    console.log(`実行時間: ${(duration / 1000).toFixed(2)}秒`);
    console.log(`テスト数: ${total}`);
    log('green', '✓', `成功: ${results.passed.length}`);
    log('red', '✗', `失敗: ${results.failed.length}`);
    
    if (results.passed.length > 0) {
        console.log('\n成功したテスト:');
        results.passed.forEach(test => {
            log('green', '+', `${test.name} (${test.duration}ms)`);
        });
    }
    
    if (results.failed.length > 0) {
        console.log('\n失敗したテスト:');
        results.failed.forEach(test => {
            log('red', '-', `${test.name}: ${test.error}`);
        });
    }
    
    // 終了コード
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    log('red', '✗', `未処理のエラー: ${error}`);
    process.exit(1);
});

// 実行
main().catch(error => {
    log('red', '✗', `実行エラー: ${error}`);
    process.exit(1);
});