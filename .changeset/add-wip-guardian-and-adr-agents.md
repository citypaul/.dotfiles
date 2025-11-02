---
"@paulhammond/dotfiles": minor
---

Add wip-guardian and adr agents for workflow management and architectural decisions

**New Claude Code Agents:**

Added two new specialized agents that integrate with the existing agent system:

1. **`wip-guardian`** - Work In Progress Guardian
   - Creates and maintains living `WIP.md` plan documents for complex, multi-step features
   - Tracks current progress, next steps, and blockers
   - Enforces small PRs, incremental work, tests always passing
   - Orchestrates all other agents at appropriate times (tdd-guardian, ts-enforcer, refactor-scan, adr, learn, docs-guardian)
   - Updates plan as learning occurs
   - **Deletes `WIP.md` when work completes** (ephemeral short-term memory)
   - Identifies ADR opportunities during development
   - Prevents context loss during multi-day features

2. **`adr`** - Architecture Decision Records
   - Creates ADRs for significant architectural decisions
   - 5-question decision framework for determining when ADRs are needed
   - Documents alternatives considered, trade-offs, and consequences
   - Maintains ADR index in `docs/adr/README.md`
   - Integrated with wip-guardian and docs-guardian
   - Prevents "why did we do it this way?" confusion
   - Clear guidance on when NOT to create ADRs (trivial choices, temporary workarounds, standard patterns)

**Agent System Enhancements:**

- Updated `.claude/agents/README.md` with comprehensive overview of all 7 agents
- Added clear distinctions between agent purposes and lifespans
- Added complete workflow integration showing how agents work together
- Added decision matrix for which agent to use when
- Added documentation type comparison table (wip vs adr vs learn vs docs)

**Key Features:**

- **wip-guardian orchestrates the entire development workflow:**
  - Invokes tdd-guardian for RED-GREEN-REFACTOR cycle
  - Invokes ts-enforcer before commits/PRs
  - Invokes refactor-scan after green tests
  - Invokes adr when architectural decisions arise
  - Invokes learn when significant learnings occur
  - Invokes docs-guardian when features complete

- **Clear documentation boundaries established:**
  - `wip-guardian`: Temporary progress tracking (deleted when done)
  - `adr`: Permanent "why" (architectural decisions)
  - `learn`: Permanent "how" (gotchas, patterns)
  - `docs-guardian`: Permanent "what" (features, API, setup)

**Documentation Updates:**

- Updated README.md agent count from 5 to 7 agents
- Added comprehensive sections for both new agents in README
- Updated installation instructions to include new agent download commands
- Updated all agent count references throughout documentation
