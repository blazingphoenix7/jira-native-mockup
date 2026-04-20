"""Normalize items.json into a mockup-friendly dataset and copy images."""
import json, re, shutil
from pathlib import Path
from collections import Counter

SRC = Path(r'C:/Users/AaryanMehta/Downloads/jira/derived/items.json')
IMG_SRC = Path(r'C:/Users/AaryanMehta/Downloads/jira/derived/images')
OUT_DIR = Path(r'C:/Users/AaryanMehta/Downloads/jira/mockup')
OUT_IMG = OUT_DIR / 'images'
OUT_IMG.mkdir(parents=True, exist_ok=True)

STATUS_MAP = {
    'Z Shipped Sample':    'Sample Shipped',
    'Z Sample in process': 'Sample In Process',
    'Z Cancelled':         'Cancelled',
    'Z Hold':              'Hold',
    'Z hold':              'Hold',
    'Design WIP':          'Design WIP',
    'Design WIP ':         'Design WIP',
    'CAD WIP':             'CAD WIP',
    'Po not received':     'PO Pending',
    'Po not received ':    'PO Pending',
    'Po to share':         'PO To Share',
    'Bom to share':        'BOM To Share',
    'Awaiting Feedback':   'Awaiting Feedback',
    'Awaiting Feedback ':  'Awaiting Feedback',
    'R&D':                 'R&D',
    'Proforma':            'Proforma',
    'Done':                'Done',
    'Insights':            'Insights',
}

# Ordered workflow for columns
WORKFLOW = [
    'R&D', 'Design WIP', 'Awaiting Feedback', 'BOM To Share', 'CAD WIP',
    'PO Pending', 'PO To Share', 'Sample In Process', 'Sample Shipped',
    'Proforma', 'Done', 'Hold', 'Cancelled', 'Insights',
]

PEOPLE = {
    'BB':  {'name': 'Baiju B.',  'color': '#7B61FF', 'initials': 'BB'},
    'VW':  {'name': 'Vincy W.',  'color': '#FF5C93', 'initials': 'VW'},
    'JW':  {'name': 'Joe W.',    'color': '#00B8A9', 'initials': 'JW'},
    'Avi': {'name': 'Avi S.',    'color': '#F8A825', 'initials': 'AV'},
}

def norm_status(s):
    return STATUS_MAP.get((s or '').strip(), (s or '').strip() or 'Backlog')

def norm_owner(code):
    """Normalize dirty cell values like 'VW\\nJW', 'JW ', 'BB' to a canonical initials set."""
    if not code:
        return None
    raw = re.split(r'[\n\r/]', str(code))
    out = []
    for part in raw:
        p = part.strip()
        for k in ('BB','VW','JW','Avi'):
            if p == k or p.lower() == k.lower():
                if k not in out: out.append(k)
    if not out and code.strip() in ('VW','BB','JW','Avi'):
        out = [code.strip()]
    return out[0] if out else (code.strip() if len(code.strip()) <= 4 else None)

def parse_comments(raw):
    """Split the dated comment log into individual entries.
    Format observed: '30/10 - text ...\n17/03 (BB) - text ...'"""
    if not raw:
        return []
    entries = []
    # Split on newline then regroup where a line starts with dd/mm
    lines = raw.split('\n')
    cur = None
    dt_re = re.compile(r'^(\d{1,2}/\d{1,2}(?:/\d{2,4})?)\s*(?:\(([^)]+)\))?\s*[-:]?\s*(.*)$')
    for line in lines:
        m = dt_re.match(line.strip())
        if m:
            if cur: entries.append(cur)
            cur = {'date': m.group(1), 'author': (m.group(2) or '').strip() or None, 'body': m.group(3)}
        else:
            if cur:
                cur['body'] = (cur['body'] + ' ' + line).strip()
            else:
                cur = {'date': None, 'author': None, 'body': line}
    if cur: entries.append(cur)
    return entries

def parse_milestones(raw):
    if not raw: return []
    out = []
    for line in raw.split('\n'):
        line = line.strip()
        if not line: continue
        m = re.match(r'(.+?)(?:\s+|-)(\d{1,2}/\d{1,2}(?:/\d{2,4})?)\s*$', line)
        if m:
            out.append({'event': m.group(1).strip(), 'date': m.group(2)})
        else:
            out.append({'event': line, 'date': None})
    return out

raw = json.loads(SRC.read_text())
items = []
for it in raw:
    style = it.get('style_no', '').split('\n')[0].strip()
    po = ''
    if '\n' in it.get('style_no',''):
        po = it.get('style_no','').split('\n',1)[1].strip()
    # Assign synthetic ticket key
    key = f"DNJ-{it['row'] - 18:03d}"
    owner = norm_owner(it.get('project_code'))
    status = norm_status(it.get('status'))
    item = {
        'key': key,
        'vendor': 'DNJ',
        'style_no': style,
        'po_no': po,
        'start_date': it.get('start_date','')[:10] if it.get('start_date') else None,
        'category': (it.get('category') or '').strip(),
        'source': (it.get('project') or '').strip(),
        'owner': owner,
        'status': status,
        'status_date': it.get('status_update_date','')[:10] if it.get('status_update_date') else None,
        'no_of_sketch': it.get('no_of_sketch'),
        'sketch_changes': it.get('sketch_changes'),
        'cad_changes': it.get('cad_changes'),
        'diamond_quality': it.get('diamond_quality'),
        'is_1kt': it.get('1kt') is not None,
        'priority': (it.get('priority') or '').strip() or None,
        'comments': parse_comments(it.get('comments','')),
        'apr13_comments': (it.get('apr13_ddlny_comments') or '').strip(),
        'milestones': parse_milestones(it.get('milestone_log','')),
        'images': [],
    }
    # Copy first image to mockup images folder, rename keyed to ticket
    for i, src_fname in enumerate(it.get('images', [])):
        src = IMG_SRC / src_fname
        if src.exists():
            dst = OUT_IMG / f"{key}_{i}.png"
            if not dst.exists():
                shutil.copyfile(src, dst)
            item['images'].append(dst.name)
    items.append(item)

# Global aggregates for dashboard
status_counts = Counter(i['status'] for i in items)
owner_counts  = Counter(i['owner'] for i in items if i['owner'])
cat_counts    = Counter(i['category'] for i in items if i['category'])
priority_counts = Counter(i['priority'] for i in items if i['priority'])

# Overdue: item stuck in active status > 30 days since status_date
import datetime as dt
TODAY = dt.date(2026, 4, 13)
ACTIVE = {'Design WIP','Awaiting Feedback','CAD WIP','PO Pending','PO To Share','BOM To Share','Sample In Process','R&D'}
for it in items:
    it['age_days'] = None
    it['overdue'] = False
    if it['status_date']:
        try:
            d = dt.date.fromisoformat(it['status_date'])
            it['age_days'] = (TODAY - d).days
            it['overdue'] = it['status'] in ACTIVE and it['age_days'] > 30
        except Exception:
            pass

overdue = sum(1 for i in items if i['overdue'])
shipped = status_counts.get('Sample Shipped', 0)
cancelled = status_counts.get('Cancelled', 0)
active = sum(status_counts[s] for s in ACTIVE if s in status_counts)

data = {
    'items': items,
    'workflow': WORKFLOW,
    'people': PEOPLE,
    'today': TODAY.isoformat(),
    'kpis': {
        'total': len(items),
        'active': active,
        'shipped': shipped,
        'cancelled': cancelled,
        'overdue': overdue,
        'vendors': {'DNJ': len(items), 'Elegant': 0},
    },
    'status_counts': dict(status_counts),
    'owner_counts': dict(owner_counts),
    'priority_counts': dict(priority_counts),
    'top_categories': cat_counts.most_common(20),
}
(OUT_DIR / 'data.json').write_text(json.dumps(data, indent=2, default=str))
print(f"Wrote mockup/data.json with {len(items)} items; copied images to {OUT_IMG}")
print(f"Active (in-flight): {active} · Shipped: {shipped} · Cancelled: {cancelled} · Overdue: {overdue}")
