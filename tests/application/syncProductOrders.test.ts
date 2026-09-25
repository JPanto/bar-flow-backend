import { describe, it, expect, vi } from 'vitest';
import { SyncOutboxBatchUseCase } from '../../src/application/use-cases/SyncOutboxBatchUseCase.js';

function setupTestEnv() {
  const processedEvents = new Set<string>();
  const mockAuditRepo = {
    hasEventBeenProcessed: vi.fn(async (id: string) => processedEvents.has(id)),
    recordSync: vi.fn(async (rec: any) => { processedEvents.add(rec.clientEventId); }),
    recordSyncBatch: vi.fn(),
  };

  const mockProductRepo = {
    findCategoryById: vi.fn(),
    findAllCategories: vi.fn(),
    saveCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findByCategoryId: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    updateStock: vi.fn(),
    delete: vi.fn(),
  };

  const mockOrderRepo = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findBySessionId: vi.fn(),
    findByTableId: vi.fn(),
    findItemsByOrderId: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    saveItem: vi.fn(),
    delete: vi.fn(),
  };

  const mockWsHub = {
    registerClient: vi.fn(),
    removeClient: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    broadcastToAll: vi.fn(),
    broadcastToChannel: vi.fn(),
    getClientCount: vi.fn(() => 0),
  };

  const useCase = new SyncOutboxBatchUseCase({
    syncAuditRepo: mockAuditRepo as any,
    tableRepo: {} as any,
    sessionRepo: {} as any,
    callRepo: {} as any,
    productRepo: mockProductRepo as any,
    orderRepo: mockOrderRepo as any,
    wsHub: mockWsHub as any,
  });

  return { useCase, mockAuditRepo, mockProductRepo, mockOrderRepo, mockWsHub };
}

describe('SyncOutboxBatchUseCase - Products & Orders', () => {
  it('processes product insertion and deduplicates repeated clientEventId', async () => {
    const { useCase, mockAuditRepo, mockProductRepo } = setupTestEnv();
    const event = {
      id: 'evt-prod-1',
      entity: 'product' as any,
      action: 'INSERT' as any,
      entityId: 'prod-1',
      payload: { id: 'prod-1', categoryId: 'cat-1', name: 'Mojito Cubano', price: 18000, stock: 15 },
      timestamp: Date.now(),
    };

    const result1 = await useCase.execute([event]);
    expect(result1.syncedIds).toContain('evt-prod-1');
    expect(mockProductRepo.save).toHaveBeenCalledTimes(1);

    const result2 = await useCase.execute([event]);
    expect(result2.syncedIds).toContain('evt-prod-1');
    expect(mockAuditRepo.recordSync).toHaveBeenCalledTimes(1);
    expect(mockProductRepo.save).toHaveBeenCalledTimes(1);
  });

  it('processes category insertion, update and deletion', async () => {
    const { useCase, mockProductRepo } = setupTestEnv();

    await useCase.execute([{
      id: 'evt-cat-1',
      entity: 'category' as any,
      action: 'INSERT' as any,
      entityId: 'cat-1',
      payload: { id: 'cat-1', name: 'Cocteles', sortOrder: 1 },
      timestamp: Date.now(),
    }]);
    expect(mockProductRepo.saveCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cat-1', name: 'Cocteles', sortOrder: 1 })
    );

    await useCase.execute([{
      id: 'evt-cat-2',
      entity: 'category' as any,
      action: 'UPDATE' as any,
      entityId: 'cat-1',
      payload: { id: 'cat-1', name: 'Cocteles de Autor' },
      timestamp: Date.now(),
    }]);
    expect(mockProductRepo.updateCategory).toHaveBeenCalledWith('cat-1', { id: 'cat-1', name: 'Cocteles de Autor' });

    await useCase.execute([{
      id: 'evt-cat-3',
      entity: 'category' as any,
      action: 'DELETE' as any,
      entityId: 'cat-1',
      payload: { id: 'cat-1' },
      timestamp: Date.now(),
    }]);
    expect(mockProductRepo.deleteCategory).toHaveBeenCalledWith('cat-1');
  });

  it('processes product stock update and broadcasts STOCK_UPDATED', async () => {
    const { useCase, mockProductRepo, mockWsHub } = setupTestEnv();

    await useCase.execute([{
      id: 'evt-prod-stock',
      entity: 'product' as any,
      action: 'UPDATE' as any,
      entityId: 'prod-1',
      payload: { id: 'prod-1', stock: 10 },
      timestamp: Date.now(),
    }]);
    expect(mockProductRepo.update).toHaveBeenCalledWith('prod-1', { id: 'prod-1', stock: 10 });
    expect(mockWsHub.broadcastToAll).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STOCK_UPDATED',
        payload: { productId: 'prod-1', stock: 10 },
      })
    );
  });

  it('processes product_order insertion with order items and broadcasts ORDER_CREATED', async () => {
    const { useCase, mockOrderRepo, mockWsHub } = setupTestEnv();

    const result = await useCase.execute([{
      id: 'evt-order-1',
      entity: 'product_order' as any,
      action: 'INSERT' as any,
      entityId: 'ord-1',
      payload: {
        id: 'ord-1',
        tableId: 'tbl-1',
        sessionId: 'ses-1',
        tableName: 'Mesa 1',
        sessionWord: 'SOL',
        status: 'pending',
        totalAmount: 36000,
        items: [{ id: 'item-1', orderId: 'ord-1', productId: 'prod-1', productName: 'Mojito', unitPrice: 18000, quantity: 2 }],
      },
      timestamp: Date.now(),
    }]);

    expect(result.syncedIds).toContain('evt-order-1');
    expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
    expect(mockWsHub.broadcastToAll).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ORDER_CREATED',
        payload: expect.objectContaining({ id: 'ord-1', tableName: 'Mesa 1', totalAmount: 36000 }),
      })
    );
  });

  it('processes product_order confirmation, rejection, and deletion', async () => {
    const { useCase, mockOrderRepo, mockWsHub } = setupTestEnv();

    // Confirm
    await useCase.execute([{
      id: 'evt-confirm-ord-1',
      entity: 'product_order' as any,
      action: 'UPDATE' as any,
      entityId: 'ord-1',
      payload: { id: 'ord-1', status: 'confirmed', confirmedAt: 123456789 },
      timestamp: Date.now(),
    }]);
    expect(mockOrderRepo.update).toHaveBeenCalledWith('ord-1', { id: 'ord-1', status: 'confirmed', confirmedAt: 123456789 });
    expect(mockWsHub.broadcastToAll).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ORDER_CONFIRMED', payload: expect.objectContaining({ orderId: 'ord-1' }) })
    );

    // Reject
    await useCase.execute([{
      id: 'evt-reject-ord-2',
      entity: 'product_order' as any,
      action: 'UPDATE' as any,
      entityId: 'ord-2',
      payload: { id: 'ord-2', status: 'rejected' },
      timestamp: Date.now(),
    }]);
    expect(mockWsHub.broadcastToAll).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ORDER_REJECTED', payload: expect.objectContaining({ orderId: 'ord-2' }) })
    );

    // Delete
    await useCase.execute([{
      id: 'evt-del-ord-3',
      entity: 'product_order' as any,
      action: 'DELETE' as any,
      entityId: 'ord-3',
      payload: { id: 'ord-3' },
      timestamp: Date.now(),
    }]);
    expect(mockOrderRepo.delete).toHaveBeenCalledWith('ord-3');
  });
});
