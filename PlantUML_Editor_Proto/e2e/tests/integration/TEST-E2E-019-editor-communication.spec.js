// TEST-E2E-019: エディター間通信テスト（5 SP）
// ActionEditor ↔ ConditionEditor ↔ LoopEditor ↔ ParallelEditor communication
import { test, expect } from '@playwright/test';

test.describe('TEST-E2E-019: エディター間通信テスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // アプリケーション初期化を待機
    await page.waitForFunction(() => {
      return window.PlantUMLParser && 
             window.ActionEditor && 
             window.ConditionEditor &&
             window.LoopEditor &&
             window.ParallelEditor;
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('ActionEditor ↔ ConditionEditor 通信テスト', async () => {
    test.setTimeout(60000);

    // 1. ActionEditorでアクションを作成
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    
    const actionData = {
      from: 'ユーザー',
      to: 'システム',
      message: 'ログイン要求を送信'
    };

    await page.fill('[data-testid="action-from-input"]', actionData.from);
    await page.fill('[data-testid="action-to-input"]', actionData.to);
    await page.fill('[data-testid="action-message-input"]', actionData.message);
    await page.click('[data-testid="action-save-btn"]');

    // 2. アクションIDを取得
    const actionId = await page.evaluate(() => {
      return window.ActionEditor.getLastCreatedActionId();
    });

    // 3. ConditionEditorを開き、作成したアクションが利用可能か確認
    await page.click('[data-testid="condition-editor-btn"]');
    await page.waitForSelector('[data-testid="condition-editor-modal"]');

    const availableActions = await page.evaluate(() => {
      return window.ConditionEditor.getAvailableActions();
    });

    expect(availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: actionId,
          from: actionData.from,
          to: actionData.to,
          message: actionData.message
        })
      ])
    );

    // 4. ConditionEditorでアクションに条件を追加
    const condition = '認証状態 == "未認証"';
    await page.selectOption('[data-testid="condition-action-select"]', actionId);
    await page.fill('[data-testid="condition-input"]', condition);
    await page.click('[data-testid="condition-apply-btn"]');

    // 5. ActionEditorで条件が反映されているか確認
    await page.click('[data-testid="action-editor-btn"]');
    const updatedAction = await page.evaluate((id) => {
      return window.ActionEditor.getActionById(id);
    }, actionId);

    expect(updatedAction.condition).toBe(condition);

    // 6. 通信イベントログを検証
    const communicationLog = await page.evaluate(() => {
      return window.EditorCommunicationManager.getEventLog();
    });

    expect(communicationLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'action_created',
          source: 'ActionEditor',
          target: 'ConditionEditor',
          data: expect.objectContaining({ id: actionId })
        }),
        expect.objectContaining({
          type: 'condition_applied',
          source: 'ConditionEditor',
          target: 'ActionEditor',
          data: expect.objectContaining({ actionId, condition })
        })
      ])
    );
  });

  test('LoopEditor ↔ ParallelEditor 同期テスト', async () => {
    test.setTimeout(60000);

    // 1. LoopEditorでループ処理を作成
    await page.click('[data-testid="loop-editor-btn"]');
    await page.waitForSelector('[data-testid="loop-editor-modal"]');

    const loopData = {
      type: 'for',
      condition: 'i < 10',
      variable: 'i',
      increment: 'i++'
    };

    await page.selectOption('[data-testid="loop-type-select"]', loopData.type);
    await page.fill('[data-testid="loop-condition-input"]', loopData.condition);
    await page.fill('[data-testid="loop-variable-input"]', loopData.variable);
    await page.fill('[data-testid="loop-increment-input"]', loopData.increment);
    await page.click('[data-testid="loop-save-btn"]');

    const loopId = await page.evaluate(() => {
      return window.LoopEditor.getLastCreatedLoopId();
    });

    // 2. ParallelEditorを開き、ループ処理を並列化
    await page.click('[data-testid="parallel-editor-btn"]');
    await page.waitForSelector('[data-testid="parallel-editor-modal"]');

    const parallelConfig = {
      maxThreads: 4,
      chunkSize: 2,
      strategy: 'round-robin'
    };

    await page.selectOption('[data-testid="parallel-target-select"]', loopId);
    await page.fill('[data-testid="parallel-max-threads"]', parallelConfig.maxThreads.toString());
    await page.fill('[data-testid="parallel-chunk-size"]', parallelConfig.chunkSize.toString());
    await page.selectOption('[data-testid="parallel-strategy"]', parallelConfig.strategy);
    await page.click('[data-testid="parallel-apply-btn"]');

    // 3. LoopEditorで並列化設定が反映されているか確認
    await page.click('[data-testid="loop-editor-btn"]');
    const updatedLoop = await page.evaluate((id) => {
      return window.LoopEditor.getLoopById(id);
    }, loopId);

    expect(updatedLoop.parallelConfig).toEqual(parallelConfig);

    // 4. 相互依存関係の検証
    const dependencies = await page.evaluate(() => {
      return window.EditorDependencyManager.getDependencies();
    });

    expect(dependencies).toEqual(
      expect.objectContaining({
        [loopId]: expect.arrayContaining(['parallel_processor'])
      })
    );

    // 5. 状態同期の確認
    await page.evaluate((id) => {
      window.LoopEditor.updateLoop(id, { condition: 'i < 20' });
    }, loopId);

    await page.waitForTimeout(100); // 同期待機

    const parallelState = await page.evaluate(() => {
      return window.ParallelEditor.getCurrentState();
    });

    expect(parallelState.targetLoop.condition).toBe('i < 20');
  });

  test('クロスエディター状態一貫性テスト', async () => {
    test.setTimeout(90000);

    const testScenarios = [
      {
        editor: 'ActionEditor',
        action: 'create',
        data: { from: 'A', to: 'B', message: 'テストメッセージ1' }
      },
      {
        editor: 'ConditionEditor',
        action: 'modify',
        data: { condition: 'status == "active"' }
      },
      {
        editor: 'LoopEditor',
        action: 'create',
        data: { type: 'while', condition: 'hasNext()' }
      },
      {
        editor: 'ParallelEditor',
        action: 'optimize',
        data: { threads: 8, strategy: 'work-stealing' }
      }
    ];

    const stateSnapshots = [];

    for (const scenario of testScenarios) {
      // 操作前の状態を記録
      const beforeState = await page.evaluate(() => {
        return {
          actions: window.ActionEditor.getAllActions(),
          conditions: window.ConditionEditor.getAllConditions(),
          loops: window.LoopEditor.getAllLoops(),
          parallels: window.ParallelEditor.getAllConfigurations()
        };
      });

      // 各エディターで操作を実行
      switch (scenario.editor) {
        case 'ActionEditor':
          await page.click('[data-testid="action-editor-btn"]');
          await page.waitForSelector('[data-testid="action-editor-modal"]');
          await page.fill('[data-testid="action-from-input"]', scenario.data.from);
          await page.fill('[data-testid="action-to-input"]', scenario.data.to);
          await page.fill('[data-testid="action-message-input"]', scenario.data.message);
          await page.click('[data-testid="action-save-btn"]');
          break;

        case 'ConditionEditor':
          await page.click('[data-testid="condition-editor-btn"]');
          await page.waitForSelector('[data-testid="condition-editor-modal"]');
          await page.fill('[data-testid="condition-input"]', scenario.data.condition);
          await page.click('[data-testid="condition-save-btn"]');
          break;

        case 'LoopEditor':
          await page.click('[data-testid="loop-editor-btn"]');
          await page.waitForSelector('[data-testid="loop-editor-modal"]');
          await page.selectOption('[data-testid="loop-type-select"]', scenario.data.type);
          await page.fill('[data-testid="loop-condition-input"]', scenario.data.condition);
          await page.click('[data-testid="loop-save-btn"]');
          break;

        case 'ParallelEditor':
          await page.click('[data-testid="parallel-editor-btn"]');
          await page.waitForSelector('[data-testid="parallel-editor-modal"]');
          await page.fill('[data-testid="parallel-max-threads"]', scenario.data.threads.toString());
          await page.selectOption('[data-testid="parallel-strategy"]', scenario.data.strategy);
          await page.click('[data-testid="parallel-apply-btn"]');
          break;
      }

      // 操作後の状態を記録
      await page.waitForTimeout(200); // 状態同期待機
      const afterState = await page.evaluate(() => {
        return {
          actions: window.ActionEditor.getAllActions(),
          conditions: window.ConditionEditor.getAllConditions(),
          loops: window.LoopEditor.getAllLoops(),
          parallels: window.ParallelEditor.getAllConfigurations()
        };
      });

      stateSnapshots.push({
        scenario,
        before: beforeState,
        after: afterState
      });
    }

    // 状態一貫性の検証
    const finalGlobalState = await page.evaluate(() => {
      return window.GlobalStateManager.getState();
    });

    // すべての変更が正しく反映されているか確認
    expect(finalGlobalState.actions.length).toBeGreaterThan(0);
    expect(finalGlobalState.conditions.length).toBeGreaterThan(0);
    expect(finalGlobalState.loops.length).toBeGreaterThan(0);
    expect(finalGlobalState.parallels.length).toBeGreaterThan(0);

    // 依存関係の整合性確認
    const dependencyGraph = await page.evaluate(() => {
      return window.DependencyResolver.buildGraph();
    });

    expect(dependencyGraph.isValid).toBe(true);
    expect(dependencyGraph.cycles.length).toBe(0);
  });

  test('イベント伝播検証テスト', async () => {
    test.setTimeout(60000);

    // イベントリスナーを設定
    await page.evaluate(() => {
      window.testEventLog = [];
      
      const eventTypes = [
        'action.created', 'action.updated', 'action.deleted',
        'condition.created', 'condition.updated', 'condition.deleted',
        'loop.created', 'loop.updated', 'loop.deleted',
        'parallel.created', 'parallel.updated', 'parallel.deleted'
      ];

      eventTypes.forEach(eventType => {
        window.EventBus.on(eventType, (data) => {
          window.testEventLog.push({
            type: eventType,
            timestamp: Date.now(),
            data: data
          });
        });
      });
    });

    // 1. ActionEditor操作
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    await page.fill('[data-testid="action-from-input"]', 'Client');
    await page.fill('[data-testid="action-to-input"]', 'Server');
    await page.fill('[data-testid="action-message-input"]', 'API Request');
    await page.click('[data-testid="action-save-btn"]');

    // 2. ConditionEditor操作
    await page.click('[data-testid="condition-editor-btn"]');
    await page.waitForSelector('[data-testid="condition-editor-modal"]');
    await page.fill('[data-testid="condition-input"]', 'authenticated == true');
    await page.click('[data-testid="condition-save-btn"]');

    // 3. イベントログを検証
    await page.waitForTimeout(500); // イベント伝播待機

    const eventLog = await page.evaluate(() => {
      return window.testEventLog;
    });

    // action.created イベントが記録されているか
    expect(eventLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'action.created',
          data: expect.objectContaining({
            from: 'Client',
            to: 'Server',
            message: 'API Request'
          })
        })
      ])
    );

    // condition.created イベントが記録されているか
    expect(eventLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'condition.created',
          data: expect.objectContaining({
            condition: 'authenticated == true'
          })
        })
      ])
    );

    // イベント順序の確認
    const actionEvent = eventLog.find(e => e.type === 'action.created');
    const conditionEvent = eventLog.find(e => e.type === 'condition.created');
    
    expect(actionEvent.timestamp).toBeLessThan(conditionEvent.timestamp);
  });

  test('データフロー整合性テスト', async () => {
    test.setTimeout(60000);

    // 複雑なデータフローを作成
    const workflow = {
      actions: [
        { from: 'User', to: 'Frontend', message: 'ユーザー入力' },
        { from: 'Frontend', to: 'Backend', message: 'データ検証' },
        { from: 'Backend', to: 'Database', message: 'データ保存' }
      ],
      conditions: [
        '入力値 != null',
        '認証済み == true',
        'データベース接続 == "active"'
      ],
      loops: [
        { type: 'for', condition: 'retry < 3', variable: 'retry' }
      ]
    };

    // 1. アクションを順次作成
    for (const action of workflow.actions) {
      await page.click('[data-testid="action-editor-btn"]');
      await page.waitForSelector('[data-testid="action-editor-modal"]');
      await page.fill('[data-testid="action-from-input"]', action.from);
      await page.fill('[data-testid="action-to-input"]', action.to);
      await page.fill('[data-testid="action-message-input"]', action.message);
      await page.click('[data-testid="action-save-btn"]');
      await page.waitForTimeout(100);
    }

    // 2. 条件を順次追加
    for (const condition of workflow.conditions) {
      await page.click('[data-testid="condition-editor-btn"]');
      await page.waitForSelector('[data-testid="condition-editor-modal"]');
      await page.fill('[data-testid="condition-input"]', condition);
      await page.click('[data-testid="condition-save-btn"]');
      await page.waitForTimeout(100);
    }

    // 3. ループを作成
    for (const loop of workflow.loops) {
      await page.click('[data-testid="loop-editor-btn"]');
      await page.waitForSelector('[data-testid="loop-editor-modal"]');
      await page.selectOption('[data-testid="loop-type-select"]', loop.type);
      await page.fill('[data-testid="loop-condition-input"]', loop.condition);
      await page.fill('[data-testid="loop-variable-input"]', loop.variable);
      await page.click('[data-testid="loop-save-btn"]');
      await page.waitForTimeout(100);
    }

    // 4. データフロー整合性を検証
    const dataFlowAnalysis = await page.evaluate(() => {
      return window.DataFlowAnalyzer.analyze();
    });

    expect(dataFlowAnalysis.isValid).toBe(true);
    expect(dataFlowAnalysis.cycles).toEqual([]);
    expect(dataFlowAnalysis.unreachableNodes).toEqual([]);
    
    // データ依存関係の確認
    expect(dataFlowAnalysis.dependencies.length).toBeGreaterThan(0);
    expect(dataFlowAnalysis.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: expect.any(String),
          target: expect.any(String),
          type: expect.stringMatching(/^(data|control|dependency)$/)
        })
      ])
    );
  });

  test('エラー状態同期テスト', async () => {
    test.setTimeout(60000);

    // 1. ActionEditorで意図的にエラーを発生
    await page.click('[data-testid="action-editor-btn"]');
    await page.waitForSelector('[data-testid="action-editor-modal"]');
    
    // 無効なデータで保存を試行
    await page.fill('[data-testid="action-from-input"]', ''); // 空文字でエラー
    await page.fill('[data-testid="action-to-input"]', 'Target');
    await page.fill('[data-testid="action-message-input"]', 'Test Message');
    await page.click('[data-testid="action-save-btn"]');

    // 2. エラー状態が他のエディターに伝播されるか確認
    await page.waitForTimeout(200);

    const errorStates = await page.evaluate(() => {
      return {
        action: window.ActionEditor.getErrorState(),
        condition: window.ConditionEditor.getErrorState(),
        loop: window.LoopEditor.getErrorState(),
        parallel: window.ParallelEditor.getErrorState()
      };
    });

    // ActionEditorでエラーが発生していることを確認
    expect(errorStates.action.hasError).toBe(true);
    expect(errorStates.action.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'from',
          message: expect.stringContaining('必須')
        })
      ])
    );

    // 3. 関連するエディターでもエラー状態が反映されるか確認
    await page.click('[data-testid="condition-editor-btn"]');
    await page.waitForSelector('[data-testid="condition-editor-modal"]');
    
    const conditionEditorState = await page.evaluate(() => {
      return window.ConditionEditor.getRelatedErrorState();
    });

    expect(conditionEditorState.relatedErrors.length).toBeGreaterThan(0);

    // 4. エラー修復後の状態同期を確認
    await page.click('[data-testid="action-editor-btn"]');
    await page.fill('[data-testid="action-from-input"]', 'ValidSource');
    await page.click('[data-testid="action-save-btn"]');

    await page.waitForTimeout(200);

    const recoveredStates = await page.evaluate(() => {
      return {
        action: window.ActionEditor.getErrorState(),
        condition: window.ConditionEditor.getRelatedErrorState()
      };
    });

    expect(recoveredStates.action.hasError).toBe(false);
    expect(recoveredStates.condition.relatedErrors.length).toBe(0);
  });
});