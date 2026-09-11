import React, { useState } from "react";
import { Copy, Check, X, Sparkles, Trophy, Skull } from "lucide-react";
import { Game, RoomPlayer, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface ShareCardModalProps {
  game: Game;
  roomPlayers: RoomPlayer[];
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  game,
  roomPlayers,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const isNormalWin = game.winnerTeam === Team.NORMAL;
  const spy = game.revealedSpies?.[0];
  const report = game.report;

  const shareText = `【AI局中局 · 战报】
我们在《${game.themeName}》经历了一场激战！
结果：${isNormalWin ? "普通员工大获全胜，逮捕内鬼！" : "内鬼高超潜伏，成功脱身！"}
🕵️ 真正内鬼：${spy ? `${spy.name} (${spy.roleName})` : "隐藏极深"}
🏆 推理王：${report?.bestDetective || "全场MVP"}
🎭 演技大奖：${report?.bestActor || "影帝级别"}
快来一起玩《AI局中局》微信小游戏！`;

  const copyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    audio.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 微信风格分享小卡片 */}
        <div className="bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 border border-amber-500/40 rounded-2xl p-4 text-center shadow-lg space-y-3">
          <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-bold tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI局中局 · 微信战绩分享</span>
          </div>

          <h4 className="text-base font-black text-neutral-100">
            {game.themeName.split("·")[0]}
          </h4>

          <div
            className={`py-1.5 px-3 rounded-full text-xs font-bold inline-block ${
              isNormalWin
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
            }`}
          >
            {isNormalWin ? "普通员工胜利！" : "内鬼阵营胜利！"}
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-left text-xs space-y-1.5 text-neutral-300">
            {spy && (
              <div className="flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  真正内鬼：<strong className="text-rose-400">{spy.name} ({spy.roleName})</strong>
                </span>
              </div>
            )}
            {report?.bestDetective && (
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  推理王：<strong className="text-amber-300">{report.bestDetective}</strong>
                </span>
              </div>
            )}
            {report?.funniestMoment && (
              <div className="flex items-start gap-1.5 text-[11px] text-neutral-400 italic">
                <span>💬 {report.funniestMoment}</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-neutral-500">
            微信扫码或输入房间号，随时加入对战
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2">
          <button
            onClick={copyText}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "战报已复制到剪贴板" : "一键复制精彩战报"}</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs rounded-xl"
          >
            返回游戏
          </button>
        </div>
      </div>
    </div>
  );
};
