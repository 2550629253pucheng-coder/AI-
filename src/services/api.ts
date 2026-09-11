import { Room, Game, PlayerSecret, ActionType, RoomPlayer } from "../types/game.js";

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
    const res = await fetch(`${BASE_URL}/api/room/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ user }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create room");
    return data.room;
  },

  async joinRoom(roomCode: string, user: UserSession): Promise<{ room: Room; player: RoomPlayer }> {
    const res = await fetch(`${BASE_URL}/api/room/join`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ roomCode, user }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to join room");
    return { room: data.room, player: data.player };
  },

  async leaveRoom(roomId: string): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/room/leave`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ roomId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to leave room");
    return data.room;
  },

  async setReady(roomId: string, isReady: boolean): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/room/ready`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ roomId, isReady }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update ready state");
    return data.room;
  },

  async addBots(roomId: string, count: number = 6): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/room/add-bots`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ roomId, count }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to add bots");
    return data.room;
  },

  async getRoomState(roomId: string): Promise<{ room: Room; game?: Game }> {
    const res = await fetch(`${BASE_URL}/api/room/${roomId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to get room state");
    return { room: data.room, game: data.game };
  },

  async startGame(roomId: string): Promise<{ room: Room; game: Game }> {
    const res = await fetch(`${BASE_URL}/api/room/start`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ roomId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to start game");
    return { room: data.room, game: data.game };
  },

  async getMySecret(gameId: string): Promise<PlayerSecret> {
    const res = await fetch(`${BASE_URL}/api/game/${gameId}/secret`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch player secret");
    return data.secret;
  },

  async submitAction(
    gameId: string,
    type: ActionType,
    targetPlayerId?: string,
    content: string = ""
  ): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/action`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ gameId, type, targetPlayerId, content }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to submit action");
    return { game: data.game, room: data.room };
  },

  async advancePhase(gameId: string, expectedVersion?: number): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/advance`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ gameId, expectedVersion }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to advance phase");
    return { game: data.game, room: data.room };
  },

  async submitVote(gameId: string, targetPlayerId: string): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/vote`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ gameId, targetPlayerId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to submit vote");
    return { game: data.game, room: data.room };
  },

  async restartGame(roomId: string): Promise<{ room: Room; game: Game }> {
    const res = await fetch(`${BASE_URL}/api/game/restart`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ roomId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to restart game");
    return { room: data.room, game: data.game };
  },

  async triggerBotActions(gameId: string): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/bot-auto-act`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ gameId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to trigger bot actions");
    return { game: data.game, room: data.room };
  },
};
