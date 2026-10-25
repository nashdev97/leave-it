const MAX_LINES = 12;
const MAX_LINE = 500;

export function parsePile(text) {
  if (typeof text !== "string") {
    throw new Error("Paste the pile as text.");
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    throw new Error("Paste at least one line.");
  }
  if (lines.length > MAX_LINES) {
    throw new Error(`Keep it to ${MAX_LINES} lines. A bigger pile is a different chore.`);
  }
  for (const line of lines) {
    if (line.length > MAX_LINE) {
      throw new Error(`Each line must be ${MAX_LINE} characters or fewer.`);
    }
  }
  return lines;
}
