---
name: Jira dashboard mockup
description: Where the HTML mockup lives and how to serve/screenshot it
type: project
originSessionId: 909c7cf1-348c-40c0-be3d-d9d0c2e1290a
---
Mockup of the planned Jira dashboard — built with real extracted data from the DNJ April 2026 report, to validate the design before touching a real Jira site.

- Files: `mockup/index.html` + `mockup/assets/{app.css,app.js}` + `mockup/data.json` + `mockup/images/` (647 CAD renders keyed to issue keys).
- Serve locally: `cd mockup && python -m http.server 8765` (run inside the conda env). Open `http://localhost:8765/`.
- Screenshots: `scripts/screenshot_mockup.py` (Playwright) dumps all 3 roles × 6 views to `derived/screenshots/`.
- Data pipeline: `scripts/parse_dnj_excel.py` → `scripts/parse_sourced_sheet.py` → `scripts/find_data_header.py` → `scripts/extract_items.py` → `scripts/prep_mockup_data.py`.
- Excel headers were at row **18** of the "Sourced" sheet (669 rows × 63 cols, 674 embedded images).

**Why:** Aaryan has zero Jira experience and wants to see how the final thing will look before any Jira admin actions — with real data, not lorem ipsum.
**How to apply:** Any UX/workflow change should be previewed in the mockup first; the Jira REST-API build mirrors whatever the mockup settles on.

Role switcher in the top-right demos the vendor isolation: DDLNY sees all 647 items + vendor-compare panel; DNJ sees DNJ-only with a warning banner; Elegant sees an empty state (isolation is enforced in-JS as a stand-in for Jira Issue Security).
