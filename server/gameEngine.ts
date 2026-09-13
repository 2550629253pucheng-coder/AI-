import crypto from "crypto";
import {
  Game,
  GamePhase,
  PlayerSecret,
  Room,
  RoomPlayer,
  Team,
  ActionType,
  PlayerAction,
  Vote,
  GameEvent,
  ErrorCode,
  TrapMission,
  RoomVoiceMessage,
  AIDirectorComment,
} from "../src/types/game.js";
import {
  COMPANY_THEME,
  ThemeTemplate,
  getThemeById,
  getRandomTrapMission,
  getAllThemes,
  registerDynamicTheme,
  PRESET_THEMES,
} from "./templates.js";
import { AIGateway } from "./aiGateway.js";
import { playerIdOf } from "./auth.js";
import { SQLiteStore } from "./db.js";
import { WebSocketManager } from "./ws.js";
import { contentSecurity } from "./contentSecurity.js";

/**
 * 服务端内部对局状态，携带隐藏身份。绝不下发客户端。
 */
export interface ServerGame extends Game {
  spyPlayerIds: string[];
}

// 内存索引（从 SQLite 加载，支持极致毫秒级读写 + 异步持久化）
export const rooms = new Map<string, Room>();
export const games = new Map<string, ServerGame>();
export const playerSecrets = new Map<string, Map<string, PlayerSecret>>();

/**
 * 对外序列化：剥离隐藏字段。
 * 唯一允许带 revealedSpies 的时机是结算之后。
 */
export function toPublicGame(game?: ServerGame): Game | undefined {
  if (!game) return undefined;
  const { spyPlayerIds, revealedSpies, ...pub } = game;
  const settled = game.phase === GamePhase.RESULT || game.phase === GamePhase.FINISHED;
  return settled ? { ...pub, revealedSpies } : { ...pub };
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * Fisher-Yates 均匀洗牌算法 (防偏斜)
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class GameEngine {
  private static instance: GameEngine;
  private aiGateway: AIGateway;
  private store: SQLiteStore;
  private ws: WebSocketManager;
  private advancing = new Set<string>();
  private autoTimerStarted = false;
  // O(1) 房间码到房间 ID 索引 (优化 P0 2.5 避免大并发时每次遍历 O(n) 查询)
  private roomCodeToId = new Map<string, string>();

  private constructor() {
    this.aiGateway = AIGateway.getInstance();
    this.store = SQLiteStore.getInstance();
    this.ws = WebSocketManager.getInstance();

    // 初始化 SQLite 数据恢复
    this.initDatabase();
    // 启动自动推进定时器（避免房主当人肉时钟）
    this.startAutoAdvanceTimer();
  }

  public static getInstance(): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine();
    }
    return GameEngine.instance;
  }

  private async initDatabase() {
    try {
      await this.store.init();
      // 从 SQLite 恢复房间和游戏
      const savedRooms = this.store.getAllRooms();
      for (const r of savedRooms) {
        // 只保留近 24 小时内的活动房间
        if (Date.now() - r.createdAt < 24 * 3600 * 1000) {
          rooms.set(r.roomId, r);
          this.roomCodeToId.set(r.roomCode, r.roomId);
          if (r.currentGameId) {
            const g = this.store.getGame(r.currentGameId) as ServerGame | null;
            if (g) {
              games.set(g.gameId, g);
              // 恢复 secrets
              const secretsMap = new Map<string, PlayerSecret>();
              for (const p of r.players) {
                const s = this.store.getSecret(g.gameId, p.playerId);
                if (s) secretsMap.set(p.playerId, s);
              }
              playerSecrets.set(g.gameId, secretsMap);
            }
          }
        }
      }
      // 恢复自定义剧本
      const customThemes = this.store.getAllCustomThemes();
      for (const t of customThemes) {
        registerDynamicTheme(t);
      }
      console.log(`[GameEngine] SQLite state restored: ${rooms.size} rooms, ${customThemes.length} custom themes`);
    } catch (e) {
      console.error("[GameEngine] Database init failed:", e);
    }
  }

  private broadcast(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    const game = room.currentGameId ? games.get(room.currentGameId) : undefined;
    this.ws.broadcastToRoom(roomId, {
      type: "ROOM_STATE",
      room,
      game: toPublicGame(game),
    });
  }

  /**
   * 自动推进定时器：每秒轮询，一旦倒计时到达服务端 phaseEndsAt，全自动平滑推向下一阶段
   * 彻底告别“房主当人肉时钟”
   */
  private startAutoAdvanceTimer() {
    if (this.autoTimerStarted) return;
    this.autoTimerStarted = true;

    setInterval(async () => {
      const now = Date.now();
      for (const [gameId, game] of games.entries()) {
        if (
          game.phase === GamePhase.LOBBY ||
          game.phase === GamePhase.RESULT ||
          game.phase === GamePhase.FINISHED ||
          game.phase === GamePhase.SETTLEMENT
        ) {
          continue;
        }

        // 倒计时已到，自动推进
        if (now >= game.phaseEndsAt && !this.advancing.has(gameId)) {
          console.log(`[AutoAdvance] Phase ${game.phase} time expired for game ${gameId}, advancing...`);
          try {
            await this.advancePhaseInternal(gameId);
          } catch (err) {
            console.error(`[AutoAdvance] Failed to advance game ${gameId}:`, err);
          }
        }
      }
    }, 1000);
  }

  // --- 房间管理 ---

  public createRoom(user: { openid: string; nickname: string; avatarUrl: string }): Room {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let roomCode = generateRoomCode();
    while (Array.from(rooms.values()).some((r) => r.roomCode === roomCode)) {
      roomCode = generateRoomCode();
    }

    const ownerId = playerIdOf(user.openid);
    const owner: RoomPlayer = {
      playerId: ownerId,
      roomId,
      openid: user.openid,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || "https://api.dicebear.com/7.x/personas/svg?seed=" + user.nickname,
      isOwner: true,
      isReady: true,
      online: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      voteCount: 0,
      isEliminated: false,
    };

    const room: Room = {
      roomId,
      roomCode,
      ownerId,
      status: "WAITING",
      minPlayers: 4,
      maxPlayers: 8,
      themeId: COMPANY_THEME.themeId,
      themeName: COMPANY_THEME.themeName,
      themeBackground: COMPANY_THEME.background,
      createdAt: Date.now(),
      expiresAt: Date.now() + 2 * 3600 * 1000,
      players: [owner],
      voiceMessages: [],
    };

    rooms.set(roomId, room);
    this.roomCodeToId.set(roomCode, roomId);
    this.store.saveRoom(room);
    return room;
  }

  public joinRoom(
    roomCode: string,
    user: { openid: string; nickname: string; avatarUrl: string }
  ): { room: Room; game?: Game } {
    // 优先 O(1) 索引查找
    const roomId = this.roomCodeToId.get(roomCode);
    const room = roomId ? rooms.get(roomId) : Array.from(rooms.values()).find((r) => r.roomCode === roomCode);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.status !== "WAITING") throw new Error(ErrorCode.INVALID_GAME_STATE);
    if (!this.roomCodeToId.has(roomCode)) {
      this.roomCodeToId.set(roomCode, room.roomId);
    }

    const playerId = playerIdOf(user.openid);
    let player = room.players.find((p) => p.playerId === playerId);

    if (player) {
      player.online = true;
      player.lastSeenAt = Date.now();
      player.nickname = user.nickname || player.nickname;
      player.avatarUrl = user.avatarUrl || player.avatarUrl;
    } else {
      if (room.players.length >= room.maxPlayers) {
        throw new Error(ErrorCode.ROOM_FULL);
      }
      player = {
        playerId,
        roomId: room.roomId,
        openid: user.openid,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl || "https://api.dicebear.com/7.x/personas/svg?seed=" + user.nickname,
        isOwner: false,
        isReady: false,
        online: true,
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
        voteCount: 0,
        isEliminated: false,
      };
      room.players.push(player);
    }

    this.store.saveRoom(room);
    this.broadcast(room.roomId);
    const game = room.currentGameId ? games.get(room.currentGameId) : undefined;
    return { room, game: toPublicGame(game) };
  }

  public leaveRoom(roomId: string, playerId: string): Room {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const idx = room.players.findIndex((p) => p.playerId === playerId);
    if (idx !== -1) {
      const removed = room.players.splice(idx, 1)[0];
      if (removed.isOwner && room.players.length > 0) {
        room.players[0].isOwner = true;
        room.players[0].isReady = true;
        room.ownerId = room.players[0].playerId;
      }
    }

    if (room.players.length === 0) {
      rooms.delete(roomId);
      this.roomCodeToId.delete(room.roomCode);
    } else {
      this.store.saveRoom(room);
      this.broadcast(roomId);
    }
    return room;
  }

  public setReady(roomId: string, playerId: string, isReady: boolean): Room {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) throw new Error(ErrorCode.UNAUTHORIZED);

    player.isReady = isReady;
    player.lastSeenAt = Date.now();
    this.store.saveRoom(room);
    this.broadcast(roomId);
    return room;
  }

  public addBotPlayers(roomId: string, count: number = 6): Room {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.status !== "WAITING") throw new Error(ErrorCode.INVALID_GAME_STATE);

    const botNames = [
      "柯南探长",
      "卷王程序猿",
      "奶茶狂热者",
      "摸鱼大师",
      "绝命反水王",
      "气氛组课代表",
      "法医小助手",
      "暗夜魔术师",
    ];

    const currentCount = room.players.length;
    const toAdd = Math.min(count - currentCount, room.maxPlayers - currentCount);

    for (let i = 0; i < toAdd; i++) {
      const name = botNames[(currentCount + i) % botNames.length];
      const botId = `bot_${Date.now()}_${i}`;
      room.players.push({
        playerId: botId,
        roomId,
        openid: `bot_openid_${botId}`,
        nickname: `${name}`,
        avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${name}_${i}`,
        isOwner: false,
        isReady: true,
        online: true,
        isBot: true,
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
        voteCount: 0,
        isEliminated: false,
      });
    }

    this.store.saveRoom(room);
    this.broadcast(roomId);
    return room;
  }

  public setRoomTheme(roomId: string, theme: ThemeTemplate, requesterId: string): Room {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.ownerId !== requesterId) throw new Error(ErrorCode.NOT_ROOM_OWNER);
    if (room.status !== "WAITING") throw new Error(ErrorCode.INVALID_GAME_STATE);

    room.themeId = theme.themeId;
    room.themeName = theme.themeName;
    room.themeBackground = theme.background;
    room.customTheme = theme;

    registerDynamicTheme(theme);
    this.store.saveTheme(theme);
    this.store.saveRoom(room);
    this.broadcast(roomId);
    return room;
  }

  public getRoom(roomId: string): { room: Room; game?: Game } {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    const game = room.currentGameId ? games.get(room.currentGameId) : undefined;
    return { room, game: toPublicGame(game) };
  }

  public getRoomByCode(code: string): { room: Room; game?: Game } {
    const roomId = this.roomCodeToId.get(code);
    const room = roomId ? rooms.get(roomId) : Array.from(rooms.values()).find((r) => r.roomCode === code);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (!this.roomCodeToId.has(code)) {
      this.roomCodeToId.set(code, room.roomId);
    }
    const game = room.currentGameId ? games.get(room.currentGameId) : undefined;
    return { room, game: toPublicGame(game) };
  }

  // --- 游戏主循环 ---

  public startGame(roomId: string, requesterId: string): { room: Room; game: Game } {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.ownerId !== requesterId) throw new Error(ErrorCode.NOT_ROOM_OWNER);

    if (room.players.length < room.minPlayers) {
      throw new Error(ErrorCode.NOT_ENOUGH_PLAYERS);
    }
    const unready = room.players.find((p) => !p.isReady);
    if (unready) {
      throw new Error(ErrorCode.PLAYER_NOT_READY);
    }

    const template: ThemeTemplate = room.customTheme || getThemeById(room.themeId);
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 内鬼数量分配：>= 6 人时支持 2 名内鬼，增加对抗激烈度
    const totalPlayers = room.players.length;
    const spyCount = totalPlayers >= 6 ? 2 : 1;

    const shuffledPlayers = shuffle(room.players);
    const spyPlayerIds = shuffledPlayers.slice(0, spyCount).map((p) => p.playerId);

    const shuffledRoles = shuffle(template.roles);
    const secretsForGame = new Map<string, PlayerSecret>();

    room.players.forEach((player, idx) => {
      const isSpy = spyPlayerIds.includes(player.playerId);
      const roleDef = shuffledRoles[idx % shuffledRoles.length];
      player.publicRoleName = roleDef.roleName;
      player.hasActed = false;
      player.hasVoted = false;
      player.voteCount = 0;
      player.isEliminated = false;

      if (isSpy) {
        const spySecretDef =
          template.spySecrets[Math.floor(Math.random() * template.spySecrets.length)];
        const trapDef = getRandomTrapMission();
        const trapMission: TrapMission = {
          id: `trap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          keyword: trapDef.keyword,
          description: trapDef.description,
          achieved: false,
        };

        const secret: PlayerSecret = {
          playerId: player.playerId,
          team: Team.SPY,
          roleName: roleDef.roleName,
          secret: spySecretDef.secret,
          mission: spySecretDef.mission,
          knownInformation: [...spySecretDef.knownInformation, ...roleDef.knownClues],
          trapMission,
        };
        secretsForGame.set(player.playerId, secret);
        this.store.saveSecret(gameId, player.playerId, secret);
      } else {
        const normalSecretDef =
          template.normalSecretsPool[Math.floor(Math.random() * template.normalSecretsPool.length)];
        const secret: PlayerSecret = {
          playerId: player.playerId,
          team: Team.NORMAL,
          roleName: roleDef.roleName,
          secret: roleDef.defaultSecret || normalSecretDef.secret,
          mission: roleDef.defaultMission || normalSecretDef.mission,
          knownInformation: roleDef.knownClues,
        };
        secretsForGame.set(player.playerId, secret);
        this.store.saveSecret(gameId, player.playerId, secret);
      }
    });

    playerSecrets.set(gameId, secretsForGame);

    // 第一轮案发事件
    const openingTemplate =
      template.openingEvents[Math.floor(Math.random() * template.openingEvents.length)];

    const openingEvent: GameEvent = {
      eventId: `event_open_${Date.now()}`,
      gameId,
      round: 1,
      type: "OPENING",
      title: openingTemplate.title,
      description: openingTemplate.description,
      publicClue: openingTemplate.publicClue,
      discussionPrompt: openingTemplate.discussionPrompt,
      source: "TEMPLATE",
      createdAt: Date.now(),
    };

    const serverGame: ServerGame = {
      gameId,
      roomId,
      phase: GamePhase.ROLE_ASSIGNMENT,
      themeId: template.themeId,
      themeName: template.themeName,
      themeBackground: template.background,
      round: 0,
      startedAt: Date.now(),
      spyPlayerIds,
      eliminatedPlayerIds: [],
      phaseEndsAt: Date.now() + 25 * 1000, // 25秒阅读私密身份
      events: [openingEvent],
      aiComments: [],
      actions: [],
      midVotes: [],
      votes: [],
      version: 1,
    };

    games.set(gameId, serverGame);
    room.status = "PLAYING";
    room.currentGameId = gameId;

    this.store.saveGame(serverGame);
    this.store.saveRoom(room);
    this.broadcast(roomId);

    return { room, game: toPublicGame(serverGame)! };
  }

  public getMySecret(gameId: string, playerId: string): PlayerSecret {
    const gameSecrets = playerSecrets.get(gameId);
    if (!gameSecrets) {
      // 尝试从 SQLite 读取
      const s = this.store.getSecret(gameId, playerId);
      if (s) return s;
      throw new Error(ErrorCode.GAME_NOT_FOUND);
    }
    const secret = gameSecrets.get(playerId);
    if (!secret) {
      throw new Error(ErrorCode.UNAUTHORIZED);
    }
    return secret;
  }

  /**
   * 提交玩家发言/行动（放开发言限制，文字 + 语音，不限次数，意图作为可选标签）
   */
  public submitAction(
    gameId: string,
    playerId: string,
    type: ActionType = ActionType.CHAT,
    targetPlayerId?: string,
    content: string = "",
    audioData?: string,
    audioDuration?: number
  ): { game: Game; room: Room } {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const allowedPhases = [
      GamePhase.ROUND_1,
      GamePhase.ROUND_2,
      GamePhase.FINAL_ROUND,
    ];
    if (!allowedPhases.includes(game.phase)) {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) throw new Error(ErrorCode.UNAUTHORIZED);

    // 已被放逐出局的玩家不可发言
    if (player.isEliminated) {
      throw new Error("PLAYER_ELIMINATED");
    }

    // 突破一人一次限制！玩家可以自由反复发言辩论
    let targetPlayerName: string | undefined = undefined;
    if (targetPlayerId) {
      const target = room.players.find((p) => p.playerId === targetPlayerId);
      targetPlayerName = target ? `${target.nickname} (${target.publicRoleName || "嫌疑人"})` : undefined;
    }

    // 音频安全与大小合规限制（防止恶意超大 Base64 造成网络与内存雪崩）
    if (audioData) {
      if (typeof audioData !== "string" || audioData.length > 1.5 * 1024 * 1024) {
        throw new Error("AUDIO_TOO_LARGE");
      }
      if (audioDuration && audioDuration > 65) {
        throw new Error("AUDIO_DURATION_EXCEEDED");
      }
    }

    // 内容安全合规过滤
    const cleanContent = contentSecurity.sanitizeSync(content.slice(0, 500));

    const action: PlayerAction = {
      actionId: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gameId,
      round: game.round,
      playerId,
      playerName: `${player.nickname} (${player.publicRoleName || "职员"})`,
      type: type || ActionType.CHAT,
      targetPlayerId,
      targetPlayerName,
      content: cleanContent,
      audioData,
      audioDuration,
      createdAt: Date.now(),
    };

    game.actions.push(action);
    player.hasActed = true;

    // 钓鱼暗令检测：好人发言中是否中招触发内鬼的冷门关键词
    const gameSecrets = playerSecrets.get(gameId);
    const isActorSpy = game.spyPlayerIds.includes(playerId);
    if (!isActorSpy && content && gameSecrets) {
      for (const spyId of game.spyPlayerIds) {
        const spySecret = gameSecrets.get(spyId);
        if (spySecret && spySecret.trapMission && !spySecret.trapMission.achieved) {
          if (content.toLowerCase().includes(spySecret.trapMission.keyword.toLowerCase())) {
            spySecret.trapMission.achieved = true;
            spySecret.trapMission.victimPlayerId = playerId;
            spySecret.trapMission.victimPlayerName = player.nickname;
            spySecret.trapMission.triggeredAt = Date.now();
            game.trapTriggered = true;
            break;
          }
        }
      }
    }

    game.version += 1;
    this.store.saveGame(game);
    this.broadcast(room.roomId);

    // AI 导演实时介入概率检测：当某轮发言累计达 3 条且尚未有最新点评时，异步触发 AI 导演插话
    this.triggerAIDirectorCommentIfAppropriate(game, room);

    return { game: toPublicGame(game)!, room };
  }

  /**
   * 触发 AI 导演实时插话点评 / 现场追问
   */
  private async triggerAIDirectorCommentIfAppropriate(game: ServerGame, room: Room) {
    const roundActions = game.actions.filter((a) => a.round === game.round);
    const roundComments = (game.aiComments || []).filter((c) => c.round === game.round);

    // 限制每轮最多自动插话 2 次，避免过频打断
    if (roundActions.length >= 3 && roundComments.length < 2) {
      const template = getThemeById(game.themeId);
      const playersList = room.players.map((p) => ({
        name: p.nickname,
        roleName: p.publicRoleName || "嫌疑人",
      }));

      try {
        const commentData = await this.aiGateway.generateRoundComment(
          game.gameId,
          game.round,
          template.themeName,
          roundActions.map((a) => ({
            actor: a.playerName,
            content: a.content,
            type: a.type,
            target: a.targetPlayerName,
          })),
          playersList
        );

        if (commentData && commentData.text) {
          if (!game.aiComments) game.aiComments = [];
          const newComment: AIDirectorComment = {
            commentId: `aic_${Date.now()}`,
            round: game.round,
            phase: game.phase,
            text: commentData.text,
            targetedPlayerName: commentData.targetedPlayerName,
            createdAt: Date.now(),
          };
          game.aiComments.push(newComment);
          game.version += 1;
          this.store.saveGame(game);
          this.broadcast(room.roomId);
        }
      } catch (e) {
        console.warn("[GameEngine] AI director round comment failed:", e);
      }
    }
  }

  /**
   * 玩家主动“呼叫AI导演评理/质询现场”
   */
  public async requestAIDirectorInterrogation(
    gameId: string,
    playerId: string
  ): Promise<{ game: Game; room: Room }> {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) throw new Error(ErrorCode.UNAUTHORIZED);

    const template = getThemeById(game.themeId);
    const recentActions = game.actions.slice(-10).map((a) => ({
      actor: a.playerName,
      content: a.content,
    }));

    const text = await this.aiGateway.callDirectorInterrogation(
      template.themeName,
      player.nickname,
      player.publicRoleName || "职员",
      recentActions
    );

    if (!game.aiComments) game.aiComments = [];
    game.aiComments.push({
      commentId: `aic_req_${Date.now()}`,
      round: game.round,
      phase: game.phase,
      text,
      targetedPlayerId: player.playerId,
      targetedPlayerName: player.nickname,
      tone: "INTERROGATION",
      createdAt: Date.now(),
    });

    game.version += 1;
    this.store.saveGame(game);
    this.broadcast(room.roomId);

    return { game: toPublicGame(game)!, room };
  }

  public sendVoiceMessage(
    roomId: string,
    playerId: string,
    content: string = "",
    audioData?: string,
    audioDuration?: number
  ): { room: Room; message: RoomVoiceMessage } {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) throw new Error(ErrorCode.UNAUTHORIZED);

    if (audioData) {
      if (typeof audioData !== "string" || audioData.length > 1.5 * 1024 * 1024) {
        throw new Error("AUDIO_TOO_LARGE");
      }
      if (audioDuration && audioDuration > 65) {
        throw new Error("AUDIO_DURATION_EXCEEDED");
      }
    }

    if (!room.voiceMessages) {
      room.voiceMessages = [];
    }

    const cleanContent = contentSecurity.sanitizeSync(content.trim());

    const message: RoomVoiceMessage = {
      messageId: `vmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      playerId,
      playerName: player.nickname,
      avatarUrl: player.avatarUrl,
      content: cleanContent || (audioDuration ? `[语音 ${Math.round(audioDuration)}" ]` : "发表了一条语音"),
      audioData,
      audioDuration,
      createdAt: Date.now(),
    };

    room.voiceMessages.push(message);
    if (room.voiceMessages.length > 60) {
      room.voiceMessages = room.voiceMessages.slice(-60);
    }

    this.store.saveRoom(room);
    this.broadcast(roomId);
    return { room, message };
  }

  /**
   * 房主手动提前推进（若玩家提早讨论完毕无需硬等倒计时）
   */
  public async advancePhase(
    gameId: string,
    requesterId: string,
    expectedVersion?: number
  ): Promise<{ game?: Game; room: Room }> {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    if (room.ownerId !== requesterId) {
      throw new Error(ErrorCode.NOT_ROOM_OWNER);
    }
    if (expectedVersion !== undefined && game.version !== expectedVersion) {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }

    return this.advancePhaseInternal(gameId);
  }

  /**
   * 核心流转状态机：
   * ROLE_ASSIGNMENT (25s)
   * -> ROUND_1 (第1轮自由讨论 90s)
   * -> ROUND_2 (第2轮深入质疑 90s + AI现场点评)
   * -> MID_VOTING (首轮公投放逐 45s)
   * -> EXILE_RESULT (放逐身份震撼公布 15s)
   * -> FINAL_ROUND (决赛轮反转激辩 90s)
   * -> VOTING (终极审判投票 45s)
   * -> SETTLEMENT -> RESULT
   */
  public async advancePhaseInternal(gameId: string): Promise<{ game?: Game; room: Room }> {
    if (this.advancing.has(gameId)) {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }
    this.advancing.add(gameId);

    try {
      const game = games.get(gameId);
      if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
      const room = rooms.get(game.roomId);
      if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

      const template: ThemeTemplate = room.customTheme || getThemeById(game.themeId);

      switch (game.phase) {
        case GamePhase.ROLE_ASSIGNMENT: {
          game.phase = GamePhase.ROUND_1;
          game.round = 1;
          game.phaseEndsAt = Date.now() + 90 * 1000;
          break;
        }

        case GamePhase.ROUND_1: {
          // 进入第2轮：追加证物线索
          game.phase = GamePhase.ROUND_2;
          game.round = 2;
          game.phaseEndsAt = Date.now() + 90 * 1000;

          const r2Template =
            template.round2Events[Math.floor(Math.random() * template.round2Events.length)];
          const r2Event: GameEvent = {
            eventId: `event_r2_${Date.now()}`,
            gameId,
            round: 2,
            type: "CLUE",
            title: r2Template.title,
            description: r2Template.description,
            publicClue: r2Template.publicClue,
            discussionPrompt: r2Template.discussionPrompt,
            source: "TEMPLATE",
            createdAt: Date.now(),
          };
          game.events.push(r2Event);
          break;
        }

        case GamePhase.ROUND_2: {
          // 进入首轮中期放逐投票！(MID_VOTING)
          game.phase = GamePhase.MID_VOTING;
          game.phaseEndsAt = Date.now() + 45 * 1000;
          room.players.forEach((p) => {
            p.hasVoted = false;
            p.voteCount = 0;
          });
          game.midVotes = [];
          this.triggerBotVotes(game, room, true);
          break;
        }

        case GamePhase.MID_VOTING: {
          // 中期放逐结算并进入 EXILE_RESULT
          await this.settleMidExile(game, room);
          break;
        }

        case GamePhase.EXILE_RESULT: {
          // 进入决赛轮 (FINAL_ROUND) 激辩！AI 导演剧情大反转
          game.phase = GamePhase.FINAL_ROUND;
          game.round = 3;
          game.phaseEndsAt = Date.now() + 90 * 1000;

          const publicRoles = room.players.map((p) => ({
            playerAlias: p.nickname,
            roleName: p.publicRoleName || "职员",
          }));
          const importantActions = game.actions.map((a) => ({
            actor: a.playerName,
            action: a.type,
            target: a.targetPlayerName,
            content: a.content,
          }));
          const revealedClues = game.events
            .filter((e) => e.publicClue)
            .map((e) => e.publicClue as string);

          const twistEvent = await this.aiGateway.generateTwist(gameId, {
            theme: template.themeName,
            round: 3,
            publicRoles,
            importantActions,
            revealedClues,
          });
          game.events.push(twistEvent);
          break;
        }

        case GamePhase.FINAL_ROUND: {
          // 进入终极投票
          game.phase = GamePhase.VOTING;
          game.phaseEndsAt = Date.now() + 45 * 1000;
          room.players.forEach((p) => {
            p.hasVoted = false;
            p.voteCount = 0;
          });
          this.triggerBotVotes(game, room, false);
          break;
        }

        case GamePhase.VOTING: {
          // 最终结算！
          await this.settleGame(gameId);
          break;
        }

        default:
          break;
      }

      game.version += 1;
      this.store.saveGame(game);
      this.store.saveRoom(room);
      this.broadcast(room.roomId);

      return { game: toPublicGame(game), room };
    } finally {
      this.advancing.delete(gameId);
    }
  }

  /**
   * 中期放逐公投结算 (Mid-Voting Exile Settlement)
   */
  private async settleMidExile(game: ServerGame, room: Room) {
    const voteCounts: Record<string, number> = {};
    const livingPlayers = room.players.filter((p) => !p.isEliminated);
    livingPlayers.forEach((p) => {
      voteCounts[p.playerId] = 0;
    });

    (game.midVotes || []).forEach((v) => {
      if (voteCounts[v.targetPlayerId] !== undefined) {
        voteCounts[v.targetPlayerId] = (voteCounts[v.targetPlayerId] || 0) + 1;
      }
    });

    livingPlayers.forEach((p) => {
      p.voteCount = voteCounts[p.playerId] || 0;
    });

    const entries = Object.entries(voteCounts);
    const maxVotes = Math.max(0, ...entries.map(([, c]) => c));
    let exiledPlayer: RoomPlayer | undefined = undefined;

    if (maxVotes > 0) {
      const topIds = entries.filter(([, c]) => c === maxVotes).map(([id]) => id);
      // 若平票，随机挑一人被公投放逐，制造极致悬疑
      const chosenId = topIds[Math.floor(Math.random() * topIds.length)];
      exiledPlayer = room.players.find((p) => p.playerId === chosenId);
    }

    if (exiledPlayer) {
      exiledPlayer.isEliminated = true;
      exiledPlayer.eliminatedInPhase = GamePhase.MID_VOTING;
      if (!game.eliminatedPlayerIds) game.eliminatedPlayerIds = [];
      game.eliminatedPlayerIds.push(exiledPlayer.playerId);

      const isSpy = game.spyPlayerIds.includes(exiledPlayer.playerId);
      const secret = playerSecrets.get(game.gameId)?.get(exiledPlayer.playerId);

      game.exiledPlayer = {
        playerId: exiledPlayer.playerId,
        name: exiledPlayer.nickname,
        roleName: exiledPlayer.publicRoleName || "职员",
        team: isSpy ? Team.SPY : Team.NORMAL,
        reason: `以最高票 (${maxVotes} 票) 被大家公投放逐出局！`,
      };

      // AI 导演戏剧化审判判词
      const speech = await this.aiGateway.generateExileSpeech(
        game.themeName,
        exiledPlayer.nickname,
        exiledPlayer.publicRoleName || "职员",
        isSpy,
        maxVotes
      );

      const exileEvent: GameEvent = {
        eventId: `event_exile_${Date.now()}`,
        gameId: game.gameId,
        round: 2,
        type: "SYSTEM",
        title: "首轮放逐公投结果宣告",
        description: speech,
        publicClue: `【放逐核验】：${exiledPlayer.nickname} 已被移出决策室，真实阵营为【${
          isSpy ? "内鬼" : "普通好人"
        }】！`,
        source: "AI",
        createdAt: Date.now(),
      };
      game.events.push(exileEvent);

      if (!game.aiComments) game.aiComments = [];
      game.aiComments.push({
        commentId: `aic_exile_${Date.now()}`,
        round: 2,
        phase: GamePhase.EXILE_RESULT,
        text: speech,
        targetedPlayerId: exiledPlayer.playerId,
        targetedPlayerName: exiledPlayer.nickname,
        tone: "DRAMATIC",
        createdAt: Date.now(),
      });
    }

    game.phase = GamePhase.EXILE_RESULT;
    game.phaseEndsAt = Date.now() + 15 * 1000; // 15秒阅读判决
  }

  /**
   * 提交中期放逐投票
   */
  public async submitMidVote(
    gameId: string,
    voterPlayerId: string,
    targetPlayerId: string
  ): Promise<{ game: Game; room: Room }> {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    if (game.phase !== GamePhase.MID_VOTING) {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }

    const voter = room.players.find((p) => p.playerId === voterPlayerId);
    if (!voter || voter.isEliminated) throw new Error(ErrorCode.UNAUTHORIZED);

    const target = room.players.find((p) => p.playerId === targetPlayerId);
    if (!target || target.isEliminated) throw new Error("TARGET_PLAYER_NOT_FOUND");

    if (!game.midVotes) game.midVotes = [];
    const alreadyVoted = game.midVotes.find((v) => v.voterPlayerId === voterPlayerId);
    if (alreadyVoted) {
      throw new Error(ErrorCode.ALREADY_VOTED);
    }

    const vote: Vote = {
      gameId,
      voterPlayerId,
      targetPlayerId,
      createdAt: Date.now(),
    };
    game.midVotes.push(vote);
    voter.hasVoted = true;
    target.voteCount = (target.voteCount || 0) + 1;
    game.version += 1;

    // 若所有在线幸存非bot玩家都投票完成，立刻进入放逐结算！
    const pending = room.players.filter((p) => p.online && !p.isBot && !p.isEliminated && !p.hasVoted);
    if (pending.length === 0) {
      await this.settleMidExile(game, room);
    }

    this.store.saveGame(game);
    this.broadcast(room.roomId);
    return { game: toPublicGame(game)!, room };
  }

  /**
   * 提交终局审判投票 (VOTING)
   */
  public async submitVote(
    gameId: string,
    voterPlayerId: string,
    targetPlayerId: string
  ): Promise<{ game: Game; room: Room }> {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    if (game.phase !== GamePhase.VOTING) {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }

    const voter = room.players.find((p) => p.playerId === voterPlayerId);
    if (!voter || voter.isEliminated) throw new Error(ErrorCode.UNAUTHORIZED);

    const target = room.players.find((p) => p.playerId === targetPlayerId);
    if (!target || target.isEliminated) throw new Error("TARGET_PLAYER_NOT_FOUND");

    const alreadyVoted = game.votes.find((v) => v.voterPlayerId === voterPlayerId);
    if (alreadyVoted) {
      throw new Error(ErrorCode.ALREADY_VOTED);
    }

    const vote: Vote = {
      gameId,
      voterPlayerId,
      targetPlayerId,
      createdAt: Date.now(),
    };

    game.votes.push(vote);
    voter.hasVoted = true;
    target.voteCount = (target.voteCount || 0) + 1;
    game.version += 1;

    const pendingVoters = room.players.filter(
      (p) => p.online && !p.isBot && !p.isEliminated && !p.hasVoted
    );
    if (pendingVoters.length === 0) {
      await this.settleGame(gameId);
    }

    this.store.saveGame(game);
    this.broadcast(room.roomId);
    return { game: toPublicGame(game)!, room };
  }

  /**
   * 终局胜负结算与平衡重调：
   * 1. 好人需抓出全部内鬼才算赢 (淘汰掉所有 spyPlayerIds)
   * 2. 平票判平局 (winnerTeam = "TIE")
   */
  public async settleGame(gameId: string): Promise<{ game: Game; room: Room }> {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    game.phase = GamePhase.SETTLEMENT;

    // 统计最终得票数 (仅统计幸存者)
    const voteCounts: Record<string, number> = {};
    const livingPlayers = room.players.filter((p) => !p.isEliminated);
    livingPlayers.forEach((p) => {
      voteCounts[p.playerId] = 0;
    });

    game.votes.forEach((v) => {
      if (voteCounts[v.targetPlayerId] !== undefined) {
        voteCounts[v.targetPlayerId] = (voteCounts[v.targetPlayerId] || 0) + 1;
      }
    });

    livingPlayers.forEach((p) => {
      p.voteCount = voteCounts[p.playerId] || 0;
    });

    const entries = Object.entries(voteCounts);
    const maxVotes = Math.max(0, ...entries.map(([, c]) => c));

    // 统计被捕获的内鬼集合
    const eliminatedSpies = new Set<string>();
    // 中期被放逐的内鬼
    if (game.exiledPlayer && game.exiledPlayer.team === Team.SPY) {
      eliminatedSpies.add(game.exiledPlayer.playerId);
    }

    if (maxVotes === 0) {
      // 全员弃票/零票，内鬼得手
      game.winnerTeam = Team.SPY;
      game.isTie = false;
    } else {
      const top = entries.filter(([, c]) => c === maxVotes).map(([id]) => id);

      // 平票判定：平票判平局 (TIE)
      if (top.length > 1) {
        game.winnerTeam = "TIE";
        game.isTie = true;
      } else {
        const convictedId = top[0];
        if (game.spyPlayerIds.includes(convictedId)) {
          eliminatedSpies.add(convictedId);
        }

        // 好人胜出的必要充分条件：必须抓出全部内鬼！
        const allSpiesCaptured = game.spyPlayerIds.every((sId) => eliminatedSpies.has(sId));
        if (allSpiesCaptured) {
          game.winnerTeam = Team.NORMAL;
          game.isTie = false;
        } else {
          game.winnerTeam = Team.SPY;
          game.isTie = false;
        }
      }
    }

    game.endedAt = Date.now();

    // 揭开全部内鬼真相
    const gameSecrets = playerSecrets.get(gameId);
    game.revealedSpies = game.spyPlayerIds.map((sId) => {
      const p = room.players.find((item) => item.playerId === sId);
      const secret = gameSecrets?.get(sId);
      return {
        playerId: sId,
        name: p ? p.nickname : "内鬼",
        roleName: secret ? secret.roleName : "职员",
      };
    });

    // 生成赛后 AI 报告
    const spiesInfo = game.revealedSpies;
    const playersSummary = room.players.map((p) => {
      const secret = gameSecrets?.get(p.playerId);
      return {
        id: p.playerId,
        name: p.nickname,
        roleName: p.publicRoleName || "职员",
        team: secret?.team || Team.NORMAL,
        votesReceived: p.voteCount || 0,
      };
    });

    const actionsSummary = game.actions.map(
      (a) =>
        `${a.playerName} 进行了「${a.type}」，目标是：${a.targetPlayerName || "全场"}。${
          a.content ? `内容：${a.content}` : ""
        }`
    );

    const votesSummary = game.votes.map((v) => {
      const voter = room.players.find((p) => p.playerId === v.voterPlayerId);
      const target = room.players.find((p) => p.playerId === v.targetPlayerId);
      return {
        voter: voter?.nickname || "玩家",
        target: target?.nickname || "玩家",
      };
    });

    const report = await this.aiGateway.generateReport({
      theme: game.themeName,
      winnerTeam: game.winnerTeam === "TIE" ? Team.NORMAL : game.winnerTeam,
      spies: spiesInfo,
      players: playersSummary,
      actionsSummary,
      votesSummary,
    });

    // 钓鱼暗令成就结算
    if (gameSecrets) {
      for (const sId of game.spyPlayerIds) {
        const sec = gameSecrets.get(sId);
        if (sec?.trapMission?.achieved) {
          const spyP = room.players.find((p) => p.playerId === sId);
          report.trapAchievement = {
            spyName: spyP?.nickname || "内鬼",
            keyword: sec.trapMission.keyword,
            victimName: sec.trapMission.victimPlayerName || "某好人",
            bonusNotice: `内鬼【${spyP?.nickname || "内鬼"}】成功诱导【${
              sec.trapMission.victimPlayerName
            }】说出暗号「${sec.trapMission.keyword}」，达成【👑 绝命钓鱼王】冷门暗语神级成就！`,
          };
          break;
        }
      }
    }

    game.report = report;
    game.phase = GamePhase.RESULT;
    game.version += 1;

    this.store.saveGame(game);
    this.store.saveRoom(room);
    this.broadcast(room.roomId);

    return { game: toPublicGame(game)!, room };
  }

  private triggerBotVotes(game: ServerGame, room: Room, isMidVote: boolean) {
    const bots = room.players.filter((p) => p.isBot && !p.isEliminated);
    const candidatePool = room.players.filter((p) => !p.isEliminated);

    bots.forEach((bot) => {
      const candidates = candidatePool.filter((p) => p.playerId !== bot.playerId);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const vote: Vote = {
          gameId: game.gameId,
          voterPlayerId: bot.playerId,
          targetPlayerId: target.playerId,
          createdAt: Date.now(),
        };
        if (isMidVote) {
          if (!game.midVotes) game.midVotes = [];
          game.midVotes.push(vote);
        } else {
          game.votes.push(vote);
        }
        bot.hasVoted = true;
        target.voteCount = (target.voteCount || 0) + 1;
      }
    });
  }

  public restartGame(roomId: string, requesterId: string): { room: Room; game: Game } {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.ownerId !== requesterId) throw new Error(ErrorCode.NOT_ROOM_OWNER);

    if (room.currentGameId) {
      games.delete(room.currentGameId);
      playerSecrets.delete(room.currentGameId);
    }

    room.players.forEach((p) => {
      p.isReady = true;
      p.hasActed = false;
      p.hasVoted = false;
      p.voteCount = 0;
      p.isEliminated = false;
    });

    return this.startGame(roomId, requesterId);
  }

  public triggerBotActions(gameId: string): { game: Game; room: Room } {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const bots = room.players.filter((p) => p.isBot && !p.isEliminated);

    if (
      game.phase === GamePhase.ROUND_1 ||
      game.phase === GamePhase.ROUND_2 ||
      game.phase === GamePhase.FINAL_ROUND
    ) {
      const actionPool = [
        { type: ActionType.ACCUSE, content: "昨晚他的时间线有很大疑点，我亲眼看到他慌张关电脑！" },
        { type: ActionType.DEFEND, content: "我和他昨晚都在现场聊天，他根本没有作案时间。" },
        { type: ActionType.REVEAL, content: "我梳理了一下现场物理痕迹，发现一个很关键的线索！" },
        { type: ActionType.INVESTIGATE, content: "建议比对各人的出入时间差，肯定有人在隐瞒！" },
        { type: ActionType.CHAT, content: "大家不要被带节奏，真正的内鬼正在暗中观察。" },
      ];

      bots.forEach((bot) => {
        const act = actionPool[Math.floor(Math.random() * actionPool.length)];
        const otherPlayers = room.players.filter((p) => p.playerId !== bot.playerId && !p.isEliminated);
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        try {
          this.submitAction(gameId, bot.playerId, act.type, target?.playerId, act.content);
        } catch (e) {
          // ignore
        }
      });
    }

    return { game: toPublicGame(game)!, room };
  }
}
