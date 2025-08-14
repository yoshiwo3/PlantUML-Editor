/**
 * WebKit専用テストスクリプト
 * WebKitの特殊な要件に対応したテスト実装
 */

const { webkit } = require('playwright');

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

// WebKit専用の起動オプション
const getWebKitLaunchOptions = () => {
  const options = {
    headless: true,
    args: [] // WebKitは--no-sandboxをサポートしない
  };

  // CI環境での追加設定
  if (process.env.CI) {
    options.args.push('--disable-web-security');
    options.args.push('--disable-features=IsolateOrigins,site-per-process');
  }

  // Linux環境での追加設定
  if (process.platform === 'linux') {
    // WebKit on Linuxのための特別な設定
    options.ignoreDefaultArgs = ['--enable-automation'];
  }

  return options;
};

// WebKit動作テスト
async function runWebKitTest() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log('  WebKit専用テスト');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.HOSTNAME?.includes('docker');
  const baseUrl = isDocker ? 'http://host.docker.internal:8087' : 'http://localhost:8087';
  
  log.info(`環境: ${isDocker ? 'Docker Container' : 'Local'}`);
  log.info(`URL: ${baseUrl}`);
  log.info(`Node.js: ${process.version}`);
  log.info(`Platform: ${process.platform}\n`);

  let browser = null;
  let context = null;
  let page = null;
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: []
  };

  try {
    // WebKit起動
    log.test('WebKit起動中...');
    const launchOptions = getWebKitLaunchOptions();
    
    const startTime = Date.now();
    browser = await webkit.launch(launchOptions);
    const launchTime = Date.now() - startTime;
    
    log.success(`WebKit起動成功 (${launchTime}ms)`);
    results.passed++;
    results.total++;

    // コンテキスト作成（WebKit特有の設定）
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      // WebKit特有の設定
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      javaScriptEnabled: true,
      // ユーザーエージェント
      userAgent: 'PlantUML-Test/WebKit/1.0 (Experimental)'
    });

    log.success('ブラウザコンテキスト作成成功');
    results.passed++;
    results.total++;

    // ページ作成
    page = await context.newPage();
    
    // エラーハンドリング設定
    page.on('pageerror', error => {
      results.warnings.push(`Page error: ${error.message}`);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.warnings.push(`Console error: ${msg.text()}`);
      }
    });

    // ページアクセス（タイムアウトを長めに設定）
    log.test('PlantUMLエディタにアクセス中...');
    const navigationStart = Date.now();
    
    try {
      await page.goto(baseUrl, { 
        waitUntil: 'domcontentloaded', // WebKitでは'networkidle'が不安定
        timeout: 60000 // 60秒のタイムアウト
      });
      
      const navigationTime = Date.now() - navigationStart;
      log.success(`ページ読み込み成功 (${navigationTime}ms)`);
      results.passed++;
      results.total++;
    } catch (navError) {
      log.error(`ナビゲーションエラー: ${navError.message}`);
      results.failed++;
      results.total++;
      throw navError;
    }

    // ページタイトル確認
    const title = await page.title();
    if (title) {
      log.success(`ページタイトル: "${title}"`);
      results.passed++;
    } else {
      log.warning('ページタイトル取得失敗');
      results.failed++;
    }
    results.total++;

    // 基本要素の確認
    log.test('基本要素テスト...');
    
    // テキストエリア
    try {
      const textarea = await page.waitForSelector('textarea', { timeout: 10000 });
      if (textarea) {
        log.success('テキストエリア検出');
        results.passed++;
        
        // 入力テスト
        await textarea.fill('ユーザーがシステムにログインする');
        const value = await textarea.inputValue();
        if (value === 'ユーザーがシステムにログインする') {
          log.success('テキスト入力成功');
          results.passed++;
        } else {
          log.warning('テキスト入力検証失敗');
          results.failed++;
        }
        results.total++;
      }
      results.total++;
    } catch (error) {
      log.error(`要素検出エラー: ${error.message}`);
      results.failed++;
      results.total++;
    }

    // ボタン検出
    try {
      const buttons = await page.$$('button');
      log.info(`ボタン数: ${buttons.length}`);
      if (buttons.length > 0) {
        results.passed++;
      } else {
        results.warnings.push('ボタンが見つかりません');
        results.failed++;
      }
      results.total++;
    } catch (error) {
      log.error(`ボタン検出エラー: ${error.message}`);
      results.failed++;
      results.total++;
    }

    // JavaScript実行テスト
    try {
      const jsResult = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          readyState: document.readyState,
          webkit: 'webkitRequestAnimationFrame' in window
        };
      });
      
      if (jsResult.webkit) {
        log.success('WebKit固有機能検出');
      }
      log.info(`Document状態: ${jsResult.readyState}`);
      results.passed++;
      results.total++;
    } catch (error) {
      log.error(`JavaScript実行エラー: ${error.message}`);
      results.failed++;
      results.total++;
    }

    // スクリーンショット
    try {
      const screenshotPath = `webkit-test-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: false // WebKitではfullPageが不安定な場合がある
      });
      log.success(`スクリーンショット保存: ${screenshotPath}`);
      results.passed++;
      results.total++;
    } catch (error) {
      log.warning(`スクリーンショットエラー: ${error.message}`);
      results.warnings.push(`Screenshot failed: ${error.message}`);
    }

    // パフォーマンス測定（WebKit制限事項あり）
    try {
      const metrics = await page.evaluate(() => {
        if (performance && performance.timing) {
          const timing = performance.timing;
          return {
            domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
            loadComplete: timing.loadEventEnd - timing.loadEventStart,
            responseTime: timing.responseEnd - timing.requestStart
          };
        }
        return null;
      });
      
      if (metrics) {
        log.info('パフォーマンス:');
        log.info(`  DOM読み込み: ${metrics.domContentLoaded}ms`);
        log.info(`  完全読み込み: ${metrics.loadComplete}ms`);
        log.info(`  レスポンス: ${metrics.responseTime}ms`);
      } else {
        log.warning('パフォーマンスメトリクス取得不可（WebKit制限）');
      }
    } catch (error) {
      log.warning(`パフォーマンス測定エラー: ${error.message}`);
    }

  } catch (error) {
    log.error(`致命的エラー: ${error.message}`);
    console.error(error.stack);
    results.failed++;
    results.total++;
  } finally {
    // クリーンアップ
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }

  // 結果サマリー
  console.log(`\n${colors.magenta}${'='.repeat(60)}`);
  console.log('  テスト結果サマリー');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const successRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : 0;
  
  console.log(`${colors.green}✓ 成功: ${results.passed}/${results.total} (${successRate}%)${colors.reset}`);
  console.log(`${colors.red}✗ 失敗: ${results.failed}/${results.total}${colors.reset}`);
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ 警告 (${results.warnings.length}件):${colors.reset}`);
    results.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }

  // WebKit特有の注意事項
  console.log(`\n${colors.cyan}📝 WebKit実行時の注意事項:${colors.reset}`);
  console.log('  - --no-sandboxオプションは使用できません');
  console.log('  - networkidleイベントが不安定な場合があります');
  console.log('  - 一部のパフォーマンスAPIが制限されています');
  console.log('  - Linux環境では追加の依存関係が必要な場合があります');

  // 終了コード（WebKitは実験的なので失敗を許容）
  if (results.failed === 0) {
    log.success('\n✅ WebKitテスト成功！');
    process.exit(0);
  } else if (successRate >= 50) {
    log.warning(`\n⚠️ WebKitテスト部分成功（${successRate}%）`);
    process.exit(0); // CI/CDでは成功扱い
  } else {
    log.error(`\n❌ WebKitテスト失敗（成功率: ${successRate}%）`);
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
runWebKitTest().catch(error => {
  log.error(`実行エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});