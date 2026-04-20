# DDLNY Jira Mockup

Two mockups of a Jira Cloud workspace for **DDLNY** (NYC jewelry wholesale) and its India vendors **DNJ** and **Elegant** — designed to let product-development teams and vendors coordinate 600+ styles across a 7-phase workflow with strict vendor isolation.

- **`mockup/`** — *aspirational* mockup. Custom-UI features (gallery view, KPI tiles, advance banner, role switcher, cross-vendor Collection tabs). Useful for brainstorming but not a 1:1 match for what real Jira Cloud ships.
- **`mockup-native/`** — *native* mockup. Rebuilt using only features available on Jira Cloud **Standard** ($8.60/user/month). No marketplace apps, no custom Forge code. This is what an intermediate Jira admin could actually configure through the settings UI.

Both mockups are populated with real data extracted from DDLNY's DNJ April 2026 MOM report (647 styles, 113 collections, 674 CAD renders).

## Serve locally

```bash
cd <repo-root>
python -m http.server 8765
```

Then open:

- Aspirational: http://localhost:8765/mockup/
- Native rebuild: http://localhost:8765/mockup-native/

The native mockup references `../mockup/data.json` and `../mockup/images/`, so both folders need to be served from the same root.

## Tour the native mockup

### Top nav
- **Your work** — cross-project home page; recent items + assigned-to-me list.
- **Projects ▾** — default view; opens the current project's sidebar.
- **Filters ▾** — saved JQL filters with live results (auto-scoped by permissions).
- **Dashboards ▾** — dashboard landing + a fully-built "Wincy's PD Overview" with native gadgets.
- Global search — type a style number / PO code / keyword → cross-project results.
- Notifications bell — role-scoped unread count + recent comment thread.

### Project switcher
Click the project name in the sidebar to switch between:
- **DNJ** — DNJ vendor's styles (380 items).
- **Elegant** — Elegant vendor's styles (267 items).
- **Product Development (PD)** — cross-vendor Collections (113 items).

### Role simulation (demo-mode bar at top)
The yellow bar at the very top lets you preview what each role sees:
- **Aaryan M. (DDLNY Admin)** — full visibility.
- **Rajesh P. (DNJ vendor)** — only DNJ + PD.
- **Priya S. (Elegant vendor)** — only Elegant + PD.

This toggle is **not** part of real Jira — in production, users log in with their own accounts and only see what their permissions allow. Kept here purely to let DDLNY colleagues preview each vendor's experience in a single session.

## Key architecture decisions

| Area | Decision |
|------|----------|
| Plan | Jira Cloud **Standard** ($8.60/user/month). No marketplace apps. |
| Projects | Three: **DNJ**, **Elegant**, **PD**. Cross-project permissions enforce vendor isolation. |
| Issue types | Style, Collection, Sub-task. |
| Workflow | 7 phases: Concept/R&D → Design → CAD → PO → Sample Production → Received & Approved → Repair. Plus side statuses Hold + Cancelled. |
| Transitions | **DDLNY-only**. Every workflow condition requires `User In Group: ddlny-pd`. Vendors cannot move phases. |
| Cross-vendor Collections | Collections live in the PD project. Each Style has a custom `Collection` field pointing to a PD key (e.g. `PD-42`). One saved JQL filter serves all three roles — Jira's permission engine auto-scopes the results. |
| Attachments | Native flat list. 1 GB per-file limit. Larger files go in a `Cloud files` custom URL field. |
| Vendor isolation | Issue Security Scheme with three levels: `ddlny-only`, `dnj-visible`, `elegant-visible`. Auto-applied by Automation rule on Style create. |

## Strategy docs

- `MOCKUP_FIDELITY.md` — feature-by-feature audit of the aspirational mockup against native Jira. Every feature tiered 🟢 Native / 🟡 Automation / 🟠 Marketplace / 🔴 Custom UI.
- `MOCKUP_TODO.md` — what's built, what's pending, what's decided.

## Scripts

The `scripts/` folder contains the Python pipeline that extracted 647 styles + 674 CAD renders from the source Excel:

- `parse_dnj_excel.py` — reads the DNJ MOM report.
- `parse_sourced_sheet.py`, `find_data_header.py`, `extract_items.py` — locate and pull the item rows.
- `prep_mockup_data.py` — assembles `mockup/data.json`.
- `screenshot_mockup.py` — Playwright screenshot tool for all 3 roles × all views.

Run via the Miniconda environment (see `README-env.md`):

```bash
conda run -n jira-dashboard python scripts/parse_dnj_excel.py
```

## What's not in this repo

- `.env` — contains API tokens; kept local.
- The 99 MB raw Excel file — extracted data already lives in `mockup/data.json`.
- `derived/` — intermediate processed files; regenerable from `scripts/`.
- `.claude/` — local Claude Code settings.
