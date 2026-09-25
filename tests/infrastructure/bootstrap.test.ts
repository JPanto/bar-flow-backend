import { describe, it, expect, vi } from 'vitest';
import { findMigrationsFolder, initializeDatabase, runIdempotentSchemaBootstrap } from '../../src/infrastructure/db/bootstrap.js';

describe('Database Schema Bootstrap', () => {
  it('should successfully find the migrations folder containing meta/_journal.json', () => {
    const folder = findMigrationsFolder();
    expect(folder).not.toBeNull();
    expect(folder).toContain('drizzle');
  });

  it('should run idempotent DDL queries on a mock pool without errors', async () => {
    const executedQueries: string[] = [];
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        executedQueries.push(sql.trim());
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool: any = {
      connect: vi.fn(async () => mockClient),
    };

    await runIdempotentSchemaBootstrap(mockPool);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();

    // Verify critical tables are in the DDL
    const ddlCalls = executedQueries.join('\n');
    expect(ddlCalls).toContain('CREATE TABLE IF NOT EXISTS "sync_audit_log"');
    expect(ddlCalls).toContain('CREATE TABLE IF NOT EXISTS "zones"');
    expect(ddlCalls).toContain('CREATE TABLE IF NOT EXISTS "restaurant_tables"');
    expect(ddlCalls).toContain('CREATE TABLE IF NOT EXISTS "table_sessions"');
    expect(ddlCalls).toContain('CREATE TABLE IF NOT EXISTS "waiter_calls"');
    expect(ddlCalls).toContain('CREATE TABLE IF NOT EXISTS "reservations"');
    expect(ddlCalls).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "uq_sync_client_event"');
  });

  it('should rollback transaction and release client if DDL fails', async () => {
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('DO $$')) {
          throw new Error('Postgres syntax error');
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool: any = {
      connect: vi.fn(async () => mockClient),
    };

    await expect(runIdempotentSchemaBootstrap(mockPool)).rejects.toThrow('Postgres syntax error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
