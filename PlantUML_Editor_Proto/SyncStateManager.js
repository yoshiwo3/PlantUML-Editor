/**
 * SyncStateManager.js
 * 
 * PlantUMLエディタの状態管理とコード同期を担当するクラス
 * Phase 2: 状態管理の改善版
 * 
 * @version 2.0.0
 * @date 2025-08-13
 */

class SyncStateManager {
    constructor(options = {}) {
        // パーサーインスタンス
        this.parser = options.parser || new PlantUMLParser({ debugMode: options.debugMode });
        
        // 状態の初期化
        this.state = this.createInitialState();
        
        // 変更履歴の管理
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = options.maxHistorySize || 50;
        
        // リスナー管理
        this.listeners = new Map();
        
        // デバッグモード
        this.debugMode = options.debugMode || false;
        
        // 自動バックアップ
        this.autoBackup = options.autoBackup !== false;
        this.backupInterval = options.backupInterval || 60000; // 1分
        
        if (this.autoBackup) {
            this.startAutoBackup();
        }
    }

    /**
     * 初期状態の作成
     */
    createInitialState() {
        return {
            // アクター関連
            actors: [],
            selectedActors: new Set(),
            actorMap: new Map(),
            
            // アクション関連
            actions: [],
            
            // PlantUMLコード
            code: '@startuml\n\n@enduml',
            
            // メタ情報
            title: null,
            lastSync: null,
            lastModified: null,
            isDirty: false,
            
            // パース結果
            lastParseResult: null,
            parseErrors: [],
            parseWarnings: [],
            
            // UI状態
            activeTab: 'actor-process',
            zoomLevel: 100,
            
            // 統計情報
            stats: {
                totalActors: 0,
                totalActions: 0,
                totalNotes: 0,
                parseTime: 0
            }
        };
    }

    /**
     * デバッグログ出力
     */
    log(message, data = null) {
        if (this.debugMode || (typeof localStorage !== 'undefined' && localStorage.getItem('debug_state') === 'true')) {
            console.group(`[SyncStateManager] ${message}`);
            if (data) console.log(data);
            console.groupEnd();
        }
    }

    /**
     * 状態のバックアップ作成
     */
    createBackup() {
        return {
            state: JSON.parse(JSON.stringify({
                actors: this.state.actors,
                actions: this.state.actions,
                code: this.state.code,
                title: this.state.title,
                selectedActors: Array.from(this.state.selectedActors)
            })),
            timestamp: Date.now()
        };
    }

    /**
     * バックアップからの復元
     */
    restoreBackup(backup) {
        if (!backup || !backup.state) {
            this.log('Invalid backup', backup);
            return false;
        }
        
        this.state.actors = backup.state.actors;
        this.state.actions = backup.state.actions;
        this.state.code = backup.state.code;
        this.state.title = backup.state.title;
        this.state.selectedActors = new Set(backup.state.selectedActors);
        
        this.notifyListeners('restore', { backup });
        this.log('Backup restored', { timestamp: backup.timestamp });
        
        return true;
    }

    /**
     * PlantUMLコードから状態を更新
     */
    updateFromCode(code, options = {}) {
        const startTime = performance.now();
        
        // バックアップ作成
        const backup = this.createBackup();
        
        try {
            // コードをパース
            const parseResult = this.parser.safeParse(code);
            const parseTime = performance.now() - startTime;
            
            this.log('Code parsed', { 
                parseTime: `${parseTime.toFixed(2)}ms`,
                actors: parseResult.actors.length,
                actions: parseResult.actions.length
            });
            
            // 状態を更新
            this.state.code = code;
            this.state.lastParseResult = parseResult;
            this.state.lastSync = Date.now();
            this.state.isDirty = false;
            
            // パース結果から状態を更新
            if (parseResult && !parseResult.isFallback) {
                // アクターの更新
                this.updateActors(parseResult.actors);
                
                // アクションの更新（複雑な処理を保持）
                if (options.preserveComplex) {
                    this.updateActionsWithPreservation(parseResult.actions);
                } else {
                    this.state.actions = parseResult.actions;
                }
                
                // メタ情報の更新
                if (parseResult.title) {
                    this.state.title = parseResult.title;
                }
                
                // 統計情報の更新
                this.updateStats(parseResult);
                
                // バリデーション
                this.validateState();
            }
            
            // 履歴に追加
            this.addToHistory();
            
            // リスナーに通知
            this.notifyListeners('update', { 
                source: 'code',
                parseTime,
                parseResult 
            });
            
            return {
                success: true,
                parseTime,
                result: parseResult
            };
            
        } catch (error) {
            this.log('Update from code failed', { error: error.message });
            
            // バックアップから復元
            this.restoreBackup(backup);
            
            // エラーを記録
            this.state.parseErrors.push({
                timestamp: Date.now(),
                message: error.message,
                code: code.substring(0, 100)
            });
            
            // リスナーに通知
            this.notifyListeners('error', { error });
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * UIから状態を更新
     */
    updateFromUI(changes) {
        const backup = this.createBackup();
        
        try {
            // 変更を適用
            Object.assign(this.state, changes);
            
            // PlantUMLコードを生成
            const newCode = this.generatePlantUMLCode();
            
            if (newCode !== this.state.code) {
                this.state.code = newCode;
                this.state.isDirty = true;
                this.state.lastModified = Date.now();
            }
            
            // 履歴に追加
            this.addToHistory();
            
            // リスナーに通知
            this.notifyListeners('update', { 
                source: 'ui',
                changes 
            });
            
            return { success: true, code: newCode };
            
        } catch (error) {
            this.log('Update from UI failed', { error: error.message });
            this.restoreBackup(backup);
            return { success: false, error: error.message };
        }
    }

    /**
     * アクターの更新
     */
    updateActors(actors) {
        this.state.actors = actors;
        
        // 選択状態を更新（存在しないアクターは選択解除）
        const newSelected = new Set();
        for (const actor of this.state.selectedActors) {
            if (actors.includes(actor)) {
                newSelected.add(actor);
            }
        }
        this.state.selectedActors = newSelected;
    }

    /**
     * 複雑な処理を保持しながらアクションを更新
     */
    updateActionsWithPreservation(newActions) {
        // 既存の複雑な処理を抽出
        const complexActions = this.state.actions.filter(action => 
            action.type === 'condition' || 
            action.type === 'loop' || 
            action.type === 'parallel' ||
            action.type === 'group'
        );
        
        // 新しいシンプルなアクションと統合
        const simpleActions = newActions.filter(action => 
            !action.type || action.type === 'message'
        );
        
        this.state.actions = [...simpleActions, ...complexActions];
    }

    /**
     * PlantUMLコードの生成
     */
    generatePlantUMLCode() {
        const lines = ['@startuml'];
        
        // タイトル
        if (this.state.title) {
            lines.push(`title ${this.state.title}`);
        }
        
        lines.push('');
        
        // アクター定義
        for (const actor of this.state.actors) {
            // アクタータイプを判定（簡易版）
            let type = 'actor';
            if (actor.includes('システム') || actor.includes('サイト')) {
                type = 'participant';
            } else if (actor.includes('DB') || actor.includes('データベース')) {
                type = 'database';
            } else if (actor.includes('サービス')) {
                type = 'participant';
            }
            
            // 日本語の場合はクォートで囲む
            const needsQuote = /[^\x00-\x7F]/.test(actor);
            const actorDef = needsQuote ? `"${actor}"` : actor;
            
            lines.push(`${type} ${actorDef}`);
        }
        
        if (this.state.actors.length > 0) {
            lines.push('');
        }
        
        // アクション定義
        for (const action of this.state.actions) {
            lines.push(...this.generateActionCode(action));
        }
        
        lines.push('');
        lines.push('@enduml');
        
        return lines.join('\n');
    }

    /**
     * アクションコードの生成
     */
    generateActionCode(action) {
        const lines = [];
        
        if (action.type === 'loop') {
            lines.push(`loop ${action.condition}`);
            for (const subAction of action.actions) {
                lines.push(...this.generateActionCode(subAction).map(l => '    ' + l));
            }
            lines.push('end');
        } else if (action.type === 'condition') {
            lines.push(`${action.conditionType} ${action.conditionName}`);
            for (const subAction of action.trueBranch) {
                lines.push(...this.generateActionCode(subAction).map(l => '    ' + l));
            }
            if (action.falseBranch && action.falseBranch.length > 0) {
                lines.push('else' + (action.elseCondition ? ` ${action.elseCondition}` : ''));
                for (const subAction of action.falseBranch) {
                    lines.push(...this.generateActionCode(subAction).map(l => '    ' + l));
                }
            }
            lines.push('end');
        } else if (action.type === 'parallel') {
            lines.push('par');
            for (let i = 0; i < action.branches.length; i++) {
                if (i > 0) lines.push('else');
                for (const subAction of action.branches[i]) {
                    lines.push(...this.generateActionCode(subAction).map(l => '    ' + l));
                }
            }
            lines.push('end');
        } else if (action.type === 'group') {
            lines.push(`group ${action.label}`);
            for (const subAction of action.actions) {
                lines.push(...this.generateActionCode(subAction).map(l => '    ' + l));
            }
            lines.push('end');
        } else if (action.type === 'divider') {
            lines.push(`== ${action.text} ==`);
        } else if (action.type === 'delay') {
            lines.push(`...${action.text}...`);
        } else if (action.type === 'note') {
            lines.push(`note ${action.position} of ${this.formatActor(action.target)}: ${action.text}`);
        } else {
            // 通常のメッセージ
            const from = this.formatActor(action.from);
            const to = this.formatActor(action.to);
            const arrow = action.arrow || (action.async ? '-->' : '->');
            const text = action.text + (action.uncertain ? '？' : '');
            lines.push(`${from} ${arrow} ${to}: ${text}`);
        }
        
        return lines;
    }

    /**
     * アクター名のフォーマット
     */
    formatActor(actor) {
        if (!actor) return '';
        // 日本語の場合はクォートで囲む
        const needsQuote = /[^\x00-\x7F]/.test(actor);
        return needsQuote ? `"${actor}"` : actor;
    }

    /**
     * 統計情報の更新
     */
    updateStats(parseResult) {
        this.state.stats = {
            totalActors: parseResult.actors.length,
            totalActions: parseResult.actions.length,
            totalNotes: parseResult.notes?.length || 0,
            parseTime: this.state.stats.parseTime
        };
    }

    /**
     * 状態のバリデーション
     */
    validateState() {
        const validation = this.parser.validate(this.state.code);
        
        this.state.parseErrors = validation.errors.map(msg => ({
            timestamp: Date.now(),
            message: msg
        }));
        
        this.state.parseWarnings = validation.warnings.map(msg => ({
            timestamp: Date.now(),
            message: msg
        }));
        
        return validation.valid;
    }

    /**
     * 履歴管理
     */
    addToHistory() {
        // 現在位置より後の履歴を削除
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // 新しい状態を追加
        this.history.push(this.createBackup());
        
        // 最大サイズを超えたら古いものを削除
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    /**
     * アンドゥ
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const backup = this.history[this.historyIndex];
            this.restoreBackup(backup);
            this.log('Undo performed', { index: this.historyIndex });
            return true;
        }
        return false;
    }

    /**
     * リドゥ
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const backup = this.history[this.historyIndex];
            this.restoreBackup(backup);
            this.log('Redo performed', { index: this.historyIndex });
            return true;
        }
        return false;
    }

    /**
     * リスナー登録
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * リスナー解除
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * リスナーへの通知
     */
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Listener error:', error);
                }
            }
        }
    }

    /**
     * 自動バックアップの開始
     */
    startAutoBackup() {
        this.autoBackupTimer = setInterval(() => {
            const key = 'plantuml_editor_backup';
            const backup = {
                state: this.state,
                timestamp: Date.now()
            };
            
            try {
                localStorage.setItem(key, JSON.stringify(backup));
                this.log('Auto backup saved');
            } catch (error) {
                this.log('Auto backup failed', { error: error.message });
            }
        }, this.backupInterval);
    }

    /**
     * 自動バックアップの停止
     */
    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
        }
    }

    /**
     * ローカルストレージからの復元
     */
    restoreFromLocalStorage() {
        const key = 'plantuml_editor_backup';
        
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const backup = JSON.parse(data);
                this.state = backup.state;
                this.log('Restored from local storage', { 
                    timestamp: new Date(backup.timestamp).toLocaleString()
                });
                return true;
            }
        } catch (error) {
            this.log('Restore from local storage failed', { error: error.message });
        }
        
        return false;
    }

    /**
     * 状態のリセット
     */
    reset() {
        this.state = this.createInitialState();
        this.history = [];
        this.historyIndex = -1;
        this.notifyListeners('reset', {});
        this.log('State reset');
    }

    /**
     * 状態のエクスポート
     */
    export() {
        return {
            version: '2.0.0',
            timestamp: Date.now(),
            state: this.state,
            history: this.history
        };
    }

    /**
     * 状態のインポート
     */
    import(data) {
        if (!data || !data.state) {
            throw new Error('Invalid import data');
        }
        
        this.state = data.state;
        this.history = data.history || [];
        this.historyIndex = this.history.length - 1;
        
        this.notifyListeners('import', { data });
        this.log('State imported', { version: data.version });
    }

    /**
     * クリーンアップ
     */
    destroy() {
        this.stopAutoBackup();
        this.listeners.clear();
        this.log('Manager destroyed');
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncStateManager;
}

if (typeof window !== 'undefined') {
    window.SyncStateManager = SyncStateManager;
}