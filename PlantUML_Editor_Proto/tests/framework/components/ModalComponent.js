/**
 * ModalComponent - モーダルダイアログコンポーネント
 * Sprint3 TEST-005-3実装
 * 
 * 機能:
 * - モーダルダイアログの表示制御
 * - キーボード操作対応
 * - アクセシビリティ機能
 * - 各種モーダルタイプの統一操作
 */

import { Page } from '@playwright/test';

export class ModalComponent {
  constructor(page) {
    this.page = page;
    
    // モーダル共通セレクタ
    this.selectors = {
      // モーダル全体
      modalOverlay: '[data-testid="modal-overlay"]',
      modalContainer: '[data-testid="modal-container"]',
      modalDialog: '[data-testid="modal-dialog"]',
      
      // ヘッダー
      modalHeader: '[data-testid="modal-header"]',
      modalTitle: '[data-testid="modal-title"]',
      closeButton: '[data-testid="modal-close-button"]',
      
      // コンテンツ
      modalBody: '[data-testid="modal-body"]',
      modalContent: '[data-testid="modal-content"]',
      
      // フッター
      modalFooter: '[data-testid="modal-footer"]',
      primaryButton: '[data-testid="modal-primary-button"]',
      secondaryButton: '[data-testid="modal-secondary-button"]',
      cancelButton: '[data-testid="modal-cancel-button"]',
      
      // 状態
      visibleModal: '.modal.visible',
      hiddenModal: '.modal.hidden',
      loadingModal: '.modal.loading',
      
      // 特定のモーダルタイプ
      confirmModal: '[data-modal-type="confirm"]',
      alertModal: '[data-modal-type="alert"]',
      promptModal: '[data-modal-type="prompt"]',
      formModal: '[data-modal-type="form"]',
      settingsModal: '[data-modal-type="settings"]',
      
      // フォーム要素
      formElements: '[data-testid="modal-form"] input, [data-testid="modal-form"] select, [data-testid="modal-form"] textarea',
      formInput: '[data-testid="modal-form-input"]',
      formSelect: '[data-testid="modal-form-select"]',
      formTextarea: '[data-testid="modal-form-textarea"]',
      
      // エラー表示
      errorMessage: '[data-testid="modal-error-message"]',
      successMessage: '[data-testid="modal-success-message"]',
      
      // ローディング
      loadingIndicator: '[data-testid="modal-loading"]',
      spinner: '[data-testid="modal-spinner"]',
      
      // アクセシビリティ
      focusTrap: '[data-testid="focus-trap"]',
      ariaLabel: '[aria-label]',
      ariaDescribedBy: '[aria-describedby]'
    };

    // モーダルタイプ設定
    this.modalTypes = {
      confirm: {
        hasCancel: true,
        primaryAction: 'confirm',
        secondaryAction: 'cancel'
      },
      alert: {
        hasCancel: false,
        primaryAction: 'ok'
      },
      prompt: {
        hasCancel: true,
        hasInput: true,
        primaryAction: 'submit',
        secondaryAction: 'cancel'
      },
      form: {
        hasCancel: true,
        hasForm: true,
        primaryAction: 'submit',
        secondaryAction: 'cancel'
      },
      settings: {
        hasCancel: true,
        hasForm: true,
        primaryAction: 'save',
        secondaryAction: 'cancel'
      }
    };
  }

  /**
   * モーダルが表示されているか確認
   * @param {string} modalType - モーダルタイプ（オプション）
   * @returns {boolean} モーダル表示状態
   */
  async isModalVisible(modalType = null) {
    if (modalType) {
      const modalSelector = this.selectors[`${modalType}Modal`];
      return await this.page.locator(modalSelector).isVisible();
    }
    
    return await this.page.locator(this.selectors.modalOverlay).isVisible();
  }

  /**
   * モーダルの表示を待機
   * @param {string} modalType - モーダルタイプ（オプション）
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   */
  async waitForModalToShow(modalType = null, timeout = 5000) {
    const selector = modalType ? 
      this.selectors[`${modalType}Modal`] : 
      this.selectors.modalOverlay;
    
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
    
    // モーダルアニメーションの完了を待機
    await this.page.waitForTimeout(300);
    
    return this;
  }

  /**
   * モーダルの非表示を待機
   * @param {string} modalType - モーダルタイプ（オプション）
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   */
  async waitForModalToHide(modalType = null, timeout = 5000) {
    const selector = modalType ? 
      this.selectors[`${modalType}Modal`] : 
      this.selectors.modalOverlay;
    
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
    
    return this;
  }

  /**
   * モーダルのタイトルを取得
   * @returns {string} モーダルタイトル
   */
  async getModalTitle() {
    const titleElement = this.page.locator(this.selectors.modalTitle);
    return await titleElement.textContent();
  }

  /**
   * モーダルのコンテンツを取得
   * @returns {string} モーダルコンテンツ
   */
  async getModalContent() {
    const contentElement = this.page.locator(this.selectors.modalContent);
    return await contentElement.textContent();
  }

  /**
   * プライマリボタンをクリック
   * @param {string} expectedAction - 期待されるアクション（確認用）
   */
  async clickPrimaryButton(expectedAction = null) {
    const primaryButton = this.page.locator(this.selectors.primaryButton);
    
    // ボタンテキストで確認（オプション）
    if (expectedAction) {
      const buttonText = await primaryButton.textContent();
      if (!buttonText.toLowerCase().includes(expectedAction.toLowerCase())) {
        console.warn(`Expected action "${expectedAction}" but found "${buttonText}"`);
      }
    }
    
    await primaryButton.click();
    
    return this;
  }

  /**
   * セカンダリボタンをクリック
   */
  async clickSecondaryButton() {
    const secondaryButton = this.page.locator(this.selectors.secondaryButton);
    await secondaryButton.click();
    
    return this;
  }

  /**
   * キャンセルボタンをクリック
   */
  async clickCancelButton() {
    const cancelButton = this.page.locator(this.selectors.cancelButton);
    await cancelButton.click();
    
    return this;
  }

  /**
   * 閉じるボタン（×）をクリック
   */
  async clickCloseButton() {
    const closeButton = this.page.locator(this.selectors.closeButton);
    await closeButton.click();
    
    return this;
  }

  /**
   * オーバーレイクリックでモーダルを閉じる
   */
  async clickOverlayToClose() {
    const overlay = this.page.locator(this.selectors.modalOverlay);
    
    // オーバーレイの端をクリック（モーダルダイアログ外）
    const overlayBox = await overlay.boundingBox();
    const dialogBox = await this.page.locator(this.selectors.modalDialog).boundingBox();
    
    if (overlayBox && dialogBox) {
      // ダイアログの外側をクリック
      await this.page.mouse.click(overlayBox.x + 10, overlayBox.y + 10);
    }
    
    return this;
  }

  /**
   * Escapeキーでモーダルを閉じる
   */
  async pressEscapeToClose() {
    await this.page.keyboard.press('Escape');
    
    return this;
  }

  /**
   * フォーム入力を設定
   * @param {Object} formData - フォームデータ
   */
  async fillForm(formData) {
    for (const [fieldName, value] of Object.entries(formData)) {
      const fieldSelector = `[data-field="${fieldName}"], [name="${fieldName}"]`;
      const field = this.page.locator(fieldSelector);
      
      // フィールドタイプに応じて処理
      const tagName = await field.evaluate(el => el.tagName.toLowerCase());
      const inputType = await field.evaluate(el => el.type);
      
      if (tagName === 'select') {
        await field.selectOption(value);
      } else if (tagName === 'textarea') {
        await field.fill(value);
      } else if (inputType === 'checkbox') {
        if (value) {
          await field.check();
        } else {
          await field.uncheck();
        }
      } else if (inputType === 'radio') {
        await field.check();
      } else {
        await field.fill(value.toString());
      }
    }
    
    return this;
  }

  /**
   * フォームデータを取得
   * @returns {Object} フォームデータ
   */
  async getFormData() {
    const formElements = await this.page.locator(this.selectors.formElements).all();
    const formData = {};
    
    for (const element of formElements) {
      const name = await element.getAttribute('name') || await element.getAttribute('data-field');
      if (!name) continue;
      
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      const inputType = await element.evaluate(el => el.type);
      
      if (tagName === 'select') {
        formData[name] = await element.inputValue();
      } else if (tagName === 'textarea') {
        formData[name] = await element.textContent();
      } else if (inputType === 'checkbox') {
        formData[name] = await element.isChecked();
      } else if (inputType === 'radio') {
        formData[name] = await element.isChecked();
      } else {
        formData[name] = await element.inputValue();
      }
    }
    
    return formData;
  }

  /**
   * プロンプトモーダルでテキストを入力
   * @param {string} text - 入力テキスト
   */
  async enterPromptText(text) {
    const promptInput = this.page.locator(`${this.selectors.promptModal} input, ${this.selectors.promptModal} textarea`);
    await promptInput.fill(text);
    
    return this;
  }

  /**
   * プロンプトモーダルの入力値を取得
   * @returns {string} 入力値
   */
  async getPromptText() {
    const promptInput = this.page.locator(`${this.selectors.promptModal} input, ${this.selectors.promptModal} textarea`);
    return await promptInput.inputValue();
  }

  /**
   * 確認モーダルを処理
   * @param {boolean} confirm - true: 確認, false: キャンセル
   */
  async handleConfirmModal(confirm = true) {
    await this.waitForModalToShow('confirm');
    
    if (confirm) {
      await this.clickPrimaryButton('confirm');
    } else {
      await this.clickCancelButton();
    }
    
    await this.waitForModalToHide('confirm');
    
    return this;
  }

  /**
   * アラートモーダルを処理
   */
  async handleAlertModal() {
    await this.waitForModalToShow('alert');
    await this.clickPrimaryButton('ok');
    await this.waitForModalToHide('alert');
    
    return this;
  }

  /**
   * プロンプトモーダルを処理
   * @param {string} text - 入力テキスト
   * @param {boolean} submit - true: 送信, false: キャンセル
   */
  async handlePromptModal(text, submit = true) {
    await this.waitForModalToShow('prompt');
    
    if (submit && text) {
      await this.enterPromptText(text);
      await this.clickPrimaryButton('submit');
    } else {
      await this.clickCancelButton();
    }
    
    await this.waitForModalToHide('prompt');
    
    return this;
  }

  /**
   * エラーメッセージを取得
   * @returns {string|null} エラーメッセージまたはnull
   */
  async getErrorMessage() {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    const isVisible = await errorElement.isVisible();
    return isVisible ? await errorElement.textContent() : null;
  }

  /**
   * 成功メッセージを取得
   * @returns {string|null} 成功メッセージまたはnull
   */
  async getSuccessMessage() {
    const successElement = this.page.locator(this.selectors.successMessage);
    const isVisible = await successElement.isVisible();
    return isVisible ? await successElement.textContent() : null;
  }

  /**
   * ローディング状態を確認
   * @returns {boolean} ローディング中かどうか
   */
  async isLoading() {
    const loadingElement = this.page.locator(this.selectors.loadingIndicator);
    return await loadingElement.isVisible();
  }

  /**
   * ローディング完了を待機
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   */
  async waitForLoadingToComplete(timeout = 10000) {
    await this.page.waitForSelector(this.selectors.loadingIndicator, { 
      state: 'hidden', 
      timeout 
    });
    
    return this;
  }

  /**
   * フォーカストラップのテスト
   * @returns {boolean} フォーカストラップが機能しているか
   */
  async testFocusTrap() {
    // モーダル内の最初のフォーカス可能要素を取得
    const firstFocusable = this.page.locator(`${this.selectors.modalDialog} button, ${this.selectors.modalDialog} input, ${this.selectors.modalDialog} select, ${this.selectors.modalDialog} textarea`).first();
    const lastFocusable = this.page.locator(`${this.selectors.modalDialog} button, ${this.selectors.modalDialog} input, ${this.selectors.modalDialog} select, ${this.selectors.modalDialog} textarea`).last();
    
    // 最後の要素にフォーカス
    await lastFocusable.focus();
    
    // Tabキーで次の要素に移動
    await this.page.keyboard.press('Tab');
    
    // 最初の要素にフォーカスが戻ったか確認
    const focusedElement = this.page.locator(':focus');
    const firstElement = await firstFocusable.elementHandle();
    const currentFocused = await focusedElement.elementHandle();
    
    return firstElement === currentFocused;
  }

  /**
   * アクセシビリティ属性を確認
   * @returns {Object} アクセシビリティ情報
   */
  async checkAccessibility() {
    const modal = this.page.locator(this.selectors.modalDialog);
    
    const accessibility = {
      hasAriaLabel: await modal.getAttribute('aria-label') !== null,
      hasAriaDescribedBy: await modal.getAttribute('aria-describedby') !== null,
      hasRole: await modal.getAttribute('role') !== null,
      hasTabIndex: await modal.getAttribute('tabindex') !== null,
      focusTrapWorks: await this.testFocusTrap()
    };
    
    return accessibility;
  }

  /**
   * キーボードナビゲーションテスト
   * @returns {Object} キーボードナビゲーション結果
   */
  async testKeyboardNavigation() {
    const results = {
      tabNavigation: false,
      enterActivation: false,
      escapeClose: false,
      arrowNavigation: false
    };
    
    try {
      // Tab ナビゲーション
      await this.page.keyboard.press('Tab');
      await this.page.keyboard.press('Tab');
      results.tabNavigation = true;
      
      // Enter で アクティベーション
      await this.page.keyboard.press('Enter');
      results.enterActivation = true;
      
      // Escape で 閉じる
      await this.page.keyboard.press('Escape');
      results.escapeClose = await this.page.locator(this.selectors.modalOverlay).isHidden();
      
    } catch (error) {
      console.warn('Keyboard navigation test failed:', error.message);
    }
    
    return results;
  }

  /**
   * モーダルのパフォーマンステスト
   * @returns {Object} パフォーマンス測定結果
   */
  async measureModalPerformance() {
    const startTime = Date.now();
    
    // モーダル表示時間の測定
    const showStart = Date.now();
    await this.waitForModalToShow();
    const showTime = Date.now() - showStart;
    
    // フォーム入力時間の測定
    const formStart = Date.now();
    await this.fillForm({
      testField1: 'テスト値1',
      testField2: 'テスト値2',
      testField3: true
    });
    const formTime = Date.now() - formStart;
    
    // モーダル非表示時間の測定
    const hideStart = Date.now();
    await this.clickCancelButton();
    await this.waitForModalToHide();
    const hideTime = Date.now() - hideStart;
    
    return {
      totalTime: Date.now() - startTime,
      showTime,
      formTime,
      hideTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 複数モーダルの管理
   * @param {Array} modalSequence - モーダルシーケンス
   */
  async handleModalSequence(modalSequence) {
    for (const modalAction of modalSequence) {
      const { type, action, data } = modalAction;
      
      switch (type) {
        case 'confirm':
          await this.handleConfirmModal(action === 'confirm');
          break;
        case 'alert':
          await this.handleAlertModal();
          break;
        case 'prompt':
          await this.handlePromptModal(data, action === 'submit');
          break;
        case 'form':
          await this.waitForModalToShow('form');
          if (data) {
            await this.fillForm(data);
          }
          if (action === 'submit') {
            await this.clickPrimaryButton('submit');
          } else {
            await this.clickCancelButton();
          }
          await this.waitForModalToHide('form');
          break;
      }
      
      // モーダル間の待機時間
      await this.page.waitForTimeout(200);
    }
    
    return this;
  }
}

// デフォルトエクスポート
export default ModalComponent;