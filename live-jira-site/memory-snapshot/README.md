# Memory snapshot — portable project preferences

These files are a **snapshot** of the Claude Code auto-memory store as of 2026-04-22,
copied from `~/.claude/projects/C--Users-AaryanMehta-Downloads-jira/memory/` on the
Windows build machine.

**Why they're here:** Claude Code's memory store is keyed to a project *path*, so
the memory on the Windows machine (`C--Users-AaryanMehta-...`) will not auto-load on
any other machine (different path = different project fingerprint).

These copies make the memory content readable as regular files on any clone.

## For the fix-round Claude session on macOS

Read the following files **at session start**, treat them as authoritative preferences:

- `MEMORY.md` — index
- `user_role.md`, `project_context.md` — who the user is, what they're building
- `project_names.md`, `scope_current.md` — naming and scope
- `subtasks_and_create_dialog.md` — create flow expectations *(partly stale; see BUILDER CONTEXT in audit findings)*
- `fidelity_approach.md` — how to approach changes
- `transition_policy.md` — DDLNY-only phase transitions, vendors never move Styles
- `feedback_dropdowns.md` — alphabetical + correct spelling on every dropdown (silently correct user typos)
- `show_reasoning.md` — put reasoning in visible response (CLI doesn't render hidden thinking)
- `env_setup.md`, `run_scripts.md` — Windows-specific environment notes; **adapt to macOS equivalents**
- `jira_automation_plan.md` — original plan; audit/findings.md and README.md have the current state
- `mockup_approach.md` — background on the HTML mockup source data

## Stale-memory warnings

Some memory files reference decisions that have since been revised. Trust the `audit/findings.md`
[BUILDER CONTEXT] annotations and `README.md` over these memory files where they conflict.
Specifically:

- `subtasks_and_create_dialog.md` mentions 3 create-dialog flows (Style/Collection/Sub-task). This is stale — Sub-task was renamed to Task, Collection is a field not an issue type.
- `env_setup.md`, `run_scripts.md` are Windows-specific; adapt to macOS.

## Writing new memory on macOS

Claude Code on macOS will build its own memory store at
`~/.claude/projects/Users-aaryan-<...>/memory/`. That's fine — just don't rely on the
Windows-side entries porting over. If you need a preference to persist, either add it
to the project (this folder) or let the new session build its own memory naturally.
