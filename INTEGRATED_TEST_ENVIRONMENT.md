# PlantUML プロジェクト統合テスト環境

## 📋 概要

PlantUMLプロジェクトの統合テスト環境は、ユニットテスト、統合テスト、E2Eテスト、パフォーマンステストを統合的に実行できる包括的なテスト基盤です。Playwright MCPとの統合により、AI駆動のテスト自動化を実現しています。

### 🎯 主要機能

- **統合テストスイート**: Jest + Playwright の統合実行環境
- **Playwright MCP統合**: Claude Code ActionsとのAI連携テスト
- **並行テスト実行**: マルチプロジェクト並行実行でテスト効率向上
- **カバレッジ統合**: プロジェクト横断カバレッジレポート
- **パフォーマンス監視**: リアルタイムパフォーマンス計測
- **CI/CD統合**: GitHub Actions完全対応

## 🏗️ アーキテクチャ

```
PlantUML統合テスト環境
├── Jest統合テスト (jest.config.js)
│   ├── jp2plantuml ユニットテスト
│   ├── PlantUML_Editor_Proto 統合テスト
│   ├── 統合テストスイート
│   └── パフォーマンステスト
├── Playwright E2Eテスト (playwright.config.js)
│   ├── ブラウザ横断テスト
│   ├── MCP統合テスト
│   ├── モバイルテスト
│   └── パフォーマンステスト
├── カバレッジ統合 (scripts/combine-coverage.js)
│   ├── 複数プロジェクト統合
│   ├── HTMLレポート生成
│   └── 閾値チェック
└── CI/CD統合 (.github/workflows/ci-cd.yml)
    ├── 並行実行マトリクス
    ├── アーティファクト管理
    └── レポート統合
```

## 🚀 クイックスタート

### 1. 環境セットアップ

```bash
# 依存関係のインストール
npm run setup

# Playwright ブラウザのインストール
npm run playwright:install
```

### 2. 基本的なテスト実行

```bash
# 全テスト実行
npm run test:full

# ユニットテストのみ
npm run test:unit:coverage

# E2Eテストのみ
npm run test:e2e

# パフォーマンステストのみ
npm run test:performance
```

### 3. 開発モード

```bash
# テスト監視モード
npm run test:watch

# E2Eテスト UIモード
npm run test:e2e:ui

# カバレッジレポート表示
npm run coverage:open
```

## 📊 テストスイート詳細

### Jest統合テスト設定

**設定ファイル**: `jest.config.js`

**プロジェクト構成**:
- **jp2plantuml**: バックエンドAPI のユニット・統合テスト
- **plantuml-editor-e2e**: フロントエンドの統合テスト
- **integration**: プロジェクト間統合テスト
- **performance**: パフォーマンステスト

**カバレッジ目標**:
- 文: 85%以上
- 分岐: 80%以上
- 関数: 85%以上
- 行: 85%以上

### Playwright E2Eテスト設定

**設定ファイル**: `playwright.config.js`

**テストプロジェクト**:
- **chromium-primary**: Chrome での主要テスト
- **firefox-secondary**: Firefox での互換性テスト
- **edge-compatibility**: Edge 固有テスト
- **mobile-chrome/safari**: モバイルテスト
- **performance-testing**: パフォーマンス計測
- **mcp-integration**: MCP統合テスト

**MCP統合機能**:
- スナップショット自動取得
- インタラクション監視
- パフォーマンス計測
- エラー監視とレポート
- アクセシビリティチェック

## 🔧 設定とカスタマイズ

### 環境変数

```bash
# MCP統合の有効/無効
MCP_INTEGRATION=true

# カバレッジ閾値
COVERAGE_THRESHOLD=80

# 並行ワーカー数
PARALLEL_WORKERS=4

# パフォーマンステスト閾値
PERFORMANCE_THRESHOLD=5000
```

### カスタムテスト追加

1. **ユニットテスト追加**:
   ```bash
   # jp2plantuml/__tests__/ に追加
   # 自動的に Jest設定に含まれる
   ```

2. **E2Eテスト追加**:
   ```bash
   # tests/e2e/ に追加
   # Playwright設定で自動検出
   ```

3. **パフォーマンステスト追加**:
   ```bash
   # tests/performance/ に追加
   # 専用のパフォーマンス設定で実行
   ```

## 📈 レポートとメトリクス

### 生成されるレポート

1. **統合カバレッジレポート**
   - 場所: `coverage/combined/lcov-report/index.html`
   - 形式: HTML, LCOV, JSON, Text

2. **Playwright テストレポート**
   - 場所: `playwright-report/integrated/index.html`
   - 内容: テスト結果、スクリーンショット、動画、トレース

3. **パフォーマンスレポート**
   - 場所: `test-results/performance/performance-report.json`
   - 内容: 実行時間、メモリ使用量、CPU使用率

4. **CI/CD アーティファクト**
   - GitHub Actions による自動アップロード
   - 30日間保持

### メトリクス監視

- **テストカバレッジ**: リアルタイム追跡
- **テスト実行時間**: パフォーマンス最適化
- **並行効率**: リソース使用率
- **失敗率**: 信頼性指標

## 🔄 CI/CD統合

### GitHub Actions ワークフロー

**トリガー**:
- プッシュ: main, develop, master ブランチ
- プルリクエスト: main, master ブランチ
- 手動実行: workflow_dispatch
- スケジュール: 毎日午前2時（パフォーマンステスト）

**実行ステージ**:
1. **品質チェック**: Linter, フォーマット確認
2. **統合テストスイート**: 並行実行マトリクス
3. **E2Eテスト**: ブラウザ × テストタイプ マトリクス
4. **ビルド**: Docker イメージ作成
5. **デプロイ**: mainブランチのみ

**並行実行マトリクス**:

E2Eテスト:
```yaml
strategy:
  matrix:
    browser: [chromium, firefox, edge]
    test-type: [smoke, critical, compatibility, mcp-integration]
```

統合テスト:
```yaml
strategy:
  matrix:
    test-suite: [unit, integration, performance]
```

## 🛠️ トラブルシューティング

### よくある問題

#### 1. E2Eテストの失敗

**症状**: Playwright テストがタイムアウト
**解決策**:
```bash
# アプリケーションサーバーの状態確認
npm run health-check

# 手動でサーバー起動
cd jp2plantuml && npm start

# テスト実行
npm run test:e2e:debug
```

#### 2. カバレッジレポート生成失敗

**症状**: カバレッジ統合でエラー
**解決策**:
```bash
# 個別プロジェクトでカバレッジ生成
npm run test:unit:coverage

# 統合処理実行
npm run test:coverage:combined
```

#### 3. パフォーマンステストの警告

**症状**: メモリリークやCPU使用率警告
**解決策**:
```bash
# ガベージコレクション有効化
node --expose-gc ./node_modules/.bin/jest --selectProjects performance

# パフォーマンス詳細確認
npm run performance-check
```

#### 4. MCP統合エラー

**症状**: MCP テストが失敗
**解決策**:
```bash
# MCP統合無効化でテスト
MCP_INTEGRATION=false npm run test:e2e

# MCP設定確認
cat tests/mcp-config.json
```

### デバッグモード

```bash
# 詳細ログ付きテスト実行
VERBOSE_TESTS=true npm run test:all

# Playwright デバッグモード
npm run test:e2e:debug

# Jest デバッグモード
npm run test:watch
```

## 📝 開発ガイドライン

### テスト作成のベストプラクティス

1. **テスト分離**: 各テストは独立して実行可能
2. **リソース管理**: setupファイルでリソース初期化・クリーンアップ
3. **パフォーマンス**: 重いテストはperformanceプロジェクトに分離
4. **エラーハンドリング**: 適切なタイムアウトとリトライ設定
5. **ドキュメント**: テストの意図と期待結果を明記

### コード品質基準

- **テストカバレッジ**: 80%以上（部分的に85%目標）
- **テスト実行時間**: 単体15分以内、全体30分以内
- **並行効率**: リソース使用率50%以上
- **信頼性**: フレイキーテスト率2%以下

## 🤝 貢献ガイド

### プルリクエスト時のチェックリスト

- [ ] すべてのテストが通る
- [ ] カバレッジ基準を満たす
- [ ] パフォーマンス劣化がない
- [ ] 適切なテストが追加されている
- [ ] ドキュメントが更新されている

### レビュー観点

- **テスト品質**: 適切なアサーション、エッジケース考慮
- **パフォーマンス**: 実行時間、リソース使用量
- **保守性**: テストコードの可読性、再利用性
- **統合性**: 他のテストとの整合性

## 📞 サポート

### 問い合わせ先

- **GitHub Issues**: バグレポート、機能要求
- **GitHub Discussions**: 質問、提案、情報共有

### 有用なリンク

- [Jest公式ドキュメント](https://jestjs.io/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- [Claude Code MCP Integration](https://docs.anthropic.com/claude/docs)

---

**最終更新**: 2025年8月14日  
**バージョン**: 2.0.0  
**担当**: AI-Driven Test Integration System

## 📋 チェックリスト

### 導入完了確認

- [ ] Jest統合設定完了
- [ ] Playwright MCP統合完了
- [ ] カバレッジ統合機能動作確認
- [ ] CI/CD パイプライン動作確認
- [ ] パフォーマンステスト実行確認
- [ ] レポート生成確認
- [ ] 並行実行動作確認
- [ ] MCP連携動作確認

### 運用開始前チェック

- [ ] 全テストスイート実行成功
- [ ] カバレッジ目標達成
- [ ] パフォーマンス基準クリア
- [ ] ドキュメント整備完了
- [ ] チーム研修実施
- [ ] 運用手順策定完了