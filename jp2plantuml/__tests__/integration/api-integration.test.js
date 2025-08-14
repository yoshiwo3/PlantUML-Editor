/**
 * 統合テスト: API エンドポイント統合テスト
 * 各 API エンドポイントと変換エンジンの統合動作を検証
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { convertJapaneseToPlantUML } = require('../../src/convert');

// 実際のサーバー設定と同じ統合テスト用アプリケーションを作成
function createIntegrationApp() {
  const app = express();

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(express.static(path.join(__dirname, '../../public')));

  // 実際のサーバーコードと同じエンドポイント実装
  app.post('/api/convert', async (req, res) => {
    try {
      const { input, mode = 'auto', diagramType = 'auto', compat = 'latest' } = req.body || {};
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: 'input is required as string' });
      }
      const result = convertJapaneseToPlantUML(input, { mode, diagramType, compat });
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'conversion_failed' });
    }
  });

  app.post('/api/render', async (req, res) => {
    try {
      const { plantuml } = req.body || {};
      if (!plantuml || typeof plantuml !== 'string') {
        return res.status(400).send('plantuml is required');
      }
      
      // 統合テスト用のモックSVG
      const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">
        <rect width="200" height="150" fill="white"/>
        <text x="10" y="30" font-family="Arial" font-size="12">${plantuml.includes('sequence') ? 'Sequence Diagram' : 'Diagram'}</text>
      </svg>`;
      
      res.set('Content-Type', 'image/svg+xml');
      return res.status(200).send(mockSvg);
    } catch (err) {
      console.error(err);
      return res.status(500).send('render_failed');
    }
  });

  app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '画像ファイルが必要です' });
      }

      let detectedType = 'activity';
      let suggestedText = '';

      const filename = req.file.originalname.toLowerCase();
      if (filename.includes('sequence') || filename.includes('シーケンス')) {
        detectedType = 'sequence';
        suggestedText = '参加者: ユーザー, システム\nメッセージ: ユーザー -> システム: リクエスト\nメッセージ: システム -> ユーザー: レスポンス';
      } else if (filename.includes('gantt') || filename.includes('ガント')) {
        detectedType = 'gantt';
        suggestedText = 'プロジェクト名: サンプルプロジェクト\n開始日: 2025-08-10\nタスク: 企画; 2025-08-10 〜 2025-08-20\nタスク: 開発; 2025-08-21 〜 2025-09-10';
      } else if (filename.includes('class') || filename.includes('クラス')) {
        detectedType = 'class';
        suggestedText = 'クラス: User { id:int; name:string }\nクラス: Order { id:int }\n関連: User -> Order';
      } else {
        detectedType = 'activity';
        suggestedText = '開始\nアクティビティ: 処理1\nアクティビティ: 処理2\n終了';
      }

      res.json({
        success: true,
        detectedType: detectedType,
        suggestedText: suggestedText,
        imageInfo: {
          size: req.file.size,
          mimetype: req.file.mimetype,
          originalName: req.file.originalname
        },
        message: '画像を解析しました。提案されたテキストを確認・編集してPlantUMLを生成してください。'
      });
    } catch (err) {
      console.error('画像解析エラー:', err);
      return res.status(500).json({ error: '画像解析に失敗しました' });
    }
  });

  return app;
}

describe('API 統合テスト', () => {
  let app;

  beforeAll(() => {
    app = createIntegrationApp();
  });

  describe('エンドツーエンド変換ワークフロー', () => {
    test('シーケンス図の完全な変換フロー', async () => {
      const inputText = `参加者: ユーザー, フロントエンド, バックエンド, データベース
メッセージ: ユーザー -> フロントエンド: ログイン要求
メッセージ: フロントエンド -> バックエンド: 認証API
メッセージ: バックエンド -> データベース: ユーザー確認
メッセージ: データベース -> バックエンド: 確認結果
メッセージ: バックエンド -> フロントエンド: 認証結果
メッセージ: フロントエンド -> ユーザー: ログイン完了`;

      // ステップ1: 変換API呼び出し
      const convertResponse = await request(app)
        .post('/api/convert')
        .send({ input: inputText })
        .expect(200);

      expect(convertResponse.body.diagramType).toBe('sequence');
      expect(convertResponse.body.plantuml).toContain('@startuml');
      expect(convertResponse.body.plantuml).toContain('participant ユーザー');
      expect(convertResponse.body.plantuml).toContain('ユーザー -> フロントエンド:');

      // ステップ2: レンダリングAPI呼び出し
      const renderResponse = await request(app)
        .post('/api/render')
        .send({ plantuml: convertResponse.body.plantuml })
        .expect(200);

      expect(renderResponse.headers['content-type']).toContain('image/svg+xml');
      expect(renderResponse.text).toContain('<svg');
    });

    test('ガント図の完全な変換フロー', async () => {
      const inputText = `プロジェクト名: Webアプリ開発
開始日: 2025-08-13
タスク: 要件定義; 2025-08-13 〜 2025-08-20; 担当: 田中; 進捗: 100%
タスク: 基本設計; 2025-08-21 〜 2025-08-31; 担当: 佐藤; 進捗: 75%; 依存: 要件定義
タスク: 詳細設計; 2025-09-01 〜 2025-09-10; 担当: 鈴木; 進捗: 50%; 依存: 基本設計`;

      const convertResponse = await request(app)
        .post('/api/convert')
        .send({ input: inputText })
        .expect(200);

      expect(convertResponse.body.diagramType).toBe('gantt');
      expect(convertResponse.body.plantuml).toContain('@startgantt');
      expect(convertResponse.body.plantuml).toContain('[要件定義]');
      expect(convertResponse.body.plantuml).toContain('T1 is 100% completed');
      expect(convertResponse.body.plantuml).toContain('T1 -> T2');

      const renderResponse = await request(app)
        .post('/api/render')
        .send({ plantuml: convertResponse.body.plantuml })
        .expect(200);

      expect(renderResponse.text).toContain('<svg');
    });

    test('画像解析からPlantUML生成までの完全フロー', async () => {
      const buffer = Buffer.from('mock sequence diagram image');
      
      // ステップ1: 画像解析
      const analyzeResponse = await request(app)
        .post('/api/analyze-image')
        .attach('image', buffer, 'sequence_diagram.png')
        .expect(200);

      expect(analyzeResponse.body.success).toBe(true);
      expect(analyzeResponse.body.detectedType).toBe('sequence');

      // ステップ2: 解析結果を使った変換
      const convertResponse = await request(app)
        .post('/api/convert')
        .send({ 
          input: analyzeResponse.body.suggestedText,
          diagramType: analyzeResponse.body.detectedType 
        })
        .expect(200);

      expect(convertResponse.body.diagramType).toBe('sequence');
      expect(convertResponse.body.plantuml).toContain('@startuml');

      // ステップ3: レンダリング
      const renderResponse = await request(app)
        .post('/api/render')
        .send({ plantuml: convertResponse.body.plantuml })
        .expect(200);

      expect(renderResponse.text).toContain('<svg');
    });
  });

  describe('複数の図表タイプの統合処理', () => {
    const testCases = [
      {
        name: 'アクティビティ図',
        input: '開始\nアクティビティ: ユーザー登録\nアクティビティ: メール送信\n分岐: 確認完了 -> 登録完了 / 未確認 -> 再送信\n終了',
        expectedType: 'activity'
      },
      {
        name: 'ステート図',
        input: '状態: 未ログイン\n状態: ログイン済み\n状態: セッション切れ\n遷移: 未ログイン -> ログイン済み\n遷移: ログイン済み -> セッション切れ',
        expectedType: 'state'
      },
      {
        name: 'ユースケース図',
        input: 'アクター: 一般ユーザー\nアクター: 管理者\nユースケース: 商品検索\nユースケース: 在庫管理\n関係: 一般ユーザー -> 商品検索\n関係: 管理者 -> 在庫管理',
        expectedType: 'usecase'
      },
      {
        name: 'クラス図',
        input: 'クラス: User { id:int; name:string; email:string; login():boolean }\nクラス: Product { id:int; name:string; price:double }\n関連: User -> Product',
        expectedType: 'class'
      }
    ];

    testCases.forEach(testCase => {
      test(`${testCase.name}の統合処理`, async () => {
        const convertResponse = await request(app)
          .post('/api/convert')
          .send({ input: testCase.input })
          .expect(200);

        expect(convertResponse.body.diagramType).toBe(testCase.expectedType);
        expect(convertResponse.body.plantuml).toContain('@startuml');

        const renderResponse = await request(app)
          .post('/api/render')
          .send({ plantuml: convertResponse.body.plantuml })
          .expect(200);

        expect(renderResponse.text).toContain('<svg');
      });
    });
  });

  describe('エラー処理の統合テスト', () => {
    test('変換エラーからレンダリング失敗までの連鎖', async () => {
      // 無効なPlantUML形式を強制生成（実際には変換は成功するが例として）
      const convertResponse = await request(app)
        .post('/api/convert')
        .send({ input: 'テスト' })
        .expect(200);

      // 正常な変換結果でもレンダリングテスト
      const renderResponse = await request(app)
        .post('/api/render')
        .send({ plantuml: convertResponse.body.plantuml })
        .expect(200);

      expect(renderResponse.text).toContain('<svg');
    });

    test('大量データの処理フロー', async () => {
      const largeInput = Array(100).fill(0).map((_, i) => 
        `タスク: 大規模タスク${i + 1}; 2025-08-${String(13 + (i % 15)).padStart(2, '0')} 〜 2025-08-${String(14 + (i % 15)).padStart(2, '0')}`
      ).join('\n');
      
      const fullInput = `プロジェクト名: 大規模プロジェクト\n開始日: 2025-08-13\n${largeInput}`;

      const convertResponse = await request(app)
        .post('/api/convert')
        .send({ input: fullInput })
        .expect(200);

      expect(convertResponse.body.diagramType).toBe('gantt');
      expect(convertResponse.body.meta.project.tasks).toHaveLength(100);

      // レンダリングも確認
      const renderResponse = await request(app)
        .post('/api/render')
        .send({ plantuml: convertResponse.body.plantuml })
        .expect(200);

      expect(renderResponse.text).toContain('<svg');
    });
  });

  describe('互換性オプションの統合テスト', () => {
    test('legacy互換性モードでの完全フロー', async () => {
      const input = `プロジェクト名: 互換テスト
タスク: レガシータスク; 2025-08-13 〜 2025-08-20; 担当: テスター; 進捗: 50%`;

      const convertResponse = await request(app)
        .post('/api/convert')
        .send({ 
          input: input,
          compat: 'legacy'
        })
        .expect(200);

      expect(convertResponse.body.plantuml).toContain('@startgantt');
      expect(convertResponse.body.plantuml).not.toContain('is 50% completed');
      expect(convertResponse.body.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('互換モードでは')
        ])
      );

      const renderResponse = await request(app)
        .post('/api/render')
        .send({ plantuml: convertResponse.body.plantuml })
        .expect(200);

      expect(renderResponse.text).toContain('<svg');
    });

    test('latest互換性モードでの完全フロー', async () => {
      const input = `プロジェクト名: 最新機能テスト
部門: 開発部
タスク: 最新タスク; 2025-08-13 〜 2025-08-20; 担当: 開発者; 進捗: 75%; 依存: -`;

      const convertResponse = await request(app)
        .post('/api/convert')
        .send({ 
          input: input,
          compat: 'latest'
        })
        .expect(200);

      expect(convertResponse.body.plantuml).toContain('T1 is 75% completed');
      expect(convertResponse.body.plantuml).toContain('-- 開発部 --');
      expect(convertResponse.body.plantuml).toContain('note right of T1: 担当 開発者');

      const renderResponse = await request(app)
        .post('/api/render')
        .send({ plantuml: convertResponse.body.plantuml })
        .expect(200);

      expect(renderResponse.text).toContain('<svg');
    });
  });

  describe('コンテンツタイプとヘッダーの統合テスト', () => {
    test('JSON APIのContent-Typeが正しく設定される', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({ input: 'test' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    test('SVG出力のContent-Typeが正しく設定される', async () => {
      const response = await request(app)
        .post('/api/render')
        .send({ plantuml: '@startuml\nA -> B\n@enduml' })
        .expect(200);

      expect(response.headers['content-type']).toContain('image/svg+xml');
    });

    test('CORS ヘッダーが全エンドポイントで設定される', async () => {
      const endpoints = [
        { path: '/api/convert', data: { input: 'test' } },
        { path: '/api/render', data: { plantuml: '@startuml\n@enduml' } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint.path)
          .send(endpoint.data);

        expect(response.headers['access-control-allow-origin']).toBeDefined();
      }
    });
  });
});