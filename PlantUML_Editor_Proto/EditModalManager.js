/**
 * EditModalManager.js
 * 
 * 統合モーダル管理システム
 * 条件分岐・ループ・並行処理の編集機能を統合管理
 * SafeDOMManagerを使用してDOM操作を安全化
 * 
 * @version 1.1.0 - SafeDOMManager統合版
 * @date 2025-08-15
 */

// SafeDOMManagerが利用可能かチェック
if (typeof window !== 'undefined' && !window.SafeDOMManager) {
    console.error('[EditModalManager] SafeDOMManager is required but not found');
}

/**
 * トランザクション管理クラス
 * データの一貫性を保証し、エラー時のロールバックを実装
 */
class TransactionManager {
    constructor() {
        this.transactionStack = [];
        this.rollbackHandlers = new Map();
    }

    /**
     * トランザクション実行
     * @param {Function} operation - 実行する操作
     * @returns {Promise} 実行結果
     */
    async execute(operation) {
        const transactionId = this.generateTransactionId();
        this.transactionStack.push(transactionId);
        
        try {
            const result = await operation();
            this.commitTransaction(transactionId);
            return result;
        } catch (error) {
            await this.rollbackTransaction(transactionId);
            throw error;
        }
    }

    /**
     * トランザクションID生成
     */
    generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * トランザクションコミット
     */
    commitTransaction(transactionId) {
        const index = this.transactionStack.indexOf(transactionId);
        if (index !== -1) {
            this.transactionStack.splice(index, 1);
            this.rollbackHandlers.delete(transactionId);
        }
    }

    /**
     * トランザクションロールバック
     */
    async rollbackTransaction(transactionId) {
        const rollbackHandler = this.rollbackHandlers.get(transactionId);
        if (rollbackHandler) {
            await rollbackHandler();
        }
        this.commitTransaction(transactionId);
    }

    /**
     * ロールバックハンドラー登録
     */
    registerRollbackHandler(transactionId, handler) {
        this.rollbackHandlers.set(transactionId, handler);
    }
}

/**
 * エラーハンドリングクラス
 * エラーの分類、通知、ログ記録、回復処理を統合管理
 */
class ErrorHandler {
    constructor() {
        this.errorTypes = {
            VALIDATION: 'validation',
            SYNTAX: 'syntax',
            LOGIC: 'logic',
            NETWORK: 'network',
            UNKNOWN: 'unknown'
        };
        
        this.errorHistory = [];
        this.maxHistorySize = 100;
        
        // SafeDOMManager インスタンス作成
        this.safeDOMManager = new window.SafeDOMManager({
            enableLogging: true,
            strictMode: false
        });
    }

    /**
     * エラー処理メイン
     */
    handleError(error, context = {}) {
        const errorType = this.classifyError(error);
        const errorInfo = this.createErrorInfo(error, errorType, context);
        
        this.logError(errorInfo);
        this.notifyUser(errorInfo);
        
        // 回復可能なエラーの場合は回復を試みる
        if (this.isRecoverable(errorType)) {
            return this.attemptRecovery(errorInfo);
        }
        
        return false;
    }

    /**
     * エラー分類
     */
    classifyError(error) {
        if (error.name === 'ValidationError') {
            return this.errorTypes.VALIDATION;
        } else if (error.name === 'SyntaxError') {
            return this.errorTypes.SYNTAX;
        } else if (error.name === 'NetworkError') {
            return this.errorTypes.NETWORK;
        } else if (error.message && error.message.includes('logic')) {
            return this.errorTypes.LOGIC;
        }
        return this.errorTypes.UNKNOWN;
    }

    /**
     * エラー情報作成
     */
    createErrorInfo(error, errorType, context) {
        return {
            timestamp: new Date().toISOString(),
            type: errorType,
            message: error.message,
            stack: error.stack,
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
    }

    /**
     * エラーログ記録
     */
    logError(errorInfo) {
        console.error('[ErrorHandler]', errorInfo);
        
        // エラー履歴に追加
        this.errorHistory.push(errorInfo);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
        
        // サーバーへの送信（実装予定）
        // this.sendErrorToServer(errorInfo);
    }

    /**
     * ユーザーへの通知
     */
    notifyUser(errorInfo) {
        let userMessage = '';
        
        switch (errorInfo.type) {
            case this.errorTypes.VALIDATION:
                userMessage = '入力内容に誤りがあります。赤色で表示された項目を確認してください。';
                break;
            case this.errorTypes.SYNTAX:
                userMessage = 'PlantUML構文にエラーがあります。構文を確認してください。';
                break;
            case this.errorTypes.LOGIC:
                userMessage = 'ロジックエラーが発生しました。操作をやり直してください。';
                break;
            case this.errorTypes.NETWORK:
                userMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                break;
            default:
                userMessage = 'エラーが発生しました。しばらく待ってから再度お試しください。';
        }
        
        this.showErrorNotification(userMessage, errorInfo);
    }

    /**
     * エラー通知表示（SafeDOMManager使用）
     */
    showErrorNotification(message, errorInfo) {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.error-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 新しい通知を作成（SafeDOMManagerを使用）
        const notification = this.safeDOMManager.createElement('div', {
            'class': 'error-notification'
        });
        
        // コンテンツ部分を作成
        const content = this.safeDOMManager.createElement('div', {
            'class': 'error-notification-content'
        });
        
        // アイコン要素
        const icon = this.safeDOMManager.createElement('div', {
            'class': 'error-notification-icon'
        }, '⚠️');
        
        // メッセージ要素
        const messageElement = this.safeDOMManager.createElement('div', {
            'class': 'error-notification-message'
        });
        this.safeDOMManager.setTextContent(messageElement, message);
        
        // クローズボタン
        const closeButton = this.safeDOMManager.createElement('button', {
            'class': 'error-notification-close'
        }, '×');
        
        // イベントリスナー追加
        this.safeDOMManager.addEventListener(closeButton, 'click', () => {
            notification.remove();
        });
        
        // コンテンツに要素を追加
        content.appendChild(icon);
        content.appendChild(messageElement);
        content.appendChild(closeButton);
        notification.appendChild(content);
        
        // 検証エラーの詳細がある場合は追加
        if (errorInfo.type === this.errorTypes.VALIDATION) {
            const details = this.safeDOMManager.createElement('div', {
                'class': 'error-notification-details'
            });
            const validationDetails = this.getValidationDetails(errorInfo);
            this.safeDOMManager.setInnerHTML(details, validationDetails);
            notification.appendChild(details);
        }
        
        document.body.appendChild(notification);
        
        // 5秒後に自動削除（検証エラー以外）
        if (errorInfo.type !== this.errorTypes.VALIDATION) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }
    }

    /**
     * 検証エラーの詳細取得
     */
    getValidationDetails(errorInfo) {
        if (errorInfo.context && errorInfo.context.validationErrors) {
            return errorInfo.context.validationErrors
                .map(err => `<div>・${err.field}: ${err.message}</div>`)
                .join('');
        }
        return '';
    }

    /**
     * 回復可能なエラーか判定
     */
    isRecoverable(errorType) {
        return [this.errorTypes.VALIDATION, this.errorTypes.NETWORK].includes(errorType);
    }

    /**
     * エラー回復処理
     */
    attemptRecovery(errorInfo) {
        switch (errorInfo.type) {
            case this.errorTypes.VALIDATION:
                // フォームフィールドにフォーカス
                this.focusErrorField(errorInfo);
                return true;
                
            case this.errorTypes.NETWORK:
                // リトライ処理
                this.scheduleRetry(errorInfo);
                return true;
                
            default:
                return false;
        }
    }

    /**
     * エラーフィールドにフォーカス
     */
    focusErrorField(errorInfo) {
        if (errorInfo.context && errorInfo.context.fieldId) {
            const field = document.getElementById(errorInfo.context.fieldId);
            if (field) {
                field.focus();
                field.classList.add('error');
            }
        }
    }

    /**
     * リトライスケジュール
     */
    scheduleRetry(errorInfo) {
        if (errorInfo.context && errorInfo.context.retryCallback) {
            setTimeout(() => {
                errorInfo.context.retryCallback();
            }, 3000);
        }
    }
}

/**
 * EditModalManager - メインクラス
 * モーダル管理の中核となるクラス
 */
class EditModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.transactionManager = new TransactionManager();
        this.errorHandler = new ErrorHandler();
        this.validationRules = new Map();
        
        // イベントリスナー管理
        this.listeners = new Map();
        
        // 初期化
        this.initialize();
    }

    /**
     * 初期化処理
     */
    initialize() {
        // デフォルトモーダルタイプの登録
        this.registerDefaultModals();
        
        // グローバルイベントリスナーの設定
        this.setupGlobalListeners();
        
        // バリデーションルールの登録
        this.registerValidationRules();
        
        console.log('[EditModalManager] Initialized successfully');
    }

    /**
     * デフォルトモーダルの登録
     */
    registerDefaultModals() {
        // 後で実装されるモーダルクラスを登録
        // this.registerModal('condition', ConditionEditModal);
        // this.registerModal('loop', LoopEditModal);
        // this.registerModal('parallel', ParallelEditModal);
        // this.registerModal('action', ActionEditModal);
    }

    /**
     * モーダル登録
     */
    registerModal(type, modalClass) {
        if (!type || !modalClass) {
            throw new Error('Modal type and class are required');
        }
        
        this.modals.set(type, modalClass);
        console.log(`[EditModalManager] Registered modal type: ${type}`);
    }

    /**
     * モーダルを開く
     */
    async openModal(type, data = {}) {
        try {
            // 既存のモーダルがある場合は閉じる
            if (this.activeModal) {
                await this.closeModal();
            }
            
            const ModalClass = this.modals.get(type);
            if (!ModalClass) {
                throw new Error(`Modal type '${type}' is not registered`);
            }
            
            // モーダルインスタンス作成
            this.activeModal = new ModalClass(data, this);
            
            // モーダル表示
            await this.activeModal.show();
            
            // イベント発火
            this.triggerEvent('modalOpened', { type, data });
            
            return this.activeModal;
            
        } catch (error) {
            this.errorHandler.handleError(error, { 
                operation: 'openModal', 
                type, 
                data 
            });
            throw error;
        }
    }

    /**
     * モーダルを閉じる
     */
    async closeModal() {
        if (!this.activeModal) {
            return;
        }
        
        try {
            await this.activeModal.hide();
            this.triggerEvent('modalClosed', { modal: this.activeModal });
            this.activeModal = null;
        } catch (error) {
            this.errorHandler.handleError(error, { 
                operation: 'closeModal' 
            });
        }
    }

    /**
     * トランザクション付き保存
     */
    async saveWithTransaction(data) {
        return await this.transactionManager.execute(async () => {
            // データ検証
            await this.validateData(data);
            
            // データ保存
            const savedData = await this.saveData(data);
            
            // UI更新
            await this.updateUI(savedData);
            
            // 成功通知
            this.showSuccessNotification('保存が完了しました');
            
            return savedData;
        });
    }

    /**
     * データ検証
     */
    async validateData(data) {
        const errors = [];
        
        // タイプ別の検証ルール適用
        if (data.type) {
            const rules = this.validationRules.get(data.type);
            if (rules) {
                for (const rule of rules) {
                    const result = await rule.validate(data);
                    if (!result.valid) {
                        errors.push(result.error);
                    }
                }
            }
        }
        
        // 共通検証
        if (!data.id) {
            errors.push({ field: 'id', message: 'IDは必須です' });
        }
        
        if (errors.length > 0) {
            const error = new Error('Validation failed');
            error.name = 'ValidationError';
            error.validationErrors = errors;
            throw error;
        }
        
        return true;
    }

    /**
     * データ保存
     */
    async saveData(data) {
        // PlantUMLEditorのインスタンスを取得して保存
        if (window.app && window.app.saveActionData) {
            return await window.app.saveActionData(data);
        }
        
        // フォールバック: ローカルストレージに保存
        const storageKey = `plantuml_action_${data.id}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        return data;
    }

    /**
     * UI更新
     */
    async updateUI(data) {
        // PlantUMLEditorのUI更新メソッドを呼び出し
        if (window.app && window.app.refreshUI) {
            await window.app.refreshUI();
        }
        
        // カスタムイベント発火
        this.triggerEvent('dataUpdated', { data });
    }

    /**
     * 成功通知表示
     */
    showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <div class="success-notification-content">
                <div class="success-notification-icon">✅</div>
                <div class="success-notification-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒後に自動削除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * バリデーションルール登録
     */
    registerValidationRules() {
        // 条件分岐用ルール
        this.validationRules.set('condition', [
            {
                name: 'conditionRequired',
                validate: (data) => {
                    if (!data.condition || data.condition.trim() === '') {
                        return { 
                            valid: false, 
                            error: { field: 'condition', message: '条件は必須です' }
                        };
                    }
                    return { valid: true };
                }
            }
        ]);
        
        // ループ用ルール
        this.validationRules.set('loop', [
            {
                name: 'loopConditionRequired',
                validate: (data) => {
                    if (!data.loopCondition || data.loopCondition.trim() === '') {
                        return { 
                            valid: false, 
                            error: { field: 'loopCondition', message: 'ループ条件は必須です' }
                        };
                    }
                    return { valid: true };
                }
            }
        ]);
        
        // 並行処理用ルール
        this.validationRules.set('parallel', [
            {
                name: 'threadsRequired',
                validate: (data) => {
                    if (!data.threads || data.threads.length < 2) {
                        return { 
                            valid: false, 
                            error: { field: 'threads', message: '並行処理には2つ以上のスレッドが必要です' }
                        };
                    }
                    return { valid: true };
                }
            }
        ]);
    }

    /**
     * グローバルイベントリスナー設定
     */
    setupGlobalListeners() {
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal();
            }
        });
        
        // ウィンドウリサイズ時の調整
        window.addEventListener('resize', () => {
            if (this.activeModal && this.activeModal.adjustPosition) {
                this.activeModal.adjustPosition();
            }
        });
    }

    /**
     * イベントリスナー登録
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * イベントリスナー削除
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * イベント発火
     */
    triggerEvent(event, data) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * モーダル取得
     */
    getModal(type) {
        return this.modals.get(type);
    }

    /**
     * アクティブモーダル取得
     */
    getActiveModal() {
        return this.activeModal;
    }

    /**
     * エラー履歴取得
     */
    getErrorHistory() {
        return this.errorHandler.errorHistory;
    }

    /**
     * リソースクリーンアップ
     */
    destroy() {
        // すべてのモーダルを閉じる
        if (this.activeModal) {
            this.closeModal();
        }
        
        // リスナーをクリア
        this.listeners.clear();
        
        // モーダル登録をクリア
        this.modals.clear();
        
        console.log('[EditModalManager] Destroyed successfully');
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.EditModalManager = EditModalManager;
    window.TransactionManager = TransactionManager;
    window.ErrorHandler = ErrorHandler;
}

// ES6モジュールとしてもエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EditModalManager,
        TransactionManager,
        ErrorHandler
    };
}