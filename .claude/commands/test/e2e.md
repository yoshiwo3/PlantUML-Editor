---
allowed-tools: Bash(docker:*), Bash(npm:*), mcp__playwright__*, Read, Write
argument-hint: <test scenario name>
description: Run E2E tests with Playwright in Docker
---

# E2E Test Execution

Run end-to-end tests for: $ARGUMENTS

## Test Environment
- Docker Playwright container
- Multi-browser testing (Chromium, Firefox, WebKit, Edge)
- Headless and headed modes

## Execution Steps
1. Start Docker test environment
2. Run specific test scenario or all tests
3. Capture screenshots on failure
4. Generate test report
5. Show coverage metrics

## Commands
```bash
# Run all E2E tests
docker-compose -f docker-compose.permanent.yml run --rm playwright npm run test:e2e

# Run specific test
docker-compose run --rm playwright npm run test:e2e -- --grep "$ARGUMENTS"
```

Execute the E2E tests and provide results summary.