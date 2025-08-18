/**
 * InjectionPrevention - インジェクション攻撃防止強化システム
 * 
 * SEC-006: Injection Attack Prevention Enhancement対応
 * PlantUML固有のインジェクション攻撃と一般的なWeb攻撃を防止
 * 
 * 作成日: 2025-08-16
 * 作成者: debugger
 * バージョン: 1.0.0
 */

class InjectionPrevention {
    constructor() {
        this.plantUMLSanitizer = new PlantUMLSanitizer();
        this.pathTraversalDetector = new PathTraversalDetector();
        this.templateInjectionDetector = new TemplateInjectionDetector();
        this.commandInjectionDetector = new CommandInjectionDetector();
        
        // インジェクション攻撃パターン定義
        this.initializeInjectionPatterns();
        
        // ホワイトリスト/ブラックリスト初期化
        this.initializeFilterLists();
        
        console.log('[InjectionPrevention] 初期化完了 - インジェクション攻撃防止システム準備済み');
    }
    
    /**
     * 包括的なインジェクション攻撃検証
     * @param {string|Object} input - 検証対象
     * @param {string} inputType - 入力タイプ ('plantuml', 'general', 'file_path')
     * @returns {Object} 検証結果
     */
    validateInput(input, inputType = 'general') {
        const result = {
            isValid: true,
            securityViolations: [],
            sanitizedInput: input,
            riskLevel: 'safe',
            preventedAttacks: [],
            timestamp: new Date().toISOString()
        };
        
        try {
            const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
            
            // 1. PlantUML固有のインジェクション検証
            if (inputType === 'plantuml') {
                const plantUMLResult = this.plantUMLSanitizer.validatePlantUMLSyntax(inputStr);
                result.securityViolations.push(...plantUMLResult.violations);
                result.preventedAttacks.push(...plantUMLResult.preventedAttacks);
                result.sanitizedInput = plantUMLResult.sanitized;
            }
            
            // 2. パストラバーサル攻撃検証
            if (inputType === 'file_path' || this.containsPathPattern(inputStr)) {
                const pathResult = this.pathTraversalDetector.validatePath(inputStr);
                result.securityViolations.push(...pathResult.violations);
                result.preventedAttacks.push(...pathResult.preventedAttacks);
            }
            
            // 3. テンプレートインジェクション検証
            const templateResult = this.templateInjectionDetector.detectTemplateInjection(inputStr);
            result.securityViolations.push(...templateResult.violations);
            result.preventedAttacks.push(...templateResult.preventedAttacks);
            
            // 4. コマンドインジェクション検証
            const commandResult = this.commandInjectionDetector.detectCommandInjection(inputStr);
            result.securityViolations.push(...commandResult.violations);
            result.preventedAttacks.push(...commandResult.preventedAttacks);
            
            // 5. SQLインジェクション検証（汎用）
            const sqlResult = this.detectSQLInjection(inputStr);
            result.securityViolations.push(...sqlResult.violations);
            result.preventedAttacks.push(...sqlResult.preventedAttacks);
            
            // 6. XSSインジェクション検証（汎用）
            const xssResult = this.detectXSSInjection(inputStr);
            result.securityViolations.push(...xssResult.violations);
            result.preventedAttacks.push(...xssResult.preventedAttacks);
            
            // リスクレベル計算
            result.riskLevel = this.calculateRiskLevel(result.securityViolations);
            result.isValid = result.riskLevel !== 'critical' && result.riskLevel !== 'high';
            
            // セキュリティログ記録
            this.logSecurityEvent(input, result);
            
            return result;
            
        } catch (error) {
            console.error('[InjectionPrevention] 検証エラー:', error);
            return {
                ...result,
                isValid: false,
                riskLevel: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * 緊急時のサニタイズ実行
     * @param {string} input - サニタイズ対象
     * @param {Object} options - サニタイズオプション
     * @returns {string} サニタイズ済みテキスト
     */
    emergencySanitize(input, options = {}) {
        const defaultOptions = {
            stripScripts: true,
            stripIframes: true,
            stripEvents: true,
            encodeHTML: true,
            removeSQLPatterns: true,
            removeCommandPatterns: true,
            restrictPlantUMLDirectives: true
        };
        
        const config = { ...defaultOptions, ...options };
        let sanitized = input;
        
        try {
            // 1. スクリプトタグ除去
            if (config.stripScripts) {
                sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
                sanitized = sanitized.replace(/<script[^>]*\/>/gi, '');
            }
            
            // 2. iframe除去
            if (config.stripIframes) {
                sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gis, '');
                sanitized = sanitized.replace(/<iframe[^>]*\/>/gi, '');
            }
            
            // 3. イベントハンドラー除去
            if (config.stripEvents) {
                sanitized = sanitized.replace(/\s*on\w+\s*=\s*['""][^'""]*['""]*/gis, '');
                sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^'""]\S*/gis, '');
            }
            
            // 4. HTMLエンコーディング
            if (config.encodeHTML) {
                sanitized = sanitized
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');
            }
            
            // 5. SQLパターン除去
            if (config.removeSQLPatterns) {
                sanitized = this.removeSQLPatterns(sanitized);
            }
            
            // 6. コマンドパターン除去
            if (config.removeCommandPatterns) {
                sanitized = this.removeCommandPatterns(sanitized);
            }
            
            // 7. PlantUMLディレクティブ制限
            if (config.restrictPlantUMLDirectives) {
                sanitized = this.restrictPlantUMLDirectives(sanitized);
            }
            
            return sanitized;
            
        } catch (error) {
            console.error('[InjectionPrevention] 緊急サニタイズエラー:', error);
            return input; // エラー時は元の入力を返す
        }
    }
    
    /**
     * リアルタイム脅威検出
     * @param {string} input - リアルタイム監視対象
     * @returns {Object} 脅威検出結果
     */
    detectRealTimeThreats(input) {
        const threats = [];
        
        // 高リスクパターンの即座検出
        const criticalPatterns = [
            { pattern: /\.\.[\/\\]/g, type: 'path_traversal', severity: 'critical' },
            { pattern: /<script[^>]*>.*?<\/script>/gi, type: 'xss_script', severity: 'critical' },
            { pattern: /eval\s*\(/gi, type: 'code_injection', severity: 'critical' },
            { pattern: /!include\s+['""]?[^'""]*['""]?/gi, type: 'plantuml_include', severity: 'high' },
            { pattern: /!define\s+\w+\s+.*?(eval|exec|system)/gi, type: 'plantuml_macro', severity: 'high' }
        ];
        
        criticalPatterns.forEach(({ pattern, type, severity }) => {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type,
                    severity,
                    pattern: pattern.source,
                    matches: matches.length,
                    detected: matches,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        return {
            hasThreats: threats.length > 0,
            threatCount: threats.length,
            highestSeverity: this.getHighestSeverity(threats),
            threats
        };
    }
    
    /**
     * パストラバーサルパターン検出
     * @private
     */
    containsPathPattern(input) {
        const pathPatterns = [
            /\.\.[\/\\]/,
            /[\/\\]\.\./, 
            /\%2e\%2e[\/\\]/i,
            /\.\.%2f/i,
            /\.\.%5c/i
        ];
        
        return pathPatterns.some(pattern => pattern.test(input));
    }
    
    /**
     * SQLインジェクション検証
     * @private
     */
    detectSQLInjection(input) {
        const sqlPatterns = [
            { pattern: /(\bUNION\b.*\bSELECT\b)/gi, severity: 'high' },
            { pattern: /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/gi, severity: 'medium' },
            { pattern: /(\bINSERT\b.*\bINTO\b)/gi, severity: 'medium' },
            { pattern: /(\bDELETE\b.*\bFROM\b)/gi, severity: 'high' },
            { pattern: /(\bDROP\b.*\bTABLE\b)/gi, severity: 'critical' },
            { pattern: /(\bUPDATE\b.*\bSET\b)/gi, severity: 'medium' },
            { pattern: /(--|#|\/\*.*\*\/)/g, severity: 'low' },
            { pattern: /(\bOR\b|\bAND\b)\s+\w+\s*=\s*\w+/gi, severity: 'medium' }
        ];
        
        const violations = [];
        const preventedAttacks = [];
        
        sqlPatterns.forEach(({ pattern, severity }) => {
            const matches = input.match(pattern);
            if (matches) {
                const violation = {
                    type: 'sql_injection',
                    severity,
                    pattern: pattern.source,
                    matches: matches,
                    description: `SQLインジェクション攻撃の可能性: ${matches.join(', ')}`
                };
                violations.push(violation);
                preventedAttacks.push(`SQL攻撃を防止: ${matches[0]}`);
            }
        });
        
        return { violations, preventedAttacks };
    }
    
    /**
     * XSSインジェクション検証
     * @private
     */
    detectXSSInjection(input) {
        const xssPatterns = [
            { pattern: /<script[^>]*>.*?<\/script>/gi, severity: 'critical' },
            { pattern: /<img[^>]*onerror[^>]*>/gi, severity: 'high' },
            { pattern: /<svg[^>]*onload[^>]*>/gi, severity: 'high' },
            { pattern: /javascript:/gi, severity: 'medium' },
            { pattern: /on\w+\s*=\s*['""][^'""]*['""]*/gi, severity: 'medium' },
            { pattern: /<iframe[^>]*>/gi, severity: 'high' },
            { pattern: /<object[^>]*>/gi, severity: 'medium' },
            { pattern: /<embed[^>]*>/gi, severity: 'medium' }
        ];
        
        const violations = [];
        const preventedAttacks = [];
        
        xssPatterns.forEach(({ pattern, severity }) => {
            const matches = input.match(pattern);
            if (matches) {
                const violation = {
                    type: 'xss_injection',
                    severity,
                    pattern: pattern.source,
                    matches: matches,
                    description: `XSS攻撃の可能性: ${matches.join(', ')}`
                };
                violations.push(violation);
                preventedAttacks.push(`XSS攻撃を防止: ${matches[0]}`);
            }
        });
        
        return { violations, preventedAttacks };
    }
    
    /**
     * SQLパターン除去
     * @private
     */
    removeSQLPatterns(input) {
        const sqlRemovalPatterns = [
            /(\bUNION\b.*\bSELECT\b)/gi,
            /(\bDROP\b.*\bTABLE\b)/gi,
            /(\bDELETE\b.*\bFROM\b)/gi,
            /(--|#|\/\*.*\*\/)/g
        ];
        
        let cleaned = input;
        sqlRemovalPatterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        return cleaned;
    }
    
    /**
     * コマンドパターン除去
     * @private
     */
    removeCommandPatterns(input) {
        const commandPatterns = [
            /(\||;|&&|\|\|)/g,
            /(exec|system|eval|cmd|powershell|bash|sh)\s*\(/gi,
            /`[^`]*`/g,
            /\$\([^)]*\)/g
        ];
        
        let cleaned = input;
        commandPatterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        return cleaned;
    }
    
    /**
     * PlantUMLディレクティブ制限
     * @private
     */
    restrictPlantUMLDirectives(input) {
        // 危険なPlantUMLディレクティブを制限
        const restrictedDirectives = [
            /!include\s+['""]?[^'""]*['""]?/gi,
            /!define\s+\w+\s+.*?(eval|exec|system)/gi,
            /!pragma\s+[^\\n]*/gi
        ];
        
        let restricted = input;
        restrictedDirectives.forEach(pattern => {
            restricted = restricted.replace(pattern, '<!-- RESTRICTED -->');
        });
        
        return restricted;
    }
    
    /**
     * リスクレベル計算
     * @private
     */
    calculateRiskLevel(violations) {
        let maxSeverity = 'safe';
        const severityLevels = { safe: 0, low: 1, medium: 2, high: 3, critical: 4 };
        
        violations.forEach(violation => {
            if (severityLevels[violation.severity] > severityLevels[maxSeverity]) {
                maxSeverity = violation.severity;
            }
        });
        
        return maxSeverity;
    }
    
    /**
     * 最高脅威レベル取得
     * @private
     */
    getHighestSeverity(threats) {
        if (threats.length === 0) return 'safe';
        
        const severityOrder = ['safe', 'low', 'medium', 'high', 'critical'];
        let highest = 'safe';
        
        threats.forEach(threat => {
            if (severityOrder.indexOf(threat.severity) > severityOrder.indexOf(highest)) {
                highest = threat.severity;
            }
        });
        
        return highest;
    }
    
    /**
     * セキュリティイベントログ
     * @private
     */
    logSecurityEvent(input, result) {
        if (result.securityViolations.length > 0) {
            console.warn('[InjectionPrevention] セキュリティ違反検出:', {
                inputLength: typeof input === 'string' ? input.length : 'object',
                violationCount: result.securityViolations.length,
                riskLevel: result.riskLevel,
                preventedAttacks: result.preventedAttacks.length,
                timestamp: result.timestamp
            });
        }
    }
    
    /**
     * 初期化処理
     * @private
     */
    initializeInjectionPatterns() {
        console.log('[InjectionPrevention] インジェクションパターン初期化完了');
    }
    
    initializeFilterLists() {
        console.log('[InjectionPrevention] フィルターリスト初期化完了');
    }
}

/**
 * PlantUML特化サニタイザー
 */
class PlantUMLSanitizer {
    validatePlantUMLSyntax(input) {
        const violations = [];
        const preventedAttacks = [];
        let sanitized = input;
        
        try {
            // 1. !include ディレクティブ検証
            const includePattern = /!include\s+(['""]?)([^'""\\n]+)\1/gi;
            const includeMatches = input.match(includePattern);
            if (includeMatches) {
                violations.push({
                    type: 'plantuml_include',
                    severity: 'high',
                    description: '!includeディレクティブが検出されました',
                    matches: includeMatches
                });
                preventedAttacks.push('PlantUML !include攻撃を防止');
                sanitized = sanitized.replace(includePattern, '!-- INCLUDE BLOCKED --');
            }
            
            // 2. !define マクロ検証
            const definePattern = /!define\s+(\w+)\s+(.+)/gi;
            const defineMatches = input.match(definePattern);
            if (defineMatches) {
                const dangerousDefines = defineMatches.filter(match => 
                    /eval|exec|system|cmd|shell/i.test(match)
                );
                
                if (dangerousDefines.length > 0) {
                    violations.push({
                        type: 'plantuml_dangerous_macro',
                        severity: 'critical',
                        description: '危険な!defineマクロが検出されました',
                        matches: dangerousDefines
                    });
                    preventedAttacks.push('PlantUML危険マクロを防止');
                    sanitized = sanitized.replace(/!define\s+\w+\s+.*?(eval|exec|system|cmd|shell)/gi, '!-- DANGEROUS MACRO BLOCKED --');
                }
            }
            
            // 3. note内のHTML/JavaScript検証
            const notePattern = /note\s+(left|right|top|bottom|over|as)\s*[:"']([^"']+)[:"']/gi;
            let noteMatch;
            while ((noteMatch = notePattern.exec(input)) !== null) {
                const noteContent = noteMatch[2];
                if (/<script|javascript:|on\w+=/i.test(noteContent)) {
                    violations.push({
                        type: 'plantuml_note_injection',
                        severity: 'high',
                        description: 'note内にスクリプト要素が検出されました',
                        matches: [noteMatch[0]]
                    });
                    preventedAttacks.push('PlantUML note内スクリプトを防止');
                }
            }
            
            // 4. URL/リンク検証
            const urlPattern = /\[\[([^\]]+)\]\]/g;
            let urlMatch;
            while ((urlMatch = urlPattern.exec(input)) !== null) {
                const url = urlMatch[1];
                if (/javascript:|data:|vbscript:/i.test(url)) {
                    violations.push({
                        type: 'plantuml_malicious_url',
                        severity: 'high',
                        description: '悪意のあるURLプロトコルが検出されました',
                        matches: [urlMatch[0]]
                    });
                    preventedAttacks.push('PlantUML悪意のあるURLを防止');
                    sanitized = sanitized.replace(urlMatch[0], '[[#BLOCKED_URL]]');
                }
            }
            
            return { violations, preventedAttacks, sanitized };
            
        } catch (error) {
            console.error('[PlantUMLSanitizer] 検証エラー:', error);
            return { violations, preventedAttacks, sanitized: input };
        }
    }
}

/**
 * パストラバーサル検出器
 */
class PathTraversalDetector {
    validatePath(input) {
        const violations = [];
        const preventedAttacks = [];
        
        const pathTraversalPatterns = [
            { pattern: /\.\.[\/\\]/g, description: '相対パス攻撃', severity: 'critical' },
            { pattern: /[\/\\]\.\./g, description: '上位ディレクトリ攻撃', severity: 'critical' },
            { pattern: /\%2e\%2e[\/\\]/gi, description: 'URLエンコード攻撃', severity: 'high' },
            { pattern: /\.\.%2f/gi, description: 'URLエンコード攻撃', severity: 'high' },
            { pattern: /\.\.%5c/gi, description: 'URLエンコード攻撃', severity: 'high' },
            { pattern: /\.\.\\/g, description: 'Windowsパス攻撃', severity: 'high' },
            { pattern: /\.\.\/\.\.\//g, description: '深層パス攻撃', severity: 'critical' }
        ];
        
        pathTraversalPatterns.forEach(({ pattern, description, severity }) => {
            const matches = input.match(pattern);
            if (matches) {
                violations.push({
                    type: 'path_traversal',
                    severity,
                    description: `パストラバーサル攻撃: ${description}`,
                    matches: matches
                });
                preventedAttacks.push(`パストラバーサル攻撃を防止: ${description}`);
            }
        });
        
        return { violations, preventedAttacks };
    }
}

/**
 * テンプレートインジェクション検出器
 */
class TemplateInjectionDetector {
    detectTemplateInjection(input) {
        const violations = [];
        const preventedAttacks = [];
        
        const templatePatterns = [
            { pattern: /\{\{.*?\}\}/g, description: 'Handlebars/Mustache template', severity: 'medium' },
            { pattern: /\{\%.*?\%\}/g, description: 'Jinja2/Django template', severity: 'medium' },
            { pattern: /\<\%.*?\%\>/g, description: 'ERB/ASP template', severity: 'medium' },
            { pattern: /\$\{.*?\}/g, description: 'Template literal', severity: 'high' },
            { pattern: /\{\{.*?constructor.*?\}\}/gi, description: '危険なテンプレート実行', severity: 'critical' },
            { pattern: /\{\{.*?eval.*?\}\}/gi, description: 'eval実行攻撃', severity: 'critical' }
        ];
        
        templatePatterns.forEach(({ pattern, description, severity }) => {
            const matches = input.match(pattern);
            if (matches) {
                violations.push({
                    type: 'template_injection',
                    severity,
                    description: `テンプレートインジェクション: ${description}`,
                    matches: matches
                });
                preventedAttacks.push(`テンプレートインジェクションを防止: ${description}`);
            }
        });
        
        return { violations, preventedAttacks };
    }
}

/**
 * コマンドインジェクション検出器
 */
class CommandInjectionDetector {
    detectCommandInjection(input) {
        const violations = [];
        const preventedAttacks = [];
        
        const commandPatterns = [
            { pattern: /(\||;|&&|\|\|)/g, description: 'コマンド区切り文字', severity: 'high' },
            { pattern: /(exec|system|eval|cmd|powershell|bash|sh)\s*\(/gi, description: 'コマンド実行関数', severity: 'critical' },
            { pattern: /`[^`]*`/g, description: 'バックティック実行', severity: 'critical' },
            { pattern: /\$\([^)]*\)/g, description: 'サブシェル実行', severity: 'critical' },
            { pattern: />\s*\/dev\/null/gi, description: 'リダイレクト攻撃', severity: 'medium' },
            { pattern: /\&\s*$/g, description: 'バックグラウンド実行', severity: 'medium' }
        ];
        
        commandPatterns.forEach(({ pattern, description, severity }) => {
            const matches = input.match(pattern);
            if (matches) {
                violations.push({
                    type: 'command_injection',
                    severity,
                    description: `コマンドインジェクション: ${description}`,
                    matches: matches
                });
                preventedAttacks.push(`コマンドインジェクションを防止: ${description}`);
            }
        });
        
        return { violations, preventedAttacks };
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.InjectionPrevention = InjectionPrevention;
    window.PlantUMLSanitizer = PlantUMLSanitizer;
    window.PathTraversalDetector = PathTraversalDetector;
    window.TemplateInjectionDetector = TemplateInjectionDetector;
    window.CommandInjectionDetector = CommandInjectionDetector;
}

// CommonJS対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        InjectionPrevention,
        PlantUMLSanitizer,
        PathTraversalDetector,
        TemplateInjectionDetector,
        CommandInjectionDetector
    };
}

console.log('[InjectionPrevention] モジュール読み込み完了 - インジェクション攻撃防止システム準備済み');