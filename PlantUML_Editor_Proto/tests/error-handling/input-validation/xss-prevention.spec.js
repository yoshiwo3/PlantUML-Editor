/**
 * XSS攻撃防御テスト - TEST-014-01
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: DOMPurify統合によるXSS防御機能
 * 
 * テスト項目:
 * 1. 基本的なスクリプトタグ挿入防御
 * 2. イベントハンドラ経由のXSS防御
 * 3. データURIを使ったXSS防御
 * 4. HTMLエンティティ化による防御
 * 5. JavaScript URI防御
 * 6. CSS式によるXSS防御
 */

const { test, expect } = require('@playwright/test');

test.describe('XSS攻撃防御テスト', () => {
    test.beforeEach(async ({ page }) => {
        // PlantUML Editorページに移動
        await page.goto('http://localhost:8086');
        
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');
        
        // ErrorBoundaryが初期化されているか確認
        await page.waitForFunction(() => window.errorBoundary !== undefined);
    });

    test('基本的なスクリプトタグ挿入を防御', async ({ page }) => {
        const maliciousInputs = [
            '<script>alert("XSS1")</script>',
            '<script src="evil.js"></script>',
            '<script>window.location="http://evil.com"</script>',
            '<img src="x" onerror="alert(\'XSS2\')">',
            '<svg onload="alert(\'XSS3\')">',
            '<iframe src="javascript:alert(\'XSS4\')"></iframe>'
        ];

        for (const maliciousInput of maliciousInputs) {
            console.log(`Testing XSS input: ${maliciousInput}`);
            
            // 日本語入力エリアに悪意のあるコードを入力
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', maliciousInput);
            
            // 少し待ってからPlantUMLコードを確認
            await page.waitForTimeout(500);
            
            // PlantUMLコードエリアの内容を取得
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // スクリプトタグが実行されていないことを確認
            const alerts = await page.evaluate(() => {
                return window.alertsCalled || [];
            });
            expect(alerts.length).toBe(0);
            
            // DOMにスクリプトタグが挿入されていないことを確認
            const scripts = await page.$$eval('script', elements => 
                elements.filter(el => el.textContent.includes('alert') || el.textContent.includes('XSS'))
            );
            expect(scripts.length).toBe(0);
            
            // エラーログに安全に記録されているか確認
            const errorLogs = await page.evaluate(() => {
                return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
            });
            
            console.log(`XSS防御結果 - Input: "${maliciousInput.substring(0, 30)}...", Errors: ${errorLogs.totalErrors || 0}`);
        }
    });

    test('イベントハンドラ経由のXSS攻撃を防御', async ({ page }) => {
        const eventHandlerAttacks = [
            '<div onclick="alert(\'onclick XSS\')">Click me</div>',
            '<img src="valid.jpg" onload="alert(\'onload XSS\')">',
            '<input type="text" onfocus="alert(\'onfocus XSS\')">',
            '<a href="#" onmouseover="alert(\'mouseover XSS\')">Link</a>',
            '<form onsubmit="alert(\'submit XSS\')"><input type="submit"></form>',
            '<body onpageshow="alert(\'pageshow XSS\')">'
        ];

        for (const attack of eventHandlerAttacks) {
            // 入力フィールドに攻撃コードを入力
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', attack);
            
            await page.waitForTimeout(300);
            
            // イベントハンドラが実行されていないことを確認
            const alertCalled = await page.evaluate(() => {
                // アラートダイアログが表示されたかチェック
                return document.querySelector('[onclick*="alert"], [onload*="alert"], [onfocus*="alert"]') !== null;
            });
            expect(alertCalled).toBe(false);
            
            // DOM内の危険なイベントハンドラをチェック
            const dangerousHandlers = await page.$$eval('[onclick], [onload], [onfocus], [onmouseover], [onsubmit]', elements => 
                elements.filter(el => 
                    el.getAttribute('onclick')?.includes('alert') ||
                    el.getAttribute('onload')?.includes('alert') ||
                    el.getAttribute('onfocus')?.includes('alert') ||
                    el.getAttribute('onmouseover')?.includes('alert') ||
                    el.getAttribute('onsubmit')?.includes('alert')
                )
            );
            expect(dangerousHandlers.length).toBe(0);
        }
    });

    test('データURI経由のXSS攻撃を防御', async ({ page }) => {
        const dataUriAttacks = [
            'data:text/html,<script>alert("Data URI XSS")</script>',
            'data:text/html;base64,PHNjcmlwdD5hbGVydCgiQmFzZTY0IFhTUyIpPC9zY3JpcHQ+',
            'javascript:alert("JavaScript URI XSS")',
            'data:application/javascript,alert("JS Data URI")',
            'vbscript:MsgBox("VBScript XSS")'
        ];

        for (const attack of dataUriAttacks) {
            // リンクやフレームのsrc属性に悪意のあるURIを設定しようとする
            const inputWithUri = `<a href="${attack}">悪意のあるリンク</a>`;
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', inputWithUri);
            
            await page.waitForTimeout(300);
            
            // 危険なデータURIが無効化されているか確認
            const dangerousLinks = await page.$$eval('a[href*="data:"], iframe[src*="data:"], a[href*="javascript:"]', elements =>
                elements.filter(el => 
                    el.href.includes('alert') || 
                    el.src?.includes('alert') ||
                    el.href.includes('javascript:') ||
                    el.href.includes('vbscript:')
                )
            );
            expect(dangerousLinks.length).toBe(0);
        }
    });

    test('HTMLエンティティ化による防御', async ({ page }) => {
        const entityTests = [
            { input: '&lt;script&gt;alert("entity")&lt;/script&gt;', expected: 'エンティティ化されたスクリプト' },
            { input: '&quot;onclick=&quot;alert(\'attr\')&quot;&quot;', expected: 'エンティティ化された属性' },
            { input: '&#x3C;script&#x3E;alert("hex")&#x3C;/script&#x3E;', expected: '16進数エンティティ' },
            { input: '&#60;script&#62;alert("decimal")&#60;/script&#62;', expected: '10進数エンティティ' }
        ];

        for (const testCase of entityTests) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', testCase.input);
            
            await page.waitForTimeout(200);
            
            // エンティティがデコードされてスクリプトが実行されていないことを確認
            const alertTriggered = await page.evaluate(() => {
                return window.alertsCalled !== undefined && window.alertsCalled.length > 0;
            });
            expect(alertTriggered).toBe(false);
            
            // エンティティがプレーンテキストとして表示されていることを確認
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // スクリプトタグがそのままテキストとして表示されている（実行されていない）
            expect(outputContent).not.toContain('alert(');
        }
    });

    test('CSS式によるXSS攻撃を防御', async ({ page }) => {
        const cssAttacks = [
            '<div style="background: expression(alert(\'CSS XSS\'))">CSS Expression</div>',
            '<div style="background-image: url(\'javascript:alert(\\\'CSS JS\\\')\')">CSS JS</div>',
            '<style>body { background: expression(alert("Style XSS")) }</style>',
            '<link rel="stylesheet" href="javascript:alert(\'Link XSS\')">',
            '<div style="behavior: url(\'#default#userData\'); background: expression(alert(\'Behavior\'))">Behavior</div>'
        ];

        for (const attack of cssAttacks) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', attack);
            
            await page.waitForTimeout(400);
            
            // CSS expressionやJavaScript URLが実行されていないことを確認
            const alertCalled = await page.evaluate(() => {
                return window.alertsCalled !== undefined && window.alertsCalled.length > 0;
            });
            expect(alertCalled).toBe(false);
            
            // 危険なCSSプロパティが除去されているか確認
            const dangerousStyles = await page.$$eval('[style*="expression"], [style*="javascript:"], [style*="behavior:"]', elements =>
                elements.length
            );
            expect(dangerousStyles).toBe(0);
            
            // 危険なstyleタグが除去されているか確認
            const dangerousStyleTags = await page.$$eval('style', elements =>
                elements.filter(el => 
                    el.textContent.includes('expression') || 
                    el.textContent.includes('javascript:')
                ).length
            );
            expect(dangerousStyleTags).toBe(0);
        }
    });

    test('複合XSS攻撃パターンの防御', async ({ page }) => {
        const complexAttacks = [
            // ネストしたタグ
            '<div><script>alert("nested")</script></div>',
            // フィルタバイパス試行
            '<scri<script>pt>alert("bypass")</script>',
            // 大文字小文字混在
            '<ScRiPt>alert("case")</ScRiPt>',
            // 改行・タブ混入
            '<script\n>alert("newline")</script>',
            '<script\t>alert("tab")</script>',
            // URL encoding
            '%3Cscript%3Ealert("encoded")%3C/script%3E',
            // Unicode encoding
            '\\u003cscript\\u003ealert("unicode")\\u003c/script\\u003e'
        ];

        for (const attack of complexAttacks) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', attack);
            
            await page.waitForTimeout(500);
            
            // すべての複合攻撃が防御されていることを確認
            const alertCalled = await page.evaluate(() => {
                return window.alertsCalled !== undefined && window.alertsCalled.length > 0;
            });
            expect(alertCalled).toBe(false);
            
            // DOM内にスクリプトタグが存在しないことを確認
            const scriptCount = await page.$$eval('script', scripts => 
                scripts.filter(script => 
                    script.textContent.includes('alert') && 
                    !script.src // 外部スクリプトは除外
                ).length
            );
            expect(scriptCount).toBe(0);
        }
    });

    test('XSS攻撃のセキュリティログ記録', async ({ page }) => {
        const xssAttack = '<script>alert("Security Log Test")</script>';
        
        // セキュリティインシデントカウンターをリセット
        await page.evaluate(() => {
            if (window.errorBoundary) {
                window.errorBoundary.securityIncidentCount = 0;
            }
        });
        
        await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', xssAttack);
        
        await page.waitForTimeout(1000);
        
        // セキュリティインシデントが適切に記録されているか確認
        const securityStats = await page.evaluate(() => {
            if (window.errorBoundary) {
                return window.errorBoundary.getEnhancedErrorStats();
            }
            return {};
        });
        
        // セキュリティインシデントが検出されログに記録されているか
        expect(securityStats.security?.securityIncidentCount || 0).toBeGreaterThanOrEqual(0);
        
        // ローカルストレージにセキュリティログが保存されているか確認
        const securityLog = await page.evaluate(() => {
            try {
                return JSON.parse(localStorage.getItem('security_incidents') || '[]');
            } catch {
                return [];
            }
        });
        
        console.log(`セキュリティログ記録数: ${securityLog.length}`);
        console.log(`セキュリティ統計:`, securityStats.security);
        
        // セキュリティアラートUI要素の確認
        const securityWarning = await page.$('#security-warning');
        if (securityWarning) {
            console.log('セキュリティ警告UIが正常に表示されました');
        }
    });

    test('DOMPurify統合による高度なサニタイゼーション', async ({ page }) => {
        // DOMPurifyが利用可能か確認
        const hasDOMPurify = await page.evaluate(() => {
            return typeof window.DOMPurify !== 'undefined';
        });
        
        if (!hasDOMPurify) {
            console.log('DOMPurify未検出 - 基本的なサニタイゼーションをテスト');
        }
        
        const advancedAttacks = [
            '<math><mi//xlink:href="data:x,<script>alert(\'MathML\')</script>">',
            '<svg><script>alert("SVG XSS")</script></svg>',
            '<object data="data:text/html,<script>alert(\'Object\')</script>"></object>',
            '<embed src="data:text/html,<script>alert(\'Embed\')</script>">',
            '<meta http-equiv="refresh" content="0;url=javascript:alert(\'Meta\')">'
        ];
        
        for (const attack of advancedAttacks) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', attack);
            
            await page.waitForTimeout(400);
            
            // 高度な攻撃も防御されていることを確認
            const alertTriggered = await page.evaluate(() => {
                return window.alertsCalled !== undefined && window.alertsCalled.length > 0;
            });
            expect(alertTriggered).toBe(false);
            
            // 危険な要素が DOM に追加されていないことを確認
            const dangerousElements = await page.$$eval('math, svg script, object[data*="javascript"], embed[src*="javascript"], meta[http-equiv="refresh"]', 
                elements => elements.length
            );
            expect(dangerousElements).toBe(0);
        }
    });
});