/**
 * AI局中局 - 小程序全局会话 Store（极简实现）
 * 跨页面共享：登录用户、当前房间、当前对局
 * 同时持久化到 Storage，冷启动可恢复
 */
import Taro from "@tarojs/taro";
import { Room, Game } from "./types/game";
import { UserSession } from "./services/api.taro";

const SESSION_KEY = "ai_impostor_session";

export interface AppSession {
  user: UserSession | null;
  roomId: string;
}

let session: AppSession = { user: null, roomId: "" };

// 房间/对局快照（由 WS 推送或 API 响应刷新，各页面订阅）
export interface RoomSnapshot {
  room: Room | null;
  game: Game | null;
}

let snapshot: RoomSnapshot = { room: null, game: null };
const listeners = new Set<(s: RoomSnapshot) => void>();

export const sessionStore = {
  getUser(): UserSession | null {
    return session.user;
  },

  setUser(user: UserSession) {
    session.user = user;
    Taro.setStorageSync(SESSION_KEY, session);
  },

  getRoomId(): string {
    return session.roomId;
  },

  setRoomId(roomId: string) {
    session.roomId = roomId;
    Taro.setStorageSync(SESSION_KEY, session);
  },

  /** 冷启动恢复会话 */
  restore(): AppSession {
    try {
      const saved = Taro.getStorageSync(SESSION_KEY);
      if (saved && saved.user) {
        session = saved;
      }
    } catch {}
    return session;
  },

  clear() {
    session = { user: null, roomId: "" };
    snapshot = { room: null, game: null };
    Taro.removeStorageSync(SESSION_KEY);
  },
};

export const roomStore = {
  get(): RoomSnapshot {
    return snapshot;
  },

  update(room: Room | null, game: Game | null = null) {
    snapshot = { room, game };
    listeners.forEach((cb) => cb(snapshot));
  },

  subscribe(cb: (s: RoomSnapshot) => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};
