/**
 * PlantUML�ǣ�� ����ƣ7
 * ����ƣƹȹ��� - SEC-006��
 * 
 * _�:
 * - XSS;�ƹ�
 * - SQL�󸧯���ƹ�
 * - ���ɤ󸧯���ƹ�
 * - CSP<ƹ�
 * - e�<ƹ�
 * - ��������ƹ�
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

        // ƹ�P�n<
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

        // XSS;�ڤ���
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

        // SQL�󸧯���ڤ���
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

        // ���ɤ󸧯���ڤ���
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
     * ƹȹ���n
     */
    initializeTestSuite() {
        console.log('[SecurityTestSuite] ����ƣƹȹ��Ȓ-...');
        
        // Łj����ƣ����n��
        this.checkSecurityModules();
        
        console.log('[SecurityTestSuite] ����ƣƹȹ�����');
    }

    /**
     * ����ƣ����nX(��
     */
    checkSecurityModules() {
        const requiredModules = ['InputValidator', 'OutputEscaper', 'SQLInjectionProtector', 'CommandInjectionProtector', 'CSPManager'];
        
        for (const moduleName of requiredModules) {
            if (typeof window !== 'undefined' && !window[moduleName]) {
                this.addTestResult('module-check', `${moduleName}����L�dK�~[�`, false, 'high');
            } else {
                this.addTestResult('module-check', `${moduleName}����L)(��`, true);
            }
        }
    }

    /**
     * h����ƣƹ�n�L
     */
    async runAllTests() {
        console.log('[SecurityTestSuite] h����ƣƹȒ��...');
        
        this.resetTestResults();

        try {
            // XSSƹ�
            if (this.config.enableXSSTests) {
                await this.runXSSTests();
            }

            // SQL�󸧯���ƹ�
            if (this.config.enableSQLTests) {
                await this.runSQLInjectionTests();
            }

            // ���ɤ󸧯���ƹ�
            if (this.config.enableCommandTests) {
                await this.runCommandInjectionTests();
            }

            // CSPƹ�
            if (this.config.enableCSPTests) {
                await this.runCSPTests();
            }

            // e�<ƹ�
            if (this.config.enableInputTests) {
                await this.runInputValidationTests();
            }

            // ��������ƹ�
            if (this.config.enablePenetrationTests) {
                await this.runPenetrationTests();
            }

            this.calculateSummary();
            
            if (this.config.generateReport) {
                this.generateSecurityReport();
            }

        } catch (error) {
            console.error('[SecurityTestSuite] ƹȟL���:', error);
            this.addTestResult('test-execution', `ƹȟL���: ${error.message}`, false, 'critical');
        }

        console.log('[SecurityTestSuite] h����ƣƹȌ�');
        return this.testResults;
    }

    /**
     * XSS;�ƹ�n�L
     */
    async runXSSTests() {
        console.log('[SecurityTestSuite] XSS;�ƹȒ�L-...');

        for (let i = 0; i < this.XSS_PAYLOADS.length; i++) {
            const payload = this.XSS_PAYLOADS[i];
            
            try {
                // InputValidatornƹ�
                if (typeof window !== 'undefined' && window.InputValidator) {
                    const validator = new window.InputValidator();
                    const result = validator.validate(payload, 'plantuml');
                    
                    if (result.isValid || result.securityLevel === 'safe') {
                        this.addTestResult('xss-test', `XSSڤ���L�U�~[�gW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('xss-test', `XSSڤ���Lc8k�U�~W_: ${payload.substring(0, 20)}...`, true);
                    }
                }

                // OutputEscapernƹ�
                if (typeof window !== 'undefined' && window.OutputEscaper) {
                    const escaper = new window.OutputEscaper();
                    const escapeResult = escaper.escape(payload, 'html');
                    
                    // �����Li(U�fD�K��ï
                    if (escapeResult.escaped === payload) {
                        this.addTestResult('xss-escape', `XSSڤ���L�����U�~[�gW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('xss-escape', `XSSڤ���Lc8k�����U�~W_`, true);
                    }
                }

                // DOM�\ƹ�
                await this.testDOMXSS(payload);

            } catch (error) {
                this.addTestResult('xss-test', `XSSƹȨ��: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * DOM XSS ƹ�
     */
    async testDOMXSS(payload) {
        if (typeof document === 'undefined') return;

        try {
            // ƹ�(nDOM� �\
            const testElement = document.createElement('div');
            testElement.id = 'xss-test-element';
            testElement.style.display = 'none';
            document.body.appendChild(testElement);

            // XSSڤ���n�e�fL
            testElement.innerHTML = payload;

            // �����L�LU�_K��ï
            const scripts = testElement.querySelectorAll('script');
            if (scripts.length > 0) {
                this.addTestResult('dom-xss', `DOM XSSn1'��: ${payload}`, false, 'critical');
            } else {
                this.addTestResult('dom-xss', `DOM XSS;�Lik��ïU�~W_`, true);
            }

            // ƹȁ �Jd
            document.body.removeChild(testElement);

        } catch (error) {
            this.addTestResult('dom-xss', `DOM XSSƹȨ��: ${error.message}`, false, 'medium');
        }
    }

    /**
     * SQL�󸧯���ƹ�n�L
     */
    async runSQLInjectionTests() {
        console.log('[SecurityTestSuite] SQL�󸧯���ƹȒ�L-...');

        for (const payload of this.SQL_PAYLOADS) {
            try {
                if (typeof window !== 'undefined' && window.SQLInjectionProtector) {
                    const protector = new window.SQLInjectionProtector();
                    const result = protector.validateQuery(payload);
                    
                    if (result.isSafe || result.securityLevel === 'safe') {
                        this.addTestResult('sql-injection', `SQL�󸧯���ڤ���L�U�~[�gW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('sql-injection', `SQL�󸧯���ڤ���Lc8k�U�~W_: ${payload.substring(0, 20)}...`, true);
                    }
                }
            } catch (error) {
                this.addTestResult('sql-injection', `SQL�󸧯���ƹȨ��: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * ���ɤ󸧯���ƹ�n�L
     */
    async runCommandInjectionTests() {
        console.log('[SecurityTestSuite] ���ɤ󸧯���ƹȒ�L-...');

        for (const payload of this.COMMAND_PAYLOADS) {
            try {
                if (typeof window !== 'undefined' && window.CommandInjectionProtector) {
                    const protector = new window.CommandInjectionProtector();
                    const result = protector.validateCommand(payload);
                    
                    if (result.isSafe || result.allowedForExecution) {
                        this.addTestResult('command-injection', `���ɤ󸧯���ڤ���L�U�~[�gW_: ${payload}`, false, 'high');
                    } else {
                        this.addTestResult('command-injection', `���ɤ󸧯���ڤ���Lc8k�U�~W_: ${payload.substring(0, 20)}...`, true);
                    }
                }
            } catch (error) {
                this.addTestResult('command-injection', `���ɤ󸧯���ƹȨ��: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * CSPƹ�n�L
     */
    async runCSPTests() {
        console.log('[SecurityTestSuite] CSPƹȒ�L-...');

        try {
            if (typeof window !== 'undefined' && window.CSPManager) {
                const cspManager = new window.CSPManager({ securityLevel: 'strict' });
                
                // CSP����nƹ�
                const policyString = cspManager.generateHeaderString();
                if (policyString && policyString.length > 0) {
                    this.addTestResult('csp-generation', 'CSP���Lc8kU�~W_', true);
                } else {
                    this.addTestResult('csp-generation', 'CSP���nk1WW~W_', false, 'high');
                }

                // CSP���n<ƹ�
                const validation = cspManager.validatePolicy();
                if (validation.securityScore >= 80) {
                    this.addTestResult('csp-validation', `CSP����ƣ���: ${validation.securityScore}`, true);
                } else {
                    this.addTestResult('csp-validation', `CSP����ƣ���LND: ${validation.securityScore}`, false, 'medium');
                }

                // unsafe-�n�ƹ�
                const currentPolicy = cspManager.currentPolicy;
                let hasUnsafeSettings = false;
                for (const sources of Object.values(currentPolicy)) {
                    if (sources.includes("'unsafe-eval'") || sources.includes("'unsafe-inline'")) {
                        hasUnsafeSettings = true;
                        break;
                    }
                }

                if (hasUnsafeSettings) {
                    this.addTestResult('csp-unsafe', 'CSPk�hgjD-�L+~�fD~Y', false, 'medium');
                } else {
                    this.addTestResult('csp-unsafe', 'CSPk�hgjD-�o+~�fD~[�', true);
                }
            }
        } catch (error) {
            this.addTestResult('csp-test', `CSPƹȨ��: ${error.message}`, false, 'medium');
        }
    }

    /**
     * e�<ƹ�n�L
     */
    async runInputValidationTests() {
        console.log('[SecurityTestSuite] e�<ƹȒ�L-...');

        const testCases = [
            { input: '', type: 'empty', expected: false },
            { input: 'A'.repeat(100000), type: 'long', expected: false },
            { input: '\x00\x01\x02', type: 'control-chars', expected: false },
            { input: 'normal text', type: 'normal', expected: true },
            { input: '�,�ƭ��', type: 'japanese', expected: true },
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
                        `e�<ƹ� (${testCase.type}): ${passed ? '�' : '1W'}`, 
                        passed, severity);
                }
            } catch (error) {
                this.addTestResult('input-validation', `e�<ƹȨ��: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * ��������ƹ�n�L
     */
    async runPenetrationTests() {
        console.log('[SecurityTestSuite] ��������ƹȒ�L-...');

        // ա�������;�ƹ�
        await this.testFileUploadAttacks();
        
        // CSRF;�ƹ�
        await this.testCSRFAttacks();
        
        // �÷��;�ƹ�
        await this.testSessionAttacks();
        
        // ѹ������;�ƹ�
        await this.testPathTraversalAttacks();
    }

    /**
     * ա�������;�ƹ�
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
                // ա��n<ƹ�
                const isValidFilename = this.validateFilename(filename);
                if (isValidFilename) {
                    this.addTestResult('file-upload', `qzjա��L1�U�~W_: ${filename}`, false, 'high');
                } else {
                    this.addTestResult('file-upload', `qzjա��Lik��ïU�~W_: ${filename}`, true);
                }
            } catch (error) {
                this.addTestResult('file-upload', `ա�������ƹȨ��: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * CSRF;�ƹ�
     */
    async testCSRFAttacks() {
        try {
            // CSRF����nX(��
            const hasCSRFToken = this.checkCSRFProtection();
            if (hasCSRFToken) {
                this.addTestResult('csrf-protection', 'CSRF����L��U�fD~Y', true);
            } else {
                this.addTestResult('csrf-protection', 'CSRF����L��U�fD~[�', false, 'high');
            }
        } catch (error) {
            this.addTestResult('csrf-test', `CSRFƹȨ��: ${error.message}`, false, 'medium');
        }
    }

    /**
     * �÷��;�ƹ�
     */
    async testSessionAttacks() {
        try {
            // �÷��-�n��
            const sessionSecurity = this.checkSessionSecurity();
            if (sessionSecurity.secure) {
                this.addTestResult('session-security', '�÷��Lik-�U�fD~Y', true);
            } else {
                this.addTestResult('session-security', '�÷��-�kOLLB�~Y', false, 'medium');
            }
        } catch (error) {
            this.addTestResult('session-test', `�÷��ƹȨ��: ${error.message}`, false, 'medium');
        }
    }

    /**
     * ѹ������;�ƹ�
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
                    this.addTestResult('path-traversal', `ѹ������;�Lik��ïU�~W_: ${payload}`, true);
                } else {
                    this.addTestResult('path-traversal', `ѹ������;�L��ïU�~[�gW_: ${payload}`, false, 'high');
                }
            } catch (error) {
                this.addTestResult('path-traversal', `ѹ������ƹȨ��: ${error.message}`, false, 'medium');
            }
        }
    }

    /**
     * ������ɤ
     */

    /**
     * ա��n<
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
     * CSRF�wn��
     */
    checkCSRFProtection() {
        if (typeof window !== 'undefined') {
            return !!(window.csrfToken || document.querySelector('meta[name="csrf-token"]'));
        }
        return false;
    }

    /**
     * �÷����ƣn��
     */
    checkSessionSecurity() {
        // Cookien-���
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
     * ѹ������ƹ�
     */
    testPathTraversal(payload) {
        // qzjѿ��n�
        const dangerousPatterns = [/\.\./, /\/etc\//, /\\windows\\system32\\/i];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(payload)) {
                return true; // ��ïU�_
            }
        }
        
        return false; // ��ïU�fDjD
    }

    /**
     * ƹ�P�n��
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
     * ƹ�P�n���
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
     * ����n�
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
     * ����ƣ����n
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

        console.log('[SecurityTestSuite] ����ƣ���ȒW~W_');
        return report;
    }

    /**
     * ����ƣ���n�
     */
    calculateSecurityScore() {
        const total = this.testResults.summary.total;
        const passed = this.testResults.summary.passed;
        const vulnerabilities = this.testResults.summary.vulnerabilities;
        
        if (total === 0) return 0;
        
        let score = (passed / total) * 100;
        
        // 1'k�����ƣ
        score -= vulnerabilities * 10;
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * �h�n
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.testResults.vulnerabilities.length > 0) {
            recommendations.push('�'j1'Lz�U�~W_�ak�cWfO`UD');
        }
        
        if (this.testResults.warnings.length > 5) {
            recommendations.push('pnfJLzWfD~Y����ƣ-����WfO`UD');
        }
        
        const securityScore = this.calculateSecurityScore();
        if (securityScore < 70) {
            recommendations.push('����ƣ���LNDgY�j����ƣ7���WfO`UD');
        }
        
        return recommendations;
    }

    /**
     * ƹ�P�n֗
     */
    getTestResults() {
        return this.testResults;
    }
}

// ����먯����
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityTestSuite;
} else if (typeof window !== 'undefined') {
    window.SecurityTestSuite = SecurityTestSuite;
}

console.log('[SecurityTestSuite] ����ƣƹȹ���L��~�~W_');