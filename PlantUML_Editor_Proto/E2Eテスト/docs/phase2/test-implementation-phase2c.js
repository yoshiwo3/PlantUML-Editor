/**
 * PlantUMLエディタ Phase 2-C テスト実装
 * CI/CD統合テスト - GitHub Actions・自動レポート・品質ゲート
 * 
 * 実装日: 2025/08/13
 * 対象: CI/CD環境（GitHub Actions）
 * 
 * このファイルはCI/CD統合テストと統合レポート生成を担当
 */

const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

// CI/CD結果管理
const cicdResults = {
    testSuite: 'Phase2-C-CICD',
    startTime: new Date().toISOString(),
    environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ciEnvironment: process.env.CI || 'local',
        githubActor: process.env.GITHUB_ACTOR || 'unknown',
        githubRef: process.env.GITHUB_REF || 'unknown'
    },
    tests: [],
    artifacts: []
};

// カラー出力（CI環境対応）
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(color, symbol, message) {
    const timestamp = new Date().toISOString();
    const isCI = process.env.CI === 'true';
    const colorOutput = isCI ? '' : colors[color];
    const resetOutput = isCI ? '' : colors.reset;
    console.log(`${colorOutput}[${timestamp}] ${symbol} ${message}${resetOutput}`);
}

// CI/CD統合ユーティリティ
class CICDUtils {
    /**
     * テスト結果のJUnit XML形式出力
     */
    static async generateJUnitReport(results, outputPath) {
        const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
        const totalTests = results.tests.length;
        const failures = results.tests.filter(t => t.status === 'failed').length;
        const time = (new Date(results.endTime) - new Date(results.startTime)) / 1000;
        
        let xml = `${xmlHeader}
<testsuite name="${results.testSuite}" tests="${totalTests}" failures="${failures}" time="${time}">`;
        
        results.tests.forEach(test => {
            xml += `
    <testcase classname="${results.testSuite}" name="${test.name}" time="${(test.duration || 0) / 1000}">`;
            
            if (test.status === 'failed') {
                xml += `
        <failure message="${test.error || 'Test failed'}">${test.stack || ''}</failure>`;
            }
            
            xml += `
    </testcase>`;
        });
        
        xml += `
</testsuite>`;
        
        await fs.writeFile(outputPath, xml, 'utf8');
        log('green', '📄', `JUnitレポート生成: ${outputPath}`);
    }

    /**
     * HTML形式テストレポート生成
     */
    static async generateHTMLReport(results, outputPath) {
        const totalTests = results.tests.length;
        const passed = results.tests.filter(t => t.status === 'passed').length;
        const failed = results.tests.filter(t => t.status === 'failed').length;
        const successRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0;
        
        const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUMLエディタ E2Eテスト結果 - Phase 2-C</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin-bottom: 10px; }
        .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
        .metric { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 6px; }
        .metric h3 { margin: 0; font-size: 2em; }
        .metric p { margin: 5px 0 0 0; color: #666; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .test-results { margin-top: 30px; }
        .test-item { padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid; }
        .test-passed { background: #d4edda; border-color: #28a745; }
        .test-failed { background: #f8d7da; border-color: #dc3545; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-details { font-size: 0.9em; color: #666; }
        .environment { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .artifacts { margin-top: 20px; }
        .artifact-link { display: inline-block; margin: 5px 10px 5px 0; padding: 8px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PlantUMLエディタ E2Eテスト結果</h1>
            <p>Phase 2-C: CI/CD統合テスト</p>
            <p>実行日時: ${results.startTime}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3 class="success">${passed}</h3>
                <p>成功</p>
            </div>
            <div class="metric">
                <h3 class="danger">${failed}</h3>
                <p>失敗</p>
            </div>
            <div class="metric">
                <h3>${totalTests}</h3>
                <p>総テスト数</p>
            </div>
            <div class="metric">
                <h3 class="${successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'danger'}">${successRate}%</h3>
                <p>成功率</p>
            </div>
        </div>
        
        <div class="environment">
            <h3>実行環境</h3>
            <p><strong>Node.js:</strong> ${results.environment.nodeVersion}</p>
            <p><strong>Platform:</strong> ${results.environment.platform}</p>
            <p><strong>CI Environment:</strong> ${results.environment.ciEnvironment}</p>
            <p><strong>GitHub Actor:</strong> ${results.environment.githubActor}</p>
            <p><strong>GitHub Ref:</strong> ${results.environment.githubRef}</p>
        </div>
        
        <div class="test-results">
            <h2>テスト結果詳細</h2>
            ${results.tests.map(test => `
            <div class="test-item test-${test.status}">
                <div class="test-name">${test.id || ''} - ${test.name}</div>
                <div class="test-details">
                    実行時間: ${test.duration || 0}ms
                    ${test.error ? `<br>エラー: ${test.error}` : ''}
                    ${test.metrics ? `<br>メトリクス: ${JSON.stringify(test.metrics)}` : ''}
                </div>
            </div>
            `).join('')}
        </div>
        
        ${results.artifacts.length > 0 ? `
        <div class="artifacts">
            <h2>成果物</h2>
            ${results.artifacts.map(artifact => `
            <a href="${artifact.path}" class="artifact-link">${artifact.name}</a>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
        
        await fs.writeFile(outputPath, html, 'utf8');
        log('green', '📊', `HTMLレポート生成: ${outputPath}`);
    }

    /**
     * スクリーンショット比較（ビジュアルリグレッション）
     */
    static async captureScreenshot(page, testId, outputDir) {
        await fs.mkdir(outputDir, { recursive: true });
        
        const screenshotPath = path.join(outputDir, `${testId}.png`);
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });
        
        cicdResults.artifacts.push({
            name: `Screenshot: ${testId}`,
            path: screenshotPath,
            type: 'screenshot'
        });
        
        return screenshotPath;
    }

    /**
     * テスト品質メトリクス計算
     */
    static calculateQualityMetrics(results) {
        const total = results.tests.length;
        const passed = results.tests.filter(t => t.status === 'passed').length;
        const failed = results.tests.filter(t => t.status === 'failed').length;
        
        const avgDuration = total > 0 ? 
            results.tests.reduce((sum, t) => sum + (t.duration || 0), 0) / total : 0;
        
        return {
            totalTests: total,
            passedTests: passed,
            failedTests: failed,
            successRate: total > 0 ? (passed / total) * 100 : 0,
            averageDuration: avgDuration,
            totalDuration: results.endTime ? 
                new Date(results.endTime) - new Date(results.startTime) : 0
        };
    }
}

// テスト実行フレームワーク（CI/CD対応）
async function runCICDTest(testId, testName, testFn) {
    const test = {
        id: testId,
        name: testName,
        status: 'running',
        startTime: new Date().toISOString()
    };
    
    try {
        log('blue', '🚀', `CI/CD統合テスト実行: ${testId} - ${testName}`);
        const start = Date.now();
        
        const result = await testFn();
        
        const duration = Date.now() - start;
        test.status = 'passed';
        test.duration = duration;
        test.endTime = new Date().toISOString();
        test.metrics = result?.metrics || {};
        
        log('green', '✅', `成功: ${testName} (${duration}ms)`);
        
    } catch (error) {
        test.status = 'failed';
        test.error = error.message;
        test.stack = error.stack;
        test.endTime = new Date().toISOString();
        test.duration = Date.now() - new Date(test.startTime).getTime();
        
        log('red', '❌', `失敗: ${testName}: ${error.message}`);
    }
    
    cicdResults.tests.push(test);
    return test;
}

// Phase 2-C メインテスト群
async function runPhase2CTests() {
    console.log('\n' + colors.cyan + '=' .repeat(80));
    console.log('  PlantUMLエディタ Phase 2-C テスト: CI/CD統合');
    console.log('  自動レポート・品質ゲート・統合テスト');
    console.log('=' .repeat(80) + colors.reset + '\n');
    
    const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';
    const OUTPUT_DIR = process.env.OUTPUT_DIR || './test-results';
    
    log('blue', 'ℹ️', `ベースURL: ${BASE_URL}`);
    log('blue', 'ℹ️', `出力ディレクトリ: ${OUTPUT_DIR}`);
    log('blue', 'ℹ️', `CI環境: ${process.env.CI ? 'Yes' : 'No'}`);
    
    let browser, context, page;
    
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        
        // CI/CD環境用ブラウザ設定
        browser = await chromium.launch({
            channel: 'msedge',
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--disable-default-apps'
            ]
        });
        
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP'
        });
        
        page = await context.newPage();

        // ===========================================
        // 1. CI/CD統合基本テスト群
        // ===========================================
        
        await runCICDTest(
            'CI-001',
            'プルリクエスト時テスト実行シミュレーション',
            async () => {
                // PRトリガーのシミュレーション
                const prInfo = {
                    number: process.env.GITHUB_PR_NUMBER || 'test',
                    branch: process.env.GITHUB_HEAD_REF || 'test-branch',
                    baseBranch: process.env.GITHUB_BASE_REF || 'main'
                };
                
                log('blue', '📋', `PR情報: #${prInfo.number} (${prInfo.branch} -> ${prInfo.baseBranch})`);
                
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                // 基本機能テスト実行
                const testCases = [
                    { name: '初期画面表示', action: () => page.title() },
                    { name: 'アクター追加', action: () => page.click('button:has-text("顧客")') },
                    { name: 'コード生成確認', action: () => page.inputValue('#plantuml-code') }
                ];
                
                const results = [];
                for (const testCase of testCases) {
                    try {
                        const result = await testCase.action();
                        results.push({ name: testCase.name, status: 'passed', result });
                        log('green', '✓', `${testCase.name}: 成功`);
                    } catch (error) {
                        results.push({ name: testCase.name, status: 'failed', error: error.message });
                        log('red', '✗', `${testCase.name}: 失敗`);
                    }
                }
                
                // スクリーンショット撮影
                await CICDUtils.captureScreenshot(page, 'pr-test-result', OUTPUT_DIR);
                
                return { 
                    metrics: { 
                        prInfo, 
                        testResults: results,
                        passedTests: results.filter(r => r.status === 'passed').length,
                        totalTests: results.length
                    } 
                };
            }
        );

        await runCICDTest(
            'CI-002',
            'メインブランチマージ時回帰テスト',
            async () => {
                // マージ後の回帰テスト実行
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                // 既存機能の回帰確認
                const regressionTests = [
                    {
                        name: '全アクター追加テスト',
                        test: async () => {
                            const actors = ['顧客', 'ECサイト', '決済サービス'];
                            for (const actor of actors) {
                                const button = page.locator(`button:has-text("${actor}")`);
                                if (await button.count() > 0) {
                                    await button.first().click();
                                    await page.waitForTimeout(200);
                                }
                            }
                            const code = await page.inputValue('#plantuml-code');
                            return actors.every(actor => code.includes(actor));
                        }
                    },
                    {
                        name: 'クリア機能テスト',
                        test: async () => {
                            page.on('dialog', dialog => dialog.accept());
                            await page.click('button:has-text("クリア")');
                            await page.waitForTimeout(1000);
                            const code = await page.inputValue('#plantuml-code');
                            return code.match(/^@startuml\n\n@enduml$/);
                        }
                    }
                ];
                
                const regressionResults = [];
                for (const test of regressionTests) {
                    try {
                        const passed = await test.test();
                        regressionResults.push({ 
                            name: test.name, 
                            status: passed ? 'passed' : 'failed' 
                        });
                    } catch (error) {
                        regressionResults.push({ 
                            name: test.name, 
                            status: 'failed', 
                            error: error.message 
                        });
                    }
                }
                
                // スクリーンショット撮影
                await CICDUtils.captureScreenshot(page, 'regression-test-result', OUTPUT_DIR);
                
                const allPassed = regressionResults.every(r => r.status === 'passed');
                if (!allPassed) {
                    throw new Error('回帰テストで失敗が検出されました');
                }
                
                return { 
                    metrics: { 
                        regressionResults,
                        allTestsPassed: allPassed
                    } 
                };
            }
        );

        await runCICDTest(
            'CI-003',
            '品質ゲート評価',
            async () => {
                await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                
                // 品質メトリクス収集
                const qualityMetrics = await page.evaluate(() => {
                    return {
                        // パフォーマンスメトリクス
                        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                        
                        // DOM品質メトリクス
                        domElements: document.querySelectorAll('*').length,
                        errors: window.console.errorCount || 0,
                        
                        // 機能性メトリクス
                        interactiveElements: document.querySelectorAll('button, input, select, textarea').length,
                        hasPlantUMLCode: !!document.querySelector('#plantuml-code')
                    };
                });
                
                // 品質ゲート基準
                const qualityGates = {
                    loadTime: { threshold: 3000, actual: qualityMetrics.loadTime, passed: qualityMetrics.loadTime < 3000 },
                    domReady: { threshold: 2000, actual: qualityMetrics.domReady, passed: qualityMetrics.domReady < 2000 },
                    domElements: { threshold: 1000, actual: qualityMetrics.domElements, passed: qualityMetrics.domElements < 1000 },
                    errors: { threshold: 0, actual: qualityMetrics.errors, passed: qualityMetrics.errors === 0 },
                    functionality: { threshold: 1, actual: qualityMetrics.hasPlantUMLCode ? 1 : 0, passed: qualityMetrics.hasPlantUMLCode }
                };
                
                const passedGates = Object.values(qualityGates).filter(gate => gate.passed).length;
                const totalGates = Object.keys(qualityGates).length;
                const qualityScore = (passedGates / totalGates) * 100;
                
                log('blue', '📊', `品質ゲート結果: ${passedGates}/${totalGates} (${qualityScore.toFixed(1)}%)`);
                
                // 品質ゲート詳細ログ
                Object.entries(qualityGates).forEach(([metric, gate]) => {
                    const status = gate.passed ? '✅' : '❌';
                    const color = gate.passed ? 'green' : 'red';
                    log(color, status, `${metric}: ${gate.actual} (閾値: ${gate.threshold})`);
                });
                
                // 品質ゲート失敗の場合はエラー
                if (qualityScore < 80) {
                    throw new Error(`品質ゲート基準未達: ${qualityScore.toFixed(1)}% (最低基準: 80%)`);
                }
                
                return { 
                    metrics: { 
                        qualityMetrics,
                        qualityGates,
                        qualityScore,
                        passedGates,
                        totalGates
                    } 
                };
            }
        );

        // ===========================================
        // 2. 自動レポート生成テスト
        // ===========================================

        await runCICDTest(
            'CI-004',
            'テスト結果レポート自動生成',
            async () => {
                // 現在までの結果をまとめてレポート生成
                cicdResults.endTime = new Date().toISOString();
                
                const qualityMetrics = CICDUtils.calculateQualityMetrics(cicdResults);
                
                // JUnitレポート生成
                const junitPath = path.join(OUTPUT_DIR, 'junit-results.xml');
                await CICDUtils.generateJUnitReport(cicdResults, junitPath);
                
                // HTMLレポート生成
                const htmlPath = path.join(OUTPUT_DIR, 'test-report.html');
                await CICDUtils.generateHTMLReport(cicdResults, htmlPath);
                
                // JSONレポート生成
                const jsonPath = path.join(OUTPUT_DIR, 'test-results.json');
                await fs.writeFile(jsonPath, JSON.stringify({
                    ...cicdResults,
                    qualityMetrics
                }, null, 2), 'utf8');
                
                cicdResults.artifacts.push(
                    { name: 'JUnit Results', path: junitPath, type: 'junit' },
                    { name: 'HTML Report', path: htmlPath, type: 'html' },
                    { name: 'JSON Results', path: jsonPath, type: 'json' }
                );
                
                log('green', '📝', `レポート生成完了: ${OUTPUT_DIR}`);
                
                return { 
                    metrics: { 
                        ...qualityMetrics,
                        reportsGenerated: 3,
                        artifactsCount: cicdResults.artifacts.length
                    } 
                };
            }
        );

        await runCICDTest(
            'CI-005',
            'テスト結果アーティファクト保存確認',
            async () => {
                // 生成されたアーティファクトの存在確認
                const artifactChecks = [];
                
                for (const artifact of cicdResults.artifacts) {
                    try {
                        const stat = await fs.stat(artifact.path);
                        artifactChecks.push({
                            name: artifact.name,
                            path: artifact.path,
                            exists: true,
                            size: stat.size,
                            type: artifact.type
                        });
                        log('green', '📁', `アーティファクト確認: ${artifact.name} (${stat.size} bytes)`);
                    } catch (error) {
                        artifactChecks.push({
                            name: artifact.name,
                            path: artifact.path,
                            exists: false,
                            error: error.message,
                            type: artifact.type
                        });
                        log('red', '❌', `アーティファクトが見つかりません: ${artifact.name}`);
                    }
                }
                
                const existingArtifacts = artifactChecks.filter(a => a.exists).length;
                const totalArtifacts = artifactChecks.length;
                
                if (existingArtifacts < totalArtifacts) {
                    throw new Error(`一部のアーティファクトが生成されていません: ${existingArtifacts}/${totalArtifacts}`);
                }
                
                return { 
                    metrics: { 
                        artifactChecks,
                        existingArtifacts,
                        totalArtifacts,
                        allArtifactsGenerated: existingArtifacts === totalArtifacts
                    } 
                };
            }
        );

    } catch (error) {
        log('red', '💀', `CI/CD統合テスト致命的エラー: ${error.message}`);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// メイン実行関数
async function main() {
    try {
        await runPhase2CTests();
        
        // 最終結果サマリー
        cicdResults.endTime = new Date().toISOString();
        const qualityMetrics = CICDUtils.calculateQualityMetrics(cicdResults);
        
        console.log('\n' + colors.cyan + '=' .repeat(80));
        console.log('  Phase 2-C CI/CD統合テスト結果サマリー');
        console.log('=' .repeat(80) + colors.reset + '\n');
        
        log('blue', '📊', `総実行時間: ${(qualityMetrics.totalDuration / 1000).toFixed(2)}秒`);
        log('blue', '📊', `実行テスト数: ${qualityMetrics.totalTests}`);
        log('green', '✅', `成功: ${qualityMetrics.passedTests}`);
        log('red', '❌', `失敗: ${qualityMetrics.failedTests}`);
        log('blue', '📊', `成功率: ${qualityMetrics.successRate.toFixed(1)}%`);
        log('blue', '📁', `生成アーティファクト数: ${cicdResults.artifacts.length}`);
        
        // CI/CD品質評価
        console.log('\n' + colors.magenta + 'CI/CD統合品質評価:' + colors.reset);
        if (qualityMetrics.successRate >= 100) {
            log('green', '🏆', '優秀: CI/CD統合テスト全て成功');
        } else if (qualityMetrics.successRate >= 80) {
            log('yellow', '⚠️', '良好: 一部の問題あり、継続監視必要');
        } else {
            log('red', '🚨', '要改善: CI/CDプロセスの改善が必要');
        }
        
        // GitHub Actions用の出力
        if (process.env.GITHUB_OUTPUT) {
            const outputData = [
                `success_rate=${qualityMetrics.successRate}`,
                `total_tests=${qualityMetrics.totalTests}`,
                `passed_tests=${qualityMetrics.passedTests}`,
                `failed_tests=${qualityMetrics.failedTests}`,
                `artifacts_count=${cicdResults.artifacts.length}`
            ].join('\n');
            
            await fs.writeFile(process.env.GITHUB_OUTPUT, outputData, 'utf8');
            log('green', '📤', 'GitHub Actions出力ファイル作成完了');
        }
        
        process.exit(qualityMetrics.failedTests > 0 ? 1 : 0);
        
    } catch (error) {
        log('red', '💀', `Phase 2-C テスト実行エラー: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    log('red', '💀', `未処理のPromise拒否: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
});

// 実行
if (require.main === module) {
    main();
}

module.exports = {
    runPhase2CTests,
    CICDUtils,
    cicdResults
};