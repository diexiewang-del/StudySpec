import { compareISODate, countDaysInclusive, isISODate } from "./dates.ts";
import {
  LIMITS,
  SCHEMA_VERSION,
  type PlannerItem,
  type PlannerKind,
  type StudySpecDocument,
  type ValidationIssue,
} from "./types.ts";

export interface ParseSuccess {
  ok: true;
  document: StudySpecDocument;
}

export interface ParseFailure {
  ok: false;
  errors: ValidationIssue[];
}

export type ParseResult = ParseSuccess | ParseFailure;

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ID_TEXT = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function parseStudySpecJson(json: string): ParseResult {
  if (typeof json !== "string") {
    return failure([issue("$", "invalid-type", "导入内容必须是字符串。")]);
  }
  if (json.length > LIMITS.maxJsonChars) {
    return failure([issue("$", "too-large", `JSON 超过 ${LIMITS.maxJsonChars} 个字符。`)]);
  }
  if (json.charCodeAt(0) === 0xfeff) {
    return failure([issue("$", "invalid-json", "不接受带 BOM 的 JSON。")]);
  }
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return failure([issue("$", "invalid-json", "JSON 无法解析。")]);
  }
  return validateStudySpec(value);
}

export function validateStudySpec(input: unknown): ParseResult {
  const errors: ValidationIssue[] = [];
  const document = readDocument(input, errors);
  if (!document || errors.length > 0) return failure(errors);
  return { ok: true, document };
}

function readDocument(input: unknown, errors: ValidationIssue[]): StudySpecDocument | null {
  if (!isPlainObject(input)) {
    errors.push(issue("$", "invalid-type", "计划文档必须是 JSON 对象。"));
    return null;
  }
  const forbidden = findForbiddenKey(input);
  if (forbidden) {
    errors.push(issue("$", "forbidden-key", `不允许使用字段 ${forbidden}。`));
    return null;
  }
  rejectUnknown(input, ["schemaVersion", "kind", "meta", "horizon", "capacity", "items"], "$", errors);

  const schemaVersion = readSchemaVersion(input.schemaVersion, errors);
  const kind = readKind(input.kind, errors);
  const meta = readMeta(input.meta, errors);
  const horizon = readHorizon(input.horizon, errors);
  const capacity = readCapacity(input.capacity, errors);
  const items = readItems(input.items, kind, errors);

  if (!schemaVersion || !kind || !meta || !horizon || !capacity || !items || errors.length > 0) {
    return null;
  }

  const dayCount = countDaysInclusive(horizon.start, horizon.end);
  if (dayCount === null || dayCount > LIMITS.maxHorizonDays) {
    errors.push(issue("horizon", "out-of-range", `计划窗口不能超过 ${LIMITS.maxHorizonDays} 天。`));
    return null;
  }

  return {
    schemaVersion,
    kind,
    meta,
    horizon,
    capacity,
    items,
  };
}

function readSchemaVersion(value: unknown, errors: ValidationIssue[]): typeof SCHEMA_VERSION | null {
  if (value !== SCHEMA_VERSION) {
    errors.push(issue("schemaVersion", "invalid-value", `schemaVersion 必须是 ${SCHEMA_VERSION}。`));
    return null;
  }
  return SCHEMA_VERSION;
}

function readKind(value: unknown, errors: ValidationIssue[]): PlannerKind | null {
  if (value !== "homework" && value !== "exam-review") {
    errors.push(issue("kind", "invalid-value", "kind 必须是 homework 或 exam-review。"));
    return null;
  }
  return value;
}

function readMeta(value: unknown, errors: ValidationIssue[]): StudySpecDocument["meta"] | null {
  if (!isPlainObject(value)) {
    errors.push(issue("meta", "invalid-type", "meta 必须是对象。"));
    return null;
  }
  if (findForbiddenKey(value)) {
    errors.push(issue("meta", "forbidden-key", "meta 含有不允许的字段。"));
    return null;
  }
  rejectUnknown(value, ["title", "sample", "sampleLabel", "anchorDate"], "meta", errors);
  const title = readText(value.title, "meta.title", 1, LIMITS.maxLabelLength, false, errors);
  const anchorDate = readDate(value.anchorDate, "meta.anchorDate", errors);
  if (typeof value.sample !== "boolean") {
    errors.push(issue("meta.sample", "invalid-type", "sample 必须是布尔值。"));
  }
  let sampleLabel: string | undefined;
  if (value.sample === true) {
    const label = readText(value.sampleLabel, "meta.sampleLabel", 1, LIMITS.maxLabelLength, false, errors);
    if (label) sampleLabel = label;
  } else if (value.sampleLabel !== undefined) {
    const label = readText(value.sampleLabel, "meta.sampleLabel", 1, LIMITS.maxLabelLength, false, errors);
    if (label) sampleLabel = label;
  }
  if (!title || !anchorDate || typeof value.sample !== "boolean" || errors.length > 0) return null;
  return sampleLabel
    ? { title, sample: value.sample, sampleLabel, anchorDate }
    : { title, sample: value.sample, anchorDate };
}

function readHorizon(value: unknown, errors: ValidationIssue[]): StudySpecDocument["horizon"] | null {
  if (!isPlainObject(value)) {
    errors.push(issue("horizon", "invalid-type", "horizon 必须是对象。"));
    return null;
  }
  if (findForbiddenKey(value)) {
    errors.push(issue("horizon", "forbidden-key", "horizon 含有不允许的字段。"));
    return null;
  }
  rejectUnknown(value, ["start", "end"], "horizon", errors);
  const start = readDate(value.start, "horizon.start", errors);
  const end = readDate(value.end, "horizon.end", errors);
  if (!start || !end) return null;
  if (compareISODate(start, end) > 0) {
    errors.push(issue("horizon", "out-of-range", "窗口开始日不能晚于结束日。"));
    return null;
  }
  return { start, end };
}

function readCapacity(value: unknown, errors: ValidationIssue[]): StudySpecDocument["capacity"] | null {
  if (!isPlainObject(value)) {
    errors.push(issue("capacity", "invalid-type", "capacity 必须是对象。"));
    return null;
  }
  if (findForbiddenKey(value)) {
    errors.push(issue("capacity", "forbidden-key", "capacity 含有不允许的字段。"));
    return null;
  }
  rejectUnknown(value, ["minutesPerDay", "unavailableDates"], "capacity", errors);
  const minutesPerDay = readInteger(
    value.minutesPerDay,
    "capacity.minutesPerDay",
    LIMITS.minMinutesPerDay,
    LIMITS.maxMinutesPerDay,
    errors,
  );
  if (!Array.isArray(value.unavailableDates)) {
    errors.push(issue("capacity.unavailableDates", "invalid-type", "unavailableDates 必须是数组。"));
    return null;
  }
  if (value.unavailableDates.length > LIMITS.maxUnavailableDates) {
    errors.push(
      issue(
        "capacity.unavailableDates",
        "out-of-range",
        `不可用日期不能超过 ${LIMITS.maxUnavailableDates} 个。`,
      ),
    );
  }
  const unavailableDates: string[] = [];
  const seen = new Set<string>();
  value.unavailableDates.forEach((entry, index) => {
    const date = readDate(entry, `capacity.unavailableDates[${index}]`, errors);
    if (!date) return;
    if (seen.has(date)) {
      errors.push(issue(`capacity.unavailableDates[${index}]`, "duplicate", `日期 ${date} 重复。`));
      return;
    }
    seen.add(date);
    unavailableDates.push(date);
  });
  if (minutesPerDay === null || errors.length > 0) return null;
  unavailableDates.sort((left, right) => compareISODate(left, right));
  return { minutesPerDay, unavailableDates };
}

function readItems(
  value: unknown,
  kind: PlannerKind | null,
  errors: ValidationIssue[],
): PlannerItem[] | null {
  if (!Array.isArray(value)) {
    errors.push(issue("items", "invalid-type", "items 必须是数组。"));
    return null;
  }
  if (value.length > LIMITS.maxItems) {
    errors.push(issue("items", "out-of-range", `事项不能超过 ${LIMITS.maxItems} 条。`));
    return null;
  }
  const items: PlannerItem[] = [];
  const seen = new Set<string>();
  let itemFailed = false;
  value.forEach((entry, index) => {
    const item = readItem(entry, index, kind, errors);
    if (!item) {
      itemFailed = true;
      return;
    }
    if (seen.has(item.id)) {
      errors.push(issue(`items[${index}].id`, "duplicate", `标识 ${item.id} 重复。`));
      itemFailed = true;
      return;
    }
    seen.add(item.id);
    items.push(item);
  });
  if (itemFailed || errors.length > 0) return null;
  return items;
}

function readItem(
  value: unknown,
  index: number,
  kind: PlannerKind | null,
  errors: ValidationIssue[],
): PlannerItem | null {
  const path = `items[${index}]`;
  if (!isPlainObject(value)) {
    errors.push(issue(path, "invalid-type", "事项必须是对象。"));
    return null;
  }
  if (findForbiddenKey(value)) {
    errors.push(issue(path, "forbidden-key", "事项含有不允许的字段。"));
    return null;
  }
  rejectUnknown(
    value,
    ["id", "title", "estimatedMinutes", "deadline", "priority", "course", "subject", "topic", "notes"],
    path,
    errors,
  );
  const before = errors.length;
  const id = readIdentifier(value.id, `${path}.id`, errors);
  const title = readText(value.title, `${path}.title`, 1, LIMITS.maxTitleLength, false, errors);
  const estimatedMinutes = readInteger(
    value.estimatedMinutes,
    `${path}.estimatedMinutes`,
    LIMITS.minEstimatedMinutes,
    LIMITS.maxEstimatedMinutes,
    errors,
  );
  const deadline = readDate(value.deadline, `${path}.deadline`, errors);
  const priority = readInteger(
    value.priority,
    `${path}.priority`,
    LIMITS.minPriority,
    LIMITS.maxPriority,
    errors,
  );
  const course = readOptionalName(value.course, `${path}.course`, errors);
  const subject = readOptionalName(value.subject, `${path}.subject`, errors);
  const topic = readOptionalName(value.topic, `${path}.topic`, errors);
  const notes = readOptionalNotes(value.notes, `${path}.notes`, errors);
  if (kind === "homework" && value.course === undefined) {
    errors.push(issue(`${path}.course`, "required", "作业事项必须填写课程。"));
  }
  if (kind === "exam-review" && value.subject === undefined) {
    errors.push(issue(`${path}.subject`, "required", "复习事项必须填写科目。"));
  }
  if (kind === "exam-review" && value.topic === undefined) {
    errors.push(issue(`${path}.topic`, "required", "复习事项必须填写主题。"));
  }
  if (
    errors.length !== before ||
    !id ||
    !title ||
    estimatedMinutes === null ||
    !deadline ||
    priority === null ||
    course === READ_FAILED ||
    subject === READ_FAILED ||
    topic === READ_FAILED ||
    notes === READ_FAILED
  ) {
    return null;
  }
  const item: PlannerItem = { id, title, estimatedMinutes, deadline, priority };
  if (typeof course === "string") item.course = course;
  if (typeof subject === "string") item.subject = subject;
  if (typeof topic === "string") item.topic = topic;
  if (typeof notes === "string") item.notes = notes;
  return item;
}

const READ_FAILED = Symbol("read-failed");

function readOptionalName(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
): string | undefined | typeof READ_FAILED {
  if (value === undefined) return undefined;
  const text = readText(value, path, 1, LIMITS.maxNameLength, false, errors);
  return text ?? READ_FAILED;
}

function readOptionalNotes(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
): string | undefined | typeof READ_FAILED {
  if (value === undefined) return undefined;
  const text = readText(value, path, 1, LIMITS.maxNotesLength, true, errors);
  return text ?? READ_FAILED;
}

function readIdentifier(value: unknown, path: string, errors: ValidationIssue[]): string | null {
  const text = readText(value, path, 1, LIMITS.maxIdLength, false, errors);
  if (!text) return null;
  if (!ID_TEXT.test(text)) {
    errors.push(issue(path, "invalid-pattern", "标识只能包含小写字母、数字和连字符，并且要以字母或数字开头。"));
    return null;
  }
  return text;
}

function readText(
  value: unknown,
  path: string,
  min: number,
  max: number,
  allowNewline: boolean,
  errors: ValidationIssue[],
): string | null {
  if (typeof value !== "string") {
    errors.push(issue(path, "invalid-type", "必须是字符串。"));
    return null;
  }
  const trimmed = value.trim();
  if (hasControlChars(trimmed, allowNewline)) {
    errors.push(issue(path, "invalid-pattern", "文本含有不允许的控制字符。"));
    return null;
  }
  if (trimmed.length < min) {
    errors.push(issue(path, "out-of-range", "不能为空。"));
    return null;
  }
  if (trimmed.length > max) {
    errors.push(issue(path, "out-of-range", `不能超过 ${max} 个字符。`));
    return null;
  }
  return trimmed;
}

function readDate(value: unknown, path: string, errors: ValidationIssue[]): string | null {
  if (typeof value !== "string" || !isISODate(value)) {
    errors.push(issue(path, "invalid-date", "日期必须是真实存在的 YYYY-MM-DD。"));
    return null;
  }
  return value;
}

function readInteger(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: ValidationIssue[],
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(issue(path, "invalid-type", "必须是整数。"));
    return null;
  }
  if (value < min || value > max) {
    errors.push(issue(path, "out-of-range", `必须在 ${min} 和 ${max} 之间。`));
    return null;
  }
  return value;
}

function rejectUnknown(
  value: Record<string, unknown>,
  allowed: string[],
  path: string,
  errors: ValidationIssue[],
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      const fieldPath = path === "$" ? key : `${path}.${key}`;
      errors.push(issue(fieldPath, "unknown-field", `不认识的字段 ${key}。`));
    }
  }
}

function findForbiddenKey(value: object): string | null {
  return Object.keys(value).find((key) => FORBIDDEN_KEYS.has(key)) ?? null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function hasControlChars(value: string, allowNewline: boolean): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (allowNewline && code === 10) continue;
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

function failure(errors: ValidationIssue[]): ParseFailure {
  return { ok: false, errors };
}
