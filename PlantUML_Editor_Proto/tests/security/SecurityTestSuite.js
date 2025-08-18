/**
 * PlantUML®«£ø¸ ª≠ÂÍ∆£7
 * ª≠ÂÍ∆£∆π»π§¸» - SEC-006˛‹
 * 
 * _˝:
 * - XSS;É∆π»
 * - SQL§Û∏ßØ∑ÁÛ∆π»
 * - ≥ﬁÛ…§Û∏ßØ∑ÁÛ∆π»
 * - CSP<∆π»
 * - eõ<∆π»
 * - ⁄Õ»Ï¸∑ÁÛ∆π»
 */

class SecurityTestSuite {
    constructor(config = {}) {
        this.config = {
            enableXSSTests: config.enableXSSTests !== false,
            enableSQLTests: config.enableSQLTests !== false,
            enableCommandTests: config.enableCommandTests !== false,
            enableCSPTests: config.enableCSPTests !== false,
            enableInputTests: config.enableInputTests !== false,
            enablePenetrationTests: config.enablePenetrationTests !== false,
            testTimeout: config.testTimeout || 5000,
            verboseOutput: config.verboseOutput || false,
            generateReport: config.generateReport !== false,
            ...config
        };

        // ∆π»Pún<
        this.testResults = {
            passed: [],
            failed: [],
            warnings: [],
            vulnerabilities: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                vulnerabilities: 0
            }
        };

        // XSS;É⁄§Ì¸…
        this.XSS_PAYLOADS = [
            '<script>alert("XSS")</script>',
            '<img src="x" onerror="alert(\'XSS\')">',
            '<svg/onload=alert("XSS")>',
            'javascript:alert("XSS")',
            '<iframe src="javascript:alert(\'XSS\')"></iframe>',
            '<body onload="alert(\'XSS\')">',
            '<div onclick="alert(\'XSS\')">Click me</div>',
            '<input type="text" value="XSS" onfocus="alert(\'XSS\')" autofocus>',
            '<marquee onstart="alert(\'XSS\')">XSS</marquee>',
            '<details open ontoggle="alert(\'XSS\')">XSS</details>'
        ];

        // SQL§Û∏ßØ∑ÁÛ⁄§Ì¸…
        this.SQL_PAYLOADS = [
            "' OR '1'='1",
            "' OR 1=1 --",
            "' UNION SELECT null, version() --",
            "' DROP TABLE users --",
            "1; DELETE FROM users --",
            "' OR 1=1 /*",
            "admin'--",
            "' OR 'a'='a",
            "1' OR '1'='1' /*",
            "'; INSERT INTO users VALUES('hacker', 'password') --"
        ];

        // ≥ﬁÛ…§Û∏ßØ∑ÁÛ⁄§Ì¸…
        this.COMMAND_PAYLOADS = [
            "; ls -la",
            "& dir",
            "| whoami",
            "; cat /etc/passwd",
            "& type C:\\Windows\\System32\\config\\sam",
            "`id`",
            "$(whoami)",
            "; rm -rf /",
            "& del /F /S /Q C:\\",
            "| nc -l 4444"
        ];

        this.initializeTestSuite();
    }

    /**
     * ∆π»π§¸»n
     */
    initializeTestSuite() {
        console.log('[SecurityTestSuite] ª≠ÂÍ∆£∆π»π§¸»í-...');
        
        // ≈Åjª≠ÂÍ∆£‚∏Â¸În∫ç
        this.checkSecurityModules();
        
        console.log('[SecurityTestSuite] ª≠ÂÍ∆£∆π»π§¸»åÜ');
    }

    /**
     * ª≠ÂÍ∆£‚∏Â¸ÎnX(∫ç
     */
    checkSecurityModules() {
        const requiredModules = ['InputValidator', 'OutputEscaper', 'SQLInjectionProtector', 'CommandInjectionProtector', 'CSPManager'];
        
        for (const moduleName of requiredModules) {
            if (typeof window !== 'undefined' && !window[moduleName]) {
                this.addTestResult('module-check', `${moduleName}‚∏Â¸ÎLãdKä~[ì`, false, 'high');
            } else {
                this.addTestResult('module-check', `${moduleName}‚∏Â¸ÎL)(Ô˝`, true);
            }
        }
    }

    /**
     * hª≠ÂÍ∆£∆π»nüL
     */
    async runAllTests() {
        console.log('[SecurityTestSuite] hª≠ÂÍ∆£∆π»íãÀ...');
        
        this.resetTestResults();

        try {
            // XSS∆π»
            if (this.config.enableXSSTests) {
                await this.runXSSTests();
            }

            // SQL§Û∏ßØ∑ÁÛ∆π»
            if (this.config.enableSQLTests) {
                await this.runSQLInjectionTests();
            }

            // ≥ﬁÛ…§Û∏ßØ∑ÁÛ∆π»
            if (this.config.enableCommandTests) {
                await this.runCommandInjectionTests();
            }

            // CSP∆π»
            if (this.config.enableCSPTests) {
                await this.runCSPTests();
            }

            // eõ<∆π»
            if (this.config.enableInputTests) {
                await this.runInputValidationTests();
            }

            // ⁄Õ»Ï¸∑ÁÛ∆π»
            if (this.config.enablePenetrationTests) {
                await this.runPenetrationTests();
            }

            this.calculateSummary();
            
            if (this.config.generateReport) {
                this.generateSecurityReport();
            }

        } catch (error) {
            console.error('[SecurityTestSuite] ∆π»üL®È¸:', error);
            this.addTestResult('test-execution', `∆π»üL®È¸: ${error.message}`, false, 'critical');
        }

        console.log('[SecurityTestSuite] hª≠ÂÍ∆£∆π»åÜ');
        return this.testResults;
    }

    /**
     * XSS;É∆π»nüL
     */
    async runXSSTests() {
        console.log('[SecurityTestSuite] XSS;É∆π»íüL-...');

        for (let i = 0; i < this.XSS_PAYLOADS.length; i++) {
            const payload = this.XSS_PAYLOADS[i];
            
            try {
                // InputValidatorn∆π»
                if (typeof window !== 'undefined' && window.InputValidator) {
                    const validator = new window.InputValidator();
                    const result = validator.validate(payload, 'plantuml');
                    
                    if (result.isValid || result.securityLevel === 'safe') {
                        this.addTestResult('xss-test', `XSS⁄§Ì¸…L˙Uå~[ìgW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('xss-test', `XSS⁄§Ì¸…Lc8k˙Uå~W_: ${payload.substring(0, 20)}...`, true);
                    }
                }

                // OutputEscapern∆π»
                if (typeof window !== 'undefined' && window.OutputEscaper) {
                    const escaper = new window.OutputEscaper();
                    const escapeResult = escaper.escape(payload, 'html');
                    
                    // ®π±¸◊Li(UåfDãK¡ß√Ø
                    if (escapeResult.escaped === payload) {
                        this.addTestResult('xss-escape', `XSS⁄§Ì¸…L®π±¸◊Uå~[ìgW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('xss-escape', `XSS⁄§Ì¸…Lc8k®π±¸◊Uå~W_`, true);
                    }
                }

                // DOMÕ\∆π»
                await this.testDOMXSS(payload);

            } catch (error) {
                this.addTestResult('xss-test', `XSS∆π»®È¸: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * DOM XSS ∆π»
     */
    async testDOMXSS(payload) {
        if (typeof document === 'undefined') return;

        try {
            // ∆π»(nDOMÅ í\
            const testElement = document.createElement('div');
            testElement.id = 'xss-test-element';
            testElement.style.display = 'none';
            document.body.appendChild(testElement);

            // XSS⁄§Ì¸…nËeífL
            testElement.innerHTML = payload;

            // πØÍ◊»LüLUå_K¡ß√Ø
            const scripts = testElement.querySelectorAll('script');
            if (scripts.length > 0) {
                this.addTestResult('dom-xss', `DOM XSSn1'í˙: ${payload}`, false, 'critical');
            } else {
                this.addTestResult('dom-xss', `DOM XSS;ÉLik÷Ì√ØUå~W_`, true);
            }

            // ∆π»Å íJd
            document.body.removeChild(testElement);

        } catch (error) {
            this.addTestResult('dom-xss', `DOM XSS∆π»®È¸: ${error.message}`, false, 'medium');
        }
    }

    /**
     * SQL§Û∏ßØ∑ÁÛ∆π»nüL
     */
    async runSQLInjectionTests() {
        console.log('[SecurityTestSuite] SQL§Û∏ßØ∑ÁÛ∆π»íüL-...');

        for (const payload of this.SQL_PAYLOADS) {
            try {
                if (typeof window !== 'undefined' && window.SQLInjectionProtector) {
                    const protector = new window.SQLInjectionProtector();
                    const result = protector.validateQuery(payload);
                    
                    if (result.isSafe || result.securityLevel === 'safe') {
                        this.addTestResult('sql-injection', `SQL§Û∏ßØ∑ÁÛ⁄§Ì¸…L˙Uå~[ìgW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('sql-injection', `SQL§Û∏ßØ∑ÁÛ⁄§Ì¸…Lc8k˙Uå~W_: ${payload.substring(0, 20)}...`, true);
                    }
                }
            } catch (error) {
                this.addTestResult('sql-injection', `SQL§Û∏ßØ∑ÁÛ∆π»®È¸: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * ≥ﬁÛ…§Û∏ßØ∑ÁÛ∆π»nüL
     */
    async runCommandInjectionTests() {
        console.log('[SecurityTestSuite] ≥ﬁÛ…§Û∏ßØ∑ÁÛ∆π»íüL-...');

        for (const payload of this.COMMAND_PAYLOADS) {
            try {
                if (typeof window !== 'undefined' && window.CommandInjectionProtector) {
                    const protector = new window.CommandInjectionProtector();
                    const result = protector.validateCommand(payload);
                    
                    if (result.isSafe || result.allowedForExecution) {
                        this.addTestResult('command-injection', `≥ﬁÛ…§Û∏ßØ∑ÁÛ⁄§Ì¸…L˙Uå~[ìgW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('command-injection', `≥ﬁÛ…§Û∏ßØ∑ÁÛ⁄§Ì¸…Lc8k˙Uå~W_: ${payload.substring(0, 20)}...`, true);
                    }
                }
            } catch (error) {
                this.addTestResult('command-injection', `≥ﬁÛ…§Û∏ßØ∑ÁÛ∆π»®È¸: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * CSP∆π»nüL
     */
    async runCSPTests() {
        console.log('[SecurityTestSuite] CSP∆π»íüL-...');

        try {
            if (typeof window !== 'undefined' && window.CSPManager) {
                const cspManager = new window.CSPManager({ securityLevel: 'strict' });
                
                // CSPÿ√¿¸n∆π»
                const policyString = cspManager.generateHeaderString();
                if (policyString && policyString.length > 0) {
                    this.addTestResult('csp-generation', 'CSP›Í∑¸Lc8kUå~W_', true);
                } else {
                    this.addTestResult('csp-generation', 'CSP›Í∑¸nk1WW~W_', false, 'high');
                }

                // CSP›Í∑¸n<∆π»
                const validation = cspManager.validatePolicy();
                if (validation.securityScore >= 80) {
                    this.addTestResult('csp-validation', `CSPª≠ÂÍ∆£π≥¢: ${validation.securityScore}`, true);
                } else {
                    this.addTestResult('csp-validation', `CSPª≠ÂÍ∆£π≥¢LND: ${validation.securityScore}`, false, 'medium');
                }

                // unsafe-ön˙∆π»
                const currentPolicy = cspManager.currentPolicy;
                let hasUnsafeSettings = false;
                for (const sources of Object.values(currentPolicy)) {
                    if (sources.includes("'unsafe-eval'") || sources.includes("'unsafe-inline'")) {
                        hasUnsafeSettings = true;
                        break;
                    }
                }

                if (hasUnsafeSettings) {
                    this.addTestResult('csp-unsafe', 'CSPkâhgjD-öL+~åfD~Y', false, 'medium');
                } else {
                    this.addTestResult('csp-unsafe', 'CSPkâhgjD-öo+~åfD~[ì', true);
                }
            }
        } catch (error) {
            this.addTestResult('csp-test', `CSP∆π»®È¸: ${error.message}`, false, 'medium');
        }
    }

    /**
     * eõ<∆π»nüL
     */
    async runInputValidationTests() {
        console.log('[SecurityTestSuite] eõ<∆π»íüL-...');

        const testCases = [
            { input: '', type: 'empty', expected: false },
            { input: 'A'.repeat(100000), type: 'long', expected: false },
            { input: '\x00\x01\x02', type: 'control-chars', expected: false },
            { input: 'normal text', type: 'normal', expected: true },
            { input: 'Â,û∆≠π»', type: 'japanese', expected: true },
            { input: '<script>alert("test")</script>', type: 'html', expected: false },
            { input: 'SELECT * FROM users', type: 'sql', expected: false }
        ];

        for (const testCase of testCases) {
            try {
                if (typeof window !== 'undefined' && window.InputValidator) {
                    const validator = new window.InputValidator();
                    const result = validator.validate(testCase.input, 'general');
                    
                    const passed = (result.isValid === testCase.expected);
                    const severity = passed ? null : 'medium';
                    
                    this.addTestResult('input-validation', 
                        `eõ<∆π» (${testCase.type}): ${passed ? 'ü' : '1W'}`, 
                        passed, severity);
                }
            } catch (error) {
                this.addTestResult('input-validation', `eõ<∆π»®È¸: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * ⁄Õ»Ï¸∑ÁÛ∆π»nüL
     */
    async runPenetrationTests() {
        console.log('[SecurityTestSuite] ⁄Õ»Ï¸∑ÁÛ∆π»íüL-...');

        // ’°§Î¢√◊Ì¸…;É∆π»
        await this.testFileUploadAttacks();
        
        // CSRF;É∆π»
        await this.testCSRFAttacks();
        
        // ª√∑ÁÛ;É∆π»
        await this.testSessionAttacks();
        
        // —π»È–¸µÎ;É∆π»
        await this.testPathTraversalAttacks();
    }

    /**
     * ’°§Î¢√◊Ì¸…;É∆π»
     */
    async testFileUploadAttacks() {
        const maliciousFiles = [
            'shell.php',
            'backdoor.jsp',
            'virus.exe',
            'script.js',
            '../../etc/passwd'
        ];

        for (const filename of maliciousFiles) {
            try {
                // ’°§În<∆π»
                const isValidFilename = this.validateFilename(filename);
                if (isValidFilename) {
                    this.addTestResult('file-upload', `qzj’°§ÎL1ÔUå~W_: ${filename}`, false, 'high');
                } else {
                    this.addTestResult('file-upload', `qzj’°§ÎLik÷Ì√ØUå~W_: ${filename}`, true);
                }
            } catch (error) {
                this.addTestResult('file-upload', `’°§Î¢√◊Ì¸…∆π»®È¸: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * CSRF;É∆π»
     */
    async testCSRFAttacks() {
        try {
            // CSRF»¸ØÛnX(∫ç
            const hasCSRFToken = this.checkCSRFProtection();
            if (hasCSRFToken) {
                this.addTestResult('csrf-protection', 'CSRF»¸ØÛLü≈UåfD~Y', true);
            } else {
                this.addTestResult('csrf-protection', 'CSRF»¸ØÛLü≈UåfD~[ì', false, 'high');
            }
        } catch (error) {
            this.addTestResult('csrf-test', `CSRF∆π»®È¸: ${error.message}`, false, 'medium');
        }
    }

    /**
     * ª√∑ÁÛ;É∆π»
     */
    async testSessionAttacks() {
        try {
            // ª√∑ÁÛ-ön∫ç
            const sessionSecurity = this.checkSessionSecurity();
            if (sessionSecurity.secure) {
                this.addTestResult('session-security', 'ª√∑ÁÛLik-öUåfD~Y', true);
            } else {
                this.addTestResult('session-security', 'ª√∑ÁÛ-ökOLLBä~Y', false, 'medium');
            }
        } catch (error) {
            this.addTestResult('session-test', `ª√∑ÁÛ∆π»®È¸: ${error.message}`, false, 'medium');
        }
    }

    /**
     * —π»È–¸µÎ;É∆π»
     */
    async testPathTraversalAttacks() {
        const pathTraversalPayloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '....//....//....//etc/passwd'
        ];

        for (const payload of pathTraversalPayloads) {
            try {
                const isBlocked = this.testPathTraversal(payload);
                if (isBlocked) {
                    this.addTestResult('path-traversal', `—π»È–¸µÎ;ÉLik÷Ì√ØUå~W_: ${payload}`, true);
                } else {
                    this.addTestResult('path-traversal', `—π»È–¸µÎ;ÉL÷Ì√ØUå~[ìgW_: ${payload}`, false, 'high');
                }
            } catch (error) {
                this.addTestResult('path-traversal', `—π»È–¸µÎ∆π»®È¸: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * ÿÎ—¸·Ω√…§
     */

    /**
     * ’°§În<
     */
    validateFilename(filename) {
        const dangerousExtensions = ['.php', '.jsp', '.exe', '.bat', '.sh', '.cmd'];
        const dangerousPatterns = [/\.\./, /\//, /\\/];
        
        for (const ext of dangerousExtensions) {
            if (filename.toLowerCase().endsWith(ext)) {
                return false;
            }
        }
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(filename)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * CSRF›wn∫ç
     */
    checkCSRFProtection() {
        if (typeof window !== 'undefined') {
            return !!(window.csrfToken || document.querySelector('meta[name="csrf-token"]'));
        }
        return false;
    }

    /**
     * ª√∑ÁÛª≠ÂÍ∆£n∫ç
     */
    checkSessionSecurity() {
        // Cookien-ö∫ç
        if (typeof document !== 'undefined') {
            const cookies = document.cookie;
            const hasSecureFlag = cookies.includes('Secure');
            const hasHttpOnlyFlag = cookies.includes('HttpOnly');
            const hasSameSiteFlag = cookies.includes('SameSite');
            
            return {
                secure: hasSecureFlag && hasHttpOnlyFlag && hasSameSiteFlag,
                details: { hasSecureFlag, hasHttpOnlyFlag, hasSameSiteFlag }
            };
        }
        return { secure: false, details: {} };
    }

    /**
     * —π»È–¸µÎ∆π»
     */
    testPathTraversal(payload) {
        // qzj—ø¸Ûn˙
        const dangerousPatterns = [/\.\./, /\/etc\//, /\\windows\\system32\\/i];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(payload)) {
                return true; // ÷Ì√ØUå_
            }
        }
        
        return false; // ÷Ì√ØUåfDjD
    }

    /**
     * ∆π»Pún˝†
     */
    addTestResult(category, message, passed, severity = null) {
        const result = {
            category: category,
            message: message,
            passed: passed,
            severity: severity,
            timestamp: new Date().toISOString()
        };

        if (passed) {
            this.testResults.passed.push(result);
        } else {
            this.testResults.failed.push(result);
            
            if (severity === 'critical' || severity === 'high') {
                this.testResults.vulnerabilities.push(result);
            } else {
                this.testResults.warnings.push(result);
            }
        }

        if (this.config.verboseOutput) {
            console.log(`[SecurityTestSuite] ${passed ? '' : ''} ${message}`);
        }
    }

    /**
     * ∆π»PúnÍª√»
     */
    resetTestResults() {
        this.testResults = {
            passed: [],
            failed: [],
            warnings: [],
            vulnerabilities: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                vulnerabilities: 0
            }
        };
    }

    /**
     * µﬁÍ¸nó
     */
    calculateSummary() {
        this.testResults.summary = {
            total: this.testResults.passed.length + this.testResults.failed.length,
            passed: this.testResults.passed.length,
            failed: this.testResults.failed.length,
            warnings: this.testResults.warnings.length,
            vulnerabilities: this.testResults.vulnerabilities.length
        };
    }

    /**
     * ª≠ÂÍ∆£Ï›¸»n
     */
    generateSecurityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            testConfiguration: this.config,
            summary: this.testResults.summary,
            vulnerabilities: this.testResults.vulnerabilities,
            warnings: this.testResults.warnings,
            securityScore: this.calculateSecurityScore(),
            recommendations: this.generateRecommendations()
        };

        console.log('[SecurityTestSuite] ª≠ÂÍ∆£Ï›¸»íW~W_');
        return report;
    }

    /**
     * ª≠ÂÍ∆£π≥¢nó
     */
    calculateSecurityScore() {
        const total = this.testResults.summary.total;
        const passed = this.testResults.summary.passed;
        const vulnerabilities = this.testResults.summary.vulnerabilities;
        
        if (total === 0) return 0;
        
        let score = (passed / total) * 100;
        
        // 1'kàã⁄ Î∆£
        score -= vulnerabilities * 10;
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * ®hãn
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.testResults.vulnerabilities.length > 0) {
            recommendations.push('Õ'j1'LzãUå~W_ÙakÓcWfO`UD');
        }
        
        if (this.testResults.warnings.length > 5) {
            recommendations.push('pnfJLzWfD~Yª≠ÂÍ∆£-öíãÙWfO`UD');
        }
        
        const securityScore = this.calculateSecurityScore();
        if (securityScore < 70) {
            recommendations.push('ª≠ÂÍ∆£π≥¢LNDgYÏÑjª≠ÂÍ∆£7íüΩWfO`UD');
        }
        
        return recommendations;
    }

    /**
     * ∆π»Pún÷ó
     */
    getTestResults() {
        return this.testResults;
    }
}

// ∞Ì¸–Î®Øπ›¸»
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityTestSuite;
} else if (typeof window !== 'undefined') {
    window.SecurityTestSuite = SecurityTestSuite;
}

console.log('[SecurityTestSuite] ª≠ÂÍ∆£∆π»π§¸»L≠º~å~W_');