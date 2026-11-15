import { compareISODate, eachDateInclusive } from "./dates.ts";
import type {
  PlannerItem,
  ScheduleDay,
  ScheduleResult,
  ScheduledBlock,
  StudySpecDocument,
  UnscheduledEntry,
  UnscheduledReason,
  ValidationIssue,
} from "./types.ts";
import { validateStudySpec } from "./validate.ts";

export type ScheduleOutcome =
  | { ok: true; schedule: ScheduleResult }
  | { ok: false; errors: ValidationIssue[] };

export function buildSchedule(input: StudySpecDocument | unknown): ScheduleOutcome {
  const validated = validateStudySpec(input);
  if (!validated.ok) return validated;
  const document = validated.document;
  const dates = eachDateInclusive(document.horizon.start, document.horizon.end);
  const unavailable = new Set(document.capacity.unavailableDates);
  const remainingCapacity = new Map<string, number>();
  const blocksByDate = new Map<string, ScheduledBlock[]>();

  for (const date of dates) {
    const capacity = unavailable.has(date) ? 0 : document.capacity.minutesPerDay;
    remainingCapacity.set(date, capacity);
    blocksByDate.set(date, []);
  }

  const ordered = [...document.items].sort(compareItems);
  const unscheduled: UnscheduledEntry[] = [];

  for (const item of ordered) {
    const feasible = dates.filter((date) => compareISODate(date, item.deadline) <= 0);
    if (feasible.length === 0) {
      unscheduled.push(unscheduledEntry(item, 0, reasonFor(item, document, feasible, unavailable)));
      continue;
    }

    let remaining = item.estimatedMinutes;
    let placed = 0;
    for (const date of feasible) {
      if (remaining === 0) break;
      const capacity = remainingCapacity.get(date) ?? 0;
      if (capacity <= 0) continue;
      const take = Math.min(capacity, remaining);
      blocksByDate.get(date)?.push({ itemId: item.id, title: item.title, minutes: take });
      remainingCapacity.set(date, capacity - take);
      remaining -= take;
      placed += take;
    }

    if (remaining > 0) {
      unscheduled.push(unscheduledEntry(item, placed, reasonFor(item, document, feasible, unavailable)));
    }
  }

  const days: ScheduleDay[] = dates.map((date) => {
    const blocks = blocksByDate.get(date) ?? [];
    const assignedMinutes = blocks.reduce((sum, block) => sum + block.minutes, 0);
    const capacityMinutes = unavailable.has(date) ? 0 : document.capacity.minutesPerDay;
    return { date, capacityMinutes, assignedMinutes, blocks };
  });

  const totalEstimatedMinutes = document.items.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  const totalScheduledMinutes = days.reduce((sum, day) => sum + day.assignedMinutes, 0);
  const totalUnscheduledMinutes = unscheduled.reduce((sum, entry) => sum + entry.unscheduledMinutes, 0);

  return {
    ok: true,
    schedule: {
      days,
      unscheduled,
      totalEstimatedMinutes,
      totalScheduledMinutes,
      totalUnscheduledMinutes,
    },
  };
}

export function unscheduledReasonLabel(reason: UnscheduledReason): string {
  switch (reason) {
    case "insufficient-capacity":
      return "在截止日期前的可用容量不够";
    case "deadline-before-horizon":
      return "截止日期早于计划窗口";
    case "no-available-day":
      return "计划窗口内没有可排入的日子";
    default: {
      const unreachable: never = reason;
      throw new Error(`未知的未排入原因：${String(unreachable)}`);
    }
  }
}

function compareItems(left: PlannerItem, right: PlannerItem): number {
  const byDeadline = compareISODate(left.deadline, right.deadline);
  if (byDeadline !== 0) return byDeadline;
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function reasonFor(
  item: PlannerItem,
  document: StudySpecDocument,
  feasible: string[],
  unavailable: Set<string>,
): UnscheduledReason {
  if (compareISODate(item.deadline, document.horizon.start) < 0) return "deadline-before-horizon";
  const anyOpen = feasible.some((date) => !unavailable.has(date) && document.capacity.minutesPerDay > 0);
  if (!anyOpen) return "no-available-day";
  return "insufficient-capacity";
}

function unscheduledEntry(item: PlannerItem, scheduledMinutes: number, reason: UnscheduledReason): UnscheduledEntry {
  return {
    itemId: item.id,
    title: item.title,
    estimatedMinutes: item.estimatedMinutes,
    scheduledMinutes,
    unscheduledMinutes: item.estimatedMinutes - scheduledMinutes,
    reason,
  };
}
