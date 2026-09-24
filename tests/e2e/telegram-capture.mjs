// Fake Telegram Bot API for end-to-end tests.
// POST /bot<token>/sendMessage records the message; GET /messages lists them.
import http from "node:http";

const messages = [];
http
  .createServer((request, response) => {
    if (request.method === "GET" && request.url === "/messages") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(messages));
      return;
    }
    let body = "";
    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
      if (request.method === "POST" && /^\/bot[^/]+\/sendMessage$/.test(request.url ?? "")) {
        messages.push(JSON.parse(body || "{}"));
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ ok: true, result: {} }));
        return;
      }
      response.statusCode = 404;
      response.end();
    });
  })
  .listen(8799, "127.0.0.1");
