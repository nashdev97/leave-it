function minutesUsed(verdict, minutesNow) {
  switch (verdict) {
    case "leave":
    case "later":
      return 0;
    case "two_minute":
      return minutesNow;
    default: {
      const unknown = verdict;
      throw new Error(`Unknown verdict ${unknown}`);
    }
  }
}

export function minutesSaved(items) {
  return items.reduce((sum, item) => {
    if (item.verdict === "later") return sum;
    const used = minutesUsed(item.verdict, item.minutes_now);
    return sum + Math.max(0, item.minutes_proper - used);
  }, 0);
}

export function tally(items) {
  const counts = { leave: 0, two_minute: 0, later: 0 };
  for (const item of items) {
    switch (item.verdict) {
      case "leave":
      case "two_minute":
      case "later":
        counts[item.verdict] += 1;
        break;
      default: {
        const unknown = item.verdict;
        throw new Error(`Unknown verdict ${unknown}`);
      }
    }
  }
  return { ...counts, minutes_saved: minutesSaved(items) };
}
