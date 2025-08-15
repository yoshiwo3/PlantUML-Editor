# Sequential Delegation Template for All Agents
## 全エージェント共通の連続委譲実装テンプレート

### 🎯 Core Concept
**エージェントは直接Task toolを実行できません。代わりに、メインAIへの実行指示を出力します。**

### 📝 Standard Template for Sequential Delegation

Add this section to each agent with Task tool:

```markdown
## Sequential Delegation Capability

### How to Request Sequential Delegation

When you need other agents to continue your work, output a structured delegation plan:

#### Format for Sequential Delegation

```markdown
# Sequential Delegation Request

## Current Work Completed
[Summary of what you've done]

## Next Steps Required

### Step 1: [Agent Name]
**Agent**: [target-agent-name]
**Task**: [Specific task description]
**Input Data**: 
```
[Data/results to pass to next agent]
```
**Expected Output**: [What you expect from this agent]

### Step 2: [Agent Name] (if needed)
**Agent**: [target-agent-name]
**Task**: [Specific task description]
**Dependencies**: Requires output from Step 1
**Expected Output**: [What you expect from this agent]

## Execution Instructions for Main AI

Please execute the following sequence:

1. ```javascript
   const step1Result = await Task({
     description: "[Brief description]",
     subagent_type: "general-purpose",
     prompt: `# Role: [agent-name]
     
     Previous work:
     [Your output]
     
     Task: [Specific task]`
   });
   ```

2. ```javascript
   const step2Result = await Task({
     description: "[Brief description]",
     subagent_type: "general-purpose",
     prompt: `# Role: [agent-name]
     
     Previous results:
     ${step1Result}
     
     Task: [Specific task based on step 1]`
   });
   ```

## Alternative: Continue Within Single Response

If the task is simple enough, I can continue as multiple agents:

### Acting as [next-agent]
[Continue work in next role]

### Acting as [another-agent]
[Continue work in another role]
```

### When to Use Sequential Delegation

1. **Task exceeds your expertise**: Need specialist knowledge
2. **Multi-phase workflow**: Different agents for different phases
3. **Quality assurance**: Need review/validation from another agent
4. **Complex problem**: Requires multiple perspectives

### When NOT to Delegate

1. **Simple tasks**: Can be completed within your expertise
2. **Circular dependency**: Would create infinite loop
3. **Maximum depth reached**: Already at 3 levels of delegation
4. **User preference**: User requested single-agent solution
```

### 🔧 Implementation Examples

#### Example 1: Debugger → Code Reviewer → Documentation

```markdown
# Sequential Delegation Request

## Current Work Completed
Fixed critical security vulnerability in authentication module.

## Next Steps Required

### Step 1: Code Review
**Agent**: code-reviewer
**Task**: Review security fix for quality and completeness
**Input Data**: 
```javascript
// Fixed code
function authenticate(user, password) {
  // Added input validation
  if (!user || !password) {
    throw new Error('Invalid credentials');
  }
  // Added rate limiting
  if (rateLimiter.isExceeded(user)) {
    throw new Error('Too many attempts');
  }
  // Secure password comparison
  return crypto.timingSafeEqual(hash(password), user.passwordHash);
}
```
**Expected Output**: Review report with any additional recommendations

### Step 2: Documentation Update
**Agent**: software-doc-writer
**Task**: Update security documentation
**Dependencies**: Review results from Step 1
**Expected Output**: Updated security guidelines and API documentation
```

#### Example 2: Parallel then Sequential

```markdown
# Delegation Request with Parallel and Sequential Phases

## Phase 1: Parallel Analysis (Execute simultaneously)

### Task A: Frontend Analysis
**Agent**: web-debug-specialist
**Task**: Analyze UI performance issues

### Task B: Backend Analysis
**Agent**: docker-dev-env-builder
**Task**: Analyze container performance

## Phase 2: Sequential Integration (After Phase 1 completes)

### Step 1: Architecture Redesign
**Agent**: ai-driven-app-architect
**Task**: Design optimizations based on both analyses
**Dependencies**: Results from Phase 1 (both Task A and B)

### Step 2: Implementation
**Agent**: web-app-coder
**Task**: Implement the optimizations
**Dependencies**: Architecture from Step 1
```

### 📊 Decision Matrix for Delegation

| Situation | Action | Delegation Pattern |
|-----------|--------|-------------------|
| Bug found during review | Delegate to debugger | Sequential: Single agent |
| Complex feature needed | Orchestrate multiple agents | Sequential: Multi-agent |
| Independent tasks | Parallel execution | Parallel: Multiple agents |
| Need validation | Add reviewer at end | Sequential: Original → Reviewer |
| Architecture change | Start with architect | Sequential: Architect → Implementers |

### ⚠️ Safety Rules (MANDATORY)

```markdown
## Delegation Safety Checks

Before delegating, verify:
- [ ] Not creating circular reference (A→B→A)
- [ ] Current depth < 3 (track: Depth: X/3)
- [ ] Clear handoff data provided
- [ ] Next agent has necessary context
- [ ] Task is appropriate for target agent

If any check fails, handle locally or request user guidance.
```

### 🚀 Quick Reference for Each Agent

Add agent-specific examples:

```markdown
## My Sequential Delegation Patterns

As [agent-name], I commonly delegate to:

1. **[Agent A]** when [condition]
   - Example: When I find [specific issue]
   - Pass: [type of data]
   - Expect: [type of result]

2. **[Agent B]** when [condition]
   - Example: After completing [specific task]
   - Pass: [type of data]
   - Expect: [type of result]

Never delegate to:
- Myself ([agent-name])
- [Agents that would create circular references]
```

---
*This template should be customized and added to each agent's .md file*
*Version: 1.0*
*Created: 2024*