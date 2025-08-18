/**
 * ActionItemComponent - アクション項目コンポーネント
 * Sprint3 TEST-005-3実装
 * 
 * 機能:
 * - 7要素構成の完全操作（設計書準拠）
 * - ドラッグハンドル、FROM/TO アクター、矢印タイプ、メッセージ、削除ボタン、条件確認ボタン
 * - インライン編集機能
 * - 日本語完全対応
 */

import { Page } from '@playwright/test';

export class ActionItemComponent {
  constructor(page, containerSelector = null) {
    this.page = page;
    this.containerSelector = containerSelector || '[data-testid="action-items-list"]';
    
    // 7要素構成セレクタ（設計書準拠）
    this.selectors = {
      // コンテナ
      actionItem: '.action-item',
      actionItemContainer: '[data-testid="action-item-container"]',
      
      // 7要素構成
      dragHandle: '[data-testid="drag-handle"]', // ☰
      actorFromSelect: '[data-testid="actor-from-select"]', // FROM アクター選択
      arrowTypeSelect: '[data-testid="arrow-type-select"]', // 矢印タイプ選択
      actorToSelect: '[data-testid="actor-to-select"]', // TO アクター選択
      messageInput: '[data-testid="message-input"]', // メッセージ入力フィールド
      deleteButton: '[data-testid="delete-button"]', // 削除ボタン
      questionButton: '[data-testid="question-button"]', // ？条件確認ボタン
      
      // 状態表示
      activeState: '.action-item.active',
      editingState: '.action-item.editing',
      errorState: '.action-item.error',
      questionActiveState: '.question-button.active',
      
      // 矢印タイプオプション（設計書準拠）
      syncArrow: '[data-value="sync"]', // →
      asyncArrow: '[data-value="async"]', // ⇢
      returnArrow: '[data-value="return"]', // ⟵
      asyncReturnArrow: '[data-value="async-return"]', // ⟸
      
      // 編集関連
      inlineEditor: '[data-testid="inline-editor"]',
      editMode: '.edit-mode',
      confirmEdit: '[data-testid="confirm-edit"]',
      cancelEdit: '[data-testid="cancel-edit"]',
      
      // バリデーション
      validationError: '[data-testid="validation-error"]',
      fieldError: '[data-field-error]',
      
      // プレビュー
      actionPreview: '[data-testid="action-preview"]',
      plantUMLPreview: '[data-testid="plantuml-preview"]'
    };

    // 矢印タイプマッピング（設計書準拠）
    this.arrowTypes = {
      sync: { symbol: '→', value: 'sync', label: '同期' },
      async: { symbol: '⇢', value: 'async', label: '非同期' },
      return: { symbol: '⟵', value: 'return', label: '戻り' },
      asyncReturn: { symbol: '⟸', value: 'async-return', label: '非同期戻り' }
    };

    // デフォルトアクター
    this.defaultActors = [
      'ユーザー', 'システム', 'データベース', 'API', 'UI', 'コントローラー',
      'サービス', 'ログサーバー', 'メールサーバー', 'ファイルシステム'
    ];
  }

  /**
   * 特定のアクション項目を取得
   * @param {number} index - アクション項目のインデックス
   * @returns {Locator} アクション項目のLocator
   */
  getActionItem(index) {
    return this.page.locator(`${this.containerSelector} ${this.selectors.actionItem}:nth-child(${index + 1})`);
  }

  /**
   * 全アクション項目を取得
   * @returns {Array} アクション項目のLocatorリスト
   */
  async getAllActionItems() {
    return await this.page.locator(`${this.containerSelector} ${this.selectors.actionItem}`).all();
  }

  /**
   * アクション項目数を取得
   * @returns {number} アクション項目数
   */
  async getActionItemCount() {
    return await this.page.locator(`${this.containerSelector} ${this.selectors.actionItem}`).count();
  }

  /**
   * 7要素完全設定（設計書準拠）
   * @param {number} index - アクション項目のインデックス
   * @param {Object} actionData - アクションデータ
   */
  async setCompleteActionItem(index, actionData) {
    const {
      actorFrom,
      arrowType,
      actorTo,
      message,
      hasCondition = false,
      condition = null
    } = actionData;

    const actionItem = this.getActionItem(index);
    
    // インライン編集モードに入る
    await this.enterEditMode(actionItem);

    // 1. FROM アクター設定
    if (actorFrom) {
      await this.setActorFrom(actionItem, actorFrom);
    }

    // 2. 矢印タイプ設定
    if (arrowType) {
      await this.setArrowType(actionItem, arrowType);
    }

    // 3. TO アクター設定
    if (actorTo) {
      await this.setActorTo(actionItem, actorTo);
    }

    // 4. メッセージ設定
    if (message) {
      await this.setMessage(actionItem, message);
    }

    // 5. 条件設定（？ボタン）
    if (hasCondition) {
      await this.activateQuestionButton(actionItem);
      if (condition) {
        await this.setCondition(actionItem, condition);
      }
    }

    // 6. 編集確定
    await this.confirmEdit(actionItem);

    return this;
  }

  /**
   * インライン編集モードに入る
   * @param {Locator} actionItem - アクション項目
   */
  async enterEditMode(actionItem) {
    // ダブルクリックでインライン編集開始
    await actionItem.dblclick();
    
    // 編集モードの確認
    await actionItem.waitFor({ state: 'visible' });
    await this.page.waitForSelector(`${this.selectors.editMode}`, { state: 'visible' });
    
    return this;
  }

  /**
   * FROM アクターを設定
   * @param {Locator} actionItem - アクション項目
   * @param {string} actor - アクター名
   */
  async setActorFrom(actionItem, actor) {
    const selectElement = actionItem.locator(this.selectors.actorFromSelect);
    
    // 既存オプションを確認
    const options = await selectElement.locator('option').allTextContents();
    
    if (options.includes(actor)) {
      await selectElement.selectOption({ label: actor });
    } else {
      // カスタムアクターとして追加
      await this.addCustomActor(actor);
      await selectElement.selectOption({ label: actor });
    }
    
    return this;
  }

  /**
   * TO アクターを設定
   * @param {Locator} actionItem - アクション項目
   * @param {string} actor - アクター名
   */
  async setActorTo(actionItem, actor) {
    const selectElement = actionItem.locator(this.selectors.actorToSelect);
    
    const options = await selectElement.locator('option').allTextContents();
    
    if (options.includes(actor)) {
      await selectElement.selectOption({ label: actor });
    } else {
      await this.addCustomActor(actor);
      await selectElement.selectOption({ label: actor });
    }
    
    return this;
  }

  /**
   * カスタムアクターを追加
   * @param {string} actorName - アクター名
   */
  async addCustomActor(actorName) {
    // アクター追加UI（実装に応じて調整）
    await this.page.click('[data-testid="add-custom-actor"]');
    
    // 新しいアクター名を入力
    const customActorInput = this.page.locator('[data-testid="custom-actor-input"]');
    await customActorInput.fill(actorName);
    await customActorInput.press('Enter');
    
    // アクターリストの更新を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * 矢印タイプを設定
   * @param {Locator} actionItem - アクション項目
   * @param {string} arrowType - 矢印タイプ
   */
  async setArrowType(actionItem, arrowType) {
    const arrowConfig = this.arrowTypes[arrowType];
    if (!arrowConfig) {
      throw new Error(`Unknown arrow type: ${arrowType}`);
    }
    
    const selectElement = actionItem.locator(this.selectors.arrowTypeSelect);
    await selectElement.selectOption({ value: arrowConfig.value });
    
    // 矢印プレビューの更新を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * メッセージを設定（日本語対応）
   * @param {Locator} actionItem - アクション項目
   * @param {string} message - メッセージテキスト
   */
  async setMessage(actionItem, message) {
    const messageInput = actionItem.locator(this.selectors.messageInput);
    
    // 既存テキストをクリア
    await messageInput.clear();
    
    // 日本語入力のシミュレーション
    await messageInput.type(message, { delay: 50 });
    
    // IME確定を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * ？ボタン（条件確認）をアクティブ化
   * @param {Locator} actionItem - アクション項目
   */
  async activateQuestionButton(actionItem) {
    const questionButton = actionItem.locator(this.selectors.questionButton);
    await questionButton.click();
    
    // アクティブ状態の確認
    await actionItem.locator(this.selectors.questionActiveState).waitFor({ state: 'visible' });
    
    return this;
  }

  /**
   * ？ボタンを非アクティブ化
   * @param {Locator} actionItem - アクション項目
   */
  async deactivateQuestionButton(actionItem) {
    const questionButton = actionItem.locator(this.selectors.questionButton);
    const isActive = await actionItem.locator(this.selectors.questionActiveState).count() > 0;
    
    if (isActive) {
      await questionButton.click();
      await actionItem.locator(this.selectors.questionActiveState).waitFor({ state: 'hidden' });
    }
    
    return this;
  }

  /**
   * 条件を設定
   * @param {Locator} actionItem - アクション項目
   * @param {string} condition - 条件文
   */
  async setCondition(actionItem, condition) {
    // 条件入力フィールドが表示されているか確認
    const conditionInput = this.page.locator('[data-testid="condition-input"]');
    await conditionInput.waitFor({ state: 'visible' });
    
    // 条件文を入力
    await conditionInput.fill(condition);
    await conditionInput.press('Enter');
    
    return this;
  }

  /**
   * ドラッグハンドルを使用して位置を変更
   * @param {number} fromIndex - 移動元のインデックス
   * @param {number} toIndex - 移動先のインデックス
   */
  async moveActionItem(fromIndex, toIndex) {
    const fromItem = this.getActionItem(fromIndex);
    const toItem = this.getActionItem(toIndex);
    
    const dragHandle = fromItem.locator(this.selectors.dragHandle);
    
    // ドラッグ&ドロップ操作
    await dragHandle.hover();
    await this.page.mouse.down();
    
    // 移動先への移動
    const toBox = await toItem.boundingBox();
    if (toBox) {
      await this.page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 5 });
      await this.page.mouse.up();
    }
    
    // 並び順変更の完了を待機
    await this.page.waitForTimeout(300);
    
    return this;
  }

  /**
   * アクション項目を削除
   * @param {number} index - 削除するアクション項目のインデックス
   */
  async deleteActionItem(index) {
    const actionItem = this.getActionItem(index);
    const deleteButton = actionItem.locator(this.selectors.deleteButton);
    
    await deleteButton.click();
    
    // 確認ダイアログが表示される場合
    const confirmDialog = this.page.locator('.confirm-delete-action');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-delete');
    }
    
    // 削除完了を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * 編集を確定
   * @param {Locator} actionItem - アクション項目
   */
  async confirmEdit(actionItem) {
    const confirmButton = actionItem.locator(this.selectors.confirmEdit);
    
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    } else {
      // Enterキーで確定
      await this.page.keyboard.press('Enter');
    }
    
    // 編集モード終了の確認
    await actionItem.locator(this.selectors.editMode).waitFor({ state: 'hidden' });
    
    return this;
  }

  /**
   * 編集をキャンセル
   * @param {Locator} actionItem - アクション項目
   */
  async cancelEdit(actionItem) {
    const cancelButton = actionItem.locator(this.selectors.cancelEdit);
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      // Escapeキーでキャンセル
      await this.page.keyboard.press('Escape');
    }
    
    // 編集モード終了の確認
    await actionItem.locator(this.selectors.editMode).waitFor({ state: 'hidden' });
    
    return this;
  }

  /**
   * アクション項目のデータを取得
   * @param {number} index - アクション項目のインデックス
   * @returns {Object} アクション項目のデータ
   */
  async getActionItemData(index) {
    const actionItem = this.getActionItem(index);
    
    return {
      actorFrom: await actionItem.locator(this.selectors.actorFromSelect).inputValue(),
      arrowType: await actionItem.locator(this.selectors.arrowTypeSelect).inputValue(),
      actorTo: await actionItem.locator(this.selectors.actorToSelect).inputValue(),
      message: await actionItem.locator(this.selectors.messageInput).inputValue(),
      hasCondition: await actionItem.locator(this.selectors.questionActiveState).count() > 0,
      dragHandleVisible: await actionItem.locator(this.selectors.dragHandle).isVisible(),
      deleteButtonVisible: await actionItem.locator(this.selectors.deleteButton).isVisible()
    };
  }

  /**
   * 全アクション項目のデータを取得
   * @returns {Array} アクション項目データの配列
   */
  async getAllActionItemsData() {
    const count = await this.getActionItemCount();
    const allData = [];
    
    for (let i = 0; i < count; i++) {
      const data = await this.getActionItemData(i);
      allData.push(data);
    }
    
    return allData;
  }

  /**
   * バリデーションエラーを取得
   * @param {number} index - アクション項目のインデックス
   * @returns {Array} エラーメッセージの配列
   */
  async getValidationErrors(index) {
    const actionItem = this.getActionItem(index);
    const errorElements = await actionItem.locator(this.selectors.validationError).all();
    const errors = [];
    
    for (const element of errorElements) {
      const errorText = await element.textContent();
      errors.push(errorText.trim());
    }
    
    return errors;
  }

  /**
   * 特定フィールドのエラーを取得
   * @param {number} index - アクション項目のインデックス
   * @param {string} fieldName - フィールド名
   * @returns {string|null} エラーメッセージまたはnull
   */
  async getFieldError(index, fieldName) {
    const actionItem = this.getActionItem(index);
    const errorElement = actionItem.locator(`${this.selectors.fieldError}[data-field="${fieldName}"]`);
    const isVisible = await errorElement.isVisible();
    return isVisible ? await errorElement.textContent() : null;
  }

  /**
   * アクション項目のプレビューを取得
   * @param {number} index - アクション項目のインデックス
   * @returns {Object} プレビューデータ
   */
  async getActionItemPreview(index) {
    const actionItem = this.getActionItem(index);
    
    const preview = actionItem.locator(this.selectors.actionPreview);
    const plantUMLPreview = actionItem.locator(this.selectors.plantUMLPreview);
    
    return {
      visible: await preview.isVisible(),
      text: await preview.textContent(),
      plantUML: await plantUMLPreview.textContent()
    };
  }

  /**
   * アクション項目の状態を確認
   * @param {number} index - アクション項目のインデックス
   * @returns {Object} 状態情報
   */
  async getActionItemState(index) {
    const actionItem = this.getActionItem(index);
    
    return {
      isActive: await actionItem.locator(this.selectors.activeState).count() > 0,
      isEditing: await actionItem.locator(this.selectors.editingState).count() > 0,
      hasError: await actionItem.locator(this.selectors.errorState).count() > 0,
      questionActive: await actionItem.locator(this.selectors.questionActiveState).count() > 0
    };
  }

  /**
   * キーボードショートカットでの操作
   * @param {number} index - アクション項目のインデックス
   * @param {string} shortcut - ショートカットキー
   */
  async useKeyboardShortcut(index, shortcut) {
    const actionItem = this.getActionItem(index);
    
    // アクション項目にフォーカス
    await actionItem.click();
    
    const shortcuts = {
      'edit': 'F2',
      'delete': 'Delete',
      'move-up': 'Control+ArrowUp',
      'move-down': 'Control+ArrowDown',
      'duplicate': 'Control+D',
      'toggle-condition': 'Control+Q'
    };
    
    const key = shortcuts[shortcut] || shortcut;
    await this.page.keyboard.press(key);
    
    // 操作完了を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * アクション項目を複製
   * @param {number} index - 複製するアクション項目のインデックス
   */
  async duplicateActionItem(index) {
    // キーボードショートカットで複製
    await this.useKeyboardShortcut(index, 'duplicate');
    
    // 複製完了の確認
    const originalCount = await this.getActionItemCount();
    await this.page.waitForFunction((count) => {
      const currentCount = document.querySelectorAll('.action-item').length;
      return currentCount === count + 1;
    }, originalCount, { timeout: 3000 });
    
    return this;
  }

  /**
   * 一括操作: 全アクション項目の設定
   * @param {Array} actionsData - アクション項目データの配列
   */
  async setBulkActionItems(actionsData) {
    for (let i = 0; i < actionsData.length; i++) {
      await this.setCompleteActionItem(i, actionsData[i]);
      
      // 次の項目への移動前に少し待機
      await this.page.waitForTimeout(100);
    }
    
    return this;
  }

  /**
   * 7要素の完全性を検証
   * @param {number} index - アクション項目のインデックス
   * @returns {Object} 完全性検証結果
   */
  async validateActionItemCompleteness(index) {
    const actionItem = this.getActionItem(index);
    
    const completeness = {
      dragHandle: await actionItem.locator(this.selectors.dragHandle).isVisible(),
      actorFrom: (await actionItem.locator(this.selectors.actorFromSelect).inputValue()).length > 0,
      arrowType: (await actionItem.locator(this.selectors.arrowTypeSelect).inputValue()).length > 0,
      actorTo: (await actionItem.locator(this.selectors.actorToSelect).inputValue()).length > 0,
      message: (await actionItem.locator(this.selectors.messageInput).inputValue()).length > 0,
      deleteButton: await actionItem.locator(this.selectors.deleteButton).isVisible(),
      questionButton: await actionItem.locator(this.selectors.questionButton).isVisible()
    };
    
    const completeElements = Object.values(completeness).filter(Boolean).length;
    
    return {
      ...completeness,
      completionRate: (completeElements / 7) * 100,
      isComplete: completeElements === 7
    };
  }

  /**
   * パフォーマンステスト: アクション項目の操作速度
   * @param {number} actionCount - テストするアクション項目数
   * @returns {Object} パフォーマンス測定結果
   */
  async measureActionItemPerformance(actionCount = 10) {
    const startTime = Date.now();
    
    // テスト用のアクションデータを生成
    const testActions = [];
    for (let i = 0; i < actionCount; i++) {
      testActions.push({
        actorFrom: `アクター${i + 1}`,
        arrowType: i % 2 === 0 ? 'sync' : 'async',
        actorTo: `システム${i + 1}`,
        message: `テストメッセージ${i + 1}`,
        hasCondition: i % 3 === 0
      });
    }
    
    // 一括設定の実行時間を測定
    await this.setBulkActionItems(testActions);
    const setupTime = Date.now() - startTime;
    
    // 個別操作の測定
    const operationStart = Date.now();
    await this.moveActionItem(0, actionCount - 1);
    await this.duplicateActionItem(0);
    await this.deleteActionItem(actionCount);
    const operationTime = Date.now() - operationStart;
    
    return {
      totalTime: Date.now() - startTime,
      setupTime,
      operationTime,
      averageTimePerAction: setupTime / actionCount,
      actionCount,
      timestamp: new Date().toISOString()
    };
  }
}

// デフォルトエクスポート
export default ActionItemComponent;