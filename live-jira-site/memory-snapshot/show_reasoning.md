---
name: Show reasoning in the visible response
description: Write thinking/reasoning into the visible response, not hidden thinking blocks — the CLI doesn't surface hidden thinking
type: feedback
originSessionId: 909c7cf1-348c-40c0-be3d-d9d0c2e1290a
---
Always write reasoning into the visible response (the text Aaryan actually sees in the terminal). Do NOT rely on hidden `<thinking>` blocks — Claude Code's terminal does not render them; he sees only generic spinner text during thinking, which is useless for following along.

Before taking any non-trivial action (edit, build step, decision fork, tool call with risk), state:
1. What I'm about to do
2. Why (the trade-off / alternatives considered)
3. What I'm assuming (so it can be corrected before I act)

For trivial actions (single file read, obvious edit), brief one-line intent is enough.

**Why:** Aaryan hit this limitation twice. Once he pushed back saying he could see thinking weeks ago — I (wrongly) speculated he was mistaken. He confirmed again, visibly frustrated. This is a real CLI constraint (GitHub issue #36006) — not something I can turn on with a setting. Putting reasoning in the visible text is the only reliable workaround.

**How to apply:**
- Long prose reasoning goes in the final response, before tool calls
- Mid-flow course corrections get one-sentence visible notes ("reconsidering — that would break X, switching to Y")
- Don't repeat in hidden thinking what's already visible (wasted tokens)
- Still keep final turn summaries short per the Explanatory style rules
