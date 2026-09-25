CREATE TABLE "order_items" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_orders" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"table_id" varchar(100) NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"table_name" varchar(50) NOT NULL,
	"session_word" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_amount" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"confirmed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"category_id" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."product_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_categories_tenant" ON "product_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_orders_tenant" ON "product_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_orders_table" ON "product_orders" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "idx_orders_session" ON "product_orders" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "product_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "product_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_products_tenant" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_products_active" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_products_total_orders" ON "products" USING btree ("total_orders");