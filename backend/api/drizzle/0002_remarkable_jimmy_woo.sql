CREATE TYPE "public"."date_precision" AS ENUM('exact', 'month', 'year', 'approximate', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'document');--> statement-breakpoint
CREATE TYPE "public"."memory_category" AS ENUM('childhood', 'family', 'education', 'friendship', 'career', 'travel', 'celebration', 'challenge', 'achievement', 'other');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"memory_id" uuid,
	"timeline_event_id" uuid,
	"kind" "media_kind" NOT NULL,
	"storage_key" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_parent_required" CHECK ("media_assets"."memory_id" is not null or "media_assets"."timeline_event_id" is not null),
	CONSTRAINT "media_assets_size_positive" CHECK ("media_assets"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"category" "memory_category" DEFAULT 'other' NOT NULL,
	"event_date" date,
	"date_precision" date_precision DEFAULT 'unknown' NOT NULL,
	"location" varchar(255),
	"emotional_significance" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memories_title_not_blank" CHECK (length(trim("memories"."title")) > 0),
	CONSTRAINT "memories_description_not_blank" CHECK (length(trim("memories"."description")) > 0),
	CONSTRAINT "memories_significance_range" CHECK ("memories"."emotional_significance" is null or "memories"."emotional_significance" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "memory_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid NOT NULL,
	"label" varchar(48) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_event_memories" (
	"timeline_event_id" uuid NOT NULL,
	"memory_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text,
	"event_date" date,
	"date_precision" date_precision DEFAULT 'unknown' NOT NULL,
	"location" varchar(255),
	"category" "memory_category" DEFAULT 'other' NOT NULL,
	"life_stage" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timeline_events_title_not_blank" CHECK (length(trim("timeline_events"."title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_timeline_event_id_timeline_events_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."timeline_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_tags" ADD CONSTRAINT "memory_tags_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event_memories" ADD CONSTRAINT "timeline_event_memories_timeline_event_id_timeline_events_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."timeline_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event_memories" ADD CONSTRAINT "timeline_event_memories_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_key_unique" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_assets_owner_story_idx" ON "media_assets" USING btree ("owner_id","story_id");--> statement-breakpoint
CREATE INDEX "media_assets_memory_idx" ON "media_assets" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "memories_story_id_idx" ON "memories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "memories_owner_story_idx" ON "memories" USING btree ("owner_id","story_id");--> statement-breakpoint
CREATE INDEX "memories_event_date_idx" ON "memories" USING btree ("story_id","event_date");--> statement-breakpoint
CREATE INDEX "memories_category_idx" ON "memories" USING btree ("story_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_tags_memory_label_unique" ON "memory_tags" USING btree ("memory_id","label");--> statement-breakpoint
CREATE INDEX "memory_tags_label_idx" ON "memory_tags" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "timeline_event_memories_unique" ON "timeline_event_memories" USING btree ("timeline_event_id","memory_id");--> statement-breakpoint
CREATE INDEX "timeline_event_memories_memory_idx" ON "timeline_event_memories" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "timeline_events_owner_story_idx" ON "timeline_events" USING btree ("owner_id","story_id");--> statement-breakpoint
CREATE INDEX "timeline_events_story_date_idx" ON "timeline_events" USING btree ("story_id","event_date");