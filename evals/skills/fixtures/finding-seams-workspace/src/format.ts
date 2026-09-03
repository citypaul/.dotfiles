import type { ApiKeyRow } from "./lib/database";

const DAY_MS = 24 * 60 * 60 * 1000;

export const formatRelativeDays = (ms: number): string => {
  const days = Math.ceil(ms / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
};

export const sortByExpiry = (rows: ReadonlyArray<ApiKeyRow>): ReadonlyArray<ApiKeyRow> =>
  [...rows].sort((a, b) => a.expires_at - b.expires_at || a.id - b.id);
