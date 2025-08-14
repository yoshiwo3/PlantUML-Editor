/**
 * クロスブラウザテスト（Docker環境用）
 * Chromium, Firefox, MSEdgeでの動作確認
 */

const { chromium, firefox } = require('playwright');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// ログ関数
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}▶ ${msg}${colors.reset}`)
};

// ブラウザ設定（WebKitを除外）
const browsers = [
  { 
    name: 'Chromium', 
    launcher: chromium,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  },
  { 
    name: 'Firefox', 
    launcher: firefox,
    args: []
  },
  { 
    name: 'MSEdge', 
    launcher: chromium,
    channel: 'msedge',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  }
];

// 基本的な動作テスト
async function testBasicFunctionality(page, browserName) {
  const tests = [];
  
  // Test 1: ページ読み込み
  try {
    const title = await page.title();
    tests.push({ name: 'ページ読み込み', status: 'PASS', value: title });
  } catch (error) {
    tests.push({ name: 'ページ読み込み', status: 'FAIL', error: error.message });
  }
  
  // Test 2: テキストエリア存在確認
  try {
    const textarea = await page.$('textarea');
    if (textarea) {
      tests.push({ name: 'テキストエリア検出', status: 'PASS' });
    } else {
      tests.push({ name: 'テキストエリア検出', status: 'FAIL' });
    }
  } catch (error) {
    tests.push({ name: 'テキストエリア検出', status: 'FAIL', error: error.message });
  }
  
  // Test 3: 基本的な入力テスト
  try {
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.fill('テストユーザーがシステムを使用する');
      const value = await textarea.inputValue();
      if (value === 'テストユーザーがシステムを使用する') {
        tests.push({ name: '入力テスト', status: 'PASS' });
      } else {
        tests.push({ name: '入力テスト', status: 'FAIL', value });
      }
    }
  } catch (error) {
    tests.push({ name: '入力テスト', status: 'FAIL', error: error.message });
  }
  
  // Test 4: ボタン検出
  try {
    const buttons = await page.$$('button');
    tests.push({ name: 'ボタン検出', status: 'PASS', count: buttons.length });
  } catch (error) {
    tests.push({ name: 'ボタン検出', status: 'FAIL', error: error.message });
  }
  
  // Test 5: JavaScript実行
  try {
    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50),
        language: navigator.language
      };
    });
    tests.push({ name: 'JavaScript実行', status: 'PASS', data: result });
  } catch (error) {
    tests.push({ name: 'JavaScript実行', status: 'FAIL', error: error.message });
  }
  
  // Test 6: コンソールエラーチェック
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  await page.waitForTimeout(1000);
  
  if (consoleErrors.length === 0) {
    tests.push({ name: 'コンソールエラー', status: 'PASS' });
  } else {
    tests.push({ name: 'コンソールエラー', status: 'WARN', errors: consoleErrors });
  }
  
  return tests;
}

// メインテスト関数
async function runCrossBrowserTests() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log('  クロスブラウザテスト（Docker環境）');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.HOSTNAME?.includes('docker');
  const baseUrl = isDocker ? 'http://host.docker.internal:8087' : 'http://localhost:8087';
  
  log.info(`環境: ${isDocker ? 'Docker Container' : 'Local'}`);
  log.info(`URL: ${baseUrl}`);
  log.info(`Node.js: ${process.version}`);
  log.info(`Platform: ${process.platform}\n`);

  const allResults = [];

  // 各ブラウザでテスト
  for (const browserConfig of browsers) {
    log.test(`${browserConfig.name} テスト開始`);
    
    let browser = null;
    let page = null;
    const browserResults = {
      browser: browserConfig.name,
      tests: [],
      performance: {},
      screenshot: null
    };
    
    try {
      // ブラウザ起動
      const launchOptions = {
        headless: true,
        args: browserConfig.args
      };
      
      if (browserConfig.channel) {
        launchOptions.channel = browserConfig.channel;
      }
      
      const startTime = Date.now();
      browser = await browserConfig.launcher.launch(launchOptions);
      const launchTime = Date.now() - startTime;
      
      log.success(`${browserConfig.name} 起動成功 (${launchTime}ms)`);
      
      // コンテキストとページ作成
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo',
        userAgent: `PlantUML-Test/${browserConfig.name}/1.0`
      });
      
      page = await context.newPage();
      
      // ページアクセス
      const navigationStart = Date.now();
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      const navigationTime = Date.now() - navigationStart;
      
      log.info(`  ナビゲーション時間: ${navigationTime}ms`);
      browserResults.performance.navigation = navigationTime;
      
      // 基本機能テスト
      const testResults = await testBasicFunctionality(page, browserConfig.name);
      browserResults.tests = testResults;
      
      // テスト結果表示
      testResults.forEach(test => {
        if (test.status === 'PASS') {
          log.success(`  ${test.name}: 成功`);
        } else if (test.status === 'WARN') {
          log.warning(`  ${test.name}: 警告`);
        } else {
          log.error(`  ${test.name}: 失敗`);
        }
        
        if (test.value) log.info(`    値: ${test.value}`);
        if (test.count !== undefined) log.info(`    数: ${test.count}`);
        if (test.error) log.error(`    エラー: ${test.error}`);
      });
      
      // スクリーンショット
      const screenshotPath = `cross-browser-${browserConfig.name.toLowerCase()}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      browserResults.screenshot = screenshotPath;
      log.info(`  スクリーンショット: ${screenshotPath}`);
      
      // パフォーマンスメトリクス
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart),
          loadComplete: Math.round(perf.loadEventEnd - perf.loadEventStart)
        };
      });
      
      browserResults.performance = { ...browserResults.performance, ...metrics };
      log.info(`  DOM読み込み: ${metrics.domContentLoaded}ms`);
      log.info(`  完全読み込み: ${metrics.loadComplete}ms`);
      
    } catch (error) {
      log.error(`${browserConfig.name}: エラー - ${error.message}`);
      browserResults.error = error.message;
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
    
    allResults.push(browserResults);
    console.log(''); // 改行
  }

  // 結果サマリー
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log('  テスト結果サマリー');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  // 統計計算
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let warnTests = 0;

  allResults.forEach(result => {
    console.log(`${colors.cyan}${result.browser}:${colors.reset}`);
    
    if (result.error) {
      console.log(`  ${colors.red}起動エラー: ${result.error}${colors.reset}`);
    } else {
      const passed = result.tests.filter(t => t.status === 'PASS').length;
      const failed = result.tests.filter(t => t.status === 'FAIL').length;
      const warned = result.tests.filter(t => t.status === 'WARN').length;
      
      totalTests += result.tests.length;
      passedTests += passed;
      failedTests += failed;
      warnTests += warned;
      
      console.log(`  成功: ${passed}/${result.tests.length}`);
      console.log(`  失敗: ${failed}/${result.tests.length}`);
      if (warned > 0) console.log(`  警告: ${warned}/${result.tests.length}`);
      
      if (result.performance.navigation) {
        console.log(`  パフォーマンス:`);
        console.log(`    - ナビゲーション: ${result.performance.navigation}ms`);
        console.log(`    - DOM: ${result.performance.domContentLoaded}ms`);
        console.log(`    - Load: ${result.performance.loadComplete}ms`);
      }
    }
    console.log('');
  });

  // 全体統計
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
  
  console.log(`${colors.magenta}全体統計:${colors.reset}`);
  console.log(`  ${colors.green}成功: ${passedTests}/${totalTests} (${successRate}%)${colors.reset}`);
  console.log(`  ${colors.red}失敗: ${failedTests}/${totalTests}${colors.reset}`);
  if (warnTests > 0) {
    console.log(`  ${colors.yellow}警告: ${warnTests}/${totalTests}${colors.reset}`);
  }

  // 終了
  if (failedTests === 0) {
    log.success('\n✅ すべてのブラウザでテスト成功！');
    process.exit(0);
  } else {
    log.error(`\n❌ ${failedTests}件のテストが失敗しました`);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Docker環境設定
if (process.env.DOCKER_ENV === 'true' || process.env.HOSTNAME?.includes('docker')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/root/.cache/ms-playwright';
}

// 実行
runCrossBrowserTests().catch(error => {
  log.error(`実行エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});