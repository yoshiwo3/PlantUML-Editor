/**
 * Chromium/Chrome固有機能テスト
 * V8エンジン特性とChrome独自機能のテスト
 */

import { test, expect } from '@playwright/test';
import { BrowserMatrixGenerator } from '../browser-matrix/browser-config.js';

test.describe('Chromium/V8エンジン固有テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8086');
    
    // Chrome DevTools Protocol有効化
    if (page.context().browser().browserType().name() === 'chromium') {
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Runtime.enable');
      await cdpSession.send('Debugger.enable');
    }
  });

  test('V8エンジンのJavaScript最適化確認', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    // V8最適化の確認
    const optimizationResult = await page.evaluate(() => {
      // ホット関数を作成（V8最適化対象）
      function hotFunction(input) {
        return input.split('').reverse().join('');
      }

      // 大量実行でV8最適化を促す
      const iterations = 10000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        hotFunction('テストデータ' + i);
      }
      
      const endTime = performance.now();
      
      return {
        executionTime: endTime - startTime,
        iterationsPerMs: iterations / (endTime - startTime)
      };
    });

    // V8最適化により高速実行が期待される
    expect(optimizationResult.iterationsPerMs).toBeGreaterThan(100);
    console.log('V8最適化性能:', optimizationResult);
  });

  test('Web Workers並列処理性能', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    const workerResult = await page.evaluate(async () => {
      // Web Worker作成
      const workerCode = `
        self.addEventListener('message', (e) => {
          const { data } = e;
          // 重い計算処理（PlantUMLパース模擬）
          let result = '';
          for (let i = 0; i < data.iterations; i++) {
            result += data.text + i + '\\n';
          }
          self.postMessage({ result, processingTime: performance.now() - data.startTime });
        });
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      return new Promise((resolve) => {
        worker.onmessage = (e) => {
          resolve(e.data);
          worker.terminate();
        };
        
        worker.postMessage({
          text: 'PlantUMLテキスト',
          iterations: 1000,
          startTime: performance.now()
        });
      });
    });

    expect(workerResult.processingTime).toBeLessThan(1000);
    expect(workerResult.result).toContain('PlantUMLテキスト');
    console.log('Web Worker性能:', workerResult.processingTime + 'ms');
  });

  test('Chrome DevTools Console API', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    // コンソールメッセージ監視
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg));

    await page.evaluate(() => {
      // Chrome拡張Console API使用
      console.time('PlantUML処理時間');
      console.group('PlantUMLエディター処理');
      console.info('処理開始');
      console.warn('警告メッセージ');
      console.error('エラーメッセージ');
      console.groupEnd();
      console.timeEnd('PlantUML処理時間');
    });

    // Console APIメッセージの確認
    expect(consoleMessages.length).toBeGreaterThan(0);
    const hasTimeLog = consoleMessages.some(msg => 
      msg.text().includes('PlantUML処理時間')
    );
    expect(hasTimeLog).toBeTruthy();
  });

  test('Memory Pressure API対応', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    const memoryInfo = await page.evaluate(() => {
      if (!performance.memory) {
        return { unsupported: true };
      }

      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        supported: true
      };
    });

    if (memoryInfo.supported) {
      expect(memoryInfo.usedJSHeapSize).toBeGreaterThan(0);
      expect(memoryInfo.totalJSHeapSize).toBeGreaterThanOrEqual(memoryInfo.usedJSHeapSize);
      console.log('メモリ使用量:', (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB');
    }
  });

  test('Performance Observer高精度計測', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    const performanceData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = {};
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            metrics[entry.name] = {
              duration: entry.duration,
              startTime: entry.startTime,
              entryType: entry.entryType
            };
          }
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
        
        // カスタム計測
        performance.mark('plantuml-start');
        
        // 模擬処理
        setTimeout(() => {
          performance.mark('plantuml-end');
          performance.measure('plantuml-processing', 'plantuml-start', 'plantuml-end');
          
          setTimeout(() => {
            observer.disconnect();
            resolve(metrics);
          }, 100);
        }, 50);
      });
    });

    expect(performanceData['plantuml-processing']).toBeDefined();
    expect(performanceData['plantuml-processing'].duration).toBeGreaterThan(0);
    console.log('パフォーマンス計測:', performanceData);
  });

  test('Chrome拡張機能互換性', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    // 拡張機能APIの存在確認
    const extensionApi = await page.evaluate(() => {
      return {
        hasChrome: typeof chrome !== 'undefined',
        hasRuntime: typeof chrome?.runtime !== 'undefined',
        hasStorage: typeof chrome?.storage !== 'undefined',
        hasTab: typeof chrome?.tabs !== 'undefined'
      };
    });

    // 通常のWebページでは拡張機能APIは利用できない
    expect(extensionApi.hasChrome).toBeFalsy();
  });

  test('WebGL 2.0サポート確認', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    const webglSupport = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      
      if (!gl) {
        return { supported: false };
      }

      return {
        supported: true,
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
      };
    });

    expect(webglSupport.supported).toBeTruthy();
    console.log('WebGL情報:', webglSupport);
  });

  test('Service Worker高度な機能', async ({ page, context }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    // Service Worker登録
    const swResult = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false };
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        return {
          supported: true,
          scope: registration.scope,
          state: registration.installing?.state || registration.active?.state
        };
      } catch (error) {
        return {
          supported: true,
          error: error.message
        };
      }
    });

    expect(swResult.supported).toBeTruthy();
  });

  test('Chrome独自CSS機能', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    await page.setContent(`
      <style>
        .chrome-feature {
          background: linear-gradient(45deg, #ff0000, #00ff00, #0000ff);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
        }
      </style>
      <div class="chrome-feature">Chrome専用グラデーションテキスト</div>
    `);

    const cssSupport = await page.evaluate(() => {
      const element = document.querySelector('.chrome-feature');
      const computedStyle = window.getComputedStyle(element);
      
      return {
        backgroundClip: computedStyle.getPropertyValue('-webkit-background-clip'),
        textFillColor: computedStyle.getPropertyValue('-webkit-text-fill-color'),
        filter: computedStyle.getPropertyValue('filter')
      };
    });

    expect(cssSupport.backgroundClip).toBe('text');
    expect(cssSupport.textFillColor).toBe('transparent');
  });

  test('File System Access API', async ({ page }) => {
    test.skip(page.context().browser().browserType().name() !== 'chromium', 
      'Chromium専用テスト');

    const fileApiSupport = await page.evaluate(() => {
      return {
        hasShowOpenFilePicker: typeof window.showOpenFilePicker === 'function',
        hasShowSaveFilePicker: typeof window.showSaveFilePicker === 'function',
        hasShowDirectoryPicker: typeof window.showDirectoryPicker === 'function'
      };
    });

    // 現在のChromeバージョンではサポートされている
    expect(fileApiSupport.hasShowOpenFilePicker).toBeTruthy();
    console.log('File System Access API:', fileApiSupport);
  });
});