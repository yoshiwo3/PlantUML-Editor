/**
 * ValidationEngine.js - 入力検証エンジン
 * プロダクションレベルの入力検証とサニタイゼーション機能を提供
 */

// 検証ルールの定義
window.VALIDATION_RULES = {
    PLANTUML: {
        maxLength: 50000,           // 50KB
        maxLines: 1000,             // 1000行
        requiredDirectives: ['@startuml', '@enduml'],
        forbiddenPatterns: [
            /<script[^>]*>/i,       // XSS対策
            /javascript:/i,          // XSS対策
            /on\w+\s*=/i,           // イベントハンドラー
            /eval\s*\(/i,           // eval関数
            /document\.write/i       // document.write
        ]
    },
    JAPANESE: {
        maxLength: 10000,           // 10KB
        maxLines: 500,              // 500行
        encoding: 'UTF-8'
    }
};

window.VALIDATION_LEVELS = {
    STRICT: 'strict',
    MODERATE: 'moderate',
    LENIENT: 'lenient'
};

window.SYNTAX_PATTERNS = {
    // PlantUML基本構文
    startDirective: /@start(uml|salt|dot|gantt|mindmap|wbs|json|yaml|etc)/,
    endDirective: /@end(uml|salt|dot|gantt|mindmap|wbs|json|yaml|etc)/,
    
    // シーケンス図
    sequence: {
        actor: /^(participant|actor|boundary|control|entity|database|collections)\s+\w+/,
        message: /^\s*\w+\s*(-?>|<-?-|->?)\s*\w+\s*:\s*.+$/,
        note: /^note\s+(left|right|over)\s*(\w+)?\s*:\s*.+$/,
        activation: /^(activate|deactivate)\s+\w+$/
    },
    
    // クラス図
    class: {
        definition: /^class\s+\w+(\s*\{[\s\S]*?\})?$/,
        relationship: /^\w+\s*(->|<\-\-|\.\.>|<\.\.|<\|--|-->\|)\s*\w+(\s*:\s*.+)?$/,
        member: /^[\+\-\#~]?\w+(\([^)]*\))?\s*:\s*\w+$/
    },
    
    // フローチャート
    flowchart: {
        start: /^start$/i,
        end: /^(end|stop)$/i,
        process: /^\w+\s*:\s*.+$/,
        decision: /^if\s*\(.+\)\s*then\s*\(.+\)$/i,
        connector: /^\w+\s*->\s*\w+$/
    },
    
    // 日本語パターン
    japanese: {
        particlePattern: /[はがをにでとへのからまでより]/,
        actionPattern: /[するされるできるなるいく来る行く]/,
        relationPattern: /(が|は|を|に|で|と|へ|の|から|まで|より)/
    }
};

window.ValidationEngine = class ValidationEngine {
    constructor(options = {}) {
        this.options = {
            level: options.level || window.VALIDATION_LEVELS.MODERATE,
            realTime: options.realTime !== false,
            autoCorrect: options.autoCorrect !== false,
            cacheResults: options.cacheResults !== false
        };
        
        this.validationCache = new Map();
        this.rules = new Map();
        this.suggestions = new Map();
        this.metrics = {
            totalValidations: 0,
            passedValidations: 0,
            failedValidations: 0,
            autoCorrections: 0,
            averageValidationTime: 0
        };
        
        this.initializeRules();
        this.setupRealTimeValidation();
    }

    /**
     * バリデーションルールの初期化
     */
    initializeRules() {
        // PlantUMLバリデーションルール
        this.rules.set('plantuml-structure', {
            validate: this.validatePlantUMLStructure.bind(this),
            severity: 'error',
            autoFix: this.fixPlantUMLStructure.bind(this)
        });
        
        this.rules.set('plantuml-syntax', {
            validate: this.validatePlantUMLSyntax.bind(this),
            severity: 'warning',
            autoFix: this.fixPlantUMLSyntax.bind(this)
        });
        
        this.rules.set('security', {
            validate: this.validateSecurity.bind(this),
            severity: 'error',
            autoFix: this.fixSecurityIssues.bind(this)
        });
        
        this.rules.set('length-limits', {
            validate: this.validateLengthLimits.bind(this),
            severity: 'warning',
            autoFix: this.fixLengthLimits.bind(this)
        });
        
        // 日本語バリデーションルール
        this.rules.set('japanese-grammar', {
            validate: this.validateJapaneseGrammar.bind(this),
            severity: 'info',
            autoFix: this.fixJapaneseGrammar.bind(this)
        });
        
        this.rules.set('encoding', {
            validate: this.validateEncoding.bind(this),
            severity: 'error',
            autoFix: this.fixEncoding.bind(this)
        });
    }

    /**
     * リアルタイムバリデーションの設定
     */
    setupRealTimeValidation() {
        if (!this.options.realTime) return;
        
        this.realTimeDebounceTimer = null;
        this.realTimeDelay = 300; // ms
    }

    /**
     * メイン検証メソッド
     */
    async validate(input, type = 'auto', options = {}) {
        const startTime = performance.now();
        
        try {
            // 入力タイプの自動検出
            const inputType = type === 'auto' ? this.detectInputType(input) : type;
            
            // キャッシュチェック
            const cacheKey = this.generateCacheKey(input, inputType, options);
            if (this.options.cacheResults) {
                const cached = this.validationCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < 60000) { // 1分間有効
                    return cached.result;
                }
            }
            
            // 基本検証
            const basicResult = await this.performBasicValidation(input);
            if (!basicResult.isValid && basicResult.severity === 'error') {
                return this.createValidationResult(false, [basicResult], [], startTime);
            }
            
            // 詳細検証
            const detailedResults = await this.performDetailedValidation(input, inputType);
            
            // 結果の統合
            const allResults = [basicResult, ...detailedResults];
            const errors = allResults.filter(r => r.severity === 'error');
            const warnings = allResults.filter(r => r.severity === 'warning');
            const infos = allResults.filter(r => r.severity === 'info');
            
            const isValid = errors.length === 0;
            
            // 自動修正の適用
            let correctedInput = input;
            if (this.options.autoCorrect && !isValid) {
                const correctionResult = await this.applyAutoCorrections(input, allResults);
                correctedInput = correctionResult.correctedInput;
                
                if (correctionResult.corrections.length > 0) {
                    this.metrics.autoCorrections += correctionResult.corrections.length;
                }
            }
            
            // 提案の生成
            const suggestions = await this.generateSuggestions(input, allResults);
            
            const result = {
                isValid,
                score: this.calculateValidationScore(allResults),
                errors: errors.map(this.formatValidationMessage),
                warnings: warnings.map(this.formatValidationMessage),
                infos: infos.map(this.formatValidationMessage),
                suggestions,
                correctedInput: correctedInput !== input ? correctedInput : null,
                metadata: {
                    inputType,
                    inputLength: input.length,
                    lineCount: input.split('\n').length,
                    validationTime: performance.now() - startTime
                }
            };
            
            // キャッシュに保存
            if (this.options.cacheResults) {
                this.validationCache.set(cacheKey, {
                    result,
                    timestamp: Date.now()
                });
            }
            
            // メトリクス更新
            this.updateMetrics(result);
            
            return result;
        } catch (error) {
            console.error('Validation failed:', error);
            
            // エラーハンドリング
            if (window.globalErrorHandler) {
                window.globalErrorHandler.handleError({
                    message: `Validation engine error: ${error.message}`,
                    type: 'validation',
                    severity: 'high',
                    source: 'ValidationEngine'
                });
            }
            
            return this.createValidationResult(false, [{
                severity: 'error',
                message: 'バリデーションエンジンでエラーが発生しました',
                code: 'VALIDATION_ENGINE_ERROR',
                line: 0
            }], [], startTime);
        }
    }

    /**
     * 入力タイプの自動検出
     */
    detectInputType(input) {
        // PlantUML形式の検出
        if (window.SYNTAX_PATTERNS.startDirective.test(input) || 
            input.includes('@startuml') || 
            input.includes('@enduml')) {
            return 'plantuml';
        }
        
        // 日本語形式の検出
        if (window.SYNTAX_PATTERNS.japanese.particlePattern.test(input)) {
            return 'japanese';
        }
        
        // 英語形式の検出
        if (/^[a-zA-Z\s\->.,:()]+$/.test(input.trim())) {
            return 'english';
        }
        
        return 'unknown';
    }

    /**
     * 基本検証の実行
     */
    async performBasicValidation(input) {
        const issues = [];
        
        // null/undefined チェック
        if (input == null) {
            return {
                severity: 'error',
                message: '入力が空です',
                code: 'NULL_INPUT',
                line: 0
            };
        }
        
        // 型チェック
        if (typeof input !== 'string') {
            return {
                severity: 'error',
                message: '入力は文字列である必要があります',
                code: 'INVALID_TYPE',
                line: 0
            };
        }
        
        // 長さチェック
        if (input.length === 0) {
            return {
                severity: 'warning',
                message: '入力が空文字列です',
                code: 'EMPTY_INPUT',
                line: 0
            };
        }
        
        // エンコーディングチェック
        if (!this.isValidUTF8(input)) {
            return {
                severity: 'error',
                message: '不正な文字エンコーディングが検出されました',
                code: 'INVALID_ENCODING',
                line: 0
            };
        }
        
        return {
            severity: 'info',
            message: '基本検証に合格しました',
            code: 'BASIC_VALIDATION_PASSED',
            line: 0
        };
    }

    /**
     * 詳細検証の実行
     */
    async performDetailedValidation(input, inputType) {
        const results = [];
        
        // 適用するルールの選択
        const applicableRules = this.selectApplicableRules(inputType);
        
        // 各ルールの実行
        for (const [ruleName, rule] of applicableRules) {
            try {
                const result = await rule.validate(input, inputType);
                if (result) {
                    if (Array.isArray(result)) {
                        results.push(...result);
                    } else {
                        results.push(result);
                    }
                }
            } catch (error) {
                console.error(`Rule ${ruleName} failed:`, error);
                results.push({
                    severity: 'warning',
                    message: `ルール ${ruleName} の実行中にエラーが発生しました`,
                    code: 'RULE_EXECUTION_ERROR',
                    line: 0
                });
            }
        }
        
        return results;
    }

    /**
     * 適用ルールの選択
     */
    selectApplicableRules(inputType) {
        const rules = new Map();
        
        // セキュリティルールは常に適用
        rules.set('security', this.rules.get('security'));
        rules.set('length-limits', this.rules.get('length-limits'));
        
        // 入力タイプ別のルール
        switch (inputType) {
            case 'plantuml':
                rules.set('plantuml-structure', this.rules.get('plantuml-structure'));
                rules.set('plantuml-syntax', this.rules.get('plantuml-syntax'));
                break;
                
            case 'japanese':
                rules.set('japanese-grammar', this.rules.get('japanese-grammar'));
                rules.set('encoding', this.rules.get('encoding'));
                break;
        }
        
        return rules;
    }

    /**
     * PlantUML構造の検証
     */
    async validatePlantUMLStructure(input) {
        const issues = [];
        const lines = input.split('\n');
        
        // 開始ディレクティブのチェック
        const hasStart = window.SYNTAX_PATTERNS.startDirective.test(input);
        if (!hasStart) {
            issues.push({
                severity: 'error',
                message: '@startuml または対応する開始ディレクティブが見つかりません',
                code: 'MISSING_START_DIRECTIVE',
                line: 1
            });
        }
        
        // 終了ディレクティブのチェック
        const hasEnd = window.SYNTAX_PATTERNS.endDirective.test(input);
        if (!hasEnd) {
            issues.push({
                severity: 'error',
                message: '@enduml または対応する終了ディレクティブが見つかりません',
                code: 'MISSING_END_DIRECTIVE',
                line: lines.length
            });
        }
        
        // ディレクティブの対応チェック
        if (hasStart && hasEnd) {
            const startMatches = input.match(/@start(\w+)/g) || [];
            const endMatches = input.match(/@end(\w+)/g) || [];
            
            if (startMatches.length !== endMatches.length) {
                issues.push({
                    severity: 'error',
                    message: '開始ディレクティブと終了ディレクティブの数が一致しません',
                    code: 'MISMATCHED_DIRECTIVES',
                    line: 0
                });
            }
        }
        
        // 空コンテンツのチェック
        const contentLines = lines.filter(line => 
            !line.trim().startsWith('@') && 
            line.trim().length > 0
        );
        
        if (contentLines.length === 0) {
            issues.push({
                severity: 'warning',
                message: 'PlantUMLコンテンツが空です',
                code: 'EMPTY_CONTENT',
                line: 0
            });
        }
        
        return issues;
    }

    /**
     * PlantUML構文の検証
     */
    async validatePlantUMLSyntax(input) {
        const issues = [];
        const lines = input.split('\n');
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            const lineNumber = index + 1;
            
            // 空行やコメント行はスキップ
            if (!trimmedLine || trimmedLine.startsWith('\'') || trimmedLine.startsWith('@')) {
                return;
            }
            
            // 基本的な構文パターンチェック
            const isValidSyntax = this.checkPlantUMLLineSyntax(trimmedLine);
            if (!isValidSyntax) {
                issues.push({
                    severity: 'warning',
                    message: `疑わしい構文が検出されました: "${trimmedLine}"`,
                    code: 'SUSPICIOUS_SYNTAX',
                    line: lineNumber
                });
            }
            
            // 特殊文字のチェック
            if (this.hasProblematicCharacters(trimmedLine)) {
                issues.push({
                    severity: 'info',
                    message: '問題を引き起こす可能性のある文字が含まれています',
                    code: 'PROBLEMATIC_CHARACTERS',
                    line: lineNumber
                });
            }
        });
        
        return issues;
    }

    /**
     * セキュリティ検証
     */
    async validateSecurity(input) {
        const issues = [];
        
        window.VALIDATION_RULES.PLANTUML.forbiddenPatterns.forEach(pattern => {
            if (pattern.test(input)) {
                issues.push({
                    severity: 'error',
                    message: 'セキュリティ上危険なパターンが検出されました',
                    code: 'SECURITY_VIOLATION',
                    line: this.findPatternLine(input, pattern)
                });
            }
        });
        
        return issues;
    }

    /**
     * 長さ制限の検証
     */
    async validateLengthLimits(input, inputType) {
        const issues = [];
        const limits = inputType === 'japanese' ? 
            window.VALIDATION_RULES.JAPANESE : window.VALIDATION_RULES.PLANTUML;
        
        if (input.length > limits.maxLength) {
            issues.push({
                severity: 'warning',
                message: `入力が長すぎます (${input.length}/${limits.maxLength} 文字)`,
                code: 'INPUT_TOO_LONG',
                line: 0
            });
        }
        
        const lineCount = input.split('\n').length;
        if (lineCount > limits.maxLines) {
            issues.push({
                severity: 'warning',
                message: `行数が多すぎます (${lineCount}/${limits.maxLines} 行)`,
                code: 'TOO_MANY_LINES',
                line: lineCount
            });
        }
        
        return issues;
    }

    /**
     * 日本語文法の検証
     */
    async validateJapaneseGrammar(input) {
        const issues = [];
        const lines = input.split('\n');
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            const lineNumber = index + 1;
            
            if (!trimmedLine) return;
            
            // 基本的な日本語パターンチェック
            if (this.containsJapanese(trimmedLine)) {
                // 助詞の連続チェック
                if (/[はがをにでとへのからまでより]{2,}/.test(trimmedLine)) {
                    issues.push({
                        severity: 'info',
                        message: '助詞が連続している可能性があります',
                        code: 'CONSECUTIVE_PARTICLES',
                        line: lineNumber
                    });
                }
                
                // 動詞の活用チェック（簡単な例）
                if (/[するされるできるなるいく来る行く]$/.test(trimmedLine.replace(/[。、！？]$/, ''))) {
                    // 正常な動詞の終わり
                } else if (this.containsJapanese(trimmedLine) && !this.endsWithPunctuation(trimmedLine)) {
                    issues.push({
                        severity: 'info',
                        message: '文の終わりに句読点がありません',
                        code: 'MISSING_PUNCTUATION',
                        line: lineNumber
                    });
                }
            }
        });
        
        return issues;
    }

    /**
     * エンコーディングの検証
     */
    async validateEncoding(input) {
        const issues = [];
        
        if (!this.isValidUTF8(input)) {
            issues.push({
                severity: 'error',
                message: 'UTF-8エンコーディングが不正です',
                code: 'INVALID_UTF8',
                line: 0
            });
        }
        
        // 制御文字のチェック
        const controlChars = input.match(/[\x00-\x08\x0E-\x1F\x7F]/g);
        if (controlChars) {
            issues.push({
                severity: 'warning',
                message: '制御文字が含まれています',
                code: 'CONTROL_CHARACTERS',
                line: 0
            });
        }
        
        return issues;
    }

    /**
     * 自動修正の適用
     */
    async applyAutoCorrections(input, validationResults) {
        let correctedInput = input;
        const corrections = [];
        
        for (const result of validationResults) {
            if (result.severity === 'error') {
                const ruleName = this.getRuleNameByCode(result.code);
                const rule = this.rules.get(ruleName);
                
                if (rule && rule.autoFix) {
                    try {
                        const fixResult = await rule.autoFix(correctedInput, result);
                        if (fixResult && fixResult.correctedInput) {
                            correctedInput = fixResult.correctedInput;
                            corrections.push({
                                rule: ruleName,
                                original: input,
                                corrected: correctedInput,
                                description: fixResult.description
                            });
                        }
                    } catch (error) {
                        console.warn(`Auto-fix failed for rule ${ruleName}:`, error);
                    }
                }
            }
        }
        
        return { correctedInput, corrections };
    }

    /**
     * PlantUML構造の自動修正
     */
    async fixPlantUMLStructure(input, validationResult) {
        let corrected = input;
        
        switch (validationResult.code) {
            case 'MISSING_START_DIRECTIVE':
                corrected = '@startuml\n' + corrected;
                break;
                
            case 'MISSING_END_DIRECTIVE':
                corrected = corrected + '\n@enduml';
                break;
                
            case 'EMPTY_CONTENT':
                // 最小限のコンテンツを追加
                corrected = corrected.replace(
                    /(@startuml\s*\n?)(\s*)(@enduml)/,
                    '$1$2A -> B : example\n$3'
                );
                break;
        }
        
        return {
            correctedInput: corrected,
            description: `自動修正: ${validationResult.message}`
        };
    }

    /**
     * PlantUML構文の自動修正
     */
    async fixPlantUMLSyntax(input, validationResult) {
        let corrected = input;
        
        // 基本的な構文修正
        if (validationResult.code === 'SUSPICIOUS_SYNTAX') {
            const lines = corrected.split('\n');
            const targetLine = lines[validationResult.line - 1];
            
            // よくある間違いの修正
            let fixedLine = targetLine
                .replace(/ー>/g, '->')  // 長音符の修正
                .replace(/－>/g, '->')  // 全角マイナスの修正
                .replace(/：/g, ':')    // 全角コロンの修正
                .replace(/；/g, ';');   // 全角セミコロンの修正
                
            lines[validationResult.line - 1] = fixedLine;
            corrected = lines.join('\n');
        }
        
        return {
            correctedInput: corrected,
            description: '基本的な構文エラーを修正しました'
        };
    }

    /**
     * セキュリティ問題の修正
     */
    async fixSecurityIssues(input, validationResult) {
        let corrected = input;
        
        // 危険なパターンを削除または無害化
        window.VALIDATION_RULES.PLANTUML.forbiddenPatterns.forEach(pattern => {
            corrected = corrected.replace(pattern, '');
        });
        
        return {
            correctedInput: corrected,
            description: 'セキュリティ上危険な内容を削除しました'
        };
    }

    /**
     * 長さ制限の修正
     */
    async fixLengthLimits(input, validationResult) {
        let corrected = input;
        
        if (input.length > window.VALIDATION_RULES.INPUT.maxLength) {
            // 入力を制限長まで切り詰める
            corrected = input.substring(0, window.VALIDATION_RULES.INPUT.maxLength - 100);
            
            // PlantUMLの終了タグが欠けていれば追加
            if (!corrected.includes('@enduml')) {
                corrected += '\n@enduml';
            }
        }
        
        return {
            correctedInput: corrected,
            description: `入力を最大文字数(${window.VALIDATION_RULES.INPUT.maxLength})まで切り詰めました`
        };
    }

    /**
     * 日本語文法の修正
     */
    async fixJapaneseGrammar(input, validationResult) {
        let corrected = input;
        
        // 連続する助詞の修正
        corrected = corrected.replace(/([がのをにはでと])\1+/g, '$1');
        
        // 不適切な句読点の修正
        corrected = corrected.replace(/[。、]+([。、])/g, '$1');
        
        // 半角カタカナを全角に変換
        corrected = corrected.replace(/[\uFF61-\uFF9F]/g, (match) => {
            const code = match.charCodeAt(0);
            return String.fromCharCode(code - 0xFF61 + 0x3041);
        });
        
        return {
            correctedInput: corrected,
            description: '日本語の文法を修正しました（連続助詞、句読点、半角カタカナなど）'
        };
    }

    /**
     * 文字エンコーディングの修正
     */
    async fixEncoding(input, validationResult) {
        let corrected = input;
        
        try {
            // 不正なUTF-8文字を削除
            corrected = input.replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, '');
            
            // 制御文字の除去
            corrected = corrected.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            
            // BOMの除去
            if (corrected.charCodeAt(0) === 0xFEFF) {
                corrected = corrected.slice(1);
            }
            
        } catch (error) {
            console.warn('文字エンコーディング修正中にエラー:', error);
            corrected = input;
        }
        
        return {
            correctedInput: corrected,
            description: '不正な文字エンコーディングを修正しました'
        };
    }

    /**
     * 提案の生成
     */
    async generateSuggestions(input, validationResults) {
        const suggestions = [];
        
        // エラーベースの提案
        validationResults.forEach(result => {
            if (result.severity === 'error' || result.severity === 'warning') {
                const suggestion = this.generateSuggestionFromError(result);
                if (suggestion) {
                    suggestions.push(suggestion);
                }
            }
        });
        
        // コンテンツベースの提案
        const contentSuggestions = this.generateContentSuggestions(input);
        suggestions.push(...contentSuggestions);
        
        return suggestions;
    }

    /**
     * エラーからの提案生成
     */
    generateSuggestionFromError(result) {
        const suggestions = {
            'MISSING_START_DIRECTIVE': '文頭に @startuml を追加してください',
            'MISSING_END_DIRECTIVE': '文末に @enduml を追加してください',
            'EMPTY_CONTENT': '図の内容を追加してください（例: A -> B : メッセージ）',
            'INPUT_TOO_LONG': '入力を複数の図に分割することを検討してください',
            'SUSPICIOUS_SYNTAX': 'PlantUMLの公式ドキュメントで正しい構文を確認してください'
        };
        
        return suggestions[result.code];
    }

    /**
     * コンテンツベースの提案生成
     */
    generateContentSuggestions(input) {
        const suggestions = [];
        
        // 日本語が含まれている場合の提案
        if (this.containsJapanese(input) && !input.includes('@startuml')) {
            suggestions.push({
                type: 'conversion',
                message: '日本語テキストをPlantUMLに変換しますか？',
                action: 'convert-japanese-to-plantuml'
            });
        }
        
        // シンプルなコンテンツの場合の提案
        if (input.length < 50 && input.includes('->')) {
            suggestions.push({
                type: 'enhancement',
                message: 'より詳細な情報を追加することで、図を改善できます',
                action: 'suggest-enhancements'
            });
        }
        
        return suggestions;
    }

    /**
     * リアルタイムバリデーション
     */
    validateRealTime(input, callback, delay = null) {
        if (!this.options.realTime) return;
        
        const actualDelay = delay || this.realTimeDelay;
        
        if (this.realTimeDebounceTimer) {
            clearTimeout(this.realTimeDebounceTimer);
        }
        
        this.realTimeDebounceTimer = setTimeout(async () => {
            try {
                const result = await this.validate(input, 'auto', { skipCache: true });
                callback(result);
            } catch (error) {
                console.error('Real-time validation failed:', error);
                callback({
                    isValid: false,
                    errors: [{
                        severity: 'error',
                        message: 'リアルタイム検証でエラーが発生しました',
                        code: 'REALTIME_ERROR'
                    }],
                    warnings: [],
                    infos: []
                });
            }
        }, actualDelay);
    }

    /**
     * ユーティリティメソッド
     */
    isValidUTF8(str) {
        try {
            // UTF-8エンコーディングの検証
            return str === decodeURIComponent(encodeURIComponent(str));
        } catch (e) {
            return false;
        }
    }

    containsJapanese(str) {
        return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str);
    }

    endsWithPunctuation(str) {
        return /[。、！？．，!?.]$/.test(str);
    }

    hasProblematicCharacters(str) {
        // 問題を引き起こす可能性のある文字
        return /[""''‚„…–—]/.test(str);
    }

    checkPlantUMLLineSyntax(line) {
        // 基本的なPlantUML構文パターン
        const patterns = [
            /^\w+\s*->\s*\w+(\s*:\s*.+)?$/,      // メッセージ
            /^(participant|actor|boundary|control|entity|database|collections)\s+\w+/,
            /^note\s+(left|right|over)\s*(\w+)?\s*:\s*.+$/,
            /^(activate|deactivate)\s+\w+$/,
            /^class\s+\w+/,
            /^\w+\s*:\s*.+$/,                    // ラベル
            /^(if|else|endif|while|endwhile|loop|end)\b/,
            /^skinparam\s+\w+\s+.+$/,
            /^!define\s+\w+\s+.+$/,
            /^title\s+.+$/,
            /^@\w+/,                             // ディレクティブ
            /^'/,                                // コメント
            /^$/                                 // 空行
        ];
        
        return patterns.some(pattern => pattern.test(line));
    }

    findPatternLine(input, pattern) {
        const lines = input.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
                return i + 1;
            }
        }
        return 0;
    }

    generateCacheKey(input, inputType, options) {
        const optionsStr = JSON.stringify(options);
        const content = input.length > 1000 ? 
            input.substring(0, 1000) + '...' + input.slice(-100) : input;
        return `${inputType}_${btoa(content + optionsStr).substring(0, 50)}`;
    }

    calculateValidationScore(results) {
        let score = 100;
        
        results.forEach(result => {
            switch (result.severity) {
                case 'error':
                    score -= 20;
                    break;
                case 'warning':
                    score -= 5;
                    break;
                case 'info':
                    score -= 1;
                    break;
            }
        });
        
        return Math.max(0, score);
    }

    formatValidationMessage(result) {
        return {
            severity: result.severity,
            message: result.message,
            code: result.code,
            line: result.line,
            column: result.column || 0
        };
    }

    createValidationResult(isValid, errors, warnings, startTime) {
        return {
            isValid,
            score: isValid ? 100 : 0,
            errors: errors.map(this.formatValidationMessage),
            warnings: warnings.map(this.formatValidationMessage),
            infos: [],
            suggestions: [],
            correctedInput: null,
            metadata: {
                validationTime: performance.now() - startTime
            }
        };
    }

    getRuleNameByCode(code) {
        const codeToRule = {
            'MISSING_START_DIRECTIVE': 'plantuml-structure',
            'MISSING_END_DIRECTIVE': 'plantuml-structure',
            'EMPTY_CONTENT': 'plantuml-structure',
            'SUSPICIOUS_SYNTAX': 'plantuml-syntax',
            'SECURITY_VIOLATION': 'security',
            'INPUT_TOO_LONG': 'length-limits',
            'CONSECUTIVE_PARTICLES': 'japanese-grammar',
            'INVALID_UTF8': 'encoding'
        };
        
        return codeToRule[code] || null;
    }

    updateMetrics(result) {
        this.metrics.totalValidations++;
        
        if (result.isValid) {
            this.metrics.passedValidations++;
        } else {
            this.metrics.failedValidations++;
        }
        
        // 平均検証時間の更新
        const oldAvg = this.metrics.averageValidationTime;
        const newTime = result.metadata.validationTime;
        this.metrics.averageValidationTime = 
            (oldAvg * (this.metrics.totalValidations - 1) + newTime) / this.metrics.totalValidations;
    }

    /**
     * 公開API
     */
    getMetrics() {
        return { ...this.metrics };
    }

    clearCache() {
        this.validationCache.clear();
    }

    addCustomRule(name, rule) {
        this.rules.set(name, rule);
    }

    removeRule(name) {
        return this.rules.delete(name);
    }

    setValidationLevel(level) {
        if (Object.values(VALIDATION_LEVELS).includes(level)) {
            this.options.level = level;
        }
    }

    enableRealTime() {
        this.options.realTime = true;
    }

    disableRealTime() {
        this.options.realTime = false;
        if (this.realTimeDebounceTimer) {
            clearTimeout(this.realTimeDebounceTimer);
        }
    }
}

// ES6モジュールとしてエクスポート
let validationEngineInstance = null;

window.createValidationEngine = function createValidationEngine(options = {}) {
    if (!validationEngineInstance) {
        validationEngineInstance = new window.ValidationEngine(options);
    }
    return validationEngineInstance;
};

// 自動初期化
if (!window.globalValidationEngine) {
    window.globalValidationEngine = window.createValidationEngine();
}