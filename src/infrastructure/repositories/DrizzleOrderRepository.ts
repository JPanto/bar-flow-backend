import { eq, and } from 'drizzle-orm';
import { DatabaseInstance } from '../db/client.js';
import { productOrders, orderItems } from '../db/schema.js';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository.js';
import { ProductOrder, OrderStatus } from '../../domain/entities/ProductOrder.js';
import { OrderItem } from '../../domain/entities/OrderItem.js';

export class DrizzleOrderRepository implements IOrderRepository {
  constructor(private db: DatabaseInstance) {}

  public async findById(id: string): Promise<ProductOrder | null> {
    const rows = await this.db
      .select()
      .from(productOrders)
      .where(eq(productOrders.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return new ProductOrder({
      ...rows[0],
      status: rows[0].status as OrderStatus,
      confirmedAt: rows[0].confirmedAt ?? undefined,
    });
  }

  public async findAll(tenantId: string = 'default'): Promise<ProductOrder[]> {
    const rows = await this.db
      .select()
      .from(productOrders)
      .where(eq(productOrders.tenantId, tenantId));

    return rows.map((r) => new ProductOrder({
      ...r,
      status: r.status as OrderStatus,
      confirmedAt: r.confirmedAt ?? undefined,
    }));
  }

  public async findBySessionId(sessionId: string, tenantId: string = 'default'): Promise<ProductOrder[]> {
    const rows = await this.db
      .select()
      .from(productOrders)
      .where(
        and(
          eq(productOrders.sessionId, sessionId),
          eq(productOrders.tenantId, tenantId)
        )
      );

    return rows.map((r) => new ProductOrder({
      ...r,
      status: r.status as OrderStatus,
      confirmedAt: r.confirmedAt ?? undefined,
    }));
  }

  public async findByTableId(tableId: string, tenantId: string = 'default'): Promise<ProductOrder[]> {
    const rows = await this.db
      .select()
      .from(productOrders)
      .where(
        and(
          eq(productOrders.tableId, tableId),
          eq(productOrders.tenantId, tenantId)
        )
      );

    return rows.map((r) => new ProductOrder({
      ...r,
      status: r.status as OrderStatus,
      confirmedAt: r.confirmedAt ?? undefined,
    }));
  }

  public async findItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    const rows = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return rows.map((r) => new OrderItem({
      ...r,
      notes: r.notes ?? undefined,
    }));
  }

  public async save(order: ProductOrder, items?: OrderItem[]): Promise<void> {
    await this.db
      .insert(productOrders)
      .values({
        id: order.id,
        tenantId: order.tenantId ?? 'default',
        tableId: order.tableId,
        sessionId: order.sessionId,
        tableName: order.tableName,
        sessionWord: order.sessionWord,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        confirmedAt: order.confirmedAt,
      })
      .onConflictDoUpdate({
        target: productOrders.id,
        set: {
          tenantId: order.tenantId ?? 'default',
          tableName: order.tableName,
          sessionWord: order.sessionWord,
          status: order.status,
          totalAmount: order.totalAmount,
          confirmedAt: order.confirmedAt,
        },
      });

    if (items && items.length > 0) {
      for (const item of items) {
        await this.saveItem(item);
      }
    }
  }

  public async update(id: string, changes: Partial<ProductOrder>): Promise<void> {
    await this.db
      .update(productOrders)
      .set(changes)
      .where(eq(productOrders.id, id));
  }

  public async updateStatus(id: string, status: OrderStatus, confirmedAt?: number): Promise<void> {
    const setPayload: Record<string, unknown> = { status };
    if (confirmedAt !== undefined) {
      setPayload.confirmedAt = confirmedAt;
    }

    await this.db
      .update(productOrders)
      .set(setPayload)
      .where(eq(productOrders.id, id));
  }

  public async saveItem(item: OrderItem): Promise<void> {
    await this.db
      .insert(orderItems)
      .values({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        notes: item.notes,
      })
      .onConflictDoUpdate({
        target: orderItems.id,
        set: {
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          notes: item.notes,
        },
      });
  }

  public async delete(id: string): Promise<void> {
    await this.db
      .delete(productOrders)
      .where(eq(productOrders.id, id));
  }
}
