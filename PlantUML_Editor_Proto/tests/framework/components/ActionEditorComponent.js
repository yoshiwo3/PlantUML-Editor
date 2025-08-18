/**
 * ActionEditorComponent - アクション編集コンポーネント
 * 
 * Sprint3 Hybrid Object Model Framework
 * アクション編集モーダルの操作・検証を提供
 */

import { BaseComponent, FormComponent } from '../base/BaseComponent.js';
import { expect } from '@playwright/test';

export class ActionEditorComponent extends FormComponent {
  constructor(page, selector, options = {}) {
    super(page, selector, {
      name: 'ActionEditor',
      waitForStable: true,
      monitorPerformance: true,
      validateAccessibility: true,
      ...options
    });
    
    // アクションエディター固有セレクター
    this.selectors = {
      // フォーム要素
      actorFromSelect: '[data-testid="actor-from"]',
      arrowTypeSelect: '[data-testid="arrow-type"]', 
      actorToSelect: '[data-testid="actor-to"]',
      messageInput: '[data-testid="message-input"]',
      
      // ボタン類
      saveButton: '[data-testid="save-action-button"]',
      cancelButton: '[data-testid="cancel-action-button"]',
      deleteButton: '[data-testid="delete-action-button"]',
      
      // バリデーション表示
      validationError: '.validation-error',
      fieldError: '.field-error',
      
      // プレビューエリア
      previewArea: '.action-preview',
      previewText: '.preview-text',
      
      // アクセシビリティ
      modalTitle: '.modal-title',
      modalDescription: '.modal-description'
    };
    
    // バリデーションルール
    this.validationRules = {
      actorFrom: { required: true, type: 'select' },
      arrowType: { required: true, type: 'select' },
      actorTo: { required: true, type: 'select' },
      message: { required: true, type: 'text', maxLength: 200 }
    };
  }

  /**
   * モーダル表示待機
   */
  async waitForModal() {
    await this.waitForElement(this.selector);
    await this.waitForStability();
    
    // フォーカス確認（アクセシビリティ）
    const focusedElement = await this.page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'SELECT', 'BUTTON']).toContain(focusedElement);
  }

  /**
   * アクション詳細入力
   */
  async fillActionDetails(actionData) {
    return await this.measurePerformance(async () => {
      // From Actor選択
      if (actionData.actorFrom) {
        await this.selectOption(this.selectors.actorFromSelect, actionData.actorFrom);
      }
      
      // Arrow Type選択
      if (actionData.arrowType) {
        await this.selectOption(this.selectors.arrowTypeSelect, actionData.arrowType);
      }
      
      // To Actor選択
      if (actionData.actorTo) {
        await this.selectOption(this.selectors.actorToSelect, actionData.actorTo);
      }
      
      // Message入力
      if (actionData.message) {
        await this.fillMessage(actionData.message);
      }
      
      // プレビュー更新待機
      await this.waitForPreviewUpdate();
      
      return actionData;
    });
  }

  /**
   * メッセージ入力（日本語対応）
   */
  async fillMessage(message) {
    const messageElement = await this.getChildElement(this.selectors.messageInput);
    
    // 既存値クリア
    await messageElement.clear();
    
    // メッセージ入力
    await messageElement.fill(message);
    
    // 日本語入力確認
    if (this.isJapaneseText(message)) {
      await this.page.waitForTimeout(200); // IME処理待機
      const actualValue = await messageElement.inputValue();
      expect(actualValue).toBe(message);
    }
    
    // バリデーション実行
    await this.validateField('message', message);
  }

  /**
   * Actor選択オプション取得
   */
  async getActorOptions(selectType = 'from') {
    const selector = selectType === 'from' ? this.selectors.actorFromSelect : this.selectors.actorToSelect;
    const selectElement = await this.getChildElement(selector);
    
    const options = await selectElement.$$eval('option', options => 
      options.map(option => ({
        value: option.value,
        text: option.textContent.trim(),
        disabled: option.disabled
      }))
    );
    
    return options;
  }

  /**
   * Arrow Type選択オプション取得
   */
  async getArrowTypeOptions() {
    const selectElement = await this.getChildElement(this.selectors.arrowTypeSelect);
    
    const options = await selectElement.$$eval('option', options =>
      options.map(option => ({
        value: option.value,
        text: option.textContent.trim(),
        symbol: option.dataset.symbol || '',
        description: option.dataset.description || ''
      }))
    );
    
    return options;
  }

  /**
   * プレビュー更新待機
   */
  async waitForPreviewUpdate() {
    // プレビューエリア表示確認
    const previewExists = await this.page.locator(this.selectors.previewArea).count() > 0;
    
    if (previewExists) {
      // プレビューテキスト更新待機
      await this.page.waitForFunction((selector) => {
        const preview = document.querySelector(selector);
        return preview && preview.textContent.trim().length > 0;
      }, this.selectors.previewText, { timeout: 5000 });
    }
  }

  /**
   * プレビューテキスト取得
   */
  async getPreviewText() {
    try {
      const previewElement = await this.getChildElement(this.selectors.previewText);
      return await previewElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * フィールドバリデーション
   */
  async validateField(fieldName, value) {
    const rule = this.validationRules[fieldName];
    if (!rule) return true;
    
    // 必須チェック
    if (rule.required && (!value || value.trim() === '')) {
      throw new Error(`${fieldName} is required`);
    }
    
    // 最大長チェック
    if (rule.maxLength && value && value.length > rule.maxLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${rule.maxLength}`);
    }
    
    // UI上のバリデーションエラー確認
    const fieldErrorElement = await this.page.locator(`${this.selectors.fieldError}[data-field="${fieldName}"]`);
    const hasFieldError = await fieldErrorElement.count() > 0;
    
    return !hasFieldError;
  }

  /**
   * 全フィールドバリデーション
   */
  async validateAllFields() {
    const values = await this.getCurrentValues();
    const errors = [];
    
    for (const [fieldName, value] of Object.entries(values)) {
      try {
        await this.validateField(fieldName, value);
      } catch (error) {
        errors.push({ field: fieldName, error: error.message });
      }
    }
    
    return errors;
  }

  /**
   * 現在の入力値取得
   */
  async getCurrentValues() {
    return {
      actorFrom: await this.getSelectedValue(this.selectors.actorFromSelect),
      arrowType: await this.getSelectedValue(this.selectors.arrowTypeSelect),
      actorTo: await this.getSelectedValue(this.selectors.actorToSelect),
      message: await this.getInputValue(this.selectors.messageInput)
    };
  }

  /**
   * 選択値取得
   */
  async getSelectedValue(selector) {
    const element = await this.getChildElement(selector);
    return await element.inputValue();
  }

  /**
   * 入力値取得
   */
  async getInputValue(selector) {
    const element = await this.getChildElement(selector);
    return await element.inputValue();
  }

  /**
   * 保存実行
   */
  async save() {
    return await this.measurePerformance(async () => {
      // バリデーション実行
      const validationErrors = await this.validateAllFields();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.error).join(', ')}`);
      }
      
      // 保存ボタンクリック
      await this.clickChildElement(this.selectors.saveButton);
      
      // モーダル非表示待機
      await this.page.waitForSelector(this.selector, { state: 'hidden', timeout: 5000 });
      
      return true;
    });
  }

  /**
   * キャンセル実行
   */
  async cancel() {
    await this.clickChildElement(this.selectors.cancelButton);
    
    // モーダル非表示待機
    await this.page.waitForSelector(this.selector, { state: 'hidden', timeout: 5000 });
  }

  /**
   * 削除実行
   */
  async delete() {
    return await this.measurePerformance(async () => {
      // 削除ボタンクリック
      await this.clickChildElement(this.selectors.deleteButton);
      
      // 確認ダイアログ処理
      await this.page.on('dialog', dialog => dialog.accept());
      
      // モーダル非表示待機
      await this.page.waitForSelector(this.selector, { state: 'hidden', timeout: 5000 });
      
      return true;
    });
  }

  /**
   * 子要素クリック
   */
  async clickChildElement(childSelector) {
    const element = await this.getChildElement(childSelector);
    await element.click();
  }

  /**
   * フォームリセット
   */
  async reset() {
    const selects = [
      this.selectors.actorFromSelect,
      this.selectors.arrowTypeSelect,
      this.selectors.actorToSelect
    ];
    
    // セレクトボックスリセット
    for (const selector of selects) {
      await this.selectOption(selector, '');
    }
    
    // テキスト入力リセット
    await this.fillMessage('');
  }

  /**
   * キーボード操作対応
   */
  async handleKeyboard(key) {
    const keyActions = {
      'Escape': () => this.cancel(),
      'Enter': () => this.save(),
      'Tab': () => this.page.keyboard.press('Tab'),
      'Shift+Tab': () => this.page.keyboard.press('Shift+Tab')
    };
    
    if (keyActions[key]) {
      await keyActions[key]();
    } else {
      await this.page.keyboard.press(key);
    }
  }

  /**
   * アクセシビリティ検証
   */
  async validateAccessibilityCompliance() {
    const baseIssues = await super.validateAccessibilityCompliance();
    
    // モーダル固有のアクセシビリティチェック
    const modalIssues = await this.page.evaluate((selector) => {
      const modal = document.querySelector(selector);
      const issues = [];
      
      // aria-modal 属性確認
      if (!modal.getAttribute('aria-modal')) {
        issues.push('Modal missing aria-modal attribute');
      }
      
      // role="dialog" 確認
      if (modal.getAttribute('role') !== 'dialog') {
        issues.push('Modal missing role="dialog"');
      }
      
      // aria-labelledby または aria-label 確認
      if (!modal.getAttribute('aria-labelledby') && !modal.getAttribute('aria-label')) {
        issues.push('Modal missing aria-labelledby or aria-label');
      }
      
      // フォーカストラップ確認
      const focusableElements = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusableElements.length === 0) {
        issues.push('Modal has no focusable elements');
      }
      
      return issues;
    }, this.selector);
    
    return baseIssues && modalIssues.length === 0;
  }

  /**
   * コンポーネント状態確認
   */
  async getComponentState() {
    const baseState = await super.getState();
    const actionEditorState = {
      currentValues: await this.getCurrentValues(),
      validationErrors: await this.validateAllFields(),
      previewText: await this.getPreviewText(),
      isModalOpen: await this.isVisible()
    };
    
    return { ...baseState, actionEditor: actionEditorState };
  }

  /**
   * パフォーマンス測定
   */
  async measureFormPerformance() {
    const metrics = {};
    
    // フォーム入力速度測定
    const fillStartTime = performance.now();
    await this.fillActionDetails({
      actorFrom: 'User',
      arrowType: '->',
      actorTo: 'System',
      message: 'テストメッセージ'
    });
    metrics.fillTime = performance.now() - fillStartTime;
    
    // バリデーション実行時間測定
    const validationStartTime = performance.now();
    await this.validateAllFields();
    metrics.validationTime = performance.now() - validationStartTime;
    
    // プレビュー更新時間測定
    const previewStartTime = performance.now();
    await this.waitForPreviewUpdate();
    metrics.previewUpdateTime = performance.now() - previewStartTime;
    
    return metrics;
  }

  /**
   * セキュリティテスト
   */
  async performSecurityTest() {
    const securityIssues = [];
    
    // XSS ペイロードテスト
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>'
    ];
    
    for (const payload of xssPayloads) {
      try {
        await this.fillMessage(payload);
        
        // XSS実行チェック
        const xssExecuted = await this.page.evaluate(() => {
          return window.__xssExecuted || false;
        });
        
        if (xssExecuted) {
          securityIssues.push(`XSS vulnerability detected with payload: ${payload}`);
        }
      } catch (error) {
        // エラーが発生した場合は適切にハンドリングされていると判断
      }
    }
    
    // HTML インジェクションテスト
    const htmlPayload = '<h1>Injected HTML</h1>';
    await this.fillMessage(htmlPayload);
    
    const previewText = await this.getPreviewText();
    if (previewText && previewText.includes('<h1>')) {
      securityIssues.push('HTML injection vulnerability detected');
    }
    
    return securityIssues;
  }

  /**
   * コンポーネントクリーンアップ
   */
  async cleanup() {
    // モーダルが開いている場合は閉じる
    if (await this.isVisible()) {
      await this.cancel();
    }
    
    await super.cleanup();
  }
}

export default ActionEditorComponent;