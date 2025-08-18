/**
 * ButtonComponent - 汎用ボタンコンポーネント
 * Sprint3 TEST-005-3実装
 * 
 * 機能:
 * - 各種ボタンの統一操作
 * - 状態管理（enabled/disabled/loading）
 * - アクセシビリティ対応
 * - ボタンタイプ別の専用メソッド
 */

import { Page } from '@playwright/test';

export class ButtonComponent {
  constructor(page) {
    this.page = page;
    
    // ボタン共通セレクタ
    this.selectors = {
      // 基本ボタン
      button: 'button',
      primaryButton: '.btn-primary, [data-button-type="primary"]',
      secondaryButton: '.btn-secondary, [data-button-type="secondary"]',
      cancelButton: '.btn-cancel, [data-button-type="cancel"]',
      dangerButton: '.btn-danger, [data-button-type="danger"]',
      
      // 状態セレクタ
      enabledButton: 'button:not(:disabled)',
      disabledButton: 'button:disabled',
      loadingButton: '.btn-loading, [data-loading="true"]',
      activeButton: '.btn-active, [data-active="true"]',
      
      // 特定機能ボタン
      addButton: '[data-testid*="add"], .btn-add',
      editButton: '[data-testid*="edit"], .btn-edit',
      deleteButton: '[data-testid*="delete"], .btn-delete',
      saveButton: '[data-testid*="save"], .btn-save',
      confirmButton: '[data-testid*="confirm"], .btn-confirm',
      
      // アイコンボタン
      iconButton: '.btn-icon, [data-button-style="icon"]',
      buttonIcon: '.btn-icon-content, .icon',
      buttonText: '.btn-text-content, .text',
      
      // ローディング関連
      loadingSpinner: '.spinner, .loading-spinner',
      loadingText: '.loading-text',
      
      // ツールチップ
      tooltip: '.tooltip, [data-tooltip]',
      
      // アクセシビリティ
      ariaLabel: '[aria-label]',
      ariaPressed: '[aria-pressed]',
      ariaExpanded: '[aria-expanded]'
    };

    // ボタンタイプ設定
    this.buttonTypes = {
      primary: {
        selector: this.selectors.primaryButton,
        role: 'primary-action',
        expectsConfirmation: false
      },
      secondary: {
        selector: this.selectors.secondaryButton,
        role: 'secondary-action',
        expectsConfirmation: false
      },
      cancel: {
        selector: this.selectors.cancelButton,
        role: 'cancel-action',
        expectsConfirmation: false
      },
      danger: {
        selector: this.selectors.dangerButton,
        role: 'destructive-action',
        expectsConfirmation: true
      },
      add: {
        selector: this.selectors.addButton,
        role: 'create-action',
        expectsConfirmation: false
      },
      edit: {
        selector: this.selectors.editButton,
        role: 'modify-action',
        expectsConfirmation: false
      },
      delete: {
        selector: this.selectors.deleteButton,
        role: 'destructive-action',
        expectsConfirmation: true
      },
      save: {
        selector: this.selectors.saveButton,
        role: 'persist-action',
        expectsConfirmation: false
      },
      confirm: {
        selector: this.selectors.confirmButton,
        role: 'confirmation-action',
        expectsConfirmation: false
      }
    };
  }

  /**
   * ボタンを取得
   * @param {string} selector - ボタンセレクタ
   * @returns {Locator} ボタンのLocator
   */
  getButton(selector) {
    return this.page.locator(selector);
  }

  /**
   * ボタンタイプから取得
   * @param {string} buttonType - ボタンタイプ
   * @param {string} context - コンテキストセレクタ（オプション）
   * @returns {Locator} ボタンのLocator
   */
  getButtonByType(buttonType, context = '') {
    const typeConfig = this.buttonTypes[buttonType];
    if (!typeConfig) {
      throw new Error(`Unknown button type: ${buttonType}`);
    }
    
    const selector = context ? `${context} ${typeConfig.selector}` : typeConfig.selector;
    return this.page.locator(selector);
  }

  /**
   * ボタンをクリック
   * @param {string} selector - ボタンセレクタ
   * @param {Object} options - クリックオプション
   */
  async clickButton(selector, options = {}) {
    const { waitForResponse = false, confirmIfNeeded = true } = options;
    
    const button = this.getButton(selector);
    
    // ボタンが有効かどうか確認
    await this.waitForButtonEnabled(button);
    
    // クリック実行
    await button.click();
    
    // 必要に応じて確認ダイアログを処理
    if (confirmIfNeeded) {
      await this.handleConfirmationIfNeeded();
    }
    
    // レスポンス待機
    if (waitForResponse) {
      await this.waitForButtonResponse(button);
    }
    
    return this;
  }

  /**
   * ボタンタイプでクリック
   * @param {string} buttonType - ボタンタイプ
   * @param {string} context - コンテキストセレクタ（オプション）
   * @param {Object} options - クリックオプション
   */
  async clickButtonByType(buttonType, context = '', options = {}) {
    const typeConfig = this.buttonTypes[buttonType];
    const button = this.getButtonByType(buttonType, context);
    
    // 危険なアクションの場合、確認を要求
    if (typeConfig.expectsConfirmation && !options.skipConfirmation) {
      options.confirmIfNeeded = true;
    }
    
    await this.clickButton(button, options);
    
    return this;
  }

  /**
   * ボタンが有効になるまで待機
   * @param {Locator} button - ボタンLocator
   * @param {number} timeout - タイムアウト時間
   */
  async waitForButtonEnabled(button, timeout = 5000) {
    await button.waitFor({ state: 'visible', timeout });
    
    // 無効状態でないことを確認
    await this.page.waitForFunction((buttonEl) => {
      const element = document.evaluate(
        buttonEl, 
        document, 
        null, 
        XPathResult.FIRST_ORDERED_NODE_TYPE, 
        null
      ).singleNodeValue;
      return element && !element.disabled;
    }, await button.elementHandle(), { timeout });
    
    return this;
  }

  /**
   * ボタンのレスポンス完了を待機
   * @param {Locator} button - ボタンLocator
   * @param {number} timeout - タイムアウト時間
   */
  async waitForButtonResponse(button, timeout = 10000) {
    // ローディング状態の開始を待機
    try {
      await button.locator(this.selectors.loadingButton).waitFor({ 
        state: 'visible', 
        timeout: 1000 
      });
    } catch (error) {
      // ローディング状態がない場合は即座に完了
      return this;
    }
    
    // ローディング状態の終了を待機
    await button.locator(this.selectors.loadingButton).waitFor({ 
      state: 'hidden', 
      timeout 
    });
    
    return this;
  }

  /**
   * 確認ダイアログを処理（必要に応じて）
   */
  async handleConfirmationIfNeeded() {
    try {
      // 確認ダイアログの表示を短時間待機
      const confirmDialog = this.page.locator('.confirm-dialog, .confirmation-modal');
      await confirmDialog.waitFor({ state: 'visible', timeout: 1000 });
      
      // 確認ボタンをクリック
      const confirmButton = confirmDialog.locator('.confirm, .yes, .ok');
      await confirmButton.click();
      
      // ダイアログの非表示を待機
      await confirmDialog.waitFor({ state: 'hidden' });
      
    } catch (error) {
      // 確認ダイアログがない場合は何もしない
    }
    
    return this;
  }

  /**
   * ボタンの状態を取得
   * @param {string} selector - ボタンセレクタ
   * @returns {Object} ボタンの状態
   */
  async getButtonState(selector) {
    const button = this.getButton(selector);
    
    const state = {
      isVisible: await button.isVisible(),
      isEnabled: await button.isEnabled(),
      isLoading: await button.locator(this.selectors.loadingButton).count() > 0,
      isActive: await button.locator(this.selectors.activeButton).count() > 0,
      text: await button.textContent(),
      ariaLabel: await button.getAttribute('aria-label'),
      ariaPressed: await button.getAttribute('aria-pressed'),
      title: await button.getAttribute('title')
    };
    
    return state;
  }

  /**
   * ボタンのテキストを取得
   * @param {string} selector - ボタンセレクタ
   * @returns {string} ボタンテキスト
   */
  async getButtonText(selector) {
    const button = this.getButton(selector);
    return await button.textContent();
  }

  /**
   * ボタンが表示されているか確認
   * @param {string} selector - ボタンセレクタ
   * @returns {boolean} 表示状態
   */
  async isButtonVisible(selector) {
    const button = this.getButton(selector);
    return await button.isVisible();
  }

  /**
   * ボタンが有効か確認
   * @param {string} selector - ボタンセレクタ
   * @returns {boolean} 有効状態
   */
  async isButtonEnabled(selector) {
    const button = this.getButton(selector);
    return await button.isEnabled();
  }

  /**
   * ボタンがローディング中か確認
   * @param {string} selector - ボタンセレクタ
   * @returns {boolean} ローディング状態
   */
  async isButtonLoading(selector) {
    const button = this.getButton(selector);
    const loadingElement = button.locator(this.selectors.loadingSpinner);
    return await loadingElement.isVisible();
  }

  /**
   * ボタンのツールチップを表示
   * @param {string} selector - ボタンセレクタ
   */
  async showTooltip(selector) {
    const button = this.getButton(selector);
    await button.hover();
    
    // ツールチップの表示を待機
    await this.page.waitForTimeout(500);
    
    return this;
  }

  /**
   * ボタンのツールチップテキストを取得
   * @param {string} selector - ボタンセレクタ
   * @returns {string|null} ツールチップテキスト
   */
  async getTooltipText(selector) {
    await this.showTooltip(selector);
    
    const tooltip = this.page.locator(this.selectors.tooltip);
    const isVisible = await tooltip.isVisible();
    return isVisible ? await tooltip.textContent() : null;
  }

  /**
   * キーボードでボタンを操作
   * @param {string} selector - ボタンセレクタ
   * @param {string} key - キー（通常は'Enter'または'Space'）
   */
  async activateButtonWithKeyboard(selector, key = 'Enter') {
    const button = this.getButton(selector);
    
    // ボタンにフォーカス
    await button.focus();
    
    // キーを押下
    await this.page.keyboard.press(key);
    
    return this;
  }

  /**
   * ボタンのアクセシビリティを確認
   * @param {string} selector - ボタンセレクタ
   * @returns {Object} アクセシビリティ情報
   */
  async checkButtonAccessibility(selector) {
    const button = this.getButton(selector);
    
    const accessibility = {
      hasAriaLabel: await button.getAttribute('aria-label') !== null,
      hasTitle: await button.getAttribute('title') !== null,
      hasTextContent: (await button.textContent()).length > 0,
      isFocusable: await button.getAttribute('tabindex') !== '-1',
      hasRole: await button.getAttribute('role') !== null || 
               await button.evaluate(el => el.tagName.toLowerCase()) === 'button'
    };
    
    // アクセシビリティスコアを計算
    const score = Object.values(accessibility).filter(Boolean).length;
    accessibility.score = (score / Object.keys(accessibility).length) * 100;
    
    return accessibility;
  }

  /**
   * ボタングループの操作
   * @param {string} groupSelector - ボタングループのセレクタ
   * @returns {Array} ボタングループ内のボタンリスト
   */
  async getButtonGroup(groupSelector) {
    const group = this.page.locator(groupSelector);
    const buttons = await group.locator('button').all();
    
    const buttonInfo = [];
    for (const button of buttons) {
      const info = {
        element: button,
        text: await button.textContent(),
        isEnabled: await button.isEnabled(),
        isVisible: await button.isVisible()
      };
      buttonInfo.push(info);
    }
    
    return buttonInfo;
  }

  /**
   * ボタングループから特定のボタンをクリック
   * @param {string} groupSelector - ボタングループのセレクタ
   * @param {string|number} buttonIdentifier - ボタンの識別子（テキストまたはインデックス）
   */
  async clickButtonInGroup(groupSelector, buttonIdentifier) {
    const buttons = await this.getButtonGroup(groupSelector);
    
    let targetButton = null;
    
    if (typeof buttonIdentifier === 'number') {
      // インデックスで指定
      targetButton = buttons[buttonIdentifier]?.element;
    } else {
      // テキストで指定
      targetButton = buttons.find(btn => 
        btn.text.includes(buttonIdentifier)
      )?.element;
    }
    
    if (!targetButton) {
      throw new Error(`Button not found: ${buttonIdentifier} in group ${groupSelector}`);
    }
    
    await targetButton.click();
    
    return this;
  }

  /**
   * 条件付きボタンクリック
   * @param {string} selector - ボタンセレクタ
   * @param {Function} condition - クリック条件をチェックする関数
   * @param {Object} options - オプション
   */
  async clickButtonIf(selector, condition, options = {}) {
    const button = this.getButton(selector);
    const shouldClick = await condition(button);
    
    if (shouldClick) {
      await this.clickButton(selector, options);
    }
    
    return this;
  }

  /**
   * ボタンの一括操作
   * @param {Array} buttonActions - ボタンアクションの配列
   */
  async performBulkButtonActions(buttonActions) {
    for (const action of buttonActions) {
      const { selector, type, action: actionType, options = {} } = action;
      
      switch (actionType) {
        case 'click':
          if (type) {
            await this.clickButtonByType(type, '', options);
          } else {
            await this.clickButton(selector, options);
          }
          break;
        case 'hover':
          await this.showTooltip(selector);
          break;
        case 'focus':
          await this.getButton(selector).focus();
          break;
        case 'keyboard-activate':
          await this.activateButtonWithKeyboard(selector, options.key);
          break;
      }
      
      // アクション間の待機時間
      if (options.delay) {
        await this.page.waitForTimeout(options.delay);
      }
    }
    
    return this;
  }

  /**
   * ボタンのパフォーマンステスト
   * @param {Array} selectors - テスト対象のボタンセレクタ配列
   * @returns {Object} パフォーマンス測定結果
   */
  async measureButtonPerformance(selectors) {
    const results = {
      buttons: [],
      totalTime: 0,
      averageTime: 0,
      timestamp: new Date().toISOString()
    };
    
    const startTime = Date.now();
    
    for (const selector of selectors) {
      const buttonStart = Date.now();
      
      try {
        // ボタンの表示待機
        await this.waitForButtonEnabled(this.getButton(selector));
        const visibilityTime = Date.now() - buttonStart;
        
        // クリック実行
        const clickStart = Date.now();
        await this.clickButton(selector);
        const clickTime = Date.now() - clickStart;
        
        // レスポンス時間測定
        const responseStart = Date.now();
        await this.waitForButtonResponse(this.getButton(selector));
        const responseTime = Date.now() - responseStart;
        
        results.buttons.push({
          selector,
          visibilityTime,
          clickTime,
          responseTime,
          totalTime: Date.now() - buttonStart,
          success: true
        });
        
      } catch (error) {
        results.buttons.push({
          selector,
          error: error.message,
          totalTime: Date.now() - buttonStart,
          success: false
        });
      }
    }
    
    results.totalTime = Date.now() - startTime;
    results.averageTime = results.totalTime / selectors.length;
    
    return results;
  }
}

// デフォルトエクスポート
export default ButtonComponent;