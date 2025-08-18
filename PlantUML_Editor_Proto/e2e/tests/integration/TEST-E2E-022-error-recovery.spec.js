// TEST-E2E-022: エラーリカバリーテスト（3 SP）
// Graceful error handling, Automatic recovery mechanisms, User notification system
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-022: エラーリカバリーテスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // エラーハンドリングシステムの初期化を待機
    await page.waitForFunction(() => {
      return window.ErrorHandler && 
             window.ErrorRecoveryManager && 
             window.NotificationManager &&
             window.DataIntegrityManager;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('グレースフルエラーハンドリングテスト', async () => {
    test.setTimeout(90000);

    // 1. 正常な操作でベースラインを確立
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'User');
    await page.fill('[data-testid="action-to-input"]', 'System');
    await page.fill('[data-testid="action-message-input"]', 'Valid message');
    await page.click('[data-testid="action-save-btn"]');

    // 正常保存を確認
    const normalSave = await page.evaluate(() => {
      return window.ActionEditor.getAllActions().length;
    });
    expect(normalSave).toBe(1);

    // 2. バリデーションエラーテスト
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    
    // 必須フィールドを空にしてエラーを発生
    await page.fill('[data-testid="action-from-input"]', '');
    await page.fill('[data-testid="action-to-input"]', 'Target');
    await page.fill('[data-testid="action-message-input"]', 'Error test message');
    await page.click('[data-testid="action-save-btn"]');

    // エラーメッセージが表示されることを確認
    const errorMessage = await page.waitForSelector('[data-testid="error-message"]', { state: 'visible' });
    expect(errorMessage).toBeTruthy();

    const errorText = await page.textContent('[data-testid="error-message"]');
    expect(errorText).toContain('必須');

    // フィールドが赤色でハイライトされることを確認
    const fieldHighlight = await page.evaluate(() => {
      const field = document.querySelector('[data-testid="action-from-input"]');
      const computedStyle = window.getComputedStyle(field);
      return computedStyle.borderColor;
    });
    expect(fieldHighlight).toContain('rgb(255'); // 赤系の色

    // 3. ネットワークエラーシミュレーション
    await page.route('**/api/actions', route => {
      route.abort('failed');
    });

    await page.fill('[data-testid="action-from-input"]', 'NetworkTest');
    await page.click('[data-testid="action-save-btn"]');

    // ネットワークエラー通知の確認
    const networkErrorNotification = await page.waitForSelector('[data-testid="network-error-notification"]', { state: 'visible' });
    expect(networkErrorNotification).toBeTruthy();

    // 4. パーサーエラーハンドリング
    await page.evaluate(() => {
      // 意図的にパーサーエラーを発生
      window.PlantUMLParser.parse('invalid@plantuml@syntax^^^');
    });

    const parserErrorLog = await page.evaluate(() => {
      return window.ErrorHandler.getLastError();
    });

    expect(parserErrorLog).toEqual(
      expect.objectContaining({
        type: 'parser_error',
        severity: 'high',
        recovered: expect.any(Boolean)
      })
    );

    // 5. JavaScript実行時エラー
    await page.evaluate(() => {
      try {
        // 存在しないメソッドを呼び出してエラーを発生
        window.nonExistentObject.nonExistentMethod();
      } catch (error) {
        window.ErrorHandler.handleError(error, 'runtime_error');
      }
    });

    const runtimeErrorHandled = await page.evaluate(() => {
      return window.ErrorHandler.getErrorHistory().some(err => err.type === 'runtime_error');
    });

    expect(runtimeErrorHandled).toBe(true);

    // ルートを復元
    await page.unroute('**/api/actions');
  });

  test('自動復旧メカニズムテスト', async () => {
    test.setTimeout(90000);

    // 1. 状態破損シミュレーション
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'Source1');
    await page.fill('[data-testid="action-to-input"]', 'Target1');
    await page.fill('[data-testid="action-message-input"]', 'Message1');
    await page.click('[data-testid="action-save-btn"]');

    // 正常な状態を保存
    const validState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    // 状態を意図的に破損
    await page.evaluate(() => {
      const corruptedState = {
        actions: [{ id: null, from: undefined, to: 'corrupted' }],
        version: 'invalid',
        timestamp: 'not_a_number'
      };
      window.GlobalStateManager.setState(corruptedState);
    });

    // 2. 自動復旧の実行
    const recoveryResult = await page.evaluate(() => {
      return window.ErrorRecoveryManager.recoverCorruptedState();
    });

    expect(recoveryResult.success).toBe(true);
    expect(recoveryResult.strategy).toBeDefined();

    // 3. 復旧後の状態確認
    const recoveredState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(recoveredState.actions).toEqual(expect.any(Array));
    expect(recoveredState.version).toEqual(expect.any(Number));
    expect(recoveredState.timestamp).toEqual(expect.any(Number));

    // 4. データ整合性チェック
    const integrityCheck = await page.evaluate(() => {
      return window.DataIntegrityManager.validateState();
    });

    expect(integrityCheck.isValid).toBe(true);
    expect(integrityCheck.errors.length).toBe(0);

    // 5. セッションストレージ復旧テスト
    await page.evaluate(() => {
      // セッションストレージを破損
      sessionStorage.setItem('app_state', 'invalid_json{{{');
    });

    const sessionRecovery = await page.evaluate(() => {
      return window.ErrorRecoveryManager.recoverSessionStorage();
    });

    expect(sessionRecovery.success).toBe(true);

    // 6. ローカルストレージ復旧テスト
    await page.evaluate(() => {
      // ローカルストレージを破損
      localStorage.setItem('persistent_state', '{"incomplete": json}');
    });

    const localRecovery = await page.evaluate(() => {
      return window.ErrorRecoveryManager.recoverLocalStorage();
    });

    expect(localRecovery.success).toBe(true);

    // 7. メモリリーク復旧
    await page.evaluate(() => {
      // 意図的にメモリを大量消費
      const memoryHog = [];
      for (let i = 0; i < 100000; i++) {
        memoryHog.push(new Array(1000).fill('memory_test'));
      }
      window.testMemoryHog = memoryHog;
    });

    const memoryRecovery = await page.evaluate(() => {
      return window.ErrorRecoveryManager.recoverMemoryLeak();
    });

    expect(memoryRecovery.success).toBe(true);

    // メモリが解放されたことを確認
    const memoryAfterRecovery = await page.evaluate(() => {
      return typeof window.testMemoryHog;
    });

    expect(memoryAfterRecovery).toBe('undefined');
  });

  test('ユーザー通知システムテスト', async () => {
    test.setTimeout(60000);

    // 1. 成功通知テスト
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'NotificationTest');
    await page.fill('[data-testid="action-to-input"]', 'Target');
    await page.fill('[data-testid="action-message-input"]', 'Success message');
    await page.click('[data-testid="action-save-btn"]');

    // 成功通知の表示確認
    const successNotification = await page.waitForSelector('[data-testid="success-notification"]', { state: 'visible' });
    expect(successNotification).toBeTruthy();

    const successMessage = await page.textContent('[data-testid="success-notification"]');
    expect(successMessage).toContain('保存');

    // 通知が自動で消えることを確認
    await page.waitForSelector('[data-testid="success-notification"]', { state: 'hidden', timeout: 5000 });

    // 2. 警告通知テスト
    await page.evaluate(() => {
      window.NotificationManager.showWarning('テスト警告メッセージ');
    });

    const warningNotification = await page.waitForSelector('[data-testid="warning-notification"]', { state: 'visible' });
    expect(warningNotification).toBeTruthy();

    const warningMessage = await page.textContent('[data-testid="warning-notification"]');
    expect(warningMessage).toContain('警告');

    // 3. エラー通知テスト
    await page.evaluate(() => {
      window.NotificationManager.showError('テストエラーメッセージ', { persistent: true });
    });

    const errorNotification = await page.waitForSelector('[data-testid="error-notification"]', { state: 'visible' });
    expect(errorNotification).toBeTruthy();

    // 永続的エラー通知は手動で閉じる必要があることを確認
    await page.waitForTimeout(2000);
    const errorStillVisible = await page.isVisible('[data-testid="error-notification"]');
    expect(errorStillVisible).toBe(true);

    // 手動で閉じる
    await page.click('[data-testid="error-notification-close"]');
    await page.waitForSelector('[data-testid="error-notification"]', { state: 'hidden' });

    // 4. 情報通知テスト
    await page.evaluate(() => {
      window.NotificationManager.showInfo('システム情報メッセージ');
    });

    const infoNotification = await page.waitForSelector('[data-testid="info-notification"]', { state: 'visible' });
    expect(infoNotification).toBeTruthy();

    // 5. 通知スタッキングテスト
    await page.evaluate(() => {
      window.NotificationManager.showInfo('通知1');
      window.NotificationManager.showWarning('通知2');
      window.NotificationManager.showError('通知3');
    });

    const allNotifications = await page.locator('[class*="notification"]').count();
    expect(allNotifications).toBeGreaterThanOrEqual(3);

    // 通知の位置とスタッキングを確認
    const notificationPositions = await page.evaluate(() => {
      const notifications = document.querySelectorAll('[class*="notification"]');
      return Array.from(notifications).map((notif, index) => ({
        index,
        top: notif.getBoundingClientRect().top,
        zIndex: window.getComputedStyle(notif).zIndex
      }));
    });

    // 新しい通知が上に表示されることを確認
    for (let i = 1; i < notificationPositions.length; i++) {
      expect(parseInt(notificationPositions[i].zIndex)).toBeGreaterThanOrEqual(parseInt(notificationPositions[i-1].zIndex));
    }

    // 6. アクション付き通知テスト
    await page.evaluate(() => {
      window.NotificationManager.showActionNotification('操作が必要です', {
        actions: [
          { label: '再試行', action: 'retry' },
          { label: 'キャンセル', action: 'cancel' }
        ]
      });
    });

    const actionNotification = await page.waitForSelector('[data-testid="action-notification"]', { state: 'visible' });
    expect(actionNotification).toBeTruthy();

    // アクションボタンが表示されることを確認
    const retryButton = await page.isVisible('[data-testid="notification-action-retry"]');
    const cancelButton = await page.isVisible('[data-testid="notification-action-cancel"]');
    expect(retryButton).toBe(true);
    expect(cancelButton).toBe(true);

    // アクションボタンをクリック
    await page.click('[data-testid="notification-action-retry"]');

    // アクションが実行されたことを確認
    const actionResult = await page.evaluate(() => {
      return window.NotificationManager.getLastActionResult();
    });

    expect(actionResult.action).toBe('retry');
  });

  test('エラーログと報告テスト', async () => {
    test.setTimeout(60000);

    // 1. エラーログ収集テスト
    const testErrors = [
      { type: 'validation', message: 'バリデーションエラー', severity: 'medium' },
      { type: 'network', message: 'ネットワークエラー', severity: 'high' },
      { type: 'parser', message: 'パーサーエラー', severity: 'low' }
    ];

    for (const error of testErrors) {
      await page.evaluate((err) => {
        window.ErrorHandler.logError(err.type, err.message, err.severity);
      }, error);
    }

    // エラーログが正しく記録されていることを確認
    const errorLog = await page.evaluate(() => {
      return window.ErrorHandler.getErrorHistory();
    });

    expect(errorLog.length).toBeGreaterThanOrEqual(testErrors.length);

    testErrors.forEach(testError => {
      expect(errorLog).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: testError.type,
            message: testError.message,
            severity: testError.severity,
            timestamp: expect.any(Number)
          })
        ])
      );
    });

    // 2. エラー統計の確認
    const errorStats = await page.evaluate(() => {
      return window.ErrorHandler.getErrorStatistics();
    });

    expect(errorStats).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        byType: expect.any(Object),
        bySeverity: expect.any(Object),
        recent: expect.any(Array)
      })
    );

    // 3. エラー報告システムテスト
    const reportGeneration = await page.evaluate(() => {
      return window.ErrorHandler.generateErrorReport();
    });

    expect(reportGeneration).toEqual(
      expect.objectContaining({
        reportId: expect.any(String),
        timestamp: expect.any(Number),
        summary: expect.any(Object),
        details: expect.any(Array)
      })
    );

    // 4. 重複エラー検出
    await page.evaluate(() => {
      // 同じエラーを複数回発生
      for (let i = 0; i < 5; i++) {
        window.ErrorHandler.logError('duplicate', '重複エラーテスト', 'low');
      }
    });

    const duplicateStats = await page.evaluate(() => {
      return window.ErrorHandler.getDuplicateErrorStats();
    });

    expect(duplicateStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: '重複エラーテスト',
          count: 5
        })
      ])
    );

    // 5. エラーレベルエスカレーション
    await page.evaluate(() => {
      // 同じタイプのエラーを大量発生でエスカレーション
      for (let i = 0; i < 10; i++) {
        window.ErrorHandler.logError('escalation_test', `エスカレーションテスト ${i}`, 'low');
      }
    });

    const escalationResult = await page.evaluate(() => {
      return window.ErrorHandler.checkErrorEscalation('escalation_test');
    });

    expect(escalationResult.shouldEscalate).toBe(true);
    expect(escalationResult.newSeverity).toBe('medium');
  });

  test('フォールバック戦略テスト', async () => {
    test.setTimeout(60000);

    // 1. PlantUMLパーサーフォールバック
    await page.evaluate(() => {
      // メインパーサーを無効化
      window.PlantUMLParser.mainParser = null;
    });

    // フォールバックパーサーが動作することを確認
    const fallbackParseResult = await page.evaluate(() => {
      return window.PlantUMLParser.parse('A -> B: test message');
    });

    expect(fallbackParseResult.success).toBe(true);
    expect(fallbackParseResult.usedFallback).toBe(true);

    // 2. ストレージフォールバック
    await page.evaluate(() => {
      // LocalStorageを無効化
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: false
      });
    });

    const storageResult = await page.evaluate(() => {
      return window.StorageManager.save('test_key', 'test_value');
    });

    expect(storageResult.success).toBe(true);
    expect(storageResult.method).toBe('memory'); // フォールバック先

    // 3. APIフォールバック
    await page.route('**/api/primary/**', route => {
      route.abort('failed');
    });

    const apiResult = await page.evaluate(() => {
      return window.APIManager.request('/api/primary/test');
    });

    expect(apiResult.success).toBe(true);
    expect(apiResult.endpoint).toContain('fallback');

    // 4. レンダリングフォールバック
    await page.evaluate(() => {
      // WebGL描画を無効化
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');
      if (context) {
        context.getExtension = () => null;
      }
    });

    const renderResult = await page.evaluate(() => {
      return window.DiagramRenderer.render('test diagram');
    });

    expect(renderResult.success).toBe(true);
    expect(renderResult.method).toBe('canvas2d'); // WebGLフォールバック

    // 5. 機能degradationテスト
    await page.evaluate(() => {
      // 高度な機能を無効化
      window.AdvancedFeatures.enabled = false;
    });

    const degradedMode = await page.evaluate(() => {
      return window.FeatureManager.checkDegradedMode();
    });

    expect(degradedMode.active).toBe(true);
    expect(degradedMode.availableFeatures.length).toBeLessThan(degradedMode.allFeatures.length);

    await page.unroute('**/api/primary/**');
  });

  test('データ整合性保護テスト', async () => {
    test.setTimeout(60000);

    // 1. 初期データを作成
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'DataIntegrity');
    await page.fill('[data-testid="action-to-input"]', 'Test');
    await page.fill('[data-testid="action-message-input"]', 'Integrity test message');
    await page.click('[data-testid="action-save-btn"]');

    // 2. チェックサム検証
    const checksum = await page.evaluate(() => {
      return window.DataIntegrityManager.calculateChecksum();
    });

    expect(checksum).toBeDefined();
    expect(checksum.length).toBeGreaterThan(0);

    // 3. データ変更の検出
    await page.evaluate(() => {
      // データを直接変更
      const actions = window.GlobalStateManager.getState().actions;
      if (actions.length > 0) {
        actions[0].message = 'Tampered message';
      }
    });

    const integrityCheck = await page.evaluate(() => {
      return window.DataIntegrityManager.verifyIntegrity();
    });

    expect(integrityCheck.isValid).toBe(false);
    expect(integrityCheck.tamperedFields.length).toBeGreaterThan(0);

    // 4. 自動修復
    const repairResult = await page.evaluate(() => {
      return window.DataIntegrityManager.repairData();
    });

    expect(repairResult.success).toBe(true);
    expect(repairResult.repairedFields.length).toBeGreaterThan(0);

    // 5. バックアップからの復元
    const backupResult = await page.evaluate(() => {
      return window.DataIntegrityManager.createBackup();
    });

    expect(backupResult.success).toBe(true);

    // データを破損
    await page.evaluate(() => {
      window.GlobalStateManager.setState({ corrupted: true });
    });

    // バックアップから復元
    const restoreResult = await page.evaluate(() => {
      return window.DataIntegrityManager.restoreFromBackup();
    });

    expect(restoreResult.success).toBe(true);

    // 復元後のデータ確認
    const restoredData = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(restoredData.actions).toBeDefined();
    expect(restoredData.corrupted).toBeUndefined();
  });
});