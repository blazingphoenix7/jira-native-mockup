"""Remap mockup/data.json to the v2 schema:
 - 13 status phases -> 7 phases + 2 side lanes (Hold, Cancelled)
 - Demoted states become sub-tasks on the relevant phase
 - Synthesize realistic sub-tasks per Style (2-5 per item)
 - Materialize Collection objects (one per Category, with own workflow)
 - Rewrite transitions matrix for the 7 phases
"""
import json, random, datetime as dt
from pathlib import Path
from collections import defaultdict, Counter

DATA = Path(r'C:/Users/AaryanMehta/Downloads/jira/mockup/data.json')
data = json.loads(DATA.read_text())
random.seed(7)
TODAY = dt.date.fromisoformat(data.get('today', '2026-04-13'))

# ---- 1. New workflow + transitions ----
WORKFLOW = ['Concept/R&D', 'Design', 'CAD', 'PO', 'Sample Production',
            'Received & Approved', 'Repair']
SIDE_LANES = ['Hold', 'Cancelled']
ALL_COLS = WORKFLOW + SIDE_LANES

# Phase mapping from old 13-state to new 7-state
PHASE_REMAP = {
    'R&D': 'Concept/R&D',
    'Insights': 'Concept/R&D',
    'Design WIP': 'Design',
    'Awaiting Feedback': 'Design',
    'BOM To Share': 'Design',
    'BOM to Share': 'Design',
    'CAD WIP': 'CAD',
    'PO Pending': 'PO',
    'PO To Share': 'PO',
    'Proforma': 'PO',
    'Sample In Process': 'Sample Production',
    'Sample Shipped': 'Received & Approved',
    'Done': 'Received & Approved',
    'Hold': 'Hold',
    'Cancelled': 'Cancelled',
}

# Transitions: from -> {to: [allowed roles]}
# roles: 'any' | 'ddlny-pd' | 'vendor' (vendor assigned to style)
TRANSITIONS = {
    'Concept/R&D': {
        'Design':    ['ddlny-pd'],
        'Cancelled': ['ddlny-pd'],
        'Hold':      ['ddlny-pd'],
    },
    'Design': {
        'CAD':            ['ddlny-pd'],
        'Concept/R&D':    ['ddlny-pd'],
        'Cancelled':      ['ddlny-pd'],
        'Hold':           ['ddlny-pd'],
    },
    'CAD': {
        'PO':             ['ddlny-pd'],
        'Design':         ['ddlny-pd', 'vendor'],
        'Cancelled':      ['ddlny-pd'],
        'Hold':           ['ddlny-pd'],
    },
    'PO': {
        'Sample Production': ['ddlny-pd'],
        'CAD':               ['ddlny-pd'],
        'Cancelled':         ['ddlny-pd'],
        'Hold':              ['ddlny-pd'],
    },
    'Sample Production': {
        'Received & Approved': ['ddlny-pd'],
        'PO':                  ['ddlny-pd'],
        'Cancelled':           ['ddlny-pd'],
        'Hold':                ['ddlny-pd'],
    },
    'Received & Approved': {
        'Repair':      ['ddlny-pd'],
        'Cancelled':   ['ddlny-pd'],
    },
    'Repair': {
        'Received & Approved': ['ddlny-pd'],
        'Sample Production':   ['ddlny-pd'],
        'Cancelled':           ['ddlny-pd'],
    },
    'Hold': {
        'Design':    ['ddlny-pd'],
        'Cancelled': ['ddlny-pd'],
    },
    'Cancelled': {
        'Design':    ['ddlny-pd'],
    },
}

# ---- 2. Sub-task templates ----
TEMPLATES = {
    'request_feedback':  {'icon':'🔄', 'label':'Request Feedback',
                          'summary_tpl':'Review and approve {what}',
                          'assignee_role':'ddlny-pd', 'gating':True, 'ddlny_only':True,
                          'description':'Please review the latest {what} and leave feedback or approval.'},
    'request_revision':  {'icon':'✏️', 'label':'Request Revision',
                          'summary_tpl':'Revise {what} per feedback',
                          'assignee_role':'vendor',   'gating':True, 'ddlny_only':False,
                          'description':'Apply the requested changes noted in comments and re-upload.'},
    'upload_cad':        {'icon':'⬆️', 'label':'Upload CAD',
                          'summary_tpl':'Upload CAD render',
                          'assignee_role':'vendor',   'gating':True, 'ddlny_only':False,
                          'description':'Produce and upload the CAD render based on approved sketch.'},
    'send_bom':          {'icon':'📊', 'label':'Send BOM',
                          'summary_tpl':'Send BOM',
                          'assignee_role':'ddlny-pd', 'gating':True, 'ddlny_only':False,
                          'description':'Prepare and send the Bill of Materials to the vendor.'},
    'send_proforma':     {'icon':'💰', 'label':'Send Proforma',
                          'summary_tpl':'Send proforma invoice',
                          'assignee_role':'vendor',   'gating':True, 'ddlny_only':False,
                          'description':'Issue the proforma invoice so DDLNY can generate a PO.'},
    'ship_sample':       {'icon':'📦', 'label':'Ship Sample',
                          'summary_tpl':'Ship sample to DDLNY',
                          'assignee_role':'vendor',   'gating':True, 'ddlny_only':False,
                          'description':'Package, courier and provide tracking for the finished sample.'},
    'custom':            {'icon':'＋', 'label':'Custom sub-task',
                          'summary_tpl':'{custom}',
                          'assignee_role':'ddlny-pd', 'gating':False, 'ddlny_only':False,
                          'description':''},
}

# ---- 3. People (expand to have vendor users for sub-task assignment) ----
PEOPLE = data['people']
VENDOR_USERS = {
    'DNJ': [
        {'id':'RP',     'name':'Rajesh P.',       'color':'#6554C0', 'initials':'RP', 'role':'vendor', 'vendor':'DNJ'},
        {'id':'AM_DNJ', 'name':'Ashok M. (DNJ)',  'color':'#403294', 'initials':'AM', 'role':'vendor', 'vendor':'DNJ'},
        {'id':'NS_DNJ', 'name':'Neha S. (DNJ)',   'color':'#5243AA', 'initials':'NS', 'role':'vendor', 'vendor':'DNJ'},
    ],
    'Elegant': [
        {'id':'PS_ELG', 'name':'Priya S. (Elegant)','color':'#FF5630', 'initials':'PS', 'role':'vendor', 'vendor':'Elegant'},
        {'id':'KM_ELG', 'name':'Kiran M. (Elegant)','color':'#BF2600', 'initials':'KM', 'role':'vendor', 'vendor':'Elegant'},
    ],
}
# Flatten people list for JS consumption
ALL_USERS = {}
for k, p in PEOPLE.items():
    ALL_USERS[k] = {'id':k, 'name':p['name'], 'color':p['color'], 'initials':p['initials'], 'role':'ddlny-pd', 'vendor':None}
for v, users in VENDOR_USERS.items():
    for u in users:
        ALL_USERS[u['id']] = u

# ---- 4. Helpers ----
def ddlny_owner_for(item):
    return item.get('owner') or random.choice(['BB','VW','JW','Avi'])

def vendor_user_for(item):
    pool = VENDOR_USERS.get(item['vendor'], [])
    if not pool: return None
    return random.choice(pool)['id']

def parse_date(s):
    try: return dt.date.fromisoformat(s[:10])
    except Exception: return None

def mk_subtask(parent_key, i, tpl_key, phase_when_created, what='sketch',
               status='To Do', days_offset=0, custom_summary=None, due_days=None,
               override_assignee=None, override_ddlny_only=None):
    t = TEMPLATES[tpl_key]
    summary = custom_summary or t['summary_tpl'].format(what=what, custom=what)
    assignee = override_assignee
    if not assignee:
        # Pick by role
        if t['assignee_role'] == 'vendor':
            parent = next((x for x in data['items'] if x['key']==parent_key), None)
            pool = VENDOR_USERS.get(parent['vendor'], []) if parent else []
            assignee = pool[0]['id'] if pool else 'RP'
        else:
            assignee = random.choice(['BB','VW','JW','Avi'])
    # Dates
    created = TODAY - dt.timedelta(days=max(days_offset, 1))
    due     = TODAY + dt.timedelta(days=(due_days if due_days is not None else random.randint(1,7)))
    return {
        'key':   f'{parent_key}-ST-{i}',
        'parent': parent_key,
        'template': tpl_key,
        'icon': t['icon'],
        'summary': summary,
        'description': t['description'],
        'assignee': assignee,
        'reporter': random.choice(['BB','VW','JW','Avi']),
        'status': status,
        'due_date': due.isoformat(),
        'created_at': created.isoformat(),
        'phase_when_created': phase_when_created,
        'gating': t['gating'],
        'ddlny_only': t['ddlny_only'] if override_ddlny_only is None else override_ddlny_only,
    }

# ---- 5. Remap all items + synthesize sub-tasks ----
for item in data['items']:
    # 5a. remap status
    old_status = item.get('status')
    new_status = PHASE_REMAP.get(old_status, old_status)
    item['status'] = new_status

    # 5b. plant sub-tasks based on the new phase
    subtasks = []
    idx = 1
    if new_status == 'Concept/R&D':
        subtasks.append(mk_subtask(item['key'], idx, 'custom', 'Concept/R&D',
                                    custom_summary='Curate moodboard & references',
                                    status='In Progress', days_offset=random.randint(2,8),
                                    override_assignee=ddlny_owner_for(item)))
        idx+=1
    elif new_status == 'Design':
        # Upload sketch (vendor, done)
        subtasks.append(mk_subtask(item['key'], idx, 'upload_cad', 'Design',
                                    custom_summary='Upload initial sketch',
                                    status='Done', days_offset=random.randint(20,40)))
        idx+=1
        # Request feedback (DDLNY-only, pending or done)
        feedback_done = old_status not in ('Awaiting Feedback','BOM To Share','BOM to Share')
        subtasks.append(mk_subtask(item['key'], idx, 'request_feedback', 'Design',
                                    what='sketch v1',
                                    status='Done' if feedback_done else 'In Progress',
                                    days_offset=random.randint(8,20)))
        idx+=1
        if old_status in ('BOM To Share', 'BOM to Share'):
            subtasks.append(mk_subtask(item['key'], idx, 'send_bom', 'Design',
                                        status='To Do', due_days=random.randint(1,5)))
            idx+=1
    elif new_status == 'CAD':
        subtasks.append(mk_subtask(item['key'], idx, 'upload_cad', 'CAD',
                                    status='Done' if random.random()<0.6 else 'In Progress',
                                    days_offset=random.randint(6,20)))
        idx+=1
        subtasks.append(mk_subtask(item['key'], idx, 'request_feedback', 'CAD',
                                    what='CAD render',
                                    status='In Progress' if random.random()<0.5 else 'To Do',
                                    days_offset=random.randint(1,7)))
        idx+=1
        if random.random()<0.35:
            subtasks.append(mk_subtask(item['key'], idx, 'request_revision', 'CAD',
                                        what='CAD v2',
                                        status='To Do', due_days=random.randint(2,6)))
            idx+=1
    elif new_status == 'PO':
        subtasks.append(mk_subtask(item['key'], idx, 'send_proforma', 'PO',
                                    status='Done' if old_status=='Proforma' else 'In Progress',
                                    days_offset=random.randint(3,10)))
        idx+=1
        subtasks.append(mk_subtask(item['key'], idx, 'custom', 'PO',
                                    custom_summary='Receive PO from customer',
                                    status='To Do', due_days=random.randint(1,10),
                                    override_assignee=ddlny_owner_for(item),
                                    override_ddlny_only=True))
        idx+=1
        if old_status == 'PO To Share':
            subtasks.append(mk_subtask(item['key'], idx, 'custom', 'PO',
                                        custom_summary='Send PO to vendor',
                                        status='To Do', due_days=2,
                                        override_assignee=ddlny_owner_for(item)))
            idx+=1
    elif new_status == 'Sample Production':
        subtasks.append(mk_subtask(item['key'], idx, 'custom', 'Sample Production',
                                    custom_summary='Manufacture sample',
                                    status='In Progress', days_offset=random.randint(5,20),
                                    override_assignee=vendor_user_for(item) or 'RP'))
        idx+=1
        subtasks.append(mk_subtask(item['key'], idx, 'ship_sample', 'Sample Production',
                                    status='To Do', due_days=random.randint(3,14)))
        idx+=1
    elif new_status == 'Received & Approved':
        # Everything done
        subtasks.append(mk_subtask(item['key'], idx, 'ship_sample', 'Sample Production',
                                    status='Done', days_offset=random.randint(30,90)))
        idx+=1
        subtasks.append(mk_subtask(item['key'], idx, 'custom', 'Received & Approved',
                                    custom_summary='Sign-off & archive',
                                    status='Done', days_offset=random.randint(1,20),
                                    override_assignee=ddlny_owner_for(item)))
        idx+=1
    elif new_status == 'Hold':
        subtasks.append(mk_subtask(item['key'], idx, 'custom', 'Design',
                                    custom_summary='Decide: proceed or cancel',
                                    status='To Do', due_days=random.randint(-30, 7),
                                    override_assignee=ddlny_owner_for(item),
                                    override_ddlny_only=True))
        idx+=1
    elif new_status == 'Cancelled':
        pass  # no open sub-tasks on cancelled
    item['subtasks'] = subtasks
    # progress pill
    done = sum(1 for s in subtasks if s['status']=='Done')
    total = len(subtasks)
    item['subtask_progress'] = {'done': done, 'total': total}
    # gating-complete flag (for the Advance banner)
    gating = [s for s in subtasks if s['gating']]
    item['gates_total'] = len(gating)
    item['gates_done'] = sum(1 for s in gating if s['status']=='Done')
    item['ready_to_advance'] = (item['gates_total']>0 and item['gates_done']==item['gates_total']
                                and new_status in WORKFLOW[:-1])  # can't advance Repair via gates

# ---- 6. Add a few Repair items so the new phase has life in the demo ----
received = [i for i in data['items'] if i['status']=='Received & Approved']
for it in random.sample(received, min(8, len(received))):
    it['status'] = 'Repair'
    it['subtasks'].append(mk_subtask(it['key'], len(it['subtasks'])+1, 'custom', 'Repair',
                                     custom_summary='Fix stone-setting / polish issue',
                                     status='In Progress', days_offset=random.randint(1,7),
                                     override_assignee=vendor_user_for(it) or 'RP'))
    it['subtask_progress'] = {'done': sum(1 for s in it['subtasks'] if s['status']=='Done'),
                              'total': len(it['subtasks'])}

# ---- 7. Materialize Collection objects (one per Category) ----
by_cat = defaultdict(list)
for i in data['items']:
    if i.get('category'):
        by_cat[i['category']].append(i)

CUSTOMERS = ['JCP', "Sam's Club", 'Macy\'s', 'Kohl\'s', 'Direct DDLNY']
def collection_status_for(styles):
    s = Counter(x['status'] for x in styles)
    if all(x['status']=='Cancelled' for x in styles): return 'Archived'
    if all(x['status'] in ('Received & Approved','Cancelled','Repair') for x in styles):
        return 'Delivered'
    if any(x['status'] in ('Design','CAD','PO','Sample Production','Repair') for x in styles):
        return 'In Development'
    return 'Planning'

collections = []
for idx, (name, styles) in enumerate(sorted(by_cat.items(), key=lambda kv: -len(kv[1])), start=1):
    launch = TODAY + dt.timedelta(days=random.randint(-60, 120))
    target = random.choice([45, 59, 79, 99, 129, 149, 199, 249, 299])
    owner = random.choice(['BB','VW','JW','Avi'])
    dnj_n = sum(1 for s in styles if s['vendor']=='DNJ')
    elg_n = sum(1 for s in styles if s['vendor']=='Elegant')
    vendors = [v for v, n in (('DNJ',dnj_n),('Elegant',elg_n)) if n>0]
    coll = {
        'key': f'COLL-{idx:03d}',
        'name': name,
        'description': f'{name} — {len(styles)} styles across {len(vendors)} vendor(s).',
        'customer': random.choice(CUSTOMERS),
        'launch_date': launch.isoformat(),
        'target_retail_usd': target,
        'owner': owner,
        'status': collection_status_for(styles),
        'vendors': vendors,
        'child_style_keys': [s['key'] for s in styles],
        'style_count': len(styles),
        'dnj_count': dnj_n,
        'elegant_count': elg_n,
        'is_cross_vendor': dnj_n > 0 and elg_n > 0,
        'progress_pct': round(100 * sum(1 for s in styles if s['status']=='Received & Approved')
                              / max(1, len(styles))),
    }
    collections.append(coll)

# ---- 8. Write output ----
data['workflow'] = WORKFLOW
data['side_lanes'] = SIDE_LANES
data['all_columns'] = ALL_COLS
data['transitions'] = TRANSITIONS
data['templates'] = TEMPLATES
data['all_users'] = ALL_USERS
data['collections_list'] = collections  # keyed list (vs the old 'collections' dict)
# Refresh KPIs for the new workflow
status_counts = Counter(i['status'] for i in data['items'])
data['status_counts'] = dict(status_counts)
active = sum(status_counts.get(s,0) for s in ('Concept/R&D','Design','CAD','PO','Sample Production','Repair'))
shipped = status_counts.get('Received & Approved', 0)
cancelled = status_counts.get('Cancelled', 0)
data['kpis'] = {
    'total': len(data['items']),
    'active': active,
    'shipped': shipped,
    'cancelled': cancelled,
    'overdue': sum(1 for i in data['items'] for s in i.get('subtasks',[])
                    if s['status']!='Done' and s['due_date'] < TODAY.isoformat()),
    'vendors': {'DNJ': sum(1 for i in data['items'] if i['vendor']=='DNJ'),
                'Elegant': sum(1 for i in data['items'] if i['vendor']=='Elegant')},
    'ready_to_advance': sum(1 for i in data['items'] if i.get('ready_to_advance')),
    'with_ddlny_hidden': sum(1 for i in data['items']
                              for s in i.get('subtasks',[]) if s.get('ddlny_only')),
}

DATA.write_text(json.dumps(data, indent=2, default=str))
print(f'Items: {len(data["items"])}')
print(f'Collections: {len(collections)} (cross-vendor: {sum(1 for c in collections if c["is_cross_vendor"])})')
print('New status distribution:')
for s in ALL_COLS:
    print(f'  {s:25s} {status_counts.get(s,0):5d}')
print(f'\nReady-to-advance items: {data["kpis"]["ready_to_advance"]}')
print(f'Sub-tasks total: {sum(len(i.get("subtasks",[])) for i in data["items"])}')
print(f'DDLNY-only sub-tasks: {data["kpis"]["with_ddlny_hidden"]}')
