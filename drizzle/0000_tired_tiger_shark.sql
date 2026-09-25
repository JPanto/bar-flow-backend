CREATE TYPE "public"."call_reason" AS ENUM('waiter', 'bill', 'help');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('pending', 'attending', 'resolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('confirmed', 'seated', 'cancelled', 'no_show', 'completed');--> statement-breakpoint
CREATE TYPE "public"."table_shape" AS ENUM('round', 'square', 'rectangle', 'counter');--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('available', 'occupied', 'reserved', 'blocked');--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"table_id" uuid,
	"customer_name" varchar(150) NOT NULL,
	"customer_phone" varchar(30) NOT NULL,
	"customer_email" varchar(150),
	"date" varchar(10) NOT NULL,
	"time" varchar(10) NOT NULL,
	"pax" integer NOT NULL,
	"notes" text,
	"status" "reservation_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"zone_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"shape" "table_shape" NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"rotation" integer DEFAULT 0 NOT NULL,
	"seats" integer NOT NULL,
	"status" "table_status" DEFAULT 'available' NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"client_event_id" varchar(100) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"action" varchar(20) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"synced_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"table_id" uuid NOT NULL,
	"session_word" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"opened_at" bigint NOT NULL,
	"closed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"owner_email" varchar(150) NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waiter_calls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"table_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"table_name" varchar(50) NOT NULL,
	"session_word" varchar(50) NOT NULL,
	"reason" "call_reason" NOT NULL,
	"status" "call_status" DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"attending_at" bigint,
	"resolved_at" bigint
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"name" varchar(100) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiter_calls" ADD CONSTRAINT "waiter_calls_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiter_calls" ADD CONSTRAINT "waiter_calls_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reservations_tenant" ON "reservations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_date_status" ON "reservations" USING btree ("date","status");--> statement-breakpoint
CREATE INDEX "idx_tables_tenant" ON "restaurant_tables" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tables_zone" ON "restaurant_tables" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "idx_tables_status" ON "restaurant_tables" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sync_client_event" ON "sync_audit_log" USING btree ("client_event_id");--> statement-breakpoint
CREATE INDEX "idx_sync_tenant" ON "sync_audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_tenant" ON "table_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_table_status" ON "table_sessions" USING btree ("table_id","status");--> statement-breakpoint
CREATE INDEX "idx_tenant_users_tenant" ON "tenant_users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_users_user" ON "tenant_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_calls_tenant" ON "waiter_calls" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_calls_status_created" ON "waiter_calls" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_zones_tenant" ON "zones" USING btree ("tenant_id");