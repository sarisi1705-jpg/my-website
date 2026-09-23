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

function extractOutputText(response) {
  if (response.output_text) return response.output_text;
  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

async function askAI(env, userText) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      max_output_tokens: 700,
      instructions:
        "أنت AL Sarisi Agent، مساعد عملي مختصر يتواصل بالعربية بشكل طبيعي. " +
        "هذه النسخة للتجربة. لا تدّعي تنفيذ تغييرات على GitHub أو Cloudflare ما لم يتم تنفيذها فعليًا. " +
        "إذا طلب المستخدم تعديلًا على الموقع، اشرح باختصار ما فهمته واطلب منه استخدام الأوامر المتاحة عند الحاجة. " +
        "لا تعرض أو تطلب الأسرار أو كلمات المرور أو مفاتيح API.",
      input: userText,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI API failed: ${res.status}`;
    throw new Error(msg);
  }

  return extractOutputText(data) || "ما قدرت أطلع رد واضح. جرّب صياغة ثانية.";
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

    try {
      if (text === "/start") {
        await sendMessage(
          env,
          chatId,
          "أهلًا بك في AL Sarisi Agent 🤖\n\n✅ Telegram مربوط\n✅ GitHub مربوط\n✅ AI مربوط\n\nالأوامر: /status و /repo\nأو ابعتلي رسالة عادية بالعربي."
        );
        return json({ ok: true });
      }

      if (text === "/status") {
        const gh = env.GITHUB_TOKEN ? "✅ GitHub" : "❌ GitHub";
        const ai = env.OPENAI_API_KEY ? "✅ AI" : "❌ AI";
        await sendMessage(env, chatId, `✅ Telegram Worker شغال\n${gh}\n${ai}`);
        return json({ ok: true });
      }

      if (text === "/repo") {
        const repo = await github(env, `/repos/${REPO}`);
        const commits = await github(env, `/repos/${REPO}/commits?per_page=1`);
        const latest = commits?.[0];
        await sendMessage(
          env,
          chatId,
          `📦 ${repo.full_name}\n🌿 الفرع: ${repo.default_branch}\n📝 آخر commit: ${latest?.commit?.message || "غير معروف"}`
        );
        return json({ ok: true });
      }

      const answer = await askAI(env, text || "مرحبا");
      await sendMessage(env, chatId, answer.slice(0, 3900));
      return json({ ok: true });
    } catch (error) {
      await sendMessage(env, chatId, `❌ صار خطأ: ${error?.message || "Unknown error"}`);
      return json({ ok: true });
    }
  },
};
