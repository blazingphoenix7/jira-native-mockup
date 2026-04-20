# DDLNY Jira Mockup — Open Items

Last updated: 2026-04-16. This file tracks what's in the mockup today, what still needs a decision, and what's conceptually planned but not yet built. Restricted to the *mockup* — building the actual Jira instance is a separate track.

---

## ✅ Already built in the mockup

### Workflow + data
- [x] 7-phase workflow: `Concept/R&D → Design → CAD → PO → Sample Production → Received & Approved → Repair`
- [x] Side lanes: `Hold`, `Cancelled` (visually separated, yellow-tinted, on the right of the board)
- [x] 647 real styles from the DNJ April 2026 MOM report, remapped into the new 7 phases
- [x] 34 items reassigned to Elegant so cross-vendor behavior can be demoed
- [x] 6 real cross-vendor collections (Twinkling, Cross, Link, Stackable, LGD Bgt Dainty, Dainty Studs)
- [x] 1,024 synthesized sub-tasks distributed across styles based on phase
- [x] 113 Collection objects materialized, each with own workflow status + customer + launch date + target retail

### Sub-tasks (end-to-end)
- [x] Sub-task CRUD on the Style drawer (Sub-tasks tab)
- [x] Progress pill on every card (`2/3 ✓`) that updates live
- [x] Gating flag — displayed as `GATE` tag on the sub-task row
- [x] Privacy: `Inherit by default, DDLNY-only opt-out` — shown as `DDLNY-only` tag
- [x] Vendor view of DDLNY-only sub-tasks → yellow banner "🔒 N hidden sub-tasks"
- [x] Loose reassignment — anyone in the project can reassign
- [x] Reassignment + status change both recorded in activity log

### Create flow (3-flow picker)
- [x] `+ Create` opens a type picker (💎 Style · 📚 Collection · 🧩 Sub-task)
- [x] Style form: Basics, Classification, People/Priority, Design inputs, auto-security hint
- [x] Collection form: own workflow, customer, launch date, target retail, multi-vendor checkbox
- [x] Sub-task form: 6 template buttons (Request Feedback, Request Revision, Upload CAD, Send BOM, Send Proforma, Ship Sample) + Custom
- [x] Template buttons pre-fill summary, description, gating, DDLNY-only

### Auto-advance
- [x] Banner in drawer when all gating sub-tasks complete: "✅ Ready to move to X — [Advance →] [Snooze]"
- [x] Banner is role-aware — vendor sees "🔒 Advance (DDLNY)" disabled
- [x] Clicking Advance actually moves the phase + logs in History

### Other drawer tabs
- [x] Details — all fields + milestone log
- [x] Attachments — grid with phase-tag filter ("added in R&D" etc.)
- [x] Comments — rendered with author avatars
- [x] History — immutable activity log with icons per event type

### Role / vendor isolation (mockup fidelity to real Jira)
- [x] Top-right role switcher: DDLNY Admin · DNJ Vendor · Elegant Vendor
- [x] Permission banner on every view
- [x] Sidebar hides other projects for vendors (🔒 other projects hidden)
- [x] Cross-vendor collection detail: DDLNY sees all + vendor tabs; vendor sees only their share + "🔒 other vendor portion hidden" banner
- [x] Transition buttons on drawer: show 🔒 for transitions the current role can't execute
- [x] Collections landing page filters to collections with at least 1 visible child

### Views
- [x] Dashboard (KPIs + workflow status + top collections + owners + recent activity + vendor comparison for DDLNY)
- [x] Board (Kanban, 7 main lanes + 2 side lanes)
- [x] Gallery (visual grid, first 120 items)
- [x] List (table, first 200 items)
- [x] Collections landing + detail
- [x] Reports (funnel + coming-soon ideas)
- [x] Timeline (simplified list-style)

---

## 🟡 Decisions pending (block UI/UX design — ask Aaryan before building)

### 1. DDLNY-only fields on Styles
Which fields exist that vendors must never see? And should they live on the Style itself (using field-level permissions) or on a linked DDLNY-only companion issue?
- [ ] Target landed cost (USD)
- [ ] Internal margin (%)
- [ ] Customer retail price (USD)
- [ ] Vendor performance score
- [ ] Internal notes on vendor reliability
- [ ] Other?

**Recommendation:** linked companion issue (one extra click, but cleaner security boundary — native Jira makes accidentally exposing a field easier than accidentally exposing an issue).

### 2. Repair phase mechanics
- [ ] Does the Style go back to the original vendor, or stay in-house at DDLNY for repair?
- [ ] Can a Style loop through Repair multiple times (second repair, third repair)?
- [ ] What auto-creates when a Style enters Repair? (e.g. sub-task "Document issue", "Decide: vendor or in-house")
- [ ] Does Repair have sub-states (Waiting Shipment / In Repair / Repair QA / Repaired)?

### 3. Received & Approved split
- [ ] Keep as one phase?
- [ ] Or split into "Received" (sample at DDLNY, unreviewed) + "Approved" (DDLNY signed off)?
- [ ] If split: who advances Received → Approved? DDLNY only, or anyone?

### 4. Final phase list — confirm once
User's note from this session: "phases will be added/deleted/changed. i will confirm the final phases."
- [ ] Current: `Concept/R&D · Design · CAD · PO · Sample Production · Received & Approved · Repair · Hold · Cancelled`
- [ ] Missing anything?
- [ ] Rename anything?

### 5. Pricing module (handwritten note #7 — "pricing module → AI")
- [ ] What inputs feed pricing? (metal weight, stone carat, clarity, making charges, vendor markup)
- [ ] Who can see pricing? (DDLNY only, or shared with vendor?)
- [ ] AI suggests a price, validates a price, or both?
- [ ] Where does it live — Style drawer, Collection level, a separate Pricing view?

### 6. CAD visualization (handwritten note #8)
- [ ] Current: CAD shown as flat PNG
- [ ] Upgrade to interactive 3D viewer (glTF/STL)?
- [ ] Or richer 2D (multi-angle gallery with zoom)?

### 7. Customer modules (handwritten note #12 — "customer modules (JCP, Sam's, etc.)")
- [ ] Customers (JCP, Sam's, Macy's) as user groups with their own views?
- [ ] Or just a `Customer` field on Collections?
- [ ] Do customers ever log into Jira, or is this internal-only tagging?

### 8. Jewelry metadata (handwritten notes #13, #14, #16)
User's exact note: "details about collection, style. # of pieces, etc. diamond clarity, metals, etc."
Candidate fields:
- [ ] Metal type (14K YG / 14K WG / 10K / 18K / Silver / Platinum)
- [ ] Metal weight (g)
- [ ] Diamond count
- [ ] Total diamond weight (ct)
- [ ] Diamond clarity (VVS / VS / SI / I)
- [ ] Diamond color (D-G / H-J / K-M)
- [ ] Setting type (prong / bezel / channel / pavé)
- [ ] Number of pieces (1 for single / 2 for set / 3 for parure)
- [ ] Stone sizes (mm)
- [ ] Which are required at Style creation?
- [ ] Per-Style or per-Collection?

---

## 🔵 Concepts discussed but not yet in the mockup

### Dashboards
- [ ] Executive dashboard for DDLNY leadership — hit rate by category, spend by vendor, cycle time trends
- [ ] Per-owner dashboard (my styles + my sub-tasks + my blockers)
- [ ] Vendor self-dashboard (DNJ sees their own cycle times + SLA performance)

### Reports that earn their keep
- [ ] Cycle time by phase, per vendor (how long does DNJ sit in CAD vs Elegant?)
- [ ] Vendor SLA — % of sub-tasks completed by due date
- [ ] Rework histogram — distribution of sketch/CAD change counts
- [ ] Category profitability — once PO $ is tagged
- [ ] Repair rate — % of Received items that end up in Repair

### Collaboration / comms
- [ ] Notifications (email / in-app / Slack on phase changes, sub-task assignment, overdue)
- [ ] @-mentions in comments that notify the mentioned user
- [ ] Watcher system (follow a style without being assigned)

### Scale / production
- [ ] Bulk actions (select 10 styles → bulk transition / bulk reassign)
- [ ] Saved filters ("my team's styles in CAD > 14 days")
- [ ] Mobile-responsive view — vendors in Indian factories are often on phones
- [ ] Search-by-image (upload a photo, find similar styles in the archive)
- [ ] Side-by-side style comparison (Twinkling v1 vs v2)

### Customer-facing (handwritten note #12)
- [ ] Customer proof pages — shareable read-only links DDLNY can send to JCP/Sam's for sign-off without giving them Jira seats
- [ ] PDF line-sheet export per Collection

---

## ⚪ Nice-to-haves (mentioned in notes, lower priority)

- [ ] Assets live inside each Style (note #6) — largely built via Attachments tab
- [ ] Commentary for everything (note #9) — built via Comments tab + Activity log
- [ ] Report generation (note #11) — basic Reports view exists, needs depth
- [ ] Advanced filter/search (note #15) — have chips + search; needs saved filters
- [ ] Multi-vendor per Collection (note #10) — supported; cross-vendor UX in place

---

## 🔜 NOT mockup — separate track for when we build the real thing

- [ ] Jira project provisioning via REST API (DNJ + Elegant projects)
- [ ] Custom field creation via API
- [ ] Workflow config via API (Transitions with conditions per role)
- [ ] Issue security scheme config via API
- [ ] Groups: `ddlny-pd`, `vendor-dnj`, `vendor-elegant`
- [ ] Automation rules: auto-security-by-vendor, auto-sub-task-on-phase-entry, notify-on-assignment, escalate-overdue
- [ ] Bulk import of 647 existing styles with images preserved
- [ ] Storage strategy (Free tier is 2 GB; 674 images might fit but barely — consider offloading to S3/R2)
- [ ] Pricing & plan decision (Free ≤10 users, Standard ~$8/user, Premium ~$17/user; likely 25-50 users for DDLNY)
- [ ] Playwright fallback for any UI-only Jira config the REST API doesn't expose
