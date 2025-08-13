/**
 * IntegrationManager - 統合管理クラス
 * PlantUMLエディタのすべてのモジュールを統合する中央管理システム
 * フリーズ問題解決のための段階的初期化とセーフモード連携を提供
 */

class IntegrationManager {
    constructor() {
        this.isInitialized = false;
        this.initializationPhase = 'none';
        this.modules = {};
        this.eventQueue = [];
        this.processingQueue = false;
        this.diagnosticMode = null;
        this.safeMode = null;
        this.eventManager = null;
        this.asyncParser = null;
        this.errorCount = 0;
        this.maxErrorCount = 10;
        
        // 初期化段階の定義
        this.PHASES = {
            CORE: 'core',
            PARSER: 'parser',
            UI: 'ui',
            ADVANCED: 'advanced',
            COMPLETE: 'complete'
        };
        
        // パフォーマンス監視
        this.performanceMetrics = {
            initStartTime: null,
            initEndTime: null,
            lastUIUpdate: Date.now(),
            processingTimes: []
        };
        
        this.bindMethods();
    }

    /**
     * メソッドのバインド
     */
    bindMethods() {
        this.handleError = this.handleError.bind(this);
        this.processEventQueue = this.processEventQueue.bind(this);
        this.handleUIUpdate = this.handleUIUpdate.bind(this);
    }

    /**
     * 統合システムの初期化
     * @param {Object} config 初期化設定
     * @returns {Promise<boolean>} 初期化成功可否
     */
    async initialize(config = {}) {
        console.log('🚀 IntegrationManager: 初期化開始');
        
        try {
            this.performanceMetrics.initStartTime = performance.now();
            
            // セーフモードの確認
            const shouldUseSafeMode = config.safeMode || this.shouldUseSafeMode();
            
            if (shouldUseSafeMode) {
                console.log('⚠️ セーフモード で初期化します');
                await this.initializeSafeMode();
            } else {
                console.log('🔧 通常モード で初期化します');
                await this.initializeNormalMode();
            }
            
            this.performanceMetrics.initEndTime = performance.now();
            const initTime = this.performanceMetrics.initEndTime - this.performanceMetrics.initStartTime;
            console.log(`✅ IntegrationManager: 初期化完了 (${Math.round(initTime)}ms)`);
            
            this.isInitialized = true;
            this.initializationPhase = this.PHASES.COMPLETE;
            
            // 初期化完了イベントの発行
            this.emitEvent('integration:initialized', { 
                safeMode: shouldUseSafeMode, 
                initTime 
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ IntegrationManager: 初期化失敗', error);
            this.handleError(error);
            
            // フォールバック: セーフモードでの再初期化
            if (!shouldUseSafeMode) {
                console.log('🔄 セーフモードでの再初期化を試行します');
                return await this.initializeSafeMode();
            }
            
            return false;
        }
    }

    /**
     * セーフモードでの初期化
     */
    async initializeSafeMode() {
        this.initializationPhase = this.PHASES.CORE;
        
        // Phase 1: コアモジュールの初期化
        await this.initializeCore();
        
        // Phase 2: セーフモードの設定
        this.safeMode = new SafeMode();
        await this.safeMode.initialize();
        this.modules.safeMode = this.safeMode;
        
        // Phase 3: 基本的なパーサーのみ
        this.initializationPhase = this.PHASES.PARSER;
        this.asyncParser = new AsyncParser({ safeMode: true });
        await this.asyncParser.initialize();
        this.modules.asyncParser = this.asyncParser;
        
        // Phase 4: 最小限のUI
        this.initializationPhase = this.PHASES.UI;
        await this.initializeMinimalUI();
        
        console.log('✅ セーフモード初期化完了');
    }

    /**
     * 通常モードでの初期化
     */
    async initializeNormalMode() {
        // Phase 1: コアモジュールの初期化
        this.initializationPhase = this.PHASES.CORE;
        await this.initializeCore();
        
        // Phase 2: パーサーの初期化
        this.initializationPhase = this.PHASES.PARSER;
        await this.initializeParser();
        
        // Phase 3: UI関連の初期化
        this.initializationPhase = this.PHASES.UI;
        await this.initializeUI();
        
        // Phase 4: 高度な機能の初期化
        this.initializationPhase = this.PHASES.ADVANCED;
        await this.initializeAdvancedFeatures();
    }

    /**
     * コアモジュールの初期化
     */
    async initializeCore() {
        console.log('📦 コアモジュール初期化中...');
        
        // エラーハンドリングの設定
        window.addEventListener('error', this.handleError);
        window.addEventListener('unhandledrejection', this.handleError);
        
        // DiagnosticModeの初期化
        if (typeof DiagnosticMode !== 'undefined') {
            this.diagnosticMode = new DiagnosticMode();
            await this.diagnosticMode.initialize();
            this.modules.diagnosticMode = this.diagnosticMode;
        }
        
        // EventManagerの初期化
        if (typeof EventManager !== 'undefined') {
            this.eventManager = new EventManager();
            await this.eventManager.initialize();
            this.modules.eventManager = this.eventManager;
            
            // イベントキューの処理を開始
            this.eventManager.on('*', this.handleUIUpdate);
        }
        
        console.log('✅ コアモジュール初期化完了');
    }

    /**
     * パーサーの初期化
     */
    async initializeParser() {
        console.log('🔍 パーサー初期化中...');
        
        if (typeof AsyncParser !== 'undefined') {
            this.asyncParser = new AsyncParser({
                safeMode: false,
                maxProcessingTime: 5000,
                enableWorker: true
            });
            await this.asyncParser.initialize();
            this.modules.asyncParser = this.asyncParser;
            
            // パーサーイベントのリスナー設定
            if (this.eventManager) {
                this.eventManager.on('parser:request', (data) => {
                    this.handleParseRequest(data);
                });
            }
        }
        
        console.log('✅ パーサー初期化完了');
    }

    /**
     * UI関連の初期化
     */
    async initializeUI() {
        console.log('🎨 UI関連初期化中...');
        
        // UI要素の準備
        await this.prepareUIElements();
        
        // イベントリスナーの設定
        this.setupUIEventListeners();
        
        // パターン選択機能の安全な初期化
        await this.initializePatternSelection();
        
        console.log('✅ UI関連初期化完了');
    }

    /**
     * 高度な機能の初期化
     */
    async initializeAdvancedFeatures() {
        console.log('⚡ 高度な機能初期化中...');
        
        // リアルタイム同期
        if (typeof RealtimeSyncManager !== 'undefined') {
            const realtimeSync = new RealtimeSyncManager();
            await realtimeSync.initialize();
            this.modules.realtimeSync = realtimeSync;
        }
        
        // パフォーマンス最適化
        if (typeof PerformanceOptimizer !== 'undefined') {
            const optimizer = new PerformanceOptimizer();
            await optimizer.initialize();
            this.modules.optimizer = optimizer;
        }
        
        console.log('✅ 高度な機能初期化完了');
    }

    /**
     * 最小限のUI初期化（セーフモード用）
     */
    async initializeMinimalUI() {
        console.log('🎨 最小限UI初期化中...');
        
        // 基本的なUI要素のみ準備
        const essentialElements = ['textarea', 'preview', 'pattern-list'];
        for (const elementId of essentialElements) {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'block';
            }
        }
        
        // 基本的なイベントリスナーのみ設定
        this.setupBasicEventListeners();
        
        console.log('✅ 最小限UI初期化完了');
    }

    /**
     * UI要素の準備
     */
    async prepareUIElements() {
        // プリロード表示の更新
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.textContent = '初期化中...';
        }
        
        // プリビュー領域の準備
        const previewElement = document.getElementById('preview');
        if (previewElement) {
            previewElement.innerHTML = '<div class="preview-placeholder">PlantUML図を表示する準備が整いました</div>';
        }
    }

    /**
     * UIイベントリスナーの設定
     */
    setupUIEventListeners() {
        // テキストエリアの変更イベント
        // 【重要】フリーズ問題のため一時的に無効化 - 2025-08-13
        console.warn('[IntegrationManager] textareaのinputイベント監視を一時的に無効化（フリーズ問題対応）');
        
        /* フリーズ問題が解決するまでコメントアウト
        const textarea = document.getElementById('plantuml-code');
        if (textarea) {
            let changeTimeout;
            textarea.addEventListener('input', (e) => {
                clearTimeout(changeTimeout);
                changeTimeout = setTimeout(() => {
                    this.handleTextChange(e.target.value);
                }, 300);
            });
        }
        */
        
        // パターン選択イベント
        const patternList = document.getElementById('pattern-list');
        if (patternList) {
            patternList.addEventListener('click', (e) => {
                this.handlePatternSelection(e);
            });
        }
    }

    /**
     * 基本的なイベントリスナーの設定（セーフモード用）
     */
    setupBasicEventListeners() {
        const textarea = document.getElementById('plantuml-code');
        if (textarea) {
            // セーフモードでは変更検知のみ
            textarea.addEventListener('change', (e) => {
                console.log('テキスト変更検知 (セーフモード)');
                this.emitEvent('text:changed:safe', { value: e.target.value });
            });
        }
    }

    /**
     * パターン選択機能の安全な初期化
     */
    async initializePatternSelection() {
        console.log('🎯 パターン選択機能初期化中...');
        
        try {
            // パターンデータの非同期読み込み
            const patterns = await this.loadPatterns();
            
            // パターンリストの段階的レンダリング
            await this.renderPatternsGradually(patterns);
            
            console.log('✅ パターン選択機能初期化完了');
            
        } catch (error) {
            console.warn('⚠️ パターン選択機能初期化に失敗、セーフモードに切り替えます', error);
            await this.fallbackToSafePatternSelection();
        }
    }

    /**
     * パターンデータの読み込み
     */
    async loadPatterns() {
        return new Promise((resolve) => {
            // 基本的なパターンを非同期で提供
            setTimeout(() => {
                resolve([
                    { id: 'basic', name: '基本図', code: '@startuml\n\n@enduml' },
                    { id: 'sequence', name: 'シーケンス図', code: '@startuml\nActor -> System: Request\nSystem -> Database: Query\nDatabase -> System: Response\nSystem -> Actor: Result\n@enduml' },
                    { id: 'class', name: 'クラス図', code: '@startuml\nclass User {\n  +name: string\n  +email: string\n  +login()\n}\n@enduml' }
                ]);
            }, 100);
        });
    }

    /**
     * パターンの段階的レンダリング
     */
    async renderPatternsGradually(patterns) {
        const patternList = document.getElementById('pattern-list');
        if (!patternList) return;
        
        // 一度にすべてを追加せず、段階的に追加
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const patternElement = this.createPatternElement(pattern);
            patternList.appendChild(patternElement);
            
            // UI スレッドをブロックしないよう間隔を空ける
            if (i < patterns.length - 1) {
                await this.delay(50);
            }
        }
    }

    /**
     * パターン要素の作成
     */
    createPatternElement(pattern) {
        const div = document.createElement('div');
        div.className = 'pattern-item';
        div.dataset.patternId = pattern.id;
        div.innerHTML = `
            <h4>${pattern.name}</h4>
            <pre><code>${pattern.code}</code></pre>
        `;
        return div;
    }

    /**
     * セーフモードのパターン選択にフォールバック
     */
    async fallbackToSafePatternSelection() {
        const patternList = document.getElementById('pattern-list');
        if (patternList) {
            patternList.innerHTML = '<div class="safe-mode-notice">セーフモード: 基本パターンのみ利用可能</div>';
            
            // 最小限のパターンのみ表示
            const basicPattern = this.createPatternElement({
                id: 'basic-safe',
                name: '基本図 (セーフモード)',
                code: '@startuml\n\n@enduml'
            });
            patternList.appendChild(basicPattern);
        }
    }

    /**
     * テキスト変更のハンドリング
     */
    async handleTextChange(text) {
        if (!this.isInitialized) return;
        
        try {
            // パフォーマンス監視
            const startTime = performance.now();
            
            // セーフモードかどうかで処理を分岐
            if (this.safeMode && this.safeMode.isActive()) {
                await this.handleTextChangeSafe(text);
            } else {
                await this.handleTextChangeNormal(text);
            }
            
            // パフォーマンス記録
            const processingTime = performance.now() - startTime;
            this.performanceMetrics.processingTimes.push(processingTime);
            
            // 配列のサイズ制限
            if (this.performanceMetrics.processingTimes.length > 100) {
                this.performanceMetrics.processingTimes.shift();
            }
            
        } catch (error) {
            console.error('❌ テキスト変更処理エラー:', error);
            this.handleError(error);
        }
    }

    /**
     * セーフモードでのテキスト変更処理
     */
    async handleTextChangeSafe(text) {
        console.log('🔒 セーフモードでテキスト変更処理');
        
        // 最小限の処理のみ実行
        this.emitEvent('text:changed:safe', { text });
        
        // プリビューは更新しない（安全のため）
        const previewElement = document.getElementById('preview');
        if (previewElement) {
            previewElement.innerHTML = '<div class="safe-mode-notice">セーフモード: プリビュー更新は手動で実行してください</div>';
        }
    }

    /**
     * 通常モードでのテキスト変更処理
     */
    async handleTextChangeNormal(text) {
        // パーサーでの処理
        if (this.asyncParser) {
            const parseResult = await this.asyncParser.parseAsync(text);
            this.emitEvent('text:parsed', parseResult);
        }
        
        // UI更新のスケジュール
        this.scheduleUIUpdate();
    }

    /**
     * パターン選択のハンドリング
     */
    async handlePatternSelection(event) {
        const patternElement = event.target.closest('.pattern-item');
        if (!patternElement) return;
        
        try {
            const patternId = patternElement.dataset.patternId;
            console.log('🎯 パターン選択:', patternId);
            
            // フリーズを避けるため非同期で処理
            await this.applyPatternSafely(patternId);
            
        } catch (error) {
            console.error('❌ パターン選択エラー:', error);
            this.handleError(error);
        }
    }

    /**
     * パターンの安全な適用
     */
    async applyPatternSafely(patternId) {
        // UI更新を一時的に停止
        this.pauseUIUpdates = true;
        
        try {
            const textarea = document.getElementById('plantuml-code');
            if (!textarea) return;
            
            // パターンコードの取得
            const patternCode = this.getPatternCode(patternId);
            
            // 段階的にテキストを更新
            await this.updateTextGradually(textarea, patternCode);
            
            // パース処理を非同期で実行
            setTimeout(() => {
                this.handleTextChange(patternCode);
            }, 100);
            
        } finally {
            // UI更新の再開
            this.pauseUIUpdates = false;
        }
    }

    /**
     * パターンコードの取得
     */
    getPatternCode(patternId) {
        const patterns = {
            'basic': '@startuml\n\n@enduml',
            'basic-safe': '@startuml\n\n@enduml',
            'sequence': '@startuml\nActor -> System: Request\nSystem -> Database: Query\nDatabase -> System: Response\nSystem -> Actor: Result\n@enduml',
            'class': '@startuml\nclass User {\n  +name: string\n  +email: string\n  +login()\n}\n@enduml'
        };
        
        return patterns[patternId] || patterns['basic'];
    }

    /**
     * テキストの段階的更新
     */
    async updateTextGradually(textarea, newText) {
        // 現在のテキストをクリア
        textarea.value = '';
        
        // 段階的にテキストを追加
        const lines = newText.split('\n');
        for (let i = 0; i < lines.length; i++) {
            textarea.value += lines[i] + (i < lines.length - 1 ? '\n' : '');
            await this.delay(10);
        }
    }

    /**
     * パース処理のハンドリング
     */
    async handleParseRequest(data) {
        if (!this.asyncParser) return;
        
        try {
            const result = await this.asyncParser.parseAsync(data.text);
            this.emitEvent('parse:completed', result);
            
        } catch (error) {
            console.error('❌ パース処理エラー:', error);
            this.emitEvent('parse:error', { error });
        }
    }

    /**
     * UI更新のスケジューリング
     */
    scheduleUIUpdate() {
        if (this.pauseUIUpdates) return;
        
        const now = Date.now();
        const timeSinceLastUpdate = now - this.performanceMetrics.lastUIUpdate;
        
        // UI更新の頻度制限（100ms以内の連続更新を避ける）
        if (timeSinceLastUpdate < 100) {
            return;
        }
        
        this.performanceMetrics.lastUIUpdate = now;
        
        // 次のフレームで実行
        requestAnimationFrame(() => {
            this.performUIUpdate();
        });
    }

    /**
     * UI更新の実行
     */
    performUIUpdate() {
        if (this.pauseUIUpdates) return;
        
        try {
            // プリビューの更新
            this.updatePreview();
            
            // ステータス表示の更新
            this.updateStatus();
            
        } catch (error) {
            console.error('❌ UI更新エラー:', error);
            this.handleError(error);
        }
    }

    /**
     * プリビューの更新
     */
    updatePreview() {
        const previewElement = document.getElementById('preview');
        if (!previewElement) return;
        
        // セーフモードでは更新しない
        if (this.safeMode && this.safeMode.isActive()) {
            return;
        }
        
        // プリビューの内容を更新
        // （実際の実装では、パース結果に基づいてSVGを生成）
        previewElement.innerHTML = '<div class="preview-updated">プリビュー更新済み</div>';
    }

    /**
     * ステータス表示の更新
     */
    updateStatus() {
        const statusElement = document.getElementById('status');
        if (!statusElement) return;
        
        const avgProcessingTime = this.getAverageProcessingTime();
        const mode = this.safeMode && this.safeMode.isActive() ? 'セーフモード' : '通常モード';
        
        statusElement.textContent = `状態: ${mode} | 平均処理時間: ${avgProcessingTime}ms`;
    }

    /**
     * UI更新のハンドリング
     */
    handleUIUpdate(eventName, data) {
        // UI更新が必要なイベントの場合のみ実行
        const uiUpdateEvents = [
            'text:changed', 'text:parsed', 'parse:completed', 'pattern:selected'
        ];
        
        if (uiUpdateEvents.includes(eventName)) {
            this.scheduleUIUpdate();
        }
    }

    /**
     * イベントの発行
     */
    emitEvent(eventName, data) {
        if (this.eventManager) {
            this.eventManager.emit(eventName, data);
        } else {
            // EventManagerが利用できない場合はキューに追加
            this.eventQueue.push({ eventName, data, timestamp: Date.now() });
        }
    }

    /**
     * イベントキューの処理
     */
    async processEventQueue() {
        if (this.processingQueue || this.eventQueue.length === 0) return;
        
        this.processingQueue = true;
        
        try {
            while (this.eventQueue.length > 0) {
                const event = this.eventQueue.shift();
                
                // 古いイベント（5秒以上前）は破棄
                if (Date.now() - event.timestamp > 5000) {
                    continue;
                }
                
                this.emitEvent(event.eventName, event.data);
                await this.delay(10);
            }
        } finally {
            this.processingQueue = false;
        }
    }

    /**
     * エラーハンドリング
     */
    handleError(error) {
        this.errorCount++;
        
        console.error('❌ IntegrationManager エラー:', error);
        
        // エラーログの記録
        if (this.diagnosticMode) {
            this.diagnosticMode.logError(error);
        }
        
        // エラー回数が上限を超えた場合
        if (this.errorCount >= this.maxErrorCount) {
            console.warn('⚠️ エラー回数が上限を超えました。セーフモードに切り替えます。');
            this.activateSafeMode();
        }
        
        // UI にエラー表示
        this.displayError(error);
    }

    /**
     * セーフモードの有効化
     */
    async activateSafeMode() {
        if (!this.safeMode) {
            this.safeMode = new SafeMode();
            await this.safeMode.initialize();
            this.modules.safeMode = this.safeMode;
        }
        
        await this.safeMode.activate();
        console.log('🔒 セーフモードが有効化されました');
        
        // UIの更新
        this.updateModeDisplay('セーフモード');
    }

    /**
     * エラーの表示
     */
    displayError(error) {
        const errorElement = document.getElementById('error-display');
        if (errorElement) {
            errorElement.innerHTML = `
                <div class="error-message">
                    <strong>エラー:</strong> ${error.message}
                    <br>
                    <small>エラー回数: ${this.errorCount}/${this.maxErrorCount}</small>
                </div>
            `;
            errorElement.style.display = 'block';
            
            // 5秒後に自動で非表示
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * モード表示の更新
     */
    updateModeDisplay(mode) {
        const modeElement = document.getElementById('mode-display');
        if (modeElement) {
            modeElement.textContent = mode;
            modeElement.className = mode === 'セーフモード' ? 'safe-mode' : 'normal-mode';
        }
    }

    /**
     * セーフモードの使用判定
     */
    shouldUseSafeMode() {
        // パフォーマンスが低い環境や過去のエラーを基準に判定
        const userAgent = navigator.userAgent.toLowerCase();
        const isLowPerformance = userAgent.includes('mobile') || 
                                userAgent.includes('tablet') ||
                                navigator.hardwareConcurrency < 4;
        
        const hasRecentErrors = localStorage.getItem('plantuml_recent_errors');
        
        return isLowPerformance || hasRecentErrors;
    }

    /**
     * 平均処理時間の取得
     */
    getAverageProcessingTime() {
        if (this.performanceMetrics.processingTimes.length === 0) return 0;
        
        const sum = this.performanceMetrics.processingTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.performanceMetrics.processingTimes.length);
    }

    /**
     * 遅延実行のユーティリティ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * システムの状態取得
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            initializationPhase: this.initializationPhase,
            safeMode: this.safeMode ? this.safeMode.isActive() : false,
            errorCount: this.errorCount,
            averageProcessingTime: this.getAverageProcessingTime(),
            modules: Object.keys(this.modules),
            eventQueueLength: this.eventQueue.length
        };
    }

    /**
     * システムのリセット
     */
    async reset() {
        console.log('🔄 IntegrationManager: システムリセット開始');
        
        // イベントリスナーの削除
        window.removeEventListener('error', this.handleError);
        window.removeEventListener('unhandledrejection', this.handleError);
        
        // モジュールの破棄
        for (const [name, module] of Object.entries(this.modules)) {
            if (module && typeof module.destroy === 'function') {
                await module.destroy();
            }
        }
        
        // 状態の初期化
        this.isInitialized = false;
        this.initializationPhase = 'none';
        this.modules = {};
        this.eventQueue = [];
        this.errorCount = 0;
        this.performanceMetrics = {
            initStartTime: null,
            initEndTime: null,
            lastUIUpdate: Date.now(),
            processingTimes: []
        };
        
        console.log('✅ IntegrationManager: システムリセット完了');
    }

    /**
     * システムの破棄
     */
    async destroy() {
        await this.reset();
        console.log('💥 IntegrationManager: システム破棄完了');
    }
}

// グローバルな IntegrationManager インスタンス
let globalIntegrationManager = null;

/**
 * IntegrationManager の初期化
 */
async function initializeIntegrationManager(config = {}) {
    if (globalIntegrationManager) {
        console.warn('⚠️ IntegrationManager は既に初期化されています');
        return globalIntegrationManager;
    }
    
    globalIntegrationManager = new IntegrationManager();
    const success = await globalIntegrationManager.initialize(config);
    
    if (!success) {
        console.error('❌ IntegrationManager の初期化に失敗しました');
        return null;
    }
    
    return globalIntegrationManager;
}

/**
 * IntegrationManager インスタンスの取得
 */
function getIntegrationManager() {
    return globalIntegrationManager;
}

// エクスポート（ES6モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        IntegrationManager, 
        initializeIntegrationManager, 
        getIntegrationManager 
    };
}

// グローバル関数として公開
window.IntegrationManager = IntegrationManager;
window.initializeIntegrationManager = initializeIntegrationManager;
window.getIntegrationManager = getIntegrationManager;