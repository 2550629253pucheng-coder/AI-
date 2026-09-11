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
  ErrorCode
} from "../src/types/game.js";
import { COMPANY_THEME } from "./templates.js";
import { AIGateway } from "./aiGateway.js";

// 内存数据库 (满足 MVP 高性能与实时性要求)
const rooms = new Map<string, Room>();
const games = new Map<string, Game>();
// 私密秘密表：gameId -> Map<playerId, PlayerSecret> (强权限隔离，绝不流入公共状态)
const playerSecrets = new Map<string, Map<string, PlayerSecret>>();

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export class GameEngine {
  private static instance: GameEngine;
  private aiGateway: AIGateway;

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
    // 确保code唯一
    while (Array.from(rooms.values()).some((r) => r.roomCode === roomCode)) {
      roomCode = generateRoomCode();
    }

    const owner: RoomPlayer = {
      playerId: `p_${user.openid}`,
      roomId,
      openid: user.openid,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=" + user.nickname,
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
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      players: [owner],
    };

    rooms.set(roomId, room);
    return room;
  }

  public joinRoom(roomCode: string, user: { openid: string; nickname: string; avatarUrl: string }): { room: Room; player: RoomPlayer } {
    const room = Array.from(rooms.values()).find((r) => r.roomCode === roomCode.trim());
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }
    if (room.status !== "WAITING" && room.status !== "PLAYING") {
      throw new Error(ErrorCode.ROOM_EXPIRED);
    }

    const playerId = `p_${user.openid}`;
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
      avatarUrl: user.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=" + user.nickname,
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
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${botNames[idx]}`,
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
    let game: Game | undefined = undefined;
    if (room.currentGameId) {
      game = games.get(room.currentGameId);
    }
    return { room, game };
  }

  public getRoomByCode(roomCode: string): { room: Room; game?: Game } {
    const room = Array.from(rooms.values()).find((r) => r.roomCode === roomCode.trim());
    if (!room) {
      throw new Error(ErrorCode.ROOM_NOT_FOUND);
    }
    let game: Game | undefined = undefined;
    if (room.currentGameId) {
      game = games.get(room.currentGameId);
    }
    return { room, game };
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
    const template = COMPANY_THEME;

    // 随机分配角色与内鬼身份
    const playerCount = room.players.length;
    const spyCount = playerCount >= 8 ? 2 : 1;

    // 随机洗牌玩家顺序来定内鬼
    const shuffledPlayerIndexes = room.players
      .map((_, i) => i)
      .sort(() => Math.random() - 0.5);

    const spyIndexes = new Set(shuffledPlayerIndexes.slice(0, spyCount));
    const spyPlayerIds: string[] = [];

    // 洗牌可用公开职业
    const shuffledRoles = [...template.roles].sort(() => Math.random() - 0.5);

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
        secretsForGame.set(player.playerId, {
          playerId: player.playerId,
          team: Team.SPY,
          roleName: roleDef.roleName,
          secret: spySecretDef.secret,
          mission: spySecretDef.mission,
          knownInformation: [...spySecretDef.knownInformation, ...roleDef.knownClues],
        });
      } else {
        const normalSecretDef = template.normalSecretsPool[
          Math.floor(Math.random() * template.normalSecretsPool.length)
        ];
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
    const openingTemplate = template.openingEvents[
      Math.floor(Math.random() * template.openingEvents.length)
    ];

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

    const game: Game = {
      gameId,
      roomId,
      phase: GamePhase.ROLE_ASSIGNMENT,
      themeId: template.themeId,
      themeName: template.themeName,
      round: 0,
      startedAt: Date.now(),
      spyPlayerIds,
      phaseEndsAt: Date.now() + 30 * 1000, // 30秒阅读身份
      events: [openingEvent],
      actions: [],
      votes: [],
      version: 1,
    };

    games.set(gameId, game);
    room.status = "PLAYING";
    room.currentGameId = gameId;

    return { room, game };
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
   */
  public submitAction(
    gameId: string,
    playerId: string,
    type: ActionType,
    targetPlayerId?: string,
    content: string = ""
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
      createdAt: Date.now(),
    };

    game.actions.push(action);
    player.hasActed = true;
    game.version += 1;

    // 检查是否全员已行动，如果全员行动可供推进
    return { game, room };
  }

  /**
   * 推进游戏阶段 (LOBBY -> ROLE_ASSIGNMENT -> ROUND_1 -> ROUND_2 -> ROUND_3 -> VOTING -> SETTLEMENT -> RESULT)
   */
  public async advancePhase(gameId: string): Promise<{ game: Game; room: Room }> {
    const game = games.get(gameId);
    if (!game) throw new Error(ErrorCode.GAME_NOT_FOUND);
    const room = rooms.get(game.roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    const template = COMPANY_THEME;

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

        const r2Template = template.round2Events[
          Math.floor(Math.random() * template.round2Events.length)
        ];
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
    return { game, room };
  }

  /**
   * 提交投票 (P0 投票唯一性与反重复)
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

    // 如果所有在线/非bot玩家都已经投票完成，自动结算！
    const pendingVoters = room.players.filter((p) => p.online && !p.hasVoted);
    if (pendingVoters.length === 0) {
      await this.settleGame(gameId);
    }

    return { game, room };
  }

  /**
   * 胜负结算与AI赛后报告生成
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
    let maxVotes = -1;
    let highestVotedPlayerIds: string[] = [];

    for (const [pId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        highestVotedPlayerIds = [pId];
      } else if (count === maxVotes && maxVotes > 0) {
        highestVotedPlayerIds.push(pId);
      }
    }

    // 胜负判断：
    // 如果得票最高者中含有内鬼 (或无人平票且最高票是内鬼) => 普通玩家胜利！
    // 否则 => 内鬼阵营胜利！
    const spySet = new Set(game.spyPlayerIds);
    const caughtSpy = highestVotedPlayerIds.some((pId) => spySet.has(pId));

    if (caughtSpy && highestVotedPlayerIds.length === 1) {
      game.winnerTeam = Team.NORMAL;
    } else if (caughtSpy && highestVotedPlayerIds.length > 1) {
      // 平票规则：按文档平票内鬼增加胜算，若包含内鬼且平票内鬼脱身
      game.winnerTeam = Team.SPY;
    } else {
      game.winnerTeam = Team.SPY;
    }

    game.endedAt = Date.now();

    // 揭开内鬼真正身份
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
      (a) => `${a.playerName} 进行了「${a.type}」，目标是：${a.targetPlayerName || "全场"}。${a.content ? `内容：${a.content}` : ""}`
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

    game.report = report;
    game.phase = GamePhase.RESULT;
    game.version += 1;

    return { game, room };
  }

  /**
   * P0 核心功能：「再来一局 (One More Game)」
   * 保留当前房间成员，清空上一局准备/投票/行动，重新随机身份与事件！
   */
  public restartGame(roomId: string, requesterId: string): { room: Room; game: Game } {
    const room = rooms.get(roomId);
    if (!room) throw new Error(ErrorCode.ROOM_NOT_FOUND);

    // 重置所有人状态并开始新的一局
    room.players.forEach((p) => {
      p.isReady = true;
      p.hasActed = false;
      p.hasVoted = false;
      p.voteCount = 0;
    });

    // 启动全新一局
    return this.startGame(roomId, room.ownerId);
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

    if (game.phase === GamePhase.ROUND_1 || game.phase === GamePhase.ROUND_2 || game.phase === GamePhase.ROUND_3) {
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

    return { game, room };
  }
}
