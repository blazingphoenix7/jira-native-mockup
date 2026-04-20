#!/usr/bin/env bash
# Thin wrapper: always run python inside the `jira-dashboard` conda env.
# Usage: ./scripts/run.sh scripts/foo.py [args...]
exec 'C:/Users/AaryanMehta/miniconda3/Scripts/conda.exe' run --no-capture-output -n jira-dashboard python "$@"
