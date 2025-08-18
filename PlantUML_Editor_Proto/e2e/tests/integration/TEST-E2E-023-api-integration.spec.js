// TEST-E2E-023: API統合テスト（5 SP）
// REST API integration, WebSocket real-time sync, Authentication flow
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-023: API統合テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // API統合システムの初期化を待機
    await page.waitForFunction(() => {
      return window.APIManager && 
             window.WebSocketManager && 
             window.AuthenticationManager &&
             window.RateLimitManager;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('REST API統合テスト', async () => {
    test.setTimeout(90000);

    // 1. GET APIテスト - プロジェクト一覧取得
    const projectsResponse = await page.evaluate(async () => {
      return await window.APIManager.get('/api/projects');
    });

    expect(projectsResponse.status).toBe(200);
    expect(projectsResponse.data).toEqual(expect.any(Array));

    // 2. POST APIテスト - 新規アクション作成
    const newActionData = {
      from: 'Client',
      to: 'Server',
      message: 'API Test Message',
      type: 'request'
    };

    const createResponse = await page.evaluate(async (data) => {
      return await window.APIManager.post('/api/actions', data);
    }, newActionData);

    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        ...newActionData,
        createdAt: expect.any(String)
      })
    );

    const createdActionId = createResponse.data.id;

    // 3. PUT APIテスト - アクション更新
    const updateData = {
      ...newActionData,
      message: 'Updated API Test Message'
    };

    const updateResponse = await page.evaluate(async (id, data) => {
      return await window.APIManager.put(`/api/actions/${id}`, data);
    }, createdActionId, updateData);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.message).toBe(updateData.message);

    // 4. GET APIテスト - 特定アクション取得
    const getResponse = await page.evaluate(async (id) => {
      return await window.APIManager.get(`/api/actions/${id}`);
    }, createdActionId);

    expect(getResponse.status).toBe(200);
    expect(getResponse.data.id).toBe(createdActionId);
    expect(getResponse.data.message).toBe(updateData.message);

    // 5. DELETE APIテスト - アクション削除
    const deleteResponse = await page.evaluate(async (id) => {
      return await window.APIManager.delete(`/api/actions/${id}`);
    }, createdActionId);

    expect(deleteResponse.status).toBe(204);

    // 削除確認
    const getDeletedResponse = await page.evaluate(async (id) => {
      return await window.APIManager.get(`/api/actions/${id}`);
    }, createdActionId);

    expect(getDeletedResponse.status).toBe(404);

    // 6. PATCH APIテスト - 部分更新
    const newActionForPatch = await page.evaluate(async () => {
      return await window.APIManager.post('/api/actions', {
        from: 'PatchTest',
        to: 'Target',
        message: 'Original message'
      });
    });

    const patchResponse = await page.evaluate(async (id) => {
      return await window.APIManager.patch(`/api/actions/${id}`, {
        message: 'Patched message'
      });
    }, newActionForPatch.data.id);

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.data.message).toBe('Patched message');
    expect(patchResponse.data.from).toBe('PatchTest'); // 他のフィールドは変更されない

    // 7. バルク操作APIテスト
    const bulkData = [
      { from: 'Bulk1', to: 'Target1', message: 'Bulk message 1' },
      { from: 'Bulk2', to: 'Target2', message: 'Bulk message 2' },
      { from: 'Bulk3', to: 'Target3', message: 'Bulk message 3' }
    ];

    const bulkCreateResponse = await page.evaluate(async (data) => {
      return await window.APIManager.post('/api/actions/bulk', { actions: data });
    }, bulkData);

    expect(bulkCreateResponse.status).toBe(201);
    expect(bulkCreateResponse.data.created.length).toBe(3);

    // 8. フィルタリング・ページングAPIテスト
    const filteredResponse = await page.evaluate(async () => {
      return await window.APIManager.get('/api/actions', {
        params: {
          from: 'Bulk',
          page: 1,
          limit: 2,
          sort: 'createdAt:desc'
        }
      });
    });

    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.data.items.length).toBeLessThanOrEqual(2);
    expect(filteredResponse.data.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 2,
        total: expect.any(Number),
        pages: expect.any(Number)
      })
    );
  });

  test('WebSocketリアルタイム同期テスト', async () => {
    test.setTimeout(90000);

    // 1. WebSocket接続確立
    const connectionResult = await page.evaluate(async () => {
      return await window.WebSocketManager.connect();
    });

    expect(connectionResult.connected).toBe(true);
    expect(connectionResult.socketId).toBeDefined();

    // 2. イベントリスナー設定
    await page.evaluate(() => {
      window.testWebSocketEvents = [];
      
      window.WebSocketManager.on('action.created', (data) => {
        window.testWebSocketEvents.push({ type: 'action.created', data });
      });
      
      window.WebSocketManager.on('action.updated', (data) => {
        window.testWebSocketEvents.push({ type: 'action.updated', data });
      });
      
      window.WebSocketManager.on('user.joined', (data) => {
        window.testWebSocketEvents.push({ type: 'user.joined', data });
      });
    });

    // 3. アクション作成でリアルタイム通知テスト
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'WebSocketTest');
    await page.fill('[data-testid="action-to-input"]', 'Target');
    await page.fill('[data-testid="action-message-input"]', 'WebSocket sync test');
    await page.click('[data-testid="action-save-btn"]');

    // WebSocketイベントの受信を確認
    await page.waitForTimeout(1000);

    const wsEvents = await page.evaluate(() => {
      return window.testWebSocketEvents;
    });

    expect(wsEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'action.created',
          data: expect.objectContaining({
            from: 'WebSocketTest',
            to: 'Target',
            message: 'WebSocket sync test'
          })
        })
      ])
    );

    // 4. 他のクライアントからの更新シミュレーション
    await page.evaluate(() => {
      // 他のクライアントからの更新をシミュレート
      window.WebSocketManager.simulateExternalEvent('action.updated', {
        id: 'external_action_123',
        from: 'ExternalClient',
        to: 'LocalClient',
        message: 'External update',
        updatedBy: 'user456'
      });
    });

    // 外部更新の処理確認
    const externalUpdate = await page.evaluate(() => {
      return window.testWebSocketEvents.find(event => 
        event.type === 'action.updated' && event.data.from === 'ExternalClient'
      );
    });

    expect(externalUpdate).toBeDefined();

    // 5. ユーザープレゼンス（在線状況）テスト
    const presenceInfo = await page.evaluate(async () => {
      return await window.WebSocketManager.getActiveUsers();
    });

    expect(presenceInfo).toEqual(
      expect.objectContaining({
        count: expect.any(Number),
        users: expect.any(Array)
      })
    );

    // 6. 接続ハートビートテスト
    const heartbeatResult = await page.evaluate(async () => {
      return await window.WebSocketManager.sendHeartbeat();
    });

    expect(heartbeatResult.acknowledged).toBe(true);
    expect(heartbeatResult.serverTime).toBeDefined();

    // 7. 接続断・再接続テスト
    await page.evaluate(() => {
      window.WebSocketManager.disconnect();
    });

    await page.waitForTimeout(500);

    const reconnectResult = await page.evaluate(async () => {
      return await window.WebSocketManager.reconnect();
    });

    expect(reconnectResult.connected).toBe(true);
    expect(reconnectResult.reconnectionTime).toBeGreaterThan(0);

    // 8. 大量メッセージ処理テスト
    const bulkMessages = Array.from({ length: 10 }, (_, i) => ({
      type: 'bulk_test',
      data: { index: i, message: `Bulk message ${i}` }
    }));

    await page.evaluate((messages) => {
      messages.forEach(msg => {
        window.WebSocketManager.send(msg.type, msg.data);
      });
    }, bulkMessages);

    await page.waitForTimeout(1000);

    const bulkEventCount = await page.evaluate(() => {
      return window.testWebSocketEvents.filter(event => 
        event.type === 'bulk_test'
      ).length;
    });

    expect(bulkEventCount).toBe(10);
  });

  test('認証フロー統合テスト', async () => {
    test.setTimeout(90000);

    // 1. 未認証状態の確認
    const initialAuthState = await page.evaluate(() => {
      return window.AuthenticationManager.getAuthState();
    });

    expect(initialAuthState.isAuthenticated).toBe(false);
    expect(initialAuthState.user).toBeNull();

    // 2. ログイン処理
    const loginCredentials = {
      email: 'test@example.com',
      password: 'testpassword123'
    };

    const loginResult = await page.evaluate(async (credentials) => {
      return await window.AuthenticationManager.login(credentials);
    }, loginCredentials);

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user).toEqual(
      expect.objectContaining({
        email: loginCredentials.email,
        id: expect.any(String)
      })
    );

    // 3. 認証状態の確認
    const authenticatedState = await page.evaluate(() => {
      return window.AuthenticationManager.getAuthState();
    });

    expect(authenticatedState.isAuthenticated).toBe(true);
    expect(authenticatedState.user).toBeDefined();

    // 4. 認証トークンの自動更新テスト
    const tokenRefreshResult = await page.evaluate(async () => {
      return await window.AuthenticationManager.refreshToken();
    });

    expect(tokenRefreshResult.success).toBe(true);
    expect(tokenRefreshResult.newToken).toBeDefined();

    // 5. 保護されたAPIエンドポイントへのアクセス
    const protectedApiResult = await page.evaluate(async () => {
      return await window.APIManager.get('/api/user/profile');
    });

    expect(protectedApiResult.status).toBe(200);
    expect(protectedApiResult.data.user).toBeDefined();

    // 6. 権限別アクセステスト
    const adminApiResult = await page.evaluate(async () => {
      return await window.APIManager.get('/api/admin/users');
    });

    // ユーザーの権限に応じて結果が変わる
    expect([200, 403]).toContain(adminApiResult.status);

    // 7. セッション管理テスト
    const sessionInfo = await page.evaluate(() => {
      return window.AuthenticationManager.getSessionInfo();
    });

    expect(sessionInfo).toEqual(
      expect.objectContaining({
        sessionId: expect.any(String),
        createdAt: expect.any(Number),
        expiresAt: expect.any(Number),
        lastActivity: expect.any(Number)
      })
    );

    // 8. ログアウト処理
    const logoutResult = await page.evaluate(async () => {
      return await window.AuthenticationManager.logout();
    });

    expect(logoutResult.success).toBe(true);

    // ログアウト後の状態確認
    const loggedOutState = await page.evaluate(() => {
      return window.AuthenticationManager.getAuthState();
    });

    expect(loggedOutState.isAuthenticated).toBe(false);
    expect(loggedOutState.user).toBeNull();

    // 保護されたAPIへのアクセスが拒否されることを確認
    const unauthorizedApiResult = await page.evaluate(async () => {
      return await window.APIManager.get('/api/user/profile');
    });

    expect(unauthorizedApiResult.status).toBe(401);
  });

  test('レート制限順守テスト', async () => {
    test.setTimeout(90000);

    // 1. レート制限設定の確認
    const rateLimitConfig = await page.evaluate(() => {
      return window.RateLimitManager.getConfig();
    });

    expect(rateLimitConfig).toEqual(
      expect.objectContaining({
        requestsPerMinute: expect.any(Number),
        burstLimit: expect.any(Number),
        windowSize: expect.any(Number)
      })
    );

    // 2. 通常の制限内リクエスト
    const normalRequestResults = [];
    const requestLimit = Math.min(rateLimitConfig.requestsPerMinute, 10); // テスト用に制限

    for (let i = 0; i < requestLimit; i++) {
      const result = await page.evaluate(async (index) => {
        return await window.APIManager.get(`/api/test?request=${index}`);
      }, i);
      
      normalRequestResults.push(result);
      await page.waitForTimeout(100); // 短い間隔
    }

    // すべてのリクエストが成功することを確認
    normalRequestResults.forEach(result => {
      expect(result.status).toBe(200);
    });

    // 3. レート制限超過テスト
    const excessiveRequests = [];
    const excessCount = 20; // 制限を超える数

    for (let i = 0; i < excessCount; i++) {
      const result = await page.evaluate(async (index) => {
        return await window.APIManager.get(`/api/test?excess=${index}`);
      }, i);
      
      excessiveRequests.push(result);
    }

    // 一部のリクエストが制限されることを確認
    const rateLimitedRequests = excessiveRequests.filter(result => result.status === 429);
    expect(rateLimitedRequests.length).toBeGreaterThan(0);

    // 4. レート制限ヘッダーの確認
    const rateLimitHeaders = await page.evaluate(async () => {
      const response = await window.APIManager.get('/api/test?headers=true');
      return response.headers;
    });

    expect(rateLimitHeaders).toEqual(
      expect.objectContaining({
        'x-ratelimit-limit': expect.any(String),
        'x-ratelimit-remaining': expect.any(String),
        'x-ratelimit-reset': expect.any(String)
      })
    );

    // 5. バックオフとリトライテスト
    const backoffResult = await page.evaluate(async () => {
      return await window.RateLimitManager.executeWithBackoff(async () => {
        return await window.APIManager.get('/api/test?backoff=true');
      });
    });

    expect(backoffResult.success).toBe(true);
    expect(backoffResult.attempts).toBeGreaterThanOrEqual(1);

    // 6. 優先度付きキューテスト
    const priorityRequests = [
      { url: '/api/test?priority=low', priority: 'low' },
      { url: '/api/test?priority=high', priority: 'high' },
      { url: '/api/test?priority=medium', priority: 'medium' }
    ];

    const queueResult = await page.evaluate(async (requests) => {
      return await window.RateLimitManager.executeWithPriority(requests);
    }, priorityRequests);

    // 高優先度のリクエストが最初に処理されることを確認
    expect(queueResult.executionOrder[0]).toEqual(
      expect.objectContaining({ priority: 'high' })
    );
  });

  test('リトライメカニズムテスト', async () => {
    test.setTimeout(90000);

    // 1. 一時的な失敗からの自動復旧
    let failureCount = 0;
    await page.route('**/api/retry-test', route => {
      failureCount++;
      if (failureCount <= 2) {
        route.fulfill({ status: 500, body: 'Temporary failure' });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ success: true, attempts: failureCount }) });
      }
    });

    const retryResult = await page.evaluate(async () => {
      return await window.APIManager.getWithRetry('/api/retry-test');
    });

    expect(retryResult.success).toBe(true);
    expect(retryResult.data.attempts).toBe(3);

    // 2. 指数バックオフテスト
    const backoffTimings = [];
    await page.evaluate(() => {
      window.testBackoffTimings = [];
      
      // バックオフの実行時間を記録
      const originalWait = window.APIManager.wait;
      window.APIManager.wait = function(ms) {
        window.testBackoffTimings.push({ timestamp: Date.now(), delay: ms });
        return originalWait.call(this, ms);
      };
    });

    await page.route('**/api/backoff-test', route => {
      route.fulfill({ status: 503, body: 'Service unavailable' });
    });

    await page.evaluate(async () => {
      try {
        await window.APIManager.getWithRetry('/api/backoff-test', { maxRetries: 3 });
      } catch (error) {
        // エラーは期待される
      }
    });

    const timings = await page.evaluate(() => {
      return window.testBackoffTimings;
    });

    // 指数バックオフが正しく実装されていることを確認
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].delay).toBeGreaterThan(timings[i-1].delay);
    }

    // 3. ジッターテスト（ランダム要素の追加）
    const jitterResults = [];
    for (let i = 0; i < 5; i++) {
      const jitterDelay = await page.evaluate(() => {
        return window.APIManager.calculateBackoffWithJitter(1000, 2);
      });
      jitterResults.push(jitterDelay);
    }

    // すべての結果が異なることを確認（ジッターが機能している）
    const uniqueResults = [...new Set(jitterResults)];
    expect(uniqueResults.length).toBeGreaterThan(1);

    // 4. 回復可能エラーと非回復可能エラーの区別
    const errorClassifications = [
      { status: 500, recoverable: true },
      { status: 502, recoverable: true },
      { status: 503, recoverable: true },
      { status: 400, recoverable: false },
      { status: 401, recoverable: false },
      { status: 404, recoverable: false }
    ];

    for (const errorTest of errorClassifications) {
      const classification = await page.evaluate((status) => {
        return window.APIManager.isRecoverableError({ status });
      }, errorTest.status);

      expect(classification).toBe(errorTest.recoverable);
    }

    await page.unroute('**/api/retry-test');
    await page.unroute('**/api/backoff-test');
  });

  test('オフラインモードサポートテスト', async () => {
    test.setTimeout(90000);

    // 1. オンライン状態の確認
    const initialOnlineState = await page.evaluate(() => {
      return window.OfflineManager.isOnline();
    });

    expect(initialOnlineState).toBe(true);

    // 2. オフライン操作のキューイング
    await page.evaluate(() => {
      window.OfflineManager.setOffline(true);
    });

    // オフライン状態でのAPIリクエスト
    const offlineRequests = [
      { method: 'POST', url: '/api/actions', data: { from: 'Offline1', to: 'Target1', message: 'Offline message 1' } },
      { method: 'PUT', url: '/api/actions/123', data: { message: 'Updated offline' } },
      { method: 'DELETE', url: '/api/actions/456' }
    ];

    for (const request of offlineRequests) {
      await page.evaluate(async (req) => {
        return await window.APIManager[req.method.toLowerCase()](req.url, req.data);
      }, request);
    }

    // キューに保存されていることを確認
    const queuedOperations = await page.evaluate(() => {
      return window.OfflineManager.getQueuedOperations();
    });

    expect(queuedOperations.length).toBe(offlineRequests.length);

    // 3. オンライン復帰時の同期
    await page.evaluate(() => {
      window.OfflineManager.setOffline(false);
    });

    const syncResult = await page.evaluate(async () => {
      return await window.OfflineManager.syncQueuedOperations();
    });

    expect(syncResult.success).toBe(true);
    expect(syncResult.processedCount).toBe(offlineRequests.length);

    // 4. 競合解決テスト
    await page.evaluate(() => {
      // 同じリソースに対する競合する変更をシミュレート
      window.OfflineManager.addConflict({
        resourceId: 'action_789',
        localChange: { message: 'Local change' },
        remoteChange: { message: 'Remote change' },
        timestamp: Date.now()
      });
    });

    const conflictResolution = await page.evaluate(async () => {
      return await window.OfflineManager.resolveConflicts();
    });

    expect(conflictResolution.resolved).toBe(true);
    expect(conflictResolution.strategy).toBeDefined();

    // 5. ローカルストレージ永続化
    const persistenceTest = await page.evaluate(() => {
      const testData = { test: 'offline persistence' };
      window.OfflineManager.persistToLocal('test_key', testData);
      
      return window.OfflineManager.loadFromLocal('test_key');
    });

    expect(persistenceTest).toEqual({ test: 'offline persistence' });

    // 6. データ差分同期
    const deltaSync = await page.evaluate(async () => {
      return await window.OfflineManager.performDeltaSync();
    });

    expect(deltaSync.success).toBe(true);
    expect(deltaSync.changes).toEqual(expect.any(Array));
  });
});