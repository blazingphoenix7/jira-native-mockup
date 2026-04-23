---
name: Sub-tasks in scope; Create dialog needs 3 flows
description: Decisions confirmed 2026-04-16 on sub-task inclusion and Create dialog scope
type: project
originSessionId: ce6c21af-8f83-4945-9208-8fb9e7ba366d
---
Two decisions locked in by Aaryan on 2026-04-16 after the pizza-analogy explanation of Style / Phase / Sub-task:

**1. Sub-tasks are in scope from day one.** When Aaryan says "task" in conversation he means sub-task. Go full structured — sub-tasks with their own assignee + due date underneath each Style issue. (He chose option "C" — sub-tasks from day one, not "keep it simple / add later".)

**2. Create dialog must cover all three flows distinctly:** Style creation, Collection creation, Sub-task creation — each with its own field set. (He chose option "B" — full range, not just Style creation.)

**Why:** DDLNY colleagues want granular per-person to-dos with due dates, not just chronological comments. The DNJ Excel's comments column shows they already think in terms of per-person to-dos; formalizing as sub-tasks gives them audit trails + due-date enforcement.

**How to apply:**
- When building the Create dialog in the mockup, implement three distinct form shapes (Style = full custom-field set; Collection = multi-vendor assignment UI, no Style #/PO #/Category; Sub-task = Parent Style + Summary + Assignee + Due date only)
- When provisioning real Jira, include `Sub-task` as a standard issue type on both DNJ and Elegant projects
- When explaining workflow to Aaryan, use the pizza analogy (Style = order, Phase = station, Sub-task = to-do item)
- Sub-task assignee-reassignment permission: currently unconfirmed — ask before provisioning (loose vs reporter-only vs admin-only); default to loose unless he specifies
