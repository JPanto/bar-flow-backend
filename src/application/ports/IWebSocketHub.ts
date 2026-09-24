export interface RealtimeMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

export interface IWebSocketHub {
  broadcastToAll(message: RealtimeMessage): void;
  broadcastToChannel(channel: string, message: RealtimeMessage): void;
}
