---
allowed-tools: Bash(docker:*), Read, Write
argument-hint: <service name or all>
description: Build Docker containers for the project
---

# Docker Build Command

Build Docker containers for: $ARGUMENTS

## Build Process
1. Check Docker daemon status
2. Build specified service or all services
3. Tag images appropriately
4. Verify build success
5. List created images

## Commands
```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build $ARGUMENTS

# Build with no cache
docker-compose build --no-cache $ARGUMENTS
```

Execute Docker build and report results.