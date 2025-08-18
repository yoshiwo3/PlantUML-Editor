/**
 * CreateDiagramFlow - ダイアグラム作成フローオブジェクト
 * Sprint3 TEST-005-4実装
 * 
 * 機能:
 * - 新規ダイアグラム作成の完全フロー
 * - 日本語入力からPlantUML生成まで
 * - エラーハンドリングとリカバリ
 * - パフォーマンス測定
 */

import { Page } from '@playwright/test';

export class CreateDiagramFlow {
  constructor(page) {
    this.page = page;
    this.baseUrl = 'http://localhost:8086';
    
    // フロー関連セレクタ
    this.selectors = {
      // 初期画面
      newDiagramButton: '[data-testid="new-diagram-button"]',
      templateSelector: '[data-testid="template-selector"]',
      
      // 入力ステップ
      japaneseInput: '[data-testid="japanese-input"]',
      inputArea: '[data-testid="input-area"]',
      processButton: '[data-testid="process-button"]',
      
      // 編集ステップ
      editorArea: '[data-testid="editor-area"]',
      actionItems: '[data-testid="action-items-list"]',
      addActionButton: '[data-testid="add-action-button"]',
      
      // プレビューステップ
      previewArea: '[data-testid="preview-area"]',
      plantUMLOutput: '[data-testid="plantuml-output"]',
      diagramPreview: '[data-testid="diagram-preview"]',
      
      // 保存・完了
      saveButton: '[data-testid="save-button"]',
      exportButton: '[data-testid="export-button"]',
      finishButton: '[data-testid="finish-button"]',
      
      // エラー・ステータス
      errorMessage: '[data-testid="error-message"]',
      successMessage: '[data-testid="success-message"]',
      loadingIndicator: '[data-testid="loading-indicator"]',
      progressBar: '[data-testid="progress-bar"]'
    };

    // フロー設定
    this.flowConfig = {
      timeout: 30000,
      stepTimeout: 10000,
      retryAttempts: 3,
      animationDelay: 300
    };

    // テンプレート設定
    this.templates = {
      simple: {
        name: 'シンプルなやり取り',
        description: '基本的なアクター間のやり取り',
        sampleInput: 'ユーザーがシステムにログインし、システムがレスポンスを返す'
      },
      complex: {
        name: '複雑なビジネスプロセス',
        description: '条件分岐やループを含む複雑なフロー',
        sampleInput: 'ユーザーが商品を検索し、在庫があれば注文処理、なければ入荷待ちとする'
      },
      api: {
        name: 'API連携フロー',
        description: 'マイクロサービス間の API 連携',
        sampleInput: 'フロントエンドがAPIサーバーを呼び出し、データベースからデータを取得'
      }
    };
  }

  /**
   * 新規ダイアグラム作成フローを実行
   * @param {Object} diagramData - ダイアグラムデータ
   * @returns {Object} 作成結果
   */
  async createNewDiagram(diagramData) {
    const {
      template = 'simple',
      japaneseInput = '',
      additionalActions = [],
      saveOnComplete = true,
      exportFormat = null
    } = diagramData;

    const flowResult = {
      success: false,
      steps: [],
      diagram: null,
      errors: [],
      performance: {}
    };

    const startTime = Date.now();

    try {
      // ステップ 1: アプリケーション初期化
      await this.initializeApplication();
      flowResult.steps.push({ step: 'initialize', success: true, time: Date.now() - startTime });

      // ステップ 2: 新規ダイアグラム開始
      await this.startNewDiagram(template);
      flowResult.steps.push({ step: 'start_new', success: true });

      // ステップ 3: 日本語入力
      const inputResult = await this.inputJapaneseContent(japaneseInput);
      flowResult.steps.push({ step: 'japanese_input', success: true, data: inputResult });

      // ステップ 4: PlantUML変換
      const conversionResult = await this.convertToPlantUML();
      flowResult.steps.push({ step: 'conversion', success: true, data: conversionResult });

      // ステップ 5: 追加アクション編集
      if (additionalActions.length > 0) {
        const editResult = await this.addAdditionalActions(additionalActions);
        flowResult.steps.push({ step: 'additional_actions', success: true, data: editResult });
      }

      // ステップ 6: プレビュー確認
      const previewResult = await this.verifyPreview();
      flowResult.steps.push({ step: 'preview', success: true, data: previewResult });

      // ステップ 7: 保存（オプション）
      if (saveOnComplete) {
        const saveResult = await this.saveDiagram();
        flowResult.steps.push({ step: 'save', success: true, data: saveResult });
      }

      // ステップ 8: エクスポート（オプション）
      if (exportFormat) {
        const exportResult = await this.exportDiagram(exportFormat);
        flowResult.steps.push({ step: 'export', success: true, data: exportResult });
      }

      // 最終結果
      flowResult.diagram = await this.getFinalDiagram();
      flowResult.success = true;

    } catch (error) {
      flowResult.errors.push({
        step: 'flow_execution',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // エラーリカバリを試行
      const recoveryResult = await this.attemptErrorRecovery(error);
      if (recoveryResult.success) {
        flowResult.steps.push({ step: 'error_recovery', success: true, data: recoveryResult });
      }
    }

    flowResult.performance = {
      totalTime: Date.now() - startTime,
      stepCount: flowResult.steps.length,
      averageStepTime: (Date.now() - startTime) / flowResult.steps.length
    };

    return flowResult;
  }

  /**
   * アプリケーション初期化
   */
  async initializeApplication() {
    // ページに移動
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

    // 重要な要素の表示を待機
    await this.page.waitForSelector('[data-testid="main-editor-container"]', { 
      state: 'visible',
      timeout: this.flowConfig.timeout
    });

    // JavaScript初期化完了を待機
    await this.page.waitForFunction(() => {
      return window.PlantUMLEditor && window.PlantUMLEditor.initialized;
    }, { timeout: this.flowConfig.stepTimeout });

    return this;
  }

  /**
   * 新規ダイアグラム開始
   * @param {string} template - テンプレート名
   */
  async startNewDiagram(template) {
    // 新規ダイアグラムボタンをクリック
    const newButton = this.page.locator(this.selectors.newDiagramButton);
    if (await newButton.isVisible()) {
      await newButton.click();
    }

    // テンプレート選択（存在する場合）
    const templateSelector = this.page.locator(this.selectors.templateSelector);
    if (await templateSelector.isVisible()) {
      await templateSelector.selectOption(template);
      
      // テンプレート適用を待機
      await this.page.waitForTimeout(this.flowConfig.animationDelay);
    }

    return this;
  }

  /**
   * 日本語コンテンツ入力
   * @param {string} japaneseText - 日本語テキスト
   */
  async inputJapaneseContent(japaneseText) {
    const inputArea = this.page.locator(this.selectors.japaneseInput);
    
    // 入力エリアの表示を待機
    await inputArea.waitFor({ state: 'visible' });
    
    // 既存内容をクリア
    await inputArea.clear();
    
    // 日本語テキストを入力
    await inputArea.type(japaneseText, { delay: 50 });
    
    // IME確定を待機
    await this.page.waitForTimeout(200);
    
    // 処理ボタンが存在する場合はクリック
    const processButton = this.page.locator(this.selectors.processButton);
    if (await processButton.isVisible()) {
      await processButton.click();
    }

    return {
      inputText: japaneseText,
      inputLength: japaneseText.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * PlantUML変換
   */
  async convertToPlantUML() {
    // 変換処理の開始を待機
    await this.waitForProcessing();
    
    // PlantUMLコードの生成を待機
    await this.page.waitForFunction(() => {
      const output = document.querySelector('[data-testid="plantuml-output"]');
      return output && output.textContent.includes('@startuml');
    }, { timeout: this.flowConfig.stepTimeout });

    // 生成されたPlantUMLコードを取得
    const plantUMLCode = await this.page.locator(this.selectors.plantUMLOutput).textContent();
    
    return {
      plantUMLCode,
      codeLength: plantUMLCode.length,
      hasStartTag: plantUMLCode.includes('@startuml'),
      hasEndTag: plantUMLCode.includes('@enduml'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 追加アクション編集
   * @param {Array} additionalActions - 追加アクションリスト
   */
  async addAdditionalActions(additionalActions) {
    const addedActions = [];
    
    for (const action of additionalActions) {
      try {
        // アクション追加ボタンをクリック
        await this.page.click(this.selectors.addActionButton);
        
        // アクション編集ダイアログの表示を待機
        await this.page.waitForSelector('.action-editor-dialog', { state: 'visible' });
        
        // アクションデータを設定
        await this.fillActionDialog(action);
        
        // アクション確定
        await this.page.click('.confirm-action');
        
        // アクション追加完了を待機
        await this.page.waitForTimeout(200);
        
        addedActions.push({
          action,
          success: true,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        addedActions.push({
          action,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return {
      requestedActions: additionalActions.length,
      addedActions: addedActions.filter(a => a.success).length,
      failedActions: addedActions.filter(a => !a.success).length,
      details: addedActions
    };
  }

  /**
   * アクションダイアログ入力
   * @param {Object} actionData - アクションデータ
   */
  async fillActionDialog(actionData) {
    const { actorFrom, arrowType, actorTo, message } = actionData;
    
    if (actorFrom) {
      await this.page.selectOption('.dialog-actor-from', actorFrom);
    }
    if (arrowType) {
      await this.page.selectOption('.dialog-arrow-type', arrowType);
    }
    if (actorTo) {
      await this.page.selectOption('.dialog-actor-to', actorTo);
    }
    if (message) {
      await this.page.fill('.dialog-message', message);
    }
    
    return this;
  }

  /**
   * プレビュー確認
   */
  async verifyPreview() {
    const previewArea = this.page.locator(this.selectors.previewArea);
    
    // プレビューエリアの表示を待機
    await previewArea.waitFor({ state: 'visible' });
    
    // ダイアグラムプレビューの生成を待機
    const diagramPreview = this.page.locator(this.selectors.diagramPreview);
    await diagramPreview.waitFor({ state: 'visible', timeout: this.flowConfig.stepTimeout });
    
    // プレビューの有効性を確認
    const isPreviewValid = await this.page.evaluate(() => {
      const preview = document.querySelector('[data-testid="diagram-preview"]');
      return preview && (preview.querySelector('img') || preview.querySelector('svg'));
    });
    
    return {
      previewVisible: await diagramPreview.isVisible(),
      previewValid: isPreviewValid,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ダイアグラム保存
   */
  async saveDiagram() {
    const saveButton = this.page.locator(this.selectors.saveButton);
    
    // 保存ボタンをクリック
    await saveButton.click();
    
    // 保存完了メッセージを待機
    await this.page.waitForSelector(this.selectors.successMessage, { 
      state: 'visible',
      timeout: this.flowConfig.stepTimeout
    });
    
    // 成功メッセージの内容を取得
    const successMessage = await this.page.locator(this.selectors.successMessage).textContent();
    
    return {
      saved: true,
      successMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ダイアグラムエクスポート
   * @param {string} format - エクスポート形式
   */
  async exportDiagram(format) {
    const exportButton = this.page.locator(this.selectors.exportButton);
    
    // エクスポートボタンをクリック
    await exportButton.click();
    
    // エクスポートメニューの表示を待機
    await this.page.waitForSelector('.export-menu', { state: 'visible' });
    
    // 形式を選択
    await this.page.click(`[data-format="${format}"]`);
    
    // ダウンロード処理を待機
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('.export-confirm');
    const download = await downloadPromise;
    
    return {
      format,
      filename: download.suggestedFilename(),
      exported: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 最終ダイアグラム取得
   */
  async getFinalDiagram() {
    const plantUMLCode = await this.page.locator(this.selectors.plantUMLOutput).textContent();
    const actionCount = await this.page.locator(`${this.selectors.actionItems} .action-item`).count();
    
    return {
      plantUMLCode,
      actionCount,
      codeLength: plantUMLCode.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 処理完了を待機
   */
  async waitForProcessing() {
    // ローディングインジケーターの表示を待機
    try {
      await this.page.waitForSelector(this.selectors.loadingIndicator, {
        state: 'visible',
        timeout: 1000
      });
    } catch (error) {
      // ローディングが即座に完了した場合
      return;
    }
    
    // ローディングインジケーターの非表示を待機
    await this.page.waitForSelector(this.selectors.loadingIndicator, {
      state: 'hidden',
      timeout: this.flowConfig.stepTimeout
    });
    
    return this;
  }

  /**
   * エラーリカバリ
   * @param {Error} error - 発生したエラー
   */
  async attemptErrorRecovery(error) {
    const recoveryAttempts = [];
    
    // リカバリ手順1: ページリロード
    try {
      await this.page.reload({ waitUntil: 'networkidle' });
      await this.initializeApplication();
      recoveryAttempts.push({ method: 'page_reload', success: true });
    } catch (reloadError) {
      recoveryAttempts.push({ method: 'page_reload', success: false, error: reloadError.message });
    }
    
    // リカバリ手順2: エラーメッセージクリア
    try {
      const errorMessage = this.page.locator(this.selectors.errorMessage);
      if (await errorMessage.isVisible()) {
        const dismissButton = errorMessage.locator('.dismiss, .close');
        if (await dismissButton.isVisible()) {
          await dismissButton.click();
        }
      }
      recoveryAttempts.push({ method: 'clear_errors', success: true });
    } catch (clearError) {
      recoveryAttempts.push({ method: 'clear_errors', success: false, error: clearError.message });
    }
    
    // リカバリ手順3: 初期状態にリセット
    try {
      const resetButton = this.page.locator('[data-testid="reset-button"]');
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await this.page.waitForTimeout(1000);
      }
      recoveryAttempts.push({ method: 'reset_state', success: true });
    } catch (resetError) {
      recoveryAttempts.push({ method: 'reset_state', success: false, error: resetError.message });
    }
    
    const successfulRecoveries = recoveryAttempts.filter(attempt => attempt.success);
    
    return {
      success: successfulRecoveries.length > 0,
      attempts: recoveryAttempts,
      recoveredMethods: successfulRecoveries.map(r => r.method),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * フロー全体のパフォーマンステスト
   * @param {Array} testCases - テストケース配列
   * @returns {Object} パフォーマンス結果
   */
  async measureFlowPerformance(testCases) {
    const results = {
      testCases: [],
      summary: {
        totalTests: testCases.length,
        successfulTests: 0,
        averageTime: 0,
        totalTime: 0
      }
    };
    
    const overallStart = Date.now();
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testStart = Date.now();
      
      try {
        const flowResult = await this.createNewDiagram(testCase);
        const testTime = Date.now() - testStart;
        
        results.testCases.push({
          index: i,
          testCase,
          success: flowResult.success,
          time: testTime,
          steps: flowResult.steps.length,
          errors: flowResult.errors.length,
          diagram: flowResult.diagram
        });
        
        if (flowResult.success) {
          results.summary.successfulTests++;
        }
        
      } catch (error) {
        results.testCases.push({
          index: i,
          testCase,
          success: false,
          time: Date.now() - testStart,
          error: error.message
        });
      }
      
      // テストケース間の待機時間
      await this.page.waitForTimeout(500);
    }
    
    results.summary.totalTime = Date.now() - overallStart;
    results.summary.averageTime = results.summary.totalTime / testCases.length;
    results.summary.successRate = (results.summary.successfulTests / testCases.length) * 100;
    results.timestamp = new Date().toISOString();
    
    return results;
  }
}

// デフォルトエクスポート
export default CreateDiagramFlow;