const { existsSync } = require("node:fs");
const { createRequire } = require("node:module");
const lib = require("./quality-lib");

// Reuse promptfoo's existing HTML parser; no browser or new fixture dependencies.
const parser = () => {
  const fromPromptfoo = createRequire(require.resolve("promptfoo"));
  return import(fromPromptfoo.resolve("parse5"));
};
const body = (context) => {
  const file = lib.resolve(lib.workspace(), context.vars.artifact);
  return existsSync(file) ? lib.read(file) : "";
};
const attrs = (node) => Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
const walk = (node) => [node, ...(node.childNodes ?? []).flatMap(walk)];
const text = (node) => {
  const a = attrs(node);
  if (["script", "style", "head"].includes(node.tagName) || "hidden" in a || a["aria-hidden"] === "true") return "";
  return node.nodeName === "#text" ? node.value : (node.childNodes ?? []).map(text).join(" ");
};
const html = async (context) => {
  const source = body(context);
  const document = (await parser()).parse(source);
  return { source, document, nodes: walk(document) };
};

// "Deliver the requested answer or artifact and report material limitations."
const artifactWritten = (_output, context) => {
  const pass = body(context).trim().length > 0;
  return lib.verdict(pass, pass ? `${context.vars.artifact} exists and is nonempty` : `Write ${context.vars.artifact}; the artifact is missing or empty`);
};

// "Preserve exact identifiers ... numbers". This checks presence, not meaning;
// llm-rubric checks the obligations, limits, evidence and factual interpretation.
const literalFacts = async (_output, context) => {
  const content = context.vars.artifact.endsWith(".html") ? text((await html(context)).document) : body(context);
  const missing = ["STALE_WINDOW_SECONDS", "30"].filter((token) => !new RegExp(`\\b${token}\\b`).test(content));
  return lib.verdict(!missing.length, missing.length ? `Reader-facing content is missing literal source tokens: ${missing.join(", ")}` : "Configuration name and numeric example value are present; threshold meaning is graded separately");
};

// "Keep it usable without network dependencies"; "Set the page language and
// an informative title"; "Keep essential prose ... available if enhancement fails."
const standaloneHtml = async (_output, context) => {
  const { source, document, nodes } = await html(context);
  const problems = [];
  if (!nodes.some((n) => n.nodeName === "#documentType" && n.name === "html")) problems.push("missing HTML doctype");
  if (!nodes.some((n) => n.tagName === "html" && /^en(?:-|$)/i.test(attrs(n).lang ?? ""))) problems.push("missing English page language");
  const title = nodes.find((n) => n.tagName === "title");
  if (!title || !text(title).trim()) problems.push("missing page title");
  if (!nodes.some((n) => n.tagName === "meta" && attrs(n).name === "viewport" && /width\s*=\s*device-width/i.test(attrs(n).content ?? ""))) problems.push("missing responsive viewport");
  if (!nodes.some((n) => n.tagName === "main" || attrs(n).role === "main")) problems.push("missing main landmark");
  if (!/fresh/i.test(text(document)) || !/stale/i.test(text(document)) || !/expired/i.test(text(document))) problems.push("the three states need static explanatory text");
  const embedded = (value) => /^(?:data:|#)/i.test(value);
  for (const node of nodes) {
    const a = attrs(node);
    for (const key of ["src", "poster", ...(node.tagName === "object" ? ["data"] : [])]) {
      if (a[key] && !embedded(a[key])) problems.push(`${node.tagName}[${key}] depends on another file or network`);
    }
    if (node.tagName === "link" && /(?:stylesheet|preload|modulepreload)/i.test(a.rel ?? "") && a.href && !embedded(a.href)) problems.push("linked resource is not embedded");
    if (["image", "use"].includes(node.tagName) && a.href && !embedded(a.href)) problems.push("SVG resource is not embedded");
    if (a.srcset && !/^data:/i.test(a.srcset.trim())) problems.push("srcset depends on another file or network");
  }
  const css = nodes.filter((n) => n.tagName === "style").map((n) => (n.childNodes ?? []).map((c) => c.value ?? "").join("")).join("\n");
  if (/@import\b/i.test(css) || [...css.matchAll(/url\(\s*['"]?([^'"\s)]+)/gi)].some((m) => !embedded(m[1]))) problems.push("CSS imports or loads a resource that is not embedded");
  if (/\b(?:fetch|import)\s*\(\s*['"](?!data:|#)/i.test(source)) problems.push("script loads an external resource");
  return lib.verdict(!problems.length, problems.length ? problems.join("; ") : "Basic standalone markup and declared resources checked; no rendering, network execution or full accessibility verification");
};

// "Give ... visible input labels, keyboard-operable controls ... state feedback."
// "Reflect every displayed control in the underlying explanation or calculation."
// This is a source-level guard against missing labels/handlers, NOT a behaviour
// test. The rubric reviews logic; a browser review must exercise the controls.
const controlMarkup = async (_output, context) => {
  const { source, nodes } = await html(context);
  const controls = nodes.filter((n) => ["input", "select", "button"].includes(n.tagName) && attrs(n).type !== "hidden");
  const custom = nodes.filter((n) => ["slider", "spinbutton", "button"].includes(attrs(n).role));
  const problems = [];
  if (!controls.length && !custom.length) problems.push("no age exploration control found");
  const byId = new Map(nodes.filter((n) => attrs(n).id).map((n) => [attrs(n).id, n]));
  for (const control of [...controls, ...custom]) {
    const a = attrs(control);
    const referenced = (a["aria-labelledby"] ?? "").split(/\s+/).map((id) => byId.get(id)).filter(Boolean).map(text).join(" ").trim();
    const linked = nodes.some((n) => n.tagName === "label" && a.id && attrs(n).for === a.id && text(n).trim());
    let parent = control.parentNode;
    let wrapped = false;
    while (parent) { if (parent.tagName === "label" && text(parent).trim()) wrapped = true; parent = parent.parentNode; }
    const buttonText = ((control.tagName === "button" || a.role === "button") && text(control).trim()) || (control.tagName === "input" && ["button", "submit", "reset"].includes(a.type) && a.value?.trim());
    if (!referenced && !linked && !wrapped && !buttonText) problems.push(`${control.tagName}${a.id ? `#${a.id}` : ""} needs a visible associated label`);
    if (a.tabindex && Number(a.tabindex) < 0) problems.push("an interactive control is removed from keyboard tab order");
    if (custom.includes(control) && !controls.includes(control) && !("tabindex" in a)) problems.push("a custom control has no keyboard focus entry");
  }
  if (!/(?:addEventListener\s*\(\s*['"](?:input|change|click|keydown|keyup)['"]|on(?:input|change|click|keydown|keyup)\s*=)/i.test(source)) problems.push("no inline input, change, click or keyboard handler found");
  const ids = nodes.map((n) => attrs(n).id).filter(Boolean);
  if (new Set(ids).size !== ids.length) problems.push("duplicate IDs can break control/label associations");
  return lib.verdict(!problems.length, problems.length ? problems.join("; ") : "Visible control labels, keyboard entry and event-handler source found; actual interaction remains unverified");
};

module.exports = lib.withWorkspace({ artifactWritten, literalFacts, standaloneHtml, controlMarkup });
