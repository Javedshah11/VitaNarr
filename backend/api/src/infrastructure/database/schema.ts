import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  bigint,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['active', 'disabled']);
export const storyStatusEnum = pgEnum('story_status', [
  'draft',
  'in_progress',
  'completed',
  'archived',
]);
export const memoryCategoryEnum = pgEnum('memory_category', [
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
]);
export const datePrecisionEnum = pgEnum('date_precision', [
  'exact',
  'month',
  'year',
  'approximate',
  'unknown',
]);
export const mediaKindEnum = pgEnum('media_kind', ['image', 'document']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    email: varchar('email', { length: 320 }).notNull(),

    passwordHash: varchar('password_hash', { length: 255 }).notNull(),

    displayName: varchar('display_name', { length: 120 }).notNull(),

    status: userStatusEnum('status').default('active').notNull(),

    emailVerified: boolean('email_verified').default(false).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),

    check(
      'users_email_normalized',
      sql`${table.email} = lower(trim(${table.email}))`,
    ),

    index('users_status_idx').on(table.status),
  ],
);

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    fullName: varchar('full_name', { length: 160 }),

    preferredName: varchar('preferred_name', { length: 120 }),

    birthDate: date('birth_date'),

    birthPlace: varchar('birth_place', { length: 255 }),

    preferredWritingLanguage: varchar('preferred_writing_language', {
      length: 64,
    }),

    preferredInterviewLanguage: varchar('preferred_interview_language', {
      length: 64,
    }),

    timezone: varchar('timezone', { length: 100 }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('profiles_user_id_unique').on(table.userId),
    index('profiles_user_id_idx').on(table.userId),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    refreshTokenHash: varchar('refresh_token_hash', {
      length: 255,
    }).notNull(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp('revoked_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('auth_sessions_refresh_token_hash_unique').on(
      table.refreshTokenHash,
    ),

    index('auth_sessions_user_id_idx').on(table.userId),

    index('auth_sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const stories = pgTable(
  'stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    title: varchar('title', { length: 160 }).notNull(),

    subtitle: varchar('subtitle', { length: 255 }),

    description: text('description'),

    coverKey: varchar('cover_key', { length: 64 }),

    writingLanguage: varchar('writing_language', { length: 64 })
      .default('English')
      .notNull(),

    status: storyStatusEnum('status').default('draft').notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('stories_owner_id_idx').on(table.ownerId),
    index('stories_owner_status_idx').on(table.ownerId, table.status),
    index('stories_owner_updated_at_idx').on(table.ownerId, table.updatedAt),
    check('stories_title_not_blank', sql`length(trim(${table.title})) > 0`),
  ],
);

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 180 }).notNull(),
    description: text('description').notNull(),
    category: memoryCategoryEnum('category').default('other').notNull(),
    eventDate: date('event_date'),
    datePrecision: datePrecisionEnum('date_precision')
      .default('unknown')
      .notNull(),
    location: varchar('location', { length: 255 }),
    emotionalSignificance: integer('emotional_significance'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('memories_story_id_idx').on(table.storyId),
    index('memories_owner_story_idx').on(table.ownerId, table.storyId),
    index('memories_event_date_idx').on(table.storyId, table.eventDate),
    index('memories_category_idx').on(table.storyId, table.category),
    check('memories_title_not_blank', sql`length(trim(${table.title})) > 0`),
    check(
      'memories_description_not_blank',
      sql`length(trim(${table.description})) > 0`,
    ),
    check(
      'memories_significance_range',
      sql`${table.emotionalSignificance} is null or ${table.emotionalSignificance} between 1 and 5`,
    ),
  ],
);

export const memoryTags = pgTable(
  'memory_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 48 }).notNull(),
  },
  (table) => [
    uniqueIndex('memory_tags_memory_label_unique').on(
      table.memoryId,
      table.label,
    ),
    index('memory_tags_label_idx').on(table.label),
  ],
);

export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 180 }).notNull(),
    description: text('description'),
    eventDate: date('event_date'),
    datePrecision: datePrecisionEnum('date_precision')
      .default('unknown')
      .notNull(),
    location: varchar('location', { length: 255 }),
    category: memoryCategoryEnum('category').default('other').notNull(),
    lifeStage: varchar('life_stage', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('timeline_events_owner_story_idx').on(table.ownerId, table.storyId),
    index('timeline_events_story_date_idx').on(table.storyId, table.eventDate),
    check(
      'timeline_events_title_not_blank',
      sql`length(trim(${table.title})) > 0`,
    ),
  ],
);

export const timelineEventMemories = pgTable(
  'timeline_event_memories',
  {
    timelineEventId: uuid('timeline_event_id')
      .notNull()
      .references(() => timelineEvents.id, { onDelete: 'cascade' }),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('timeline_event_memories_unique').on(
      table.timelineEventId,
      table.memoryId,
    ),
    index('timeline_event_memories_memory_idx').on(table.memoryId),
  ],
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    memoryId: uuid('memory_id').references(() => memories.id, {
      onDelete: 'cascade',
    }),
    timelineEventId: uuid('timeline_event_id').references(
      () => timelineEvents.id,
      { onDelete: 'cascade' },
    ),
    kind: mediaKindEnum('kind').notNull(),
    storageKey: varchar('storage_key', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('media_assets_storage_key_unique').on(table.storageKey),
    index('media_assets_owner_story_idx').on(table.ownerId, table.storyId),
    index('media_assets_memory_idx').on(table.memoryId),
    check(
      'media_assets_parent_required',
      sql`${table.memoryId} is not null or ${table.timelineEventId} is not null`,
    ),
    check('media_assets_size_positive', sql`${table.sizeBytes} > 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
export type MediaAsset = typeof mediaAssets.$inferSelect;
