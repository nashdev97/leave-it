import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decidePile } from "./decide.js";
import { checkOllama, ollamaConfig } from "./ollama.js";
import { createStore } from "./store.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");
const MAX_BODY = 20_000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

export function createApp({ decide = decidePile, store, health, publicRoot = publicDir } = {}) {
  let busy = false;
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (req.method === "GET" && url.pathname === "/api/health") {
        const status = await health();
        return sendJson(res, status.ok ? 200 : 503, status);
      }
      if (req.method === "GET" && url.pathname === "/api/history") {
        return sendJson(res, 200, await store.read());
      }
      if (req.method === "POST" && url.pathname === "/api/decide") {
        if (busy) return sendJson(res, 429, { error: "A pile is already being sorted." });
        const body = await readBody(req);
        let payload;
        try {
          payload = JSON.parse(body);
        } catch {
          return sendJson(res, 400, { error: "Send JSON with a text field." });
        }
        busy = true;
        try {
          const result = await decide(payload?.text);
          const run = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...result };
          await store.append(run);
          return sendJson(res, 200, run);
        } finally {
          busy = false;
        }
      }
      if (req.method === "GET") {
        return serveStatic(res, publicRoot, url.pathname);
      }
      return sendJson(res, 405, { error: "Method not allowed." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      const status = /Paste|Keep it|characters|JSON|too large/.test(message) ? 400 : 502;
      return sendJson(res, status, { error: message });
    }
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Pile is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function resolvePublic(publicRoot, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const rootResolved = path.resolve(publicRoot);
  const filePath = path.resolve(rootResolved, requested);
  if (filePath !== rootResolved && !filePath.startsWith(`${rootResolved}${path.sep}`)) {
    return null;
  }
  return filePath;
}

async function serveStatic(res, publicRoot, pathname) {
  const filePath = resolvePublic(publicRoot, pathname);
  if (!filePath) return sendJson(res, 403, { error: "Forbidden." });
  try {
    await access(filePath);
  } catch {
    return sendJson(res, 404, { error: "Not found." });
  }
  const ext = path.extname(filePath);
  const type = TYPES[ext];
  if (!type) return sendJson(res, 404, { error: "Not found." });
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  createReadStream(filePath).pipe(res);
}

async function main() {
  const config = ollamaConfig();
  const store = createStore(path.join(root, "..", "data", "history.json"));
  const app = createApp({
    store,
    health: () => checkOllama(config),
  });
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || "127.0.0.1";
  app.listen(port, host, () => {
    console.log(`Leave It at http://${host}:${port} using ${config.model}`);
  });
}

const calledPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (calledPath === fileURLToPath(import.meta.url)) {
  main();
}
