/**
 * 《AI局中局》MVP V0.1 核心类型定义
 * 遵循 MVP 规范：服务端权威、AI只负责内容、私密信息隔离
 */

export enum GamePhase {
  LOBBY = "LOBBY",
  PREPARING = "PREPARING",
  GENERATING = "GENERATING",
  ROLE_ASSIGNMENT = "ROLE_ASSIGNMENT",
  ROUND_1 = "ROUND_1",
  ROUND_2 = "ROUND_2",
  ROUND_3 = "ROUND_3",
  VOTING = "VOTING",
  SETTLEMENT = "SETTLEMENT",
  RESULT = "RESULT",
  FINISHED = "FINISHED",
}

export enum Team {
  NORMAL = "NORMAL",
  SPY = "SPY",
}

export enum ActionType {
  ACCUSE = "ACCUSE", // 质疑某人
  DEFEND = "DEFEND", // 为某人辩护
  REVEAL = "REVEAL", // 公开线索
  INVESTIGATE = "INVESTIGATE", // 调查某事
  SILENT = "SILENT", // 保持沉默
}

export interface User {
  openid: string;
  nickname: string;
  avatarUrl: string;
}

export interface RoomPlayer {
  playerId: string;
  roomId: string;
  openid: string;
  nickname: string;
  avatarUrl: string;
  isOwner: boolean;
  isReady: boolean;
  online: boolean;
  isBot?: boolean;
  joinedAt: number;
  lastSeenAt: number;
  publicRoleName?: string; // 公开职业/角色 (如: 产品经理, 实习生)
  hasActed?: boolean;
  hasVoted?: boolean;
  voteCount?: number;
}

export interface TrapMission {
  id: string;
  keyword: string;
  description: string;
  achieved: boolean;
  victimPlayerId?: string;
  victimPlayerName?: string;
  triggeredAt?: number;
}

export interface PlayerSecret {
  playerId: string;
  team: Team;
  roleName: string;
  secret: string;
  mission: string;
  knownInformation: string[];
  ability?: string;
  trapMission?: TrapMission;
}

export interface GameEvent {
  eventId: string;
  gameId: string;
  round: number;
  type: "OPENING" | "CLUE" | "TWIST" | "SYSTEM" | "ENDING";
  title: string;
  description: string;
  publicClue?: string;
  discussionPrompt?: string;
  source: "TEMPLATE" | "AI" | "FALLBACK";
  createdAt: number;
}

export interface PlayerAction {
  actionId: string;
  gameId: string;
  round: number;
  playerId: string;
  playerName: string;
  type: ActionType;
  targetPlayerId?: string;
  targetPlayerName?: string;
  content: string;
  audioData?: string; // base64 DataURL 语音录音
  audioDuration?: number; // 录音时长(秒)
  createdAt: number;
}

export interface RoomVoiceMessage {
  messageId: string;
  roomId: string;
  playerId: string;
  playerName: string;
  avatarUrl: string;
  content: string; // 语音识别文字或输入文字
  audioData?: string; // 真实录音 base64 DataURL
  audioDuration?: number; // 录音时长(秒)
  createdAt: number;
}

export interface Vote {
  gameId: string;
  voterPlayerId: string;
  targetPlayerId: string;
  createdAt: number;
}

export interface PlayerTag {
  playerId: string;
  playerName: string;
  title: string;
  comment: string;
}

export interface PlayerReport {
  summary: string;
  bestDetective: string; // 推理王
  bestActor: string; // 最佳演技
  funniestMoment: string; // 爆笑名场面
  biggestTwist: string; // 最大反转
  playerTags: PlayerTag[];
  trapAchievement?: {
    spyName: string;
    keyword: string;
    victimName: string;
    bonusNotice: string;
  };
}

export interface Game {
  gameId: string;
  roomId: string;
  phase: GamePhase;
  themeId: string;
  themeName: string;
  themeBackground?: string;
  round: number;
  startedAt: number;
  endedAt?: number;
  winnerTeam?: Team;
  revealedSpies?: { playerId: string; name: string; roleName: string }[];
  phaseEndsAt: number; // 倒计时服务端截止时间戳
  events: GameEvent[];
  actions: PlayerAction[];
  votes: Vote[];
  report?: PlayerReport;
  trapTriggered?: boolean;
  version: number;
}

export interface Room {
  roomId: string;
  roomCode: string;
  ownerId: string;
  status: "WAITING" | "PLAYING" | "FINISHED";
  minPlayers: number;
  maxPlayers: number;
  currentGameId?: string;
  themeId?: string;
  themeName?: string;
  themeBackground?: string;
  customTheme?: any;
  createdAt: number;
  expiresAt: number;
  players: RoomPlayer[];
  voiceMessages?: RoomVoiceMessage[];
}

export enum ErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
  ROOM_FULL = "ROOM_FULL",
  ROOM_EXPIRED = "ROOM_EXPIRED",
  NOT_ROOM_OWNER = "NOT_ROOM_OWNER",
  PLAYER_NOT_READY = "PLAYER_NOT_READY",
  NOT_ENOUGH_PLAYERS = "NOT_ENOUGH_PLAYERS",
  INVALID_GAME_STATE = "INVALID_GAME_STATE",
  ALREADY_ACTED = "ALREADY_ACTED",
  ALREADY_VOTED = "ALREADY_VOTED",
  GAME_NOT_FOUND = "GAME_NOT_FOUND",
  AI_FAILED = "AI_FAILED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
