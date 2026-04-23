---
name: How to run Python in this project
description: Don't call the env's python.exe directly on Windows
type: feedback
originSessionId: 909c7cf1-348c-40c0-be3d-d9d0c2e1290a
---
**Never call `C:/Users/AaryanMehta/miniconda3/envs/jira-dashboard/python.exe` directly** — DLL loading fails (e.g., pandas/openpyxl import crashes with exit 127 and no error).

Always route through `conda run` so the env's Library DLLs are on PATH:

```bash
'C:/Users/AaryanMehta/miniconda3/Scripts/conda.exe' run --no-capture-output -n jira-dashboard python <script>
```

**Why:** On Windows, conda envs require activation-time PATH setup for native extensions. Direct python.exe invocation skips that. Hit this the first time, confirmed via diagnostic script.
**How to apply:** Use `./scripts/run.sh <script.py>` (already written) or the full `conda run` invocation above. Same rule for playwright CLI: use `python -m playwright install chromium`, not the CLI binary — the conda-forge CLI is a different version than the pip-installed library.
