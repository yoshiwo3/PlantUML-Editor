/**
 * QuestionButtonComponent - ？条件確認ボタンコンポーネント
 * Sprint3 TEST-005-3実装
 * 
 * 機能:
 * - ？ボタンの状態管理（設計書準拠）
 * - 条件入力機能
 * - アクティブ/非アクティブ切り替え
 * - 条件文のバリデーション
 */

import { Page } from '@playwright/test';

export class QuestionButtonComponent {
  constructor(page, containerSelector = null) {
    this.page = page;
    this.containerSelector = containerSelector || '[data-testid="action-items-container"]';
    
    // ？ボタン専用セレクタ（設計書準拠）
    this.selectors = {
      // ？ボタン本体
      questionButton: '[data-testid="question-button"]',
      questionIcon: '[data-testid="question-icon"]',
      
      // 状態（設計書準拠）
      normalState: '.question-button:not(.active)',
      activeState: '.question-button.active',
      disabledState: '.question-button:disabled',
      hoverState: '.question-button:hover',
      
      // スタイリング（設計書準拠）
      normalStyling: {
        color: '#ff9800',
        background: 'transparent'
      },
      activeStyling: {
        color: 'white',
        background: '#ff9800'
      },
      
      // 条件入力
      conditionInputPanel: '[data-testid="condition-input-panel"]',
      conditionInput: '[data-testid="condition-input"]',
      conditionTextarea: '[data-testid="condition-textarea"]',
      conditionPreview: '[data-testid="condition-preview"]',
      
      // 条件テンプレート
      conditionTemplates: '[data-testid="condition-templates"]',
      templateItem: '[data-template-item]',
      customConditionButton: '[data-testid="custom-condition"]',
      
      // 操作ボタン
      confirmCondition: '[data-testid="confirm-condition"]',
      cancelCondition: '[data-testid="cancel-condition"]',
      clearCondition: '[data-testid="clear-condition"]',
      
      // バリデーション
      conditionValidation: '[data-testid="condition-validation"]',
      validationError: '[data-testid="validation-error"]',
      syntaxWarning: '[data-testid="syntax-warning"]',
      
      // ツールチップ
      tooltip: '[data-testid="question-button-tooltip"]',
      helpText: '[data-testid="question-button-help"]'
    };

    // 条件テンプレート（よく使用される条件）
    this.conditionTemplates = {
      authentication: {
        japanese: 'ユーザーが認証済み',
        english: 'User is authenticated',
        category: 'auth',
        icon: '🔐'
      },
      dataValidation: {
        japanese: '入力データが正常',
        english: 'Input data is valid',
        category: 'validation',
        icon: '✅'
      },
      permission: {
        japanese: '操作権限がある',
        english: 'Has operation permission',
        category: 'auth',
        icon: '🔑'
      },
      networkConnection: {
        japanese: 'ネットワーク接続が可能',
        english: 'Network connection available',
        category: 'system',
        icon: '🌐'
      },
      dataExists: {
        japanese: 'データが存在する',
        english: 'Data exists',
        category: 'data',
        icon: '📊'
      },
      timeConstraint: {
        japanese: '制限時間内',
        english: 'Within time limit',
        category: 'time',
        icon: '⏰'
      }
    };

    // デフォルト設定
    this.config = {
      animationDuration: 200,
      tooltipDelay: 1000,
      validationDelay: 500,
      maxConditionLength: 200
    };
  }

  /**
   * 特定の？ボタンを取得
   * @param {number} actionIndex - アクション項目のインデックス
   * @returns {Locator} ？ボタンのLocator
   */
  getQuestionButton(actionIndex) {
    return this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.questionButton}`);
  }

  /**
   * ？ボタンがアクティブかどうか確認
   * @param {number} actionIndex - アクション項目のインデックス
   * @returns {boolean} アクティブ状態
   */
  async isQuestionButtonActive(actionIndex) {
    const questionButton = this.getQuestionButton(actionIndex);
    return await questionButton.locator(this.selectors.activeState).count() > 0;
  }

  /**
   * ？ボタンをアクティブ化
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async activateQuestionButton(actionIndex) {
    const questionButton = this.getQuestionButton(actionIndex);
    const isActive = await this.isQuestionButtonActive(actionIndex);
    
    if (!isActive) {
      await questionButton.click();
      
      // アクティブ状態の確認
      await questionButton.locator(this.selectors.activeState).waitFor({ state: 'visible' });
      
      // 条件入力パネルの表示を待機
      await this.waitForConditionInputPanel(actionIndex, true);
    }
    
    return this;
  }

  /**
   * ？ボタンを非アクティブ化
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async deactivateQuestionButton(actionIndex) {
    const questionButton = this.getQuestionButton(actionIndex);
    const isActive = await this.isQuestionButtonActive(actionIndex);
    
    if (isActive) {
      await questionButton.click();
      
      // 非アクティブ状態の確認
      await questionButton.locator(this.selectors.normalState).waitFor({ state: 'visible' });
      
      // 条件入力パネルの非表示を待機
      await this.waitForConditionInputPanel(actionIndex, false);
    }
    
    return this;
  }

  /**
   * ？ボタンの状態を切り替え
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async toggleQuestionButton(actionIndex) {
    const isActive = await this.isQuestionButtonActive(actionIndex);
    
    if (isActive) {
      await this.deactivateQuestionButton(actionIndex);
    } else {
      await this.activateQuestionButton(actionIndex);
    }
    
    return this;
  }

  /**
   * 条件入力パネルの表示を待機
   * @param {number} actionIndex - アクション項目のインデックス
   * @param {boolean} shouldBeVisible - 表示されるべきかどうか
   */
  async waitForConditionInputPanel(actionIndex, shouldBeVisible = true) {
    const conditionPanel = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.conditionInputPanel}`);
    
    if (shouldBeVisible) {
      await conditionPanel.waitFor({ state: 'visible' });
    } else {
      await conditionPanel.waitFor({ state: 'hidden' });
    }
    
    return this;
  }

  /**
   * 条件文を設定
   * @param {number} actionIndex - アクション項目のインデックス
   * @param {string} condition - 条件文
   */
  async setCondition(actionIndex, condition) {
    // ？ボタンがアクティブでない場合はアクティブ化
    const isActive = await this.isQuestionButtonActive(actionIndex);
    if (!isActive) {
      await this.activateQuestionButton(actionIndex);
    }
    
    // 条件入力フィールドに入力
    const conditionInput = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.conditionInput}`);
    await conditionInput.clear();
    await conditionInput.type(condition, { delay: 50 });
    
    // バリデーションの完了を待機
    await this.waitForConditionValidation(actionIndex);
    
    return this;
  }

  /**
   * 条件テンプレートを使用
   * @param {number} actionIndex - アクション項目のインデックス
   * @param {string} templateKey - テンプレートキー
   */
  async useConditionTemplate(actionIndex, templateKey) {
    const template = this.conditionTemplates[templateKey];
    if (!template) {
      throw new Error(`Unknown condition template: ${templateKey}`);
    }
    
    // ？ボタンをアクティブ化
    await this.activateQuestionButton(actionIndex);
    
    // テンプレート選択パネルを開く
    const templatesPanel = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.conditionTemplates}`);
    await templatesPanel.click();
    
    // 特定のテンプレートを選択
    const templateItem = this.page.locator(`[data-template-item="${templateKey}"]`);
    await templateItem.click();
    
    // テンプレート適用の完了を待機
    await this.waitForConditionValidation(actionIndex);
    
    return this;
  }

  /**
   * カスタム条件を入力
   * @param {number} actionIndex - アクション項目のインデックス
   * @param {string} condition - カスタム条件文
   */
  async setCustomCondition(actionIndex, condition) {
    // ？ボタンをアクティブ化
    await this.activateQuestionButton(actionIndex);
    
    // カスタム条件ボタンをクリック
    const customButton = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.customConditionButton}`);
    await customButton.click();
    
    // 条件を設定
    await this.setCondition(actionIndex, condition);
    
    return this;
  }

  /**
   * 条件を確定
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async confirmCondition(actionIndex) {
    const confirmButton = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.confirmCondition}`);
    
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    } else {
      // Enterキーで確定
      const conditionInput = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.conditionInput}`);
      await conditionInput.press('Enter');
    }
    
    // 確定完了を待機
    await this.page.waitForTimeout(this.config.animationDuration);
    
    return this;
  }

  /**
   * 条件をキャンセル
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async cancelCondition(actionIndex) {
    const cancelButton = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.cancelCondition}`);
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      // Escapeキーでキャンセル
      await this.page.keyboard.press('Escape');
    }
    
    // キャンセル完了を待機
    await this.page.waitForTimeout(this.config.animationDuration);
    
    return this;
  }

  /**
   * 条件をクリア
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async clearCondition(actionIndex) {
    const clearButton = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.clearCondition}`);
    await clearButton.click();
    
    // クリア完了を待機
    await this.page.waitForTimeout(this.config.animationDuration);
    
    return this;
  }

  /**
   * 条件バリデーションの完了を待機
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async waitForConditionValidation(actionIndex) {
    // バリデーション処理の完了を待機
    await this.page.waitForFunction((index) => {
      const validationElement = document.querySelector(`[data-action-index="${index}"] .validating-condition`);
      return !validationElement || !validationElement.classList.contains('validating');
    }, actionIndex, { timeout: 5000 });
    
    return this;
  }

  /**
   * 条件を取得
   * @param {number} actionIndex - アクション項目のインデックス
   * @returns {string|null} 設定された条件文
   */
  async getCondition(actionIndex) {
    const isActive = await this.isQuestionButtonActive(actionIndex);
    if (!isActive) {
      return null;
    }
    
    const conditionInput = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.conditionInput}`);
    return await conditionInput.inputValue();
  }

  /**
   * 条件プレビューを取得
   * @param {number} actionIndex - アクション項目のインデックス
   * @returns {string|null} 条件プレビューテキスト
   */
  async getConditionPreview(actionIndex) {
    const conditionPreview = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.conditionPreview}`);
    const isVisible = await conditionPreview.isVisible();
    return isVisible ? await conditionPreview.textContent() : null;
  }

  /**
   * バリデーションエラーを取得
   * @param {number} actionIndex - アクション項目のインデックス
   * @returns {Array} エラーメッセージの配列
   */
  async getValidationErrors(actionIndex) {
    const errorElements = await this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.validationError}`).all();
    const errors = [];
    
    for (const element of errorElements) {
      const isVisible = await element.isVisible();
      if (isVisible) {
        const errorText = await element.textContent();
        errors.push(errorText.trim());
      }
    }
    
    return errors;
  }

  /**
   * ？ボタンのスタイリングを確認（設計書準拠）
   * @param {number} actionIndex - アクション項目のインデックス
   * @returns {Object} スタイリング情報
   */
  async getQuestionButtonStyling(actionIndex) {
    const questionButton = this.getQuestionButton(actionIndex);
    const isActive = await this.isQuestionButtonActive(actionIndex);
    
    const computedStyle = await questionButton.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      };
    });
    
    return {
      isActive,
      computedStyle,
      matchesExpected: isActive ? 
        this.validateActiveStyling(computedStyle) : 
        this.validateNormalStyling(computedStyle)
    };
  }

  /**
   * 通常状態のスタイリングを検証
   * @param {Object} style - 計算されたスタイル
   * @returns {boolean} 期待されるスタイルかどうか
   */
  validateNormalStyling(style) {
    // 簡略化した検証（実際のCSSに応じて調整）
    return style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent';
  }

  /**
   * アクティブ状態のスタイリングを検証
   * @param {Object} style - 計算されたスタイル
   * @returns {boolean} 期待されるスタイルかどうか
   */
  validateActiveStyling(style) {
    // 簡略化した検証（実際のCSSに応じて調整）
    return style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
  }

  /**
   * ツールチップを表示
   * @param {number} actionIndex - アクション項目のインデックス
   */
  async showTooltip(actionIndex) {
    const questionButton = this.getQuestionButton(actionIndex);
    await questionButton.hover();
    
    // ツールチップの表示を待機
    await this.page.waitForTimeout(this.config.tooltipDelay);
    
    return this;
  }

  /**
   * ツールチップのテキストを取得
   * @param {number} actionIndex - アクション項目のインデックス
   * @returns {string|null} ツールチップテキスト
   */
  async getTooltipText(actionIndex) {
    await this.showTooltip(actionIndex);
    
    const tooltip = this.page.locator(`${this.containerSelector} .action-item:nth-child(${actionIndex + 1}) ${this.selectors.tooltip}`);
    const isVisible = await tooltip.isVisible();
    return isVisible ? await tooltip.textContent() : null;
  }

  /**
   * キーボードショートカットでの操作
   * @param {number} actionIndex - アクション項目のインデックス
   * @param {string} shortcut - ショートカットキー
   */
  async useKeyboardShortcut(actionIndex, shortcut) {
    const questionButton = this.getQuestionButton(actionIndex);
    
    // ボタンにフォーカス
    await questionButton.focus();
    
    const shortcuts = {
      'toggle': 'Space',
      'activate': 'Enter',
      'deactivate': 'Escape',
      'confirm': 'Control+Enter',
      'cancel': 'Escape'
    };
    
    const key = shortcuts[shortcut] || shortcut;
    await this.page.keyboard.press(key);
    
    // 操作完了を待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  /**
   * 条件の複雑さを評価
   * @param {string} condition - 条件文
   * @returns {Object} 複雑さ評価結果
   */
  evaluateConditionComplexity(condition) {
    const complexity = {
      length: condition.length,
      wordCount: condition.split(/\s+/).length,
      operatorCount: (condition.match(/[&|!()<>=]/g) || []).length,
      nestingLevel: this.calculateNestingLevel(condition),
      complexity: 'simple'
    };
    
    // 複雑さの判定
    if (complexity.operatorCount > 5 || complexity.nestingLevel > 2) {
      complexity.complexity = 'complex';
    } else if (complexity.operatorCount > 2 || complexity.nestingLevel > 1) {
      complexity.complexity = 'medium';
    }
    
    return complexity;
  }

  /**
   * 条件文のネストレベルを計算
   * @param {string} condition - 条件文
   * @returns {number} ネストレベル
   */
  calculateNestingLevel(condition) {
    let level = 0;
    let maxLevel = 0;
    
    for (const char of condition) {
      if (char === '(') {
        level++;
        maxLevel = Math.max(maxLevel, level);
      } else if (char === ')') {
        level--;
      }
    }
    
    return maxLevel;
  }

  /**
   * ？ボタンのパフォーマンステスト
   * @param {number} actionCount - テストするアクション数
   * @returns {Object} パフォーマンス測定結果
   */
  async measureQuestionButtonPerformance(actionCount = 10) {
    const startTime = Date.now();
    
    const operations = [];
    
    for (let i = 0; i < actionCount; i++) {
      const opStart = Date.now();
      
      // ？ボタンのアクティブ化
      await this.activateQuestionButton(i);
      const activateTime = Date.now() - opStart;
      
      // 条件設定
      const conditionStart = Date.now();
      await this.setCondition(i, `テスト条件${i + 1}`);
      const conditionTime = Date.now() - conditionStart;
      
      // 確定
      const confirmStart = Date.now();
      await this.confirmCondition(i);
      const confirmTime = Date.now() - confirmStart;
      
      operations.push({
        index: i,
        activateTime,
        conditionTime,
        confirmTime,
        totalTime: Date.now() - opStart
      });
    }
    
    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / actionCount;
    
    return {
      totalTime,
      averageTime,
      actionCount,
      operations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ？ボタンの一括操作
   * @param {Array} actionConditions - アクション条件のペア
   */
  async setBulkConditions(actionConditions) {
    for (let i = 0; i < actionConditions.length; i++) {
      const { hasCondition, condition, template } = actionConditions[i];
      
      if (hasCondition) {
        if (template) {
          await this.useConditionTemplate(i, template);
        } else if (condition) {
          await this.setCondition(i, condition);
        }
        await this.confirmCondition(i);
      }
      
      // 次の操作への移行前に少し待機
      await this.page.waitForTimeout(50);
    }
    
    return this;
  }
}

// デフォルトエクスポート
export default QuestionButtonComponent;