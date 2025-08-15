# Task Tool Delegation Safety Guide
## エージェント間自律委譲の安全実装ガイドライン

### 🔴 Critical Safety Rules（絶対遵守事項）

#### 1. 循環参照の防止
```javascript
// ❌ 禁止: 直接的な循環参照
Agent A → Agent B → Agent A

// ❌ 禁止: 間接的な循環参照  
Agent A → Agent B → Agent C → Agent A

// ✅ 許可: 呼び出し履歴をチェック
if (callHistory.includes(targetAgent)) {
  // 既に呼び出し済みのエージェントは呼び出さない
  return fallbackSolution();
}
```

#### 2. 呼び出し深度制限
```javascript
const MAX_DELEGATION_DEPTH = 3;  // 最大3層まで

// 実装例
async function delegateToAgent(agent, task, currentDepth = 0) {
  if (currentDepth >= MAX_DELEGATION_DEPTH) {
    console.warn("Maximum delegation depth reached");
    return handleLocally(task);  // ローカルで処理
  }
  
  return await Task({
    description: task.description,
    subagent_type: "general-purpose",
    prompt: `
      # Role: ${agent}
      # Current Depth: ${currentDepth + 1}/${MAX_DELEGATION_DEPTH}
      ${task.details}
    `
  });
}
```

#### 3. 同一エージェントの再帰呼び出し禁止
```javascript
// ❌ 禁止
debugger → debugger  // 自分自身を呼び出す

// ✅ 許可
debugger → code-reviewer → debugger  // 他を経由した場合は許可（深度制限内で）
```

### 🟡 Delegation Guidelines（委譲ガイドライン）

#### When TO Delegate（委譲すべき場合）

1. **専門外の問題に遭遇**
   ```javascript
   // Example: web-debug-specialistがバックエンドエラーを発見
   if (error.type === 'backend' || error.type === 'docker') {
     await delegateToAgent('docker-dev-env-builder', error);
   }
   ```

2. **検証やレビューが必要**
   ```javascript
   // Example: 実装後に自動的にレビューを依頼
   const implementation = await implementFeature();
   const review = await delegateToAgent('code-reviewer', {
     code: implementation,
     requirements: originalRequirements
   });
   ```

3. **複合的な問題解決**
   ```javascript
   // Example: デバッグ中に設計の問題を発見
   if (issueRequiresArchitecturalChange) {
     const redesign = await delegateToAgent('ai-driven-app-architect', issue);
     return applyRedesign(redesign);
   }
   ```

#### When NOT TO Delegate（委譲すべきでない場合）

1. **自分の専門領域内で解決可能**
2. **既に同じエージェントが呼び出し履歴にある**
3. **深度制限に達している**
4. **些細な問題やクイックフィックス**
5. **コストが効果を上回る場合**

### 🔧 Implementation Pattern（実装パターン）

#### 各エージェントへの追加テンプレート

```markdown
## Autonomous Delegation Capability

You have access to the Task tool for delegating to other specialized agents.

### Delegation Protocol

1. **Check before delegating:**
   - Is this outside my expertise? 
   - Will delegation add value?
   - Am I within depth limits?

2. **Track delegations:**
   ```javascript
   // Always include context
   await Task({
     description: "Brief task description",
     subagent_type: "general-purpose",
     prompt: `
       # Delegation Context
       - Calling Agent: ${myName}
       - Reason: ${reason}
       - Previous Context: ${context}
       
       # Role: ${targetAgent}
       ${taskDetails}
     `
   });
   ```

3. **Handle delegation results:**
   - Validate returned data
   - Integrate with current work
   - Report back with combined results

### My Delegation Rules

As [agent-name], I delegate to:
- **[agent-x]**: When [specific condition]
- **[agent-y]**: When [specific condition]
- Never delegate to: [list of agents to avoid]

### Error Handling

If delegation fails:
1. Attempt local resolution
2. Report limitation to user
3. Suggest manual intervention
```

### 📊 Risk Matrix（リスク評価表）

| エージェント | Task tool追加リスク | 優先度 | 実装フェーズ |
|-------------|-------------------|--------|-------------|
| debugger | 低（明確な委譲パターン） | 高 | Phase 1 |
| code-reviewer | 低（レビュー後の修正依頼） | 高 | Phase 1 |
| spec-implementation-auditor | 低（不整合時の修正依頼） | 高 | Phase 1 |
| web-debug-specialist | 中（フロント/バック境界） | 中 | Phase 2 |
| ai-driven-app-architect | 中（設計変更の影響大） | 中 | Phase 2 |
| webapp-test-automation | 低（テスト失敗時の委譲） | 中 | Phase 2 |
| docker-dev-env-builder | 低（環境問題の委譲） | 低 | Phase 3 |
| software-doc-writer | 低（ドキュメント更新） | 低 | Phase 3 |
| dev-ticket-manager | 低（タスク管理） | 低 | Phase 3 |
| agent-orchestrator | 実装済み | - | - |
| main-orchestrator | 実装済み | - | - |

### 🚦 Implementation Phases（実装フェーズ）

#### Phase 1: Low-Risk Trial（低リスク試験）
**対象**: debugger, code-reviewer, spec-implementation-auditor

**目的**: 
- 基本的な委譲パターンの検証
- 安全機構の動作確認
- パフォーマンス影響の測定

**成功基準**:
- [ ] 循環参照が発生しない
- [ ] 深度制限が正しく機能
- [ ] エラーハンドリングが適切
- [ ] TodoWriteで追跡可能

#### Phase 2: Controlled Expansion（制御された拡張）
**対象**: web-debug-specialist, ai-driven-app-architect, webapp-test-automation

**目的**:
- より複雑な委譲パターンの実装
- クロスドメイン委譲の検証
- 最適化パターンの確立

**成功基準**:
- [ ] Phase 1の全基準を満たす
- [ ] クロスドメイン委譲が機能
- [ ] パフォーマンスが許容範囲内

#### Phase 3: Full Deployment（完全展開）
**対象**: 残りの全エージェント

**目的**:
- 完全な自律的マルチエージェントシステムの実現
- エマージェントな振る舞いの観察
- 最終最適化

### 📈 Monitoring & Metrics（監視と測定）

#### 追跡すべき指標

1. **委譲頻度**: 各エージェントの委譲回数
2. **委譲深度**: 平均的な呼び出しチェーンの長さ
3. **成功率**: 委譲が成功した割合
4. **パフォーマンス**: 委譲による処理時間の変化
5. **コスト**: APIコールの増加量

#### ログ形式
```javascript
{
  timestamp: Date.now(),
  callingAgent: "debugger",
  targetAgent: "code-reviewer",
  depth: 1,
  reason: "Security issue found",
  success: true,
  duration: 3500,
  result: "Issue resolved"
}
```

### ⚠️ Rollback Plan（ロールバック計画）

問題が発生した場合：

1. **即座に該当エージェントのTask toolを無効化**
2. **問題の分析と原因特定**
3. **ガイドラインの更新**
4. **修正後に再度試験実装**

### 📝 Delegation Decision Tree（委譲決定木）

```
問題に遭遇
    ↓
自分の専門領域内？
    Yes → 自分で処理
    No ↓
呼び出し深度チェック
    限界 → 自分で処理 or エラー報告
    OK ↓
循環参照チェック
    あり → 別の解決策を探す
    なし ↓
適切なエージェントを選択
    ↓
Task toolで委譲
    ↓
結果を統合して返却
```

### 🎯 Success Criteria（成功基準）

全フェーズ完了時：
- [ ] 全エージェントが適切に委譲可能
- [ ] 循環参照・無限ループが発生しない
- [ ] パフォーマンスが20%以上劣化しない
- [ ] エラー率が5%未満
- [ ] ユーザー体験が向上

---
*Document Version: 1.0*
*Created: 2024*
*Last Updated: 2024*
*Status: DRAFT - Pending Implementation*