# Operations runbook

Everything below runs from the project folder. Prefix `pnpm` with `npx pnpm@11.25.0` if pnpm isn't installed globally.

## First deployment (one time)

1. **Log in to Cloudflare:** `npx wrangler login`, then `npx wrangler whoami`.
   Confirm the existing `my-website` worker is on this account: `npx wrangler deployments list --name my-website`.
2. **Create the database** and put its id in `wrangler.jsonc` → `d1_databases[0].database_id`:
   ```bash
   npx wrangler d1 create ssps-db
   ```
3. **Create the image bucket.** R2 must be enabled in the dashboard first; the free tier may ask for a payment method.
   ```bash
   npx wrangler r2 bucket create ssps-images
   ```
4. **Turnstile:**
   - In the Cloudflare dashboard, open Turnstile → Add widget. Hostname: `my-website.sarisi1705.workers.dev`.
   - Put the **site key** in `wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY`. The **secret key** is set in step 5.
5. **Secrets:**
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN      # from @BotFather
   npx wrangler secret put TELEGRAM_CHAT_ID        # your chat or the staff group
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put IP_HASH_SALT            # any long random string, e.g. `openssl rand -hex 32`
   ```
   To find a chat ID, message the bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `chat.id`. Group IDs start with `-`.
6. **Deploy:** `pnpm deploy`. This runs the remote migrations, the build and `wrangler deploy`.
7. **Create the first owner:** `pnpm admin:create-owner --remote`, then sign in at `/admin/login`.

## Everyday tasks

| Task | How |
|---|---|
| Deploy a change | Push to `main` (when automatic deploys are enabled) or run `pnpm deploy` |
| Roll back the code | `npx wrangler rollback`. Migrations only add things, so older code still works with the newer database |
| Change the database | Edit `db/schema.ts` → `pnpm db:generate` → review the SQL in `drizzle/` → `pnpm db:migrate:local` → test → deploy |
| Rotate a secret | `npx wrangler secret put <NAME>`. It takes effect on the next request; no deploy needed |
| Add staff | Admin → الموظفون → إضافة موظف. Share the temporary password privately |
| Owner locked out or forgot password | `pnpm admin:create-owner --remote` with the same email. That resets the password, unlocks the account and makes it an active owner |
| Telegram alerts stopped | Check the secrets, then open an affected inquiry in the admin and press «إعادة إرسال التنبيه» |
| Watch logs | `npx wrangler tail`, or Workers → my-website → Logs in the dashboard |

## Backups and restore

- **Point-in-time restore (D1 Time Travel):** covers 7 days on the Free plan and 30 on Paid.
  ```bash
  npx wrangler d1 time-travel info ssps-db                                  # current bookmark
  npx wrangler d1 time-travel restore ssps-db --timestamp=2026-10-01T09:00:00Z
  ```
- **Offline copy (weekly is sensible):**
  ```bash
  npx wrangler d1 export ssps-db --remote --output backups/ssps-$(date +%F).sql
  ```
  Keep exports out of git: they contain customer names and phone numbers.
- **Product images (R2) are not versioned.** Deleting a product also deletes its photo.

## Things to know

- **Login and the CPU limit:** password checks cost about 13 ms of CPU by design, because that is what makes passwords hard to crack. The Workers Free plan allows 10 ms per request. If staff see error 1102 when signing in, switch the account to Workers Paid ($5/month). Lowering `PBKDF2_ITERATIONS` in `lib/auth/password.ts` is the fallback; existing passwords keep working either way.
- **Rate limits** are per Cloudflare location and approximate: 5 inquiries a minute and 10 login attempts a minute per IP. Accounts also lock for 15 minutes after 5 wrong passwords.
- **Transactions:** D1 has no `BEGIN`/`COMMIT`. Use `db.batch([...])` for writes that must succeed together.
- **The Telegram bot in `telegram-agent/` is a separate worker.** Redeploy it after changing its code. It now ignores everyone except `OWNER_CHAT_ID`, so make sure that variable is set.
