const COOKIE_NAME = 'possums_session';
const WHO_COOKIE = 'possums_who';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_VALUE = 'ok';

const FEED_KINDS = ['bottle', 'breast_l', 'breast_r', 'solid'];
const NAPPY_KINDS = ['wet', 'dirty', 'both'];
const SPITUP_KINDS = ['small', 'medium', 'large', 'projectile'];
const WHO_VALUES = ['parent1', 'parent2'];

const PARENTS_KEY = 'config:parents';
const AUTH_KEY = 'config:auth';
const SECRET_KEY = 'config:session_secret';
const DEFAULT_PARENTS = { parent1: 'Parent 1', parent2: 'Parent 2' };
const PBKDF2_ITERS = 100000;

const readParents = async (env) => {
  const raw = await env.POSSUMS_KV.get(PARENTS_KEY);
  if (!raw) return { ...DEFAULT_PARENTS };
  try {
    const o = JSON.parse(raw);
    return {
      parent1: typeof o.parent1 === 'string' && o.parent1 ? o.parent1 : DEFAULT_PARENTS.parent1,
      parent2: typeof o.parent2 === 'string' && o.parent2 ? o.parent2 : DEFAULT_PARENTS.parent2,
    };
  } catch { return { ...DEFAULT_PARENTS }; }
};
const writeParents = (env, obj) => env.POSSUMS_KV.put(PARENTS_KEY, JSON.stringify(obj));

const escapeAttr = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const getWho = (request) => {
  const v = getCookie(request, WHO_COOKIE);
  return WHO_VALUES.includes(v) ? v : null;
};

const enc = new TextEncoder();

const randomHex = (n) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex) => new Uint8Array(hex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? []);

async function pbkdf2Hex(password, saltHex) {
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERS },
    baseKey, 256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const readAuthKV = async (env) => {
  const raw = await env.POSSUMS_KV.get(AUTH_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const isSetupNeeded = async (env) => {
  if (await env.POSSUMS_KV.get(AUTH_KEY)) return false;
  return !env.PASSWORD;
};

const checkPassword = async (env, password) => {
  if (typeof password !== 'string' || !password) return false;
  const kvAuth = await readAuthKV(env);
  if (kvAuth?.salt && kvAuth?.hash) {
    const candidate = await pbkdf2Hex(password, kvAuth.salt);
    if (candidate.length !== kvAuth.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ kvAuth.hash.charCodeAt(i);
    return diff === 0;
  }
  return env.PASSWORD ? password === env.PASSWORD : false;
};

const getSessionSecret = async (env) => {
  const kvSecret = await env.POSSUMS_KV.get(SECRET_KEY);
  return kvSecret ?? env.SESSION_SECRET ?? '';
};

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
  const secret = await getSessionSecret(env);
  if (!secret) return false;
  return verifySession(secret, getCookie(request, COOKIE_NAME));
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

const badRequest = (msg) => json({ error: msg }, { status: 400 });

const renderLoginHtml = (err = '', name = '') => `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#fbf7f0">
  <title>Possums – Sign in</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
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
        <input class="login__input" type="text" name="name" placeholder="Your name" autocomplete="username" autocapitalize="words" autofocus required value="${escapeAttr(name)}">
        <input class="login__input" type="password" name="password" placeholder="Password" autocomplete="current-password" required>
        <button class="login__btn" type="submit">Sign in</button>
        <p class="login__err">${escapeAttr(err)}</p>
      </form>
    </div>
  </main>
</body>
</html>`;

function loginPage(err = '', name = '') {
  return new Response(renderLoginHtml(err, name), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function cookieFlags(url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

async function handleLogin(request, env, url) {
  const form = await request.formData();
  const typedName = String(form.get('name') ?? '').trim();
  const typedPwd = String(form.get('password') ?? '');
  const parents = await readParents(env);
  const norm = (s) => s.trim().toLowerCase();
  let who = null;
  if (typedName && norm(parents.parent1) === norm(typedName)) who = 'parent1';
  else if (typedName && norm(parents.parent2) === norm(typedName)) who = 'parent2';
  if (!who) return loginPage('Name not recognised.', typedName);
  if (!(await checkPassword(env, typedPwd))) return loginPage('Wrong password.', typedName);

  const secret = await getSessionSecret(env);
  const token = await signSession(secret);
  const flags = cookieFlags(url);
  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Max-Age=${COOKIE_MAX_AGE}; ${flags}`);
  headers.append('Set-Cookie', `${WHO_COOKIE}=${who}; Max-Age=${COOKIE_MAX_AGE}; ${flags}`);
  return new Response(null, { status: 302, headers });
}

function logoutResponse(url) {
  const flags = cookieFlags(url);
  const headers = new Headers({ Location: '/login' });
  headers.append('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; ${flags}`);
  headers.append('Set-Cookie', `${WHO_COOKIE}=; Max-Age=0; ${flags}`);
  return new Response(null, { status: 302, headers });
}

const renderSetupHtml = (err = '', vals = {}) => `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#fbf7f0">
  <title>Possums – Setup</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/styles.css">
  <style>
    body { background: #fbf7f0; }
    .setup { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
    .setup__card { width: 100%; max-width: 380px; display: grid; gap: 16px; }
    .setup__title { text-align: center; font-size: 32px; margin: 0; font-weight: 600; }
    .setup__intro { text-align: center; color: #6b6258; margin: 0; }
    .setup__form { display: grid; gap: 12px; }
    .setup__form label { display: grid; gap: 6px; font-size: 14px; color: #6b6258; }
    .setup__input { font: inherit; padding: 14px 16px; border: 1px solid #d8cfbf; border-radius: 14px; background: #fff; }
    .setup__btn { font: inherit; padding: 14px; border-radius: 14px; border: 0; background: #2c2620; color: #fff; font-weight: 600; cursor: pointer; }
    .setup__err { color: #b3261e; font-size: 14px; text-align: center; min-height: 1em; margin: 0; }
    .setup__hint { font-size: 12px; color: #8a8275; margin: 0; }
  </style>
</head>
<body>
  <main class="setup">
    <div class="setup__card">
      <h1 class="setup__title">Welcome to Possums</h1>
      <p class="setup__intro">Set up your tracker in one go. You'll sign in with a parent name + the password you choose here.</p>
      <form class="setup__form" method="post" action="/setup">
        <label>Parent 1 name
          <input class="setup__input" type="text" name="parent1" required maxlength="60" autocapitalize="words" value="${escapeAttr(vals.parent1 ?? '')}">
        </label>
        <label>Parent 2 name
          <input class="setup__input" type="text" name="parent2" required maxlength="60" autocapitalize="words" value="${escapeAttr(vals.parent2 ?? '')}">
        </label>
        <label>Shared password
          <input class="setup__input" type="password" name="password" required minlength="6" autocomplete="new-password">
        </label>
        <label>Confirm password
          <input class="setup__input" type="password" name="password2" required minlength="6" autocomplete="new-password">
        </label>
        <p class="setup__hint">Both parents share this password. Sign in by typing your name + the password.</p>
        <button class="setup__btn" type="submit">Finish setup</button>
        <p class="setup__err">${escapeAttr(err)}</p>
      </form>
    </div>
  </main>
</body>
</html>`;

function setupPage(err = '', vals = {}) {
  return new Response(renderSetupHtml(err, vals), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

async function handleSetup(request, env, url) {
  if (!(await isSetupNeeded(env))) {
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  }
  if (request.method === 'GET') return setupPage();
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const form = await request.formData();
  const parent1 = String(form.get('parent1') ?? '').trim();
  const parent2 = String(form.get('parent2') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const password2 = String(form.get('password2') ?? '');
  const vals = { parent1, parent2 };

  if (!parent1 || !parent2) return setupPage('Both parent names are required.', vals);
  if (parent1.length > 60 || parent2.length > 60) return setupPage('Names must be 60 characters or fewer.', vals);
  if (parent1.trim().toLowerCase() === parent2.trim().toLowerCase()) {
    return setupPage('Parent names must be different.', vals);
  }
  if (password.length < 6) return setupPage('Password must be at least 6 characters.', vals);
  if (password !== password2) return setupPage('Passwords do not match.', vals);

  const salt = randomHex(16);
  const hash = await pbkdf2Hex(password, salt);
  const secret = randomHex(32);

  await env.POSSUMS_KV.put(PARENTS_KEY, JSON.stringify({ parent1, parent2 }));
  await env.POSSUMS_KV.put(AUTH_KEY, JSON.stringify({ salt, hash, iters: PBKDF2_ITERS, alg: 'pbkdf2-sha256' }));
  await env.POSSUMS_KV.put(SECRET_KEY, secret);

  const token = await signSession(secret);
  const flags = cookieFlags(url);
  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Max-Age=${COOKIE_MAX_AGE}; ${flags}`);
  headers.append('Set-Cookie', `${WHO_COOKIE}=parent1; Max-Age=${COOKIE_MAX_AGE}; ${flags}`);
  return new Response(null, { status: 302, headers });
}

async function handleChangePassword(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const b = await readBody(request);
  if (!b) return badRequest('json required');
  const current = String(b.current ?? '');
  const next = String(b.next ?? '');
  if (next.length < 6) return badRequest('new password must be at least 6 characters');
  if (!(await checkPassword(env, current))) return json({ error: 'current password is wrong' }, { status: 401 });
  const salt = randomHex(16);
  const hash = await pbkdf2Hex(next, salt);
  await env.POSSUMS_KV.put(AUTH_KEY, JSON.stringify({ salt, hash, iters: PBKDF2_ITERS, alg: 'pbkdf2-sha256' }));
  return json({ ok: true });
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

const mergeDefined = (existing, b, fields) => {
  const out = { ...existing };
  for (const f of fields) if (f in b) out[f] = b[f];
  return out;
};

const simple = {
  feeds: {
    key: 'feeds',
    tf: 'started_at',
    validate(b) {
      if (!isStr(b.started_at, 10)) return 'started_at required';
      if (b.kind !== undefined && !FEED_KINDS.includes(b.kind)) return 'bad kind';
      if (!isIntOrNull(b.amount_ml, 0, 2000)) return 'bad amount_ml';
      if (!isIntOrNull(b.started_ml, 0, 2000)) return 'bad started_ml';
      if (!isIntOrNull(b.duration_seconds, 0, 36000)) return 'bad duration_seconds';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) {
      return {
        started_at: b.started_at,
        kind: b.kind ?? 'bottle',
        amount_ml: b.amount_ml ?? null,
        started_ml: b.started_ml ?? null,
        duration_seconds: b.duration_seconds ?? null,
        notes: b.notes ?? null,
      };
    },
    validatePatch(b) {
      if (b.started_at !== undefined && !isStr(b.started_at, 10)) return 'bad started_at';
      if (b.kind !== undefined && !FEED_KINDS.includes(b.kind)) return 'bad kind';
      if (b.amount_ml !== undefined && !isIntOrNull(b.amount_ml, 0, 2000)) return 'bad amount_ml';
      if (b.started_ml !== undefined && !isIntOrNull(b.started_ml, 0, 2000)) return 'bad started_ml';
      if (b.duration_seconds !== undefined && !isIntOrNull(b.duration_seconds, 0, 36000)) return 'bad duration_seconds';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return mergeDefined(existing, b, ['started_at', 'kind', 'amount_ml', 'started_ml', 'duration_seconds', 'notes']);
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
    validatePatch(b) {
      if (b.changed_at !== undefined && !isStr(b.changed_at, 10)) return 'bad changed_at';
      if (b.kind !== undefined && !NAPPY_KINDS.includes(b.kind)) return 'bad kind';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return mergeDefined(existing, b, ['changed_at', 'kind', 'notes']);
    },
  },
  spitups: {
    key: 'spitups',
    tf: 'happened_at',
    validate(b) {
      if (!isStr(b.happened_at, 10)) return 'happened_at required';
      if (!SPITUP_KINDS.includes(b.kind)) return 'bad kind';
      if (!isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    build(b) { return { happened_at: b.happened_at, kind: b.kind, notes: b.notes ?? null }; },
    validatePatch(b) {
      if (b.happened_at !== undefined && !isStr(b.happened_at, 10)) return 'bad happened_at';
      if (b.kind !== undefined && !SPITUP_KINDS.includes(b.kind)) return 'bad kind';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return mergeDefined(existing, b, ['happened_at', 'kind', 'notes']);
    },
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
    validatePatch(b) {
      if (b.given_at !== undefined && !isStr(b.given_at, 10)) return 'bad given_at';
      if (b.name !== undefined && !isStr(b.name, 1, 120)) return 'bad name';
      if (b.dose !== undefined && !isNumOrNull(b.dose, 0, 10000)) return 'bad dose';
      if (b.unit !== undefined && !isStrOrNull(b.unit, 20)) return 'bad unit';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      const patched = mergeDefined(existing, b, ['given_at', 'name', 'dose', 'unit', 'notes']);
      if (typeof patched.name === 'string') patched.name = patched.name.trim();
      return patched;
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
    validatePatch(b) {
      if (b.measured_at !== undefined && !isStr(b.measured_at, 10)) return 'bad measured_at';
      if (b.weight_kg !== undefined && !isNumOrNull(b.weight_kg, 0, 50)) return 'bad weight_kg';
      if (b.height_cm !== undefined && !isNumOrNull(b.height_cm, 0, 200)) return 'bad height_cm';
      if (b.head_cm !== undefined && !isNumOrNull(b.head_cm, 0, 100)) return 'bad head_cm';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return mergeDefined(existing, b, ['measured_at', 'weight_kg', 'height_cm', 'head_cm', 'notes']);
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
    validatePatch(b) {
      if (b.bathed_at !== undefined && !isStr(b.bathed_at, 10)) return 'bad bathed_at';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return mergeDefined(existing, b, ['bathed_at', 'notes']);
    },
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
    validatePatch(b) {
      if (b.reached_at !== undefined && !isStr(b.reached_at, 10)) return 'bad reached_at';
      if (b.title !== undefined && !isStr(b.title, 1, 120)) return 'bad title';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      const patched = mergeDefined(existing, b, ['reached_at', 'title', 'notes']);
      if (typeof patched.title === 'string') patched.title = patched.title.trim();
      return patched;
    },
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
    validatePatch(b) {
      if (b.started_at !== undefined && !isStr(b.started_at, 10)) return 'bad started_at';
      if (b.ended_at !== undefined && b.ended_at !== null && !isStr(b.ended_at, 10)) return 'bad ended_at';
      if (b.ml_left !== undefined && !isIntOrNull(b.ml_left, 0, 2000)) return 'bad ml_left';
      if (b.ml_right !== undefined && !isIntOrNull(b.ml_right, 0, 2000)) return 'bad ml_right';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return mergeDefined(existing, b, ['started_at', 'ended_at', 'ml_left', 'ml_right', 'notes']);
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
    validatePatch(b) {
      if (b.started_at !== undefined && !isStr(b.started_at, 10)) return 'bad started_at';
      if (b.ended_at !== undefined && b.ended_at !== null && !isStr(b.ended_at, 10)) return 'bad ended_at';
      if (b.notes !== undefined && !isStrOrNull(b.notes, 500)) return 'bad notes';
      return null;
    },
    applyPatch(existing, b) {
      return mergeDefined(existing, b, ['started_at', 'ended_at', 'notes']);
    },
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
      const row = { id: nextId(list), ...res.build(b), logged_by: getWho(request), created_at: nowSec() };
      list.push(row);
      await writeList(env, res.key, list);
      return json(row, { status: 201 });
    }
    return new Response('Method not allowed', { status: 405 });
  }
  const id = Number(idStr);
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
      const row = { id: nextId(list), ...res.buildStart(b), logged_by: getWho(request), created_at: nowSec() };
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

const BOTTLE_TIMER_KEY = 'bottle_timer';
const readBottleTimer = async (env) => {
  const raw = await env.POSSUMS_KV.get(BOTTLE_TIMER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

async function handleBottleTimer(request, env, action) {
  if (!action) {
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    return json(await readBottleTimer(env));
  }
  if (action === 'start' && request.method === 'POST') {
    if (await readBottleTimer(env)) {
      return json({ error: 'a bottle timer is already running' }, { status: 409 });
    }
    const b = (await readBody(request)) ?? {};
    if (!isIntOrNull(b.started_ml, 0, 2000)) return badRequest('bad started_ml');
    const started_at = isStr(b.started_at, 10) ? b.started_at : nowSec();
    const row = {
      started_at,
      started_ml: b.started_ml ?? null,
      logged_by: getWho(request),
      created_at: nowSec(),
    };
    await env.POSSUMS_KV.put(BOTTLE_TIMER_KEY, JSON.stringify(row));
    return json(row, { status: 201 });
  }
  if (action === 'end' && request.method === 'POST') {
    const existing = await readBottleTimer(env);
    if (!existing) return json({ error: 'no bottle timer running' }, { status: 409 });
    const b = (await readBody(request)) ?? {};
    if (!isIntOrNull(b.amount_ml, 0, 2000)) return badRequest('bad amount_ml');
    if (!isStrOrNull(b.notes, 500)) return badRequest('bad notes');
    const ended_at = nowSec();
    const duration_seconds = Math.max(
      0,
      Math.floor((new Date(ended_at).getTime() - new Date(existing.started_at).getTime()) / 1000),
    );
    const feeds = await readList(env, 'feeds');
    const row = {
      id: nextId(feeds),
      started_at: existing.started_at,
      kind: 'bottle',
      amount_ml: b.amount_ml ?? null,
      started_ml: existing.started_ml ?? null,
      duration_seconds,
      notes: b.notes ?? null,
      logged_by: getWho(request) ?? existing.logged_by ?? null,
      created_at: nowSec(),
    };
    feeds.push(row);
    await writeList(env, 'feeds', feeds);
    await env.POSSUMS_KV.delete(BOTTLE_TIMER_KEY);
    return json(row, { status: 201 });
  }
  if (action === 'cancel' && request.method === 'POST') {
    await env.POSSUMS_KV.delete(BOTTLE_TIMER_KEY);
    return new Response(null, { status: 204 });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function handleParents(request, env) {
  if (request.method === 'GET') {
    return json(await readParents(env));
  }
  if (request.method === 'PUT') {
    const b = await readBody(request);
    if (!b) return badRequest('json required');
    if (!isStr(b.parent1, 1, 60) || !isStr(b.parent2, 1, 60)) return badRequest('parent1 and parent2 names required (max 60 chars)');
    const next = { parent1: b.parent1.trim(), parent2: b.parent2.trim() };
    if (!next.parent1 || !next.parent2) return badRequest('names cannot be blank');
    await writeParents(env, next);
    return json(next);
  }
  return new Response('Method not allowed', { status: 405 });
}

async function handleMe(request, env) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const who = getWho(request);
  const parents = await readParents(env);
  return json({ who, name: who ? parents[who] : null, parents });
}

async function handleApi(request, url, env) {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[1] === 'health') return json({ ok: true, db: 'kv' });
  if (parts[1] === 'parents') return handleParents(request, env);
  if (parts[1] === 'me') return handleMe(request, env);
  if (parts[1] === 'auth' && parts[2] === 'password') return handleChangePassword(request, env);
  if (parts[1] === 'bottle-timer') return handleBottleTimer(request, env, parts[2]);
  if (simple[parts[1]]) return handleSimple(parts[1], request, url, env, parts[2]);
  if (TIMED_PATHS[parts[1]]) return handleTimed(TIMED_PATHS[parts[1]], request, url, env, parts[2], parts[3]);
  return json({ error: 'not found' }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/setup') return handleSetup(request, env, url);

    if (await isSetupNeeded(env)) {
      if (url.pathname.startsWith('/api/')) {
        return json({ error: 'setup required', setup: true }, { status: 401 });
      }
      if (url.pathname === '/styles.css' || url.pathname === '/favicon.ico' || url.pathname === '/favicon.svg') {
        return env.ASSETS.fetch(request);
      }
      return new Response(null, { status: 302, headers: { Location: '/setup' } });
    }

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
