import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSchedule, unscheduledReasonLabel } from "./schedule.ts";
import type { ScheduleResult, StudySpecDocument } from "./types.ts";
import { parseStudySpecJson } from "./validate.ts";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("homework sample matches the hand-calculated placement", () => {
  const schedule = scheduleOf(readFixture("homework.sample.json"));
  assert.deepEqual(
    schedule.days.map((day) => ({
      date: day.date,
      capacityMinutes: day.capacityMinutes,
      assignedMinutes: day.assignedMinutes,
      blocks: day.blocks.map((block) => [block.itemId, block.minutes]),
    })),
    [
      { date: "2026-11-09", capacityMinutes: 90, assignedMinutes: 90, blocks: [["hw-math-1", 90]] },
      {
        date: "2026-11-10",
        capacityMinutes: 90,
        assignedMinutes: 90,
        blocks: [
          ["hw-math-1", 30],
          ["hw-cs-1", 60],
        ],
      },
      { date: "2026-11-11", capacityMinutes: 90, assignedMinutes: 90, blocks: [["hw-cs-1", 90]] },
      { date: "2026-11-12", capacityMinutes: 0, assignedMinutes: 0, blocks: [] },
      { date: "2026-11-13", capacityMinutes: 90, assignedMinutes: 90, blocks: [["hw-cs-1", 90]] },
      { date: "2026-11-14", capacityMinutes: 90, assignedMinutes: 60, blocks: [["hw-eng-1", 60]] },
      { date: "2026-11-15", capacityMinutes: 90, assignedMinutes: 0, blocks: [] },
    ],
  );
  assert.deepEqual(schedule.unscheduled, [
    {
      itemId: "hw-cs-1",
      title: "数据结构实验报告",
      estimatedMinutes: 300,
      scheduledMinutes: 240,
      unscheduledMinutes: 60,
      reason: "insufficient-capacity",
    },
  ]);
  assertConserved(schedule);
});

test("exam sample keeps both overloaded topics visible", () => {
  const schedule = scheduleOf(readFixture("exam-review.sample.json"));
  assert.deepEqual(
    schedule.unscheduled.map((entry) => [entry.itemId, entry.unscheduledMinutes, entry.reason]),
    [
      ["rev-integral", 110, "insufficient-capacity"],
      ["rev-derivative", 60, "insufficient-capacity"],
    ],
  );
  assert.equal(schedule.totalEstimatedMinutes, 410);
  assert.equal(schedule.totalScheduledMinutes, 240);
  assert.equal(schedule.totalUnscheduledMinutes, 170);
  assertConserved(schedule);
  assert.equal(unscheduledReasonLabel("insufficient-capacity"), "在截止日期前的可用容量不够");
});

test("the same document schedules identically after item order changes", () => {
  const document = readFixture("exam-review.sample.json");
  const forward = scheduleOf(document);
  const reversed = scheduleOf({ ...document, items: [...document.items].reverse() });
  assert.deepEqual(reversed, forward);
});

test("work before the horizon or on closed days is unscheduled, not dropped", () => {
  const early = scheduleOf(
    baseDocument({
      horizon: { start: "2026-11-10", end: "2026-11-11" },
      items: [baseItem({ id: "hw-early", deadline: "2026-11-09", estimatedMinutes: 30 })],
    }),
  );
  assert.equal(early.totalScheduledMinutes, 0);
  assert.equal(early.unscheduled[0]?.reason, "deadline-before-horizon");
  assert.equal(early.unscheduled[0]?.unscheduledMinutes, 30);

  const closed = scheduleOf(
    baseDocument({
      horizon: { start: "2026-11-10", end: "2026-11-11" },
      capacity: { minutesPerDay: 60, unavailableDates: ["2026-11-10", "2026-11-11"] },
      items: [baseItem({ id: "hw-closed", deadline: "2026-11-11", estimatedMinutes: 30 })],
    }),
  );
  assert.equal(closed.unscheduled[0]?.reason, "no-available-day");
  assert.equal(closed.totalEstimatedMinutes, closed.totalUnscheduledMinutes);
});

test("priority and id break ties without dropping the later item", () => {
  const byPriority = scheduleOf(
    baseDocument({
      horizon: { start: "2026-11-09", end: "2026-11-09" },
      capacity: { minutesPerDay: 30, unavailableDates: [] },
      items: [
        baseItem({ id: "hw-low", priority: 2, estimatedMinutes: 30 }),
        baseItem({ id: "hw-high", priority: 1, estimatedMinutes: 30 }),
      ],
    }),
  );
  assert.deepEqual(byPriority.days[0]?.blocks.map((block) => block.itemId), ["hw-high"]);
  assert.equal(byPriority.unscheduled[0]?.itemId, "hw-low");

  const byId = scheduleOf(
    baseDocument({
      horizon: { start: "2026-11-09", end: "2026-11-09" },
      capacity: { minutesPerDay: 10, unavailableDates: [] },
      items: [
        baseItem({ id: "hw-b", priority: 1, estimatedMinutes: 10 }),
        baseItem({ id: "hw-a", priority: 1, estimatedMinutes: 10 }),
      ],
    }),
  );
  assert.deepEqual(byId.days[0]?.blocks.map((block) => block.itemId), ["hw-a"]);
  assert.equal(byId.unscheduled[0]?.itemId, "hw-b");
  assertConserved(byPriority);
  assertConserved(byId);
});

function readFixture(name: string): StudySpecDocument {
  const parsed = parseStudySpecJson(readFileSync(resolve(fixtureDir, name), "utf8"));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error("fixture failed");
  return parsed.document;
}

function scheduleOf(document: StudySpecDocument): ScheduleResult {
  const outcome = buildSchedule(document);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("schedule failed");
  return outcome.schedule;
}

function assertConserved(schedule: ScheduleResult): void {
  assert.equal(
    schedule.totalScheduledMinutes + schedule.totalUnscheduledMinutes,
    schedule.totalEstimatedMinutes,
  );
  const scheduled = new Map<string, number>();
  for (const day of schedule.days) {
    for (const block of day.blocks) {
      scheduled.set(block.itemId, (scheduled.get(block.itemId) ?? 0) + block.minutes);
    }
  }
  const pending = new Map<string, number>();
  for (const entry of schedule.unscheduled) {
    pending.set(entry.itemId, (pending.get(entry.itemId) ?? 0) + entry.unscheduledMinutes);
    assert.equal(entry.scheduledMinutes + entry.unscheduledMinutes, entry.estimatedMinutes);
  }
  const ids = new Set([...scheduled.keys(), ...pending.keys()]);
  for (const id of ids) {
    const itemMinutes = [...schedule.days.flatMap((day) => day.blocks), ...schedule.unscheduled].find((entry) =>
      "itemId" in entry ? entry.itemId === id : false,
    );
    assert.ok(itemMinutes);
  }
}

function baseItem(overrides: Partial<StudySpecDocument["items"][number]>): StudySpecDocument["items"][number] {
  return {
    id: "hw-1",
    title: "习题",
    estimatedMinutes: 30,
    deadline: "2026-11-09",
    priority: 1,
    course: "数学",
    ...overrides,
  };
}

function baseDocument(overrides: Partial<StudySpecDocument>): StudySpecDocument {
  return {
    schemaVersion: "1.0.0",
    kind: "homework",
    meta: {
      title: "临时计划",
      sample: true,
      sampleLabel: "示例数据 · 测试",
      anchorDate: "2026-11-09",
    },
    horizon: { start: "2026-11-09", end: "2026-11-09" },
    capacity: { minutesPerDay: 60, unavailableDates: [] },
    items: [baseItem({})],
    ...overrides,
  };
}
