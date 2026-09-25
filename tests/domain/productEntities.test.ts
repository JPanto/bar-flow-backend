import { describe, it, expect } from 'vitest';
import { ProductCategory } from '../../src/domain/entities/ProductCategory.js';
import { Product } from '../../src/domain/entities/Product.js';
import { OrderItem } from '../../src/domain/entities/OrderItem.js';
import { ProductOrder } from '../../src/domain/entities/ProductOrder.js';

describe('Product & Order Domain Entities', () => {
  it('instantiates a Product with stock and totalOrders', () => {
    const p = new Product({
      id: 'prod-1',
      tenantId: 'default',
      categoryId: 'cat-1',
      name: 'Cerveza Corona',
      description: '355ml fría',
      price: 12000,
      stock: 24,
      isActive: true,
      totalOrders: 10,
      updatedAt: Date.now(),
    });

    expect(p.id).toBe('prod-1');
    expect(p.stock).toBe(24);
    expect(p.totalOrders).toBe(10);
  });

  it('validates stock decrement helper', () => {
    const p = new Product({
      id: 'prod-1',
      tenantId: 'default',
      categoryId: 'cat-1',
      name: 'Cerveza Corona',
      price: 12000,
      stock: 5,
      updatedAt: Date.now(),
    });

    const decremented = p.decrementStock(3);
    expect(decremented.stock).toBe(2);
    expect(decremented.totalOrders).toBe(3);
  });

  it('instantiates a ProductCategory with defaults', () => {
    const category = new ProductCategory({
      id: 'cat-1',
      name: 'Bebidas',
    });

    expect(category.id).toBe('cat-1');
    expect(category.tenantId).toBe('default');
    expect(category.name).toBe('Bebidas');
    expect(category.sortOrder).toBe(0);
    expect(category.createdAt).toBeGreaterThan(0);
  });

  it('prevents negative stock on Product initialization and decrement', () => {
    const p1 = new Product({
      id: 'prod-neg',
      categoryId: 'cat-1',
      name: 'Item',
      price: 1000,
      stock: -5,
    });
    expect(p1.stock).toBe(0);

    const decremented = p1.decrementStock(10);
    expect(decremented.stock).toBe(0);
    expect(decremented.totalOrders).toBe(10);
  });

  it('instantiates an OrderItem correctly', () => {
    const item = new OrderItem({
      id: 'item-1',
      orderId: 'order-1',
      productId: 'prod-1',
      productName: 'Cerveza Corona',
      unitPrice: 12000,
      quantity: 2,
      notes: 'Sin limón',
    });

    expect(item.id).toBe('item-1');
    expect(item.orderId).toBe('order-1');
    expect(item.productId).toBe('prod-1');
    expect(item.productName).toBe('Cerveza Corona');
    expect(item.unitPrice).toBe(12000);
    expect(item.quantity).toBe(2);
    expect(item.notes).toBe('Sin limón');
  });

  it('instantiates a ProductOrder with pending status', () => {
    const o = new ProductOrder({
      id: 'order-1',
      tenantId: 'default',
      tableId: 'table-1',
      sessionId: 'sess-1',
      tableName: 'Mesa 1',
      sessionWord: 'rio-azul',
      status: 'pending',
      totalAmount: 24000,
      createdAt: Date.now(),
    });

    expect(o.status).toBe('pending');
    expect(o.totalAmount).toBe(24000);
  });
});
