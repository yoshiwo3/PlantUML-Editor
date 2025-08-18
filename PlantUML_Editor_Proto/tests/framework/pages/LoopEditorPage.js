/**
 * LoopEditorPage - ループ編集専用ページオブジェクト
 * Sprint3 TEST-005-2実装
 * 
 * 機能:
 * - ループブロックの編集
 * - ループ条件の設定
 * - ループ内アクションの管理
 * - 無限ループ検出
 */

import { Page } from '@playwright/test';

export class LoopEditorPage {
  constructor(page) {
    this.page = page;
    
    // ループ編集専用セレクタ
    this.selectors = {
      // メインコンテナ
      loopEditor: '[data-testid="loop-editor"]',
      loopBlock: '[data-testid="loop-block"]',
      loopModal: '[data-testid="loop-modal"]',
      
      // ヘッダー部分（設計書準拠: 🔁 ループ）
      blockHeader: '[data-testid="loop-header"]',
      blockIcon: '[data-testid="loop-icon"]', // 🔁
      blockLabel: '[data-testid="loop-label"]', // "ループ:"
      expandIcon: '[data-testid="expand-icon"]',
      collapseIcon: '[data-testid="collapse-icon"]',
      
      // ループ条件入力
      conditionInput: '[data-testid="loop-condition-input"]',
      conditionTextarea: '[data-testid="loop-condition-textarea"]',
      conditionPreview: '[data-testid="loop-condition-preview"]',
      conditionPlaceholder: '[data-testid="condition-placeholder"]',
      
      // ループタイプ
      loopTypeSelector: '[data-testid="loop-type-selector"]',
      whileLoop: '[data-value="while"]',
      forLoop: '[data-value="for"]',
      doWhileLoop: '[data-value="do-while"]',
      forEachLoop: '[data-value="foreach"]',
      
      // ループ内容
      loopContent: '[data-testid="loop-content"]',
      loopActions: '[data-testid="loop-actions"]',
      loopBody: '[data-testid="loop-body"]',
      
      // アクション管理
      addActionToLoop: '[data-testid="add-action-to-loop"]',
      actionList: '[data-testid="loop-action-list"]',
      actionItem: '.loop-action-item',
      
      // ループ制御
      breakCondition: '[data-testid="break-condition"]',
      continueCondition: '[data-testid="continue-condition"]',
      loopCounter: '[data-testid="loop-counter"]',
      maxIterations: '[data-testid="max-iterations"]',
      
      // 条件テンプレート
      conditionTemplates: '[data-testid="loop-condition-templates"]',
      templateButton: '[data-template]',
      customConditionButton: '[data-testid="custom-loop-condition"]',
      
      // バリデーション
      loopValidation: '[data-testid="loop-validation"]',
      infiniteLoopWarning: '[data-testid="infinite-loop-warning"]',
      conditionError: '[data-testid="condition-error"]',
      performanceWarning: '[data-testid="performance-warning"]',
      
      // 操作ボタン
      confirmLoop: '[data-testid="confirm-loop"]',
      cancelLoop: '[data-testid="cancel-loop"]',
      deleteLoop: '[data-testid="delete-loop"]',
      duplicateLoop: '[data-testid="duplicate-loop"]',
      
      // プレビュー
      plantUMLPreview: '[data-testid="loop-plantuml-preview"]',
      flowPreview: '[data-testid="loop-flow-preview"]',
      iterationPreview: '[data-testid="iteration-preview"]'
    };

    // ループ条件テンプレート
    this.loopTemplates = {
      dataLoop: {
        japanese: 'データが存在する',
        english: 'Data exists',
        type: 'while',
        category: 'data'
      },
      countLoop: {
        japanese: '回数 < 10',
        english: 'count < 10',
        type: 'for',
        category: 'counter'
      },
      statusLoop: {
        japanese: '処理が完了していない',
        english: 'Processing not complete',
        type: 'while',
        category: 'status'
      },
      userInputLoop: {
        japanese: 'ユーザー入力を待機',
        english: 'Waiting for user input',
        type: 'while',
        category: 'input'
      },
      apiCallLoop: {
        japanese: 'API呼び出しが成功するまで',
        english: 'Until API call succeeds',
        type: 'do-while',
        category: 'api'
      },
      itemLoop: {
        japanese: 'アイテムごとに処理',
        english: 'Process each item',
        type: 'foreach',
        category: 'iteration'
      }
    };

    // ループタイプの設定
    this.loopTypes = {
      while: {
        label: 'While ループ',
        description: '条件を満たす間繰り返し',
        plantUMLKeyword: 'loop'
      },
      for: {
        label: 'For ループ',
        description: '指定回数繰り返し',
        plantUMLKeyword: 'loop'
      },
      doWhile: {
        label: 'Do-While ループ',
        description: '最低1回実行後、条件チェック',
        plantUMLKeyword: 'loop'
      },
      foreach: {
        label: 'ForEach ループ',
        description: 'コレクションの各要素に対して実行',
        plantUMLKeyword: 'loop'
      }
    };
  }

  /**
   * ループ編集画面を開く
   * @param {string} mode - 編集モード ('new', 'edit', 'inline')
   * @param {number} loopIndex - 編集するループのインデックス
   */
  async openLoopEditor(mode = 'new', loopIndex = null) {
    if (mode === 'new') {
      await this.page.click('[data-testid="add-loop-button"]');
    } else if (mode === 'edit' && loopIndex !== null) {
      await this.page.click(`[data-loop-index="${loopIndex}"] .edit-button`);
    } else if (mode === 'inline' && loopIndex !== null) {
      await this.page.dblclick(`[data-loop-index="${loopIndex}"] .loop-header`);
    }
    
    // エディターの表示を待機
    const editorSelector = mode === 'inline' ? this.selectors.loopBlock : this.selectors.loopModal;
    await this.page.waitForSelector(editorSelector, { state: 'visible' });
    
    return this;
  }

  /**
   * 基本的なループを設定
   * @param {Object} loopData - ループの設定
   */
  async setBasicLoop(loopData) {
    const {
      condition,
      type = 'while',
      actions = [],
      maxIterations = null,
      breakCondition = null,
      template = null
    } = loopData;

    // ループタイプを設定
    await this.setLoopType(type);

    // テンプレートまたはカスタム条件を設定
    if (template && this.loopTemplates[template]) {
      await this.useLoopTemplate(template);
    } else if (condition) {
      await this.setLoopCondition(condition);
    }

    // 最大反復回数を設定
    if (maxIterations) {
      await this.setMaxIterations(maxIterations);
    }

    // ループ内アクションを追加
    for (const action of actions) {
      await this.addActionToLoop(action);
    }

    // Break条件を設定
    if (breakCondition) {
      await this.setBreakCondition(breakCondition);
    }

    // バリデーション完了を待機
    await this.waitForValidation();

    return this;
  }

  /**
   * ループタイプを設定
   * @param {string} type - ループタイプ
   */
  async setLoopType(type) {
    if (!this.loopTypes[type]) {
      throw new Error(`Unknown loop type: ${type}`);
    }

    await this.page.click(this.selectors.loopTypeSelector);
    await this.page.click(`[data-value="${type}"]`);

    // タイプ変更の反映を待機
    await this.waitForLoopTypeUpdate();

    return this;
  }

  /**
   * ループ条件テンプレートを使用
   * @param {string} templateKey - テンプレートキー
   */
  async useLoopTemplate(templateKey) {
    const template = this.loopTemplates[templateKey];
    if (!template) {
      throw new Error(`Unknown loop template: ${templateKey}`);
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
   * ループ条件を手動入力
   * @param {string} condition - ループ条件
   */
  async setLoopCondition(condition) {
    // カスタム条件ボタンをクリック
    await this.page.click(this.selectors.customConditionButton);

    // 条件入力フィールドに入力
    const conditionInput = this.page.locator(this.selectors.conditionInput);
    await conditionInput.clear();
    await conditionInput.type(condition, { delay: 50 });

    // 入力確定
    await this.page.press(this.selectors.conditionInput, 'Enter');

    // 条件解析の完了を待機
    await this.waitForConditionUpdate();

    return this;
  }

  /**
   * 最大反復回数を設定
   * @param {number} maxIter - 最大反復回数
   */
  async setMaxIterations(maxIter) {
    const maxIterInput = this.page.locator(this.selectors.maxIterations);
    await maxIterInput.clear();
    await maxIterInput.fill(maxIter.toString());

    // 無限ループ検出の確認
    await this.checkInfiniteLoopWarning();

    return this;
  }

  /**
   * ループ内にアクションを追加
   * @param {Object} actionData - アクションデータ
   */
  async addActionToLoop(actionData) {
    // ループ内アクション追加ボタンをクリック
    await this.page.click(this.selectors.addActionToLoop);

    // アクション編集ダイアログの表示を待機
    await this.page.waitForSelector('.loop-action-editor', { state: 'visible' });

    // アクションデータを設定
    await this.setActionInLoop(actionData);

    // アクション追加の確定
    await this.page.click('.confirm-loop-action');

    // ループ内容の更新を待機
    await this.waitForLoopContentUpdate();

    return this;
  }

  /**
   * ループ内のアクションを設定
   * @param {Object} actionData - アクションデータ
   */
  async setActionInLoop(actionData) {
    const { actorFrom, arrowType, actorTo, message } = actionData;

    if (actorFrom) {
      await this.page.selectOption('.loop-action-from', actorFrom);
    }
    if (arrowType) {
      await this.page.selectOption('.loop-action-arrow', arrowType);
    }
    if (actorTo) {
      await this.page.selectOption('.loop-action-to', actorTo);
    }
    if (message) {
      await this.page.fill('.loop-action-message', message);
    }

    return this;
  }

  /**
   * Break条件を設定
   * @param {string} breakCondition - Break条件
   */
  async setBreakCondition(breakCondition) {
    const breakInput = this.page.locator(this.selectors.breakCondition);
    await breakInput.clear();
    await breakInput.type(breakCondition, { delay: 50 });

    // Break条件の妥当性を確認
    await this.validateBreakCondition();

    return this;
  }

  /**
   * Continue条件を設定
   * @param {string} continueCondition - Continue条件
   */
  async setContinueCondition(continueCondition) {
    const continueInput = this.page.locator(this.selectors.continueCondition);
    await continueInput.clear();
    await continueInput.type(continueCondition, { delay: 50 });

    return this;
  }

  /**
   * ループブロックを展開/折りたたみ
   * @param {boolean} expand - true: 展開, false: 折りたたみ
   */
  async toggleLoopBlock(expand = true) {
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
   * 無限ループ警告をチェック
   */
  async checkInfiniteLoopWarning() {
    const warningElement = this.page.locator(this.selectors.infiniteLoopWarning);
    
    if (await warningElement.isVisible()) {
      const warningText = await warningElement.textContent();
      console.warn('Infinite loop warning:', warningText);
      return true;
    }
    
    return false;
  }

  /**
   * Break条件の妥当性を検証
   */
  async validateBreakCondition() {
    // Break条件が設定されている場合の妥当性チェック
    const breakCondition = await this.page.locator(this.selectors.breakCondition).inputValue();
    
    if (breakCondition) {
      // 簡単な構文チェック
      const validSyntax = breakCondition.length > 0 && !breakCondition.includes(';;');
      
      if (!validSyntax) {
        console.warn('Invalid break condition syntax:', breakCondition);
      }
      
      return validSyntax;
    }
    
    return true;
  }

  /**
   * ループの妥当性を検証
   * @returns {Object} 検証結果
   */
  async validateLoop() {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 条件エラーの確認
    const conditionError = this.page.locator(this.selectors.conditionError);
    if (await conditionError.isVisible()) {
      result.isValid = false;
      result.errors.push(await conditionError.textContent());
    }

    // 無限ループ警告の確認
    if (await this.checkInfiniteLoopWarning()) {
      result.warnings.push('Infinite loop potential detected');
    }

    // パフォーマンス警告の確認
    const perfWarning = this.page.locator(this.selectors.performanceWarning);
    if (await perfWarning.isVisible()) {
      result.warnings.push(await perfWarning.textContent());
    }

    return result;
  }

  /**
   * ループタイプ更新の完了を待機
   */
  async waitForLoopTypeUpdate() {
    await this.page.waitForFunction(() => {
      const selector = document.querySelector('[data-testid="loop-type-selector"]');
      return selector && !selector.classList.contains('updating');
    }, { timeout: 3000 });
  }

  /**
   * 条件更新の完了を待機
   */
  async waitForConditionUpdate() {
    // 条件プレビューの更新を待機
    await this.page.waitForFunction(() => {
      const preview = document.querySelector('[data-testid="loop-condition-preview"]');
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
      const preview = document.querySelector('[data-testid="loop-plantuml-preview"]');
      return preview && preview.textContent.includes('loop');
    }, { timeout: 5000 });
  }

  /**
   * ループ内容更新の完了を待機
   */
  async waitForLoopContentUpdate() {
    await this.page.waitForFunction(() => {
      const content = document.querySelector('[data-testid="loop-content"]');
      return content && content.children.length > 0;
    }, { timeout: 5000 });
  }

  /**
   * バリデーション完了を待機
   */
  async waitForValidation() {
    await this.page.waitForFunction(() => {
      const validating = document.querySelector('.validating-loop');
      return !validating || !validating.classList.contains('validating');
    }, { timeout: 5000 });
  }

  /**
   * ループのプレビューを取得
   * @returns {Object} プレビューデータ
   */
  async getLoopPreview() {
    const conditionPreview = this.page.locator(this.selectors.conditionPreview);
    const plantUMLPreview = this.page.locator(this.selectors.plantUMLPreview);
    const iterationPreview = this.page.locator(this.selectors.iterationPreview);
    
    return {
      condition: await conditionPreview.textContent(),
      plantUML: await plantUMLPreview.textContent(),
      iterationCount: await iterationPreview.textContent(),
      actionCount: await this.getLoopActionCount()
    };
  }

  /**
   * ループ内のアクション数を取得
   * @returns {number} アクション数
   */
  async getLoopActionCount() {
    const actions = await this.page.locator(`${this.selectors.loopActions} .action-item`).count();
    return actions;
  }

  /**
   * ループ内のアクションリストを取得
   * @returns {Array} アクションリスト
   */
  async getLoopActions() {
    const actionElements = await this.page.locator(`${this.selectors.actionList} ${this.selectors.actionItem}`).all();
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
   * ループを確定
   */
  async confirmLoop() {
    await this.page.click(this.selectors.confirmLoop);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.loopModal, { state: 'hidden' });
    
    // メインエディターの更新を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * ループ編集をキャンセル
   */
  async cancelLoop() {
    await this.page.click(this.selectors.cancelLoop);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.loopModal, { state: 'hidden' });
    
    return this;
  }

  /**
   * ループを削除
   */
  async deleteLoop() {
    await this.page.click(this.selectors.deleteLoop);
    
    // 確認ダイアログの表示と対応
    const confirmDialog = this.page.locator('.confirm-delete-loop');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-delete');
    }
    
    // 削除完了を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * ループを複製
   */
  async duplicateLoop() {
    await this.page.click(this.selectors.duplicateLoop);
    
    // 複製完了の確認
    await this.page.waitForSelector('.loop-block:last-child', { state: 'visible' });
    
    return this;
  }

  /**
   * ループの完全な構造を取得
   * @returns {Object} ループの構造
   */
  async getLoopStructure() {
    const structure = {
      type: await this.page.locator(this.selectors.loopTypeSelector).inputValue(),
      condition: await this.page.locator(this.selectors.conditionInput).inputValue(),
      maxIterations: await this.page.locator(this.selectors.maxIterations).inputValue(),
      breakCondition: await this.page.locator(this.selectors.breakCondition).inputValue(),
      continueCondition: await this.page.locator(this.selectors.continueCondition).inputValue(),
      actions: await this.getLoopActions(),
      validation: await this.validateLoop()
    };

    return structure;
  }

  /**
   * 複雑なループのパフォーマンステスト
   * @returns {Object} パフォーマンス測定結果
   */
  async measureComplexLoopPerformance() {
    const startTime = Date.now();

    // 複雑なループを設定
    const complexLoop = {
      type: 'while',
      condition: 'データ処理が完了していない かつ エラー回数 < 3',
      maxIterations: 100,
      actions: [
        { actorFrom: 'システム', arrowType: 'sync', actorTo: 'データベース', message: 'データ取得' },
        { actorFrom: 'システム', arrowType: 'sync', actorTo: 'プロセッサ', message: 'データ処理' },
        { actorFrom: 'プロセッサ', arrowType: 'return', actorTo: 'システム', message: '処理結果' }
      ],
      breakCondition: 'エラーが発生'
    };

    await this.setBasicLoop(complexLoop);
    const setupTime = Date.now() - startTime;

    // バリデーション時間の測定
    const validationStart = Date.now();
    await this.validateLoop();
    const validationTime = Date.now() - validationStart;

    return {
      totalTime: Date.now() - startTime,
      setupTime,
      validationTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ループの実行シミュレーション
   * @param {number} iterations - シミュレーション反復回数
   * @returns {Object} シミュレーション結果
   */
  async simulateLoopExecution(iterations = 5) {
    const simulation = {
      iterations: [],
      totalTime: 0,
      averageTime: 0,
      errors: []
    };

    for (let i = 0; i < iterations; i++) {
      const iterStart = Date.now();
      
      try {
        // ループ条件の評価をシミュレート
        await this.page.evaluate((iterIndex) => {
          // 仮想的なループ実行
          console.log(`Loop iteration ${iterIndex}`);
        }, i);
        
        const iterTime = Date.now() - iterStart;
        simulation.iterations.push({
          index: i,
          time: iterTime,
          success: true
        });
        
        simulation.totalTime += iterTime;
        
      } catch (error) {
        simulation.errors.push({
          iteration: i,
          error: error.message
        });
      }
    }

    simulation.averageTime = simulation.totalTime / iterations;
    
    return simulation;
  }
}

// デフォルトエクスポート
export default LoopEditorPage;