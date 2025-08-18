/**
 * ConditionBlockComponent - 条件分岐ブロックコンポーネント
 * Sprint3 TEST-005-3実装
 * 
 * 機能:
 * - 条件分岐ブロック（🔀）の操作
 * - TRUE/FALSE分岐の管理
 * - ネスト条件の処理
 * - インライン条件編集
 */

import { Page } from '@playwright/test';

export class ConditionBlockComponent {
  constructor(page, containerSelector = null) {
    this.page = page;
    this.containerSelector = containerSelector || '[data-testid="condition-blocks-container"]';
    
    // 条件分岐ブロック専用セレクタ
    this.selectors = {
      // ブロック全体
      conditionBlock: '.condition-block',
      blockContainer: '[data-testid="condition-block-container"]',
      
      // ヘッダー部分（設計書準拠）
      blockHeader: '[data-testid="condition-header"]',
      blockIcon: '[data-testid="condition-icon"]', // 🔀
      blockLabel: '[data-testid="condition-label"]', // "条件分岐:"
      conditionText: '[data-testid="condition-text"]',
      expandCollapseButton: '[data-testid="expand-collapse-button"]',
      expandIcon: '[data-testid="expand-icon"]', // ▶
      collapseIcon: '[data-testid="collapse-icon"]', // ▼
      
      // 状態
      expandedState: '.condition-block.expanded',
      collapsedState: '.condition-block.collapsed',
      editingState: '.condition-block.editing',
      
      // TRUE分岐（設計書準拠）
      trueBranch: '[data-testid="true-branch"]',
      trueBranchHeader: '[data-testid="true-branch-header"]',
      trueBranchIcon: '[data-testid="true-branch-icon"]', // ✅
      trueBranchLabel: '[data-testid="true-branch-label"]', // "TRUE分岐"
      trueBranchContent: '[data-testid="true-branch-content"]',
      trueBranchBorder: '.true-branch-border', // 緑色ボーダー
      
      // FALSE分岐（設計書準拠）
      falseBranch: '[data-testid="false-branch"]',
      falseBranchHeader: '[data-testid="false-branch-header"]',
      falseBranchIcon: '[data-testid="false-branch-icon"]', // ❌
      falseBranchLabel: '[data-testid="false-branch-label"]', // "FALSE分岐"
      falseBranchContent: '[data-testid="false-branch-content"]',
      falseBranchBorder: '.false-branch-border', // 赤色ボーダー
      
      // 編集機能
      editButton: '[data-testid="edit-condition-button"]',
      conditionInput: '[data-testid="condition-input"]',
      confirmEdit: '[data-testid="confirm-condition-edit"]',
      cancelEdit: '[data-testid="cancel-condition-edit"]',
      
      // アクション管理
      addActionToTrue: '[data-testid="add-action-to-true"]',
      addActionToFalse: '[data-testid="add-action-to-false"]',
      trueActions: '[data-testid="true-actions"]',
      falseActions: '[data-testid="false-actions"]',
      
      // ネスト管理
      addNestedCondition: '[data-testid="add-nested-condition"]',
      nestedConditions: '[data-testid="nested-conditions"]',
      nestLevel: '[data-testid="nest-level"]',
      maxNestWarning: '[data-testid="max-nest-warning"]',
      
      // 操作ボタン
      deleteButton: '[data-testid="delete-condition"]',
      duplicateButton: '[data-testid="duplicate-condition"]',
      moveUpButton: '[data-testid="move-up-condition"]',
      moveDownButton: '[data-testid="move-down-condition"]',
      
      // バリデーション
      validationError: '[data-testid="condition-validation-error"]',
      syntaxError: '[data-testid="syntax-error"]',
      logicWarning: '[data-testid="logic-warning"]',
      
      // プレビュー
      conditionPreview: '[data-testid="condition-preview"]',
      plantUMLPreview: '[data-testid="condition-plantuml-preview"]'
    };
  }

  /**
   * 特定の条件ブロックを取得
   * @param {number} index - 条件ブロックのインデックス
   * @returns {Locator} 条件ブロックのLocator
   */
  getConditionBlock(index) {
    return this.page.locator(`${this.containerSelector} ${this.selectors.conditionBlock}:nth-child(${index + 1})`);
  }

  /**
   * 条件ブロック数を取得
   * @returns {number} 条件ブロック数
   */
  async getConditionBlockCount() {
    return await this.page.locator(`${this.containerSelector} ${this.selectors.conditionBlock}`).count();
  }

  /**
   * 条件ブロックを展開/折りたたみ
   * @param {number} index - 条件ブロックのインデックス
   * @param {boolean} expand - true: 展開, false: 折りたたみ
   */
  async toggleConditionBlock(index, expand = true) {
    const conditionBlock = this.getConditionBlock(index);
    const isExpanded = await conditionBlock.locator(this.selectors.expandedState).count() > 0;
    
    if ((expand && !isExpanded) || (!expand && isExpanded)) {
      const toggleButton = conditionBlock.locator(this.selectors.expandCollapseButton);
      await toggleButton.click();
      
      // 状態変更の完了を待機
      const targetState = expand ? this.selectors.expandedState : this.selectors.collapsedState;
      await conditionBlock.locator(targetState).waitFor({ state: 'visible' });
    }
    
    return this;
  }

  /**
   * 条件文を設定
   * @param {number} index - 条件ブロックのインデックス
   * @param {string} condition - 条件文
   */
  async setCondition(index, condition) {
    const conditionBlock = this.getConditionBlock(index);
    
    // 編集モードに入る
    await this.enterConditionEditMode(conditionBlock);
    
    // 条件文を入力
    const conditionInput = conditionBlock.locator(this.selectors.conditionInput);
    await conditionInput.clear();
    await conditionInput.type(condition, { delay: 50 });
    
    // 編集を確定
    await this.confirmConditionEdit(conditionBlock);
    
    return this;
  }

  /**
   * 条件編集モードに入る
   * @param {Locator} conditionBlock - 条件ブロック
   */
  async enterConditionEditMode(conditionBlock) {
    const editButton = conditionBlock.locator(this.selectors.editButton);
    await editButton.click();
    
    // 編集モードの確認
    await conditionBlock.locator(this.selectors.editingState).waitFor({ state: 'visible' });
    
    return this;
  }

  /**
   * 条件編集を確定
   * @param {Locator} conditionBlock - 条件ブロック
   */
  async confirmConditionEdit(conditionBlock) {
    const confirmButton = conditionBlock.locator(this.selectors.confirmEdit);
    await confirmButton.click();
    
    // 編集モード終了を待機
    await conditionBlock.locator(this.selectors.editingState).waitFor({ state: 'hidden' });
    
    return this;
  }

  /**
   * 条件編集をキャンセル
   * @param {Locator} conditionBlock - 条件ブロック
   */
  async cancelConditionEdit(conditionBlock) {
    const cancelButton = conditionBlock.locator(this.selectors.cancelEdit);
    await cancelButton.click();
    
    // 編集モード終了を待機
    await conditionBlock.locator(this.selectors.editingState).waitFor({ state: 'hidden' });
    
    return this;
  }

  /**
   * TRUE分岐にアクションを追加
   * @param {number} index - 条件ブロックのインデックス
   * @param {Object} actionData - アクションデータ
   */
  async addActionToTrueBranch(index, actionData) {
    const conditionBlock = this.getConditionBlock(index);
    
    // TRUE分岐のアクション追加ボタンをクリック
    const addButton = conditionBlock.locator(this.selectors.addActionToTrue);
    await addButton.click();
    
    // アクション編集ダイアログの処理
    await this.handleActionDialog(actionData);
    
    // アクション追加完了を待機
    await this.waitForBranchUpdate(conditionBlock, 'true');
    
    return this;
  }

  /**
   * FALSE分岐にアクションを追加
   * @param {number} index - 条件ブロックのインデックス
   * @param {Object} actionData - アクションデータ
   */
  async addActionToFalseBranch(index, actionData) {
    const conditionBlock = this.getConditionBlock(index);
    
    // FALSE分岐のアクション追加ボタンをクリック
    const addButton = conditionBlock.locator(this.selectors.addActionToFalse);
    await addButton.click();
    
    // アクション編集ダイアログの処理
    await this.handleActionDialog(actionData);
    
    // アクション追加完了を待機
    await this.waitForBranchUpdate(conditionBlock, 'false');
    
    return this;
  }

  /**
   * アクション編集ダイアログを処理
   * @param {Object} actionData - アクションデータ
   */
  async handleActionDialog(actionData) {
    const { actorFrom, arrowType, actorTo, message } = actionData;
    
    // ダイアログの表示を待機
    await this.page.waitForSelector('.action-dialog', { state: 'visible' });
    
    if (actorFrom) {
      await this.page.selectOption('.dialog-actor-from', actorFrom);
    }
    if (arrowType) {
      await this.page.selectOption('.dialog-arrow-type', arrowType);
    }
    if (actorTo) {
      await this.page.selectOption('.dialog-actor-to', actorTo);
    }
    if (message) {
      await this.page.fill('.dialog-message', message);
    }
    
    // ダイアログを確定
    await this.page.click('.dialog-confirm');
    
    return this;
  }

  /**
   * 分岐更新の完了を待機
   * @param {Locator} conditionBlock - 条件ブロック
   * @param {string} branch - 分岐 ('true' | 'false')
   */
  async waitForBranchUpdate(conditionBlock, branch) {
    const branchContent = branch === 'true' ? 
      conditionBlock.locator(this.selectors.trueBranchContent) :
      conditionBlock.locator(this.selectors.falseBranchContent);
    
    await this.page.waitForFunction((element) => {
      return element && element.children.length > 0;
    }, await branchContent.elementHandle(), { timeout: 5000 });
  }

  /**
   * ネスト条件を追加
   * @param {number} parentIndex - 親条件ブロックのインデックス
   * @param {string} branch - 追加先の分岐 ('true' | 'false')
   * @param {Object} nestedConditionData - ネスト条件データ
   */
  async addNestedCondition(parentIndex, branch, nestedConditionData) {
    const parentBlock = this.getConditionBlock(parentIndex);
    
    // 対象分岐内のネスト条件追加ボタンをクリック
    const branchContent = branch === 'true' ? 
      parentBlock.locator(this.selectors.trueBranchContent) :
      parentBlock.locator(this.selectors.falseBranchContent);
    
    const addNestedButton = branchContent.locator(this.selectors.addNestedCondition);
    await addNestedButton.click();
    
    // ネスト条件エディターの表示を待機
    await this.page.waitForSelector('.nested-condition-editor', { state: 'visible' });
    
    // ネスト条件を設定
    await this.handleNestedConditionDialog(nestedConditionData);
    
    // ネスト深度の確認
    await this.checkNestingLevel(parentBlock);
    
    return this;
  }

  /**
   * ネスト条件ダイアログを処理
   * @param {Object} nestedConditionData - ネスト条件データ
   */
  async handleNestedConditionDialog(nestedConditionData) {
    const { condition, trueActions = [], falseActions = [] } = nestedConditionData;
    
    // 条件文を入力
    if (condition) {
      await this.page.fill('.nested-condition-input', condition);
    }
    
    // TRUE/FALSE分岐のアクションを設定
    // 簡略化した実装（実際のUIに応じて調整）
    
    // ダイアログを確定
    await this.page.click('.nested-condition-confirm');
    
    return this;
  }

  /**
   * ネスト深度を確認
   * @param {Locator} conditionBlock - 条件ブロック
   * @returns {number} ネスト深度
   */
  async checkNestingLevel(conditionBlock) {
    const nestLevelElement = conditionBlock.locator(this.selectors.nestLevel);
    const levelText = await nestLevelElement.textContent();
    const level = parseInt(levelText) || 0;
    
    // 最大ネスト深度警告の確認
    if (level > 3) {
      const warning = conditionBlock.locator(this.selectors.maxNestWarning);
      await warning.waitFor({ state: 'visible' });
      console.warn(`Deep nesting detected: Level ${level}`);
    }
    
    return level;
  }

  /**
   * 条件ブロックを削除
   * @param {number} index - 条件ブロックのインデックス
   */
  async deleteConditionBlock(index) {
    const conditionBlock = this.getConditionBlock(index);
    const deleteButton = conditionBlock.locator(this.selectors.deleteButton);
    
    await deleteButton.click();
    
    // 確認ダイアログが表示される場合
    const confirmDialog = this.page.locator('.confirm-delete-condition');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-delete');
    }
    
    // 削除完了を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * 条件ブロックを複製
   * @param {number} index - 条件ブロックのインデックス
   */
  async duplicateConditionBlock(index) {
    const conditionBlock = this.getConditionBlock(index);
    const duplicateButton = conditionBlock.locator(this.selectors.duplicateButton);
    
    await duplicateButton.click();
    
    // 複製完了の確認
    const originalCount = await this.getConditionBlockCount();
    await this.page.waitForFunction((count) => {
      const currentCount = document.querySelectorAll('.condition-block').length;
      return currentCount === count + 1;
    }, originalCount, { timeout: 3000 });
    
    return this;
  }

  /**
   * 条件ブロックの位置を移動
   * @param {number} index - 条件ブロックのインデックス
   * @param {string} direction - 移動方向 ('up' | 'down')
   */
  async moveConditionBlock(index, direction) {
    const conditionBlock = this.getConditionBlock(index);
    const moveButton = direction === 'up' ? 
      conditionBlock.locator(this.selectors.moveUpButton) :
      conditionBlock.locator(this.selectors.moveDownButton);
    
    await moveButton.click();
    
    // 移動完了を待機
    await this.page.waitForTimeout(300);
    
    return this;
  }

  /**
   * 条件ブロックのデータを取得
   * @param {number} index - 条件ブロックのインデックス
   * @returns {Object} 条件ブロックのデータ
   */
  async getConditionBlockData(index) {
    const conditionBlock = this.getConditionBlock(index);
    
    const conditionText = await conditionBlock.locator(this.selectors.conditionText).textContent();
    const isExpanded = await conditionBlock.locator(this.selectors.expandedState).count() > 0;
    const trueActionCount = await conditionBlock.locator(`${this.selectors.trueActions} .action-item`).count();
    const falseActionCount = await conditionBlock.locator(`${this.selectors.falseActions} .action-item`).count();
    const nestLevel = await this.checkNestingLevel(conditionBlock);
    
    return {
      condition: conditionText.trim(),
      isExpanded,
      trueActionCount,
      falseActionCount,
      nestLevel,
      hasValidationError: await conditionBlock.locator(this.selectors.validationError).count() > 0
    };
  }

  /**
   * 分岐内のアクション数を取得
   * @param {number} index - 条件ブロックのインデックス
   * @param {string} branch - 分岐 ('true' | 'false')
   * @returns {number} アクション数
   */
  async getBranchActionCount(index, branch) {
    const conditionBlock = this.getConditionBlock(index);
    const actionsSelector = branch === 'true' ? 
      this.selectors.trueActions : 
      this.selectors.falseActions;
    
    return await conditionBlock.locator(`${actionsSelector} .action-item`).count();
  }

  /**
   * 条件ブロックの妥当性を検証
   * @param {number} index - 条件ブロックのインデックス
   * @returns {Object} 検証結果
   */
  async validateConditionBlock(index) {
    const conditionBlock = this.getConditionBlock(index);
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // 構文エラーの確認
    const syntaxError = conditionBlock.locator(this.selectors.syntaxError);
    if (await syntaxError.isVisible()) {
      validation.isValid = false;
      validation.errors.push(await syntaxError.textContent());
    }
    
    // 論理警告の確認
    const logicWarning = conditionBlock.locator(this.selectors.logicWarning);
    if (await logicWarning.isVisible()) {
      validation.warnings.push(await logicWarning.textContent());
    }
    
    return validation;
  }

  /**
   * 条件ブロックのプレビューを取得
   * @param {number} index - 条件ブロックのインデックス
   * @returns {Object} プレビューデータ
   */
  async getConditionBlockPreview(index) {
    const conditionBlock = this.getConditionBlock(index);
    
    const conditionPreview = conditionBlock.locator(this.selectors.conditionPreview);
    const plantUMLPreview = conditionBlock.locator(this.selectors.plantUMLPreview);
    
    return {
      condition: await conditionPreview.textContent(),
      plantUML: await plantUMLPreview.textContent(),
      visible: await conditionPreview.isVisible()
    };
  }

  /**
   * 複雑な条件ブロックのパフォーマンステスト
   * @param {Object} complexConditionData - 複雑な条件データ
   * @returns {Object} パフォーマンス測定結果
   */
  async measureComplexConditionPerformance(complexConditionData) {
    const startTime = Date.now();
    
    const {
      condition = 'ユーザーが認証済み かつ 権限レベル >= 3',
      trueActions = [
        { actorFrom: 'システム', arrowType: 'sync', actorTo: 'データベース', message: 'データ取得' }
      ],
      falseActions = [
        { actorFrom: 'システム', arrowType: 'sync', actorTo: 'ユーザー', message: 'エラー通知' }
      ],
      nestedConditions = []
    } = complexConditionData;
    
    // 条件設定
    await this.setCondition(0, condition);
    const conditionTime = Date.now() - startTime;
    
    // TRUE分岐アクション追加
    const trueStart = Date.now();
    for (const action of trueActions) {
      await this.addActionToTrueBranch(0, action);
    }
    const trueTime = Date.now() - trueStart;
    
    // FALSE分岐アクション追加
    const falseStart = Date.now();
    for (const action of falseActions) {
      await this.addActionToFalseBranch(0, action);
    }
    const falseTime = Date.now() - falseStart;
    
    // ネスト条件追加
    const nestStart = Date.now();
    for (const nestedCondition of nestedConditions) {
      await this.addNestedCondition(0, 'true', nestedCondition);
    }
    const nestTime = Date.now() - nestStart;
    
    return {
      totalTime: Date.now() - startTime,
      conditionTime,
      trueTime,
      falseTime,
      nestTime,
      actionCount: trueActions.length + falseActions.length,
      nestCount: nestedConditions.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 一括操作: 複数条件ブロックの設定
   * @param {Array} conditionsData - 条件ブロックデータの配列
   */
  async setBulkConditionBlocks(conditionsData) {
    for (let i = 0; i < conditionsData.length; i++) {
      const conditionData = conditionsData[i];
      
      // 条件文を設定
      await this.setCondition(i, conditionData.condition);
      
      // TRUE分岐のアクションを追加
      if (conditionData.trueActions) {
        for (const action of conditionData.trueActions) {
          await this.addActionToTrueBranch(i, action);
        }
      }
      
      // FALSE分岐のアクションを追加
      if (conditionData.falseActions) {
        for (const action of conditionData.falseActions) {
          await this.addActionToFalseBranch(i, action);
        }
      }
      
      // 次の条件ブロックへの移動前に待機
      await this.page.waitForTimeout(100);
    }
    
    return this;
  }
}

// デフォルトエクスポート
export default ConditionBlockComponent;