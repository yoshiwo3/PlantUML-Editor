/**
 * K6 Spike Test for PlantUML Editor
 * 急激な負荷増加に対するシステムの応答性をテスト
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// カスタムメトリクス定義
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const plantumlConversions = new Counter('plantuml_conversions');
const realTimeSyncEvents = new Counter('realtime_sync_events');

// テスト設定
export const options = {
  stages: [
    // 段階的負荷増加
    { duration: '10s', target: 100 },    // 急激な負荷増加
    { duration: '1m', target: 100 },     // 高負荷維持
    { duration: '10s', target: 1000 },   // スパイク発生
    { duration: '3m', target: 1000 },    // スパイク維持
    { duration: '10s', target: 100 },    // 通常負荷に戻る
    { duration: '3m', target: 100 },     // 回復確認
    { duration: '10s', target: 0 },      // 終了
  ],
  
  // パフォーマンス閾値
  thresholds: {
    'http_req_duration': ['p(99)<1500'],           // 99%が1.5秒以内
    'http_req_failed': ['rate<0.1'],               // エラー率10%未満
    'error_rate': ['rate<0.05'],                   // カスタムエラー率5%未満
    'response_time': ['p(95)<1000'],               // 95%が1秒以内
    'plantuml_conversions': ['count>1000'],        // 1000回以上の変換実行
    'realtime_sync_events': ['count>5000'],        // 5000回以上の同期イベント
  },
  
  // リソース制限
  maxRedirects: 4,
  userAgent: 'K6-PlantUML-LoadTest/1.0',
  
  // タグ設定
  tags: {
    testType: 'spike',
    environment: 'docker',
    application: 'plantuml-editor'
  }
};

// テストデータ準備
const testData = {
  // 日本語入力パターン
  japaneseInputs: [
    'AさんがBさんにメッセージを送る',
    'ユーザーがシステムにログインする',
    'システムがデータベースにアクセスしてデータを取得する',
    '管理者が設定を変更して保存する',
    'APIがリクエストを受信してレスポンスを返す',
    'バッチ処理が夜間に実行される',
    'ユーザーがファイルをアップロードして処理が完了する',
    'システムがエラーを検出してログに記録する',
    'データベースのバックアップが定期的に実行される',
    'ユーザーがレポートを生成してダウンロードする'
  ],
  
  // PlantUML構文パターン
  plantUMLPatterns: [
    '@startuml\nAlice -> Bob: Hello\n@enduml',
    '@startuml\nparticipant User\nparticipant System\nUser -> System: Login\n@enduml',
    '@startuml\nclass User {\n  +name: string\n  +login()\n}\n@enduml',
    '@startuml\nstart\n:Process Data;\nif (Valid?) then (yes)\n  :Save;\nelse (no)\n  :Error;\nendif\nstop\n@enduml'
  ]
};

// ベースURL設定
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8086';

/**
 * メインテストシナリオ
 */
export default function() {
  const testStart = Date.now();
  
  // 1. ホームページアクセス
  const homeResponse = http.get(`${BASE_URL}/`);
  check(homeResponse, {
    'Homepage loads successfully': (r) => r.status === 200,
    'Homepage contains PlantUML Editor': (r) => r.body.includes('PlantUML'),
    'Homepage response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (homeResponse.status !== 200) {
    errorRate.add(1);
    return;
  }

  // 2. 日本語入力テスト
  const randomJapaneseInput = testData.japaneseInputs[
    Math.floor(Math.random() * testData.japaneseInputs.length)
  ];
  
  const conversionPayload = {
    input: randomJapaneseInput,
    type: 'japanese_to_plantuml',
    timestamp: Date.now()
  };
  
  const conversionResponse = http.post(
    `${BASE_URL}/api/convert`,
    JSON.stringify(conversionPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Type': 'spike-test',
        'X-User-Agent': 'K6-LoadTest'
      }
    }
  );
  
  const conversionSuccess = check(conversionResponse, {
    'Conversion API responds': (r) => r.status === 200,
    'Conversion result contains PlantUML': (r) => r.body.includes('@startuml'),
    'Conversion response time < 500ms': (r) => r.timings.duration < 500,
    'Conversion result is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    }
  });
  
  if (conversionSuccess) {
    plantumlConversions.add(1);
  } else {
    errorRate.add(1);
  }

  // 3. リアルタイム同期テスト（WebSocketシミュレーション）
  const syncPayload = {
    event: 'editor_change',
    data: randomJapaneseInput,
    userId: `user_${__VU}`,
    sessionId: `session_${__VU}_${__ITER}`,
    timestamp: Date.now()
  };
  
  const syncResponse = http.post(
    `${BASE_URL}/api/sync`,
    JSON.stringify(syncPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Type': 'realtime'
      }
    }
  );
  
  check(syncResponse, {
    'Sync API responds': (r) => r.status === 200,
    'Sync response time < 100ms': (r) => r.timings.duration < 100,
  }) && realTimeSyncEvents.add(1);

  // 4. 静的リソースアクセス（CSS, JS）
  const resourceRequests = [
    http.get(`${BASE_URL}/css/style.css`),
    http.get(`${BASE_URL}/js/app.js`),
    http.get(`${BASE_URL}/js/plantuml-parser.js`)
  ];
  
  resourceRequests.forEach((response, index) => {
    check(response, {
      [`Resource ${index} loads`]: (r) => r.status === 200,
      [`Resource ${index} cached`]: (r) => r.headers['Cache-Control'] !== undefined,
    });
  });

  // 5. パフォーマンスメトリクス記録
  const totalTime = Date.now() - testStart;
  responseTime.add(totalTime);
  
  // 負荷軽減のための適応的待機
  const waitTime = Math.random() * 1000 + 500; // 0.5-1.5秒のランダム待機
  sleep(waitTime / 1000);
}

/**
 * テスト開始時の初期化
 */
export function setup() {
  console.log('🚀 K6 Spike Test 開始');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log('📈 Spike Pattern: 100 -> 1000 -> 100 users');
  
  // 事前ヘルスチェック
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ アプリケーションが起動していません');
    throw new Error('Application health check failed');
  }
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL
  };
}

/**
 * テスト終了時の後処理
 */
export function teardown(data) {
  console.log('🏁 K6 Spike Test 完了');
  console.log(`📊 テスト期間: ${data.startTime} - ${new Date().toISOString()}`);
  
  // 最終ヘルスチェック
  const finalCheck = http.get(`${BASE_URL}/health`);
  console.log(`💚 最終ヘルスチェック: ${finalCheck.status === 200 ? 'OK' : 'NG'}`);
  
  // 結果サマリーをログ出力
  console.log('📋 テスト結果は以下で確認してください:');
  console.log('   - Allureレポート: ./allure-report/index.html');
  console.log('   - Grafanaダッシュボード: http://localhost:3000');
}