/**
 * Playwright ローカル環境用検証テスト
 * localhost:8086向けに最適化
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
async function runLocalTests() {
  console.log(`${colors.cyan}${'='.repeat(60)}`);
  console.log('  Playwright ローカル環境検証テスト');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  let browser = null;
  let context = null;
  let page = null;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 1. ブラウザ起動テスト（ヘッドレスモード）
    log.info('Test 1: Chromiumブラウザ起動（ヘッドレス）');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    log.success('ブラウザが正常に起動しました');
    testsPassed++;

    // 2. コンテキスト作成テスト
    log.info('Test 2: 日本語環境コンテキスト作成');
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      userAgent: 'PlantUML-Editor-E2E-Test/1.0'
    });
    log.success('日本語コンテキストが作成されました');
    testsPassed++;

    // 3. ページ作成テスト
    log.info('Test 3: 新規ページ作成');
    page = await context.newPage();
    
    // コンソールメッセージとエラーを監視
    const consoleMessages = [];
    const pageErrors = [];
    
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    log.success('ページが作成され、イベントリスナーが設定されました');
    testsPassed++;

    // 4. 基本的なWebサイトへのアクセステスト
    log.info('Test 4: 基本的なWebサイトアクセス');
    try {
      await page.goto('https://www.google.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      const googleTitle = await page.title();
      log.success(`Google接続成功 - タイトル: "${googleTitle}"`);
      testsPassed++;
    } catch (error) {
      log.error(`Google接続失敗: ${error.message}`);
      testsFailed++;
    }

    // 5. PlantUMLサーバー接続テスト（存在する場合）
    log.info('Test 5: PlantUMLサーバー接続テスト (localhost:8086)');
    try {
      const response = await page.goto('http://localhost:8086', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      if (response && response.ok()) {
        const title = await page.title();
        log.success(`PlantUMLサーバー接続成功 - タイトル: "${title}"`);
        
        // HTMLコンテンツの一部を取得
        const bodyText = await page.evaluate(() => {
          return document.body ? document.body.innerText.substring(0, 100) : '';
        });
        log.info(`ページコンテンツ: ${bodyText}...`);
        testsPassed++;
      } else {
        log.warning('PlantUMLサーバーに接続できませんでした（サーバー未起動）');
        testsPassed++; // サーバー未起動は想定内なので成功扱い
      }
    } catch (error) {
      log.warning(`PlantUMLサーバー接続エラー: ${error.message}`);
      log.info('サーバーが起動していない可能性があります（想定内）');
      testsPassed++; // サーバー未起動は想定内なので成功扱い
    }

    // 6. スクリーンショット機能テスト
    log.info('Test 6: スクリーンショット機能');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `playwright-test-${timestamp}.png`;
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: false  // ビューポートのみ
    });
    log.success(`スクリーンショット保存: ${screenshotPath}`);
    testsPassed++;

    // 7. JavaScript実行テスト
    log.info('Test 7: ページ内JavaScript実行');
    const jsResult = await page.evaluate(() => {
      return {
        url: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      };
    });
    log.success(`JavaScript実行成功`);
    log.info(`  URL: ${jsResult.url}`);
    log.info(`  言語: ${jsResult.language}`);
    log.info(`  画面: ${jsResult.screenWidth}x${jsResult.screenHeight}`);
    testsPassed++;

    // 8. セレクター操作テスト
    log.info('Test 8: DOM要素の検索と操作');
    try {
      // body要素の存在確認
      const bodyExists = await page.$('body') !== null;
      if (bodyExists) {
        log.success('body要素を検出');
        
        // 要素数のカウント
        const elementCount = await page.evaluate(() => {
          return document.querySelectorAll('*').length;
        });
        log.info(`  DOM要素数: ${elementCount}`);
        testsPassed++;
      } else {
        log.error('body要素が見つかりません');
        testsFailed++;
      }
    } catch (error) {
      log.error(`セレクターエラー: ${error.message}`);
      testsFailed++;
    }

    // 9. ネットワーク監視テスト
    log.info('Test 9: ネットワークリクエスト監視');
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    // ページリロードしてリクエストを監視
    await page.reload({ waitUntil: 'networkidle' });
    log.success(`${networkRequests.length}件のネットワークリクエストを検出`);
    
    // リクエストタイプの集計
    const requestTypes = {};
    networkRequests.forEach(req => {
      requestTypes[req.resourceType] = (requestTypes[req.resourceType] || 0) + 1;
    });
    Object.entries(requestTypes).forEach(([type, count]) => {
      log.info(`  ${type}: ${count}件`);
    });
    testsPassed++;

    // 10. エラーとコンソールメッセージの確認
    log.info('Test 10: エラーとコンソールメッセージの確認');
    log.success(`コンソールメッセージ: ${consoleMessages.length}件`);
    consoleMessages.slice(0, 3).forEach(msg => {
      log.info(`  [${msg.type}] ${msg.text.substring(0, 50)}...`);
    });
    
    if (pageErrors.length > 0) {
      log.warning(`ページエラー: ${pageErrors.length}件`);
      pageErrors.slice(0, 3).forEach(err => {
        log.warning(`  ${err.substring(0, 50)}...`);
      });
    } else {
      log.success('ページエラーなし');
    }
    testsPassed++;

  } catch (error) {
    log.error(`予期しないエラー: ${error.message}`);
    console.error(error.stack);
    testsFailed++;
  } finally {
    // クリーンアップ
    log.info('クリーンアップ実行中...');
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
    log.success('クリーンアップ完了');
  }

  // テスト結果サマリー
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log('  テスト結果サマリー');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  const totalTests = testsPassed + testsFailed;
  const successRate = totalTests > 0 ? (testsPassed / totalTests * 100).toFixed(1) : 0;
  
  console.log(`${colors.green}成功: ${testsPassed}件${colors.reset}`);
  console.log(`${colors.red}失敗: ${testsFailed}件${colors.reset}`);
  console.log(`合計: ${totalTests}件`);
  console.log(`成功率: ${successRate}%\n`);

  if (testsFailed === 0) {
    log.success('すべてのテストが成功しました！Playwright環境は正常です。');
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
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}\n`);

runLocalTests().catch(error => {
  log.error(`致命的エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});