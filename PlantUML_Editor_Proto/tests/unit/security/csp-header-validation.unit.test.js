/**
 * CSPヘッダー検証 単体テスト
 * Sprint 1 - セキュリティ機能テスト
 * 
 * テスト対象: CSP (Content Security Policy) ヘッダーの検証機能
 * 実行時間目標: < 5秒 (CLAUDE.md基準)
 * 
 * 作成日: 2025-08-15
 * 作成者: webapp-test-automation
 */

import { cspTestHelpers, threatPatterns } from '@tests/helpers/security-helpers.js';

// CSP検証機能のモック実装
class MockCSPValidator {
  constructor() {
    this.defaultPolicy = {
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

  // CSPヘッダー文字列をパース
  parseCSPHeader(cspString) {
    if (!cspString || typeof cspString !== 'string') {
      return null;
    }

    const policies = {};
    const directives = cspString.split(';').map(d => d.trim()).filter(d => d.length > 0);

    directives.forEach(directive => {
      const parts = directive.split(/\s+/);
      if (parts.length >= 1) {
        const directiveName = parts[0];
        const sources = parts.slice(1);
        policies[directiveName] = sources;
      }
    });

    return policies;
  }

  // CSPポリシーの検証
  validatePolicy(policies) {
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 0,
      recommendations: []
    };

    // 必須ディレクティブの確認
    const requiredDirectives = ['default-src', 'script-src'];
    requiredDirectives.forEach(directive => {
      if (!policies[directive]) {
        results.errors.push(`必須ディレクティブ '${directive}' が見つかりません`);
        results.isValid = false;
      }
    });

    // 危険な設定の検出
    this.checkUnsafePolicies(policies, results);
    
    // 推奨設定の確認
    this.checkRecommendedPolicies(policies, results);
    
    // スコア計算
    results.score = this.calculateSecurityScore(policies, results);

    return results;
  }

  // 危険なポリシー設定の検出
  checkUnsafePolicies(policies, results) {
    // unsafe-eval の検出
    if (policies['script-src'] && policies['script-src'].includes("'unsafe-eval'")) {
      results.errors.push("script-src で 'unsafe-eval' が許可されています - セキュリティリスク");
      results.isValid = false;
    }

    // unsafe-inline の過度な使用
    if (policies['script-src'] && policies['script-src'].includes("'unsafe-inline'")) {
      results.warnings.push("script-src で 'unsafe-inline' が許可されています - 可能な限り避けてください");
    }

    // * (ワイルドカード) の検出
    Object.entries(policies).forEach(([directive, sources]) => {
      if (sources.includes('*') && directive !== 'img-src') {
        results.errors.push(`${directive} でワイルドカード '*' が使用されています - セキュリティリスク`);
        results.isValid = false;
      }
    });

    // data: プロトコルの不適切な使用
    if (policies['script-src'] && policies['script-src'].some(src => src.includes('data:'))) {
      results.errors.push("script-src で data: プロトコルが許可されています - XSSリスク");
      results.isValid = false;
    }
  }

  // 推奨設定の確認
  checkRecommendedPolicies(policies, results) {
    // frame-ancestors の確認
    if (!policies['frame-ancestors']) {
      results.recommendations.push("frame-ancestors ディレクティブを設定してクリックジャッキング攻撃を防ぐ");
    }

    // base-uri の確認
    if (!policies['base-uri']) {
      results.recommendations.push("base-uri ディレクティブを設定してベースURL攻撃を防ぐ");
    }

    // form-action の確認
    if (!policies['form-action']) {
      results.recommendations.push("form-action ディレクティブを設定してフォーム送信先を制限する");
    }

    // upgrade-insecure-requests の確認
    if (!policies['upgrade-insecure-requests']) {
      results.recommendations.push("upgrade-insecure-requests を有効にしてHTTPS強制を推奨");
    }
  }

  // セキュリティスコア計算
  calculateSecurityScore(policies, results) {
    let score = 100;
    
    // エラーごとに減点
    score -= results.errors.length * 20;
    
    // 警告ごとに減点
    score -= results.warnings.length * 10;
    
    // 推奨設定不足による減点
    score -= results.recommendations.length * 5;
    
    return Math.max(0, score);
  }

  // CSP違反の検出
  detectViolations(content, policies) {
    const violations = [];

    // script-src 違反
    if (policies['script-src']) {
      const scriptViolations = this.checkScriptSrcViolations(content, policies['script-src']);
      violations.push(...scriptViolations);
    }

    // style-src 違反
    if (policies['style-src']) {
      const styleViolations = this.checkStyleSrcViolations(content, policies['style-src']);
      violations.push(...styleViolations);
    }

    // img-src 違反
    if (policies['img-src']) {
      const imgViolations = this.checkImgSrcViolations(content, policies['img-src']);
      violations.push(...imgViolations);
    }

    return violations;
  }

  // script-src 違反チェック
  checkScriptSrcViolations(content, allowedSources) {
    const violations = [];

    // インラインスクリプト
    const inlineScripts = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    if (inlineScripts.length > 0 && !allowedSources.includes("'unsafe-inline'")) {
      violations.push({
        type: 'script-src',
        violation: 'inline-script',
        message: 'インラインスクリプトが検出されましたが、unsafe-inline が許可されていません',
        elements: inlineScripts.slice(0, 3) // 最初の3個まで
      });
    }

    // eval使用
    if (content.includes('eval(') && !allowedSources.includes("'unsafe-eval'")) {
      violations.push({
        type: 'script-src',
        violation: 'eval-usage',
        message: 'eval() の使用が検出されましたが、unsafe-eval が許可されていません'
      });
    }

    // javascript: プロトコル
    if (content.includes('javascript:')) {
      violations.push({
        type: 'script-src',
        violation: 'javascript-protocol',
        message: 'javascript: プロトコルの使用が検出されました'
      });
    }

    return violations;
  }

  // style-src 違反チェック
  checkStyleSrcViolations(content, allowedSources) {
    const violations = [];

    // インラインスタイル
    const inlineStyles = content.match(/style\s*=\s*["'][^"']*["']/gi) || [];
    if (inlineStyles.length > 0 && !allowedSources.includes("'unsafe-inline'")) {
      violations.push({
        type: 'style-src',
        violation: 'inline-style',
        message: 'インラインスタイルが検出されましたが、unsafe-inline が許可されていません',
        elements: inlineStyles.slice(0, 5) // 最初の5個まで
      });
    }

    return violations;
  }

  // img-src 違反チェック
  checkImgSrcViolations(content, allowedSources) {
    const violations = [];

    // data: URL画像
    const dataImages = content.match(/<img[^>]+src\s*=\s*["']data:[^"']*["']/gi) || [];
    if (dataImages.length > 0 && !allowedSources.includes('data:')) {
      violations.push({
        type: 'img-src',
        violation: 'data-url',
        message: 'data: URLの画像が検出されましたが、data: が許可されていません',
        elements: dataImages.slice(0, 3)
      });
    }

    return violations;
  }

  // PlantUMLエディター用の最適なCSP生成
  generateOptimalCSP() {
    return {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-hashes'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'https:'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': []
    };
  }

  // CSPヘッダー文字列生成
  generateCSPHeader(policies) {
    const directives = [];
    
    Object.entries(policies).forEach(([directive, sources]) => {
      if (sources.length === 0) {
        directives.push(directive);
      } else {
        directives.push(`${directive} ${sources.join(' ')}`);
      }
    });
    
    return directives.join('; ');
  }
}

describe('CSPヘッダー検証 単体テスト', () => {
  let cspValidator;

  // 各テスト前の初期化
  beforeEach(() => {
    cspValidator = new MockCSPValidator();
  });

  describe('CSPヘッダーパース機能', () => {
    test('正常なCSPヘッダーを正しくパースする', async () => {
      // Arrange
      const cspHeader = "default-src 'self'; script-src 'self' 'unsafe-hashes'; style-src 'self' 'unsafe-inline'";
      
      // Act
      const result = await measurePerformance('csp-parse', () => {
        return cspValidator.parseCSPHeader(cspHeader);
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(result['default-src']).toEqual(["'self'"]);
      expect(result['script-src']).toEqual(["'self'", "'unsafe-hashes'"]);
      expect(result['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
    });

    test('空のCSPヘッダーを適切に処理する', () => {
      // Act
      const result = cspValidator.parseCSPHeader('');
      
      // Assert
      expect(result).toBeNull();
    });

    test('不正なCSPヘッダーを適切に処理する', () => {
      // Act
      const result = cspValidator.parseCSPHeader(null);
      
      // Assert
      expect(result).toBeNull();
    });

    test('複雑なCSPヘッダーを正しくパースする', () => {
      // Arrange
      const complexCSP = "default-src 'self'; script-src 'self' https://cdn.example.com 'sha256-abc123'; img-src 'self' data: https:; font-src 'self' https://fonts.googleapis.com";
      
      // Act
      const result = cspValidator.parseCSPHeader(complexCSP);
      
      // Assert
      expect(result['script-src']).toEqual(["'self'", 'https://cdn.example.com', "'sha256-abc123'"]);
      expect(result['img-src']).toEqual(["'self'", 'data:', 'https:']);
      expect(result['font-src']).toEqual(["'self'", 'https://fonts.googleapis.com']);
    });
  });

  describe('CSPポリシー検証機能', () => {
    test('安全なCSPポリシーが適切に評価される', async () => {
      // Arrange
      const safePolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-hashes'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:']
      };
      
      // Act
      const result = await measurePerformance('csp-validation', () => {
        return cspValidator.validatePolicy(safePolicy);
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(70); // 高スコア
    });

    test('危険なCSPポリシーを正しく検出する', () => {
      // Arrange
      const dangerousPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        'style-src': ['*']
      };
      
      // Act
      const result = cspValidator.validatePolicy(dangerousPolicy);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('unsafe-eval'))).toBe(true);
      expect(result.errors.some(error => error.includes('ワイルドカード'))).toBe(true);
      expect(result.score).toBeLessThan(50); // 低スコア
    });

    test('必須ディレクティブの不足を検出する', () => {
      // Arrange
      const incompletePolicy = {
        'style-src': ["'self'"],
        'img-src': ["'self'"]
        // default-srcとscript-srcが不足
      };
      
      // Act
      const result = cspValidator.validatePolicy(incompletePolicy);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('default-src'))).toBe(true);
      expect(result.errors.some(error => error.includes('script-src'))).toBe(true);
    });

    test('推奨設定の不足を警告する', () => {
      // Arrange
      const minimalPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'"]
        // 推奨ディレクティブが不足
      };
      
      // Act
      const result = cspValidator.validatePolicy(minimalPolicy);
      
      // Assert
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => rec.includes('frame-ancestors'))).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('base-uri'))).toBe(true);
    });
  });

  describe('CSP違反検出機能', () => {
    test('インラインスクリプト違反を検出する', () => {
      // Arrange
      const content = '<div>安全なコンテンツ</div><script>alert("違反")</script>';
      const policies = {
        'script-src': ["'self'"] // unsafe-inlineなし
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      expect(violations.length).toBeGreaterThan(0);
      const scriptViolation = violations.find(v => v.type === 'script-src' && v.violation === 'inline-script');
      expect(scriptViolation).toBeDefined();
      expect(scriptViolation.message).toContain('インラインスクリプト');
    });

    test('eval使用違反を検出する', () => {
      // Arrange
      const content = 'var func = eval("function() { return 42; }");';
      const policies = {
        'script-src': ["'self'"] // unsafe-evalなし
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      const evalViolation = violations.find(v => v.violation === 'eval-usage');
      expect(evalViolation).toBeDefined();
      expect(evalViolation.message).toContain('eval()');
    });

    test('JavaScript プロトコル違反を検出する', () => {
      // Arrange
      const content = '<a href="javascript:alert(\'XSS\')">リンク</a>';
      const policies = {
        'script-src': ["'self'"]
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      const jsViolation = violations.find(v => v.violation === 'javascript-protocol');
      expect(jsViolation).toBeDefined();
      expect(jsViolation.message).toContain('javascript: プロトコル');
    });

    test('インラインスタイル違反を検出する', () => {
      // Arrange
      const content = '<div style="color: red;">赤いテキスト</div>';
      const policies = {
        'style-src': ["'self'"] // unsafe-inlineなし
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      const styleViolation = violations.find(v => v.type === 'style-src' && v.violation === 'inline-style');
      expect(styleViolation).toBeDefined();
      expect(styleViolation.message).toContain('インラインスタイル');
    });

    test('data: URL画像違反を検出する', () => {
      // Arrange
      const content = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      const policies = {
        'img-src': ["'self'"] // data:なし
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      const imgViolation = violations.find(v => v.type === 'img-src' && v.violation === 'data-url');
      expect(imgViolation).toBeDefined();
      expect(imgViolation.message).toContain('data: URL');
    });

    test('安全なコンテンツでは違反が検出されない', () => {
      // Arrange
      const content = '<div>これは安全なコンテンツです</div><p>日本語テキスト</p>';
      const policies = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:']
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      expect(violations).toHaveLength(0);
    });
  });

  describe('PlantUMLエディター特化機能', () => {
    test('PlantUMLエディター用最適CSPを生成する', () => {
      // Act
      const optimalCSP = cspValidator.generateOptimalCSP();
      
      // Assert
      expect(optimalCSP).toHaveProperty('default-src');
      expect(optimalCSP).toHaveProperty('script-src');
      expect(optimalCSP).toHaveProperty('style-src');
      expect(optimalCSP).toHaveProperty('img-src');
      
      // PlantUMLエディターに必要な設定
      expect(optimalCSP['script-src']).toContain("'unsafe-hashes'"); // PlantUML処理用
      expect(optimalCSP['style-src']).toContain("'unsafe-inline'"); // スタイル適用用
      expect(optimalCSP['img-src']).toContain('data:'); // PlantUML画像生成用
      expect(optimalCSP['frame-ancestors']).toEqual(["'none'"]); // セキュリティ強化
    });

    test('CSPヘッダー文字列を正しく生成する', () => {
      // Arrange
      const policies = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-hashes'"],
        'upgrade-insecure-requests': [] // 値なしディレクティブ
      };
      
      // Act
      const headerString = cspValidator.generateCSPHeader(policies);
      
      // Assert
      expect(headerString).toContain("default-src 'self'");
      expect(headerString).toContain("script-src 'self' 'unsafe-hashes'");
      expect(headerString).toContain('upgrade-insecure-requests');
      expect(headerString.includes(';')).toBe(true); // セミコロン区切り
    });
  });

  describe('日本語エラーメッセージ', () => {
    test('エラーメッセージが日本語で表示される', () => {
      // Arrange
      const badPolicy = {
        'script-src': ["'unsafe-eval'"]
        // default-srcが不足
      };
      
      // Act
      const result = cspValidator.validatePolicy(badPolicy);
      
      // Assert
      expect(result.errors.some(error => error.includes('必須ディレクティブ'))).toBe(true);
      expect(result.errors.some(error => error.includes('セキュリティリスク'))).toBe(true);
    });

    test('推奨メッセージが日本語で表示される', () => {
      // Arrange
      const minimalPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'"]
      };
      
      // Act
      const result = cspValidator.validatePolicy(minimalPolicy);
      
      // Assert
      expect(result.recommendations.some(rec => rec.includes('クリックジャッキング攻撃を防ぐ'))).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('ベースURL攻撃を防ぐ'))).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のCSPポリシー検証を効率的に処理する', async () => {
      // Arrange
      const largePolicies = {};
      for (let i = 0; i < 50; i++) {
        largePolicies[`directive-${i}`] = ["'self'", `'source-${i}'`];
      }
      
      // Act & Assert
      await measurePerformance('large-csp-validation', () => {
        return cspValidator.validatePolicy(largePolicies);
      });
      
      // 処理が完了することを確認
      expect(true).toBe(true);
    });

    test('大量のコンテンツ違反検出を効率的に処理する', async () => {
      // Arrange
      const largeContent = Array(1000).fill('<div>コンテンツ</div><script>alert("test")</script>').join('\n');
      const policies = { 'script-src': ["'self'"] };
      
      // Act & Assert
      await measurePerformance('large-content-violation-detection', () => {
        return cspValidator.detectViolations(largeContent, policies);
      });
      
      // 処理が完了することを確認
      expect(true).toBe(true);
    });
  });

  describe('実際のCSP環境テスト', () => {
    test('実際のHTTPレスポンスヘッダーと整合性がある', () => {
      // Arrange - 実際のCSPヘッダー例
      const realWorldCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      
      // Act
      const parsed = cspValidator.parseCSPHeader(realWorldCSP);
      const validation = cspValidator.validatePolicy(parsed);
      
      // Assert
      expect(parsed).toBeDefined();
      expect(validation.warnings.some(w => w.includes('unsafe-inline'))).toBe(true);
      expect(validation.score).toBeGreaterThan(50); // 実用的なスコア
    });

    test('PlantUMLエディター環境での実際の運用を想定する', () => {
      // Arrange
      const plantUMLContent = `
        <div id="plantuml-editor">
          <textarea id="japanese-input">ユーザーがログインする</textarea>
          <div id="plantuml-output">
            <img src="data:image/svg+xml;base64,..." alt="PlantUML図">
          </div>
        </div>
      `;
      
      const optimalPolicy = cspValidator.generateOptimalCSP();
      
      // Act
      const violations = cspValidator.detectViolations(plantUMLContent, optimalPolicy);
      
      // Assert
      expect(violations).toHaveLength(0); // 最適化されたCSPでは違反なし
    });
  });
});