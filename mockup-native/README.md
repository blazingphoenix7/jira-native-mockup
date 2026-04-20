# mockup-native — Native-Jira rebuild

Phase 2 of the strict 3-phase fidelity plan. This is a **faithful rebuild** of the original `../mockup/` using **only features available in Jira Cloud Standard** ($8.60/user/month). No marketplace apps, no custom Forge code, no aspirational UX.

## How to serve

This folder references `../mockup/data.json` and `../mockup/images/` so the 647 styles + 674 CAD renders don't need to be duplicated. Serve from the **project root**, not from inside `mockup-native/`:

```bash
cd C:/Users/AaryanMehta/Downloads/jira
conda run -n jira-dashboard python -m http.server 8765
```

Then open: `http://localhost:8765/mockup-native/`

The original `mockup/` is untouched and still browseable at `http://localhost:8765/mockup/`.

## What this rebuild is modeling

An **intermediate Jira admin** (not a developer) sitting in the Jira Cloud settings UI and configuring:

- Two company-managed projects: **DNJ** and **Elegant**
- 7-phase workflow + 2 side statuses (Hold, Cancelled)
- Custom issue types: `Style`, `Collection`, `Sub-task`
- Custom fields: Style #, PO # / D-code, Category, Vendor, 1KT flag, Sketch/CAD changes, Diamond quality, Gating (checkbox), Milestone log (multi-line text)
- Issue Security Scheme: `ddlny-only`, `dnj-visible`, `elegant-visible`
- Groups: `ddlny-pd`, `vendor-dnj`, `vendor-elegant`
- Permission scheme keeping vendors out of each other's projects
- A few saved JQL filters surfaced as sidebar shortcuts
- One Dashboard with stock gadgets

No code written. No apps installed. No paid plan tier beyond Standard.

## What's GONE compared to `../mockup/`

Everything that was flagged 🟠 or 🔴 in `MOCKUP_FIDELITY.md`:

- **Role switcher** (top-right "View as") — replaced by a tiny demo-mode toggle clearly labeled as "not part of Jira — just for reviewing what vendors would see"
- **Permission banner per page** — real Jira shows per-action errors, nothing persistent
- **"✅ Ready to advance" green banner** — replaced by status dropdown only (Automation handles the notification side-channel)
- **"✨ ready" pill on cards** — replaced by native sub-task count indicator
- **Gallery view** — removed; native Board view with cover images is the jewelry-browsing substitute
- **Collections landing page with 4-thumb mosaic cards** — replaced by a flat filter-backed list
- **Cross-vendor vendor tabs on Collection detail** — replaced by two saved JQL filters
- **Colored side-lane styling for Hold/Cancelled** — removed; columns placed at the far right, uniform styling
- **Attachment grid with phase filter** — replaced by native flat attachment list with upload date
- **Sub-task template buttons (Request Feedback, Upload CAD, etc.)** — replaced by a note explaining Automation will auto-create these on phase entry
- **Emoji per event in History tab** — replaced by native uniform history rows
- **"🔒 Advance (DDLNY)" on transition buttons for vendor roles** — vendors simply don't see those transitions (native behavior)
- **Custom KPI tiles with big numbers + color deltas** — replaced by standard Number gadgets in the Summary / Dashboard pages
- **Vendor comparison panel (side-by-side cards)** — replaced by two Two-Dimensional-Filter-Statistics gadgets in the DDLNY-only dashboard

## What's KEPT (all native on Standard)

- 7-phase workflow + Hold/Cancelled columns
- DNJ + Elegant projects with full vendor isolation
- Sub-tasks with loose reassignment and status + assignee history
- DDLNY-only sub-tasks (via Issue Security Level — vendor sees "Restricted" stubs)
- Attachments (flat list, Jira's native 1 GB per-file limit)
- Comments with @-mentions and edit history
- Native History tab (immutable)
- Native Board / List / Timeline / Calendar / Summary views
- Dashboards with native gadgets
- JQL-powered saved filters surfaced as sidebar shortcuts
- Native Create dialog (single form per issue type)
- Atlassian Design System styling (colors, typography, spacing, components)

## Why the "demo-mode" toggle is still here

Real Jira has no view-as switcher — everyone sees their own account's view. But DDLNY colleagues reviewing this mockup need to understand what each role actually sees. Rather than build 3 separate HTML files (which would hide the difference), I kept a single toggle at the very top clearly labeled:

> ⚠ This demo-mode switcher is NOT part of Jira. In production, vendors log in with their own accounts and only see what their permissions allow.

Treat it the same way you'd treat a "Preview as [role]" button in a Figma mockup — a design-review convenience, not a shipping feature.
