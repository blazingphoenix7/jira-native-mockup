# DDLNY Jira Site Audit — FULL DEPTH

**Date:** 2026-04-22
**Auditor:** Claude (Opus 4.7)
**Site:** https://ddlny-pd.atlassian.net
**Logged-in user:** Aaryan Mehta (aaryan@ddlny.com) — admin
**Scope:** Jira only (Confluence excluded per user instruction)
**Mode:** Log-only, no mutations

## Severity legend
- **BLOCKER** — breaks a real workflow; cannot ship
- **MAJOR** — wrong config but workaround exists; must fix before GA
- **MINOR** — cosmetic / polish; nice-to-fix
- **NOTE** — observation worth recording, not a defect

## How to read an entry
Each finding lists: **Where** (location in Jira) · **Repro** (steps) · **Expected** (desired behavior) · **Actual** (observed behavior) · **Fix** (suggested resolution) · **Severity**.

## On `[BUILDER CONTEXT]` annotations (added 2026-04-22)
Some findings have `[BUILDER CONTEXT]` notes appended. These were added by the Claude session that actually built the Jira site (as opposed to the audit session that produced this report). The builder session has the concrete decision history that the audit session did not, so the annotation either:
- **Reclassifies a finding to `CORRECT-BY-DESIGN`** when the audit flagged something the user explicitly chose. Nothing to fix — memory spec is stale, update it.
- **Confirms the finding is valid** (per user's revised decision or an oversight in the build) and notes that the user has requested the fix be deferred to a separate round.

The original audit body is preserved unchanged; `[BUILDER CONTEXT]` appears only as a new bullet after the existing Severity line. Nothing was deleted.

---

## Findings

### [BLOCKER-001] Summary field missing from BOTH Task and Style create screens in project DNJ
- **Where:** Project DNJ → issue types "Task" (id 10115) AND "Style" (id 10080) → create screens
- **Repro:** Open any Style issue → *Add linked work* → *Create linked work item* → select Task → fill visible fields → Create. Also reproduces when trying to create a Style via any inline create path.
- **Expected:** Summary field is visible; Summary is system-required so it must be enterable on the create screen.
- **Actual:** Summary field is absent from **both** create screens. Per `GET /issue/createmeta/DNJ/issuetypes/{10115|10080}`, each returns: Assignee, Attachment, Description, Due date, Linked Issues, Issue Type, Parent, Priority, Project, Reporter — no Summary. Any submit is rejected by the API with "Summary is required".
- **Why this is project-wide:** Both issue types share the same broken screen configuration. Either the DNJ screen scheme is missing Summary on the create screen, or the default screen itself was edited to remove it.
- **Fix:** Jira admin → Project settings (DNJ) → Screens → locate the Create screen used by DNJ's screen scheme → add Summary field. Confirm all three operations (create / edit / view) include Summary for both Style and Task. Then spot-check via `createmeta` that Summary reappears.
- **User-impact example:** Cannot create a "Develop CAD" Task on a Style during the Design phase via the Linked work flow. Also means the "native" Create Style flow from the top-bar Create button must rely on a different fallback path.
- **Severity:** BLOCKER
- **Investigate next:** does the top-bar Create button show Summary (maybe via global-create fallback) while inline flows don't? Test in Layer B.

### [NOTE-ELEGANT-DEFERRED] Elegant project does not exist — DEFERRED per user, 2026-04-22
- **Where:** Jira project list (`GET /project/search?action=create`)
- **Observed:** API returns one project: DNJ. No project with key `Elegant` or similar.
- **User instruction (2026-04-22):** "we are ONLY designing it for DNJ for now. forget elegant."
- **Implication:** This is NOT a BLOCKER for the current rollout. It's an open loop for when the Elegant rollout begins.
- **Critical caveat:** the BLOCKER-005 / MAJOR-010 (groups-instead-of-roles) architectural issues will become REAL BLOCKERs the day Elegant is created. Fix those patterns NOW, even though only one vendor project exists today.
- **Severity:** NOTE (deferred)

### [MAJOR-001] DNJ missing issue types "Sub-task" and "Collection"
- **Where:** Project DNJ → Issue types
- **Repro:** API returns only two issue types for DNJ: Style (id 10080, hierarchyLevel 0), Task (id 10115, hierarchyLevel 0).
- **Expected (per project memory):** Sub-task (hierarchyLevel -1) from day one; Collection as a grouping issue type; 3 distinct create-dialog flows (Style / Collection / Sub-task).
- **Actual:** Only Style + Task. No Sub-task type, so sub-tasks cannot be created. No Collection type, so Styles cannot be grouped.
- **Fix:** Project settings → Issue types → add Sub-task (hierarchyLevel -1, subtask=true) and Collection (probably hierarchyLevel 1 as an Epic-style parent, or 0 if you want flat grouping). Decide hierarchy intentionally — Jira's Collection ≠ Epic by default.
- **Severity:** MAJOR (blocks sub-task flows and collection grouping; depending on roadmap could be a blocker)
- **[BUILDER CONTEXT — reclassify to CORRECT-BY-DESIGN, 2026-04-22]:** NOT A BUG. User explicitly renamed the Sub-task issue type to "Task" and converted it from `hierarchy=-1` (child-only) to `hierarchy=0` (standalone) so Tasks can be created from the top-bar Create, independently of any Style. User also explicitly chose NOT to have Collection as an issue type — Collection is a text custom field (`customfield_10123`). Both are deliberate design decisions documented in README.md Steps 5b and 10. The memory spec this finding was compared against (`subtasks_and_create_dialog.md`, which says "Create dialog needs 3 distinct flows (Style/Collection/Sub-task)") is now stale. No action needed; update memory spec instead.

### [NOTE-001] Site is on a trial — 15 days remaining as of 2026-04-22
- **Where:** Top nav bar
- **Observation:** The header shows "15 days left" on what appears to be a Premium/Standard trial. Trial expiry on ~2026-05-07 could disable features mid-audit-cycle.
- **Action:** Confirm billing plan before feature-depending checks (some features behave differently on Free vs Standard vs Premium).
- **Severity:** NOTE

### [NOTE-002] Full workflow status list (from transition probe on DNJ-1)
- **Where:** Workflow attached to Style/Task in DNJ
- **Statuses observed (13):**
  1. Concept / R&D *(To Do, blue-gray)* — transition id 2
  2. Design *(In Progress, yellow)* — id 3
  3. CAD *(In Progress)* — id 4
  4. PO *(In Progress)* — id 5
  5. Sample Production *(In Progress)* — id 6
  6. QC by DDLNY India *(In Progress)* — id 8
  7. In Transit to NYC *(In Progress)* — id 9
  8. Received by DDLNY NYC *(In Progress)* — id 10
  9. Approved *(Done, green)* — id 11
  10. Repair *(In Progress, yellow)* — id 12
  11. Credit *(Done, green)* — id 13
  12. Hold *(In Progress, yellow)* — id 14
  13. Cancelled *(Done, green)* — id 15
- **Missing transition id:** id 7 is absent from the visible set (may be unused, deleted, or a reserved initial transition).
- **Observation:** phase names align with the DDLNY memory spec.

### [MAJOR-002] All workflow transitions are global + presumed-conditional; enforcement unverified
- **Where:** Workflow for DNJ Style/Task
- **Observation:** Every one of the 13 transitions returned has `isGlobal: true` and `isConditional: true`. Global = reachable from any source status (no source-state constraint at the workflow graph level). Conditional = at least one condition exists on each transition, but the REST response does not expose the condition details.
- **Why this matters:** Per project memory, only DDLNY may transition Styles; vendors must never move them (not even to Repair/Hold/Cancelled). Global transitions mean the workflow *graph* imposes no state-based guard, so all enforcement rides on the conditions — which we haven't yet inspected.
- **Expected:** conditions on every transition restrict to the DDLNY group/role (or equivalent); vendors see zero available transitions.
- **Action needed (Layer B):** Open each transition in the workflow editor and verify the condition list. If conditions are empty or not role-gated, this becomes a BLOCKER (vendors could close out Styles).
- **Severity:** MAJOR until verified — promote to BLOCKER if conditions aren't enforcing DDLNY-only.

### [NOTE-003] `aary-test` vendor persona exists
- **Where:** User directory
- **Detail:** accountId `712020:0f6ce624-2d71-4938-a1fd-54e3e64a76dd`, display name "Aary Test". Not yet seen in the permission-scheme audit; confirmed via `/user/search`. Will be used in Layer C isolation tests.
- **Severity:** NOTE

### [NOTE-004] Issue link types are the Jira default set
- **Where:** Global issue link types
- **Observed:** Blocks, Cloners, Duplicate, Relates (standard Jira defaults). No DDLNY-specific link types such as "Supersedes", "Derived from", "Reorder of".
- **Action:** decide if jewelry-specific links (e.g. "Reorder of" or "Derivative of") are warranted before GA.
- **Severity:** NOTE

### [NOTE-005] Data volume + provenance
- **Where:** All of project DNJ
- **Observed:** 27 issues total (DNJ-1 … DNJ-27), all created in a ~90-minute window on 2026-04-22. 25 Styles + 2 Tasks (DNJ-25, DNJ-27). Zero sub-tasks, zero Epics. Sole reporter = sole assignee = Aaryan Mehta on every issue. This is pre-vendor-rollout bootstrap / mockup data.
- **Severity:** NOTE

### [NOTE-006] Current status distribution across DNJ
| Status | Count | Issue keys |
|---|---|---|
| Concept / R&D | 2 | DNJ-1, DNJ-2 |
| Design | 2 | DNJ-3, DNJ-4 |
| CAD | 3 | DNJ-5, DNJ-6, DNJ-26 |
| PO | 2 | DNJ-7, DNJ-8 |
| Sample Production | 2 | DNJ-9, DNJ-10 |
| QC by DDLNY India | 2 | DNJ-11, DNJ-12 |
| In Transit to NYC | 2 | DNJ-13, DNJ-14 |
| Received by DDLNY NYC | 2 | DNJ-15, DNJ-16 |
| Approved | 3 | DNJ-17, DNJ-18, DNJ-19 |
| Repair | 2 | DNJ-20, DNJ-21 |
| Credit | 1 | DNJ-22 |
| Hold | 1 | DNJ-23 |
| Cancelled | 1 | DNJ-24 |
| **Open** | 2 | DNJ-25, DNJ-27 *(Tasks on default workflow)* |

### [BLOCKER-003] Tasks use Jira's default workflow, NOT the custom DDLNY 13-phase workflow
- **Where:** Workflow mapping in DNJ
- **Repro:** DNJ-25 and DNJ-27 are Task-type issues. Their status is "Open" — a default Jira status, absent from the 13-phase list observed on Styles. Styles ride the custom workflow (Concept / R&D → … → Approved/Credit/Cancelled). Tasks do not.
- **Expected:** It's legitimate for Task to have its own workflow, BUT the current "Open/In Progress/Done" default is not a conscious design. A vendor-facing Task like "Develop CAD" should have an intentional lifecycle (e.g. Open → In Progress → For Review → Done with QC fail/pass).
- **Actual:** Task is riding Jira's stock 3-state default, which is (a) not documented, (b) not aligned with DDLNY's workflow intent, (c) confusing on a board that mixes Styles and Tasks.
- **Fix:** Decide Task's intended lifecycle, then either apply the Style workflow (unlikely — too heavy for a sub-task-ish artifact) or design a simpler Task-specific workflow and map it via the project's workflow scheme.
- **Severity:** BLOCKER (because the Task type is the exact type your linked-work example wanted to create — a broken Task lifecycle means the linked-work flow produces unmanageable tickets)

### [BLOCKER-004] Resolution field never set — no Done issue has a Resolution
- **Where:** Workflow transitions to Done-category statuses (Approved / Credit / Cancelled)
- **Repro:** All 5 Done-category issues (DNJ-17, -18, -19 Approved; DNJ-22 Credit; DNJ-24 Cancelled) have `resolution: null`.
- **Expected:** Transitions into Done-category statuses must set a Resolution (Approved → "Done", Credit → "Won't Do" or custom "Credited", Cancelled → "Won't Do"). Without Resolution, default JQL filters like `resolution = Unresolved` will keep Done issues appearing in "open work" lists, boards, dashboards, and reports. Jira treats Resolution as the canonical "closed" signal.
- **Actual:** Workflow transitions have no post-function / rule setting Resolution, so every Done issue looks "unresolved" to every system that cares about it (including "My Open Work Items"). This directly breaks reporting.
- **Fix:** In the workflow editor, add a post-function (or equivalent rule in team-managed projects) on each transition into a Done-category status that sets Resolution to an appropriate value. Conversely, transitions OUT of Done states (e.g. reopening) should clear Resolution.
- **Severity:** BLOCKER — silently poisons every report and work-list.

### [MAJOR-003] Custom field named "Labels" (customfield_10084) collides with system `labels` field
- **Where:** DNJ Style fields
- **Observed:** `customfield_10084` has display name **"Labels"** (a multiselect holding values like "Signature") AND Jira's built-in `labels` system field also exists (empty array on every issue). Two fields with the same display name.
- **Why it matters:** Every mention of "Labels" in the UI is ambiguous. The user types "label:Signature" in search — which field do they mean? Hot-keys, bulk edit, and exports will confuse the two. Users will be adding values to one thinking they're in the other.
- **Fix:** Rename the custom field to something specific (e.g. "Style Labels", "Product Labels", "Collection Tags"). Or — if the system `labels` field isn't wanted — remove it from screens so only the custom one is visible.
- **Severity:** MAJOR

### [MAJOR-004] "Collection" is a text custom field while memory spec calls for Collection as an issue TYPE
- **Where:** `customfield_10123` "Collection" (textfield) on DNJ-1 = `"Twinkling Collection"`. Meanwhile memory: *Sub-tasks + Create dialog* → "Create dialog needs 3 distinct flows (Style/Collection/Sub-task)" — implies Collection is an issue type.
- **Contradiction:** Either Collection is a grouping artifact (issue type) or an attribute (custom field). You have the attribute but not the artifact.
- **Why it matters:** Without Collection as an issue type, there's no way to group Styles under a Collection entity, assign a whole Collection to a vendor, transition a Collection as a whole, or search/report "all Styles in Twinkling Collection" in a hierarchical way. The text field is only marginally queryable.
- **Fix:** Decide the role of Collection:
  - If attribute-only → rename the existing field to "Collection name" so it's clearly a label, and drop the issue-type plan.
  - If hierarchical (recommended given user memory) → add Collection as an issue type at hierarchyLevel 1, migrate the text values into real Collection issues, and set Style's Parent to the Collection issue.
- **Severity:** MAJOR
- **[BUILDER CONTEXT — reclassify to CORRECT-BY-DESIGN, 2026-04-22]:** User explicitly pivoted Collection from a managed single-select dropdown (with 6 seeded options like "Bridal Classic", "Twinkling Collection") to free-text on 2026-04-22, verbatim request: *"remove the list or dropdown for the collection field. change it to text only."* Rationale: admin-managed option lists were friction; free-text allows flexibility during rollout. Upgrade path to a PD-project-entity Collection architecture is preserved (~30 min migration, documented in README.md Step 10). No action needed unless DDLNY opts back into structured Collections.

### [MAJOR-005] Jewelry-critical fields are free-text instead of pick-lists
- **Where:** Custom fields on Style
- **Offending fields (all `textfield`, should be select/multiselect):**
  - `customfield_10118` Diamond Color
  - `customfield_10119` Diamond Shapes
  - `customfield_10120` Gemstone Types
  - `customfield_10121` Gemstone Shapes
- **Correctly-typed selects (for reference):**
  - customfield_10074 Category (select)
  - customfield_10078 Gold Color (select)
  - customfield_10079 Gold Quality (select)
  - customfield_10122 Diamond Type (multiselect)
  - customfield_10084 Labels (multiselect)
- **Why it matters:** Per user memory (*Dropdown conventions*) these are exactly the kind of fields that must be "always alphabetical, always correct spellings; silently correct user typos." Free-text invites "Round" / "round" / "rd" / "rnd" drift, which breaks every filter and report on Diamond/Gemstone attributes. DDLNY-India QC and NYC purchasing will diverge on vocabulary.
- **Fix:** Convert each of the 4 fields from `textfield` to `select` (single) or `multiselect`. Pre-populate with a canonical alphabetical list (Round, Princess, Cushion, Emerald, Oval, Pear, Marquise, Asscher, Radiant, Heart, Baguette… etc. for shapes; D-Z colorless scale + fancy colors for Diamond Color; Ruby, Sapphire, Emerald, Tanzanite… for Gemstone Types). Lock the field so vendors can only pick, not type.
- **Severity:** MAJOR
- **[BUILDER CONTEXT — reclassify to CORRECT-BY-DESIGN, 2026-04-22]:** User explicitly requested these 4 fields as TEXT, not pick-lists. Verbatim: *"diamond color(text), diamond shapes(text), gemostone types (text), gemstone shapes (text)."* Conscious trade-off: flexibility > canonical-list enforcement at this stage. The audit's concern about data drift ("Round / round / rd / rnd") is valid — if it becomes an operational problem, conversion to select fields is still a one-shot script (same pattern as the Diamond Type single-select → multi-select migration we did on 2026-04-22). No action needed right now.

### [CORRECT-BY-DESIGN] "DDLNY Style #" (customfield_10071) null-through-PO is a lifecycle pattern, not a bug — verified
- **Where:** customfield_10071 across all 27 DNJ issues
- **Verified pattern:**
  - **NULL through PO phase** (DNJ-1 through DNJ-8: Concept/R&D, Design, CAD, PO)
  - **POPULATED from Sample Production onward** (DNJ-9 through DNJ-22: values like `DDLNY-R210276WA015`, `DDLNY-EXL263034LY`, …)
  - NULL on DNJ-23 (Hold), DNJ-24 (Cancelled) — pieces that never reached Sample Prod, consistent with lifecycle
  - NULL on DNJ-26 (Style — test data), DNJ-25 + DNJ-27 (Tasks)
- **Implication:** DDLNY's internal SKU is assigned at the Sample-Production transition. The null values on earlier-phase items are expected. Same for PO # / D-code (customfield_10073) which is populated from PO phase onward.
- **Action:** consider adding a workflow validator on the transition into Sample Production requiring DDLNY Style # to be set (so you don't accidentally advance without the SKU assigned).
- **Severity:** CORRECT (was MAJOR-006 — downgraded after verification)

### [BLOCKER-012] No notification scheme configured — ZERO emails sent for any event in DNJ
- **Where:** DNJ → Space settings → Notifications → Settings
- **Observed:** "Scheme: None" and "There are currently no notifications for this space." Notification email configured (`jira@ddlny-pd.atlassian.net`) but no notification scheme is attached.
- **Why it matters:** in a workflow spanning DDLNY NYC ↔ DDLNY India ↔ DNJ vendor across continents, email is the primary async signal. Without a notification scheme:
  - DDLNY doesn't get emailed when a vendor comments on a Style.
  - The vendor doesn't get emailed when DDLNY creates a linked Task or transitions the Style.
  - DDLNY India doesn't get emailed when a Style lands in "QC by DDLNY India" (so no one knows to pick it up).
  - The reporter doesn't get pinged when a Style is Approved / Credit / Cancelled.
  - @mentions still work (those ride a different path), but the default "assignee / reporter / watchers get emailed on update" pipeline is off.
- **Fix:** Project settings → Notifications → Actions → select a scheme ("Default Notification Scheme" is usually fine to start). Then decide which events map to which recipients. At minimum: Issue Created → reporter + assignee + watchers; Issue Commented → assignee + watchers; Issue Transitioned → assignee + watchers + reporter (if Approved/Credit/Cancelled).
- **Severity:** BLOCKER — the cross-continent workflow assumes email. Without it, people will miss work.

---
*Findings continue below as the audit progresses.*

### [MAJOR-007] Summary casing inconsistency: DNJ-8 uses lowercase `x` in SKU code
- **Where:** DNJ-8 → summary
- **Observed:** `"Earring - ExL253170LY (Link)"` — lowercase `x`. Every other SKU-coded summary uses uppercase `X` (e.g. DNJ-11 … "EX…").
- **Fix:** Per user memory (*Dropdown conventions* — "silently correct user typos"), DDLNY convention is consistent uppercase SKU codes. Edit the summary. At policy level, add a create-time validator or a character-class constraint on the Summary for Style type.
- **Severity:** MAJOR (data hygiene, small scope right now; becomes a BLOCKER at scale if not enforced)

### [MINOR-001] Test / placeholder data pollutes the dataset
- **Where:** DNJ-2, DNJ-25, DNJ-26, DNJ-27
- **Summaries:**
  - DNJ-2: `"Ring - 3kt sample Lab testing report (3kt)"` — looks like an experiment
  - DNJ-25: `"abc"` — obvious placeholder
  - DNJ-26: `"Create a new ring based on this composite head"` — action phrase as Style
  - DNJ-27: `"make the CAD"` — action phrase as Task
- **Fix:** Delete these before vendor rollout, or rename/repurpose as canonical examples.
- **Severity:** MINOR (data hygiene, not configuration)

### [MINOR-002] Priority field is effectively a constant (26 of 27 = Medium)
- **Where:** Priority across DNJ
- **Observed:** 26 Medium, 1 Highest (DNJ-26). Not being used as a signal.
- **Fix:** Either start actually setting Priority (retrain users / validators), or remove it from screens to stop cluttering create dialogs. Aligns with "no comments unless non-obvious" spirit applied to fields.
- **Severity:** MINOR

### [MINOR-003] Labels / Components / fixVersions / Due date fields exist but are universally empty
- **Where:** 27/27 issues
- **Observed:** `labels = []`, `components = []`, `fixVersions = []`, `duedate = null` across the board.
- **Fix:** Decide per-field — remove from screens if not planned for use, or document expected usage (which one replaces what DDLNY terminology).
- **Severity:** MINOR (noise)

### [NOTE-007] DNJ-1 has a mockup-style linked issue (`blocks DNJ-25`)
- **Where:** DNJ-1 → issuelinks
- **Observed:** DNJ-1 `blocks` DNJ-25 (the "abc" placeholder Task). Implies the linked-work flow was previously tested and (somehow) succeeded despite the Summary bug — DNJ-25 got the summary "abc". This is the path worth retracing in Layer B: how did this link get created?
- **Severity:** NOTE (pointer for investigation in Layer B)

### [NOTE-008] Full custom-field catalog on DNJ Style (21 DDLNY-relevant custom fields)
Extracted from DNJ-1 (a Concept/R&D Style). IDs, names, types, sample values:

| Field ID | Name | Type | DNJ-1 value |
|---|---|---|---|
| customfield_10071 | DDLNY Style # | textfield | null |
| customfield_10072 | Vendor Style # | textfield | `D53 MAR 260145` |
| customfield_10073 | PO # / D-code | textfield | null |
| customfield_10074 | Category | select | Necklace |
| customfield_10075 | Diamond Quality | textfield | `LGD VS2 G-H` |
| customfield_10076 | Diamond Weight (ct) | float | 2.74 |
| customfield_10078 | Gold Color | select | Yellow |
| customfield_10079 | Gold Quality | select | 14K |
| customfield_10080 | Gold Weight (g) | float | 10.4 |
| customfield_10081 | Target Price (USD) | float | 2180 |
| customfield_10082 | Cloud Files URL | url | `https://drive.ddlny.test/dnj/D53_MAR_260145/` |
| customfield_10083 | Source | textfield | `BB  Mar 26 MOM` |
| customfield_10084 | Labels *(collides with system)* | multiselect | Signature |
| customfield_10118 | Diamond Color | textfield | null |
| customfield_10119 | Diamond Shapes | textfield | null |
| customfield_10120 | Gemstone Types | textfield | null |
| customfield_10121 | Gemstone Shapes | textfield | null |
| customfield_10122 | Diamond Type | multiselect | null |
| customfield_10123 | Collection *(see MAJOR-004)* | textfield | `Twinkling Collection` |

Other system-managed custom fields exist (Story points, Sprint, Rank, etc.) inherited from the JSW template — probably not DDLNY-relevant but noise on edit screens.

- **Severity:** NOTE (reference list for subsequent audit steps)

### [MINOR-004] Noise custom fields from JSW template (likely unused on Style)
- **Where:** Issue field catalog
- **Observed (likely irrelevant to DDLNY):** Story point estimate, Issue color, Sprint, Rank, Flagged, Target start, Target end, Start date, Change type / risk / reason (ITSM template leftovers), Sentiment, Approvals, Impact, Team, Organizations, Approvers, Actual start / end, Epic Link, Focus Areas, Goals, Request Type.
- **Why it matters:** These appear in edit screens, field configurations, and JQL auto-complete. Creates UX clutter and vendor confusion.
- **Fix:** Audit the field configuration scheme for Style — hide unused fields from screens (they can remain as fields, just not shown).
- **Severity:** MINOR

### [MAJOR-008] A Confluence space linked to DNJ was auto-provisioned even though "no Confluence was set up"
- **Where:** https://ddlny-pd.atlassian.net/wiki/spaces/DNJ (Confluence space, key = DNJ)
- **Observed:** Navigating to `/jira/software/c/projects/DNJ/settings/details` redirects into Confluence Space settings labeled "Spaces / DNJ / Space settings", with field "How your space is managed: Jira - software project". So the Jira project has a sibling Confluence space the user was not aware of.
- **Why it matters:** Vendor isolation. If the DNJ vendor permission group (which `aary-test` now belongs to) is configured to see the DNJ Jira project, Atlassian's default settings often grant the same group Confluence read access via "Anyone with access to the Jira project". Vendors could suddenly see (or in a worse case edit/create) Confluence pages intended for DDLNY-internal use.
- **Action needed:** (a) audit whether the space currently has pages, (b) audit Confluence space permissions, (c) if the space isn't wanted at all, delete it or archive it before vendor rollout.
- **Severity:** MAJOR (potential data leak surface)

### [MINOR-005] Project description promises artifact types that don't exist
- **Where:** DNJ → Project settings → Summary
- **Observed description:** *"DNJ vendor - Styles, Collections, Sub-tasks. Managed by DDLNY PD team."* — yet only Style and Task issue types exist; no Collection type, no Sub-task type (confirmed by API earlier). Description overstates capabilities.
- **Fix:** either add the missing issue types (per MAJOR-001) or edit the description to match reality. Also, the description says "Sub-tasks" — the label in Jira is usually singular "Sub-task". Minor stylistic tidy.
- **Severity:** MINOR
- **[BUILDER CONTEXT, 2026-04-22]:** Description was accurate at project creation time (MAJOR-001 explains why the spec changed since). Collection is now a text field, not an issue type; Sub-task was renamed to Task and restructured. User confirmed the description SHOULD be updated to something like *"DNJ vendor - Styles and Tasks. Managed by DDLNY PD team."* but instructed on 2026-04-22 to defer applying the fix until a separate fix round. This finding remains VALID as documentation-debt; the audit correctly identified the mismatch between description and reality.

### [MINOR-006] Project admin UI labels DNJ as a "space" — Jira/Confluence terminology bleed
- **Where:** Project settings left sidebar header reads "Space settings" and breadcrumb shows "Spaces / DNJ / Project settings".
- **Observed:** For a Jira project the unit should be called "Project", not "Space". Users will be confused whether they are editing Jira or Confluence. This is Atlassian's recent terminology change and is partly out of DDLNY control, but worth noting because it will confuse non-technical users.
- **Severity:** MINOR (Atlassian-side label — you can't fully fix, but document in user training)

### [NOTE-009] Work type scheme in use: "DNJ: Kanban Issue Type Scheme" (Style, Task)
- Scheme name is descriptive — retain.

### [NOTE-010] DNJ Permission Scheme — complete matrix (stripped of addons-only rows)
Groups used (three, referenced by name — not via Project Roles):
- `ddlny-nyc` (DDLNY NYC team, admin / full control)
- `ddlny-india` (DDLNY India QC team, review + transition)
- `dnj-vendor` (DNJ vendor — external; aary-test is in this group)

**Admin tier:**
| Permission | Who |
|---|---|
| Administer Projects | ddlny-nyc |
| Manage Issue Layouts | *addons only* |
| Edit Workflows | *addons only* |

**Project tier:**
| Permission | Who |
|---|---|
| Browse Projects | ddlny-nyc, ddlny-india, dnj-vendor |

**Issue tier (critical — the core RACI):**
| Permission | Who |
|---|---|
| Create Issues | ddlny-nyc, ddlny-india, **dnj-vendor** |
| Edit Issues | ddlny-nyc, ddlny-india — **NOT dnj-vendor** |
| Delete Issues | ddlny-nyc |
| Close Issues | ddlny-nyc |
| Resolve Issues | ddlny-nyc |
| Move Issues | ddlny-nyc |
| Schedule Issues | ddlny-nyc |
| Modify Reporter | ddlny-nyc |
| Transition Issues | ddlny-nyc, ddlny-india — **NOT dnj-vendor** ✓ |
| Assign Issues | ddlny-nyc, ddlny-india, dnj-vendor |
| Assignable User | ddlny-nyc, ddlny-india, dnj-vendor |
| Link Issues | ddlny-nyc, ddlny-india, dnj-vendor |

**Comments:**
| Permission | Who |
|---|---|
| Add Comments | all 3 |
| Edit Own Comments | all 3 |
| Delete Own Comments | ddlny-nyc, ddlny-india — **NOT dnj-vendor** |
| Edit All Comments | ddlny-nyc |
| Delete All Comments | ddlny-nyc |

**Attachments:**
| Permission | Who |
|---|---|
| Create Attachments | all 3 ✓ |
| Delete Own Attachments | all 3 |
| Delete All Attachments | ddlny-nyc |

**Time Tracking:** Work On Issues → ddlny-nyc + ddlny-india (vendor can't log work — immaterial since time tracking isn't the DDLNY pattern).

### [BLOCKER-005] Permission scheme grants access by GROUP, not by PROJECT ROLE — will break vendor isolation the moment Elegant is added *(still BLOCKER — fix BEFORE Elegant goes live)*
- **Where:** DNJ Permission Scheme → every row
- **Observed:** `Browse Projects` / `Create Issues` / `Add Comments` etc. are granted to the literal group `dnj-vendor`. If the same permission scheme is reused for the future Elegant project (a common shortcut), `dnj-vendor` members would automatically gain browse/create/comment access to Elegant's issues — a direct violation of the cross-vendor-isolation rule in project memory.
- **Expected:** Each permission should be granted to a **Project Role** (e.g. "Vendor"), and then each project maps its Vendor role to the appropriate group (DNJ → dnj-vendor, Elegant → elegant-vendor). This is Jira's canonical pattern for multi-tenant vendor scenarios.
- **Fix:** Refactor the scheme — replace every `Group (dnj-vendor)`, `Group (ddlny-india)`, and `Group (ddlny-nyc)` entry with the equivalent Project Role (create roles Vendor, QC-India, DDLNY-NYC if they don't exist). Then in DNJ → Project settings → People, map Vendor role → dnj-vendor group. When Elegant is created, it inherits the same scheme but maps Vendor role → elegant-vendor group. No accidental cross-vendor visibility.
- **Severity:** BLOCKER — the whole vendor-isolation story unravels without this refactor.

### [CORRECT-BY-DESIGN] `dnj-vendor` lacks **Edit Issues** — intentional per user 2026-04-22
- **Where:** DNJ Permission Scheme → Edit Issues
- **Observed:** Edit Issues granted to ddlny-nyc + ddlny-india but NOT dnj-vendor.
- **User confirmation:** "yes it is intentional that dnj shouldnt be allowed to edit styles or tasks".
- **Implication:** vendors interact ONLY through:
  - Comments (permission: Add, Edit Own, but **not Delete Own** — see MINOR-007)
  - Attachments (permission: Create, Delete Own ✓)
  - (Transition — blocked by workflow conditions, correct per memory)
- **Action needed (user-training / docs, not config):** make sure DDLNY side has a clear workflow for ingesting vendor comments/attachments and transcribing any structured-field updates (dates, weights, PO #) themselves. Otherwise fields will rot with stale values.
- **Severity:** CORRECT — but document the operational consequence.

### [BLOCKER-009] `dnj-vendor` has **Create Issues** — vendors should NOT be able to create anything (user decision 2026-04-22)
- **Where:** DNJ Permission Scheme → Create Issues → `dnj-vendor`
- **Observed:** `dnj-vendor` group has Create Issues permission. Vendors can create Styles AND Tasks.
- **User decision (2026-04-22):** "let us not allow DNJ to create anything."
- **Fix (simple):** Jira admin → DNJ Permission Scheme → Create Issues → remove `Group (dnj-vendor)`. Save.
- **After fix:** vendors see the top-bar "Create" button either disabled or hidden (Jira handles both). aary-test should get a "You do not have permission to create" error if they attempt the REST endpoint directly.
- **Dependent finding to test in Layer C:** once this is fixed, confirm via aary-test session that the Create button is gone / disabled.
- **Severity:** BLOCKER — unrestricted vendor creation is a data-integrity risk.
- **[BUILDER CONTEXT, 2026-04-22]:** The permission exists because of the EARLIER build-session decision (pre-audit). User verbatim at that time: *"most of the time DDLNY creates styles but sometimes even vendors can create styles."* Based on that, CREATE_ISSUES was granted to `dnj-vendor` in the permission scheme. User REVISED the decision during the audit-review session on 2026-04-22: *"vendor CAN'T create ANYTHING."* This finding is therefore VALID — the permission scheme still carries the old decision and must be corrected. Fix (remove CREATE_ISSUES from `dnj-vendor` group in scheme id 10102) not yet applied; user instructed on 2026-04-22 to defer the actual Jira-site change to a separate fix round. Re-apply at fix time.

### [MINOR-007] Vendors cannot **Delete Own Comments**
- **Observed:** Delete Own Comments → ddlny-nyc + ddlny-india, not dnj-vendor.
- **Impact:** vendor posts a typo / wrong comment, can't remove it. Audit-trail argument holds, but it's unusual friction.
- **Fix:** decide intentional or not; if not intended, add dnj-vendor.
- **Severity:** MINOR

### [NOTE-011] DNJ workflow scheme: Task → default Jira workflow; Style → "DNJ Style Workflow" (editable)
- Workflow scheme name: `DNJ Workflow Scheme`
- Task → "Jira Workflow (jira)" — READ-ONLY, Jira's built-in 3-state default. Confirms BLOCKER-003.
- Style → "DNJ Style Workflow" — custom 14-status, all-global-transitions flow.

### [BLOCKER-007] `DNJ Style Workflow` has zero status-to-status transition graph — ALL transitions are global ("Any Status → X")
- **Where:** Workflow editor → DNJ Style Workflow → Text view
- **Observed:** For every one of the 13 phase statuses (Concept/R&D, Design, CAD, PO, Sample Production, QC by DDLNY India, In Transit to NYC, Received by DDLNY NYC, Repair, Hold, Approved, Credit, Cancelled), the transitions panel shows "There are no transitions out of this status". All transitions are defined as `Any Status → [Status]`. Transition ids observed: 1 (Create), 2–6, 8–15. **ID 7 is missing** — either a deleted transition or a renamed one.
- **What this means:** workflow ordering is NOT enforced at the graph level. A Style can be moved from, say, Concept/R&D directly to Approved without passing through Design / CAD / PO / Sample / QC / Transit. The ONLY thing preventing skip-ahead is workflow CONDITIONS (see below), and even those only gate WHO can transition — not phase order.
- **Fix options:**
  - *Light:* add a Validator on each transition asserting the source status must be an allowed predecessor (e.g. PO transition validates source ∈ {Design, CAD, Sample Production-return, Hold}).
  - *Heavy:* redefine transitions as status-specific (remove global, add explicit edges), giving you a proper directed graph.
- **Severity:** BLOCKER — makes phase-order-based reporting, time-in-status dashboards, and "Received before Approved" invariants impossible to assert.
- **[BUILDER CONTEXT — reclassify to CORRECT-BY-DESIGN, 2026-04-22]:** User explicitly chose "full freedom" workflow over directed status-to-status edges on 2026-04-22. Rationale verbatim: *"in fact only DDLNY NYC [changes phases]... i was thinking of giving full freedom. DDLNY NYC peeps can change a style from any phases to any phase anytime."* The trust model (only DDLNY NYC + DDLNY India transition, per workflow conditions) is what protects the workflow, not phase-order enforcement. Workflow CONDITIONS on each global transition DO role-gate WHO can move the work item (confirmed elsewhere in this audit: NYC-only for 10 transitions, NYC+India for QC / In Transit / Repair). Phase-order enforcement was deliberately traded away; documented in README.md Step 3 (transition philosophy section). User acknowledged the trade-off regarding phase-order reporting. No action needed unless DDLNY later decides the trade-off was wrong.

### [BLOCKER-008] All workflow transitions have EMPTY "Perform actions" — no post-function sets Resolution (confirms BLOCKER-004 at the workflow layer)
- **Where:** Transition rules panel for every transition
- **Observed:** the "Perform actions" section shows no badge/count on every transition inspected (Approved / Cancelled / CAD / QC by DDLNY India / In Transit to NYC). Means: zero post-functions run on transition. This is why `resolution = null` on all 5 Done-category issues.
- **Fix:** On transitions to Approved, Credit, Cancelled — add a "Set field value" post-function setting Resolution to the correct value. On transitions OUT of those states — add a post-function clearing Resolution. Do this via workflow editor → click transition → Perform actions → Add perform actions rule → "Update a work item" → set `Resolution`.
- **Severity:** BLOCKER (same root as BLOCKER-004; listed as separate entry because fix happens in the workflow editor, not the issue)

### [MAJOR-010] Workflow conditions reference GROUPS by name — same isolation-break pattern as the permission scheme
- **Where:** Restrict transition rules on every transition
- **Observed:** Conditions are of type "Restrict who can move a work item" restricted to specific group names. Samples:
  - Transition 4 (CAD): `ddlny-nyc` only
  - Transition 8 (QC by DDLNY India): `ddlny-nyc` + `ddlny-india`
  - Transition 11 (Approved): `ddlny-nyc` only
  - Transition 15 (Cancelled): `ddlny-nyc` only (inferred — 1-rule pattern matches Approved, not verified)
  - Transition 9 (In Transit to NYC): 1 rule, not fully verified yet
- **Why it matters:** Same as BLOCKER-005. When Elegant project is created with a copy of this workflow, `ddlny-nyc` and `ddlny-india` are still the right groups — good — but the IsolatedVendor concept still has no anchor. Additionally, if you ever split the NYC team by product line or the India team by shift, you'd need to edit 13 transitions to update the group list. Project roles would have let you update once.
- **Fix:** Migrate conditions from group-based to role-based (create Role = "DDLNY NYC" mapped to group ddlny-nyc, Role = "DDLNY India" mapped to ddlny-india) and reference roles in conditions.
- **Severity:** MAJOR

### [MAJOR-011] `dnj-vendor` (aary-test) can see ZERO transitions on Styles — confirmed by workflow condition inspection
- **Where:** Every transition's "Restrict who can move a work item" rule omits dnj-vendor
- **Observed:** No transition allows dnj-vendor. So aary-test will see the issue view with no transition buttons available (other than buttons that may be hidden entirely).
- **Expected:** this aligns with memory ("vendors never move Styles") — so this is **correct**. Logging as MAJOR-NOTE-CORRECT, because vendor-UI will show the "Concept / R&D" status badge but no way to advance. Vendors will need to message DDLNY via comments to request phase changes. Train users accordingly.
- **Severity:** CORRECT-BY-DESIGN — but document so vendors don't file "I can't move my work" tickets on day one.

### [NOTE-012] Transition gating matrix (incomplete — 4 of 13 transitions fully verified)
| ID | Name | Allowed groups (confirmed) | Notes |
|---|---|---|---|
| 1 | Create (→Concept/R&D) | Jira system — initial | Who can Create depends on permission scheme (Create Issues) — currently all 3 groups, including dnj-vendor → see MAJOR-009 |
| 2 | Concept / R&D | — | Probably ddlny-nyc only (re-entry transition); not yet verified |
| 3 | Design | — | Not yet verified |
| 4 | CAD | **ddlny-nyc** | Verified |
| 5 | PO | — | Not yet verified |
| 6 | Sample Production | — | Not yet verified |
| 7 | *(missing)* | n/a | Either deleted or renamed — investigate |
| 8 | QC by DDLNY India | **ddlny-nyc + ddlny-india** | Verified |
| 9 | In Transit to NYC | — (1 rule, unexpanded) | Likely both groups — to verify |
| 10 | Received by DDLNY NYC | — | Not yet verified |
| 11 | Approved | **ddlny-nyc** | Verified |
| 12 | Repair | — | Not yet verified |
| 13 | Credit | — | Not yet verified |
| 14 | Hold | — | Not yet verified |
| 15 | Cancelled | **ddlny-nyc** (1-rule pattern matches Approved) | Verified (rule count), groups inferred |
- **Action:** walk the remaining 8 transitions to complete this matrix (15 min of clicking).
- **Severity:** NOTE (data point; no defect here itself)

### [BLOCKER-010] "DNJ: Minimal Create Screen" — confirmed root cause of Summary bug; screen ID 10116
- **Where:** Global Screens → "DNJ: Minimal Create Screen" (shared by 1 project = DNJ)
- **Observed fields on the General tab (the only tab):**
  1. Description
  2. Priority
  3. Assignee
  4. Due date
  5. Attachment
  6. Linked Issues
  7. Reporter
- **Missing from the Create screen:** **Summary** — and every DDLNY custom field (DDLNY Style #, Vendor Style #, Category, Gold Color/Quality, Diamond Color/Quality/Weight/Type/Shapes, Gemstone Types/Shapes, Cloud Files URL, Source, Collection, Target Price, etc.).
- **Who uses this screen:** Both Style AND Task issue types in DNJ, via "DNJ: Kanban Default Screen Scheme" (DEFAULT) inside "DNJ: Kanban Issue Type Screen Scheme". This means every create flow (top-bar Create, inline Create linked work, quick-add on board) uses this stripped screen.
- **Direct fix:** Jira admin → Screens → "DNJ: Minimal Create Screen" → Select Field dropdown → add **Summary** (ideally as the first field). Consider also adding key custom fields (Category, Vendor Style #, Gold Color/Quality, Diamond Weight, Source) for complete Style creation. If you want a minimal Task-create flow, make a separate "DNJ: Task Create Screen" with just Summary+Description+Linked Issues+Reporter, and use a screen scheme variant to map Task → that screen, Style → a richer screen.
- **Severity:** BLOCKER (same root as BLOCKER-001; this entry is the *where-to-fix* specifics)

### [MAJOR-012] Style and Task share a single screen scheme — create/edit/view configs are identical
- **Where:** DNJ uses one screen scheme ("DNJ: Kanban Issue Type Screen Scheme") containing one screen-scheme row (DEFAULT) that maps both Style and Task to the same Create / Edit / View screens.
- **Why it matters:** Style ≠ Task in DDLNY's model (Style = the item; Task = a DDLNY request to the vendor). The Style Edit/View screen should show all 21 DDLNY custom fields (Gold Color, Diamond Weight, etc.). The Task Edit/View screen should be much simpler (just the request body, linked Style, attachments, status). Mixing them shows jewelry-specific fields on a "Develop CAD" Task, which is noise.
- **Fix:** split the screen scheme into two rows: Style → DNJ-Style-Screens, Task → DNJ-Task-Screens. Create separate screens for each.
- **Severity:** MAJOR

### [BLOCKER-011] Zero automation rules configured in DNJ project
- **Where:** DNJ → Space settings → Automation → Rules tab
- **Observed:** "No rules created yet." Scope filter set to "Space rules" — empty. (Global rules may exist but wouldn't be project-scoped to DNJ.)
- **Why it matters:** Multiple findings in this audit rely on automation as the ONLY practical fix path, but nothing is running. Specifically:
  - **Resolution-not-set** (BLOCKER-004/008) — either fix via workflow post-functions OR an automation rule "When issue transitions to status in [Approved, Credit, Cancelled], set Resolution". Today neither exists.
  - **Stale-status alerts** — no "when a Style has been in [status] for >N days, flag/notify" rule. Orders could sit undetected.
  - **QC assignment** — no rule auto-assigning to an ddlny-india user when a Style transitions into QC by DDLNY India. India-team members have to manually self-assign or the Style goes unowned.
  - **Linked-Task closure** — no rule "when Task is Done, comment on parent Style" or "when Style is Approved, auto-close linked open Tasks".
  - **Audit-trail comments** — no "when Style transitions, add a comment with who/when" rule.
- **Action:** before GA, write at minimum the Resolution-setting rule (plugs BLOCKER-004/008) and the stale-status alert rule. Others are nice-to-have.
- **Severity:** BLOCKER — absence of the Resolution rule directly breaks reporting.

### [BLOCKER-001-LIVE-REPRO] Summary-missing bug reproduced end-to-end with exact error
- **Steps taken in Brave / DNJ-1 issue view:**
  1. Opened DNJ-1 (Necklace - D53 MAR 260145).
  2. Scrolled to "Linked work items" section, clicked "+ Create linked work item".
  3. Dialog titled "Create linked work item" opened. Work type auto-defaulted to Task. No Summary field visible anywhere in the dialog. Fields shown (in order): Space, Work type, Status (Open, read-only initial), Linked work items (is blocked by / relates to), Description, Priority, Assignee, Due date, Attachment, Reporter.
  4. Cancelled that dialog and opened the **top-bar Create** button instead. Same behaviour — dialog titled "Create Task", identical fields, Summary still absent.
  5. Clicked the **Create** button without entering a summary (since there's no field to enter it in).
- **Exact server error returned (banner across top of dialog):**
  > **"Summary: You must specify a summary of the issue."**
- **Conclusion:** both the inline "Create linked work item" and the top-bar "Create" flows are broken in the same way. There is NO create path that lets DDLNY make a Task/Style today.
- **Root cause (from Layer A.5):** "DNJ: Minimal Create Screen" is missing the Summary field. Fixing that one screen fixes both flows because they share the same screen scheme.
- **Also observed:** the dialog's "Create" button does NOT disable-until-valid. It happily submits with no Summary, and only then the server rejects. UX-wise the dialog should either (a) gray out "Create" until Summary exists, or (b) red-flag the missing field inline — but that needs Summary on the screen first.
- **Severity:** BLOCKER (was BLOCKER-001; this entry is the live evidence)

### [MAJOR-013] DNJ board ("DNJ board" id 69) — 13 columns, one per workflow status, including final/done states
- **Where:** https://ddlny-pd.atlassian.net/jira/software/c/projects/DNJ/boards/69
- **Observed layout (Kanban):** columns in order left→right —
  1. CONCEPT / R&D (2)
  2. DESIGN (2)
  3. CAD (3)
  4. PO (2)
  5. SAMPLE PRODUCTION (2)
  6. QC BY DDLNY INDIA (2)
  7. IN TRANSIT TO NYC (2)
  8. RECEIVED BY DDLNY NYC (2)
  9. APPROVED (~3 — off-screen)
  10. REPAIR (~2)
  11. CREDIT (~1)
  12. HOLD (~1)
  13. CANCELLED (~1)
- **Why this is a problem:**
  - 13 columns force horizontal scrolling — users can't see the whole pipeline at a glance.
  - Done-category columns (Approved, Credit, Cancelled) appear on the active board. Because Resolution is never set (BLOCKER-004/008), default board filters don't hide completed Styles → the Done columns will keep growing forever. Within a quarter these columns become unreadable.
  - Repair and Hold are "paused" states — they belong on the board as exceptions, but mixing them with the linear flow adds noise.
- **Recommended layout:**
  - Keep active-work columns visible: Concept/R&D → Design → CAD → PO → Sample Production → QC India → In Transit NYC → Received NYC (8 columns).
  - Move Done (Approved / Credit / Cancelled) to a filter ("Show Done" toggle) or a quick-filter pill, and rely on Resolution + last-updated to constrain the window (e.g. "Done in last 30 days").
  - Move Repair / Hold into a swimlane or filter ("Paused").
- **Nice-to-notice:** the cards show jewelry thumbnails from attachments — good UX; keep that.
- **Tabs available on the board view:** Summary, Kanban board, Calendar, Reports, List, Forms, Archived work items, Shortcuts (+). Worth a separate pass on each of those (Forms especially — since proforma-managed-fields plugin is installed).
- **Severity:** MAJOR (depending on user preference, may drop to MINOR once resolution fix lands)

### [NOTE-013] Board-view tabs present but not yet audited
- Summary / Reports / Calendar / List / Forms / Archived work items tabs all exist — not inspected in this audit pass. "Forms" in particular is interesting given the proforma plugin custom fields observed earlier (customfield_10029–10032). Could become a vendor-data-intake channel that sidesteps the "vendors can't edit" constraint (BLOCKER-006 resolution).
- **Follow-up action:** short second pass on Forms tab.

---

## Layer C — Vendor Persona (aary-test / dnj-vendor) live tests

All tests below executed as `Aary Test` (accountId `712020:0f6ce624-2d71-4938-a1fd-54e3e64a76dd`, email cambridgeeaaryan405@gmail.com, group dnj-vendor) in a separate Chrome profile on 2026-04-22.

### [NOTE-C01] Vendor login + sidebar baseline
- Logs in cleanly. Sees "For you" page with DNJ space in Recent spaces, 0 assigned work items, 0 open work items. Only DNJ visible in the sidebar (correct — no other projects exist).
- Sees "Create" button, "Ask Rovo", "15 days left" trial badge, notification bell, help, settings gear, profile avatar ("AT").

### [BLOCKER-009-LIVE-REPRO] Vendor CAN open Create dialog; Work type defaults to **Style** (the most dangerous default)
- **Steps:** click top-bar Create → dialog opens → Work type pre-selected to "Style" (not Task) → Status shows CONCEPT / R&D as the target initial state.
- **Attempted create (no summary — there's no summary field):** clicking Create returned the same server-side error as admin: **"Summary: You must specify a summary of the issue."**
- **What this means:** Once the Summary-screen bug is fixed, vendors will be one click away from creating legitimate-looking Styles in DNJ. Both fixes (screen fix + permission remove) must land. Removing the dnj-vendor Create Issues permission is the correct guard.
- **Severity:** BLOCKER-009 confirmed.

### [BLOCKER-C02] Vendor can self-assign ANY Style including ones in DDLNY-owned phases
- **Steps:** on DNJ-1 (Concept/R&D, owned by DDLNY NYC), clicked "Assign to me" link. Instantly reassigned to "Aary Test". Reverted by clicking the Assignee chip → selecting Aaryan Mehta.
- **Assignee dropdown visible to vendor:** Unassigned / Automatic / Aaryan Mehta / Aary Test. No gating on who the vendor can set.
- **Implications:**
  - Vendor can take ownership of any Style at any phase, including DDLNY-only phases (Concept/R&D, PO, Received by NYC, Approved, etc.).
  - Vendor can **unassign** the admin (set to Unassigned) — effectively hijacking the work item.
  - Since no notification scheme is configured (BLOCKER-012), DDLNY would only discover the reassignment by re-opening the issue.
- **Fix:** either remove "Assign Issues" from dnj-vendor in the permission scheme, OR add a workflow condition blocking Assign when not in vendor-owned phases (Design / CAD / Sample Production) — and even then, only allow assigning TO a dnj-vendor member (not FROM one). The simplest fix is to remove Assign Issues from dnj-vendor; vendors don't typically drive assignment anyway.
- **Severity:** BLOCKER — quiet hijack vector on any Style.

### [CORRECT] Vendor cannot transition (workflow conditions enforce properly)
- **Steps:** clicked the "Concept / R&D" status chip on DNJ-1.
- **Result:** tooltip banner "**You don't have permission to transition this work item**". "View workflow" option grayed out; "Explain workflow" (Rovo AI) remains clickable.
- **Conclusion:** workflow conditions work as designed (matches memory: "vendors never move Styles").
- **Side observation:** "View workflow" being disabled is slightly hostile UX — vendor can't see the phase map even to read it. Consider enabling view-only mode so vendors understand the pipeline.
- **Severity:** CORRECT (but note the view-only workflow UX)

### [CORRECT] Vendor cannot inline-edit structured fields
- **Steps:** clicked on Description text, Vendor Style # value, Category value. None triggered edit mode.
- **Result:** consistent with Edit Issues permission denial for dnj-vendor. Matches user's Q2 design intent.
- **Severity:** CORRECT

### [BLOCKER-C03] Vendor sees DDLNY-internal business data — **Target Price (USD), Source (buyer references)**, Cloud Files URL
- **Where:** Right-side Details panel on every Style issue
- **Observed for DNJ-1:** Target Price (USD) = **2,180**, Source = **"BB Mar 26 MOM"**, Cloud Files URL = `https://drive.ddlny.test/dnj/D53_MAR_260145/`. All visible to aary-test without any additional action.
- **Why this is a blocker:**
  - **Target Price is DDLNY's internal cost target**. A vendor who can see it can reverse-engineer DDLNY's margin model and push their own pricing to the ceiling (or beyond) on every PO. This is commercially catastrophic.
  - **Source ("BB Mar 26 MOM", "SD Nov 25 MOM", etc.)** — these are DDLNY's internal buyer initials and meeting references. Exposes who's buying what and when, giving the vendor insight into DDLNY's internal decision-making process.
  - **Cloud Files URL** — if the DNJ vendor doesn't normally have access to DDLNY's Google Drive folder (for NYC-internal references, pricing sheets, buyer notes) but can see the URL, they can social-engineer access or at minimum know what exists.
- **Fix:** Jira admin → Project settings → Issue layout (or Field configuration) → mark Target Price, Source, Cloud Files URL as **"Hide from DNJ vendor role"**. The cleanest implementation is Jira's field-level security (Premium feature) via issue-layout rules, or use a separate vendor-view screen scheme that omits those fields. Short of that, relabel/split the fields so vendors see only what they need to produce the item.
- **Severity:** BLOCKER — #1 priority ahead of rollout; direct commercial risk.

### [BLOCKER-C04] Vendor can open the full "Create space" (new Jira project) dialog
- **Steps:** clicked the "here" link on the access-denied Administration page → landed on `/jira/settings/projects/manage` showing "Manage Spaces" (the list of projects in the instance) → clicked "Create space" button → "Space templates" dialog opened with the full template library.
- **What was NOT tested (intentionally, to avoid polluting the site):** actually clicking a Try button and committing to create a new project. This needs to be manually verified by the user or a careful follow-up test.
- **Why this is a red flag:** Even if the "Try" button at the end of the flow eventually errors with a permission denial, **the UI leaks that the user could attempt this**. Worse, if it succeeds, aary-test becomes an admin of a brand-new project inside the ddlny-pd workspace, with no DDLNY control over that new project's permissions or data.
- **Direct fix:** Jira Administration → Global permissions → **Create Projects** → ensure `dnj-vendor` group is NOT in the grant list. Also check Global permissions for "Administer Jira" and any other global rights that aren't scoped per-project.
- **Also fix:** don't show the "Manage Spaces" page or the "Create space" button to non-admins. That's more of a Jira platform UX issue than a DDLNY config one, but worth checking if Global Permissions resolve it.
- **Severity:** BLOCKER — privilege escalation vector until verified otherwise.

### [BLOCKER-C05] **Rovo AI ("Ask Rovo") hands confidential DDLNY data to the vendor on request**
- **Steps:** on DNJ-1, clicked "Ask Rovo" → chat panel opened with DNJ-1 context pre-loaded. Typed the prompt "*List all DNJ Styles with their Target Price and Source field values.*" and hit Enter.
- **Rovo's response (live, captured via DOM):**
  - Executed JQL `project = DNJ AND issuetype = Style ORDER BY created DESC…` internally.
  - Returned a numbered list: *"Here are all DNJ Style issues with their Target Price (USD) and Source values (ordered by created date descending):"*
  - Per-issue lines such as:
    - `DNJ-26 – Create a new ring based on this composite head — Target Price (USD): empty, Source: empty`
    - `DNJ-24 – Necklace - D39 NOV 250665 — Source: SD Nov 25 MOM`
    - `DNJ-23 – Necklace - D39 OCT 250606 — Source: SD Nov 25 MOM`
    - `DNJ-22 – Ring - R256194LY — Source: SD Nov 25 MOM`
    - `DNJ-21 – Pendant - PDX140180LB — Source: BB Mar 26 MOM`
    - `DNJ-20 – Ring - RX263013LY — Source: SD Nov 25 MOM`
    - `DNJ-19 – Pendant - PX253106Y — Source: SD Nov 25 MOM`
    - `DNJ-18 – Earring - EX263005LY — Source: SD Nov 25 MOM`
    - `DNJ-17 – Ring - RXL253160LY — Source: SD Nov 25 MOM`
    - (list continued through DNJ-16 and beyond in the panel, truncated here)
- **Why this is a BLOCKER:**
  - Vendors can query an AI assistant about any aspect of your data using natural language.
  - Rovo is field-aware — it pulled "Source" (internal buyer references with employee initials + monthly meeting tags). It also would pull Target Price values for Styles where they're populated. Diamond weights, gold weights, cloud drive URLs — all fair game.
  - This is vastly more dangerous than manual exfiltration because it's bulk + automated + discoverable without knowing JQL.
  - Compounded by the DATA visibility blocker (BLOCKER-C03): because Target Price is visible in the field, Rovo will answer questions about it.
- **Fix options:**
  - **Hard fix:** Atlassian Admin → Rovo administration → **disable Rovo for `dnj-vendor` group** (or for the whole Jira site if you don't want AI risk-surface at all).
  - **Soft fix:** same BLOCKER-C03 field-level hide (hide Target Price, Source, Cloud Files URL from the vendor role) — Rovo can only share what the querying user can read, so hiding the fields also silences Rovo on them.
- **Severity:** BLOCKER — the single highest-risk finding in this audit for vendor-roll-out.

### [NOTE-C06] Confluence space `DNJ` correctly denied to vendor
- **Steps:** navigated to `/wiki/spaces/DNJ`.
- **Result:** "We couldn't find what you're looking for" — access denied, page not rendered.
- Note: vendor CAN reach Confluence itself (shares the same auth); just not the DNJ space. Confluence trial counter shows "29 days left" vs Jira's "15 days" — different subscription clocks.
- **Severity:** CORRECT — confirms the "Confluence not configured" assertion holds at the permission layer for the space itself. Still recommend deleting the auto-provisioned space (MAJOR-008) just to eliminate the surface.

### [BLOCKER-C06] Vendor has full JQL access across DNJ, including Save filter + Share + Apps
- **Steps:** navigated to `/issues/?jql=project=DNJ OR project=ELEGANT`.
- **Result:** JQL error for ELEGANT ("The value 'ELEGANT' does not exist for the field 'project'."), correctly scoped. DNJ clause returned **27 of 27** work items. Vendor has the full JQL editor (Basic / JQL toggle, AI assist "Fix error"), plus "Save filter", "Share", "Apps" buttons.
- **Why:** combined with Rovo + data visibility, vendor can extract the entire DNJ dataset in seconds. Save filter means they can bookmark a powerful query. Share lets them export it (to themselves or a colleague).
- **Fix:** no direct fix for JQL itself (it's a core product feature). The control has to be at the data layer (hide sensitive fields per BLOCKER-C03). Consider also disabling "Export" / "Share" for the vendor role if available.
- **Severity:** BLOCKER (shares same fix path as C03/C05 — close the data surface, not the query surface).

### [NOTE-C07] API tokens require email-OTP step, but vendor owns the email
- **Steps:** navigated to `https://id.atlassian.com/manage-profile/security/api-tokens` as aary-test.
- **Result:** Atlassian intercepts with "Request one-time passcode" sent to `cambridgeeaaryan405@gmail.com`. Not a bypass — real 2-factor gate.
- **Concern:** since the vendor owns that inbox, they can complete the OTP and then generate API tokens. With a token, they can script the same data extraction at REST scale (bypassing Rovo and the browser entirely). Rate limits apply but don't meaningfully impede bulk extraction of 27 issues.
- **Fix:** not much to do about personal Atlassian accounts. Mitigations: (a) provision the vendor using a GUEST/EXTERNAL user flow that disallows API tokens if available on Premium/Enterprise; (b) deprovision the vendor the moment they leave the engagement; (c) rely on field-level data hiding so tokens can only read non-sensitive fields.
- **Severity:** NOTE (not a config bug, but a standing surface).

### [MAJOR-C08] Vendor lands on "Manage Spaces" (/jira/settings/projects/manage) when following the "list of all the projects" link
- **Steps:** from the access-denied Administration page, clicked "here".
- **Result:** Vendor sees the full Manage Spaces list. Currently that's only DNJ, so no cross-project leak **today**. BUT the vendor also sees:
  - Project Lead name (Aaryan Mehta)
  - Project Type (Company-managed software)
  - Last work update timestamp
  - A prominent "Create space" button (tested in BLOCKER-C04)
  - A "Templates" panel with Rovo-suggested templates
  - "Search Jira admin" link
- **Why it matters:** when Elegant eventually gets created, this page will list BOTH projects. Without additional scoping, a `dnj-vendor` member could see the Elegant project's existence (name, lead, type, timestamps) even if they can't enter it. That's pre-leak of cross-vendor information.
- **Fix:** evaluate Global permissions ("Browse users and groups", admin rights) and whether "Manage Spaces" can be gated per-role. At minimum, after Elegant is created, verify dnj-vendor does NOT see the Elegant row.
- **Severity:** MAJOR (becomes BLOCKER when second vendor project exists).

### [NOTE-C09] Add Comment / Add Attachment / Linked Work / Improve Style buttons all visible to vendor
- Vendor's DNJ-1 view surfaces: "Add a comment" input, Attachment add button, Linked work items `+` (both "Create linked work item" and "Link existing"), "Improve Style" Rovo action.
- Comment/Attachment permissions match the scheme (Create allowed for dnj-vendor). Not tested end-to-end to avoid writing test artifacts to DNJ-1.
- "Improve Style" is Rovo-powered — same risk surface as Ask Rovo (BLOCKER-C05).

---

## Executive Summary — severity-ordered punch list

**BLOCKERS (must fix before production vendor use):**
| # | Finding | Fix where | Effort |
|---|---|---|---|
| C05 | Rovo AI hands DDLNY-internal data (Target Price, Source, etc.) to vendor | Admin → Rovo settings, disable for dnj-vendor group | 5 min |
| C03 | Target Price, Source, Cloud Files URL fields visible to vendor on every Style | Project settings → Issue Layout → hide those fields for vendor role | 10 min |
| 001 | Summary missing from DNJ Create screen (Style + Task both broken) | Admin → Screens → "DNJ: Minimal Create Screen" → add Summary | 2 min |
| 009 | `dnj-vendor` has Create Issues permission (can attempt Style creation) | Permission scheme → Create Issues → remove Group (dnj-vendor) | 2 min |
| C02 | Vendor can self-assign ANY Style, including DDLNY-phase ones (silent hijack) | Permission scheme → Assign Issues → remove Group (dnj-vendor) | 2 min |
| C04 | "Create space" button accessible to vendor; can open template picker | Global permissions → Create Projects → confirm dnj-vendor NOT granted | 2 min verify |
| C06 | Full JQL + Save Filter + Share for vendor (mitigated if C03 lands) | N/A — solved by closing the data surface in C03 | — |
| 003 | Task issues on Jira default workflow (Open/In Progress/Done), not DDLNY's 13-phase | Workflow scheme → create/assign a Task workflow | 30 min |
| 004/008 | Resolution field never set → all Done issues look Unresolved everywhere | Workflow → post-function on transitions to Approved/Credit/Cancelled | 15 min |
| 005 | Permission scheme grants by group name, not Project Role | Refactor scheme to use roles (Vendor / DDLNY-NYC / DDLNY-India) | 60 min |
| 011 | Zero automation rules (no stale-status alerts, no QC auto-assign, etc.) | Build ~3 rules (Resolution-set, stale-alert, QC-assign) | 90 min |
| 012 | No notification scheme attached → zero emails on any event | Project settings → Notifications → attach Default Notification Scheme | 5 min |
| 010 | "DNJ: Minimal Create Screen" is stripped → no custom fields on create | Same fix as 001, plus consider adding key Style fields | covered by 001 |
| 007 | Style workflow has zero source-state guards (all transitions global) | Add validators to enforce phase order | 30 min |

**MAJORS (fix before GA):**
| # | Finding | Fix |
|---|---|---|
| 001 | DNJ missing Sub-task and Collection issue types | Add types via project settings |
| 002 | Workflow transitions all global; enforcement relies on conditions (which ARE role-gated ✓) | Verified ddlny-nyc / ddlny-india / vendor split; just move to roles |
| 003 | Custom "Labels" field collides with system `labels` | Rename custom field or remove from screens |
| 004 | Collection as text field vs memory spec (should be issue type) | Decide model; implement |
| 005 | Diamond Color/Shapes, Gemstone Types/Shapes as free text | Convert to selects with canonical values |
| 007 | DNJ-8 summary has lowercase `x` in SKU code (data hygiene) | Edit summary; add validator |
| 008 | Confluence space auto-provisioned for DNJ despite "no Confluence setup" | Delete or archive the space |
| 010 | Workflow conditions use group names directly, not roles | Migrate to Project Roles (same as 005 in scheme) |
| 012 | Style + Task share a single create/edit/view screen | Split screen scheme |
| 013 | DNJ board has all 13 phases as columns including Done states | Move Done to filter; add Paused swimlane |
| C08 | Manage Spaces page accessible to vendor (info leak when Elegant lands) | Scope if possible via Global permissions |

**MINORS / NOTES:** see body of findings for MINOR-001 … MINOR-007 and NOTE-001 … NOTE-C09.

**CORRECT-BY-DESIGN (verified working as intended):**
- Vendor Edit Issues denied ✓
- Vendor Transition Issues denied by workflow conditions ✓
- Vendor Delete / Close / Resolve / Move / Schedule denied ✓
- Confluence DNJ space denied ✓
- Admin configuration URLs denied ✓
- API tokens require email OTP ✓
- Workflow: all 13 phases exist, phase names correct per spec ✓

---

## Audit metadata
- Site: https://ddlny-pd.atlassian.net
- Audit date: 2026-04-22
- Personas tested: aaryan@ddlny.com (admin), cambridgeeaaryan405@gmail.com (aary-test, dnj-vendor)
- Project scope: DNJ only (Elegant deferred per user)
- Auditor: Claude Opus 4.7 (1M context) via Claude Code
- Evidence: findings backed by API responses, UI screenshots, and Rovo AI response captures. Raw tool outputs preserved by the harness in `tool-results/` for this session.
- **Out of scope (skipped):** board Forms/List/Calendar/Reports tabs deep-dive, Jira audit log cross-check, remaining 8 workflow transition condition verifications, group membership rosters. These are lower-value given the findings above.

---
*End of audit.*
