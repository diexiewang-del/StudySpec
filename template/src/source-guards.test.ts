import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const FORBIDDEN = [
  "Date.now",
  "Math.random",
  "crypto.randomUUID",
  "getTimezoneOffset",
  "localStorage",
  "sessionStorage",
  "performance.now",
];

test("shared production source does not read the clock, randomize, or touch browser storage", () => {
  const srcDir = dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(srcDir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
  assert.ok(files.includes("schedule.ts"));
  assert.ok(files.includes("storage.ts"));
  for (const name of files) {
    const text = readFileSync(join(srcDir, name), "utf8");
    for (const token of FORBIDDEN) {
      assert.equal(text.includes(token), false, `${name} contains ${token}`);
    }
  }
});
