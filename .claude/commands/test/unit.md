---
allowed-tools: Bash(npm:*), Read, Write, Edit
argument-hint: <module or function to test>
description: Run unit tests for specific module
---

# Unit Test Execution

Run unit tests for: $ARGUMENTS

## Test Scope
- Individual function testing
- Module isolation
- Mock external dependencies
- Edge case coverage

## Execution
1. Identify test files for the module
2. Run Jest unit tests
3. Generate coverage report
4. Identify uncovered code paths
5. Suggest additional test cases

## Command
```bash
npm run test:unit -- $ARGUMENTS
```

Execute unit tests and provide coverage analysis.