# Fix instructions — paste this into a new Claude Code chat

> This file is the hand-off prompt for starting a new Claude Code session to apply the audit fixes.
> Generated 2026-04-22 by the build session.
> New chat will have browser control via the Claude Chrome extension installed on Brave.

## 0. One-time Mac setup (before first Claude chat)

If you're on a fresh machine (macOS / different PC), do these once:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/blazingphoenix7/jira-native-mockup.git
   cd jira-native-mockup
   ```

2. **Create `.env`** at the repo root with (get JIRA_TOKEN from your existing Windows `.env` or regenerate at `https://id.atlassian.com/manage-profile/security/api-tokens`):
   ```
   JIRA_SITE=ddlny-pd.atlassian.net
   JIRA_EMAIL=aaryan@ddlny.com
   JIRA_TOKEN=<your API token>
   ```

3. **Set up the two browsers on this machine:**
   - **Brave** → log into `aaryan@ddlny.com` (admin). Install Claude for Chrome extension.
   - **Chrome** → log into `cambridgeaaryan405@gmail.com` (aary-test / dnj-vendor). Install Claude for Chrome extension.
   - Confirm avatars: "AM" on Brave, "AT" on Chrome.

4. **Open Claude Code** in this repo directory (macOS Claude app → Code menu → open folder). Then paste the prompt from this file and tell Claude: *"follow `live-jira-site/audit/fix-instructions.md`"*.

All file paths below are **repo-relative**. No absolute Windows/Mac paths.

---

I have a Jira Cloud site (ddlny-pd.atlassian.net) that's been audited. You need to fix it.
You have browser control via the Claude Chrome extension in addition to normal API access.
Use the right tool for each fix — some things are API-friendly, others are UI-only.

## READ FIRST (in this order):
1. `live-jira-site/audit/findings.md` — 30+ findings, severity-ranked.
   Pay special attention to `[BUILDER CONTEXT]` annotations — those override original audit text.
2. `live-jira-site/README.md` — build log; every config decision documented with user-reasoning.
3. `live-jira-site/memory-snapshot/MEMORY.md` plus the files it links — project-level preferences
   snapshotted from the Windows build machine. Read the `live-jira-site/memory-snapshot/README.md`
   FIRST for caveats about stale entries.
4. `live-jira-site/state/*.json` — current Jira state snapshots. USE these for IDs (project 10068,
   scheme 10102, workflow c033275e-560c-4ec2-a24c-6c157af7d0a5, etc.).

## Credentials
`.env` at the repo root. Keys: `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_TOKEN`. Basic Auth on REST
calls. Base URL: `https://${JIRA_SITE}/rest/api/3/`. If `.env` is missing, stop and ask
the user to create it per step 0.2 above.

## Browser control (Claude Chrome extension)
User has **two browsers open, each logged in as a different persona** — this is a deliberate
testing setup so you can fix something as admin and immediately verify the vendor experience.

| Browser | Logged in as | Persona / permission | Use for |
|---|---|---|---|
| **Brave** | `aaryan@ddlny.com` | admin / `ddlny-nyc` group (full NYC rights) | ALL fix/config actions — admin console, project settings, permission schemes, workflow edits, Rovo admin, notification schemes, screens, etc. |
| **Chrome** | `cambridgeaaryan405@gmail.com` (aka `aary-test`) | `dnj-vendor` group (vendor rights) | VERIFY the vendor-side result after a fix — confirm sensitive fields are hidden, Create is disabled, Rovo responds with "access denied", etc. |

**Workflow for every UI fix:**
1. Open / focus **Brave** → navigate → apply the fix as admin.
2. Switch to **Chrome** (aary-test) → refresh → verify the vendor now sees the expected restricted state.
3. Screenshot both states if the finding is security-related (Tier 1 BLOCKERs).
4. Note the verification result in the `[FIXED]` bullet on the finding.

**Persona confusion safeguards:**
- Before clicking anything admin-sensitive, confirm you're on Brave by checking the avatar / profile initials (AM for Aaryan Mehta).
- On Chrome, avatar should be "AT" (Aary Test). If you see AT in Brave or AM in Chrome, STOP and ask the user to re-verify before continuing.
- Do NOT attempt admin actions in Chrome — aary-test doesn't have permission, so you'll get permission errors and waste time.

**API vs browser — decision rule:**
- **Prefer API** — faster, more reliable, traceable via git diff on `state/*.json`, safer to retry.
- **Use browser ONLY when API is insufficient.** Specifically:
  - Jira Automation rules creation / editing (legacy API is painful)
  - Issue Layout ordering and field-level hiding per issue type / role
  - Global Permissions (Administer Jira, Create Projects) — admin console UI
  - Rovo administration (enable/disable per group)
  - Notification scheme attachment to project
  - Confluence space deletion
  - Board settings (cover image toggle, Done filter, swimlanes)
  - Screen field add/remove when the API path hits known v2 bugs
  - Workflow property edits on specific transitions when `POST /workflows/update` errors
    about status mappings (known Cloud API bug)

**Browser rules of engagement:**
1. Confirm with user before any destructive UI click (delete, bulk-remove, "permanently delete").
2. After each UI-driven fix, VERIFY via API read (e.g., re-fetch the scheme / field / issue)
   and update the matching `state/*.json`. UI actions aren't captured in state unless you
   record them.
3. Screenshot the before + after of each UI fix for the audit trail.
4. Persona mapping is fixed per browser (see table above): Brave = admin, Chrome = vendor.
   Admin actions ALWAYS go on Brave; vendor verification ALWAYS goes on Chrome. If either
   browser is logged out or on the wrong account, ASK the user to re-log before proceeding.

## CRITICAL rules of engagement:

1. **Respect `[BUILDER CONTEXT]` annotations.** Any finding with a "[BUILDER CONTEXT —
   reclassify to CORRECT-BY-DESIGN]" note is NOT a bug. The user explicitly chose the
   behavior. DO NOT "fix" it. Applies to (at minimum):
   - MAJOR-001 (Task is hierarchy 0, Collection is a text field — both intentional)
   - MAJOR-004 (Collection as text, not issue type — intentional)
   - MAJOR-005 (Diamond/Gemstone fields as text — intentional)
   - BLOCKER-007 (all-global transitions, no phase-order graph — intentional "full freedom")

2. **Fix priority order** (severity-first, security-first within tier):
   - **Tier 1 — data-leak BLOCKERs** (do these FIRST, before vendor sees anything):
     - C05 (Rovo AI leaks data to vendor) — Atlassian Admin → Rovo → disable for dnj-vendor (UI)
     - C03 (Target Price / Source / Cloud Files URL visible to vendor) — Issue Layout hide (UI)
     - C06 (vendor full JQL + export — resolved if C03 lands)
     - C02 (vendor self-assign any Style) — remove ASSIGN_ISSUES from scheme (API)
     - C04 (vendor can open Create Space dialog) — Global Permissions audit (UI)
   - **Tier 2 — config BLOCKERs:**
     - 001 (Summary missing from Create screen) — add Summary to DNJ: Minimal Create Screen (API)
     - 009 (dnj-vendor has CREATE_ISSUES — user revised: vendors CAN'T create) — scheme (API)
     - 004/008 (Resolution never set) — workflow post-functions on Done transitions (UI easier)
     - 011 (zero automation rules) — at minimum: Resolution-setter, stale-status alert (UI)
     - 012 (no notification scheme) — attach Default Notification Scheme (UI)
     - 003 (Tasks on Jira default workflow) — design Task workflow OR accept for v1 (ask user)
     - 005 (permissions by group, not role — must be Elegant-ready) — scheme refactor (API)
   - **Tier 3 — MAJORs:**
     - 003 (Labels name collision) — rename custom field to "Style Labels" (API)
     - 008 (Confluence space auto-provisioned for DNJ) — delete space if unused (UI)
     - 010 (workflow conditions by group, not role) — pair with 005 refactor
     - 012 (Style+Task share screen scheme) — split; user has a pending prompt about
       Task-specific Create screen — ASK user for their Task-screen spec first
     - 013 (board has all 13 columns incl Done) — Done filter + Paused swimlane (UI)
     - C08 (Manage Spaces page accessible to vendor)
   - **Tier 4 — MINORs:** 005 (project description), 007 (SKU casing), 001-004 (test data +
     empty fields), 006 (Space/Project label — Atlassian-side), 007 (vendor delete comments).

3. **Dropdown conventions** (from memory): always alphabetical, always correct spellings.
   Silently fix typos.

4. **Test data** (DNJ-1 through DNJ-27) is throwaway. User will bulk-delete before real
   migration. Warn before deleting; otherwise disrupt freely.

5. **After each fix:**
   - Update relevant `state/*.json`.
   - Add `[FIXED YYYY-MM-DD]: <what you did, API or UI, which file/URL touched>` as a new
     bullet to the finding in `audit/findings.md`. NEVER delete findings.
   - Append a "Fixes applied" line to `live-jira-site/README.md` bottom.
   - If UI-driven, include a screenshot path (or inline description of what changed).

6. **Scope:** DNJ project only. Elegant is deferred. BUT architecture refactors
   (BLOCKER-005, MAJOR-010: groups → project roles) MUST happen now so Elegant rollout
   doesn't leak cross-vendor data.

## Execution discipline — JUST WORK, no plan-proposals

1. **Don't ask for approval before each fix.** Work top-down through the priority tiers.
   Tier 1 (data-leak BLOCKERs) first, all of them, then Tier 2 config BLOCKERs, then Tier 3
   MAJORs, then Tier 4 MINORs. Keep going until there's a real blocker or an ambiguity
   you genuinely can't resolve.
2. **Ask the user ONLY if:**
   - The finding itself asks a real design question (e.g., MAJOR-012 says "ask user for
     Task-screen spec" — that one genuinely needs user input).
   - You're about to take a destructive action (delete a field with real data, permanently
     delete the Confluence space) AND the findings.md fix note doesn't already explicitly
     authorize it.
   - You discover something the audit didn't flag but that seems wrong.
   - Two findings conflict and you can't resolve without user direction.
3. **Never touch `[BUILDER CONTEXT]` findings** — these are CORRECT-BY-DESIGN. Skip them.
4. **Verification is mandatory, not optional.** After EVERY fix, do the Brave→Chrome switch
   (for UI fixes) or an API re-fetch (for API fixes). Record the verification result in
   the `[FIXED]` bullet. Don't skip verification even for "obviously working" fixes.
5. **Report cadence:** give the user a one-line status update after each fix completes
   (e.g., "Fixed C05 — Rovo disabled for dnj-vendor, verified: aary-test gets denied on
   Ask Rovo. Moving to C03.") Don't wait for acknowledgment; just keep going.
6. **End-of-tier summary:** after finishing each tier, write a brief recap of what shipped
   + what was skipped and why.

## Start now by:

1. Reading all 4 sources above.
2. Fetching current state: `GET /permissionscheme/10102?expand=permissions` and
   `POST /workflows` with `{"workflowIds":["c033275e-560c-4ec2-a24c-6c157af7d0a5"]}`.
3. Opening Jira on **Brave** — navigate to ddlny-pd.atlassian.net, confirm avatar reads "AM".
   Also confirm **Chrome** is on aary-test (avatar "AT") for vendor verification.
4. **Start fixing Tier 1 immediately.** No plan proposal. Start with C05 (Rovo disable) as
   it has the biggest blast-radius — any active vendor right now can already query internal
   DDLNY data via Rovo.
