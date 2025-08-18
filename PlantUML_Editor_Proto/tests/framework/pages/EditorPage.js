/**
 * EditorPage - PlantUML Editor メインページオブジェクト
 * 
 * Sprint3 Hybrid Object Model Framework
 * メインエディターページの操作・検証を提供
 */

import { BasePage } from '../base/BasePage.js';
import { ActionEditorComponent } from '../components/ActionEditorComponent.js';
import { PlantUMLPreviewComponent } from '../components/PlantUMLPreviewComponent.js';
import { expect } from '@playwright/test';

export class EditorPage extends BasePage {
  constructor(page, context = null) {
    super(page, context);
    
    // セレクター定義
    this.selectors = {
      // メインエリア
      editorContainer: '#plantuml-editor',
      editorTextarea: '#plantuml-code',
      previewArea: '#preview-area',
      
      // ツールバー
      toolbar: '.editor-toolbar',
      addActionButton: '[data-testid="add-action-button"]',
      addConditionButton: '[data-testid="add-condition-button"]', 
      addLoopButton: '[data-testid="add-loop-button"]',
      addParallelButton: '[data-testid="add-parallel-button"]',
      
      // アクション項目
      actionItems: '.action-item',
      dragHandle: '.drag-handle',
      deleteButton: '.delete-button',
      editButton: '.edit-button',
      
      // 日本語入力エリア
      japaneseInput: '#japanese-input',
      convertButton: '#convert-button',
      
      // 状態表示
      statusBar: '.status-bar',
      errorMessage: '.error-message',
      successMessage: '.success-message'
    };
    
    // コンポーネント初期化
    this.actionEditor = new ActionEditorComponent(page, '.action-editor-modal');
    this.plantUMLPreview = new PlantUMLPreviewComponent(page, '#preview-area');
  }

  /**
   * エディターページに遷移
   */
  async navigateToEditor() {
    const result = await this.navigate('/');
    await this.waitForEditorLoad();
    return result;
  }

  /**
   * エディター読み込み待機
   */
  async waitForEditorLoad() {
    await this.waitForElement(this.selectors.editorContainer);
    await this.waitForElement(this.selectors.editorTextarea);
    
    // JavaScript初期化完了待機
    await this.page.waitForFunction(() => {
      return window.PlantUMLEditor && window.PlantUMLEditor.initialized;
    }, { timeout: 10000 });
  }

  /**
   * PlantUMLコード取得
   */
  async getPlantUMLCode() {
    const element = await this.waitForElement(this.selectors.editorTextarea);
    return await element.textContent();
  }

  /**
   * PlantUMLコード設定
   */
  async setPlantUMLCode(code) {
    await this.fillSafe(this.selectors.editorTextarea, code);
    
    // プレビュー更新待機
    await this.page.waitForTimeout(500);
  }

  /**
   * 日本語入力からPlantUML変換
   */
  async convertJapaneseToPlantUML(japaneseText) {
    return await this.measurePerformance(async () => {
      // 日本語入力
      await this.fillSafe(this.selectors.japaneseInput, japaneseText);
      
      // 変換実行
      await this.clickSafe(this.selectors.convertButton);
      
      // 変換完了待機
      await this.page.waitForFunction(() => {
        const code = document.querySelector('#plantuml-code').value;
        return code && code.includes('@startuml');
      }, { timeout: 5000 });
      
      return await this.getPlantUMLCode();
    });
  }

  /**
   * アクション追加
   */
  async addAction(actionData) {
    // アクション追加ボタンクリック
    await this.clickSafe(this.selectors.addActionButton);
    
    // アクションエディターで編集
    await this.actionEditor.fillActionDetails(actionData);
    await this.actionEditor.save();
    
    // アクション項目表示確認
    await this.waitForElement(this.selectors.actionItems);
  }

  /**
   * アクション一覧取得
   */
  async getActionItems() {
    const elements = await this.page.$$(this.selectors.actionItems);
    const actions = [];
    
    for (const element of elements) {
      const action = {
        id: await element.getAttribute('data-action-id'),
        actorFrom: await element.locator('.actor-from').textContent(),
        arrowType: await element.locator('.arrow-type').textContent(),
        actorTo: await element.locator('.actor-to').textContent(),
        message: await element.locator('.message').textContent()
      };
      actions.push(action);
    }
    
    return actions;
  }

  /**
   * アクション編集
   */
  async editAction(actionId, newData) {
    // 特定アクションの編集ボタンクリック
    const actionElement = await this.page.locator(`[data-action-id="${actionId}"]`);
    await actionElement.locator('.edit-button').click();
    
    // アクションエディターで編集
    await this.actionEditor.fillActionDetails(newData);
    await this.actionEditor.save();
  }

  /**
   * アクション削除
   */
  async deleteAction(actionId) {
    const actionElement = await this.page.locator(`[data-action-id="${actionId}"]`);
    await actionElement.locator('.delete-button').click();
    
    // 確認ダイアログ処理
    await this.page.on('dialog', dialog => dialog.accept());
    
    // アクション削除確認
    await this.page.waitForSelector(`[data-action-id="${actionId}"]`, { state: 'detached' });
  }

  /**
   * ドラッグ&ドロップによるアクション順序変更
   */
  async reorderActions(fromIndex, toIndex) {
    const actionItems = await this.page.$$(this.selectors.actionItems);
    
    if (fromIndex >= actionItems.length || toIndex >= actionItems.length) {
      throw new Error('Invalid action index for reorder');
    }
    
    const sourceElement = actionItems[fromIndex];
    const targetElement = actionItems[toIndex];
    
    // ドラッグ&ドロップ実行
    await sourceElement.dragTo(targetElement);
    
    // DOM更新待機
    await this.page.waitForTimeout(500);
  }

  /**
   * プレビュー更新確認
   */
  async waitForPreviewUpdate() {
    await this.plantUMLPreview.waitForUpdate();
  }

  /**
   * エラーメッセージ確認
   */
  async getErrorMessage() {
    try {
      const errorElement = await this.page.waitForSelector(this.selectors.errorMessage, { timeout: 2000 });
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * 成功メッセージ確認
   */
  async getSuccessMessage() {
    try {
      const successElement = await this.page.waitForSelector(this.selectors.successMessage, { timeout: 2000 });
      return await successElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * エディター状態取得
   */
  async getEditorState() {
    return {
      plantUMLCode: await this.getPlantUMLCode(),
      actionItems: await this.getActionItems(),
      hasErrors: await this.getErrorMessage() !== null,
      japaneseInput: await this.page.inputValue(this.selectors.japaneseInput)
    };
  }

  /**
   * キーボードショートカット実行
   */
  async executeKeyboardShortcut(shortcut) {
    const shortcuts = {
      'save': 'Control+S',
      'undo': 'Control+Z',
      'redo': 'Control+Y',
      'copy': 'Control+C',
      'paste': 'Control+V',
      'selectAll': 'Control+A'
    };
    
    if (shortcuts[shortcut]) {
      await this.page.keyboard.press(shortcuts[shortcut]);
      await this.page.waitForTimeout(100);
    } else {
      throw new Error(`Unknown keyboard shortcut: ${shortcut}`);
    }
  }

  /**
   * アクセシビリティ検証
   */
  async validateAccessibility() {
    const issues = await super.checkAccessibility();
    
    // エディター固有のアクセシビリティチェック
    const editorIssues = await this.page.evaluate(() => {
      const issues = [];
      
      // フォーム要素のラベル確認
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (!label) {
            issues.push(`Form element missing label: ${input.id || input.name || input.tagName}`);
          }
        }
      });
      
      // キーボードナビゲーション確認
      const interactive = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
      interactive.forEach(el => {
        if (el.tabIndex === undefined || el.tabIndex < -1) {
          issues.push(`Element not keyboard accessible: ${el.tagName}${el.id ? '#' + el.id : ''}`);
        }
      });
      
      return issues;
    });
    
    return [...issues, ...editorIssues];
  }

  /**
   * パフォーマンステスト
   */
  async performanceTest() {
    const metrics = await this.performPerformanceChecks();
    
    // エディター固有のパフォーマンス測定
    const editorMetrics = await this.page.evaluate(() => {
      return {
        actionItemCount: document.querySelectorAll('.action-item').length,
        plantUMLCodeLength: document.getElementById('plantuml-code').value.length,
        previewRenderTime: window.__previewRenderTime || 0
      };
    });
    
    return { ...metrics, editor: editorMetrics };
  }

  /**
   * エディター機能包括検証
   */
  async assertEditorFunctional() {
    // 基本表示確認
    await this.assertPageLoaded();
    expect(await this.isVisible()).toBe(true);
    
    // 主要要素表示確認
    await expect(this.page.locator(this.selectors.editorContainer)).toBeVisible();
    await expect(this.page.locator(this.selectors.editorTextarea)).toBeVisible();
    await expect(this.page.locator(this.selectors.toolbar)).toBeVisible();
    
    // 日本語入力対応確認
    await this.checkJapaneseInputSupport(this.selectors.japaneseInput);
    
    // JavaScriptエラーなし確認
    await this.assertNoJavaScriptErrors();
    
    return true;
  }

  /**
   * セキュリティ検証
   */
  async validateSecurity() {
    const securityIssues = await this.performSecurityChecks();
    
    // XSS テスト
    const xssPayload = '<script>alert("XSS")</script>';
    await this.fillSafe(this.selectors.japaneseInput, xssPayload);
    
    // XSS実行されていないことを確認
    const alertTriggered = await this.page.evaluate(() => {
      return window.__xssAlertTriggered || false;
    });
    
    expect(alertTriggered).toBe(false);
    
    return securityIssues;
  }

  /**
   * エディターリセット
   */
  async reset() {
    await this.setPlantUMLCode('');
    await this.fillSafe(this.selectors.japaneseInput, '');
    
    // DOM状態リセット待機
    await this.page.waitForTimeout(500);
  }

  /**
   * ページクリーンアップ
   */
  async cleanup() {
    await this.reset();
    await super.cleanup();
  }
}

export default EditorPage;