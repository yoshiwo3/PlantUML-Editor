/**
 * MainEditorPage - PlantUMLエディターのメインページオブジェクト
 * Sprint3 TEST-005-2実装
 * 
 * 機能:
 * - PlantUMLエディターのメイン画面操作
 * - 日本語入力対応
 * - アクション項目の7要素操作
 * - リアルタイム編集機能
 */

import { Page } from '@playwright/test';

export class MainEditorPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://localhost:8086';
    
    // ページレベルのセレクタ
    this.selectors = {
      // メインコンテナ
      editorContainer: '[data-testid="main-editor-container"]',
      leftPanel: '[data-testid="left-panel"]',
      rightPanel: '[data-testid="right-panel"]',
      
      // ヘッダー・ナビゲーション
      header: '[data-testid="editor-header"]',
      logo: '[data-testid="plantuml-logo"]',
      navMenu: '[data-testid="nav-menu"]',
      settingsButton: '[data-testid="settings-button"]',
      helpButton: '[data-testid="help-button"]',
      
      // エディター領域
      editorArea: '[data-testid="editor-area"]',
      stepContainer: '[data-testid="step-container"]',
      step1: '[data-testid="step-1"]',
      step2: '[data-testid="step-2"]',
      step3: '[data-testid="step-3"]',
      
      // 入力・編集領域
      japaneseInput: '[data-testid="japanese-input"]',
      editingArea: '[data-testid="editing-area"]',
      actionItemsList: '[data-testid="action-items-list"]',
      
      // プレビュー領域
      previewArea: '[data-testid="preview-area"]',
      plantUMLOutput: '[data-testid="plantuml-output"]',
      diagramPreview: '[data-testid="diagram-preview"]',
      
      // ツールバー
      toolbar: '[data-testid="toolbar"]',
      undoButton: '[data-testid="undo-button"]',
      redoButton: '[data-testid="redo-button"]',
      saveButton: '[data-testid="save-button"]',
      exportButton: '[data-testid="export-button"]',
      
      // フローティングアクション
      addActionButton: '[data-testid="add-action-button"]',
      addConditionButton: '[data-testid="add-condition-button"]',
      addLoopButton: '[data-testid="add-loop-button"]',
      addParallelButton: '[data-testid="add-parallel-button"]',
      
      // ステータス表示
      statusBar: '[data-testid="status-bar"]',
      errorMessage: '[data-testid="error-message"]',
      successMessage: '[data-testid="success-message"]',
      loadingIndicator: '[data-testid="loading-indicator"]'
    };
  }

  /**
   * ページに移動してロード完了を待機
   * @param {Object} options - オプション設定
   */
  async goto(options = {}) {
    await this.page.goto(this.url, { waitUntil: 'networkidle', ...options });
    await this.waitForPageLoad();
    return this;
  }

  /**
   * ページロード完了まで待機
   */
  async waitForPageLoad() {
    // 重要な要素の表示を待機
    await this.page.waitForSelector(this.selectors.editorContainer, { state: 'visible' });
    await this.page.waitForSelector(this.selectors.step1, { state: 'visible' });
    
    // JavaScript初期化完了を待機
    await this.page.waitForFunction(() => {
      return window.PlantUMLEditor && window.PlantUMLEditor.initialized;
    }, { timeout: 10000 });
    
    // ネットワーク静止を待機
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 日本語テキストを入力
   * @param {string} text - 入力する日本語テキスト
   */
  async inputJapaneseText(text) {
    const input = this.page.locator(this.selectors.japaneseInput);
    await input.clear();
    
    // 日本語入力のシミュレーション
    await input.type(text, { delay: 50 }); // 50ms遅延で自然な入力をシミュレート
    
    // IME確定を待機
    await this.page.waitForTimeout(100);
    
    // リアルタイム変換の完了を待機
    await this.waitForRealtimeUpdate();
    
    return this;
  }

  /**
   * リアルタイム更新完了を待機
   */
  async waitForRealtimeUpdate() {
    // PlantUMLコードの更新を待機
    await this.page.waitForFunction(() => {
      const output = document.querySelector('[data-testid="plantuml-output"]');
      return output && output.textContent.length > 0;
    }, { timeout: 5000 });
    
    // 描画完了を待機
    await this.page.waitForTimeout(200);
  }

  /**
   * アクション項目を取得
   * @returns {Array} アクション項目のリスト
   */
  async getActionItems() {
    const actionItems = await this.page.locator(this.selectors.actionItemsList + ' .action-item').all();
    const items = [];
    
    for (const item of actionItems) {
      const data = await this.extractActionItemData(item);
      items.push(data);
    }
    
    return items;
  }

  /**
   * アクション項目からデータを抽出
   * @param {Locator} item - アクション項目のLocator
   * @returns {Object} アクション項目のデータ
   */
  async extractActionItemData(item) {
    return {
      dragHandle: await item.locator('.drag-handle').isVisible(),
      actorFrom: await item.locator('.actor-from select').inputValue(),
      arrowType: await item.locator('.arrow-type select').inputValue(),
      actorTo: await item.locator('.actor-to select').inputValue(),
      message: await item.locator('.message input').inputValue(),
      deleteButton: await item.locator('.delete-button').isVisible(),
      questionButton: await item.locator('.question-button').isVisible(),
      questionActive: await item.locator('.question-button.active').count() > 0
    };
  }

  /**
   * 新しいアクション項目を追加
   * @param {Object} actionData - アクション項目のデータ
   */
  async addActionItem(actionData = {}) {
    // アクション追加ボタンをクリック
    await this.page.click(this.selectors.addActionButton);
    
    // モーダルまたはインライン編集の表示を待機
    await this.page.waitForSelector('.action-item-editor', { state: 'visible' });
    
    // データを入力
    if (actionData.actorFrom) {
      await this.page.selectOption('.actor-from select', actionData.actorFrom);
    }
    if (actionData.arrowType) {
      await this.page.selectOption('.arrow-type select', actionData.arrowType);
    }
    if (actionData.actorTo) {
      await this.page.selectOption('.actor-to select', actionData.actorTo);
    }
    if (actionData.message) {
      await this.page.fill('.message input', actionData.message);
    }
    
    // 確定
    await this.page.click('.confirm-button');
    
    // 追加完了を待機
    await this.waitForRealtimeUpdate();
    
    return this;
  }

  /**
   * 条件分岐ブロックを追加
   * @param {string} condition - 条件文
   */
  async addConditionBlock(condition) {
    await this.page.click(this.selectors.addConditionButton);
    await this.page.waitForSelector('.condition-editor', { state: 'visible' });
    await this.page.fill('.condition-input', condition);
    await this.page.click('.confirm-button');
    await this.waitForRealtimeUpdate();
    return this;
  }

  /**
   * ループブロックを追加
   * @param {string} loopCondition - ループ条件
   */
  async addLoopBlock(loopCondition) {
    await this.page.click(this.selectors.addLoopButton);
    await this.page.waitForSelector('.loop-editor', { state: 'visible' });
    await this.page.fill('.loop-condition-input', loopCondition);
    await this.page.click('.confirm-button');
    await this.waitForRealtimeUpdate();
    return this;
  }

  /**
   * 並行処理ブロックを追加
   */
  async addParallelBlock() {
    await this.page.click(this.selectors.addParallelButton);
    await this.page.waitForSelector('.parallel-editor', { state: 'visible' });
    await this.page.click('.confirm-button');
    await this.waitForRealtimeUpdate();
    return this;
  }

  /**
   * PlantUMLコードを取得
   * @returns {string} 生成されたPlantUMLコード
   */
  async getPlantUMLCode() {
    const output = this.page.locator(this.selectors.plantUMLOutput);
    return await output.textContent();
  }

  /**
   * ダイアグラムプレビューが表示されているか確認
   * @returns {boolean} プレビュー表示状態
   */
  async isDiagramPreviewVisible() {
    return await this.page.locator(this.selectors.diagramPreview).isVisible();
  }

  /**
   * エラーメッセージを取得
   * @returns {string|null} エラーメッセージまたはnull
   */
  async getErrorMessage() {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    const isVisible = await errorElement.isVisible();
    return isVisible ? await errorElement.textContent() : null;
  }

  /**
   * 成功メッセージを取得
   * @returns {string|null} 成功メッセージまたはnull
   */
  async getSuccessMessage() {
    const successElement = this.page.locator(this.selectors.successMessage);
    const isVisible = await successElement.isVisible();
    return isVisible ? await successElement.textContent() : null;
  }

  /**
   * アンドゥ操作を実行
   */
  async undo() {
    await this.page.click(this.selectors.undoButton);
    await this.waitForRealtimeUpdate();
    return this;
  }

  /**
   * リドゥ操作を実行
   */
  async redo() {
    await this.page.click(this.selectors.redoButton);
    await this.waitForRealtimeUpdate();
    return this;
  }

  /**
   * 保存操作を実行
   */
  async save() {
    await this.page.click(this.selectors.saveButton);
    await this.page.waitForSelector(this.selectors.successMessage, { state: 'visible' });
    return this;
  }

  /**
   * エクスポート操作を実行
   * @param {string} format - エクスポート形式 (png, svg, puml等)
   */
  async export(format = 'png') {
    await this.page.click(this.selectors.exportButton);
    await this.page.waitForSelector('.export-menu', { state: 'visible' });
    await this.page.click(`[data-format="${format}"]`);
    
    // ダウンロード処理の完了を待機
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('.export-confirm');
    const download = await downloadPromise;
    
    return download;
  }

  /**
   * 設定画面を開く
   */
  async openSettings() {
    await this.page.click(this.selectors.settingsButton);
    await this.page.waitForSelector('.settings-modal', { state: 'visible' });
    return this;
  }

  /**
   * ヘルプ画面を開く
   */
  async openHelp() {
    await this.page.click(this.selectors.helpButton);
    await this.page.waitForSelector('.help-modal', { state: 'visible' });
    return this;
  }

  /**
   * ページの応答性をテスト
   * @returns {Object} パフォーマンスメトリクス
   */
  async measurePerformance() {
    const startTime = Date.now();
    
    // 基本操作のパフォーマンス測定
    await this.inputJapaneseText('テストパフォーマンス測定');
    const inputTime = Date.now() - startTime;
    
    const realtimeStart = Date.now();
    await this.waitForRealtimeUpdate();
    const realtimeTime = Date.now() - realtimeStart;
    
    return {
      totalTime: Date.now() - startTime,
      inputTime,
      realtimeTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * アクセシビリティチェック
   * @returns {Object} アクセシビリティレポート
   */
  async checkAccessibility() {
    // キーボードナビゲーションテスト
    const keyboardNav = await this.testKeyboardNavigation();
    
    // ARIA属性チェック
    const ariaCheck = await this.checkAriaAttributes();
    
    // カラーコントラストチェック
    const contrastCheck = await this.checkColorContrast();
    
    return {
      keyboardNavigation: keyboardNav,
      ariaAttributes: ariaCheck,
      colorContrast: contrastCheck,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * キーボードナビゲーションテスト
   * @returns {boolean} キーボードナビゲーション可能性
   */
  async testKeyboardNavigation() {
    // Tab キーでの要素間移動テスト
    await this.page.press('body', 'Tab');
    const focused1 = await this.page.evaluate(() => document.activeElement.tagName);
    
    await this.page.press('body', 'Tab');
    const focused2 = await this.page.evaluate(() => document.activeElement.tagName);
    
    return focused1 !== focused2; // フォーカスが移動したかチェック
  }

  /**
   * ARIA属性チェック
   * @returns {Object} ARIA属性の状態
   */
  async checkAriaAttributes() {
    const ariaElements = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-describedby], [role]');
      return Array.from(elements).length;
    });
    
    return {
      hasAriaElements: ariaElements > 0,
      count: ariaElements
    };
  }

  /**
   * カラーコントラストチェック
   * @returns {boolean} 十分なコントラスト
   */
  async checkColorContrast() {
    // 基本的なコントラストチェック（実装は簡略化）
    const styles = await this.page.evaluate(() => {
      const element = document.querySelector('[data-testid="main-editor-container"]');
      const computed = window.getComputedStyle(element);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });
    
    return styles.color !== styles.backgroundColor;
  }

  /**
   * ブラウザ互換性テスト
   * @returns {Object} ブラウザ互換性情報
   */
  async checkBrowserCompatibility() {
    const features = await this.page.evaluate(() => {
      return {
        webWorkers: typeof Worker !== 'undefined',
        localStorage: typeof Storage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        webSockets: typeof WebSocket !== 'undefined',
        canvas: !!document.createElement('canvas').getContext,
        svg: !!document.createElementNS
      };
    });
    
    return features;
  }

  /**
   * メモリリークチェック
   * @returns {Object} メモリ使用状況
   */
  async checkMemoryUsage() {
    const memoryInfo = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    return memoryInfo;
  }

  /**
   * クリーンアップ処理
   */
  async cleanup() {
    // ローカルストレージクリア
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // キャッシュクリア
    await this.page.reload({ waitUntil: 'networkidle' });
  }
}

// デフォルトエクスポート
export default MainEditorPage;