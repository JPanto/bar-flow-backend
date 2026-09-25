import { ISyncAuditRepository } from '../../domain/repositories/ISyncAuditRepository.js';
import { IZoneRepository } from '../../domain/repositories/IZoneRepository.js';
import { ITableRepository } from '../../domain/repositories/ITableRepository.js';
import { ITableSessionRepository } from '../../domain/repositories/ITableSessionRepository.js';
import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';
import { IProductRepository } from '../../domain/repositories/IProductRepository.js';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository.js';
import { IWebSocketHub } from '../ports/IWebSocketHub.js';
import { SyncEventDTO } from '../dtos/syncDto.js';
import { Zone } from '../../domain/entities/Zone.js';
import { RestaurantTable } from '../../domain/entities/Table.js';
import { TableSession } from '../../domain/entities/TableSession.js';
import { WaiterCall } from '../../domain/entities/WaiterCall.js';
import {
  handleCategorySync,
  handleProductSync,
  handleOrderSync,
} from './syncProductOrderHandlers.js';

export interface SyncOutboxBatchDependencies {
  syncAuditRepo: ISyncAuditRepository;
  zoneRepo?: IZoneRepository;
  tableRepo: ITableRepository;
  sessionRepo: ITableSessionRepository;
  callRepo: IWaiterCallRepository;
  productRepo?: IProductRepository;
  orderRepo?: IOrderRepository;
  wsHub?: IWebSocketHub;
}

export interface SyncBatchResult {
  success: boolean;
  syncedIds: string[];
  processedAt: number;
}

export class SyncOutboxBatchUseCase {
  private syncAuditRepo: ISyncAuditRepository;
  private zoneRepo?: IZoneRepository;
  private tableRepo: ITableRepository;
  private sessionRepo: ITableSessionRepository;
  private callRepo: IWaiterCallRepository;
  private productRepo?: IProductRepository;
  private orderRepo?: IOrderRepository;
  private wsHub?: IWebSocketHub;

  constructor(deps: SyncOutboxBatchDependencies) {
    this.syncAuditRepo = deps.syncAuditRepo;
    this.zoneRepo = deps.zoneRepo;
    this.tableRepo = deps.tableRepo;
    this.sessionRepo = deps.sessionRepo;
    this.callRepo = deps.callRepo;
    this.productRepo = deps.productRepo;
    this.orderRepo = deps.orderRepo;
    this.wsHub = deps.wsHub;
  }

  public async execute(
    events: SyncEventDTO[],
    tenantId: string = 'default'
  ): Promise<SyncBatchResult> {
    const syncedIds: string[] = [];

    for (const event of events) {
      // 1. Idempotency Check: Skip already processed events
      const alreadyProcessed = await this.syncAuditRepo.hasEventBeenProcessed(event.id);
      if (alreadyProcessed) {
        syncedIds.push(event.id);
        continue;
      }

      // 2. Process mutation per entity type
      await this.processEvent(event, tenantId);

      // 3. Record in audit log
      await this.syncAuditRepo.recordSync({
        tenantId,
        clientEventId: event.id,
        entity: event.entity,
        action: event.action,
        entityId: event.entityId,
        syncedAt: Date.now(),
      });

      syncedIds.push(event.id);
    }

    return {
      success: true,
      syncedIds,
      processedAt: Date.now(),
    };
  }

  private async processEvent(event: SyncEventDTO, tenantId: string): Promise<void> {
    const { entity, action, payload } = event;

    switch (entity) {
      case 'table_session':
        await this.handleSessionEvent(action, payload, tenantId);
        break;
      case 'waiter_call':
        await this.handleCallEvent(action, payload, tenantId);
        break;
      case 'table':
        await this.handleTableEvent(action, payload, event.entityId, tenantId);
        break;
      case 'zone':
        await this.handleZoneEvent(action, payload, tenantId);
        break;
      case 'category':
        await handleCategorySync(action, payload, event.entityId, tenantId, this.productRepo);
        break;
      case 'product':
        await handleProductSync(action, payload, event.entityId, tenantId, this.productRepo, this.wsHub);
        break;
      case 'product_order':
        await handleOrderSync(action, payload, event.entityId, tenantId, this.orderRepo, this.wsHub);
        break;
      default:
        break;
    }
  }

  private async handleSessionEvent(action: string, payload: any, tenantId: string): Promise<void> {
    if (action === 'INSERT') {
      const session = new TableSession({
        id: payload.id,
        tenantId: payload.tenantId || tenantId,
        tableId: payload.tableId,
        sessionWord: payload.sessionWord,
        status: payload.status || 'active',
        openedAt: payload.openedAt || Date.now(),
        closedAt: payload.closedAt,
      });
      await this.sessionRepo.save(session);
      this.wsHub?.broadcastToAll({ type: 'SESSION_STARTED', payload: session, timestamp: Date.now() });
    } else if (action === 'UPDATE') {
      await this.sessionRepo.update(payload.id, payload);
      if (payload.status === 'closed') {
        this.wsHub?.broadcastToAll({ type: 'SESSION_CLOSED', payload: { tableId: payload.tableId }, timestamp: Date.now() });
      }
    }
  }

  private async handleCallEvent(action: string, payload: any, tenantId: string): Promise<void> {
    if (action === 'INSERT') {
      const call = new WaiterCall({
        id: payload.id,
        tenantId: payload.tenantId || tenantId,
        tableId: payload.tableId,
        sessionId: payload.sessionId,
        tableName: payload.tableName,
        sessionWord: payload.sessionWord,
        reason: payload.reason,
        status: payload.status || 'pending',
        createdAt: payload.createdAt || Date.now(),
        attendingAt: payload.attendingAt,
        resolvedAt: payload.resolvedAt,
      });
      await this.callRepo.save(call);
      this.wsHub?.broadcastToAll({ type: 'CALL_CREATED', payload: call, timestamp: Date.now() });
    } else if (action === 'UPDATE') {
      await this.callRepo.update(payload.id, payload);
      let eventType = 'CALL_UPDATED';
      if (payload.status === 'attending') eventType = 'CALL_ATTENDING';
      else if (payload.status === 'resolved') eventType = 'CALL_RESOLVED';
      else if (payload.status === 'cancelled') eventType = 'CALL_CANCELLED';
      this.wsHub?.broadcastToAll({ type: eventType, payload: { callId: payload.id, ...payload }, timestamp: Date.now() });
    }
  }

  private async handleTableEvent(action: string, payload: any, entityId: string, tenantId: string): Promise<void> {
    if (action === 'INSERT') {
      const table = new RestaurantTable({
        id: payload.id,
        tenantId: payload.tenantId || tenantId,
        zoneId: payload.zoneId,
        name: payload.name,
        shape: payload.shape,
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
        rotation: payload.rotation ?? 0,
        seats: payload.seats,
        status: payload.status || 'available',
        updatedAt: payload.updatedAt || Date.now(),
      });
      await this.tableRepo.save(table);
      this.wsHub?.broadcastToAll({ type: 'TABLE_UPDATED', payload: table, timestamp: Date.now() });
    } else if (action === 'UPDATE') {
      await this.tableRepo.update(payload.id, payload);
      this.wsHub?.broadcastToAll({ type: 'TABLE_UPDATED', payload, timestamp: Date.now() });
    } else if (action === 'DELETE') {
      await this.tableRepo.delete(payload.id || entityId);
      this.wsHub?.broadcastToAll({ type: 'TABLE_DELETED', payload: { id: payload.id || entityId }, timestamp: Date.now() });
    }
  }

  private async handleZoneEvent(action: string, payload: any, tenantId: string): Promise<void> {
    if (!this.zoneRepo) return;
    if (action === 'INSERT') {
      const zone = new Zone({
        id: payload.id,
        tenantId: payload.tenantId || tenantId,
        name: payload.name,
        width: payload.width,
        height: payload.height,
        isDefault: payload.isDefault ?? false,
        createdAt: payload.createdAt || Date.now(),
      });
      await this.zoneRepo.save(zone);
      this.wsHub?.broadcastToAll({ type: 'ZONE_CREATED', payload: zone, timestamp: Date.now() });
    } else if (action === 'UPDATE') {
      await this.zoneRepo.update(payload.id, payload);
      this.wsHub?.broadcastToAll({ type: 'ZONE_UPDATED', payload, timestamp: Date.now() });
    }
  }
}
