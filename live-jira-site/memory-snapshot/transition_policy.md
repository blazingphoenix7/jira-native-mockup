---
name: Transition policy — DDLNY-only, vendors never move phases
description: Every Style phase transition is gated to the ddlny-pd group; vendors cannot transition at all, under any circumstance
type: feedback
originSessionId: 2ee8411f-7020-4265-ac30-9fcfd6002802
---
**Rule.** Every Style-level workflow transition in the real Jira instance gets a Condition of `User In Group: ddlny-pd`. No exceptions — not forward moves (Design → CAD), not backward (CAD → Design), not sideways (→ Hold), not terminal (→ Cancelled), not repair (Sample Production → Repair, Received & Approved → Repair). Vendors have zero authority to change a Style's phase.

**Why.** Aaryan's explicit call on 2026-04-20: *"simply put — vendor is just not allowed to move phases AT ALL"*. DDLNY owns the product-development pipeline end to end; vendors execute against it but don't drive it. Letting vendors transition phases — even seemingly-helpful ones like "flag this sample as needing repair" — creates audit-trail ambiguity and lets a vendor pre-empt DDLNY's QA judgment before a DDLNY person has reviewed.

**How to apply.**
- When provisioning the real Jira workflow via the REST API, every transition's `conditions` array must include the group-membership condition for `ddlny-pd`. Scripts that auto-build the workflow should NOT accept a `"any"` or `"vendor"` option for Style transitions.
- Vendor interactions with a Style are limited to: adding comments, uploading attachments, reassigning or completing their own assigned sub-tasks, and viewing. Nothing touches the Status field.
- `mockup-native/assets/app.js` enforces this in `canTransition()` by returning `true` only when `ROLE === 'ddlny'` — the `allowedRoles` array from `data.json` is deliberately ignored so the demo matches the production policy regardless of what the legacy data shape says.
- If a future conversation suggests granting a vendor any transition permission, push back and cite this policy before implementing.
