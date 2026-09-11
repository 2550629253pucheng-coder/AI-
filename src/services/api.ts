import { Room, Game, PlayerSecret, ActionType } from "../types/game.js";

const BASE_URL = "";

export interface UserSession {
  openid: string;
  nickname: string;
  avatarUrl: string;
}

export const api = {
  async login(nickname?: string, customOpenid?: string): Promise<UserSession> {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, customOpenid }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Login failed");
    return data.user;
  },

  async createRoom(user: UserSession): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/room/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create room");
    return data.room;
  },

  async joinRoom(roomCode: string, user: UserSession): Promise<{ room: Room; player: any }> {
    const res = await fetch(`${BASE_URL}/api/room/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, user }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to join room");
    return { room: data.room, player: data.player };
  },

  async leaveRoom(roomId: string, playerId: string): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/room/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, playerId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to leave room");
    return data.room;
  },

  async setReady(roomId: string, playerId: string, isReady: boolean): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/room/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, playerId, isReady }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update ready state");
    return data.room;
  },

  async addBots(roomId: string, count: number = 6): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/room/add-bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  async startGame(roomId: string, ownerId: string): Promise<{ room: Room; game: Game }> {
    const res = await fetch(`${BASE_URL}/api/room/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, ownerId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to start game");
    return { room: data.room, game: data.game };
  },

  async getMySecret(gameId: string, playerId: string): Promise<PlayerSecret> {
    const res = await fetch(`${BASE_URL}/api/game/${gameId}/secret?playerId=${encodeURIComponent(playerId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch player secret");
    return data.secret;
  },

  async submitAction(
    gameId: string,
    playerId: string,
    type: ActionType,
    targetPlayerId?: string,
    content: string = ""
  ): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, playerId, type, targetPlayerId, content }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to submit action");
    return { game: data.game, room: data.room };
  },

  async advancePhase(gameId: string): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to advance phase");
    return { game: data.game, room: data.room };
  },

  async submitVote(gameId: string, voterPlayerId: string, targetPlayerId: string): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, voterPlayerId, targetPlayerId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to submit vote");
    return { game: data.game, room: data.room };
  },

  async restartGame(roomId: string, requesterId: string): Promise<{ room: Room; game: Game }> {
    const res = await fetch(`${BASE_URL}/api/game/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, requesterId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to restart game");
    return { room: data.room, game: data.game };
  },

  async triggerBotActions(gameId: string): Promise<{ game: Game; room: Room }> {
    const res = await fetch(`${BASE_URL}/api/game/bot-auto-act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to trigger bot actions");
    return { game: data.game, room: data.room };
  },
};
