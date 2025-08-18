/**
 * K6 Stress Test for PlantUML Editor
 * システムの限界点を特定するための継続的高負荷テスト
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// カスタムメトリクス定義
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time_stress');
const concurrentUsers = new Gauge('concurrent_users');
const memoryLeaks = new Counter('memory_leak_indicators');
const systemLoad = new Gauge('system_load');

// 大量テストデータの準備（メモリ効率化）
const testDataLarge = new SharedArray('stress_test_data', function() {
  const data = [];
  
  // 複雑な日本語シナリオ
  const complexScenarios = [
    'ECサイトでユーザーが商品を検索し、カートに追加し、決済処理を完了する一連の流れ',
    '銀行システムでユーザーが残高照会を行い、他口座への振込処理を実行し、取引履歴を確認する',
    '在庫管理システムで管理者が新商品を登録し、在庫数を更新し、発注処理を自動実行する',
    '人事管理システムで従業員が勤怠を入力し、上司が承認し、給与計算システムに連携する',
    'IoTデバイスからのセンサーデータを収集し、分析処理を実行し、アラート通知を送信する',
    'チャットボットがユーザーの問い合わせを受付け、FAQを検索し、適切な回答を返す',
    '配送管理システムで配送状況を追跡し、遅延を検出し、顧客に自動通知を送信する',
    'セキュリティシステムがアクセスログを監視し、異常パターンを検出し、管理者にアラートする',
    'レポート生成システムが大量データを集計し、グラフを作成し、PDFで出力する',
    'バックアップシステムが定期的にデータを収集し、クラウドに保存し、整合性を検証する'
  ];
  
  // データを拡張（1000パターン生成）
  for (let i = 0; i < 100; i++) {
    complexScenarios.forEach((scenario, index) => {
      data.push({
        id: i * 10 + index,
        input: `${scenario}（ケース${i + 1}）`,
        complexity: 'high',
        expectedElements: Math.floor(Math.random() * 20) + 5
      });
    });
  }
  
  return data;
});

// テスト設定
export const options = {
  stages: [
    // 段階的負荷増加（ストレステスト用）
    { duration: '2m', target: 200 },     // 初期負荷
    { duration: '5m', target: 500 },     // 中負荷
    { duration: '10m', target: 1000 },   // 高負荷
    { duration: '15m', target: 1500 },   // 最大負荷
    { duration: '10m', target: 2000 },   // 限界負荷
    { duration: '5m', target: 1000 },    // 負荷削減
    { duration: '2m', target: 0 },       // 終了
  ],
  
  // 厳しいパフォーマンス閾値
  thresholds: {
    'http_req_duration': ['p(95)<2000'],           // 95%が2秒以内
    'http_req_failed': ['rate<0.15'],              // エラー率15%未満
    'error_rate': ['rate<0.1'],                    // カスタムエラー率10%未満
    'response_time_stress': ['p(90)<1500'],        // 90%が1.5秒以内
    'concurrent_users': ['value<2500'],            // 同時接続2500未満
    'memory_leak_indicators': ['count<100'],       // メモリリーク兆候100未満
  },
  
  // リソース制限
  maxRedirects: 2,
  userAgent: 'K6-PlantUML-StressTest/1.0',
  batch: 50,  // 同時リクエスト数制限
  
  // タグ設定
  tags: {
    testType: 'stress',
    environment: 'docker',
    maxLoad: '2000users'
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8086';

/**
 * メインストレステストシナリオ
 */
export default function() {
  const testStart = Date.now();
  const currentVU = __VU;
  const currentIter = __ITER;
  
  // 現在の同時実行ユーザー数を記録
  concurrentUsers.add(__VU);
  
  // テストデータの選択（メモリ効率化）
  const testItem = testDataLarge[currentIter % testDataLarge.length];
  
  try {
    // 1. 複雑なPlantUML変換テスト
    const conversionStart = Date.now();
    const conversionPayload = {
      input: testItem.input,
      type: 'complex_japanese_to_plantuml',
      userId: `stress_user_${currentVU}`,
      sessionId: `stress_session_${currentVU}_${currentIter}`,
      complexity: testItem.complexity,
      timestamp: conversionStart
    };
    
    const conversionResponse = http.post(
      `${BASE_URL}/api/convert`,
      JSON.stringify(conversionPayload),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Type': 'stress-test',
          'X-Complexity': testItem.complexity,
          'X-VU': currentVU.toString(),
          'X-Iteration': currentIter.toString()
        },
        timeout: '5s'  // タイムアウト設定
      }
    );
    
    const conversionTime = Date.now() - conversionStart;
    responseTime.add(conversionTime);
    
    const conversionSuccess = check(conversionResponse, {
      'Complex conversion succeeds': (r) => r.status === 200,
      'Conversion result is valid': (r) => {
        try {
          const result = JSON.parse(r.body);
          return result.plantuml && result.plantuml.includes('@startuml');
        } catch {
          return false;
        }
      },
      'Complex conversion time reasonable': (r) => r.timings.duration < 3000,
      'Memory usage acceptable': (r) => {
        // レスポンスサイズでメモリ使用量を推定
        const size = r.body.length;
        return size < 1024 * 1024; // 1MB未満
      }
    });
    
    if (!conversionSuccess) {
      errorRate.add(1);
    }

    // 2. 大量データ同期テスト
    const syncBatch = [];
    for (let i = 0; i < 10; i++) {
      syncBatch.push({
        event: 'bulk_editor_change',
        data: testItem.input.substring(0, Math.min(100, testItem.input.length)),
        sequence: i,
        batchId: `batch_${currentVU}_${currentIter}`,
        timestamp: Date.now()
      });
    }
    
    const bulkSyncResponse = http.post(
      `${BASE_URL}/api/sync/bulk`,
      JSON.stringify(syncBatch),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Bulk-Size': syncBatch.length.toString()
        },
        timeout: '3s'
      }
    );
    
    check(bulkSyncResponse, {
      'Bulk sync processes': (r) => r.status === 200,
      'Bulk sync is fast': (r) => r.timings.duration < 1000,
    });

    // 3. メモリリークの検出
    if (currentIter % 50 === 0) { // 50回に1回チェック
      const memoryCheckResponse = http.get(`${BASE_URL}/api/health/memory`);
      
      check(memoryCheckResponse, {
        'Memory check responds': (r) => r.status === 200,
        'Memory usage within limits': (r) => {
          try {
            const memInfo = JSON.parse(r.body);
            const heapUsed = memInfo.heapUsed || 0;
            const threshold = 500 * 1024 * 1024; // 500MB
            
            if (heapUsed > threshold) {
              memoryLeaks.add(1);
              return false;
            }
            return true;
          } catch {
            memoryLeaks.add(1);
            return false;
          }
        }
      });
    }

    // 4. 並行処理負荷テスト
    if (currentVU % 10 === 0) { // 10VUに1回実行
      const parallelRequests = [
        http.get(`${BASE_URL}/api/templates`),
        http.get(`${BASE_URL}/api/history`),
        http.get(`${BASE_URL}/api/settings`),
        http.post(`${BASE_URL}/api/validate`, JSON.stringify({
          plantuml: '@startuml\nAlice -> Bob\n@enduml'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      ];
      
      // 並行リクエスト結果をチェック
      const parallelSuccess = parallelRequests.every(response => 
        response.status === 200 || response.status === 404 // 404は許容
      );
      
      if (!parallelSuccess) {
        errorRate.add(1);
      }
    }

    // 5. システム負荷監視
    const totalTime = Date.now() - testStart;
    systemLoad.add(totalTime);
    
    // 適応的待機（高負荷時は長めの待機）
    const loadFactor = Math.min(__VU / 1000, 1); // 0-1の負荷係数
    const baseWait = 100; // 100ms基本待機
    const adaptiveWait = baseWait + (loadFactor * 400); // 最大500ms
    
    sleep(adaptiveWait / 1000);

  } catch (error) {
    console.error(`❌ VU ${currentVU} Iteration ${currentIter} エラー:`, error.message);
    errorRate.add(1);
    
    // エラー時は長めの待機
    sleep(2);
  }
}

/**
 * テスト開始時の初期化
 */
export function setup() {
  console.log('🔥 K6 Stress Test 開始');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log('📈 Stress Pattern: 200 -> 2000 users over 49 minutes');
  console.log(`📋 Test Data Size: ${testDataLarge.length} scenarios`);
  
  // アプリケーション状態確認
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ アプリケーションが起動していません');
    throw new Error('Application health check failed');
  }
  
  // メモリベースライン測定
  const memoryBaseline = http.get(`${BASE_URL}/api/health/memory`);
  let baselineMemory = 0;
  if (memoryBaseline.status === 200) {
    try {
      const memInfo = JSON.parse(memoryBaseline.body);
      baselineMemory = memInfo.heapUsed || 0;
      console.log(`💾 メモリベースライン: ${Math.round(baselineMemory / 1024 / 1024)}MB`);
    } catch (e) {
      console.warn('⚠️ メモリベースライン取得失敗');
    }
  }
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
    baselineMemory: baselineMemory,
    testDataSize: testDataLarge.length
  };
}

/**
 * テスト終了時の後処理
 */
export function teardown(data) {
  console.log('🏁 K6 Stress Test 完了');
  console.log(`📊 テスト期間: ${data.startTime} - ${new Date().toISOString()}`);
  
  // 最終状態確認
  const finalCheck = http.get(`${BASE_URL}/health`);
  const finalMemory = http.get(`${BASE_URL}/api/health/memory`);
  
  console.log(`💚 最終ヘルスチェック: ${finalCheck.status === 200 ? 'OK' : 'NG'}`);
  
  if (finalMemory.status === 200) {
    try {
      const memInfo = JSON.parse(finalMemory.body);
      const currentMemory = memInfo.heapUsed || 0;
      const memoryIncrease = currentMemory - data.baselineMemory;
      
      console.log(`💾 最終メモリ使用量: ${Math.round(currentMemory / 1024 / 1024)}MB`);
      console.log(`📈 メモリ増加: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      if (memoryIncrease > 100 * 1024 * 1024) { // 100MB以上増加
        console.warn('⚠️ 大幅なメモリ増加を検出（メモリリークの可能性）');
      }
    } catch (e) {
      console.warn('⚠️ 最終メモリ状態取得失敗');
    }
  }
  
  // 結果サマリー
  console.log('📋 ストレステスト結果:');
  console.log('   - 最大同時接続数: 2000ユーザー');
  console.log(`   - テストシナリオ数: ${data.testDataSize}`);
  console.log('   - Allureレポート: ./allure-report/index.html');
  console.log('   - Grafanaダッシュボード: http://localhost:3000');
}