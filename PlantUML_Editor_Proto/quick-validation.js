// PlantUML エディター クイック動作確認スクリプト
// MCP Playwright サービス対応

const { chromium } = require('playwright');

async function runValidation() {
    console.log('🚀 PlantUML エディター動作確認を開始します...');
    
    const browser = await chromium.launch({ 
        headless: false, // ヘッドレスモードを無効にしてブラウザを表示
        slowMo: 500 // 操作を視覚的に確認するためのスロー再生
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // エラー監視を設定
        const consoleErrors = [];
        const pageErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
                console.log('❌ コンソールエラー:', msg.text());
            }
        });
        
        page.on('pageerror', error => {
            pageErrors.push(error.message);
            console.log('💥 ページエラー:', error.message);
        });

        console.log('1️⃣ メインページにアクセス中...');
        
        // ローカルファイルとして直接開く
        const filePath = `file:///C:/d/PlantUML/PlantUML_Editor_Proto/index.html`;
        await page.goto(filePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('2️⃣ キャッシュバスティング確認...');
        
        // app.jsのスクリプトタグ確認
        const appScript = await page.$('script[src*="app.js"]');
        if (appScript) {
            const src = await appScript.getAttribute('src');
            console.log('✅ app.js スクリプト:', src);
            if (src.includes('?v=')) {
                console.log('✅ キャッシュバスティング パラメータを確認しました');
            } else {
                console.log('⚠️ キャッシュバスティング パラメータが見つかりません');
            }
        } else {
            console.log('❌ app.js スクリプトが見つかりません');
        }

        console.log('3️⃣ getCurrentActorsメソッドテスト...');
        
        // エディターインスタンスの確認とgetCurrentActorsメソッドテスト
        const getCurrentActorsResult = await page.evaluate(() => {
            try {
                // エディターインスタンスを探す
                let editor = null;
                if (window.plantUMLEditor) {
                    editor = window.plantUMLEditor;
                } else if (window.app) {
                    editor = window.app;
                } else {
                    // グローバルスコープを検索
                    for (let prop in window) {
                        if (window[prop] && typeof window[prop] === 'object' && 
                            typeof window[prop].getCurrentActors === 'function') {
                            editor = window[prop];
                            break;
                        }
                    }
                }

                if (!editor) {
                    return { success: false, error: 'エディターインスタンスが見つかりません' };
                }

                if (typeof editor.getCurrentActors !== 'function') {
                    return { success: false, error: 'getCurrentActorsメソッドが存在しません' };
                }

                const actors = editor.getCurrentActors();
                return {
                    success: true,
                    type: typeof actors,
                    isArray: Array.isArray(actors),
                    isSet: actors && typeof actors.size === 'number',
                    length: Array.isArray(actors) ? actors.length : (actors && actors.size) || 0,
                    value: Array.isArray(actors) ? actors : Array.from(actors || [])
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        if (getCurrentActorsResult.success) {
            console.log('✅ getCurrentActorsメソッドテスト成功');
            console.log(`   戻り値の型: ${getCurrentActorsResult.type}`);
            console.log(`   要素数: ${getCurrentActorsResult.length}`);
        } else {
            console.log('❌ getCurrentActorsメソッドテスト失敗:', getCurrentActorsResult.error);
        }

        console.log('4️⃣ アクター選択テスト...');
        
        // アクターボタンの確認とクリック
        const actorButtons = await page.$$('.actor-btn[data-actor]');
        console.log(`   アクターボタン数: ${actorButtons.length}`);
        
        if (actorButtons.length > 0) {
            // 最初のアクターをクリック
            const firstActor = await actorButtons[0].getAttribute('data-actor');
            console.log(`   "${firstActor}" アクターをクリック中...`);
            await actorButtons[0].click();
            await page.waitForTimeout(500);
            
            // アクター選択後の状態確認
            const afterClickResult = await page.evaluate(() => {
                const instances = [window.plantUMLEditor, window.app];
                for (const instance of instances) {
                    if (instance && typeof instance.getCurrentActors === 'function') {
                        const actors = instance.getCurrentActors();
                        return {
                            length: Array.isArray(actors) ? actors.length : (actors && actors.size) || 0,
                            value: Array.isArray(actors) ? actors : Array.from(actors || [])
                        };
                    }
                }
                return { length: 0, value: [] };
            });
            
            console.log(`   選択後のアクター数: ${afterClickResult.length}`);
            console.log(`   選択済みアクター: [${afterClickResult.value.join(', ')}]`);
            
            if (afterClickResult.length > 0) {
                console.log('✅ アクター選択テスト成功');
            } else {
                console.log('⚠️ アクターが選択されていない可能性があります');
            }
        }

        console.log('5️⃣ UI要素確認...');
        
        // 主要なUI要素の存在確認
        const uiElements = {
            'アプリコンテナ': '.app-container',
            'アクターグリッド': '.actor-grid',
            '選択されたアクター': '.selected-actors',
            'PlantUMLコードエディタ': '#plantuml-code',
            'ループビルダー': '#loop-builder',
            '並列処理ビルダー': '#parallel-builder'
        };
        
        for (const [name, selector] of Object.entries(uiElements)) {
            const element = await page.$(selector);
            console.log(`   ${name}: ${element ? '✅ 存在' : '❌ 見つからない'}`);
        }

        console.log('6️⃣ タブ切り替えテスト...');
        
        // ループタブのクリックテスト
        const loopTab = await page.$('[data-type="loop"]');
        if (loopTab) {
            console.log('   ループタブをクリック中...');
            await loopTab.click();
            await page.waitForTimeout(300);
            
            const loopBuilder = await page.$('#loop-builder');
            const isVisible = await loopBuilder.isVisible();
            console.log(`   ループビルダー表示: ${isVisible ? '✅ 成功' : '❌ 失敗'}`);
        }

        // 並列処理タブのクリックテスト
        const parallelTab = await page.$('[data-type="parallel"]');
        if (parallelTab) {
            console.log('   並列処理タブをクリック中...');
            await parallelTab.click();
            await page.waitForTimeout(300);
            
            const parallelBuilder = await page.$('#parallel-builder');
            const isVisible = await parallelBuilder.isVisible();
            console.log(`   並列処理ビルダー表示: ${isVisible ? '✅ 成功' : '❌ 失敗'}`);
        }

        console.log('7️⃣ 総合結果...');
        console.log(`   コンソールエラー数: ${consoleErrors.length}`);
        console.log(`   ページエラー数: ${pageErrors.length}`);
        
        if (consoleErrors.length === 0 && pageErrors.length === 0) {
            console.log('✅ エラーは検出されませんでした');
        } else {
            console.log('⚠️ エラーが検出されました:');
            consoleErrors.forEach((error, i) => console.log(`     コンソール${i+1}: ${error}`));
            pageErrors.forEach((error, i) => console.log(`     ページ${i+1}: ${error}`));
        }

        // スクリーンショットを撮影
        console.log('📸 スクリーンショットを撮影中...');
        await page.screenshot({ 
            path: 'validation-screenshot.png', 
            fullPage: true 
        });
        console.log('✅ スクリーンショットを保存しました: validation-screenshot.png');

    } catch (error) {
        console.error('💥 テスト実行中にエラーが発生しました:', error.message);
    } finally {
        console.log('🔚 テスト完了。ブラウザを閉じます...');
        await browser.close();
    }
}

// 実行
if (require.main === module) {
    runValidation().catch(console.error);
}

module.exports = { runValidation };