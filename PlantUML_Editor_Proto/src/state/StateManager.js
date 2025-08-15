/**
 * StateManager.js
 * 
 * 状態管理システム - Reduxパターン実装
 * - Store: 中央状態管理
 * - Actions: 状態変更アクション
 * - Reducers: 状態更新ロジック
 * - Middleware: ログ、非同期処理
 * - Undo/Redo機能
 * 
 * @version 1.0.0
 * @date 2025-08-15
 */

/**
 * アクションタイプ定義
 */
const ACTION_TYPES = {
    // PlantUML Editor基本操作
    SET_PLANTUML_CODE: 'SET_PLANTUML_CODE',
    UPDATE_DIAGRAM: 'UPDATE_DIAGRAM',
    SET_EDIT_MODE: 'SET_EDIT_MODE',
    
    // モーダル管理
    OPEN_MODAL: 'OPEN_MODAL',
    CLOSE_MODAL: 'CLOSE_MODAL',
    UPDATE_MODAL_DATA: 'UPDATE_MODAL_DATA',
    
    // エディター状態
    SET_CURSOR_POSITION: 'SET_CURSOR_POSITION',
    SET_SELECTION: 'SET_SELECTION',
    SET_ZOOM_LEVEL: 'SET_ZOOM_LEVEL',
    
    // プロセス管理
    ADD_PROCESS: 'ADD_PROCESS',
    UPDATE_PROCESS: 'UPDATE_PROCESS',
    DELETE_PROCESS: 'DELETE_PROCESS',
    SET_ACTIVE_PROCESS: 'SET_ACTIVE_PROCESS',
    
    // UI状態
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    SET_THEME: 'SET_THEME',
    
    // 履歴管理（内部使用）
    UNDO: 'UNDO',
    REDO: 'REDO',
    CLEAR_HISTORY: 'CLEAR_HISTORY'
};

/**
 * 初期状態定義
 */
const INITIAL_STATE = {
    // PlantUMLエディター
    editor: {
        code: '',
        diagram: null,
        mode: 'visual', // 'visual' | 'code' | 'split'
        cursorPosition: { line: 0, column: 0 },
        selection: null,
        zoomLevel: 1.0
    },
    
    // モーダル管理
    modal: {
        active: null,
        data: {},
        isOpen: false
    },
    
    // プロセス管理
    processes: {
        list: [],
        active: null,
        byId: {}
    },
    
    // UI状態
    ui: {
        loading: false,
        error: null,
        theme: 'light',
        sidebarOpen: true,
        notifications: []
    },
    
    // 設定
    settings: {
        autoSave: true,
        autoSaveInterval: 5000,
        showLineNumbers: true,
        enableShortcuts: true
    },
    
    // メタデータ
    meta: {
        lastUpdated: Date.now(),
        version: '1.0.0',
        sessionId: null
    }
};

/**
 * アクションクリエーター
 */
class ActionCreators {
    // PlantUMLエディター
    static setPlantUMLCode(code) {
        return { type: ACTION_TYPES.SET_PLANTUML_CODE, payload: code };
    }
    
    static updateDiagram(diagram) {
        return { type: ACTION_TYPES.UPDATE_DIAGRAM, payload: diagram };
    }
    
    static setEditMode(mode) {
        return { type: ACTION_TYPES.SET_EDIT_MODE, payload: mode };
    }
    
    // モーダル管理
    static openModal(modalType, data = {}) {
        return { type: ACTION_TYPES.OPEN_MODAL, payload: { modalType, data } };
    }
    
    static closeModal() {
        return { type: ACTION_TYPES.CLOSE_MODAL };
    }
    
    static updateModalData(data) {
        return { type: ACTION_TYPES.UPDATE_MODAL_DATA, payload: data };
    }
    
    // エディター状態
    static setCursorPosition(position) {
        return { type: ACTION_TYPES.SET_CURSOR_POSITION, payload: position };
    }
    
    static setSelection(selection) {
        return { type: ACTION_TYPES.SET_SELECTION, payload: selection };
    }
    
    static setZoomLevel(zoomLevel) {
        return { type: ACTION_TYPES.SET_ZOOM_LEVEL, payload: zoomLevel };
    }
    
    // プロセス管理
    static addProcess(process) {
        return { type: ACTION_TYPES.ADD_PROCESS, payload: process };
    }
    
    static updateProcess(processId, updates) {
        return { type: ACTION_TYPES.UPDATE_PROCESS, payload: { processId, updates } };
    }
    
    static deleteProcess(processId) {
        return { type: ACTION_TYPES.DELETE_PROCESS, payload: processId };
    }
    
    static setActiveProcess(processId) {
        return { type: ACTION_TYPES.SET_ACTIVE_PROCESS, payload: processId };
    }
    
    // UI状態
    static setLoading(loading) {
        return { type: ACTION_TYPES.SET_LOADING, payload: loading };
    }
    
    static setError(error) {
        return { type: ACTION_TYPES.SET_ERROR, payload: error };
    }
    
    static clearError() {
        return { type: ACTION_TYPES.CLEAR_ERROR };
    }
    
    static setTheme(theme) {
        return { type: ACTION_TYPES.SET_THEME, payload: theme };
    }
}

/**
 * Reducers - 状態更新ロジック
 */
class Reducers {
    static editor(state = INITIAL_STATE.editor, action) {
        switch (action.type) {
            case ACTION_TYPES.SET_PLANTUML_CODE:
                return { ...state, code: action.payload };
            
            case ACTION_TYPES.UPDATE_DIAGRAM:
                return { ...state, diagram: action.payload };
            
            case ACTION_TYPES.SET_EDIT_MODE:
                return { ...state, mode: action.payload };
            
            case ACTION_TYPES.SET_CURSOR_POSITION:
                return { ...state, cursorPosition: action.payload };
            
            case ACTION_TYPES.SET_SELECTION:
                return { ...state, selection: action.payload };
            
            case ACTION_TYPES.SET_ZOOM_LEVEL:
                return { ...state, zoomLevel: action.payload };
            
            default:
                return state;
        }
    }
    
    static modal(state = INITIAL_STATE.modal, action) {
        switch (action.type) {
            case ACTION_TYPES.OPEN_MODAL:
                return {
                    ...state,
                    active: action.payload.modalType,
                    data: action.payload.data,
                    isOpen: true
                };
            
            case ACTION_TYPES.CLOSE_MODAL:
                return {
                    ...state,
                    active: null,
                    data: {},
                    isOpen: false
                };
            
            case ACTION_TYPES.UPDATE_MODAL_DATA:
                return {
                    ...state,
                    data: { ...state.data, ...action.payload }
                };
            
            default:
                return state;
        }
    }
    
    static processes(state = INITIAL_STATE.processes, action) {
        switch (action.type) {
            case ACTION_TYPES.ADD_PROCESS:
                const process = {
                    id: action.payload.id || `process_${Date.now()}`,
                    ...action.payload,
                    createdAt: Date.now()
                };
                return {
                    ...state,
                    list: [...state.list, process.id],
                    byId: { ...state.byId, [process.id]: process }
                };
            
            case ACTION_TYPES.UPDATE_PROCESS:
                const { processId, updates } = action.payload;
                if (!state.byId[processId]) return state;
                
                return {
                    ...state,
                    byId: {
                        ...state.byId,
                        [processId]: {
                            ...state.byId[processId],
                            ...updates,
                            updatedAt: Date.now()
                        }
                    }
                };
            
            case ACTION_TYPES.DELETE_PROCESS:
                const { [action.payload]: deleted, ...remainingById } = state.byId;
                return {
                    ...state,
                    list: state.list.filter(id => id !== action.payload),
                    byId: remainingById,
                    active: state.active === action.payload ? null : state.active
                };
            
            case ACTION_TYPES.SET_ACTIVE_PROCESS:
                return { ...state, active: action.payload };
            
            default:
                return state;
        }
    }
    
    static ui(state = INITIAL_STATE.ui, action) {
        switch (action.type) {
            case ACTION_TYPES.SET_LOADING:
                return { ...state, loading: action.payload };
            
            case ACTION_TYPES.SET_ERROR:
                return { ...state, error: action.payload };
            
            case ACTION_TYPES.CLEAR_ERROR:
                return { ...state, error: null };
            
            case ACTION_TYPES.SET_THEME:
                return { ...state, theme: action.payload };
            
            default:
                return state;
        }
    }
    
    static settings(state = INITIAL_STATE.settings, action) {
        // 設定関連のアクションを今後追加
        return state;
    }
    
    static meta(state = INITIAL_STATE.meta, action) {
        // すべてのアクションで lastUpdated を更新
        if (action.type !== ACTION_TYPES.UNDO && action.type !== ACTION_TYPES.REDO) {
            return { ...state, lastUpdated: Date.now() };
        }
        return state;
    }
}

/**
 * Root Reducer
 */
function rootReducer(state = INITIAL_STATE, action) {
    return {
        editor: Reducers.editor(state.editor, action),
        modal: Reducers.modal(state.modal, action),
        processes: Reducers.processes(state.processes, action),
        ui: Reducers.ui(state.ui, action),
        settings: Reducers.settings(state.settings, action),
        meta: Reducers.meta(state.meta, action)
    };
}

/**
 * Middleware - ログ、非同期処理
 */
class Middleware {
    /**
     * ログミドルウェア
     */
    static logger(store) {
        return next => action => {
            const prevState = store.getState();
            console.group(`[StateManager] Action: ${action.type}`);
            console.log('Previous State:', prevState);
            console.log('Action:', action);
            
            const result = next(action);
            
            const nextState = store.getState();
            console.log('Next State:', nextState);
            console.groupEnd();
            
            return result;
        };
    }
    
    /**
     * エラーハンドリングミドルウェア
     */
    static errorHandler(store) {
        return next => action => {
            try {
                return next(action);
            } catch (error) {
                console.error('[StateManager] Error processing action:', action, error);
                
                // SecurityLoggerがあればエラーをログ
                if (window.SecurityLogger) {
                    const logger = new window.SecurityLogger();
                    logger.logError(error, 'StateManager middleware', {
                        action: action.type,
                        payload: action.payload
                    });
                }
                
                // エラー状態を設定
                store.dispatch(ActionCreators.setError({
                    message: error.message,
                    action: action.type,
                    timestamp: Date.now()
                }));
                
                throw error;
            }
        };
    }
    
    /**
     * 永続化ミドルウェア
     */
    static persistence(store) {
        return next => action => {
            const result = next(action);
            
            // 特定のアクションで自動保存
            const autoSaveActions = [
                ACTION_TYPES.SET_PLANTUML_CODE,
                ACTION_TYPES.UPDATE_PROCESS,
                ACTION_TYPES.ADD_PROCESS,
                ACTION_TYPES.DELETE_PROCESS
            ];
            
            if (autoSaveActions.includes(action.type)) {
                const state = store.getState();
                if (state.settings.autoSave) {
                    // デバウンスして保存
                    clearTimeout(store._saveTimeout);
                    store._saveTimeout = setTimeout(() => {
                        store.saveState();
                    }, 1000);
                }
            }
            
            return result;
        };
    }
    
    /**
     * パフォーマンス監視ミドルウェア
     */
    static performance(store) {
        return next => action => {
            const start = performance.now();
            const result = next(action);
            const end = performance.now();
            
            const duration = end - start;
            if (duration > 10) { // 10ms以上の処理を警告
                console.warn(`[StateManager] Slow action detected: ${action.type} (${duration.toFixed(2)}ms)`);
            }
            
            return result;
        };
    }
}

/**
 * StateManager - メインクラス
 */
class StateManager {
    constructor(initialState = INITIAL_STATE, options = {}) {
        // 設定
        this.options = {
            enableLogging: options.enableLogging !== false,
            enablePersistence: options.enablePersistence !== false,
            enableDevTools: options.enableDevTools !== false,
            historyLimit: options.historyLimit || 50,
            ...options
        };
        
        // 状態管理
        this.state = { ...initialState };
        this.state.meta.sessionId = this.generateSessionId();
        
        // 履歴管理（Undo/Redo）
        this.history = [];
        this.historyIndex = -1;
        
        // 購読者管理
        this.subscribers = new Set();
        
        // ミドルウェア設定
        this.middlewares = [];
        this.setupMiddlewares();
        
        // 初期化
        this.initialize();
        
        console.log('[StateManager] Initialized with options:', this.options);
    }
    
    /**
     * 初期化
     */
    initialize() {
        // 永続化された状態の復元
        if (this.options.enablePersistence) {
            this.loadState();
        }
        
        // DevToolsサポート
        if (this.options.enableDevTools && window.__REDUX_DEVTOOLS_EXTENSION__) {
            this.devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
                name: 'PlantUML Editor'
            });
            this.devTools.init(this.state);
        }
    }
    
    /**
     * ミドルウェア設定
     */
    setupMiddlewares() {
        if (this.options.enableLogging) {
            this.middlewares.push(Middleware.logger);
        }
        
        this.middlewares.push(Middleware.errorHandler);
        
        if (this.options.enablePersistence) {
            this.middlewares.push(Middleware.persistence);
        }
        
        this.middlewares.push(Middleware.performance);
    }
    
    /**
     * アクション処理
     */
    dispatch(action) {
        // 履歴保存（Undo/Redo用）
        if (action.type !== ACTION_TYPES.UNDO && 
            action.type !== ACTION_TYPES.REDO && 
            action.type !== ACTION_TYPES.CLEAR_HISTORY) {
            this.saveToHistory();
        }
        
        // ミドルウェアチェーン構築
        let dispatch = (action) => {
            const prevState = this.state;
            this.state = rootReducer(this.state, action);
            
            // DevTools通知
            if (this.devTools) {
                this.devTools.send(action, this.state);
            }
            
            // 購読者に通知
            this.notifySubscribers(prevState, this.state, action);
            
            return action;
        };
        
        // ミドルウェア適用
        for (let i = this.middlewares.length - 1; i >= 0; i--) {
            dispatch = this.middlewares[i](this)(dispatch);
        }
        
        return dispatch(action);
    }
    
    /**
     * 状態取得
     */
    getState() {
        return this.state;
    }
    
    /**
     * 特定パスの状態取得
     */
    getStateByPath(path) {
        return path.split('.').reduce((state, key) => state && state[key], this.state);
    }
    
    /**
     * 購読
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Subscriber must be a function');
        }
        
        this.subscribers.add(callback);
        
        // アンサブスクライブ関数を返す
        return () => {
            this.subscribers.delete(callback);
        };
    }
    
    /**
     * 購読者通知
     */
    notifySubscribers(prevState, nextState, action) {
        this.subscribers.forEach(callback => {
            try {
                callback(nextState, prevState, action);
            } catch (error) {
                console.error('[StateManager] Error in subscriber:', error);
            }
        });
    }
    
    /**
     * 履歴保存
     */
    saveToHistory() {
        // 履歴制限チェック
        if (this.history.length >= this.options.historyLimit) {
            this.history.shift();
            if (this.historyIndex > 0) {
                this.historyIndex--;
            }
        }
        
        // 現在の位置以降の履歴を削除（新しいアクションが実行された場合）
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // 現在の状態を履歴に追加
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        this.historyIndex++;
    }
    
    /**
     * Undo実行
     */
    undo() {
        if (!this.canUndo()) {
            return false;
        }
        
        this.historyIndex--;
        const prevState = this.history[this.historyIndex];
        const currentState = this.state;
        
        this.state = JSON.parse(JSON.stringify(prevState));
        
        // 購読者に通知
        this.notifySubscribers(currentState, this.state, { type: ACTION_TYPES.UNDO });
        
        // DevTools通知
        if (this.devTools) {
            this.devTools.send({ type: ACTION_TYPES.UNDO }, this.state);
        }
        
        return true;
    }
    
    /**
     * Redo実行
     */
    redo() {
        if (!this.canRedo()) {
            return false;
        }
        
        this.historyIndex++;
        const nextState = this.history[this.historyIndex];
        const currentState = this.state;
        
        this.state = JSON.parse(JSON.stringify(nextState));
        
        // 購読者に通知
        this.notifySubscribers(currentState, this.state, { type: ACTION_TYPES.REDO });
        
        // DevTools通知
        if (this.devTools) {
            this.devTools.send({ type: ACTION_TYPES.REDO }, this.state);
        }
        
        return true;
    }
    
    /**
     * Undo可能判定
     */
    canUndo() {
        return this.historyIndex > 0;
    }
    
    /**
     * Redo可能判定
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }
    
    /**
     * 履歴クリア
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.dispatch({ type: ACTION_TYPES.CLEAR_HISTORY });
    }
    
    /**
     * 状態保存（永続化）
     */
    saveState() {
        try {
            const stateToSave = {
                ...this.state,
                meta: {
                    ...this.state.meta,
                    savedAt: Date.now()
                }
            };
            
            localStorage.setItem('plantuml_editor_state', JSON.stringify(stateToSave));
            console.log('[StateManager] State saved to localStorage');
        } catch (error) {
            console.error('[StateManager] Failed to save state:', error);
        }
    }
    
    /**
     * 状態読み込み（永続化から復元）
     */
    loadState() {
        try {
            const savedState = localStorage.getItem('plantuml_editor_state');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                
                // バージョンチェック
                if (parsedState.meta && parsedState.meta.version === this.state.meta.version) {
                    this.state = {
                        ...this.state,
                        ...parsedState,
                        meta: {
                            ...parsedState.meta,
                            sessionId: this.state.meta.sessionId, // 新しいセッションID
                            loadedAt: Date.now()
                        }
                    };
                    console.log('[StateManager] State loaded from localStorage');
                } else {
                    console.warn('[StateManager] Version mismatch, using initial state');
                }
            }
        } catch (error) {
            console.error('[StateManager] Failed to load state:', error);
        }
    }
    
    /**
     * 状態リセット
     */
    resetState() {
        const currentState = this.state;
        this.state = {
            ...INITIAL_STATE,
            meta: {
                ...INITIAL_STATE.meta,
                sessionId: this.generateSessionId()
            }
        };
        
        // 履歴クリア
        this.clearHistory();
        
        // 購読者に通知
        this.notifySubscribers(currentState, this.state, { type: 'RESET_STATE' });
        
        // DevTools通知
        if (this.devTools) {
            this.devTools.send({ type: 'RESET_STATE' }, this.state);
        }
        
        console.log('[StateManager] State reset to initial state');
    }
    
    /**
     * アクションクリエーター取得
     */
    getActions() {
        // バインドされたアクションクリエーターを返す
        const boundActions = {};
        
        Object.keys(ActionCreators).forEach(key => {
            if (typeof ActionCreators[key] === 'function') {
                boundActions[key] = (...args) => {
                    return this.dispatch(ActionCreators[key](...args));
                };
            }
        });
        
        // Undo/Redo アクションを追加
        boundActions.undo = () => this.undo();
        boundActions.redo = () => this.redo();
        boundActions.canUndo = () => this.canUndo();
        boundActions.canRedo = () => this.canRedo();
        boundActions.clearHistory = () => this.clearHistory();
        
        return boundActions;
    }
    
    /**
     * セッションID生成
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            state: this.state,
            historyLength: this.history.length,
            historyIndex: this.historyIndex,
            subscriberCount: this.subscribers.size,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            options: this.options,
            middleware: this.middlewares.length
        };
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        // 最終保存
        if (this.options.enablePersistence) {
            this.saveState();
        }
        
        // タイマークリア
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        
        // 購読者クリア
        this.subscribers.clear();
        
        // DevTools切断
        if (this.devTools) {
            this.devTools.disconnect();
        }
        
        console.log('[StateManager] Destroyed');
    }
}

// グローバル公開
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
    window.ActionCreators = ActionCreators;
    window.ACTION_TYPES = ACTION_TYPES;
}

// ES6モジュールエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StateManager,
        ActionCreators,
        ACTION_TYPES,
        INITIAL_STATE,
        Reducers,
        Middleware
    };
}