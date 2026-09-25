import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/infrastructure/http/server.js';
import { FastifyWebSocketHub } from '../../src/infrastructure/ws/FastifyWebSocketHub.js';

describe('CORS Configuration and Preflight Handling', () => {
  let app: FastifyInstance;
  const mockSyncUseCase = {
    execute: async (events: any[]) => ({
      success: true,
      syncedIds: events.map((e) => e.id),
      processedAt: Date.now(),
    }),
  };
  const mockStateUseCase = {
    execute: async () => ({
      tables: [],
      activeSessions: [],
      activeCalls: [],
      serverTime: Date.now(),
    }),
  };

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should handle preflight OPTIONS for /api/sync with mirrored origin and credentials', async () => {
    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub: new FastifyWebSocketHub(),
    });

    const origin = 'https://bar-flow.jersonpantoja58.workers.dev';
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/sync',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization, content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toMatch(/authorization/i);
    expect(response.headers['access-control-allow-headers']).toMatch(/content-type/i);
  });

  it('should match origin when CORS_ORIGIN has a trailing slash or comma-separated entries', async () => {
    // Dynamically test the server with custom CORS origin
    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub: new FastifyWebSocketHub(),
      corsOrigin: 'https://bar-flow.jersonpantoja58.workers.dev/, http://localhost:5173',
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/sync',
      headers: {
        origin: 'https://bar-flow.jersonpantoja58.workers.dev',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://bar-flow.jersonpantoja58.workers.dev');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should support wildcard subdomain patterns like *.workers.dev', async () => {
    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub: new FastifyWebSocketHub(),
      corsOrigin: '*.workers.dev, *.pages.dev',
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/sync',
      headers: {
        origin: 'https://bar-flow.jersonpantoja58.workers.dev',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://bar-flow.jersonpantoja58.workers.dev');
  });

  it('should include CORS headers in actual POST /api/sync response', async () => {
    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub: new FastifyWebSocketHub(),
    });

    const origin = 'https://bar-flow.jersonpantoja58.workers.dev';
    const response = await app.inject({
      method: 'POST',
      url: '/api/sync',
      headers: {
        origin,
        'content-type': 'application/json',
      },
      payload: {
        events: [
          {
            id: 'call-1',
            entity: 'waiter_call',
            action: 'INSERT',
            entityId: 'c-1',
            payload: { tableId: 't-1', reason: 'bill' },
            createdAt: Date.now(),
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should allow localhost development origins even when restricted domain is set', async () => {
    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub: new FastifyWebSocketHub(),
      corsOrigin: 'https://bar-flow.jersonpantoja58.workers.dev',
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/sync',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('should not allow unauthorized origins when specific origins are configured', async () => {
    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub: new FastifyWebSocketHub(),
      corsOrigin: 'https://bar-flow.jersonpantoja58.workers.dev',
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/sync',
      headers: {
        origin: 'https://unauthorized-domain.com',
        'access-control-request-method': 'POST',
      },
    });

    // When an origin is rejected, fastify-cors does not write Access-Control-Allow-Origin
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should handle OPTIONS request even if access-control-request-method header is omitted', async () => {
    app = await buildServer({
      syncUseCase: mockSyncUseCase as any,
      initialStateUseCase: mockStateUseCase as any,
      wsHub: new FastifyWebSocketHub(),
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/sync',
      headers: {
        origin: 'https://bar-flow.jersonpantoja58.workers.dev',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://bar-flow.jersonpantoja58.workers.dev');
  });
});
