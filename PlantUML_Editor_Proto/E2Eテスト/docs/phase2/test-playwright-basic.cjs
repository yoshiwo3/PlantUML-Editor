/**
 * Playwright基本動作検証テスト
 * 最小限の機能でPlaywright環境を検証
 */

const { chromium } = require('playwright');

// カラー出力用のANSIコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// ログ関数
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`)
};

// メインテスト関数
async function runBasicTests() {
  console.log(`${colors.cyan}${'='.repeat(60)}`);
  console.log('  Playwright 基本動作検証テスト');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  let browser = null;
  let context = null;
  let page = null;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 1. ブラウザ起動テスト
    log.info('Test 1: ブラウザ起動');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    log.success('ブラウザが正常に起動しました');
    testsPassed++;

    // 2. コンテキスト作成テスト
    log.info('Test 2: ブラウザコンテキスト作成');
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    });
    log.success('コンテキストが作成されました');
    testsPassed++;

    // 3. ページ作成テスト
    log.info('Test 3: 新規ページ作成');
    page = await context.newPage();
    log.success('ページが作成されました');
    testsPassed++;

    // 4. ナビゲーションテスト
    log.info('Test 4: ページナビゲーション');
    const testUrl = process.env.TEST_URL || 'http://host.docker.internal:8086';
    try {
      await page.goto(testUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      log.success(`${testUrl} への接続成功`);
      testsPassed++;
    } catch (navError) {
      log.warning(`${testUrl} への接続失敗（サーバー未起動の可能性）`);
      // 代替URLでテスト
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      log.success('代替URL (example.com) への接続成功');
      testsPassed++;
    }

    // 5. ページタイトル取得テスト
    log.info('Test 5: ページタイトル取得');
    const title = await page.title();
    log.success(`タイトル取得成功: "${title}"`);
    testsPassed++;

    // 6. スクリーンショット取得テスト
    log.info('Test 6: スクリーンショット取得');
    const screenshotPath = `test-screenshot-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log.success(`スクリーンショット保存: ${screenshotPath}`);
    testsPassed++;

    // 7. ページ評価テスト
    log.info('Test 7: JavaScript実行');
    const userAgent = await page.evaluate(() => navigator.userAgent);
    log.success(`User Agent: ${userAgent.substring(0, 50)}...`);
    testsPassed++;

    // 8. セレクター待機テスト
    log.info('Test 8: セレクター存在確認');
    try {
      await page.waitForSelector('body', { timeout: 5000 });
      log.success('body要素の存在を確認');
      testsPassed++;
    } catch (error) {
      log.error('body要素が見つかりません');
      testsFailed++;
    }

    // 9. ネットワークイベントテスト
    log.info('Test 9: ネットワークイベント監視');
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.reload();
    log.success(`${requests.length}件のネットワークリクエストを検出`);
    testsPassed++;

    // 10. コンソールメッセージ監視テスト
    log.info('Test 10: コンソールメッセージ監視');
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    await page.evaluate(() => console.log('Playwright test message'));
    log.success(`${consoleMessages.length}件のコンソールメッセージを検出`);
    testsPassed++;

  } catch (error) {
    log.error(`エラー発生: ${error.message}`);
    testsFailed++;
  } finally {
    // クリーンアップ
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }

  // テスト結果サマリー
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log('  テスト結果サマリー');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.green}成功: ${testsPassed}件${colors.reset}`);
  console.log(`${colors.red}失敗: ${testsFailed}件${colors.reset}`);
  console.log(`合計: ${testsPassed + testsFailed}件\n`);

  if (testsFailed === 0) {
    log.success('すべてのテストが成功しました！');
    process.exit(0);
  } else {
    log.error(`${testsFailed}件のテストが失敗しました`);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// テスト実行
runBasicTests().catch(error => {
  log.error(`致命的エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});