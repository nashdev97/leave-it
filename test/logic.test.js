import assert from "node:assert/strict";
import test from "node:test";
import { applyGuardrail } from "../src/guard.js";
import { assertGrounded, extractJson, normalizeDecisions } from "../src/parse.js";
import { parsePile } from "../src/pile.js";
import { buildPrompt } from "../src/prompt.js";
import { minutesSaved, tally } from "../src/score.js";

test("parsePile rejects an empty pile and a huge line", () => {
  assert.throws(() => parsePile(" \n "), /at least one line/);
  assert.throws(() => parsePile("x".repeat(501)), /500 characters/);
  assert.deepEqual(parsePile(" one \n\n two "), ["one", "two"]);
});

test("extractJson accepts fenced JSON and leading prose", () => {
  assert.deepEqual(extractJson('Sure\n```json\n{"items":[]}\n```'), { items: [] });
  assert.deepEqual(extractJson('note {"ok":true}'), { ok: true });
});

test("normalizeDecisions fills missing rows and rejects unknown verdicts as later", () => {
  const items = normalizeDecisions(
    { items: [{ verdict: "fly", why: "no", move: "go", minutes_proper: 400, minutes_now: 9 }] },
    ["alpha", "beta"],
  );
  assert.equal(items[0].verdict, "later");
  assert.equal(items[0].minutes_proper, 90);
  assert.equal(items[0].move, "");
  assert.equal(items[1].filled_in, true);
  assert.equal(items[1].verdict, "later");
});

test("guardrail promotes urgent leave decisions", () => {
  const kept = applyGuardrail("Like 40 posts", {
    text: "Like 40 posts",
    verdict: "leave",
    why: "Noise.",
    move: "",
    minutes_proper: 10,
    minutes_now: 0,
  });
  assert.equal(kept.guarded, false);
  const promoted = applyGuardrail("The invoice is overdue", {
    text: "The invoice is overdue",
    verdict: "leave",
    why: "Paperwork.",
    move: "",
    minutes_proper: 20,
    minutes_now: 0,
  });
  assert.equal(promoted.verdict, "two_minute");
  assert.equal(promoted.guarded, true);
  const deferred = applyGuardrail("The invoice is overdue", {
    text: "The invoice is overdue",
    verdict: "later",
    why: "Tomorrow.",
    move: "",
    minutes_proper: 20,
    minutes_now: 0,
  });
  assert.equal(deferred.verdict, "two_minute");
  assert.equal(promoted.move, "Paperwork.");
  const leak = applyGuardrail("Send the landlord the leak photo from Tuesday", {
    text: "Send the landlord the leak photo from Tuesday",
    verdict: "later",
    why: "Forward the leak photo.",
    move: "",
    minutes_proper: 10,
    minutes_now: 0,
  });
  assert.equal(leak.verdict, "two_minute");
  assert.equal(leak.guarded, true);
});

test("later does not count as time saved", () => {
  const items = [
    { verdict: "leave", minutes_proper: 30, minutes_now: 0 },
    { verdict: "two_minute", minutes_proper: 25, minutes_now: 2 },
    { verdict: "later", minutes_proper: 40, minutes_now: 0 },
  ];
  assert.equal(minutesSaved(items), 53);
  assert.deepEqual(tally(items), { leave: 1, two_minute: 1, later: 1, minutes_saved: 53 });
});

test("reasons must mention the line", () => {
  assert.throws(
    () =>
      assertGrounded([
        { text: "Organize the downloads folder", why: "it matters, but not today.", move: "" },
      ]),
    /downloads folder/,
  );
  assert.throws(
    () =>
      assertGrounded([
        { text: "Organize the downloads folder", why: "organize the downloads folder", move: "" },
      ]),
    /other words/,
  );
  assert.doesNotThrow(() =>
    assertGrounded([
      { text: "Organize the downloads folder", why: "The downloads folder can wait.", move: "" },
    ]),
  );
});

test("prompt keeps line order", () => {
  const prompt = buildPrompt(["first", "second"]);
  assert.match(prompt.user, /1\. first\n2\. second/);
  assert.match(prompt.system, /Prefer leave/);
  assert.doesNotMatch(prompt.system, /No cost if ignored/);
});
