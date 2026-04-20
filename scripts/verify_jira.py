"""Verify the Jira API token works and report what the user is allowed to do."""
import os, sys, json
from pathlib import Path
from dotenv import load_dotenv
import requests
from requests.auth import HTTPBasicAuth

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')

SITE  = os.environ.get('JIRA_SITE', '').strip().rstrip('/')
EMAIL = os.environ.get('JIRA_EMAIL', '').strip()
TOKEN = os.environ.get('JIRA_TOKEN', '').strip()

if not (SITE and EMAIL and TOKEN):
    print('Missing JIRA_SITE / JIRA_EMAIL / JIRA_TOKEN in .env')
    sys.exit(1)

if SITE.startswith('http'):
    SITE = SITE.split('://', 1)[1]

BASE = f'https://{SITE}'
auth = HTTPBasicAuth(EMAIL, TOKEN)
H = {'Accept': 'application/json'}


def call(method, path, **kw):
    url = BASE + path
    r = requests.request(method, url, auth=auth, headers=H, timeout=20, **kw)
    return r

def pretty(tag, r):
    ct = r.headers.get('content-type', '')
    if 'json' in ct:
        try: body = r.json()
        except Exception: body = r.text[:200]
    else:
        body = r.text[:200]
    print(f'[{tag}] {r.status_code} · {method_url(r)}')
    return body

def method_url(r):
    return f'{r.request.method} {r.request.url.replace(BASE,"")}'

print(f'Site: {BASE}')
print(f'User: {EMAIL}')
print('---')

# 1. /myself — auth check
r = call('GET', '/rest/api/3/myself')
me = pretty('myself', r)
if r.status_code != 200:
    print('❌ Auth failed. Check email + token.')
    print(json.dumps(me, indent=2, default=str)[:400])
    sys.exit(2)
print(f'   ✓ Authenticated as: {me.get("displayName")}  (accountId {me.get("accountId")})')

# 2. Global permissions — check ADMINISTER (site admin)
r = call('GET', '/rest/api/3/mypermissions', params={
    'permissions': 'ADMINISTER,CREATE_PROJECT,SYSTEM_ADMIN,MANAGE_GROUP_FILTER_SUBSCRIPTIONS'})
perms = pretty('permissions', r)
if r.status_code == 200:
    for pkey in ('ADMINISTER','SYSTEM_ADMIN','CREATE_PROJECT'):
        p = perms.get('permissions', {}).get(pkey, {})
        ok = p.get('havePermission')
        print(f'   {"✓" if ok else "✗"} {pkey}: {ok}  ({p.get("description","")[:60]})')
else:
    print(perms)

# 3. Existing projects
r = call('GET', '/rest/api/3/project/search', params={'maxResults': 50})
proj = pretty('projects', r)
if r.status_code == 200:
    ps = proj.get('values', [])
    print(f'   {len(ps)} project(s) currently on the site:')
    for p in ps[:20]:
        print(f'     - {p["key"]:10s} · {p["name"]}  ({p.get("projectTypeKey")})')
    if proj.get('total', 0) > len(ps):
        print(f'     … +{proj["total"] - len(ps)} more')

# 4. Issue types available
r = call('GET', '/rest/api/3/issuetype')
it = pretty('issuetypes', r)
if r.status_code == 200:
    names = sorted({x['name'] for x in it})
    print(f'   Global issue types: {", ".join(names)}')

# 5. Accessible Confluence? (optional, just a probe)
r = call('GET', '/wiki/rest/api/space', params={'limit': 5})
print(f'[confluence] {r.status_code}' + (' (not installed / no access — OK)' if r.status_code in (401, 404) else ''))

print('\n=== Summary ===')
print(f'Site-admin (ADMINISTER): {perms.get("permissions",{}).get("ADMINISTER",{}).get("havePermission")}')
print(f'Can create projects:     {perms.get("permissions",{}).get("CREATE_PROJECT",{}).get("havePermission")}')
