import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { SyncOutboxBatchUseCase } from '../../application/use-cases/SyncOutboxBatchUseCase.js';
import { GetInitialStateUseCase } from '../../application/use-cases/GetInitialStateUseCase.js';
import { ALLOWED_REALTIME_EVENTS } from '../../application/ports/IWebSocketHub.js';
import { FastifyWebSocketHub } from '../ws/FastifyWebSocketHub.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { syncRoutes } from './routes/syncRoutes.js';
import { stateRoutes } from './routes/stateRoutes.js';
import { env } from '../../config/env.js';

export interface ServerOptions {
  syncUseCase: SyncOutboxBatchUseCase;
  initialStateUseCase: GetInitialStateUseCase;
  wsHub: FastifyWebSocketHub;
}

export async function buildServer(options: ServerOptions): Promise<FastifyInstance> {
  const { syncUseCase, initialStateUseCase, wsHub } = options;

  const server = Fastify({
    logger: env.NODE_ENV === 'development',
  });

  // 1. CORS
  await server.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // 2. WebSockets Plugin
  await server.register(websocket);

  // 3. WebSockets Endpoint (/ws)
  server.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, _req) => {
      wsHub.registerClient(socket);

      socket.on('message', (data: Buffer | string) => {
        try {
          // Reject oversized packets (>64KB) to avoid memory DoS
          if (data.length > 65536) return;

          const parsed = JSON.parse(data.toString());
          if (parsed.action === 'subscribe' && typeof parsed.channel === 'string') {
            wsHub.subscribe(socket, parsed.channel);
          } else if (parsed.action === 'unsubscribe' && typeof parsed.channel === 'string') {
            wsHub.unsubscribe(socket, parsed.channel);
          } else if (parsed.action === 'ping') {
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          } else if (
            parsed.type &&
            ALLOWED_REALTIME_EVENTS.includes(parsed.type) &&
            parsed.payload &&
            typeof parsed.payload === 'object'
          ) {
            // Forward validated domain event to appropriate channel or staff
            const channel = parsed.channel || 'staff';
            wsHub.broadcastToChannel(channel, parsed, socket);
            if (channel !== 'staff') {
              wsHub.broadcastToChannel('staff', parsed, socket);
            }
          }
        } catch {
          // ignore malformed client packets
        }
      });

      socket.on('close', () => {
        wsHub.removeClient(socket);
      });
    });
  });

  // 4. REST Routes
  await server.register(healthRoutes);
  await server.register(syncRoutes, { syncUseCase });
  await server.register(stateRoutes, { initialStateUseCase });

  return server;
}
