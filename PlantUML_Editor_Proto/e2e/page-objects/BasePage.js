/**
 * Base Page Object Model
 * Sprint2 E2E Test Foundation Framework
 */

import { expect } from '@playwright/test';

export class BasePage {
  constructor(page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8086';
  }

  /**
   * 基本ナビゲーション
   */
  async navigate(path = '/') {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * ページ読み込み完了待機
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 要素の存在確認
   */
  async assertElementExists(selector, timeout = 5000) {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  /**
   * 要素のテキスト確認
   */
  async assertElementText(selector, expectedText, timeout = 5000) {
    await expect(this.page.locator(selector)).toContainText(expectedText, { timeout });
  }

  /**
   * 要素クリック
   */
  async clickElement(selector) {
    await this.page.click(selector);
  }

  /**
   * 入力フィールドに値設定
   */
  async fillInput(selector, value) {
    await this.page.fill(selector, value);
  }

  /**
   * スクリーンショット取得
   */
  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return await this.page.screenshot({ 
      path: `test-results/screenshots/${name}_${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * エラー監視
   */
  async startErrorMonitoring() {
    this.errors = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push({
          type: 'console',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    this.page.on('pageerror', error => {
      this.errors.push({
        type: 'javascript',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * エラー取得
   */
  getErrors() {
    return this.errors || [];
  }

  /**
   * ページタイトル確認
   */
  async assertPageTitle(expectedTitle) {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  /**
   * URL確認
   */
  async assertCurrentURL(expectedURL) {
    await expect(this.page).toHaveURL(expectedURL);
  }

  /**
   * 待機
   */
  async wait(milliseconds) {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * 要素が表示されるまで待機
   */
  async waitForSelector(selector, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * 要素が非表示になるまで待機
   */
  async waitForSelectorToDisappear(selector, timeout = 5000) {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * JavaScript関数の実行完了待機
   */
  async waitForFunction(fn, timeout = 5000) {
    await this.page.waitForFunction(fn, { timeout });
  }

  /**
   * ローカルストレージ操作
   */
  async setLocalStorage(key, value) {
    await this.page.evaluate(([key, value]) => {
      localStorage.setItem(key, value);
    }, [key, value]);
  }

  async getLocalStorage(key) {
    return await this.page.evaluate(key => {
      return localStorage.getItem(key);
    }, key);
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  /**
   * セッションストレージ操作
   */
  async setSessionStorage(key, value) {
    await this.page.evaluate(([key, value]) => {
      sessionStorage.setItem(key, value);
    }, [key, value]);
  }

  async getSessionStorage(key) {
    return await this.page.evaluate(key => {
      return sessionStorage.getItem(key);
    }, key);
  }

  async clearSessionStorage() {
    await this.page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  /**
   * ブラウザ情報取得
   */
  async getBrowserInfo() {
    return await this.page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });
  }

  /**
   * パフォーマンス測定
   */
  async measurePerformance(actionFunction) {
    const startTime = Date.now();
    await actionFunction();
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * DOM準備状態確認
   */
  async waitForDOMReady() {
    await this.page.waitForFunction(() => {
      return document.readyState === 'complete';
    });
  }

  /**
   * カスタム要素の準備完了待機
   */
  async waitForCustomElementReady(elementName) {
    await this.page.waitForFunction((name) => {
      return customElements.get(name) !== undefined;
    }, elementName);
  }
}