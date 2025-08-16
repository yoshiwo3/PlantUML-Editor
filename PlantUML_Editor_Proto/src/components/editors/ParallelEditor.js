/**
 * ParallelEditor.js - 並行処理編集コンポーネント（CORE-008）
 * 並行処理ブロック（par/and/end）の編集機能を提供
 * 
 * @author Claude Code
 * @version 4.0.0
 * @created 2025-08-16
 * @purpose Sprint2 コアエディター実装
 */

// セキュリティコンポーネントの動的インポート
let SecureActionEditor = null;

/**
 * ParallelEditorクラス
 * PlantUMLの並行処理（par/and/end）ブロックを管理する高機能エディター
 * 
 * ✅ Sprint2要件完全対応:
 * - 並行処理ブロック（〒）の視覚的表現
 * - par/and構造の完全サポート
 * - 複数スレッドの管理（最大8スレッド）
 * - スレッド間同期制御
 * - 並行処理の可視化
 * - デッドロック検出と警告
 * - パフォーマンス分析
 * - セキュリティ統合（DOMPurify）
 * - エラーハンドリング強化
 */
export class ParallelEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enableThreadManagement: true,
      enableSyncControl: true,
      maxThreads: 8,
      enableDeadlockDetection: true,
      securityEnabled: true,
      showPerformanceAnalysis: true,
      showPreview: true,
      ...options
    };
    
    // セキュリティレイヤー統合（動的初期化）
    this.secureEditor = null;
    
    // 並行処理データ
    this.parallelBlocks = [];
    this.selectedBlock = null;
    this.activeThreads = new Map();
    
    // デッドロック検出
    this.deadlockDetector = {
      enabled: this.options.enableDeadlockDetection,
      resourceGraph: new Map(),
      waitForGraph: new Map()
    };
    
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
      
      console.log('✅ ParallelEditor initialized successfully');
    } catch (error) {
      console.error('❌ ParallelEditor initialization failed:', error);
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
        
        console.log('✅ ParallelEditor security layer initialized');
      } catch (error) {
        console.warn('⚠️ ParallelEditor security layer initialization failed, continuing without security features:', error);
        this.options.securityEnabled = false;
      }
    }
  }

  /**
   * UI構造の作成
   */
  createStructure() {
    this.container.innerHTML = `
      <div class="parallel-editor" data-component="parallel-editor">
        <div class="parallel-editor-header">
          <h3 class="editor-title">
            <span class="editor-icon">🧵</span>
            並行処理編集
          </h3>
          <div class="editor-controls">
            <button class="btn-add-parallel" title="新しい並行処理ブロックを追加">
              <span class="icon">➕</span>
              並行処理追加
            </button>
            <button class="btn-analyze-deadlock" title="デッドロック分析">
              <span class="icon">🔍</span>
              デッドロック分析
            </button>
            <button class="btn-performance-analysis" title="パフォーマンス分析">
              <span class="icon">📊</span>
              性能分析
            </button>
            <button class="btn-clear-all" title="すべてクリア">
              <span class="icon">🗑️</span>
              クリア
            </button>
          </div>
        </div>
        
        <div class="parallel-editor-body">
          <div class="parallel-blocks-container" data-container="parallel-blocks">
            <!-- 並行処理ブロックが動的に挿入される -->
          </div>
          
          ${this.options.showPreview ? this.createPreviewArea() : ''}
        </div>
        
        <!-- 分析パネル -->
        <div class="analysis-panel" style="display: none;">
          <h4>分析結果</h4>
          <div class="analysis-content"></div>
        </div>
      </div>
    `;
    
    this.blocksContainer = this.container.querySelector('[data-container="parallel-blocks"]');
    this.previewElement = this.container.querySelector('.plantuml-preview code');
    this.analysisPanel = this.container.querySelector('.analysis-panel');
    this.analysisContent = this.container.querySelector('.analysis-content');
  }

  /**
   * プレビューエリアの作成
   */
  createPreviewArea() {
    return `
      <div class="parallel-preview">
        <h4>PlantUMLプレビュー</h4>
        <pre class="plantuml-preview"><code></code></pre>
        
        <div class="parallel-metrics">
          <div class="metric">
            <span class="label">並行ブロック:</span>
            <span class="value" data-metric="total-blocks">0</span>
          </div>
          <div class="metric">
            <span class="label">総スレッド数:</span>
            <span class="value" data-metric="total-threads">0</span>
          </div>
          <div class="metric">
            <span class="label">並行度:</span>
            <span class="value" data-metric="parallelism">0</span>
          </div>
          <div class="metric">
            <span class="label">デッドロックリスク:</span>
            <span class="value" data-metric="deadlock-risk">低</span>
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
    const addButton = this.container.querySelector('.btn-add-parallel');
    this.addEventListener(addButton, 'click', () => this.addParallelBlock());
    
    // 分析ボタン
    const deadlockButton = this.container.querySelector('.btn-analyze-deadlock');
    this.addEventListener(deadlockButton, 'click', () => this.analyzeDeadlock());
    
    const performanceButton = this.container.querySelector('.btn-performance-analysis');
    this.addEventListener(performanceButton, 'click', () => this.analyzePerformance());
    
    // クリアボタン
    const clearButton = this.container.querySelector('.btn-clear-all');
    this.addEventListener(clearButton, 'click', () => this.clearAll());
    
    // コンテナレベルのイベント（イベント委譲）
    this.addEventListener(this.blocksContainer, 'click', (e) => this.handleBlockClick(e));
    this.addEventListener(this.blocksContainer, 'change', (e) => this.handleBlockChange(e));
    this.addEventListener(this.blocksContainer, 'input', (e) => this.handleBlockInput(e));
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
   * 新しい並行処理ブロックを追加
   */
  async addParallelBlock(blockData = null) {
    const newBlock = blockData || this.createDefaultParallelBlock();
    
    try {
      // セキュリティチェック
      if (this.options.securityEnabled) {
        const result = await this.secureEditor.editAction('edit-parallel', {
          ...newBlock,
          csrfToken: this.secureEditor.csrfToken
        });
        
        if (!result.success) {
          throw new Error('セキュリティチェックに失敗しました');
        }
      }
      
      // スレッド数制限チェック
      const totalThreads = this.getTotalThreadCount() + newBlock.threads.length;
      if (totalThreads > this.options.maxThreads) {
        throw new Error(`最大スレッド数（${this.options.maxThreads}）を超えています`);
      }
      
      this.parallelBlocks.push(newBlock);
      this.queueRender();
      
      console.log('✅ Parallel block added successfully:', newBlock);
    } catch (error) {
      console.error('❌ Failed to add parallel block:', error);
      this.showError('並行処理ブロックの追加に失敗しました: ' + error.message);
    }
  }

  /**
   * デフォルト並行処理ブロックの作成
   */
  createDefaultParallelBlock() {
    return {
      id: this.generateBlockId(),
      name: `並行処理${this.parallelBlocks.length + 1}`,
      threads: [
        this.createDefaultThread('スレッド1'),
        this.createDefaultThread('スレッド2')
      ],
      syncPoints: [],
      resources: [],
      performance: {
        estimatedExecutionTime: 0,
        parallelEfficiency: 1.0,
        deadlockRisk: 'low',
        resourceContention: 'low'
      },
      isExpanded: true,
      order: this.parallelBlocks.length
    };
  }

  /**
   * デフォルトスレッドの作成
   */
  createDefaultThread(name) {
    return {
      id: this.generateThreadId(),
      name: name,
      actions: [],
      resources: [],
      priority: 1,
      estimatedDuration: 100
    };
  }

  /**
   * ブロックIDの生成
   */
  generateBlockId() {
    return `parallel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * スレッドIDの生成
   */
  generateThreadId() {
    return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 総スレッド数の取得
   */
  getTotalThreadCount() {
    return this.parallelBlocks.reduce((total, block) => total + block.threads.length, 0);
  }

  /**
   * 並行処理ブロックのレンダリング
   */
  renderParallelBlock(block, index) {
    const isExpanded = block.isExpanded;
    const riskClass = this.getRiskClass(block.performance.deadlockRisk);
    
    return `
      <div class="parallel-block ${isExpanded ? 'expanded' : 'collapsed'} ${riskClass}" 
           data-block-id="${block.id}">
        
        <!-- ブロックヘッダー -->
        <div class="parallel-block-header">
          <div class="block-controls">
            <button class="btn-expand-toggle" 
                    data-action="toggle-expand"
                    title="${isExpanded ? '折りたたみ' : '展開'}">
              <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
            </button>
            
            <span class="parallel-icon">🧵</span>
            <span class="block-number">${index + 1}</span>
            
            <div class="deadlock-risk-indicator" title="デッドロックリスク: ${block.performance.deadlockRisk}">
              <span class="risk-dot ${riskClass}"></span>
            </div>
          </div>
          
          <div class="block-input-area">
            <label class="block-label">名前:</label>
            <input type="text" 
                   class="block-name-input" 
                   data-field="name"
                   value="${this.escapeHtml(block.name)}"
                   placeholder="並行処理ブロック名"
                   title="並行処理ブロックの名前">
          </div>
          
          <div class="block-metrics">
            <div class="metric-item">
              <span class="label">スレッド:</span>
              <span class="value">${block.threads.length}</span>
            </div>
            <div class="metric-item">
              <span class="label">効率:</span>
              <span class="value">${(block.performance.parallelEfficiency * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          <div class="block-actions">
            <button class="btn-add-thread" 
                    data-action="add-thread"
                    title="スレッドを追加">
              <span class="icon">🧵➕</span>
            </button>
            
            <button class="btn-sync-point" 
                    data-action="add-sync-point"
                    title="同期ポイントを追加">
              <span class="icon">🔗</span>
            </button>
            
            <button class="btn-analyze-block" 
                    data-action="analyze-block"
                    title="このブロックを分析">
              <span class="icon">🔍</span>
            </button>
            
            <button class="btn-delete" 
                    data-action="delete"
                    title="このブロックを削除">
              <span class="icon">🗑️</span>
            </button>
          </div>
        </div>
        
        <!-- ブロックコンテンツ（展開時のみ表示） -->
        ${isExpanded ? this.renderBlockContent(block) : ''}
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
   * ブロックコンテンツのレンダリング
   */
  renderBlockContent(block) {
    return `
      <div class="parallel-block-content">
        <!-- スレッドタブ -->
        <div class="thread-tabs">
          ${block.threads.map((thread, index) => `
            <div class="thread-tab ${index === 0 ? 'active' : ''}" 
                 data-thread-id="${thread.id}"
                 data-action="switch-thread">
              <span class="thread-icon">🧵</span>
              <span class="thread-name">${this.escapeHtml(thread.name)}</span>
              <button class="btn-delete-thread" 
                      data-action="delete-thread"
                      data-thread-id="${thread.id}"
                      title="スレッドを削除">×</button>
            </div>
          `).join('')}
          
          <button class="btn-add-thread-tab" 
                  data-action="add-thread"
                  title="新しいスレッドを追加">➕</button>
        </div>
        
        <!-- スレッドコンテンツ -->
        <div class="thread-contents">
          ${block.threads.map((thread, index) => `
            <div class="thread-content ${index === 0 ? 'active' : ''}" 
                 data-thread-content="${thread.id}">
              ${this.renderThreadContent(thread, block)}
            </div>
          `).join('')}
        </div>
        
        <!-- 同期ポイント -->
        ${block.syncPoints.length > 0 ? this.renderSyncPoints(block.syncPoints) : ''}
        
        <!-- パフォーマンス情報 -->
        ${this.options.showPerformanceAnalysis ? this.renderPerformanceInfo(block) : ''}
      </div>
    `;
  }

  /**
   * スレッドコンテンツのレンダリング
   */
  renderThreadContent(thread, block) {
    return `
      <div class="thread-settings">
        <div class="setting-group">
          <label>スレッド名:</label>
          <input type="text" 
                 class="thread-name-input" 
                 data-field="name"
                 data-thread-id="${thread.id}"
                 value="${this.escapeHtml(thread.name)}">
        </div>
        
        <div class="setting-group">
          <label>優先度:</label>
          <select class="thread-priority-select" 
                  data-field="priority"
                  data-thread-id="${thread.id}">
            <option value="1" ${thread.priority === 1 ? 'selected' : ''}>低</option>
            <option value="2" ${thread.priority === 2 ? 'selected' : ''}>中</option>
            <option value="3" ${thread.priority === 3 ? 'selected' : ''}>高</option>
          </select>
        </div>
        
        <div class="setting-group">
          <label>推定実行時間(ms):</label>
          <input type="number" 
                 class="thread-duration-input" 
                 data-field="estimatedDuration"
                 data-thread-id="${thread.id}"
                 value="${thread.estimatedDuration}"
                 min="1">
        </div>
      </div>
      
      <div class="thread-actions-container">
        <div class="section-header">
          <span class="section-label">スレッド内アクション</span>
          <button class="btn-add-action" 
                  data-action="add-thread-action"
                  data-thread-id="${thread.id}"
                  title="アクションを追加">
            <span class="icon">➕</span>
          </button>
        </div>
        
        <div class="thread-actions-list">
          ${this.renderThreadActions(thread.actions, thread.id)}
        </div>
      </div>
      
      <div class="thread-resources">
        <div class="section-header">
          <span class="section-label">使用リソース</span>
          <button class="btn-add-resource" 
                  data-action="add-resource"
                  data-thread-id="${thread.id}"
                  title="リソースを追加">
            <span class="icon">📦</span>
          </button>
        </div>
        
        <div class="resources-list">
          ${this.renderThreadResources(thread.resources, thread.id)}
        </div>
      </div>
    `;
  }

  /**
   * スレッドアクションのレンダリング
   */
  renderThreadActions(actions, threadId) {
    if (!actions || actions.length === 0) {
      return `
        <div class="empty-actions">
          <span class="empty-message">アクションを追加してください</span>
        </div>
      `;
    }
    
    return actions.map((action, index) => `
      <div class="thread-action" 
           data-action-id="${action.id}">
        <div class="action-order">${index + 1}.</div>
        <div class="action-content">
          <span class="action-from">${action.from}</span>
          <span class="action-arrow">${action.arrowType}</span>
          <span class="action-to">${action.to}</span>
          <span class="action-message">${this.escapeHtml(action.message)}</span>
        </div>
        <div class="action-timing">
          <span class="duration">${action.duration || 10}ms</span>
        </div>
        <button class="btn-delete-action" 
                data-action="delete-thread-action"
                data-action-id="${action.id}"
                data-thread-id="${threadId}"
                title="アクションを削除">
          <span class="icon">❌</span>
        </button>
      </div>
    `).join('');
  }

  /**
   * スレッドリソースのレンダリング
   */
  renderThreadResources(resources, threadId) {
    if (!resources || resources.length === 0) {
      return `
        <div class="empty-resources">
          <span class="empty-message">リソースを追加してください</span>
        </div>
      `;
    }
    
    return resources.map(resource => `
      <div class="thread-resource" 
           data-resource-id="${resource.id}">
        <div class="resource-info">
          <span class="resource-name">${this.escapeHtml(resource.name)}</span>
          <span class="resource-type">${resource.type}</span>
          <span class="resource-access">${resource.accessType}</span>
        </div>
        <button class="btn-delete-resource" 
                data-action="delete-resource"
                data-resource-id="${resource.id}"
                data-thread-id="${threadId}"
                title="リソースを削除">
          <span class="icon">❌</span>
        </button>
      </div>
    `).join('');
  }

  /**
   * 同期ポイントのレンダリング
   */
  renderSyncPoints(syncPoints) {
    return `
      <div class="sync-points-container">
        <div class="section-header">
          <span class="section-icon">🔗</span>
          <span class="section-label">同期ポイント</span>
        </div>
        
        <div class="sync-points-list">
          ${syncPoints.map(sync => `
            <div class="sync-point" 
                 data-sync-id="${sync.id}">
              <div class="sync-info">
                <span class="sync-name">${this.escapeHtml(sync.name)}</span>
                <span class="sync-threads">スレッド: ${sync.threadIds.join(', ')}</span>
                <span class="sync-type">${sync.type}</span>
              </div>
              <button class="btn-delete-sync" 
                      data-action="delete-sync-point"
                      data-sync-id="${sync.id}"
                      title="同期ポイントを削除">
                <span class="icon">❌</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * パフォーマンス情報のレンダリング
   */
  renderPerformanceInfo(block) {
    const performance = block.performance;
    
    return `
      <div class="performance-info">
        <div class="section-header">
          <span class="section-icon">📊</span>
          <span class="section-label">パフォーマンス分析</span>
        </div>
        
        <div class="performance-metrics">
          <div class="metric-item">
            <span class="label">推定実行時間:</span>
            <span class="value">${performance.estimatedExecutionTime}ms</span>
          </div>
          <div class="metric-item">
            <span class="label">並行効率:</span>
            <span class="value efficiency-${this.getEfficiencyClass(performance.parallelEfficiency)}">
              ${(performance.parallelEfficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div class="metric-item">
            <span class="label">デッドロックリスク:</span>
            <span class="value risk-${performance.deadlockRisk}">${performance.deadlockRisk}</span>
          </div>
          <div class="metric-item">
            <span class="label">リソース競合:</span>
            <span class="value contention-${performance.resourceContention}">${performance.resourceContention}</span>
          </div>
        </div>
        
        <div class="performance-recommendations">
          ${this.generatePerformanceRecommendations(block).map(rec => 
            `<div class="recommendation">${rec}</div>`
          ).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 効率クラスの取得
   */
  getEfficiencyClass(efficiency) {
    if (efficiency >= 0.8) return 'high';
    if (efficiency >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * パフォーマンス推奨事項の生成
   */
  generatePerformanceRecommendations(block) {
    const recommendations = [];
    const performance = block.performance;
    
    if (performance.parallelEfficiency < 0.6) {
      recommendations.push('💡 並行効率が低いです。スレッド間の依存関係を確認してください');
    }
    
    if (performance.deadlockRisk === 'high') {
      recommendations.push('🔴 デッドロックリスクが高いです。リソースアクセス順序を見直してください');
    }
    
    if (performance.resourceContention === 'high') {
      recommendations.push('⚠️ リソース競合が発生しています。リソースの分散を検討してください');
    }
    
    if (block.threads.length > 4) {
      recommendations.push('📐 スレッド数が多いです。システムリソースを考慮してください');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ パフォーマンス上の問題は検出されませんでした');
    }
    
    return recommendations;
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
   * ブロッククリックハンドラー
   */
  async handleBlockClick(e) {
    const target = e.target;
    const blockItem = target.closest('.parallel-block');
    
    if (!blockItem) return;
    
    const blockId = blockItem.dataset.blockId;
    const block = this.parallelBlocks.find(b => b.id === blockId);
    
    if (!block) return;
    
    const actionType = target.dataset.action;
    const threadId = target.dataset.threadId;
    
    switch (actionType) {
      case 'toggle-expand':
        this.toggleExpand(block);
        break;
      case 'add-thread':
        this.addThread(block);
        break;
      case 'delete-thread':
        this.deleteThread(block, threadId);
        break;
      case 'switch-thread':
        this.switchThread(blockId, threadId);
        break;
      case 'add-sync-point':
        this.addSyncPoint(block);
        break;
      case 'analyze-block':
        this.analyzeBlock(block);
        break;
      case 'delete':
        await this.deleteBlock(block);
        break;
      case 'add-thread-action':
        this.addThreadAction(block, threadId);
        break;
      case 'delete-thread-action':
        this.deleteThreadAction(block, threadId, target.dataset.actionId);
        break;
      case 'add-resource':
        this.addResource(block, threadId);
        break;
      case 'delete-resource':
        this.deleteResource(block, threadId, target.dataset.resourceId);
        break;
      case 'delete-sync-point':
        this.deleteSyncPoint(block, target.dataset.syncId);
        break;
    }
  }

  /**
   * ブロック変更ハンドラー
   */
  async handleBlockChange(e) {
    const target = e.target;
    const blockItem = target.closest('.parallel-block');
    
    if (!blockItem) return;
    
    const blockId = blockItem.dataset.blockId;
    const block = this.parallelBlocks.find(b => b.id === blockId);
    const field = target.dataset.field;
    const threadId = target.dataset.threadId;
    
    if (!block || !field) return;
    
    const newValue = target.type === 'number' ? parseInt(target.value, 10) : target.value;
    
    if (threadId) {
      // スレッドフィールドの更新
      await this.updateThreadField(block, threadId, field, newValue);
    } else {
      // ブロックフィールドの更新
      await this.updateBlockField(block, field, newValue);
    }
  }

  /**
   * ブロック入力ハンドラー（リアルタイム更新）
   */
  handleBlockInput(e) {
    const target = e.target;
    
    if (target.classList.contains('block-name-input') || target.classList.contains('thread-name-input')) {
      // デバウンス処理でパフォーマンス最適化
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        this.handleBlockChange(e);
      }, 300);
    }
  }

  /**
   * ブロックフィールドの更新
   */
  async updateBlockField(block, field, value) {
    try {
      // セキュリティ検証
      if (this.options.securityEnabled && typeof value === 'string') {
        const sanitized = await this.secureEditor.sanitizeData({ [field]: value });
        value = sanitized[field];
      }
      
      block[field] = value;
      this.updateBlockPerformance(block);
      this.updatePreview();
      
      console.log(`✅ Block field updated: ${field} = ${value}`);
    } catch (error) {
      console.error('❌ Failed to update block field:', error);
      this.showError('フィールドの更新に失敗しました');
    }
  }

  /**
   * スレッドフィールドの更新
   */
  async updateThreadField(block, threadId, field, value) {
    try {
      const thread = block.threads.find(t => t.id === threadId);
      if (!thread) return;
      
      // セキュリティ検証
      if (this.options.securityEnabled && typeof value === 'string') {
        const sanitized = await this.secureEditor.sanitizeData({ [field]: value });
        value = sanitized[field];
      }
      
      thread[field] = value;
      this.updateBlockPerformance(block);
      this.updatePreview();
      
      console.log(`✅ Thread field updated: ${field} = ${value}`);
    } catch (error) {
      console.error('❌ Failed to update thread field:', error);
      this.showError('スレッドフィールドの更新に失敗しました');
    }
  }

  /**
   * ブロックパフォーマンスの更新
   */
  updateBlockPerformance(block) {
    // 推定実行時間の計算（最長スレッドの実行時間）
    const maxThreadTime = Math.max(...block.threads.map(thread => 
      thread.estimatedDuration + (thread.actions.length * 10)
    ), 0);
    
    block.performance.estimatedExecutionTime = maxThreadTime;
    
    // 並行効率の計算
    const totalSequentialTime = block.threads.reduce((total, thread) => 
      total + thread.estimatedDuration + (thread.actions.length * 10), 0
    );
    
    block.performance.parallelEfficiency = totalSequentialTime > 0 ? 
      Math.min(1.0, totalSequentialTime / (maxThreadTime * block.threads.length)) : 1.0;
    
    // デッドロックリスクの計算
    block.performance.deadlockRisk = this.calculateDeadlockRisk(block);
    
    // リソース競合の計算
    block.performance.resourceContention = this.calculateResourceContention(block);
  }

  /**
   * デッドロックリスクの計算
   */
  calculateDeadlockRisk(block) {
    const resources = new Map();
    let riskFactors = 0;
    
    // スレッド間のリソース使用パターンを分析
    block.threads.forEach(thread => {
      thread.resources.forEach(resource => {
        if (!resources.has(resource.name)) {
          resources.set(resource.name, []);
        }
        resources.get(resource.name).push({
          threadId: thread.id,
          accessType: resource.accessType,
          priority: thread.priority
        });
      });
    });
    
    // 複数スレッドが同じリソースにアクセスする場合
    resources.forEach((accessors, resourceName) => {
      if (accessors.length > 1) {
        const writeAccess = accessors.filter(a => a.accessType === 'write').length;
        if (writeAccess > 0) {
          riskFactors++;
        }
      }
    });
    
    // 優先度逆転の可能性
    const priorities = block.threads.map(t => t.priority);
    const uniquePriorities = [...new Set(priorities)];
    if (uniquePriorities.length > 1 && resources.size > 0) {
      riskFactors++;
    }
    
    if (riskFactors === 0) return 'low';
    if (riskFactors < 3) return 'medium';
    return 'high';
  }

  /**
   * リソース競合の計算
   */
  calculateResourceContention(block) {
    const resourceAccess = new Map();
    
    block.threads.forEach(thread => {
      thread.resources.forEach(resource => {
        if (!resourceAccess.has(resource.name)) {
          resourceAccess.set(resource.name, 0);
        }
        resourceAccess.set(resource.name, resourceAccess.get(resource.name) + 1);
      });
    });
    
    const maxContention = Math.max(...Array.from(resourceAccess.values()), 0);
    
    if (maxContention <= 1) return 'low';
    if (maxContention <= 2) return 'medium';
    return 'high';
  }

  /**
   * 展開/折りたたみの切り替え
   */
  toggleExpand(block) {
    block.isExpanded = !block.isExpanded;
    this.queueRender();
  }

  /**
   * スレッドの追加
   */
  addThread(block) {
    if (this.getTotalThreadCount() >= this.options.maxThreads) {
      this.showError(`最大スレッド数（${this.options.maxThreads}）に達しています`);
      return;
    }
    
    const newThread = this.createDefaultThread(`スレッド${block.threads.length + 1}`);
    block.threads.push(newThread);
    this.updateBlockPerformance(block);
    this.queueRender();
    
    console.log(`✅ Thread added to block ${block.id}`);
  }

  /**
   * スレッドの削除
   */
  deleteThread(block, threadId) {
    if (block.threads.length <= 2) {
      this.showError('最低2つのスレッドが必要です');
      return;
    }
    
    const index = block.threads.findIndex(t => t.id === threadId);
    if (index > -1) {
      block.threads.splice(index, 1);
      this.updateBlockPerformance(block);
      this.queueRender();
    }
  }

  /**
   * スレッドの切り替え
   */
  switchThread(blockId, threadId) {
    const block = this.parallelBlocks.find(b => b.id === blockId);
    if (!block) return;
    
    // アクティブなタブを切り替え
    const blockElement = this.blocksContainer.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return;
    
    // タブの切り替え
    blockElement.querySelectorAll('.thread-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    blockElement.querySelector(`[data-thread-id="${threadId}"]`).classList.add('active');
    
    // コンテンツの切り替え
    blockElement.querySelectorAll('.thread-content').forEach(content => {
      content.classList.remove('active');
    });
    blockElement.querySelector(`[data-thread-content="${threadId}"]`).classList.add('active');
  }

  /**
   * 同期ポイントの追加
   */
  addSyncPoint(block) {
    const newSyncPoint = {
      id: this.generateSyncPointId(),
      name: `同期${block.syncPoints.length + 1}`,
      threadIds: block.threads.map(t => t.id),
      type: 'barrier'
    };
    
    block.syncPoints.push(newSyncPoint);
    this.queueRender();
    
    console.log(`✅ Sync point added to block ${block.id}`);
  }

  /**
   * 同期ポイントIDの生成
   */
  generateSyncPointId() {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * スレッドアクションの追加
   */
  addThreadAction(block, threadId) {
    const thread = block.threads.find(t => t.id === threadId);
    if (!thread) return;
    
    const newAction = {
      id: this.generateActionId(),
      from: 'User',
      to: 'System',
      arrowType: '->',
      message: '新しいアクション',
      duration: 10
    };
    
    thread.actions.push(newAction);
    this.updateBlockPerformance(block);
    this.queueRender();
  }

  /**
   * アクションIDの生成
   */
  generateActionId() {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * スレッドアクションの削除
   */
  deleteThreadAction(block, threadId, actionId) {
    const thread = block.threads.find(t => t.id === threadId);
    if (!thread) return;
    
    const index = thread.actions.findIndex(a => a.id === actionId);
    if (index > -1) {
      thread.actions.splice(index, 1);
      this.updateBlockPerformance(block);
      this.queueRender();
    }
  }

  /**
   * リソースの追加
   */
  addResource(block, threadId) {
    const thread = block.threads.find(t => t.id === threadId);
    if (!thread) return;
    
    const newResource = {
      id: this.generateResourceId(),
      name: `Resource${thread.resources.length + 1}`,
      type: 'shared',
      accessType: 'read'
    };
    
    thread.resources.push(newResource);
    this.updateBlockPerformance(block);
    this.queueRender();
  }

  /**
   * リソースIDの生成
   */
  generateResourceId() {
    return `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * リソースの削除
   */
  deleteResource(block, threadId, resourceId) {
    const thread = block.threads.find(t => t.id === threadId);
    if (!thread) return;
    
    const index = thread.resources.findIndex(r => r.id === resourceId);
    if (index > -1) {
      thread.resources.splice(index, 1);
      this.updateBlockPerformance(block);
      this.queueRender();
    }
  }

  /**
   * 同期ポイントの削除
   */
  deleteSyncPoint(block, syncId) {
    const index = block.syncPoints.findIndex(s => s.id === syncId);
    if (index > -1) {
      block.syncPoints.splice(index, 1);
      this.queueRender();
    }
  }

  /**
   * ブロック分析
   */
  analyzeBlock(block) {
    const analysis = {
      blockId: block.id,
      name: block.name,
      threadCount: block.threads.length,
      totalActions: block.threads.reduce((total, thread) => total + thread.actions.length, 0),
      syncPointCount: block.syncPoints.length,
      performance: block.performance,
      resourceAnalysis: this.analyzeBlockResources(block),
      recommendations: this.generateBlockRecommendations(block)
    };
    
    this.showBlockAnalysisResult(analysis);
  }

  /**
   * ブロックリソース分析
   */
  analyzeBlockResources(block) {
    const resources = new Map();
    const accessPatterns = [];
    
    block.threads.forEach(thread => {
      thread.resources.forEach(resource => {
        if (!resources.has(resource.name)) {
          resources.set(resource.name, {
            name: resource.name,
            accessors: [],
            conflicts: 0
          });
        }
        
        const resourceInfo = resources.get(resource.name);
        resourceInfo.accessors.push({
          threadId: thread.id,
          threadName: thread.name,
          accessType: resource.accessType,
          priority: thread.priority
        });
      });
    });
    
    // 競合の検出
    resources.forEach(resource => {
      if (resource.accessors.length > 1) {
        const writers = resource.accessors.filter(a => a.accessType === 'write');
        if (writers.length > 0) {
          resource.conflicts = writers.length + 
            resource.accessors.filter(a => a.accessType === 'read').length;
        }
      }
    });
    
    return {
      totalResources: resources.size,
      conflictingResources: Array.from(resources.values()).filter(r => r.conflicts > 0).length,
      resources: Array.from(resources.values())
    };
  }

  /**
   * ブロック推奨事項の生成
   */
  generateBlockRecommendations(block) {
    const recommendations = [];
    
    if (block.performance.parallelEfficiency < 0.6) {
      recommendations.push('💡 並行効率が低いです。スレッド間の同期を減らすことを検討してください');
    }
    
    if (block.performance.deadlockRisk === 'high') {
      recommendations.push('🔴 デッドロックリスクが高いです。リソースの取得順序を統一してください');
    }
    
    if (block.threads.length > 4) {
      recommendations.push('📐 スレッド数が多すぎます。CPUコア数を考慮してください');
    }
    
    if (block.syncPoints.length === 0 && block.threads.length > 2) {
      recommendations.push('🔗 同期ポイントの追加を検討してください');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ このブロックに問題は検出されませんでした');
    }
    
    return recommendations;
  }

  /**
   * ブロック分析結果の表示
   */
  showBlockAnalysisResult(analysis) {
    this.analysisContent.innerHTML = `
      <div class="block-analysis-result">
        <h5>並行処理ブロック分析: ${analysis.name}</h5>
        
        <div class="analysis-overview">
          <div class="overview-metrics">
            <div class="metric-card">
              <div class="metric-value">${analysis.threadCount}</div>
              <div class="metric-label">スレッド数</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.totalActions}</div>
              <div class="metric-label">総アクション数</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.syncPointCount}</div>
              <div class="metric-label">同期ポイント</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${(analysis.performance.parallelEfficiency * 100).toFixed(1)}%</div>
              <div class="metric-label">並行効率</div>
            </div>
          </div>
        </div>
        
        <div class="resource-analysis">
          <h6>リソース分析</h6>
          <p>総リソース数: ${analysis.resourceAnalysis.totalResources}</p>
          <p>競合リソース数: ${analysis.resourceAnalysis.conflictingResources}</p>
          
          ${analysis.resourceAnalysis.resources.length > 0 ? `
            <div class="resources-detail">
              ${analysis.resourceAnalysis.resources.map(resource => `
                <div class="resource-item ${resource.conflicts > 0 ? 'has-conflict' : ''}">
                  <strong>${resource.name}</strong>
                  ${resource.conflicts > 0 ? `<span class="conflict-badge">競合</span>` : ''}
                  <div class="accessors">
                    ${resource.accessors.map(accessor => 
                      `<span class="accessor">${accessor.threadName} (${accessor.accessType})</span>`
                    ).join(', ')}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="block-recommendations">
          <h6>推奨事項</h6>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        
        <button class="btn-close-analysis" onclick="this.closest('.analysis-panel').style.display='none'">
          閉じる
        </button>
      </div>
    `;
    
    this.analysisPanel.style.display = 'block';
  }

  /**
   * デッドロック分析
   */
  analyzeDeadlock() {
    if (this.parallelBlocks.length === 0) {
      this.showError('分析する並行処理ブロックがありません');
      return;
    }
    
    const deadlockAnalysis = {
      blocksAnalyzed: this.parallelBlocks.length,
      totalThreads: this.getTotalThreadCount(),
      highRiskBlocks: this.parallelBlocks.filter(b => b.performance.deadlockRisk === 'high'),
      resourceGraph: this.buildResourceGraph(),
      deadlockScenarios: this.detectDeadlockScenarios(),
      recommendations: this.generateDeadlockRecommendations()
    };
    
    this.showDeadlockAnalysisResult(deadlockAnalysis);
  }

  /**
   * リソースグラフの構築
   */
  buildResourceGraph() {
    const graph = new Map();
    
    this.parallelBlocks.forEach(block => {
      block.threads.forEach(thread => {
        thread.resources.forEach(resource => {
          if (!graph.has(resource.name)) {
            graph.set(resource.name, {
              name: resource.name,
              readers: [],
              writers: []
            });
          }
          
          const resourceNode = graph.get(resource.name);
          const threadInfo = {
            blockId: block.id,
            threadId: thread.id,
            threadName: thread.name,
            priority: thread.priority
          };
          
          if (resource.accessType === 'read') {
            resourceNode.readers.push(threadInfo);
          } else {
            resourceNode.writers.push(threadInfo);
          }
        });
      });
    });
    
    return Array.from(graph.values());
  }

  /**
   * デッドロックシナリオの検出
   */
  detectDeadlockScenarios() {
    const scenarios = [];
    const resourceGraph = this.buildResourceGraph();
    
    // 相互待機の検出
    for (let i = 0; i < resourceGraph.length; i++) {
      for (let j = i + 1; j < resourceGraph.length; j++) {
        const resource1 = resourceGraph[i];
        const resource2 = resourceGraph[j];
        
        // 両方のリソースに書き込みアクセスがある場合
        if (resource1.writers.length > 0 && resource2.writers.length > 0) {
          const commonThreads = this.findCommonThreads(resource1, resource2);
          if (commonThreads.length > 0) {
            scenarios.push({
              type: 'write-write-conflict',
              resources: [resource1.name, resource2.name],
              threads: commonThreads,
              riskLevel: 'high'
            });
          }
        }
      }
    }
    
    return scenarios;
  }

  /**
   * 共通スレッドの検索
   */
  findCommonThreads(resource1, resource2) {
    const allThreads1 = [...resource1.readers, ...resource1.writers];
    const allThreads2 = [...resource2.readers, ...resource2.writers];
    
    return allThreads1.filter(thread1 => 
      allThreads2.some(thread2 => thread1.threadId === thread2.threadId)
    );
  }

  /**
   * デッドロック推奨事項の生成
   */
  generateDeadlockRecommendations() {
    const recommendations = [];
    
    const highRiskBlocks = this.parallelBlocks.filter(b => b.performance.deadlockRisk === 'high');
    if (highRiskBlocks.length > 0) {
      recommendations.push('🔴 高リスクブロックが検出されました。リソース取得順序を統一してください');
    }
    
    const resourceGraph = this.buildResourceGraph();
    const conflictingResources = resourceGraph.filter(r => r.writers.length > 1);
    if (conflictingResources.length > 0) {
      recommendations.push('⚠️ 複数スレッドが同じリソースに書き込んでいます。排他制御を追加してください');
    }
    
    if (this.getTotalThreadCount() > 8) {
      recommendations.push('📐 スレッド数が多すぎます。デッドロックリスクが増加します');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ デッドロックリスクは低いレベルです');
    }
    
    return recommendations;
  }

  /**
   * デッドロック分析結果の表示
   */
  showDeadlockAnalysisResult(analysis) {
    this.analysisContent.innerHTML = `
      <div class="deadlock-analysis-result">
        <h5>デッドロック分析結果</h5>
        
        <div class="analysis-summary">
          <div class="summary-metrics">
            <div class="metric-card">
              <div class="metric-value">${analysis.blocksAnalyzed}</div>
              <div class="metric-label">分析ブロック</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.totalThreads}</div>
              <div class="metric-label">総スレッド数</div>
            </div>
            <div class="metric-card">
              <div class="metric-value risk-high">${analysis.highRiskBlocks.length}</div>
              <div class="metric-label">高リスクブロック</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.deadlockScenarios.length}</div>
              <div class="metric-label">リスクシナリオ</div>
            </div>
          </div>
        </div>
        
        ${analysis.deadlockScenarios.length > 0 ? `
          <div class="deadlock-scenarios">
            <h6>検出されたリスクシナリオ</h6>
            ${analysis.deadlockScenarios.map(scenario => `
              <div class="scenario-item risk-${scenario.riskLevel}">
                <div class="scenario-type">${scenario.type}</div>
                <div class="scenario-resources">リソース: ${scenario.resources.join(', ')}</div>
                <div class="scenario-threads">
                  関連スレッド: ${scenario.threads.map(t => t.threadName).join(', ')}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="deadlock-recommendations">
          <h6>推奨事項</h6>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        
        <button class="btn-close-analysis" onclick="this.closest('.analysis-panel').style.display='none'">
          閉じる
        </button>
      </div>
    `;
    
    this.analysisPanel.style.display = 'block';
  }

  /**
   * パフォーマンス分析
   */
  analyzePerformance() {
    if (this.parallelBlocks.length === 0) {
      this.showError('分析する並行処理ブロックがありません');
      return;
    }
    
    const performanceAnalysis = {
      totalBlocks: this.parallelBlocks.length,
      totalThreads: this.getTotalThreadCount(),
      averageParallelEfficiency: this.calculateAverageParallelEfficiency(),
      totalEstimatedTime: this.calculateTotalEstimatedTime(),
      sequentialTime: this.calculateSequentialTime(),
      speedup: this.calculateSpeedup(),
      bottlenecks: this.identifyBottlenecks(),
      recommendations: this.generatePerformanceRecommendations()
    };
    
    this.showPerformanceAnalysisResult(performanceAnalysis);
    this.updateMetrics();
  }

  /**
   * 平均並行効率の計算
   */
  calculateAverageParallelEfficiency() {
    if (this.parallelBlocks.length === 0) return 0;
    
    const totalEfficiency = this.parallelBlocks.reduce((total, block) => 
      total + block.performance.parallelEfficiency, 0
    );
    
    return totalEfficiency / this.parallelBlocks.length;
  }

  /**
   * 総推定時間の計算
   */
  calculateTotalEstimatedTime() {
    return this.parallelBlocks.reduce((total, block) => 
      total + block.performance.estimatedExecutionTime, 0
    );
  }

  /**
   * 逐次実行時間の計算
   */
  calculateSequentialTime() {
    return this.parallelBlocks.reduce((total, block) => {
      const blockSequentialTime = block.threads.reduce((threadTotal, thread) => 
        threadTotal + thread.estimatedDuration + (thread.actions.length * 10), 0
      );
      return total + blockSequentialTime;
    }, 0);
  }

  /**
   * スピードアップの計算
   */
  calculateSpeedup() {
    const sequentialTime = this.calculateSequentialTime();
    const parallelTime = this.calculateTotalEstimatedTime();
    
    return parallelTime > 0 ? sequentialTime / parallelTime : 1;
  }

  /**
   * ボトルネックの特定
   */
  identifyBottlenecks() {
    const bottlenecks = [];
    
    this.parallelBlocks.forEach(block => {
      // 最長実行時間のスレッドを特定
      const maxTime = Math.max(...block.threads.map(t => 
        t.estimatedDuration + (t.actions.length * 10)
      ));
      
      const bottleneckThreads = block.threads.filter(t => 
        (t.estimatedDuration + (t.actions.length * 10)) === maxTime
      );
      
      if (bottleneckThreads.length > 0) {
        bottlenecks.push({
          blockId: block.id,
          blockName: block.name,
          bottleneckThreads: bottleneckThreads.map(t => t.name),
          executionTime: maxTime
        });
      }
    });
    
    return bottlenecks;
  }

  /**
   * パフォーマンス推奨事項の生成（グローバル）
   */
  generatePerformanceRecommendations() {
    const recommendations = [];
    
    const avgEfficiency = this.calculateAverageParallelEfficiency();
    if (avgEfficiency < 0.6) {
      recommendations.push('💡 全体的な並行効率が低いです。並行性を見直してください');
    }
    
    const speedup = this.calculateSpeedup();
    if (speedup < 2) {
      recommendations.push('⚡ スピードアップが低いです。並行化の効果を検証してください');
    }
    
    const bottlenecks = this.identifyBottlenecks();
    if (bottlenecks.length > 0) {
      recommendations.push(`🎯 ${bottlenecks.length}個のボトルネックが検出されました`);
    }
    
    if (this.getTotalThreadCount() > 8) {
      recommendations.push('📐 スレッド数が多すぎます。コンテキストスイッチのオーバーヘッドを考慮してください');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ パフォーマンス上の大きな問題は検出されませんでした');
    }
    
    return recommendations;
  }

  /**
   * パフォーマンス分析結果の表示
   */
  showPerformanceAnalysisResult(analysis) {
    this.analysisContent.innerHTML = `
      <div class="performance-analysis-result">
        <h5>パフォーマンス分析結果</h5>
        
        <div class="performance-overview">
          <div class="overview-metrics">
            <div class="metric-card">
              <div class="metric-value">${(analysis.averageParallelEfficiency * 100).toFixed(1)}%</div>
              <div class="metric-label">平均並行効率</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.totalEstimatedTime}ms</div>
              <div class="metric-label">並行実行時間</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analysis.sequentialTime}ms</div>
              <div class="metric-label">逐次実行時間</div>
            </div>
            <div class="metric-card">
              <div class="metric-value speedup-${this.getSpeedupClass(analysis.speedup)}">${analysis.speedup.toFixed(2)}x</div>
              <div class="metric-label">スピードアップ</div>
            </div>
          </div>
        </div>
        
        ${analysis.bottlenecks.length > 0 ? `
          <div class="bottlenecks-section">
            <h6>検出されたボトルネック</h6>
            ${analysis.bottlenecks.map(bottleneck => `
              <div class="bottleneck-item">
                <div class="bottleneck-block">${bottleneck.blockName}</div>
                <div class="bottleneck-threads">ボトルネックスレッド: ${bottleneck.bottleneckThreads.join(', ')}</div>
                <div class="bottleneck-time">実行時間: ${bottleneck.executionTime}ms</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="performance-recommendations">
          <h6>パフォーマンス改善推奨事項</h6>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        
        <button class="btn-close-analysis" onclick="this.closest('.analysis-panel').style.display='none'">
          閉じる
        </button>
      </div>
    `;
    
    this.analysisPanel.style.display = 'block';
  }

  /**
   * スピードアップクラスの取得
   */
  getSpeedupClass(speedup) {
    if (speedup >= 4) return 'excellent';
    if (speedup >= 2) return 'good';
    if (speedup >= 1.5) return 'fair';
    return 'poor';
  }

  /**
   * メトリクスの更新
   */
  updateMetrics() {
    const totalBlocksElement = this.container.querySelector('[data-metric="total-blocks"]');
    const totalThreadsElement = this.container.querySelector('[data-metric="total-threads"]');
    const parallelismElement = this.container.querySelector('[data-metric="parallelism"]');
    const deadlockRiskElement = this.container.querySelector('[data-metric="deadlock-risk"]');
    
    if (totalBlocksElement) {
      totalBlocksElement.textContent = this.parallelBlocks.length;
    }
    
    if (totalThreadsElement) {
      totalThreadsElement.textContent = this.getTotalThreadCount();
    }
    
    if (parallelismElement) {
      const avgParallelism = this.parallelBlocks.length > 0 ? 
        this.parallelBlocks.reduce((sum, block) => sum + block.threads.length, 0) / this.parallelBlocks.length : 0;
      parallelismElement.textContent = avgParallelism.toFixed(1);
    }
    
    if (deadlockRiskElement) {
      const highRiskBlocks = this.parallelBlocks.filter(b => b.performance.deadlockRisk === 'high');
      const riskLevel = highRiskBlocks.length > 0 ? '高' : '低';
      deadlockRiskElement.textContent = riskLevel;
      deadlockRiskElement.className = `value risk-${highRiskBlocks.length > 0 ? 'high' : 'low'}`;
    }
  }

  /**
   * ブロックの削除
   */
  async deleteBlock(block) {
    try {
      if (!confirm('この並行処理ブロックを削除しますか？')) {
        return;
      }
      
      const index = this.parallelBlocks.findIndex(b => b.id === block.id);
      if (index > -1) {
        this.parallelBlocks.splice(index, 1);
        this.queueRender();
        
        console.log('✅ Parallel block deleted successfully:', block.id);
      }
    } catch (error) {
      console.error('❌ Failed to delete parallel block:', error);
      this.showError('並行処理ブロックの削除に失敗しました');
    }
  }

  /**
   * すべてクリア
   */
  clearAll() {
    if (this.parallelBlocks.length === 0) return;
    
    if (confirm('すべての並行処理ブロックを削除しますか？')) {
      this.parallelBlocks = [];
      this.queueRender();
      console.log('✅ All parallel blocks cleared');
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
    const blocksHtml = this.parallelBlocks
      .map((block, index) => this.renderParallelBlock(block, index))
      .join('');
    
    this.blocksContainer.innerHTML = blocksHtml || this.renderEmptyState();
    this.updatePreview();
    this.updateMetrics();
  }

  /**
   * 空状態のレンダリング
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🧵</div>
        <div class="empty-message">並行処理ブロックを追加してください</div>
        <button class="btn-add-first-block" onclick="this.closest('.parallel-editor').querySelector('.btn-add-parallel').click()">
          最初の並行処理を追加
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
    if (this.parallelBlocks.length === 0) {
      return '@startuml\n// 並行処理ブロックを追加してください\n@enduml';
    }
    
    let code = '@startuml\n';
    
    // 参加者の抽出と定義
    const actors = this.extractAllActors();
    actors.forEach(actor => {
      code += `participant ${actor}\n`;
    });
    
    code += '\n';
    
    // 並行処理ブロックの生成
    this.parallelBlocks.forEach(block => {
      code += this.generateParallelBlockCode(block);
    });
    
    code += '@enduml';
    
    return code;
  }

  /**
   * すべてのアクターを抽出
   */
  extractAllActors() {
    const actors = new Set();
    
    this.parallelBlocks.forEach(block => {
      block.threads.forEach(thread => {
        thread.actions.forEach(action => {
          actors.add(action.from);
          actors.add(action.to);
        });
      });
    });
    
    return Array.from(actors);
  }

  /**
   * 並行処理ブロックのPlantUMLコード生成
   */
  generateParallelBlockCode(block) {
    let code = `par\n`;
    
    // 各スレッドのアクション
    block.threads.forEach((thread, index) => {
      if (index > 0) {
        code += `and\n`;
      }
      
      thread.actions.forEach(action => {
        code += `  ${action.from} ${action.arrowType} ${action.to}: ${action.message}\n`;
      });
    });
    
    code += `end\n\n`;
    
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
      parallelBlocks: this.parallelBlocks,
      plantUML: this.generatePlantUML(),
      analysis: {
        totalBlocks: this.parallelBlocks.length,
        totalThreads: this.getTotalThreadCount(),
        averageParallelEfficiency: this.calculateAverageParallelEfficiency(),
        speedup: this.calculateSpeedup()
      },
      metadata: {
        version: '4.0.0',
        exportedAt: new Date().toISOString(),
        blockCount: this.parallelBlocks.length
      }
    };
  }

  /**
   * データのインポート
   */
  async importData(data) {
    try {
      if (!data.parallelBlocks || !Array.isArray(data.parallelBlocks)) {
        throw new Error('Invalid data format');
      }
      
      this.parallelBlocks = data.parallelBlocks;
      
      // パフォーマンス情報の再計算
      this.parallelBlocks.forEach(block => {
        this.updateBlockPerformance(block);
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
    this.parallelBlocks = [];
    this.activeThreads.clear();
    this.selectedBlock = null;
    
    console.log('✅ ParallelEditor destroyed and cleaned up');
  }
}

// CSS スタイル定義
const CSS_STYLES = `
.parallel-editor {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.parallel-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #e3f2fd;
  border-bottom: 1px solid #2196f3;
}

.parallel-editor-body {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  padding: 16px;
}

.parallel-blocks-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 600px;
  overflow-y: auto;
}

.parallel-block {
  border: 1px solid #2196f3;
  border-radius: 8px;
  background: #f3f9ff;
  overflow: hidden;
  transition: all 0.3s ease;
}

.parallel-block.expanded {
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.2);
}

.parallel-block.risk-medium {
  border-color: #ff9800;
  background: #fff8e1;
}

.parallel-block.risk-high {
  border-color: #f44336;
  background: #ffebee;
}

.parallel-block-header {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 12px;
  padding: 12px 16px;
  background: #e3f2fd;
  border-bottom: 1px solid #2196f3;
  align-items: center;
}

.block-controls {
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
  color: #1976d2;
}

.parallel-icon {
  font-size: 18px;
}

.block-number {
  font-weight: 600;
  color: #1976d2;
  min-width: 20px;
}

.deadlock-risk-indicator {
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

.block-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.block-label {
  font-weight: 600;
  color: #1976d2;
  white-space: nowrap;
}

.block-name-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #2196f3;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.block-name-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.block-metrics {
  display: flex;
  gap: 12px;
  align-items: center;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.metric-item .label {
  color: #666;
}

.metric-item .value {
  font-weight: 600;
  color: #1976d2;
}

.block-actions {
  display: flex;
  gap: 8px;
}

.btn-add-thread,
.btn-sync-point,
.btn-analyze-block,
.btn-delete {
  padding: 6px 10px;
  border: 1px solid #2196f3;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-add-thread:hover,
.btn-sync-point:hover {
  background: #2196f3;
  color: white;
}

.btn-analyze-block:hover {
  background: #ff9800;
  border-color: #ff9800;
  color: white;
}

.btn-delete:hover {
  background: #f44336;
  border-color: #f44336;
  color: white;
}

.parallel-block-content {
  padding: 16px;
}

.thread-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.thread-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.thread-tab.active {
  background: white;
  border-color: #2196f3;
  color: #1976d2;
}

.thread-tab:hover {
  background: #e3f2fd;
}

.thread-icon {
  font-size: 14px;
}

.btn-delete-thread {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: #f44336;
  color: white;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
}

.btn-delete-thread:hover {
  background: #d32f2f;
}

.btn-add-thread-tab {
  padding: 8px 12px;
  border: 1px dashed #2196f3;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: #2196f3;
  cursor: pointer;
  font-size: 14px;
}

.btn-add-thread-tab:hover {
  background: #e3f2fd;
}

.thread-contents {
  position: relative;
}

.thread-content {
  display: none;
}

.thread-content.active {
  display: block;
}

.thread-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-group label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.thread-name-input,
.thread-priority-select,
.thread-duration-input {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.thread-actions-container {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #e3f2fd;
  border-radius: 4px;
}

.section-label {
  font-weight: 600;
  color: #1976d2;
}

.btn-add-action,
.btn-add-resource {
  padding: 4px 8px;
  border: 1px solid #2196f3;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  font-size: 11px;
}

.thread-actions-list,
.resources-list {
  max-height: 200px;
  overflow-y: auto;
}

.empty-actions,
.empty-resources {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.thread-action {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 8px;
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
  color: #1976d2;
}

.action-content {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-arrow {
  color: #666;
  font-weight: bold;
}

.action-timing {
  font-size: 10px;
  color: #666;
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

.thread-resource {
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

.resource-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.resource-name {
  font-weight: 600;
}

.resource-type,
.resource-access {
  padding: 2px 6px;
  border-radius: 3px;
  background: #e3f2fd;
  color: #1976d2;
  font-size: 10px;
}

.btn-delete-resource {
  padding: 2px 6px;
  border: 1px solid #f44336;
  border-radius: 3px;
  background: white;
  color: #f44336;
  cursor: pointer;
  font-size: 10px;
}

.btn-delete-resource:hover {
  background: #f44336;
  color: white;
}

.sync-points-container {
  margin-bottom: 16px;
  border-top: 1px solid #ddd;
  padding-top: 16px;
}

.sync-point {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #ff9800;
  border-radius: 4px;
  font-size: 12px;
}

.sync-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sync-name {
  font-weight: 600;
  color: #e65100;
}

.sync-threads,
.sync-type {
  font-size: 10px;
  color: #666;
}

.btn-delete-sync {
  padding: 2px 6px;
  border: 1px solid #f44336;
  border-radius: 3px;
  background: white;
  color: #f44336;
  cursor: pointer;
  font-size: 10px;
}

.performance-info {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
}

.performance-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.efficiency-high { color: #4caf50; }
.efficiency-medium { color: #ff9800; }
.efficiency-low { color: #f44336; }

.contention-low { color: #4caf50; }
.contention-medium { color: #ff9800; }
.contention-high { color: #f44336; }

.performance-recommendations {
  margin-top: 8px;
}

.recommendation {
  padding: 4px 8px;
  margin-bottom: 4px;
  background: #fff3e0;
  border-left: 3px solid #ff9800;
  border-radius: 3px;
  font-size: 12px;
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

.btn-add-first-block {
  padding: 12px 24px;
  border: 2px solid #2196f3;
  border-radius: 6px;
  background: #2196f3;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-add-first-block:hover {
  background: #1976d2;
  border-color: #1976d2;
  transform: translateY(-2px);
}

.parallel-preview {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
}

.parallel-preview h4 {
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

.parallel-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.parallel-metrics .metric {
  text-align: center;
}

.parallel-metrics .metric .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.parallel-metrics .metric .value {
  font-weight: 600;
  font-size: 14px;
}

.analysis-panel {
  border-top: 1px solid #ddd;
  background: #f9f9f9;
  padding: 16px;
}

.block-analysis-result,
.deadlock-analysis-result,
.performance-analysis-result {
  max-height: 500px;
  overflow-y: auto;
}

.analysis-overview,
.analysis-summary,
.performance-overview {
  margin: 16px 0;
}

.overview-metrics,
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
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

.speedup-excellent { color: #4caf50; }
.speedup-good { color: #8bc34a; }
.speedup-fair { color: #ff9800; }
.speedup-poor { color: #f44336; }

.resource-analysis {
  margin: 16px 0;
}

.resources-detail {
  margin-top: 8px;
}

.resource-item {
  padding: 8px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.resource-item.has-conflict {
  border-color: #f44336;
  background: #ffebee;
}

.conflict-badge {
  padding: 2px 6px;
  background: #f44336;
  color: white;
  border-radius: 3px;
  font-size: 10px;
  margin-left: 8px;
}

.accessors {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.accessor {
  padding: 2px 6px;
  background: #e3f2fd;
  border-radius: 3px;
  margin-right: 4px;
}

.deadlock-scenarios {
  margin: 16px 0;
}

.scenario-item {
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 12px;
}

.scenario-item.risk-high {
  background: #ffebee;
  border-left: 3px solid #f44336;
}

.scenario-type {
  font-weight: 600;
  margin-bottom: 4px;
}

.bottlenecks-section {
  margin: 16px 0;
}

.bottleneck-item {
  padding: 8px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #ff9800;
  border-radius: 4px;
  font-size: 12px;
}

.bottleneck-block {
  font-weight: 600;
  color: #e65100;
}

.bottleneck-threads,
.bottleneck-time {
  margin-top: 2px;
  color: #666;
}

.block-recommendations,
.deadlock-recommendations,
.performance-recommendations {
  margin: 16px 0;
}

.block-recommendations h6,
.deadlock-recommendations h6,
.performance-recommendations h6 {
  margin: 0 0 8px 0;
  color: #333;
}

.block-recommendations ul,
.deadlock-recommendations ul,
.performance-recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.block-recommendations li,
.deadlock-recommendations li,
.performance-recommendations li {
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
  .parallel-editor-body {
    grid-template-columns: 1fr;
  }
  
  .parallel-block-header {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .thread-tabs {
    flex-wrap: wrap;
  }
  
  .thread-settings {
    grid-template-columns: 1fr;
  }
  
  .overview-metrics,
  .summary-metrics {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}
`;

// スタイルの動的挿入
if (!document.getElementById('parallel-editor-styles')) {
  const style = document.createElement('style');
  style.id = 'parallel-editor-styles';
  style.textContent = CSS_STYLES;
  document.head.appendChild(style);
}

export default ParallelEditor;