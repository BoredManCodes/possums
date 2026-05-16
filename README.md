# Possums

Self-hosted baby tracker that runs on Cloudflare Workers + KV. Logs feeds, nappies, sleep, pumping, meds, growth, baths, tummy time, and milestones. Designed for two parents — every entry is attributed to whoever logged it.

## What it does

- **Today** view — live timers, today's stats, today's events at a glance.
- **Sleep** view — start/stop the current nap, edit recent ones.
- **History** — chronological list of everything.
- **+** sheet — quick-add for every activity type.
- **Two-parent identity** — sign in with your name + a shared password; each record is tagged with `by <name>` in the UI.

## Stack

- **Worker** (`worker.js`) — single CF Worker handling auth, API, and serving static assets.
- **KV** (`POSSUMS_KV` binding) — every entity (`feeds`, `nappies`, `naps`, …) is one JSON list. Config lives under `config:*` keys.
- **Frontend** (`public/`) — vanilla ES module SPA, no build step.

## Deploy

You need a Cloudflare account, `node`, and `npx wrangler` (`npm install` will pull it in).

```sh
git clone https://github.com/BoredManCodes/possums.git
cd possums
npm install
```

Create a KV namespace:

```sh
npx wrangler kv namespace create POSSUMS_KV
```

Wrangler prints an id. The id is referenced from `wrangler.toml` as `$POSSUMS_KV_ID`, so put it in a local `.env` (gitignored) or your shell:

```sh
echo 'POSSUMS_KV_ID=<paste the id here>' >> .env
```

Then deploy:

```sh
npx wrangler deploy
```

Wrangler reads `.env` automatically and substitutes the id at deploy time.

Open the URL Wrangler prints. You'll be sent to `/setup` — enter both parent names and pick a password. The wizard generates a session secret, hashes the password (PBKDF2-SHA256, 100k iters, random salt), writes everything to KV, and signs you in. No env vars or dashboard config required.

## First-run setup wizard

The Worker treats the install as "unconfigured" when neither `config:auth` exists in KV nor `PASSWORD` is set as an env var. In that state every request redirects to `/setup`. After you submit the form, future visits go straight to `/login`.

To force a fresh setup later (e.g. you forgot the password), delete the `config:auth` KV key:

```sh
npx wrangler kv key delete --binding=POSSUMS_KV "config:auth"
```

## Local dev

```sh
npm run dev
```

Wrangler runs the Worker locally with a preview KV namespace. The setup wizard works the same way; data is isolated from production.

## Auth model

- **Password** — PBKDF2-SHA256 hash with a per-install random salt, stored in KV under `config:auth`. Legacy plaintext fallback: `env.PASSWORD` (only used if KV auth isn't set).
- **Session** — HMAC-SHA256-signed cookie (`possums_session`). The signing key (`config:session_secret`) is generated at setup time, 32 random bytes. Legacy fallback: `env.SESSION_SECRET`.
- **Identity** — a second cookie (`possums_who=parent1|parent2`) records which parent you signed in as. New records get a `logged_by` field stamped from it.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS. 30-day max age.

There is no rate-limit on `/login`. Pick a strong password — when the Worker is reachable on a public URL anyone can probe it. For extra defence add a Cloudflare WAF rule or Turnstile in front of `POST /login`.

## API

All endpoints sit under `/api/*` and require a valid session.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | liveness probe |
| `GET` `PUT` | `/api/parents` | read / rename parent labels |
| `GET` | `/api/me` | who am I + current parent names |
| `POST` | `/api/auth/password` | change password (`{current, next}`) |
| `GET` `POST` | `/api/feeds` | list / create |
| `DELETE` | `/api/feeds/:id` | delete |
| `GET` `POST` | `/api/nappies` | list / create — `kind` is `wet`, `dirty`, or `both` |
| `DELETE` | `/api/nappies/:id` | delete |
| `GET` `POST` | `/api/naps` | list / create |
| `GET` | `/api/naps/current` | currently in-progress nap |
| `PATCH` `DELETE` | `/api/naps/:id` | edit / delete |
| `POST` | `/api/naps/:id/end` | end an in-progress nap |
| `GET` `POST` `DELETE` | `/api/pumps` `/api/pumps/:id` | + `/api/pumps/current`, `/api/pumps/:id/end` |
| `GET` `POST` `DELETE` | `/api/tummy-times` | + `/current` and `/:id/end` |
| `GET` `POST` `DELETE` | `/api/meds` `/api/growths` `/api/baths` `/api/milestones` | flat entities |

All `POST` endpoints stamp `logged_by: "parent1" | "parent2" | null` on the new record using the `possums_who` cookie.

## Repo layout

```
worker.js          Worker entrypoint — auth, API, asset proxy
wrangler.toml      Worker config + KV binding + static assets binding
package.json       Wrangler as the only dependency
public/
  index.html       SPA shell
  app.js           SPA logic
  styles.css       Styling
```

## License

No license declared — treat as all rights reserved unless you add one.
