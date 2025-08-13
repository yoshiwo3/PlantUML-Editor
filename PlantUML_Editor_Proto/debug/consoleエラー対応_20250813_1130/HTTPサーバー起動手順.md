# PlantUML Editor Proto - HTTPサーバー起動手順

## 🚨 重要
ES6モジュールを正しく動作させるため、**必ずHTTPサーバー経由でアクセスしてください**。
file://プロトコルではCORSエラーが発生し、アプリケーションが正常に動作しません。

## 📋 起動方法

### 方法1: Python HTTPサーバー（推奨）
```bash
# コマンドプロンプトまたはPowerShellで実行
cd C:\d\PlantUML\PlantUML_Editor_Proto
python -m http.server 8080
```

アクセス: http://localhost:8080

### 方法2: Node.js http-server
```bash
# グローバルインストール（初回のみ）
npm install -g http-server

# サーバー起動
cd C:\d\PlantUML\PlantUML_Editor_Proto
http-server -p 8080 -c-1
```

アクセス: http://localhost:8080

### 方法3: npm scriptsを使用
```bash
cd C:\d\PlantUML\PlantUML_Editor_Proto
npm run start
# または
npm run serve
# または
npm run dev
```

アクセス: http://localhost:8080

### 方法4: VS Code Live Server
1. VS CodeでPlantUML_Editor_Protoフォルダーを開く
2. Live Server拡張機能をインストール
3. index.htmlを右クリック → "Open with Live Server"

## ✅ 動作確認

1. ブラウザーのコンソール（F12）を開く
2. CORSエラーが表示されていないことを確認
3. 以下が正常に動作することを確認：
   - アクターの選択
   - メッセージの追加
   - PlantUMLコードの生成
   - プレビュー表示

## ⚠️ トラブルシューティング

### ポート8080が使用中の場合
別のポートを指定してください：
```bash
python -m http.server 8081
# または
http-server -p 8081
```

### Pythonが見つからない場合
Python 3.xをインストールするか、Node.jsのhttp-serverを使用してください。

### まだCORSエラーが発生する場合
1. ブラウザーのキャッシュをクリア（Ctrl+Shift+Delete）
2. ブラウザーを再起動
3. http://localhost:8080 でアクセスしていることを確認（file://ではない）

## 📝 修正済み内容

以下の修正を実施済みです：
1. ✅ package.jsonに`"type": "module"`を追加
2. ✅ app.jsのimportチェック構文を修正
3. ✅ ErrorHandler.jsの構文エラーを修正
4. ✅ index.htmlのscriptタグに`type="module"`を設定

これらの修正により、HTTPサーバー経由でアクセスすれば正常に動作します。

---
作成日: 2025年8月13日