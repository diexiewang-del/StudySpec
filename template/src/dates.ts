import { LIMITS } from "./types.ts";

const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function parseISODate(value: string): CalendarDate | null {
  if (typeof value !== "string") return null;
  const match = DATE_TEXT.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000 || year > 9999 || month < 1 || month > 12) return null;
  const utc = Date.UTC(year, month - 1, day);
  const date = new Date(utc);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isISODate(value: string): boolean {
  return parseISODate(value) !== null;
}

export function compareISODate(left: string, right: string): number {
  if (!isISODate(left) || !isISODate(right)) {
    throw new Error("compareISODate requires YYYY-MM-DD calendar dates");
  }
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function addDays(value: string, days: number): string {
  const parsed = parseISODate(value);
  if (!parsed) throw new Error("addDays requires a YYYY-MM-DD calendar date");
  if (!Number.isInteger(days)) throw new Error("addDays requires an integer day count");
  const utc = Date.UTC(parsed.year, parsed.month - 1, parsed.day + days);
  const date = new Date(utc);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  if (year < 1000 || year > 9999) throw new Error("addDays moved outside year 1000-9999");
  return `${year}-${month}-${day}`;
}

export function countDaysInclusive(start: string, end: string): number | null {
  if (!isISODate(start) || !isISODate(end) || compareISODate(start, end) > 0) return null;
  let count = 1;
  let cursor = start;
  while (compareISODate(cursor, end) < 0) {
    cursor = addDays(cursor, 1);
    count += 1;
    if (count > LIMITS.maxHorizonDays) return count;
  }
  return count;
}

export function eachDateInclusive(start: string, end: string): string[] {
  const count = countDaysInclusive(start, end);
  if (count === null || count > LIMITS.maxHorizonDays) return [];
  const dates: string[] = [];
  let cursor = start;
  for (let index = 0; index < count; index += 1) {
    dates.push(cursor);
    if (index < count - 1) cursor = addDays(cursor, 1);
  }
  return dates;
}

export function weekdayLabel(value: string): string {
  const parsed = parseISODate(value);
  if (!parsed) throw new Error("weekdayLabel requires a YYYY-MM-DD calendar date");
  const weekday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  return WEEKDAY_LABELS[weekday] ?? "未知";
}
