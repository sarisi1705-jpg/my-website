// Optional settings that `wrangler types` can't see because they are usually unset.
declare namespace Cloudflare {
  interface Env {
    /** Test-only: send Telegram calls to a fake Bot API instead of api.telegram.org. */
    TELEGRAM_API_BASE?: string;
  }
}
