import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";

interface ClientConnection {
  ws: WebSocket;
  roomId: string;
  playerId?: string;
  isAlive: boolean;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientConnection> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public init(server: HttpServer): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket, req) => {
      const { query } = parse(req.url || "", true);
      const roomId = String(query.roomId || "");
      const playerId = String(query.playerId || "");

      const client: ClientConnection = {
        ws,
        roomId,
        playerId,
        isAlive: true,
      };

      this.clients.add(client);

      ws.on("pong", () => {
        client.isAlive = true;
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "PING") {
            ws.send(JSON.stringify({ type: "PONG", time: Date.now() }));
          } else if (msg.type === "JOIN_ROOM" && msg.roomId) {
            client.roomId = msg.roomId;
            if (msg.playerId) client.playerId = msg.playerId;
          }
        } catch {
          // ignore malformed ws messages
        }
      });

      ws.on("close", () => {
        this.clients.delete(client);
      });

      ws.on("error", () => {
        this.clients.delete(client);
      });

      // 发送连接成功消息
      ws.send(JSON.stringify({ type: "CONNECTED", roomId, playerId, time: Date.now() }));
    });

    // 定时心跳排查僵死连接
    this.pingInterval = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          continue;
        }
        client.isAlive = false;
        try {
          client.ws.ping();
        } catch {
          this.clients.delete(client);
        }
      }
    }, 30000);

    console.log("[WebSocketManager] WebSocket server initialized on path /ws");
  }

  /**
   * 向指定房间广播数据
   */
  public broadcastToRoom(roomId: string, event: { type: string; [key: string]: any }): void {
    if (!roomId) return;
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(payload);
        } catch (e) {
          console.warn("[WebSocketManager] Error broadcasting to client:", e);
        }
      }
    }
  }

  public getConnectedCount(roomId?: string): number {
    if (!roomId) return this.clients.size;
    let count = 0;
    for (const client of this.clients) {
      if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
        count++;
      }
    }
    return count;
  }
}
