# PlantUML統合テスト環境ガイド

## 概要

PlantUMLプロジェクトの包括的な統合テスト環境へようこそ。この環境は、以下の要求事項を満たしています：

- ✅ テストカバレッジ80%以上を達成
- ✅ 並行テスト実行（2ワーカー）
- ✅ Playwright MCPを活用したブラウザテスト
- ✅ CI/CDパイプラインとの完全統合
- ✅ 日本語対応のテストレポート

## テスト構成

### 1. ユニットテスト（Jest）
```bash
# jp2plantumlディレクトリ - 126個のテスト
npm run test:unit
npm run test:unit:coverage
```

### 2. 統合テスト（Jest）
```bash
# API統合、MCP統合、ワークフロー統合
npm run test:integration
```

### 3. E2Eテスト（Playwright）
```bash
# 基本フロー、変換機能、エラーハンドリング
npm run test:e2e
npm run test:e2e:smoke      # スモークテスト
npm run test:e2e:critical   # クリティカルテスト
npm run test:e2e:mcp-integration  # MCP統合テスト
```

### 4. パフォーマンステスト
```bash
# API応答時間、負荷テスト、メモリ使用量
npm run test:integration:performance
```

## 統合テストランナー

### 基本実行
```bash
# 統合テスト自動実行
npm run test:integration:runner

# カバレッジレポート生成
npm run test:integration:coverage

# パフォーマンステスト実行
npm run test:integration:performance

# 全ての統合テストを実行
npm run test:integration:all
```

### 環境変数設定
```bash
# 並行ワーカー数
export PARALLEL_WORKERS=2

# カバレッジ閾値
export COVERAGE_THRESHOLD=80

# テスト対象URL
export BASE_URL=http://localhost:8086

# MCP統合を有効化
export MCP_INTEGRATION=true

# CI環境フラグ
export CI=true

# デバッグモード
export DEBUG=true
```

## ファイル構成

### 設定ファイル
- `jest.config.integration.js` - Jest統合テスト設定
- `playwright.config.integration.js` - Playwright E2E設定
- `test-utils/setup.js` - 共通テストセットアップ

### テスト自動化スクリプト
- `scripts/run-tests.js` - 統合テストランナー
- `scripts/coverage-report.js` - カバレッジレポート生成
- `scripts/performance-test.js` - パフォーマンステスト

### E2Eテストファイル
```
tests/e2e/
├── smoke/
│   └── basic-flow.spec.js       # 基本フロー
├── critical/
│   ├── conversion.spec.js       # 変換機能
│   └── error-handling.spec.js   # エラーハンドリング
├── compatibility/               # ブラウザ互換性
├── mobile/                      # モバイルテスト
└── performance/                 # パフォーマンステスト
```

### 統合テストファイル
```
tests/integration/
├── api.test.js                  # API統合テスト
├── mcp.test.js                  # MCP統合テスト
└── workflow.test.js             # ワークフロー統合テスト
```

### カスタムレポーター
- `test-utils/japanese-reporter.js` - Jest日本語レポーター
- `test-utils/japanese-playwright-reporter.js` - Playwright日本語レポーター

## テスト実行例

### 1. 開発環境での基本テスト
```bash
# 依存関係のインストール
npm run setup

# 基本的なスモークテストを実行
npm run test:e2e:smoke

# ユニットテストとカバレッジ
npm run test:unit:coverage
```

### 2. CI/CD環境での完全テスト
```bash
# 全てのテストタイプを実行
export CI=true
export COVERAGE_THRESHOLD=80
export PARALLEL_WORKERS=2

npm run test:integration:all
npm run test:e2e
```

### 3. 特定機能のテスト
```bash
# 変換機能のみテスト
npm run test:e2e:critical

# API統合のみテスト
npx jest tests/integration/api.test.js

# パフォーマンステストのみ
npm run test:integration:performance
```

## レポート出力

### 自動生成されるレポート
- `test-results/integration-test-report.json` - 統合テスト結果（JSON）
- `test-results/integration-test-report.md` - 統合テスト結果（Markdown）
- `test-results/playwright-results-ja.json` - E2Eテスト結果（JSON）
- `test-results/playwright-results-ja.md` - E2Eテスト結果（Markdown）
- `coverage/combined/index.html` - カバレッジレポート（HTML）
- `coverage/combined/coverage-report.md` - カバレッジレポート（Markdown）

### レポートの確認
```bash
# カバレッジレポートをブラウザで開く
npm run coverage:open

# テスト結果ディレクトリを確認
ls -la test-results/
```

## 品質メトリクス

### カバレッジ要件
- **ステートメント**: 80%以上
- **ブランチ**: 80%以上
- **関数**: 80%以上
- **行**: 80%以上

### パフォーマンス要件
- **API応答時間**: 5秒以内
- **E2E操作**: 30秒以内
- **並行処理**: 2ワーカーで効率的実行

### 品質基準
- **成功率**: 95%以上
- **安定性**: フレーキーテスト0%
- **互換性**: Chrome、Firefox、Edge対応

## トラブルシューティング

### よくある問題

#### 1. サーバー起動エラー
```bash
# ポート8086が使用中の場合
export TEST_PORT=8087
npm run test:integration:runner
```

#### 2. Playwright依存関係エラー
```bash
# ブラウザの再インストール
npm run playwright:install
```

#### 3. MCPテストのスキップ
```bash
# MCP統合を有効化
export MCP_INTEGRATION=true
npm run test:e2e:mcp-integration
```

#### 4. カバレッジ閾値エラー
```bash
# 閾値を一時的に下げる
export COVERAGE_THRESHOLD=70
npm run test:integration:coverage
```

### ログレベルの調整
```bash
# デバッグログを有効化
export DEBUG=true
npm run test:integration:runner

# 詳細出力を有効化
npm run test:all -- --verbose
```

## CI/CD統合

### GitHub Actions
CI/CDパイプラインは `.github/workflows/ci-cd.yml` で定義されており、以下の流れで実行されます：

1. **品質チェック** - ESLint、Prettier
2. **統合テストスイート** - ユニット、統合、パフォーマンス（並行実行）
3. **E2Eテスト** - 複数ブラウザ、複数テストタイプ（並行実行）
4. **ビルド** - Docker化、アーティファクト生成
5. **デプロイ** - 本番環境への自動デプロイ

### 環境変数設定
CI/CD環境では以下の環境変数が設定されます：
- `NODE_VERSION=20.x`
- `COVERAGE_THRESHOLD=80`
- `PARALLEL_WORKERS=2`
- `MCP_INTEGRATION=true`

## ベストプラクティス

### テスト実行前
1. 依存関係の最新化: `npm run update:deps`
2. 環境のクリーンアップ: `npm run clean`
3. 完全セットアップ: `npm run setup`

### テスト実行中
1. 並行実行数の調整（リソースに応じて）
2. タイムアウト値の適切な設定
3. 失敗時の詳細ログ確認

### テスト実行後
1. カバレッジレポートの確認
2. 失敗テストの分析
3. パフォーマンス指標の確認

## 開発ワークフロー

### 新機能開発時
```bash
# 1. 機能開発
git checkout -b feature/new-feature

# 2. ユニットテスト作成・実行
npm run test:unit

# 3. 統合テスト実行
npm run test:integration

# 4. E2Eテスト実行
npm run test:e2e:smoke

# 5. 全体テスト実行
npm run test:integration:all
```

### バグ修正時
```bash
# 1. 再現テストの作成
# 2. バグ修正
# 3. テスト実行で確認
npm run test:integration:runner

# 4. リグレッションテスト
npm run test:e2e:critical
```

## サポート

### ドキュメント
- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
- [Playwright公式ドキュメント](https://playwright.dev/docs/intro)
- [Claude Code公式ドキュメント](https://docs.anthropic.com/en/docs/claude-code)

### プロジェクト固有
- `CLAUDE.md` - プロジェクトガイド
- `CONTRIBUTING.md` - 貢献ガイドライン
- `README.md` - プロジェクト概要

---

**注意**: このテスト環境は実践的で実装可能な設計となっており、実際のプロジェクトですぐに使用できます。テスト実行前には必ず環境変数と依存関係を確認してください。