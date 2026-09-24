// Fake Telegram Bot API for end-to-end tests.
// POST /bot<token>/<method> records the call; GET /messages lists sendMessage
// bodies and GET /calls lists every call as { method, body }.
import http from "node:http";

const calls = [];
const results = {
  getMe: { id: 1, is_bot: true, first_name: "SSPS", username: "ssps_test_bot" },
  getWebhookInfo: { url: "", pending_update_count: 0 },
};

http
  .createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.method === "GET" && request.url === "/messages") {
      response.end(JSON.stringify(calls.filter(call => call.method === "sendMessage").map(call => call.body)));
      return;
    }
    if (request.method === "GET" && request.url === "/calls") {
      response.end(JSON.stringify(calls));
      return;
    }
    let body = "";
    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
      const match = /^\/bot[^/]+\/([A-Za-z]+)$/.exec(request.url ?? "");
      if (request.method === "POST" && match) {
        calls.push({ method: match[1], body: JSON.parse(body || "{}") });
        response.end(JSON.stringify({ ok: true, result: results[match[1]] ?? true }));
        return;
      }
      response.statusCode = 404;
      response.end("{}");
    });
  })
  .listen(8799, "127.0.0.1");
