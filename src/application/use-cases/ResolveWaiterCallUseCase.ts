import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';
import { IWebSocketHub } from '../ports/IWebSocketHub.js';
import { WaiterCall } from '../../domain/entities/WaiterCall.js';

export class ResolveWaiterCallUseCase {
  constructor(
    private callRepo: IWaiterCallRepository,
    private wsHub?: IWebSocketHub
  ) {}

  public async execute(callId: string): Promise<WaiterCall> {
    const call = await this.callRepo.findById(callId);
    if (!call) {
      throw new Error(`Waiter call not found: ${callId}`);
    }

    call.resolve(Date.now());
    await this.callRepo.update(call.id, {
      status: call.status,
      resolvedAt: call.resolvedAt,
    });

    this.wsHub?.broadcastToAll({
      type: 'CALL_RESOLVED',
      payload: { callId: call.id, resolvedAt: call.resolvedAt },
      timestamp: Date.now(),
    });

    return call;
  }
}
