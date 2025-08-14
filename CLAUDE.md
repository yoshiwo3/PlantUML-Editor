# CLAUDE.md - プロジェクトガイド（最適化版 v3.0）

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**🎯 Version 3.0 - Performance Optimized**
- サイズ最適化によりセッション安定性向上
- 詳細は外部ファイル参照で管理
- 重要な原則と要点のみ記載

## ⚠️ 最重要：必ず守るべき6原則

### 🔴 原則1: TodoWriteの積極的な使用
3ステップ以上の作業は必ずTodoWriteで管理

### 🔴 原則2: カスタムエージェントの積極的な使用  
下記の例を参考にTask toolからカスタムエージェントを呼び出してください

#### 方法1：：general-purposeタイプとして実行
```javascript
// カスタムエージェントを呼び出す正しい方法
await Task({
  description: "タスクの簡潔な説明",
  subagent_type: "general-purpose",  
  prompt: `
    # Role: [カスタムエージェント名]
    
    You are the [エージェント名] agent with the following configuration:
    - Name: [エージェント名]
    - Type: [専門分野]
    - Focus: [主要な責任領域]
    
    ## Your Task
    [具体的なタスク内容]
    
    ## Your Expertise
    [エージェントの専門知識リスト]
    
    ## Instructions
    [詳細な実行指示]
  `
});
```

#### 方法2：エージェント定義を活用した呼び出し

```javascript
// 1. まずエージェント定義を読み込む
const agentConfig = await Read({
  file_path: "C:\\d\\PlantUML\\.claude\\agents\\web-debug-specialist.md"
});

// 2. Task toolで実行
await Task({
  description: "Frontend Error Fix",
  subagent_type: "general-purpose",
  prompt: `
    ${agentConfig}  // エージェント定義を含める
    
    ## Specific Task
    [実行するタスクの詳細]
  `
});
```

#### 📝 実例：web-debug-specialistの呼び出し

```javascript
await Task({
  description: "STEP2 Error Fix",
  subagent_type: "general-purpose",  // 必須：システムタイプを指定
  prompt: `
    # Role: web-debug-specialist
    
    You are a frontend debugging specialist with expertise in:
    - JavaScript debugging and error analysis
    - DOM manipulation and event handling
    - Cross-browser compatibility
    - Performance optimization
    - UI/UX implementation
    
    ## Your Task
    Analyze and fix the PlantUML Editor STEP2 processing errors:
    1. PlantUMLParser initialization error
    2. getCurrentActors method not found
    3. Event handler context loss
    
    ## Technical Standards
    - Browser Support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
    - Performance: Lighthouse score >90
    - Accessibility: WCAG 2.1 AA compliance
    
    ## Required Output
    Create a comprehensive repair plan with:
    - Root cause analysis
    - Complete implementation code
    - Testing strategies
    - Performance optimization
    
    Apply your frontend expertise to solve these issues completely.
  `
});
```

#### 重要なポイント
1. **カスタムエージェント名は`subagent_type`として使用できない**
2. **エージェントの専門性はプロンプトで定義**
3. **エージェント定義ファイルの内容をプロンプトに含める**

### 🔴 原則3: ソース版管理（Git/GitHub）の毎回実施
コード修正完了時は即時にGitへコミット、可能ならpush→PR作成まで実施

### 🔴 原則4: MCPサーバーの積極的な使用
外部連携が可能な場合は必ずMCPを活用

### 🔴 原則5: ClaudeCodeActionsの積極的な使用
Git操作、PR作成、コードレビューはClaudeCodeActionsで実行

### 🔴 原則6: Git Worktreesの積極的な使用
並行開発、機能ブランチ管理は必ずGit Worktreesで実行

## 📚 詳細ドキュメント参照

### コア機能ガイド
- **TodoWrite詳細**: `.claude/todowrite.md`
- **MCP活用ガイド**: `.claude/mcp-guide.md`
- **ClaudeCodeActions**: `.claude/claudecodeactions.md`
- **Git Worktrees**: `.claude/worktrees.md`

### プロジェクト管理
- **ワークフロー**: `.claude/workflows.md`
- **統合パターン**: `.claude/integration.md`
- **品質メトリクス**: `.claude/metrics.md`
- **トラブルシューティング**: `.claude/troubleshooting.md`

### 開発ガイド
- **開発コマンド**: `.claude/dev-commands.md`
- **プロジェクト構造**: `.claude/project-structure.md`
- **デバッグレポート**: `.claude/debug-report.md`
- **PRDガイドライン**: `.claude/prd-guidelines.md`

## 🚀 開発作業の基本フロー

### 1. 環境準備
```bash
git worktree add ../PlantUML-feature-[機能名] feature/[機能名]
cd ../PlantUML-feature-[機能名]
```

### 2. タスク管理
3ステップ以上の作業は必ずTodoWriteで管理：
- pending → in_progress → completed
- 同時にin_progressは1つのみ
- 完了時は即座に更新

### 3. 実装
複雑な作業はカスタムエージェントに自動委譲：
- カスタムエージェント: 特定領域のタスク
- 詳細は `.claude/agents/` 参照

### 4. 品質保証
- MCP活用: Playwright、GitHub、Context7
- ClaudeCodeActions: 自動レビュー
- テスト実行: 必須

### 5. ソース版管理（Git）
```bash
git add . && git commit -m "type(scope): subject"
git push
# ClaudeCodeActionsでPR作成
```

#### 🧾 コミットメッセージ規約
形式: `type(scope): subject`
- type: feat, fix, docs, style, refactor, perf, test, ci, chore
- subject: 72字以内、命令形

## 🤖 利用可能なカスタムエージェント（概要）

| エージェント | 用途 | 詳細 |
|------------|------|------|
| main-orchestrator | メインワークフロー統括 | 複雑な処理の全体調整（opus） |
| agent-orchestrator | エージェント間調整 | 複数エージェントの連携管理（opus） |
| ai-driven-app-architect | システム設計 | アーキテクチャ専門 |
| webapp-test-automation | テスト自動化 | 品質保証専門 |
| web-debug-specialist | フロントエンド | UI/UX専門 |
| software-doc-writer | 技術文書 | ドキュメント専門 |
| dev-ticket-manager | プロジェクト管理 | タスク管理専門 |
| docker-dev-env-builder | 環境構築 | Docker専門 |
| mcp-server-setup-expert | MCP統合 | MCP設定専門 |
| claude-code-config-expert | Claude Code設定 | 環境設定専門 |
| subagent-developer | エージェント開発 | AI Agent設計・最適化専門 |

詳細仕様は `.claude/agents/` 参照

## 🔧 MCP活用（概要）

### 利用可能なMCPサーバー
- **GitHub**: `mcp__github__*` - リポジトリ操作
- **Playwright**: `mcp__playwright__*` - E2Eテスト
- **Context7**: `mcp__context7__*` - ドキュメント参照
- **Fetch**: `mcp__fetch__*` - Web情報取得

詳細は `.claude/mcp-guide.md` 参照

## 📋 TodoWrite必須使用ケース

1. **3ステップ以上の作業**
2. **計画書・設計書・仕様書作成／更新**
3. **機能実装**
4. **デバッグ作業**
5. **リファクタリング**
6. **テスト実装**

詳細は `.claude/todowrite.md` 参照

## プロジェクト概要

**日本語→PlantUML変換SPA**
- Docker化Node.js/Express + フロントエンド
- 環境: http://localhost:8086
- 詳細: `PRD_Ver1.0.md`

## 🧪 標準テスト環境定義

### Docker Playwright環境を標準テスト環境として採用

#### テスト種別定義

##### 1. 単体テスト（Unit Test）
- **目的**: 個々の関数・モジュールの動作検証
- **ツール**: Jest
- **対象**: 
  - PlantUMLParser.js - パーサー関数
  - バリデーション関数
  - ユーティリティ関数
- **ファイル命名**: `*.unit.test.js`
- **実行時間目標**: < 5秒

##### 2. 統合テスト（Integration Test）
- **目的**: 複数モジュールの連携動作検証
- **ツール**: Jest + Playwright
- **対象**:
  - API エンドポイント間の連携
  - フロントエンド-バックエンド通信
  - PlantUML変換フロー全体
- **ファイル命名**: `*.integration.test.js`
- **実行時間目標**: < 30秒

##### 3. E2Eテスト（End-to-End Test）
- **目的**: ユーザー視点での全機能検証
- **ツール**: Playwright
- **対象**:
  - 完全なユーザーシナリオ
  - クロスブラウザ動作
  - UI操作フロー
- **ファイル命名**: `*.e2e.test.js` または `*.spec.js`
- **実行時間目標**: < 2分

#### テスト実行マトリックス

| テスト種別 | カバレッジ目標 | 実行頻度 | ブラウザ |
|-----------|--------------|----------|----------|
| 単体テスト | 80%以上 | 各コミット | N/A |
| 統合テスト | 70%以上 | プルリクエスト | Chromium |
| E2Eテスト | 主要シナリオ100% | リリース前 | 全ブラウザ |

#### 標準コマンド
```bash
# すべてのテストはDockerで実行
docker-compose -f docker-compose.permanent.yml run --rm playwright npm test

# テスト種別ごとの実行
docker-compose run --rm playwright npm run test:unit    # 単体
docker-compose run --rm playwright npm run test:integration # 統合
docker-compose run --rm playwright npm run test:e2e     # E2E

# カバレッジレポート付き実行
docker-compose run --rm playwright npm run test:coverage

# 特定ブラウザでのE2Eテスト
docker-compose run --rm playwright npm run test:e2e:chromium
docker-compose run --rm playwright npm run test:e2e:firefox
docker-compose run --rm playwright npm run test:e2e:webkit
docker-compose run --rm playwright npm run test:e2e:edge
```

#### テストディレクトリ構造
```
tests/
├── unit/               # 単体テスト
│   ├── parser/        # パーサー関連
│   └── utils/         # ユーティリティ
├── integration/        # 統合テスト
│   ├── api/          # API連携
│   └── workflow/     # ワークフロー
└── e2e/               # E2Eテスト
    ├── scenarios/    # ユーザーシナリオ
    └── cross-browser/ # クロスブラウザ
```

#### 環境仕様
- **Node.js**: v20.18.0（固定）
- **Playwright**: v1.48.0
- **Jest**: v29.x
- **ブラウザ**: Chromium, Firefox, WebKit, MSEdge（永続化済み）
- **イメージ**: `plantuml-e2e-permanent:latest`

### Docker環境の利点
1. **再現性100%**: すべての開発者が同一環境
2. **セットアップ簡略化**: Docker一つで全環境構築
3. **クロスブラウザテスト**: 4ブラウザを標準装備
4. **CI/CD統合**: GitHub Actionsと完全互換

### テスト戦略とベストプラクティス

#### テスト作成原則
1. **AAA パターン**: Arrange（準備）、Act（実行）、Assert（検証）
2. **独立性**: 各テストは他のテストに依存しない
3. **明確な命名**: `should_[期待される動作]_when_[条件]`
4. **モック最小化**: 統合・E2Eテストでは実環境に近い状態を維持

#### CI/CD統合
- **GitHub Actions**: 自動テスト実行
- **プルリクエスト**: 統合テスト必須
- **マージ条件**: 全テスト合格 + カバレッジ基準達成

### テスト実績（2025-08-14検証済み）
- **総合成功率**: 90.6%（29/32テスト）
- **WebKit成功率**: 100%（9/9テスト、DOM読込3ms達成）
- **クロスブラウザ**: 全ブラウザ100%成功
- **パフォーマンス**: 起動時間平均1秒、DOM読込平均30ms

### 開発フロー
```bash
# 開発開始
git pull
docker-compose build  # 初回のみ

# 開発中のテスト
docker-compose run --rm playwright npm test

# コミット前の全テスト
docker-compose run --rm playwright npm run test:all

# CI/CDで同じ環境でテスト
git push
```

### 永続化済みDockerイメージ
```bash
# WebKit含む全ブラウザ永続化済み
cd PlantUML_Editor_Proto/E2Eテスト/docs/phase2
docker-compose -f docker-compose.permanent.yml up
```

詳細: 
- `DOCKER_TEST_STANDARD_PROPOSAL.md` - 標準化提案書
- `CI_CD_INTEGRATION.md` - CI/CD統合ガイド
- `WEBKIT_PERSISTENCE.md` - WebKit永続化レポート

## プロジェクト構造

```
C:\d\PlantUML/
├── CLAUDE.md                    # このファイル
├── PRD_完全統合版.md            # 製品要求定義書
├── .claude/                     # 詳細ドキュメント群
│   ├── agents/                  # エージェント仕様
│   ├── *.md                     # 各種ガイド
│   └── settings.local.json     # 設定
└── jp2plantuml/                 # アプリケーション本体
    ├── Dockerfile
    ├── docker-compose.yml
    ├── server.js
    ├── public/                  # フロントエンド
    └── src/                     # バックエンド
```

## 作業時の注意事項

### ✅ 推奨事項
- サブエージェント優先使用
- MCP利用可能時は必ず使用
- TodoWriteで進捗可視化
- 外部ドキュメント参照活用

### ❌ 避けるべき事項
- 直接の複雑作業実行
- 手動でのGit操作
- TodoWrite無しの複数ステップ作業
- MCPを使わない外部連携

## よくある問題と対処

問題発生時は `.claude/troubleshooting.md` を参照

## デバッグレポート作成

1事案1ファイル原則
- 形式: `debug_report_YYYYMMDD_HHMM_[概要].md`
- 詳細: `.claude/debug-report.md`

## リソース

- 公式ドキュメント: https://docs.anthropic.com/en/docs/claude-code
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- 内部リンク集: `.claude/resources.md`

---
# 重要：パフォーマンス最適化について

このファイルは意図的に簡潔に記載されています。
詳細が必要な場合は、各外部ファイルを参照してください。
これによりセッション安定性とレスポンス速度が向上します。