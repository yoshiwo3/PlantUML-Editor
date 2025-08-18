/**
 * BaseComponent - Component Object Model (COM) 基底クラス
 * 
 * PlantUML Editor Sprint3 Hybrid Object Model Framework
 * UI コンポーネント単位でのテスト操作・検証を提供
 */

import { expect } from '@playwright/test';

export class BaseComponent {
  constructor(page, selector, options = {}) {
    this.page = page;
    this.selector = selector;
    this.timeout = options.timeout || 30000;
    this.name = options.name || this.constructor.name;
    
    // コンポーネント固有設定
    this.waitForStable = options.waitForStable !== false;
    this.monitorPerformance = options.monitorPerformance !== false;
    this.validateAccessibility = options.validateAccessibility !== false;
  }

  /**
   * コンポーネント要素取得
   */
  async getElement() {
    return await this.page.waitForSelector(this.selector, {
      timeout: this.timeout,
      state: 'visible'
    });
  }

  /**
   * コンポーネント内要素取得
   */
  async getChildElement(childSelector) {
    const parent = await this.getElement();
    return await parent.waitForSelector(childSelector, {
      timeout: this.timeout
    });
  }

  /**
   * コンポーネント表示確認
   */
  async isVisible() {
    try {
      const element = await this.page.waitForSelector(this.selector, {
        timeout: 5000,
        state: 'visible'
      });
      return !!element;
    } catch {
      return false;
    }
  }

  /**
   * コンポーネント有効性確認
   */
  async isEnabled() {
    const element = await this.getElement();
    return await element.isEnabled();
  }

  /**
   * コンポーネント安定待機
   */
  async waitForStability() {
    if (!this.waitForStable) return;
    
    // アニメーション完了待機
    await this.page.waitForFunction((selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      
      const styles = window.getComputedStyle(element);
      return styles.getPropertyValue('animation-play-state') !== 'running' &&
             styles.getPropertyValue('transition-property') === 'none';
    }, this.selector, { timeout: 5000 });
    
    // レイアウトシフト待機
    await this.page.waitForTimeout(100);
  }

  /**
   * コンポーネントパフォーマンス測定
   */
  async measurePerformance(action) {
    if (!this.monitorPerformance) return null;
    
    const startTime = performance.now();
    
    // メモリ使用量（開始時）
    const memoryBefore = await this.page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    // アクション実行
    const result = await action();
    
    // レンダリング完了待機
    await this.waitForStability();
    
    const endTime = performance.now();
    
    // メモリ使用量（終了時）
    const memoryAfter = await this.page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    const metrics = {
      duration: endTime - startTime,
      memoryUsed: memoryAfter - memoryBefore,
      component: this.name
    };
    
    // パフォーマンス閾値チェック
    if (metrics.duration > 1000) {
      console.warn(`Component ${this.name} action took ${metrics.duration}ms`);
    }
    
    if (metrics.memoryUsed > 1024 * 1024) { // 1MB
      console.warn(`Component ${this.name} used ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return { result, metrics };
  }

  /**
   * アクセシビリティ検証
   */
  async validateAccessibilityCompliance() {
    if (!this.validateAccessibility) return true;
    
    const element = await this.getElement();
    const issues = [];
    
    // フォーカス可能要素のタブインデックスチェック
    const focusableElements = await element.$$('button, input, select, textarea, a[href], [tabindex]');
    for (const focusable of focusableElements) {
      const tabIndex = await focusable.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push('Positive tabindex detected - use 0 or -1');
      }
    }
    
    // 色彩コントラストチェック（基本）
    const contrastIssues = await this.page.evaluate((selector) => {
      const element = document.querySelector(selector);
      const styles = window.getComputedStyle(element);
      const backgroundColor = styles.backgroundColor;
      const color = styles.color;
      
      // 基本的な色チェック（詳細なコントラスト計算は省略）
      if (backgroundColor === 'rgb(255, 255, 255)' && color === 'rgb(255, 255, 255)') {
        return ['White text on white background detected'];
      }
      return [];
    }, this.selector);
    
    issues.push(...contrastIssues);
    
    if (issues.length > 0) {
      console.warn(`Accessibility issues in ${this.name}:`, issues);
    }
    
    return issues.length === 0;
  }

  /**
   * コンポーネント状態取得
   */
  async getState() {
    const element = await this.getElement();
    
    return {
      visible: await this.isVisible(),
      enabled: await this.isEnabled(),
      boundingBox: await element.boundingBox(),
      innerHTML: await element.innerHTML(),
      textContent: await element.textContent(),
      attributes: await this.getAttributes(element)
    };
  }

  /**
   * 属性一覧取得
   */
  async getAttributes(element) {
    return await element.evaluate(el => {
      const attrs = {};
      for (const attr of el.attributes) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    });
  }

  /**
   * コンポーネントスクリーンショット
   */
  async screenshot(options = {}) {
    const element = await this.getElement();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.name}_${timestamp}.png`;
    
    return await element.screenshot({
      path: `test-results/components/${filename}`,
      ...options
    });
  }

  /**
   * コンポーネント内テキスト検証
   */
  async assertText(expectedText, options = {}) {
    const element = await this.getElement();
    
    if (options.exact) {
      await expect(element).toHaveText(expectedText);
    } else {
      await expect(element).toContainText(expectedText);
    }
  }

  /**
   * コンポーネント属性検証
   */
  async assertAttribute(attributeName, expectedValue) {
    const element = await this.getElement();
    await expect(element).toHaveAttribute(attributeName, expectedValue);
  }

  /**
   * コンポーネント CSS クラス検証
   */
  async assertHasClass(className) {
    const element = await this.getElement();
    await expect(element).toHaveClass(new RegExp(className));
  }

  /**
   * 子要素数検証
   */
  async assertChildCount(expectedCount, childSelector = '*') {
    const element = await this.getElement();
    const children = await element.$$(childSelector);
    expect(children).toHaveLength(expectedCount);
  }

  /**
   * コンポーネント動作検証（基本）
   */
  async assertFunctional() {
    // 基本的な表示・有効性確認
    expect(await this.isVisible()).toBe(true);
    expect(await this.isEnabled()).toBe(true);
    
    // アクセシビリティ検証
    const accessibilityValid = await this.validateAccessibilityCompliance();
    expect(accessibilityValid).toBe(true);
    
    return true;
  }

  /**
   * コンポーネントクリーンアップ
   */
  async cleanup() {
    // 必要に応じてオーバーライド
  }
}

/**
 * 特定コンポーネント用ミックスイン
 */
export class InteractiveComponent extends BaseComponent {
  /**
   * クリック操作（パフォーマンス測定付き）
   */
  async click(options = {}) {
    return await this.measurePerformance(async () => {
      const element = await this.getElement();
      await element.click(options);
      return true;
    });
  }

  /**
   * ホバー操作
   */
  async hover() {
    const element = await this.getElement();
    await element.hover();
    await this.waitForStability();
  }

  /**
   * フォーカス操作
   */
  async focus() {
    const element = await this.getElement();
    await element.focus();
  }

  /**
   * ダブルクリック操作
   */
  async doubleClick() {
    return await this.measurePerformance(async () => {
      const element = await this.getElement();
      await element.dblclick();
      return true;
    });
  }

  /**
   * 右クリック操作
   */
  async rightClick() {
    const element = await this.getElement();
    await element.click({ button: 'right' });
  }
}

export class FormComponent extends BaseComponent {
  /**
   * テキスト入力（日本語対応）
   */
  async fill(text, options = {}) {
    return await this.measurePerformance(async () => {
      const element = await this.getElement();
      
      // 既存値クリア
      if (options.clear !== false) {
        await element.clear();
      }
      
      // テキスト入力
      await element.fill(text);
      
      // 日本語入力確認
      if (this.isJapaneseText(text)) {
        await this.page.waitForTimeout(100); // IME処理待機
        const actualValue = await element.inputValue();
        expect(actualValue).toBe(text);
      }
      
      return text;
    });
  }

  /**
   * 選択肢選択
   */
  async selectOption(value) {
    return await this.measurePerformance(async () => {
      const element = await this.getElement();
      await element.selectOption(value);
      return value;
    });
  }

  /**
   * チェックボックス操作
   */
  async check(checked = true) {
    return await this.measurePerformance(async () => {
      const element = await this.getElement();
      if (checked) {
        await element.check();
      } else {
        await element.uncheck();
      }
      return checked;
    });
  }

  /**
   * 日本語テキスト判定
   */
  isJapaneseText(text) {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  /**
   * フォーム値取得
   */
  async getValue() {
    const element = await this.getElement();
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    
    switch (tagName) {
      case 'input':
        const inputType = await element.getAttribute('type');
        if (['checkbox', 'radio'].includes(inputType)) {
          return await element.isChecked();
        }
        return await element.inputValue();
      case 'select':
        return await element.inputValue();
      case 'textarea':
        return await element.inputValue();
      default:
        return await element.textContent();
    }
  }
}

export class ListComponent extends BaseComponent {
  /**
   * リストアイテム数取得
   */
  async getItemCount() {
    const element = await this.getElement();
    const items = await element.$$('li, .item, [data-item]');
    return items.length;
  }

  /**
   * 特定アイテム取得
   */
  async getItem(index) {
    const element = await this.getElement();
    const items = await element.$$('li, .item, [data-item]');
    
    if (index < 0 || index >= items.length) {
      throw new Error(`Item index ${index} out of range (0-${items.length - 1})`);
    }
    
    return items[index];
  }

  /**
   * アイテムテキスト一覧取得
   */
  async getItemTexts() {
    const element = await this.getElement();
    const items = await element.$$('li, .item, [data-item]');
    
    const texts = [];
    for (const item of items) {
      texts.push(await item.textContent());
    }
    
    return texts;
  }

  /**
   * アイテム検索
   */
  async findItemByText(searchText) {
    const element = await this.getElement();
    return await element.locator('li, .item, [data-item]').filter({ hasText: searchText }).first();
  }
}

export default BaseComponent;