---
name: DDLNY Jira dashboard project
description: Company structure, vendor isolation requirement, real workflow extracted from DNJ report
type: project
originSessionId: 909c7cf1-348c-40c0-be3d-d9d0c2e1290a
---
**DDLNY** (NYC, wholesale jewelry) → works with vendors **DNJ** and **Elegant** in India. Vendors make the physical jewelry; DDLNY's Product Development team drives design.

**Critical isolation requirement:** DNJ must NOT see any Elegant work and vice versa. DDLNY staff see everything. Enforced via Jira Issue Security Scheme (not CSS).

**Why:** DDLNY owns the design IP; exposing one vendor's in-flight CADs/BOMs/POs to the other would leak sourcing strategy and unit-economics.
**How to apply:** Every issue gets a Security Level of `vendor-dnj` OR `vendor-elegant` OR `ddlny-only`. Only `ddlny-pd` group bypasses the filter.

**Real workflow from DNJ weekly report (April 2026):**
Concept (moodboard/ref URL) → Design WIP (sketch) → Awaiting Feedback → BOM to share → CAD WIP → PO Pending / PO to Share → Sample In Process → Sample Shipped → Done | Cancelled | Hold | R&D (parallel).

**Real data stats (from DNJ's April 13 MOM report):**
647 in-flight styles · 113 unique categories · 674 CAD images · 4 DDLNY owners (BB=Baiju, VW=Vincy, JW=Joe, Avi). 188 shipped · 126 cancelled · 83 Design WIP · 51 CAD WIP. Comments are a dated chronological log per style; milestone dates (BOM sent, CAD shown, etc.) are a separate log.

**Customer name in the DNJ report:** "Baiju B." (DDLNY) from company "I5DIA" — context for who Aaryan collaborates with.
