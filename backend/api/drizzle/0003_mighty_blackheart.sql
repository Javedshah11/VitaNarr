CREATE TYPE "public"."interview_question_source" AS ENUM('bootstrap', 'ai');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TABLE "interview_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"content" text,
	"skipped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_answers_content_or_skipped" CHECK ("interview_answers"."skipped" = true or length(trim("interview_answers"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "interview_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"prompt" text NOT NULL,
	"category" "memory_category" DEFAULT 'other' NOT NULL,
	"source" "interview_question_source" DEFAULT 'bootstrap' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_questions_prompt_not_blank" CHECK (length(trim("interview_questions"."prompt")) > 0),
	CONSTRAINT "interview_questions_sequence_positive" CHECK ("interview_questions"."sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" "interview_status" DEFAULT 'active' NOT NULL,
	"focus_area" varchar(100),
	"language" varchar(64) DEFAULT 'English' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paused_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_question_id_interview_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."interview_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interview_answers_question_unique" ON "interview_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "interview_answers_owner_session_idx" ON "interview_answers" USING btree ("owner_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interview_questions_session_sequence_unique" ON "interview_questions" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "interview_questions_owner_session_idx" ON "interview_questions" USING btree ("owner_id","session_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_owner_story_idx" ON "interview_sessions" USING btree ("owner_id","story_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_story_status_idx" ON "interview_sessions" USING btree ("story_id","status");--> statement-breakpoint
CREATE INDEX "interview_sessions_updated_at_idx" ON "interview_sessions" USING btree ("updated_at");