CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "extraction_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"source_answer_id" uuid NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"category" "memory_category" DEFAULT 'other' NOT NULL,
	"event_date" date,
	"date_precision" date_precision DEFAULT 'unknown' NOT NULL,
	"location" varchar(255),
	"evidence_quote" text NOT NULL,
	"status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"approved_memory_id" uuid,
	"approved_timeline_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "extraction_candidates_title_not_blank" CHECK (length(trim("extraction_candidates"."title")) > 0),
	CONSTRAINT "extraction_candidates_description_not_blank" CHECK (length(trim("extraction_candidates"."description")) > 0),
	CONSTRAINT "extraction_candidates_evidence_not_blank" CHECK (length(trim("extraction_candidates"."evidence_quote")) > 0)
);
--> statement-breakpoint
CREATE TABLE "memory_source_references" (
	"memory_id" uuid NOT NULL,
	"answer_id" uuid NOT NULL,
	"extraction_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_source_answer_id_interview_answers_id_fk" FOREIGN KEY ("source_answer_id") REFERENCES "public"."interview_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_approved_memory_id_memories_id_fk" FOREIGN KEY ("approved_memory_id") REFERENCES "public"."memories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_approved_timeline_event_id_timeline_events_id_fk" FOREIGN KEY ("approved_timeline_event_id") REFERENCES "public"."timeline_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_source_references" ADD CONSTRAINT "memory_source_references_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_source_references" ADD CONSTRAINT "memory_source_references_answer_id_interview_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."interview_answers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_source_references" ADD CONSTRAINT "memory_source_references_extraction_id_extraction_candidates_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extraction_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "extraction_candidates_session_fingerprint_unique" ON "extraction_candidates" USING btree ("session_id","fingerprint");--> statement-breakpoint
CREATE INDEX "extraction_candidates_owner_session_idx" ON "extraction_candidates" USING btree ("owner_id","session_id");--> statement-breakpoint
CREATE INDEX "extraction_candidates_status_idx" ON "extraction_candidates" USING btree ("session_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_source_references_extraction_unique" ON "memory_source_references" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX "memory_source_references_memory_idx" ON "memory_source_references" USING btree ("memory_id");