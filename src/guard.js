const URGENT =
  /\b(due today|due tomorrow|asap|emergency|overdue|court|eviction|hospital|invoice|expired|unpaid|landlord|leak)\b/i;

export function applyGuardrail(text, decision) {
  if (decision.verdict === "two_minute" || !URGENT.test(text)) {
    return { ...decision, guarded: false };
  }
  return {
    ...decision,
    verdict: "two_minute",
    guarded: true,
    why: clipWhy(`Looks urgent, so this cannot be left. ${decision.why}`),
    move: decision.move.trim() || usableWhy(decision.why),
    minutes_now: decision.minutes_now > 0 ? decision.minutes_now : 2,
  };
}

function usableWhy(why) {
  if (!why || why === "No reason given.") return "Do the smallest version of this today.";
  return why;
}

function clipWhy(value) {
  return value.length > 280 ? `${value.slice(0, 279)}…` : value;
}
