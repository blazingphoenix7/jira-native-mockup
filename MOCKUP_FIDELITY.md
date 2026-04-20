# Mockup Fidelity Audit — DDLNY PD Jira Dashboard

**Phase 1 of the strict 3-phase fidelity plan.**
**Date: 2026-04-20**

**Purpose.** Every feature in the current HTML/CSS/JS mockup is classified against what real Jira Cloud actually ships out of the box. The goal is to eliminate expectation gaps *before* DDLNY colleagues sign off on the mockup — nothing worse than falling in love with a screen the real Jira can't reproduce.

**Plan assumed.** Jira Cloud **Standard** ($8/user/month × 25–50 DDLNY + vendor users ≈ $200–400/month baseline). Reasoning:
- Free plan caps at 10 users, so it's out.
- Standard unlocks Issue Security Schemes at scale, unlimited Automation inside a project, and Custom field contexts — which the vendor-isolation design depends on.
- Premium ($17/user) is only needed for Advanced Roadmaps (Plans) and Sandbox. Not required for anything in the current mockup.

**Projects + structure assumed.**
- Two Jira projects: **DNJ**, **Elegant** (short names, per memory).
- Optional third project **PD** for Collections (only strictly needed if Collections must span both vendors as first-class issues — see §1.8).
- Groups: `ddlny-pd`, `vendor-dnj`, `vendor-elegant`.
- Issue Security Scheme with 3 levels: `ddlny-only`, `dnj-visible`, `elegant-visible`.

---

## Legend

| Tier | Meaning | Cost impact |
|------|---------|-------------|
| 🟢 **Native** | Jira Cloud out of the box — admin config only (workflow, custom field, permission scheme, dashboard gadget). Visual styling is fixed by Atlassian, but functionality is included. | Included in plan |
| 🟡 **Automation** | Jira Automation rule. Behavior-only (triggers, conditions, actions) — no custom UI shown to users. | Included in plan (Standard = unlimited in-project rules) |
| 🟠 **Marketplace** | Requires a 3rd-party app from Atlassian Marketplace. | Usually $1–5/user/month per app |
| 🔴 **Custom UI** | Impossible to reproduce inside real Jira without building a custom frontend on top of the REST API (essentially, writing our own website that talks to Jira). | Engineering build cost |

---

## Tally

| Tier | Count |
|------|------:|
| 🟢 Native | **29** |
| 🟡 Automation | **7** |
| 🟠 Marketplace | **9** |
| 🔴 Custom UI | **11** |

**Headline takeaway.** Roughly **1 in 3** mockup features cannot be reproduced pixel-for-pixel in real Jira without either paid add-ons or a custom frontend. The functional security boundary (vendor isolation) is fully native — the *polish* is where gaps appear.

---

## 🚨 Top 5 expectation gaps to flag to DDLNY colleagues

1. **Role switcher in the top nav ("View as: DDLNY / DNJ / Elegant") is 🔴 Custom UI.** Real Jira has no "view-as" toggle — you see what your own user account sees, full stop. Admins can create test accounts, but there's no live switcher. Today's single-page demo is misleading if colleagues expect it.
2. **"✅ Ready to move to X" advance banner is 🔴 Custom UI.** Real Jira can *enforce* that gating sub-tasks are done before letting you transition (workflow validator), but it does not *proactively surface* "this one's ready". Best native replacement is an Automation rule that posts a comment + email, or auto-transitions silently. Colleagues expecting the green banner will not see it.
3. **Gallery view (image-rich grid of all 120 styles) is 🟠 Marketplace.** Jira boards show cover images on cards natively, but they're column-grouped by status. A standalone "browse all styles as a visual grid" page needs either an app like Visual Tiles, or the custom frontend.
4. **Attachments tab with phase-tag filter ("added in R&D", "added in CAD") is 🟠 Marketplace.** Native Jira attachments have no phase metadata — they're just a flat list with upload date. Either buy Smart Attachments for Jira (~$2–4/user/mo), or give up the filter.
5. **Collection as a first-class cross-vendor object with vendor tabs is 🔴 Custom UI.** Jira issues live in exactly one project, so a "Collection spans DNJ and Elegant simultaneously" requires either (a) a separate PD project with cross-project *links* to child styles (native but ugly) or (b) a custom UI on top. The specific "All / DNJ / Elegant" vendor-tab UX inside a Collection detail cannot be reproduced natively.

Everything else in the mockup is either native, covered by automation, or has an acceptable native alternative documented below.

---

## 1. Workflow + data foundation

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 1.1 | 7-phase workflow: Concept/R&D → Design → CAD → PO → Sample Production → Received & Approved → Repair | 🟢 | Configure 7 statuses in the workflow editor, link them with transitions. Exactly what workflows are for. |
| 1.2 | Side lanes (Hold, Cancelled) visually separated on the right, yellow-tinted, with a dashed divider | 🟠 | Native Jira renders all columns identically. Can only place them at the right end of the column order. Dashed divider + yellow tint needs a board-customization app (e.g. Board Customizer for Jira, ~$1/user/mo) or is unavailable. |
| 1.3 | 647 real DNJ styles imported from Excel | 🟢 | Bulk import via REST API (`POST /rest/api/3/issue/bulk`) or CSV importer. |
| 1.4 | 34 items reassigned to Elegant project | 🟢 | Native "Move issue" action or bulk-move. |
| 1.5 | 1,024 sub-tasks distributed across styles | 🟢 | Sub-task is a built-in issue type; create via REST. |
| 1.6 | Collection as an issue type with its own 4-status workflow (Planning → In Development → Delivered → Archived) | 🟢 | Define a new issue type "Collection" and its own workflow — standard Jira configuration. |
| 1.7 | Collection custom fields: customer, launch date, target retail USD, owner | 🟢 | Native custom fields (select-list, date, number, user-picker). |
| 1.8 | **Cross-vendor Collections** (one Collection spans both DNJ and Elegant projects) | 🔴 | Jira issues belong to exactly one project. Workarounds:<br>• **(a) Put Collections in a 3rd `PD` project** and use "Issue Links" to connect each style in DNJ/Elegant to its collection. Native, but the Collection can't directly list its children in a board — you have to click a saved filter. Link field will show the list.<br>• **(b) Duplicate the collection** (one in DNJ, one in Elegant, linked). Data-hygiene nightmare.<br>**Recommended:** option (a). See §6.5 for the tab-UX compromise. |

---

## 2. Sub-tasks + gating

> **Jira concept (★).** A *sub-task* is a full issue with its own ID, assignee, status, due date, comments, attachments — just visibly nested under a *parent issue*. Jira's native parent-child hierarchy is: Epic → Story/Task/Bug → Sub-task. For us: Collection (Epic-like) → Style (Story-like) → Sub-task.

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 2.1 | Sub-task CRUD on Style drawer | 🟢 | Issue view shows a "Child issues" section with inline create, status change, reassign. |
| 2.2 | Progress pill `2/3 ✓` on every board card | 🟢 | Native board cards show a sub-task count (e.g. "0 of 3 done") as a small icon. Same info, different styling. **UX compromise:** less prominent, no color coding by completeness. |
| 2.3 | `GATE` tag flagging "this sub-task must be done before the parent advances" + enforcement | 🟡 + 🟢 | Add a custom checkbox field "Gating" on sub-task (🟢). Enforce via a workflow validator using the **Parent Link Validator** (native for "all sub-tasks must be Done") OR an Automation rule on transition that blocks with a comment if gating sub-tasks open (🟡). Visible label "GATE" appears as a field value on the sub-task, not as a colored pill. **Limitation:** native workflow validator is all-or-nothing ("all sub-tasks done"); selecting *only* the gating ones requires either ScriptRunner (🟠 marketplace, ~$2/user/mo) or the Automation route with a slight race-condition window. |
| 2.4 | DDLNY-only sub-task (vendor must never see it) | 🟢 | Native. Set the sub-task's Security Level to `ddlny-only`. Vendor users cannot read it. |
| 2.5 | Vendor sees "🔒 N hidden sub-tasks" yellow banner when DDLNY-only sub-tasks exist | 🟠 | Native Jira shows each restricted sub-task as a placeholder row ("You do not have permission to view this issue"), one per hidden sub-task. The aggregated "N hidden" count banner does not exist natively. Marketplace apps like Issue Security Enhancer can add a grouped view, or accept the native per-row stubs. **UX compromise:** vendor sees N rows of "Restricted" instead of one clean banner. Same info leakage boundary. |
| 2.6 | Loose reassignment — any project member can reassign a sub-task | 🟢 | Grant "Assign Issues" permission to a broad role in the permission scheme. |
| 2.7 | Every reassignment + status change recorded in activity log | 🟢 | Jira's History tab records every field change, timestamped, immutably. Built-in. |

---

## 3. Auto-advance phase (the green banner)

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 3.1 | Green "✅ Ready to move to X — [Advance →] [Snooze]" banner in drawer when all gating sub-tasks complete | 🔴 | No native equivalent. Closest native substitute: an **Automation rule** fires when the last gating sub-task moves to Done and either (a) posts a comment "All gates complete — ready for CAD", (b) auto-transitions the parent without asking, or (c) emails/in-app-notifies the owner. No in-issue banner. **UX compromise:** DDLNY loses the "big green prompt". Owner finds out via a comment notification or email. |
| 3.2 | Banner role-aware — vendor sees disabled "🔒 Advance (DDLNY)" | 🟢 for the permission, 🔴 for the visual hint | Workflow transition conditions restrict who can execute — vendor users simply won't see the transition button (native Jira **hides**, doesn't grey-out-with-lock). **UX compromise:** vendor doesn't learn "there's an action I can't do" — the button just isn't there. |
| 3.3 | Clicking Advance moves phase + logs in History | 🟢 | Built-in. |
| 3.4 | Snooze button to dismiss banner for 24h | 🔴 | No native equivalent (the banner itself doesn't exist). Workaround: no snooze in the native experience. |

---

## 4. Create dialog — 3-flow picker

> **Jira concept (★).** The native Create dialog starts with an **Issue Type** dropdown. Each type can have its own **screen** (field set) — so Jira naturally supports "distinct forms per type". What differs from the mockup is the *visual shape* of the picker (dropdown vs. card grid) and some of the sub-task polish.

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 4.1 | `+ Create` opens a card picker with 3 large tiles (💎 Style · 📚 Collection · 🧩 Sub-task) | 🟢 functionally, 🔴 visually | Native Create dialog has an issue-type dropdown at the top. Same effect (pick a type → see its form), different visuals. **UX compromise:** dropdown instead of tiles. Colleagues will still see the 3 flows. |
| 4.2 | Style form — Basics, Classification, People/Priority, Design inputs, auto-security hint | 🟢 | Assemble a screen with these field groups. "Section heads" become field-group labels. |
| 4.3 | Auto-security hint ("🔒 Auto-security: DNJ Visible — only DDLNY staff + DNJ vendor users will see this") | 🟡 | Automation rule: on issue create, if `project = DNJ`, set Security Level = `dnj-visible`. Runs after save, so the hint on the form itself isn't shown — instead the issue just gets the correct security applied. **UX compromise:** user doesn't get the proactive hint; they see the applied label after submission. |
| 4.4 | Collection form with multi-vendor checkbox ("DNJ ☑ Elegant ☐") | 🟢 for single-vendor, 🔴 for multi-vendor | See §1.8. If Collections live in a separate PD project, the "assigned vendors" checkbox is just a multi-select custom field (native). The actual cross-project linkage of children is engineered via Automation + Issue Links. |
| 4.5 | Sub-task form with 6 template buttons (Request Feedback · Request Revision · Upload CAD · Send BOM · Send Proforma · Ship Sample) that prefill summary/description/gating/DDLNY-only | 🟠 | Native sub-task creation = single form, no templates. Closest options:<br>• **Marketplace:** apps like "Issue Templates for Jira" (~$2/user/mo) add template buttons.<br>• **Automation:** auto-create specific sub-tasks when the parent enters a phase (e.g. entering CAD → auto-create "Upload CAD" sub-task with gating=true). This removes the need for the user to pick a template — Jira creates them proactively.<br>**Recommended:** the automation route. Quieter, no app cost, but users lose the one-click template picker. **UX compromise:** no template buttons; sub-tasks appear automatically OR are typed manually. |
| 4.6 | Custom sub-task button (blank form) | 🟢 | Just the native create. |

---

## 5. Drawer tabs (Details · Sub-tasks · Attachments · Comments · History · Transitions)

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 5.1 | Details tab — all custom fields displayed | 🟢 | Native issue view. Field order is configurable. Layout (2-column) is roughly matched by Jira's default. |
| 5.2 | Milestone log (BOM sent, CAD sent, PO received with dates) | 🟡 | Native has no "milestone log" widget. Options:<br>• **(a)** One custom date field per event ("BOM sent date", "CAD sent date", "PO received date") — 🟢 native, ugly grid. User fills them in manually.<br>• **(b)** Automation rule: on certain sub-task completion (e.g. "Send BOM" sub-task → Done), append a line to a "Milestone log" multi-line text field (🟡). Looks like a running log.<br>• **(c)** Use Jira's native History tab as the milestone log — it already records all field changes.<br>**Recommended:** (c) + (b). History for automatic; single text field populated by Automation for human-readable "BOM sent on 28 Mar by VW". |
| 5.3 | Sub-tasks tab with inline status dropdown + reassign icon per row | 🟢 | Native. The Child Issues section has inline status change. Reassign is one more click (dropdown in the sub-task itself). |
| 5.4 | Attachments tab — grid layout with phase-tag filter ("All · R&D · Design · CAD · PO") | 🟠 | Native Attachments is a **flat list** with thumbnails for images, sorted by upload date. No phase metadata, no filter. To get phase filter:<br>• **Marketplace:** Smart Attachments for Jira (~$2–4/user/mo) adds categorized/tagged attachments.<br>• **Custom:** every attachment upload triggers an Automation rule that stamps the current phase onto the filename (e.g. `CAD-CAD_DNJ-001.png`) — workable but hacky, still no clean filter UI.<br>**Recommended:** either Smart Attachments or accept the flat list. **UX compromise:** no phase filter; attachments mix chronologically. |
| 5.5 | Comments tab with author avatars | 🟢 | Native, exactly. |
| 5.6 | History tab — immutable activity log with per-event emoji icons (➕ 🔁 📎 💬 🧩 ↔) | 🟢 functionally, 🔴 visually | History tab is native and immutable. Emoji icons per event kind don't exist — every row looks like "User changed Field from X to Y". **UX compromise:** visually flatter; harder to scan at a glance. |
| 5.7 | Transition buttons at top of drawer showing 🔒 for transitions the current role can't execute | 🔴 | Native Jira **hides** transitions you can't execute rather than greying them out with a lock icon. The 🔒 visual cue does not exist. **UX compromise:** vendor doesn't discover "DDLNY can do this" from the UI alone. |

---

## 6. Views

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 6.1 | Board view (Kanban, 7 main lanes + 2 side lanes with dashed divider) | 🟢 lanes, 🟠 side-lane styling | Standard Kanban board. Hold/Cancelled columns get placed at the end of the column order. Dashed divider + yellow tint not achievable without a board-customization app. |
| 6.2 | Gallery view (visual grid of first 120 styles with large thumbnails) | 🟠 | Native Jira boards can show cover images (set the "Image" field as the card cover — Standard+), but cards are always column-grouped. A standalone "grid of all styles" page needs:<br>• Marketplace app (e.g. Visual Tiles for Jira, ~$1–3/user/mo), OR<br>• JQL filter + custom dashboard gadget to approximate (rough visual).<br>**UX compromise:** designers lose the "wall of styles" browsing view. Must use Board (column-grouped with images) instead. |
| 6.3 | List view (table of first 200 styles) | 🟢 | Native. Every Jira board has a List tab; every JQL search shows a table. Column config is native. |
| 6.4 | Collections landing (grid of collection cards with 4-thumb mosaic per card, status chip, customer, launch date) | 🟠 | If Collections are a native issue type, a saved JQL filter + standard list view covers the data. The specific **4-thumb mosaic per card** is not native — Jira shows one cover image max per card. Marketplace "Issue Card Gallery" apps approximate; or accept a flat list. |
| 6.5 | Collection detail with vendor tabs (All / DNJ / Elegant) for DDLNY, vendor-filtered for vendors | 🔴 | Follows from §1.8 — the cross-vendor tab UX is custom. Native closest: one Collection issue in the PD project, with saved JQL filters "children in DNJ" / "children in ELG" / "all children". User switches filters instead of tabs. **UX compromise:** clunkier, but same data access. |
| 6.6 | Reports — funnel (count per phase) + KPI tiles (Hit rate, Drop-off, Rework-heavy) | 🟢 | Native dashboard gadgets cover all of this:<br>• Funnel → "Two Dimensional Filter Statistics" or Cumulative Flow Diagram<br>• Hit rate → Number gadget with JQL<br>• Drop-off → Number gadget<br>• Rework-heavy → Issue Statistics gadget.<br>Visual styling is Atlassian's standard (less polished than our custom KPI tiles). |
| 6.7 | Timeline (simplified list-style view of styles ordered by start date) | 🟠 | Jira has a native Timeline view (Standard+), but it's **Gantt-chart style** (horizontal bars over a calendar), not the simple vertical list shown in the mockup. To get the list-style:<br>• Use the List view with "Start date" as the sort column → 🟢 (different visuals)<br>• Or use native Timeline → 🟢 but looks completely different. |

---

## 7. Dashboard

> **Jira concept (★).** Jira's built-in Dashboards are grids of configurable **gadgets**. They're less visually polished than the mockup's KPI tiles but cover almost all the same data.

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 7.1 | 6 KPI tiles (Total / In flight / Design / PO / Ready to advance / Received & Approved) | 🟢 | Use the "Filter Results" or "Number" gadget with JQL. Visual styling is Atlassian's (smaller numbers, different colors). |
| 7.2 | Workflow status bar chart, click-to-filter-board | 🟢 | "Pie Chart" or "Two Dimensional Filter Statistics" gadget. Click goes to a filter results page, not directly to the board (still navigable). |
| 7.3 | Top collections bar chart | 🟢 | Same gadget grouped by "Collection" custom field. |
| 7.4 | DDLNY owners bar chart | 🟢 | Same gadget grouped by Assignee. |
| 7.5 | Recent activity feed | 🟢 | Built-in "Activity Stream" gadget. |
| 7.6 | Vendor comparison panel (two cards side-by-side with per-phase counts, **only visible to DDLNY**) | 🟢 functionally, 🔴 layout | Two "Two Dimensional Filter Statistics" gadgets side-by-side (one per project) achieve the same data. Visibility control: put the gadget on a dashboard shared only with `ddlny-pd` group. **UX compromise:** two separate gadgets instead of one side-by-side card — visually busier, but role-scoped correctly. |

---

## 8. Role / vendor isolation (UI chrome)

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 8.1 | Role switcher in top nav ("View as: DDLNY Admin / DNJ Vendor / Elegant Vendor") | 🔴 | Real Jira has no view-as toggle. To preview vendor experience: create test accounts (`dnj-test@ddlny.com`, `elegant-test@ddlny.com`), log in as them. No live switcher in the UI. **UX compromise:** removing this toggle is probably the biggest visible change from mockup to real. Keep a separate *internal* test-account list documented for DDLNY admins. |
| 8.2 | Colored permission banner on every page ("🔒 You are viewing as DNJ. Elegant work is invisible…") | 🔴 | Jira shows permission errors per-action (e.g. "You do not have permission to view this issue"), never as a persistent header banner. **UX compromise:** vendor users don't get a big reassuring banner; they just find they can't see certain issues. |
| 8.3 | Sidebar hides other projects for vendors (shown as "🔒 other projects hidden") | 🟢 | Native. Project permissions hide projects the user has no access to; they simply don't appear in the project picker. |
| 8.4 | Cross-vendor collection detail: vendor sees only their share + "🔒 other vendor portion hidden" info banner | 🔴 banner, 🟢 isolation | Isolation itself is enforced natively (issue security). The *information* that "there are hidden items here" requires custom UI — native just silently filters. **UX compromise:** vendor doesn't know how many items the other vendor has on the same collection. (Arguably a feature, not a bug, from DDLNY's perspective.) |
| 8.5 | Elegant-user empty state ("No styles yet for this filter") when the Elegant project is empty | 🟢 | Native Jira shows a perfectly good empty state on an empty project. |

---

## 9. Navigation chrome (top + sidebar)

| # | Feature | Tier | How it maps to Jira |
|---|---------|------|---------------------|
| 9.1 | Top nav: Your work · Projects ▾ · Filters · Dashboards · Teams · Apps | 🟢 | Identical — Jira Cloud's real top nav has exactly these entries. |
| 9.2 | Global search box ("Search styles, PO#, CAD…") | 🟢 | Native. Jira's global search indexes all fields including custom ones. |
| 9.3 | `+ Create` button prominently in top nav | 🟢 | Native Jira has this in the exact same spot. |
| 9.4 | User avatar top-right | 🟢 | Native. |
| 9.5 | Left sidebar: project switcher + Views list + Shortcuts (My styles, Awaiting feedback, Overdue, 1Kt hot styles) + Team list | 🟢 | Native. Shortcuts become saved JQL filters. Team list comes from the project's "People" section. |

---

## 10. Pending decisions — not yet built, but each will need a tier label before building

These are tagged 🟡 in `MOCKUP_TODO.md` (pending decisions from Aaryan). When each is decided, it must be classified BEFORE implementation per the Phase 3 rule.

- **DDLNY-only field strategy** (target cost, margin, vendor score, internal notes) — 🟢 if implemented as a linked "DDLNY companion issue" with `ddlny-only` security; 🟠 if implemented as field-level permissions on the Style itself (native Jira doesn't support per-role field visibility — would need Issue-Level Field Security app, ~$2/user/mo).
  **Memory recommendation stands:** companion issue (cleaner security boundary).
- **Repair phase mechanics** — 🟢 (just another workflow branch).
- **Received & Approved split** — 🟢.
- **Phase list finalization** — 🟢.
- **Pricing module (AI-driven)** — 🔴 (AI pricing suggestion UI does not exist in Jira; build as separate service that posts back via REST).
- **CAD 3D viewer** — 🟠 (marketplace apps like 3D File Viewer exist) or 🔴 for custom glTF viewer.
- **Customer modules (JCP, Sam's)** — 🟢 if implemented as user groups + saved filters; 🔴 if customers need their own authenticated views into Jira.
- **Jewelry metadata fields** (metal type, carat, clarity, setting, piece count) — 🟢 (custom fields: select-list, number, multi-select).

---

## 11. Concepts discussed but not in the mockup (from MOCKUP_TODO.md)

These aren't in the visual mockup, but colleagues may assume they're coming. Classify now.

| Feature | Tier |
|---------|------|
| Executive dashboard for DDLNY leadership | 🟢 (dashboard gadgets + JQL) |
| Per-owner dashboard | 🟢 |
| Vendor self-dashboard | 🟢 (dashboard shared with vendor group) |
| Cycle time by phase per vendor | 🟢 (native Control Chart report) |
| Vendor SLA (% sub-tasks on time) | 🟡 (Automation tallies + custom field) |
| Rework histogram | 🟠 (needs custom chart; marketplace app eazyBI ~$10/user/mo) |
| Category profitability | 🟠 (needs pricing data + custom reporting) |
| Repair rate | 🟢 (JQL filter + Number gadget) |
| Email/in-app notifications on phase changes, assignment, overdue | 🟢 (native notification scheme + automation) |
| Slack notifications | 🟡 (Automation has a native Slack action) |
| @-mentions in comments | 🟢 (native) |
| Watcher system | 🟢 (native) |
| Bulk actions (select 10 → bulk transition/reassign) | 🟢 (native bulk edit) |
| Saved filters | 🟢 (native) |
| Mobile-responsive view | 🟢 (Jira has an official mobile app, iOS + Android) |
| Search-by-image (upload photo, find similar) | 🔴 (no native equivalent; separate ML service) |
| Side-by-side style comparison (v1 vs v2) | 🔴 (no native equivalent) |
| Customer proof pages (shareable read-only links for JCP/Sam's) | 🟠 (marketplace: External Share for Jira, Refined Sites) or 🔴 custom portal |
| PDF line-sheet export per Collection | 🟠 (marketplace: Better PDF Exporter, ~$1–3/user/mo) |

---

## 12. Consolidated 🟠 + 🔴 compromise register

One-line summary for each non-native feature. Use this as the **"things that will look different"** list in the colleague sign-off meeting.

| # | Mockup feature | Tier | Native alternative | UX compromise colleagues will actually see |
|---|----------------|------|---------------------|---------------------------------------------|
| 1 | Yellow side-lane styling for Hold/Cancelled | 🟠 | Place columns at right end | Uniform column look; side lanes don't stand out |
| 2 | Cross-vendor Collection (one Collection spans DNJ + Elegant) | 🔴 | PD project + issue links | Collection is a separate project; children reached via link list, not embedded |
| 3 | "🔒 N hidden sub-tasks" yellow banner | 🟠 | Per-row "Restricted" placeholders | Vendor sees N anonymous rows, no clean banner |
| 4 | "✅ Ready to move to X" advance banner | 🔴 | Automation comment or silent auto-transition | No in-issue prompt; owner learns via notification |
| 5 | Snooze button on advance banner | 🔴 | — | Feature goes away |
| 6 | 🔒 icon on role-restricted transition buttons | 🔴 | Buttons are simply hidden | Users can't discover what they'd be allowed if they had permission |
| 7 | Role switcher (View as: DDLNY/DNJ/Elegant) | 🔴 | Separate test accounts | Admins log in/out to preview vendor experience |
| 8 | Colored permission banner per page | 🔴 | Per-action permission errors | No top-of-page reassurance text |
| 9 | Sub-task template buttons (Request Feedback / Upload CAD / etc.) | 🟠 | Automation auto-creates sub-tasks on phase entry | Users type sub-task summaries manually; templates appear automatically on phase transitions instead |
| 10 | Auto-security hint shown on Style create form | 🟡 | Automation sets security post-save | Label applied, but no proactive hint during typing |
| 11 | Gallery view (standalone image grid of all styles) | 🟠 | Board view with cover images (column-grouped) | No "wall of styles" page; browse by column |
| 12 | Collection card with 4-thumb mosaic | 🟠 | Collection list with 1 cover image per card | Cards look like standard Jira issue cards |
| 13 | Collection detail vendor tabs (All / DNJ / Elegant) | 🔴 | Saved JQL filter per vendor | User switches filters instead of tabs |
| 14 | Attachments phase-tag filter ("added in R&D") | 🟠 | Flat attachment list | No phase filter; ordered by upload date only |
| 15 | Per-event emoji icons in History tab | 🔴 | Uniform "User changed X from Y to Z" rows | Flatter, harder to scan |
| 16 | KPI tile layout on dashboard | 🟢-ish | Number gadget | Less polished, standard Atlassian look |
| 17 | Vendor comparison panel (side-by-side cards) | 🔴 layout | Two gadgets side-by-side | Two separate gadgets, busier |
| 18 | Timeline view (list style) | 🟠 | Native Timeline (Gantt) or List view sorted by Start date | Either Gantt bars or a plain table |
| 19 | Ready-to-advance pill on board cards (`✨ ready`) | 🔴 | — | No visual indicator on cards |
| 20 | Gating sub-task enforcement of "only gating ones" | 🟠 | ScriptRunner app or Automation with race window | Either buy add-on or accept a small timing window |

---

## 13. What this means for the Phase 2 rebuild

Phase 2 will re-skin the mockup to **look like real Jira Cloud actually looks**, with every 🟠 and 🔴 feature above either:
- **Replaced** with its native alternative (row 16 above: KPI tiles → gadget-style cards), OR
- **Marked in-UI** with a small badge such as `🟠 requires add-on` or `🔴 custom UI only`, so when colleagues see it in the mockup they immediately understand "this part won't look exactly like this in real Jira".

After Phase 2 sign-off, Phase 3 feature-adds from `MOCKUP_TODO.md` will each receive a tier label **before** building.

---

## 14. Recommended discussion points for DDLNY colleague sign-off meeting

1. **Top 5 gaps** (§ top of this doc) — talk through each, get explicit "we accept the native alternative" or "we want to buy the app" decision.
2. **Plan decision** — Standard ($8/user) vs Premium ($17/user). The mockup does not require Premium. Confirm Standard.
3. **Marketplace budget** — we've flagged ~5 apps that would add $2–4/user/mo each. At 40 users, each app ≈ $100/month. Agree an app budget ceiling before Phase 2 so we know which compromises to bake in vs. buy out of.
4. **Role switcher** — acknowledge this disappears in real Jira. Decide: keep the mockup's switcher for demo purposes only, or rebuild the mockup to show exactly one role at a time (more honest).
5. **Collections as cross-vendor** — pick option (a) separate PD project or option (b) something simpler. This decision gates a lot of Phase 2 layout.
6. **Sub-task templates** — pick: marketplace app ($2/user) vs. Automation-based auto-creation on phase entry (no user-facing templates). Affects the Create dialog Phase 2 rebuild.
7. **Attachments phase filter** — pick: Smart Attachments app (~$2/user) vs. flat list. Affects the drawer Attachments tab Phase 2 rebuild.
