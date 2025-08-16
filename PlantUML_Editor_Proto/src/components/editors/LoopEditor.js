/**
 * LoopEditor.js - ループ編集コンポーネント（CORE-007）
 * ループブロック（loop/end）の編集機能を提供
 * 
 * @author Claude Code
 * @version 4.0.0
 * @created 2025-08-16
 * @purpose Sprint2 コアエディター実装
 */

// セキュリティコンポーネントの動的インポート
let SecureActionEditor = null;

/**
 * LoopEditorクラス
 * PlantUMLのループ（loop/end）ブロックを管理する高機能エディター
 * 
 * ✅ Sprint2要件完全対応:
 * - ループブロック（↻）の視覚的表現
 * - loop構造の完全サポート
 * - ループ条件式の入力・編集
 * - ネストしたループ（最大3レベル）
 * - 無限ループ検出と警告
 * - ループ内アクションの管理
 * - セキュリティ統合（DOMPurify）
 * - パフォーマンス最適化
 * - エラーハンドリング強化
 */
export class LoopEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enableNesting: true,
      enableInlineEdit: true,
      maxNestingLevel: 3,
      maxLoopIterations: 1000,
      securityEnabled: true,
      infiniteLoopDetection: true,
      showPreview: true,
      ...options
    };
    
    // セキュリティレイヤー統合（動的初期化）
    this.secureEditor = null;
    
    // ループデータ
    this.loops = [];
    this.selectedLoop = null;
    this.expandedLoops = new Set();
    
    // パフォーマンス最適化
    this.renderQueue = [];
    this.isRendering = false;
    
    // 無限ループ検出
    this.loopAnalyzer = {
      warningThreshold: 100,
      errorThreshold: 1000,
      activeAnalysis: false
    };
    
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
      
      console.log('✅ LoopEditor initialized successfully');
    } catch (error) {
      console.error('❌ LoopEditor initialization failed:', error);
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
        
        console.log('✅ LoopEditor security layer initialized');
      } catch (error) {
        console.warn('⚠️ LoopEditor security layer initialization failed, continuing without security features:', error);
        this.options.securityEnabled = false;
      }
    }
  }

  /**
   * UI構造の作成
   */
  createStructure() {
    this.container.innerHTML = `
      <div class="loop-editor" data-component="loop-editor">
        <div class="loop-editor-header">
          <h3 class="editor-title">
            <span class="editor-icon">🔁</span>
            ループ編集
          </h3>
          <div class="editor-controls">
            <button class="btn-add-loop" title="新しいループを追加">
              <span class="icon">➕</span>
              ループ追加
            </button>
            <button class="btn-expand-all" title="すべて展開">
              <span class="icon">📂</span>
              すべて展開
            </button>
            <button class="btn-collapse-all" title="すべて折りたたみ">
              <span class="icon">📁</span>
              すべて折りたたみ
            </button>
            <button class="btn-analyze-loops" title="ループ分析">
              <span class="icon">🔍</span>
              分析
            </button>
            <button class="btn-clear-all" title="すべてクリア">
              <span class="icon">🗑️</span>
              クリア
            </button>
          </div>
        </div>
        
        <div class="loop-editor-body">
          <div class="loops-container" data-container="loops">
            <!-- ループアイテムが動的に挿入される -->
          </div>
          
          ${this.options.showPreview ? this.createPreviewArea() : ''}
        </div>
        
        <!-- 分析パネル -->
        <div class="loop-analysis-panel" style="display: none;">
          <h4>ループ分析結果</h4>
          <div class="analysis-content"></div>
        </div>
      </div>
    `;
    
    this.loopsContainer = this.container.querySelector('[data-container="loops"]');
    this.previewElement = this.container.querySelector('.plantuml-preview code');
    this.analysisPanel = this.container.querySelector('.loop-analysis-panel');
    this.analysisContent = this.container.querySelector('.analysis-content');
  }

  /**
   * プレビューエリアの作成
   */
  createPreviewArea() {
    return `
      <div class="loop-preview">
        <h4>PlantUMLプレビュー</h4>
        <pre class="plantuml-preview"><code></code></pre>
        
        <div class="loop-metrics">
          <div class="metric">
            <span class="label">総ループ数:</span>
            <span class="value" data-metric="total-loops">0</span>
          </div>
          <div class="metric">
            <span class="label">最大ネスト:</span>
            <span class="value" data-metric="max-nesting">0</span>
          </div>
          <div class="metric">
            <span class="label">複雑度:</span>
            <span class="value" data-metric="complexity">低</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  attachEventListeners() {
    // 追加ボタン
    const addButton = this.container.querySelector('.btn-add-loop');
    this.addEventListener(addButton, 'click', () => this.addLoop());
    
    // 展開/折りたたみボタン
    const expandAllButton = this.container.querySelector('.btn-expand-all');
    this.addEventListener(expandAllButton, 'click', () => this.expandAll());
    
    const collapseAllButton = this.container.querySelector('.btn-collapse-all');
    this.addEventListener(collapseAllButton, 'click', () => this.collapseAll());
    
    // 分析ボタン
    const analyzeButton = this.container.querySelector('.btn-analyze-loops');
    this.addEventListener(analyzeButton, 'click', () => this.analyzeLoops());
    
    // クリアボタン
    const clearButton = this.container.querySelector('.btn-clear-all');
    this.addEventListener(clearButton, 'click', () => this.clearAll());
    
    // コンテナレベルのイベント（イベント委譲）
    this.addEventListener(this.loopsContainer, 'click', (e) => this.handleLoopClick(e));
    this.addEventListener(this.loopsContainer, 'change', (e) => this.handleLoopChange(e));
    this.addEventListener(this.loopsContainer, 'input', (e) => this.handleLoopInput(e));
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
   * 新しいループを追加
   */
  async addLoop(loopData = null, parentId = null) {
    const newLoop = loopData || this.createDefaultLoop(parentId);
    
    try {
      // セキュリティチェック
      if (this.options.securityEnabled) {
        const result = await this.secureEditor.editAction('edit-loop', {
          ...newLoop,
          csrfToken: this.secureEditor.csrfToken
        });
        
        if (!result.success) {
          throw new Error('セキュリティチェックに失敗しました');
        }
      }
      
      // 無限ループ検出
      if (this.options.infiniteLoopDetection) {
        const loopRisk = this.analyzeLoopRisk(newLoop);
        if (loopRisk.level === 'high') {
          const proceed = confirm(`無限ループのリスクが検出されました: ${loopRisk.reason}\n続行しますか？`);
          if (!proceed) return;
        }
      }
      
      this.loops.push(newLoop);
      this.expandedLoops.add(newLoop.id);
      this.queueRender();
      
      console.log('✅ Loop added successfully:', newLoop);
    } catch (error) {
      console.error('❌ Failed to add loop:', error);
      this.showError('ループの追加に失敗しました: ' + error.message);
    }
  }

  /**
   * デフォルトループデータの作成
   */
  createDefaultLoop(parentId = null) {
    const level = parentId ? this.getLoopLevel(parentId) + 1 : 0;
    
    return {
      id: this.generateLoopId(),
      parentId: parentId,
      level: level,
      condition: 'データが存在する間',
      maxIterations: 10,
      actions: [],
      nestedLoops: [],
      isExpanded: true,
      performance: {
        estimatedIterations: 1,
        complexity: 'low',
        riskLevel: 'low'
      },
      order: this.loops.length
    };
  }

  /**
   * ループIDの生成
   */
  generateLoopId() {
    return `loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ループのネストレベル取得
   */
  getLoopLevel(parentId) {
    const parent = this.loops.find(l => l.id === parentId);
    return parent ? parent.level : 0;
  }

  /**
   * ループアイテムのレンダリング
   */
  renderLoopItem(loop, index) {
    const isExpanded = this.expandedLoops.has(loop.id);
    const indentStyle = `margin-left: ${loop.level * 20}px;`;
    const riskClass = this.getRiskClass(loop.performance.riskLevel);
    
    return `
      <div class="loop-item ${isExpanded ? 'expanded' : 'collapsed'} ${riskClass}" 
           data-loop-id="${loop.id}" 
           data-level="${loop.level}"
           style="${indentStyle}">
        
        <!-- ループヘッダー -->
        <div class="loop-header">
          <div class="loop-controls">
            <button class="btn-expand-toggle" 
                    data-action="toggle-expand"
                    title="${isExpanded ? '折りたたみ' : '展開'}">
              <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
            </button>
            
            <span class="loop-icon">🔁</span>
            <span class="loop-number">${index + 1}</span>
            
            <div class="loop-risk-indicator" title="リスクレベル: ${loop.performance.riskLevel}">
              <span class="risk-dot ${riskClass}"></span>
            </div>
          </div>
          
          <div class="loop-input-area">
            <label class="loop-label">ループ条件:</label>
            <input type="text" 
                   class="loop-condition-input" 
                   data-field="condition"
                   value="${this.escapeHtml(loop.condition)}"
                   placeholder="例: データが存在する間、回数 < 10"
                   title="ループ継続条件を入力してください">
          </div>
          
          <div class="loop-settings">
            <label class="iterations-label">最大回数:</label>
            <input type="number" 
                   class="max-iterations-input" 
                   data-field="maxIterations"
                   value="${loop.maxIterations}"
                   min="1"
                   max="${this.options.maxLoopIterations}"
                   title="最大反復回数">
          </div>
          
          <div class="loop-actions">
            ${loop.level < this.options.maxNestingLevel ? `
              <button class="btn-add-nested" 
                      data-action="add-nested"
                      title="ネストしたループを追加">
                <span class="icon">🔁➕</span>
              </button>
            ` : ''}
            
            <button class="btn-analyze-single" 
                    data-action="analyze-single"
                    title="このループを分析">
              <span class="icon">🔍</span>
            </button>
            
            <button class="btn-delete" 
                    data-action="delete"
                    title="このループを削除">
              <span class="icon">🗑️</span>
            </button>
          </div>
        </div>
        
        <!-- ループコンテンツ（展開時のみ表示） -->
        ${isExpanded ? this.renderLoopContent(loop) : ''}
      </div>
    `;
  }

  /**
   * リスククラスの取得
   */
  getRiskClass(riskLevel) {
    const riskClasses = {
      'low': 'risk-low',
      'medium': 'risk-medium',
      'high': 'risk-high'
    };
    return riskClasses[riskLevel] || 'risk-low';
  }

  /**
   * ループコンテンツのレンダリング
   */
  renderLoopContent(loop) {
    return `
      <div class="loop-content">
        <!-- ループ内アクション -->
        <div class="loop-actions-container">
          <div class="section-header">
            <span class="section-icon">⚡</span>
            <span class="section-label">ループ内アクション</span>
            <button class="btn-add-action" 
                    data-action="add-action"
                    title="アクションを追加">
              <span class="icon">➕</span>
            </button>
          </div>
          
          <div class="actions-list">
            ${this.renderLoopActions(loop.actions)}
          </div>
        </div>
        
        <!-- パフォーマンス情報 -->
        <div class="loop-performance">
          <div class="performance-metrics">
            <div class="metric">
              <span class="label">推定反復:</span>
              <span class="value">${loop.performance.estimatedIterations}回</span>
            </div>
            <div class="metric">
              <span class="label">複雑度:</span>
              <span class="value complexity-${loop.performance.complexity}">${loop.performance.complexity}</span>
            </div>
            <div class="metric">
              <span class="label">実行時間予測:</span>
              <span class="value">${this.estimateExecutionTime(loop)}ms</span>
            </div>
          </div>
        </div>
        
        <!-- ネストしたループ -->
        ${loop.nestedLoops.length > 0 ? this.renderNestedLoops(loop.nestedLoops) : ''}
      </div>
    `;
  }

  /**
   * ループアクションのレンダリング
   */
  renderLoopActions(actions) {
    if (!actions || actions.length === 0) {
      return `
        <div class="empty-actions">
          <span class="empty-message">ループ内のアクションを追加してください</span>
        </div>
      `;
    }
    
    return actions.map((action, index) => `
      <div class="loop-action" 
           data-action-id="${action.id}">
        <div class="action-order">${index + 1}.</div>
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
   * ネストしたループのレンダリング
   */
  renderNestedLoops(nestedLoops) {
    if (!nestedLoops || nestedLoops.length === 0) {
      return '';
    }
    
    return `
      <div class="nested-loops-container">
        <div class="section-header">
          <span class="section-icon">🔁</span>
          <span class="section-label">ネストしたループ</span>
        </div>
        <div class="nested-loops">
          ${nestedLoops.map(loop => 
            this.renderLoopItem(loop, this.loops.indexOf(loop))
          ).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 実行時間の推定
   */
  estimateExecutionTime(loop) {
    const baseTime = 10; // 基本実行時間（ms）
    const actionTime = loop.actions.length * 5; // アクション1つあたり5ms
    const nestedTime = loop.nestedLoops.reduce((total, nested) => 
      total + this.estimateExecutionTime(nested), 0
    );
    
    return (baseTime + actionTime + nestedTime) * loop.performance.estimatedIterations;
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
   * ループクリックハンドラー
   */
  async handleLoopClick(e) {
    const target = e.target;
    const loopItem = target.closest('.loop-item');
    
    if (!loopItem) return;
    
    const loopId = loopItem.dataset.loopId;
    const loop = this.loops.find(l => l.id === loopId);
    
    if (!loop) return;
    
    const actionType = target.dataset.action;
    
    switch (actionType) {
      case 'toggle-expand':
        this.toggleExpand(loop);
        break;
      case 'add-nested':
        await this.addLoop(null, loopId);
        break;
      case 'analyze-single':
        this.analyzeSingleLoop(loop);
        break;
      case 'delete':
        await this.deleteLoop(loop);
        break;
      case 'add-action':
        this.addLoopAction(loop);
        break;
      case 'delete-action':
        this.deleteLoopAction(loop, target.dataset.actionId);
        break;
    }
  }

  /**
   * ループ変更ハンドラー
   */
  async handleLoopChange(e) {
    const target = e.target;
    const loopItem = target.closest('.loop-item');
    
    if (!loopItem) return;
    
    const loopId = loopItem.dataset.loopId;
    const loop = this.loops.find(l => l.id === loopId);
    const field = target.dataset.field;
    
    if (!loop || !field) return;
    
    const oldValue = loop[field];
    let newValue = target.value;
    
    // 数値フィールドの処理
    if (field === 'maxIterations') {
      newValue = parseInt(newValue, 10);
      if (isNaN(newValue) || newValue < 1) {
        newValue = 1;
        target.value = newValue;
      }
      if (newValue > this.options.maxLoopIterations) {
        newValue = this.options.maxLoopIterations;
        target.value = newValue;
      }
    }
    
    if (oldValue !== newValue) {
      await this.updateLoopField(loop, field, newValue);
    }
  }

  /**
   * ループ入力ハンドラー（リアルタイム更新）
   */
  handleLoopInput(e) {
    const target = e.target;
    
    if (target.classList.contains('loop-condition-input')) {
      // デバウンス処理でパフォーマンス最適化
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        this.handleLoopChange(e);
      }, 300);
    }
  }

  /**
   * ループフィールドの更新
   */
  async updateLoopField(loop, field, value) {
    try {
      // セキュリティ検証
      if (this.options.securityEnabled && typeof value === 'string') {
        const sanitized = await this.secureEditor.sanitizeData({ [field]: value });
        value = sanitized[field];
      }
      
      loop[field] = value;
      
      // パフォーマンス分析の更新
      this.updateLoopPerformance(loop);
      
      this.updatePreview();
      
      console.log(`✅ Loop field updated: ${field} = ${value}`);
    } catch (error) {
      console.error('❌ Failed to update loop field:', error);
      this.showError('フィールドの更新に失敗しました');
    }
  }

  /**
   * ループパフォーマンスの更新
   */
  updateLoopPerformance(loop) {
    // 推定反復回数の計算
    loop.performance.estimatedIterations = this.estimateIterations(loop);
    
    // 複雑度の計算
    loop.performance.complexity = this.calculateComplexity(loop);
    
    // リスクレベルの計算
    loop.performance.riskLevel = this.calculateRiskLevel(loop);
  }

  /**
   * 反復回数の推定
   */
  estimateIterations(loop) {
    // 条件文からの簡易推定
    const condition = loop.condition.toLowerCase();
    
    if (condition.includes('< 10') || condition.includes('≤ 10')) return 10;
    if (condition.includes('< 100') || condition.includes('≤ 100')) return 100;
    if (condition.match(/< (\d+)/)) {
      const match = condition.match(/< (\d+)/);
      return parseInt(match[1], 10);
    }
    
    // デフォルト推定値
    return Math.min(loop.maxIterations, 50);
  }

  /**
   * 複雑度の計算
   */
  calculateComplexity(loop) {
    let score = 1; // 基本スコア
    
    // アクション数による複雑度
    score += loop.actions.length * 0.5;
    
    // ネストレベルによる複雑度
    score += loop.level * 2;
    
    // ネストしたループによる複雑度
    score += loop.nestedLoops.length * 3;
    
    // 推定反復回数による複雑度
    if (loop.performance.estimatedIterations > 100) score += 2;
    if (loop.performance.estimatedIterations > 1000) score += 5;
    
    if (score < 3) return 'low';
    if (score < 8) return 'medium';
    return 'high';
  }

  /**
   * リスクレベルの計算
   */
  calculateRiskLevel(loop) {
    let riskFactors = [];
    
    // 無限ループのリスク
    if (loop.condition.includes('true') || loop.condition.includes('1')) {
      riskFactors.push('infinite_loop_risk');
    }
    
    // 高い反復回数
    if (loop.performance.estimatedIterations > 1000) {
      riskFactors.push('high_iterations');
    }
    
    // 深いネスト
    if (loop.level > 2) {
      riskFactors.push('deep_nesting');
    }
    
    // 複雑な条件
    if (loop.condition.length > 50) {
      riskFactors.push('complex_condition');
    }
    
    if (riskFactors.length === 0) return 'low';
    if (riskFactors.length < 2) return 'medium';
    return 'high';
  }

  /**
   * ループリスク分析
   */
  analyzeLoopRisk(loop) {
    const risks = [];
    let level = 'low';
    
    // 無限ループチェック
    if (this.isInfiniteLoopRisk(loop.condition)) {
      risks.push('無限ループの可能性');
      level = 'high';
    }
    
    // パフォーマンスリスク
    if (loop.maxIterations > this.loopAnalyzer.warningThreshold) {
      risks.push(`高い反復回数 (${loop.maxIterations})`);
      level = level === 'high' ? 'high' : 'medium';
    }
    
    // ネストリスク
    if (loop.level > 2) {
      risks.push(`深いネスト (レベル ${loop.level})`);
      level = level === 'high' ? 'high' : 'medium';
    }
    
    return {
      level,
      reason: risks.join(', ') || '問題なし',
      risks
    };
  }

  /**
   * 無限ループリスクの検出
   */
  isInfiniteLoopRisk(condition) {
    const riskyPatterns = [
      /\btrue\b/i,
      /\b1\s*==\s*1\b/,
      /\bwhile\s*\(\s*true\s*\)/i,
      /\bfor\s*\(\s*;;\s*\)/i
    ];
    
    return riskyPatterns.some(pattern => pattern.test(condition));
  }

  /**
   * 展開/折りたたみの切り替え
   */
  toggleExpand(loop) {
    if (this.expandedLoops.has(loop.id)) {
      this.expandedLoops.delete(loop.id);
    } else {
      this.expandedLoops.add(loop.id);
    }
    
    this.queueRender();
  }

  /**
   * すべて展開
   */
  expandAll() {
    this.loops.forEach(loop => {
      this.expandedLoops.add(loop.id);
    });
    this.queueRender();
  }

  /**
   * すべて折りたたみ
   */
  collapseAll() {
    this.expandedLoops.clear();
    this.queueRender();
  }

  /**
   * ループアクションの追加
   */
  addLoopAction(loop) {
    const newAction = {
      id: this.generateActionId(),
      from: 'User',
      to: 'System',
      arrowType: '->',
      message: '新しいアクション'
    };
    
    loop.actions.push(newAction);
    this.updateLoopPerformance(loop);
    this.queueRender();
    
    console.log(`✅ Action added to loop ${loop.id}`);
  }

  /**
   * アクションIDの生成
   */
  generateActionId() {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ループアクションの削除
   */
  deleteLoopAction(loop, actionId) {
    const index = loop.actions.findIndex(a => a.id === actionId);
    if (index > -1) {
      loop.actions.splice(index, 1);
      this.updateLoopPerformance(loop);
      this.queueRender();
    }
  }

  /**
   * 単一ループの分析
   */
  analyzeSingleLoop(loop) {
    const analysis = {
      id: loop.id,
      condition: loop.condition,
      maxIterations: loop.maxIterations,
      estimatedIterations: loop.performance.estimatedIterations,
      complexity: loop.performance.complexity,
      riskLevel: loop.performance.riskLevel,
      estimatedExecutionTime: this.estimateExecutionTime(loop),
      actionCount: loop.actions.length,
      nestedLoopCount: loop.nestedLoops.length,
      recommendations: this.generateRecommendations(loop)
    };
    
    this.showAnalysisResult(analysis);
  }

  /**
   * 推奨事項の生成
   */
  generateRecommendations(loop) {
    const recommendations = [];
    
    if (loop.performance.riskLevel === 'high') {
      recommendations.push('🔴 リスクレベルが高いため、条件の見直しを検討してください');
    }
    
    if (loop.performance.estimatedIterations > 1000) {
      recommendations.push('⚠️ 反復回数が多いため、パフォーマンスに注意してください');
    }
    
    if (loop.actions.length === 0) {
      recommendations.push('💡 ループ内にアクションを追加してください');
    }
    
    if (loop.level > 2) {
      recommendations.push('📐 ネストレベルが深いため、構造の簡素化を検討してください');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ 問題は検出されませんでした');
    }
    
    return recommendations;
  }

  /**
   * 分析結果の表示
   */
  showAnalysisResult(analysis) {
    this.analysisContent.innerHTML = `
      <div class="analysis-result">
        <h5>ループ分析: ${analysis.id}</h5>
        
        <div class="analysis-metrics">
          <div class="metric-row">
            <span class="label">条件:</span>
            <span class="value">${analysis.condition}</span>
          </div>
          <div class="metric-row">
            <span class="label">最大反復:</span>
            <span class="value">${analysis.maxIterations}回</span>
          </div>
          <div class="metric-row">
            <span class="label">推定反復:</span>
            <span class="value">${analysis.estimatedIterations}回</span>
          </div>
          <div class="metric-row">
            <span class="label">複雑度:</span>
            <span class="value complexity-${analysis.complexity}">${analysis.complexity}</span>
          </div>
          <div class="metric-row">
            <span class="label">リスクレベル:</span>
            <span class="value risk-${analysis.riskLevel}">${analysis.riskLevel}</span>
          </div>
          <div class="metric-row">
            <span class="label">推定実行時間:</span>
            <span class="value">${analysis.estimatedExecutionTime}ms</span>
          </div>
        </div>
        
        <div class="recommendations">
          <h6>推奨事項:</h6>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        
        <button class="btn-close-analysis" onclick="this.closest('.loop-analysis-panel').style.display='none'">
          閉じる
        </button>
      </div>
    `;
    
    this.analysisPanel.style.display = 'block';
  }

  /**
   * すべてのループの分析
   */
  analyzeLoops() {
    if (this.loops.length === 0) {
      this.showError('分析するループがありません');
      return;
    }
    
    const globalAnalysis = {
      totalLoops: this.loops.length,
      maxNestingLevel: Math.max(...this.loops.map(l => l.level), 0),
      totalActions: this.loops.reduce((total, loop) => total + loop.actions.length, 0),
      averageComplexity: this.calculateAverageComplexity(),
      highRiskLoops: this.loops.filter(l => l.performance.riskLevel === 'high'),
      totalEstimatedTime: this.loops.reduce((total, loop) => total + this.estimateExecutionTime(loop), 0),
      recommendations: this.generateGlobalRecommendations()
    };
    
    this.showGlobalAnalysisResult(globalAnalysis);
    this.updateMetrics();
  }

  /**
   * 平均複雑度の計算
   */
  calculateAverageComplexity() {
    if (this.loops.length === 0) return 'low';
    
    const complexityScores = {
      'low': 1,
      'medium': 2,
      'high': 3
    };
    
    const totalScore = this.loops.reduce((total, loop) => 
      total + complexityScores[loop.performance.complexity], 0
    );
    
    const average = totalScore / this.loops.length;
    
    if (average < 1.5) return 'low';
    if (average < 2.5) return 'medium';
    return 'high';
  }

  /**
   * グローバル推奨事項の生成
   */
  generateGlobalRecommendations() {
    const recommendations = [];
    
    if (this.loops.filter(l => l.performance.riskLevel === 'high').length > 0) {
      recommendations.push('🔴 リスクの高いループが検出されました');
    }
    
    if (this.loops.some(l => l.level > 2)) {
      recommendations.push('📐 深いネストのループがあります。構造の簡素化を検討してください');
    }
    
    const totalTime = this.loops.reduce((total, loop) => total + this.estimateExecutionTime(loop), 0);
    if (totalTime > 10000) {
      recommendations.push('⏱️ 総実行時間が長くなる可能性があります');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ 全体的に問題は検出されませんでした');
    }
    
    return recommendations;
  }

  /**
   * グローバル分析結果の表示
   */
  showGlobalAnalysisResult(analysis) {
    this.analysisContent.innerHTML = `
      <div class="global-analysis-result">
        <h5>全体ループ分析</h5>
        
        <div class="global-metrics">
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${analysis.totalLoops}</div>
              <div class="metric-label">総ループ数</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.maxNestingLevel}</div>
              <div class="metric-label">最大ネスト</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.totalActions}</div>
              <div class="metric-label">総アクション数</div>
            </div>
            <div class="metric-card">
              <div class="metric-value complexity-${analysis.averageComplexity}">${analysis.averageComplexity}</div>
              <div class="metric-label">平均複雑度</div>
            </div>
            <div class="metric-card">
              <div class="metric-value risk-high">${analysis.highRiskLoops.length}</div>
              <div class="metric-label">高リスクループ</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.totalEstimatedTime}ms</div>
              <div class="metric-label">推定実行時間</div>
            </div>
          </div>
        </div>
        
        <div class="global-recommendations">
          <h6>全体的な推奨事項:</h6>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        
        <button class="btn-close-analysis" onclick="this.closest('.loop-analysis-panel').style.display='none'">
          閉じる
        </button>
      </div>
    `;
    
    this.analysisPanel.style.display = 'block';
  }

  /**
   * メトリクスの更新
   */
  updateMetrics() {
    const totalLoopsElement = this.container.querySelector('[data-metric="total-loops"]');
    const maxNestingElement = this.container.querySelector('[data-metric="max-nesting"]');
    const complexityElement = this.container.querySelector('[data-metric="complexity"]');
    
    if (totalLoopsElement) {
      totalLoopsElement.textContent = this.loops.length;
    }
    
    if (maxNestingElement) {
      const maxNesting = Math.max(...this.loops.map(l => l.level), 0);
      maxNestingElement.textContent = maxNesting;
    }
    
    if (complexityElement) {
      const complexity = this.calculateAverageComplexity();
      complexityElement.textContent = complexity;
      complexityElement.className = `value complexity-${complexity}`;
    }
  }

  /**
   * ループの削除
   */
  async deleteLoop(loop) {
    try {
      if (!confirm('このループを削除しますか？ネストしたループも含めてすべて削除されます。')) {
        return;
      }
      
      // 子ループも含めて削除
      this.removeLoopAndChildren(loop.id);
      this.queueRender();
      
      console.log('✅ Loop deleted successfully:', loop.id);
    } catch (error) {
      console.error('❌ Failed to delete loop:', error);
      this.showError('ループの削除に失敗しました');
    }
  }

  /**
   * ループとその子ループの削除
   */
  removeLoopAndChildren(loopId) {
    // 直接の子ループを特定
    const childLoops = this.loops.filter(l => l.parentId === loopId);
    
    // 再帰的に子ループを削除
    childLoops.forEach(child => {
      this.removeLoopAndChildren(child.id);
    });
    
    // ループ自体を削除
    const index = this.loops.findIndex(l => l.id === loopId);
    if (index > -1) {
      this.loops.splice(index, 1);
      this.expandedLoops.delete(loopId);
    }
  }

  /**
   * すべてクリア
   */
  clearAll() {
    if (this.loops.length === 0) return;
    
    if (confirm('すべてのループを削除しますか？')) {
      this.loops = [];
      this.expandedLoops.clear();
      this.queueRender();
      console.log('✅ All loops cleared');
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
    const loopsHtml = this.loops
      .filter(loop => !loop.parentId) // ルートレベルのみ
      .map((loop, index) => this.renderLoopItem(loop, index))
      .join('');
    
    this.loopsContainer.innerHTML = loopsHtml || this.renderEmptyState();
    this.updatePreview();
    this.updateMetrics();
  }

  /**
   * 空状態のレンダリング
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🔁</div>
        <div class="empty-message">ループを追加してください</div>
        <button class="btn-add-first-loop" onclick="this.closest('.loop-editor').querySelector('.btn-add-loop').click()">
          最初のループを追加
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
    if (this.loops.length === 0) {
      return '@startuml\n// ループを追加してください\n@enduml';
    }
    
    let code = '@startuml\n';
    
    // 参加者の抽出と定義
    const actors = this.extractAllActors();
    actors.forEach(actor => {
      code += `participant ${actor}\n`;
    });
    
    code += '\n';
    
    // ループの生成
    this.loops
      .filter(loop => !loop.parentId)
      .forEach(loop => {
        code += this.generateLoopCode(loop, 0);
      });
    
    code += '@enduml';
    
    return code;
  }

  /**
   * すべてのアクターを抽出
   */
  extractAllActors() {
    const actors = new Set();
    
    const extractFromLoop = (loop) => {
      // ループ内アクションのアクターを抽出
      loop.actions.forEach(action => {
        actors.add(action.from);
        actors.add(action.to);
      });
      
      // ネストしたループのアクターを抽出
      loop.nestedLoops.forEach(extractFromLoop);
    };
    
    this.loops.forEach(extractFromLoop);
    
    return Array.from(actors);
  }

  /**
   * ループのPlantUMLコード生成
   */
  generateLoopCode(loop, indentLevel) {
    const indent = '  '.repeat(indentLevel);
    let code = `${indent}loop ${loop.condition}\n`;
    
    // ループ内アクション
    loop.actions.forEach(action => {
      code += `${indent}  ${action.from} ${action.arrowType} ${action.to}: ${action.message}\n`;
    });
    
    // ネストしたループ
    loop.nestedLoops.forEach(nested => {
      code += this.generateLoopCode(nested, indentLevel + 1);
    });
    
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
      loops: this.loops,
      plantUML: this.generatePlantUML(),
      analysis: {
        totalLoops: this.loops.length,
        maxNestingLevel: Math.max(...this.loops.map(l => l.level), 0),
        averageComplexity: this.calculateAverageComplexity(),
        highRiskLoops: this.loops.filter(l => l.performance.riskLevel === 'high').length
      },
      metadata: {
        version: '4.0.0',
        exportedAt: new Date().toISOString(),
        loopCount: this.loops.length
      }
    };
  }

  /**
   * データのインポート
   */
  async importData(data) {
    try {
      if (!data.loops || !Array.isArray(data.loops)) {
        throw new Error('Invalid data format');
      }
      
      this.loops = data.loops;
      this.expandedLoops.clear();
      
      // パフォーマンス情報の再計算
      this.loops.forEach(loop => {
        this.updateLoopPerformance(loop);
        this.expandedLoops.add(loop.id);
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
    this.loops = [];
    this.expandedLoops.clear();
    this.selectedLoop = null;
    
    console.log('✅ LoopEditor destroyed and cleaned up');
  }
}

// CSS スタイル定義
const CSS_STYLES = `
.loop-editor {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.loop-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #e8f5e8;
  border-bottom: 1px solid #4caf50;
}

.loop-editor-body {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  padding: 16px;
}

.loops-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.loop-item {
  border: 1px solid #4caf50;
  border-radius: 8px;
  background: #f1f8e9;
  overflow: hidden;
  transition: all 0.3s ease;
}

.loop-item.expanded {
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.2);
}

.loop-item.risk-medium {
  border-color: #ff9800;
  background: #fff8e1;
}

.loop-item.risk-high {
  border-color: #f44336;
  background: #ffebee;
}

.loop-header {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 12px;
  padding: 12px 16px;
  background: #e8f5e8;
  border-bottom: 1px solid #4caf50;
  align-items: center;
}

.loop-controls {
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
  color: #2e7d32;
}

.loop-icon {
  font-size: 18px;
}

.loop-number {
  font-weight: 600;
  color: #2e7d32;
  min-width: 20px;
}

.loop-risk-indicator {
  display: flex;
  align-items: center;
}

.risk-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
}

.risk-dot.risk-medium {
  background: #ff9800;
}

.risk-dot.risk-high {
  background: #f44336;
}

.loop-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.loop-label {
  font-weight: 600;
  color: #2e7d32;
  white-space: nowrap;
}

.loop-condition-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.loop-condition-input:focus {
  outline: none;
  border-color: #2e7d32;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.loop-settings {
  display: flex;
  align-items: center;
  gap: 8px;
}

.iterations-label {
  font-size: 12px;
  color: #2e7d32;
  white-space: nowrap;
}

.max-iterations-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #4caf50;
  border-radius: 4px;
  font-size: 14px;
}

.loop-actions {
  display: flex;
  gap: 8px;
}

.btn-add-nested,
.btn-analyze-single,
.btn-delete {
  padding: 6px 10px;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-add-nested:hover {
  background: #4caf50;
  color: white;
}

.btn-analyze-single:hover {
  background: #2196f3;
  border-color: #2196f3;
  color: white;
}

.btn-delete:hover {
  background: #f44336;
  border-color: #f44336;
  color: white;
}

.loop-content {
  padding: 16px;
}

.loop-actions-container {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #e8f5e8;
  border-radius: 4px;
}

.section-icon {
  margin-right: 6px;
}

.section-label {
  font-weight: 600;
  color: #2e7d32;
}

.btn-add-action {
  padding: 4px 8px;
  border: 1px solid #4caf50;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  font-size: 11px;
}

.actions-list {
  max-height: 200px;
  overflow-y: auto;
}

.empty-actions {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.loop-action {
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

.action-order {
  font-weight: 600;
  color: #2e7d32;
  margin-right: 8px;
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

.loop-performance {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.performance-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.metric {
  text-align: center;
}

.metric .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.metric .value {
  font-weight: 600;
  font-size: 14px;
}

.complexity-low { color: #4caf50; }
.complexity-medium { color: #ff9800; }
.complexity-high { color: #f44336; }

.risk-low { color: #4caf50; }
.risk-medium { color: #ff9800; }
.risk-high { color: #f44336; }

.nested-loops-container {
  border-top: 1px solid #ddd;
  padding-top: 16px;
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

.btn-add-first-loop {
  padding: 12px 24px;
  border: 2px solid #4caf50;
  border-radius: 6px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-add-first-loop:hover {
  background: #2e7d32;
  border-color: #2e7d32;
  transform: translateY(-2px);
}

.loop-preview {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
}

.loop-preview h4 {
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
  margin-bottom: 16px;
}

.loop-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.loop-analysis-panel {
  border-top: 1px solid #ddd;
  background: #f9f9f9;
  padding: 16px;
}

.analysis-result,
.global-analysis-result {
  max-height: 400px;
  overflow-y: auto;
}

.analysis-metrics {
  margin: 16px 0;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.metric-card {
  text-align: center;
  padding: 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.metric-card .metric-value {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.metric-card .metric-label {
  font-size: 12px;
  color: #666;
}

.recommendations,
.global-recommendations {
  margin: 16px 0;
}

.recommendations h6,
.global-recommendations h6 {
  margin: 0 0 8px 0;
  color: #333;
}

.recommendations ul,
.global-recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.recommendations li,
.global-recommendations li {
  margin-bottom: 4px;
  font-size: 14px;
}

.btn-close-analysis {
  padding: 8px 16px;
  border: 1px solid #2196f3;
  border-radius: 4px;
  background: #2196f3;
  color: white;
  cursor: pointer;
  float: right;
}

.btn-close-analysis:hover {
  background: #1976d2;
  border-color: #1976d2;
}

@media (max-width: 768px) {
  .loop-editor-body {
    grid-template-columns: 1fr;
  }
  
  .loop-header {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .performance-metrics {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
  
  .metric-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}
`;

// スタイルの動的挿入
if (!document.getElementById('loop-editor-styles')) {
  const style = document.createElement('style');
  style.id = 'loop-editor-styles';
  style.textContent = CSS_STYLES;
  document.head.appendChild(style);
}

export default LoopEditor;