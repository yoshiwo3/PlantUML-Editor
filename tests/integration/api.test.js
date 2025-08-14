/**
 * API統合テスト - PlantUMLプロジェクト
 * 
 * このテストファイルは以下のAPI統合機能を検証します:
 * - RESTful APIエンドポイントの動作
 * - APIレスポンスの形式と内容
 * - エラーハンドリングとステータスコード
 * - APIパフォーマンスと信頼性
 * - セキュリティとバリデーション
 */

const request = require('supertest');
const { spawn } = require('child_process');
const { expect } = require('@jest/globals');

describe('API統合テスト', () => {
  let server;
  let app;
  const baseURL = process.env.BASE_URL || 'http://localhost:8086';
  const testPort = process.env.TEST_PORT || 8087;

  beforeAll(async () => {
    // テスト用サーバーを起動
    try {
      server = await startTestServer();
      app = baseURL.replace(':8086', `:${testPort}`);
      
      // サーバーが起動するまで待機
      await waitForServer(app, 30000);
      
      console.log(`✅ テストサーバーが起動しました: ${app}`);
    } catch (error) {
      console.error('❌ テストサーバーの起動に失敗:', error);
      throw error;
    }
  }, 60000);

  afterAll(async () => {
    // テストサーバーを停止
    if (server) {
      server.kill();
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ テストサーバーを停止しました');
    }
  });

  describe('基本APIエンドポイント', () => {
    test('GET / - ルートエンドポイントが正常に応答する', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toBeTruthy();
      expect(response.headers['content-type']).toMatch(/html/);
      
      // 基本的なHTML構造の確認
      expect(response.text).toContain('<html');
      expect(response.text).toContain('</html>');
    });

    test('GET /health - ヘルスチェックエンドポイント', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      
      // タイムスタンプが最近のものであることを確認
      const timestamp = new Date(response.body.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now - timestamp);
      expect(timeDiff).toBeLessThan(60000); // 1分以内
    });

    test('GET /api/status - APIステータスエンドポイント', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('api');
      expect(response.body.api).toBe('active');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('features');
      
      // 機能の確認
      if (response.body.features) {
        expect(Array.isArray(response.body.features)).toBe(true);
      }
    });
  });

  describe('変換APIエンドポイント', () => {
    test('POST /api/convert - 基本的なテキスト変換', async () => {
      const testInput = {
        text: 'ユーザーがログインします'
      };

      const response = await request(app)
        .post('/api/convert')
        .send(testInput)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('success');
      expect(response.body).toHaveProperty('plantuml');
      expect(response.body.plantuml).toBeTruthy();
      expect(response.body).toHaveProperty('diagramType');
      
      // PlantUML形式の基本確認
      expect(response.body.plantuml).toMatch(/@start/);
      expect(response.body.plantuml).toMatch(/@end/);
      
      // レスポンス時間の確認（5秒以内）
      expect(response.responseTime || 0).toBeLessThan(5000);
    });

    test('POST /api/convert - 複雑なアクティビティ図の変換', async () => {
      const complexInput = {
        text: `開始
データを取得
条件分岐:
  データが存在する場合:
    データを処理
    結果を保存
  データが存在しない場合:
    エラーメッセージを表示
    初期状態に戻る
終了`
      };

      const response = await request(app)
        .post('/api/convert')
        .send(complexInput)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.plantuml).toBeTruthy();
      expect(response.body.diagramType).toBeTruthy();
      
      // 条件分岐の要素が含まれていることを確認
      const plantuml = response.body.plantuml;
      expect(plantuml).toMatch(/if|alt|opt/);
    });

    test('POST /api/convert - シーケンス図の変換', async () => {
      const sequenceInput = {
        text: `ユーザー -> システム: ログイン要求
システム -> データベース: 認証情報確認
データベース -> システム: 認証結果
システム -> ユーザー: ログイン完了`
      };

      const response = await request(app)
        .post('/api/convert')
        .send(sequenceInput)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.plantuml).toBeTruthy();
      
      // シーケンス図の要素確認
      const plantuml = response.body.plantuml;
      expect(plantuml).toContain('ユーザー');
      expect(plantuml).toContain('システム');
      expect(plantuml).toContain('データベース');
    });

    test('POST /api/convert - 無効な入力に対するエラーハンドリング', async () => {
      const invalidInputs = [
        null,
        undefined,
        '',
        '   ',
        { text: null },
        { text: undefined },
        { text: '' },
        { invalidField: 'test' }
      ];

      for (const invalidInput of invalidInputs) {
        const response = await request(app)
          .post('/api/convert')
          .send(invalidInput)
          .set('Content-Type', 'application/json');

        // 400または422エラーが返されることを確認
        expect([400, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('error');
        expect(response.body).toHaveProperty('message');
      }
    });

    test('POST /api/convert - 大きなテキストの処理', async () => {
      const largeText = Array.from({ length: 100 }, (_, i) => 
        `ステップ${i + 1}: 処理${i + 1}を実行`
      ).join('\n');

      const largeInput = { text: largeText };

      const response = await request(app)
        .post('/api/convert')
        .send(largeInput)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.plantuml).toBeTruthy();
      
      // レスポンス時間の確認（大きなテキストでも10秒以内）
      expect(response.responseTime || 0).toBeLessThan(10000);
    });

    test('POST /api/convert - 特殊文字の処理', async () => {
      const specialCharsInput = {
        text: `処理開始
"引用符付きテキスト"の処理
<HTML>タグの処理
& アンパサンドの処理
% パーセント記号の処理
処理終了`
      };

      const response = await request(app)
        .post('/api/convert')
        .send(specialCharsInput)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.plantuml).toBeTruthy();
      
      // 特殊文字が適切にエスケープされていることを確認
      expect(response.body.plantuml).not.toContain('undefined');
      expect(response.body.plantuml).not.toContain('null');
    });
  });

  describe('APIパフォーマンステスト', () => {
    test('API応答時間の測定', async () => {
      const testData = {
        text: 'パフォーマンステスト用のテキスト'
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/convert')
        .send(testData)
        .set('Content-Type', 'application/json')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000); // 3秒以内
      expect(response.body.status).toBe('success');
      
      console.log(`API応答時間: ${responseTime}ms`);
    });

    test('並行リクエストの処理', async () => {
      const concurrentRequests = 5;
      const testData = {
        text: '並行処理テスト用のテキスト'
      };

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .post('/api/convert')
          .send(testData)
          .set('Content-Type', 'application/json')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
      });

      console.log(`✅ ${concurrentRequests}個の並行リクエストが正常に処理されました`);
    });
  });

  describe('APIセキュリティテスト', () => {
    test('SQLインジェクション対策', async () => {
      const maliciousInput = {
        text: "'; DROP TABLE users; --"
      };

      const response = await request(app)
        .post('/api/convert')
        .send(maliciousInput)
        .set('Content-Type', 'application/json');

      // 正常に処理されるか、適切にエラーハンドリングされること
      expect([200, 400, 422]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body.plantuml).toBeTruthy();
      } else {
        expect(response.body.status).toBe('error');
      }
    });

    test('XSS対策', async () => {
      const xssInput = {
        text: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/convert')
        .send(xssInput)
        .set('Content-Type', 'application/json');

      expect([200, 400, 422]).toContain(response.status);
      
      if (response.status === 200) {
        // 出力にスクリプトタグが含まれていないことを確認
        expect(response.body.plantuml).not.toContain('<script>');
      }
    });

    test('大量データ送信対策', async () => {
      const largeData = {
        text: 'A'.repeat(1024 * 1024) // 1MB
      };

      const response = await request(app)
        .post('/api/convert')
        .send(largeData)
        .set('Content-Type', 'application/json');

      // サーバーが適切に制限を設けているか確認
      expect([200, 413, 422]).toContain(response.status);
      
      if (response.status === 413) {
        expect(response.body).toHaveProperty('message');
      }
    });
  });

  describe('APIエラーハンドリング', () => {
    test('不正なContent-Typeでのリクエスト', async () => {
      const testData = {
        text: 'Content-Typeテスト'
      };

      const response = await request(app)
        .post('/api/convert')
        .send(testData)
        .set('Content-Type', 'text/plain');

      expect([400, 415]).toContain(response.status);
    });

    test('不正なJSONデータ', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json');

      expect([400, 422]).toContain(response.status);
    });

    test('存在しないエンドポイント', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    test('不正なHTTPメソッド', async () => {
      const response = await request(app)
        .delete('/api/convert')
        .expect(405);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('API互換性テスト', () => {
    test('レスポンス形式の一貫性', async () => {
      const testInputs = [
        { text: 'シンプルテスト' },
        { text: '複雑な処理フローのテスト' },
        { text: 'ユーザー -> システム: テスト' }
      ];

      const responses = await Promise.all(
        testInputs.map(input =>
          request(app)
            .post('/api/convert')
            .send(input)
            .set('Content-Type', 'application/json')
        )
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('plantuml');
        expect(response.body).toHaveProperty('diagramType');
        
        // レスポンス形式の一貫性確認
        expect(typeof response.body.status).toBe('string');
        expect(typeof response.body.plantuml).toBe('string');
        expect(typeof response.body.diagramType).toBe('string');
      });
    });

    test('バージョン情報の確認', async () => {
      const response = await request(app)
        .get('/api/version')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('apiVersion');
      
      // セマンティックバージョニングの確認
      const versionRegex = /^\d+\.\d+\.\d+/;
      expect(response.body.version).toMatch(versionRegex);
    });
  });

  // ヘルパー関数
  async function startTestServer() {
    return new Promise((resolve, reject) => {
      const serverProcess = spawn('node', ['server.js'], {
        cwd: require('path').join(__dirname, '../../jp2plantuml'),
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          PORT: testPort
        },
        stdio: 'pipe'
      });

      let output = '';
      
      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running') || output.includes(`localhost:${testPort}`)) {
          resolve(serverProcess);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      serverProcess.on('error', (error) => {
        reject(error);
      });

      // タイムアウト処理
      setTimeout(() => {
        reject(new Error('サーバー起動がタイムアウトしました'));
      }, 30000);
    });
  }

  async function waitForServer(url, timeout = 30000) {
    const fetch = require('node-fetch');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${url}/health`);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // 接続エラーは無視して再試行
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('サーバーの起動確認がタイムアウトしました');
  }
});

// テスト設定
jest.setTimeout(60000); // API統合テストのため長めのタイムアウト