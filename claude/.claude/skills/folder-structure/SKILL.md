---
name: folder-structure
description: Deprecated compatibility alias for structure-codebase. Activate only for the exact legacy name folder-structure or an explicit $folder-structure invocation. Contains no independent architecture guidance and must delegate to the canonical sibling skill.
disable-model-invocation: true
---

# Folder Structure Compatibility Alias

The former screaming-architecture guidance under this name has been retired. `structure-codebase` is the sole authoritative skill for physical code organization and dependency-boundary design.

1. Read [`../structure-codebase/SKILL.md`](../structure-codebase/SKILL.md) completely and follow it.
2. Load the references selected by that skill for the current project shape.
3. Do not reproduce or infer the former protected-`domain/` plus sibling-`use-cases/` convention.

If the sibling skill is unavailable because this compatibility alias was installed alone, stop and tell the user to install `structure-codebase` from `citypaul/.dotfiles`. Do not improvise from this deprecated shim.
