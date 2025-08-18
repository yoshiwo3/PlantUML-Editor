/**
 * ConditionEditorPage - 条件分岐編集専用ページオブジェクト
 * Sprint3 TEST-005-2実装
 * 
 * 機能:
 * - 条件分岐ブロックの編集
 * - TRUE/FALSE分岐の管理
 * - ネストした条件の処理
 * - インライン条件編集
 */

import { Page } from '@playwright/test';

export class ConditionEditorPage {
  constructor(page) {
    this.page = page;
    
    // 条件分岐編集専用セレクタ
    this.selectors = {
      // メインコンテナ
      conditionEditor: '[data-testid="condition-editor"]',
      conditionBlock: '[data-testid="condition-block"]',
      conditionModal: '[data-testid="condition-modal"]',
      
      // ヘッダー部分（設計書準拠: 🔀 条件分岐）
      blockHeader: '[data-testid="condition-header"]',
      blockIcon: '[data-testid="condition-icon"]', // 🔀
      blockLabel: '[data-testid="condition-label"]', // "条件分岐:"
      expandIcon: '[data-testid="expand-icon"]', // ▶
      collapseIcon: '[data-testid="collapse-icon"]', // ▼
      
      // 条件入力
      conditionInput: '[data-testid="condition-input"]',
      conditionTextarea: '[data-testid="condition-textarea"]',
      conditionPreview: '[data-testid="condition-preview"]',
      
      // TRUE分岐（設計書準拠: ✅ TRUE分岐）
      trueBranch: '[data-testid="true-branch"]',
      trueBranchIcon: '[data-testid="true-branch-icon"]', // ✅
      trueBranchLabel: '[data-testid="true-branch-label"]', // "TRUE分岐"
      trueBranchContent: '[data-testid="true-branch-content"]',
      trueBranchActions: '[data-testid="true-branch-actions"]',
      
      // FALSE分岐（設計書準拠: ❌ FALSE分岐）
      falseBranch: '[data-testid="false-branch"]',
      falseBranchIcon: '[data-testid="false-branch-icon"]', // ❌
      falseBranchLabel: '[data-testid="false-branch-label"]', // "FALSE分岐"
      falseBranchContent: '[data-testid="false-branch-content"]',
      falseBranchActions: '[data-testid="false-branch-actions"]',
      
      // ネスト条件
      nestedCondition: '[data-testid="nested-condition"]',
      nestedLevel: '[data-testid="nested-level"]',
      maxNestWarning: '[data-testid="max-nest-warning"]',
      
      // アクション追加
      addActionToTrue: '[data-testid="add-action-to-true"]',
      addActionToFalse: '[data-testid="add-action-to-false"]',
      addNestedCondition: '[data-testid="add-nested-condition"]',
      
      // 条件テンプレート
      conditionTemplates: '[data-testid="condition-templates"]',
      templateButton: '[data-template]',
      customConditionButton: '[data-testid="custom-condition"]',
      
      // 操作ボタン
      confirmCondition: '[data-testid="confirm-condition"]',
      cancelCondition: '[data-testid="cancel-condition"]',
      deleteCondition: '[data-testid="delete-condition"]',
      duplicateCondition: '[data-testid="duplicate-condition"]',
      
      // バリデーション
      conditionValidation: '[data-testid="condition-validation"]',
      syntaxError: '[data-testid="syntax-error"]',
      logicWarning: '[data-testid="logic-warning"]',
      
      // プレビュー
      plantUMLPreview: '[data-testid="condition-plantuml-preview"]',
      branchFlow: '[data-testid="branch-flow-preview"]'
    };

    // 条件テンプレート（よく使用される条件パターン）
    this.conditionTemplates = {
      authentication: {
        japanese: 'ユーザーが認証済み',
        english: 'User is authenticated',
        category: 'auth'
      },
      dataExists: {
        japanese: 'データが存在する',
        english: 'Data exists',
        category: 'data'
      },
      permissionCheck: {
        japanese: '権限がある',
        english: 'Has permission',
        category: 'auth'
      },
      networkAvailable: {
        japanese: 'ネットワーク接続が可能',
        english: 'Network available',
        category: 'system'
      },
      validInput: {
        japanese: '入力値が正常',
        english: 'Input is valid',
        category: 'validation'
      }
    };
  }

  /**
   * 条件編集画面を開く
   * @param {string} mode - 編集モード ('new', 'edit', 'inline')
   * @param {number} conditionIndex - 編集する条件のインデックス
   */
  async openConditionEditor(mode = 'new', conditionIndex = null) {
    if (mode === 'new') {
      await this.page.click('[data-testid="add-condition-button"]');
    } else if (mode === 'edit' && conditionIndex !== null) {
      await this.page.click(`[data-condition-index="${conditionIndex}"] .edit-button`);
    } else if (mode === 'inline' && conditionIndex !== null) {
      await this.page.dblclick(`[data-condition-index="${conditionIndex}"] .condition-header`);
    }
    
    // エディターの表示を待機
    const editorSelector = mode === 'inline' ? this.selectors.conditionBlock : this.selectors.conditionModal;
    await this.page.waitForSelector(editorSelector, { state: 'visible' });
    
    return this;
  }

  /**
   * 基本的な条件分岐を設定
   * @param {Object} conditionData - 条件分岐の設定
   */
  async setBasicCondition(conditionData) {
    const {
      condition,
      trueActions = [],
      falseActions = [],
      template = null
    } = conditionData;

    // テンプレートを使用する場合
    if (template && this.conditionTemplates[template]) {
      await this.useConditionTemplate(template);
    } else if (condition) {
      // カスタム条件を入力
      await this.setConditionText(condition);
    }

    // TRUE分岐のアクションを追加
    for (const action of trueActions) {
      await this.addActionToTrueBranch(action);
    }

    // FALSE分岐のアクションを追加
    for (const action of falseActions) {
      await this.addActionToFalseBranch(action);
    }

    // バリデーション完了を待機
    await this.waitForValidation();

    return this;
  }

  /**
   * 条件テンプレートを使用
   * @param {string} templateKey - テンプレートキー
   */
  async useConditionTemplate(templateKey) {
    const template = this.conditionTemplates[templateKey];
    if (!template) {
      throw new Error(`Unknown condition template: ${templateKey}`);
    }

    // テンプレート選択エリアを展開
    await this.page.click(this.selectors.conditionTemplates);

    // 特定のテンプレートを選択
    await this.page.click(`[data-template="${templateKey}"]`);

    // テンプレート適用の完了を待機
    await this.waitForConditionUpdate();

    return this;
  }

  /**
   * 条件文を手動入力
   * @param {string} conditionText - 条件文
   */
  async setConditionText(conditionText) {
    // カスタム条件ボタンをクリック
    await this.page.click(this.selectors.customConditionButton);

    // 条件入力フィールドに入力
    const conditionInput = this.page.locator(this.selectors.conditionInput);
    await conditionInput.clear();
    await conditionInput.type(conditionText, { delay: 50 });

    // 入力確定
    await this.page.press(this.selectors.conditionInput, 'Enter');

    // 条件解析の完了を待機
    await this.waitForConditionUpdate();

    return this;
  }

  /**
   * TRUE分岐にアクションを追加
   * @param {Object} actionData - アクションデータ
   */
  async addActionToTrueBranch(actionData) {
    // TRUE分岐エリア内のアクション追加ボタンをクリック
    await this.page.click(this.selectors.addActionToTrue);

    // アクション編集ダイアログの表示を待機
    await this.page.waitForSelector('.action-editor-dialog', { state: 'visible' });

    // アクションデータを設定
    await this.setActionInBranch(actionData);

    // アクション追加の確定
    await this.page.click('.confirm-action-in-branch');

    // TRUE分岐の更新を待機
    await this.waitForBranchUpdate('true');

    return this;
  }

  /**
   * FALSE分岐にアクションを追加
   * @param {Object} actionData - アクションデータ
   */
  async addActionToFalseBranch(actionData) {
    // FALSE分岐エリア内のアクション追加ボタンをクリック
    await this.page.click(this.selectors.addActionToFalse);

    // アクション編集ダイアログの表示を待機
    await this.page.waitForSelector('.action-editor-dialog', { state: 'visible' });

    // アクションデータを設定
    await this.setActionInBranch(actionData);

    // アクション追加の確定
    await this.page.click('.confirm-action-in-branch');

    // FALSE分岐の更新を待機
    await this.waitForBranchUpdate('false');

    return this;
  }

  /**
   * 分岐内のアクションを設定
   * @param {Object} actionData - アクションデータ
   */
  async setActionInBranch(actionData) {
    const { actorFrom, arrowType, actorTo, message } = actionData;

    if (actorFrom) {
      await this.page.selectOption('.branch-action-from', actorFrom);
    }
    if (arrowType) {
      await this.page.selectOption('.branch-action-arrow', arrowType);
    }
    if (actorTo) {
      await this.page.selectOption('.branch-action-to', actorTo);
    }
    if (message) {
      await this.page.fill('.branch-action-message', message);
    }

    return this;
  }

  /**
   * ネストした条件を追加
   * @param {Object} nestedConditionData - ネスト条件のデータ
   * @param {string} parentBranch - 親の分岐 ('true' | 'false')
   */
  async addNestedCondition(nestedConditionData, parentBranch = 'true') {
    const parentSelector = parentBranch === 'true' ? 
      this.selectors.trueBranchContent : 
      this.selectors.falseBranchContent;

    // 親分岐内のネスト条件追加ボタンをクリック
    await this.page.click(`${parentSelector} ${this.selectors.addNestedCondition}`);

    // ネスト条件エディターの表示を待機
    await this.page.waitForSelector('.nested-condition-editor', { state: 'visible' });

    // ネスト深度の確認
    await this.checkNestingLevel();

    // ネスト条件を設定
    await this.setBasicCondition(nestedConditionData);

    return this;
  }

  /**
   * ネスト深度をチェック
   */
  async checkNestingLevel() {
    const nestLevel = await this.page.locator(this.selectors.nestedLevel).textContent();
    const level = parseInt(nestLevel);

    if (level > 3) {
      // 最大ネスト深度警告の表示確認
      await this.page.waitForSelector(this.selectors.maxNestWarning, { state: 'visible' });
      console.warn(`Deep nesting detected: Level ${level}`);
    }

    return level;
  }

  /**
   * 条件ブロックを展開/折りたたみ
   * @param {boolean} expand - true: 展開, false: 折りたたみ
   */
  async toggleConditionBlock(expand = true) {
    const currentState = await this.page.locator(this.selectors.expandIcon).isVisible();
    const needsToggle = (expand && currentState) || (!expand && !currentState);

    if (needsToggle) {
      await this.page.click(this.selectors.blockHeader);
      
      // 状態変更の完了を待機
      const targetIcon = expand ? this.selectors.collapseIcon : this.selectors.expandIcon;
      await this.page.waitForSelector(targetIcon, { state: 'visible' });
    }

    return this;
  }

  /**
   * 条件の妥当性を検証
   * @returns {Object} 検証結果
   */
  async validateCondition() {
    // バリデーション結果の取得
    const validationElement = this.page.locator(this.selectors.conditionValidation);
    
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 構文エラーの確認
    const syntaxError = this.page.locator(this.selectors.syntaxError);
    if (await syntaxError.isVisible()) {
      result.isValid = false;
      result.errors.push(await syntaxError.textContent());
    }

    // 論理警告の確認
    const logicWarning = this.page.locator(this.selectors.logicWarning);
    if (await logicWarning.isVisible()) {
      result.warnings.push(await logicWarning.textContent());
    }

    return result;
  }

  /**
   * 条件更新の完了を待機
   */
  async waitForConditionUpdate() {
    // 条件プレビューの更新を待機
    await this.page.waitForFunction(() => {
      const preview = document.querySelector('[data-testid="condition-preview"]');
      return preview && preview.textContent.length > 0;
    }, { timeout: 5000 });

    // PlantUMLプレビューの更新を待機
    await this.waitForPlantUMLUpdate();
  }

  /**
   * PlantUMLプレビューの更新を待機
   */
  async waitForPlantUMLUpdate() {
    await this.page.waitForFunction(() => {
      const preview = document.querySelector('[data-testid="condition-plantuml-preview"]');
      return preview && preview.textContent.includes('alt');
    }, { timeout: 5000 });
  }

  /**
   * 分岐更新の完了を待機
   * @param {string} branch - 更新対象の分岐 ('true' | 'false')
   */
  async waitForBranchUpdate(branch) {
    const branchSelector = branch === 'true' ? 
      this.selectors.trueBranchContent : 
      this.selectors.falseBranchContent;

    // 分岐内容の更新を待機
    await this.page.waitForFunction((selector) => {
      const element = document.querySelector(selector);
      return element && element.children.length > 0;
    }, branchSelector, { timeout: 5000 });
  }

  /**
   * バリデーション完了を待機
   */
  async waitForValidation() {
    await this.page.waitForFunction(() => {
      const validating = document.querySelector('.validating-condition');
      return !validating || !validating.classList.contains('validating');
    }, { timeout: 5000 });
  }

  /**
   * 条件分岐のプレビューを取得
   * @returns {Object} プレビューデータ
   */
  async getConditionPreview() {
    const preview = this.page.locator(this.selectors.conditionPreview);
    const plantUMLPreview = this.page.locator(this.selectors.plantUMLPreview);
    
    return {
      condition: await preview.textContent(),
      plantUML: await plantUMLPreview.textContent(),
      trueBranchCount: await this.getBranchActionCount('true'),
      falseBranchCount: await this.getBranchActionCount('false')
    };
  }

  /**
   * 分岐内のアクション数を取得
   * @param {string} branch - 分岐 ('true' | 'false')
   * @returns {number} アクション数
   */
  async getBranchActionCount(branch) {
    const branchSelector = branch === 'true' ? 
      this.selectors.trueBranchActions : 
      this.selectors.falseBranchActions;
    
    const actions = await this.page.locator(`${branchSelector} .action-item`).count();
    return actions;
  }

  /**
   * 条件分岐を確定
   */
  async confirmCondition() {
    await this.page.click(this.selectors.confirmCondition);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.conditionModal, { state: 'hidden' });
    
    // メインエディターの更新を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * 条件分岐編集をキャンセル
   */
  async cancelCondition() {
    await this.page.click(this.selectors.cancelCondition);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.conditionModal, { state: 'hidden' });
    
    return this;
  }

  /**
   * 条件分岐を削除
   */
  async deleteCondition() {
    await this.page.click(this.selectors.deleteCondition);
    
    // 確認ダイアログの表示と対応
    const confirmDialog = this.page.locator('.confirm-delete-condition');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-delete');
    }
    
    // 削除完了を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * 条件分岐を複製
   */
  async duplicateCondition() {
    await this.page.click(this.selectors.duplicateCondition);
    
    // 複製完了の確認
    await this.page.waitForSelector('.condition-block:last-child', { state: 'visible' });
    
    return this;
  }

  /**
   * 条件分岐の構造を取得
   * @returns {Object} 条件分岐の完全な構造
   */
  async getConditionStructure() {
    const structure = {
      condition: await this.page.locator(this.selectors.conditionInput).inputValue(),
      trueBranch: {
        actions: await this.getBranchActions('true'),
        nestedConditions: await this.getNestedConditions('true')
      },
      falseBranch: {
        actions: await this.getBranchActions('false'),
        nestedConditions: await this.getNestedConditions('false')
      },
      nestLevel: await this.getCurrentNestLevel()
    };

    return structure;
  }

  /**
   * 分岐内のアクションを取得
   * @param {string} branch - 分岐 ('true' | 'false')
   * @returns {Array} アクションリスト
   */
  async getBranchActions(branch) {
    const branchSelector = branch === 'true' ? 
      this.selectors.trueBranchActions : 
      this.selectors.falseBranchActions;
    
    const actionElements = await this.page.locator(`${branchSelector} .action-item`).all();
    const actions = [];

    for (const element of actionElements) {
      const actionData = await this.extractActionData(element);
      actions.push(actionData);
    }

    return actions;
  }

  /**
   * アクション要素からデータを抽出
   * @param {Locator} element - アクション要素
   * @returns {Object} アクションデータ
   */
  async extractActionData(element) {
    return {
      actorFrom: await element.locator('.actor-from').textContent(),
      arrowType: await element.locator('.arrow-type').textContent(),
      actorTo: await element.locator('.actor-to').textContent(),
      message: await element.locator('.message').textContent()
    };
  }

  /**
   * ネストした条件を取得
   * @param {string} branch - 分岐 ('true' | 'false')
   * @returns {Array} ネスト条件リスト
   */
  async getNestedConditions(branch) {
    const branchSelector = branch === 'true' ? 
      this.selectors.trueBranchContent : 
      this.selectors.falseBranchContent;
    
    const nestedElements = await this.page.locator(`${branchSelector} .nested-condition`).all();
    const nestedConditions = [];

    for (const element of nestedElements) {
      // 再帰的にネスト条件を解析
      const nestedData = await this.extractNestedConditionData(element);
      nestedConditions.push(nestedData);
    }

    return nestedConditions;
  }

  /**
   * ネスト条件のデータを抽出
   * @param {Locator} element - ネスト条件要素
   * @returns {Object} ネスト条件データ
   */
  async extractNestedConditionData(element) {
    // 簡略化した実装
    return {
      condition: await element.locator('.nested-condition-text').textContent(),
      level: await element.getAttribute('data-nest-level')
    };
  }

  /**
   * 現在のネストレベルを取得
   * @returns {number} ネストレベル
   */
  async getCurrentNestLevel() {
    const levelElement = this.page.locator(this.selectors.nestedLevel);
    const levelText = await levelElement.textContent();
    return parseInt(levelText) || 0;
  }

  /**
   * 複雑な条件分岐のパフォーマンステスト
   * @returns {Object} パフォーマンス測定結果
   */
  async measureComplexConditionPerformance() {
    const startTime = Date.now();

    // 複雑な条件を設定
    const complexCondition = {
      condition: 'ユーザーが認証済み かつ 権限レベル >= 3 かつ データ存在',
      trueActions: [
        { actorFrom: 'システム', arrowType: 'sync', actorTo: 'データベース', message: 'データ取得' },
        { actorFrom: 'データベース', arrowType: 'return', actorTo: 'システム', message: 'データ返却' }
      ],
      falseActions: [
        { actorFrom: 'システム', arrowType: 'sync', actorTo: 'ユーザー', message: 'エラー通知' }
      ]
    };

    await this.setBasicCondition(complexCondition);
    const setupTime = Date.now() - startTime;

    // ネスト条件を追加
    const nestStart = Date.now();
    await this.addNestedCondition({
      condition: 'データが正常',
      trueActions: [{ actorFrom: 'システム', arrowType: 'sync', actorTo: 'ユーザー', message: '処理完了' }]
    });
    const nestTime = Date.now() - nestStart;

    return {
      totalTime: Date.now() - startTime,
      setupTime,
      nestTime,
      timestamp: new Date().toISOString()
    };
  }
}

// デフォルトエクスポート
export default ConditionEditorPage;