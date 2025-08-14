# エージェントメンテナンスガイド

## 📋 エージェント管理の基本方針

### 1. エージェントの種類
- **ビルトインエージェント**: システム標準（general-purpose等）
- **カスタムエージェント**: `.claude/agents/`配下の仕様書

### 2. CLAUDE.mdの役割
- プロジェクト全体でのエージェント一覧管理
- 各エージェントの用途と詳細の簡潔な説明
- エージェント選択の指針提供

## 🔄 定期メンテナンス手順

### 月次チェック項目
1. **新規エージェントの確認**
   ```bash
   # .claude/agents/ディレクトリの全ファイルリスト
   ls -la .claude/agents/*.md
   ```

2. **CLAUDE.mdとの照合**
   - 未登録エージェントの特定
   - 削除済みエージェントの除去
   - 情報の最新化

3. **エージェント仕様の検証**
   ```bash
   # 各エージェントのname:フィールド確認
   grep "^name:" .claude/agents/*.md
   ```

## 📝 エージェント登録テンプレート

### CLAUDE.mdへの追加形式
```markdown
| エージェント名 | 用途 | 詳細 |
|------------|------|------|
| [agent-name] | [簡潔な用途説明] | [専門領域・特徴（モデル）] |
```

### 例
```markdown
| code-analyzer | コード品質分析 | 静的解析・メトリクス測定（sonnet） |
```

## 🚀 新規エージェント追加手順

1. **エージェントファイル作成**
   - パス: `.claude/agents/[agent-name].md`
   - テンプレート使用（下記参照）

2. **CLAUDE.md更新**
   - サブエージェント一覧表に追加
   - アルファベット順または機能別に整理

3. **動作確認**
   ```javascript
   // general-purpose経由でテスト
   await Task({
     description: "テスト実行",
     subagent_type: "general-purpose",
     prompt: "[agent-name]の仕様に従って動作確認"
   })
   ```

## 📄 エージェント仕様書テンプレート

```markdown
---
name: [agent-name]
description: [Use PROACTIVELY for/MUST BE USED when条件を含む詳細説明]
tools: [必要なツールをカンマ区切り]
model: [haiku/sonnet/opus]
priority: [high/medium/low]
---

# [エージェント名（人間が読みやすい形式）]

You are a [専門領域] specialist with expertise in [具体的なスキル].

## Core Responsibilities
1. [主要責任1]
2. [主要責任2]
3. [主要責任3]

## Technical Standards
- [技術標準1]
- [技術標準2]

## Workflow Protocol
### Phase 1: [フェーズ名]
- [手順1]
- [手順2]

### Phase 2: [フェーズ名]
- [手順1]
- [手順2]

## Success Criteria
- [ ] [測定可能な成功基準1]
- [ ] [測定可能な成功基準2]

## Error Handling Protocol
- [エラー種別1]: [対処法]
- [エラー種別2]: [対処法]
```

## 🔍 エージェント活用のベストプラクティス

### 1. 適切なエージェント選択
- タスクの複雑さに応じてモデル選択（haiku/sonnet/opus）
- 専門性が必要な場合は専門エージェント
- 汎用的なタスクはgeneral-purpose

### 2. 並列実行の活用
```javascript
// 独立したタスクは並列実行
const results = await Promise.all([
  Task({ /* エージェント1 */ }),
  Task({ /* エージェント2 */ }),
  Task({ /* エージェント3 */ })
]);
```

### 3. エージェント間の連携
- 前段エージェントの出力を次段エージェントの入力に
- コンテキスト共有を明示的に行う
- TodoWriteで進捗管理

## 📊 現在のエージェント登録状況（2025-08-14）

### 登録済み（13個）
✅ general-purpose
✅ main-orchestrator
✅ agent-orchestrator
✅ ai-driven-app-architect
✅ webapp-test-automation
✅ web-debug-specialist
✅ software-doc-writer
✅ dev-ticket-manager
✅ docker-dev-env-builder
✅ mcp-server-setup-expert
✅ claude-code-config-expert
✅ subagent-developer

### 未実装（ファイルなし）
❌ orchestrator（agent-orchestratorと統合検討）

## 🛠️ トラブルシューティング

### Q: エージェントが認識されない
A: カスタムエージェントは直接呼び出し不可。general-purpose経由で使用。

### Q: エージェント仕様の更新が反映されない
A: ファイルを直接編集後、新しいタスクで仕様を参照。

### Q: どのエージェントを使うべきか不明
A: CLAUDE.mdの一覧表を参照、不明な場合はgeneral-purposeを使用。

## 📅 メンテナンススケジュール

- **週次**: 新規作成エージェントの確認
- **月次**: CLAUDE.md更新、未使用エージェントの整理
- **四半期**: エージェント仕様の見直し、最適化

---
最終更新: 2025-01-14
作成者: Claude Code