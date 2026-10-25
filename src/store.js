import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_RUNS = 50;

export function createStore(filePath) {
  return {
    async read() {
      try {
        const raw = await readFile(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
    },
    async append(run) {
      const history = await this.read();
      history.unshift(run);
      const trimmed = history.slice(0, MAX_RUNS);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(trimmed, null, 2));
      return trimmed;
    },
  };
}
