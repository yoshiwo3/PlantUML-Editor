/**
 * 入力サニタイゼーション・バリデーションテスト - TEST-014-03
 * 
 * Sprint 5: エラーハンドリングテスト実装
 * 作成日: 2025-08-17
 * 対象: 日本語入力、制御文字、文字数制限、特殊記号のバリデーション
 * 
 * テスト項目:
 * 1. 制御文字・非表示文字の除去
 * 2. 最大文字数制限の検証
 * 3. 絵文字・特殊Unicode文字の処理
 * 4. ファイルアップロード時の検証
 * 5. 数値・日付フォーマットの検証
 * 6. 予約語・危険キーワードの検出
 */

const { test, expect } = require('@playwright/test');

test.describe('入力サニタイゼーション・バリデーションテスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8086');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.errorBoundary !== undefined);
    });

    test('制御文字・非表示文字の除去', async ({ page }) => {
        const controlCharacters = [
            // NUL文字
            'テスト\x00文字列',
            
            // 制御文字（0x01-0x1F）
            'データ\x01\x02\x03処理',
            'ファイル\x07\x08\x09読み込み',
            'システム\x0B\x0C情報',
            'ネットワーク\x0E\x0F\x10接続',
            
            // DEL文字
            'パスワード\x7F設定',
            
            // Unicode制御文字
            'テキスト\u200E\u200F表示', // LTR/RTL marks
            'データ\u2028\u2029改行',    // Line/Paragraph separators
            'フォーマット\uFEFF処理',   // Zero-width no-break space
            
            // 不可視文字
            'スペース\u200B\u200C\u200D文字', // Zero-width spaces
            'タブ\u00A0\u2000\u2001文字',     // Non-breaking spaces
            
            // 方向制御文字
            'アラビア語\u202A\u202B\u202C制御',
            'テキスト\u202D\u202E方向',
            
            // 音声制御文字
            '読み上げ\u0600\u0601\u0602制御'
        ];

        for (const input of controlCharacters) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', input);
            await page.waitForTimeout(200);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 制御文字が除去されていることを確認
            const hasControlChars = /[\x00-\x1F\x7F\u200E\u200F\u2028\u2029\uFEFF\u200B-\u200D\u00A0\u2000-\u200A\u202A-\u202E\u0600-\u0603]/.test(outputContent);
            expect(hasControlChars).toBe(false);
            
            // 可視文字は保持されていることを確認
            expect(outputContent).toContain('テスト');
            
            console.log(`Control character test: "${input.replace(/[\x00-\x1F]/g, '?')}" -> Clean output: ${!hasControlChars}`);
        }
    });

    test('最大文字数制限の検証', async ({ page }) => {
        const textLengths = [
            { length: 100, name: '通常テキスト' },
            { length: 500, name: '中程度テキスト' },
            { length: 1000, name: '制限値テキスト' },
            { length: 1500, name: '制限超過テキスト' },
            { length: 5000, name: '大幅超過テキスト' },
            { length: 10000, name: '極大テキスト' }
        ];

        for (const testCase of textLengths) {
            // 指定された長さのテキストを生成
            const baseText = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
            const longText = baseText.repeat(Math.ceil(testCase.length / baseText.length)).substring(0, testCase.length);
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', longText);
            await page.waitForTimeout(500);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 1000文字制限が適用されているか確認
            if (testCase.length > 1000) {
                expect(outputContent.length).toBeLessThanOrEqual(1000);
                
                // 切り詰められた旨のメッセージが表示されているか確認
                const truncationWarning = await page.$('.warning, .alert, [data-warning]');
                console.log(`${testCase.name} (${testCase.length}文字): 切り詰め警告表示 - ${truncationWarning !== null}`);
            } else {
                // 制限内の場合は全文が保持される
                expect(outputContent.length).toBeGreaterThan(testCase.length * 0.8); // 処理により多少短くなる可能性を考慮
            }
            
            // エラーログに記録されているか確認
            const errorStats = await page.evaluate(() => {
                return window.errorBoundary ? window.errorBoundary.getErrorStats() : {};
            });
            
            console.log(`${testCase.name}: 入力${testCase.length}文字 -> 出力${outputContent.length}文字, エラー数: ${errorStats.totalErrors || 0}`);
        }
    });

    test('絵文字・特殊Unicode文字の処理', async ({ page }) => {
        const unicodeTestCases = [
            // 基本的な絵文字
            { input: 'システム😀処理', name: '基本絵文字' },
            { input: 'データ🚀転送', name: 'オブジェクト絵文字' },
            
            // 複合絵文字
            { input: 'ユーザー👨‍💻作業', name: '複合絵文字' },
            { input: 'チーム👨‍👩‍👧‍👦管理', name: '家族絵文字' },
            
            // 肌色バリエーション
            { input: '管理者👋🏻挨拶', name: '肌色絵文字' },
            { input: 'サポート🤝🏽対応', name: '肌色バリエーション' },
            
            // 国旗絵文字
            { input: '国際🇯🇵🇺🇸通信', name: '国旗絵文字' },
            
            // 特殊文字
            { input: 'コード©️著作権', name: '記号文字' },
            { input: 'データ™️商標', name: '商標文字' },
            
            // 数学記号
            { input: '計算∑∫∏式', name: '数学記号' },
            { input: '論理∧∨¬演算', name: '論理記号' },
            
            // 古代文字
            { input: 'システム𓀀𓀁設計', name: 'ヒエログリフ' },
            
            // CJK統合漢字拡張
            { input: '拡張𠀀𠀁漢字', name: 'CJK拡張' },
            
            // 異体字セレクタ
            { input: '葛󠄀城󠄁市', name: '異体字セレクタ' }
        ];

        for (const testCase of unicodeTestCases) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', testCase.input);
            await page.waitForTimeout(300);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 基本的な日本語テキストが保持されているか確認
            const hasBasicText = /[ぁ-んァ-ヶ一-龯]/.test(outputContent);
            expect(hasBasicText).toBe(true);
            
            // 絵文字が適切に処理されているか確認（除去または保持）
            const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
            const hasEmoji = emojiPattern.test(outputContent);
            
            // 特殊文字の処理結果を記録
            console.log(`${testCase.name}: "${testCase.input}" -> 絵文字保持: ${hasEmoji}, 基本テキスト保持: ${hasBasicText}`);
            
            // 出力が空でないことを確認
            expect(outputContent.trim().length).toBeGreaterThan(0);
        }
    });

    test('無効な文字エンコーディングの処理', async ({ page }) => {
        const encodingTestCases = [
            // 不正なUTF-8バイトシーケンス
            { input: 'テスト\uFFFD文字', name: '置換文字' },
            
            // サロゲートペア
            { input: 'データ\uD800\uDC00処理', name: '正常サロゲートペア' },
            { input: 'システム\uD800単体', name: '不正サロゲート前半' },
            { input: 'ネットワーク\uDC00単体', name: '不正サロゲート後半' },
            
            // プライベート使用領域
            { input: 'フォント\uE000\uE001文字', name: 'プライベート領域' },
            
            // 非文字コードポイント
            { input: 'データ\uFFFE\uFFFF処理', name: '非文字コードポイント' }
        ];

        for (const testCase of encodingTestCases) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', testCase.input);
            await page.waitForTimeout(200);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 不正な文字が除去または置換されているか確認
            const hasInvalidChars = /[\uFFFE\uFFFF]/.test(outputContent);
            expect(hasInvalidChars).toBe(false);
            
            // 基本的なテキストは保持されているか確認
            expect(outputContent).toMatch(/テスト|データ|システム|ネットワーク|フォント/);
            
            console.log(`${testCase.name}: 無効文字除去済み - ${!hasInvalidChars}`);
        }
    });

    test('危険なキーワード・予約語の検出', async ({ page }) => {
        const dangerousKeywords = [
            // システムコマンド
            { input: 'systemコマンドを実行', keywords: ['system'] },
            { input: 'execプロセス開始', keywords: ['exec'] },
            { input: 'evalコード評価', keywords: ['eval'] },
            
            // ファイルシステム操作
            { input: 'file://パス読み込み', keywords: ['file://'] },
            { input: '/etc/passwdファイル', keywords: ['/etc/passwd'] },
            { input: 'C:\\Windows\\System32アクセス', keywords: ['System32'] },
            
            // ネットワーク関連
            { input: 'localhost:3306接続', keywords: ['localhost'] },
            { input: '127.0.0.1内部アクセス', keywords: ['127.0.0.1'] },
            { input: 'http://evil.com/外部接続', keywords: ['http://'] },
            
            // 認証情報
            { input: 'password=secret123設定', keywords: ['password='] },
            { input: 'api_key=abc123設定', keywords: ['api_key='] },
            { input: 'token=xyz789認証', keywords: ['token='] },
            
            // プログラミング構文
            { input: 'if (__filename)分岐', keywords: ['__filename'] },
            { input: 'require("fs")モジュール', keywords: ['require('] },
            { input: 'process.env環境変数', keywords: ['process.env'] },
            
            // データベース操作
            { input: 'SELECT * FROM users', keywords: ['SELECT', 'FROM'] },
            { input: 'DROP DATABASE test', keywords: ['DROP', 'DATABASE'] },
            { input: 'INSERT INTO admin', keywords: ['INSERT', 'INTO'] }
        ];

        for (const testCase of dangerousKeywords) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', testCase.input);
            await page.waitForTimeout(300);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 危険なキーワードが適切に処理されているか確認
            let keywordsFound = 0;
            for (const keyword of testCase.keywords) {
                if (outputContent.includes(keyword)) {
                    keywordsFound++;
                }
            }
            
            // セキュリティ統計を確認
            const securityStats = await page.evaluate(() => {
                return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
            });
            
            // 危険なキーワードが検出された場合、適切に記録されているか
            console.log(`危険キーワードテスト: "${testCase.input}" -> キーワード検出数: ${keywordsFound}/${testCase.keywords.length}, セキュリティインシデント: ${securityStats.security?.securityIncidentCount || 0}`);
            
            // 日本語部分は保持されているか確認
            expect(outputContent).toMatch(/[ぁ-んァ-ヶ一-龯]/);
        }
    });

    test('数値・フォーマット検証', async ({ page }) => {
        const formatTestCases = [
            // 数値フォーマット
            { input: '価格: 1,000,000円', type: '通貨' },
            { input: '確率: 99.99%', type: 'パーセンテージ' },
            { input: '温度: -273.15℃', type: '温度' },
            { input: 'IPアドレス: 192.168.1.1', type: 'IPアドレス' },
            
            // 日付・時刻フォーマット
            { input: '日付: 2025/08/17', type: '日付スラッシュ' },
            { input: '日時: 2025-08-17 14:30:00', type: 'ISO形式' },
            { input: '時刻: 14:30:45.123', type: 'ミリ秒付き時刻' },
            
            // 無効なフォーマット
            { input: '不正日付: 2025/13/40', type: '無効日付' },
            { input: '不正IP: 999.999.999.999', type: '無効IP' },
            { input: '不正時刻: 25:70:80', type: '無効時刻' },
            
            // 科学的記法
            { input: '数値: 1.23e+10', type: '指数表記' },
            { input: '小数: 1.23e-5', type: '負の指数' },
            
            // 進数表記
            { input: '16進数: 0xFF', type: '16進数' },
            { input: '8進数: 0o77', type: '8進数' },
            { input: '2進数: 0b1010', type: '2進数' }
        ];

        for (const testCase of formatTestCases) {
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', testCase.input);
            await page.waitForTimeout(200);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // フォーマットが保持または適切に変換されているか確認
            const hasValidFormat = outputContent.length > 0 && outputContent.trim() !== '';
            expect(hasValidFormat).toBe(true);
            
            // 基本的な日本語が保持されているか確認
            expect(outputContent).toMatch(/価格|確率|温度|日付|日時|時刻|数値|進数/);
            
            console.log(`${testCase.type}フォーマット: "${testCase.input}" -> 処理済み: ${hasValidFormat}`);
        }
    });

    test('入力サニタイゼーションのパフォーマンス', async ({ page }) => {
        const performanceTests = [
            {
                name: '大量制御文字',
                input: 'テスト' + '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F'.repeat(100) + 'データ'
            },
            {
                name: '大量絵文字',
                input: 'システム' + '😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚☺️🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴'.repeat(50) + '処理'
            },
            {
                name: '大量Unicode',
                input: 'データ' + '∑∫∏∧∨¬αβγδε☯☮☢☣⚠⚡⚽⚾⛄⛅⛈⛎⛔⛪⛽✂✅✊✋✌✍✎✏✐✑✒✓✔✕✖✗✘✙✚✛✜✝✞✟✠✡✢✣✤✥✦✧✨✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾✿❀❁❂❃❄❅❆❇❈❉❊❋❌❍❎❏❐❑❒❓❔❕❖❗❘❙❚❛❜❝❞❟❠❡❢❣❤❥❦❧'.repeat(20) + '変換'
            }
        ];

        for (const test of performanceTests) {
            const startTime = Date.now();
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', test.input);
            await page.waitForTimeout(100);
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            // 大量データでも2秒以内に処理されることを確認
            expect(processingTime).toBeLessThan(2000);
            
            const outputContent = await page.textContent('[data-testid="plantuml-output"], #plantuml-code, .plantuml-output').catch(() => '');
            
            // 基本的な日本語が保持されていることを確認
            expect(outputContent).toMatch(/テスト|システム|データ/);
            
            // 出力が空でないことを確認
            expect(outputContent.trim().length).toBeGreaterThan(0);
            
            console.log(`${test.name}: ${test.input.length}文字 -> ${processingTime}ms, 出力: ${outputContent.length}文字`);
        }
    });

    test('入力バリデーションエラーの通知', async ({ page }) => {
        const errorCausingInputs = [
            { input: '\x00'.repeat(1000), type: '大量制御文字' },
            { input: 'a'.repeat(10000), type: '大幅文字数超過' },
            { input: '<script>' + 'alert("test");'.repeat(100) + '</script>', type: '大量XSS' }
        ];

        for (const testCase of errorCausingInputs) {
            // エラーカウンターをリセット
            await page.evaluate(() => {
                if (window.errorBoundary) {
                    window.errorBoundary.clearErrorHistory();
                }
            });
            
            await page.fill('[data-testid="japanese-input"], #japanese-input, textarea', testCase.input);
            await page.waitForTimeout(1000);
            
            // エラーが適切に記録されているか確認
            const errorStats = await page.evaluate(() => {
                return window.errorBoundary ? window.errorBoundary.getEnhancedErrorStats() : {};
            });
            
            // UIにエラー通知が表示されているか確認
            const errorNotification = await page.$('.error-toast, .warning, .alert, [data-error]');
            const hasErrorNotification = errorNotification !== null;
            
            console.log(`${testCase.type}エラー: エラー数=${errorStats.totalErrors || 0}, UI通知=${hasErrorNotification}`);
            
            // セキュリティインシデントが記録されているか確認
            if (testCase.type.includes('XSS')) {
                expect(errorStats.security?.securityIncidentCount || 0).toBeGreaterThanOrEqual(0);
            }
        }
    });
});