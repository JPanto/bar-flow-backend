import { describe, it, expect, beforeEach } from 'vitest';
import { GetInitialStateUseCase } from '../../src/application/use-cases/GetInitialStateUseCase.js';
import { SyncOutboxBatchUseCase } from '../../src/application/use-cases/SyncOutboxBatchUseCase.js';
import { IZoneRepository } from '../../src/domain/repositories/IZoneRepository.js';
import { ITableRepository } from '../../src/domain/repositories/ITableRepository.js';
import { ITableSessionRepository } from '../../src/domain/repositories/ITableSessionRepository.js';
import { IWaiterCallRepository } from '../../src/domain/repositories/IWaiterCallRepository.js';
import { ISyncAuditRepository, SyncAuditRecord } from '../../src/domain/repositories/ISyncAuditRepository.js';
import { Zone } from '../../src/domain/entities/Zone.js';
import { RestaurantTable } from '../../src/domain/entities/Table.js';
import { TableSession } from '../../src/domain/entities/TableSession.js';
import { WaiterCall } from '../../src/domain/entities/WaiterCall.js';

class InMemoryZoneRepository implements IZoneRepository {
  public zones: Zone[] = [];
  async findById(id: string) { return this.zones.find(z => z.id === id) || null; }
  async findAll(tenantId: string = 'default') {
    return this.zones.filter(z => (z.tenantId ?? 'default') === tenantId);
  }
  async save(zone: Zone) { this.zones.push(zone); }
  async update(id: string, changes: Partial<Zone>) {
    const idx = this.zones.findIndex(z => z.id === id);
    if (idx !== -1) Object.assign(this.zones[idx], changes);
  }
}

class InMemoryTableRepository implements ITableRepository {
  public tables: RestaurantTable[] = [];
  async findById(id: string) { return this.tables.find(t => t.id === id) || null; }
  async findAll(tenantId: string = 'default') {
    return this.tables.filter(t => (t.tenantId ?? 'default') === tenantId);
  }
  async findByZoneId(zoneId: string, tenantId: string = 'default') {
    return this.tables.filter(t => t.zoneId === zoneId && (t.tenantId ?? 'default') === tenantId);
  }
  async save(table: RestaurantTable) { this.tables.push(table); }
  async update(id: string, changes: Partial<RestaurantTable>) {
    const idx = this.tables.findIndex(t => t.id === id);
    if (idx !== -1) Object.assign(this.tables[idx], changes);
  }
  async delete(id: string) { this.tables = this.tables.filter(t => t.id !== id); }
}

class InMemorySessionRepository implements ITableSessionRepository {
  public sessions: TableSession[] = [];
  async findById(id: string) { return this.sessions.find(s => s.id === id) || null; }
  async findActiveByTableId(tableId: string) { return this.sessions.find(s => s.tableId === tableId && s.status === 'active') || null; }
  async findActiveSessions(tenantId: string = 'default') {
    return this.sessions.filter(s => s.status === 'active' && (s.tenantId ?? 'default') === tenantId);
  }
  async save(session: TableSession) { this.sessions.push(session); }
  async update(id: string, changes: Partial<TableSession>) {
    const idx = this.sessions.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(this.sessions[idx], changes);
  }
  async closeActiveByTableId(tableId: string, timestamp: number) {
    this.sessions.filter(s => s.tableId === tableId && s.status === 'active').forEach(s => {
      s.status = 'closed';
      s.closedAt = timestamp;
    });
  }
}

class InMemoryCallRepository implements IWaiterCallRepository {
  public calls: WaiterCall[] = [];
  async findById(id: string) { return this.calls.find(c => c.id === id) || null; }
  async findActiveCalls(tenantId: string = 'default') {
    return this.calls.filter(c => (c.status === 'pending' || c.status === 'attending') && (c.tenantId ?? 'default') === tenantId);
  }
  async findByTableId(tableId: string) { return this.calls.filter(c => c.tableId === tableId); }
  async save(call: WaiterCall) { this.calls.push(call); }
  async update(id: string, changes: Partial<WaiterCall>) {
    const idx = this.calls.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(this.calls[idx], changes);
  }
}

class InMemorySyncAuditRepository implements ISyncAuditRepository {
  public records: SyncAuditRecord[] = [];
  async hasEventBeenProcessed(clientEventId: string) {
    return this.records.some(r => r.clientEventId === clientEventId);
  }
  async recordSync(record: SyncAuditRecord) { this.records.push(record); }
  async recordSyncBatch(records: SyncAuditRecord[]) { this.records.push(...records); }
}

describe('Multi-Tenant Data Isolation', () => {
  let zoneRepo: InMemoryZoneRepository;
  let tableRepo: InMemoryTableRepository;
  let sessionRepo: InMemorySessionRepository;
  let callRepo: InMemoryCallRepository;
  let syncAuditRepo: InMemorySyncAuditRepository;
  let initialStateUseCase: GetInitialStateUseCase;
  let syncUseCase: SyncOutboxBatchUseCase;

  beforeEach(async () => {
    zoneRepo = new InMemoryZoneRepository();
    tableRepo = new InMemoryTableRepository();
    sessionRepo = new InMemorySessionRepository();
    callRepo = new InMemoryCallRepository();
    syncAuditRepo = new InMemorySyncAuditRepository();

    initialStateUseCase = new GetInitialStateUseCase(zoneRepo, tableRepo, sessionRepo, callRepo);
    syncUseCase = new SyncOutboxBatchUseCase({
      syncAuditRepo,
      zoneRepo,
      tableRepo,
      sessionRepo,
      callRepo,
    });

    // Populate Tenant A: "bar-centro"
    await zoneRepo.save(new Zone({ id: 'z-a1', tenantId: 'bar-centro', name: 'Salón Principal', width: 1000, height: 800, isDefault: true, createdAt: 1000 }));
    await tableRepo.save(new RestaurantTable({ id: 't-a1', tenantId: 'bar-centro', zoneId: 'z-a1', name: 'Mesa Centro 1', shape: 'round', x: 10, y: 10, width: 80, height: 80, rotation: 0, seats: 4, status: 'occupied', updatedAt: 1000 }));
    await tableRepo.save(new RestaurantTable({ id: 't-a2', tenantId: 'bar-centro', zoneId: 'z-a1', name: 'Mesa Centro 2', shape: 'square', x: 100, y: 10, width: 80, height: 80, rotation: 0, seats: 2, status: 'available', updatedAt: 1000 }));
    await sessionRepo.save(new TableSession({ id: 's-a1', tenantId: 'bar-centro', tableId: 't-a1', sessionWord: 'CENTRO-01', status: 'active', openedAt: 1000 }));
    await callRepo.save(new WaiterCall({ id: 'c-a1', tenantId: 'bar-centro', tableId: 't-a1', sessionId: 's-a1', tableName: 'Mesa Centro 1', sessionWord: 'CENTRO-01', reason: 'waiter', status: 'pending', createdAt: 1000 }));

    // Populate Tenant B: "bar-rooftop"
    await zoneRepo.save(new Zone({ id: 'z-b1', tenantId: 'bar-rooftop', name: 'Terraza', width: 1200, height: 900, isDefault: true, createdAt: 1000 }));
    await zoneRepo.save(new Zone({ id: 'z-b2', tenantId: 'bar-rooftop', name: 'Barra', width: 600, height: 400, isDefault: false, createdAt: 1000 }));
    await tableRepo.save(new RestaurantTable({ id: 't-b1', tenantId: 'bar-rooftop', zoneId: 'z-b1', name: 'Mesa Sky 1', shape: 'round', x: 20, y: 20, width: 80, height: 80, rotation: 0, seats: 4, status: 'available', updatedAt: 1000 }));
    await tableRepo.save(new RestaurantTable({ id: 't-b2', tenantId: 'bar-rooftop', zoneId: 'z-b1', name: 'Mesa Sky 2', shape: 'square', x: 200, y: 20, width: 80, height: 80, rotation: 0, seats: 2, status: 'occupied', updatedAt: 1000 }));
    await tableRepo.save(new RestaurantTable({ id: 't-b3', tenantId: 'bar-rooftop', zoneId: 'z-b2', name: 'Barra 1', shape: 'counter', x: 300, y: 20, width: 120, height: 60, rotation: 0, seats: 6, status: 'occupied', updatedAt: 1000 }));
    await sessionRepo.save(new TableSession({ id: 's-b1', tenantId: 'bar-rooftop', tableId: 't-b2', sessionWord: 'ROOF-01', status: 'active', openedAt: 1000 }));
    await sessionRepo.save(new TableSession({ id: 's-b2', tenantId: 'bar-rooftop', tableId: 't-b3', sessionWord: 'ROOF-02', status: 'active', openedAt: 1000 }));
    await callRepo.save(new WaiterCall({ id: 'c-b1', tenantId: 'bar-rooftop', tableId: 't-b2', sessionId: 's-b1', tableName: 'Mesa Sky 2', sessionWord: 'ROOF-01', reason: 'bill', status: 'pending', createdAt: 1000 }));
    await callRepo.save(new WaiterCall({ id: 'c-b2', tenantId: 'bar-rooftop', tableId: 't-b3', sessionId: 's-b2', tableName: 'Barra 1', sessionWord: 'ROOF-02', reason: 'waiter', status: 'attending', createdAt: 1000 }));

    // Populate Default Tenant
    await zoneRepo.save(new Zone({ id: 'z-d1', tenantId: 'default', name: 'Zona General', width: 800, height: 600, isDefault: true, createdAt: 1000 }));
    await tableRepo.save(new RestaurantTable({ id: 't-d1', tenantId: 'default', zoneId: 'z-d1', name: 'Mesa Default 1', shape: 'square', x: 50, y: 50, width: 70, height: 70, rotation: 0, seats: 4, status: 'available', updatedAt: 1000 }));
  });

  it('GetInitialStateUseCase isolates data strictly for Tenant A ("bar-centro")', async () => {
    const stateA = await initialStateUseCase.execute('bar-centro');

    expect(stateA.zones).toHaveLength(1);
    expect(stateA.zones[0].id).toBe('z-a1');
    expect(stateA.tables).toHaveLength(2);
    expect(stateA.tables.map(t => t.name)).toEqual(['Mesa Centro 1', 'Mesa Centro 2']);
    expect(stateA.activeSessions).toHaveLength(1);
    expect(stateA.activeSessions[0].sessionWord).toBe('CENTRO-01');
    expect(stateA.activeCalls).toHaveLength(1);
    expect(stateA.activeCalls[0].tableName).toBe('Mesa Centro 1');
  });

  it('GetInitialStateUseCase isolates data strictly for Tenant B ("bar-rooftop")', async () => {
    const stateB = await initialStateUseCase.execute('bar-rooftop');

    expect(stateB.zones).toHaveLength(2);
    expect(stateB.zones.map(z => z.name)).toEqual(['Terraza', 'Barra']);
    expect(stateB.tables).toHaveLength(3);
    expect(stateB.tables.map(t => t.name)).toEqual(['Mesa Sky 1', 'Mesa Sky 2', 'Barra 1']);
    expect(stateB.activeSessions).toHaveLength(2);
    expect(stateB.activeCalls).toHaveLength(2);
    expect(stateB.activeCalls.map(c => c.reason)).toEqual(['bill', 'waiter']);
  });

  it('GetInitialStateUseCase falls back to "default" tenant when no argument is supplied', async () => {
    const stateDefault = await initialStateUseCase.execute();

    expect(stateDefault.zones).toHaveLength(1);
    expect(stateDefault.zones[0].name).toBe('Zona General');
    expect(stateDefault.tables).toHaveLength(1);
    expect(stateDefault.tables[0].name).toBe('Mesa Default 1');
    expect(stateDefault.activeSessions).toHaveLength(0);
    expect(stateDefault.activeCalls).toHaveLength(0);
  });

  it('SyncOutboxBatchUseCase associates synced entities to caller tenantId and preserves isolation', async () => {
    await syncUseCase.execute([
      {
        id: 'sync-new-tbl',
        entity: 'table',
        action: 'INSERT',
        entityId: 't-a3',
        payload: {
          id: 't-a3',
          zoneId: 'z-a1',
          name: 'Mesa Centro 3',
          shape: 'round',
          x: 200,
          y: 200,
          width: 80,
          height: 80,
          seats: 4,
          status: 'available',
        },
        createdAt: 2000,
      },
    ], 'bar-centro');

    const stateCentro = await initialStateUseCase.execute('bar-centro');
    expect(stateCentro.tables).toHaveLength(3);
    expect(stateCentro.tables.some(t => t.name === 'Mesa Centro 3')).toBe(true);

    // Tenant B still only has 3 tables
    const stateRooftop = await initialStateUseCase.execute('bar-rooftop');
    expect(stateRooftop.tables).toHaveLength(3);
    expect(stateRooftop.tables.some(t => t.name === 'Mesa Centro 3')).toBe(false);
  });
});
