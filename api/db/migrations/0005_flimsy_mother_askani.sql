CREATE TABLE "feedback_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"section_type" varchar(50) NOT NULL,
	"dimension" varchar(50),
	"content" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD COLUMN "recommendation" varchar(50);--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD COLUMN "overall_assessment" text;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD COLUMN "generation_method" varchar(20) DEFAULT 'rule_based' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD COLUMN "ai_model" varchar(50);--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD COLUMN "generation_duration_ms" integer;--> statement-breakpoint
ALTER TABLE "feedback_sections" ADD CONSTRAINT "feedback_sections_report_id_feedback_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."feedback_reports"("id") ON DELETE cascade ON UPDATE no action;