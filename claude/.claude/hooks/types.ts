/**
 * Claude Code Hook Types
 * Based on the official hooks documentation
 */

type BaseHookInput = {
  session_id: string;
  transcript_path: string;
  cwd: string;
};

export type PreToolUseHookInput = BaseHookInput & {
  hook_event_name: "PreToolUse";
  tool_name: string;
  tool_input: WriteToolInput | EditToolInput | BashToolInput | Record<string, unknown>;
};

export type PostToolUseHookInput = BaseHookInput & {
  hook_event_name: "PostToolUse";
  tool_name: string;
  tool_input: WriteToolInput | EditToolInput | BashToolInput | Record<string, unknown>;
  tool_response: Record<string, unknown>;
};

export type UserPromptSubmitHookInput = BaseHookInput & {
  hook_event_name: "UserPromptSubmit";
  prompt: string;
};

export type WriteToolInput = {
  file_path: string;
  content: string;
};

export type EditToolInput = {
  file_path: string;
  old_string: string;
  new_string: string;
};

export type BashToolInput = {
  command: string;
  description?: string;
};

export type HookInput = PreToolUseHookInput | PostToolUseHookInput | UserPromptSubmitHookInput;

/**
 * Hook output for controlling behavior
 */
export type HookOutput = {
  decision?: "approve" | "block" | "ask";
  reason?: string;
  systemMessage?: string;
};

/**
 * Type guards
 */
export const isWriteToolInput = (input: Record<string, unknown>): input is WriteToolInput => {
  return "file_path" in input && "content" in input;
};

export const isEditToolInput = (input: Record<string, unknown>): input is EditToolInput => {
  return "file_path" in input && "new_string" in input;
};

export const isBashToolInput = (input: Record<string, unknown>): input is BashToolInput => {
  return "command" in input;
};

/**
 * Get file content being written/edited
 */
export const getFileContent = (toolName: string, toolInput: Record<string, unknown>): string | null => {
  if (toolName === "Write" && isWriteToolInput(toolInput)) {
    return toolInput.content;
  }
  if (toolName === "Edit" && isEditToolInput(toolInput)) {
    return toolInput.new_string;
  }
  return null;
};

/**
 * Get file path from tool input
 */
export const getFilePath = (toolInput: Record<string, unknown>): string | null => {
  if ("file_path" in toolInput && typeof toolInput.file_path === "string") {
    return toolInput.file_path;
  }
  return null;
};

/**
 * Check if file is TypeScript
 */
export const isTypeScriptFile = (filePath: string | null): boolean => {
  if (!filePath) return false;
  return /\.(ts|tsx)$/.test(filePath);
};

/**
 * Check if file is JavaScript/TypeScript
 */
export const isJsOrTsFile = (filePath: string | null): boolean => {
  if (!filePath) return false;
  return /\.(js|jsx|ts|tsx)$/.test(filePath);
};
