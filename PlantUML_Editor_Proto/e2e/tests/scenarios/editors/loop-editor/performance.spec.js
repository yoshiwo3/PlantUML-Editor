import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * TEST-E2E-011: LoopEditor パフォーマンステスト
 * 目的: 大量ループ、ネストループ、メモリ使用量、レンダリング性能を検証
 * カバレッジ: 大規模データ処理、パフォーマンス最適化、リソース管理
 */

test.describe('TEST-E2E-011: LoopEditor Performance Tests', () => {
  let editorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new PlantUMLEditorPage(page);
    await editorPage.open();
    await editorPage.enableTestMode();
    await editorPage.clearAllData();
    
    // パフォーマンス測定のためのモニタリング開始
    await page.evaluate(() => {
      window.performanceMetrics = {
        startTime: performance.now(),
        renderTimes: [],
        memoryUsage: []
      };
    });
  });

  test.afterEach(async () => {
    await editorPage.cleanup();
    
    // パフォーマンスレポートを出力
    const metrics = await page.evaluate(() => window.performanceMetrics);
    if (metrics) {
      console.log('Performance Report:', {
        totalTime: metrics.endTime - metrics.startTime,
        averageRenderTime: metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length,
        maxMemoryUsage: Math.max(...metrics.memoryUsage)
      });
    }
  });

  test.describe('大量ループ処理テスト', () => {
    
    test('1000回以上の反復ループパフォーマンス', async ({ page }) => {
      const startTime = Date.now();
      
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      await page.fill('[data-testid="for-variable"]', 'bigLoop');
      await page.fill('[data-testid="for-start"]', '1');
      await page.fill('[data-testid="for-end"]', '1500'); // 1500回反復
      
      // ループ本体に複数のアクション
      const actions = [
        'データ検証',
        'ビジネスロジック実行',
        '結果計算',
        'ログ出力',
        'カウンター更新'
      ];
      
      for (const [index, action] of actions.entries()) {
        await page.click('[data-testid="add-loop-action"]');
        await page.fill(`[data-testid="loop-message-${index + 1}"]`, action);
      }
      
      const loopCreationTime = Date.now();
      await page.click('[data-testid="save-loop"]');
      const saveTime = Date.now();
      
      // PlantUMLコード生成を待機
      await page.waitForFunction(() => {
        const code = document.querySelector('#plantuml-editor')?.value || '';
        return code.includes('loop bigLoop = 1 to 1500') && code.includes('end');
      }, { timeout: 15000 });
      
      const generationTime = Date.now();
      
      // パフォーマンス測定結果
      const metrics = {
        loopCreation: loopCreationTime - startTime,
        saveOperation: saveTime - loopCreationTime,
        codeGeneration: generationTime - saveTime,
        totalTime: generationTime - startTime
      };
      
      console.log('大量ループパフォーマンス:', metrics);
      
      // パフォーマンス基準
      expect(metrics.loopCreation).toBeLessThan(5000); // 5秒以内
      expect(metrics.saveOperation).toBeLessThan(2000); // 2秒以内
      expect(metrics.codeGeneration).toBeLessThan(3000); // 3秒以内
      expect(metrics.totalTime).toBeLessThan(10000); // 10秒以内
      
      // PlantUMLコードの正確性確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop bigLoop = 1 to 1500');
      expect(plantumlCode).toContain('データ検証');
      expect(plantumlCode).toContain('カウンター更新');
      expect(plantumlCode).toContain('end');
    });

    test('100個の並列ループ作成パフォーマンス', async ({ page }) => {
      const startTime = Date.now();
      const creationTimes = [];
      
      // 100個の独立したループを作成
      for (let i = 1; i <= 100; i++) {
        const loopStart = Date.now();
        
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'while');
        await page.fill('[data-testid="loop-condition"]', `条件${i}`);
        await page.click('[data-testid="add-loop-action"]');
        await page.fill('[data-testid="loop-message"]', `処理${i}`);
        await page.click('[data-testid="save-loop"]');
        
        const loopEnd = Date.now();
        creationTimes.push(loopEnd - loopStart);
        
        // 10個ごとに進捗報告
        if (i % 10 === 0) {
          const avgTime = creationTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;
          console.log(`${i}個完了 - 直近10個の平均作成時間: ${avgTime}ms`);
          
          // 平均作成時間が1秒を超えた場合は警告
          expect(avgTime).toBeLessThan(1000);
        }
      }
      
      const totalTime = Date.now() - startTime;
      const averageCreationTime = creationTimes.reduce((a, b) => a + b, 0) / creationTimes.length;
      
      console.log('100ループ作成パフォーマンス:', {
        totalTime,
        averageCreationTime,
        minTime: Math.min(...creationTimes),
        maxTime: Math.max(...creationTimes)
      });
      
      // パフォーマンス基準
      expect(totalTime).toBeLessThan(120000); // 2分以内
      expect(averageCreationTime).toBeLessThan(800); // 平均800ms以内
      
      // UI応答性確認
      const loopItems = page.locator('.loop-item');
      await expect(loopItems).toHaveCount(100);
    });

    test('大量アクション付きループのスクロール性能', async ({ page }) => {
      // 100個のアクションを持つループを作成
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'for');
      await page.fill('[data-testid="for-variable"]', 'i');
      await page.fill('[data-testid="for-start"]', '1');
      await page.fill('[data-testid="for-end"]', '100');
      
      const actionStartTime = Date.now();
      
      for (let i = 1; i <= 100; i++) {
        await page.click('[data-testid="add-loop-action"]');
        await page.fill(`[data-testid="loop-message-${i}"]`, `大量アクション${i}: データ処理とビジネスロジック実行`);
      }
      
      const actionEndTime = Date.now();
      await page.click('[data-testid="save-loop"]');
      const saveEndTime = Date.now();
      
      console.log('大量アクション処理時間:', {
        actionCreation: actionEndTime - actionStartTime,
        saveTime: saveEndTime - actionEndTime
      });
      
      // スクロール性能テスト
      const scrollStartTime = Date.now();
      
      // 上から下へスクロール
      for (let scroll = 0; scroll <= 1000; scroll += 100) {
        await page.evaluate((scrollY) => {
          document.querySelector('.loop-actions-container').scrollTop = scrollY;
        }, scroll);
        await page.waitForTimeout(50);
      }
      
      // 下から上へスクロール
      for (let scroll = 1000; scroll >= 0; scroll -= 100) {
        await page.evaluate((scrollY) => {
          document.querySelector('.loop-actions-container').scrollTop = scrollY;
        }, scroll);
        await page.waitForTimeout(50);
      }
      
      const scrollEndTime = Date.now();
      const scrollTime = scrollEndTime - scrollStartTime;
      
      console.log(`スクロール性能: ${scrollTime}ms`);
      
      // スクロール性能基準（5秒以内）
      expect(scrollTime).toBeLessThan(5000);
      
      // 表示確認
      await expect(page.locator('[data-testid="loop-action-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="loop-action-100"]')).toBeVisible();
    });
  });

  test.describe('ネストループパフォーマンステスト', () => {
    
    test('10重ネストループの処理性能', async ({ page }) => {
      const startTime = Date.now();
      let currentLoopSelector = '';
      
      // 10重ネストループを段階的に作成
      for (let level = 1; level <= 10; level++) {
        const levelStartTime = Date.now();
        
        if (level === 1) {
          // 最外側のループ
          await page.click('[data-testid="add-loop"]');
          currentLoopSelector = '[data-testid="loop-item-0"]';
        } else {
          // ネストループを追加
          await page.click(`${currentLoopSelector} [data-testid="add-nested-loop"]`);
          currentLoopSelector += ` [data-testid="nested-loop-item-${level-2}"]`;
        }
        
        await page.selectOption('[data-testid="loop-type"]', 'for');
        await page.fill('[data-testid="for-variable"]', `level${level}`);
        await page.fill('[data-testid="for-start"]', '1');
        await page.fill('[data-testid="for-end"]', `${level * 2}`); // 2, 4, 6, 8...
        
        // 最内層にのみアクションを追加
        if (level === 10) {
          await page.click('[data-testid="add-loop-action"]');
          await page.fill('[data-testid="loop-message"]', '最深部処理実行');
        }
        
        await page.click('[data-testid="save-loop"]');
        
        const levelEndTime = Date.now();
        console.log(`レベル${level}完了: ${levelEndTime - levelStartTime}ms`);
        
        // レベルごとの処理時間制限
        expect(levelEndTime - levelStartTime).toBeLessThan(5000);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`10重ネスト完了: ${totalTime}ms`);
      
      // 全体処理時間制限（30秒以内）
      expect(totalTime).toBeLessThan(30000);
      
      // PlantUMLコードの正確性確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      const loopCount = (plantumlCode.match(/loop /g) || []).length;
      const endCount = (plantumlCode.match(/end/g) || []).length;
      
      expect(loopCount).toBe(10);
      expect(endCount).toBe(10);
      expect(plantumlCode).toContain('最深部処理実行');
    });

    test('複雑なネスト構造の編集性能', async ({ page }) => {
      // 基本的な3重ネストを作成
      await page.click('[data-testid="add-loop"]');
      await page.selectOption('[data-testid="loop-type"]', 'while');
      await page.fill('[data-testid="loop-condition"]', '外側条件');
      await page.click('[data-testid="save-loop"]');
      
      await page.click('[data-testid="loop-item-0"] [data-testid="add-nested-loop"]');
      await page.selectOption('[data-testid="nested-loop-type"]', 'for');
      await page.fill('[data-testid="nested-for-variable"]', 'middle');
      await page.fill('[data-testid="nested-for-start"]', '1');
      await page.fill('[data-testid="nested-for-end"]', '50');
      await page.click('[data-testid="save-nested-loop"]');
      
      await page.click('[data-testid="nested-loop-item-0"] [data-testid="add-nested-loop"]');
      await page.selectOption('[data-testid="deep-nested-loop-type"]', 'foreach');
      await page.fill('[data-testid="deep-nested-foreach-variable"]', 'item');
      await page.fill('[data-testid="deep-nested-foreach-collection"]', 'データセット');
      
      // 内側のループに大量のアクションを追加
      const startTime = Date.now();
      for (let i = 1; i <= 50; i++) {
        await page.click('[data-testid="add-deep-nested-loop-action"]');
        await page.fill(`[data-testid="deep-nested-loop-message-${i}"]`, `内部処理${i}`);
      }
      
      await page.click('[data-testid="save-deep-nested-loop"]');
      const endTime = Date.now();
      
      console.log(`ネスト構造編集時間: ${endTime - startTime}ms`);
      
      // 編集性能基準（15秒以内）
      expect(endTime - startTime).toBeLessThan(15000);
      
      // 編集後の整合性確認
      const plantumlCode = await editorPage.getPlantUMLCode();
      expect(plantumlCode).toContain('loop 外側条件');
      expect(plantumlCode).toContain('loop middle = 1 to 50');
      expect(plantumlCode).toContain('loop for each item in データセット');
      expect(plantumlCode).toContain('内部処理1');
      expect(plantumlCode).toContain('内部処理50');
    });

    test('ネストループの動的追加・削除性能', async ({ page }) => {
      const operations = [];
      
      // 動的にネストループを追加・削除を繰り返す
      for (let cycle = 1; cycle <= 20; cycle++) {
        const cycleStartTime = Date.now();
        
        // ループ追加
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'for');
        await page.fill('[data-testid="for-variable"]', `cycle${cycle}`);
        await page.fill('[data-testid="for-start"]', '1');
        await page.fill('[data-testid="for-end"]', '10');
        await page.click('[data-testid="save-loop"]');
        
        // ネストループ追加
        await page.click(`[data-testid="loop-item-${cycle-1}"] [data-testid="add-nested-loop"]`);
        await page.selectOption('[data-testid="nested-loop-type"]', 'while');
        await page.fill('[data-testid="nested-loop-condition"]', `ネスト条件${cycle}`);
        await page.click('[data-testid="save-nested-loop"]');
        
        const addEndTime = Date.now();
        
        // 奇数サイクルでは削除も実行
        if (cycle % 2 === 1 && cycle > 1) {
          const deleteTarget = Math.floor(cycle / 2);
          await page.click(`[data-testid="delete-loop-${deleteTarget}"]`);
          page.on('dialog', async dialog => await dialog.accept());
        }
        
        const cycleEndTime = Date.now();
        
        operations.push({
          cycle,
          addTime: addEndTime - cycleStartTime,
          totalTime: cycleEndTime - cycleStartTime
        });
        
        console.log(`サイクル${cycle} - 追加: ${addEndTime - cycleStartTime}ms, 全体: ${cycleEndTime - cycleStartTime}ms`);
        
        // 各操作の性能基準
        expect(addEndTime - cycleStartTime).toBeLessThan(3000);
        expect(cycleEndTime - cycleStartTime).toBeLessThan(5000);
      }
      
      // 平均性能の確認
      const avgAddTime = operations.reduce((sum, op) => sum + op.addTime, 0) / operations.length;
      const avgTotalTime = operations.reduce((sum, op) => sum + op.totalTime, 0) / operations.length;
      
      console.log('動的操作平均性能:', { avgAddTime, avgTotalTime });
      
      expect(avgAddTime).toBeLessThan(2000);
      expect(avgTotalTime).toBeLessThan(3000);
    });
  });

  test.describe('メモリ使用量とリソース管理テスト', () => {
    
    test('大量ループ作成時のメモリ使用量監視', async ({ page }) => {
      const memorySnapshots = [];
      
      // 初期メモリ使用量
      let initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (initialMemory) {
        memorySnapshots.push({ count: 0, ...initialMemory });
        console.log('初期メモリ:', `${Math.round(initialMemory.used / 1024 / 1024)}MB`);
      }
      
      // 50個のループを作成しながらメモリ使用量を監視
      for (let i = 1; i <= 50; i++) {
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'for');
        await page.fill('[data-testid="for-variable"]', `memTest${i}`);
        await page.fill('[data-testid="for-start"]', '1');
        await page.fill('[data-testid="for-end"]', '100');
        
        // 各ループに10個のアクション追加
        for (let j = 1; j <= 10; j++) {
          await page.click('[data-testid="add-loop-action"]');
          await page.fill(`[data-testid="loop-message-${j}"]`, `メモリテスト処理${i}-${j}`);
        }
        
        await page.click('[data-testid="save-loop"]');
        
        // 5個ごとにメモリ使用量を記録
        if (i % 5 === 0) {
          const currentMemory = await page.evaluate(() => {
            if (performance.memory) {
              return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
              };
            }
            return null;
          });
          
          if (currentMemory) {
            memorySnapshots.push({ count: i, ...currentMemory });
            const usedMB = Math.round(currentMemory.used / 1024 / 1024);
            console.log(`${i}個作成後メモリ: ${usedMB}MB`);
            
            // メモリ使用量が500MBを超えないことを確認
            expect(currentMemory.used).toBeLessThan(500 * 1024 * 1024);
          }
        }
      }
      
      // メモリ増加率の分析
      if (memorySnapshots.length > 1) {
        const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].used - memorySnapshots[0].used;
        const growthPerLoop = memoryGrowth / 50;
        
        console.log('メモリ増加分析:', {
          totalGrowth: `${Math.round(memoryGrowth / 1024 / 1024)}MB`,
          growthPerLoop: `${Math.round(growthPerLoop / 1024)}KB`
        });
        
        // ループあたりのメモリ増加が1MB以下であることを確認
        expect(growthPerLoop).toBeLessThan(1024 * 1024);
      }
    });

    test('ガベージコレクション効果の確認', async ({ page }) => {
      // 大量のループを作成
      for (let i = 1; i <= 30; i++) {
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'while');
        await page.fill('[data-testid="loop-condition"]', `GC条件${i}`);
        await page.click('[data-testid="add-loop-action"]');
        await page.fill('[data-testid="loop-message"]', `GCテスト処理${i}`);
        await page.click('[data-testid="save-loop"]');
      }
      
      // 作成後のメモリ使用量
      const memoryAfterCreation = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      // 全てのループを削除
      for (let i = 29; i >= 0; i--) {
        await page.click(`[data-testid="delete-loop-${i}"]`);
        page.on('dialog', async dialog => await dialog.accept());
      }
      
      // 手動でガベージコレクションを実行
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      // 削除後のメモリ使用量
      await page.waitForTimeout(2000); // GC実行待機
      const memoryAfterDeletion = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      if (memoryAfterCreation && memoryAfterDeletion) {
        const memoryReduction = memoryAfterCreation - memoryAfterDeletion;
        const reductionPercentage = (memoryReduction / memoryAfterCreation) * 100;
        
        console.log('ガベージコレクション効果:', {
          before: `${Math.round(memoryAfterCreation / 1024 / 1024)}MB`,
          after: `${Math.round(memoryAfterDeletion / 1024 / 1024)}MB`,
          reduction: `${Math.round(memoryReduction / 1024 / 1024)}MB`,
          percentage: `${reductionPercentage.toFixed(1)}%`
        });
        
        // メモリが一定量解放されることを確認（最低20%）
        expect(reductionPercentage).toBeGreaterThan(20);
      }
    });

    test('長時間運用でのメモリリーク検出', async ({ page }) => {
      const memorySnapshots = [];
      const cycleCount = 20;
      
      // 継続的にループの作成・編集・削除を繰り返す
      for (let cycle = 1; cycle <= cycleCount; cycle++) {
        // サイクル開始時のメモリ記録
        const cycleStartMemory = await page.evaluate(() => {
          return performance.memory ? performance.memory.usedJSHeapSize : 0;
        });
        
        // ループ作成
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'for');
        await page.fill('[data-testid="for-variable"]', `leak${cycle}`);
        await page.fill('[data-testid="for-start"]', '1');
        await page.fill('[data-testid="for-end"]', '20');
        
        // アクション追加
        for (let i = 1; i <= 5; i++) {
          await page.click('[data-testid="add-loop-action"]');
          await page.fill(`[data-testid="loop-message-${i}"]`, `リークテスト${cycle}-${i}`);
        }
        
        await page.click('[data-testid="save-loop"]');
        
        // 編集操作
        await page.click('[data-testid="edit-loop-0"]');
        await page.fill('[data-testid="loop-condition"]', `編集済み条件${cycle}`);
        await page.click('[data-testid="save-loop"]');
        
        // 削除操作
        await page.click('[data-testid="delete-loop-0"]');
        page.on('dialog', async dialog => await dialog.accept());
        
        // サイクル終了時のメモリ記録
        const cycleEndMemory = await page.evaluate(() => {
          return performance.memory ? performance.memory.usedJSHeapSize : 0;
        });
        
        memorySnapshots.push({
          cycle,
          startMemory: cycleStartMemory,
          endMemory: cycleEndMemory,
          diff: cycleEndMemory - cycleStartMemory
        });
        
        if (cycle % 5 === 0) {
          const avgDiff = memorySnapshots.slice(-5).reduce((sum, s) => sum + s.diff, 0) / 5;
          console.log(`サイクル${cycle} - 平均メモリ差分: ${Math.round(avgDiff / 1024)}KB`);
          
          // 平均メモリ差分が1MB以下であることを確認
          expect(Math.abs(avgDiff)).toBeLessThan(1024 * 1024);
        }
      }
      
      // 全体的なメモリ増加傾向の分析
      const totalMemoryIncrease = memorySnapshots[cycleCount - 1].endMemory - memorySnapshots[0].startMemory;
      const increasePerCycle = totalMemoryIncrease / cycleCount;
      
      console.log('メモリリーク分析:', {
        totalIncrease: `${Math.round(totalMemoryIncrease / 1024 / 1024)}MB`,
        increasePerCycle: `${Math.round(increasePerCycle / 1024)}KB`
      });
      
      // サイクルあたりのメモリ増加が500KB以下であることを確認
      expect(Math.abs(increasePerCycle)).toBeLessThan(500 * 1024);
    });
  });

  test.describe('レンダリング性能とUI応答性テスト', () => {
    
    test('大量ループのレンダリング時間測定', async ({ page }) => {
      const renderTimes = [];
      
      for (let i = 1; i <= 25; i++) {
        const renderStartTime = Date.now();
        
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'while');
        await page.fill('[data-testid="loop-condition"]', `レンダリング条件${i}`);
        
        // 複数のアクションを追加
        for (let j = 1; j <= 8; j++) {
          await page.click('[data-testid="add-loop-action"]');
          await page.fill(`[data-testid="loop-message-${j}"]`, `レンダリングテスト${i}-${j}`);
        }
        
        await page.click('[data-testid="save-loop"]');
        
        // レンダリング完了を待機
        await page.waitForFunction((index) => {
          const loopItem = document.querySelector(`[data-testid="loop-item-${index}"]`);
          return loopItem && loopItem.offsetHeight > 0;
        }, i - 1);
        
        const renderEndTime = Date.now();
        const renderTime = renderEndTime - renderStartTime;
        renderTimes.push(renderTime);
        
        console.log(`ループ${i}レンダリング時間: ${renderTime}ms`);
        
        // 個別のレンダリング時間制限（3秒以内）
        expect(renderTime).toBeLessThan(3000);
        
        // UI応答性確認（5個ごと）
        if (i % 5 === 0) {
          const avgRenderTime = renderTimes.slice(-5).reduce((a, b) => a + b, 0) / 5;
          console.log(`直近5個の平均レンダリング時間: ${avgRenderTime}ms`);
          
          // 平均レンダリング時間が悪化していないことを確認
          expect(avgRenderTime).toBeLessThan(2000);
        }
      }
      
      // 全体のレンダリング性能分析
      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      const minRenderTime = Math.min(...renderTimes);
      
      console.log('レンダリング性能サマリー:', {
        average: `${avgRenderTime}ms`,
        max: `${maxRenderTime}ms`,
        min: `${minRenderTime}ms`
      });
      
      expect(avgRenderTime).toBeLessThan(1500);
      expect(maxRenderTime).toBeLessThan(3000);
    });

    test('スクロール性能とビューポート最適化', async ({ page }) => {
      // 大量のループを作成
      for (let i = 1; i <= 100; i++) {
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'for');
        await page.fill('[data-testid="for-variable"]', `scroll${i}`);
        await page.fill('[data-testid="for-start"]', '1');
        await page.fill('[data-testid="for-end"]', '5');
        await page.click('[data-testid="add-loop-action"]');
        await page.fill('[data-testid="loop-message"]', `スクロールテスト${i}`);
        await page.click('[data-testid="save-loop"]');
      }
      
      // スクロール性能テスト
      const scrollTests = [
        { name: '上から下へのスクロール', direction: 'down' },
        { name: '下から上へのスクロール', direction: 'up' },
        { name: 'ランダムスクロール', direction: 'random' }
      ];
      
      for (const test of scrollTests) {
        const startTime = Date.now();
        const scrollSteps = 20;
        
        if (test.direction === 'down') {
          for (let step = 0; step <= scrollSteps; step++) {
            const scrollY = (step / scrollSteps) * 5000;
            await page.evaluate((y) => window.scrollTo(0, y), scrollY);
            await page.waitForTimeout(100);
          }
        } else if (test.direction === 'up') {
          for (let step = scrollSteps; step >= 0; step--) {
            const scrollY = (step / scrollSteps) * 5000;
            await page.evaluate((y) => window.scrollTo(0, y), scrollY);
            await page.waitForTimeout(100);
          }
        } else if (test.direction === 'random') {
          for (let step = 0; step < scrollSteps; step++) {
            const scrollY = Math.random() * 5000;
            await page.evaluate((y) => window.scrollTo(0, y), scrollY);
            await page.waitForTimeout(100);
          }
        }
        
        const endTime = Date.now();
        const scrollTime = endTime - startTime;
        
        console.log(`${test.name}: ${scrollTime}ms`);
        
        // スクロール性能基準（5秒以内）
        expect(scrollTime).toBeLessThan(5000);
      }
      
      // ビューポート内の要素が正しく表示されることを確認
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator('[data-testid="loop-item-0"]')).toBeVisible();
      
      await page.evaluate(() => window.scrollTo(0, 2500));
      await expect(page.locator('[data-testid="loop-item-50"]')).toBeVisible();
      
      await page.evaluate(() => window.scrollTo(0, 5000));
      await expect(page.locator('[data-testid="loop-item-99"]')).toBeVisible();
    });

    test('リアルタイム更新時のUI応答性', async ({ page }) => {
      // リアルタイム更新モードを有効化
      await page.check('[data-testid="enable-realtime-updates"]');
      
      const updateTimes = [];
      
      // 10個のループで同時編集をシミュレート
      for (let i = 1; i <= 10; i++) {
        await page.click('[data-testid="add-loop"]');
        await page.selectOption('[data-testid="loop-type"]', 'while');
        await page.fill('[data-testid="loop-condition"]', `リアルタイム条件${i}`);
        await page.click('[data-testid="save-loop"]');
      }
      
      // 各ループを高速で編集
      for (let i = 0; i < 10; i++) {
        const updateStartTime = Date.now();
        
        await page.click(`[data-testid="edit-loop-${i}"]`);
        await page.fill('[data-testid="loop-condition"]', `高速更新条件${i}_${Date.now()}`);
        await page.click('[data-testid="save-loop"]');
        
        // リアルタイム更新の反映を待機
        await page.waitForFunction((index, timestamp) => {
          const element = document.querySelector(`[data-testid="loop-item-${index}"] .condition-text`);
          return element && element.textContent.includes(timestamp);
        }, i, Date.now().toString().slice(-4));
        
        const updateEndTime = Date.now();
        const updateTime = updateEndTime - updateStartTime;
        updateTimes.push(updateTime);
        
        console.log(`ループ${i}更新時間: ${updateTime}ms`);
        
        // リアルタイム更新時間制限（1秒以内）
        expect(updateTime).toBeLessThan(1000);
      }
      
      // 平均更新時間の確認
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      console.log(`平均更新時間: ${avgUpdateTime}ms`);
      
      expect(avgUpdateTime).toBeLessThan(500);
    });
  });
});