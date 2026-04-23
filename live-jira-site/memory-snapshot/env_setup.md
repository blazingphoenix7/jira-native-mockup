---
name: Conda env layout
description: Where Python + tooling live for this project
type: project
originSessionId: 909c7cf1-348c-40c0-be3d-d9d0c2e1290a
---
All Python tooling for this project lives in a dedicated conda env — **nothing is installed globally**.

- Miniconda: `C:\Users\AaryanMehta\miniconda3` (installed fresh via winget Apr 2026)
- Env name: `jira-dashboard` · Python 3.12.13
- Channel policy: `conda-forge` ONLY with `--override-channels` (avoid Anaconda defaults' ToS/commercial-licensing friction for DDLNY).
- Installed: openpyxl, pandas, pillow (conda-forge); playwright 1.58.0 + python-dotenv + requests (pip; conda-forge didn't ship playwright).
- Playwright Chromium browser 1208 is at `C:\Users\AaryanMehta\AppData\Local\ms-playwright\`.

**Why:** Keeps the project hermetic — Aaryan can wipe the env without touching system Python; conda-forge avoids Anaconda ToS for his employer.
**How to apply:** Any new Python package goes in this env only. Install via `conda install -n jira-dashboard -c conda-forge --override-channels <pkg> -y`, or pip fallback `conda run -n jira-dashboard pip install <pkg>`.
