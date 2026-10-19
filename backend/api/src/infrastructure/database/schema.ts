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
export const interviewStatusEnum = pgEnum('interview_status', [
  'active',
  'paused',
  'completed',
]);
export const interviewQuestionSourceEnum = pgEnum('interview_question_source', [
  'bootstrap',
  'ai',
]);
export const interviewTopicStatusEnum = pgEnum('interview_topic_status', [
  'unexplored',
  'exploring',
  'covered',
  'skipped',
]);
export const extractionStatusEnum = pgEnum('extraction_status', [
  'pending',
  'approved',
  'rejected',
]);
export const aiJobTypeEnum = pgEnum('ai_job_type', [
  'question_generation',
  'memory_extraction',
]);
export const aiJobStatusEnum = pgEnum('ai_job_status', [
  'queued',
  'processing',
  'retrying',
  'completed',
  'failed',
  'cancelled',
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

export const interviewSessions = pgTable(
  'interview_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: interviewStatusEnum('status').default('active').notNull(),
    focusArea: varchar('focus_area', { length: 100 }),
    language: varchar('language', { length: 64 }).default('English').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('interview_sessions_owner_story_idx').on(
      table.ownerId,
      table.storyId,
    ),
    index('interview_sessions_story_status_idx').on(
      table.storyId,
      table.status,
    ),
    index('interview_sessions_updated_at_idx').on(table.updatedAt),
  ],
);

export const interviewQuestions = pgTable(
  'interview_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    prompt: text('prompt').notNull(),
    category: memoryCategoryEnum('category').default('other').notNull(),
    source: interviewQuestionSourceEnum('source')
      .default('bootstrap')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('interview_questions_session_sequence_unique').on(
      table.sessionId,
      table.sequence,
    ),
    index('interview_questions_owner_session_idx').on(
      table.ownerId,
      table.sessionId,
    ),
    check(
      'interview_questions_prompt_not_blank',
      sql`length(trim(${table.prompt})) > 0`,
    ),
    check('interview_questions_sequence_positive', sql`${table.sequence} > 0`),
  ],
);

export const interviewAnswers = pgTable(
  'interview_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content'),
    skipped: boolean('skipped').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('interview_answers_question_unique').on(table.questionId),
    index('interview_answers_owner_session_idx').on(
      table.ownerId,
      table.sessionId,
    ),
    check(
      'interview_answers_content_or_skipped',
      sql`${table.skipped} = true or length(trim(${table.content})) > 0`,
    ),
  ],
);

export const interviewTopicCoverage = pgTable(
  'interview_topic_coverage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: memoryCategoryEnum('category').notNull(),
    status: interviewTopicStatusEnum('status').default('unexplored').notNull(),
    questionsAsked: integer('questions_asked').default(0).notNull(),
    answersReceived: integer('answers_received').default(0).notNull(),
    userBoundary: boolean('user_boundary').default(false).notNull(),
    lastAskedAt: timestamp('last_asked_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('interview_topic_coverage_session_category_unique').on(
      table.sessionId,
      table.category,
    ),
    index('interview_topic_coverage_owner_session_idx').on(
      table.ownerId,
      table.sessionId,
    ),
    check(
      'interview_topic_coverage_counts_nonnegative',
      sql`${table.questionsAsked} >= 0 and ${table.answersReceived} >= 0`,
    ),
  ],
);

export const extractionCandidates = pgTable(
  'extraction_candidates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceAnswerId: uuid('source_answer_id')
      .notNull()
      .references(() => interviewAnswers.id, { onDelete: 'cascade' }),
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    title: varchar('title', { length: 180 }).notNull(),
    description: text('description').notNull(),
    category: memoryCategoryEnum('category').default('other').notNull(),
    eventDate: date('event_date'),
    datePrecision: datePrecisionEnum('date_precision')
      .default('unknown')
      .notNull(),
    location: varchar('location', { length: 255 }),
    evidenceQuote: text('evidence_quote').notNull(),
    status: extractionStatusEnum('status').default('pending').notNull(),
    approvedMemoryId: uuid('approved_memory_id').references(() => memories.id, {
      onDelete: 'set null',
    }),
    approvedTimelineEventId: uuid('approved_timeline_event_id').references(
      () => timelineEvents.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('extraction_candidates_session_fingerprint_unique').on(
      table.sessionId,
      table.fingerprint,
    ),
    index('extraction_candidates_owner_session_idx').on(
      table.ownerId,
      table.sessionId,
    ),
    index('extraction_candidates_status_idx').on(table.sessionId, table.status),
    check('extraction_candidates_title_not_blank', sql`length(trim(${table.title})) > 0`),
    check(
      'extraction_candidates_description_not_blank',
      sql`length(trim(${table.description})) > 0`,
    ),
    check(
      'extraction_candidates_evidence_not_blank',
      sql`length(trim(${table.evidenceQuote})) > 0`,
    ),
  ],
);

export const memorySourceReferences = pgTable(
  'memory_source_references',
  {
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    answerId: uuid('answer_id')
      .notNull()
      .references(() => interviewAnswers.id, { onDelete: 'restrict' }),
    extractionId: uuid('extraction_id')
      .notNull()
      .references(() => extractionCandidates.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('memory_source_references_extraction_unique').on(table.extractionId),
    index('memory_source_references_memory_idx').on(table.memoryId),
  ],
);

export const aiJobs = pgTable(
  'ai_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    type: aiJobTypeEnum('type').notNull(),
    status: aiJobStatusEnum('status').default('queued').notNull(),
    deduplicationKey: varchar('deduplication_key', { length: 64 }).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    progress: integer('progress').default(0).notNull(),
    resultReferenceId: uuid('result_reference_id'),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: varchar('error_message', { length: 500 }),
    retryable: boolean('retryable').default(true).notNull(),
    cancellationRequested: boolean('cancellation_requested').default(false).notNull(),
    enqueuedAt: timestamp('enqueued_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('ai_jobs_owner_type_deduplication_unique').on(
      table.ownerId,
      table.type,
      table.deduplicationKey,
    ),
    index('ai_jobs_owner_created_idx').on(table.ownerId, table.createdAt),
    index('ai_jobs_status_enqueued_idx').on(table.status, table.enqueuedAt),
    index('ai_jobs_session_type_idx').on(table.sessionId, table.type),
    check('ai_jobs_attempts_nonnegative', sql`${table.attempts} >= 0`),
    check('ai_jobs_max_attempts_positive', sql`${table.maxAttempts} > 0`),
    check(
      'ai_jobs_progress_range',
      sql`${table.progress} >= 0 and ${table.progress} <= 100`,
    ),
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
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export type InterviewAnswer = typeof interviewAnswers.$inferSelect;
export type InterviewTopicCoverage = typeof interviewTopicCoverage.$inferSelect;
export type ExtractionCandidate = typeof extractionCandidates.$inferSelect;
export type AiJob = typeof aiJobs.$inferSelect;
