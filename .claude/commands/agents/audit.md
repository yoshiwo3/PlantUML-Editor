---
allowed-tools: Task, Read, Grep, Glob, WebFetch, TodoWrite
argument-hint: <specification document path>
description: Run spec-implementation-auditor to verify spec compliance
---

# Specification Implementation Auditor Agent

Run the spec-implementation-auditor agent to verify implementation matches specifications.

## Audit Target
Specification document: $ARGUMENTS

## Audit Process
1. Read and analyze specification document
2. Identify all documented requirements
3. Map requirements to implementation code
4. Identify gaps and missing implementations
5. Verify functionality completeness

## Audit Report
- Compliance percentage
- Missing implementations list
- Incorrect implementations
- Additional undocumented features
- Recommended fixes with code snippets

Use the Task tool with the spec-implementation-auditor agent.