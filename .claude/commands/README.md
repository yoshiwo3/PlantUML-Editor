# Claude Code Custom Slash Commands

このディレクトリには、Claude Code用のカスタムスラッシュコマンドが含まれています。

## 📁 ディレクトリ構造

```
.claude/commands/
├── agents/          # エージェント実行コマンド
│   ├── debug.md    # /debug - フロントエンドデバッグ
│   ├── review.md   # /review - コードレビュー
│   ├── architect.md # /architect - システム設計
│   ├── test.md     # /test - 自動テスト実行
│   └── audit.md    # /audit - 仕様実装監査
├── git/            # Git操作コマンド
│   ├── commit.md   # /commit - Git コミット作成
│   └── pr.md       # /pr - Pull Request作成
├── test/           # テスト実行コマンド
│   ├── e2e.md      # /e2e - E2Eテスト実行
│   └── unit.md     # /unit - ユニットテスト実行
├── docker/         # Docker操作コマンド
│   ├── build.md    # /build - Dockerビルド
│   └── up.md       # /up - Docker起動
├── plantuml.md     # /plantuml - PlantUML変換
├── todo.md         # /todo - Todo追加
├── fix.md          # /fix - エラー修正
└── README.md       # このファイル
```

## 🚀 使用方法

### 基本的な使い方

```
/[コマンド名] [引数]
```

### エージェントコマンド

#### /debug
フロントエンドのエラーをデバッグ
```
/debug STEP2でPlantUMLParserが初期化されないエラー
```

#### /review
コードレビューを実行
```
/review src/app.js
/review PlantUML_Editor_Proto/
```

#### /architect
システムアーキテクチャを設計
```
/architect マイクロサービス構成のAPI設計
```

#### /test
自動テストを実行
```
/test ユーザー登録フローのE2Eテスト
```

#### /audit
仕様書と実装の整合性を監査
```
/audit PRD_完全統合版.md
```

### Git操作

#### /commit
Gitコミットを作成
```
/commit feat(editor): インライン編集機能を実装
```

#### /pr
Pull Requestを作成
```
/pr インライン編集機能の実装
```

### テスト実行

#### /e2e
E2Eテストを実行
```
/e2e ユーザー登録シナリオ
```

#### /unit
ユニットテストを実行
```
/unit PlantUMLParser
```

### Docker操作

#### /build
Dockerコンテナをビルド
```
/build app
/build all
```

#### /up
Dockerサービスを起動
```
/up
/up app
```

### その他のコマンド

#### /plantuml
日本語テキストをPlantUML図に変換
```
/plantuml ユーザーがログインして商品を購入するフロー
```

#### /todo
タスクをTodoリストに追加
```
/todo STEP3の実装を完了させる
```

#### /fix
エラーを自動修正
```
/fix TypeError: Cannot read property 'length' of undefined
```

## 🛠️ カスタムコマンドの作成

新しいコマンドを作成するには：

1. `.claude/commands/`に新しい`.md`ファイルを作成
2. YAMLフロントマターを追加：

```markdown
---
allowed-tools: Tool1, Tool2, Tool3
argument-hint: <expected arguments>
description: Brief command description
model: claude-3-opus-20240229  # オプション
---

# Command Title

Command implementation details...

Use $ARGUMENTS to reference user input.
```

3. ファイル名がコマンド名になります（例：`mycommand.md` → `/mycommand`）

## 📝 YAMLフロントマター仕様

| フィールド | 説明 | 必須 |
|----------|------|------|
| `allowed-tools` | 使用可能なツールのリスト | Yes |
| `argument-hint` | 期待される引数のヒント | No |
| `description` | コマンドの簡潔な説明 | Yes |
| `model` | 使用するモデル（省略時はデフォルト） | No |

## 🔧 ツール指定形式

### 基本形式
```yaml
allowed-tools: Read, Write, Edit
```

### パターンマッチング
```yaml
allowed-tools: Bash(git:*), Bash(npm:*)
```

### MCP ツール
```yaml
allowed-tools: mcp__playwright__*, mcp__github__*
```

## 💡 ベストプラクティス

1. **明確な説明**: `description`は簡潔で分かりやすく
2. **引数ヒント**: `argument-hint`で期待される入力を明示
3. **適切なツール**: 必要最小限のツールのみを許可
4. **エラー処理**: コマンド内でエラーケースを考慮
5. **ドキュメント**: コマンド内に使用例を含める

## 🔍 トラブルシューティング

### コマンドが認識されない
- ファイル名と拡張子を確認（`.md`必須）
- YAMLフロントマターの形式を確認

### ツールが使用できない
- `allowed-tools`に必要なツールが含まれているか確認
- ツール名とパターンが正しいか確認

### 引数が渡されない
- `$ARGUMENTS`を使用して引数を参照
- `argument-hint`で期待される形式を明示

## 📚 参考資料

- [Claude Code公式ドキュメント - Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- [プロジェクトCLAUDE.md](../../CLAUDE.md)
- [エージェント仕様](./../agents/)