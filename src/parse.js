const VERDICTS = new Set(["leave", "two_minute", "later"]);

export function extractJson(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error("Model returned an empty response.");
  }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.search(/[{[]/);
  if (start === -1) {
    throw new Error("Model response had no JSON.");
  }
  const slice = candidate.slice(start).trim();
  return JSON.parse(slice);
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function clip(value, max) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function normalizeDecisions(parsed, lines) {
  const items = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(items)) {
    throw new Error("Model JSON had no items array.");
  }
  return lines.map((text, index) => {
    const item = items[index] ?? {};
    const verdict = VERDICTS.has(item.verdict) ? item.verdict : "later";
    const minutesProper = clampInt(item.minutes_proper, 1, 90, 15);
    const minutesNow =
      verdict === "two_minute" ? clampInt(item.minutes_now, 1, 15, 2) : 0;
    return {
      text,
      verdict,
      why: clip(item.why, 280) || "No reason given.",
      move: verdict === "two_minute" ? clip(item.move, 300) : "",
      minutes_proper: minutesProper,
      minutes_now: minutesNow,
      filled_in: items[index] == null,
    };
  });
}

export function assertGrounded(decisions) {
  for (const item of decisions) {
    const words = item.text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
    const haystack = `${item.why} ${item.move}`.toLowerCase();
    const grounded = words.some((word) => haystack.includes(word));
    const echo = item.why.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === item.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (item.verdict === "two_minute" && !item.move.includes(" ")) {
      throw new Error(`Move for "${item.text}" must be a full step, not a single word.`);
    }
    if (!grounded || echo) {
      throw new Error(`Reason for "${item.text}" must explain that line in other words.`);
    }
  }
  return decisions;
}
