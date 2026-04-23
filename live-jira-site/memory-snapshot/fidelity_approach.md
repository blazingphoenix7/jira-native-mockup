---
name: Mockup-fidelity-first approach
description: Strict 3-phase order — audit fidelity first, make mockup native-Jira-pixel-perfect, THEN add features
type: feedback
originSessionId: 909c7cf1-348c-40c0-be3d-d9d0c2e1290a
---
Going forward, all mockup work happens in this strict order:

**Phase 1 — Fidelity audit.** Every existing feature in the mockup gets a tier label before any new work:
- 🟢 Native — Jira Cloud out of the box
- 🟡 Automation — free Jira Automation rule, behavior-only
- 🟠 Marketplace — requires paid 3rd-party add-on
- 🔴 Custom UI — impossible without a custom frontend on top of Jira

**Phase 2 — Native-Jira pixel rebuild.** Rewrite the mockup's visual layer to match native Jira Cloud's actual look (Atlassian Design System — colors, typography, component spacing, card/drawer/dialog shapes). Any 🟠/🔴 feature from Phase 1 either gets replaced with the tier's native equivalent or is explicitly marked in-UI as "requires add-on / custom UI".

**Phase 3 — New features** from `MOCKUP_TODO.md`. Only after Phase 2 sign-off. Every new feature gets a tier label BEFORE building, and 🔴 features never ship without explicit approval.

**Why:** Aaryan's concern (Apr 2026): "what if me and my colleagues approve the mockup version and when we go about building the final Jira site it either does not have the views and functionalities we fell in love with." The mockup was drifting aspirational; the real Jira site has constraints. Preventing expectation gaps now is cheaper than rebuilding trust later.

**How to apply:** Do NOT skip Phase 1 or Phase 2. Do NOT add features before completing them. When adding anything new, label the tier in-line at the moment of building — not after.
