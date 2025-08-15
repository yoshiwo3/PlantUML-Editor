/**
 * CSPヘッダー検証 単体テスト - 完全実装版
 * Sprint 1.5 - SEC-003 XSS脆弱性テスト作成（8ポイント）
 * 
 * テスト対象: CSP (Content Security Policy) ヘッダーの検証機能
 * 実行時間目標: < 5秒 (CLAUDE.md基準)
 * テストケース数: 30件以上
 * 
 * 作成日: 2025-08-15（完全実装版）
 * 作成者: webapp-test-automation
 */

import { 
  cspTestHelpers, 
  threatPatterns, 
  securityTestRunner,
  measurePerformance,
  createTestDOM,
  cleanupTestDOM
} from '@tests/helpers/security-helpers.js';

// CSP検証機能の拡張実装
class AdvancedCSPValidator {
  constructor() {
    this.defaultPolicy = cspTestHelpers.generateRecommendedCSP();
    this.criticalDirectives = ['default-src', 'script-src'];
    this.recommendedDirectives = [
      'style-src', 'img-src', 'font-src', 'connect-src',
      'frame-ancestors', 'base-uri', 'form-action', 'object-src'
    ];
  }

  // CSPヘッダー文字列をパース（security-helpersと統合）
  parseCSPHeader(cspString) {
    return cspTestHelpers.validateCSPHeader(cspString);
  }

  // 包括的なCSPポリシー検証
  validatePolicy(policies) {
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      score: 0,
      recommendations: [],
      securityLevel: 'UNKNOWN',
      criticalIssues: [],
      compliance: {
        owasp: false,
        nist: false,
        iso27001: false
      }
    };

    // 必須ディレクティブの確認
    this.validateCriticalDirectives(policies, results);
    
    // 危険な設定の検出
    this.detectDangerousConfigurations(policies, results);
    
    // 推奨設定の確認
    this.checkRecommendedDirectives(policies, results);
    
    // セキュリティ標準準拠チェック
    this.checkSecurityCompliance(policies, results);
    
    // スコア計算とセキュリティレベル判定
    results.score = this.calculateSecurityScore(policies, results);
    results.securityLevel = this.determineSecurityLevel(results.score, results.criticalIssues.length);

    return results;
  }

  // 必須ディレクティブの検証
  validateCriticalDirectives(policies, results) {
    this.criticalDirectives.forEach(directive => {
      if (!policies[directive]) {
        const error = `必須ディレクティブ '${directive}' が見つかりません`;
        results.errors.push(error);
        results.criticalIssues.push({
          type: 'MISSING_CRITICAL_DIRECTIVE',
          directive,
          severity: 'CRITICAL',
          message: error
        });
        results.isValid = false;
      }
    });
  }

  // 危険な設定の詳細検出
  detectDangerousConfigurations(policies, results) {
    // unsafe-eval の検出
    if (policies['script-src']?.includes("'unsafe-eval'")) {
      const issue = {
        type: 'UNSAFE_EVAL',
        directive: 'script-src',
        severity: 'CRITICAL',
        message: "script-src で 'unsafe-eval' が許可されています - 重大なセキュリティリスク"
      };
      results.errors.push(issue.message);
      results.criticalIssues.push(issue);
      results.isValid = false;
    }

    // unsafe-inline の script-src での使用
    if (policies['script-src']?.includes("'unsafe-inline'")) {
      const issue = {
        type: 'UNSAFE_INLINE_SCRIPT',
        directive: 'script-src',
        severity: 'HIGH',
        message: "script-src で 'unsafe-inline' が許可されています - XSSリスクが高まります"
      };
      results.warnings.push(issue.message);
      results.criticalIssues.push(issue);
    }

    // ワイルドカード * の不適切な使用
    Object.entries(policies).forEach(([directive, sources]) => {
      if (sources?.includes('*')) {
        if (directive === 'script-src' || directive === 'default-src') {
          const issue = {
            type: 'WILDCARD_CRITICAL',
            directive,
            severity: 'CRITICAL',
            message: `${directive} でワイルドカード '*' が使用されています - 重大なセキュリティリスク`
          };
          results.errors.push(issue.message);
          results.criticalIssues.push(issue);
          results.isValid = false;
        } else if (directive !== 'img-src' && directive !== 'font-src') {
          results.warnings.push(`${directive} でワイルドカード '*' が使用されています - 可能な限り避けてください`);
        }
      }
    });

    // data: プロトコルの script-src での使用
    if (policies['script-src']?.some(src => src.includes('data:'))) {
      const issue = {
        type: 'DATA_PROTOCOL_SCRIPT',
        directive: 'script-src',
        severity: 'CRITICAL',
        message: "script-src で data: プロトコルが許可されています - XSSリスク"
      };
      results.errors.push(issue.message);
      results.criticalIssues.push(issue);
      results.isValid = false;
    }

    // http: プロトコルの使用（HTTPSなし）
    Object.entries(policies).forEach(([directive, sources]) => {
      const httpSources = sources?.filter(src => src.startsWith('http:')) || [];
      if (httpSources.length > 0) {
        results.warnings.push(`${directive} でHTTPプロトコル（暗号化なし）が使用されています: ${httpSources.join(', ')}`);
      }
    });

    // 過度に寛容な設定の検出
    if (policies['style-src']?.includes('*')) {
      results.warnings.push("style-src でワイルドカードが使用されています - CSSインジェクション攻撃のリスク");
    }
  }

  // 推奨ディレクティブの確認
  checkRecommendedDirectives(policies, results) {
    const recommendedChecks = [
      {
        directive: 'frame-ancestors',
        missing: "frame-ancestors ディレクティブを設定してクリックジャッキング攻撃を防いでください",
        recommended: ["'none'", "'self'"]
      },
      {
        directive: 'base-uri',
        missing: "base-uri ディレクティブを設定してベースURL攻撃を防いでください",
        recommended: ["'self'"]
      },
      {
        directive: 'form-action',
        missing: "form-action ディレクティブを設定してフォーム送信先を制限してください",
        recommended: ["'self'"]
      },
      {
        directive: 'object-src',
        missing: "object-src ディレクティブを設定してプラグイン攻撃を防いでください",
        recommended: ["'none'"]
      },
      {
        directive: 'upgrade-insecure-requests',
        missing: "upgrade-insecure-requests を有効にしてHTTPS強制を推奨します",
        recommended: []
      }
    ];

    recommendedChecks.forEach(check => {
      if (!policies[check.directive]) {
        results.recommendations.push(check.missing);
        if (check.recommended.length > 0) {
          results.info.push(`${check.directive} の推奨値: ${check.recommended.join(', ')}`);
        }
      }
    });

    // img-src での data: 未許可の警告
    if (policies['img-src'] && !policies['img-src'].includes('data:')) {
      results.info.push("img-src で data: を許可すると、インライン画像（PlantUML図など）が表示できます");
    }
  }

  // セキュリティ標準準拠チェック
  checkSecurityCompliance(policies, results) {
    // OWASP準拠チェック
    const owaspCompliant = this.checkOWASPCompliance(policies);
    results.compliance.owasp = owaspCompliant;
    if (!owaspCompliant) {
      results.recommendations.push("OWASP CSPガイドラインに準拠するために設定を見直してください");
    }

    // NIST準拠チェック
    const nistCompliant = this.checkNISTCompliance(policies);
    results.compliance.nist = nistCompliant;
    if (!nistCompliant) {
      results.recommendations.push("NIST セキュリティフレームワークに準拠するために設定を強化してください");
    }

    // ISO 27001準拠チェック
    const iso27001Compliant = this.checkISO27001Compliance(policies);
    results.compliance.iso27001 = iso27001Compliant;
    if (!iso27001Compliant) {
      results.recommendations.push("ISO 27001 情報セキュリティ標準に準拠するために追加の対策が必要です");
    }
  }

  // OWASP準拠チェック
  checkOWASPCompliance(policies) {
    const required = ['default-src', 'script-src', 'style-src', 'img-src', 'frame-ancestors'];
    const hasRequired = required.every(directive => policies[directive]);
    const noUnsafeEval = !policies['script-src']?.includes("'unsafe-eval'");
    const hasFrameAncestors = policies['frame-ancestors'] && 
                             (policies['frame-ancestors'].includes("'none'") || policies['frame-ancestors'].includes("'self'"));
    
    return hasRequired && noUnsafeEval && hasFrameAncestors;
  }

  // NIST準拠チェック
  checkNISTCompliance(policies) {
    const hasBaseUri = policies['base-uri'];
    const hasFormAction = policies['form-action'];
    const hasObjectSrc = policies['object-src'];
    const noWildcardInCritical = !policies['script-src']?.includes('*') && 
                                !policies['default-src']?.includes('*');
    
    return hasBaseUri && hasFormAction && hasObjectSrc && noWildcardInCritical;
  }

  // ISO 27001準拠チェック
  checkISO27001Compliance(policies) {
    const hasUpgradeInsecure = policies['upgrade-insecure-requests'];
    const noHttpSources = Object.values(policies).every(sources => 
      !sources?.some(src => src.startsWith('http:'))
    );
    const restrictiveFrameAncestors = policies['frame-ancestors']?.includes("'none'");
    
    return hasUpgradeInsecure && noHttpSources && restrictiveFrameAncestors;
  }

  // 高度なCSP違反検出
  detectViolations(content, policies) {
    const violations = [];

    // security-helpersのCSP違反テストを使用
    Object.keys(policies).forEach(directive => {
      const directiveViolations = cspTestHelpers.testCSPViolation(directive, content);
      directiveViolations.forEach(violation => {
        violations.push({
          type: directive,
          violation: 'policy-violation',
          message: violation,
          content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        });
      });
    });

    // 追加の詳細検出
    this.detectAdvancedViolations(content, policies, violations);

    return violations;
  }

  // 高度な違反パターンの検出
  detectAdvancedViolations(content, policies, violations) {
    // イベントハンドラーの包括検出
    threatPatterns.eventHandlers.forEach(handler => {
      const pattern = new RegExp(`${handler}\\s*=`, 'gi');
      if (pattern.test(content)) {
        if (!policies['script-src']?.includes("'unsafe-inline'")) {
          violations.push({
            type: 'script-src',
            violation: 'inline-event-handler',
            message: `インラインイベントハンドラー '${handler}' が検出されました`,
            handler,
            severity: 'HIGH'
          });
        }
      }
    });

    // 危険なプロトコルの検出
    threatPatterns.protocols.forEach(protocol => {
      if (content.includes(protocol) && protocol !== 'https:') {
        violations.push({
          type: 'general',
          violation: 'dangerous-protocol',
          message: `危険なプロトコル '${protocol}' が検出されました`,
          protocol,
          severity: protocol === 'javascript:' ? 'CRITICAL' : 'MEDIUM'
        });
      }
    });

    // Base64エンコードされた潜在的脅威
    const base64Pattern = /data:[^;]+;base64,[A-Za-z0-9+/=]+/g;
    const base64Matches = content.match(base64Pattern) || [];
    base64Matches.forEach(match => {
      try {
        const decoded = atob(match.split(',')[1] || '');
        if (decoded.includes('<script>') || decoded.includes('javascript:')) {
          violations.push({
            type: 'general',
            violation: 'base64-threat',
            message: 'Base64エンコードされた悪意あるコンテンツが検出されました',
            content: match.substring(0, 50) + '...',
            severity: 'HIGH'
          });
        }
      } catch (e) {
        // Base64デコードエラーは無視
      }
    });
  }

  // 高度なスコア計算
  calculateSecurityScore(policies, results) {
    let score = 100;
    
    // クリティカル問題による大幅減点
    const criticalCount = results.criticalIssues.filter(issue => issue.severity === 'CRITICAL').length;
    score -= criticalCount * 30;
    
    // 高リスク問題による減点
    const highCount = results.criticalIssues.filter(issue => issue.severity === 'HIGH').length;
    score -= highCount * 15;
    
    // エラーごとの減点
    score -= results.errors.length * 10;
    
    // 警告ごとの減点
    score -= results.warnings.length * 5;
    
    // 推奨設定不足による減点
    score -= results.recommendations.length * 3;
    
    // 準拠性によるボーナス
    if (results.compliance.owasp) score += 10;
    if (results.compliance.nist) score += 10;
    if (results.compliance.iso27001) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  // セキュリティレベル判定
  determineSecurityLevel(score, criticalIssueCount) {
    if (criticalIssueCount > 0) return 'CRITICAL';
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'ACCEPTABLE';
    if (score >= 50) return 'POOR';
    return 'CRITICAL';
  }

  // PlantUMLエディター用最適CSP生成
  generateOptimalCSP() {
    return cspTestHelpers.generateRecommendedCSP();
  }

  // CSPヘッダー文字列生成
  generateCSPHeader(policies) {
    const directives = [];
    
    Object.entries(policies).forEach(([directive, sources]) => {
      if (Array.isArray(sources)) {
        if (sources.length === 0) {
          directives.push(directive);
        } else {
          directives.push(`${directive} ${sources.join(' ')}`);
        }
      }
    });
    
    return directives.join('; ');
  }
}

describe('CSPヘッダー検証 単体テスト - 完全実装版', () => {
  let cspValidator;

  // 各テスト前の初期化
  beforeEach(() => {
    cspValidator = new AdvancedCSPValidator();
    createTestDOM();
  });

  afterEach(() => {
    cleanupTestDOM();
  });

  describe('CSPヘッダーパース機能（Test 1-5）', () => {
    test('Test 1: 正常なCSPヘッダーを正しくパースする', async () => {
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

    test('Test 2: 空のCSPヘッダーを適切に処理する', () => {
      // Act
      const result = cspValidator.parseCSPHeader('');
      
      // Assert
      expect(result).toEqual({});
    });

    test('Test 3: null/undefined CSPヘッダーを適切に処理する', () => {
      // Act & Assert
      expect(cspValidator.parseCSPHeader(null)).toEqual({});
      expect(cspValidator.parseCSPHeader(undefined)).toEqual({});
    });

    test('Test 4: 複雑なCSPヘッダーを正しくパースする', () => {
      // Arrange
      const complexCSP = "default-src 'self'; script-src 'self' https://cdn.example.com 'sha256-abc123'; img-src 'self' data: https:; font-src 'self' https://fonts.googleapis.com";
      
      // Act
      const result = cspValidator.parseCSPHeader(complexCSP);
      
      // Assert
      expect(result['script-src']).toEqual(["'self'", 'https://cdn.example.com', "'sha256-abc123'"]);
      expect(result['img-src']).toEqual(["'self'", 'data:', 'https:']);
      expect(result['font-src']).toEqual(["'self'", 'https://fonts.googleapis.com']);
    });

    test('Test 5: 値なしディレクティブを正しく処理する', () => {
      // Arrange
      const cspWithValueless = "default-src 'self'; upgrade-insecure-requests; block-all-mixed-content";
      
      // Act
      const result = cspValidator.parseCSPHeader(cspWithValueless);
      
      // Assert
      expect(result['default-src']).toEqual(["'self'"]);
      expect(result['upgrade-insecure-requests']).toEqual([]);
      expect(result['block-all-mixed-content']).toEqual([]);
    });
  });

  describe('CSPポリシー検証機能（Test 6-13）', () => {
    test('Test 6: 安全なCSPポリシーが適切に評価される', async () => {
      // Arrange
      const safePolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-hashes'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"]
      };
      
      // Act
      const result = await measurePerformance('csp-validation', () => {
        return cspValidator.validatePolicy(safePolicy);
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(80);
      expect(result.securityLevel).toMatch(/^(EXCELLENT|GOOD)$/);
    });

    test('Test 7: 危険なCSPポリシーを正しく検出する', () => {
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
      expect(result.criticalIssues.some(issue => issue.type === 'UNSAFE_EVAL')).toBe(true);
      expect(result.criticalIssues.some(issue => issue.type === 'UNSAFE_INLINE_SCRIPT')).toBe(true);
      expect(result.securityLevel).toBe('CRITICAL');
    });

    test('Test 8: ワイルドカード使用を適切に検出する', () => {
      // Arrange
      const wildcardPolicy = {
        'default-src': ['*'],
        'script-src': ['*'],
        'img-src': ['*'] // img-srcでは許容
      };
      
      // Act
      const result = cspValidator.validatePolicy(wildcardPolicy);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.criticalIssues.some(issue => 
        issue.type === 'WILDCARD_CRITICAL' && issue.directive === 'default-src'
      )).toBe(true);
      expect(result.criticalIssues.some(issue => 
        issue.type === 'WILDCARD_CRITICAL' && issue.directive === 'script-src'
      )).toBe(true);
      // img-srcのワイルドカードは警告のみ
      expect(result.warnings.some(w => w.includes('img-src'))).toBe(false); // img-srcは許容
    });

    test('Test 9: data:プロトコルの不適切使用を検出する', () => {
      // Arrange
      const dataProtocolPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'data:'],
        'img-src': ["'self'", 'data:'] // img-srcでは適切
      };
      
      // Act
      const result = cspValidator.validatePolicy(dataProtocolPolicy);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.criticalIssues.some(issue => issue.type === 'DATA_PROTOCOL_SCRIPT')).toBe(true);
    });

    test('Test 10: 必須ディレクティブの不足を検出する', () => {
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
      expect(result.criticalIssues.some(issue => 
        issue.type === 'MISSING_CRITICAL_DIRECTIVE' && issue.directive === 'default-src'
      )).toBe(true);
    });

    test('Test 11: HTTPプロトコル使用を警告する', () => {
      // Arrange
      const httpPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'http://insecure.example.com'],
        'img-src': ["'self'", 'http://images.example.com']
      };
      
      // Act
      const result = cspValidator.validatePolicy(httpPolicy);
      
      // Assert
      expect(result.warnings.some(w => w.includes('HTTPプロトコル'))).toBe(true);
      expect(result.warnings.some(w => w.includes('http://insecure.example.com'))).toBe(true);
    });

    test('Test 12: セキュリティ標準準拠をチェックする', () => {
      // Arrange
      const compliantPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'object-src': ["'none'"],
        'upgrade-insecure-requests': []
      };
      
      // Act
      const result = cspValidator.validatePolicy(compliantPolicy);
      
      // Assert
      expect(result.compliance.owasp).toBe(true);
      expect(result.compliance.nist).toBe(true);
      expect(result.compliance.iso27001).toBe(true);
      expect(result.score).toBeGreaterThan(90); // 準拠ボーナス含む
    });

    test('Test 13: スコア計算が適切に動作する', () => {
      // Arrange
      const poorPolicy = {
        'script-src': ["'unsafe-eval'", "*"] // 複数のクリティカル問題
      };
      
      // Act
      const result = cspValidator.validatePolicy(poorPolicy);
      
      // Assert
      expect(result.score).toBeLessThan(30); // 重大な問題により大幅減点
      expect(result.securityLevel).toBe('CRITICAL');
    });
  });

  describe('CSP違反検出機能（Test 14-21）', () => {
    test('Test 14: インラインスクリプト違反を検出する', () => {
      // Arrange
      const content = '<div>安全なコンテンツ</div><script>alert("違反")</script>';
      const policies = {
        'script-src': ["'self'"] // unsafe-inlineなし
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      expect(violations.length).toBeGreaterThan(0);
      const scriptViolation = violations.find(v => v.violation === 'inline-script');
      expect(scriptViolation).toBeDefined();
    });

    test('Test 15: インラインイベントハンドラーを包括的に検出する', () => {
      // Arrange
      const content = `
        <div onclick="alert('XSS')">クリック</div>
        <img onload="malicious()" src="test.jpg">
        <form onsubmit="steal()">フォーム</form>
        <body onunload="cleanup()">
      `;
      const policies = {
        'script-src': ["'self'"] // unsafe-inlineなし
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      const eventViolations = violations.filter(v => v.violation === 'inline-event-handler');
      expect(eventViolations.length).toBeGreaterThan(3);
      expect(eventViolations.some(v => v.handler === 'onclick')).toBe(true);
      expect(eventViolations.some(v => v.handler === 'onload')).toBe(true);
      expect(eventViolations.some(v => v.handler === 'onsubmit')).toBe(true);
    });

    test('Test 16: 危険なプロトコルを検出する', () => {
      // Arrange
      const content = `
        <a href="javascript:alert('XSS')">リンク1</a>
        <iframe src="data:text/html,<script>alert('XSS')</script>">フレーム</iframe>
        <object data="vbscript:msgbox('VBS')">オブジェクト</object>
      `;
      const policies = {
        'script-src': ["'self'"]
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      const protocolViolations = violations.filter(v => v.violation === 'dangerous-protocol');
      expect(protocolViolations.length).toBeGreaterThan(0);
      expect(protocolViolations.some(v => v.protocol === 'javascript:')).toBe(true);
      expect(protocolViolations.some(v => v.protocol === 'data:')).toBe(true);
      expect(protocolViolations.some(v => v.protocol === 'vbscript:')).toBe(true);
    });

    test('Test 17: Base64エンコードされた脅威を検出する', () => {
      // Arrange - Base64エンコードされた<script>alert('XSS')</script>
      const maliciousBase64 = 'PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=';
      const content = `<iframe src="data:text/html;base64,${maliciousBase64}">悪意あるフレーム</iframe>`;
      const policies = {
        'script-src': ["'self'"]
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      const base64Violations = violations.filter(v => v.violation === 'base64-threat');
      expect(base64Violations.length).toBeGreaterThan(0);
      expect(base64Violations[0].severity).toBe('HIGH');
    });

    test('Test 18: インラインスタイル違反を検出する', () => {
      // Arrange
      const content = '<div style="color: red; background: url(javascript:alert(1))">スタイル付きテキスト</div>';
      const policies = {
        'style-src': ["'self'"] // unsafe-inlineなし
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      expect(violations.some(v => v.message && v.message.includes('Inline style'))).toBe(true);
    });

    test('Test 19: data: URL画像の制御を検証する', () => {
      // Arrange
      const content = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      
      // data:を許可しないポリシー
      const restrictivePolicy = {
        'img-src': ["'self'"] // data:なし
      };
      
      // data:を許可するポリシー
      const permissivePolicy = {
        'img-src': ["'self'", 'data:']
      };
      
      // Act
      const restrictiveViolations = cspValidator.detectViolations(content, restrictivePolicy);
      const permissiveViolations = cspValidator.detectViolations(content, permissivePolicy);
      
      // Assert
      expect(restrictiveViolations.some(v => v.message && v.message.includes('data: URL'))).toBe(true);
      expect(permissiveViolations.some(v => v.message && v.message.includes('data: URL'))).toBe(false);
    });

    test('Test 20: 複合的な違反パターンを検出する', () => {
      // Arrange
      const complexContent = `
        <script>eval('alert("XSS1")')</script>
        <div onclick="alert('XSS2')" style="display:none">
        <iframe src="javascript:alert('XSS3')"></iframe>
        <img src="data:text/html,<script>alert('XSS4')</script>" onerror="alert('XSS5')">
      `;
      const policies = {
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'"]
      };
      
      // Act
      const violations = cspValidator.detectViolations(content, policies);
      
      // Assert
      expect(violations.length).toBeGreaterThan(4);
      // 様々な種類の違反が検出されることを確認
      const violationTypes = new Set(violations.map(v => v.violation));
      expect(violationTypes.size).toBeGreaterThan(2);
    });

    test('Test 21: 安全なコンテンツでは違反が検出されない', () => {
      // Arrange
      const safeContent = `
        <div class="safe-content">これは安全なコンテンツです</div>
        <p>日本語テキスト：ユーザーがシステムにログインする</p>
        <img src="https://example.com/safe-image.jpg" alt="安全な画像">
      `;
      const policies = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'https:']
      };
      
      // Act
      const violations = cspValidator.detectViolations(safeContent, policies);
      
      // Assert
      expect(violations).toHaveLength(0);
    });
  });

  describe('PlantUMLエディター特化機能（Test 22-26）', () => {
    test('Test 22: PlantUMLエディター用最適CSPを生成する', () => {
      // Act
      const optimalCSP = cspValidator.generateOptimalCSP();
      
      // Assert
      expect(optimalCSP).toHaveProperty('default-src');
      expect(optimalCSP).toHaveProperty('script-src');
      expect(optimalCSP).toHaveProperty('style-src');
      expect(optimalCSP).toHaveProperty('img-src');
      
      // PlantUMLエディターに必要な設定
      expect(optimalCSP['script-src']).toContain("'unsafe-hashes'");
      expect(optimalCSP['style-src']).toContain("'unsafe-inline'");
      expect(optimalCSP['img-src']).toContain('data:');
      expect(optimalCSP['frame-ancestors']).toEqual(["'none'"]);
    });

    test('Test 23: CSPヘッダー文字列を正しく生成する', () => {
      // Arrange
      const policies = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-hashes'"],
        'upgrade-insecure-requests': []
      };
      
      // Act
      const headerString = cspValidator.generateCSPHeader(policies);
      
      // Assert
      expect(headerString).toContain("default-src 'self'");
      expect(headerString).toContain("script-src 'self' 'unsafe-hashes'");
      expect(headerString).toContain('upgrade-insecure-requests');
      expect(headerString.includes(';')).toBe(true);
    });

    test('Test 24: PlantUMLコンテンツとの互換性を検証する', () => {
      // Arrange
      const plantUMLContent = `
        <div id="plantuml-editor">
          <textarea id="japanese-input">ユーザー -> システム: ログイン要求</textarea>
          <div id="plantuml-output">
            <img src="data:image/svg+xml;base64,PHN2ZyB..." alt="PlantUML図">
          </div>
        </div>
      `;
      
      const optimalPolicy = cspValidator.generateOptimalCSP();
      
      // Act
      const violations = cspValidator.detectViolations(plantUMLContent, optimalPolicy);
      
      // Assert
      expect(violations).toHaveLength(0);
    });

    test('Test 25: セキュリティとユーザビリティのバランスを検証する', () => {
      // Arrange
      const optimalPolicy = cspValidator.generateOptimalCSP();
      
      // Act
      const validation = cspValidator.validatePolicy(optimalPolicy);
      
      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(70); // 実用的なスコア
      expect(validation.securityLevel).toMatch(/^(EXCELLENT|GOOD|ACCEPTABLE)$/);
      
      // 必要な緩和措置が含まれていることを確認
      expect(optimalPolicy['script-src']).toContain("'unsafe-hashes'"); // PlantUML処理用
      expect(optimalPolicy['style-src']).toContain("'unsafe-inline'"); // UI用
      expect(optimalPolicy['img-src']).toContain('data:'); // 図生成用
    });

    test('Test 26: 日本語エラーメッセージの表示を検証する', () => {
      // Arrange
      const badPolicy = {
        'script-src': ["'unsafe-eval'", "*"]
      };
      
      // Act
      const result = cspValidator.validatePolicy(badPolicy);
      
      // Assert
      expect(result.errors.some(error => error.includes('必須ディレクティブ'))).toBe(true);
      expect(result.errors.some(error => error.includes('セキュリティリスク'))).toBe(true);
      expect(result.criticalIssues.some(issue => issue.message.includes('重大な'))).toBe(true);
    });
  });

  describe('パフォーマンス・統合テスト（Test 27-30）', () => {
    test('Test 27: 大量のCSPポリシー検証を効率的に処理する', async () => {
      // Arrange
      const largePolicies = {};
      for (let i = 0; i < 100; i++) {
        largePolicies[`directive-${i}`] = ["'self'", `'source-${i}'`];
      }
      
      // Act & Assert
      const result = await measurePerformance('large-csp-validation', () => {
        return cspValidator.validatePolicy(largePolicies);
      });
      
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });

    test('Test 28: 大量のコンテンツ違反検出を効率的に処理する', async () => {
      // Arrange
      const largeContent = Array(1000).fill('<div>コンテンツ</div><script>alert("test")</script>').join('\n');
      const policies = { 'script-src': ["'self'"] };
      
      // Act & Assert
      const violations = await measurePerformance('large-content-violation-detection', () => {
        return cspValidator.detectViolations(largeContent, policies);
      });
      
      expect(violations.length).toBeGreaterThan(0);
    });

    test('Test 29: 実世界のCSPヘッダーとの互換性テスト', () => {
      // Arrange - 実際のWebサイトで使用されるCSPヘッダーの例
      const realWorldCSPs = [
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.googleapis.com; connect-src 'self'; manifest-src 'self'",
        "default-src 'self'; script-src 'self' 'sha256-abc123' 'nonce-xyz789'; style-src 'self'; img-src 'self' data:; upgrade-insecure-requests"
      ];
      
      // Act & Assert
      realWorldCSPs.forEach((csp, index) => {
        const parsed = cspValidator.parseCSPHeader(csp);
        const validation = cspValidator.validatePolicy(parsed);
        
        expect(parsed).toBeDefined();
        expect(validation.score).toBeGreaterThan(30); // 実用的なレベル
      });
    });

    test('Test 30: security-helpersとの統合動作検証', async () => {
      // Arrange
      const testElement = createTestDOM();
      const cspHeader = "default-src 'self'; script-src 'self' 'unsafe-hashes'";
      
      // Act
      const securityResults = await measurePerformance('security-integration-test', () => {
        return securityTestRunner.runComprehensiveSecurityTest(
          (content) => content, // パススルー関数
          cspHeader,
          testElement
        );
      });
      
      // Assert
      expect(securityResults).toHaveProperty('csp');
      expect(securityResults.csp.length).toBeGreaterThan(0);
      expect(securityResults.summary.passRate).toBeGreaterThan(50);
    });
  });
});