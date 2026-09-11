import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Clock,
  Send,
  Flame,
  Check,
  Eye,
  ArrowRight,
  Shield,
  MessageSquare,
  Users,
  Radio,
  Bot,
  Mic,
  MicOff,
  Volume2,
  Smile,
  Square,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Game, RoomPlayer, PlayerSecret, ActionType, GameEvent, RoomVoiceMessage } from "../types/game.js";
import { audio } from "../utils/audio.js";
import { speech } from "../utils/speech.js";
import { DirectorVoiceBar } from "./DirectorVoiceBar.js";
import { VoiceNoteBubble } from "./VoiceNoteBubble.js";
import { RoomVoiceChat } from "./RoomVoiceChat.js";
import { voiceRecorder, QUICK_VOICE_PHRASES } from "../utils/voiceRecorder.js";

interface MainGameScreenProps {
  game: Game;
  currentPlayer: RoomPlayer;
  roomPlayers: RoomPlayer[];
  secret?: PlayerSecret;
  onSubmitAction: (
    type: ActionType,
    targetPlayerId?: string,
    content?: string,
    audioData?: string,
    audioDuration?: number
  ) => void;
  onAdvancePhase: () => void;
  onTriggerBots: () => void;
  onCallAIDirector?: () => void;
  loading: boolean;
  onSendVoice?: (content: string, audioData?: string, audioDuration?: number) => Promise<void>;
  voiceMessages?: RoomVoiceMessage[];
}

const ACTION_MAP: Record<ActionType, { label: string; desc: string; icon: string }> = {
  [ActionType.ACCUSE]: { label: "公开质疑", desc: "对某人提出怀疑", icon: "👉" },
  [ActionType.DEFEND]: { label: "自白辩护", desc: "为自己或他人洗白", icon: "🛡️" },
  [ActionType.REVEAL]: { label: "披露线索", desc: "公布你的掌握信息", icon: "🔍" },
  [ActionType.INVESTIGATE]: { label: "密查档案", desc: "重点核查某人行踪", icon: "📑" },
  [ActionType.SILENT]: { label: "随聊表态", desc: "自由发表推理", icon: "💬" },
};

type ActiveTab = "event" | "suspects" | "chat";

export const MainGameScreen: React.FC<MainGameScreenProps> = ({
  game,
  currentPlayer,
  roomPlayers,
  secret,
  onSubmitAction,
  onAdvancePhase,
  onTriggerBots,
  onCallAIDirector,
  loading,
  onSendVoice,
  voiceMessages = [],
}) => {
  const [selectedAction, setSelectedAction] = useState<ActionType>(ActionType.SILENT);
  const [targetId, setTargetId] = useState<string>("");
  const [statement, setStatement] = useState<string>("");
  const [showSecretModal, setShowSecretModal] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [activeTab, setActiveTab] = useState<ActiveTab>("event");

  // 语音输入与开黑状态
  const [inputMode, setInputMode] = useState<"VOICE" | "TEXT">("VOICE");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioData, setRecordedAudioData] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [showQuickPhrases, setShowQuickPhrases] = useState<boolean>(false);
  const [isRoomVoiceChatOpen, setIsRoomVoiceChatOpen] = useState<boolean>(false);

  // 倒计时
  useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((game.phaseEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0) {
        audio.playTick();
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [game.phaseEndsAt]);

  // 设置默认目标
  useEffect(() => {
    const others = roomPlayers.filter((p) => p.playerId !== currentPlayer.playerId);
    if (others.length > 0 && !targetId) {
      setTargetId(others[0].playerId);
    }
  }, [roomPlayers, currentPlayer.playerId, targetId]);

  const currentEvent: GameEvent | undefined = game.events[game.events.length - 1];
  const lastSpokenEventIdRef = useRef<string>("");
  const hasTrapAchievedSpokenRef = useRef(false);

  // AI 导演实时语音播报最新事件 (防重入保护)
  useEffect(() => {
    if (currentEvent && currentEvent.eventId !== lastSpokenEventIdRef.current) {
      lastSpokenEventIdRef.current = currentEvent.eventId;
      const isTwist = currentEvent.type === "TWIST";
      const narration = isTwist
        ? `突发反转！【${currentEvent.title}】。${currentEvent.description}。局势有变，请大家重新调整推理思路！`
        : `第${game.round}轮新线索发布：【${currentEvent.title}】。${currentEvent.description}`;
      speech.speak(narration);
    }
  }, [currentEvent?.eventId, game.round]);

  // 钓鱼暗令达成时提示 (防重入保护)
  useEffect(() => {
    if (secret?.trapMission?.achieved && !hasTrapAchievedSpokenRef.current) {
      hasTrapAchievedSpokenRef.current = true;
      speech.speak(`暗号触发！恭喜内鬼，钓鱼暗令已成功达成！`);
    }
  }, [secret?.trapMission?.achieved]);

  // 计算每个玩家被质疑的热度
  const accusationCounts: Record<string, number> = {};
  game.actions.forEach((a) => {
    if (a.targetPlayerId && (a.type === ActionType.ACCUSE || a.type === ActionType.INVESTIGATE)) {
      accusationCounts[a.targetPlayerId] = (accusationCounts[a.targetPlayerId] || 0) + 1;
    }
  });

  const roundActions = game.actions.filter((a) => a.round === game.round);
  const myActionCount = game.actions.filter(
    (a) => a.round === game.round && a.playerId === currentPlayer.playerId
  ).length;

  const isRoundFinal = game.round === 3 || game.phase === ("FINAL_ROUND" as any);
  const isOwner = currentPlayer.isOwner;

  // 开始语音陈述录音 (免打字)
  const handleStartVoiceRecord = async () => {
    if (isRecording || currentPlayer.isEliminated) return;
    try {
      audio.playClick();
      setIsRecording(true);
      setInterimTranscript("");
      await voiceRecorder.startRecording({
        onInterimTranscript: (text) => {
          setInterimTranscript(text);
          setStatement(text);
        },
        onError: (err) => {
          console.warn("[VoiceAction] error", err);
          setIsRecording(false);
        },
      });
    } catch (e) {
      console.warn("[VoiceAction] start record failed", e);
      setIsRecording(false);
    }
  };

  // 停止语音录音并保存语音
  const handleStopVoiceRecord = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    audio.playClick();
    try {
      const res = await voiceRecorder.stopRecording();
      if (res.audioData) {
        setRecordedAudioData(res.audioData);
        setRecordedDuration(res.audioDuration);
      }
      if (res.transcript) {
        setStatement(res.transcript);
      }
    } catch (e) {
      console.warn("[VoiceAction] stop record failed", e);
    }
  };

  const handleActionSubmit = () => {
    if (currentPlayer.isEliminated) return;
    const finalContent = (statement || interimTranscript || "").trim();
    if (!finalContent && !recordedAudioData) return;

    audio.playClick();
    const needsTarget =
      selectedAction === ActionType.ACCUSE ||
      selectedAction === ActionType.DEFEND ||
      selectedAction === ActionType.INVESTIGATE;

    onSubmitAction(
      selectedAction,
      needsTarget ? targetId : undefined,
      finalContent,
      recordedAudioData || undefined,
      recordedDuration || undefined
    );
    setStatement("");
    setInterimTranscript("");
    setRecordedAudioData(null);
    setRecordedDuration(0);
    setActiveTab("chat"); // 提交后自动切到陈述动态
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pt-4 relative overflow-hidden">
      {/* 顶部状态栏：AI导演广播、轮次徽章、倒计时、我的身份入口 */}
      <div className="shrink-0 space-y-2">
        <DirectorVoiceBar autoPosition={false} className="mb-1" />

        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-cyber-border">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1.5 ${
              isRoundFinal 
                ? "bg-rose-100 text-rose-700 border border-rose-300 dark:bg-neon-magenta/20 dark:text-neon-magenta dark:border-neon-magenta/50 animate-pulse shadow-xs" 
                : "bg-purple-100 text-purple-700 border border-purple-300 dark:bg-neon-purple/20 dark:text-neon-lightpurple dark:border-neon-purple/40"
            }`}>
              {isRoundFinal ? <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-neon-magenta" /> : <Radio className="w-3.5 h-3.5 text-purple-600 dark:text-neon-lightpurple" />}
              <span>{isRoundFinal ? "决赛轮 · 终局对质" : game.round === 1 ? "第 1 轮 · 初勘案情" : "第 2 轮 · 证词交锋(随后放逐)"}</span>
            </span>
            <span className="text-xs text-slate-700 dark:text-neutral-300 font-bold truncate max-w-[130px]">
              {game.themeName.split("·")[0]}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 房间开黑语音对讲抽屉入口 (不想打字时可随时开麦聊天) */}
            <button
              onClick={() => {
                audio.playClick();
                setIsRoomVoiceChatOpen(true);
              }}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-neon-teal/15 dark:hover:bg-neon-teal/25 dark:text-neon-teal rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-300 dark:border-neon-teal/40 transition shadow-xs active:scale-98"
              aria-label="打开房间语音对讲"
              title="不想打字？直接按住说话或发语音对讲！"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-neon-teal animate-pulse" />
              <span>对讲</span>
              {voiceMessages && voiceMessages.length > 0 && (
                <span className="text-[10px] bg-emerald-600 text-white dark:bg-neon-teal dark:text-black font-bold px-1 rounded-full">
                  {voiceMessages.length}
                </span>
              )}
            </button>

            {secret && (
              <button
                onClick={() => {
                  audio.playClick();
                  setShowSecretModal(true);
                }}
                className="px-2.5 py-1 bg-white dark:bg-cyber-card hover:bg-slate-100 dark:hover:bg-cyber-card-hover text-indigo-700 dark:text-neon-cyan rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-cyber-border transition shadow-xs"
                aria-label="查看我的身份档案"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>身份</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-indigo-700 dark:text-neon-cyan bg-slate-100 dark:bg-cyber-deep px-2 py-1 rounded-full border border-slate-200 dark:border-cyber-border shadow-2xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
            </div>
          </div>
        </div>

        {/* 三段式功能 Tab 导航 */}
        <div className="flex items-center bg-slate-100 dark:bg-cyber-deep p-1 rounded-2xl border border-slate-200 dark:border-cyber-border-subtle">
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab("event");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "event"
                ? "bg-white text-indigo-700 border border-indigo-200 shadow-xs dark:bg-cyber-card dark:text-neon-lightpurple dark:border-neon-purple/35"
                : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>现场通报</span>
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab("suspects");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "suspects"
                ? "bg-white text-indigo-700 border border-indigo-200 shadow-xs dark:bg-cyber-card dark:text-neon-lightpurple dark:border-neon-purple/35"
                : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>嫌疑人 ({roomPlayers.length})</span>
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab("chat");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition relative ${
              activeTab === "chat"
                ? "bg-white text-indigo-700 border border-indigo-200 shadow-xs dark:bg-cyber-card dark:text-neon-lightpurple dark:border-neon-purple/35"
                : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>陈述动态</span>
            {roundActions.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-pink-500 dark:bg-neon-pink shadow-xs" />
            )}
          </button>
        </div>
      </div>

      {/* 中间主视区：根据 Tab 智能切换，消除冗长纵向滚动 */}
      <div className="flex-1 my-3 overflow-y-auto pr-0.5">
        <AnimatePresence mode="wait">
          {activeTab === "event" && currentEvent && (
            <motion.div
              key="event_tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl bg-white dark:bg-gradient-to-br dark:from-cyber-card dark:via-cyber-mid dark:to-cyber-deep border border-slate-200 dark:border-cyber-border p-4 shadow-xs space-y-3 neon-glow-purple"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-neon-lightpurple">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-neon-lightpurple animate-pulse shadow-xs" />
                  <span>AI 导演发布现场通报</span>
                </div>
                {currentEvent.source === "AI" && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 dark:bg-neon-purple/20 dark:text-neon-lightpurple px-2 py-0.5 rounded-full border border-indigo-200 dark:border-neon-purple/40 font-bold">
                    实时推演
                  </span>
                )}
              </div>

              <div className="text-sm font-black text-slate-900 dark:text-neutral-100">{currentEvent.title}</div>
              
              <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed bg-slate-50 dark:bg-cyber-deep/80 p-3 rounded-xl border border-slate-100 dark:border-cyber-border-subtle font-medium">
                {currentEvent.description}
              </p>

              {currentEvent.publicClue && (
                <div className="p-3 bg-purple-50 dark:bg-cyber-deep rounded-xl border border-purple-200 dark:border-neon-purple/50 text-xs text-purple-900 dark:text-neon-lightpurple leading-relaxed flex items-start gap-2 shadow-xs font-medium">
                  <span className="text-pink-600 dark:text-neon-pink font-bold shrink-0">⚡ 突发证据：</span>
                  <span>{currentEvent.publicClue}</span>
                </div>
              )}

              {currentEvent.discussionPrompt && (
                <div className="text-xs text-slate-600 dark:text-neutral-400 italic flex items-start gap-1.5 px-1 font-medium">
                  <span className="text-sky-700 dark:text-neon-cyan font-bold not-italic">💬 破案切入点：</span>
                  <span>{currentEvent.discussionPrompt}</span>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "suspects" && (
            <motion.div
              key="suspects_tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center justify-between px-1 mb-1 font-medium">
                <span>点击玩家可快速将其选为行动目标</span>
                <span className="text-rose-600 dark:text-neon-magenta font-bold">🔥 怀疑热度</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {roomPlayers.map((p) => {
                  const count = accusationCounts[p.playerId] || 0;
                  const hasActedRound = game.actions.some(
                    (a) => a.round === game.round && a.playerId === p.playerId
                  );
                  const isMe = p.playerId === currentPlayer.playerId;
                  const isTarget = targetId === p.playerId && !isMe;

                  return (
                    <div
                      key={p.playerId}
                      role="button"
                      tabIndex={0}
                      aria-label={`选择${p.nickname}作为目标`}
                      onClick={() => {
                        if (!isMe) {
                          audio.playClick();
                          setTargetId(p.playerId);
                        }
                      }}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition shadow-2xs ${
                        isTarget
                          ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 dark:bg-neon-purple/20 dark:border-neon-purple/90 dark:ring-neon-lightpurple shadow-xs"
                          : "bg-white dark:bg-cyber-card/85 border-slate-200 dark:border-cyber-border hover:border-indigo-300 dark:hover:border-cyber-border-bright"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={p.avatarUrl}
                          alt={p.nickname}
                          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-cyber-deep object-cover shrink-0 border border-slate-200 dark:border-cyber-border shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-neutral-200 truncate flex items-center gap-1">
                            <span>{p.nickname}</span>
                            {isMe && <span className="text-xs text-indigo-600 dark:text-neon-cyan font-normal">(我)</span>}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                            {p.publicRoleName || "职员"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {count > 0 && (
                          <span className="text-xs text-rose-600 dark:text-neon-magenta font-bold flex items-center gap-0.5 bg-rose-100 dark:bg-[#351228]/80 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-neon-magenta/50">
                            <Flame className="w-3 h-3 fill-rose-500 dark:fill-neon-magenta text-rose-500 dark:text-neon-magenta" />
                            {count}
                          </span>
                        )}
                        {hasActedRound ? (
                          <span className="text-xs bg-emerald-100 dark:bg-neon-teal/20 text-emerald-800 dark:text-neon-teal px-1.5 py-0.5 rounded font-bold border border-emerald-200 dark:border-neon-teal/40">
                            已表态
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-100 dark:bg-cyber-deep text-slate-500 dark:text-neutral-400 px-1.5 py-0.5 rounded font-medium border border-slate-200 dark:border-cyber-border-subtle">
                            思考中
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "chat" && (
            <motion.div
              key="chat_tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              {/* AI 导演现场毒舌点评流 */}
              {game.aiComments && game.aiComments.filter((c) => c.round === game.round).length > 0 && (
                <div className="space-y-2 mb-3">
                  {game.aiComments
                    .filter((c) => c.round === game.round)
                    .map((c) => (
                      <div
                        key={c.commentId}
                        className="bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-purple-950/90 border border-purple-500/60 rounded-2xl p-3 text-xs leading-relaxed space-y-1.5 text-white shadow-md neon-glow-purple"
                      >
                        <div className="flex items-center justify-between text-cyan-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="p-0.5 px-1.5 rounded-md bg-purple-600/40 text-purple-200 border border-purple-400/40 text-[10px] flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-spin" />
                              <span>AI 导演在场抓包</span>
                            </span>
                            {c.targetPlayerName && (
                              <span className="text-rose-300 font-black">
                                针对 @{c.targetPlayerName}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => speech.speak(c.text)}
                            className="text-cyan-400 hover:text-cyan-200 p-1 rounded-lg hover:bg-white/10 transition"
                            title="语音朗读"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-100 font-medium italic">“{c.text}”</p>
                      </div>
                    ))}
                </div>
              )}

              <div className="text-xs text-slate-500 dark:text-neutral-400 px-1 font-medium flex items-center justify-between">
                <span>全场讨论与陈述动态 ({roundActions.length} 条)</span>
                <span className="text-[11px] text-emerald-600 dark:text-neon-teal">不限发言次数 · 实时畅聊</span>
              </div>

              {roundActions.length === 0 ? (
                <div className="bg-slate-50 dark:bg-cyber-deep/60 border border-slate-200 dark:border-cyber-border rounded-2xl p-6 text-center text-xs text-slate-400 dark:text-neutral-500 italic">
                  暂无公开陈述，请使用下方输入框或语音发表观点！
                </div>
              ) : (
                <div className="space-y-2">
                  {roundActions.map((a) => {
                    const actionMeta = ACTION_MAP[a.type] || { label: a.type, icon: "💬" };
                    return (
                      <div
                        key={a.actionId}
                        className="bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border rounded-2xl p-3 text-xs leading-relaxed space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                          <span className="font-bold text-indigo-700 dark:text-neon-lightpurple">{a.playerName}</span>
                          <span className="bg-slate-100 dark:bg-cyber-deep px-2 py-0.5 rounded-full text-xs text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-cyber-border font-medium">
                            {actionMeta.icon} {actionMeta.label}
                          </span>
                        </div>

                        {a.targetPlayerName && (
                          <div className="text-rose-600 dark:text-neon-magenta font-bold text-xs">
                            🎯 针对目标：{a.targetPlayerName}
                          </div>
                        )}

                        {/* 语音条与陈述内容 */}
                        {a.audioData ? (
                          <div className="pt-1">
                            <VoiceNoteBubble
                              audioData={a.audioData}
                              audioDuration={a.audioDuration}
                              content={a.content}
                              isSelf={a.playerId === currentPlayer.playerId}
                            />
                          </div>
                        ) : a.content ? (
                          <div className="text-slate-800 dark:text-neutral-200 bg-slate-50 dark:bg-cyber-deep p-2 rounded-xl border border-slate-100 dark:border-cyber-border-subtle font-medium flex items-center justify-between gap-2">
                            <span>“{a.content}”</span>
                            <button
                              type="button"
                              onClick={() => speech.speak(a.content)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-neon-cyan p-1 shrink-0 transition"
                              title="语音朗读"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部行动面板：固定在黄金视区，操作无需滚动 */}
      <div className="shrink-0 space-y-2 pt-2 border-t border-slate-200 dark:border-cyber-border">
        {currentPlayer.isEliminated ? (
          <div className="bg-slate-800 text-purple-200 border border-purple-500/40 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
            <div className="flex items-center justify-center gap-1.5 text-purple-300 text-xs font-bold">
              <span>👻</span>
              <span>你已被首轮放逐，当前处于幽灵旁观席</span>
            </div>
            <p className="text-xs text-slate-400">
              你不能参与发言，但可全程旁观幸存者的激烈辩论与终局反转推演！
            </p>
          </div>
        ) : (
          <div className="bg-white/95 dark:bg-cyber-card/95 border border-slate-200 dark:border-cyber-border p-3 rounded-2xl space-y-2 shadow-xs neon-glow-purple">
            {/* 内鬼钓鱼暗令随身提醒 */}
            {secret?.trapMission && (
              <div className="p-2 rounded-xl bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 dark:from-amber-950/40 dark:via-purple-950/30 dark:to-amber-950/40 border border-amber-300 dark:border-amber-500/40 flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                  <span className="text-amber-800 dark:text-amber-400 font-bold shrink-0">🎣 钓鱼暗号:</span>
                  <span className="text-slate-700 dark:text-neutral-300 truncate">诱导他人说出</span>
                  <span className="font-mono font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-300 dark:border-rose-500/40 shrink-0">
                    「{secret.trapMission.keyword}」
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                  secret.trapMission.achieved
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                    : "bg-amber-200 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300"
                }`}>
                  {secret.trapMission.achieved ? "✓ 暗号命中" : "待诱导"}
                </span>
              </div>
            )}

            {/* 意图标签与不限次提示 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-neutral-200">
                <span>发言意图 (选填)：</span>
                {myActionCount > 0 && (
                  <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-cyber-deep dark:text-neon-cyan border border-indigo-200 dark:border-cyber-border">
                    本轮已发言 {myActionCount} 次
                  </span>
                )}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-neon-teal font-bold">
                自由发言 · 不限次数
              </span>
            </div>

            {/* 行动方式水平灵活流 */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ACTION_MAP) as ActionType[]).map((type) => {
                const item = ACTION_MAP[type];
                const isSelected = selectedAction === type;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      audio.playClick();
                      setSelectedAction(isSelected && type !== ActionType.SILENT ? ActionType.SILENT : type);
                    }}
                    role="button"
                    aria-pressed={isSelected}
                    className={`px-2.5 py-1 text-xs font-medium rounded-xl border transition flex items-center gap-1 ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-bold dark:bg-neon-purple/25 dark:text-neon-lightpurple dark:border-neon-purple shadow-xs"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 dark:bg-cyber-deep dark:text-neutral-400 dark:border-cyber-border hover:dark:text-neutral-200"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 目标对象选择 (当选定质疑/自辩/密查时) */}
            {(selectedAction === ActionType.ACCUSE || selectedAction === ActionType.DEFEND || selectedAction === ActionType.INVESTIGATE) && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-neutral-400 shrink-0 font-medium">针对嫌疑人:</span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-cyber-deep border border-slate-200 dark:border-cyber-border text-slate-900 dark:text-neutral-200 rounded-xl p-1.5 text-xs focus:outline-none focus:border-indigo-400"
                >
                  {roomPlayers
                    .filter((p) => p.playerId !== currentPlayer.playerId && !p.isEliminated)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.nickname} ({p.publicRoleName || "职员"})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* 语音陈述与快捷免打字输入栏 */}
            <div className="space-y-2 pt-1">
              {/* 顶层切换栏：语音 / 键盘 / 常用语 */}
              <div className="flex items-center justify-between text-xs px-0.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      audio.playClick();
                      setInputMode("VOICE");
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition ${
                      inputMode === "VOICE"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-neon-teal/20 dark:text-neon-teal dark:border-neon-teal/40"
                        : "text-slate-500 hover:text-slate-800 dark:text-neutral-400"
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>语音开麦</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audio.playClick();
                      setInputMode("TEXT");
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition ${
                      inputMode === "TEXT"
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-cyber-deep dark:text-neon-cyan dark:border-cyber-border"
                        : "text-slate-500 hover:text-slate-800 dark:text-neutral-400"
                    }`}
                  >
                    <span>键盘打字</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    audio.playClick();
                    setShowQuickPhrases(!showQuickPhrases);
                  }}
                  className="text-xs font-bold text-indigo-700 dark:text-neon-lightpurple flex items-center gap-1 hover:underline"
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>{showQuickPhrases ? "收起常用语" : "常用台词(免打字)"}</span>
                </button>
              </div>

              {/* 常用语快速选择抽屉 */}
              {showQuickPhrases && (
                <div className="p-2 bg-purple-50 dark:bg-cyber-deep border border-purple-200 dark:border-cyber-border-subtle rounded-xl space-y-1 max-h-36 overflow-y-auto">
                  <div className="text-[11px] text-purple-900 dark:text-neon-lightpurple font-bold">
                    ⚡ 点击一键填入开黑台词：
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {QUICK_VOICE_PHRASES.map((qp) => (
                      <button
                        key={qp.id}
                        type="button"
                        onClick={() => {
                          setStatement(qp.text);
                          setShowQuickPhrases(false);
                          audio.playClick();
                        }}
                        className="text-left text-xs bg-white dark:bg-cyber-card p-1.5 px-2 rounded-lg border border-slate-200 dark:border-cyber-border hover:border-indigo-400 text-slate-800 dark:text-neutral-200 flex items-center gap-1.5 truncate shadow-2xs"
                      >
                        <span>{qp.icon}</span>
                        <span className="truncate flex-1 font-medium">{qp.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 模式一：语音开麦 (按住说话 / 录制语音) */}
              {inputMode === "VOICE" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onMouseDown={handleStartVoiceRecord}
                      onMouseUp={handleStopVoiceRecord}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleStartVoiceRecord();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleStopVoiceRecord();
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 select-none shadow-xs transition active:scale-[0.98] ${
                        isRecording
                          ? "bg-rose-500 text-white animate-pulse"
                          : recordedAudioData
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-400 dark:bg-neon-teal/20 dark:text-neon-teal"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>
                        {isRecording
                          ? "正在录音... 松开发送"
                          : recordedAudioData
                          ? `已录音 ${recordedDuration}" (按住重录)`
                          : "按住 说话陈述 (自动转文字)"}
                      </span>
                    </button>

                    <button
                      onClick={handleActionSubmit}
                      disabled={loading || isRecording}
                      className="btn-secondary-cyan px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>发送</span>
                    </button>
                  </div>

                  {/* 录音转写的文字预览 */}
                  {(statement || interimTranscript) && (
                    <div className="bg-slate-50 dark:bg-cyber-deep p-2 rounded-xl border border-slate-200 dark:border-cyber-border text-xs flex items-center justify-between gap-2">
                      <span className="text-slate-700 dark:text-neutral-300 truncate font-medium">
                        “{statement || interimTranscript}”
                      </span>
                      {statement && (
                        <button
                          type="button"
                          onClick={() => setStatement("")}
                          className="text-slate-400 hover:text-slate-600 text-[10px] shrink-0"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* 模式二：键盘打字输入 */
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={300}
                    placeholder="发表你的推论、质疑或时间线（无限制）..."
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleActionSubmit();
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-cyber-deep text-xs text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-cyber-border focus:outline-none focus:border-indigo-400 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleActionSubmit}
                    disabled={loading}
                    className="btn-secondary-cyan px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>发送</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 推进控制与测试辅助 */}
        <div className="flex items-center gap-2">
          {/* 实时呼叫AI导演评理/抓把柄 */}
          {onCallAIDirector && (
            <button
              onClick={() => {
                audio.playClick();
                onCallAIDirector();
              }}
              disabled={loading}
              className="px-2.5 py-2 bg-gradient-to-r from-purple-500/15 to-indigo-500/15 hover:from-purple-500/25 hover:to-indigo-500/25 border border-purple-400/40 text-purple-700 dark:text-neon-lightpurple rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs shrink-0"
              title="召唤毒舌AI导演实时追问嫌疑人或点评全局"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-neon-magenta animate-spin" />
              <span>AI导演评理</span>
            </button>
          )}

          {/* 次级联调按钮 */}
          <button
            onClick={() => {
              audio.playClick();
              onTriggerBots();
            }}
            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-card-hover border border-slate-200 dark:border-cyber-border text-indigo-700 dark:text-neon-cyan rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs shrink-0"
            title="模拟全员自动发言与行动以供联调"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-neon-cyan" />
            <span>自动行动</span>
          </button>

          {/* 房主推进主按钮 */}
          {isOwner ? (
            <button
              onClick={() => {
                audio.playClick();
                onAdvancePhase();
              }}
              disabled={loading}
              className="flex-1 py-2 btn-primary-neon active:scale-[0.99] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-md"
            >
              <span>{isRoundFinal ? "全员进入最终决胜指认" : game.round === 1 ? "推进至第 2 轮" : "进入首轮公投放逐"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex-1 text-center text-xs text-slate-500 dark:text-neutral-500 py-2">
              等待房主推进或倒计时结束...
            </div>
          )}
        </div>
      </div>

      {/* 查看个人绝密身份模态弹窗 */}
      <AnimatePresence>
        {showSecretModal && secret && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowSecretModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="绝密身份档案"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border-bright rounded-3xl p-5 max-w-xs w-full space-y-3 shadow-xl neon-glow-purple"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-cyber-border-subtle pb-2.5">
                <span className="text-indigo-700 dark:text-neon-lightpurple font-bold text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-neon-cyan" /> 绝密身份档案
                </span>
                <button
                  onClick={() => setShowSecretModal(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm p-1 rounded-full hover:bg-slate-100 dark:hover:bg-cyber-card-hover"
                  aria-label="关闭身份档案"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs space-y-2.5 text-slate-700 dark:text-neutral-300 font-medium">
                <div>
                  <span className="text-slate-500 dark:text-neutral-400 block text-xs">公开伪装职务：</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{secret.roleName}</span>
                </div>
                <div>
                  <span className="text-rose-600 dark:text-neon-magenta block text-xs font-bold">你的秘密：</span>
                  <p className="bg-slate-50 dark:bg-cyber-deep p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border text-slate-800 dark:text-neutral-200 mt-1 leading-relaxed">
                    {secret.secret}
                  </p>
                </div>
                <div>
                  <span className="text-teal-700 dark:text-neon-teal block text-xs font-bold">你的胜利目标：</span>
                  <p className="bg-slate-50 dark:bg-cyber-deep p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border text-slate-800 dark:text-neutral-200 mt-1 leading-relaxed">
                    {secret.mission}
                  </p>
                </div>
                {secret.trapMission && (
                  <div>
                    <span className="text-amber-800 dark:text-amber-400 block text-xs font-bold">🎣 钓鱼暗令：</span>
                    <div className="bg-amber-50 dark:bg-cyber-deep p-2.5 rounded-xl border border-amber-300 dark:border-amber-500/40 text-slate-800 dark:text-neutral-200 mt-1 space-y-1">
                      <p className="leading-relaxed">{secret.trapMission.description}</p>
                      <div className="text-amber-800 dark:text-amber-300 font-bold">
                        目标暗号：<span className="font-mono text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-500/40">「{secret.trapMission.keyword}」</span>
                      </div>
                      {secret.trapMission.achieved && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold block text-[11px]">✓ 已达成触发！</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowSecretModal(false)}
                className="w-full py-2.5 btn-secondary-cyan font-bold text-xs rounded-xl"
              >
                我知道了，返回对局
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 房间开黑语音对讲抽屉 (免打字开麦畅聊) */}
      <RoomVoiceChat
        roomId={game.roomId}
        currentPlayer={currentPlayer}
        roomPlayers={roomPlayers}
        voiceMessages={voiceMessages}
        onSendVoice={async (content, audioData, audioDuration) => {
          if (onSendVoice) {
            await onSendVoice(content, audioData, audioDuration);
          }
        }}
        isOpen={isRoomVoiceChatOpen}
        onClose={() => setIsRoomVoiceChatOpen(false)}
      />
    </div>
  );
};
