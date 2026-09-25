import { ProductOrder, OrderStatus } from '../entities/ProductOrder.js';
import { OrderItem } from '../entities/OrderItem.js';

export interface IOrderRepository {
  findById(id: string): Promise<ProductOrder | null>;
  findAll(tenantId?: string): Promise<ProductOrder[]>;
  findBySessionId(sessionId: string, tenantId?: string): Promise<ProductOrder[]>;
  findByTableId(tableId: string, tenantId?: string): Promise<ProductOrder[]>;
  findItemsByOrderId(orderId: string): Promise<OrderItem[]>;
  save(order: ProductOrder, items?: OrderItem[]): Promise<void>;
  update(id: string, changes: Partial<ProductOrder>): Promise<void>;
  updateStatus(id: string, status: OrderStatus, confirmedAt?: number): Promise<void>;
  saveItem(item: OrderItem): Promise<void>;
  delete(id: string): Promise<void>;
}
