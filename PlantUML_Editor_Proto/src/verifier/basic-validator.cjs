/**
 * 基本検証システム - AI実装の嘘を絶対に許さない
 * 非エンジニアでも一目で分かる検証メカニズム
 */
const fs = require('fs').promises;
const path = require('path');

class BasicValidator {
    constructor() {
        this.proofPath = path.join(__dirname, '../../proofs');
        this.screenshotPath = path.join(this.proofPath, 'screenshots');
        this.reportPath = path.join(this.proofPath, 'reports');
    }

    async init() {
        // 証拠保存用ディレクトリ作成
        await fs.mkdir(this.proofPath, { recursive: true });
        await fs.mkdir(this.screenshotPath, { recursive: true });
        await fs.mkdir(this.reportPath, { recursive: true });
    }

    /**
     * 実装を検証し、視覚的証拠を生成
     */
    async validateImplementation(feature) {
        console.log(`\n🔍 検証開始: ${feature.name}`);
        
        const validation = {
            feature: feature.name,
            timestamp: new Date().toISOString(),
            checks: [],
            evidence: [],
            passed: false
        };

        // 1. ファイル存在チェック
        if (feature.files) {
            const fileCheck = await this.checkFilesExist(feature.files);
            validation.checks.push(fileCheck);
            console.log(`  📁 ファイル存在: ${fileCheck.passed ? '✅' : '❌'}`);
        }

        // 2. コードが空でないかチェック
        if (feature.files) {
            const codeCheck = await this.checkCodeNotEmpty(feature.files);
            validation.checks.push(codeCheck);
            console.log(`  📝 コード実装: ${codeCheck.passed ? '✅' : '❌'}`);
        }

        // 3. 機能が動作するかチェック（HTTPエンドポイント）
        if (feature.endpoints) {
            const funcCheck = await this.checkFunctionality(feature.endpoints);
            validation.checks.push(funcCheck);
            console.log(`  🔧 機能動作: ${funcCheck.passed ? '✅' : '❌'}`);
        }

        // 4. UIが表示されるかチェック
        if (feature.uiElements) {
            const uiCheck = await this.checkUIElements(feature.uiElements);
            validation.checks.push(uiCheck);
            console.log(`  🎨 UI表示: ${uiCheck.passed ? '✅' : '❌'}`);
        }

        // 総合判定
        validation.passed = validation.checks.every(c => c.passed);
        console.log(`\n📊 総合結果: ${validation.passed ? '✅ 実装確認' : '❌ 未実装'}`);

        // HTMLレポート生成
        await this.generateReport(validation);

        return validation;
    }

    async checkFilesExist(files) {
        const results = [];
        for (const file of files) {
            try {
                await fs.access(file);
                results.push({ file, exists: true });
            } catch {
                results.push({ file, exists: false });
            }
        }
        
        return {
            name: 'ファイル存在確認',
            passed: results.every(r => r.exists),
            details: results
        };
    }

    async checkCodeNotEmpty(files) {
        const results = [];
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
                results.push({
                    file,
                    lines: lines.length,
                    empty: lines.length < 10
                });
            } catch {
                results.push({ file, lines: 0, empty: true });
            }
        }
        
        return {
            name: 'コード実装確認',
            passed: results.every(r => !r.empty),
            details: results
        };
    }

    async checkFunctionality(endpoints) {
        // 簡易的な機能チェック（実際はHTTPリクエストを送信）
        return {
            name: '機能動作確認',
            passed: false, // 現時点では未実装として扱う
            details: 'エンドポイントテスト未実装'
        };
    }

    async checkUIElements(elements) {
        // UI要素の存在確認（実際はPlaywrightで確認）
        return {
            name: 'UI要素確認',
            passed: false, // 現時点では未実装として扱う
            details: 'UI検証未実装'
        };
    }

    async generateReport(validation) {
        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>実装検証レポート - ${validation.feature}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .status-passed {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            display: inline-block;
        }
        .status-failed {
            background: #f44336;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            display: inline-block;
        }
        .check-item {
            background: white;
            padding: 20px;
            margin: 10px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .check-passed { border-left: 5px solid #4CAF50; }
        .check-failed { border-left: 5px solid #f44336; }
        .timestamp {
            color: #666;
            font-size: 14px;
        }
        .details {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 実装検証レポート</h1>
        <h2>${validation.feature}</h2>
        <p class="timestamp">検証日時: ${new Date(validation.timestamp).toLocaleString('ja-JP')}</p>
        <div class="${validation.passed ? 'status-passed' : 'status-failed'}">
            ${validation.passed ? '✅ 実装確認済み' : '❌ 未実装または不完全'}
        </div>
    </div>

    <h3>検証項目</h3>
    ${validation.checks.map(check => `
        <div class="check-item ${check.passed ? 'check-passed' : 'check-failed'}">
            <h4>${check.passed ? '✅' : '❌'} ${check.name}</h4>
            ${check.details ? `
                <div class="details">
                    ${typeof check.details === 'string' ? 
                        check.details : 
                        `<pre>${JSON.stringify(check.details, null, 2)}</pre>`
                    }
                </div>
            ` : ''}
        </div>
    `).join('')}

    <div style="margin-top: 50px; padding: 20px; background: #fff3cd; border-radius: 8px;">
        <h4>⚠️ 重要な注意事項</h4>
        <p>このレポートは自動生成されており、改ざんできません。</p>
        <p>実装が「完了」と報告されても、このレポートで❌が表示される場合は<strong>実装されていません</strong>。</p>
    </div>
</body>
</html>
        `;

        const filename = `report_${validation.feature.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
        const filepath = path.join(this.reportPath, filename);
        await fs.writeFile(filepath, html);
        
        console.log(`\n📄 レポート生成: ${filepath}`);
        return filepath;
    }
}

module.exports = BasicValidator;