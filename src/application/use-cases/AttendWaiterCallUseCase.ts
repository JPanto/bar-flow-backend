import { IWaiterCallRepository } from '../../domain/repositories/IWaiterCallRepository.js';
import { IWebSocketHub } from '../ports/IWebSocketHub.js';
import { WaiterCall } from '../../domain/entities/WaiterCall.js';

export class AttendWaiterCallUseCase {
  constructor(
    private callRepo: IWaiterCallRepository,
    private wsHub?: IWebSocketHub
  ) {}

  public async execute(callId: string): Promise<WaiterCall> {
    const call = await this.callRepo.findById(callId);
    if (!call) {
      throw new Error(`Waiter call not found: ${callId}`);
    }

    call.attend(Date.now());
    await this.callRepo.update(call.id, {
      status: call.status,
      attendingAt: call.attendingAt,
    });

    this.wsHub?.broadcastToAll({
      type: 'CALL_ATTENDING',
      payload: { callId: call.id, attendingAt: call.attendingAt },
      timestamp: Date.now(),
    });

    return call;
  }
}
