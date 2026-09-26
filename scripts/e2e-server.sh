#!/usr/bin/env bash
# Builds the site and serves the production bundle on :8787 with a fresh local
# D1 database, for Playwright. Uses the same wrangler flow as a real deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

state_dir=.wrangler/e2e-state
rm -rf "$state_dir"

# --env-file must be absolute: wrangler resolves it against the config folder.
# Migrations read wrangler.jsonc at the root; the dev server below reads the
# built config. Both share one database because they share --persist-to.
CI=1 npx wrangler d1 migrations apply DB --local --persist-to "$state_dir"
# Test staff accounts (owner/editor/sales) for the admin tests.
npx tsx tests/e2e/seed-users.ts > "$state_dir/users.sql"
npx wrangler d1 execute DB --local --persist-to "$state_dir" --file "$state_dir/users.sql"
# The demo catalog has no prices; give two products one so the store can be tested.
npx wrangler d1 execute DB --local --persist-to "$state_dir" --command \
  "UPDATE products SET price_minor = 8950 WHERE slug = 'hp-w2031a'; UPDATE products SET price_minor = 4500 WHERE slug = 'navigator-a4-80-gsm';"
node scripts/run-framework.mjs build
exec npx wrangler dev --config dist/server/wrangler.json --local \
  --persist-to "$state_dir" --env-file "$PWD/tests/e2e/e2e.vars" \
  --ip 127.0.0.1 --port 8787 --inspector-port 0 --show-interactive-dev-session=false
