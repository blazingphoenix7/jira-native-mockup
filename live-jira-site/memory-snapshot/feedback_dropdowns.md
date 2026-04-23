---
name: Dropdown conventions
description: All dropdown / select-list options must be sorted alphabetically and use correct spellings.
type: feedback
originSessionId: 6086ed8f-d35b-4268-b09a-4bd815636b38
---
All dropdown and select-list options (custom fields, config dropdowns, etc.) must be **sorted alphabetically** and use **correct spellings**.

**Why:** User explicitly stated this rule on 2026-04-21 while reviewing the Category field. The previous list had typos in the user's instructions ("broch", "earing") but user emphasized "use correct spellings ALWAYS". User also wants alphabetical consistency across every dropdown.

**How to apply:**
- When creating any new select / multi-select / dropdown field, sort options alphabetically before writing.
- When adding options to an existing dropdown, insert in the correct alphabetical position (may require reordering in Jira).
- Before adding any option, verify the spelling is correct (even if user's input is misspelled, correct it silently).
- Numeric options (like `10K, 14K, 18K, 22K, 24K`) sort lexicographically the same as numerically, so that's fine.
- For mixed alphanumeric, check that lex sort matches intended order.
