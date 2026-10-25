import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parsePile } from "../src/pile.js";
import { createApp, resolvePublic } from "../src/server.js";
import { createStore } from "../src/store.js";

async function start(decide) {
  const dir = await mkdtemp(path.join(tmpdir(), "leave-it-"));
  const store = createStore(path.join(dir, "history.json"));
  const app = createApp({
    decide,
    store,
    health: async () => ({ ok: true, model: "test" }),
    publicRoot: path.join(import.meta.dirname, "..", "src", "public"),
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const { port } = app.address();
  return { app, base: `http://127.0.0.1:${port}` };
}

test("POST /api/decide stores a run and rejects an empty pile", async () => {
  const { app, base } = await start(async (text) => {
    const lines = parsePile(text);
    return {
      model: "gemma3:1b",
      items: lines.map((line) => ({
        text: line,
        verdict: "leave",
        why: "Noise.",
        move: "",
        minutes_proper: 10,
        minutes_now: 0,
        guarded: false,
      })),
      leave: lines.length,
      two_minute: 0,
      later: 0,
      minutes_saved: 10 * lines.length,
    };
  });
  try {
    const bad = await fetch(`${base}/api/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    });
    assert.equal(bad.status, 400);
    const ok = await fetch(`${base}/api/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Like posts" }),
    });
    assert.equal(ok.status, 200);
    const run = await ok.json();
    assert.equal(run.minutes_saved, 10);
    const history = await fetch(`${base}/api/history`);
    const rows = await history.json();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, run.id);
  } finally {
    app.close();
  }
});

test("public paths cannot escape the public directory", () => {
  const root = path.join(import.meta.dirname, "..", "src", "public");
  assert.equal(resolvePublic(root, "../server.js"), null);
  assert.equal(resolvePublic(root, "/../../package.json"), null);
  assert.match(resolvePublic(root, "/"), /index\.html$/);
});

test("the home page is served", async () => {
  const { app, base } = await start(async () => {
    throw new Error("should not run");
  });
  try {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Leave It/);
    const missing = await fetch(`${base}/missing.css`);
    assert.equal(missing.status, 404);
  } finally {
    app.close();
  }
});
