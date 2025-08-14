/**
 * テストファイルの構文エラー修正スクリプト
 * .cjsファイル内の不適切なrequire文とplaywright参照を修正
 */

const fs = require('fs');
const path = require('path');

// 修正対象ファイル
const testFiles = [
    'test-sync-functionality.cjs',
    'test-complex-flows.cjs',
    'test-performance-metrics.cjs',
    'test-runner-phase2.cjs'
];

// 修正内容の定義
const fixes = [
    {
        // test-sync-functionality.cjs の修正
        file: 'test-sync-functionality.cjs',
        replacements: [
            {
                search: "const { chromium } = require('playwright');",
                replace: "const playwright = require('playwright');"
            },
            {
                search: /switch \(browserType\) \{[\s\S]*?case 'firefox':\s*browser = await playwright\.firefox/,
                replace: "switch (browserType) {\n            case 'firefox':\n                browser = await playwright.firefox"
            }
        ]
    },
    {
        // test-complex-flows.cjs は既に正しい形式
        file: 'test-complex-flows.cjs',
        replacements: []
    },
    {
        // test-performance-metrics.cjs も既に正しい形式
        file: 'test-performance-metrics.cjs',
        replacements: []
    },
    {
        // test-runner-phase2.cjs のファイル拡張子参照を修正
        file: 'test-runner-phase2.cjs',
        replacements: [
            {
                search: /file: path\.join\(__dirname, 'test-sync-functionality\.js'\)/,
                replace: "file: path.join(__dirname, 'test-sync-functionality.cjs')"
            },
            {
                search: /file: path\.join\(__dirname, 'test-complex-flows\.js'\)/,
                replace: "file: path.join(__dirname, 'test-complex-flows.cjs')"
            },
            {
                search: /file: path\.join\(__dirname, 'test-performance-metrics\.js'\)/,
                replace: "file: path.join(__dirname, 'test-performance-metrics.cjs')"
            }
        ]
    }
];

console.log('テストファイルの構文エラー修正を開始...\n');

fixes.forEach(fix => {
    const filePath = path.join(__dirname, fix.file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ファイルが見つかりません: ${fix.file}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fix.replacements.forEach((replacement, index) => {
        if (content.includes(replacement.search) || content.match(replacement.search)) {
            content = content.replace(replacement.search, replacement.replace);
            modified = true;
            console.log(`✓ ${fix.file} - 修正 ${index + 1} 適用`);
        }
    });
    
    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${fix.file} 修正完了\n`);
    } else {
        console.log(`ℹ️  ${fix.file} - 修正不要\n`);
    }
});

console.log('すべての修正が完了しました。');