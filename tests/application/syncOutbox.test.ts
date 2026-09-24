import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncOutboxBatchUseCase } from '../../src/application/use-cases/SyncOutboxBatchUseCase.js';
import { ISyncAuditRepository, SyncAuditRecord } from '../../src/domain/repositories/ISyncAuditRepository.js';
import { ITableRepository } from '../../src/domain/repositories/ITableRepository.js';
import { ITableSessionRepository } from '../../src/domain/repositories/ITableSessionRepository.js';
import { IWaiterCallRepository } from '../../src/domain/repositories/IWaiterCallRepository.js';
import { IWebSocketHub, RealtimeMessage } from '../../src/application/ports/IWebSocketHub.js';
import { SyncEventDTO } from '../../src/application/dtos/syncDto.js';

class MockSyncAuditRepository implements ISyncAuditRepository {
  private records = new Set<string>();

  async hasEventBeenProcessed(clientEventId: string): Promise<boolean> {
    return this.records.has(clientEventId);
  }

  async recordSync(record: SyncAuditRecord): Promise<void> {
    this.records.add(record.clientEventId);
  }

  async recordSyncBatch(records: SyncAuditRecord[]): Promise<void> {
    for (const r of records) {
      this.records.add(r.clientEventId);
    }
  }
}

class MockTableRepository implements ITableRepository {
  public tables: any[] = [];
  async findById(id: string) { return this.tables.find(t => t.id === id) || null; }
  async findAll() { return this.tables; }
  async findByZoneId(zoneId: string) { return this.tables.filter(t => t.zoneId === zoneId); }
  async save(table: any) { this.tables.push(table); }
  async update(id: string, changes: any) {
    const idx = this.tables.findIndex(t => t.id === id);
    if (idx !== -1) Object.assign(this.tables[idx], changes);
  }
  async delete(id: string) { this.tables = this.tables.filter(t => t.id !== id); }
}

class MockSessionRepository implements ITableSessionRepository {
  public sessions: any[] = [];
  async findById(id: string) { return this.sessions.find(s => s.id === id) || null; }
  async findActiveByTableId(tableId: string) { return this.sessions.find(s => s.tableId === tableId && s.status === 'active') || null; }
  async findActiveSessions() { return this.sessions.filter(s => s.status === 'active'); }
  async save(session: any) { this.sessions.push(session); }
  async update(id: string, changes: any) {
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

class MockCallRepository implements IWaiterCallRepository {
  public calls: any[] = [];
  async findById(id: string) { return this.calls.find(c => c.id === id) || null; }
  async findActiveCalls() { return this.calls.filter(c => c.status === 'pending' || c.status === 'attending'); }
  async findByTableId(tableId: string) { return this.calls.filter(c => c.tableId === tableId); }
  async save(call: any) { this.calls.push(call); }
  async update(id: string, changes: any) {
    const idx = this.calls.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(this.calls[idx], changes);
  }
}

class MockWebSocketHub implements IWebSocketHub {
  public messages: RealtimeMessage[] = [];
  broadcastToAll(message: RealtimeMessage): void {
    this.messages.push(message);
  }
  broadcastToChannel(channel: string, message: RealtimeMessage): void {
    this.messages.push(message);
  }
}

describe('SyncOutboxBatchUseCase', () => {
  let syncAuditRepo: MockSyncAuditRepository;
  let tableRepo: MockTableRepository;
  let sessionRepo: MockSessionRepository;
  let callRepo: MockCallRepository;
  let wsHub: MockWebSocketHub;
  let useCase: SyncOutboxBatchUseCase;

  beforeEach(() => {
    syncAuditRepo = new MockSyncAuditRepository();
    tableRepo = new MockTableRepository();
    sessionRepo = new MockSessionRepository();
    callRepo = new MockCallRepository();
    wsHub = new MockWebSocketHub();

    useCase = new SyncOutboxBatchUseCase({
      syncAuditRepo,
      tableRepo,
      sessionRepo,
      callRepo,
      wsHub,
    });
  });

  it('should process new outbox events and broadcast corresponding realtime messages', async () => {
    const events: SyncEventDTO[] = [
      {
        id: 'evt-1',
        entity: 'table_session',
        action: 'INSERT',
        entityId: 'sess-1',
        payload: {
          id: 'sess-1',
          tableId: 'tbl-1',
          sessionWord: 'MOJITO-24',
          status: 'active',
          openedAt: 1727189500000,
        },
        createdAt: 1727189500000,
      },
      {
        id: 'evt-2',
        entity: 'waiter_call',
        action: 'INSERT',
        entityId: 'call-1',
        payload: {
          id: 'call-1',
          tableId: 'tbl-1',
          sessionId: 'sess-1',
          tableName: 'Mesa 1',
          sessionWord: 'MOJITO-24',
          reason: 'waiter',
          status: 'pending',
          createdAt: 1727189510000,
        },
        createdAt: 1727189510000,
      },
    ];

    const result = await useCase.execute(events);

    expect(result.syncedIds).toEqual(['evt-1', 'evt-2']);
    expect(await syncAuditRepo.hasEventBeenProcessed('evt-1')).toBe(true);
    expect(await syncAuditRepo.hasEventBeenProcessed('evt-2')).toBe(true);
    expect(sessionRepo.sessions).toHaveLength(1);
    expect(callRepo.calls).toHaveLength(1);
    expect(wsHub.messages).toHaveLength(2);
    expect(wsHub.messages[0].type).toBe('SESSION_STARTED');
    expect(wsHub.messages[1].type).toBe('CALL_CREATED');
  });

  it('should be idempotent and skip already processed events without re-broadcasting', async () => {
    const event: SyncEventDTO = {
      id: 'evt-duplicate',
      entity: 'table_session',
      action: 'INSERT',
      entityId: 'sess-dup',
      payload: {
        id: 'sess-dup',
        tableId: 'tbl-1',
        sessionWord: 'GIN-10',
        status: 'active',
        openedAt: 1727189500000,
      },
      createdAt: 1727189500000,
    };

    // First time
    const res1 = await useCase.execute([event]);
    expect(res1.syncedIds).toEqual(['evt-duplicate']);
    expect(wsHub.messages).toHaveLength(1);

    // Second time (retry)
    const res2 = await useCase.execute([event]);
    expect(res2.syncedIds).toEqual(['evt-duplicate']);
    // No duplicate sessions or duplicate WS messages
    expect(sessionRepo.sessions).toHaveLength(1);
    expect(wsHub.messages).toHaveLength(1);
  });
});
