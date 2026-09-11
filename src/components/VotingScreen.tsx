import React, { useState, useEffect } from "react";
import { Vote as VoteIcon, Clock, Check, AlertTriangle, Bot, CheckCircle } from "lucide-react";
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

  const handleConfirmVote = () => {
    if (!selectedTargetId || hasVoted) return;
    audio.playVoteLock();
    audio.vibrate(50);
    onSubmitVote(selectedTargetId);
    setConfirmModal(false);
  };

  const selectedPlayer = roomPlayers.find((p) => p.playerId === selectedTargetId);

  return (
    <div className="flex-1 flex flex-col justify-between p-5 pt-8">
      <div>
        {/* 顶部标题与倒计时 */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <VoteIcon className="w-4 h-4" />
            <span>决战时刻 · 终极投票指认</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* 进度说明 */}
        <div className="my-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-neutral-200">全场指认进度</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              已投票：<span className="text-amber-400 font-bold">{votedCount}</span> / {totalPlayers}
            </div>
          </div>
          <div className="w-20 bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(votedCount / totalPlayers) * 100}%` }}
            />
          </div>
        </div>

        {/* 投票指引 */}
        <div className="text-xs text-neutral-400 mb-2 px-1">
          {hasVoted ? "你已锁定投票指认，等待最终结算揭晓：" : "请谨慎选择你认为真正的商业内鬼："}
        </div>

        {/* 嫌疑人卡片列表 */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
          {roomPlayers.map((p) => {
            const isMe = p.playerId === currentPlayer.playerId;
            const isSelected = selectedTargetId === p.playerId;
            const isTargetOfMyVote = myVote?.targetPlayerId === p.playerId;

            return (
              <div
                key={p.playerId}
                onClick={() => {
                  if (!hasVoted) {
                    audio.playClick();
                    setSelectedTargetId(p.playerId);
                  }
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                  isTargetOfMyVote
                    ? "bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/50"
                    : isSelected
                    ? "bg-amber-500/10 border-amber-500/80 ring-1 ring-amber-500/40"
                    : "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700"
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
                      {isMe && <span className="text-[10px] text-amber-400">(我自己)</span>}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      公开职务：<span className="text-neutral-200">{p.publicRoleName || "职员"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isTargetOfMyVote ? (
                    <div className="flex items-center gap-1 text-xs text-rose-400 font-bold bg-rose-500/20 px-2.5 py-1 rounded-xl">
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
      <div className="space-y-2.5 pt-3 border-t border-neutral-800">
        {!hasVoted ? (
          <button
            onClick={() => {
              if (selectedTargetId) {
                audio.playClick();
                setConfirmModal(true);
              }
            }}
            disabled={!selectedTargetId || loading}
            className={`w-full py-3.5 font-bold text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 ${
              selectedTargetId
                ? "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 text-white shadow-rose-500/20 active:scale-[0.99]"
                : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>
              {selectedTargetId
                ? `确认投票指认：${selectedPlayer?.nickname}`
                : "请先点击勾选一名嫌疑人"}
            </span>
          </button>
        ) : (
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>你已指认【{myVotedTarget?.nickname || "嫌疑人"}】为内鬼</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              投票已被系统安全锁定，正在等待全场出票……
            </p>
          </div>
        )}

        {/* 调试/辅助：全员自动投票 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playClick();
              onTriggerBots();
            }}
            className="flex-1 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
          >
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>模拟测试：未投玩家一键出票</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onForceSettle();
            }}
            className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-700"
          >
            立即揭晓胜负
          </button>
        </div>
      </div>

      {/* 确认投票二次确认弹窗 (防止手滑误触) */}
      {confirmModal && selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 max-w-xs w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-100 text-base">最终确认指认</h3>
              <p className="text-xs text-neutral-300 mt-1">
                你将指认 <strong className="text-rose-400">【{selectedPlayer.nickname}】</strong> 为商业内鬼。
              </p>
              <p className="text-[11px] text-amber-400 mt-1 font-medium">
                ⚠️ 投票提交后不可更改！
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
          </div>
        </div>
      )}
    </div>
  );
};
