// ============ State ============
let DATA = null;
let ROLE = 'ddlny';   // ddlny | dnj | elegant
let VIEW = 'dashboard';
let FILTERS = { owner: null, category: null, status: null, priority: null, search: '' };
let DRAWER_TAB = 'details';
let ATTACHMENT_PHASE_FILTER = null;
let CURRENT_KEY = null;
let CURRENT_COLLECTION = null;
let COLLECTION_VENDOR_TAB = 'all';
let CREATE_STEP = 'picker';   // picker | style | collection | subtask
let CREATE_SUBTASK_PARENT = null;  // issue key when creating sub-task from drawer

const el = (id) => document.getElementById(id);

// ============ Role / permission model ============
const ROLES = {
  ddlny: {
    name: 'Aaryan M. (DDLNY)', initials: 'AM', color: '#0052CC', roleKey: 'ddlny-pd',
    canSee: ['DNJ', 'Elegant'],
    banner: { cls: 'admin', html:
      '<b>👑 DDLNY Admin view.</b> You can see both vendor projects and all sub-tasks (including DDLNY-only ones). ' +
      'Switch "View as" at the top-right to preview exactly what DNJ or Elegant sees.' },
    projects: [
      { key: 'DNJ', label: 'DNJ', color: '#6554C0' },
      { key: 'ELG', label: 'Elegant', color: '#FF5630' },
    ],
  },
  dnj: {
    name: 'Rajesh P. (DNJ)', initials: 'RP', color: '#6554C0', roleKey: 'vendor',
    canSee: ['DNJ'],
    banner: { cls: 'vendor', html:
      '<b>🔒 You are viewing as DNJ.</b> DNJ users see only the DNJ project. ' +
      'Elegant work is invisible. DDLNY-only sub-tasks appear as "N hidden sub-tasks" placeholders — count is known to DNJ, content is not.' },
    projects: [ { key: 'DNJ', label: 'DNJ', color: '#6554C0' } ],
  },
  elegant: {
    name: 'Priya S. (Elegant)', initials: 'PS', color: '#FF5630', roleKey: 'vendor',
    canSee: ['Elegant'],
    banner: { cls: 'vendor', html:
      '<b>🔒 You are viewing as Elegant.</b> Elegant users see only the Elegant project. ' +
      'DNJ work is completely hidden.' },
    projects: [ { key: 'ELG', label: 'Elegant', color: '#FF5630' } ],
  },
};

// ============ Init ============
async function init() {
  const res = await fetch('data.json');
  DATA = await res.json();
  bindUI();
  applyRole();
}

function bindUI() {
  el('roleSelect').addEventListener('change', (e) => { ROLE = e.target.value; applyRole(); });
  el('globalSearch').addEventListener('input', (e) => { FILTERS.search = e.target.value.toLowerCase(); render(); });
  document.querySelectorAll('.side-list li[data-view]').forEach(li => {
    li.addEventListener('click', () => {
      VIEW = li.dataset.view;
      document.querySelectorAll('.side-list li[data-view]').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      render();
    });
  });
  document.querySelector('.create-btn').addEventListener('click', () => openCreate());
}

function applyRole() {
  const r = ROLES[ROLE];
  el('currentAvatar').textContent = r.initials;
  el('currentAvatar').style.background = r.color;
  const banner = el('permBanner');
  banner.className = 'perm-banner show ' + r.banner.cls;
  banner.innerHTML = r.banner.html;
  const pl = el('projectList');
  pl.innerHTML = r.projects.map((p,i) =>
    `<li class="${i===0?'active':''}" style="display:flex;gap:8px;align-items:center">
      <span class="proj-avatar" style="width:20px;height:20px;font-size:10px;background:${p.color}">${p.key}</span>
      <span>${p.label}</span>
    </li>`
  ).join('');
  if (ROLE !== 'ddlny') pl.innerHTML += `<li style="color:#B3BAC5;cursor:not-allowed" title="Not visible to vendor users">🔒 other projects hidden</li>`;
  const firstProj = r.projects[0];
  el('projAvatar').textContent = firstProj.key;
  el('projAvatar').style.background = firstProj.color;
  el('projName').textContent = firstProj.label;
  const team = el('teamList');
  if (ROLE === 'ddlny') {
    team.innerHTML = Object.entries(DATA.people).map(([k,p]) =>
      `<li><span class="mini-avatar" style="background:${p.color};display:inline-flex;margin-right:6px">${p.initials}</span>${p.name}</li>`
    ).join('') + `<li>+ Invite DDLNY staff…</li>`;
  } else {
    team.innerHTML = `<li>${r.name} (you)</li><li class="muted">+ vendor colleagues</li>`;
  }
  render();
}

// ============ Helpers: user + sub-task visibility ============
function userLookup(id) {
  if (!id) return { color:'#6B778C', initials:'??', name:'—' };
  if (DATA.all_users && DATA.all_users[id]) return DATA.all_users[id];
  if (DATA.people && DATA.people[id])       return DATA.people[id];
  return { color:'#6B778C', initials:String(id).slice(0,2).toUpperCase(), name: id };
}
function visibleSubtasksOf(item) {
  const subs = item.subtasks || [];
  if (ROLE === 'ddlny') return subs;
  return subs.filter(s => !s.ddlny_only);
}
function hiddenSubtaskCount(item) {
  if (ROLE === 'ddlny') return 0;
  return (item.subtasks || []).filter(s => s.ddlny_only).length;
}
function progressPill(item) {
  const subs = visibleSubtasksOf(item);
  if (!subs.length) return '';
  const done = subs.filter(s => s.status === 'Done').length;
  const cls = done === subs.length ? 'pp-done' : (done > 0 ? 'pp-partial' : 'pp-none');
  return `<span class="progress-pill ${cls}">${done}/${subs.length} ✓</span>`;
}

// ============ Visible data ============
function visibleItems() {
  const r = ROLES[ROLE];
  let items = DATA.items.filter(i => r.canSee.includes(i.vendor));
  if (FILTERS.search) {
    const q = FILTERS.search;
    items = items.filter(i =>
      (i.style_no||'').toLowerCase().includes(q) ||
      (i.po_no||'').toLowerCase().includes(q) ||
      (i.category||'').toLowerCase().includes(q) ||
      (i.key||'').toLowerCase().includes(q)
    );
  }
  if (FILTERS.owner)    items = items.filter(i => i.owner === FILTERS.owner);
  if (FILTERS.category) items = items.filter(i => i.category === FILTERS.category);
  if (FILTERS.status)   items = items.filter(i => i.status === FILTERS.status);
  if (FILTERS.priority) items = items.filter(i => i.priority === FILTERS.priority);
  return items;
}

// ============ Render ============
function render() {
  const main = el('mainContent');
  const items = visibleItems();
  if (items.length === 0 && ROLE === 'elegant' && VIEW !== 'dashboard') {
    main.innerHTML = emptyElegant();
    return;
  }
  switch (VIEW) {
    case 'dashboard':   main.innerHTML = viewDashboard(items); break;
    case 'board':       main.innerHTML = viewBoard(items); bindCards(); break;
    case 'gallery':     main.innerHTML = viewGallery(items); bindCards(); break;
    case 'list':        main.innerHTML = viewList(items); bindCards(); break;
    case 'collections': main.innerHTML = viewCollections(items); break;
    case 'reports':     main.innerHTML = viewReports(items); break;
    case 'timeline':    main.innerHTML = viewTimeline(items); break;
  }
}

function emptyElegant() {
  return `
    <div class="breadcrumbs">Projects / Elegant</div>
    <h1 class="page-title">Elegant</h1>
    <div class="empty">
      <div class="emoji">💎</div>
      <h3>No styles yet for this filter</h3>
      <p>Try switching views or clearing filters.</p>
      <button class="btn primary" onclick="openCreate()">+ Create style</button>
    </div>`;
}

// ============ Dashboard ============
function viewDashboard(items) {
  const byStatus = count(items, 'status');
  const byOwner  = count(items, 'owner');
  const byCat    = count(items, 'category');
  const shipped  = byStatus['Received & Approved'] || 0;
  const cancel   = byStatus['Cancelled'] || 0;
  const active   = ['Concept/R&D','Design','CAD','PO','Sample Production','Repair']
                    .reduce((s,k)=>s+(byStatus[k]||0), 0);
  const designCount = byStatus['Design'] || 0;
  const po       = byStatus['PO'] || 0;
  const readyToAdvance = items.filter(i => i.ready_to_advance).length;
  const recent = items.filter(i => i.comments && i.comments.length)
    .sort((a,b) => (b.status_date||'').localeCompare(a.status_date||''))
    .slice(0, 8);

  return `
    <div class="breadcrumbs">Projects / ${vendorLabel()} / Dashboard</div>
    <div class="page-header">
      <h1 class="page-title">${vendorLabel()} · Overview</h1>
      <div class="page-actions">
        <button class="btn">Share</button>
        <button class="btn">Export</button>
        <button class="btn primary" onclick="openCreate()">+ Create</button>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi info"><div class="kpi-label">Total styles</div><div class="kpi-value">${items.length}</div><div class="kpi-delta">across ${Object.keys(byCat).length} collections</div></div>
      <div class="kpi"><div class="kpi-label">In flight</div><div class="kpi-value">${active}</div><div class="kpi-delta">Concept → Sample Production</div></div>
      <div class="kpi warn"><div class="kpi-label">Design phase</div><div class="kpi-value">${designCount}</div><div class="kpi-delta">sketch + approval</div></div>
      <div class="kpi"><div class="kpi-label">PO phase</div><div class="kpi-value">${po}</div><div class="kpi-delta">need PO from customer</div></div>
      <div class="kpi success"><div class="kpi-label">Ready to advance</div><div class="kpi-value">${readyToAdvance}</div><div class="kpi-delta">all gating sub-tasks ✓</div></div>
      <div class="kpi success"><div class="kpi-label">Received & Approved</div><div class="kpi-value">${shipped}</div><div class="kpi-delta">signed off</div></div>
    </div>

    <div class="dash-grid">
      <div>
        <div class="panel">
          <h3>Workflow status <span class="meta">click a row to filter the board</span></h3>
          ${(DATA.all_columns || DATA.workflow).map(s => {
            const c = byStatus[s] || 0;
            if (c === 0) return '';
            const pct = Math.round(100 * c / items.length);
            const cls = ['Received & Approved'].includes(s) ? 'status-sample'
              : ['Cancelled','Hold'].includes(s) ? 'status-cancelled' : 'status-active';
            return `<div class="bar-row ${cls}" onclick="FILTERS.status='${s}';VIEW='board';render();">
              <span class="bar-label"><span class="status-chip s-${phaseCls(s)}">${s}</span></span>
              <div class="bar-fill-track"><div class="bar-fill" style="width:${pct}%"></div></div>
              <span class="bar-count">${c}</span>
            </div>`;
          }).join('')}
        </div>

        <div class="panel">
          <h3>Top collections <span class="meta">${Object.keys(byCat).length} total</span></h3>
          ${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,c]) => {
            const pct = Math.round(100 * c / items.length);
            return `<div class="bar-row" onclick="FILTERS.category='${escapeAttr(k)}';VIEW='gallery';render();">
              <span class="bar-label">${escapeHtml(k)}</span>
              <div class="bar-fill-track"><div class="bar-fill" style="width:${pct*3}%"></div></div>
              <span class="bar-count">${c}</span>
            </div>`;
          }).join('')}
        </div>

        ${ROLE==='ddlny' ? panelVendorCompare() : ''}
      </div>

      <div>
        <div class="panel">
          <h3>DDLNY owners <span class="meta">who owns each style</span></h3>
          ${Object.entries(byOwner).filter(([k])=>k&&k!=='null').sort((a,b)=>b[1]-a[1]).map(([k,c])=>{
            const p = userLookup(k);
            const pct = Math.round(100 * c / items.length);
            return `<div class="bar-row" onclick="FILTERS.owner='${escapeAttr(k)}';VIEW='list';render();">
              <span class="bar-label"><span class="mini-avatar" style="display:inline-flex;background:${p.color};margin-right:6px">${p.initials}</span>${p.name||k}</span>
              <div class="bar-fill-track"><div class="bar-fill" style="width:${pct}%"></div></div>
              <span class="bar-count">${c}</span>
            </div>`;
          }).join('')}
        </div>

        <div class="panel">
          <h3>Recent activity</h3>
          ${recent.map(i => {
            const last = i.comments[i.comments.length-1];
            const author = last.author || i.owner || '?';
            const p = userLookup(author);
            return `<div class="d-comment" onclick="openDrawer('${i.key}')" style="cursor:pointer">
              <span class="mini-avatar" style="background:${p.color}">${p.initials}</span>
              <div class="body">
                <div class="meta"><b>${p.name||author}</b> on <span class="card-key">${i.key}</span> · ${last.date||''}</div>
                <div>${escapeHtml((last.body||'').slice(0,120))}</div>
              </div>
            </div>`;
          }).join('') || '<div class="muted">No recent comments.</div>'}
        </div>
      </div>
    </div>
  `;
}

function panelVendorCompare() {
  const all = DATA.items;
  const dnjItems = all.filter(i => i.vendor === 'DNJ');
  const elgItems = all.filter(i => i.vendor === 'Elegant');
  const mk = (arr, name, badge) => {
    const byS = count(arr, 'status');
    return `<div class="vendor-card">
      <h4>${name} <span class="vendor-badge ${badge}">${arr.length} styles</span></h4>
      <div class="mini-stats">
        <span class="mini-stat"><b>${byS['Design']||0}</b> Design</span>
        <span class="mini-stat"><b>${byS['CAD']||0}</b> CAD</span>
        <span class="mini-stat"><b>${byS['PO']||0}</b> PO</span>
        <span class="mini-stat"><b>${byS['Sample Production']||0}</b> Sample</span>
        <span class="mini-stat"><b>${byS['Received & Approved']||0}</b> Received</span>
        <span class="mini-stat"><b>${byS['Repair']||0}</b> Repair</span>
      </div>
    </div>`;
  };
  return `<div class="panel">
    <h3>Vendor comparison <span class="meta">only visible to DDLNY</span></h3>
    <div class="vendor-compare">${mk(dnjItems,'DNJ','dnj')}${mk(elgItems,'Elegant','elegant')}</div>
  </div>`;
}

// ============ Board ============
function viewBoard(items) {
  const grouped = {};
  (DATA.all_columns || DATA.workflow).forEach(s => grouped[s] = []);
  items.forEach(i => { (grouped[i.status] ||= []).push(i); });
  return `
    <div class="breadcrumbs">Projects / ${vendorLabel()} / Board</div>
    <div class="page-header">
      <h1 class="page-title">Board</h1>
      <div class="page-actions">
        ${chip('All','status',null)}
        ${chip('Design','status','Design')}
        ${chip('CAD','status','CAD')}
        ${chip('PO','status','PO')}
        ${chip('Sample','status','Sample Production')}
        ${chip('Repair','status','Repair')}
      </div>
    </div>
    ${filtersBar()}
    <div class="board-wrap"><div class="board">
      ${DATA.workflow.map(s => columnHtml(s, grouped[s]||[], false)).join('')}
      <div class="board-divider" title="Side lanes — not part of the main workflow"></div>
      ${(DATA.side_lanes||[]).map(s => columnHtml(s, grouped[s]||[], true)).join('')}
    </div></div>
  `;
}
function columnHtml(s, arr, isSide) {
  return `<div class="board-col ${isSide?'side-lane':''}">
    <div class="col-head"><span>${s}</span><span class="col-count">${arr.length}</span></div>
    <div class="col-body">
      ${arr.slice(0,40).map(cardHtml).join('')}
      ${arr.length > 40 ? `<div class="muted" style="font-size:12px;padding:6px">+ ${arr.length - 40} more…</div>` : ''}
    </div>
  </div>`;
}

function cardHtml(i) {
  const img = i.images && i.images[0] ? `<img class="card-img" src="images/${i.images[0]}" loading="lazy"/>` : `<div class="card-img placeholder">💎</div>`;
  const p = userLookup(i.owner);
  const pill = progressPill(i);
  const ready = i.ready_to_advance ? `<span class="pill live" style="margin-left:4px" title="All gating sub-tasks complete">✨ ready</span>` : '';
  return `<div class="card" data-key="${i.key}">
    ${img}
    <div class="card-title">${escapeHtml(i.style_no || i.key)}</div>
    ${i.category ? `<div class="card-meta"><span class="tag cat">${escapeHtml(i.category)}</span>${i.is_1kt?'<span class="tag kt">1KT</span>':''}</div>` : ''}
    <div class="card-foot">
      <span>
        <span class="card-key">${i.key}</span>
        ${pill}
        ${ready}
      </span>
      <span class="mini-avatar" style="background:${p.color}" title="${escapeAttr(p.name||i.owner||'')}">${p.initials}</span>
    </div>
  </div>`;
}

// ============ Gallery ============
function viewGallery(items) {
  return `
    <div class="breadcrumbs">Projects / ${vendorLabel()} / Gallery</div>
    <div class="page-header"><h1 class="page-title">Gallery</h1><div class="page-actions"><button class="btn primary" onclick="openCreate()">+ Create</button></div></div>
    ${filtersBar()}
    <div class="gallery">${items.slice(0, 120).map(cardHtml).join('')}</div>
    ${items.length > 120 ? `<div class="muted" style="padding:12px">Showing first 120 of ${items.length}. Use filters to narrow down.</div>` : ''}
  `;
}

// ============ List ============
function viewList(items) {
  const rows = items.slice(0,200).map(i => {
    const p = userLookup(i.owner);
    const img = i.images?.[0] ? `<img class="list-img" src="images/${i.images[0]}"/>` : `<div class="list-img"></div>`;
    const visSubs = visibleSubtasksOf(i);
    const done = visSubs.filter(s=>s.status==='Done').length;
    return `<tr data-key="${i.key}">
      <td>${img}</td>
      <td class="card-key">${i.key}</td>
      <td>${escapeHtml(i.style_no||'')}</td>
      <td>${escapeHtml(i.category||'')}</td>
      <td><span class="status-chip s-${phaseCls(i.status)}">${i.status}</span></td>
      <td><span class="mini-avatar" style="background:${p.color};display:inline-flex">${p.initials}</span></td>
      <td>${visSubs.length ? `${done}/${visSubs.length}` : '—'}</td>
      <td>${i.ready_to_advance ? '✨' : ''}</td>
      <td>${i.start_date||''}</td>
    </tr>`;
  }).join('');
  return `
    <div class="breadcrumbs">Projects / ${vendorLabel()} / List</div>
    <div class="page-header"><h1 class="page-title">All styles</h1><div class="page-actions"><button class="btn">Export CSV</button></div></div>
    ${filtersBar()}
    <table class="list-table"><thead><tr>
      <th></th><th>Key</th><th>Style #</th><th>Collection</th><th>Phase</th><th>Owner</th><th>Sub-tasks</th><th>Ready</th><th>Start</th>
    </tr></thead><tbody>${rows}</tbody></table>
    ${items.length > 200 ? `<div class="muted" style="padding:12px">Showing first 200 of ${items.length}.</div>` : ''}
  `;
}

// ============ Collections (use pre-computed collections_list) ============
function viewCollections(items) {
  if (CURRENT_COLLECTION) return viewCollectionDetail(items);
  const role = ROLES[ROLE];
  const all = DATA.collections_list || [];
  // filter: only collections that have at least 1 visible child
  const visibleKeys = new Set(items.map(x=>x.key));
  const mine = all.filter(c => c.child_style_keys.some(k => visibleKeys.has(k)))
    .sort((a,b)=>b.style_count - a.style_count).slice(0,60);

  const cards = mine.map(c => {
    const visibleStyles = items.filter(it => it.category === c.name);
    const imgs = visibleStyles.filter(x=>x.images?.length).slice(0,4).map(x => `<img src="images/${x.images[0]}" loading="lazy"/>`).join('');
    const ddlnyBadge = (ROLE==='ddlny' && c.is_cross_vendor)
      ? `<span class="vendor-badge dnj" style="margin-right:4px">DNJ ${c.dnj_count}</span><span class="vendor-badge elegant">ELG ${c.elegant_count}</span>`
      : '';
    return `<div class="coll-card" onclick="CURRENT_COLLECTION='${escapeAttr(c.name)}';COLLECTION_VENDOR_TAB='all';render();">
      <div class="coll-thumbs">${imgs || '<div style="grid-column:span 2;display:flex;align-items:center;justify-content:center;color:#97A0AF">💎</div>'}</div>
      <div class="coll-body">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="coll-name">${escapeHtml(c.name)}</div>
          <span class="coll-status-chip cs-${c.status.replace(/\\W/g,'').toLowerCase()}">${c.status}</span>
        </div>
        <div class="coll-count">
          ${role.canSee.length>1 ? `${c.style_count} styles total` : `${visibleStyles.length} styles visible to you`}
          ${c.is_cross_vendor ? '<span class="pill live" style="margin-left:4px">🔀 cross-vendor</span>' : ''}
        </div>
        <div class="coll-meta" style="margin-top:4px;font-size:11px;color:#6B778C">
          ${c.customer ? `Customer: <b>${escapeHtml(c.customer)}</b> · ` : ''}Launch: ${c.launch_date} · ${c.progress_pct}% delivered
        </div>
        <div style="margin-top:6px">${ddlnyBadge}</div>
      </div>
    </div>`;
  }).join('');
  const hint = ROLE==='ddlny'
    ? 'A Collection has its own workflow (Planning → In Development → Delivered → Archived) independent of the styles inside it. 🔀 marks cross-vendor collections.'
    : `Only showing collections where ${role.projects[0].label} has at least one style. Styles belonging to the other vendor are <b>invisible</b> to you even inside these collections.`;
  return `
    <div class="breadcrumbs">Projects / ${vendorLabel()} / Collections</div>
    <div class="page-header">
      <h1 class="page-title">Collections</h1>
      <div class="page-actions"><button class="btn primary" onclick="openCreate('collection')">+ Create collection</button></div>
    </div>
    <div class="info-note" style="margin-bottom:14px">${hint}</div>
    <div class="coll-grid">${cards}</div>
  `;
}

function viewCollectionDetail(visibleItems) {
  const name = CURRENT_COLLECTION;
  const role = ROLES[ROLE];
  const coll = (DATA.collections_list || []).find(c => c.name === name) || {
    name, style_count: 0, dnj_count: 0, elegant_count: 0, is_cross_vendor: false,
    status:'Planning', customer:'', launch_date:'', target_retail_usd:0, owner:'BB', progress_pct:0,
  };
  const all = DATA.items.filter(i => i.category === name);
  const mine = visibleItems.filter(i => i.category === name);
  const dnj = all.filter(i => i.vendor === 'DNJ');
  const elg = all.filter(i => i.vendor === 'Elegant');
  const isCross = coll.is_cross_vendor;
  let shown = mine;
  if (ROLE === 'ddlny' && COLLECTION_VENDOR_TAB !== 'all') {
    shown = mine.filter(i => i.vendor === (COLLECTION_VENDOR_TAB==='dnj'?'DNJ':'Elegant'));
  }
  const owner = userLookup(coll.owner);

  return `
    <div class="breadcrumbs"><a onclick="CURRENT_COLLECTION=null;render();">Projects / ${vendorLabel()} / Collections</a> / ${escapeHtml(name)}</div>
    <div class="coll-detail-head">
      <div>
        <div style="display:flex;gap:8px;align-items:center">
          <h1 class="page-title" style="margin:0">${escapeHtml(name)}</h1>
          <span class="coll-status-chip cs-${coll.status.replace(/\\W/g,'').toLowerCase()}">${coll.status}</span>
          ${isCross && ROLE==='ddlny' ? '<span class="pill live">🔀 cross-vendor</span>' : ''}
        </div>
        <div class="muted" style="margin-top:4px;font-size:13px">
          ${ROLE==='ddlny'
            ? `Total: <b>${all.length}</b> styles (DNJ: <b>${dnj.length}</b>, Elegant: <b>${elg.length}</b>) · Owner: ${owner.name} · Customer: ${coll.customer||'—'} · Launch: ${coll.launch_date} · Target retail: $${coll.target_retail_usd}`
            : `Visible to you (${role.projects[0].label}): <b>${mine.length}</b> styles · Launch: ${coll.launch_date} ${isCross?'· <span style="color:#974F0C">other vendor portion is hidden</span>':''}`}
        </div>
      </div>
      <button class="btn" onclick="CURRENT_COLLECTION=null;render();">← Back to collections</button>
    </div>

    ${ROLE==='ddlny' && isCross ? `
      <div class="vendor-tabs">
        <div class="vendor-tab ${COLLECTION_VENDOR_TAB==='all'?'active':''}" onclick="COLLECTION_VENDOR_TAB='all';render();">All <span class="count">${mine.length}</span></div>
        <div class="vendor-tab ${COLLECTION_VENDOR_TAB==='dnj'?'active':''}" onclick="COLLECTION_VENDOR_TAB='dnj';render();">DNJ <span class="count">${dnj.length}</span></div>
        <div class="vendor-tab ${COLLECTION_VENDOR_TAB==='elegant'?'active':''}" onclick="COLLECTION_VENDOR_TAB='elegant';render();">Elegant <span class="count">${elg.length}</span></div>
      </div>` : ''}

    ${ROLE!=='ddlny' && isCross ? `
      <div class="info-note">
        🔒 This collection also has <b>${ROLE==='dnj'?elg.length:dnj.length}</b> styles assigned to the other vendor.
        They are not listed here — your Jira account can't see them. DDLNY sees all of them.
      </div>` : ''}

    <div class="gallery">${shown.map(cardHtml).join('') || '<div class="empty">No styles in this slice.</div>'}</div>
  `;
}

// ============ Reports ============
function viewReports(items) {
  const byStatus = count(items, 'status');
  const total = items.length;
  const stuck = items.filter(i => i.comments && i.comments.length >= 4).length;
  return `
    <div class="breadcrumbs">Projects / ${vendorLabel()} / Reports</div>
    <h1 class="page-title">Reports</h1>
    <div class="kpis">
      <div class="kpi info"><div class="kpi-label">Hit rate</div><div class="kpi-value">${Math.round(100*(byStatus['Received & Approved']||0)/total)}%</div><div class="kpi-delta">styles signed off</div></div>
      <div class="kpi warn"><div class="kpi-label">Drop-off</div><div class="kpi-value">${Math.round(100*(byStatus['Cancelled']||0)/total)}%</div><div class="kpi-delta">cancelled before sign-off</div></div>
      <div class="kpi"><div class="kpi-label">Rework-heavy</div><div class="kpi-value">${stuck}</div><div class="kpi-delta">≥ 4 comment iterations</div></div>
    </div>
    <div class="panel">
      <h3>Funnel (7-phase)</h3>
      ${DATA.workflow.map(s => {
        const c = byStatus[s] || 0;
        const pct = total? Math.round(100*c/total) : 0;
        return `<div class="bar-row status-active"><span class="bar-label">${s}</span><div class="bar-fill-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-count">${c}</span></div>`;
      }).join('')}
    </div>
    <div class="panel">
      <h3>Coming soon (real Jira reports we'll wire up)</h3>
      <ul>
        <li><b>Cycle time by phase</b> — avg days in Design → CAD → Sample, per vendor</li>
        <li><b>Vendor SLA</b> — % of sub-tasks completed by due date</li>
        <li><b>Rework histogram</b> — distribution of sketch/CAD change counts</li>
        <li><b>Repair rate</b> — % of Received items that end up in Repair phase</li>
      </ul>
    </div>
  `;
}

// ============ Timeline ============
function viewTimeline(items) {
  const ordered = items.filter(i=>i.start_date).sort((a,b)=>a.start_date.localeCompare(b.start_date)).slice(0,40);
  return `
    <div class="breadcrumbs">Projects / ${vendorLabel()} / Timeline</div>
    <h1 class="page-title">Timeline (simplified)</h1>
    <div class="panel">
      ${ordered.map(i => `<div class="d-milestone" style="cursor:pointer" onclick="openDrawer('${i.key}')">
        <div><b>${escapeHtml(i.style_no||i.key)}</b> · <span class="status-chip s-${phaseCls(i.status)}">${i.status}</span> ${progressPill(i)}</div>
        <div class="date">Started ${i.start_date}${i.status_date?` · Last status ${i.status_date}`:''}</div>
      </div>`).join('')}
    </div>
  `;
}

// ============ Drawer ============
function openDrawer(key) {
  CURRENT_KEY = key;
  DRAWER_TAB = 'details';
  ATTACHMENT_PHASE_FILTER = null;
  renderDrawer();
  el('drawer').classList.add('open');
}
function renderDrawer() {
  const i = DATA.items.find(x => x.key === CURRENT_KEY);
  if (!i) return;
  const p = userLookup(i.owner);
  const subs = visibleSubtasksOf(i);
  el('drawerPanel').innerHTML = `
    <div class="d-head">
      <div>
        <div class="d-sub"><span class="card-key">${i.key}</span> · ${i.vendor} project</div>
        <h2 class="d-title">${escapeHtml(i.style_no || i.key)}</h2>
        <div class="d-sub">${escapeHtml(i.category||'')}${i.is_1kt?' · 1KT':''}</div>
      </div>
      <div class="flex gap-8">
        <span class="status-chip s-${phaseCls(i.status)}">${i.status}</span>
        <button class="icon-btn" onclick="closeDrawer()">✕</button>
      </div>
    </div>
    ${renderAdvanceBanner(i)}
    <div class="d-tabs">
      ${drawerTab('details', 'Details')}
      ${drawerTab('subtasks', `Sub-tasks (${subs.length}${hiddenSubtaskCount(i)?' + '+hiddenSubtaskCount(i)+' hidden':''})`)}
      ${drawerTab('attachments', `Attachments (${(i.attachments||[]).length})`)}
      ${drawerTab('comments', `Comments (${(i.comments||[]).length})`)}
      ${drawerTab('history', `History (${(i.activity_log||[]).length})`)}
      <div class="d-tab-spacer"></div>
      ${renderTransitionButtons(i)}
    </div>
    <div class="d-body">
      ${DRAWER_TAB === 'details'     ? renderDetails(i, p)     : ''}
      ${DRAWER_TAB === 'subtasks'    ? renderSubtasks(i)       : ''}
      ${DRAWER_TAB === 'attachments' ? renderAttachments(i)    : ''}
      ${DRAWER_TAB === 'comments'    ? renderComments(i)       : ''}
      ${DRAWER_TAB === 'history'     ? renderActivityLog(i)    : ''}
    </div>
  `;
}
function drawerTab(key, label) {
  return `<div class="d-tab ${DRAWER_TAB===key?'active':''}" onclick="DRAWER_TAB='${key}';renderDrawer()">${label}</div>`;
}

// ---- Advance banner ----
function renderAdvanceBanner(i) {
  if (!i.ready_to_advance) return '';
  const gates = (i.subtasks||[]).filter(s => s.gating);
  const whoFinished = gates.length ? userLookup(gates[gates.length-1].assignee) : {name:'—'};
  const tr = (DATA.transitions||{})[i.status] || {};
  // The "next" forward phase is the first transition target that's in the workflow list (not a side lane)
  const next = Object.keys(tr).find(k => DATA.workflow.includes(k) && DATA.workflow.indexOf(k) > DATA.workflow.indexOf(i.status));
  if (!next) return '';
  const canAdvance = ROLE === 'ddlny' || (tr[next]||[]).includes('vendor');
  return `<div class="advance-banner ${canAdvance?'':'disabled'}">
    <div>
      <div class="ab-title">✅ Ready to move to <b>${next}</b></div>
      <div class="ab-sub">All gating sub-tasks complete (${i.gates_done}/${i.gates_total})${whoFinished.name !== '—' ? ` · last finished by ${whoFinished.name}` : ''}.</div>
    </div>
    <div style="display:flex;gap:6px">
      ${canAdvance ? `<button class="btn primary" onclick="doTransition('${i.key}','${escapeAttr(next)}')">Advance →</button>` : `<button class="btn disabled" disabled title="Only DDLNY can advance phase">🔒 Advance (DDLNY)</button>`}
      <button class="btn" onclick="alert('Mockup — in the live build this snoozes the banner for 24h.')">Snooze</button>
    </div>
  </div>`;
}

// ---- Details tab ----
function renderDetails(i, p) {
  const imgs = (i.images || []).slice(0,1).map(x => `<img class="d-img" src="images/${x}" loading="lazy"/>`).join('') || `<div class="d-img placeholder" style="height:240px;display:flex;align-items:center;justify-content:center">💎</div>`;
  const mile = (i.milestones||[]).map(m =>
    `<div class="d-milestone"><div>${escapeHtml(m.event)}</div><div class="date">${m.date||''}</div></div>`).join('') || '<div class="muted">No milestones logged.</div>';
  return `
    <div class="d-cols">
      <div>${imgs}</div>
      <div class="d-fields">
        <div class="d-field"><label>Style #</label><span>${escapeHtml(i.style_no||'—')}</span></div>
        <div class="d-field"><label>PO # / D-code</label><span>${escapeHtml(i.po_no||'—')}</span></div>
        <div class="d-field"><label>Owner (DDLNY)</label><span><span class="mini-avatar" style="background:${p.color};display:inline-flex;margin-right:6px">${p.initials}</span>${p.name}</span></div>
        <div class="d-field"><label>Vendor</label><span>${i.vendor}</span></div>
        <div class="d-field"><label>Collection</label><span>${escapeHtml(i.category||'—')}</span></div>
        <div class="d-field"><label>Source</label><span>${escapeHtml(i.source||'—')}</span></div>
        <div class="d-field"><label>Start date</label><span>${i.start_date||'—'}</span></div>
        <div class="d-field"><label>Last status</label><span>${i.status_date||'—'}</span></div>
        <div class="d-field"><label>Sketches</label><span>${i.no_of_sketch||'—'}</span></div>
        <div class="d-field"><label>Sketch changes</label><span>${i.sketch_changes||'—'}</span></div>
        <div class="d-field"><label>CAD changes</label><span>${i.cad_changes||'—'}</span></div>
        <div class="d-field"><label>Diamond quality</label><span>${escapeHtml(i.diamond_quality||'—')}</span></div>
        <div class="d-field"><label>Priority</label><span>${i.priority||'—'}</span></div>
      </div>
    </div>
    <div class="d-section"><h4>Milestone log</h4>${mile}</div>
    ${i.apr13_comments ? `<div class="d-section"><h4>13-Apr DDLNY note</h4><div class="d-milestone">${escapeHtml(i.apr13_comments)}</div></div>` : ''}
  `;
}

// ---- Sub-tasks tab ----
function renderSubtasks(i) {
  const allSubs = i.subtasks || [];
  const hidden = hiddenSubtaskCount(i);
  const visSubs = visibleSubtasksOf(i);

  const statusCls = { 'To Do':'s-todo','In Progress':'s-inprogress','Done':'s-done' };

  return `<div class="d-section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:13px;color:#6B778C">
        ${visSubs.length} sub-task${visSubs.length===1?'':'s'} visible to you
        ${hidden ? ` · <span style="color:#974F0C"><b>${hidden} hidden sub-task${hidden===1?'':'s'}</b> (DDLNY-only, you can't see their content or assignees)</span>` : ''}
        · Gating: ${i.gates_done||0}/${i.gates_total||0} complete
      </div>
      <button class="btn primary" onclick="openCreate('subtask','${i.key}')">+ Sub-task</button>
    </div>

    <div class="subtasks">
      ${visSubs.map(s => {
        const asg = userLookup(s.assignee);
        const overdue = s.status !== 'Done' && s.due_date < DATA.today;
        return `<div class="subtask-row ${s.gating?'gating':''}">
          <div class="st-left">
            <span class="st-icon">${DATA.templates?.[s.template]?.icon || '·'}</span>
            <div>
              <div class="st-title">
                ${escapeHtml(s.summary)}
                ${s.gating ? '<span class="st-tag gate" title="Gating sub-task: must be done for phase to advance">GATE</span>' : ''}
                ${s.ddlny_only ? '<span class="st-tag ddlny" title="Only DDLNY users see this sub-task">DDLNY-only</span>' : ''}
              </div>
              <div class="st-meta">
                <span class="mini-avatar" style="background:${asg.color};width:16px;height:16px;font-size:9px">${asg.initials}</span>
                <span>${asg.name}</span>
                <span class="sep">·</span>
                <span>${s.key}</span>
                <span class="sep">·</span>
                <span class="${overdue?'overdue':''}">Due ${s.due_date}</span>
                <span class="sep">·</span>
                <span>Created in ${s.phase_when_created}</span>
              </div>
            </div>
          </div>
          <div class="st-right">
            <select class="st-status ${statusCls[s.status]||''}" onchange="updateSubtaskStatus('${i.key}','${s.key}',this.value)">
              <option ${s.status==='To Do'?'selected':''}>To Do</option>
              <option ${s.status==='In Progress'?'selected':''}>In Progress</option>
              <option ${s.status==='Done'?'selected':''}>Done</option>
            </select>
            <button class="icon-btn" title="Reassign (loose — anyone in project can)" onclick="reassignSubtask('${i.key}','${s.key}')">↔</button>
          </div>
        </div>`;
      }).join('') || '<div class="muted">No sub-tasks yet. Click <b>+ Sub-task</b> to create one.</div>'}
    </div>

    ${hidden ? `<div class="info-note" style="background:#FFF0B3;border-color:#FFC400;color:#974F0C;margin-top:10px">
      🔒 <b>${hidden} hidden sub-task${hidden===1?'':'s'}</b> in this Style are DDLNY-only — your account knows they exist but can't read the summary, assignee, or due date. DDLNY can toggle visibility per sub-task.
    </div>` : ''}

    <div class="info-note">
      💡 <b>Loose reassignment:</b> anyone in this project (DDLNY + vendor users) can reassign a sub-task. Every reassignment is recorded in the History tab with the original and new assignee.
    </div>
  </div>`;
}

function updateSubtaskStatus(parentKey, subKey, newStatus) {
  const i = DATA.items.find(x => x.key === parentKey);
  const s = i.subtasks.find(x => x.key === subKey);
  if (!s) return;
  const old = s.status;
  s.status = newStatus;
  // Recompute progress + gates
  const visSubs = visibleSubtasksOf(i);
  i.subtask_progress = { done: visSubs.filter(x=>x.status==='Done').length, total: visSubs.length };
  const gates = (i.subtasks||[]).filter(x => x.gating);
  i.gates_done = gates.filter(x => x.status==='Done').length;
  i.gates_total = gates.length;
  i.ready_to_advance = i.gates_total>0 && i.gates_done===i.gates_total && DATA.workflow.indexOf(i.status) < DATA.workflow.length-1;
  (i.activity_log ||= []).push({
    ts: new Date().toISOString(), user: ROLES[ROLE].initials, user_name: ROLES[ROLE].name,
    kind: 'subtask_status', field: s.summary, from: old, to: newStatus, detail: `sub-task "${s.summary}" moved to ${newStatus}`,
  });
  renderDrawer();
  render();
}

function reassignSubtask(parentKey, subKey) {
  const who = prompt('Reassign to user ID (BB, VW, JW, Avi, RP, AM_DNJ, NS_DNJ, PS_ELG, KM_ELG):');
  if (!who) return;
  const i = DATA.items.find(x => x.key === parentKey);
  const s = i.subtasks.find(x => x.key === subKey);
  if (!s) return;
  const old = s.assignee;
  s.assignee = who;
  (i.activity_log ||= []).push({
    ts: new Date().toISOString(), user: ROLES[ROLE].initials, user_name: ROLES[ROLE].name,
    kind: 'subtask_reassign', field: 'Assignee', from: old, to: who, detail: `sub-task "${s.summary}" reassigned`,
  });
  renderDrawer();
}

// ---- Attachments tab ----
function renderAttachments(i) {
  const atts = i.attachments || [];
  const phases = [...new Set(atts.map(a=>a.phase))];
  const filtered = ATTACHMENT_PHASE_FILTER ? atts.filter(a=>a.phase===ATTACHMENT_PHASE_FILTER) : atts;
  const iconFor = (mime) => mime.includes('image') ? '🖼️' : mime.includes('pdf') ? '📄' : mime.includes('spreadsheet') ? '📊' : '📎';
  return `
    <div class="d-section">
      <h4 style="display:flex;justify-content:space-between;align-items:center">
        <span>All attachments (persist across all phases)</span>
        <span style="font-weight:400;color:#6B778C;font-size:12px">Uploading now adds to current phase: <b>${i.status}</b></span>
      </h4>
      <div class="filters" style="margin-bottom:10px">
        <span class="muted">Filter by phase uploaded:</span>
        <span class="filter-chip ${!ATTACHMENT_PHASE_FILTER?'active':''}" onclick="ATTACHMENT_PHASE_FILTER=null;renderDrawer()">All (${atts.length})</span>
        ${phases.map(ph => `<span class="filter-chip ${ATTACHMENT_PHASE_FILTER===ph?'active':''}" onclick="ATTACHMENT_PHASE_FILTER='${escapeAttr(ph)}';renderDrawer()">
          ${ph} (${atts.filter(a=>a.phase===ph).length})
        </span>`).join('')}
      </div>
      <div class="attach-grid">
        ${filtered.map(a => {
          const user = userLookup(a.uploaded_by);
          return `<div class="attach-card">
            ${a.is_cad && a.thumb ? `<img src="images/${a.thumb}" class="attach-thumb" loading="lazy"/>`
              : `<div class="attach-thumb placeholder">${iconFor(a.mime)}</div>`}
            <div class="attach-meta">
              <div class="attach-name" title="${escapeAttr(a.filename)}">${escapeHtml(a.filename)}</div>
              <div class="muted" style="font-size:11px">${Math.round(a.size_kb)} KB · ${a.uploaded_at}</div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
                <span class="mini-avatar" style="background:${user.color};width:16px;height:16px;font-size:9px">${user.initials}</span>
                <span style="font-size:11px">${escapeHtml(a.uploaded_by_name||'')}</span>
              </div>
              <div style="margin-top:4px"><span class="phase-tag s-${phaseCls(a.phase)}">added in ${a.phase}</span></div>
            </div>
          </div>`;
        }).join('') || '<div class="muted">No files in this phase.</div>'}
      </div>
      <div class="info-note">
        💡 <b>Jira behavior:</b> attachments are bound to the issue, not the phase. A file added during R&D is still visible in every later phase.
        The "added in" tag is a custom field we'll add so you can filter the evolution of artifacts over time.
      </div>
    </div>
  `;
}

// ---- Comments tab ----
function renderComments(i) {
  const comments = (i.comments||[]).map(c => {
    const ap = userLookup(c.author);
    return `<div class="d-comment">
      <span class="mini-avatar" style="background:${ap.color}">${ap.initials}</span>
      <div class="body">
        <div class="meta"><b>${ap.name}</b> · ${c.date||'—'}</div>
        <div>${escapeHtml(c.body||'')}</div>
      </div>
    </div>`;
  }).join('') || '<div class="muted">No comments yet.</div>';
  return `<div class="d-section">${comments}
    <div class="d-comment" style="margin-top:16px">
      <span class="mini-avatar" style="background:${ROLES[ROLE].color}">${ROLES[ROLE].initials}</span>
      <div class="body" style="flex:1">
        <textarea placeholder="Add a comment… (mockup)" style="width:100%;border:1px solid #DFE1E6;border-radius:3px;padding:6px;min-height:40px"></textarea>
      </div>
    </div>
  </div>`;
}

// ---- History tab ----
function renderActivityLog(i) {
  const events = i.activity_log || [];
  return `<div class="d-section">
    <div class="muted" style="margin-bottom:10px;font-size:12px">
      Every change is recorded automatically by Jira. Timestamps, user, exact before→after values. Immutable — nobody can edit or delete.
    </div>
    <div class="timeline">
      ${events.map(ev => {
        const u = userLookup(ev.user);
        const icon = {created:'➕', status_changed:'🔁', attachment_added:'📎', commented:'💬', subtask_status:'🧩', subtask_reassign:'↔'}[ev.kind] || '✏️';
        let body = '';
        if (ev.kind==='status_changed')
          body = `changed <b>Status</b> from <span class="status-chip s-${phaseCls(ev.from)}">${ev.from}</span> to <span class="status-chip s-${phaseCls(ev.to)}">${ev.to}</span>`;
        else if (ev.kind==='attachment_added')
          body = `attached <code>${escapeHtml(ev.to)}</code>`;
        else if (ev.kind==='commented')
          body = `commented: <i>${escapeHtml((ev.to||'').slice(0,120))}</i>`;
        else if (ev.kind==='created')
          body = escapeHtml(ev.detail||'created issue');
        else if (ev.kind==='subtask_status')
          body = `moved sub-task <i>${escapeHtml(ev.field)}</i> from <b>${ev.from}</b> to <b>${ev.to}</b>`;
        else if (ev.kind==='subtask_reassign')
          body = `reassigned sub-task from <b>${ev.from}</b> to <b>${ev.to}</b>`;
        else
          body = `updated <b>${ev.field}</b>`;
        return `<div class="tl-event">
          <div class="tl-dot">${icon}</div>
          <div>
            <div><span class="mini-avatar" style="background:${u.color};display:inline-flex;margin-right:6px;width:20px;height:20px;font-size:10px">${u.initials}</span>
              <b>${escapeHtml(ev.user_name||ev.user)}</b> ${body}</div>
            <div class="muted" style="font-size:11px">${(ev.ts||'').replace('T',' ').replace('Z','')}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ---- Transition buttons ----
function renderTransitionButtons(i) {
  const availFor = (DATA.transitions || {})[i.status] || {};
  const entries = Object.entries(availFor);
  if (!entries.length) return '';
  return `<div class="d-transitions">
    ${entries.map(([target, allowed]) => {
      const isDDLNY = ROLE==='ddlny';
      const canDo = allowed.includes('any')
        || (isDDLNY && allowed.includes('ddlny-pd'))
        || (!isDDLNY && allowed.includes('vendor'));
      const cls = canDo ? 'btn primary' : 'btn disabled';
      const tip = canDo ? `Move to ${target}` : `Restricted — only ${allowed.join(', ')} can do this`;
      return `<button class="${cls}" title="${tip}" ${canDo?`onclick="doTransition('${i.key}','${escapeAttr(target)}')"`:'disabled'}>
        ${canDo ? '→ ' : '🔒 '}${target}
      </button>`;
    }).join('')}
  </div>`;
}
function doTransition(key, target) {
  const i = DATA.items.find(x=>x.key===key);
  if (!i) return;
  const from = i.status;
  i.status = target;
  i.status_date = new Date().toISOString().slice(0,10);
  i.ready_to_advance = false; // reset until gates in new phase are complete
  (i.activity_log ||= []).push({
    ts: new Date().toISOString(),
    user: ROLES[ROLE].initials, user_name: ROLES[ROLE].name,
    kind: 'status_changed', field: 'Status', from, to: target, detail: null,
  });
  DRAWER_TAB = 'history';
  renderDrawer();
  render();
}
function closeDrawer() { el('drawer').classList.remove('open'); }

// ============ Create modal (3-flow) ============
function openCreate(preset, parentKey) {
  CREATE_STEP = preset || 'picker';
  CREATE_SUBTASK_PARENT = parentKey || null;
  renderCreate();
  el('createModal').classList.add('open');
}

function renderCreate() {
  let body = '';
  if (CREATE_STEP === 'picker') body = createPicker();
  else if (CREATE_STEP === 'style') body = createStyleForm();
  else if (CREATE_STEP === 'collection') body = createCollectionForm();
  else if (CREATE_STEP === 'subtask') body = createSubtaskForm();
  el('createBody').innerHTML = body;
}

function createPicker() {
  const card = (key, icon, title, subtitle) =>
    `<div class="create-type" onclick="CREATE_STEP='${key}';renderCreate();">
      <div class="ct-icon">${icon}</div>
      <div class="ct-title">${title}</div>
      <div class="ct-sub">${subtitle}</div>
    </div>`;
  return `
    <div class="muted" style="margin-bottom:12px">Pick what you want to create. Each flow has a different set of fields.</div>
    <div class="create-types">
      ${card('style',     '💎', 'Style',     'A single piece of jewelry (most common)')}
      ${card('collection','📚', 'Collection','A themed group of styles with its own timeline + customer')}
      ${card('subtask',   '🧩', 'Sub-task',  'A specific to-do under an existing Style')}
    </div>
    <div class="info-note" style="margin-top:14px">
      💡 Style is the default: create one per new piece of jewelry. Collection groups multiple styles. Sub-task is for action items under an existing Style (usually created from inside a Style's drawer).
    </div>
  `;
}

function createStyleForm() {
  const ownerOpts = Object.entries(DATA.people).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join('');
  return `
    <div class="create-back"><a onclick="CREATE_STEP='picker';renderCreate();">← Pick a different type</a></div>
    <h3 class="ct-form-title">💎 Create Style</h3>

    <div class="ct-section-head">Basics</div>
    <div class="field-row"><label>Project <span class="req">*</span></label>
      <select id="f_project" onchange="updateSecurityHint()"><option value="DNJ">DNJ</option><option value="ELG">Elegant</option></select></div>
    <div class="field-row"><label>Vendor <span class="req">*</span></label>
      <select id="f_vendor" onchange="updateSecurityHint()"><option value="DNJ">DNJ</option><option value="Elegant">Elegant</option></select></div>
    <div class="field-row"><label>Summary <span class="req">*</span></label>
      <input id="f_summary" placeholder="e.g. Twinkling diamond earring v2"></div>
    <div class="field-row"><label>Style # <span class="req">*</span></label>
      <input id="f_styleno" placeholder="e.g. E256228LY" pattern="[A-Z0-9]+"></div>
    <div class="field-row"><label>PO # / D-code</label>
      <input id="f_pono" placeholder="e.g. D39 APR 260212 (optional at creation)"></div>

    <div class="ct-section-head">Classification</div>
    <div class="field-row"><label>Collection (Epic link)</label>
      <select id="f_collection"><option value="">— none / new —</option>
        ${(DATA.collections_list||[]).slice(0,30).map(c=>`<option value="${escapeAttr(c.key)}">${escapeHtml(c.name)} (${c.style_count} styles)</option>`).join('')}
      </select></div>
    <div class="field-row"><label>Category tag</label>
      <input id="f_category" placeholder="e.g. Tappered Modulation" list="f_category_list">
      <datalist id="f_category_list">
        ${[...new Set(DATA.items.map(i=>i.category).filter(Boolean))].slice(0,50).map(c=>`<option value="${escapeAttr(c)}"/>`).join('')}
      </datalist></div>
    <div class="field-row"><label>Source</label>
      <select id="f_source"><option>MOM meeting</option><option>Mails</option><option>Store visit</option><option>Customer request</option><option>R&D initiative</option></select></div>

    <div class="ct-section-head">People + priority</div>
    <div class="field-row"><label>Owner (DDLNY)</label><select id="f_owner">${ownerOpts}</select></div>
    <div class="field-row"><label>Priority</label>
      <select id="f_priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></div>
    <div class="field-row"><label>1KT flag</label><input id="f_1kt" type="checkbox"></div>

    <div class="ct-section-head">Design inputs</div>
    <div class="field-row"><label>Diamond quality</label><input id="f_diamond" placeholder="e.g. LGD VVS F-G"></div>
    <div class="field-row"><label>Reference URL</label><input id="f_refurl" placeholder="https://kendrascott.com/..."></div>
    <div class="field-row"><label>Moodboard</label>
      <input id="f_files" type="file" multiple>
      <div class="muted" style="font-size:11px;margin-top:2px">PNG/JPG/PDF — up to 10 files. Will be tagged "added in Concept/R&D".</div>
    </div>
    <div class="field-row"><label>Description</label>
      <textarea id="f_desc" rows="3" placeholder="Concept notes — what does this piece need to achieve?"></textarea></div>

    <div class="ct-section-head">Security (auto-set)</div>
    <div id="security_hint" class="security-hint"></div>

    <div class="ct-footer">
      <label style="font-size:12px"><input type="checkbox"> Create another after this</label>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="closeCreate()">Cancel</button>
        <button class="btn primary" onclick="alert('Mockup — in the live build this POSTs /rest/api/3/issue.');closeCreate();">Create</button>
      </div>
    </div>
  `;
}

function createCollectionForm() {
  return `
    <div class="create-back"><a onclick="CREATE_STEP='picker';renderCreate();">← Pick a different type</a></div>
    <h3 class="ct-form-title">📚 Create Collection</h3>
    <div class="muted" style="margin-bottom:12px">A Collection has its own workflow (Planning → In Development → Delivered → Archived) independent of the styles inside it.</div>

    <div class="ct-section-head">Basics</div>
    <div class="field-row"><label>Name <span class="req">*</span></label><input placeholder="e.g. Twinkling Bridal 2026"></div>
    <div class="field-row"><label>Description</label>
      <textarea rows="2" placeholder="What's the theme / pitch for this collection?"></textarea></div>
    <div class="field-row"><label>Customer</label>
      <select><option>— select —</option><option>JCP</option><option>Sam's Club</option><option>Macy's</option><option>Kohl's</option><option>Direct DDLNY</option><option>Other…</option></select></div>

    <div class="ct-section-head">Dates + pricing</div>
    <div class="field-row"><label>Launch date</label><input type="date"></div>
    <div class="field-row"><label>Target retail USD</label><input type="number" placeholder="99" min="0"></div>

    <div class="ct-section-head">Vendors</div>
    <div class="field-row"><label>Assigned vendors</label>
      <div><label style="font-size:13px"><input type="checkbox" checked> DNJ</label> &nbsp;
           <label style="font-size:13px"><input type="checkbox"> Elegant</label></div>
    </div>
    <div class="field-row"><label>Owner (DDLNY)</label>
      <select>${Object.entries(DATA.people).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join('')}</select>
    </div>

    <div class="ct-section-head">Moodboard</div>
    <div class="field-row"><label>Files</label><input type="file" multiple></div>

    <div class="info-note" style="margin-top:12px">
      🔀 If you assign both DNJ and Elegant, this is a <b>cross-vendor collection</b>. Each vendor sees the collection shell + only their own child styles. DDLNY sees everything with vendor tabs.
    </div>

    <div class="ct-footer">
      <div></div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="closeCreate()">Cancel</button>
        <button class="btn primary" onclick="alert('Mockup — would create a Collection issue type in Jira.');closeCreate();">Create</button>
      </div>
    </div>
  `;
}

function createSubtaskForm() {
  const parent = DATA.items.find(x => x.key === CREATE_SUBTASK_PARENT);
  const tpl = DATA.templates || {};
  const tplButtons = ['request_feedback','request_revision','upload_cad','send_bom','send_proforma','ship_sample']
    .map(k => {
      const t = tpl[k] || {icon:'·', label:k};
      return `<button class="template-btn" onclick="fillSubtaskTemplate('${k}')">
        <span class="tb-icon">${t.icon}</span><span class="tb-label">${t.label}</span></button>`;
    }).join('');

  const allUsers = DATA.all_users || {};
  const userOpts = Object.entries(allUsers).map(([k,u]) => `<option value="${k}">${u.name}</option>`).join('');

  return `
    <div class="create-back"><a onclick="CREATE_STEP='picker';renderCreate();">← Pick a different type</a></div>
    <h3 class="ct-form-title">🧩 Create Sub-task ${parent ? `on <span class="card-key">${parent.key}</span>` : ''}</h3>

    ${!parent ? `
      <div class="field-row"><label>Parent Style <span class="req">*</span></label>
        <input id="f_parent" placeholder="Search by key or style #" list="f_parent_list"/>
        <datalist id="f_parent_list">
          ${DATA.items.slice(0,60).map(i=>`<option value="${i.key}">${escapeHtml(i.style_no||'')}</option>`).join('')}
        </datalist></div>
    ` : ''}

    <div class="ct-section-head">Templates (quick-create)</div>
    <div class="template-grid">${tplButtons}</div>
    <div style="text-align:center;margin:6px 0;font-size:11px;color:#6B778C">or</div>
    <button class="template-btn custom" onclick="fillSubtaskTemplate('custom')">
      <span class="tb-icon">＋</span><span class="tb-label">Custom sub-task (blank form)</span>
    </button>

    <div class="ct-section-head">Details</div>
    <div class="field-row"><label>Summary <span class="req">*</span></label>
      <input id="st_summary" placeholder="e.g. Baiju: approve sketch v2"></div>
    <div class="field-row"><label>Assignee <span class="req">*</span></label>
      <select id="st_assignee"><option value="">— pick —</option>${userOpts}</select></div>
    <div class="field-row"><label>Due date</label><input id="st_due" type="date"></div>
    <div class="field-row"><label>Description</label>
      <textarea id="st_desc" rows="3" placeholder="What needs to happen here?"></textarea></div>

    <div class="ct-section-head">Flags</div>
    <div class="field-row"><label>Gating</label>
      <label style="font-size:13px"><input id="st_gating" type="checkbox" checked>
        Must be completed for parent Style to advance phase</label></div>
    <div class="field-row"><label>Visibility</label>
      <label style="font-size:13px"><input id="st_ddlny" type="checkbox">
        DDLNY-only — hide from vendor (vendor sees "1 hidden sub-task" placeholder)</label></div>

    <div class="ct-footer">
      <label style="font-size:12px"><input type="checkbox"> Create another</label>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="closeCreate()">Cancel</button>
        <button class="btn primary" onclick="alert('Mockup — would POST /rest/api/3/issue with issuetype=Sub-task.');closeCreate();">Create</button>
      </div>
    </div>
  `;
}

function fillSubtaskTemplate(key) {
  const t = (DATA.templates||{})[key];
  if (!t) return;
  const summary = t.summary_tpl.replace('{what}','sketch v2').replace('{custom}','');
  const desc = t.description || '';
  if (el('st_summary')) el('st_summary').value = summary;
  if (el('st_desc'))    el('st_desc').value    = desc;
  if (el('st_gating'))  el('st_gating').checked = !!t.gating;
  if (el('st_ddlny'))   el('st_ddlny').checked  = !!t.ddlny_only;
  // Auto-pick assignee: ddlny-pd or vendor role
  if (el('st_assignee')) {
    if (t.assignee_role === 'ddlny-pd') el('st_assignee').value = 'BB';
    else el('st_assignee').value = 'RP';
  }
}

function updateSecurityHint() {
  const h = el('security_hint'); if (!h) return;
  const proj = el('f_project')?.value || 'DNJ';
  const vendor = el('f_vendor')?.value || 'DNJ';
  const match = (proj==='DNJ'&&vendor==='DNJ') || (proj==='ELG'&&vendor==='Elegant');
  h.innerHTML = match
    ? `<span class="sec-ok">🔒 Auto-security: <b>${vendor} Visible</b>. Only DDLNY staff + ${vendor} vendor users will see this style.</span>`
    : `<span class="sec-warn">⚠ Vendor (${vendor}) doesn't match project (${proj}). In the live build this would block creation — styles live in one vendor project at a time.</span>`;
}

function closeCreate() {
  el('createModal').classList.remove('open');
  CREATE_STEP = 'picker';
  CREATE_SUBTASK_PARENT = null;
}

// ============ Small helpers ============
function count(arr, key) {
  const c = {};
  arr.forEach(x => { const k = x[key]; if (k) c[k] = (c[k]||0)+1; });
  return c;
}
function filtersBar() {
  const active = Object.entries(FILTERS).filter(([k,v])=> v && k!=='search');
  if (!active.length) return '';
  return `<div class="filters">
    <span class="muted">Filters:</span>
    ${active.map(([k,v]) => `<span class="filter-chip active">${k}: ${escapeHtml(v)} <span onclick="FILTERS.${k}=null;render();event.stopPropagation();">✕</span></span>`).join('')}
    <span class="filter-chip" onclick="FILTERS={owner:null,category:null,status:null,priority:null,search:FILTERS.search};render();">Clear all</span>
  </div>`;
}
function chip(label, key, val) {
  const active = FILTERS[key] === val;
  return `<span class="filter-chip ${active?'active':''}" onclick="FILTERS.${key}=${val===null?'null':`'${escapeAttr(val)}'`};render();">${label}</span>`;
}
function bindCards() {
  document.querySelectorAll('.card[data-key], tr[data-key]').forEach(c => {
    c.addEventListener('click', () => openDrawer(c.dataset.key));
  });
}
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function vendorLabel() {
  const r = ROLES[ROLE]; return r.projects.map(p=>p.label).join(' + ');
}
function phaseCls(s) { return String(s||'').replace(/\W/g,'').toLowerCase(); }

// ============ Window exports ============
Object.defineProperty(window, 'DRAWER_TAB', {get:()=>DRAWER_TAB, set:(v)=>{DRAWER_TAB=v}});
Object.defineProperty(window, 'ATTACHMENT_PHASE_FILTER', {get:()=>ATTACHMENT_PHASE_FILTER, set:(v)=>{ATTACHMENT_PHASE_FILTER=v}});
Object.defineProperty(window, 'CURRENT_COLLECTION', {get:()=>CURRENT_COLLECTION, set:(v)=>{CURRENT_COLLECTION=v}});
Object.defineProperty(window, 'COLLECTION_VENDOR_TAB', {get:()=>COLLECTION_VENDOR_TAB, set:(v)=>{COLLECTION_VENDOR_TAB=v}});
Object.defineProperty(window, 'CREATE_STEP', {get:()=>CREATE_STEP, set:(v)=>{CREATE_STEP=v}});
Object.defineProperty(window, 'CREATE_SUBTASK_PARENT', {get:()=>CREATE_SUBTASK_PARENT, set:(v)=>{CREATE_SUBTASK_PARENT=v}});
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.openCreate = openCreate;
window.closeCreate = closeCreate;
window.render = render;
window.renderDrawer = renderDrawer;
window.renderCreate = renderCreate;
window.doTransition = doTransition;
window.updateSubtaskStatus = updateSubtaskStatus;
window.reassignSubtask = reassignSubtask;
window.fillSubtaskTemplate = fillSubtaskTemplate;
window.updateSecurityHint = updateSecurityHint;
window.FILTERS = FILTERS;
window.VIEW = VIEW;

init();
