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
} from "../src/types/game.js";
import { COMPANY_THEME, ThemeTemplate, getThemeById, getRandomTrapMission } from "./templates.js";
import { AIGateway } from "./aiGateway.js";
import { playerIdOf } from "./auth.js";

/**
 * 服务端内部对局状态，携带隐藏身份。绝不下发客户端。
 */
export interface ServerGame extends Game {
  spyPlayerIds: string[];
}

// 内存数据库 (满足 MVP 高性能与实时性要求)
export const rooms = new Map<string, Room>();
export const games = new Map<string, ServerGame>();
// 私密秘密表：gameId -> Map<playerId, PlayerSecret> (强权限隔离，绝不流入公共状态)
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
  private advancing = new Set<string>();

  private constructor() {
    this.aiGateway = AIGateway.getInstance();
  }

  public static getInstance(): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine();
    }
    return GameEngine.instance;
  }

  // --- 房间管理 ---

  public createRoom(user: { openid: string; nickname: string; avatarUrl: string }): Room {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let roomCode = generateRoomCode();
    // 确保 code 唯一
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
    };

    const room: Room = {
      roomId,
      roomCode,
      ownerId: owner.playerId,
      status: "WAITING",
      minPlayers: 4,
      maxPlayers: 8,
      themeId: COMPANY_THEME.themeId,
      themeName: COMPANY_THEME.themeName,
      themeBackground: COMPANY_THEME.background,
      customTheme: COMPANY_THEME,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      players: [owner],
      voiceMessages: [],
    };

    rooms.set(roomId, room);
    return room;
  }

  /**
   * 房主更换或定制房间剧本 (Custom Scenario)
   */
  public setRoomTheme(roomId: string, theme: ThemeTemplate, requesterId: string): Room {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.ownerId !== requesterId) throw new Error(ErrorCode.NOT_ROOM_OWNER);
    if (room.status !== "WAITING") throw new Error(ErrorCode.INVALID_GAME_STATE);

    room.themeId = theme.themeId;
    room.themeName = theme.themeName;
    room.themeBackground = theme.background;
    room.customTheme = theme;
    return room;
  }

  public joinRoom(
    roomCode: string,
    user: { openid: string; nickname: string; avatarUrl: string }
  ): { room: Room; player: RoomPlayer } {
    const room = Array.from(rooms.values()).find((r) => r.roomCode === roomCode.trim());
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }
    if (room.status !== "WAITING" && room.status !== "PLAYING") {
      throw new Error(ErrorCode.ROOM_EXPIRED);
    }

    const playerId = playerIdOf(user.openid);
    const existing = room.players.find((p) => p.playerId === playerId || p.openid === user.openid);

    if (existing) {
      existing.online = true;
      existing.lastSeenAt = Date.now();
      existing.nickname = user.nickname || existing.nickname;
      return { room, player: existing };
    }

    if (room.status === "PLAYING") {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error(ErrorCode.ROOM_FULL);
    }

    const newPlayer: RoomPlayer = {
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
    };

    room.players.push(newPlayer);
    return { room, player: newPlayer };
  }

  public leaveRoom(roomId: string, playerId: string): Room {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.status === "WAITING") {
      room.players = room.players.filter((p) => p.playerId !== playerId);
      if (room.players.length === 0) {
        rooms.delete(roomId);
        return room;
      }
      if (room.ownerId === playerId) {
        // 房主转移给最早进入的真人玩家或任意玩家
        const nextOwner = room.players.find((p) => !p.isBot) || room.players[0];
        nextOwner.isOwner = true;
        nextOwner.isReady = true;
        room.ownerId = nextOwner.playerId;
      }
    } else {
      // 游戏中标记掉线
      const p = room.players.find((item) => item.playerId === playerId);
      if (p) {
        p.online = false;
        p.lastSeenAt = Date.now();
      }
    }

    return room;
  }

  public setReady(roomId: string, playerId: string, isReady: boolean): Room {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }
    const p = room.players.find((item) => item.playerId === playerId);
    if (!p) {
      throw new Error(ErrorCode.UNAUTHORIZED);
    }
    if (p.isOwner) {
      p.isReady = true; // 房主始终默认准备好
    } else {
      p.isReady = isReady;
    }
    return room;
  }

  /**
   * 快速填充测试玩家 (机器人好友)，方便单人测试或凑齐4-6人开局
   */
  public addBotPlayers(roomId: string, countNeeded: number = 6): Room {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }
    const currentCount = room.players.length;
    const toAdd = Math.min(countNeeded - currentCount, room.maxPlayers - currentCount);

    const botNames = ["小王(财务)", "阿杰(程序员)", "七喜(HR)", "大明(销售)", "佳佳(行政)", "晨晨(实习生)"];

    for (let i = 0; i < toAdd; i++) {
      const idx = (currentCount + i) % botNames.length;
      const botId = `bot_${Date.now()}_${i}`;
      const botPlayer: RoomPlayer = {
        playerId: botId,
        roomId: room.roomId,
        openid: `openid_${botId}`,
        nickname: botNames[idx],
        avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${botNames[idx]}`,
        isOwner: false,
        isReady: true,
        online: true,
        isBot: true,
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      room.players.push(botPlayer);
    }
    return room;
  }

  public getRoom(roomId: string): { room: Room; game?: Game } {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }
    const game = room.currentGameId ? games.get(room.currentGameId) : undefined;
    return { room, game: toPublicGame(game) };
  }

  public getRoomByCode(roomCode: string): { room: Room; game?: Game } {
    const room = Array.from(rooms.values()).find((r) => r.roomCode === roomCode.trim());
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }
    const game = room.currentGameId ? games.get(room.currentGameId) : undefined;
    return { room, game: toPublicGame(game) };
  }

  // --- 游戏引擎核心流程 ---

  /**
   * 房主发起开始游戏 (P0 安全：服务端洗牌与分配身份)
   */
  public startGame(roomId: string, ownerId: string): { room: Room; game: Game } {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.ownerId !== ownerId) throw new Error(ErrorCode.NOT_ROOM_OWNER);
    if (room.players.length < room.minPlayers) throw new Error(ErrorCode.NOT_ENOUGH_PLAYERS);

    // 检查所有非房主玩家是否已准备
    const unready = room.players.filter((p) => !p.isOwner && !p.isReady);
    if (unready.length > 0) {
      throw new Error(ErrorCode.PLAYER_NOT_READY);
    }

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const template: ThemeTemplate = room.customTheme || getThemeById(room.themeId);

    // 随机分配角色与内鬼身份 (Fisher-Yates 算法)
    const playerCount = room.players.length;
    const spyCount = playerCount >= 8 ? 2 : 1;

    // 随机洗牌玩家顺序来定内鬼
    const playerIndices = room.players.map((_, i) => i);
    const shuffledPlayerIndexes = shuffle(playerIndices);

    const spyIndexes = new Set(shuffledPlayerIndexes.slice(0, spyCount));
    const spyPlayerIds: string[] = [];

    // 洗牌可用公开职业
    const shuffledRoles = shuffle(template.roles);

    const secretsForGame = new Map<string, PlayerSecret>();

    room.players.forEach((player, idx) => {
      const isSpy = spyIndexes.has(idx);
      const roleDef = shuffledRoles[idx % shuffledRoles.length];
      player.publicRoleName = roleDef.roleName;
      player.hasActed = false;
      player.hasVoted = false;
      player.voteCount = 0;

      if (isSpy) {
        spyPlayerIds.push(player.playerId);
        const spySecretDef = template.spySecrets[Math.floor(Math.random() * template.spySecrets.length)];
        const trapDef = getRandomTrapMission();
        const trapMission: TrapMission = {
          id: `trap_${Date.now()}_${idx}`,
          keyword: trapDef.keyword,
          description: trapDef.description,
          achieved: false,
        };

        secretsForGame.set(player.playerId, {
          playerId: player.playerId,
          team: Team.SPY,
          roleName: roleDef.roleName,
          secret: spySecretDef.secret,
          mission: spySecretDef.mission,
          knownInformation: [...spySecretDef.knownInformation, ...roleDef.knownClues],
          trapMission,
        });
      } else {
        const normalSecretDef =
          template.normalSecretsPool[Math.floor(Math.random() * template.normalSecretsPool.length)];
        secretsForGame.set(player.playerId, {
          playerId: player.playerId,
          team: Team.NORMAL,
          roleName: roleDef.roleName,
          secret: roleDef.defaultSecret || normalSecretDef.secret,
          mission: roleDef.defaultMission || normalSecretDef.mission,
          knownInformation: roleDef.knownClues,
        });
      }
    });

    playerSecrets.set(gameId, secretsForGame);

    // 第一轮事件
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
      phaseEndsAt: Date.now() + 30 * 1000, // 30秒阅读身份
      events: [openingEvent],
      actions: [],
      votes: [],
      version: 1,
    };

    games.set(gameId, serverGame);
    room.status = "PLAYING";
    room.currentGameId = gameId;

    return { room, game: toPublicGame(serverGame)! };
  }

  /**
   * 安全读取个人秘密 (PlayerSecret 仅自己可见)
   */
  public getMySecret(gameId: string, playerId: string): PlayerSecret {
    const gameSecrets = playerSecrets.get(gameId);
    if (!gameSecrets) {
      throw new Error(ErrorCode.GAME_NOT_FOUND);
    }
    const secret = gameSecrets.get(playerId);
    if (!secret) {
      throw new Error(ErrorCode.UNAUTHORIZED);
    }
    return secret;
  }

  /**
   * 提交玩家行动 (质疑 / 辩护 / 公开线索 / 调查 / 保持沉默)
   * 支持语音录音与语音识别内容
   */
  public submitAction(
    gameId: string,
    playerId: string,
    type: ActionType,
    targetPlayerId?: string,
    content: string = "",
    audioData?: string,
    audioDuration?: number
  ): { game: Game; room: Room } {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const allowedPhases = [GamePhase.ROUND_1, GamePhase.ROUND_2, GamePhase.ROUND_3];
    if (!allowedPhases.includes(game.phase)) {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) throw new Error(ErrorCode.UNAUTHORIZED);

    // 检查本轮是否已行动 (防重复操作)
    const existingAction = game.actions.find(
      (a) => a.round === game.round && a.playerId === playerId
    );
    if (existingAction) {
      throw new Error(ErrorCode.ALREADY_ACTED);
    }

    let targetPlayerName: string | undefined = undefined;
    if (targetPlayerId) {
      const target = room.players.find((p) => p.playerId === targetPlayerId);
      targetPlayerName = target ? `${target.nickname} (${target.publicRoleName || "嫌疑人"})` : undefined;
    }

    const action: PlayerAction = {
      actionId: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gameId,
      round: game.round,
      playerId,
      playerName: `${player.nickname} (${player.publicRoleName || "职员"})`,
      type,
      targetPlayerId,
      targetPlayerName,
      content,
      audioData,
      audioDuration,
      createdAt: Date.now(),
    };

    game.actions.push(action);
    player.hasActed = true;

    // 钓鱼暗令检测：好人发言中是否中招触发内鬼的关键词
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

    return { game: toPublicGame(game)!, room };
  }

  /**
   * 发送房间语音条 / 聊天交流消息
   * 满足玩家“不想打字时直接按住说话或发语音玩”的开黑对讲诉求
   */
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

    if (!room.voiceMessages) {
      room.voiceMessages = [];
    }

    const message: RoomVoiceMessage = {
      messageId: `vmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      playerId,
      playerName: player.nickname,
      avatarUrl: player.avatarUrl,
      content: content.trim() || (audioDuration ? `[语音 ${Math.round(audioDuration)}" ]` : "发表了一条语音"),
      audioData,
      audioDuration,
      createdAt: Date.now(),
    };

    room.voiceMessages.push(message);
    // 保留最近 60 条对讲记录
    if (room.voiceMessages.length > 60) {
      room.voiceMessages = room.voiceMessages.slice(-60);
    }

    // 若当前正在游戏中，语音转文字的内容也纳入内鬼钓鱼暗令检测
    if (room.currentGameId) {
      const game = games.get(room.currentGameId);
      if (game && content) {
        const gameSecrets = playerSecrets.get(room.currentGameId);
        const isActorSpy = game.spyPlayerIds.includes(playerId);
        if (!isActorSpy && gameSecrets) {
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
      }
    }

    return { room, message };
  }

  /**
   * 推进游戏阶段 (LOBBY -> ROLE_ASSIGNMENT -> ROUND_1 -> ROUND_2 -> ROUND_3 -> VOTING -> SETTLEMENT -> RESULT)
   * 修复 P1: 内存锁 + 版本乐观锁 + 房主权限校验
   */
  public async advancePhase(
    gameId: string,
    requesterId: string,
    expectedVersion?: number
  ): Promise<{ game?: Game; room: Room }> {
    if (this.advancing.has(gameId)) {
      throw new Error(ErrorCode.INVALID_GAME_STATE);
    }
    this.advancing.add(gameId);

    try {
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

      const template: ThemeTemplate = room.customTheme || getThemeById(game.themeId);

      // 重置玩家行动状态
      room.players.forEach((p) => {
        p.hasActed = false;
      });

      switch (game.phase) {
        case GamePhase.ROLE_ASSIGNMENT: {
          game.phase = GamePhase.ROUND_1;
          game.round = 1;
          game.phaseEndsAt = Date.now() + 90 * 1000;
          break;
        }

        case GamePhase.ROUND_1: {
          // 进入第2轮：追加预制线索
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
          // 进入第3轮：AI导演剧情反转 (AI Twist!)
          game.phase = GamePhase.ROUND_3;
          game.round = 3;
          game.phaseEndsAt = Date.now() + 100 * 1000;

          // 收集前两轮信息生成 Twist Context
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

        case GamePhase.ROUND_3: {
          // 进入最终投票阶段
          game.phase = GamePhase.VOTING;
          game.phaseEndsAt = Date.now() + 60 * 1000;
          room.players.forEach((p) => {
            p.hasVoted = false;
            p.voteCount = 0;
          });

          // 自动驱动已有机器人投票
          this.triggerBotVotes(game, room);
          break;
        }

        case GamePhase.VOTING: {
          // 结束投票，进入结算
          await this.settleGame(gameId);
          break;
        }

        default:
          break;
      }

      game.version += 1;
      return { game: toPublicGame(game), room };
    } finally {
      this.advancing.delete(gameId);
    }
  }

  /**
   * 辅助方法：在进入投票阶段或机器人行动时自动投出机器人票
   */
  private triggerBotVotes(game: ServerGame, room: Room) {
    const bots = room.players.filter((p) => p.isBot && !p.hasVoted);
    bots.forEach((bot) => {
      const candidates = room.players.filter((p) => p.playerId !== bot.playerId);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const vote: Vote = {
          gameId: game.gameId,
          voterPlayerId: bot.playerId,
          targetPlayerId: target.playerId,
          createdAt: Date.now(),
        };
        game.votes.push(vote);
        bot.hasVoted = true;
        target.voteCount = (target.voteCount || 0) + 1;
      }
    });
  }

  /**
   * 提交投票 (P0 投票唯一性与反重复)
   * 修复 P2: 仅在线非Bot玩家计入待投票人数
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
    if (!voter) throw new Error(ErrorCode.UNAUTHORIZED);

    const target = room.players.find((p) => p.playerId === targetPlayerId);
    if (!target) throw new Error("TARGET_PLAYER_NOT_FOUND");

    // 检查是否已投过票
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

    // 如果所有在线非bot玩家都已经投票完成，自动结算！
    const pendingVoters = room.players.filter((p) => p.online && !p.isBot && !p.hasVoted);
    if (pendingVoters.length === 0) {
      await this.settleGame(gameId);
    }

    return { game: toPublicGame(game)!, room };
  }

  /**
   * 胜负结算与AI赛后报告生成
   * 修复 P2 05: 全员0票时判定内鬼胜利，严谨计票
   */
  public async settleGame(gameId: string): Promise<{ game: Game; room: Room }> {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    game.phase = GamePhase.SETTLEMENT;

    // 统计各玩家得票数
    const voteCounts: Record<string, number> = {};
    room.players.forEach((p) => {
      voteCounts[p.playerId] = 0;
    });

    game.votes.forEach((v) => {
      voteCounts[v.targetPlayerId] = (voteCounts[v.targetPlayerId] || 0) + 1;
    });

    room.players.forEach((p) => {
      p.voteCount = voteCounts[p.playerId] || 0;
    });

    // 寻找最高得票数
    const entries = Object.entries(voteCounts);
    const maxVotes = Math.max(0, ...entries.map(([, c]) => c));

    if (maxVotes === 0) {
      // 全员零票，内鬼从容脱身
      game.winnerTeam = Team.SPY;
    } else {
      const top = entries.filter(([, c]) => c === maxVotes).map(([id]) => id);
      const spySet = new Set(game.spyPlayerIds);
      // MVP 规范：最高票唯一且是内鬼 -> 好人胜；其余(含平票) -> 内鬼胜
      game.winnerTeam = top.length === 1 && spySet.has(top[0]) ? Team.NORMAL : Team.SPY;
    }

    game.endedAt = Date.now();

    // 揭开内鬼真正身份 (写入 revealedSpies)
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

    // 生成 AI 赛后报告
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
      winnerTeam: game.winnerTeam,
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
            bonusNotice: `内鬼【${spyP?.nickname || "内鬼"}】成功诱导【${sec.trapMission.victimPlayerName}】说出暗号「${sec.trapMission.keyword}」，达成【👑 绝命钓鱼王】神级成就！`,
          };
          break;
        }
      }
    }

    game.report = report;
    game.phase = GamePhase.RESULT;
    game.version += 1;

    return { game: toPublicGame(game)!, room };
  }

  /**
   * P0 核心功能：「再来一局 (One More Game)」
   * 修复 P2 08: 校验 requesterId 为房主，清理上一局内存防 OOM
   */
  public restartGame(roomId: string, requesterId: string): { room: Room; game: Game } {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);
    if (room.ownerId !== requesterId) throw new Error(ErrorCode.NOT_ROOM_OWNER);

    // 清掉上一局，防内存泄漏
    if (room.currentGameId) {
      games.delete(room.currentGameId);
      playerSecrets.delete(room.currentGameId);
    }

    // 重置所有人状态并开始新的一局
    room.players.forEach((p) => {
      p.isReady = true;
      p.hasActed = false;
      p.hasVoted = false;
      p.voteCount = 0;
    });

    // 启动全新一局
    return this.startGame(roomId, requesterId);
  }

  /**
   * 辅助测试：让所有 Bot 玩家模拟自动操作
   */
  public triggerBotActions(gameId: string): { game: Game; room: Room } {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const bots = room.players.filter((p) => p.isBot);

    if (
      game.phase === GamePhase.ROUND_1 ||
      game.phase === GamePhase.ROUND_2 ||
      game.phase === GamePhase.ROUND_3
    ) {
      const actionPool = [
        { type: ActionType.ACCUSE, content: "昨晚他的时间线有很大疑点！" },
        { type: ActionType.DEFEND, content: "我和他昨晚都在前台，他不可能去会议室。" },
        { type: ActionType.REVEAL, content: "我看到了打印机旁边的草稿纸残留。" },
        { type: ActionType.INVESTIGATE, content: "申请比对门禁出入卡的物理编号。" },
        { type: ActionType.SILENT, content: "静观其变，观察谁在急于下结论。" },
      ];

      bots.forEach((bot) => {
        if (!bot.hasActed) {
          const act = actionPool[Math.floor(Math.random() * actionPool.length)];
          const otherPlayers = room.players.filter((p) => p.playerId !== bot.playerId);
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          try {
            this.submitAction(gameId, bot.playerId, act.type, target.playerId, act.content);
          } catch (e) {
            // ignore
          }
        }
      });
    } else if (game.phase === GamePhase.VOTING) {
      bots.forEach((bot) => {
        if (!bot.hasVoted) {
          const otherPlayers = room.players.filter((p) => p.playerId !== bot.playerId);
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          try {
            this.submitVote(gameId, bot.playerId, target.playerId);
          } catch (e) {
            // ignore
          }
        }
      });
    }

    return { game: toPublicGame(game)!, room };
  }
}

// 定期清理过期房间与对局 (防 OOM, 修复 P2 07)
const SWEEP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.expiresAt > now) continue;
    if (room.currentGameId) {
      games.delete(room.currentGameId);
      playerSecrets.delete(room.currentGameId);
    }
    rooms.delete(roomId);
  }
}, SWEEP_MS).unref();
