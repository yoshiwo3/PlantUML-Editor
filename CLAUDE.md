# CLAUDE.md - プロジェクトガイド（最適化版 v3.0）

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**🎯 Version 3.0 - Performance Optimized**
- サイズ最適化によりセッション安定性向上
- 詳細は外部ファイル参照で管理
- 重要な原則と要点のみ記載

## ⚠️ 最重要：必ず守るべき6原則

### 🔴 原則1: TodoWriteを必ず使用
3ステップ以上の作業は必ずTodoWriteで管理

### 🔴 原則2: サブエージェントを必ず使用  
複雑な処理は必ずTask toolで実行（担当エージェントがいない場合は自分で実施可）

### 🔴 原則3: MCPサーバーを必ず使用
外部連携が可能な場合は必ずMCPを活用

### 🔴 原則4: ソース版管理（Git/GitHub）を必ず実施
コード修正完了時は即時にGitへコミット、可能ならpush→PR作成まで実施

### 🔴 原則5: ClaudeCodeActionsを必ず使用
Git操作、PR作成、コードレビューはClaudeCodeActionsで実行

### 🔴 原則6: Git Worktreesを必ず使用
並行開発、機能ブランチ管理は必ずGit Worktreesで実行

## 📚 詳細ドキュメント参照

### コア機能ガイド
- **TodoWrite詳細**: `.claude/todowrite.md`
- **サブエージェント仕様**: `.claude/agents/agents guide/サブエージェント作成のベストプラクティス_完全版.md`
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
複雑な作業はサブエージェントに委譲：
- `general-purpose`: 汎用タスク
- 専門エージェント: 特定領域のタスク
- 詳細は `.claude/agents/` 参照

### 4. 品質保証
- MCP活用: Playwright、GitHub、Context7
- ClaudeCodeActions: 自動レビュー
- テスト実行: 必須

### 5. リリース
```bash
git add . && git commit -m "type(scope): subject"
git push
# ClaudeCodeActionsでPR作成
```

## 🧾 コミットメッセージ規約
形式: `type(scope): subject`
- type: feat, fix, docs, style, refactor, perf, test, ci, chore
- subject: 72字以内、命令形

## 🤖 利用可能なサブエージェント（概要）

| エージェント | 用途 | 詳細 |
|------------|------|------|
| general-purpose | 汎用・複雑タスク | 全ツール利用可 |
| ai-driven-app-architect | システム設計 | アーキテクチャ専門 |
| webapp-test-automation | テスト自動化 | 品質保証専門 |
| web-debug-specialist | フロントエンド | UI/UX専門 |
| software-doc-writer | 技術文書 | ドキュメント専門 |
| dev-ticket-manager | プロジェクト管理 | タスク管理専門 |
| docker-dev-env-builder | 環境構築 | Docker専門 |
| mcp-server-setup-expert | MCP統合 | MCP設定専門 |
| claude-code-config-expert | Claude Code設定 | 環境設定専門 |

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
2. **PRD作成・更新**
3. **機能実装**
4. **デバッグ作業**
5. **リファクタリング**
6. **テスト実装**

詳細は `.claude/todowrite.md` 参照

## プロジェクト概要

**日本語→PlantUML変換SPA**
- Docker化Node.js/Express + フロントエンド
- 環境: http://localhost:8086
- 詳細: `PRD_完全統合版.md`

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