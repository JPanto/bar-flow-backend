import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../../src/infrastructure/http/server.js';
import { SyncOutboxBatchUseCase } from '../../src/application/use-cases/SyncOutboxBatchUseCase.js';
import { GetInitialStateUseCase } from '../../src/application/use-cases/GetInitialStateUseCase.js';
import { FastifyWebSocketHub } from '../../src/infrastructure/ws/FastifyWebSocketHub.js';

describe('Fastify HTTP API Server', () => {
  let app: any;
  let mockSyncUseCase: any;
  let mockStateUseCase: any;
  let wsHub: FastifyWebSocketHub;

  beforeEach(async () => {
    wsHub = new FastifyWebSocketHub();

    mockSyncUseCase = {
      execute: async (events: any[]) => ({
        success: true,
        syncedIds: events.map((e) => e.id),
        processedAt: 1727189500000,
      }),
    };

    mockStateUseCase = {
      execute: async () => ({
        tables: [{ id: 't-1', name: 'Mesa 1' }],
        activeSessions: [],
        activeCalls: [],
        serverTime: 1727189500000,
      }),
    };

    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health should return 200 with service info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('bar-flow-backend');
  });

  it('GET /api/state/initial should return initial restaurant state', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/state/initial',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.tables).toHaveLength(1);
    expect(body.tables[0].name).toBe('Mesa 1');
  });

  it('POST /api/sync should validate batch payload and return synced IDs', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sync',
      payload: {
        events: [
          {
            id: 'evt-101',
            entity: 'table_session',
            action: 'INSERT',
            entityId: 'sess-1',
            payload: { sessionWord: 'MOJITO-24' },
            createdAt: 1727189500000,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.syncedIds).toEqual(['evt-101']);
  });

  it('POST /api/sync should reject invalid event payloads with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sync',
      payload: {
        events: [{ invalid: true }],
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('Validation failed');
  });
});
