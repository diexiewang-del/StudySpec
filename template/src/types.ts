export const SCHEMA_VERSION = "1.0.0" as const;

export const LIMITS = {
  maxJsonChars: 1_000_000,
  maxItems: 200,
  maxTitleLength: 200,
  maxNameLength: 80,
  maxNotesLength: 2_000,
  maxIdLength: 80,
  maxLabelLength: 120,
  minEstimatedMinutes: 1,
  maxEstimatedMinutes: 6_000,
  minMinutesPerDay: 0,
  maxMinutesPerDay: 1_440,
  minPriority: 1,
  maxPriority: 9,
  maxHorizonDays: 366,
  maxUnavailableDates: 366,
} as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

export type PlannerKind = "homework" | "exam-review";

/** Calendar date stored as YYYY-MM-DD. It is not a timestamp. */
export type ISODate = string;

export interface StudySpecMeta {
  title: string;
  sample: boolean;
  sampleLabel?: string;
  anchorDate: ISODate;
}

export interface StudyHorizon {
  start: ISODate;
  end: ISODate;
}

export interface DailyCapacity {
  minutesPerDay: number;
  unavailableDates: ISODate[];
}

export interface PlannerItem {
  id: string;
  title: string;
  estimatedMinutes: number;
  deadline: ISODate;
  /** Lower numbers are scheduled first after the deadline sort. */
  priority: number;
  course?: string;
  subject?: string;
  topic?: string;
  notes?: string;
}

export interface StudySpecDocument {
  schemaVersion: SchemaVersion;
  kind: PlannerKind;
  meta: StudySpecMeta;
  horizon: StudyHorizon;
  capacity: DailyCapacity;
  items: PlannerItem[];
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ScheduledBlock {
  itemId: string;
  title: string;
  minutes: number;
}

export interface ScheduleDay {
  date: ISODate;
  capacityMinutes: number;
  assignedMinutes: number;
  blocks: ScheduledBlock[];
}

export type UnscheduledReason =
  | "insufficient-capacity"
  | "deadline-before-horizon"
  | "no-available-day";

export interface UnscheduledEntry {
  itemId: string;
  title: string;
  estimatedMinutes: number;
  scheduledMinutes: number;
  unscheduledMinutes: number;
  reason: UnscheduledReason;
}

export interface ScheduleResult {
  days: ScheduleDay[];
  unscheduled: UnscheduledEntry[];
  totalEstimatedMinutes: number;
  totalScheduledMinutes: number;
  totalUnscheduledMinutes: number;
}
