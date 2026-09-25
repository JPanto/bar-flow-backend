ALTER TABLE "reservations" ALTER COLUMN "id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "table_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "restaurant_tables" ALTER COLUMN "id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "restaurant_tables" ALTER COLUMN "zone_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "table_sessions" ALTER COLUMN "id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "table_sessions" ALTER COLUMN "table_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "waiter_calls" ALTER COLUMN "id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "waiter_calls" ALTER COLUMN "table_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "waiter_calls" ALTER COLUMN "session_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "zones" ALTER COLUMN "id" SET DATA TYPE varchar(100);