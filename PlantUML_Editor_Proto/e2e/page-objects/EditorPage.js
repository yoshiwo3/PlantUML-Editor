/**
 * Editor Page Object Model
 * PlantUML Editor specific interactions
 */

import { BasePage } from './BasePage.js';
import { expect } from '@playwright/test';

export class EditorPage extends BasePage {
  constructor(page) {
    super(page);
    
    // エディター要素のセレクター
    this.selectors = {
      japaneseInput: '#japaneseInput',
      plantUMLOutput: '#plantUMLOutput',
      errorDisplay: '#errorDisplay',
      loadingIndicator: '.loading',
      syncStatus: '#syncStatus',
      diagramPreview: '#diagramPreview',
      saveButton: '#saveButton',
      loadButton: '#loadButton',
      exportButton: '#exportButton',
      settingsButton: '#settingsButton',
      helpButton: '#helpButton',
      
      // モーダル関連
      modal: '.modal',
      modalClose: '.modal-close',
      modalContent: '.modal-content',
      
      // エラーモーダル
      errorModal: '#errorModal',
      errorMessage: '#errorMessage',
      
      // 設定モーダル
      settingsModal: '#settingsModal',
      themeSelector: '#themeSelector',
      languageSelector: '#languageSelector',
      
      // インライン編集
      inlineEditor: '.inline-editor',
      inlineInput: '.inline-input',
      inlineSave: '.inline-save',
      inlineCancel: '.inline-cancel'
    };
  }

  /**
   * エディターページへの移動と初期化
   */
  async navigateToEditor() {
    await this.navigate('/');
    await this.waitForEditorInitialization();
  }

  /**
   * エディター初期化の完了を待機
   */
  async waitForEditorInitialization() {
    // 基本要素の表示確認
    await this.waitForSelector(this.selectors.japaneseInput, 15000);
    await this.waitForSelector(this.selectors.plantUMLOutput, 15000);
    
    // JavaScript初期化の確認
    await this.waitForFunction(() => {
      return window.PlantUMLParser && 
             window.RealtimeSyncManager && 
             document.querySelector('#japaneseInput') &&
             document.querySelector('#plantUMLOutput');
    }, 10000);
    
    // ローディングインジケーターの消失を待機
    try {
      await this.waitForSelectorToDisappear(this.selectors.loadingIndicator, 5000);
    } catch (error) {
      // ローディングインジケーターがない場合は無視
    }
  }

  /**
   * 日本語テキストの入力
   */
  async inputJapaneseText(text) {
    await this.fillInput(this.selectors.japaneseInput, text);
  }

  /**
   * PlantUML出力の取得
   */
  async getPlantUMLOutput() {
    return await this.page.textContent(this.selectors.plantUMLOutput);
  }

  /**
   * リアルタイム同期のテスト
   */
  async testRealtimeSync(inputText, timeout = 2000) {
    await this.inputJapaneseText(inputText);
    
    // 同期完了の待機
    await this.waitForFunction(() => {
      const output = document.querySelector('#plantUMLOutput');
      return output && output.textContent.includes('@startuml');
    }, timeout);
    
    return await this.getPlantUMLOutput();
  }

  /**
   * 日本語→PlantUML変換のテスト
   */
  async testJapaneseToPlantUMLConversion(inputText, expectedContents = []) {
    const output = await this.testRealtimeSync(inputText);
    
    // 基本的なPlantUML構造の確認
    expect(output).toContain('@startuml');
    expect(output).toContain('@enduml');
    
    // 期待される内容の確認
    for (const expectedContent of expectedContents) {
      expect(output).toContain(expectedContent);
    }
    
    return output;
  }

  /**
   * エラー表示の確認
   */
  async checkForErrors() {
    try {
      const errorElement = await this.page.locator(this.selectors.errorDisplay);
      if (await errorElement.isVisible()) {
        return await errorElement.textContent();
      }
    } catch (error) {
      // エラー要素が見つからない場合
    }
    return null;
  }

  /**
   * 同期ステータスの確認
   */
  async getSyncStatus() {
    try {
      const statusElement = await this.page.locator(this.selectors.syncStatus);
      if (await statusElement.isVisible()) {
        return await statusElement.textContent();
      }
    } catch (error) {
      // ステータス要素が見つからない場合
    }
    return null;
  }

  /**
   * 図表プレビューの確認
   */
  async isDiagramPreviewVisible() {
    try {
      return await this.page.locator(this.selectors.diagramPreview).isVisible();
    } catch (error) {
      return false;
    }
  }

  /**
   * 保存機能のテスト
   */
  async testSaveFunction() {
    await this.clickElement(this.selectors.saveButton);
    
    // 保存完了の確認（実装に応じて調整）
    await this.wait(1000);
  }

  /**
   * 読み込み機能のテスト
   */
  async testLoadFunction() {
    await this.clickElement(this.selectors.loadButton);
    
    // 読み込み完了の確認（実装に応じて調整）
    await this.wait(1000);
  }

  /**
   * エクスポート機能のテスト
   */
  async testExportFunction() {
    await this.clickElement(this.selectors.exportButton);
    
    // エクスポート処理の確認（実装に応じて調整）
    await this.wait(1000);
  }

  /**
   * 設定モーダルを開く
   */
  async openSettings() {
    await this.clickElement(this.selectors.settingsButton);
    await this.waitForSelector(this.selectors.settingsModal);
  }

  /**
   * 設定モーダルを閉じる
   */
  async closeSettings() {
    await this.clickElement(this.selectors.modalClose);
    await this.waitForSelectorToDisappear(this.selectors.settingsModal);
  }

  /**
   * テーマの変更
   */
  async changeTheme(theme) {
    await this.openSettings();
    await this.page.selectOption(this.selectors.themeSelector, theme);
    await this.closeSettings();
  }

  /**
   * 言語の変更
   */
  async changeLanguage(language) {
    await this.openSettings();
    await this.page.selectOption(this.selectors.languageSelector, language);
    await this.closeSettings();
  }

  /**
   * ヘルプの表示
   */
  async openHelp() {
    await this.clickElement(this.selectors.helpButton);
    
    // ヘルプ表示の確認（実装に応じて調整）
    await this.wait(1000);
  }

  /**
   * エラーモーダルの確認
   */
  async checkErrorModal() {
    try {
      const errorModal = await this.page.locator(this.selectors.errorModal);
      if (await errorModal.isVisible()) {
        const errorMessage = await this.page.textContent(this.selectors.errorMessage);
        return errorMessage;
      }
    } catch (error) {
      // エラーモーダルが見つからない場合
    }
    return null;
  }

  /**
   * インライン編集の開始
   */
  async startInlineEdit(elementSelector) {
    await this.page.dblclick(elementSelector);
    await this.waitForSelector(this.selectors.inlineEditor);
  }

  /**
   * インライン編集での値変更
   */
  async editInlineValue(newValue) {
    await this.fillInput(this.selectors.inlineInput, newValue);
    await this.clickElement(this.selectors.inlineSave);
  }

  /**
   * インライン編集のキャンセル
   */
  async cancelInlineEdit() {
    await this.clickElement(this.selectors.inlineCancel);
  }

  /**
   * 複数図表タイプのテスト
   */
  async testDiagramTypes() {
    const diagramTests = [
      {
        type: 'sequence',
        input: 'AさんがBさんにメッセージを送る',
        expectation: ['A', 'B', '->']
      },
      {
        type: 'usecase',
        input: 'ユーザーがシステムにログインする',
        expectation: ['ユーザー', 'システム', 'ログイン']
      },
      {
        type: 'class',
        input: 'ユーザークラスがデータを持つ',
        expectation: ['ユーザー', 'class']
      },
      {
        type: 'activity',
        input: '処理を開始して終了する',
        expectation: ['start', 'stop']
      }
    ];

    const results = [];
    
    for (const test of diagramTests) {
      try {
        const output = await this.testJapaneseToPlantUMLConversion(
          test.input, 
          test.expectation
        );
        results.push({
          type: test.type,
          input: test.input,
          output,
          success: true
        });
      } catch (error) {
        results.push({
          type: test.type,
          input: test.input,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }

  /**
   * パフォーマンステスト
   */
  async measureSyncPerformance(inputText) {
    const performanceData = await this.measurePerformance(async () => {
      await this.inputJapaneseText(inputText);
      await this.waitForFunction(() => {
        const output = document.querySelector('#plantUMLOutput');
        return output && output.textContent.includes('@startuml');
      }, 5000);
    });
    
    return {
      inputText,
      syncTime: performanceData,
      acceptable: performanceData < 100 // 100ms以下が目標
    };
  }

  /**
   * 文字種別処理のテスト
   */
  async testCharacterTypeHandling() {
    const characterTests = [
      { type: 'hiragana', text: 'ひらがなのてすと' },
      { type: 'katakana', text: 'カタカナのテスト' },
      { type: 'kanji', text: '漢字のテスト' },
      { type: 'mixed', text: 'システムAがDBにアクセス' },
      { type: 'english', text: 'English Test' },
      { type: 'numbers', text: '123番のテスト' },
      { type: 'symbols', text: 'テスト（記号）！？' }
    ];

    const results = [];
    
    for (const test of characterTests) {
      try {
        const output = await this.testRealtimeSync(test.text);
        results.push({
          type: test.type,
          input: test.text,
          output,
          preserved: output.includes(test.text),
          hasStructure: output.includes('@startuml') && output.includes('@enduml')
        });
      } catch (error) {
        results.push({
          type: test.type,
          input: test.text,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }

  /**
   * エディターのクリーンアップ
   */
  async cleanupEditor() {
    // 入力フィールドのクリア
    await this.fillInput(this.selectors.japaneseInput, '');
    
    // モーダルの閉じる
    try {
      const modals = await this.page.locator(this.selectors.modal);
      const modalCount = await modals.count();
      for (let i = 0; i < modalCount; i++) {
        if (await modals.nth(i).isVisible()) {
          await this.clickElement(this.selectors.modalClose);
        }
      }
    } catch (error) {
      // モーダルが存在しない場合は無視
    }
    
    // ストレージのクリア
    await this.clearLocalStorage();
    await this.clearSessionStorage();
  }
}