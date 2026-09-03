// Shared helpers for the quality-suite graders (tdd, hexagonal, ddd).
//
// Two sources of truth: the ordered tool-call trail the Claude Agent SDK
// reports (what the agent did, in what order) and the workspace it left
// behind (what the work is). The workspace path comes from
// SKILL_EVAL_WORKSPACE, set by run-quality.sh.

const { execSync } = require("node:child_process");
const { readFileSync, readdirSync, statSync, existsSync, writeFileSync, unlinkSync, realpathSync } = require("node:fs");
const { resolve, join, relative, basename } = require("node:path");

const EDIT_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

const verdict = (pass, reason) => ({ pass, score: pass ? 1 : 0, reason });

const workspace = () => {
  const dir = process.env.SKILL_EVAL_WORKSPACE;
  if (!dir) throw new Error("SKILL_EVAL_WORKSPACE is not set; run via run-quality.sh");
  return realpathSync(dir);
};

// Paths the agent reports may spell the workspace differently (macOS
// /private/var vs /var). Compare by the part after the workspace root.
const sameFile = (a, b) => {
  const tail = (p) => p.split("/src/").slice(1).join("/src/");
  return tail(a) !== "" && tail(a) === tail(b);
};

// promptfoo hands every JavaScript assertion its provider; when run-quality.sh
// mounted a baseline workspace, graders for the `skills-at-<ref>` provider
// must read that workspace. Assertion modules wrap their exports with
// `withWorkspace` so the switch happens before any grader reads a file.
const selectWorkspace = (context) => {
  const baseline = process.env.SKILL_EVAL_BASELINE_WORKSPACE;
  const current = process.env.SKILL_EVAL_CURRENT_WORKSPACE ?? process.env.SKILL_EVAL_WORKSPACE;
  const label = context?.provider?.label ?? context?.provider?.id ?? "";
  process.env.SKILL_EVAL_WORKSPACE = baseline && /^skills-at-/.test(String(label)) ? baseline : current;
};

const withWorkspace = (graders) =>
  Object.fromEntries(
    Object.entries(graders).map(([name, grader]) => [
      name,
      (output, context) => {
        selectWorkspace(context);
        return grader(output, context);
      },
    ]),
  );

const trail = (context) =>
  (context?.providerResponse?.metadata?.toolCalls ?? []).map((call, index) => ({
    index,
    name: call.name,
    path: call.input?.file_path ?? "",
    command: call.input?.command ?? "",
  }));

const edits = (calls) => calls.filter((call) => EDIT_TOOLS.has(call.name));
// A file counts as touched when the trail shows an edit tool on it OR the
// workspace's git status says it changed (an agent may write through Bash).
const touchedBy = (context) => {
  const paths = edits(trail(context)).map((call) => call.path);
  const changed = (() => {
    try {
      return execSync("git status --porcelain --untracked-files=all", { cwd: workspace(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
        .split("\n")
        .filter(Boolean)
        .map((line) => resolve(workspace(), line.slice(3).trim()));
    } catch {
      return [];
    }
  })();
  return (file) => paths.some((path) => sameFile(path, file)) || changed.some((path) => sameFile(path, file) || path === file);
};
const isTestPath = (path) => /\.test\.[jt]sx?$/.test(path) || /__tests__\//.test(path);

const run = (command, options = {}) => {
  try {
    const out = execSync(command, {
      cwd: workspace(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
      timeout: options.timeout ?? 120_000,
    });
    return { ok: true, out };
  } catch (error) {
    return { ok: false, out: `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim() };
  }
};

const vitestSummary = (out) => (out.match(/Tests\s+.*$/m) ?? [out.split("\n").filter(Boolean).slice(-2).join(" | ")])[0];

const sourceFiles = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === "node_modules") return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.[jt]sx?$/.test(entry) ? [full] : [];
  });
};

const read = (file) => readFileSync(file, "utf8");
const rel = (file) => relative(workspace(), file);

const importsOf = (text) =>
  [...text.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((match) => match[1]);

// Copy a hidden acceptance test into the workspace, run it, remove it.
const runAcceptance = ({ suite, name, targetDir }) => {
  const source = resolve(__dirname, "tests", suite, "acceptance", name);
  const target = resolve(workspace(), targetDir, `acceptance-${name}`);
  writeFileSync(target, read(source));
  try {
    const result = run(`pnpm exec vitest run ${relative(workspace(), target)}`);
    return verdict(result.ok, vitestSummary(result.out));
  } finally {
    if (existsSync(target)) unlinkSync(target);
  }
};

const suiteGreen = () => {
  const result = run("pnpm exec vitest run --exclude '**/acceptance-*.test.ts'");
  return verdict(result.ok, vitestSummary(result.out));
};

const typecheckClean = () => {
  const result = run("pnpm exec tsc --noEmit");
  const errors = (result.out.match(/error TS\d+/g) ?? []).length;
  return verdict(result.ok, result.ok ? "tsc --noEmit clean" : `${errors} type error(s): ${result.out.split("\n")[0]}`);
};

module.exports = {
  verdict,
  selectWorkspace,
  withWorkspace,
  sameFile,
  touchedBy,
  workspace,
  trail,
  edits,
  isTestPath,
  run,
  vitestSummary,
  sourceFiles,
  read,
  rel,
  basename,
  importsOf,
  runAcceptance,
  suiteGreen,
  typecheckClean,
  resolve,
};
