// Retain the actual artifact in results and give it to llm-rubric, not just
// the agent's completion claim. beforeEach selects the arm's workspace; a
// transform has no provider label, so do not reset that selection here.
const { existsSync, readFileSync } = require("node:fs");
const lib = require("./quality-lib");

module.exports = (_output, context) => {
  const artifact = String(context.vars.artifact);
  const path = lib.resolve(lib.workspace(), artifact);
  return JSON.stringify({ artifact, content: existsSync(path) ? readFileSync(path, "utf8") : null });
};
