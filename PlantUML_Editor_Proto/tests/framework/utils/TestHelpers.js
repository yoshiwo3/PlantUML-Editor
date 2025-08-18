/**
 * TestHelpers - テストフレームワーク共通ヘルパー関数ライブラリ
 * 
 * Sprint3 Hybrid Object Model Framework
 * 全てのテストタイプで使用可能な共通機能を提供
 */

import { expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

export class TestHelpers {
  constructor() {
    this.baseURL = process.env.BASE_URL || 'http://localhost:8086';
    this.testResultsDir = 'test-results';
    this.screenshotsDir = path.join(this.testResultsDir, 'screenshots');
    this.reportsDir = path.join(this.testResultsDir, 'reports');
    
    // 日本語テストデータ
    this.japaneseTestData = {
      hiragana: 'ひらがなテストデータ',
      katakana: 'カタカナテストデータ',
      kanji: '漢字テストデータ',
      mixed: 'ミックス漢字ひらがなカタカナTest123',
      specialChars: '特殊文字「」（）・〜！？',
      longText: 'これは長い日本語テキストです。システムが日本語の長文を適切に処理できるかを確認するためのテストデータです。',
      businessTerms: '顧客管理システム、在庫管理、売上分析、品質保証'
    };
    
    // PlantUML テストデータ
    this.plantUMLTestData = {
      simpleSequence: '@startuml\nA -> B: message\n@enduml',
      complexSequence: '@startuml\nactor User\nUser -> System: login\nSystem -> Database: validate\nDatabase --> System: result\nSystem --> User: response\n@enduml',
      useCase: '@startuml\nleft to right direction\nactor User\nUser --> (Login)\nUser --> (Search)\n@enduml',
      classdiagram: '@startuml\nclass User {\n  -name: String\n  +getName(): String\n}\n@enduml'
    };
  }

  /**
   * 初期化処理
   */
  async initialize() {
    await this.ensureDirectories();
  }

  /**
   * 必要ディレクトリの作成
   */
  async ensureDirectories() {
    const directories = [
      this.testResultsDir,
      this.screenshotsDir,
      this.reportsDir,
      path.join(this.reportsDir, 'allure-results'),
      path.join(this.reportsDir, 'html'),
      path.join(this.reportsDir, 'json'),
      path.join(this.reportsDir, 'junit')
    ];
    
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.warn(`Failed to create directory ${dir}: ${error.message}`);
        }
      }
    }
  }

  /**
   * 現在時刻のタイムスタンプ取得
   */
  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  /**
   * テスト名から安全なファイル名生成
   */
  sanitizeFileName(testName) {
    return testName
      .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * スクリーンショット撮影
   */
  async captureScreenshot(page, name, options = {}) {
    const timestamp = this.getTimestamp();
    const safeName = this.sanitizeFileName(name);
    const fileName = `${safeName}_${timestamp}.png`;
    const filePath = path.join(this.screenshotsDir, fileName);
    
    try {
      await page.screenshot({
        path: filePath,
        fullPage: options.fullPage || false,
        ...options
      });
      
      console.log(`Screenshot saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`Failed to capture screenshot: ${error.message}`);
      return null;
    }
  }

  /**
   * テスト結果ファイル保存
   */
  async saveTestResults(testName, results, format = 'json') {
    const timestamp = this.getTimestamp();
    const safeName = this.sanitizeFileName(testName);
    const fileName = `${safeName}_${timestamp}.${format}`;
    const filePath = path.join(this.reportsDir, format, fileName);
    
    try {
      let content;
      switch (format) {
        case 'json':
          content = JSON.stringify(results, null, 2);
          break;
        case 'xml':
          content = this.convertToXML(results);
          break;
        case 'csv':
          content = this.convertToCSV(results);
          break;
        default:
          content = String(results);
      }
      
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`Test results saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`Failed to save test results: ${error.message}`);
      return null;
    }
  }

  /**
   * JSON to XML 変換
   */
  convertToXML(obj) {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    function objectToXml(obj, rootName = 'root') {
      if (typeof obj !== 'object' || obj === null) {
        return `<${rootName}>${String(obj)}</${rootName}>`;
      }
      
      let xml = `<${rootName}>`;
      
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          xml += `<${key}>`;
          value.forEach(item => {
            xml += objectToXml(item, 'item');
          });
          xml += `</${key}>`;
        } else if (typeof value === 'object' && value !== null) {
          xml += objectToXml(value, key);
        } else {
          xml += `<${key}>${String(value)}</${key}>`;
        }
      }
      
      xml += `</${rootName}>`;
      return xml;
    }
    
    return xmlHeader + objectToXml(obj, 'testResults');
  }

  /**
   * JSON to CSV 変換
   */
  convertToCSV(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) {
      return '';
    }
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value || '');
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * 日本語文字判定
   */
  isJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  /**
   * 日本語テキスト検証
   */
  validateJapaneseText(text) {
    const validations = {
      hasHiragana: /[\u3040-\u309F]/.test(text),
      hasKatakana: /[\u30A0-\u30FF]/.test(text),
      hasKanji: /[\u4E00-\u9FAF]/.test(text),
      length: text.length,
      byteLength: new TextEncoder().encode(text).length,
      isValid: true
    };
    
    // 制御文字チェック
    validations.hasControlChars = /[\x00-\x1F\x7F]/.test(text);
    validations.isValid = !validations.hasControlChars;
    
    return validations;
  }

  /**
   * PlantUML 構文検証
   */
  validatePlantUMLSyntax(code) {
    const validations = {
      hasStartTag: /@startuml/.test(code),
      hasEndTag: /@enduml/.test(code),
      isValidStructure: false,
      diagramType: null,
      lineCount: code.split('\n').length,
      hasJapanese: this.isJapanese(code),
      errors: []
    };
    
    // 基本構造確認
    if (validations.hasStartTag && validations.hasEndTag) {
      validations.isValidStructure = true;
    } else {
      if (!validations.hasStartTag) {
        validations.errors.push('Missing @startuml tag');
      }
      if (!validations.hasEndTag) {
        validations.errors.push('Missing @enduml tag');
      }
    }
    
    // 図表タイプ推定
    if (code.includes('->') || code.includes('-->')) {
      validations.diagramType = 'sequence';
    } else if (code.includes('class ') || code.includes('interface ')) {
      validations.diagramType = 'class';
    } else if (code.includes('actor ') || code.includes('usecase ')) {
      validations.diagramType = 'usecase';
    } else if (code.includes('state ') || code.includes('[*]')) {
      validations.diagramType = 'state';
    }
    
    return validations;
  }

  /**
   * ランダムテストデータ生成
   */
  generateRandomTestData(type = 'japanese', length = 10) {
    const generators = {
      japanese: () => {
        const chars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      },
      katakana: () => {
        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      },
      kanji: () => {
        const chars = '人大日本語文字漢書読書学生先生学校会社仕事時間場所方法問題解決開発設計実装';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      },
      alphanumeric: () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      },
      mixed: () => {
        return this.generateRandomTestData('japanese', length / 3) +
               this.generateRandomTestData('katakana', length / 3) +
               this.generateRandomTestData('alphanumeric', length / 3);
      }
    };
    
    return generators[type] ? generators[type]() : generators.alphanumeric();
  }

  /**
   * ページ待機ヘルパー
   */
  async waitForPageReady(page, options = {}) {
    const timeout = options.timeout || 30000;
    const checkInterval = options.checkInterval || 100;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // DOM ready確認
        const isDOMReady = await page.evaluate(() => {
          return document.readyState === 'complete';
        });
        
        // JavaScript初期化確認
        const isJSReady = await page.evaluate(() => {
          return window.PlantUMLEditor && window.PlantUMLEditor.initialized;
        });
        
        // ネットワーク静寂確認
        const networkIdle = await page.evaluate(() => {
          return performance.getEntriesByType('resource').every(entry => entry.responseEnd > 0);
        });
        
        if (isDOMReady && isJSReady && networkIdle) {
          return true;
        }
        
        await page.waitForTimeout(checkInterval);
      } catch (error) {
        // 継続してチェック
      }
    }
    
    throw new Error(`Page not ready after ${timeout}ms`);
  }

  /**
   * 要素存在確認
   */
  async waitForElementExists(page, selector, timeout = 30000) {
    try {
      await page.waitForSelector(selector, { timeout, state: 'attached' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 日本語入力テストヘルパー
   */
  async testJapaneseInput(page, selector, testText) {
    const result = {
      inputText: testText,
      success: false,
      actualValue: null,
      error: null
    };
    
    try {
      // 入力実行
      await page.fill(selector, testText);
      await page.waitForTimeout(200); // IME処理待機
      
      // 実際の値取得
      result.actualValue = await page.inputValue(selector);
      
      // 一致確認
      result.success = result.actualValue === testText;
      
      // 日本語文字検証
      result.validation = this.validateJapaneseText(result.actualValue);
      
    } catch (error) {
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * パフォーマンス測定ヘルパー
   */
  async measurePerformance(page, action, actionName = 'action') {
    const metrics = {
      actionName,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      memoryBefore: null,
      memoryAfter: null,
      memoryUsed: null,
      success: false,
      result: null,
      error: null
    };
    
    try {
      // メモリ使用量（開始時）
      metrics.memoryBefore = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      // アクション実行
      metrics.result = await action();
      metrics.success = true;
      
      // メモリ使用量（終了時）
      metrics.memoryAfter = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.memoryUsed = metrics.memoryAfter - metrics.memoryBefore;
      
    } catch (error) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.error = error.message;
    }
    
    return metrics;
  }

  /**
   * エラーログ収集
   */
  async collectErrorLogs(page) {
    const errorLogs = {
      javascript: [],
      console: [],
      network: [],
      timestamp: new Date().toISOString()
    };
    
    // JavaScript エラー
    page.on('pageerror', error => {
      errorLogs.javascript.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // コンソールエラー
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.console.push({
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // ネットワークエラー
    page.on('requestfailed', request => {
      errorLogs.network.push({
        url: request.url(),
        method: request.method(),
        error: request.failure().errorText,
        timestamp: new Date().toISOString()
      });
    });
    
    return errorLogs;
  }

  /**
   * アクセシビリティ検証ヘルパー
   */
  async validateAccessibility(page) {
    const accessibility = {
      issues: [],
      score: 100,
      categories: {
        keyboardNavigation: true,
        ariaLabels: true,
        colorContrast: true,
        focusManagement: true
      }
    };
    
    try {
      const issues = await page.evaluate(() => {
        const issues = [];
        
        // ARIA ラベル確認
        const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href]');
        interactiveElements.forEach(el => {
          if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.innerText.trim()) {
            issues.push({
              type: 'missing-aria-label',
              element: el.tagName + (el.id ? `#${el.id}` : ''),
              severity: 'medium'
            });
          }
        });
        
        // フォーカス可能要素確認
        const focusableElements = document.querySelectorAll('[tabindex]');
        focusableElements.forEach(el => {
          const tabIndex = parseInt(el.getAttribute('tabindex'));
          if (tabIndex > 0) {
            issues.push({
              type: 'positive-tabindex',
              element: el.tagName + (el.id ? `#${el.id}` : ''),
              severity: 'low'
            });
          }
        });
        
        // 画像の alt 属性確認
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (!img.getAttribute('alt')) {
            issues.push({
              type: 'missing-alt-text',
              element: `img[src="${img.src}"]`,
              severity: 'high'
            });
          }
        });
        
        return issues;
      });
      
      accessibility.issues = issues;
      
      // カテゴリ別スコア計算
      const categoryIssues = {
        ariaLabels: issues.filter(issue => issue.type === 'missing-aria-label').length,
        focusManagement: issues.filter(issue => issue.type === 'positive-tabindex').length,
        altText: issues.filter(issue => issue.type === 'missing-alt-text').length
      };
      
      Object.keys(categoryIssues).forEach(category => {
        accessibility.categories[category] = categoryIssues[category] === 0;
      });
      
      // 総合スコア計算
      const totalIssues = issues.length;
      const severityWeights = { high: 20, medium: 10, low: 5 };
      const penalty = issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0);
      
      accessibility.score = Math.max(0, 100 - penalty);
      
    } catch (error) {
      accessibility.error = error.message;
    }
    
    return accessibility;
  }

  /**
   * テストレポート生成
   */
  async generateTestReport(testResults, reportType = 'html') {
    const timestamp = this.getTimestamp();
    const reportName = `test_report_${timestamp}`;
    
    switch (reportType) {
      case 'html':
        return await this.generateHTMLReport(testResults, reportName);
      case 'json':
        return await this.saveTestResults(reportName, testResults, 'json');
      case 'xml':
        return await this.saveTestResults(reportName, testResults, 'xml');
      default:
        return await this.generateHTMLReport(testResults, reportName);
    }
  }

  /**
   * HTML レポート生成
   */
  async generateHTMLReport(testResults, reportName) {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML Editor Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #007acc; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007acc; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
        .test-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ccc; }
        .test-item.passed { border-left-color: #28a745; }
        .test-item.failed { border-left-color: #dc3545; }
        .test-item.warning { border-left-color: #ffc107; }
        .japanese-text { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif; }
        pre { background: #f1f3f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PlantUML Editor Test Report</h1>
            <p class="timestamp">Generated: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${testResults.total || 0}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${testResults.passed || 0}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${testResults.failed || 0}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value">${testResults.total ? Math.round((testResults.passed / testResults.total) * 100) : 0}%</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Test Results Details</h2>
            <pre>${JSON.stringify(testResults, null, 2)}</pre>
        </div>
        
        <div class="section">
            <h2>Generated at</h2>
            <p>${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;
    
    const filePath = path.join(this.reportsDir, 'html', `${reportName}.html`);
    
    try {
      await fs.writeFile(filePath, html, 'utf8');
      console.log(`HTML report generated: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`Failed to generate HTML report: ${error.message}`);
      return null;
    }
  }
}

export default TestHelpers;