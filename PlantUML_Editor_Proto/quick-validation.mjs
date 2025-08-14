// PlantUML エディター クイック動作確認スクリプト (ES Modules版)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runValidation() {
    console.log('🚀 PlantUML エディター動作確認を開始します...');
    
    const browser = await chromium.launch({ 
        headless: false, // ヘッドレスモードを無効にしてブラウザを表示
        slowMo: 300 // 操作を視覚的に確認するためのスロー再生
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
        const filePath = `file:///${__dirname.replace(/\\/g, '/')}/index.html`;
        console.log('   ページURL:', filePath);
        
        await page.goto(filePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // 長めに待機

        console.log('2️⃣ 基本要素の確認...');
        
        // ページタイトル確認
        const title = await page.title();
        console.log('   ページタイトル:', title);
        
        // アプリコンテナの確認
        const appContainer = await page.$('.app-container');
        console.log('   アプリコンテナ:', appContainer ? '✅ 発見' : '❌ 見つからない');

        console.log('3️⃣ キャッシュバスティング確認...');
        
        // app.jsのスクリプトタグ確認
        const appScript = await page.$('script[src*="app.js"]');
        if (appScript) {
            const src = await appScript.getAttribute('src');
            console.log('   app.js スクリプト:', src);
            if (src && src.includes('?v=')) {
                console.log('✅ キャッシュバスティング パラメータを確認しました');
            } else {
                console.log('⚠️ キャッシュバスティング パラメータが見つかりません');
            }
        } else {
            console.log('❌ app.js スクリプトが見つかりません');
        }

        console.log('4️⃣ JavaScript実行環境確認...');
        
        // グローバルオブジェクトの確認
        const globalCheck = await page.evaluate(() => {
            const globals = {};
            
            // 主要なグローバルオブジェクトをチェック
            globals.hasPlantUMLEditor = typeof window.PlantUMLEditor !== 'undefined';
            globals.hasPlantUMLEditorInstance = typeof window.plantUMLEditor !== 'undefined';
            globals.hasApp = typeof window.app !== 'undefined';
            
            // DOMの基本要素をチェック
            globals.hasAppContainer = !!document.querySelector('.app-container');
            globals.hasActorGrid = !!document.querySelector('.actor-grid');
            globals.hasCodeEditor = !!document.querySelector('#plantuml-code');
            
            return globals;
        });
        
        console.log('   JavaScript実行環境:');
        Object.entries(globalCheck).forEach(([key, value]) => {
            console.log(`     ${key}: ${value ? '✅' : '❌'}`);
        });

        console.log('5️⃣ getCurrentActorsメソッドテスト...');
        
        // 少し待ってから再試行（初期化時間を考慮）
        await page.waitForTimeout(2000);
        
        const getCurrentActorsResult = await page.evaluate(() => {
            try {
                // エディターインスタンスを探す
                let editor = null;
                const searchResults = {};
                
                // 1. 既知のグローバル変数をチェック
                if (window.plantUMLEditor) {
                    editor = window.plantUMLEditor;
                    searchResults.foundAt = 'window.plantUMLEditor';
                } else if (window.app) {
                    editor = window.app;
                    searchResults.foundAt = 'window.app';
                }
                
                // 2. グローバルスコープを検索
                if (!editor) {
                    for (let prop in window) {
                        if (window[prop] && typeof window[prop] === 'object' && 
                            typeof window[prop].getCurrentActors === 'function') {
                            editor = window[prop];
                            searchResults.foundAt = `window.${prop}`;
                            break;
                        }
                    }
                }
                
                if (!editor) {
                    return { 
                        success: false, 
                        error: 'エディターインスタンスが見つかりません',
                        searchResults
                    };
                }

                if (typeof editor.getCurrentActors !== 'function') {
                    return { 
                        success: false, 
                        error: 'getCurrentActorsメソッドが存在しません',
                        searchResults,
                        editorType: typeof editor,
                        editorKeys: Object.keys(editor).slice(0, 10) // 最初の10個のキー
                    };
                }

                const actors = editor.getCurrentActors();
                return {
                    success: true,
                    searchResults,
                    type: typeof actors,
                    isArray: Array.isArray(actors),
                    isSet: actors && typeof actors.size === 'number',
                    length: Array.isArray(actors) ? actors.length : (actors && actors.size) || 0,
                    value: Array.isArray(actors) ? actors : Array.from(actors || [])
                };
            } catch (error) {
                return { success: false, error: error.message, stack: error.stack };
            }
        });

        if (getCurrentActorsResult.success) {
            console.log('✅ getCurrentActorsメソッドテスト成功');
            console.log(`   発見場所: ${getCurrentActorsResult.searchResults.foundAt}`);
            console.log(`   戻り値の型: ${getCurrentActorsResult.type}`);
            console.log(`   要素数: ${getCurrentActorsResult.length}`);
            console.log(`   値: [${getCurrentActorsResult.value.join(', ')}]`);
        } else {
            console.log('❌ getCurrentActorsメソッドテスト失敗:', getCurrentActorsResult.error);
            if (getCurrentActorsResult.searchResults) {
                console.log('   検索結果:', getCurrentActorsResult.searchResults);
            }
            if (getCurrentActorsResult.editorKeys) {
                console.log('   エディターのキー:', getCurrentActorsResult.editorKeys);
            }
        }

        console.log('6️⃣ アクター選択テスト...');
        
        // アクターボタンの確認とクリック
        const actorButtons = await page.$$('.actor-btn[data-actor]');
        console.log(`   アクターボタン数: ${actorButtons.length}`);
        
        if (actorButtons.length > 0) {
            // 最初の2つのアクターをクリック
            for (let i = 0; i < Math.min(2, actorButtons.length); i++) {
                const actorName = await actorButtons[i].getAttribute('data-actor');
                console.log(`   "${actorName}" アクターをクリック中...`);
                await actorButtons[i].click();
                await page.waitForTimeout(300);
            }
            
            // アクター選択後の状態確認
            await page.waitForTimeout(500);
            const afterClickResult = await page.evaluate(() => {
                // エディターインスタンスを再検索
                let editor = null;
                if (window.plantUMLEditor) {
                    editor = window.plantUMLEditor;
                } else if (window.app) {
                    editor = window.app;
                } else {
                    for (let prop in window) {
                        if (window[prop] && typeof window[prop] === 'object' && 
                            typeof window[prop].getCurrentActors === 'function') {
                            editor = window[prop];
                            break;
                        }
                    }
                }
                
                if (editor && typeof editor.getCurrentActors === 'function') {
                    const actors = editor.getCurrentActors();
                    return {
                        success: true,
                        length: Array.isArray(actors) ? actors.length : (actors && actors.size) || 0,
                        value: Array.isArray(actors) ? actors : Array.from(actors || [])
                    };
                }
                return { success: false, length: 0, value: [] };
            });
            
            if (afterClickResult.success) {
                console.log(`   選択後のアクター数: ${afterClickResult.length}`);
                console.log(`   選択済みアクター: [${afterClickResult.value.join(', ')}]`);
                
                if (afterClickResult.length > 0) {
                    console.log('✅ アクター選択テスト成功');
                } else {
                    console.log('⚠️ アクターが選択されていない可能性があります');
                }
            } else {
                console.log('❌ アクター選択後の状態確認に失敗');
            }
            
            // UI上の選択状態も確認
            const uiActors = await page.$$eval('.actor-chips .actor-chip', chips => 
                chips.map(chip => chip.textContent.replace('×', '').trim())
            );
            console.log(`   UI上の選択アクター: [${uiActors.join(', ')}]`);
        }

        console.log('7️⃣ UI要素確認...');
        
        // 主要なUI要素の存在確認
        const uiElements = {
            'アプリコンテナ': '.app-container',
            'アクターグリッド': '.actor-grid',
            '選択されたアクター': '.selected-actors',
            'PlantUMLコードエディタ': '#plantuml-code',
            'ループビルダー': '#loop-builder',
            '並列処理ビルダー': '#parallel-builder',
            'アクションタイプタブ': '.action-type-tabs',
            'ステータスバー': '.status-bar'
        };
        
        for (const [name, selector] of Object.entries(uiElements)) {
            const element = await page.$(selector);
            console.log(`   ${name}: ${element ? '✅ 存在' : '❌ 見つからない'}`);
        }

        console.log('8️⃣ タブ切り替えテスト...');
        
        // ループタブのクリックテスト
        const loopTab = await page.$('[data-type="loop"]');
        if (loopTab) {
            console.log('   ループタブをクリック中...');
            await loopTab.click();
            await page.waitForTimeout(500);
            
            const loopBuilder = await page.$('#loop-builder');
            const isVisible = await loopBuilder?.isVisible();
            console.log(`   ループビルダー表示: ${isVisible ? '✅ 成功' : '❌ 失敗'}`);
        } else {
            console.log('   ❌ ループタブが見つかりません');
        }

        // 並列処理タブのクリックテスト
        const parallelTab = await page.$('[data-type="parallel"]');
        if (parallelTab) {
            console.log('   並列処理タブをクリック中...');
            await parallelTab.click();
            await page.waitForTimeout(500);
            
            const parallelBuilder = await page.$('#parallel-builder');
            const isVisible = await parallelBuilder?.isVisible();
            console.log(`   並列処理ビルダー表示: ${isVisible ? '✅ 成功' : '❌ 失敗'}`);
            
            // 並列ブランチの確認
            const branches = await page.$$('.parallel-branch');
            console.log(`   並列ブランチ数: ${branches.length}`);
        } else {
            console.log('   ❌ 並列処理タブが見つかりません');
        }

        // メッセージタブに戻す
        const messageTab = await page.$('[data-type="message"]');
        if (messageTab) {
            await messageTab.click();
            await page.waitForTimeout(300);
        }

        console.log('9️⃣ PlantUMLコード確認...');
        
        const codeEditor = await page.$('#plantuml-code');
        if (codeEditor) {
            const code = await codeEditor.inputValue();
            console.log('   コードエディタの内容:');
            console.log(`     文字数: ${code.length}`);
            console.log(`     @startuml含む: ${code.includes('@startuml') ? '✅' : '❌'}`);
            console.log(`     @enduml含む: ${code.includes('@enduml') ? '✅' : '❌'}`);
            
            if (code.length > 20) {
                console.log('   ✅ PlantUMLコードが生成されています');
                console.log(`     プレビュー:\n${code.split('\n').slice(0, 5).join('\n')}${code.split('\n').length > 5 ? '\n     ...' : ''}`);
            } else {
                console.log('   ⚠️ PlantUMLコードが短すぎる可能性があります');
            }
        } else {
            console.log('   ❌ コードエディタが見つかりません');
        }

        console.log('🔟 総合結果...');
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
        const screenshotPath = path.join(__dirname, 'validation-screenshot.png');
        await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
        });
        console.log(`✅ スクリーンショットを保存しました: ${screenshotPath}`);

        // 最終的な推奨事項
        console.log('\n📋 検証結果サマリー:');
        const issues = [];
        if (consoleErrors.length > 0) issues.push(`${consoleErrors.length}個のコンソールエラー`);
        if (pageErrors.length > 0) issues.push(`${pageErrors.length}個のページエラー`);
        if (!getCurrentActorsResult.success) issues.push('getCurrentActorsメソッドの問題');
        
        if (issues.length === 0) {
            console.log('🎉 すべてのテストが成功しました！アプリケーションは正常に動作しています。');
        } else {
            console.log('⚠️ 以下の問題が検出されました:');
            issues.forEach((issue, i) => console.log(`   ${i+1}. ${issue}`));
        }

    } catch (error) {
        console.error('💥 テスト実行中にエラーが発生しました:', error.message);
        console.error('スタックトレース:', error.stack);
    } finally {
        console.log('\n🔚 テスト完了。5秒後にブラウザを閉じます...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

// 実行
runValidation().catch(console.error);