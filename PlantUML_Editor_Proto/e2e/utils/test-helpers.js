/**
 * E2Eテスト共通ヘルパー関数
 * Sprint2 E2Eテスト基盤用の包括的なユーティリティ集
 */

import { expect } from '@playwright/test';

/**
 * 日本語テキスト処理用ヘルパー
 */
export class JapaneseTextHelper {
  /**
   * 文字エンコーディング確認
   * @param {string} text - 確認するテキスト
   */
  static isValidEncoding(text) {
    try {
      const encoded = encodeURIComponent(text);
      const decoded = decodeURIComponent(encoded);
      return decoded === text;
    } catch {
      return false;
    }
  }

  /**
   * 日本語文字種判定
   * @param {string} text - 判定するテキスト
   */
  static getCharacterTypes(text) {
    const hiragana = /[\u3040-\u309F]/.test(text);
    const katakana = /[\u30A0-\u30FF]/.test(text);
    const kanji = /[\u4E00-\u9FAF]/.test(text);
    const ascii = /[\u0020-\u007E]/.test(text);
    
    return { hiragana, katakana, kanji, ascii };
  }

  /**
   * 複雑な日本語テキストサンプル生成
   */
  static generateComplexSamples() {
    return [
      'システム管理者がデータベースにアクセスする',
      'ユーザー → システム: ログイン要求（認証情報含む）',
      'API Gateway ↔ マイクロサービス: 非同期通信',
      '顧客「注文確認メール」→ システム ← データベース',
      '複数の条件分岐（IF-ELSE-ENDIF）を含む処理フロー',
      '例外処理：エラー発生時の代替ルート実行'
    ];
  }
}

/**
 * PlantUML構文検証ヘルパー
 */
export class PlantUMLValidator {
  /**
   * 基本構文チェック
   * @param {string} code - PlantUMLコード
   */
  static validateBasicSyntax(code) {
    const hasStart = code.includes('@startuml');
    const hasEnd = code.includes('@enduml');
    const isBalanced = code.split('@startuml').length === code.split('@enduml').length;
    
    return {
      valid: hasStart && hasEnd && isBalanced,
      hasStart,
      hasEnd,
      isBalanced
    };
  }

  /**
   * シーケンス図構文チェック
   * @param {string} code - PlantUMLコード
   */
  static validateSequenceDiagram(code) {
    const patterns = {
      actors: /(?:actor|participant)\s+\w+/g,
      messages: /\w+\s*-[->]+\s*\w+\s*:/g,
      notes: /note\s+(left|right|over)\s*(of\s+\w+)?\s*:/g,
      activations: /activate\s+\w+|deactivate\s+\w+/g
    };

    const results = {};
    for (const [type, pattern] of Object.entries(patterns)) {
      results[type] = (code.match(pattern) || []).length;
    }

    return results;
  }

  /**
   * クラス図構文チェック
   * @param {string} code - PlantUMLコード
   */
  static validateClassDiagram(code) {
    const patterns = {
      classes: /class\s+\w+/g,
      inheritance: /<\|--|--|>|\|>/g,
      composition: /\*--|\*\.\./g,
      aggregation: /o--/g,
      fields: /[+-]?\w+\s*:\s*\w+/g,
      methods: /[+-]?\w+\s*\([^)]*\)\s*:\s*\w*/g
    };

    const results = {};
    for (const [type, pattern] of Object.entries(patterns)) {
      results[type] = (code.match(pattern) || []).length;
    }

    return results;
  }
}

/**
 * パフォーマンス測定ヘルパー
 */
export class PerformanceHelper {
  /**
   * ページロード時間測定
   * @param {Page} page - Playwrightページオブジェクト
   */
  static async measurePageLoad(page) {
    const startTime = Date.now();
    
    await page.goto('http://localhost:8086', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;

    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalBytes: navigation.transferSize,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    return {
      totalLoadTime: loadTime,
      ...metrics
    };
  }

  /**
   * リアルタイム同期性能測定
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} inputText - テスト入力テキスト
   */
  static async measureSyncPerformance(page, inputText) {
    const startTime = performance.now();
    
    // 入力実行
    await page.fill('#japanese-input', inputText);
    
    // PlantUMLエディターの更新を待機
    await page.waitForFunction(
      (text) => {
        const editor = document.querySelector('#plantuml-editor');
        return editor && editor.value.length > 0;
      },
      inputText,
      { timeout: 5000 }
    );
    
    const syncTime = performance.now() - startTime;

    // プレビューの更新も確認
    const previewStartTime = performance.now();
    await page.waitForFunction(() => {
      const preview = document.querySelector('#preview-area');
      return preview && (preview.querySelector('svg') || preview.querySelector('img'));
    }, { timeout: 10000 });
    
    const previewTime = performance.now() - previewStartTime;

    return {
      syncTime,
      previewTime,
      totalTime: syncTime + previewTime
    };
  }

  /**
   * メモリ使用量測定
   * @param {Page} page - Playwrightページオブジェクト
   */
  static async measureMemoryUsage(page) {
    return await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
        };
      }
      return null;
    });
  }
}

/**
 * エラーハンドリングヘルパー
 */
export class ErrorHelper {
  /**
   * コンソールエラー監視開始
   * @param {Page} page - Playwrightページオブジェクト
   */
  static startErrorMonitoring(page) {
    const errors = [];
    const warnings = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console-error',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      } else if (msg.type() === 'warning') {
        warnings.push({
          type: 'console-warning',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('pageerror', (error) => {
      errors.push({
        type: 'page-error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push({
          type: 'network-error',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
      }
    });

    return {
      getErrors: () => [...errors],
      getWarnings: () => [...warnings],
      hasErrors: () => errors.length > 0,
      hasWarnings: () => warnings.length > 0,
      clear: () => {
        errors.length = 0;
        warnings.length = 0;
      }
    };
  }

  /**
   * ネットワークエラー検証
   * @param {Array} errors - エラー配列
   */
  static validateNetworkErrors(errors) {
    const networkErrors = errors.filter(e => e.type === 'network-error');
    const criticalErrors = networkErrors.filter(e => e.status >= 500);
    const clientErrors = networkErrors.filter(e => e.status >= 400 && e.status < 500);

    return {
      total: networkErrors.length,
      critical: criticalErrors.length,
      client: clientErrors.length,
      details: networkErrors
    };
  }
}

/**
 * ファイル操作ヘルパー
 */
export class FileHelper {
  /**
   * ファイルアップロードテスト
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} filePath - アップロードするファイルパス
   */
  static async uploadFile(page, filePath) {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // ファイル読み込み完了を待機
    await page.waitForFunction(() => {
      const editor = document.querySelector('#plantuml-editor');
      return editor && editor.value.length > 0;
    }, { timeout: 10000 });
  }

  /**
   * ファイルダウンロードテスト
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} format - エクスポート形式
   */
  static async downloadFile(page, format = 'png') {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.click(`[data-export-format="${format}"]`)
    ]);

    const suggestedFilename = download.suggestedFilename();
    const downloadPath = await download.path();
    
    return {
      filename: suggestedFilename,
      path: downloadPath,
      size: await download.saveAs(downloadPath)
    };
  }
}

/**
 * アクセシビリティヘルパー
 */
export class AccessibilityHelper {
  /**
   * キーボードナビゲーション検証
   * @param {Page} page - Playwrightページオブジェクト
   */
  static async testKeyboardNavigation(page) {
    const focusableElements = await page.locator('[tabindex]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]').all();
    
    const results = [];
    
    for (let i = 0; i < focusableElements.length; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.tagName);
      results.push(focusedElement);
    }
    
    return results;
  }

  /**
   * ARIA属性検証
   * @param {Page} page - Playwrightページオブジェクト
   */
  static async validateAriaAttributes(page) {
    return await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-describedby], [role]');
      const results = [];
      
      elements.forEach(element => {
        results.push({
          tagName: element.tagName,
          ariaLabel: element.getAttribute('aria-label'),
          ariaDescribedby: element.getAttribute('aria-describedby'),
          role: element.getAttribute('role'),
          id: element.id,
          className: element.className
        });
      });
      
      return results;
    });
  }

  /**
   * 色コントラスト検証
   * @param {Page} page - Playwrightページオブジェクト
   */
  static async checkColorContrast(page) {
    return await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const results = [];
      
      elements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          results.push({
            element: element.tagName,
            color,
            backgroundColor,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight
          });
        }
      });
      
      return results;
    });
  }
}

/**
 * ブラウザ互換性ヘルパー
 */
export class BrowserCompatibilityHelper {
  /**
   * ブラウザ機能検証
   * @param {Page} page - Playwrightページオブジェクト
   */
  static async checkBrowserFeatures(page) {
    return await page.evaluate(() => {
      return {
        svg: !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
        canvas: !!document.createElement('canvas').getContext,
        webgl: !!document.createElement('canvas').getContext('webgl'),
        websockets: !!window.WebSocket,
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        indexedDB: !!window.indexedDB,
        webWorkers: !!window.Worker,
        serviceWorker: !!navigator.serviceWorker,
        geolocation: !!navigator.geolocation,
        fileAPI: !!window.File && !!window.FileReader && !!window.FileList && !!window.Blob,
        dragAndDrop: 'draggable' in document.createElement('div'),
        history: !!window.history && !!window.history.pushState
      };
    });
  }

  /**
   * ユーザーエージェント情報取得
   * @param {Page} page - Playwrightページオブジェクト
   */
  static async getBrowserInfo(page) {
    return await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        onLine: navigator.onLine,
        deviceMemory: navigator.deviceMemory,
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null
      };
    });
  }
}

/**
 * カスタムアサーション
 */
export class CustomAssertions {
  /**
   * PlantUML構文の検証
   * @param {string} actual - 実際のPlantUMLコード
   * @param {string} expected - 期待されるPlantUMLコード
   */
  static toBeValidPlantUML(actual, expected = null) {
    const validation = PlantUMLValidator.validateBasicSyntax(actual);
    
    expect(validation.valid, `PlantUML構文が無効です: ${JSON.stringify(validation)}`).toBe(true);
    
    if (expected) {
      expect(actual.trim()).toContain(expected.trim());
    }
  }

  /**
   * 日本語エンコーディングの検証
   * @param {string} text - 検証するテキスト
   */
  static toHaveValidJapaneseEncoding(text) {
    const isValid = JapaneseTextHelper.isValidEncoding(text);
    expect(isValid, `日本語エンコーディングが無効です: ${text}`).toBe(true);
  }

  /**
   * パフォーマンス閾値の検証
   * @param {number} actual - 実際の値
   * @param {number} threshold - 閾値
   * @param {string} metric - メトリクス名
   */
  static toBeFasterThan(actual, threshold, metric = 'time') {
    expect(actual, `${metric}が閾値を超過しました: ${actual}ms > ${threshold}ms`).toBeLessThan(threshold);
  }

  /**
   * メモリ使用量の検証
   * @param {Object} memoryInfo - メモリ情報
   * @param {number} limitMB - 制限値（MB）
   */
  static toBeWithinMemoryLimit(memoryInfo, limitMB) {
    if (!memoryInfo) {
      console.warn('メモリ情報が取得できません');
      return;
    }
    
    const usedMB = memoryInfo.usedMB || (memoryInfo.used / 1024 / 1024);
    expect(usedMB, `メモリ使用量が制限を超過しました: ${usedMB}MB > ${limitMB}MB`).toBeLessThan(limitMB);
  }

  /**
   * エラーの非存在検証
   * @param {Array} errors - エラー配列
   */
  static toHaveNoErrors(errors) {
    expect(errors.length, `エラーが発生しました: ${JSON.stringify(errors)}`).toBe(0);
  }

  /**
   * SVG要素の存在検証
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} selector - セレクタ
   */
  static async toHaveValidSVG(page, selector = '#preview-area svg') {
    const svgElement = page.locator(selector);
    await expect(svgElement).toBeVisible();
    
    const svgAttributes = await svgElement.evaluate(el => ({
      width: el.getAttribute('width'),
      height: el.getAttribute('height'),
      viewBox: el.getAttribute('viewBox')
    }));
    
    expect(svgAttributes.width).toBeTruthy();
    expect(svgAttributes.height).toBeTruthy();
  }
}

/**
 * テストユーティリティ集約
 */
export const TestUtils = {
  Japanese: JapaneseTextHelper,
  PlantUML: PlantUMLValidator,
  Performance: PerformanceHelper,
  Error: ErrorHelper,
  File: FileHelper,
  Accessibility: AccessibilityHelper,
  Browser: BrowserCompatibilityHelper,
  Assert: CustomAssertions
};

export default TestUtils;