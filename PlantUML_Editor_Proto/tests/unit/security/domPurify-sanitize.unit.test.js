/**
 * DOMPurifyサニタイズ機能 単体テスト
 * Sprint 1 - セキュリティ機能テスト
 * 
 * テスト対象: DOMPurifyによるXSS攻撃防御機能
 * 実行時間目標: < 5秒 (CLAUDE.md基準)
 * 
 * 作成日: 2025-08-15
 * 作成者: webapp-test-automation
 */

import { mockDOMPurify, threatPatterns, securityTestRunner } from '@tests/helpers/security-helpers.js';

describe('DOMPurifyサニタイズ機能テスト', () => {
  // テスト前の初期化
  beforeEach(() => {
    createTestDOM();
  });

  // テスト後のクリーンアップ  
  afterEach(() => {
    cleanupTestDOM();
  });

  describe('基本的なXSS攻撃防御', () => {
    test('スクリプトタグを適切に除去する', async () => {
      // Arrange
      const maliciousInput = '<script>alert("XSS")</script>普通のテキスト';
      const expectedOutput = '普通のテキスト';

      // Act
      const result = await measurePerformance('script-tag-sanitization', () => {
        return mockDOMPurify.sanitize(maliciousInput);
      });

      // Assert
      expect(result).toBe(expectedOutput);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toBeSanitized(maliciousInput);
    });

    test('インラインイベントハンドラーを除去する', async () => {
      // Arrange
      const maliciousInput = '<img src="test.jpg" onerror="alert(\'XSS\')">';
      
      // Act
      const result = mockDOMPurify.sanitize(maliciousInput);
      
      // Assert
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('alert');
      expect(result).toBeSanitized(maliciousInput);
    });

    test('JavaScriptプロトコルを除去する', async () => {
      // Arrange
      const maliciousInput = '<a href="javascript:alert(\'XSS\')">リンク</a>';
      
      // Act
      const result = mockDOMPurify.sanitize(maliciousInput);
      
      // Assert
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
      expect(result).toComplyWithCSP();
    });

    test('SVGベースのXSS攻撃を防御する', async () => {
      // Arrange
      const maliciousInput = '<svg onload="alert(\'XSS\')"><circle cx="50" cy="50" r="40"/></svg>';
      
      // Act
      const result = mockDOMPurify.sanitize(maliciousInput);
      
      // Assert
      expect(result).not.toContain('onload=');
      expect(result).not.toContain('alert');
      expect(result).toBeSanitized(maliciousInput);
    });
  });

  describe('高度なXSS攻撃パターン', () => {
    test('難読化されたXSSを検出・除去する', async () => {
      // Arrange
      const obfuscatedXSS = '<img src=x oneRRor="&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">';
      
      // Act
      const result = mockDOMPurify.sanitize(obfuscatedXSS);
      
      // Assert
      expect(result).not.toContain('oneRRor=');
      expect(result).not.toContain('&#97;'); // 'a' のHTMLエンティティ
      expect(result).toBeSanitized(obfuscatedXSS);
    });

    test('Base64エンコードされた悪意あるコードを防御する', async () => {
      // Arrange - Base64: alert('XSS')
      const base64XSS = '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4="></object>';
      
      // Act
      const result = mockDOMPurify.sanitize(base64XSS);
      
      // Assert
      expect(result).not.toContain('<object');
      expect(result).not.toContain('data:text/html');
      expect(result).toBeSanitized(base64XSS);
    });

    test('iframeベースの攻撃を防御する', async () => {
      // Arrange
      const iframeXSS = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      
      // Act
      const result = mockDOMPurify.sanitize(iframeXSS);
      
      // Assert
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('javascript:');
      expect(result).toBeSanitized(iframeXSS);
    });
  });

  describe('日本語コンテンツ処理', () => {
    test('日本語テキストを適切に保持する', async () => {
      // Arrange
      const japaneseContent = 'ユーザーがシステムにログインする処理';
      
      // Act
      const result = mockDOMPurify.sanitize(japaneseContent);
      
      // Assert
      expect(result).toBe(japaneseContent);
      expect(result).toContain('ユーザー');
      expect(result).toContain('システム');
      expect(result).toContain('ログイン');
    });

    test('日本語と悪意あるコードの混在を適切に処理する', async () => {
      // Arrange
      const mixedContent = 'ユーザー<script>alert("XSS")</script>がログインします';
      const expectedContent = 'ユーザーがログインします';
      
      // Act
      const result = mockDOMPurify.sanitize(mixedContent);
      
      // Assert
      expect(result).toBe(expectedContent);
      expect(result).not.toContain('<script>');
      expect(result).toContain('ユーザー');
      expect(result).toContain('ログイン');
    });

    test('PlantUML記法を含む日本語テキストを適切に処理する', async () => {
      // Arrange
      const plantUMLContent = 'A -> B: ユーザーがログイン要求を送信\n<script>alert("XSS")</script>';
      
      // Act
      const result = mockDOMPurify.sanitize(plantUMLContent);
      
      // Assert
      expect(result).toContain('A -> B:');
      expect(result).toContain('ユーザーがログイン要求を送信');
      expect(result).not.toContain('<script>');
      expect(result).toBeSanitized(plantUMLContent);
    });
  });

  describe('設定オプション対応', () => {
    test('許可タグリストを尊重する', async () => {
      // Arrange
      const htmlContent = '<p>段落</p><script>alert("XSS")</script><div>ブロック</div>';
      const options = {
        ALLOWED_TAGS: ['p', 'div']
      };
      
      // Act
      const result = mockDOMPurify.sanitize(htmlContent, options);
      
      // Assert
      expect(result).toContain('<p>');
      expect(result).toContain('<div>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('段落');
      expect(result).toContain('ブロック');
    });

    test('HTML完全除去オプションが機能する', async () => {
      // Arrange
      const htmlContent = '<p>段落テキスト</p><strong>太字</strong>';
      const options = {
        STRIP_HTML: true
      };
      
      // Act
      const result = mockDOMPurify.sanitize(htmlContent, options);
      
      // Assert
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('段落テキスト');
      expect(result).toContain('太字');
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のコンテンツを5秒以内で処理する', async () => {
      // Arrange
      const largeContent = Array(1000).fill(
        'ユーザー<script>alert("XSS")</script>がシステムにログインします。'
      ).join('\n');
      
      // Act & Assert - measurePerformance が5秒チェックを内包
      const result = await measurePerformance('large-content-sanitization', () => {
        return mockDOMPurify.sanitize(largeContent);
      });
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('ユーザー');
      expect(result.split('\n')).toHaveLength(1000);
    });

    test('複雑なXSSパターンを効率的に処理する', async () => {
      // Arrange
      const complexContent = threatPatterns.xss.basic
        .concat(threatPatterns.xss.advanced)
        .concat(threatPatterns.xss.obfuscated)
        .join('\n');
      
      // Act & Assert
      const result = await measurePerformance('complex-xss-sanitization', () => {
        return mockDOMPurify.sanitize(complexContent);
      });
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('javascript:');
    });
  });

  describe('エラーハンドリング', () => {
    test('null入力を適切に処理する', () => {
      // Act
      const result = mockDOMPurify.sanitize(null);
      
      // Assert
      expect(result).toBe('');
    });

    test('undefined入力を適切に処理する', () => {
      // Act
      const result = mockDOMPurify.sanitize(undefined);
      
      // Assert
      expect(result).toBe('');
    });

    test('非文字列入力を適切に処理する', () => {
      // Arrange
      const numberInput = 12345;
      
      // Act
      const result = mockDOMPurify.sanitize(numberInput);
      
      // Assert
      expect(result).toBe('');
    });

    test('空文字列を適切に処理する', () => {
      // Act
      const result = mockDOMPurify.sanitize('');
      
      // Assert
      expect(result).toBe('');
    });
  });

  describe('統合セキュリティテスト', () => {
    test('包括的なセキュリティ検証を実行する', async () => {
      // Arrange
      const testElement = createTestDOM();
      const cspHeader = "default-src 'self'; script-src 'self' 'unsafe-hashes'";
      
      // Act
      const results = await measurePerformance('comprehensive-security-test', () => {
        return securityTestRunner.runComprehensiveSecurityTest(
          mockDOMPurify.sanitize,
          cspHeader,
          testElement
        );
      });
      
      // Assert
      expect(results).toHaveProperty('xss');
      expect(results).toHaveProperty('csp');
      expect(results).toHaveProperty('summary');
      expect(results.summary.passRate).toBeGreaterThan(80); // 80%以上の成功率
      expect(results.summary.securityRating).toMatch(/^(EXCELLENT|GOOD|ACCEPTABLE)$/);
    });
  });
});

describe('DOMPurifyテストヘルパー検証', () => {
  test('isCleanメソッドが正しく動作する', () => {
    // Arrange
    const cleanContent = 'これは安全なコンテンツです';
    const maliciousContent = '<script>alert("XSS")</script>';
    
    // Act & Assert
    expect(mockDOMPurify.isClean(cleanContent)).toBe(true);
    expect(mockDOMPurify.isClean(maliciousContent)).toBe(false);
  });

  test('フック機能が正しく動作する', () => {
    // Arrange
    const hookCallback = jest.fn();
    
    // Act
    mockDOMPurify.addHook('beforeSanitizeElements', hookCallback);
    
    // Assert
    expect(mockDOMPurify.hooks).toHaveProperty('beforeSanitizeElements');
    expect(mockDOMPurify.hooks.beforeSanitizeElements).toContain(hookCallback);
  });
});