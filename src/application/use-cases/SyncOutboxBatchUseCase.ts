import { ISyncAuditRepository } from '../../domain/repositories/ISyncAuditRepository.js';
import { IZoneRepository } from '../../domain/repositories/IZoneRepository.js';
import { ITableRepository } from '../../domain/repositories/ITableRepository.js';
import { ITableSessionRepository } from '../../domain/repositories/ITableSessionRepository.js';
import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';
import { IWebSocketHub } from '../ports/IWebSocketHub.js';
import { SyncEventDTO } from '../dtos/syncDto.js';
import { TableSession } from '../../domain/entities/TableSession.js';
import { WaiterCall } from '../../domain/entities/WaiterCall.js';

export interface SyncOutboxBatchDependencies {
  syncAuditRepo: ISyncAuditRepository;
  zoneRepo?: IZoneRepository;
  tableRepo: ITableRepository;
  sessionRepo: ITableSessionRepository;
  callRepo: IWaiterCallRepository;
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
  private wsHub?: IWebSocketHub;

  constructor(deps: SyncOutboxBatchDependencies) {
    this.syncAuditRepo = deps.syncAuditRepo;
    this.zoneRepo = deps.zoneRepo;
    this.tableRepo = deps.tableRepo;
    this.sessionRepo = deps.sessionRepo;
    this.callRepo = deps.callRepo;
    this.wsHub = deps.wsHub;
  }

  public async execute(events: SyncEventDTO[]): Promise<SyncBatchResult> {
    const syncedIds: string[] = [];

    for (const event of events) {
      // 1. Idempotency Check: Skip already processed events
      const alreadyProcessed = await this.syncAuditRepo.hasEventBeenProcessed(event.id);
      if (alreadyProcessed) {
        syncedIds.push(event.id);
        continue;
      }

      // 2. Process mutation per entity type
      await this.processEvent(event);

      // 3. Record in audit log
      await this.syncAuditRepo.recordSync({
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

  private async processEvent(event: SyncEventDTO): Promise<void> {
    const { entity, action, payload } = event;

    switch (entity) {
      case 'table_session': {
        if (action === 'INSERT') {
          const session = new TableSession({
            id: payload.id,
            tableId: payload.tableId,
            sessionWord: payload.sessionWord,
            status: payload.status || 'active',
            openedAt: payload.openedAt || Date.now(),
            closedAt: payload.closedAt,
          });
          await this.sessionRepo.save(session);

          this.wsHub?.broadcastToAll({
            type: 'SESSION_STARTED',
            payload: session,
            timestamp: Date.now(),
          });
        } else if (action === 'UPDATE') {
          await this.sessionRepo.update(payload.id, payload);
          if (payload.status === 'closed') {
            this.wsHub?.broadcastToAll({
              type: 'SESSION_CLOSED',
              payload: { tableId: payload.tableId },
              timestamp: Date.now(),
            });
          }
        }
        break;
      }

      case 'waiter_call': {
        if (action === 'INSERT') {
          const call = new WaiterCall({
            id: payload.id,
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

          this.wsHub?.broadcastToAll({
            type: 'CALL_CREATED',
            payload: call,
            timestamp: Date.now(),
          });
        } else if (action === 'UPDATE') {
          await this.callRepo.update(payload.id, payload);

          let eventType = 'CALL_UPDATED';
          if (payload.status === 'attending') eventType = 'CALL_ATTENDING';
          else if (payload.status === 'resolved') eventType = 'CALL_RESOLVED';
          else if (payload.status === 'cancelled') eventType = 'CALL_CANCELLED';

          this.wsHub?.broadcastToAll({
            type: eventType,
            payload: { callId: payload.id, ...payload },
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'table': {
        if (action === 'INSERT') {
          await this.tableRepo.save(payload as any);
          this.wsHub?.broadcastToAll({
            type: 'TABLE_UPDATED',
            payload,
            timestamp: Date.now(),
          });
        } else if (action === 'UPDATE') {
          await this.tableRepo.update(payload.id, payload);
          this.wsHub?.broadcastToAll({
            type: 'TABLE_UPDATED',
            payload,
            timestamp: Date.now(),
          });
        } else if (action === 'DELETE') {
          await this.tableRepo.delete(payload.id || event.entityId);
          this.wsHub?.broadcastToAll({
            type: 'TABLE_DELETED',
            payload: { id: payload.id || event.entityId },
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'zone': {
        if (this.zoneRepo) {
          if (action === 'INSERT') {
            await this.zoneRepo.save(payload as any);
            this.wsHub?.broadcastToAll({
              type: 'ZONE_CREATED',
              payload,
              timestamp: Date.now(),
            });
          } else if (action === 'UPDATE') {
            await this.zoneRepo.update(payload.id, payload);
            this.wsHub?.broadcastToAll({
              type: 'ZONE_UPDATED',
              payload,
              timestamp: Date.now(),
            });
          }
        }
        break;
      }

      default:
        // Other entities pass through audit
        break;
    }
  }
}
