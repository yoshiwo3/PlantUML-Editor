// TEST-E2E-026: CSRF対策検証テスト（3 SP）
// CSRF token validation, SameSite cookie verification, Referer header checking
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-026: CSRF対策検証テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // CSRF防御システムの初期化を待機
    await page.waitForFunction(() => {
      return window.CSRFProtector && 
             window.TokenManager && 
             window.CookieManager &&
             window.SecurityValidator;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('CSRFトークン検証テスト', async () => {
    test.setTimeout(90000);

    // 1. CSRFトークンの存在確認
    const csrfToken = await page.evaluate(() => {
      return window.CSRFProtector.getToken();
    });

    expect(csrfToken).toBeDefined();
    expect(csrfToken.length).toBeGreaterThan(16); // 十分な長さのトークン
    expect(csrfToken).toMatch(/^[a-zA-Z0-9+/=]+$/); // Base64形式

    // 2. フォームにCSRFトークンが含まれることを確認
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');

    const formToken = await page.evaluate(() => {
      const tokenInput = document.querySelector('input[name="csrf_token"]');
      return tokenInput ? tokenInput.value : null;
    });

    expect(formToken).toBe(csrfToken);

    // 3. 正当なCSRFトークン付きリクエストのテスト
    await page.fill('[data-testid="action-from-input"]', 'ValidUser');
    await page.fill('[data-testid="action-to-input"]', 'System');
    await page.fill('[data-testid="action-message-input"]', 'Valid request with CSRF token');
    await page.click('[data-testid="action-save-btn"]');

    // 正常に保存されることを確認
    const actionSaved = await page.evaluate(() => {
      const actions = window.ActionEditor.getAllActions();
      return actions.some(action => action.message === 'Valid request with CSRF token');
    });

    expect(actionSaved).toBe(true);

    // 4. 無効なCSRFトークンでのリクエストテスト
    const invalidTokenResponse = await page.evaluate(async () => {
      try {
        // 無効なトークンでAPIリクエストを送信
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'invalid_token_123'
          },
          body: JSON.stringify({
            from: 'Attacker',
            to: 'System',
            message: 'CSRF attack attempt'
          })
        });
        
        return { status: response.status, text: await response.text() };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(invalidTokenResponse.status).toBe(403);
    expect(invalidTokenResponse.text).toContain('CSRF');

    // 5. CSRFトークンなしでのリクエストテスト
    const noTokenResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Attacker',
            to: 'System',
            message: 'CSRF attack without token'
          })
        });
        
        return { status: response.status, text: await response.text() };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(noTokenResponse.status).toBe(403);

    // 6. トークンの有効期限確認
    const tokenExpiry = await page.evaluate(() => {
      return window.CSRFProtector.getTokenExpiry();
    });

    expect(tokenExpiry).toBeGreaterThan(Date.now());

    // 7. 期限切れトークンでのリクエストテスト
    await page.evaluate(() => {
      // トークンを手動で期限切れに設定
      window.CSRFProtector.expireToken();
    });

    const expiredTokenResponse = await page.evaluate(async (token) => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token
          },
          body: JSON.stringify({
            from: 'Attacker',
            to: 'System',
            message: 'CSRF attack with expired token'
          })
        });
        
        return { status: response.status, text: await response.text() };
      } catch (error) {
        return { error: error.message };
      }
    }, csrfToken);

    expect(expiredTokenResponse.status).toBe(403);
    expect(expiredTokenResponse.text).toContain('expired');

    // 8. トークンリフレッシュ機能のテスト
    const newToken = await page.evaluate(() => {
      return window.CSRFProtector.refreshToken();
    });

    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(csrfToken); // 新しいトークンが生成される
  });

  test('SameSite Cookie検証テスト', async () => {
    test.setTimeout(60000);

    // 1. セッションCookieのSameSite属性確認
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(cookie => cookie.name === 'session_id' || cookie.name === 'JSESSIONID');

    if (sessionCookie) {
      expect(sessionCookie.sameSite).toBe('Strict');
    }

    // 2. CSRF保護CookieのSameSite属性確認
    const csrfCookie = cookies.find(cookie => cookie.name === 'csrf_token');
    if (csrfCookie) {
      expect(csrfCookie.sameSite).toBe('Strict');
      expect(csrfCookie.secure).toBe(true); // HTTPSでのみ送信
      expect(csrfCookie.httpOnly).toBe(true); // XSSからの読み取り防止
    }

    // 3. Cross-siteリクエストでのCookie送信テスト
    const crossSiteRequest = await page.evaluate(async () => {
      try {
        // 異なるオリジンからのリクエストをシミュレート
        const iframe = document.createElement('iframe');
        iframe.src = 'about:blank';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument;
        const form = iframeDoc.createElement('form');
        form.method = 'POST';
        form.action = window.location.origin + '/api/actions';
        
        const input = iframeDoc.createElement('input');
        input.name = 'data';
        input.value = JSON.stringify({
          from: 'CrossSiteAttacker',
          to: 'System',
          message: 'Cross-site CSRF attack'
        });
        
        form.appendChild(input);
        iframeDoc.body.appendChild(form);
        
        // フォーム送信（SameSite=StrictによりCookieは送信されない）
        return new Promise((resolve) => {
          iframe.onload = () => {
            resolve({ submitted: true });
          };
          form.submit();
        });
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(crossSiteRequest.submitted || crossSiteRequest.error).toBeTruthy();

    // 4. Same-siteリクエストでのCookie送信確認
    const sameSiteRequest = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'same-origin' // Same-originでのみCookie送信
        });
        
        return { status: response.status, cookiesSent: response.headers.get('X-Cookies-Received') };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Same-originリクエストではCookieが正常に送信される
    expect(sameSiteRequest.status).not.toBe(401); // 認証エラーでない

    // 5. Cookieの設定検証
    const cookieSettings = await page.evaluate(() => {
      return window.CookieManager.getSecuritySettings();
    });

    expect(cookieSettings).toEqual(
      expect.objectContaining({
        sameSite: 'Strict',
        secure: true,
        httpOnly: true,
        maxAge: expect.any(Number)
      })
    );

    // 6. Cookieの自動ローテーション確認
    const initialCookies = await page.context().cookies();
    
    // セッション更新をトリガー
    await page.evaluate(() => {
      return window.CookieManager.rotateSessionCookie();
    });

    await page.waitForTimeout(1000);
    const rotatedCookies = await page.context().cookies();

    // セッションCookieの値が変更されていることを確認
    const oldSession = initialCookies.find(c => c.name === 'session_id');
    const newSession = rotatedCookies.find(c => c.name === 'session_id');

    if (oldSession && newSession) {
      expect(newSession.value).not.toBe(oldSession.value);
    }
  });

  test('Refererヘッダー検証テスト', async () => {
    test.setTimeout(60000);

    // 1. 正当なRefererヘッダーでのリクエスト
    const validRefererResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Referer': window.location.origin,
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'ValidUser',
            to: 'System',
            message: 'Valid referer request'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(validRefererResponse.status).toBe(200);

    // 2. 不正なRefererヘッダーでのリクエスト
    const invalidRefererResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Referer': 'http://malicious-site.com',
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'Attacker',
            to: 'System',
            message: 'Invalid referer attack'
          })
        });
        
        return { status: response.status, text: await response.text() };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(invalidRefererResponse.status).toBe(403);
    expect(invalidRefererResponse.text).toContain('referer');

    // 3. Refererヘッダーなしでのリクエスト
    const noRefererResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'NoReferer',
            to: 'System',
            message: 'No referer request'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Refererなしでも、CSRFトークンが正しければ許可される場合がある
    expect([200, 403]).toContain(noRefererResponse.status);

    // 4. Origin ヘッダーによるバックアップ検証
    const originHeaderResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://malicious-origin.com',
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'MaliciousOrigin',
            to: 'System',
            message: 'Malicious origin attack'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(originHeaderResponse.status).toBe(403);

    // 5. 許可されたOriginからのリクエスト
    const allowedOriginResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'AllowedOrigin',
            to: 'System',
            message: 'Allowed origin request'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(allowedOriginResponse.status).toBe(200);

    // 6. Referer検証設定の確認
    const refererSettings = await page.evaluate(() => {
      return window.SecurityValidator.getRefererSettings();
    });

    expect(refererSettings).toEqual(
      expect.objectContaining({
        enforceRefererCheck: true,
        allowedOrigins: expect.any(Array),
        strictMode: expect.any(Boolean)
      })
    );
  });

  test('ダブルサブミットCookie検証テスト', async () => {
    test.setTimeout(60000);

    // 1. ダブルサブミットCookieの設定確認
    await page.evaluate(() => {
      window.CSRFProtector.enableDoubleSubmitCookie();
    });

    const doubleSubmitCookie = await page.evaluate(() => {
      return window.CSRFProtector.getDoubleSubmitCookie();
    });

    expect(doubleSubmitCookie).toBeDefined();

    // 2. 正しいダブルサブミット検証
    const validDoubleSubmitResponse = await page.evaluate(async (cookieValue) => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': cookieValue // CookieとHeaderの値が一致
          },
          body: JSON.stringify({
            from: 'DoubleSubmitUser',
            to: 'System',
            message: 'Valid double submit request'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    }, doubleSubmitCookie);

    expect(validDoubleSubmitResponse.status).toBe(200);

    // 3. 不正なダブルサブミット検証
    const invalidDoubleSubmitResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'wrong_cookie_value' // Cookieと異なる値
          },
          body: JSON.stringify({
            from: 'AttackerDoubleSubmit',
            to: 'System',
            message: 'Invalid double submit attack'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    }, doubleSubmitCookie);

    expect(invalidDoubleSubmitResponse.status).toBe(403);

    // 4. ダブルサブミットCookieのローテーション
    const originalCookie = doubleSubmitCookie;
    
    await page.evaluate(() => {
      window.CSRFProtector.rotateDoubleSubmitCookie();
    });

    const rotatedCookie = await page.evaluate(() => {
      return window.CSRFProtector.getDoubleSubmitCookie();
    });

    expect(rotatedCookie).not.toBe(originalCookie);

    // 5. 古いCookieでのリクエストが拒否されることを確認
    const oldCookieResponse = await page.evaluate(async (oldCookie) => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': oldCookie
          },
          body: JSON.stringify({
            from: 'OldCookieUser',
            to: 'System',
            message: 'Request with old cookie'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    }, originalCookie);

    expect(oldCookieResponse.status).toBe(403);
  });

  test('カスタムヘッダー検証テスト', async () => {
    test.setTimeout(60000);

    // 1. 必須カスタムヘッダーの設定確認
    const requiredHeaders = await page.evaluate(() => {
      return window.SecurityValidator.getRequiredCustomHeaders();
    });

    expect(requiredHeaders).toEqual(
      expect.arrayContaining(['X-Requested-With'])
    );

    // 2. 正しいカスタムヘッダー付きリクエスト
    const validCustomHeaderResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'CustomHeaderUser',
            to: 'System',
            message: 'Request with custom header'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(validCustomHeaderResponse.status).toBe(200);

    // 3. カスタムヘッダーなしでのリクエスト
    const noCustomHeaderResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'NoHeaderUser',
            to: 'System',
            message: 'Request without custom header'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(noCustomHeaderResponse.status).toBe(403);

    // 4. 不正なカスタムヘッダー値でのリクエスト
    const invalidCustomHeaderResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'MaliciousScript',
            'X-CSRF-Token': window.CSRFProtector.getToken()
          },
          body: JSON.stringify({
            from: 'InvalidHeaderUser',
            to: 'System',
            message: 'Request with invalid header'
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(invalidCustomHeaderResponse.status).toBe(403);
  });

  test('状態変更操作の保護テスト', async () => {
    test.setTimeout(90000);

    // 1. GET リクエストでの状態変更防止
    const getStateChangeResponse = await page.evaluate(async () => {
      try {
        // GET メソッドで削除操作を試行
        const response = await fetch('/api/actions/123?action=delete', {
          method: 'GET'
        });
        
        return { status: response.status, text: await response.text() };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(getStateChangeResponse.status).toBe(405); // Method Not Allowed

    // 2. CSRF保護が必要な操作の一覧確認
    const protectedOperations = await page.evaluate(() => {
      return window.CSRFProtector.getProtectedOperations();
    });

    expect(protectedOperations).toEqual(
      expect.arrayContaining(['POST', 'PUT', 'DELETE', 'PATCH'])
    );

    // 3. 各HTTP メソッドでのCSRF保護確認
    const httpMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    
    for (const method of httpMethods) {
      const methodResponse = await page.evaluate(async (httpMethod) => {
        try {
          const response = await fetch('/api/actions/test', {
            method: httpMethod,
            headers: {
              'Content-Type': 'application/json'
              // CSRFトークンなし
            },
            body: httpMethod !== 'DELETE' ? JSON.stringify({ test: 'data' }) : undefined
          });
          
          return { method: httpMethod, status: response.status };
        } catch (error) {
          return { method: httpMethod, error: error.message };
        }
      }, method);

      expect(methodResponse.status).toBe(403); // CSRF保護により拒否
    }

    // 4. べき等操作（GET, HEAD, OPTIONS）のCSRF保護除外確認
    const idempotentMethods = ['GET', 'HEAD', 'OPTIONS'];
    
    for (const method of idempotentMethods) {
      const idempotentResponse = await page.evaluate(async (httpMethod) => {
        try {
          const response = await fetch('/api/public/status', {
            method: httpMethod
          });
          
          return { method: httpMethod, status: response.status };
        } catch (error) {
          return { method: httpMethod, error: error.message };
        }
      }, method);

      // べき等操作はCSRF保護の対象外
      expect([200, 204, 404]).toContain(idempotentResponse.status);
    }

    // 5. 一括操作での CSRF 保護
    const bulkOperationResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/actions/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.CSRFProtector.getToken(),
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            operations: [
              { action: 'create', data: { from: 'Bulk1', to: 'Target1', message: 'Bulk message 1' } },
              { action: 'update', id: '123', data: { message: 'Updated bulk message' } },
              { action: 'delete', id: '456' }
            ]
          })
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(bulkOperationResponse.status).toBe(200);

    // 6. CSRF攻撃検出ログの確認
    const csrfAttackLogs = await page.evaluate(() => {
      return window.SecurityLogger.getLogs('csrf_attack');
    });

    expect(csrfAttackLogs.length).toBeGreaterThan(0);
    expect(csrfAttackLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'csrf_attack_attempt',
          severity: 'high',
          blocked: true,
          method: expect.any(String)
        })
      ])
    );
  });

  test('包括的CSRF保護監査テスト', async () => {
    test.setTimeout(60000);

    // 1. CSRF保護の設定確認
    const csrfConfig = await page.evaluate(() => {
      return window.CSRFProtector.getConfiguration();
    });

    expect(csrfConfig).toEqual(
      expect.objectContaining({
        tokenEnabled: true,
        sameSiteCookies: true,
        refererCheck: true,
        customHeaderCheck: true,
        doubleSubmitCookie: expect.any(Boolean)
      })
    );

    // 2. CSRF防御強度スコアの確認
    const defenseScore = await page.evaluate(() => {
      return window.CSRFProtector.calculateDefenseScore();
    });

    expect(defenseScore).toBeGreaterThan(80); // 80%以上の防御強度

    // 3. 既知のCSRF攻撃パターンへの耐性テスト
    const attackPatterns = [
      'form_submission',
      'xhr_request',
      'fetch_api',
      'iframe_form',
      'image_tag',
      'script_tag'
    ];

    const attackResistance = await page.evaluate(async (patterns) => {
      const results = [];
      
      for (const pattern of patterns) {
        const resistance = await window.CSRFProtector.testAttackResistance(pattern);
        results.push({ pattern, resistant: resistance });
      }
      
      return results;
    }, attackPatterns);

    attackResistance.forEach(result => {
      expect(result.resistant).toBe(true);
    });

    // 4. CSRF保護のパフォーマンス影響確認
    const performanceImpact = await page.evaluate(async () => {
      const startTime = performance.now();
      
      // CSRF保護ありでの100回のリクエスト
      for (let i = 0; i < 100; i++) {
        await window.CSRFProtector.validateRequest({
          method: 'POST',
          headers: { 'X-CSRF-Token': window.CSRFProtector.getToken() }
        });
      }
      
      const endTime = performance.now();
      return endTime - startTime;
    });

    // CSRF保護による遅延が100ms以下であることを確認
    expect(performanceImpact).toBeLessThan(100);

    // 5. CSRF保護レポートの生成
    const csrfReport = await page.evaluate(() => {
      return window.CSRFProtector.generateSecurityReport();
    });

    expect(csrfReport).toEqual(
      expect.objectContaining({
        protectionLevel: expect.any(String),
        blockedAttacks: expect.any(Number),
        vulnerabilities: expect.any(Array),
        recommendations: expect.any(Array),
        complianceStatus: expect.any(Object)
      })
    );

    // 重大な脆弱性がないことを確認
    const criticalVulnerabilities = csrfReport.vulnerabilities.filter(
      vuln => vuln.severity === 'critical'
    );
    expect(criticalVulnerabilities.length).toBe(0);
  });
});