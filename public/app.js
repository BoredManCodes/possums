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
};

const SHEET_ORDER = ['bottle', 'breast', 'solid', 'sleep', 'nappy', 'spitup', 'pump', 'med', 'bath', 'tummy', 'growth', 'milestone'];

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
      return { id: f.id, kind, ts: f.started_at, title, ep: '/api/feeds', notes: f.notes, logged_by: f.logged_by };
    } },
  { ep: '/api/nappies', tf: 'changed_at', map: (n) => ({
      id: n.id, kind: 'nappy', ts: n.changed_at,
      title: KIND_LABELS[n.kind] ?? n.kind, ep: '/api/nappies', notes: n.notes, logged_by: n.logged_by,
    }) },
  { ep: '/api/naps', tf: 'started_at', map: (n) => {
      const dur = n.ended_at ? fmtDuration(new Date(n.ended_at) - new Date(n.started_at)) : 'in progress';
      return { id: n.id, kind: 'sleep', ts: n.started_at, title: `Sleep · ${dur}`, ep: '/api/naps', notes: n.notes, ended_at: n.ended_at, logged_by: n.logged_by };
    } },
  { ep: '/api/pumps', tf: 'started_at', map: (p) => {
      const total = (p.ml_left ?? 0) + (p.ml_right ?? 0);
      const dur = p.ended_at ? fmtDuration(new Date(p.ended_at) - new Date(p.started_at)) : 'in progress';
      const amt = total > 0 ? ` · ${total} ml` : '';
      return { id: p.id, kind: 'pump', ts: p.started_at, title: `Pump · ${dur}${amt}`, ep: '/api/pumps', notes: p.notes, logged_by: p.logged_by };
    } },
  { ep: '/api/meds', tf: 'given_at', map: (m) => {
      const dose = m.dose ? ` · ${m.dose}${m.unit ?? ''}` : '';
      return { id: m.id, kind: 'med', ts: m.given_at, title: `${m.name}${dose}`, ep: '/api/meds', notes: m.notes, logged_by: m.logged_by };
    } },
  { ep: '/api/growths', tf: 'measured_at', map: (g) => {
      const parts = [];
      if (g.weight_kg) parts.push(`${g.weight_kg} kg`);
      if (g.height_cm) parts.push(`length ${g.height_cm} cm`);
      if (g.head_cm) parts.push(`head ${g.head_cm} cm`);
      return { id: g.id, kind: 'growth', ts: g.measured_at, title: parts.join(' · ') || 'Growth', ep: '/api/growths', notes: g.notes, logged_by: g.logged_by };
    } },
  { ep: '/api/baths', tf: 'bathed_at', map: (b) => ({
      id: b.id, kind: 'bath', ts: b.bathed_at, title: 'Bath', ep: '/api/baths', notes: b.notes, logged_by: b.logged_by,
    }) },
  { ep: '/api/tummy-times', tf: 'started_at', map: (t) => {
      const dur = t.ended_at ? fmtDuration(new Date(t.ended_at) - new Date(t.started_at)) : 'in progress';
      return { id: t.id, kind: 'tummy', ts: t.started_at, title: `Tummy time · ${dur}`, ep: '/api/tummy-times', notes: t.notes, logged_by: t.logged_by };
    } },
  { ep: '/api/milestones', tf: 'reached_at', map: (m) => ({
      id: m.id, kind: 'milestone', ts: m.reached_at, title: m.title, ep: '/api/milestones', notes: m.notes, logged_by: m.logged_by,
    }) },
  { ep: '/api/spitups', tf: 'happened_at', map: (s) => ({
      id: s.id, kind: 'spitup', ts: s.happened_at,
      title: `${KIND_LABELS[s.kind] ?? s.kind} spit-up`, ep: '/api/spitups', notes: s.notes, logged_by: s.logged_by,
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
  const node = el(`
    <div class="row" data-ep="${ev.ep}" data-id="${ev.id}">
      ${chipHtml(ev.kind)}
      <div class="row__main">
        <div class="row__title">${escapeHtml(ev.title)}</div>
        <div class="row__sub">${sub}</div>
      </div>
      ${opts.showDelete === false ? '' : '<button class="row__del" aria-label="Delete">×</button>'}
    </div>
  `);
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

  const refresh = async () => {
    const [feeds, nappies, naps, currentNap, bottleTimer, allEvents] = await Promise.all([
      api.list('/api/feeds?limit=1'),
      api.list('/api/nappies?limit=1'),
      api.list('/api/naps?limit=1'),
      api.list('/api/naps/current'),
      api.list('/api/bottle-timer'),
      fetchUnified(80),
    ]);

    renderLive(currentNap, bottleTimer);

    const stats = wrap.querySelector('#today-stats');
    const lastFeed = feeds[0];
    const lastNappy = nappies[0];
    const lastSleep = naps[0];
    stats.replaceChildren(
      statTile(
        'Last feed',
        lastFeed ? (lastFeed.amount_ml ? `${lastFeed.amount_ml} ml` : 'Feed') : '—',
        lastFeed ? relTime(lastFeed.started_at) : 'no feeds yet',
        'bottle', 'history'
      ),
      statTile(
        'Last sleep',
        lastSleep
          ? (lastSleep.ended_at
              ? fmtDuration(new Date(lastSleep.ended_at) - new Date(lastSleep.started_at))
              : 'in progress')
          : '—',
        lastSleep ? relTime(lastSleep.ended_at ?? lastSleep.started_at) : 'no sleep yet',
        'sleep', 'sleep'
      ),
      statTile(
        'Last nappy',
        lastNappy ? (KIND_LABELS[lastNappy.kind] ?? lastNappy.kind) : '—',
        lastNappy ? relTime(lastNappy.changed_at) : 'no nappies yet',
        'nappy', 'history'
      ),
    );

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
    } catch (err) { flash(`Failed: ${err.message}`, true); }
  });

  refresh();
};

/* ---------- History view ---------- */

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
  ];
  let active = 'all';

  const wrap = el(`<div class="stack">
    <div class="chips" id="hist-chips"></div>
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

  const refresh = async () => {
    const events = await fetchUnified(100);
    const list = wrap.querySelector('#hist-list');
    const filtered = events.filter(matches);
    if (filtered.length === 0) {
      list.replaceChildren(el(`<div class="placeholder">Nothing here yet.</div>`));
    } else {
      list.replaceChildren(...filtered.map((ev) => renderEventRow(ev, { onChange: refresh })));
    }
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
  const health = await fetch('/api/health').then((r) => r.json()).catch(() => ({}));
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
    <div class="card stack">
      <h2 class="card__title">Activity types</h2>
      <div class="quick-grid" id="more-types"></div>
    </div>
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
};

/* ---------- form screens ---------- */

const formShell = (innerHtml, opts) => {
  const node = el(`<form class="card stack" id="form">
    ${innerHtml}
    <button type="submit" class="btn">${opts.saveLabel ?? 'Save'}</button>
    <p class="form-msg" hidden></p>
  </form>`);
  app.replaceChildren(node);
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

        <button class="btn" id="end-bottle">End bottle</button>
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

  wrap.querySelector('#bottle-past-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msgEl = e.target.querySelector('.form-msg');
    try {
      await api.post('/api/feeds', {
        started_at: `${fd.get('when')}:00`,
        kind: 'bottle',
        amount_ml: fd.get('amount_ml') ? Number(fd.get('amount_ml')) : null,
        started_ml: fd.get('started_ml') ? Number(fd.get('started_ml')) : null,
        notes: (fd.get('notes') || '').trim() || null,
      });
      showTab('today');
    } catch (err) {
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
    <label>Notes
      <input type="text" name="notes" maxlength="500" placeholder="optional">
    </label>
  `, {});
  let kind = 'wet';
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
        <input type="number" name="weight_kg" inputmode="decimal" min="0" max="50" step="0.01" placeholder="optional">
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

/* ---------- bootstrap ---------- */

tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
loadMe().finally(() => showTab('today'));
