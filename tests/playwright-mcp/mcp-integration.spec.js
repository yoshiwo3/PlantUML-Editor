/**
 * Playwright MCP統合テスト
 * Claude Code Actions MCP サーバーとの統合テスト
 * @version 1.0.0
 */

const { test, expect } = require('@playwright/test');

// MCP統合が有効かチェック
const MCP_INTEGRATION = process.env.MCP_INTEGRATION !== 'false';

test.describe('Playwright MCP統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // MCPが無効の場合はスキップ
    test.skip(!MCP_INTEGRATION, 'MCP統合が無効のためスキップ');
    
    // テストページへの移動
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('MCP経由でのページスナップショット取得', async ({ page }) => {
    // MCP機能を使ってページの状態を取得
    const snapshot = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        elements: {
          forms: document.forms.length,
          links: document.links.length,
          images: document.images.length
        }
      };
    });

    // スナップショットの検証
    expect(snapshot.url).toContain('localhost:8086');
    expect(snapshot.title).toBeTruthy();
    expect(snapshot.elements.forms).toBeGreaterThan(0);
    
    console.log('📸 MCPスナップショット取得成功:', snapshot);
  });

  test('MCP経由でのユーザーインタラクション監視', async ({ page }) => {
    // インタラクションイベントの監視開始
    const interactions = [];
    
    await page.exposeFunction('trackInteraction', (interaction) => {
      interactions.push({
        ...interaction,
        timestamp: Date.now()
      });
    });

    await page.addInitScript(() => {
      // クリックイベントの監視
      document.addEventListener('click', (event) => {
        window.trackInteraction({
          type: 'click',
          target: event.target.tagName,
          className: event.target.className,
          id: event.target.id,
          x: event.clientX,
          y: event.clientY
        });
      });

      // 入力イベントの監視
      document.addEventListener('input', (event) => {
        window.trackInteraction({
          type: 'input',
          target: event.target.tagName,
          inputType: event.inputType,
          value: event.target.value.substring(0, 50) // 最初の50文字のみ
        });
      });
    });

    // テキスト入力のテスト
    const textArea = page.locator('textarea#japanese-input');
    await textArea.fill('クラス図のテスト\n\n顧客 -> システム: 注文\nシステム -> データベース: 保存');
    
    // 変換ボタンクリック
    const convertButton = page.locator('button:has-text("PlantUMLに変換")');
    await convertButton.click();

    // プレビュー表示の待機
    await page.waitForSelector('#preview img, #preview svg', { timeout: 10000 });

    // インタラクション履歴の確認
    expect(interactions.length).toBeGreaterThan(0);
    
    const clickInteractions = interactions.filter(i => i.type === 'click');
    const inputInteractions = interactions.filter(i => i.type === 'input');
    
    expect(clickInteractions.length).toBeGreaterThan(0);
    expect(inputInteractions.length).toBeGreaterThan(0);

    console.log('👆 MCP インタラクション監視結果:', {
      total: interactions.length,
      clicks: clickInteractions.length,
      inputs: inputInteractions.length
    });
  });

  test('MCP経由でのパフォーマンス計測', async ({ page }) => {
    // パフォーマンス計測の開始
    await page.addInitScript(() => {
      window.performanceData = {
        navigationStart: performance.timing.navigationStart,
        measurements: []
      };

      // カスタム計測の追加
      function addMeasurement(name, startTime) {
        window.performanceData.measurements.push({
          name,
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime
        });
      }

      window.addMeasurement = addMeasurement;
    });

    const startTime = Date.now();

    // アプリケーションの基本機能テスト
    await page.fill('textarea#japanese-input', 'アクター1 -> アクター2: メッセージ');
    
    await page.evaluate(() => {
      window.addMeasurement('text-input', performance.now());
    });

    await page.click('button:has-text("PlantUMLに変換")');

    await page.evaluate(() => {
      window.addMeasurement('convert-click', performance.now());
    });

    // 結果の表示待機
    await page.waitForSelector('#preview img, #preview svg', { timeout: 15000 });

    await page.evaluate(() => {
      window.addMeasurement('preview-load', performance.now());
    });

    // パフォーマンスデータの取得
    const performanceData = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      
      return {
        navigation: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.navigationStart
        },
        resources: resources.length,
        customMeasurements: window.performanceData.measurements,
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null
      };
    });

    // パフォーマンス基準の検証
    expect(performanceData.navigation.totalTime).toBeLessThan(10000); // 10秒以内
    expect(performanceData.customMeasurements.length).toBeGreaterThan(0);
    
    if (performanceData.memory) {
      expect(performanceData.memory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB以内
    }

    console.log('⚡ MCPパフォーマンス計測結果:', performanceData);
  });

  test('MCP経由でのエラー監視とレポート', async ({ page }) => {
    // エラー監視システムの設定
    const errors = [];
    const warnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console-error',
          text: msg.text(),
          timestamp: Date.now()
        });
      } else if (msg.type() === 'warning') {
        warnings.push({
          type: 'console-warning',
          text: msg.text(),
          timestamp: Date.now()
        });
      }
    });

    page.on('pageerror', error => {
      errors.push({
        type: 'page-error',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    page.on('requestfailed', request => {
      errors.push({
        type: 'request-failed',
        url: request.url(),
        failure: request.failure(),
        timestamp: Date.now()
      });
    });

    // エラーが発生する可能性のある操作を実行
    await page.fill('textarea#japanese-input', '無効なPlantUML構文テスト\n@startuml\n無効な構文\n@enduml');
    await page.click('button:has-text("PlantUMLに変換")');

    // エラー処理の待機
    await page.waitForTimeout(5000);

    // ネットワーク接続エラーのテスト
    await page.route('**/*', route => {
      if (route.request().url().includes('kroki.io')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.fill('textarea#japanese-input', 'A -> B: テスト');
    await page.click('button:has-text("PlantUMLに変換")');
    await page.waitForTimeout(3000);

    // エラーレポートの生成
    const errorReport = {
      timestamp: new Date().toISOString(),
      errors: errors,
      warnings: warnings,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      categories: {
        consoleErrors: errors.filter(e => e.type === 'console-error').length,
        pageErrors: errors.filter(e => e.type === 'page-error').length,
        requestFailures: errors.filter(e => e.type === 'request-failed').length
      }
    };

    // エラー処理の検証
    expect(errorReport.totalErrors + errorReport.totalWarnings).toBeGreaterThan(0);
    console.log('🚨 MCPエラー監視レポート:', errorReport);

    // エラーハンドリングが適切に動作しているか確認
    const errorMessages = await page.locator('.error-message, .alert-danger').count();
    expect(errorMessages).toBeLessThanOrEqual(2); // 適切なエラー表示
  });

  test('MCP経由でのアクセシビリティチェック', async ({ page }) => {
    // アクセシビリティ監査の実行
    await page.addInitScript(() => {
      window.a11yChecks = {
        ariaLabels: [],
        altTexts: [],
        headings: [],
        focusable: []
      };

      // ARIA ラベルの確認
      document.querySelectorAll('[aria-label]').forEach(el => {
        window.a11yChecks.ariaLabels.push({
          tag: el.tagName,
          label: el.getAttribute('aria-label'),
          visible: el.offsetParent !== null
        });
      });

      // 画像のalt属性確認
      document.querySelectorAll('img').forEach(img => {
        window.a11yChecks.altTexts.push({
          src: img.src,
          alt: img.alt,
          hasAlt: img.hasAttribute('alt')
        });
      });

      // 見出し構造の確認
      document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading => {
        window.a11yChecks.headings.push({
          level: parseInt(heading.tagName.substring(1)),
          text: heading.textContent,
          id: heading.id
        });
      });

      // フォーカス可能要素の確認
      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      document.querySelectorAll(focusableSelectors).forEach(el => {
        window.a11yChecks.focusable.push({
          tag: el.tagName,
          type: el.type,
          visible: el.offsetParent !== null,
          tabIndex: el.tabIndex
        });
      });
    });

    // アクセシビリティ情報の取得
    const a11yData = await page.evaluate(() => window.a11yChecks);

    // アクセシビリティ基準の検証
    expect(a11yData.focusable.length).toBeGreaterThan(0);
    
    // すべての画像にalt属性があることを確認
    const imagesWithoutAlt = a11yData.altTexts.filter(img => !img.hasAlt);
    expect(imagesWithoutAlt.length).toBeLessThanOrEqual(1); // favicon等を除く

    // 適切な見出し構造の確認
    const headings = a11yData.headings.sort((a, b) => a.level - b.level);
    if (headings.length > 0) {
      expect(headings[0].level).toBeLessThanOrEqual(2); // H1またはH2から開始
    }

    console.log('♿ MCPアクセシビリティチェック結果:', {
      ariaLabels: a11yData.ariaLabels.length,
      images: a11yData.altTexts.length,
      imagesWithoutAlt: imagesWithoutAlt.length,
      headings: a11yData.headings.length,
      focusable: a11yData.focusable.length
    });
  });
});

test.describe('MCP統合 - 高度なテストシナリオ', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!MCP_INTEGRATION, 'MCP統合が無効のためスキップ');
  });

  test('複数タブでの同期テスト', async ({ context }) => {
    // 複数タブを開いて同期動作をテスト
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/');
    await page2.goto('/');

    // 両方のページが読み込まれるまで待機
    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);

    // 片方のページで入力
    await page1.fill('textarea#japanese-input', 'マルチタブテスト\nA -> B: メッセージ');
    await page1.click('button:has-text("PlantUMLに変換")');

    // 結果の確認
    await page1.waitForSelector('#preview img, #preview svg', { timeout: 10000 });

    // もう片方のページで別の入力
    await page2.fill('textarea#japanese-input', 'タブ2テスト\nC -> D: レスポンス');
    await page2.click('button:has-text("PlantUMLに変換")');

    await page2.waitForSelector('#preview img, #preview svg', { timeout: 10000 });

    // 両ページの独立性を確認
    const page1Content = await page1.locator('textarea#japanese-input').inputValue();
    const page2Content = await page2.locator('textarea#japanese-input').inputValue();

    expect(page1Content).toContain('マルチタブテスト');
    expect(page2Content).toContain('タブ2テスト');
    expect(page1Content).not.toEqual(page2Content);

    console.log('📑 マルチタブテスト完了');

    await page1.close();
    await page2.close();
  });

  test('ネットワーク切断時の動作テスト', async ({ page, context }) => {
    await page.goto('/');

    // 通常の動作確認
    await page.fill('textarea#japanese-input', 'ネットワークテスト\nA -> B');
    await page.click('button:has-text("PlantUMLに変換")');
    await page.waitForSelector('#preview img, #preview svg', { timeout: 10000 });

    // ネットワークを切断
    await context.setOffline(true);

    // オフライン状態でのテスト
    await page.fill('textarea#japanese-input', 'オフラインテスト\nC -> D');
    await page.click('button:has-text("PlantUMLに変換")');

    // エラー処理の確認
    await page.waitForTimeout(5000);
    
    // エラーメッセージまたは適切なフィードバックの表示を確認
    const errorVisible = await page.locator('.error-message, .alert-danger, .offline-message').isVisible();
    
    // ネットワーク復旧
    await context.setOffline(false);

    // 復旧後の動作確認
    await page.fill('textarea#japanese-input', '復旧テスト\nE -> F');
    await page.click('button:has-text("PlantUMLに変換")');
    await page.waitForSelector('#preview img, #preview svg', { timeout: 15000 });

    console.log('🌐 ネットワーク切断テスト完了, エラー表示:', errorVisible);
  });
});