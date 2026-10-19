CREATE TYPE "public"."interview_topic_status" AS ENUM('unexplored', 'exploring', 'covered', 'skipped');--> statement-breakpoint
CREATE TABLE "interview_topic_coverage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"category" "memory_category" NOT NULL,
	"status" "interview_topic_status" DEFAULT 'unexplored' NOT NULL,
	"questions_asked" integer DEFAULT 0 NOT NULL,
	"answers_received" integer DEFAULT 0 NOT NULL,
	"user_boundary" boolean DEFAULT false NOT NULL,
	"last_asked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_topic_coverage_counts_nonnegative" CHECK ("interview_topic_coverage"."questions_asked" >= 0 and "interview_topic_coverage"."answers_received" >= 0)
);
--> statement-breakpoint
ALTER TABLE "interview_topic_coverage" ADD CONSTRAINT "interview_topic_coverage_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_topic_coverage" ADD CONSTRAINT "interview_topic_coverage_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interview_topic_coverage_session_category_unique" ON "interview_topic_coverage" USING btree ("session_id","category");--> statement-breakpoint
CREATE INDEX "interview_topic_coverage_owner_session_idx" ON "interview_topic_coverage" USING btree ("owner_id","session_id");