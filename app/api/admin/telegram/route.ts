import { env } from "cloudflare:workers";
import { adminRoute } from "@/lib/server/admin-route";
import { jsonData } from "@/lib/server/http";
import { getBotStatus } from "@/lib/server/telegram-setup";

export const GET = adminRoute("settings.manage", async () => jsonData(await getBotStatus(env)));
