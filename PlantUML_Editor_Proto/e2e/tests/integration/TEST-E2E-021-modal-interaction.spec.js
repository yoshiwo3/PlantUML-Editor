// TEST-E2E-021: モーダル連携テスト（3 SP）
// Modal lifecycle management, Parent-child communication, Overlay interaction
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-021: モーダル連携テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // モーダルマネージャーの初期化を待機
    await page.waitForFunction(() => {
      return window.ModalManager && 
             window.EditModalManager && 
             window.AccessibilityManager;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('モーダルライフサイクル管理テスト', async () => {
    test.setTimeout(60000);

    // 1. モーダル開封前の状態確認
    const initialModalState = await page.evaluate(() => {
      return window.ModalManager.getActiveModals();
    });

    expect(initialModalState.length).toBe(0);

    // 2. ActionEditorモーダルを開く
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    // モーダルが正しく表示されていることを確認
    const actionModalVisible = await page.isVisible('[data-testid="action-editor-modal"]');
    expect(actionModalVisible).toBe(true);

    // アクティブモーダルリストの確認
    const activeModalsAfterOpen = await page.evaluate(() => {
      return window.ModalManager.getActiveModals();
    });

    expect(activeModalsAfterOpen.length).toBe(1);
    expect(activeModalsAfterOpen[0]).toEqual(
      expect.objectContaining({
        id: expect.stringContaining('action-editor'),
        type: 'editor',
        zIndex: expect.any(Number)
      })
    );

    // 3. ConditionEditorモーダルを重ねて開く
    await page.click('[data-testid="condition-editor-btn"]');
    await page.waitForSelector('[data-testid="condition-editor-modal"]', { state: 'visible' });

    const bothModalsVisible = await page.evaluate(() => {
      return {
        action: window.getComputedStyle(document.querySelector('[data-testid="action-editor-modal"]')).display !== 'none',
        condition: window.getComputedStyle(document.querySelector('[data-testid="condition-editor-modal"]')).display !== 'none'
      };
    });

    expect(bothModalsVisible.action).toBe(true);
    expect(bothModalsVisible.condition).toBe(true);

    // 4. Z-indexの確認（後から開いたモーダルが上に表示されること）
    const zIndexes = await page.evaluate(() => {
      return {
        action: parseInt(window.getComputedStyle(document.querySelector('[data-testid="action-editor-modal"]')).zIndex),
        condition: parseInt(window.getComputedStyle(document.querySelector('[data-testid="condition-editor-modal"]')).zIndex)
      };
    });

    expect(zIndexes.condition).toBeGreaterThan(zIndexes.action);

    // 5. モーダルを順次閉じる
    await page.click('[data-testid="condition-editor-close"]');
    await page.waitForSelector('[data-testid="condition-editor-modal"]', { state: 'hidden' });

    const afterConditionClose = await page.evaluate(() => {
      return window.ModalManager.getActiveModals();
    });

    expect(afterConditionClose.length).toBe(1);

    await page.click('[data-testid="action-editor-close"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'hidden' });

    const afterAllClose = await page.evaluate(() => {
      return window.ModalManager.getActiveModals();
    });

    expect(afterAllClose.length).toBe(0);

    // 6. ライフサイクルイベントの確認
    const lifecycleEvents = await page.evaluate(() => {
      return window.ModalManager.getLifecycleEvents();
    });

    expect(lifecycleEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'modal_opened', modalId: expect.stringContaining('action-editor') }),
        expect.objectContaining({ type: 'modal_opened', modalId: expect.stringContaining('condition-editor') }),
        expect.objectContaining({ type: 'modal_closed', modalId: expect.stringContaining('condition-editor') }),
        expect.objectContaining({ type: 'modal_closed', modalId: expect.stringContaining('action-editor') })
      ])
    );
  });

  test('親子モーダル通信テスト', async () => {
    test.setTimeout(60000);

    // 1. 親モーダル（ActionEditor）を開く
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    // 2. 親モーダルでデータを入力
    await page.fill('[data-testid="action-from-input"]', 'Parent');
    await page.fill('[data-testid="action-to-input"]', 'Child');
    await page.fill('[data-testid="action-message-input"]', 'Parent to Child Message');

    // 3. 子モーダル（詳細設定モーダル）を開く
    await page.click('[data-testid="action-advanced-settings-btn"]');
    await page.waitForSelector('[data-testid="action-advanced-modal"]', { state: 'visible' });

    // 4. 親モーダルのデータが子モーダルに正しく渡されているか確認
    const childModalData = await page.evaluate(() => {
      return window.EditModalManager.getChildModalData('action-advanced');
    });

    expect(childModalData).toEqual(
      expect.objectContaining({
        parentData: expect.objectContaining({
          from: 'Parent',
          to: 'Child',
          message: 'Parent to Child Message'
        })
      })
    );

    // 5. 子モーダルで設定を変更
    await page.click('[data-testid="action-async-checkbox"]');
    await page.selectOption('[data-testid="action-priority-select"]', 'high');
    await page.fill('[data-testid="action-timeout-input"]', '5000');

    // 6. 子モーダルの変更を適用
    await page.click('[data-testid="action-advanced-apply-btn"]');
    await page.waitForSelector('[data-testid="action-advanced-modal"]', { state: 'hidden' });

    // 7. 親モーダルに変更が反映されているか確認
    const parentModalData = await page.evaluate(() => {
      return window.EditModalManager.getParentModalData('action-editor');
    });

    expect(parentModalData.advancedSettings).toEqual(
      expect.objectContaining({
        async: true,
        priority: 'high',
        timeout: 5000
      })
    );

    // 8. 親子間通信ログの確認
    const communicationLog = await page.evaluate(() => {
      return window.EditModalManager.getCommunicationLog();
    });

    expect(communicationLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'parent_to_child',
          parentId: expect.stringContaining('action-editor'),
          childId: expect.stringContaining('action-advanced'),
          data: expect.any(Object)
        }),
        expect.objectContaining({
          type: 'child_to_parent',
          childId: expect.stringContaining('action-advanced'),
          parentId: expect.stringContaining('action-editor'),
          data: expect.any(Object)
        })
      ])
    );
  });

  test('オーバーレイ相互作用テスト', async () => {
    test.setTimeout(60000);

    // 1. 最初のモーダルを開く
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    // 2. オーバーレイクリックでモーダルが閉じることを確認
    const modalRect = await page.locator('[data-testid="action-editor-modal"]').boundingBox();
    
    // モーダル外（オーバーレイ上）をクリック
    await page.click('body', { 
      position: { x: 10, y: 10 } // 左上角（モーダル外）
    });

    // モーダルが閉じたことを確認
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'hidden' });

    // 3. Escapeキーでモーダルを閉じるテスト
    await page.click('[data-testid="condition-editor-btn"]');
    await page.waitForSelector('[data-testid="condition-editor-modal"]', { state: 'visible' });

    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="condition-editor-modal"]', { state: 'hidden' });

    // 4. 複数モーダルでのオーバーレイ動作テスト
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    await page.click('[data-testid="loop-editor-btn"]');
    await page.waitForSelector('[data-testid="loop-editor-modal"]', { state: 'visible' });

    // 最上位のモーダル（LoopEditor）のオーバーレイをクリック
    await page.click('body', { position: { x: 10, y: 10 } });

    // 最上位のモーダルのみが閉じることを確認
    const modalStates = await page.evaluate(() => {
      return {
        action: window.getComputedStyle(document.querySelector('[data-testid="action-editor-modal"]')).display !== 'none',
        loop: window.getComputedStyle(document.querySelector('[data-testid="loop-editor-modal"]')).display !== 'none'
      };
    });

    expect(modalStates.action).toBe(true);
    expect(modalStates.loop).toBe(false);

    // 5. オーバーレイ無効化テスト
    await page.evaluate(() => {
      window.ModalManager.setOverlayCloseEnabled(false);
    });

    await page.click('[data-testid="condition-editor-btn"]');
    await page.waitForSelector('[data-testid="condition-editor-modal"]', { state: 'visible' });

    // オーバーレイクリックしてもモーダルが閉じないことを確認
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    const conditionModalStillVisible = await page.isVisible('[data-testid="condition-editor-modal"]');
    expect(conditionModalStillVisible).toBe(true);

    // オーバーレイ設定を元に戻す
    await page.evaluate(() => {
      window.ModalManager.setOverlayCloseEnabled(true);
    });
  });

  test('フォーカス管理テスト', async () => {
    test.setTimeout(60000);

    // 1. 初期フォーカス状態を確認
    const initialFocus = await page.evaluate(() => {
      return document.activeElement.tagName;
    });

    // 2. ActionEditorモーダルを開く
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    // 3. モーダル内の最初の入力フィールドにフォーカスが移ることを確認
    const modalFocus = await page.evaluate(() => {
      return document.activeElement.getAttribute('data-testid');
    });

    expect(modalFocus).toBe('action-from-input');

    // 4. Tabキーでフォーカス移動をテスト
    await page.keyboard.press('Tab');
    const secondFieldFocus = await page.evaluate(() => {
      return document.activeElement.getAttribute('data-testid');
    });

    expect(secondFieldFocus).toBe('action-to-input');

    // 5. Shift+Tabで逆方向フォーカス移動
    await page.keyboard.press('Shift+Tab');
    const backwardFocus = await page.evaluate(() => {
      return document.activeElement.getAttribute('data-testid');
    });

    expect(backwardFocus).toBe('action-from-input');

    // 6. 子モーダルを開いた時のフォーカス管理
    await page.click('[data-testid="action-advanced-settings-btn"]');
    await page.waitForSelector('[data-testid="action-advanced-modal"]', { state: 'visible' });

    const childModalFocus = await page.evaluate(() => {
      return document.activeElement.getAttribute('data-testid');
    });

    expect(childModalFocus).toBe('action-async-checkbox');

    // 7. 子モーダルを閉じた時に親モーダルにフォーカスが戻ることを確認
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="action-advanced-modal"]', { state: 'hidden' });

    const parentModalFocusReturn = await page.evaluate(() => {
      return document.activeElement.getAttribute('data-testid');
    });

    expect(parentModalFocusReturn).toBe('action-advanced-settings-btn');

    // 8. フォーカストラップの確認（モーダル外にフォーカスが移らない）
    await page.evaluate(() => {
      // モーダル外の要素にフォーカスを設定しようとする
      const outsideElement = document.querySelector('[data-testid="main-toolbar"]');
      if (outsideElement) {
        outsideElement.focus();
      }
    });

    const focusAfterTrap = await page.evaluate(() => {
      return document.activeElement.closest('[data-testid="action-editor-modal"]') !== null;
    });

    expect(focusAfterTrap).toBe(true);
  });

  test('キーボードナビゲーションテスト', async () => {
    test.setTimeout(60000);

    // 1. モーダルを開く
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    // 2. 入力フィールドでのキーボード操作
    await page.fill('[data-testid="action-from-input"]', 'Source');
    await page.keyboard.press('Tab');
    await page.fill('[data-testid="action-to-input"]', 'Target');
    await page.keyboard.press('Tab');
    await page.fill('[data-testid="action-message-input"]', 'Test message');

    // 3. Enter キーで保存操作
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'hidden' });

    // アクションが正しく保存されたことを確認
    const savedActions = await page.evaluate(() => {
      return window.ActionEditor.getAllActions();
    });

    expect(savedActions.length).toBe(1);
    expect(savedActions[0]).toEqual(
      expect.objectContaining({
        from: 'Source',
        to: 'Target',
        message: 'Test message'
      })
    );

    // 4. ショートカットキーテスト
    await page.keyboard.press('Control+n'); // 新規アクション作成ショートカット
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    // 5. Alt+文字キーでのアクセス
    await page.keyboard.press('Alt+f'); // From フィールドへのショートカット
    const altFocusTarget = await page.evaluate(() => {
      return document.activeElement.getAttribute('data-testid');
    });

    expect(altFocusTarget).toBe('action-from-input');

    // 6. 矢印キーでの選択肢ナビゲーション（ドロップダウンがある場合）
    await page.click('[data-testid="action-type-select"]');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const selectedValue = await page.inputValue('[data-testid="action-type-select"]');
    expect(selectedValue).toBeDefined();
  });

  test('アクセシビリティ準拠テスト', async () => {
    test.setTimeout(60000);

    // 1. ARIA属性の確認
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]', { state: 'visible' });

    const ariaAttributes = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="action-editor-modal"]');
      return {
        role: modal.getAttribute('role'),
        ariaModal: modal.getAttribute('aria-modal'),
        ariaLabelledby: modal.getAttribute('aria-labelledby'),
        ariaDescribedby: modal.getAttribute('aria-describedby')
      };
    });

    expect(ariaAttributes.role).toBe('dialog');
    expect(ariaAttributes.ariaModal).toBe('true');
    expect(ariaAttributes.ariaLabelledby).toBeDefined();

    // 2. ラベルとフィールドの関連性確認
    const labelAssociations = await page.evaluate(() => {
      const inputs = document.querySelectorAll('[data-testid="action-editor-modal"] input');
      return Array.from(inputs).map(input => ({
        id: input.id,
        labelledBy: input.getAttribute('aria-labelledby'),
        hasLabel: document.querySelector(`label[for="${input.id}"]`) !== null
      }));
    });

    labelAssociations.forEach(association => {
      expect(association.hasLabel || association.labelledBy).toBeTruthy();
    });

    // 3. コントラスト比の確認（簡易チェック）
    const contrastInfo = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="action-editor-modal"]');
      const computedStyle = window.getComputedStyle(modal);
      return {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        borderColor: computedStyle.borderColor
      };
    });

    expect(contrastInfo.backgroundColor).toBeDefined();
    expect(contrastInfo.color).toBeDefined();

    // 4. 読み上げ可能テキストの確認
    const accessibleText = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="action-editor-modal"]');
      return {
        title: modal.querySelector('[data-testid="modal-title"]')?.textContent,
        description: modal.querySelector('[data-testid="modal-description"]')?.textContent,
        buttons: Array.from(modal.querySelectorAll('button')).map(btn => ({
          text: btn.textContent,
          ariaLabel: btn.getAttribute('aria-label')
        }))
      };
    });

    expect(accessibleText.title).toBeDefined();
    accessibleText.buttons.forEach(button => {
      expect(button.text || button.ariaLabel).toBeTruthy();
    });

    // 5. スクリーンリーダー対応の確認
    const screenReaderInfo = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="action-editor-modal"]');
      return {
        liveRegions: Array.from(modal.querySelectorAll('[aria-live]')).length,
        announcements: Array.from(modal.querySelectorAll('[role="status"], [role="alert"]')).length
      };
    });

    // ライブリージョンまたはアナウンス要素が存在することを確認
    expect(screenReaderInfo.liveRegions + screenReaderInfo.announcements).toBeGreaterThan(0);
  });
});