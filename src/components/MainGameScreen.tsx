import React, { useState, useEffect } from "react";
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
  Bot
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Game, RoomPlayer, PlayerSecret, ActionType, GameEvent } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface MainGameScreenProps {
  game: Game;
  currentPlayer: RoomPlayer;
  roomPlayers: RoomPlayer[];
  secret?: PlayerSecret;
  onSubmitAction: (type: ActionType, targetPlayerId?: string, content?: string) => void;
  onAdvancePhase: () => void;
  onTriggerBots: () => void;
  loading: boolean;
}

const ACTION_MAP: Record<ActionType, { label: string; desc: string; icon: string }> = {
  [ActionType.ACCUSE]: { label: "公开质疑", desc: "对某人提出怀疑", icon: "👉" },
  [ActionType.DEFEND]: { label: "自白辩护", desc: "为自己或他人洗白", icon: "🛡️" },
  [ActionType.REVEAL]: { label: "披露线索", desc: "公布你的掌握信息", icon: "🔍" },
  [ActionType.INVESTIGATE]: { label: "密查档案", desc: "重点核查某人行踪", icon: "📑" },
  [ActionType.SILENT]: { label: "保持静默", desc: "暂时不表态观察", icon: "🤐" },
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
  loading,
}) => {
  const [selectedAction, setSelectedAction] = useState<ActionType>(ActionType.ACCUSE);
  const [targetId, setTargetId] = useState<string>("");
  const [statement, setStatement] = useState<string>("");
  const [showSecretModal, setShowSecretModal] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [activeTab, setActiveTab] = useState<ActiveTab>("event");

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

  // 计算每个玩家被质疑的热度
  const accusationCounts: Record<string, number> = {};
  game.actions.forEach((a) => {
    if (a.targetPlayerId && (a.type === ActionType.ACCUSE || a.type === ActionType.INVESTIGATE)) {
      accusationCounts[a.targetPlayerId] = (accusationCounts[a.targetPlayerId] || 0) + 1;
    }
  });

  const roundActions = game.actions.filter((a) => a.round === game.round);
  const hasActed = game.actions.some(
    (a) => a.round === game.round && a.playerId === currentPlayer.playerId
  );

  const isRound3 = game.round === 3;
  const isOwner = currentPlayer.isOwner;

  const handleActionSubmit = () => {
    if (hasActed) return;
    audio.playClick();
    const needsTarget = selectedAction === ActionType.ACCUSE || selectedAction === ActionType.DEFEND || selectedAction === ActionType.INVESTIGATE;
    onSubmitAction(selectedAction, needsTarget ? targetId : undefined, statement.trim());
    setStatement("");
    setActiveTab("chat"); // 提交后自动切到陈述动态
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pt-5 relative overflow-hidden">
      {/* 顶部状态栏：轮次徽章、倒计时、我的身份入口 */}
      <div className="shrink-0 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1.5 ${
              isRound3 
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse" 
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}>
              {isRound3 ? <Sparkles className="w-3.5 h-3.5 text-rose-400" /> : <Radio className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isRound3 ? "第 3/3 轮 · AI反转" : `第 ${game.round}/3 轮`}</span>
            </span>
            <span className="text-xs text-neutral-300 font-medium truncate max-w-[130px]">
              {game.themeName.split("·")[0]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {secret && (
              <button
                onClick={() => {
                  audio.playClick();
                  setShowSecretModal(true);
                }}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-amber-300 rounded-xl text-xs flex items-center gap-1 border border-neutral-700 transition"
                aria-label="查看我的身份档案"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>我的身份</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
            </div>
          </div>
        </div>

        {/* 三段式功能 Tab 导航 */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-2xl border border-neutral-800/80">
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab("event");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "event"
                ? "bg-neutral-800 text-amber-300 shadow"
                : "text-neutral-400 hover:text-neutral-200"
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
                ? "bg-neutral-800 text-amber-300 shadow"
                : "text-neutral-400 hover:text-neutral-200"
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
                ? "bg-neutral-800 text-amber-300 shadow"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>陈述动态</span>
            {roundActions.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
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
              className="rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-850 to-neutral-900 border border-neutral-700/80 p-4 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>AI 导演发布现场通报</span>
                </div>
                {currentEvent.source === "AI" && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                    实时推演
                  </span>
                )}
              </div>

              <div className="text-sm font-bold text-neutral-100">{currentEvent.title}</div>
              
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
                {currentEvent.description}
              </p>

              {currentEvent.publicClue && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-amber-500/40 text-xs text-amber-300 leading-relaxed flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">⚡ 突发证据：</span>
                  <span>{currentEvent.publicClue}</span>
                </div>
              )}

              {currentEvent.discussionPrompt && (
                <div className="text-xs text-neutral-400 italic flex items-start gap-1.5 px-1">
                  <span>💬 破案切入点：</span>
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
              <div className="text-xs text-neutral-400 flex items-center justify-between px-1 mb-1">
                <span>点击玩家可快速将其选为行动目标</span>
                <span className="text-rose-400 font-bold">🔥 怀疑热度</span>
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
                      className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        isTarget
                          ? "bg-amber-500/15 border-amber-500/80 ring-1 ring-amber-400"
                          : "bg-neutral-900/90 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={p.avatarUrl}
                          alt={p.nickname}
                          className="w-8 h-8 rounded-xl bg-neutral-800 object-cover shrink-0 border border-neutral-700"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-200 truncate flex items-center gap-1">
                            <span>{p.nickname}</span>
                            {isMe && <span className="text-xs text-amber-400 font-normal">(我)</span>}
                          </div>
                          <div className="text-xs text-neutral-400 truncate">
                            {p.publicRoleName || "职员"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {count > 0 && (
                          <span className="text-xs text-rose-400 font-bold flex items-center gap-0.5 bg-rose-950/60 px-1.5 py-0.5 rounded-full border border-rose-800/60">
                            <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                            {count}
                          </span>
                        )}
                        {hasActedRound ? (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                            已表态
                          </span>
                        ) : (
                          <span className="text-xs bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-medium">
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
              <div className="text-xs text-neutral-400 px-1">
                本轮全场陈述动态 ({roundActions.length} 条)
              </div>

              {roundActions.length === 0 ? (
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 text-center text-xs text-neutral-500 italic">
                  暂无公开陈述，请选择下方行动发表你的观点！
                </div>
              ) : (
                <div className="space-y-2">
                  {roundActions.map((a) => {
                    const actionMeta = ACTION_MAP[a.type] || { label: a.type, icon: "💬" };
                    return (
                      <div
                        key={a.actionId}
                        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 text-xs leading-relaxed space-y-1"
                      >
                        <div className="flex items-center justify-between text-neutral-300">
                          <span className="font-bold text-amber-300">{a.playerName}</span>
                          <span className="bg-neutral-800 px-2 py-0.5 rounded-full text-xs text-neutral-300 border border-neutral-700">
                            {actionMeta.icon} {actionMeta.label}
                          </span>
                        </div>

                        {a.targetPlayerName && (
                          <div className="text-rose-400 font-semibold text-xs">
                            🎯 针对目标：{a.targetPlayerName}
                          </div>
                        )}

                        {a.content && (
                          <div className="text-neutral-200 bg-neutral-950 p-2 rounded-xl border border-neutral-850">
                            “{a.content}”
                          </div>
                        )}
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
      <div className="shrink-0 space-y-2 pt-2 border-t border-neutral-800">
        {hasActed ? (
          <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-2xl text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold">
              <Check className="w-4 h-4" />
              <span>你已完成本轮陈述与行动</span>
            </div>
            <p className="text-xs text-neutral-400">
              请与其他玩家在微信群或现场尽情讨论，等待房主推进或全员行动。
            </p>
          </div>
        ) : (
          <div className="bg-neutral-900/95 border border-neutral-800 p-3 rounded-2xl space-y-2.5 shadow-lg">
            <div className="text-xs font-bold text-neutral-200 flex items-center justify-between">
              <span>选择本轮行动方式：</span>
              <span className="text-xs text-amber-400 font-normal">每轮限发言行动 1 次</span>
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
                      setSelectedAction(type);
                    }}
                    role="button"
                    aria-pressed={isSelected}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition flex items-center gap-1 ${
                      isSelected
                        ? "bg-amber-500/25 text-amber-300 border-amber-500 font-bold shadow"
                        : "bg-neutral-850 text-neutral-400 border-neutral-800 hover:text-neutral-200"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 目标对象选择 */}
            {(selectedAction === ActionType.ACCUSE || selectedAction === ActionType.DEFEND || selectedAction === ActionType.INVESTIGATE) && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400 shrink-0 font-medium">指定目标:</span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="flex-1 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-xl p-1.5 text-xs focus:outline-none focus:border-amber-500"
                >
                  {roomPlayers
                    .filter((p) => p.playerId !== currentPlayer.playerId)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.nickname} ({p.publicRoleName || "职员"})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* 陈述内容输入 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={50}
                placeholder="发表你的怀疑推论或时间线（选填）..."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                className="flex-1 bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-700 focus:outline-none focus:border-amber-500 placeholder:text-neutral-500"
              />
              <button
                onClick={handleActionSubmit}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>公开陈述</span>
              </button>
            </div>
          </div>
        )}

        {/* 推进控制与测试辅助 */}
        <div className="flex items-center gap-2">
          {/* 次级灰度测试按钮 */}
          <button
            onClick={() => {
              audio.playClick();
              onTriggerBots();
            }}
            className="px-3 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition"
            title="模拟全员自动行动以供单人测试"
          >
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>自动行动(联调)</span>
          </button>

          {/* 房主推进主按钮 */}
          {isOwner ? (
            <button
              onClick={() => {
                audio.playClick();
                onAdvancePhase();
              }}
              disabled={loading}
              className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-neutral-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
            >
              <span>{isRound3 ? "全员进入最终投票" : `推进至第 ${game.round + 1} 轮`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex-1 text-center text-xs text-neutral-500 py-2">
              等待房主推进下一轮...
            </div>
          )}
        </div>
      </div>

      {/* 查看个人绝密身份模态弹窗 */}
      <AnimatePresence>
        {showSecretModal && secret && (
          <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
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
              className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 max-w-xs w-full space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> 绝密身份档案
                </span>
                <button
                  onClick={() => setShowSecretModal(false)}
                  className="text-neutral-400 hover:text-white text-sm p-1"
                  aria-label="关闭身份档案"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs space-y-2.5 text-neutral-300">
                <div>
                  <span className="text-neutral-400 block text-xs">公开伪装职务：</span>
                  <span className="font-bold text-white text-sm">{secret.roleName}</span>
                </div>
                <div>
                  <span className="text-rose-400 block text-xs font-bold">你的秘密：</span>
                  <p className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-neutral-200 mt-1 leading-relaxed">
                    {secret.secret}
                  </p>
                </div>
                <div>
                  <span className="text-emerald-400 block text-xs font-bold">你的胜利目标：</span>
                  <p className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-neutral-200 mt-1 leading-relaxed">
                    {secret.mission}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSecretModal(false)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl"
              >
                我知道了，返回对局
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
