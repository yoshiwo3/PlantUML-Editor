# エージェント委譲パターン実装ガイド

## 概要
このドキュメントでは、単一Task内での役割演技ではなく、真のエージェント間委譲を実現する実装パターンを定義します。

## 🎯 目的
- 各エージェントが独立したコンテキストで動作
- エージェント間での明示的なデータ受け渡し
- 並列実行と順次実行の両方をサポート

## 📋 実装パターン

### パターン1: Sequential Delegation（順次委譲）

```javascript
// エージェント委譲チェーンの実装
async function executeAgentChain(workflow) {
  let previousResult = null;
  const results = [];
  
  for (const step of workflow) {
    const result = await Task({
      description: step.description,
      subagent_type: "general-purpose",
      prompt: `
        # Role: ${step.agent}
        
        ${step.agent === 'ai-driven-app-architect' ? `
        You are a system architect. Design the architecture.
        ` : ''}
        
        ${step.agent === 'web-debug-specialist' ? `
        You are a frontend specialist. Implement based on:
        ${previousResult}
        ` : ''}
        
        ${step.agent === 'webapp-test-automation' ? `
        You are a test automation expert. Create tests for:
        ${previousResult}
        ` : ''}
        
        Task: ${step.task}
        
        Output Format: ${step.outputFormat || 'Structured markdown'}
      `
    });
    
    results.push({
      agent: step.agent,
      result: result
    });
    
    previousResult = result;
  }
  
  return results;
}

// 使用例
const workflow = [
  {
    agent: 'ai-driven-app-architect',
    description: 'Design architecture',
    task: 'Design microservices for e-commerce',
    outputFormat: 'JSON with service definitions'
  },
  {
    agent: 'web-debug-specialist',
    description: 'Implement frontend',
    task: 'Create React components based on architecture',
    outputFormat: 'Component code with explanations'
  },
  {
    agent: 'webapp-test-automation',
    description: 'Create tests',
    task: 'Write comprehensive test suite',
    outputFormat: 'Test files with coverage report'
  }
];

const results = await executeAgentChain(workflow);
```

### パターン2: Parallel Delegation（並列委譲）

```javascript
// 独立したタスクの並列実行
async function executeParallelAgents(tasks) {
  const promises = tasks.map(task => 
    Task({
      description: task.description,
      subagent_type: "general-purpose",
      prompt: `
        # Role: ${task.agent}
        
        You are a ${task.specialist} specialist.
        
        Task: ${task.task}
        
        Requirements: ${task.requirements}
        
        Deliverables: ${task.deliverables}
      `
    })
  );
  
  return await Promise.all(promises);
}

// 使用例
const parallelTasks = [
  {
    agent: 'web-debug-specialist',
    specialist: 'frontend',
    description: 'Fix UI bugs',
    task: 'Debug and fix all console errors',
    requirements: 'Cross-browser compatibility',
    deliverables: 'Fixed code with explanations'
  },
  {
    agent: 'software-doc-writer',
    specialist: 'documentation',
    description: 'Write API docs',
    task: 'Document all API endpoints',
    requirements: 'OpenAPI 3.0 format',
    deliverables: 'Complete API documentation'
  },
  {
    agent: 'docker-dev-env-builder',
    specialist: 'DevOps',
    description: 'Setup Docker',
    task: 'Create Docker configuration',
    requirements: 'Production-ready setup',
    deliverables: 'Docker files and compose configuration'
  }
];

const parallelResults = await executeParallelAgents(parallelTasks);
```

### パターン3: Hybrid Delegation（ハイブリッド委譲）

```javascript
// 並列と順次の組み合わせ
async function executeHybridWorkflow(phases) {
  const results = [];
  
  for (const phase of phases) {
    if (phase.type === 'sequential') {
      // 順次実行
      const sequentialResult = await executeAgentChain(phase.tasks);
      results.push({
        phase: phase.name,
        type: 'sequential',
        results: sequentialResult
      });
    } else if (phase.type === 'parallel') {
      // 並列実行
      const parallelResult = await executeParallelAgents(phase.tasks);
      results.push({
        phase: phase.name,
        type: 'parallel',
        results: parallelResult
      });
    }
  }
  
  return results;
}

// 使用例
const hybridWorkflow = [
  {
    name: 'Design Phase',
    type: 'sequential',
    tasks: [
      {agent: 'ai-driven-app-architect', task: 'System design'},
      {agent: 'spec-implementation-auditor', task: 'Design review'}
    ]
  },
  {
    name: 'Implementation Phase',
    type: 'parallel',
    tasks: [
      {agent: 'web-debug-specialist', task: 'Frontend implementation'},
      {agent: 'docker-dev-env-builder', task: 'Environment setup'},
      {agent: 'software-doc-writer', task: 'Documentation'}
    ]
  },
  {
    name: 'Quality Phase',
    type: 'sequential',
    tasks: [
      {agent: 'webapp-test-automation', task: 'Test creation'},
      {agent: 'code-reviewer', task: 'Code review'},
      {agent: 'debugger', task: 'Bug fixes'}
    ]
  }
];

const workflowResults = await executeHybridWorkflow(hybridWorkflow);
```

## 🔧 実装のベストプラクティス

### 1. 明示的なコンテキスト伝達
```javascript
// 良い例：前のエージェントの結果を明示的に渡す
prompt: `
  Based on the architecture design from previous step:
  ${previousResult}
  
  Now implement the following components...
`
```

### 2. 構造化された出力形式
```javascript
// 各エージェントが次のエージェントが理解しやすい形式で出力
outputFormat: {
  summary: "Brief description",
  details: "Detailed implementation",
  nextSteps: "Recommendations for next agent",
  data: {} // Structured data for parsing
}
```

### 3. エラーハンドリング
```javascript
try {
  const result = await Task({...});
  if (!result || result.error) {
    // フォールバック処理
    return await Task({
      description: "Error recovery",
      subagent_type: "general-purpose",
      prompt: "Previous task failed. Alternative approach..."
    });
  }
} catch (error) {
  console.error("Agent execution failed:", error);
  // エラーリカバリー
}
```

## 📊 委譲パターン比較

| パターン | 利点 | 欠点 | 使用場面 |
|---------|------|------|----------|
| Sequential | 依存関係が明確 | 実行時間が長い | ステップバイステップの処理 |
| Parallel | 高速実行 | 結果の統合が複雑 | 独立したタスク |
| Hybrid | 柔軟性が高い | 実装が複雑 | 大規模プロジェクト |

## 🚀 高度な委譲テクニック

### 1. 条件付き委譲
```javascript
const result = await Task({...});
if (result.includes("error")) {
  // デバッガーエージェントに委譲
  await Task({
    description: "Debug errors",
    subagent_type: "general-purpose",
    prompt: "Role: debugger..."
  });
} else {
  // 次の通常フローへ
  await Task({...});
}
```

### 2. 再帰的委譲
```javascript
async function recursiveDelegation(task, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await Task(task);
    if (result.success) return result;
    
    // 失敗時は別のエージェントに委譲
    task = {
      ...task,
      prompt: `Previous attempt failed. Alternative approach...`
    };
  }
  throw new Error("Max retries exceeded");
}
```

### 3. 動的エージェント選択
```javascript
function selectAgent(taskType) {
  const agentMap = {
    'bug': 'debugger',
    'design': 'ai-driven-app-architect',
    'test': 'webapp-test-automation',
    'doc': 'software-doc-writer'
  };
  return agentMap[taskType] || 'general-purpose';
}

const agent = selectAgent(taskType);
await Task({
  description: `${taskType} task`,
  subagent_type: "general-purpose",
  prompt: `Role: ${agent}...`
});
```

## 📝 まとめ

真のエージェント委譲を実現するには：
1. **各Taskを独立して呼び出す**
2. **明示的にデータを受け渡す**
3. **エラーハンドリングを実装**
4. **適切なパターンを選択**

この実装により、単一Task内での役割演技ではなく、真の意味でのマルチエージェント協調が可能になります。