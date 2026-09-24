export interface RealtimeMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

export interface IWebSocketHub {
  broadcastToAll(message: RealtimeMessage, excludeSocket?: unknown): void;
  broadcastToChannel(channel: string, message: RealtimeMessage, excludeSocket?: unknown): void;
}
