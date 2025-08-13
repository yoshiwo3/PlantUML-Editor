
# CLAUDE.md - サブエージェント作成ベストプラクティス完全版

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**🎯 Version 2.0 - Enhanced with SubAgent Best Practices**
- **更新内容**: サブエージェント詳細仕様、運用マトリクス、品質基準を統合
- **対応基準**: ベストプラクティス完全版準拠
- **統合機能**: 4フェーズワークフロー、MCP高度活用、TodoWrite上級技法

## ⚠️ 最重要：必ず守るべき原則

### 🔴 原則1: TodoWriteを必ず使用
**3ステップ以上の作業は必ずTodoWriteで管理**

### 🔴 原則2: サブエージェントを必ず使用  
**複雑な処理は必ずTask toolで実行**
**ただし、担当するサブエージェントがいない場合は、自分で実施してもよい**

### 🔴 原則3: MCPサーバーを必ず使用
**外部連携が可能な場合は必ずMCPを活用**

### 🔴 原則4: ソース版管理（Git/GitHub）を必ず実施
【必須】コード修正完了時は即時にGitへコミットし、可能なら同一フローで push → PR 作成まで実施（ClaudeCodeActionsを優先）。

### 🔴 原則5: ClaudeCodeActionsを必ず使用
**Git操作、PR作成、コードレビューはClaudeCodeActionsで実行**

### 🔴 原則6: Git Worktreesを必ず使用
**並行開発、機能ブランチ管理は必ずGit Worktreesで実行**

### 🧾 コミットメッセージ規約（必須）
- 形式: Conventional Commits（`type(scope)!: subject`）
- タイプ: feat, fix, docs, style, refactor, perf, test, ci, chore, revert
- 原則: 命令形・subjectは72字以内・1コミット=1意図・本文は理由/影響・footerにRefs/Closes/BREAKING CHANGE

```
type(scope)!: subject

[必要なら本文（理由/影響/代替/移行）]

Refs: #123
Closes: #456
BREAKING CHANGE: 変更点と移行手順（該当時のみ）
```

### 環境定義（参照用）
- BASE_URL: http://localhost:8086
- Git運用: 原則4に従い commit → push → PR（ClaudeCodeActions優先）

## 🚀 重要：開発作業原則

### 5つのツールをフル活用する原則
**すべての開発作業において、以下の5つのツールを必ずフル活用すること：**

1. **📋 TodoWriteツール** - 作業の可視化と進捗管理
2. **🤖 サブエージェント（Task tool）** - 複雑な処理の実行
3. **🔧 MCPサーバー** - 外部システムとの連携
4. **⚡ ClaudeCodeActions** - Git操作とコードレビューの自動化
5. **🌳 Git Worktrees** - 並行開発と機能ブランチ管理

### TodoWriteツール必須使用
**3ステップ以上の作業は必ずTodoWriteで管理すること。**
- 作業開始前にTodoリスト作成
- 各タスク完了時に即座にステータス更新
- ユーザーへの進捗可視化を常に意識

### サブエージェント優先の作業方針
**すべての開発作業において、原則としてサブエージェント（Task tool）を使用すること。**

1. **必須使用ケース**：
   - コード実装・修正作業
   - 複数ファイルの調査・分析
   - リファクタリング作業
   - テスト実装・実行
   - ドキュメント作成・更新
   - デバッグ・問題解決
   - PRD作成・更新作業

2. **サブエージェント活用のメリット**：
   - 並列処理による効率化
   - 専門性の高い処理の実現
   - コンテキスト管理の最適化
   - エラー処理の改善
   - 大規模な変更の安全な実行

3. **実行例**：
   ```
   Task(
     description: "PRD更新作業",
     prompt: "PRD_完全統合版.mdに注釈機能と画像解析機能の詳細仕様を追加。技術仕様、ユースケース、テスト計画を含める",
     subagent_type: "general-purpose"
   )
   ```

4. **直接作業を行う例外ケース**：
   - 単純なファイル読み取り（Read tool）
   - 簡単な状態確認（1-2コマンドのBash実行）
   - ユーザーへの質問・確認
   - 作業結果の報告

## 🤖 利用可能なサブエージェント一覧（外部化）
詳細な一覧・マトリクス・運用手順・テンプレは `.claude/agents/agents guide/サブエージェント作成のベストプラクティス_完全版.md` を参照。

### サブエージェント詳細仕様

| エージェント名 | タイプ | 詳細説明 | Model | Priority | 利用可能ツール | SubAgentsファイルパス | 自動起動条件・推奨用途 |
|--------------|-------|----------|-------|----------|--------------|---------------------|------------------------|
| general-purpose | 汎用 | **汎用性と柔軟性に特化した最強エージェント**<br>• MUST BE USED when: 3ファイル以上の複雑な操作<br>• Use PROACTIVELY for: 全ての開発タスク<br>• 長時間の複雑なタスクを自律的に実行<br>• エラー時の自動リカバリー機能<br>• 並列処理による高速実行 | opus | critical | すべてのツール（*） | システム内蔵<br>（.claude/agents/配下が存在する場合：<br>`~/.claude/agents/general-purpose.md`） | **自動起動条件:**<br>• 複数ファイル操作時<br>• 5分以上の処理<br>• アーキテクチャ変更<br>**推奨用途:**<br>• PRD作成・更新<br>• 大規模な機能実装<br>• 複数ファイルの調査・分析<br>• テスト実装 |
| statusline-setup | 専門 | **Claude Code設定に特化した軽量エージェント**<br>• MUST BE USED when: Claude Code設定変更<br>• Use PROACTIVELY for: ステータスライン最適化<br>• 設定ファイルの安全な編集<br>• 構成の妥当性検証<br>• ユーザー好みの表示設定 | haiku | medium | Read, Edit | システム内蔵<br>（.claude/agents/配下が存在する場合：<br>`~/.claude/agents/statusline-setup.md`） | **自動起動条件:**<br>• Claude Code設定ファイル操作時<br>**推奨用途:**<br>• Claude Codeのステータスライン設定<br>• 表示カスタマイズ |
| ai-driven-app-architect | システム設計 | **エンタープライズ級システム設計の専門家**<br>• MUST BE USED when: アーキテクチャレベルの変更<br>• Use PROACTIVELY for: システム設計判断<br>• 最新技術動向を踏まえた設計提案<br>• スケーラビリティとパフォーマンスの最適化<br>• セキュリティとコンプライアンス要件の統合 | opus | critical | Read, Write, Grep, Glob, Task, MultiEdit, WebSearch, TodoWrite, ExitPlanMode, WebFetch | `C:\d\PlantUML\.claude\agents\ai-driven-app-architect.md` | **自動起動条件:**<br>• システム全体設計時<br>• 技術スタック変更時<br>**推奨用途:**<br>• システム全体設計<br>• アーキテクチャ意思決定<br>• 技術検討・評価<br>• 統合設計<br>• スケーラビリティ設計 |
| claude-code-config-expert | 設定専門 | **Claude Code環境構築のスペシャリスト**<br>• MUST BE USED when: 初回環境構築時<br>• Use PROACTIVELY for: 設定最適化提案<br>• 日本語ユーザーに特化した支援<br>• トラブルシューティングのエキスパート<br>• MCP統合の完全サポート | opus | high | Read, Write, Grep, Glob, Task, MultiEdit, WebSearch, TodoWrite, ExitPlanMode, WebFetch | `C:\d\PlantUML\.claude\agents\claude-code-config-expert.md` | **自動起動条件:**<br>• 初回環境構築時<br>• MCP設定変更時<br>**推奨用途:**<br>• Claude Code環境構築<br>• MCP設定支援<br>• 設定問題解決<br>• 開発環境最適化<br>• 日本語ユーザー支援 |
| dev-ticket-manager | プロジェクト管理 | **アジャイル開発プロセスの最適化エキスパート**<br>• MUST BE USED when: 大規模プロジェクト管理<br>• Use PROACTIVELY for: タスク分解・計画立案<br>• 複雑な依存関係の可視化と管理<br>• リスク予測と軽減策の提案<br>• チーム生産性向上の戦略立案 | opus | high | Read, Write, Grep, Glob, Task, TodoWrite, ExitPlanMode, WebSearch, MultiEdit, Bash | `C:\d\PlantUML\.claude\agents\dev-ticket-manager.md` | **自動起動条件:**<br>• 複数人開発時<br>• プロジェクト計画段階<br>**推奨用途:**<br>• プロジェクト計画<br>• スプリント管理<br>• タスク調整<br>• 進捗管理<br>• 開発プロセス最適化 |
| docker-dev-env-builder | 開発環境構築 | **コンテナ化開発環境の構築エキスパート**<br>• MUST BE USED when: Docker環境設計時<br>• Use PROACTIVELY for: 開発環境標準化<br>• マルチステージビルドの最適化<br>• セキュリティベストプラクティスの実装<br>• CI/CDパイプラインとの完全統合 | opus | high | Read, Write, Bash, Grep, Glob, Task, WebSearch, TodoWrite, MultiEdit, WebFetch, Edit | `C:\d\PlantUML\.claude\agents\docker-dev-env-builder.md` | **自動起動条件:**<br>• Docker設定変更時<br>• 新環境構築時<br>**推奨用途:**<br>• Docker環境構築<br>• 開発環境標準化<br>• コンテナ最適化<br>• 環境自動化<br>• インフラ設計 |
| mcp-server-setup-expert | MCP統合 | **MCPエコシステム統合のスペシャリスト**<br>• MUST BE USED when: MCP統合時<br>• Use PROACTIVELY for: 開発効率化提案<br>• 最新MCPサーバーの選定と統合<br>• パフォーマンス最適化<br>• エラーハンドリングの高度な実装 | opus | high | Read, Write, Bash, Grep, Glob, WebFetch, Task, WebSearch, TodoWrite, ExitPlanMode | `C:\d\PlantUML\.claude\agents\mcp-server-setup-expert.md` | **自動起動条件:**<br>• MCP設定変更時<br>• 新しいMCPサーバー追加時<br>**推奨用途:**<br>• MCP環境構築<br>• ツール統合支援<br>• 設定問題解決<br>• 開発効率化<br>• AI統合支援 |
| software-doc-writer | 技術文書作成 | **エンタープライズ技術文書作成の専門家**<br>• MUST BE USED when: 公式ドキュメント作成時<br>• Use PROACTIVELY for: 文書品質向上<br>• 国際標準に準拠した文書構造<br>• 多言語対応とローカライゼーション<br>• インタラクティブな図表・視覚化 | opus | medium | Read, Write, MultiEdit, Grep, Glob, WebSearch, Task, TodoWrite, Bash | `C:\d\PlantUML\.claude\agents\software-doc-writer.md` | **自動起動条件:**<br>• API仕様書作成時<br>• 設計書更新時<br>**推奨用途:**<br>• 設計書作成<br>• API仕様書<br>• 技術文書統一<br>• 図表作成<br>• ドキュメント管理 |
| web-debug-specialist | フロントエンド最適化 | **フロントエンド品質保証のエキスパート**<br>• MUST BE USED when: UI/UXバグ発生時<br>• Use PROACTIVELY for: パフォーマンス監視<br>• 最新ブラウザ技術への対応<br>• アクセシビリティ国際基準準拠<br>• ユーザビリティ改善の戦略提案 | opus | high | Read, Write, Grep, Glob, Bash, WebFetch, Task, WebSearch, TodoWrite, ExitPlanMode | `C:\d\PlantUML\.claude\agents\web-debug-specialist.md` | **自動起動条件:**<br>• フロントエンドエラー発生時<br>• UI/UX変更時<br>**推奨用途:**<br>• フロントエンド設計<br>• UI実装・最適化<br>• バグ修正・デバッグ<br>• パフォーマンス改善<br>• レスポンシブ対応 |
| webapp-test-automation | テスト自動化 | **包括的テスト戦略とQAの専門家**<br>• MUST BE USED when: テスト戦略策定時<br>• Use PROACTIVELY for: 品質保証向上<br>• 先進的テストフレームワークの統合<br>• AI支援テスト生成<br>• 継続的品質改善プロセス | opus | high | Read, Write, Grep, Glob, Bash, Task, TodoWrite, WebSearch, ExitPlanMode | `C:\d\PlantUML\.claude\agents\webapp-test-automation.md` | **自動起動条件:**<br>• テスト実装時<br>• 品質改善時<br>**推奨用途:**<br>• テスト戦略作成<br>• テスト自動化<br>• 品質管理<br>• CI/CDテスト統合<br>• テストフレームワーク構築 |

## 🎯 サブエージェント運用マトリクス（外部化）
委譲基準・優先度・品質ゲートは外部ファイルを参照。

### 自動起動条件とエージェント連携

| 起動条件 | 自動選択エージェント | 連携エージェント | 委譲ポリシー | エスカレーション条件 |
|---------|-------------------|----------------|-------------|-----------------|
| **3ファイル以上の複雑操作** | general-purpose | - | 必須委譲 | エラー3回で上位エージェント |
| **アーキテクチャレベル変更** | ai-driven-app-architect | general-purpose | 必須委譲 | 技術検証失敗時 |
| **Claude Code設定変更** | claude-code-config-expert | statusline-setup | 推奨委譲 | 設定競合時 |
| **MCP統合・設定** | mcp-server-setup-expert | claude-code-config-expert | 必須委譲 | 連携失敗時 |
| **Docker環境構築** | docker-dev-env-builder | - | 必須委譲 | セキュリティ問題発生時 |
| **UI/UXバグ** | web-debug-specialist | webapp-test-automation | 推奨委譲 | パフォーマンス問題時 |
| **テスト戦略策定** | webapp-test-automation | - | 必須委譲 | 品質基準未達時 |
| **技術文書作成** | software-doc-writer | - | 推奨委譲 | 多言語対応時 |
| **プロジェクト管理** | dev-ticket-manager | - | 推奨委譲 | 複数人開発時 |

### エージェント連携ワークフロー図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ユーザー要求   │───▶│  条件判定ロジック │───▶│ エージェント選択  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   結果報告      │◀───│  品質チェック    │◀───│ エージェント実行  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                      │
                                ▼                      ▼
                        ┌─────────────────┐    ┌─────────────────┐
                        │ エスカレーション │    │   連携エージェント │
                        └─────────────────┘    └─────────────────┘
```

### 委譲ポリシーと自動化ルール

#### 必須委譲ケース（MUST BE USED）
- **複雑度 HIGH**: 3ファイル以上、5分以上の処理
- **専門性 REQUIRED**: アーキテクチャ設計、MCP統合
- **品質保証 CRITICAL**: テスト戦略、セキュリティ設計

#### 推奨委譲ケース（Use PROACTIVELY）
- **効率化**: 定型作業、繰り返し処理
- **品質向上**: コード品質、文書品質の改善
- **知識活用**: 最新技術情報、ベストプラクティス適用

#### 直接実行ケース（例外的）
- **単純操作**: 1ファイル読み取り、簡単な状態確認
- **即時性**: 1-2分以内の緊急対応
- **学習目的**: ユーザーが手順を理解したい場合

### エスカレーション条件

| エラー種別 | 初回対応 | 2回目対応 | 3回目対応 | 最終手段 |
|-----------|---------|-----------|-----------|----------|
| **技術エラー** | 同エージェント再実行 | 上位エージェント | general-purpose | ユーザー確認 |
| **設定エラー** | 設定専門エージェント | 環境専門エージェント | 統合エージェント | マニュアル対応 |
| **品質エラー** | 品質チェック強化 | テスト専門エージェント | 全面見直し | 要件再定義 |
| **連携エラー** | 個別エージェント | 統合エージェント | システム全体見直し | アーキテクチャ変更 |

### サブエージェント活用の詳細ガイド

#### general-purpose エージェント
**概要**: 最も強力で柔軟な汎用エージェント  
**強み**:
- すべてのツールへのアクセス権限
- 長時間の複雑なタスクを自律的に実行
- エラー時の自動リカバリー機能
- 並列処理による高速実行

**典型的な使用パターン**:
```javascript
// PRD更新の例
Task(
  description: "PRD完全更新",
  prompt: "PRD_完全統合版.mdに新機能の詳細仕様を追加し、関連ドキュメントも同期更新",
  subagent_type: "general-purpose"
)

// 大規模リファクタリングの例
Task(
  description: "コードベース最適化",
  prompt: "全JavaScriptファイルのES6化とモジュール分割を実行",
  subagent_type: "general-purpose"
)
```

#### statusline-setup エージェント
**概要**: Claude Codeのステータスライン設定に特化  
**強み**:
- 設定ファイルの安全な編集
- 構成の妥当性検証
- ユーザー好みの表示設定

## 📊 品質基準とメトリクス（外部化）
定義・しきい値・収集方法は `.claude/metrics.md` を参照。

### コード品質メトリクス

| メトリクス分類 | 品質指標 | 目標値 | 測定方法 | 責任エージェント | アラート設定 |
|-------------|---------|--------|---------|-----------------|-------------|
| **コード品質** | 循環的複雑度 | < 10 | 静的解析 | general-purpose | 15以上で警告 |
| **テストカバレッジ** | ライン覆盖率 | > 80% | Jest/Coverage | webapp-test-automation | 70%以下で警告 |
| **セキュリティ** | 脆弱性スコア | 0 Critical | OWASP準拠 | ai-driven-app-architect | Critical発見時即座 |
| **パフォーマンス** | レスポンス時間 | < 200ms | Lighthouse | web-debug-specialist | 300ms以上で警告 |
| **保守性** | 技術的負債 | < 30分/KLOC | SonarQube | general-purpose | 60分以上で警告 |
| **ドキュメント** | API文書化率 | 100% | 自動チェック | software-doc-writer | 90%以下で警告 |

### セキュリティ要件（OWASP Top 10準拠）

| セキュリティ項目 | チェック内容 | 実装必須レベル | 検証方法 | 責任エージェント |
|----------------|-------------|---------------|---------|-----------------|
| **認証の破綻** | JWT実装、多要素認証 | Critical | 自動テスト | ai-driven-app-architect |
| **暗号化の失敗** | HTTPS、データ暗号化 | Critical | 設定チェック | docker-dev-env-builder |
| **インジェクション** | SQLインジェクション対策 | Critical | 静的解析 | web-debug-specialist |
| **安全でない設計** | セキュリティ設計レビュー | High | 設計チェック | ai-driven-app-architect |
| **設定ミス** | セキュリティヘッダー | High | 設定監査 | docker-dev-env-builder |
| **脆弱なコンポーネント** | 依存関係チェック | High | 自動スキャン | general-purpose |
| **識別・認証の失敗** | セッション管理 | Medium | 手動テスト | webapp-test-automation |
| **ソフトウェア整合性** | コード署名 | Medium | CI/CDチェック | dev-ticket-manager |
| **ログ・監視不足** | セキュリティログ | Medium | ログ分析 | general-purpose |
| **サーバサイドリクエストフォージェリ** | SSRF対策 | Medium | 脆弱性テスト | web-debug-specialist |

### 追跡対象メトリクス

#### パフォーマンスメトリクス
```javascript
const performanceTargets = {
  // Webアプリケーション
  firstContentfulPaint: '< 1.5秒',
  largestContentfulPaint: '< 2.5秒',
  cumulativeLayoutShift: '< 0.1',
  firstInputDelay: '< 100ms',
  
  // API応答時間
  apiResponseTime: '< 200ms',
  databaseQueryTime: '< 50ms',
  cacheHitRate: '> 95%',
  
  // リソース使用率
  cpuUsage: '< 70%',
  memoryUsage: '< 80%',
  diskUsage: '< 85%'
};
```

#### 品質メトリクス
```javascript
const qualityTargets = {
  // コード品質
  codeComplexity: '< 10',
  duplicatedCode: '< 3%',
  technicalDebt: '< 30分/KLOC',
  
  // テスト品質
  testCoverage: '> 80%',
  testPassRate: '> 95%',
  flakiness: '< 5%',
  
  // ドキュメント品質
  apiDocCoverage: '100%',
  codeCommentRatio: '> 20%',
  docFreshness: '< 7日'
};
```

### アラート設定

#### 即座アラート（Critical）
- **セキュリティ脆弱性**: Critical/High発見時
- **システム停止**: 可用性 < 99%
- **データ損失**: バックアップ失敗
- **法的要件**: コンプライアンス違反

#### 警告アラート（Warning）
- **パフォーマンス低下**: レスポンス時間 > 300ms
- **品質低下**: テストカバレッジ < 70%
- **技術的負債**: 許容値の50%超過
- **ドキュメント不備**: API文書化率 < 90%

#### 情報アラート（Info）
- **使用率上昇**: リソース使用率 > 60%
- **依存関係更新**: セキュリティアップデート利用可能
- **最適化機会**: パフォーマンス改善提案
- **トレンド変化**: メトリクス傾向の変化

### サブエージェント選択フローチャート

```
タスクの評価
    ↓
複雑度は？
    ├─ 高（3つ以上のファイル操作） → general-purpose
    ├─ 中（1-2ファイルの編集） → general-purpose
    └─ 低（設定変更のみ） → 
        └─ Claude Code設定？
            ├─ Yes → statusline-setup
            └─ No → 直接実行

```

### MCPサーバー必須活用
**利用可能なMCPサーバーは必ず活用すること。**

#### 利用可能なMCPサーバー
| MCPサーバー | プレフィックス | 主な用途 |
|------------|---------------|---------|
| **GitHub** | `mcp__github__*` | Issue/PR管理、コード管理 |
| **Playwright** | `mcp__playwright__*` | E2Eテスト、UI自動検証 |
| **Fetch** | `mcp__fetch__*` | Web情報取得 |
| **Context7** | `mcp__context7__*` | ドキュメント参照 |
| **IDE** | `mcp__ide__*` | VS Code連携、診断 |

**注意**: ClaudeCodeActionsはMCPサーバーではなく、Claude Code内蔵の機能のため、MCPプレフィックスは使用しません。

### ClaudeCodeActions必須活用
**Git操作、PR作成、コードレビューは必ずClaudeCodeActionsを活用すること。**

#### ClaudeCodeActionsの概要
ClaudeCodeActionsは、Claude Codeに統合された強力な開発ワークフロー自動化機能です：

**主要機能**:
- **Git操作の自動化**: コミット、プッシュ、ブランチ切り替えの統一化
- **PR作成・管理**: 自動的なプルリクエスト作成とレビュー依頼
- **コードレビュー**: 自動コード品質チェックと改善提案
- **CI/CD連携**: ビルド、テスト、デプロイパイプラインとの統合

#### 必須使用ケース
```javascript
// 新機能開発の完全ワークフロー
1. ClaudeCodeActions.createFeatureBranch("feature/new-annotation-tools")
2. サブエージェントで実装
3. ClaudeCodeActions.commitAndPush("新しい注釈ツール機能を追加")
4. ClaudeCodeActions.createPullRequest({
     title: "注釈ツール機能追加",
     description: "Canvas APIベースの高度な注釈機能を実装"
   })
5. ClaudeCodeActions.performCodeReview()
```

#### 活用メリット
- **標準化されたGitワークフロー**: 一貫性のある開発プロセス
- **自動品質チェック**: コードレビューと品質保証の自動化
- **効率的なコラボレーション**: チームでの開発効率向上
- **トレーサビリティ**: 変更履歴と意思決定プロセスの記録

### Git Worktrees必須活用
**並行開発、機能ブランチ管理は必ずGit Worktreesを活用すること。**

#### Git Worktreesの概要
Git Worktreesは、1つのリポジトリで複数のワーキングディレクトリを管理する強力な機能です：

**基本概念**:
- **複数ワーキングディレクトリ**: 同じリポジトリの異なるブランチを同時に操作
- **独立した作業環境**: 各機能開発を独立した環境で実行
- **効率的なブランチ切り替え**: ファイルの再ビルドなしにブランチ間移動

#### 必須使用ケース
```bash
# 新機能開発用Worktreeの作成
git worktree add ../plantuml-feature-annotation feature/annotation-tools

# バグ修正用Worktreeの作成  
git worktree add ../plantuml-hotfix-rendering hotfix/rendering-bug

# 実験的機能用Worktreeの作成
git worktree add ../plantuml-experimental-ai experimental/ai-integration
```

#### 活用メリット
- **並行開発の効率化**: 複数機能を同時に開発可能
- **コンテキストスイッチの削減**: ブランチ切り替え時のオーバーヘッドを最小化
- **独立したテスト環境**: 各機能のテストを干渉なく実行
- **リスク分散**: 実験的変更の影響を他の作業から分離

#### 実践的な使用例
```bash
# プロジェクト構造例
C:\d\PlantUML\                           # メインワーキングディレクトリ (main)
C:\d\PlantUML-feature-annotation\        # 注釈機能開発
C:\d\PlantUML-hotfix-rendering\          # レンダリング修正
C:\d\PlantUML-experimental-ai\           # AI機能実験

# 各ディレクトリで独立した開発
cd C:\d\PlantUML-feature-annotation
npm install  # 独立した依存関係管理
docker-compose up  # 独立したコンテナ環境
```

## 🚀 標準ワークフロー（要点）

### 要点
- 計画→実装→品質→デプロイの4フェーズ。各境界に品質ゲートを設置し未達時は戻す。
- 成果物の受け渡しを明示（設計→実装→品質→運用）。
- 詳細は `.claude/workflows.md` と `.claude/integration.md` を参照。

## プロジェクト概要（要点）

- 日本語→PlantUML変換SPA。Docker化Node.js/Express + フロントエンド。
- 詳細は `.claude/project-structure.md` を参照。

## プロジェクト構造

```
C:\d\PlantUML/
├── CLAUDE.md                              # このファイル
├── PRD_完全統合版.md                      # 製品要求定義書（メイン）
├── PRD_日本語からPlantUMLを簡単生成するSPA_企画書.md
├── PRD_日本語からPlantUMLを簡単生成するSPA_企画書_改訂版.md
├── PRD_日本語からPlantUMLを簡単生成するSPA_企画書_読みやすい版.md
├── PRD_機能要件詳細.md
├── PlantUML_ガントチャート_制限事項Ver1.0_20250601.md
├── PlantUML_ガントチャート_制限事項Ver1.1_20250601.md
├── PlantUMLレンダリング段階的アプローチ.md
├── Flow.io連携機能仕様.md
├── draw.io_XML形式実装ガイド.md
├── draw.io_XML最適化実装ガイド.md
├── チャット履歴_*.md                      # 開発履歴
└── jp2plantuml/                           # アプリケーション本体
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    ├── package-lock.json
    ├── server.js                          # Express サーバー
    ├── public/                            # フロントエンド
    │   ├── index.html                    # メインHTML
    │   ├── main.js                       # メインロジック
    │   ├── styles.css                    # スタイルシート
    │   ├── annotation.js                 # 注釈機能
    │   └── image-analyzer.js             # 画像解析機能
    └── src/                               # バックエンド処理
        ├── convert.js                     # 変換エンジン
        └── parsers/                       # 図種別パーサー
            ├── activity.js
            ├── class.js
            ├── gantt.js
            ├── sequence.js
            ├── state.js
            └── usecase.js
```

## システムアーキテクチャ（要点）
- 技術スタックとAPI一覧は `.claude/project-structure.md` に集約。

## 開発コマンド（要点）

- 詳細手順は `.claude/dev-commands.md` を参照。
- アクセスURLは本文先頭の環境定義（BASE_URL）を参照。

## 機能仕様

### 1. 日本語→PlantUML変換
- **入力**: 自然な日本語テキスト
- **処理**: 形態素解析 + パターンマッチング
- **出力**: PlantUMLコード

### 2. 図の種類
- ガントチャート
- シーケンス図
- クラス図
- アクティビティ図
- 状態遷移図
- ユースケース図

### 3. 注釈機能
- Canvas APIベースの描画レイヤー
- ツール: ペン、矢印、テキスト、消しゴム
- 保存/読込機能（JSON形式）
- 画像エクスポート（PNG）

### 4. 画像解析機能
- OCR（Tesseract.js）による文字認識
- パターン認識による図種判定
- 自動PlantUMLコード生成

## PRD作成ガイドライン（要点）

- 更新ルール・記載項目は `.claude/prd-guidelines.md` を参照。

## 作業時の注意事項

### 🎯 最重要：サブエージェント優先原則
**すべての実装・調査作業は、まずサブエージェント（Task tool）での実行を検討すること。**
直接作業は最小限に留め、複雑な処理は必ずサブエージェントに委譲する。

### サブエージェント実行ガイドライン

#### 複雑なタスクの分割
大規模な作業は複数のサブエージェントタスクに分割：
- 調査フェーズ → 実装フェーズ → テストフェーズ
- 各フェーズを独立したサブエージェントで実行

#### 並列実行の推奨
独立したタスクは並列実行で効率化：
```javascript
// 複数のサブエージェントを同時実行
[
  Task(description: "コード分析", ...),
  Task(description: "テスト作成", ...),
  Task(description: "ドキュメント更新", ...)
]
```

#### エラーハンドリング
サブエージェントのエラーは適切に処理：
- エラー時は代替アプローチを検討
- 必要に応じて再実行
- ユーザーへの明確な報告

### コード実装前の確認
1. **PRD確認**: 機能がPRDに定義されているか確認
2. **影響範囲**: 既存機能への影響を評価
3. **テスト**: 実装後のテスト計画を事前に策定

### Git操作
```bash
# 変更をコミット
git add .
git commit -m "機能: [機能名] - [変更内容]"

# 例
git commit -m "機能: 注釈機能 - Canvas APIベースの描画機能を追加"
```

### デバッグ
```javascript
// ブラウザコンソールでのデバッグ
console.log('変換結果:', result);

// エラーハンドリング
try {
  // 処理
} catch (error) {
  console.error('エラー:', error);
}
```

## よくある問題と対処（要点）

- 典型要因/診断/対処は `.claude/troubleshooting.md` を参照。

## 5ツール統合活用例（要点）

### 機能実装の完全ワークフロー
- 詳細な実例は `.claude/integration.md` を参照。

## サブエージェント活用例（外部化）
具体的な活用フローやテンプレはエージェント外部ガイドへ集約。

### PRD作成・更新
```javascript
Task(
  description: "PRD完全統合版更新",
  prompt: `
    PRD_完全統合版.mdに以下の内容を追加：
    1. 注釈機能の詳細仕様
    2. 画像解析機能の詳細仕様
    3. 各機能のユースケース
    4. テスト計画
    5. API仕様
  `,
  subagent_type: "general-purpose"
)
```

### 複数ファイル調査
```javascript
Task(
  description: "依存関係調査",
  prompt: `
    jp2plantumlディレクトリ内のすべてのファイルを調査し、
    モジュール間の依存関係を分析。
    結果を依存関係図として出力。
  `,
  subagent_type: "general-purpose"
)
```

### リファクタリング作業
```javascript
Task(
  description: "コード最適化",
  prompt: `
    main.jsのコードをリファクタリング：
    1. 重複コードの削除
    2. 関数の分割と整理
    3. エラーハンドリングの改善
    4. コメントの追加
  `,
  subagent_type: "general-purpose"
)
```

### テスト実装
```javascript
Task(
  description: "E2Eテスト作成",
  prompt: `
    Playwright MCPを使用してE2Eテストを作成：
    1. 基本的な変換機能のテスト
    2. 注釈機能のテスト
    3. 画像アップロードのテスト
    4. エラーケースのテスト
  `,
  subagent_type: "general-purpose"
)
```

## デバッグレポート作成（要点）
- 原則: 1事案1ファイル、テンプレート準拠
- 形式/テンプレ/例は `.claude/debug-report.md` を参照

## 🔧 MCPガイド（要点）
- 原則: 可能な限りMCP優先（GitHub/Playwright/Context7/IDE）
- 使い分け: 調査→Context7/Fetch、検証→Playwright、品質→IDE
- 失敗時: 代替手段とリトライ方針を事前定義
- 詳細は `.claude/mcp-guide.md`

### 🎯 MCP活用の基本原則

#### 1. MCP優先の原則
**MCPサーバーが利用できる場合は、必ずMCPを優先して使用する**

```javascript
// ❌ 避けるべき：直接的なBashコマンド実行
Bash(command: "curl -X GET https://api.github.com/repos/user/repo")

// ✅ 推奨：MCPサーバー使用
mcp__github__get_file_contents(owner: "user", repo: "repo", path: "README.md")
```

#### 2. 機能の組み合わせ活用
**複数のMCPサーバーを組み合わせて、より強力な機能を実現**

```javascript
// Webアプリ開発の完全ワークフロー例
// 1. GitHub でコード実装
mcp__github__create_branch(...)
mcp__github__push_files(...)

// 2. Playwright でテスト実行
mcp__playwright__browser_navigate(...)
mcp__playwright__browser_click(...)

// 3. Context7 で技術調査
mcp__context7__get_library_docs(...)

// 4. IDE連携で品質チェック
mcp__ide__getDiagnostics()
```

#### 3. エラーハンドリングと代替手段
**MCPでエラーが発生した場合の対応策を事前に準備**

```javascript
// プライマリ：MCP使用
try {
  mcp__github__create_pull_request(...)
} catch (error) {
  // フォールバック：他の手段を検討
  console.log("MCP実行失敗、代替手段を検討")
}
```

## 🤖 サブエージェント詳細ガイド（外部化）
種類/選定/実行パターン/依存制御の詳細は外部化。
`.claude/agents/agents guide/サブエージェント作成のベストプラクティス_完全版.md`

### サブエージェントの種類と特徴

#### 1. general-purpose エージェント
**概要**: 汎用性に特化した標準エージェント  
**適用範囲**: ほぼ全ての開発タスクに対応

**強み**:
- 柔軟な問題解決能力
- 複数の技術領域を横断した処理
- 長期的なコンテキスト維持
- エラー時の自動復旧機能

**推奨使用ケース**:
- PRD作成・更新
- コード実装・リファクタリング
- 複数ファイルの調査・分析
- テスト作成・実行
- ドキュメント生成

### サブエージェント選択基準（要点）

#### タスクの複雑度による判断

高複雑/長時間/多依存は委譲。それ以外は状況に応じて判断。詳細は外部ガイド。

#### 処理時間による判断

**長時間処理（サブエージェント推奨）**:
- 5分以上の処理が予想される作業
- 多数のファイル操作
- 外部APIとの複雑な連携

**短時間処理（直接実行可）**:
- 1-2分以内で完了する作業
- 単純な情報取得
- 状態確認

### サブエージェント実行パターン（外部化）
段階/並列/依存パターンの詳細・コード例は外部ガイドへ。

#### 1. 段階的実行パターン
```javascript
// Phase 1: 調査・分析
Task(
  description: "要件分析フェーズ",
  prompt: "現在の実装状況を調査し、新機能の実装方針を策定",
  subagent_type: "general-purpose"
)

// Phase 2: 実装
Task(
  description: "実装フェーズ",
  prompt: "Phase 1の結果を基に、具体的なコード実装を実行",
  subagent_type: "general-purpose"
)

// Phase 3: テスト・検証
Task(
  description: "テストフェーズ",
  prompt: "Playwright MCPを使用した包括的なテスト実行",
  subagent_type: "general-purpose"
)
```

#### 2. 並列実行パターン
```javascript
// 独立したタスクを並列実行
[
  Task(description: "フロントエンド修正", ...),
  Task(description: "バックエンドAPI作成", ...),
  Task(description: "テストケース作成", ...),
  Task(description: "ドキュメント更新", ...)
]
```

#### 3. 依存関係を持つ実行パターン
```javascript
// Task A の結果を Task B で使用
const resultA = Task(description: "基盤調査", ...)
const resultB = Task(
  description: "resultAを基にした実装",
  prompt: `${resultA}の結果を踏まえて実装を進める`,
  ...
)
```

### MCPとサブエージェントの連携（要点）
使い分けと連携の原則のみ本文に保持。具体例は`.claude/mcp-guide.md`とエージェント外部ガイドへ。

## 💡 MCP活用のベストプラクティス

### 🎯 MCP統合戦略

#### 1. プロアクティブMCP活用
```javascript
// ❌ 避けるべき：リアクティブな使用
// 問題が発生してからMCPを使用

// ✅ 推奨：プロアクティブな使用
const mcpStrategy = {
  // 開発開始時にMCP環境チェック
  preCheck: async () => {
    await mcp__ide__getDiagnostics();
    await mcp__github__list_commits(owner, repo);
    return "MCP環境正常";
  },
  
  // 定期的な品質チェック
  continuousQuality: async () => {
    const playwright = mcp__playwright__browser_snapshot();
    const github = mcp__github__get_pull_request_status(owner, repo, pr);
    return { ui: playwright, ci: github };
  },
  
  // 自動エラー検出とリカバリ
  autoRecovery: async (error) => {
    if (error.type === 'ui') {
      return await mcp__playwright__browser_console_messages();
    }
    if (error.type === 'api') {
      return await mcp__fetch__fetch_url(errorUrl);
    }
  }
};
```

#### 2. MCPチェーンパターン
複数のMCPサーバーを連鎖的に使用する高度なパターン：

```javascript
// GitHub → Playwright → Context7 チェーン
async function comprehensiveCodeReview(pr) {
  // Step 1: GitHubから変更内容取得
  const changes = await mcp__github__get_pull_request_files(owner, repo, pr);
  
  // Step 2: Playwrightで動作検証
  await mcp__playwright__browser_navigate(deployUrl);
  const uiTest = await mcp__playwright__browser_snapshot();
  
  // Step 3: Context7で最新ベストプラクティス確認
  const docs = await mcp__context7__get_library_docs(libId, {
    topic: "security",
    tokens: 5000
  });
  
  // Step 4: 統合レポート生成
  return {
    codeChanges: changes,
    uiValidation: uiTest,
    bestPractices: docs,
    recommendation: generateRecommendation(changes, uiTest, docs)
  };
}
```

#### 3. エラーリカバリパターン
```javascript
class MCPErrorHandler {
  async executeWithFallback(primaryMCP, fallbackMCP, params) {
    try {
      return await primaryMCP(params);
    } catch (primaryError) {
      console.log(`Primary MCP failed: ${primaryError.message}`);
      
      try {
        return await fallbackMCP(params);
      } catch (fallbackError) {
        console.log(`Fallback MCP failed: ${fallbackError.message}`);
        
        // 最終手段：手動実行
        return await this.manualFallback(params);
      }
    }
  }
  
  async manualFallback(params) {
    // Bashコマンドや他の手段を使用
    return await Bash({ command: `curl ${params.url}` });
  }
}
```

### 🔧 MCP最適化技術

#### 1. 並列実行パターン
```javascript
// 独立したMCP操作を並列実行
async function parallelMCPExecution() {
  const [githubStatus, playwrightResult, context7Docs] = await Promise.all([
    mcp__github__get_pull_request_status(owner, repo, pr),
    mcp__playwright__browser_snapshot(),
    mcp__context7__get_library_docs(libId)
  ]);
  
  return {
    cicd: githubStatus,
    ui: playwrightResult,
    docs: context7Docs
  };
}
```

#### 2. キャッシュ戦略
```javascript
class MCPCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5分
  }
  
  async getCachedOrFetch(key, mcpFunction, params) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await mcpFunction(params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
}

// 使用例
const cache = new MCPCache();
const docs = await cache.getCachedOrFetch(
  'react-docs',
  mcp__context7__get_library_docs,
  { context7CompatibleLibraryID: '/facebook/react' }
);
```

#### 3. リソース管理
```javascript
class MCPResourceManager {
  constructor() {
    this.activeBrowsers = new Set();
    this.maxConcurrentBrowsers = 3;
  }
  
  async managedBrowserOperation(operation) {
    if (this.activeBrowsers.size >= this.maxConcurrentBrowsers) {
      await this.waitForAvailableSlot();
    }
    
    const browserId = this.generateBrowserId();
    this.activeBrowsers.add(browserId);
    
    try {
      const result = await operation();
      return result;
    } finally {
      this.activeBrowsers.delete(browserId);
      await mcp__playwright__browser_close();
    }
  }
}
```

### 🛡️ セキュリティ強化

#### 1. 機密データ保護
```javascript
class SecureMCPHandler {
  constructor() {
    this.sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /private[_-]?key/i
    ];
  }
  
  isSensitiveData(data) {
    const dataStr = JSON.stringify(data);
    return this.sensitivePatterns.some(pattern => pattern.test(dataStr));
  }
  
  async secureMCPCall(mcpFunction, params) {
    if (this.isSensitiveData(params)) {
      console.warn("Sensitive data detected, using local processing");
      return await this.localProcessing(params);
    }
    
    return await mcpFunction(params);
  }
}
```

#### 2. アクセス制御
```javascript
const mcpPermissions = {
  github: {
    allowedOperations: ['read', 'create_pr', 'update_file'],
    forbiddenOperations: ['delete_repository', 'admin_access']
  },
  
  playwright: {
    allowedDomains: ['localhost', 'staging.example.com'],
    forbiddenDomains: ['production.example.com']
  },
  
  context7: {
    maxTokens: 10000,
    allowedLibraries: ['react', 'express', 'node']
  }
};

function validateMCPOperation(server, operation, params) {
  const permissions = mcpPermissions[server];
  
  if (permissions.forbiddenOperations?.includes(operation)) {
    throw new Error(`Operation ${operation} not allowed for ${server}`);
  }
  
  if (server === 'playwright' && params.url) {
    const domain = new URL(params.url).hostname;
    if (permissions.forbiddenDomains.includes(domain)) {
      throw new Error(`Domain ${domain} not allowed`);
    }
  }
  
  return true;
}
```

### 📊 MCP監視とメトリクス

#### 1. パフォーマンス監視
```javascript
class MCPMetrics {
  constructor() {
    this.metrics = {
      calls: 0,
      totalTime: 0,
      errors: 0,
      successRate: 0
    };
  }
  
  async measureMCPCall(mcpFunction, params) {
    const startTime = Date.now();
    this.metrics.calls++;
    
    try {
      const result = await mcpFunction(params);
      this.metrics.totalTime += Date.now() - startTime;
      this.updateSuccessRate();
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.updateSuccessRate();
      throw error;
    }
  }
  
  updateSuccessRate() {
    this.metrics.successRate = 
      ((this.metrics.calls - this.metrics.errors) / this.metrics.calls) * 100;
  }
  
  getAverageResponseTime() {
    return this.metrics.totalTime / this.metrics.calls;
  }
}
```

#### 2. アラート設定
```javascript
class MCPAlertSystem {
  constructor() {
    this.thresholds = {
      responseTime: 5000, // 5秒
      errorRate: 10, // 10%
      failureCount: 3 // 連続失敗
    };
    this.consecutiveFailures = 0;
  }
  
  checkAlerts(metrics, lastResult) {
    if (metrics.getAverageResponseTime() > this.thresholds.responseTime) {
      this.alert('PERFORMANCE', 'MCP response time exceeded threshold');
    }
    
    if (metrics.successRate < (100 - this.thresholds.errorRate)) {
      this.alert('RELIABILITY', 'MCP error rate exceeded threshold');
    }
    
    if (lastResult.success === false) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.thresholds.failureCount) {
        this.alert('CRITICAL', 'Multiple consecutive MCP failures');
      }
    } else {
      this.consecutiveFailures = 0;
    }
  }
  
  alert(level, message) {
    console.log(`[${level}] MCP Alert: ${message}`);
    // 実際のアラート送信ロジック
  }
}
```

### 1. タスク設計の原則
- **明確な目標設定**: 各MCPの目的を明確にする
- **適切な粒度**: 過度に細分化しない、過度に統合しない
- **エラー対応**: 失敗時の代替手段を準備

### 2. パフォーマンス最適化
- **キャッシュ活用**: 同じ情報の重複取得を避ける
- **並列実行**: 独立したタスクは同時実行
- **リソース管理**: 不要なブラウザセッションは適時クローズ

### 3. セキュリティ考慮事項
- **認証情報**: 必要最小限の権限で実行
- **データ保護**: 機密情報の適切な取り扱い
- **アクセス制御**: 不必要なリソースアクセスを避ける

## ⚡ ClaudeCodeActions実践ガイド

### 基本的なワークフロー

#### 1. 新機能開発の標準フロー
```javascript
// Step 1: 機能ブランチの作成
ClaudeCodeActions.createBranch("feature/advanced-image-analysis")

// Step 2: 実装作業（サブエージェント使用）
Task(description: "画像解析機能の実装", ...)

// Step 3: 変更のコミット
ClaudeCodeActions.commitChanges({
  message: "画像解析: OCRと図表認識機能を追加",
  files: ["public/image-analyzer.js", "server.js", "src/analyzers/"]
})

// Step 4: プルリクエストの作成
ClaudeCodeActions.createPullRequest({
  title: "高度な画像解析機能の追加",
  description: `
    ## 概要
    OCRとパターン認識を組み合わせた高精度な画像解析機能を実装
    
    ## 変更内容
    - Tesseract.jsによるOCR機能強化
    - 図表パターン認識アルゴリズムの追加
    - リアルタイム解析プレビュー機能
    
    ## テスト
    - [ ] OCR精度テスト
    - [ ] パターン認識テスト
    - [ ] パフォーマンステスト
  `,
  assignees: ["maintainer"],
  labels: ["enhancement", "image-processing"]
})
```

#### 2. バグ修正の迅速フロー
```javascript
// Step 1: ホットフィックスブランチ作成
ClaudeCodeActions.createHotfixBranch("hotfix/rendering-performance-issue")

// Step 2: 修正作業
// ...実装...

// Step 3: 緊急修正のコミット・デプロイ
ClaudeCodeActions.commitAndDeploy({
  message: "修正: レンダリングパフォーマンスの大幅改善",
  deployTarget: "production",
  runTests: true
})
```

### コードレビューの自動化

#### 自動品質チェック
```javascript
// コード品質の包括的チェック
const reviewResult = ClaudeCodeActions.performCodeReview({
  checks: [
    "security",      // セキュリティ脆弱性検査
    "performance",   // パフォーマンス分析
    "maintainability", // 保守性評価
    "testCoverage",  // テストカバレッジ確認
    "documentation"  // ドキュメント充実度
  ],
  standards: "enterprise" // エンタープライズレベルの品質基準
})

// 結果に基づく自動改善提案
if (reviewResult.issues.length > 0) {
  ClaudeCodeActions.suggestImprovements(reviewResult.issues)
}
```

## 🌳 Git Worktrees実践ガイド

### 並行開発のベストプラクティス

#### 1. 機能別Worktreesの管理
```bash
# 現在のWorktree状況確認
git worktree list

# 結果例:
# C:\d\PlantUML                    [main]
# C:\d\PlantUML-feature-annotation [feature/annotation-v2]
# C:\d\PlantUML-hotfix-rendering   [hotfix/svg-display-bug]
# C:\d\PlantUML-experimental-ai    [experimental/ai-assisted-generation]

# 新しいWorktreeの追加
git worktree add ../PlantUML-feature-collaboration feature/real-time-collaboration

# 不要なWorktreeの削除
git worktree remove ../PlantUML-experimental-ai
```

#### 2. 開発環境の独立管理
```bash
# 各Worktreeで独立した開発環境構築

# メイン環境（安定版）
cd C:\d\PlantUML
docker-compose -f docker-compose.prod.yml up -d  # ポート3001

# 機能開発環境
cd C:\d\PlantUML-feature-annotation
docker-compose -f docker-compose.dev.yml up -d   # ポート3002

# 実験環境
cd C:\d\PlantUML-experimental-ai
docker-compose -f docker-compose.experimental.yml up -d  # ポート3003
```

#### 3. テスト環境の分離
```javascript
// 各Worktreeで独立したテスト実行
// メイン環境でのE2Eテスト
mcp__playwright__browser_navigate(url: "http://localhost:3001")

// 機能開発環境でのテスト
mcp__playwright__browser_navigate(url: "http://localhost:3002")

// A/Bテストの実装
const testResults = {
  mainBranch: await testMainFeatures("http://localhost:3001"),
  featureBranch: await testMainFeatures("http://localhost:3002")
}
```

### Worktreesとサブエージェントの連携

#### 複数環境での並列開発
```javascript
// 複数のサブエージェントで並行作業
const parallelTasks = [
  Task({
    description: "メイン環境でのバグ修正",
    prompt: "C:\\d\\PlantUMLでレンダリングバグを修正",
    workingDirectory: "C:\\d\\PlantUML"
  }),
  
  Task({
    description: "機能開発環境での新機能実装",
    prompt: "C:\\d\\PlantUML-feature-annotationで注釈機能を実装",
    workingDirectory: "C:\\d\\PlantUML-feature-annotation"
  }),
  
  Task({
    description: "実験環境でのAI機能プロトタイプ",
    prompt: "C:\\d\\PlantUML-experimental-aiでAI支援機能を実装",
    workingDirectory: "C:\\d\\PlantUML-experimental-ai"
  })
]

// 並列実行で効率的な開発
const results = await Promise.all(parallelTasks)
```

### Worktreesの高度な活用パターン

#### 1. リリースブランチ管理
```bash
# リリース準備用Worktree
git worktree add ../PlantUML-release-v2.0 release/v2.0

# リリース候補の検証環境
cd ../PlantUML-release-v2.0
npm run build:production
docker-compose -f docker-compose.release.yml up -d
```

#### 2. 長期機能開発の管理
```bash
# 長期機能開発用のWorktree
git worktree add ../PlantUML-epic-enterprise enterprise/advanced-features

# 定期的な統合テスト
cd ../PlantUML-epic-enterprise
git merge main  # 定期的なメインブランチとの統合
npm test        # 統合テストの実行
```

#### 3. 顧客デモ環境の独立管理
```bash
# 顧客デモ専用環境
git worktree add ../PlantUML-demo-client-A demo/client-a-customization
git worktree add ../PlantUML-demo-client-B demo/client-b-integration

# 各デモ環境で独立した設定とカスタマイゼーション
```

### 🔄 5ツール統合の完全ワークフロー例

#### 大型機能開発プロジェクト
```javascript
// Phase 1: プロジェクト準備
git worktree add ../PlantUML-epic-ai-integration epic/ai-integration

TodoWrite([
  {id: "setup", content: "Git Worktree環境セットアップ", status: "completed"},
  {id: "research", content: "AI統合技術の調査", status: "pending"},
  {id: "architecture", content: "システムアーキテクチャ設計", status: "pending"},
  {id: "implementation", content: "AI機能実装", status: "pending"},
  {id: "integration", content: "既存システムとの統合", status: "pending"},
  {id: "testing", content: "包括的テスト実行", status: "pending"},
  {id: "review", content: "コードレビューとPR作成", status: "pending"}
])

// Phase 2: 調査フェーズ（サブエージェント活用）
Task({
  description: "AI統合技術調査",
  prompt: `
    以下の観点でAI統合技術を調査：
    1. mcp__context7__*で最新AI技術情報収集
    2. mcp__fetch__*で競合分析
    3. 技術選定とアーキテクチャ提案作成
  `,
  subagent_type: "general-purpose"
})

// Phase 3: 実装フェーズ（MCP + サブエージェント）
Task({
  description: "AI機能実装",
  prompt: `
    AI統合機能を実装：
    1. フロントエンド: AIアシスタント機能
    2. バックエンド: AI API統合
    3. mcp__playwright__*で動作確認
  `,
  workingDirectory: "C:\\d\\PlantUML-epic-ai-integration"
})

// Phase 4: 統合・テスト（MCP活用）
mcp__playwright__browser_navigate(url: "http://localhost:3004")
mcp__playwright__browser_type(element: "AI入力フィールド", text: "複雑なシーケンス図を生成して")

// Phase 5: コードレビュー・PR（ClaudeCodeActions）
ClaudeCodeActions.performCodeReview({
  scope: "epic/ai-integration",
  includeSecurityScan: true,
  includePerformanceAnalysis: true
})

ClaudeCodeActions.createPullRequest({
  title: "🤖 AI統合機能の追加 - 自動図生成とインテリジェント支援",
  description: `
    ## 🎯 概要
    自然言語からのPlantUML自動生成とAI支援機能を実装
    
    ## ✨ 新機能
    - 🧠 自然言語からの図表自動生成
    - 🤖 インテリジェントな図表改善提案
    - 📊 コンテキスト認識による最適化
    
    ## 🔧 技術実装
    - OpenAI GPT-4統合
    - リアルタイム図表解析
    - 機械学習ベースの図表最適化
  `,
  milestone: "v2.0-AI-Integration"
})

// Phase 6: 最終確認（TodoWrite更新）
TodoWrite([
  {id: "setup", content: "Git Worktree環境セットアップ", status: "completed"},
  {id: "research", content: "AI統合技術の調査", status: "completed"},
  {id: "architecture", content: "システムアーキテクチャ設計", status: "completed"},
  {id: "implementation", content: "AI機能実装", status: "completed"},
  {id: "integration", content: "既存システムとの統合", status: "completed"},
  {id: "testing", content: "包括的テスト実行", status: "completed"},
  {id: "review", content: "コードレビューとPR作成", status: "completed"}
])
```

この統合ワークフローにより、5つのツールの力を最大限に活用した効率的で品質の高い開発が実現できます。

## 📋 TodoWriteツール活用ガイド（要点）

### TodoWriteツールの概要と重要性

#### なぜTodoWriteが重要なのか
TodoWriteツールは、Claude Codeでの開発作業において**作業の可視化・進捗管理・品質担保**を実現する中核ツールです：

1. **ユーザーへの進捗可視化**
   - 現在何をしているかをリアルタイムで把握可能
   - 完了したタスクと残りのタスクが明確
   - 作業全体のボリュームと進捗率が見える

2. **プロジェクト管理における役割**
   - 複雑な作業の構造化と整理
   - 依存関係や優先度の明確化
   - 作業漏れの防止とミス削減

3. **品質担保**
   - 各段階での確認ポイントを設定
   - 作業完了の定義を明確化
   - バックトラッキングによる問題解決

### 🎯 TodoWrite必須使用ケース（代表例のみ）

以下のケースでは、**必ずTodoWriteツールを使用**してタスクを管理してください：

#### 1. 複数ステップの作業（3ステップ以上）
```javascript
// 例：新機能実装
TodoWrite([
  {id: "1", content: "要件分析と技術調査", status: "pending"},
  {id: "2", content: "アーキテクチャ設計", status: "pending"},
  {id: "3", content: "コード実装（フロントエンド）", status: "pending"},
  {id: "4", content: "コード実装（バックエンド）", status: "pending"},
  {id: "5", content: "テスト作成・実行", status: "pending"},
  {id: "6", content: "ドキュメント更新", status: "pending"}
])
```

詳細は `.claude/todowrite.md` を参照。

#### 3. デバッグ作業
```javascript
// デバッグワークフロー例
TodoWrite([
  {id: "1", content: "問題の再現と現象確認", status: "in_progress"},
  {id: "2", content: "ログとエラー情報の収集", status: "pending"},
  {id: "3", content: "原因の特定と仮説立案", status: "pending"},
  {id: "4", content: "修正案の実装", status: "pending"},
  {id: "5", content: "修正内容のテスト", status: "pending"},
  {id: "6", content: "デバッグレポート作成", status: "pending"}
])
```

#### 4. PRD作成・更新作業
```javascript
// PRD更新ワークフロー
TodoWrite([
  {id: "1", content: "既存PRDの内容確認", status: "pending"},
  {id: "2", content: "追加機能の要件定義", status: "pending"},
  {id: "3", content: "技術仕様の詳細化", status: "pending"},
  {id: "4", content: "ユースケースの作成", status: "pending"},
  {id: "5", content: "テスト計画の策定", status: "pending"},
  {id: "6", content: "PRDファイルの更新", status: "pending"},
  {id: "7", content: "関連ドキュメントの同期", status: "pending"}
])
```

#### 5. リファクタリング作業
- コードの再構造化
- パフォーマンス最適化
- アーキテクチャ改善
- 依存関係の整理

#### 6. テスト実装
- E2Eテストスイートの作成
- ユニットテストの網羅的実装
- パフォーマンステストの設計
- セキュリティテストの実行

### 🔄 TodoWriteの効果的な使い方（代表例のみ）
詳細は `.claude/todowrite.md` を参照。

#### 1. タスクの適切な粒度設定

**良い例（適切な粒度）**:
```javascript
TodoWrite([
  {id: "1", content: "annotation.jsファイルの読み込みと現状分析", status: "pending"},
  {id: "2", content: "Canvas APIを使用したペンツール機能の実装", status: "pending"},
  {id: "3", content: "矢印描画機能の追加", status: "pending"},
  {id: "4", content: "テキスト入力機能の実装", status: "pending"},
  {id: "5", content: "消しゴム機能の実装", status: "pending"},
  {id: "6", content: "統合テストの実行", status: "pending"}
])
```

**悪い例（粒度が粗すぎ）**:
```javascript
TodoWrite([
  {id: "1", content: "注釈機能全体の実装", status: "pending"}, // 粗すぎ
  {id: "2", content: "テストの実行", status: "pending"}        // 粗すぎ
])
```

**悪い例（粒度が細かすぎ）**:
```javascript
TodoWrite([
  {id: "1", content: "annotation.jsファイルを開く", status: "pending"},      // 細かすぎ
  {id: "2", content: "1行目を読む", status: "pending"},                    // 細かすぎ
  {id: "3", content: "console.logを追加", status: "pending"}               // 細かすぎ
])
```

#### 2. ステータス管理の原則

**ステータスの定義**:
- `pending`: タスク未開始（初期状態）
- `in_progress`: 現在作業中（**同時に1つのタスクのみ**）
- `completed`: タスク完了

**重要な管理原則**:
1. **1つずつin_progressにする**: 同時に複数のタスクをin_progressにしない
2. **リアルタイム更新**: 作業開始時は即座にin_progressに変更
3. **即座の完了更新**: タスク完了時は即座にcompletedに変更
4. **完了の厳格な定義**: テストが通らない、エラーがある場合は完了にしない

#### 3. リアルタイム更新の重要性

**作業開始時**:
```javascript
// 作業開始前に必ずステータス更新
TodoWrite([
  {id: "1", content: "PRD分析", status: "completed"},
  {id: "2", content: "技術仕様作成", status: "in_progress"}, // 開始時に更新
  {id: "3", content: "実装", status: "pending"}
])
```

**作業完了時**:
```javascript
// 作業完了後に即座にステータス更新
TodoWrite([
  {id: "1", content: "PRD分析", status: "completed"},
  {id: "2", content: "技術仕様作成", status: "completed"}, // 完了時に更新
  {id: "3", content: "実装", status: "in_progress"}       // 次のタスク開始
])
```

### 🤖 TodoWriteとサブエージェント/MCPの連携（外部化）
詳細は `.claude/todowrite.md` と `.claude/mcp-guide.md` を参照。

#### 1. サブエージェント実行前後のTodo更新

**実行前**:
```javascript
// サブエージェント実行前にタスクをin_progressに
TodoWrite([
  {id: "3", content: "サブエージェントによる複雑な実装タスク", status: "in_progress"}
])

// サブエージェント実行
Task(
  description: "複雑な実装作業",
  prompt: "詳細な実装指示...",
  subagent_type: "general-purpose"
)
```

**実行後**:
```javascript
// サブエージェント完了後にステータス更新
TodoWrite([
  {id: "3", content: "サブエージェントによる複雑な実装タスク", status: "completed"},
  {id: "4", content: "実装結果の検証", status: "in_progress"}
])
```

#### 2. MCP操作時のTodo管理

**Playwright MCP使用例**:
```javascript
TodoWrite([
  {id: "5", content: "Playwright MCPによる自動テスト実行", status: "in_progress"}
])

// MCP実行
mcp__playwright__browser_navigate(url: "http://localhost:3001")
mcp__playwright__browser_type(...)
mcp__playwright__browser_click(...)

// 完了後更新
TodoWrite([
  {id: "5", content: "Playwright MCPによる自動テスト実行", status: "completed"},
  {id: "6", content: "テスト結果の分析", status: "in_progress"}
])
```

#### 3. エラー発生時のTodo再計画

**エラー発生時の対応**:
```javascript
// エラー発生時は新しいタスクを追加
TodoWrite([
  {id: "4", content: "実装作業", status: "in_progress"}, // エラーで中断
  {id: "4-error", content: "エラー原因調査", status: "pending"},
  {id: "4-fix", content: "エラー修正", status: "pending"},
  {id: "4-retest", content: "修正後テスト", status: "pending"}
])
```

### 📝 具体的な使用例（外部化）
テンプレや詳細例は `.claude/todowrite.md` を参照。

#### 1. PRD更新作業のTodo管理
```javascript
TodoWrite([
  {id: "prd-1", content: "既存PRD（PRD_完全統合版.md）の全体構造確認", status: "pending"},
  {id: "prd-2", content: "追加機能（注釈・画像解析）の要件整理", status: "pending"},
  {id: "prd-3", content: "技術仕様セクションの詳細化", status: "pending"},
  {id: "prd-4", content: "ユースケースの具体的なシナリオ作成", status: "pending"},
  {id: "prd-5", content: "テスト計画とテストケースの策定", status: "pending"},
  {id: "prd-6", content: "API仕様の詳細ドキュメント作成", status: "pending"},
  {id: "prd-7", content: "PRDファイルの統合・更新", status: "pending"},
  {id: "prd-8", content: "関連ドキュメントとの整合性確認", status: "pending"}
])
```

#### 2. 機能実装のTodo管理
```javascript
TodoWrite([
  {id: "impl-1", content: "既存コード（main.js, annotation.js）の分析", status: "pending"},
  {id: "impl-2", content: "新機能の設計とアーキテクチャ検討", status: "pending"},
  {id: "impl-3", content: "フロントエンド実装（UI/UX改善）", status: "pending"},
  {id: "impl-4", content: "バックエンドAPI実装（Express.js）", status: "pending"},
  {id: "impl-5", content: "統合テスト（Playwright MCPによる自動テスト）", status: "pending"},
  {id: "impl-6", content: "エラーハンドリングとログ機能の実装", status: "pending"},
  {id: "impl-7", content: "パフォーマンス最適化", status: "pending"},
  {id: "impl-8", content: "ドキュメント更新（コメント・README等）", status: "pending"}
])
```

#### 3. デバッグ作業のTodo管理
```javascript
TodoWrite([
  {id: "debug-1", content: "問題の再現と現象の詳細確認", status: "pending"},
  {id: "debug-2", content: "ブラウザコンソールとネットワークログの収集", status: "pending"},
  {id: "debug-3", content: "サーバーログ（Docker/Express）の確認", status: "pending"},
  {id: "debug-4", content: "原因の特定と影響範囲の調査", status: "pending"},
  {id: "debug-5", content: "修正方針の検討と実装", status: "pending"},
  {id: "debug-6", content: "修正内容のテスト", status: "pending"},
  {id: "debug-7", content: "リグレッションテストの実行", status: "pending"},
  {id: "debug-8", content: "デバッグレポートの作成", status: "pending"}
])
```

#### 4. 複数ファイル編集のTodo管理
```javascript
TodoWrite([
  {id: "multi-1", content: "対象ファイルの特定と依存関係分析", status: "pending"},
  {id: "multi-2", content: "変更影響範囲の評価", status: "pending"},
  {id: "multi-3", content: "main.jsファイルの修正", status: "pending"},
  {id: "multi-4", content: "annotation.jsファイルの修正", status: "pending"},
  {id: "multi-5", content: "image-analyzer.jsファイルの修正", status: "pending"},
  {id: "multi-6", content: "server.jsファイルの修正", status: "pending"},
  {id: "multi-7", content: "package.jsonとDocker設定の更新", status: "pending"},
  {id: "multi-8", content: "統合テストと動作確認", status: "pending"}
])
```

### ✨ ベストプラクティス

#### 1. タスク完了時の即座の更新
```javascript
// ❌ 悪い例：複数タスクをまとめて更新
// 作業完了後にまとめて更新するのは避ける

// ✅ 良い例：1つずつ即座に更新
// タスク完了の度に即座にステータス更新
TodoWrite([
  {id: "1", content: "分析完了", status: "completed"}, // 完了時に即更新
  {id: "2", content: "実装中", status: "in_progress"}  // 開始時に即更新
])
```

#### 2. 見積もり時間の記載
```javascript
TodoWrite([
  {id: "1", content: "コードベース分析（予想：15分）", status: "pending"},
  {id: "2", content: "機能実装（予想：45分）", status: "pending"},
  {id: "3", content: "テスト作成（予想：30分）", status: "pending"}
])
```

#### 3. 依存関係の明確化
```javascript
TodoWrite([
  {id: "1", content: "API設計（基盤作業）", status: "pending"},
  {id: "2", content: "フロントエンド実装（depends on #1）", status: "pending"},
  {id: "3", content: "統合テスト（depends on #1, #2）", status: "pending"}
])
```

#### 4. ブロッカーの記録
```javascript
TodoWrite([
  {id: "3", content: "外部API連携実装", status: "pending"},
  {id: "3-blocker", content: "【ブロッカー】API仕様書の確認が必要", status: "pending"},
  {id: "4", content: "テスト実装", status: "pending"}
])
```

#### 5. 作業完了基準の明確化
```javascript
TodoWrite([
  {id: "1", content: "機能実装（完了基準：エラーなし、テスト通過、レビュー完了）", status: "pending"},
  {id: "2", content: "ドキュメント作成（完了基準：コード例含む、査読完了）", status: "pending"}
])
```

### 🚫 TodoWrite使用時の注意事項

#### 使用しない例外ケース
- 単一の簡単なファイル読み取り
- 1-2コマンドの簡単な状態確認
- 純粋に情報提供のみの作業
- 1分以内で完了する単純な作業

#### 避けるべき使用パターン
```javascript
// ❌ 避ける：粒度が不適切
TodoWrite([
  {id: "1", content: "すべてをやる", status: "pending"}  // 粗すぎ
])

// ❌ 避ける：複数タスクを同時にin_progress
TodoWrite([
  {id: "1", content: "実装", status: "in_progress"},
  {id: "2", content: "テスト", status: "in_progress"}  // 同時進行は避ける
])

// ❌ 避ける：完了していないのにcompletedにする
TodoWrite([
  {id: "1", content: "実装", status: "completed"}  // エラーが残っているのに完了にしない
])
```

### 🎯 まとめ：TodoWrite活用の黄金律

1. **3ステップ以上の作業は必須使用**
2. **1つずつin_progressにする**
3. **完了時は即座にステータス更新**
4. **適切な粒度でタスクを分割**
5. **エラー時は完了にしない**
6. **見積もり時間と依存関係を記録**
7. **ブロッカーは別タスクとして管理**

### 🚀 上級者向けTodoWrite活用技法（詳細は外出し）

- 要点: 動的タスク調整、完了予測、品質ゲート、チーム協調、AI支援生成、メトリクス改善
- 詳細は `.claude/todowrite-advanced.md` を参照

## 🎯 5つのツール統合のまとめ：黄金律

### 📋 TodoWriteツール
- **役割**: 作業の可視化と進捗管理の中核
- **必須**: 3ステップ以上の作業は必ず使用
- **原則**: 1つずつin_progress、完了時即座更新

### 🤖 サブエージェント（Task tool）
- **役割**: 複雑な処理と専門的タスクの実行エンジン
- **必須**: コード実装、調査、テスト、ドキュメント作成
- **原則**: 複雑な作業は必ずサブエージェントに委譲

### 🔧 MCPサーバー
- **役割**: 外部システムとの統合ハブ
- **必須**: GitHub、Playwright、Context7、Fetch、IDE連携
- **原則**: MCP利用可能時は必ず優先使用

### ⚡ ClaudeCodeActions
- **役割**: Git操作とコードレビューの自動化エンジン
- **必須**: ブランチ管理、コミット、PR作成、品質チェック
- **原則**: 開発ワークフローの標準化と効率化

### 🌳 Git Worktrees
- **役割**: 並行開発と機能分離の基盤
- **必須**: 複数機能の同時開発、実験的機能、リリース管理
- **原則**: 機能別環境分離による効率的な開発

### 🔄 統合活用の黄金律

1. **順序の原則**: Worktrees → TodoWrite → サブエージェント → MCP → ClaudeCodeActions
2. **並列の原則**: 独立したタスクは可能な限り並列実行
3. **分離の原則**: 機能開発は独立したWorktreeで実行
4. **自動化の原則**: 手動操作はClaudeCodeActionsで自動化
5. **品質の原則**: すべてのフェーズで品質チェックを統合

### 🚀 最大効果を得るためのポイント

#### 開発効率の最大化
- **Git Worktrees**で環境分離 → **サブエージェント**で並列実装 → **MCP**で統合テスト

#### 品質保証の自動化  
- **TodoWrite**で完了基準明確化 → **ClaudeCodeActions**で自動レビュー → **MCP**で包括テスト

#### チーム開発の標準化
- **Git Worktrees**で作業分離 → **ClaudeCodeActions**で統一フロー → **TodoWrite**で進捗共有

この5つのツールの統合活用により、個人開発からチーム開発まで、あらゆる規模の開発プロジェクトで最高レベルの効率性と品質を実現できます。

## draw.io連携技術仕様（要点）

- 統合仕様・最適化・XML詳細は `.claude/drawio.md` を参照。

## リソース（要点）
- 公式/内部リンク集は `.claude/resources.md` に集約。