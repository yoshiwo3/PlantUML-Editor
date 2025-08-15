/**
 * SafeDOMManager.js
 * 
 * DOM操作の安全性確保クラス
 * - XSS攻撃防止
 * - HTMLサニタイゼーション（DOMPurify統合）
 * - 安全な要素作成・操作
 * - セキュリティイベントログ
 * - 既存コードとの互換性保持
 * 
 * @version 1.0.0
 * @date 2025-08-15
 */

/**
 * 許可されたHTML要素とその属性の定義
 */
const ALLOWED_ELEMENTS = {
    // テキスト要素
    'span': ['class', 'id', 'style', 'data-*'],
    'div': ['class', 'id', 'style', 'data-*'],
    'p': ['class', 'id', 'style', 'data-*'],
    'h1': ['class', 'id', 'style', 'data-*'],
    'h2': ['class', 'id', 'style', 'data-*'],
    'h3': ['class', 'id', 'style', 'data-*'],
    'h4': ['class', 'id', 'style', 'data-*'],
    'h5': ['class', 'id', 'style', 'data-*'],
    'h6': ['class', 'id', 'style', 'data-*'],
    'em': ['class', 'id', 'style'],
    'strong': ['class', 'id', 'style'],
    'small': ['class', 'id', 'style'],
    'code': ['class', 'id', 'style'],
    'pre': ['class', 'id', 'style'],
    
    // リスト要素
    'ul': ['class', 'id', 'style', 'data-*'],
    'ol': ['class', 'id', 'style', 'data-*'],
    'li': ['class', 'id', 'style', 'data-*'],
    
    // フォーム要素
    'input': ['type', 'name', 'value', 'placeholder', 'class', 'id', 'required', 'readonly', 'disabled', 'data-*'],
    'textarea': ['name', 'placeholder', 'class', 'id', 'rows', 'cols', 'required', 'readonly', 'disabled', 'data-*'],
    'select': ['name', 'class', 'id', 'required', 'disabled', 'data-*'],
    'option': ['value', 'selected', 'disabled', 'data-*'],
    'button': ['type', 'class', 'id', 'disabled', 'data-*'],
    'label': ['for', 'class', 'id', 'data-*'],
    'form': ['action', 'method', 'class', 'id', 'data-*'],
    
    // テーブル要素
    'table': ['class', 'id', 'style', 'data-*'],
    'thead': ['class', 'id', 'style', 'data-*'],
    'tbody': ['class', 'id', 'style', 'data-*'],
    'tfoot': ['class', 'id', 'style', 'data-*'],
    'tr': ['class', 'id', 'style', 'data-*'],
    'th': ['class', 'id', 'style', 'colspan', 'rowspan', 'data-*'],
    'td': ['class', 'id', 'style', 'colspan', 'rowspan', 'data-*'],
    
    // その他
    'img': ['src', 'alt', 'width', 'height', 'class', 'id', 'style', 'data-*'],
    'a': ['href', 'target', 'class', 'id', 'rel', 'data-*'],
    'br': [],
    'hr': ['class', 'id', 'style'],
    'i': ['class', 'id', 'style'],
    'b': ['class', 'id', 'style']
};

/**
 * 危険なプロトコルのリスト
 */
const DANGEROUS_PROTOCOLS = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:'
];

/**
 * 危険な属性のリスト
 */
const DANGEROUS_ATTRIBUTES = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onkeydown', 'onkeyup', 'onkeypress', 'onchange', 'onsubmit',
    'onfocus', 'onblur', 'onresize', 'onscroll', 'ondblclick',
    'oncontextmenu', 'onmousedown', 'onmouseup', 'onmousemove',
    'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel'
];

/**
 * SafeDOMManager - 安全なDOM操作クラス
 * 
 * 機能:
 * - DOMPurify統合による強力なHTMLサニタイゼーション
 * - 安全なDOM要素作成・操作メソッド
 * - XSS攻撃防御機能
 * - セキュリティイベント自動ログ
 * - 既存コードとの後方互換性
 */
class SafeDOMManager {
    constructor(options = {}) {
        this.options = {
            enableLogging: options.enableLogging !== false,
            enableDOMPurify: options.enableDOMPurify !== false,
            strictMode: options.strictMode || false,
            customAllowedElements: options.customAllowedElements || {},
            customAllowedAttributes: options.customAllowedAttributes || {},
            ...options
        };
        
        // SecurityLogger インスタンス
        this.securityLogger = null;
        
        // DOMPurify設定
        this.domPurifyConfig = {
            ALLOWED_TAGS: Object.keys({ ...ALLOWED_ELEMENTS, ...this.options.customAllowedElements }),
            ALLOWED_ATTR: this.getAllowedAttributes(),
            FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'meta'],
            FORBID_ATTR: [...DANGEROUS_ATTRIBUTES],
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            KEEP_CONTENT: false,
            RETURN_DOM: false,
            RETURN_DOM_FRAGMENT: false,
            SANITIZE_DOM: true
        };
        
        // 初期化
        this.initialize();
        
        console.log('[SafeDOMManager] Initialized with options:', this.options);
    }
    
    /**
     * 初期化処理
     */
    initialize() {
        // SecurityLogger インスタンス作成
        if (this.options.enableLogging && window.SecurityLogger) {
            this.securityLogger = new window.SecurityLogger({
                logLevel: window.LOG_LEVELS ? window.LOG_LEVELS.WARN : 2
            });
        }
        
        // DOMPurifyの設定確認
        this.checkDOMPurify();
        
        // グローバルイベントリスナーの設定
        this.setupGlobalListeners();
    }
    
    /**
     * 許可された属性のリストを作成
     */
    getAllowedAttributes() {
        const allAttributes = new Set();
        
        Object.values(ALLOWED_ELEMENTS).forEach(attributes => {
            attributes.forEach(attr => {
                if (attr.includes('*')) {
                    // data-* のようなワイルドカード属性
                    allAttributes.add(attr.replace('*', ''));
                } else {
                    allAttributes.add(attr);
                }
            });
        });
        
        // カスタム属性も追加
        Object.values(this.options.customAllowedAttributes).forEach(attributes => {
            attributes.forEach(attr => allAttributes.add(attr));
        });
        
        return Array.from(allAttributes);
    }
    
    /**
     * DOMPurify設定確認
     */
    checkDOMPurify() {
        if (this.options.enableDOMPurify && typeof window !== 'undefined' && window.DOMPurify) {
            this.hasDOMPurify = true;
            console.log('[SafeDOMManager] DOMPurify detected and configured');
        } else {
            this.hasDOMPurify = false;
            console.warn('[SafeDOMManager] DOMPurify not found, using fallback sanitization');
        }
    }
    
    /**
     * 安全な要素作成
     * @param {string} tagName - 作成する要素のタグ名
     * @param {Object} attributes - 設定する属性のオブジェクト
     * @param {string} textContent - 設定するテキストコンテンツ
     * @returns {HTMLElement} 作成された要素
     */
    createElement(tagName, attributes = {}, textContent = '') {
        try {
            // タグ名の検証
            if (!this.isAllowedElement(tagName)) {
                this.logSecurityEvent('INVALID_ELEMENT', `Attempted to create disallowed element: ${tagName}`, {
                    tagName,
                    attributes,
                    textContent
                });
                throw new Error(`Element '${tagName}' is not allowed`);
            }
            
            // 要素作成
            const element = document.createElement(tagName);
            
            // 属性設定
            if (attributes && typeof attributes === 'object') {
                this.setAttributes(element, attributes);
            }
            
            // テキストコンテンツ設定（XSS対策）
            if (textContent) {
                this.setTextContent(element, textContent);
            }
            
            return element;
            
        } catch (error) {
            this.logSecurityEvent('CREATE_ELEMENT_ERROR', `Failed to create element: ${error.message}`, {
                tagName,
                attributes,
                textContent,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 安全な属性設定
     * @param {HTMLElement} element - 対象要素
     * @param {string} attribute - 属性名
     * @param {string} value - 属性値
     * @returns {HTMLElement} 設定済み要素
     */
    setAttribute(element, attribute, value) {
        try {
            // 要素の検証
            if (!element || !element.tagName) {
                throw new Error('Invalid element provided');
            }
            
            const tagName = element.tagName.toLowerCase();
            
            // 属性の検証
            if (!this.isAllowedAttribute(tagName, attribute)) {
                this.logSecurityEvent('INVALID_ATTRIBUTE', `Attempted to set disallowed attribute: ${attribute} on ${tagName}`, {
                    tagName,
                    attribute,
                    value
                });
                throw new Error(`Attribute '${attribute}' is not allowed for element '${tagName}'`);
            }
            
            // 値のサニタイゼーション
            const sanitizedValue = this.sanitizeAttributeValue(attribute, value);
            
            // 属性設定
            element.setAttribute(attribute, sanitizedValue);
            
            return element;
            
        } catch (error) {
            this.logSecurityEvent('SET_ATTRIBUTE_ERROR', `Failed to set attribute: ${error.message}`, {
                element: element.tagName,
                attribute,
                value,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 複数属性の安全な設定
     * @param {HTMLElement} element - 対象要素
     * @param {Object} attributes - 属性のオブジェクト
     * @returns {HTMLElement} 設定済み要素
     */
    setAttributes(element, attributes) {
        if (!attributes || typeof attributes !== 'object') {
            return element;
        }
        
        Object.entries(attributes).forEach(([key, value]) => {
            this.setAttribute(element, key, value);
        });
        
        return element;
    }
    
    /**
     * 安全なHTML設定（innerHTML の安全な代替）
     * @param {HTMLElement} element - 対象要素
     * @param {string} html - 設定するHTML文字列
     * @returns {HTMLElement} 設定済み要素
     */
    setInnerHTML(element, html) {
        try {
            if (!element) {
                throw new Error('Invalid element provided');
            }
            
            // HTMLのサニタイゼーション
            const sanitizedHTML = this.sanitizeHTML(html);
            
            // innerHTML設定
            element.innerHTML = sanitizedHTML;
            
            return element;
            
        } catch (error) {
            this.logSecurityEvent('SET_INNERHTML_ERROR', `Failed to set innerHTML: ${error.message}`, {
                element: element.tagName || 'unknown',
                originalHTML: html?.substring(0, 200) + (html?.length > 200 ? '...' : ''),
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 安全なテキストコンテンツ設定
     * @param {HTMLElement} element - 対象要素
     * @param {string} text - 設定するテキスト
     * @returns {HTMLElement} 設定済み要素
     */
    setTextContent(element, text) {
        try {
            if (!element) {
                throw new Error('Invalid element provided');
            }
            
            // テキストエスケープ
            const escapedText = this.escapeText(text);
            element.textContent = escapedText;
            
            return element;
            
        } catch (error) {
            this.logSecurityEvent('SET_TEXTCONTENT_ERROR', `Failed to set textContent: ${error.message}`, {
                element: element.tagName || 'unknown',
                text: text?.substring(0, 200) + (text?.length > 200 ? '...' : ''),
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 安全なイベントリスナー追加
     * @param {HTMLElement} element - 対象要素
     * @param {string} eventType - イベントタイプ
     * @param {Function} handler - イベントハンドラー
     * @param {Object} options - イベントオプション
     * @returns {HTMLElement} 設定済み要素
     */
    addEventListener(element, eventType, handler, options = {}) {
        try {
            if (!element || typeof element.addEventListener !== 'function') {
                throw new Error('Invalid element provided');
            }
            
            if (typeof handler !== 'function') {
                throw new Error('Event handler must be a function');
            }
            
            // イベントタイプの検証
            if (!this.isAllowedEventType(eventType)) {
                this.logSecurityEvent('INVALID_EVENT_TYPE', `Attempted to add disallowed event type: ${eventType}`, {
                    element: element.tagName,
                    eventType,
                    options
                });
                throw new Error(`Event type '${eventType}' is not allowed`);
            }
            
            // セキュリティラッパーでハンドラーをラップ
            const wrappedHandler = this.wrapEventHandler(handler, eventType);
            
            // イベントリスナー追加
            element.addEventListener(eventType, wrappedHandler, options);
            
            return element;
            
        } catch (error) {
            this.logSecurityEvent('ADD_EVENTLISTENER_ERROR', `Failed to add event listener: ${error.message}`, {
                element: element.tagName || 'unknown',
                eventType,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * HTMLサニタイゼーション
     * @param {string} html - サニタイズするHTML文字列
     * @returns {string} サニタイズされたHTML文字列
     */
    sanitizeHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }
        
        // DOMPurifyを使用
        if (this.hasDOMPurify) {
            const sanitized = window.DOMPurify.sanitize(html, this.domPurifyConfig);
            
            // サニタイゼーション前後の比較
            if (sanitized !== html) {
                this.logSecurityEvent('HTML_SANITIZED', 'HTML content was sanitized', {
                    originalLength: html.length,
                    sanitizedLength: sanitized.length,
                    removed: html.length - sanitized.length
                });
            }
            
            return sanitized;
        }
        
        // フォールバックサニタイゼーション
        return this.fallbackSanitizeHTML(html);
    }
    
    /**
     * フォールバックHTMLサニタイゼーション
     * @param {string} html - サニタイズするHTML文字列
     * @returns {string} サニタイズされたHTML文字列
     */
    fallbackSanitizeHTML(html) {
        // 基本的なXSS対策
        let sanitized = html
            // スクリプトタグの完全削除
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<script[^>]*>/gi, '')
            
            // 危険なタグの削除
            .replace(/<(object|embed|link|style|meta|iframe|frame|frameset)[^>]*>/gi, '')
            .replace(/<\/(object|embed|link|style|meta|iframe|frame|frameset)>/gi, '')
            
            // イベントハンドラーの削除
            .replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
            
            // JavaScriptプロトコルの削除
            .replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="#"')
            .replace(/src\s*=\s*["']?\s*javascript:/gi, 'src=""')
            
            // データプロトコルの制限
            .replace(/\b(?:href|src)\s*=\s*["']?\s*data:/gi, 'data-blocked="data:"');
        
        // 変更があった場合はログ
        if (sanitized !== html) {
            this.logSecurityEvent('HTML_SANITIZED_FALLBACK', 'HTML content was sanitized using fallback method', {
                originalLength: html.length,
                sanitizedLength: sanitized.length,
                removed: html.length - sanitized.length
            });
        }
        
        return sanitized;
    }
    
    /**
     * 属性値サニタイゼーション
     * @param {string} attribute - 属性名
     * @param {string} value - 属性値
     * @returns {string} サニタイズされた属性値
     */
    sanitizeAttributeValue(attribute, value) {
        if (typeof value !== 'string') {
            return value;
        }
        
        const lowerAttribute = attribute.toLowerCase();
        
        // URL属性の検証
        if (['href', 'src', 'action'].includes(lowerAttribute)) {
            return this.sanitizeURL(value);
        }
        
        // Style属性の検証
        if (lowerAttribute === 'style') {
            return this.sanitizeStyle(value);
        }
        
        // その他の属性値エスケープ
        return this.escapeAttributeValue(value);
    }
    
    /**
     * URL属性のサニタイゼーション
     * @param {string} url - サニタイズするURL
     * @returns {string} サニタイズされたURL
     */
    sanitizeURL(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }
        
        const trimmedURL = url.trim().toLowerCase();
        
        // 危険なプロトコルの検出
        for (const protocol of DANGEROUS_PROTOCOLS) {
            if (trimmedURL.startsWith(protocol)) {
                this.logSecurityEvent('DANGEROUS_URL_BLOCKED', `Dangerous URL protocol blocked: ${protocol}`, {
                    originalURL: url,
                    protocol
                });
                return '#blocked-url';
            }
        }
        
        return url;
    }
    
    /**
     * スタイル属性のサニタイゼーション
     * @param {string} style - サニタイズするCSS文字列
     * @returns {string} サニタイズされたCSS文字列
     */
    sanitizeStyle(style) {
        if (!style || typeof style !== 'string') {
            return '';
        }
        
        // 危険なCSSの除去
        let sanitizedStyle = style
            // expression() の除去
            .replace(/expression\s*\([^)]*\)/gi, '')
            // javascript: の除去
            .replace(/javascript\s*:/gi, '')
            // @import の除去
            .replace(/@import[^;]*/gi, '')
            // url() 内の危険なプロトコル除去
            .replace(/url\s*\(\s*["']?\s*(?:javascript|data|vbscript):/gi, 'url(#blocked');
        
        if (sanitizedStyle !== style) {
            this.logSecurityEvent('STYLE_SANITIZED', 'CSS style was sanitized', {
                originalLength: style.length,
                sanitizedLength: sanitizedStyle.length
            });
        }
        
        return sanitizedStyle;
    }
    
    /**
     * テキストエスケープ
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeText(text) {
        if (typeof text !== 'string') {
            return String(text);
        }
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    
    /**
     * 属性値エスケープ
     * @param {string} value - エスケープする属性値
     * @returns {string} エスケープされた属性値
     */
    escapeAttributeValue(value) {
        if (typeof value !== 'string') {
            return String(value);
        }
        
        return value
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ');
    }
    
    /**
     * 要素が許可されているかチェック
     * @param {string} tagName - チェックするタグ名
     * @returns {boolean} 許可されている場合true
     */
    isAllowedElement(tagName) {
        const lowerTagName = tagName.toLowerCase();
        return ALLOWED_ELEMENTS.hasOwnProperty(lowerTagName) || 
               this.options.customAllowedElements.hasOwnProperty(lowerTagName);
    }
    
    /**
     * 属性が許可されているかチェック
     * @param {string} tagName - 要素のタグ名
     * @param {string} attribute - チェックする属性名
     * @returns {boolean} 許可されている場合true
     */
    isAllowedAttribute(tagName, attribute) {
        const lowerTagName = tagName.toLowerCase();
        const lowerAttribute = attribute.toLowerCase();
        
        // 危険な属性の除外
        if (DANGEROUS_ATTRIBUTES.includes(lowerAttribute)) {
            return false;
        }
        
        // 許可された属性のチェック
        const allowedAttrs = ALLOWED_ELEMENTS[lowerTagName] || [];
        const customAllowedAttrs = this.options.customAllowedElements[lowerTagName] || [];
        const allAllowedAttrs = [...allowedAttrs, ...customAllowedAttrs];
        
        // 直接マッチ
        if (allAllowedAttrs.includes(lowerAttribute)) {
            return true;
        }
        
        // data-* 属性のチェック
        if (lowerAttribute.startsWith('data-') && allAllowedAttrs.includes('data-*')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * イベントタイプが許可されているかチェック
     * @param {string} eventType - チェックするイベントタイプ
     * @returns {boolean} 許可されている場合true
     */
    isAllowedEventType(eventType) {
        const allowedEvents = [
            'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'mousemove',
            'keydown', 'keyup', 'keypress',
            'focus', 'blur', 'change', 'input', 'submit', 'reset',
            'load', 'unload', 'resize', 'scroll',
            'touchstart', 'touchend', 'touchmove', 'touchcancel',
            'dragstart', 'dragend', 'dragover', 'drop'
        ];
        
        return allowedEvents.includes(eventType.toLowerCase());
    }
    
    /**
     * イベントハンドラーのセキュリティラッパー
     * @param {Function} handler - ラップするハンドラー
     * @param {string} eventType - イベントタイプ
     * @returns {Function} ラップされたハンドラー
     */
    wrapEventHandler(handler, eventType) {
        return (event) => {
            try {
                // イベントオブジェクトの検証
                if (!event || typeof event !== 'object') {
                    this.logSecurityEvent('INVALID_EVENT_OBJECT', `Invalid event object for ${eventType}`, {
                        eventType,
                        eventObject: typeof event
                    });
                    return;
                }
                
                // ハンドラー実行
                return handler.call(this, event);
                
            } catch (error) {
                this.logSecurityEvent('EVENT_HANDLER_ERROR', `Error in event handler for ${eventType}: ${error.message}`, {
                    eventType,
                    error: error.message,
                    stack: error.stack
                });
                
                // エラーを再スローしない（UIの継続性を保つ）
                console.error(`[SafeDOMManager] Event handler error:`, error);
            }
        };
    }
    
    /**
     * DOM要素の検証
     * @param {HTMLElement} element - 検証する要素
     * @returns {boolean} 有効な場合true
     */
    validateElement(element) {
        if (!element || !element.tagName) {
            return false;
        }
        
        const tagName = element.tagName.toLowerCase();
        
        // 要素の許可チェック
        if (!this.isAllowedElement(tagName)) {
            this.logSecurityEvent('INVALID_ELEMENT_DETECTED', `Invalid element detected: ${tagName}`, {
                tagName,
                innerHTML: element.innerHTML?.substring(0, 100)
            });
            return false;
        }
        
        // 属性の検証
        const attributes = element.attributes;
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            if (!this.isAllowedAttribute(tagName, attr.name)) {
                this.logSecurityEvent('INVALID_ATTRIBUTE_DETECTED', `Invalid attribute detected: ${attr.name} on ${tagName}`, {
                    tagName,
                    attributeName: attr.name,
                    attributeValue: attr.value
                });
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * DOM ツリーの検証
     * @param {HTMLElement} rootElement - 検証するルート要素
     * @returns {boolean} 有効な場合true
     */
    validateDOMTree(rootElement) {
        if (!rootElement) {
            return true;
        }
        
        const stack = [rootElement];
        const invalidElements = [];
        
        while (stack.length > 0) {
            const element = stack.pop();
            
            if (element.nodeType === Node.ELEMENT_NODE) {
                if (!this.validateElement(element)) {
                    invalidElements.push(element);
                }
                
                // 子要素をスタックに追加
                for (let i = 0; i < element.children.length; i++) {
                    stack.push(element.children[i]);
                }
            }
        }
        
        if (invalidElements.length > 0) {
            this.logSecurityEvent('INVALID_DOM_TREE', `Invalid DOM tree detected with ${invalidElements.length} invalid elements`, {
                invalidElementCount: invalidElements.length,
                invalidElements: invalidElements.map(el => el.tagName).slice(0, 10)
            });
            return false;
        }
        
        return true;
    }
    
    /**
     * グローバルリスナーの設定
     */
    setupGlobalListeners() {
        // MutationObserver でDOMの変更を監視
        if (typeof window !== 'undefined' && window.MutationObserver && this.options.enableLogging) {
            this.mutationObserver = new MutationObserver((mutations) => {
                this.handleDOMMutations(mutations);
            });
            
            // ドキュメント全体を監視
            if (document.body) {
                this.mutationObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['onclick', 'onload', 'onerror']
                });
            }
        }
    }
    
    /**
     * DOM変更の処理
     * @param {MutationRecord[]} mutations - 変更レコード配列
     */
    handleDOMMutations(mutations) {
        mutations.forEach((mutation) => {
            // 追加されたノードをチェック
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (!this.validateElement(node)) {
                        // 無効な要素が検出された場合は削除
                        if (this.options.strictMode) {
                            node.remove();
                        }
                    }
                }
            });
            
            // 属性の変更をチェック
            if (mutation.type === 'attributes') {
                const element = mutation.target;
                const attributeName = mutation.attributeName;
                
                if (DANGEROUS_ATTRIBUTES.includes(attributeName)) {
                    this.logSecurityEvent('DANGEROUS_ATTRIBUTE_ADDED', `Dangerous attribute added: ${attributeName}`, {
                        tagName: element.tagName,
                        attributeName,
                        attributeValue: element.getAttribute(attributeName)
                    });
                    
                    if (this.options.strictMode) {
                        element.removeAttribute(attributeName);
                    }
                }
            }
        });
    }
    
    /**
     * セキュリティイベントログ
     * @param {string} eventType - イベントタイプ
     * @param {string} message - ログメッセージ
     * @param {Object} metadata - 追加メタデータ
     */
    logSecurityEvent(eventType, message, metadata = {}) {
        if (this.securityLogger) {
            this.securityLogger.logSecurityEvent(eventType, message, {
                component: 'SafeDOMManager',
                ...metadata
            });
        } else if (this.options.enableLogging) {
            console.warn(`[SafeDOMManager:${eventType}] ${message}`, metadata);
        }
    }
    
    /**
     * 統計情報取得
     * @returns {Object} 統計情報オブジェクト
     */
    getStats() {
        return {
            hasDOMPurify: this.hasDOMPurify,
            allowedElementCount: Object.keys(ALLOWED_ELEMENTS).length,
            customAllowedElementCount: Object.keys(this.options.customAllowedElements).length,
            strictMode: this.options.strictMode,
            mutationObserverActive: !!this.mutationObserver
        };
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        // MutationObserver停止
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        
        // SecurityLogger クリーンアップ
        if (this.securityLogger && typeof this.securityLogger.cleanup === 'function') {
            this.securityLogger.cleanup();
        }
        
        console.log('[SafeDOMManager] Destroyed');
    }
}

// DOMPurifyが利用可能でない場合のフォールバック警告
if (typeof window !== 'undefined' && !window.DOMPurify) {
    console.warn('[SafeDOMManager] DOMPurify is not available. Consider including it for enhanced security.');
    console.warn('[SafeDOMManager] Fallback sanitization is active but may be less secure.');
}

// グローバル公開
if (typeof window !== 'undefined') {
    window.SafeDOMManager = SafeDOMManager;
    window.ALLOWED_ELEMENTS = ALLOWED_ELEMENTS;
    window.DANGEROUS_ATTRIBUTES = DANGEROUS_ATTRIBUTES;
}

// ES6モジュールエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SafeDOMManager,
        ALLOWED_ELEMENTS,
        DANGEROUS_ATTRIBUTES,
        DANGEROUS_PROTOCOLS
    };
}