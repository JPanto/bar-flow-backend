import { describe, it, expect } from 'vitest';
import { DrizzleTableRepository } from '../../src/infrastructure/repositories/DrizzleTableRepository.js';
import { DrizzleSessionRepository } from '../../src/infrastructure/repositories/DrizzleSessionRepository.js';
import { DrizzleCallRepository } from '../../src/infrastructure/repositories/DrizzleCallRepository.js';
import { DrizzleSyncAuditRepository } from '../../src/infrastructure/repositories/DrizzleSyncAuditRepository.js';

describe('Drizzle Repositories Instantiation', () => {
  const dummyDb = {} as any;

  it('should instantiate all Drizzle repositories with DB instance', () => {
    const tableRepo = new DrizzleTableRepository(dummyDb);
    const sessionRepo = new DrizzleSessionRepository(dummyDb);
    const callRepo = new DrizzleCallRepository(dummyDb);
    const syncAuditRepo = new DrizzleSyncAuditRepository(dummyDb);

    expect(tableRepo).toBeInstanceOf(DrizzleTableRepository);
    expect(sessionRepo).toBeInstanceOf(DrizzleSessionRepository);
    expect(callRepo).toBeInstanceOf(DrizzleCallRepository);
    expect(syncAuditRepo).toBeInstanceOf(DrizzleSyncAuditRepository);
  });
});
