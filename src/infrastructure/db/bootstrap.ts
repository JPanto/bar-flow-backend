import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type pg from 'pg';
import type { DatabaseInstance } from './client.js';

export function findMigrationsFolder(): string | null {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), 'drizzle'),
    path.resolve(process.cwd(), 'backend/drizzle'),
    path.resolve(currentDir, '../../../drizzle'),
    path.resolve(currentDir, '../../../../drizzle'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'meta/_journal.json'))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Executes idempotent DDL statements directly against PostgreSQL.
 * Guarantees that enums, tables, and indexes exist without throwing 42P01.
 */
export async function runIdempotentSchemaBootstrap(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Enums (Idempotent creation via pg_type check)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_shape') THEN
          CREATE TYPE "public"."table_shape" AS ENUM('round', 'square', 'rectangle', 'counter');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status') THEN
          CREATE TYPE "public"."table_status" AS ENUM('available', 'occupied', 'reserved', 'blocked');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_reason') THEN
          CREATE TYPE "public"."call_reason" AS ENUM('waiter', 'bill', 'help');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
          CREATE TYPE "public"."call_status" AS ENUM('pending', 'attending', 'resolved', 'cancelled');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
          CREATE TYPE "public"."reservation_status" AS ENUM('confirmed', 'seated', 'cancelled', 'no_show', 'completed');
        END IF;
      END $$;
    `);

    // 2. Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" varchar(50) PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL,
        "owner_email" varchar(150) NOT NULL,
        "created_at" bigint NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "tenant_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" varchar(50) REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
        "user_id" varchar(100) NOT NULL,
        "email" varchar(150) NOT NULL,
        "role" varchar(20) DEFAULT 'staff' NOT NULL,
        "created_at" bigint NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "zones" (
        "id" uuid PRIMARY KEY NOT NULL,
        "tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
        "name" varchar(100) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "is_default" boolean DEFAULT false NOT NULL,
        "created_at" bigint NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "restaurant_tables" (
        "id" uuid PRIMARY KEY NOT NULL,
        "tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
        "zone_id" uuid REFERENCES "zones"("id") ON DELETE CASCADE NOT NULL,
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

      CREATE TABLE IF NOT EXISTS "table_sessions" (
        "id" uuid PRIMARY KEY NOT NULL,
        "tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
        "table_id" uuid REFERENCES "restaurant_tables"("id") ON DELETE CASCADE NOT NULL,
        "session_word" varchar(50) NOT NULL,
        "status" varchar(20) NOT NULL,
        "opened_at" bigint NOT NULL,
        "closed_at" bigint
      );

      CREATE TABLE IF NOT EXISTS "waiter_calls" (
        "id" uuid PRIMARY KEY NOT NULL,
        "tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
        "table_id" uuid REFERENCES "restaurant_tables"("id") ON DELETE CASCADE NOT NULL,
        "session_id" uuid REFERENCES "table_sessions"("id") ON DELETE CASCADE NOT NULL,
        "table_name" varchar(50) NOT NULL,
        "session_word" varchar(50) NOT NULL,
        "reason" "call_reason" NOT NULL,
        "status" "call_status" DEFAULT 'pending' NOT NULL,
        "created_at" bigint NOT NULL,
        "attending_at" bigint,
        "resolved_at" bigint
      );

      CREATE TABLE IF NOT EXISTS "reservations" (
        "id" uuid PRIMARY KEY NOT NULL,
        "tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
        "table_id" uuid REFERENCES "restaurant_tables"("id") ON DELETE SET NULL,
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

      CREATE TABLE IF NOT EXISTS "sync_audit_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" varchar(50) DEFAULT 'default' NOT NULL,
        "client_event_id" varchar(100) NOT NULL,
        "entity" varchar(50) NOT NULL,
        "action" varchar(20) NOT NULL,
        "entity_id" varchar(100) NOT NULL,
        "synced_at" bigint NOT NULL
      );
    `);

    // 3. Indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_sync_client_event" ON "sync_audit_log" ("client_event_id");
      CREATE INDEX IF NOT EXISTS "idx_sync_tenant" ON "sync_audit_log" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "idx_zones_tenant" ON "zones" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "idx_tables_tenant" ON "restaurant_tables" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "idx_tables_zone" ON "restaurant_tables" ("zone_id");
      CREATE INDEX IF NOT EXISTS "idx_tables_status" ON "restaurant_tables" ("status");
      CREATE INDEX IF NOT EXISTS "idx_sessions_tenant" ON "table_sessions" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "idx_sessions_table_status" ON "table_sessions" ("table_id", "status");
      CREATE INDEX IF NOT EXISTS "idx_calls_tenant" ON "waiter_calls" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "idx_calls_status_created" ON "waiter_calls" ("status", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_reservations_tenant" ON "reservations" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "idx_reservations_date_status" ON "reservations" ("date", "status");
      CREATE INDEX IF NOT EXISTS "idx_tenant_users_tenant" ON "tenant_users" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "idx_tenant_users_user" ON "tenant_users" ("user_id");
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initializes database on startup: tries Drizzle migrator first, then idempotent DDL fallback.
 */
export async function initializeDatabase(
  db: DatabaseInstance,
  pool?: pg.Pool
): Promise<{ success: boolean; method: string }> {
  const migrationsFolder = findMigrationsFolder();

  if (migrationsFolder) {
    try {
      await migrate(db, { migrationsFolder });
      return { success: true, method: 'drizzle-migrator' };
    } catch (err: any) {
      console.warn(
        `[DB Bootstrap] Drizzle migrate failed: ${err.message}. Applying idempotent DDL fallback...`
      );
    }
  }

  if (pool) {
    await runIdempotentSchemaBootstrap(pool);
    return { success: true, method: 'idempotent-ddl' };
  }

  return { success: false, method: 'none' };
}
