# PlantUML プロジェクト 統合テスト環境

ClaudeCodeActions & GitHub Issues統合対応の包括的テスト環境

## 📋 概要

このテスト環境は、PlantUMLプロジェクトの品質保証を目的とした統合テストシステムです。Claude Code Actions及びGitHub Issuesとの統合機能を含む、包括的なテスト戦略を実装しています。

### 🎯 主要機能

- **統合テストフレームワーク**: 複数のテストスイートを統合実行
- **ClaudeCodeActions統合**: AI駆動のコード品質分析
- **GitHub Issues連携**: 自動Issue作成とラベル管理
- **Worktree環境テスト**: 複数ブランチでの並行テスト実行
- **カバレッジ統合**: 複数ソースからの統合カバレッジレポート
- **自動化パイプライン**: CI/CD環境での自動実行

## 📁 ディレクトリ構造

```
tests/
├── README.md                              # このファイル
├── integration/                           # 統合テストフレームワーク
│   ├── test-framework.config.js          # テストフレームワーク設定
│   └── test-orchestrator.js              # テストオーケストレーター
├── claudecodeactions/                     # ClaudeCodeActions統合テスト
│   └── claude-integration.test.js        # Claude統合テスト
├── github-issues/                         # GitHub Issues統合テスト
│   └── github-integration.test.js        # GitHub統合テスト
├── worktree/                             # Worktree環境テスト
│   └── worktree-test-strategy.js         # Worktreeテスト戦略
├── coverage-reports/                      # カバレッジレポート統合
│   └── coverage-integration.js           # カバレッジ統合システム
├── scripts/                              # 実行スクリプト
│   ├── run-all-tests.sh                  # 統合テスト実行スクリプト
│   └── automated-test-pipeline.js        # 自動化パイプライン
├── e2e/                                  # E2Eテスト（別途設定）
├── reports/                              # テストレポート出力
└── logs/                                 # 実行ログ
```

## 🚀 クイックスタート

### 1. 前提条件

- Node.js 18.x以上
- npm 8.x以上
- Git 2.x以上
- Docker（E2Eテスト実行時）

### 2. 基本的な実行

```bash
# 全テスト実行
./tests/scripts/run-all-tests.sh

# 単体テストのみ
./tests/scripts/run-all-tests.sh --unit-only

# カバレッジレポート付き
./tests/scripts/run-all-tests.sh --coverage

# 並列実行
./tests/scripts/run-all-tests.sh --parallel
```

### 3. JavaScript APIでの実行

```javascript
const TestOrchestrator = require('./tests/integration/test-orchestrator');

const orchestrator = new TestOrchestrator();
orchestrator.runAllTests({
  unit: true,
  integration: true,
  e2e: false,  // E2Eテストをスキップ
  claudeCodeActions: true,
  githubIssues: true
}).then(result => {
  console.log('テスト完了:', result.success);
}).catch(error => {
  console.error('テスト失敗:', error);
});
```

## 📊 テストスイート詳細

### 1. 単体テスト (Unit Tests)

**対象**: `jp2plantuml/src/` 内の個別モジュール

**実行方法**:
```bash
cd jp2plantuml
npm run test:unit
npm run test:coverage  # カバレッジ付き
```

**設定ファイル**: `jp2plantuml/jest.config.js`

**カバレッジ目標**:
- 文: 85%以上
- 分岐: 80%以上
- 関数: 85%以上
- 行: 85%以上

### 2. 統合テスト (Integration Tests)

**対象**: モジュール間の連携、API動作

**実行方法**:
```bash
cd jp2plantuml
npm run test:integration
```

**主要テスト項目**:
- API エンドポイント動作確認
- データ変換パイプライン
- 外部サービス連携（Kroki API）

### 3. E2Eテスト (End-to-End Tests)

**対象**: ブラウザでの実際のユーザー操作

**実行方法**:
```bash
# Docker環境推奨
cd PlantUML_Editor_Proto/E2Eテスト
docker-compose run --rm playwright npm test
```

**主要テスト項目**:
- 日本語入力からPlantUML生成
- 図の表示とダウンロード
- エラーハンドリング

### 4. ClaudeCodeActions統合テスト

**対象**: AI駆動のコード品質分析機能

**実行方法**:
```javascript
const ClaudeIntegration = require('./tests/claudecodeactions/claude-integration.test');
// Jest環境で実行
```

**主要テスト項目**:
- AI Code Analysis機能
- 自動プルリクエストレビュー
- 日本語Issue自動分析
- 統合品質ゲート

**必要な環境変数**:
```bash
export CLAUDE_API_ENDPOINT=https://api.anthropic.com
export CLAUDE_WEBHOOK_URL=https://your-webhook-url
```

### 5. GitHub Issues統合テスト

**対象**: GitHub Issues自動管理機能

**実行方法**:
```javascript
const GitHubIntegration = require('./tests/github-issues/github-integration.test');
// Jest環境で実行
```

**主要テスト項目**:
- Issue自動作成
- 日本語Issue自動分析
- Webhook統合
- ラベル自動管理
- プロジェクト管理統合

**必要な環境変数**:
```bash
export GITHUB_TOKEN=ghp_your_token
export GITHUB_OWNER=your-username
export GITHUB_REPO=PlantUML
```

### 6. Worktreeテスト

**対象**: 複数ブランチでの並行テスト実行

**実行方法**:
```bash
./tests/scripts/run-all-tests.sh --worktree
```

**主要機能**:
- 複数ブランチでの同時テスト実行
- ブランチ固有のテスト戦略
- 環境分離とリソース管理

## 🔧 設定とカスタマイズ

### テストフレームワーク設定

**ファイル**: `tests/integration/test-framework.config.js`

```javascript
const FRAMEWORK_CONFIG = {
  // 環境設定
  environments: {
    local: {
      baseUrl: 'http://localhost:8086',
      apiUrl: 'http://localhost:8086/api'
    },
    ci: {
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8086',
      headless: true
    }
  },
  
  // ClaudeCodeActions設定
  claudeCodeActions: {
    enabled: true,
    validationRules: {
      codeQuality: {
        minCoverage: 85,
        maxComplexity: 10
      }
    }
  },
  
  // GitHub統合設定
  githubIntegration: {
    enabled: true,
    repository: process.env.GITHUB_REPOSITORY || 'PlantUML',
    labels: {
      autoTest: 'automated-test',
      bugReport: 'bug'
    }
  }
};
```

### カバレッジ設定

**ファイル**: `tests/coverage-reports/coverage-integration.js`

```javascript
const COVERAGE_CONFIG = {
  // カバレッジ目標値
  thresholds: {
    global: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    }
  },
  
  // 出力形式
  reportFormats: ['html', 'json', 'lcov', 'text'],
  
  // 外部サービス統合
  integration: {
    codecov: {
      enabled: process.env.CODECOV_TOKEN !== undefined
    }
  }
};
```

## 📈 レポートと分析

### 1. HTMLレポート

**場所**: `tests/reports/`
**内容**: 
- テスト実行結果サマリー
- カバレッジ詳細
- パフォーマンス指標
- エラー詳細

### 2. JSONレポート

**場所**: `tests/reports/`
**用途**: CI/CD連携、API統合

### 3. カバレッジレポート

**場所**: `tests/coverage-reports/`
**形式**: HTML、LCOV、JSON、XML

### 4.実行ログ

**場所**: `tests/logs/`
**形式**: タイムスタンプ付き詳細ログ

## 🔄 CI/CD 統合

### GitHub Actions設定例

```yaml
name: Comprehensive Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run all tests
        run: ./tests/scripts/run-all-tests.sh --coverage --parallel
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./tests/coverage-reports
```

### Docker統合

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-runner:
    build: .
    environment:
      - NODE_ENV=test
      - CI=true
    volumes:
      - ./tests:/app/tests
    command: ./tests/scripts/run-all-tests.sh --coverage
```

## 🛠️ トラブルシューティング

### よくある問題

#### 1. E2Eテストが失敗する

**原因**: アプリケーションサーバーが起動していない
**解決策**:
```bash
cd jp2plantuml
npm start &
# テスト実行後
pkill -f "node.*server.js"
```

#### 2. Worktreeテストが失敗する

**原因**: Git worktree権限不足
**解決策**:
```bash
git config --global safe.directory '*'
# または特定のディレクトリを許可
git config --global --add safe.directory /path/to/project
```

#### 3. Claude統合テストが失敗する

**原因**: API認証情報未設定
**解決策**:
```bash
export CLAUDE_API_ENDPOINT=https://api.anthropic.com
export CLAUDE_WEBHOOK_URL=https://your-webhook.url
```

#### 4. カバレッジレポート生成失敗

**原因**: テスト実行前にカバレッジデータが存在しない
**解決策**:
```bash
# まず単体テストでカバレッジ生成
npm run test:coverage
# その後統合カバレッジ実行
node tests/coverage-reports/coverage-integration.js
```

### デバッグモード

```bash
# 詳細ログ出力
./tests/scripts/run-all-tests.sh --verbose

# ドライラン（実際の実行なし）
./tests/scripts/run-all-tests.sh --dry-run

# 特定のテストのみ実行
./tests/scripts/run-all-tests.sh --claude-only --verbose
```

## 📝 開発ガイドライン

### 新しいテストの追加

1. **適切なディレクトリにテストファイルを作成**
   ```
   tests/new-feature/new-feature.test.js
   ```

2. **テストオーケストレーターに統合**
   ```javascript
   // tests/integration/test-orchestrator.js
   async runNewFeatureTests() {
     // 新機能テスト実行ロジック
   }
   ```

3. **実行スクリプトに追加**
   ```bash
   # tests/scripts/run-all-tests.sh
   run_new_feature_tests() {
     # 実行ロジック
   }
   ```

### テスト品質基準

- **単体テスト**: 個別機能の動作確認
- **統合テスト**: モジュール間連携の確認
- **E2Eテスト**: ユーザー視点での動作確認
- **パフォーマンステスト**: 性能要件の確認
- **セキュリティテスト**: 脆弱性の確認

### コード品質基準

- **テストカバレッジ**: 85%以上
- **テスト実行時間**: 単体テスト5分以内、全体30分以内
- **信頼性**: フレイキーテスト率2%以下
- **保守性**: 明確な命名、適切なコメント

## 🤝 貢献ガイド

### プルリクエスト時のテスト実行

1. **ローカルでの事前確認**
   ```bash
   ./tests/scripts/run-all-tests.sh --coverage
   ```

2. **テスト追加時**
   - 対応する単体テストを追加
   - 統合テストが必要かを検討
   - カバレッジ基準を満たすことを確認

3. **ドキュメント更新**
   - 新機能のテスト方法を記載
   - 設定変更がある場合は更新

### レビュー観点

- [ ] テストが適切に追加されている
- [ ] テストがpass している
- [ ] カバレッジが基準を満たしている
- [ ] パフォーマンスに影響がない
- [ ] セキュリティに問題がない

## 📞 サポート

### 問い合わせ先

- **GitHub Issues**: 技術的な問題、バグレポート
- **GitHub Discussions**: 質問、提案、情報共有

### 有用なリンク

- [Jest公式ドキュメント](https://jestjs.io/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [GitHub API v4ドキュメント](https://docs.github.com/en/graphql)
- [Claude API ドキュメント](https://docs.anthropic.com/)

---

**最終更新**: 2025年8月13日  
**バージョン**: 1.0.0  
**担当**: AI-Driven Test Automation Specialist