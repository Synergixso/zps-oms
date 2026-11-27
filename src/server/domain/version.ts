import fs from "node:fs";
import path from "node:path";

/** The application version from package.json (read once at start-up). */
export const VERSION: string = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "package.json"), "utf8")).version as string;
  } catch {
    return "unknown";
  }
})();
