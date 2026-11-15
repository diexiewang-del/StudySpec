import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { LIMITS } from "./types.ts";
import { parseStudySpecJson, validateStudySpec } from "./validate.ts";
import { serializeStudySpec } from "./serialize.ts";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures");
const homeworkJson = readFileSync(resolve(fixtureDir, "homework.sample.json"), "utf8");
const examJson = readFileSync(resolve(fixtureDir, "exam-review.sample.json"), "utf8");

test("sample fixtures are valid labelled documents", () => {
  for (const json of [homeworkJson, examJson]) {
    const parsed = parseStudySpecJson(json);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.document.meta.sample, true);
    assert.ok(parsed.document.meta.sampleLabel && parsed.document.meta.sampleLabel.includes("示例数据"));
    assert.equal(parsed.document.meta.anchorDate, "2026-11-09");
  }
});

test("parser returns a new document and canonical JSON round-trips", () => {
  const raw: unknown = JSON.parse(homeworkJson);
  const parsed = validateStudySpec(raw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok || typeof raw !== "object" || raw === null) return;
  assert.notEqual(parsed.document, raw);
  const first = serializeStudySpec(parsed.document);
  const second = serializeStudySpec(parsed.document);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.json, second.json);
  const again = parseStudySpecJson(first.json);
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.deepEqual(again.document, parsed.document);
});

test("trims text and sorts unavailable dates", () => {
  const parsed = validateStudySpec({
    schemaVersion: "1.0.0",
    kind: "homework",
    meta: {
      title: "  周计划  ",
      sample: false,
      anchorDate: "2026-11-09",
    },
    horizon: { start: "2026-11-09", end: "2026-11-10" },
    capacity: { minutesPerDay: 30, unavailableDates: ["2026-11-10", "2026-11-09"] },
    items: [
      {
        id: "hw-1",
        title: "  习题 ",
        estimatedMinutes: 30,
        deadline: "2026-11-10",
        priority: 1,
        course: " 数学 ",
        notes: " 第一行\n第二行 ",
      },
    ],
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.document.meta.title, "周计划");
  assert.equal(parsed.document.items[0]?.title, "习题");
  assert.equal(parsed.document.items[0]?.course, "数学");
  assert.equal(parsed.document.items[0]?.notes, "第一行\n第二行");
  assert.deepEqual(parsed.document.capacity.unavailableDates, ["2026-11-09", "2026-11-10"]);
});

test("rejects unsafe or malformed JSON", () => {
  const syntax = parseStudySpecJson("{");
  assert.equal(syntax.ok, false);
  if (!syntax.ok) assert.equal(syntax.errors[0]?.code, "invalid-json");

  const bom = parseStudySpecJson("\uFEFF{}");
  assert.equal(bom.ok, false);
  if (!bom.ok) assert.equal(bom.errors[0]?.code, "invalid-json");

  const tooLarge = parseStudySpecJson("x".repeat(LIMITS.maxJsonChars + 1));
  assert.equal(tooLarge.ok, false);
  if (!tooLarge.ok) assert.equal(tooLarge.errors[0]?.code, "too-large");

  const arrayRoot = parseStudySpecJson("[]");
  assert.equal(arrayRoot.ok, false);
  if (!arrayRoot.ok) assert.equal(arrayRoot.errors[0]?.code, "invalid-type");

  const proto = parseStudySpecJson('{"__proto__":{"polluted":true}}');
  assert.equal(proto.ok, false);
  if (!proto.ok) assert.equal(proto.errors.some((entry) => entry.code === "forbidden-key"), true);
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"), false);

  const constructorKey = parseStudySpecJson('{"constructor":{"prototype":{"polluted":true}}}');
  assert.equal(constructorKey.ok, false);
  if (!constructorKey.ok) assert.equal(constructorKey.errors[0]?.code, "forbidden-key");
});

test("rejects schema, calendar, duplicate, and kind-specific problems", () => {
  const unknown = parseStudySpecJson(JSON.stringify({ ...JSON.parse(homeworkJson), model: "none" }));
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.errors.some((entry) => entry.code === "unknown-field"), true);

  const badDate = validateStudySpec(mutateHomework({ items: [item({ deadline: "2026-02-29" })] }));
  assert.equal(badDate.ok, false);
  if (!badDate.ok) assert.equal(badDate.errors.some((entry) => entry.code === "invalid-date"), true);

  const duplicate = validateStudySpec(
    mutateHomework({
      items: [item({ id: "hw-same" }), item({ id: "hw-same", title: "另一题" })],
    }),
  );
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.errors.some((entry) => entry.code === "duplicate"), true);

  const missingCourse = validateStudySpec(mutateHomework({ items: [item({ course: undefined })] }));
  assert.equal(missingCourse.ok, false);
  if (!missingCourse.ok) assert.equal(missingCourse.errors.some((entry) => entry.path.endsWith(".course")), true);

  const missingTopic = validateStudySpec({
    ...JSON.parse(examJson),
    items: [
      {
        id: "rev-1",
        title: "极限",
        estimatedMinutes: 30,
        deadline: "2026-11-12",
        priority: 1,
        subject: "高等数学",
      },
    ],
  });
  assert.equal(missingTopic.ok, false);
  if (!missingTopic.ok) assert.equal(missingTopic.errors.some((entry) => entry.path.endsWith(".topic")), true);

  const inverted = validateStudySpec(
    mutateHomework({ horizon: { start: "2026-11-12", end: "2026-11-09" } }),
  );
  assert.equal(inverted.ok, false);

  const unlabelled = validateStudySpec(
    mutateHomework({ meta: { title: "示例", sample: true, anchorDate: "2026-11-09" } }),
  );
  assert.equal(unlabelled.ok, false);
  if (!unlabelled.ok) assert.equal(unlabelled.errors.some((entry) => entry.path === "meta.sampleLabel"), true);
});

function item(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "hw-1",
    title: "习题",
    estimatedMinutes: 30,
    deadline: "2026-11-11",
    priority: 1,
    course: "数学",
    ...overrides,
  };
}

function mutateHomework(overrides: Record<string, unknown>): unknown {
  return { ...JSON.parse(homeworkJson), ...overrides };
}
