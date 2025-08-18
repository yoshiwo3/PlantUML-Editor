/**
 * Microsoft Edge固有機能テスト
 * EdgeHTML/Chromium Edge特性とMicrosoft固有機能のテスト
 */

import { test, expect } from '@playwright/test';

test.describe('Microsoft Edge固有テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8086');
  });

  test('Edge Chromiumエンジン確認', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    const edgeInfo = await page.evaluate(() => {
      const userAgent = navigator.userAgent;
      
      return {
        userAgent,
        isEdge: userAgent.includes('Edg/'),
        isChromiumBased: userAgent.includes('Chrome/'),
        edgeVersion: userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/)?.[1],
        chromeVersion: userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)?.[1],
        
        // Edge固有API確認
        hasMSCredentials: 'credentials' in navigator && 'get' in navigator.credentials,
        hasMSGestures: 'MSGesture' in window,
        hasMSPointer: 'MSPointerEvent' in window || 'PointerEvent' in window,
        
        // エンジン特性
        jsEngine: 'V8', // Chromium Edgeの場合
        renderingEngine: 'Blink'
      };
    });

    expect(edgeInfo.isEdge).toBeTruthy();
    expect(edgeInfo.isChromiumBased).toBeTruthy();
    console.log('Edge ブラウザ情報:', edgeInfo);
  });

  test('Edge Web Platform Features', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    const webPlatformFeatures = await page.evaluate(() => {
      return {
        // PWA サポート
        hasServiceWorker: 'serviceWorker' in navigator,
        hasWebAppManifest: 'getManifest' in window,
        hasPushManager: 'PushManager' in window,
        
        // WebAssembly サポート
        hasWebAssembly: 'WebAssembly' in window,
        
        // Web Components
        hasCustomElements: 'customElements' in window,
        hasShadowDom: 'attachShadow' in Element.prototype,
        
        // Modern JavaScript
        hasModules: 'noModule' in HTMLScriptElement.prototype,
        hasAsyncAwait: (async () => {}).constructor.name === 'AsyncFunction',
        
        // CSS サポート
        hasGridLayout: CSS.supports('display', 'grid'),
        hasFlexbox: CSS.supports('display', 'flex'),
        hasCustomProperties: CSS.supports('--test', 'value'),
        
        // Web Payments API (Edge特有の強化)
        hasPaymentRequest: 'PaymentRequest' in window,
        
        // Web Authentication API
        hasWebAuthn: 'credentials' in navigator && 'create' in navigator.credentials
      };
    });

    expect(webPlatformFeatures.hasServiceWorker).toBeTruthy();
    expect(webPlatformFeatures.hasWebAssembly).toBeTruthy();
    expect(webPlatformFeatures.hasGridLayout).toBeTruthy();
    console.log('Edge Web Platform:', webPlatformFeatures);
  });

  test('Edge Security Features', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    const securityFeatures = await page.evaluate(() => {
      return {
        // Security Headers サポート
        isSecureContext: window.isSecureContext,
        protocol: location.protocol,
        
        // CSP サポート
        hasCSP: 'securitypolicy' in document,
        
        // SameSite Cookie サポート
        cookieEnabled: navigator.cookieEnabled,
        
        // Fetch API セキュリティ
        hasFetch: 'fetch' in window,
        hasCredentialsAPI: 'credentials' in navigator,
        
        // HTTPS Only Mode 対応
        httpsOnly: location.protocol === 'https:',
        
        // Permissions API
        hasPermissions: 'permissions' in navigator,
        
        // Web Locks API (セキュアな排他制御)
        hasWebLocks: 'locks' in navigator,
        
        // Trusted Types (XSS対策)
        hasTrustedTypes: 'trustedTypes' in window
      };
    });

    expect(typeof securityFeatures.isSecureContext).toBe('boolean');
    console.log('Edge セキュリティ機能:', securityFeatures);
  });

  test('Edge Performance Features', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    const performanceFeatures = await page.evaluate(() => {
      const measures = {};
      
      // Performance API 詳細テスト
      performance.mark('edge-test-start');
      
      // CPU集約的な処理
      const iterations = 100000;
      const startTime = performance.now();
      
      let result = 0;
      for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.random();
      }
      
      performance.mark('edge-test-end');
      performance.measure('edge-cpu-test', 'edge-test-start', 'edge-test-end');
      
      const cpuTime = performance.now() - startTime;
      
      // Memory API (Chromium Edge)
      const memoryInfo = performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null;
      
      return {
        cpuPerformance: {
          time: cpuTime,
          iterationsPerMs: iterations / cpuTime,
          result: result > 0
        },
        
        memoryInfo,
        
        performanceObserver: 'PerformanceObserver' in window,
        
        // Navigation Timing
        navigationTiming: performance.getEntriesByType('navigation')[0],
        
        // Resource Timing
        resourceCount: performance.getEntriesByType('resource').length,
        
        // Paint Timing
        paintEntries: performance.getEntriesByType('paint'),
        
        // User Timing
        userMarks: performance.getEntriesByType('mark').length
      };
    });

    expect(performanceFeatures.cpuPerformance.time).toBeGreaterThan(0);
    expect(performanceFeatures.performanceObserver).toBeTruthy();
    console.log('Edge パフォーマンス:', performanceFeatures);
  });

  test('Edge Developer Tools Integration', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    // コンソールメッセージ監視
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg));

    const devToolsFeatures = await page.evaluate(() => {
      // Edge DevTools固有機能のテスト
      console.log('Edge DevTools Test');
      console.group('Edge Performance Group');
      console.time('Edge Timer');
      
      // 模擬処理
      const data = new Array(1000).fill(0).map((_, i) => ({ id: i, name: `項目${i}` }));
      const filtered = data.filter(item => item.id % 10 === 0);
      
      console.timeEnd('Edge Timer');
      console.table(filtered.slice(0, 5));
      console.groupEnd();
      
      return {
        hasConsoleAPI: typeof console !== 'undefined',
        hasGrouping: typeof console.group === 'function',
        hasTiming: typeof console.time === 'function',
        hasTable: typeof console.table === 'function',
        
        // Performance Profiling
        hasProfiler: 'profile' in console,
        
        // Memory Profiling
        hasMemoryProfiler: 'memory' in performance,
        
        // Debug Information
        debugInfo: {
          dataLength: data.length,
          filteredLength: filtered.length,
          sampleData: filtered.slice(0, 3)
        }
      };
    });

    expect(devToolsFeatures.hasConsoleAPI).toBeTruthy();
    expect(consoleMessages.length).toBeGreaterThan(0);
    console.log('Edge DevTools:', devToolsFeatures);
  });

  test('Edge Accessibility Features', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    await page.setContent(`
      <div role="main">
        <h1>アクセシビリティテスト</h1>
        <button aria-label="実行ボタン" tabindex="0">実行</button>
        <input type="text" aria-describedby="help" placeholder="入力してください">
        <div id="help">ヘルプテキスト</div>
        <ul role="listbox" aria-label="選択肢">
          <li role="option" aria-selected="false">選択肢1</li>
          <li role="option" aria-selected="true">選択肢2</li>
        </ul>
      </div>
    `);

    const accessibilityFeatures = await page.evaluate(() => {
      return {
        // Screen Reader API
        hasScreenReader: 'speechSynthesis' in window,
        
        // High Contrast サポート
        hasHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
        
        // Reduced Motion
        hasPrefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        
        // ARIA サポート確認
        ariaElements: {
          main: document.querySelector('[role="main"]') !== null,
          button: document.querySelector('[aria-label]') !== null,
          describedBy: document.querySelector('[aria-describedby]') !== null,
          listbox: document.querySelector('[role="listbox"]') !== null,
          selectedOption: document.querySelector('[aria-selected="true"]') !== null
        },
        
        // Focus Management
        hasFocusVisible: CSS.supports('selector(:focus-visible)'),
        
        // Tab Navigation
        tabElements: Array.from(document.querySelectorAll('[tabindex]')).length
      };
    });

    expect(accessibilityFeatures.ariaElements.main).toBeTruthy();
    expect(accessibilityFeatures.ariaElements.button).toBeTruthy();
    console.log('Edge アクセシビリティ:', accessibilityFeatures);
  });

  test('Edge JavaScript Engine Features', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    const jsEngineFeatures = await page.evaluate(() => {
      const features = {};
      
      // ES2022+ Features
      features.hasPrivateFields = (() => {
        try {
          eval('class Test { #private = 1; }');
          return true;
        } catch { return false; }
      })();
      
      features.hasTopLevelAwait = (() => {
        try {
          eval('await Promise.resolve()');
          return true;
        } catch { return false; }
      })();
      
      // BigInt サポート
      features.hasBigInt = typeof BigInt !== 'undefined';
      
      // Proxy サポート
      features.hasProxy = typeof Proxy !== 'undefined';
      
      // WeakRef サポート
      features.hasWeakRef = typeof WeakRef !== 'undefined';
      
      // FinalizationRegistry サポート
      features.hasFinalizationRegistry = typeof FinalizationRegistry !== 'undefined';
      
      // Array methods
      features.hasArrayAt = Array.prototype.at !== undefined;
      features.hasArrayFindLast = Array.prototype.findLast !== undefined;
      
      // String methods
      features.hasStringReplaceAll = String.prototype.replaceAll !== undefined;
      
      // Object methods
      features.hasObjectFromEntries = Object.fromEntries !== undefined;
      
      // Promise methods
      features.hasPromiseAllSettled = Promise.allSettled !== undefined;
      features.hasPromiseAny = Promise.any !== undefined;
      
      return features;
    });

    expect(jsEngineFeatures.hasBigInt).toBeTruthy();
    expect(jsEngineFeatures.hasProxy).toBeTruthy();
    console.log('Edge JavaScript Engine:', jsEngineFeatures);
  });

  test('Edge CSS Features', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    await page.setContent(`
      <style>
        .edge-css-features {
          /* CSS Grid */
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          
          /* Custom Properties */
          --primary-color: #0078d4;
          --secondary-color: #6bb6ff;
          
          /* CSS Logical Properties */
          padding-inline: 1rem;
          margin-block: 1rem;
          
          /* CSS Container Queries */
          container-type: inline-size;
        }
        
        .feature-item {
          background: var(--primary-color);
          color: white;
          padding: 1rem;
          border-radius: 8px;
          
          /* CSS Subgrid */
          display: subgrid;
        }
        
        @container (min-width: 300px) {
          .feature-item {
            background: var(--secondary-color);
          }
        }
        
        /* CSS Cascade Layers */
        @layer base, components, utilities;
        
        @layer components {
          .component {
            background: #f0f0f0;
          }
        }
      </style>
      <div class="edge-css-features">
        <div class="feature-item">アイテム1</div>
        <div class="feature-item">アイテム2</div>
        <div class="feature-item component">アイテム3</div>
      </div>
    `);

    const cssFeatures = await page.evaluate(() => {
      const element = document.querySelector('.edge-css-features');
      const computedStyle = window.getComputedStyle(element);
      
      return {
        // CSS Grid
        hasGrid: CSS.supports('display', 'grid'),
        gridSupport: computedStyle.display === 'grid',
        
        // Custom Properties
        hasCustomProperties: CSS.supports('--test', 'value'),
        customPropertyValue: computedStyle.getPropertyValue('--primary-color'),
        
        // CSS Logical Properties
        hasLogicalProperties: CSS.supports('padding-inline', '1rem'),
        
        // CSS Container Queries
        hasContainerQueries: CSS.supports('container-type', 'inline-size'),
        
        // CSS Subgrid
        hasSubgrid: CSS.supports('display', 'subgrid'),
        
        // CSS Cascade Layers
        hasCascadeLayers: CSS.supports('@layer'),
        
        // Modern CSS Functions
        hasClamp: CSS.supports('width', 'clamp(1rem, 50%, 3rem)'),
        hasMin: CSS.supports('width', 'min(100%, 500px)'),
        hasMax: CSS.supports('width', 'max(200px, 50%)'),
        
        // CSS Color Functions
        hasLab: CSS.supports('color', 'lab(50% 20 -30)'),
        hasOklab: CSS.supports('color', 'oklab(0.5 0.2 -0.3)'),
        
        itemCount: element.children.length
      };
    });

    expect(cssFeatures.hasGrid).toBeTruthy();
    expect(cssFeatures.hasCustomProperties).toBeTruthy();
    console.log('Edge CSS機能:', cssFeatures);
  });

  test('Edge Enterprise Features', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    const enterpriseFeatures = await page.evaluate(() => {
      return {
        // Microsoft Account Integration
        hasMSAccount: 'credentials' in navigator,
        
        // Enterprise Security
        hasCSP: 'securitypolicy' in document,
        hasSRI: 'integrity' in HTMLScriptElement.prototype,
        
        // Windows Integration
        isWindows: navigator.platform.includes('Win'),
        
        // Touch and Pen Support
        hasPointerEvents: 'PointerEvent' in window,
        hasTouchEvents: 'TouchEvent' in window,
        maxTouchPoints: navigator.maxTouchPoints,
        
        // Clipboard API
        hasClipboard: 'clipboard' in navigator,
        
        // Geolocation
        hasGeolocation: 'geolocation' in navigator,
        
        // Battery API
        hasBattery: 'getBattery' in navigator,
        
        // Network Information
        hasConnection: 'connection' in navigator,
        
        // Vibration API
        hasVibrate: 'vibrate' in navigator,
        
        // Web Share API
        hasWebShare: 'share' in navigator
      };
    });

    console.log('Edge エンタープライズ機能:', enterpriseFeatures);
  });

  test('Edge InPrivate Mode Detection', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'msedge', 
      'Edge専用テスト');

    const privacyFeatures = await page.evaluate(() => {
      return {
        // Do Not Track
        doNotTrack: navigator.doNotTrack,
        
        // Cookie Settings
        cookieEnabled: navigator.cookieEnabled,
        
        // Storage Quotas (InPrivate mode has limited storage)
        hasStorageManager: 'storage' in navigator && 'estimate' in navigator.storage,
        
        // IndexedDB availability
        hasIndexedDB: 'indexedDB' in window,
        
        // LocalStorage availability
        hasLocalStorage: (() => {
          try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
          } catch {
            return false;
          }
        })(),
        
        // SessionStorage availability  
        hasSessionStorage: (() => {
          try {
            sessionStorage.setItem('test', 'test');
            sessionStorage.removeItem('test');
            return true;
          } catch {
            return false;
          }
        })(),
        
        // WebSQL (deprecated but may be limited in InPrivate)
        hasWebSQL: 'openDatabase' in window,
        
        // Cache API
        hasCacheAPI: 'caches' in window
      };
    });

    expect(typeof privacyFeatures.doNotTrack).toBeDefined();
    expect(privacyFeatures.hasLocalStorage).toBeTruthy();
    console.log('Edge プライバシー機能:', privacyFeatures);
  });
});