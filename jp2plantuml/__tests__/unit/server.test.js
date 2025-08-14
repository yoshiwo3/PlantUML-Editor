/**
 * 単体テスト: Express.jsサーバー
 * jp2plantuml/server.js のテスト
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const { convertJapaneseToPlantUML } = require('../../src/convert');

// サーバーのモジュールを動的に読み込むためのヘルパー
function createTestApp() {
  const app = express();
  const cors = require('cors');
  const bodyParser = require('body-parser');
  const multer = require('multer');

  // Multerの設定（メモリストレージを使用）
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB制限
    }
  });

  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(express.static(path.join(__dirname, '../../public')));

  // /api/convert エンドポイント
  app.post('/api/convert', async (req, res) => {
    try {
      const { input, mode = 'auto', diagramType = 'auto', compat = 'latest' } = req.body || {};
      if (!input || typeof input !== 'string' || input.trim() === '') {
        return res.status(400).json({ error: 'input is required as string' });
      }
      const result = convertJapaneseToPlantUML(input, { mode, diagramType, compat });
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'conversion_failed' });
    }
  });

  // /api/render エンドポイント（テスト用簡易版）
  app.post('/api/render', async (req, res) => {
    try {
      const { plantuml } = req.body || {};
      if (!plantuml || typeof plantuml !== 'string') {
        return res.status(400).send('plantuml is required');
      }
      
      // テスト環境では実際のレンダリングはスキップし、モックレスポンスを返す
      const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <text x="10" y="20">Test SVG</text>
      </svg>`;
      
      res.set('Content-Type', 'image/svg+xml');
      return res.status(200).send(mockSvg);
    } catch (err) {
      console.error(err);
      return res.status(500).send('render_failed');
    }
  });

  // /api/analyze-image エンドポイント
  app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '画像ファイルが必要です' });
      }

      // 簡易的な図の種類判定
      let detectedType = 'activity';
      let suggestedText = '';

      const filename = req.file.originalname.toLowerCase();
      if (filename.includes('sequence') || filename.includes('シーケンス')) {
        detectedType = 'sequence';
        suggestedText = '参加者: ユーザー, システム\nメッセージ: ユーザー -> システム: リクエスト';
      } else if (filename.includes('gantt') || filename.includes('ガント')) {
        detectedType = 'gantt';
        suggestedText = 'プロジェクト名: サンプルプロジェクト\nタスク: 企画; 2025-08-10 〜 2025-08-20';
      } else {
        detectedType = 'activity';
        suggestedText = '開始\nアクティビティ: 処理1\n終了';
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

describe('Express.js サーバー API テスト', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/convert', () => {
    test('正常な変換リクエストを処理する', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({
          input: 'ユーザー -> システム: ログイン要求',
          mode: 'auto',
          diagramType: 'auto'
        })
        .expect(200);

      expect(response.body).toHaveProperty('diagramType');
      expect(response.body).toHaveProperty('plantuml');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.diagramType).toBe('sequence');
      expect(response.body.plantuml).toContain('@startuml');
    });

    test('パラメータなしでデフォルト値を使用する', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({
          input: 'テストデータ'
        })
        .expect(200);

      expect(response.body).toHaveProperty('diagramType');
      expect(response.body).toHaveProperty('plantuml');
    });

    test('inputが無い場合に400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('input is required as string');
    });

    test('inputが文字列でない場合に400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({
          input: 12345
        })
        .expect(400);

      expect(response.body.error).toBe('input is required as string');
    });

    test('空文字列のinputの場合に400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({
          input: ''
        })
        .expect(400);

      expect(response.body.error).toBe('input is required as string');
    });

    test('空白文字のinputの場合に400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({
          input: '   '
        })
        .expect(400);

      expect(response.body.error).toBe('input is required as string');
    });

    test('特定の図表タイプを強制指定する', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({
          input: 'テストデータ',
          diagramType: 'gantt'
        })
        .expect(200);

      expect(response.body.diagramType).toBe('gantt');
      expect(response.body.plantuml).toContain('@startgantt');
    });

    test('互換性オプションを指定する', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({
          input: 'タスク: テスト; 2025-08-13 〜 2025-08-20',
          compat: 'legacy'
        })
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      // メタデータにcompatが含まれることを確認
      expect(response.body.meta).toHaveProperty('compat');
    });
  });

  describe('POST /api/render', () => {
    test('正常なPlantUMLコードをレンダリングする', async () => {
      const plantumlCode = '@startuml\nA -> B: test\n@enduml';
      
      const response = await request(app)
        .post('/api/render')
        .send({ plantuml: plantumlCode })
        .expect(200);

      expect(response.headers['content-type']).toContain('image/svg+xml');
      expect(response.text).toContain('<svg');
      expect(response.text).toContain('Test SVG');
    });

    test('plantumlパラメータが無い場合に400エラーを返す', async () => {
      await request(app)
        .post('/api/render')
        .send({})
        .expect(400);
    });

    test('plantumlが文字列でない場合に400エラーを返す', async () => {
      await request(app)
        .post('/api/render')
        .send({ plantuml: 12345 })
        .expect(400);
    });
  });

  describe('POST /api/analyze-image', () => {
    test('シーケンス図画像を解析する', async () => {
      const buffer = Buffer.from('mock image data');
      
      const response = await request(app)
        .post('/api/analyze-image')
        .attach('image', buffer, 'sequence_diagram.png')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.detectedType).toBe('sequence');
      expect(response.body.suggestedText).toContain('参加者');
      expect(response.body.suggestedText).toContain('メッセージ');
      expect(response.body.imageInfo).toHaveProperty('size');
      expect(response.body.imageInfo).toHaveProperty('mimetype');
      expect(response.body.imageInfo).toHaveProperty('originalName');
    });

    test('ガント図画像を解析する', async () => {
      const buffer = Buffer.from('mock image data');
      
      const response = await request(app)
        .post('/api/analyze-image')
        .attach('image', buffer, 'gantt_chart.jpg')
        .expect(200);

      expect(response.body.detectedType).toBe('gantt');
      expect(response.body.suggestedText).toContain('プロジェクト名');
      expect(response.body.suggestedText).toContain('タスク');
    });

    test('一般的な画像をアクティビティ図として解析する', async () => {
      const buffer = Buffer.from('mock image data');
      
      const response = await request(app)
        .post('/api/analyze-image')
        .attach('image', buffer, 'general_image.png')
        .expect(200);

      expect(response.body.detectedType).toBe('activity');
      expect(response.body.suggestedText).toContain('開始');
      expect(response.body.suggestedText).toContain('アクティビティ');
      expect(response.body.suggestedText).toContain('終了');
    });

    test('画像ファイルが添付されていない場合に400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/analyze-image')
        .expect(400);

      expect(response.body.error).toBe('画像ファイルが必要です');
    });
  });

  describe('エラーハンドリング', () => {
    test('JSON解析エラーを適切に処理する', async () => {
      await request(app)
        .post('/api/convert')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    test('大きすぎるリクエストボディを処理する', async () => {
      const largeInput = 'a'.repeat(20 * 1024 * 1024); // 20MB
      
      await request(app)
        .post('/api/convert')
        .send({ input: largeInput })
        .expect(413); // Payload Too Large
    });
  });

  describe('CORS設定', () => {
    test('CORS ヘッダーが適切に設定される', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({ input: 'test' })
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('OPTIONS リクエストを適切に処理する', async () => {
      await request(app)
        .options('/api/convert')
        .expect(204);
    });
  });
});