/**
 * PlantUML�ǣ�� ����ƣ7
 * �������� - SEC-006��
 * 
 * _�:
 * - HTML�����7H	
 * - JavaScript�����
 * - CSS�����
 * - URL�����
 * - XML�����
 * - PlantUMLy	�����
 * - DOMPurifyq
 * - ��ƭ�����
 * 
 * @author debugger
 * @version 2.0.0
 * @created 2025-08-16
 */

class OutputEscaper {
    constructor(config = {}) {
        this.config = {
            // �,�����-�
            enableHtmlEscape: config.enableHtmlEscape !== false,
            enableJsEscape: config.enableJsEscape !== false,
            enableCssEscape: config.enableCssEscape !== false,
            enableUrlEscape: config.enableUrlEscape !== false,
            enableXmlEscape: config.enableXmlEscape !== false,
            
            // SEC-006 7-�
            enableDOMPurifyIntegration: config.enableDOMPurifyIntegration !== false,
            enableAdvancedHTMLEscape: config.enableAdvancedHTMLEscape !== false,
            enableUnicodeEscape: config.enableUnicodeEscape !== false,
            
            // �\-�
            strictMode: config.strictMode || false,
            autoDetectContext: config.autoDetectContext !== false,
            preserveWhitespace: config.preserveWhitespace !== false,
            
            ...config
        };

        // ��������󰚩7H	
        this.ESCAPE_MAPPINGS = {
            // HTML ������,7	
            HTML: {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '/': '&#x2F;',
                '`': '&#x60;',
                '=': '&#x3D;',
                // SEC-006: �������
                '{': '&#x7B;',
                '}': '&#x7D;',
                '[': '&#x5B;',
                ']': '&#x5D;',
                '\\': '&#x5C;'
            },

            // JavaScript �����7H	
            JAVASCRIPT: {
                '\\': '\\\\',
                '"': '\\"',
                "'": "\\'",
                '\n': '\\n',
                '\r': '\\r',
                '\t': '\\t',
                '\b': '\\b',
                '\f': '\\f',
                '\v': '\\v',
                '\0': '\\0',
                '\u2028': '\\u2028', // ��:��W
                '\u2029': '\\u2029', // �=:��W
                // SEC-006: ��
                '/': '\\/',
                '<': '\\u003C',
                '>': '\\u003E'
            },

            // CSS �����7H	
            CSS: {
                '"': '\\"',
                "'": "\\'",
                '\\': '\\\\',
                '\n': '\\A ',
                '\r': '\\D ',
                '\t': '\\9 ',
                '\f': '\\C ',
                '\v': '\\B ',
                // SEC-006: ��
                '(': '\\28 ',
                ')': '\\29 ',
                '<': '\\3C ',
                '>': '\\3E '
            },

            // URL �����RFC 3986��	
            URL: {
                ' ': '%20',
                '!': '%21',
                '#': '%23',
                '$': '%24',
                '&': '%26',
                "'": '%27',
                '(': '%28',
                ')': '%29',
                '*': '%2A',
                '+': '%2B',
                ',': '%2C',
                '/': '%2F',
                ':': '%3A',
                ';': '%3B',
                '=': '%3D',
                '?': '%3F',
                '@': '%40',
                '[': '%5B',
                ']': '%5D',
                // SEC-006: ��
                '{': '%7B',
                '}': '%7D',
                '<': '%3C',
                '>': '%3E'
            },

            // XML �����
            XML: {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&apos;'
            }
        };

        // qzѿ���5H	
        this.DANGEROUS_PATTERNS = {
            // XSS�#
            SCRIPT_TAGS: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            EVENT_HANDLERS: /on\w+\s*=/gi,
            JAVASCRIPT_URLS: /javascript:/gi,
            DATA_URLS: /data:(?:text\/html|application\/javascript)/gi,
            VBSCRIPT_URLS: /vbscript:/gi,
            
            // CSS�#
            STYLE_EXPRESSIONS: /expression\s*\(/gi,
            CSS_IMPORTS: /@import/gi,
            CSS_BINDINGS: /binding\s*:/gi,
            
            // ����ئj;�ѿ��
            IFRAME_TAGS: /<iframe\b[^>]*>/gi,
            OBJECT_TAGS: /<object\b[^>]*>/gi,
            EMBED_TAGS: /<embed\b[^>]*>/gi,
            FORM_TAGS: /<form\b[^>]*>/gi,
            META_REFRESH: /<meta\s+http-equiv\s*=\s*[\"']?refresh[\"']?/gi,
            
            // DOM�\�#
            DOCUMENT_WRITE: /document\.write/gi,
            INNER_HTML: /\.innerHTML\s*=/gi,
            OUTER_HTML: /\.outerHTML\s*=/gi,
            DOCUMENT_COOKIE: /document\.cookie/gi,
            
            // ��ȿ��Z�
            PROTO_ACCESS: /__proto__/gi,
            CONSTRUCTOR_ACCESS: /constructor\.prototype/gi,
            
            // eval�p�
            EVAL_FUNCTION: /eval\s*\(/gi,
            FUNCTION_CONSTRUCTOR: /Function\s*\(/gi,
            SETTIMEOUT_STRING: /setTimeout\s*\(\s*['"`]/gi,
            SETINTERVAL_STRING: /setInterval\s*\(\s*['"`]/gi
        };

        this.initializeEscaper();
    }

    /**
     * ������
     */
    initializeEscaper() {
        console.log('[OutputEscaper] ����ƣ������-...');
        
        // DOMPurifyn)(��'��
        if (typeof DOMPurify !== 'undefined' && this.config.enableDOMPurifyIntegration) {
            this.domPurify = DOMPurify;
            console.log('[OutputEscaper] DOMPurifyq��');
        } else {
            console.warn('[OutputEscaper] DOMPurify*)( - �,�����(');
        }
        
        // ��ƭ���h
        this.contextDetector = new ContextDetector();
        
        console.log('[OutputEscaper] ����ƣ��������');
    }

    /**
     * 섨�����
     * @param {string} input - ������an�W
     * @param {string} context - ����ƭ�� ('html', 'js', 'css', 'url', 'xml', 'auto')
     * @param {Object} options - ����ת׷��
     * @returns {Object} �����P�
     */
    escape(input, context = 'auto', options = {}) {
        const result = {
            escaped: input,
            originalLength: input ? input.length : 0,
            context: context,
            detectedContext: null,
            escapedChars: 0,
            securityLevel: 'safe',
            warnings: [],
            dangerousPatternsFound: [],
            timestamp: new Date().toISOString(),
            // SEC-006 7�
            domPurifyUsed: false,
            unicodeEscaped: false,
            advancedEscaped: false
        };

        try {
            // e�<
            if (!this.validateInput(input, result)) {
                return result;
            }

            // ��ƭ�����
            if (context === 'auto' && this.config.autoDetectContext) {
                result.detectedContext = this.detectContext(input);
                context = result.detectedContext;
            }

            // qzѿ����ï
            this.checkDangerousPatterns(input, result);

            // DOMPurifyM�)(��j4	
            if (this.domPurify && this.config.enableDOMPurifyIntegration && 
                (context === 'html' || context === 'auto')) {
                input = this.preprocessWithDOMPurify(input, result);
            }

            // ��ƭ��%������
            result.escaped = this.performEscape(input, context, options, result);

            // ئj������
            if (this.config.enableAdvancedHTMLEscape && context === 'html') {
                result.escaped = this.performAdvancedHTMLEscape(result.escaped, result);
            }

            // Unicode�����
            if (this.config.enableUnicodeEscape) {
                result.escaped = this.performUnicodeEscape(result.escaped, result);
            }

            // ����ƣ���U�
            this.evaluateSecurityLevel(result);

            // ��<
            this.validateEscapedOutput(result);

        } catch (error) {
            console.error('[OutputEscaper] ����ר��:', error);
            result.warnings.push({
                type: 'ESCAPE_ERROR',
                message: `������g���LzW~W_: ${error.message}`,
                severity: 'high'
            });
            result.securityLevel = 'risky';
        }

        return result;
    }

    /**
     * DOMPurifyk��M�
     */
    preprocessWithDOMPurify(input, result) {
        try {
            const sanitized = this.domPurify.sanitize(input, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
                KEEP_CONTENT: true,
                // SEC-006: ���<j-�
                FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
                FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'meta'],
                FORBID_ATTR: ['style', 'on*', 'href', 'src'],
                USE_PROFILES: { html: false }
            });

            result.domPurifyUsed = true;
            console.log('[OutputEscaper] DOMPurifyM���');
            return sanitized;

        } catch (error) {
            console.warn('[OutputEscaper] DOMPurifyM����:', error);
            result.warnings.push({
                type: 'DOMPURIFY_ERROR',
                message: 'DOMPurify�g���LzW~W_',
                severity: 'medium'
            });
            return input;
        }
    }

    /**
     * ئjHTML�����
     */
    performAdvancedHTMLEscape(input, result) {
        let escaped = input;

        // 6��Wn�����
        escaped = escaped.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
            const code = match.charCodeAt(0);
            result.escapedChars++;
            return `&#${code};`;
        });

        // �깯�Wn�����
        const highRiskChars = {
            '\u00A0': '&#160;', // ����������
            '\u2000': '&#8192;', // en quad
            '\u2001': '&#8193;', // em quad
            '\u2028': '&#8232;', // ��:��W
            '\u2029': '&#8233;'  // �=:��W
        };

        for (const [char, escaped_char] of Object.entries(highRiskChars)) {
            escaped = escaped.replace(new RegExp(char, 'g'), escaped_char);
        }

        result.advancedEscaped = true;
        return escaped;
    }

    /**
     * Unicode������
     */
    performUnicodeEscape(input, result) {
        // ^ASCII�WnUnicode�����
        const escaped = input.replace(/[^\x00-\x7F]/g, (match) => {
            const code = match.charCodeAt(0);
            result.escapedChars++;
            if (code <= 0xFF) {
                return `\\x${code.toString(16).padStart(2, '0')}`;
            } else {
                return `\\u${code.toString(16).padStart(4, '0')}`;
            }
        });

        if (escaped !== input) {
            result.unicodeEscaped = true;
        }

        return escaped;
    }

    /**
     * e�<
     */
    validateInput(input, result) {
        if (input === null || input === undefined) {
            result.escaped = '';
            result.warnings.push({
                type: 'NULL_INPUT',
                message: 'e�Lzn_�z�W��W~Y',
                severity: 'low'
            });
            return false;
        }

        if (typeof input !== 'string') {
            result.escaped = String(input);
            result.warnings.push({
                type: 'TYPE_CONVERSION',
                message: '�W�ne���Wk	�W~W_',
                severity: 'medium'
            });
        }

        return true;
    }

    /**
     * qzѿ����ï7H	
     */
    checkDangerousPatterns(input, result) {
        for (const [patternName, pattern] of Object.entries(this.DANGEROUS_PATTERNS)) {
            const matches = input.match(pattern);
            if (matches) {
                result.dangerousPatternsFound.push({
                    pattern: patternName,
                    matches: matches.length,
                    examples: matches.slice(0, 3) //  n3dn�
                });

                result.warnings.push({
                    type: 'DANGEROUS_PATTERN',
                    message: `qzѿ��L�U�~W_: ${patternName}`,
                    severity: this.getPatternSeverity(patternName),
                    pattern: patternName,
                    matchCount: matches.length
                });

                if (this.getPatternSeverity(patternName) === 'critical') {
                    result.securityLevel = 'dangerous';
                }
            }
        }
    }

    /**
     * ѿ��qz�֗
     */
    getPatternSeverity(patternName) {
        const criticalPatterns = [
            'SCRIPT_TAGS', 'EVAL_FUNCTION', 'FUNCTION_CONSTRUCTOR',
            'SETTIMEOUT_STRING', 'SETINTERVAL_STRING', 'JAVASCRIPT_URLS',
            'DATA_URLS', 'DOCUMENT_WRITE', 'INNER_HTML', 'OUTER_HTML'
        ];

        const highPatterns = [
            'EVENT_HANDLERS', 'IFRAME_TAGS', 'OBJECT_TAGS', 'EMBED_TAGS',
            'FORM_TAGS', 'META_REFRESH', 'DOCUMENT_COOKIE', 'PROTO_ACCESS'
        ];

        if (criticalPatterns.includes(patternName)) {
            return 'critical';
        } else if (highPatterns.includes(patternName)) {
            return 'high';
        } else {
            return 'medium';
        }
    }

    /**
     * ��ƭ��%������
     */
    performEscape(input, context, options, result) {
        switch (context) {
            case 'html':
                return this.escapeHtml(input, options, result);
            case 'js':
            case 'javascript':
                return this.escapeJavaScript(input, options, result);
            case 'css':
                return this.escapeCss(input, options, result);
            case 'url':
                return this.escapeUrl(input, options, result);
            case 'xml':
                return this.escapeXml(input, options, result);
            case 'plantuml':
                return this.escapePlantUML(input, options, result);
            case 'json':
                return this.escapeJson(input, options, result);
            default:
                // �թ��oHTML�����
                result.warnings.push({
                    type: 'UNKNOWN_CONTEXT',
                    message: `*�n��ƭ�� '${context}' - HTML����ג(`,
                    severity: 'medium'
                });
                return this.escapeHtml(input, options, result);
        }
    }

    /**
     * HTML�����7H	
     */
    escapeHtml(input, options = {}, result = null) {
        if (!this.config.enableHtmlEscape) {
            return input;
        }

        let escaped = input;
        const mapping = this.ESCAPE_MAPPINGS.HTML;
        
        // �,HTML�����
        for (const [char, escapedChar] of Object.entries(mapping)) {
            const regex = new RegExp(this.escapeRegExp(char), 'g');
            escaped = escaped.replace(regex, escapedChar);
            
            if (result && input.includes(char)) {
                result.escapedChars++;
            }
        }

        // �<���gn�������
        if (options.strict || this.config.strictMode) {
            escaped = this.escapeHtmlStrict(escaped, result);
        }

        return escaped;
    }

    /**
     * �<HTML�����
     */
    escapeHtmlStrict(input, result) {
        // Unicode6��Wn�����
        let escaped = input.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
            const code = match.charCodeAt(0);
            if (result) result.escapedChars++;
            return `&#${code};`;
        });

        // ��nqz�W�����
        const additionalEscapes = {
            '{': '&#x7B;',
            '}': '&#x7D;',
            '[': '&#x5B;',
            ']': '&#x5D;',
            '|': '&#x7C;',
            '\\': '&#x5C;'
        };

        for (const [char, escapedChar] of Object.entries(additionalEscapes)) {
            const regex = new RegExp(this.escapeRegExp(char), 'g');
            escaped = escaped.replace(regex, escapedChar);
            
            if (result && input.includes(char)) {
                result.escapedChars++;
            }
        }

        return escaped;
    }

    /**
     * JavaScript�����7H	
     */
    escapeJavaScript(input, options = {}, result = null) {
        if (!this.config.enableJsEscape) {
            return input;
        }

        let escaped = input;
        const mapping = this.ESCAPE_MAPPINGS.JAVASCRIPT;

        for (const [char, escapedChar] of Object.entries(mapping)) {
            const regex = new RegExp(this.escapeRegExp(char), 'g');
            escaped = escaped.replace(regex, escapedChar);
            
            if (result && input.includes(char)) {
                result.escapedChars++;
            }
        }

        // Unicode6��Wn�����
        escaped = escaped.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
            const code = match.charCodeAt(0).toString(16).padStart(4, '0');
            if (result) result.escapedChars++;
            return `\\u${code}`;
        });

        // �깯Unicode�Wn�����
        escaped = escaped.replace(/[\u2028\u2029]/g, (match) => {
            const code = match.charCodeAt(0).toString(16).padStart(4, '0');
            if (result) result.escapedChars++;
            return `\\u${code}`;
        });

        return escaped;
    }

    /**
     * CSS�����
     */
    escapeCss(input, options = {}, result = null) {
        if (!this.config.enableCssEscape) {
            return input;
        }

        let escaped = input;
        const mapping = this.ESCAPE_MAPPINGS.CSS;

        for (const [char, escapedChar] of Object.entries(mapping)) {
            const regex = new RegExp(this.escapeRegExp(char), 'g');
            escaped = escaped.replace(regex, escapedChar);
            
            if (result && input.includes(char)) {
                result.escapedChars++;
            }
        }

        // CSSy��Wn162�����
        escaped = escaped.replace(/[^\w-]/g, (match) => {
            const code = match.charCodeAt(0).toString(16);
            if (result) result.escapedChars++;
            return `\\${code} `;
        });

        return escaped;
    }

    /**
     * URL�����
     */
    escapeUrl(input, options = {}, result = null) {
        if (!this.config.enableUrlEscape) {
            return input;
        }

        try {
            // encodeURIComponent(
            const escaped = encodeURIComponent(input);
            
            if (result) {
                result.escapedChars = input.length - escaped.replace(/%/g, '').length;
            }
            
            return escaped;
        } catch (error) {
            console.warn('[OutputEscaper] URL����ר��:', error);
            return this.escapeUrlManual(input, result);
        }
    }

    /**
     * K�URL�����
     */
    escapeUrlManual(input, result) {
        let escaped = input;
        const mapping = this.ESCAPE_MAPPINGS.URL;

        for (const [char, escapedChar] of Object.entries(mapping)) {
            const regex = new RegExp(this.escapeRegExp(char), 'g');
            escaped = escaped.replace(regex, escapedChar);
            
            if (result && input.includes(char)) {
                result.escapedChars++;
            }
        }

        return escaped;
    }

    /**
     * XML�����
     */
    escapeXml(input, options = {}, result = null) {
        if (!this.config.enableXmlEscape) {
            return input;
        }

        let escaped = input;
        const mapping = this.ESCAPE_MAPPINGS.XML;

        for (const [char, escapedChar] of Object.entries(mapping)) {
            const regex = new RegExp(this.escapeRegExp(char), 'g');
            escaped = escaped.replace(regex, escapedChar);
            
            if (result && input.includes(char)) {
                result.escapedChars++;
            }
        }

        return escaped;
    }

    /**
     * PlantUMLy	�����
     */
    escapePlantUML(input, options = {}, result = null) {
        let escaped = input;

        // PlantUMLny	�����
        const plantUmlEscapes = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            // PlantUMLy	nqz�W
            '!include': '&#33;include',
            '!define': '&#33;define',
            '!pragma': '&#33;pragma'
        };

        for (const [char, escapedChar] of Object.entries(plantUmlEscapes)) {
            const regex = new RegExp(this.escapeRegExp(char), 'g');
            escaped = escaped.replace(regex, escapedChar);
            
            if (result && input.includes(char)) {
                result.escapedChars++;
            }
        }

        return escaped;
    }

    /**
     * JSON�����
     */
    escapeJson(input, options = {}, result = null) {
        try {
            const escaped = JSON.stringify(input);
            
            if (result) {
                result.escapedChars = escaped.length - input.length;
            }
            
            return escaped.slice(1, -1); // H-+>n(&�Jd
        } catch (error) {
            console.warn('[OutputEscaper] JSON����ר��:', error);
            return this.escapeJavaScript(input, options, result);
        }
    }

    /**
     * ��ƭ�����
     */
    detectContext(input) {
        return this.contextDetector.detect(input);
    }

    /**
     * ����ƣ���U�
     */
    evaluateSecurityLevel(result) {
        const criticalWarnings = result.warnings.filter(w => w.severity === 'critical');
        const highWarnings = result.warnings.filter(w => w.severity === 'high');
        const dangerousPatterns = result.dangerousPatternsFound.length;

        if (criticalWarnings.length > 0 || dangerousPatterns > 5) {
            result.securityLevel = 'dangerous';
        } else if (highWarnings.length > 0 || dangerousPatterns > 2) {
            result.securityLevel = 'risky';
        } else if (result.escapedChars > 0 || dangerousPatterns > 0) {
            result.securityLevel = 'secured';
        } else {
            result.securityLevel = 'safe';
        }
    }

    /**
     * �������n<
     */
    validateEscapedOutput(result) {
        // qzѿ��L�cfDjDK��ï
        for (const [patternName, pattern] of Object.entries(this.DANGEROUS_PATTERNS)) {
            if (pattern.test(result.escaped)) {
                result.warnings.push({
                    type: 'ESCAPE_INCOMPLETE',
                    message: `����׌�qzѿ��L�X: ${patternName}`,
                    severity: 'critical'
                });
                result.securityLevel = 'dangerous';
            }
        }
    }

    /**
     * c�h�(�W�����
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * ���������
     */
    escapeBatch(inputs, context = 'auto', options = {}) {
        return inputs.map(input => this.escape(input, context, options));
    }

    /**
     * �����P�n<
     */
    validateEscaped(escaped, originalContext) {
        const validation = {
            isValid: true,
            issues: [],
            securityLevel: 'safe'
        };

        // qzѿ��L�XWfDjDK��ï
        for (const [patternName, pattern] of Object.entries(this.DANGEROUS_PATTERNS)) {
            if (pattern.test(escaped)) {
                validation.isValid = false;
                validation.issues.push({
                    type: 'ESCAPE_INCOMPLETE',
                    message: `����׌�qzѿ��L�X: ${patternName}`,
                    severity: 'critical'
                });
                validation.securityLevel = 'dangerous';
            }
        }

        return validation;
    }

    /**
     * -���
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[OutputEscaper] -�L��U�~W_');
    }

    /**
     * �����q֗
     */
    getEscapeStatistics() {
        return {
            htmlEscapeEnabled: this.config.enableHtmlEscape,
            jsEscapeEnabled: this.config.enableJsEscape,
            cssEscapeEnabled: this.config.enableCssEscape,
            urlEscapeEnabled: this.config.enableUrlEscape,
            xmlEscapeEnabled: this.config.enableXmlEscape,
            domPurifyIntegrationEnabled: this.config.enableDOMPurifyIntegration,
            advancedHTMLEscapeEnabled: this.config.enableAdvancedHTMLEscape,
            unicodeEscapeEnabled: this.config.enableUnicodeEscape,
            strictMode: this.config.strictMode,
            autoDetectContext: this.config.autoDetectContext
        };
    }
}

/**
 * ��ƭ���h7H	
 */
class ContextDetector {
    constructor() {
        this.contextPatterns = {
            html: [
                /<[^>]+>/,
                /&[a-zA-Z]+;/,
                /<!DOCTYPE/i,
                /<html/i,
                /<head/i,
                /<body/i,
                /<div/i,
                /<span/i
            ],
            javascript: [
                /function\s*\(/,
                /var\s+\w+/,
                /let\s+\w+/,
                /const\s+\w+/,
                /console\./,
                /document\./,
                /window\./,
                /\$\(/,
                /=>\s*{/,
                /class\s+\w+/
            ],
            css: [
                /[\w-]+\s*:\s*[^;]+;/,
                /@media/,
                /@import/,
                /@keyframes/,
                /\{[^}]*\}/,
                /\.[\w-]+\s*{/,
                /#[\w-]+\s*{/
            ],
            url: [
                /^https?:\/\//,
                /^ftp:\/\//,
                /^mailto:/,
                /www\./,
                /\.[a-z]{2,4}\/$/,
                /\/[a-zA-Z0-9_-]+/
            ],
            plantuml: [
                /@startuml/,
                /@enduml/,
                /participant/,
                /actor/,
                /->/,
                /alt\s+/,
                /loop\s+/,
                /opt\s+/,
                /par\s+/
            ],
            json: [
                /^\s*{.*}\s*$/s,
                /^\s*\[.*\]\s*$/s,
                /\"[^\"]*\"\s*:/,
                /:\s*\"[^\"]*\"/,
                /:\s*\d+/,
                /:\s*(true|false|null)/
            ]
        };
    }

    detect(input) {
        const scores = {};
        
        // ��ƭ��n�����
        for (const [context, patterns] of Object.entries(this.contextPatterns)) {
            scores[context] = 0;
            
            for (const pattern of patterns) {
                if (pattern.test(input)) {
                    scores[context]++;
                }
            }
        }

        //  ع��n��ƭ�Ȓ�Y
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) {
            return 'html'; // �թ��
        }

        // �n4o*HMgz�
        const priorityOrder = ['html', 'javascript', 'css', 'json', 'plantuml', 'url'];
        for (const context of priorityOrder) {
            if (scores[context] === maxScore) {
                return context;
            }
        }

        return Object.keys(scores).find(key => scores[key] === maxScore);
    }
}

// ���먯����
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OutputEscaper, ContextDetector };
} else if (typeof window !== 'undefined') {
    window.OutputEscaper = OutputEscaper;
    window.ContextDetector = ContextDetector;
}

console.log('[OutputEscaper] ����ƣ7��������L��~�~W_');