## 🎯 5つのツール統合のまとめ（外出し）

### 構成要素
- TodoWrite: 作業の可視化・進捗管理
- サブエージェント(Task): 複雑/専門タスクの実行
- MCP: 外部統合（github/playwright/context7/fetch/ide）
- ClaudeCodeActions: Git/PR/レビュー自動化
- Git Worktrees: 並行開発・機能分離

### 黄金律
1. 順序: Worktrees → TodoWrite → サブエージェント → MCP → ClaudeCodeActions
2. 並列: 独立タスクは並行実行
3. 分離: 機能単位で環境分離
4. 自動化: 手動操作は自動化
5. 品質: 全フェーズで品質チェック

### 効果
- 開発効率、品質、チーム標準化の最大化

詳細な例は CLAUDE.md の該当章から本ファイルへ移しました。必要に応じて拡充してください。



