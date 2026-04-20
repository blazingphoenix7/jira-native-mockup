/* ========================================================================
   mockup-native — renders the native Jira Cloud UI using the same data as
   ../mockup/ but with NO custom-UI flourishes. Only features that a Jira
   Cloud Standard admin could configure from the settings pages.

   Updated to model the 3-project architecture for Collections:
     • DNJ project — DNJ vendor's styles
     • ELG project — Elegant vendor's styles
     • PD  project — Cross-vendor Collections (Product Development)
   ======================================================================== */

/* ---------------- State ---------------- */
let DATA = null;
let ROLE = 'ddlny';                 // ddlny | dnj | elegant
let PROJECT = 'DNJ';                // currently-open project: DNJ | ELG | PD
let VIEW = 'board';                 // summary | timeline | backlog | board | calendar | list | forms | goals | pages
let FILTERS = { search: '', assignee: null, priority: null, type: null };
let CURRENT_KEY = null;
let ISSUE_TAB = 'comments';         // comments | history | worklog
let CREATE_STEP = { type: 'Style' };
// Top-level (cross-project) views owned by the global nav, not the project sidebar.
// When non-null, overrides the project VIEW render.
let TOP_VIEW = null;                // 'your-work' | 'dashboards' | 'dashboard' | 'filters' | 'filter-results' | 'search' | null
let DASHBOARD_KEY = 'wincys-pd-overview';
let FILTER_KEY = null;

/* Dashboards DDLNY would build on day one — all native Jira Cloud gadgets. */
const DASHBOARDS = [
  { key: 'wincys-pd-overview',  name: "Wincy's PD Overview",        owner: 'AM', shared: ['ddlny-pd'] },
  { key: 'ddlny-exec',          name: 'DDLNY Leadership Exec View', owner: 'AM', shared: ['ddlny-pd'] },
  { key: 'vendor-dnj',          name: 'Vendor Dashboard — DNJ',     owner: 'AM', shared: ['ddlny-pd','vendor-dnj'] },
  { key: 'vendor-elg',          name: 'Vendor Dashboard — Elegant', owner: 'AM', shared: ['ddlny-pd','vendor-elegant'] },
  { key: 'collection-pipeline', name: 'Collection Pipeline',        owner: 'AM', shared: ['ddlny-pd','vendor-dnj','vendor-elegant'] },
];

/* Saved JQL filters surfaced on the Filters page + sidebar shortcuts. */
const SAVED_FILTERS = [
  { key: 'my-open',         name: 'My open styles',                     jql: 'assignee = currentUser() AND status != Done' },
  { key: 'overdue',         name: 'Overdue sub-tasks',                  jql: 'issuetype = Sub-task AND duedate < now() AND status != Done' },
  { key: '1kt-hot',         name: '1KT hot styles',                     jql: '"1KT" = true' },
  { key: 'cad-stuck',       name: 'Styles stuck in CAD > 14 days',      jql: 'status = "CAD" AND updated < -14d' },
  { key: 'cross-vendor-q3', name: 'Cross-vendor collections — Q3 2026', jql: 'issuetype = Collection AND "Cross-vendor" = true AND "Launch Date" >= "2026-07-01" AND "Launch Date" < "2026-10-01"' },
];

const el = (id) => document.getElementById(id);

/* ---------------- Role + permission model ---------------- */
const ROLES = {
  ddlny:   {
    name: 'Aaryan M.', initials: 'AM', color: '#0052CC',
    canSee: ['DNJ', 'Elegant'],
    projectsVisible: ['DNJ', 'ELG', 'PD'],
  },
  dnj:     {
    name: 'Rajesh P.', initials: 'RP', color: '#6554C0',
    canSee: ['DNJ'],
    projectsVisible: ['DNJ', 'PD'],
  },
  elegant: {
    name: 'Priya S.', initials: 'PS', color: '#FF5630',
    canSee: ['Elegant'],
    projectsVisible: ['ELG', 'PD'],
  },
};

/* ---------------- Project metadata ---------------- */
const PROJECTS = {
  DNJ: { name: 'DNJ',                 avatar: 'DNJ', color: '#6554C0', type: 'Software project', kind: 'vendor' },
  ELG: { name: 'Elegant',             avatar: 'ELG', color: '#FF5630', type: 'Software project', kind: 'vendor' },
  PD:  { name: 'Product Development', avatar: 'PD',  color: '#00875A', type: 'Business project', kind: 'cross'  },
};

/* ---------------- Status-category mappings (ADS lozenge colors) ---------- */
const STATUS_CATEGORY = {
  'Concept/R&D':         'new',
  'Design':              'in-progress',
  'CAD':                 'in-progress',
  'PO':                  'in-progress',
  'Sample Production':   'in-progress',
  'Received & Approved': 'done',
  'Repair':              'in-progress',
  'Hold':                'default',
  'Cancelled':           'removed',
};
const COLL_STATUS_CATEGORY = {
  'Planning':        'default',
  'In Development':  'in-progress',
  'Delivered':       'done',
  'Archived':        'default',
};

const TYPE_LABEL = { Style: 'S', Collection: 'E', 'Sub-task': '↳' };
const TYPE_CLASS = { Style: 'style', Collection: 'collection', 'Sub-task': 'subtask' };

/* ---------------- Init ---------------- */
async function init() {
  const res = await fetch('../mockup/data.json');
  DATA = await res.json();
  precomputeStyleCollectionKeys();
  bindUI();
  applyRole();
}

function precomputeStyleCollectionKeys() {
  // Each Style has a `category` field (the collection name). Map it to the
  // synthesized PD issue key so the Style drawer's Collection field can link
  // straight to the PD issue.
  const byName = {};
  (DATA.collections_list || []).forEach((c, idx) => { byName[c.name] = `PD-${idx + 1}`; });
  DATA.items.forEach(i => {
    if (i.category && byName[i.category]) i._collectionPdKey = byName[i.category];
  });
}

function bindUI() {
  el('roleSelect').addEventListener('change', (e) => { ROLE = e.target.value; applyRole(); });

  // Global search — when there's a query, switch to cross-project Search Results.
  // Clearing the box returns to whatever view we were on before.
  el('globalSearch').addEventListener('input', (e) => {
    FILTERS.search = e.target.value.toLowerCase();
    if (FILTERS.search) {
      TOP_VIEW = 'search';
    } else if (TOP_VIEW === 'search') {
      TOP_VIEW = null;
    }
    render();
  });

  // Top-nav cross-project links (data-topnav attribute added in index.html)
  document.querySelectorAll('[data-topnav]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.topnav;
      if (v === 'your-work')   openYourWork();
      else if (v === 'dashboards') openDashboardsPage();
      else if (v === 'filters')    openFiltersPage();
      else if (v === 'projects')   openProjectView();
    });
  });

  // Notifications bell
  const bell = document.querySelector('[data-notif-btn]');
  if (bell) bell.addEventListener('click', (ev) => toggleNotifications(ev));

  // Close popovers on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-menu') && !e.target.closest('.status-btn')) hideStatusMenu();
    if (!e.target.closest('.proj-sw-menu') && !e.target.closest('.proj-switcher')) hideProjectSwitcher();
    if (!e.target.closest('.notifications-menu') && !e.target.closest('[data-notif-btn]')) hideNotifications();
  });
}

function applyRole() {
  const r = ROLES[ROLE];
  el('currentAvatar').textContent = r.initials;
  el('currentAvatar').style.background = r.color;
  // Default project = first visible to this role (DDLNY → DNJ, DNJ → DNJ, Elegant → ELG)
  PROJECT = r.projectsVisible[0];
  VIEW = 'board';
  // Clear search + top-level view state — fresh login feel
  FILTERS.search = '';
  const s = el('globalSearch'); if (s) s.value = '';
  TOP_VIEW = null;
  renderSidebar();
  render();
  updateNotificationBadge();
  updateTopNavActive();
}

/* ---------------- Visible data ---------------- */
function visibleItems() {
  const r = ROLES[ROLE];
  let items = DATA.items.filter(i => r.canSee.includes(i.vendor));
  // Narrow to the project currently open in the sidebar
  if (PROJECT === 'DNJ') items = items.filter(i => i.vendor === 'DNJ');
  if (PROJECT === 'ELG') items = items.filter(i => i.vendor === 'Elegant');
  if (FILTERS.search) {
    const q = FILTERS.search;
    items = items.filter(i =>
      (i.style_no||'').toLowerCase().includes(q) ||
      (i.po_no||'').toLowerCase().includes(q) ||
      (i.category||'').toLowerCase().includes(q) ||
      (i.key||'').toLowerCase().includes(q)
    );
  }
  if (FILTERS.assignee) items = items.filter(i => i.owner === FILTERS.assignee);
  if (FILTERS.priority) items = items.filter(i => i.priority === FILTERS.priority);
  return items;
}

function visibleCollections() {
  const list = DATA.collections_list || [];
  // Every role can browse the PD project and see all Collection issues.
  // (The per-vendor isolation happens on CHILD styles, not on the Collection itself.)
  return list.map((c, idx) => ({ ...c, pdKey: `PD-${idx + 1}` }));
}

function childrenOfCollectionPermissionScoped(coll) {
  // JQL equivalent: `"Collection" = PD-N` scoped by the viewer's project permissions.
  // A DNJ user sees only DNJ styles; Elegant sees only Elegant styles; DDLNY sees both.
  const r = ROLES[ROLE];
  const keys = new Set(coll.child_style_keys || []);
  return DATA.items.filter(i => keys.has(i.key) && r.canSee.includes(i.vendor));
}

function userLookup(id) {
  if (!id) return { color: '#6B778C', initials: '??', name: '—' };
  if (DATA.all_users && DATA.all_users[id]) return DATA.all_users[id];
  if (DATA.people   && DATA.people[id])     return DATA.people[id];
  return { color: '#6B778C', initials: String(id).slice(0,2).toUpperCase(), name: id };
}

/* ---------------- Sidebar ---------------- */
function renderSidebar() {
  const p = PROJECTS[PROJECT];

  const viewItem = (key, icon, label) =>
    `<li class="proj-nav-item ${VIEW===key?'active':''}" data-view="${key}">
      <span class="proj-nav-icon">${icon}</span><span>${label}</span>
    </li>`;

  const vendorShortcuts = [
    { label: 'My open styles',             jql: 'assignee = currentUser() AND status != Done' },
    { label: 'Overdue sub-tasks',          jql: 'issuetype = Sub-task AND duedate < now() AND status != Done' },
    { label: '1KT hot styles',             jql: '"1KT" = true' },
    { label: 'Waiting for DDLNY feedback', jql: 'status = "Awaiting Feedback"' },
  ];
  const pdShortcuts = [
    { label: 'Upcoming launches (90 days)',  jql: 'issuetype = Collection AND "Launch Date" < now(90d)' },
    { label: 'My collections',               jql: 'issuetype = Collection AND assignee = currentUser()' },
    { label: 'Cross-vendor collections',     jql: 'issuetype = Collection AND "Cross-vendor" = true' },
    { label: 'In Development',               jql: 'issuetype = Collection AND status = "In Development"' },
  ];
  const shortcuts = PROJECT === 'PD' ? pdShortcuts : vendorShortcuts;

  el('projSidebar').innerHTML = `
    <div class="proj-header">
      <div class="proj-switcher" onclick="toggleProjectSwitcher(event)" title="Switch project">
        <div class="proj-avatar" style="background:${p.color}">${p.avatar}</div>
        <div class="proj-meta">
          <div class="proj-name">${p.name}</div>
          <div class="proj-type">${p.type}</div>
        </div>
        <span style="color:var(--N90);font-size:11px;margin-left:auto">▾</span>
      </div>
    </div>
    <div class="proj-nav">
      <div class="proj-nav-section">
        <div class="proj-nav-heading">Planning</div>
        <ul class="proj-nav-list">
          ${viewItem('summary',  '⬚',  'Summary')}
          ${viewItem('timeline', '⟶',  'Timeline')}
          ${viewItem('backlog',  '☰',  'Backlog')}
          ${viewItem('board',    '▦',  'Board')}
          ${viewItem('calendar', '📆', 'Calendar')}
          ${viewItem('list',     '☷',  'List')}
          ${viewItem('forms',    '📝', 'Forms')}
          ${viewItem('goals',    '◎',  'Goals')}
          ${viewItem('pages',    '📄', 'Pages')}
          <li class="proj-nav-item" style="color:var(--N100)">
            <span class="proj-nav-icon">+</span><span>Add view</span>
          </li>
        </ul>
      </div>
      <div class="proj-nav-section">
        <div class="proj-nav-heading">Shortcuts (saved filters)</div>
        <ul class="proj-nav-list">
          ${shortcuts.map(s => `
            <li class="proj-nav-item" title="JQL: ${s.jql}">
              <span class="proj-nav-icon">⭐</span><span>${s.label}</span>
            </li>`).join('')}
        </ul>
      </div>
    </div>
    <div class="proj-settings">
      <span>⚙</span><span>Project settings</span>
    </div>
  `;

  document.querySelectorAll('.proj-nav-item[data-view]').forEach(li => {
    li.addEventListener('click', () => { VIEW = li.dataset.view; renderSidebar(); render(); });
  });
}

/* ---------------- Project switcher popover ---------------- */
function toggleProjectSwitcher(ev) {
  ev.stopPropagation();
  const menu = el('projectSwitcherMenu');
  if (!menu) return;
  if (menu.style.display === 'block') { menu.style.display = 'none'; return; }
  const r = ROLES[ROLE];
  const items = r.projectsVisible.map(pk => {
    const p = PROJECTS[pk];
    const active = pk === PROJECT ? 'active' : '';
    return `<div class="proj-sw-item ${active}" onclick="switchProject('${pk}')">
      <span class="proj-avatar" style="background:${p.color}">${p.avatar}</span>
      <div>
        <div class="proj-sw-name">${p.name}</div>
        <div class="proj-sw-type">${p.type}</div>
      </div>
    </div>`;
  }).join('');
  menu.innerHTML = `
    <div class="proj-sw-heading">Switch to</div>
    ${items}
    <div class="proj-sw-divider"></div>
    <div class="proj-sw-item" style="color:var(--N100)"><span class="proj-sw-icon">＋</span><span>View all projects</span></div>
  `;
  const btn = ev.currentTarget;
  const rect = btn.getBoundingClientRect();
  menu.classList.add('proj-sw-menu');
  menu.style.position = 'fixed';
  menu.style.left = rect.left + 'px';
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.display = 'block';
}

function switchProject(key) {
  PROJECT = key;
  VIEW = 'board';
  hideProjectSwitcher();
  renderSidebar();
  render();
}

function hideProjectSwitcher() {
  const menu = el('projectSwitcherMenu');
  if (menu) menu.style.display = 'none';
}

/* ---------------- Render dispatch ---------------- */
function render() {
  const main = el('projMain');

  // Top-level (cross-project) views take precedence. These live at the global
  // nav level — the project sidebar still shows for context but the main
  // content is whatever the user clicked from the top bar.
  if (TOP_VIEW === 'your-work')       { main.innerHTML = viewYourWork();                   bindGlobalLinks(); return; }
  if (TOP_VIEW === 'dashboards')      { main.innerHTML = viewDashboardsList();             bindGlobalLinks(); return; }
  if (TOP_VIEW === 'dashboard')       { main.innerHTML = viewDashboard(DASHBOARD_KEY);     bindGlobalLinks(); return; }
  if (TOP_VIEW === 'filters')         { main.innerHTML = viewFiltersList();                bindGlobalLinks(); return; }
  if (TOP_VIEW === 'filter-results')  { main.innerHTML = viewFilterResults(FILTER_KEY);    bindGlobalLinks(); return; }
  if (TOP_VIEW === 'search')          { main.innerHTML = viewSearchResults();              bindGlobalLinks(); return; }

  if (PROJECT === 'PD') {
    const colls = visibleCollections();
    switch (VIEW) {
      case 'summary':   main.innerHTML = viewCollectionSummary(colls); break;
      case 'board':     main.innerHTML = viewCollectionBoard(colls); bindCollectionCards(); break;
      case 'list':      main.innerHTML = viewCollectionList(colls); bindCollectionCards(); break;
      case 'timeline':  main.innerHTML = viewCollectionTimeline(colls); bindCollectionCards(); break;
      case 'backlog':   main.innerHTML = viewCollectionList(colls); bindCollectionCards(); break;
      case 'calendar':  main.innerHTML = viewEmpty('calendar', 'Calendar', 'Collections with a Launch date will plot here automatically.'); break;
      default:          main.innerHTML = viewEmpty(VIEW, titleCase(VIEW), 'This view is a native Jira stub.'); break;
    }
    return;
  }
  // Vendor project (DNJ or ELG)
  const items = visibleItems();
  switch (VIEW) {
    case 'summary':   main.innerHTML = viewSummary(items); break;
    case 'board':     main.innerHTML = viewBoard(items); bindCards(); break;
    case 'gallery':   main.innerHTML = viewGallery(items); bindCards(); break;
    case 'list':      main.innerHTML = viewList(items); bindCards(); break;
    case 'timeline':  main.innerHTML = viewTimeline(items); bindCards(); break;
    case 'calendar':  main.innerHTML = viewEmpty('calendar', 'Calendar', 'Issues with a due date will plot here automatically. Set a due date on any style to see it appear.'); break;
    case 'backlog':   main.innerHTML = viewBacklog(items); bindCards(); break;
    case 'forms':     main.innerHTML = viewEmpty('forms',   'Forms',    'Forms let you collect structured data into Jira. Create one to request new styles from customers.'); break;
    case 'goals':     main.innerHTML = viewEmpty('goals',   'Goals',    'Track OKRs for the quarter. Link styles and collections to business goals.'); break;
    case 'pages':     main.innerHTML = viewEmpty('pages',   'Pages',    'Confluence pages linked to this project. Not on Standard plan — requires Confluence Cloud.'); break;
  }
}

function titleCase(s) { return s[0].toUpperCase() + s.slice(1); }

/* ======================= STYLE VIEWS ======================= */

function viewSummary(items) {
  const by = (key) => { const c={}; items.forEach(i=>{ const k=i[key]; if(k)c[k]=(c[k]||0)+1; }); return c; };
  const byStatus = by('status');
  const byOwner  = by('owner');
  const byCat    = by('category');
  const total = items.length;
  const done = byStatus['Received & Approved'] || 0;
  const cancelled = byStatus['Cancelled'] || 0;
  const inFlight = total - done - cancelled;

  return `
    <div class="breadcrumbs">
      <a>Projects</a><span class="sep">/</span>
      <a>${PROJECTS[PROJECT].name}</a><span class="sep">/</span>
      <span class="current">Summary</span>
    </div>
    <div class="page-header">
      <h1 class="page-title">Summary</h1>
      <div class="page-actions">
        <button class="btn btn-icon-only" title="Automation">⚡</button>
        <button class="btn">Share</button>
        <button class="btn">•••</button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card narrow">
        <h3>Status overview</h3>
        <div class="summary-num">${total}</div>
        <div class="summary-num-label">${done} done · ${inFlight} in flight · ${cancelled} cancelled</div>
      </div>
      <div class="summary-card narrow">
        <h3>Types of work</h3>
        <div class="flex gap-8" style="align-items:baseline">
          <div class="summary-num" style="color:var(--G300)">${total}</div>
          <div class="summary-num-label">Style issues</div>
        </div>
        <div class="text-xs muted" style="margin-top:6px">Also in this project: Sub-task</div>
      </div>
      <div class="summary-card narrow">
        <h3>Priority breakdown</h3>
        ${['Critical','High','Medium','Low'].map(p=>{
          const c = items.filter(i=>i.priority===p).length;
          const pct = total? Math.round(100*c/total) : 0;
          return `<div class="summary-bar-row">
            <span><span class="priority ${p.toLowerCase()}">▲</span> ${p}</span>
            <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${pct}%"></div></div>
            <span class="summary-bar-count">${c}</span>
          </div>`;
        }).join('')}
      </div>

      <div class="summary-card">
        <h3>Status <span class="text-xs muted" style="font-weight:400">Filter Results gadget</span></h3>
        ${(DATA.all_columns || DATA.workflow).map(s => {
          const c = byStatus[s] || 0; if (!c) return '';
          const pct = Math.round(100 * c / total);
          return `<div class="summary-bar-row">
            <span><span class="lozenge ${STATUS_CATEGORY[s]||'default'}">${s}</span></span>
            <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${pct}%"></div></div>
            <span class="summary-bar-count">${c}</span>
          </div>`;
        }).join('')}
      </div>

      <div class="summary-card">
        <h3>Assignees <span class="text-xs muted" style="font-weight:400">2D Filter Statistics gadget</span></h3>
        ${Object.entries(byOwner).filter(([k])=>k&&k!=='null').sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,c])=>{
          const p = userLookup(k);
          const pct = Math.round(100 * c / total);
          return `<div class="summary-bar-row">
            <span class="flex-center gap-6"><span class="mini-avatar xs" style="background:${p.color}">${p.initials}</span>${p.name||k}</span>
            <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${pct}%"></div></div>
            <span class="summary-bar-count">${c}</span>
          </div>`;
        }).join('')}
      </div>

      <div class="summary-card wide">
        <h3>Recent activity <span class="text-xs muted" style="font-weight:400">Activity Stream gadget</span></h3>
        ${items.slice(0, 6).filter(i=>i.comments?.length).map(i=>{
          const last = i.comments[i.comments.length-1];
          const p = userLookup(last.author || i.owner);
          return `<div class="comment" style="margin-bottom:10px">
            <span class="mini-avatar" style="background:${p.color}">${p.initials}</span>
            <div>
              <div class="comment-meta"><b>${p.name||last.author||'?'}</b> commented on <a onclick="openDrawer('${i.key}')">${i.key}</a> ${last.date||''}</div>
              <div class="comment-body">${escapeHtml((last.body||'').slice(0,200))}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function viewBoard(items) {
  const grouped = {};
  (DATA.all_columns || DATA.workflow).forEach(s => grouped[s] = []);
  items.forEach(i => { (grouped[i.status] ||= []).push(i); });
  const cols = [...(DATA.workflow||[]), ...(DATA.side_lanes||[])];

  return `
    <div class="breadcrumbs">
      <a>Projects</a><span class="sep">/</span>
      <a>${PROJECTS[PROJECT].name}</a><span class="sep">/</span>
      <span class="current">Board</span>
    </div>
    <div class="page-header">
      <div><h1 class="page-title">Board</h1></div>
      <div class="page-actions">
        <button class="btn btn-icon-only">⚡</button>
        <button class="btn">Share</button>
        <button class="btn">•••</button>
      </div>
    </div>

    <div class="filter-bar">
      <input class="filter-search" placeholder="Search this board" oninput="FILTERS.search=this.value.toLowerCase();render()"/>
      ${filterAssigneeStack(items)}
      <button class="filter-chip-ghost">Epic</button>
      <button class="filter-chip-ghost">Type</button>
      <button class="filter-chip-ghost">+ Only my issues</button>
      <button class="filter-chip-ghost">+ Recently updated</button>
    </div>

    <div class="board-wrap"><div class="board">
      ${cols.map(s => columnHtml(s, grouped[s]||[])).join('')}
    </div></div>
  `;
}

function columnHtml(status, arr) {
  return `<div class="board-col">
    <div class="board-col-header">
      <div class="flex-center gap-8">
        <span class="board-col-name">${status}</span>
        <span class="board-col-count">${arr.length}</span>
      </div>
      <span class="board-col-menu">•••</span>
    </div>
    <div class="board-col-body">
      ${arr.slice(0,50).map(cardHtml).join('')}
      ${arr.length > 50 ? `<div class="muted text-xs" style="padding:6px">+ ${arr.length-50} more</div>` : ''}
    </div>
  </div>`;
}

function cardHtml(i) {
  const p = userLookup(i.owner);
  const coverImg = i.images?.[0]
    ? `<img class="card-cover" src="../mockup/images/${i.images[0]}" loading="lazy"/>`
    : '';
  const subs = i.subtasks || [];
  const done = subs.filter(s=>s.status==='Done').length;
  const subInd = subs.length
    ? `<span class="subtask-count" title="Sub-tasks">${subIcon()} ${done} of ${subs.length}</span>`
    : '';
  const pri = (i.priority || 'Medium').toLowerCase();
  const labels = [i.category, i.is_1kt?'1KT':null].filter(Boolean).slice(0,2).map(l =>
    `<span class="label-chip">${escapeHtml(l)}</span>`).join('');
  return `<div class="card" data-key="${i.key}">
    ${coverImg}
    <div class="card-summary">${escapeHtml(i.style_no || i.key)}</div>
    ${labels ? `<div class="card-labels">${labels}</div>` : ''}
    <div class="card-footer">
      <div class="card-footer-left">
        <span class="issue-type ${TYPE_CLASS[i.issue_type]||'style'}" title="Style">${TYPE_LABEL[i.issue_type]||'S'}</span>
        <span class="issue-key">${i.key}</span>
        <span class="priority ${pri}" title="${i.priority||'Medium'} priority">${priArrow(pri)}</span>
      </div>
      <div class="card-footer-right">
        ${subInd}
        <span class="mini-avatar sm" style="background:${p.color}" title="${escapeAttr(p.name||'')}">${p.initials}</span>
      </div>
    </div>
  </div>`;
}

function filterAssigneeStack(items) {
  const owners = [...new Set(items.map(i=>i.owner).filter(Boolean))].slice(0,5);
  return `<div class="filter-avatars">
    <div class="filter-avatar-stack">
      ${owners.map(o => { const p = userLookup(o); return `
        <span class="mini-avatar sm" style="background:${p.color}" title="${escapeAttr(p.name||o)}">${p.initials}</span>`; }).join('')}
    </div>
  </div>`;
}

function viewList(items) {
  const rows = items.slice(0, 200).map(i => {
    const p = userLookup(i.owner);
    const subs = i.subtasks || [];
    const done = subs.filter(s=>s.status==='Done').length;
    const pri = (i.priority || 'Medium').toLowerCase();
    return `<tr data-key="${i.key}">
      <td>${i.images?.[0] ? `<img class="list-img" src="../mockup/images/${i.images[0]}"/>` : `<div class="list-img"></div>`}</td>
      <td><span class="issue-type ${TYPE_CLASS[i.issue_type]||'style'}">${TYPE_LABEL[i.issue_type]||'S'}</span></td>
      <td><span class="issue-key">${i.key}</span></td>
      <td>${escapeHtml(i.style_no||'')}</td>
      <td><span class="lozenge ${STATUS_CATEGORY[i.status]||'default'}">${i.status}</span></td>
      <td>${escapeHtml(i.category||'—')}</td>
      <td><span class="priority ${pri}">${priArrow(pri)}</span> ${i.priority||'Medium'}</td>
      <td><span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span> ${escapeHtml(p.name||'')}</td>
      <td>${subs.length ? `${done}/${subs.length}` : '—'}</td>
      <td class="muted">${i.start_date||'—'}</td>
    </tr>`;
  }).join('');

  return `
    <div class="breadcrumbs"><a>Projects</a><span class="sep">/</span><a>${PROJECTS[PROJECT].name}</a><span class="sep">/</span><span class="current">List</span></div>
    <div class="page-header">
      <h1 class="page-title">List</h1>
      <div class="page-actions">
        <button class="btn">Group by</button>
        <button class="btn">Filter</button>
        <button class="btn">Configure columns</button>
      </div>
    </div>
    <div class="filter-bar">
      <input class="filter-search" placeholder="Search list" oninput="FILTERS.search=this.value.toLowerCase();render()"/>
      <button class="filter-chip-ghost">Type</button>
      <button class="filter-chip-ghost">Assignee</button>
      <button class="filter-chip-ghost">Status</button>
      <button class="filter-chip-ghost">+ More</button>
    </div>

    <div class="list-view">
      <table class="list-table">
        <thead><tr>
          <th></th><th>Type</th><th>Key</th><th>Summary</th><th>Status</th>
          <th>Collection</th><th>Priority</th><th>Assignee</th><th>Child issues</th><th>Start date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${items.length>200 ? `<div class="muted text-sm" style="padding:12px">Showing first 200 of ${items.length} results.</div>` : ''}
  `;
}

function viewTimeline(items) {
  const rows = items.filter(i=>i.start_date).slice(0, 50);
  return `
    <div class="breadcrumbs"><a>Projects</a><span class="sep">/</span><a>${PROJECTS[PROJECT].name}</a><span class="sep">/</span><span class="current">Timeline</span></div>
    <div class="page-header">
      <h1 class="page-title">Timeline</h1>
      <div class="page-actions">
        <button class="btn">Today</button>
        <button class="btn">Weeks</button>
        <button class="btn">Months</button>
      </div>
    </div>
    <div class="muted text-sm" style="margin-bottom:12px">
      Native Jira Timeline shows issues as bars across a calendar, grouped by Epic (Collection). Below is a
      simplified list view — configure "Start date" and "Due date" on each Style for full Gantt-style rendering.
    </div>
    <div class="list-view">
      <table class="list-table">
        <thead><tr>
          <th>Type</th><th>Key</th><th>Summary</th><th>Status</th><th>Start</th><th>Last activity</th>
        </tr></thead>
        <tbody>
          ${rows.map(i => `<tr data-key="${i.key}">
            <td><span class="issue-type ${TYPE_CLASS[i.issue_type]||'style'}">${TYPE_LABEL[i.issue_type]||'S'}</span></td>
            <td><span class="issue-key">${i.key}</span></td>
            <td>${escapeHtml(i.style_no||'')}</td>
            <td><span class="lozenge ${STATUS_CATEGORY[i.status]||'default'}">${i.status}</span></td>
            <td>${i.start_date||'—'}</td>
            <td class="muted">${i.status_date||'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function viewBacklog(items) {
  const unassigned = items.filter(i => !['Received & Approved','Cancelled','Hold'].includes(i.status));
  const sample = unassigned.slice(0, 40);
  return `
    <div class="breadcrumbs"><a>Projects</a><span class="sep">/</span><a>${PROJECTS[PROJECT].name}</a><span class="sep">/</span><span class="current">Backlog</span></div>
    <div class="page-header"><h1 class="page-title">Backlog</h1></div>
    <div class="filter-bar">
      <input class="filter-search" placeholder="Search backlog"/>
      ${filterAssigneeStack(items)}
      <button class="filter-chip-ghost">Epic</button>
    </div>
    <div class="list-view">
      <div style="padding:10px 14px; background:var(--N20); border-bottom:1px solid var(--N30); display:flex; justify-content:space-between; align-items:center">
        <b style="font-size:13px">Backlog <span class="muted" style="font-weight:400">(${unassigned.length} issues)</span></b>
        <button class="btn btn-ghost">Create sprint</button>
      </div>
      <table class="list-table">
        <tbody>
          ${sample.map(i => {
            const p = userLookup(i.owner);
            return `<tr data-key="${i.key}">
              <td style="width:24px"><span class="issue-type ${TYPE_CLASS[i.issue_type]||'style'}">${TYPE_LABEL[i.issue_type]||'S'}</span></td>
              <td style="width:80px"><span class="issue-key">${i.key}</span></td>
              <td>${escapeHtml(i.style_no||'')}</td>
              <td style="width:120px"><span class="lozenge ${STATUS_CATEGORY[i.status]||'default'}">${i.status}</span></td>
              <td style="width:36px"><span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ======================= COLLECTION VIEWS ======================= */

function viewCollectionBoard(colls) {
  const cols = ['Planning', 'In Development', 'Delivered', 'Archived'];
  const grouped = {};
  cols.forEach(s => grouped[s] = []);
  colls.forEach(c => { (grouped[c.status] ||= []).push(c); });
  return `
    <div class="breadcrumbs">
      <a>Projects</a><span class="sep">/</span>
      <a>Product Development</a><span class="sep">/</span>
      <span class="current">Board</span>
    </div>
    <div class="page-header">
      <h1 class="page-title">Board</h1>
      <div class="page-actions">
        <button class="btn btn-icon-only">⚡</button>
        <button class="btn">Share</button>
        <button class="btn">•••</button>
      </div>
    </div>
    <div class="filter-bar">
      <input class="filter-search" placeholder="Search this board"/>
      <button class="filter-chip-ghost">Customer</button>
      <button class="filter-chip-ghost">Owner</button>
      <button class="filter-chip-ghost">Launch quarter</button>
      <button class="filter-chip-ghost">+ More</button>
    </div>
    <div class="board-wrap"><div class="board">
      ${cols.map(s => {
        const arr = grouped[s] || [];
        return `<div class="board-col">
          <div class="board-col-header">
            <div class="flex-center gap-8">
              <span class="board-col-name">${s}</span>
              <span class="board-col-count">${arr.length}</span>
            </div>
            <span class="board-col-menu">•••</span>
          </div>
          <div class="board-col-body">
            ${arr.map(c => collectionCardHtml(c)).join('')}
          </div>
        </div>`;
      }).join('')}
    </div></div>
  `;
}

function collectionCardHtml(c) {
  const children = childrenOfCollectionPermissionScoped(c);
  const total = c.style_count;
  const hidden = ROLE === 'ddlny' ? 0 : total - children.length;
  const owner = userLookup(c.owner);
  return `<div class="card" data-coll="${c.pdKey}">
    <div class="card-summary">${escapeHtml(c.name)}</div>
    <div class="card-labels">
      ${c.customer ? `<span class="label-chip">${escapeHtml(c.customer)}</span>` : ''}
      ${c.is_cross_vendor ? `<span class="label-chip" style="background:var(--P50);color:var(--P500)">Cross-vendor</span>` : ''}
    </div>
    <div class="card-footer">
      <div class="card-footer-left">
        <span class="issue-type collection" title="Collection (Epic-like)">E</span>
        <span class="issue-key">${c.pdKey}</span>
        <span class="subtask-count" title="Linked styles visible to you">
          🔗 ${children.length}${hidden?` / ${total}`:''}
        </span>
      </div>
      <div class="card-footer-right">
        <span class="mini-avatar sm" style="background:${owner.color}" title="${escapeAttr(owner.name||'')}">${owner.initials}</span>
      </div>
    </div>
  </div>`;
}

function viewCollectionList(colls) {
  const rows = colls.map(c => {
    const owner = userLookup(c.owner);
    const visCount = childrenOfCollectionPermissionScoped(c).length;
    const cat = COLL_STATUS_CATEGORY[c.status] || 'default';
    return `<tr data-coll="${c.pdKey}">
      <td><span class="issue-type collection">E</span></td>
      <td><span class="issue-key">${c.pdKey}</span></td>
      <td>${escapeHtml(c.name)}</td>
      <td><span class="lozenge ${cat}">${c.status}</span></td>
      <td>${escapeHtml(c.customer||'—')}</td>
      <td>${c.launch_date||'—'}</td>
      <td>$${c.target_retail_usd||'—'}</td>
      <td><span class="mini-avatar sm" style="background:${owner.color}">${owner.initials}</span> ${escapeHtml(owner.name||'')}</td>
      <td>${visCount}${ROLE==='ddlny'?'':` / ${c.style_count}`}</td>
      <td>${c.is_cross_vendor?'🔀':''}</td>
    </tr>`;
  }).join('');
  return `
    <div class="breadcrumbs"><a>Projects</a><span class="sep">/</span><a>Product Development</a><span class="sep">/</span><span class="current">List</span></div>
    <div class="page-header">
      <h1 class="page-title">List</h1>
      <div class="page-actions"><button class="btn">Group by</button><button class="btn">Filter</button><button class="btn">Configure columns</button></div>
    </div>
    <div class="list-view">
      <table class="list-table">
        <thead><tr>
          <th></th><th>Key</th><th>Summary</th><th>Status</th>
          <th>Customer</th><th>Launch</th><th>Retail</th><th>Owner</th>
          <th>Linked styles</th><th>Cross-vendor</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function viewCollectionSummary(colls) {
  const total = colls.length;
  const byStatus = {};
  colls.forEach(c => { byStatus[c.status] = (byStatus[c.status]||0)+1; });
  const xVen = colls.filter(c => c.is_cross_vendor).length;
  const today = DATA.today || '2026-04-20';
  const upcoming = colls.filter(c => c.launch_date && c.launch_date > today).length;
  const avgProgress = total ? Math.round(colls.reduce((s,c)=>s+(c.progress_pct||0),0) / total) : 0;

  return `
    <div class="breadcrumbs"><a>Projects</a><span class="sep">/</span><a>Product Development</a><span class="sep">/</span><span class="current">Summary</span></div>
    <div class="page-header"><h1 class="page-title">Summary</h1>
      <div class="page-actions">
        <button class="btn btn-icon-only">⚡</button>
        <button class="btn">Share</button>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-card narrow">
        <h3>Total collections</h3>
        <div class="summary-num">${total}</div>
        <div class="summary-num-label">${xVen} cross-vendor · ${total - xVen} single-vendor</div>
      </div>
      <div class="summary-card narrow">
        <h3>Upcoming launches</h3>
        <div class="summary-num">${upcoming}</div>
        <div class="summary-num-label">launch date in the future</div>
      </div>
      <div class="summary-card narrow">
        <h3>Avg progress</h3>
        <div class="summary-num">${avgProgress}%</div>
        <div class="summary-num-label">across all collections</div>
      </div>
      <div class="summary-card">
        <h3>Status <span class="text-xs muted" style="font-weight:400">Filter Results gadget</span></h3>
        ${Object.keys(COLL_STATUS_CATEGORY).map(s => {
          const c = byStatus[s] || 0;
          const pct = total ? Math.round(100*c/total) : 0;
          return `<div class="summary-bar-row">
            <span><span class="lozenge ${COLL_STATUS_CATEGORY[s]}">${s}</span></span>
            <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${pct}%"></div></div>
            <span class="summary-bar-count">${c}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="summary-card">
        <h3>Customers <span class="text-xs muted" style="font-weight:400">2D Filter Statistics gadget</span></h3>
        ${Object.entries(colls.reduce((a,c)=>{a[c.customer||'—']=(a[c.customer||'—']||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v]) => {
          const pct = total ? Math.round(100*v/total) : 0;
          return `<div class="summary-bar-row">
            <span>${escapeHtml(k)}</span>
            <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${pct}%"></div></div>
            <span class="summary-bar-count">${v}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="summary-card wide">
        <h3>Upcoming launches <span class="text-xs muted" style="font-weight:400">next 180 days</span></h3>
        ${colls.filter(c=>c.launch_date && c.launch_date > today).slice(0,8).map(c => {
          const owner = userLookup(c.owner);
          const cat = COLL_STATUS_CATEGORY[c.status] || 'default';
          const visCount = childrenOfCollectionPermissionScoped(c).length;
          return `<div class="comment" style="margin-bottom:10px;cursor:pointer" onclick="openCollectionDrawer('${c.pdKey}')">
            <span class="mini-avatar" style="background:${owner.color}">${owner.initials}</span>
            <div>
              <div class="comment-meta"><b>${escapeHtml(c.name)}</b> · <span class="issue-key">${c.pdKey}</span> · <span class="lozenge ${cat}">${c.status}</span></div>
              <div class="comment-body">Customer: ${escapeHtml(c.customer||'—')} · Launch: ${c.launch_date} · ${visCount} styles visible to you</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function viewCollectionTimeline(colls) {
  const sorted = [...colls].filter(c => c.launch_date).sort((a,b) => a.launch_date.localeCompare(b.launch_date)).slice(0, 40);
  return `
    <div class="breadcrumbs"><a>Projects</a><span class="sep">/</span><a>Product Development</a><span class="sep">/</span><span class="current">Timeline</span></div>
    <div class="page-header"><h1 class="page-title">Timeline</h1></div>
    <div class="muted text-sm" style="margin-bottom:12px">Collections sorted by launch date. Native Jira Timeline renders these as Gantt bars grouped by status — this simplified list shows the same data.</div>
    <div class="list-view"><table class="list-table">
      <thead><tr><th>Key</th><th>Collection</th><th>Status</th><th>Customer</th><th>Launch date</th><th>Progress</th></tr></thead>
      <tbody>
        ${sorted.map(c => `<tr data-coll="${c.pdKey}">
          <td><span class="issue-key">${c.pdKey}</span></td>
          <td>${escapeHtml(c.name)}</td>
          <td><span class="lozenge ${COLL_STATUS_CATEGORY[c.status]||'default'}">${c.status}</span></td>
          <td>${escapeHtml(c.customer||'—')}</td>
          <td>${c.launch_date}</td>
          <td>${c.progress_pct}%</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  `;
}

function bindCollectionCards() {
  document.querySelectorAll('.card[data-coll], tr[data-coll]').forEach(c => {
    c.addEventListener('click', () => openCollectionDrawer(c.dataset.coll));
  });
}

/* ======================= VIEW EMPTY (shared) ======================= */

function viewEmpty(key, title, sub) {
  return `
    <div class="breadcrumbs"><a>Projects</a><span class="sep">/</span><a>${PROJECTS[PROJECT].name}</a><span class="sep">/</span><span class="current">${title}</span></div>
    <div class="page-header"><h1 class="page-title">${title}</h1></div>
    <div class="empty-state">
      <div class="empty-state-icon">${key==='calendar'?'📅':key==='forms'?'📝':key==='goals'?'🎯':'📄'}</div>
      <div class="empty-state-title">No ${title.toLowerCase()} yet</div>
      <div class="empty-state-sub">${sub||''}</div>
    </div>`;
}

/* ======================= ISSUE DRAWER (dispatcher) ======================= */

function openDrawer(key) {
  CURRENT_KEY = key;
  ISSUE_TAB = 'comments';
  renderDrawer();
  el('issueDrawer').classList.add('open');
}
function openCollectionDrawer(key) {
  CURRENT_KEY = key;
  ISSUE_TAB = 'comments';
  renderDrawer();
  el('issueDrawer').classList.add('open');
}
function openCollectionByName(name) {
  const idx = (DATA.collections_list || []).findIndex(c => c.name === name);
  if (idx < 0) return;
  openCollectionDrawer(`PD-${idx+1}`);
}
function closeDrawer() { el('issueDrawer').classList.remove('open'); }

function renderDrawer() {
  if (!CURRENT_KEY) return;
  const found = findIssue(CURRENT_KEY);
  if (!found) return renderStyleDrawer();
  if (found.type === 'collection') return renderCollectionDrawer();
  if (found.type === 'subtask')    return renderSubtaskDrawer();
  return renderStyleDrawer();
}

/* Resolve any issue key to its type + data. Supports Style, Collection, Sub-task. */
function findIssue(key) {
  if (!key) return null;
  if (key.startsWith('PD-')) {
    const coll = visibleCollections().find(c => c.pdKey === key);
    if (coll) return { type: 'collection', data: coll };
  }
  const style = DATA.items.find(i => i.key === key);
  if (style) return { type: 'style', data: style };
  for (const i of DATA.items) {
    const sub = (i.subtasks || []).find(s => s.key === key);
    if (sub) return { type: 'subtask', data: sub, parent: i };
  }
  return null;
}

function openSubtaskDrawer(key) {
  CURRENT_KEY = key;
  ISSUE_TAB = 'comments';
  renderDrawer();
  el('issueDrawer').classList.add('open');
}

/* ======================= STYLE DRAWER ======================= */

function renderStyleDrawer() {
  const i = DATA.items.find(x => x.key === CURRENT_KEY);
  if (!i) return;
  const p = userLookup(i.owner);
  const subs = (i.subtasks || []);
  const visSubs = (ROLE==='ddlny') ? subs : subs.filter(s => !s.ddlny_only);
  const hiddenCount = subs.length - visSubs.length;
  const statusCat = STATUS_CATEGORY[i.status] || 'default';
  const priCls = (i.priority||'Medium').toLowerCase();

  el('issueDrawerPanel').innerHTML = `
    <div class="iv-breadcrumbs">
      <a>Projects</a><span class="sep">/</span><a>${i.vendor==='Elegant'?'Elegant':'DNJ'}</a><span class="sep">/</span>
      <span class="issue-type ${TYPE_CLASS[i.issue_type]||'style'}">${TYPE_LABEL[i.issue_type]||'S'}</span>
      <span class="issue-key">${i.key}</span>
    </div>
    <div class="iv-header">
      <div class="iv-actions">
        <button class="btn btn-ghost">👁 Add watcher</button>
        <button class="btn btn-ghost">⚙ Automation</button>
        <button class="iv-star" title="Star">☆</button>
        <button class="btn btn-ghost">•••</button>
        <button class="btn btn-ghost" onclick="closeDrawer()">✕</button>
      </div>
      <h1 class="iv-title" contenteditable="true">${escapeHtml(i.style_no || i.key)}</h1>
      <div class="iv-toolbar">
        <button class="status-btn ${statusCat}" onclick="toggleStatusMenu(event,'${i.key}')">${i.status} ▾</button>
        <button class="btn btn-ghost">＋ Add</button>
        <button class="btn btn-ghost">Actions ▾</button>
      </div>
    </div>

    <div class="iv-body">
      <div class="iv-main">

        <div class="iv-section">
          <h4>Description</h4>
          <div class="iv-description">${i.description
            ? escapeHtml(i.description)
            : `<span class="muted">Add a description…</span>`}</div>
        </div>

        <div class="iv-section">
          <h4>Child issues (${visSubs.length}${hiddenCount?` + ${hiddenCount} restricted`:''})</h4>
          <div class="child-issues">
            ${visSubs.map(s => {
              const asg = userLookup(s.assignee);
              const sc = s.status==='Done'?'done':s.status==='In Progress'?'in-progress':'default';
              const today = DATA.today || '2026-04-20';
              const overdue = s.status !== 'Done' && s.due_date && s.due_date < today;
              return `<div class="child-issue-row" data-open-key="${s.key}" style="cursor:pointer">
                <span class="issue-type subtask" title="Sub-task">↳</span>
                <span class="child-issue-key">${s.key}</span>
                <span class="child-issue-summary">${escapeHtml(s.summary)}${overdue?' <span class="overdue-tag">overdue</span>':''}</span>
                <span class="child-issue-badges">
                  ${s.gating ? '<span class="lozenge gate" title="Gating — blocks parent phase advance">GATE</span>' : ''}
                  ${s.ddlny_only && ROLE === 'ddlny' ? '<span class="lozenge ddlny-only" title="DDLNY-only — vendor cannot see this sub-task">DDLNY</span>' : ''}
                </span>
                <span class="lozenge ${sc}">${s.status}</span>
                <span class="mini-avatar sm" style="background:${asg.color}" title="${escapeAttr(asg.name||'')}">${asg.initials}</span>
              </div>`;
            }).join('')}
            ${Array(hiddenCount).fill(0).map(() =>
              `<div class="child-issue-restricted">
                <span>🔒</span>
                <span>Restricted issue — you don't have permission to view this sub-task</span>
              </div>`).join('')}
            <div class="add-child" onclick="openCreate('Sub-task','${i.key}')">+ Create child issue</div>
          </div>
        </div>

        <div class="iv-section">
          <h4>Attachments (${(i.attachments||[]).length})</h4>
          <div class="attach-list">
            ${(i.attachments||[]).map(a => {
              const user = userLookup(a.uploaded_by);
              const icon = a.mime?.includes('image') ? '🖼' : a.mime?.includes('pdf') ? '📄' : '📎';
              return `<div class="attach-row">
                <div class="attach-thumb">${a.is_cad && a.thumb ? `<img src="../mockup/images/${a.thumb}"/>` : icon}</div>
                <div>
                  <div class="attach-name">${escapeHtml(a.filename)}</div>
                  <div class="attach-meta">${Math.round(a.size_kb)} KB · uploaded ${a.uploaded_at} by ${escapeHtml(user.name||a.uploaded_by)}</div>
                </div>
                <div class="attach-meta">⬇</div>
                <div class="attach-meta">•••</div>
              </div>`;
            }).join('') || '<div class="muted text-sm" style="padding:10px">Drop files or paste from clipboard</div>'}
          </div>
        </div>

        <div class="iv-section">
          <h4>Milestone log (${(i.milestones||[]).length})</h4>
          <div class="muted text-xs" style="margin-bottom:8px">
            Native implementation: a multi-line text custom field on the Style, auto-populated by an
            Automation rule that listens for specific sub-task completions (e.g. "Send BOM" → Done)
            and appends a dated entry.
          </div>
          <div class="milestone-log">
            ${(i.milestones||[]).map(m => `
              <div class="milestone-row">
                <span class="milestone-dot">●</span>
                <span class="milestone-date">${m.date||'—'}</span>
                <span class="milestone-event">${escapeHtml(m.event)}</span>
              </div>
            `).join('') || '<div class="muted text-sm">No milestones logged yet.</div>'}
          </div>
        </div>

        <div class="iv-section">
          <h4>Activity</h4>
          <div class="activity-tabs">
            <button class="activity-tab ${ISSUE_TAB==='comments'?'active':''}" onclick="ISSUE_TAB='comments';renderDrawer()">Comments</button>
            <button class="activity-tab ${ISSUE_TAB==='history'?'active':''}" onclick="ISSUE_TAB='history';renderDrawer()">History</button>
            <button class="activity-tab ${ISSUE_TAB==='worklog'?'active':''}" onclick="ISSUE_TAB='worklog';renderDrawer()">Work log</button>
          </div>
          ${ISSUE_TAB==='comments' ? renderComments(i) : ''}
          ${ISSUE_TAB==='history'  ? renderHistory(i)  : ''}
          ${ISSUE_TAB==='worklog'  ? `<div class="muted text-sm">No work logged on this issue.</div>` : ''}
        </div>

      </div>

      <div class="iv-side">
        <div class="iv-section">
          <h4>Details</h4>
          <div class="side-field">
            <span class="side-field-label">Assignee</span>
            <span class="side-field-value flex-center gap-6">
              <span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span>${escapeHtml(p.name||'')}
            </span>
          </div>
          <div class="side-field"><span class="side-field-label">Reporter</span><span class="side-field-value">${escapeHtml(p.name||'—')}</span></div>
          <div class="side-field"><span class="side-field-label">Priority</span><span class="side-field-value"><span class="priority ${priCls}">${priArrow(priCls)}</span> ${i.priority||'Medium'}</span></div>
          <div class="side-field"><span class="side-field-label">Labels</span><span class="side-field-value">${i.is_1kt?'<span class="label-chip">1KT</span>':'<span class="empty">None</span>'}</span></div>
          <div class="side-field"><span class="side-field-label">Collection</span><span class="side-field-value">
            ${i._collectionPdKey
              ? `<a onclick="openCollectionDrawer('${i._collectionPdKey}')" style="display:inline-flex;gap:4px;align-items:center">
                   <span class="issue-type collection" style="width:14px;height:14px;font-size:9px">E</span>
                   <span class="issue-key">${i._collectionPdKey}</span>
                   · ${escapeHtml(i.category||'')}
                 </a>`
              : (i.category ? escapeHtml(i.category) : '<span class="empty">None</span>')}
          </span></div>
          <div class="side-field"><span class="side-field-label">Due date</span><span class="side-field-value empty">None</span></div>
          <div class="side-field"><span class="side-field-label">Security</span><span class="side-field-value"><span class="lozenge default">${i.vendor}-visible</span></span></div>
        </div>

        <div class="iv-section">
          <h4>Custom fields <span class="tag-note">DDLNY</span></h4>
          <div class="side-field"><span class="side-field-label">Style #</span><span class="side-field-value">${escapeHtml(i.style_no||'—')}</span></div>
          <div class="side-field"><span class="side-field-label">PO # / D-code</span><span class="side-field-value">${escapeHtml(i.po_no||'—')}</span></div>
          <div class="side-field"><span class="side-field-label">Vendor</span><span class="side-field-value">${i.vendor}</span></div>
          <div class="side-field"><span class="side-field-label">Source</span><span class="side-field-value">${escapeHtml(i.source||'—')}</span></div>
          <div class="side-field"><span class="side-field-label">Sketches</span><span class="side-field-value">${i.no_of_sketch||'—'}</span></div>
          <div class="side-field"><span class="side-field-label">Sketch changes</span><span class="side-field-value">${i.sketch_changes||'—'}</span></div>
          <div class="side-field"><span class="side-field-label">CAD changes</span><span class="side-field-value">${i.cad_changes||'—'}</span></div>
          <div class="side-field"><span class="side-field-label">Diamond quality</span><span class="side-field-value">${escapeHtml(i.diamond_quality||'—')}</span></div>
          <div class="side-field"><span class="side-field-label">1KT flag</span><span class="side-field-value">${i.is_1kt?'☑':'☐'}</span></div>
          <div class="side-field"><span class="side-field-label">Cloud files</span><span class="side-field-value empty">Paste URL</span></div>
          <div class="side-field"><span class="side-field-label">Milestone log</span><span class="side-field-value">${(i.milestones||[]).length} entries</span></div>
        </div>

        <div class="iv-section">
          <h4>Dates</h4>
          <div class="side-field"><span class="side-field-label">Created</span><span class="side-field-value">${i.start_date||'—'}</span></div>
          <div class="side-field"><span class="side-field-label">Last updated</span><span class="side-field-value">${i.status_date||'—'}</span></div>
        </div>

        <div class="iv-section">
          <button class="btn btn-link">Configure</button>
        </div>
      </div>
    </div>
  `;
}

/* ======================= COLLECTION DRAWER ======================= */

function renderCollectionDrawer() {
  const coll = visibleCollections().find(c => c.pdKey === CURRENT_KEY);
  if (!coll) return;
  const children = childrenOfCollectionPermissionScoped(coll);
  const total = coll.style_count;
  const hidden = ROLE === 'ddlny' ? 0 : total - children.length;
  const owner = userLookup(coll.owner);
  const cat = COLL_STATUS_CATEGORY[coll.status] || 'default';

  el('issueDrawerPanel').innerHTML = `
    <div class="iv-breadcrumbs">
      <a>Projects</a><span class="sep">/</span>
      <a onclick="switchProject('PD')">Product Development</a><span class="sep">/</span>
      <span class="issue-type collection">E</span>
      <span class="issue-key">${coll.pdKey}</span>
    </div>
    <div class="iv-header">
      <div class="iv-actions">
        <button class="btn btn-ghost">👁 Add watcher</button>
        <button class="btn btn-ghost">⚙ Automation</button>
        <button class="iv-star">☆</button>
        <button class="btn btn-ghost">•••</button>
        <button class="btn btn-ghost" onclick="closeDrawer()">✕</button>
      </div>
      <h1 class="iv-title" contenteditable="true">${escapeHtml(coll.name)}</h1>
      <div class="iv-toolbar">
        <button class="status-btn ${cat}" onclick="toggleStatusMenu(event,'${coll.pdKey}')">${coll.status} ▾</button>
        <button class="btn btn-ghost">＋ Add</button>
        <button class="btn btn-ghost">Actions ▾</button>
      </div>
    </div>

    <div class="iv-body">
      <div class="iv-main">
        <div class="iv-section">
          <h4>Description</h4>
          <div class="iv-description">${coll.description ? escapeHtml(coll.description) : `<span class="muted">Add a description…</span>`}</div>
        </div>

        <div class="iv-section">
          <h4>Linked styles (${children.length}${hidden?` · ${hidden} hidden by permission`:''})</h4>
          <div class="muted text-xs" style="margin-bottom:8px">
            Saved JQL filter: <code>"Collection" = ${coll.pdKey}</code>
            — results auto-scope to ${ROLES[ROLE].name}'s project permissions.
            ${ROLE==='ddlny' && coll.is_cross_vendor ? ` Cross-vendor breakdown: DNJ (${coll.dnj_count}) + Elegant (${coll.elegant_count}).` : ''}
          </div>
          <div class="list-view">
            <table class="list-table">
              <thead><tr>
                <th></th><th>Key</th><th>Summary</th><th>Status</th>${ROLE==='ddlny'?'<th>Project</th>':''}<th>Assignee</th>
              </tr></thead>
              <tbody>
                ${children.slice(0, 80).map(s => {
                  const p = userLookup(s.owner);
                  return `<tr data-key="${s.key}">
                    <td><span class="issue-type ${TYPE_CLASS[s.issue_type]||'style'}">${TYPE_LABEL[s.issue_type]||'S'}</span></td>
                    <td><span class="issue-key">${s.key}</span></td>
                    <td>${escapeHtml(s.style_no||'')}</td>
                    <td><span class="lozenge ${STATUS_CATEGORY[s.status]||'default'}">${s.status}</span></td>
                    ${ROLE==='ddlny'?`<td class="muted">${s.vendor==='Elegant'?'ELG':'DNJ'}</td>`:''}
                    <td><span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span> ${escapeHtml(p.name||'')}</td>
                  </tr>`;
                }).join('') || `<tr><td colspan="${ROLE==='ddlny'?6:5}" class="muted" style="padding:16px;text-align:center">No styles visible to you in this collection</td></tr>`}
              </tbody>
            </table>
          </div>
          ${children.length > 80 ? `<div class="muted text-xs" style="padding:6px">Showing first 80 of ${children.length}.</div>` : ''}
          ${hidden ? `<div class="muted text-xs" style="margin-top:8px;padding:8px;background:var(--Y50);border-left:3px solid var(--Y200);border-radius:0 3px 3px 0">
            🔒 ${hidden} additional style${hidden>1?'s':''} in this collection belong to the other vendor's project — invisible to your account via Issue Security. DDLNY sees all.
          </div>` : ''}
        </div>

        <div class="iv-section">
          <h4>Activity</h4>
          <div class="activity-tabs">
            <button class="activity-tab ${ISSUE_TAB==='comments'?'active':''}" onclick="ISSUE_TAB='comments';renderDrawer()">Comments</button>
            <button class="activity-tab ${ISSUE_TAB==='history'?'active':''}" onclick="ISSUE_TAB='history';renderDrawer()">History</button>
          </div>
          ${ISSUE_TAB==='comments' ? '<div class="muted text-sm" style="padding:10px">No comments yet.</div>' : '<div class="muted text-sm" style="padding:10px">No history yet.</div>'}
        </div>
      </div>

      <div class="iv-side">
        <div class="iv-section">
          <h4>Details</h4>
          <div class="side-field"><span class="side-field-label">Owner</span>
            <span class="side-field-value flex-center gap-6">
              <span class="mini-avatar sm" style="background:${owner.color}">${owner.initials}</span>${escapeHtml(owner.name||'')}
            </span></div>
          <div class="side-field"><span class="side-field-label">Customer</span><span class="side-field-value">${escapeHtml(coll.customer||'—')}</span></div>
          <div class="side-field"><span class="side-field-label">Launch date</span><span class="side-field-value">${coll.launch_date||'—'}</span></div>
          <div class="side-field"><span class="side-field-label">Target retail</span><span class="side-field-value">$${coll.target_retail_usd||'—'}</span></div>
          <div class="side-field"><span class="side-field-label">Progress</span><span class="side-field-value">${coll.progress_pct}%</span></div>
          ${ROLE==='ddlny' ? `
            <div class="side-field"><span class="side-field-label">DNJ styles</span><span class="side-field-value">${coll.dnj_count}</span></div>
            <div class="side-field"><span class="side-field-label">Elegant styles</span><span class="side-field-value">${coll.elegant_count}</span></div>
            <div class="side-field"><span class="side-field-label">Cross-vendor</span><span class="side-field-value">${coll.is_cross_vendor?'🔀 Yes':'No'}</span></div>
          ` : ''}
          <div class="side-field"><span class="side-field-label">Security</span><span class="side-field-value"><span class="lozenge default">Everyone (PD)</span></span></div>
        </div>
      </div>
    </div>
  `;

  // Bind child style rows to open Style drawer (swap content within the same drawer panel)
  setTimeout(() => {
    document.querySelectorAll('#issueDrawerPanel tr[data-key]').forEach(r => {
      r.addEventListener('click', () => openDrawer(r.dataset.key));
    });
  }, 0);
}

/* ======================= COMMENTS / HISTORY ======================= */

function renderComments(i) {
  const comments = (i.comments || []);
  return `
    ${comments.map(c => {
      const p = userLookup(c.author || i.owner);
      return `<div class="comment">
        <span class="mini-avatar" style="background:${p.color}">${p.initials}</span>
        <div>
          <div class="comment-meta"><b>${escapeHtml(p.name||c.author||'?')}</b><span class="comment-ts">${c.date||''}</span></div>
          <div class="comment-body">${escapeHtml(c.body||'')}</div>
          <div class="comment-actions"><a>Reply</a><a>Edit</a><a>Delete</a></div>
        </div>
      </div>`;
    }).join('') || '<div class="muted text-sm">No comments yet.</div>'}
    <div class="comment-input-wrap">
      <span class="mini-avatar" style="background:${ROLES[ROLE].color}">${ROLES[ROLE].initials}</span>
      <textarea class="comment-input" placeholder="Add a comment…"></textarea>
    </div>
    <div class="muted text-xs" style="margin-top:6px">Pro tip — press M anywhere to comment</div>
  `;
}

function renderHistory(i) {
  const events = i.activity_log || [];
  if (!events.length) return '<div class="muted text-sm">No history yet. Jira records every field change here automatically.</div>';
  return events.map(ev => {
    const u = userLookup(ev.user);
    let body = '';
    if (ev.kind==='status_changed')
      body = `changed the <b>Status</b> from <span class="lozenge ${STATUS_CATEGORY[ev.from]||'default'}">${ev.from}</span> to <span class="lozenge ${STATUS_CATEGORY[ev.to]||'default'}">${ev.to}</span>`;
    else if (ev.kind==='attachment_added')
      body = `added an attachment: <b>${escapeHtml(ev.to)}</b>`;
    else if (ev.kind==='commented')
      body = `added a <b>comment</b>`;
    else if (ev.kind==='created')
      body = `created the issue`;
    else if (ev.kind==='subtask_status')
      body = `changed sub-task <b>${escapeHtml(ev.field||'')}</b> status to <b>${ev.to}</b>`;
    else if (ev.kind==='subtask_reassign')
      body = `reassigned sub-task from <b>${ev.from}</b> to <b>${ev.to}</b>`;
    else
      body = `updated <b>${escapeHtml(ev.field||'a field')}</b>`;
    return `<div class="history-row">
      <span class="mini-avatar xs" style="background:${u.color}">${u.initials}</span>
      <span><b>${escapeHtml(ev.user_name||ev.user||'')}</b> ${body}</span>
      <span class="history-ts">${(ev.ts||'').replace('T',' ').replace('Z','')}</span>
    </div>`;
  }).join('');
}

/* ======================= CREATE MODAL ======================= */

function openCreate(presetType, parentKey) {
  CREATE_STEP = { type: presetType || 'Style', parent: parentKey || null };
  renderCreate();
  el('createModal').classList.add('open');
}
function closeCreate() { el('createModal').classList.remove('open'); }

function renderCreate() {
  const t = CREATE_STEP.type;
  const ownerOpts = Object.entries(DATA.people).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join('');
  const userOpts = Object.entries(DATA.all_users || DATA.people).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join('');

  const fields = (t==='Style') ? `
    <div class="field-row"><label>Project<span class="req">*</span></label>
      <select><option>DNJ</option><option>Elegant</option></select></div>
    <div class="field-row"><label>Issue Type<span class="req">*</span></label>
      <select onchange="CREATE_STEP.type=this.value;renderCreate()">
        <option ${t==='Style'?'selected':''}>Style</option>
        <option ${t==='Collection'?'selected':''}>Collection</option>
        <option ${t==='Sub-task'?'selected':''}>Sub-task</option>
      </select></div>
    <div class="field-row"><label>Summary<span class="req">*</span></label>
      <input placeholder="e.g. Twinkling diamond earring v2"/></div>
    <div class="field-row"><label>Description</label>
      <textarea rows="3" placeholder="Concept notes — what does this piece need to achieve?"></textarea></div>
    <div class="field-row"><label>Assignee</label>
      <select><option value="">Unassigned</option>${ownerOpts}</select></div>
    <div class="field-row"><label>Priority</label>
      <select><option>Critical</option><option>High</option><option selected>Medium</option><option>Low</option></select></div>
    <div class="field-row"><label>Labels</label>
      <input placeholder="1KT, bridal, ..."/></div>
    <div class="field-row"><label>Due date</label>
      <input type="date"/></div>
    <div class="field-row"><label>Collection</label>
      <select><option value="">— none —</option>
        ${(DATA.collections_list||[]).slice(0,30).map((c,idx)=>`<option>PD-${idx+1} — ${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <div class="field-help">Links this Style to a Collection issue in the PD project. JQL filter <code>"Collection" = PD-N</code> will pick it up.</div>
    </div>
    <div class="field-row"><label>Style #<span class="req">*</span></label>
      <input placeholder="e.g. E256228LY"/></div>
    <div class="field-row"><label>PO # / D-code</label>
      <input placeholder="e.g. D39 APR 260212"/></div>
    <div class="field-row"><label>Vendor<span class="req">*</span></label>
      <select><option>DNJ</option><option>Elegant</option></select></div>
    <div class="field-row"><label>Category</label>
      <input list="catList" placeholder="e.g. Tappered Modulation"/>
      <datalist id="catList">${[...new Set(DATA.items.map(i=>i.category).filter(Boolean))].slice(0,40).map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</datalist></div>
    <div class="field-row"><label>Diamond quality</label><input placeholder="e.g. LGD VVS F-G"/></div>
    <div class="field-row"><label>1KT flag</label><label style="font-size:13px"><input type="checkbox"/> This is a 1KT style</label></div>
    <div class="field-row"><label>Attachments</label><input type="file" multiple/>
      <div class="field-help">Up to 1 GB per file (Jira Standard limit). Larger files — paste a cloud-storage URL in the "Cloud files" custom field after creation.</div>
    </div>
    <div class="field-row"><label>Security level</label>
      <select><option>Automatic (matches vendor)</option><option>DDLNY only</option></select>
      <div class="field-help">Set by Automation on save — vendor DNJ → dnj-visible, vendor Elegant → elegant-visible.</div>
    </div>
  ` : t==='Collection' ? `
    <div class="field-row"><label>Project<span class="req">*</span></label>
      <select><option selected>PD — Product Development</option></select></div>
    <div class="field-row"><label>Issue Type<span class="req">*</span></label>
      <select onchange="CREATE_STEP.type=this.value;renderCreate()">
        <option>Style</option><option selected>Collection</option><option>Sub-task</option>
      </select></div>
    <div class="field-row"><label>Summary<span class="req">*</span></label>
      <input placeholder="e.g. Twinkling Bridal 2026"/></div>
    <div class="field-row"><label>Description</label><textarea rows="3"></textarea></div>
    <div class="field-row"><label>Reporter</label><select>${userOpts}</select></div>
    <div class="field-row"><label>Customer</label>
      <select><option>— select —</option><option>JCP</option><option>Sam's Club</option><option>Macy's</option><option>Kohl's</option><option>Direct DDLNY</option></select></div>
    <div class="field-row"><label>Launch date</label><input type="date"/></div>
    <div class="field-row"><label>Target retail USD</label><input type="number" placeholder="99" min="0"/></div>
    <div class="field-row"><label>Assigned vendors</label>
      <div><label style="font-size:13px;margin-right:14px"><input type="checkbox" checked/> DNJ</label>
           <label style="font-size:13px"><input type="checkbox"/> Elegant</label></div>
      <div class="field-help">Selecting both makes this a cross-vendor Collection. Children live in each vendor's own project; Collection aggregates progress.</div>
    </div>
  ` : `
    <div class="field-row"><label>Project<span class="req">*</span></label>
      <select><option>DNJ</option><option>Elegant</option></select></div>
    <div class="field-row"><label>Issue Type<span class="req">*</span></label>
      <select onchange="CREATE_STEP.type=this.value;renderCreate()">
        <option>Style</option><option>Collection</option><option selected>Sub-task</option>
      </select></div>
    <div class="field-row"><label>Parent<span class="req">*</span></label>
      <input placeholder="${CREATE_STEP.parent || 'Style key (e.g. DNJ-001)'}" value="${CREATE_STEP.parent||''}"/></div>
    <div class="field-row"><label>Summary<span class="req">*</span></label>
      <input placeholder="e.g. Approve sketch v2"/></div>
    <div class="field-row"><label>Description</label><textarea rows="3"></textarea></div>
    <div class="field-row"><label>Assignee<span class="req">*</span></label><select>${userOpts}</select></div>
    <div class="field-row"><label>Due date</label><input type="date"/></div>
    <div class="field-row"><label>Gating</label>
      <label style="font-size:13px"><input type="checkbox"/> Must be completed before parent can advance phase</label>
      <div class="field-help">Custom checkbox field. Workflow validator on parent transition blocks phase change if any gating sub-task is not Done.</div></div>
    <div class="field-row"><label>Security level</label>
      <select><option>Inherit from parent</option><option>DDLNY only</option></select>
      <div class="field-help">Setting "DDLNY only" makes this sub-task invisible to vendor users.</div></div>
  `;

  el('createModalPanel').innerHTML = `
    <div class="create-header">
      <h2>Create issue</h2>
      <button class="btn btn-ghost btn-icon-only" onclick="closeCreate()">✕</button>
    </div>
    <div class="create-body">
      ${fields}
    </div>
    <div class="create-footer">
      <label style="font-size:12px;color:var(--N200)"><input type="checkbox"/> Create another</label>
      <div class="flex gap-8">
        <button class="btn" onclick="closeCreate()">Cancel</button>
        <button class="btn primary" onclick="alert('Mockup — in the live build this POSTs /rest/api/3/issue');closeCreate()">Create</button>
      </div>
    </div>
  `;
}

/* ---------------- Transitions (enforced by Jira Workflow Conditions) ----
   DDLNY policy (decided 2026-04-20): ddlny-pd group is the ONLY group that
   can transition a Style OR a Collection. Vendors have zero phase-move
   authority — not forward, not backward, not Hold, not Cancel, not Repair.
*/
function canTransition(_allowedRoles) {
  return ROLE === 'ddlny';
}

function toggleStatusMenu(ev, key) {
  ev.stopPropagation();
  const menu = document.getElementById('statusMenu');
  if (!menu) return;
  if (menu.style.display === 'block') { menu.style.display = 'none'; return; }

  // Dispatch: Collection (PD-N) vs Style (DNJ-N / ELG-N)
  let currentStatus, targetSet, isCollection = false;
  if (key.startsWith('PD-')) {
    const coll = visibleCollections().find(c => c.pdKey === key);
    if (!coll) return;
    currentStatus = coll.status;
    targetSet = { Planning: ['In Development','Archived'], 'In Development': ['Planning','Delivered','Archived'], Delivered: ['Archived','In Development'], Archived: ['In Development'] }[currentStatus] || [];
    isCollection = true;
  } else {
    const i = DATA.items.find(x => x.key === key);
    if (!i) return;
    currentStatus = i.status;
    const avail = (DATA.transitions || {})[currentStatus] || {};
    targetSet = Object.keys(avail);
  }

  const canMove = canTransition();
  if (!targetSet.length) {
    menu.innerHTML = `<div class="status-menu-empty">
      <b>No transitions.</b> <code>${currentStatus}</code> is a terminal status — nowhere to move to.
    </div>`;
  } else if (!canMove) {
    menu.innerHTML = `<div class="status-menu-empty">
      <b>🔒 No transitions available to your role.</b><br><br>
      All ${targetSet.length} outgoing transitions from <code>${currentStatus}</code> require the <code>ddlny-pd</code> group. Ask a DDLNY admin to move this.
    </div>`;
  } else {
    menu.innerHTML = `
      <div class="status-menu-heading">Move to</div>
      ${targetSet.map(target => {
        const sc = (isCollection ? COLL_STATUS_CATEGORY : STATUS_CATEGORY)[target] || 'default';
        return `<div class="status-menu-item" onclick="doTransition('${key}','${escapeAttr(target)}')">
          <span class="lozenge ${sc}">${target}</span>
        </div>`;
      }).join('')}
    `;
  }

  const btn = ev.currentTarget;
  const r = btn.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.left = r.left + 'px';
  menu.style.top = (r.bottom + 4) + 'px';
  menu.style.display = 'block';
}

function doTransition(key, target) {
  if (!canTransition()) {
    alert('🔒 Your role cannot execute this transition. In real Jira, the workflow Condition would have hidden this button entirely.');
    return;
  }

  if (key.startsWith('PD-')) {
    // Collection transition
    const idx = parseInt(key.slice(3), 10) - 1;
    const c = (DATA.collections_list || [])[idx];
    if (c) c.status = target;
  } else {
    // Style transition
    const i = DATA.items.find(x => x.key === key);
    if (!i) return;
    const from = i.status;
    i.status = target;
    i.status_date = new Date().toISOString().slice(0, 10);
    (i.activity_log ||= []).push({
      ts: new Date().toISOString(),
      user: ROLES[ROLE].initials,
      user_name: ROLES[ROLE].name,
      kind: 'status_changed', field: 'Status', from, to: target,
    });
  }
  hideStatusMenu();
  ISSUE_TAB = 'history';
  renderDrawer();
  render();
}

function hideStatusMenu() {
  const menu = document.getElementById('statusMenu');
  if (menu) menu.style.display = 'none';
}

/* ======================= TOP-NAV OPENERS ======================= */

function openYourWork()       { TOP_VIEW = 'your-work';  updateTopNavActive(); render(); }
function openDashboardsPage() { TOP_VIEW = 'dashboards'; updateTopNavActive(); render(); }
function openDashboard(key)   { TOP_VIEW = 'dashboard';  DASHBOARD_KEY = key; updateTopNavActive(); render(); }
function openFiltersPage()    { TOP_VIEW = 'filters';    updateTopNavActive(); render(); }
function openFilter(key)      { TOP_VIEW = 'filter-results'; FILTER_KEY = key; updateTopNavActive(); render(); }
function openProjectView()    { TOP_VIEW = null;         updateTopNavActive(); render(); }

function updateTopNavActive() {
  const map = { 'your-work':'your-work', 'dashboards':'dashboards', 'dashboard':'dashboards', 'filters':'filters', 'filter-results':'filters', 'search':null };
  const activeKey = TOP_VIEW ? (map[TOP_VIEW] || null) : 'projects';
  document.querySelectorAll('.nav-items .nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.topnav === activeKey);
  });
}

/* Wire any element with data-open-key / data-dashboard / data-filter to open the right drawer/view. */
function bindGlobalLinks() {
  document.querySelectorAll('[data-open-key]').forEach(ele => {
    ele.addEventListener('click', () => {
      const k = ele.dataset.openKey;
      const found = findIssue(k);
      if (!found) return;
      if (found.type === 'collection') openCollectionDrawer(k);
      else if (found.type === 'subtask') openSubtaskDrawer(k);
      else openDrawer(k);
    });
  });
  document.querySelectorAll('[data-dashboard]').forEach(ele => {
    ele.addEventListener('click', () => openDashboard(ele.dataset.dashboard));
  });
  document.querySelectorAll('[data-filter]').forEach(ele => {
    ele.addEventListener('click', () => openFilter(ele.dataset.filter));
  });
}

/* ======================= YOUR WORK (cross-project home) ======================= */

function viewYourWork() {
  const r = ROLES[ROLE];
  const visibleAll = DATA.items.filter(i => r.canSee.includes(i.vendor));
  // "Assigned to me" matches owner = role.initials (DDLNY styles) or sub-task assignee
  let assignedToMe = visibleAll.filter(i => i.owner === r.initials);
  // Fallback for demo: if empty, take 8 recent items to keep page populated
  if (!assignedToMe.length) assignedToMe = visibleAll.slice().sort((a,b)=>(b.status_date||'').localeCompare(a.status_date||'')).slice(0,8);
  const recentlyWorked = visibleAll.slice().sort((a,b) => (b.status_date||'').localeCompare(a.status_date||'')).slice(0, 6);
  const mySubtasks = [];
  visibleAll.forEach(i => (i.subtasks||[]).forEach(s => {
    if (s.status === 'Done') return;
    if (s.ddlny_only && ROLE !== 'ddlny') return;
    if (s.assignee === r.initials) mySubtasks.push({ ...s, parentKey: i.key, parentSummary: i.style_no });
  }));

  const boards = [
    { proj: 'DNJ', name: 'DNJ Board',      color: '#6554C0' },
    { proj: 'ELG', name: 'Elegant Board',  color: '#FF5630' },
    { proj: 'PD',  name: 'PD Collections', color: '#00875A' },
  ].filter(b => r.projectsVisible.includes(b.proj));

  return `
    <div class="breadcrumbs"><span class="current">Your work</span></div>
    <div class="page-header">
      <h1 class="page-title">Your work</h1>
    </div>
    <div class="yw-tabs">
      <button class="yw-tab active">Worked on</button>
      <button class="yw-tab">Viewed</button>
      <button class="yw-tab">Assigned to me <span class="yw-tab-count">${assignedToMe.length + mySubtasks.length}</span></button>
      <button class="yw-tab">Starred</button>
      <button class="yw-tab">Boards</button>
    </div>

    <h2 class="yw-section-title">Worked on recently</h2>
    <div class="yw-grid">
      ${recentlyWorked.map(i => yourWorkCard(i)).join('')}
    </div>

    <h2 class="yw-section-title" style="margin-top:20px">Assigned to me <span class="muted text-sm" style="font-weight:400">(${assignedToMe.length + mySubtasks.length})</span></h2>
    ${assignedToMe.length ? `
      <div class="list-view" style="margin-top:8px">
        <table class="list-table">
          <tbody>
            ${assignedToMe.slice(0,10).map(i => {
              const cat = STATUS_CATEGORY[i.status] || 'default';
              const p = userLookup(i.owner);
              return `<tr data-open-key="${i.key}" style="cursor:pointer">
                <td style="width:32px"><span class="issue-type ${TYPE_CLASS[i.issue_type]||'style'}">S</span></td>
                <td style="width:80px"><span class="issue-key">${i.key}</span></td>
                <td>${escapeHtml(i.style_no||'')}</td>
                <td style="width:130px"><span class="lozenge ${cat}">${i.status}</span></td>
                <td class="muted" style="width:80px">${i.vendor==='Elegant'?'Elegant':'DNJ'}</td>
                <td style="width:32px"><span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
    ${mySubtasks.length ? `
      <div class="list-view" style="margin-top:8px">
        <div style="padding:8px 12px;background:var(--N20);border-bottom:1px solid var(--N30);font-size:12px;font-weight:600;color:var(--N300)">Sub-tasks assigned to me</div>
        <table class="list-table">
          <tbody>
            ${mySubtasks.slice(0,10).map(s => {
              const sc = s.status==='Done'?'done':s.status==='In Progress'?'in-progress':'default';
              const today = DATA.today || '2026-04-20';
              const overdue = s.due_date && s.due_date < today;
              return `<tr data-open-key="${s.key}" style="cursor:pointer">
                <td style="width:32px"><span class="issue-type subtask">↳</span></td>
                <td style="width:110px"><span class="issue-key">${s.key}</span></td>
                <td>${escapeHtml(s.summary)}</td>
                <td style="width:100px"><span class="lozenge ${sc}">${s.status}</span></td>
                <td class="muted" style="width:110px">Parent: ${s.parentKey}</td>
                <td style="width:90px;${overdue?'color:var(--R400)':'color:var(--N100)'}">${s.due_date||'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <h2 class="yw-section-title" style="margin-top:20px">Boards you frequent</h2>
    <div class="yw-boards">
      ${boards.map(b => `<div class="yw-board-card" onclick="switchProject('${b.proj}');openProjectView();">
        <div class="proj-avatar" style="background:${b.color};width:28px;height:28px;font-size:11px">${b.proj}</div>
        <div>
          <div style="font-weight:500;font-size:14px">${b.name}</div>
          <div class="muted text-xs">${b.proj === 'PD' ? 'Cross-vendor collections' : 'Styles + sub-tasks'}</div>
        </div>
      </div>`).join('')}
    </div>
  `;
}

function yourWorkCard(i) {
  const cat = STATUS_CATEGORY[i.status] || 'default';
  const p = userLookup(i.owner);
  const cover = i.images?.[0] ? `<img class="yw-card-cover" src="../mockup/images/${i.images[0]}" loading="lazy"/>` : '';
  return `<div class="yw-card" data-open-key="${i.key}" style="cursor:pointer">
    ${cover}
    <div class="yw-card-body">
      <div class="yw-card-project">${i.vendor==='Elegant'?'Elegant':'DNJ'} · <span class="issue-key">${i.key}</span></div>
      <div class="yw-card-summary">${escapeHtml(i.style_no||i.key)}</div>
      <div class="yw-card-foot">
        <span class="lozenge ${cat}">${i.status}</span>
        <span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span>
      </div>
    </div>
  </div>`;
}

/* ======================= DASHBOARDS ======================= */

function viewDashboardsList() {
  return `
    <div class="breadcrumbs"><span class="current">Dashboards</span></div>
    <div class="page-header">
      <h1 class="page-title">Dashboards</h1>
      <div class="page-actions"><button class="btn primary">+ Create dashboard</button></div>
    </div>
    <div class="filter-bar">
      <input class="filter-search" placeholder="Search dashboards"/>
      <button class="filter-chip-ghost">Owner</button>
      <button class="filter-chip-ghost">Shared with me</button>
    </div>
    <div class="list-view">
      <table class="list-table">
        <thead><tr><th style="width:24px"></th><th>Name</th><th>Owner</th><th>Shared with</th><th>Last viewed</th><th style="width:24px"></th></tr></thead>
        <tbody>
          ${DASHBOARDS.map(d => {
            const o = userLookup(d.owner);
            return `<tr data-dashboard="${d.key}" style="cursor:pointer">
              <td><span style="color:var(--Y400)">☆</span></td>
              <td><a style="font-weight:500">${escapeHtml(d.name)}</a></td>
              <td><span class="mini-avatar sm" style="background:${o.color}">${o.initials}</span> ${escapeHtml(o.name||d.owner)}</td>
              <td class="muted">${d.shared.join(', ')}</td>
              <td class="muted">Today</td>
              <td class="muted">•••</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="muted text-xs" style="padding:12px">
      Dashboards are 100% native in Jira Cloud Standard. Build them with the "+ Add gadget" UI — point each gadget at a saved JQL filter and Jira scopes the data per viewer's permissions automatically.
    </div>
  `;
}

function viewDashboard(key) {
  if (key === 'wincys-pd-overview') return dashboardWincysPD();
  const d = DASHBOARDS.find(x => x.key === key);
  return `
    <div class="breadcrumbs"><a onclick="openDashboardsPage()">Dashboards</a><span class="sep">/</span><span class="current">${escapeHtml(d?.name||'Dashboard')}</span></div>
    <div class="page-header"><h1 class="page-title">${escapeHtml(d?.name||'Dashboard')}</h1></div>
    <div class="empty-state">
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-title">Dashboard placeholder</div>
      <div class="empty-state-sub">Real Jira renders gadgets here. Build this dashboard via the "+ Add gadget" UI once the instance is provisioned. Layout: ${d?.shared.join(' + ')||'n/a'}.</div>
    </div>
  `;
}

function dashboardWincysPD() {
  const r = ROLES[ROLE];
  const visibleAll = DATA.items.filter(i => r.canSee.includes(i.vendor));
  const total = visibleAll.length;
  const assignedToMe = visibleAll.filter(i => i.owner === r.initials).slice(0, 6);
  const display = assignedToMe.length ? assignedToMe : visibleAll.slice().sort((a,b)=>(b.status_date||'').localeCompare(a.status_date||'')).slice(0,6);
  const byStatus = {};
  visibleAll.forEach(i => { byStatus[i.status] = (byStatus[i.status]||0)+1; });
  const byVendor = { DNJ: visibleAll.filter(i=>i.vendor==='DNJ').length, Elegant: visibleAll.filter(i=>i.vendor==='Elegant').length };
  const today = DATA.today || '2026-04-20';
  const upcoming = (DATA.collections_list||[]).filter(c => c.launch_date && c.launch_date > today).slice(0,5);
  const recent = visibleAll.filter(i => i.comments?.length).slice(0, 6);

  return `
    <div class="breadcrumbs"><a onclick="openDashboardsPage()">Dashboards</a><span class="sep">/</span><span class="current">Wincy's PD Overview</span></div>
    <div class="page-header">
      <h1 class="page-title">Wincy's PD Overview</h1>
      <div class="page-actions">
        <button class="btn">+ Add gadget</button>
        <button class="btn">Share</button>
        <button class="btn">Tools ▾</button>
        <button class="btn">•••</button>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="gadget gadget-w2">
        <div class="gadget-head"><span>Assigned to me</span><span class="gadget-menu">⚙</span></div>
        <div class="gadget-body">
          ${display.length ? `
            <table class="gadget-table">
              ${display.map(i => `<tr data-open-key="${i.key}" style="cursor:pointer">
                <td style="width:28px"><span class="issue-type style">S</span></td>
                <td style="width:72px"><span class="issue-key">${i.key}</span></td>
                <td>${escapeHtml(i.style_no||'')}</td>
                <td style="width:120px"><span class="lozenge ${STATUS_CATEGORY[i.status]||'default'}">${i.status}</span></td>
              </tr>`).join('')}
            </table>
          ` : '<div class="muted text-sm" style="padding:20px;text-align:center">Nothing currently assigned</div>'}
        </div>
      </div>

      <div class="gadget gadget-w1">
        <div class="gadget-head"><span>Status breakdown</span><span class="gadget-menu">⚙</span></div>
        <div class="gadget-body">
          ${(DATA.workflow||[]).map(s => {
            const c = byStatus[s] || 0;
            if (!c) return '';
            const pct = total ? Math.round(100*c/total) : 0;
            return `<div class="summary-bar-row" style="grid-template-columns:120px 1fr 30px">
              <span><span class="lozenge ${STATUS_CATEGORY[s]||'default'}">${s}</span></span>
              <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${pct}%"></div></div>
              <span class="summary-bar-count">${c}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="gadget gadget-w2">
        <div class="gadget-head"><span>Upcoming launches — next 90 days</span><span class="gadget-menu">⚙</span></div>
        <div class="gadget-body">
          ${upcoming.length ? `
            <table class="gadget-table">
              ${upcoming.map(c => {
                const pdk = `PD-${(DATA.collections_list||[]).findIndex(x=>x.name===c.name)+1}`;
                return `<tr data-open-key="${pdk}" style="cursor:pointer">
                  <td style="width:28px"><span class="issue-type collection">E</span></td>
                  <td style="width:70px"><span class="issue-key">${pdk}</span></td>
                  <td>${escapeHtml(c.name)}</td>
                  <td class="muted" style="width:110px">${escapeHtml(c.customer||'—')}</td>
                  <td class="muted" style="width:100px">${c.launch_date}</td>
                </tr>`;
              }).join('')}
            </table>
          ` : '<div class="muted text-sm" style="padding:20px;text-align:center">No upcoming launches</div>'}
        </div>
      </div>

      <div class="gadget gadget-w1">
        <div class="gadget-head"><span>Style counts</span><span class="gadget-menu">⚙</span></div>
        <div class="gadget-body">
          <div class="kpi-stat"><b style="font-size:24px">${total}</b><span class="muted">Total visible to you</span></div>
          ${ROLE === 'ddlny' ? `
            <div class="kpi-stat"><b>${byVendor.DNJ}</b><span class="muted">DNJ styles</span></div>
            <div class="kpi-stat"><b>${byVendor.Elegant}</b><span class="muted">Elegant styles</span></div>
          ` : ''}
          <div class="kpi-stat"><b>${(DATA.collections_list||[]).length}</b><span class="muted">Collections</span></div>
        </div>
      </div>

      <div class="gadget gadget-wide">
        <div class="gadget-head"><span>Activity stream</span><span class="gadget-menu">⚙</span></div>
        <div class="gadget-body">
          ${recent.map(i => {
            const last = i.comments[i.comments.length-1];
            const p = userLookup(last.author || i.owner);
            return `<div class="activity-row" data-open-key="${i.key}" style="cursor:pointer">
              <span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span>
              <span><b>${escapeHtml(p.name||last.author||'?')}</b> commented on <span class="issue-key">${i.key}</span> · ${last.date||''}</span>
              <span class="muted text-xs" style="margin-left:auto;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml((last.body||'').slice(0,80))}</span>
            </div>`;
          }).join('') || '<div class="muted text-sm" style="padding:16px">No recent activity</div>'}
        </div>
      </div>
    </div>
  `;
}

/* ======================= FILTERS ======================= */

function viewFiltersList() {
  return `
    <div class="breadcrumbs"><span class="current">Filters</span></div>
    <div class="page-header">
      <h1 class="page-title">Filters</h1>
      <div class="page-actions"><button class="btn primary">+ Create filter</button></div>
    </div>
    <div class="filter-bar">
      <input class="filter-search" placeholder="Search filters"/>
      <button class="filter-chip-ghost">Owner</button>
      <button class="filter-chip-ghost">Starred</button>
    </div>
    <div class="list-view">
      <table class="list-table">
        <thead><tr><th style="width:24px"></th><th>Name</th><th>Owner</th><th>JQL</th><th>Shared</th></tr></thead>
        <tbody>
          ${SAVED_FILTERS.map(f => `<tr data-filter="${f.key}" style="cursor:pointer">
            <td><span style="color:var(--Y400)">☆</span></td>
            <td><a style="font-weight:500">${escapeHtml(f.name)}</a></td>
            <td class="muted">Aaryan M.</td>
            <td><code style="font-size:11px;background:var(--N20);padding:2px 4px;border-radius:2px">${escapeHtml(f.jql)}</code></td>
            <td class="muted">ddlny-pd</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function viewFilterResults(filterKey) {
  const filter = SAVED_FILTERS.find(f => f.key === filterKey);
  if (!filter) return viewEmpty('filter', 'Filter not found', '');
  const r = ROLES[ROLE];
  let items = DATA.items.filter(i => r.canSee.includes(i.vendor));

  if (filterKey === 'overdue') {
    const today = DATA.today || '2026-04-20';
    const sub = [];
    items.forEach(i => (i.subtasks||[]).forEach(s => {
      if (s.status === 'Done') return;
      if (s.ddlny_only && ROLE !== 'ddlny') return;
      if (s.due_date && s.due_date < today) sub.push({ ...s, parentKey: i.key, parentSummary: i.style_no });
    }));
    return filterResultsSubtaskPage(filter, sub);
  }
  if (filterKey === 'cross-vendor-q3') {
    const colls = (DATA.collections_list||[]).filter(c => c.is_cross_vendor && c.launch_date >= '2026-07-01' && c.launch_date < '2026-10-01');
    return filterResultsCollectionPage(filter, colls);
  }

  if (filterKey === 'my-open')  items = items.filter(i => i.owner === r.initials && i.status !== 'Received & Approved' && i.status !== 'Cancelled');
  if (filterKey === '1kt-hot')  items = items.filter(i => i.is_1kt);
  if (filterKey === 'cad-stuck') items = items.filter(i => i.status === 'CAD');

  return `
    <div class="breadcrumbs"><a onclick="openFiltersPage()">Filters</a><span class="sep">/</span><span class="current">${escapeHtml(filter.name)}</span></div>
    <div class="page-header">
      <h1 class="page-title">${escapeHtml(filter.name)}</h1>
      <div class="page-actions"><button class="btn">Edit</button><button class="btn">Share</button></div>
    </div>
    <div class="muted text-sm" style="margin-bottom:12px">
      <code style="background:var(--N20);padding:2px 6px;border-radius:2px">${escapeHtml(filter.jql)}</code>
      · Auto-scoped to ${ROLES[ROLE].name}'s project permissions.
    </div>
    <div class="list-view">
      <table class="list-table">
        <thead><tr><th style="width:24px"></th><th style="width:80px">Key</th><th>Summary</th><th style="width:130px">Status</th><th>Assignee</th><th style="width:90px">Project</th></tr></thead>
        <tbody>
          ${items.slice(0,50).map(i => {
            const p = userLookup(i.owner);
            return `<tr data-open-key="${i.key}" style="cursor:pointer">
              <td><span class="issue-type style">S</span></td>
              <td><span class="issue-key">${i.key}</span></td>
              <td>${escapeHtml(i.style_no||'')}</td>
              <td><span class="lozenge ${STATUS_CATEGORY[i.status]||'default'}">${i.status}</span></td>
              <td><span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span> ${escapeHtml(p.name||'')}</td>
              <td class="muted">${i.vendor==='Elegant'?'Elegant':'DNJ'}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="6" class="muted" style="padding:24px;text-align:center">No results for this filter</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="muted text-xs" style="padding:8px">${items.length} result${items.length!==1?'s':''}.</div>
  `;
}

function filterResultsSubtaskPage(filter, sub) {
  return `
    <div class="breadcrumbs"><a onclick="openFiltersPage()">Filters</a><span class="sep">/</span><span class="current">${escapeHtml(filter.name)}</span></div>
    <div class="page-header"><h1 class="page-title">${escapeHtml(filter.name)}</h1></div>
    <div class="muted text-sm" style="margin-bottom:12px"><code style="background:var(--N20);padding:2px 6px;border-radius:2px">${escapeHtml(filter.jql)}</code></div>
    <div class="list-view">
      <table class="list-table">
        <thead><tr><th style="width:24px"></th><th style="width:100px">Key</th><th>Summary</th><th style="width:110px">Parent</th><th style="width:100px">Status</th><th style="width:100px">Due</th><th style="width:32px">Assignee</th></tr></thead>
        <tbody>
          ${sub.slice(0,50).map(s => {
            const p = userLookup(s.assignee);
            const sc = s.status==='Done'?'done':s.status==='In Progress'?'in-progress':'default';
            return `<tr data-open-key="${s.key}" style="cursor:pointer">
              <td><span class="issue-type subtask">↳</span></td>
              <td><span class="issue-key">${s.key}</span></td>
              <td>${escapeHtml(s.summary)}</td>
              <td><span class="issue-key">${s.parentKey}</span></td>
              <td><span class="lozenge ${sc}">${s.status}</span></td>
              <td style="color:var(--R400)">${s.due_date||'—'}</td>
              <td><span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span></td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" class="muted" style="padding:24px;text-align:center">No overdue sub-tasks — nice.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="muted text-xs" style="padding:8px">${sub.length} result${sub.length!==1?'s':''}.</div>
  `;
}

function filterResultsCollectionPage(filter, colls) {
  return `
    <div class="breadcrumbs"><a onclick="openFiltersPage()">Filters</a><span class="sep">/</span><span class="current">${escapeHtml(filter.name)}</span></div>
    <div class="page-header"><h1 class="page-title">${escapeHtml(filter.name)}</h1></div>
    <div class="muted text-sm" style="margin-bottom:12px"><code style="background:var(--N20);padding:2px 6px;border-radius:2px">${escapeHtml(filter.jql)}</code></div>
    <div class="list-view">
      <table class="list-table">
        <thead><tr><th style="width:24px"></th><th style="width:70px">Key</th><th>Collection</th><th>Customer</th><th style="width:100px">Launch</th><th style="width:140px">Status</th></tr></thead>
        <tbody>
          ${colls.map(c => {
            const pdk = `PD-${(DATA.collections_list||[]).findIndex(x=>x.name===c.name)+1}`;
            return `<tr data-open-key="${pdk}" style="cursor:pointer">
              <td><span class="issue-type collection">E</span></td>
              <td><span class="issue-key">${pdk}</span></td>
              <td>${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.customer||'—')}</td>
              <td class="muted">${c.launch_date}</td>
              <td><span class="lozenge ${COLL_STATUS_CATEGORY[c.status]||'default'}">${c.status}</span></td>
            </tr>`;
          }).join('') || '<tr><td colspan="6" class="muted" style="padding:24px;text-align:center">No matching collections</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="muted text-xs" style="padding:8px">${colls.length} result${colls.length!==1?'s':''}.</div>
  `;
}

/* ======================= GLOBAL SEARCH RESULTS ======================= */

function viewSearchResults() {
  const q = FILTERS.search;
  if (!q) return '';
  const r = ROLES[ROLE];
  const matchStyle = (i) => (
    (i.style_no||'').toLowerCase().includes(q) ||
    (i.po_no||'').toLowerCase().includes(q) ||
    (i.category||'').toLowerCase().includes(q) ||
    (i.key||'').toLowerCase().includes(q) ||
    (i.description||'').toLowerCase().includes(q)
  );
  const styles = DATA.items.filter(i => r.canSee.includes(i.vendor) && matchStyle(i));
  const colls = (DATA.collections_list||[]).filter(c =>
    (c.name||'').toLowerCase().includes(q) ||
    (c.key||'').toLowerCase().includes(q) ||
    (c.customer||'').toLowerCase().includes(q)
  );
  const subs = [];
  DATA.items.forEach(i => {
    if (!r.canSee.includes(i.vendor)) return;
    (i.subtasks||[]).forEach(s => {
      if (s.ddlny_only && ROLE !== 'ddlny') return;
      if ((s.summary||'').toLowerCase().includes(q) || (s.key||'').toLowerCase().includes(q)) {
        subs.push({ ...s, parentKey: i.key });
      }
    });
  });
  const totalFound = styles.length + colls.length + subs.length;

  return `
    <div class="breadcrumbs"><span class="current">Search results</span></div>
    <div class="page-header">
      <h1 class="page-title">Results for "${escapeHtml(q)}"</h1>
      <div class="page-actions muted text-sm">${totalFound} total · across all projects visible to you</div>
    </div>
    ${styles.length ? `
      <h3 style="font-size:11px;font-weight:700;color:var(--N200);margin:16px 0 6px;text-transform:uppercase;letter-spacing:0.5px">Styles (${styles.length})</h3>
      <div class="list-view">
        <table class="list-table">
          <tbody>
            ${styles.slice(0,15).map(i => {
              const p = userLookup(i.owner);
              return `<tr data-open-key="${i.key}" style="cursor:pointer">
                <td style="width:32px"><span class="issue-type style">S</span></td>
                <td style="width:80px"><span class="issue-key">${i.key}</span></td>
                <td>${escapeHtml(i.style_no||'')}</td>
                <td style="width:130px"><span class="lozenge ${STATUS_CATEGORY[i.status]||'default'}">${i.status}</span></td>
                <td class="muted" style="width:80px">${i.vendor==='Elegant'?'Elegant':'DNJ'}</td>
                <td style="width:32px"><span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
    ${colls.length ? `
      <h3 style="font-size:11px;font-weight:700;color:var(--N200);margin:16px 0 6px;text-transform:uppercase;letter-spacing:0.5px">Collections (${colls.length})</h3>
      <div class="list-view">
        <table class="list-table">
          <tbody>
            ${colls.slice(0,10).map(c => {
              const pdk = `PD-${(DATA.collections_list||[]).findIndex(x=>x.name===c.name)+1}`;
              return `<tr data-open-key="${pdk}" style="cursor:pointer">
                <td style="width:32px"><span class="issue-type collection">E</span></td>
                <td style="width:80px"><span class="issue-key">${pdk}</span></td>
                <td>${escapeHtml(c.name)}</td>
                <td style="width:140px"><span class="lozenge ${COLL_STATUS_CATEGORY[c.status]||'default'}">${c.status}</span></td>
                <td class="muted">${escapeHtml(c.customer||'—')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
    ${subs.length ? `
      <h3 style="font-size:11px;font-weight:700;color:var(--N200);margin:16px 0 6px;text-transform:uppercase;letter-spacing:0.5px">Sub-tasks (${subs.length})</h3>
      <div class="list-view">
        <table class="list-table">
          <tbody>
            ${subs.slice(0,10).map(s => {
              const sc = s.status==='Done'?'done':s.status==='In Progress'?'in-progress':'default';
              return `<tr data-open-key="${s.key}" style="cursor:pointer">
                <td style="width:32px"><span class="issue-type subtask">↳</span></td>
                <td style="width:110px"><span class="issue-key">${s.key}</span></td>
                <td>${escapeHtml(s.summary)}</td>
                <td style="width:110px"><span class="lozenge ${sc}">${s.status}</span></td>
                <td class="muted">Parent: ${s.parentKey}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
    ${totalFound === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No results for "${escapeHtml(q)}"</div>
        <div class="empty-state-sub">Try a different search term, or clear the box to return to your previous view.</div>
      </div>
    ` : ''}
  `;
}

/* ======================= SUB-TASK DRAWER ======================= */

function renderSubtaskDrawer() {
  const found = findIssue(CURRENT_KEY);
  if (!found || found.type !== 'subtask') return;
  const s = found.data;
  const parent = found.parent;
  const asg = userLookup(s.assignee);
  const sc = s.status==='Done'?'done':s.status==='In Progress'?'in-progress':'default';
  const today = DATA.today || '2026-04-20';
  const overdue = s.status !== 'Done' && s.due_date && s.due_date < today;

  el('issueDrawerPanel').innerHTML = `
    <div class="iv-breadcrumbs">
      <a>Projects</a><span class="sep">/</span>
      <a>${parent.vendor==='Elegant'?'Elegant':'DNJ'}</a><span class="sep">/</span>
      <a onclick="openDrawer('${parent.key}')"><span class="issue-type style" style="width:14px;height:14px;font-size:9px">S</span> <span class="issue-key">${parent.key}</span></a><span class="sep">/</span>
      <span class="issue-type subtask">↳</span>
      <span class="issue-key">${s.key}</span>
    </div>
    <div class="iv-header">
      <div class="iv-actions">
        <button class="btn btn-ghost">👁 Add watcher</button>
        <button class="btn btn-ghost">⚙ Automation</button>
        <button class="iv-star">☆</button>
        <button class="btn btn-ghost">•••</button>
        <button class="btn btn-ghost" onclick="closeDrawer()">✕</button>
      </div>
      <h1 class="iv-title" contenteditable="true">${escapeHtml(s.summary)}</h1>
      <div class="iv-toolbar">
        <button class="status-btn ${sc}">${s.status} ▾</button>
        ${s.gating ? '<span class="lozenge gate" style="margin-left:4px">GATE</span>' : ''}
        ${s.ddlny_only && ROLE==='ddlny' ? '<span class="lozenge ddlny-only" style="margin-left:4px">DDLNY-only</span>' : ''}
      </div>
    </div>

    <div class="iv-body">
      <div class="iv-main">
        <div class="iv-section">
          <h4>Description</h4>
          <div class="iv-description">${escapeHtml(s.description||'')||'<span class="muted">No description.</span>'}</div>
        </div>

        <div class="iv-section">
          <h4>Parent issue</h4>
          <div class="child-issue-row" data-open-key="${parent.key}" style="cursor:pointer">
            <span class="issue-type style" title="Style">S</span>
            <span class="child-issue-key">${parent.key}</span>
            <span class="child-issue-summary">${escapeHtml(parent.style_no||'')}</span>
            <span></span>
            <span class="lozenge ${STATUS_CATEGORY[parent.status]||'default'}">${parent.status}</span>
            <span></span>
          </div>
        </div>

        <div class="iv-section">
          <h4>Activity</h4>
          <div class="activity-tabs">
            <button class="activity-tab ${ISSUE_TAB==='comments'?'active':''}" onclick="ISSUE_TAB='comments';renderDrawer()">Comments</button>
            <button class="activity-tab ${ISSUE_TAB==='history'?'active':''}" onclick="ISSUE_TAB='history';renderDrawer()">History</button>
          </div>
          ${ISSUE_TAB==='comments' ? '<div class="muted text-sm" style="padding:10px">No comments yet.</div>' : '<div class="muted text-sm" style="padding:10px">No history yet.</div>'}
        </div>
      </div>

      <div class="iv-side">
        <div class="iv-section">
          <h4>Details</h4>
          <div class="side-field"><span class="side-field-label">Assignee</span>
            <span class="side-field-value flex-center gap-6">
              <span class="mini-avatar sm" style="background:${asg.color}">${asg.initials}</span>${escapeHtml(asg.name||'')}
            </span></div>
          <div class="side-field"><span class="side-field-label">Parent</span>
            <span class="side-field-value"><a onclick="openDrawer('${parent.key}')">${parent.key}</a></span></div>
          <div class="side-field"><span class="side-field-label">Due date</span>
            <span class="side-field-value" style="${overdue?'color:var(--R400)':''}">${s.due_date||'—'}${overdue?' · overdue':''}</span></div>
          <div class="side-field"><span class="side-field-label">Gating</span>
            <span class="side-field-value">${s.gating ? '<span class="lozenge gate">GATE</span> Blocks parent advance' : '<span class="empty">Not gating</span>'}</span></div>
          <div class="side-field"><span class="side-field-label">Security</span>
            <span class="side-field-value">${s.ddlny_only
              ? '<span class="lozenge ddlny-only">DDLNY-only</span>'
              : `<span class="lozenge default">${parent.vendor}-visible (inherit)</span>`}</span></div>
          <div class="side-field"><span class="side-field-label">Phase at creation</span>
            <span class="side-field-value">${escapeHtml(s.phase_when_created||'—')}</span></div>
          <div class="side-field"><span class="side-field-label">Template</span>
            <span class="side-field-value">${escapeHtml(s.template||'—')}</span></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    document.querySelectorAll('#issueDrawerPanel [data-open-key]').forEach(r => {
      r.addEventListener('click', () => {
        const k = r.dataset.openKey;
        const f = findIssue(k);
        if (!f) return;
        if (f.type === 'collection') openCollectionDrawer(k);
        else if (f.type === 'subtask') openSubtaskDrawer(k);
        else openDrawer(k);
      });
    });
  }, 0);
}

/* ======================= NOTIFICATIONS ======================= */

function toggleNotifications(ev) {
  ev.stopPropagation();
  const menu = el('notificationsMenu');
  if (!menu) return;
  if (menu.style.display === 'block') { menu.style.display = 'none'; return; }
  const r = ROLES[ROLE];
  const visibleAll = DATA.items.filter(i => r.canSee.includes(i.vendor));
  const notifications = [];
  visibleAll.forEach(i => {
    const last = (i.comments||[])[ (i.comments||[]).length-1 ];
    if (last && last.author && last.author !== r.initials) {
      notifications.push({ parentKey: i.key, author: last.author, body: (last.body||'').slice(0,120), date: last.date });
    }
  });
  notifications.sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const top = notifications.slice(0, 8);

  menu.className = 'notifications-menu';
  menu.innerHTML = `
    <div class="notifications-header">
      <b>Notifications</b>
      <a class="text-xs muted" style="cursor:pointer">Mark all read</a>
    </div>
    <div class="notifications-body">
      ${top.length ? top.map(n => {
        const p = userLookup(n.author);
        return `<div class="notif-row" data-open-key="${n.parentKey}" style="cursor:pointer">
          <span class="mini-avatar sm" style="background:${p.color}">${p.initials}</span>
          <div style="flex:1;min-width:0">
            <div class="notif-summary"><b>${escapeHtml(p.name||n.author)}</b> commented on <span class="issue-key">${n.parentKey}</span></div>
            <div class="notif-body">${escapeHtml(n.body)}</div>
            <div class="notif-date muted text-xs">${escapeHtml(n.date||'—')}</div>
          </div>
        </div>`;
      }).join('') : '<div class="muted text-sm" style="padding:16px;text-align:center">No notifications</div>'}
    </div>
    <div class="notifications-footer"><a>View all</a></div>
  `;

  const btn = ev.currentTarget;
  const rect = btn.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.display = 'block';

  // Wire notification rows to open the issue
  setTimeout(() => {
    menu.querySelectorAll('[data-open-key]').forEach(r => {
      r.addEventListener('click', () => {
        openDrawer(r.dataset.openKey);
        hideNotifications();
      });
    });
  }, 0);
}

function hideNotifications() {
  const menu = el('notificationsMenu');
  if (menu) menu.style.display = 'none';
}

function updateNotificationBadge() {
  const badge = document.querySelector('.nav-badge');
  if (!badge) return;
  // Representative unread count — not derived from data to stay stable across role switches
  const r = ROLES[ROLE];
  const counts = { ddlny: 7, dnj: 3, elegant: 2 };
  const n = counts[ROLE] || 0;
  badge.textContent = n;
  badge.style.display = n > 0 ? 'flex' : 'none';
}

/* ---------------- Helpers ---------------- */
function bindCards() {
  document.querySelectorAll('.card[data-key], tr[data-key]').forEach(c => {
    c.addEventListener('click', () => openDrawer(c.dataset.key));
  });
}
function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function priArrow(p) {
  if (p==='highest' || p==='critical') return '⬆';
  if (p==='high') return '▲';
  if (p==='medium') return '=';
  if (p==='low') return '▽';
  return '⬇';
}
function subIcon() { return `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`; }

/* Gallery-view legacy stub (mockup-native doesn't show this view — native Jira has no gallery) */
function viewGallery(items) {
  return viewEmpty('gallery', 'Gallery', 'Gallery is not a native Jira view. To browse styles visually, use the Board — its cards show cover images when the Image field is configured.');
}

/* ---------------- Window exports ---------------- */
window.openDrawer = openDrawer;
window.openCollectionDrawer = openCollectionDrawer;
window.openCollectionByName = openCollectionByName;
window.closeDrawer = closeDrawer;
window.openCreate = openCreate;
window.closeCreate = closeCreate;
window.render = render;
window.renderDrawer = renderDrawer;
window.renderCreate = renderCreate;
window.toggleStatusMenu = toggleStatusMenu;
window.doTransition = doTransition;
window.hideStatusMenu = hideStatusMenu;
window.toggleProjectSwitcher = toggleProjectSwitcher;
window.switchProject = switchProject;
window.hideProjectSwitcher = hideProjectSwitcher;
window.openYourWork = openYourWork;
window.openDashboardsPage = openDashboardsPage;
window.openDashboard = openDashboard;
window.openFiltersPage = openFiltersPage;
window.openFilter = openFilter;
window.openProjectView = openProjectView;
window.openSubtaskDrawer = openSubtaskDrawer;
window.toggleNotifications = toggleNotifications;
window.hideNotifications = hideNotifications;
window.FILTERS = FILTERS;
window.CREATE_STEP = CREATE_STEP;
Object.defineProperty(window, 'ISSUE_TAB', { get:()=>ISSUE_TAB, set:(v)=>{ISSUE_TAB=v;} });

init();
