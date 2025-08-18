/**
 * SafeDOMManager.js
 * 
 * DOM操作の安全性を確保するための管理クラス
 * XSS攻撃の防止、DOM操作の検証、エラーハンドリングを提供
 * 
 * @version 1.0.0
 * @date 2025-08-18
 */

class SafeDOMManager {
    constructor(options = {}) {
        this.options = {
            enableLogging: false,
            strictMode: false,
            maxRetries: 3,
            retryDelay: 100,
            ...options
        };
        
        this.operationQueue = [];
        this.errorLog = [];
        
        if (this.options.enableLogging) {
            console.log('[SafeDOMManager] Initialized with options:', this.options);
        }
    }

    /**
     * 安全なHTML文字列のエスケープ
     * @param {string} str - エスケープする文字列
     * @returns {string} エスケープされた文字列
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * 安全な要素の作成
     * @param {string} tagName - タグ名
     * @param {Object} attributes - 属性
     * @param {string} content - コンテンツ
     * @returns {HTMLElement} 作成された要素
     */
    createElement(tagName, attributes = {}, content = '') {
        try {
            const element = document.createElement(tagName);
            
            // 属性の設定
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key.startsWith('data-')) {
                    element.setAttribute(key, value);
                } else {
                    element[key] = value;
                }
            });
            
            // コンテンツの設定
            if (content) {
                element.textContent = content;
            }
            
            return element;
        } catch (error) {
            this.logError('createElement', error);
            return null;
        }
    }

    /**
     * 安全な要素の挿入
     * @param {HTMLElement} parent - 親要素
     * @param {HTMLElement} child - 子要素
     * @param {HTMLElement} before - 挿入位置の参照要素
     */
    insertElement(parent, child, before = null) {
        try {
            if (!parent || !child) {
                throw new Error('Parent and child elements are required');
            }
            
            if (before) {
                parent.insertBefore(child, before);
            } else {
                parent.appendChild(child);
            }
            
            return true;
        } catch (error) {
            this.logError('insertElement', error);
            return false;
        }
    }

    /**
     * 安全な要素の削除
     * @param {HTMLElement} element - 削除する要素
     */
    removeElement(element) {
        try {
            if (!element || !element.parentNode) {
                return false;
            }
            
            element.parentNode.removeChild(element);
            return true;
        } catch (error) {
            this.logError('removeElement', error);
            return false;
        }
    }

    /**
     * 安全なイベントリスナーの追加
     * @param {HTMLElement} element - 要素
     * @param {string} event - イベント名
     * @param {Function} handler - ハンドラー
     * @param {Object} options - オプション
     */
    addEventListener(element, event, handler, options = {}) {
        try {
            if (!element || !event || !handler) {
                throw new Error('Element, event, and handler are required');
            }
            
            const safeHandler = (e) => {
                try {
                    handler(e);
                } catch (error) {
                    this.logError(`Event handler for ${event}`, error);
                }
            };
            
            element.addEventListener(event, safeHandler, options);
            
            // ハンドラーの参照を保持（後で削除できるように）
            if (!element._safeHandlers) {
                element._safeHandlers = new Map();
            }
            element._safeHandlers.set(handler, safeHandler);
            
            return true;
        } catch (error) {
            this.logError('addEventListener', error);
            return false;
        }
    }

    /**
     * イベントリスナーの削除
     * @param {HTMLElement} element - 要素
     * @param {string} event - イベント名
     * @param {Function} handler - ハンドラー
     */
    removeEventListener(element, event, handler) {
        try {
            if (!element || !element._safeHandlers) {
                return false;
            }
            
            const safeHandler = element._safeHandlers.get(handler);
            if (safeHandler) {
                element.removeEventListener(event, safeHandler);
                element._safeHandlers.delete(handler);
            }
            
            return true;
        } catch (error) {
            this.logError('removeEventListener', error);
            return false;
        }
    }

    /**
     * 安全なクラスの追加
     * @param {HTMLElement} element - 要素
     * @param {string} className - クラス名
     */
    addClass(element, className) {
        try {
            if (!element || !className) return false;
            element.classList.add(className);
            return true;
        } catch (error) {
            this.logError('addClass', error);
            return false;
        }
    }

    /**
     * 安全なクラスの削除
     * @param {HTMLElement} element - 要素
     * @param {string} className - クラス名
     */
    removeClass(element, className) {
        try {
            if (!element || !className) return false;
            element.classList.remove(className);
            return true;
        } catch (error) {
            this.logError('removeClass', error);
            return false;
        }
    }

    /**
     * 安全な属性の設定
     * @param {HTMLElement} element - 要素
     * @param {string} name - 属性名
     * @param {string} value - 値
     */
    setAttribute(element, name, value) {
        try {
            if (!element || !name) return false;
            
            // 危険な属性をブロック
            const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
            if (dangerousAttrs.includes(name.toLowerCase())) {
                console.warn(`[SafeDOMManager] Blocked dangerous attribute: ${name}`);
                return false;
            }
            
            element.setAttribute(name, value);
            return true;
        } catch (error) {
            this.logError('setAttribute', error);
            return false;
        }
    }

    /**
     * 安全なテキストコンテンツの設定
     * @param {HTMLElement} element - 要素
     * @param {string} text - テキスト
     */
    setText(element, text) {
        try {
            if (!element) return false;
            element.textContent = text;
            return true;
        } catch (error) {
            this.logError('setText', error);
            return false;
        }
    }

    /**
     * 安全なHTMLコンテンツの設定（サニタイズ付き）
     * @param {HTMLElement} element - 要素
     * @param {string} html - HTML文字列
     */
    setHTML(element, html) {
        try {
            if (!element) return false;
            
            // 基本的なサニタイズ（実際のプロダクションではDOMPurifyなどを使用）
            const sanitized = this.sanitizeHTML(html);
            element.innerHTML = sanitized;
            return true;
        } catch (error) {
            this.logError('setHTML', error);
            return false;
        }
    }

    /**
     * HTMLのサニタイズ（簡易版）
     * @param {string} html - サニタイズするHTML
     * @returns {string} サニタイズされたHTML
     */
    sanitizeHTML(html) {
        if (typeof html !== 'string') return '';
        
        // スクリプトタグを削除
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // イベントハンドラー属性を削除
        html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
        
        // javascript:プロトコルを削除
        html = html.replace(/javascript:/gi, '');
        
        return html;
    }

    /**
     * エラーログの記録
     * @param {string} operation - 操作名
     * @param {Error} error - エラーオブジェクト
     */
    logError(operation, error) {
        const errorInfo = {
            operation,
            message: error.message,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        this.errorLog.push(errorInfo);
        
        if (this.options.enableLogging) {
            console.error(`[SafeDOMManager] ${operation} error:`, error);
        }
    }

    /**
     * エラーログの取得
     * @returns {Array} エラーログ
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * エラーログのクリア
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * クリーンアップ
     */
    destroy() {
        this.operationQueue = [];
        this.errorLog = [];
        
        if (this.options.enableLogging) {
            console.log('[SafeDOMManager] Destroyed');
        }
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.SafeDOMManager = SafeDOMManager;
}

// エクスポート（モジュール環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeDOMManager;
}