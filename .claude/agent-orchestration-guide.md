# エージェントオーケストレーション実装ガイド

## 問題と解決策
カスタムエージェント（.claude/agents/配下）は直接呼び出しできないため、以下の方法で活用します。

## 実装方法

### 方法1: general-purposeエージェント経由での実行
```javascript
// エージェント仕様を読み込んで実行
await Task({
  description: "agent-orchestratorの仕様に従って実行",
  subagent_type: "general-purpose",
  prompt: `
    .claude/agents/agent-orchestrator.mdの仕様に従って以下を実行:
    1. タスクを分析
    2. 適切なサブタスクに分解
    3. 各タスクを順次/並列実行
    
    実行するタスク: [具体的なタスク内容]
  `
})
```

### 方法2: エージェント仕様を組み込んだプロンプト
```javascript
// エージェントの役割を明示的に指定
await Task({
  description: "オーケストレーション実行",
  subagent_type: "general-purpose",
  prompt: `
    あなたはAgent Orchestratorとして以下を実行してください：
    
    ## 役割
    - 複雑なタスクを分析し、適切なサブタスクに分解
    - 各タスクの依存関係を特定
    - 並列/順次実行の最適化
    
    ## 利用可能な専門知識
    - ai-driven-app-architect: システム設計
    - webapp-test-automation: テスト自動化
    - web-debug-specialist: デバッグ
    - docker-dev-env-builder: Docker環境構築
    - software-doc-writer: ドキュメント作成
    
    ## 実行タスク
    [具体的なタスク]
  `
})
```

### 方法3: 複数タスクの並列実行パターン
```javascript
// 独立したタスクを並列実行
const results = await Promise.all([
  Task({
    description: "フロントエンド開発",
    subagent_type: "general-purpose",
    prompt: "web-debug-specialistの仕様に従ってUIコンポーネントを作成"
  }),
  Task({
    description: "テスト作成",
    subagent_type: "general-purpose",
    prompt: "webapp-test-automationの仕様に従ってE2Eテストを作成"
  }),
  Task({
    description: "ドキュメント作成",
    subagent_type: "general-purpose",
    prompt: "software-doc-writerの仕様に従ってAPIドキュメントを作成"
  })
]);
```

## エージェント仕様の活用方法

### 1. 仕様書の参照
```javascript
// エージェント仕様を読み込む
const agentSpec = await Read({
  file_path: ".claude/agents/agent-orchestrator.md"
});

// 仕様に基づいてタスクを実行
await Task({
  description: "仕様に基づく実行",
  subagent_type: "general-purpose",
  prompt: `以下の仕様に従って実行:\n${agentSpec}\n\nタスク: [具体的な内容]`
})
```

### 2. TodoWriteとの連携
```javascript
// 複雑なワークフローの管理
await TodoWrite({
  todos: [
    { id: "1", content: "タスク分析（agent-orchestrator仕様）", status: "pending" },
    { id: "2", content: "フロントエンド実装（web-debug-specialist仕様）", status: "pending" },
    { id: "3", content: "バックエンド実装（ai-driven-app-architect仕様）", status: "pending" },
    { id: "4", content: "テスト実装（webapp-test-automation仕様）", status: "pending" },
    { id: "5", content: "統合テスト", status: "pending" }
  ]
});
```

## 利用可能なカスタムエージェント仕様

| エージェント | 役割 | 主な用途 |
|------------|------|---------|
| main-orchestrator | メイン統括 | 複雑なワークフロー全体の管理 |
| agent-orchestrator | エージェント調整 | 複数エージェントの連携 |
| subagent-developer | エージェント開発 | 新規エージェント仕様の作成 |
| ai-driven-app-architect | システム設計 | アーキテクチャ設計 |
| webapp-test-automation | テスト自動化 | E2E/単体テスト |
| web-debug-specialist | デバッグ | フロントエンド問題解決 |
| docker-dev-env-builder | Docker環境 | コンテナ環境構築 |
| mcp-server-setup-expert | MCP設定 | MCP統合 |
| software-doc-writer | ドキュメント | 技術文書作成 |
| dev-ticket-manager | チケット管理 | プロジェクト管理 |
| claude-code-config-expert | Claude設定 | 環境最適化 |

## ベストプラクティス

1. **明確な指示**: エージェント仕様を参照する際は具体的に指定
2. **並列実行**: 独立したタスクは同時実行で効率化
3. **進捗管理**: TodoWriteで複雑なワークフローを可視化
4. **エラー処理**: 各タスクに適切なエラーハンドリングを実装

## 実例：PlantUMLプロジェクトのオーケストレーション

```javascript
// PlantUMLプロジェクトの複合タスク実行
async function orchestratePlantUMLTasks() {
  // 1. タスク分析
  const analysis = await Task({
    description: "プロジェクト分析",
    subagent_type: "general-purpose",
    prompt: `
      agent-orchestratorとして以下を分析:
      - 現在のプロジェクト状態
      - 必要なタスク
      - 実行順序の最適化
    `
  });

  // 2. 並列実行可能なタスク
  const parallelTasks = await Promise.all([
    Task({
      description: "Docker環境最適化",
      subagent_type: "general-purpose",
      prompt: "docker-dev-env-builderの仕様に従ってDocker環境を最適化"
    }),
    Task({
      description: "テストスイート作成",
      subagent_type: "general-purpose",
      prompt: "webapp-test-automationの仕様に従ってE2Eテストを作成"
    })
  ]);

  // 3. 結果の統合
  const integration = await Task({
    description: "結果統合",
    subagent_type: "general-purpose",
    prompt: "すべての結果を統合してレポート作成"
  });

  return { analysis, parallelTasks, integration };
}
```

## トラブルシューティング

### Q: カスタムエージェントが認識されない
A: 現在のClaude Codeではカスタムエージェントの直接呼び出しは未サポート。general-purpose経由で仕様を参照して実行。

### Q: 複数エージェントの連携方法
A: Promise.allで並列実行、またはawaitで順次実行を組み合わせる。

### Q: エージェント仕様の更新方法
A: .claude/agents/配下のmdファイルを直接編集。実行時は更新された仕様を参照。

---
更新日: 2025-01-14