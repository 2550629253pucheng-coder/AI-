import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Clock,
  Send,
  Bot,
  Flame,
  Check,
  Eye,
  ArrowRight,
  Shield,
  HelpCircle,
  MessageSquare
} from "lucide-react";
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
  }, [roomPlayers, currentPlayer.playerId]);

  const currentEvent: GameEvent | undefined = game.events[game.events.length - 1];

  // 计算每个玩家被质疑的热度
  const accusationCounts: Record<string, number> = {};
  game.actions.forEach((a) => {
    if (a.targetPlayerId && (a.type === ActionType.ACCUSE || a.type === ActionType.INVESTIGATE)) {
      accusationCounts[a.targetPlayerId] = (accusationCounts[a.targetPlayerId] || 0) + 1;
    }
  });

  const hasActed = game.actions.some(
    (a) => a.round === game.round && a.playerId === currentPlayer.playerId
  );

  const isRound3 = game.round === 3;
  const isOwner = currentPlayer.isOwner;

  const handleActionSubmit = () => {
    if (hasActed) return;
    audio.playClick();
    const needsTarget = selectedAction === ActionType.ACCUSE || selectedAction === ActionType.DEFEND;
    onSubmitAction(selectedAction, needsTarget ? targetId : undefined, statement.trim());
    setStatement("");
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pt-6 relative overflow-y-auto">
      {/* 顶部轮次与倒计时指示 */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              {isRound3 && <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
              <span>{isRound3 ? "第 3/3 轮 · AI反转" : `第 ${game.round}/3 轮`}</span>
            </span>
            <span className="text-xs text-neutral-400 font-medium truncate max-w-[130px]">
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
                className="px-2 py-1 bg-neutral-800 text-amber-300 rounded-lg text-xs flex items-center gap-1 hover:bg-neutral-700 transition"
              >
                <Eye className="w-3 h-3" />
                <span>我的身份</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
            </div>
          </div>
        </div>

        {/* AI导演当前剧情事件卡片 */}
        {currentEvent && (
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-850 border border-neutral-700/80 p-3.5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>🤖 AI 导演发布现场通报</span>
                {currentEvent.source === "AI" && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                    实时生成
                  </span>
                )}
              </div>
            </div>

            <div className="text-sm font-bold text-neutral-100">{currentEvent.title}</div>
            <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
              {currentEvent.description}
            </p>

            {currentEvent.publicClue && (
              <div className="mt-2.5 p-2 bg-neutral-950/80 rounded-xl border border-amber-500/30 text-xs text-amber-300 leading-normal flex items-start gap-1.5">
                <span className="font-bold text-amber-400">⚡</span>
                <span>{currentEvent.publicClue}</span>
              </div>
            )}

            {currentEvent.discussionPrompt && (
              <div className="mt-2 text-[11px] text-neutral-400 italic">
                💬 提问引导：{currentEvent.discussionPrompt}
              </div>
            )}
          </div>
        )}

        {/* 现场在场玩家与怀疑热度 */}
        <div className="mt-3">
          <div className="text-[11px] text-neutral-400 flex items-center justify-between px-1 mb-1.5">
            <span>在场嫌疑人列表</span>
            <span>🔥 怀疑指数</span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-0.5">
            {roomPlayers.map((p) => {
              const count = accusationCounts[p.playerId] || 0;
              const hasActedRound = game.actions.some(
                (a) => a.round === game.round && a.playerId === p.playerId
              );
              const isMe = p.playerId === currentPlayer.playerId;

              return (
                <div
                  key={p.playerId}
                  onClick={() => {
                    if (!isMe) setTargetId(p.playerId);
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    targetId === p.playerId && !isMe
                      ? "bg-amber-500/10 border-amber-500/70"
                      : "bg-neutral-900/90 border-neutral-800"
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <img
                      src={p.avatarUrl}
                      alt={p.nickname}
                      className="w-7 h-7 rounded-lg bg-neutral-800 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-200 truncate flex items-center gap-1">
                        <span>{p.nickname}</span>
                        {isMe && <span className="text-[9px] text-amber-400">(我)</span>}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {p.publicRoleName || "职员"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    {count > 0 && (
                      <span className="text-xs text-rose-400 font-bold flex items-center">
                        <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                        {count}
                      </span>
                    )}
                    {hasActedRound ? (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">
                        已行动
                      </span>
                    ) : (
                      <span className="text-[9px] bg-neutral-800 text-neutral-500 px-1 py-0.5 rounded">
                        思考中
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 本轮公开行动动态汇总 */}
        <div className="mt-3 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-2.5 max-h-32 overflow-y-auto">
          <div className="text-[11px] text-neutral-400 font-medium mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-amber-400" />
            <span>本轮全场陈述动态 ({game.actions.filter((a) => a.round === game.round).length}条)</span>
          </div>
          {game.actions.filter((a) => a.round === game.round).length === 0 ? (
            <div className="text-xs text-neutral-500 italic py-2 text-center">
              暂无陈述，请尽快选择行动发表你的观点……
            </div>
          ) : (
            <div className="space-y-1.5 text-xs">
              {game.actions
                .filter((a) => a.round === game.round)
                .map((a) => (
                  <div key={a.actionId} className="text-neutral-300 leading-snug">
                    <span className="font-semibold text-amber-300">{a.playerName}</span>
                    <span className="text-neutral-400"> 采取「{a.type}」</span>
                    {a.targetPlayerName && (
                      <span className="text-rose-300"> 目标：{a.targetPlayerName}</span>
                    )}
                    {a.content && <span className="text-neutral-200">：“{a.content}”</span>}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部行动操作面板 */}
      <div className="pt-3 border-t border-neutral-800 space-y-2.5">
        {hasActed ? (
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-2xl text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold">
              <Check className="w-4 h-4" />
              <span>你已完成本轮陈述与行动</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              请与其他玩家在微信群或现场尽情讨论。等待全员行动或房主推进。
            </p>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
              <span>选择你的行动方式：</span>
              <span className="text-[10px] text-neutral-400">每轮限行动1次</span>
            </div>

            {/* 行动按钮选择器 */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { type: ActionType.ACCUSE, label: "质疑某人" },
                { type: ActionType.DEFEND, label: "为某人辩护" },
                { type: ActionType.REVEAL, label: "公开线索" },
                { type: ActionType.INVESTIGATE, label: "申请调查" },
                { type: ActionType.SILENT, label: "保持沉默" },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    audio.playClick();
                    setSelectedAction(item.type);
                  }}
                  className={`py-1.5 text-xs font-medium rounded-xl border transition ${
                    selectedAction === item.type
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold"
                      : "bg-neutral-850 text-neutral-400 border-neutral-800 hover:text-neutral-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 目标玩家选择器 */}
            {(selectedAction === ActionType.ACCUSE || selectedAction === ActionType.DEFEND) && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400 shrink-0">指定对象:</span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="flex-1 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg p-1 text-xs focus:outline-none"
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
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                maxLength={40}
                placeholder="陈述你的理由或时间线（选填）"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                className="flex-1 bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-700 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleActionSubmit}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>提交</span>
              </button>
            </div>
          </div>
        )}

        {/* 调试/推进控制条 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playClick();
              onTriggerBots();
            }}
            className="flex-1 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition"
          >
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>模拟测试：全员自动行动</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onAdvancePhase();
            }}
            disabled={loading}
            className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-neutral-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow"
          >
            <span>{isRound3 ? "进入最终投票" : "推进下一轮"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 查看个人秘密弹窗 */}
      {showSecretModal && secret && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 max-w-xs w-full space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> 绝密身份档案
              </span>
              <button
                onClick={() => setShowSecretModal(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="text-xs space-y-2 text-neutral-300">
              <div>
                <span className="text-neutral-400 block text-[11px]">公开职务：</span>
                <span className="font-bold text-white text-sm">{secret.roleName}</span>
              </div>
              <div>
                <span className="text-rose-400 block text-[11px] font-semibold">你的秘密：</span>
                <p className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 text-neutral-200">
                  {secret.secret}
                </p>
              </div>
              <div>
                <span className="text-emerald-400 block text-[11px] font-semibold">你的任务：</span>
                <p className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 text-neutral-200">
                  {secret.mission}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSecretModal(false)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
