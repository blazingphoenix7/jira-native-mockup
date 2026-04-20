# Environment

Python + libs live inside conda env `jira-dashboard` (nothing installed globally).

- Miniconda: `C:\Users\AaryanMehta\miniconda3`
- Env: `C:\Users\AaryanMehta\miniconda3\envs\jira-dashboard`
- Python 3.12.13 · openpyxl 3.1.5 · pandas 3.0.2 · pillow 12.2.0
- Channel: conda-forge only (no ToS/licensing concerns for DDLNY)

## Run a script

```bash
./scripts/run.sh scripts/foo.py
```

Under the hood: `conda run --no-capture-output -n jira-dashboard python <args>`.

## Add a package

```bash
'C:/Users/AaryanMehta/miniconda3/Scripts/conda.exe' install -n jira-dashboard -c conda-forge --override-channels <pkg> -y
```
