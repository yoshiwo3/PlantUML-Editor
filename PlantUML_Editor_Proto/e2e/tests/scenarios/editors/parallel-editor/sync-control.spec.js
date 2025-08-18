import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * TEST-E2E-013: ParallelEditor 同期制御テスト
 * 目的: 同期ポイント管理、競合状態検出、デッドロック防止、並行実行プレビュー機能をテスト
 * カバレッジ: 同期制御、競合検出、パフォーマンス最適化、リアルタイム並行処理可視化
 */

test.describe('TEST-E2E-013: ParallelEditor Sync Control Tests', () => {
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

  test.describe('同期ポイント管理システムテスト', () => {
    
    test('グローバル同期ポイント管理', async ({ page }) => {
      // STEP1: 同期ポイント管理機能を有効化
      await page.click('[data-testid="enable-sync-point-management"]');
      
      // STEP2: 複数の並行処理を作成
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '同期制御テスト1');
      
      // 分岐A
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', 'データ取得分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'データベースから取得');
      
      // グローバル同期ポイント1を設定
      await page.click('[data-testid="add-global-sync-point-1"]');
      await page.fill('[data-testid="global-sync-name-1"]', 'データ取得完了');
      await page.selectOption('[data-testid="sync-strategy-1"]', 'wait-all'); // 全分岐待機
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-2"]', 'データ変換');
      
      // 分岐B
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '設定取得分岐');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '設定ファイル読み込み');
      
      // 同じ同期ポイントを参照
      await page.click('[data-testid="reference-global-sync-2"]');
      await page.selectOption('[data-testid="sync-point-ref-2"]', 'データ取得完了');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-2"]', '設定適用');
      
      // 分岐C
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', 'ログ分岐');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.fill('[data-testid="branch-3-message-1"]', 'ログ初期化');
      
      // 同期ポイント参照
      await page.click('[data-testid="reference-global-sync-3"]');
      await page.selectOption('[data-testid="sync-point-ref-3"]', 'データ取得完了');
      
      await page.click('[data-testid="add-branch-action-3"]');
      await page.fill('[data-testid="branch-3-message-2"]', '処理ログ記録開始');
      
      await page.click('[data-testid="save-parallel"]');
      
      // STEP3: 結果検証
      // 同期ポイント管理パネルが表示されることを確認
      await expect(page.locator('[data-testid="sync-point-manager"]')).toBeVisible();
      
      // グローバル同期ポイントがリストされることを確認
      await expect(page.locator('[data-testid="global-sync-list"]')).toContainText('データ取得完了');
      
      // PlantUMLコードで同期制御が正しく表現されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('fork');
      expect(plantumlCode).toContain('データベースから取得');
      expect(plantumlCode).toContain('note over: 同期ポイント[データ取得完了] - 全分岐待機');
      expect(plantumlCode).toContain('データ変換');
      expect(plantumlCode).toContain('設定ファイル読み込み');
      expect(plantumlCode).toContain('設定適用');
      expect(plantumlCode).toContain('ログ初期化');
      expect(plantumlCode).toContain('処理ログ記録開始');
    });

    test('階層的同期ポイント管理', async ({ page }) => {
      await page.click('[data-testid="enable-hierarchical-sync"]');
      
      // レベル1: 外側の並行処理
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '外側並行処理');
      
      // 外側分岐1
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '外側分岐1');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', '外側処理1開始');
      
      // レベル1同期ポイント
      await page.click('[data-testid="add-level-sync-point-1"]');
      await page.fill('[data-testid="level-1-sync-name"]', '外側同期1');
      await page.selectOption('[data-testid="sync-level-1"]', 'level-1');
      
      await page.click('[data-testid="save-parallel"]');
      
      // レベル2: 内側の並行処理を外側分岐1に追加
      await page.click('[data-testid="parallel-item-0"] [data-testid="branch-1"] [data-testid="add-nested-parallel"]');
      await page.selectOption('[data-testid="nested-parallel-type"]', 'fork-join');
      
      // 内側分岐A
      await page.click('[data-testid="add-nested-parallel-branch"]');
      await page.fill('[data-testid="nested-branch-name-A"]', '内側分岐A');
      await page.click('[data-testid="add-nested-branch-action-A"]');
      await page.fill('[data-testid="nested-branch-A-message-1"]', '内側処理A');
      
      // レベル2同期ポイント
      await page.click('[data-testid="add-level-sync-point-A"]');
      await page.fill('[data-testid="level-2-sync-name-A"]', '内側同期A');
      await page.selectOption('[data-testid="sync-level-A"]', 'level-2');
      
      // 内側分岐B
      await page.click('[data-testid="add-nested-parallel-branch"]');
      await page.fill('[data-testid="nested-branch-name-B"]', '内側分岐B');
      await page.click('[data-testid="add-nested-branch-action-B"]');
      await page.fill('[data-testid="nested-branch-B-message-1"]', '内側処理B');
      
      // 同じレベル2同期ポイントを参照
      await page.click('[data-testid="reference-level-sync-B"]');
      await page.selectOption('[data-testid="level-2-sync-ref-B"]', '内側同期A');
      
      await page.click('[data-testid="save-nested-parallel"]');
      
      // 外側分岐2
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '外側分岐2');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '外側処理2');
      
      // レベル1同期ポイント参照
      await page.click('[data-testid="reference-level-sync-2"]');
      await page.selectOption('[data-testid="level-1-sync-ref-2"]', '外側同期1');
      
      // PlantUMLコードで階層的同期が表現されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('外側処理1開始');
      expect(plantumlCode).toContain('note over: レベル1同期[外側同期1]');
      expect(plantumlCode).toContain('内側処理A');
      expect(plantumlCode).toContain('note over: レベル2同期[内側同期A]');
      expect(plantumlCode).toContain('内側処理B');
      expect(plantumlCode).toContain('外側処理2');
    });

    test('条件付き同期ポイント制御', async ({ page }) => {
      await page.click('[data-testid="enable-conditional-sync"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '条件付き同期制御');
      
      // 分岐1: 主処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', 'メイン処理分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'メイン処理実行');
      
      // 条件付き同期ポイント設定
      await page.click('[data-testid="add-conditional-sync-1"]');
      await page.fill('[data-testid="conditional-sync-name-1"]', 'メイン完了時同期');
      await page.fill('[data-testid="sync-condition-1"]', 'メイン処理.status = "SUCCESS"');
      await page.selectOption('[data-testid="sync-action-1"]', 'signal-others'); // 他分岐に信号送信
      
      // 分岐2: 監視処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '監視分岐');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '状態監視開始');
      
      // 条件付き同期ポイント待機
      await page.click('[data-testid="add-conditional-wait-2"]');
      await page.fill('[data-testid="wait-condition-2"]', 'メイン処理完了を待機');
      await page.selectOption('[data-testid="wait-sync-ref-2"]', 'メイン完了時同期');
      await page.fill('[data-testid="wait-timeout-2"]', '30秒');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-2"]', '監視結果報告');
      
      // 分岐3: エラー処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', 'エラー処理分岐');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.fill('[data-testid="branch-3-message-1"]', 'エラー監視');
      
      // 条件付き同期（エラー時）
      await page.click('[data-testid="add-conditional-sync-3"]');
      await page.fill('[data-testid="conditional-sync-name-3"]', 'エラー時同期');
      await page.fill('[data-testid="sync-condition-3"]', 'エラー検出 OR タイムアウト発生');
      await page.selectOption('[data-testid="sync-action-3"]', 'abort-others'); // 他分岐を中止
      
      await page.click('[data-testid="save-parallel"]');
      
      // PlantUMLコードで条件付き同期制御が表現されることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('メイン処理実行');
      expect(plantumlCode).toContain('alt メイン処理.status = "SUCCESS"');
      expect(plantumlCode).toContain('note over: 条件付き同期[メイン完了時同期] → 他分岐に信号');
      expect(plantumlCode).toContain('状態監視開始');
      expect(plantumlCode).toContain('note right: 待機[メイン処理完了を待機] タイムアウト:30秒');
      expect(plantumlCode).toContain('監視結果報告');
      expect(plantumlCode).toContain('エラー監視');
      expect(plantumlCode).toContain('alt エラー検出 OR タイムアウト発生');
      expect(plantumlCode).toContain('note over: 条件付き同期[エラー時同期] → 他分岐を中止');
    });
  });

  test.describe('競合状態検出システムテスト', () => {
    
    test('リソース競合検出機能', async ({ page }) => {
      // 競合検出機能を有効化
      await page.check('[data-testid="enable-race-condition-detection"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'リソース競合テスト');
      
      // 分岐1: 共有リソースAに書き込み
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '書き込み分岐1');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.selectOption('[data-testid="branch-1-actor-from-1"]', 'Process1');
      await page.selectOption('[data-testid="branch-1-actor-to-1"]', 'SharedResource');
      await page.fill('[data-testid="branch-1-message-1"]', 'データ書き込み');
      
      // リソースアクセス情報を設定
      await page.click('[data-testid="set-resource-access-1"]');
      await page.fill('[data-testid="resource-name-1"]', 'SharedDatabase');
      await page.selectOption('[data-testid="access-type-1"]', 'write');
      await page.fill('[data-testid="access-duration-1"]', '2秒');
      
      // 分岐2: 同じ共有リソースAに書き込み（競合発生）
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '書き込み分岐2');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.selectOption('[data-testid="branch-2-actor-from-1"]', 'Process2');
      await page.selectOption('[data-testid="branch-2-actor-to-1"]', 'SharedResource');
      await page.fill('[data-testid="branch-2-message-1"]', 'データ更新');
      
      // 同じリソースアクセス設定
      await page.click('[data-testid="set-resource-access-2"]');
      await page.fill('[data-testid="resource-name-2"]', 'SharedDatabase');
      await page.selectOption('[data-testid="access-type-2"]', 'write');
      await page.fill('[data-testid="access-duration-2"]', '3秒');
      
      // 分岐3: 読み込みのみ（競合なし）
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', '読み込み分岐');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.selectOption('[data-testid="branch-3-actor-from-1"]', 'Reader');
      await page.selectOption('[data-testid="branch-3-actor-to-1"]', 'SharedResource');
      await page.fill('[data-testid="branch-3-message-1"]', 'データ読み込み');
      
      await page.click('[data-testid="set-resource-access-3"]');
      await page.fill('[data-testid="resource-name-3"]', 'SharedDatabase');
      await page.selectOption('[data-testid="access-type-3"]', 'read');
      await page.fill('[data-testid="access-duration-3"]', '1秒');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 競合検出結果の確認
      await expect(page.locator('[data-testid="race-condition-warning"]')).toBeVisible();
      
      const warningText = await page.textContent('[data-testid="race-condition-details"]');
      expect(warningText).toContain('書き込み競合が検出されました');
      expect(warningText).toContain('Process1 ⚔️ Process2');
      expect(warningText).toContain('SharedDatabase');
      
      // 解決策提案の確認
      await expect(page.locator('[data-testid="conflict-resolution-suggestions"]')).toBeVisible();
      const suggestions = await page.textContent('[data-testid="conflict-resolution-suggestions"]');
      expect(suggestions).toContain('排他制御');
      expect(suggestions).toContain('同期ポイント追加');
      expect(suggestions).toContain('アクセス順序制御');
      
      // PlantUMLコードに競合警告が含まれることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('note over: ⚠️ 競合検出: SharedDatabase への同時書き込み');
      expect(plantumlCode).toContain('Process1 -> SharedResource: データ書き込み');
      expect(plantumlCode).toContain('Process2 -> SharedResource: データ更新');
      expect(plantumlCode).toContain('Reader -> SharedResource: データ読み込み');
    });

    test('タイミング競合の検出と解決', async ({ page }) => {
      await page.check('[data-testid="enable-timing-analysis"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'タイミング競合分析');
      
      // 分岐1: 早い処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '高速処理分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'キャッシュアクセス');
      
      // 実行時間設定
      await page.click('[data-testid="set-execution-time-1"]');
      await page.fill('[data-testid="min-execution-time-1"]', '0.1秒');
      await page.fill('[data-testid="max-execution-time-1"]', '0.5秒');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-2"]', '結果通知');
      await page.fill('[data-testid="min-execution-time-1-2"]', '0.1秒');
      await page.fill('[data-testid="max-execution-time-1-2"]', '0.2秒');
      
      // 分岐2: 遅い処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '低速処理分岐');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', 'データベースクエリ');
      
      await page.click('[data-testid="set-execution-time-2"]');
      await page.fill('[data-testid="min-execution-time-2"]', '2秒');
      await page.fill('[data-testid="max-execution-time-2"]', '5秒');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-2"]', '結果通知');
      await page.fill('[data-testid="min-execution-time-2-2"]', '0.1秒');
      await page.fill('[data-testid="max-execution-time-2-2"]', '0.2秒');
      
      // 分岐3: 中間処理（タイミング依存）
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', 'タイミング依存分岐');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.fill('[data-testid="branch-3-message-1"]', '依存処理実行');
      
      // タイミング依存性を設定
      await page.click('[data-testid="set-timing-dependency-3"]');
      await page.check('[data-testid="depends-on-branch-1"]');
      await page.check('[data-testid="depends-on-branch-2"]');
      await page.selectOption('[data-testid="dependency-type-3"]', 'all-complete'); // 全完了待ち
      
      await page.click('[data-testid="save-parallel"]');
      
      // タイミング分析結果の確認
      await expect(page.locator('[data-testid="timing-analysis-results"]')).toBeVisible();
      
      const analysisResults = await page.textContent('[data-testid="timing-analysis-details"]');
      expect(analysisResults).toContain('実行時間の差: 最大4.9秒');
      expect(analysisResults).toContain('タイミング競合リスク: 中');
      expect(analysisResults).toContain('推奨対策: 明示的同期ポイント');
      
      // タイムライン視覚化が表示されることを確認
      await expect(page.locator('[data-testid="execution-timeline"]')).toBeVisible();
      
      // PlantUMLコードにタイミング情報が含まれることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('note right: 実行時間: 0.1-0.5秒');
      expect(plantumlCode).toContain('note right: 実行時間: 2-5秒');
      expect(plantumlCode).toContain('note over: タイミング依存: 全分岐完了待ち');
    });

    test('デッドロック検出とサイクル分析', async ({ page }) => {
      await page.check('[data-testid="enable-deadlock-detection"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'デッドロック検出テスト');
      
      // 分岐1: リソースA → リソースB の順でアクセス
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', 'プロセス1');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'リソースAをロック');
      await page.click('[data-testid="set-resource-lock-1-1"]');
      await page.fill('[data-testid="lock-resource-name-1-1"]', 'ResourceA');
      await page.selectOption('[data-testid="lock-type-1-1"]', 'exclusive');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-2"]', 'リソースBをロック');
      await page.click('[data-testid="set-resource-lock-1-2"]');
      await page.fill('[data-testid="lock-resource-name-1-2"]', 'ResourceB');
      await page.selectOption('[data-testid="lock-type-1-2"]', 'exclusive');
      
      // 分岐2: リソースB → リソースA の順でアクセス（デッドロック発生パターン）
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', 'プロセス2');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', 'リソースBをロック');
      await page.click('[data-testid="set-resource-lock-2-1"]');
      await page.fill('[data-testid="lock-resource-name-2-1"]', 'ResourceB');
      await page.selectOption('[data-testid="lock-type-2-1"]', 'exclusive');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-2"]', 'リソースAをロック');
      await page.click('[data-testid="set-resource-lock-2-2"]');
      await page.fill('[data-testid="lock-resource-name-2-2"]', 'ResourceA');
      await page.selectOption('[data-testid="lock-type-2-2"]', 'exclusive');
      
      await page.click('[data-testid="save-parallel"]');
      
      // デッドロック検出結果の確認
      await expect(page.locator('[data-testid="deadlock-warning"]')).toBeVisible();
      
      const deadlockAlert = await page.textContent('[data-testid="deadlock-details"]');
      expect(deadlockAlert).toContain('🔴 デッドロックが検出されました');
      expect(deadlockAlert).toContain('プロセス1 ⟷ プロセス2');
      expect(deadlockAlert).toContain('ResourceA ⟷ ResourceB');
      
      // サイクル分析結果の確認
      await expect(page.locator('[data-testid="cycle-analysis"]')).toBeVisible();
      const cycleInfo = await page.textContent('[data-testid="cycle-analysis"]');
      expect(cycleInfo).toContain('循環依存パターン');
      expect(cycleInfo).toContain('P1→RA→P2→RB→P1');
      
      // 解決策提案の確認
      await expect(page.locator('[data-testid="deadlock-solutions"]')).toBeVisible();
      const solutions = await page.textContent('[data-testid="deadlock-solutions"]');
      expect(solutions).toContain('リソースアクセス順序の統一');
      expect(solutions).toContain('タイムアウト設定');
      expect(solutions).toContain('ロック階層の導入');
      
      // PlantUMLコードにデッドロック警告が含まれることを確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('note over: 🔴 デッドロック検出');
      expect(plantumlCode).toContain('リソースAをロック');
      expect(plantumlCode).toContain('リソースBをロック');
      expect(plantumlCode).toContain('note right: 危険: 循環依存');
    });
  });

  test.describe('並行実行プレビュー機能テスト', () => {
    
    test('リアルタイム並行処理可視化', async ({ page }) => {
      // 並行実行プレビュー機能を有効化
      await page.check('[data-testid="enable-parallel-preview"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'リアルタイムプレビューテスト');
      
      // 分岐1: UI更新処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', 'UI更新分岐');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', 'ローディング表示');
      await page.fill('[data-testid="action-duration-1-1"]', '0.2秒');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-2"]', 'プログレスバー更新');
      await page.fill('[data-testid="action-duration-1-2"]', '2秒');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-3"]', '完了表示');
      await page.fill('[data-testid="action-duration-1-3"]', '0.1秒');
      
      // 分岐2: データ処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', 'データ処理分岐');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', 'データ取得');
      await page.fill('[data-testid="action-duration-2-1"]', '1秒');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-2"]', 'データ変換');
      await page.fill('[data-testid="action-duration-2-2"]', '0.8秒');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-3"]', 'データ保存');
      await page.fill('[data-testid="action-duration-2-3"]', '0.5秒');
      
      // 分岐3: ログ処理
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', 'ログ分岐');
      await page.click('[data-testid="add-branch-action-3"]');
      await page.fill('[data-testid="branch-3-message-1"]', 'ログ出力');
      await page.fill('[data-testid="action-duration-3-1"]', '0.1秒');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 並行実行プレビューを開始
      await page.click('[data-testid="start-parallel-preview"]');
      
      // プレビューパネルが表示されることを確認
      await expect(page.locator('[data-testid="parallel-execution-viewer"]')).toBeVisible();
      
      // タイムライン表示の確認
      await expect(page.locator('[data-testid="execution-timeline"]')).toBeVisible();
      
      // 各分岐の進行状況表示確認
      await expect(page.locator('[data-testid="branch-progress-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="branch-progress-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="branch-progress-3"]')).toBeVisible();
      
      // 実行時間スライダーで時点を変更
      await page.click('[data-testid="timeline-slider"]');
      await page.fill('[data-testid="timeline-position"]', '1.0'); // 1秒時点
      
      // 1秒時点での状態確認
      const state1s = await page.textContent('[data-testid="execution-state-1s"]');
      expect(state1s).toContain('UI更新分岐: プログレスバー更新中');
      expect(state1s).toContain('データ処理分岐: データ変換開始');
      expect(state1s).toContain('ログ分岐: 完了');
      
      // 最終状態まで実行
      await page.click('[data-testid="run-to-completion"]');
      
      // 完了状態の確認
      const finalState = await page.textContent('[data-testid="final-execution-state"]');
      expect(finalState).toContain('全分岐完了');
      expect(finalState).toContain('総実行時間: 2.2秒');
      
      // プレビュー結果統計
      const statistics = await page.textContent('[data-testid="execution-statistics"]');
      expect(statistics).toContain('並行効率: 90.9%'); // (2.2s / (0.3+2.3+0.1)s) * 100
      expect(statistics).toContain('ボトルネック: UI更新分岐');
    });

    test('同期ポイント可視化とインタラクティブ分析', async ({ page }) => {
      await page.check('[data-testid="enable-sync-visualization"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '同期ポイント可視化');
      
      // 分岐1
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', '分岐A');
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-1"]', '処理A1');
      await page.fill('[data-testid="action-duration-1-1"]', '1秒');
      
      // 同期ポイント1
      await page.click('[data-testid="add-sync-point-1"]');
      await page.fill('[data-testid="sync-name-1"]', '中間同期');
      
      await page.click('[data-testid="add-branch-action-1"]');
      await page.fill('[data-testid="branch-1-message-2"]', '処理A2');
      await page.fill('[data-testid="action-duration-1-2"]', '2秒');
      
      // 分岐2
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', '分岐B');
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-1"]', '処理B1');
      await page.fill('[data-testid="action-duration-2-1"]', '2秒');
      
      // 同じ同期ポイントを参照
      await page.click('[data-testid="reference-sync-point-2"]');
      await page.selectOption('[data-testid="sync-ref-2"]', '中間同期');
      
      await page.click('[data-testid="add-branch-action-2"]');
      await page.fill('[data-testid="branch-2-message-2"]', '処理B2');
      await page.fill('[data-testid="action-duration-2-2"]', '1秒');
      
      await page.click('[data-testid="save-parallel"]');
      
      // 同期ポイント可視化を開始
      await page.click('[data-testid="visualize-sync-points"]');
      
      // 同期ポイント分析結果
      await expect(page.locator('[data-testid="sync-analysis-panel"]')).toBeVisible();
      
      const syncAnalysis = await page.textContent('[data-testid="sync-analysis-results"]');
      expect(syncAnalysis).toContain('同期ポイント: 中間同期');
      expect(syncAnalysis).toContain('待機時間: 分岐A 1秒待機');
      expect(syncAnalysis).toContain('同期効率: 50%'); // 1秒待機 / 2秒処理
      
      // インタラクティブ同期ポイントクリック
      await page.click('[data-testid="sync-point-marker-中間同期"]');
      
      // 同期ポイント詳細情報
      const syncDetails = await page.textContent('[data-testid="sync-point-details"]');
      expect(syncDetails).toContain('参加分岐: 分岐A, 分岐B');
      expect(syncDetails).toContain('最速完了: 分岐A (1秒)');
      expect(syncDetails).toContain('最遅完了: 分岐B (2秒)');
      expect(syncDetails).toContain('推奨改善: 分岐Bの並列化');
      
      // 同期ポイント最適化提案
      await page.click('[data-testid="optimize-sync-point"]');
      
      const optimization = await page.textContent('[data-testid="optimization-suggestions"]');
      expect(optimization).toContain('分岐Bを2つに分割');
      expect(optimization).toContain('部分的同期ポイントの追加');
      expect(optimization).toContain('予想改善効果: 25%高速化');
    });

    test('パフォーマンス分析とボトルネック特定', async ({ page }) => {
      await page.check('[data-testid="enable-performance-analysis"]');
      
      // 複雑な並行処理シナリオを作成
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'パフォーマンス分析テスト');
      
      // CPU集約的分岐
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-1"]', 'CPU集約分岐');
      await page.click('[data-testid="set-resource-type-1"]');
      await page.selectOption('[data-testid="primary-resource-1"]', 'cpu');
      await page.fill('[data-testid="cpu-usage-1"]', '90%');
      
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="add-branch-action-1"]');
        await page.fill(`[data-testid="branch-1-message-${i}"]`, `CPU処理${i}`);
        await page.fill(`[data-testid="action-duration-1-${i}"]`, `${i}秒`);
      }
      
      // I/O集約的分岐
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-2"]', 'I/O集約分岐');
      await page.click('[data-testid="set-resource-type-2"]');
      await page.selectOption('[data-testid="primary-resource-2"]', 'io');
      await page.fill('[data-testid="io-wait-2"]', '70%');
      
      for (let i = 1; i <= 4; i++) {
        await page.click('[data-testid="add-branch-action-2"]');
        await page.fill(`[data-testid="branch-2-message-${i}"]`, `I/O処理${i}`);
        await page.fill(`[data-testid="action-duration-2-${i}"]`, `${i * 0.5}秒`);
      }
      
      // メモリ集約的分岐
      await page.click('[data-testid="add-parallel-branch"]');
      await page.fill('[data-testid="branch-name-3"]', 'メモリ集約分岐');
      await page.click('[data-testid="set-resource-type-3"]');
      await page.selectOption('[data-testid="primary-resource-3"]', 'memory');
      await page.fill('[data-testid="memory-usage-3"]', '2GB');
      
      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="add-branch-action-3"]');
        await page.fill(`[data-testid="branch-3-message-${i}"]`, `メモリ処理${i}`);
        await page.fill(`[data-testid="action-duration-3-${i}"]`, `${i * 1.5}秒`);
      }
      
      await page.click('[data-testid="save-parallel"]');
      
      // パフォーマンス分析実行
      await page.click('[data-testid="run-performance-analysis"]');
      
      // 分析結果の確認
      await expect(page.locator('[data-testid="performance-analysis-results"]')).toBeVisible();
      
      const performanceResults = await page.textContent('[data-testid="performance-summary"]');
      expect(performanceResults).toContain('総実行時間: 6秒');
      expect(performanceResults).toContain('並行効率: 50%');
      expect(performanceResults).toContain('主ボトルネック: CPU集約分岐');
      
      // リソース使用率グラフ
      await expect(page.locator('[data-testid="resource-usage-chart"]')).toBeVisible();
      
      // ボトルネック詳細分析
      await page.click('[data-testid="analyze-bottleneck"]');
      
      const bottleneckAnalysis = await page.textContent('[data-testid="bottleneck-details"]');
      expect(bottleneckAnalysis).toContain('CPU集約分岐が全体の80%の時間を占有');
      expect(bottleneckAnalysis).toContain('推奨対策: CPU処理の並列化');
      expect(bottleneckAnalysis).toContain('予想改善: 3秒 → 2秒 (33%向上)');
      
      // 最適化シミュレーション
      await page.click('[data-testid="simulate-optimization"]');
      
      const optimizationResults = await page.textContent('[data-testid="optimization-simulation"]');
      expect(optimizationResults).toContain('CPU処理分割後の予想実行時間');
      expect(optimizationResults).toContain('リソース競合の解消効果');
      expect(optimizationResults).toContain('総合パフォーマンス向上: 45%');
    });
  });

  test.describe('同期制御パフォーマンステスト', () => {
    
    test('大規模並行処理の同期制御性能', async ({ page }) => {
      const startTime = Date.now();
      
      await page.check('[data-testid="enable-large-scale-sync"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', '大規模同期制御テスト');
      
      // 50個の分岐を作成
      for (let i = 1; i <= 50; i++) {
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill(`[data-testid="branch-name-${i}"]`, `分岐${i}`);
        
        // 各分岐に5個のアクション
        for (let j = 1; j <= 5; j++) {
          await page.click(`[data-testid="add-branch-action-${i}"]`);
          await page.fill(`[data-testid="branch-${i}-message-${j}"]`, `処理${i}-${j}`);
          
          // 同期ポイントを設定（10個ごと）
          if (j === 3 && i % 10 === 0) {
            await page.click(`[data-testid="add-sync-point-${i}"]`);
            await page.fill(`[data-testid="sync-name-${i}"]`, `同期${Math.floor(i/10)}`);
          }
        }
        
        // 進捗報告（10個ごと）
        if (i % 10 === 0) {
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          console.log(`${i}分岐作成完了: ${elapsed}ms`);
        }
      }
      
      await page.click('[data-testid="save-parallel"]');
      
      const totalTime = Date.now() - startTime;
      console.log(`大規模並行処理作成時間: ${totalTime}ms`);
      
      // 作成時間が60秒以内であることを確認
      expect(totalTime).toBeLessThan(60000);
      
      // 同期制御システムの応答性テスト
      const syncStartTime = Date.now();
      
      await page.click('[data-testid="analyze-sync-complexity"]');
      
      const syncAnalysisTime = Date.now() - syncStartTime;
      console.log(`同期分析時間: ${syncAnalysisTime}ms`);
      
      // 同期分析が10秒以内で完了することを確認
      expect(syncAnalysisTime).toBeLessThan(10000);
      
      // 分析結果の確認
      const complexityResults = await page.textContent('[data-testid="sync-complexity-results"]');
      expect(complexityResults).toContain('分岐数: 50');
      expect(complexityResults).toContain('同期ポイント数: 5');
      expect(complexityResults).toContain('複雑度評価: 高');
      expect(complexityResults).toContain('推奨最適化: 階層的同期');
    });

    test('同期制御メモリ効率テスト', async ({ page }) => {
      // 初期メモリ使用量
      let initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      await page.check('[data-testid="enable-memory-efficient-sync"]');
      
      // 複雑な同期構造を持つ並行処理を作成
      for (let group = 1; group <= 10; group++) {
        await page.click('[data-testid="add-parallel"]');
        await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
        await page.fill('[data-testid="parallel-description"]', `同期グループ${group}`);
        
        // 各グループに10個の分岐
        for (let branch = 1; branch <= 10; branch++) {
          await page.click('[data-testid="add-parallel-branch"]');
          await page.fill(`[data-testid="branch-name-${branch}"]`, `G${group}B${branch}`);
          
          // 各分岐に3個のアクション
          for (let action = 1; action <= 3; action++) {
            await page.click(`[data-testid="add-branch-action-${branch}"]`);
            await page.fill(`[data-testid="branch-${branch}-message-${action}"]`, `G${group}B${branch}A${action}`);
            
            // 同期ポイント設定
            if (action === 2) {
              await page.click(`[data-testid="add-sync-point-${branch}"]`);
              await page.fill(`[data-testid="sync-name-${branch}"]`, `G${group}Sync${branch}`);
            }
          }
        }
        
        await page.click('[data-testid="save-parallel"]');
        
        // 5グループごとにメモリ使用量をチェック
        if (group % 5 === 0) {
          const currentMemory = await page.evaluate(() => {
            return performance.memory ? performance.memory.usedJSHeapSize : 0;
          });
          
          const memoryIncrease = currentMemory - initialMemory;
          const memoryPerGroup = memoryIncrease / group;
          
          console.log(`${group}グループ後メモリ増加: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
          console.log(`グループ平均メモリ: ${Math.round(memoryPerGroup / 1024)}KB`);
          
          // グループあたりのメモリ使用量が5MB以下であることを確認
          expect(memoryPerGroup).toBeLessThan(5 * 1024 * 1024);
        }
      }
      
      // 最終メモリ使用量
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      const totalMemoryIncrease = finalMemory - initialMemory;
      console.log(`総メモリ増加: ${Math.round(totalMemoryIncrease / 1024 / 1024)}MB`);
      
      // 総メモリ増加が100MB以下であることを確認
      expect(totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('同期制御レスポンス性能テスト', async ({ page }) => {
      await page.check('[data-testid="enable-responsive-sync"]');
      
      await page.click('[data-testid="add-parallel"]');
      await page.selectOption('[data-testid="parallel-type"]', 'fork-join');
      await page.fill('[data-testid="parallel-description"]', 'レスポンス性能テスト');
      
      // 20個の分岐を作成
      for (let i = 1; i <= 20; i++) {
        await page.click('[data-testid="add-parallel-branch"]');
        await page.fill(`[data-testid="branch-name-${i}"]`, `分岐${i}`);
        
        await page.click(`[data-testid="add-branch-action-${i}"]`);
        await page.fill(`[data-testid="branch-${i}-message-1"]`, `処理${i}`);
      }
      
      await page.click('[data-testid="save-parallel"]');
      
      // UI応答性テスト
      const uiResponses = [];
      
      for (let test = 1; test <= 20; test++) {
        const startTime = Date.now();
        
        // 同期ポイント追加
        await page.click(`[data-testid="add-sync-point-${test}"]`);
        await page.fill(`[data-testid="sync-name-${test}"]`, `動的同期${test}`);
        
        // UI更新待機
        await page.waitForFunction((testNum) => {
          const syncPoint = document.querySelector(`[data-testid="sync-point-${testNum}"]`);
          return syncPoint && syncPoint.offsetHeight > 0;
        }, test);
        
        const responseTime = Date.now() - startTime;
        uiResponses.push(responseTime);
        
        console.log(`同期ポイント${test}追加レスポンス: ${responseTime}ms`);
        
        // 個別レスポンス時間が500ms以下であることを確認
        expect(responseTime).toBeLessThan(500);
      }
      
      // 平均レスポンス時間の確認
      const avgResponse = uiResponses.reduce((sum, time) => sum + time, 0) / uiResponses.length;
      const maxResponse = Math.max(...uiResponses);
      
      console.log(`平均レスポンス時間: ${avgResponse}ms`);
      console.log(`最大レスポンス時間: ${maxResponse}ms`);
      
      expect(avgResponse).toBeLessThan(200);
      expect(maxResponse).toBeLessThan(500);
    });
  });
});