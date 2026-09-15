/**
 * AI局中局 - Taro 微信小程序专用 WebSocket 实时同步适配器
 * 使用 Taro.connectSocket 替代标准浏览器 WebSocket，支持重连与心跳
 */
import Taro from "@tarojs/taro";
import { SERVER_BASE_URL } from "./api.taro";

type MessageCallback = (data: any) => void;

class TaroWebSocketClient {
  private socketTask: Taro.SocketTask | null = null;
  private currentRoomId: string = "";
  private currentPlayerId: string = "";
  private listeners: Set<MessageCallback> = new Set();
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private isExplicitlyClosed: boolean = false;

  public connect(roomId: string, playerId: string) {
    if (this.socketTask && this.currentRoomId === roomId) {
      return;
    }

    this.currentRoomId = roomId;
    this.currentPlayerId = playerId;
    this.isExplicitlyClosed = false;

    this.disconnect(false);

    // 将 http/https 转换为 ws/wss
    const wsBaseUrl = SERVER_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    const wsUrl = `${wsBaseUrl}/ws?roomId=${encodeURIComponent(roomId)}&playerId=${encodeURIComponent(playerId)}`;

    Taro.connectSocket({ url: wsUrl })
      .then((task) => {
        this.socketTask = task;
        this.setupTaskListeners(task, roomId, playerId);
      })
      .catch((err) => {
        console.warn("[TaroWS] connectSocket fail:", err);
        this.scheduleReconnect();
      });
  }

  private setupTaskListeners(task: Taro.SocketTask, roomId: string, playerId: string) {
    task.onOpen(() => {
      console.log("[TaroWS] Connected successfully");
      task.send({
        data: JSON.stringify({ type: "JOIN_ROOM", roomId, playerId }),
      });
      this.startHeartbeat(task);
    });

    task.onMessage((res) => {
      try {
        const raw = typeof res.data === "string" ? res.data : "";
        if (raw) {
          const data = JSON.parse(raw);
          this.listeners.forEach((cb) => cb(data));
        }
      } catch (err) {
        console.warn("[TaroWS] Message parse error:", err);
      }
    });

    task.onClose(() => {
      this.stopHeartbeat();
      if (!this.isExplicitlyClosed && this.currentRoomId) {
        this.scheduleReconnect();
      }
    });

    task.onError((err) => {
      console.warn("[TaroWS] Socket error:", err);
      this.stopHeartbeat();
      try {
        task.close({});
      } catch {}
    });
  }

  private startHeartbeat(task: Taro.SocketTask) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      try {
        task.send({ data: JSON.stringify({ type: "PING" }) });
      } catch {}
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitlyClosed && this.currentRoomId) {
        this.connect(this.currentRoomId, this.currentPlayerId);
      }
    }, 3000);
  }

  public disconnect(isExplicit: boolean = true) {
    this.isExplicitlyClosed = isExplicit;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socketTask) {
      try {
        this.socketTask.close({});
      } catch {}
      this.socketTask = null;
    }
    if (isExplicit) {
      this.currentRoomId = "";
    }
  }

  public subscribe(callback: MessageCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const taroSocketClient = new TaroWebSocketClient();
