import { decisionSchemaFor } from "./schema.js";

export function ollamaConfig(env = process.env) {
  return {
    host: env.OLLAMA_HOST || "http://127.0.0.1:11434",
    model: env.OLLAMA_MODEL || "gemma3:4b",
    timeoutMs: Number(env.OLLAMA_TIMEOUT_MS || 300000),
  };
}

export async function chatJson({ host, model, timeoutMs, system, user, itemCount, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: decisionSchemaFor(itemCount),
        options: { temperature: 0, num_predict: 700 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama returned ${response.status}: ${detail.slice(0, 300)}`);
    }
    const body = await response.json();
    const content = body?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Ollama response had no message content.");
    }
    return content;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Model took longer than ${timeoutMs}ms.`);
    }
    if (error?.cause?.code === "ECONNREFUSED" || error?.message?.includes("fetch failed")) {
      throw new Error("Ollama is not running. Start it, then pull the model named in the README.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkOllama({ host, model, fetchImpl = fetch }) {
  try {
    const response = await fetchImpl(`${host}/api/tags`);
    if (!response.ok) return { ok: false, model, error: `Ollama returned ${response.status}` };
    const body = await response.json();
    const names = (body.models || []).map((entry) => entry.name);
    const hasModel = names.some((name) => name === model || name.startsWith(`${model}`));
    return { ok: hasModel, model, installed: names, error: hasModel ? null : `Model ${model} is not pulled.` };
  } catch {
    return { ok: false, model, installed: [], error: "Ollama is not running." };
  }
}
