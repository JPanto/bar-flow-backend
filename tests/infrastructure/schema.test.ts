import { describe, it, expect } from 'vitest';
import * as schema from '../../src/infrastructure/db/schema.js';

describe('Drizzle Database Schema Definitions', () => {
  it('should export all database tables including tenants', () => {
    expect(schema.tenants).toBeDefined();
    expect(schema.tenantUsers).toBeDefined();
    expect(schema.zones).toBeDefined();
    expect(schema.restaurantTables).toBeDefined();
    expect(schema.tableSessions).toBeDefined();
    expect(schema.waiterCalls).toBeDefined();
    expect(schema.reservations).toBeDefined();
    expect(schema.syncAuditLog).toBeDefined();
  });

  it('should have tenantId column on all domain and sync tables', () => {
    expect(schema.zones.tenantId).toBeDefined();
    expect(schema.restaurantTables.tenantId).toBeDefined();
    expect(schema.tableSessions.tenantId).toBeDefined();
    expect(schema.waiterCalls.tenantId).toBeDefined();
    expect(schema.reservations.tenantId).toBeDefined();
    expect(schema.syncAuditLog.tenantId).toBeDefined();
  });

  it('should export enum definitions', () => {
    expect(schema.tableShapeEnum).toBeDefined();
    expect(schema.tableStatusEnum).toBeDefined();
    expect(schema.callReasonEnum).toBeDefined();
    expect(schema.callStatusEnum).toBeDefined();
    expect(schema.reservationStatusEnum).toBeDefined();
  });
});
