CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'processing', 'retrying', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ai_job_type" AS ENUM('question_generation', 'memory_extraction');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "ai_job_type" NOT NULL,
	"status" "ai_job_status" DEFAULT 'queued' NOT NULL,
	"deduplication_key" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"result_reference_id" uuid,
	"error_code" varchar(100),
	"error_message" varchar(500),
	"retryable" boolean DEFAULT true NOT NULL,
	"cancellation_requested" boolean DEFAULT false NOT NULL,
	"enqueued_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_jobs_attempts_nonnegative" CHECK ("ai_jobs"."attempts" >= 0),
	CONSTRAINT "ai_jobs_max_attempts_positive" CHECK ("ai_jobs"."max_attempts" > 0),
	CONSTRAINT "ai_jobs_progress_range" CHECK ("ai_jobs"."progress" >= 0 and "ai_jobs"."progress" <= 100)
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_jobs_owner_type_deduplication_unique" ON "ai_jobs" USING btree ("owner_id","type","deduplication_key");--> statement-breakpoint
CREATE INDEX "ai_jobs_owner_created_idx" ON "ai_jobs" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_jobs_status_enqueued_idx" ON "ai_jobs" USING btree ("status","enqueued_at");--> statement-breakpoint
CREATE INDEX "ai_jobs_session_type_idx" ON "ai_jobs" USING btree ("session_id","type");