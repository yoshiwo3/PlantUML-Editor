/**
 * ActionEditor.js - アクション編集コンポーネント（CORE-005）
 * インライン編集機能を提供するアクションアイテムエディター
 * 
 * @author Claude Code
 * @version 4.0.0
 * @created 2025-08-16
 * @purpose Sprint2 コアエディター実装
 */

// セキュリティコンポーネントの動的インポート
let SecureActionEditor = null;

/**
 * ActionEditorクラス
 * アクション項目の7要素構成（ドラッグハンドル、FROM/TO アクター、矢印タイプ、メッセージ、削除・条件確認ボタン）
 * を管理する高機能エディターコンポーネント
 * 
 * ✅ Sprint2要件完全対応:
 * - アクション項目の7要素構成実装
 * - ドラッグ&ドロップ並び替え機能
 * - インライン編集機能
 * - セキュリティ統合（DOMPurify）
 * - パフォーマンス最適化
 * - エラーハンドリング強化
 */
export class ActionEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enableDragAndDrop: true,
      enableInlineEdit: true,
      enableConditions: true,
      securityEnabled: true,
      performanceOptimized: true,
      ...options
    };
    
    // セキュリティレイヤー統合（動的初期化）
    this.secureEditor = null;
    
    // アクションデータ
    this.actions = [];
    this.selectedAction = null;
    this.draggedElement = null;
    
    // パフォーマンス最適化
    this.renderQueue = [];
    this.isRendering = false;
    
    // イベントリスナー管理
    this.eventListeners = new Map();
    
    this.init();
  }

  /**
   * 初期化処理
   */
  async init() {
    try {
      // セキュリティコンポーネントの動的初期化
      await this.initializeSecurityLayer();
      
      // UI構築
      this.createStructure();
      this.attachEventListeners();
      this.setupDragAndDrop();
      
      console.log('✅ ActionEditor initialized successfully');
    } catch (error) {
      console.error('❌ ActionEditor initialization failed:', error);
      throw error;
    }
  }

  /**
   * セキュリティレイヤーの動的初期化
   */
  async initializeSecurityLayer() {
    if (this.options.securityEnabled) {
      try {
        // SecureActionEditorの動的インポート
        const module = await import('./SecureActionEditor.js');
        SecureActionEditor = module.SecureActionEditor;
        
        this.secureEditor = new SecureActionEditor();
        await this.secureEditor.initializeSanitizer();
        
        console.log('✅ Security layer initialized');
      } catch (error) {
        console.warn('⚠️ Security layer initialization failed, continuing without security features:', error);
        this.options.securityEnabled = false;
      }
    }
  }

  /**
   * UI構造の作成
   */
  createStructure() {
    this.container.innerHTML = `
      <div class="action-editor" data-component="action-editor">
        <div class="action-editor-header">
          <h3 class="editor-title">
            <span class="editor-icon">⚡</span>
            アクション編集
          </h3>
          <div class="editor-controls">
            <button class="btn-add-action" title="新しいアクションを追加">
              <span class="icon">➕</span>
              アクション追加
            </button>
            <button class="btn-clear-all" title="すべてクリア">
              <span class="icon">🗑️</span>
              クリア
            </button>
          </div>
        </div>
        
        <div class="action-editor-body">
          <div class="actions-container" data-container="actions">
            <!-- アクションアイテムが動的に挿入される -->
          </div>
          
          <div class="action-preview">
            <h4>PlantUMLプレビュー</h4>
            <pre class="plantuml-preview"><code></code></pre>
          </div>
        </div>
      </div>
    `;
    
    this.actionsContainer = this.container.querySelector('[data-container="actions"]');
    this.previewElement = this.container.querySelector('.plantuml-preview code');
  }

  /**
   * イベントリスナーの設定
   */
  attachEventListeners() {
    // 新規追加ボタン
    const addButton = this.container.querySelector('.btn-add-action');
    this.addEventListener(addButton, 'click', () => this.addAction());
    
    // クリアボタン
    const clearButton = this.container.querySelector('.btn-clear-all');
    this.addEventListener(clearButton, 'click', () => this.clearAll());
    
    // コンテナレベルのイベント（イベント委譲）
    this.addEventListener(this.actionsContainer, 'click', (e) => this.handleActionClick(e));
    this.addEventListener(this.actionsContainer, 'change', (e) => this.handleActionChange(e));
    this.addEventListener(this.actionsContainer, 'input', (e) => this.handleActionInput(e));
  }

  /**
   * メモリリーク対策のためのイベントリスナー管理
   */
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element).push({ event, handler });
  }

  /**
   * ドラッグ&ドロップ機能の設定
   */
  setupDragAndDrop() {
    if (!this.options.enableDragAndDrop) return;
    
    this.addEventListener(this.actionsContainer, 'dragstart', (e) => this.handleDragStart(e));
    this.addEventListener(this.actionsContainer, 'dragover', (e) => this.handleDragOver(e));
    this.addEventListener(this.actionsContainer, 'drop', (e) => this.handleDrop(e));
    this.addEventListener(this.actionsContainer, 'dragend', (e) => this.handleDragEnd(e));
  }

  /**
   * 新しいアクションを追加
   */
  async addAction(actionData = null) {
    const newAction = actionData || this.createDefaultAction();
    
    try {
      // セキュリティチェック
      if (this.options.securityEnabled && this.secureEditor) {
        const result = await this.secureEditor.editAction('edit-action', {
          ...newAction,
          csrfToken: this.secureEditor.csrfToken
        });
        
        if (!result.success) {
          throw new Error('セキュリティチェックに失敗しました');
        }
      }
      
      this.actions.push(newAction);
      this.queueRender();
      
      console.log('✅ Action added successfully:', newAction);
    } catch (error) {
      console.error('❌ Failed to add action:', error);
      this.showError('アクションの追加に失敗しました: ' + error.message);
    }
  }

  /**
   * デフォルトアクションデータの作成
   */
  createDefaultAction() {
    return {
      id: this.generateActionId(),
      from: 'User',
      to: 'System',
      arrowType: '->',
      message: '新しいアクション',
      condition: null,
      hasCondition: false,
      order: this.actions.length
    };
  }

  /**
   * アクションIDの生成
   */
  generateActionId() {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * アクションアイテムのレンダリング
   */
  renderActionItem(action, index) {
    const isConditioned = action.hasCondition;
    
    return `
      <div class="action-item ${isConditioned ? 'has-condition' : ''}" 
           data-action-id="${action.id}" 
           data-index="${index}"
           draggable="true">
        
        <!-- ドラッグハンドル -->
        <div class="drag-handle" title="ドラッグして並び替え">
          <span class="drag-icon">☰</span>
        </div>
        
        <!-- アクション番号 -->
        <div class="action-number">
          <span class="number">${index + 1}</span>
        </div>
        
        <!-- FROM アクター選択 -->
        <div class="actor-from">
          <label>FROM:</label>
          <select class="actor-select" data-field="from" title="送信者を選択">
            ${this.renderActorOptions(action.from)}
          </select>
        </div>
        
        <!-- 矢印タイプ選択 -->
        <div class="arrow-type">
          <select class="arrow-select" data-field="arrowType" title="矢印タイプを選択">
            <option value="->" ${action.arrowType === '->' ? 'selected' : ''}>→ 同期</option>
            <option value="->>" ${action.arrowType === '->>' ? 'selected' : ''}>⇢ 非同期</option>
            <option value="-->" ${action.arrowType === '-->' ? 'selected' : ''}>⟵ 戻り値</option>
            <option value="<<--" ${action.arrowType === '<<--' ? 'selected' : ''}>⟸ 非同期戻り</option>
          </select>
        </div>
        
        <!-- TO アクター選択 -->
        <div class="actor-to">
          <label>TO:</label>
          <select class="actor-select" data-field="to" title="受信者を選択">
            ${this.renderActorOptions(action.to)}
          </select>
        </div>
        
        <!-- メッセージ入力 -->
        <div class="message-input">
          <input type="text" 
                 class="message-field" 
                 data-field="message"
                 value="${this.escapeHtml(action.message)}"
                 placeholder="メッセージを入力"
                 title="アクションメッセージ">
        </div>
        
        <!-- 条件確認ボタン -->
        <div class="condition-button">
          <button class="btn-condition ${isConditioned ? 'active' : ''}" 
                  data-action="toggle-condition"
                  title="条件を設定">
            <span class="condition-icon">？</span>
          </button>
        </div>
        
        <!-- 削除ボタン -->
        <div class="delete-button">
          <button class="btn-delete" 
                  data-action="delete"
                  title="このアクションを削除">
            <span class="delete-icon">🗑️</span>
          </button>
        </div>
        
        <!-- 条件入力エリア（条件付きの場合のみ表示） -->
        ${isConditioned ? this.renderConditionArea(action) : ''}
      </div>
    `;
  }

  /**
   * アクターオプションのレンダリング
   */
  renderActorOptions(selectedActor) {
    const actors = ['User', 'System', 'Database', 'API', 'Service', 'External'];
    
    return actors.map(actor => 
      `<option value="${actor}" ${actor === selectedActor ? 'selected' : ''}>${actor}</option>`
    ).join('');
  }

  /**
   * 条件エリアのレンダリング
   */
  renderConditionArea(action) {
    return `
      <div class="condition-area">
        <div class="condition-header">
          <span class="condition-label">🔀 条件:</span>
        </div>
        <div class="condition-input">
          <input type="text" 
                 class="condition-field" 
                 data-field="condition"
                 value="${this.escapeHtml(action.condition || '')}"
                 placeholder="条件を入力（例: 認証済みの場合）">
        </div>
      </div>
    `;
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * アクションクリックハンドラー
   */
  async handleActionClick(e) {
    const target = e.target;
    const actionItem = target.closest('.action-item');
    
    if (!actionItem) return;
    
    const actionId = actionItem.dataset.actionId;
    const action = this.actions.find(a => a.id === actionId);
    
    if (!action) return;
    
    const actionType = target.dataset.action;
    
    switch (actionType) {
      case 'delete':
        await this.deleteAction(action);
        break;
      case 'toggle-condition':
        await this.toggleCondition(action);
        break;
    }
  }

  /**
   * アクション変更ハンドラー
   */
  async handleActionChange(e) {
    const target = e.target;
    const actionItem = target.closest('.action-item');
    
    if (!actionItem) return;
    
    const actionId = actionItem.dataset.actionId;
    const action = this.actions.find(a => a.id === actionId);
    const field = target.dataset.field;
    
    if (!action || !field) return;
    
    const oldValue = action[field];
    const newValue = target.value;
    
    if (oldValue !== newValue) {
      await this.updateActionField(action, field, newValue);
    }
  }

  /**
   * アクション入力ハンドラー（リアルタイム更新）
   */
  handleActionInput(e) {
    const target = e.target;
    
    if (target.classList.contains('message-field') || target.classList.contains('condition-field')) {
      // デバウンス処理でパフォーマンス最適化
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        this.handleActionChange(e);
      }, 300);
    }
  }

  /**
   * アクションフィールドの更新
   */
  async updateActionField(action, field, value) {
    try {
      // セキュリティ検証
      if (this.options.securityEnabled && this.secureEditor && typeof value === 'string') {
        const sanitized = await this.secureEditor.sanitizeData({ [field]: value });
        value = sanitized[field];
      }
      
      action[field] = value;
      this.updatePreview();
      
      console.log(`✅ Action field updated: ${field} = ${value}`);
    } catch (error) {
      console.error('❌ Failed to update action field:', error);
      this.showError('フィールドの更新に失敗しました');
    }
  }

  /**
   * アクションの削除
   */
  async deleteAction(action) {
    try {
      if (!confirm('このアクションを削除しますか？')) {
        return;
      }
      
      const index = this.actions.indexOf(action);
      if (index > -1) {
        this.actions.splice(index, 1);
        this.queueRender();
        
        console.log('✅ Action deleted successfully:', action.id);
      }
    } catch (error) {
      console.error('❌ Failed to delete action:', error);
      this.showError('アクションの削除に失敗しました');
    }
  }

  /**
   * 条件の切り替え
   */
  async toggleCondition(action) {
    try {
      action.hasCondition = !action.hasCondition;
      
      if (!action.hasCondition) {
        action.condition = null;
      }
      
      this.queueRender();
      
      console.log(`✅ Condition toggled for action ${action.id}: ${action.hasCondition}`);
    } catch (error) {
      console.error('❌ Failed to toggle condition:', error);
      this.showError('条件の切り替えに失敗しました');
    }
  }

  /**
   * すべてクリア
   */
  clearAll() {
    if (this.actions.length === 0) return;
    
    if (confirm('すべてのアクションを削除しますか？')) {
      this.actions = [];
      this.queueRender();
      console.log('✅ All actions cleared');
    }
  }

  /**
   * パフォーマンス最適化されたレンダリングキュー
   */
  queueRender() {
    if (this.isRendering) return;
    
    this.isRendering = true;
    requestAnimationFrame(() => {
      this.render();
      this.isRendering = false;
    });
  }

  /**
   * メインレンダリング処理
   */
  render() {
    const actionsHtml = this.actions
      .map((action, index) => this.renderActionItem(action, index))
      .join('');
    
    this.actionsContainer.innerHTML = actionsHtml;
    this.updatePreview();
  }

  /**
   * PlantUMLプレビューの更新
   */
  updatePreview() {
    const plantUMLCode = this.generatePlantUML();
    this.previewElement.textContent = plantUMLCode;
  }

  /**
   * PlantUMLコードの生成
   */
  generatePlantUML() {
    if (this.actions.length === 0) {
      return '@startuml\n// アクションを追加してください\n@enduml';
    }
    
    let code = '@startuml\n';
    
    // アクター定義
    const actors = [...new Set([
      ...this.actions.map(a => a.from),
      ...this.actions.map(a => a.to)
    ])];
    
    actors.forEach(actor => {
      code += `participant ${actor}\n`;
    });
    
    code += '\n';
    
    // アクション生成
    this.actions.forEach(action => {
      if (action.hasCondition && action.condition) {
        code += `alt ${action.condition}\n`;
        code += `  ${action.from} ${action.arrowType} ${action.to}: ${action.message}\n`;
        code += `end\n`;
      } else {
        code += `${action.from} ${action.arrowType} ${action.to}: ${action.message}\n`;
      }
    });
    
    code += '@enduml';
    
    return code;
  }

  /**
   * ドラッグ操作のハンドリング
   */
  handleDragStart(e) {
    const actionItem = e.target.closest('.action-item');
    if (!actionItem) return;
    
    this.draggedElement = actionItem;
    actionItem.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', actionItem.outerHTML);
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientY);
    
    if (afterElement == null) {
      this.actionsContainer.appendChild(this.draggedElement);
    } else {
      this.actionsContainer.insertBefore(this.draggedElement, afterElement);
    }
  }

  handleDrop(e) {
    e.preventDefault();
    this.reorderActions();
  }

  handleDragEnd(e) {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
    }
  }

  /**
   * ドラッグ後の要素位置決定
   */
  getDragAfterElement(y) {
    const draggableElements = [...this.actionsContainer.querySelectorAll('.action-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /**
   * アクションの並び替え
   */
  reorderActions() {
    const actionItems = [...this.actionsContainer.querySelectorAll('.action-item')];
    const newOrder = actionItems.map(item => item.dataset.actionId);
    
    this.actions.sort((a, b) => {
      return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
    });
    
    this.actions.forEach((action, index) => {
      action.order = index;
    });
    
    this.updatePreview();
    console.log('✅ Actions reordered successfully');
  }

  /**
   * エラー表示
   */
  showError(message) {
    // 簡易的なエラー表示（実際の実装では専用のUIコンポーネントを使用）
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  /**
   * データのエクスポート
   */
  exportData() {
    return {
      actions: this.actions,
      plantUML: this.generatePlantUML(),
      metadata: {
        version: '4.0.0',
        exportedAt: new Date().toISOString(),
        actionCount: this.actions.length
      }
    };
  }

  /**
   * データのインポート
   */
  async importData(data) {
    try {
      if (!data.actions || !Array.isArray(data.actions)) {
        throw new Error('Invalid data format');
      }
      
      this.actions = data.actions;
      this.queueRender();
      
      console.log('✅ Data imported successfully');
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      this.showError('データのインポートに失敗しました');
    }
  }

  /**
   * リソースクリーンアップ
   */
  destroy() {
    // イベントリスナーのクリーンアップ
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventListeners.clear();
    
    // タイマーのクリーンアップ
    if (this.inputTimeout) {
      clearTimeout(this.inputTimeout);
    }
    
    // セキュリティエディターのクリーンアップ
    if (this.secureEditor) {
      this.secureEditor.destroy();
    }
    
    // データクリア
    this.actions = [];
    this.selectedAction = null;
    this.draggedElement = null;
    
    console.log('✅ ActionEditor destroyed and cleaned up');
  }
}

// CSS スタイル定義（実際の実装では外部CSSファイルに分離）
const CSS_STYLES = `
.action-editor {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.action-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.editor-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.editor-controls {
  display: flex;
  gap: 8px;
}

.btn-add-action,
.btn-clear-all {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-add-action:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.btn-clear-all:hover {
  background: #ffebee;
  border-color: #f44336;
}

.action-editor-body {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  padding: 16px;
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.action-item {
  display: grid;
  grid-template-columns: 40px 40px 120px 80px 120px 1fr 40px 40px;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  align-items: center;
  transition: all 0.2s;
}

.action-item:hover {
  border-color: #2196f3;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.1);
}

.action-item.dragging {
  opacity: 0.5;
  transform: rotate(3deg);
}

.action-item.has-condition {
  border-color: #ff9800;
  background: #fff8e1;
}

.drag-handle {
  cursor: grab;
  color: #666;
  text-align: center;
  padding: 4px;
  border-radius: 4px;
}

.drag-handle:hover {
  background: #f0f0f0;
}

.action-number {
  text-align: center;
  font-weight: 600;
  color: #666;
}

.actor-select,
.arrow-select,
.message-field,
.condition-field {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.actor-select:focus,
.arrow-select:focus,
.message-field:focus,
.condition-field:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.btn-condition {
  width: 32px;
  height: 32px;
  border: 2px solid #ff9800;
  border-radius: 50%;
  background: white;
  color: #ff9800;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-condition.active {
  background: #ff9800;
  color: white;
}

.btn-condition:hover {
  transform: scale(1.1);
}

.btn-delete {
  width: 32px;
  height: 32px;
  border: 2px solid #f44336;
  border-radius: 50%;
  background: white;
  color: #f44336;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #f44336;
  color: white;
  transform: scale(1.1);
}

.condition-area {
  grid-column: 1 / -1;
  margin-top: 8px;
  padding: 12px;
  background: #fff3e0;
  border-radius: 4px;
  border: 1px solid #ff9800;
}

.condition-header {
  font-weight: 600;
  color: #e65100;
  margin-bottom: 8px;
}

.action-preview {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
}

.action-preview h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.plantuml-preview {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.error-message {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .action-editor-body {
    grid-template-columns: 1fr;
  }
  
  .action-item {
    grid-template-columns: 30px 30px 100px 60px 100px 1fr 30px 30px;
    gap: 4px;
    padding: 8px;
  }
}
`;

// スタイルの動的挿入
if (!document.getElementById('action-editor-styles')) {
  const style = document.createElement('style');
  style.id = 'action-editor-styles';
  style.textContent = CSS_STYLES;
  document.head.appendChild(style);
}

export default ActionEditor;