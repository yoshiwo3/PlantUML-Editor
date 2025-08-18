/**
 * SecurityTestFramework - OWASP Top 10準拠セキュリティテストフレームワーク
 * 
 * Sprint3 Hybrid Object Model Framework
 * 包括的なセキュリティテスト機能を提供
 */

import { BasePage } from '../base/BasePage.js';
import { expect } from '@playwright/test';

export class SecurityTestFramework {
  constructor(page, context = null) {
    this.page = page;
    this.context = context;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8086';
    
    // OWASP Top 10 (2021) カテゴリ
    this.owaspCategories = {
      'A01:2021': 'Broken Access Control',
      'A02:2021': 'Cryptographic Failures',
      'A03:2021': 'Injection',
      'A04:2021': 'Insecure Design',
      'A05:2021': 'Security Misconfiguration',
      'A06:2021': 'Vulnerable and Outdated Components',
      'A07:2021': 'Identification and Authentication Failures',
      'A08:2021': 'Software and Data Integrity Failures',
      'A09:2021': 'Security Logging and Monitoring Failures',
      'A10:2021': 'Server-Side Request Forgery (SSRF)'
    };
    
    // セキュリティテスト結果
    this.testResults = {
      vulnerabilities: [],
      passed: [],
      warnings: [],
      errors: []
    };
  }

  /**
   * 包括的セキュリティテスト実行
   */
  async runComprehensiveSecurityTests() {
    console.log('Starting comprehensive security tests (OWASP Top 10)...');
    
    const results = {};
    
    // A01: Broken Access Control
    results.accessControl = await this.testBrokenAccessControl();
    
    // A02: Cryptographic Failures
    results.cryptographic = await this.testCryptographicFailures();
    
    // A03: Injection
    results.injection = await this.testInjectionVulnerabilities();
    
    // A04: Insecure Design
    results.insecureDesign = await this.testInsecureDesign();
    
    // A05: Security Misconfiguration
    results.misconfiguration = await this.testSecurityMisconfiguration();
    
    // A06: Vulnerable Components
    results.vulnerableComponents = await this.testVulnerableComponents();
    
    // A07: Authentication Failures
    results.authentication = await this.testAuthenticationFailures();
    
    // A08: Data Integrity Failures
    results.dataIntegrity = await this.testDataIntegrityFailures();
    
    // A09: Logging and Monitoring
    results.loggingMonitoring = await this.testLoggingMonitoring();
    
    // A10: SSRF
    results.ssrf = await this.testSSRF();
    
    // 追加セキュリティテスト
    results.additional = await this.runAdditionalSecurityTests();
    
    return this.generateSecurityReport(results);
  }

  /**
   * A01: Broken Access Control テスト
   */
  async testBrokenAccessControl() {
    const results = [];
    
    try {
      // 直接URL アクセステスト
      const restrictedPaths = [
        '/admin',
        '/api/admin',
        '/config',
        '/debug',
        '/.env',
        '/backup'
      ];
      
      for (const path of restrictedPaths) {
        try {
          const response = await this.page.goto(`${this.baseURL}${path}`, { 
            waitUntil: 'domcontentloaded',
            timeout: 5000 
          });
          
          if (response && response.status() === 200) {
            results.push({
              category: 'A01:2021',
              vulnerability: 'Unrestricted URL Access',
              severity: 'HIGH',
              details: `Direct access to ${path} returned 200 OK`,
              path
            });
          }
        } catch (error) {
          // エラーは期待される動作（アクセス拒否）
        }
      }
      
      // ディレクトリトラバーサルテスト
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];
      
      for (const payload of traversalPayloads) {
        try {
          const response = await this.page.goto(`${this.baseURL}/file?path=${payload}`, {
            timeout: 5000
          });
          
          if (response && response.status() === 200) {
            const content = await response.text();
            if (content.includes('root:') || content.includes('localhost')) {
              results.push({
                category: 'A01:2021',
                vulnerability: 'Directory Traversal',
                severity: 'CRITICAL',
                details: `Directory traversal successful with payload: ${payload}`,
                payload
              });
            }
          }
        } catch (error) {
          // エラーは期待される動作
        }
      }
      
    } catch (error) {
      results.push({
        category: 'A01:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Access control test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A02: Cryptographic Failures テスト
   */
  async testCryptographicFailures() {
    const results = [];
    
    try {
      // HTTP/HTTPS 設定確認
      const response = await this.page.goto(this.baseURL);
      const url = response.url();
      
      if (!url.startsWith('https://') && process.env.NODE_ENV === 'production') {
        results.push({
          category: 'A02:2021',
          vulnerability: 'Insecure HTTP',
          severity: 'HIGH',
          details: 'Application not using HTTPS in production'
        });
      }
      
      // セキュリティヘッダー確認
      const headers = response.headers();
      
      const requiredHeaders = {
        'strict-transport-security': 'HSTS not configured',
        'x-frame-options': 'Clickjacking protection missing',
        'x-content-type-options': 'MIME sniffing protection missing',
        'x-xss-protection': 'XSS protection header missing',
        'content-security-policy': 'CSP header missing'
      };
      
      for (const [header, description] of Object.entries(requiredHeaders)) {
        if (!headers[header] && !headers[header.toLowerCase()]) {
          results.push({
            category: 'A02:2021',
            vulnerability: 'Missing Security Header',
            severity: 'MEDIUM',
            details: description,
            header
          });
        }
      }
      
      // 弱い暗号化確認（クライアントサイド）
      const weakCrypto = await this.page.evaluate(() => {
        const issues = [];
        
        // MD5, SHA1 使用確認
        if (window.crypto && window.crypto.subtle) {
          // 実装で弱いハッシュ関数を使用していないかチェック
          const scripts = Array.from(document.scripts);
          scripts.forEach(script => {
            if (script.src && (script.src.includes('md5') || script.src.includes('sha1'))) {
              issues.push(`Weak hash function detected: ${script.src}`);
            }
          });
        }
        
        return issues;
      });
      
      weakCrypto.forEach(issue => {
        results.push({
          category: 'A02:2021',
          vulnerability: 'Weak Cryptographic Function',
          severity: 'MEDIUM',
          details: issue
        });
      });
      
    } catch (error) {
      results.push({
        category: 'A02:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Cryptographic test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A03: Injection テスト
   */
  async testInjectionVulnerabilities() {
    const results = [];
    
    try {
      // XSS テスト
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(`XSS`)"></iframe>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus>',
        '<textarea onfocus=alert("XSS") autofocus>',
        '<keygen onfocus=alert("XSS") autofocus>',
        '<video><source onerror="alert(`XSS`)">',
        '<audio src=x onerror=alert("XSS")>',
        '<details open ontoggle=alert("XSS")>',
        '<marquee onstart=alert("XSS")>'
      ];
      
      for (const payload of xssPayloads) {
        const xssResult = await this.testXSSPayload(payload);
        if (xssResult.vulnerable) {
          results.push({
            category: 'A03:2021',
            vulnerability: 'Cross-Site Scripting (XSS)',
            severity: 'HIGH',
            details: `XSS vulnerability detected with payload: ${payload}`,
            payload,
            location: xssResult.location
          });
        }
      }
      
      // SQL Injection テスト（フロントエンド検証）
      const sqlPayloads = [
        "' OR '1'='1",
        "' OR 1=1--",
        "'; DROP TABLE users;--",
        "' UNION SELECT * FROM users--",
        "admin'--",
        "admin'/*",
        "1' AND SLEEP(5)#"
      ];
      
      for (const payload of sqlPayloads) {
        const sqlResult = await this.testSQLInjectionPayload(payload);
        if (sqlResult.vulnerable) {
          results.push({
            category: 'A03:2021',
            vulnerability: 'SQL Injection',
            severity: 'CRITICAL',
            details: `SQL injection vulnerability detected with payload: ${payload}`,
            payload,
            response: sqlResult.response
          });
        }
      }
      
      // NoSQL Injection テスト
      const nosqlPayloads = [
        '{"$where": "function() { return true; }"}',
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$regex": ".*"}',
        '{"$exists": true}'
      ];
      
      for (const payload of nosqlPayloads) {
        const nosqlResult = await this.testNoSQLInjectionPayload(payload);
        if (nosqlResult.vulnerable) {
          results.push({
            category: 'A03:2021',
            vulnerability: 'NoSQL Injection',
            severity: 'HIGH',
            details: `NoSQL injection vulnerability detected with payload: ${payload}`,
            payload
          });
        }
      }
      
      // Command Injection テスト
      const commandPayloads = [
        '; ls -la',
        '| whoami',
        '& dir',
        '`id`',
        '$(whoami)',
        '; cat /etc/passwd',
        '| type C:\\Windows\\System32\\drivers\\etc\\hosts'
      ];
      
      for (const payload of commandPayloads) {
        const cmdResult = await this.testCommandInjectionPayload(payload);
        if (cmdResult.vulnerable) {
          results.push({
            category: 'A03:2021',
            vulnerability: 'Command Injection',
            severity: 'CRITICAL',
            details: `Command injection vulnerability detected with payload: ${payload}`,
            payload
          });
        }
      }
      
    } catch (error) {
      results.push({
        category: 'A03:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Injection test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * XSS ペイロードテスト
   */
  async testXSSPayload(payload) {
    try {
      // 日本語入力フィールドでテスト
      await this.page.goto(this.baseURL);
      await this.page.waitForSelector('#japanese-input', { timeout: 5000 });
      
      // XSS 実行検出用フラグ設定
      await this.page.evaluate(() => {
        window.__xssExecuted = false;
        window.alert = () => { window.__xssExecuted = true; };
        window.confirm = () => { window.__xssExecuted = true; return true; };
        window.prompt = () => { window.__xssExecuted = true; return null; };
      });
      
      // ペイロード入力
      await this.page.fill('#japanese-input', payload);
      await this.page.waitForTimeout(500);
      
      // XSS 実行確認
      const xssExecuted = await this.page.evaluate(() => window.__xssExecuted);
      
      // DOM 内容確認
      const domContent = await this.page.content();
      const reflectedUnsafe = domContent.includes('<script>') && domContent.includes(payload);
      
      return {
        vulnerable: xssExecuted || reflectedUnsafe,
        executed: xssExecuted,
        reflected: reflectedUnsafe,
        location: 'japanese-input'
      };
      
    } catch (error) {
      return { vulnerable: false, error: error.message };
    }
  }

  /**
   * SQL Injection ペイロードテスト
   */
  async testSQLInjectionPayload(payload) {
    try {
      // API エンドポイントが存在する場合のテスト
      const response = await this.page.goto(`${this.baseURL}/api/search?q=${encodeURIComponent(payload)}`, {
        timeout: 5000
      });
      
      if (response) {
        const responseText = await response.text();
        const status = response.status();
        
        // SQL エラーメッセージ検出
        const sqlErrorPatterns = [
          /sql syntax/i,
          /mysql/i,
          /postgresql/i,
          /oracle/i,
          /sqlite/i,
          /syntax error/i,
          /unexpected token/i
        ];
        
        const hasSQLError = sqlErrorPatterns.some(pattern => pattern.test(responseText));
        
        return {
          vulnerable: hasSQLError || status === 500,
          response: responseText.substring(0, 200),
          status
        };
      }
      
      return { vulnerable: false };
      
    } catch (error) {
      return { vulnerable: false, error: error.message };
    }
  }

  /**
   * NoSQL Injection ペイロードテスト
   */
  async testNoSQLInjectionPayload(payload) {
    try {
      const response = await this.page.goto(`${this.baseURL}/api/data?filter=${encodeURIComponent(payload)}`, {
        timeout: 5000
      });
      
      if (response && response.status() === 200) {
        const responseText = await response.text();
        
        // 予期しないデータ漏洩確認
        const suspiciousPatterns = [
          /"password":/,
          /"token":/,
          /"secret":/,
          /"admin":/
        ];
        
        const hasSuspiciousData = suspiciousPatterns.some(pattern => pattern.test(responseText));
        
        return { vulnerable: hasSuspiciousData };
      }
      
      return { vulnerable: false };
      
    } catch (error) {
      return { vulnerable: false, error: error.message };
    }
  }

  /**
   * Command Injection ペイロードテスト
   */
  async testCommandInjectionPayload(payload) {
    try {
      const response = await this.page.goto(`${this.baseURL}/api/process?cmd=${encodeURIComponent(payload)}`, {
        timeout: 5000
      });
      
      if (response) {
        const responseText = await response.text();
        
        // コマンド実行結果検出
        const commandOutputPatterns = [
          /total \d+/,  // ls 出力
          /root:/,      // passwd ファイル
          /Windows/,    // Windows システム
          /uid=\d+/     // id コマンド出力
        ];
        
        const hasCommandOutput = commandOutputPatterns.some(pattern => pattern.test(responseText));
        
        return { vulnerable: hasCommandOutput };
      }
      
      return { vulnerable: false };
      
    } catch (error) {
      return { vulnerable: false, error: error.message };
    }
  }

  /**
   * A04: Insecure Design テスト
   */
  async testInsecureDesign() {
    const results = [];
    
    try {
      // セキュリティ設計確認
      await this.page.goto(this.baseURL);
      
      // 認証なしでの機能アクセス確認
      const sensitiveEndpoints = [
        '/api/users',
        '/api/config',
        '/api/admin',
        '/api/export'
      ];
      
      for (const endpoint of sensitiveEndpoints) {
        try {
          const response = await this.page.goto(`${this.baseURL}${endpoint}`, { timeout: 5000 });
          if (response && response.status() === 200) {
            results.push({
              category: 'A04:2021',
              vulnerability: 'Insecure Design - Unauthenticated Access',
              severity: 'HIGH',
              details: `Sensitive endpoint ${endpoint} accessible without authentication`,
              endpoint
            });
          }
        } catch (error) {
          // Expected behavior
        }
      }
      
      // クライアントサイドセキュリティ確認
      const securityIssues = await this.page.evaluate(() => {
        const issues = [];
        
        // Sensitive data in localStorage/sessionStorage
        if (localStorage.length > 0) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            if (value && (value.includes('password') || value.includes('token') || value.includes('secret'))) {
              issues.push(`Sensitive data in localStorage: ${key}`);
            }
          }
        }
        
        // Console logging of sensitive data
        const originalLog = console.log;
        let loggedSensitiveData = false;
        console.log = (...args) => {
          const message = args.join(' ');
          if (message.includes('password') || message.includes('token')) {
            loggedSensitiveData = true;
          }
          originalLog.apply(console, args);
        };
        
        if (loggedSensitiveData) {
          issues.push('Sensitive data logged to console');
        }
        
        return issues;
      });
      
      securityIssues.forEach(issue => {
        results.push({
          category: 'A04:2021',
          vulnerability: 'Insecure Design - Data Exposure',
          severity: 'MEDIUM',
          details: issue
        });
      });
      
    } catch (error) {
      results.push({
        category: 'A04:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Insecure design test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A05: Security Misconfiguration テスト
   */
  async testSecurityMisconfiguration() {
    const results = [];
    
    try {
      const response = await this.page.goto(this.baseURL);
      
      // サーバー情報漏洩確認
      const headers = response.headers();
      
      if (headers['server']) {
        results.push({
          category: 'A05:2021',
          vulnerability: 'Server Information Disclosure',
          severity: 'LOW',
          details: `Server header disclosed: ${headers['server']}`,
          header: headers['server']
        });
      }
      
      if (headers['x-powered-by']) {
        results.push({
          category: 'A05:2021',
          vulnerability: 'Technology Stack Disclosure',
          severity: 'LOW',
          details: `X-Powered-By header disclosed: ${headers['x-powered-by']}`,
          header: headers['x-powered-by']
        });
      }
      
      // デバッグ情報確認
      const content = await response.text();
      
      if (content.includes('debug') || content.includes('DEBUG')) {
        results.push({
          category: 'A05:2021',
          vulnerability: 'Debug Information Disclosure',
          severity: 'MEDIUM',
          details: 'Debug information found in response'
        });
      }
      
      // エラーページ確認
      try {
        const errorResponse = await this.page.goto(`${this.baseURL}/nonexistent`, { timeout: 5000 });
        if (errorResponse) {
          const errorContent = await errorResponse.text();
          if (errorContent.includes('stack trace') || errorContent.includes('Exception')) {
            results.push({
              category: 'A05:2021',
              vulnerability: 'Detailed Error Information',
              severity: 'MEDIUM',
              details: 'Detailed error information exposed to users'
            });
          }
        }
      } catch (error) {
        // Expected for 404 pages
      }
      
    } catch (error) {
      results.push({
        category: 'A05:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Security misconfiguration test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A06: Vulnerable and Outdated Components テスト
   */
  async testVulnerableComponents() {
    const results = [];
    
    try {
      await this.page.goto(this.baseURL);
      
      // クライアントサイドライブラリ確認
      const libraryInfo = await this.page.evaluate(() => {
        const libraries = [];
        
        // jQuery確認
        if (window.jQuery) {
          libraries.push({ name: 'jQuery', version: window.jQuery.fn.jquery });
        }
        
        // React確認
        if (window.React) {
          libraries.push({ name: 'React', version: window.React.version });
        }
        
        // Vue確認
        if (window.Vue) {
          libraries.push({ name: 'Vue', version: window.Vue.version });
        }
        
        // Angular確認
        if (window.ng && window.ng.version) {
          libraries.push({ name: 'Angular', version: window.ng.version.full });
        }
        
        // 外部スクリプト確認
        const scripts = Array.from(document.scripts);
        scripts.forEach(script => {
          if (script.src && !script.src.startsWith(window.location.origin)) {
            libraries.push({ name: 'External Script', url: script.src });
          }
        });
        
        return libraries;
      });
      
      // 既知の脆弱なバージョン確認（簡易版）
      const vulnerableVersions = {
        'jQuery': ['1.6.0', '1.7.0', '1.8.0', '2.0.0'],
        'React': ['15.0.0', '16.0.0'],
        'Vue': ['1.0.0', '2.0.0'],
        'Angular': ['1.0.0', '2.0.0']
      };
      
      libraryInfo.forEach(lib => {
        if (lib.version && vulnerableVersions[lib.name]) {
          const isVulnerable = vulnerableVersions[lib.name].some(vulnVersion => 
            lib.version.startsWith(vulnVersion)
          );
          
          if (isVulnerable) {
            results.push({
              category: 'A06:2021',
              vulnerability: 'Vulnerable Component',
              severity: 'HIGH',
              details: `${lib.name} version ${lib.version} has known vulnerabilities`,
              library: lib.name,
              version: lib.version
            });
          }
        }
        
        if (lib.url) {
          results.push({
            category: 'A06:2021',
            vulnerability: 'External Script Dependency',
            severity: 'MEDIUM',
            details: `External script loaded: ${lib.url}`,
            url: lib.url
          });
        }
      });
      
    } catch (error) {
      results.push({
        category: 'A06:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Vulnerable components test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A07: Identification and Authentication Failures テスト
   */
  async testAuthenticationFailures() {
    const results = [];
    
    try {
      // 認証機能が実装されている場合のテスト
      await this.page.goto(this.baseURL);
      
      // ログインフォーム確認
      const hasLoginForm = await this.page.locator('form[action*="login"], input[type="password"]').count() > 0;
      
      if (hasLoginForm) {
        // 弱いパスワードポリシー確認
        const weakPasswords = ['123456', 'password', 'admin', 'test', ''];
        
        for (const password of weakPasswords) {
          try {
            await this.page.fill('input[type="password"]', password);
            const errorMessage = await this.page.locator('.error, .warning').textContent();
            
            if (!errorMessage || !errorMessage.includes('weak')) {
              results.push({
                category: 'A07:2021',
                vulnerability: 'Weak Password Policy',
                severity: 'MEDIUM',
                details: `Weak password "${password}" not rejected`,
                password: password === '' ? 'empty' : password
              });
            }
          } catch (error) {
            // Expected if no login form
          }
        }
        
        // セッション管理確認
        const cookies = await this.page.context().cookies();
        
        cookies.forEach(cookie => {
          if (cookie.name.toLowerCase().includes('session') || cookie.name.toLowerCase().includes('auth')) {
            if (!cookie.secure && this.baseURL.startsWith('https://')) {
              results.push({
                category: 'A07:2021',
                vulnerability: 'Insecure Session Cookie',
                severity: 'HIGH',
                details: `Session cookie ${cookie.name} not marked as secure`,
                cookie: cookie.name
              });
            }
            
            if (!cookie.httpOnly) {
              results.push({
                category: 'A07:2021',
                vulnerability: 'Non-HttpOnly Session Cookie',
                severity: 'MEDIUM',
                details: `Session cookie ${cookie.name} accessible via JavaScript`,
                cookie: cookie.name
              });
            }
          }
        });
      }
      
    } catch (error) {
      results.push({
        category: 'A07:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Authentication test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A08: Software and Data Integrity Failures テスト
   */
  async testDataIntegrityFailures() {
    const results = [];
    
    try {
      await this.page.goto(this.baseURL);
      
      // CSP確認
      const response = await this.page.goto(this.baseURL);
      const cspHeader = response.headers()['content-security-policy'];
      
      if (!cspHeader) {
        results.push({
          category: 'A08:2021',
          vulnerability: 'Missing CSP',
          severity: 'HIGH',
          details: 'Content Security Policy header not found'
        });
      } else {
        // 危険なCSPディレクティブ確認
        if (cspHeader.includes("'unsafe-inline'") || cspHeader.includes("'unsafe-eval'")) {
          results.push({
            category: 'A08:2021',
            vulnerability: 'Weak CSP Configuration',
            severity: 'MEDIUM',
            details: 'CSP allows unsafe-inline or unsafe-eval',
            csp: cspHeader
          });
        }
      }
      
      // SRI (Subresource Integrity) 確認
      const scriptsWithoutSRI = await this.page.evaluate(() => {
        const externalScripts = Array.from(document.scripts).filter(script => 
          script.src && !script.src.startsWith(window.location.origin)
        );
        
        return externalScripts.filter(script => !script.integrity).map(script => script.src);
      });
      
      scriptsWithoutSRI.forEach(src => {
        results.push({
          category: 'A08:2021',
          vulnerability: 'Missing SRI',
          severity: 'MEDIUM',
          details: `External script without SRI: ${src}`,
          script: src
        });
      });
      
    } catch (error) {
      results.push({
        category: 'A08:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Data integrity test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A09: Security Logging and Monitoring Failures テスト
   */
  async testLoggingMonitoring() {
    const results = [];
    
    try {
      // ログイン試行ログ確認（可能な場合）
      await this.page.goto(this.baseURL);
      
      // クライアントサイドログ確認
      const clientLogging = await this.page.evaluate(() => {
        const hasConsoleLogging = typeof console.log === 'function';
        const hasErrorHandling = typeof window.onerror === 'function';
        const hasUnhandledRejection = typeof window.onunhandledrejection === 'function';
        
        return {
          consoleLogging: hasConsoleLogging,
          errorHandling: hasErrorHandling,
          unhandledRejectionHandling: hasUnhandledRejection
        };
      });
      
      if (!clientLogging.errorHandling) {
        results.push({
          category: 'A09:2021',
          vulnerability: 'No Error Monitoring',
          severity: 'MEDIUM',
          details: 'No client-side error monitoring detected'
        });
      }
      
      if (!clientLogging.unhandledRejectionHandling) {
        results.push({
          category: 'A09:2021',
          vulnerability: 'No Promise Rejection Monitoring',
          severity: 'LOW',
          details: 'No unhandled promise rejection monitoring'
        });
      }
      
    } catch (error) {
      results.push({
        category: 'A09:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Logging monitoring test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * A10: Server-Side Request Forgery (SSRF) テスト
   */
  async testSSRF() {
    const results = [];
    
    try {
      // SSRF テストペイロード
      const ssrfPayloads = [
        'http://localhost:22',
        'http://127.0.0.1:3306',
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
        'ftp://internal-server/',
        'gopher://127.0.0.1:6379'
      ];
      
      for (const payload of ssrfPayloads) {
        try {
          const response = await this.page.goto(`${this.baseURL}/api/fetch?url=${encodeURIComponent(payload)}`, {
            timeout: 5000
          });
          
          if (response && response.status() === 200) {
            const content = await response.text();
            if (content.length > 0 && !content.includes('error')) {
              results.push({
                category: 'A10:2021',
                vulnerability: 'Server-Side Request Forgery',
                severity: 'CRITICAL',
                details: `SSRF vulnerability detected with payload: ${payload}`,
                payload
              });
            }
          }
        } catch (error) {
          // Expected behavior for blocked requests
        }
      }
      
    } catch (error) {
      results.push({
        category: 'A10:2021',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `SSRF test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * 追加セキュリティテスト
   */
  async runAdditionalSecurityTests() {
    const results = [];
    
    try {
      // CORS設定確認
      const corsResult = await this.testCORSConfiguration();
      results.push(...corsResult);
      
      // Clickjacking保護確認
      const clickjackingResult = await this.testClickjackingProtection();
      results.push(...clickjackingResult);
      
      // Information Disclosure確認
      const infoDisclosureResult = await this.testInformationDisclosure();
      results.push(...infoDisclosureResult);
      
    } catch (error) {
      results.push({
        category: 'Additional',
        vulnerability: 'Test Error',
        severity: 'INFO',
        details: `Additional security test error: ${error.message}`
      });
    }
    
    return results;
  }

  /**
   * CORS設定テスト
   */
  async testCORSConfiguration() {
    const results = [];
    
    try {
      const response = await this.page.goto(this.baseURL);
      const corsHeader = response.headers()['access-control-allow-origin'];
      
      if (corsHeader === '*') {
        results.push({
          category: 'Additional',
          vulnerability: 'Permissive CORS Policy',
          severity: 'MEDIUM',
          details: 'CORS policy allows requests from any origin',
          header: corsHeader
        });
      }
      
    } catch (error) {
      // Continue with other tests
    }
    
    return results;
  }

  /**
   * Clickjacking保護テスト
   */
  async testClickjackingProtection() {
    const results = [];
    
    try {
      const response = await this.page.goto(this.baseURL);
      const frameOptions = response.headers()['x-frame-options'];
      const csp = response.headers()['content-security-policy'];
      
      if (!frameOptions && (!csp || !csp.includes('frame-ancestors'))) {
        results.push({
          category: 'Additional',
          vulnerability: 'Clickjacking Vulnerability',
          severity: 'MEDIUM',
          details: 'No clickjacking protection (X-Frame-Options or CSP frame-ancestors)'
        });
      }
      
    } catch (error) {
      // Continue with other tests
    }
    
    return results;
  }

  /**
   * Information Disclosure テスト
   */
  async testInformationDisclosure() {
    const results = [];
    
    try {
      const response = await this.page.goto(this.baseURL);
      const content = await response.text();
      
      // 機密情報パターン確認
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /api[_-]?key/i,
        /token/i,
        /config/i,
        /database/i,
        /mongodb:\/\//i,
        /mysql:\/\//i,
        /postgres:\/\//i
      ];
      
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(content)) {
          results.push({
            category: 'Additional',
            vulnerability: 'Information Disclosure',
            severity: 'LOW',
            details: `Potentially sensitive information found: ${pattern.source}`
          });
        }
      });
      
    } catch (error) {
      // Continue with other tests
    }
    
    return results;
  }

  /**
   * セキュリティレポート生成
   */
  generateSecurityReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      target: this.baseURL,
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: 0
      },
      categories: {},
      vulnerabilities: [],
      recommendations: []
    };
    
    // 結果集約
    Object.values(testResults).forEach(categoryResults => {
      if (Array.isArray(categoryResults)) {
        categoryResults.forEach(result => {
          report.vulnerabilities.push(result);
          
          switch (result.severity) {
            case 'CRITICAL':
              report.summary.critical++;
              break;
            case 'HIGH':
              report.summary.high++;
              break;
            case 'MEDIUM':
              report.summary.medium++;
              break;
            case 'LOW':
              report.summary.low++;
              break;
            case 'INFO':
              report.summary.info++;
              break;
          }
          
          report.summary.total++;
          
          if (!report.categories[result.category]) {
            report.categories[result.category] = 0;
          }
          report.categories[result.category]++;
        });
      }
    });
    
    // 推奨事項生成
    report.recommendations = this.generateRecommendations(report.vulnerabilities);
    
    return report;
  }

  /**
   * 推奨事項生成
   */
  generateRecommendations(vulnerabilities) {
    const recommendations = [];
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.vulnerability) {
        case 'Cross-Site Scripting (XSS)':
          recommendations.push('Implement proper input validation and output encoding');
          break;
        case 'SQL Injection':
          recommendations.push('Use parameterized queries and input validation');
          break;
        case 'Missing CSP':
          recommendations.push('Implement Content Security Policy headers');
          break;
        case 'Weak Password Policy':
          recommendations.push('Implement strong password requirements');
          break;
        case 'Information Disclosure':
          recommendations.push('Remove sensitive information from client-side code');
          break;
        case 'Missing Security Header':
          recommendations.push(`Add ${vuln.header} security header`);
          break;
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }
}

export default SecurityTestFramework;