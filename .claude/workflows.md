## 🚀 標準ワークフロー（4フェーズ統合アプローチ）

### Phase 1: 計画と設計 (Planning & Design)

#### 🎯 目標
要件の理解、技術選定、アーキテクチャ設計の完了

#### 📋 標準タスクフロー
```javascript
// Phase 1 実行例
TodoWrite([
  {id: "p1-1", content: "要件分析と技術調査", status: "pending"},
  {id: "p1-2", content: "アーキテクチャ設計", status: "pending"},
  {id: "p1-3", content: "技術スタック選定", status: "pending"},
  {id: "p1-4", content: "セキュリティ要件定義", status: "pending"},
  {id: "p1-5", content: "テスト戦略策定", status: "pending"}
])

// 専門エージェント活用
Task(
  description: "システム設計フェーズ",
  prompt: "要件を分析し、最適なアーキテクチャを設計",
  subagent_type: "ai-driven-app-architect"
)
```

#### 🔧 使用ツール・エージェント
- メインエージェント: `ai-driven-app-architect`
- 連携エージェント: `software-doc-writer`
- MCPサーバー: `context7` (技術調査), `fetch` (競合分析)
- 品質基準: セキュリティ要件100%、設計文書完備

### Phase 2: 実装 (Implementation)

#### 🎯 目標
コード実装、テスト作成、品質基準達成

#### 📋 標準タスクフロー
```javascript
// Phase 2 実行例
git worktree add ../project-feature-development feature/implementation

TodoWrite([
  {id: "p2-1", content: "環境セットアップ（Docker/MCP）", status: "pending"},
  {id: "p2-2", content: "フロントエンド実装", status: "pending"},
  {id: "p2-3", content: "バックエンドAPI実装", status: "pending"},
  {id: "p2-4", content: "ユニットテスト作成", status: "pending"},
  {id: "p2-5", content: "統合テスト実装", status: "pending"}
])

// 並列実装
[
  Task(description: "フロントエンド実装", subagent_type: "web-debug-specialist"),
  Task(description: "バックエンド実装", subagent_type: "general-purpose"),
  Task(description: "テスト実装", subagent_type: "webapp-test-automation")
]
```

#### 🔧 使用ツール・エージェント
- メインエージェント: `general-purpose`
- 連携エージェント: `web-debug-specialist`, `docker-dev-env-builder`
- MCPサーバー: `github` (コード管理), `ide` (品質チェック)
- 品質基準: テストカバレッジ > 80%, 循環的複雑度 < 10

### Phase 3: 品質保証 (Quality Assurance)

#### 🎯 目標
包括的テスト、セキュリティ検証、パフォーマンス最適化

#### 📋 標準タスクフロー
```javascript
// Phase 3 実行例
TodoWrite([
  {id: "p3-1", content: "E2Eテスト実行", status: "pending"},
  {id: "p3-2", content: "セキュリティスキャン", status: "pending"},
  {id: "p3-3", content: "パフォーマンステスト", status: "pending"},
  {id: "p3-4", content: "アクセシビリティチェック", status: "pending"},
  {id: "p3-5", content: "品質メトリクス検証", status: "pending"}
])

// 自動品質検証
mcp__playwright__browser_navigate(url: "http://localhost:3001")
mcp__playwright__browser_snapshot()
mcp__ide__getDiagnostics()

// 品質エージェント活用
Task(
  description: "包括的品質検証",
  prompt: "全品質基準の検証と改善提案",
  subagent_type: "webapp-test-automation"
)
```

#### 🔧 使用ツール・エージェント
- メインエージェント: `webapp-test-automation`
- 連携エージェント: `web-debug-specialist`
- MCPサーバー: `playwright` (E2Eテスト), `ide` (静的解析)
- 品質基準: 全メトリクス目標値達成、セキュリティ脆弱性0

### Phase 4: デプロイメント (Deployment)

#### 🎯 目標
本番環境へのデプロイ、監視設定、ドキュメント完成

#### 📋 標準タスクフロー
```javascript
// Phase 4 実行例
TodoWrite([
  {id: "p4-1", content: "本番環境準備", status: "pending"},
  {id: "p4-2", content: "CI/CDパイプライン設定", status: "pending"},
  {id: "p4-3", content: "監視・アラート設定", status: "pending"},
  {id: "p4-4", content: "ドキュメント最終化", status: "pending"},
  {id: "p4-5", content: "デプロイと検証", status: "pending"}
])

// Git統合ワークフロー
ClaudeCodeActions.performCodeReview({
  includeSecurityScan: true,
  includePerformanceAnalysis: true
})

ClaudeCodeActions.createPullRequest({
  title: "機能実装: 完全統合版",
  description: "全4フェーズを完了した高品質実装"
})
```

#### 🔧 使用ツール・エージェント
- メインエージェント: `docker-dev-env-builder`
- 連携エージェント: `dev-ticket-manager`, `software-doc-writer`
- ClaudeCodeActions: PR作成、コードレビュー
- 品質基準: デプロイ成功率100%, 文書化完備

### 🔄 フェーズ間連携

#### データ受け渡し
```javascript
const workflowData = {
  phase1: {
    architecture: "設計仕様書",
    techStack: "選定技術一覧",
    securityRequirements: "セキュリティ要件"
  },
  phase2: {
    codebase: "実装コード",
    tests: "テストスイート",
    metrics: "実装メトリクス"
  },
  phase3: {
    qualityReport: "品質検証結果",
    securityScan: "セキュリティスキャン結果",
    performanceMetrics: "パフォーマンス指標"
  },
  phase4: {
    deploymentConfig: "デプロイ設定",
    documentation: "完成ドキュメント",
    monitoringSetup: "監視設定"
  }
};
```

#### 品質ゲート
各フェーズ間に品質ゲートを設置し、基準未達の場合は前フェーズに戻る：

| フェーズ間 | 品質ゲート条件 | 未達時の対応 |
|----------|---------------|-------------|
| P1→P2 | 設計完成度100%, セキュリティ要件定義完了 | 設計見直し |
| P2→P3 | コード完成度100%, ユニットテスト全pass | 実装修正 |
| P3→P4 | 全品質メトリクス目標達成, E2Eテスト全pass | 品質改善 |
| P4→完了 | デプロイ成功, 監視正常, 文書完備 | デプロイ修正 |

### 作業フロー（5ツール統合）
1. ユーザーからのリクエスト受信
2. Git Worktreesで新しいワーキングディレクトリ作成
3. TodoWriteでタスクリスト作成
4. （サブエージェント関連は別章/agents定義を参照）
5. MCPサーバーで外部連携
6. ClaudeCodeActionsでGit操作・PR作成
7. TodoWriteでステータス更新
8. 結果を確認・検証
9. ユーザーに報告

# 標準ワークフロー（外出し）

非サブエージェント観点の4フェーズ詳細。CLIやサンプルはここに集約。

## Phase 1: 計画と設計
- 目的: 要件理解、技術選定、設計完了
- TodoWrite テンプレ、設計ドキュメント雛形 など

## Phase 2: 実装
- 目的: 実装/テスト作成/品質基準達成
- Worktrees でブランチ分離、MCP(ide/github) で診断

## Phase 3: 品質保証
- 目的: 包括テスト/セキュリティ/パフォーマンス
- Playwright/IDE MCP の最短レシピ

## Phase 4: デプロイメント
- 目的: 本番リリース/監視設定/文書完成
- ClaudeCodeActions でPR/レビュー

