---
allowed-tools: Bash(docker:*), mcp__playwright__browser_navigate
argument-hint: <service name or empty for all>
description: Start Docker containers and services
---

# Docker Up Command

Start Docker services: $ARGUMENTS

## Startup Process
1. Start Docker containers
2. Wait for services to be ready
3. Verify health checks
4. Open application in browser
5. Show container logs if needed

## Commands
```bash
# Start all services in background
docker-compose up -d

# Start specific service
docker-compose up -d $ARGUMENTS

# Start with logs
docker-compose up $ARGUMENTS
```

Start services and verify they're running correctly.