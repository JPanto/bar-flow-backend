import { ITableRepository } from '../../domain/repositories/ITableRepository.js';
import { ITableSessionRepository } from '../../domain/repositories/ITableSessionRepository.js';
import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';

export class GetInitialStateUseCase {
  constructor(
    private tableRepo: ITableRepository,
    private sessionRepo: ITableSessionRepository,
    private callRepo: IWaiterCallRepository
  ) {}

  public async execute() {
    const [tables, activeSessions, activeCalls] = await Promise.all([
      this.tableRepo.findAll(),
      this.sessionRepo.findActiveSessions(),
      this.callRepo.findActiveCalls(),
    ]);

    return {
      tables,
      activeSessions,
      activeCalls,
      serverTime: Date.now(),
    };
  }
}
