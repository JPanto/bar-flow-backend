import { randomUUID } from 'crypto';
import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';
import { IWebSocketHub } from '../ports/IWebSocketHub.js';
import { CreateCallDTO } from '../dtos/callDto.js';
import { WaiterCall } from '../../domain/entities/WaiterCall.js';

export class CreateWaiterCallUseCase {
  constructor(
    private callRepo: IWaiterCallRepository,
    private wsHub?: IWebSocketHub
  ) {}

  public async execute(dto: CreateCallDTO): Promise<WaiterCall> {
    const call = new WaiterCall({
      id: randomUUID(),
      tableId: dto.tableId,
      sessionId: dto.sessionId,
      tableName: dto.tableName,
      sessionWord: dto.sessionWord,
      reason: dto.reason,
      status: 'pending',
      createdAt: Date.now(),
    });

    await this.callRepo.save(call);

    this.wsHub?.broadcastToAll({
      type: 'CALL_CREATED',
      payload: call,
      timestamp: Date.now(),
    });

    return call;
  }
}
