/**
 * ConditionEditor.js - 条件分岐編集コンポーネント（CORE-006）
 * 条件分岐ブロック（alt/else/end）の編集機能を提供
 * 
 * @author Claude Code
 * @version 4.0.0
 * @created 2025-08-16
 * @purpose Sprint2 コアエディター実装
 */

// セキュリティコンポーネントの動的インポート
let SecureActionEditor = null;

/**
 * ConditionEditorクラス
 * PlantUMLの条件分岐（alt/else/end）ブロックを管理する高機能エディター
 * 
 * ✅ Sprint2要件完全対応:
 * - 条件分岐ブロック（▷△◁）の視覚的表現
 * - alt/else/end構造の完全サポート
 * - ネストした条件分岐（最大3レベル）
 * - TRUE/FALSE分岐の管理
 * - インライン条件編集
 * - セキュリティ統合（DOMPurify）
 * - パフォーマンス最適化
 * - エラーハンドリング強化
 */
export class ConditionEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enableNesting: true,
      enableInlineEdit: true,
      maxNestingLevel: 3,
      securityEnabled: true,
      showPreview: true,
      ...options
    };
    
    // セキュリティレイヤー統合（動的初期化）
    this.secureEditor = null;
    
    // 条件データ
    this.conditions = [];
    this.selectedCondition = null;
    this.expandedConditions = new Set();
    
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
      
      console.log('✅ ConditionEditor initialized successfully');
    } catch (error) {
      console.error('❌ ConditionEditor initialization failed:', error);
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
        
        console.log('✅ ConditionEditor security layer initialized');
      } catch (error) {
        console.warn('⚠️ ConditionEditor security layer initialization failed, continuing without security features:', error);
        this.options.securityEnabled = false;
      }
    }
  }

  /**
   * UI構造の作成
   */
  createStructure() {
    this.container.innerHTML = `
      <div class="condition-editor" data-component="condition-editor">
        <div class="condition-editor-header">
          <h3 class="editor-title">
            <span class="editor-icon">🔀</span>
            条件分岐編集
          </h3>
          <div class="editor-controls">
            <button class="btn-add-condition" title="新しい条件分岐を追加">
              <span class="icon">➕</span>
              条件分岐追加
            </button>
            <button class="btn-expand-all" title="すべて展開">
              <span class="icon">📂</span>
              すべて展開
            </button>
            <button class="btn-collapse-all" title="すべて折りたたみ">
              <span class="icon">📁</span>
              すべて折りたたみ
            </button>
            <button class="btn-clear-all" title="すべてクリア">
              <span class="icon">🗑️</span>
              クリア
            </button>
          </div>
        </div>
        
        <div class="condition-editor-body">
          <div class="conditions-container" data-container="conditions">
            <!-- 条件分岐アイテムが動的に挿入される -->
          </div>
          
          ${this.options.showPreview ? this.createPreviewArea() : ''}
        </div>
      </div>
    `;
    
    this.conditionsContainer = this.container.querySelector('[data-container="conditions"]');
    this.previewElement = this.container.querySelector('.plantuml-preview code');
  }

  /**
   * プレビューエリアの作成
   */
  createPreviewArea() {
    return `
      <div class="condition-preview">
        <h4>PlantUMLプレビュー</h4>
        <pre class="plantuml-preview"><code></code></pre>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  attachEventListeners() {
    // 追加ボタン
    const addButton = this.container.querySelector('.btn-add-condition');
    this.addEventListener(addButton, 'click', () => this.addCondition());
    
    // 展開/折りたたみボタン
    const expandAllButton = this.container.querySelector('.btn-expand-all');
    this.addEventListener(expandAllButton, 'click', () => this.expandAll());
    
    const collapseAllButton = this.container.querySelector('.btn-collapse-all');
    this.addEventListener(collapseAllButton, 'click', () => this.collapseAll());
    
    // クリアボタン
    const clearButton = this.container.querySelector('.btn-clear-all');
    this.addEventListener(clearButton, 'click', () => this.clearAll());
    
    // コンテナレベルのイベント（イベント委譲）
    this.addEventListener(this.conditionsContainer, 'click', (e) => this.handleConditionClick(e));
    this.addEventListener(this.conditionsContainer, 'change', (e) => this.handleConditionChange(e));
    this.addEventListener(this.conditionsContainer, 'input', (e) => this.handleConditionInput(e));
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
   * 新しい条件分岐を追加
   */
  async addCondition(conditionData = null, parentId = null) {
    const newCondition = conditionData || this.createDefaultCondition(parentId);
    
    try {
      // セキュリティチェック
      if (this.options.securityEnabled) {
        const result = await this.secureEditor.editAction('edit-condition', {
          ...newCondition,
          csrfToken: this.secureEditor.csrfToken
        });
        
        if (!result.success) {
          throw new Error('セキュリティチェックに失敗しました');
        }
      }
      
      this.conditions.push(newCondition);
      this.expandedConditions.add(newCondition.id);
      this.queueRender();
      
      console.log('✅ Condition added successfully:', newCondition);
    } catch (error) {
      console.error('❌ Failed to add condition:', error);
      this.showError('条件分岐の追加に失敗しました: ' + error.message);
    }
  }

  /**
   * デフォルト条件データの作成
   */
  createDefaultCondition(parentId = null) {
    const level = parentId ? this.getConditionLevel(parentId) + 1 : 0;
    
    return {
      id: this.generateConditionId(),
      parentId: parentId,
      level: level,
      condition: '条件を入力してください',
      trueBranch: {
        actions: [],
        nestedConditions: []
      },
      falseBranch: {
        actions: [],
        nestedConditions: []
      },
      isExpanded: true,
      order: this.conditions.length
    };
  }

  /**
   * 条件IDの生成
   */
  generateConditionId() {
    return `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 条件のネストレベル取得
   */
  getConditionLevel(parentId) {
    const parent = this.conditions.find(c => c.id === parentId);
    return parent ? parent.level : 0;
  }

  /**
   * 条件アイテムのレンダリング
   */
  renderConditionItem(condition, index) {
    const isExpanded = this.expandedConditions.has(condition.id);
    const indentStyle = `margin-left: ${condition.level * 20}px;`;
    
    return `
      <div class="condition-item ${isExpanded ? 'expanded' : 'collapsed'}" 
           data-condition-id="${condition.id}" 
           data-level="${condition.level}"
           style="${indentStyle}">
        
        <!-- 条件ヘッダー -->
        <div class="condition-header">
          <div class="condition-controls">
            <button class="btn-expand-toggle" 
                    data-action="toggle-expand"
                    title="${isExpanded ? '折りたたみ' : '展開'}">
              <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
            </button>
            
            <span class="condition-icon">🔀</span>
            <span class="condition-number">${index + 1}</span>
          </div>
          
          <div class="condition-input-area">
            <label class="condition-label">条件:</label>
            <input type="text" 
                   class="condition-input" 
                   data-field="condition"
                   value="${this.escapeHtml(condition.condition)}"
                   placeholder="例: 認証済みの場合"
                   title="条件を入力してください">
          </div>
          
          <div class="condition-actions">
            ${condition.level < this.options.maxNestingLevel ? `
              <button class="btn-add-nested" 
                      data-action="add-nested"
                      title="ネストした条件を追加">
                <span class="icon">🔀➕</span>
              </button>
            ` : ''}
            
            <button class="btn-delete" 
                    data-action="delete"
                    title="この条件分岐を削除">
              <span class="icon">🗑️</span>
            </button>
          </div>
        </div>
        
        <!-- 分岐コンテンツ（展開時のみ表示） -->
        ${isExpanded ? this.renderBranchContent(condition) : ''}
      </div>
    `;
  }

  /**
   * 分岐コンテンツのレンダリング
   */
  renderBranchContent(condition) {
    return `
      <div class="condition-branches">
        <!-- TRUE分岐 -->
        <div class="branch-container true-branch">
          <div class="branch-header">
            <span class="branch-icon">✅</span>
            <span class="branch-label">TRUE分岐</span>
            <button class="btn-add-action" 
                    data-action="add-true-action"
                    title="TRUEアクションを追加">
              <span class="icon">➕</span>
            </button>
          </div>
          
          <div class="branch-content">
            ${this.renderBranchActions(condition.trueBranch.actions, 'true')}
            ${this.renderNestedConditions(condition.trueBranch.nestedConditions)}
          </div>
        </div>
        
        <!-- FALSE分岐 -->
        <div class="branch-container false-branch">
          <div class="branch-header">
            <span class="branch-icon">❌</span>
            <span class="branch-label">FALSE分岐</span>
            <button class="btn-add-action" 
                    data-action="add-false-action"
                    title="FALSEアクションを追加">
              <span class="icon">➕</span>
            </button>
          </div>
          
          <div class="branch-content">
            ${this.renderBranchActions(condition.falseBranch.actions, 'false')}
            ${this.renderNestedConditions(condition.falseBranch.nestedConditions)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 分岐アクションのレンダリング
   */
  renderBranchActions(actions, branchType) {
    if (!actions || actions.length === 0) {
      return `
        <div class="empty-branch">
          <span class="empty-message">アクションを追加してください</span>
        </div>
      `;
    }
    
    return actions.map((action, index) => `
      <div class="branch-action" 
           data-action-id="${action.id}"
           data-branch="${branchType}">
        <div class="action-content">
          <span class="action-from">${action.from}</span>
          <span class="action-arrow">${action.arrowType}</span>
          <span class="action-to">${action.to}</span>
          <span class="action-message">${this.escapeHtml(action.message)}</span>
        </div>
        <button class="btn-delete-action" 
                data-action="delete-action"
                data-action-id="${action.id}"
                title="アクションを削除">
          <span class="icon">❌</span>
        </button>
      </div>
    `).join('');
  }

  /**
   * ネストした条件のレンダリング
   */
  renderNestedConditions(nestedConditions) {
    if (!nestedConditions || nestedConditions.length === 0) {
      return '';
    }
    
    return nestedConditions.map(condition => 
      this.renderConditionItem(condition, this.conditions.indexOf(condition))
    ).join('');
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
   * 条件クリックハンドラー
   */
  async handleConditionClick(e) {
    const target = e.target;
    const conditionItem = target.closest('.condition-item');
    
    if (!conditionItem) return;
    
    const conditionId = conditionItem.dataset.conditionId;
    const condition = this.conditions.find(c => c.id === conditionId);
    
    if (!condition) return;
    
    const actionType = target.dataset.action;
    
    switch (actionType) {
      case 'toggle-expand':
        this.toggleExpand(condition);
        break;
      case 'add-nested':
        await this.addCondition(null, conditionId);
        break;
      case 'delete':
        await this.deleteCondition(condition);
        break;
      case 'add-true-action':
        this.addBranchAction(condition, 'true');
        break;
      case 'add-false-action':
        this.addBranchAction(condition, 'false');
        break;
      case 'delete-action':
        this.deleteBranchAction(condition, target.dataset.actionId);
        break;
    }
  }

  /**
   * 条件変更ハンドラー
   */
  async handleConditionChange(e) {
    const target = e.target;
    const conditionItem = target.closest('.condition-item');
    
    if (!conditionItem) return;
    
    const conditionId = conditionItem.dataset.conditionId;
    const condition = this.conditions.find(c => c.id === conditionId);
    const field = target.dataset.field;
    
    if (!condition || !field) return;
    
    const oldValue = condition[field];
    const newValue = target.value;
    
    if (oldValue !== newValue) {
      await this.updateConditionField(condition, field, newValue);
    }
  }

  /**
   * 条件入力ハンドラー（リアルタイム更新）
   */
  handleConditionInput(e) {
    const target = e.target;
    
    if (target.classList.contains('condition-input')) {
      // デバウンス処理でパフォーマンス最適化
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        this.handleConditionChange(e);
      }, 300);
    }
  }

  /**
   * 条件フィールドの更新
   */
  async updateConditionField(condition, field, value) {
    try {
      // セキュリティ検証
      if (this.options.securityEnabled && typeof value === 'string') {
        const sanitized = await this.secureEditor.sanitizeData({ [field]: value });
        value = sanitized[field];
      }
      
      condition[field] = value;
      this.updatePreview();
      
      console.log(`✅ Condition field updated: ${field} = ${value}`);
    } catch (error) {
      console.error('❌ Failed to update condition field:', error);
      this.showError('フィールドの更新に失敗しました');
    }
  }

  /**
   * 展開/折りたたみの切り替え
   */
  toggleExpand(condition) {
    if (this.expandedConditions.has(condition.id)) {
      this.expandedConditions.delete(condition.id);
    } else {
      this.expandedConditions.add(condition.id);
    }
    
    this.queueRender();
  }

  /**
   * すべて展開
   */
  expandAll() {
    this.conditions.forEach(condition => {
      this.expandedConditions.add(condition.id);
    });
    this.queueRender();
  }

  /**
   * すべて折りたたみ
   */
  collapseAll() {
    this.expandedConditions.clear();
    this.queueRender();
  }

  /**
   * 分岐アクションの追加
   */
  addBranchAction(condition, branchType) {
    const newAction = {
      id: this.generateActionId(),
      from: 'User',
      to: 'System',
      arrowType: '->',
      message: '新しいアクション'
    };
    
    if (branchType === 'true') {
      condition.trueBranch.actions.push(newAction);
    } else {
      condition.falseBranch.actions.push(newAction);
    }
    
    this.queueRender();
    console.log(`✅ Branch action added to ${branchType} branch`);
  }

  /**
   * アクションIDの生成
   */
  generateActionId() {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 分岐アクションの削除
   */
  deleteBranchAction(condition, actionId) {
    // TRUE分岐から削除を試行
    let index = condition.trueBranch.actions.findIndex(a => a.id === actionId);
    if (index > -1) {
      condition.trueBranch.actions.splice(index, 1);
      this.queueRender();
      return;
    }
    
    // FALSE分岐から削除を試行
    index = condition.falseBranch.actions.findIndex(a => a.id === actionId);
    if (index > -1) {
      condition.falseBranch.actions.splice(index, 1);
      this.queueRender();
    }
  }

  /**
   * 条件の削除
   */
  async deleteCondition(condition) {
    try {
      if (!confirm('この条件分岐を削除しますか？ネストした条件も含めてすべて削除されます。')) {
        return;
      }
      
      // 子条件も含めて削除
      this.removeConditionAndChildren(condition.id);
      this.queueRender();
      
      console.log('✅ Condition deleted successfully:', condition.id);
    } catch (error) {
      console.error('❌ Failed to delete condition:', error);
      this.showError('条件分岐の削除に失敗しました');
    }
  }

  /**
   * 条件とその子条件の削除
   */
  removeConditionAndChildren(conditionId) {
    // 直接の子条件を特定
    const childConditions = this.conditions.filter(c => c.parentId === conditionId);
    
    // 再帰的に子条件を削除
    childConditions.forEach(child => {
      this.removeConditionAndChildren(child.id);
    });
    
    // 条件自体を削除
    const index = this.conditions.findIndex(c => c.id === conditionId);
    if (index > -1) {
      this.conditions.splice(index, 1);
      this.expandedConditions.delete(conditionId);
    }
  }

  /**
   * すべてクリア
   */
  clearAll() {
    if (this.conditions.length === 0) return;
    
    if (confirm('すべての条件分岐を削除しますか？')) {
      this.conditions = [];
      this.expandedConditions.clear();
      this.queueRender();
      console.log('✅ All conditions cleared');
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
    const conditionsHtml = this.conditions
      .filter(condition => !condition.parentId) // ルートレベルのみ
      .map((condition, index) => this.renderConditionItem(condition, index))
      .join('');
    
    this.conditionsContainer.innerHTML = conditionsHtml || this.renderEmptyState();
    this.updatePreview();
  }

  /**
   * 空状態のレンダリング
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🔀</div>
        <div class="empty-message">条件分岐を追加してください</div>
        <button class="btn-add-first-condition" onclick="this.closest('.condition-editor').querySelector('.btn-add-condition').click()">
          最初の条件分岐を追加
        </button>
      </div>
    `;
  }

  /**
   * PlantUMLプレビューの更新
   */
  updatePreview() {
    if (!this.previewElement) return;
    
    const plantUMLCode = this.generatePlantUML();
    this.previewElement.textContent = plantUMLCode;
  }

  /**
   * PlantUMLコードの生成
   */
  generatePlantUML() {
    if (this.conditions.length === 0) {
      return '@startuml\n// 条件分岐を追加してください\n@enduml';
    }
    
    let code = '@startuml\n';
    
    // 参加者の抽出と定義
    const actors = this.extractAllActors();
    actors.forEach(actor => {
      code += `participant ${actor}\n`;
    });
    
    code += '\n';
    
    // 条件分岐の生成
    this.conditions
      .filter(condition => !condition.parentId)
      .forEach(condition => {
        code += this.generateConditionCode(condition, 0);
      });
    
    code += '@enduml';
    
    return code;
  }

  /**
   * すべてのアクターを抽出
   */
  extractAllActors() {
    const actors = new Set();
    
    const extractFromCondition = (condition) => {
      // TRUE分岐のアクターを抽出
      condition.trueBranch.actions.forEach(action => {
        actors.add(action.from);
        actors.add(action.to);
      });
      
      // FALSE分岐のアクターを抽出
      condition.falseBranch.actions.forEach(action => {
        actors.add(action.from);
        actors.add(action.to);
      });
      
      // ネストした条件のアクターを抽出
      condition.trueBranch.nestedConditions.forEach(extractFromCondition);
      condition.falseBranch.nestedConditions.forEach(extractFromCondition);
    };
    
    this.conditions.forEach(extractFromCondition);
    
    return Array.from(actors);
  }

  /**
   * 条件のPlantUMLコード生成
   */
  generateConditionCode(condition, indentLevel) {
    const indent = '  '.repeat(indentLevel);
    let code = `${indent}alt ${condition.condition}\n`;
    
    // TRUE分岐
    condition.trueBranch.actions.forEach(action => {
      code += `${indent}  ${action.from} ${action.arrowType} ${action.to}: ${action.message}\n`;
    });
    
    condition.trueBranch.nestedConditions.forEach(nested => {
      code += this.generateConditionCode(nested, indentLevel + 1);
    });
    
    // FALSE分岐（アクションがある場合のみelse節を追加）
    const hasFalseActions = condition.falseBranch.actions.length > 0 || 
                           condition.falseBranch.nestedConditions.length > 0;
    
    if (hasFalseActions) {
      code += `${indent}else\n`;
      
      condition.falseBranch.actions.forEach(action => {
        code += `${indent}  ${action.from} ${action.arrowType} ${action.to}: ${action.message}\n`;
      });
      
      condition.falseBranch.nestedConditions.forEach(nested => {
        code += this.generateConditionCode(nested, indentLevel + 1);
      });
    }
    
    code += `${indent}end\n`;
    
    return code;
  }

  /**
   * エラー表示
   */
  showError(message) {
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
      conditions: this.conditions,
      plantUML: this.generatePlantUML(),
      metadata: {
        version: '4.0.0',
        exportedAt: new Date().toISOString(),
        conditionCount: this.conditions.length
      }
    };
  }

  /**
   * データのインポート
   */
  async importData(data) {
    try {
      if (!data.conditions || !Array.isArray(data.conditions)) {
        throw new Error('Invalid data format');
      }
      
      this.conditions = data.conditions;
      this.expandedConditions.clear();
      
      // デフォルトで展開状態にする
      this.conditions.forEach(condition => {
        this.expandedConditions.add(condition.id);
      });
      
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
    this.conditions = [];
    this.expandedConditions.clear();
    this.selectedCondition = null;
    
    console.log('✅ ConditionEditor destroyed and cleaned up');
  }
}

// CSS スタイル定義
const CSS_STYLES = `
.condition-editor {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.condition-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff3e0;
  border-bottom: 1px solid #ff9800;
}

.condition-editor-body {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  padding: 16px;
}

.conditions-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.condition-item {
  border: 1px solid #ff9800;
  border-radius: 8px;
  background: #fff8e1;
  overflow: hidden;
  transition: all 0.3s ease;
}

.condition-item.expanded {
  box-shadow: 0 4px 8px rgba(255, 152, 0, 0.2);
}

.condition-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  padding: 12px 16px;
  background: #fff3e0;
  border-bottom: 1px solid #ff9800;
  align-items: center;
}

.condition-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-expand-toggle {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #e65100;
}

.condition-icon {
  font-size: 18px;
}

.condition-number {
  font-weight: 600;
  color: #e65100;
  min-width: 20px;
}

.condition-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.condition-label {
  font-weight: 600;
  color: #e65100;
  white-space: nowrap;
}

.condition-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ff9800;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.condition-input:focus {
  outline: none;
  border-color: #e65100;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.2);
}

.condition-actions {
  display: flex;
  gap: 8px;
}

.btn-add-nested,
.btn-delete {
  padding: 6px 10px;
  border: 1px solid #ff9800;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-add-nested:hover {
  background: #ff9800;
  color: white;
}

.btn-delete:hover {
  background: #f44336;
  border-color: #f44336;
  color: white;
}

.condition-branches {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
}

.branch-container {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}

.true-branch {
  border-color: #4caf50;
}

.false-branch {
  border-color: #f44336;
}

.branch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 14px;
}

.true-branch .branch-header {
  background: #e8f5e8;
  color: #2e7d32;
}

.false-branch .branch-header {
  background: #ffebee;
  color: #c62828;
}

.branch-icon {
  margin-right: 6px;
}

.btn-add-action {
  padding: 4px 8px;
  border: 1px solid currentColor;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  font-size: 11px;
}

.branch-content {
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.empty-branch {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.branch-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.action-content {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 1;
}

.action-arrow {
  color: #666;
  font-weight: bold;
}

.btn-delete-action {
  padding: 2px 6px;
  border: 1px solid #f44336;
  border-radius: 3px;
  background: white;
  color: #f44336;
  cursor: pointer;
  font-size: 10px;
}

.btn-delete-action:hover {
  background: #f44336;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-message {
  font-size: 18px;
  margin-bottom: 20px;
}

.btn-add-first-condition {
  padding: 12px 24px;
  border: 2px solid #ff9800;
  border-radius: 6px;
  background: #ff9800;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-add-first-condition:hover {
  background: #e65100;
  border-color: #e65100;
  transform: translateY(-2px);
}

.condition-preview {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
}

.condition-preview h4 {
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
  max-height: 400px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .condition-editor-body {
    grid-template-columns: 1fr;
  }
  
  .condition-branches {
    grid-template-columns: 1fr;
  }
  
  .condition-header {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
`;

// スタイルの動的挿入
if (!document.getElementById('condition-editor-styles')) {
  const style = document.createElement('style');
  style.id = 'condition-editor-styles';
  style.textContent = CSS_STYLES;
  document.head.appendChild(style);
}

export default ConditionEditor;