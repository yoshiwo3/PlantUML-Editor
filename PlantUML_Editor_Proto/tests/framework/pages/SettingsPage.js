/**
 * SettingsPage - 設定画面専用ページオブジェクト
 * Sprint3 TEST-005-2実装
 * 
 * 機能:
 * - アプリケーション設定の管理
 * - UI設定、言語設定
 * - エクスポート設定
 * - キーボードショートカット設定
 */

import { Page } from '@playwright/test';

export class SettingsPage {
  constructor(page) {
    this.page = page;
    
    // 設定画面専用セレクタ
    this.selectors = {
      // メインコンテナ
      settingsModal: '[data-testid="settings-modal"]',
      settingsContainer: '[data-testid="settings-container"]',
      settingsHeader: '[data-testid="settings-header"]',
      
      // ナビゲーション
      settingsNav: '[data-testid="settings-nav"]',
      generalTab: '[data-testid="general-tab"]',
      editorTab: '[data-testid="editor-tab"]',
      previewTab: '[data-testid="preview-tab"]',
      exportTab: '[data-testid="export-tab"]',
      keyboardTab: '[data-testid="keyboard-tab"]',
      advancedTab: '[data-testid="advanced-tab"]',
      activeTab: '[data-testid="settings-tab"].active',
      
      // 一般設定
      generalSettings: '[data-testid="general-settings"]',
      languageSelect: '[data-testid="language-select"]',
      themeSelect: '[data-testid="theme-select"]',
      autoSaveToggle: '[data-testid="auto-save-toggle"]',
      autoSaveInterval: '[data-testid="auto-save-interval"]',
      confirmOnExit: '[data-testid="confirm-on-exit"]',
      
      // エディター設定
      editorSettings: '[data-testid="editor-settings"]',
      fontFamily: '[data-testid="font-family"]',
      fontSize: '[data-testid="font-size"]',
      lineHeight: '[data-testid="line-height"]',
      tabSize: '[data-testid="tab-size"]',
      wordWrap: '[data-testid="word-wrap"]',
      lineNumbers: '[data-testid="line-numbers"]',
      syntaxHighlight: '[data-testid="syntax-highlight"]',
      autoComplete: '[data-testid="auto-complete"]',
      
      // プレビュー設定
      previewSettings: '[data-testid="preview-settings"]',
      autoRefresh: '[data-testid="auto-refresh"]',
      refreshDelay: '[data-testid="refresh-delay"]',
      defaultZoom: '[data-testid="default-zoom"]',
      diagramTheme: '[data-testid="diagram-theme"]',
      showGrid: '[data-testid="show-grid"]',
      snapToGrid: '[data-testid="snap-to-grid"]',
      
      // エクスポート設定
      exportSettings: '[data-testid="export-settings"]',
      defaultFormat: '[data-testid="default-format"]',
      imageQuality: '[data-testid="image-quality"]',
      defaultPath: '[data-testid="default-path"]',
      filenamePattern: '[data-testid="filename-pattern"]',
      includeMetadata: '[data-testid="include-metadata"]',
      
      // キーボードショートカット
      keyboardSettings: '[data-testid="keyboard-settings"]',
      shortcutList: '[data-testid="shortcut-list"]',
      shortcutItem: '.shortcut-item',
      editShortcut: '[data-testid="edit-shortcut"]',
      resetShortcuts: '[data-testid="reset-shortcuts"]',
      
      // 詳細設定
      advancedSettings: '[data-testid="advanced-settings"]',
      debugMode: '[data-testid="debug-mode"]',
      performanceMode: '[data-testid="performance-mode"]',
      maxUndoSteps: '[data-testid="max-undo-steps"]',
      memoryLimit: '[data-testid="memory-limit"]',
      enableAnalytics: '[data-testid="enable-analytics"]',
      
      // 操作ボタン
      saveButton: '[data-testid="save-settings"]',
      cancelButton: '[data-testid="cancel-settings"]',
      resetButton: '[data-testid="reset-settings"]',
      exportSettingsButton: '[data-testid="export-settings-file"]',
      importSettingsButton: '[data-testid="import-settings-file"]',
      
      // 状態表示
      settingsStatus: '[data-testid="settings-status"]',
      saveStatus: '[data-testid="save-status"]',
      errorMessage: '[data-testid="settings-error"]',
      successMessage: '[data-testid="settings-success"]'
    };

    // デフォルト設定値
    this.defaultSettings = {
      general: {
        language: 'ja',
        theme: 'light',
        autoSave: true,
        autoSaveInterval: 5000,
        confirmOnExit: true
      },
      editor: {
        fontFamily: 'Monaco, Consolas, monospace',
        fontSize: 14,
        lineHeight: 1.5,
        tabSize: 2,
        wordWrap: true,
        lineNumbers: true,
        syntaxHighlight: true,
        autoComplete: true
      },
      preview: {
        autoRefresh: true,
        refreshDelay: 1000,
        defaultZoom: 1.0,
        diagramTheme: 'default',
        showGrid: false,
        snapToGrid: false
      },
      export: {
        defaultFormat: 'png',
        imageQuality: 90,
        defaultPath: 'downloads',
        filenamePattern: '{title}_{timestamp}',
        includeMetadata: true
      },
      advanced: {
        debugMode: false,
        performanceMode: false,
        maxUndoSteps: 50,
        memoryLimit: 100,
        enableAnalytics: false
      }
    };

    // 利用可能なオプション
    this.options = {
      languages: [
        { value: 'ja', label: '日本語' },
        { value: 'en', label: 'English' },
        { value: 'zh', label: '中文' },
        { value: 'ko', label: '한국어' }
      ],
      themes: [
        { value: 'light', label: 'ライト' },
        { value: 'dark', label: 'ダーク' },
        { value: 'auto', label: '自動' }
      ],
      fontFamilies: [
        'Monaco, Consolas, monospace',
        'Fira Code, monospace',
        'Source Code Pro, monospace',
        'JetBrains Mono, monospace'
      ],
      exportFormats: [
        { value: 'png', label: 'PNG画像' },
        { value: 'svg', label: 'SVGベクター' },
        { value: 'pdf', label: 'PDFドキュメント' },
        { value: 'puml', label: 'PlantUMLファイル' }
      ]
    };
  }

  /**
   * 設定画面を開く
   * @param {string} initialTab - 初期表示タブ
   */
  async openSettings(initialTab = 'general') {
    // 設定ボタンをクリック
    await this.page.click('[data-testid="settings-button"]');
    
    // 設定モーダルの表示を待機
    await this.page.waitForSelector(this.selectors.settingsModal, { state: 'visible' });
    
    // 指定されたタブに切り替え
    if (initialTab !== 'general') {
      await this.switchTab(initialTab);
    }
    
    return this;
  }

  /**
   * 設定タブを切り替え
   * @param {string} tabName - タブ名
   */
  async switchTab(tabName) {
    const tabSelector = this.selectors[`${tabName}Tab`];
    if (!tabSelector) {
      throw new Error(`Unknown settings tab: ${tabName}`);
    }

    await this.page.click(tabSelector);
    
    // タブ切り替えの完了を待機
    await this.page.waitForSelector(tabSelector + '.active', { state: 'visible' });
    
    return this;
  }

  /**
   * 一般設定を変更
   * @param {Object} generalSettings - 一般設定
   */
  async setGeneralSettings(generalSettings) {
    await this.switchTab('general');

    const {
      language,
      theme,
      autoSave,
      autoSaveInterval,
      confirmOnExit
    } = generalSettings;

    if (language) {
      await this.page.selectOption(this.selectors.languageSelect, language);
    }

    if (theme) {
      await this.page.selectOption(this.selectors.themeSelect, theme);
    }

    if (autoSave !== undefined) {
      await this.setToggle(this.selectors.autoSaveToggle, autoSave);
    }

    if (autoSaveInterval) {
      await this.page.fill(this.selectors.autoSaveInterval, autoSaveInterval.toString());
    }

    if (confirmOnExit !== undefined) {
      await this.setToggle(this.selectors.confirmOnExit, confirmOnExit);
    }

    return this;
  }

  /**
   * エディター設定を変更
   * @param {Object} editorSettings - エディター設定
   */
  async setEditorSettings(editorSettings) {
    await this.switchTab('editor');

    const {
      fontFamily,
      fontSize,
      lineHeight,
      tabSize,
      wordWrap,
      lineNumbers,
      syntaxHighlight,
      autoComplete
    } = editorSettings;

    if (fontFamily) {
      await this.page.selectOption(this.selectors.fontFamily, fontFamily);
    }

    if (fontSize) {
      await this.page.fill(this.selectors.fontSize, fontSize.toString());
    }

    if (lineHeight) {
      await this.page.fill(this.selectors.lineHeight, lineHeight.toString());
    }

    if (tabSize) {
      await this.page.fill(this.selectors.tabSize, tabSize.toString());
    }

    if (wordWrap !== undefined) {
      await this.setToggle(this.selectors.wordWrap, wordWrap);
    }

    if (lineNumbers !== undefined) {
      await this.setToggle(this.selectors.lineNumbers, lineNumbers);
    }

    if (syntaxHighlight !== undefined) {
      await this.setToggle(this.selectors.syntaxHighlight, syntaxHighlight);
    }

    if (autoComplete !== undefined) {
      await this.setToggle(this.selectors.autoComplete, autoComplete);
    }

    return this;
  }

  /**
   * プレビュー設定を変更
   * @param {Object} previewSettings - プレビュー設定
   */
  async setPreviewSettings(previewSettings) {
    await this.switchTab('preview');

    const {
      autoRefresh,
      refreshDelay,
      defaultZoom,
      diagramTheme,
      showGrid,
      snapToGrid
    } = previewSettings;

    if (autoRefresh !== undefined) {
      await this.setToggle(this.selectors.autoRefresh, autoRefresh);
    }

    if (refreshDelay) {
      await this.page.fill(this.selectors.refreshDelay, refreshDelay.toString());
    }

    if (defaultZoom) {
      await this.page.fill(this.selectors.defaultZoom, defaultZoom.toString());
    }

    if (diagramTheme) {
      await this.page.selectOption(this.selectors.diagramTheme, diagramTheme);
    }

    if (showGrid !== undefined) {
      await this.setToggle(this.selectors.showGrid, showGrid);
    }

    if (snapToGrid !== undefined) {
      await this.setToggle(this.selectors.snapToGrid, snapToGrid);
    }

    return this;
  }

  /**
   * エクスポート設定を変更
   * @param {Object} exportSettings - エクスポート設定
   */
  async setExportSettings(exportSettings) {
    await this.switchTab('export');

    const {
      defaultFormat,
      imageQuality,
      defaultPath,
      filenamePattern,
      includeMetadata
    } = exportSettings;

    if (defaultFormat) {
      await this.page.selectOption(this.selectors.defaultFormat, defaultFormat);
    }

    if (imageQuality) {
      await this.page.fill(this.selectors.imageQuality, imageQuality.toString());
    }

    if (defaultPath) {
      await this.page.fill(this.selectors.defaultPath, defaultPath);
    }

    if (filenamePattern) {
      await this.page.fill(this.selectors.filenamePattern, filenamePattern);
    }

    if (includeMetadata !== undefined) {
      await this.setToggle(this.selectors.includeMetadata, includeMetadata);
    }

    return this;
  }

  /**
   * 詳細設定を変更
   * @param {Object} advancedSettings - 詳細設定
   */
  async setAdvancedSettings(advancedSettings) {
    await this.switchTab('advanced');

    const {
      debugMode,
      performanceMode,
      maxUndoSteps,
      memoryLimit,
      enableAnalytics
    } = advancedSettings;

    if (debugMode !== undefined) {
      await this.setToggle(this.selectors.debugMode, debugMode);
    }

    if (performanceMode !== undefined) {
      await this.setToggle(this.selectors.performanceMode, performanceMode);
    }

    if (maxUndoSteps) {
      await this.page.fill(this.selectors.maxUndoSteps, maxUndoSteps.toString());
    }

    if (memoryLimit) {
      await this.page.fill(this.selectors.memoryLimit, memoryLimit.toString());
    }

    if (enableAnalytics !== undefined) {
      await this.setToggle(this.selectors.enableAnalytics, enableAnalytics);
    }

    return this;
  }

  /**
   * トグルスイッチを設定
   * @param {string} selector - トグルセレクタ
   * @param {boolean} enabled - 有効/無効
   */
  async setToggle(selector, enabled) {
    const toggle = this.page.locator(selector);
    const isChecked = await toggle.isChecked();
    
    if ((enabled && !isChecked) || (!enabled && isChecked)) {
      await toggle.click();
    }

    return this;
  }

  /**
   * キーボードショートカットを編集
   * @param {string} action - アクション名
   * @param {string} newShortcut - 新しいショートカット
   */
  async editKeyboardShortcut(action, newShortcut) {
    await this.switchTab('keyboard');

    // 特定のアクションを見つけて編集
    const shortcutItem = this.page.locator(`[data-action="${action}"]`);
    await shortcutItem.locator(this.selectors.editShortcut).click();

    // ショートカット編集ダイアログの表示を待機
    await this.page.waitForSelector('.shortcut-editor', { state: 'visible' });

    // 新しいショートカットを設定
    const shortcutInput = this.page.locator('.shortcut-input');
    await shortcutInput.clear();
    await this.page.keyboard.press(newShortcut);

    // 確定
    await this.page.click('.confirm-shortcut');

    return this;
  }

  /**
   * ショートカットをリセット
   */
  async resetKeyboardShortcuts() {
    await this.switchTab('keyboard');
    
    await this.page.click(this.selectors.resetShortcuts);
    
    // 確認ダイアログが表示される場合
    const confirmDialog = this.page.locator('.confirm-reset-shortcuts');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-reset');
    }

    return this;
  }

  /**
   * 設定を保存
   */
  async saveSettings() {
    await this.page.click(this.selectors.saveButton);
    
    // 保存完了メッセージの表示を待機
    await this.page.waitForSelector(this.selectors.successMessage, { state: 'visible' });
    
    return this;
  }

  /**
   * 設定をキャンセル
   */
  async cancelSettings() {
    await this.page.click(this.selectors.cancelButton);
    
    // 設定モーダルの非表示を待機
    await this.page.waitForSelector(this.selectors.settingsModal, { state: 'hidden' });
    
    return this;
  }

  /**
   * 設定をリセット
   */
  async resetSettings() {
    await this.page.click(this.selectors.resetButton);
    
    // 確認ダイアログが表示される場合
    const confirmDialog = this.page.locator('.confirm-reset-settings');
    if (await confirmDialog.isVisible()) {
      await this.page.click('.confirm-reset');
    }
    
    // リセット完了を待機
    await this.page.waitForTimeout(500);
    
    return this;
  }

  /**
   * 設定をファイルにエクスポート
   * @param {string} filename - ファイル名
   */
  async exportSettingsToFile(filename = 'settings.json') {
    await this.page.click(this.selectors.exportSettingsButton);
    
    // ダウンロードを待機
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('.confirm-export');
    const download = await downloadPromise;
    
    return download;
  }

  /**
   * ファイルから設定をインポート
   * @param {string} filePath - 設定ファイルのパス
   */
  async importSettingsFromFile(filePath) {
    await this.page.click(this.selectors.importSettingsButton);
    
    // ファイル選択ダイアログの表示を待機
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // インポート確認
    await this.page.click('.confirm-import');
    
    // インポート完了を待機
    await this.page.waitForSelector(this.selectors.successMessage, { state: 'visible' });
    
    return this;
  }

  /**
   * 現在の設定値を取得
   * @returns {Object} 現在の設定
   */
  async getCurrentSettings() {
    const settings = {
      general: {},
      editor: {},
      preview: {},
      export: {},
      advanced: {}
    };

    // 一般設定を取得
    await this.switchTab('general');
    settings.general = {
      language: await this.page.locator(this.selectors.languageSelect).inputValue(),
      theme: await this.page.locator(this.selectors.themeSelect).inputValue(),
      autoSave: await this.page.locator(this.selectors.autoSaveToggle).isChecked(),
      autoSaveInterval: parseInt(await this.page.locator(this.selectors.autoSaveInterval).inputValue()),
      confirmOnExit: await this.page.locator(this.selectors.confirmOnExit).isChecked()
    };

    // エディター設定を取得
    await this.switchTab('editor');
    settings.editor = {
      fontFamily: await this.page.locator(this.selectors.fontFamily).inputValue(),
      fontSize: parseInt(await this.page.locator(this.selectors.fontSize).inputValue()),
      lineHeight: parseFloat(await this.page.locator(this.selectors.lineHeight).inputValue()),
      tabSize: parseInt(await this.page.locator(this.selectors.tabSize).inputValue()),
      wordWrap: await this.page.locator(this.selectors.wordWrap).isChecked(),
      lineNumbers: await this.page.locator(this.selectors.lineNumbers).isChecked(),
      syntaxHighlight: await this.page.locator(this.selectors.syntaxHighlight).isChecked(),
      autoComplete: await this.page.locator(this.selectors.autoComplete).isChecked()
    };

    // プレビュー設定を取得
    await this.switchTab('preview');
    settings.preview = {
      autoRefresh: await this.page.locator(this.selectors.autoRefresh).isChecked(),
      refreshDelay: parseInt(await this.page.locator(this.selectors.refreshDelay).inputValue()),
      defaultZoom: parseFloat(await this.page.locator(this.selectors.defaultZoom).inputValue()),
      diagramTheme: await this.page.locator(this.selectors.diagramTheme).inputValue(),
      showGrid: await this.page.locator(this.selectors.showGrid).isChecked(),
      snapToGrid: await this.page.locator(this.selectors.snapToGrid).isChecked()
    };

    // エクスポート設定を取得
    await this.switchTab('export');
    settings.export = {
      defaultFormat: await this.page.locator(this.selectors.defaultFormat).inputValue(),
      imageQuality: parseInt(await this.page.locator(this.selectors.imageQuality).inputValue()),
      defaultPath: await this.page.locator(this.selectors.defaultPath).inputValue(),
      filenamePattern: await this.page.locator(this.selectors.filenamePattern).inputValue(),
      includeMetadata: await this.page.locator(this.selectors.includeMetadata).isChecked()
    };

    // 詳細設定を取得
    await this.switchTab('advanced');
    settings.advanced = {
      debugMode: await this.page.locator(this.selectors.debugMode).isChecked(),
      performanceMode: await this.page.locator(this.selectors.performanceMode).isChecked(),
      maxUndoSteps: parseInt(await this.page.locator(this.selectors.maxUndoSteps).inputValue()),
      memoryLimit: parseInt(await this.page.locator(this.selectors.memoryLimit).inputValue()),
      enableAnalytics: await this.page.locator(this.selectors.enableAnalytics).isChecked()
    };

    return settings;
  }

  /**
   * 設定の妥当性を検証
   * @returns {Object} 検証結果
   */
  async validateSettings() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 各タブで検証を実行
    const tabs = ['general', 'editor', 'preview', 'export', 'advanced'];
    
    for (const tab of tabs) {
      await this.switchTab(tab);
      
      // エラーメッセージの確認
      const errorElement = this.page.locator(`${this.selectors[`${tab}Settings`]} .validation-error`);
      if (await errorElement.isVisible()) {
        validation.isValid = false;
        validation.errors.push({
          tab,
          message: await errorElement.textContent()
        });
      }
    }

    return validation;
  }

  /**
   * 設定適用のパフォーマンステスト
   * @returns {Object} パフォーマンス測定結果
   */
  async measureSettingsPerformance() {
    const startTime = Date.now();

    // 全設定を変更
    const testSettings = {
      general: { language: 'en', theme: 'dark' },
      editor: { fontSize: 16, lineHeight: 1.6 },
      preview: { defaultZoom: 1.5, autoRefresh: false },
      export: { defaultFormat: 'svg', imageQuality: 95 },
      advanced: { debugMode: true, maxUndoSteps: 100 }
    };

    await this.setGeneralSettings(testSettings.general);
    const generalTime = Date.now() - startTime;

    await this.setEditorSettings(testSettings.editor);
    const editorTime = Date.now() - startTime - generalTime;

    await this.setPreviewSettings(testSettings.preview);
    const previewTime = Date.now() - startTime - generalTime - editorTime;

    await this.setExportSettings(testSettings.export);
    const exportTime = Date.now() - startTime - generalTime - editorTime - previewTime;

    await this.setAdvancedSettings(testSettings.advanced);
    const advancedTime = Date.now() - startTime - generalTime - editorTime - previewTime - exportTime;

    // 保存時間の測定
    const saveStart = Date.now();
    await this.saveSettings();
    const saveTime = Date.now() - saveStart;

    return {
      totalTime: Date.now() - startTime,
      generalTime,
      editorTime,
      previewTime,
      exportTime,
      advancedTime,
      saveTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 設定画面を閉じる
   */
  async closeSettings() {
    // Escapeキーまたは×ボタンで閉じる
    await this.page.press('body', 'Escape');
    
    // モーダルの非表示を待機
    await this.page.waitForSelector(this.selectors.settingsModal, { state: 'hidden' });
    
    return this;
  }
}

// デフォルトエクスポート
export default SettingsPage;