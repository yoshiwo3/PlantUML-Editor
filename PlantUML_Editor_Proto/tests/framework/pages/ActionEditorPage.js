/**
 * ActionEditorPage - アクション編集専用ページオブジェクト
 * Sprint3 TEST-005-2実装
 * 
 * 機能:
 * - アクション項目の詳細編集
 * - 7要素構成の完全操作
 * - ドラッグ&ドロップ機能
 * - 条件付きアクション（？ボタン）
 */

import { Page } from '@playwright/test';

export class ActionEditorPage {
  constructor(page) {
    this.page = page;
    
    // アクション編集専用セレクタ
    this.selectors = {
      // エディターコンテナ
      actionEditor: '[data-testid="action-editor"]',
      editorModal: '[data-testid="action-editor-modal"]',
      inlineEditor: '[data-testid="inline-action-editor"]',
      
      // 7要素構成（設計書準拠）
      dragHandle: '[data-testid="drag-handle"]',
      actorFromSelect: '[data-testid="actor-from-select"]',
      arrowTypeSelect: '[data-testid="arrow-type-select"]',
      actorToSelect: '[data-testid="actor-to-select"]',
      messageInput: '[data-testid="message-input"]',
      deleteButton: '[data-testid="delete-button"]',
      questionButton: '[data-testid="question-button"]',
      
      // 条件確認機能（？ボタン詳細）
      questionIcon: '[data-testid="question-icon"]',
      questionActive: '[data-testid="question-button"].active',
      conditionInput: '[data-testid="condition-input"]',
      conditionModal: '[data-testid="condition-modal"]',
      
      // アクター管理
      actorList: '[data-testid="actor-list"]',
      addActorButton: '[data-testid="add-actor-button"]',
      actorInput: '[data-testid="actor-input"]',
      customActorInput: '[data-testid="custom-actor-input"]',
      
      // 矢印タイプ選択
      arrowOptions: '[data-testid="arrow-options"]',
      syncArrow: '[data-value="sync"]', // →
      asyncArrow: '[data-value="async"]', // ⇢
      returnArrow: '[data-value="return"]', // ⟵
      asyncReturnArrow: '[data-value="async-return"]', // ⟸
      
      // メッセージ編集
      messageEditor: '[data-testid="message-editor"]',
      messagePreview: '[data-testid="message-preview"]',
      japaneseInput: '[data-testid="japanese-message-input"]',
      messageFormatting: '[data-testid="message-formatting"]',
      
      // 操作ボタン
      confirmButton: '[data-testid="confirm-action"]',
      cancelButton: '[data-testid="cancel-action"]',
      resetButton: '[data-testid="reset-action"]',
      duplicateButton: '[data-testid="duplicate-action"]',
      
      // プレビュー
      actionPreview: '[data-testid="action-preview"]',
      plantUMLPreview: '[data-testid="plantuml-preview"]',
      
      // バリデーション
      validationErrors: '[data-testid="validation-errors"]',
      fieldError: '[data-testid="field-error"]',
      
      // ドラッグ&ドロップ
      dropZone: '[data-testid="drop-zone"]',
      dragIndicator: '[data-testid="drag-indicator"]',
      sortableList: '[data-testid="sortable-action-list"]'
    };

    // 矢印タイプマッピング（設計書準拠）
    this.arrowTypes = {
      sync: { symbol: '→', value: 'sync', label: '同期' },
      async: { symbol: '⇢', value: 'async', label: '非同期' },
      return: { symbol: '⟵', value: 'return', label: '戻り' },
      asyncReturn: { symbol: '⟸', value: 'async-return', label: '非同期戻り' }
    };
  }

  /**
   * アクション編集画面を開く
   * @param {string} mode - 編集モード ('new', 'edit', 'inline')
   * @param {number} actionIndex - 編集するアクションのインデックス
   */
  async openActionEditor(mode = 'new', actionIndex = null) {
    if (mode === 'new') {
      await this.page.click('[data-testid="add-action-button"]');
    } else if (mode === 'edit' && actionIndex !== null) {
      await this.page.click(`[data-action-index="${actionIndex}"] .edit-button`);
    } else if (mode === 'inline' && actionIndex !== null) {
      await this.page.dblclick(`[data-action-index="${actionIndex}"]`);
    }
    
    // エディターの表示を待機
    const editorSelector = mode === 'inline' ? this.selectors.inlineEditor : this.selectors.editorModal;
    await this.page.waitForSelector(editorSelector, { state: 'visible' });
    
    return this;
  }

  /**
   * 完全なアクション項目を設定（7要素すべて）
   * @param {Object} actionData - アクション項目の設定
   */
  async setCompleteAction(actionData) {
    const {
      actorFrom,
      arrowType,
      actorTo,
      message,
      condition,
      position
    } = actionData;

    // 1. FROM アクター設定
    if (actorFrom) {
      await this.setActorFrom(actorFrom);
    }

    // 2. 矢印タイプ設定
    if (arrowType) {
      await this.setArrowType(arrowType);
    }

    // 3. TO アクター設定
    if (actorTo) {
      await this.setActorTo(actorTo);
    }

    // 4. メッセージ設定
    if (message) {
      await this.setMessage(message);
    }

    // 5. 条件設定（？ボタン）
    if (condition) {
      await this.setCondition(condition);
    }

    // 6. 位置調整（ドラッグハンドル）
    if (position) {
      await this.setPosition(position);
    }

    // 7. 設定完了まで待機
    await this.waitForValidation();

    return this;
  }

  /**
   * FROM アクターを設定
   * @param {string} actor - アクター名
   */
  async setActorFrom(actor) {
    const select = this.page.locator(this.selectors.actorFromSelect);
    
    // 既存アクターから選択を試みる
    const existingOptions = await select.locator('option').allTextContents();
    
    if (existingOptions.includes(actor)) {
      await select.selectOption({ label: actor });
    } else {
      // カスタムアクターとして追加
      await this.addCustomActor(actor);
      await select.selectOption({ label: actor });
    }
    
    return this;
  }

  /**
   * TO アクターを設定
   * @param {string} actor - アクター名
   */
  async setActorTo(actor) {
    const select = this.page.locator(this.selectors.actorToSelect);
    
    const existingOptions = await select.locator('option').allTextContents();
    
    if (existingOptions.includes(actor)) {
      await select.selectOption({ label: actor });
    } else {
      await this.addCustomActor(actor);
      await select.selectOption({ label: actor });
    }
    
    return this;
  }

  /**
   * カスタムアクターを追加
   * @param {string} actorName - 新しいアクター名
   */
  async addCustomActor(actorName) {
    // アクター追加ボタンをクリック
    await this.page.click(this.selectors.addActorButton);
    
    // モーダルまたはインライン入力の表示を待機
    await this.page.waitForSelector(this.selectors.customActorInput, { state: 'visible' });
    
    // アクター名を入力
    await this.page.fill(this.selectors.customActorInput, actorName);
    
    // 確定
    await this.page.press(this.selectors.customActorInput, 'Enter');
    
    // アクターリストの更新を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * 矢印タイプを設定
   * @param {string} arrowType - 矢印タイプ ('sync', 'async', 'return', 'async-return')
   */
  async setArrowType(arrowType) {
    const arrowConfig = this.arrowTypes[arrowType];
    if (!arrowConfig) {
      throw new Error(`Unknown arrow type: ${arrowType}`);
    }
    
    const select = this.page.locator(this.selectors.arrowTypeSelect);
    await select.selectOption({ value: arrowConfig.value });
    
    // 矢印プレビューの更新を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * メッセージを設定（日本語対応）
   * @param {string} message - メッセージテキスト
   */
  async setMessage(message) {
    const messageInput = this.page.locator(this.selectors.messageInput);
    
    // 既存テキストをクリア
    await messageInput.clear();
    
    // 日本語入力のシミュレーション
    await messageInput.type(message, { delay: 50 });
    
    // IME確定を待機
    await this.page.waitForTimeout(100);
    
    // プレビュー更新を待機
    await this.waitForMessagePreview();
    
    return this;
  }

  /**
   * メッセージプレビューの更新を待機
   */
  async waitForMessagePreview() {
    await this.page.waitForFunction(() => {
      const preview = document.querySelector('[data-testid="message-preview"]');
      return preview && preview.textContent.length > 0;
    }, { timeout: 3000 });
  }

  /**
   * 条件を設定（？ボタン機能）
   * @param {string} condition - 条件文
   */
  async setCondition(condition) {
    // ？ボタンをクリックしてアクティブ化
    await this.page.click(this.selectors.questionButton);
    
    // アクティブ状態の確認
    await this.page.waitForSelector(this.selectors.questionActive, { state: 'visible' });
    
    // 条件入力フィールドの表示を待機
    await this.page.waitForSelector(this.selectors.conditionInput, { state: 'visible' });
    
    // 条件文を入力
    await this.page.fill(this.selectors.conditionInput, condition);
    
    // 条件設定の確定
    await this.page.press(this.selectors.conditionInput, 'Enter');
    
    return this;
  }

  /**
   * 条件を解除
   */
  async removeCondition() {
    // アクティブな？ボタンをクリックして解除
    const questionButton = this.page.locator(this.selectors.questionButton);
    const isActive = await this.page.locator(this.selectors.questionActive).count() > 0;
    
    if (isActive) {
      await questionButton.click();
      
      // 非アクティブ状態の確認
      await this.page.waitForSelector(this.selectors.questionActive, { state: 'hidden' });
    }
    
    return this;
  }

  /**
   * ドラッグハンドルを使用して位置を変更
   * @param {number} targetPosition - 移動先の位置（0から始まるインデックス）
   */
  async setPosition(targetPosition) {
    const dragHandle = this.page.locator(this.selectors.dragHandle);
    const sortableList = this.page.locator(this.selectors.sortableList);
    
    // ドラッグ開始
    await dragHandle.hover();
    await this.page.mouse.down();
    
    // ドラッグ先の計算
    const listBox = await sortableList.boundingBox();
    const itemHeight = 60; // アクション項目の平均高さ
    const targetY = listBox.y + (targetPosition * itemHeight) + (itemHeight / 2);
    
    // ドラッグ移動
    await this.page.mouse.move(listBox.x + listBox.width / 2, targetY, { steps: 5 });
    
    // ドロップ
    await this.page.mouse.up();
    
    // 並び順変更の完了を待機
    await this.page.waitForTimeout(300);
    
    return this;
  }

  /**
   * アクション項目を複製
   */
  async duplicateAction() {
    await this.page.click(this.selectors.duplicateButton);
    
    // 複製完了の確認
    await this.page.waitForSelector('.action-item:last-child', { state: 'visible' });
    
    return this;
  }

  /**
   * アクション項目を削除
   */
  async deleteAction() {
    await this.page.click(this.selectors.deleteButton);
    
    // 確認ダイアログが表示される場合
    const confirmDialog = this.page.locator('.confirm-dialog');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-delete');
    }
    
    // 削除完了を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * バリデーションエラーを取得
   * @returns {Array} エラーメッセージの配列
   */
  async getValidationErrors() {
    const errorElements = await this.page.locator(this.selectors.validationErrors + ' .error-item').all();
    const errors = [];
    
    for (const element of errorElements) {
      const errorText = await element.textContent();
      errors.push(errorText.trim());
    }
    
    return errors;
  }

  /**
   * 特定フィールドのエラーを取得
   * @param {string} fieldName - フィールド名
   * @returns {string|null} エラーメッセージまたはnull
   */
  async getFieldError(fieldName) {
    const errorElement = this.page.locator(`[data-field="${fieldName}"] ${this.selectors.fieldError}`);
    const isVisible = await errorElement.isVisible();
    return isVisible ? await errorElement.textContent() : null;
  }

  /**
   * バリデーション完了を待機
   */
  async waitForValidation() {
    // バリデーション処理の完了を待機
    await this.page.waitForFunction(() => {
      const validating = document.querySelector('.validating');
      return !validating || !validating.classList.contains('validating');
    }, { timeout: 5000 });
  }

  /**
   * アクションのプレビューを取得
   * @returns {Object} プレビューデータ
   */
  async getActionPreview() {
    const preview = this.page.locator(this.selectors.actionPreview);
    
    return {
      visible: await preview.isVisible(),
      text: await preview.textContent(),
      plantUML: await this.getPlantUMLPreview()
    };
  }

  /**
   * PlantUMLプレビューを取得
   * @returns {string} PlantUMLコード
   */
  async getPlantUMLPreview() {
    const plantUMLPreview = this.page.locator(this.selectors.plantUMLPreview);
    return await plantUMLPreview.textContent();
  }

  /**
   * アクション編集を確定
   */
  async confirmAction() {
    await this.page.click(this.selectors.confirmButton);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.editorModal, { state: 'hidden' });
    
    // メインエディターの更新を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * アクション編集をキャンセル
   */
  async cancelAction() {
    await this.page.click(this.selectors.cancelButton);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.editorModal, { state: 'hidden' });
    
    return this;
  }

  /**
   * アクション編集をリセット
   */
  async resetAction() {
    await this.page.click(this.selectors.resetButton);
    
    // 確認ダイアログが表示される場合
    const confirmDialog = this.page.locator('.confirm-reset-dialog');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-reset');
    }
    
    // リセット完了を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * キーボードショートカットでの操作
   * @param {string} shortcut - ショートカットキー
   */
  async useKeyboardShortcut(shortcut) {
    const shortcuts = {
      'save': 'Control+S',
      'undo': 'Control+Z',
      'redo': 'Control+Y',
      'delete': 'Delete',
      'escape': 'Escape',
      'enter': 'Enter',
      'duplicate': 'Control+D'
    };
    
    const key = shortcuts[shortcut] || shortcut;
    await this.page.keyboard.press(key);
    
    // 操作完了を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * アクセシビリティ機能のテスト
   * @returns {Object} アクセシビリティテスト結果
   */
  async testAccessibility() {
    // Tab順序のテスト
    const tabOrder = await this.testTabOrder();
    
    // ARIA属性のチェック
    const ariaCheck = await this.checkAriaLabels();
    
    // キーボード操作のチェック
    const keyboardCheck = await this.testKeyboardOperations();
    
    return {
      tabOrder,
      ariaCheck,
      keyboardCheck,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Tab順序をテスト
   * @returns {Array} Tab順序の要素リスト
   */
  async testTabOrder() {
    const focusableElements = [];
    
    // 各要素にTabで移動
    for (let i = 0; i < 10; i++) {
      await this.page.keyboard.press('Tab');
      
      const activeElement = await this.page.evaluate(() => {
        const element = document.activeElement;
        return {
          tagName: element.tagName,
          id: element.id,
          testId: element.getAttribute('data-testid'),
          className: element.className
        };
      });
      
      focusableElements.push(activeElement);
      
      // 循環したら終了
      if (focusableElements.length > 1 && 
          JSON.stringify(focusableElements[0]) === JSON.stringify(activeElement)) {
        break;
      }
    }
    
    return focusableElements;
  }

  /**
   * ARIA属性をチェック
   * @returns {Object} ARIA属性の状態
   */
  async checkAriaLabels() {
    return await this.page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid^="action-editor"] *');
      const ariaStats = {
        hasLabel: 0,
        hasDescription: 0,
        hasRole: 0,
        total: elements.length
      };
      
      elements.forEach(element => {
        if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) {
          ariaStats.hasLabel++;
        }
        if (element.hasAttribute('aria-describedby')) {
          ariaStats.hasDescription++;
        }
        if (element.hasAttribute('role')) {
          ariaStats.hasRole++;
        }
      });
      
      return ariaStats;
    });
  }

  /**
   * キーボード操作をテスト
   * @returns {Object} キーボード操作の結果
   */
  async testKeyboardOperations() {
    const results = {
      enterConfirm: false,
      escapeCancel: false,
      arrowNavigation: false,
      spaceActivation: false
    };
    
    try {
      // Enterで確定操作
      await this.page.keyboard.press('Enter');
      results.enterConfirm = true;
      
      // Escapeでキャンセル操作
      await this.page.keyboard.press('Escape');
      results.escapeCancel = true;
      
      // 矢印キーでナビゲーション
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('ArrowUp');
      results.arrowNavigation = true;
      
      // スペースキーで選択操作
      await this.page.keyboard.press('Space');
      results.spaceActivation = true;
      
    } catch (error) {
      console.warn('Keyboard operation test failed:', error.message);
    }
    
    return results;
  }

  /**
   * パフォーマンステスト
   * @returns {Object} パフォーマンス測定結果
   */
  async measurePerformance() {
    const startTime = Date.now();
    
    // 典型的な編集操作の測定
    const testAction = {
      actorFrom: 'ユーザー',
      arrowType: 'sync',
      actorTo: 'システム',
      message: 'ログイン要求',
      condition: 'ユーザーが認証済み'
    };
    
    await this.setCompleteAction(testAction);
    const editTime = Date.now() - startTime;
    
    // プレビュー更新時間の測定
    const previewStart = Date.now();
    await this.waitForMessagePreview();
    const previewTime = Date.now() - previewStart;
    
    return {
      totalEditTime: editTime,
      previewUpdateTime: previewTime,
      timestamp: new Date().toISOString()
    };
  }
}

// デフォルトエクスポート
export default ActionEditorPage;