## ⚡ ClaudeCodeActions実践ガイド（外出し）

### 目的
Git操作とコードレビューの自動化により、ブランチ管理、コミット、PR、レビューを標準化する。

### 最小フロー
1. ブランチ作成
2. 変更のコミット
3. PR作成
4. 自動レビュー（必要に応じて）

### 推奨チェック
- セキュリティ、パフォーマンス、保守性、テスト、ドキュメント

詳細なコマンド例・テンプレートは元章にあったコード例を参照のうえ、プロジェクトポリシーに合わせて調整してください。

# ClaudeCodeActions ガイド（外出し）

## 要点
- Git操作、PR作成、レビューの自動化で開発フローを標準化
- 例: createFeatureBranch → commitAndPush → createPullRequest → performCodeReview

## サンプル
```javascript
// 新機能ブランチ作成からPR作成までの最短例
ClaudeCodeActions.createFeatureBranch("feature/new-annotation-tools");
ClaudeCodeActions.commitAndPush("feat: 注釈ツール追加");
ClaudeCodeActions.createPullRequest({ title: "注釈機能追加", description: "概要..." });
ClaudeCodeActions.performCodeReview();
```

## ベストプラクティス
- コミットメッセージは慣例に沿う（feat/fix/chore）
- セキュリティ/パフォーマンスの自動チェックを有効に
- 大きなPRは避け、こまめにブランチ分割

