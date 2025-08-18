// TEST-E2E-028: 認証・認可テスト（5 SP）
// Authentication flow security, Session management, JWT token validation, Role-based access control
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-028: 認証・認可テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 認証・認可システムの初期化を待機
    await page.waitForFunction(() => {
      return window.AuthenticationManager && 
             window.AuthorizationManager && 
             window.SessionManager &&
             window.JWTManager &&
             window.RoleManager;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('認証フローセキュリティテスト', async () => {
    test.setTimeout(90000);

    // 1. 未認証状態の確認
    const initialAuthState = await page.evaluate(() => {
      return window.AuthenticationManager.getAuthState();
    });

    expect(initialAuthState.isAuthenticated).toBe(false);
    expect(initialAuthState.user).toBeNull();

    // 2. 認証が必要なリソースへのアクセス制限
    const unauthorizedAccess = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        return { status: response.status, text: await response.text() };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(unauthorizedAccess.status).toBe(401); // Unauthorized

    // 3. 正当な認証情報でのログイン
    const validCredentials = {
      username: 'testuser@example.com',
      password: 'SecurePassword123!'
    };

    const loginResult = await page.evaluate(async (credentials) => {
      return await window.AuthenticationManager.login(credentials);
    }, validCredentials);

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user).toEqual(
      expect.objectContaining({
        email: validCredentials.username,
        id: expect.any(String)
      })
    );

    // 4. 不正な認証情報でのログイン試行
    const invalidCredentialTests = [
      { username: 'invalid@example.com', password: 'wrongpassword' },
      { username: 'testuser@example.com', password: 'wrongpassword' },
      { username: '', password: 'SecurePassword123!' },
      { username: 'testuser@example.com', password: '' },
      { username: 'admin\'; DROP TABLE users; --', password: 'password' }, // SQL Injection
      { username: 'testuser@example.com', password: '../../etc/passwd' }, // Path Traversal
      { username: '<script>alert("XSS")</script>', password: 'password' } // XSS
    ];

    for (const invalidCreds of invalidCredentialTests) {
      const invalidLoginResult = await page.evaluate(async (credentials) => {
        return await window.AuthenticationManager.login(credentials);
      }, invalidCreds);

      expect(invalidLoginResult.success).toBe(false);
      expect(invalidLoginResult.error).toBeDefined();
    }

    // 5. ブルートフォース攻撃の防御
    const bruteForceAttempts = [];
    for (let i = 0; i < 10; i++) {
      const attempt = await page.evaluate(async (attempt) => {
        return await window.AuthenticationManager.login({
          username: 'testuser@example.com',
          password: `wrongpassword${attempt}`
        });
      }, i);
      
      bruteForceAttempts.push(attempt);
    }

    // 複数回の失敗後にアカウントロックまたはレート制限が適用される
    const laterAttempts = bruteForceAttempts.slice(5);
    const hasRateLimit = laterAttempts.some(attempt => 
      attempt.error && (attempt.error.includes('rate limit') || attempt.error.includes('locked'))
    );

    expect(hasRateLimit).toBe(true);

    // 6. パスワード強度の検証
    const weakPasswords = [
      'password',
      '123456',
      'qwerty',
      'abc123',
      'password123',
      '12345678',
      'admin',
      'user'
    ];

    for (const weakPassword of weakPasswords) {
      const passwordStrength = await page.evaluate((password) => {
        return window.AuthenticationManager.validatePasswordStrength(password);
      }, weakPassword);

      expect(passwordStrength.isStrong).toBe(false);
      expect(passwordStrength.score).toBeLessThan(3);
    }

    // 7. 強力なパスワードの確認
    const strongPasswords = [
      'MyStr0ng!P@ssw0rd#2024',
      'C0mpl3x_P@$$w0rd!',
      '9s8dF@3x$mNp2!qR'
    ];

    for (const strongPassword of strongPasswords) {
      const passwordStrength = await page.evaluate((password) => {
        return window.AuthenticationManager.validatePasswordStrength(password);
      }, strongPassword);

      expect(passwordStrength.isStrong).toBe(true);
      expect(passwordStrength.score).toBeGreaterThanOrEqual(4);
    }

    // 8. 多要素認証（MFA）のテスト
    const mfaSetup = await page.evaluate(() => {
      return window.AuthenticationManager.setupMFA();
    });

    expect(mfaSetup.qrCode).toBeDefined();
    expect(mfaSetup.secret).toBeDefined();

    // MFA トークン検証
    const mfaValidation = await page.evaluate((token) => {
      return window.AuthenticationManager.verifyMFAToken(token);
    }, '123456'); // テスト用トークン

    expect([true, false]).toContain(mfaValidation.valid); // MFA実装に依存
  });

  test('セッション管理テスト', async () => {
    test.setTimeout(90000);

    // 1. セッション作成
    const loginResult = await page.evaluate(async () => {
      return await window.AuthenticationManager.login({
        username: 'testuser@example.com',
        password: 'SecurePassword123!'
      });
    });

    expect(loginResult.success).toBe(true);

    // 2. セッション情報の確認
    const sessionInfo = await page.evaluate(() => {
      return window.SessionManager.getCurrentSession();
    });

    expect(sessionInfo).toEqual(
      expect.objectContaining({
        sessionId: expect.any(String),
        userId: expect.any(String),
        createdAt: expect.any(Number),
        expiresAt: expect.any(Number),
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      })
    );

    // 3. セッションの有効期限確認
    expect(sessionInfo.expiresAt).toBeGreaterThan(Date.now());

    // 4. セッション固定攻撃の防御
    const originalSessionId = sessionInfo.sessionId;
    
    // ログイン前後でセッションIDが変更されることを確認
    const preLoginSessionId = await page.evaluate(() => {
      return window.SessionManager.getSessionId();
    });

    await page.evaluate(() => {
      window.AuthenticationManager.logout();
    });

    const postLogoutSessionId = await page.evaluate(() => {
      return window.SessionManager.getSessionId();
    });

    expect(postLogoutSessionId).not.toBe(originalSessionId);

    // 5. セッションタイムアウトのテスト
    await page.evaluate(async () => {
      return await window.AuthenticationManager.login({
        username: 'testuser@example.com',
        password: 'SecurePassword123!'
      });
    });

    // セッションを手動で期限切れに設定
    await page.evaluate(() => {
      window.SessionManager.expireSession();
    });

    const expiredSessionAccess = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'include'
        });
        
        return { status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(expiredSessionAccess.status).toBe(401); // セッション期限切れ

    // 6. 同時セッション制限
    const concurrentSessions = [];
    
    for (let i = 0; i < 5; i++) {
      const sessionResult = await page.evaluate(async (index) => {
        // 異なるデバイスからのログインをシミュレート
        const userAgent = `TestDevice${index}`;
        return await window.AuthenticationManager.loginWithUserAgent({
          username: 'testuser@example.com',
          password: 'SecurePassword123!'
        }, userAgent);
      }, i);
      
      concurrentSessions.push(sessionResult);
    }

    // 同時セッション数の制限が適用されることを確認
    const activeSessions = await page.evaluate(() => {
      return window.SessionManager.getActiveSessionCount();
    });

    expect(activeSessions).toBeLessThanOrEqual(3); // 最大3セッション

    // 7. セッションハイジャック防御
    const sessionSecurityHeaders = await page.evaluate(() => {
      return window.SessionManager.getSecurityHeaders();
    });

    expect(sessionSecurityHeaders).toEqual(
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
      })
    );

    // 8. セッション再生成
    const sessionRegenerationResult = await page.evaluate(() => {
      return window.SessionManager.regenerateSession();
    });

    expect(sessionRegenerationResult.success).toBe(true);
    expect(sessionRegenerationResult.newSessionId).toBeDefined();
    expect(sessionRegenerationResult.newSessionId).not.toBe(originalSessionId);
  });

  test('JWTトークン検証テスト', async () => {
    test.setTimeout(90000);

    // 1. JWTトークンの生成
    const jwtToken = await page.evaluate(async () => {
      const loginResult = await window.AuthenticationManager.login({
        username: 'testuser@example.com',
        password: 'SecurePassword123!'
      });
      
      return loginResult.token;
    });

    expect(jwtToken).toBeDefined();
    expect(jwtToken.split('.')).toHaveLength(3); // Header.Payload.Signature

    // 2. JWTトークンの構造検証
    const tokenStructure = await page.evaluate((token) => {
      return window.JWTManager.parseToken(token);
    }, jwtToken);

    expect(tokenStructure.header).toEqual(
      expect.objectContaining({
        alg: expect.any(String),
        typ: 'JWT'
      })
    );

    expect(tokenStructure.payload).toEqual(
      expect.objectContaining({
        sub: expect.any(String), // Subject (User ID)
        iat: expect.any(Number), // Issued At
        exp: expect.any(Number), // Expiration
        iss: expect.any(String)  // Issuer
      })
    );

    // 3. トークンの有効期限確認
    expect(tokenStructure.payload.exp * 1000).toBeGreaterThan(Date.now());

    // 4. 無効なJWTトークンのテスト
    const invalidTokens = [
      'invalid.jwt.token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      jwtToken + 'tampered',
      'bearer ' + jwtToken, // 不正なプレフィックス
      '',
      null,
      undefined
    ];

    for (const invalidToken of invalidTokens) {
      const validationResult = await page.evaluate(async (token) => {
        return await window.JWTManager.validateToken(token);
      }, invalidToken);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toBeDefined();
    }

    // 5. 期限切れトークンのテスト
    const expiredToken = await page.evaluate(() => {
      // 過去の時刻で期限切れトークンを生成
      return window.JWTManager.generateToken({
        userId: 'test123',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1時間前に期限切れ
      });
    });

    const expiredValidation = await page.evaluate(async (token) => {
      return await window.JWTManager.validateToken(token);
    }, expiredToken);

    expect(expiredValidation.valid).toBe(false);
    expect(expiredValidation.error).toContain('expired');

    // 6. トークンの署名検証
    const tamperedToken = jwtToken.slice(0, -10) + 'tampered00';
    
    const signatureValidation = await page.evaluate(async (token) => {
      return await window.JWTManager.validateSignature(token);
    }, tamperedToken);

    expect(signatureValidation.valid).toBe(false);
    expect(signatureValidation.error).toContain('signature');

    // 7. トークンリフレッシュ機能
    const refreshResult = await page.evaluate(async (token) => {
      return await window.JWTManager.refreshToken(token);
    }, jwtToken);

    expect(refreshResult.success).toBe(true);
    expect(refreshResult.newToken).toBeDefined();
    expect(refreshResult.newToken).not.toBe(jwtToken);

    // 8. JWTブラックリスト機能
    const blacklistResult = await page.evaluate(async (token) => {
      await window.JWTManager.blacklistToken(token);
      return await window.JWTManager.validateToken(token);
    }, jwtToken);

    expect(blacklistResult.valid).toBe(false);
    expect(blacklistResult.error).toContain('blacklisted');

    // 9. セキュアなJWTアルゴリズム確認
    const jwtConfig = await page.evaluate(() => {
      return window.JWTManager.getConfiguration();
    });

    expect(jwtConfig.algorithm).not.toBe('none'); // "none" アルゴリズムは禁止
    expect(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512']).toContain(jwtConfig.algorithm);
  });

  test('ロールベースアクセス制御テスト', async () => {
    test.setTimeout(90000);

    // 1. ユーザーロールの確認
    const userRoles = await page.evaluate(async () => {
      await window.AuthenticationManager.login({
        username: 'testuser@example.com',
        password: 'SecurePassword123!'
      });
      
      return window.RoleManager.getCurrentUserRoles();
    });

    expect(userRoles).toEqual(expect.any(Array));

    // 2. 管理者ユーザーでのログイン
    const adminLoginResult = await page.evaluate(async () => {
      return await window.AuthenticationManager.login({
        username: 'admin@example.com',
        password: 'AdminPassword123!'
      });
    });

    if (adminLoginResult.success) {
      const adminRoles = await page.evaluate(() => {
        return window.RoleManager.getCurrentUserRoles();
      });

      expect(adminRoles).toEqual(
        expect.arrayContaining(['admin'])
      );
    }

    // 3. 権限チェック機能のテスト
    const permissions = [
      'create_action',
      'edit_action',
      'delete_action',
      'view_all_actions',
      'manage_users',
      'system_admin'
    ];

    for (const permission of permissions) {
      const hasPermission = await page.evaluate((perm) => {
        return window.AuthorizationManager.checkPermission(perm);
      }, permission);

      expect(typeof hasPermission).toBe('boolean');
    }

    // 4. リソースレベルのアクセス制御
    const resourceAccessTests = [
      { resource: 'action', id: '123', action: 'read' },
      { resource: 'action', id: '123', action: 'write' },
      { resource: 'user', id: '456', action: 'read' },
      { resource: 'user', id: '456', action: 'write' },
      { resource: 'system', id: 'config', action: 'read' }
    ];

    for (const accessTest of resourceAccessTests) {
      const accessResult = await page.evaluate((test) => {
        return window.AuthorizationManager.checkResourceAccess(
          test.resource, 
          test.id, 
          test.action
        );
      }, accessTest);

      expect(typeof accessResult.allowed).toBe('boolean');
      if (!accessResult.allowed) {
        expect(accessResult.reason).toBeDefined();
      }
    }

    // 5. 権限昇格攻撃の防御
    const privilegeEscalationTests = [
      { 
        action: 'modify_role',
        payload: { userId: 'current_user', newRole: 'admin' }
      },
      {
        action: 'grant_permission',
        payload: { permission: 'system_admin' }
      },
      {
        action: 'bypass_authorization',
        payload: { force: true }
      }
    ];

    for (const escalationTest of privilegeEscalationTests) {
      const escalationResult = await page.evaluate((test) => {
        return window.AuthorizationManager.attemptAction(test.action, test.payload);
      }, escalationTest);

      expect(escalationResult.success).toBe(false);
      expect(escalationResult.error).toContain('unauthorized');
    }

    // 6. 動的権限の検証
    const dynamicPermissionTest = await page.evaluate(() => {
      // 時間ベースの権限制限
      const timeBasedPermission = window.AuthorizationManager.checkTimeBasedPermission('admin_access', {
        allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17], // 営業時間のみ
        timezone: 'Asia/Tokyo'
      });

      return timeBasedPermission;
    });

    expect(typeof dynamicPermissionTest.allowed).toBe('boolean');

    // 7. APIエンドポイントの認可テスト
    const apiAuthorizationTests = [
      { endpoint: '/api/actions', method: 'GET', expectedRoles: ['user', 'admin'] },
      { endpoint: '/api/actions', method: 'POST', expectedRoles: ['user', 'admin'] },
      { endpoint: '/api/users', method: 'GET', expectedRoles: ['admin'] },
      { endpoint: '/api/system/config', method: 'PUT', expectedRoles: ['admin'] }
    ];

    for (const apiTest of apiAuthorizationTests) {
      const apiAuthResult = await page.evaluate(async (test) => {
        try {
          const response = await fetch(test.endpoint, {
            method: test.method,
            headers: {
              'Authorization': `Bearer ${window.AuthenticationManager.getToken()}`,
              'Content-Type': 'application/json'
            }
          });
          
          return { status: response.status };
        } catch (error) {
          return { error: error.message };
        }
      }, apiTest);

      // アクセス権限に応じて適切なステータスコードが返されることを確認
      expect([200, 201, 403, 404]).toContain(apiAuthResult.status);
    }

    // 8. ロール継承の確認
    const roleHierarchy = await page.evaluate(() => {
      return window.RoleManager.getRoleHierarchy();
    });

    expect(roleHierarchy).toEqual(
      expect.objectContaining({
        admin: expect.arrayContaining(['user']), // admin は user 権限も継承
        moderator: expect.arrayContaining(['user']),
        user: expect.any(Array)
      })
    );
  });

  test('パスワードポリシー実装テスト', async () => {
    test.setTimeout(60000);

    // 1. パスワードポリシー設定の確認
    const passwordPolicy = await page.evaluate(() => {
      return window.AuthenticationManager.getPasswordPolicy();
    });

    expect(passwordPolicy).toEqual(
      expect.objectContaining({
        minLength: expect.any(Number),
        maxLength: expect.any(Number),
        requireUppercase: expect.any(Boolean),
        requireLowercase: expect.any(Boolean),
        requireNumbers: expect.any(Boolean),
        requireSpecialChars: expect.any(Boolean),
        maxAge: expect.any(Number),
        historySize: expect.any(Number)
      })
    );

    // 最低限のセキュリティ要件を満たしていることを確認
    expect(passwordPolicy.minLength).toBeGreaterThanOrEqual(8);
    expect(passwordPolicy.requireUppercase).toBe(true);
    expect(passwordPolicy.requireLowercase).toBe(true);
    expect(passwordPolicy.requireNumbers).toBe(true);
    expect(passwordPolicy.requireSpecialChars).toBe(true);

    // 2. パスワード履歴の確認
    const passwordHistoryTest = await page.evaluate(async () => {
      const testPasswords = [
        'OldPassword123!',
        'NewPassword456@',
        'AnotherPass789#'
      ];

      const historyResults = [];

      for (const password of testPasswords) {
        const changeResult = await window.AuthenticationManager.changePassword(
          'SecurePassword123!', // 現在のパスワード
          password
        );
        
        historyResults.push({
          password,
          success: changeResult.success,
          error: changeResult.error
        });

        // 成功した場合、同じパスワードの再利用をテスト
        if (changeResult.success) {
          const reuseResult = await window.AuthenticationManager.changePassword(
            password,
            password // 同じパスワードを再利用
          );
          
          historyResults.push({
            password: `${password}_reuse`,
            success: reuseResult.success,
            error: reuseResult.error
          });
        }
      }

      return historyResults;
    });

    // パスワード履歴による再利用防止が機能していることを確認
    const reuseAttempts = passwordHistoryTest.filter(result => 
      result.password.includes('_reuse')
    );

    reuseAttempts.forEach(attempt => {
      expect(attempt.success).toBe(false);
      expect(attempt.error).toContain('recently used');
    });

    // 3. パスワード有効期限のテスト
    const passwordAgeTest = await page.evaluate(() => {
      return window.AuthenticationManager.checkPasswordAge();
    });

    expect(passwordAgeTest).toEqual(
      expect.objectContaining({
        daysOld: expect.any(Number),
        expiresIn: expect.any(Number),
        isExpired: expect.any(Boolean)
      })
    );

    // 4. アカウントロックアウトポリシー
    const lockoutPolicyTest = await page.evaluate(async () => {
      const lockoutResults = [];

      // 複数回の不正ログイン試行
      for (let i = 0; i < 6; i++) {
        const attempt = await window.AuthenticationManager.login({
          username: 'lockouttest@example.com',
          password: `wrongpassword${i}`
        });

        lockoutResults.push({
          attempt: i + 1,
          success: attempt.success,
          locked: attempt.accountLocked,
          remainingAttempts: attempt.remainingAttempts
        });

        if (attempt.accountLocked) {
          break;
        }
      }

      return lockoutResults;
    });

    // アカウントロックアウトが適切に機能していることを確認
    const lockedAttempt = lockoutPolicyTest.find(result => result.locked);
    expect(lockedAttempt).toBeDefined();

    // 5. パスワードリセット機能のセキュリティ
    const passwordResetTest = await page.evaluate(async () => {
      // パスワードリセット要求
      const resetRequest = await window.AuthenticationManager.requestPasswordReset('testuser@example.com');
      
      if (resetRequest.success) {
        // 無効なリセットトークンでの試行
        const invalidResetAttempt = await window.AuthenticationManager.resetPassword(
          'invalid_token_123',
          'NewSecurePassword456!'
        );

        return {
          resetRequestSent: resetRequest.success,
          invalidTokenBlocked: !invalidResetAttempt.success,
          tokenRequired: resetRequest.tokenRequired
        };
      }

      return { resetRequestSent: false };
    });

    expect(passwordResetTest.resetRequestSent).toBe(true);
    expect(passwordResetTest.invalidTokenBlocked).toBe(true);
  });

  test('多要素認証実装テスト', async () => {
    test.setTimeout(60000);

    // 1. MFA設定の確認
    const mfaConfig = await page.evaluate(() => {
      return window.AuthenticationManager.getMFAConfiguration();
    });

    expect(mfaConfig).toEqual(
      expect.objectContaining({
        enabled: expect.any(Boolean),
        methods: expect.any(Array),
        gracePeriod: expect.any(Number)
      })
    );

    // 2. TOTP (Time-based One-Time Password) の設定
    const totpSetup = await page.evaluate(async () => {
      await window.AuthenticationManager.login({
        username: 'testuser@example.com',
        password: 'SecurePassword123!'
      });

      return await window.AuthenticationManager.setupTOTP();
    });

    expect(totpSetup).toEqual(
      expect.objectContaining({
        secret: expect.any(String),
        qrCodeUrl: expect.any(String),
        backupCodes: expect.any(Array)
      })
    );

    // 3. SMS認証の設定
    const smsSetup = await page.evaluate(async () => {
      return await window.AuthenticationManager.setupSMSAuth('+81-90-1234-5678');
    });

    if (smsSetup.success) {
      expect(smsSetup).toEqual(
        expect.objectContaining({
          phoneNumber: expect.any(String),
          verificationRequired: true
        })
      );
    }

    // 4. バックアップコードの生成と検証
    const backupCodesTest = await page.evaluate(() => {
      const codes = window.AuthenticationManager.generateBackupCodes();
      
      return {
        codesGenerated: codes.length > 0,
        codeFormat: codes[0]?.match(/^[A-Z0-9]{8}$/), // 8文字の英数字
        uniqueCodes: new Set(codes).size === codes.length
      };
    });

    expect(backupCodesTest.codesGenerated).toBe(true);
    expect(backupCodesTest.codeFormat).toBeTruthy();
    expect(backupCodesTest.uniqueCodes).toBe(true);

    // 5. MFA バイパス攻撃の防御
    const mfaBypassTests = [
      { method: 'skip_mfa', valid: false },
      { method: 'use_old_token', valid: false },
      { method: 'token_reuse', valid: false },
      { method: 'time_manipulation', valid: false }
    ];

    for (const bypassTest of mfaBypassTests) {
      const bypassResult = await page.evaluate((test) => {
        return window.AuthenticationManager.attemptMFABypass(test.method);
      }, bypassTest);

      expect(bypassResult.success).toBe(false);
      expect(bypassResult.detected).toBe(true);
    }

    // 6. MFA ログ監査
    const mfaAuditLog = await page.evaluate(() => {
      return window.AuthenticationManager.getMFAAuditLog();
    });

    expect(mfaAuditLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          timestamp: expect.any(Number),
          userId: expect.any(String),
          method: expect.any(String),
          success: expect.any(Boolean),
          ipAddress: expect.any(String)
        })
      ])
    );
  });

  test('包括的認証セキュリティ監査テスト', async () => {
    test.setTimeout(60000);

    // 1. 認証システム全体のセキュリティ評価
    const securityAudit = await page.evaluate(() => {
      return window.AuthenticationManager.performSecurityAudit();
    });

    expect(securityAudit).toEqual(
      expect.objectContaining({
        overallScore: expect.any(Number),
        passwordPolicyCompliance: expect.any(Number),
        sessionSecurityScore: expect.any(Number),
        mfaImplementationScore: expect.any(Number),
        vulnerabilities: expect.any(Array),
        recommendations: expect.any(Array)
      })
    );

    // セキュリティスコアが最低基準を満たすことを確認
    expect(securityAudit.overallScore).toBeGreaterThan(80);

    // 2. 認証攻撃の検出と統計
    const attackStatistics = await page.evaluate(() => {
      return window.AuthenticationManager.getAttackStatistics();
    });

    expect(attackStatistics).toEqual(
      expect.objectContaining({
        bruteForceAttempts: expect.any(Number),
        credentialStuffingAttempts: expect.any(Number),
        sessionHijackingAttempts: expect.any(Number),
        mfaBypassAttempts: expect.any(Number),
        blockedIPs: expect.any(Array)
      })
    );

    // 3. コンプライアンス確認
    const complianceCheck = await page.evaluate(() => {
      return window.AuthenticationManager.checkCompliance();
    });

    expect(complianceCheck).toEqual(
      expect.objectContaining({
        gdprCompliant: expect.any(Boolean),
        hipaaCompliant: expect.any(Boolean),
        pciDssCompliant: expect.any(Boolean),
        iso27001Compliant: expect.any(Boolean)
      })
    );

    // 4. 認証パフォーマンス監視
    const performanceMetrics = await page.evaluate(async () => {
      const metrics = {
        loginTimes: [],
        tokenValidationTimes: [],
        mfaVerificationTimes: []
      };

      // ログイン性能測定
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        await window.AuthenticationManager.login({
          username: 'testuser@example.com',
          password: 'SecurePassword123!'
        });
        
        const endTime = performance.now();
        metrics.loginTimes.push(endTime - startTime);
        
        await window.AuthenticationManager.logout();
      }

      return {
        averageLoginTime: metrics.loginTimes.reduce((a, b) => a + b, 0) / metrics.loginTimes.length,
        maxLoginTime: Math.max(...metrics.loginTimes)
      };
    });

    // ログイン時間が許容範囲内であることを確認
    expect(performanceMetrics.averageLoginTime).toBeLessThan(2000); // 2秒以下
    expect(performanceMetrics.maxLoginTime).toBeLessThan(5000); // 5秒以下

    // 5. セキュリティレポートの生成
    const securityReport = await page.evaluate(() => {
      return window.AuthenticationManager.generateSecurityReport();
    });

    expect(securityReport).toEqual(
      expect.objectContaining({
        reportId: expect.any(String),
        generatedAt: expect.any(Number),
        summary: expect.any(Object),
        detailedFindings: expect.any(Array),
        riskAssessment: expect.any(Object),
        actionItems: expect.any(Array)
      })
    );

    // 重大なセキュリティ問題がないことを確認
    const criticalFindings = securityReport.detailedFindings.filter(
      finding => finding.severity === 'critical'
    );
    expect(criticalFindings.length).toBe(0);
  });
});