/**
 * PlantUMLエディタ機能テスト
 * Docker環境での包括的なE2Eテスト
 */

const { chromium, firefox, webkit } = require('playwright');

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

// テストケース定義
const testCases = [
  {
    name: 'ユースケース図変換',
    input: 'ユーザーがシステムにログインする',
    expectedPattern: /@startuml.*@enduml/s
  },
  {
    name: 'シーケンス図変換',
    input: 'AがBにメッセージを送信する',
    expectedPattern: /->|-->/
  },
  {
    name: 'クラス図変換',
    input: 'Userクラスはnameとemailプロパティを持つ',
    expectedPattern: /class.*\{/
  },
  {
    name: 'アクティビティ図変換',
    input: '開始→処理1→処理2→終了',
    expectedPattern: /start|stop|:.*:/
  }
];

// ブラウザ設定
const browsers = [
  { name: 'Chromium', launcher: chromium },
  { name: 'Firefox', launcher: firefox },
  { name: 'WebKit', launcher: webkit }
];

// メインテスト関数
async function runEditorTests() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log('  PlantUMLエディタ E2Eテスト');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const isDocker = process.env.DOCKER_ENV === 'true';
  const baseUrl = isDocker ? 'http://host.docker.internal:8087' : 'http://localhost:8087';
  
  log.info(`環境: ${isDocker ? 'Docker' : 'Local'}`);
  log.info(`URL: ${baseUrl}`);
  log.info(`Node.js: ${process.version}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  // 各ブラウザでテスト実行
  for (const browserConfig of browsers) {
    log.test(`${browserConfig.name}でテスト開始`);
    
    let browser = null;
    let page = null;
    
    try {
      // ブラウザ起動
      browser = await browserConfig.launcher.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo'
      });
      
      page = await context.newPage();
      
      // PlantUMLエディタにアクセス
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      
      // ページタイトル確認
      const title = await page.title();
      if (title) {
        log.success(`${browserConfig.name}: ページ読み込み成功 - "${title}"`);
        results.passed++;
      } else {
        log.error(`${browserConfig.name}: ページタイトル取得失敗`);
        results.failed++;
      }
      results.total++;
      
      // 各テストケース実行
      for (const testCase of testCases) {
        log.info(`  テスト: ${testCase.name}`);
        
        try {
          // テキストエリアをクリア
          const textarea = await page.$('textarea');
          if (!textarea) {
            log.warning(`    テキストエリアが見つかりません`);
            results.skipped++;
            results.total++;
            continue;
          }
          
          // テキスト入力
          await textarea.fill('');
          await textarea.fill(testCase.input);
          
          // 変換実行（複数の方法を試す）
          let converted = false;
          
          // 方法1: Enterキー
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
          
          // 方法2: 変換ボタンを探す
          const buttons = await page.$$('button');
          for (const button of buttons) {
            const text = await button.textContent();
            if (text && (text.includes('変換') || text.includes('Convert'))) {
              await button.click();
              converted = true;
              break;
            }
          }
          
          // 結果を待つ
          await page.waitForTimeout(2000);
          
          // 結果の確認
          const preElements = await page.$$('pre');
          let resultFound = false;
          
          for (const pre of preElements) {
            const content = await pre.textContent();
            if (content && testCase.expectedPattern.test(content)) {
              log.success(`    ${testCase.name}: 成功`);
              results.passed++;
              resultFound = true;
              break;
            }
          }
          
          if (!resultFound) {
            // ページ全体のテキストを確認
            const pageContent = await page.content();
            if (testCase.expectedPattern.test(pageContent)) {
              log.success(`    ${testCase.name}: 成功（ページ内容）`);
              results.passed++;
            } else {
              log.warning(`    ${testCase.name}: 期待する結果が見つかりません`);
              results.failed++;
            }
          }
          
          results.total++;
          
        } catch (error) {
          log.error(`    ${testCase.name}: エラー - ${error.message}`);
          results.failed++;
          results.total++;
        }
      }
      
      // スクリーンショット
      const screenshotPath = `test-${browserConfig.name.toLowerCase()}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      log.info(`  スクリーンショット: ${screenshotPath}`);
      
      // パフォーマンス測定
      const performanceMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          loadComplete: perf.loadEventEnd - perf.loadEventStart,
          responseTime: perf.responseEnd - perf.requestStart
        };
      });
      
      log.info(`  パフォーマンス:`);
      log.info(`    DOM読み込み: ${performanceMetrics.domContentLoaded}ms`);
      log.info(`    完全読み込み: ${performanceMetrics.loadComplete}ms`);
      log.info(`    レスポンス時間: ${performanceMetrics.responseTime}ms`);
      
      results.details.push({
        browser: browserConfig.name,
        performance: performanceMetrics,
        screenshot: screenshotPath
      });
      
    } catch (error) {
      log.error(`${browserConfig.name}: 致命的エラー - ${error.message}`);
      results.failed++;
      results.total++;
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
    
    console.log(''); // 改行
  }

  // 結果サマリー
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log('  テスト結果サマリー');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const successRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : 0;
  
  console.log(`${colors.green}✓ 成功: ${results.passed}/${results.total}${colors.reset}`);
  console.log(`${colors.red}✗ 失敗: ${results.failed}/${results.total}${colors.reset}`);
  console.log(`${colors.yellow}⊘ スキップ: ${results.skipped}/${results.total}${colors.reset}`);
  console.log(`\n成功率: ${successRate}%\n`);

  // ブラウザ別結果
  console.log('ブラウザ別パフォーマンス:');
  results.details.forEach(detail => {
    console.log(`  ${detail.browser}:`);
    console.log(`    - DOM: ${detail.performance.domContentLoaded}ms`);
    console.log(`    - Load: ${detail.performance.loadComplete}ms`);
    console.log(`    - Response: ${detail.performance.responseTime}ms`);
  });

  // 終了コード
  const exitCode = results.failed > 0 ? 1 : 0;
  
  if (exitCode === 0) {
    log.success('\nすべてのテストが成功しました！');
  } else {
    log.error(`\n${results.failed}件のテストが失敗しました`);
  }
  
  process.exit(exitCode);
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// 環境変数設定（Docker環境用）
if (process.env.DOCKER_ENV === 'true' || process.env.HOSTNAME?.includes('docker')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/root/.cache/ms-playwright';
}

// テスト実行
runEditorTests().catch(error => {
  log.error(`実行エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});