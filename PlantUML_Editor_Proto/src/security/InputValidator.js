/**
 * PlantUML¨Ç£¿ü »­åêÆ£7
 * e›<â¸åüë - SEC-006şÜ
 * 
 * _ı:
 * - ì„e›<
 * - »­åêÆ£Ñ¿üó<  
 * - µË¿¤¼ü·çó
 * - ê¢ë¿¤à<
 * - ×íÈ¿¤×ZÓşV
 * - eval¢púû2b
 * - XSSÑ¿üó7<
 * 
 * @author debugger
 * @version 2.0.0
 * @created 2025-08-16
 */

class InputValidator {
    constructor(config = {}) {
        this.config = {
            // ú,-š
            maxInputLength: config.maxInputLength || 50000,
            maxActorNameLength: config.maxActorNameLength || 100,
            maxActionLength: config.maxActionLength || 500,
            allowedCharsets: config.allowedCharsets || ['utf-8', 'ascii'],
            enableRealTimeValidation: config.enableRealTimeValidation || true,
            strictMode: config.strictMode || false,
            
            // SEC-006 7_ı
            enablePrototypePollutionProtection: config.enablePrototypePollutionProtection !== false,
            enableEvalDetection: config.enableEvalDetection !== false,
            enableDOMPurifyIntegration: config.enableDOMPurifyIntegration !== false,
            enableAdvancedXSSDetection: config.enableAdvancedXSSDetection !== false,
            enableCommandInjectionDetection: config.enableCommandInjectionDetection !== false,
            
            // Õêüºİw
            enableObjectFreeze: config.enableObjectFreeze !== false,
            restrictProtoAccess: config.restrictProtoAccess !== false,
            
            ...config
        };

        // »­åêÆ£Ñ¿üóš©7H	
        this.SECURITY_PATTERNS = {
            // XSS;ƒÑ¿üó7	
            XSS_PATTERNS: [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /<iframe/gi,
                /<object/gi,
                /<embed/gi,
                /<form/gi,
                /expression\s*\(/gi,
                /vbscript:/gi,
                /data:text\/html/gi,
                // °ı Ø¦jXSSÑ¿üó
                /document\.cookie/gi,
                /document\.write/gi,
                /window\.location/gi,
                /\.innerHTML\s*=/gi,
                /\.outerHTML\s*=/gi,
                /eval\s*\(/gi,
                /setTimeout\s*\(\s*['"`]/gi,
                /setInterval\s*\(\s*['"`]/gi
            ],
            
            // ¤ó¸§¯·çó;ƒÑ¿üó
            INJECTION_PATTERNS: [
                /union\s+select/gi,
                /drop\s+table/gi,
                /insert\s+into/gi,
                /delete\s+from/gi,
                /update\s+set/gi,
                /exec\s*\(/gi,
                /eval\s*\(/gi,
                /system\s*\(/gi,
                /shell_exec/gi,
                /passthru/gi
            ],
            
            // ³ŞóÉ¤ó¸§¯·çóÑ¿üó
            COMMAND_PATTERNS: [
                /;\s*rm\s/gi,
                /;\s*del\s/gi,
                /;\s*format\s/gi,
                /\|\s*nc\s/gi,
                /&&\s*rm\s/gi,
                /&\s*del\s/gi,
                /`[^`]*`/g,
                /\$\([^)]*\)/g,
                // °ı PowerShell³ŞóÉ
                /powershell\s*-/gi,
                /cmd\s*\/c/gi,
                /bash\s*-c/gi
            ],
            
            // eval¢púÑ¿üó°	
            EVAL_PATTERNS: [
                /eval\s*\(/gi,
                /Function\s*\(/gi,
                /setTimeout\s*\(\s*['"`][^'"`]*['"`]/gi,
                /setInterval\s*\(\s*['"`][^'"`]*['"`]/gi,
                /new\s+Function\s*\(/gi,
                /\[\s*['"`]constructor['"`]\s*\]/gi
            ],
            
            // ×íÈ¿¤×ZÓÑ¿üó°	
            PROTOTYPE_POLLUTION_PATTERNS: [
                /__proto__/gi,
                /constructor\.prototype/gi,
                /\.prototype\[/gi,
                /\['prototype'\]/gi,
                /\["prototype"\]/gi,
                /Object\.prototype/gi
            ],
            
            // PlantUML‰h‡W
            PLANTUML_SAFE_CHARS: /^[a-zA-Z0-9\s\n\r\t\-_:()[\]{}.,;@#$%^&*+=<>?/\\|!"'`~]*$/,
            
            // å,’+€PlantUML‰h‡W
            PLANTUML_SAFE_CHARS_JP: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEFa-zA-Z0-9\s\n\r\t\-_:()[\]{}.,;@#$%^&*+=<>?/\\|!"'`~]*$/
        };

        // Ûï¤Èê¹È
        this.WHITELISTS = {
            // PlantUML­üïüÉ
            PLANTUML_KEYWORDS: [
                '@startuml', '@enduml', 'participant', 'actor', 'boundary', 'control', 'entity', 'database',
                'alt', 'else', 'end', 'opt', 'loop', 'par', 'break', 'critical', 'group',
                'note', 'left', 'right', 'over', 'of', 'activate', 'deactivate', 'destroy',
                'title', 'footer', 'header', 'autonumber', 'hide', 'show', 'footbox',
                'box', 'skin', 'style', 'color', 'as'
            ],
            
            // 1ï—P
            ALLOWED_OPERATORS: [
                '->', '<-', '-->', '<--', '-\\', '\\-', '//', '\\\\',
                '++', '--', '**', '||', '==', '!!'
            ],
            
            // 1ïyŠ‡W
            ALLOWED_SPECIAL_CHARS: [
                '(', ')', '[', ']', '{', '}', '<', '>', '|', '\\', '/', '-', '_',
                ':', ';', '.', ',', '!', '?', '#', '@', '$', '%', '^', '&', '*',
                '+', '=', '"', "'", '`', '~', ' ', '\t', '\n', '\r'
            ]
        };

        // ¨éüáÃ»ü¸
        this.ERROR_MESSAGES = {
            INVALID_LENGTH: 'e›‡WpL6P’…NWfD~Y',
            INVALID_ENCODING: 'cj‡W¨ó³üÇ£ó°LúUŒ~W_',
            XSS_DETECTED: 'XSS;ƒnïı'LúUŒ~W_',
            INJECTION_DETECTED: '¤ó¸§¯·çó;ƒnïı'LúUŒ~W_',
            COMMAND_INJECTION: '³ŞóÉ¤ó¸§¯·çó;ƒnïı'LúUŒ~W_',
            EVAL_DETECTED: 'eval¢pn(LúUŒ~W_',
            PROTOTYPE_POLLUTION: '×íÈ¿¤×ZÓ;ƒnïı'LúUŒ~W_',
            INVALID_CHARACTERS: '1ïUŒfDjD‡WL+~ŒfD~Y',
            MALFORMED_PLANTUML: 'PlantUMLnbLcWOBŠ~[“',
            SECURITY_VIOLATION: '»­åêÆ£UÍLúUŒ~W_'
        };

        // İwUŒ_ªÖ¸§¯È×íÑÆ£
        this.PROTECTED_PROPERTIES = [
            '__proto__',
            'constructor',
            'prototype',
            'valueOf',
            'toString',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable'
        ];

        this.initializeSecurity();
    }

    /**
     * »­åêÆ£
     */
    initializeSecurity() {
        console.log('[InputValidator] »­åêÆ£_ı-...');
        
        // DOMPurifyn)(ïı'º
        if (typeof DOMPurify !== 'undefined' && this.config.enableDOMPurifyIntegration) {
            this.domPurify = DOMPurify;
            console.log('[InputValidator] DOMPurifyqŒ†');
        } else {
            console.warn('[InputValidator] DOMPurify*)( - ú,µË¿¤¼ü·çó(');
        }

        // ªÖ¸§¯Èİwni(
        if (this.config.enableObjectFreeze) {
            this.freezeSecurityObjects();
        }

        // CSRFİw
        this.initializeCSRFProtection();
        
        console.log('[InputValidator] »­åêÆ£_ıŒ†');
    }

    /**
     * »­åêÆ£ªÖ¸§¯ÈnÍP
     */
    freezeSecurityObjects() {
        try {
            Object.freeze(this.SECURITY_PATTERNS);
            Object.freeze(this.WHITELISTS);
            Object.freeze(this.ERROR_MESSAGES);
            Object.freeze(this.PROTECTED_PROPERTIES);
            console.log('[InputValidator] »­åêÆ£ªÖ¸§¯ÈÍPŒ†');
        } catch (error) {
            console.warn('[InputValidator] ªÖ¸§¯ÈÍP¨éü:', error);
        }
    }

    /**
     * CSRFİw-š
     */
    initializeCSRFProtection() {
        if (!window.csrfToken) {
            window.csrfToken = this.generateCSRFToken();
        }
    }

    /**
     * CSRF(Èü¯ó
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * ì„e›<
     * @param {string} input - <şane›
     * @param {string} type - e›¿¤× ('plantuml', 'actor', 'action', 'general')
     * @returns {Object} <Pœ
     */
    validate(input, type = 'general') {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitizedInput: input,
            securityLevel: 'safe',
            timestamp: new Date().toISOString(),
            // SEC-006 7î
            evalDetected: false,
            prototypePollutionDetected: false,
            advancedXSSDetected: false,
            commandInjectionDetected: false
        };

        try {
            // 1. ú,»­åêÆ£<
            this.validateBasicSecurity(input, result);
            
            // 2. ¿¤×%<
            this.validateByType(input, type, result);
            
            // 3. »­åêÆ£Ñ¿üó<
            this.validateSecurityPatterns(input, result);
            
            // 4. SEC-006 7<
            if (this.config.enableEvalDetection) {
                this.validateEvalUsage(input, result);
            }
            
            if (this.config.enablePrototypePollutionProtection) {
                this.validatePrototypePollution(input, result);
            }
            
            if (this.config.enableAdvancedXSSDetection) {
                this.validateAdvancedXSS(input, result);
            }
            
            if (this.config.enableCommandInjectionDetection) {
                this.validateCommandInjection(input, result);
            }
            
            // 5. µË¿¤¼ü·çó
            result.sanitizedInput = this.sanitizeInput(input, type);
            
            // 6.  BU¡
            this.finalizeValidation(result);

        } catch (error) {
            console.error('[InputValidator] <¨éü:', error);
            result.isValid = false;
            result.errors.push({
                type: 'VALIDATION_ERROR',
                message: `<æg¨éüLzW~W_: ${error.message}`,
                severity: 'high'
            });
        }

        return result;
    }

    /**
     * eval¢p(<°	
     */
    validateEvalUsage(input, result) {
        for (const pattern of this.SECURITY_PATTERNS.EVAL_PATTERNS) {
            if (pattern.test(input)) {
                result.evalDetected = true;
                result.errors.push({
                    type: 'EVAL_DETECTED',
                    message: this.ERROR_MESSAGES.EVAL_DETECTED,
                    severity: 'critical',
                    pattern: pattern.source
                });
                result.securityLevel = 'dangerous';
            }
        }
    }

    /**
     * ×íÈ¿¤×ZÓ<°	
     */
    validatePrototypePollution(input, result) {
        for (const pattern of this.SECURITY_PATTERNS.PROTOTYPE_POLLUTION_PATTERNS) {
            if (pattern.test(input)) {
                result.prototypePollutionDetected = true;
                result.errors.push({
                    type: 'PROTOTYPE_POLLUTION',
                    message: this.ERROR_MESSAGES.PROTOTYPE_POLLUTION,
                    severity: 'critical',
                    pattern: pattern.source
                });
                result.securityLevel = 'dangerous';
            }
        }

        // İw×íÑÆ£xn¢¯»¹<
        for (const prop of this.PROTECTED_PROPERTIES) {
            if (input.includes(prop)) {
                result.prototypePollutionDetected = true;
                result.warnings.push({
                    type: 'PROTECTED_PROPERTY_ACCESS',
                    message: `İw×íÑÆ£ '${prop}' xn¢¯»¹LúUŒ~W_`,
                    severity: 'medium'
                });
            }
        }
    }

    /**
     * Ø¦jXSS<°	
     */
    validateAdvancedXSS(input, result) {
        // DOMÍ\¢#n<
        const domManipulationPatterns = [
            /document\.getElementById/gi,
            /document\.querySelector/gi,
            /document\.createElement/gi,
            /\.appendChild/gi,
            /\.insertBefore/gi,
            /\.removeChild/gi
        ];

        for (const pattern of domManipulationPatterns) {
            if (pattern.test(input)) {
                result.advancedXSSDetected = true;
                result.warnings.push({
                    type: 'DOM_MANIPULATION',
                    message: 'DOMÍ\¢pn(LúUŒ~W_',
                    severity: 'medium',
                    pattern: pattern.source
                });
            }
        }

        // ¤ÙóÈÏóÉéüns0<
        const eventHandlerPattern = /on\w+\s*=\s*['""]?[^'""]*['""]?/gi;
        const matches = input.match(eventHandlerPattern);
        if (matches) {
            result.advancedXSSDetected = true;
            result.errors.push({
                type: 'EVENT_HANDLER_XSS',
                message: 'qzj¤ÙóÈÏóÉéüLúUŒ~W_',
                severity: 'high',
                details: matches
            });
        }
    }

    /**
     * ³ŞóÉ¤ó¸§¯·çó<°	
     */
    validateCommandInjection(input, result) {
        for (const pattern of this.SECURITY_PATTERNS.COMMAND_PATTERNS) {
            if (pattern.test(input)) {
                result.commandInjectionDetected = true;
                result.errors.push({
                    type: 'COMMAND_INJECTION',
                    message: this.ERROR_MESSAGES.COMMAND_INJECTION,
                    severity: 'critical',
                    pattern: pattern.source
                });
                result.securityLevel = 'dangerous';
            }
        }
    }

    /**
     * ú,»­åêÆ£<
     */
    validateBasicSecurity(input, result) {
        // NULL/undefined Á§Ã¯
        if (input === null || input === undefined) {
            result.errors.push({
                type: 'NULL_INPUT',
                message: 'e›LzgY',
                severity: 'medium'
            });
            return;
        }

        // ‹Á§Ã¯
        if (typeof input !== 'string') {
            result.errors.push({
                type: 'INVALID_TYPE',
                message: '‡Wåne›o1ïUŒfD~[“',
                severity: 'high'
            });
            return;
        }

        // wUÁ§Ã¯
        if (input.length > this.config.maxInputLength) {
            result.errors.push({
                type: 'INVALID_LENGTH',
                message: this.ERROR_MESSAGES.INVALID_LENGTH,
                severity: 'medium',
                details: ` ': ${this.config.maxInputLength}, ş(: ${input.length}`
            });
        }

        // ¨ó³üÇ£ó°Á§Ã¯
        if (!this.validateEncoding(input)) {
            result.errors.push({
                type: 'INVALID_ENCODING',
                message: this.ERROR_MESSAGES.INVALID_ENCODING,
                severity: 'high'
            });
        }
    }

    /**
     * ¿¤×%<
     */
    validateByType(input, type, result) {
        switch (type) {
            case 'plantuml':
                this.validatePlantUMLCode(input, result);
                break;
            case 'actor':
                this.validateActorName(input, result);
                break;
            case 'action':
                this.validateActionText(input, result);
                break;
            default:
                this.validateGeneralInput(input, result);
        }
    }

    /**
     * PlantUML³üÉ<
     */
    validatePlantUMLCode(input, result) {
        // PlantUMLú,¿°Á§Ã¯
        if (!input.includes('@startuml') && !input.includes('@enduml')) {
            result.warnings.push({
                type: 'MISSING_PLANTUML_TAGS',
                message: 'PlantUMLn¿°L‹dKŠ~[“',
                severity: 'low'
            });
        }

        // 1ï‡W»ÃÈÁ§Ã¯å,şÜ	
        if (!this.SECURITY_PATTERNS.PLANTUML_SAFE_CHARS_JP.test(input)) {
            result.errors.push({
                type: 'INVALID_CHARACTERS',
                message: this.ERROR_MESSAGES.INVALID_CHARACTERS,
                severity: 'medium'
            });
        }

        // Í¹Èñ¦Á§Ã¯
        this.validateNestingDepth(input, result);
    }

    /**
     * ¢¯¿ü<
     */
    validateActorName(input, result) {
        if (input.length > this.config.maxActorNameLength) {
            result.errors.push({
                type: 'ACTOR_NAME_TOO_LONG',
                message: `¢¯¿üLwYN~Y '${this.config.maxActorNameLength}‡W	`,
                severity: 'medium'
            });
        }

        // ¢¯¿ükqz‡WL+~Œ‹KÁ§Ã¯
        if (/[<>&"']/.test(input)) {
            result.errors.push({
                type: 'DANGEROUS_ACTOR_CHARS',
                message: '¢¯¿ükqzj‡WL+~ŒfD~Y',
                severity: 'high'
            });
        }
    }

    /**
     * ¢¯·çóÆ­¹È<
     */
    validateActionText(input, result) {
        if (input.length > this.config.maxActionLength) {
            result.errors.push({
                type: 'ACTION_TOO_LONG',
                message: `¢¯·çóÆ­¹ÈLwYN~Y '${this.config.maxActionLength}‡W	`,
                severity: 'medium'
            });
        }
    }

    /**
     *  ,e›<
     */
    validateGeneralInput(input, result) {
        // ú,„jwUfJn
        if (input.length > 1000) {
            result.warnings.push({
                type: 'LONG_INPUT',
                message: 'e›LwD_ækB“LKK‹ïı'LBŠ~Y',
                severity: 'low'
            });
        }
    }

    /**
     * »­åêÆ£Ñ¿üó<
     */
    validateSecurityPatterns(input, result) {
        // XSS<
        for (const pattern of this.SECURITY_PATTERNS.XSS_PATTERNS) {
            if (pattern.test(input)) {
                result.errors.push({
                    type: 'XSS_DETECTED',
                    message: this.ERROR_MESSAGES.XSS_DETECTED,
                    severity: 'critical',
                    pattern: pattern.source
                });
                result.securityLevel = 'dangerous';
            }
        }

        // ¤ó¸§¯·çó<
        for (const pattern of this.SECURITY_PATTERNS.INJECTION_PATTERNS) {
            if (pattern.test(input)) {
                result.errors.push({
                    type: 'INJECTION_DETECTED',
                    message: this.ERROR_MESSAGES.INJECTION_DETECTED,
                    severity: 'critical',
                    pattern: pattern.source
                });
                result.securityLevel = 'dangerous';
            }
        }
    }

    /**
     * Í¹Èñ¦<
     */
    validateNestingDepth(input, result, maxDepth = 10) {
        let depth = 0;
        let maxFound = 0;
        
        for (const char of input) {
            if (char === '{' || char === '(' || char === '[') {
                depth++;
                maxFound = Math.max(maxFound, depth);
            } else if (char === '}' || char === ')' || char === ']') {
                depth--;
            }
        }
        
        if (maxFound > maxDepth) {
            result.warnings.push({
                type: 'DEEP_NESTING',
                message: `Í¹ÈLñYN~Y ': ${maxDepth}, ş(: ${maxFound}	`,
                severity: 'medium'
            });
        }
    }

    /**
     * ¨ó³üÇ£ó°<
     */
    validateEncoding(input) {
        try {
            // UTF-8¨ó³üÇ£ó°c8'<
            const encoded = encodeURIComponent(input);
            const decoded = decodeURIComponent(encoded);
            return decoded === input;
        } catch (error) {
            return false;
        }
    }

    /**
     * e›nµË¿¤¼ü·çó7H	
     */
    sanitizeInput(input, type = 'general') {
        if (typeof input !== 'string') {
            return '';
        }

        let sanitized = input;

        // DOMPurifyL)(ïıj4
        if (this.domPurify && this.config.enableDOMPurifyIntegration) {
            sanitized = this.domPurify.sanitize(sanitized, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
                KEEP_CONTENT: true,
                // SEC-006: ˆŠ³<j-š
                FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed'],
                FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
                FORBID_ATTR: ['style', 'on*']
            });
        } else {
            // ú,„jHTML¨¹±ü×
            sanitized = this.escapeHtml(sanitized);
        }

        // ×íÈ¿¤×ZÓşV
        if (this.config.enablePrototypePollutionProtection) {
            sanitized = this.sanitizePrototypePollution(sanitized);
        }

        // eval¢pşV
        if (this.config.enableEvalDetection) {
            sanitized = this.sanitizeEvalFunctions(sanitized);
        }

        // ¿¤×%µË¿¤¼ü·çó
        switch (type) {
            case 'plantuml':
                sanitized = this.sanitizePlantUMLCode(sanitized);
                break;
            case 'actor':
                sanitized = this.sanitizeActorName(sanitized);
                break;
            case 'action':
                sanitized = this.sanitizeActionText(sanitized);
                break;
        }

        return sanitized;
    }

    /**
     * ×íÈ¿¤×ZÓµË¿¤¼ü·çó°	
     */
    sanitizePrototypePollution(input) {
        let sanitized = input;
        
        // qzj×íÑÆ£¢¯»¹’Jd
        for (const prop of this.PROTECTED_PROPERTIES) {
            const propPattern = new RegExp(`\\b${prop}\\b`, 'gi');
            sanitized = sanitized.replace(propPattern, '');
        }
        
        // __proto__nô¥„jJd
        sanitized = sanitized.replace(/__proto__/gi, '');
        sanitized = sanitized.replace(/\.prototype\[/gi, '');
        sanitized = sanitized.replace(/\['prototype'\]/gi, '');
        sanitized = sanitized.replace(/\["prototype"\]/gi, '');
        
        return sanitized;
    }

    /**
     * eval¢pµË¿¤¼ü·çó°	
     */
    sanitizeEvalFunctions(input) {
        let sanitized = input;
        
        // eval¢p|súW’Jd
        sanitized = sanitized.replace(/eval\s*\(/gi, '');
        sanitized = sanitized.replace(/Function\s*\(/gi, '');
        sanitized = sanitized.replace(/new\s+Function\s*\(/gi, '');
        
        // setTimeout/setIntervaln‡WŸL’6P
        sanitized = sanitized.replace(/setTimeout\s*\(\s*['"`][^'"`]*['"`]/gi, '');
        sanitized = sanitized.replace(/setInterval\s*\(\s*['"`][^'"`]*['"`]/gi, '');
        
        return sanitized;
    }

    /**
     * HTMLú,¨¹±ü×
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            // SEC-006: ı ¨¹±ü×
            .replace(/\//g, "&#x2F;")
            .replace(/`/g, "&#x60;")
            .replace(/=/g, "&#x3D;");
    }

    /**
     * PlantUML³üÉnµË¿¤¼ü·çó
     */
    sanitizePlantUMLCode(code) {
        // qzjÇ£ì¯Æ£Ö’Jd
        const dangerousPatterns = [
            /!include\s+[^|\s]+/gi,
            /!theme\s+[^|\s]+/gi,
            /skinparam\s+.*?(<|>|javascript|script)/gi,
            // SEC-006: ı Ñ¿üó
            /!define\s+.*?(eval|exec|system)/gi,
            /!pragma\s+[^\n]*/gi
        ];

        let sanitized = code;
        for (const pattern of dangerousPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }

        return sanitized;
    }

    /**
     * ¢¯¿ünµË¿¤¼ü·çó
     */
    sanitizeActorName(name) {
        // qz‡W’Jd
        return name.replace(/[<>&"']/g, '');
    }

    /**
     * ¢¯·çóÆ­¹ÈnµË¿¤¼ü·çó
     */
    sanitizeActionText(text) {
        // ú,„jHTML¨¹±ü×n
        return this.escapeHtml(text);
    }

    /**
     *  B<U¡
     */
    finalizeValidation(result) {
        // ô}„¨éüLB‹4o!¹
        const criticalErrors = result.errors.filter(e => e.severity === 'critical');
        if (criticalErrors.length > 0) {
            result.isValid = false;
            result.securityLevel = 'dangerous';
        }

        // Øqz¦¨éüLpB‹4
        const highErrors = result.errors.filter(e => e.severity === 'high');
        if (highErrors.length >= 3) {
            result.isValid = false;
            result.securityLevel = 'risky';
        }

        // »­åêÆ£ìÙë—
        if (result.errors.length === 0) {
            result.securityLevel = 'safe';
        } else if (result.errors.some(e => e.severity === 'high')) {
            result.securityLevel = 'risky';
        } else {
            result.securityLevel = 'moderate';
        }
    }

    /**
     * ê¢ë¿¤à<
     */
    validateRealTime(input, type, callback) {
        if (!this.config.enableRealTimeValidation) {
            return;
        }

        // ÇĞ¦ó¹
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            const result = this.validate(input, type);
            callback(result);
        }, 300);
    }

    /**
     * -šô°
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[InputValidator] -šLô°UŒ~W_');
    }

    /**
     * »­åêÆ£ìİüÈ
     */
    generateSecurityReport(input, validationResult) {
        return {
            timestamp: new Date().toISOString(),
            inputLength: input.length,
            securityLevel: validationResult.securityLevel,
            errorsCount: validationResult.errors.length,
            warningsCount: validationResult.warnings.length,
            criticalIssues: validationResult.errors.filter(e => e.severity === 'critical'),
            // SEC-006: 7î
            evalDetected: validationResult.evalDetected,
            prototypePollutionDetected: validationResult.prototypePollutionDetected,
            advancedXSSDetected: validationResult.advancedXSSDetected,
            commandInjectionDetected: validationResult.commandInjectionDetected,
            recommendations: this.generateRecommendations(validationResult)
        };
    }

    /**
     * »­åêÆ£¨h‹
     */
    generateRecommendations(validationResult) {
        const recommendations = [];

        if (validationResult.errors.some(e => e.type === 'XSS_DETECTED')) {
            recommendations.push('XSS;ƒnïı'LBŠ~Ye›…¹’ºWfO`UD');
        }

        if (validationResult.evalDetected) {
            recommendations.push('eval¢pn(LúUŒ~W_Õ„³üÉŸL’QfO`UD');
        }

        if (validationResult.prototypePollutionDetected) {
            recommendations.push('×íÈ¿¤×ZÓ;ƒnïı'LBŠ~YªÖ¸§¯È×íÑÆ£¢¯»¹’ºWfO`UD');
        }

        if (validationResult.commandInjectionDetected) {
            recommendations.push('³ŞóÉ¤ó¸§¯·çó;ƒnïı'LBŠ~Y·¹Æà³ŞóÉn(’QfO`UD');
        }

        if (validationResult.errors.some(e => e.type === 'INJECTION_DETECTED')) {
            recommendations.push('¤ó¸§¯·çó;ƒnïı'LBŠ~Yqzj‡Wn(’QfO`UD');
        }

        if (validationResult.errors.some(e => e.type === 'INVALID_LENGTH')) {
            recommendations.push('e›LwYN~YijwUkí.WfO`UD');
        }

        return recommendations;
    }
}

// â¸åüë¨¯¹İüÈ
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputValidator;
} else if (typeof window !== 'undefined') {
    window.InputValidator = InputValidator;
}

console.log('[InputValidator] »­åêÆ£7e›<â¸åüëL­¼~Œ~W_');