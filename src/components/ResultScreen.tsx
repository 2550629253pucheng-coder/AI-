import React, { useState, useEffect } from "react";
import {
  Trophy,
  RotateCcw,
  Share2,
  Skull,
  Shield,
  Sparkles,
  Award,
  Flame,
  Home,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Game, RoomPlayer, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface ResultScreenProps {
  game: Game;
  currentPlayer: RoomPlayer;
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

  useEffect(() => {
    if (isNormalWin) {
      audio.playWin();
    } else {
      audio.playLose();
    }
  }, [isNormalWin]);

  const report = game.report;
  const revealedSpies = game.revealedSpies || [];

  // 排序得票榜
  const sortedPlayers = [...roomPlayers].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  const maxVoteCount = Math.max(1, ...roomPlayers.map((p) => p.voteCount || 0));

  return (
    <div className="flex-1 flex flex-col justify-between p-5 pt-8 overflow-y-auto">
      <div>
        {/* 胜负大横幅 */}
        <div
          className={`rounded-3xl p-5 border text-center relative overflow-hidden shadow-2xl ${
            isNormalWin
              ? "bg-gradient-to-b from-sky-950/60 via-neutral-900 to-neutral-950 border-sky-500/60 ring-1 ring-sky-500/30"
              : "bg-gradient-to-b from-rose-950/60 via-neutral-900 to-neutral-950 border-rose-500/60 ring-1 ring-rose-500/30"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2.5 ${
              isNormalWin ? "bg-sky-500/20 text-sky-400" : "bg-rose-500/20 text-rose-400"
            }`}
          >
            {isNormalWin ? <Shield className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
          </div>

          <div
            className={`text-2xl font-black tracking-wider ${
              isNormalWin ? "text-sky-400" : "text-rose-400"
            }`}
          >
            {isNormalWin ? "普通员工阵营胜利！" : "内鬼阵营胜利！"}
          </div>

          <p className="text-xs text-neutral-300 mt-1 max-w-[260px] mx-auto leading-relaxed">
            {isNormalWin
              ? "全员凭借敏锐推理成功在终局投票中锁定真凶，商业机密得以保全！"
              : "内鬼以高超伪装挑拨了团队互信，众人票选了替罪羊，内鬼从容脱身！"}
          </p>

          {/* 真正内鬼公示 */}
          <div className="mt-4 pt-3 border-t border-neutral-800/80 bg-neutral-950/60 -mx-5 -mb-5 p-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-neutral-400">🕵️ 真正内鬼：</span>
            {revealedSpies.map((s) => (
              <span key={s.playerId} className="font-bold text-rose-400">
                {s.name} <span className="text-[11px] text-neutral-400 font-normal">({s.roleName})</span>
              </span>
            ))}
          </div>
        </div>

        {/* 最终投票票数榜 */}
        <div className="mt-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5">
          <div className="text-xs font-bold text-neutral-300 mb-2.5 flex items-center justify-between">
            <span>🗳️ 终局得票明细</span>
            <span className="text-[10px] text-neutral-500">共 {game.votes.length} 票</span>
          </div>

          <div className="space-y-2">
            {sortedPlayers.map((p) => {
              const votes = p.voteCount || 0;
              const isSpy = revealedSpies.some((s) => s.playerId === p.playerId);
              const percent = Math.round((votes / maxVoteCount) * 100);

              return (
                <div key={p.playerId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-neutral-200 truncate">{p.nickname}</span>
                      <span className="text-[10px] text-neutral-400">({p.publicRoleName})</span>
                      {isSpy && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1 rounded font-bold">
                          内鬼
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-amber-400">{votes} 票</span>
                  </div>

                  {/* 柱状进度条 */}
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
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

        {/* AI 赛后复盘与名场面报告 */}
        {report && (
          <div className="mt-4 bg-gradient-to-br from-neutral-900 to-neutral-850 border border-amber-500/40 rounded-2xl p-4 shadow-xl">
            <div
              onClick={() => setShowFullReport(!showFullReport)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>🤖 AI 导演赛后复盘分析</span>
              </div>
              <button className="text-neutral-400 hover:text-neutral-200">
                {showFullReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-neutral-300 mt-2 leading-relaxed border-b border-neutral-800 pb-2.5">
              {report.summary}
            </p>

            {showFullReport && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 bg-neutral-950/70 p-2 rounded-xl border border-neutral-800/80">
                  <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-amber-400 font-bold">🏆 推理王：</span>
                    <span className="text-neutral-200">{report.bestDetective}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-neutral-950/70 p-2 rounded-xl border border-neutral-800/80">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-rose-400 font-bold">🎭 演技大奖：</span>
                    <span className="text-neutral-200">{report.bestActor}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-neutral-950/70 p-2 rounded-xl border border-neutral-800/80">
                  <span className="text-sm shrink-0">🤣</span>
                  <div>
                    <span className="text-sky-300 font-bold">爆笑名场面：</span>
                    <span className="text-neutral-200">{report.funniestMoment}</span>
                  </div>
                </div>

                {/* 玩家个性称号标签 */}
                {report.playerTags && report.playerTags.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] text-neutral-400 font-medium mb-1.5">
                      🎖️ 玩家专属称号评选：
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {report.playerTags.map((tag, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-950 p-2 rounded-xl border border-neutral-800 text-[11px]"
                        >
                          <div className="font-semibold text-neutral-200 truncate">
                            {tag.playerName}
                          </div>
                          <div className="font-bold text-amber-400 mt-0.5 truncate">
                            「{tag.title}」
                          </div>
                          <div className="text-neutral-400 text-[10px] truncate mt-0.5">
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
      </div>

      {/* 底部 P0 按钮组 */}
      <div className="pt-4 space-y-2.5">
        {/* P0 核心按钮：再来一局 (One More Game) */}
        <button
          onClick={() => {
            audio.playClick();
            onRestartGame();
          }}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] text-neutral-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-5 h-5" />
          <span>{loading ? "正在重置洗牌..." : "原班人马 · 再来一局"}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* 分享战绩 */}
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

          {/* 返回大厅 */}
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
