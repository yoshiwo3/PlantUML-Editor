import { BasePage } from './BasePage.js';

/**
 * PlantUMLエディターページオブジェクト
 * メイン機能のテスト操作を提供
 */
export class PlantUMLEditorPage extends BasePage {
  constructor(page) {
    super(page);
    
    // セレクタ定義
    this.selectors = {
      // メイン入力エリア
      japaneseInput: '#japanese-input',
      plantumlEditor: '#plantuml-editor',
      previewArea: '#preview-area',
      
      // ボタン
      convertButton: '#convert-btn',
      saveButton: '#save-btn',
      loadButton: '#load-btn',
      exportButton: '#export-btn',
      clearButton: '#clear-btn',
      
      // メニュー
      mainMenu: '.main-menu',
      fileMenu: '.file-menu',
      editMenu: '.edit-menu',
      viewMenu: '.view-menu',
      helpMenu: '.help-menu',
      
      // ダイアログ
      saveDialog: '.save-dialog',
      loadDialog: '.load-dialog',
      exportDialog: '.export-dialog',
      settingsDialog: '.settings-dialog',
      
      // エラー表示
      errorMessage: '.error-message',
      warningMessage: '.warning-message',
      statusBar: '.status-bar',
      
      // 編集機能
      undoButton: '#undo-btn',
      redoButton: '#redo-btn',
      findButton: '#find-btn',
      replaceButton: '#replace-btn',
      
      // プレビュー関連
      zoomInButton: '#zoom-in-btn',
      zoomOutButton: '#zoom-out-btn',
      fitToScreenButton: '#fit-screen-btn',
      
      // インライン編集
      inlineEditModal: '.inline-edit-modal',
      actorNameField: '.actor-name-field',
      messageField: '.message-field',
      noteField: '.note-field',
      
      // ローディング
      loadingSpinner: '.loading-spinner',
      progressBar: '.progress-bar'
    };
  }

  /**
   * PlantUMLエディターページを開く
   */
  async open() {
    await this.goto('/');
    await this.waitForEditorLoad();
  }

  /**
   * エディターの読み込み完了を待機
   */
  async waitForEditorLoad() {
    await this.waitForElement(this.selectors.japaneseInput);
    await this.waitForElement(this.selectors.plantumlEditor);
    await this.waitForElement(this.selectors.previewArea);
    
    // スクリプトの初期化完了を待機
    await this.page.waitForFunction(() => {
      return window.PlantUMLParser && 
             window.RealtimeSyncManager && 
             document.readyState === 'complete';
    }, { timeout: 30000 });
  }

  /**
   * 日本語テキストの入力
   * @param {string} text - 入力する日本語テキスト
   */
  async inputJapaneseText(text) {
    await this.fill(this.selectors.japaneseInput, text);
    await this.waitForConversion();
  }

  /**
   * PlantUMLコードの直接入力
   * @param {string} code - PlantUMLコード
   */
  async inputPlantUMLCode(code) {
    await this.fill(this.selectors.plantumlEditor, code);
    await this.waitForPreviewUpdate();
  }

  /**
   * 変換処理の完了を待機
   */
  async waitForConversion() {
    // ローディングスピナーの表示/非表示を待機
    await this.page.waitForFunction(() => {
      const spinner = document.querySelector('.loading-spinner');
      return !spinner || !spinner.classList.contains('visible');
    }, { timeout: 10000 });
    
    // プレビューの更新を待機
    await this.waitForPreviewUpdate();
  }

  /**
   * プレビューの更新を待機
   */
  async waitForPreviewUpdate() {
    await this.page.waitForFunction(() => {
      const preview = document.querySelector('#preview-area');
      return preview && (preview.querySelector('svg') || preview.querySelector('img'));
    }, { timeout: 15000 });
  }

  /**
   * PlantUMLコードの取得
   */
  async getPlantUMLCode() {
    return await this.page.inputValue(this.selectors.plantumlEditor);
  }

  /**
   * 日本語入力テキストの取得
   */
  async getJapaneseText() {
    return await this.page.inputValue(this.selectors.japaneseInput);
  }

  /**
   * プレビューの内容取得
   */
  async getPreviewContent() {
    const previewElement = await this.page.locator(this.selectors.previewArea);
    return await previewElement.innerHTML();
  }

  /**
   * プレビューにSVGが表示されているか確認
   */
  async hasPreviewSVG() {
    const svg = await this.page.locator(`${this.selectors.previewArea} svg`);
    return await svg.count() > 0;
  }

  /**
   * 変換ボタンクリック
   */
  async clickConvert() {
    await this.click(this.selectors.convertButton);
    await this.waitForConversion();
  }

  /**
   * 保存ボタンクリック
   */
  async clickSave() {
    await this.click(this.selectors.saveButton);
    await this.waitForElement(this.selectors.saveDialog);
  }

  /**
   * ファイル読み込み
   * @param {string} filename - ファイル名
   */
  async loadFile(filename) {
    await this.click(this.selectors.loadButton);
    await this.waitForElement(this.selectors.loadDialog);
    
    // ファイル選択処理
    const fileInput = await this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filename);
    
    await this.waitForEditorLoad();
  }

  /**
   * エクスポート実行
   * @param {string} format - エクスポート形式 ('png', 'svg', 'pdf')
   */
  async exportDiagram(format = 'png') {
    await this.click(this.selectors.exportButton);
    await this.waitForElement(this.selectors.exportDialog);
    
    // フォーマット選択
    await this.click(`[data-format="${format}"]`);
    
    // ダウンロード開始
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.click('.export-confirm-btn')
    ]);
    
    return download;
  }

  /**
   * クリア操作
   */
  async clearAll() {
    await this.click(this.selectors.clearButton);
    
    // 確認ダイアログがある場合の処理
    try {
      await this.page.waitForEvent('dialog', { timeout: 2000 });
    } catch {
      // ダイアログがない場合は無視
    }
  }

  /**
   * Undo操作
   */
  async undo() {
    await this.click(this.selectors.undoButton);
    await this.page.waitForTimeout(500); // UI更新待機
  }

  /**
   * Redo操作
   */
  async redo() {
    await this.click(this.selectors.redoButton);
    await this.page.waitForTimeout(500); // UI更新待機
  }

  /**
   * 検索機能
   * @param {string} searchText - 検索テキスト
   */
  async search(searchText) {
    await this.click(this.selectors.findButton);
    await this.fill('.search-input', searchText);
    await this.page.keyboard.press('Enter');
  }

  /**
   * 置換機能
   * @param {string} searchText - 検索テキスト
   * @param {string} replaceText - 置換テキスト
   */
  async replace(searchText, replaceText) {
    await this.click(this.selectors.replaceButton);
    await this.fill('.search-input', searchText);
    await this.fill('.replace-input', replaceText);
    await this.click('.replace-all-btn');
  }

  /**
   * ズーム操作
   * @param {string} action - 'in', 'out', 'fit'
   */
  async zoom(action) {
    switch (action) {
      case 'in':
        await this.click(this.selectors.zoomInButton);
        break;
      case 'out':
        await this.click(this.selectors.zoomOutButton);
        break;
      case 'fit':
        await this.click(this.selectors.fitToScreenButton);
        break;
    }
    await this.page.waitForTimeout(500); // ズーム処理完了待機
  }

  /**
   * インライン編集モーダル表示
   * @param {string} elementType - 'actor', 'message', 'note'
   */
  async openInlineEdit(elementType) {
    // プレビュー内の要素をダブルクリック
    await this.page.dblclick(`${this.selectors.previewArea} [data-type="${elementType}"]:first-of-type`);
    await this.waitForElement(this.selectors.inlineEditModal);
  }

  /**
   * インライン編集でテキスト更新
   * @param {string} newText - 新しいテキスト
   */
  async updateInlineText(newText) {
    await this.fill('.inline-edit-input', newText);
    await this.click('.inline-edit-save');
    await this.waitForPreviewUpdate();
  }

  /**
   * エラーメッセージの確認
   */
  async getErrorMessage() {
    try {
      return await this.getText(this.selectors.errorMessage);
    } catch {
      return null;
    }
  }

  /**
   * 警告メッセージの確認
   */
  async getWarningMessage() {
    try {
      return await this.getText(this.selectors.warningMessage);
    } catch {
      return null;
    }
  }

  /**
   * ステータスバーの確認
   */
  async getStatusText() {
    try {
      return await this.getText(this.selectors.statusBar);
    } catch {
      return null;
    }
  }

  /**
   * リアルタイム同期の動作確認
   */
  async testRealtimeSync() {
    const testText = 'A -> B: テストメッセージ';
    
    // 日本語入力
    await this.inputJapaneseText(testText);
    
    // PlantUMLエディターの内容を確認
    const plantumlCode = await this.getPlantUMLCode();
    
    // プレビューの更新を確認
    const hasPreview = await this.hasPreviewSVG();
    
    return {
      plantumlGenerated: plantumlCode.length > 0,
      previewUpdated: hasPreview
    };
  }

  /**
   * パフォーマンス測定
   */
  async measurePerformance() {
    const startTime = Date.now();
    
    await this.inputJapaneseText('A -> B: パフォーマンステスト');
    await this.waitForConversion();
    
    const endTime = Date.now();
    const conversionTime = endTime - startTime;
    
    const metrics = await this.getPerformanceMetrics();
    const memory = await this.getMemoryUsage();
    
    return {
      conversionTime,
      ...metrics,
      memory
    };
  }

  /**
   * 複数ブラウザでの動作確認用データ取得
   */
  async getBrowserCompatibilityData() {
    const userAgent = await this.page.evaluate(() => navigator.userAgent);
    const features = await this.page.evaluate(() => ({
      svg: !!document.createElementNS,
      canvas: !!document.createElement('canvas').getContext,
      webgl: !!document.createElement('canvas').getContext('webgl'),
      websockets: !!window.WebSocket,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage
    }));
    
    return {
      userAgent,
      features,
      viewportSize: await this.page.viewportSize()
    };
  }
}