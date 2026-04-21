---
"@paulhammond/dotfiles": minor
---

feat: add find-skills skill for discovering agent skills from the open ecosystem

Add the `find-skills` skill sourced from [vercel-labs/skills](https://github.com/vercel-labs/skills/tree/main/skills/find-skills). Helps Claude discover and install skills from the open agent skills ecosystem (`npx skills`, [skills.sh](https://skills.sh/)) when the user asks "how do I do X", "find a skill for X", or expresses interest in extending capabilities.

**What it does:**
- Activates when users ask how to accomplish something that might exist as an installable skill
- Checks the [skills.sh leaderboard](https://skills.sh/) first for well-known skills
- Runs `npx skills find [query]` with domain-appropriate keywords
- Verifies quality before recommending (install count ≥ 1K, trusted sources, GitHub stars)
- Presents options with install commands and links; offers to install with `npx skills add <owner/repo@skill> -g -y`
- Falls back to direct help or suggesting `npx skills init` when no skill matches

**Licensing:** Vendored under MIT. The upstream repository declares MIT in its `package.json` and README but does not ship a root `LICENSE` file, so a reproduced MIT notice is included at `claude/.claude/skills/find-skills/LICENSE` to preserve attribution. The install script downloads both `SKILL.md` and `LICENSE`.
