// TEST-E2E-027: 入力検証セキュリティテスト（3 SP）
// Input length validation, Character encoding verification, File upload security
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-027: 入力検証セキュリティテスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 入力検証システムの初期化を待機
    await page.waitForFunction(() => {
      return window.InputValidator && 
             window.FileUploadValidator && 
             window.EncodingValidator &&
             window.SizeValidator;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('入力長制限検証テスト', async () => {
    test.setTimeout(90000);

    // 1. 基本的な長さ制限確認
    const lengthLimits = await page.evaluate(() => {
      return window.InputValidator.getLengthLimits();
    });

    expect(lengthLimits).toEqual(
      expect.objectContaining({
        actionFrom: expect.any(Number),
        actionTo: expect.any(Number),
        actionMessage: expect.any(Number),
        comment: expect.any(Number),
        plantUMLCode: expect.any(Number)
      })
    );

    // 2. 正常な長さの入力テスト
    const validLengthTest = {
      from: 'A'.repeat(Math.min(lengthLimits.actionFrom - 1, 20)),
      to: 'B'.repeat(Math.min(lengthLimits.actionTo - 1, 20)),
      message: 'Valid message'.repeat(Math.min(Math.floor(lengthLimits.actionMessage / 15), 5))
    };

    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    
    await page.fill('[data-testid="action-from-input"]', validLengthTest.from);
    await page.fill('[data-testid="action-to-input"]', validLengthTest.to);
    await page.fill('[data-testid="action-message-input"]', validLengthTest.message);
    await page.click('[data-testid="action-save-btn"]');

    // 正常に保存されることを確認
    const validSaved = await page.evaluate(() => {
      const actions = window.ActionEditor.getAllActions();
      return actions.length > 0;
    });

    expect(validSaved).toBe(true);

    // 3. 過度に長い入力のテスト（From フィールド）
    const excessivelyLongFrom = 'A'.repeat(lengthLimits.actionFrom + 100);
    
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    
    await page.fill('[data-testid="action-from-input"]', excessivelyLongFrom);
    await page.fill('[data-testid="action-to-input"]', 'Target');
    await page.fill('[data-testid="action-message-input"]', 'Test message');
    await page.click('[data-testid="action-save-btn"]');

    // 長さ制限エラーが表示されることを確認
    const lengthError = await page.waitForSelector('[data-testid="length-error"]', { 
      state: 'visible', 
      timeout: 2000 
    }).catch(() => null);

    if (lengthError) {
      const errorText = await page.textContent('[data-testid="length-error"]');
      expect(errorText).toContain('長すぎます');
    }

    // 4. 各フィールドでの長さ制限テスト
    const fieldTests = [
      { field: 'action-to-input', limit: lengthLimits.actionTo, testid: 'action-to-input' },
      { field: 'action-message-input', limit: lengthLimits.actionMessage, testid: 'action-message-input' },
      { field: 'action-comment-input', limit: lengthLimits.comment, testid: 'action-comment-input' }
    ];

    for (const fieldTest of fieldTests) {
      const excessiveInput = 'X'.repeat(fieldTest.limit + 50);
      
      await page.fill(`[data-testid="${fieldTest.testid}"]`, excessiveInput);
      
      // 入力制限が適用されていることを確認
      const actualValue = await page.inputValue(`[data-testid="${fieldTest.testid}"]`);
      expect(actualValue.length).toBeLessThanOrEqual(fieldTest.limit);
    }

    // 5. バイト数制限のテスト（日本語文字）
    const japaneseText = 'あいうえお'.repeat(100); // 日本語文字はUTF-8で3バイト
    
    await page.fill('[data-testid="action-message-input"]', japaneseText);
    
    const byteValidation = await page.evaluate((text) => {
      return window.InputValidator.validateByteLength(text, 'actionMessage');
    }, japaneseText);

    expect(byteValidation.valid).toBeDefined();
    if (!byteValidation.valid) {
      expect(byteValidation.reason).toContain('byte');
    }

    // 6. PlantUMLコード長制限テスト
    const largePlantUMLCode = `@startuml
    ${Array.from({ length: 1000 }, (_, i) => `participant Actor${i}`).join('\n')}
    ${Array.from({ length: 1000 }, (_, i) => `Actor${i} -> Actor${(i + 1) % 1000}: Message ${i}`).join('\n')}
    @enduml`;

    const plantUMLLengthValidation = await page.evaluate((code) => {
      return window.InputValidator.validatePlantUMLLength(code);
    }, largePlantUMLCode);

    if (largePlantUMLCode.length > lengthLimits.plantUMLCode) {
      expect(plantUMLLengthValidation.valid).toBe(false);
      expect(plantUMLLengthValidation.reason).toContain('size limit');
    }

    // モーダルを閉じる
    await page.click('[data-testid="action-editor-close"]');
  });

  test('文字エンコーディング検証テスト', async () => {
    test.setTimeout(90000);

    // 1. 有効な文字エンコーディングのテスト
    const validEncodingTests = [
      { text: 'English text', encoding: 'ASCII' },
      { text: 'こんにちは世界', encoding: 'UTF-8' },
      { text: 'Café résumé naïve', encoding: 'UTF-8' },
      { text: '中文测试', encoding: 'UTF-8' },
      { text: '한국어 테스트', encoding: 'UTF-8' },
      { text: 'العربية', encoding: 'UTF-8' },
      { text: 'русский текст', encoding: 'UTF-8' }
    ];

    for (const test of validEncodingTests) {
      const encodingResult = await page.evaluate((text) => {
        return window.EncodingValidator.validateEncoding(text);
      }, test.text);

      expect(encodingResult.valid).toBe(true);
      expect(encodingResult.encoding).toBeDefined();
    }

    // 2. 不正な文字エンコーディングのテスト
    const invalidEncodingTests = [
      '\uFEFF\uFFF0\uFFF1', // 制御文字
      '\u0000\u0001\u0002', // Null文字
      '\uDC00\uDFFF', // サロゲートペア（不正）
      String.fromCharCode(0xD800), // 不正なサロゲート
      String.fromCharCode(0xDFFF), // 不正なサロゲート
    ];

    for (const invalidText of invalidEncodingTests) {
      const invalidEncodingResult = await page.evaluate((text) => {
        return window.EncodingValidator.validateEncoding(text);
      }, invalidText);

      expect(invalidEncodingResult.valid).toBe(false);
      expect(invalidEncodingResult.reason).toBeDefined();
    }

    // 3. 文字正規化のテスト
    const normalizationTests = [
      { input: 'café', normalized: 'café' }, // NFC正規化
      { input: 'が', normalized: 'が' }, // 濁点の正規化
      { input: '①②③', normalized: '①②③' }, // 丸囲み数字
    ];

    for (const normTest of normalizationTests) {
      const normalizedResult = await page.evaluate((text) => {
        return window.EncodingValidator.normalizeText(text);
      }, normTest.input);

      expect(normalizedResult).toBeDefined();
    }

    // 4. 危険な Unicode 文字の検出
    const dangerousUnicodeTests = [
      '\u202E', // Right-to-Left Override
      '\u200E', // Left-to-Right Mark
      '\u200F', // Right-to-Left Mark
      '\u061C', // Arabic Letter Mark
      '\u2066', // Left-to-Right Isolate
      '\u2067', // Right-to-Left Isolate
      '\u2068', // First Strong Isolate
      '\u2069', // Pop Directional Isolate
    ];

    for (const dangerousChar of dangerousUnicodeTests) {
      const dangerousResult = await page.evaluate((char) => {
        return window.EncodingValidator.detectDangerousCharacters(`test${char}text`);
      }, dangerousChar);

      expect(dangerousResult.hasDangerous).toBe(true);
      expect(dangerousResult.dangerousChars.length).toBeGreaterThan(0);
    }

    // 5. エンコーディング変換攻撃の防御
    const encodingAttackTests = [
      'test\uFEFFscript', // BOM injection
      'test\u200Bscript', // Zero-width space
      'test\u00A0script', // Non-breaking space
      'test\u2000script', // En quad
    ];

    for (const attackText of encodingAttackTests) {
      const attackResult = await page.evaluate((text) => {
        return window.EncodingValidator.detectEncodingAttack(text);
      }, attackText);

      if (attackResult.isAttack) {
        expect(attackResult.attackType).toBeDefined();
      }
    }

    // 6. 入力フィールドでの実際のエンコーディング検証
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');

    // 日本語入力テスト
    await page.fill('[data-testid="action-from-input"]', 'ユーザー');
    await page.fill('[data-testid="action-to-input"]', 'システム');
    await page.fill('[data-testid="action-message-input"]', 'こんにちは、これは日本語のテストメッセージです。');

    // エンコーディングが正しく処理されることを確認
    const inputValues = await page.evaluate(() => {
      return {
        from: document.querySelector('[data-testid="action-from-input"]').value,
        to: document.querySelector('[data-testid="action-to-input"]').value,
        message: document.querySelector('[data-testid="action-message-input"]').value
      };
    });

    expect(inputValues.from).toBe('ユーザー');
    expect(inputValues.to).toBe('システム');
    expect(inputValues.message).toBe('こんにちは、これは日本語のテストメッセージです。');

    await page.click('[data-testid="action-editor-close"]');
  });

  test('ファイルアップロードセキュリティテスト', async () => {
    test.setTimeout(90000);

    // 1. 許可されたファイル形式のテスト
    const allowedFileTypes = [
      { name: 'diagram.puml', content: '@startuml\nA -> B\n@enduml', mimeType: 'text/plain' },
      { name: 'image.png', content: 'PNG_HEADER_DATA', mimeType: 'image/png' },
      { name: 'document.txt', content: 'Plain text content', mimeType: 'text/plain' },
      { name: 'config.json', content: '{"config": "value"}', mimeType: 'application/json' }
    ];

    for (const file of allowedFileTypes) {
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: file.name,
        mimeType: file.mimeType,
        buffer: Buffer.from(file.content)
      });

      const uploadResult = await page.evaluate(() => {
        return window.FileUploadValidator.getLastUploadResult();
      });

      expect(uploadResult.allowed).toBe(true);
    }

    // 2. 危険なファイル形式の検出
    const dangerousFileTypes = [
      { name: 'malware.exe', content: 'MZ\x90\x00', mimeType: 'application/octet-stream' },
      { name: 'script.js', content: 'alert("XSS")', mimeType: 'application/javascript' },
      { name: 'page.html', content: '<script>alert("XSS")</script>', mimeType: 'text/html' },
      { name: 'macro.xlsm', content: 'PK\x03\x04', mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12' },
      { name: 'virus.bat', content: '@echo off\nformat c:', mimeType: 'application/x-msdos-program' }
    ];

    for (const file of dangerousFileTypes) {
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: file.name,
        mimeType: file.mimeType,
        buffer: Buffer.from(file.content)
      });

      const uploadResult = await page.evaluate(() => {
        return window.FileUploadValidator.getLastUploadResult();
      });

      expect(uploadResult.blocked).toBe(true);
      expect(uploadResult.reason).toContain('dangerous_file_type');
    }

    // 3. ファイルサイズ制限テスト
    const fileSizeLimits = await page.evaluate(() => {
      return window.FileUploadValidator.getSizeLimits();
    });

    // 制限内のファイル
    const validSizeFile = 'A'.repeat(Math.min(fileSizeLimits.maxFileSize - 1000, 1000000));
    
    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'valid_size.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(validSizeFile)
    });

    const validSizeResult = await page.evaluate(() => {
      return window.FileUploadValidator.getLastUploadResult();
    });

    expect(validSizeResult.allowed).toBe(true);

    // 制限を超えるファイル
    const oversizeFile = 'B'.repeat(fileSizeLimits.maxFileSize + 1000);
    
    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'oversize.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(oversizeFile)
    });

    const oversizeResult = await page.evaluate(() => {
      return window.FileUploadValidator.getLastUploadResult();
    });

    expect(oversizeResult.blocked).toBe(true);
    expect(oversizeResult.reason).toContain('file_too_large');

    // 4. ファイル内容の検証
    const maliciousContents = [
      { name: 'fake_image.jpg', content: '<script>alert("XSS")</script>', mimeType: 'image/jpeg' },
      { name: 'embedded_script.svg', content: '<svg><script>alert("XSS")</script></svg>', mimeType: 'image/svg+xml' },
      { name: 'polyglot.gif', content: 'GIF89a<script>alert("XSS")</script>', mimeType: 'image/gif' },
      { name: 'zip_bomb.zip', content: 'PK\x03\x04' + '0'.repeat(1000000), mimeType: 'application/zip' }
    ];

    for (const maliciousFile of maliciousContents) {
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: maliciousFile.name,
        mimeType: maliciousFile.mimeType,
        buffer: Buffer.from(maliciousFile.content)
      });

      const contentValidationResult = await page.evaluate(() => {
        return window.FileUploadValidator.getLastUploadResult();
      });

      expect(contentValidationResult.blocked).toBe(true);
      expect(contentValidationResult.reason).toMatch(/malicious_content|script_detected|content_mismatch/);
    }

    // 5. ファイル名のセキュリティ検証
    const maliciousFileNames = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\hosts',
      'file<script>alert("XSS")</script>.txt',
      'file"with"quotes.txt',
      'file|with|pipes.txt',
      'ファイル名.txt', // 日本語ファイル名
      'file with spaces.txt',
      'file%00.txt', // Null byte injection
      'con.txt', // Windows reserved name
      'prn.txt', // Windows reserved name
      'file.txt.exe' // Double extension
    ];

    for (const fileName of maliciousFileNames) {
      const fileNameValidation = await page.evaluate((name) => {
        return window.FileUploadValidator.validateFileName(name);
      }, fileName);

      if (fileName.includes('<script>') || fileName.includes('../') || fileName.includes('%00')) {
        expect(fileNameValidation.valid).toBe(false);
        expect(fileNameValidation.reason).toBeDefined();
      }
    }

    // 6. MIME タイプの偽装検出
    const mimeTypeSpoofingTests = [
      { name: 'script.txt', content: '#!/bin/bash\necho "malicious"', declaredMime: 'text/plain', actualMime: 'application/x-shellscript' },
      { name: 'image.jpg', content: '<html><script>alert("XSS")</script></html>', declaredMime: 'image/jpeg', actualMime: 'text/html' },
      { name: 'document.pdf', content: '%PDF-fake', declaredMime: 'application/pdf', actualMime: 'text/plain' }
    ];

    for (const spoofTest of mimeTypeSpoofingTests) {
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: spoofTest.name,
        mimeType: spoofTest.declaredMime,
        buffer: Buffer.from(spoofTest.content)
      });

      const spoofingResult = await page.evaluate(() => {
        return window.FileUploadValidator.getLastUploadResult();
      });

      expect(spoofingResult.mimeTypeMismatch).toBe(true);
      expect(spoofingResult.blocked).toBe(true);
    }

    // 7. ウイルススキャン（シミュレート）
    const virusSignatures = [
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', // EICAR test string
      'malicious_pattern_123',
      'virus_signature_abc'
    ];

    for (const signature of virusSignatures) {
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: 'suspicious.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(signature)
      });

      const virusScanResult = await page.evaluate(() => {
        return window.FileUploadValidator.getLastUploadResult();
      });

      if (signature.includes('EICAR') || signature.includes('malicious') || signature.includes('virus')) {
        expect(virusScanResult.blocked).toBe(true);
        expect(virusScanResult.reason).toContain('virus_detected');
      }
    }
  });

  test('入力サニタイゼーション徹底テスト', async () => {
    test.setTimeout(90000);

    // 1. 基本的なサニタイゼーション
    const basicSanitizationTests = [
      { input: '<script>alert("XSS")</script>', context: 'html' },
      { input: 'javascript:alert("XSS")', context: 'url' },
      { input: 'onload="alert(\'XSS\')"', context: 'attribute' },
      { input: '${alert("XSS")}', context: 'template' },
      { input: 'SELECT * FROM users; DROP TABLE users;', context: 'sql' }
    ];

    for (const test of basicSanitizationTests) {
      const sanitized = await page.evaluate((input, context) => {
        return window.InputValidator.sanitize(input, context);
      }, test.input, test.context);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onload=');
      expect(sanitized).not.toContain('DROP TABLE');
    }

    // 2. 深層サニタイゼーション（入れ子攻撃）
    const nestedAttacks = [
      '<scr<script>ipt>alert("XSS")</script>',
      '<img src="x" onerror="alert(String.fromCharCode(88,83,83))">',
      'javas&Tab;cript:alert("XSS")',
      '<iframe src="java&#x09;script:alert(\'XSS\')"></iframe>'
    ];

    for (const attack of nestedAttacks) {
      const deepSanitized = await page.evaluate((input) => {
        return window.InputValidator.deepSanitize(input);
      }, attack);

      expect(deepSanitized).not.toContain('<script>');
      expect(deepSanitized).not.toContain('javascript:');
      expect(deepSanitized).not.toContain('onerror=');
    }

    // 3. コンテキスト別サニタイゼーション
    const contextualTests = [
      { 
        input: 'User "Admin" & password: <secret>',
        contexts: {
          html: '&lt;secret&gt;',
          json: '\\"Admin\\" \\u0026',
          csv: '"User ""Admin"" & password: <secret>"',
          xml: '&lt;secret&gt;'
        }
      }
    ];

    for (const test of contextualTests) {
      for (const [context, expected] of Object.entries(test.contexts)) {
        const contextSanitized = await page.evaluate((input, ctx) => {
          return window.InputValidator.sanitizeForContext(input, ctx);
        }, test.input, context);

        if (expected.includes('&lt;')) {
          expect(contextSanitized).toContain('&lt;');
          expect(contextSanitized).toContain('&gt;');
        }
      }
    }

    // 4. 日本語文字のサニタイゼーション
    const japaneseSanitizationTests = [
      '＜script＞alert("全角XSS")＜/script＞',
      'ｊａｖａｓｃｒｉｐｔ：alert("全角JavaScript")',
      '"><script>alert("日本語混在XSS")</script>',
      'これは正常な日本語テキストです。'
    ];

    for (const japaneseTest of japaneseSanitizationTests) {
      const japaneseSanitized = await page.evaluate((input) => {
        return window.InputValidator.sanitizeJapanese(input);
      }, japaneseTest);

      if (japaneseTest.includes('script') || japaneseTest.includes('javascript')) {
        expect(japaneseSanitized).not.toContain('script');
        expect(japaneseSanitized).not.toContain('javascript');
      } else {
        expect(japaneseSanitized).toContain('正常な日本語');
      }
    }

    // 5. 実際の入力フィールドでのサニタイゼーション確認
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');

    const maliciousInputs = [
      '<script>alert("From field XSS")</script>',
      'javascript:alert("To field XSS")',
      '"><img src=x onerror=alert("Message XSS")>'
    ];

    await page.fill('[data-testid="action-from-input"]', maliciousInputs[0]);
    await page.fill('[data-testid="action-to-input"]', maliciousInputs[1]);
    await page.fill('[data-testid="action-message-input"]', maliciousInputs[2]);

    // サニタイゼーション後の値を確認
    const sanitizedValues = await page.evaluate(() => {
      return {
        from: window.InputValidator.getLastSanitizedValue('from'),
        to: window.InputValidator.getLastSanitizedValue('to'),
        message: window.InputValidator.getLastSanitizedValue('message')
      };
    });

    expect(sanitizedValues.from).not.toContain('<script>');
    expect(sanitizedValues.to).not.toContain('javascript:');
    expect(sanitizedValues.message).not.toContain('onerror=');

    await page.click('[data-testid="action-editor-close"]');
  });

  test('MIME型検証とコンテンツ分析テスト', async () => {
    test.setTimeout(60000);

    // 1. 正当なMIME型の検証
    const validMimeTypes = [
      'text/plain',
      'text/x-plantuml',
      'application/json',
      'image/png',
      'image/jpeg',
      'image/svg+xml'
    ];

    for (const mimeType of validMimeTypes) {
      const mimeValidation = await page.evaluate((mime) => {
        return window.FileUploadValidator.validateMimeType(mime);
      }, mimeType);

      expect(mimeValidation.allowed).toBe(true);
    }

    // 2. 禁止されたMIME型の検出
    const forbiddenMimeTypes = [
      'application/x-executable',
      'application/x-msdos-program',
      'application/x-msdownload',
      'application/x-shockwave-flash',
      'text/html',
      'application/javascript',
      'text/javascript'
    ];

    for (const mimeType of forbiddenMimeTypes) {
      const mimeValidation = await page.evaluate((mime) => {
        return window.FileUploadValidator.validateMimeType(mime);
      }, mimeType);

      expect(mimeValidation.allowed).toBe(false);
      expect(mimeValidation.reason).toContain('forbidden_mime_type');
    }

    // 3. ファイルヘッダーとMIME型の一致確認
    const headerMismatchTests = [
      { 
        fileName: 'fake_image.jpg',
        declaredMime: 'image/jpeg',
        actualContent: '<html><body>Not an image</body></html>',
        expectedMime: 'text/html'
      },
      {
        fileName: 'fake_pdf.pdf',
        declaredMime: 'application/pdf',
        actualContent: 'This is plain text',
        expectedMime: 'text/plain'
      }
    ];

    for (const test of headerMismatchTests) {
      const headerValidation = await page.evaluate((content, declaredMime) => {
        return window.FileUploadValidator.validateFileHeader(content, declaredMime);
      }, test.actualContent, test.declaredMime);

      expect(headerValidation.mismatch).toBe(true);
      expect(headerValidation.actualMime).toBeDefined();
    }

    // 4. 悪意のあるコンテンツパターンの検出
    const maliciousPatterns = [
      { pattern: 'eval(', description: 'JavaScript eval function' },
      { pattern: 'document.write', description: 'DOM manipulation' },
      { pattern: 'window.location', description: 'Redirect attempt' },
      { pattern: 'XMLHttpRequest', description: 'AJAX request' },
      { pattern: 'fetch(', description: 'Fetch API usage' },
      { pattern: '<?php', description: 'PHP code' },
      { pattern: '<%', description: 'Server-side script tag' }
    ];

    for (const pattern of maliciousPatterns) {
      const patternDetection = await page.evaluate((content) => {
        return window.FileUploadValidator.detectMaliciousPattern(content);
      }, `Test content with ${pattern.pattern} embedded`);

      expect(patternDetection.detected).toBe(true);
      expect(patternDetection.patterns.length).toBeGreaterThan(0);
    }

    // 5. 圧縮ファイルの内容検証
    const archiveValidation = await page.evaluate(() => {
      // ZIP ファイルのシミュレートされた内容
      const simulatedZipContent = {
        files: [
          { name: 'safe.txt', content: 'Safe text content' },
          { name: 'malicious.js', content: 'alert("XSS from ZIP")' },
          { name: '../../../etc/passwd', content: 'Path traversal attempt' }
        ]
      };
      
      return window.FileUploadValidator.validateArchiveContent(simulatedZipContent);
    });

    expect(archiveValidation.blocked).toBe(true);
    expect(archiveValidation.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('malicious_file'),
        expect.stringContaining('path_traversal')
      ])
    );
  });

  test('包括的入力検証監査テスト', async () => {
    test.setTimeout(60000);

    // 1. 入力検証設定の確認
    const validationConfig = await page.evaluate(() => {
      return window.InputValidator.getConfiguration();
    });

    expect(validationConfig).toEqual(
      expect.objectContaining({
        maxLengths: expect.any(Object),
        allowedCharsets: expect.any(Array),
        sanitizationEnabled: true,
        strictMode: expect.any(Boolean)
      })
    );

    // 2. 検証ルールの網羅性確認
    const validationRules = await page.evaluate(() => {
      return window.InputValidator.getAllValidationRules();
    });

    const requiredRules = [
      'length_validation',
      'encoding_validation',
      'xss_prevention',
      'sql_injection_prevention',
      'file_type_validation',
      'mime_type_validation',
      'content_analysis'
    ];

    requiredRules.forEach(rule => {
      expect(validationRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: rule, enabled: true })
        ])
      );
    });

    // 3. 検証性能のベンチマーク
    const performanceTest = await page.evaluate(async () => {
      const testData = 'A'.repeat(10000); // 10KB のテストデータ
      const iterations = 100;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        window.InputValidator.validate(testData, 'html');
      }
      
      const endTime = performance.now();
      return (endTime - startTime) / iterations; // 平均処理時間
    });

    // 1回の検証が10ms以下で完了することを確認
    expect(performanceTest).toBeLessThan(10);

    // 4. エラーハンドリングの確認
    const errorHandlingTest = await page.evaluate(() => {
      try {
        // 意図的に不正なパラメータで検証を実行
        window.InputValidator.validate(null, 'invalid_context');
        return { error: false };
      } catch (error) {
        return { 
          error: true, 
          message: error.message,
          handled: true 
        };
      }
    });

    expect(errorHandlingTest.error).toBe(true);
    expect(errorHandlingTest.handled).toBe(true);

    // 5. セキュリティ違反の統計
    const securityStats = await page.evaluate(() => {
      return window.InputValidator.getSecurityStatistics();
    });

    expect(securityStats).toEqual(
      expect.objectContaining({
        totalValidations: expect.any(Number),
        blockedInputs: expect.any(Number),
        xssAttempts: expect.any(Number),
        sqlInjectionAttempts: expect.any(Number),
        fileUploadViolations: expect.any(Number)
      })
    );

    // 6. 検証レポートの生成
    const validationReport = await page.evaluate(() => {
      return window.InputValidator.generateSecurityReport();
    });

    expect(validationReport).toEqual(
      expect.objectContaining({
        overallSecurity: expect.any(String),
        validationCoverage: expect.any(Number),
        recommendations: expect.any(Array),
        riskAssessment: expect.any(Object)
      })
    );

    // セキュリティカバレッジが90%以上であることを確認
    expect(validationReport.validationCoverage).toBeGreaterThan(90);
  });
});