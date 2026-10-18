import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
