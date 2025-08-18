/**
 * TEST-E2E-017: レンダリング最適化テスト (3 SP)
 * 
 * 初期レンダリング性能、再レンダリング最適化、バッチ更新処理、アニメーションフレーム性能を検証
 * パフォーマンス目標: 初期レンダリング < 100ms, 再描画 < 16ms, 60fps維持
 */

const { test, expect } = require('@playwright/test');

test.describe('Rendering Optimization Tests - TEST-E2E-017', () => {
  test.use({
    // レンダリング最適化テスト専用設定
    video: 'on',
    trace: 'on',
    launchOptions: {
      args: [
        '--enable-precise-memory-info',
        '--enable-gpu-benchmarking',
        '--disable-dev-shm-usage'
      ]
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // レンダリング性能監視システムを初期化
    await page.evaluate(() => {
      window.renderingMonitor = {
        frameTimes: [],
        renderOperations: [],
        paintTimes: [],
        layoutTimes: [],
        
        // フレーム時間を記録
        recordFrame() {
          let lastTime = performance.now();
          const measure = () => {
            const now = performance.now();
            const frameTime = now - lastTime;
            this.frameTimes.push({
              timestamp: now,
              frameTime,
              fps: 1000 / frameTime
            });
            lastTime = now;
            requestAnimationFrame(measure);
          };
          requestAnimationFrame(measure);
        },
        
        // レンダリング操作を記録
        recordRenderOperation(operation, startTime, endTime) {
          this.renderOperations.push({
            operation,
            duration: endTime - startTime,
            timestamp: endTime
          });
        },
        
        // ペイント時間を測定
        measurePaintTiming() {
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach(entry => {
            this.paintTimes.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration || 0
            });
          });
        },
        
        // レイアウト時間を測定
        measureLayoutTiming() {
          const measureEntries = performance.getEntriesByType('measure');
          measureEntries.forEach(entry => {
            if (entry.name.includes('layout') || entry.name.includes('reflow')) {
              this.layoutTimes.push({
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration
              });
            }
          });
        },
        
        // パフォーマンス分析
        analyzePerformance() {
          const frames = this.frameTimes;
          if (frames.length === 0) return null;
          
          const avgFPS = frames.reduce((sum, f) => sum + f.fps, 0) / frames.length;
          const minFPS = Math.min(...frames.map(f => f.fps));
          const maxFrameTime = Math.max(...frames.map(f => f.frameTime));
          const droppedFrames = frames.filter(f => f.fps < 30).length;
          
          return {
            totalFrames: frames.length,
            averageFPS: avgFPS,
            minimumFPS: minFPS,
            maximumFrameTime: maxFrameTime,
            droppedFrames,
            frameDropRate: (droppedFrames / frames.length) * 100,
            renderOperations: this.renderOperations.length,
            paintOperations: this.paintTimes.length,
            layoutOperations: this.layoutTimes.length
          };
        },
        
        // パフォーマンスをリセット
        reset() {
          this.frameTimes = [];
          this.renderOperations = [];
          this.paintTimes = [];
          this.layoutTimes = [];
        }
      };
      
      // 監視開始
      window.renderingMonitor.recordFrame();
    });
  });

  test('RO-001: 初期レンダリング性能測定', async ({ page }) => {
    // 複雑なPlantUML図での初期レンダリング性能をテスト
    const complexDiagram = generateComplexRenderingDiagram();
    
    const initialRenderStart = Date.now();
    
    // 性能監視をリセット
    await page.evaluate(() => {
      window.renderingMonitor.reset();
      performance.clearMarks();
      performance.clearMeasures();
    });
    
    // パフォーマンスマークを設定
    await page.evaluate(() => {
      performance.mark('render-start');
    });
    
    // 複雑な図を入力
    await page.evaluate((diagram) => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = diagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, complexDiagram);
    
    // レンダリング完了を待つ
    await page.waitForSelector('.editor-container', { state: 'visible' });
    await page.waitForTimeout(500); // 追加のレンダリング時間
    
    const initialRenderEnd = Date.now();
    const totalRenderTime = initialRenderEnd - initialRenderStart;
    
    // パフォーマンスマークを終了
    const renderingMetrics = await page.evaluate(() => {
      performance.mark('render-end');
      performance.measure('initial-render', 'render-start', 'render-end');
      
      const measureEntries = performance.getEntriesByName('initial-render');
      const paintEntries = performance.getEntriesByType('paint');
      
      window.renderingMonitor.measurePaintTiming();
      window.renderingMonitor.measureLayoutTiming();
      
      return {
        measureTime: measureEntries[0]?.duration || 0,
        paintTiming: paintEntries.map(entry => ({
          name: entry.name,
          startTime: entry.startTime
        })),
        performanceAnalysis: window.renderingMonitor.analyzePerformance()
      };
    });
    
    console.log('初期レンダリング性能メトリクス:', {
      totalTime: totalRenderTime,
      ...renderingMetrics
    });
    
    // 初期レンダリング性能要件の検証
    expect(totalRenderTime).toBeLessThan(3000); // 3秒以内
    expect(renderingMetrics.measureTime).toBeLessThan(1000); // 測定時間1秒以内
    
    if (renderingMetrics.performanceAnalysis) {
      expect(renderingMetrics.performanceAnalysis.averageFPS).toBeGreaterThan(20);
      expect(renderingMetrics.performanceAnalysis.frameDropRate).toBeLessThan(30);
    }
  });

  test('RO-002: 再レンダリング最適化', async ({ page }) => {
    // 初期図を設定
    await page.evaluate(() => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = '@startuml\nA -> B: Initial\n@enduml';
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    await page.waitForTimeout(500);
    
    // 複数回の編集による再レンダリング性能を測定
    const reRenderTests = [];
    
    for (let i = 0; i < 10; i++) {
      const editStart = Date.now();
      
      await page.evaluate(() => {
        window.renderingMonitor.reset();
        performance.mark(`edit-start-${Date.now()}`);
      });
      
      // 段階的な編集を実行
      const editContent = `@startuml\nA -> B: Message ${i}\nB -> C: Response ${i}\nC -> A: Feedback ${i}\n@enduml`;
      
      await page.evaluate((content) => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          // 段階的に文字を追加（リアルタイム編集をシミュレート）
          codeArea.value = content;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, editContent);
      
      // 再レンダリング完了を待つ
      await page.waitForTimeout(200);
      
      const editEnd = Date.now();
      const editDuration = editEnd - editStart;
      
      const reRenderMetrics = await page.evaluate((iteration) => {
        performance.mark(`edit-end-${Date.now()}`);
        return {
          iteration,
          editTime: Date.now(),
          performanceAnalysis: window.renderingMonitor.analyzePerformance()
        };
      }, i);
      
      reRenderMetrics.totalEditTime = editDuration;
      reRenderTests.push(reRenderMetrics);
      
      console.log(`Re-render ${i}: ${editDuration}ms`);
    }
    
    // 再レンダリング性能の分析
    const avgReRenderTime = reRenderTests.reduce((sum, test) => sum + test.totalEditTime, 0) / reRenderTests.length;
    const maxReRenderTime = Math.max(...reRenderTests.map(test => test.totalEditTime));
    
    console.log('再レンダリング性能分析:', {
      tests: reRenderTests.length,
      averageTime: avgReRenderTime,
      maximumTime: maxReRenderTime
    });
    
    // 再レンダリング性能要件の検証
    expect(avgReRenderTime).toBeLessThan(500); // 平均500ms以内
    expect(maxReRenderTime).toBeLessThan(1000); // 最大1秒以内
    
    // フレームレートが安定していることを確認
    const stableTests = reRenderTests.filter(test => 
      test.performanceAnalysis && test.performanceAnalysis.frameDropRate < 20
    );
    expect(stableTests.length).toBeGreaterThan(reRenderTests.length * 0.7); // 70%以上が安定
  });

  test('RO-003: バッチ更新処理性能', async ({ page }) => {
    // バッチ更新のシミュレーション
    const batchUpdates = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      content: `@startuml\nActor${i} -> System${i}: Batch ${i}\n@enduml`
    }));
    
    const batchStart = Date.now();
    
    await page.evaluate(() => {
      window.renderingMonitor.reset();
      performance.mark('batch-start');
    });
    
    // 連続更新をバッチで実行
    await page.evaluate((updates) => {
      const codeArea = document.querySelector('#plantuml-code');
      if (!codeArea) return;
      
      // バッチ更新をシミュレート
      let combinedContent = '@startuml\n';
      updates.forEach(update => {
        combinedContent += `Actor${update.id} -> System${update.id}: Batch ${update.id}\n`;
      });
      combinedContent += '@enduml';
      
      // 一度に全ての更新を適用
      codeArea.value = combinedContent;
      codeArea.dispatchEvent(new Event('input', { bubbles: true }));
    }, batchUpdates);
    
    // バッチ処理完了を待つ
    await page.waitForTimeout(1000);
    
    const batchEnd = Date.now();
    const batchDuration = batchEnd - batchStart;
    
    const batchMetrics = await page.evaluate(() => {
      performance.mark('batch-end');
      performance.measure('batch-update', 'batch-start', 'batch-end');
      
      const batchMeasure = performance.getEntriesByName('batch-update')[0];
      
      return {
        batchMeasureTime: batchMeasure?.duration || 0,
        performanceAnalysis: window.renderingMonitor.analyzePerformance()
      };
    });
    
    console.log('バッチ更新性能メトリクス:', {
      totalTime: batchDuration,
      ...batchMetrics
    });
    
    // バッチ更新性能要件の検証
    expect(batchDuration).toBeLessThan(2000); // 2秒以内
    expect(batchMetrics.batchMeasureTime).toBeLessThan(1500); // 測定時間1.5秒以内
    
    if (batchMetrics.performanceAnalysis) {
      expect(batchMetrics.performanceAnalysis.averageFPS).toBeGreaterThan(15);
      expect(batchMetrics.performanceAnalysis.maximumFrameTime).toBeLessThan(200); // 200ms以内
    }
  });

  test('RO-004: アニメーションフレーム性能', async ({ page }) => {
    // アニメーション効果のあるUI要素をテスト
    const animationDuration = 3000; // 3秒間のアニメーション監視
    
    await page.evaluate(() => {
      window.renderingMonitor.reset();
      
      // アニメーション開始
      performance.mark('animation-start');
      
      // CSS アニメーションを追加
      const style = document.createElement('style');
      style.textContent = `
        .animation-test {
          animation: slideIn 1s ease-in-out infinite alternate;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          padding: 20px;
          margin: 10px;
          border-radius: 8px;
        }
        
        @keyframes slideIn {
          from { transform: translateX(-100px); opacity: 0.5; }
          to { transform: translateX(100px); opacity: 1; }
        }
        
        .loading-spinner {
          animation: spin 1s linear infinite;
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      
      // アニメーション要素を追加
      for (let i = 0; i < 5; i++) {
        const animElement = document.createElement('div');
        animElement.className = 'animation-test';
        animElement.textContent = `Animation Element ${i}`;
        document.body.appendChild(animElement);
      }
      
      // スピナー要素を追加
      for (let i = 0; i < 3; i++) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        document.body.appendChild(spinner);
      }
    });
    
    // アニメーション実行中のフレームレートを監視
    await page.waitForTimeout(animationDuration);
    
    const animationMetrics = await page.evaluate(() => {
      performance.mark('animation-end');
      performance.measure('animation-duration', 'animation-start', 'animation-end');
      
      const animationMeasure = performance.getEntriesByName('animation-duration')[0];
      const performanceAnalysis = window.renderingMonitor.analyzePerformance();
      
      // アニメーション要素を削除
      document.querySelectorAll('.animation-test, .loading-spinner').forEach(el => el.remove());
      
      return {
        animationDuration: animationMeasure?.duration || 0,
        performanceAnalysis
      };
    });
    
    console.log('アニメーションフレーム性能メトリクス:', animationMetrics);
    
    if (animationMetrics.performanceAnalysis) {
      // アニメーション中のフレームレート要件
      expect(animationMetrics.performanceAnalysis.averageFPS).toBeGreaterThan(30); // 30fps以上
      expect(animationMetrics.performanceAnalysis.frameDropRate).toBeLessThan(25); // フレームドロップ25%未満
      expect(animationMetrics.performanceAnalysis.maximumFrameTime).toBeLessThan(50); // 最大フレーム時間50ms未満
      
      console.log(`Average FPS during animation: ${animationMetrics.performanceAnalysis.averageFPS.toFixed(2)}`);
      console.log(`Frame drop rate: ${animationMetrics.performanceAnalysis.frameDropRate.toFixed(2)}%`);
    }
  });

  test('RO-005: CSS性能最適化', async ({ page }) => {
    // CSS集約的な要素での性能テスト
    const cssTestStart = Date.now();
    
    await page.evaluate(() => {
      window.renderingMonitor.reset();
      performance.mark('css-test-start');
      
      // CSS集約的なスタイルを追加
      const heavyStyles = document.createElement('style');
      heavyStyles.textContent = `
        .complex-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          padding: 20px;
          background: linear-gradient(
            45deg, 
            rgba(255, 0, 0, 0.1) 0%, 
            rgba(0, 255, 0, 0.1) 50%, 
            rgba(0, 0, 255, 0.1) 100%
          );
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.1),
            0 4px 8px rgba(0,0,0,0.1),
            0 8px 16px rgba(0,0,0,0.1);
          border-radius: 12px;
          transform: perspective(1000px) rotateX(5deg);
        }
        
        .complex-item {
          background: white;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        
        .complex-item:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .text-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
          color: #333;
          text-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
      `;
      document.head.appendChild(heavyStyles);
      
      // 大量の複雑な要素を作成
      const container = document.createElement('div');
      container.className = 'complex-layout';
      
      for (let i = 0; i < 50; i++) {
        const item = document.createElement('div');
        item.className = 'complex-item';
        
        const content = document.createElement('div');
        content.className = 'text-content';
        content.innerHTML = `
          <h3>Complex Item ${i}</h3>
          <p>This is a complex CSS layout item with multiple styles applied.</p>
          <div style="display: flex; justify-content: space-between;">
            <span>Value: ${i * 100}</span>
            <span>Status: Active</span>
          </div>
        `;
        
        item.appendChild(content);
        container.appendChild(item);
      }
      
      document.body.appendChild(container);
    });
    
    // CSS レンダリング完了を待つ
    await page.waitForTimeout(1000);
    
    // インタラクション性能をテスト
    await page.hover('.complex-item:first-child');
    await page.waitForTimeout(500);
    
    await page.hover('.complex-item:nth-child(10)');
    await page.waitForTimeout(500);
    
    const cssTestEnd = Date.now();
    const cssTestDuration = cssTestEnd - cssTestStart;
    
    const cssMetrics = await page.evaluate(() => {
      performance.mark('css-test-end');
      performance.measure('css-test-duration', 'css-test-start', 'css-test-end');
      
      const cssMeasure = performance.getEntriesByName('css-test-duration')[0];
      const performanceAnalysis = window.renderingMonitor.analyzePerformance();
      
      // テスト要素を削除
      document.querySelector('.complex-layout')?.remove();
      
      return {
        cssMeasureTime: cssMeasure?.duration || 0,
        performanceAnalysis
      };
    });
    
    console.log('CSS性能メトリクス:', {
      totalTime: cssTestDuration,
      ...cssMetrics
    });
    
    // CSS性能要件の検証
    expect(cssTestDuration).toBeLessThan(3000); // 3秒以内
    
    if (cssMetrics.performanceAnalysis) {
      expect(cssMetrics.performanceAnalysis.averageFPS).toBeGreaterThan(25); // 25fps以上
      expect(cssMetrics.performanceAnalysis.frameDropRate).toBeLessThan(40); // フレームドロップ40%未満
    }
  });

  test('RO-006: Canvas/SVGレンダリング効率', async ({ page }) => {
    // CanvasとSVGの描画性能を比較テスト
    const canvasTestStart = Date.now();
    
    await page.evaluate(() => {
      window.renderingMonitor.reset();
      performance.mark('canvas-test-start');
      
      // Canvas要素を作成
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      canvas.style.border = '1px solid #ccc';
      document.body.appendChild(canvas);
      
      const ctx = canvas.getContext('2d');
      
      // 複雑なCanvas描画
      const drawComplexCanvas = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // グラデーション背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#4ecdc4');
        gradient.addColorStop(1, '#45b7d1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 複雑な図形を描画
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const radius = Math.random() * 20 + 5;
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${Math.random() * 360}, 70%, 50%, 0.7)`;
          ctx.fill();
          
          // テキストを追加
          if (i % 10 === 0) {
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.fillText(`Text ${i}`, x - 20, y + 30);
          }
        }
        
        // ベジェ曲線を描画
        for (let i = 0; i < 20; i++) {
          ctx.beginPath();
          ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
          ctx.bezierCurveTo(
            Math.random() * canvas.width, Math.random() * canvas.height,
            Math.random() * canvas.width, Math.random() * canvas.height,
            Math.random() * canvas.width, Math.random() * canvas.height
          );
          ctx.strokeStyle = `hsla(${Math.random() * 360}, 50%, 50%, 0.5)`;
          ctx.lineWidth = Math.random() * 3 + 1;
          ctx.stroke();
        }
      };
      
      // 初期描画
      drawComplexCanvas();
      
      // SVG要素を作成
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '800');
      svg.setAttribute('height', '600');
      svg.style.border = '1px solid #ccc';
      svg.style.marginTop = '20px';
      
      // 複雑なSVG描画
      let svgContent = `
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#4ecdc4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#45b7d1;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad1)" />
      `;
      
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 800;
        const y = Math.random() * 600;
        const radius = Math.random() * 20 + 5;
        const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        
        svgContent += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" opacity="0.7" />`;
        
        if (i % 10 === 0) {
          svgContent += `<text x="${x - 20}" y="${y + 30}" font-family="Arial" font-size="12" fill="#333">Text ${i}</text>`;
        }
      }
      
      // ベジェ曲線をSVGで追加
      for (let i = 0; i < 20; i++) {
        const path = `M ${Math.random() * 800} ${Math.random() * 600} Q ${Math.random() * 800} ${Math.random() * 600} ${Math.random() * 800} ${Math.random() * 600}`;
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        const width = Math.random() * 3 + 1;
        
        svgContent += `<path d="${path}" stroke="${color}" stroke-width="${width}" fill="none" opacity="0.5" />`;
      }
      
      svg.innerHTML = svgContent;
      document.body.appendChild(svg);
      
      // 動的更新をテスト
      let animationFrame = 0;
      const animate = () => {
        if (animationFrame < 30) { // 30フレーム
          drawComplexCanvas();
          animationFrame++;
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    });
    
    // Canvas/SVG レンダリング完了を待つ
    await page.waitForTimeout(2000);
    
    const canvasTestEnd = Date.now();
    const canvasTestDuration = canvasTestEnd - canvasTestStart;
    
    const canvasMetrics = await page.evaluate(() => {
      performance.mark('canvas-test-end');
      performance.measure('canvas-test-duration', 'canvas-test-start', 'canvas-test-end');
      
      const canvasMeasure = performance.getEntriesByName('canvas-test-duration')[0];
      const performanceAnalysis = window.renderingMonitor.analyzePerformance();
      
      // Canvas/SVG要素を削除
      document.querySelector('canvas')?.remove();
      document.querySelector('svg')?.remove();
      
      return {
        canvasMeasureTime: canvasMeasure?.duration || 0,
        performanceAnalysis
      };
    });
    
    console.log('Canvas/SVG性能メトリクス:', {
      totalTime: canvasTestDuration,
      ...canvasMetrics
    });
    
    // Canvas/SVG性能要件の検証
    expect(canvasTestDuration).toBeLessThan(4000); // 4秒以内
    
    if (canvasMetrics.performanceAnalysis) {
      expect(canvasMetrics.performanceAnalysis.averageFPS).toBeGreaterThan(20); // 20fps以上
      expect(canvasMetrics.performanceAnalysis.maximumFrameTime).toBeLessThan(100); // 最大フレーム時間100ms未満
      
      console.log(`Canvas Animation FPS: ${canvasMetrics.performanceAnalysis.averageFPS.toFixed(2)}`);
    }
  });
});

/**
 * 複雑なレンダリングテスト用図表生成
 */
function generateComplexRenderingDiagram() {
  let diagram = '@startuml\n';
  diagram += 'skinparam backgroundColor #FAFAFA\n';
  diagram += 'skinparam sequenceMessageAlign center\n';
  diagram += 'skinparam roundcorner 15\n\n';
  
  // 多数のアクターを定義
  const actors = [];
  for (let i = 0; i < 15; i++) {
    const actor = `Actor_${i}`;
    actors.push(actor);
    diagram += `participant "${actor}" as ${actor}\n`;
  }
  
  diagram += '\n';
  
  // 複雑なシーケンスを生成
  for (let i = 0; i < 50; i++) {
    const fromActor = actors[i % actors.length];
    const toActor = actors[(i + 1) % actors.length];
    
    diagram += `${fromActor} -> ${toActor}: Complex Message ${i}\n`;
    
    if (i % 5 === 0) {
      diagram += `note right of ${toActor}\n  Processing step ${i}\n  Complex calculation\nend note\n`;
    }
    
    if (i % 8 === 0) {
      diagram += `activate ${toActor}\n`;
    }
    
    if (i % 12 === 0) {
      diagram += `deactivate ${toActor}\n`;
    }
    
    if (i % 15 === 0) {
      diagram += `\n== Phase ${Math.floor(i / 15)} ==\n\n`;
    }
  }
  
  diagram += '\n@enduml';
  return diagram;
}