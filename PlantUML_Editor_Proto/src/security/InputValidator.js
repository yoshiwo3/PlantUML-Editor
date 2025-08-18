/**
 * PlantUML�ǣ�� ����ƣ7
 * e�<���� - SEC-006��
 * 
 * _�:
 * - �e�<
 * - ����ƣѿ��<  
 * - �˿������
 * - �뿤�<
 * - ��ȿ��Z��V
 * - eval�p��2b
 * - XSSѿ��7<
 * 
 * @author debugger
 * @version 2.0.0
 * @created 2025-08-16
 */

class InputValidator {
    constructor(config = {}) {
        this.config = {
            // �,-�
            maxInputLength: config.maxInputLength || 50000,
            maxActorNameLength: config.maxActorNameLength || 100,
            maxActionLength: config.maxActionLength || 500,
            allowedCharsets: config.allowedCharsets || ['utf-8', 'ascii'],
            enableRealTimeValidation: config.enableRealTimeValidation || true,
            strictMode: config.strictMode || false,
            
            // SEC-006 7_�
            enablePrototypePollutionProtection: config.enablePrototypePollutionProtection !== false,
            enableEvalDetection: config.enableEvalDetection !== false,
            enableDOMPurifyIntegration: config.enableDOMPurifyIntegration !== false,
            enableAdvancedXSSDetection: config.enableAdvancedXSSDetection !== false,
            enableCommandInjectionDetection: config.enableCommandInjectionDetection !== false,
            
            // �����w
            enableObjectFreeze: config.enableObjectFreeze !== false,
            restrictProtoAccess: config.restrictProtoAccess !== false,
            
            ...config
        };

        // ����ƣѿ��7H	
        this.SECURITY_PATTERNS = {
            // XSS;�ѿ��7	
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
                // ����ئjXSSѿ��
                /document\.cookie/gi,
                /document\.write/gi,
                /window\.location/gi,
                /\.innerHTML\s*=/gi,
                /\.outerHTML\s*=/gi,
                /eval\s*\(/gi,
                /setTimeout\s*\(\s*['"`]/gi,
                /setInterval\s*\(\s*['"`]/gi
            ],
            
            // �󸧯���;�ѿ��
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
            
            // ���ɤ󸧯���ѿ��
            COMMAND_PATTERNS: [
                /;\s*rm\s/gi,
                /;\s*del\s/gi,
                /;\s*format\s/gi,
                /\|\s*nc\s/gi,
                /&&\s*rm\s/gi,
                /&\s*del\s/gi,
                /`[^`]*`/g,
                /\$\([^)]*\)/g,
                // ����PowerShell����
                /powershell\s*-/gi,
                /cmd\s*\/c/gi,
                /bash\s*-c/gi
            ],
            
            // eval�p�ѿ����	
            EVAL_PATTERNS: [
                /eval\s*\(/gi,
                /Function\s*\(/gi,
                /setTimeout\s*\(\s*['"`][^'"`]*['"`]/gi,
                /setInterval\s*\(\s*['"`][^'"`]*['"`]/gi,
                /new\s+Function\s*\(/gi,
                /\[\s*['"`]constructor['"`]\s*\]/gi
            ],
            
            // ��ȿ��Z�ѿ����	
            PROTOTYPE_POLLUTION_PATTERNS: [
                /__proto__/gi,
                /constructor\.prototype/gi,
                /\.prototype\[/gi,
                /\['prototype'\]/gi,
                /\["prototype"\]/gi,
                /Object\.prototype/gi
            ],
            
            // PlantUML�h�W
            PLANTUML_SAFE_CHARS: /^[a-zA-Z0-9\s\n\r\t\-_:()[\]{}.,;@#$%^&*+=<>?/\\|!"'`~]*$/,
            
            // �,��+�PlantUML�h�W
            PLANTUML_SAFE_CHARS_JP: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEFa-zA-Z0-9\s\n\r\t\-_:()[\]{}.,;@#$%^&*+=<>?/\\|!"'`~]*$/
        };

        // �����
        this.WHITELISTS = {
            // PlantUML�����
            PLANTUML_KEYWORDS: [
                '@startuml', '@enduml', 'participant', 'actor', 'boundary', 'control', 'entity', 'database',
                'alt', 'else', 'end', 'opt', 'loop', 'par', 'break', 'critical', 'group',
                'note', 'left', 'right', 'over', 'of', 'activate', 'deactivate', 'destroy',
                'title', 'footer', 'header', 'autonumber', 'hide', 'show', 'footbox',
                'box', 'skin', 'style', 'color', 'as'
            ],
            
            // 1��P
            ALLOWED_OPERATORS: [
                '->', '<-', '-->', '<--', '-\\', '\\-', '//', '\\\\',
                '++', '--', '**', '||', '==', '!!'
            ],
            
            // 1�y��W
            ALLOWED_SPECIAL_CHARS: [
                '(', ')', '[', ']', '{', '}', '<', '>', '|', '\\', '/', '-', '_',
                ':', ';', '.', ',', '!', '?', '#', '@', '$', '%', '^', '&', '*',
                '+', '=', '"', "'", '`', '~', ' ', '\t', '\n', '\r'
            ]
        };

        // ����û��
        this.ERROR_MESSAGES = {
            INVALID_LENGTH: 'e��WpL6P��NWfD~Y',
            INVALID_ENCODING: 'cj�W���ǣ�L�U�~W_',
            XSS_DETECTED: 'XSS;�n��'L�U�~W_',
            INJECTION_DETECTED: '�󸧯���;�n��'L�U�~W_',
            COMMAND_INJECTION: '���ɤ󸧯���;�n��'L�U�~W_',
            EVAL_DETECTED: 'eval�pn(L�U�~W_',
            PROTOTYPE_POLLUTION: '��ȿ��Z�;�n��'L�U�~W_',
            INVALID_CHARACTERS: '1�U�fDjD�WL+~�fD~Y',
            MALFORMED_PLANTUML: 'PlantUMLnbLcWOB�~[�',
            SECURITY_VIOLATION: '����ƣU�L�U�~W_'
        };

        // �wU�_�ָ������ƣ
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
     * ����ƣ
     */
    initializeSecurity() {
        console.log('[InputValidator] ����ƣ_�-...');
        
        // DOMPurifyn)(��'��
        if (typeof DOMPurify !== 'undefined' && this.config.enableDOMPurifyIntegration) {
            this.domPurify = DOMPurify;
            console.log('[InputValidator] DOMPurifyq��');
        } else {
            console.warn('[InputValidator] DOMPurify*)( - �,�˿������(');
        }

        // �ָ����wni(
        if (this.config.enableObjectFreeze) {
            this.freezeSecurityObjects();
        }

        // CSRF�w
        this.initializeCSRFProtection();
        
        console.log('[InputValidator] ����ƣ_���');
    }

    /**
     * ����ƣ�ָ���n�P
     */
    freezeSecurityObjects() {
        try {
            Object.freeze(this.SECURITY_PATTERNS);
            Object.freeze(this.WHITELISTS);
            Object.freeze(this.ERROR_MESSAGES);
            Object.freeze(this.PROTECTED_PROPERTIES);
            console.log('[InputValidator] ����ƣ�ָ����P��');
        } catch (error) {
            console.warn('[InputValidator] �ָ����P���:', error);
        }
    }

    /**
     * CSRF�w-�
     */
    initializeCSRFProtection() {
        if (!window.csrfToken) {
            window.csrfToken = this.generateCSRFToken();
        }
    }

    /**
     * CSRF(����
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * �e�<
     * @param {string} input - <�ane�
     * @param {string} type - e���� ('plantuml', 'actor', 'action', 'general')
     * @returns {Object} <P�
     */
    validate(input, type = 'general') {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitizedInput: input,
            securityLevel: 'safe',
            timestamp: new Date().toISOString(),
            // SEC-006 7�
            evalDetected: false,
            prototypePollutionDetected: false,
            advancedXSSDetected: false,
            commandInjectionDetected: false
        };

        try {
            // 1. �,����ƣ<
            this.validateBasicSecurity(input, result);
            
            // 2. ���%<
            this.validateByType(input, type, result);
            
            // 3. ����ƣѿ��<
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
            
            // 5. �˿������
            result.sanitizedInput = this.sanitizeInput(input, type);
            
            // 6.  BU�
            this.finalizeValidation(result);

        } catch (error) {
            console.error('[InputValidator] <���:', error);
            result.isValid = false;
            result.errors.push({
                type: 'VALIDATION_ERROR',
                message: `<�g���LzW~W_: ${error.message}`,
                severity: 'high'
            });
        }

        return result;
    }

    /**
     * eval�p(<��	
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
     * ��ȿ��Z�<��	
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

        // �w���ƣxn����<
        for (const prop of this.PROTECTED_PROPERTIES) {
            if (input.includes(prop)) {
                result.prototypePollutionDetected = true;
                result.warnings.push({
                    type: 'PROTECTED_PROPERTY_ACCESS',
                    message: `�w���ƣ '${prop}' xn����L�U�~W_`,
                    severity: 'medium'
                });
            }
        }
    }

    /**
     * ئjXSS<��	
     */
    validateAdvancedXSS(input, result) {
        // DOM�\�#n<
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
                    message: 'DOM�\�pn(L�U�~W_',
                    severity: 'medium',
                    pattern: pattern.source
                });
            }
        }

        // ���������ns0<
        const eventHandlerPattern = /on\w+\s*=\s*['""]?[^'""]*['""]?/gi;
        const matches = input.match(eventHandlerPattern);
        if (matches) {
            result.advancedXSSDetected = true;
            result.errors.push({
                type: 'EVENT_HANDLER_XSS',
                message: 'qzj���������L�U�~W_',
                severity: 'high',
                details: matches
            });
        }
    }

    /**
     * ���ɤ󸧯���<��	
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
     * �,����ƣ<
     */
    validateBasicSecurity(input, result) {
        // NULL/undefined ��ï
        if (input === null || input === undefined) {
            result.errors.push({
                type: 'NULL_INPUT',
                message: 'e�LzgY',
                severity: 'medium'
            });
            return;
        }

        // ���ï
        if (typeof input !== 'string') {
            result.errors.push({
                type: 'INVALID_TYPE',
                message: '�W�ne�o1�U�fD~[�',
                severity: 'high'
            });
            return;
        }

        // wU��ï
        if (input.length > this.config.maxInputLength) {
            result.errors.push({
                type: 'INVALID_LENGTH',
                message: this.ERROR_MESSAGES.INVALID_LENGTH,
                severity: 'medium',
                details: ` ': ${this.config.maxInputLength}, �(: ${input.length}`
            });
        }

        // ���ǣ���ï
        if (!this.validateEncoding(input)) {
            result.errors.push({
                type: 'INVALID_ENCODING',
                message: this.ERROR_MESSAGES.INVALID_ENCODING,
                severity: 'high'
            });
        }
    }

    /**
     * ���%<
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
     * PlantUML���<
     */
    validatePlantUMLCode(input, result) {
        // PlantUML�,����ï
        if (!input.includes('@startuml') && !input.includes('@enduml')) {
            result.warnings.push({
                type: 'MISSING_PLANTUML_TAGS',
                message: 'PlantUMLn��L�dK�~[�',
                severity: 'low'
            });
        }

        // 1�W�����ï�,���	
        if (!this.SECURITY_PATTERNS.PLANTUML_SAFE_CHARS_JP.test(input)) {
            result.errors.push({
                type: 'INVALID_CHARACTERS',
                message: this.ERROR_MESSAGES.INVALID_CHARACTERS,
                severity: 'medium'
            });
        }

        // ͹����ï
        this.validateNestingDepth(input, result);
    }

    /**
     * ����<
     */
    validateActorName(input, result) {
        if (input.length > this.config.maxActorNameLength) {
            result.errors.push({
                type: 'ACTOR_NAME_TOO_LONG',
                message: `����LwYN~Y '${this.config.maxActorNameLength}�W	`,
                severity: 'medium'
            });
        }

        // ����kqz�WL+~��K��ï
        if (/[<>&"']/.test(input)) {
            result.errors.push({
                type: 'DANGEROUS_ACTOR_CHARS',
                message: '����kqzj�WL+~�fD~Y',
                severity: 'high'
            });
        }
    }

    /**
     * �����ƭ��<
     */
    validateActionText(input, result) {
        if (input.length > this.config.maxActionLength) {
            result.errors.push({
                type: 'ACTION_TOO_LONG',
                message: `�����ƭ��LwYN~Y '${this.config.maxActionLength}�W	`,
                severity: 'medium'
            });
        }
    }

    /**
     *  ,e�<
     */
    validateGeneralInput(input, result) {
        // �,�jwUfJn
        if (input.length > 1000) {
            result.warnings.push({
                type: 'LONG_INPUT',
                message: 'e�LwD_��kB�LKK���'LB�~Y',
                severity: 'low'
            });
        }
    }

    /**
     * ����ƣѿ��<
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

        // �󸧯���<
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
     * ͹��<
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
                message: `͹�L�YN~Y ': ${maxDepth}, �(: ${maxFound}	`,
                severity: 'medium'
            });
        }
    }

    /**
     * ���ǣ�<
     */
    validateEncoding(input) {
        try {
            // UTF-8���ǣ�c8'<
            const encoded = encodeURIComponent(input);
            const decoded = decodeURIComponent(encoded);
            return decoded === input;
        } catch (error) {
            return false;
        }
    }

    /**
     * e�n�˿������7H	
     */
    sanitizeInput(input, type = 'general') {
        if (typeof input !== 'string') {
            return '';
        }

        let sanitized = input;

        // DOMPurifyL)(��j4
        if (this.domPurify && this.config.enableDOMPurifyIntegration) {
            sanitized = this.domPurify.sanitize(sanitized, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
                KEEP_CONTENT: true,
                // SEC-006: ���<j-�
                FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed'],
                FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
                FORBID_ATTR: ['style', 'on*']
            });
        } else {
            // �,�jHTML�����
            sanitized = this.escapeHtml(sanitized);
        }

        // ��ȿ��Z��V
        if (this.config.enablePrototypePollutionProtection) {
            sanitized = this.sanitizePrototypePollution(sanitized);
        }

        // eval�p�V
        if (this.config.enableEvalDetection) {
            sanitized = this.sanitizeEvalFunctions(sanitized);
        }

        // ���%�˿������
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
     * ��ȿ��Zӵ˿��������	
     */
    sanitizePrototypePollution(input) {
        let sanitized = input;
        
        // qzj���ƣ�����Jd
        for (const prop of this.PROTECTED_PROPERTIES) {
            const propPattern = new RegExp(`\\b${prop}\\b`, 'gi');
            sanitized = sanitized.replace(propPattern, '');
        }
        
        // __proto__n���jJd
        sanitized = sanitized.replace(/__proto__/gi, '');
        sanitized = sanitized.replace(/\.prototype\[/gi, '');
        sanitized = sanitized.replace(/\['prototype'\]/gi, '');
        sanitized = sanitized.replace(/\["prototype"\]/gi, '');
        
        return sanitized;
    }

    /**
     * eval�p�˿��������	
     */
    sanitizeEvalFunctions(input) {
        let sanitized = input;
        
        // eval�p|s�W�Jd
        sanitized = sanitized.replace(/eval\s*\(/gi, '');
        sanitized = sanitized.replace(/Function\s*\(/gi, '');
        sanitized = sanitized.replace(/new\s+Function\s*\(/gi, '');
        
        // setTimeout/setIntervaln�W�L�6P
        sanitized = sanitized.replace(/setTimeout\s*\(\s*['"`][^'"`]*['"`]/gi, '');
        sanitized = sanitized.replace(/setInterval\s*\(\s*['"`][^'"`]*['"`]/gi, '');
        
        return sanitized;
    }

    /**
     * HTML�,�����
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            // SEC-006: �������
            .replace(/\//g, "&#x2F;")
            .replace(/`/g, "&#x60;")
            .replace(/=/g, "&#x3D;");
    }

    /**
     * PlantUML���n�˿������
     */
    sanitizePlantUMLCode(code) {
        // qzjǣ�ƣ֒Jd
        const dangerousPatterns = [
            /!include\s+[^|\s]+/gi,
            /!theme\s+[^|\s]+/gi,
            /skinparam\s+.*?(<|>|javascript|script)/gi,
            // SEC-006: ��ѿ��
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
     * ����n�˿������
     */
    sanitizeActorName(name) {
        // qz�W�Jd
        return name.replace(/[<>&"']/g, '');
    }

    /**
     * �����ƭ��n�˿������
     */
    sanitizeActionText(text) {
        // �,�jHTML�����n
        return this.escapeHtml(text);
    }

    /**
     *  B<U�
     */
    finalizeValidation(result) {
        // �}����LB�4o!�
        const criticalErrors = result.errors.filter(e => e.severity === 'critical');
        if (criticalErrors.length > 0) {
            result.isValid = false;
            result.securityLevel = 'dangerous';
        }

        // �qz����LpB�4
        const highErrors = result.errors.filter(e => e.severity === 'high');
        if (highErrors.length >= 3) {
            result.isValid = false;
            result.securityLevel = 'risky';
        }

        // ����ƣ����
        if (result.errors.length === 0) {
            result.securityLevel = 'safe';
        } else if (result.errors.some(e => e.severity === 'high')) {
            result.securityLevel = 'risky';
        } else {
            result.securityLevel = 'moderate';
        }
    }

    /**
     * �뿤�<
     */
    validateRealTime(input, type, callback) {
        if (!this.config.enableRealTimeValidation) {
            return;
        }

        // �Ц�
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            const result = this.validate(input, type);
            callback(result);
        }, 300);
    }

    /**
     * -���
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[InputValidator] -�L��U�~W_');
    }

    /**
     * ����ƣ����
     */
    generateSecurityReport(input, validationResult) {
        return {
            timestamp: new Date().toISOString(),
            inputLength: input.length,
            securityLevel: validationResult.securityLevel,
            errorsCount: validationResult.errors.length,
            warningsCount: validationResult.warnings.length,
            criticalIssues: validationResult.errors.filter(e => e.severity === 'critical'),
            // SEC-006: 7�
            evalDetected: validationResult.evalDetected,
            prototypePollutionDetected: validationResult.prototypePollutionDetected,
            advancedXSSDetected: validationResult.advancedXSSDetected,
            commandInjectionDetected: validationResult.commandInjectionDetected,
            recommendations: this.generateRecommendations(validationResult)
        };
    }

    /**
     * ����ƣ�h�
     */
    generateRecommendations(validationResult) {
        const recommendations = [];

        if (validationResult.errors.some(e => e.type === 'XSS_DETECTED')) {
            recommendations.push('XSS;�n��'LB�~Ye������WfO`UD');
        }

        if (validationResult.evalDetected) {
            recommendations.push('eval�pn(L�U�~W_Մ��ɟL�QfO`UD');
        }

        if (validationResult.prototypePollutionDetected) {
            recommendations.push('��ȿ��Z�;�n��'LB�~Y�ָ������ƣ�������WfO`UD');
        }

        if (validationResult.commandInjectionDetected) {
            recommendations.push('���ɤ󸧯���;�n��'LB�~Y�������n(�QfO`UD');
        }

        if (validationResult.errors.some(e => e.type === 'INJECTION_DETECTED')) {
            recommendations.push('�󸧯���;�n��'LB�~Yqzj�Wn(�QfO`UD');
        }

        if (validationResult.errors.some(e => e.type === 'INVALID_LENGTH')) {
            recommendations.push('e�LwYN~YijwUk�.WfO`UD');
        }

        return recommendations;
    }
}

// ���먯����
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputValidator;
} else if (typeof window !== 'undefined') {
    window.InputValidator = InputValidator;
}

console.log('[InputValidator] ����ƣ7e�<����L��~�~W_');