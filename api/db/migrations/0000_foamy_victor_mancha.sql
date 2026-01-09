CREATE TABLE "diagram_elements" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"element_type" varchar(20) NOT NULL,
	"x" integer,
	"y" integer,
	"width" integer,
	"height" integer,
	"label" text,
	"from_element_id" integer,
	"to_element_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagram_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"snapshot_at" timestamp DEFAULT now() NOT NULL,
	"seconds_elapsed" integer NOT NULL,
	"phase" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_next_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"description" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"requirements_score" integer NOT NULL,
	"design_score" integer NOT NULL,
	"communication_score" integer NOT NULL,
	"time_management_score" integer NOT NULL,
	"depth_score" integer NOT NULL,
	"overall_summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_reports_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"target_level" varchar(20),
	"subscription_status" varchar(20) DEFAULT 'free' NOT NULL,
	"subscription_expires_at" timestamp,
	"stripe_customer_id" varchar(255),
	"interviews_completed" integer DEFAULT 0 NOT NULL,
	"interviews_remaining" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "interview_case_expectations" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"expectation_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_case_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"tag" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_case_tags_case_id_tag_unique" UNIQUE("case_id","tag")
);
--> statement-breakpoint
CREATE TABLE "interview_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"problem_statement" text NOT NULL,
	"estimated_duration" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_cases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "interview_red_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"flag_name" varchar(50) NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"seconds_elapsed" integer NOT NULL,
	"phase" varchar(20) NOT NULL,
	"description" text,
	CONSTRAINT "interview_red_flags_session_id_flag_name_unique" UNIQUE("session_id","flag_name")
);
--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"case_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"current_phase" varchar(20) DEFAULT 'problem' NOT NULL,
	"phase_started_at" timestamp DEFAULT now() NOT NULL,
	"company_style" varchar(20) DEFAULT 'faang' NOT NULL,
	"level" varchar(20) DEFAULT 'mid' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"signal_name" varchar(50) NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"seconds_elapsed" integer NOT NULL,
	"phase" varchar(20) NOT NULL,
	"triggered_by_message_id" integer,
	CONSTRAINT "interview_signals_session_id_signal_name_unique" UNIQUE("session_id","signal_name")
);
--> statement-breakpoint
CREATE TABLE "transcript_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"text" text NOT NULL,
	"phase" varchar(20) NOT NULL,
	"seconds_elapsed" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagram_elements" ADD CONSTRAINT "diagram_elements_snapshot_id_diagram_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."diagram_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_snapshots" ADD CONSTRAINT "diagram_snapshots_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_report_id_feedback_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."feedback_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_next_steps" ADD CONSTRAINT "feedback_next_steps_report_id_feedback_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."feedback_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_case_expectations" ADD CONSTRAINT "interview_case_expectations_case_id_interview_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."interview_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_case_tags" ADD CONSTRAINT "interview_case_tags_case_id_interview_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."interview_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_red_flags" ADD CONSTRAINT "interview_red_flags_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_case_id_interview_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."interview_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_signals" ADD CONSTRAINT "interview_signals_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_signals" ADD CONSTRAINT "interview_signals_triggered_by_message_id_transcript_messages_id_fk" FOREIGN KEY ("triggered_by_message_id") REFERENCES "public"."transcript_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_messages" ADD CONSTRAINT "transcript_messages_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;