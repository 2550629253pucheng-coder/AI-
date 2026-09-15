/**
 * AI局中局 - Taro 微信小程序专用 API 适配层
 * 将 Web 端的 fetch / localStorage 无缝替换为 Taro.request / Taro.getStorageSync
 */
import Taro from "@tarojs/taro";
import {
  Room,
  Game,
  PlayerSecret,
  ActionType,
  ThemeTemplate,
  RoomVoiceMessage,
  PlayerAction,
} from "../types/game";

// 小程序生产环境服务器域名（上线前需在微信公众平台配置合法 request 域名）
export const SERVER_BASE_URL =
  process.env.TARO_APP_API_URL || "https://your-production-domain.com";

export interface UserSession {
  openid: string;
  playerId: string;
  nickname: string;
  avatarUrl: string;
}

const TOKEN_KEY = "ai_impostor_token";

async function requestWithAuth(
  url: string,
  options: Omit<Taro.request.Option, "url"> = {}
): Promise<any> {
  const token = Taro.getStorageSync(TOKEN_KEY);
  const headers = {
    "Content-Type": "application/json",
    ...(options.header || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await Taro.request({
    ...options,
    url,
    header: headers,
  });

  if (response.statusCode === 401) {
    Taro.removeStorageSync(TOKEN_KEY);
    throw new Error("UNAUTHORIZED");
  }

  return response.data;
}

export const TaroGameAPI = {
  getToken(): string | null {
    return Taro.getStorageSync(TOKEN_KEY) || null;
  },

  setToken(token: string) {
    Taro.setStorageSync(TOKEN_KEY, token);
  },

  clearToken() {
    Taro.removeStorageSync(TOKEN_KEY);
  },

  /**
   * 微信官方静默授权登录 (调用 Taro.login 获取 code2session)
   */
  async wxLogin(nickname?: string, avatarUrl?: string): Promise<{ user: UserSession; token: string }> {
    const loginRes = await Taro.login();
    if (!loginRes.code) {
      throw new Error("获取微信登录 Code 失败");
    }

    const res = await Taro.request({
      url: `${SERVER_BASE_URL}/api/login`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: {
        code: loginRes.code,
        nickname: nickname || "探员微信玩家",
        avatarUrl: avatarUrl || "",
      },
    });

    const data: any = res.data;
    if (!data.success) throw new Error(data.error || "登录失败");
    this.setToken(data.token);
    return { user: data.user, token: data.token };
  },

  async createRoom(user: { nickname: string; avatarUrl: string }): Promise<Room> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/create`, {
      method: "POST",
      data: { user },
    });
    if (!data.success) throw new Error(data.error || "创建房间失败");
    return data.room;
  },

  async joinRoom(roomCode: string, user: { nickname: string; avatarUrl: string }): Promise<{ room: Room; game?: Game }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/join`, {
      method: "POST",
      data: { roomCode, user },
    });
    if (!data.success) throw new Error(data.error || "加入房间失败");
    return { room: data.room, game: data.game };
  },

  async getRoom(roomId: string): Promise<{ room: Room; game?: Game }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/${roomId}`);
    if (!data.success) throw new Error(data.error || "获取房间信息失败");
    return { room: data.room, game: data.game };
  },

  async getRoomByCode(roomCode: string): Promise<{ room: Room; game?: Game }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/code/${encodeURIComponent(roomCode)}`);
    if (!data.success) throw new Error(data.error || "房间不存在或已解散");
    return { room: data.room, game: data.game };
  },

  async leaveRoom(roomId: string): Promise<Room> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/leave`, {
      method: "POST",
      data: { roomId },
    });
    if (!data.success) throw new Error(data.error || "退出房间失败");
    return data.room;
  },

  async setReady(roomId: string, isReady: boolean): Promise<Room> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/ready`, {
      method: "POST",
      data: { roomId, isReady },
    });
    if (!data.success) throw new Error(data.error || "操作失败");
    return data.room;
  },

  async addBots(roomId: string, count: number = 6): Promise<Room> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/add-bots`, {
      method: "POST",
      data: { roomId, count },
    });
    if (!data.success) throw new Error(data.error || "添加 AI 好友失败");
    return data.room;
  },

  async restartGame(roomId: string): Promise<{ room: Room; game: Game }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/restart`, {
      method: "POST",
      data: { roomId },
    });
    if (!data.success) throw new Error(data.error || "再来一局失败");
    return { room: data.room, game: data.game };
  },

  async triggerBotActions(gameId: string): Promise<{ game: Game; room: Room }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/bot-auto-act`, {
      method: "POST",
      data: { gameId },
    });
    if (!data.success) throw new Error(data.error || "触发好友行动失败");
    return { game: data.game, room: data.room };
  },

  async generateCustomTheme(prompt: string): Promise<{ theme: ThemeTemplate; watermark?: string }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/theme/generate`, {
      method: "POST",
      data: { prompt },
    });
    if (!data.success) throw new Error(data.error || "AI 剧本生成失败");
    return { theme: data.theme, watermark: data.watermark };
  },

  async setRoomTheme(roomId: string, theme: ThemeTemplate): Promise<Room> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/theme`, {
      method: "POST",
      data: { roomId, theme },
    });
    if (!data.success) throw new Error(data.error || "更换剧本失败");
    return data.room;
  },

  async startGame(roomId: string): Promise<{ room: Room; game: Game }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/start`, {
      method: "POST",
      data: { roomId },
    });
    if (!data.success) throw new Error(data.error || "启动游戏失败");
    return { room: data.room, game: data.game };
  },

  async getMySecret(gameId: string): Promise<PlayerSecret> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/${gameId}/secret`);
    if (!data.success) throw new Error(data.error || "获取私密任务失败");
    return data.secret;
  },

  async submitAction(
    gameId: string,
    type: ActionType,
    targetPlayerId?: string,
    content: string = "",
    audioData?: string,
    audioDuration?: number,
    mediaUrl?: string
  ): Promise<{ game: Game; room: Room; action?: PlayerAction }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/action`, {
      method: "POST",
      data: { gameId, type, targetPlayerId, content, audioData, audioDuration, mediaUrl },
    });
    if (!data.success) throw new Error(data.error || "提交发言行动失败");
    return { game: data.game, room: data.room, action: data.action };
  },

  async sendVoiceMessage(
    roomId: string,
    content: string = "",
    audioData?: string,
    audioDuration?: number,
    mediaUrl?: string
  ): Promise<{ room: Room; message: RoomVoiceMessage }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/room/voice`, {
      method: "POST",
      data: { roomId, content, audioData, audioDuration, mediaUrl },
    });
    if (!data.success) throw new Error(data.error || "发送语音失败");
    return { room: data.room, message: data.message };
  },

  async advancePhase(gameId: string, expectedVersion?: number): Promise<{ game: Game; room: Room }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/advance`, {
      method: "POST",
      data: { gameId, expectedVersion },
    });
    if (!data.success) throw new Error(data.error || "推进阶段失败");
    return { game: data.game, room: data.room };
  },

  async submitVote(gameId: string, targetPlayerId: string): Promise<{ game: Game; room: Room }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/vote`, {
      method: "POST",
      data: { gameId, targetPlayerId },
    });
    if (!data.success) throw new Error(data.error || "提交投票失败");
    return { game: data.game, room: data.room };
  },

  async submitMidVote(gameId: string, targetPlayerId: string): Promise<{ game: Game; room: Room }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/mid-vote`, {
      method: "POST",
      data: { gameId, targetPlayerId },
    });
    if (!data.success) throw new Error(data.error || "提交放逐票失败");
    return { game: data.game, room: data.room };
  },

  async requestAIDirectorInterrogation(gameId: string): Promise<{ game: Game; room: Room }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/game/ai-interrogate`, {
      method: "POST",
      data: { gameId },
    });
    if (!data.success) throw new Error(data.error || "呼叫 AI 导演失败");
    return { game: data.game, room: data.room };
  },

  async auditText(content: string): Promise<{ pass: boolean; reason?: string; filteredText: string }> {
    const data: any = await requestWithAuth(`${SERVER_BASE_URL}/api/security/audit-text`, {
      method: "POST",
      data: { content },
    });
    if (!data.success) throw new Error(data.error || "内容安全审核请求失败");
    return data;
  },

  async getComplianceInfo(): Promise<any> {
    const res = await Taro.request({ url: `${SERVER_BASE_URL}/api/compliance/info` });
    return res.data;
  },

  async getPresetThemes(): Promise<any[]> {
    const res = await Taro.request({ url: `${SERVER_BASE_URL}/api/themes/presets` });
    const data: any = res.data;
    if (!data.success) throw new Error(data.error || "获取预设剧本失败");
    return data.themes;
  },
};
