# NPM Scripts 使用ガイド

PlantUML Editor Protoの強化されたnpm scriptsの完全ガイドです。

## 📚 目次

1. [基本的な開発コマンド](#基本的な開発コマンド)
2. [サーバー起動オプション](#サーバー起動オプション)
3. [開発・デバッグコマンド](#開発デバッグコマンド)
4. [ビルド・バンドルコマンド](#ビルドバンドルコマンド)
5. [テスト・品質チェック](#テスト品質チェック)
6. [ユーティリティコマンド](#ユーティリティコマンド)
7. [高度なワークフロー](#高度なワークフロー)

---

## 🚀 基本的な開発コマンド

### クイックスタート
```bash
# 最も簡単な開始方法（Python HTTPサーバー）
npm start

# Node.js HTTPサーバーで開始（自動ブラウザ起動）
npm run start:node

# ライブリロード付きで開始
npm run start:live

# 自動ポート検索で開始
npm run start:auto
```

### 推奨開発環境
```bash
# 並列開発環境（サーバー + ヘルスチェック + ファイル監視）
npm run dev:parallel

# シンプル開発環境
npm run dev

# デバッグ環境
npm run dev:debug
```

---

## 🌐 サーバー起動オプション

### 基本サーバー
```bash
npm start                    # Python HTTPサーバー (ポート8080)
npm run server              # 同上（エイリアス）
npm run server:node         # Node.js HTTPサーバー
npm run server:debug        # デバッグモード（127.0.0.1バインド）
```

### CORS対応サーバー
```bash
npm run serve:cors          # CORS有効化サーバー
npm run serve               # Serveパッケージ使用
```

### HTTPS対応サーバー
```bash
npm run serve:https         # HTTPS対応（証明書必要）
```

### 静音モード
```bash
npm run start:quiet         # ログ出力を抑制
```

---

## 🔧 開発・デバッグコマンド

### ブラウザ自動起動
```bash
npm run open                # デフォルトブラウザで開く
npm run open:wait          # サーバー起動待機後に開く
npm run open:edge          # Microsoft Edgeで開く
npm run open:chrome        # Google Chromeで開く
```

### ファイル監視
```bash
npm run watch:files        # ファイル変更監視
npm run dev:watch          # ライブリロード + ファイル監視
```

### デバッグ機能
```bash
npm run debug              # Node.js インスペクタ起動
npm run debug:break        # ブレークポイント付きデバッグ
```

---

## 📦 ビルド・バンドルコマンド

### 基本ビルド
```bash
npm run build              # 完全ビルド（クリーン → バンドル → 最適化）
npm run build:dev          # 開発用ビルド
npm run build:prod         # プロダクション用ビルド
```

### 個別処理
```bash
npm run bundle             # JavaScriptバンドル作成
npm run optimize           # 最適化処理
npm run minify             # 圧縮処理
npm run analyze            # バンドル分析
```

---

## 🧪 テスト・品質チェック

### テスト実行
```bash
npm test                   # 全テスト実行
npm run test:unit          # ユニットテスト
npm run test:integration   # 統合テスト
npm run test:e2e           # E2Eテスト
npm run test:lighthouse    # パフォーマンステスト
```

### 品質チェック
```bash
npm run lint               # リンティング
npm run lint:fix           # 自動修正
npm run format             # コードフォーマット
npm run audit              # セキュリティ監査
npm run validate           # 総合検証
```

### ヘルスチェック
```bash
npm run health             # システム健全性チェック
npm run health:monitor     # 継続的な監視
npm run health:endpoint    # エンドポイント確認
npm run check              # 全体チェック
```

---

## 🧹 ユーティリティコマンド

### クリーンアップ
```bash
npm run clean              # 標準クリーンアップ
npm run clean:all          # 完全クリーンアップ
npm run clean:build        # ビルドファイルのみ
npm run clean:logs         # ログファイルのみ
```

### 依存関係管理
```bash
npm run install:deps       # 依存関係インストール
npm run install:all        # 全依存関係インストール
npm run update:deps        # 依存関係更新
```

### ドキュメント
```bash
npm run docs               # ドキュメント生成
npm run docs:serve         # ドキュメント配信
```

---

## 🎯 高度なワークフロー

### CI/CD対応
```bash
npm run ci                 # CI環境用（install → validate → build）
npm run prepare            # インストール前準備
npm run check              # 総合チェック
```

### デプロイメント
```bash
npm run deploy:staging     # ステージング環境へデプロイ
npm run deploy:prod        # プロダクション環境へデプロイ
```

### バックアップ・復元
```bash
npm run backup             # バックアップ作成
npm run restore            # バックアップ復元
```

### パフォーマンス分析
```bash
npm run perf               # パフォーマンス分析
npm run analyze            # バンドル分析
```

---

## 🔄 ライフサイクルフック

以下のフックが自動実行されます：

- `prestart`: 開始前のヘルスチェック
- `postinstall`: インストール後メッセージ
- `prebuild`: ビルド前クリーンアップ
- `postbuild`: ビルド完了メッセージ

---

## 📊 パフォーマンス監視

### 継続的監視
```bash
# サーバー + ヘルスチェック + ファイル監視の並列実行
npm run dev:parallel

# 30秒ごとのヘルスチェック
npm run health:monitor
```

### リアルタイム分析
```bash
# ファイル変更の即座検知
npm run watch:files

# ライブリロード付き開発
npm run dev:watch
```

---

## 🛠️ トラブルシューティング

### よくある問題と解決法

#### ポートが使用中の場合
```bash
npm run start:auto         # 自動的に利用可能ポートを検索
```

#### CORS エラーの場合
```bash
npm run serve:cors         # CORS対応サーバーを起動
```

#### 依存関係の問題
```bash
npm run clean              # クリーンアップ
npm run install:all        # 再インストール
npm run audit              # セキュリティ監査
```

#### パフォーマンス問題
```bash
npm run health             # システム健全性チェック
npm run perf               # パフォーマンス分析
npm run clean:all          # 完全クリーンアップ
```

---

## 🎨 カスタマイズ

### 設定ファイル
package.jsonの`config`セクションで設定をカスタマイズできます：

```json
{
  "config": {
    "defaultPort": 8080,
    "fallbackPorts": [3000, 3001, 8000, 8001, 9000],
    "openBrowser": true,
    "enableCORS": true,
    "enableHTTPS": false
  }
}
```

### 環境変数
```bash
# ポート指定
PORT=3000 npm start

# 静音モード
QUIET=true npm run dev

# デバッグモード
DEBUG=true npm run server
```

---

## 📚 スクリプトリファレンス

### 基本コマンド一覧

| コマンド | 説明 | 用途 |
|----------|------|------|
| `start` | Python HTTPサーバー起動 | 基本開発 |
| `start:node` | Node.js HTTPサーバー起動 | Node.js環境 |
| `start:live` | ライブリロードサーバー | リアルタイム開発 |
| `dev` | 開発環境起動 | 標準開発 |
| `build` | 完全ビルド | プロダクション準備 |
| `test` | 全テスト実行 | 品質保証 |
| `health` | ヘルスチェック | システム確認 |
| `clean` | クリーンアップ | メンテナンス |

### 高度なコマンド一覧

| コマンド | 説明 | 用途 |
|----------|------|------|
| `dev:parallel` | 並列開発環境 | 効率的開発 |
| `serve:cors` | CORS対応サーバー | API開発 |
| `build:prod` | プロダクションビルド | リリース準備 |
| `health:monitor` | 継続的監視 | 安定性確保 |
| `clean:all` | 完全クリーンアップ | 問題解決 |

---

## 💡 ベストプラクティス

### 開発開始時
```bash
npm run health             # システム確認
npm run dev:parallel       # 並列開発環境開始
```

### リリース前
```bash
npm run validate           # 総合検証
npm run build:prod         # プロダクションビルド
npm run test               # 全テスト実行
```

### 問題発生時
```bash
npm run clean:all          # 完全クリーンアップ
npm run install:all        # 依存関係再インストール
npm run health             # システム確認
```

---

**📝 注意事項**

- Windows環境では一部のコマンドが動作しない場合があります
- Python 3.8+ と Node.js 16+ が必要です
- CORSエラーが発生する場合は `npm run serve:cors` を使用してください
- ポート競合時は `npm run start:auto` が自動的に代替ポートを検索します

**🔗 参考リンク**

- [PlantUML公式ドキュメント](https://plantuml.com/)
- [HTTP-Server Documentation](https://github.com/http-party/http-server)
- [Live-Server Documentation](https://github.com/tapio/live-server)
- [Concurrently Documentation](https://github.com/open-cli-tools/concurrently)

---

*最終更新: 2025年8月13日*  
*バージョン: 2.0*