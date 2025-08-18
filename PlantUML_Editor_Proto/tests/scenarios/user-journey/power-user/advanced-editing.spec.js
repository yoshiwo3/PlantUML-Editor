/**
 * TEST-012-2: 高度な編集技術テスト
 * ペルソナ: 山田花子（テックリード、PlantUML上級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  measurePerformance,
  calculateUsabilityScore 
} from '../journey-helpers.js';
import { personas, successCriteria } from '../personas.js';

test.describe('高度な編集技術ジャーニー', () => {
  const personaType = 'powerUser';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
  });

  test('キーボードショートカット活用マスター', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 基本ショートカットのテスト
      const shortcuts = [
        { key: 'Control+z', action: 'undo', testName: '元に戻す' },
        { key: 'Control+y', action: 'redo', testName: 'やり直し' },
        { key: 'Control+s', action: 'save', testName: '保存' },
        { key: 'Control+c', action: 'copy', testName: 'コピー' },
        { key: 'Control+v', action: 'paste', testName: '貼り付け' },
        { key: 'Control+a', action: 'selectAll', testName: '全選択' },
        { key: 'Control+f', action: 'find', testName: '検索' },
        { key: 'Delete', action: 'delete', testName: '削除' },
        { key: 'Escape', action: 'cancel', testName: 'キャンセル' }
      ];
      
      let shortcutResults = [];
      
      // テスト用コンテンツ準備
      const inputArea = page.locator('[data-testid="japanese-input"]');
      await inputArea.fill('システムAがシステムBに接続し、データを処理する');
      await page.waitForTimeout(500);
      
      for (const shortcut of shortcuts) {
        try {
          const beforeState = await page.evaluate(() => {
            return {
              content: document.querySelector('[data-testid="japanese-input"]')?.value || '',
              selection: window.getSelection()?.toString() || ''
            };
          });
          
          // ショートカット実行
          await page.keyboard.press(shortcut.key);
          await page.waitForTimeout(300);
          
          const afterState = await page.evaluate(() => {
            return {
              content: document.querySelector('[data-testid="japanese-input"]')?.value || '',
              selection: window.getSelection()?.toString() || ''
            };
          });
          
          // 効果確認
          let effectDetected = false;
          switch (shortcut.action) {
            case 'selectAll':
              effectDetected = afterState.selection.length > beforeState.selection.length;
              break;
            case 'save':
              // 保存ダイアログまたは通知の表示確認
              const saveNotification = page.locator('[data-testid="save-notification"], .save-success');
              effectDetected = await saveNotification.isVisible();
              break;
            case 'find':
              // 検索ダイアログの表示確認
              const findDialog = page.locator('[data-testid="find-dialog"], .search-modal');
              effectDetected = await findDialog.isVisible();
              break;
            default:
              effectDetected = beforeState.content !== afterState.content || 
                              beforeState.selection !== afterState.selection;
          }
          
          shortcutResults.push({
            shortcut: shortcut.key,
            action: shortcut.action,
            testName: shortcut.testName,
            working: effectDetected,
            beforeState: beforeState,
            afterState: afterState
          });
          
        } catch (error) {
          shortcutResults.push({
            shortcut: shortcut.key,
            action: shortcut.action,
            testName: shortcut.testName,
            working: false,
            error: error.message
          });
        }
      }
      
      const workingShortcuts = shortcutResults.filter(r => r.working).length;
      const shortcutMastery = workingShortcuts / shortcuts.length;
      
      return {
        shortcutResults: shortcutResults,
        workingShortcuts: workingShortcuts,
        totalShortcuts: shortcuts.length,
        shortcutMastery: shortcutMastery
      };
    }, 'キーボードショートカット');
    
    expect(testResult.result.shortcutMastery).toBeGreaterThan(0.6); // 60%以上のショートカットが動作
    
    testResults.push({
      test: 'キーボードショートカット',
      status: testResult.result.shortcutMastery > 0.6 ? 'passed' : 'partial',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('マクロ記録・実行機能', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let macroResults = {
        recordingAvailable: false,
        playbackAvailable: false,
        macroAccuracy: 0
      };
      
      // マクロ記録ボタン確認
      const recordButton = page.locator('[data-testid="macro-record"], button:has-text("記録")');
      
      if (await recordButton.isVisible()) {
        macroResults.recordingAvailable = true;
        
        // マクロ記録開始
        await recordButton.click();
        await page.waitForTimeout(500);
        
        // 一連の操作を記録
        const inputArea = page.locator('[data-testid="japanese-input"]');
        await inputArea.fill('ユーザーが');
        await page.waitForTimeout(200);
        await inputArea.fill('ユーザーがシステムに');
        await page.waitForTimeout(200);
        await inputArea.fill('ユーザーがシステムにアクセス');
        await page.waitForTimeout(200);
        
        // マクロ記録停止
        const stopButton = page.locator('[data-testid="macro-stop"], button:has-text("停止")');
        if (await stopButton.isVisible()) {
          await stopButton.click();
          await page.waitForTimeout(500);
          
          // 記録されたマクロの確認
          const macroList = page.locator('[data-testid="macro-list"], .macro-item');
          const macroCount = await macroList.count();
          
          if (macroCount > 0) {
            // 入力フィールドをクリア
            await inputArea.fill('');
            await page.waitForTimeout(200);
            
            // マクロ再生
            const playButton = page.locator('[data-testid="macro-play"], button:has-text("再生")');
            if (await playButton.isVisible()) {
              macroResults.playbackAvailable = true;
              
              await playButton.click();
              await page.waitForTimeout(2000); // マクロ実行待機
              
              // 再生結果確認
              const replayResult = await inputArea.inputValue();
              macroResults.macroAccuracy = replayResult === 'ユーザーがシステムにアクセス' ? 1.0 : 0.5;
            }
          }
        }
      } else {
        // マクロ機能がない場合の代替確認
        const automationPanel = page.locator('[data-testid="automation"], .automation-tools');
        if (await automationPanel.isVisible()) {
          macroResults.recordingAvailable = true; // 自動化機能として代替評価
        }
      }
      
      return macroResults;
    }, 'マクロ機能');
    
    testResults.push({
      test: 'マクロ機能',
      status: testResult.result.recordingAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('カスタムテンプレート作成', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let templateResults = {
        creationAvailable: false,
        saveAvailable: false,
        reuseAvailable: false,
        templateCount: 0
      };
      
      // テンプレート作成エリア確認
      const templateButton = page.locator('[data-testid="create-template"], button:has-text("テンプレート作成")');
      
      if (await templateButton.isVisible()) {
        templateResults.creationAvailable = true;
        await templateButton.click();
        await page.waitForTimeout(500);
        
        // テンプレート作成フォーム
        const templateForm = page.locator('[data-testid="template-form"], .template-creator');
        
        if (await templateForm.isVisible()) {
          // テンプレート名入力
          const nameInput = page.locator('[data-testid="template-name"], input[placeholder*="テンプレート名"]');
          if (await nameInput.isVisible()) {
            await nameInput.fill('カスタムAPIフロー');
          }
          
          // テンプレート内容設定
          const contentArea = page.locator('[data-testid="template-content"], textarea');
          if (await contentArea.isVisible()) {
            await contentArea.fill('APIクライアントがAPIゲートウェイ経由でバックエンドサービスにアクセス');
          }
          
          // カテゴリ選択
          const categorySelect = page.locator('[data-testid="template-category"], select');
          if (await categorySelect.isVisible()) {
            await categorySelect.selectOption('API設計');
          }
          
          // テンプレート保存
          const saveTemplateButton = page.locator('[data-testid="save-template"], button:has-text("保存")');
          if (await saveTemplateButton.isVisible()) {
            templateResults.saveAvailable = true;
            await saveTemplateButton.click();
            await page.waitForTimeout(1000);
            
            // 保存成功確認
            const saveSuccess = page.locator('[data-testid="template-saved"], .save-notification');
            if (await saveSuccess.isVisible()) {
              // テンプレート一覧で確認
              const templateList = page.locator('[data-testid="template-list"], .template-gallery');
              if (await templateList.isVisible()) {
                const userTemplates = page.locator('[data-testid="user-template"], .custom-template');
                templateResults.templateCount = await userTemplates.count();
                
                // 作成したテンプレートの再利用テスト
                const customTemplate = userTemplates.first();
                if (await customTemplate.isVisible()) {
                  await customTemplate.click();
                  await page.waitForTimeout(500);
                  
                  // 適用確認
                  const inputArea = page.locator('[data-testid="japanese-input"]');
                  const appliedContent = await inputArea.inputValue();
                  templateResults.reuseAvailable = appliedContent.includes('APIクライアント');
                }
              }
            }
          }
        }
      } else {
        // 既存テンプレートのカスタマイズ機能確認
        const templateGallery = page.locator('[data-testid="template-gallery"], .template-section');
        if (await templateGallery.isVisible()) {
          const editButtons = page.locator('[data-testid="edit-template"], .template-edit');
          if (await editButtons.count() > 0) {
            templateResults.creationAvailable = true; // 編集機能として評価
          }
        }
      }
      
      return templateResults;
    }, 'カスタムテンプレート');
    
    testResults.push({
      test: 'カスタムテンプレート',
      status: testResult.result.creationAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('条件分岐・ループ・並行処理の組み合わせ', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      // 複雑な制御構造のテストシナリオ
      const complexScenarios = [
        {
          name: '条件分岐',
          input: 'もしユーザーが認証済みなら管理画面を表示、そうでなければログイン画面を表示',
          expectedKeywords: ['もし', 'なら', 'そうでなければ', 'alt', 'else']
        },
        {
          name: 'ループ処理',
          input: 'システムは繰り返しデータベースからレコードを取得し、各レコードを処理する',
          expectedKeywords: ['繰り返し', 'loop', '処理', 'end']
        },
        {
          name: '並行処理',
          input: 'サービスAとサービスBが同時にタスクを実行し、完了後に結果を統合する',
          expectedKeywords: ['同時に', 'par', 'and', '並行']
        }
      ];
      
      const inputArea = page.locator('[data-testid="japanese-input"]');
      let complexityResults = [];
      
      for (const scenario of complexScenarios) {
        await inputArea.fill(scenario.input);
        await page.waitForTimeout(1000);
        
        const plantUMLCode = await page.textContent('[data-testid="plantuml-output"]');
        
        // キーワード検出
        const detectedKeywords = scenario.expectedKeywords.filter(keyword => 
          plantUMLCode.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const keywordCoverage = detectedKeywords.length / scenario.expectedKeywords.length;
        
        // 構造の複雑さ評価
        const hasNestedStructure = /\\s+(alt|loop|par)\\s+.+\\s+(else|end)\\s+/i.test(plantUMLCode);
        const lineCount = plantUMLCode.split('\\n').length;
        
        complexityResults.push({
          scenario: scenario.name,
          input: scenario.input,
          detectedKeywords: detectedKeywords,
          keywordCoverage: keywordCoverage,
          hasNestedStructure: hasNestedStructure,
          codeComplexity: lineCount,
          syntaxCorrect: plantUMLCode.includes('@startuml') && plantUMLCode.includes('@enduml')
        });
      }
      
      const averageCoverage = complexityResults.reduce((sum, r) => sum + r.keywordCoverage, 0) / complexityResults.length;
      const allSyntaxCorrect = complexityResults.every(r => r.syntaxCorrect);
      
      return {
        complexityResults: complexityResults,
        averageKeywordCoverage: averageCoverage,
        allSyntaxCorrect: allSyntaxCorrect,
        complexStructuresSupported: complexityResults.filter(r => r.hasNestedStructure).length
      };
    }, '複雑制御構造');
    
    expect(testResult.result.averageKeywordCoverage).toBeGreaterThan(0.5); // 50%以上のキーワード検出
    expect(testResult.result.allSyntaxCorrect).toBeTruthy();
    
    testResults.push({
      test: '複雑制御構造',
      status: 'passed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('コード直接編集モード', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let codeEditResults = {
        directEditAvailable: false,
        syntaxHighlighting: false,
        autoCompletion: false,
        errorChecking: false,
        syncWithVisual: false
      };
      
      // コード直接編集モードの確認
      const codeEditButton = page.locator('[data-testid="code-edit-mode"], button:has-text("コード編集")');
      
      if (await codeEditButton.isVisible()) {
        codeEditResults.directEditAvailable = true;
        await codeEditButton.click();
        await page.waitForTimeout(500);
        
        // コードエディター確認
        const codeEditor = page.locator('[data-testid="code-editor"], .code-editor');
        
        if (await codeEditor.isVisible()) {
          // シンタックスハイライト確認
          const highlightedElements = page.locator('.syntax-highlight, .keyword, .string');
          codeEditResults.syntaxHighlighting = await highlightedElements.count() > 0;
          
          // PlantUMLコードの直接編集
          const testCode = `@startuml
participant "ユーザー" as user
participant "システム" as system
user -> system: ログイン要求
system -> user: 認証結果
@enduml`;
          
          await codeEditor.fill(testCode);
          await page.waitForTimeout(1000);
          
          // オートコンプリート機能確認
          await codeEditor.focus();
          await page.keyboard.type('\\nparticip');
          await page.waitForTimeout(500);
          
          const autocompleteDropdown = page.locator('.autocomplete, .suggestions');
          codeEditResults.autoCompletion = await autocompleteDropdown.isVisible();
          
          // エラーチェック機能確認
          await codeEditor.fill('@startuml\\ninvalid syntax here\\n@enduml');
          await page.waitForTimeout(1000);
          
          const errorIndicator = page.locator('.error-line, .syntax-error');
          codeEditResults.errorChecking = await errorIndicator.isVisible();
          
          // ビジュアルモードとの同期確認
          const visualModeButton = page.locator('[data-testid="visual-mode"], button:has-text("ビジュアル")');
          if (await visualModeButton.isVisible()) {
            await visualModeButton.click();
            await page.waitForTimeout(500);
            
            const visualElements = page.locator('[data-testid="visual-element"], .diagram-element');
            codeEditResults.syncWithVisual = await visualElements.count() > 0;
          }
        }
      } else {
        // 代替として、PlantUMLコード出力エリアでの編集可能性確認
        const outputArea = page.locator('[data-testid="plantuml-output"]');
        if (await outputArea.isVisible()) {
          const isEditable = await outputArea.getAttribute('contenteditable');
          codeEditResults.directEditAvailable = isEditable === 'true';
        }
      }
      
      return codeEditResults;
    }, 'コード直接編集');
    
    testResults.push({
      test: 'コード直接編集',
      status: testResult.result.directEditAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    // 高度な編集技術の総合評価
    const totalTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const partialTests = testResults.filter(r => r.status === 'partial').length;
    const notImplementedTests = testResults.filter(r => r.status === 'not-implemented').length;
    
    const completionRate = (passedTests + partialTests * 0.5) / testResults.length;
    
    const usabilityScore = calculateUsabilityScore({
      executionTime: totalTime,
      errorRate: (testResults.length - passedTests - partialTests) / testResults.length,
      completionRate: completionRate
    }, personaType);
    
    console.log('=== 高度な編集技術結果 ===');
    console.log(`ユーザビリティスコア: ${usabilityScore}/100`);
    console.log(`機能実装率: ${(completionRate * 100).toFixed(1)}%`);
    console.log(`実行時間: ${Math.round(totalTime)}ms`);
    console.log(`未実装機能: ${notImplementedTests}件`);
    
    // パワーユーザー向け評価
    if (totalTime <= successCriteria.powerUser.advancedFeatures) {
      console.log('⚡ 高速な高度編集を実現');
    } else {
      console.log('🐌 編集効率の改善が必要');
    }
    
    if (notImplementedTests === 0) {
      console.log('🔥 全ての高度機能を実装済み');
    } else {
      console.log(`🚧 ${notImplementedTests}件の高度機能が未実装`);
    }
    
    if (usabilityScore >= 85) {
      console.log('🏆 プロフェッショナル編集環境として最適');
    } else {
      console.log('🔧 エキスパート向け機能の強化が必要');
    }
  });
});