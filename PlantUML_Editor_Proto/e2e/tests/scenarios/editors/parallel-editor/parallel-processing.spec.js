import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * TEST-E2E-012: ParallelEditor 並行処理テスト
 * 目的: FORK/JOIN、PAR/END、並行処理分岐の作成とPlantUML構文生成をテスト
 * カバレッジ: 並行分岐、同期ポイント、タイムライン視覚化、競合検出
 */

test.describe('TEST-E2E-012: ParallelEditor Parallel Processing Tests', () => {
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

  test.describe('FORK/JOIN構文作成テスト', () => {
    
    test('基本的なFORK/JOIN並行処理作成', async ({ page }) => {
      // STEP1: 並行処理エディターを開く
      await page.click('[data-testid="add-parallel"]');
      
      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="parallel-editor-modal"]')).toBeVisible();
      
      // STEP2: FORK/JOIN方式を選択
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      
      // STEP3: 並行分岐の設定
      await page.fill('[data-testid="parallel-description"]', 'データ処理の並行実行');
      
      // STEP4: 分岐1を設定
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '分岐A: ファイル処理');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.selectOption('[data-testid="branch-1-actor-from-1"]', 'System');
      await page.selectOption('[data-testid="branch-1-actor-to-1"]', 'FileProcessor');
      await page.fill('[data-testid="branch-1-message-1"]', 'ファイルを読み込み');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-2"]', 'データを解析');
      
      // STEP5: 分岐2を設定
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '分岐B: DB処理');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.selectOption('[data-testid="branch-2-actor-from-1"]', 'System');
      await page.selectOption('[data-testid="branch-2-actor-to-1"]', 'Database');
      await page.fill('[data-testid="branch-2-message-1"]', 'メタデータ取得');
      
      // STEP6: 分岐3を設定
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', '分岐C: 通知処理');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.selectOption('[data-testid="branch-3-actor-from-1"]', 'System');
      await page.selectOption('[data-testid="branch-3-actor-to-1"]', 'NotificationService');
      await page.fill('[data-testid="branch-3-message-1"]', '処理開始通知送信');
      
      // STEP7: 並行処理保存
      await page.click('[data-testid="save-parallel"]');
      
      // STEP8: 結果検証
      // 並行処理アイテムが表示されることを確認
      await expect(page.locator('.parallel-item')).toBeVisible();
      
      // PlantUMLコードが正しく生成されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('System -> FileProcessor: ファイルを読み込み');
      expect(plantumlCode).toContain('データを解析');
      expect(plantumlCode).toContain('fork again');
      expect(plantumlCode).toContain('System -> Database: メタデータ取得');
      expect(plantumlCode).toContain('System -> NotificationService: 処理開始通知送信');
      expect(plantumlCode).toContain('end fork');
      
      // モーダルが閉じられることを確認
      await expect(page.locator('[data-testid="parallel-editor-modal"]')).not.toBeVisible();
    });

    test('分岐数の動的増減テスト', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '動的分岐テスト');
      
      // 初期分岐を追加
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '初期分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', '初期処理');
      
      // 5個の分岐を追加
      for (let i = 2; i <= 6; i++) {
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill(`[data-testid="branch-name-${i}"]`, `分岐${i}`);
        await page.click(`[data-testid="add-branch-action-${i}"]`);
        await page.fill(`[data-testid="branch-${i}-message-1"]`, `処理${i}`);
      }
      
      // 分岐数を確認
      const branchCount = await page.locator('[data-testid^="parallel-branch-"]').count();
      expect(branchCount).toBe(6);
      
      // 中間の分岐を削除
      await page.click('[data-testid="delete-branch-3"]');
      await page.click('[data-testid="delete-branch-5"]');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードで正しい分岐数が反映されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('処理1');
      expect(plantumlCode).toContain('処理2');
      expect(plantumlCode).not.toContain('処理3');
      expect(plantumlCode).toContain('処理4');
      expect(plantumlCode).not.toContain('処理5');
      expect(plantumlCode).toContain('処理6');
    });

    test('複雑なFORK/JOINネスト構造', async ({ page }) => {
      // 外側のFORK/JOIN
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '外側並行処理');
      
      // 外側分岐1
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '外側分岐1');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', '外側処理1');
      
      // 外側分岐2
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '外側分岐2');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '外側処理2');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 外側分岐1内に内側のFORK/JOINを追加
      await page.click('[data-testid="parallel-item-0"] [data-testid="branch-1"] [data-testid="add-nested-parallel"]');
      await page.selectOption('[data-testid="nested-parallel-type"]', 'fork-join');
      
      // 内側分岐A
      await page.click('[data-testid="add-nested-parallel-branch"]');
      await page.fill('[data-testid="nested-branch-name-A"]', '内側分岐A');
      await page.click('[data-testid="add-nested-branch-action-A"]');
      await page.fill('[data-testid="nested-branch-A-message-1"]', '内側処理A');
      
      // 内側分岐B
      await page.click('[data-testid="add-nested-parallel-branch"]');
      await page.fill('[data-testid="nested-branch-name-B"]', '内側分岐B');
      await page.click('[data-testid="add-nested-branch-action-B"]');
      await page.fill('[data-testid="nested-branch-B-message-1"]', '内側処理B');
      
      await page.click('[data-testid="save-nested-parallel"]');
      
      // PlantUMLコードでネスト構造が正しく生成されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('外側処理1');
      expect(plantumlCode).toContain('fork'); // 2つ目のfork（ネスト）
      expect(plantumlCode).toContain('内側処理A');
      expect(plantumlCode).toContain('内側処理B');
      expect(plantumlCode).toContain('end fork'); // 内側のend fork
      expect(plantumlCode).toContain('外側処理2');
      expect(plantumlCode).toContain('end fork'); // 外側のend fork
    });
  });

  test.describe('PAR/END構文作成テスト', () => {
    
    test('基本的なPAR/END並行処理作成', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'par-end');
      await page.fill('[data-testid="parallel-description"]', 'PAR形式並行処理');
      
      // PAR分岐1
      await page.click('[data-testid="add-par-branch"]');
      await page.fill('[data-testid="par-branch-condition-1"]', 'ケース1: 正常処理');
      await page.click('[data-testid="add-par-branch-action-1"]');
      await page.fill('[data-testid="par-branch-1-message-1"]', '正常フロー実行');
      
      // PAR分岐2
      await page.click('[data-testid="add-par-branch"]');
      await page.fill('[data-testid="par-branch-condition-2"]', 'ケース2: エラー処理');
      await page.click('[data-testid="add-par-branch-action-2"]');
      await page.fill('[data-testid="par-branch-2-message-1"]', 'エラーハンドリング');
      
      // PAR分岐3
      await page.click('[data-testid="add-par-branch"]');
      await page.fill('[data-testid="par-branch-condition-3"]', 'ケース3: タイムアウト処理');
      await page.click('[data-testid="add-par-branch-action-3"]');
      await page.fill('[data-testid="par-branch-3-message-1"]', 'タイムアウト対応');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードの検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('par ケース1: 正常処理');
      expect(plantumlCode).toContain('正常フロー実行');
      expect(plantumlCode).toContain('else ケース2: エラー処理');
      expect(plantumlCode).toContain('エラーハンドリング');
      expect(plantumlCode).toContain('else ケース3: タイムアウト処理');
      expect(plantumlCode).toContain('タイムアウト対応');
      expect(plantumlCode).toContain('end');
    });

    test('条件付きPAR分岐テスト', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'par-end');
      await page.fill('[data-testid="parallel-description"]', '条件付き並行処理');
      
      // 複雑な条件の設定
      const conditions = [
        { condition: 'ユーザータイプ = "Premium"', action: 'プレミアム機能提供' },
        { condition: 'ユーザータイプ = "Standard"', action: '標準機能提供' },
        { condition: 'ユーザータイプ = "Free"', action: '制限機能提供' },
        { condition: 'その他の場合', action: 'デフォルト処理' }
      ];
      
      for (const [index, item] of conditions.entries()) {
        await page.click('[data-testid="add-par-branch"]');
        await page.fill(`[data-testid="par-branch-condition-${index + 1}"]`, item.condition);
        await page.click(`[data-testid="add-par-branch-action-${index + 1}"]`);
        await page.fill(`[data-testid="par-branch-${index + 1}-message-1"]`, item.action);
        
        // 複数のアクションを各分岐に追加
        await page.click(`[data-testid="add-par-branch-action-${index + 1}"]`);
        await page.fill(`[data-testid="par-branch-${index + 1}-message-2"]`, `${item.action}後の後処理`);
      }
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードの検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('par ユーザータイプ = "Premium"');
      expect(plantumlCode).toContain('プレミアム機能提供');
      expect(plantumlCode).toContain('プレミアム機能提供後の後処理');
      expect(plantumlCode).toContain('else ユーザータイプ = "Standard"');
      expect(plantumlCode).toContain('標準機能提供');
      expect(plantumlCode).toContain('else その他の場合');
      expect(plantumlCode).toContain('デフォルト処理');
    });

    test('PAR分岐内でのアクション順序制御', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'par-end');
      await page.fill('[data-testid="parallel-description"]', '順序制御テスト');
      
      // 複数アクションを持つPAR分岐を作成
      await page.click('[data-testid="add-par-branch"]');
      await page.fill('[data-testid="par-branch-condition-1"]', 'データ処理フロー');
      
      const actions = [
        'データ取得',
        'データ検証',
        'データ変換',
        'データ保存',
        '完了通知'
      ];
      
      for (const [index, action] of actions.entries()) {
        await page.click('[data-testid="add-par-branch-action-1"]');
        await page.fill(`[data-testid="par-branch-1-message-${index + 1}"]`, action);
      }
      
      await page.click('[data-testid="save-parallel"]');
      
      // アクションの順序をドラッグ&ドロップで変更
      const action1 = page.locator('[data-testid="par-branch-1-action-1"]');
      const action5 = page.locator('[data-testid="par-branch-1-action-5"]');
      
      await action1.dragTo(action5);
      
      // 順序変更が反映されることを確認
      const updatedCode = await editorPage.getPlantUMLCode();
      const dataGetIndex = updatedCode.indexOf('データ取得');
      const completeNotifyIndex = updatedCode.indexOf('完了通知');
      
      // データ取得が完了通知より後に来ることを確認
      expect(dataGetIndex).toBeGreaterThan(completeNotifyIndex);
    });
  });

  test.describe('並行分岐作成テスト', () => {
    
    test('複数アクター間の並行処理', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '複数アクター並行処理');
      
      // 分岐1: フロントエンド処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', 'フロントエンド分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.selectOption('[data-testid="branch-1-actor-from-1"]', 'User');
      await page.selectOption('[data-testid="branch-1-actor-to-1"]', 'Frontend');
      await page.fill('[data-testid="branch-1-message-1"]', 'ローディング表示');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.selectOption('[data-testid="branch-1-actor-from-2"]', 'Frontend');
      await page.selectOption('[data-testid="branch-1-actor-to-2"]', 'User');
      await page.fill('[data-testid="branch-1-message-2"]', '進捗更新');
      
      // 分岐2: バックエンド処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', 'バックエンド分岐');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.selectOption('[data-testid="branch-2-actor-from-1"]', 'Backend');
      await page.selectOption('[data-testid="branch-2-actor-to-1"]', 'Database');
      await page.fill('[data-testid="branch-2-message-1"]', 'データ問い合わせ');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.selectOption('[data-testid="branch-2-actor-from-2"]', 'Database');
      await page.selectOption('[data-testid="branch-2-actor-to-2"]', 'Backend');
      await page.fill('[data-testid="branch-2-message-2"]', '結果返却');
      
      // 分岐3: ログ処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', 'ログ分岐');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.selectOption('[data-testid="branch-3-actor-from-1"]', 'System');
      await page.selectOption('[data-testid="branch-3-actor-to-1"]', 'Logger');
      await page.fill('[data-testid="branch-3-message-1"]', 'アクセスログ記録');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードで複数アクターの並行処理が正しく表現されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('User -> Frontend: ローディング表示');
      expect(plantumlCode).toContain('Frontend -> User: 進捗更新');
      expect(plantumlCode).toContain('Backend -> Database: データ問い合わせ');
      expect(plantumlCode).toContain('Database -> Backend: 結果返却');
      expect(plantumlCode).toContain('System -> Logger: アクセスログ記録');
    });

    test('時間制約付き並行処理', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'タイムアウト制御並行処理');
      
      // タイムアウト設定を有効化
      await page.check('[data-testid="enable-timeout-control"]');
      await page.fill('[data-testid="global-timeout"]', '30秒');
      
      // 分岐1: 高速処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '高速処理分岐');
      await page.fill('[data-testid="branch-timeout-1"]', '5秒');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'キャッシュから取得');
      
      // 分岐2: 通常処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '通常処理分岐');
      await page.fill('[data-testid="branch-timeout-2"]', '15秒');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', 'データベースから取得');
      
      // 分岐3: 重処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', '重処理分岐');
      await page.fill('[data-testid="branch-timeout-3"]', '25秒');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.fill('[data-testid="branch-3-message-1"]', '複雑な計算実行');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードにタイムアウト情報が含まれることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('note right: タイムアウト: 5秒');
      expect(plantumlCode).toContain('note right: タイムアウト: 15秒');
      expect(plantumlCode).toContain('note right: タイムアウト: 25秒');
      expect(plantumlCode).toContain('note over: 全体タイムアウト: 30秒');
    });

    test('条件分岐を含む並行処理', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '条件分岐付き並行処理');
      
      // 分岐1: 条件分岐を含む処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '条件分岐処理');
      
      // 分岐内に条件分岐を追加
      await page.click('[data-testid="add-condition-in-branch-1"]');
      await page.fill('[data-testid="branch-1-condition"]', 'データサイズ > 1MB');
      
      // IF分岐
      await page.click('[data-testid="add-if-action-in-branch-1"]');
      await page.fill('[data-testid="branch-1-if-message"]', '大容量データ処理');
      
      // ELSE分岐
      await page.click('[data-testid="add-else-action-in-branch-1"]');
      await page.fill('[data-testid="branch-1-else-message"]', '標準データ処理');
      
      // 分岐2: 単純な処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '単純処理');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', 'ログ出力');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードで条件分岐と並行処理が組み合わされることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('alt データサイズ > 1MB');
      expect(plantumlCode).toContain('大容量データ処理');
      expect(plantumlCode).toContain('else');
      expect(plantumlCode).toContain('標準データ処理');
      expect(plantumlCode).toContain('end'); // altのend
      expect(plantumlCode).toContain('fork again');
      expect(plantumlCode).toContain('ログ出力');
      expect(plantumlCode).toContain('end fork');
    });
  });

  test.describe('同期ポイント管理テスト', () => {
    
    test('明示的な同期ポイント設定', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '同期ポイント制御');
      
      // 同期ポイント機能を有効化
      await page.check('[data-testid="enable-sync-points"]');
      
      // 分岐1
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '分岐1');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', '処理1-1');
      
      // 同期ポイント1を追加
      await page.click('[data-testid="add-sync-point-1"]');
      await page.fill('[data-testid="sync-point-name-1"]', '中間同期');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-2"]', '処理1-2');
      
      // 分岐2
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '分岐2');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '処理2-1');
      
      // 同じ同期ポイントを参照
      await page.click('[data-testid="add-sync-point-2"]');
      await page.selectOption('[data-testid="sync-point-ref-2"]', '中間同期');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-2"]', '処理2-2');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードに同期ポイントが正しく表現されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('処理1-1');
      expect(plantumlCode).toContain('note over: 同期ポイント: 中間同期');
      expect(plantumlCode).toContain('処理1-2');
      expect(plantumlCode).toContain('処理2-1');
      expect(plantumlCode).toContain('処理2-2');
    });

    test('条件付き同期ポイント', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '条件付き同期制御');
      
      await page.check('[data-testid="enable-conditional-sync"]');
      
      // 分岐1
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '主処理分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'メイン処理実行');
      
      // 条件付き同期ポイント
      await page.click('[data-testid="add-conditional-sync-1"]');
      await page.fill('[data-testid="conditional-sync-condition-1"]', '処理成功時のみ');
      await page.fill('[data-testid="conditional-sync-name-1"]', '成功時同期');
      
      // 分岐2
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '監視分岐');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '状態監視');
      
      // 条件付き同期の参照
      await page.click('[data-testid="add-conditional-sync-2"]');
      await page.fill('[data-testid="conditional-sync-condition-2"]', '監視完了時');
      await page.selectOption('[data-testid="conditional-sync-ref-2"]', '成功時同期');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードに条件付き同期が反映されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('メイン処理実行');
      expect(plantumlCode).toContain('alt 処理成功時のみ');
      expect(plantumlCode).toContain('note over: 条件付き同期: 成功時同期');
      expect(plantumlCode).toContain('状態監視');
      expect(plantumlCode).toContain('alt 監視完了時');
    });

    test('複数同期ポイントの管理', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '多段階同期制御');
      
      await page.check('[data-testid="enable-multi-sync"]');
      
      // 3つの分岐を作成
      for (let branch = 1; branch <= 3; branch++) {
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill(`[data-testid="branch-name-${branch}"]`, `分岐${branch}`);
        
        // 各分岐に3つの処理段階
        for (let stage = 1; stage <= 3; stage++) {
          await page.click(`[data-testid="add-branch-action-${branch}"]`);
          await page.fill(`[data-testid="branch-${branch}-message-${stage}"]`, `分岐${branch}-段階${stage}`);
          
          // 段階ごとに同期ポイントを追加
          if (stage < 3) {
            await page.click(`[data-testid="add-sync-point-${branch}"]`);
            await page.fill(`[data-testid="sync-point-name-${branch}-${stage}"]`, `段階${stage}同期`);
          }
        }
      }
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードで複数同期ポイントが管理されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('分岐1-段階1');
      expect(plantumlCode).toContain('note over: 同期ポイント: 段階1同期');
      expect(plantumlCode).toContain('分岐1-段階2');
      expect(plantumlCode).toContain('note over: 同期ポイント: 段階2同期');
      expect(plantumlCode).toContain('分岐1-段階3');
      
      // 同期ポイントの数を確認
      const syncPointCount = (plantumlCode.match(/note over: 同期ポイント:/g) || []).length;
      expect(syncPointCount).toBe(6); // 3分岐 × 2同期ポイント
    });
  });

  test.describe('PlantUML構文生成の正確性テスト', () => {
    
    test('複雑な並行構造のPlantUML構文検証', async ({ page }) => {
      // 複雑な並行構造を作成
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '複雑な構造テスト');
      
      // 分岐1: 条件分岐とループを含む
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '複雑分岐1');
      
      // ループを追加
      await page.click('[data-testid="add-loop-in-branch-1"]');
      await page.fill('[data-testid="branch-1-loop-condition"]', 'データが残っている間');
      await page.click('[data-testid="add-loop-action-in-branch-1"]');
      await page.fill('[data-testid="branch-1-loop-message"]', 'データ処理');
      
      // 条件分岐を追加
      await page.click('[data-testid="add-condition-in-branch-1"]');
      await page.fill('[data-testid="branch-1-condition"]', 'エラーチェック');
      await page.click('[data-testid="add-if-action-in-branch-1"]');
      await page.fill('[data-testid="branch-1-if-message"]', 'エラー処理');
      
      // 分岐2: ネスト並行処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', 'ネスト分岐');
      
      await page.click('[data-testid="add-nested-parallel-in-branch-2"]');
      await page.click('[data-testid="add-nested-branch-A"]');
      await page.fill('[data-testid="nested-branch-A-message"]', 'ネスト処理A');
      await page.click('[data-testid="add-nested-branch-B"]');
      await page.fill('[data-testid="nested-branch-B-message"]', 'ネスト処理B');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 生成されたPlantUMLコードの構文検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      
      // 構文要素の存在確認
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('loop データが残っている間');
      expect(plantumlCode).toContain('データ処理');
      expect(plantumlCode).toContain('end'); // loop end
      expect(plantumlCode).toContain('alt エラーチェック');
      expect(plantumlCode).toContain('エラー処理');
      expect(plantumlCode).toContain('end'); // alt end
      expect(plantumlCode).toContain('fork again');
      expect(plantumlCode).toContain('ネスト処理A');
      expect(plantumlCode).toContain('ネスト処理B');
      expect(plantumlCode).toContain('end fork'); // nested fork end
      expect(plantumlCode).toContain('end fork'); // main fork end
      
      // 構文エラーがないことを確認
      expect(plantumlCode).not.toContain('syntax error');
      expect(plantumlCode).not.toContain('undefined');
    });

    test('大規模並行処理のPlantUML構文最適化', async ({ page }) => {
      const startTime = Date.now();
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '大規模並行処理');
      
      // 20個の分岐を持つ大規模並行処理
      for (let i = 1; i <= 20; i++) {
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill(`[data-testid="branch-name-${i}"]`, `大規模分岐${i}`);
        
        // 各分岐に10個のアクション
        for (let j = 1; j <= 10; j++) {
          await page.click(`[data-testid="add-branch-action-${i}"]`);
          await page.fill(`[data-testid="branch-${i}-message-${j}"]`, `処理${i}-${j}`);
        }
      }
      
      await page.click('[data-testid="save-parallel"]');
      
      const generationTime = Date.now() - startTime;
      console.log(`大規模並行処理生成時間: ${generationTime}ms`);
      
      // 生成時間が30秒以内であることを確認
      expect(generationTime).toBeLessThan(30000);
      
      // PlantUMLコードの検証
      const plantumlCode = await editorPage.getPlantUMLCode();
      
      // 適切な構造が生成されることを確認
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('end fork');
      
      // fork again の数が正しいことを確認
      const forkAgainCount = (plantumlCode.match(/fork again/g) || []).length;
      expect(forkAgainCount).toBe(19); // 20分岐なので19個のfork again
      
      // 全てのアクションが含まれることを確認
      expect(plantumlCode).toContain('処理1-1');
      expect(plantumlCode).toContain('処理20-10');
      
      // コードサイズが妥当な範囲内であることを確認
      expect(plantumlCode.length).toBeLessThan(100000); // 100KB以内
    });

    test('エラー耐性のある構文生成', async ({ page }) => {
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      
      // 意図的に不正なデータを混入
      await page.fill('[data-testid="parallel-description"]', 'エラー耐性テスト<script>alert("XSS")</script>');
      
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '特殊文字テスト"\'&<>');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'SQL注入テスト"; DROP TABLE users; --');
      
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', 'Unicode文字🚀⭐💡');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '改行\n文字\rテスト');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードが適切にエスケープされることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      
      // XSSやSQLインジェクションの危険な文字列が除去またはエスケープされること
      expect(plantumlCode).not.toContain('<script>');
      expect(plantumlCode).not.toContain('DROP TABLE');
      expect(plantumlCode).not.toContain('alert(');
      
      // Unicode文字は保持されること
      expect(plantumlCode).toContain('🚀⭐💡');
      
      // 基本的な構文は正しく生成されること
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('end fork');
    });
  });

  test.describe('並行処理編集機能テスト', () => {
    
    test('既存並行処理の編集', async ({ page }) => {
      // 並行処理を作成
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '元の並行処理');
      
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '元の分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', '元の処理');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 編集ボタンをクリック
      await page.click('[data-testid="edit-parallel-0"]');
      
      // モーダルが再表示されることを確認
      await expect(page.locator('[data-testid="parallel-editor-modal"]')).toBeVisible();
      
      // 既存の値が設定されていることを確認
      const currentDescription = await page.inputValue('[data-testid="parallel-description"]');
      expect(currentDescription).toBe('元の並行処理');
      
      // 値を変更
      await page.fill('[data-testid="parallel-description"]', '更新された並行処理');
      await page.fill('[data-testid="branch-name-1"]', '更新された分岐');
      await page.fill('[data-testid="branch-1-message-1"]', '更新された処理');
      
      // 新しい分岐を追加
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '新規分岐');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '新規処理');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 更新された内容を確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('更新された処理');
      expect(updatedCode).toContain('新規処理');
      expect(updatedCode).not.toContain('元の処理');
    });

    test('並行処理削除機能', async ({ page }) => {
      // 複数の並行処理を作成
      const parallels = [
        { description: '並行処理1', branch: '分岐1', message: '処理1' },
        { description: '並行処理2', branch: '分岐2', message: '処理2' },
        { description: '並行処理3', branch: '分岐3', message: '処理3' }
      ];

      for (const parallel of parallels) {
        await page.click('[data-testid="add-parallel"]');
        await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
        await page.fill('[data-testid="parallel-description"]', parallel.description);
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill('[data-testid="branch-name-1"]', parallel.branch);
        await page.click('[data-testid="add-branch-action-1"]');
        await page.fill('[data-testid="branch-1-message-1"]', parallel.message);
        await page.click('[data-testid="save-parallel"]');
      }

      // 中間の並行処理を削除
      await page.click('[data-testid="delete-parallel-1"]');
      
      // 確認ダイアログの処理
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      // 並行処理数が減ったことを確認
      const remainingParallels = page.locator('.parallel-item');
      await expect(remainingParallels).toHaveCount(2);
      
      // PlantUMLコードから削除された並行処理が消えていることを確認
      const updatedCode = await editorPage.getPlantUMLCode();
      expect(updatedCode).toContain('処理1');
      expect(updatedCode).not.toContain('処理2');
      expect(updatedCode).toContain('処理3');
    });

    test('並行処理タイプ変更機能', async ({ page }) => {
      // FORK/JOIN形式で作成
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'タイプ変更テスト');
      
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '分岐A');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', '処理A');
      
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '分岐B');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '処理B');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 初期コードでFORK/JOIN構文を確認
      let plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('fork again');
      expect(plantumlCode).toContain('end fork');
      
      // PAR/END形式に変更
      await page.click('[data-testid="edit-parallel-0"]');
      await page.selectOption('[data-testid="parallel-type"]', 'par-end');
      
      // PAR用の条件を設定
      await page.fill('[data-testid="par-branch-condition-1"]', '条件A');
      await page.fill('[data-testid="par-branch-condition-2"]', '条件B');
      
      await page.click('[data-testid="save-parallel"]');
      
      // PAR/END構文に変更されることを確認
      plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('par 条件A');
      expect(plantumlCode).toContain('else 条件B');
      expect(plantumlCode).toContain('end');
      expect(plantumlCode).not.toContain('fork');
      
      // アクションは保持されることを確認
      expect(plantumlCode).toContain('処理A');
      expect(plantumlCode).toContain('処理B');
    });
  });
});