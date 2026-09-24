import { eq, or, and } from 'drizzle-orm';
import { DatabaseInstance } from '../db/client.js';
import { waiterCalls } from '../db/schema.js';
import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';
import { WaiterCall } from '../../domain/entities/WaiterCall.js';

export class DrizzleCallRepository implements IWaiterCallRepository {
  constructor(private db: DatabaseInstance) {}

  public async findById(id: string): Promise<WaiterCall | null> {
    const rows = await this.db
      .select()
      .from(waiterCalls)
      .where(eq(waiterCalls.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return new WaiterCall(rows[0]);
  }

  public async findActiveCalls(tenantId: string = 'default'): Promise<WaiterCall[]> {
    const rows = await this.db
      .select()
      .from(waiterCalls)
      .where(
        and(
          eq(waiterCalls.tenantId, tenantId),
          or(eq(waiterCalls.status, 'pending'), eq(waiterCalls.status, 'attending'))
        )
      )
      .orderBy(waiterCalls.createdAt);

    return rows.map((r) => new WaiterCall(r));
  }

  public async findByTableId(tableId: string): Promise<WaiterCall[]> {
    const rows = await this.db
      .select()
      .from(waiterCalls)
      .where(eq(waiterCalls.tableId, tableId));

    return rows.map((r) => new WaiterCall(r));
  }

  public async save(call: WaiterCall): Promise<void> {
    await this.db
      .insert(waiterCalls)
      .values({
        id: call.id,
        tenantId: call.tenantId ?? 'default',
        tableId: call.tableId,
        sessionId: call.sessionId,
        tableName: call.tableName,
        sessionWord: call.sessionWord,
        reason: call.reason,
        status: call.status,
        createdAt: call.createdAt,
        attendingAt: call.attendingAt,
        resolvedAt: call.resolvedAt,
      })
      .onConflictDoUpdate({
        target: waiterCalls.id,
        set: {
          tenantId: call.tenantId ?? 'default',
          reason: call.reason,
          status: call.status,
          attendingAt: call.attendingAt,
          resolvedAt: call.resolvedAt,
        },
      });
  }

  public async update(id: string, call: Partial<WaiterCall>): Promise<void> {
    await this.db
      .update(waiterCalls)
      .set(call)
      .where(eq(waiterCalls.id, id));
  }
}
