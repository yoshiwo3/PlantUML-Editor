---
allowed-tools: Task, Read, Write, TodoWrite, WebSearch
argument-hint: <system or feature to design>
description: Run ai-driven-app-architect agent for system design
model: claude-3-opus-20240229
---

# AI-Driven App Architect Agent

Run the ai-driven-app-architect agent for system architecture and design.

## Design Task
Create architecture for: $ARGUMENTS

## Design Considerations
- Scalability requirements
- Technology stack evaluation
- Integration patterns
- Security architecture
- Performance targets
- Cost optimization

## Deliverables
1. System architecture diagram (PlantUML)
2. Technology stack recommendation
3. Component breakdown
4. API design
5. Database schema
6. Deployment strategy

Use the Task tool with subagent_type "general-purpose" to launch the architect agent.