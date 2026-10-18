CREATE TYPE "public"."story_status" AS ENUM('draft', 'in_progress', 'completed', 'archived');--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"subtitle" varchar(255),
	"description" text,
	"cover_key" varchar(64),
	"writing_language" varchar(64) DEFAULT 'English' NOT NULL,
	"status" "story_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_title_not_blank" CHECK (length(trim("stories"."title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stories_owner_id_idx" ON "stories" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "stories_owner_status_idx" ON "stories" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "stories_owner_updated_at_idx" ON "stories" USING btree ("owner_id","updated_at");