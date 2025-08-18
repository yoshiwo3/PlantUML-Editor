#!/bin/bash
# Sprint4 テストレポート集約スクリプト

set -e

# 色付きログ関数
log_info() {
    echo -e "\033[36m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 設定
RESULTS_DIR="test-results"
REPORTS_DIR="$RESULTS_DIR/integrated-report"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log_info "📊 Starting Sprint4 test report aggregation..."

# 前提条件チェック
if [ ! -d "$RESULTS_DIR" ]; then
    log_error "Results directory not found: $RESULTS_DIR"
    exit 1
fi

# ディレクトリ作成
mkdir -p "$REPORTS_DIR"
mkdir -p "$REPORTS_DIR/assets"
mkdir -p "$REPORTS_DIR/data"

log_info "🔍 Collecting test results from workers..."

# 各ワーカーからの結果マージ
log_info "📈 Merging results from parallel workers..."

# Node.jsを使用してJSONデータをマージ
node << 'EOF'
const fs = require('fs');
const path = require('path');

const resultsDir = process.argv[2] || 'test-results';
const outputDir = process.argv[3] || 'test-results/integrated-report';

log_info("Processing test results...");

// 結果収集
const mergedResults = {
    summary: { 
        total: 0, 
        passed: 0, 
        failed: 0, 
        skipped: 0,
        duration: 0,
        startTime: null,
        endTime: null
    },
    tests: [],
    browsers: {},
    categories: {},
    performance: {},
    coverage: {},
    timeline: [],
    browserMatrix: {}
};

// 各ワーカーディレクトリを走査
const workerDirs = fs.readdirSync(resultsDir).filter(dir => 
    dir.includes('worker') || dir.includes('results')
);

log_info(`Found ${workerDirs.length} result directories`);

workerDirs.forEach(workerDir => {
    const workerPath = path.join(resultsDir, workerDir);
    if (!fs.statSync(workerPath).isDirectory()) return;

    // JSON結果ファイル読み込み
    const jsonFiles = ['results.json', 'test-results.json', 'output.json'];
    
    for (const jsonFile of jsonFiles) {
        const jsonPath = path.join(workerPath, jsonFile);
        if (fs.existsSync(jsonPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                
                // サマリーマージ
                if (data.summary) {
                    mergedResults.summary.total += data.summary.total || 0;
                    mergedResults.summary.passed += data.summary.passed || 0;
                    mergedResults.summary.failed += data.summary.failed || 0;
                    mergedResults.summary.skipped += data.summary.skipped || 0;
                    mergedResults.summary.duration += data.summary.duration || 0;
                }

                // テストケースマージ
                if (data.tests && Array.isArray(data.tests)) {
                    mergedResults.tests.push(...data.tests);
                }

                // ブラウザ結果マージ
                if (data.browsers) {
                    Object.assign(mergedResults.browsers, data.browsers);
                }

                // カテゴリマージ
                if (data.categories) {
                    Object.assign(mergedResults.categories, data.categories);
                }

                // パフォーマンスデータマージ
                if (data.performance) {
                    Object.assign(mergedResults.performance, data.performance);
                }

                // カバレッジデータマージ
                if (data.coverage) {
                    Object.assign(mergedResults.coverage, data.coverage);
                }

                console.log(`✅ Merged data from ${workerDir}/${jsonFile}`);
                break; // 最初のファイルで成功したら次のワーカーへ
            } catch (error) {
                console.warn(`⚠️  Failed to parse ${workerDir}/${jsonFile}: ${error.message}`);
            }
        }
    }
});

// JUnit XMLからも情報を取得
const junitFiles = fs.readdirSync(resultsDir).filter(file => file.endsWith('.xml'));
junitFiles.forEach(junitFile => {
    // XMLパース処理（簡易版）
    console.log(`📄 Found JUnit file: ${junitFile}`);
});

// ブラウザマトリックス生成
const browsers = ['chromium', 'firefox', 'webkit', 'msedge'];
const features = ['基本変換', '編集機能', 'エクスポート', 'パフォーマンス', 'セキュリティ'];

features.forEach(feature => {
    mergedResults.browserMatrix[feature] = {};
    browsers.forEach(browser => {
        // テスト結果から該当するテストを検索
        const featureTests = mergedResults.tests.filter(test => 
            test.title?.includes(feature) && test.browser?.includes(browser)
        );
        
        if (featureTests.length > 0) {
            const passedTests = featureTests.filter(test => test.status === 'passed');
            mergedResults.browserMatrix[feature][browser] = 
                passedTests.length === featureTests.length ? 'pass' : 'fail';
        } else {
            mergedResults.browserMatrix[feature][browser] = 'skip';
        }
    });
});

// タイムライン生成
mergedResults.timeline = mergedResults.tests
    .filter(test => test.startTime && test.duration)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .map(test => ({
        time: new Date(test.startTime).toLocaleTimeString('ja-JP'),
        description: test.title?.substring(0, 50) + '...',
        status: test.status,
        duration: test.duration,
        browser: test.browser
    }));

// 統計計算
const successRate = mergedResults.summary.total > 0 ? 
    ((mergedResults.summary.passed / mergedResults.summary.total) * 100).toFixed(1) : 0;

mergedResults.summary.successRate = successRate;
mergedResults.summary.executionDate = new Date().toISOString();

// 結果ファイル保存
fs.writeFileSync(
    path.join(outputDir, 'data', 'merged-results.json'), 
    JSON.stringify(mergedResults, null, 2)
);

console.log('✅ Results merged successfully');
console.log(`📊 Summary: ${mergedResults.summary.passed}/${mergedResults.summary.total} passed (${successRate}%)`);

EOF "$RESULTS_DIR" "$REPORTS_DIR"

log_success "Results merged successfully"

# Allure レポート生成
if [ -d "$RESULTS_DIR/allure-results" ]; then
    log_info "🎭 Generating Allure report..."
    
    # Allure CLIの確認
    if command -v allure &> /dev/null; then
        allure generate "$RESULTS_DIR/allure-results" -o "$REPORTS_DIR/allure-report" --clean
        log_success "Allure report generated"
    else
        log_warning "Allure CLI not found, installing via npm..."
        npm install -g allure-commandline
        allure generate "$RESULTS_DIR/allure-results" -o "$REPORTS_DIR/allure-report" --clean
    fi
else
    log_warning "Allure results directory not found"
fi

# その他のレポート統合
log_info "🔗 Integrating additional reports..."

# HTML レポート
if [ -d "$RESULTS_DIR/html-report" ]; then
    cp -r "$RESULTS_DIR/html-report" "$REPORTS_DIR/"
    log_success "HTML report integrated"
fi

# Coverage レポート
if [ -d "$RESULTS_DIR/coverage" ]; then
    cp -r "$RESULTS_DIR/coverage" "$REPORTS_DIR/"
    log_success "Coverage report integrated"
fi

# パフォーマンスデータ
if [ -f "$RESULTS_DIR/performance.json" ]; then
    cp "$RESULTS_DIR/performance.json" "$REPORTS_DIR/data/"
    log_success "Performance data integrated"
fi

# 統合HTMLレポート生成
log_info "🎨 Generating integrated HTML report..."

node << 'EOF'
const fs = require('fs');
const path = require('path');

const reportsDir = process.argv[2] || 'test-results/integrated-report';
const templatePath = 'tests/reports/integrated-report-template.html';

// テンプレートファイルの存在確認
if (!fs.existsSync(templatePath)) {
    console.warn('Template file not found, creating basic template...');
    
    const basicTemplate = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML Editor - Sprint4 テスト結果</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
        .metric { text-align: center; padding: 20px; border: 1px solid #ddd; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .reports { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .report-card { border: 1px solid #ddd; padding: 20px; }
        .report-link { background: #007bff; color: white; padding: 10px; text-decoration: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sprint4 テスト結果統合レポート</h1>
        <p>実行日時: {{EXECUTION_DATE}}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">{{TOTAL_PASSED}}</div>
            <div>成功テスト</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{TOTAL_FAILED}}</div>
            <div>失敗テスト</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{SUCCESS_RATE}}%</div>
            <div>成功率</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{EXECUTION_TIME}}</div>
            <div>実行時間</div>
        </div>
    </div>
    
    <div class="reports">
        <div class="report-card">
            <h3>📊 Allure Report</h3>
            <p>詳細なテスト実行レポート</p>
            <a href="allure-report/index.html" class="report-link">Allure Report を開く</a>
        </div>
        <div class="report-card">
            <h3>🎯 HTML Test Report</h3>
            <p>Playwright標準レポート</p>
            <a href="html-report/index.html" class="report-link">HTML Report を開く</a>
        </div>
        <div class="report-card">
            <h3>📈 Coverage Report</h3>
            <p>コードカバレッジ分析</p>
            <a href="coverage/index.html" class="report-link">Coverage Report を開く</a>
        </div>
    </div>
</body>
</html>
    `;
    
    fs.writeFileSync(templatePath, basicTemplate);
}

// 結果データ読み込み
const resultsPath = path.join(reportsDir, 'data', 'merged-results.json');
let results = {
    summary: { passed: 0, failed: 0, total: 0, duration: 0 }
};

if (fs.existsSync(resultsPath)) {
    results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

// テンプレート読み込み
let template = fs.readFileSync(templatePath, 'utf8');

// プレースホルダー置換
const replacements = {
    '{{EXECUTION_DATE}}': new Date().toLocaleString('ja-JP'),
    '{{TOTAL_PASSED}}': results.summary.passed || 0,
    '{{TOTAL_FAILED}}': results.summary.failed || 0,
    '{{TOTAL_SKIPPED}}': results.summary.skipped || 0,
    '{{SUCCESS_RATE}}': results.summary.successRate || '0',
    '{{EXECUTION_TIME}}': formatDuration(results.summary.duration || 0),
    '{{COVERAGE_PERCENTAGE}}': '85', // 仮値
    '{{BROWSER_COUNT}}': '4'
};

// 追加データの処理
const performanceData = results.performance || {};
Object.assign(replacements, {
    '{{FCP_TIME}}': performanceData.fcp || 'N/A',
    '{{LCP_TIME}}': performanceData.lcp || 'N/A',
    '{{FID_TIME}}': performanceData.fid || 'N/A',
    '{{CLS_SCORE}}': performanceData.cls || 'N/A'
});

// ブラウザマトリックス生成
if (results.browserMatrix) {
    const matrixHtml = generateBrowserMatrixHTML(results.browserMatrix);
    replacements['{{BROWSER_MATRIX_ROWS}}'] = matrixHtml;
}

// タイムラインデータ
replacements['{{TIMELINE_DATA}}'] = JSON.stringify(results.timeline || []);

// 置換実行
for (const [placeholder, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(placeholder, 'g'), value);
}

// HTMLファイル出力
fs.writeFileSync(path.join(reportsDir, 'index.html'), template);

console.log('✅ Integrated HTML report generated');

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

function generateBrowserMatrixHTML(matrix) {
    const features = Object.keys(matrix);
    const browsers = ['chromium', 'firefox', 'webkit', 'msedge'];
    
    return features.map(feature => {
        const cells = [
            `<div class="matrix-cell">${feature}</div>`
        ];
        
        browsers.forEach(browser => {
            const status = matrix[feature]?.[browser] || 'unknown';
            const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏸️';
            const cssClass = status === 'pass' ? 'matrix-pass' : 
                           status === 'fail' ? 'matrix-fail' : 'matrix-skip';
            cells.push(`<div class="matrix-cell ${cssClass}">${icon}</div>`);
        });
        
        return cells.join('');
    }).join('');
}

EOF "$REPORTS_DIR"

# アーカイブ作成
log_info "📦 Creating report archive..."
tar -czf "$RESULTS_DIR/sprint4-test-results-$TIMESTAMP.tar.gz" -C "$RESULTS_DIR" integrated-report

# 統計サマリー表示
log_info "📊 Generating final summary..."

if [ -f "$REPORTS_DIR/data/merged-results.json" ]; then
    echo ""
    echo "📊 Sprint4 Test Results Summary"
    echo "================================"
    
    # jqが利用可能な場合
    if command -v jq &> /dev/null; then
        cat "$REPORTS_DIR/data/merged-results.json" | jq -r '
            "Total Tests: " + (.summary.total | tostring) + 
            "\nPassed: " + (.summary.passed | tostring) + 
            "\nFailed: " + (.summary.failed | tostring) + 
            "\nSkipped: " + (.summary.skipped | tostring) + 
            "\nSuccess Rate: " + (.summary.successRate | tostring) + "%" +
            "\nExecution Time: " + ((.summary.duration / 1000 / 60) | floor | tostring) + "m"
        '
    else
        # 基本的な統計表示
        node -e "
            const results = require('./test-results/integrated-report/data/merged-results.json');
            console.log('Total Tests:', results.summary.total || 0);
            console.log('Passed:', results.summary.passed || 0);
            console.log('Failed:', results.summary.failed || 0);
            console.log('Success Rate:', results.summary.successRate || '0', '%');
        "
    fi
fi

log_success "✅ Report aggregation completed!"
echo ""
echo "📁 Reports available at:"
echo "   Main Report: file://$(pwd)/$REPORTS_DIR/index.html"
echo "   Allure Report: file://$(pwd)/$REPORTS_DIR/allure-report/index.html"
echo "   HTML Report: file://$(pwd)/$REPORTS_DIR/html-report/index.html"
echo "   Coverage Report: file://$(pwd)/$REPORTS_DIR/coverage/index.html"
echo ""
echo "📦 Archive created: $RESULTS_DIR/sprint4-test-results-$TIMESTAMP.tar.gz"

# ローカルサーバー起動オプション
echo ""
echo "🌐 Start local report server? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    log_info "Starting local server at http://localhost:8080"
    cd "$REPORTS_DIR"
    
    if command -v python3 &> /dev/null; then
        python3 -m http.server 8080
    elif command -v python &> /dev/null; then
        python -m SimpleHTTPServer 8080
    elif command -v node &> /dev/null; then
        npx http-server -p 8080
    else
        log_warning "No suitable HTTP server found"
    fi
fi