# SSPS — حلول لأنظمة الحلول والطباعة

Arabic (RTL) product catalog for SSPS: printers, inks and toners, maintenance parts and printing supplies, with quote and service requests.

- **Stack:** [vinext](https://github.com/cloudflare/vinext) (the Next.js App Router API on Vite), React 19, Tailwind CSS 4, shadcn/ui.
- **Hosting:** Cloudflare Workers, using D1 (SQLite) for data and R2 for product images.
- **Live site:** https://my-website.sarisi1705.workers.dev

## Getting started

You need Node.js 22.13 or newer. pnpm is pinned to 11.25.0 and runs through `npx` when it isn't installed globally.

```bash
npx pnpm@11.25.0 install
cp .dev.vars.example .dev.vars        # local secrets (test values work out of the box)
npx pnpm@11.25.0 db:migrate:local     # create the local database, with the demo catalog
npx pnpm@11.25.0 dev                  # http://localhost:5173
```

The commands below use the short `pnpm …` form. Prefix them with `npx pnpm@11.25.0` if pnpm isn't installed (`npm i -g pnpm@11.25.0`).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with the local D1/R2 bindings from `wrangler.jsonc` |
| `pnpm build` | Production build into `dist/` |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm test` | Unit tests plus database tests (Vitest, in-memory D1) |
| `pnpm test:e2e` | Browser tests (Playwright) against a production build with a fresh database |
| `pnpm db:generate` | Create a migration in `drizzle/` after editing `db/schema.ts` |
| `pnpm db:migrate:local` / `db:migrate:remote` | Apply migrations to the local or production database |
| `pnpm cf-typegen` | Regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` or `.dev.vars` |
| `pnpm deploy` | Migrate the production database, build, deploy |
| `pnpm admin:create-owner --local` / `--remote` | Create an owner account, or recover one (resets its password and unlocks it) |

## Where things live

| What | Where |
|---|---|
| Products, categories, brands | The D1 database (`db/schema.ts`). The demo catalog comes from `drizzle/0002_seed.sql` |
| Contact details, homepage stats, offers, hero slides | `lib/site-config.ts` |
| Colours and layout | `app/globals.css` |
| Public pages | `app/(site)/` (the shared header and footer are in `app/(site)/layout.tsx`) |
| API endpoints | `app/api/` |
| Data access and server logic | `lib/server/` (functions take a `db` argument so tests can pass their own) |
| Validation shared by forms and the API | `lib/validation/` |
| Bindings, vars, rate limits | `wrangler.jsonc` |

## Admin panel

`/admin` is where staff manage the site. Sign-in is email + password (PBKDF2 hashing, database-backed sessions, and a 15-minute lockout after 5 wrong passwords).

| Role | Can |
|---|---|
| المالك (owner) | Everything, including staff accounts, permanent deletes and the audit log |
| محرر المحتوى (editor) | Products, photos, categories, brands |
| المبيعات (sales) | Quote/contact requests: follow up, assign, add notes, export CSV |

New staff get a temporary password and must choose their own at first sign-in. Every change is recorded in سجل النشاط (the audit log). To create the first owner locally:

```bash
pnpm db:migrate:local
pnpm admin:create-owner --local
```

## API

All responses have the shape `{ data }` or `{ error: { code, message, fieldErrors? } }`.

| Endpoint | Purpose |
|---|---|
| `GET /api/products?q=&category=&brand=&featured=&sort=&page=&pageSize=` | Paginated catalog. Search handles Arabic spelling variants |
| `GET /api/products/:slug` | One published product |
| `GET /api/categories` | Active categories with product counts |
| `GET /api/brands` | Active brands |
| `POST /api/inquiries` | Quote, service or contact request. Protected by Turnstile, a rate limit and a honeypot field. Staff get a Telegram alert |
| `GET /api/images/products/:file` | Product images from R2 (cached forever; keys are unique) |
| `/api/admin/*` | Admin endpoints: auth, stats, inquiries (+ CSV export), products, uploads, categories, brands, users, audit. Each needs a session with the right role; changes also need a same-origin request |

## Secrets

Local secrets go in `.dev.vars` (gitignored; see `.dev.vars.example`). Production secrets are set once per secret:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put IP_HASH_SALT
```

`TURNSTILE_SITE_KEY` and `PUBLIC_SITE_URL` are public values in `wrangler.jsonc` → `vars`.

## Deploying

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for first-time setup (database, bucket, Turnstile, Telegram), backups, rollback and account recovery.

```bash
npx wrangler login     # once
pnpm deploy            # remote migrations, then build, then wrangler deploy
```

Migrations only ever add things, so they run before the new code ships. GitHub Actions runs lint, the type check and all tests on every push (`.github/workflows/ci.yml`). Automatic deploys (`deploy.yml`) stay off until the repository variable `DEPLOY_ENABLED=true` and the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set.

## Notes

- Internal links are plain `<a>` elements on purpose. vinext 1.0.0-beta.5's `<Link>` fails on click in production builds. Revisit after upgrading vinext.
- D1 doesn't support `BEGIN`/`COMMIT`, so use `db.batch([...])` instead of `db.transaction()`. When joined tables share column names (`slug`, `name`), prefer separate queries: batch results are keyed by column name and those columns collide.
