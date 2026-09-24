import { IZoneRepository } from '../../domain/repositories/IZoneRepository.js';
import { ITableRepository } from '../../domain/repositories/ITableRepository.js';
import { ITableSessionRepository } from '../../domain/repositories/ITableSessionRepository.js';
import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';

export class GetInitialStateUseCase {
  constructor(
    private zoneRepo: IZoneRepository,
    private tableRepo: ITableRepository,
    private sessionRepo: ITableSessionRepository,
    private callRepo: IWaiterCallRepository
  ) {}

  public async execute() {
    const [zones, tables, activeSessions, activeCalls] = await Promise.all([
      this.zoneRepo.findAll(),
      this.tableRepo.findAll(),
      this.sessionRepo.findActiveSessions(),
      this.callRepo.findActiveCalls(),
    ]);

    return {
      zones,
      tables,
      activeSessions,
      activeCalls,
      serverTime: Date.now(),
    };
  }
}
