import { describe, it, expect, beforeEach } from 'vitest';
import { CreateWaiterCallUseCase } from '../../src/application/use-cases/CreateWaiterCallUseCase.js';
import { AttendWaiterCallUseCase } from '../../src/application/use-cases/AttendWaiterCallUseCase.js';
import { ResolveWaiterCallUseCase } from '../../src/application/use-cases/ResolveWaiterCallUseCase.js';
import { IWaiterCallRepository } from '../../src/domain/repositories/IWaiterCallRepository.js';
import { WaiterCall } from '../../src/domain/entities/WaiterCall.js';
import { IWebSocketHub, RealtimeMessage } from '../../src/application/ports/IWebSocketHub.js';

class MockCallRepository implements IWaiterCallRepository {
  public calls: WaiterCall[] = [];

  async findById(id: string): Promise<WaiterCall | null> {
    return this.calls.find((c) => c.id === id) || null;
  }
  async findActiveCalls(): Promise<WaiterCall[]> {
    return this.calls.filter((c) => c.status === 'pending' || c.status === 'attending');
  }
  async findByTableId(tableId: string): Promise<WaiterCall[]> {
    return this.calls.filter((c) => c.tableId === tableId);
  }
  async save(call: WaiterCall): Promise<void> {
    this.calls.push(call);
  }
  async update(id: string, changes: Partial<WaiterCall>): Promise<void> {
    const call = this.calls.find((c) => c.id === id);
    if (call) Object.assign(call, changes);
  }
}

class MockWebSocketHub implements IWebSocketHub {
  public messages: RealtimeMessage[] = [];
  broadcastToAll(message: RealtimeMessage): void {
    this.messages.push(message);
  }
  broadcastToChannel(channel: string, message: RealtimeMessage): void {
    this.messages.push(message);
  }
}

describe('Waiter Calls Use Cases', () => {
  let callRepo: MockCallRepository;
  let wsHub: MockWebSocketHub;

  beforeEach(() => {
    callRepo = new MockCallRepository();
    wsHub = new MockWebSocketHub();
  });

  it('CreateWaiterCallUseCase should create call and broadcast CALL_CREATED', async () => {
    const useCase = new CreateWaiterCallUseCase(callRepo, wsHub);

    const call = await useCase.execute({
      tableId: 'b39bfdb0-4fd2-4d2c-8cb4-3a2139cb8011',
      sessionId: '7a12b489-38b4-4b92-8012-1d57e3c91422',
      tableName: 'Mesa 4',
      sessionWord: 'BURGER-15',
      reason: 'bill',
    });

    expect(call.id).toBeDefined();
    expect(call.reason).toBe('bill');
    expect(call.status).toBe('pending');
    expect(callRepo.calls).toHaveLength(1);
    expect(wsHub.messages).toHaveLength(1);
    expect(wsHub.messages[0].type).toBe('CALL_CREATED');
  });

  it('AttendWaiterCallUseCase should transition call to attending and broadcast CALL_ATTENDING', async () => {
    const call = new WaiterCall({
      id: 'c-1',
      tableId: 't-1',
      sessionId: 's-1',
      tableName: 'Mesa 1',
      sessionWord: 'MOJITO-24',
      reason: 'waiter',
      status: 'pending',
      createdAt: Date.now() - 10000,
    });
    await callRepo.save(call);

    const useCase = new AttendWaiterCallUseCase(callRepo, wsHub);
    const updated = await useCase.execute('c-1');

    expect(updated.status).toBe('attending');
    expect(updated.attendingAt).toBeDefined();
    expect(wsHub.messages).toHaveLength(1);
    expect(wsHub.messages[0].type).toBe('CALL_ATTENDING');
  });

  it('ResolveWaiterCallUseCase should transition call to resolved and broadcast CALL_RESOLVED', async () => {
    const call = new WaiterCall({
      id: 'c-2',
      tableId: 't-1',
      sessionId: 's-1',
      tableName: 'Mesa 1',
      sessionWord: 'MOJITO-24',
      reason: 'waiter',
      status: 'attending',
      createdAt: Date.now() - 20000,
      attendingAt: Date.now() - 10000,
    });
    await callRepo.save(call);

    const useCase = new ResolveWaiterCallUseCase(callRepo, wsHub);
    const resolved = await useCase.execute('c-2');

    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).toBeDefined();
    expect(wsHub.messages).toHaveLength(1);
    expect(wsHub.messages[0].type).toBe('CALL_RESOLVED');
  });
});
