/**
 * CursorStateManager.js
 * テキストエディタのカーソル位置とスクロール状態を管理するクラス
 * 
 * 機能:
 * - カーソル位置の保存と復元
 * - スクロール位置の保存と復元
 * - 選択範囲の保存と復元
 * - 更新後のカーソル位置の適切な調整
 * - 複数のテキストエリア対応
 * - アニメーション効果つきカーソル移動
 */

// グローバルスコープ対応
window.CursorStateManager = class CursorStateManager {
    constructor() {
        // カーソル状態のキャッシュ
        this.stateCache = new Map();
        this.maxCacheSize = 50;
        
        // 設定
        this.options = {
            smoothScrolling: true,        // スムーススクロール
            animationDuration: 200,       // アニメーション時間（ミリ秒）
            preserveSelection: true,      // 選択範囲の保持
            autoAdjustOnResize: true,     // リサイズ時の自動調整
            debugMode: false              // デバッグモード
        };
        
        // タイマー管理
        this.scrollTimer = null;
        this.adjustmentTimer = null;
        
        // イベントリスナーの追跡
        this.eventListeners = new Map();
        
        // パフォーマンス統計
        this.stats = {
            saves: 0,
            restores: 0,
            adjustments: 0,
            errors: 0
        };
        
        this.init();
    }
    
    /**
     * 初期化処理
     */
    init() {
        this.setupWindowResize();
        this.setupPeriodicCleanup();
        
        if (this.options.debugMode) {
            console.log('[CursorStateManager] 初期化完了');
        }
    }
    
    /**
     * ウィンドウリサイズ時の自動調整
     */
    setupWindowResize() {
        if (this.options.autoAdjustOnResize) {
            const resizeHandler = () => {
                this.adjustAllCachedStates();
            };
            
            window.addEventListener('resize', resizeHandler);
            this.eventListeners.set('resize', resizeHandler);
        }
    }
    
    /**
     * 定期的なキャッシュクリーンアップ
     */
    setupPeriodicCleanup() {
        setInterval(() => {
            this.cleanupStaleCache();
        }, 300000); // 5分ごと
    }
    
    /**
     * カーソル状態の保存
     * @param {HTMLTextAreaElement|HTMLInputElement} element - 対象要素
     * @param {string} key - キャッシュキー（オプション）
     * @returns {Object} 保存された状態オブジェクト
     */
    saveCursorState(element, key = null) {
        try {
            if (!this.isValidElement(element)) {
                throw new Error('無効な要素が指定されました');
            }
            
            const state = this.extractCurrentState(element);
            const cacheKey = key || this.generateCacheKey(element);
            
            // キャッシュに保存
            this.stateCache.set(cacheKey, {
                ...state,
                timestamp: Date.now(),
                elementId: element.id,
                elementType: element.tagName.toLowerCase()
            });
            
            // キャッシュサイズの管理
            this.limitCacheSize();
            
            this.stats.saves++;
            
            if (this.options.debugMode) {
                console.log('[CursorStateManager] カーソル状態を保存:', cacheKey, state);
            }
            
            return state;
            
        } catch (error) {
            console.error('[CursorStateManager] カーソル状態保存エラー:', error);
            this.stats.errors++;
            return null;
        }
    }
    
    /**
     * カーソル状態の復元
     * @param {HTMLTextAreaElement|HTMLInputElement} element - 対象要素
     * @param {Object|string} stateOrKey - 状態オブジェクトまたはキャッシュキー
     * @returns {boolean} 復元成功フラグ
     */
    restoreCursorState(element, stateOrKey) {
        try {
            if (!this.isValidElement(element)) {
                throw new Error('無効な要素が指定されました');
            }
            
            let state;
            
            if (typeof stateOrKey === 'string') {
                // キャッシュキーからの復元
                state = this.stateCache.get(stateOrKey);
                if (!state) {
                    if (this.options.debugMode) {
                        console.warn('[CursorStateManager] キャッシュキーが見つかりません:', stateOrKey);
                    }
                    return false;
                }
            } else if (typeof stateOrKey === 'object' && stateOrKey !== null) {
                // 直接状態オブジェクトからの復元
                state = stateOrKey;
            } else {
                throw new Error('無効な状態またはキーが指定されました');
            }
            
            this.applyStateToElement(element, state);
            
            this.stats.restores++;
            
            if (this.options.debugMode) {
                console.log('[CursorStateManager] カーソル状態を復元:', state);
            }
            
            return true;
            
        } catch (error) {
            console.error('[CursorStateManager] カーソル状態復元エラー:', error);
            this.stats.errors++;
            return false;
        }
    }
    
    /**
     * 現在のカーソル状態を取得
     * @param {HTMLTextAreaElement|HTMLInputElement} element - 対象要素
     * @returns {Object|null} 現在の状態
     */
    getCurrentState(element) {
        try {
            if (!this.isValidElement(element)) {
                return null;
            }
            
            return this.extractCurrentState(element);
            
        } catch (error) {
            console.error('[CursorStateManager] 現在状態取得エラー:', error);
            return null;
        }
    }
    
    /**
     * 更新後のカーソル位置調整
     * @param {HTMLTextAreaElement|HTMLInputElement} element - 対象要素
     * @param {Object} previousState - 以前の状態
     * @param {Object} textChanges - テキスト変更情報
     * @returns {boolean} 調整成功フラグ
     */
    adjustCursorAfterUpdate(element, previousState, textChanges = null) {
        try {
            if (!this.isValidElement(element) || !previousState) {
                return false;
            }
            
            const adjustedState = this.calculateAdjustedPosition(
                element, 
                previousState, 
                textChanges
            );
            
            this.applyStateToElement(element, adjustedState);
            
            this.stats.adjustments++;
            
            if (this.options.debugMode) {
                console.log('[CursorStateManager] カーソル位置を調整:', adjustedState);
            }
            
            return true;
            
        } catch (error) {
            console.error('[CursorStateManager] カーソル位置調整エラー:', error);
            this.stats.errors++;
            return false;
        }
    }
    
    /**
     * 要素から現在の状態を抽出
     */
    extractCurrentState(element) {
        const state = {
            // カーソル位置
            selectionStart: element.selectionStart || 0,
            selectionEnd: element.selectionEnd || 0,
            
            // スクロール位置
            scrollTop: element.scrollTop || 0,
            scrollLeft: element.scrollLeft || 0,
            
            // テキスト情報
            textLength: element.value ? element.value.length : 0,
            
            // 行情報
            lineInfo: this.calculateLineInfo(element),
            
            // 表示情報
            clientHeight: element.clientHeight,
            clientWidth: element.clientWidth,
            scrollHeight: element.scrollHeight,
            scrollWidth: element.scrollWidth
        };
        
        return state;
    }
    
    /**
     * 行情報の計算
     */
    calculateLineInfo(element) {
        if (!element.value) {
            return { currentLine: 1, currentColumn: 1, totalLines: 1 };
        }
        
        const text = element.value;
        const cursorPosition = element.selectionStart || 0;
        
        // カーソル位置までの改行数を数える
        const beforeCursor = text.substring(0, cursorPosition);
        const lines = beforeCursor.split('\n');
        const currentLine = lines.length;
        const currentColumn = lines[lines.length - 1].length + 1;
        const totalLines = text.split('\n').length;
        
        return {
            currentLine,
            currentColumn,
            totalLines
        };
    }
    
    /**
     * 状態を要素に適用
     */
    applyStateToElement(element, state) {
        // カーソル位置の復元
        if (this.options.preserveSelection && 
            'selectionStart' in state && 
            'selectionEnd' in state) {
            
            const maxLength = element.value ? element.value.length : 0;
            const start = Math.min(state.selectionStart, maxLength);
            const end = Math.min(state.selectionEnd, maxLength);
            
            element.setSelectionRange(start, end);
        }
        
        // スクロール位置の復元
        if (this.options.smoothScrolling) {
            this.smoothScrollTo(element, state.scrollTop, state.scrollLeft);
        } else {
            element.scrollTop = state.scrollTop || 0;
            element.scrollLeft = state.scrollLeft || 0;
        }
    }
    
    /**
     * スムーススクロール
     */
    smoothScrollTo(element, targetTop, targetLeft) {
        if (this.scrollTimer) {
            clearInterval(this.scrollTimer);
        }
        
        const startTop = element.scrollTop;
        const startLeft = element.scrollLeft;
        const diffTop = targetTop - startTop;
        const diffLeft = targetLeft - startLeft;
        
        const duration = this.options.animationDuration;
        const steps = Math.max(duration / 16, 1); // 60fps想定
        const stepTop = diffTop / steps;
        const stepLeft = diffLeft / steps;
        
        let currentStep = 0;
        
        this.scrollTimer = setInterval(() => {
            currentStep++;
            
            if (currentStep >= steps) {
                // 最終位置に設定
                element.scrollTop = targetTop;
                element.scrollLeft = targetLeft;
                clearInterval(this.scrollTimer);
                this.scrollTimer = null;
            } else {
                // イージング関数適用
                const progress = currentStep / steps;
                const easedProgress = this.easeInOutQuad(progress);
                
                element.scrollTop = startTop + (diffTop * easedProgress);
                element.scrollLeft = startLeft + (diffLeft * easedProgress);
            }
        }, 16); // 60fps
    }
    
    /**
     * イージング関数（ease-in-out quad）
     */
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    /**
     * 更新後の位置計算
     */
    calculateAdjustedPosition(element, previousState, textChanges) {
        const currentText = element.value || '';
        const currentLength = currentText.length;
        
        // 基本的な位置調整
        let adjustedStart = previousState.selectionStart;
        let adjustedEnd = previousState.selectionEnd;
        
        // テキスト変更情報がある場合の精密調整
        if (textChanges) {
            const adjustment = this.calculatePositionAdjustment(
                previousState.selectionStart,
                textChanges
            );
            adjustedStart += adjustment;
            adjustedEnd += adjustment;
        }
        
        // 境界チェック
        adjustedStart = Math.max(0, Math.min(adjustedStart, currentLength));
        adjustedEnd = Math.max(0, Math.min(adjustedEnd, currentLength));
        
        // スクロール位置の調整
        const adjustedScrollTop = this.calculateAdjustedScrollTop(
            element,
            previousState,
            adjustedStart
        );
        
        return {
            ...previousState,
            selectionStart: adjustedStart,
            selectionEnd: adjustedEnd,
            scrollTop: adjustedScrollTop,
            textLength: currentLength,
            lineInfo: this.calculateLineInfo({
                ...element,
                selectionStart: adjustedStart
            })
        };
    }
    
    /**
     * 位置調整量の計算
     */
    calculatePositionAdjustment(cursorPosition, textChanges) {
        let adjustment = 0;
        
        if (textChanges.insertions) {
            textChanges.insertions.forEach(insertion => {
                if (insertion.position <= cursorPosition) {
                    adjustment += insertion.length;
                }
            });
        }
        
        if (textChanges.deletions) {
            textChanges.deletions.forEach(deletion => {
                if (deletion.position < cursorPosition) {
                    adjustment -= Math.min(deletion.length, 
                                         cursorPosition - deletion.position);
                }
            });
        }
        
        return adjustment;
    }
    
    /**
     * スクロール位置の調整
     */
    calculateAdjustedScrollTop(element, previousState, newCursorPosition) {
        // 簡単な実装：カーソルが見える範囲にあるかチェック
        const lineHeight = this.estimateLineHeight(element);
        const newLineInfo = this.calculateLineInfo({
            ...element,
            selectionStart: newCursorPosition
        });
        
        const cursorTop = (newLineInfo.currentLine - 1) * lineHeight;
        const visibleTop = element.scrollTop;
        const visibleBottom = visibleTop + element.clientHeight;
        
        // カーソルが見える範囲外の場合は調整
        if (cursorTop < visibleTop) {
            return cursorTop - lineHeight; // 少し余裕を持たせる
        } else if (cursorTop > visibleBottom - lineHeight) {
            return cursorTop - element.clientHeight + lineHeight * 2;
        }
        
        return previousState.scrollTop;
    }
    
    /**
     * 行の高さを推定
     */
    estimateLineHeight(element) {
        // CSSから行の高さを取得する試み
        const styles = window.getComputedStyle(element);
        const lineHeight = parseFloat(styles.lineHeight);
        const fontSize = parseFloat(styles.fontSize);
        
        if (!isNaN(lineHeight) && lineHeight > 0) {
            return lineHeight;
        } else if (!isNaN(fontSize) && fontSize > 0) {
            return fontSize * 1.2; // 一般的な行間
        }
        
        return 20; // デフォルト値
    }
    
    /**
     * ユーティリティメソッド
     */
    
    isValidElement(element) {
        return element && 
               (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') &&
               typeof element.setSelectionRange === 'function';
    }
    
    generateCacheKey(element) {
        const id = element.id || 'unnamed';
        const timestamp = Date.now();
        return `${id}_${timestamp}`;
    }
    
    limitCacheSize() {
        if (this.stateCache.size > this.maxCacheSize) {
            // 最も古いエントリを削除
            const oldestKey = this.stateCache.keys().next().value;
            this.stateCache.delete(oldestKey);
        }
    }
    
    cleanupStaleCache() {
        const now = Date.now();
        const maxAge = 600000; // 10分
        
        for (const [key, state] of this.stateCache.entries()) {
            if (now - state.timestamp > maxAge) {
                this.stateCache.delete(key);
            }
        }
        
        if (this.options.debugMode) {
            console.log(`[CursorStateManager] 古いキャッシュをクリーンアップ: ${this.stateCache.size}個残存`);
        }
    }
    
    adjustAllCachedStates() {
        // 現在表示されている要素に対してのみ調整
        for (const [key, state] of this.stateCache.entries()) {
            if (state.elementId) {
                const element = document.getElementById(state.elementId);
                if (element && this.isValidElement(element)) {
                    // 簡単な調整（スクロール位置の再計算など）
                    const currentState = this.extractCurrentState(element);
                    const adjustedState = {
                        ...state,
                        clientHeight: currentState.clientHeight,
                        clientWidth: currentState.clientWidth,
                        scrollHeight: currentState.scrollHeight,
                        scrollWidth: currentState.scrollWidth
                    };
                    
                    this.stateCache.set(key, adjustedState);
                }
            }
        }
    }
    
    // 公開メソッド
    
    /**
     * カーソルを特定の位置に移動
     * @param {HTMLTextAreaElement|HTMLInputElement} element - 対象要素
     * @param {number} position - 移動先位置
     * @param {boolean} animate - アニメーション有無
     */
    moveCursorTo(element, position, animate = true) {
        if (!this.isValidElement(element)) return false;
        
        const maxLength = element.value ? element.value.length : 0;
        const targetPosition = Math.max(0, Math.min(position, maxLength));
        
        if (animate && this.options.smoothScrolling) {
            // アニメーション付きで移動
            this.animatedCursorMove(element, targetPosition);
        } else {
            // 即座に移動
            element.setSelectionRange(targetPosition, targetPosition);
        }
        
        return true;
    }
    
    /**
     * アニメーション付きカーソル移動
     */
    animatedCursorMove(element, targetPosition) {
        const startPosition = element.selectionStart;
        const distance = targetPosition - startPosition;
        const duration = Math.min(this.options.animationDuration, Math.abs(distance) * 2);
        const steps = Math.max(duration / 16, 1);
        const stepSize = distance / steps;
        
        let currentStep = 0;
        
        const moveTimer = setInterval(() => {
            currentStep++;
            
            if (currentStep >= steps) {
                element.setSelectionRange(targetPosition, targetPosition);
                clearInterval(moveTimer);
            } else {
                const progress = currentStep / steps;
                const easedProgress = this.easeInOutQuad(progress);
                const currentPosition = Math.round(startPosition + (distance * easedProgress));
                
                element.setSelectionRange(currentPosition, currentPosition);
            }
        }, 16);
    }
    
    /**
     * 指定行に移動
     * @param {HTMLTextAreaElement|HTMLInputElement} element - 対象要素
     * @param {number} lineNumber - 行番号（1から始まる）
     * @param {number} columnNumber - 列番号（1から始まる、オプション）
     */
    moveToLine(element, lineNumber, columnNumber = 1) {
        if (!this.isValidElement(element)) return false;
        
        const lines = (element.value || '').split('\n');
        const targetLine = Math.max(1, Math.min(lineNumber, lines.length));
        const targetColumn = Math.max(1, Math.min(columnNumber, (lines[targetLine - 1] || '').length + 1));
        
        let position = 0;
        for (let i = 0; i < targetLine - 1; i++) {
            position += lines[i].length + 1; // +1は改行文字
        }
        position += targetColumn - 1;
        
        this.moveCursorTo(element, position);
        return true;
    }
    
    /**
     * 設定の更新
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
        
        if (this.options.debugMode) {
            console.log('[CursorStateManager] オプションを更新:', this.options);
        }
    }
    
    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.stateCache.size,
            maxCacheSize: this.maxCacheSize
        };
    }
    
    /**
     * キャッシュのクリア
     */
    clearCache() {
        this.stateCache.clear();
        console.log('[CursorStateManager] キャッシュをクリアしました');
    }
    
    /**
     * デバッグ情報の出力
     */
    debug() {
        console.log('[CursorStateManager] デバッグ情報:', {
            options: this.options,
            stats: this.getStats(),
            cacheKeys: Array.from(this.stateCache.keys())
        });
    }
    
    /**
     * リソースのクリーンアップ
     */
    destroy() {
        // タイマーのクリア
        if (this.scrollTimer) {
            clearInterval(this.scrollTimer);
        }
        if (this.adjustmentTimer) {
            clearInterval(this.adjustmentTimer);
        }
        
        // イベントリスナーの削除
        for (const [event, handler] of this.eventListeners.entries()) {
            window.removeEventListener(event, handler);
        }
        this.eventListeners.clear();
        
        // キャッシュのクリア
        this.clearCache();
        
        console.log('[CursorStateManager] リソースをクリーンアップしました');
    }
}

// グローバル変数として設定済み