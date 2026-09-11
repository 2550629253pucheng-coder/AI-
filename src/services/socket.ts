type MessageCallback = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private currentRoomId: string = "";
  private currentPlayerId: string = "";
  private listeners: Set<MessageCallback> = new Set();
  private reconnectTimer: any = null;
  private isExplicitlyClosed: boolean = false;

  public connect(roomId: string, playerId: string) {
    if (this.ws && this.currentRoomId === roomId && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.currentRoomId = roomId;
    this.currentPlayerId = playerId;
    this.isExplicitlyClosed = false;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?roomId=${encodeURIComponent(roomId)}&playerId=${encodeURIComponent(playerId)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // 连接成功，发送当前 room 信息
        this.ws?.send(JSON.stringify({ type: "JOIN_ROOM", roomId, playerId }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((callback) => callback(data));
        } catch {}
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed && this.currentRoomId) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect(this.currentRoomId, this.currentPlayerId);
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        try {
          this.ws?.close();
        } catch {}
      };
    } catch (e) {
      console.warn("[WS] Failed to create WebSocket connection:", e);
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.currentRoomId = "";
  }

  public subscribe(callback: MessageCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const socketClient = new WebSocketClient();
