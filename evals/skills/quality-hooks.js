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
const git = (args) => execSync(`git ${args}`, { cwd: workspace(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const extensionHook = async (hookName, context) => {
  if (!workspace()) return;

  if (hookName === "afterEach") {
    const label = context.result?.provider?.label ?? context.result?.provider?.id ?? "provider";
    const description = context.test?.description ?? "case";
    const dir = resolve(__dirname, "results", suite());
    mkdirSync(dir, { recursive: true });
    git("add -A");
    const diff = git("diff --cached");
    writeFileSync(resolve(dir, `${slug(description)}--${slug(label)}.diff`), diff);
    git("reset --hard --quiet");
    git("clean -fdq");
  }
};

module.exports = { extensionHook };
