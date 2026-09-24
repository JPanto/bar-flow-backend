import { eq, and } from 'drizzle-orm';
import { DatabaseInstance } from '../db/client.js';
import { tableSessions } from '../db/schema.js';
import { ITableSessionRepository } from '../../domain/repositories/ITableSessionRepository.js';
import { TableSession } from '../../domain/entities/TableSession.js';

export class DrizzleSessionRepository implements ITableSessionRepository {
  constructor(private db: DatabaseInstance) {}

  public async findById(id: string): Promise<TableSession | null> {
    const rows = await this.db
      .select()
      .from(tableSessions)
      .where(eq(tableSessions.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return new TableSession({
      ...rows[0],
      status: rows[0].status as 'active' | 'closed',
    });
  }

  public async findActiveByTableId(tableId: string): Promise<TableSession | null> {
    const rows = await this.db
      .select()
      .from(tableSessions)
      .where(
        and(eq(tableSessions.tableId, tableId), eq(tableSessions.status, 'active'))
      )
      .limit(1);

    if (rows.length === 0) return null;
    return new TableSession({
      ...rows[0],
      status: rows[0].status as 'active' | 'closed',
    });
  }

  public async findActiveSessions(): Promise<TableSession[]> {
    const rows = await this.db
      .select()
      .from(tableSessions)
      .where(eq(tableSessions.status, 'active'));

    return rows.map(
      (r) =>
        new TableSession({
          ...r,
          status: r.status as 'active' | 'closed',
        })
    );
  }

  public async save(session: TableSession): Promise<void> {
    await this.db
      .insert(tableSessions)
      .values({
        id: session.id,
        tableId: session.tableId,
        sessionWord: session.sessionWord,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
      })
      .onConflictDoUpdate({
        target: tableSessions.id,
        set: {
          sessionWord: session.sessionWord,
          status: session.status,
          closedAt: session.closedAt,
        },
      });
  }

  public async update(id: string, session: Partial<TableSession>): Promise<void> {
    await this.db
      .update(tableSessions)
      .set(session)
      .where(eq(tableSessions.id, id));
  }

  public async closeActiveByTableId(tableId: string, timestamp: number): Promise<void> {
    await this.db
      .update(tableSessions)
      .set({
        status: 'closed',
        closedAt: timestamp,
      })
      .where(
        and(eq(tableSessions.tableId, tableId), eq(tableSessions.status, 'active'))
      );
  }
}
