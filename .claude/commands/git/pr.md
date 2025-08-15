---
allowed-tools: Bash(git:*), Bash(gh:*), mcp__github__*
argument-hint: <PR title>
description: Create a GitHub pull request
---

# Create Pull Request

Create a GitHub pull request with comprehensive description.

## PR Title
$ARGUMENTS

## Process
1. Ensure all changes are committed
2. Push current branch to origin
3. Create PR with detailed description
4. Include test results
5. Add appropriate labels

## PR Template
- Summary of changes
- Related issues
- Test coverage
- Screenshots (if UI changes)
- Checklist completion

Create the pull request using GitHub CLI or MCP.