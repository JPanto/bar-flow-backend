export interface SyncAuditRecord {
  id?: string;
  clientEventId: string;
  entity: string;
  action: string;
  entityId: string;
  syncedAt: number;
}

export interface ISyncAuditRepository {
  hasEventBeenProcessed(clientEventId: string): Promise<boolean>;
  recordSync(record: SyncAuditRecord): Promise<void>;
  recordSyncBatch(records: SyncAuditRecord[]): Promise<void>;
}
