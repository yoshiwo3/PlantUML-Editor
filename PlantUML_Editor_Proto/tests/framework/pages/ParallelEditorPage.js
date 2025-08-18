/**
 * ParallelEditorPage - 並行処理編集専用ページオブジェクト
 * Sprint3 TEST-005-2実装
 * 
 * 機能:
 * - 並行処理ブロックの編集
 * - スレッドタブ管理（🧵 スレッド[番号]）
 * - 並行アクションの管理
 * - スレッド間の同期制御
 */

import { Page } from '@playwright/test';

export class ParallelEditorPage {
  constructor(page) {
    this.page = page;
    
    // 並行処理編集専用セレクタ
    this.selectors = {
      // メインコンテナ
      parallelEditor: '[data-testid="parallel-editor"]',
      parallelBlock: '[data-testid="parallel-block"]',
      parallelModal: '[data-testid="parallel-modal"]',
      
      // ヘッダー部分
      blockHeader: '[data-testid="parallel-header"]',
      blockIcon: '[data-testid="parallel-icon"]',
      blockLabel: '[data-testid="parallel-label"]',
      expandIcon: '[data-testid="expand-icon"]',
      collapseIcon: '[data-testid="collapse-icon"]',
      
      // スレッドタブ管理（設計書準拠: 🧵 スレッド[番号]）
      threadTabs: '[data-testid="thread-tabs"]',
      threadTab: '[data-testid="thread-tab"]',
      activeThreadTab: '[data-testid="thread-tab"].active',
      threadIcon: '[data-testid="thread-icon"]', // 🧵
      threadNumber: '[data-testid="thread-number"]',
      addThreadButton: '[data-testid="add-thread-button"]', // ➕
      deleteThreadButton: '[data-testid="delete-thread-button"]', // ×
      
      // スレッド内容
      threadContent: '[data-testid="thread-content"]',
      threadContentArea: '[data-thread-content]',
      activeThreadContent: '[data-thread-content].active',
      
      // 並行アクション
      parallelActions: '[data-testid="parallel-actions"]',
      addActionToThread: '[data-testid="add-action-to-thread"]',
      threadActionList: '[data-testid="thread-action-list"]',
      threadActionItem: '.thread-action-item',
      
      // 同期制御
      syncPoints: '[data-testid="sync-points"]',
      addSyncPoint: '[data-testid="add-sync-point"]',
      syncBarrier: '[data-testid="sync-barrier"]',
      joinPoint: '[data-testid="join-point"]',
      
      // スレッド設定
      threadSettings: '[data-testid="thread-settings"]',
      threadPriority: '[data-testid="thread-priority"]',
      threadTimeout: '[data-testid="thread-timeout"]',
      threadName: '[data-testid="thread-name"]',
      
      // バリデーション
      parallelValidation: '[data-testid="parallel-validation"]',
      deadlockWarning: '[data-testid="deadlock-warning"]',
      raceConditionWarning: '[data-testid="race-condition-warning"]',
      performanceWarning: '[data-testid="performance-warning"]',
      
      // 操作ボタン
      confirmParallel: '[data-testid="confirm-parallel"]',
      cancelParallel: '[data-testid="cancel-parallel"]',
      deleteParallel: '[data-testid="delete-parallel"]',
      duplicateParallel: '[data-testid="duplicate-parallel"]',
      
      // プレビュー
      plantUMLPreview: '[data-testid="parallel-plantuml-preview"]',
      executionFlowPreview: '[data-testid="execution-flow-preview"]',
      timingDiagram: '[data-testid="timing-diagram"]'
    };

    // デフォルトスレッド設定
    this.defaultThreadConfig = {
      maxThreads: 8,
      defaultPriority: 'normal',
      defaultTimeout: 30000
    };

    // スレッド優先度
    this.threadPriorities = {
      low: { value: 1, label: '低' },
      normal: { value: 5, label: '標準' },
      high: { value: 9, label: '高' },
      critical: { value: 10, label: '重要' }
    };
  }

  /**
   * 並行処理編集画面を開く
   * @param {string} mode - 編集モード ('new', 'edit', 'inline')
   * @param {number} parallelIndex - 編集する並行処理のインデックス
   */
  async openParallelEditor(mode = 'new', parallelIndex = null) {
    if (mode === 'new') {
      await this.page.click('[data-testid="add-parallel-button"]');
    } else if (mode === 'edit' && parallelIndex !== null) {
      await this.page.click(`[data-parallel-index="${parallelIndex}"] .edit-button`);
    } else if (mode === 'inline' && parallelIndex !== null) {
      await this.page.dblclick(`[data-parallel-index="${parallelIndex}"] .parallel-header`);
    }
    
    // エディターの表示を待機
    const editorSelector = mode === 'inline' ? this.selectors.parallelBlock : this.selectors.parallelModal;
    await this.page.waitForSelector(editorSelector, { state: 'visible' });
    
    return this;
  }

  /**
   * 基本的な並行処理を設定
   * @param {Object} parallelData - 並行処理の設定
   */
  async setBasicParallel(parallelData) {
    const {
      threads = [],
      syncPoints = [],
      joinAtEnd = true
    } = parallelData;

    // 各スレッドを設定
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      
      if (i > 0) {
        // 新しいスレッドを追加
        await this.addThread();
      }
      
      // スレッドを選択して内容を設定
      await this.selectThread(i);
      await this.setThreadContent(thread);
    }

    // 同期ポイントを設定
    for (const syncPoint of syncPoints) {
      await this.addSyncPoint(syncPoint);
    }

    // バリデーション完了を待機
    await this.waitForValidation();

    return this;
  }

  /**
   * 新しいスレッドを追加
   * @param {Object} threadConfig - スレッド設定
   */
  async addThread(threadConfig = {}) {
    const {
      name = null,
      priority = 'normal',
      timeout = null
    } = threadConfig;

    // スレッド追加ボタンをクリック
    await this.page.click(this.selectors.addThreadButton);

    // 新しいスレッドタブの表示を待機
    await this.page.waitForSelector(`${this.selectors.threadTab}:last-child`, { state: 'visible' });

    // スレッド数の確認
    const threadCount = await this.getThreadCount();
    
    if (threadCount > this.defaultThreadConfig.maxThreads) {
      console.warn(`Maximum thread limit (${this.defaultThreadConfig.maxThreads}) exceeded`);
    }

    // スレッド設定
    if (name || priority !== 'normal' || timeout) {
      await this.configureThread(threadCount - 1, { name, priority, timeout });
    }

    return this;
  }

  /**
   * スレッドを削除
   * @param {number} threadIndex - 削除するスレッドのインデックス
   */
  async deleteThread(threadIndex) {
    // 対象スレッドタブを選択
    await this.selectThread(threadIndex);

    // 削除ボタンをクリック
    await this.page.click(this.selectors.deleteThreadButton);

    // 確認ダイアログが表示される場合
    const confirmDialog = this.page.locator('.confirm-delete-thread');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-delete');
    }

    // スレッド削除の完了を待機
    await this.page.waitForTimeout(200);

    return this;
  }

  /**
   * スレッドを選択
   * @param {number} threadIndex - 選択するスレッドのインデックス
   */
  async selectThread(threadIndex) {
    const threadTab = this.page.locator(`${this.selectors.threadTab}:nth-child(${threadIndex + 1})`);
    await threadTab.click();

    // アクティブスレッドの切り替えを待機
    await this.page.waitForSelector(`${this.selectors.threadTab}:nth-child(${threadIndex + 1}).active`, { state: 'visible' });

    // スレッド内容エリアの表示を待機
    await this.waitForThreadSwitch(threadIndex);

    return this;
  }

  /**
   * スレッド内容を設定
   * @param {Object} threadData - スレッドデータ
   */
  async setThreadContent(threadData) {
    const { actions = [], name = null } = threadData;

    // スレッド名を設定
    if (name) {
      await this.setThreadName(name);
    }

    // スレッド内のアクションを追加
    for (const action of actions) {
      await this.addActionToCurrentThread(action);
    }

    return this;
  }

  /**
   * スレッド名を設定
   * @param {string} name - スレッド名
   */
  async setThreadName(name) {
    const threadNameInput = this.page.locator(this.selectors.threadName);
    await threadNameInput.clear();
    await threadNameInput.fill(name);

    // スレッドタブの表示更新を待機
    await this.page.waitForTimeout(100);

    return this;
  }

  /**
   * 現在のスレッドにアクションを追加
   * @param {Object} actionData - アクションデータ
   */
  async addActionToCurrentThread(actionData) {
    // 現在アクティブなスレッドのアクション追加ボタンをクリック
    await this.page.click(`${this.selectors.activeThreadContent} ${this.selectors.addActionToThread}`);

    // アクション編集ダイアログの表示を待機
    await this.page.waitForSelector('.thread-action-editor', { state: 'visible' });

    // アクションデータを設定
    await this.setActionInThread(actionData);

    // アクション追加の確定
    await this.page.click('.confirm-thread-action');

    // スレッド内容の更新を待機
    await this.waitForThreadContentUpdate();

    return this;
  }

  /**
   * スレッド内のアクションを設定
   * @param {Object} actionData - アクションデータ
   */
  async setActionInThread(actionData) {
    const { actorFrom, arrowType, actorTo, message, delay = null } = actionData;

    if (actorFrom) {
      await this.page.selectOption('.thread-action-from', actorFrom);
    }
    if (arrowType) {
      await this.page.selectOption('.thread-action-arrow', arrowType);
    }
    if (actorTo) {
      await this.page.selectOption('.thread-action-to', actorTo);
    }
    if (message) {
      await this.page.fill('.thread-action-message', message);
    }
    if (delay) {
      await this.page.fill('.thread-action-delay', delay.toString());
    }

    return this;
  }

  /**
   * スレッドを設定
   * @param {number} threadIndex - スレッドインデックス
   * @param {Object} config - スレッド設定
   */
  async configureThread(threadIndex, config) {
    const { name, priority, timeout } = config;

    // 対象スレッドを選択
    await this.selectThread(threadIndex);

    // スレッド設定パネルを開く
    await this.page.click(this.selectors.threadSettings);

    if (name) {
      await this.setThreadName(name);
    }

    if (priority) {
      await this.setThreadPriority(priority);
    }

    if (timeout) {
      await this.setThreadTimeout(timeout);
    }

    return this;
  }

  /**
   * スレッド優先度を設定
   * @param {string} priority - 優先度
   */
  async setThreadPriority(priority) {
    if (!this.threadPriorities[priority]) {
      throw new Error(`Unknown thread priority: ${priority}`);
    }

    const prioritySelect = this.page.locator(this.selectors.threadPriority);
    await prioritySelect.selectOption({ value: priority });

    return this;
  }

  /**
   * スレッドタイムアウトを設定
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   */
  async setThreadTimeout(timeout) {
    const timeoutInput = this.page.locator(this.selectors.threadTimeout);
    await timeoutInput.clear();
    await timeoutInput.fill(timeout.toString());

    return this;
  }

  /**
   * 同期ポイントを追加
   * @param {Object} syncPointData - 同期ポイントデータ
   */
  async addSyncPoint(syncPointData) {
    const { type = 'barrier', position, threads = [] } = syncPointData;

    // 同期ポイント追加ボタンをクリック
    await this.page.click(this.selectors.addSyncPoint);

    // 同期ポイント設定ダイアログの表示を待機
    await this.page.waitForSelector('.sync-point-editor', { state: 'visible' });

    // 同期タイプを設定
    await this.page.selectOption('.sync-type-select', type);

    // 対象スレッドを選択
    for (const threadIndex of threads) {
      await this.page.check(`[data-thread-sync="${threadIndex}"]`);
    }

    // 同期ポイントの確定
    await this.page.click('.confirm-sync-point');

    // 同期ポイント追加の完了を待機
    await this.waitForSyncPointUpdate();

    return this;
  }

  /**
   * 並行処理ブロックを展開/折りたたみ
   * @param {boolean} expand - true: 展開, false: 折りたたみ
   */
  async toggleParallelBlock(expand = true) {
    const currentState = await this.page.locator(this.selectors.expandIcon).isVisible();
    const needsToggle = (expand && currentState) || (!expand && !currentState);

    if (needsToggle) {
      await this.page.click(this.selectors.blockHeader);
      
      // 状態変更の完了を待機
      const targetIcon = expand ? this.selectors.collapseIcon : this.selectors.expandIcon;
      await this.page.waitForSelector(targetIcon, { state: 'visible' });
    }

    return this;
  }

  /**
   * 並行処理の妥当性を検証
   * @returns {Object} 検証結果
   */
  async validateParallel() {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // デッドロック警告の確認
    const deadlockWarning = this.page.locator(this.selectors.deadlockWarning);
    if (await deadlockWarning.isVisible()) {
      result.warnings.push(await deadlockWarning.textContent());
    }

    // レースコンディション警告の確認
    const raceWarning = this.page.locator(this.selectors.raceConditionWarning);
    if (await raceWarning.isVisible()) {
      result.warnings.push(await raceWarning.textContent());
    }

    // パフォーマンス警告の確認
    const perfWarning = this.page.locator(this.selectors.performanceWarning);
    if (await perfWarning.isVisible()) {
      result.warnings.push(await perfWarning.textContent());
    }

    return result;
  }

  /**
   * スレッド数を取得
   * @returns {number} スレッド数
   */
  async getThreadCount() {
    const threads = await this.page.locator(this.selectors.threadTab).count();
    return threads;
  }

  /**
   * アクティブスレッドのインデックスを取得
   * @returns {number} アクティブスレッドのインデックス
   */
  async getActiveThreadIndex() {
    const activeTab = this.page.locator(this.selectors.activeThreadTab);
    const tabIndex = await activeTab.getAttribute('data-thread-index');
    return parseInt(tabIndex) || 0;
  }

  /**
   * スレッド切り替えの完了を待機
   * @param {number} threadIndex - 切り替え先スレッドのインデックス
   */
  async waitForThreadSwitch(threadIndex) {
    await this.page.waitForFunction((index) => {
      const activeContent = document.querySelector(`[data-thread-content="${index}"].active`);
      return activeContent !== null;
    }, threadIndex, { timeout: 3000 });
  }

  /**
   * スレッド内容更新の完了を待機
   */
  async waitForThreadContentUpdate() {
    await this.page.waitForFunction(() => {
      const activeContent = document.querySelector('[data-thread-content].active');
      return activeContent && activeContent.children.length > 0;
    }, { timeout: 5000 });
  }

  /**
   * 同期ポイント更新の完了を待機
   */
  async waitForSyncPointUpdate() {
    await this.page.waitForFunction(() => {
      const syncPoints = document.querySelector('[data-testid="sync-points"]');
      return syncPoints && syncPoints.children.length > 0;
    }, { timeout: 3000 });
  }

  /**
   * バリデーション完了を待機
   */
  async waitForValidation() {
    await this.page.waitForFunction(() => {
      const validating = document.querySelector('.validating-parallel');
      return !validating || !validating.classList.contains('validating');
    }, { timeout: 5000 });
  }

  /**
   * 並行処理のプレビューを取得
   * @returns {Object} プレビューデータ
   */
  async getParallelPreview() {
    const plantUMLPreview = this.page.locator(this.selectors.plantUMLPreview);
    const executionFlowPreview = this.page.locator(this.selectors.executionFlowPreview);
    
    return {
      plantUML: await plantUMLPreview.textContent(),
      executionFlow: await executionFlowPreview.textContent(),
      threadCount: await this.getThreadCount(),
      syncPointCount: await this.getSyncPointCount()
    };
  }

  /**
   * 同期ポイント数を取得
   * @returns {number} 同期ポイント数
   */
  async getSyncPointCount() {
    const syncPoints = await this.page.locator(`${this.selectors.syncPoints} .sync-point`).count();
    return syncPoints;
  }

  /**
   * 全スレッドの内容を取得
   * @returns {Array} 全スレッドのデータ
   */
  async getAllThreadsData() {
    const threadCount = await this.getThreadCount();
    const threadsData = [];

    for (let i = 0; i < threadCount; i++) {
      await this.selectThread(i);
      const threadData = await this.getCurrentThreadData();
      threadsData.push(threadData);
    }

    return threadsData;
  }

  /**
   * 現在のスレッドデータを取得
   * @returns {Object} スレッドデータ
   */
  async getCurrentThreadData() {
    const threadName = await this.page.locator(this.selectors.threadName).inputValue();
    const actions = await this.getCurrentThreadActions();

    return {
      name: threadName,
      actions,
      index: await this.getActiveThreadIndex()
    };
  }

  /**
   * 現在のスレッドのアクションを取得
   * @returns {Array} アクションリスト
   */
  async getCurrentThreadActions() {
    const actionElements = await this.page.locator(`${this.selectors.activeThreadContent} ${this.selectors.threadActionItem}`).all();
    const actions = [];

    for (const element of actionElements) {
      const actionData = await this.extractActionData(element);
      actions.push(actionData);
    }

    return actions;
  }

  /**
   * アクション要素からデータを抽出
   * @param {Locator} element - アクション要素
   * @returns {Object} アクションデータ
   */
  async extractActionData(element) {
    return {
      actorFrom: await element.locator('.actor-from').textContent(),
      arrowType: await element.locator('.arrow-type').textContent(),
      actorTo: await element.locator('.actor-to').textContent(),
      message: await element.locator('.message').textContent(),
      delay: await element.locator('.delay').textContent()
    };
  }

  /**
   * 並行処理を確定
   */
  async confirmParallel() {
    await this.page.click(this.selectors.confirmParallel);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.parallelModal, { state: 'hidden' });
    
    // メインエディターの更新を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * 並行処理編集をキャンセル
   */
  async cancelParallel() {
    await this.page.click(this.selectors.cancelParallel);
    
    // エディターの非表示を待機
    await this.page.waitForSelector(this.selectors.parallelModal, { state: 'hidden' });
    
    return this;
  }

  /**
   * 並行処理を削除
   */
  async deleteParallel() {
    await this.page.click(this.selectors.deleteParallel);
    
    // 確認ダイアログの表示と対応
    const confirmDialog = this.page.locator('.confirm-delete-parallel');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-delete');
    }
    
    // 削除完了を待機
    await this.page.waitForTimeout(200);
    
    return this;
  }

  /**
   * 並行処理を複製
   */
  async duplicateParallel() {
    await this.page.click(this.selectors.duplicateParallel);
    
    // 複製完了の確認
    await this.page.waitForSelector('.parallel-block:last-child', { state: 'visible' });
    
    return this;
  }

  /**
   * 複雑な並行処理のパフォーマンステスト
   * @returns {Object} パフォーマンス測定結果
   */
  async measureComplexParallelPerformance() {
    const startTime = Date.now();

    // 複雑な並行処理を設定
    const complexParallel = {
      threads: [
        {
          name: 'UIスレッド',
          actions: [
            { actorFrom: 'ユーザー', arrowType: 'sync', actorTo: 'UI', message: 'ボタンクリック' },
            { actorFrom: 'UI', arrowType: 'sync', actorTo: 'コントローラー', message: 'イベント送信' }
          ]
        },
        {
          name: 'データ処理スレッド',
          actions: [
            { actorFrom: 'コントローラー', arrowType: 'async', actorTo: 'データベース', message: 'データ取得', delay: 100 },
            { actorFrom: 'データベース', arrowType: 'return', actorTo: 'コントローラー', message: 'データ返却' }
          ]
        },
        {
          name: 'ログ記録スレッド',
          actions: [
            { actorFrom: 'システム', arrowType: 'async', actorTo: 'ログサーバー', message: 'ログ記録' }
          ]
        }
      ],
      syncPoints: [
        { type: 'barrier', position: 'middle', threads: [0, 1] }
      ]
    };

    await this.setBasicParallel(complexParallel);
    const setupTime = Date.now() - startTime;

    // 同期ポイント設定時間の測定
    const syncStart = Date.now();
    await this.waitForSyncPointUpdate();
    const syncTime = Date.now() - syncStart;

    return {
      totalTime: Date.now() - startTime,
      setupTime,
      syncTime,
      threadCount: complexParallel.threads.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 並行実行のシミュレーション
   * @returns {Object} シミュレーション結果
   */
  async simulateParallelExecution() {
    const threadsData = await this.getAllThreadsData();
    const simulation = {
      threads: [],
      totalExecutionTime: 0,
      concurrencyLevel: threadsData.length,
      conflicts: []
    };

    // 各スレッドの実行時間を計算
    for (let i = 0; i < threadsData.length; i++) {
      const thread = threadsData[i];
      const threadSim = {
        name: thread.name,
        actions: thread.actions.length,
        estimatedTime: thread.actions.length * 50 + Math.random() * 100, // 簡略化した計算
        parallelEfficiency: Math.random() * 0.3 + 0.7 // 70-100%の効率
      };
      
      simulation.threads.push(threadSim);
    }

    // 最大実行時間を計算（並行実行の場合）
    simulation.totalExecutionTime = Math.max(...simulation.threads.map(t => t.estimatedTime));

    return simulation;
  }
}

// デフォルトエクスポート
export default ParallelEditorPage;