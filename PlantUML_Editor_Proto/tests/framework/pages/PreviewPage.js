/**
 * PreviewPage - プレビュー専用ページオブジェクト
 * Sprint3 TEST-005-2実装
 * 
 * 機能:
 * - PlantUMLコードプレビュー
 * - ダイアグラム画像プレビュー
 * - エクスポート機能
 * - ズーム・パン操作
 */

import { Page } from '@playwright/test';

export class PreviewPage {
  constructor(page) {
    this.page = page;
    
    // プレビュー専用セレクタ
    this.selectors = {
      // メインコンテナ
      previewContainer: '[data-testid="preview-container"]',
      previewPanel: '[data-testid="preview-panel"]',
      fullscreenPreview: '[data-testid="fullscreen-preview"]',
      
      // タブ切り替え
      previewTabs: '[data-testid="preview-tabs"]',
      codeTab: '[data-testid="code-tab"]',
      diagramTab: '[data-testid="diagram-tab"]',
      bothTab: '[data-testid="both-tab"]',
      activeTab: '[data-testid="preview-tab"].active',
      
      // PlantUMLコードプレビュー
      codePreview: '[data-testid="code-preview"]',
      codeEditor: '[data-testid="code-editor"]',
      codeLineNumbers: '[data-testid="code-line-numbers"]',
      syntaxHighlighting: '[data-testid="syntax-highlighting"]',
      codeSearchBox: '[data-testid="code-search"]',
      
      // ダイアグラムプレビュー
      diagramPreview: '[data-testid="diagram-preview"]',
      diagramImage: '[data-testid="diagram-image"]',
      diagramSvg: '[data-testid="diagram-svg"]',
      diagramCanvas: '[data-testid="diagram-canvas"]',
      diagramLoading: '[data-testid="diagram-loading"]',
      diagramError: '[data-testid="diagram-error"]',
      
      // ズーム・パン制御
      zoomControls: '[data-testid="zoom-controls"]',
      zoomInButton: '[data-testid="zoom-in"]',
      zoomOutButton: '[data-testid="zoom-out"]',
      zoomResetButton: '[data-testid="zoom-reset"]',
      zoomSlider: '[data-testid="zoom-slider"]',
      zoomLevel: '[data-testid="zoom-level"]',
      fitToWindowButton: '[data-testid="fit-to-window"]',
      
      // パン制御
      panControls: '[data-testid="pan-controls"]',
      panButton: '[data-testid="pan-button"]',
      resetViewButton: '[data-testid="reset-view"]',
      
      // エクスポート
      exportControls: '[data-testid="export-controls"]',
      exportButton: '[data-testid="export-button"]',
      exportMenu: '[data-testid="export-menu"]',
      exportPNG: '[data-testid="export-png"]',
      exportSVG: '[data-testid="export-svg"]',
      exportPDF: '[data-testid="export-pdf"]',
      exportPUML: '[data-testid="export-puml"]',
      
      // 設定
      previewSettings: '[data-testid="preview-settings"]',
      themeSelector: '[data-testid="theme-selector"]',
      fontSizeSelector: '[data-testid="font-size-selector"]',
      diagramScaleSelector: '[data-testid="diagram-scale-selector"]',
      
      // ステータス
      previewStatus: '[data-testid="preview-status"]',
      generationTime: '[data-testid="generation-time"]',
      diagramSize: '[data-testid="diagram-size"]',
      codeLines: '[data-testid="code-lines"]',
      
      // エラー表示
      errorPanel: '[data-testid="error-panel"]',
      syntaxError: '[data-testid="syntax-error"]',
      renderError: '[data-testid="render-error"]',
      errorDetails: '[data-testid="error-details"]',
      
      // リアルタイム更新
      autoRefreshToggle: '[data-testid="auto-refresh-toggle"]',
      refreshButton: '[data-testid="refresh-button"]',
      lastUpdated: '[data-testid="last-updated"]'
    };

    // プレビューモード
    this.previewModes = {
      code: 'code-only',
      diagram: 'diagram-only',
      both: 'side-by-side'
    };

    // エクスポート形式
    this.exportFormats = {
      png: { extension: 'png', mimeType: 'image/png' },
      svg: { extension: 'svg', mimeType: 'image/svg+xml' },
      pdf: { extension: 'pdf', mimeType: 'application/pdf' },
      puml: { extension: 'puml', mimeType: 'text/plain' }
    };

    // ズームレベル
    this.zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
  }

  /**
   * プレビューパネルを開く
   * @param {string} mode - プレビューモード ('code', 'diagram', 'both')
   */
  async openPreview(mode = 'both') {
    // プレビューパネルが表示されていない場合は開く
    const isVisible = await this.page.locator(this.selectors.previewPanel).isVisible();
    if (!isVisible) {
      await this.page.click('[data-testid="show-preview-button"]');
      await this.page.waitForSelector(this.selectors.previewPanel, { state: 'visible' });
    }

    // プレビューモードを設定
    await this.setPreviewMode(mode);

    return this;
  }

  /**
   * プレビューモードを設定
   * @param {string} mode - プレビューモード
   */
  async setPreviewMode(mode) {
    if (!this.previewModes[mode]) {
      throw new Error(`Unknown preview mode: ${mode}`);
    }

    const tabSelector = mode === 'code' ? this.selectors.codeTab :
                       mode === 'diagram' ? this.selectors.diagramTab :
                       this.selectors.bothTab;

    await this.page.click(tabSelector);

    // モード切り替えの完了を待機
    await this.page.waitForSelector(tabSelector + '.active', { state: 'visible' });

    return this;
  }

  /**
   * PlantUMLコードを取得
   * @returns {string} PlantUMLコード
   */
  async getPlantUMLCode() {
    const codePreview = this.page.locator(this.selectors.codePreview);
    return await codePreview.textContent();
  }

  /**
   * コード内で検索
   * @param {string} searchText - 検索テキスト
   * @returns {number} 検索結果の数
   */
  async searchInCode(searchText) {
    const searchBox = this.page.locator(this.selectors.codeSearchBox);
    await searchBox.clear();
    await searchBox.fill(searchText);
    await this.page.press(this.selectors.codeSearchBox, 'Enter');

    // 検索結果のハイライト表示を待機
    await this.page.waitForTimeout(500);

    // 検索結果数を取得
    const searchResults = await this.page.locator('.search-highlight').count();
    return searchResults;
  }

  /**
   * ダイアグラムが正常に表示されているか確認
   * @returns {boolean} ダイアグラム表示状態
   */
  async isDiagramVisible() {
    const diagramImage = this.page.locator(this.selectors.diagramImage);
    const diagramSvg = this.page.locator(this.selectors.diagramSvg);
    
    const imageVisible = await diagramImage.isVisible();
    const svgVisible = await diagramSvg.isVisible();
    
    return imageVisible || svgVisible;
  }

  /**
   * ダイアグラム生成エラーを確認
   * @returns {string|null} エラーメッセージまたはnull
   */
  async getDiagramError() {
    const errorElement = this.page.locator(this.selectors.diagramError);
    const isVisible = await errorElement.isVisible();
    return isVisible ? await errorElement.textContent() : null;
  }

  /**
   * ズームレベルを設定
   * @param {number} zoomLevel - ズームレベル (0.25 - 4.0)
   */
  async setZoomLevel(zoomLevel) {
    if (!this.zoomLevels.includes(zoomLevel)) {
      throw new Error(`Invalid zoom level: ${zoomLevel}`);
    }

    const zoomSlider = this.page.locator(this.selectors.zoomSlider);
    
    // スライダーの範囲を取得
    const min = parseFloat(await zoomSlider.getAttribute('min') || '0.25');
    const max = parseFloat(await zoomSlider.getAttribute('max') || '4.0');
    
    // 目標値を正規化
    const normalizedValue = ((zoomLevel - min) / (max - min)) * 100;
    
    // スライダーを操作
    await zoomSlider.fill(normalizedValue.toString());

    // ズーム適用の完了を待機
    await this.waitForZoomUpdate(zoomLevel);

    return this;
  }

  /**
   * ズームイン
   */
  async zoomIn() {
    await this.page.click(this.selectors.zoomInButton);
    await this.page.waitForTimeout(200);
    return this;
  }

  /**
   * ズームアウト
   */
  async zoomOut() {
    await this.page.click(this.selectors.zoomOutButton);
    await this.page.waitForTimeout(200);
    return this;
  }

  /**
   * ズームをリセット
   */
  async resetZoom() {
    await this.page.click(this.selectors.zoomResetButton);
    await this.waitForZoomUpdate(1.0);
    return this;
  }

  /**
   * ウィンドウにフィット
   */
  async fitToWindow() {
    await this.page.click(this.selectors.fitToWindowButton);
    await this.page.waitForTimeout(300);
    return this;
  }

  /**
   * ズーム更新の完了を待機
   * @param {number} expectedZoom - 期待されるズームレベル
   */
  async waitForZoomUpdate(expectedZoom) {
    await this.page.waitForFunction((expected) => {
      const zoomDisplay = document.querySelector('[data-testid="zoom-level"]');
      if (!zoomDisplay) return false;
      
      const currentZoom = parseFloat(zoomDisplay.textContent.replace('%', '')) / 100;
      return Math.abs(currentZoom - expected) < 0.01; // 1%の誤差許容
    }, expectedZoom, { timeout: 3000 });
  }

  /**
   * パン操作を有効/無効化
   * @param {boolean} enable - パン操作の有効/無効
   */
  async togglePan(enable = true) {
    const panButton = this.page.locator(this.selectors.panButton);
    const isActive = await panButton.evaluate(el => el.classList.contains('active'));
    
    if ((enable && !isActive) || (!enable && isActive)) {
      await panButton.click();
    }

    return this;
  }

  /**
   * ビューをリセット
   */
  async resetView() {
    await this.page.click(this.selectors.resetViewButton);
    await this.page.waitForTimeout(300);
    return this;
  }

  /**
   * ダイアグラムをエクスポート
   * @param {string} format - エクスポート形式
   * @param {string} filename - ファイル名（拡張子なし）
   */
  async exportDiagram(format, filename = 'diagram') {
    if (!this.exportFormats[format]) {
      throw new Error(`Unknown export format: ${format}`);
    }

    // エクスポートメニューを開く
    await this.page.click(this.selectors.exportButton);
    await this.page.waitForSelector(this.selectors.exportMenu, { state: 'visible' });

    // 形式を選択
    const formatSelector = this.selectors[`export${format.toUpperCase()}`];
    await this.page.click(formatSelector);

    // ダウンロードを待機
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('.export-confirm');
    const download = await downloadPromise;

    // ダウンロードファイルの検証
    const suggestedFilename = download.suggestedFilename();
    const expectedExtension = this.exportFormats[format].extension;
    
    if (!suggestedFilename.endsWith(`.${expectedExtension}`)) {
      throw new Error(`Unexpected file extension: ${suggestedFilename}`);
    }

    return download;
  }

  /**
   * プレビュー設定を変更
   * @param {Object} settings - 設定オブジェクト
   */
  async updatePreviewSettings(settings) {
    const { theme, fontSize, diagramScale } = settings;

    // 設定パネルを開く
    await this.page.click(this.selectors.previewSettings);

    if (theme) {
      await this.page.selectOption(this.selectors.themeSelector, theme);
    }

    if (fontSize) {
      await this.page.selectOption(this.selectors.fontSizeSelector, fontSize);
    }

    if (diagramScale) {
      await this.page.selectOption(this.selectors.diagramScaleSelector, diagramScale);
    }

    // 設定適用の完了を待機
    await this.waitForSettingsUpdate();

    return this;
  }

  /**
   * 設定更新の完了を待機
   */
  async waitForSettingsUpdate() {
    await this.page.waitForTimeout(500);
    
    // 必要に応じてダイアグラムの再描画を待機
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="diagram-loading"]');
      return !loading || !loading.classList.contains('loading');
    }, { timeout: 5000 });
  }

  /**
   * 自動更新を有効/無効化
   * @param {boolean} enable - 自動更新の有効/無効
   */
  async toggleAutoRefresh(enable = true) {
    const toggle = this.page.locator(this.selectors.autoRefreshToggle);
    const isChecked = await toggle.isChecked();
    
    if ((enable && !isChecked) || (!enable && isChecked)) {
      await toggle.click();
    }

    return this;
  }

  /**
   * 手動でプレビューを更新
   */
  async refreshPreview() {
    await this.page.click(this.selectors.refreshButton);
    
    // 更新完了を待機
    await this.waitForPreviewUpdate();
    
    return this;
  }

  /**
   * プレビュー更新の完了を待機
   */
  async waitForPreviewUpdate() {
    // 最終更新時刻の変更を確認
    const lastUpdatedBefore = await this.page.locator(this.selectors.lastUpdated).textContent();
    
    await this.page.waitForFunction((beforeText) => {
      const lastUpdated = document.querySelector('[data-testid="last-updated"]');
      return lastUpdated && lastUpdated.textContent !== beforeText;
    }, lastUpdatedBefore, { timeout: 5000 });
  }

  /**
   * プレビューステータスを取得
   * @returns {Object} ステータス情報
   */
  async getPreviewStatus() {
    const generationTime = await this.page.locator(this.selectors.generationTime).textContent();
    const diagramSize = await this.page.locator(this.selectors.diagramSize).textContent();
    const codeLines = await this.page.locator(this.selectors.codeLines).textContent();
    const lastUpdated = await this.page.locator(this.selectors.lastUpdated).textContent();

    return {
      generationTime: parseFloat(generationTime.replace('ms', '')),
      diagramSize,
      codeLines: parseInt(codeLines),
      lastUpdated,
      currentZoom: await this.getCurrentZoomLevel()
    };
  }

  /**
   * 現在のズームレベルを取得
   * @returns {number} 現在のズームレベル
   */
  async getCurrentZoomLevel() {
    const zoomDisplay = this.page.locator(this.selectors.zoomLevel);
    const zoomText = await zoomDisplay.textContent();
    return parseFloat(zoomText.replace('%', '')) / 100;
  }

  /**
   * 構文エラーを取得
   * @returns {Array} エラーリスト
   */
  async getSyntaxErrors() {
    const errorElements = await this.page.locator(`${this.selectors.syntaxError} .error-item`).all();
    const errors = [];

    for (const element of errorElements) {
      const errorText = await element.textContent();
      const lineNumber = await element.getAttribute('data-line');
      errors.push({
        message: errorText.trim(),
        line: lineNumber ? parseInt(lineNumber) : null
      });
    }

    return errors;
  }

  /**
   * フルスクリーンプレビューを開く
   */
  async openFullscreenPreview() {
    await this.page.click('[data-testid="fullscreen-button"]');
    await this.page.waitForSelector(this.selectors.fullscreenPreview, { state: 'visible' });
    return this;
  }

  /**
   * フルスクリーンプレビューを閉じる
   */
  async closeFullscreenPreview() {
    await this.page.press('body', 'Escape');
    await this.page.waitForSelector(this.selectors.fullscreenPreview, { state: 'hidden' });
    return this;
  }

  /**
   * プレビューのパフォーマンスを測定
   * @returns {Object} パフォーマンス測定結果
   */
  async measurePreviewPerformance() {
    const startTime = Date.now();

    // プレビュー更新の測定
    await this.refreshPreview();
    const refreshTime = Date.now() - startTime;

    // ズーム操作の測定
    const zoomStart = Date.now();
    await this.setZoomLevel(2.0);
    await this.setZoomLevel(1.0);
    const zoomTime = Date.now() - zoomStart;

    // エクスポートの測定
    const exportStart = Date.now();
    const download = await this.exportDiagram('png', 'test');
    const exportTime = Date.now() - exportStart;

    return {
      refreshTime,
      zoomTime,
      exportTime,
      totalTime: Date.now() - startTime,
      downloadSize: await download.path() ? (await download.path()).length : 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * プレビューの応答性をテスト
   * @returns {Object} 応答性テスト結果
   */
  async testPreviewResponsiveness() {
    const results = {
      quickOperations: [],
      averageResponseTime: 0,
      slowOperations: []
    };

    const operations = [
      { name: 'zoom-in', action: () => this.zoomIn() },
      { name: 'zoom-out', action: () => this.zoomOut() },
      { name: 'reset-zoom', action: () => this.resetZoom() },
      { name: 'fit-window', action: () => this.fitToWindow() },
      { name: 'refresh', action: () => this.refreshPreview() }
    ];

    for (const op of operations) {
      const startTime = Date.now();
      
      try {
        await op.action();
        const responseTime = Date.now() - startTime;
        
        const operationResult = {
          name: op.name,
          responseTime,
          success: true
        };
        
        if (responseTime < 100) {
          results.quickOperations.push(operationResult);
        } else if (responseTime > 1000) {
          results.slowOperations.push(operationResult);
        }
        
        results.averageResponseTime += responseTime;
        
      } catch (error) {
        results.slowOperations.push({
          name: op.name,
          responseTime: Date.now() - startTime,
          success: false,
          error: error.message
        });
      }
    }

    results.averageResponseTime /= operations.length;

    return results;
  }
}

// デフォルトエクスポート
export default PreviewPage;