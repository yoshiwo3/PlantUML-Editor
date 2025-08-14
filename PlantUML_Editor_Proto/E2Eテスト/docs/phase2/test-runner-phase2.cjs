/**
 * PlantUMLエディタ E2Eテスト Phase2 統合実行スクリプト
 * 既存の成功環境（10/10成功）との互換性を保ちつつPhase2テストを実行
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 設定
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
const RESULTS_DIR = path.join(__dirname, '../../test-results');

// Phase2テストファイルの定義
const PHASE2_TESTS = {
    'sync-functionality': {
        name: 'Phase2-A: 同期機能テスト',
        file: path.join(__dirname, 'test-sync-functionality.cjs'),
        timeout: 120000,
        category: 'sync'
    },
    'complex-flows': {
        name: 'Phase2-A: 複雑フローテスト',
        file: path.join(__dirname, 'test-complex-flows.cjs'),
        timeout: 180000,
        category: 'flows'
    },
    'performance-metrics': {
        name: 'Phase2-B: パフォーマンステスト',
        file: path.join(__dirname, 'test-performance-metrics.cjs'),
        timeout: 300000,
        category: 'performance'
    }
};

// カラー出力用のヘルパー
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m'
};

function log(color, symbol, message) {
    console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

// テスト結果管理
class TestResultsManager {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            browser: null,
            suite: null,
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0
            },
            tests: []
        };
    }

    addTestResult(testName, status, duration, error = null) {
        this.results.tests.push({
            name: testName,
            status,
            duration,
            error
        });
        
        this.results.summary[status]++;
        this.results.summary.total++;
    }

    setMetadata(browser, suite) {
        this.results.browser = browser;
        this.results.suite = suite;
    }

    saveResults() {
        if (!fs.existsSync(RESULTS_DIR)) {
            fs.mkdirSync(RESULTS_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const fileName = `phase2-test-results-${this.results.browser}-${timestamp}.json`;
        const filePath = path.join(RESULTS_DIR, fileName);
        
        fs.writeFileSync(filePath, JSON.stringify(this.results, null, 2));
        log('blue', 'ℹ', `テスト結果保存: ${filePath}`);
        
        return filePath;
    }

    printSummary() {
        const { summary } = this.results;
        
        console.log('\n' + colors.bold + colors.cyan + '=' .repeat(60));
        console.log('  Phase2 E2Eテスト実行結果サマリー');
        console.log('=' .repeat(60) + colors.reset + '\n');
        
        console.log(`ブラウザ: ${this.results.browser}`);
        console.log(`実行日時: ${this.results.timestamp}`);
        console.log(`総実行時間: ${(summary.duration / 1000).toFixed(2)}秒\n`);
        
        log('cyan', '📊', `総テスト数: ${summary.total}`);
        log('green', '✓', `成功: ${summary.passed}`);
        log('red', '✗', `失敗: ${summary.failed}`);
        log('yellow', '⚠', `スキップ: ${summary.skipped}`);
        
        if (summary.total > 0) {
            const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
            const statusColor = successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red';
            log(statusColor, '📈', `成功率: ${successRate}%`);
        }
    }
}

// 単一テストの実行
async function runSingleTest(testConfig, browser) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        log('blue', '🚀', `実行開始: ${testConfig.name}`);
        
        const child = spawn('node', [testConfig.file, browser], {
            cwd: path.dirname(testConfig.file),
            env: { ...process.env, BASE_URL },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data;
            // リアルタイム出力（ログレベルで制御）
            if (process.env.VERBOSE) {
                process.stdout.write(data);
            }
        });

        child.stderr.on('data', (data) => {
            stderr += data;
            if (process.env.VERBOSE) {
                process.stderr.write(data);
            }
        });

        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            log('red', '⏰', `タイムアウト: ${testConfig.name} (${testConfig.timeout}ms)`);
        }, testConfig.timeout);

        child.on('close', (code) => {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            
            const result = {
                name: testConfig.name,
                status: code === 0 ? 'passed' : 'failed',
                duration,
                stdout,
                stderr,
                exitCode: code
            };

            if (code === 0) {
                log('green', '✅', `${testConfig.name} - 成功 (${duration}ms)`);
            } else {
                log('red', '❌', `${testConfig.name} - 失敗 (${duration}ms)`);
                if (stderr) {
                    log('red', '📝', `エラー出力: ${stderr.slice(0, 500)}...`);
                }
            }

            resolve(result);
        });

        child.on('error', (error) => {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            
            log('red', '💥', `${testConfig.name} - 実行エラー: ${error.message}`);
            
            resolve({
                name: testConfig.name,
                status: 'failed',
                duration,
                stdout,
                stderr,
                error: error.message
            });
        });
    });
}

// アプリケーション起動確認
async function checkApplication() {
    log('blue', '🔍', 'アプリケーション起動確認中...');
    
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(BASE_URL);
            if (response.ok) {
                log('green', '✅', 'アプリケーション起動確認完了');
                return true;
            }
        } catch (error) {
            // 接続失敗は予期される場合がある
        }
        
        attempts++;
        log('yellow', '⏳', `起動確認中... (${attempts}/${maxAttempts})`);
        
        if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    log('red', '❌', 'アプリケーションへの接続に失敗しました');
    return false;
}

// メイン実行関数
async function main() {
    console.log('\n' + colors.bold + colors.magenta + '=' .repeat(70));
    console.log('  PlantUMLエディタ E2Eテスト Phase2 統合実行');
    console.log('=' .repeat(70) + colors.reset + '\n');
    
    // コマンドライン引数の解析
    const args = process.argv.slice(2);
    const browser = args[0] || 'chromium';
    const suite = args[1] || 'all';
    
    log('cyan', '🎯', `実行設定:`);
    console.log(`  - ブラウザ: ${browser}`);
    console.log(`  - テストスイート: ${suite}`);
    console.log(`  - BASE_URL: ${BASE_URL}`);
    console.log(`  - 結果保存先: ${RESULTS_DIR}\n`);
    
    // 結果管理インスタンス
    const resultsManager = new TestResultsManager();
    resultsManager.setMetadata(browser, suite);
    
    const overallStartTime = Date.now();
    
    try {
        // アプリケーション起動確認
        const appReady = await checkApplication();
        if (!appReady) {
            log('red', '🚫', 'アプリケーションが起動していません。テストを中止します。');
            process.exit(1);
        }
        
        // 実行対象テストの決定
        let testsToRun = [];
        
        if (suite === 'all') {
            testsToRun = Object.values(PHASE2_TESTS);
        } else {
            // 特定のカテゴリまたはテスト名での実行
            testsToRun = Object.values(PHASE2_TESTS).filter(test => 
                test.category === suite || 
                Object.keys(PHASE2_TESTS).includes(suite)
            );
            
            if (testsToRun.length === 0) {
                log('red', '❌', `指定されたテストスイート '${suite}' が見つかりません`);
                log('blue', 'ℹ', `利用可能なスイート: all, sync, flows, performance, または個別テスト名`);
                process.exit(1);
            }
        }
        
        log('cyan', '📋', `実行予定テスト: ${testsToRun.length}件`);
        testsToRun.forEach((test, index) => {
            console.log(`  ${index + 1}. ${test.name}`);
        });
        console.log();
        
        // テストの順次実行
        for (const testConfig of testsToRun) {
            const result = await runSingleTest(testConfig, browser);
            
            resultsManager.addTestResult(
                result.name,
                result.status,
                result.duration,
                result.error || result.stderr
            );
            
            // テスト間の間隔
            if (testsToRun.indexOf(testConfig) < testsToRun.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
    } catch (error) {
        log('red', '💥', `致命的エラー: ${error.message}`);
        resultsManager.addTestResult('Runner Error', 'failed', 0, error.message);
    }
    
    // 実行時間の記録
    resultsManager.results.summary.duration = Date.now() - overallStartTime;
    
    // 結果の保存と表示
    const resultFile = resultsManager.saveResults();
    resultsManager.printSummary();
    
    // 詳細レポートの生成
    if (resultsManager.results.tests.length > 0) {
        generateDetailedReport(resultsManager.results, resultFile);
    }
    
    // 終了コードの決定
    const hasFailures = resultsManager.results.summary.failed > 0;
    if (hasFailures) {
        log('red', '🚫', 'テスト実行中に失敗が発生しました');
        process.exit(1);
    } else {
        log('green', '🎉', 'すべてのテストが正常に完了しました');
        process.exit(0);
    }
}

// 詳細レポート生成
function generateDetailedReport(results, resultFile) {
    const reportDir = path.dirname(resultFile);
    const reportFile = path.join(reportDir, `phase2-detailed-report-${results.browser}-${new Date().toISOString().slice(0, 10)}.md`);
    
    let report = `# Phase2 E2Eテスト詳細レポート

## 実行情報
- **実行日時**: ${results.timestamp}
- **ブラウザ**: ${results.browser}
- **テストスイート**: ${results.suite}
- **総実行時間**: ${(results.summary.duration / 1000).toFixed(2)}秒

## サマリー
| 項目 | 件数 |
|------|------|
| 総テスト数 | ${results.summary.total} |
| 成功 | ${results.summary.passed} |
| 失敗 | ${results.summary.failed} |
| スキップ | ${results.summary.skipped} |

## 詳細結果

`;

    results.tests.forEach((test, index) => {
        const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
        report += `### ${index + 1}. ${test.name} ${statusIcon}

- **ステータス**: ${test.status}
- **実行時間**: ${test.duration}ms
`;

        if (test.error) {
            report += `- **エラー**: \n\`\`\`\n${test.error}\n\`\`\`\n`;
        }

        report += '\n';
    });

    report += `## 推奨アクション

${results.summary.failed === 0 
    ? '✅ すべてのテストが成功しました。現在の品質レベルを維持してください。' 
    : `⚠️ ${results.summary.failed}件のテストが失敗しました。以下の対応を推奨します：
- 失敗したテストの詳細ログを確認
- テスト環境の安定性を検証
- アプリケーションコードの修正検討`}

## 次のステップ
1. 継続的な監視体制の維持
2. パフォーマンス指標の定期的な確認
3. 新機能追加時のテストケース拡充

---
*このレポートは test-runner-phase2.js により自動生成されました*
`;

    fs.writeFileSync(reportFile, report);
    log('blue', '📄', `詳細レポート生成: ${reportFile}`);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    log('red', '💥', `未処理のPromise拒否: ${error}`);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log('red', '💥', `キャッチされていない例外: ${error}`);
    process.exit(1);
});

// Ctrl+C での適切な終了処理
process.on('SIGINT', () => {
    log('yellow', '⚠️', 'テスト実行が中断されました');
    process.exit(1);
});

// 使用方法の表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
PlantUMLエディタ Phase2 E2Eテスト統合実行スクリプト

使用方法:
  node test-runner-phase2.js [browser] [suite]

引数:
  browser  ブラウザタイプ (chromium, firefox, webkit, msedge) 
          デフォルト: chromium
  
  suite    テストスイート (all, sync, flows, performance)
          デフォルト: all

環境変数:
  BASE_URL   アプリケーションのベースURL (デフォルト: http://localhost:8086)
  VERBOSE    詳細ログ出力 (true/false)

例:
  # すべてのテストをChromiumで実行
  node test-runner-phase2.js
  
  # 同期機能テストのみをFirefoxで実行
  node test-runner-phase2.js firefox sync
  
  # パフォーマンステストをEdgeで実行
  node test-runner-phase2.js msedge performance

利用可能なテストスイート:
  - all: すべてのPhase2テスト
  - sync: 同期機能テスト
  - flows: 複雑フローテスト  
  - performance: パフォーマンステスト
`);
    process.exit(0);
}

// メイン実行
if (require.main === module) {
    main().catch((error) => {
        log('red', '💥', `実行エラー: ${error}`);
        process.exit(1);
    });
}