import type { StudySpecDocument } from "./types.ts";

export const PLANNED_STORAGE_KEYS = {
  homework: "studyspec.homework.v1",
  examReview: "studyspec.exam-review.v1",
} as const;

export type StorageErrorCode =
  | "not-implemented"
  | "quota-exceeded"
  | "security-error"
  | "corrupt-json"
  | "invalid-document"
  | "unavailable";

export interface StorageError {
  code: StorageErrorCode;
  message: string;
}

export type LoadResult =
  | { ok: true; document: StudySpecDocument }
  | { ok: false; error: StorageError };

export type SaveResult = { ok: true } | { ok: false; error: StorageError };

export interface PlannerStore {
  load(key: string): LoadResult;
  save(key: string, document: StudySpecDocument): SaveResult;
}

const NOT_IMPLEMENTED: StorageError = {
  code: "not-implemented",
  message: "浏览器本地存储还没有实现。本阶段不会读取或写入已保存的计划。",
};

export function createUnimplementedLocalStore(): PlannerStore {
  return {
    load(key: string): LoadResult {
      void key;
      return { ok: false, error: NOT_IMPLEMENTED };
    },
    save(key: string, document: StudySpecDocument): SaveResult {
      void key;
      void document;
      return { ok: false, error: NOT_IMPLEMENTED };
    },
  };
}
