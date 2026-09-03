const { existsSync } = require("node:fs");
const lib = require("./quality-lib");

const artifact = (context) => lib.resolve(lib.workspace(), context?.vars?.artifact ?? "graph-plan.md");
const text = (context) => (existsSync(artifact(context)) ? lib.read(artifact(context)) : "");
const normalized = (value) => String(value).replace(/[,_]/g, "");
const lines = (value) => value.split(/\n|(?<=[.!?])\s+/).filter(Boolean);

const artifactWritten = (_output, context) => {
  const body = text(context);
  const pass = body.length >= 200;
  return lib.verdict(pass, pass ? `${context.vars.artifact} written (${body.length} characters)` : body ? `${context.vars.artifact} is only ${body.length} characters` : `${context.vars.artifact} was not written`);
};

const perNodeResponseLimit = (_output, context) => {
  const match = lines(text(context)).find((line) =>
    /(?:per[- ]node|each node|node (?:response|output))/i.test(line) &&
    /(?:limit|cap|budget|maximum|at most)/i.test(line) &&
    /\d[\d,_]*\s*(?:tokens?|words?|lines?)/i.test(line),
  );
  return lib.verdict(Boolean(match), match ?? "no numeric per-node response limit");
};

const fanInBudget = (_output, context) => {
  const expected = normalized(context?.vars?.fan_in_budget ?? "");
  const match = lines(text(context)).find((line) =>
    /(?:fan[- ]in|synthesi[sz](?:er|ing|s)|aggregate)/i.test(line) &&
    /(?:budget|cap|limit|allowance|maximum)/i.test(line) &&
    normalized(line).includes(expected),
  );
  return lib.verdict(Boolean(match), match ?? `no aggregate fan-in budget of ${context.vars.fan_in_budget} tokens`);
};

const largeInputsByPath = (_output, context) => {
  const body = text(context);
  const source = context?.vars?.source_path ?? "";
  const match = lines(body).find((line) => line.includes(source) && /(?:path|file|read|inspect|reference)/i.test(line));
  return lib.verdict(Boolean(match), match ?? `large input ${source} is not referenced by path`);
};

const compactEvidenceReturn = (_output, context) => {
  const match = lines(text(context)).find((line) =>
    /(?:return|output|handoff)/i.test(line) &&
    /(?:compact|summary|findings|evidence)/i.test(line) &&
    /(?:only|limit|cap|budget|maximum|at most)/i.test(line),
  );
  return lib.verdict(Boolean(match), match ?? "node contract does not limit returns to compact evidence");
};

const persistedCheckpoints = (_output, context) => {
  if (context?.vars?.checkpoint_expected !== "true") return lib.verdict(true, "projected fan-in is within budget");
  const match = lines(text(context)).find((line) =>
    /checkpoint/i.test(line) && /(?:persist|artifact|file|path|write)/i.test(line),
  );
  return lib.verdict(Boolean(match), match ?? "over-budget graph is not split into persisted checkpoints");
};

module.exports = lib.withWorkspace({
  artifactWritten,
  perNodeResponseLimit,
  fanInBudget,
  largeInputsByPath,
  compactEvidenceReturn,
  persistedCheckpoints,
});
