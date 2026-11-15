import type { PlannerItem, StudySpecDocument, ValidationIssue } from "./types.ts";
import { validateStudySpec } from "./validate.ts";

export type SerializeResult =
  | { ok: true; json: string }
  | { ok: false; errors: ValidationIssue[] };

export function serializeStudySpec(input: unknown): SerializeResult {
  const validated = validateStudySpec(input);
  if (!validated.ok) return validated;
  return { ok: true, json: `${JSON.stringify(toCanonical(validated.document), null, 2)}\n` };
}

function toCanonical(document: StudySpecDocument): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    title: document.meta.title,
    sample: document.meta.sample,
  };
  if (document.meta.sampleLabel !== undefined) meta.sampleLabel = document.meta.sampleLabel;
  meta.anchorDate = document.meta.anchorDate;
  return {
    schemaVersion: document.schemaVersion,
    kind: document.kind,
    meta,
    horizon: {
      start: document.horizon.start,
      end: document.horizon.end,
    },
    capacity: {
      minutesPerDay: document.capacity.minutesPerDay,
      unavailableDates: document.capacity.unavailableDates,
    },
    items: document.items.map(toCanonicalItem),
  };
}

function toCanonicalItem(item: PlannerItem): Record<string, unknown> {
  const canonical: Record<string, unknown> = {
    id: item.id,
    title: item.title,
    estimatedMinutes: item.estimatedMinutes,
    deadline: item.deadline,
    priority: item.priority,
  };
  if (item.course !== undefined) canonical.course = item.course;
  if (item.subject !== undefined) canonical.subject = item.subject;
  if (item.topic !== undefined) canonical.topic = item.topic;
  if (item.notes !== undefined) canonical.notes = item.notes;
  return canonical;
}
