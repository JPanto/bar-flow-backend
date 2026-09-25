import { env } from './config/env.js';
import { db, pool } from './infrastructure/db/client.js';
import { initializeDatabase } from './infrastructure/db/bootstrap.js';
import { DrizzleZoneRepository } from './infrastructure/repositories/DrizzleZoneRepository.js';
import { DrizzleTableRepository } from './infrastructure/repositories/DrizzleTableRepository.js';
import { DrizzleSessionRepository } from './infrastructure/repositories/DrizzleSessionRepository.js';
import { DrizzleCallRepository } from './infrastructure/repositories/DrizzleCallRepository.js';
import { DrizzleSyncAuditRepository } from './infrastructure/repositories/DrizzleSyncAuditRepository.js';
import { DrizzleProductRepository } from './infrastructure/repositories/DrizzleProductRepository.js';
import { DrizzleOrderRepository } from './infrastructure/repositories/DrizzleOrderRepository.js';
import { FastifyWebSocketHub } from './infrastructure/ws/FastifyWebSocketHub.js';
import { SyncOutboxBatchUseCase } from './application/use-cases/SyncOutboxBatchUseCase.js';
import { GetInitialStateUseCase } from './application/use-cases/GetInitialStateUseCase.js';
import { buildServer } from './infrastructure/http/server.js';

async function main() {
  // 0. Ensure Database Schema & Tables Exist
  try {
    const initResult = await initializeDatabase(db, pool);
    console.log(`📦 Database initialized successfully via: ${initResult.method}`);
  } catch (err: any) {
    console.error(`⚠️ Warning: Database schema initialization error: ${err.message}`);
  }

  // 1. Repositories
  const zoneRepo = new DrizzleZoneRepository(db);
  const tableRepo = new DrizzleTableRepository(db);
  const sessionRepo = new DrizzleSessionRepository(db);
  const callRepo = new DrizzleCallRepository(db);
  const syncAuditRepo = new DrizzleSyncAuditRepository(db);
  const productRepo = new DrizzleProductRepository(db);
  const orderRepo = new DrizzleOrderRepository(db);

  // 2. WebSocket Hub
  const wsHub = new FastifyWebSocketHub();

  // 3. Use Cases
  const syncUseCase = new SyncOutboxBatchUseCase({
    syncAuditRepo,
    zoneRepo,
    tableRepo,
    sessionRepo,
    callRepo,
    productRepo,
    orderRepo,
    wsHub,
  });

  const initialStateUseCase = new GetInitialStateUseCase(
    zoneRepo,
    tableRepo,
    sessionRepo,
    callRepo
  );

  // 4. HTTP / WebSocket Server
  const server = await buildServer({
    syncUseCase,
    initialStateUseCase,
    wsHub,
  });

  try {
    await server.listen({
      port: env.PORT,
      host: '0.0.0.0', // Required for Koyeb / Render cloud hosting
    });
    console.log(`🚀 BarFlow Backend running on http://0.0.0.0:${env.PORT}`);
    console.log(`📡 WebSocket endpoint available at ws://0.0.0.0:${env.PORT}/ws`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
