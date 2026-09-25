import { describe, it, expect, vi } from 'vitest';
import { FastifyWebSocketHub } from '../../src/infrastructure/ws/FastifyWebSocketHub.js';

class MockWebSocket {
  public readyState: number = 1; // 1 = OPEN
  public sentMessages: string[] = [];

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = 3; // 3 = CLOSED
  }
}

describe('FastifyWebSocketHub', () => {
  it('should register client and broadcast messages to all connected clients', () => {
    const hub = new FastifyWebSocketHub();
    const ws1 = new MockWebSocket() as any;
    const ws2 = new MockWebSocket() as any;

    hub.registerClient(ws1);
    hub.registerClient(ws2);

    expect(hub.getClientCount()).toBe(2);

    hub.broadcastToAll({
      type: 'TEST_EVENT',
      payload: { hello: 'world' },
      timestamp: 1727189500000,
    });

    expect(ws1.sentMessages).toHaveLength(1);
    expect(ws2.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws1.sentMessages[0]).type).toBe('TEST_EVENT');
  });

  it('should route messages specifically to channel subscribers', () => {
    const hub = new FastifyWebSocketHub();
    const wsStaff = new MockWebSocket() as any;
    const wsTable = new MockWebSocket() as any;

    hub.registerClient(wsStaff);
    hub.registerClient(wsTable);

    hub.subscribe(wsStaff, 'staff');
    hub.subscribe(wsTable, 'table:t-1');

    hub.broadcastToChannel('staff', {
      type: 'CALL_CREATED',
      payload: { callId: 'c-1' },
      timestamp: Date.now(),
    });

    expect(wsStaff.sentMessages).toHaveLength(1);
    expect(wsTable.sentMessages).toHaveLength(0);

    hub.broadcastToChannel('table:t-1', {
      type: 'CALL_ATTENDING',
      payload: { callId: 'c-1' },
      timestamp: Date.now(),
    });

    expect(wsStaff.sentMessages).toHaveLength(1);
    expect(wsTable.sentMessages).toHaveLength(1);
  });

  it('should cleanly remove disconnected clients', () => {
    const hub = new FastifyWebSocketHub();
    const ws = new MockWebSocket() as any;

    hub.registerClient(ws);
    expect(hub.getClientCount()).toBe(1);

    hub.removeClient(ws);
    expect(hub.getClientCount()).toBe(0);

    hub.broadcastToAll({
      type: 'ANY',
      payload: {},
      timestamp: Date.now(),
    });

    expect(ws.sentMessages).toHaveLength(0);
  });

  it('includes all domain events in ALLOWED_REALTIME_EVENTS', async () => {
    const { ALLOWED_REALTIME_EVENTS } = await import('../../src/infrastructure/ws/FastifyWebSocketHub.js');
    expect(ALLOWED_REALTIME_EVENTS).toContain('ORDER_CREATED');
    expect(ALLOWED_REALTIME_EVENTS).toContain('ORDER_CONFIRMED');
    expect(ALLOWED_REALTIME_EVENTS).toContain('ORDER_REJECTED');
    expect(ALLOWED_REALTIME_EVENTS).toContain('STOCK_UPDATED');
    expect(ALLOWED_REALTIME_EVENTS).toContain('TABLE_UPDATED');
    expect(ALLOWED_REALTIME_EVENTS).toContain('CALL_CREATED');
  });
});
