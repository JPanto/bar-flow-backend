import { eq } from 'drizzle-orm';
import { DatabaseInstance } from '../db/client.js';
import { syncAuditLog } from '../db/schema.js';
import {
  ISyncAuditRepository,
  SyncAuditRecord,
} from '../../domain/repositories/ISyncAuditRepository.js';

export class DrizzleSyncAuditRepository implements ISyncAuditRepository {
  constructor(private db: DatabaseInstance) {}

  public async hasEventBeenProcessed(clientEventId: string): Promise<boolean> {
    const records = await this.db
      .select({ id: syncAuditLog.id })
      .from(syncAuditLog)
      .where(eq(syncAuditLog.clientEventId, clientEventId))
      .limit(1);

    return records.length > 0;
  }

  public async recordSync(record: SyncAuditRecord): Promise<void> {
    await this.db.insert(syncAuditLog).values({
      tenantId: record.tenantId ?? 'default',
      clientEventId: record.clientEventId,
      entity: record.entity,
      action: record.action,
      entityId: record.entityId,
      syncedAt: record.syncedAt,
    });
  }

  public async recordSyncBatch(records: SyncAuditRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.db.insert(syncAuditLog).values(
      records.map((r) => ({
        tenantId: r.tenantId ?? 'default',
        clientEventId: r.clientEventId,
        entity: r.entity,
        action: r.action,
        entityId: r.entityId,
        syncedAt: r.syncedAt,
      }))
    );
  }
}
