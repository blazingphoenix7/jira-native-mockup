"""Enrich mockup/data.json with:
 - synthetic attachments (CAD + BOM + moodboard) stamped with upload-phase + uploader
 - activity log entries synthesized from comments + status changes
 - a couple of real 'cross-vendor collections' where some items are reassigned to Elegant
 - workflow transition matrix (who can execute what)
"""
import json, random, datetime as dt
from pathlib import Path

DATA_PATH = Path(r'C:/Users/AaryanMehta/Downloads/jira/mockup/data.json')
data = json.loads(DATA_PATH.read_text())
random.seed(42)

PEOPLE = data['people']
DDLNY_OWNERS = list(PEOPLE.keys())
VENDOR_USERS = {
    'DNJ': [{'id':'RP','name':'Rajesh P.','color':'#6554C0','initials':'RP'},
            {'id':'AM_DNJ','name':'Ashok M. (DNJ)','color':'#403294','initials':'AM'}],
    'Elegant': [{'id':'PS','name':'Priya S.','color':'#FF5630','initials':'PS'}],
}

# ---- 1. Re-label ~8% of items under popular categories as Elegant so we have
#         real cross-vendor collections to demo
CROSS_VENDOR_CATS = [
    'Twinkling Collection', 'Cross', 'Dainty Studs', 'Link Collection',
    'LGD Bgt Dainty Collection', 'Stackable',
]
elegant_count = 0
for it in data['items']:
    if it['category'] in CROSS_VENDOR_CATS and random.random() < 0.32:
        it['vendor'] = 'Elegant'
        # Rewrite issue key prefix
        n = it['key'].split('-')[1]
        it['key'] = f'ELG-{n}'
        elegant_count += 1

# ---- 2. Synthesize attachments. Each item gets:
#         * 1 moodboard PDF (phase: R&D or Design WIP)
#         * 1 sketch PNG (phase: Design WIP)
#         * 1 CAD image = existing .png (phase: CAD WIP)
#         * 1 BOM xlsx (phase: BOM to Share)
#         * sometimes a sample photo (phase: Sample In Process)
PHASES = ['R&D','Design WIP','Awaiting Feedback','BOM to Share','CAD WIP',
          'PO Pending','PO to Share','Sample In Process','Sample Shipped']

def days_ago(n): return (dt.date(2026,4,13) - dt.timedelta(days=n)).isoformat()

for it in data['items']:
    atts = []
    start = it.get('start_date') or days_ago(90)
    try:
        base = dt.date.fromisoformat(start)
    except Exception:
        base = dt.date(2025, 12, 1)
    def d(offset):
        return (base + dt.timedelta(days=offset)).isoformat()

    owner_code = it.get('owner') or random.choice(DDLNY_OWNERS)
    owner_person = PEOPLE.get(owner_code) or {'initials':'??','name':owner_code}
    vendor_user = random.choice(VENDOR_USERS.get(it['vendor'], [{'id':'—','name':'Vendor','initials':'??'}]))

    atts.append({
        'filename': f'moodboard_{it["key"]}.pdf',
        'size_kb': random.randint(800, 4500),
        'uploaded_at': d(0),
        'uploaded_by': owner_code, 'uploaded_by_name': owner_person.get('name', owner_code),
        'phase': 'R&D',
        'mime': 'application/pdf',
    })
    atts.append({
        'filename': f'sketch_v{random.randint(1,4)}.png',
        'size_kb': random.randint(300, 1200),
        'uploaded_at': d(random.randint(3, 14)),
        'uploaded_by': owner_code, 'uploaded_by_name': owner_person.get('name', owner_code),
        'phase': 'Design WIP',
        'mime': 'image/png',
    })
    # CAD — link to an existing image if available
    if it.get('images'):
        atts.append({
            'filename': f'CAD_{it["key"]}.png',
            'size_kb': random.randint(400, 1800),
            'uploaded_at': d(random.randint(15, 40)),
            'uploaded_by': vendor_user['id'],
            'uploaded_by_name': f"{vendor_user['name']} ({it['vendor']})",
            'phase': 'CAD WIP',
            'mime': 'image/png',
            'is_cad': True,
            'thumb': it['images'][0],
        })
    atts.append({
        'filename': f'BOM_{it["key"]}.xlsx',
        'size_kb': random.randint(45, 180),
        'uploaded_at': d(random.randint(25, 55)),
        'uploaded_by': vendor_user['id'],
        'uploaded_by_name': f"{vendor_user['name']} ({it['vendor']})",
        'phase': 'BOM to Share',
        'mime': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    if it['status'] in ('Sample In Process','Sample Shipped','Done','Proforma') and random.random() < 0.7:
        atts.append({
            'filename': f'sample_photo_{it["key"]}.jpg',
            'size_kb': random.randint(1500, 4000),
            'uploaded_at': d(random.randint(60, 100)),
            'uploaded_by': vendor_user['id'],
            'uploaded_by_name': f"{vendor_user['name']} ({it['vendor']})",
            'phase': 'Sample In Process',
            'mime': 'image/jpeg',
        })
    it['attachments'] = atts

# ---- 3. Activity log (synthesize from comments + status transitions)
for it in data['items']:
    log = []
    start = it.get('start_date') or days_ago(90)
    try:
        base = dt.date.fromisoformat(start)
    except Exception:
        base = dt.date(2025, 12, 1)
    owner = it.get('owner') or 'BB'
    owner_name = PEOPLE.get(owner, {}).get('name', owner)

    log.append({'ts': base.isoformat()+'T09:12:00Z', 'user': owner, 'user_name': owner_name,
                'kind': 'created', 'field': None, 'from': None, 'to': None,
                'detail': f'Created style {it.get("style_no") or it["key"]}'})
    # Phase progression — derive a couple of past phase transitions leading up to current
    phase_idx = PHASES.index(it['status']) if it['status'] in PHASES else -1
    days_off = 4
    for p_i in range(min(phase_idx, 4)):
        from_p = PHASES[p_i]
        to_p = PHASES[p_i+1]
        uname = owner_name if to_p in ('Design WIP','Awaiting Feedback') else random.choice(['Rajesh P.','Priya S.',owner_name])
        log.append({'ts': (base + dt.timedelta(days=days_off)).isoformat()+'T14:30:00Z',
                    'user': 'JIRA', 'user_name': uname, 'kind': 'status_changed',
                    'field': 'Status', 'from': from_p, 'to': to_p, 'detail': None})
        days_off += random.randint(3, 14)
    # Attachment add events
    for a in it.get('attachments', [])[:3]:
        log.append({'ts': a['uploaded_at']+'T10:05:00Z', 'user': a['uploaded_by'],
                    'user_name': a['uploaded_by_name'], 'kind': 'attachment_added',
                    'field': 'Attachment', 'from': None, 'to': a['filename'], 'detail': None})
    # Comments → already in it['comments'], replicate into the log
    for c in it.get('comments', [])[:3]:
        log.append({'ts': (c.get('date') or '')+'T11:00:00Z',
                    'user': c.get('author') or owner, 'user_name': PEOPLE.get(c.get('author') or owner,{}).get('name', c.get('author') or owner),
                    'kind': 'commented', 'field': None, 'from': None,
                    'to': (c.get('body') or '')[:140], 'detail': None})
    it['activity_log'] = sorted(log, key=lambda x: x['ts'])

# ---- 4. Workflow transition matrix (who can execute)
TRANSITIONS = {
    'Design WIP':        {'R&D': ['any'], 'Awaiting Feedback': ['ddlny-pd'], 'Cancelled': ['ddlny-pd'], 'Hold': ['ddlny-pd']},
    'Awaiting Feedback': {'Design WIP': ['any'], 'BOM to Share': ['ddlny-pd'], 'Cancelled': ['ddlny-pd'], 'Hold': ['ddlny-pd']},
    'BOM to Share':      {'CAD WIP': ['ddlny-pd','vendor'], 'Hold': ['ddlny-pd']},
    'CAD WIP':           {'Awaiting Feedback': ['ddlny-pd','vendor'], 'PO Pending': ['ddlny-pd'], 'Hold': ['ddlny-pd']},
    'PO Pending':        {'PO to Share': ['ddlny-pd'], 'Cancelled': ['ddlny-pd']},
    'PO to Share':       {'Sample In Process': ['vendor'], 'Cancelled': ['ddlny-pd']},
    'Sample In Process': {'Sample Shipped': ['vendor']},
    'Sample Shipped':    {'Done': ['ddlny-pd'], 'Sample In Process': ['vendor']},
    'Hold':              {'Design WIP': ['ddlny-pd'], 'Cancelled': ['ddlny-pd']},
    'R&D':               {'Design WIP': ['ddlny-pd'], 'Cancelled': ['ddlny-pd']},
}
data['transitions'] = TRANSITIONS

# ---- 5. Build a 'collections' index for the cross-vendor demo
from collections import defaultdict
coll = defaultdict(lambda: {'items': [], 'dnj': 0, 'elegant': 0})
for it in data['items']:
    if not it.get('category'): continue
    coll[it['category']]['items'].append(it['key'])
    if it['vendor']=='DNJ': coll[it['category']]['dnj'] += 1
    else: coll[it['category']]['elegant'] += 1
data['collections'] = {k: v for k, v in coll.items()}

# update vendor KPI
data['kpis']['vendors'] = {'DNJ': sum(1 for i in data['items'] if i['vendor']=='DNJ'),
                           'Elegant': sum(1 for i in data['items'] if i['vendor']=='Elegant')}

DATA_PATH.write_text(json.dumps(data, indent=2, default=str))
print(f"Items reassigned to Elegant: {elegant_count}")
print(f"Vendor counts now: DNJ={data['kpis']['vendors']['DNJ']}  Elegant={data['kpis']['vendors']['Elegant']}")
print(f"Cross-vendor collections (have both):")
for c, v in data['collections'].items():
    if v['dnj'] > 0 and v['elegant'] > 0:
        print(f'  {c:40s}  DNJ={v["dnj"]:3d}  ELG={v["elegant"]:3d}')
