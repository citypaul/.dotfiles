#!/usr/bin/env bun
/**
 * PreToolUse Hook - Enforces CLAUDE.md coding standards
 *
 * Checks performed:
 * 1. Block 'any' types in TypeScript (HARD BLOCK)
 * 2. Block array mutations like .push(), .pop() (HARD BLOCK)
 * 3. Warn about console.log statements (WARNING)
 * 4. Warn about 'interface' for data structures (WARNING)
 */

import type { PreToolUseHookInput } from "./types";
import { getFileContent, getFilePath, isTypeScriptFile, isJsOrTsFile } from "./types";

type ValidationResult = {
  blocked: boolean;
  message: string;
};

const VIOLATIONS = {
  ANY_TYPE: {
    pattern: /:\s*any\b|as\s+any\b|<any>|any\[\]|any[,)]/,
    message: `❌ BLOCKED: 'any' type detected

CLAUDE.md: "No any types - ever. Use unknown if type truly unknown"

Alternatives:
  : any       →  : unknown (then narrow with type guards)
  as any      →  as unknown as TargetType (with justification)
  any[]       →  unknown[] or specific type array`,
  },

  ARRAY_MUTATIONS: {
    pattern: /\.(push|pop|shift|unshift|splice)\s*\(/,
    message: `❌ BLOCKED: Array mutation detected

CLAUDE.md: "No data mutation - immutable data structures only"

Alternatives:
  .push(item)     →  [...array, item]
  .pop()          →  array.slice(0, -1)
  .shift()        →  array.slice(1)
  .unshift(item)  →  [item, ...array]
  .splice(i, 1)   →  array.filter((_, idx) => idx !== i)`,
  },
} as const;

const WARNINGS = {
  CONSOLE_LOG: {
    pattern: /console\.(log|warn|error|info|debug)\s*\(/,
    message: `⚠️ WARNING: console statement detected - remove before committing`,
  },

  INTERFACE_KEYWORD: {
    pattern: /\binterface\s+\w+\s*\{/,
    message: `⚠️ WARNING: 'interface' detected

CLAUDE.md: "Prefer type over interface for data structures.
Reserve interface for behavior contracts only."`,
  },
} as const;

const checkViolations = (content: string, filePath: string): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // Only check TypeScript for any types and interface
  if (isTypeScriptFile(filePath)) {
    if (VIOLATIONS.ANY_TYPE.pattern.test(content)) {
      results.push({ blocked: true, message: VIOLATIONS.ANY_TYPE.message });
    }

    if (WARNINGS.INTERFACE_KEYWORD.pattern.test(content)) {
      results.push({ blocked: false, message: WARNINGS.INTERFACE_KEYWORD.message });
    }
  }

  // Check JS/TS for mutations and console
  if (isJsOrTsFile(filePath)) {
    if (VIOLATIONS.ARRAY_MUTATIONS.pattern.test(content)) {
      results.push({ blocked: true, message: VIOLATIONS.ARRAY_MUTATIONS.message });
    }

    if (WARNINGS.CONSOLE_LOG.pattern.test(content)) {
      results.push({ blocked: false, message: WARNINGS.CONSOLE_LOG.message });
    }
  }

  return results;
};

const main = async () => {
  const input = (await Bun.stdin.json()) as PreToolUseHookInput;
  const { tool_name, tool_input } = input;

  // Only check Write and Edit tools
  if (tool_name !== "Write" && tool_name !== "Edit") {
    process.exit(0);
  }

  const filePath = getFilePath(tool_input);
  const content = getFileContent(tool_name, tool_input);

  // Skip if not a JS/TS file or no content
  if (!filePath || !content || !isJsOrTsFile(filePath)) {
    process.exit(0);
  }

  const results = checkViolations(content, filePath);

  // Check for blocking violations
  const blockers = results.filter((r) => r.blocked);
  if (blockers.length > 0) {
    console.error(blockers.map((b) => b.message).join("\n\n"));
    process.exit(2); // Exit 2 = block
  }

  // Output warnings (non-blocking)
  const warnings = results.filter((r) => !r.blocked);
  if (warnings.length > 0) {
    console.error(warnings.map((w) => w.message).join("\n\n"));
  }

  process.exit(0);
};

main().catch((err) => {
  console.error("Hook error:", err);
  process.exit(1);
});
