---
name: How we'll build the real Jira instance
description: Two-track plan: REST API for admin, Playwright for UI-only, Rovo MCP for ops
type: project
originSessionId: 909c7cf1-348c-40c0-be3d-d9d0c2e1290a
---
Aaryan doesn't have Computer Use enabled. Plan agreed Apr 16, 2026:

**Option A — Jira Cloud REST API (default).** Write Python scripts in the `jira-dashboard` env, auth with an API token, do all admin work:
- Create projects DNJ, ELG
- Create custom fields (Style #, PO #, CAD URL, Category, Vendor, 1KT flag, Sketch/CAD change counters, Diamond Quality, Milestone Log)
- Create workflow with the statuses observed in the mockup (13 states)
- Create Issue Security Scheme (vendor-dnj / vendor-elegant / ddlny-only)
- Create groups (`ddlny-pd`, `vendor-dnj`, `vendor-elegant`) and permission schemes
- Create dashboards + gadgets
- Bulk-import the 647 DNJ styles from the Excel

**Option B — Playwright (Brave via Chromium).** Fallback for anything REST can't reach (some marketplace apps, certain UI-only settings). Headless mode works; use `python -m playwright` not the CLI.

**Rovo MCP (claude_ai_Atlassian_Rovo__*):** Reserved for day-to-day ops after setup (create/edit/comment/transition issues).

**Why:** Computer Use unavailable → need scripted admin path. REST API is the cleanest, most reproducible option.
**How to apply:** Needs from Aaryan before building: (1) Jira site URL, (2) admin email, (3) API token from id.atlassian.com, (4) confirmation of Site Admin role. Store token in `.env` (git-ignored), load via `python-dotenv`.
