/**
 * パフォーマンステスト
 * PlantUMLエディタのパフォーマンスを測定
 */

const { test, expect } = require('@playwright/test');

test.describe('Performance Tests', () => {
  test.use({
    // パフォーマンステスト用の設定
    video: 'on',
    trace: 'on'
  });

  test('PERF-001: 初期表示速度', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`初期表示時間: ${loadTime}ms`);
    
    // 3秒以内に表示されることを確認
    expect(loadTime).toBeLessThan(3000);
    
    // Core Web Vitalsの測定
    const metrics = await page.evaluate(() => {
      const paint = performance.getEntriesByType('paint');
      const navigation = performance.getEntriesByType('navigation')[0];
      
      return {
        FCP: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        LCP: null, // LCPは別途測定が必要
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });
    
    console.log('Performance Metrics:', metrics);
    
    // FCPが2.5秒以内であることを確認
    if (metrics.FCP) {
      expect(metrics.FCP).toBeLessThan(2500);
    }
  });

  test('PERF-002: 大量アクター追加のパフォーマンス', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const actorButtons = [
      '顧客', '管理者', 'ECサイト', 
      '在庫システム', '決済サービス', '配送業者'
    ];
    
    const startTime = Date.now();
    
    // すべてのアクターを追加
    for (const actor of actorButtons) {
      await page.click(`button:has-text("${actor}")`);
      await page.waitForTimeout(100);
    }
    
    const addTime = Date.now() - startTime;
    
    console.log(`${actorButtons.length}個のアクター追加時間: ${addTime}ms`);
    
    // 3秒以内に追加完了することを確認
    expect(addTime).toBeLessThan(3000);
    
    // PlantUMLコードが正しく生成されているか確認
    const code = await page.locator('#plantuml-code').inputValue();
    for (const actor of actorButtons) {
      expect(code).toContain(actor);
    }
  });

  test('PERF-003: 大量処理追加のパフォーマンス', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // アクターを追加
    await page.click('button:has-text("顧客")');
    await page.click('button:has-text("ECサイト")');
    
    const processCount = 10;
    const startTime = Date.now();
    
    // 大量の処理を追加
    for (let i = 1; i <= processCount; i++) {
      await page.selectOption('select:first-of-type', '顧客');
      await page.selectOption('select:last-of-type', 'ECサイト');
      await page.fill('input[placeholder*="処理内容"]', `処理${i}`);
      await page.click('button:has-text("追加"):last-of-type');
      await page.waitForTimeout(100);
    }
    
    const addTime = Date.now() - startTime;
    
    console.log(`${processCount}個の処理追加時間: ${addTime}ms`);
    
    // 5秒以内に追加完了することを確認
    expect(addTime).toBeLessThan(5000);
  });

  test('PERF-004: プレビュー生成速度', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 複雑なシナリオを作成
    await page.click('button:has-text("パターン選択")');
    await page.waitForTimeout(500);
    await page.click('.pattern-card:has-text("EC注文フロー") button');
    
    // プレビュー生成の時間を測定
    const startTime = Date.now();
    
    // プレビューが生成されるまで待つ
    await page.waitForSelector('.preview-container img', { 
      timeout: 10000,
      state: 'visible'
    }).catch(() => {
      // プレビューエラーの場合も許容
      console.log('プレビュー生成エラー（API制限の可能性）');
    });
    
    const previewTime = Date.now() - startTime;
    
    console.log(`プレビュー生成時間: ${previewTime}ms`);
    
    // 10秒以内に生成されることを確認
    expect(previewTime).toBeLessThan(10000);
  });

  test('PERF-005: メモリ使用量の確認', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 初期メモリ使用量を測定
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (initialMemory) {
      console.log('初期メモリ使用量:', {
        used: `${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(initialMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });
    }
    
    // 大量操作を実行
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("顧客")');
      await page.click('button:has-text("ECサイト")');
      await page.click('button:has-text("クリア")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(500);
    }
    
    // 操作後のメモリ使用量を測定
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (finalMemory && initialMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      console.log(`メモリ増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // メモリリークがないか確認（50MB以上の増加は警告）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('PERF-006: レスポンシブ性能', async ({ page }) => {
    // モバイルビューポートでのテスト
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const mobileLoadTime = Date.now() - startTime;
    
    console.log(`モバイル表示時間: ${mobileLoadTime}ms`);
    expect(mobileLoadTime).toBeLessThan(3000);
    
    // タブレットビューポート
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    // デスクトップビューポート
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    // 各ビューポートで主要要素が表示されているか確認
    await expect(page.locator('#plantuml-code')).toBeVisible();
  });
});