import React, { useState, useEffect, useRef } from "react";
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
  Home,
  Target,
  Scale
} from "lucide-react";
import { motion } from "motion/react";
import { Game, RoomPlayer, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";
import { speech } from "../utils/speech.js";
import { DirectorVoiceBar } from "./DirectorVoiceBar.js";

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
  const hasSpokenRef = useRef(false);

  const isTie = Boolean(game.isTie || (game.winnerTeam as any) === "TIE");
  const isNormalWin = !isTie && game.winnerTeam === Team.NORMAL;
  const revealedSpies = game.revealedSpies || [];
  const report = game.report;

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;

    const narration = isTie
      ? "审判结果揭晓！票数持平，本局判为平局！内鬼与好人势均力敌，机密下落成谜！"
      : isNormalWin
      ? "最终审判结果揭晓！众人明察秋毫，成功将潜伏内鬼投出局，好人阵营大获全胜！"
      : "最终审判结果揭晓！内鬼瞒天过海，成功迷惑了全场视线，潜伏阵营大获全胜！";
    const extra = report?.trapAchievement
      ? "内鬼还成功诱导全场说出钓鱼暗号，解锁绝命钓鱼王成就！"
      : "";
    speech.speak(narration + (extra ? " " + extra : ""));

    return () => {
      speech.stop();
    };
  }, [isTie, isNormalWin, report?.trapAchievement]);

  // 整理投票排行榜
  const sortedPlayers = [...roomPlayers].sort(
    (a, b) => (b.voteCount || 0) - (a.voteCount || 0)
  );
  const maxVoteCount = Math.max(1, ...roomPlayers.map((p) => p.voteCount || 0));

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-4 overflow-y-auto">
      <div>
        <DirectorVoiceBar autoPosition={false} className="mb-2" />

        {/* 胜负大横幅视觉卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-5 border text-center relative overflow-hidden shadow-md ${
            isTie
              ? "bg-gradient-to-b from-amber-50 via-white to-slate-50 dark:from-amber-950/70 dark:via-cyber-card dark:to-cyber-deep border-amber-300 dark:border-amber-400/60 ring-1 ring-amber-200 dark:ring-amber-400/30"
              : isNormalWin
              ? "bg-gradient-to-b from-emerald-50 via-white to-slate-50 dark:from-[#0E2C33]/80 dark:via-cyber-card dark:to-cyber-deep border-emerald-300 dark:border-neon-teal/60 ring-1 ring-emerald-200 dark:ring-neon-teal/30 neon-glow-teal"
              : "bg-gradient-to-b from-rose-50 via-white to-slate-50 dark:from-[#351228]/80 dark:via-cyber-card dark:to-cyber-deep border-rose-300 dark:border-neon-magenta/60 ring-1 ring-rose-200 dark:ring-neon-magenta/30 neon-glow-magenta"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2.5 ${
              isTie
                ? "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/40 shadow-xs"
                : isNormalWin 
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-neon-teal/20 dark:text-neon-teal dark:border-neon-teal/35 shadow-xs" 
                : "bg-rose-100 text-rose-700 border border-rose-300 dark:bg-neon-magenta/20 dark:text-neon-magenta dark:border-neon-magenta/35 shadow-xs"
            }`}
          >
            {isTie ? <Scale className="w-8 h-8" /> : isNormalWin ? <Shield className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
          </div>

          <h2
            className={`text-2xl font-black tracking-wider ${
              isTie
                ? "text-amber-700 dark:text-amber-300"
                : isNormalWin ? "text-emerald-700 dark:text-neon-teal" : "text-rose-700 dark:text-neon-magenta"
            }`}
          >
            {isTie ? "平票僵局 · 本局握手言和" : isNormalWin ? "普通员工阵营胜利！" : "内鬼阵营成功脱身！"}
          </h2>

          <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1 max-w-[280px] mx-auto leading-relaxed font-medium">
            {isTie
              ? "终局投票最高票数出现平局，好人与内鬼势均力敌未分高下，建议原班人马再来一局决一死战！"
              : isNormalWin
              ? "众人敏锐捕捉现场反常细节，在终局投票中精准指认出真凶，机密企划安全保全！"
              : "内鬼巧妙挑拨了团队信任，诱导全场投票指认了替罪羊，从容脱身胜出！"}
          </p>

          {/* 真正内鬼身份揭示 */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-cyber-border-subtle bg-slate-50 dark:bg-cyber-deep/80 -mx-5 -mb-5 p-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-neutral-400 font-bold">🕵️ 真正潜伏内鬼：</span>
            {revealedSpies.map((s) => (
              <span key={s.playerId} className="font-bold text-rose-700 dark:text-neon-magenta">
                {s.name} <span className="text-xs text-slate-500 dark:text-neutral-400 font-normal">({s.roleName})</span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* 钓鱼暗令神级成就特别高光 */}
        {report?.trapAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/70 dark:via-rose-950/60 dark:to-purple-950/70 border border-amber-300 dark:border-amber-400/60 shadow-xs space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                <span className="text-base">👑</span>
                <span>神级成就：绝命钓鱼王达成</span>
              </div>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-400/50 px-2 py-0.5 rounded-full font-bold">
                全场最高荣誉
              </span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-100 font-medium leading-relaxed mt-1">
              {report.trapAchievement.bonusNotice}
            </p>
          </motion.div>
        )}

        {/* AI 赛后深度复盘与名场面：设计独特紫金锚点背景 */}
        {report && (
          <div className="mt-4 bg-white dark:bg-gradient-to-br dark:from-cyber-card dark:via-cyber-mid dark:to-cyber-deep border border-slate-200 dark:border-neon-purple/50 rounded-2xl p-4 shadow-xs relative overflow-hidden neon-glow-purple">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 dark:bg-neon-purple/10 rounded-full blur-2xl pointer-events-none" />
            
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowFullReport(!showFullReport)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-neon-lightpurple">
                <Sparkles className="w-4 h-4 text-pink-600 dark:text-neon-pink" />
                <span>AI 导演深度复盘与名场面点评</span>
              </div>
              <button 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                aria-label={showFullReport ? "折叠复盘分析" : "展开复盘分析"}
              >
                {showFullReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-neutral-300 mt-2 leading-relaxed border-b border-slate-200 dark:border-cyber-border pb-2.5 font-medium">
              {report.summary}
            </p>

            {showFullReport && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 bg-slate-50 dark:bg-cyber-deep/90 p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border">
                  <Award className="w-4 h-4 text-indigo-600 dark:text-neon-lightpurple shrink-0 mt-0.5" />
                  <div>
                    <span className="text-indigo-700 dark:text-neon-lightpurple font-bold">🏆 本局推理王：</span>
                    <span className="text-slate-800 dark:text-neutral-200 ml-1 font-medium">{report.bestDetective}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-50 dark:bg-cyber-deep/90 p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-neon-magenta shrink-0 mt-0.5" />
                  <div>
                    <span className="text-rose-600 dark:text-neon-magenta font-bold">🎭 演技影帝奖：</span>
                    <span className="text-slate-800 dark:text-neutral-200 ml-1 font-medium">{report.bestActor}</span>
                  </div>
                </div>

                {report.funniestMoment && (
                  <div className="flex items-start gap-2 bg-slate-50 dark:bg-cyber-deep/90 p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border">
                    <span className="text-sm shrink-0">🤣</span>
                    <div>
                      <span className="text-sky-700 dark:text-neon-cyan font-bold">爆笑名场面：</span>
                      <span className="text-slate-800 dark:text-neutral-200 ml-1 font-medium">{report.funniestMoment}</span>
                    </div>
                  </div>
                )}

                {/* 玩家专属称号 */}
                {report.playerTags && report.playerTags.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium mb-1.5 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-indigo-600 dark:text-neon-lightpurple" />
                      <span>全员专属幽默封号：</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {report.playerTags.map((tag, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-cyber-deep p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border text-xs space-y-0.5 shadow-2xs"
                        >
                          <div className="font-bold text-slate-800 dark:text-neutral-300 truncate">
                            {tag.playerName}
                          </div>
                          <div className="font-black text-pink-600 dark:text-neon-pink truncate">
                            「{tag.title}」
                          </div>
                          <div className="text-slate-500 dark:text-neutral-400 text-xs line-clamp-2 leading-tight">
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
        <div className="mt-4 bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-800 dark:text-neutral-300 mb-2.5 flex items-center justify-between">
            <span>🗳️ 终局得票明细统计</span>
            <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">共 {game.votes.length} 票</span>
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
                      <span className="font-bold text-slate-800 dark:text-neutral-200 truncate">{p.nickname}</span>
                      <span className="text-xs text-slate-500 dark:text-neutral-400">({p.publicRoleName})</span>
                      {isSpy && (
                        <span className="text-xs bg-rose-100 text-rose-700 dark:bg-neon-magenta/20 dark:text-neon-magenta px-1.5 py-0.2 rounded font-bold border border-rose-300 dark:border-neon-magenta/40">
                          真凶
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-indigo-700 dark:text-neon-lightpurple">{votes} 票</span>
                  </div>

                  {/* 柱状进度条 */}
                  <div className="w-full bg-slate-100 dark:bg-cyber-deep h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSpy 
                          ? "bg-gradient-to-r from-rose-600 to-pink-600 shadow-xs" 
                          : "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xs"
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
          className="w-full py-3.5 btn-primary-neon active:scale-[0.99] text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
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
            className="btn-secondary-cyan flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Share2 className="w-4 h-4 text-sky-700 dark:text-neon-cyan" />
            <span>生成微信战绩卡</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onReturnHome();
            }}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-card-hover border border-slate-200 dark:border-cyber-border text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neon-cyan text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition shadow-2xs"
          >
            <Home className="w-4 h-4" />
            <span>退出</span>
          </button>
        </div>
      </div>
    </div>
  );
};
