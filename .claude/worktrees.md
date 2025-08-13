## 🌳 Git Worktrees実践ガイド（外出し）

### 目的
機能ごとに作業ディレクトリを分離し、安全かつ効率的な並行開発を実現する。

### 基本
- worktree list / add / remove
- 環境ごとの独立実行（ポート分離など）
- テスト環境分離とA/B比較

### ベストプラクティス
- 同一ファイル同時編集の回避（直列化）
- 長期機能開発/リリースブランチ/顧客デモ環境の分離

詳細なコマンド例・高度なワークフローは元章のコード例を参照し、プロジェクト運用に合わせて更新してください。

# Git Worktrees ガイド（外出し）

## 要点
- 機能/修正/実験ごとにワークツリーを分離し並行開発を安全に実施

## 基本コマンド
```bash
# 作成
git worktree add ../plantuml-feature-annotation feature/annotation-tools
# 削除
git worktree remove ../plantuml-feature-annotation
# 一覧
git worktree list
```

## ベストプラクティス
- 1ワークツリー=1テーマを徹底
- 依存が強い変更は小さく分割
- CI/テスト環境はワークツリーごとに独立

