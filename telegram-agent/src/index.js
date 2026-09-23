const REPO = "sarisi1705-jpg/my-website";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function telegram(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Telegram API ${method} failed: ${res.status}`);
  return res.json();
}

async function sendMessage(env, chatId, text) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
  });
}

async function github(env, path) {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not configured");
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "AL-Sarisi-Agent",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API failed: ${res.status}`);
  return res.json();
}

function isOwner(env, chatId) {
  if (!env.OWNER_CHAT_ID) return true;
  return String(chatId) === String(env.OWNER_CHAT_ID);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "AL Sarisi Telegram Agent" });
    }

    if (url.pathname === "/setup-webhook" && request.method === "POST") {
      if (!env.SETUP_KEY || request.headers.get("x-setup-key") !== env.SETUP_KEY) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      const webhookUrl = `${url.origin}/telegram`;
      const result = await telegram(env, "setWebhook", {
        url: webhookUrl,
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message"],
      });

      return json({ ok: true, webhookUrl, telegram: result });
    }

    if (url.pathname !== "/telegram" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    if (
      env.TELEGRAM_WEBHOOK_SECRET &&
      request.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    const update = await request.json();
    const message = update?.message;
    if (!message?.chat?.id) return json({ ok: true });

    const chatId = message.chat.id;
    const text = String(message.text || "").trim();

    if (!isOwner(env, chatId)) {
      await sendMessage(env, chatId, "هذا البوت خاص.");
      return json({ ok: true });
    }

    if (text === "/start") {
      const ownerHint = env.OWNER_CHAT_ID
        ? "تم التعرف عليك كمالك البوت ✅"
        : `Chat ID الخاص بك هو: ${chatId}\nسنثبّته كمالك في الخطوة التالية.`;

      await sendMessage(
        env,
        chatId,
        `أهلًا بك في AL Sarisi Agent 🤖\n\n${ownerHint}\n\nالنسخة الأولى متصلة بتيليجرام. الخطوة التالية: GitHub + AI + أوامر الموقع.`
      );
      return json({ ok: true });
    }

    if (text === "/status") {
      await sendMessage(env, chatId, "✅ Telegram Worker شغال.\n⏳ GitHub وAI لسه بنربطهم بالخطوة الجاية.");
      return json({ ok: true });
    }

    await sendMessage(
      env,
      chatId,
      `وصلتني رسالتك:\n${text || "(رسالة بدون نص)"}\n\nحاليًا أنا نسخة الاتصال الأولى فقط. قريبًا رح أنفذ مهام GitHub والموقع.`
    );

    return json({ ok: true });
  },
};
