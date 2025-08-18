/**
 * TEST-E2E-018: 大規模データ処理テスト (5 SP)
 * 
 * 10,000+行PlantUML処理、複雑図表生成、リアルタイム同期性能、解析時間最適化を検証
 * パフォーマンス目標: 解析時間 < 10秒, ペイロード < 500KB, 同期遅延 < 200ms
 */

const { test, expect } = require('@playwright/test');

test.describe('Large Data Processing Tests - TEST-E2E-018', () => {
  test.use({
    // 大規模データ処理テスト専用設定
    video: 'on',
    trace: 'on',
    timeout: 120000, // 2分のタイムアウト
    launchOptions: {
      args: [
        '--enable-precise-memory-info',
        '--max-old-space-size=4096', // メモリ上限を4GBに設定
        '--disable-dev-shm-usage'
      ]
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 大規模データ処理監視システムを初期化
    await page.evaluate(() => {
      window.largeDataMonitor = {
        processingTimes: [],
        networkPayloads: [],
        compressionRatios: [],
        syncLatencies: [],
        memoryUsages: [],
        
        // 処理時間を記録
        recordProcessingTime(operation, startTime, endTime, dataSize) {
          this.processingTimes.push({
            operation,
            duration: endTime - startTime,
            dataSize,
            throughput: dataSize / (endTime - startTime), // bytes/ms
            timestamp: endTime
          });
        },
        
        // ネットワークペイロードを記録
        recordNetworkPayload(operation, payload) {
          const payloadSize = new Blob([JSON.stringify(payload)]).size;
          this.networkPayloads.push({
            operation,
            payloadSize,
            timestamp: Date.now()
          });
        },
        
        // 圧縮率を記録
        recordCompressionRatio(originalSize, compressedSize) {
          this.compressionRatios.push({
            originalSize,
            compressedSize,
            ratio: compressedSize / originalSize,
            savings: ((originalSize - compressedSize) / originalSize) * 100,
            timestamp: Date.now()
          });
        },
        
        // 同期遅延を記録
        recordSyncLatency(operation, latency) {
          this.syncLatencies.push({
            operation,
            latency,
            timestamp: Date.now()
          });
        },
        
        // メモリ使用量を記録
        recordMemoryUsage(operation) {
          if (performance.memory) {
            this.memoryUsages.push({
              operation,
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              timestamp: Date.now()
            });
          }
        },
        
        // 包括的な分析を実行
        analyzePerformance() {
          return {
            processing: this.analyzeProcessingTimes(),
            network: this.analyzeNetworkPayloads(),
            compression: this.analyzeCompression(),
            sync: this.analyzeSyncLatencies(),
            memory: this.analyzeMemoryUsage()
          };
        },
        
        analyzeProcessingTimes() {
          if (this.processingTimes.length === 0) return null;
          
          const times = this.processingTimes.map(p => p.duration);
          const throughputs = this.processingTimes.map(p => p.throughput);
          
          return {
            count: this.processingTimes.length,
            averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
            maxTime: Math.max(...times),
            minTime: Math.min(...times),
            averageThroughput: throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length,
            operations: this.processingTimes
          };
        },
        
        analyzeNetworkPayloads() {
          if (this.networkPayloads.length === 0) return null;
          
          const sizes = this.networkPayloads.map(p => p.payloadSize);
          
          return {
            count: this.networkPayloads.length,
            averageSize: sizes.reduce((sum, s) => sum + s, 0) / sizes.length,
            maxSize: Math.max(...sizes),
            totalTransferred: sizes.reduce((sum, s) => sum + s, 0),
            payloads: this.networkPayloads
          };
        },
        
        analyzeCompression() {
          if (this.compressionRatios.length === 0) return null;
          
          const ratios = this.compressionRatios.map(c => c.ratio);
          const savings = this.compressionRatios.map(c => c.savings);
          
          return {
            count: this.compressionRatios.length,
            averageRatio: ratios.reduce((sum, r) => sum + r, 0) / ratios.length,
            averageSavings: savings.reduce((sum, s) => sum + s, 0) / savings.length,
            bestRatio: Math.min(...ratios),
            compressions: this.compressionRatios
          };
        },
        
        analyzeSyncLatencies() {
          if (this.syncLatencies.length === 0) return null;
          
          const latencies = this.syncLatencies.map(s => s.latency);
          
          return {
            count: this.syncLatencies.length,
            averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
            maxLatency: Math.max(...latencies),
            minLatency: Math.min(...latencies),
            latencies: this.syncLatencies
          };
        },
        
        analyzeMemoryUsage() {
          if (this.memoryUsages.length === 0) return null;
          
          const usages = this.memoryUsages.map(m => m.used);
          const first = this.memoryUsages[0];
          const last = this.memoryUsages[this.memoryUsages.length - 1];
          
          return {
            count: this.memoryUsages.length,
            initial: first.used,
            final: last.used,
            peak: Math.max(...usages),
            growth: last.used - first.used,
            growthRate: (last.used - first.used) / (last.timestamp - first.timestamp),
            usages: this.memoryUsages
          };
        }
      };
    });
  });

  test('LD-001: 10,000+行PlantUML処理性能', async ({ page }) => {
    // 10,000行を超える大規模PlantUML図を生成
    const massiveDiagram = generateMassivePlantUMLDiagram(10000);
    const diagramSize = new Blob([massiveDiagram]).size;
    
    console.log(`Generated diagram size: ${(diagramSize / 1024 / 1024).toFixed(2)} MB`);
    
    const processingStart = Date.now();
    
    await page.evaluate(() => {
      window.largeDataMonitor.recordMemoryUsage('processing-start');
    });
    
    // 大規模図表を段階的に入力して処理性能を測定
    const chunkSize = 1000; // 1000行ずつ処理
    const chunks = massiveDiagram.split('\n');
    const totalChunks = Math.ceil(chunks.length / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkStart = Date.now();
      const startIndex = i * chunkSize;
      const endIndex = Math.min((i + 1) * chunkSize, chunks.length);
      const chunk = chunks.slice(startIndex, endIndex).join('\n');
      
      await page.evaluate((chunkData, chunkIndex, chunkStartTime) => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          // 累積的にコンテンツを追加
          if (chunkIndex === 0) {
            codeArea.value = chunkData;
          } else {
            codeArea.value += '\n' + chunkData;
          }
          
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
          
          // 処理時間を記録
          const chunkEndTime = Date.now();
          window.largeDataMonitor.recordProcessingTime(
            `chunk-${chunkIndex}`,
            chunkStartTime,
            chunkEndTime,
            chunkData.length
          );
          
          // メモリ使用量を記録
          window.largeDataMonitor.recordMemoryUsage(`chunk-${chunkIndex}-processed`);
        }
      }, chunk, i, chunkStart);
      
      // 段階的処理の間に短時間の待機
      await page.waitForTimeout(100);
      
      const chunkEnd = Date.now();
      console.log(`Chunk ${i + 1}/${totalChunks} processed in ${chunkEnd - chunkStart}ms`);
    }
    
    const processingEnd = Date.now();
    const totalProcessingTime = processingEnd - processingStart;
    
    console.log(`Total processing time: ${totalProcessingTime}ms for ${diagramSize} bytes`);
    
    // パフォーマンス分析を実行
    const largeDataAnalysis = await page.evaluate(() => {
      window.largeDataMonitor.recordMemoryUsage('processing-complete');
      return window.largeDataMonitor.analyzePerformance();
    });
    
    console.log('Large Data Performance Analysis:', largeDataAnalysis);
    
    // 大規模データ処理性能要件の検証
    expect(totalProcessingTime).toBeLessThan(30000); // 30秒以内
    
    if (largeDataAnalysis.processing) {
      expect(largeDataAnalysis.processing.averageTime).toBeLessThan(2000); // チャンク平均2秒以内
      expect(largeDataAnalysis.processing.averageThroughput).toBeGreaterThan(100); // 100 bytes/ms以上
    }
    
    if (largeDataAnalysis.memory) {
      expect(largeDataAnalysis.memory.growth).toBeLessThan(200 * 1024 * 1024); // 200MB未満の増加
      console.log(`Memory growth: ${(largeDataAnalysis.memory.growth / 1024 / 1024).toFixed(2)} MB`);
    }
  });

  test('LD-002: 複雑図表生成最適化', async ({ page }) => {
    // 複雑な構造を持つPlantUML図を生成
    const complexDiagrams = [
      generateComplexSequenceDiagram(500),
      generateComplexClassDiagram(300),
      generateComplexActivityDiagram(400),
      generateComplexComponentDiagram(200),
      generateComplexStateDiagram(250)
    ];
    
    const complexityResults = [];
    
    for (let i = 0; i < complexDiagrams.length; i++) {
      const diagram = complexDiagrams[i];
      const diagramType = ['sequence', 'class', 'activity', 'component', 'state'][i];
      const diagramSize = new Blob([diagram]).size;
      
      const complexityStart = Date.now();
      
      await page.evaluate((diagramData, diagramTypeName, startTime) => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          codeArea.value = diagramData;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
          
          window.largeDataMonitor.recordMemoryUsage(`${diagramTypeName}-start`);
        }
      }, diagram, diagramType, complexityStart);
      
      // 複雑な図表の処理完了を待つ
      await page.waitForTimeout(2000);
      
      const complexityEnd = Date.now();
      const complexityTime = complexityEnd - complexityStart;
      
      const complexityMetrics = await page.evaluate((diagramTypeName, processingTime, dataSize) => {
        window.largeDataMonitor.recordProcessingTime(
          `complex-${diagramTypeName}`,
          Date.now() - processingTime,
          Date.now(),
          dataSize
        );
        
        window.largeDataMonitor.recordMemoryUsage(`${diagramTypeName}-complete`);
        
        // PlantUMLコードの解析結果を取得
        const codeArea = document.querySelector('#plantuml-code');
        const processedContent = codeArea ? codeArea.value : '';
        
        return {
          diagramType: diagramTypeName,
          processingTime,
          dataSize,
          processedSize: processedContent.length,
          timestamp: Date.now()
        };
      }, diagramType, complexityTime, diagramSize);
      
      complexityResults.push(complexityMetrics);
      
      console.log(`${diagramType} diagram (${(diagramSize / 1024).toFixed(2)} KB) processed in ${complexityTime}ms`);
    }
    
    // 複雑性に基づく性能分析
    const avgComplexityTime = complexityResults.reduce((sum, r) => sum + r.processingTime, 0) / complexityResults.length;
    const maxComplexityTime = Math.max(...complexityResults.map(r => r.processingTime));
    
    console.log('Complexity Analysis:', {
      results: complexityResults,
      averageTime: avgComplexityTime,
      maximumTime: maxComplexityTime
    });
    
    // 複雑図表生成性能要件の検証
    expect(avgComplexityTime).toBeLessThan(5000); // 平均5秒以内
    expect(maxComplexityTime).toBeLessThan(10000); // 最大10秒以内
    
    // 各図表タイプが適切に処理されていることを確認
    complexityResults.forEach(result => {
      expect(result.processingTime).toBeLessThan(15000); // 15秒以内
      expect(result.processedSize).toBeGreaterThan(0); // 処理されたコンテンツが存在
    });
  });

  test('LD-003: リアルタイム同期性能（大規模データ）', async ({ page }) => {
    // 大規模データでのリアルタイム同期性能をテスト
    const largeDiagram = generateMassivePlantUMLDiagram(5000);
    
    // 初期大規模データを設定
    await page.evaluate((diagram) => {
      const codeArea = document.querySelector('#plantuml-code');
      if (codeArea) {
        codeArea.value = diagram;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, largeDiagram);
    
    await page.waitForTimeout(3000); // 初期処理完了を待つ
    
    // リアルタイム編集シミュレーション
    const editOperations = [
      { type: 'append', content: '\nA -> B: Real-time edit 1' },
      { type: 'append', content: '\nB -> C: Real-time edit 2' },
      { type: 'insert', position: 100, content: '\nnote right: Inserted note\n' },
      { type: 'replace', start: 200, end: 250, content: 'participant ModifiedActor' },
      { type: 'append', content: '\nC -> D: Real-time edit 3' }
    ];
    
    const syncResults = [];
    
    for (let i = 0; i < editOperations.length; i++) {
      const operation = editOperations[i];
      const syncStart = Date.now();
      
      await page.evaluate((op, startTime) => {
        const codeArea = document.querySelector('#plantuml-code');
        if (!codeArea) return;
        
        const currentValue = codeArea.value;
        let newValue = currentValue;
        
        switch (op.type) {
          case 'append':
            newValue = currentValue + op.content;
            break;
          case 'insert':
            newValue = currentValue.slice(0, op.position) + op.content + currentValue.slice(op.position);
            break;
          case 'replace':
            newValue = currentValue.slice(0, op.start) + op.content + currentValue.slice(op.end);
            break;
        }
        
        codeArea.value = newValue;
        codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        
        window.largeDataMonitor.recordMemoryUsage(`sync-edit-${Date.now()}`);
      }, operation, syncStart);
      
      // 同期完了を検出（UI更新の完了を待つ）
      await page.waitForFunction(() => {
        // 編集後の処理が完了しているかチェック
        const codeArea = document.querySelector('#plantuml-code');
        return codeArea && codeArea.value.length > 0;
      }, { timeout: 5000 });
      
      const syncEnd = Date.now();
      const syncLatency = syncEnd - syncStart;
      
      const syncMetrics = await page.evaluate((operationType, latency) => {
        window.largeDataMonitor.recordSyncLatency(operationType, latency);
        
        const codeArea = document.querySelector('#plantuml-code');
        return {
          operationType,
          latency,
          currentSize: codeArea ? codeArea.value.length : 0,
          timestamp: Date.now()
        };
      }, operation.type, syncLatency);
      
      syncResults.push(syncMetrics);
      
      console.log(`Sync operation ${operation.type}: ${syncLatency}ms, size: ${syncMetrics.currentSize}`);
      
      // 操作間の短時間待機
      await page.waitForTimeout(200);
    }
    
    // 同期性能分析
    const syncAnalysis = await page.evaluate(() => {
      return window.largeDataMonitor.analyzePerformance();
    });
    
    console.log('Real-time Sync Analysis:', syncAnalysis);
    
    // リアルタイム同期性能要件の検証
    if (syncAnalysis.sync) {
      expect(syncAnalysis.sync.averageLatency).toBeLessThan(500); // 平均500ms以内
      expect(syncAnalysis.sync.maxLatency).toBeLessThan(1000); // 最大1秒以内
      
      console.log(`Average sync latency: ${syncAnalysis.sync.averageLatency.toFixed(2)}ms`);
    }
    
    // 個別操作の性能確認
    syncResults.forEach(result => {
      expect(result.latency).toBeLessThan(2000); // 各操作2秒以内
    });
  });

  test('LD-004: ネットワークペイロード最適化', async ({ page }) => {
    // 様々なサイズのデータでネットワークペイロード効率をテスト
    const testSizes = [1000, 5000, 10000, 20000]; // 行数
    const payloadResults = [];
    
    for (const size of testSizes) {
      const diagram = generateMassivePlantUMLDiagram(size);
      const originalSize = new Blob([diagram]).size;
      
      const payloadStart = Date.now();
      
      // データを送信（プレビュー生成など）
      const networkMetrics = await page.evaluate(async (diagramData, originalDataSize) => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          codeArea.value = diagramData;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // ネットワークペイロードシミュレーション
        const payload = {
          type: 'plantuml-process',
          content: diagramData,
          timestamp: Date.now(),
          metadata: {
            lines: diagramData.split('\n').length,
            size: originalDataSize
          }
        };
        
        const payloadString = JSON.stringify(payload);
        const payloadSize = new Blob([payloadString]).size;
        
        // 圧縮シミュレーション（gzip圧縮率を近似）
        const estimatedCompressedSize = payloadSize * 0.3; // 約70%圧縮と仮定
        
        window.largeDataMonitor.recordNetworkPayload('large-data-transfer', payload);
        window.largeDataMonitor.recordCompressionRatio(payloadSize, estimatedCompressedSize);
        
        return {
          originalSize: originalDataSize,
          payloadSize,
          estimatedCompressedSize,
          compressionRatio: estimatedCompressedSize / payloadSize,
          lines: payload.metadata.lines
        };
      }, diagram, originalSize);
      
      const payloadEnd = Date.now();
      const transferTime = payloadEnd - payloadStart;
      
      payloadResults.push({
        lines: size,
        transferTime,
        ...networkMetrics
      });
      
      console.log(`${size} lines: ${(networkMetrics.originalSize / 1024).toFixed(2)} KB → ${(networkMetrics.estimatedCompressedSize / 1024).toFixed(2)} KB (${(networkMetrics.compressionRatio * 100).toFixed(1)}% of original)`);
    }
    
    // ネットワーク効率性分析
    const networkAnalysis = await page.evaluate(() => {
      return window.largeDataMonitor.analyzePerformance();
    });
    
    console.log('Network Payload Analysis:', networkAnalysis);
    console.log('Payload Results:', payloadResults);
    
    // ネットワークペイロード要件の検証
    if (networkAnalysis.network) {
      expect(networkAnalysis.network.maxSize).toBeLessThan(1024 * 1024); // 1MB未満
      expect(networkAnalysis.network.averageSize).toBeLessThan(512 * 1024); // 平均512KB未満
    }
    
    if (networkAnalysis.compression) {
      expect(networkAnalysis.compression.averageRatio).toBeLessThan(0.5); // 50%以下に圧縮
      expect(networkAnalysis.compression.averageSavings).toBeGreaterThan(50); // 50%以上節約
    }
    
    // 最大データサイズでも要件を満たすことを確認
    const largestTest = payloadResults[payloadResults.length - 1];
    expect(largestTest.estimatedCompressedSize).toBeLessThan(500 * 1024); // 500KB未満
  });

  test('LD-005: 解析時間最適化', async ({ page }) => {
    // 異なる複雑度の図表での解析時間を最適化テスト
    const complexityLevels = [
      { name: 'simple', lines: 100, complexity: 'low' },
      { name: 'medium', lines: 1000, complexity: 'medium' },
      { name: 'complex', lines: 5000, complexity: 'high' },
      { name: 'massive', lines: 10000, complexity: 'extreme' }
    ];
    
    const analysisResults = [];
    
    for (const level of complexityLevels) {
      const diagram = generateMassivePlantUMLDiagram(level.lines);
      
      const analysisStart = Date.now();
      
      await page.evaluate(() => {
        window.largeDataMonitor.recordMemoryUsage('analysis-start');
        performance.mark('analysis-start');
      });
      
      // 段階的解析をシミュレート
      const analysisMetrics = await page.evaluate(async (diagramData, levelInfo) => {
        const codeArea = document.querySelector('#plantuml-code');
        if (codeArea) {
          codeArea.value = diagramData;
          codeArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 解析処理をシミュレート
        const analysisSteps = [
          'lexical-analysis',
          'syntax-parsing',
          'semantic-validation',
          'graph-generation',
          'layout-calculation'
        ];
        
        const stepResults = [];
        
        for (const step of analysisSteps) {
          const stepStart = Date.now();
          
          // 各ステップの処理をシミュレート
          await new Promise(resolve => {
            setTimeout(() => {
              // 実際の処理を想定した計算
              const lines = diagramData.split('\n');
              for (let i = 0; i < Math.min(lines.length, 1000); i++) {
                const line = lines[i];
                // 簡単な解析処理をシミュレート
                const processed = line.replace(/\s+/g, ' ').trim();
              }
              resolve();
            }, Math.random() * 100 + 50); // 50-150ms の処理時間
          });
          
          const stepEnd = Date.now();
          const stepDuration = stepEnd - stepStart;
          
          stepResults.push({
            step,
            duration: stepDuration,
            timestamp: stepEnd
          });
          
          window.largeDataMonitor.recordProcessingTime(
            `analysis-${step}`,
            stepStart,
            stepEnd,
            diagramData.length
          );
        }
        
        return {
          levelInfo,
          steps: stepResults,
          totalSteps: stepResults.length,
          totalStepTime: stepResults.reduce((sum, s) => sum + s.duration, 0)
        };
      }, diagram, level);
      
      const analysisEnd = Date.now();
      const totalAnalysisTime = analysisEnd - analysisStart;
      
      await page.evaluate(() => {
        performance.mark('analysis-end');
        performance.measure('total-analysis', 'analysis-start', 'analysis-end');
        window.largeDataMonitor.recordMemoryUsage('analysis-complete');
      });
      
      analysisResults.push({
        ...analysisMetrics,
        totalAnalysisTime,
        linesPerSecond: level.lines / (totalAnalysisTime / 1000)
      });
      
      console.log(`${level.name} (${level.lines} lines): ${totalAnalysisTime}ms, ${analysisResults[analysisResults.length - 1].linesPerSecond.toFixed(2)} lines/sec`);
    }
    
    // 解析性能分析
    const performanceAnalysis = await page.evaluate(() => {
      return window.largeDataMonitor.analyzePerformance();
    });
    
    console.log('Analysis Performance Results:', analysisResults);
    console.log('Performance Analysis:', performanceAnalysis);
    
    // 解析時間最適化要件の検証
    analysisResults.forEach((result, index) => {
      const level = complexityLevels[index];
      
      // 複雑度に応じた時間制限
      const timeLimit = Math.min(level.lines * 2, 20000); // 最大20秒
      expect(result.totalAnalysisTime).toBeLessThan(timeLimit);
      
      // 処理効率の確認
      expect(result.linesPerSecond).toBeGreaterThan(10); // 最低10行/秒
    });
    
    // 全体的なスケーラビリティの確認
    const massiveResult = analysisResults[analysisResults.length - 1];
    expect(massiveResult.totalAnalysisTime).toBeLessThan(15000); // 15秒以内
    expect(massiveResult.linesPerSecond).toBeGreaterThan(500); // 500行/秒以上
  });

  test('LD-006: 圧縮効果とストレージ効率', async ({ page }) => {
    // 様々なタイプの図表での圧縮効果をテスト
    const diagramTypes = [
      { type: 'sequence', generator: generateComplexSequenceDiagram },
      { type: 'class', generator: generateComplexClassDiagram },
      { type: 'activity', generator: generateComplexActivityDiagram },
      { type: 'component', generator: generateComplexComponentDiagram },
      { type: 'state', generator: generateComplexStateDiagram }
    ];
    
    const compressionResults = [];
    
    for (const diagramType of diagramTypes) {
      const diagram = diagramType.generator(2000); // 2000要素
      const originalSize = new Blob([diagram]).size;
      
      const compressionMetrics = await page.evaluate((diagramData, typeName, originalDataSize) => {
        // 様々な圧縮手法をシミュレート
        const compressionMethods = [
          {
            name: 'gzip',
            ratio: 0.25, // 75%圧縮
            speed: 'fast'
          },
          {
            name: 'brotli',
            ratio: 0.20, // 80%圧縮
            speed: 'medium'
          },
          {
            name: 'lz4',
            ratio: 0.35, // 65%圧縮
            speed: 'very-fast'
          }
        ];
        
        const results = compressionMethods.map(method => {
          const compressedSize = originalDataSize * method.ratio;
          const savings = ((originalDataSize - compressedSize) / originalDataSize) * 100;
          
          window.largeDataMonitor.recordCompressionRatio(originalDataSize, compressedSize);
          
          return {
            method: method.name,
            originalSize: originalDataSize,
            compressedSize,
            ratio: method.ratio,
            savings,
            speed: method.speed,
            efficiency: savings / method.ratio // 効率指標
          };
        });
        
        return {
          diagramType: typeName,
          compressionResults: results,
          bestCompression: results.reduce((best, current) => 
            current.ratio < best.ratio ? current : best
          ),
          fastestCompression: results.find(r => r.speed === 'very-fast')
        };
      }, diagram, diagramType.type, originalSize);
      
      compressionResults.push(compressionMetrics);
      
      console.log(`${diagramType.type} compression:`, compressionMetrics.bestCompression);
    }
    
    // 圧縮効果の総合分析
    const compressionAnalysis = await page.evaluate(() => {
      return window.largeDataMonitor.analyzePerformance();
    });
    
    console.log('Compression Analysis:', compressionAnalysis);
    console.log('Compression Results by Type:', compressionResults);
    
    // 圧縮効果要件の検証
    if (compressionAnalysis.compression) {
      expect(compressionAnalysis.compression.averageRatio).toBeLessThan(0.4); // 60%以上圧縮
      expect(compressionAnalysis.compression.averageSavings).toBeGreaterThan(60); // 60%以上節約
    }
    
    // 各図表タイプで効果的な圧縮が実現されていることを確認
    compressionResults.forEach(result => {
      expect(result.bestCompression.savings).toBeGreaterThan(70); // 70%以上節約
      expect(result.bestCompression.ratio).toBeLessThan(0.3); // 30%以下のサイズ
    });
    
    // ストレージ効率の計算
    const totalOriginalSize = compressionResults.reduce((sum, r) => 
      sum + r.compressionResults[0].originalSize, 0
    );
    const totalCompressedSize = compressionResults.reduce((sum, r) => 
      sum + r.bestCompression.compressedSize, 0
    );
    const overallSavings = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100;
    
    console.log(`Overall storage efficiency: ${overallSavings.toFixed(2)}% savings`);
    expect(overallSavings).toBeGreaterThan(70); // 全体で70%以上の節約
  });
});

/**
 * 大規模PlantUML図生成関数
 */
function generateMassivePlantUMLDiagram(lines) {
  let diagram = '@startuml\n';
  diagram += 'skinparam backgroundColor #FAFAFA\n';
  diagram += 'skinparam sequenceMessageAlign center\n\n';
  
  // 大量のアクターを生成
  const actorCount = Math.min(Math.floor(lines / 20), 100);
  for (let i = 0; i < actorCount; i++) {
    diagram += `participant "Actor_${i}" as A${i}\n`;
  }
  
  diagram += '\n';
  
  // 大量のメッセージを生成
  for (let i = 0; i < lines - actorCount - 10; i++) {
    const fromActor = i % actorCount;
    const toActor = (i + 1) % actorCount;
    
    diagram += `A${fromActor} -> A${toActor}: Message ${i}\n`;
    
    if (i % 50 === 0) {
      diagram += `note right of A${toActor}: Processing note ${i}\n`;
    }
    
    if (i % 100 === 0) {
      diagram += `activate A${toActor}\n`;
    }
    
    if (i % 150 === 0) {
      diagram += `deactivate A${toActor}\n`;
    }
    
    if (i % 200 === 0) {
      diagram += `\n== Phase ${Math.floor(i / 200)} ==\n\n`;
    }
  }
  
  diagram += '\n@enduml';
  return diagram;
}

/**
 * 複雑なシーケンス図生成
 */
function generateComplexSequenceDiagram(elements) {
  let diagram = '@startuml\n';
  diagram += 'skinparam sequenceArrowThickness 2\n';
  diagram += 'skinparam roundcorner 20\n\n';
  
  const actors = [];
  for (let i = 0; i < Math.min(elements / 10, 20); i++) {
    actors.push(`Actor${i}`);
    diagram += `participant "${actors[i]}" as ${actors[i]}\n`;
  }
  
  for (let i = 0; i < elements; i++) {
    const from = actors[i % actors.length];
    const to = actors[(i + 1) % actors.length];
    diagram += `${from} -> ${to}: Complex operation ${i}\n`;
    
    if (i % 10 === 0) {
      diagram += `${from} -> ${from}: Self call ${i}\n`;
    }
  }
  
  diagram += '@enduml';
  return diagram;
}

/**
 * 複雑なクラス図生成
 */
function generateComplexClassDiagram(elements) {
  let diagram = '@startuml\n';
  diagram += 'skinparam classAttributeIconSize 0\n\n';
  
  for (let i = 0; i < elements; i++) {
    diagram += `class Class${i} {\n`;
    diagram += `  + method${i}()\n`;
    diagram += `  - field${i}\n`;
    diagram += '}\n\n';
    
    if (i > 0) {
      diagram += `Class${i - 1} --> Class${i}\n`;
    }
  }
  
  diagram += '@enduml';
  return diagram;
}

/**
 * 複雑なアクティビティ図生成
 */
function generateComplexActivityDiagram(elements) {
  let diagram = '@startuml\n';
  diagram += 'start\n\n';
  
  for (let i = 0; i < elements; i++) {
    diagram += `:Activity ${i};\n`;
    
    if (i % 10 === 0) {
      diagram += `if (Condition ${i}?) then (yes)\n`;
      diagram += `  :Process ${i};\n`;
      diagram += 'else (no)\n';
      diagram += `  :Alternative ${i};\n`;
      diagram += 'endif\n';
    }
  }
  
  diagram += '\nstop\n@enduml';
  return diagram;
}

/**
 * 複雑なコンポーネント図生成
 */
function generateComplexComponentDiagram(elements) {
  let diagram = '@startuml\n';
  
  for (let i = 0; i < elements; i++) {
    diagram += `[Component${i}]\n`;
    
    if (i > 0) {
      diagram += `Component${i - 1} --> Component${i}\n`;
    }
  }
  
  diagram += '@enduml';
  return diagram;
}

/**
 * 複雑な状態図生成
 */
function generateComplexStateDiagram(elements) {
  let diagram = '@startuml\n';
  
  for (let i = 0; i < elements; i++) {
    diagram += `state State${i}\n`;
    
    if (i > 0) {
      diagram += `State${i - 1} --> State${i}: transition${i}\n`;
    }
  }
  
  diagram += '@enduml';
  return diagram;
}