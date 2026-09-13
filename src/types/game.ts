/**
 * 《AI局中局》MVP V0.1 核心类型定义
 * 遵循 MVP 规范：服务端权威、AI只负责内容、私密信息隔离
 */

export enum GamePhase {
  LOBBY = "LOBBY",
  PREPARING = "PREPARING",
  GENERATING = "GENERATING",
  ROLE_ASSIGNMENT = "ROLE_ASSIGNMENT",
  ROUND_1 = "ROUND_1", // 第1轮：调查立案与线索公布
  ROUND_2 = "ROUND_2", // 第2轮：疑点深挖与AI现场追问
  MID_VOTING = "MID_VOTING", // 中期放逐投票（首轮公投出局1人！）
  EXILE_RESULT = "EXILE_RESULT", // 放逐公投结果公布与身份震撼宣告
  FINAL_ROUND = "FINAL_ROUND", // 决赛轮：终极剧情大反转与生死辩论
  VOTING = "VOTING", // 终极审判投票
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
  DEFEND = "DEFEND", // 为自己或他人辩护
  REVEAL = "REVEAL", // 公开/梳理线索
  INVESTIGATE = "INVESTIGATE", // 追查疑点
  CHAT = "CHAT", // 自由发言/随想探讨
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
  isEliminated?: boolean; // 是否在放逐中出局（出局者不可再投公投票，但可旁观）
  eliminatedInPhase?: GamePhase;
}

export interface AIDirectorComment {
  commentId: string;
  round: number;
  phase: GamePhase;
  text: string;
  targetedPlayerId?: string;
  targetedPlayerName?: string;
  tone?: "SUSPICION" | "INTERROGATION" | "DRAMATIC" | "ROAST";
  createdAt: number;
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
  mediaUrl?: string; // 腾讯云 COS 或远程音频安全核验地址
  isRevoked?: boolean; // 是否因微信安全审核不合规而被撤回
  revocationReason?: string;
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
  mediaUrl?: string; // 腾讯云 COS 或远程音频安全核验地址
  isRevoked?: boolean; // 是否因微信安全审核不合规而被撤回
  revocationReason?: string;
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
  winnerTeam?: Team | "TIE"; // 好人需抓出全部内鬼；平票判平局(TIE)
  isTie?: boolean;
  revealedSpies?: { playerId: string; name: string; roleName: string }[];
  exiledPlayer?: {
    playerId: string;
    name: string;
    roleName: string;
    team: Team;
    reason: string;
  };
  eliminatedPlayerIds?: string[];
  phaseEndsAt: number; // 倒计时服务端截止时间戳
  events: GameEvent[];
  aiComments?: AIDirectorComment[];
  actions: PlayerAction[];
  midVotes?: Vote[];
  votes: Vote[];
  report?: PlayerReport;
  trapTriggered?: boolean;
  version: number;
}

export interface RoleDef {
  roleName: string;
  duty: string;
  defaultSecret: string;
  defaultMission: string;
  knownClues: string[];
}

export interface ThemeTemplate {
  themeId: string;
  themeName: string;
  background: string;
  roles: RoleDef[];
  spySecrets: {
    secret: string;
    mission: string;
    knownInformation: string[];
  }[];
  normalSecretsPool: {
    secret: string;
    mission: string;
    knownInformation: string[];
  }[];
  openingEvents: {
    title: string;
    description: string;
    publicClue: string;
    discussionPrompt: string;
  }[];
  round2Events: {
    title: string;
    description: string;
    publicClue: string;
    discussionPrompt: string;
  }[];
  twistFallbacks: {
    title: string;
    description: string;
    publicClue: string;
    discussionPrompt: string;
  }[];
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
  customTheme?: ThemeTemplate;
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
