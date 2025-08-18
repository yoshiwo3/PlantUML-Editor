import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * TEST-E2E-010: LoopEditor 繰り返し処理テスト
 * 目的: WHILE/FOR/LOOP構文の作成、編集、バリデーション機能を包括的にテスト
 * カバレッジ: ループ条件、本体処理、ネスト構造、PlantUML構文生成
 */

test.describe('TEST-E2E-010: LoopEditor Loop Processing Tests', () => {
  let editorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new PlantUMLEditorPage(page);
    await editorPage.open();
    await editorPage.enableTestMode();
    await editorPage.clearAllData();
  });

  test.afterEach(async () => {
    await editorPage.cleanup();
  });

  test.describe('WHILEループ作成テスト', () => {
    
    test('基本的なWHILEループ作成', async ({ page }) => {
      // STEP1: ループエディターを開く
      await page.click('[data-testid="add-loop"]');
      
      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="loop-editor-modal"]')).toBeVisible();
      
      // STEP2: WHILEループを選択
      await page.selectOption('[data-testid="loop-type"]', 'while');
      
      // STEP3: ループ条件を設定
      await page.fill('[data-testid="loop-condition"]', 'データが存在する限り');
      
      // STEP4: ループ本体のアクションを追加
      await page.click('[data-testid="add-loop-action"]');
      await page.selectOption('[data-testid="loop-actor-from"]', 'System');
      await page.selectOption('[data-testid="loop-actor-to"]', 'Database');
      await page.fill('[data-testid="loop-message"]', 'データを1件取得');
      
      await page.click('[data-testid="add-loop-action"]');
      await page.selectOption('[data-testid="loop-actor-from-2"]', 'System');
      await page.selectOption('[data-testid="loop-actor-to-2"]', 'Processor');
      await page.fill('[data-testid="loop-message-2"]', 'データを処理');
      
      // STEP5: ループ保存
      await page.click('[data-testid="save-loop"]');
      
      // STEP6: 結果検証
      // ループアイテムが表示されることを確認
      await expect(page.locator('.loop-item')).toBeVisible();
      
      // PlantUMLコードが正しく生成されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop データが存在する限り');
      expect(plantumlCode).toContain('System -> Database: データを1件取得');
      expect(plantumlCode).toContain('System -> Processor: データを処理');
      expect(plantumlCode).toContain('end');
      
      // モーダルが閉じられることを確認
      await expect(page.locator('[data-testid="loop-editor-modal"]')).not.toBeVisible();
    });

    test('条件式バリデーション付きWHILEループ', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      
      // 複雑な条件式を設定
      await page.fill('[data-testid="loop-condition"]', 'カウンター < 100 AND エラー回数 < 3');
      
      // 条件チェック機能を有効化
      await page.check('[data-testid="enable-condition-validation"]');
      
      // ループ本体に条件チェックアクションを追加
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', 'カウンターを1増加');
      
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message-2"]', 'エラーチェック実行');
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUMLコードの検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop カウンター < 100 AND エラー回数 < 3');
      expect(plantumlCode).toContain('カウンターを1増加');
      expect(plantumlCode).toContain('エラーチェック実行');
    });

    test('無限ループ防止機能テスト', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      
      // 無限ループになる可能性のある条件
      await page.fill('[data-testid="loop-condition"]', 'true');
      
      // 無限ループ防止設定
      await page.check('[data-testid="enable-infinite-loop-protection"]');
      await page.fill('[data-testid="max-iterations"]', '1000');
      
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', '処理実行');
      
      await page.click('[data-testid="save-loop"]');
      
      // 警告メッセージが表示されることを確認
      await expect(page.locator('[data-testid="infinite-loop-warning"]')).toBeVisible();
      const warningText = await page.textContent('[data-testid="infinite-loop-warning"]');
      expect(warningText).toContain('無限ループの可能性');
      
      // PlantUMLコードに制限コメントが含まれることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('note right: 最大1000回まで実行');
    });
  });

  test.describe('FORループ作成テスト', () => {
    
    test('基本的なFORループ作成', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      
      // FOR設定
      await page.fill('[data-testid="for-variable"]', 'i');
      await page.fill('[data-testid="for-start"]', '1');
      await page.fill('[data-testid="for-end"]', '10');
      await page.fill('[data-testid="for-step"]', '1');
      
      // ループ本体
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', 'アイテム{i}を処理');
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop i = 1 to 10');
      expect(plantumlCode).toContain('アイテム{i}を処理');
      expect(plantumlCode).toContain('end');
    });

    test('配列処理FORループ', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'foreach');
      
      // FOREACH設定
      await page.fill('[data-testid="foreach-variable"]', 'item');
      await page.fill('[data-testid="foreach-collection"]', 'データリスト');
      
      // ループ本体に複数のアクション
      const actions = [
        'アイテム検証',
        'データ変換',
        '結果保存'
      ];
      
      for (const [index, action] of actions.entries()) {
        await page.click('[data-testid="add-loop-action"]');
        await page.fill(`[data-testid="loop-message-${index + 1}"]`, action);
      }
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop for each item in データリスト');
      expect(plantumlCode).toContain('アイテム検証');
      expect(plantumlCode).toContain('データ変換');
      expect(plantumlCode).toContain('結果保存');
    });

    test('ネストFORループ', async ({ page }) => {
      // 外側のFORループ
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      await page.fill('[data-testid="for-variable"]', 'i');
      await page.fill('[data-testid="for-start"]', '1');
      await page.fill('[data-testid="for-end"]', '5');
      await page.click('[data-testid="save-loop"]');
      
      // 外側のループ内に内側のループを追加
      await page.click('[data-testid="loop-item-0"] [data-testid="add-nested-loop"]');
      await page.selectOption('[data-testid="nested-loop-type"]', 'for');
      await page.fill('[data-testid="nested-for-variable"]', 'j');
      await page.fill('[data-testid="nested-for-start"]', '1');
      await page.fill('[data-testid="nested-for-end"]', '3');
      
      // 内側のループのアクション
      await page.click('[data-testid="add-nested-loop-action"]');
      await page.fill('[data-testid="nested-loop-message"]', 'セル[{i},{j}]を処理');
      
      await page.click('[data-testid="save-nested-loop"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop i = 1 to 5');
      expect(plantumlCode).toContain('loop j = 1 to 3');
      expect(plantumlCode).toContain('セル[{i},{j}]を処理');
      expect(plantumlCode).toMatch(/end[\s\S]*end/); // 2つのendがあることを確認
    });
  });

  test.describe('ループ制御文テスト', () => {
    
    test('BREAK条件付きループ', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', 'true');
      
      // ループ本体にアクションとBREAK条件を追加
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', 'データ処理');
      
      // BREAK条件を追加
      await page.click('[data-testid="add-break-condition"]');
      await page.fill('[data-testid="break-condition"]', 'エラーが発生した場合');
      await page.fill('[data-testid="break-message"]', 'エラーでループ終了');
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop true');
      expect(plantumlCode).toContain('データ処理');
      expect(plantumlCode).toContain('break when エラーが発生した場合');
      expect(plantumlCode).toContain('エラーでループ終了');
    });

    test('CONTINUE条件付きループ', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      await page.fill('[data-testid="for-variable"]', 'i');
      await page.fill('[data-testid="for-start"]', '1');
      await page.fill('[data-testid="for-end"]', '100');
      
      // CONTINUE条件を追加
      await page.click('[data-testid="add-continue-condition"]');
      await page.fill('[data-testid="continue-condition"]', 'i % 2 = 0');
      await page.fill('[data-testid="continue-message"]', '偶数の場合はスキップ');
      
      // メイン処理
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', '奇数の処理実行');
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop i = 1 to 100');
      expect(plantumlCode).toContain('alt i % 2 = 0');
      expect(plantumlCode).toContain('偶数の場合はスキップ');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('奇数の処理実行');
    });

    test('複数BREAK/CONTINUE条件', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', 'データ処理中');
      
      // 複数のBREAK条件
      await page.click('[data-testid="add-break-condition"]');
      await page.fill('[data-testid="break-condition-1"]', 'エラー発生');
      await page.fill('[data-testid="break-message-1"]', 'エラー終了');
      
      await page.click('[data-testid="add-break-condition"]');
      await page.fill('[data-testid="break-condition-2"]', '最大件数到達');
      await page.fill('[data-testid="break-message-2"]', '上限終了');
      
      // CONTINUE条件
      await page.click('[data-testid="add-continue-condition"]');
      await page.fill('[data-testid="continue-condition-1"]', '無効データ');
      await page.fill('[data-testid="continue-message-1"]', 'スキップ');
      
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', '正常処理');
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('break when エラー発生');
      expect(plantumlCode).toContain('break when 最大件数到達');
      expect(plantumlCode).toContain('alt 無効データ');
      expect(plantumlCode).toContain('スキップ');
      expect(plantumlCode).toContain('正常処理');
    });
  });

  test.describe('ループバリデーション機能テスト', () => {
    
    test('ループ条件の必須入力チェック', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      
      // 条件を空のまま保存を試行
      await page.click('[data-testid="save-loop"]');
      
      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="loop-condition-error"]')).toBeVisible();
      const errorText = await page.textContent('[data-testid="loop-condition-error"]');
      expect(errorText).toContain('ループ条件を入力してください');
    });

    test('FOR範囲値のバリデーション', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      
      // 無効な範囲値テストケース
      const invalidCases = [
        { start: '10', end: '5', error: '開始値が終了値より大きい' },
        { start: 'abc', end: '10', error: '開始値は数値である必要があります' },
        { start: '1', end: 'xyz', error: '終了値は数値である必要があります' },
        { start: '1', end: '1000000', error: '範囲が大きすぎます' }
      ];
      
      for (const testCase of invalidCases) {
        await page.fill('[data-testid="for-start"]', testCase.start);
        await page.fill('[data-testid="for-end"]', testCase.end);
        await page.click('[data-testid="save-loop"]');
        
        // 対応するエラーメッセージが表示されることを確認
        await expect(page.locator('[data-testid="for-range-error"]')).toBeVisible();
        const errorText = await page.textContent('[data-testid="for-range-error"]');
        expect(errorText).toContain(testCase.error);
        
        // エラーをクリア
        await page.fill('[data-testid="for-start"]', '');
        await page.fill('[data-testid="for-end"]', '');
      }
    });

    test('ループ本体の必須チェック', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', '有効な条件');
      
      // アクションを追加せずに保存
      await page.click('[data-testid="save-loop"]');
      
      // 警告メッセージが表示されることを確認
      await expect(page.locator('[data-testid="empty-loop-warning"]')).toBeVisible();
      const warningText = await page.textContent('[data-testid="empty-loop-warning"]');
      expect(warningText).toContain('ループ本体が空です');
      
      // 警告を無視して保存することも可能
      await page.click('[data-testid="save-anyway"]');
      await expect(page.locator('.loop-item')).toBeVisible();
    });

    test('日本語ループ条件のバリデーション', async ({ page }) => {
      const testCases = [
        {
          condition: 'ユーザーデータが存在する間',
          valid: true
        },
        {
          condition: 'カウンター <= 最大回数',
          valid: true
        },
        {
          condition: '処理が完了していない AND エラー回数 < 5',
          valid: true
        },
        {
          condition: '<script>alert("XSS")</script>',
          valid: false
        },
        {
          condition: 'A'.repeat(501), // 500文字超過
          valid: false
        }
      ];

      for (const testCase of testCases) {
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'while');
        await page.fill('[data-testid="loop-condition"]', testCase.condition);
        await page.click('[data-testid="save-loop"]');
        
        if (testCase.valid) {
          // 有効な条件の場合、正常に保存される
          await expect(page.locator('.loop-item')).toBeVisible();
          await page.click('[data-testid="delete-loop-0"]');
          page.on('dialog', async dialog => await dialog.accept());
        } else {
          // 無効な条件の場合、エラーメッセージが表示される
          await expect(page.locator('[data-testid="condition-validation-error"]')).toBeVisible();
          await page.click('[data-testid="cancel-loop"]');
        }
      }
    });
  });

  test.describe('PlantUML構文生成テスト', () => {
    
    test('複雑なループ構造のPlantUML生成', async ({ page }) => {
      // WHILEループWithネストIF分岐
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', 'バッチ処理継続中');
      
      // ループ内にアクション
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', '1件データ取得');
      
      // ループ内に条件分岐を追加
      await page.click('[data-testid="add-condition-in-loop"]');
      await page.fill('[data-testid="loop-condition-expression"]', 'データが有効');
      await page.click('[data-testid="add-action-if-in-loop"]');
      await page.fill('[data-testid="loop-if-message"]', 'データ処理実行');
      await page.click('[data-testid="add-action-else-in-loop"]');
      await page.fill('[data-testid="loop-else-message"]', 'エラーログ出力');
      
      await page.click('[data-testid="save-loop"]');
      
      // 生成されたPlantUMLコードの構文チェック
      const plantumlCode = await editorPage.getPlantUMLCode();
      
      // 正しい構文構造を確認
      expect(plantumlCode).toContain('loop バッチ処理継続中');
      expect(plantumlCode).toContain('1件データ取得');
      expect(plantumlCode).toContain('alt データが有効');
      expect(plantumlCode).toContain('データ処理実行');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('エラーログ出力');
      expect(plantumlCode).toMatch(/end[\s\S]*end/); // altのendとloopのend
      
      // 構文エラーがないことを確認
      expect(plantumlCode).not.toContain('syntax error');
    });

    test('ループ制御文の正確な構文生成', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      await page.fill('[data-testid="for-variable"]', 'index');
      await page.fill('[data-testid="for-start"]', '0');
      await page.fill('[data-testid="for-end"]', '配列長-1');
      
      // CONTINUE条件
      await page.click('[data-testid="add-continue-condition"]');
      await page.fill('[data-testid="continue-condition"]', '配列[index] = null');
      
      // BREAK条件
      await page.click('[data-testid="add-break-condition"]');
      await page.fill('[data-testid="break-condition"]', 'index > 上限値');
      
      // メイン処理
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', '配列[index]を処理');
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUML構文の正確性を確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop index = 0 to 配列長-1');
      expect(plantumlCode).toContain('alt 配列[index] = null');
      expect(plantumlCode).toContain('note right: CONTINUE');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('alt index > 上限値');
      expect(plantumlCode).toContain('note right: BREAK');
      expect(plantumlCode).toContain('配列[index]を処理');
    });

    test('多重ネストループの構文生成', async ({ page }) => {
      // レベル1: 外側のWHILEループ
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', 'ファイルが存在');
      await page.click('[data-testid="save-loop"]');
      
      // レベル2: 中間のFORループ
      await page.click('[data-testid="loop-item-0"] [data-testid="add-nested-loop"]');
      await page.selectOption('[data-testid="nested-loop-type"]', 'for');
      await page.fill('[data-testid="nested-for-variable"]', 'line');
      await page.fill('[data-testid="nested-for-start"]', '1');
      await page.fill('[data-testid="nested-for-end"]', '行数');
      await page.click('[data-testid="save-nested-loop"]');
      
      // レベル3: 最内部のFOREACHループ
      await page.click('[data-testid="nested-loop-item-0"] [data-testid="add-nested-loop"]');
      await page.selectOption('[data-testid="deep-nested-loop-type"]', 'foreach');
      await page.fill('[data-testid="deep-nested-foreach-variable"]', 'char');
      await page.fill('[data-testid="deep-nested-foreach-collection"]', 'line.文字列');
      
      await page.click('[data-testid="add-deep-nested-loop-action"]');
      await page.fill('[data-testid="deep-nested-loop-message"]', '文字[{char}]を解析');
      
      await page.click('[data-testid="save-deep-nested-loop"]');
      
      // 3重ネストの構文検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      const loopCount = (plantumlCode.match(/loop /g) || []).length;
      const endCount = (plantumlCode.match(/end/g) || []).length;
      
      expect(loopCount).toBe(3); // 3つのloop文
      expect(endCount).toBe(3); // 3つのend文
      expect(plantumlCode).toContain('loop ファイルが存在');
      expect(plantumlCode).toContain('loop line = 1 to 行数');
      expect(plantumlCode).toContain('loop for each char in line.文字列');
      expect(plantumlCode).toContain('文字[{char}]を解析');
    });
  });

  test.describe('ループ編集機能テスト', () => {
    
    test('既存ループの編集', async ({ page }) => {
      // ループを作成
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', '元の条件');
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', '元の処理');
      await page.click('[data-testid="save-loop"]');
      
      // 編集ボタンをクリック
      await page.click('[data-testid="edit-loop-0"]');
      
      // モーダルが再表示されることを確認
      await expect(page.locator('[data-testid="loop-editor-modal"]')).toBeVisible();
      
      // 既存の値が設定されていることを確認
      const currentCondition = await page.inputValue('[data-testid="loop-condition"]');
      expect(currentCondition).toBe('元の条件');
      
      // 値を変更
      await page.fill('[data-testid="loop-condition"]', '更新された条件');
      await page.fill('[data-testid="loop-message"]', '更新された処理');
      await page.click('[data-testid="save-loop"]');
      
      // 更新された内容を確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('更新された条件');
      expect(updatedCode).toContain('更新された処理');
      expect(updatedCode).not.toContain('元の条件');
      expect(updatedCode).not.toContain('元の処理');
    });

    test('ループ削除機能', async ({ page }) => {
      // 複数のループを作成
      const loops = [
        { condition: 'ループ1条件', message: 'ループ1処理' },
        { condition: 'ループ2条件', message: 'ループ2処理' },
        { condition: 'ループ3条件', message: 'ループ3処理' }
      ];

      for (const loop of loops) {
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'while');
        await page.fill('[data-testid="loop-condition"]', loop.condition);
        await page.click('[data-testid="add-loop-action"]');
        await page.fill('[data-testid="loop-message"]', loop.message);
        await page.click('[data-testid="save-loop"]');
      }

      // 中間のループを削除
      await page.click('[data-testid="delete-loop-1"]');
      
      // 確認ダイアログの処理
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      // ループ数が減ったことを確認
      const remainingLoops = page.locator('.loop-item');
      await expect(remainingLoops).toHaveCount(2);
      
      // PlantUMLコードから削除されたループが消えていることを確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('ループ1条件');
      expect(updatedCode).not.toContain('ループ2条件');
      expect(updatedCode).toContain('ループ3条件');
    });

    test('ループタイプ変更機能', async ({ page }) => {
      // WHILEループを作成
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', 'データ処理中');
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', '処理実行');
      await page.click('[data-testid="save-loop"]');
      
      // 編集でFORループに変更
      await page.click('[data-testid="edit-loop-0"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      
      // FOR設定に変更
      await page.fill('[data-testid="for-variable"]', 'i');
      await page.fill('[data-testid="for-start"]', '1');
      await page.fill('[data-testid="for-end"]', '10');
      
      await page.click('[data-testid="save-loop"]');
      
      // PlantUMLコードが更新されることを確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('loop i = 1 to 10');
      expect(updatedCode).not.toContain('loop データ処理中');
      expect(updatedCode).toContain('処理実行'); // アクションは保持される
    });
  });

  test.describe('エラー回復とパフォーマンステスト', () => {
    
    test('大量ループアクションの処理性能', async ({ page }) => {
      const startTime = Date.now();
      
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      await page.fill('[data-testid="for-variable"]', 'i');
      await page.fill('[data-testid="for-start"]', '1');
      await page.fill('[data-testid="for-end"]', '50');
      
      // 50個のアクションを追加
      for (let i = 1; i <= 50; i++) {
        await page.click('[data-testid="add-loop-action"]');
        await page.fill(`[data-testid="loop-message-${i}"]`, `処理${i}`);
        
        // 10個ごとに進捗確認
        if (i % 10 === 0) {
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          console.log(`${i}個のアクション追加完了: ${elapsed}ms`);
        }
      }
      
      await page.click('[data-testid="save-loop"]');
      
      const totalTime = Date.now() - startTime;
      console.log(`50個のアクション追加にかかった時間: ${totalTime}ms`);
      
      // 処理時間が30秒以内であることを確認
      expect(totalTime).toBeLessThan(30000);
      
      // PlantUMLコードが正しく生成されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop i = 1 to 50');
      expect(plantumlCode).toContain('処理1');
      expect(plantumlCode).toContain('処理50');
    });

    test('ループエディターエラー回復', async ({ page }) => {
      await page.click('[data-testid="add-loop"]');
      
      // JavaScriptエラーを意図的に発生させる
      await page.evaluate(() => {
        throw new Error('テスト用エラー');
      });
      
      // エラーが発生してもアプリケーションが継続動作することを確認
      await page.waitForTimeout(1000);
      
      // ループ作成が引き続き可能であることを確認
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', 'エラー回復テスト');
      await page.click('[data-testid="add-loop-action"]');
      await page.fill('[data-testid="loop-message"]', 'エラー回復後の処理');
      await page.click('[data-testid="save-loop"]');
      
      // ループが正常に作成されることを確認
      await expect(page.locator('.loop-item')).toBeVisible();
    });

    test('メモリ使用量の監視', async ({ page }) => {
      // 複雑なネストループを作成してメモリ使用量をテスト
      for (let i = 1; i <= 10; i++) {
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'for');
        await page.fill('[data-testid="for-variable"]', `outer${i}`);
        await page.fill('[data-testid="for-start"]', '1');
        await page.fill('[data-testid="for-end"]', '10');
        
        // 各ループに5個のアクションを追加
        for (let j = 1; j <= 5; j++) {
          await page.click('[data-testid="add-loop-action"]');
          await page.fill(`[data-testid="loop-message-${j}"]`, `ループ${i}-アクション${j}`);
        }
        
        await page.click('[data-testid="save-loop"]');
      }
      
      // メモリ使用量を確認
      const memoryUsage = await editorPage.getMemoryUsage();
      if (memoryUsage) {
        // メモリ使用量が500MB以下であることを確認
        expect(memoryUsage.used).toBeLessThan(500 * 1024 * 1024);
        console.log(`メモリ使用量: ${Math.round(memoryUsage.used / 1024 / 1024)}MB`);
      }
    });
  });
});