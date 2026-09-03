// Output transform for the skill-routing suite.
//
// The agent's reply is a side effect here — the only thing under test is which
// skills it loaded. Rewrite the displayed output so the routing decision reads
// first in the promptfoo viewer, followed by the tool-call trail and a short
// excerpt of the reply. Assertions are unaffected: `skill-used` and the
// no-skill JavaScript check read the provider metadata, not this string.

const countBy = (items) =>
  items.reduce((acc, item) => ({ ...acc, [item]: (acc[item] ?? 0) + 1 }), {});

module.exports = (output, context) => {
  const toolCalls = context?.metadata?.toolCalls ?? [];
  const skills = toolCalls.filter((call) => call.name === "Skill").map((call) => call.input?.skill ?? "?");
  const others = countBy(toolCalls.filter((call) => call.name !== "Skill").map((call) => call.name));
  const trail = Object.entries(others)
    .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
    .join(", ");
  const excerpt = String(output ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);

  return [
    `SKILLS LOADED: ${skills.length > 0 ? skills.join(" → ") : "(none)"}`,
    `other tools: ${trail || "(none)"}`,
    "",
    `reply excerpt: ${excerpt}${excerpt.length === 400 ? "…" : ""}`,
  ].join("\n");
};
