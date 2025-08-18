// TEST-E2E-020: 状態管理統合テスト（5 SP）
// Global state consistency, Undo/redo, State persistence and recovery
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-020: 状態管理統合テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 状態管理システムの初期化を待機
    await page.waitForFunction(() => {
      return window.GlobalStateManager && 
             window.UndoRedoManager && 
             window.StatePersistenceManager &&
             window.StateRecoveryManager;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('グローバル状態一貫性テスト', async () => {
    test.setTimeout(90000);

    // 1. 初期状態を確認
    const initialState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(initialState).toEqual(
      expect.objectContaining({
        actions: [],
        conditions: [],
        loops: [],
        parallels: [],
        version: expect.any(Number),
        timestamp: expect.any(Number)
      })
    );

    // 2. 複数のエディターで同時に操作を実行
    const operations = [
      {
        type: 'action',
        data: { from: 'Client', to: 'Server', message: 'HTTP Request' }
      },
      {
        type: 'condition',
        data: { condition: 'response.status == 200' }
      },
      {
        type: 'loop',
        data: { type: 'for', condition: 'i < items.length', variable: 'i' }
      }
    ];

    // 操作を並行実行
    await Promise.all(operations.map(async (op) => {
      switch (op.type) {
        case 'action':
          await page.click('[data-testid="action-editor-btn"]');
          await page.waitForSelector('[data-testid="action-editor-modal"]');
          await page.fill('[data-testid="action-from-input"]', op.data.from);
          await page.fill('[data-testid="action-to-input"]', op.data.to);
          await page.fill('[data-testid="action-message-input"]', op.data.message);
          await page.click('[data-testid="action-save-btn"]');
          break;
        
        case 'condition':
          await page.click('[data-testid="condition-editor-btn"]');
          await page.waitForSelector('[data-testid="condition-editor-modal"]');
          await page.fill('[data-testid="condition-input"]', op.data.condition);
          await page.click('[data-testid="condition-save-btn"]');
          break;
        
        case 'loop':
          await page.click('[data-testid="loop-editor-btn"]');
          await page.waitForSelector('[data-testid="loop-editor-modal"]');
          await page.selectOption('[data-testid="loop-type-select"]', op.data.type);
          await page.fill('[data-testid="loop-condition-input"]', op.data.condition);
          await page.fill('[data-testid="loop-variable-input"]', op.data.variable);
          await page.click('[data-testid="loop-save-btn"]');
          break;
      }
    }));

    // 3. 状態同期を待機
    await page.waitForTimeout(500);

    // 4. 最終状態を検証
    const finalState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(finalState.actions.length).toBe(1);
    expect(finalState.conditions.length).toBe(1);
    expect(finalState.loops.length).toBe(1);
    expect(finalState.version).toBeGreaterThan(initialState.version);

    // 5. 状態の整合性確認
    const stateIntegrity = await page.evaluate(() => {
      return window.GlobalStateManager.validateIntegrity();
    });

    expect(stateIntegrity.isValid).toBe(true);
    expect(stateIntegrity.errors).toEqual([]);

    // 6. 各エディターの状態とグローバル状態の一致を確認
    const editorStates = await page.evaluate(() => {
      return {
        actions: window.ActionEditor.getAllActions(),
        conditions: window.ConditionEditor.getAllConditions(),
        loops: window.LoopEditor.getAllLoops()
      };
    });

    expect(editorStates.actions).toEqual(finalState.actions);
    expect(editorStates.conditions).toEqual(finalState.conditions);
    expect(editorStates.loops).toEqual(finalState.loops);
  });

  test('Undo/Redo機能横断テスト', async () => {
    test.setTimeout(90000);

    // 1. 操作履歴を作成
    const operations = [
      { action: 'create_action', data: { from: 'A', to: 'B', message: 'Message 1' } },
      { action: 'create_condition', data: { condition: 'x > 0' } },
      { action: 'create_action', data: { from: 'B', to: 'C', message: 'Message 2' } },
      { action: 'create_loop', data: { type: 'while', condition: 'hasNext()' } },
      { action: 'update_action', data: { id: 'action1', message: 'Updated Message 1' } }
    ];

    let actionIds = [];

    for (const op of operations) {
      switch (op.action) {
        case 'create_action':
          await page.click('[data-testid="action-editor-btn"]');
          await page.waitForSelector('[data-testid="action-editor-modal"]');
          await page.fill('[data-testid="action-from-input"]', op.data.from);
          await page.fill('[data-testid="action-to-input"]', op.data.to);
          await page.fill('[data-testid="action-message-input"]', op.data.message);
          await page.click('[data-testid="action-save-btn"]');
          
          const actionId = await page.evaluate(() => {
            return window.ActionEditor.getLastCreatedActionId();
          });
          actionIds.push(actionId);
          break;

        case 'create_condition':
          await page.click('[data-testid="condition-editor-btn"]');
          await page.waitForSelector('[data-testid="condition-editor-modal"]');
          await page.fill('[data-testid="condition-input"]', op.data.condition);
          await page.click('[data-testid="condition-save-btn"]');
          break;

        case 'create_loop':
          await page.click('[data-testid="loop-editor-btn"]');
          await page.waitForSelector('[data-testid="loop-editor-modal"]');
          await page.selectOption('[data-testid="loop-type-select"]', op.data.type);
          await page.fill('[data-testid="loop-condition-input"]', op.data.condition);
          await page.click('[data-testid="loop-save-btn"]');
          break;

        case 'update_action':
          if (actionIds.length > 0) {
            await page.click('[data-testid="action-editor-btn"]');
            await page.waitForSelector('[data-testid="action-editor-modal"]');
            await page.click(`[data-testid="action-item-${actionIds[0]}"]`);
            await page.fill('[data-testid="action-message-input"]', op.data.message);
            await page.click('[data-testid="action-update-btn"]');
          }
          break;
      }
      
      await page.waitForTimeout(200); // 操作間の待機
    }

    // 2. 操作履歴の確認
    const history = await page.evaluate(() => {
      return window.UndoRedoManager.getHistory();
    });

    expect(history.length).toBe(operations.length);

    // 3. Undo操作テスト（3回）
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
    }

    const stateAfterUndo = await page.evaluate(() => {
      return {
        state: window.GlobalStateManager.getState(),
        canUndo: window.UndoRedoManager.canUndo(),
        canRedo: window.UndoRedoManager.canRedo()
      };
    });

    expect(stateAfterUndo.canRedo).toBe(true);
    expect(stateAfterUndo.state.actions.length).toBeLessThan(2);

    // 4. Redo操作テスト（2回）
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(200);
    }

    const stateAfterRedo = await page.evaluate(() => {
      return {
        state: window.GlobalStateManager.getState(),
        canUndo: window.UndoRedoManager.canUndo(),
        canRedo: window.UndoRedoManager.canRedo()
      };
    });

    expect(stateAfterRedo.canUndo).toBe(true);

    // 5. 各エディターでUndo/Redoが正しく反映されているか確認
    const editorStatesAfterRedo = await page.evaluate(() => {
      return {
        actions: window.ActionEditor.getAllActions(),
        conditions: window.ConditionEditor.getAllConditions(),
        loops: window.LoopEditor.getAllLoops()
      };
    });

    // エディターの状態がグローバル状態と一致していることを確認
    expect(editorStatesAfterRedo.actions).toEqual(stateAfterRedo.state.actions);
    expect(editorStatesAfterRedo.conditions).toEqual(stateAfterRedo.state.conditions);
    expect(editorStatesAfterRedo.loops).toEqual(stateAfterRedo.state.loops);
  });

  test('状態永続化と復旧テスト', async () => {
    test.setTimeout(60000);

    // 1. 複雑な状態を作成
    const testData = {
      actions: [
        { from: 'User', to: 'UI', message: 'Click button' },
        { from: 'UI', to: 'API', message: 'Send request' },
        { from: 'API', to: 'DB', message: 'Query data' }
      ],
      conditions: [
        'user.isAuthenticated',
        'request.isValid',
        'database.isConnected'
      ],
      loops: [
        { type: 'for', condition: 'i < retryCount', variable: 'i' }
      ]
    };

    // データを作成
    for (const action of testData.actions) {
      await page.click('[data-testid="action-editor-btn"]');
      await page.waitForSelector('[data-testid="action-editor-modal"]');
      await page.fill('[data-testid="action-from-input"]', action.from);
      await page.fill('[data-testid="action-to-input"]', action.to);
      await page.fill('[data-testid="action-message-input"]', action.message);
      await page.click('[data-testid="action-save-btn"]');
    }

    for (const condition of testData.conditions) {
      await page.click('[data-testid="condition-editor-btn"]');
      await page.waitForSelector('[data-testid="condition-editor-modal"]');
      await page.fill('[data-testid="condition-input"]', condition);
      await page.click('[data-testid="condition-save-btn"]');
    }

    // 2. 状態を手動で永続化
    const persistResult = await page.evaluate(() => {
      return window.StatePersistenceManager.saveState();
    });

    expect(persistResult.success).toBe(true);
    expect(persistResult.storageId).toBeDefined();

    // 3. 元の状態を記録
    const originalState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    // 4. 状態をクリア
    await page.evaluate(() => {
      window.GlobalStateManager.clearState();
    });

    const clearedState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(clearedState.actions.length).toBe(0);
    expect(clearedState.conditions.length).toBe(0);

    // 5. 状態を復旧
    const recoveryResult = await page.evaluate((storageId) => {
      return window.StatePersistenceManager.loadState(storageId);
    }, persistResult.storageId);

    expect(recoveryResult.success).toBe(true);

    // 6. 復旧後の状態を確認
    const recoveredState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(recoveredState.actions.length).toBe(originalState.actions.length);
    expect(recoveredState.conditions.length).toBe(originalState.conditions.length);

    // 7. エディターの状態も正しく復旧されているか確認
    const editorStatesAfterRecovery = await page.evaluate(() => {
      return {
        actions: window.ActionEditor.getAllActions(),
        conditions: window.ConditionEditor.getAllConditions()
      };
    });

    expect(editorStatesAfterRecovery.actions.length).toBe(testData.actions.length);
    expect(editorStatesAfterRecovery.conditions.length).toBe(testData.conditions.length);
  });

  test('マルチタブ同期テスト', async () => {
    test.setTimeout(90000);

    // 2つ目のタブを開く
    const secondTab = await page.context().newPage();
    await secondTab.goto('/');
    await secondTab.waitForLoadState('networkidle');
    
    await secondTab.waitForFunction(() => {
      return window.GlobalStateManager && window.MultiTabSyncManager;
    });

    // 1. 最初のタブで操作
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'Tab1');
    await page.fill('[data-testid="action-to-input"]', 'Server');
    await page.fill('[data-testid="action-message-input"]', 'From first tab');
    await page.click('[data-testid="action-save-btn"]');

    // 2. 同期を待機
    await page.waitForTimeout(1000);

    // 3. 2つ目のタブで状態を確認
    const secondTabState = await secondTab.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(secondTabState.actions.length).toBe(1);
    expect(secondTabState.actions[0]).toEqual(
      expect.objectContaining({
        from: 'Tab1',
        to: 'Server',
        message: 'From first tab'
      })
    );

    // 4. 2つ目のタブで操作
    await secondTab.click('[data-testid="condition-editor-btn"]');
    await secondTab.waitForSelector('[data-testid="condition-editor-modal"]');
    await secondTab.fill('[data-testid="condition-input"]', 'tab2.condition == true');
    await secondTab.click('[data-testid="condition-save-btn"]');

    // 5. 同期を待機
    await secondTab.waitForTimeout(1000);

    // 6. 最初のタブで状態を確認
    const firstTabState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    expect(firstTabState.conditions.length).toBe(1);
    expect(firstTabState.conditions[0]).toEqual(
      expect.objectContaining({
        condition: 'tab2.condition == true'
      })
    );

    // 7. 同期ログを確認
    const syncLog = await page.evaluate(() => {
      return window.MultiTabSyncManager.getSyncLog();
    });

    expect(syncLog.length).toBeGreaterThan(0);
    expect(syncLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'state_sync',
          direction: expect.stringMatching(/^(incoming|outgoing)$/)
        })
      ])
    );

    await secondTab.close();
  });

  test('状態競合解決テスト', async () => {
    test.setTimeout(60000);

    // 1. 初期状態を作成
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'Original');
    await page.fill('[data-testid="action-to-input"]', 'Target');
    await page.fill('[data-testid="action-message-input"]', 'Original message');
    await page.click('[data-testid="action-save-btn"]');

    const originalActionId = await page.evaluate(() => {
      return window.ActionEditor.getLastCreatedActionId();
    });

    // 2. 競合状況をシミュレート（同じアクションを同時に更新）
    const conflictingUpdates = [
      { message: 'Update from client 1', from: 'Client1' },
      { message: 'Update from client 2', from: 'Client2' }
    ];

    // 競合更新を並行実行
    await Promise.all(conflictingUpdates.map(async (update, index) => {
      const timestamp = Date.now() + index * 10; // 僅かな時間差
      
      return page.evaluate((actionId, updateData, ts) => {
        return window.StateConflictResolver.scheduleUpdate(actionId, updateData, ts);
      }, originalActionId, update, timestamp);
    }));

    // 3. 競合解決を待機
    await page.waitForTimeout(500);

    // 4. 解決結果を確認
    const conflictResolution = await page.evaluate(() => {
      return window.StateConflictResolver.getLastResolution();
    });

    expect(conflictResolution.strategy).toBeDefined();
    expect(conflictResolution.result).toBeDefined();
    
    // 最新のタイムスタンプの更新が採用されることを確認
    const finalAction = await page.evaluate((id) => {
      return window.ActionEditor.getActionById(id);
    }, originalActionId);

    expect(finalAction.message).toBe(conflictingUpdates[1].message);

    // 5. 競合ログを確認
    const conflictLog = await page.evaluate(() => {
      return window.StateConflictResolver.getConflictLog();
    });

    expect(conflictLog.length).toBeGreaterThan(0);
    expect(conflictLog[0]).toEqual(
      expect.objectContaining({
        type: 'conflict_detected',
        entityId: originalActionId,
        resolution: expect.any(String)
      })
    );
  });

  test('状態マイグレーション検証テスト', async () => {
    test.setTimeout(60000);

    // 1. 旧バージョンの状態をシミュレート
    const legacyState = {
      version: '1.0.0',
      actions: [
        { id: '1', source: 'A', target: 'B', msg: 'Legacy message' } // 旧形式
      ],
      conditions: [
        { id: '1', expr: 'x == 1' } // 旧形式
      ]
    };

    // 2. 旧状態を読み込み
    const migrationResult = await page.evaluate((state) => {
      return window.StateMigrationManager.migrate(state);
    }, legacyState);

    expect(migrationResult.success).toBe(true);
    expect(migrationResult.fromVersion).toBe('1.0.0');
    expect(migrationResult.toVersion).toBeDefined();

    // 3. マイグレーション後の状態を確認
    const migratedState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    // 新形式に変換されていることを確認
    expect(migratedState.actions[0]).toEqual(
      expect.objectContaining({
        from: 'A',         // source → from
        to: 'B',           // target → to
        message: 'Legacy message'  // msg → message
      })
    );

    expect(migratedState.conditions[0]).toEqual(
      expect.objectContaining({
        condition: 'x == 1'  // expr → condition
      })
    );

    // 4. マイグレーションログを確認
    const migrationLog = await page.evaluate(() => {
      return window.StateMigrationManager.getMigrationLog();
    });

    expect(migrationLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'field_renamed',
          oldField: 'source',
          newField: 'from'
        }),
        expect.objectContaining({
          type: 'field_renamed',
          oldField: 'msg',
          newField: 'message'
        })
      ])
    );
  });
});