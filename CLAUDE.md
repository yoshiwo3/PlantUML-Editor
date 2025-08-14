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

## ⚠️ 重要: Node.js/Playwright互換性情報

### Playwright実行環境
- **Playwright対応**: Node.js v20まで（v22は未対応）
- **ローカル環境**: Node.js v22使用時はDocker環境必須
- **Docker環境**: Node.js v20.18.0 + Playwright構築済み

### E2Eテスト実行方法
```bash
# Docker環境でのテスト実行（推奨）
cd PlantUML_Editor_Proto/E2Eテスト
docker-compose run --rm playwright npm test

# Phase2テスト実行
cd docs/phase2
docker-compose run --rm playwright npm run test:all
```

詳細: `PlantUML_Editor_Proto/E2Eテスト/README_DOCKER.md`

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