CREATE TABLE "interview_phase_cutoffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"phase" varchar(20) NOT NULL,
	"cutoff_at" timestamp DEFAULT now() NOT NULL,
	"seconds_elapsed" integer NOT NULL,
	"exceeded_by_seconds" integer NOT NULL,
	CONSTRAINT "interview_phase_cutoffs_session_id_phase_unique" UNIQUE("session_id","phase")
);
--> statement-breakpoint
ALTER TABLE "interview_phase_cutoffs" ADD CONSTRAINT "interview_phase_cutoffs_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;