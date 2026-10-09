// Keep the shared diff/reset lifecycle, and also clear a partial artifact left
// by a timed-out case: promptfoo does not run afterEach for that timeout path.
const { execFileSync } = require("node:child_process");
const shared = require("./quality-hooks");
const lib = require("./quality-lib");

const extensionHook = async (name, context) => {
  await shared.extensionHook(name, context);
  if (name !== "beforeEach") return;
  // run-quality.sh supplies a disposable, committed fixture workspace.
  const options = { cwd: lib.workspace(), stdio: "ignore" };
  execFileSync("git", ["reset", "--hard", "--quiet"], options);
  execFileSync("git", ["clean", "-fdq"], options);
};

module.exports = { extensionHook };
