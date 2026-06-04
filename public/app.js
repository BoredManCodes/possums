const app = document.getElementById('app');
const tabs = document.querySelectorAll('.tab[data-tab]');
const addBtn = document.querySelector('.tab--add');
const sheet = document.getElementById('add-sheet');
const sheetGrid = document.getElementById('add-grid');
const topTitle = document.getElementById('topbar-title');
const topSub = document.getElementById('topbar-sub');
const topBack = document.getElementById('topbar-back');

/* ---------- utilities ---------- */

const pad = (n) => String(n).padStart(2, '0');
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const nowLocalISO = () => `${nowLocal()}:${pad(new Date().getSeconds())}`;

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  const date = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return `${time}, ${date}`;
};

const relTime = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const fmtDuration = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const fmtTimer = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${pad(m)}:${pad(sec)}`
    : `${m}:${pad(sec)}`;
};

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const handleAuth = (r) => {
  if (r.status === 401) { window.location.href = '/login'; throw new Error('unauthorised'); }
  return r;
};
const api = {
  list: (path) => fetch(path).then(handleAuth).then((r) => r.json()),
  post: (path, body) =>
    fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleAuth).then(async (r) => {
      if (!r.ok) throw new Error((await r.text()) || `${r.status}`);
      if (r.status === 204) return null;
      return r.json();
    }),
  put: (path, body) =>
    fetch(path, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleAuth).then(async (r) => {
      if (!r.ok) throw new Error((await r.text()) || `${r.status}`);
      if (r.status === 204) return null;
      return r.json();
    }),
  patch: (path, body) =>
    fetch(path, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleAuth).then(async (r) => {
      if (!r.ok) throw new Error((await r.text()) || `${r.status}`);
      if (r.status === 204) return null;
      return r.json();
    }),
  del: (path) =>
    fetch(path, { method: 'DELETE' }).then(handleAuth).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`${r.status}`);
    }),
};

const me = { who: null, parents: { parent1: 'Parent 1', parent2: 'Parent 2' } };
const parentLabel = (who) => (who && me.parents[who]) || null;
const loadMe = async () => {
  try {
    const r = await fetch('/api/me').then(handleAuth).then((r) => r.json());
    me.who = r.who;
    if (r.parents) me.parents = r.parents;
  } catch {}
};

/* ---------- icons ---------- */

const ICONS = {
  bottle: `<svg viewBox="0 0 24 24"><path d="M9 2h6M10 2v3M14 2v3M8 6h8l-1 4v10a2 2 0 01-2 2h-2a2 2 0 01-2-2V10z"/></svg>`,
  breast: `<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/></svg>`,
  solid: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="7" rx="5" ry="3"/><path d="M12 10v11"/></svg>`,
  nappy: `<svg viewBox="0 0 24 24"><path d="M3 7l9 13 9-13-3-2H6L3 7z"/></svg>`,
  sleep: `<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>`,
  pump: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  med: `<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9v6"/></svg>`,
  growth: `<svg viewBox="0 0 24 24"><path d="M3 21V3h4v18M7 6h2M7 10h3M7 14h2M7 18h3"/></svg>`,
  bath: `<svg viewBox="0 0 24 24"><path d="M3 11h18l-1.5 6a3 3 0 01-3 2.5H7.5a3 3 0 01-3-2.5L3 11zM6 11V6a2 2 0 014 0M9 6h2"/></svg>`,
  tummy: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>`,
  milestone: `<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.5 6 .9-4.3 4.2 1 6L12 16.7 6.7 19.6l1-6L3.4 9.4l6-.9L12 3z"/></svg>`,
  spitup: `<svg viewBox="0 0 24 24"><path d="M5 7q7 6 14 0"/><path d="M9 13v4M12 13v6M15 13v4"/></svg>`,
  temp: `<svg viewBox="0 0 24 24"><path d="M14 4a2 2 0 10-4 0v9.5a4 4 0 104 0V4z"/><circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none"/></svg>`,
};

const chipHtml = (kind) => {
  const meta = ACT[kind];
  return `<div class="row__icon t-${meta.color}">${ICONS[meta.icon]}</div>`;
};

const sheetTileHtml = (kind) => {
  const meta = ACT[kind];
  return `<button class="sheet__tile" data-add="${kind}">
    <div class="sheet__tile-chip t-${meta.color}">${ICONS[meta.icon]}</div>
    <div class="sheet__tile-label">${meta.label}</div>
  </button>`;
};

/* ---------- activity registry ---------- */

const KIND_LABELS = {
  wet: 'Wet', dirty: 'Dirty', both: 'Wet + Dirty',
  small: 'Small', medium: 'Medium', large: 'Large', projectile: 'Projectile',
};

const ACT = {
  bottle:    { label: 'Bottle',      icon: 'bottle',    color: 'feed' },
  breast:    { label: 'Breast',      icon: 'breast',    color: 'feed' },
  solid:     { label: 'Solid',       icon: 'solid',     color: 'feed' },
  nappy:     { label: 'Nappy',       icon: 'nappy',     color: 'nappy' },
  spitup:    { label: 'Spit-up',     icon: 'spitup',    color: 'spitup' },
  sleep:     { label: 'Sleep',       icon: 'sleep',     color: 'sleep' },
  pump:      { label: 'Pump',        icon: 'pump',      color: 'pump' },
  med:       { label: 'Medicine',    icon: 'med',       color: 'med' },
  growth:    { label: 'Growth',      icon: 'growth',    color: 'growth' },
  bath:      { label: 'Bath',        icon: 'bath',      color: 'bath' },
  tummy:     { label: 'Tummy time',  icon: 'tummy',     color: 'tummy' },
  milestone: { label: 'Milestone',   icon: 'milestone', color: 'milestone' },
  temp:      { label: 'Temperature', icon: 'temp',      color: 'temp' },
};

const SHEET_ORDER = ['bottle', 'breast', 'solid', 'sleep', 'nappy', 'spitup', 'pump', 'med', 'temp', 'bath', 'tummy', 'growth', 'milestone'];

const TEMP_UNIT_KEY = 'possums_temp_unit';
const getTempUnit = () => (localStorage.getItem(TEMP_UNIT_KEY) === 'F' ? 'F' : 'C');
const setTempUnit = (u) => localStorage.setItem(TEMP_UNIT_KEY, u === 'F' ? 'F' : 'C');
const cToF = (c) => (c * 9) / 5 + 32;
const fToC = (f) => ((f - 32) * 5) / 9;
const fmtTemp = (c) => {
  if (c == null || !Number.isFinite(c)) return '';
  return getTempUnit() === 'F' ? `${cToF(c).toFixed(1)}°F` : `${c.toFixed(1)}°C`;
};

/* ---------- WHO weight-for-age percentile (LMS method, 0-24 months) ---------- */

const WHO_LMS = {
  boy: [
    [0.3487,3.3464,0.14602],[0.2297,4.4709,0.13395],[0.1970,5.5675,0.12385],
    [0.1738,6.3762,0.11727],[0.1553,7.0023,0.11316],[0.1395,7.5105,0.11099],
    [0.1257,7.9340,0.11000],[0.1134,8.2970,0.10959],[0.1021,8.6151,0.10941],
    [0.0917,8.9014,0.10919],[0.0822,9.1649,0.10901],[0.0732,9.4122,0.10894],
    [0.0648,9.6479,0.10885],[0.0569,9.8749,0.10861],[0.0493,10.0953,0.10850],
    [0.0422,10.3108,0.10847],[0.0353,10.5228,0.10832],[0.0287,10.7319,0.10815],
    [0.0224,10.9385,0.10795],[0.0164,11.1430,0.10772],[0.0105,11.3462,0.10751],
    [0.0050,11.5482,0.10728],[-0.0004,11.7491,0.10707],[-0.0057,11.9491,0.10685],
    [-0.0108,12.1483,0.10664],
  ],
  girl: [
    [0.3809,3.2322,0.14171],[0.1714,4.1873,0.13724],[0.1161,5.1282,0.13000],
    [0.0942,5.8458,0.12619],[0.0810,6.4237,0.12402],[0.0725,6.8985,0.12274],
    [0.0664,7.2970,0.12204],[0.0618,7.6422,0.12166],[0.0581,7.9487,0.12142],
    [0.0550,8.2254,0.12124],[0.0523,8.4800,0.12107],[0.0499,8.7192,0.12099],
    [0.0477,8.9481,0.12087],[0.0456,9.1699,0.12068],[0.0437,9.3862,0.12050],
    [0.0418,9.5991,0.12032],[0.0400,9.8097,0.12011],[0.0384,10.0183,0.11988],
    [0.0368,10.2255,0.11969],[0.0353,10.4315,0.11951],[0.0339,10.6366,0.11934],
    [0.0326,10.8408,0.11914],[0.0313,11.0444,0.11897],[0.0301,11.2477,0.11882],
    [0.0289,11.4506,0.11868],
  ],
};

const normalCDF = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) * poly;
  return z >= 0 ? p : 1 - p;
};

const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
};

const calcWeightPercentile = (weightKg, measuredAt, dob, gender) => {
  if (!weightKg || !measuredAt || !dob || !gender) return null;
  const dobDate = new Date(dob);
  const measDate = new Date(measuredAt);
  if (isNaN(dobDate.getTime()) || isNaN(measDate.getTime())) return null;
  const ageMonths = (measDate - dobDate) / (1000 * 60 * 60 * 24 * 30.4375);
  if (ageMonths < 0) return null;
  const table = WHO_LMS[gender];
  if (!table) return null;
  const lo = Math.min(Math.floor(ageMonths), 24);
  const hi = Math.min(lo + 1, 24);
  const frac = ageMonths - lo;
  const [L0, M0, S0] = table[lo];
  const [L1, M1, S1] = table[hi];
  const L = L0 + frac * (L1 - L0);
  const M = M0 + frac * (M1 - M0);
  const S = S0 + frac * (S1 - S0);
  const z = Math.abs(L) < 0.0001
    ? Math.log(weightKg / M) / S
    : (Math.pow(weightKg / M, L) - 1) / (L * S);
  return Math.round(Math.max(0, Math.min(99, normalCDF(z) * 100)));
};

/* ---------- normalisers: API rows → unified events ---------- */

const SOURCES = [
  { ep: '/api/feeds', tf: 'started_at', map: (f) => {
      const isBreast = f.kind === 'breast_l' || f.kind === 'breast_r';
      const kind = isBreast ? 'breast' : (f.kind || 'bottle');
      let title;
      if (kind === 'bottle') {
        if (f.amount_ml != null && f.started_ml != null) title = `${f.amount_ml}/${f.started_ml} ml bottle`;
        else if (f.amount_ml != null) title = `${f.amount_ml} ml bottle`;
        else title = 'Bottle';
      } else if (kind === 'solid') title = f.amount_ml ? `${f.amount_ml} g solids` : 'Solids';
      else {
        const side = f.kind === 'breast_l' ? 'L' : 'R';
        const dur = f.duration_seconds ? ` · ${fmtDuration(f.duration_seconds * 1000)}` : '';
        title = `Breast ${side}${dur}`;
      }
      return { id: f.id, kind, ts: f.started_at, title, ep: '/api/feeds', notes: f.notes, logged_by: f.logged_by, raw: f };
    } },
  { ep: '/api/nappies', tf: 'changed_at', map: (n) => ({
      id: n.id, kind: 'nappy', ts: n.changed_at,
      title: KIND_LABELS[n.kind] ?? n.kind, ep: '/api/nappies', notes: n.notes, logged_by: n.logged_by, raw: n,
    }) },
  { ep: '/api/naps', tf: 'started_at', map: (n) => {
      const dur = n.ended_at ? fmtDuration(new Date(n.ended_at) - new Date(n.started_at)) : 'in progress';
      return { id: n.id, kind: 'sleep', ts: n.started_at, title: `Sleep · ${dur}`, ep: '/api/naps', notes: n.notes, ended_at: n.ended_at, logged_by: n.logged_by, raw: n };
    } },
  { ep: '/api/pumps', tf: 'started_at', map: (p) => {
      const total = (p.ml_left ?? 0) + (p.ml_right ?? 0);
      const dur = p.ended_at ? fmtDuration(new Date(p.ended_at) - new Date(p.started_at)) : 'in progress';
      const amt = total > 0 ? ` · ${total} ml` : '';
      return { id: p.id, kind: 'pump', ts: p.started_at, title: `Pump · ${dur}${amt}`, ep: '/api/pumps', notes: p.notes, logged_by: p.logged_by, raw: p };
    } },
  { ep: '/api/meds', tf: 'given_at', map: (m) => {
      const dose = m.dose ? ` · ${m.dose}${m.unit ?? ''}` : '';
      return { id: m.id, kind: 'med', ts: m.given_at, title: `${m.name}${dose}`, ep: '/api/meds', notes: m.notes, logged_by: m.logged_by, raw: m };
    } },
  { ep: '/api/growths', tf: 'measured_at', map: (g) => {
      const parts = [];
      if (g.weight_kg) parts.push(`${g.weight_kg} kg`);
      if (g.height_cm) parts.push(`length ${g.height_cm} cm`);
      if (g.head_cm) parts.push(`head ${g.head_cm} cm`);
      return { id: g.id, kind: 'growth', ts: g.measured_at, title: parts.join(' · ') || 'Growth', ep: '/api/growths', notes: g.notes, logged_by: g.logged_by, raw: g };
    } },
  { ep: '/api/baths', tf: 'bathed_at', map: (b) => ({
      id: b.id, kind: 'bath', ts: b.bathed_at, title: 'Bath', ep: '/api/baths', notes: b.notes, logged_by: b.logged_by, raw: b,
    }) },
  { ep: '/api/tummy-times', tf: 'started_at', map: (t) => {
      const dur = t.ended_at ? fmtDuration(new Date(t.ended_at) - new Date(t.started_at)) : 'in progress';
      return { id: t.id, kind: 'tummy', ts: t.started_at, title: `Tummy time · ${dur}`, ep: '/api/tummy-times', notes: t.notes, logged_by: t.logged_by, raw: t };
    } },
  { ep: '/api/milestones', tf: 'reached_at', map: (m) => ({
      id: m.id, kind: 'milestone', ts: m.reached_at, title: m.title, ep: '/api/milestones', notes: m.notes, logged_by: m.logged_by, raw: m,
    }) },
  { ep: '/api/spitups', tf: 'happened_at', map: (s) => ({
      id: s.id, kind: 'spitup', ts: s.happened_at,
      title: `${KIND_LABELS[s.kind] ?? s.kind} spit-up`, ep: '/api/spitups', notes: s.notes, logged_by: s.logged_by, raw: s,
    }) },
  { ep: '/api/temps', tf: 'taken_at', map: (t) => ({
      id: t.id, kind: 'temp', ts: t.taken_at,
      title: fmtTemp(t.temp_c), ep: '/api/temps', notes: t.notes, logged_by: t.logged_by, raw: t,
    }) },
];

const fetchUnified = async (limit = 50) => {
  const results = await Promise.all(
    SOURCES.map((s) => api.list(`${s.ep}?limit=${limit}`).then((items) => items.map(s.map)))
  );
  return results.flat().sort((a, b) => new Date(b.ts) - new Date(a.ts));
};

/* ---------- shared row component ---------- */

const renderEventRow = (ev, opts = {}) => {
  const by = parentLabel(ev.logged_by);
  const sub = `${fmtTime(ev.ts)} · ${relTime(ev.ts)}${ev.notes ? ' · ' + escapeHtml(ev.notes) : ''}${by ? ' · by ' + escapeHtml(by) : ''}`;
  const canEdit = opts.showEdit !== false && editForms[ev.kind] && ev.raw;
  const node = el(`
    <div class="row" data-ep="${ev.ep}" data-id="${ev.id}">
      ${chipHtml(ev.kind)}
      <div class="row__main">
        <div class="row__title">${escapeHtml(ev.title)}</div>
        <div class="row__sub">${sub}</div>
      </div>
      ${canEdit ? '<button class="row__edit" aria-label="Edit">✎</button>' : ''}
      ${opts.showDelete === false ? '' : '<button class="row__del" aria-label="Delete">×</button>'}
    </div>
  `);
  const edit = node.querySelector('.row__edit');
  if (edit) edit.addEventListener('click', () => showEditForm(ev));
  const del = node.querySelector('.row__del');
  if (del) del.addEventListener('click', async () => {
    if (!confirm(`Delete this ${ACT[ev.kind].label.toLowerCase()}?`)) return;
    await api.del(`${ev.ep}/${ev.id}`);
    opts.onChange?.();
  });
  return node;
};

/* ---------- screen state ---------- */

let viewCleanup = null;
let currentTab = 'today';
let onScreen = 'today';

const setActiveTab = (name) => {
  tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
};

const setHeader = (title, sub = '', back = false) => {
  topTitle.textContent = title;
  topSub.textContent = sub;
  topBack.hidden = !back;
};

const todayStr = () => new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

const showTab = (name) => {
  if (viewCleanup) { try { viewCleanup(); } catch {} viewCleanup = null; }
  currentTab = name;
  onScreen = name;
  setActiveTab(name);
  closeSheet();
  if (name === 'today') setHeader('Possums', todayStr());
  else if (name === 'sleep') setHeader('Sleep', '');
  else if (name === 'history') setHeader('History', '');
  else if (name === 'more') setHeader('More', '');
  views[name]();
};

const showForm = (kind) => {
  if (viewCleanup) { try { viewCleanup(); } catch {} viewCleanup = null; }
  onScreen = `form:${kind}`;
  setActiveTab(null);
  closeSheet();
  setHeader(`Log ${ACT[kind].label.toLowerCase()}`, '', true);
  forms[kind]();
};

const showEditForm = (ev) => {
  const fn = editForms[ev.kind];
  if (!fn || !ev.raw) return;
  if (viewCleanup) { try { viewCleanup(); } catch {} viewCleanup = null; }
  onScreen = `edit:${ev.kind}`;
  setActiveTab(null);
  closeSheet();
  setHeader(`Edit ${ACT[ev.kind].label.toLowerCase()}`, '', true);
  fn(ev.raw);
};

topBack.addEventListener('click', () => showTab(currentTab));

/* ---------- bottom sheet ---------- */

const openSheet = () => {
  sheet.classList.add('is-open');
  sheet.setAttribute('aria-hidden', 'false');
};
const closeSheet = () => {
  sheet.classList.remove('is-open');
  sheet.setAttribute('aria-hidden', 'true');
};

sheetGrid.replaceChildren(...SHEET_ORDER.map((k) => el(sheetTileHtml(k))));
sheetGrid.addEventListener('click', (e) => {
  const tile = e.target.closest('.sheet__tile');
  if (!tile) return;
  const kind = tile.dataset.add;
  if (kind === 'sleep') { showTab('sleep'); return; }
  showForm(kind);
});
sheet.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'close-sheet') closeSheet();
});
addBtn.addEventListener('click', () => {
  if (sheet.classList.contains('is-open')) closeSheet(); else openSheet();
});

/* ---------- Today view ---------- */

const views = {};

views.today = async () => {
  const wrap = el(`<div class="stack">
    <div id="today-live"></div>
    <div id="today-qs"></div>
    <div class="stats" id="today-stats"></div>
    <section class="stack">
      <h2 class="section__title">Today</h2>
      <div class="list" id="today-feed"></div>
    </section>
  </div>`);
  app.replaceChildren(wrap);

  let tickerId = null;
  const stopTicker = () => { if (tickerId) { clearInterval(tickerId); tickerId = null; } };
  viewCleanup = stopTicker;

  const tick = (slot) => {
    slot.querySelectorAll('[data-started-ms]').forEach((e) => {
      e.textContent = fmtTimer(Date.now() - Number(e.dataset.startedMs));
    });
  };

  const renderLive = (nap, bottleTimer) => {
    const slot = wrap.querySelector('#today-live');
    stopTicker();
    const cards = [];

    if (nap) {
      const startedMs = new Date(nap.started_at).getTime();
      const node = el(`
        <div class="live live--sleep">
          <div class="live__chip">${ICONS.sleep}</div>
          <div class="live__label">Sleep in progress</div>
          <div class="live__time" data-started-ms="${startedMs}">${fmtTimer(Date.now() - startedMs)}</div>
          <div class="live__sub">started ${fmtTime(nap.started_at)}</div>
          <button class="btn" id="today-end-sleep">End sleep</button>
        </div>
      `);
      node.querySelector('#today-end-sleep').addEventListener('click', async (ev) => {
        ev.target.disabled = true;
        await api.post(`/api/naps/${nap.id}/end`, {});
        refresh();
      });
      cards.push(node);
    }

    if (bottleTimer) {
      const startedMs = new Date(bottleTimer.started_at).getTime();
      const offered = bottleTimer.started_ml != null ? `${bottleTimer.started_ml} ml offered · ` : '';
      const node = el(`
        <div class="live live--feed">
          <div class="live__chip">${ICONS.bottle}</div>
          <div class="live__label">Bottle in progress</div>
          <div class="live__time" data-started-ms="${startedMs}">${fmtTimer(Date.now() - startedMs)}</div>
          <div class="live__sub">${offered}started ${fmtTime(bottleTimer.started_at)}</div>
          <button class="btn" id="today-manage-bottle">End bottle</button>
        </div>
      `);
      node.querySelector('#today-manage-bottle').addEventListener('click', () => showForm('bottle'));
      cards.push(node);
    }

    slot.replaceChildren(...cards);
    if (cards.length > 0) {
      tickerId = setInterval(() => tick(slot), 1000);
    }
  };

  const statTile = (label, valueHtml, subHtml, kind, tab) => {
    const meta = ACT[kind];
    const node = el(`
      <button class="stat stat--${meta.color}">
        <div class="stat__chip t-${meta.color}">${ICONS[meta.icon]}</div>
        <div class="stat__label">${label}</div>
        <div class="stat__value">${valueHtml}</div>
        <div class="stat__sub">${subHtml}</div>
      </button>
    `);
    if (tab) node.addEventListener('click', () => showTab(tab));
    return node;
  };

  const buildQuickStatus = ({ feeds, nappies, growths, baby }) => {
    const allFeeds = [...feeds].sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    const lastFeedTs = allFeeds.length ? allFeeds[0].started_at : null;

    const allNappies = [...nappies].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
    const lastNappyTs = allNappies.length ? allNappies[0].changed_at : null;

    const todayMs = todayStart().getTime();
    const feedTimesToday = feeds
      .filter((f) => new Date(f.started_at).getTime() >= todayMs)
      .map((f) => new Date(f.started_at).getTime())
      .sort((a, b) => a - b);
    const feedsToday = feedTimesToday.length;
    let avgSub = '';
    if (feedTimesToday.length >= 2) {
      const avgMs = (feedTimesToday[feedTimesToday.length - 1] - feedTimesToday[0]) / (feedTimesToday.length - 1);
      avgSub = `every ${fmtDuration(avgMs)}`;
    }

    const items = [
      { label: 'Last feed',   value: lastFeedTs  ? relTime(lastFeedTs)  : '—' },
      { label: 'Last nappy',  value: lastNappyTs ? relTime(lastNappyTs) : '—' },
      { label: 'Feeds today', value: String(feedsToday), sub: avgSub },
    ];

    if (baby && baby.dob && baby.gender) {
      const latestW = [...(growths || [])].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at)).find((g) => g.weight_kg != null);
      if (latestW) {
        const pct = calcWeightPercentile(latestW.weight_kg, latestW.measured_at, baby.dob, baby.gender);
        if (pct !== null) items.push({ label: 'Wt %ile', value: ordinal(pct) });
      }
    }
    const bar = el(`<div class="qs-bar"></div>`);
    items.forEach((item, i) => {
      if (i > 0) bar.appendChild(el(`<div class="qs-bar__sep"></div>`));
      const node = el(`<div class="qs-bar__item">
        <span class="qs-bar__label">${item.label}</span>
        <span class="qs-bar__value">${escapeHtml(item.value)}</span>
        ${item.sub ? `<span class="qs-bar__sub">${escapeHtml(item.sub)}</span>` : ''}
      </div>`);
      bar.appendChild(node);
    });
    return bar;
  };

  const buildTrendTiles = ({ feeds, nappies, naps, growths }) => {
    const now = Date.now();
    const todayMs = todayStart().getTime();
    const elapsed = now - todayMs;
    const ydayStart = todayMs - 86400000;
    const ydayEnd = ydayStart + elapsed;

    const sumMl = (list, start, end, field) => list.reduce((acc, f) => {
      const t = new Date(f[field]).getTime();
      return (t >= start && t <= end) ? acc + (f.amount_ml || 0) : acc;
    }, 0);

    const countIn = (list, start, end, field) => list.reduce((acc, n) => {
      const t = new Date(n[field]).getTime();
      return (t >= start && t <= end) ? acc + 1 : acc;
    }, 0);

    const bottleFeeds = feeds.filter((f) => f.kind === 'bottle' || f.kind === undefined);
    const drankToday = sumMl(bottleFeeds, todayMs, now, 'started_at');
    const drankYday  = sumMl(bottleFeeds, ydayStart, ydayEnd, 'started_at');

    const nappiesToday = countIn(nappies, todayMs, now, 'changed_at');
    const nappiesYday  = countIn(nappies, ydayStart, ydayEnd, 'changed_at');

    const trend = (today, yday, fmt) => {
      if (yday === 0 && today === 0) return 'no data yesterday';
      if (yday === 0) return 'first time today';
      const delta = today - yday;
      if (delta === 0) return `<span class="stat__trend stat__trend--flat">→ same as yesterday</span>`;
      const arrow = delta > 0 ? '↑' : '↓';
      const cls = delta > 0 ? 'up' : 'down';
      return `<span class="stat__trend stat__trend--${cls}">${arrow} ${fmt(Math.abs(delta))} vs yesterday</span>`;
    };

    const drankValue = drankToday > 0 ? `${drankToday} ml` : '—';
    const nappiesValue = `${nappiesToday}`;

    const tiles = [
      statTile('Drank today', drankValue, trend(drankToday, drankYday, (n) => `${n} ml`), 'bottle', 'history'),
      statTile('Nappies today', nappiesValue, trend(nappiesToday, nappiesYday, (n) => String(n)), 'nappy', 'history'),
    ];

    const growthsByDate = [...growths].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));
    const latestWeight = growthsByDate.find((g) => g.weight_kg != null);
    const prevWeight = latestWeight
      ? growthsByDate.find((g) => g.weight_kg != null && g.id !== latestWeight.id && new Date(g.measured_at) < new Date(latestWeight.measured_at))
      : null;
    let growthValue = '—';
    let growthSub = 'no weight logged';
    if (latestWeight) {
      growthValue = `${latestWeight.weight_kg} kg`;
      if (prevWeight) {
        const delta = latestWeight.weight_kg - prevWeight.weight_kg;
        const sign = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
        const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
        const ago = relTime(prevWeight.measured_at);
        growthSub = `<span class="stat__trend stat__trend--${cls}">${sign} ${Math.abs(delta).toFixed(3)} kg</span> since ${ago}`;
      } else {
        growthSub = `logged ${relTime(latestWeight.measured_at)}`;
      }
    }
    tiles.push(statTile('Weight', growthValue, growthSub, 'growth', 'history'));

    // Feeds count today + avg gap
    const feedsCountToday = countIn(feeds, todayMs, now, 'started_at');
    const feedsCountYday  = countIn(feeds, ydayStart, ydayEnd, 'started_at');
    const feedTimesToday = feeds
      .filter((f) => new Date(f.started_at).getTime() >= todayMs)
      .map((f) => new Date(f.started_at).getTime())
      .sort((a, b) => a - b);
    let feedGapSub = trend(feedsCountToday, feedsCountYday, (n) => String(n));
    if (feedTimesToday.length >= 2) {
      const avgMs = (feedTimesToday[feedTimesToday.length - 1] - feedTimesToday[0]) / (feedTimesToday.length - 1);
      feedGapSub = `every ${fmtDuration(avgMs)} avg`;
    }
    tiles.push(statTile('Feeds today', String(feedsCountToday), feedGapSub, 'bottle', 'history'));

    return tiles;
  };

  const refresh = async () => {
    const [feeds, nappies, naps, growths, currentNap, bottleTimer, allEvents, baby] = await Promise.all([
      api.list('/api/feeds?limit=200'),
      api.list('/api/nappies?limit=200'),
      api.list('/api/naps?limit=100'),
      api.list('/api/growths?limit=20'),
      api.list('/api/naps/current'),
      api.list('/api/bottle-timer'),
      fetchUnified(80),
      fetch('/api/baby').then(handleAuth).then((r) => r.json()).catch(() => ({ dob: '', gender: '' })),
    ]);

    renderLive(currentNap, bottleTimer);

    wrap.querySelector('#today-qs').replaceChildren(buildQuickStatus({ feeds, nappies, growths, baby }));

    const stats = wrap.querySelector('#today-stats');
    stats.replaceChildren(...buildTrendTiles({ feeds, nappies, naps, growths }));

    const start = todayStart().getTime();
    const today = allEvents.filter((e) => new Date(e.ts).getTime() >= start);
    const feed = wrap.querySelector('#today-feed');
    if (today.length === 0) {
      feed.replaceChildren(el(`<div class="placeholder">Nothing logged today yet.</div>`));
    } else {
      feed.replaceChildren(...today.map((ev) => renderEventRow(ev, { onChange: refresh })));
    }
  };

  refresh();
};

/* ---------- Sleep view (live timer + recent + log past) ---------- */

views.sleep = async () => {
  const wrap = el(`<div class="stack">
    <div id="sleep-live"></div>
    <details class="advanced">
      <summary>Log past sleep</summary>
      <form class="stack" id="sleep-form">
        <label>Started
          <input type="datetime-local" name="started_at" required value="${nowLocal()}">
        </label>
        <label>Ended
          <input type="datetime-local" name="ended_at" value="${nowLocal()}">
        </label>
        <label>Notes
          <input type="text" name="notes" maxlength="500" placeholder="optional">
        </label>
        <button type="submit" class="btn btn--ghost">Save past sleep</button>
        <p class="form-msg" hidden></p>
      </form>
    </details>
    <section class="stack">
      <h2 class="section__title">Recent sleeps</h2>
      <div class="list" id="sleep-list"></div>
    </section>
  </div>`);
  app.replaceChildren(wrap);

  const liveSlot = wrap.querySelector('#sleep-live');
  const msg = wrap.querySelector('.form-msg');
  const flash = (text, err = false) => {
    msg.textContent = text;
    msg.classList.toggle('form-msg--err', err);
    msg.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => (msg.hidden = true), 1800);
  };

  let tickerId = null;
  const stopTicker = () => { if (tickerId) { clearInterval(tickerId); tickerId = null; } };
  viewCleanup = stopTicker;

  const renderLive = (current) => {
    stopTicker();
    if (current) {
      const startedMs = new Date(current.started_at).getTime();
      const node = el(`
        <div class="live live--sleep">
          <div class="live__chip">${ICONS.sleep}</div>
          <div class="live__label">Sleep in progress</div>
          <div class="live__time" id="sleep-elapsed">${fmtTimer(Date.now() - startedMs)}</div>
          <div class="live__sub">started ${fmtTime(current.started_at)}</div>
          <button class="btn" id="end-sleep">End sleep</button>
        </div>
      `);
      liveSlot.replaceChildren(node);
      const elapsed = node.querySelector('#sleep-elapsed');
      tickerId = setInterval(() => { elapsed.textContent = fmtTimer(Date.now() - startedMs); }, 1000);
      node.querySelector('#end-sleep').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try { await api.post(`/api/naps/${current.id}/end`, {}); flash('Sleep ended.'); refresh(); }
        catch (err) { flash(`Failed: ${err.message}`, true); e.target.disabled = false; }
      });
    } else {
      const node = el(`
        <div class="live live--sleep">
          <div class="live__chip">${ICONS.sleep}</div>
          <div class="live__label">No sleep in progress</div>
          <div class="live__time" style="font-size:1.6rem">Tap to start</div>
          <div class="live__sub">timer runs until you end it</div>
          <button class="btn" id="start-sleep">Start sleep</button>
        </div>
      `);
      liveSlot.replaceChildren(node);
      node.querySelector('#start-sleep').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try { await api.post('/api/naps', { started_at: nowLocalISO() }); flash('Sleep started.'); refresh(); }
        catch (err) { flash(`Failed: ${err.message}`, true); e.target.disabled = false; }
      });
    }
  };

  const refresh = async () => {
    const [current, items] = await Promise.all([
      api.list('/api/naps/current'),
      api.list('/api/naps?limit=20'),
    ]);
    renderLive(current);
    const list = wrap.querySelector('#sleep-list');
    if (items.length === 0) {
      list.replaceChildren(el(`<div class="placeholder">No sleeps yet.</div>`));
    } else {
      list.replaceChildren(...items.map((n) => renderEventRow(SOURCES.find(s => s.ep === '/api/naps').map(n), { onChange: refresh })));
    }
  };

  wrap.querySelector('#sleep-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    const fd = new FormData(e.target);
    const ended_raw = fd.get('ended_at');
    const body = {
      started_at: `${fd.get('started_at')}:00`,
      ended_at: ended_raw ? `${ended_raw}:00` : null,
      notes: (fd.get('notes') || '').trim() || null,
    };
    try {
      await api.post('/api/naps', body);
      e.target.reset();
      e.target.querySelector('[name=started_at]').value = nowLocal();
      e.target.querySelector('[name=ended_at]').value = nowLocal();
      flash('Saved.');
      refresh();
    } catch (err) {
      if (btn) btn.disabled = false;
      flash(`Failed: ${err.message}`, true);
    }
  });

  refresh();
};

/* ---------- History view ---------- */

/* ---------- charts (history) ---------- */

const CHART_DAYS = 14;

const bucketByDay = (items, tsField, valFn, days = CHART_DAYS) => {
  const todayMs = todayStart().getTime();
  const firstDay = todayMs - (days - 1) * 86400000;
  const buckets = Array.from({ length: days }, (_, i) => {
    const ts = firstDay + i * 86400000;
    const d = new Date(ts);
    return {
      ts,
      label: String(d.getDate()),
      sub: d.toLocaleDateString([], { weekday: 'narrow' }),
      val: 0,
    };
  });
  items.forEach((it) => {
    const t = new Date(it[tsField]).getTime();
    const idx = Math.floor((t - firstDay) / 86400000);
    if (idx >= 0 && idx < days) buckets[idx].val += valFn(it);
  });
  return buckets;
};

const bucketNapDuration = (naps, days = CHART_DAYS) => {
  const todayMs = todayStart().getTime();
  const firstDay = todayMs - (days - 1) * 86400000;
  const now = Date.now();
  const buckets = Array.from({ length: days }, (_, i) => {
    const ts = firstDay + i * 86400000;
    const d = new Date(ts);
    return {
      ts,
      label: String(d.getDate()),
      sub: d.toLocaleDateString([], { weekday: 'narrow' }),
      val: 0,
    };
  });
  naps.forEach((n) => {
    const s = new Date(n.started_at).getTime();
    const e = n.ended_at ? new Date(n.ended_at).getTime() : now;
    for (let i = 0; i < days; i++) {
      const dayStart = firstDay + i * 86400000;
      const dayEnd = dayStart + 86400000;
      const overlap = Math.max(0, Math.min(e, dayEnd) - Math.max(s, dayStart));
      if (overlap > 0) buckets[i].val += overlap / 60000;
    }
  });
  return buckets;
};

const chartCard = (title, buckets, opts) => {
  const fmt = opts.fmt || ((v) => String(v));
  const color = opts.color || 'var(--accent)';
  const max = Math.max(1, ...buckets.map((b) => b.val));
  const todayIdx = buckets.length - 1;
  const W = 320, H = 140, padT = 12, padB = 30, padX = 8;
  const innerW = W - padX * 2;
  const innerH = H - padT - padB;
  const slot = innerW / buckets.length;
  const barW = Math.max(4, slot * 0.62);

  const total = buckets.reduce((s, b) => s + b.val, 0);
  const avg = total / buckets.length;
  const today = buckets[todayIdx].val;

  const bars = buckets.map((b, i) => {
    const h = b.val > 0 ? Math.max(2, (b.val / max) * innerH) : 0;
    const x = padX + slot * i + (slot - barW) / 2;
    const y = padT + innerH - h;
    const isToday = i === todayIdx;
    const fill = isToday ? color : 'var(--surface-2)';
    const labelY = padT + innerH + 14;
    const numY = padT + innerH + 24;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${fill}"/>
      <text x="${(x + barW / 2).toFixed(1)}" y="${labelY}" text-anchor="middle" class="chart__tick">${b.sub}</text>
      <text x="${(x + barW / 2).toFixed(1)}" y="${numY}" text-anchor="middle" class="chart__tick chart__tick--num">${b.label}</text>
    `;
  }).join('');

  const card = el(`<div class="card stack chart-card">
    <div class="chart__head">
      <div class="chart__title">${title}</div>
      <div class="chart__meta">avg ${fmt(Math.round(avg))} · today ${fmt(Math.round(today))}</div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${title}">
      ${bars}
    </svg>
  </div>`);
  return card;
};

const growthChartCard = (growths) => {
  const series = [
    { key: 'weight_kg', label: 'Weight', unit: 'kg', color: 'var(--growth)' },
    { key: 'height_cm', label: 'Length', unit: 'cm', color: 'var(--feed)' },
    { key: 'head_cm',   label: 'Head',   unit: 'cm', color: 'var(--sleep)' },
  ];
  const container = el(`<div class="stack"></div>`);
  let drew = false;
  series.forEach((s) => {
    const points = growths
      .filter((g) => g[s.key] != null)
      .map((g) => ({ ts: new Date(g.measured_at).getTime(), val: g[s.key] }))
      .sort((a, b) => a.ts - b.ts);
    if (points.length === 0) return;
    drew = true;
    container.appendChild(lineChartCard(`${s.label} (${s.unit})`, points, { color: s.color, unit: s.unit }));
  });
  if (!drew) container.appendChild(el(`<div class="placeholder">No growth measurements yet.</div>`));
  return container;
};

const lineChartCard = (title, points, opts) => {
  const color = opts.color || 'var(--accent)';
  const unit = opts.unit || '';
  const W = 320, H = 140, padT = 18, padB = 22, padL = 30, padR = 10;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xs = points.map((p) => p.ts);
  const ys = points.map((p) => p.val);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const xspan = Math.max(1, xmax - xmin);
  const yspan = Math.max(0.001, ymax - ymin);

  const xAt = (t) => padL + (xspan === 0 ? innerW / 2 : ((t - xmin) / xspan) * innerW);
  const yAt = (v) => padT + innerH - ((v - ymin) / yspan) * innerH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.ts).toFixed(1)},${yAt(p.val).toFixed(1)}`).join(' ');
  const dots = points.map((p) =>
    `<circle cx="${xAt(p.ts).toFixed(1)}" cy="${yAt(p.val).toFixed(1)}" r="3" fill="${color}"/>`
  ).join('');

  const fmtDate = (t) => new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' });
  const fmtVal = (v) => (Number.isInteger(v) ? v : v.toFixed(v < 10 ? 2 : 1));

  const yMidVal = (ymin + ymax) / 2;
  const yLabels = `
    <text x="${padL - 6}" y="${(padT + 3).toFixed(1)}" text-anchor="end" class="chart__tick">${fmtVal(ymax)}</text>
    <text x="${padL - 6}" y="${(yAt(yMidVal) + 3).toFixed(1)}" text-anchor="end" class="chart__tick">${fmtVal(yMidVal)}</text>
    <text x="${padL - 6}" y="${(padT + innerH + 3).toFixed(1)}" text-anchor="end" class="chart__tick">${fmtVal(ymin)}</text>
  `;
  const xLabels = `
    <text x="${padL}" y="${H - 6}" class="chart__tick">${fmtDate(xmin)}</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" class="chart__tick">${fmtDate(xmax)}</text>
  `;

  const last = points[points.length - 1];
  const first = points[0];
  const delta = last.val - first.val;
  const meta = points.length > 1
    ? `${fmtVal(last.val)} ${unit} · ${delta >= 0 ? '+' : ''}${fmtVal(delta)} over ${points.length} entries`
    : `${fmtVal(last.val)} ${unit}`;

  return el(`<div class="card stack chart-card">
    <div class="chart__head">
      <div class="chart__title">${title}</div>
      <div class="chart__meta">${meta}</div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${title}">
      ${yLabels}
      ${xLabels}
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>
  </div>`);
};

views.history = async () => {
  const FILTERS = [
    { k: 'all', label: 'All' },
    { k: 'feed', label: 'Feed' },
    { k: 'sleep', label: 'Sleep' },
    { k: 'nappy', label: 'Nappy' },
    { k: 'pump', label: 'Pump' },
    { k: 'med', label: 'Medicine' },
    { k: 'growth', label: 'Growth' },
    { k: 'bath', label: 'Bath' },
    { k: 'tummy', label: 'Tummy' },
    { k: 'milestone', label: 'Milestone' },
    { k: 'spitup', label: 'Spit-up' },
    { k: 'temp', label: 'Temp' },
  ];
  let active = 'all';

  const wrap = el(`<div class="stack">
    <div class="chips" id="hist-chips"></div>
    <div id="hist-chart"></div>
    <div class="list" id="hist-list"></div>
  </div>`);
  app.replaceChildren(wrap);

  const chips = wrap.querySelector('#hist-chips');
  chips.replaceChildren(...FILTERS.map((f) =>
    el(`<button class="chip ${f.k === active ? 'is-on' : ''}" data-k="${f.k}">${f.label}</button>`)
  ));

  const matches = (ev) => {
    if (active === 'all') return true;
    if (active === 'feed') return ev.kind === 'bottle' || ev.kind === 'breast' || ev.kind === 'solid';
    return ev.kind === active;
  };

  const renderChart = async () => {
    const slot = wrap.querySelector('#hist-chart');
    slot.replaceChildren();
    if (active === 'all') {
      const DAYS = 7;
      const now = Date.now();
      const weekStart = todayStart().getTime() - (DAYS - 1) * 86400000;
      const inWeek = (ts) => new Date(ts).getTime() >= weekStart && new Date(ts).getTime() <= now;
      const [feeds, nappies, naps, tummy] = await Promise.all([
        api.list('/api/feeds?limit=500'),
        api.list('/api/nappies?limit=500'),
        api.list('/api/naps?limit=300'),
        api.list('/api/tummy-times?limit=300'),
      ]);
      const feedsW  = feeds.filter((f) => inWeek(f.started_at));
      const nappiesW = nappies.filter((n) => inWeek(n.changed_at));
      const napsW   = naps.filter((n) => inWeek(n.started_at));
      const tummyW  = tummy.filter((t) => inWeek(t.started_at));

      const sleepMs = napsW.reduce((acc, n) => {
        if (!n.ended_at) return acc;
        return acc + (new Date(n.ended_at) - new Date(n.started_at));
      }, 0);
      const bottleMl = feedsW.filter((f) => f.kind === 'bottle' || !f.kind)
        .reduce((acc, f) => acc + (f.amount_ml || 0), 0);
      const tummyMs = tummyW.reduce((acc, t) => {
        if (!t.ended_at) return acc;
        return acc + (new Date(t.ended_at) - new Date(t.started_at));
      }, 0);

      const sumItem = (label, value, sub) => `
        <div class="summary-item">
          <span class="summary-item__label">${label}</span>
          <span class="summary-item__value">${value}</span>
          ${sub ? `<span class="summary-item__sub">${sub}</span>` : ''}
        </div>`;

      const card = el(`<div class="card stack">
        <div class="chart__head">
          <span class="chart__title">Last 7 days</span>
        </div>
        <div class="summary-grid">
          ${sumItem('Feeds', String(feedsW.length), `avg ${(feedsW.length / DAYS).toFixed(1)}/day`)}
          ${sumItem('Nappies', String(nappiesW.length), `avg ${(nappiesW.length / DAYS).toFixed(1)}/day`)}
          ${sumItem('Sleep', sleepMs > 0 ? fmtDuration(sleepMs / DAYS) : '—', sleepMs > 0 ? 'avg per day' : '')}
          ${sumItem('Bottle drank', bottleMl > 0 ? `${bottleMl} ml` : '—', bottleMl > 0 ? `avg ${Math.round(bottleMl / DAYS)} ml/day` : '')}
          ${sumItem('Tummy time', tummyMs > 0 ? fmtDuration(tummyMs / DAYS) : '—', tummyMs > 0 ? 'avg per day' : '')}
        </div>
      </div>`);
      slot.appendChild(card);
    } else if (active === 'feed') {
      const feeds = await api.list('/api/feeds?limit=500');
      const buckets = bucketByDay(feeds, 'started_at', (f) => f.amount_ml || 0);
      slot.appendChild(chartCard('Drank per day', buckets, { color: 'var(--feed)', fmt: (v) => `${v} ml` }));
    } else if (active === 'sleep') {
      const naps = await api.list('/api/naps?limit=300');
      const buckets = bucketNapDuration(naps);
      slot.appendChild(chartCard('Slept per day', buckets, { color: 'var(--sleep)', fmt: (v) => fmtDuration(v * 60000) }));
    } else if (active === 'nappy') {
      const nappies = await api.list('/api/nappies?limit=500');
      const buckets = bucketByDay(nappies, 'changed_at', () => 1);
      slot.appendChild(chartCard('Nappies per day', buckets, { color: 'var(--nappy)', fmt: (v) => String(v) }));
    } else if (active === 'pump') {
      const pumps = await api.list('/api/pumps?limit=300');
      const buckets = bucketByDay(pumps, 'started_at', (p) => (p.ml_left || 0) + (p.ml_right || 0));
      slot.appendChild(chartCard('Pumped per day', buckets, { color: 'var(--pump)', fmt: (v) => `${v} ml` }));
    } else if (active === 'spitup') {
      const spitups = await api.list('/api/spitups?limit=300');
      const buckets = bucketByDay(spitups, 'happened_at', () => 1);
      slot.appendChild(chartCard('Spit-ups per day', buckets, { color: 'var(--spitup)', fmt: (v) => String(v) }));
    } else if (active === 'growth') {
      const growths = await api.list('/api/growths?limit=200');
      slot.appendChild(growthChartCard(growths));
    } else if (active === 'temp') {
      const temps = await api.list('/api/temps?limit=200');
      const unit = getTempUnit();
      const points = [...temps]
        .map((t) => ({ ts: new Date(t.taken_at).getTime(), val: unit === 'F' ? cToF(t.temp_c) : t.temp_c }))
        .sort((a, b) => a.ts - b.ts);
      if (points.length === 0) {
        slot.appendChild(el(`<div class="placeholder">No temperatures logged yet.</div>`));
      } else {
        slot.appendChild(lineChartCard(`Temperature (°${unit})`, points, { color: 'var(--temp)', unit: `°${unit}` }));
      }
    }
  };

  const refresh = async () => {
    const events = await fetchUnified(100);
    const list = wrap.querySelector('#hist-list');
    const filtered = events.filter(matches);
    if (filtered.length === 0) {
      list.replaceChildren(el(`<div class="placeholder">Nothing here yet.</div>`));
    } else {
      list.replaceChildren(...filtered.map((ev) => renderEventRow(ev, { onChange: refresh })));
    }
    renderChart();
  };

  chips.addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    active = c.dataset.k;
    chips.querySelectorAll('.chip').forEach((x) => x.classList.toggle('is-on', x.dataset.k === active));
    refresh();
  });

  refresh();
};

/* ---------- More view ---------- */

views.more = async () => {
  await loadMe();
  const [health, notify, baby] = await Promise.all([
    fetch('/api/health').then((r) => r.json()).catch(() => ({})),
    fetch('/api/notify').then((r) => r.json()).catch(() => ({ app_token: '', parent1: '', parent2: '' })),
    fetch('/api/baby').then((r) => r.json()).catch(() => ({ dob: '', gender: '' })),
  ]);
  const signedAs = me.who ? me.parents[me.who] : 'not signed in';
  const wrap = el(`<div class="stack">
    <div class="card stack">
      <h2 class="card__title">About</h2>
      <div class="row__sub">Possums — self-hosted baby tracker.</div>
      <div class="row__sub">Database: <code>${escapeHtml(health.db ?? 'unknown')}</code></div>
    </div>
    <div class="card stack">
      <h2 class="card__title">Session</h2>
      <div class="row__sub">Signed in as <strong>${escapeHtml(signedAs)}</strong></div>
      <a class="btn btn--ghost" href="/logout">Sign out</a>
    </div>
    <form class="card stack" id="parents-form">
      <h2 class="card__title">Parent names</h2>
      <p class="row__sub">Used to sign in and to label who logged each activity.</p>
      <label>Parent 1
        <input type="text" name="parent1" maxlength="60" required value="${escapeHtml(me.parents.parent1)}">
      </label>
      <label>Parent 2
        <input type="text" name="parent2" maxlength="60" required value="${escapeHtml(me.parents.parent2)}">
      </label>
      <button type="submit" class="btn">Save names</button>
      <p class="form-msg" hidden></p>
    </form>
    <form class="card stack" id="baby-form">
      <h2 class="card__title">Baby settings</h2>
      <p class="row__sub">Date of birth and sex are used to calculate weight percentile from WHO growth standards.</p>
      <label>Date of birth
        <input type="date" name="dob" value="${escapeHtml(baby.dob || '')}">
      </label>
      <label>Sex
        <select name="gender">
          <option value="" ${!baby.gender ? 'selected' : ''}>Not set</option>
          <option value="boy" ${baby.gender === 'boy' ? 'selected' : ''}>Boy</option>
          <option value="girl" ${baby.gender === 'girl' ? 'selected' : ''}>Girl</option>
        </select>
      </label>
      <button type="submit" class="btn">Save baby settings</button>
      <p class="form-msg" hidden></p>
    </form>
    <form class="card stack" id="notify-form">
      <h2 class="card__title">Pushover notifications</h2>
      <p class="row__sub">When one parent logs an activity, the other parent gets a Pushover push describing what happened. Create an application at <a href="https://pushover.net/apps/build" target="_blank" rel="noopener">pushover.net/apps/build</a> for the token, then grab each parent's user key from their Pushover dashboard. Leave a key blank to skip that parent.</p>
      <label>Application API token
        <input type="text" name="app_token" maxlength="60" placeholder="paste the application token" value="${escapeHtml(notify.app_token || '')}">
      </label>
      <label>${escapeHtml(me.parents.parent1)} — Pushover user key
        <input type="text" name="parent1" maxlength="60" placeholder="user key, blank to disable" value="${escapeHtml(notify.parent1 || '')}">
      </label>
      <label>${escapeHtml(me.parents.parent2)} — Pushover user key
        <input type="text" name="parent2" maxlength="60" placeholder="user key, blank to disable" value="${escapeHtml(notify.parent2 || '')}">
      </label>
      <div class="grid-2">
        <button type="submit" class="btn">Save notifications</button>
        <button type="button" class="btn btn--ghost" id="notify-test">Send test to me</button>
      </div>
      <p class="form-msg" hidden></p>
    </form>
    <form class="card stack" id="password-form">
      <h2 class="card__title">Change password</h2>
      <label>Current password
        <input type="password" name="current" required autocomplete="current-password">
      </label>
      <label>New password (min 6 chars)
        <input type="password" name="next" required minlength="6" autocomplete="new-password">
      </label>
      <label>Confirm new password
        <input type="password" name="next2" required minlength="6" autocomplete="new-password">
      </label>
      <button type="submit" class="btn">Update password</button>
      <p class="form-msg" hidden></p>
    </form>
    <div class="card stack" id="export-card">
      <h2 class="card__title">Export data</h2>
      <p class="row__sub">Download all logged activity as a CSV file.</p>
      <div class="chips" id="export-presets">
        <button class="chip is-on" data-days="7">Last 7 days</button>
        <button class="chip" data-days="30">Last 30 days</button>
        <button class="chip" data-days="90">Last 90 days</button>
        <button class="chip" data-days="0">All time</button>
        <button class="chip" data-days="-1">Custom</button>
      </div>
      <div id="export-custom-range" class="stack" style="display:none">
        <label>From
          <input type="date" id="export-from">
        </label>
        <label>To
          <input type="date" id="export-to">
        </label>
      </div>
      <button class="btn" id="export-btn">Download CSV</button>
      <p class="form-msg" hidden id="export-msg"></p>
    </div>
    <div class="card stack">
      <h2 class="card__title">Activity types</h2>
      <div class="quick-grid" id="more-types"></div>
    </div>
    <p class="footer-credit">Get your own website fully crafted from $79/month at <a href="https://bordertechsolutions.com.au" target="_blank" rel="noopener">Border Tech Solutions</a></p>
  </div>`);
  app.replaceChildren(wrap);

  const grid = wrap.querySelector('#more-types');
  grid.replaceChildren(...SHEET_ORDER.map((k) => el(`
    <div class="sheet__tile" style="cursor:default">
      <div class="sheet__tile-chip t-${ACT[k].color}">${ICONS[ACT[k].icon]}</div>
      <div class="sheet__tile-label">${ACT[k].label}</div>
    </div>
  `)));

  const form = wrap.querySelector('#parents-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const msg = form.querySelector('.form-msg');
    try {
      const next = await api.put('/api/parents', {
        parent1: (fd.get('parent1') || '').toString().trim(),
        parent2: (fd.get('parent2') || '').toString().trim(),
      });
      me.parents = next;
      msg.classList.remove('form-msg--err');
      msg.textContent = 'Saved.';
      msg.hidden = false;
    } catch (err) {
      msg.classList.add('form-msg--err');
      msg.textContent = String(err.message || err);
      msg.hidden = false;
    }
  });

  const babyForm = wrap.querySelector('#baby-form');
  babyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(babyForm);
    const msg = babyForm.querySelector('.form-msg');
    try {
      await api.put('/api/baby', {
        dob: (fd.get('dob') || '').toString().trim(),
        gender: (fd.get('gender') || '').toString().trim(),
      });
      msg.classList.remove('form-msg--err');
      msg.textContent = 'Saved.';
      msg.hidden = false;
    } catch (err) {
      msg.classList.add('form-msg--err');
      msg.textContent = String(err.message || err);
      msg.hidden = false;
    }
  });

  const notifyForm = wrap.querySelector('#notify-form');
  notifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(notifyForm);
    const msg = notifyForm.querySelector('.form-msg');
    try {
      await api.put('/api/notify', {
        app_token: (fd.get('app_token') || '').toString().trim(),
        parent1: (fd.get('parent1') || '').toString().trim(),
        parent2: (fd.get('parent2') || '').toString().trim(),
      });
      msg.classList.remove('form-msg--err');
      msg.textContent = 'Saved.';
      msg.hidden = false;
    } catch (err) {
      msg.classList.add('form-msg--err');
      msg.textContent = String(err.message || err);
      msg.hidden = false;
    }
  });
  notifyForm.querySelector('#notify-test').addEventListener('click', async () => {
    const msg = notifyForm.querySelector('.form-msg');
    msg.hidden = false;
    msg.classList.remove('form-msg--err');
    msg.textContent = 'Sending test…';
    try {
      await api.post('/api/notify/test', {});
      msg.textContent = 'Test sent — check your Pushover.';
    } catch (err) {
      msg.classList.add('form-msg--err');
      msg.textContent = String(err.message || err);
    }
  });

  const pwForm = wrap.querySelector('#password-form');
  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(pwForm);
    const msg = pwForm.querySelector('.form-msg');
    const current = (fd.get('current') || '').toString();
    const next = (fd.get('next') || '').toString();
    const next2 = (fd.get('next2') || '').toString();
    msg.hidden = false;
    if (next !== next2) {
      msg.classList.add('form-msg--err');
      msg.textContent = 'New passwords do not match.';
      return;
    }
    try {
      await api.post('/api/auth/password', { current, next });
      pwForm.reset();
      msg.classList.remove('form-msg--err');
      msg.textContent = 'Password updated.';
    } catch (err) {
      msg.classList.add('form-msg--err');
      msg.textContent = String(err.message || err);
    }
  });

  // Export
  let exportDays = 7;
  const exportMsg = wrap.querySelector('#export-msg');
  const customRange = wrap.querySelector('#export-custom-range');
  const presetChips = wrap.querySelector('#export-presets');

  const today = new Date();
  const isoDate = (d) => d.toISOString().slice(0, 10);
  wrap.querySelector('#export-to').value = isoDate(today);
  const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 6);
  wrap.querySelector('#export-from').value = isoDate(sevenAgo);

  presetChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    exportDays = Number(chip.dataset.days);
    presetChips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-on', c === chip));
    customRange.style.display = exportDays === -1 ? '' : 'none';
  });

  const toCSV = (rows, parents) => {
    const TYPE_LABELS = {
      feed: 'Feed', nappy: 'Nappy', sleep: 'Sleep', pump: 'Pump',
      medicine: 'Medicine', growth: 'Growth', bath: 'Bath',
      tummy_time: 'Tummy time', milestone: 'Milestone', spitup: 'Spit-up', temperature: 'Temperature',
    };
    const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const details = (r) => {
      if (r.type === 'feed') {
        const parts = [];
        if (r.kind) parts.push(r.kind);
        if (r.amount_ml != null) parts.push(`${r.amount_ml} ml`);
        if (r.started_ml != null) parts.push(`offered ${r.started_ml} ml`);
        if (r.duration_seconds) parts.push(`${Math.round(r.duration_seconds / 60)} min`);
        return parts.join(', ');
      }
      if (r.type === 'nappy') return r.kind ?? '';
      if (r.type === 'sleep') {
        if (!r.ended_at) return 'in progress';
        const ms = new Date(r.ended_at) - new Date(r.started_at);
        return fmtDuration(ms);
      }
      if (r.type === 'pump') {
        const total = (r.ml_left || 0) + (r.ml_right || 0);
        const dur = r.ended_at ? fmtDuration(new Date(r.ended_at) - new Date(r.started_at)) : '';
        return [dur, total > 0 ? `${total} ml` : ''].filter(Boolean).join(', ');
      }
      if (r.type === 'medicine') {
        const dose = r.dose != null ? ` ${r.dose}${r.unit ?? ''}` : '';
        return `${r.name ?? ''}${dose}`;
      }
      if (r.type === 'growth') {
        const parts = [];
        if (r.weight_kg) parts.push(`${r.weight_kg} kg`);
        if (r.height_cm) parts.push(`${r.height_cm} cm length`);
        if (r.head_cm) parts.push(`${r.head_cm} cm head`);
        return parts.join(', ');
      }
      if (r.type === 'tummy_time') {
        if (!r.ended_at) return 'in progress';
        return fmtDuration(new Date(r.ended_at) - new Date(r.started_at));
      }
      if (r.type === 'milestone') return r.title ?? '';
      if (r.type === 'spitup') return r.kind ?? '';
      if (r.type === 'temperature') return r.temp_c != null ? `${r.temp_c.toFixed(1)} °C` : '';
      return '';
    };
    const header = ['Date', 'Time', 'Type', 'Details', 'Notes', 'Logged by'].map(csvEsc).join(',');
    const dataRows = rows.map((r) => {
      const d = new Date(r.ts);
      const date = d.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const who = r.logged_by === 'parent1' ? parents.parent1 : r.logged_by === 'parent2' ? parents.parent2 : '';
      return [date, time, TYPE_LABELS[r.type] ?? r.type, details(r), r.notes ?? '', who].map(csvEsc).join(',');
    });
    return [header, ...dataRows].join('\r\n');
  };

  wrap.querySelector('#export-btn').addEventListener('click', async () => {
    const btn = wrap.querySelector('#export-btn');
    btn.disabled = true;
    exportMsg.hidden = true;
    try {
      let from = '';
      let to = '';
      if (exportDays === -1) {
        from = wrap.querySelector('#export-from').value;
        to = wrap.querySelector('#export-to').value;
      } else if (exportDays > 0) {
        const t = new Date(); t.setHours(23, 59, 59, 999);
        const f = new Date(); f.setDate(f.getDate() - (exportDays - 1)); f.setHours(0, 0, 0, 0);
        from = isoDate(f);
        to = isoDate(t);
      }
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const rows = await api.list(`/api/export?${params}`);
      if (rows.length === 0) {
        exportMsg.classList.remove('form-msg--err');
        exportMsg.textContent = 'No data in that range.';
        exportMsg.hidden = false;
        return;
      }
      const csv = toCSV(rows, me.parents);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const label = from && to ? `${from}_to_${to}` : 'all';
      a.href = url;
      a.download = `possums_${label}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      exportMsg.classList.remove('form-msg--err');
      exportMsg.textContent = `Exported ${rows.length} records.`;
      exportMsg.hidden = false;
    } catch (err) {
      exportMsg.classList.add('form-msg--err');
      exportMsg.textContent = String(err.message || err);
      exportMsg.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
};

/* ---------- form screens ---------- */

const formShell = (innerHtml, opts) => {
  const node = el(`<form class="card stack" id="form">
    ${innerHtml}
    <button type="submit" class="btn">${opts.saveLabel ?? 'Save'}</button>
    <p class="form-msg" hidden></p>
  </form>`);
  app.replaceChildren(node);
  node.addEventListener('submit', (e) => {
    const btn = node.querySelector('[type=submit]');
    if (btn?.disabled) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (btn) btn.disabled = true;
  });
  return node;
};

const onSaved = (form, msg) => {
  const m = form.querySelector('.form-msg');
  m.classList.remove('form-msg--err');
  m.textContent = msg;
  m.hidden = false;
  setTimeout(() => showTab('today'), 600);
};
const onErr = (form, err) => {
  const m = form.querySelector('.form-msg');
  m.classList.add('form-msg--err');
  m.textContent = `Failed: ${err.message}`;
  m.hidden = false;
  const btn = form.querySelector('[type=submit]');
  if (btn) btn.disabled = false;
};

const forms = {};

forms.bottle = () => {
  app.replaceChildren(el(`<div class="stack" id="bottle-wrap">
    <div id="bottle-live"></div>
    <details class="advanced">
      <summary>Log past bottle</summary>
      <form class="stack" id="bottle-past-form">
        <label>When
          <input type="datetime-local" name="when" required value="${nowLocal()}">
        </label>
        <div class="grid-2">
          <label>Offered (ml)
            <input type="number" name="started_ml" inputmode="numeric" min="0" max="2000" step="5" placeholder="optional">
          </label>
          <label>Drank (ml)
            <input type="number" name="amount_ml" inputmode="numeric" min="0" max="2000" step="5" placeholder="e.g. 120">
          </label>
        </div>
        <div>
          <label style="margin-bottom:6px">Did you change a nappy?</label>
          <div class="seg" id="past-bottle-nappy">
            <button type="button" class="seg__btn is-on" data-nappy="none">No</button>
            <button type="button" class="seg__btn" data-nappy="wet">Wet</button>
            <button type="button" class="seg__btn" data-nappy="dirty">Dirty</button>
            <button type="button" class="seg__btn" data-nappy="both">Both</button>
          </div>
        </div>
        <label>Notes
          <input type="text" name="notes" maxlength="500" placeholder="optional">
        </label>
        <button type="submit" class="btn btn--ghost">Save past bottle</button>
        <p class="form-msg" hidden></p>
      </form>
    </details>
  </div>`));

  const wrap = document.getElementById('bottle-wrap');
  const liveSlot = wrap.querySelector('#bottle-live');
  let tickerId = null;
  const stopTicker = () => { if (tickerId) { clearInterval(tickerId); tickerId = null; } };
  viewCleanup = stopTicker;

  const renderStart = () => {
    stopTicker();
    const node = el(`
      <div class="live live--feed">
        <div class="live__chip">${ICONS.bottle}</div>
        <div class="live__label">Start a bottle</div>
        <div class="live__time" style="font-size:1.6rem">Tap to start</div>
        <label style="width:100%;max-width:280px;margin-bottom:6px">Offered (ml)
          <input type="number" id="start-ml" inputmode="numeric" min="0" max="2000" step="5" placeholder="e.g. 150">
        </label>
        <div class="live__sub">timer runs until you end it</div>
        <button class="btn" id="start-bottle">Start bottle</button>
        <p class="form-msg" hidden></p>
      </div>
    `);
    liveSlot.replaceChildren(node);
    const msg = node.querySelector('.form-msg');
    const startInput = node.querySelector('#start-ml');
    startInput.focus();
    node.querySelector('#start-bottle').addEventListener('click', async (e) => {
      const ml = startInput.value;
      if (!ml || Number(ml) <= 0) {
        msg.classList.add('form-msg--err');
        msg.textContent = 'Enter how much you poured (ml) — needed to compute what was drunk.';
        msg.hidden = false;
        startInput.focus();
        return;
      }
      e.target.disabled = true;
      try {
        await api.post('/api/bottle-timer/start', {
          started_at: nowLocalISO(),
          started_ml: Number(ml),
        });
        refresh();
      } catch (err) {
        msg.classList.add('form-msg--err');
        msg.textContent = `Failed: ${err.message}`;
        msg.hidden = false;
        e.target.disabled = false;
      }
    });
  };

  const renderRunning = (current) => {
    stopTicker();
    const startedMs = new Date(current.started_at).getTime();
    const offered = current.started_ml;
    const offeredText = offered != null ? `${offered} ml offered · ` : '';
    const node = el(`
      <div class="live live--feed">
        <div class="live__chip">${ICONS.bottle}</div>
        <div class="live__label">Bottle in progress</div>
        <div class="live__time" id="bottle-elapsed">${fmtTimer(Date.now() - startedMs)}</div>
        <div class="live__sub">${offeredText}started ${fmtTime(current.started_at)}</div>

        <div class="seg" id="bottle-end-mode" style="width:100%;max-width:320px;margin-top:4px">
          <button type="button" class="seg__btn ${offered != null ? 'is-on' : ''}" data-mode="all"${offered == null ? ' disabled style="opacity:0.4;cursor:not-allowed"' : ''}>Drank all</button>
          <button type="button" class="seg__btn ${offered == null ? 'is-on' : ''}" data-mode="remaining">Remaining</button>
          <button type="button" class="seg__btn" data-mode="weighed">Weighed</button>
        </div>

        <div id="bottle-end-inputs" style="width:100%;max-width:280px;margin-top:8px"></div>

        <div class="live__sub" id="bottle-end-preview" style="margin-top:6px;font-weight:600;color:var(--feed-ink)"></div>

        <div class="live__sub" style="margin-top:12px;width:100%;max-width:320px;text-align:left">Did you change a nappy?</div>
        <div class="seg" id="bottle-nappy" style="width:100%;max-width:320px;margin-top:4px">
          <button type="button" class="seg__btn is-on" data-nappy="none">No</button>
          <button type="button" class="seg__btn" data-nappy="wet">Wet</button>
          <button type="button" class="seg__btn" data-nappy="dirty">Dirty</button>
          <button type="button" class="seg__btn" data-nappy="both">Both</button>
        </div>

        <button class="btn" id="end-bottle" style="margin-top:10px">End bottle</button>
        <button class="btn btn--ghost" id="cancel-bottle" style="margin-top:6px">Cancel timer</button>
        <p class="form-msg" hidden></p>
      </div>
    `);
    liveSlot.replaceChildren(node);

    const elapsed = node.querySelector('#bottle-elapsed');
    tickerId = setInterval(() => { elapsed.textContent = fmtTimer(Date.now() - startedMs); }, 1000);

    let mode = offered != null ? 'all' : 'remaining';
    const inputsDiv = node.querySelector('#bottle-end-inputs');
    const preview = node.querySelector('#bottle-end-preview');
    const msg = node.querySelector('.form-msg');

    const computeDrank = () => {
      if (mode === 'all') return offered != null ? offered : null;
      if (mode === 'remaining') {
        const v = inputsDiv.querySelector('#rem-ml')?.value;
        if (v === '' || v == null) return null;
        const rem = Number(v);
        if (!Number.isFinite(rem) || rem < 0) return null;
        if (offered == null) return null;
        return Math.max(0, offered - Math.round(rem));
      }
      if (mode === 'weighed') {
        const w = inputsDiv.querySelector('#weighed-g')?.value;
        const b = inputsDiv.querySelector('#bottle-g')?.value;
        if (w === '' || w == null) return null;
        const wg = Number(w);
        const bg = b === '' || b == null ? 0 : Number(b);
        if (!Number.isFinite(wg) || !Number.isFinite(bg)) return null;
        const rem = Math.max(0, wg - bg);
        if (offered == null) return null;
        return Math.max(0, Math.round(offered - rem));
      }
      return null;
    };

    const updatePreview = () => {
      const d = computeDrank();
      if (d == null) { preview.textContent = ''; return; }
      if (mode === 'weighed') {
        const wg = Number(inputsDiv.querySelector('#weighed-g')?.value || 0);
        const bg = Number(inputsDiv.querySelector('#bottle-g')?.value || 0);
        const rem = Math.max(0, wg - bg);
        preview.textContent = `→ ${rem.toFixed(0)} g (${rem.toFixed(0)} ml) left · drank ${d} ml`;
      } else {
        preview.textContent = `→ drank ${d} ml`;
      }
    };

    const renderInputs = () => {
      if (mode === 'all') {
        inputsDiv.replaceChildren();
        preview.textContent = offered != null ? `→ drank ${offered} ml` : '';
      } else if (mode === 'remaining') {
        inputsDiv.replaceChildren(el(`
          <label>Remaining (ml)
            <input type="number" id="rem-ml" inputmode="numeric" min="0" max="2000" step="1" placeholder="${offered != null ? `0–${offered}` : 'ml left in bottle'}">
          </label>
        `));
        inputsDiv.querySelector('#rem-ml').addEventListener('input', updatePreview);
        updatePreview();
      } else if (mode === 'weighed') {
        inputsDiv.replaceChildren(el(`
          <div class="grid-2">
            <label>Weighed (g)
              <input type="number" id="weighed-g" inputmode="decimal" min="0" max="3000" step="0.1" placeholder="bottle + milk">
            </label>
            <label>Empty bottle (g)
              <input type="number" id="bottle-g" inputmode="decimal" min="0" max="500" step="0.1" value="29">
            </label>
          </div>
        `));
        inputsDiv.querySelector('#weighed-g').addEventListener('input', updatePreview);
        inputsDiv.querySelector('#bottle-g').addEventListener('input', updatePreview);
        updatePreview();
      }
    };

    node.querySelector('#bottle-end-mode').addEventListener('click', (e) => {
      const btn = e.target.closest('.seg__btn');
      if (!btn || btn.disabled) return;
      mode = btn.dataset.mode;
      node.querySelectorAll('#bottle-end-mode .seg__btn').forEach((x) => x.classList.toggle('is-on', x === btn));
      renderInputs();
    });

    let nappyKind = 'none';
    node.querySelector('#bottle-nappy').addEventListener('click', (e) => {
      const btn = e.target.closest('.seg__btn');
      if (!btn) return;
      nappyKind = btn.dataset.nappy;
      node.querySelectorAll('#bottle-nappy .seg__btn').forEach((x) => x.classList.toggle('is-on', x === btn));
    });

    node.querySelector('#end-bottle').addEventListener('click', async (e) => {
      const drank = computeDrank();
      if (drank == null) {
        msg.classList.add('form-msg--err');
        msg.textContent = offered == null
          ? 'Offered amount unknown — enter remaining or weighed (or use "Log past bottle").'
          : (mode === 'remaining' ? 'Enter remaining ml.' : 'Enter weighed grams.');
        msg.hidden = false;
        return;
      }
      e.target.disabled = true;
      try {
        await api.post('/api/bottle-timer/end', { amount_ml: drank });
        if (nappyKind !== 'none') {
          await api.post('/api/nappies', { changed_at: nowLocalISO(), kind: nappyKind });
        }
        showTab('today');
      } catch (err) {
        msg.classList.add('form-msg--err');
        msg.textContent = `Failed: ${err.message}`;
        msg.hidden = false;
        e.target.disabled = false;
      }
    });

    node.querySelector('#cancel-bottle').addEventListener('click', async (e) => {
      if (!confirm('Cancel this bottle timer? Nothing will be saved.')) return;
      e.target.disabled = true;
      try { await api.post('/api/bottle-timer/cancel', {}); refresh(); }
      catch (err) { e.target.disabled = false; }
    });

    renderInputs();
  };

  const refresh = async () => {
    const current = await api.list('/api/bottle-timer');
    if (current) renderRunning(current);
    else renderStart();
  };

  const pastForm = wrap.querySelector('#bottle-past-form');
  let pastNappyKind = 'none';
  pastForm.querySelector('#past-bottle-nappy').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg__btn');
    if (!btn) return;
    pastNappyKind = btn.dataset.nappy;
    pastForm.querySelectorAll('#past-bottle-nappy .seg__btn').forEach((x) => x.classList.toggle('is-on', x === btn));
  });

  pastForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    const fd = new FormData(e.target);
    const msgEl = e.target.querySelector('.form-msg');
    const when = `${fd.get('when')}:00`;
    try {
      await api.post('/api/feeds', {
        started_at: when,
        kind: 'bottle',
        amount_ml: fd.get('amount_ml') ? Number(fd.get('amount_ml')) : null,
        started_ml: fd.get('started_ml') ? Number(fd.get('started_ml')) : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      if (pastNappyKind !== 'none') {
        await api.post('/api/nappies', { changed_at: when, kind: pastNappyKind });
      }
      showTab('today');
    } catch (err) {
      if (btn) btn.disabled = false;
      msgEl.classList.add('form-msg--err');
      msgEl.textContent = `Failed: ${err.message}`;
      msgEl.hidden = false;
    }
  });

  refresh();
};

forms.breast = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <div>
      <label style="margin-bottom:6px">Side</label>
      <div class="seg" id="side-seg">
        <button type="button" class="seg__btn is-on" data-side="breast_l">Left</button>
        <button type="button" class="seg__btn" data-side="breast_r">Right</button>
      </div>
    </div>
    <label>Duration (minutes)
      <input type="number" name="minutes" inputmode="numeric" min="0" max="240" step="1" placeholder="optional">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  let side = 'breast_l';
  f.querySelectorAll('.seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      side = b.dataset.side;
      f.querySelectorAll('.seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const mins = fd.get('minutes');
    try {
      await api.post('/api/feeds', {
        started_at: `${fd.get('when')}:00`,
        kind: side,
        duration_seconds: mins ? Number(mins) * 60 : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Breast feed saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.solid = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <label>Amount (g)
      <input type="number" name="amount_ml" inputmode="numeric" min="0" max="2000" step="5" placeholder="e.g. 30">
    </label>
    <label>What
      <input type="text" name="notes" maxlength="500" placeholder="e.g. avocado, oats">
    </label>
  `, {});
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.post('/api/feeds', {
        started_at: `${fd.get('when')}:00`,
        kind: 'solid',
        amount_ml: fd.get('amount_ml') ? Number(fd.get('amount_ml')) : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Solids saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.nappy = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <div>
      <label style="margin-bottom:6px">Kind</label>
      <div class="seg" id="kind-seg">
        <button type="button" class="seg__btn is-on" data-kind="wet">Wet</button>
        <button type="button" class="seg__btn" data-kind="dirty">Dirty</button>
        <button type="button" class="seg__btn" data-kind="both">Both</button>
      </div>
    </div>
    <div>
      <label style="margin-bottom:6px">Contents</label>
      <div class="seg" id="diarrhoea-seg">
        <button type="button" class="seg__btn" id="diarrhoea-btn">Diarrhoea</button>
      </div>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  let kind = 'wet';
  f.querySelectorAll('#kind-seg .seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      kind = b.dataset.kind;
      f.querySelectorAll('#kind-seg .seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  const diarrhoeaBtn = f.querySelector('#diarrhoea-btn');
  const notesInput = f.querySelector('[name="notes"]');
  diarrhoeaBtn.addEventListener('click', () => {
    const on = diarrhoeaBtn.classList.toggle('is-on');
    if (on) { notesInput.value = 'Diarrhoea'; }
    else if (notesInput.value === 'Diarrhoea') { notesInput.value = ''; }
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.post('/api/nappies', {
        changed_at: `${fd.get('when')}:00`,
        kind,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Nappy saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.pump = () => {
  app.replaceChildren(el(`<div class="stack" id="pump-wrap">
    <div id="pump-live"></div>
    <details class="advanced">
      <summary>Log past pump</summary>
      <form class="stack" id="pump-form">
        <label>Started
          <input type="datetime-local" name="started_at" required value="${nowLocal()}">
        </label>
        <label>Ended
          <input type="datetime-local" name="ended_at" value="${nowLocal()}">
        </label>
        <div class="grid-2">
          <label>Left (ml)
            <input type="number" name="ml_left" inputmode="numeric" min="0" max="2000" step="5">
          </label>
          <label>Right (ml)
            <input type="number" name="ml_right" inputmode="numeric" min="0" max="2000" step="5">
          </label>
        </div>
        <label>Notes
          <input type="text" name="notes" maxlength="500" placeholder="optional">
        </label>
        <button type="submit" class="btn btn--ghost">Save pump</button>
        <p class="form-msg" hidden></p>
      </form>
    </details>
  </div>`));

  const wrap = document.getElementById('pump-wrap');
  const liveSlot = wrap.querySelector('#pump-live');
  let tickerId = null;
  const stopTicker = () => { if (tickerId) { clearInterval(tickerId); tickerId = null; } };
  viewCleanup = stopTicker;

  const render = (current) => {
    stopTicker();
    if (current) {
      const startedMs = new Date(current.started_at).getTime();
      const node = el(`
        <div class="live live--pump">
          <div class="live__chip">${ICONS.pump}</div>
          <div class="live__label">Pump in progress</div>
          <div class="live__time" id="pump-elapsed">${fmtTimer(Date.now() - startedMs)}</div>
          <div class="live__sub">started ${fmtTime(current.started_at)}</div>
          <div class="grid-2" style="width:100%;max-width:280px;margin-bottom:10px">
            <label>L (ml)<input type="number" id="end-ml-l" inputmode="numeric" min="0" max="2000" step="5"></label>
            <label>R (ml)<input type="number" id="end-ml-r" inputmode="numeric" min="0" max="2000" step="5"></label>
          </div>
          <button class="btn" id="end-pump">End pump</button>
        </div>
      `);
      liveSlot.replaceChildren(node);
      const elapsed = node.querySelector('#pump-elapsed');
      tickerId = setInterval(() => { elapsed.textContent = fmtTimer(Date.now() - startedMs); }, 1000);
      node.querySelector('#end-pump').addEventListener('click', async (e) => {
        e.target.disabled = true;
        const ml_left = node.querySelector('#end-ml-l').value;
        const ml_right = node.querySelector('#end-ml-r').value;
        try {
          await api.post(`/api/pumps/${current.id}/end`, {
            ml_left: ml_left ? Number(ml_left) : null,
            ml_right: ml_right ? Number(ml_right) : null,
          });
          showTab('today');
        } catch (err) { e.target.disabled = false; }
      });
    } else {
      const node = el(`
        <div class="live live--pump">
          <div class="live__chip">${ICONS.pump}</div>
          <div class="live__label">Start a pump session</div>
          <div class="live__time" style="font-size:1.6rem">Tap to start</div>
          <div class="live__sub">timer runs until you end it</div>
          <button class="btn" id="start-pump">Start pump</button>
        </div>
      `);
      liveSlot.replaceChildren(node);
      node.querySelector('#start-pump').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try { await api.post('/api/pumps', { started_at: nowLocalISO() }); refresh(); }
        catch (err) { e.target.disabled = false; }
      });
    }
  };

  const refresh = async () => {
    const current = await api.list('/api/pumps/current');
    render(current);
  };

  wrap.querySelector('#pump-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    const fd = new FormData(e.target);
    const ended_raw = fd.get('ended_at');
    try {
      await api.post('/api/pumps', {
        started_at: `${fd.get('started_at')}:00`,
        ended_at: ended_raw ? `${ended_raw}:00` : null,
        ml_left: fd.get('ml_left') ? Number(fd.get('ml_left')) : null,
        ml_right: fd.get('ml_right') ? Number(fd.get('ml_right')) : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      showTab('today');
    } catch (err) {
      if (btn) btn.disabled = false;
      const m = e.target.querySelector('.form-msg');
      m.classList.add('form-msg--err');
      m.textContent = `Failed: ${err.message}`;
      m.hidden = false;
    }
  });

  refresh();
};

forms.med = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <label>Medicine
      <input type="text" name="name" required maxlength="120" placeholder="e.g. Panadol">
    </label>
    <div class="grid-2">
      <label>Dose
        <input type="number" name="dose" inputmode="decimal" min="0" max="10000" step="0.1">
      </label>
      <label>Unit
        <input type="text" name="unit" maxlength="20" placeholder="ml, mg">
      </label>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.post('/api/meds', {
        given_at: `${fd.get('when')}:00`,
        name: fd.get('name').trim(),
        dose: fd.get('dose') ? Number(fd.get('dose')) : null,
        unit: (fd.get('unit') || '').trim() || null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Medicine saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.growth = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <p class="form-hint">Fill any combination — leave the rest blank.</p>
    <div class="grid-2">
      <label>Weight (kg)
        <input type="number" name="weight_kg" inputmode="decimal" min="0" max="50" step="0.001" placeholder="optional">
      </label>
      <label>Length (cm)
        <input type="number" name="height_cm" inputmode="decimal" min="0" max="200" step="0.1" placeholder="optional">
      </label>
    </div>
    <label>Head circumference (cm)
      <input type="number" name="head_cm" inputmode="decimal" min="0" max="100" step="0.1" placeholder="optional">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const weight = fd.get('weight_kg') ? Number(fd.get('weight_kg')) : null;
    const height = fd.get('height_cm') ? Number(fd.get('height_cm')) : null;
    const head = fd.get('head_cm') ? Number(fd.get('head_cm')) : null;
    if (weight == null && height == null && head == null) {
      onErr(f, new Error('Enter at least one measurement.'));
      return;
    }
    try {
      await api.post('/api/growths', {
        measured_at: `${fd.get('when')}:00`,
        weight_kg: weight,
        height_cm: height,
        head_cm: head,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Growth saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.bath = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.post('/api/baths', {
        bathed_at: `${fd.get('when')}:00`,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Bath saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.tummy = () => {
  app.replaceChildren(el(`<div class="stack" id="tummy-wrap">
    <div id="tummy-live"></div>
    <details class="advanced">
      <summary>Log past tummy time</summary>
      <form class="stack" id="tummy-form">
        <label>Started
          <input type="datetime-local" name="started_at" required value="${nowLocal()}">
        </label>
        <label>Ended
          <input type="datetime-local" name="ended_at" value="${nowLocal()}">
        </label>
        <label>Notes
          <input type="text" name="notes" maxlength="500" placeholder="optional">
        </label>
        <button type="submit" class="btn btn--ghost">Save tummy time</button>
        <p class="form-msg" hidden></p>
      </form>
    </details>
  </div>`));

  const wrap = document.getElementById('tummy-wrap');
  const liveSlot = wrap.querySelector('#tummy-live');
  let tickerId = null;
  const stopTicker = () => { if (tickerId) { clearInterval(tickerId); tickerId = null; } };
  viewCleanup = stopTicker;

  const render = (current) => {
    stopTicker();
    if (current) {
      const startedMs = new Date(current.started_at).getTime();
      const node = el(`
        <div class="live live--tummy">
          <div class="live__chip">${ICONS.tummy}</div>
          <div class="live__label">Tummy time in progress</div>
          <div class="live__time" id="tummy-elapsed">${fmtTimer(Date.now() - startedMs)}</div>
          <div class="live__sub">started ${fmtTime(current.started_at)}</div>
          <button class="btn" id="end-tummy">End tummy time</button>
        </div>
      `);
      liveSlot.replaceChildren(node);
      const elapsed = node.querySelector('#tummy-elapsed');
      tickerId = setInterval(() => { elapsed.textContent = fmtTimer(Date.now() - startedMs); }, 1000);
      node.querySelector('#end-tummy').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try { await api.post(`/api/tummy-times/${current.id}/end`, {}); showTab('today'); }
        catch (err) { e.target.disabled = false; }
      });
    } else {
      const node = el(`
        <div class="live live--tummy">
          <div class="live__chip">${ICONS.tummy}</div>
          <div class="live__label">Start tummy time</div>
          <div class="live__time" style="font-size:1.6rem">Tap to start</div>
          <div class="live__sub">timer runs until you end it</div>
          <button class="btn" id="start-tummy">Start tummy time</button>
        </div>
      `);
      liveSlot.replaceChildren(node);
      node.querySelector('#start-tummy').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try { await api.post('/api/tummy-times', { started_at: nowLocalISO() }); refresh(); }
        catch (err) { e.target.disabled = false; }
      });
    }
  };

  const refresh = async () => {
    const current = await api.list('/api/tummy-times/current');
    render(current);
  };

  wrap.querySelector('#tummy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    const fd = new FormData(e.target);
    const ended_raw = fd.get('ended_at');
    try {
      await api.post('/api/tummy-times', {
        started_at: `${fd.get('started_at')}:00`,
        ended_at: ended_raw ? `${ended_raw}:00` : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      showTab('today');
    } catch (err) {
      if (btn) btn.disabled = false;
      const m = e.target.querySelector('.form-msg');
      m.classList.add('form-msg--err');
      m.textContent = `Failed: ${err.message}`;
      m.hidden = false;
    }
  });

  refresh();
};

forms.milestone = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <label>What happened
      <input type="text" name="title" required maxlength="120" placeholder="e.g. First smile">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.post('/api/milestones', {
        reached_at: `${fd.get('when')}:00`,
        title: fd.get('title').trim(),
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Milestone saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.spitup = () => {
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <div>
      <label style="margin-bottom:6px">Size</label>
      <div class="seg" id="kind-seg" style="grid-template-columns: 1fr 1fr; grid-auto-flow: row;">
        <button type="button" class="seg__btn is-on" data-kind="small">Small</button>
        <button type="button" class="seg__btn" data-kind="medium">Medium</button>
        <button type="button" class="seg__btn" data-kind="large">Large</button>
        <button type="button" class="seg__btn" data-kind="projectile">Projectile</button>
      </div>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  let kind = 'small';
  f.querySelectorAll('.seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      kind = b.dataset.kind;
      f.querySelectorAll('.seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.post('/api/spitups', {
        happened_at: `${fd.get('when')}:00`,
        kind,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Spit-up saved.');
    } catch (err) { onErr(f, err); }
  });
};

forms.temp = () => {
  let unit = getTempUnit();
  const f = formShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${nowLocal()}">
    </label>
    <div>
      <label style="margin-bottom:6px">Unit</label>
      <div class="seg" id="temp-unit-seg">
        <button type="button" class="seg__btn ${unit === 'C' ? 'is-on' : ''}" data-unit="C">°C</button>
        <button type="button" class="seg__btn ${unit === 'F' ? 'is-on' : ''}" data-unit="F">°F</button>
      </div>
    </div>
    <label><span>Temperature (<span id="temp-unit-lbl">°${unit}</span>)</span>
      <input type="number" name="temp" inputmode="decimal" required step="0.1" placeholder="${unit === 'F' ? 'e.g. 98.6' : 'e.g. 37.0'}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  const tempInput = f.querySelector('[name=temp]');
  const unitLbl = f.querySelector('#temp-unit-lbl');
  f.querySelectorAll('#temp-unit-seg .seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      const next = b.dataset.unit;
      const cur = tempInput.value ? Number(tempInput.value) : null;
      if (cur != null && Number.isFinite(cur) && next !== unit) {
        const conv = next === 'F' ? cToF(cur) : fToC(cur);
        tempInput.value = conv.toFixed(1);
      }
      unit = next;
      setTempUnit(unit);
      unitLbl.textContent = `°${unit}`;
      tempInput.placeholder = unit === 'F' ? 'e.g. 98.6' : 'e.g. 37.0';
      f.querySelectorAll('#temp-unit-seg .seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const raw = fd.get('temp');
    if (!raw) { onErr(f, new Error('Enter a temperature.')); return; }
    const n = Number(raw);
    if (!Number.isFinite(n)) { onErr(f, new Error('Bad number.')); return; }
    const temp_c = unit === 'F' ? fToC(n) : n;
    if (temp_c < 25 || temp_c > 45) {
      onErr(f, new Error(`Temperature out of range (25–45°C).`));
      return;
    }
    try {
      await api.post('/api/temps', {
        taken_at: `${fd.get('when')}:00`,
        temp_c: Math.round(temp_c * 100) / 100,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onSaved(f, 'Temperature saved.');
    } catch (err) { onErr(f, err); }
  });
};

/* ---------- edit forms (PATCH) ---------- */

const isoToLocal = (iso) => (iso ? String(iso).slice(0, 16) : '');

const editShell = (innerHtml) => {
  const node = el(`<form class="card stack" id="edit-form">
    ${innerHtml}
    <div class="grid-2">
      <button type="button" class="btn btn--ghost" id="edit-cancel">Cancel</button>
      <button type="submit" class="btn">Save changes</button>
    </div>
    <p class="form-msg" hidden></p>
  </form>`);
  app.replaceChildren(node);
  node.querySelector('#edit-cancel').addEventListener('click', () => showTab(currentTab));
  node.addEventListener('submit', (e) => {
    const btn = node.querySelector('[type=submit]');
    if (btn?.disabled) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (btn) btn.disabled = true;
  });
  return node;
};

const onEditSaved = (form) => {
  const m = form.querySelector('.form-msg');
  m.classList.remove('form-msg--err');
  m.textContent = 'Saved.';
  m.hidden = false;
  setTimeout(() => showTab(currentTab), 500);
};

const editForms = {};

editForms.bottle = (row) => {
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.started_at)}">
    </label>
    <div class="grid-2">
      <label>Offered (ml)
        <input type="number" name="started_ml" inputmode="numeric" min="0" max="2000" step="5" value="${row.started_ml ?? ''}">
      </label>
      <label>Drank (ml)
        <input type="number" name="amount_ml" inputmode="numeric" min="0" max="2000" step="5" value="${row.amount_ml ?? ''}">
      </label>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.patch(`/api/feeds/${row.id}`, {
        started_at: `${fd.get('when')}:00`,
        amount_ml: fd.get('amount_ml') ? Number(fd.get('amount_ml')) : null,
        started_ml: fd.get('started_ml') ? Number(fd.get('started_ml')) : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.breast = (row) => {
  const side0 = row.kind === 'breast_r' ? 'breast_r' : 'breast_l';
  const mins0 = row.duration_seconds ? Math.round(row.duration_seconds / 60) : '';
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.started_at)}">
    </label>
    <div>
      <label style="margin-bottom:6px">Side</label>
      <div class="seg" id="edit-side-seg">
        <button type="button" class="seg__btn ${side0 === 'breast_l' ? 'is-on' : ''}" data-side="breast_l">Left</button>
        <button type="button" class="seg__btn ${side0 === 'breast_r' ? 'is-on' : ''}" data-side="breast_r">Right</button>
      </div>
    </div>
    <label>Duration (minutes)
      <input type="number" name="minutes" inputmode="numeric" min="0" max="240" step="1" value="${mins0}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  let side = side0;
  f.querySelectorAll('#edit-side-seg .seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      side = b.dataset.side;
      f.querySelectorAll('#edit-side-seg .seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const mins = fd.get('minutes');
    try {
      await api.patch(`/api/feeds/${row.id}`, {
        started_at: `${fd.get('when')}:00`,
        kind: side,
        duration_seconds: mins ? Number(mins) * 60 : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.solid = (row) => {
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.started_at)}">
    </label>
    <label>Amount (g)
      <input type="number" name="amount_ml" inputmode="numeric" min="0" max="2000" step="5" value="${row.amount_ml ?? ''}">
    </label>
    <label>What
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.patch(`/api/feeds/${row.id}`, {
        started_at: `${fd.get('when')}:00`,
        amount_ml: fd.get('amount_ml') ? Number(fd.get('amount_ml')) : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.nappy = (row) => {
  const isDiarrhoea = row.notes === 'Diarrhoea';
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.changed_at)}">
    </label>
    <div>
      <label style="margin-bottom:6px">Kind</label>
      <div class="seg" id="edit-kind-seg">
        <button type="button" class="seg__btn ${row.kind === 'wet' ? 'is-on' : ''}" data-kind="wet">Wet</button>
        <button type="button" class="seg__btn ${row.kind === 'dirty' ? 'is-on' : ''}" data-kind="dirty">Dirty</button>
        <button type="button" class="seg__btn ${row.kind === 'both' ? 'is-on' : ''}" data-kind="both">Both</button>
      </div>
    </div>
    <div>
      <label style="margin-bottom:6px">Contents</label>
      <div class="seg" id="edit-diarrhoea-seg">
        <button type="button" class="seg__btn ${isDiarrhoea ? 'is-on' : ''}" id="edit-diarrhoea-btn">Diarrhoea</button>
      </div>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  let kind = row.kind;
  f.querySelectorAll('#edit-kind-seg .seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      kind = b.dataset.kind;
      f.querySelectorAll('#edit-kind-seg .seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  const editDiarrhoeaBtn = f.querySelector('#edit-diarrhoea-btn');
  const editNotesInput = f.querySelector('[name="notes"]');
  editDiarrhoeaBtn.addEventListener('click', () => {
    const on = editDiarrhoeaBtn.classList.toggle('is-on');
    if (on) { editNotesInput.value = 'Diarrhoea'; }
    else if (editNotesInput.value === 'Diarrhoea') { editNotesInput.value = ''; }
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.patch(`/api/nappies/${row.id}`, {
        changed_at: `${fd.get('when')}:00`,
        kind,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.spitup = (row) => {
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.happened_at)}">
    </label>
    <div>
      <label style="margin-bottom:6px">Size</label>
      <div class="seg" id="edit-spit-seg" style="grid-template-columns: 1fr 1fr; grid-auto-flow: row;">
        <button type="button" class="seg__btn ${row.kind === 'small' ? 'is-on' : ''}" data-kind="small">Small</button>
        <button type="button" class="seg__btn ${row.kind === 'medium' ? 'is-on' : ''}" data-kind="medium">Medium</button>
        <button type="button" class="seg__btn ${row.kind === 'large' ? 'is-on' : ''}" data-kind="large">Large</button>
        <button type="button" class="seg__btn ${row.kind === 'projectile' ? 'is-on' : ''}" data-kind="projectile">Projectile</button>
      </div>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  let kind = row.kind;
  f.querySelectorAll('#edit-spit-seg .seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      kind = b.dataset.kind;
      f.querySelectorAll('#edit-spit-seg .seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.patch(`/api/spitups/${row.id}`, {
        happened_at: `${fd.get('when')}:00`,
        kind,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.sleep = (row) => {
  const f = editShell(`
    <label>Started
      <input type="datetime-local" name="started_at" required value="${isoToLocal(row.started_at)}">
    </label>
    <label>Ended
      <input type="datetime-local" name="ended_at" value="${isoToLocal(row.ended_at)}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const ended_raw = fd.get('ended_at');
    try {
      await api.patch(`/api/naps/${row.id}`, {
        started_at: `${fd.get('started_at')}:00`,
        ended_at: ended_raw ? `${ended_raw}:00` : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.pump = (row) => {
  const f = editShell(`
    <label>Started
      <input type="datetime-local" name="started_at" required value="${isoToLocal(row.started_at)}">
    </label>
    <label>Ended
      <input type="datetime-local" name="ended_at" value="${isoToLocal(row.ended_at)}">
    </label>
    <div class="grid-2">
      <label>Left (ml)
        <input type="number" name="ml_left" inputmode="numeric" min="0" max="2000" step="5" value="${row.ml_left ?? ''}">
      </label>
      <label>Right (ml)
        <input type="number" name="ml_right" inputmode="numeric" min="0" max="2000" step="5" value="${row.ml_right ?? ''}">
      </label>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const ended_raw = fd.get('ended_at');
    try {
      await api.patch(`/api/pumps/${row.id}`, {
        started_at: `${fd.get('started_at')}:00`,
        ended_at: ended_raw ? `${ended_raw}:00` : null,
        ml_left: fd.get('ml_left') ? Number(fd.get('ml_left')) : null,
        ml_right: fd.get('ml_right') ? Number(fd.get('ml_right')) : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.med = (row) => {
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.given_at)}">
    </label>
    <label>Medicine
      <input type="text" name="name" required maxlength="120" value="${escapeHtml(row.name ?? '')}">
    </label>
    <div class="grid-2">
      <label>Dose
        <input type="number" name="dose" inputmode="decimal" min="0" max="10000" step="0.1" value="${row.dose ?? ''}">
      </label>
      <label>Unit
        <input type="text" name="unit" maxlength="20" value="${escapeHtml(row.unit ?? '')}">
      </label>
    </div>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.patch(`/api/meds/${row.id}`, {
        given_at: `${fd.get('when')}:00`,
        name: fd.get('name').trim(),
        dose: fd.get('dose') ? Number(fd.get('dose')) : null,
        unit: (fd.get('unit') || '').trim() || null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.growth = (row) => {
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.measured_at)}">
    </label>
    <p class="form-hint">Fill any combination — leave the rest blank.</p>
    <div class="grid-2">
      <label>Weight (kg)
        <input type="number" name="weight_kg" inputmode="decimal" min="0" max="50" step="0.001" value="${row.weight_kg ?? ''}">
      </label>
      <label>Length (cm)
        <input type="number" name="height_cm" inputmode="decimal" min="0" max="200" step="0.1" value="${row.height_cm ?? ''}">
      </label>
    </div>
    <label>Head circumference (cm)
      <input type="number" name="head_cm" inputmode="decimal" min="0" max="100" step="0.1" value="${row.head_cm ?? ''}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const weight = fd.get('weight_kg') ? Number(fd.get('weight_kg')) : null;
    const height = fd.get('height_cm') ? Number(fd.get('height_cm')) : null;
    const head = fd.get('head_cm') ? Number(fd.get('head_cm')) : null;
    if (weight == null && height == null && head == null) {
      onErr(f, new Error('Enter at least one measurement.'));
      return;
    }
    try {
      await api.patch(`/api/growths/${row.id}`, {
        measured_at: `${fd.get('when')}:00`,
        weight_kg: weight,
        height_cm: height,
        head_cm: head,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.bath = (row) => {
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.bathed_at)}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.patch(`/api/baths/${row.id}`, {
        bathed_at: `${fd.get('when')}:00`,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.tummy = (row) => {
  const f = editShell(`
    <label>Started
      <input type="datetime-local" name="started_at" required value="${isoToLocal(row.started_at)}">
    </label>
    <label>Ended
      <input type="datetime-local" name="ended_at" value="${isoToLocal(row.ended_at)}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const ended_raw = fd.get('ended_at');
    try {
      await api.patch(`/api/tummy-times/${row.id}`, {
        started_at: `${fd.get('started_at')}:00`,
        ended_at: ended_raw ? `${ended_raw}:00` : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.temp = (row) => {
  let unit = getTempUnit();
  const displayed = unit === 'F' ? cToF(row.temp_c) : row.temp_c;
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.taken_at)}">
    </label>
    <div>
      <label style="margin-bottom:6px">Unit</label>
      <div class="seg" id="edit-temp-unit-seg">
        <button type="button" class="seg__btn ${unit === 'C' ? 'is-on' : ''}" data-unit="C">°C</button>
        <button type="button" class="seg__btn ${unit === 'F' ? 'is-on' : ''}" data-unit="F">°F</button>
      </div>
    </div>
    <label><span>Temperature (<span id="edit-temp-unit-lbl">°${unit}</span>)</span>
      <input type="number" name="temp" inputmode="decimal" required step="0.1" value="${displayed.toFixed(1)}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  const tempInput = f.querySelector('[name=temp]');
  const unitLbl = f.querySelector('#edit-temp-unit-lbl');
  f.querySelectorAll('#edit-temp-unit-seg .seg__btn').forEach((b) =>
    b.addEventListener('click', () => {
      const next = b.dataset.unit;
      const cur = tempInput.value ? Number(tempInput.value) : null;
      if (cur != null && Number.isFinite(cur) && next !== unit) {
        const conv = next === 'F' ? cToF(cur) : fToC(cur);
        tempInput.value = conv.toFixed(1);
      }
      unit = next;
      setTempUnit(unit);
      unitLbl.textContent = `°${unit}`;
      f.querySelectorAll('#edit-temp-unit-seg .seg__btn').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const n = Number(fd.get('temp'));
    if (!Number.isFinite(n)) { onErr(f, new Error('Bad number.')); return; }
    const temp_c = unit === 'F' ? fToC(n) : n;
    if (temp_c < 25 || temp_c > 45) {
      onErr(f, new Error(`Temperature out of range (25–45°C).`));
      return;
    }
    try {
      await api.patch(`/api/temps/${row.id}`, {
        taken_at: `${fd.get('when')}:00`,
        temp_c: Math.round(temp_c * 100) / 100,
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

editForms.milestone = (row) => {
  const f = editShell(`
    <label>When
      <input type="datetime-local" name="when" required value="${isoToLocal(row.reached_at)}">
    </label>
    <label>What happened
      <input type="text" name="title" required maxlength="120" value="${escapeHtml(row.title ?? '')}">
    </label>
    <label>Notes
      <input type="text" name="notes" maxlength="500" value="${escapeHtml(row.notes ?? '')}">
    </label>
  `);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    try {
      await api.patch(`/api/milestones/${row.id}`, {
        reached_at: `${fd.get('when')}:00`,
        title: fd.get('title').trim(),
        notes: (fd.get('notes') || '').trim() || null,
      });
      onEditSaved(f);
    } catch (err) { onErr(f, err); }
  });
};

/* ---------- bootstrap ---------- */

tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
loadMe().finally(() => showTab('today'));
