const PASSWORD = 'eloise';
const COOKIE_NAME = 'possums_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_VALUE = 'ok';

const FEED_KINDS = ['bottle', 'breast_l', 'breast_r', 'solid'];
const NAPPY_KINDS = ['wet', 'dirty', 'both'];

const enc = new TextEncoder();

async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function signSession(secret) {
  return `${SESSION_VALUE}.${await hmacHex(secret, SESSION_VALUE)}`;
}

async function verifySession(secret, token) {
  if (!token) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const value = token.slice(0, i);
  const tag = token.slice(i + 1);
  if (value !== SESSION_VALUE) return false;
  const expected = await hmacHex(secret, value);
  if (tag.length !== expected.length) return false;
  let diff = 0;
  for (let j = 0; j < tag.length; j++) diff |= tag.charCodeAt(j) ^ expected.charCodeAt(j);
  return diff === 0;
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

async function isAuthed(request, env) {
  return verifySession(env.SESSION_SECRET, getCookie(request, COOKIE_NAME));
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

const badRequest = (msg) => json({ error: msg }, { status: 400 });

const LOGIN_HTML = `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#fbf7f0">
  <title>Possums – Sign in</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    body { background: #fbf7f0; }
    .login { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
    .login__card { width: 100%; max-width: 320px; display: grid; gap: 16px; }
    .login__title { text-align: center; font-size: 32px; margin: 0; font-weight: 600; }
    .login__form { display: grid; gap: 12px; }
    .login__input { font: inherit; padding: 14px 16px; border: 1px solid #d8cfbf; border-radius: 14px; background: #fff; }
    .login__btn { font: inherit; padding: 14px; border-radius: 14px; border: 0; background: #2c2620; color: #fff; font-weight: 600; cursor: pointer; }
    .login__err { color: #b3261e; font-size: 14px; text-align: center; min-height: 1em; margin: 0; }
  </style>
</head>
<body>
  <main class="login">
    <div class="login__card">
      <h1 class="login__title">Possums</h1>
      <form class="login__form" method="post" action="/login">
        <input class="login__input" type="password" name="password" placeholder="Password" autofocus required>
        <button class="login__btn" type="submit">Sign in</button>
        <p class="login__err">__ERR__</p>
      </form>
    </div>
  </main>
</body>
</html>`;

function loginPage(err = '') {
  return new Response(LOGIN_HTML.replace('__ERR__', err), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function cookieFlags(url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

async function handleLogin(request, env, url) {
  const form = await request.formData();
  if (form.get('password') !== PASSWORD) return loginPage('Wrong password.');
  const token = await signSession(env.SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': `${COOKIE_NAME}=${token}; Max-Age=${COOKIE_MAX_AGE}; ${cookieFlags(url)}`,
    },
  });
}

function logoutResponse(url) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': `${COOKIE_NAME}=; Max-Age=0; ${cookieFlags(url)}`,
    },
  });
}

/* ---------- data layer ---------- */

const readList = async (env, key) => {
  const raw = await env.POSSUMS_KV.get(key);
  return raw ? JSON.parse(raw) : [];
};
const writeList = (env, key, list) => env.POSSUMS_KV.put(key, JSON.stringify(list));

const nowSec = () => new Date().toISOString().slice(0, 19);

const nextId = (list) => {
  let m = 0;
  for (const r of list) if (r.id > m) m = r.id;
  return m + 1;
};

const topNBy = (list, field, limit) =>
  [...list].sort((a, b) => (a[field] < b[field] ? 1 : a[field] > b[field] ? -1 : 0)).slice(0, limit);

const parseLimit = (url, def = 50, max = 500) => {
  const n = Number(url.searchParams.get('limit')) || def;
  return Math.min(Math.max(1, n), max);
};

const readBody = async (request) => {
  try { return await request.json(); } catch { return null; }
};

const isStr = (v, min = 0, max = Infinity) =>
  typeof v === 'string' && v.length >= min && v.length <= max;
const isStrOrNull = (v, max) =>
  v == null || (typeof v === 'string' && v.length <= max);
const isIntOrNull = (v, min, max) =>
  v == null || (Number.isInteger(v) && v >= min && v <= max);
const isNumOrNull = (v, min, max) =>
  v == null || (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max);

const simple = {
  feeds: {
    key: 'feeds',
    tf: 'started_at',
    validate(b) {
      if (!isStr(b.started_at, 10)) return 'started_at required';
      if (b.kind !== undefined && !FEED_KINDS.includes(b.kind)) return 'bad kind';
      if (!isIntOrNull(b.amount_ml, 0, 2000)) return 'bad amount_ml';
      if (!isIntOrNull(b.duration_seconds, 0, 36000)) return 'bad duration_seconds';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) {
      return {
        started_at: b.started_at,
        kind: b.kind ?? 'bottle',
        amount_ml: b.amount_ml ?? null,
        duration_seconds: b.duration_seconds ?? null,
        notes: b.notes ?? null,
      };
    },
  },
  nappies: {
    key: 'nappies',
    tf: 'changed_at',
    validate(b) {
      if (!isStr(b.changed_at, 10)) return 'changed_at required';
      if (!NAPPY_KINDS.includes(b.kind)) return 'bad kind';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) { return { changed_at: b.changed_at, kind: b.kind, notes: b.notes ?? null }; },
  },
  meds: {
    key: 'meds',
    tf: 'given_at',
    validate(b) {
      if (!isStr(b.given_at, 10)) return 'given_at required';
      if (!isStr(b.name, 1, 120)) return 'name required';
      if (!isNumOrNull(b.dose, 0, 10000)) return 'bad dose';
      if (!isStrOrNull(b.unit, 20)) return 'bad unit';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) {
      return {
        given_at: b.given_at, name: b.name.trim(),
        dose: b.dose ?? null, unit: b.unit ?? null, notes: b.notes ?? null,
      };
    },
  },
  growths: {
    key: 'growths',
    tf: 'measured_at',
    validate(b) {
      if (!isStr(b.measured_at, 10)) return 'measured_at required';
      if (!isNumOrNull(b.weight_kg, 0, 50)) return 'bad weight_kg';
      if (!isNumOrNull(b.height_cm, 0, 200)) return 'bad height_cm';
      if (!isNumOrNull(b.head_cm, 0, 100)) return 'bad head_cm';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) {
      return {
        measured_at: b.measured_at,
        weight_kg: b.weight_kg ?? null,
        height_cm: b.height_cm ?? null,
        head_cm: b.head_cm ?? null,
        notes: b.notes ?? null,
      };
    },
  },
  baths: {
    key: 'baths',
    tf: 'bathed_at',
    validate(b) {
      if (!isStr(b.bathed_at, 10)) return 'bathed_at required';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) { return { bathed_at: b.bathed_at, notes: b.notes ?? null }; },
  },
  milestones: {
    key: 'milestones',
    tf: 'reached_at',
    validate(b) {
      if (!isStr(b.reached_at, 10)) return 'reached_at required';
      if (!isStr(b.title, 1, 120)) return 'title required';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) { return { reached_at: b.reached_at, title: b.title.trim(), notes: b.notes ?? null }; },
  },
};

const timed = {
  naps: {
    key: 'naps',
    tf: 'started_at',
    label: 'nap',
    validateStart(b) {
      if (!isStr(b.started_at, 10)) return 'started_at required';
      if (b.ended_at != null && !isStr(b.ended_at, 10)) return 'bad ended_at';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    buildStart(b) { return { started_at: b.started_at, ended_at: b.ended_at ?? null, notes: b.notes ?? null }; },
    validatePatch(b) {
      if (b.started_at !== undefined && !isStr(b.started_at, 10)) return 'bad started_at';
      if (b.ended_at !== undefined && b.ended_at !== null && !isStr(b.ended_at, 10)) return 'bad ended_at';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return {
        ...existing,
        started_at: b.started_at ?? existing.started_at,
        ended_at: 'ended_at' in b ? b.ended_at : existing.ended_at,
        notes: 'notes' in b ? b.notes : existing.notes,
      };
    },
    applyEnd(existing, b) { return { ...existing, ended_at: b?.ended_at ?? nowSec() }; },
  },
  pumps: {
    key: 'pumps',
    tf: 'started_at',
    label: 'pump',
    validateStart(b) {
      if (!isStr(b.started_at, 10)) return 'started_at required';
      if (b.ended_at != null && !isStr(b.ended_at, 10)) return 'bad ended_at';
      if (!isIntOrNull(b.ml_left, 0, 2000)) return 'bad ml_left';
      if (!isIntOrNull(b.ml_right, 0, 2000)) return 'bad ml_right';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    buildStart(b) {
      return {
        started_at: b.started_at, ended_at: b.ended_at ?? null,
        ml_left: b.ml_left ?? null, ml_right: b.ml_right ?? null, notes: b.notes ?? null,
      };
    },
    applyEnd(existing, b) {
      return {
        ...existing,
        ended_at: b?.ended_at ?? nowSec(),
        ml_left: b?.ml_left ?? existing.ml_left,
        ml_right: b?.ml_right ?? existing.ml_right,
      };
    },
  },
  tummy_times: {
    key: 'tummy_times',
    tf: 'started_at',
    label: 'tummy time',
    validateStart(b) {
      if (!isStr(b.started_at, 10)) return 'started_at required';
      if (b.ended_at != null && !isStr(b.ended_at, 10)) return 'bad ended_at';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    buildStart(b) { return { started_at: b.started_at, ended_at: b.ended_at ?? null, notes: b.notes ?? null }; },
    applyEnd(existing, b) { return { ...existing, ended_at: b?.ended_at ?? nowSec() }; },
  },
};

async function handleSimple(name, request, url, env, idStr) {
  const res = simple[name];
  if (!idStr) {
    if (request.method === 'GET') {
      const list = await readList(env, res.key);
      return json(topNBy(list, res.tf, parseLimit(url)));
    }
    if (request.method === 'POST') {
      const b = await readBody(request);
      if (!b) return badRequest('json required');
      const err = res.validate(b);
      if (err) return badRequest(err);
      const list = await readList(env, res.key);
      const row = { id: nextId(list), ...res.build(b), created_at: nowSec() };
      list.push(row);
      await writeList(env, res.key, list);
      return json(row, { status: 201 });
    }
    return new Response('Method not allowed', { status: 405 });
  }
  if (request.method === 'DELETE') {
    const id = Number(idStr);
    const list = await readList(env, res.key);
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return json({ error: 'not found' }, { status: 404 });
    list.splice(i, 1);
    await writeList(env, res.key, list);
    return new Response(null, { status: 204 });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function handleTimed(name, request, url, env, idStr, sub) {
  const res = timed[name];
  if (!idStr) {
    if (request.method === 'GET') {
      const list = await readList(env, res.key);
      return json(topNBy(list, res.tf, parseLimit(url)));
    }
    if (request.method === 'POST') {
      const b = await readBody(request);
      if (!b) return badRequest('json required');
      const err = res.validateStart(b);
      if (err) return badRequest(err);
      const list = await readList(env, res.key);
      const row = { id: nextId(list), ...res.buildStart(b), created_at: nowSec() };
      list.push(row);
      await writeList(env, res.key, list);
      return json(row, { status: 201 });
    }
    return new Response('Method not allowed', { status: 405 });
  }
  if (idStr === 'current' && request.method === 'GET') {
    const list = await readList(env, res.key);
    const open = list.filter((r) => r.ended_at == null);
    return json(topNBy(open, res.tf, 1)[0] ?? null);
  }
  const id = Number(idStr);
  if (sub === 'end' && request.method === 'POST') {
    const b = (await readBody(request)) ?? {};
    const list = await readList(env, res.key);
    const i = list.findIndex((r) => r.id === id);
    if (i < 0 || list[i].ended_at != null) {
      return json({ error: `${res.label} not found or already ended` }, { status: 409 });
    }
    list[i] = res.applyEnd(list[i], b);
    await writeList(env, res.key, list);
    return json(list[i]);
  }
  if (request.method === 'PATCH' && res.validatePatch) {
    const b = await readBody(request);
    if (!b) return badRequest('json required');
    const err = res.validatePatch(b);
    if (err) return badRequest(err);
    const list = await readList(env, res.key);
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return json({ error: 'not found' }, { status: 404 });
    list[i] = res.applyPatch(list[i], b);
    await writeList(env, res.key, list);
    return json(list[i]);
  }
  if (request.method === 'DELETE') {
    const list = await readList(env, res.key);
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return json({ error: 'not found' }, { status: 404 });
    list.splice(i, 1);
    await writeList(env, res.key, list);
    return new Response(null, { status: 204 });
  }
  return new Response('Method not allowed', { status: 405 });
}

const TIMED_PATHS = { naps: 'naps', pumps: 'pumps', 'tummy-times': 'tummy_times' };

async function handleApi(request, url, env) {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[1] === 'health') return json({ ok: true, db: 'kv' });
  if (simple[parts[1]]) return handleSimple(parts[1], request, url, env, parts[2]);
  if (TIMED_PATHS[parts[1]]) return handleTimed(TIMED_PATHS[parts[1]], request, url, env, parts[2], parts[3]);
  return json({ error: 'not found' }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/login') {
      if (request.method === 'POST') return handleLogin(request, env, url);
      if (await isAuthed(request, env)) {
        return new Response(null, { status: 302, headers: { Location: '/' } });
      }
      return loginPage();
    }
    if (url.pathname === '/logout') return logoutResponse(url);

    if (!(await isAuthed(request, env))) {
      if (url.pathname.startsWith('/api/')) {
        return json({ error: 'unauthorised' }, { status: 401 });
      }
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }

    if (url.pathname.startsWith('/api/')) return handleApi(request, url, env);

    return env.ASSETS.fetch(request);
  },
};
