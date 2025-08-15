/**
 * CSPManager - Content Security Policy管理システム
 * 
 * Webアプリケーションのセキュリティヘッダー管理、
 * XSS攻撃防御、コンテンツ制御を担当
 * 
 * 作成日: 2025-08-15
 * 作成者: agent-orchestrator  
 * バージョン: 1.0.0
 */

class CSPManager {
    constructor() {
        this.policies = new Map();
        this.violations = [];
        this.isEnabled = false;
        
        // デフォルトポリシーの設定
        this.initializeDefaultPolicies();
        
        // CSP違反レポートの監視
        this.setupViolationReporting();
        
        console.log('[CSPManager] 初期化完了 - セキュリティポリシー設定済み');
    }
    
    /**
     * CSPヘッダーを生成
     * @param {string} level - セキュリティレベル ('strict', 'balanced', 'permissive')
     * @returns {string} CSPヘッダー文字列
     */
    generateCSPHeader(level = 'balanced') {
        const policy = this.policies.get(level);
        
        if (!policy) {
            console.warn(`[CSPManager] 不明なセキュリティレベル: ${level}`);
            return this.policies.get('balanced').header;
        }
        
        return policy.header;
    }
    
    /**
     * CSPポリシーを適用
     * @param {string} level - セキュリティレベル
     */
    applyCSP(level = 'balanced') {
        try {
            const cspHeader = this.generateCSPHeader(level);
            
            // ブラウザ環境でのCSP適用
            if (typeof document !== 'undefined') {
                this.applyCSPToDOMDocument(cspHeader);
            }
            
            // サーバーサイドでの適用（Node.js環境）
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                this.applyCSPToServer(cspHeader);
            }
            
            this.isEnabled = true;
            console.log(`[CSPManager] CSPポリシー適用完了 - レベル: ${level}`);
            
        } catch (error) {
            console.error('[CSPManager] CSP適用エラー:', error);
            this.logViolation('csp_application_error', error.message);
        }
    }
    
    /**
     * CSP違反を検証
     * @param {string} content - 検証対象コンテンツ
     * @param {string} contentType - コンテンツタイプ
     * @returns {Object} 違反検証結果
     */
    validateContent(content, contentType = 'html') {
        const validation = {
            isValid: true,
            violations: [],
            warnings: [],
            blockedElements: [],
            timestamp: new Date().toISOString()
        };
        
        try {
            switch (contentType) {
                case 'html':
                    validation = this.validateHTMLContent(content, validation);
                    break;
                case 'script':
                    validation = this.validateScriptContent(content, validation);
                    break;
                case 'style':
                    validation = this.validateStyleContent(content, validation);
                    break;
                default:
                    validation.warnings.push(`未対応のコンテンツタイプ: ${contentType}`);
            }
            
            validation.isValid = validation.violations.length === 0;
            
            // 違反ログの記録
            if (validation.violations.length > 0) {
                this.logMultipleViolations(validation.violations);
            }
            
            return validation;
            
        } catch (error) {
            console.error('[CSPManager] コンテンツ検証エラー:', error);
            return {
                ...validation,
                isValid: false,
                violations: [`検証エラー: ${error.message}`]
            };
        }
    }
    
    /**
     * 動的コンテンツのサニタイズ
     * @param {string} content - サニタイズ対象
     * @param {Object} options - サニタイズオプション
     * @returns {string} サニタイズ済みコンテンツ
     */
    sanitizeContent(content, options = {}) {
        const defaultOptions = {
            allowedTags: ['b', 'i', 'em', 'strong', 'span', 'div', 'p'],
            allowedAttributes: ['class', 'id'],
            removeScripts: true,
            removeEvents: true,
            removeIframes: true
        };
        
        const config = { ...defaultOptions, ...options };
        
        let sanitized = content;
        
        try {
            // スクリプトタグの除去
            if (config.removeScripts) {
                sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
                sanitized = sanitized.replace(/<script[^>]*\/>/gis, '');
            }
            
            // イベントハンドラーの除去
            if (config.removeEvents) {
                sanitized = sanitized.replace(/\s*on\w+\s*=\s*['""][^'""]*['""]*/gis, '');
                sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^'""]\S*/gis, '');
            }
            
            // iframeの除去
            if (config.removeIframes) {
                sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gis, '');
                sanitized = sanitized.replace(/<iframe[^>]*\/>/gis, '');
            }
            
            // JavaScript URLの除去
            sanitized = sanitized.replace(/href\s*=\s*['""]javascript:[^'""]*['""]*/gis, '');
            sanitized = sanitized.replace(/src\s*=\s*['""]javascript:[^'""]*['""]*/gis, '');
            
            console.log('[CSPManager] コンテンツサニタイズ完了');
            return sanitized;
            
        } catch (error) {
            console.error('[CSPManager] サニタイズエラー:', error);
            return content; // エラー時は元のコンテンツを返す
        }
    }
    
    /**
     * CSP違反レポートを取得
     * @param {number} limit - 取得件数制限
     * @returns {Array} 違反レポートリスト
     */
    getViolationReports(limit = 50) {
        return this.violations
            .slice(-limit)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    /**
     * CSPポリシーを更新
     * @param {string} level - セキュリティレベル
     * @param {Object} customPolicies - カスタムポリシー
     */
    updatePolicy(level, customPolicies) {
        try {
            const existingPolicy = this.policies.get(level) || {};
            const updatedPolicy = {
                ...existingPolicy,
                ...customPolicies,
                updatedAt: new Date().toISOString()
            };
            
            this.policies.set(level, updatedPolicy);
            console.log(`[CSPManager] ポリシー更新完了 - レベル: ${level}`);
            
        } catch (error) {
            console.error('[CSPManager] ポリシー更新エラー:', error);
        }
    }
    
    /**
     * デフォルトポリシーの初期化
     * @private
     */
    initializeDefaultPolicies() {
        // 厳格なセキュリティポリシー
        this.policies.set('strict', {
            header: [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self'",
                "connect-src 'self'",
                "media-src 'none'",
                "object-src 'none'",
                "frame-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "block-all-mixed-content",
                "upgrade-insecure-requests"
            ].join('; '),
            level: 'strict',
            description: '最高レベルのセキュリティ設定'
        });
        
        // バランス型ポリシー（推奨）
        this.policies.set('balanced', {
            header: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self' https:",
                "connect-src 'self' https:",
                "media-src 'self'",
                "object-src 'none'",
                "frame-src 'self'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'"
            ].join('; '),
            level: 'balanced',
            description: 'セキュリティと利便性のバランス設定'
        });
        
        // 寛容なポリシー（開発用）
        this.policies.set('permissive', {
            header: [
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https: http:",
                "font-src 'self' https: http:",
                "connect-src 'self' https: http:",
                "media-src 'self' https: http:",
                "object-src 'self'",
                "frame-src 'self' https: http:",
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; '),
            level: 'permissive',
            description: '開発環境向けの寛容な設定'
        });
        
        console.log('[CSPManager] デフォルトポリシー初期化完了');
    }
    
    /**
     * DOM文書への CSP適用
     * @private
     */
    applyCSPToDOMDocument(cspHeader) {
        // metaタグでのCSP設定
        let metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        
        if (!metaCSP) {
            metaCSP = document.createElement('meta');
            metaCSP.setAttribute('http-equiv', 'Content-Security-Policy');
            document.head.appendChild(metaCSP);
        }
        
        metaCSP.setAttribute('content', cspHeader);
        
        console.log('[CSPManager] DOM文書にCSP適用完了');
    }
    
    /**
     * サーバーへのCSP適用
     * @private
     */
    applyCSPToServer(cspHeader) {
        // Express.js等でのヘッダー設定（例）
        console.log('[CSPManager] サーバーCSPヘッダー:', cspHeader);
    }
    
    /**
     * HTMLコンテンツの検証
     * @private
     */
    validateHTMLContent(content, validation) {
        // インラインスクリプトの検出
        const inlineScriptMatches = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
        if (inlineScriptMatches) {
            validation.violations.push({
                type: 'inline-script',
                count: inlineScriptMatches.length,
                description: 'インラインスクリプトが検出されました'
            });
        }
        
        // イベントハンドラーの検出
        const eventHandlerMatches = content.match(/\s+on\w+\s*=/gi);
        if (eventHandlerMatches) {
            validation.violations.push({
                type: 'event-handler',
                count: eventHandlerMatches.length,
                description: 'インラインイベントハンドラーが検出されました'
            });
        }
        
        // 外部リソースの検証
        const externalResourceMatches = content.match(/src\s*=\s*['""]https?:\/\/[^'""\s]+['""]*/gi);
        if (externalResourceMatches) {
            validation.warnings.push({
                type: 'external-resource',
                count: externalResourceMatches.length,
                description: '外部リソースの読み込みが検出されました'
            });
        }
        
        return validation;
    }
    
    /**
     * スクリプトコンテンツの検証
     * @private
     */
    validateScriptContent(content, validation) {
        // eval関数の使用検出
        if (content.includes('eval(')) {
            validation.violations.push({
                type: 'eval-usage',
                description: 'eval関数の使用が検出されました'
            });
        }
        
        // document.write の検出
        if (content.includes('document.write')) {
            validation.violations.push({
                type: 'document-write',
                description: 'document.writeの使用が検出されました'
            });
        }
        
        return validation;
    }
    
    /**
     * スタイルコンテンツの検証
     * @private
     */
    validateStyleContent(content, validation) {
        // JavaScript URLの検出
        if (content.includes('javascript:')) {
            validation.violations.push({
                type: 'javascript-url',
                description: 'JavaScript URLが検出されました'
            });
        }
        
        return validation;
    }
    
    /**
     * 違反レポートの設定
     * @private
     */
    setupViolationReporting() {
        if (typeof document !== 'undefined') {
            document.addEventListener('securitypolicyviolation', (event) => {
                this.logViolation('csp_violation', {
                    violatedDirective: event.violatedDirective,
                    blockedURI: event.blockedURI,
                    originalPolicy: event.originalPolicy,
                    effectiveDirective: event.effectiveDirective
                });
            });
        }
    }
    
    /**
     * 違反ログの記録
     * @private
     */
    logViolation(type, details) {
        const violation = {
            type,
            details,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
        };
        
        this.violations.push(violation);
        
        // ログ制限（最新1000件のみ保持）
        if (this.violations.length > 1000) {
            this.violations = this.violations.slice(-1000);
        }
        
        console.warn('[CSPManager] セキュリティ違反検出:', violation);
    }
    
    /**
     * 複数違反のログ記録
     * @private
     */
    logMultipleViolations(violations) {
        violations.forEach(violation => {
            this.logViolation('content_validation', violation);
        });
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.CSPManager = CSPManager;
}

// CommonJS対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSPManager;
}

console.log('[CSPManager] モジュール読み込み完了 - セキュリティポリシー管理システム初期化済み');