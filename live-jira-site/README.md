# Live Jira Site — DNJ

Real DDLNY Jira build on `ddlny-pd.atlassian.net`. DNJ vendor only for now; Elegant comes later.

This folder is self-contained. Deleting `../mockup/`, `../mockup-native/`, `../derived/`, or `../rough-handwritten-notes/` will not affect anything here.

## Source of truth

- **Site:** https://ddlny-pd.atlassian.net
- **Cloud ID:** `d247e477-c347-468f-8ccf-4e6e6b4569e7`
- **Source data:** `../13 April - I5DIA MOM-4 meetings. (Compiled) v0.1.xlsx` (at repo root, not in mockup/)

## Layout

- `state/` — JSON snapshots of everything created in Jira via API (projects, issue types, fields, workflow, permissions). One file per concern.
- `README.md` — this file. Running build log below.

## Decisions & open questions

Captured so they're not lost. Each links to the step that will action it.

- **[Step 2 - issue types] Team-managed vs company-managed** - blocked. Team-managed API won't allow issue type renames. Need user decision before proceeding.
- **[Step 4 - workflow] Confirm Style phase list with user before building** - user explicitly asked to be re-asked what the phases are. Do NOT port from mockup without re-confirmation.
- **[Step 5 - custom fields] Item detail panel redesign** - fields shown when a Style is clicked need rethinking vs the mockup. Re-ask what fields should appear.
- **[Step 5 - custom fields] Labels field** - multi-select dropdown from a predefined admin-curated list. Users cannot create new labels on the fly; they must request admins to add them.
- **[Step 7 - import] Do NOT bulk-import the "Collections" field from the Excel** - user confirmed the mockup's collections data is junk. Collections will be defined fresh, not ported.

## Build log

Each step records: what was done, why, which MCP/API call was used, and where the resulting IDs landed in `state/`.

### Step 0 — site audit (complete)

- Confirmed API access with `read:jira-work` + `write:jira-work` scopes.
- Confirmed 0 existing Jira projects on the site (clean slate).

### Step 1 - create DNJ project (complete)

- Found 3 stale projects in Jira Trash (DNJ, ELG, KAN) from 2026-04-16, blocking the DNJ key.
- Purged all three permanently via `DELETE /rest/api/3/project/{key}?enableUndo=false` (user chose Option C = full wipe).
- Created fresh DNJ: `POST /rest/api/3/project` with team-managed Kanban template (`com.pyxis.greenhopper.jira:gh-simplified-agility-kanban`).
- Project ID: `10067`, Key: `DNJ`, Lead: Aaryan Mehta (`712020:2dbb4cab-a68e-4cd8-93fd-d104a229a87f`).
- Default issue types provisioned by template: Task, Epic, Subtask. These get reshaped to Style, Collection, Sub-task in Step 2.
- Snapshot: `state/project.json`.

### Step 2 - configure issue types (complete)

- Discovered team-managed Jira blocks issue type renames via REST API. Switched DNJ to company-managed (purged team-managed 10067, recreated as 10068 with template `gh-simplified-kanban-classic`).
- Company-managed Kanban came with 5 default issue types: Task, Sub-task (already hyphenated), Story, Bug, Epic. Plus a project-specific scheme `DNJ: Kanban Issue Type Scheme` (id 10208).
- Renamed `Task` (10080) -> **Style**, `Epic` (10000) -> **Collection**. Sub-task (10081) kept as-is.
- Changed scheme default issue type to Style, then removed Story (10006) and Bug (10082) from the scheme so users only see the 3 types we actually use.
- Final DNJ issue types: Collection (hl=1) -> Style (hl=0) -> Sub-task (hl=-1). Snapshot refreshed in `state/project.json`.

### Step 3 - workflow (complete)

**Phase list confirmed with user** (main + side lanes):

1. Concept / R&D   2. Design   3. CAD   4. PO   5. Sample Production
6. Received by DDLNY India   7. QC by DDLNY India   8. In Transit to NYC
9. Received by DDLNY NYC   10. Approved   11. Repair   12. Credit
Side lanes: Hold, Cancelled. Total: 14 statuses.

**Transition philosophy confirmed with user: full freedom.**
- Any of the 14 statuses can transition to any of the other 13.
- Rationale: transition permissions are DDLNY-NYC-only (Step 5). Workflow guardrails protect against threats that don't exist in this trust model. Freedom wins for handling real-world exceptions.

**What's done:**
- First attempt: created 14 standalone statuses via `POST /rest/api/3/statuses` (10117-10130). Workflow create API rejected them as "already in use" — it wants to create statuses inline, not reference existing ones.
- Deleted the 14 standalone statuses, then created workflow via `POST /rest/api/3/workflows/create` which made both atomically. New status IDs: 10131-10144. Workflow id `c033275e-560c-4ec2-a24c-6c157af7d0a5`.
- Transitions: 1 INITIAL (`Create -> Concept / R&D`) + 14 GLOBAL (one per target status).
- Created workflow scheme `DNJ Workflow Scheme` (id 10102) mapping Style -> DNJ Style Workflow; Collection + Sub-task -> `jira` (default To Do / In Progress / Done).
- Associated scheme with DNJ project via `PUT /rest/api/3/workflowscheme/project`.
- Updated DNJ Kanban board (id 69):
  - Filter JQL changed to `project = DNJ AND issuetype = Style ORDER BY Rank ASC` so the board only shows Styles.
  - All 14 Style statuses mapped as columns via `PUT /rest/greenhopper/1.0/rapidviewconfig/columns` (undocumented but stable endpoint; public REST has no equivalent).
- Snapshots: `state/statuses.json`, `state/workflow.json`, `state/workflow_scheme.json`, `state/board.json`.

**Left as future follow-up:**
- The old auto-generated workflow scheme (id 10069) and workflow (`Software Simplified Workflow for Project DNJ`) are orphaned but not cleaned up — low priority, harmless.
- Collection + Sub-task workflows use defaults. Revisit if DDLNY wants custom phases there.

### Step 4 - custom fields (complete for Style; Collection deferred)

**Decided with user:**
- All fields optional at create time (Style # may be empty in early phases).
- All fields publicly visible in v1; DDLNY-only fields handled later via screen schemes.
- Labels field uses admin-curated list, NOT Jira's free-text default.

**14 custom fields created** via `POST /rest/api/3/field` (IDs `customfield_10071` through `customfield_10084`). Snapshot: `state/custom_fields.json`.

Fields (name -> type -> starter options if any):
- DDLNY Style # -> short text
- Vendor Style # -> short text
- PO # / D-code -> short text
- Category -> select -> Ring, Pendant, Earring, Bracelet, Necklace, Chain, Anklet, Brooch, Cufflinks (starter; DDLNY to finalize)
- Diamond Quality -> short text
- Diamond Weight (ct) -> number
- Diamond Type -> select -> LGD, Natural
- Gold Color -> select -> Yellow, White, Rose, Two-tone (starter; DDLNY to finalize)
- Gold Quality -> select -> 10K, 14K, 18K, 22K, 24K (starter; DDLNY to finalize)
- Gold Weight (g) -> number
- Target Price (USD) -> number
- Cloud Files URL -> URL
- Source -> short text
- Labels -> multi-select (empty; admin-curated)

**Screen wiring:**
- All 14 fields added to tab `Field Tab` (id 10085) on screen `DNJ: Kanban Default Issue Screen` (id 10082) via `POST /rest/api/3/screens/{screenId}/tabs/{tabId}/fields`.
- The other screen (`DNJ: Kanban Bug Screen`, id 10083) is unused since we removed Bug from DNJ's issue type scheme in Step 2.

**Deferred:**
- Collection custom fields (Owner is built-in Assignee; Customer / Launch date / Target retail are custom; Progress / counts are computed). Not wired yet. User to decide when.
- Detail panel / issue layout fine-tuning. Default Jira layout shows fields with values; custom reordering via Project settings -> Issues -> Issue Layouts can be done later if needed.
- DDLNY-only field visibility (separate screens for vendor vs DDLNY view). Wire up when first DDLNY-only field is added.

### Step 4b - screen cleanup + Sub-task rename (complete)

Found after user-driven UI audit of the Create dialog:
- **Removed from DNJ screen (irrelevant built-in fields):** Components (`components`), Fix versions (`fixVersions`), Team (`customfield_10001`), built-in Labels (`labels`). Our custom Labels (`customfield_10084`) remains, admin-curated multi-select as designed.
- **Renamed Sub-task issue type (id 10081) -> Task** per user request ("Task" is friendlier language for DDLNY). Underlying `subtask: true, hierarchyLevel: -1` preserved -- Tasks still behave as children of a Style. Created via "Create subtask" / "+ Add" on the Style view, NOT from the main Create button (Jira architectural constraint).

Remaining fields on DNJ default screen:
Summary, Issue Type, Parent, Description, Reporter, Priority, Start date, Security Level, Attachment, Due date, Linked Issues, Assignee + 14 custom fields (DDLNY Style #, Vendor Style #, PO # / D-code, Category, Diamond Quality, Diamond Weight (ct), Diamond Type, Gold Color, Gold Quality, Gold Weight (g), Target Price (USD), Cloud Files URL, Source, Labels).

### Step 4c - Collections via custom field (complete)

User considered a separate `PD` project for Collections and rejected it in favor of simplicity. Reasoning:
- Their team's tech capability is the hard constraint (self-described "boomers on steroids"). Fewer projects = fewer clicks.
- No Collection-level metadata has been requested (launch dates, customers, target revenue, etc.). Collections are currently just labels.
- Cross-vendor leakage concern: if Collections aren't entities, there's no "Cross-vendor" field anywhere, nowhere for it to leak.

**Implemented:**
- New custom field **Collection** (`customfield_10085`), single-select, admin-managed option list (empty at creation). Added to DNJ default screen.
- No PD project created.
- No cross-vendor flag field anywhere.

**Upgrade path if DDLNY later wants Collection-level metadata:**
- Create PD project with Collection issue type.
- Convert each option value into a PD issue (one-time migration, ~30 min of work).
- Swap this field from `select` to issue-picker pointing at PD.
- No data loss; no schema break for existing Styles.

**Collection issue type removed from DNJ scheme** (`DELETE /rest/api/3/issuetypescheme/10208/issuetype/10000`). Create dropdown now shows only Style. The Collection issue type still exists at site level; if we ever build the PD project later we re-enable it.

### Step 4d - dropdown cleanup (complete)

User rule (saved to memory as `feedback_dropdowns.md`): **all dropdowns sorted alphabetically, always use correct spellings**.

Applied:
- **Category options replaced.** Old 9 (Ring, Pendant, Earring, Bracelet, Necklace, Chain, Anklet, Brooch, Cufflinks) -> new 7 alphabetical (Bangle, Bracelet, Brooch, Earring, Necklace, Pendant, Ring). Option IDs regenerated (10040-10046). Safe to replace because no Styles exist yet.
- **Gold Color options re-sorted** (Yellow/White/Rose/Two-tone -> Rose/Two-tone/White/Yellow). IDs regenerated (10047-10050).
- Gold Quality (10K/14K/18K/22K/24K) and Diamond Type (LGD/Natural) already sorted; no change.

### Step 4e - remove "Received by DDLNY India" phase (complete)

User clarified: DDLNY India does QC at the vendor's factory, not at a separate DDLNY India office. So the "Received by DDLNY India" phase was removed.

- **Workflow update via UI** (user action). API attempts hit a known Jira Cloud v2 workflow-update bug when removing a single status; after 5 payload shapes all rejected with contradictory errors, fell back to UI. User opened workflow editor, deleted the status, chose Sample Production as the fallback mapping for any hypothetical issues.
- **API cleanup afterwards:**
  - Deleted orphaned global status 10136 via `DELETE /rest/api/3/statuses?id=10136`.
  - Rebuilt Kanban board columns (13 now, was 14) via the greenhopper config endpoint.
  - Updated `state/statuses.json` to drop 10136.
- New workflow count: **13 statuses, 14 transitions** (13 GLOBAL + 1 INITIAL).

### Step 5 - permission scheme (vendor isolation) [complete]

**User decisions locked in:**
- DNJ vendor: Path 3 (never edit fields; all change requests go through DDLNY via revised docs / Tasks)
- DNJ vendor: Option A on assign (they CAN assign Tasks to DDLNY people, e.g., Sapna -> Wincy on a BOM request)
- DDLNY India: strict transition enforcement (Option X, target-only gating — accepts edge case that India could transition TO India-targets from any source, harmless in practice)

**Three groups created at site level:**
- `ddlny-nyc` (id `1fe19b86-...`) — 1 member: aaryan@ddlny.com
- `ddlny-india` (id `dcdfdaf1-...`) — 0 members
- `dnj-vendor` (id `b1ad919b-...`) — 0 members

**Permission scheme `DNJ Permission Scheme` (id 10102)** attached to DNJ. Matrix:

| Permission | ddlny-nyc | ddlny-india | dnj-vendor |
|---|---|---|---|
| Browse Project | yes | yes | yes |
| Create Issues | yes | yes | yes |
| Edit Issues | yes | yes | **no** |
| Delete Issues | yes | **no** | **no** |
| Assign Issues | yes | yes | yes (for creating+assigning Tasks) |
| Transition Issues | yes | yes (but target-gated by workflow conditions) | **no** |
| Add Comments | yes | yes | yes |
| Edit All Comments | yes | **no** | **no** |
| Edit Own Comments | yes | yes | yes |
| Link Issues | yes | yes | yes |

**Workflow conditions applied** (for strict India gating):
- Condition rule: `system:restrict-issue-transition` (only rule Jira Cloud supports for this)
- 10 GLOBAL transitions (NYC-only targets): condition = ddlny-nyc only
- 3 GLOBAL transitions (QC / In Transit NYC / Repair): condition = ddlny-nyc OR ddlny-india
- INITIAL transition (Create): no condition (anyone with CREATE_ISSUES can create new Styles)

**Still outstanding (future work):**
- No DDLNY India user accounts yet (0 members in `ddlny-india`)
- No DNJ vendor user accounts yet (0 members in `dnj-vendor`)
- Will be added when real users exist; permission scheme is live and waiting.

Snapshots: `state/permission_scheme.json`, `state/workflow.json`.

### Step 5b - Task swap from subtask to standalone (complete)

User decided pre-import: Tasks should NOT be compulsorily tied to a Style — anyone can create a Task, assign to anyone, and optionally link to a Style via "Linked Issues."

- Deleted old Task issue type (10081, `subtask: true, hierarchyLevel: -1`) from DNJ scheme + globally.
- Created new Task issue type (10115, `subtask: false, hierarchyLevel: 0`).
- Added new Task to DNJ issue type scheme.
- Result: DNJ issue types are now **Style (10080)** and **Task (10115)** — both hierarchy 0, non-subtask.

Wincy's BOM-request use case now works as:
1. Create -> Task -> assign to Sapna -> description "Need BOM for Style XYZ" -> Linked Issues: `relates to DNJ-42` -> submit.
2. Task appears in the DNJ project and (via Linked Issues) on the Style itself.

### Step 6 - test data import (complete)

User-approved test load (option A / option B / H1 / no fake accounts, all attributed to Aaryan):
- Added seed options to `Collection` and `Labels` fields (alphabetical, 6 and 7 options respectively).
- Selected 24 rich DNJ items from `mockup/data.json` (pool of 464 items with comments + milestones).
- Distributed across all 13 phases: 2-3 per main phase; 1 each in Credit / Hold / Cancelled.
- Piece-type mapping: style-number prefix -> Category (R=Ring, E=Earring, P=Pendant, D=Necklace).
- Gold color inferred from style-number suffix (LY=Yellow, LW=White, LR=Rose, LWY=Two-tone).
- Synthesized fields: Diamond Weight/Type, Gold Quality/Weight, Target Price. Real fields: Vendor Style #, PO # / D-code, Source, Collection, Labels (mapped from mockup categories).
- **Full progression history (H1)**: each Style created in Concept/R&D then transitioned through every intermediate phase up to target. Changelog shows 2-8 status transitions per Style.
- **Rich synthetic comments (B)**: ~7-10 comments per Style. Mix of phase-entry narrative ("Sample passed India QC. Shipped to NYC.") plus 2 real mockup comments appended at the end, clearly tagged `[mockup comment]`.
- All 24 issues are keys DNJ-1 through DNJ-24. Import log at `state/test_import_log.json`.

Ready for colleague testing. To wipe and restart: `project = DNJ` JQL search -> bulk delete -> re-run import (reversible any time).

### Step 7 - Advance button for one-click phase progression (complete)

User request: a shortcut for "move to the next phase in the happy-path." Added 8 **DIRECTED** transitions named "Advance," one per consecutive pair in the linear flow:

| Source | Target | Access |
|---|---|---|
| Concept / R&D | Design | NYC |
| Design | CAD | NYC |
| CAD | PO | NYC |
| PO | Sample Production | NYC |
| Sample Production | QC by DDLNY India | NYC + India |
| QC by DDLNY India | In Transit to NYC | NYC + India |
| In Transit to NYC | Received by DDLNY NYC | NYC |
| Received by DDLNY NYC | Approved | NYC |

- Each directed transition is only valid from its specific source; an issue in Design only sees the Design->CAD "Advance" option, not the others.
- Issues in `Approved` (terminal) have no Advance available.
- Issues in side lanes (Repair, Credit, Hold, Cancelled) have no Advance.
- Same permission conditions as GLOBAL transitions (NYC-only / NYC+India / vendors never).
- Full 13-way GLOBAL dropdown for arbitrary moves remains unchanged.

Workflow now has **22 transitions total**: 1 INITIAL + 13 GLOBAL + 8 DIRECTED.

**Reverted 2026-04-22.** User decided the Advance button in the modern Jira Cloud UI wasn't visible enough (it lived inside the status dropdown, not as a standalone button next to it, since Jira Cloud no longer supports standalone transition buttons). All 8 DIRECTED Advance transitions removed. Workflow restored to 14 transitions (1 INITIAL + 13 GLOBAL). If we revisit this later, the options are: (a) Kanban drag-and-drop between columns, (b) paid marketplace app, (c) custom Forge app.

### Step 8 - minimal Style Create screen (complete)

User request: the Create dialog should not show any of the 14 custom fields (details are filled in as the Style progresses through phases, not at creation).

**What was built:**
- New screen **"DNJ: Minimal Create Screen"** (id 10116) with only 7 fields: Description, Priority, Assignee, Due date, Attachment, Linked Issues, Reporter. (Summary + Issue Type are always auto-rendered by Jira regardless of screen config.)
- Updated Screen Scheme `DNJ: Kanban Default Screen Scheme` (id 10082):
  - `default` -> existing full DNJ: Kanban Default Issue Screen (used for View + Edit)
  - `create` -> new DNJ: Minimal Create Screen (used for Create only)

**Removed from Create (still available on View/Edit of the issue):**
- All 14 custom fields (DDLNY Style #, Vendor Style #, PO # / D-code, Category, Diamond Quality/Weight/Type, Gold Color/Quality/Weight, Target Price, Cloud Files URL, Source, Labels, Collection)
- Parent (no Collection issue type means Parent has nothing useful to point at in our setup)
- Security Level (vendor isolation is handled at project level, not per-issue)
- Start date (fill on Edit if needed)

**User-facing result:** clicking Create -> Style now shows a minimal form. Rich detail fields are filled in over time on the issue view as the Style progresses through phases.

### Step 9 - schema tuning: add 4 text fields, convert Diamond Type to multi-select, reorder (complete)

User requests:
1. Add text fields: Diamond Color, Diamond Shapes, Gemstone Types, Gemstone Shapes.
2. Diamond Type -> multi-select (pick BOTH LGD and Natural when applicable).
3. Group related fields together on the issue screen.

**Changes applied:**

- **4 new text fields** created and added to DNJ screen:
  - Diamond Color (`customfield_10118`)
  - Diamond Shapes (`customfield_10119`)
  - Gemstone Types (`customfield_10120`)
  - Gemstone Shapes (`customfield_10121`)

- **Diamond Type rebuilt as multi-select** (Jira doesn't support in-place type changes):
  - Saved current Diamond Type values from all 24 test Styles
  - Deleted old single-select field (`customfield_10077`)
  - Created new multi-select field (`customfield_10122`) with options LGD + Natural
  - Re-applied saved values on each Style (each now holds a single-element array `[LGD]` or `[Natural]` but can accept both)
  - Added to screen

- **Screen reordered** into logical groups on DNJ: Kanban Default Issue Screen:
  ```
  Built-in basics (Summary, Issue Type, Description, Assignee, Priority, Due date, Start date, Reporter, Parent, Security, Attachment, Linked Issues)
  Identification (DDLNY Style #, Vendor Style #, PO # / D-code, Category)
  Grouping (Collection, Labels, Source)
  Diamond (Diamond Type, Diamond Color, Diamond Quality, Diamond Shapes, Diamond Weight (ct))
  Gemstone (Gemstone Types, Gemstone Shapes)
  Metal (Gold Color, Gold Quality, Gold Weight (g))
  Commercial (Target Price (USD))
  Files (Cloud Files URL)
  ```
- Total fields on edit/view screen: 31.

**Note on issue-view sidebar order**: Jira Cloud's right-side "Details" panel follows its own Issue Layout config, which is UI-only (Project settings -> Issues -> Issue Layouts). The screen order above applies to Edit/View dialogs. If the sidebar ordering looks mixed up on issue pages, user can drag-reorder it in the Issue Layouts settings — UI, not API.

### Step 10 - Collection field: dropdown -> free text (complete)

User reversed the earlier decision to have Collection as a managed dropdown. Changed to free-text so users can type whatever Collection name they want without admin pre-seeding options.

- Saved existing Collection values from 4 test Styles (DNJ-1, DNJ-11, DNJ-13, DNJ-15).
- Deleted old single-select Collection field (`customfield_10085`, with 6 seeded options: 1KT Line, Bridal Classic, Everyday Stackables, LGD Signature, Men's Collection, Twinkling Collection).
- Created new text Collection field (`customfield_10123`).
- Added to DNJ screen, positioned after Category.
- Re-applied saved values as plain text.

**Upgrade path** still open: if DDLNY later wants structured Collections (with launch date, customer, etc.), convert each unique text value into a real PD-project issue and swap the field to an issue-picker. Still ~30 min of migration work when we're ready.

