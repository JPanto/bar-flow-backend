import { TableSession } from '../entities/TableSession.js';

export interface ITableSessionRepository {
  findById(id: string): Promise<TableSession | null>;
  findActiveByTableId(tableId: string): Promise<TableSession | null>;
  findActiveSessions(): Promise<TableSession[]>;
  save(session: TableSession): Promise<void>;
  update(id: string, session: Partial<TableSession>): Promise<void>;
  closeActiveByTableId(tableId: string, timestamp: number): Promise<void>;
}
