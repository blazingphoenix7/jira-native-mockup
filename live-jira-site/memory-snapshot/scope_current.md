---
name: Current scope — DNJ only, Elegant deferred
description: As of 2026-04-22 the user is designing the Jira space for DNJ vendor only; Elegant is deferred (not deleted from the long-term plan, just out of scope for now).
type: project
originSessionId: d8fd2e06-5263-4948-bbde-42cc949f1205
---
Scope as of 2026-04-22: design the Jira DDLNY-PD space for DNJ vendor only. Elegant is parked for later.

**Why:** User said "we are ONLY designing it for DNJ for now. forget elegant." mid-audit. They were surprised that a prior Claude Code chat had slipped in a group-based permission scheme that would leak across vendors — that's what prompted the scope narrowing (deal with one vendor well, then expand).

**How to apply:**
- Don't flag "Elegant project missing" as a BLOCKER anymore — it's a NOTE for future.
- DO still flag any architectural choice that will *misbehave* when Elegant is eventually added (e.g., permission schemes that reference groups directly rather than Project Roles — those WILL break cross-vendor isolation when Elegant arrives, so fix the pattern now even though the second vendor doesn't exist yet).
- Tasks-in-DNJ semantics (clarified same day): Style = the jewelry item; Task = a DDLNY-authored request to DNJ ("design a BOM", "develop the CAD", etc.). DDLNY creates Tasks as linked work on a Style.

**Personas (confirmed 2026-04-22):**
- DDLNY-NYC admin: `aaryan@ddlny.com` (Aaryan Mehta; accountId `712020:2dbb4cab-a68e-4cd8-93fd-d104a229a87f`). Member of group `ddlny-nyc`.
- DNJ vendor test user: `cambridgeeaaryan405@gmail.com` (display "Aary Test"; accountId `712020:0f6ce624-2d71-4938-a1fd-54e3e64a76dd`). Member of group `dnj-vendor`. Use this account for any isolation / vendor-UI verification.
- Q1 decision: vendors should not be able to create anything in DNJ (Create Issues perm should be removed from dnj-vendor).
- Q2 decision (intentional): vendors cannot Edit Issues — they interact only via comments and attachments.
