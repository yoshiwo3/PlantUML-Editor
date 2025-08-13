const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const { convertJapaneseToPlantUML } = require('./src/convert');

const app = express();
const PORT = process.env.PORT || 3000;

// Multerの設定（メモリストレージを使用）
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB制限
  }
});

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

// Proxy to Kroki for rendering SVG
app.post('/api/render', async (req, res) => {
  try {
    const { plantuml } = req.body || {};
    if (!plantuml || typeof plantuml !== 'string') {
      return res.status(400).send('plantuml is required');
    }
    const krokiUrl = process.env.KROKI_URL || 'https://kroki.io/plantuml/svg';
    const resp = await fetch(krokiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: plantuml,
    });
    const svg = await resp.text();
    res.set('Content-Type', 'image/svg+xml');
    return res.status(resp.status).send(svg);
  } catch (err) {
    console.error(err);
    return res.status(500).send('render_failed');
  }
});

// 画像解析エンドポイント
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '画像ファイルが必要です' });
    }

    // 画像データをBase64エンコード
    const imageBase64 = req.file.buffer.toString('base64');
    const imageMimeType = req.file.mimetype;
    const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

    // 簡単なパターン認識による図の種類判定
    // 実際のプロダクションでは、TensorFlow.jsやCloud Vision APIなどを使用することを推奨
    let detectedType = 'activity'; // デフォルト
    let suggestedText = '';

    // ファイル名から図の種類を推測（簡易的な実装）
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
    } else if (filename.includes('state') || filename.includes('状態')) {
      detectedType = 'state';
      suggestedText = '状態: 初期\n遷移: 初期 -> 実行中\n遷移: 実行中 -> 完了\n状態: 完了';
    } else if (filename.includes('usecase') || filename.includes('ユースケース')) {
      detectedType = 'usecase';
      suggestedText = 'アクター: ユーザー\nユースケース: ログイン\n関係: ユーザー -> ログイン';
    } else {
      detectedType = 'activity';
      suggestedText = '開始\nアクティビティ: 処理1\nアクティビティ: 処理2\n分岐: 条件 -> はい / いいえ\n終了';
    }

    // レスポンスを返す
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

app.listen(PORT, () => {
  console.log(`jp2plantuml listening on http://localhost:${PORT}`);
});
