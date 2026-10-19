export const MEMORY_CATEGORIES = [
  'childhood',
  'family',
  'education',
  'friendship',
  'career',
  'travel',
  'celebration',
  'challenge',
  'achievement',
  'other',
] as const;
export const DATE_PRECISIONS = [
  'exact',
  'month',
  'year',
  'approximate',
  'unknown',
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export type DatePrecision = (typeof DATE_PRECISIONS)[number];
