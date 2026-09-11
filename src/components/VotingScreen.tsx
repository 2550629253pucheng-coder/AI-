import React, { useState, useEffect, useRef } from "react";
import { Vote as VoteIcon, Clock, Check, AlertTriangle, Bot, CheckCircle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Game, RoomPlayer } from "../types/game.js";
import { audio } from "../utils/audio.js";
import { speech } from "../utils/speech.js";
import { DirectorVoiceBar } from "./DirectorVoiceBar.js";

interface VotingScreenProps {
  game: Game;
  currentPlayer: RoomPlayer;
  roomPlayers: RoomPlayer[];
  onSubmitVote: (targetPlayerId: string) => void;
  onTriggerBots: () => void;
  onForceSettle: () => void;
  loading: boolean;
  isMidExile?: boolean;
}

export const VotingScreen: React.FC<VotingScreenProps> = ({
  game,
  currentPlayer,
  roomPlayers,
  onSubmitVote,
  onTriggerBots,
  onForceSettle,
  loading,
  isMidExile = false,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;

    if (isMidExile) {
      speech.speak("首轮前线调查完毕，放逐公投正式开启！请大家投出最可疑的嫌疑人，最高票者将被立即放逐！");
    } else {
      speech.speak("决胜时刻降临！终极指认投票开启！好人必须抓出全部内鬼，平票则进入僵局平局！");
    }

    return () => {
      speech.stop();
    };
  }, [isMidExile]);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((game.phaseEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0) {
        audio.playTick();
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [game.phaseEndsAt]);

  const votesList = isMidExile ? (game.midVotes || []) : (game.votes || []);
  const hasVoted = votesList.some((v) => v.voterPlayerId === currentPlayer.playerId);
  const myVote = votesList.find((v) => v.voterPlayerId === currentPlayer.playerId);
  const myVotedTarget = roomPlayers.find((p) => p.playerId === myVote?.targetPlayerId);

  // 只有存活的玩家参与投票
  const livingPlayers = roomPlayers.filter((p) => !p.isEliminated);
  const votedCount = votesList.length;
  const totalLiving = livingPlayers.length;
  const votePercent = totalLiving > 0 ? Math.round((votedCount / totalLiving) * 100) : 100;

  const handleConfirmVote = () => {
    if (!selectedTargetId || hasVoted || currentPlayer.isEliminated) return;
    audio.playVoteLock();
    audio.vibrate(50);
    onSubmitVote(selectedTargetId);
    setConfirmModal(false);
  };

  const selectedPlayer = roomPlayers.find((p) => p.playerId === selectedTargetId);

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-4 relative overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <DirectorVoiceBar autoPosition={false} className="mb-2 shrink-0" />

        {/* 顶部标题与倒计时 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-cyber-border shrink-0">
          <div className="flex items-center gap-2 text-rose-600 dark:text-neon-magenta font-bold text-sm">
            <VoteIcon className="w-4 h-4 text-rose-600 dark:text-neon-magenta" />
            <span>{isMidExile ? "首轮放逐公投 · 抓出潜伏内鬼" : "决战时刻 · 终极指认大审判"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-700 dark:text-neon-cyan bg-slate-100 dark:bg-cyber-deep px-3 py-1 rounded-full border border-slate-200 dark:border-cyber-border shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* 旁观者提示 */}
        {currentPlayer.isEliminated && (
          <div className="my-2 bg-slate-800 text-purple-300 border border-purple-500/40 p-2.5 rounded-xl text-xs flex items-center gap-2 shadow shrink-0">
            <span className="text-base">👻</span>
            <span>你已被首轮放逐淘汰，当前处于幽灵旁观席，不可参与投票，静待决战胜负揭晓！</span>
          </div>
        )}

        {/* 进度说明与宽进度条 */}
        <div className="my-3 bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border rounded-2xl p-3.5 space-y-2 shrink-0 shadow-xs neon-glow-purple">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 dark:text-neutral-200">
              {isMidExile ? "首轮公投进度" : "终极审判进度"}
            </div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">
              已投票：<strong className="text-indigo-600 dark:text-neon-lightpurple font-bold">{votedCount}</strong> / {totalLiving} 人 ({votePercent}%)
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-cyber-deep h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 via-pink-500 to-rose-500 dark:from-neon-purple dark:to-neon-pink h-full rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${votePercent}%` }}
            />
          </div>
        </div>

        {/* 投票指引 */}
        <div className="text-xs text-slate-500 dark:text-neutral-400 mb-2 px-1 flex items-center justify-between shrink-0 font-medium">
          <span>
            {hasVoted
              ? "已完成指认（投票已锁定不可更改）："
              : isMidExile
              ? "投出得票最高者将被全场立即放逐并亮出身份："
              : "请谨慎选择你认为真正的内鬼（需全灭内鬼才算胜）："}
          </span>
          {hasVoted && (
            <span className="text-xs text-emerald-600 dark:text-neon-teal flex items-center gap-1 font-bold">
              <Lock className="w-3 h-3" /> 锁定只读
            </span>
          )}
        </div>

        {/* 嫌疑人卡片列表 */}
        <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 relative">
          {roomPlayers.map((p) => {
            const isMe = p.playerId === currentPlayer.playerId;
            const isSelected = selectedTargetId === p.playerId;
            const isTargetOfMyVote = myVote?.targetPlayerId === p.playerId;
            const isEliminated = Boolean(p.isEliminated);

            return (
              <div
                key={p.playerId}
                role="button"
                tabIndex={0}
                aria-label={`指认${p.nickname}`}
                aria-selected={hasVoted ? isTargetOfMyVote : isSelected}
                onClick={() => {
                  if (!hasVoted && !isEliminated && !currentPlayer.isEliminated) {
                    audio.playClick();
                    setSelectedTargetId(p.playerId);
                  }
                }}
                className={`group relative p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 ease-out overflow-hidden shadow-2xs ${
                  isEliminated
                    ? "bg-slate-100 dark:bg-cyber-deep/60 border-slate-300 dark:border-cyber-border-subtle opacity-40 cursor-not-allowed"
                    : hasVoted
                    ? isTargetOfMyVote
                      ? "bg-rose-50 dark:bg-[#351228]/70 border-rose-400 dark:border-neon-magenta ring-1 ring-rose-400 dark:ring-neon-magenta shadow-xs"
                      : "bg-slate-50 dark:bg-cyber-card/40 border-slate-200 dark:border-cyber-border-subtle opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 dark:bg-neon-purple/20 dark:border-neon-purple dark:ring-neon-lightpurple shadow-xs scale-[1.015] cursor-pointer"
                    : "bg-white dark:bg-cyber-card/85 border-slate-200 dark:border-cyber-border hover:border-indigo-300 dark:hover:border-neon-magenta/60 hover:bg-slate-50 dark:hover:bg-cyber-card-hover hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                }`}
              >
                <div className="flex items-center space-x-3 relative z-10">
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    className={`w-10 h-10 rounded-xl bg-slate-100 dark:bg-cyber-deep object-cover border border-slate-200 dark:border-cyber-border group-hover:border-indigo-300 dark:group-hover:border-neon-magenta/60 shadow-2xs transition-all duration-300 ${
                      isEliminated ? "grayscale contrast-125" : ""
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <span>{p.nickname}</span>
                      {isMe && <span className="text-xs text-indigo-600 dark:text-neon-cyan font-normal">(我自己)</span>}
                      {isEliminated && (
                        <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-bold">
                          已放逐出局
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                      公开职务：<span className="text-slate-700 dark:text-neutral-200 font-medium">{p.publicRoleName || "职员"}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center">
                  {isEliminated ? (
                    <span className="text-[11px] text-slate-400 font-medium">不可被投</span>
                  ) : isTargetOfMyVote ? (
                    <div className="flex items-center gap-1 text-xs text-rose-700 dark:text-neon-magenta font-bold bg-rose-100 dark:bg-neon-magenta/20 px-2.5 py-1 rounded-xl border border-rose-300 dark:border-neon-magenta/40">
                      <Check className="w-3.5 h-3.5" />
                      <span>已投此人</span>
                    </div>
                  ) : !hasVoted && !currentPlayer.isEliminated ? (
                    <div className="flex items-center">
                      {!isSelected && (
                        <span className="text-[10px] text-rose-600 dark:text-neon-magenta/80 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1.5 hidden sm:inline-block font-semibold">
                          锁定嫌疑
                        </span>
                      )}
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? "bg-gradient-to-r from-indigo-600 to-pink-500 dark:from-neon-purple dark:to-neon-pink border-indigo-500 dark:border-neon-pink text-white scale-110 shadow-xs"
                            : "border-slate-300 dark:border-cyber-border bg-slate-100 dark:bg-cyber-deep group-hover:border-indigo-400 dark:group-hover:border-neon-magenta/70"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部控制区 */}
      <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-cyber-border shrink-0">
        {!hasVoted && !currentPlayer.isEliminated ? (
          <button
            onClick={() => {
              if (selectedTargetId) {
                audio.playClick();
                setConfirmModal(true);
              }
            }}
            disabled={!selectedTargetId || loading}
            className={`w-full py-3.5 font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 ${
              selectedTargetId
                ? "bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:opacity-95 text-white active:scale-[0.99]"
                : "bg-slate-100 dark:bg-cyber-card text-slate-400 dark:text-neutral-500 cursor-not-allowed border border-slate-200 dark:border-cyber-border-subtle"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>
              {selectedTargetId
                ? `确认锁定指认：${selectedPlayer?.nickname}`
                : "请先点击勾选一名嫌疑人"}
            </span>
          </button>
        ) : hasVoted ? (
          <div className="bg-emerald-50 dark:bg-neon-teal/15 border border-emerald-200 dark:border-neon-teal/40 p-3 rounded-2xl text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-neon-teal text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>你已指认【{myVotedTarget?.nickname || "嫌疑人"}】为内鬼</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              投票已被系统安全锁定，正在等待全场出票完成……
            </p>
          </div>
        ) : null}

        {/* 弱化的单人联调测试操作 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playClick();
              onTriggerBots();
            }}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-card-hover border border-slate-200 dark:border-cyber-border text-indigo-700 dark:text-neon-cyan rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot快速跟投</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onForceSettle();
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-card-hover border border-slate-200 dark:border-cyber-border text-slate-600 dark:text-neutral-300 rounded-xl text-xs font-medium transition"
          >
            提前结束计票
          </button>
        </div>
      </div>

      {/* 确认指认二次确认弹窗 */}
      <AnimatePresence>
        {confirmModal && selectedPlayer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border rounded-3xl p-5 max-w-xs w-full text-center space-y-4 shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isMidExile ? "确认首轮放逐此人？" : "确认最终指认此人？"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                  你即将指认 <strong className="text-rose-600 dark:text-neon-magenta">{selectedPlayer.nickname}</strong> ({selectedPlayer.publicRoleName || "职员"})。
                  {isMidExile ? "票数最高者将被立即淘汰出局并揭开阵营。" : "投票提交后无法撤回或修改！"}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-cyber-border rounded-xl text-xs text-slate-600 dark:text-neutral-300 font-medium"
                >
                  再想一想
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVote}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  确认锁定
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

        {/* 弱化的单人联调测试操作 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playClick();
              onTriggerBots();
            }}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-card-hover border border-slate-200 dark:border-cyber-border text-indigo-700 dark:text-neon-cyan rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-neon-cyan" />
            <span>自动出票 (联调测试)</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onForceSettle();
            }}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-cyber-card dark:hover:bg-cyber-card-hover dark:text-neutral-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-cyber-border transition shadow-2xs"
          >
            立即揭晓胜负
          </button>
        </div>
      </div>

      {/* 确认投票二次确认弹窗 */}
      <AnimatePresence>
        {confirmModal && selectedPlayer && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setConfirmModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="确认投票指认"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border-bright rounded-3xl p-5 max-w-xs w-full space-y-4 shadow-xl text-center neon-glow-purple"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-neon-magenta/20 border border-rose-300 dark:border-neon-magenta/40 flex items-center justify-center mx-auto text-rose-600 dark:text-neon-magenta">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-neutral-100 text-base">最终确认指认</h3>
                <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1">
                  你将指认 <strong className="text-rose-600 dark:text-neon-magenta font-bold">【{selectedPlayer.nickname}】</strong> 为商业内鬼。
                </p>
                <p className="text-xs text-rose-600 dark:text-neon-pink mt-1.5 font-bold">
                  ⚠️ 投票提交后将无法修改！
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-cyber-deep dark:hover:bg-cyber-mid dark:text-neutral-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-cyber-border"
                >
                  重新考虑
                </button>
                <button
                  onClick={handleConfirmVote}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  确认锁定
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
