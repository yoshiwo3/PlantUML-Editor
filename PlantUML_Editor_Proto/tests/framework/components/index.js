/**
 * Component Objects Index - コンポーネントオブジェクトの統一エクスポート
 * Sprint3 TEST-005-3実装
 * 
 * 全コンポーネントオブジェクトを一括インポート・エクスポートするためのインデックスファイル
 */

// 主要コンポーネント
export { default as ActionItemComponent } from './ActionItemComponent.js';
export { default as ConditionBlockComponent } from './ConditionBlockComponent.js';
export { default as LoopBlockComponent } from './LoopBlockComponent.js';
export { default as ParallelBlockComponent } from './ParallelBlockComponent.js';
export { default as ModalComponent } from './ModalComponent.js';

// UI コンポーネント  
export { default as ButtonComponent } from './ButtonComponent.js';
export { default as DropdownComponent } from './DropdownComponent.js';
export { default as InputFieldComponent } from './InputFieldComponent.js';
export { default as ErrorMessageComponent } from './ErrorMessageComponent.js';

// 特殊コンポーネント
export { default as DragHandleComponent } from './DragHandleComponent.js';
export { default as QuestionButtonComponent } from './QuestionButtonComponent.js';

/**
 * コンポーネントファクトリー - 指定されたページに対してすべてのコンポーネントを初期化
 * @param {Page} page - Playwrightページオブジェクト
 * @returns {Object} 初期化されたコンポーネントオブジェクト
 */
export function createComponentSuite(page) {
  return {
    // 主要編集コンポーネント
    actionItem: new ActionItemComponent(page),
    conditionBlock: new ConditionBlockComponent(page),
    loopBlock: new LoopBlockComponent(page),
    parallelBlock: new ParallelBlockComponent(page),
    
    // UI コンポーネント
    modal: new ModalComponent(page),
    button: new ButtonComponent(page),
    dropdown: new DropdownComponent(page),
    inputField: new InputFieldComponent(page),
    errorMessage: new ErrorMessageComponent(page),
    
    // 特殊コンポーネント
    dragHandle: new DragHandleComponent(page),
    questionButton: new QuestionButtonComponent(page)
  };
}

/**
 * コンポーネント設定の統一管理
 */
export const ComponentConfig = {
  // グローバル設定
  global: {
    defaultTimeout: 5000,
    shortTimeout: 1000,
    longTimeout: 10000,
    animationDelay: 300
  },
  
  // アクション項目設定
  actionItem: {
    maxItems: 100,
    dragDelay: 100,
    editTimeout: 3000
  },
  
  // 条件分岐設定
  conditionBlock: {
    maxNestLevel: 5,
    maxActionsPerBranch: 20,
    validationTimeout: 2000
  },
  
  // ループ設定
  loopBlock: {
    maxIterations: 1000,
    performanceWarningThreshold: 100,
    timeoutWarning: 5000
  },
  
  // 並行処理設定
  parallelBlock: {
    maxThreads: 10,
    syncTimeout: 5000,
    deadlockDetectionTimeout: 10000
  },
  
  // モーダル設定
  modal: {
    showAnimationTime: 300,
    hideAnimationTime: 200,
    overlayClickEnabled: true,
    escapeKeyEnabled: true
  }
};

/**
 * コンポーネント共通ユーティリティ
 */
export const ComponentUtils = {
  /**
   * 日本語入力をシミュレート
   * @param {Locator} element - 入力要素
   * @param {string} text - 日本語テキスト
   * @param {Object} options - オプション
   */
  async typeJapanese(element, text, options = {}) {
    const { delay = 50, clearFirst = true } = options;
    
    if (clearFirst) {
      await element.clear();
    }
    
    // 日本語入力をシミュレート
    await element.type(text, { delay });
    
    // IME確定待機
    await element.page().waitForTimeout(100);
  },

  /**
   * 要素の表示を待機
   * @param {Locator} element - 対象要素
   * @param {number} timeout - タイムアウト時間
   */
  async waitForVisible(element, timeout = ComponentConfig.global.defaultTimeout) {
    await element.waitFor({ state: 'visible', timeout });
  },

  /**
   * 要素の非表示を待機
   * @param {Locator} element - 対象要素
   * @param {number} timeout - タイムアウト時間
   */
  async waitForHidden(element, timeout = ComponentConfig.global.defaultTimeout) {
    await element.waitFor({ state: 'hidden', timeout });
  },

  /**
   * アニメーション完了を待機
   * @param {Page} page - ページオブジェクト
   * @param {number} delay - 待機時間
   */
  async waitForAnimation(page, delay = ComponentConfig.global.animationDelay) {
    await page.waitForTimeout(delay);
  },

  /**
   * 要素のバウンディングボックスを取得
   * @param {Locator} element - 対象要素
   * @returns {Object} バウンディングボックス
   */
  async getBoundingBox(element) {
    await this.waitForVisible(element);
    return await element.boundingBox();
  },

  /**
   * 要素の中央座標を取得
   * @param {Locator} element - 対象要素
   * @returns {Object} 中央座標 {x, y}
   */
  async getCenterPoint(element) {
    const box = await this.getBoundingBox(element);
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  },

  /**
   * ドラッグ&ドロップ操作
   * @param {Page} page - ページオブジェクト
   * @param {Locator} source - ドラッグ元要素
   * @param {Locator} target - ドロップ先要素
   * @param {Object} options - オプション
   */
  async dragAndDrop(page, source, target, options = {}) {
    const { steps = 5, delay = ComponentConfig.actionItem.dragDelay } = options;
    
    const sourcePoint = await this.getCenterPoint(source);
    const targetPoint = await this.getCenterPoint(target);
    
    await page.mouse.move(sourcePoint.x, sourcePoint.y);
    await page.mouse.down();
    await page.waitForTimeout(delay);
    
    await page.mouse.move(targetPoint.x, targetPoint.y, { steps });
    await page.mouse.up();
    
    await this.waitForAnimation(page);
  },

  /**
   * バリデーションエラーを収集
   * @param {Page} page - ページオブジェクト
   * @param {string} containerSelector - コンテナセレクタ
   * @returns {Array} エラーメッセージの配列
   */
  async collectValidationErrors(page, containerSelector = '') {
    const errorSelectors = [
      '.validation-error',
      '.field-error',
      '.error-message',
      '[data-testid*="error"]'
    ];
    
    const errors = [];
    
    for (const selector of errorSelectors) {
      const fullSelector = containerSelector ? `${containerSelector} ${selector}` : selector;
      const errorElements = await page.locator(fullSelector).all();
      
      for (const element of errorElements) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          const errorText = await element.textContent();
          errors.push(errorText.trim());
        }
      }
    }
    
    return errors;
  },

  /**
   * フォーカス可能要素を取得
   * @param {Page} page - ページオブジェクト
   * @param {string} containerSelector - コンテナセレクタ
   * @returns {Array} フォーカス可能要素のリスト
   */
  async getFocusableElements(page, containerSelector = '') {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    const selector = focusableSelectors.map(s => 
      containerSelector ? `${containerSelector} ${s}` : s
    ).join(', ');
    
    return await page.locator(selector).all();
  },

  /**
   * キーボードナビゲーションテスト
   * @param {Page} page - ページオブジェクト
   * @param {string} containerSelector - コンテナセレクタ
   * @returns {Object} ナビゲーションテスト結果
   */
  async testKeyboardNavigation(page, containerSelector = '') {
    const focusableElements = await this.getFocusableElements(page, containerSelector);
    const results = {
      totalElements: focusableElements.length,
      navigableElements: 0,
      tabOrder: [],
      issues: []
    };
    
    // 最初の要素にフォーカス
    if (focusableElements.length > 0) {
      await focusableElements[0].focus();
    }
    
    // Tab キーでナビゲーション
    for (let i = 0; i < focusableElements.length; i++) {
      const focusedElement = page.locator(':focus');
      const elementInfo = await this.getElementInfo(focusedElement);
      
      results.tabOrder.push(elementInfo);
      results.navigableElements++;
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    return results;
  },

  /**
   * 要素情報を取得
   * @param {Locator} element - 対象要素
   * @returns {Object} 要素情報
   */
  async getElementInfo(element) {
    try {
      return {
        tagName: await element.evaluate(el => el.tagName),
        id: await element.getAttribute('id'),
        className: await element.getAttribute('class'),
        testId: await element.getAttribute('data-testid'),
        ariaLabel: await element.getAttribute('aria-label'),
        text: await element.textContent()
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};

/**
 * コンポーネントテストヘルパー
 */
export const ComponentTestHelpers = {
  /**
   * 全コンポーネントの初期化テスト
   * @param {Page} page - ページオブジェクト
   * @returns {Object} 初期化テスト結果
   */
  async testComponentInitialization(page) {
    const components = createComponentSuite(page);
    const results = {};
    
    for (const [name, component] of Object.entries(components)) {
      try {
        // コンポーネントの基本メソッドが利用可能か確認
        results[name] = {
          initialized: component !== null,
          hasPage: component.page !== null,
          methods: Object.getOwnPropertyNames(Object.getPrototypeOf(component))
        };
      } catch (error) {
        results[name] = {
          initialized: false,
          error: error.message
        };
      }
    }
    
    return results;
  },

  /**
   * 全コンポーネントのパフォーマンステスト
   * @param {Page} page - ページオブジェクト
   * @returns {Object} パフォーマンステスト結果
   */
  async testComponentPerformance(page) {
    const components = createComponentSuite(page);
    const results = {};
    
    for (const [name, component] of Object.entries(components)) {
      if (component.measurePerformance) {
        try {
          const startTime = Date.now();
          const performanceResult = await component.measurePerformance();
          const endTime = Date.now();
          
          results[name] = {
            ...performanceResult,
            testDuration: endTime - startTime
          };
        } catch (error) {
          results[name] = {
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }
    }
    
    return results;
  },

  /**
   * アクセシビリティ一括テスト
   * @param {Page} page - ページオブジェクト
   * @returns {Object} アクセシビリティテスト結果
   */
  async testComponentAccessibility(page) {
    const results = {
      keyboardNavigation: await ComponentUtils.testKeyboardNavigation(page),
      validationErrors: await ComponentUtils.collectValidationErrors(page),
      focusableElements: (await ComponentUtils.getFocusableElements(page)).length,
      timestamp: new Date().toISOString()
    };
    
    return results;
  }
};

// デフォルトエクスポート（主要な機能）
export default {
  createComponentSuite,
  ComponentConfig,
  ComponentUtils,
  ComponentTestHelpers
};