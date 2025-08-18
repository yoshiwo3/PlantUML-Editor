/**
 * Sprint4 基本変換フロー クリティカルパステスト
 * 設計書v4.0の7要素構成に基づく包括的テスト
 */

import { test, expect } from '@playwright/test';

test.describe('基本変換フロー - クリティカルパス (10件)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8086');
    
    // アプリケーション初期化待機
    await page.waitForSelector('[data-testid="plantuml-editor"]', { timeout: 10000 });
    
    // 初期状態確認
    const editorVisible = await page.isVisible('[data-testid="plantuml-editor"]');
    expect(editorVisible).toBeTruthy();
  });

  test('CP-001: 日本語テキスト → PlantUML変換（基本フロー）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: '最も基本的な変換フロー - 日本語からPlantUMLへの変換'
    });

    const japaneseInput = 'ユーザーがシステムにログインする';
    
    // 日本語テキスト入力
    await page.fill('[data-testid="japanese-input"]', japaneseInput);
    
    // リアルタイム変換待機
    await page.waitForTimeout(500);
    
    // PlantUML出力確認
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    // 基本構造検証
    expect(plantUMLOutput).toContain('@startuml');
    expect(plantUMLOutput).toContain('@enduml');
    expect(plantUMLOutput).toContain('ユーザー');
    expect(plantUMLOutput).toContain('システム');
    expect(plantUMLOutput).toContain('ログイン');
    
    // 矢印構文確認
    expect(plantUMLOutput).toMatch(/ユーザー\s*->\s*システム/);
    
    console.log('CP-001 変換結果:', plantUMLOutput);
  });

  test('CP-002: PlantUML編集 → プレビュー更新（双方向同期）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: 'PlantUMLコード直接編集による双方向同期テスト'
    });

    // 初期PlantUMLコード設定
    const initialCode = `@startuml
participant ユーザー
participant システム
ユーザー -> システム: ログイン要求
システム -> ユーザー: 認証結果
@enduml`;

    await page.fill('[data-testid="plantuml-code-editor"]', initialCode);
    
    // プレビュー更新待機
    await page.waitForTimeout(1000);
    
    // プレビューエリア確認
    const previewUpdated = await page.isVisible('[data-testid="plantuml-preview"]');
    expect(previewUpdated).toBeTruthy();
    
    // 日本語入力エリアの同期確認
    const japaneseText = await page.inputValue('[data-testid="japanese-input"]');
    expect(japaneseText).toContain('ログイン');
    expect(japaneseText).toContain('認証');
    
    console.log('CP-002 同期結果:', japaneseText);
  });

  test('CP-003: 条件分岐追加 → 構文生成（？ボタン活用）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: '設計書の？ボタン機能による条件分岐追加テスト'
    });

    // 基本フロー作成
    await page.fill('[data-testid="japanese-input"]', 'ユーザーがログインを試みる');
    await page.waitForTimeout(300);
    
    // アクション項目の？ボタンクリック（設計書仕様）
    const questionButton = page.locator('[data-testid="question-button"]').first();
    await questionButton.click();
    
    // 条件分岐モーダル表示確認
    await page.waitForSelector('[data-testid="condition-modal"]');
    
    // 条件設定
    await page.fill('[data-testid="condition-input"]', '認証が成功した場合');
    await page.click('[data-testid="condition-confirm"]');
    
    // 生成されたPlantUML確認
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    expect(plantUMLOutput).toContain('alt 認証が成功した場合');
    expect(plantUMLOutput).toContain('else');
    expect(plantUMLOutput).toContain('end');
    
    console.log('CP-003 条件分岐:', plantUMLOutput);
  });

  test('CP-004: ループ追加 → 構文生成（繰り返し処理）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: 'ループブロック機能による繰り返し処理構文生成'
    });

    // ループ要素追加
    await page.click('[data-testid="add-loop-button"]');
    
    // ループ条件設定
    await page.fill('[data-testid="loop-condition"]', 'データが存在する間');
    
    // ループ内処理追加
    await page.fill('[data-testid="loop-content"]', 'データを処理する');
    
    // 確定
    await page.click('[data-testid="loop-confirm"]');
    
    // 生成構文確認
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    expect(plantUMLOutput).toContain('loop データが存在する間');
    expect(plantUMLOutput).toContain('データを処理');
    expect(plantUMLOutput).toContain('end');
    
    console.log('CP-004 ループ構文:', plantUMLOutput);
  });

  test('CP-005: 並行処理追加 → 構文生成（スレッドタブ）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: '設計書のスレッドタブ機能による並行処理構文生成'
    });

    // 並行処理ブロック追加
    await page.click('[data-testid="add-parallel-button"]');
    
    // スレッド1設定
    await page.click('[data-testid="thread-tab-1"]');
    await page.fill('[data-testid="thread-content-1"]', 'メール送信処理');
    
    // スレッド2追加
    await page.click('[data-testid="add-thread-button"]');
    await page.fill('[data-testid="thread-content-2"]', 'ログ記録処理');
    
    // 確定
    await page.click('[data-testid="parallel-confirm"]');
    
    // 生成構文確認
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    expect(plantUMLOutput).toContain('par');
    expect(plantUMLOutput).toContain('and');
    expect(plantUMLOutput).toContain('end');
    expect(plantUMLOutput).toContain('メール送信');
    expect(plantUMLOutput).toContain('ログ記録');
    
    console.log('CP-005 並行処理:', plantUMLOutput);
  });

  test('CP-006: アクター追加・編集（7要素構成）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: '設計書の7要素構成によるアクター管理テスト'
    });

    // アクション項目要素確認
    const actionItem = page.locator('[data-testid="action-item"]').first();
    
    // 1. ドラッグハンドル（☰）確認
    const dragHandle = actionItem.locator('[data-testid="drag-handle"]');
    await expect(dragHandle).toContainText('☰');
    
    // 2. FROM アクター選択
    const actorFrom = actionItem.locator('[data-testid="actor-from"]');
    await actorFrom.selectOption('ユーザー');
    
    // 3. 矢印タイプ選択
    const arrowType = actionItem.locator('[data-testid="arrow-type"]');
    await arrowType.selectOption('->');
    
    // 4. TO アクター選択
    const actorTo = actionItem.locator('[data-testid="actor-to"]');
    await actorTo.selectOption('システム');
    
    // 5. メッセージ入力
    const messageInput = actionItem.locator('[data-testid="message-input"]');
    await messageInput.fill('ログイン要求');
    
    // 6. 削除ボタン存在確認
    const deleteButton = actionItem.locator('[data-testid="delete-button"]');
    await expect(deleteButton).toBeVisible();
    
    // 7. ？ボタン存在確認
    const questionButton = actionItem.locator('[data-testid="question-button"]');
    await expect(questionButton).toBeVisible();
    await expect(questionButton).toContainText('？');
    
    // 生成結果確認
    await page.waitForTimeout(500);
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('ユーザー -> システム: ログイン要求');
    
    console.log('CP-006 7要素確認完了');
  });

  test('CP-007: メッセージ編集（日本語）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: '日本語メッセージの編集・更新テスト'
    });

    // 基本メッセージ設定
    await page.fill('[data-testid="message-input"]', '初期メッセージ');
    await page.waitForTimeout(200);
    
    // 複雑な日本語メッセージに変更
    const complexMessage = 'システム認証情報を確認し、ユーザー権限を検証する処理';
    await page.fill('[data-testid="message-input"]', complexMessage);
    
    // リアルタイム更新確認
    await page.waitForTimeout(300);
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    expect(plantUMLOutput).toContain(complexMessage);
    expect(plantUMLOutput).toContain('認証情報');
    expect(plantUMLOutput).toContain('権限');
    expect(plantUMLOutput).toContain('検証');
    
    // 特殊文字処理確認
    const specialMessage = 'データ処理（成功・失敗）結果：100%完了';
    await page.fill('[data-testid="message-input"]', specialMessage);
    await page.waitForTimeout(200);
    
    const updatedOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(updatedOutput).toContain('100%完了');
    
    console.log('CP-007 日本語編集:', updatedOutput);
  });

  test('CP-008: 矢印タイプ変更（同期・非同期）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: '矢印タイプ変更による同期・非同期表現テスト'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    
    // 基本設定
    await actionItem.locator('[data-testid="actor-from"]').selectOption('クライアント');
    await actionItem.locator('[data-testid="actor-to"]').selectOption('サーバー');
    await actionItem.locator('[data-testid="message-input"]').fill('API呼び出し');
    
    // 同期矢印 (->)
    await actionItem.locator('[data-testid="arrow-type"]').selectOption('->');
    await page.waitForTimeout(200);
    let plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('クライアント -> サーバー');
    
    // 非同期矢印 (->>)
    await actionItem.locator('[data-testid="arrow-type"]').selectOption('->>');
    await page.waitForTimeout(200);
    plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('クライアント ->> サーバー');
    
    // 戻り矢印 (-->)
    await actionItem.locator('[data-testid="arrow-type"]').selectOption('-->');
    await page.waitForTimeout(200);
    plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('クライアント --> サーバー');
    
    // 非同期戻り矢印 (<<--)
    await actionItem.locator('[data-testid="arrow-type"]').selectOption('<<--');
    await page.waitForTimeout(200);
    plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('クライアント <<-- サーバー');
    
    console.log('CP-008 矢印変更完了');
  });

  test('CP-009: ドラッグ&ドロップ順序変更', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: 'ドラッグハンドルによるアクション順序変更テスト'
    });

    // 複数アクション作成
    await page.click('[data-testid="add-action-button"]');
    await page.click('[data-testid="add-action-button"]');
    
    // 1番目のアクション設定
    const firstAction = page.locator('[data-testid="action-item"]').nth(0);
    await firstAction.locator('[data-testid="message-input"]').fill('第1のアクション');
    
    // 2番目のアクション設定
    const secondAction = page.locator('[data-testid="action-item"]').nth(1);
    await secondAction.locator('[data-testid="message-input"]').fill('第2のアクション');
    
    // 3番目のアクション設定
    const thirdAction = page.locator('[data-testid="action-item"]').nth(2);
    await thirdAction.locator('[data-testid="message-input"]').fill('第3のアクション');
    
    await page.waitForTimeout(500);
    
    // 初期順序確認
    let plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    const initialOrder = [
      plantUMLOutput.indexOf('第1のアクション'),
      plantUMLOutput.indexOf('第2のアクション'),
      plantUMLOutput.indexOf('第3のアクション')
    ];
    
    expect(initialOrder[0]).toBeLessThan(initialOrder[1]);
    expect(initialOrder[1]).toBeLessThan(initialOrder[2]);
    
    // ドラッグ&ドロップ実行（3番目を1番目へ）
    const thirdDragHandle = thirdAction.locator('[data-testid="drag-handle"]');
    const firstDragHandle = firstAction.locator('[data-testid="drag-handle"]');
    
    await thirdDragHandle.dragTo(firstDragHandle);
    await page.waitForTimeout(500);
    
    // 順序変更後確認
    plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    const newOrder = [
      plantUMLOutput.indexOf('第3のアクション'),
      plantUMLOutput.indexOf('第1のアクション'),
      plantUMLOutput.indexOf('第2のアクション')
    ];
    
    expect(newOrder[0]).toBeLessThan(newOrder[1]);
    expect(newOrder[1]).toBeLessThan(newOrder[2]);
    
    console.log('CP-009 順序変更成功');
  });

  test('CP-010: ？ボタン条件付与（アクティブ状態）', async ({ page }) => {
    test.info().annotations.push({
      type: 'critical-path',
      description: '設計書の？ボタン機能による条件付与とアクティブ状態管理'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    const questionButton = actionItem.locator('[data-testid="question-button"]');
    
    // 初期状態確認（normal）
    await expect(questionButton).toHaveCSS('background-color', 'transparent');
    
    // ？ボタンクリック（アクティブ化）
    await questionButton.click();
    
    // アクティブ状態確認
    await expect(questionButton).toHaveCSS('background-color', '#ff9800');
    await expect(questionButton).toHaveCSS('color', 'white');
    
    // 条件モーダル表示確認
    await page.waitForSelector('[data-testid="condition-modal"]');
    
    // 条件設定
    const conditionInput = page.locator('[data-testid="condition-input"]');
    await conditionInput.fill('ユーザーが管理者権限を持つ場合');
    
    // 条件確定
    await page.click('[data-testid="condition-confirm"]');
    
    // PlantUML生成確認
    await page.waitForTimeout(300);
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    expect(plantUMLOutput).toContain('alt ユーザーが管理者権限を持つ場合');
    expect(plantUMLOutput).toContain('else');
    expect(plantUMLOutput).toContain('end');
    
    // ？ボタンの状態がアクティブのまま維持されることを確認
    await expect(questionButton).toHaveCSS('background-color', '#ff9800');
    
    // 再度クリックで非アクティブ化
    await questionButton.click();
    await expect(questionButton).toHaveCSS('background-color', 'transparent');
    
    console.log('CP-010 ？ボタン機能完了:', plantUMLOutput);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // テスト失敗時のスクリーンショット
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot();
      await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
      
      // PlantUML出力の保存
      try {
        const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
        await testInfo.attach('plantuml-output', { 
          body: plantUMLOutput, 
          contentType: 'text/plain' 
        });
      } catch (error) {
        console.log('PlantUML output capture failed:', error.message);
      }
    }
  });
});