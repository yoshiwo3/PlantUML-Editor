/**
 * Docker環境用Playwright検証テスト
 * ポート8087のPlantUMLサーバーに対応
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

// テスト実行環境の判定
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.HOSTNAME?.includes('docker');
const testUrl = isDocker ? 'http://host.docker.internal:8087' : 'http://localhost:8087';

async function runDockerValidation() {
  console.log(`${colors.cyan}${'='.repeat(60)}`);
  console.log('  Docker環境 Playwright検証テスト');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  log.info(`実行環境: ${isDocker ? 'Docker Container' : 'Local'}`);
  log.info(`Node.js: ${process.version}`);
  log.info(`Platform: ${process.platform}`);
  log.info(`テストURL: ${testUrl}\n`);

  let browser = null;
  let page = null;
  let testResults = [];

  try {
    // Test 1: ブラウザ起動
    log.info('Test 1: Chromiumブラウザ起動');
    const startTime = Date.now();
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    const launchTime = Date.now() - startTime;
    log.success(`ブラウザ起動成功 (${launchTime}ms)`);
    testResults.push({ name: 'Browser Launch', status: 'PASS', time: launchTime });

    // Test 2: ページ作成
    log.info('Test 2: ページ作成とコンテキスト設定');
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    });
    page = await context.newPage();
    log.success('ページ作成成功');
    testResults.push({ name: 'Page Creation', status: 'PASS' });

    // Test 3: PlantUMLサーバー接続
    log.info('Test 3: PlantUMLサーバー接続テスト');
    try {
      const response = await page.goto(testUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      if (response && response.ok()) {
        const title = await page.title();
        log.success(`サーバー接続成功: ${title}`);
        testResults.push({ name: 'Server Connection', status: 'PASS' });
      } else {
        log.error(`サーバー応答エラー: ${response?.status()}`);
        testResults.push({ name: 'Server Connection', status: 'FAIL' });
      }
    } catch (error) {
      log.error(`サーバー接続失敗: ${error.message}`);
      testResults.push({ name: 'Server Connection', status: 'FAIL', error: error.message });
    }

    // Test 4: ページ要素の確認
    log.info('Test 4: ページ要素の確認');
    try {
      // テキストエリアの存在確認
      const textarea = await page.$('textarea');
      if (textarea) {
        log.success('テキストエリア検出');
        testResults.push({ name: 'Textarea Detection', status: 'PASS' });
      } else {
        log.warning('テキストエリアが見つかりません');
        testResults.push({ name: 'Textarea Detection', status: 'FAIL' });
      }

      // ボタンの存在確認
      const buttons = await page.$$('button');
      log.success(`${buttons.length}個のボタンを検出`);
      testResults.push({ name: 'Button Detection', status: 'PASS', count: buttons.length });
    } catch (error) {
      log.error(`要素検出エラー: ${error.message}`);
      testResults.push({ name: 'Element Detection', status: 'FAIL' });
    }

    // Test 5: JavaScript実行テスト
    log.info('Test 5: JavaScript実行テスト');
    try {
      const jsResult = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          hasTextarea: !!document.querySelector('textarea'),
          buttonCount: document.querySelectorAll('button').length
        };
      });
      log.success('JavaScript実行成功');
      log.info(`  Title: ${jsResult.title}`);
      log.info(`  URL: ${jsResult.url}`);
      log.info(`  Textarea: ${jsResult.hasTextarea ? '有' : '無'}`);
      log.info(`  Buttons: ${jsResult.buttonCount}`);
      testResults.push({ name: 'JavaScript Execution', status: 'PASS', data: jsResult });
    } catch (error) {
      log.error(`JavaScript実行エラー: ${error.message}`);
      testResults.push({ name: 'JavaScript Execution', status: 'FAIL' });
    }

    // Test 6: スクリーンショット
    log.info('Test 6: スクリーンショット取得');
    try {
      const screenshotPath = `docker-test-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      log.success(`スクリーンショット保存: ${screenshotPath}`);
      testResults.push({ name: 'Screenshot', status: 'PASS', file: screenshotPath });
    } catch (error) {
      log.error(`スクリーンショットエラー: ${error.message}`);
      testResults.push({ name: 'Screenshot', status: 'FAIL' });
    }

    // Test 7: PlantUML変換テスト
    log.info('Test 7: PlantUML変換機能テスト');
    try {
      // テキストエリアに入力
      const textarea = await page.$('textarea');
      if (textarea) {
        await textarea.fill('ユーザーがシステムにログインする');
        log.info('テキスト入力完了');
        
        // 変換ボタンをクリック
        const convertButton = await page.$('button:has-text("変換")');
        if (convertButton) {
          await convertButton.click();
          log.info('変換ボタンクリック');
          
          // 結果を待つ
          await page.waitForTimeout(2000);
          
          // 結果の確認
          const result = await page.evaluate(() => {
            const preElements = document.querySelectorAll('pre');
            return preElements.length > 0 ? preElements[0].textContent : null;
          });
          
          if (result) {
            log.success('PlantUML変換成功');
            log.info(`結果: ${result.substring(0, 50)}...`);
            testResults.push({ name: 'PlantUML Conversion', status: 'PASS' });
          } else {
            log.warning('変換結果が見つかりません');
            testResults.push({ name: 'PlantUML Conversion', status: 'FAIL' });
          }
        } else {
          log.warning('変換ボタンが見つかりません');
          testResults.push({ name: 'PlantUML Conversion', status: 'SKIP' });
        }
      } else {
        log.warning('テキストエリアが見つかりません');
        testResults.push({ name: 'PlantUML Conversion', status: 'SKIP' });
      }
    } catch (error) {
      log.error(`変換テストエラー: ${error.message}`);
      testResults.push({ name: 'PlantUML Conversion', status: 'FAIL' });
    }

  } catch (error) {
    log.error(`致命的エラー: ${error.message}`);
    testResults.push({ name: 'Fatal Error', status: 'FAIL', error: error.message });
  } finally {
    // クリーンアップ
    if (page) await page.close();
    if (browser) await browser.close();
  }

  // 結果サマリー
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log('  テスト結果サマリー');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;
  const total = testResults.length;

  console.log(`${colors.green}✓ PASS: ${passed}/${total}${colors.reset}`);
  if (failed > 0) console.log(`${colors.red}✗ FAIL: ${failed}/${total}${colors.reset}`);
  if (skipped > 0) console.log(`${colors.yellow}⊘ SKIP: ${skipped}/${total}${colors.reset}`);
  
  console.log(`\n成功率: ${((passed / total) * 100).toFixed(1)}%`);

  // 詳細結果
  console.log('\n詳細結果:');
  testResults.forEach(result => {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⊘';
    const color = result.status === 'PASS' ? colors.green : result.status === 'FAIL' ? colors.red : colors.yellow;
    console.log(`${color}${icon} ${result.name}${colors.reset}`);
    if (result.error) {
      console.log(`  └─ ${result.error}`);
    }
  });

  process.exit(failed > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// 実行
runDockerValidation().catch(error => {
  log.error(`実行エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});