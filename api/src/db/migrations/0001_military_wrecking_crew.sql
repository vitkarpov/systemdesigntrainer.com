CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255) NOT NULL,
	"product_type" varchar(20) NOT NULL,
	"interviews_granted" integer NOT NULL,
	"amount_paid" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "purchases_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workos_user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_username" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "transcript_messages" ADD COLUMN "status" varchar(20) DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "transcript_messages" ADD COLUMN "partial_text" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_purchases_user_id" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_payment_intent" ON "purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_subscription" ON "purchases" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_users_workos_user_id" ON "users" USING btree ("workos_user_id");--> statement-breakpoint
CREATE INDEX "idx_users_github_id" ON "users" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_subscription_status" ON "users" USING btree ("subscription_status");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workos_user_id_unique" UNIQUE("workos_user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_github_id_unique" UNIQUE("github_id");