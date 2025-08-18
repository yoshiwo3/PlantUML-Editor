/**
 * Firefox/Gecko固有機能テスト
 * Geckoエンジン特性とFirefox独自機能のテスト
 */

import { test, expect } from '@playwright/test';

test.describe('Firefox/Geckoエンジン固有テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8086');
  });

  test('Geckoエンジンのレンダリング特性', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    // Firefox固有のレンダリング確認
    await page.setContent(`
      <style>
        .firefox-rendering {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-feature-settings: "kern" 1;
          font-variant-ligatures: common-ligatures;
        }
      </style>
      <div class="firefox-rendering">縦書きテキスト表示テスト</div>
    `);

    const renderingInfo = await page.evaluate(() => {
      const element = document.querySelector('.firefox-rendering');
      const computedStyle = window.getComputedStyle(element);
      
      return {
        writingMode: computedStyle.writingMode,
        textOrientation: computedStyle.textOrientation,
        fontFeatureSettings: computedStyle.fontFeatureSettings,
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0
      };
    });

    expect(renderingInfo.writingMode).toBe('vertical-rl');
    expect(renderingInfo.isVisible).toBeTruthy();
    console.log('Firefox縦書きレンダリング:', renderingInfo);
  });

  test('SpiderMonkey JavaScript特性', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    const spiderMonkeyFeatures = await page.evaluate(() => {
      const features = {};
      
      // SpiderMonkey固有の最適化確認
      try {
        // Array処理性能
        const largeArray = new Array(100000).fill(0).map((_, i) => i);
        const startTime = performance.now();
        
        const result = largeArray
          .filter(x => x % 2 === 0)
          .map(x => x * 2)
          .reduce((a, b) => a + b, 0);
        
        features.arrayProcessingTime = performance.now() - startTime;
        features.arrayResult = result;
      } catch (error) {
        features.arrayError = error.message;
      }

      // 正規表現性能
      try {
        const text = 'システムがデータベースにアクセス'.repeat(1000);
        const regex = /システム|データベース|アクセス/g;
        const startTime = performance.now();
        
        const matches = text.match(regex);
        
        features.regexProcessingTime = performance.now() - startTime;
        features.regexMatches = matches ? matches.length : 0;
      } catch (error) {
        features.regexError = error.message;
      }

      return features;
    });

    expect(spiderMonkeyFeatures.arrayProcessingTime).toBeLessThan(100);
    expect(spiderMonkeyFeatures.regexMatches).toBeGreaterThan(0);
    console.log('SpiderMonkey性能:', spiderMonkeyFeatures);
  });

  test('Firefox開発者ツール統合', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    // Firefoxコンソールメッセージ監視
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg));

    await page.evaluate(() => {
      // Firefox固有のコンソール機能
      console.info('Firefox専用デバッグ情報');
      console.table([
        { name: 'PlantUML', version: '1.0' },
        { name: 'Editor', version: '2.0' }
      ]);
      
      // Firefox Performance API
      if (performance.mark) {
        performance.mark('firefox-test-start');
        performance.mark('firefox-test-end');
        performance.measure('firefox-test', 'firefox-test-start', 'firefox-test-end');
      }
    });

    expect(consoleMessages.length).toBeGreaterThan(0);
    const hasFirefoxMessage = consoleMessages.some(msg => 
      msg.text().includes('Firefox専用')
    );
    expect(hasFirefoxMessage).toBeTruthy();
  });

  test('CSS Grid詳細レイアウト', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    await page.setContent(`
      <style>
        .firefox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          grid-template-rows: masonry;
          gap: 16px;
          align-content: start;
        }
        .grid-item {
          background: #f0f0f0;
          padding: 20px;
          border-radius: 8px;
          height: var(--height);
        }
      </style>
      <div class="firefox-grid">
        <div class="grid-item" style="--height: 100px;">アイテム1</div>
        <div class="grid-item" style="--height: 150px;">アイテム2</div>
        <div class="grid-item" style="--height: 120px;">アイテム3</div>
        <div class="grid-item" style="--height: 80px;">アイテム4</div>
      </div>
    `);

    const gridInfo = await page.evaluate(() => {
      const grid = document.querySelector('.firefox-grid');
      const computedStyle = window.getComputedStyle(grid);
      
      return {
        display: computedStyle.display,
        gridTemplateColumns: computedStyle.gridTemplateColumns,
        gridTemplateRows: computedStyle.gridTemplateRows,
        gap: computedStyle.gap,
        itemCount: grid.children.length
      };
    });

    expect(gridInfo.display).toBe('grid');
    expect(gridInfo.itemCount).toBe(4);
    console.log('Firefox CSS Grid:', gridInfo);
  });

  test('WebExtensions API互換性', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    const webExtensionSupport = await page.evaluate(() => {
      return {
        hasBrowser: typeof browser !== 'undefined',
        hasRuntime: typeof browser?.runtime !== 'undefined',
        hasStorage: typeof browser?.storage !== 'undefined',
        hasTab: typeof browser?.tabs !== 'undefined',
        userAgent: navigator.userAgent
      };
    });

    // 通常のWebページでは拡張機能APIは利用できない
    expect(webExtensionSupport.hasBrowser).toBeFalsy();
    expect(webExtensionSupport.userAgent).toContain('Firefox');
  });

  test('Firefox Privacy機能', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    const privacyFeatures = await page.evaluate(() => {
      return {
        // DoNotTrack設定
        doNotTrack: navigator.doNotTrack,
        
        // Cookieサポート
        cookieEnabled: navigator.cookieEnabled,
        
        // Storage quota
        storageQuota: 'storage' in navigator && 'estimate' in navigator.storage,
        
        // Permissions API
        hasPermissions: 'permissions' in navigator,
        
        // プライベートブラウジング検出
        isPrivate: false // 検出方法がFirefox固有
      };
    });

    expect(typeof privacyFeatures.doNotTrack).toBeDefined();
    expect(privacyFeatures.cookieEnabled).toBeTruthy();
    console.log('Firefoxプライバシー機能:', privacyFeatures);
  });

  test('Canvas2D高度な機能', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    const canvasFeatures = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      // Firefox Canvas固有機能
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
      
      // Path2D API
      const path = new Path2D();
      path.moveTo(20, 20);
      path.lineTo(100, 20);
      path.lineTo(60, 80);
      path.closePath();
      
      ctx.fillStyle = '#00ff00';
      ctx.fill(path);
      
      // Canvas画像データ
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      return {
        hasPath2D: typeof Path2D !== 'undefined',
        imageDataLength: imageData.data.length,
        canvasSupported: true,
        contextType: ctx.constructor.name
      };
    });

    expect(canvasFeatures.hasPath2D).toBeTruthy();
    expect(canvasFeatures.imageDataLength).toBeGreaterThan(0);
    console.log('Firefox Canvas機能:', canvasFeatures);
  });

  test('Flexbox詳細レイアウト', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    await page.setContent(`
      <style>
        .firefox-flex {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: stretch;
          gap: 10px;
          height: 300px;
          border: 2px solid #ccc;
        }
        .flex-item {
          background: #e0e0e0;
          padding: 15px;
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="firefox-flex">
        <div class="flex-item">Flexアイテム1</div>
        <div class="flex-item">Flexアイテム2</div>
        <div class="flex-item">Flexアイテム3</div>
      </div>
    `);

    const flexInfo = await page.evaluate(() => {
      const flex = document.querySelector('.firefox-flex');
      const items = Array.from(flex.children);
      const computedStyle = window.getComputedStyle(flex);
      
      return {
        display: computedStyle.display,
        flexDirection: computedStyle.flexDirection,
        justifyContent: computedStyle.justifyContent,
        alignItems: computedStyle.alignItems,
        gap: computedStyle.gap,
        itemHeights: items.map(item => item.offsetHeight)
      };
    });

    expect(flexInfo.display).toBe('flex');
    expect(flexInfo.flexDirection).toBe('column');
    expect(flexInfo.itemHeights.every(height => height > 0)).toBeTruthy();
    console.log('Firefox Flexbox:', flexInfo);
  });

  test('Firefox Developer Edition機能', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    const devFeatures = await page.evaluate(() => {
      return {
        // デベロッパー機能の確認
        hasConsoleAPI: typeof console !== 'undefined',
        hasPerformanceAPI: typeof performance !== 'undefined',
        
        // Firefox固有のWeb API
        hasMozApi: Object.getOwnPropertyNames(window).filter(name => 
          name.startsWith('moz') || name.startsWith('Moz')
        ),
        
        // CSS プロパティサポート
        supportsMozUserSelect: CSS.supports('-moz-user-select', 'none'),
        supportsMozAppearance: CSS.supports('-moz-appearance', 'none')
      };
    });

    expect(devFeatures.hasConsoleAPI).toBeTruthy();
    expect(devFeatures.hasPerformanceAPI).toBeTruthy();
    console.log('Firefox開発者機能:', devFeatures);
  });

  test('セキュリティ機能テスト', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'firefox', 
      'Firefox専用テスト');

    const securityFeatures = await page.evaluate(() => {
      return {
        // CSP (Content Security Policy) サポート
        hasCSP: 'securitypolicy' in document,
        
        // Secure Context
        isSecureContext: window.isSecureContext,
        
        // Mixed Content対応
        protocol: location.protocol,
        
        // SameSite Cookie対応
        cookieSupport: document.cookie !== null
      };
    });

    expect(typeof securityFeatures.isSecureContext).toBe('boolean');
    console.log('Firefoxセキュリティ:', securityFeatures);
  });
});