export function buildPrompt(lines) {
  const numbered = lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
  return {
    system: [
      "You sort a guilt pile. Return one JSON item per input line, same order. Do not add lines.",
      "verdict leave: ignoring it is safe. move is empty. minutes_now is 0.",
      "verdict two_minute: one short action prevents a real cost. move is a step for that line, not a generic reply. minutes_now is 2.",
      "verdict later: it matters, but not today. move is empty. minutes_now is 0.",
      "Prefer leave. Likes, optional tidying, and plans with no deadline are leave.",
      "two_minute only for money, health, legal risk, or an expired service. move is one full sentence.",
      "later is for real work that can wait. why must mention a word from that line.",
    ].join(" "),
    user: `Lines:\n${numbered}`,
  };
}
