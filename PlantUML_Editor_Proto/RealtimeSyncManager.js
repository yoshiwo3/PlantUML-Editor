/**
 * RealtimeSyncManager.js
 * PlantUMLコードとGUI間のリアルタイム双方向同期を管理するクラス
 * 
 * 機能:
 * - PlantUMLコードの変更を検知してGUIに反映
 * - GUIの変更をPlantUMLコードに反映
 * - 循環更新の防止
 * - パフォーマンス最適化（デバウンス機能）
 * - エラーハンドリング
 */

// メインクラス
window.RealtimeSyncManager = class RealtimeSyncManager {
    constructor(editorInstance) {
        this.editor = editorInstance;
        
        // 同期制御フラグ
        this.isUpdatingFromCode = false;  // コード→GUI更新中
        this.isUpdatingFromGUI = false;   // GUI→コード更新中
        this.isSyncPaused = false;        // 同期一時停止
        
        // タイマーとパフォーマンス制御
        this.debounceDelay = 300;         // デバウンス遅延（ミリ秒）
        this.codeUpdateTimer = null;      // コード更新タイマー
        this.guiUpdateTimer = null;       // GUI更新タイマー
        
        // 依存コンポーネント
        this.diffCalculator = new window.DiffCalculator();
        this.cursorManager = new window.CursorStateManager();
        this.astConverter = new window.ASTToGUIConverter();
        
        // 現在のAST状態
        this.currentAST = null;
        this.previousCode = '';
        this.previousGUIState = null;
        
        // パフォーマンス監視
        this.performanceMetrics = {
            codeToGUI: [],
            guiToCode: [],
            lastSyncTime: 0
        };
        
        // エラー管理
        this.errorCount = 0;
        this.maxErrors = 5;
        this.lastError = null;
        
        // フリーズ防止制御
        this.parseAttempts = 0;
        this.maxParseAttempts = 3;
        this.parseTimeout = 5000;
        this.lastParseTime = 0;
        this.minParseInterval = 100;
        
        this.init();
    }
    
    /**
     * 初期化処理
     */
    init() {
        this.setupCodeTextAreaListener();
        this.setupGUIChangeListeners();
        this.setupPerformanceMonitoring();
        
        // 初回同期
        this.performInitialSync();
        
        console.log('[RealtimeSyncManager] 初期化完了');
    }
    
    /**
     * コードテキストエリアの変更監視を設定
     * 【重要】フリーズ問題のため一時的に無効化 - 2025-08-13
     */
    setupCodeTextAreaListener() {
        console.warn('[RealtimeSyncManager] setupCodeTextAreaListener は一時的に無効化されています（フリーズ問題対応）');
        return;
        
        /* フリーズ問題が解決するまでコメントアウト
        const codeTextarea = document.getElementById('plantuml-code');
        if (!codeTextarea) {
            console.error('[RealtimeSyncManager] PlantUMLコードテキストエリアが見つかりません');
            return;
        }
        
        // input イベント（リアルタイム）
        codeTextarea.addEventListener('input', (event) => {
            if (this.isUpdatingFromGUI || this.isSyncPaused) return;
            
            this.debouncedCodeToGUISync();
        });
        
        // keydown イベント（特殊キー処理）
        codeTextarea.addEventListener('keydown', (event) => {
            if (this.isUpdatingFromGUI || this.isSyncPaused) return;
            
            // カーソル位置を保存
            this.cursorManager.saveCursorState(codeTextarea);
        });
        
        // blur イベント（確実同期）
        codeTextarea.addEventListener('blur', () => {
            if (this.isUpdatingFromGUI || this.isSyncPaused) return;
            
            this.forceCodeToGUISync();
        });
        */
    }
    
    /**
     * GUI変更の監視を設定
     */
    setupGUIChangeListeners() {
        // アクター選択変更
        document.addEventListener('actor-selection-changed', (event) => {
            if (this.isUpdatingFromCode || this.isSyncPaused) return;
            
            this.debouncedGUIToCodeSync();
        });
        
        // アクション変更
        document.addEventListener('action-changed', (event) => {
            if (this.isUpdatingFromCode || this.isSyncPaused) return;
            
            this.debouncedGUIToCodeSync();
        });
        
        // アクション追加/削除
        document.addEventListener('action-added', (event) => {
            if (this.isUpdatingFromCode || this.isSyncPaused) return;
            
            this.debouncedGUIToCodeSync();
        });
        
        document.addEventListener('action-removed', (event) => {
            if (this.isUpdatingFromCode || this.isSyncPaused) return;
            
            this.debouncedGUIToCodeSync();
        });
        
        // ドラッグ&ドロップによる順序変更
        document.addEventListener('action-reordered', (event) => {
            if (this.isUpdatingFromCode || this.isSyncPaused) return;
            
            this.forceGUIToCodeSync(); // 順序変更は即座に反映
        });
    }
    
    /**
     * パフォーマンス監視を設定
     */
    setupPerformanceMonitoring() {
        // 定期的なメトリクス出力
        setInterval(() => {
            this.outputPerformanceMetrics();
        }, 30000); // 30秒ごと
        
        // メモリ使用量監視
        setInterval(() => {
            this.checkMemoryUsage();
        }, 60000); // 1分ごと
    }
    
    /**
     * 初回同期を実行
     */
    performInitialSync() {
        try {
            const codeTextarea = document.getElementById('plantuml-code');
            if (codeTextarea && codeTextarea.value.trim()) {
                this.forceCodeToGUISync();
            } else {
                this.forceGUIToCodeSync();
            }
        } catch (error) {
            console.error('[RealtimeSyncManager] 初回同期エラー:', error);
        }
    }
    
    /**
     * デバウンス付きコード→GUI同期
     */
    debouncedCodeToGUISync() {
        if (this.codeUpdateTimer) {
            clearTimeout(this.codeUpdateTimer);
        }
        
        this.codeUpdateTimer = setTimeout(() => {
            this.syncCodeToGUI();
        }, this.debounceDelay);
    }
    
    /**
     * デバウンス付きGUI→コード同期
     */
    debouncedGUIToCodeSync() {
        if (this.guiUpdateTimer) {
            clearTimeout(this.guiUpdateTimer);
        }
        
        this.guiUpdateTimer = setTimeout(() => {
            this.syncGUIToCode();
        }, this.debounceDelay);
    }
    
    /**
     * 強制的なコード→GUI同期
     */
    forceCodeToGUISync() {
        if (this.codeUpdateTimer) {
            clearTimeout(this.codeUpdateTimer);
            this.codeUpdateTimer = null;
        }
        
        this.syncCodeToGUI();
    }
    
    /**
     * 強制的なGUI→コード同期
     */
    forceGUIToCodeSync() {
        if (this.guiUpdateTimer) {
            clearTimeout(this.guiUpdateTimer);
            this.guiUpdateTimer = null;
        }
        
        this.syncGUIToCode();
    }
    
    /**
     * コード→GUI同期の実行
     */
    async syncCodeToGUI() {
        if (this.isUpdatingFromGUI || this.isSyncPaused) return;
        
        const startTime = performance.now();
        
        try {
            this.isUpdatingFromCode = true;
            
            const codeTextarea = document.getElementById('plantuml-code');
            const currentCode = codeTextarea?.value || '';
            
            // 変更がない場合はスキップ
            if (currentCode === this.previousCode) {
                return;
            }
            
            // 差分計算
            const diff = this.diffCalculator.calculateCodeDiff(this.previousCode, currentCode);
            if (diff.hasChanges) {
                console.log('[RealtimeSyncManager] コード変更を検出:', diff);
                
                // カーソル位置の保存
                const cursorState = this.cursorManager.getCurrentState(codeTextarea);
                
                // ASTへの変換（エラーハンドリング強化）
                const newAST = await this.parseWithTimeout(currentCode, 5000);
                
                if (newAST && newAST.success) {
                    // ASTからGUIへの変換
                    await this.convertASTToGUI(newAST.ast);
                    
                    // 状態の更新
                    this.currentAST = newAST.ast;
                    this.previousCode = currentCode;
                    
                    // カーソル位置の復元
                    this.cursorManager.restoreCursorState(codeTextarea, cursorState);
                    
                    // パフォーマンスメトリクスの記録
                    const duration = performance.now() - startTime;
                    this.recordMetric('codeToGUI', duration);
                    
                    console.log(`[RealtimeSyncManager] コード→GUI同期完了 (${duration.toFixed(2)}ms)`);
                } else {
                    console.warn('[RealtimeSyncManager] パースエラー:', newAST?.errors || 'Unknown error');
                    this.handleSyncError(newAST?.errors || 'Parse failed');
                    
                    // フォールバック処理
                    const fallbackResult = this.getFallbackResult(currentCode);
                    if (fallbackResult) {
                        await this.convertASTToGUI(fallbackResult);
                    }
                }
            }
            
        } catch (error) {
            console.error('[RealtimeSyncManager] コード→GUI同期エラー:', error);
            this.handleSyncError(error);
        } finally {
            this.isUpdatingFromCode = false;
        }
    }
    
    /**
     * GUI→コード同期の実行
     */
    async syncGUIToCode() {
        if (this.isUpdatingFromCode || this.isSyncPaused) return;
        
        const startTime = performance.now();
        
        try {
            this.isUpdatingFromGUI = true;
            
            // 現在のGUI状態を取得
            const currentGUIState = this.getCurrentGUIState();
            
            // 差分計算
            const diff = this.diffCalculator.calculateGUIDiff(this.previousGUIState, currentGUIState);
            if (diff.hasChanges) {
                console.log('[RealtimeSyncManager] GUI変更を検出:', diff);
                
                const codeTextarea = document.getElementById('plantuml-code');
                const cursorState = this.cursorManager.getCurrentState(codeTextarea);
                
                // GUIからコードへの変換
                const newCode = this.convertGUIToCode(currentGUIState);
                
                // コードの更新
                if (codeTextarea && newCode !== codeTextarea.value) {
                    codeTextarea.value = newCode;
                    
                    // エディターの更新
                    if (this.editor.updateLineNumbers) {
                        this.editor.updateLineNumbers();
                    }
                    
                    // 状態の更新
                    this.previousCode = newCode;
                    this.previousGUIState = JSON.parse(JSON.stringify(currentGUIState));
                    
                    // カーソル位置の調整
                    this.cursorManager.adjustCursorAfterUpdate(codeTextarea, cursorState);
                    
                    // パフォーマンスメトリクスの記録
                    const duration = performance.now() - startTime;
                    this.recordMetric('guiToCode', duration);
                    
                    console.log(`[RealtimeSyncManager] GUI→コード同期完了 (${duration.toFixed(2)}ms)`);
                }
            }
            
        } catch (error) {
            console.error('[RealtimeSyncManager] GUI→コード同期エラー:', error);
            this.handleSyncError(error);
        } finally {
            this.isUpdatingFromGUI = false;
        }
    }
    
    /**
     * ASTからGUIへの変換
     */
    async convertASTToGUI(ast) {
        if (!ast || !ast.root) return;
        
        // 既存のアクションをクリア（循環参照防止のため慎重に）
        if (this.editor.actions) {
            this.editor.actions.length = 0;
        }
        
        if (this.editor.selectedActors) {
            this.editor.selectedActors.clear();
        }
        
        // ASTToGUIConverterを使用してGUIを更新
        const guiData = this.astConverter.convertASTToGUI(ast);
        
        // エディターの状態を更新
        if (guiData.actors) {
            guiData.actors.forEach(actor => this.editor.selectedActors.add(actor));
        }
        
        if (guiData.actions) {
            this.editor.actions.push(...guiData.actions);
        }
        
        // UIの更新
        await this.updateUIElements();
    }
    
    /**
     * GUIからコードへの変換
     */
    convertGUIToCode(guiState) {
        let code = '@startuml\n';
        
        // アクターの定義
        if (guiState.selectedActors && guiState.selectedActors.size > 0) {
            guiState.selectedActors.forEach(actor => {
                code += `actor "${actor}" as ${actor.replace(/\s+/g, '_')}\n`;
            });
            code += '\n';
        }
        
        // アクションの変換
        if (guiState.actions && guiState.actions.length > 0) {
            guiState.actions.forEach(action => {
                switch (action.type) {
                    case 'message':
                        code += `${action.from} -> ${action.to} : ${action.message}\n`;
                        break;
                    case 'activation':
                        code += `activate ${action.actor}\n`;
                        break;
                    case 'deactivation':
                        code += `deactivate ${action.actor}\n`;
                        break;
                    case 'note':
                        code += `note ${action.position} : ${action.text}\n`;
                        break;
                    case 'alt':
                        code += `alt ${action.condition}\n`;
                        action.trueBranch?.forEach(subAction => {
                            code += `  ${this.convertActionToCode(subAction)}\n`;
                        });
                        if (action.falseBranch?.length > 0) {
                            code += 'else\n';
                            action.falseBranch.forEach(subAction => {
                                code += `  ${this.convertActionToCode(subAction)}\n`;
                            });
                        }
                        code += 'end\n';
                        break;
                    case 'loop':
                        code += `loop ${action.condition}\n`;
                        action.actions?.forEach(subAction => {
                            code += `  ${this.convertActionToCode(subAction)}\n`;
                        });
                        code += 'end\n';
                        break;
                    case 'par':
                        code += 'par\n';
                        action.branches?.forEach((branch, index) => {
                            if (index > 0) code += 'also\n';
                            branch.forEach(subAction => {
                                code += `  ${this.convertActionToCode(subAction)}\n`;
                            });
                        });
                        code += 'end\n';
                        break;
                    default:
                        code += `' 未対応のアクションタイプ: ${action.type}\n`;
                }
            });
        }
        
        code += '@enduml';
        return code;
    }
    
    /**
     * 単一アクションをコードに変換
     */
    convertActionToCode(action) {
        switch (action.type) {
            case 'message':
                return `${action.from} -> ${action.to} : ${action.message}`;
            case 'activation':
                return `activate ${action.actor}`;
            case 'deactivation':
                return `deactivate ${action.actor}`;
            case 'note':
                return `note ${action.position} : ${action.text}`;
            default:
                return `' 未対応のサブアクション: ${action.type}`;
        }
    }
    
    /**
     * 現在のGUI状態を取得
     */
    getCurrentGUIState() {
        return {
            selectedActors: new Set(this.editor.selectedActors || []),
            actions: JSON.parse(JSON.stringify(this.editor.actions || [])),
            currentMode: this.editor.currentMode,
            timestamp: Date.now()
        };
    }
    
    /**
     * UI要素を更新
     */
    async updateUIElements() {
        // アクター選択のUI更新
        this.updateActorSelectionUI();
        
        // アクションリストのUI更新
        this.updateActionListUI();
        
        // その他のUI更新
        if (this.editor.updatePlantUML) {
            this.editor.updatePlantUML();
        }
        
        // 少し待って描画完了を確実にする
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    /**
     * アクター選択UIの更新
     */
    updateActorSelectionUI() {
        const actorList = document.getElementById('selected-actors-list');
        if (actorList && this.editor.selectedActors) {
            actorList.innerHTML = '';
            this.editor.selectedActors.forEach(actor => {
                const actorElement = document.createElement('span');
                actorElement.className = 'selected-actor';
                actorElement.textContent = actor;
                actorList.appendChild(actorElement);
            });
        }
    }
    
    /**
     * アクションリストUIの更新
     */
    updateActionListUI() {
        const actionsList = document.getElementById('actions-list');
        if (actionsList && this.editor.actions) {
            actionsList.innerHTML = '';
            this.editor.actions.forEach((action, index) => {
                const actionElement = this.createActionElement(action, index);
                actionsList.appendChild(actionElement);
            });
        }
    }
    
    /**
     * アクション要素を作成
     */
    createActionElement(action, index) {
        const div = document.createElement('div');
        div.className = 'action-item';
        div.dataset.index = index;
        
        const text = this.formatActionText(action);
        div.innerHTML = `
            <span class="action-text">${text}</span>
            <button class="remove-btn" onclick="editor.removeAction(${index})">&times;</button>
        `;
        
        return div;
    }
    
    /**
     * アクションテキストのフォーマット
     */
    formatActionText(action) {
        switch (action.type) {
            case 'message':
                return `${action.from} → ${action.to}: ${action.message}`;
            case 'activation':
                return `アクティベート: ${action.actor}`;
            case 'deactivation':
                return `ディアクティベート: ${action.actor}`;
            case 'note':
                return `ノート (${action.position}): ${action.text}`;
            case 'alt':
                return `条件分岐: ${action.condition}`;
            case 'loop':
                return `繰り返し: ${action.condition}`;
            case 'par':
                return `並行処理 (${action.branches?.length || 0}分岐)`;
            default:
                return `不明なアクション: ${action.type}`;
        }
    }
    
    /**
     * 同期エラーのハンドリング
     */
    handleSyncError(error) {
        this.errorCount++;
        this.lastError = error;
        
        console.error(`[RealtimeSyncManager] 同期エラー (${this.errorCount}/${this.maxErrors}):`, error);
        
        // エラーが閾値を超えた場合は同期を一時停止
        if (this.errorCount >= this.maxErrors) {
            this.pauseSync();
            this.showErrorNotification('同期エラーが多発しています。同期を一時停止しました。');
        }
    }
    
    /**
     * エラー通知の表示
     */
    showErrorNotification(message) {
        // 簡単なトースト通知
        const notification = document.createElement('div');
        notification.className = 'sync-error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    /**
     * パフォーマンスメトリクスの記録
     */
    recordMetric(type, duration) {
        const metrics = this.performanceMetrics[type];
        metrics.push({
            duration: duration,
            timestamp: Date.now()
        });
        
        // 最新100件のみ保持
        if (metrics.length > 100) {
            metrics.splice(0, metrics.length - 100);
        }
        
        this.performanceMetrics.lastSyncTime = Date.now();
    }
    
    /**
     * パフォーマンスメトリクスの出力
     */
    outputPerformanceMetrics() {
        const codeToGUI = this.performanceMetrics.codeToGUI;
        const guiToCode = this.performanceMetrics.guiToCode;
        
        if (codeToGUI.length === 0 && guiToCode.length === 0) return;
        
        const avgCodeToGUI = codeToGUI.reduce((sum, m) => sum + m.duration, 0) / codeToGUI.length;
        const avgGUIToCode = guiToCode.reduce((sum, m) => sum + m.duration, 0) / guiToCode.length;
        
        console.log('[RealtimeSyncManager] パフォーマンスメトリクス:', {
            codeToGUI: {
                count: codeToGUI.length,
                averageDuration: `${avgCodeToGUI.toFixed(2)}ms`,
                maxDuration: `${Math.max(...codeToGUI.map(m => m.duration)).toFixed(2)}ms`
            },
            guiToCode: {
                count: guiToCode.length,
                averageDuration: `${avgGUIToCode.toFixed(2)}ms`,
                maxDuration: `${Math.max(...guiToCode.map(m => m.duration)).toFixed(2)}ms`
            },
            errors: this.errorCount
        });
    }
    
    /**
     * メモリ使用量の監視
     */
    checkMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
            const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
            
            if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.8) {
                console.warn(`[RealtimeSyncManager] メモリ使用量が高くなっています: ${usedMB}MB / ${totalMB}MB`);
            }
        }
    }
    
    // 公開メソッド
    
    /**
     * 同期の一時停止
     */
    pauseSync() {
        this.isSyncPaused = true;
        console.log('[RealtimeSyncManager] 同期を一時停止しました');
    }
    
    /**
     * 同期の再開
     */
    resumeSync() {
        this.isSyncPaused = false;
        this.errorCount = 0;
        this.lastError = null;
        console.log('[RealtimeSyncManager] 同期を再開しました');
        
        // 再開時に強制同期
        this.forceCodeToGUISync();
    }
    
    /**
     * 手動同期の実行
     */
    manualSync(direction = 'both') {
        switch (direction) {
            case 'codeToGUI':
                this.forceCodeToGUISync();
                break;
            case 'guiToCode':
                this.forceGUIToCodeSync();
                break;
            case 'both':
            default:
                this.forceCodeToGUISync();
                break;
        }
    }
    
    /**
     * 同期状態の取得
     */
    getSyncStatus() {
        return {
            isActive: !this.isSyncPaused,
            isUpdatingFromCode: this.isUpdatingFromCode,
            isUpdatingFromGUI: this.isUpdatingFromGUI,
            errorCount: this.errorCount,
            lastError: this.lastError,
            lastSyncTime: this.performanceMetrics.lastSyncTime
        };
    }
    
    /**
     * タイムアウト付きパース処理
     */
    async parseWithTimeout(code, timeout = 5000) {
        // レート制限チェック
        const now = Date.now();
        if (now - this.lastParseTime < this.minParseInterval) {
            console.log('[RealtimeSyncManager] パース処理をスキップ（レート制限）');
            return { success: false, errors: ['Rate limited'] };
        }
        this.lastParseTime = now;
        
        // リトライ回数チェック
        this.parseAttempts++;
        if (this.parseAttempts > this.maxParseAttempts) {
            console.warn('[RealtimeSyncManager] パース試行回数の上限に達しました');
            this.parseAttempts = 0; // リセット
            return { success: false, errors: ['Max attempts exceeded'] };
        }
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.warn('[RealtimeSyncManager] パース処理がタイムアウトしました');
                resolve({ success: false, errors: ['Timeout'] });
            }, timeout);
            
            try {
                // コードの修復を試行
                const repairedCode = this.repairCode(code);
                
                // 字句解析
                const lexer = new window.PlantUMLLexer(repairedCode);
                lexer.tokenize();
                
                // 構文解析
                const parser = new window.PlantUMLParser(lexer.tokens);
                const ast = parser.parse();
                
                clearTimeout(timeoutId);
                
                if (parser.errors.length === 0) {
                    this.parseAttempts = 0; // 成功時はリセット
                    resolve({ success: true, ast: ast, errors: [] });
                } else {
                    resolve({ success: false, errors: parser.errors });
                }
            } catch (error) {
                clearTimeout(timeoutId);
                console.error('[RealtimeSyncManager] パース中にエラー:', error);
                resolve({ success: false, errors: [error.message] });
            }
        });
    }
    
    /**
     * コード修復処理
     */
    repairCode(code) {
        if (!code || typeof code !== 'string') {
            return '@startuml\n@enduml';
        }
        
        let repairedCode = code.trim();
        
        // 基本的な修復
        if (!repairedCode.includes('@startuml')) {
            repairedCode = '@startuml\n' + repairedCode;
        }
        if (!repairedCode.includes('@enduml')) {
            repairedCode = repairedCode + '\n@enduml';
        }
        
        // 改行文字の正規化
        repairedCode = repairedCode
            .replace(/\\n/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n');
        
        // 行数制限（メモリ対策）
        const lines = repairedCode.split('\n');
        if (lines.length > 1000) {
            console.warn('[RealtimeSyncManager] コードが長すぎます。短縮します。');
            repairedCode = lines.slice(0, 1000).join('\n');
            if (!repairedCode.includes('@enduml')) {
                repairedCode += '\n@enduml';
            }
        }
        
        return repairedCode;
    }
    
    /**
     * フォールバック結果を取得
     */
    getFallbackResult(code) {
        try {
            // 最小限のASTを生成
            const actors = this.extractActors(code);
            const messages = this.extractMessages(code);
            
            return {
                root: {
                    type: 'sequence',
                    actors: actors,
                    messages: messages
                }
            };
        } catch (error) {
            console.error('[RealtimeSyncManager] フォールバック処理エラー:', error);
            return null;
        }
    }
    
    /**
     * コードからアクターを抽出
     */
    extractActors(code) {
        const actors = new Set();
        const lines = code.split('\n');
        
        for (const line of lines) {
            // actor "name" as alias パターン
            const actorMatch = line.match(/actor\s+"([^"]+)"/);
            if (actorMatch) {
                actors.add(actorMatch[1]);
                continue;
            }
            
            // A -> B : message パターン
            const messageMatch = line.match(/(\w+)\s*->\s*(\w+)\s*:/);
            if (messageMatch) {
                actors.add(messageMatch[1]);
                actors.add(messageMatch[2]);
            }
        }
        
        return Array.from(actors);
    }
    
    /**
     * コードからメッセージを抽出
     */
    extractMessages(code) {
        const messages = [];
        const lines = code.split('\n');
        
        for (const line of lines) {
            const messageMatch = line.match(/(\w+)\s*->\s*(\w+)\s*:\s*(.+)/);
            if (messageMatch) {
                messages.push({
                    type: 'message',
                    from: messageMatch[1],
                    to: messageMatch[2],
                    text: messageMatch[3].trim()
                });
            }
        }
        
        return messages;
    }
    
    /**
     * リソースのクリーンアップ
     */
    destroy() {
        // タイマーのクリア
        if (this.codeUpdateTimer) {
            clearTimeout(this.codeUpdateTimer);
        }
        if (this.guiUpdateTimer) {
            clearTimeout(this.guiUpdateTimer);
        }
        
        // 依存オブジェクトのクリーンアップ
        if (this.cursorManager && this.cursorManager.destroy) {
            this.cursorManager.destroy();
        }
        
        console.log('[RealtimeSyncManager] リソースをクリーンアップしました');
    }
}

// グローバル変数として設定済み