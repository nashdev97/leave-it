import { applyGuardrail } from "./guard.js";
import { chatJson, ollamaConfig } from "./ollama.js";
import { assertGrounded, extractJson, normalizeDecisions } from "./parse.js";
import { parsePile } from "./pile.js";
import { buildPrompt } from "./prompt.js";
import { tally } from "./score.js";

function requireComplete(decisions) {
  const missing = decisions.filter((item) => item.filled_in).length;
  if (missing > 0) {
    throw new Error(`Model skipped ${missing} lines.`);
  }
  return assertGrounded(decisions);
}

export async function decidePile(text, deps = {}) {
  const lines = parsePile(text);
  const config = deps.config || ollamaConfig();
  const chat = deps.chatJson || chatJson;
  const prompt = buildPrompt(lines);
  let raw = await chat({ ...config, ...prompt, itemCount: lines.length, fetchImpl: deps.fetchImpl });
  let decisions;
  try {
    decisions = requireComplete(normalizeDecisions(extractJson(raw), lines));
  } catch (error) {
    raw = await chat({
      ...config,
      system: "Return only JSON matching the schema. Repair the previous answer.",
      user: `Lines:\n${lines.map((line, index) => `${index + 1}. ${line}`).join("\n")}\n\nBroken answer:\n${raw}\n\nError: ${error.message}`,
      itemCount: lines.length,
      fetchImpl: deps.fetchImpl,
    });
    decisions = requireComplete(normalizeDecisions(extractJson(raw), lines));
  }
  const items = decisions.map((decision) => applyGuardrail(decision.text, decision));
  return {
    model: config.model,
    items,
    ...tally(items),
  };
}
