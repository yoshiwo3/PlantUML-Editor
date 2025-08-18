/**
 * E2E Test Helper Functions
 * Sprint2 Test Foundation Framework
 */

import { expect } from '@playwright/test';

export class TestHelper {
  constructor(page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8086';
  }

  /**
   * PlantUMLエディターの基本アクセス
   */
  async navigateToEditor() {
    await this.page.goto(this.baseURL);
    await this.waitForEditorLoad();
  }

  /**
   * エディターの読み込み完了待機
   */
  async waitForEditorLoad() {
    // アプリケーション初期化の待機
    await this.page.waitForLoadState('networkidle');
    
    // 重要なDOM要素の待機
    await this.page.waitForSelector('#japaneseInput', { timeout: 15000 });
    await this.page.waitForSelector('#plantUMLOutput', { timeout: 15000 });
    
    // JavaScript完全初期化の確認
    await this.page.waitForFunction(() => {
      return window.PlantUMLParser && window.RealtimeSyncManager;
    }, { timeout: 10000 });
  }

  /**
   * 日本語入力とPlantUML変換のテスト
   */
  async testJapaneseToPlantUMLConversion(inputText, expectedContains = []) {
    // 日本語入力
    await this.page.fill('#japaneseInput', inputText);
    
    // リアルタイム同期の待機
    await this.page.waitForTimeout(500);
    
    // PlantUML出力の確認
    const output = await this.page.textContent('#plantUMLOutput');
    
    // 基本的なPlantUML構造の確認
    expect(output).toContain('@startuml');
    expect(output).toContain('@enduml');
    
    // 期待される内容の確認
    for (const expectedText of expectedContains) {
      expect(output).toContain(expectedText);
    }
    
    return output;
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
   * エラー監視開始
   */
  async startErrorMonitoring() {
    this.consoleErrors = [];
    this.jsErrors = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
    
    this.page.on('pageerror', error => {
      this.jsErrors.push(error.message);
    });
  }

  /**
   * エラー確認
   */
  getErrors() {
    return {
      console: this.consoleErrors || [],
      javascript: this.jsErrors || []
    };
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
   * 要素の存在確認（汎用）
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
   * PlantUML図表タイプ別のテスト
   */
  async testDiagramType(diagramInput, diagramType) {
    await this.page.fill('#japaneseInput', diagramInput);
    await this.page.waitForTimeout(300);
    
    const output = await this.page.textContent('#plantUMLOutput');
    
    // 図表タイプ固有の検証
    switch (diagramType) {
      case 'sequence':
        expect(output).toMatch(/->\s*\w+/); // シーケンス矢印
        break;
      case 'usecase':
        expect(output).toContain('usecase');
        break;
      case 'class':
        expect(output).toContain('class');
        break;
      case 'activity':
        expect(output).toContain('start');
        expect(output).toContain('stop');
        break;
      case 'state':
        expect(output).toContain('state');
        break;
    }
    
    return output;
  }

  /**
   * 日本語文字種別のテスト
   */
  async testJapaneseCharacterTypes() {
    const testCases = [
      { input: 'ひらがなテスト', type: 'hiragana' },
      { input: 'カタカナテスト', type: 'katakana' },
      { input: '漢字テスト', type: 'kanji' },
      { input: 'システムAからシステムBへ', type: 'mixed' }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const output = await this.testJapaneseToPlantUMLConversion(
        testCase.input, 
        [testCase.input]
      );
      results.push({
        type: testCase.type,
        input: testCase.input,
        output,
        success: output.includes(testCase.input)
      });
    }
    
    return results;
  }

  /**
   * リアルタイム同期性能テスト
   */
  async testRealtimeSyncPerformance() {
    const testInputs = [
      'シンプル入力',
      'より複雑な日本語入力テスト',
      'システムAがシステムBにメッセージを送信し、システムBが応答を返す複雑なシーケンス'
    ];
    
    const performances = [];
    
    for (const input of testInputs) {
      const time = await this.measurePerformance(async () => {
        await this.page.fill('#japaneseInput', input);
        await this.page.waitForFunction(() => {
          const output = document.querySelector('#plantUMLOutput');
          return output && output.textContent.includes('@startuml');
        }, { timeout: 5000 });
      });
      
      performances.push({
        input,
        syncTime: time,
        acceptable: time < 100 // 100ms以下が目標
      });
    }
    
    return performances;
  }

  /**
   * クロスブラウザ互換性テスト用のブラウザ情報取得
   */
  async getBrowserInfo() {
    return await this.page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
    });
  }

  /**
   * メモリ使用量測定（Chrome限定）
   */
  async getMemoryUsage() {
    try {
      return await this.page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * テストデータのクリーンアップ
   */
  async cleanup() {
    await this.page.evaluate(() => {
      // ローカルストレージのクリア
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}