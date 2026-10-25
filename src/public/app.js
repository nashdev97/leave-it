const sample = [
  "Reply to Priya about Saturday dinner",
  "Renew the domain that expired last month",
  "Like 40 posts in the group chat",
  "Send the landlord the leak photo from Tuesday",
  "Organize the downloads folder",
].join("\n");

const form = document.querySelector("#pile-form");
const pile = document.querySelector("#pile");
const status = document.querySelector("#status");
const sortButton = document.querySelector("#sort");
const result = document.querySelector("#result");
const items = document.querySelector("#items");
const history = document.querySelector("#history");

document.querySelector("#sample").addEventListener("click", () => {
  pile.value = sample;
  setStatus("");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Sorting on this computer. The 4B model can take a few minutes.", false);
  sortButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  try {
    const response = await fetch("/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pile.value }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Sort failed.");
    renderResult(body);
    setStatus("");
    await loadHistory();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    sortButton.disabled = false;
    form.removeAttribute("aria-busy");
  }
});

function setStatus(message, isError) {
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError) && message !== "");
}

function renderResult(run) {
  result.hidden = false;
  document.querySelector("#waiting").textContent = String(run.leave + run.later);
  document.querySelector("#counts").textContent =
    `${run.leave} left alone, ${run.two_minute} to do in two minutes, ${run.later} for later. ${run.minutes_saved} minutes not spent. Later is not counted as time saved.`;
  items.replaceChildren(...run.items.map(card));
}

function card(item) {
  const li = document.createElement("li");
  li.className = `decision ${item.verdict}`;
  const kind = document.createElement("p");
  kind.className = "decision-kind";
  kind.textContent = label(item.verdict);
  const body = document.createElement("div");
  const title = document.createElement("p");
  title.className = "decision-text";
  title.textContent = item.text;
  const why = document.createElement("p");
  why.className = "decision-why";
  why.textContent = item.why;
  body.append(title, why);
  if (item.move) {
    const move = document.createElement("p");
    move.className = "decision-move";
    move.textContent = item.move;
    body.append(move);
  }
  const time = document.createElement("p");
  time.className = "decision-time";
  time.textContent = `${item.minutes_proper} min if you did it properly. ${item.minutes_now} min this way.`;
  body.append(time);
  li.append(kind, body);
  return li;
}

function label(verdict) {
  switch (verdict) {
    case "leave":
      return "Leave";
    case "two_minute":
      return "Two minutes";
    case "later":
      return "Later";
    default: {
      const unknown = verdict;
      return unknown;
    }
  }
}

async function loadHistory() {
  const response = await fetch("/api/history");
  const runs = await response.json();
  if (runs.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nothing sorted yet. Paste a list, or load the example.";
    history.replaceChildren(li);
    return;
  }
  history.replaceChildren(
    ...runs.slice(0, 8).map((run) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "past";
      const when = document.createElement("time");
      when.dateTime = run.created_at;
      when.textContent = new Date(run.created_at).toLocaleString();
      const meta = document.createElement("p");
      meta.textContent = `${run.items.length} lines, ${run.minutes_saved} minutes not spent, ${run.model}`;
      button.append(when, meta);
      button.addEventListener("click", () => {
        pile.value = run.items.map((item) => item.text).join("\n");
        renderResult(run);
        result.scrollIntoView({ block: "nearest" });
      });
      li.append(button);
      return li;
    }),
  );
}

loadHistory();
