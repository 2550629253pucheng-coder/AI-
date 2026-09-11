import React, { useState, useEffect } from "react";
import { Vote as VoteIcon, Clock, Check, AlertTriangle, Bot, CheckCircle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Game, RoomPlayer } from "../types/game.js";
import { audio } from "../utils/audio.js";

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
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-6 relative overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题与倒计时 */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <VoteIcon className="w-4 h-4" />
            <span>决战时刻 · 终极指认投票</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* 进度说明与宽进度条 */}
        <div className="my-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-neutral-200">全场投票进度</div>
            <div className="text-xs text-neutral-400">
              已指认：<strong className="text-amber-400 font-bold">{votedCount}</strong> / {totalPlayers} 人 ({votePercent}%)
            </div>
          </div>
          <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${votePercent}%` }}
            />
          </div>
        </div>

        {/* 投票指引 */}
        <div className="text-xs text-neutral-400 mb-2 px-1 flex items-center justify-between shrink-0">
          <span>{hasVoted ? "已完成指认（投票已锁定不可更改）：" : "请谨慎选择你认为真正的商业内鬼："}</span>
          {hasVoted && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
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
                className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                  hasVoted
                    ? isTargetOfMyVote
                      ? "bg-rose-950/40 border-rose-500 ring-1 ring-rose-500"
                      : "bg-neutral-900/40 border-neutral-850 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? "bg-amber-500/15 border-amber-500 ring-1 ring-amber-500 cursor-pointer"
                    : "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 cursor-pointer"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    className="w-10 h-10 rounded-xl bg-neutral-800 object-cover border border-neutral-700"
                  />
                  <div>
                    <div className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                      <span>{p.nickname}</span>
                      {isMe && <span className="text-xs text-amber-400 font-normal">(我自己)</span>}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      公开职务：<span className="text-neutral-200">{p.publicRoleName || "职员"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isTargetOfMyVote ? (
                    <div className="flex items-center gap-1 text-xs text-rose-400 font-bold bg-rose-500/20 px-2.5 py-1 rounded-xl border border-rose-500/30">
                      <Check className="w-3.5 h-3.5" />
                      <span>已投此人</span>
                    </div>
                  ) : !hasVoted ? (
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? "bg-amber-500 border-amber-400 text-neutral-950"
                          : "border-neutral-700 bg-neutral-800"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部控制区 */}
      <div className="space-y-2.5 pt-3 border-t border-neutral-800 shrink-0">
        {!hasVoted ? (
          <button
            onClick={() => {
              if (selectedTargetId) {
                audio.playClick();
                setConfirmModal(true);
              }
            }}
            disabled={!selectedTargetId || loading}
            className={`w-full py-3.5 font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2 ${
              selectedTargetId
                ? "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 text-white shadow-rose-500/20 active:scale-[0.99]"
                : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50"
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
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>你已指认【{myVotedTarget?.nickname || "嫌疑人"}】为内鬼</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
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
            className="flex-1 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition"
          >
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>自动出票 (联调测试)</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onForceSettle();
            }}
            className="py-2 px-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-xl text-xs font-medium border border-neutral-800 transition"
          >
            立即揭晓胜负
          </button>
        </div>
      </div>

      {/* 确认投票二次确认弹窗 */}
      <AnimatePresence>
        {confirmModal && selectedPlayer && (
          <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
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
              className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 max-w-xs w-full space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-100 text-base">最终确认指认</h3>
                <p className="text-xs text-neutral-300 mt-1">
                  你将指认 <strong className="text-rose-400">【{selectedPlayer.nickname}】</strong> 为商业内鬼。
                </p>
                <p className="text-xs text-amber-400 mt-1.5 font-medium">
                  ⚠️ 投票提交后将无法修改！
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmModal(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl"
                >
                  重新考虑
                </button>
                <button
                  onClick={handleConfirmVote}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20"
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
