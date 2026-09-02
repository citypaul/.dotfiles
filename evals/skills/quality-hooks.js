// promptfoo extension hooks shared by the quality suites (tdd, hexagonal, ddd).
//
// Every case runs in the same workspace (the Claude Agent SDK provider has one
// working_dir), so cases run one at a time and the workspace is reset to its
// committed state after each. Before resetting, the agent's diff is saved
// under results/<suite>/ so a grade can be traced back to the code that
// earned it. SKILL_EVAL_SUITE and SKILL_EVAL_WORKSPACE are set by
// run-quality.sh.

const { execSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const workspace = () => process.env.SKILL_EVAL_WORKSPACE;
const suite = () => process.env.SKILL_EVAL_SUITE ?? "quality";
// Bypass any external diff driver, pager or colouring the user has configured,
// so the saved diff is a plain patch `git apply` (and regrade.mjs) can consume.
const git = (args) =>
  execSync(`git --no-pager -c diff.external= -c core.pager=cat -c color.ui=false ${args}`, {
    cwd: workspace(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_EXTERNAL_DIFF: "", GIT_PAGER: "cat" },
  });

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

// Two workspaces may be mounted: the current skills (SKILL_EVAL_CURRENT_WORKSPACE)
// and, when run-quality.sh was given a baseline ref, the skills at that ref
// (SKILL_EVAL_BASELINE_WORKSPACE) for the `skills-at-<ref>` provider. Cases run
// one at a time, so pointing SKILL_EVAL_WORKSPACE at the right one before each
// case is enough for every grader.
const selectWorkspace = (label) => {
  const baseline = process.env.SKILL_EVAL_BASELINE_WORKSPACE;
  const current = process.env.SKILL_EVAL_CURRENT_WORKSPACE ?? process.env.SKILL_EVAL_WORKSPACE;
  process.env.SKILL_EVAL_WORKSPACE = baseline && /^skills-at-/.test(String(label)) ? baseline : current;
};

const extensionHook = async (hookName, context) => {
  if (hookName === "beforeEach") {
    selectWorkspace(context.test?.provider?.label ?? context.provider?.label ?? "");
    return;
  }
  if (!workspace()) return;

  if (hookName === "afterEach") {
    selectWorkspace(context.result?.provider?.label ?? context.result?.provider?.id ?? "");
    const label = context.result?.provider?.label ?? context.result?.provider?.id ?? "provider";
    const description = context.test?.description ?? "case";
    const dir = resolve(__dirname, "results", suite());
    mkdirSync(dir, { recursive: true });
    git("add -A");
    const diff = git("diff --cached --no-ext-diff --no-color");
    writeFileSync(resolve(dir, `${slug(description)}--${slug(label)}.diff`), diff);
    git("reset --hard --quiet");
    git("clean -fdq");
  }
};

module.exports = { extensionHook };
