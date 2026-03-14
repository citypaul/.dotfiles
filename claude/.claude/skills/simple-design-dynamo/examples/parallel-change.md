# Parallel Change (Expand and Contract)

A pattern to implement backward-incompatible changes to an interface safely, by breaking the change into three distinct phases: expand, migrate, and contract.

**CRITICAL**: Each phase is a SEPARATE commit with passing tests!

## Phase 1: Expand (Add the new thing)
- Add the new method/class/interface alongside the old one
- Both old and new coexist
- STOP: Run tests, commit, discuss next step with human

## Phase 2: Migrate (Move clients to new thing)
- Update each caller one at a time
- After EACH caller migration: run tests, commit
- STOP: After all migrations, discuss with human before proceeding

## Phase 3: Contract (Remove the old thing)
- STOP: Confirm with human that all clients are migrated
- Remove the old method/class/interface
- Run tests, commit
