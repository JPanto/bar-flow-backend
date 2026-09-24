import { WebSocket } from 'ws';
import { IWebSocketHub, RealtimeMessage } from '../../application/ports/IWebSocketHub.js';

export class FastifyWebSocketHub implements IWebSocketHub {
  private clients = new Map<WebSocket, Set<string>>();

  public registerClient(socket: WebSocket): void {
    if (!this.clients.has(socket)) {
      this.clients.set(socket, new Set());
    }
  }

  public removeClient(socket: WebSocket): void {
    this.clients.delete(socket);
  }

  public subscribe(socket: WebSocket, channel: string): void {
    const channels = this.clients.get(socket);
    if (channels) {
      channels.add(channel);
    }
  }

  public unsubscribe(socket: WebSocket, channel: string): void {
    const channels = this.clients.get(socket);
    if (channels) {
      channels.delete(channel);
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public broadcastToAll(message: RealtimeMessage): void {
    const serialized = JSON.stringify(message);

    for (const [socket] of this.clients) {
      if (socket.readyState === 1) {
        // 1 = WebSocket.OPEN
        try {
          socket.send(serialized);
        } catch {
          // ignore dead socket, cleanup on close
        }
      }
    }
  }

  public broadcastToChannel(channel: string, message: RealtimeMessage): void {
    const serialized = JSON.stringify(message);

    for (const [socket, channels] of this.clients) {
      if (channels.has(channel) && socket.readyState === 1) {
        try {
          socket.send(serialized);
        } catch {
          // ignore send error
        }
      }
    }
  }
}
