import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, compareISODate, countDaysInclusive, eachDateInclusive, isISODate, weekdayLabel } from "./dates.ts";

test("accepts real calendar dates and rejects impossible ones", () => {
  assert.equal(isISODate("2026-11-09"), true);
  assert.equal(isISODate("2024-02-29"), true);
  assert.equal(isISODate("2026-02-29"), false);
  assert.equal(isISODate("2026-11-31"), false);
  assert.equal(isISODate("2026-13-01"), false);
  assert.equal(isISODate("26-11-09"), false);
  assert.equal(isISODate("2026-11-09T00:00:00Z"), false);
});

test("adds days across month and year boundaries", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("compares and lists inclusive calendar dates", () => {
  assert.equal(compareISODate("2026-11-09", "2026-11-10"), -1);
  assert.equal(compareISODate("2026-11-09", "2026-11-09"), 0);
  assert.deepEqual(eachDateInclusive("2026-11-09", "2026-11-11"), [
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
  ]);
  const longSpan = countDaysInclusive("2026-01-01", "2027-01-02");
  assert.ok(longSpan !== null && longSpan > 366);
});

test("weekday labels come from the UTC calendar day", () => {
  assert.equal(weekdayLabel("2026-11-09"), "周一");
  assert.equal(weekdayLabel("2026-11-12"), "周四");
});
