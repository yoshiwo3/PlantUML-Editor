/**
 * WebKit/Safari固有機能テスト
 * WebKitエンジン特性とSafari独自機能のテスト
 */

import { test, expect } from '@playwright/test';

test.describe('WebKit/Safariエンジン固有テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8086');
  });

  test('WebKitエンジンのレンダリング特性', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    // WebKit固有のCSS機能テスト
    await page.setContent(`
      <style>
        .webkit-features {
          -webkit-backdrop-filter: blur(10px);
          -webkit-text-stroke: 1px #000;
          -webkit-text-fill-color: #ff0000;
          -webkit-box-reflect: below 2px linear-gradient(transparent, rgba(0,0,0,0.2));
          font-feature-settings: "liga" 1;
        }
      </style>
      <div class="webkit-features">WebKit専用効果テスト</div>
    `);

    const webkitFeatures = await page.evaluate(() => {
      const element = document.querySelector('.webkit-features');
      const computedStyle = window.getComputedStyle(element);
      
      return {
        backdropFilter: computedStyle.getPropertyValue('-webkit-backdrop-filter'),
        textStroke: computedStyle.getPropertyValue('-webkit-text-stroke'),
        textFillColor: computedStyle.getPropertyValue('-webkit-text-fill-color'),
        boxReflect: computedStyle.getPropertyValue('-webkit-box-reflect'),
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0
      };
    });

    expect(webkitFeatures.isVisible).toBeTruthy();
    console.log('WebKit CSS機能:', webkitFeatures);
  });

  test('JavaScriptCore性能テスト', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    const jscPerformance = await page.evaluate(() => {
      const tests = {};
      
      // 文字列処理性能（日本語対応重要）
      const japaneseText = 'システムがデータベースにアクセスして情報を取得する処理';
      const iterations = 10000;
      
      let startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        const processed = japaneseText
          .split('')
          .reverse()
          .join('')
          .toLowerCase();
      }
      tests.stringProcessing = performance.now() - startTime;
      
      // 配列処理性能
      const largeArray = new Array(50000).fill(0).map((_, i) => ({ id: i, name: `項目${i}` }));
      startTime = performance.now();
      
      const filtered = largeArray
        .filter(item => item.id % 10 === 0)
        .map(item => ({ ...item, processed: true }))
        .slice(0, 100);
      
      tests.arrayProcessing = performance.now() - startTime;
      tests.arrayResultLength = filtered.length;
      
      // オブジェクト操作性能
      const complexObject = {};
      startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        complexObject[`key_${i}`] = {
          value: i,
          name: `名前${i}`,
          data: new Array(10).fill(i)
        };
      }
      
      tests.objectManipulation = performance.now() - startTime;
      tests.objectSize = Object.keys(complexObject).length;
      
      return tests;
    });

    expect(jscPerformance.stringProcessing).toBeLessThan(500);
    expect(jscPerformance.arrayProcessing).toBeLessThan(100);
    expect(jscPerformance.arrayResultLength).toBe(100);
    console.log('JavaScriptCore性能:', jscPerformance);
  });

  test('Safari固有Web API', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    const safariAPIs = await page.evaluate(() => {
      return {
        // Safari固有API確認
        hasWebkitSpeech: 'webkitSpeechRecognition' in window,
        hasWebkitRequestFullscreen: 'webkitRequestFullscreen' in document.documentElement,
        hasWebkitStorageInfo: 'webkitStorageInfo' in navigator,
        
        // Touch Events
        hasTouchEvents: 'ontouchstart' in window,
        
        // Device Orientation
        hasDeviceOrientation: 'ondeviceorientation' in window,
        
        // iOS Safari特有
        isIOSSafari: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        
        // macOS Safari特有
        isMacOSSafari: /Safari/.test(navigator.userAgent) && !/Chrome|Chromium/.test(navigator.userAgent),
        
        userAgent: navigator.userAgent
      };
    });

    expect(typeof safariAPIs.hasTouchEvents).toBe('boolean');
    console.log('Safari Web API:', safariAPIs);
  });

  test('WebKit Canvas性能', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    const canvasPerformance = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      const startTime = performance.now();
      
      // 複雑な描画処理
      for (let i = 0; i < 1000; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          Math.random() * 20 + 5,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;
        ctx.fill();
      }
      
      // 日本語テキスト描画
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#000';
      ctx.fillText('日本語テキスト描画テスト', 50, 50);
      
      const renderTime = performance.now() - startTime;
      
      // Canvas画像データ取得
      const imageData = ctx.getImageData(0, 0, 100, 100);
      
      return {
        renderTime,
        imageDataSize: imageData.data.length,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        contextType: ctx.constructor.name
      };
    });

    expect(canvasPerformance.renderTime).toBeLessThan(1000);
    expect(canvasPerformance.imageDataSize).toBe(40000); // 100x100x4
    console.log('WebKit Canvas性能:', canvasPerformance);
  });

  test('Safari CSS Grid & Flexbox', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    await page.setContent(`
      <style>
        .safari-layout {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          grid-template-rows: auto 1fr auto;
          grid-gap: 20px;
          height: 400px;
          padding: 20px;
        }
        .grid-header {
          grid-column: 1 / -1;
          background: #f0f0f0;
          padding: 15px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .grid-main {
          grid-column: 2;
          grid-row: 2;
          background: #e0e0e0;
          padding: 20px;
          overflow: auto;
        }
        .grid-sidebar {
          background: #d0d0d0;
          padding: 15px;
        }
        .grid-footer {
          grid-column: 1 / -1;
          background: #c0c0c0;
          padding: 10px;
        }
      </style>
      <div class="safari-layout">
        <div class="grid-header">ヘッダー</div>
        <div class="grid-sidebar">サイドバー1</div>
        <div class="grid-main">メインコンテンツ</div>
        <div class="grid-sidebar">サイドバー2</div>
        <div class="grid-footer">フッター</div>
      </div>
    `);

    const layoutInfo = await page.evaluate(() => {
      const layout = document.querySelector('.safari-layout');
      const computedStyle = window.getComputedStyle(layout);
      
      const gridItems = Array.from(layout.children).map(child => {
        const childStyle = window.getComputedStyle(child);
        return {
          className: child.className,
          gridColumn: childStyle.gridColumn,
          gridRow: childStyle.gridRow,
          width: child.offsetWidth,
          height: child.offsetHeight
        };
      });
      
      return {
        display: computedStyle.display,
        gridTemplateColumns: computedStyle.gridTemplateColumns,
        gridTemplateRows: computedStyle.gridTemplateRows,
        gap: computedStyle.gap,
        items: gridItems
      };
    });

    expect(layoutInfo.display).toBe('grid');
    expect(layoutInfo.items.length).toBe(5);
    console.log('Safari Grid Layout:', layoutInfo);
  });

  test('WebKit Audio API', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    const audioSupport = await page.evaluate(() => {
      const audioContext = window.AudioContext || window.webkitAudioContext;
      
      if (!audioContext) {
        return { supported: false };
      }

      try {
        const ctx = new audioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        return {
          supported: true,
          state: ctx.state,
          sampleRate: ctx.sampleRate,
          destination: !!ctx.destination,
          hasOscillator: !!oscillator,
          hasGainNode: !!gainNode
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });

    if (audioSupport.supported) {
      expect(audioSupport.sampleRate).toBeGreaterThan(0);
      expect(audioSupport.hasOscillator).toBeTruthy();
    }
    console.log('WebKit Audio API:', audioSupport);
  });

  test('Safari固有のタッチ動作', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    await page.setContent(`
      <style>
        .touch-area {
          width: 300px;
          height: 200px;
          background: #f0f0f0;
          border: 2px solid #ccc;
          margin: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }
      </style>
      <div class="touch-area" id="touchArea">タッチエリア</div>
    `);

    // タッチイベントシミュレーション
    const touchResult = await page.evaluate(() => {
      const touchArea = document.getElementById('touchArea');
      let touchData = {
        touchStart: false,
        touchMove: false,
        touchEnd: false,
        gestureStart: false
      };

      // イベントリスナー設定
      touchArea.addEventListener('touchstart', () => {
        touchData.touchStart = true;
      }, { passive: true });

      touchArea.addEventListener('touchmove', () => {
        touchData.touchMove = true;
      }, { passive: true });

      touchArea.addEventListener('touchend', () => {
        touchData.touchEnd = true;
      });

      // Safari固有のジェスチャーイベント
      if ('ongesturestart' in touchArea) {
        touchArea.addEventListener('gesturestart', () => {
          touchData.gestureStart = true;
        });
      }

      return {
        hasTouchEvents: 'ontouchstart' in touchArea,
        hasGestureEvents: 'ongesturestart' in touchArea,
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        computedStyle: window.getComputedStyle(touchArea).touchAction
      };
    });

    expect(typeof touchResult.hasTouchEvents).toBe('boolean');
    console.log('Safari タッチサポート:', touchResult);
  });

  test('WebKit 3D Transforms', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    await page.setContent(`
      <style>
        .webkit-3d {
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          margin: 50px;
          transform-style: preserve-3d;
          transform: perspective(800px) rotateY(45deg) rotateX(15deg);
          transition: transform 0.3s ease;
        }
        .webkit-3d:hover {
          transform: perspective(800px) rotateY(90deg) rotateX(30deg);
        }
      </style>
      <div class="webkit-3d">3D Transform</div>
    `);

    const transform3D = await page.evaluate(() => {
      const element = document.querySelector('.webkit-3d');
      const computedStyle = window.getComputedStyle(element);
      
      return {
        transform: computedStyle.transform,
        transformStyle: computedStyle.transformStyle,
        perspective: computedStyle.perspective,
        transition: computedStyle.transition,
        backfaceVisibility: computedStyle.backfaceVisibility
      };
    });

    expect(transform3D.transformStyle).toBe('preserve-3d');
    console.log('WebKit 3D Transforms:', transform3D);
  });

  test('Safari PWA サポート', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    const pwaSupport = await page.evaluate(() => {
      return {
        // Service Worker
        hasServiceWorker: 'serviceWorker' in navigator,
        
        // Web App Manifest
        hasWebAppManifest: 'getManifest' in window || 
          document.querySelector('link[rel="manifest"]') !== null,
        
        // Add to Home Screen (Safari固有)
        hasBeforeInstallPrompt: 'onbeforeinstallprompt' in window,
        
        // Push Notifications
        hasPushManager: 'PushManager' in window,
        
        // Background Sync
        hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        
        // Safari App Mode 判定
        isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
          ('standalone' in window.navigator && window.navigator.standalone)
      };
    });

    expect(pwaSupport.hasServiceWorker).toBeTruthy();
    console.log('Safari PWA サポート:', pwaSupport);
  });

  test('WebKit CSS Scroll Snap', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'webkit', 
      'WebKit専用テスト');

    await page.setContent(`
      <style>
        .scroll-container {
          width: 300px;
          height: 200px;
          overflow-x: auto;
          display: flex;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .scroll-item {
          min-width: 100%;
          height: 100%;
          scroll-snap-align: start;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
        }
        .scroll-item:nth-child(1) { background: #ff6b6b; }
        .scroll-item:nth-child(2) { background: #4ecdc4; }
        .scroll-item:nth-child(3) { background: #45b7d1; }
      </style>
      <div class="scroll-container">
        <div class="scroll-item">スライド1</div>
        <div class="scroll-item">スライド2</div>
        <div class="scroll-item">スライド3</div>
      </div>
    `);

    const scrollSnapInfo = await page.evaluate(() => {
      const container = document.querySelector('.scroll-container');
      const computedStyle = window.getComputedStyle(container);
      
      return {
        scrollSnapType: computedStyle.scrollSnapType,
        overflowScrolling: computedStyle.getPropertyValue('-webkit-overflow-scrolling'),
        scrollBehavior: computedStyle.scrollBehavior,
        itemCount: container.children.length,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth
      };
    });

    expect(scrollSnapInfo.scrollSnapType).toBe('x mandatory');
    expect(scrollSnapInfo.itemCount).toBe(3);
    console.log('WebKit Scroll Snap:', scrollSnapInfo);
  });
});