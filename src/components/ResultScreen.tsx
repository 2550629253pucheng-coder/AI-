import React, { useState } from "react";
import {
  Trophy,
  Skull,
  Shield,
  RotateCcw,
  Share2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  Flame,
  Home
} from "lucide-react";
import { motion } from "motion/react";
import { Game, RoomPlayer, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface ResultScreenProps {
  game: Game;
  currentPlayer?: RoomPlayer;
  roomPlayers: RoomPlayer[];
  onRestartGame: () => void;
  onReturnHome: () => void;
  onOpenShareModal: () => void;
  loading: boolean;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  game,
  currentPlayer,
  roomPlayers,
  onRestartGame,
  onReturnHome,
  onOpenShareModal,
  loading,
}) => {
  const [showFullReport, setShowFullReport] = useState<boolean>(true);

  const isNormalWin = game.winnerTeam === Team.NORMAL;
  const revealedSpies = game.revealedSpies || [];
  const report = game.report;

  // 整理投票排行榜
  const sortedPlayers = [...roomPlayers].sort(
    (a, b) => (b.voteCount || 0) - (a.voteCount || 0)
  );
  const maxVoteCount = Math.max(1, ...roomPlayers.map((p) => p.voteCount || 0));

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-6 overflow-y-auto">
      <div>
        {/* 胜负大横幅视觉卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-5 border text-center relative overflow-hidden shadow-2xl ${
            isNormalWin
              ? "bg-gradient-to-b from-sky-950/70 via-neutral-900 to-neutral-950 border-sky-500/60 ring-1 ring-sky-500/30"
              : "bg-gradient-to-b from-rose-950/70 via-neutral-900 to-neutral-950 border-rose-500/60 ring-1 ring-rose-500/30"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2.5 ${
              isNormalWin ? "bg-sky-500/20 text-sky-400" : "bg-rose-500/20 text-rose-400"
            }`}
          >
            {isNormalWin ? <Shield className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
          </div>

          <h2
            className={`text-2xl font-black tracking-wider ${
              isNormalWin ? "text-sky-400" : "text-rose-400"
            }`}
          >
            {isNormalWin ? "普通员工阵营胜利！" : "内鬼阵营成功脱身！"}
          </h2>

          <p className="text-xs text-neutral-300 mt-1 max-w-[280px] mx-auto leading-relaxed">
            {isNormalWin
              ? "众人敏锐捕捉现场反常细节，在终局投票中精准指认出真凶，机密企划安全保全！"
              : "内鬼巧妙挑拨了团队信任，诱导全场投票指认了替罪羊，从容脱身胜出！"}
          </p>

          {/* 真正内鬼身份揭示 */}
          <div className="mt-4 pt-3 border-t border-neutral-800/80 bg-neutral-950/60 -mx-5 -mb-5 p-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-neutral-400 font-semibold">🕵️ 真正潜伏内鬼：</span>
            {revealedSpies.map((s) => (
              <span key={s.playerId} className="font-bold text-rose-400">
                {s.name} <span className="text-xs text-neutral-400 font-normal">({s.roleName})</span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* AI 赛后深度复盘与名场面：设计独特紫金锚点背景 */}
        {report && (
          <div className="mt-4 bg-gradient-to-br from-neutral-900 via-amber-950/15 to-neutral-900 border border-amber-500/50 rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowFullReport(!showFullReport)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI 导演深度复盘与名场面点评</span>
              </div>
              <button 
                className="text-neutral-400 hover:text-neutral-200 p-1"
                aria-label={showFullReport ? "折叠复盘分析" : "展开复盘分析"}
              >
                {showFullReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-neutral-300 mt-2 leading-relaxed border-b border-neutral-800 pb-2.5">
              {report.summary}
            </p>

            {showFullReport && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80">
                  <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-amber-400 font-bold">🏆 本局推理王：</span>
                    <span className="text-neutral-200 ml-1">{report.bestDetective}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-rose-400 font-bold">🎭 演技影帝奖：</span>
                    <span className="text-neutral-200 ml-1">{report.bestActor}</span>
                  </div>
                </div>

                {report.funniestMoment && (
                  <div className="flex items-start gap-2 bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80">
                    <span className="text-sm shrink-0">🤣</span>
                    <div>
                      <span className="text-sky-300 font-bold">爆笑名场面：</span>
                      <span className="text-neutral-200 ml-1">{report.funniestMoment}</span>
                    </div>
                  </div>
                )}

                {/* 玩家专属称号：放开 line-clamp-2，避免文字被粗暴截断 */}
                {report.playerTags && report.playerTags.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-neutral-400 font-medium mb-1.5 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>全员专属幽默封号：</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {report.playerTags.map((tag, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/90 text-xs space-y-0.5"
                        >
                          <div className="font-semibold text-neutral-300 truncate">
                            {tag.playerName}
                          </div>
                          <div className="font-bold text-amber-400 truncate">
                            「{tag.title}」
                          </div>
                          <div className="text-neutral-400 text-xs line-clamp-2 leading-tight">
                            {tag.comment}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 最终投票数据明细（客观榜单） */}
        <div className="mt-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-neutral-300 mb-2.5 flex items-center justify-between">
            <span>🗳️ 终局得票明细统计</span>
            <span className="text-xs text-neutral-400">共 {game.votes.length} 票</span>
          </div>

          <div className="space-y-2.5">
            {sortedPlayers.map((p) => {
              const votes = p.voteCount || 0;
              const isSpy = revealedSpies.some((s) => s.playerId === p.playerId);
              const percent = Math.round((votes / maxVoteCount) * 100);

              return (
                <div key={p.playerId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-neutral-200 truncate">{p.nickname}</span>
                      <span className="text-xs text-neutral-400">({p.publicRoleName})</span>
                      {isSpy && (
                        <span className="text-xs bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded font-bold border border-rose-500/40">
                          真凶
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-amber-400">{votes} 票</span>
                  </div>

                  {/* 柱状进度条 */}
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSpy ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部按钮组 */}
      <div className="pt-4 space-y-2.5 shrink-0">
        <button
          onClick={() => {
            audio.playClick();
            onRestartGame();
          }}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] text-neutral-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{loading ? "正在重新洗牌..." : "原班人马 · 再来一局"}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playClick();
              onOpenShareModal();
            }}
            className="flex-1 py-2.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>生成微信战绩卡</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onReturnHome();
            }}
            className="py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1 transition"
          >
            <Home className="w-4 h-4" />
            <span>退出</span>
          </button>
        </div>
      </div>
    </div>
  );
};
