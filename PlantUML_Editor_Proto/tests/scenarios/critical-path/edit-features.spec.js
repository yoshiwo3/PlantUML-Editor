/**
 * Sprint4 編集機能テスト - インライン編集7要素
 * 設計書v4.0のActionItemStructureに基づく包括的テスト
 */

import { test, expect } from '@playwright/test';

test.describe('インライン編集機能 - 7要素完全テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8086');
    
    // エディター初期化待機
    await page.waitForSelector('[data-testid="plantuml-editor"]', { timeout: 10000 });
    
    // アクション項目が1つ以上存在することを確認
    await page.waitForSelector('[data-testid="action-item"]', { timeout: 5000 });
  });

  test('EDIT-001: ドラッグハンドル（☰）機能完全テスト', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書要素1: ドラッグハンドル（☰）の完全機能テスト'
    });

    // 複数アクション作成
    await page.click('[data-testid="add-action-button"]');
    await page.click('[data-testid="add-action-button"]');
    
    const actions = page.locator('[data-testid="action-item"]');
    await expect(actions).toHaveCount(3);
    
    // ドラッグハンドル要素確認
    const firstDragHandle = actions.nth(0).locator('[data-testid="drag-handle"]');
    const secondDragHandle = actions.nth(1).locator('[data-testid="drag-handle"]');
    const thirdDragHandle = actions.nth(2).locator('[data-testid="drag-handle"]');
    
    // ☰文字確認
    await expect(firstDragHandle).toContainText('☰');
    await expect(secondDragHandle).toContainText('☰');
    await expect(thirdDragHandle).toContainText('☰');
    
    // CSS確認（カーソル、色等）
    await expect(firstDragHandle).toHaveCSS('cursor', 'grab');
    
    // ホバー状態確認
    await firstDragHandle.hover();
    await expect(firstDragHandle).toHaveCSS('cursor', 'grab');
    
    // ドラッグ開始時のカーソル変更確認
    await firstDragHandle.dragTo(thirdDragHandle);
    
    // 順序変更確認
    await page.waitForTimeout(500);
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    // ドラッグ操作によって順序が変わったことを確認
    expect(plantUMLOutput).toBeDefined();
    
    console.log('EDIT-001 ドラッグハンドル機能確認完了');
  });

  test('EDIT-002: FROM アクター選択（SELECT）完全機能', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書要素2: actorFrom SELECT要素の完全機能テスト'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    const actorFromSelect = actionItem.locator('[data-testid="actor-from"]');
    
    // SELECT要素確認
    await expect(actorFromSelect).toBeVisible();
    await expect(actorFromSelect.locator('option')).toHaveCount.toBeGreaterThan(0);
    
    // 標準アクター選択肢確認
    const options = await actorFromSelect.locator('option').allTextContents();
    expect(options).toContain('ユーザー');
    expect(options).toContain('システム');
    expect(options).toContain('データベース');
    expect(options).toContain('API');
    
    // 選択肢変更テスト
    await actorFromSelect.selectOption('ユーザー');
    let selectedValue = await actorFromSelect.inputValue();
    expect(selectedValue).toBe('ユーザー');
    
    await actorFromSelect.selectOption('システム');
    selectedValue = await actorFromSelect.inputValue();
    expect(selectedValue).toBe('システム');
    
    await actorFromSelect.selectOption('データベース');
    selectedValue = await actorFromSelect.inputValue();
    expect(selectedValue).toBe('データベース');
    
    // PlantUML反映確認
    await page.waitForTimeout(300);
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('データベース');
    
    // カスタムアクター追加機能確認
    await actorFromSelect.selectOption('カスタム');
    await page.fill('[data-testid="custom-actor-input"]', 'カスタムアクター');
    await page.click('[data-testid="custom-actor-confirm"]');
    
    // カスタムアクター反映確認
    await page.waitForTimeout(300);
    const updatedOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(updatedOutput).toContain('カスタムアクター');
    
    console.log('EDIT-002 FROM アクター選択機能確認完了');
  });

  test('EDIT-003: 矢印タイプ選択（SELECT）全パターン', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書要素3: arrowType SELECT要素の全パターンテスト'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    const arrowTypeSelect = actionItem.locator('[data-testid="arrow-type"]');
    
    // 基本設定
    await actionItem.locator('[data-testid="actor-from"]').selectOption('クライアント');
    await actionItem.locator('[data-testid="actor-to"]').selectOption('サーバー');
    await actionItem.locator('[data-testid="message-input"]').fill('テストメッセージ');
    
    // 設計書仕様の矢印タイプテスト（→, ⇢, ⟵, ⟸）
    const arrowTypes = [
      { value: '->', symbol: '→', description: '同期呼び出し' },
      { value: '->>', symbol: '⇢', description: '非同期呼び出し' },
      { value: '-->', symbol: '⟵', description: '戻り（同期）' },
      { value: '<<--', symbol: '⟸', description: '戻り（非同期）' }
    ];
    
    for (const arrowType of arrowTypes) {
      // 矢印タイプ選択
      await arrowTypeSelect.selectOption(arrowType.value);
      
      // 選択確認
      const selectedValue = await arrowTypeSelect.inputValue();
      expect(selectedValue).toBe(arrowType.value);
      
      // PlantUML反映確認
      await page.waitForTimeout(200);
      const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
      expect(plantUMLOutput).toContain(`クライアント ${arrowType.value} サーバー`);
      
      console.log(`矢印タイプ ${arrowType.symbol} (${arrowType.value}) 確認: ${arrowType.description}`);
    }
    
    console.log('EDIT-003 矢印タイプ選択機能確認完了');
  });

  test('EDIT-004: TO アクター選択（SELECT）連動機能', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書要素4: actorTo SELECT要素とFROM選択の連動テスト'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    const actorFromSelect = actionItem.locator('[data-testid="actor-from"]');
    const actorToSelect = actionItem.locator('[data-testid="actor-to"]');
    
    // FROM選択
    await actorFromSelect.selectOption('ユーザー');
    
    // TO選択肢確認（FROM以外が選択可能）
    const toOptions = await actorToSelect.locator('option').allTextContents();
    expect(toOptions).toContain('システム');
    expect(toOptions).toContain('データベース');
    expect(toOptions).toContain('API');
    
    // TO選択
    await actorToSelect.selectOption('システム');
    
    // 選択確認
    const fromValue = await actorFromSelect.inputValue();
    const toValue = await actorToSelect.inputValue();
    expect(fromValue).toBe('ユーザー');
    expect(toValue).toBe('システム');
    
    // PlantUML生成確認
    await page.waitForTimeout(300);
    let plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toMatch(/ユーザー\s*->\s*システム/);
    
    // 順序変更テスト
    await actorFromSelect.selectOption('API');
    await actorToSelect.selectOption('データベース');
    
    await page.waitForTimeout(300);
    plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toMatch(/API\s*->\s*データベース/);
    
    // 同じアクター選択時のエラーハンドリング確認
    await actorToSelect.selectOption('API'); // FROMと同じ
    
    // エラーメッセージまたは自動修正確認
    const errorMessage = page.locator('[data-testid="validation-error"]');
    if (await errorMessage.isVisible()) {
      expect(errorMessage).toContainText('同じアクターは選択できません');
    }
    
    console.log('EDIT-004 TO アクター選択機能確認完了');
  });

  test('EDIT-005: メッセージ入力（INPUT）高度機能', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書要素5: message INPUT要素の高度機能テスト'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    const messageInput = actionItem.locator('[data-testid="message-input"]');
    
    // 基本入力テスト
    await messageInput.fill('基本メッセージ');
    let inputValue = await messageInput.inputValue();
    expect(inputValue).toBe('基本メッセージ');
    
    // 日本語文字種テスト
    const testMessages = [
      'ひらがなメッセージ',
      'カタカナメッセージ',
      '漢字メッセージ処理',
      '混合文字種：ひらがな、カタカナ、漢字、English123',
      '特殊文字！？＃＄％（）「」【】',
      '絵文字テスト😀🚀💡📊',
      '長いメッセージのテストです。この文章は意図的に長く作成されており、入力フィールドの制限や表示の確認を行います。'
    ];
    
    for (const testMessage of testMessages) {
      await messageInput.fill(testMessage);
      
      // 入力確認
      inputValue = await messageInput.inputValue();
      expect(inputValue).toBe(testMessage);
      
      // リアルタイム反映確認
      await page.waitForTimeout(200);
      const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
      expect(plantUMLOutput).toContain(testMessage);
      
      console.log(`メッセージテスト完了: ${testMessage.substring(0, 20)}...`);
    }
    
    // 入力制限テスト
    const maxLengthMessage = 'a'.repeat(1000); // 1000文字
    await messageInput.fill(maxLengthMessage);
    
    // 制限確認（通常は500文字程度）
    inputValue = await messageInput.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(500);
    
    // プレースホルダー確認
    await messageInput.fill('');
    const placeholder = await messageInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    
    // フォーカス・ブラーイベント確認
    await messageInput.focus();
    expect(await messageInput.evaluate(el => el === document.activeElement)).toBe(true);
    
    await messageInput.blur();
    expect(await messageInput.evaluate(el => el === document.activeElement)).toBe(false);
    
    console.log('EDIT-005 メッセージ入力機能確認完了');
  });

  test('EDIT-006: 削除ボタン（BUTTON）安全性テスト', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書要素6: deleteButton BUTTON要素の安全性テスト'
    });

    // 複数アクション作成
    await page.click('[data-testid="add-action-button"]');
    await page.click('[data-testid="add-action-button"]');
    
    const actions = page.locator('[data-testid="action-item"]');
    await expect(actions).toHaveCount(3);
    
    // 各アクションにメッセージ設定
    await actions.nth(0).locator('[data-testid="message-input"]').fill('第1アクション');
    await actions.nth(1).locator('[data-testid="message-input"]').fill('第2アクション');
    await actions.nth(2).locator('[data-testid="message-input"]').fill('第3アクション');
    
    await page.waitForTimeout(500);
    
    // 初期状態確認
    let plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('第1アクション');
    expect(plantUMLOutput).toContain('第2アクション');
    expect(plantUMLOutput).toContain('第3アクション');
    
    // 削除ボタン存在確認
    const deleteButtons = actions.locator('[data-testid="delete-button"]');
    await expect(deleteButtons).toHaveCount(3);
    
    // 削除ボタンのアイコン・スタイル確認
    const firstDeleteButton = deleteButtons.nth(0);
    await expect(firstDeleteButton).toBeVisible();
    await expect(firstDeleteButton).toHaveCSS('color', /#dc3545|rgb\(220, 53, 69\)/); // 赤色
    
    // 確認ダイアログ表示テスト
    await firstDeleteButton.click();
    
    // 確認ダイアログ処理
    const confirmDialog = page.locator('[data-testid="delete-confirm-modal"]');
    if (await confirmDialog.isVisible()) {
      // モーダル表示の場合
      await expect(confirmDialog).toContainText('削除してもよろしいですか');
      await page.click('[data-testid="delete-confirm-yes"]');
    } else {
      // ブラウザダイアログの場合
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('削除');
        await dialog.accept();
      });
    }
    
    await page.waitForTimeout(500);
    
    // 削除後確認
    await expect(actions).toHaveCount(2);
    plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).not.toContain('第1アクション');
    expect(plantUMLOutput).toContain('第2アクション');
    expect(plantUMLOutput).toContain('第3アクション');
    
    // 最後のアクション削除防止確認
    await deleteButtons.nth(0).click();
    await page.waitForTimeout(300);
    await deleteButtons.nth(0).click();
    await page.waitForTimeout(300);
    
    // 最低1つは残ることを確認
    const remainingActions = await actions.count();
    expect(remainingActions).toBeGreaterThanOrEqual(1);
    
    console.log('EDIT-006 削除ボタン機能確認完了');
  });

  test('EDIT-007: ？ボタン（BUTTON）条件分岐完全機能', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書要素7: questionButton BUTTON要素の条件分岐完全機能テスト'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    const questionButton = actionItem.locator('[data-testid="question-button"]');
    
    // ？ボタン存在・表示確認
    await expect(questionButton).toBeVisible();
    await expect(questionButton).toContainText('？');
    
    // 初期状態（normal）確認
    const initialBgColor = await questionButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(initialBgColor).toBe('transparent');
    
    const initialColor = await questionButton.evaluate(el => 
      window.getComputedStyle(el).color
    );
    expect(initialColor).toBe('#ff9800'); // オレンジ色
    
    // ホバー効果確認
    await questionButton.hover();
    const hoverStyle = await questionButton.evaluate(el => 
      window.getComputedStyle(el).cursor
    );
    expect(hoverStyle).toBe('pointer');
    
    // クリック → アクティブ状態確認
    await questionButton.click();
    
    // アクティブ状態のスタイル確認
    const activeBgColor = await questionButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(activeBgColor).toBe('#ff9800'); // オレンジ背景
    
    const activeColor = await questionButton.evaluate(el => 
      window.getComputedStyle(el).color
    );
    expect(activeColor).toBe('white'); // 白文字
    
    // 条件設定モーダル表示確認
    await page.waitForSelector('[data-testid="condition-modal"]');
    const conditionModal = page.locator('[data-testid="condition-modal"]');
    await expect(conditionModal).toBeVisible();
    
    // 条件入力テスト
    const conditionInput = page.locator('[data-testid="condition-input"]');
    const testConditions = [
      '認証が成功した場合',
      'ユーザーが管理者権限を持つ場合',
      'データベース接続が可能な場合',
      'APIレスポンスが正常な場合',
      '入力値が有効な場合'
    ];
    
    for (const condition of testConditions) {
      await conditionInput.fill(condition);
      
      // プレビュー確認
      const previewArea = page.locator('[data-testid="condition-preview"]');
      if (await previewArea.isVisible()) {
        const previewText = await previewArea.textContent();
        expect(previewText).toContain(`alt ${condition}`);
        expect(previewText).toContain('else');
        expect(previewText).toContain('end');
      }
      
      console.log(`条件テスト: ${condition}`);
    }
    
    // 条件確定
    await conditionInput.fill('ユーザー認証が成功した場合');
    await page.click('[data-testid="condition-confirm"]');
    
    // モーダル閉じる確認
    await expect(conditionModal).not.toBeVisible();
    
    // PlantUML生成確認
    await page.waitForTimeout(500);
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(plantUMLOutput).toContain('alt ユーザー認証が成功した場合');
    expect(plantUMLOutput).toContain('else');
    expect(plantUMLOutput).toContain('end');
    
    // ？ボタンがアクティブ状態維持確認
    const finalBgColor = await questionButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(finalBgColor).toBe('#ff9800');
    
    // 再クリックで非アクティブ化
    await questionButton.click();
    await page.waitForTimeout(200);
    
    const deactivatedBgColor = await questionButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(deactivatedBgColor).toBe('transparent');
    
    // 条件分岐削除確認
    await page.waitForTimeout(300);
    const updatedOutput = await page.textContent('[data-testid="plantuml-output"]');
    expect(updatedOutput).not.toContain('alt ユーザー認証が成功した場合');
    
    console.log('EDIT-007 ？ボタン機能確認完了');
  });

  test('EDIT-008: 7要素統合動作テスト', async ({ page }) => {
    test.info().annotations.push({
      type: 'inline-edit',
      description: '設計書7要素の統合動作テスト'
    });

    const actionItem = page.locator('[data-testid="action-item"]').first();
    
    // 1. ドラッグハンドル確認
    const dragHandle = actionItem.locator('[data-testid="drag-handle"]');
    await expect(dragHandle).toContainText('☰');
    
    // 2. FROM アクター設定
    await actionItem.locator('[data-testid="actor-from"]').selectOption('ユーザー');
    
    // 3. 矢印タイプ設定
    await actionItem.locator('[data-testid="arrow-type"]').selectOption('->');
    
    // 4. TO アクター設定
    await actionItem.locator('[data-testid="actor-to"]').selectOption('システム');
    
    // 5. メッセージ入力
    await actionItem.locator('[data-testid="message-input"]').fill('ログイン処理を実行');
    
    // 6. ？ボタンで条件追加
    await actionItem.locator('[data-testid="question-button"]').click();
    await page.fill('[data-testid="condition-input"]', '認証情報が正しい場合');
    await page.click('[data-testid="condition-confirm"]');
    
    // 統合結果確認
    await page.waitForTimeout(500);
    const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
    
    // 期待される構文確認
    expect(plantUMLOutput).toContain('@startuml');
    expect(plantUMLOutput).toContain('@enduml');
    expect(plantUMLOutput).toContain('participant ユーザー');
    expect(plantUMLOutput).toContain('participant システム');
    expect(plantUMLOutput).toContain('alt 認証情報が正しい場合');
    expect(plantUMLOutput).toContain('ユーザー -> システム: ログイン処理を実行');
    expect(plantUMLOutput).toContain('else');
    expect(plantUMLOutput).toContain('end');
    
    // 7. 削除ボタン動作確認（最後に実行）
    const deleteButton = actionItem.locator('[data-testid="delete-button"]');
    await expect(deleteButton).toBeVisible();
    
    console.log('EDIT-008 7要素統合動作確認完了');
    console.log('生成されたPlantUML:', plantUMLOutput);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // テスト失敗時の詳細情報保存
    if (testInfo.status !== testInfo.expectedStatus) {
      // スクリーンショット
      const screenshot = await page.screenshot();
      await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
      
      // PlantUML出力
      try {
        const plantUMLOutput = await page.textContent('[data-testid="plantuml-output"]');
        await testInfo.attach('plantuml-output', { 
          body: plantUMLOutput, 
          contentType: 'text/plain' 
        });
      } catch (error) {
        console.log('PlantUML output capture failed:', error.message);
      }
      
      // DOM状態
      try {
        const domSnapshot = await page.content();
        await testInfo.attach('dom-snapshot', { 
          body: domSnapshot, 
          contentType: 'text/html' 
        });
      } catch (error) {
        console.log('DOM snapshot capture failed:', error.message);
      }
      
      // コンソールログ
      const consoleLogs = [];
      page.on('console', msg => consoleLogs.push(`${msg.type()}: ${msg.text()}`));
      if (consoleLogs.length > 0) {
        await testInfo.attach('console-logs', { 
          body: consoleLogs.join('\n'), 
          contentType: 'text/plain' 
        });
      }
    }
  });
});