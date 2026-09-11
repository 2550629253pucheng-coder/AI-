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
}

export const VotingScreen: React.FC<VotingScreenProps> = ({
  game,
  currentPlayer,
  roomPlayers,
  onSubmitVote,
  onTriggerBots,
  onForceSettle,
  loading,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;

    speech.speak("全部调查与陈述已锁定，公投通道正式开启！请全体根据疑点，投出你认定的潜伏内鬼！");

    return () => {
      speech.stop();
    };
  }, []);

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

  const hasVoted = game.votes.some((v) => v.voterPlayerId === currentPlayer.playerId);
  const myVote = game.votes.find((v) => v.voterPlayerId === currentPlayer.playerId);
  const myVotedTarget = roomPlayers.find((p) => p.playerId === myVote?.targetPlayerId);

  const votedCount = game.votes.length;
  const totalPlayers = roomPlayers.length;
  const votePercent = Math.round((votedCount / totalPlayers) * 100);

  const handleConfirmVote = () => {
    if (!selectedTargetId || hasVoted) return;
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
            <span>决战时刻 · 终极指认投票</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-700 dark:text-neon-cyan bg-slate-100 dark:bg-cyber-deep px-3 py-1 rounded-full border border-slate-200 dark:border-cyber-border shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* 进度说明与宽进度条 */}
        <div className="my-3 bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border rounded-2xl p-3.5 space-y-2 shrink-0 shadow-xs neon-glow-purple">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 dark:text-neutral-200">全场投票进度</div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">
              已指认：<strong className="text-indigo-600 dark:text-neon-lightpurple font-bold">{votedCount}</strong> / {totalPlayers} 人 ({votePercent}%)
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
          <span>{hasVoted ? "已完成指认（投票已锁定不可更改）：" : "请谨慎选择你认为真正的商业内鬼："}</span>
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

            return (
              <div
                key={p.playerId}
                role="button"
                tabIndex={0}
                aria-label={`指认${p.nickname}`}
                aria-selected={hasVoted ? isTargetOfMyVote : isSelected}
                onClick={() => {
                  if (!hasVoted) {
                    audio.playClick();
                    setSelectedTargetId(p.playerId);
                  }
                }}
                className={`group relative p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 ease-out overflow-hidden shadow-2xs ${
                  hasVoted
                    ? isTargetOfMyVote
                      ? "bg-rose-50 dark:bg-[#351228]/70 border-rose-400 dark:border-neon-magenta ring-1 ring-rose-400 dark:ring-neon-magenta shadow-xs"
                      : "bg-slate-50 dark:bg-cyber-card/40 border-slate-200 dark:border-cyber-border-subtle opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 dark:bg-neon-purple/20 dark:border-neon-purple dark:ring-neon-lightpurple shadow-xs scale-[1.015] cursor-pointer"
                    : "bg-white dark:bg-cyber-card/85 border-slate-200 dark:border-cyber-border hover:border-indigo-300 dark:hover:border-neon-magenta/60 hover:bg-slate-50 dark:hover:bg-cyber-card-hover hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                }`}
              >
                {!hasVoted && (
                  <div
                    className={`absolute pointer-events-none rounded-xl transition-all duration-500 ease-out ${
                      isSelected
                        ? "inset-[3px] border-2 border-indigo-400 dark:border-neon-lightpurple animate-suspect-selected"
                        : "inset-0 border border-indigo-200 dark:border-neon-magenta/30 opacity-0 group-hover:opacity-100 group-hover:inset-[3px] group-hover:border-indigo-400 dark:group-hover:border-neon-magenta animate-suspect-contract"
                    }`}
                  />
                )}

                <div className="flex items-center space-x-3 relative z-10">
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-cyber-deep object-cover border border-slate-200 dark:border-cyber-border group-hover:border-indigo-300 dark:group-hover:border-neon-magenta/60 shadow-2xs transition-all duration-300"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <span>{p.nickname}</span>
                      {isMe && <span className="text-xs text-indigo-600 dark:text-neon-cyan font-normal">(我自己)</span>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                      公开职务：<span className="text-slate-700 dark:text-neutral-200 font-medium">{p.publicRoleName || "职员"}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center">
                  {isTargetOfMyVote ? (
                    <div className="flex items-center gap-1 text-xs text-rose-700 dark:text-neon-magenta font-bold bg-rose-100 dark:bg-neon-magenta/20 px-2.5 py-1 rounded-xl border border-rose-300 dark:border-neon-magenta/40">
                      <Check className="w-3.5 h-3.5" />
                      <span>已投此人</span>
                    </div>
                  ) : !hasVoted ? (
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
        {!hasVoted ? (
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
        ) : (
          <div className="bg-emerald-50 dark:bg-neon-teal/15 border border-emerald-200 dark:border-neon-teal/40 p-3 rounded-2xl text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-neon-teal text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>你已指认【{myVotedTarget?.nickname || "嫌疑人"}】为内鬼</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              投票已被系统安全锁定，正在等待全场出票完成……
            </p>
          </div>
        )}

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
