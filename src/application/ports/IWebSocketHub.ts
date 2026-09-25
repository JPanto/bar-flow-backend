export const ALLOWED_REALTIME_EVENTS = [
  'TABLE_UPDATED',
  'TABLE_DELETED',
  'ZONE_CREATED',
  'ZONE_UPDATED',
  'CALL_CREATED',
  'CALL_ATTENDING',
  'CALL_RESOLVED',
  'CALL_CANCELLED',
  'SESSION_STARTED',
  'SESSION_CLOSED',
  'RESERVATION_CREATED',
  'RESERVATION_UPDATED',
  'ORDER_CREATED',
  'ORDER_CONFIRMED',
  'ORDER_REJECTED',
  'STOCK_UPDATED',
] as const;

export type RealtimeEventType = (typeof ALLOWED_REALTIME_EVENTS)[number];

export interface RealtimeMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  channel?: string;
  tenantId?: string;
}

export interface IWebSocketHub {
  registerClient(socket: unknown): void;
  removeClient(socket: unknown): void;
  subscribe(socket: unknown, channel: string): void;
  unsubscribe(socket: unknown, channel: string): void;
  broadcastToAll(message: RealtimeMessage, excludeSocket?: unknown): void;
  broadcastToChannel(channel: string, message: RealtimeMessage, excludeSocket?: unknown): void;
  getClientCount(): number;
}
