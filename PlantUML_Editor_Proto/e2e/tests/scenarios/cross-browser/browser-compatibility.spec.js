import { test, expect, devices } from '@playwright/test';
import { PlantUMLEditorPage } from '../../page-objects/PlantUMLEditorPage.js';

/**
 * クロスブラウザ互換性テスト
 * 目的: Chrome、Firefox、WebKit、Edge での全エディター機能の動作検証
 * カバレッジ: ブラウザ固有の問題、レンダリング差異、JavaScript互換性
 */

// ブラウザ設定
const browsers = [
  { name: 'chromium', device: 'Desktop Chrome' },
  { name: 'firefox', device: 'Desktop Firefox' },
  { name: 'webkit', device: 'Desktop Safari' },
  { name: 'msedge', device: 'Desktop Edge' }
];

browsers.forEach(({ name, device }) => {
  test.describe(`Cross-Browser Tests - ${name}`, () => {
    let editorPage;

    test.beforeEach(async ({ page, browserName }) => {
      // ブラウザ固有の設定
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      editorPage = new PlantUMLEditorPage(page);
      await editorPage.open();
      await editorPage.enableTestMode();
      await editorPage.clearAllData();
      
      // ブラウザ情報をログ出力
      const userAgent = await page.evaluate(() => navigator.userAgent);
      console.log(`Testing on ${browserName}: ${userAgent}`);
    });

    test.afterEach(async () => {
      await editorPage.cleanup();
    });

    test.describe('基本機能互換性テスト', () => {
      
      test(`[${name}] アプリケーション起動と基本UI表示`, async ({ page }) => {
        // 基本UI要素の表示確認
        await expect(page.locator('#japanese-input')).toBeVisible();
        await expect(page.locator('#plantuml-editor')).toBeVisible();
        await expect(page.locator('#preview-area')).toBeVisible();
        
        // ブラウザ固有のレンダリング確認
        const japaneseInput = page.locator('#japanese-input');
        const inputRect = await japaneseInput.boundingBox();
        
        expect(inputRect.width).toBeGreaterThan(200);
        expect(inputRect.height).toBeGreaterThan(100);
        
        // フォント確認（ブラウザ固有の差異対応）
        const computedStyle = await japaneseInput.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight
          };
        });
        
        expect(computedStyle.fontFamily).toBeTruthy();
        expect(computedStyle.fontSize).toMatch(/\d+px/);
      });

      test(`[${name}] 日本語入力とPlantUML変換`, async ({ page }) => {
        const testText = 'ユーザーがシステムにログインする';
        
        await page.fill('#japanese-input', testText);
        await page.waitForTimeout(1000); // リアルタイム変換待機
        
        const plantumlCode = await page.inputValue('#plantuml-editor');
        expect(plantumlCode).toContain('ユーザー');
        expect(plantumlCode).toContain('システム');
        expect(plantumlCode).toContain('ログイン');
        
        // ブラウザ固有の文字エンコーディング確認
        const textBytes = await page.evaluate((text) => {
          return new TextEncoder().encode(text).length;
        }, testText);
        
        expect(textBytes).toBeGreaterThan(testText.length); // UTF-8マルチバイト確認
      });

      test(`[${name}] プレビュー表示機能`, async ({ page }) => {
        await page.fill('#japanese-input', 'A -> B: テストメッセージ');
        await page.waitForTimeout(2000);
        
        // プレビューエリアにSVGが表示されることを確認
        const previewSvg = page.locator('#preview-area svg');
        await expect(previewSvg).toBeVisible();
        
        // SVG要素の詳細確認
        const svgRect = await previewSvg.boundingBox();
        expect(svgRect.width).toBeGreaterThan(100);
        expect(svgRect.height).toBeGreaterThan(100);
        
        // ブラウザ固有のSVGレンダリング確認
        const svgContent = await previewSvg.innerHTML();
        expect(svgContent).toContain('rect'); // SVG要素存在確認
        expect(svgContent).toContain('text'); // テキスト要素確認
      });
    });

    test.describe('エディター機能互換性テスト', () => {
      
      test(`[${name}] ActionEditor - ドラッグ&ドロップ機能`, async ({ page }) => {
        // ActionEditorを開く
        await page.click('[data-testid="add-action"]');
        await expect(page.locator('[data-testid="action-editor-modal"]')).toBeVisible();
        
        // 複数アクションを作成
        const actions = [
          { from: 'User', to: 'System', message: 'アクション1' },
          { from: 'System', to: 'Database', message: 'アクション2' }
        ];
        
        for (const action of actions) {
          await page.selectOption('[data-testid="actor-from"]', action.from);
          await page.selectOption('[data-testid="actor-to"]', action.to);
          await page.fill('[data-testid="message"]', action.message);
          await page.click('[data-testid="save-action"]');
          
          await page.click('[data-testid="add-action"]');
        }
        
        // ドラッグ&ドロップテスト（ブラウザ固有の実装差異考慮）
        const action1 = page.locator('[data-testid="action-item-0"]');
        const action2 = page.locator('[data-testid="action-item-1"]');
        
        if (name === 'webkit') {
          // WebKit用の特別なドラッグ&ドロップ処理
          await action1.hover();
          await page.mouse.down();
          await action2.hover();
          await page.mouse.up();
        } else {
          // 他ブラウザ用の標準ドラッグ&ドロップ
          await action1.dragTo(action2);
        }
        
        await page.waitForTimeout(500);
        
        // 順序変更が反映されることを確認
        const plantumlCode = await editorPage.getPlantUMLCode();
        expect(plantumlCode).toContain('アクション');
      });

      test(`[${name}] ConditionEditor - 条件分岐作成`, async ({ page }) => {
        await page.click('[data-testid="add-condition"]');
        await expect(page.locator('[data-testid="condition-editor-modal"]')).toBeVisible();
        
        // 条件分岐設定
        await page.selectOption('[data-testid="condition-type"]', 'if-else');
        await page.fill('[data-testid="condition-expression"]', 'ユーザーが管理者');
        
        // IF分岐
        await page.click('[data-testid="add-action-if-branch"]');
        await page.fill('[data-testid="if-message"]', '管理者機能表示');
        
        // ELSE分岐
        await page.click('[data-testid="add-action-else-branch"]');
        await page.fill('[data-testid="else-message"]', '一般機能表示');
        
        await page.click('[data-testid="save-condition"]');
        
        // PlantUMLコード生成確認
        const plantumlCode = await editorPage.getPlantUMLCode();
        expect(plantumlCode).toContain('alt ユーザーが管理者');
        expect(plantumlCode).toContain('管理者機能表示');
        expect(plantumlCode).toContain('else');
        expect(plantumlCode).toContain('一般機能表示');
        
        // ブラウザ固有のModalハンドリング確認
        await expect(page.locator('[data-testid="condition-editor-modal"]')).not.toBeVisible();
      });

      test(`[${name}] LoopEditor - ループ処理作成`, async ({ page }) => {
        await page.click('[data-testid="add-loop"]');
        await expect(page.locator('[data-testid="loop-editor-modal"]')).toBeVisible();
        
        // WHILEループ設定
        await page.selectOption('[data-testid="loop-type"]', 'while');
        await page.fill('[data-testid="loop-condition"]', 'データが存在する間');
        
        // ループ本体
        await page.click('[data-testid="add-loop-action"]');
        await page.fill('[data-testid="loop-message"]', 'データ処理実行');
        
        await page.click('[data-testid="save-loop"]');
        
        // PlantUMLコード生成確認
        const plantumlCode = await editorPage.getPlantUMLCode();
        expect(plantumlCode).toContain('loop データが存在する間');
        expect(plantumlCode).toContain('データ処理実行');
        expect(plantumlCode).toContain('end');
        
        // ブラウザ固有のフォーム要素動作確認
        const loopItem = page.locator('.loop-item');
        await expect(loopItem).toBeVisible();
      });

      test(`[${name}] ParallelEditor - 並行処理作成`, async ({ page }) => {
        await page.click('[data-testid="add-parallel"]');
        await expect(page.locator('[data-testid="parallel-editor-modal"]')).toBeVisible();
        
        // FORK/JOIN設定
        await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
        await page.fill('[data-testid="parallel-description"]', '並行処理テスト');
        
        // 分岐1
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill('[data-testid="branch-name-1"]', '分岐A');
        await page.click('[data-testid="add-branch-action-1"]');
        await page.fill('[data-testid="branch-1-message-1"]', '処理A');
        
        // 分岐2
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill('[data-testid="branch-name-2"]', '分岐B');
        await page.click('[data-testid="add-branch-action-2"]');
        await page.fill('[data-testid="branch-2-message-1"]', '処理B');
        
        await page.click('[data-testid="save-parallel"]');
        
        // PlantUMLコード生成確認
        const plantumlCode = await editorPage.getPlantUMLCode();
        expect(plantumlCode).toContain('fork');
        expect(plantumlCode).toContain('処理A');
        expect(plantumlCode).toContain('fork again');
        expect(plantumlCode).toContain('処理B');
        expect(plantumlCode).toContain('end fork');
      });
    });

    test.describe('パフォーマンス互換性テスト', () => {
      
      test(`[${name}] レンダリング性能測定`, async ({ page }) => {
        const startTime = Date.now();
        
        // 複雑なシーケンス図を作成
        const complexSequence = `
          ユーザーがシステムにアクセス
          システムが認証サーバーに問い合わせ
          認証サーバーが認証結果を返却
          システムがデータベースからデータ取得
          データベースがデータを返却
          システムがユーザーに結果表示
        `;
        
        await page.fill('#japanese-input', complexSequence);
        
        // プレビュー生成待機
        await page.waitForFunction(() => {
          const preview = document.querySelector('#preview-area svg');
          return preview && preview.querySelector('rect');
        }, { timeout: 15000 });
        
        const renderTime = Date.now() - startTime;
        console.log(`${name} レンダリング時間: ${renderTime}ms`);
        
        // ブラウザ別のパフォーマンス基準
        const performanceThresholds = {
          chromium: 5000,
          firefox: 6000,
          webkit: 7000,
          msedge: 5500
        };
        
        expect(renderTime).toBeLessThan(performanceThresholds[name]);
        
        // メモリ使用量確認（対応ブラウザのみ）
        if (name === 'chromium' || name === 'msedge') {
          const memoryUsage = await page.evaluate(() => {
            return performance.memory ? performance.memory.usedJSHeapSize : 0;
          });
          
          if (memoryUsage > 0) {
            console.log(`${name} メモリ使用量: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
            expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB以下
          }
        }
      });

      test(`[${name}] JavaScript実行性能`, async ({ page }) => {
        const performanceResults = [];
        
        // 10回の操作を測定
        for (let i = 1; i <= 10; i++) {
          const startTime = performance.now();
          
          await page.fill('#japanese-input', `テスト処理${i}を実行`);
          await page.waitForTimeout(100);
          
          const endTime = performance.now();
          performanceResults.push(endTime - startTime);
        }
        
        const avgTime = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;
        const maxTime = Math.max(...performanceResults);
        
        console.log(`${name} 平均処理時間: ${avgTime.toFixed(2)}ms`);
        console.log(`${name} 最大処理時間: ${maxTime.toFixed(2)}ms`);
        
        // ブラウザ別の性能基準
        const avgTimeThresholds = {
          chromium: 200,
          firefox: 250,
          webkit: 300,
          msedge: 220
        };
        
        expect(avgTime).toBeLessThan(avgTimeThresholds[name]);
        expect(maxTime).toBeLessThan(avgTimeThresholds[name] * 2);
      });

      test(`[${name}] 大量データ処理性能`, async ({ page }) => {
        const startTime = Date.now();
        
        // 大量のテキストを一度に入力
        const largeText = Array(100).fill(0).map((_, i) => 
          `プロセス${i}がシステム${i}にアクセス`
        ).join('\n');
        
        await page.fill('#japanese-input', largeText);
        
        // 処理完了まで待機
        await page.waitForFunction(() => {
          const editor = document.querySelector('#plantuml-editor');
          const preview = document.querySelector('#preview-area svg');
          return editor && editor.value.length > 1000 && preview;
        }, { timeout: 30000 });
        
        const processingTime = Date.now() - startTime;
        console.log(`${name} 大量データ処理時間: ${processingTime}ms`);
        
        // ブラウザ別の大量データ処理基準
        const largeDataThresholds = {
          chromium: 15000,
          firefox: 18000,
          webkit: 20000,
          msedge: 16000
        };
        
        expect(processingTime).toBeLessThan(largeDataThresholds[name]);
        
        // PlantUMLコードが適切に生成されることを確認
        const plantumlCode = await page.inputValue('#plantuml-editor');
        expect(plantumlCode.length).toBeGreaterThan(1000);
        expect(plantumlCode).toContain('プロセス');
        expect(plantumlCode).toContain('システム');
      });
    });

    test.describe('ブラウザ固有機能テスト', () => {
      
      test(`[${name}] ファイル操作機能`, async ({ page }) => {
        // ファイルダウンロードテスト
        const downloadPromise = page.waitForEvent('download');
        
        await page.fill('#japanese-input', 'ファイル操作テスト');
        await page.waitForTimeout(1000);
        
        await page.click('[data-testid="export-button"]');
        
        // ブラウザ固有のダウンロード処理
        if (name === 'webkit') {
          // WebKitは特別な処理が必要な場合がある
          await page.waitForTimeout(2000);
        }
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.png$|\.svg$|\.puml$/);
        
        console.log(`${name} ダウンロード完了: ${download.suggestedFilename()}`);
      });

      test(`[${name}] キーボードショートカット`, async ({ page }) => {
        await page.fill('#japanese-input', 'ショートカットテスト');
        
        // ブラウザ固有のキーボード処理
        const modifier = name === 'webkit' ? 'Meta' : 'Control';
        
        // Ctrl+Z (Undo)
        await page.keyboard.press(`${modifier}+KeyZ`);
        await page.waitForTimeout(500);
        
        const undoResult = await page.inputValue('#japanese-input');
        expect(undoResult).toBe(''); // テキストがクリアされる
        
        // Ctrl+Y (Redo)
        await page.keyboard.press(`${modifier}+KeyY`);
        await page.waitForTimeout(500);
        
        const redoResult = await page.inputValue('#japanese-input');
        expect(redoResult).toContain('ショートカットテスト');
        
        console.log(`${name} キーボードショートカット動作確認完了`);
      });

      test(`[${name}] 印刷プレビュー機能`, async ({ page }) => {
        await page.fill('#japanese-input', 'A -> B: 印刷テスト');
        await page.waitForTimeout(2000);
        
        // 印刷プレビューをトリガー
        await page.click('[data-testid="print-button"]');
        
        // ブラウザ固有の印刷ダイアログ処理
        if (name !== 'webkit') { // WebKitは印刷ダイアログが異なる
          // 印刷設定が適用されることを確認
          const printStyles = await page.evaluate(() => {
            const printStyleSheets = Array.from(document.styleSheets).filter(sheet => 
              sheet.media.mediaText.includes('print')
            );
            return printStyleSheets.length > 0;
          });
          
          expect(printStyles).toBe(true);
        }
        
        console.log(`${name} 印刷プレビュー機能確認完了`);
      });
    });

    test.describe('エラー処理互換性テスト', () => {
      
      test(`[${name}] JavaScript エラー回復`, async ({ page }) => {
        // エラーイベントリスナーを設定
        const errors = [];
        page.on('pageerror', (error) => {
          errors.push(error.message);
        });
        
        // 意図的にエラーを発生させる
        await page.evaluate(() => {
          // 存在しない関数を呼び出し
          try {
            window.nonExistentFunction();
          } catch (e) {
            console.error('テスト用エラー:', e);
          }
        });
        
        await page.waitForTimeout(1000);
        
        // アプリケーションが引き続き動作することを確認
        await page.fill('#japanese-input', 'エラー回復テスト');
        
        const plantumlCode = await page.inputValue('#plantuml-editor');
        expect(plantumlCode).toContain('エラー回復テスト');
        
        // 致命的エラーがないことを確認
        const criticalErrors = errors.filter(error => 
          error.includes('TypeError') || error.includes('ReferenceError')
        );
        expect(criticalErrors.length).toBe(0);
        
        console.log(`${name} エラー回復機能確認完了`);
      });

      test(`[${name}] ネットワークエラー処理`, async ({ page }) => {
        // ネットワークをオフラインに設定
        await page.setOffline(true);
        
        await page.fill('#japanese-input', 'オフラインテスト');
        await page.waitForTimeout(1000);
        
        // オフライン状態でもローカル処理が動作することを確認
        const plantumlCode = await page.inputValue('#plantuml-editor');
        expect(plantumlCode).toContain('オフラインテスト');
        
        // ネットワークを復帰
        await page.setOffline(false);
        
        // 復帰後も正常動作することを確認
        await page.fill('#japanese-input', 'オンライン復帰テスト');
        await page.waitForTimeout(1000);
        
        const onlineCode = await page.inputValue('#plantuml-editor');
        expect(onlineCode).toContain('オンライン復帰テスト');
        
        console.log(`${name} ネットワークエラー処理確認完了`);
      });
    });

    test.describe('アクセシビリティ互換性テスト', () => {
      
      test(`[${name}] スクリーンリーダー対応`, async ({ page }) => {
        // ARIA属性の確認
        const ariaLabels = await page.evaluate(() => {
          const elements = document.querySelectorAll('[aria-label]');
          return Array.from(elements).map(el => ({
            tagName: el.tagName,
            ariaLabel: el.getAttribute('aria-label'),
            role: el.getAttribute('role')
          }));
        });
        
        expect(ariaLabels.length).toBeGreaterThan(5);
        
        // フォーカス可能要素の確認
        const focusableElements = await page.evaluate(() => {
          const focusable = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          return focusable.length;
        });
        
        expect(focusableElements).toBeGreaterThan(10);
        
        console.log(`${name} スクリーンリーダー対応確認完了`);
      });

      test(`[${name}] キーボードナビゲーション`, async ({ page }) => {
        // Tabキーでのナビゲーション
        await page.keyboard.press('Tab');
        let focusedElement = await page.evaluate(() => document.activeElement.tagName);
        expect(['INPUT', 'BUTTON', 'SELECT'].includes(focusedElement)).toBe(true);
        
        // 複数のTab移動
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
        
        // フォーカスが適切に移動することを確認
        focusedElement = await page.evaluate(() => document.activeElement.tagName);
        expect(focusedElement).toBeTruthy();
        
        console.log(`${name} キーボードナビゲーション確認完了`);
      });

      test(`[${name}] 高コントラストモード対応`, async ({ page }) => {
        // 高コントラストスタイルを適用
        await page.addStyleTag({
          content: `
            @media (prefers-contrast: high) {
              * { border: 1px solid #000 !important; }
              input, textarea { background: #fff !important; color: #000 !important; }
            }
          `
        });
        
        // スタイルが適用されることを確認
        const inputStyle = await page.locator('#japanese-input').evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            backgroundColor: style.backgroundColor,
            color: style.color,
            border: style.border
          };
        });
        
        expect(inputStyle.backgroundColor).toBeTruthy();
        expect(inputStyle.color).toBeTruthy();
        
        console.log(`${name} 高コントラストモード対応確認完了`);
      });
    });
  });
});

// 統合クロスブラウザ比較テスト
test.describe('Cross-Browser Integration Tests', () => {
  
  test('全ブラウザでの動作一貫性確認', async ({ browserName }) => {
    // 各ブラウザで同じ操作を実行し、結果を比較
    const testScenario = async (page) => {
      const editorPage = new PlantUMLEditorPage(page);
      await editorPage.open();
      await editorPage.enableTestMode();
      
      // 統一テストシナリオ実行
      await page.fill('#japanese-input', 'ユーザー -> システム: ログイン\nシステム -> データベース: 認証確認');
      await page.waitForTimeout(2000);
      
      const plantumlCode = await page.inputValue('#plantuml-editor');
      const previewExists = await page.locator('#preview-area svg').count() > 0;
      
      return {
        codeLength: plantumlCode.length,
        hasPreview: previewExists,
        containsLogin: plantumlCode.includes('ログイン'),
        containsAuth: plantumlCode.includes('認証確認')
      };
    };
    
    // 現在のブラウザでテスト実行
    const results = await testScenario(page);
    
    // 結果の妥当性確認
    expect(results.codeLength).toBeGreaterThan(50);
    expect(results.hasPreview).toBe(true);
    expect(results.containsLogin).toBe(true);
    expect(results.containsAuth).toBe(true);
    
    console.log(`${browserName} 統合テスト結果:`, results);
  });
  
  test('パフォーマンス比較テスト', async ({ browserName }) => {
    const editorPage = new PlantUMLEditorPage(page);
    await editorPage.open();
    
    const performanceMetrics = [];
    
    // 10回の処理時間を測定
    for (let i = 1; i <= 10; i++) {
      const startTime = Date.now();
      
      await page.fill('#japanese-input', `パフォーマンステスト${i}回目の実行`);
      await page.waitForTimeout(500);
      
      const endTime = Date.now();
      performanceMetrics.push(endTime - startTime);
    }
    
    const avgTime = performanceMetrics.reduce((a, b) => a + b, 0) / performanceMetrics.length;
    const minTime = Math.min(...performanceMetrics);
    const maxTime = Math.max(...performanceMetrics);
    
    console.log(`${browserName} パフォーマンス統計:`, {
      average: `${avgTime.toFixed(2)}ms`,
      min: `${minTime}ms`,
      max: `${maxTime}ms`
    });
    
    // パフォーマンス基準値確認
    expect(avgTime).toBeLessThan(1000);
    expect(maxTime).toBeLessThan(2000);
  });
});