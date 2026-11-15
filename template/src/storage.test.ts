import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createUnimplementedLocalStore, PLANNED_STORAGE_KEYS } from "./storage.ts";
import { parseStudySpecJson } from "./validate.ts";

test("storage keys are reserved and the store does not pretend to save", () => {
  assert.deepEqual(PLANNED_STORAGE_KEYS, {
    homework: "studyspec.homework.v1",
    examReview: "studyspec.exam-review.v1",
  });
  const json = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/homework.sample.json"),
    "utf8",
  );
  const parsed = parseStudySpecJson(json);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const store = createUnimplementedLocalStore();
  const loaded = store.load(PLANNED_STORAGE_KEYS.homework);
  const saved = store.save(PLANNED_STORAGE_KEYS.examReview, parsed.document);
  assert.equal(loaded.ok, false);
  assert.equal(saved.ok, false);
  if (!loaded.ok) assert.equal(loaded.error.code, "not-implemented");
  if (!saved.ok) assert.equal(saved.error.code, "not-implemented");
});
