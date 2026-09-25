import { IProductRepository } from '../../domain/repositories/IProductRepository.js';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository.js';
import { IWebSocketHub } from '../ports/IWebSocketHub.js';
import { ProductCategory } from '../../domain/entities/ProductCategory.js';
import { Product } from '../../domain/entities/Product.js';
import { ProductOrder } from '../../domain/entities/ProductOrder.js';
import { OrderItem } from '../../domain/entities/OrderItem.js';

export async function handleCategorySync(
  action: string,
  payload: any,
  entityId: string,
  tenantId: string,
  productRepo?: IProductRepository
): Promise<void> {
  if (!productRepo) return;
  if (action === 'INSERT') {
    const category = new ProductCategory({
      id: payload.id,
      tenantId: payload.tenantId || tenantId,
      name: payload.name,
      sortOrder: payload.sortOrder,
      createdAt: payload.createdAt || Date.now(),
    });
    await productRepo.saveCategory(category);
  } else if (action === 'UPDATE') {
    await productRepo.updateCategory(payload.id, payload);
  } else if (action === 'DELETE') {
    await productRepo.deleteCategory(payload.id || entityId);
  }
}

export async function handleProductSync(
  action: string,
  payload: any,
  entityId: string,
  tenantId: string,
  productRepo?: IProductRepository,
  wsHub?: IWebSocketHub
): Promise<void> {
  if (!productRepo) return;
  if (action === 'INSERT') {
    const product = new Product({
      id: payload.id,
      tenantId: payload.tenantId || tenantId,
      categoryId: payload.categoryId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      stock: payload.stock,
      isActive: payload.isActive,
      totalOrders: payload.totalOrders,
      updatedAt: payload.updatedAt || Date.now(),
    });
    await productRepo.save(product);
  } else if (action === 'UPDATE') {
    await productRepo.update(payload.id, payload);
    if (payload.stock !== undefined) {
      wsHub?.broadcastToAll({
        type: 'STOCK_UPDATED',
        payload: { productId: payload.id, stock: payload.stock },
        timestamp: Date.now(),
      });
    }
  } else if (action === 'DELETE') {
    await productRepo.delete(payload.id || entityId);
  }
}

export async function handleOrderSync(
  action: string,
  payload: any,
  entityId: string,
  tenantId: string,
  orderRepo?: IOrderRepository,
  wsHub?: IWebSocketHub
): Promise<void> {
  if (!orderRepo) return;
  if (action === 'INSERT') {
    const order = new ProductOrder({
      id: payload.id,
      tenantId: payload.tenantId || tenantId,
      tableId: payload.tableId,
      sessionId: payload.sessionId,
      tableName: payload.tableName,
      sessionWord: payload.sessionWord,
      status: payload.status || 'pending',
      totalAmount: payload.totalAmount,
      createdAt: payload.createdAt || Date.now(),
      confirmedAt: payload.confirmedAt,
    });

    const items = Array.isArray(payload.items)
      ? payload.items.map(
          (it: any) =>
            new OrderItem({
              id: it.id,
              orderId: it.orderId || payload.id,
              productId: it.productId,
              productName: it.productName,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              notes: it.notes,
            })
        )
      : undefined;

    await orderRepo.save(order, items);
    wsHub?.broadcastToAll({
      type: 'ORDER_CREATED',
      payload: { ...order, items },
      timestamp: Date.now(),
    });
  } else if (action === 'UPDATE') {
    await orderRepo.update(payload.id, payload);
    if (payload.status === 'confirmed') {
      wsHub?.broadcastToAll({
        type: 'ORDER_CONFIRMED',
        payload: { orderId: payload.id, ...payload },
        timestamp: Date.now(),
      });
    } else if (payload.status === 'rejected') {
      wsHub?.broadcastToAll({
        type: 'ORDER_REJECTED',
        payload: { orderId: payload.id, ...payload },
        timestamp: Date.now(),
      });
    }
  } else if (action === 'DELETE') {
    await orderRepo.delete(payload.id || entityId);
  }
}
