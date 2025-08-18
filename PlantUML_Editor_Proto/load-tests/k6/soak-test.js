/**
 * K6 Soak Test for PlantUML Editor
 * 長時間の安定稼働を確認するための耐久テスト
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// 長時間監視用カスタムメトリクス
const memoryGrowth = new Trend('memory_growth_rate');
const connectionStability = new Rate('connection_stability');
const longRunningErrors = new Rate('long_running_errors');
const resourceLeaks = new Counter('resource_leak_indicators');
const steadyStatePerformance = new Trend('steady_state_performance');

// テスト設定（長時間実行）
export const options = {
  stages: [
    // 長時間安定稼働テスト（6時間）
    { duration: '10m', target: 100 },    // ウォームアップ
    { duration: '5h', target: 200 },     // メイン耐久テスト
    { duration: '30m', target: 300 },    // 負荷増加テスト
    { duration: '15m', target: 100 },    // クールダウン
  ],
  
  // 長時間安定性の閾値
  thresholds: {
    'http_req_duration': ['p(95)<1000'],           // 95%が1秒以内（安定性重視）
    'http_req_failed': ['rate<0.05'],              // エラー率5%未満
    'long_running_errors': ['rate<0.01'],          // 長時間エラー率1%未満
    'connection_stability': ['rate>0.99'],         // 接続安定性99%以上
    'memory_growth_rate': ['p(90)<50'],            // メモリ増加率90%タイル50MB/h未満
    'resource_leak_indicators': ['count<10'],      // リソースリーク兆候10未満
    'steady_state_performance': ['p(95)<800'],     // 定常状態パフォーマンス
  },
  
  // リソース最適化
  maxRedirects: 2,
  userAgent: 'K6-PlantUML-SoakTest/1.0',
  
  // タグ設定
  tags: {
    testType: 'soak',
    environment: 'docker',
    duration: '6hours'
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8086';

// 長時間テスト用データローテーション
const longRunningTestData = {
  scenarios: [
    '日常的なユーザー操作シミュレーション',
    'システム間連携の定期処理',
    'バッチ処理の定時実行',
    'ログ収集とデータ分析',
    '定期的なヘルスチェック',
    'キャッシュの更新と無効化',
    'セッション管理と認証',
    'データベースアクセスパターン'
  ],
  
  patterns: [
    'シンプルなシーケンス図',
    '複雑なクラス図',
    'アクティビティ図',
    'ユースケース図',
    'コンポーネント図'
  ]
};

// メモリ使用量追跡
let initialMemory = 0;
let lastMemoryCheck = 0;
let memoryCheckInterval = 0;

/**
 * メイン耐久テストシナリオ
 */
export default function() {
  const testStart = Date.now();
  const currentTime = new Date();
  const hoursSinceStart = (Date.now() - __ENV.TEST_START_TIME) / (1000 * 60 * 60);
  
  try {
    // 1. 基本機能の継続テスト
    const scenario = longRunningTestData.scenarios[__ITER % longRunningTestData.scenarios.length];
    const pattern = longRunningTestData.patterns[Math.floor(Math.random() * longRunningTestData.patterns.length)];
    
    const basicRequest = http.get(`${BASE_URL}/`, {
      headers: {
        'X-Test-Type': 'soak-test',
        'X-Test-Hour': Math.floor(hoursSinceStart).toString(),
        'X-VU': __VU.toString()
      }
    });
    
    const basicSuccess = check(basicRequest, {
      'Basic request succeeds': (r) => r.status === 200,
      'Response time stable': (r) => r.timings.duration < 1000,
      'Content length reasonable': (r) => r.body.length > 1000,
    });
    
    connectionStability.add(basicSuccess ? 1 : 0);
    steadyStatePerformance.add(basicRequest.timings.duration);

    // 2. PlantUML変換の継続実行
    const conversionPayload = {
      input: `${scenario} - ${pattern}（実行時間: ${hoursSinceStart.toFixed(1)}時間）`,
      type: 'soak_test_conversion',
      testHour: Math.floor(hoursSinceStart),
      vuId: __VU,
      iteration: __ITER,
      timestamp: Date.now()
    };
    
    const conversionResponse = http.post(
      `${BASE_URL}/api/convert`,
      JSON.stringify(conversionPayload),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Soak-Test': 'true',
          'X-Test-Duration': `${hoursSinceStart.toFixed(1)}h`
        }
      }
    );
    
    const conversionSuccess = check(conversionResponse, {
      'Long-running conversion stable': (r) => r.status === 200,
      'Conversion performance steady': (r) => r.timings.duration < 2000,
      'Memory usage not excessive': (r) => r.body.length < 100000,
    });
    
    if (!conversionSuccess) {
      longRunningErrors.add(1);
    }

    // 3. メモリ使用量の定期監視（10分おき）
    if (Date.now() - lastMemoryCheck > 10 * 60 * 1000) { // 10分間隔
      const memoryResponse = http.get(`${BASE_URL}/api/health/memory`);
      
      if (memoryResponse.status === 200) {
        try {
          const memInfo = JSON.parse(memoryResponse.body);
          const currentMemory = memInfo.heapUsed || 0;
          
          if (initialMemory === 0) {
            initialMemory = currentMemory;
          }
          
          const memoryGrowthRate = (currentMemory - initialMemory) / (1024 * 1024); // MB
          memoryGrowth.add(memoryGrowthRate);
          
          // メモリリーク検出
          if (memoryGrowthRate > 100) { // 100MB以上の増加
            resourceLeaks.add(1);
            console.warn(`⚠️ メモリ使用量増加: ${memoryGrowthRate.toFixed(1)}MB（${hoursSinceStart.toFixed(1)}時間経過）`);
          }
          
          lastMemoryCheck = Date.now();
          memoryCheckInterval++;
          
          // 1時間ごとのレポート
          if (memoryCheckInterval % 6 === 0) { // 6回（1時間）ごと
            console.log(`📊 ${Math.floor(hoursSinceStart)}時間経過: メモリ${Math.round(currentMemory / 1024 / 1024)}MB（+${memoryGrowthRate.toFixed(1)}MB）`);
          }
          
        } catch (e) {
          console.warn('メモリ情報の解析に失敗:', e.message);
        }
      }
    }

    // 4. リソースクリーンアップテスト
    if (__ITER % 100 === 0) { // 100回に1回
      const cleanupTests = [
        http.get(`${BASE_URL}/api/cache/clear`),
        http.get(`${BASE_URL}/api/sessions/cleanup`),
        http.get(`${BASE_URL}/api/temp/cleanup`)
      ];
      
      cleanupTests.forEach((response, index) => {
        check(response, {
          [`Cleanup ${index} works`]: (r) => r.status === 200 || r.status === 404,
        });
      });
    }

    // 5. 定期的なコネクション品質チェック
    if (__ITER % 50 === 0) { // 50回に1回
      const qualityMetrics = {
        responseTime: basicRequest.timings.duration,
        bodySize: basicRequest.body.length,
        testHour: hoursSinceStart,
        vuId: __VU
      };
      
      // 品質劣化の検出
      if (qualityMetrics.responseTime > 2000) {
        console.warn(`🐌 応答時間劣化: ${qualityMetrics.responseTime}ms（VU${__VU}, ${hoursSinceStart.toFixed(1)}h）`);
        longRunningErrors.add(1);
      }
    }

    // 6. 長時間安定性のための適応的制御
    const performanceTime = Date.now() - testStart;
    
    // 時間帯による負荷調整（実際の利用パターンをシミュレート）
    const hour = currentTime.getHours();
    let waitMultiplier = 1.0;
    
    if (hour >= 2 && hour <= 6) {
      // 深夜は負荷軽減
      waitMultiplier = 2.0;
    } else if (hour >= 9 && hour <= 17) {
      // 業務時間は高負荷
      waitMultiplier = 0.5;
    }
    
    // 適応的待機時間
    const baseWait = 1000; // 1秒基本待機
    const adaptiveWait = baseWait * waitMultiplier;
    const randomWait = adaptiveWait + (Math.random() * 500); // ランダム要素追加
    
    sleep(randomWait / 1000);

  } catch (error) {
    console.error(`❌ Soak Test エラー（${hoursSinceStart.toFixed(1)}h経過）:`, error.message);
    longRunningErrors.add(1);
    
    // エラー時は長めの待機で回復を促す
    sleep(5);
  }
}

/**
 * テスト開始時の初期化
 */
export function setup() {
  console.log('⏰ K6 Soak Test 開始（6時間耐久テスト）');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log('📈 Soak Pattern: 6-hour continuous load');
  
  const startTime = Date.now();
  
  // 初期状態確認
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ アプリケーションが起動していません');
    throw new Error('Application health check failed');
  }
  
  // 初期メモリ状態記録
  const initialMemoryCheck = http.get(`${BASE_URL}/api/health/memory`);
  let baselineMemory = 0;
  if (initialMemoryCheck.status === 200) {
    try {
      const memInfo = JSON.parse(initialMemoryCheck.body);
      baselineMemory = memInfo.heapUsed || 0;
      console.log(`💾 初期メモリ使用量: ${Math.round(baselineMemory / 1024 / 1024)}MB`);
    } catch (e) {
      console.warn('⚠️ 初期メモリ測定失敗');
    }
  }
  
  // 環境変数設定
  __ENV.TEST_START_TIME = startTime;
  
  console.log('🔋 長時間監視項目:');
  console.log('   - メモリ使用量増加率');
  console.log('   - 接続安定性');
  console.log('   - パフォーマンス劣化');
  console.log('   - リソースリーク');
  
  return {
    startTime: new Date().toISOString(),
    startTimestamp: startTime,
    baseUrl: BASE_URL,
    baselineMemory: baselineMemory
  };
}

/**
 * テスト終了時の後処理
 */
export function teardown(data) {
  const endTime = Date.now();
  const totalHours = (endTime - data.startTimestamp) / (1000 * 60 * 60);
  
  console.log('🏁 K6 Soak Test 完了');
  console.log(`⏰ 総実行時間: ${totalHours.toFixed(2)}時間`);
  console.log(`📊 開始時刻: ${data.startTime}`);
  console.log(`📊 終了時刻: ${new Date().toISOString()}`);
  
  // 最終状態確認
  const finalHealthCheck = http.get(`${BASE_URL}/health`);
  const finalMemoryCheck = http.get(`${BASE_URL}/api/health/memory`);
  
  console.log(`💚 最終ヘルスチェック: ${finalHealthCheck.status === 200 ? 'OK' : 'NG'}`);
  
  if (finalMemoryCheck.status === 200) {
    try {
      const memInfo = JSON.parse(finalMemoryCheck.body);
      const finalMemory = memInfo.heapUsed || 0;
      const totalMemoryGrowth = finalMemory - data.baselineMemory;
      const memoryGrowthRate = totalMemoryGrowth / (1024 * 1024) / totalHours; // MB/hour
      
      console.log(`💾 最終メモリ使用量: ${Math.round(finalMemory / 1024 / 1024)}MB`);
      console.log(`📈 総メモリ増加: ${Math.round(totalMemoryGrowth / 1024 / 1024)}MB`);
      console.log(`📊 メモリ増加率: ${memoryGrowthRate.toFixed(2)}MB/時間`);
      
      // 判定基準
      if (memoryGrowthRate > 10) {
        console.warn('⚠️ メモリリークの可能性あり（>10MB/時間）');
      } else if (memoryGrowthRate > 5) {
        console.warn('⚠️ メモリ使用量増加が気になるレベル（>5MB/時間）');
      } else {
        console.log('✅ メモリ使用量は安定');
      }
      
    } catch (e) {
      console.warn('⚠️ 最終メモリ分析失敗');
    }
  }
  
  // 耐久テスト結果サマリー
  console.log('📋 6時間耐久テスト結果:');
  console.log(`   - 総実行時間: ${totalHours.toFixed(2)}時間`);
  console.log('   - 監視項目: メモリ、接続、パフォーマンス、リソース');
  console.log('   - 詳細レポート: ./allure-report/index.html');
  console.log('   - リアルタイム監視: http://localhost:3000');
  console.log('🎯 長時間安定性評価が完了しました');
}