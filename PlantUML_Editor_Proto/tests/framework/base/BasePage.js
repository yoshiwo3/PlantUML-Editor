/**
 * BasePage - Page Object Model (POM) 基底クラス
 * 
 * PlantUML Editor Sprint3 Hybrid Object Model Framework
 * セキュリティ強化・パフォーマンス最適化対応
 */

import { expect } from '@playwright/test';

export class BasePage {
  constructor(page, context = null) {
    this.page = page;
    this.context = context;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8086';
    this.timeout = 30000;
    this.shortTimeout = 5000;
    
    // セキュリティ監視オプション
    this.securityOptions = {
      monitorCSP: true,
      monitorXSS: true,
      monitorInjection: true
    };
    
    // パフォーマンス監視オプション
    this.performanceOptions = {
      monitorLoadTime: true,
      monitorMemory: true,
      monitorDOMSize: true,
      thresholds: {
        loadTime: 3000,    // 3秒以内
        memoryUsage: 100,  // 100MB以内
        domNodes: 5000     // 5000ノード以内
      }
    };
  }

  /**
   * ページナビゲーション（セキュリティチェック付き）
   */
  async navigate(path = '') {
    const url = `${this.baseURL}${path}`;
    
    // CSPヘッダー監視
    let cspHeader = null;
    if (this.securityOptions.monitorCSP) {
      this.page.on('response', response => {
        if (response.url().includes(this.baseURL)) {
          cspHeader = response.headers()['content-security-policy'];
        }
      });
    }
    
    // パフォーマンス測定開始
    const startTime = Date.now();
    
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: this.timeout 
    });
    
    // ロード時間チェック
    const loadTime = Date.now() - startTime;
    if (this.performanceOptions.monitorLoadTime && 
        loadTime > this.performanceOptions.thresholds.loadTime) {
      console.warn(`Page load time exceeded threshold: ${loadTime}ms`);
    }
    
    // セキュリティチェック実行
    await this.performSecurityChecks();
    
    // パフォーマンスチェック実行
    await this.performPerformanceChecks();
    
    return { loadTime, cspHeader };
  }

  /**
   * 要素の安全な待機（XSS対策付き）
   */
  async waitForElement(selector, options = {}) {
    const element = await this.page.waitForSelector(selector, {
      timeout: options.timeout || this.timeout,
      state: options.state || 'visible'
    });
    
    // XSS監視
    if (this.securityOptions.monitorXSS) {
      await this.checkElementForXSS(element);
    }
    
    return element;
  }

  /**
   * 安全なテキスト入力（インジェクション対策）
   */
  async fillSafe(selector, text, options = {}) {
    // インジェクション検出
    if (this.securityOptions.monitorInjection) {
      this.detectInjectionAttempt(text);
    }
    
    const element = await this.waitForElement(selector);
    await element.fill(text, options);
    
    // 入力値検証
    const actualValue = await element.inputValue();
    expect(actualValue).toBe(text);
    
    return element;
  }

  /**
   * 安全なクリック操作
   */
  async clickSafe(selector, options = {}) {
    const element = await this.waitForElement(selector);
    
    // クリック前のDOM状態記録
    const domNodesBefore = await this.getDOMNodeCount();
    
    await element.click(options);
    
    // DOM変更監視
    if (this.performanceOptions.monitorDOMSize) {
      await this.page.waitForTimeout(100); // DOM更新待機
      const domNodesAfter = await this.getDOMNodeCount();
      const domGrowth = domNodesAfter - domNodesBefore;
      
      if (domGrowth > 500) { // 閾値超過警告
        console.warn(`DOM nodes increased significantly: +${domGrowth}`);
      }
    }
    
    return element;
  }

  /**
   * スクリーンショット撮影（テスト証跡）
   */
  async takeScreenshot(name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    
    return await this.page.screenshot({
      path: `test-results/screenshots/${filename}`,
      fullPage: options.fullPage || false,
      ...options
    });
  }

  /**
   * セキュリティチェック実行
   */
  async performSecurityChecks() {
    const securityIssues = [];
    
    // CSP違反チェック
    const cspViolations = await this.page.evaluate(() => {
      return window.__cspViolations || [];
    });
    
    if (cspViolations.length > 0) {
      securityIssues.push({ type: 'CSP_VIOLATION', violations: cspViolations });
    }
    
    // XSS脆弱性チェック
    const hasXSSIndicators = await this.page.evaluate(() => {
      const dangerousElements = document.querySelectorAll('script[src*="javascript:"], *[onclick], *[onload]');
      return dangerousElements.length > 0;
    });
    
    if (hasXSSIndicators) {
      securityIssues.push({ type: 'XSS_INDICATORS', detected: true });
    }
    
    // Mixed Content チェック
    const hasMixedContent = await this.page.evaluate(() => {
      const httpResources = Array.from(document.querySelectorAll('img, script, link')).some(el => {
        const src = el.src || el.href;
        return src && src.startsWith('http://') && window.location.protocol === 'https:';
      });
      return httpResources;
    });
    
    if (hasMixedContent) {
      securityIssues.push({ type: 'MIXED_CONTENT', detected: true });
    }
    
    return securityIssues;
  }

  /**
   * パフォーマンスチェック実行
   */
  async performPerformanceChecks() {
    const metrics = {};
    
    // メモリ使用量チェック
    const memoryInfo = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (memoryInfo) {
      metrics.memory = memoryInfo;
      const memoryMB = memoryInfo.used / (1024 * 1024);
      
      if (memoryMB > this.performanceOptions.thresholds.memoryUsage) {
        console.warn(`Memory usage exceeded threshold: ${memoryMB.toFixed(2)}MB`);
      }
    }
    
    // DOM ノード数チェック
    const domNodes = await this.getDOMNodeCount();
    metrics.domNodes = domNodes;
    
    if (domNodes > this.performanceOptions.thresholds.domNodes) {
      console.warn(`DOM nodes exceeded threshold: ${domNodes}`);
    }
    
    // CLS (Cumulative Layout Shift) チェック
    const cls = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
          resolve(cls);
        }).observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => resolve(cls), 1000);
      });
    });
    
    metrics.cls = cls;
    
    return metrics;
  }

  /**
   * XSS検出チェック
   */
  async checkElementForXSS(element) {
    const innerHTML = await element.innerHTML();
    const textContent = await element.textContent();
    
    // 危険なパターンチェック
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /eval\s*\(/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(innerHTML) || pattern.test(textContent)) {
        throw new Error(`Potential XSS detected in element: ${pattern}`);
      }
    }
  }

  /**
   * インジェクション攻撃検出
   */
  detectInjectionAttempt(input) {
    const injectionPatterns = [
      // SQL Injection
      /('|(\\')|(;)|(\|)|(\*)|(%)|(<|>|脚|>)|(\+)|(\||=)/gi,
      // NoSQL Injection
      /\$where|\$ne|\$gt|\$lt|\$regex/gi,
      // Command Injection
      /(\||;|&|`|\$\()/gi,
      // XSS
      /<script|javascript:|onload=|onerror=/gi
    ];
    
    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        console.warn(`Potential injection attempt detected: ${input}`);
        break;
      }
    }
  }

  /**
   * DOM ノード数取得
   */
  async getDOMNodeCount() {
    return await this.page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });
  }

  /**
   * ページエラー監視設定
   */
  setupErrorMonitoring() {
    this.page.on('pageerror', exception => {
      console.error(`Page error: ${exception.toString()}`);
    });
    
    this.page.on('requestfailed', request => {
      console.error(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    });
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });
  }

  /**
   * 共通アサーション
   */
  async assertPageLoaded() {
    await expect(this.page).toHaveTitle(/PlantUML/);
    await this.waitForElement('body');
  }

  async assertNoJavaScriptErrors() {
    const errors = await this.page.evaluate(() => {
      return window.__pageErrors || [];
    });
    
    expect(errors).toHaveLength(0);
  }

  /**
   * 日本語入力対応チェック
   */
  async checkJapaneseInputSupport(selector) {
    const testText = '日本語テスト入力';
    await this.fillSafe(selector, testText);
    
    const actualValue = await this.page.inputValue(selector);
    expect(actualValue).toBe(testText);
    
    return true;
  }

  /**
   * アクセシビリティチェック
   */
  async checkAccessibility() {
    // ARIA属性チェック
    const missingAriaLabels = await this.page.evaluate(() => {
      const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href]');
      const missing = [];
      
      interactiveElements.forEach(el => {
        if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.innerText.trim()) {
          missing.push(el.tagName + (el.id ? `#${el.id}` : ''));
        }
      });
      
      return missing;
    });
    
    if (missingAriaLabels.length > 0) {
      console.warn(`Elements missing ARIA labels: ${missingAriaLabels.join(', ')}`);
    }
    
    return missingAriaLabels;
  }

  /**
   * リソースクリーンアップ
   */
  async cleanup() {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
  }
}

export default BasePage;