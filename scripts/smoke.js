import { decidePile } from "../src/decide.js";

const text = [
  "Reply to Priya about Saturday dinner",
  "Renew the domain that expired last month",
  "Like 40 posts in the group chat",
  "Organize the downloads folder",
].join("\n");

try {
  const result = await decidePile(text);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
