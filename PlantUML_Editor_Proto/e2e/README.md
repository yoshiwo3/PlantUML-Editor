# PlantUML Editor E2E Testing Framework - Sprint2

このドキュメントは、PlantUMLエディター用のE2E（End-to-End）テストフレームワークの使用方法を説明します。

## 📋 目次

- [概要](#概要)
- [環境要件](#環境要件)
- [セットアップ](#セットアップ)
- [テスト実行](#テスト実行)
- [テストカテゴリ](#テストカテゴリ)
- [Docker使用](#docker使用)
- [CI/CD統合](#cicd統合)
- [トラブルシューティング](#トラブルシューティング)

## 📖 概要

Sprint2 E2Eテストフレームワークは、PlantUMLエディターの品質保証を目的とした包括的なテスト環境です。

### 主要特徴

- **55のテストシナリオ**: 基本機能からクロスブラウザまで網羅
- **マルチブラウザ対応**: Chromium, Firefox, WebKit, Edge
- **Docker統合**: 一貫した実行環境
- **CI/CD対応**: GitHub Actions自動実行
- **パフォーマンス監視**: メトリクス収集と分析
- **セキュリティテスト**: XSS, CSRF等の脆弱性検証

### テスト構成

```
tests/scenarios/
├── basic/           # 基本機能テスト (8シナリオ)
├── editor/          # エディター機能テスト (7シナリオ)
├── diagrams/        # 図表タイプテスト (6シナリオ)
├── inline/          # インライン編集テスト (5シナリオ)
├── error/           # エラーハンドリングテスト (5シナリオ)
├── performance/     # パフォーマンステスト (4シナリオ)
├── security/        # セキュリティテスト (4シナリオ)
├── accessibility/   # アクセシビリティテスト (4シナリオ)
├── integration/     # 統合テスト (4シナリオ)
├── regression/      # 回帰テスト (3シナリオ)
├── stress/          # ストレステスト (3シナリオ)
└── cross-browser/   # クロスブラウザテスト (2シナリオ)
```

## 🛠 環境要件

### 必須要件

- **Node.js**: v20.18.0以上
- **npm**: v10.0.0以上
- **Playwright**: v1.48.0
- **Docker**: 24.0以上（Docker使用時）
- **メモリ**: 最低2GB利用可能

### 対応ブラウザ

- **Chromium**: 119+
- **Firefox**: 118+
- **WebKit**: 17+ (macOS/Linux)
- **Microsoft Edge**: 119+ (Windows)

### 対応OS

- Windows 10/11
- macOS 12+
- Ubuntu 20.04+

## ⚙️ セットアップ

### 1. 基本セットアップ

```bash
# E2Eテストディレクトリに移動
cd PlantUML_Editor_Proto/e2e

# 依存関係のインストール
npm install

# Playwrightブラウザのインストール
npx playwright install

# ブラウザ依存関係のインストール
npx playwright install-deps
```

### 2. テストデータ生成

```bash
# テストデータとFixturesの生成
npm run test:generate-data

# ヘルスチェック実行
npm run test:health-check
```

### 3. 環境確認

```bash
# 環境の健全性確認
npm run validate
```

## 🚀 テスト実行

### 基本的な実行方法

```bash
# 全テストの実行
npm test

# 特定カテゴリのテスト実行
npm run test:basic           # 基本機能テスト
npm run test:editor          # エディター機能テスト
npm run test:performance     # パフォーマンステスト
npm run test:security        # セキュリティテスト

# 特定ブラウザでの実行
npm run test:chromium        # Chromiumのみ
npm run test:firefox         # Firefoxのみ
npm run test:webkit          # WebKitのみ
npm run test:edge           # Edgeのみ
```

### 開発・デバッグ用実行

```bash
# UIモードでの実行（対話的）
npm run test:e2e:ui

# ヘッド付きモードでの実行（ブラウザが見える）
npm run test:e2e:headed

# デバッグモードでの実行
npm run test:e2e:debug

# 特定のテストファイルのみ実行
npx playwright test tests/scenarios/basic/BAS-001-application-startup.spec.js
```

### 高速実行オプション

```bash
# 高速実行（並列数削減、リトライ無し）
npm run test:e2e:fast

# Chromiumのみで高速実行
npm run test:e2e:fast -- --project=chromium
```

## 📊 テストカテゴリ

### BAS: 基本機能テスト (8シナリオ)

| テストID | 概要 | 重要度 |
|----------|------|--------|
| BAS-001 | アプリケーション起動テスト | Critical |
| BAS-002 | 日本語→PlantUML変換テスト | Critical |
| BAS-003 | プレビュー表示テスト | Critical |
| BAS-004 | コード編集同期テスト | High |
| BAS-005 | ファイル保存テスト | High |
| BAS-006 | ファイル読み込みテスト | High |
| BAS-007 | エクスポート機能テスト | Medium |
| BAS-008 | UIレスポンシブテスト | Medium |

### EDT: エディター機能テスト (7シナリオ)

| テストID | 概要 | 重要度 |
|----------|------|--------|
| EDT-001 | 構文ハイライトテスト | High |
| EDT-002 | オートコンプリートテスト | High |
| EDT-003 | インデント自動調整テスト | Medium |
| EDT-004 | 括弧マッチングテスト | Medium |
| EDT-005 | 検索・置換テスト | High |
| EDT-006 | Undo/Redoテスト | Critical |
| EDT-007 | コメント切替テスト | Low |

### PER: パフォーマンステスト (4シナリオ)

| テストID | 概要 | 閾値 |
|----------|------|------|
| PER-001 | 初期ロード時間 | < 3秒 |
| PER-002 | 大規模図表レンダリング | 500要素 < 5秒 |
| PER-003 | リアルタイム同期速度 | < 100ms |
| PER-004 | メモリ使用量 | リークなし |

### SEC: セキュリティテスト (4シナリオ)

| テストID | 概要 | 検証内容 |
|----------|------|----------|
| SEC-001 | XSS脆弱性テスト | スクリプト無効化 |
| SEC-002 | CSRF対策テスト | トークン検証 |
| SEC-003 | 入力検証テスト | サニタイゼーション |
| SEC-004 | 認証・認可テスト | アクセス制限 |

## 🐳 Docker使用

### Docker Composeでの実行

```bash
# フル機能でのテスト実行
docker-compose up --build

# 軽量版での実行
docker-compose -f docker-compose.test.yml up --build

# バックグラウンド実行
docker-compose up -d

# ログの確認
docker-compose logs -f playwright

# 環境のクリーンアップ
docker-compose down -v
```

### Dockerイメージのビルド

```bash
# 標準イメージのビルド
docker build -t plantuml-e2e:latest .

# 最適化イメージのビルド
docker build -f Dockerfile.optimized -t plantuml-e2e:optimized .

# CI用イメージのビルド
docker build -f Dockerfile.optimized --target ci -t plantuml-e2e:ci .
```

### Docker環境での開発

```bash
# コンテナ内でのシェルアクセス
docker-compose run --rm playwright bash

# テスト結果の取得
docker cp plantuml-e2e-playwright:/app/test-results ./local-results

# リアルタイムファイル同期での開発
docker-compose -f docker-compose.dev.yml up
```

## 🔄 CI/CD統合

### GitHub Actions

テストは以下の条件で自動実行されます：

- **プルリクエスト**: `main`, `develop`ブランチへのPR
- **プッシュ**: `feature/sprint2-*`ブランチへのプッシュ
- **スケジュール**: 毎日午前2時（JST）
- **手動実行**: GitHub Actions UIから

### ワークフロー例

```yaml
# 手動実行での特定テスト指定
name: Custom E2E Test
on:
  workflow_dispatch:
    inputs:
      test_suite:
        description: 'Test suite'
        required: true
        default: 'basic'
        type: choice
        options: [basic, editor, performance, security]
```

### CI環境での最適化

```bash
# CI用の高速実行
CI=true npm run test:e2e:ci

# 並列実行数の制限
PLAYWRIGHT_WORKERS=2 npm run test:e2e

# ヘッドレスモードの強制
PLAYWRIGHT_HEADLESS=true npm run test:e2e
```

## 📈 レポートとメトリクス

### テストレポートの確認

```bash
# HTMLレポートの表示
npm run report:generate

# Allureレポートの生成
npm run report:allure

# Allureレポートのサーブ
npm run report:serve
```

### レポートの場所

- **HTML**: `reports/html/index.html`
- **JSON**: `reports/json/test-results.json`
- **JUnit**: `reports/junit/results.xml`
- **Allure**: `reports/allure-reports/`

### パフォーマンスメトリクス

テスト実行時に以下のメトリクスが収集されます：

- 初期ロード時間
- DOM ContentLoaded時間
- First Paint / First Contentful Paint
- JavaScript実行時間
- メモリ使用量
- ネットワーク使用量

## 🔧 トラブルシューティング

### よくある問題と解決策

#### 1. ブラウザのインストール失敗

```bash
# 権限の問題の場合
sudo npx playwright install-deps

# 特定ブラウザのみインストール
npx playwright install chromium

# システム依存関係の手動インストール（Ubuntu）
sudo apt-get update
sudo apt-get install -y fonts-liberation fonts-noto-cjk
```

#### 2. テスト実行時のタイムアウト

```bash
# タイムアウト時間の延長
PLAYWRIGHT_TIMEOUT=60000 npm run test:e2e

# 特定のテストのタイムアウト延長
npx playwright test --timeout=60000
```

#### 3. メモリ不足エラー

```bash
# Node.jsメモリ制限の拡張
NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e

# 並列実行数の削減
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```

#### 4. Dockerでのポート競合

```bash
# 別ポートでの実行
BASE_URL=http://localhost:8087 docker-compose up

# 使用中のポートの確認
netstat -tlnp | grep :8086
```

#### 5. 日本語文字化け

```bash
# ロケールの設定
export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8

# Dockerでのロケール設定確認
docker-compose run --rm playwright locale
```

### デバッグ手法

#### 1. スクリーンショット付きデバッグ

```bash
# 失敗時のスクリーンショット有効化
PLAYWRIGHT_SCREENSHOT=true npm run test:e2e
```

#### 2. 詳細ログの出力

```bash
# デバッグログの有効化
DEBUG=pw:api npm run test:e2e

# Playwrightトレースの有効化
PLAYWRIGHT_TRACE=on npm run test:e2e
```

#### 3. テストの段階実行

```bash
# 特定のテストのみ実行
npx playwright test --grep "BAS-001"

# 失敗したテストのみ再実行
npx playwright test --last-failed
```

### ヘルスチェック

```bash
# 環境の詳細チェック
npm run test:health-check

# 個別コンポーネントのチェック
node utils/health-check.js --component=application
node utils/health-check.js --component=browsers
node utils/health-check.js --component=network
```

## 📚 参考資料

### 公式ドキュメント

- [Playwright Documentation](https://playwright.dev/)
- [PlantUML Reference](https://plantuml.com/)
- [Docker Documentation](https://docs.docker.com/)

### プロジェクト内資料

- `playwright.config.js` - Playwright設定
- `package.json` - NPMスクリプト定義
- `fixtures/` - テストデータ
- `page-objects/` - ページオブジェクトモデル
- `utils/` - ユーティリティツール

### 開発ガイド

新しいテストシナリオの追加方法や、カスタムページオブジェクトの作成方法については、各ディレクトリ内のREADMEファイルを参照してください。

## 📞 サポート

問題が発生した場合は、以下の手順で報告してください：

1. `npm run test:health-check`でヘルスチェック実行
2. エラーログの収集
3. 環境情報の記録（OS、Node.js version、Docker version等）
4. GitHub Issuesでの報告

---

**更新日**: 2025-08-16  
**バージョン**: 2.0.0  
**担当**: PlantUML Editor Test Team