import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * TEST-E2E-008: ConditionEditor 分岐ロジックテスト
 * 目的: IF/ELSE/ELSEIF条件分岐の作成、編集、ネスト処理を包括的にテスト
 * カバレッジ: 条件式、分岐パス、PlantUML構文生成、ネスト構造
 */

test.describe('TEST-E2E-008: ConditionEditor Branch Logic Tests', () => {
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

  test.describe('基本的な条件分岐テスト', () => {
    
    test('シンプルなIF条件分岐作成テスト', async ({ page }) => {
      // STEP1: 条件分岐エディターを開く
      await page.click('[data-testid="add-condition"]');
      
      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="condition-editor-modal"]')).toBeVisible();
      
      // STEP2: IF条件を設定
      await page.selectOption('[data-testid="condition-type"]', 'if');
      await page.fill('[data-testid="condition-expression"]', 'ユーザーが管理者権限を持つ');
      
      // STEP3: IF分岐内のアクションを設定
      await page.click('[data-testid="add-action-if-branch"]');
      await page.selectOption('[data-testid="if-actor-from"]', 'System');
      await page.selectOption('[data-testid="if-actor-to"]', 'AdminPanel');
      await page.fill('[data-testid="if-message"]', '管理画面表示');
      
      // STEP4: 条件分岐保存
      await page.click('[data-testid="save-condition"]');
      
      // STEP5: 結果検証
      // 条件分岐アイテムが表示されることを確認
      await expect(page.locator('.condition-item')).toBeVisible();
      
      // PlantUMLコードが正しく生成されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('alt ユーザーが管理者権限を持つ');
      expect(plantumlCode).toContain('System -> AdminPanel: 管理画面表示');
      expect(plantumlCode).toContain('end');
      
      // モーダルが閉じられることを確認
      await expect(page.locator('[data-testid="condition-editor-modal"]')).not.toBeVisible();
    });

    test('IF-ELSE条件分岐作成テスト', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      
      // IF条件設定
      await page.selectOption('[data-testid="condition-type"]', 'if-else');
      await page.fill('[data-testid="condition-expression"]', 'パスワードが正しい');
      
      // IF分岐のアクション
      await page.click('[data-testid="add-action-if-branch"]');
      await page.selectOption('[data-testid="if-actor-from"]', 'System');
      await page.selectOption('[data-testid="if-actor-to"]', 'User');
      await page.fill('[data-testid="if-message"]', 'ログイン成功');
      
      // ELSE分岐のアクション
      await page.click('[data-testid="add-action-else-branch"]');
      await page.selectOption('[data-testid="else-actor-from"]', 'System');
      await page.selectOption('[data-testid="else-actor-to"]', 'User');
      await page.fill('[data-testid="else-message"]', 'ログイン失敗');
      
      await page.click('[data-testid="save-condition"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('alt パスワードが正しい');
      expect(plantumlCode).toContain('System -> User: ログイン成功');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('System -> User: ログイン失敗');
      expect(plantumlCode).toContain('end');
    });

    test('複数ELSEIF条件分岐テスト', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      
      // 複数条件分岐を設定
      await page.selectOption('[data-testid="condition-type"]', 'if-elseif-else');
      await page.fill('[data-testid="condition-expression"]', 'ユーザーレベル = 1');
      
      // IF分岐
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', '初心者モード表示');
      
      // ELSEIF分岐を追加
      await page.click('[data-testid="add-elseif-branch"]');
      await page.fill('[data-testid="elseif-condition-1"]', 'ユーザーレベル = 2');
      await page.click('[data-testid="add-action-elseif-branch-1"]');
      await page.fill('[data-testid="elseif-message-1"]', '中級者モード表示');
      
      // さらにELSEIF分岐を追加
      await page.click('[data-testid="add-elseif-branch"]');
      await page.fill('[data-testid="elseif-condition-2"]', 'ユーザーレベル = 3');
      await page.click('[data-testid="add-action-elseif-branch-2"]');
      await page.fill('[data-testid="elseif-message-2"]', '上級者モード表示');
      
      // ELSE分岐
      await page.click('[data-testid="add-action-else-branch"]');
      await page.fill('[data-testid="else-message"]', 'デフォルトモード表示');
      
      await page.click('[data-testid="save-condition"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('alt ユーザーレベル = 1');
      expect(plantumlCode).toContain('初心者モード表示');
      expect(plantumlCode).toContain('else ユーザーレベル = 2');
      expect(plantumlCode).toContain('中級者モード表示');
      expect(plantumlCode).toContain('else ユーザーレベル = 3');
      expect(plantumlCode).toContain('上級者モード表示');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('デフォルトモード表示');
    });
  });

  test.describe('ネスト条件分岐テスト', () => {
    
    test('二重ネスト条件分岐テスト', async ({ page }) => {
      // 外側の条件分岐
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '認証が成功');
      await page.click('[data-testid="save-condition"]');
      
      // 外側の条件内に内側の条件分岐を追加
      await page.click('[data-testid="condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="nested-condition-expression"]', '管理者権限がある');
      
      // 内側のIF分岐
      await page.click('[data-testid="add-action-nested-if"]');
      await page.fill('[data-testid="nested-if-message"]', '管理機能へのアクセス許可');
      
      // 内側のELSE分岐
      await page.click('[data-testid="add-action-nested-else"]');
      await page.fill('[data-testid="nested-else-message"]', '一般機能へのアクセス許可');
      
      await page.click('[data-testid="save-nested-condition"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('alt 認証が成功');
      expect(plantumlCode).toContain('alt 管理者権限がある');
      expect(plantumlCode).toContain('管理機能へのアクセス許可');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('一般機能へのアクセス許可');
      expect(plantumlCode).toMatch(/end[\s\S]*end/); // 2つのendがあることを確認
    });

    test('三重ネスト条件分岐テスト', async ({ page }) => {
      // レベル1: 外側の条件
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', 'ユーザーがログイン済み');
      await page.click('[data-testid="save-condition"]');
      
      // レベル2: 中間の条件
      await page.click('[data-testid="condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="nested-condition-expression"]', 'セッションが有効');
      await page.click('[data-testid="save-nested-condition"]');
      
      // レベル3: 最内部の条件
      await page.click('[data-testid="nested-condition-item-0"] [data-testid="add-nested-condition"]');
      await page.fill('[data-testid="deep-nested-condition-expression"]', 'プレミアム会員');
      
      await page.click('[data-testid="add-action-deep-nested-if"]');
      await page.fill('[data-testid="deep-nested-if-message"]', 'プレミアム機能表示');
      
      await page.click('[data-testid="add-action-deep-nested-else"]');
      await page.fill('[data-testid="deep-nested-else-message"]', '標準機能表示');
      
      await page.click('[data-testid="save-deep-nested-condition"]');
      
      // PlantUMLコード検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      const altCount = (plantumlCode.match(/alt /g) || []).length;
      const endCount = (plantumlCode.match(/end/g) || []).length;
      
      expect(altCount).toBe(3); // 3つのalt文
      expect(endCount).toBe(3); // 3つのend文
      expect(plantumlCode).toContain('プレミアム機能表示');
      expect(plantumlCode).toContain('標準機能表示');
    });
  });

  test.describe('条件式バリデーションテスト', () => {
    
    test('条件式の必須入力チェック', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      
      // 条件式を空のまま保存を試行
      await page.click('[data-testid="save-condition"]');
      
      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="condition-expression-error"]')).toBeVisible();
      const errorText = await page.textContent('[data-testid="condition-expression-error"]');
      expect(errorText).toContain('条件式を入力してください');
    });

    test('日本語条件式のバリデーション', async ({ page }) => {
      const testCases = [
        {
          expression: 'ユーザー名が"admin"と等しい',
          shouldPass: true
        },
        {
          expression: 'パスワード長 > 8文字',
          shouldPass: true
        },
        {
          expression: 'メールアドレスに@が含まれる',
          shouldPass: true
        },
        {
          expression: '年齢 >= 18歳 AND 年齢 <= 65歳',
          shouldPass: true
        },
        {
          expression: '<script>alert("XSS")</script>',
          shouldPass: false
        },
        {
          expression: 'DROP TABLE users; --',
          shouldPass: false
        }
      ];

      for (const testCase of testCases) {
        await page.click('[data-testid="add-condition"]');
        await page.fill('[data-testid="condition-expression"]', testCase.expression);
        await page.click('[data-testid="save-condition"]');
        
        if (testCase.shouldPass) {
          // 有効な条件式の場合、正常に保存される
          await expect(page.locator('.condition-item')).toBeVisible();
          await page.click('[data-testid="delete-condition-0"]');
        } else {
          // 無効な条件式の場合、エラーメッセージが表示される
          await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
          await page.click('[data-testid="cancel-condition"]');
        }
      }
    });

    test('条件式の文字数制限チェック', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      
      // 300文字を超える条件式
      const longExpression = 'A'.repeat(301);
      await page.fill('[data-testid="condition-expression"]', longExpression);
      await page.click('[data-testid="save-condition"]');
      
      // 文字数制限エラーが表示されることを確認
      await expect(page.locator('[data-testid="expression-length-error"]')).toBeVisible();
      const errorText = await page.textContent('[data-testid="expression-length-error"]');
      expect(errorText).toContain('300文字以内');
    });
  });

  test.describe('PlantUML構文生成テスト', () => {
    
    test('複雑な条件構造のPlantUML生成', async ({ page }) => {
      // 複雑な条件分岐を作成
      await page.click('[data-testid="add-condition"]');
      await page.selectOption('[data-testid="condition-type"]', 'if-elseif-else');
      await page.fill('[data-testid="condition-expression"]', '支払い方法 = "クレジットカード"');
      
      // IF分岐
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', 'カード決済処理開始');
      
      // ELSEIF分岐
      await page.click('[data-testid="add-elseif-branch"]');
      await page.fill('[data-testid="elseif-condition-1"]', '支払い方法 = "銀行振込"');
      await page.click('[data-testid="add-action-elseif-branch-1"]');
      await page.fill('[data-testid="elseif-message-1"]', '振込情報表示');
      
      // ELSE分岐
      await page.click('[data-testid="add-action-else-branch"]');
      await page.fill('[data-testid="else-message"]', 'エラー：未対応の支払い方法');
      
      await page.click('[data-testid="save-condition"]');
      
      // 生成されたPlantUMLコードの構文チェック
      const plantumlCode = await editorPage.getPlantUMLCode();
      
      // 構文の正確性を検証
      expect(plantumlCode).toMatch(/alt\s+支払い方法\s*=\s*"クレジットカード"/);
      expect(plantumlCode).toContain('カード決済処理開始');
      expect(plantumlCode).toMatch(/else\s+支払い方法\s*=\s*"銀行振込"/);
      expect(plantumlCode).toContain('振込情報表示');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('エラー：未対応の支払い方法');
      expect(plantumlCode).toContain('end');
      
      // 構文エラーがないことを確認
      expect(plantumlCode).not.toContain('syntax error');
    });

    test('条件分岐内のアクション複数配置テスト', async ({ page }) => {
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', 'データ処理完了');
      
      // IF分岐内に複数のアクションを追加
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', 'ログに記録');
      
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message-2"]', 'ユーザーに通知');
      
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message-3"]', 'バックアップ作成');
      
      await page.click('[data-testid="save-condition"]');
      
      // PlantUMLコードで複数アクションが正しく配置されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('ログに記録');
      expect(plantumlCode).toContain('ユーザーに通知');
      expect(plantumlCode).toContain('バックアップ作成');
      
      // アクションの順序が維持されることを確認
      const logIndex = plantumlCode.indexOf('ログに記録');
      const notifyIndex = plantumlCode.indexOf('ユーザーに通知');
      const backupIndex = plantumlCode.indexOf('バックアップ作成');
      
      expect(logIndex).toBeLessThan(notifyIndex);
      expect(notifyIndex).toBeLessThan(backupIndex);
    });
  });

  test.describe('条件分岐編集機能テスト', () => {
    
    test('既存条件分岐の編集テスト', async ({ page }) => {
      // 条件分岐を作成
      await page.click('[data-testid="add-condition"]');
      await page.fill('[data-testid="condition-expression"]', '元の条件');
      await page.click('[data-testid="add-action-if-branch"]');
      await page.fill('[data-testid="if-message"]', '元のメッセージ');
      await page.click('[data-testid="save-condition"]');
      
      // 編集ボタンをクリック
      await page.click('[data-testid="edit-condition-0"]');
      
      // モーダルが再表示されることを確認
      await expect(page.locator('[data-testid="condition-editor-modal"]')).toBeVisible();
      
      // 既存の値が設定されていることを確認
      const currentExpression = await page.inputValue('[data-testid="condition-expression"]');
      expect(currentExpression).toBe('元の条件');
      
      // 値を変更
      await page.fill('[data-testid="condition-expression"]', '更新された条件');
      await page.fill('[data-testid="if-message"]', '更新されたメッセージ');
      await page.click('[data-testid="save-condition"]');
      
      // 更新された内容を確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('更新された条件');
      expect(updatedCode).toContain('更新されたメッセージ');
      expect(updatedCode).not.toContain('元の条件');
      expect(updatedCode).not.toContain('元のメッセージ');
    });

    test('条件分岐削除機能テスト', async ({ page }) => {
      // 複数の条件分岐を作成
      const conditions = [
        { expression: '条件1', message: 'アクション1' },
        { expression: '条件2', message: 'アクション2' },
        { expression: '条件3', message: 'アクション3' }
      ];

      for (const condition of conditions) {
        await page.click('[data-testid="add-condition"]');
        await page.fill('[data-testid="condition-expression"]', condition.expression);
        await page.click('[data-testid="add-action-if-branch"]');
        await page.fill('[data-testid="if-message"]', condition.message);
        await page.click('[data-testid="save-condition"]');
      }

      // 中間の条件分岐を削除
      await page.click('[data-testid="delete-condition-1"]');
      
      // 確認ダイアログの処理
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      // 条件分岐数が減ったことを確認
      const remainingConditions = page.locator('.condition-item');
      await expect(remainingConditions).toHaveCount(2);
      
      // PlantUMLコードから削除された条件が消えていることを確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('条件1');
      expect(updatedCode).not.toContain('条件2');
      expect(updatedCode).toContain('条件3');
    });
  });

  test.describe('パフォーマンステスト', () => {
    
    test('大量条件分岐の処理性能テスト', async ({ page }) => {
      const startTime = Date.now();
      
      // 20個の条件分岐を作成
      for (let i = 1; i <= 20; i++) {
        await page.click('[data-testid="add-condition"]');
        await page.fill('[data-testid="condition-expression"]', `条件${i}`);
        await page.click('[data-testid="add-action-if-branch"]');
        await page.fill('[data-testid="if-message"]', `アクション${i}`);
        await page.click('[data-testid="save-condition"]');
        
        // 5個ごとに進捗を確認
        if (i % 5 === 0) {
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          console.log(`${i}個の条件分岐作成完了: ${elapsed}ms`);
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`20個の条件分岐作成にかかった時間: ${totalTime}ms`);
      
      // 20個の条件分岐作成が30秒以内に完了することを確認
      expect(totalTime).toBeLessThan(30000);
      
      // 最終的なPlantUMLコードサイズをチェック
      const finalCode = await editorPage.getPlantUMLCode();
      expect(finalCode.length).toBeGreaterThan(0);
      expect(finalCode.length).toBeLessThan(50000); // 50KB以内
    });

    test('深いネスト条件の処理性能テスト', async ({ page }) => {
      const nestLevels = 5; // 5重ネスト
      const startTime = Date.now();
      
      // 深いネスト構造を作成
      for (let level = 1; level <= nestLevels; level++) {
        if (level === 1) {
          await page.click('[data-testid="add-condition"]');
        } else {
          await page.click(`[data-testid="condition-item-${level-2}"] [data-testid="add-nested-condition"]`);
        }
        
        await page.fill(`[data-testid="${level === 1 ? 'condition' : 'nested-condition'}-expression"]`, `レベル${level}の条件`);
        await page.click(`[data-testid="add-action-${level === 1 ? 'if' : 'nested-if'}-branch"]`);
        await page.fill(`[data-testid="${level === 1 ? 'if' : 'nested-if'}-message"]`, `レベル${level}のアクション`);
        await page.click(`[data-testid="save-${level === 1 ? '' : 'nested-'}condition"]`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`${nestLevels}重ネスト条件作成にかかった時間: ${totalTime}ms`);
      
      // ネスト構造作成が15秒以内に完了することを確認
      expect(totalTime).toBeLessThan(15000);
      
      // PlantUMLコードの正確性を確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      const altCount = (plantumlCode.match(/alt/g) || []).length;
      const endCount = (plantumlCode.match(/end/g) || []).length;
      
      expect(altCount).toBe(nestLevels);
      expect(endCount).toBe(nestLevels);
    });
  });
});