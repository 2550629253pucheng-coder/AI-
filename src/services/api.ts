import { Room, Game, PlayerSecret, ActionType, RoomPlayer, RoomVoiceMessage } from "../types/game.js";

const BASE_URL = "";

let currentToken = localStorage.getItem("ai_impostor_token") || "";

export interface UserSession {
  openid: string;
  nickname: string;
  avatarUrl: string;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }
  return headers;
}

let isReauthenticating: Promise<string> | null = null;

async function refreshAuthToken(): Promise<string> {
  if (isReauthenticating) return isReauthenticating;

  isReauthenticating = (async () => {
    try {
      let nickname = "";
      let customOpenid = "";
      const stored = localStorage.getItem("ai_party_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          nickname = parsed.nickname;
          customOpenid = parsed.openid;
        } catch {}
      }

      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, customOpenid }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        currentToken = data.token;
        localStorage.setItem("ai_impostor_token", data.token);
        if (data.user) {
          localStorage.setItem("ai_party_user", JSON.stringify(data.user));
        }
        return data.token;
      }
      throw new Error(data.error || "Re-auth failed");
    } finally {
      isReauthenticating = null;
    }
  })();

  return isReauthenticating;
}

async function requestWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  let res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  let data = await res.json().catch(() => ({}));

  // 如果遇到 401 或 UNAUTHORIZED，自动重新登录获取新 Token 并重试一次
  if (res.status === 401 || data.error === "UNAUTHORIZED") {
    try {
      const newToken = await refreshAuthToken();
      res = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          Authorization: `Bearer ${newToken}`,
          ...(options.headers || {}),
        },
      });
      data = await res.json().catch(() => ({}));
    } catch {
      // ignore
    }
  }

  return { res, data };
}

export const api = {
  setToken(token: string) {
    currentToken = token;
    localStorage.setItem("ai_impostor_token", token);
  },

  getToken(): string {
    return currentToken;
  },

  clearToken() {
    currentToken = "";
    localStorage.removeItem("ai_impostor_token");
  },

  async login(nickname?: string, customOpenid?: string): Promise<{ user: UserSession; token: string }> {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, customOpenid }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Login failed");
    if (data.token) {
      this.setToken(data.token);
    }
    return { user: data.user, token: data.token };
  },

  async createRoom(user: UserSession): Promise<Room> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/create`, {
      method: "POST",
      body: JSON.stringify({ user }),
    });
    if (!data.success) throw new Error(data.error || "Failed to create room");
    return data.room;
  },

  async joinRoom(roomCode: string, user: UserSession): Promise<{ room: Room; player: RoomPlayer }> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/join`, {
      method: "POST",
      body: JSON.stringify({ roomCode, user }),
    });
    if (!data.success) throw new Error(data.error || "Failed to join room");
    return { room: data.room, player: data.player };
  },

  async leaveRoom(roomId: string): Promise<Room> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/leave`, {
      method: "POST",
      body: JSON.stringify({ roomId }),
    });
    if (!data.success) throw new Error(data.error || "Failed to leave room");
    return data.room;
  },

  async setReady(roomId: string, isReady: boolean): Promise<Room> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/ready`, {
      method: "POST",
      body: JSON.stringify({ roomId, isReady }),
    });
    if (!data.success) throw new Error(data.error || "Failed to update ready state");
    return data.room;
  },

  async addBots(roomId: string, count: number = 6): Promise<Room> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/add-bots`, {
      method: "POST",
      body: JSON.stringify({ roomId, count }),
    });
    if (!data.success) throw new Error(data.error || "Failed to add bots");
    return data.room;
  },

  async getRoomState(roomId: string): Promise<{ room: Room; game?: Game }> {
    const res = await fetch(`${BASE_URL}/api/room/${roomId}`);
    const data = await res.json().catch(() => ({}));
    if (!data.success) throw new Error(data.error || "Failed to get room state");
    return { room: data.room, game: data.game };
  },

  async startGame(roomId: string): Promise<{ room: Room; game: Game }> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/start`, {
      method: "POST",
      body: JSON.stringify({ roomId }),
    });
    if (!data.success) throw new Error(data.error || "Failed to start game");
    return { room: data.room, game: data.game };
  },

  async getMySecret(gameId: string): Promise<PlayerSecret> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/game/${gameId}/secret`);
    if (!data.success) throw new Error(data.error || "Failed to fetch player secret");
    return data.secret;
  },

  async submitAction(
    gameId: string,
    type: ActionType,
    targetPlayerId?: string,
    content: string = "",
    audioData?: string,
    audioDuration?: number
  ): Promise<{ game: Game; room: Room }> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/game/action`, {
      method: "POST",
      body: JSON.stringify({ gameId, type, targetPlayerId, content, audioData, audioDuration }),
    });
    if (!data.success) throw new Error(data.error || "Failed to submit action");
    return { game: data.game, room: data.room };
  },

  async sendVoiceMessage(
    roomId: string,
    content: string = "",
    audioData?: string,
    audioDuration?: number
  ): Promise<{ room: Room; message: RoomVoiceMessage }> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/voice`, {
      method: "POST",
      body: JSON.stringify({ roomId, content, audioData, audioDuration }),
    });
    if (!data.success) throw new Error(data.error || "Failed to send voice message");
    return { room: data.room, message: data.message };
  },

  async advancePhase(gameId: string, expectedVersion?: number): Promise<{ game: Game; room: Room }> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/game/advance`, {
      method: "POST",
      body: JSON.stringify({ gameId, expectedVersion }),
    });
    if (!data.success) throw new Error(data.error || "Failed to advance phase");
    return { game: data.game, room: data.room };
  },

  async submitVote(gameId: string, targetPlayerId: string): Promise<{ game: Game; room: Room }> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/game/vote`, {
      method: "POST",
      body: JSON.stringify({ gameId, targetPlayerId }),
    });
    if (!data.success) throw new Error(data.error || "Failed to submit vote");
    return { game: data.game, room: data.room };
  },

  async restartGame(roomId: string): Promise<{ room: Room; game: Game }> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/game/restart`, {
      method: "POST",
      body: JSON.stringify({ roomId }),
    });
    if (!data.success) throw new Error(data.error || "Failed to restart game");
    return { room: data.room, game: data.game };
  },

  async triggerBotActions(gameId: string): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/bot-auto-act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.success) throw new Error(data.error || "Failed to trigger bot actions");
    return { game: data.game, room: data.room };
  },

  async getPresetThemes(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/api/themes/presets`);
    const data = await res.json().catch(() => ({}));
    if (!data.success) throw new Error(data.error || "Failed to load preset themes");
    return data.themes || [];
  },

  async generateCustomTheme(prompt: string): Promise<any> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/theme/generate`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
    if (!data.success) throw new Error(data.error || "Failed to generate custom theme");
    return data.theme;
  },

  async setRoomTheme(roomId: string, theme: any): Promise<Room> {
    const { data } = await requestWithAuth(`${BASE_URL}/api/room/theme`, {
      method: "POST",
      body: JSON.stringify({ roomId, theme }),
    });
    if (!data.success) throw new Error(data.error || "Failed to set room theme");
    return data.room;
  },
};
