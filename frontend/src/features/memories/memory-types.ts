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
export const DATE_PRECISIONS = ['exact', 'month', 'year', 'approximate', 'unknown'] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export type DatePrecision = (typeof DATE_PRECISIONS)[number];
export const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  childhood: 'Childhood',
  family: 'Family',
  education: 'Education',
  friendship: 'Friendship',
  career: 'Career',
  travel: 'Travel',
  celebration: 'Celebration',
  challenge: 'Challenge',
  achievement: 'Achievement',
  other: 'Other',
};
export interface Memory {
  id: string;
  storyId: string;
  ownerId: string;
  title: string;
  description: string;
  category: MemoryCategory;
  eventDate: string | null;
  datePrecision: DatePrecision;
  location: string | null;
  emotionalSignificance: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
export interface MemoryInput {
  title: string;
  description: string;
  category?: MemoryCategory;
  eventDate?: string;
  datePrecision?: DatePrecision;
  location?: string;
  emotionalSignificance?: number;
  tags?: string[];
}
export interface TimelineEvent {
  id: string;
  storyId: string;
  ownerId: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  datePrecision: DatePrecision;
  location: string | null;
  category: MemoryCategory;
  lifeStage: string | null;
  memoryIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface TimelineInput {
  title: string;
  description?: string;
  eventDate?: string;
  datePrecision?: DatePrecision;
  location?: string;
  category?: MemoryCategory;
  lifeStage?: string;
  memoryIds?: string[];
}
export interface MediaAsset {
  id: string;
  memoryId: string | null;
  kind: 'image' | 'document';
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
