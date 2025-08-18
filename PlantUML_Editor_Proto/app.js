// Phase 3モジュール（グローバル変数から取得）
let RealtimeSyncManager, DiffCalculator, CursorStateManager;

// グローバル変数からモジュールを取得
function loadPhase3Modules() {
    try {
        // グローバルスコープから取得
        RealtimeSyncManager = window.RealtimeSyncManager;
        DiffCalculator = window.DiffCalculator;
        CursorStateManager = window.CursorStateManager;
        
        if (!RealtimeSyncManager || !DiffCalculator || !CursorStateManager) {
            console.warn('[PlantUMLEditor] Phase 3モジュールの一部が見つかりません');
        }
    } catch (error) {
        console.warn('[PlantUMLEditor] Phase 3モジュールの読み込みに失敗しました:', error);
    }
}

// PlantUMLエディターアプリケーション
class PlantUMLEditor {
    // シングルトンパターンの実装
    static instance = null;
    
    constructor() {
        // シングルトンパターンの強制
        if (PlantUMLEditor.instance) {
            console.log('[PlantUMLEditor] Returning existing instance');
            return PlantUMLEditor.instance;
        }
        this.selectedActors = new Set();
        this.actions = [];
        this.currentMode = 'actor-action';
        this.patterns = this.loadPatterns();
        this.currentZoom = 100;
        this.isUpdatingCode = false; // コード自動更新中フラグ
        this.isUpdatingFromCode = false; // コードからUI更新中フラグ
        this.codeChangeTimeout = null; // デバウンス用タイマー
        
        // Phase 1: EditModalManager統合（改修計画v4）
        this.editModalManager = null;
        
        // Phase 2改善版: モジュール化されたパーサーと状態管理
        this.parser = null;
        this.stateManager = null;
        this.useModularParser = false;
        
        // アクターマスタ管理
        this.actorMasterManager = null;
        
        // Phase 3: 高度な双方向同期システム
        this.realtimeSyncManager = null;
        this.diffCalculator = null;
        this.cursorStateManager = null;
        this.phase3Enabled = false;
        
        // 旧システムとの互換性
        this.syncManager = null;
        
        // 複雑な処理用のデータ
        this.currentActionType = 'message';
        this.tempConditionData = {
            type: 'alt',
            name: '',
            trueBranch: [],
            falseBranch: []
        };
        this.tempLoopData = {
            condition: '',
            actions: []
        };
        this.tempParallelData = {
            branches: [[], []]
        };
        this.parallelBranchCount = 2;
        
        // シングルトンインスタンスを登録
        PlantUMLEditor.instance = this;
        console.log('[PlantUMLEditor] Instance created and registered');
        
        this.init();
    }

    /**
     * シングルトンインスタンスを取得
     * @returns {PlantUMLEditor} PlantUMLEditorのインスタンス
     */
    static getInstance() {
        if (!PlantUMLEditor.instance) {
            console.log('[PlantUMLEditor] Creating new instance');
            PlantUMLEditor.instance = new PlantUMLEditor();
        }
        return PlantUMLEditor.instance;
    }

    async init() {
        // Phase 2改善版: モジュール化されたパーサーと状態管理の初期化
        this.initializeModularComponents();
        
        // アクターマスタ管理の初期化
        await this.initializeActorMaster();
        
        // Phase 3モジュールの読み込み
        // フリーズ問題のため一時的に無効化 - 2025-08-13
        console.warn('[PlantUMLEditor] Phase 3システムの初期化を一時的にスキップ（フリーズ問題対応）');
        // await this.initializePhase3();
        
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupPanelResize();
        this.updatePlantUML();
        this.updateLineNumbers();
    }
    
    /**
     * アクターマスタ管理の初期化
     */
    async initializeActorMaster() {
        try {
            if (typeof ActorMasterManager !== 'undefined') {
                this.actorMasterManager = new ActorMasterManager();
                
                // マスタデータの読み込み
                const loaded = await this.actorMasterManager.loadMasterData();
                
                if (loaded) {
                    console.log('[PlantUMLEditor] ActorMasterManagerを初期化しました');
                    
                    // アクターグリッドを動的に生成
                    this.generateActorGrid();
                } else {
                    console.warn('[PlantUMLEditor] マスタデータの読み込みに失敗、フォールバックを使用');
                    this.generateActorGrid();
                }
            } else {
                console.warn('[PlantUMLEditor] ActorMasterManagerが利用できません');
            }
        } catch (error) {
            console.error('[PlantUMLEditor] ActorMasterManagerの初期化エラー:', error);
        }
    }
    
    /**
     * アクターグリッドの動的生成
     */
    generateActorGrid() {
        const grid = document.querySelector('.actor-grid');
        if (!grid || !this.actorMasterManager) return;
        
        // 既存のボタンをクリア（追加・削除ボタンは残す）
        const existingButtons = grid.querySelectorAll('.actor-btn');
        existingButtons.forEach(btn => btn.remove());
        
        // マスタからアクターボタンを生成
        const html = this.actorMasterManager.generateActorGridHTML();
        grid.innerHTML = html;
        
        // イベントリスナーを再設定
        grid.querySelectorAll('.actor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleActor(btn.dataset.actor, btn);
            });
        });
        
        console.log('[PlantUMLEditor] アクターグリッドを生成しました');
    }
    
    /**
     * Phase 2改善版: モジュール化されたコンポーネントの初期化
     */
    initializeModularComponents() {
        try {
            // Phase 1: EditModalManagerの初期化（改修計画v4）
            if (typeof EditModalManager !== 'undefined') {
                this.editModalManager = new EditModalManager();
                console.log('[PlantUMLEditor] EditModalManagerを初期化しました');
                
                // グローバル参照として登録
                window.app = this;
            }
            
            // PlantUMLParserの初期化
            if (typeof PlantUMLParser !== 'undefined') {
                this.parser = new PlantUMLParser({ 
                    debugMode: localStorage.getItem('debug_parse') === 'true' 
                });
                this.useModularParser = true;
                console.log('[PlantUMLEditor] モジュール化されたPlantUMLParserを使用');
            }
            
            // SyncStateManagerの初期化
            if (typeof SyncStateManager !== 'undefined') {
                this.stateManager = new SyncStateManager({ 
                    parser: this.parser,
                    debugMode: localStorage.getItem('debug_state') === 'true',
                    autoBackup: true
                });
                
                // イベントリスナーの登録
                this.stateManager.on('update', (data) => {
                    if (data.source === 'code') {
                        this.updateUIFromState();
                    }
                });
                
                this.stateManager.on('error', (data) => {
                    console.error('[SyncStateManager] エラー:', data.error);
                    this.showStatus('同期エラーが発生しました', 'error');
                });
                
                console.log('[PlantUMLEditor] SyncStateManagerを使用');
            }
        } catch (error) {
            console.warn('[PlantUMLEditor] モジュール化コンポーネントの初期化エラー:', error);
            this.useModularParser = false;
        }
    }
    
    /**
     * 状態管理からUIを更新
     */
    updateUIFromState() {
        if (!this.stateManager) return;
        
        const state = this.stateManager.state;
        
        // アクターの更新
        this.selectedActors = new Set(state.selectedActors);
        this.updateSelectedActorsDisplay();
        
        // アクションの更新
        this.actions = state.actions;
        this.updateActionList();
        
        // コードの更新（必要な場合）
        if (state.code !== this.getCodeEditorValue()) {
            this.isUpdatingCode = true;
            document.getElementById('plantuml-code').value = state.code;
            this.isUpdatingCode = false;
        }
    }
    
    /**
     * Phase 3システムの初期化
     */
    async initializePhase3() {
        console.log('[PlantUMLEditor] Phase 3システムを初期化中...');
        
        try {
            // モジュールの読み込み
            loadPhase3Modules();
            
            // Phase 3コンポーネントの初期化
            if (RealtimeSyncManager && DiffCalculator && CursorStateManager) {
                this.diffCalculator = new DiffCalculator();
                this.cursorStateManager = new CursorStateManager();
                this.realtimeSyncManager = new RealtimeSyncManager(this);
                
                this.phase3Enabled = true;
                console.log('[PlantUMLEditor] Phase 3システムが正常に初期化されました');
                
                // 旧システムの無効化
                if (this.syncManager) {
                    console.log('[PlantUMLEditor] 旧同期システムを無効化します');
                    this.syncManager = null;
                }
                
                // Phase 3専用のUIコンポーネントを有効化
                this.enablePhase3UI();
                
            } else {
                throw new Error('Phase 3モジュールの読み込みに失敗');
            }
            
        } catch (error) {
            console.warn('[PlantUMLEditor] Phase 3初期化失敗、フォールバックモードで継続:', error);
            this.phase3Enabled = false;
            
            // 旧システムの初期化（互換性モード）
            this.initializeLegacySync();
        }
    }
    
    /**
     * 旧同期システムの初期化（フォールバック）
     */
    initializeLegacySync() {
        try {
            if (typeof SafePlantUMLSync !== 'undefined') {
                this.syncManager = new SafePlantUMLSync(this);
                console.log('[PlantUMLEditor] レガシー同期システムで初期化しました');
            }
        } catch (error) {
            console.error('[PlantUMLEditor] レガシー同期システムの初期化に失敗:', error);
        }
    }
    
    /**
     * Phase 3専用UIの有効化
     */
    enablePhase3UI() {
        // Phase 3設定モーダルを作成（非表示状態）
        this.createPhase3SettingsModal();
        
        // 設定ボタンにイベントリスナーを追加
        this.attachSettingsButtonListener();
    }
    
    /**
     * Phase 3設定モーダルの作成
     */
    createPhase3SettingsModal() {
        const existingModal = document.getElementById('phase3-settings-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'phase3-settings-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>⚙️ 詳細設定</h2>
                    <button class="modal-close" onclick="document.getElementById('phase3-settings-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-tabs">
                        <button class="tab-btn active" data-tab="sync">同期状態</button>
                        <button class="tab-btn" data-tab="control">Phase 3制御</button>
                        <button class="tab-btn" data-tab="performance">パフォーマンス</button>
                    </div>
                    <div class="tab-content" id="sync-tab" style="display: block;">
                        ${this.createSyncStatusContent()}
                    </div>
                    <div class="tab-content" id="control-tab" style="display: none;">
                        ${this.createPhase3ControlsContent()}
                    </div>
                    <div class="tab-content" id="performance-tab" style="display: none;">
                        ${this.createPerformanceContent()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // タブ切り替えイベント
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                
                e.target.classList.add('active');
                const tabId = e.target.dataset.tab + '-tab';
                document.getElementById(tabId).style.display = 'block';
            });
        });
        
        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // イベントハンドラーの設定
        this.setupModalEventHandlers();
    }
    
    /**
     * 設定ボタンにイベントリスナーを追加
     */
    attachSettingsButtonListener() {
        const settingsBtn = document.querySelector('.btn-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const modal = document.getElementById('phase3-settings-modal');
                if (modal) {
                    modal.style.display = 'flex';
                    this.updateSyncStatus();
                }
            });
        }
    }
    
    /**
     * 同期状態コンテンツの作成
     */
    createSyncStatusContent() {
        return `
            <div class="sync-status-content">
                <h3>🔄 同期状態 (Phase 3)</h3>
                <div class="status-info">
                    <div class="status-item">
                        <span class="label">状態:</span>
                        <span id="sync-status" class="value active">アクティブ</span>
                    </div>
                    <div class="status-item">
                        <span class="label">最終同期:</span>
                        <span id="last-sync-time" class="value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="label">エラー数:</span>
                        <span id="error-count" class="value">0</span>
                    </div>
                </div>
                <div class="sync-controls">
                    <button id="pause-sync-btn" class="control-btn">一時停止</button>
                    <button id="manual-sync-btn" class="control-btn">手動同期</button>
                    <button id="reset-sync-btn" class="control-btn">リセット</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Phase 3制御コンテンツの作成
     */
    createPhase3ControlsContent() {
        return `
            <div class="phase3-controls-content">
                <h3>⚡ Phase 3 制御</h3>
                <div class="control-group">
                    <label>同期方向:</label>
                    <select id="sync-direction">
                        <option value="both">双方向</option>
                        <option value="code-to-gui">コード → GUI</option>
                        <option value="gui-to-code">GUI → コード</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="smooth-cursor" checked>
                        スムーズカーソル移動
                    </label>
                </div>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="auto-format" checked>
                        自動フォーマット
                    </label>
                </div>
                <div class="control-group">
                    <label>デバウンス遅延:</label>
                    <input type="range" id="debounce-delay" min="100" max="1000" value="300" step="50">
                    <span id="debounce-value">300ms</span>
                </div>
            </div>
        `;
    }
    
    /**
     * パフォーマンスコンテンツの作成
     */
    createPerformanceContent() {
        return `
            <div class="performance-content">
                <h3>📊 パフォーマンス監視</h3>
                <div class="performance-metrics">
                    <div class="metric-item">
                        <span class="label">同期時間:</span>
                        <span id="sync-time" class="value">-</span>
                    </div>
                    <div class="metric-item">
                        <span class="label">メモリ使用量:</span>
                        <span id="memory-usage" class="value">-</span>
                    </div>
                    <div class="metric-item">
                        <span class="label">CPU使用率:</span>
                        <span id="cpu-usage" class="value">-</span>
                    </div>
                    <div class="metric-item">
                        <span class="label">FPS:</span>
                        <span id="fps" class="value">-</span>
                    </div>
                </div>
                <canvas id="performance-chart" width="400" height="200"></canvas>
            </div>
        `;
    }
    
    /**
     * モーダル内のイベントハンドラー設定
     */
    setupModalEventHandlers() {
        // 同期制御ボタン
        const pauseBtn = document.getElementById('pause-sync-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.toggleSyncPause());
        }
        
        const manualSyncBtn = document.getElementById('manual-sync-btn');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', () => this.manualSync());
        }
        
        const resetBtn = document.getElementById('reset-sync-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetPhase3System());
        }
        
        // Phase 3制御
        const syncDirection = document.getElementById('sync-direction');
        if (syncDirection) {
            syncDirection.addEventListener('change', (e) => {
                if (this.realtimeSyncManager) {
                    this.realtimeSyncManager.setSyncDirection(e.target.value);
                }
            });
        }
        
        const smoothCursor = document.getElementById('smooth-cursor');
        if (smoothCursor) {
            smoothCursor.addEventListener('change', (e) => {
                if (this.cursorStateManager) {
                    this.cursorStateManager.setSmoothScrolling(e.target.checked);
                }
            });
        }
        
        const autoFormat = document.getElementById('auto-format');
        if (autoFormat) {
            autoFormat.addEventListener('change', (e) => {
                if (this.realtimeSyncManager) {
                    this.realtimeSyncManager.setAutoFormat(e.target.checked);
                }
            });
        }
        
        const debounceDelay = document.getElementById('debounce-delay');
        const debounceValue = document.getElementById('debounce-value');
        if (debounceDelay && debounceValue) {
            debounceDelay.addEventListener('input', (e) => {
                const value = e.target.value;
                debounceValue.textContent = value + 'ms';
                if (this.realtimeSyncManager) {
                    this.realtimeSyncManager.setDebounceDelay(parseInt(value));
                }
            });
        }
    }
    
    // 削除済み: createSyncStatusPanel() - Phase3SettingsModalに統合
    
    // 削除済み: createPhase3Controls() - Phase3SettingsModalに統合
    
    // 削除済み: createPerformancePanel() - Phase3SettingsModalに統合
    
    // 削除済み: setupSyncStatusPanelEvents() - Phase3SettingsModalに統合
    
    // 削除済み: setupPhase3ControlEvents() - Phase3SettingsModalに統合
    
    /**
     * パフォーマンスパネルのイベント設定
     */
    // 削除済み: setupPerformancePanelEvents() - Phase3SettingsModalに統合
    
    /**
     * 同期状態の更新
     */
    updateSyncStatus(status) {
        const statusElement = document.getElementById('sync-status');
        const lastSyncElement = document.getElementById('last-sync-time');
        
        if (statusElement) {
            statusElement.textContent = status === 'active' ? 'アクティブ' : '一時停止';
            statusElement.className = 'status ' + status;
        }
        
        if (lastSyncElement && this.realtimeSyncManager) {
            const syncStatus = this.realtimeSyncManager.getSyncStatus();
            if (syncStatus.lastSyncTime) {
                const lastSync = new Date(syncStatus.lastSyncTime);
                lastSyncElement.textContent = lastSync.toLocaleTimeString();
            }
        }
    }
    
    /**
     * パフォーマンスメトリクスの更新
     */
    updatePerformanceMetrics() {
        if (!this.phase3Enabled) return;
        
        const avgSyncTime = document.getElementById('avg-sync-time');
        const cacheHitRate = document.getElementById('cache-hit-rate');
        const memoryUsage = document.getElementById('memory-usage');
        
        if (avgSyncTime && this.realtimeSyncManager) {
            // パフォーマンスメトリクスの取得（将来の実装）
            avgSyncTime.textContent = '< 10ms';
        }
        
        if (cacheHitRate && this.diffCalculator) {
            const stats = this.diffCalculator.getStats();
            cacheHitRate.textContent = stats.cacheHitRate || '0%';
        }
        
        if (memoryUsage && performance.memory) {
            const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            memoryUsage.textContent = usedMB + ' MB';
        }
    }
    
    /**
     * Phase 3システムのリセット
     */
    async resetPhase3System() {
        console.log('[PlantUMLEditor] Phase 3システムをリセット中...');
        
        try {
            // 既存システムのクリーンアップ
            if (this.realtimeSyncManager) {
                this.realtimeSyncManager.destroy();
                this.realtimeSyncManager = null;
            }
            
            if (this.diffCalculator) {
                this.diffCalculator.destroy();
                this.diffCalculator = null;
            }
            
            if (this.cursorStateManager) {
                this.cursorStateManager.destroy();
                this.cursorStateManager = null;
            }
            
            // UI要素の削除
            const panels = document.querySelectorAll('.phase3-panel');
            panels.forEach(panel => panel.remove());
            
            // 再初期化
            await this.initializePhase3();
            
            this.showStatus('Phase 3システムをリセットしました', 'success');
            
        } catch (error) {
            console.error('[PlantUMLEditor] Phase 3リセットエラー:', error);
            this.showStatus('Phase 3リセットに失敗しました', 'error');
        }
    }
    
    /**
     * Phase 3デバッグ情報の表示
     */
    showPhase3DebugInfo() {
        const debugInfo = {
            phase3Enabled: this.phase3Enabled,
            realtimeSyncManager: this.realtimeSyncManager ? this.realtimeSyncManager.getSyncStatus() : null,
            diffCalculator: this.diffCalculator ? this.diffCalculator.getStats() : null,
            cursorStateManager: this.cursorStateManager ? this.cursorStateManager.getStats() : null
        };
        
        console.group('[Phase 3 Debug Info]');
        console.log('Phase 3有効:', debugInfo.phase3Enabled);
        console.log('同期マネージャー:', debugInfo.realtimeSyncManager);
        console.log('差分計算エンジン:', debugInfo.diffCalculator);
        console.log('カーソル管理:', debugInfo.cursorStateManager);
        console.groupEnd();
        
        // デバッグ情報をモーダルで表示
        this.showDebugModal(debugInfo);
    }
    
    /**
     * デバッグモーダルの表示
     */
    showDebugModal(debugInfo) {
        const modal = document.createElement('div');
        modal.className = 'debug-modal-overlay';
        modal.innerHTML = `
            <div class="debug-modal">
                <div class="modal-header">
                    <h3>🐛 Phase 3 デバッグ情報</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-content">
                    <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
                <div class="modal-footer">
                    <button class="copy-debug-btn">コピー</button>
                    <button class="close-debug-btn">閉じる</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // イベントリスナー
        const closeModal = () => modal.remove();
        modal.querySelector('.close-btn').addEventListener('click', closeModal);
        modal.querySelector('.close-debug-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        modal.querySelector('.copy-debug-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
            this.showStatus('デバッグ情報をコピーしました', 'success');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z: 最後の処理を削除（Undo）
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                if (this.actions.length > 0) {
                    e.preventDefault();
                    this.removeAction(this.actions.length - 1);
                    this.showStatus('最後の処理を削除しました', 'info');
                }
            }
            
            // Ctrl+Shift+Z: アクターをクリア
            if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
                if (this.selectedActors.size > 0) {
                    e.preventDefault();
                    if (confirm('すべてのアクターと処理をクリアしますか？')) {
                        this.clearAll();
                    }
                }
            }
            
            // Ctrl+C: コードをコピー
            if (e.ctrlKey && e.key === 'c' && !e.shiftKey) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.copyCode();
                }
            }
            
            // Ctrl+D: 最後の処理を複製
            if (e.ctrlKey && e.key === 'd' && !e.shiftKey) {
                if (this.actions.length > 0) {
                    e.preventDefault();
                    const lastAction = this.actions[this.actions.length - 1];
                    this.actions.push({ ...lastAction });
                    this.updateActionList();
                    this.updatePlantUML();
                    this.showStatus('処理を複製しました');
                }
            }
            
            // F2: フォーマット
            if (e.key === 'F2') {
                e.preventDefault();
                this.formatCode();
            }
            
            // F5: プレビュー更新
            if (e.key === 'F5') {
                e.preventDefault();
                const code = document.getElementById('plantuml-code').value;
                this.renderPreview(code);
                this.showStatus('プレビューを更新しました');
            }
        });
    }

    clearAll() {
        this.selectedActors.clear();
        this.actions = [];
        
        // ボタンの選択状態をすべて解除
        document.querySelectorAll('.actor-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        this.updateSelectedActorsDisplay();
        this.updateActorSelects();
        this.updateActionList();
        this.updatePlantUML();
        this.showStatus('すべてクリアしました');
    }

    setupPanelResize() {
        const mainContent = document.querySelector('.main-content');
        const handles = document.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            let isResizing = false;
            let startX = 0;
            let startWidths = [];
            let moveHandler = null;
            let upHandler = null;
            
            handle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                
                // 現在のグリッド列の幅を取得
                const computedStyle = window.getComputedStyle(mainContent);
                const columns = computedStyle.gridTemplateColumns.split(' ');
                startWidths = columns.map(col => {
                    const match = col.match(/(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                });
                
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none'; // テキスト選択を防ぐ
                e.preventDefault();
                
                // イベントハンドラを定義
                moveHandler = (e) => {
                    if (!isResizing) return;
                    
                    const deltaX = e.clientX - startX;
                    const handleIndex = handle.classList.contains('resize-handle-1') ? 1 : 3;
                    
                    // 新しい幅を計算
                    let newWidths = [...startWidths];
                    
                    if (handleIndex === 1) {
                        // 左パネルのリサイズ（最小200px、最大600px）
                        const newLeftWidth = Math.max(200, Math.min(600, startWidths[0] + deltaX));
                        const diff = newLeftWidth - startWidths[0];
                        newWidths[0] = newLeftWidth;
                        newWidths[2] = Math.max(300, startWidths[2] - diff); // 中央パネルの最小幅も確保
                    } else {
                        // 中央パネルのリサイズ（最小300px、右パネル最小250px確保）
                        const maxCenterWidth = startWidths[2] + startWidths[4] - 250; // 右パネル最小250px
                        const newCenterWidth = Math.max(300, Math.min(maxCenterWidth, startWidths[2] + deltaX));
                        const diff = newCenterWidth - startWidths[2];
                        newWidths[2] = newCenterWidth;
                        newWidths[4] = Math.max(250, startWidths[4] - diff); // 右パネル最小250px
                    }
                    
                    // グリッド列の幅を更新
                    mainContent.style.gridTemplateColumns = 
                        `${newWidths[0]}px 5px ${newWidths[2]}px 5px ${newWidths[4]}px`;
                    
                    e.preventDefault();
                };
                
                upHandler = () => {
                    if (isResizing) {
                        isResizing = false;
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        
                        // イベントリスナーを削除
                        document.removeEventListener('mousemove', moveHandler);
                        document.removeEventListener('mouseup', upHandler);
                    }
                };
                
                // イベントリスナーを追加
                document.addEventListener('mousemove', moveHandler);
                document.addEventListener('mouseup', upHandler);
            });
        });
    }

    setupEventListeners() {
        // モードタブ切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // アクター選択
        document.querySelectorAll('.actor-btn:not(.add-custom)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleActor(btn.dataset.actor, btn);
            });
        });

        // 新しい追加・削除ボタンのイベントリスナー
        const addActorBtn = document.getElementById('btn-add-actor');
        if (addActorBtn) {
            addActorBtn.addEventListener('click', () => {
                this.showCustomActorModal();
            });
        }

        const deleteActorBtn = document.getElementById('btn-delete-actor');
        if (deleteActorBtn) {
            deleteActorBtn.addEventListener('click', () => {
                this.showDeleteActorModal();
            });
        }

        // 処理タイプタブの切り替え
        document.querySelectorAll('.action-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchActionType(e.target.closest('.action-type-btn').dataset.type);
            });
        });

        // 処理追加ボタン
        document.querySelector('.btn-add-action').addEventListener('click', () => {
            this.addAction();
        });

        // Enterキーで処理追加
        document.getElementById('action-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addAction();
            }
        });

        // 条件分岐の設定
        this.setupConditionBuilder();
        
        // ループの設定
        this.setupLoopBuilder();
        
        // 並行処理の設定
        this.setupParallelBuilder();

        // パターンフィルター
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterPatterns(e.target.dataset.category);
            });
        });

        // パターン使用ボタン
        document.querySelectorAll('.btn-use-pattern').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.pattern-card');
                this.usePattern(card.dataset.patternId);
            });
        });

        // 新規パターン作成
        document.querySelector('.btn-create-pattern').addEventListener('click', () => {
            this.createNewPattern();
        });

        // コードエディタの変更監視
        // 【重要】フリーズ問題のため一時的に無効化 - 2025-08-13
        const codeEditor = document.getElementById('plantuml-code');
        console.warn('[PlantUMLEditor] コードエディタのinputイベント監視を一時的に無効化（フリーズ問題対応）');
        
        /* フリーズ問題が解決するまでコメントアウト
        codeEditor.addEventListener('input', (e) => {
            this.onCodeChange(e.target.value);
            this.updateLineNumbers();
        });
        */

        // Tabキーの処理（タブ文字の挿入）
        codeEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeEditor.selectionStart;
                const end = codeEditor.selectionEnd;
                const value = codeEditor.value;
                
                // タブ文字を挿入
                codeEditor.value = value.substring(0, start) + '  ' + value.substring(end);
                
                // カーソル位置を調整
                codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
            }
            
            // Ctrl+Space でコードヒント（簡易版）
            if (e.ctrlKey && e.key === ' ') {
                e.preventDefault();
                this.showCodeHints();
            }
        });

        // コードアクション
        document.querySelector('.btn-copy').addEventListener('click', () => {
            this.copyCode();
        });

        document.querySelector('.btn-format').addEventListener('click', () => {
            this.formatCode();
        });

        document.querySelector('.btn-validate').addEventListener('click', () => {
            this.validateCode();
        });

        // 同期ボタン
        document.querySelector('.btn-sync').addEventListener('click', () => {
            const code = document.getElementById('plantuml-code').value;
            this.parseAndUpdateFromCode(code);
        });

        // ズーム制御
        document.querySelector('.btn-zoom-in').addEventListener('click', () => {
            this.zoom(10);
        });

        document.querySelector('.btn-zoom-out').addEventListener('click', () => {
            this.zoom(-10);
        });

        // ダウンロードボタン
        document.querySelector('.btn-download').addEventListener('click', () => {
            this.downloadDiagram();
        });

        // プリセットボタン
        document.querySelector('.btn-preset').addEventListener('click', () => {
            this.showPresets();
        });

        // ヘルプボタン
        document.querySelector('.btn-help').addEventListener('click', () => {
            this.showHelp();
        });

        // クリアボタン
        document.querySelector('.btn-clear').addEventListener('click', () => {
            if (this.selectedActors.size > 0 || this.actions.length > 0) {
                if (confirm('すべてのデータをクリアしますか？\nこの操作は取り消せません。')) {
                    this.clearAll();
                }
            } else {
                this.showStatus('クリアする内容がありません', 'info');
            }
        });

        // draw.io エクスポートボタン
        document.querySelector('.btn-export-drawio').addEventListener('click', () => {
            this.exportToDrawIO();
        });

        // draw.io ダウンロードボタン
        document.querySelector('.btn-download-drawio').addEventListener('click', () => {
            this.downloadDrawIO();
        });
    }

    switchMode(mode) {
        // タブの切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // コンテンツの切り替え
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.remove('active');
        });

        if (mode === 'actor-action') {
            document.getElementById('actor-action-mode').classList.add('active');
        } else {
            document.getElementById('pattern-mode').classList.add('active');
        }

        this.currentMode = mode;
    }

    toggleActor(actorName, btnElement) {
        if (this.selectedActors.has(actorName)) {
            this.selectedActors.delete(actorName);
            btnElement.classList.remove('selected');
        } else {
            this.selectedActors.add(actorName);
            btnElement.classList.add('selected');
        }

        this.updateSelectedActorsDisplay();
        this.updateActorSelects();
        this.updatePlantUML();
    }

    updateSelectedActorsDisplay() {
        // 選択中のアクター表示エリアを削除したので、コードパネルの更新のみ行う
        const codePanelActors = document.getElementById('code-panel-actors');
        if (!codePanelActors) return; // コードパネルがない場合はスキップ
        
        if (this.selectedActors.size === 0) {
            codePanelActors.textContent = '未選択';
            codePanelActors.style.color = '#999';
            return;
        }

        // コードパネルのアクター表示を更新
        const actorNames = Array.from(this.selectedActors);
        codePanelActors.textContent = actorNames.join(', ');
        codePanelActors.style.color = '#2196F3';
        codePanelActors.title = actorNames.join(', '); // ツールチップで全体を表示
    }

    updateActorSelects() {
        const fromSelect = document.getElementById('from-actor');
        const toSelect = document.getElementById('to-actor');

        // 現在の選択を保存
        const currentFrom = fromSelect.value;
        const currentTo = toSelect.value;

        // 選択肢をクリアして再構築
        [fromSelect, toSelect].forEach(select => {
            // 既存のオプションを取得
            const existingOptions = Array.from(select.options).slice(1); // 最初の"選択してください"を除く
            const existingActors = new Set(existingOptions.map(opt => opt.value));
            
            // 新しく追加されたアクターだけを追加
            this.selectedActors.forEach(actor => {
                if (!existingActors.has(actor)) {
                    const option = document.createElement('option');
                    option.value = actor;
                    option.textContent = actor;
                    select.appendChild(option);
                }
            });
            
            // 削除されたアクターのオプションを削除
            existingOptions.forEach(option => {
                if (!this.selectedActors.has(option.value)) {
                    option.remove();
                }
            });
        });

        // 以前の選択を復元
        if (this.selectedActors.has(currentFrom)) {
            fromSelect.value = currentFrom;
        }
        if (this.selectedActors.has(currentTo)) {
            toSelect.value = currentTo;
        }
    }

    addAction() {
        const fromActor = document.getElementById('from-actor').value;
        const toActor = document.getElementById('to-actor').value;
        const actionText = document.getElementById('action-text').value.trim();
        const isUncertain = document.getElementById('is-uncertain').checked;
        const isAsync = document.getElementById('is-async').checked;

        if (!fromActor || !toActor || !actionText) {
            this.showStatus('⚠️ すべての項目を入力してください', 'error');
            return;
        }

        const action = {
            from: fromActor,
            to: toActor,
            text: actionText,
            uncertain: isUncertain,
            async: isAsync
        };

        this.actions.push(action);
        this.updateActionList();
        this.updatePlantUML();

        // フォームをクリア
        document.getElementById('action-text').value = '';
        document.getElementById('is-uncertain').checked = false;
        document.getElementById('is-async').checked = false;
        
        // フォーカスを戻す
        document.getElementById('action-text').focus();
        
        this.showStatus('✅ 処理を追加しました');
    }

    updateActionList() {
        const container = document.querySelector('.action-items');
        container.innerHTML = '';

        if (this.actions.length === 0) {
            container.innerHTML = '<span style="color: #999; font-size: 12px;">処理がまだ追加されていません</span>';
            return;
        }

        this.actions.forEach((action, index) => {
            const item = document.createElement('div');
            item.className = 'action-item';
            item.draggable = true;
            item.dataset.index = index;
            
            let displayText = '';
            
            if (action.type === 'condition') {
                // 条件分岐の表示
                displayText = `🔀 条件分岐: ${action.conditionName} (${action.conditionType === 'alt' ? 'if-else' : 'if'})`;
            } else if (action.type === 'loop') {
                // ループの表示
                displayText = `🔁 ループ: ${action.loopCondition}`;
            } else if (action.type === 'parallel') {
                // 並行処理の表示
                displayText = `⚡ 並行処理: ${action.branches.length}ブランチ`;
            } else {
                // 通常のメッセージ
                let arrow = action.async ? '-->' : '->';
                let text = action.text + (action.uncertain ? '？' : '');
                displayText = `${action.from} ${arrow} ${action.to}: ${text}`;
            }
            
            item.innerHTML = `
                <span class="drag-handle" title="ドラッグして順序を変更">☰</span>
                <span class="action-item-text" style="cursor: pointer;" title="クリックして編集" data-index="${index}">
                    ${index + 1}. ${displayText}
                </span>
                <span class="action-item-delete" data-index="${index}">×</span>
            `;

            // ドラッグイベントの設定
            this.setupDragEvents(item);

            // 編集イベント（全てのタイプに対応）
            item.querySelector('.action-item-text').addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const action = this.actions[index];
                
                switch(action.type) {
                    case 'condition':
                        this.editCondition(index);
                        break;
                    case 'loop':
                        this.editLoop(index);
                        break;
                    case 'parallel':
                        this.editParallel(index);
                        break;
                    default:
                        this.editAction(index);
                        break;
                }
            });

            item.querySelector('.action-item-delete').addEventListener('click', (e) => {
                this.removeAction(parseInt(e.target.dataset.index));
            });

            container.appendChild(item);
        });
    }

    setupDragEvents(item) {
        // タッチデバイス対応
        let touchItem = null;
        let touchOffset = { x: 0, y: 0 };
        
        // タッチ開始
        item.addEventListener('touchstart', (e) => {
            touchItem = item;
            const touch = e.touches[0];
            const rect = item.getBoundingClientRect();
            touchOffset.x = touch.clientX - rect.left;
            touchOffset.y = touch.clientY - rect.top;
            
            item.style.opacity = '0.8';
            item.style.zIndex = '1000';
            this.draggedIndex = parseInt(item.dataset.index);
        }, { passive: true });
        
        // タッチ移動
        item.addEventListener('touchmove', (e) => {
            if (!touchItem) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (elementBelow && elementBelow.classList.contains('action-item')) {
                const rect = elementBelow.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // 既存のハイライトをクリア
                document.querySelectorAll('.action-item').forEach(el => {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                
                if (touch.clientY < midpoint) {
                    elementBelow.classList.add('drag-over-top');
                } else {
                    elementBelow.classList.add('drag-over-bottom');
                }
            }
        });
        
        // タッチ終了
        item.addEventListener('touchend', (e) => {
            if (!touchItem) return;
            
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (elementBelow && elementBelow.classList.contains('action-item')) {
                const dropIndex = parseInt(elementBelow.dataset.index);
                const rect = elementBelow.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                let targetIndex = dropIndex;
                if (touch.clientY > midpoint && this.draggedIndex < dropIndex) {
                    targetIndex = dropIndex;
                } else if (touch.clientY <= midpoint && this.draggedIndex > dropIndex) {
                    targetIndex = dropIndex;
                } else if (touch.clientY > midpoint) {
                    targetIndex = dropIndex + 1;
                }
                
                if (this.draggedIndex !== undefined && this.draggedIndex !== dropIndex) {
                    this.reorderActions(this.draggedIndex, targetIndex);
                }
            }
            
            // リセット
            item.style.opacity = '';
            item.style.zIndex = '';
            document.querySelectorAll('.action-item').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            touchItem = null;
            this.draggedIndex = undefined;
        });
        
        // ドラッグ開始（デスクトップ）
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.innerHTML);
            this.draggedIndex = parseInt(item.dataset.index);
            item.classList.add('dragging');
            
            // ドラッグ中の見た目を設定
            setTimeout(() => {
                item.style.opacity = '0.4';
            }, 0);
        });

        // ドラッグ終了
        item.addEventListener('dragend', (e) => {
            item.style.opacity = '';
            item.classList.remove('dragging');
            
            // すべてのドロップターゲットのハイライトを削除
            document.querySelectorAll('.action-item').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });

        // ドラッグオーバー
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            // マウス位置に応じて上下のインジケーターを表示
            if (e.clientY < midpoint) {
                item.classList.add('drag-over-top');
                item.classList.remove('drag-over-bottom');
            } else {
                item.classList.add('drag-over-bottom');
                item.classList.remove('drag-over-top');
            }
        });

        // ドラッグがアイテムから離れた時
        item.addEventListener('dragleave', (e) => {
            if (e.target === item) {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });

        // ドロップ処理
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dropIndex = parseInt(item.dataset.index);
            
            if (this.draggedIndex !== undefined && this.draggedIndex !== dropIndex) {
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // マウス位置に応じて挿入位置を決定
                let targetIndex = dropIndex;
                if (e.clientY > midpoint && this.draggedIndex < dropIndex) {
                    targetIndex = dropIndex;
                } else if (e.clientY <= midpoint && this.draggedIndex > dropIndex) {
                    targetIndex = dropIndex;
                } else if (e.clientY > midpoint) {
                    targetIndex = dropIndex + 1;
                }
                
                // アクションの順序を入れ替え
                this.reorderActions(this.draggedIndex, targetIndex);
            }
            
            item.classList.remove('drag-over-top', 'drag-over-bottom');
            this.draggedIndex = undefined;
        });
    }

    reorderActions(fromIndex, toIndex) {
        // 配列から要素を取り出す
        const [movedAction] = this.actions.splice(fromIndex, 1);
        
        // 新しい位置に挿入
        if (fromIndex < toIndex) {
            // 元の位置が前の場合、削除で1つずれるので調整
            this.actions.splice(toIndex - 1, 0, movedAction);
        } else {
            this.actions.splice(toIndex, 0, movedAction);
        }
        
        // UIを更新
        this.updateActionList();
        this.updatePlantUML();
        this.showStatus('処理の順序を変更しました');
    }

    removeAction(index) {
        this.actions.splice(index, 1);
        this.updateActionList();
        this.updatePlantUML();
        this.showStatus('処理を削除しました');
    }

    editAction(index) {
        const action = this.actions[index];
        const item = document.querySelectorAll('.action-item')[index];
        
        // 既に編集中の場合は何もしない
        if (item.nextSibling && item.nextSibling.className === 'action-edit-form') {
            return;
        }
        
        // 編集用のインラインフォームを作成
        const editForm = document.createElement('div');
        editForm.className = 'action-edit-form';
        editForm.innerHTML = `
            <div class="edit-form-row">
                <select class="edit-from">
                    ${Array.from(this.selectedActors).map(actor => 
                        `<option value="${actor}" ${actor === action.from ? 'selected' : ''}>${actor}</option>`
                    ).join('')}
                </select>
                <span class="arrow">→</span>
                <select class="edit-to">
                    ${Array.from(this.selectedActors).map(actor => 
                        `<option value="${actor}" ${actor === action.to ? 'selected' : ''}>${actor}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="edit-form-row">
                <input type="text" class="edit-text" value="${action.text}" placeholder="処理内容">
            </div>
            <div class="edit-form-row">
                <label style="font-size: 11px; margin-right: 10px;">
                    <input type="checkbox" class="edit-uncertain" ${action.uncertain ? 'checked' : ''}>
                    <span>？</span>
                </label>
                <label style="font-size: 11px; margin-right: 10px;">
                    <input type="checkbox" class="edit-async" ${action.async ? 'checked' : ''}>
                    <span>--></span>
                </label>
                <button class="btn-save-edit">✓ 保存</button>
                <button class="btn-cancel-edit">✗ キャンセル</button>
            </div>
        `;
        
        // 現在の表示を編集フォームに置き換え
        item.style.display = 'none';
        item.parentNode.insertBefore(editForm, item.nextSibling);
        
        // フォーカスを設定
        editForm.querySelector('.edit-text').focus();
        editForm.querySelector('.edit-text').select();
        
        // 保存ボタンのイベント
        editForm.querySelector('.btn-save-edit').onclick = () => {
            this.actions[index] = {
                from: editForm.querySelector('.edit-from').value,
                to: editForm.querySelector('.edit-to').value,
                text: editForm.querySelector('.edit-text').value,
                uncertain: editForm.querySelector('.edit-uncertain').checked,
                async: editForm.querySelector('.edit-async').checked
            };
            this.updateActionList();
            this.updatePlantUML();
            this.showStatus('処理を更新しました');
        };
        
        // キャンセルボタンのイベント
        editForm.querySelector('.btn-cancel-edit').onclick = () => {
            editForm.remove();
            item.style.display = 'flex';
        };
        
        // Enterキーで保存、Escでキャンセル
        editForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'INPUT') {
                editForm.querySelector('.btn-save-edit').click();
            } else if (e.key === 'Escape') {
                editForm.querySelector('.btn-cancel-edit').click();
            }
        });
    }

    removeActor(actorName) {
        this.selectedActors.delete(actorName);
        
        // ボタンの選択状態を解除
        document.querySelectorAll('.actor-btn').forEach(btn => {
            if (btn.dataset.actor === actorName) {
                btn.classList.remove('selected');
            }
        });

        // このアクターを含むアクションを削除
        const beforeCount = this.actions.length;
        this.actions = this.actions.filter(action => 
            action.from !== actorName && action.to !== actorName
        );
        
        if (this.actions.length < beforeCount) {
            this.showStatus(`${actorName}を含む処理も削除されました`, 'warning');
        }

        this.updateSelectedActorsDisplay();
        this.updateActorSelects();
        this.updateActionList();
        this.updatePlantUML();
    }

    getCurrentActors() {
        return Array.from(this.selectedActors).sort();
    }

    updatePlantUML() {
        // 自動更新フラグを設定
        this.isUpdatingCode = true;
        
        let code = '@startuml\n';

        // タイトル（オプション）
        if (this.actions.length > 0) {
            code += 'title 業務フロー図\n\n';
        }

        // アクター定義
        if (this.selectedActors.size > 0) {
            this.selectedActors.forEach(actor => {
                // アクタータイプを判定
                // システム、サイト、サーバー、API、サービス = participant（管理者は除外）
                if ((actor.includes('システム') || actor.includes('サイト') || 
                     actor.includes('サーバー') || actor.includes('API') || 
                     actor.includes('サービス')) && !actor.includes('管理者')) {
                    code += `participant "${actor}"\n`;
                } 
                // DB、データベース、ストレージ = database
                else if (actor.includes('DB') || actor.includes('データベース') || 
                         actor.includes('ストレージ')) {
                    code += `database "${actor}"\n`;
                } 
                // 人物系（顧客、ユーザー、管理者、オペレーター等） = actor
                else {
                    code += `actor "${actor}"\n`;
                }
            });
            code += '\n';
        }

        // アクション定義（条件分岐、ループ、並行処理対応）
        this.actions.forEach(action => {
            if (action.type === 'condition') {
                // 条件分岐
                code += this.generateConditionCode(action);
            } else if (action.type === 'loop') {
                // ループ
                code += this.generateLoopCode(action);
            } else if (action.type === 'parallel') {
                // 並行処理
                code += this.generateParallelCode(action);
            } else {
                // 通常のメッセージ
                let arrow = action.async ? '-->' : '->';
                let text = action.text + (action.uncertain ? '？' : '');
                code += `"${action.from}" ${arrow} "${action.to}": ${text}\n`;
            }
        });

        code += '\n@enduml';

        document.getElementById('plantuml-code').value = code;
        this.renderPreview(code);
        this.updateStatus();
        
        // フラグを解除
        this.isUpdatingCode = false;
    }

    generateConditionCode(action, indent = '') {
        let code = '';
        if (action.conditionType === 'opt') {
            // オプション（if文のみ）
            code += `${indent}opt ${action.conditionName}\n`;
            const trueBranch = action.trueBranch || [];
            trueBranch.forEach(subAction => {
                if (subAction.type === 'condition') {
                    // ネストされた条件分岐
                    code += this.generateConditionCode(subAction, indent + '  ');
                } else if (subAction.type === 'loop') {
                    // ネストされたループ
                    code += this.generateLoopCode(subAction).split('\n').map(line => indent + '  ' + line).join('\n') + '\n';
                } else {
                    code += `${indent}  "${subAction.from}" -> "${subAction.to}": ${subAction.text}\n`;
                }
            });
            code += `${indent}end\n`;
        } else {
            // 分岐（if-else文）
            code += `${indent}alt ${action.conditionName}\n`;
            const trueBranch = action.trueBranch || [];
            trueBranch.forEach(subAction => {
                if (subAction.type === 'condition') {
                    // ネストされた条件分岐
                    code += this.generateConditionCode(subAction, indent + '  ');
                } else if (subAction.type === 'loop') {
                    // ネストされたループ
                    code += this.generateLoopCode(subAction).split('\n').map(line => indent + '  ' + line).join('\n') + '\n';
                } else {
                    code += `${indent}  "${subAction.from}" -> "${subAction.to}": ${subAction.text}\n`;
                }
            });
            const falseBranch = action.falseBranch || [];
            if (falseBranch.length > 0) {
                code += `${indent}else\n`;
                falseBranch.forEach(subAction => {
                    if (subAction.type === 'condition') {
                        // ネストされた条件分岐
                        code += this.generateConditionCode(subAction, indent + '  ');
                    } else if (subAction.type === 'loop') {
                        // ネストされたループ
                        code += this.generateLoopCode(subAction).split('\n').map(line => indent + '  ' + line).join('\n') + '\n';
                    } else {
                        code += `${indent}  "${subAction.from}" -> "${subAction.to}": ${subAction.text}\n`;
                    }
                });
            }
            code += `${indent}end\n`;
        }
        return code;
    }

    generateLoopCode(action) {
        let code = `loop ${action.loopCondition}\n`;
        // action.actions (パターンから) または action.loopActions (手動作成) の両方に対応
        const loopActions = action.actions || action.loopActions || [];
        loopActions.forEach(subAction => {
            // 条件分岐がループ内にある場合の処理
            if (subAction.type === 'condition') {
                code += this.generateConditionCode(subAction).split('\n').map(line => '  ' + line).join('\n');
            } else {
                code += `  "${subAction.from}" -> "${subAction.to}": ${subAction.text}\n`;
            }
        });
        code += 'end\n';
        return code;
    }

    generateParallelCode(action) {
        let code = 'par\n';
        action.branches.forEach((branch, index) => {
            // Kroki APIの仕様に合わせて、andの代わりにelseを使用
            if (index > 0) code += 'else\n';
            branch.forEach(subAction => {
                code += `  "${subAction.from}" -> "${subAction.to}": ${subAction.text}\n`;
            });
        });
        code += 'end\n';
        return code;
    }

    sanitizeId(text) {
        // PlantUMLは日本語をそのまま使えるため、ダブルクォートで囲むだけでOK
        // 特殊文字がある場合のみエスケープ
        return `"${text.replace(/"/g, '\\"')}"`;
    }

    renderPreview(code) {
        // デバッグ用ログ
        console.log('=== PlantUML Code ===');
        console.log(code);
        console.log('=== End Code ===');
        
        // プレビューコンテナ
        const previewContainer = document.getElementById('preview-svg');
        
        // 空のコードまたは基本的なコードの場合は何も表示しない
        const trimmedCode = code.trim();
        const normalizedCode = trimmedCode.replace(/\s+/g, '');
        if (normalizedCode === '@startuml@enduml' || 
            normalizedCode === '' ||
            trimmedCode === '') {
            previewContainer.innerHTML = `
                <div class="preview-placeholder" style="text-align: center; padding: 50px; color: #999;">
                    <p style="font-size: 18px;">📝 プレビューエリア</p>
                    <p style="font-size: 14px;">左側でアクターと処理を追加すると、ここにシーケンス図が表示されます</p>
                </div>
            `;
            return;
        }
        
        // ローディング表示
        previewContainer.innerHTML = '<p style="text-align: center; padding: 20px;">レンダリング中...</p>';
        
        // まずPOSTメソッドでプレーンテキストを送信
        fetch('https://kroki.io/plantuml/svg', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: code
        })
        .then(response => {
            console.log('POST Response status:', response.status);
            if (!response.ok) {
                // POSTが失敗したらGETメソッドにフォールバック
                console.log('POST failed, trying GET method...');
                const compressed = this.compressPlantUML(code);
                const url = `https://kroki.io/plantuml/svg/${compressed}`;
                return fetch(url);
            }
            return response;
        })
        .then(response => {
            console.log('Final response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(svg => {
            console.log('SVG received, length:', svg.length);
            // エラーメッセージの場合の処理
            if (svg.includes('Error') && svg.length < 500) {
                console.error('Kroki error:', svg);
                previewContainer.innerHTML = `
                    <div class="preview-placeholder">
                        <p style="color: #f44336;">レンダリングエラー</p>
                        <p style="font-size: 12px; color: #666;">${svg}</p>
                    </div>
                `;
                return;
            }
            previewContainer.innerHTML = svg;
            // ズームを適用
            const svgElement = previewContainer.querySelector('svg');
            if (svgElement) {
                svgElement.style.width = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.maxWidth = 'none';
                svgElement.style.transform = `scale(${this.currentZoom / 100})`;
                svgElement.style.transformOrigin = 'top left';
            }
        })
        .catch(error => {
            console.error('レンダリングエラー:', error);
            previewContainer.innerHTML = `
                <div class="preview-placeholder">
                    <p style="color: #f44336;">レンダリングエラーが発生しました</p>
                    <p style="font-size: 12px; color: #666;">ネットワーク接続を確認してください</p>
                    <p style="font-size: 11px; color: #999;">${error.message}</p>
                </div>
            `;
        });
    }

    compressPlantUML(text) {
        // plantuml-encoderライブラリを使用
        if (typeof plantumlEncoder !== 'undefined') {
            try {
                return plantumlEncoder.encode(text);
            } catch (e) {
                console.error('PlantUML encoder error:', e);
                // フォールバック
            }
        }
        
        // フォールバック: 独自実装
        function encode64(data) {
            let r = "";
            for (let i = 0; i < data.length; i += 3) {
                if (i + 2 == data.length) {
                    r += append3bytes(data[i], data[i + 1], 0);
                } else if (i + 1 == data.length) {
                    r += append3bytes(data[i], 0, 0);
                } else {
                    r += append3bytes(data[i], data[i + 1], data[i + 2]);
                }
            }
            return r;
        }

        function append3bytes(b1, b2, b3) {
            let c1 = b1 >> 2;
            let c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
            let c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
            let c4 = b3 & 0x3F;
            let r = "";
            r += encode6bit(c1 & 0x3F);
            r += encode6bit(c2 & 0x3F);
            r += encode6bit(c3 & 0x3F);
            r += encode6bit(c4 & 0x3F);
            return r;
        }

        function encode6bit(b) {
            if (b < 10) {
                return String.fromCharCode(48 + b);
            }
            b -= 10;
            if (b < 26) {
                return String.fromCharCode(65 + b);
            }
            b -= 26;
            if (b < 26) {
                return String.fromCharCode(97 + b);
            }
            b -= 26;
            if (b == 0) {
                return '-';
            }
            if (b == 1) {
                return '_';
            }
            return '?';
        }

        // UTF-8エンコード
        const utf8 = unescape(encodeURIComponent(text));
        const data = [];
        for (let i = 0; i < utf8.length; i++) {
            data.push(utf8.charCodeAt(i));
        }
        
        // Deflate圧縮
        const compressed = pako.deflate(data, { level: 9, windowBits: 15 });
        
        // PlantUML形式でエンコード
        return encode64(compressed);
    }

    updateStatus() {
        const statusText = document.querySelector('.status-text');
        const statusInfo = document.querySelector('.status-info');
        
        const now = new Date();
        const time = now.toLocaleTimeString('ja-JP');
        statusInfo.textContent = `アクター: ${this.selectedActors.size} | メッセージ: ${this.actions.length} | 更新: ${time}`;
    }

    showStatus(message, type = 'success') {
        const statusText = document.querySelector('.status-text');
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        statusText.textContent = `${icons[type] || icons.info} ${message}`;
        
        // 3秒後に元に戻す
        setTimeout(() => {
            if (statusText.textContent.includes(message)) {
                statusText.textContent = '✅ 準備完了';
            }
        }, 3000);
    }

    // 処理タイプの切り替え
    switchActionType(type) {
        this.currentActionType = type;
        
        // タブの状態更新
        document.querySelectorAll('.action-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        // ビルダーの表示切り替え
        document.getElementById('message-builder').classList.toggle('hidden', type !== 'message');
        document.getElementById('condition-builder').classList.toggle('hidden', type !== 'condition');
        document.getElementById('loop-builder').classList.toggle('hidden', type !== 'loop');
        document.getElementById('parallel-builder').classList.toggle('hidden', type !== 'parallel');
        
        // 条件分岐タイプ変更時の処理
        if (type === 'condition') {
            const conditionType = document.getElementById('condition-type');
            if (conditionType) {
                conditionType.addEventListener('change', (e) => {
                    document.getElementById('false-branch-section').style.display = 
                        e.target.value === 'alt' ? 'block' : 'none';
                });
            }
        }
    }

    // 条件分岐ビルダーのセットアップ
    setupConditionBuilder() {
        // 条件タイプの変更
        const conditionType = document.getElementById('condition-type');
        if (conditionType) {
            conditionType.addEventListener('change', (e) => {
                this.tempConditionData.type = e.target.value;
                document.getElementById('false-branch-section').style.display = 
                    e.target.value === 'alt' ? 'block' : 'none';
            });
        }

        // 条件名の変更
        const conditionName = document.getElementById('condition-name');
        if (conditionName) {
            conditionName.addEventListener('input', (e) => {
                this.tempConditionData.name = e.target.value;
            });
        }

        // ブランチへのアクション追加
        document.querySelectorAll('.btn-add-branch-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const branch = e.target.dataset.branch;
                this.showBranchActionDialog(branch);
            });
        });

        // 条件分岐の追加
        const btnAddCondition = document.querySelector('.btn-add-condition');
        if (btnAddCondition) {
            btnAddCondition.addEventListener('click', () => {
                this.addConditionToFlow();
            });
        }
    }

    // ループビルダーのセットアップ
    setupLoopBuilder() {
        // ループ条件の変更
        const loopCondition = document.getElementById('loop-condition');
        if (loopCondition) {
            loopCondition.addEventListener('input', (e) => {
                this.tempLoopData.condition = e.target.value;
            });
        }

        // ループアクションの追加
        const btnAddLoopAction = document.querySelector('.btn-add-loop-action');
        if (btnAddLoopAction) {
            btnAddLoopAction.addEventListener('click', () => {
                this.showLoopActionDialog();
            });
        }

        // ループの追加
        const btnAddLoop = document.querySelector('.btn-add-loop');
        if (btnAddLoop) {
            btnAddLoop.addEventListener('click', () => {
                this.addLoopToFlow();
            });
        }
    }

    // 並行処理ビルダーのセットアップ
    setupParallelBuilder() {
        // 並行処理ブランチの追加
        const btnAddParallelBranch = document.querySelector('.btn-add-parallel-branch');
        if (btnAddParallelBranch) {
            btnAddParallelBranch.addEventListener('click', () => {
                this.addParallelBranch();
            });
        }

        // 並行処理アクションの追加
        document.querySelectorAll('.btn-add-parallel-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const branchIndex = parseInt(e.target.dataset.branch) - 1;
                this.showParallelActionDialog(branchIndex);
            });
        });

        // 並行処理の追加
        const btnAddParallel = document.querySelector('.btn-add-parallel');
        if (btnAddParallel) {
            btnAddParallel.addEventListener('click', () => {
                this.addParallelToFlow();
            });
        }
    }

    // ブランチアクションダイアログの表示
    showBranchActionDialog(branch) {
        const branchLabel = branch === 'true' ? '真' : '偽';
        
        // ダイアログを作成
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 400px;
        `;

        // 現在のアクターリストを取得
        const currentActors = this.getCurrentActors();
        
        dialog.innerHTML = `
            <h4>${branchLabel}の場合のアクション追加</h4>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">送信元:</label>
                <select id="branch-from" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    ${currentActors.map(actor => `<option value="${actor}">${actor}</option>`).join('')}
                </select>
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">送信先:</label>
                <select id="branch-to" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    ${currentActors.map(actor => `<option value="${actor}">${actor}</option>`).join('')}
                </select>
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">処理内容:</label>
                <input type="text" id="branch-text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                       placeholder="例: 承認処理" autofocus>
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button id="branch-cancel-btn" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">キャンセル</button>
                <button id="branch-save-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">追加</button>
            </div>
        `;

        // ボタンにイベントリスナーを追加（正しいthisコンテキストを保持）
        const cancelBtn = dialog.querySelector('#branch-cancel-btn');
        const saveBtn = dialog.querySelector('#branch-save-btn');
        
        cancelBtn.addEventListener('click', () => this.cancelBranchDialog());
        saveBtn.addEventListener('click', () => this.saveBranchAction(branch));

        // 背景のオーバーレイ
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;
        overlay.onclick = () => this.cancelBranchDialog();

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        // テキスト入力にフォーカス
        setTimeout(() => {
            document.getElementById('branch-text').focus();
        }, 100);

        // Enterキーで保存
        document.getElementById('branch-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveBranchAction(branch);
            }
        });
    }

    // ブランチアクションの保存
    saveBranchAction(branch) {
        const fromActor = document.getElementById('branch-from').value;
        const toActor = document.getElementById('branch-to').value;
        const actionText = document.getElementById('branch-text').value.trim();

        if (!actionText) {
            this.showStatus('処理内容を入力してください', 'error');
            return;
        }

        const action = {
            from: fromActor,
            to: toActor,
            text: actionText
        };

        if (branch === 'true') {
            this.tempConditionData.trueBranch.push(action);
        } else {
            this.tempConditionData.falseBranch.push(action);
        }

        this.updateBranchDisplay(branch);
        
        // ダイアログを閉じる
        this.cancelBranchDialog();
        this.showStatus('アクションを追加しました');
    }

    // ブランチダイアログのキャンセル
    cancelBranchDialog() {
        const dialog = document.querySelector('.modal-dialog');
        const overlay = document.querySelector('.modal-overlay');
        if (dialog) dialog.remove();
        if (overlay) overlay.remove();
    }

    // ブランチ表示の更新
    updateBranchDisplay(branch) {
        const container = document.getElementById(`${branch}-branch`);
        const actions = branch === 'true' ? 
            this.tempConditionData.trueBranch : 
            this.tempConditionData.falseBranch;

        // 既存のアクション表示をクリア
        container.innerHTML = '';

        // アクションを表示
        actions.forEach((action, index) => {
            const item = document.createElement('div');
            item.className = 'branch-action-item';
            item.innerHTML = `
                ${action.from} → ${action.to}: ${action.text}
                <span style="cursor: pointer; color: #f44336;" 
                      onclick="app.removeBranchAction('${branch}', ${index})">×</span>
            `;
            container.appendChild(item);
        });

        // 追加ボタンを再度追加
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-branch-action';
        addBtn.dataset.branch = branch;
        addBtn.textContent = '➕ アクション追加';
        addBtn.addEventListener('click', () => {
            this.showBranchActionDialog(branch);
        });
        container.appendChild(addBtn);
    }

    // ブランチアクションの削除
    removeBranchAction(branch, index) {
        if (branch === 'true') {
            this.tempConditionData.trueBranch.splice(index, 1);
        } else {
            this.tempConditionData.falseBranch.splice(index, 1);
        }
        this.updateBranchDisplay(branch);
    }

    // 条件分岐をフローに追加
    addConditionToFlow() {
        if (!this.tempConditionData.name) {
            this.showStatus('条件名を入力してください', 'error');
            return;
        }

        if (this.tempConditionData.trueBranch.length === 0) {
            this.showStatus('真の場合のアクションを追加してください', 'error');
            return;
        }

        const conditionAction = {
            type: 'condition',
            conditionType: this.tempConditionData.type,
            conditionName: this.tempConditionData.name,
            trueBranch: [...this.tempConditionData.trueBranch],
            falseBranch: [...this.tempConditionData.falseBranch]
        };

        this.actions.push(conditionAction);
        this.updateActionList();
        this.updatePlantUML();

        // リセット
        this.tempConditionData = {
            type: 'alt',
            name: '',
            trueBranch: [],
            falseBranch: []
        };
        document.getElementById('condition-name').value = '';
        document.getElementById('true-branch').innerHTML = '<button class="btn-add-branch-action" data-branch="true">➕ アクション追加</button>';
        document.getElementById('false-branch').innerHTML = '<button class="btn-add-branch-action" data-branch="false">➕ アクション追加</button>';
        
        this.showStatus('条件分岐を追加しました');
    }

    // ループアクションダイアログの表示
    showLoopActionDialog() {
        // ダイアログを作成
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 400px;
        `;

        // 現在のアクターリストを取得
        const currentActors = this.getCurrentActors();
        
        dialog.innerHTML = `
            <h4>ループ内のアクション追加</h4>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">送信元:</label>
                <select id="loop-from" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    ${currentActors.map(actor => `<option value="${actor}">${actor}</option>`).join('')}
                </select>
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">送信先:</label>
                <select id="loop-to" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    ${currentActors.map(actor => `<option value="${actor}">${actor}</option>`).join('')}
                </select>
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">処理内容:</label>
                <input type="text" id="loop-text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                       placeholder="例: データ処理" autofocus>
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button id="loop-cancel-btn" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">キャンセル</button>
                <button id="loop-save-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">追加</button>
            </div>
        `;

        // ボタンにイベントリスナーを追加（正しいthisコンテキストを保持）
        const cancelBtn = dialog.querySelector('#loop-cancel-btn');
        const saveBtn = dialog.querySelector('#loop-save-btn');
        
        cancelBtn.addEventListener('click', () => this.cancelLoopDialog());
        saveBtn.addEventListener('click', () => this.saveLoopAction());

        // 背景のオーバーレイ
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;
        overlay.onclick = () => this.cancelLoopDialog();

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        // テキスト入力にフォーカス
        setTimeout(() => {
            document.getElementById('loop-text').focus();
        }, 100);

        // Enterキーで保存
        document.getElementById('loop-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveLoopAction();
            }
        });
    }

    // ループアクションの保存
    saveLoopAction() {
        const fromActor = document.getElementById('loop-from').value;
        const toActor = document.getElementById('loop-to').value;
        const actionText = document.getElementById('loop-text').value.trim();

        if (!actionText) {
            this.showStatus('処理内容を入力してください', 'error');
            return;
        }

        const action = {
            from: fromActor,
            to: toActor,
            text: actionText
        };

        this.tempLoopData.actions.push(action);
        this.updateLoopDisplay();
        
        // ダイアログを閉じる
        this.cancelLoopDialog();
        this.showStatus('アクションを追加しました');
    }

    // ループダイアログのキャンセル
    cancelLoopDialog() {
        const dialog = document.querySelector('.modal-dialog');
        const overlay = document.querySelector('.modal-overlay');
        if (dialog) dialog.remove();
        if (overlay) overlay.remove();
    }

    // ループ表示の更新
    updateLoopDisplay() {
        const container = document.getElementById('loop-actions');
        container.innerHTML = '';

        this.tempLoopData.actions.forEach((action, index) => {
            const item = document.createElement('div');
            item.className = 'loop-action-item';
            item.innerHTML = `
                ${action.from} → ${action.to}: ${action.text}
                <span style="cursor: pointer; color: #f44336;" 
                      onclick="app.removeLoopAction(${index})">×</span>
            `;
            container.appendChild(item);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-loop-action';
        addBtn.textContent = '➕ アクション追加';
        addBtn.addEventListener('click', () => {
            this.showLoopActionDialog();
        });
        container.appendChild(addBtn);
    }

    // ループアクションの削除
    removeLoopAction(index) {
        this.tempLoopData.actions.splice(index, 1);
        this.updateLoopDisplay();
    }

    // ループをフローに追加
    addLoopToFlow() {
        if (!this.tempLoopData.condition) {
            this.showStatus('ループ条件を入力してください', 'error');
            return;
        }

        if (this.tempLoopData.actions.length === 0) {
            this.showStatus('ループ内のアクションを追加してください', 'error');
            return;
        }

        const loopAction = {
            type: 'loop',
            loopCondition: this.tempLoopData.condition,
            loopActions: [...this.tempLoopData.actions]
        };

        this.actions.push(loopAction);
        this.updateActionList();
        this.updatePlantUML();

        // リセット
        this.tempLoopData = {
            condition: '',
            actions: []
        };
        document.getElementById('loop-condition').value = '';
        document.getElementById('loop-actions').innerHTML = '<button class="btn-add-loop-action">➕ アクション追加</button>';
        
        this.showStatus('ループを追加しました');
    }

    // 並行処理ブランチの追加
    addParallelBranch() {
        this.parallelBranchCount++;
        this.tempParallelData.branches.push([]);

        const container = document.querySelector('.parallel-branches');
        const newBranch = document.createElement('div');
        newBranch.className = 'parallel-branch';
        newBranch.dataset.branch = this.parallelBranchCount;
        newBranch.innerHTML = `
            <h5>並行処理 ${this.parallelBranchCount}:</h5>
            <div class="parallel-actions" id="parallel-${this.parallelBranchCount}">
                <button class="btn-add-parallel-action" data-branch="${this.parallelBranchCount}">
                    ➕ アクション追加
                </button>
            </div>
        `;

        container.appendChild(newBranch);

        // 新しいボタンにイベントリスナーを追加
        newBranch.querySelector('.btn-add-parallel-action').addEventListener('click', (e) => {
            const branchIndex = parseInt(e.target.dataset.branch) - 1;
            this.showParallelActionDialog(branchIndex);
        });
    }

    // 並行処理アクションダイアログの表示
    showParallelActionDialog(branchIndex) {
        // ダイアログを作成
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 400px;
        `;

        // 現在のアクターリストを取得
        const currentActors = this.getCurrentActors();
        
        dialog.innerHTML = `
            <h4>並行処理 ${branchIndex + 1} のアクション追加</h4>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">送信元:</label>
                <select id="parallel-from" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    ${currentActors.map(actor => `<option value="${actor}">${actor}</option>`).join('')}
                </select>
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">送信先:</label>
                <select id="parallel-to" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    ${currentActors.map(actor => `<option value="${actor}">${actor}</option>`).join('')}
                </select>
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">処理内容:</label>
                <input type="text" id="parallel-text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                       placeholder="例: 在庫確認" autofocus>
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button id="parallel-cancel-btn" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">キャンセル</button>
                <button id="parallel-save-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">追加</button>
            </div>
        `;

        // ボタンにイベントリスナーを追加（正しいthisコンテキストを保持）
        const cancelBtn = dialog.querySelector('#parallel-cancel-btn');
        const saveBtn = dialog.querySelector('#parallel-save-btn');
        
        cancelBtn.addEventListener('click', () => this.cancelParallelDialog());
        saveBtn.addEventListener('click', () => this.saveParallelAction(branchIndex));

        // 背景のオーバーレイ
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;
        overlay.onclick = () => this.cancelParallelDialog();

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        // テキスト入力にフォーカス
        setTimeout(() => {
            document.getElementById('parallel-text').focus();
        }, 100);

        // Enterキーで保存
        document.getElementById('parallel-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveParallelAction(branchIndex);
            }
        });
    }

    // 並行処理アクションの保存
    saveParallelAction(branchIndex) {
        const fromActor = document.getElementById('parallel-from').value;
        const toActor = document.getElementById('parallel-to').value;
        const actionText = document.getElementById('parallel-text').value.trim();

        if (!actionText) {
            this.showStatus('処理内容を入力してください', 'error');
            return;
        }

        const action = {
            from: fromActor,
            to: toActor,
            text: actionText
        };

        if (!this.tempParallelData.branches[branchIndex]) {
            this.tempParallelData.branches[branchIndex] = [];
        }
        this.tempParallelData.branches[branchIndex].push(action);
        this.updateParallelDisplay(branchIndex);

        // ダイアログを閉じる
        this.cancelParallelDialog();
        this.showStatus('アクションを追加しました');
    }

    // 並行処理ダイアログのキャンセル
    cancelParallelDialog() {
        const dialog = document.querySelector('.modal-dialog');
        const overlay = document.querySelector('.modal-overlay');
        if (dialog) dialog.remove();
        if (overlay) overlay.remove();
    }

    // 並行処理表示の更新
    updateParallelDisplay(branchIndex) {
        const container = document.getElementById(`parallel-${branchIndex + 1}`);
        container.innerHTML = '';

        this.tempParallelData.branches[branchIndex].forEach((action, index) => {
            const item = document.createElement('div');
            item.className = 'parallel-action-item';
            item.innerHTML = `
                ${action.from} → ${action.to}: ${action.text}
                <span style="cursor: pointer; color: #f44336;" 
                      onclick="app.removeParallelAction(${branchIndex}, ${index})">×</span>
            `;
            container.appendChild(item);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-parallel-action';
        addBtn.dataset.branch = branchIndex + 1;
        addBtn.textContent = '➕ アクション追加';
        addBtn.addEventListener('click', () => {
            this.showParallelActionDialog(branchIndex);
        });
        container.appendChild(addBtn);
    }

    // 並行処理アクションの削除
    removeParallelAction(branchIndex, actionIndex) {
        this.tempParallelData.branches[branchIndex].splice(actionIndex, 1);
        this.updateParallelDisplay(branchIndex);
    }

    // 並行処理をフローに追加
    addParallelToFlow() {
        const validBranches = this.tempParallelData.branches.filter(branch => branch.length > 0);
        
        if (validBranches.length < 2) {
            this.showStatus('少なくとも2つの並行処理ブランチが必要です', 'error');
            return;
        }

        const parallelAction = {
            type: 'parallel',
            branches: validBranches.map(branch => [...branch])
        };

        this.actions.push(parallelAction);
        this.updateActionList();
        this.updatePlantUML();

        // リセット
        this.tempParallelData = {
            branches: [[], []]
        };
        this.parallelBranchCount = 2;
        
        // UIをリセット
        document.querySelector('.parallel-branches').innerHTML = `
            <div class="parallel-branch" data-branch="1">
                <h5>並行処理 1:</h5>
                <div class="parallel-actions" id="parallel-1">
                    <button class="btn-add-parallel-action" data-branch="1">
                        ➕ アクション追加
                    </button>
                </div>
            </div>
            <div class="parallel-branch" data-branch="2">
                <h5>並行処理 2:</h5>
                <div class="parallel-actions" id="parallel-2">
                    <button class="btn-add-parallel-action" data-branch="2">
                        ➕ アクション追加
                    </button>
                </div>
            </div>
        `;
        
        // イベントリスナーを再設定
        this.setupParallelBuilder();
        
        this.showStatus('並行処理を追加しました');
    }

    copyCode() {
        const code = document.getElementById('plantuml-code');
        code.select();
        document.execCommand('copy');
        this.showStatus('コードをコピーしました');
    }

    formatCode() {
        const code = document.getElementById('plantuml-code').value;
        // 簡単な整形処理
        const lines = code.split('\n');
        const formatted = lines.map(line => {
            line = line.trim();
            if (line === '' || line.startsWith('@')) {
                return line;
            }
            return '  ' + line;
        }).join('\n');
        
        document.getElementById('plantuml-code').value = formatted;
        this.updateLineNumbers();
        this.showStatus('コードを整形しました');
    }

    validateCode() {
        const code = document.getElementById('plantuml-code').value;
        const errors = [];
        
        // 基本的な検証
        if (!code.includes('@startuml')) {
            errors.push('@startuml が見つかりません');
        }
        
        if (!code.includes('@enduml')) {
            errors.push('@enduml が見つかりません');
        }

        // アクターの定義確認
        const definedActors = new Set();
        const lines = code.split('\n');
        lines.forEach(line => {
            const actorMatch = line.match(/(?:actor|participant|database)\s+"?([^"\s]+)"?\s+as\s+(\w+)/);
            if (actorMatch) {
                definedActors.add(actorMatch[2]);
            }
        });

        // メッセージで使用されているアクターの確認
        lines.forEach((line, index) => {
            const messageMatch = line.match(/(\w+)\s*-+>?\s*(\w+)\s*:/);
            if (messageMatch) {
                if (!definedActors.has(messageMatch[1]) && !['@startuml', '@enduml'].includes(messageMatch[1])) {
                    errors.push(`行${index + 1}: アクター '${messageMatch[1]}' が定義されていません`);
                }
                if (!definedActors.has(messageMatch[2]) && !['@startuml', '@enduml'].includes(messageMatch[2])) {
                    errors.push(`行${index + 1}: アクター '${messageMatch[2]}' が定義されていません`);
                }
            }
        });

        if (errors.length > 0) {
            this.showStatus(errors[0], 'error');
        } else {
            this.showStatus('構文チェック完了: エラーなし');
        }
    }

    updateLineNumbers() {
        const code = document.getElementById('plantuml-code').value;
        const lines = code.split('\n').length;
        const lineNumbersContainer = document.querySelector('.line-numbers');
        
        // 行番号を更新
        let lineNumbers = '';
        for (let i = 1; i <= Math.max(lines, 10); i++) {
            lineNumbers += `<span>${i}</span>`;
        }
        lineNumbersContainer.innerHTML = lineNumbers;
    }

    zoom(delta) {
        this.currentZoom = Math.max(50, Math.min(200, this.currentZoom + delta));
        document.querySelector('.zoom-level').textContent = `${this.currentZoom}%`;
        
        const svgElement = document.querySelector('#preview-svg svg');
        if (svgElement) {
            svgElement.style.transform = `scale(${this.currentZoom / 100})`;
            svgElement.style.transformOrigin = 'top left';
        }
    }

    loadPatterns() {
        // パターンライブラリ（条件分岐・ループ・並行処理を含む拡張版）
        return [
            {
                id: 'ec-order',
                name: 'EC注文フロー',
                category: 'ec',
                actors: ['顧客', 'ECサイト', '在庫システム', '決済サービス', '配送業者'],
                actions: [
                    { from: '顧客', to: 'ECサイト', text: '商品を注文' },
                    { from: 'ECサイト', to: '在庫システム', text: '在庫確認' },
                    { from: '在庫システム', to: 'ECサイト', text: '在庫OK', async: true },
                    { from: 'ECサイト', to: '決済サービス', text: '決済処理' },
                    { from: '決済サービス', to: 'ECサイト', text: '決済完了', async: true },
                    { from: 'ECサイト', to: '配送業者', text: '配送依頼' },
                    { from: 'ECサイト', to: '顧客', text: '注文確定通知' }
                ]
            },
            {
                id: 'ec-order-with-stock',
                name: 'EC注文（在庫確認付き）',
                category: 'ec',
                actors: ['顧客', 'ECサイト', '在庫システム', '決済サービス', '配送業者'],
                actions: [
                    { from: '顧客', to: 'ECサイト', text: '商品を選択' },
                    {
                        type: 'condition',
                        conditionType: 'alt',
                        conditionName: '在庫あり',
                        trueBranch: [
                            { from: 'ECサイト', to: '在庫システム', text: '在庫確認' },
                            { from: '在庫システム', to: 'ECサイト', text: '在庫OK' },
                            { from: 'ECサイト', to: '顧客', text: '購入可能' },
                            { from: '顧客', to: 'ECサイト', text: '注文確定' },
                            { from: 'ECサイト', to: '決済サービス', text: '決済処理' },
                            { from: '決済サービス', to: 'ECサイト', text: '決済完了' },
                            { from: 'ECサイト', to: '配送業者', text: '配送依頼' }
                        ],
                        falseBranch: [
                            { from: 'ECサイト', to: '顧客', text: '在庫切れ通知' },
                            { from: 'ECサイト', to: '在庫システム', text: '入荷予約登録' },
                            { from: '在庫システム', to: 'ECサイト', text: '予約完了' },
                            { from: 'ECサイト', to: '顧客', text: '入荷時通知予約完了' }
                        ]
                    }
                ]
            },
            {
                id: 'approval',
                name: '承認ワークフロー',
                category: 'approval',
                actors: ['申請者', '承認者', 'ワークフローシステム'],
                actions: [
                    { from: '申請者', to: 'ワークフローシステム', text: '申請送信' },
                    { from: 'ワークフローシステム', to: '承認者', text: '承認依頼' },
                    { from: '承認者', to: 'ワークフローシステム', text: '承認/却下', uncertain: true },
                    { from: 'ワークフローシステム', to: '申請者', text: '結果通知' }
                ]
            },
            {
                id: 'approval-with-condition',
                name: '承認フロー（条件分岐）',
                category: 'approval',
                actors: ['申請者', '承認者', 'システム', '管理者', '通知サービス'],
                actions: [
                    { from: '申請者', to: 'システム', text: '申請書提出' },
                    { from: 'システム', to: '承認者', text: '承認依頼通知' },
                    {
                        type: 'condition',
                        conditionType: 'alt',
                        conditionName: '承認',
                        trueBranch: [
                            { from: '承認者', to: 'システム', text: '承認' },
                            { from: 'システム', to: '申請者', text: '承認通知' },
                            { from: 'システム', to: '管理者', text: '処理実行依頼' },
                            { from: '管理者', to: 'システム', text: '処理完了' }
                        ],
                        falseBranch: [
                            { from: '承認者', to: 'システム', text: '却下' },
                            { from: 'システム', to: '申請者', text: '却下理由通知' },
                            { from: 'システム', to: '管理者', text: '却下記録' }
                        ]
                    },
                    { from: 'システム', to: '通知サービス', text: '最終結果記録' }
                ]
            },
            {
                id: 'inventory',
                name: '在庫補充フロー',
                category: 'inventory',
                actors: ['在庫システム', '倉庫担当者', '購買担当者', '通知サービス'],
                actions: [
                    { from: '在庫システム', to: '倉庫担当者', text: '在庫レベル確認依頼' },
                    { from: '倉庫担当者', to: '在庫システム', text: '在庫数報告', async: true },
                    { from: '在庫システム', to: '購買担当者', text: '発注依頼', uncertain: true },
                    { from: '購買担当者', to: '在庫システム', text: '発注完了' },
                    { from: '在庫システム', to: '通知サービス', text: '通知送信' }
                ]
            },
            {
                id: 'inventory-with-threshold',
                name: '在庫管理（閾値判定）',
                category: 'inventory',
                actors: ['在庫システム', '倉庫', '購買部門', 'サプライヤー', '通知サービス'],
                actions: [
                    {
                        type: 'loop',
                        loopCondition: '毎日定時チェック',
                        actions: [
                            { from: '在庫システム', to: '倉庫', text: '在庫数確認' },
                            { from: '倉庫', to: '在庫システム', text: '現在在庫数' }
                        ]
                    },
                    {
                        type: 'condition',
                        conditionType: 'alt',
                        conditionName: '在庫 < 閾値',
                        trueBranch: [
                            { from: '在庫システム', to: '購買部門', text: '緊急発注依頼' },
                            { from: '購買部門', to: 'サプライヤー', text: '緊急発注' },
                            { from: 'サプライヤー', to: '購買部門', text: '納期回答' },
                            { from: '購買部門', to: '在庫システム', text: '発注完了報告' },
                            { from: '在庫システム', to: '通知サービス', text: '緊急発注通知送信' }
                        ],
                        falseBranch: [
                            { from: '在庫システム', to: '通知サービス', text: '在庫正常通知' }
                        ]
                    }
                ]
            },
            {
                id: 'payment-retry',
                name: '決済リトライフロー',
                category: 'ec',
                actors: ['顧客', 'ECサイト', '決済サービス', '銀行API'],
                actions: [
                    { from: '顧客', to: 'ECサイト', text: '決済実行' },
                    {
                        type: 'loop',
                        loopCondition: '最大3回まで',
                        actions: [
                            { from: 'ECサイト', to: '決済サービス', text: '決済処理要求' },
                            { from: '決済サービス', to: '銀行API', text: 'API呼び出し' },
                            {
                                type: 'condition',
                                conditionType: 'alt',
                                conditionName: '決済成功',
                                trueBranch: [
                                    { from: '銀行API', to: '決済サービス', text: '成功' },
                                    { from: '決済サービス', to: 'ECサイト', text: '決済完了' },
                                    { from: 'ECサイト', to: '顧客', text: '決済成功通知' }
                                ],
                                falseBranch: [
                                    { from: '銀行API', to: '決済サービス', text: 'エラー' },
                                    { from: '決済サービス', to: 'ECサイト', text: 'リトライ待機' }
                                ]
                            }
                        ]
                    },
                    { from: 'ECサイト', to: '顧客', text: '最終結果通知' }
                ]
            },
            {
                id: 'parallel-microservices',
                name: '並行マイクロサービス呼び出し',
                category: 'ec',
                actors: ['フロントエンド', 'APIゲートウェイ', 'ユーザーサービス', '商品サービス', '推薦サービス', '広告サービス'],
                actions: [
                    { from: 'フロントエンド', to: 'APIゲートウェイ', text: 'ページ表示要求' },
                    {
                        type: 'parallel',
                        branches: [
                            [
                                { from: 'APIゲートウェイ', to: 'ユーザーサービス', text: 'ユーザー情報取得' },
                                { from: 'ユーザーサービス', to: 'APIゲートウェイ', text: 'ユーザー情報', async: true }
                            ],
                            [
                                { from: 'APIゲートウェイ', to: '商品サービス', text: '商品一覧取得' },
                                { from: '商品サービス', to: 'APIゲートウェイ', text: '商品データ', async: true }
                            ],
                            [
                                { from: 'APIゲートウェイ', to: '推薦サービス', text: 'おすすめ取得' },
                                { from: '推薦サービス', to: 'APIゲートウェイ', text: 'おすすめリスト', async: true }
                            ],
                            [
                                { from: 'APIゲートウェイ', to: '広告サービス', text: '広告取得' },
                                { from: '広告サービス', to: 'APIゲートウェイ', text: '広告データ', async: true }
                            ]
                        ]
                    },
                    { from: 'APIゲートウェイ', to: 'フロントエンド', text: '統合レスポンス', async: true }
                ]
            },
            {
                id: 'parallel-batch',
                name: 'バッチ並行処理',
                category: 'batch',
                actors: ['スケジューラー', 'バッチシステム', 'データ抽出', 'データ変換', 'データ出力', 'エラー通知'],
                actions: [
                    { from: 'スケジューラー', to: 'バッチシステム', text: 'バッチ起動' },
                    { from: 'バッチシステム', to: 'データ抽出', text: '抽出開始' },
                    { from: 'データ抽出', to: 'バッチシステム', text: '抽出完了' },
                    {
                        type: 'parallel',
                        branches: [
                            [
                                { from: 'バッチシステム', to: 'データ変換', text: '売上データ変換' },
                                { from: 'データ変換', to: 'データ出力', text: '売上CSV出力' }
                            ],
                            [
                                { from: 'バッチシステム', to: 'データ変換', text: '顧客データ変換' },
                                { from: 'データ変換', to: 'データ出力', text: '顧客CSV出力' }
                            ],
                            [
                                { from: 'バッチシステム', to: 'データ変換', text: '在庫データ変換' },
                                { from: 'データ変換', to: 'データ出力', text: '在庫CSV出力' }
                            ]
                        ]
                    },
                    { from: 'バッチシステム', to: 'スケジューラー', text: '処理完了報告' }
                ]
            },
            {
                id: 'parallel-approval',
                name: '並行承認フロー',
                category: 'approval',
                actors: ['申請者', 'システム', '部門長', '人事部', '経理部', '総務部'],
                actions: [
                    { from: '申請者', to: 'システム', text: '休暇申請' },
                    {
                        type: 'parallel',
                        branches: [
                            [
                                { from: 'システム', to: '部門長', text: '上長承認依頼' },
                                { from: '部門長', to: 'システム', text: '承認' }
                            ],
                            [
                                { from: 'システム', to: '人事部', text: '人事確認依頼' },
                                { from: '人事部', to: 'システム', text: '確認完了' }
                            ],
                            [
                                { from: 'システム', to: '経理部', text: '経理確認依頼' },
                                { from: '経理部', to: 'システム', text: '確認完了' }
                            ]
                        ]
                    },
                    { from: 'システム', to: '申請者', text: '承認完了通知' }
                ]
            },
            {
                id: 'parallel-with-condition',
                name: '条件分岐＋並行処理',
                category: 'ec',
                actors: ['ユーザー', 'API', 'キャッシュ', 'DB', 'ログ', '通知'],
                actions: [
                    { from: 'ユーザー', to: 'API', text: 'データ取得要求' },
                    {
                        type: 'condition',
                        conditionType: 'alt',
                        conditionName: 'キャッシュヒット',
                        trueBranch: [
                            { from: 'API', to: 'キャッシュ', text: 'キャッシュ取得' },
                            { from: 'キャッシュ', to: 'API', text: 'データ返却', async: true }
                        ],
                        falseBranch: [
                            {
                                type: 'parallel',
                                branches: [
                                    [
                                        { from: 'API', to: 'DB', text: 'DBクエリ実行' },
                                        { from: 'DB', to: 'API', text: 'データ返却' }
                                    ],
                                    [
                                        { from: 'API', to: 'キャッシュ', text: 'キャッシュ更新' }
                                    ],
                                    [
                                        { from: 'API', to: 'ログ', text: 'アクセスログ記録' }
                                    ]
                                ]
                            }
                        ]
                    },
                    { from: 'API', to: 'ユーザー', text: 'データ送信', async: true }
                ]
            },
            {
                id: 'loop-data-sync',
                name: 'データ同期ループ処理',
                category: 'batch',
                actors: ['同期システム', 'ソースDB', 'ターゲットDB', '監視システム', '通知サービス'],
                actions: [
                    { from: '同期システム', to: '監視システム', text: '同期開始通知' },
                    {
                        type: 'loop',
                        loopCondition: '全データ処理完了まで',
                        actions: [
                            { from: '同期システム', to: 'ソースDB', text: 'データ取得（1000件）' },
                            { from: 'ソースDB', to: '同期システム', text: 'データ返却', async: true },
                            { from: '同期システム', to: 'ターゲットDB', text: 'データ書き込み' },
                            { from: 'ターゲットDB', to: '同期システム', text: '書き込み完了', async: true },
                            { from: '同期システム', to: '監視システム', text: '進捗更新' }
                        ]
                    },
                    { from: '同期システム', to: '通知サービス', text: '同期完了通知' }
                ]
            },
            {
                id: 'loop-health-check',
                name: 'ヘルスチェックループ',
                category: 'monitoring',
                actors: ['監視システム', 'Webサーバー', 'DBサーバー', 'キャッシュサーバー', 'アラート通知'],
                actions: [
                    {
                        type: 'loop',
                        loopCondition: '5分ごと',
                        actions: [
                            { from: '監視システム', to: 'Webサーバー', text: 'ヘルスチェック' },
                            { from: 'Webサーバー', to: '監視システム', text: 'ステータス返却', async: true },
                            { from: '監視システム', to: 'DBサーバー', text: 'ヘルスチェック' },
                            { from: 'DBサーバー', to: '監視システム', text: 'ステータス返却', async: true },
                            { from: '監視システム', to: 'キャッシュサーバー', text: 'ヘルスチェック' },
                            { from: 'キャッシュサーバー', to: '監視システム', text: 'ステータス返却', async: true },
                            {
                                type: 'condition',
                                conditionType: 'opt',
                                conditionName: '異常検知',
                                trueBranch: [
                                    { from: '監視システム', to: 'アラート通知', text: '異常アラート送信' },
                                    { from: 'アラート通知', to: '監視システム', text: '通知完了' }
                                ],
                                falseBranch: []
                            }
                        ]
                    }
                ]
            },
            {
                id: 'loop-email-campaign',
                name: 'メール配信ループ処理',
                category: 'marketing',
                actors: ['配信システム', '顧客DB', 'メールサーバー', '配信ログ', 'レポート'],
                actions: [
                    { from: '配信システム', to: '顧客DB', text: '配信リスト取得' },
                    { from: '顧客DB', to: '配信システム', text: 'リスト返却（10万件）' },
                    {
                        type: 'loop',
                        loopCondition: 'バッチサイズ500件ずつ',
                        actions: [
                            { from: '配信システム', to: 'メールサーバー', text: 'バッチ送信（500件）' },
                            { from: 'メールサーバー', to: '配信システム', text: '送信結果', async: true },
                            { from: '配信システム', to: '配信ログ', text: 'ログ記録' },
                            {
                                type: 'condition',
                                conditionType: 'opt',
                                conditionName: 'エラー率 > 10%',
                                trueBranch: [
                                    { from: '配信システム', to: 'メールサーバー', text: '配信一時停止' },
                                    { from: '配信システム', to: 'レポート', text: 'エラーレポート生成' }
                                ],
                                falseBranch: []
                            }
                        ]
                    },
                    { from: '配信システム', to: 'レポート', text: '最終レポート生成' }
                ]
            },
            {
                id: 'loop-file-processing',
                name: 'ファイル処理ループ',
                category: 'batch',
                actors: ['処理システム', 'ファイルストレージ', '変換エンジン', '出力ストレージ', 'ジョブ管理'],
                actions: [
                    { from: '処理システム', to: 'ファイルストレージ', text: '未処理ファイル一覧取得' },
                    { from: 'ファイルストレージ', to: '処理システム', text: 'ファイルリスト返却' },
                    {
                        type: 'loop',
                        loopCondition: '各ファイルに対して',
                        actions: [
                            { from: '処理システム', to: 'ファイルストレージ', text: 'ファイル読み込み' },
                            { from: 'ファイルストレージ', to: '処理システム', text: 'ファイルデータ' },
                            { from: '処理システム', to: '変換エンジン', text: '形式変換依頼' },
                            { from: '変換エンジン', to: '処理システム', text: '変換完了', async: true },
                            { from: '処理システム', to: '出力ストレージ', text: '変換済みファイル保存' },
                            { from: '出力ストレージ', to: '処理システム', text: '保存完了' },
                            { from: '処理システム', to: 'ジョブ管理', text: '処理状況更新' }
                        ]
                    },
                    { from: '処理システム', to: 'ジョブ管理', text: 'ジョブ完了通知' }
                ]
            },
            {
                id: 'loop-api-pagination',
                name: 'API ページネーション処理',
                category: 'integration',
                actors: ['クライアント', 'APIゲートウェイ', '外部API', 'データストア', 'ログシステム'],
                actions: [
                    { from: 'クライアント', to: 'APIゲートウェイ', text: '全データ取得要求' },
                    {
                        type: 'loop',
                        loopCondition: 'hasNextPage == true',
                        actions: [
                            { from: 'APIゲートウェイ', to: '外部API', text: 'ページ取得（limit=100）' },
                            { from: '外部API', to: 'APIゲートウェイ', text: 'データ＋次ページトークン', async: true },
                            { from: 'APIゲートウェイ', to: 'データストア', text: 'データ保存' },
                            { from: 'データストア', to: 'APIゲートウェイ', text: '保存完了' },
                            { from: 'APIゲートウェイ', to: 'ログシステム', text: '取得ページ記録' },
                            {
                                type: 'condition',
                                conditionType: 'opt',
                                conditionName: 'レート制限到達',
                                trueBranch: [
                                    { from: 'APIゲートウェイ', to: 'APIゲートウェイ', text: '60秒待機', uncertain: true }
                                ],
                                falseBranch: []
                            }
                        ]
                    },
                    { from: 'APIゲートウェイ', to: 'クライアント', text: '全データ取得完了' }
                ]
            },
            {
                id: 'loop-queue-processing',
                name: 'キュー処理ループ',
                category: 'messaging',
                actors: ['ワーカー', 'メッセージキュー', '処理エンジン', 'デッドレターキュー', '監視システム'],
                actions: [
                    { from: 'ワーカー', to: '監視システム', text: 'ワーカー起動通知' },
                    {
                        type: 'loop',
                        loopCondition: 'キューが空になるまで',
                        actions: [
                            { from: 'ワーカー', to: 'メッセージキュー', text: 'メッセージ取得' },
                            { from: 'メッセージキュー', to: 'ワーカー', text: 'メッセージ返却' },
                            { from: 'ワーカー', to: '処理エンジン', text: 'メッセージ処理' },
                            {
                                type: 'condition',
                                conditionType: 'alt',
                                conditionName: '処理成功',
                                trueBranch: [
                                    { from: '処理エンジン', to: 'ワーカー', text: '処理完了' },
                                    { from: 'ワーカー', to: 'メッセージキュー', text: 'ACK送信' }
                                ],
                                falseBranch: [
                                    { from: '処理エンジン', to: 'ワーカー', text: 'エラー発生' },
                                    {
                                        type: 'condition',
                                        conditionType: 'alt',
                                        conditionName: 'リトライ回数 < 3',
                                        trueBranch: [
                                            { from: 'ワーカー', to: 'メッセージキュー', text: 'リトライキューに戻す' }
                                        ],
                                        falseBranch: [
                                            { from: 'ワーカー', to: 'デッドレターキュー', text: 'DLQに移動' }
                                        ]
                                    }
                                ]
                            },
                            { from: 'ワーカー', to: '監視システム', text: '処理統計更新' }
                        ]
                    },
                    { from: 'ワーカー', to: '監視システム', text: 'キュー処理完了' }
                ]
            },
            {
                id: 'loop-websocket-heartbeat',
                name: 'WebSocketハートビート',
                category: 'realtime',
                actors: ['クライアント', 'WebSocketサーバー', 'セッション管理', 'イベントストア'],
                actions: [
                    { from: 'クライアント', to: 'WebSocketサーバー', text: '接続確立' },
                    { from: 'WebSocketサーバー', to: 'セッション管理', text: 'セッション作成' },
                    {
                        type: 'parallel',
                        branches: [
                            [
                                {
                                    type: 'loop',
                                    loopCondition: '30秒ごと',
                                    actions: [
                                        { from: 'WebSocketサーバー', to: 'クライアント', text: 'Ping送信' },
                                        {
                                            type: 'condition',
                                            conditionType: 'alt',
                                            conditionName: 'Pong受信',
                                            trueBranch: [
                                                { from: 'クライアント', to: 'WebSocketサーバー', text: 'Pong返信' },
                                                { from: 'WebSocketサーバー', to: 'セッション管理', text: 'セッション更新' }
                                            ],
                                            falseBranch: [
                                                { from: 'WebSocketサーバー', to: 'セッション管理', text: 'タイムアウト記録' },
                                                { from: 'セッション管理', to: 'WebSocketサーバー', text: '接続切断指示' }
                                            ]
                                        }
                                    ]
                                }
                            ],
                            [
                                {
                                    type: 'loop',
                                    loopCondition: 'イベント発生時',
                                    actions: [
                                        { from: 'イベントストア', to: 'WebSocketサーバー', text: 'イベント通知' },
                                        { from: 'WebSocketサーバー', to: 'クライアント', text: 'イベント送信', async: true }
                                    ]
                                }
                            ]
                        ]
                    }
                ]
            },
            {
                id: 'parallel-process',
                name: '並行処理フロー',
                category: 'ec',
                actors: ['顧客', 'ECサイト', '在庫システム', '決済サービス', '配送業者', 'メール配信'],
                actions: [
                    { from: '顧客', to: 'ECサイト', text: '注文確定' },
                    {
                        type: 'parallel',
                        branches: [
                            [
                                { from: 'ECサイト', to: '在庫システム', text: '在庫引当' },
                                { from: '在庫システム', to: 'ECサイト', text: '引当完了' }
                            ],
                            [
                                { from: 'ECサイト', to: '決済サービス', text: '決済処理' },
                                { from: '決済サービス', to: 'ECサイト', text: '決済完了' }
                            ],
                            [
                                { from: 'ECサイト', to: 'メール配信', text: '注文確認メール送信' },
                                { from: 'メール配信', to: 'ECサイト', text: '送信完了' }
                            ]
                        ]
                    },
                    { from: 'ECサイト', to: '配送業者', text: '配送手配' },
                    { from: 'ECサイト', to: '顧客', text: '注文処理完了通知' }
                ]
            }
        ];
    }

    usePattern(patternId) {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (!pattern) return;

        // 確認ダイアログ
        if (this.selectedActors.size > 0 || this.actions.length > 0) {
            if (!confirm('現在の編集内容が上書きされます。続行しますか？')) {
                return;
            }
        }

        // アクター＋処理モードに切り替え
        this.switchMode('actor-action');

        // パターンのアクターを選択
        this.selectedActors.clear();
        document.querySelectorAll('.actor-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        pattern.actors.forEach(actor => {
            this.selectedActors.add(actor);
            // 既存のボタンがあれば選択状態にする
            document.querySelectorAll('.actor-btn').forEach(btn => {
                if (btn.dataset.actor === actor) {
                    btn.classList.add('selected');
                }
            });
        });

        // パターンのアクションを深くコピー
        this.actions = this.deepCopyActions(pattern.actions);

        // UIを更新
        this.updateSelectedActorsDisplay();
        this.updateActorSelects();
        this.updateActionList();
        this.updatePlantUML();
        
        // ステータス通知
        this.showStatus(`パターン「${pattern.name}」を適用しました`);
    }

    // アクション配列の深いコピー
    deepCopyActions(actions) {
        return actions.map(action => {
            if (action.type === 'condition') {
                return {
                    type: 'condition',
                    conditionType: action.conditionType,
                    conditionName: action.conditionName,
                    trueBranch: action.trueBranch ? action.trueBranch.map(a => ({...a})) : [],
                    falseBranch: action.falseBranch ? action.falseBranch.map(a => ({...a})) : []
                };
            } else if (action.type === 'loop') {
                return {
                    type: 'loop',
                    loopCondition: action.loopCondition,
                    actions: action.actions ? action.actions.map(a => ({...a})) : []
                };
            } else if (action.type === 'parallel') {
                return {
                    type: 'parallel',
                    branches: action.branches ? action.branches.map(branch => 
                        branch.map(a => ({...a}))
                    ) : []
                };
            } else {
                // 通常のアクション
                return {...action};
            }
        });
    }

    filterPatterns(category) {
        // フィルターボタンの状態更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // パターンカードの表示/非表示
        document.querySelectorAll('.pattern-card[data-category]').forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    showCustomActorModal() {
        const modal = document.getElementById('custom-actor-modal');
        modal.classList.add('active');

        const confirmBtn = modal.querySelector('.btn-confirm');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const input = document.getElementById('custom-actor-name');

        // フォーカス設定
        setTimeout(() => input.focus(), 100);

        const handleConfirm = () => {
            const actorName = input.value.trim();
            if (actorName) {
                this.addCustomActor(actorName);
                modal.classList.remove('active');
                input.value = '';
            }
        };

        const handleCancel = () => {
            modal.classList.remove('active');
            input.value = '';
        };

        // イベントリスナーをクリア後に設定
        confirmBtn.onclick = handleConfirm;
        cancelBtn.onclick = handleCancel;

        // Enterキーでも確定
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            }
        };

        // ESCキーでキャンセル
        document.onkeydown = (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                handleCancel();
            }
        };
    }

    showDeleteActorModal() {
        if (this.selectedActors.size === 0) {
            this.showStatus('⚠️ 削除するアクターが選択されていません', 'error');
            return;
        }

        // 簡易的な確認ダイアログを使用
        const actorsList = Array.from(this.selectedActors).join(', ');
        const confirmed = confirm(`以下のアクターを削除しますか？\n\n${actorsList}\n\n注意: 関連する処理も削除されます`);
        
        if (confirmed) {
            // 選択中のアクターをすべて削除
            const actorsToDelete = Array.from(this.selectedActors);
            actorsToDelete.forEach(actor => {
                this.deleteActor(actor);
            });
            
            this.showStatus(`✅ ${actorsToDelete.length}個のアクターを削除しました`, 'success');
        }
    }

    deleteActor(actorName) {
        // アクターを選択から削除
        this.selectedActors.delete(actorName);
        
        // UIからボタンを削除（カスタムアクターのみ）
        const customButton = document.querySelector(`.actor-btn[data-actor="${actorName}"]`);
        if (customButton && !this.isDefaultActor(actorName)) {
            customButton.remove();
        } else if (customButton) {
            // デフォルトアクターの場合は選択解除のみ
            customButton.classList.remove('selected');
        }
        
        // 関連する処理を削除
        this.actions = this.actions.filter(action => {
            if (action.type === 'message') {
                return action.from !== actorName && action.to !== actorName;
            } else if (action.type === 'condition' || action.type === 'loop' || action.type === 'parallel') {
                // 条件分岐などの中のアクションもチェック
                if (action.trueBranch) {
                    action.trueBranch = action.trueBranch.filter(a => 
                        a.from !== actorName && a.to !== actorName
                    );
                }
                if (action.falseBranch) {
                    action.falseBranch = action.falseBranch.filter(a => 
                        a.from !== actorName && a.to !== actorName
                    );
                }
                if (action.actions) {
                    action.actions = action.actions.filter(a => 
                        a.from !== actorName && a.to !== actorName
                    );
                }
                return true; // 条件自体は保持
            }
            return true;
        });
        
        // UIを更新
        this.updateSelectedActorsDisplay();
        this.updateActorSelects();
        this.updateActionList();
        this.updatePlantUML();
    }

    isDefaultActor(actorName) {
        const defaultActors = ['ユーザー', 'システム', 'データベース', '外部API', '管理者', '決済サービス', '配送業者'];
        return defaultActors.includes(actorName);
    }

    addCustomActor(name) {
        // 既に存在する場合はスキップ
        if (this.selectedActors.has(name)) {
            this.showStatus('このアクターは既に追加されています', 'warning');
            return;
        }

        // 既存の処理を保存
        const savedActions = [...this.actions];

        // UIに新しいアクターボタンを追加
        const grid = document.querySelector('.actor-grid');
        
        const newButton = document.createElement('button');
        newButton.className = 'actor-btn selected';
        newButton.dataset.actor = name;
        newButton.innerHTML = `
            <span class="actor-icon">👤</span>
            <span>${name}</span>
        `;
        
        newButton.addEventListener('click', () => {
            this.toggleActor(name, newButton);
        });

        grid.appendChild(newButton);
        
        // 選択状態にする
        this.selectedActors.add(name);
        
        // 処理を復元（念のため）
        this.actions = savedActions;
        
        this.updateSelectedActorsDisplay();
        this.updateActorSelects();
        this.updateActionList();  // 処理リストも更新
        this.updatePlantUML();
        
        this.showStatus(`アクター「${name}」を追加しました`);
    }

    createNewPattern() {
        if (this.selectedActors.size === 0 || this.actions.length === 0) {
            this.showStatus('保存する内容がありません', 'warning');
            return;
        }

        const name = prompt('パターン名を入力してください:');
        if (!name) return;

        const newPattern = {
            id: 'custom-' + Date.now(),
            name: name,
            category: 'custom',
            actors: Array.from(this.selectedActors),
            actions: [...this.actions]
        };

        // パターンを保存（ローカルストレージ）
        this.savePatternToStorage(newPattern);
        this.patterns.push(newPattern);
        
        this.showStatus(`パターン「${name}」を保存しました`);
    }

    savePatternToStorage(pattern) {
        const stored = localStorage.getItem('customPatterns');
        const patterns = stored ? JSON.parse(stored) : [];
        patterns.push(pattern);
        localStorage.setItem('customPatterns', JSON.stringify(patterns));
    }

    downloadDiagram() {
        const code = document.getElementById('plantuml-code').value;
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram_${new Date().getTime()}.puml`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showStatus('ファイルをダウンロードしました');
    }

    // draw.io エクスポート機能
    exportToDrawIO() {
        const actors = Array.from(this.selectedActors);
        const actions = this.actions;
        
        if (actors.length === 0 || actions.length === 0) {
            this.showStatus('エクスポートする内容がありません', 'warning');
            return;
        }
        
        try {
            const converter = new SequenceDiagramToDrawIO();
            converter.initialize(actors, actions);
            const url = converter.generateDrawIOUrl();
            
            // 新しいタブで開く
            window.open(url, '_blank');
            this.showStatus('draw.ioで開きました');
        } catch (error) {
            console.error('draw.ioエクスポートエラー:', error);
            this.showStatus('エクスポートに失敗しました', 'error');
        }
    }

    // draw.io ファイルダウンロード
    downloadDrawIO() {
        const actors = Array.from(this.selectedActors);
        const actions = this.actions;
        
        if (actors.length === 0 || actions.length === 0) {
            this.showStatus('ダウンロードする内容がありません', 'warning');
            return;
        }
        
        try {
            const converter = new SequenceDiagramToDrawIO();
            converter.initialize(actors, actions);
            const timestamp = new Date().getTime();
            converter.downloadAsDrawIO(`sequence_diagram_${timestamp}.drawio`);
            this.showStatus('.drawioファイルをダウンロードしました');
        } catch (error) {
            console.error('draw.ioダウンロードエラー:', error);
            this.showStatus('ダウンロードに失敗しました', 'error');
        }
    }

    showPresets() {
        alert('プリセット機能は開発中です');
    }

    showHelp() {
        const helpText = `
【使い方】
1. Step 1: アクターを選択
   - ボタンをクリックして必要なアクターを選択
   - ＋ボタンでカスタムアクターを追加

2. Step 2: 処理を入力
   - 送信元と送信先を選択
   - 処理内容を入力
   - 必要に応じて「未確定」「非同期」にチェック

3. パターン選択
   - よく使うフローパターンから選択可能
   - 選択するとアクターと処理が自動設定

4. コードエディター
   - PlantUMLコードを直接編集可能
   - 編集内容は自動的にUIに反映
   - Tabキーでインデント挿入

【ショートカット】
- Enter: 処理を追加
- Tab: インデント挿入（エディター内）
- Ctrl+Space: コードヒント（エディター内）
- Esc: ダイアログを閉じる
        `;
        alert(helpText);
    }

    showCodeHints() {
        const hints = `
【PlantUML シーケンス図の構文】

◆ アクター定義
actor "名前" as エイリアス
participant "名前" as エイリアス
database "名前" as エイリアス
entity "名前" as エイリアス

◆ メッセージ
A -> B: メッセージ     # 同期メッセージ
A --> B: メッセージ    # 非同期メッセージ
A ->> B: メッセージ    # 同期呼び出し
A -->> B: メッセージ   # 非同期呼び出し

◆ その他
note left: メモ
note right: メモ
activate A
deactivate A
alt 条件
else 別条件
end

◆ 例
@startuml
actor "顧客" as Customer
participant "ECサイト" as EC
Customer -> EC: 注文する
EC --> Customer: 確認メール
@enduml
        `;
        
        // コードヒントをポップアップで表示
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #2196F3;
            border-radius: 8px;
            padding: 20px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #2196F3;">PlantUML コードヒント</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    cursor: pointer;
                    font-size: 18px;
                ">×</button>
            </div>
            <pre style="
                background: #f5f5f5;
                padding: 15px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.6;
                margin: 0;
            ">${hints}</pre>
        `;
        
        document.body.appendChild(modal);
        
        // クリックで閉じる
        setTimeout(() => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }, 100);
        
        // ESCキーで閉じる
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    onCodeChange(code) {
        // 手動編集の検出と逆パース
        if (this.isUpdatingCode) return; // 自動更新中は処理しない
        
        // デバウンス処理（入力中の頻繁な更新を防ぐ）
        clearTimeout(this.codeChangeTimeout);
        this.codeChangeTimeout = setTimeout(() => {
            this.parseAndUpdateFromCode(code);
        }, 500);
    }

    parseAndUpdateFromCode(code) {
        try {
            // Phase 2改善版: モジュール化されたパーサーを優先使用
            if (this.useModularParser && this.parser) {
                const parsed = this.parser.safeParse(code);
                this.handleParsedResult(parsed, code);
                return;
            }
            
            // レガシーパーサーにフォールバック
            const parsed = this.safeParsePlantUMLCode(code);
            
            this.debugLog('Parse and update from code', { 
                codeLength: code.length, 
                parsedActors: parsed?.actors?.length || 0,
                parsedActions: parsed?.actions?.length || 0
            });
            
            if (!parsed || (!parsed.actors.length && !parsed.actions.length)) {
                // パース失敗時は、プレビューのみ更新して既存のアクションは保持
                this.renderPreview(code);
                this.showStatus('コードから同期しました（既存データを保持）', 'info');
                return;
            }

            // UIへの反映フラグを立てる
            this.isUpdatingFromCode = true;

            // 既存の複雑な処理（条件分岐、ループ、並行処理）を保持
            const complexActions = this.actions.filter(action => 
                action.type === 'condition' || 
                action.type === 'loop' || 
                action.type === 'parallel'
            );

            // アクターを更新
            this.selectedActors.clear();
            document.querySelectorAll('.actor-btn').forEach(btn => {
                btn.classList.remove('selected');
            });

            parsed.actors.forEach(actor => {
                this.selectedActors.add(actor);
                // 既存のボタンがあれば選択状態にする
                document.querySelectorAll('.actor-btn').forEach(btn => {
                    if (btn.dataset.actor === actor) {
                        btn.classList.add('selected');
                    }
                });
                // 既存のボタンにない場合はカスタムアクターとして追加
                if (!document.querySelector(`.actor-btn[data-actor="${actor}"]`)) {
                    this.addCustomActorSilently(actor);
                }
            });

            // アクションを更新（複雑な処理は保持）
            // parsed.actionsが存在する場合のみ更新、なければ既存のアクションを保持
            if (parsed.actions && parsed.actions.length > 0) {
                // コードから解析した単純なメッセージと、保持した複雑な処理を統合
                this.actions = [...parsed.actions, ...complexActions];
            } else if (complexActions.length > 0) {
                // 複雑な処理のみを保持
                this.actions = complexActions;
            }
            // else の場合、既存のthis.actionsをそのまま保持

            // UIを更新
            this.updateSelectedActorsDisplay();
            this.updateActorSelects();
            this.updateActionList();
            
            // プレビューを更新
            this.renderPreview(code);
            this.updateStatus();
            
            this.showStatus('コードから同期しました（複雑な処理は保持）', 'info');

            // フラグを解除
            this.isUpdatingFromCode = false;

        } catch (error) {
            console.error('PlantUMLコード解析エラー:', error);
            // エラーが発生してもUIは変更しない
        }
    }
    
    /**
     * パース結果の処理（モジュール化パーサー用）
     */
    handleParsedResult(parsed, code) {
        this.debugLog('Parse result from modular parser', { 
            actors: parsed?.actors?.length || 0,
            actions: parsed?.actions?.length || 0,
            hasValidStructure: parsed?.hasValidStructure
        });
        
        if (!parsed || (!parsed.actors.length && !parsed.actions.length)) {
            this.renderPreview(code);
            this.showStatus('コードから同期しました（既存データを保持）', 'info');
            return;
        }
        
        // UIへの反映フラグを立てる
        this.isUpdatingFromCode = true;
        
        // 既存の複雑な処理を保持
        const complexActions = this.actions.filter(action => 
            action.type === 'condition' || 
            action.type === 'loop' || 
            action.type === 'parallel' ||
            action.type === 'group'
        );
        
        // アクターを更新
        this.selectedActors.clear();
        document.querySelectorAll('.actor-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        parsed.actors.forEach(actor => {
            this.selectedActors.add(actor);
            document.querySelectorAll('.actor-btn').forEach(btn => {
                if (btn.dataset.actor === actor) {
                    btn.classList.add('selected');
                }
            });
            if (!document.querySelector(`.actor-btn[data-actor="${actor}"]`)) {
                this.addCustomActorSilently(actor);
            }
        });
        
        // アクションを更新
        if (parsed.actions && parsed.actions.length > 0) {
            this.actions = [...parsed.actions, ...complexActions];
        } else if (complexActions.length > 0) {
            this.actions = complexActions;
        }
        
        // UIを更新
        this.updateSelectedActorsDisplay();
        this.updateActorSelects();
        this.updateActionList();
        
        // プレビューを更新
        this.renderPreview(code);
        this.updateStatus();
        
        this.showStatus('コードから同期しました（モジュール化パーサー使用）', 'info');
        
        // フラグを解除
        this.isUpdatingFromCode = false;
    }
    
    /**
     * コードエディタの値を取得
     */
    getCodeEditorValue() {
        const codeEditor = document.getElementById('plantuml-code');
        return codeEditor ? codeEditor.value : '';
    }

    // デバッグモードの設定
    debugLog(message, data) {
        const DEBUG_MODE = localStorage.getItem('debug_parse') === 'true';
        if (DEBUG_MODE) {
            console.group(`[PlantUML Parser] ${message}`);
            console.log(data);
            console.groupEnd();
        }
    }

    // フォールバック用の簡易パース関数
    getFallbackParseResult(code) {
        console.warn('Using fallback parser');
        const actors = [];
        const actions = [];
        
        // 簡易的にアクターを抽出
        const actorRegex = /(?:actor|participant|database|entity|boundary|control)\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))/g;
        let match;
        while ((match = actorRegex.exec(code)) !== null) {
            const actor = match[1] || match[2] || match[3];
            if (actor && !actors.includes(actor)) {
                actors.push(actor);
            }
        }
        
        return { actors, actions };
    }

    // 安全なパース関数
    safeParsePlantUMLCode(code) {
        try {
            const result = this.parsePlantUMLCode(code);
            if (!result || !result.actors) {
                console.warn('Parse failed, using fallback');
                return this.getFallbackParseResult(code);
            }
            return result;
        } catch (error) {
            console.error('Parse error:', error);
            return this.getFallbackParseResult(code);
        }
    }

    parsePlantUMLCode(code) {
        try {
            this.debugLog('Starting parse', { codeLength: code.length });
            
            const lines = code.split('\n');
            const actors = [];
            const actions = [];
            const actorMap = new Map(); // エイリアス名から実名へのマッピング
            let inLoop = false;
            let inCondition = false;
            let inParallel = false;
            let currentStructure = null;

            // @startuml と @enduml のチェック
            if (!code.includes('@startuml') || !code.includes('@enduml')) {
                this.debugLog('Missing @startuml or @enduml', null);
                return null;
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // アクター定義のパース
                // actor "顧客" as Customer
                // participant "ECサイト" as EC
                // database "倉庫" as Warehouse
                const actorMatch = line.match(/^(?:actor|participant|database|entity|boundary|control)\s+"([^"]+)"\s+as\s+(\w+)/);
                if (actorMatch) {
                    const [, name, alias] = actorMatch;
                    actors.push(name);
                    actorMap.set(alias, name);
                    continue;
                }

                // 簡易形式のアクター定義（Unicode対応）
                // actor 顧客
                // actor "顧客"
                // actor '顧客'
                // actor `顧客`
                const simpleActorMatch = line.match(/^(?:actor|participant|database|entity|boundary|control)\s+(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s]+))$/u);
                if (simpleActorMatch) {
                    const name = simpleActorMatch[1] || simpleActorMatch[2] || simpleActorMatch[3] || simpleActorMatch[4];
                    if (name) {
                        actors.push(name);
                        actorMap.set(name, name);
                        this.debugLog('Found actor', { name, type: 'simple' });
                    }
                    continue;
                }

                // ループの開始
                if (line.match(/^loop\s+(.+)$/)) {
                    const condition = line.match(/^loop\s+(.+)$/)[1];
                    inLoop = true;
                    currentStructure = {
                        type: 'loop',
                        condition: condition,
                        actions: []
                    };
                    continue;
                }

                // 条件分岐の開始
                if (line.match(/^alt\s+(.+)$/)) {
                    const condition = line.match(/^alt\s+(.+)$/)[1];
                    inCondition = true;
                    currentStructure = {
                        type: 'condition',
                        conditionType: 'alt',
                        conditionName: condition,
                        trueBranch: [],
                        falseBranch: [],
                        currentBranch: 'true'
                    };
                    continue;
                }

                // 並行処理の開始
                if (line === 'par') {
                    inParallel = true;
                    currentStructure = {
                        type: 'parallel',
                        branches: [[]]
                    };
                    continue;
                }

                // else の処理
                if (line === 'else' && (inCondition || inParallel)) {
                    if (inCondition && currentStructure) {
                        currentStructure.currentBranch = 'false';
                    } else if (inParallel && currentStructure) {
                        currentStructure.branches.push([]);
                    }
                    continue;
                }

                // 終了タグ
                if (line === 'end') {
                    if (currentStructure) {
                        actions.push(currentStructure);
                        currentStructure = null;
                        inLoop = false;
                        inCondition = false;
                        inParallel = false;
                    }
                    continue;
                }

                // メッセージのパース（Unicode対応、全ての引用符形式に対応）
                // Customer -> EC: 注文する
                // Customer --> EC: 非同期メッセージ
                // "顧客" -> "ECサイト": 商品を注文
                // '顧客' -> 'ECサイト': 商品を注文
                // `顧客` -> `ECサイト`: 商品を注文
                const messageMatch = line.match(/^(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s]+))\s*(<?-->>?|<?->|\.\.>>?|\.\.>)\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s]+))\s*:\s*(.+)$/u);
                if (messageMatch) {
                    const [, fromDouble, fromSingle, fromBacktick, fromPlain, arrow, toDouble, toSingle, toBacktick, toPlain, text] = messageMatch;
                    
                    // 引用符付きの名前を優先、なければプレーンテキストを使用
                    const fromName = fromDouble || fromSingle || fromBacktick || fromPlain;
                    const toName = toDouble || toSingle || toBacktick || toPlain;
                    
                    // エイリアスから実名を取得（エイリアスマップにあれば使用）
                    const from = actorMap.get(fromName) || fromName;
                    const to = actorMap.get(toName) || toName;
                    
                    // テキストから未確定フラグを判定
                    const uncertain = text.includes('？') || text.includes('?');
                    const cleanText = text.replace(/[？?]$/, '').trim();
                    
                    // 矢印から非同期フラグを判定
                    const async = arrow.includes('--') || arrow.includes('..');
                    
                    const action = {
                        from: from,
                        to: to,
                        text: cleanText,
                        uncertain: uncertain,
                        async: async
                    };
                    
                    this.debugLog('Found message', { from, to, text: cleanText, arrow });

                    // 構造内のアクションか、通常のアクションか判定
                    if (inLoop && currentStructure) {
                        currentStructure.actions.push(action);
                    } else if (inCondition && currentStructure) {
                        if (currentStructure.currentBranch === 'true') {
                            currentStructure.trueBranch.push(action);
                        } else {
                            currentStructure.falseBranch.push(action);
                        }
                    } else if (inParallel && currentStructure) {
                        const lastBranch = currentStructure.branches.length - 1;
                        currentStructure.branches[lastBranch].push(action);
                    } else {
                        actions.push(action);
                    }
                }
            }

            // アクターが重複している場合は重複を除去
            const uniqueActors = [...new Set(actors)];
            
            const result = {
                actors: uniqueActors,
                actions: actions
            };
            
            this.debugLog('Parse complete', { 
                actorCount: uniqueActors.length, 
                actionCount: actions.length,
                actors: uniqueActors
            });

            return result;

        } catch (error) {
            console.error('パースエラー:', error);
            this.debugLog('Parse error', { error: error.message, stack: error.stack });
            return null;
        }
    }

    addCustomActorSilently(name) {
        // UIに新しいアクターボタンを追加（通知なし）
        const grid = document.querySelector('.actor-grid');
        
        // 既に存在する場合はスキップ
        if (document.querySelector(`.actor-btn[data-actor="${name}"]`)) {
            return;
        }
        
        const newButton = document.createElement('button');
        newButton.className = 'actor-btn selected';
        newButton.dataset.actor = name;
        newButton.innerHTML = `
            <span class="actor-icon">👤</span>
            <span>${name}</span>
        `;
        
        newButton.addEventListener('click', () => {
            this.toggleActor(name, newButton);
        });

        grid.appendChild(newButton);
    }

    /**
     * パターンコード正規化処理
     */
    applyPattern(patternCode) {
        try {
            // 改行文字を正しく処理
            const normalizedCode = patternCode
                .replace(/\\n/g, '\n')  // エスケープされた改行を実際の改行に
                .replace(/\n{3,}/g, '\n\n')  // 過剰な改行を削減
                .trim();
            
            // 検証
            if (!this.validatePlantUMLCode(normalizedCode)) {
                console.error('Invalid PlantUML code format');
                this.showStatus('無効なPlantUMLコード形式です', 'error');
                return false;
            }
            
            // 適用
            const editor = document.getElementById('plantuml-code');
            if (editor) {
                editor.value = normalizedCode;
                
                // 変更イベントを適切に発火
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                
                this.showStatus('パターンコードを適用しました');
                return true;
            } else {
                console.error('PlantUML code editor not found');
                return false;
            }
            
        } catch (error) {
            console.error('Pattern application error:', error);
            this.showStatus('パターン適用中にエラーが発生しました', 'error');
            return false;
        }
    }

    /**
     * PlantUMLコード検証
     */
    validatePlantUMLCode(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        
        const lines = code.split('\n');
        
        // 基本的な構文チェック
        if (!code.includes('@startuml') || !code.includes('@enduml')) {
            return false;
        }
        
        // 行数チェック（メモリ対策）
        if (lines.length > 1000) {
            console.warn('Code too large, may cause performance issues');
            return false;
        }
        
        // 基本的な文字列チェック
        if (code.length > 100000) { // 100KB制限
            console.warn('Code too long, may cause performance issues');
            return false;
        }
        
        return true;
    }

    // インライン編集用の補助関数
    createEditableActionItem(action, branchType, branchIndex, actionIndex) {
        const actors = this.getCurrentActors();
        const isUncertain = action.uncertain || false;
        
        return `
            <div class="action-item-inline" data-branch="${branchType}" data-branch-index="${branchIndex}" data-action-index="${actionIndex}">
                <span class="drag-handle">☰</span>
                <select class="actor-select-inline from-actor" onchange="window.editor.updateActionField('${branchType}', ${branchIndex}, ${actionIndex}, 'from', this.value)">
                    ${actors.map(actor => 
                        `<option value="${actor}" ${action.from === actor ? 'selected' : ''}>${actor}</option>`
                    ).join('')}
                </select>
                <select class="arrow-type-inline" onchange="window.editor.updateActionField('${branchType}', ${branchIndex}, ${actionIndex}, 'async', this.value === 'async')">
                    <option value="sync" ${!action.async ? 'selected' : ''}>→</option>
                    <option value="async" ${action.async ? 'selected' : ''}>⇢</option>
                    <option value="return" ${action.return ? 'selected' : ''}>⟵</option>
                    <option value="async-return" ${action.async && action.return ? 'selected' : ''}>⟸</option>
                </select>
                <select class="actor-select-inline to-actor" onchange="window.editor.updateActionField('${branchType}', ${branchIndex}, ${actionIndex}, 'to', this.value)">
                    ${actors.map(actor => 
                        `<option value="${actor}" ${action.to === actor ? 'selected' : ''}>${actor}</option>`
                    ).join('')}
                </select>
                <input type="text" class="message-input-inline" value="${action.text || ''}" 
                    onchange="window.editor.updateActionField('${branchType}', ${branchIndex}, ${actionIndex}, 'text', this.value)"
                    placeholder="メッセージ">
                <div class="action-buttons-inline">
                    <button class="btn-inline delete" onclick="window.editor.deleteActionFromBranch('${branchType}', ${branchIndex}, ${actionIndex})" title="削除">🗑️</button>
                    <button class="btn-inline question ${isUncertain ? 'active' : ''}" 
                        onclick="window.editor.toggleActionUncertain('${branchType}', ${branchIndex}, ${actionIndex}, this)" 
                        title="条件確認">？</button>
                </div>
            </div>
        `;
    }

    // アクションフィールド更新
    updateActionField(branchType, branchIndex, actionIndex, field, value) {
        // 'true'/'false'を'condition'として処理
        if (branchType === 'condition' || branchType === 'true' || branchType === 'false') {
            if (branchType === 'true' || branchIndex === 0) { // TRUE branch
                if (this.tempConditionData.trueBranch[actionIndex]) {
                    this.tempConditionData.trueBranch[actionIndex][field] = value;
                }
            } else if (branchType === 'false' || branchIndex === 1) { // FALSE branch
                if (this.tempConditionData.falseBranch[actionIndex]) {
                    this.tempConditionData.falseBranch[actionIndex][field] = value;
                }
            }
        } else if (branchType === 'loop') {
            if (this.tempLoopData.actions[actionIndex]) {
                this.tempLoopData.actions[actionIndex][field] = value;
            }
        } else if (branchType === 'parallel') {
            if (this.tempParallelData.branches[branchIndex] && 
                this.tempParallelData.branches[branchIndex][actionIndex]) {
                this.tempParallelData.branches[branchIndex][actionIndex][field] = value;
            }
        }
    }

    // アクションの不確実性トグル
    toggleActionUncertain(branchType, branchIndex, actionIndex, button) {
        const isActive = button.classList.contains('active');
        button.classList.toggle('active');
        
        this.updateActionField(branchType, branchIndex, actionIndex, 'uncertain', !isActive);
    }

    // ブランチからアクション削除
    deleteActionFromBranch(branchType, branchIndex, actionIndex) {
        if (!confirm('このアクションを削除しますか？')) return;
        
        // 'true'/'false'を'condition'として処理
        if (branchType === 'condition' || branchType === 'true' || branchType === 'false') {
            if (branchType === 'true' || branchIndex === 0) {
                this.tempConditionData.trueBranch.splice(actionIndex, 1);
            } else if (branchType === 'false' || branchIndex === 1) {
                this.tempConditionData.falseBranch.splice(actionIndex, 1);
            }
            this.refreshConditionModal();
        } else if (branchType === 'loop') {
            this.tempLoopData.actions.splice(actionIndex, 1);
            this.refreshLoopModal();
        } else if (branchType === 'parallel') {
            this.tempParallelData.branches[branchIndex].splice(actionIndex, 1);
            this.refreshParallelModal();
        }
    }

    // ブランチにアクション追加
    addActionToBranch(branchType, branchIndex) {
        const actors = this.getCurrentActors();
        
        // アクターが空の場合、デフォルトを使用
        if (actors.length === 0) {
            this.selectedActors.add('ユーザー');
            this.selectedActors.add('システム');
            actors.push('ユーザー', 'システム');
        }
        
        const newAction = {
            from: actors[0] || 'ユーザー',
            to: actors[1] || 'システム',
            text: '新しいアクション',
            async: false,
            uncertain: false
        };
        
        // 'condition'タイプの処理：branchIndexで分岐を決定
        if (branchType === 'condition') {
            if (branchIndex === 0) {
                this.tempConditionData.trueBranch.push(newAction);
            } else if (branchIndex === 1) {
                this.tempConditionData.falseBranch.push(newAction);
            }
            this.refreshConditionModal();
        } else if (branchType === 'loop') {
            this.tempLoopData.actions.push(newAction);
            this.refreshLoopModal();
        } else if (branchType === 'parallel') {
            if (!this.tempParallelData.branches[branchIndex]) {
                this.tempParallelData.branches[branchIndex] = [];
            }
            this.tempParallelData.branches[branchIndex].push(newAction);
            this.refreshParallelModal();
        }
    }

    // モーダル再描画用関数
    refreshConditionModal() {
        const modal = document.getElementById('editModal');
        if (modal && this.editingConditionIndex !== null) {
            // モーダルのコンテンツ部分だけ更新
            const trueBranchDiv = modal.querySelector('[data-branch-type="true"]');
            const falseBranchDiv = modal.querySelector('[data-branch-type="false"]');
            
            if (trueBranchDiv) {
                trueBranchDiv.innerHTML = this.renderBranchActions('true', 0, this.tempConditionData.trueBranch);
            }
            if (falseBranchDiv) {
                falseBranchDiv.innerHTML = this.renderBranchActions('false', 1, this.tempConditionData.falseBranch);
            }
        }
    }

    refreshLoopModal() {
        const modal = document.getElementById('editModal');
        if (modal && this.editingLoopIndex !== null) {
            const actionsDiv = modal.querySelector('[data-loop-actions]');
            if (actionsDiv) {
                actionsDiv.innerHTML = this.renderBranchActions('loop', 0, this.tempLoopData.actions);
            }
        }
    }

    refreshParallelModal() {
        const modal = document.getElementById('editModal');
        if (modal && this.editingParallelIndex !== null) {
            this.tempParallelData.branches.forEach((branch, index) => {
                const branchDiv = modal.querySelector(`[data-parallel-branch="${index}"]`);
                if (branchDiv) {
                    branchDiv.innerHTML = this.renderBranchActions('parallel', index, branch);
                }
            });
        }
    }

    // ブランチアクションのレンダリング
    renderBranchActions(type, branchIndex, actions) {
        // 'true'/'false'を'condition'に正規化してonclickに渡す
        const normalizedType = (type === 'true' || type === 'false') ? 'condition' : type;
        
        return `
            ${actions.map((action, actionIndex) => 
                this.createEditableActionItem(action, type, branchIndex, actionIndex)
            ).join('')}
            <button class="btn-add-action-inline" onclick="window.editor.addActionToBranch('${normalizedType}', ${branchIndex})">
                <span>➕</span>
                <span>アクション追加</span>
            </button>
        `;
    }

    // 条件分岐編集機能
    editCondition(index) {
        const action = this.actions[index];
        
        // 編集状態管理
        this.editingConditionIndex = index;
        this.tempConditionData = {
            type: action.conditionType,
            name: action.conditionName,
            trueBranch: [...(action.trueBranch || [])],
            falseBranch: [...(action.falseBranch || [])]
        };
        
        this.showConditionEditModal(action);
    }

    showConditionEditModal(action) {
        // モーダルオーバーレイの作成
        const modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog condition-edit-modal" style="width: 900px; max-width: 90%; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="flex-shrink: 0; padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🔀 条件分岐の編集</h3>
                    <button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div class="modal-body" style="flex: 1; padding: 20px; overflow-y: auto; max-height: calc(90vh - 140px);">
                    <div class="form-group" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px; color: #333;">条件名:</label>
                            <input type="text" id="edit-condition-name" value="${action.conditionName || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px; color: #333;">条件タイプ:</label>
                            <select id="edit-condition-type" style="width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="if-else" ${action.conditionType === 'if-else' ? 'selected' : ''}>if-else</option>
                                <option value="switch" ${action.conditionType === 'switch' ? 'selected' : ''}>switch</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="branch-section" style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
                        <h4 style="margin-bottom: 10px; color: #28a745; font-size: 16px;">✅ 真の場合</h4>
                        <div id="edit-true-branch" style="min-height: 50px; padding: 10px; background-color: #f8f9fa; border-radius: 4px;"></div>
                    </div>
                    
                    <div class="branch-section" style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
                        <h4 style="margin-bottom: 10px; color: #dc3545; font-size: 16px;">❌ 偽の場合</h4>
                        <div id="edit-false-branch" style="min-height: 50px; padding: 10px; background-color: #f8f9fa; border-radius: 4px;"></div>
                    </div>
                </div>
                <div class="modal-footer" style="flex-shrink: 0; padding: 15px 20px; border-top: 1px solid #e0e0e0; text-align: right; background: white;">
                    <button class="btn-save-condition" style="padding: 8px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">✓ 保存</button>
                    <button class="btn-cancel-condition" style="padding: 8px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">✗ キャンセル</button>
                </div>
            </div>
        `;
        
        // スタイル設定
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        document.body.appendChild(modal);
        
        // イベントリスナーの設定
        this.setupConditionEditEventListeners(modal);
        
        // 既存データの表示
        this.displayExistingBranches(action);
        
        // フォーカス設定
        setTimeout(() => {
            document.getElementById('edit-condition-name').focus();
        }, 100);
    }

    setupConditionEditEventListeners(modal) {
        // 保存ボタン
        modal.querySelector('.btn-save-condition').addEventListener('click', () => {
            this.saveConditionEdit();
        });
        
        // キャンセルボタン
        modal.querySelector('.btn-cancel-condition').addEventListener('click', () => {
            this.cancelConditionEdit();
        });
        
        // 閉じるボタン
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.cancelConditionEdit();
        });
        
        // モーダル外クリック
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cancelConditionEdit();
            }
        });
        
        // ESCキーでキャンセル
        document.addEventListener('keydown', this.handleConditionEditKeydown = (e) => {
            if (e.key === 'Escape') {
                this.cancelConditionEdit();
            }
        });
    }

    displayExistingBranches(action) {
        // 真の分岐表示（インライン編集可能）
        const trueBranchDiv = document.getElementById('edit-true-branch');
        trueBranchDiv.setAttribute('data-branch-type', 'true');
        
        if (action.trueBranch && action.trueBranch.length > 0) {
            trueBranchDiv.innerHTML = this.renderBranchActions('condition', 0, action.trueBranch);
        } else {
            trueBranchDiv.innerHTML = `
                <div style="color: #666; font-style: italic;">まだアクションがありません</div>
                <button class="btn-add-action-inline" onclick="window.editor.addActionToBranch('condition', 0)">
                    <span>➕</span>
                    <span>アクション追加</span>
                </button>
            `;
        }
        
        // 偽の分岐表示（インライン編集可能）
        const falseBranchDiv = document.getElementById('edit-false-branch');
        falseBranchDiv.setAttribute('data-branch-type', 'false');
        
        if (action.falseBranch && action.falseBranch.length > 0) {
            falseBranchDiv.innerHTML = this.renderBranchActions('condition', 1, action.falseBranch);
        } else {
            falseBranchDiv.innerHTML = `
                <div style="color: #666; font-style: italic;">まだアクションがありません</div>
                <button class="btn-add-action-inline" onclick="window.editor.addActionToBranch('condition', 1)">
                    <span>➕</span>
                    <span>アクション追加</span>
                </button>
            `;
        }
    }

    saveConditionEdit() {
        // バリデーション
        const name = document.getElementById('edit-condition-name').value.trim();
        if (!name) {
            this.showStatus('条件名を入力してください', 'error');
            return;
        }
        
        // データ更新
        this.actions[this.editingConditionIndex] = {
            type: 'condition',
            conditionType: document.getElementById('edit-condition-type').value,
            conditionName: name,
            trueBranch: [...this.tempConditionData.trueBranch],
            falseBranch: [...this.tempConditionData.falseBranch]
        };
        
        // UI更新
        this.updateActionList();
        this.updatePlantUML();
        
        // モーダル閉じる
        this.cancelConditionEdit();
        
        // ステータス表示
        this.showStatus('条件分岐を更新しました', 'success');
    }

    cancelConditionEdit() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // イベントリスナー削除
        if (this.handleConditionEditKeydown) {
            document.removeEventListener('keydown', this.handleConditionEditKeydown);
            this.handleConditionEditKeydown = null;
        }
        
        // 編集状態のリセット
        this.editingConditionIndex = null;
        this.tempConditionData = null;
    }

    // ループ編集機能
    editLoop(index) {
        const action = this.actions[index];
        
        // 編集状態管理
        this.editingLoopIndex = index;
        this.tempLoopData = {
            condition: action.loopCondition || '',
            actions: [...(action.loopActions || [])]
        };
        
        this.showLoopEditModal(action);
    }

    showLoopEditModal(action) {
        // モーダルオーバーレイの作成
        const modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog loop-edit-modal" style="width: 900px; max-width: 90%; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="flex-shrink: 0; padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🔁 ループの編集</h3>
                    <button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div class="modal-body" style="flex: 1; padding: 20px; overflow-y: auto; max-height: calc(90vh - 140px);">
                    <div class="form-group" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px; color: #333;">ループ条件:</label>
                        <input type="text" id="edit-loop-condition" value="${action.loopCondition || ''}" 
                               placeholder="例：在庫がある間" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    
                    <div class="loop-section" style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
                        <h4 style="margin-bottom: 10px; color: #17a2b8; font-size: 16px;">🔄 ループ内の処理</h4>
                        <div id="edit-loop-actions" style="min-height: 50px; padding: 10px; background-color: #f8f9fa; border-radius: 4px;"></div>
                    </div>
                </div>
                <div class="modal-footer" style="flex-shrink: 0; padding: 15px 20px; border-top: 1px solid #e0e0e0; text-align: right; background: white;">
                    <button class="btn-save-loop" style="padding: 8px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">✓ 保存</button>
                    <button class="btn-cancel-loop" style="padding: 8px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">✗ キャンセル</button>
                </div>
            </div>
        `;
        
        // スタイル設定
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        document.body.appendChild(modal);
        
        // イベントリスナーの設定
        this.setupLoopEditEventListeners(modal);
        
        // 既存データの表示
        this.displayExistingLoopActions(action);
        
        // フォーカス設定
        setTimeout(() => {
            document.getElementById('edit-loop-condition').focus();
        }, 100);
    }

    setupLoopEditEventListeners(modal) {
        // 保存ボタン
        modal.querySelector('.btn-save-loop').addEventListener('click', () => {
            this.saveLoopEdit();
        });
        
        // キャンセルボタン
        modal.querySelector('.btn-cancel-loop').addEventListener('click', () => {
            this.cancelLoopEdit();
        });
        
        // 閉じるボタン
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.cancelLoopEdit();
        });
        
        // モーダル外クリック
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cancelLoopEdit();
            }
        });
        
        // ESCキーでキャンセル
        document.addEventListener('keydown', this.handleLoopEditKeydown = (e) => {
            if (e.key === 'Escape') {
                this.cancelLoopEdit();
            }
        });
    }

    displayExistingLoopActions(action) {
        const loopActionsDiv = document.getElementById('edit-loop-actions');
        loopActionsDiv.setAttribute('data-loop-actions', 'true');
        
        if (action.loopActions && action.loopActions.length > 0) {
            loopActionsDiv.innerHTML = this.renderBranchActions('loop', 0, action.loopActions);
        } else {
            loopActionsDiv.innerHTML = `
                <div style="color: #666; font-style: italic;">まだアクションがありません</div>
                <button class="btn-add-action-inline" onclick="window.editor.addActionToBranch('loop', 0)">
                    <span>➕</span>
                    <span>アクション追加</span>
                </button>
            `;
        }
    }

    saveLoopEdit() {
        // バリデーション
        const condition = document.getElementById('edit-loop-condition').value.trim();
        if (!condition) {
            this.showStatus('ループ条件を入力してください', 'error');
            return;
        }
        
        // データ更新
        this.actions[this.editingLoopIndex] = {
            type: 'loop',
            loopCondition: condition,
            loopActions: [...this.tempLoopData.actions]
        };
        
        // UI更新
        this.updateActionList();
        this.updatePlantUML();
        
        // モーダル閉じる
        this.cancelLoopEdit();
        
        // ステータス表示
        this.showStatus('ループを更新しました', 'success');
    }

    cancelLoopEdit() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // イベントリスナー削除
        if (this.handleLoopEditKeydown) {
            document.removeEventListener('keydown', this.handleLoopEditKeydown);
            this.handleLoopEditKeydown = null;
        }
        
        // 編集状態のリセット
        this.editingLoopIndex = null;
        this.tempLoopData = null;
    }

    // 並行処理編集機能
    editParallel(index) {
        const action = this.actions[index];
        
        // 編集状態管理
        this.editingParallelIndex = index;
        this.tempParallelData = {
            branches: action.branches ? action.branches.map(branch => [...branch]) : [[], []]
        };
        
        this.showParallelEditModal(action);
    }

    showParallelEditModal(action) {
        // モーダルオーバーレイの作成
        const modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog parallel-edit-modal" style="width: 900px; max-width: 90%; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="flex-shrink: 0; padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">⚡ 並行処理の編集</h3>
                    <button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div class="modal-body" style="flex: 1; padding: 20px; overflow-y: auto; max-height: calc(90vh - 140px);">
                    <div class="form-group" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <label style="font-weight: bold; font-size: 14px; color: #333;">並行ブランチ管理:</label>
                            <span style="font-size: 12px; color: #666;">
                                💡 各ブランチは並行して実行される独立したアクションの流れです
                            </span>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: stretch;">
                            <button class="btn-add-parallel-branch" 
                                    style="flex: 1; padding: 10px 15px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; height: 38px;">
                                ➕ ブランチ追加
                            </button>
                            <button class="btn-remove-parallel-branch" 
                                    style="flex: 1; padding: 10px 15px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; height: 38px;">
                                ➖ ブランチ削除
                            </button>
                        </div>
                    </div>
                    
                    <div id="edit-parallel-branches" style="display: flex; flex-direction: column; gap: 15px;"></div>
                </div>
                <div class="modal-footer" style="flex-shrink: 0; padding: 15px 20px; border-top: 1px solid #e0e0e0; text-align: right; background: white;">
                    <button class="btn-save-parallel" style="padding: 8px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">✓ 保存</button>
                    <button class="btn-cancel-parallel" style="padding: 8px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">✗ キャンセル</button>
                </div>
            </div>
        `;
        
        // スタイル設定
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        document.body.appendChild(modal);
        
        // イベントリスナーの設定
        this.setupParallelEditEventListeners(modal);
        
        // 既存データの表示
        this.displayExistingParallelBranches(action);
        
        // フォーカス設定
        setTimeout(() => {
            const firstBranch = modal.querySelector('.parallel-branch');
            if (firstBranch) {
                firstBranch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    setupParallelEditEventListeners(modal) {
        // 保存ボタン
        modal.querySelector('.btn-save-parallel').addEventListener('click', () => {
            this.saveParallelEdit();
        });
        
        // キャンセルボタン
        modal.querySelector('.btn-cancel-parallel').addEventListener('click', () => {
            this.cancelParallelEdit();
        });
        
        // 閉じるボタン
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.cancelParallelEdit();
        });
        
        // ブランチ追加ボタン
        modal.querySelector('.btn-add-parallel-branch').addEventListener('click', () => {
            this.addParallelBranch();
        });
        
        // ブランチ削除ボタン
        modal.querySelector('.btn-remove-parallel-branch').addEventListener('click', () => {
            this.removeParallelBranch();
        });
        
        // モーダル外クリック
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cancelParallelEdit();
            }
        });
        
        // ESCキーでキャンセル
        document.addEventListener('keydown', this.handleParallelEditKeydown = (e) => {
            if (e.key === 'Escape') {
                this.cancelParallelEdit();
            }
        });
    }

    displayExistingParallelBranches(action) {
        const branchesDiv = document.getElementById('edit-parallel-branches');
        branchesDiv.innerHTML = '';
        
        const branches = action.branches || [[], []];
        branches.forEach((branch, branchIndex) => {
            const branchDiv = document.createElement('div');
            branchDiv.className = 'parallel-branch';
            branchDiv.setAttribute('data-parallel-branch', branchIndex);
            branchDiv.style.cssText = `
                padding: 15px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background-color: #ffffff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            `;
            
            const branchContent = branch.length > 0 
                ? this.renderBranchActions('parallel', branchIndex, branch)
                : `
                    <div style="color: #666; font-style: italic; padding: 10px; text-align: center;">まだアクションがありません</div>
                    <button class="btn-add-action-inline" onclick="window.editor.addActionToBranch('parallel', ${branchIndex})">
                        <span>➕</span>
                        <span>アクション追加</span>
                    </button>
                `;
            
            branchDiv.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #6f42c1;">
                    <h4 style="margin: 0; color: #6f42c1; font-size: 16px;">
                        🧵 ブランチ ${branchIndex + 1}
                    </h4>
                    <span style="background: #6f42c1; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                        ${branch.length} アクション
                    </span>
                </div>
                <div class="branch-actions" style="min-height: 80px; max-height: 400px; overflow-y: auto;">
                    ${branchContent}
                </div>
            `;
            
            branchesDiv.appendChild(branchDiv);
        });
    }

    addParallelBranch() {
        this.tempParallelData.branches.push([]);
        const action = { branches: this.tempParallelData.branches };
        this.displayExistingParallelBranches(action);
    }

    removeParallelBranch() {
        if (this.tempParallelData.branches.length > 1) {
            this.tempParallelData.branches.pop();
            const action = { branches: this.tempParallelData.branches };
            this.displayExistingParallelBranches(action);
        } else {
            this.showStatus('最低1つのブランチが必要です', 'error');
        }
    }

    saveParallelEdit() {
        // バリデーション
        if (this.tempParallelData.branches.length < 1) {
            this.showStatus('最低1つのブランチが必要です', 'error');
            return;
        }
        
        // データ更新
        this.actions[this.editingParallelIndex] = {
            type: 'parallel',
            branches: this.tempParallelData.branches.map(branch => [...branch])
        };
        
        // UI更新
        this.updateActionList();
        this.updatePlantUML();
        
        // モーダル閉じる
        this.cancelParallelEdit();
        
        // ステータス表示
        this.showStatus('並行処理を更新しました', 'success');
    }

    cancelParallelEdit() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // イベントリスナー削除
        if (this.handleParallelEditKeydown) {
            document.removeEventListener('keydown', this.handleParallelEditKeydown);
            this.handleParallelEditKeydown = null;
        }
        
        // 編集状態のリセット
        this.editingParallelIndex = null;
        this.tempParallelData = null;
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    const app = new PlantUMLEditor();
    // グローバルスコープに登録（インライン編集機能のため）
    window.editor = app;
    window.app = app; // グローバルにアクセス可能にする
    
    // カスタムパターンの読み込み
    const stored = localStorage.getItem('customPatterns');
    if (stored) {
        const customPatterns = JSON.parse(stored);
        app.patterns.push(...customPatterns);
    }
    
    // 技術用語説明ボタンのイベントリスナー
    const glossaryBtn = document.querySelector('.btn-glossary');
    const glossaryModal = document.getElementById('glossary-modal');
    const modalClose = glossaryModal.querySelector('.modal-close');
    const btnCloseGlossary = glossaryModal.querySelector('.btn-close-glossary');
    
    // 用語説明モーダルを開く
    if (glossaryBtn) {
        glossaryBtn.addEventListener('click', () => {
            glossaryModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // スクロール無効化
        });
    }
    
    // モーダルを閉じる
    const closeGlossaryModal = () => {
        glossaryModal.style.display = 'none';
        document.body.style.overflow = ''; // スクロール有効化
    };
    
    if (modalClose) {
        modalClose.addEventListener('click', closeGlossaryModal);
    }
    
    if (btnCloseGlossary) {
        btnCloseGlossary.addEventListener('click', closeGlossaryModal);
    }
    
    // モーダル外クリックで閉じる
    glossaryModal.addEventListener('click', (e) => {
        if (e.target === glossaryModal) {
            closeGlossaryModal();
        }
    });
    
    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && glossaryModal.style.display === 'block') {
            closeGlossaryModal();
        }
    });
    
    // 用語説明モーダルが開かれたときにPlantUML図を生成
    if (glossaryBtn) {
        glossaryBtn.addEventListener('click', () => {
            // 少し遅延してから図を生成（モーダル表示後）
            setTimeout(() => {
                generateGlossaryDiagrams();
            }, 100);
        });
    }
    
    // PlantUML図を生成する関数
    async function generateGlossaryDiagrams() {
        const previews = document.querySelectorAll('.plantuml-preview[data-plantuml-code]');
        
        for (const preview of previews) {
            const code = preview.dataset.plantumlCode;
            if (!code) continue;
            
            try {
                // Kroki APIでSVGを生成
                const response = await fetch('https://kroki.io/plantuml/svg', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: code
                });
                
                if (response.ok) {
                    const svg = await response.text();
                    preview.innerHTML = svg;
                    // SVGのサイズ調整
                    const svgElement = preview.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.maxWidth = '100%';
                        svgElement.style.height = 'auto';
                        svgElement.style.display = 'block';
                        svgElement.style.margin = '0 auto';
                    }
                } else {
                    preview.innerHTML = '<div class="error-text">図の生成に失敗しました</div>';
                }
            } catch (error) {
                console.error('PlantUML図生成エラー:', error);
                preview.innerHTML = '<div class="error-text">図の生成中にエラーが発生しました</div>';
            }
        }
    }
});

// SafePlantUMLSyncクラス - PlantUMLコード双方向同期機能
class SafePlantUMLSync {
    constructor(app) {
        this.app = app;
        this.parser = null;
        this.lastValidAST = null;
        this.syncEnabled = true;
        this.debounceTimer = null;
        this.debounceDelay = 500; // 500ms
        this.errorCallback = null;
        this.successCallback = null;
        
        // 新しいコンポーネントを追加
        this.astToGUIConverter = null;
        this.idManager = null;
        
        // PlantUMLASTParserが利用可能になったら初期化
        if (typeof PlantUMLASTParser !== 'undefined') {
            this.parser = new PlantUMLASTParser();
        }
        
        // ASTToGUIConverterの初期化（遅延ロード対応）
        this.initializeConverters();
    }
    
    // パーサーの初期化（遅延ロード対応）
    initializeParser() {
        if (!this.parser && typeof PlantUMLASTParser !== 'undefined') {
            this.parser = new PlantUMLASTParser();
            console.log('PlantUML AST Parser initialized');
        }
        return this.parser !== null;
    }
    
    // コンバーターの初期化（遅延ロード対応）
    initializeConverters() {
        try {
            // ASTToGUIConverterの初期化
            if (!this.astToGUIConverter && typeof ASTToGUIConverter !== 'undefined') {
                this.astToGUIConverter = new ASTToGUIConverter(this.app);
                this.idManager = this.astToGUIConverter.getIdManager();
                console.log('ASTToGUIConverter initialized');
            }
        } catch (error) {
            console.warn('Converter initialization failed:', error);
        }
    }
    
    // コールバック設定
    setErrorCallback(callback) {
        this.errorCallback = callback;
    }
    
    setSuccessCallback(callback) {
        this.successCallback = callback;
    }
    
    // 同期有効/無効の切り替え
    setSyncEnabled(enabled) {
        this.syncEnabled = enabled;
        console.log(`PlantUML Sync ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // PlantUMLコードの安全な解析
    safeParse(code) {
        if (!this.initializeParser()) {
            console.warn('PlantUML AST Parser not available');
            return null;
        }
        
        try {
            const result = this.parser.parse(code);
            
            if (result.errors.length === 0) {
                this.lastValidAST = result.ast;
                if (this.successCallback) {
                    this.successCallback(result);
                }
                return result;
            } else {
                console.warn('PlantUML parsing errors:', result.errors);
                if (this.errorCallback) {
                    this.errorCallback(result.errors);
                }
                return result;
            }
        } catch (error) {
            console.error('PlantUML parsing failed:', error);
            if (this.errorCallback) {
                this.errorCallback([{
                    message: error.message,
                    line: 0,
                    column: 0,
                    position: 0
                }]);
            }
            return null;
        }
    }
    
    // デバウンス機能付きの解析
    debouncedParse(code) {
        if (!this.syncEnabled) return;
        
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.safeParse(code);
        }, this.debounceDelay);
    }
    
    // 最後の有効なASTを取得
    getLastValidAST() {
        return this.lastValidAST;
    }
    
    // パース結果の統計情報を取得
    getStatistics() {
        if (!this.parser) return null;
        return this.parser.getStatistics();
    }
    
    // エラー状態をチェック
    hasErrors() {
        if (!this.parser) return false;
        return this.parser.hasErrors();
    }
    
    // エラー一覧を取得
    getErrors() {
        if (!this.parser) return [];
        return this.parser.getErrors();
    }
    
    // AST を JSON 形式で取得
    getASTAsJSON() {
        if (!this.parser) return null;
        return this.parser.toJSON();
    }
    
    // ASTからGUIへの同期（Phase 2の新機能）
    syncFromAST(ast) {
        if (!this.syncEnabled) {
            console.log('Sync disabled, skipping AST to GUI conversion');
            return false;
        }
        
        try {
            // コンバーターの初期化確認
            this.initializeConverters();
            
            if (!this.astToGUIConverter) {
                console.warn('ASTToGUIConverter not available');
                return false;
            }
            
            // ASTをGUIアクションに変換
            const actions = this.astToGUIConverter.convertToActions(ast);
            
            if (!actions || actions.length === 0) {
                console.log('No actions converted from AST');
                return true; // 空のASTも有効
            }
            
            // アプリケーションのアクションリストを更新
            if (this.app && this.app.actions) {
                // 既存のアクションをクリア
                this.app.actions.length = 0;
                
                // 新しいアクションを追加
                this.app.actions.push(...actions);
                
                // UIの更新
                if (typeof this.app.updateActionList === 'function') {
                    this.app.updateActionList();
                }
                
                console.log(`Synced ${actions.length} actions from AST to GUI`);
            }
            
            return true;
            
        } catch (error) {
            console.error('AST to GUI sync failed:', error);
            if (this.errorCallback) {
                this.errorCallback([{
                    message: `AST sync error: ${error.message}`,
                    line: 0,
                    column: 0,
                    position: 0
                }]);
            }
            return false;
        }
    }
    
    // PlantUMLコードからGUIへの完全同期
    syncCodeToGUI(code) {
        try {
            // コードをパース
            const parseResult = this.safeParse(code);
            
            if (!parseResult || !parseResult.ast) {
                console.warn('Code parsing failed, cannot sync to GUI');
                return false;
            }
            
            // ASTからGUIに同期
            return this.syncFromAST(parseResult.ast);
            
        } catch (error) {
            console.error('Code to GUI sync failed:', error);
            return false;
        }
    }
    
    // コンバーターの統計情報を取得
    getConverterStatistics() {
        if (!this.astToGUIConverter) {
            return null;
        }
        
        return this.astToGUIConverter.getStatistics();
    }
    
    // IDマネージャーを取得
    getIdManager() {
        return this.idManager;
    }
    
    // デバッグ用: パーサーの状態を出力
    debugInfo() {
        return {
            parserAvailable: this.parser !== null,
            converterAvailable: this.astToGUIConverter !== null,
            idManagerAvailable: this.idManager !== null,
            syncEnabled: this.syncEnabled,
            hasValidAST: this.lastValidAST !== null,
            hasErrors: this.hasErrors(),
            errorCount: this.getErrors().length,
            statistics: this.getStatistics(),
            converterStats: this.getConverterStatistics()
        };
    }
}

// ================================================
// Phase 4: 品質保証と最適化システム統合
// ================================================

/**
 * Phase 4 統合システムクラス
 * ErrorHandler, PerformanceOptimizer, ValidationEngine を統合
 */
class Phase4IntegrationSystem {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.systems = {
            errorHandler: null,
            performanceOptimizer: null,
            validationEngine: null
        };
        
        this.config = {
            enableAutoValidation: true,
            enablePerformanceMonitoring: true,
            enableErrorRecovery: true,
            validationMode: 'moderate', // strict, moderate, lenient
            optimizationLevel: 'balanced' // aggressive, balanced, conservative
        };
        
        // 統計情報
        this.stats = {
            totalOperations: 0,
            validationsPassed: 0,
            validationsFailed: 0,
            errorsHandled: 0,
            optimizationsApplied: 0,
            averagePerformance: 0
        };
        
        this.initialize();
    }

    /**
     * Phase 4システムの初期化
     */
    async initialize() {
        try {
            console.log('🔧 Phase 4 Integration System initializing...');
            
            // 各システムの初期化
            await this.initializeErrorHandler();
            await this.initializePerformanceOptimizer();
            await this.initializeValidationEngine();
            
            // 統合システムのセットアップ
            this.setupIntegration();
            
            this.initialized = true;
            console.log('✅ Phase 4 Integration System initialized successfully');
            
            // 初期化完了の通知
            if (this.app && typeof this.app.showStatus === 'function') {
                this.app.showStatus('Phase 4 品質保証システムが初期化されました', 'success');
            }
            
        } catch (error) {
            console.error('❌ Phase 4 initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * エラーハンドラーの初期化
     */
    async initializeErrorHandler() {
        try {
            if (typeof createErrorHandler === 'function') {
                this.systems.errorHandler = createErrorHandler();
                
                // エラーリスナーの設定
                this.systems.errorHandler.addErrorListener((error) => {
                    this.handleSystemError(error);
                });
                
                console.log('✅ ErrorHandler initialized');
            } else if (window.globalErrorHandler) {
                this.systems.errorHandler = window.globalErrorHandler;
                console.log('✅ ErrorHandler loaded from global');
            } else {
                console.warn('⚠️ ErrorHandler not available');
            }
        } catch (error) {
            console.error('ErrorHandler initialization failed:', error);
        }
    }

    /**
     * パフォーマンス最適化の初期化
     */
    async initializePerformanceOptimizer() {
        try {
            if (typeof createPerformanceOptimizer === 'function') {
                this.systems.performanceOptimizer = createPerformanceOptimizer();
                console.log('✅ PerformanceOptimizer initialized');
            } else if (window.globalPerformanceOptimizer) {
                this.systems.performanceOptimizer = window.globalPerformanceOptimizer;
                console.log('✅ PerformanceOptimizer loaded from global');
            } else {
                console.warn('⚠️ PerformanceOptimizer not available');
            }
        } catch (error) {
            console.error('PerformanceOptimizer initialization failed:', error);
        }
    }

    /**
     * バリデーションエンジンの初期化
     */
    async initializeValidationEngine() {
        try {
            if (typeof createValidationEngine === 'function') {
                this.systems.validationEngine = createValidationEngine({
                    level: this.config.validationMode,
                    realTime: this.config.enableAutoValidation,
                    autoCorrect: true
                });
                console.log('✅ ValidationEngine initialized');
            } else if (window.globalValidationEngine) {
                this.systems.validationEngine = window.globalValidationEngine;
                console.log('✅ ValidationEngine loaded from global');
            } else {
                console.warn('⚠️ ValidationEngine not available');
            }
        } catch (error) {
            console.error('ValidationEngine initialization failed:', error);
        }
    }

    /**
     * 統合システムのセットアップ
     */
    setupIntegration() {
        // アプリケーションメソッドの拡張
        this.enhanceAppMethods();
        
        // リアルタイム監視の開始
        this.startRealTimeMonitoring();
        
        // パフォーマンス追跡の開始
        this.startPerformanceTracking();
        
        // 自動最適化の設定
        this.setupAutoOptimization();
        
        // ユーザーインターフェースの拡張
        this.enhanceUI();
    }

    /**
     * アプリケーションメソッドの拡張
     */
    enhanceAppMethods() {
        if (!this.app) return;
        
        // 元のupdatePlantUMLメソッドをラップ
        const originalUpdatePlantUML = this.app.updatePlantUML;
        if (originalUpdatePlantUML) {
            this.app.updatePlantUML = async () => {
                const startTime = performance.now();
                
                try {
                    // バリデーション実行
                    if (this.config.enableAutoValidation && this.systems.validationEngine) {
                        const input = document.getElementById('text-input')?.value || '';
                        const validationResult = await this.validateInput(input);
                        
                        if (!validationResult.isValid && validationResult.errors.length > 0) {
                            this.displayValidationErrors(validationResult.errors);
                            return; // バリデーションエラーがある場合は処理を停止
                        }
                    }
                    
                    // 元の処理を実行
                    await originalUpdatePlantUML.call(this.app);
                    
                    // パフォーマンス追跡
                    const endTime = performance.now();
                    this.trackPerformance('updatePlantUML', endTime - startTime);
                    
                    this.stats.totalOperations++;
                    
                } catch (error) {
                    // エラーハンドリング
                    this.handleError({
                        message: `PlantUML update failed: ${error.message}`,
                        type: 'render',
                        severity: 'high',
                        source: 'updatePlantUML',
                        error: error
                    });
                }
            };
        }
        
        // 元のshowStatusメソッドを拡張
        const originalShowStatus = this.app.showStatus;
        if (originalShowStatus) {
            this.app.showStatus = (message, type = 'info', duration = 3000) => {
                // 元の処理を実行
                originalShowStatus.call(this.app, message, type, duration);
                
                // エラーの場合はエラーハンドラーに記録
                if (type === 'error' && this.systems.errorHandler) {
                    this.handleError({
                        message: message,
                        type: 'user_notification',
                        severity: 'medium',
                        source: 'showStatus'
                    });
                }
            };
        }
    }

    /**
     * リアルタイム監視の開始
     */
    startRealTimeMonitoring() {
        if (!this.config.enableAutoValidation) return;
        
        // テキスト入力の監視
        const textInput = document.getElementById('text-input');
        if (textInput && this.systems.validationEngine) {
            // リアルタイムバリデーションの設定
            textInput.addEventListener('input', (e) => {
                this.systems.validationEngine.validateRealTime(
                    e.target.value,
                    (result) => {
                        this.handleValidationResult(result);
                    }
                );
            });
        }
        
        // メモリ使用量の監視
        setInterval(() => {
            this.checkSystemHealth();
        }, 10000); // 10秒間隔
    }

    /**
     * パフォーマンス追跡の開始
     */
    startPerformanceTracking() {
        // パフォーマンス観察者の設定
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.name.includes('plantuml') || entry.name.includes('render')) {
                        this.trackPerformance(entry.name, entry.duration);
                    }
                });
            });
            
            try {
                observer.observe({ entryTypes: ['measure', 'navigation'] });
            } catch (error) {
                console.warn('Performance observer setup failed:', error);
            }
        }
    }

    /**
     * 自動最適化の設定
     */
    setupAutoOptimization() {
        if (!this.systems.performanceOptimizer) return;
        
        // 定期的な最適化
        setInterval(async () => {
            if (this.shouldRunOptimization()) {
                await this.runOptimization();
            }
        }, 30000); // 30秒間隔
        
        // メモリ使用量による最適化
        if (performance.memory) {
            setInterval(() => {
                const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
                if (memoryUsage > 100) { // 100MB以上の場合
                    this.runOptimization('memory');
                }
            }, 15000); // 15秒間隔
        }
    }

    /**
     * ユーザーインターフェースの拡張
     */
    enhanceUI() {
        // Phase 4 ステータス表示の追加
        this.addPhase4StatusDisplay();
        
        // 品質メトリクスの表示
        this.addQualityMetrics();
        
        // 最適化ボタンの追加
        this.addOptimizationControls();
    }

    /**
     * Phase 4 ステータス表示の追加
     */
    addPhase4StatusDisplay() {
        const controlsContainer = document.querySelector('.controls-container');
        if (!controlsContainer) return;
        
        const statusDiv = document.createElement('div');
        statusDiv.id = 'phase4-status';
        statusDiv.className = 'phase4-status';
        statusDiv.innerHTML = `
            <div class="phase4-header">
                <h4>🔧 Phase 4 品質保証システム</h4>
                <div class="phase4-toggle">
                    <button id="phase4-toggle-btn" class="btn-small" onclick="phase4System.toggleSystem()">
                        有効
                    </button>
                </div>
            </div>
            <div class="phase4-metrics" id="phase4-metrics">
                <div class="metric">
                    <span class="metric-label">検証:</span>
                    <span class="metric-value" id="validation-status">待機中</span>
                </div>
                <div class="metric">
                    <span class="metric-label">パフォーマンス:</span>
                    <span class="metric-value" id="performance-status">正常</span>
                </div>
                <div class="metric">
                    <span class="metric-label">エラー:</span>
                    <span class="metric-value" id="error-count">0</span>
                </div>
            </div>
        `;
        
        // スタイルの追加
        const style = document.createElement('style');
        style.textContent = `
            .phase4-status {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
                box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
            }
            .phase4-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .phase4-header h4 {
                margin: 0;
                font-size: 14px;
            }
            .phase4-toggle .btn-small {
                padding: 4px 12px;
                font-size: 12px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .phase4-toggle .btn-small:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            .phase4-metrics {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
                font-size: 12px;
            }
            .metric {
                display: flex;
                justify-content: space-between;
            }
            .metric-label {
                opacity: 0.9;
            }
            .metric-value {
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
        
        controlsContainer.appendChild(statusDiv);
        
        // メトリクスの定期更新
        setInterval(() => {
            this.updatePhase4Display();
        }, 2000);
    }

    /**
     * 品質メトリクスの表示
     */
    addQualityMetrics() {
        // 実装は簡略化（必要に応じて拡張）
        console.log('Quality metrics display added');
    }

    /**
     * 最適化コントロールの追加
     */
    addOptimizationControls() {
        // 実装は簡略化（必要に応じて拡張）
        console.log('Optimization controls added');
    }

    /**
     * 入力の検証
     */
    async validateInput(input) {
        if (!this.systems.validationEngine) {
            return { isValid: true, errors: [], warnings: [] };
        }
        
        try {
            const result = await this.systems.validationEngine.validate(input);
            
            // 統計の更新
            if (result.isValid) {
                this.stats.validationsPassed++;
            } else {
                this.stats.validationsFailed++;
            }
            
            return result;
        } catch (error) {
            this.handleError({
                message: `Validation failed: ${error.message}`,
                type: 'validation',
                severity: 'medium',
                source: 'validateInput',
                error: error
            });
            
            return { isValid: false, errors: [{ message: error.message }], warnings: [] };
        }
    }

    /**
     * バリデーション結果の処理
     */
    handleValidationResult(result) {
        // エラー表示の更新
        if (result.errors && result.errors.length > 0) {
            this.displayValidationErrors(result.errors);
        } else {
            this.clearValidationErrors();
        }
        
        // 警告の表示
        if (result.warnings && result.warnings.length > 0) {
            this.displayValidationWarnings(result.warnings);
        }
        
        // 提案の表示
        if (result.suggestions && result.suggestions.length > 0) {
            this.displayValidationSuggestions(result.suggestions);
        }
    }

    /**
     * バリデーションエラーの表示
     */
    displayValidationErrors(errors) {
        // エラー表示エリアの取得または作成
        let errorDisplay = document.getElementById('validation-errors');
        if (!errorDisplay) {
            errorDisplay = document.createElement('div');
            errorDisplay.id = 'validation-errors';
            errorDisplay.className = 'validation-errors';
            
            const textInput = document.getElementById('text-input');
            if (textInput && textInput.parentNode) {
                textInput.parentNode.insertBefore(errorDisplay, textInput.nextSibling);
            }
        }
        
        errorDisplay.innerHTML = `
            <div class="error-header">⚠️ 入力エラー</div>
            ${errors.map(error => `
                <div class="error-item">
                    <span class="error-message">${error.message}</span>
                    ${error.line ? `<span class="error-location">(行 ${error.line})</span>` : ''}
                </div>
            `).join('')}
        `;
        
        errorDisplay.style.display = 'block';
    }

    /**
     * バリデーションエラーのクリア
     */
    clearValidationErrors() {
        const errorDisplay = document.getElementById('validation-errors');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }

    /**
     * バリデーション警告の表示
     */
    displayValidationWarnings(warnings) {
        // 簡略化実装
        console.log('Validation warnings:', warnings);
    }

    /**
     * バリデーション提案の表示
     */
    displayValidationSuggestions(suggestions) {
        // 簡略化実装
        console.log('Validation suggestions:', suggestions);
    }

    /**
     * エラーの処理
     */
    handleError(errorData) {
        if (this.systems.errorHandler) {
            this.systems.errorHandler.handleError(errorData);
            this.stats.errorsHandled++;
        } else {
            console.error('Error (no handler):', errorData);
        }
    }

    /**
     * システムエラーの処理
     */
    handleSystemError(error) {
        console.error('System error detected:', error);
        
        // 自動復旧の試行
        if (this.config.enableErrorRecovery) {
            this.attemptRecovery(error);
        }
    }

    /**
     * 自動復旧の試行
     */
    async attemptRecovery(error) {
        try {
            console.log('Attempting automatic recovery...');
            
            // システムの再初期化を試行
            if (error.type === 'validation' && !this.systems.validationEngine) {
                await this.initializeValidationEngine();
            } else if (error.type === 'performance' && !this.systems.performanceOptimizer) {
                await this.initializePerformanceOptimizer();
            }
            
            console.log('Recovery attempt completed');
        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
        }
    }

    /**
     * パフォーマンスの追跡
     */
    trackPerformance(operation, duration) {
        // 平均パフォーマンスの更新
        const currentAvg = this.stats.averagePerformance;
        const totalOps = this.stats.totalOperations || 1;
        
        this.stats.averagePerformance = (currentAvg * (totalOps - 1) + duration) / totalOps;
        
        // 遅いオペレーションの検出
        if (duration > 1000) { // 1秒以上
            console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
            
            // 最適化のトリガー
            if (this.systems.performanceOptimizer) {
                setTimeout(() => this.runOptimization('performance'), 100);
            }
        }
    }

    /**
     * システムヘルスチェック
     */
    checkSystemHealth() {
        // メモリ使用量のチェック
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
            
            if (memoryUsage > 150) { // 150MB以上
                console.warn('High memory usage detected:', memoryUsage + 'MB');
                this.runOptimization('memory');
            }
        }
        
        // エラー率のチェック
        const errorRate = this.stats.totalOperations > 0 ? 
            this.stats.errorsHandled / this.stats.totalOperations : 0;
        
        if (errorRate > 0.1) { // 10%以上
            console.warn('High error rate detected:', Math.round(errorRate * 100) + '%');
        }
    }

    /**
     * 最適化が必要かどうかの判定
     */
    shouldRunOptimization() {
        // パフォーマンスの基準
        if (this.stats.averagePerformance > 500) return true;
        
        // メモリ使用量の基準
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
            if (memoryUsage > 100) return true;
        }
        
        // エラー率の基準
        const errorRate = this.stats.totalOperations > 0 ? 
            this.stats.errorsHandled / this.stats.totalOperations : 0;
        if (errorRate > 0.05) return true;
        
        return false;
    }

    /**
     * 最適化の実行
     */
    async runOptimization(type = 'general') {
        if (!this.systems.performanceOptimizer) return;
        
        try {
            console.log(`Running ${type} optimization...`);
            
            const result = await this.systems.performanceOptimizer.optimize({
                target: type,
                level: this.config.optimizationLevel
            });
            
            if (result.success) {
                this.stats.optimizationsApplied++;
                console.log('Optimization completed successfully');
                
                if (this.app && typeof this.app.showStatus === 'function') {
                    this.app.showStatus('システム最適化が完了しました', 'success');
                }
            } else {
                console.warn('Optimization failed:', result.error);
            }
        } catch (error) {
            console.error('Optimization error:', error);
            this.handleError({
                message: `Optimization failed: ${error.message}`,
                type: 'performance',
                severity: 'medium',
                source: 'runOptimization',
                error: error
            });
        }
    }

    /**
     * Phase 4 表示の更新
     */
    updatePhase4Display() {
        // バリデーション状態の更新
        const validationStatus = document.getElementById('validation-status');
        if (validationStatus) {
            const successRate = this.stats.totalOperations > 0 ? 
                Math.round((this.stats.validationsPassed / (this.stats.validationsPassed + this.stats.validationsFailed)) * 100) : 100;
            validationStatus.textContent = this.systems.validationEngine ? `${successRate}%` : '無効';
        }
        
        // パフォーマンス状態の更新
        const performanceStatus = document.getElementById('performance-status');
        if (performanceStatus) {
            const avgTime = Math.round(this.stats.averagePerformance);
            if (avgTime < 100) {
                performanceStatus.textContent = '優秀';
                performanceStatus.style.color = '#4CAF50';
            } else if (avgTime < 500) {
                performanceStatus.textContent = '良好';
                performanceStatus.style.color = '#FF9800';
            } else {
                performanceStatus.textContent = '要最適化';
                performanceStatus.style.color = '#F44336';
            }
        }
        
        // エラー数の更新
        const errorCount = document.getElementById('error-count');
        if (errorCount) {
            errorCount.textContent = this.stats.errorsHandled;
            if (this.stats.errorsHandled > 10) {
                errorCount.style.color = '#F44336';
            } else if (this.stats.errorsHandled > 5) {
                errorCount.style.color = '#FF9800';
            } else {
                errorCount.style.color = '#4CAF50';
            }
        }
    }

    /**
     * システムの有効/無効切り替え
     */
    toggleSystem() {
        const currentState = this.config.enableAutoValidation;
        this.config.enableAutoValidation = !currentState;
        this.config.enablePerformanceMonitoring = !currentState;
        this.config.enableErrorRecovery = !currentState;
        
        const toggleBtn = document.getElementById('phase4-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = this.config.enableAutoValidation ? '有効' : '無効';
            toggleBtn.style.background = this.config.enableAutoValidation ? 
                'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
        }
        
        if (this.app && typeof this.app.showStatus === 'function') {
            this.app.showStatus(
                `Phase 4 システムが${this.config.enableAutoValidation ? '有効' : '無効'}になりました`,
                this.config.enableAutoValidation ? 'success' : 'warning'
            );
        }
        
        console.log(`Phase 4 system ${this.config.enableAutoValidation ? 'enabled' : 'disabled'}`);
    }

    /**
     * 初期化エラーの処理
     */
    handleInitializationError(error) {
        console.error('Phase 4 initialization error:', error);
        
        if (this.app && typeof this.app.showStatus === 'function') {
            this.app.showStatus('Phase 4 システムの初期化に失敗しました', 'error');
        }
        
        // 部分的な初期化状態でも動作を続行
        this.initialized = 'partial';
    }

    /**
     * システム統計の取得
     */
    getStats() {
        return {
            ...this.stats,
            systems: {
                errorHandler: this.systems.errorHandler ? this.systems.errorHandler.getMetrics() : null,
                performanceOptimizer: this.systems.performanceOptimizer ? this.systems.performanceOptimizer.getMetrics() : null,
                validationEngine: this.systems.validationEngine ? this.systems.validationEngine.getMetrics() : null
            },
            config: this.config,
            initialized: this.initialized
        };
    }

    /**
     * 設定の更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Phase 4 config updated:', this.config);
        
        // 設定変更に基づくシステムの再設定
        if (this.systems.validationEngine && 'validationMode' in newConfig) {
            this.systems.validationEngine.setValidationLevel(newConfig.validationMode);
        }
    }

    /**
     * デバッグ情報の取得
     */
    getDebugInfo() {
        return {
            initialized: this.initialized,
            systems: Object.keys(this.systems).map(key => ({
                name: key,
                available: this.systems[key] !== null,
                status: this.systems[key] ? 'initialized' : 'not_available'
            })),
            stats: this.getStats(),
            config: this.config
        };
    }
}

// ページ離脱時の確認
window.addEventListener('beforeunload', (e) => {
    const app = window.app;
    if (app && (app.selectedActors.size > 0 || app.actions.length > 0)) {
        e.preventDefault();
        e.returnValue = '編集中の内容が失われます。よろしいですか？';
    }
});

// Phase 4 システムのグローバル初期化
window.addEventListener('DOMContentLoaded', () => {
    // メインアプリが初期化された後に Phase 4 を初期化
    setTimeout(() => {
        if (window.app) {
            window.phase4System = new Phase4IntegrationSystem(window.app);
            console.log('🎯 Phase 4 Integration System ready');
        }
    }, 1000); // 1秒後に初期化
});