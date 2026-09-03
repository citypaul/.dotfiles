const { existsSync } = require("node:fs");
const lib = require("./quality-lib");

const artifact = (context) => lib.resolve(lib.workspace(), context?.vars?.artifact ?? "recommendation.md");
const text = (context) => (existsSync(artifact(context)) ? lib.read(artifact(context)) : "");

const artifactWritten = (_output, context) => {
  const body = text(context);
  const pass = body.length >= 200;
  return lib.verdict(pass, pass ? `${context.vars.artifact} written (${body.length} characters)` : body ? `${context.vars.artifact} is only ${body.length} characters` : `${context.vars.artifact} was not written`);
};

const authoritativeEvidenceUsed = (_output, context) => {
  const source = context?.vars?.authoritative_source ?? "";
  const pass = text(context).includes(source);
  return lib.verdict(pass, pass ? `cites ${source}` : `does not cite authoritative source ${source}`);
};

const currentVersionResolved = (_output, context) => {
  const body = text(context);
  const expected = context?.vars?.expected_version ?? "";
  const match = body.split("\n").find((line) => line.includes(expected) && /(?:current|verified|recommend|install|use|command)/i.test(line));
  return lib.verdict(Boolean(match), match ?? `no verified recommendation for ${expected}`);
};

const commandValidated = (_output, context) => {
  const body = text(context);
  const required = String(context?.vars?.required_command_terms ?? "").split("|").filter(Boolean);
  const rejected = String(context?.vars?.rejected_command_terms ?? "").split("|").filter(Boolean);
  const command = body.split("\n").find((line) => required.every((term) => line.includes(term)));
  const present = command ? rejected.filter((term) => command.includes(term)) : [];
  const pass = Boolean(command) && present.length === 0;
  return lib.verdict(pass, pass ? command : command ? `recommended command still uses: ${present.join(", ")}` : `no command contains: ${required.join(", ")}`);
};

module.exports = lib.withWorkspace({
  artifactWritten,
  authoritativeEvidenceUsed,
  currentVersionResolved,
  commandValidated,
});
