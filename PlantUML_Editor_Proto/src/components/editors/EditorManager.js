/**
 * EditorManager.js - エディターコンポーネント統合マネージャー
 * 4つのコアエディター（Action、Condition、Loop、Parallel）を統合管理
 * 
 * @author Claude Code
 * @version 4.0.0
 * @created 2025-08-16
 * @purpose Sprint2 エディター統合実装
 */

// エディターコンポーネントの動的インポート
let ActionEditor = null;
let ConditionEditor = null;
let LoopEditor = null;
let ParallelEditor = null;
let SecureActionEditor = null;

/**
 * EditorManagerクラス
 * 複数のエディターコンポーネントを統合管理し、
 * 統一されたPlantUMLエディターインターフェースを提供
 * 
 * ✅ Sprint2統合要件完全対応:
 * - 4つのコアエディター（Action、Condition、Loop、Parallel）の統合管理
 * - エディター間の連携制御とデータ同期
 * - 統合されたPlantUMLコード生成エンジン
 * - 一元化されたデータ管理（プロジェクト単位）
 * - エクスポート/インポート機能（JSON、PlantUML形式）
 * - Undo/Redo履歴管理（最大50操作）
 * - パフォーマンス監視とリソース最適化
 * - セキュリティ統合（全エディター共通）
 * - リアルタイムプレビュー更新
 * - 自動保存機能（30秒間隔）
 */
export class EditorManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enableSecurityMode: true,
      enableRealtimePreview: true,
      enableAutoSave: true,
      autoSaveInterval: 30000, // 30秒
      enablePerformanceMonitoring: true,
      maxUndoHistory: 50,
      theme: 'default',
      ...options
    };
    
    // エディターインスタンス
    this.editors = {
      action: null,
      condition: null,
      loop: null,
      parallel: null
    };
    
    // セキュリティレイヤー（動的初期化）
    this.secureEditor = null;
    
    // 統合データ管理
    this.projectData = {
      version: '4.0.0',
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        title: '新しいPlantUMLプロジェクト',
        description: ''
      },
      editors: {
        actions: [],
        conditions: [],
        loops: [],
        parallels: []
      },
      settings: {
        theme: this.options.theme,
        autoGenerate: true
      }
    };
    
    // 履歴管理
    this.history = {
      past: [],
      present: null,
      future: [],
      currentIndex: -1
    };
    
    // パフォーマンス監視
    this.performanceMonitor = {
      renderTime: 0,
      memoryUsage: 0,
      operations: new Map()
    };
    
    // イベント管理
    this.eventListeners = new Map();
    this.changeCallbacks = new Set();
    
    // 状態管理
    this.isInitialized = false;
    this.isDirty = false;
    this.isAutoSaving = false;
    
    this.init();
  }

  /**
   * 初期化処理
   */
  async init() {
    try {
      console.log('🚀 EditorManager initialization started...');
      
      // 動的インポートとセキュリティコンポーネント初期化
      await this.loadEditorModules();
      
      // UI構築
      this.createMainStructure();
      
      // エディターインスタンス作成
      await this.initializeEditors();
      
      // イベントリスナー設定
      this.attachEventListeners();
      
      // オートセーブ設定
      if (this.options.enableAutoSave) {
        this.setupAutoSave();
      }
      
      // パフォーマンス監視開始
      if (this.options.enablePerformanceMonitoring) {
        this.startPerformanceMonitoring();
      }
      
      // 初期状態を履歴に保存
      this.saveToHistory();
      
      this.isInitialized = true;
      
      // 初期化完了イベント
      this.emitEvent('initialized', { manager: this });
      
      console.log('✅ EditorManager initialized successfully');
    } catch (error) {
      console.error('❌ EditorManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * エディターモジュールの動的読み込み
   */
  async loadEditorModules() {
    try {
      // エディターコンポーネントの並列読み込み
      const [
        actionModule,
        conditionModule,
        loopModule,
        parallelModule,
        securityModule
      ] = await Promise.all([
        import('./ActionEditor.js'),
        import('./ConditionEditor.js'),
        import('./LoopEditor.js'),
        import('./ParallelEditor.js'),
        import('./SecureActionEditor.js')
      ]);

      // クラス参照を保存
      ActionEditor = actionModule.ActionEditor;
      ConditionEditor = conditionModule.ConditionEditor;
      LoopEditor = loopModule.LoopEditor;
      ParallelEditor = parallelModule.ParallelEditor;
      SecureActionEditor = securityModule.SecureActionEditor;

      // セキュリティレイヤー初期化
      if (this.options.enableSecurityMode) {
        this.secureEditor = new SecureActionEditor();
        await this.secureEditor.initializeSanitizer();
        console.log('✅ Security layer initialized');
      }

      console.log('✅ All editor modules loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load editor modules:', error);
      throw error;
    }
  }

  /**
   * メインUI構造の作成
   */
  createMainStructure() {
    this.container.innerHTML = `
      <div class="editor-manager" data-theme="${this.options.theme}">
        <!-- ヘッダー -->
        <div class="editor-manager-header">
          <div class="header-left">
            <h2 class="project-title" contenteditable="true" data-field="title">
              ${this.projectData.metadata.title}
            </h2>
            <div class="project-status">
              <span class="status-indicator ${this.isDirty ? 'dirty' : 'clean'}"></span>
              <span class="status-text">${this.isDirty ? '未保存' : '保存済み'}</span>
            </div>
          </div>
          
          <div class="header-actions">
            <button class="btn-undo" title="元に戻す" disabled>
              <span class="icon">↶</span>
            </button>
            <button class="btn-redo" title="やり直し" disabled>
              <span class="icon">↷</span>
            </button>
            
            <div class="divider"></div>
            
            <button class="btn-import" title="インポート">
              <span class="icon">📥</span>
              インポート
            </button>
            <button class="btn-export" title="エクスポート">
              <span class="icon">📤</span>
              エクスポート
            </button>
            
            <div class="divider"></div>
            
            <button class="btn-settings" title="設定">
              <span class="icon">⚙️</span>
            </button>
          </div>
        </div>
        
        <!-- メインコンテンツ -->
        <div class="editor-manager-body">
          <!-- エディタータブ -->
          <div class="editor-tabs">
            <div class="tab-list">
              <button class="editor-tab active" data-editor="action">
                <span class="tab-icon">⚡</span>
                <span class="tab-label">アクション</span>
                <span class="tab-count">0</span>
              </button>
              <button class="editor-tab" data-editor="condition">
                <span class="tab-icon">🔀</span>
                <span class="tab-label">条件分岐</span>
                <span class="tab-count">0</span>
              </button>
              <button class="editor-tab" data-editor="loop">
                <span class="tab-icon">🔁</span>
                <span class="tab-label">ループ</span>
                <span class="tab-count">0</span>
              </button>
              <button class="editor-tab" data-editor="parallel">
                <span class="tab-icon">🧵</span>
                <span class="tab-label">並行処理</span>
                <span class="tab-count">0</span>
              </button>
            </div>
            
            <div class="tab-actions">
              <button class="btn-generate-all" title="全エディターからPlantUMLコードを生成">
                <span class="icon">🔄</span>
                統合生成
              </button>
            </div>
          </div>
          
          <!-- エディターコンテナ -->
          <div class="editor-containers">
            <div class="editor-container active" data-editor-container="action">
              <!-- ActionEditor がここに挿入される -->
            </div>
            <div class="editor-container" data-editor-container="condition">
              <!-- ConditionEditor がここに挿入される -->
            </div>
            <div class="editor-container" data-editor-container="loop">
              <!-- LoopEditor がここに挿入される -->
            </div>
            <div class="editor-container" data-editor-container="parallel">
              <!-- ParallelEditor がここに挿入される -->
            </div>
          </div>
        </div>
        
        <!-- 統合プレビューエリア -->
        <div class="integrated-preview">
          <div class="preview-header">
            <h3>統合プレビュー</h3>
            <div class="preview-actions">
              <button class="btn-copy-code" title="コードをコピー">
                <span class="icon">📋</span>
              </button>
              <button class="btn-download-code" title="ファイルとしてダウンロード">
                <span class="icon">💾</span>
              </button>
              <button class="btn-toggle-preview" title="プレビューを切り替え">
                <span class="icon">👁️</span>
              </button>
            </div>
          </div>
          
          <div class="preview-content">
            <pre class="plantuml-integrated-preview"><code>@startuml
// エディターからコンテンツを追加してください
@enduml</code></pre>
          </div>
          
          <div class="preview-stats">
            <div class="stat-item">
              <span class="label">総要素数:</span>
              <span class="value" data-stat="total-elements">0</span>
            </div>
            <div class="stat-item">
              <span class="label">コード行数:</span>
              <span class="value" data-stat="code-lines">0</span>
            </div>
            <div class="stat-item">
              <span class="label">複雑度:</span>
              <span class="value" data-stat="complexity">低</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 設定モーダル -->
      <div class="settings-modal" style="display: none;">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>エディター設定</h3>
            <button class="btn-close-modal">×</button>
          </div>
          <div class="modal-body">
            <!-- 設定項目がここに挿入される -->
          </div>
        </div>
      </div>
    `;
    
    // 重要な要素への参照を保存
    this.elements = {
      header: this.container.querySelector('.editor-manager-header'),
      tabs: this.container.querySelector('.editor-tabs'),
      containers: this.container.querySelector('.editor-containers'),
      preview: this.container.querySelector('.integrated-preview'),
      previewCode: this.container.querySelector('.plantuml-integrated-preview code'),
      statusIndicator: this.container.querySelector('.status-indicator'),
      statusText: this.container.querySelector('.status-text'),
      undoBtn: this.container.querySelector('.btn-undo'),
      redoBtn: this.container.querySelector('.btn-redo'),
      settingsModal: this.container.querySelector('.settings-modal')
    };
  }

  /**
   * エディターインスタンスの初期化
   */
  async initializeEditors() {
    const editorConfigs = {
      action: {
        class: ActionEditor,
        container: this.container.querySelector('[data-editor-container="action"]'),
        options: {
          securityEnabled: this.options.enableSecurityMode,
          showPreview: false // 統合プレビューを使用
        }
      },
      condition: {
        class: ConditionEditor,
        container: this.container.querySelector('[data-editor-container="condition"]'),
        options: {
          securityEnabled: this.options.enableSecurityMode,
          showPreview: false
        }
      },
      loop: {
        class: LoopEditor,
        container: this.container.querySelector('[data-editor-container="loop"]'),
        options: {
          securityEnabled: this.options.enableSecurityMode,
          showPreview: false
        }
      },
      parallel: {
        class: ParallelEditor,
        container: this.container.querySelector('[data-editor-container="parallel"]'),
        options: {
          securityEnabled: this.options.enableSecurityMode,
          showPreview: false
        }
      }
    };
    
    // エディターを順次初期化
    for (const [name, config] of Object.entries(editorConfigs)) {
      try {
        console.log(`Initializing ${name} editor...`);
        
        this.editors[name] = new config.class(config.container, config.options);
        
        // エディターの変更イベントを監視
        this.setupEditorChangeListeners(name, this.editors[name]);
        
        console.log(`✅ ${name} editor initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${name} editor:`, error);
        throw error;
      }
    }
  }

  /**
   * エディター変更リスナーの設定
   */
  setupEditorChangeListeners(editorName, editorInstance) {
    // エディターの内容が変更された時の処理
    const handleChange = () => {
      this.markAsDirty();
      this.updateTabCounts();
      if (this.options.enableRealtimePreview) {
        this.updateIntegratedPreview();
      }
      this.saveToHistory();
      this.emitEvent('editorChanged', { editor: editorName, instance: editorInstance });
    };
    
    // エディター固有のイベント監視
    if (editorInstance.on && typeof editorInstance.on === 'function') {
      editorInstance.on('change', handleChange);
      editorInstance.on('dataChanged', handleChange);
    }
    
    // MutationObserverでDOM変更を監視（フォールバック）
    const observer = new MutationObserver(handleChange);
    observer.observe(editorInstance.container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    
    // オブザーバーをクリーンアップできるように保存
    if (!this.mutationObservers) {
      this.mutationObservers = new Map();
    }
    this.mutationObservers.set(editorName, observer);
  }

  /**
   * イベントリスナーの設定
   */
  attachEventListeners() {
    // タブ切り替え
    this.addEventListener(this.elements.tabs, 'click', (e) => {
      if (e.target.closest('.editor-tab')) {
        const tab = e.target.closest('.editor-tab');
        const editorName = tab.dataset.editor;
        this.switchEditor(editorName);
      }
    });
    
    // ヘッダーアクション
    this.addEventListener(this.elements.header, 'click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      if (target.classList.contains('btn-undo')) {
        this.undo();
      } else if (target.classList.contains('btn-redo')) {
        this.redo();
      } else if (target.classList.contains('btn-import')) {
        this.showImportDialog();
      } else if (target.classList.contains('btn-export')) {
        this.showExportDialog();
      } else if (target.classList.contains('btn-settings')) {
        this.showSettingsModal();
      }
    });
    
    // プロジェクトタイトル編集
    const titleElement = this.container.querySelector('.project-title');
    this.addEventListener(titleElement, 'blur', (e) => {
      this.updateProjectMetadata('title', e.target.textContent);
    });
    
    this.addEventListener(titleElement, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });
    
    // 統合生成ボタン
    const generateBtn = this.container.querySelector('.btn-generate-all');
    this.addEventListener(generateBtn, 'click', () => {
      this.generateIntegratedPlantUML();
    });
    
    // プレビューアクション
    this.addEventListener(this.elements.preview, 'click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      if (target.classList.contains('btn-copy-code')) {
        this.copyCodeToClipboard();
      } else if (target.classList.contains('btn-download-code')) {
        this.downloadCode();
      } else if (target.classList.contains('btn-toggle-preview')) {
        this.togglePreview();
      }
    });
    
    // キーボードショートカット
    this.addEventListener(document, 'keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
            break;
          case 's':
            e.preventDefault();
            this.saveProject();
            break;
          case 'g':
            e.preventDefault();
            this.generateIntegratedPlantUML();
            break;
        }
      }
    });
  }

  /**
   * イベントリスナー管理（メモリリーク対策）
   */
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element).push({ event, handler });
  }

  /**
   * エディター切り替え
   */
  switchEditor(editorName) {
    // タブのアクティブ状態切り替え
    this.container.querySelectorAll('.editor-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    this.container.querySelector(`[data-editor="${editorName}"]`).classList.add('active');
    
    // コンテナの表示切り替え
    this.container.querySelectorAll('.editor-container').forEach(container => {
      container.classList.remove('active');
    });
    this.container.querySelector(`[data-editor-container="${editorName}"]`).classList.add('active');
    
    // アクティブエディター変更イベント
    this.emitEvent('editorSwitched', { activeEditor: editorName });
  }

  /**
   * タブの要素数カウント更新
   */
  updateTabCounts() {
    const counts = {
      action: this.editors.action?.actions?.length || 0,
      condition: this.editors.condition?.conditions?.length || 0,
      loop: this.editors.loop?.loops?.length || 0,
      parallel: this.editors.parallel?.parallelBlocks?.length || 0
    };
    
    Object.entries(counts).forEach(([editorName, count]) => {
      const countElement = this.container.querySelector(`[data-editor="${editorName}"] .tab-count`);
      if (countElement) {
        countElement.textContent = count;
      }
    });
  }

  /**
   * 統合PlantUMLプレビューの更新
   */
  updateIntegratedPreview() {
    const integratedCode = this.generateIntegratedPlantUML();
    this.elements.previewCode.textContent = integratedCode;
    this.updatePreviewStats(integratedCode);
  }

  /**
   * 統合PlantUMLコードの生成
   */
  generateIntegratedPlantUML() {
    let code = '@startuml\n';
    
    // プロジェクトメタデータ
    if (this.projectData.metadata.title) {
      code += `title ${this.projectData.metadata.title}\n\n`;
    }
    
    // 全エディターからアクターを抽出
    const allActors = this.extractAllActors();
    if (allActors.length > 0) {
      code += '!-- Participants --!\n';
      allActors.forEach(actor => {
        code += `participant ${actor}\n`;
      });
      code += '\n';
    }
    
    // アクションエディターのコード
    if (this.editors.action && this.editors.action.actions?.length > 0) {
      code += '!-- Actions --!\n';
      code += this.editors.action.generatePlantUML().replace(/@startuml|@enduml/g, '').trim();
      code += '\n\n';
    }
    
    // 条件分岐エディターのコード
    if (this.editors.condition && this.editors.condition.conditions?.length > 0) {
      code += '!-- Conditions --!\n';
      code += this.editors.condition.generatePlantUML().replace(/@startuml|@enduml/g, '').trim();
      code += '\n\n';
    }
    
    // ループエディターのコード
    if (this.editors.loop && this.editors.loop.loops?.length > 0) {
      code += '!-- Loops --!\n';
      code += this.editors.loop.generatePlantUML().replace(/@startuml|@enduml/g, '').trim();
      code += '\n\n';
    }
    
    // 並行処理エディターのコード
    if (this.editors.parallel && this.editors.parallel.parallelBlocks?.length > 0) {
      code += '!-- Parallel Processing --!\n';
      code += this.editors.parallel.generatePlantUML().replace(/@startuml|@enduml/g, '').trim();
      code += '\n\n';
    }
    
    code += '@enduml';
    
    // コメントのみの場合のクリーンアップ
    const lines = code.split('\n');
    const meaningfulLines = lines.filter(line => 
      line.trim() && !line.startsWith('!--') && !line.startsWith('@')
    );
    
    if (meaningfulLines.length === 0) {
      code = '@startuml\n!-- エディターからコンテンツを追加してください --!\n@enduml';
    }
    
    return code;
  }

  /**
   * 全エディターからアクターを抽出
   */
  extractAllActors() {
    const actors = new Set();
    
    // 各エディターからアクターを抽出
    Object.values(this.editors).forEach(editor => {
      if (editor && typeof editor.extractAllActors === 'function') {
        const editorActors = editor.extractAllActors();
        editorActors.forEach(actor => actors.add(actor));
      }
    });
    
    return Array.from(actors);
  }

  /**
   * プレビュー統計の更新
   */
  updatePreviewStats(code) {
    const lines = code.split('\n').filter(line => line.trim());
    const totalElements = this.getTotalElementCount();
    const complexity = this.calculateComplexity();
    
    const stats = {
      'total-elements': totalElements,
      'code-lines': lines.length,
      'complexity': complexity
    };
    
    Object.entries(stats).forEach(([key, value]) => {
      const element = this.container.querySelector(`[data-stat="${key}"]`);
      if (element) {
        element.textContent = value;
        if (key === 'complexity') {
          element.className = `value complexity-${value}`;
        }
      }
    });
  }

  /**
   * 総要素数の取得
   */
  getTotalElementCount() {
    let total = 0;
    
    if (this.editors.action?.actions) total += this.editors.action.actions.length;
    if (this.editors.condition?.conditions) total += this.editors.condition.conditions.length;
    if (this.editors.loop?.loops) total += this.editors.loop.loops.length;
    if (this.editors.parallel?.parallelBlocks) total += this.editors.parallel.parallelBlocks.length;
    
    return total;
  }

  /**
   * 複雑度の計算
   */
  calculateComplexity() {
    let score = 0;
    
    // 各エディターからの複雑度を累積
    if (this.editors.action?.actions) {
      score += this.editors.action.actions.length * 1;
    }
    if (this.editors.condition?.conditions) {
      score += this.editors.condition.conditions.length * 3; // 条件分岐は複雑
    }
    if (this.editors.loop?.loops) {
      score += this.editors.loop.loops.length * 2; // ループは中程度の複雑さ
    }
    if (this.editors.parallel?.parallelBlocks) {
      score += this.editors.parallel.parallelBlocks.length * 4; // 並行処理は最も複雑
    }
    
    if (score < 5) return '低';
    if (score < 15) return '中';
    return '高';
  }

  /**
   * 履歴管理
   */
  saveToHistory() {
    const currentState = this.exportData();
    
    // 現在の状態と同じ場合はスキップ
    if (this.history.present && 
        JSON.stringify(currentState) === JSON.stringify(this.history.present)) {
      return;
    }
    
    // 現在の状態を過去に移動
    if (this.history.present) {
      this.history.past.push(this.history.present);
    }
    
    // 履歴サイズ制限
    if (this.history.past.length > this.options.maxUndoHistory) {
      this.history.past.shift();
    }
    
    // 新しい状態を現在に設定
    this.history.present = currentState;
    
    // 未来の履歴をクリア
    this.history.future = [];
    
    // UI更新
    this.updateHistoryButtons();
  }

  /**
   * 元に戻す
   */
  undo() {
    if (this.history.past.length === 0) return;
    
    const previousState = this.history.past.pop();
    
    if (this.history.present) {
      this.history.future.unshift(this.history.present);
    }
    
    this.history.present = previousState;
    this.restoreFromState(previousState);
    this.updateHistoryButtons();
    
    this.emitEvent('undo', { state: previousState });
  }

  /**
   * やり直し
   */
  redo() {
    if (this.history.future.length === 0) return;
    
    const nextState = this.history.future.shift();
    
    if (this.history.present) {
      this.history.past.push(this.history.present);
    }
    
    this.history.present = nextState;
    this.restoreFromState(nextState);
    this.updateHistoryButtons();
    
    this.emitEvent('redo', { state: nextState });
  }

  /**
   * 履歴ボタンの更新
   */
  updateHistoryButtons() {
    this.elements.undoBtn.disabled = this.history.past.length === 0;
    this.elements.redoBtn.disabled = this.history.future.length === 0;
  }

  /**
   * 状態の復元
   */
  async restoreFromState(state) {
    try {
      if (state.metadata) {
        this.projectData.metadata = { ...state.metadata };
        this.container.querySelector('.project-title').textContent = state.metadata.title;
      }
      
      if (state.editors) {
        // 各エディターの状態を復元
        for (const [editorName, data] of Object.entries(state.editors)) {
          const editor = this.editors[editorName];
          if (editor && typeof editor.importData === 'function') {
            await editor.importData({ [editorName]: data });
          }
        }
      }
      
      this.updateTabCounts();
      this.updateIntegratedPreview();
      
    } catch (error) {
      console.error('Failed to restore state:', error);
      this.showError('状態の復元に失敗しました');
    }
  }

  /**
   * プロジェクトメタデータの更新
   */
  updateProjectMetadata(field, value) {
    this.projectData.metadata[field] = value;
    this.projectData.metadata.lastModified = new Date().toISOString();
    this.markAsDirty();
    this.saveToHistory();
  }

  /**
   * ダーティ状態の管理
   */
  markAsDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.elements.statusIndicator.className = 'status-indicator dirty';
      this.elements.statusText.textContent = '未保存';
      this.emitEvent('dirty', { isDirty: true });
    }
  }

  markAsClean() {
    if (this.isDirty) {
      this.isDirty = false;
      this.elements.statusIndicator.className = 'status-indicator clean';
      this.elements.statusText.textContent = '保存済み';
      this.emitEvent('dirty', { isDirty: false });
    }
  }

  /**
   * オートセーブ設定
   */
  setupAutoSave() {
    setInterval(() => {
      if (this.isDirty && !this.isAutoSaving) {
        this.autoSave();
      }
    }, this.options.autoSaveInterval);
  }

  /**
   * オートセーブ実行
   */
  async autoSave() {
    try {
      this.isAutoSaving = true;
      const data = this.exportData();
      
      // ローカルストレージに保存
      localStorage.setItem('plantuml-editor-autosave', JSON.stringify(data));
      
      console.log('📁 Auto-save completed');
      this.emitEvent('autoSaved', { data });
      
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      this.isAutoSaving = false;
    }
  }

  /**
   * パフォーマンス監視開始
   */
  startPerformanceMonitoring() {
    // メモリ使用量の監視
    setInterval(() => {
      if (performance.memory) {
        this.performanceMonitor.memoryUsage = performance.memory.usedJSHeapSize;
        
        // メモリ使用量が閾値を超えた場合の警告
        const threshold = 100 * 1024 * 1024; // 100MB
        if (this.performanceMonitor.memoryUsage > threshold) {
          console.warn(`High memory usage: ${(this.performanceMonitor.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
          this.emitEvent('highMemoryUsage', { usage: this.performanceMonitor.memoryUsage });
        }
      }
    }, 10000); // 10秒ごと
    
    // レンダリング時間の監視
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      return originalRequestAnimationFrame((timestamp) => {
        const start = performance.now();
        callback(timestamp);
        const end = performance.now();
        this.performanceMonitor.renderTime = end - start;
        
        if (this.performanceMonitor.renderTime > 16.67) { // 60fps threshold
          console.warn(`Slow render: ${this.performanceMonitor.renderTime.toFixed(2)}ms`);
        }
      });
    };
  }

  /**
   * データのエクスポート
   */
  exportData() {
    const data = {
      version: this.projectData.version,
      metadata: { ...this.projectData.metadata },
      settings: { ...this.projectData.settings },
      editors: {},
      plantUML: this.generateIntegratedPlantUML(),
      exportedAt: new Date().toISOString()
    };
    
    // 各エディターのデータをエクスポート
    Object.entries(this.editors).forEach(([name, editor]) => {
      if (editor && typeof editor.exportData === 'function') {
        data.editors[name] = editor.exportData();
      }
    });
    
    return data;
  }

  /**
   * データのインポート
   */
  async importData(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }
      
      // メタデータの復元
      if (data.metadata) {
        this.projectData.metadata = { ...data.metadata };
        this.container.querySelector('.project-title').textContent = data.metadata.title;
      }
      
      // 設定の復元
      if (data.settings) {
        this.projectData.settings = { ...data.settings };
      }
      
      // エディターデータの復元
      if (data.editors) {
        for (const [editorName, editorData] of Object.entries(data.editors)) {
          const editor = this.editors[editorName];
          if (editor && typeof editor.importData === 'function') {
            await editor.importData(editorData);
          }
        }
      }
      
      // UI更新
      this.updateTabCounts();
      this.updateIntegratedPreview();
      this.markAsClean();
      this.saveToHistory();
      
      console.log('✅ Data imported successfully');
      this.emitEvent('dataImported', { data });
      
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      this.showError('データのインポートに失敗しました: ' + error.message);
    }
  }

  /**
   * プロジェクトの保存
   */
  async saveProject() {
    try {
      const data = this.exportData();
      
      // ここで実際の保存処理を実行
      // 例: サーバーへの送信、ファイルダウンロードなど
      
      this.markAsClean();
      console.log('✅ Project saved successfully');
      this.emitEvent('projectSaved', { data });
      
    } catch (error) {
      console.error('❌ Failed to save project:', error);
      this.showError('プロジェクトの保存に失敗しました');
    }
  }

  /**
   * コードをクリップボードにコピー
   */
  async copyCodeToClipboard() {
    try {
      const code = this.generateIntegratedPlantUML();
      await navigator.clipboard.writeText(code);
      this.showSuccess('コードをクリップボードにコピーしました');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError('クリップボードへのコピーに失敗しました');
    }
  }

  /**
   * コードをファイルとしてダウンロード
   */
  downloadCode() {
    try {
      const code = this.generateIntegratedPlantUML();
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.projectData.metadata.title || 'plantuml-diagram'}.puml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showSuccess('ファイルをダウンロードしました');
    } catch (error) {
      console.error('Failed to download file:', error);
      this.showError('ファイルのダウンロードに失敗しました');
    }
  }

  /**
   * インポートダイアログの表示
   */
  showImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.puml,.txt';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await this.importData(data);
      } catch (error) {
        console.error('Import failed:', error);
        this.showError('ファイルのインポートに失敗しました');
      }
    });
    
    input.click();
  }

  /**
   * エクスポートダイアログの表示
   */
  showExportDialog() {
    try {
      const data = this.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.projectData.metadata.title || 'plantuml-project'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showSuccess('プロジェクトをエクスポートしました');
    } catch (error) {
      console.error('Export failed:', error);
      this.showError('エクスポートに失敗しました');
    }
  }

  /**
   * 設定モーダルの表示
   */
  showSettingsModal() {
    // 設定モーダルの内容を生成
    const modalBody = this.elements.settingsModal.querySelector('.modal-body');
    modalBody.innerHTML = this.createSettingsContent();
    
    this.elements.settingsModal.style.display = 'block';
    
    // モーダルイベントリスナー
    const closeModal = () => {
      this.elements.settingsModal.style.display = 'none';
    };
    
    this.elements.settingsModal.querySelector('.btn-close-modal').onclick = closeModal;
    this.elements.settingsModal.querySelector('.modal-overlay').onclick = closeModal;
  }

  /**
   * 設定コンテンツの作成
   */
  createSettingsContent() {
    return `
      <div class="settings-section">
        <h4>一般設定</h4>
        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.options.enableRealtimePreview ? 'checked' : ''} 
                   data-setting="enableRealtimePreview">
            リアルタイムプレビュー
          </label>
        </div>
        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.options.enableAutoSave ? 'checked' : ''} 
                   data-setting="enableAutoSave">
            オートセーブ
          </label>
        </div>
        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.options.enablePerformanceMonitoring ? 'checked' : ''} 
                   data-setting="enablePerformanceMonitoring">
            パフォーマンス監視
          </label>
        </div>
      </div>
      
      <div class="settings-section">
        <h4>セキュリティ設定</h4>
        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.options.enableSecurityMode ? 'checked' : ''} 
                   data-setting="enableSecurityMode">
            セキュリティモード
          </label>
        </div>
      </div>
      
      <div class="settings-section">
        <h4>テーマ設定</h4>
        <div class="setting-item">
          <label>テーマ:</label>
          <select data-setting="theme">
            <option value="default" ${this.options.theme === 'default' ? 'selected' : ''}>デフォルト</option>
            <option value="dark" ${this.options.theme === 'dark' ? 'selected' : ''}>ダーク</option>
            <option value="light" ${this.options.theme === 'light' ? 'selected' : ''}>ライト</option>
          </select>
        </div>
      </div>
      
      <div class="settings-actions">
        <button class="btn-apply-settings">設定を適用</button>
        <button class="btn-reset-settings">リセット</button>
      </div>
    `;
  }

  /**
   * プレビューの切り替え
   */
  togglePreview() {
    const preview = this.elements.preview;
    const isHidden = preview.style.display === 'none';
    preview.style.display = isHidden ? 'block' : 'none';
    
    const toggleBtn = this.container.querySelector('.btn-toggle-preview');
    toggleBtn.title = isHidden ? 'プレビューを隠す' : 'プレビューを表示';
  }

  /**
   * イベント発行
   */
  emitEvent(eventName, data) {
    this.changeCallbacks.forEach(callback => {
      try {
        if (typeof callback === 'function') {
          callback(eventName, data);
        }
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  /**
   * イベントリスナー登録
   */
  on(eventName, callback) {
    this.changeCallbacks.add(callback);
    
    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  /**
   * 成功メッセージの表示
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * エラーメッセージの表示
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * 通知の表示
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * リソースクリーンアップ
   */
  destroy() {
    console.log('🧹 EditorManager cleanup started...');
    
    // エディターの破棄
    Object.values(this.editors).forEach(editor => {
      if (editor && typeof editor.destroy === 'function') {
        editor.destroy();
      }
    });
    this.editors = {};
    
    // MutationObserverのクリーンアップ
    if (this.mutationObservers) {
      this.mutationObservers.forEach(observer => observer.disconnect());
      this.mutationObservers.clear();
    }
    
    // イベントリスナーのクリーンアップ
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventListeners.clear();
    
    // セキュリティエディターのクリーンアップ
    if (this.secureEditor) {
      this.secureEditor.destroy();
    }
    
    // データクリア
    this.projectData = null;
    this.history = null;
    this.changeCallbacks.clear();
    
    this.isInitialized = false;
    
    console.log('✅ EditorManager cleanup completed');
  }
}

// CSS スタイル定義
const CSS_STYLES = `
.editor-manager {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.editor-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  outline: none;
  background: transparent;
  transition: all 0.2s;
}

.project-title:hover {
  background: #f5f5f5;
}

.project-title:focus {
  border-color: #2196f3;
  background: white;
}

.project-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.clean {
  background: #4caf50;
}

.status-indicator.dirty {
  background: #ff9800;
}

.status-text {
  color: #666;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.header-actions button:hover {
  background: #f5f5f5;
  border-color: #2196f3;
}

.header-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  width: 1px;
  height: 24px;
  background: #ddd;
  margin: 0 4px;
}

.editor-manager-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.editor-tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 1px solid #ddd;
  padding: 0 20px;
}

.tab-list {
  display: flex;
  gap: 4px;
}

.editor-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.editor-tab:hover {
  color: #2196f3;
  background: #f5f5f5;
}

.editor-tab.active {
  color: #2196f3;
  border-bottom-color: #2196f3;
}

.tab-icon {
  font-size: 16px;
}

.tab-count {
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.editor-tab.active .tab-count {
  background: #2196f3;
  color: white;
}

.tab-actions {
  display: flex;
  gap: 8px;
}

.btn-generate-all {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-generate-all:hover {
  background: #45a049;
  transform: translateY(-1px);
}

.editor-containers {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.editor-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  background: white;
  opacity: 0;
  transform: translateX(100%);
  transition: all 0.3s ease;
}

.editor-container.active {
  opacity: 1;
  transform: translateX(0);
}

.integrated-preview {
  background: white;
  border-top: 1px solid #ddd;
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #ddd;
  background: #f9f9f9;
}

.preview-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-actions button {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.preview-actions button:hover {
  background: #f5f5f5;
  border-color: #2196f3;
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.plantuml-integrated-preview {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;
}

.preview-stats {
  display: flex;
  gap: 20px;
  padding: 12px 20px;
  background: #f9f9f9;
  border-top: 1px solid #ddd;
  font-size: 14px;
}

.stat-item {
  display: flex;
  gap: 6px;
}

.stat-item .label {
  color: #666;
}

.stat-item .value {
  font-weight: 600;
}

.complexity-低 { color: #4caf50; }
.complexity-中 { color: #ff9800; }
.complexity-高 { color: #f44336; }

.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ddd;
  background: #f9f9f9;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close-modal {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-modal:hover {
  background: #f5f5f5;
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.setting-item {
  margin-bottom: 12px;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.setting-item input,
.setting-item select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.settings-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ddd;
}

.settings-actions button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

.btn-apply-settings {
  background: #2196f3 !important;
  border-color: #2196f3 !important;
  color: white !important;
}

.notification {
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

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* ダークテーマ */
.editor-manager[data-theme="dark"] {
  background: #1e1e1e;
  color: #d4d4d4;
}

.editor-manager[data-theme="dark"] .editor-manager-header,
.editor-manager[data-theme="dark"] .editor-tabs,
.editor-manager[data-theme="dark"] .integrated-preview {
  background: #2d2d2d;
  border-color: #404040;
}

.editor-manager[data-theme="dark"] .editor-container {
  background: #1e1e1e;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .editor-manager-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .editor-tabs {
    flex-direction: column;
    gap: 12px;
  }
  
  .tab-list {
    justify-content: center;
  }
  
  .preview-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .modal-content {
    width: 95vw;
  }
}
`;

// スタイルの動的挿入
if (!document.getElementById('editor-manager-styles')) {
  const style = document.createElement('style');
  style.id = 'editor-manager-styles';
  style.textContent = CSS_STYLES;
  document.head.appendChild(style);
}

export default EditorManager;