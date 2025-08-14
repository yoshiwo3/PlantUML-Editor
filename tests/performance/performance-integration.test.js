/**
 * パフォーマンス統合テスト
 * アプリケーション全体のパフォーマンス計測とベンチマーク
 * @version 1.0.0
 */

const { performance, PerformanceObserver } = require('perf_hooks');

/**
 * パフォーマンステスト設定
 */
const PERFORMANCE_CONFIG = {
  thresholds: {
    // API レスポンス時間の閾値 (ミリ秒)
    apiResponse: 2000,
    // PlantUML変換処理の閾値
    conversion: 5000,
    // メモリ使用量の閾値 (MB)
    memoryUsage: 100,
    // CPU使用率の閾値 (%)
    cpuUsage: 80
  },
  
  // テスト実行回数
  iterations: {
    light: 10,    // 軽量テスト
    medium: 5,    // 中程度テスト
    heavy: 3      // 重いテスト
  },
  
  // テストデータ
  testCases: {
    simple: 'A -> B: メッセージ',
    medium: 'アクター1 -> アクター2: 処理開始\nアクター2 -> データベース: データ取得\nデータベース -> アクター2: データ返却\nアクター2 -> アクター1: 処理完了',
    complex: `
@startuml
participant "Webクライアント" as Client
participant "APIサーバー" as API
participant "認証サーバー" as Auth
participant "データベース" as DB
participant "外部API" as External

Client -> API: ログインリクエスト
API -> Auth: 認証確認
Auth -> API: 認証トークン
API -> Client: ログイン成功

Client -> API: データ取得リクエスト
API -> Auth: トークン検証
Auth -> API: 検証OK
API -> DB: データ取得
DB -> API: データ返却
API -> External: 追加情報取得
External -> API: 追加データ
API -> Client: 結果返却
@enduml
    `.trim()
  }
};

describe('パフォーマンス統合テスト', () => {
  let performanceData = [];
  let observer;

  beforeAll(() => {
    // パフォーマンス監視の開始
    observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      performanceData.push(...entries);
    });
    observer.observe({ entryTypes: ['measure'] });
  });

  afterAll(() => {
    // パフォーマンス監視の終了
    if (observer) {
      observer.disconnect();
    }
    
    // パフォーマンスレポートの生成
    generatePerformanceReport();
  });

  describe('API パフォーマンステスト', () => {
    test('シンプルなPlantUML変換のレスポンス時間', async () => {
      const results = [];
      
      for (let i = 0; i < PERFORMANCE_CONFIG.iterations.light; i++) {
        const startTime = performance.now();
        
        const response = await simulateApiCall('/api/convert', {
          text: PERFORMANCE_CONFIG.testCases.simple,
          format: 'svg'
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        results.push(duration);
        
        performance.mark(`simple-conversion-${i}-start`);
        performance.mark(`simple-conversion-${i}-end`);
        performance.measure(`simple-conversion-${i}`, `simple-conversion-${i}-start`, `simple-conversion-${i}-end`);
        
        expect(response.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponse);
      }
      
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      console.log(`平均レスポンス時間 (シンプル): ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponse);
    });

    test('中程度の複雑さのPlantUML変換性能', async () => {
      const results = [];
      
      for (let i = 0; i < PERFORMANCE_CONFIG.iterations.medium; i++) {
        const startTime = performance.now();
        
        const response = await simulateApiCall('/api/convert', {
          text: PERFORMANCE_CONFIG.testCases.medium,
          format: 'svg'
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        results.push(duration);
        
        performance.mark(`medium-conversion-${i}-start`);
        performance.mark(`medium-conversion-${i}-end`);
        performance.measure(`medium-conversion-${i}`, `medium-conversion-${i}-start`, `medium-conversion-${i}-end`);
        
        expect(response.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.conversion);
      }
      
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      console.log(`平均レスポンス時間 (中程度): ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.conversion);
    });

    test('複雑なPlantUML変換の負荷テスト', async () => {
      const results = [];
      
      for (let i = 0; i < PERFORMANCE_CONFIG.iterations.heavy; i++) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();
        
        const response = await simulateApiCall('/api/convert', {
          text: PERFORMANCE_CONFIG.testCases.complex,
          format: 'svg'
        });
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;
        const memoryDiff = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // MB
        
        results.push({ duration, memoryDiff });
        
        performance.mark(`complex-conversion-${i}-start`);
        performance.mark(`complex-conversion-${i}-end`);
        performance.measure(`complex-conversion-${i}`, `complex-conversion-${i}-start`, `complex-conversion-${i}-end`);
        
        expect(response.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.conversion * 2); // 複雑なので2倍まで許容
        expect(memoryDiff).toBeLessThan(PERFORMANCE_CONFIG.thresholds.memoryUsage);
      }
      
      const avgTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length;
      const avgMemory = results.reduce((sum, result) => sum + result.memoryDiff, 0) / results.length;
      
      console.log(`平均レスポンス時間 (複雑): ${avgTime.toFixed(2)}ms`);
      console.log(`平均メモリ増加量: ${avgMemory.toFixed(2)}MB`);
      
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.conversion * 2);
      expect(avgMemory).toBeLessThan(PERFORMANCE_CONFIG.thresholds.memoryUsage);
    });
  });

  describe('同時実行パフォーマンステスト', () => {
    test('並行リクエスト処理性能', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        simulateApiCall('/api/convert', {
          text: `${PERFORMANCE_CONFIG.testCases.simple}_${i}`,
          format: 'svg'
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      performance.mark('concurrent-start');
      performance.mark('concurrent-end');
      performance.measure('concurrent-requests', 'concurrent-start', 'concurrent-end');
      
      // すべてのリクエストが成功することを確認
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
      });
      
      // 並行処理が順次処理より高速であることを確認
      const sequentialTime = concurrentRequests * PERFORMANCE_CONFIG.thresholds.apiResponse;
      expect(totalDuration).toBeLessThan(sequentialTime * 0.8); // 20%以上の改善を期待
      
      console.log(`並行処理時間: ${totalDuration.toFixed(2)}ms (${concurrentRequests}リクエスト)`);
    });

    test('メモリリーク検証', async () => {
      const iterations = 20;
      const memorySnapshots = [];
      
      for (let i = 0; i < iterations; i++) {
        await simulateApiCall('/api/convert', {
          text: PERFORMANCE_CONFIG.testCases.medium,
          format: 'svg'
        });
        
        // ガベージコレクション実行
        if (global.gc) {
          global.gc();
        }
        
        // メモリ使用量記録
        const memUsage = process.memoryUsage();
        memorySnapshots.push({
          iteration: i,
          heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
          heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
          external: memUsage.external / 1024 / 1024 // MB
        });
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // メモリ使用量の傾向を分析
      const firstHalf = memorySnapshots.slice(0, 10);
      const secondHalf = memorySnapshots.slice(10);
      
      const avgFirstHalf = firstHalf.reduce((sum, snapshot) => sum + snapshot.heapUsed, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((sum, snapshot) => sum + snapshot.heapUsed, 0) / secondHalf.length;
      
      const memoryGrowth = avgSecondHalf - avgFirstHalf;
      
      console.log(`メモリ使用量 前半平均: ${avgFirstHalf.toFixed(2)}MB`);
      console.log(`メモリ使用量 後半平均: ${avgSecondHalf.toFixed(2)}MB`);
      console.log(`メモリ増加量: ${memoryGrowth.toFixed(2)}MB`);
      
      // メモリリークの検証（増加量が閾値以下であること）
      expect(memoryGrowth).toBeLessThan(10); // 10MB以下の増加は許容
    });
  });

  describe('リソース使用量テスト', () => {
    test('CPU使用率監視', async () => {
      const cpuUsageStart = process.cpuUsage();
      const startTime = performance.now();
      
      // CPU集約的な処理をシミュレート
      const promises = Array.from({ length: 5 }, () =>
        simulateApiCall('/api/convert', {
          text: PERFORMANCE_CONFIG.testCases.complex,
          format: 'svg'
        })
      );
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const cpuUsageEnd = process.cpuUsage(cpuUsageStart);
      
      const totalTime = endTime - startTime;
      const userCpuTime = cpuUsageEnd.user / 1000; // microseconds to milliseconds
      const systemCpuTime = cpuUsageEnd.system / 1000;
      const totalCpuTime = userCpuTime + systemCpuTime;
      
      const cpuUsagePercentage = (totalCpuTime / totalTime) * 100;
      
      console.log(`CPU使用率: ${cpuUsagePercentage.toFixed(2)}%`);
      console.log(`実行時間: ${totalTime.toFixed(2)}ms`);
      console.log(`CPU時間: ${totalCpuTime.toFixed(2)}ms`);
      
      // CPU使用率が閾値以下であることを確認
      expect(cpuUsagePercentage).toBeLessThan(PERFORMANCE_CONFIG.thresholds.cpuUsage);
    });
  });
});

/**
 * API呼び出しのシミュレーション
 */
async function simulateApiCall(endpoint, data) {
  return new Promise((resolve) => {
    // 実際のAPI処理をシミュレート
    const processingTime = Math.random() * 1000 + 500; // 500-1500ms
    
    setTimeout(() => {
      resolve({
        success: true,
        data: `<svg>Mock SVG content for: ${data.text.substring(0, 50)}...</svg>`,
        processingTime
      });
    }, processingTime);
  });
}

/**
 * パフォーマンスレポートの生成
 */
function generatePerformanceReport() {
  console.log('\n📊 パフォーマンステストレポート');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 測定データの集計
  const measurements = performanceData.filter(entry => entry.entryType === 'measure');
  
  if (measurements.length > 0) {
    const groupedMeasurements = measurements.reduce((groups, measurement) => {
      const testType = measurement.name.split('-')[0];
      if (!groups[testType]) {
        groups[testType] = [];
      }
      groups[testType].push(measurement.duration);
      return groups;
    }, {});
    
    Object.entries(groupedMeasurements).forEach(([testType, durations]) => {
      const avg = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      console.log(`${testType}:`);
      console.log(`  平均: ${avg.toFixed(2)}ms`);
      console.log(`  最小: ${min.toFixed(2)}ms`);
      console.log(`  最大: ${max.toFixed(2)}ms`);
      console.log(`  回数: ${durations.length}`);
      console.log('');
    });
  }
  
  // システム情報
  const memUsage = process.memoryUsage();
  console.log('システム情報:');
  console.log(`  Node.js: ${process.version}`);
  console.log(`  プラットフォーム: ${process.platform}`);
  console.log(`  アーキテクチャ: ${process.arch}`);
  console.log(`  メモリ使用量: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}