# PlantUML Editor E2E Tests - Phase 2

## 概要
Phase 2計画書に基づく拡張E2Eテストの実装とDockerを使用した実行環境。

## 新機能
- **CP-002〜CP-005の詳細テスト**: 計画書仕様に基づく厳密なテストケース
- **日本語エンコーディング対応**: 複雑な日本語文字列のテスト
- **条件分岐・ループ・並行処理**: PlantUML構文の詳細検証
- **Node.js v20対応**: 互換性問題の解決
- **Docker統合環境**: 本格的なCI/CD対応

## テストスイート構成

### 1. 基本テスト（既存）
- `critical-path.spec.js`: CP-001〜CP-010の基本機能
- `performance.spec.js`: パフォーマンス測定

### 2. 拡張テスト（新規）
- `critical-path-enhanced.spec.js`: Phase 2計画書準拠の詳細テスト

## 実行方法

### ローカル実行（推奨）
Node.js v22の互換性問題により、Docker環境での実行を推奨します。

### Docker環境での実行

#### 1. 単一テスト実行
```bash
# 拡張テスト（Chromium）
docker-compose -f docker-compose.test.yml up e2e-tests

# 全ブラウザテスト
docker-compose -f docker-compose.test.yml up e2e-tests-all

# パフォーマンステスト
docker-compose -f docker-compose.test.yml up performance-tests
```

#### 2. 個別テストケース実行
```bash
# CP-002のみ実行
docker-compose -f docker-compose.test.yml run --rm e2e-tests npm run test:cp002

# CP-003のみ実行
docker-compose -f docker-compose.test.yml run --rm e2e-tests npm run test:cp003

# CP-004のみ実行
docker-compose -f docker-compose.test.yml run --rm e2e-tests npm run test:cp004

# CP-005のみ実行
docker-compose -f docker-compose.test.yml run --rm e2e-tests npm run test:cp005
```

#### 3. 環境のクリーンアップ
```bash
docker-compose -f docker-compose.test.yml down -v
```

## テストケース詳細

### CP-002: PlantUMLコード編集と同期
- **CP-002-01**: 基本編集と同期機能
- **CP-002-02**: 日本語文字エンコーディング対応
  - 基本的な日本語
  - 複雑な日本語（特殊文字含む）
  - 英数字・記号混在

### CP-003: 条件分岐フロー作成
- **CP-003-01**: 基本的な条件分岐（alt/opt）
- **CP-003-02**: 複数パターンの条件分岐

### CP-004: ループ処理フロー
- **CP-004-01**: 基本的なループ構文
- **CP-004-02**: 多様なループパターン
  - 回数制限
  - 条件基準
  - タイムアウト設定

### CP-005: 並行処理フロー
- **CP-005-01**: 基本的な並行処理（par/else）
- **CP-005-02**: 複数ブランチ並行処理

### 統合テスト
- **CP-統合-01**: 複合シナリオ（条件分岐+ループ+並行処理）

### エラーハンドリング
- **エラーハンドリング-01**: 不正コード処理

## テスト結果の確認

### 1. レポート場所
- HTMLレポート: `playwright-report/index.html`
- JSONレポート: `test-results/results.json`
- スクリーンショット: `test-results/`

### 2. レポート表示
```bash
# HTMLレポートをブラウザで開く
docker-compose -f docker-compose.test.yml run --rm e2e-tests npm run report
```

## 環境要件

### Docker環境
- **Docker**: 20.10+
- **Docker Compose**: v2.0+
- **OS**: Windows 11, macOS, Linux

### コンテナ仕様
- **Base Image**: mcr.microsoft.com/playwright:v1.48.0-jammy
- **Node.js**: v20.18.0
- **Playwright**: v1.48.0
- **ブラウザ**: Chromium, Firefox, WebKit

## トラブルシューティング

### よくある問題

#### 1. Node.js v22互換性エラー
```
Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module
```
**解決策**: Docker環境を使用（Node.js v20で実行）

#### 2. アプリケーションサーバー接続エラー
```
Error: Cannot GET /
```
**解決策**: 
- `http://localhost:8086` でアプリが起動していることを確認
- `docker-compose.test.yml` の `app` サービスが正常に起動していることを確認

#### 3. プレビュー生成エラー
```
プレビュー生成エラー（API制限の可能性）
```
**対応**: Kroki.ioのAPI制限のため、コード生成のみ確認（正常動作）

## パフォーマンス基準

### 期待値
- **初期表示**: 3秒以内
- **アクター追加**: 3秒以内（6個）
- **プロセス追加**: 5秒以内（10個）
- **プレビュー生成**: 10秒以内
- **メモリ増加**: 50MB以内

### 測定方法
```bash
docker-compose -f docker-compose.test.yml up performance-tests
```

## CI/CD連携

### GitHub Actions設定例
```yaml
name: E2E Tests Phase 2
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Phase 2 E2E Tests
        run: |
          cd PlantUML_Editor_Proto/E2Eテスト
          docker-compose -f docker-compose.test.yml up --abort-on-container-exit e2e-tests-all
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: |
            PlantUML_Editor_Proto/E2Eテスト/test-results/
            PlantUML_Editor_Proto/E2Eテスト/playwright-report/
```

## 更新履歴
- **v1.0.0** (2025/08/13): Phase 2計画書準拠の初期実装
  - CP-002〜CP-005の詳細テスト実装
  - Docker環境統合
  - Node.js v20対応